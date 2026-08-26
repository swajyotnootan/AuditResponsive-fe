// AddScheduleModal.tsx

import { User } from "@/services/auditScheduleApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  Save,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  inputBg: "#F8FAFC",

  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",

  accent: "#00529B",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",

  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",

  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",

  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",

  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

// ============================================================
// TIME OPTIONS
// 9:00 AM -> 5:00 PM
// ============================================================

const TIME_OPTIONS = (() => {
  const options: string[] = [];

  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 17 && minute > 0) {
        break;
      }

      const displayHour =
        hour === 0
          ? 12
          : hour > 12
            ? hour - 12
            : hour;

      const displayMinute = String(minute).padStart(2, "0");

      const period = hour >= 12 ? "PM" : "AM";

      options.push(
        `${displayHour}:${displayMinute} ${period}`,
      );
    }
  }

  return options;
})();

// ============================================================
// INTERFACES
// ============================================================

interface Schedule {
  id?: number;

  scheduledDate?: string;
  date?: string;

  startTime: string;
  endTime: string;

  department?: string;
  departments?: string[];

  selectedDepartments?: {
    department: string;
    selectedElements: string[];
  }[];

  auditorId?: number | null;
  auditorName?: string;

  auditeeId?: number | null;
  auditeeName?: string;

  status?: string;

  detailedApprovalStatus?: string;
  approvalStatus?: string;

  isSpecialEvent?: boolean;
  specialEventType?: string;

  auditType?: string;

  auditElements?: string[] | string;

  fromDate?: string;
  toDate?: string;
  week?: string;

  remarks?: string;
}

interface FormData {
  id: number | null;

  date: string;

  startTime: string;
  endTime: string;

  selectedDepartments: {
    department: string;
    selectedElements: string[];
  }[];

  auditorId: string;
  auditeeId: string;

  isSpecialEvent: boolean;
  specialEventType: string;

  auditType: string;

  status: string;
}

interface DepartmentTeamInfo {
  leadAuditorId: number | null;
  leadAuditorName: string | null;

  teamAuditorIds: number[];
  teamAuditorNames: string[];

  auditeeIds: number[];
  auditeeNames: string[];
}

// ============================================================
// HELPERS
// ============================================================

const getTimeValue = (timeStr: string): number => {
  if (!timeStr) return 0;

  const [time, modifier] = timeStr.split(" ");

  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  return hours + minutes / 60;
};

const toISODate = (date: Date): string => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDate = (dateString?: string): Date => {
  if (!dateString) {
    return new Date();
  }

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

const clampDate = (
  dateString: string,
  minDate?: string,
  maxDate?: string,
): string => {
  if (!dateString) {
    return dateString;
  }

  if (minDate && dateString < minDate) {
    return minDate;
  }

  if (maxDate && dateString > maxDate) {
    return maxDate;
  }

  return dateString;
};

// ============================================================
// CUSTOM SELECT FIELD
// ============================================================
//
// IMPORTANT:
//
// We intentionally do NOT use <Picker> here.
//
// The native Picker was causing the half/clipped UI inside
// the modal + ScrollView, especially on React Native Web.
//
// This component opens a separate Modal containing the options.
// Therefore it is not clipped by the parent ScrollView.
// ============================================================

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  value: string;
  placeholder: string;

  options: SelectOption[];

  onChange: (value: string) => void;

  disabled?: boolean;

  searchable?: boolean;

  emptyMessage?: string;
}

const SelectField = ({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  searchable = false,
  emptyMessage = "No options available",
}: SelectFieldProps) => {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const selectedOption = options.find(
    (option) =>
      option.value === value,
  );

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : options;

  const handleSelect = (
    option: SelectOption,
  ) => {
    if (option.disabled) {
      return;
    }

    onChange(option.value);

    setOpen(false);

    setSearch("");
  };

  return (
    <>
      {/* ======================================================
          SELECT BUTTON
      ====================================================== */}

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled}
        onPress={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
        style={{
          minHeight: 48,

          width: "100%",

          flexDirection: "row",

          alignItems: "center",

          justifyContent: "space-between",

          paddingHorizontal: 16,

          borderWidth: 1,

          borderColor: COLORS.border,

          borderRadius: 12,

          backgroundColor: disabled
            ? "#F1F5F9"
            : COLORS.inputBg,

          opacity: disabled ? 0.65 : 1,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,

            fontSize: 14,

            color: selectedOption
              ? COLORS.textValue
              : COLORS.textMuted,

            marginRight: 12,
          }}
        >
          {selectedOption
            ? selectedOption.label
            : placeholder}
        </Text>

        <ChevronDown
          size={18}
          color={
            disabled
              ? "#94A3B8"
              : "#64748B"
          }
        />
      </TouchableOpacity>

      {/* ======================================================
          OPTION MODAL
      ====================================================== */}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
          setSearch("");
        }}
      >
        <View
          style={{
            flex: 1,

            backgroundColor:
              "rgba(15,23,42,0.40)",

            justifyContent: "center",

            alignItems: "center",

            paddingHorizontal: 20,

            paddingVertical: 30,
          }}
        >
          <View
  style={{
    width: "92%",
    maxWidth: 500,
    maxHeight: "80%",

    backgroundColor: COLORS.card,

    borderRadius: 18,

    borderWidth: 1,
    borderColor: COLORS.border,

    overflow: "hidden",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.2,
    shadowRadius: 20,

    elevation: 12,
  }}
>
            {/* ==================================================
                OPTION HEADER
            ================================================== */}

            <View
              style={{
                flexDirection: "row",

                alignItems: "center",

                justifyContent:
                  "space-between",

                paddingHorizontal: 18,

                paddingVertical: 16,

                borderBottomWidth: 1,

                borderBottomColor:
                  COLORS.border,
              }}
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,

                    fontWeight: "700",

                    color: COLORS.text,
                  }}
                >
                  {placeholder}
                </Text>

                <Text
                  style={{
                    marginTop: 3,

                    fontSize: 12,

                    color: COLORS.textMuted,
                  }}
                >
                  Select an option
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setOpen(false);
                  setSearch("");
                }}
                style={{
                  width: 36,

                  height: 36,

                  borderRadius: 10,

                  alignItems: "center",

                  justifyContent:
                    "center",

                  backgroundColor:
                    "#F1F5F9",
                }}
              >
                <X
                  size={19}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* ==================================================
                SEARCH
            ================================================== */}

            {searchable && (
              <View
                style={{
                  marginHorizontal: 16,

                  marginTop: 14,

                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    height: 44,

                    borderWidth: 1,

                    borderColor:
                      COLORS.border,

                    borderRadius: 10,

                    backgroundColor:
                      "#F8FAFC",

                    justifyContent:
                      "center",

                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color:
                        COLORS.textMuted,
                    }}
                  >
                    Search...
                  </Text>
                </View>
              </View>
            )}

            {/* ==================================================
                OPTIONS
            ================================================== */}

            <ScrollView
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={{
                maxHeight: 430,
              }}
              contentContainerStyle={{
                padding: 10,

                paddingBottom: 14,
              }}
            >
              {filteredOptions.length >
              0 ? (
                filteredOptions.map(
                  (option) => {
                    const isSelected =
                      option.value ===
                      value;

                    return (
                      <TouchableOpacity
                        key={`${option.value}-${option.label}`}
                        activeOpacity={
                          option.disabled
                            ? 1
                            : 0.7
                        }
                        disabled={
                          option.disabled
                        }
                        onPress={() =>
                          handleSelect(
                            option,
                          )
                        }
                        style={{
                          minHeight: 48,

                          flexDirection:
                            "row",

                          alignItems:
                            "center",

                          paddingHorizontal:
                            14,

                          marginBottom: 4,

                          borderRadius: 10,

                          backgroundColor:
                            option.disabled
                              ? "#F8FAFC"
                              : isSelected
                                ? COLORS.accentLight
                                : "#FFFFFF",

                          borderWidth:
                            isSelected
                              ? 1
                              : 0,

                          borderColor:
                            isSelected
                              ? COLORS.accentBorder
                              : "transparent",

                          opacity:
                            option.disabled
                              ? 0.5
                              : 1,
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            flex: 1,

                            fontSize: 14,

                            fontWeight:
                              isSelected
                                ? "600"
                                : "400",

                            color:
                              option.disabled
                                ? "#94A3B8"
                                : isSelected
                                  ? COLORS.accent
                                  : COLORS.textValue,
                          }}
                        >
                          {option.label}
                        </Text>

                        {isSelected && (
                          <View
                            style={{
                              width: 28,

                              height: 28,

                              borderRadius: 14,

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              backgroundColor:
                                COLORS.accent,
                            }}
                          >
                            <Check
                              size={15}
                              color="#FFFFFF"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  },
                )
              ) : (
                <View
                  style={{
                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    paddingVertical: 40,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,

                      color:
                        COLORS.textMuted,
                    }}
                  >
                    {emptyMessage}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* ==================================================
                CLOSE
            ================================================== */}

            <View
              style={{
                paddingHorizontal: 16,

                paddingVertical: 12,

                borderTopWidth: 1,

                borderTopColor:
                  COLORS.border,

                backgroundColor:
                  "#F8FAFC",
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setOpen(false);
                  setSearch("");
                }}
                style={{
                  height: 42,

                  borderRadius: 10,

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  backgroundColor:
                    "#FFFFFF",

                  borderWidth: 1,

                  borderColor:
                    COLORS.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,

                    fontWeight: "600",

                    color:
                      COLORS.textValue,
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ============================================================
// ALERT BANNER
// ============================================================

const AlertBanner = ({
  type,
  title,
  message,
  footer,
  icon: Icon,
}: {
  type:
    | "error"
    | "warning"
    | "success"
    | "info";

  title: string;

  message: string;

  footer?: string;

  icon: any;
}) => {
  const stylesMap: Record<
    string,
    any
  > = {
    error: {
      bg: COLORS.errorLight,
      border: COLORS.errorBorder,
      color: "#991B1B",
      iconColor: "#DC2626",
    },

    warning: {
      bg: COLORS.warningLight,
      border: COLORS.warningBorder,
      color: "#92400E",
      iconColor: "#D97706",
    },

    success: {
      bg: COLORS.successLight,
      border: COLORS.successBorder,
      color: "#065F46",
      iconColor: "#059669",
    },

    info: {
      bg: COLORS.accentLight,
      border: COLORS.accentBorder,
      color: "#1E3A8A",
      iconColor: COLORS.accent,
    },
  };

  const style =
    stylesMap[type] ||
    stylesMap.info;

  return (
    <View
      className="flex-row gap-3 p-4 mb-4 border rounded-xl"
      style={{
        backgroundColor: style.bg,

        borderColor: style.border,
      }}
    >
      <View
        className="items-center justify-center bg-white border rounded-lg w-9 h-9"
        style={{
          borderColor: style.border,
        }}
      >
        <Icon
          size={18}
          color={style.iconColor}
        />
      </View>

      <View className="flex-1">
        <Text
          className="text-sm font-semibold"
          style={{
            color: style.color,
          }}
        >
          {title}
        </Text>

        <Text
          className="mt-1 text-xs"
          style={{
            color: style.color,
          }}
        >
          {message}
        </Text>

        {footer && (
          <Text
            className="mt-2 text-xs"
            style={{
              color: style.color,

              opacity: 0.7,
            }}
          >
            {footer}
          </Text>
        )}
      </View>
    </View>
  );
};

// ============================================================
// DATE PICKER FIELD
// ============================================================

const DatePickerField = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = "Select Date",
  iconColor = "#64748B",
}: {
  value: string;

  onChange: (
    dateStr: string,
  ) => void;

  minDate?: string;

  maxDate?: string;

  disabled?: boolean;

  placeholder?: string;

  iconColor?: string;
}) => {
  const [showPicker, setShowPicker] =
    useState(false);

  const pickerValue = useMemo(() => {
    if (value) {
      return parseDate(value);
    }

    if (minDate) {
      return parseDate(minDate);
    }

    return new Date();
  }, [value, minDate]);

  const handleDateChange = (
    event: any,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (
      event?.type === "dismissed" ||
      !selectedDate
    ) {
      return;
    }

    const selectedISO =
      toISODate(selectedDate);

    const safeDate = clampDate(
      selectedISO,
      minDate,
      maxDate,
    );

    onChange(safeDate);
  };

  // ==========================================================
  // WEB
  // ==========================================================

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          position: "relative",

          height: 48,

          width: "100%",
        }}
      >
        <View
          style={{
            height: 48,

            width: "100%",

            flexDirection: "row",

            alignItems: "center",

            justifyContent:
              "space-between",

            paddingHorizontal: 16,

            borderWidth: 1,

            borderColor:
              COLORS.border,

            borderRadius: 12,

            backgroundColor: disabled
              ? "#F1F5F9"
              : COLORS.inputBg,

            opacity: disabled
              ? 0.7
              : 1,
          }}
        >
          <Text
            style={{
              flex: 1,

              fontSize: 14,

              color: value
                ? COLORS.textValue
                : COLORS.textMuted,

              pointerEvents: "none",
            }}
          >
            {value || placeholder}
          </Text>

          <Calendar
            size={17}
            color={
              disabled
                ? "#94A3B8"
                : iconColor
            }
            style={{
              pointerEvents: "none",
            }}
          />
        </View>

        <input
          type="date"
          value={value || ""}
          min={minDate || undefined}
          max={maxDate || undefined}
          disabled={disabled}
          onChange={(event: any) => {
            const selectedDate =
              event.target.value;

            if (!selectedDate) {
              return;
            }

            onChange(
              clampDate(
                selectedDate,
                minDate,
                maxDate,
              ),
            );
          }}
          style={{
            position: "absolute",

            top: 0,

            left: 0,

            width: "100%",

            height: "100%",

            opacity: 0,

            cursor: disabled
              ? "not-allowed"
              : "pointer",

            zIndex: 10,

            pointerEvents: disabled
              ? "none"
              : "auto",
          }}
        />
      </View>
    );
  }

  // ==========================================================
  // IOS / ANDROID
  // ==========================================================

  return (
    <>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => {
          if (!disabled) {
            setShowPicker(true);
          }
        }}
        className="flex-row items-center justify-between px-4 rounded-xl"
        style={{
          height: 48,

          borderWidth: 1,

          borderColor:
            COLORS.border,

          backgroundColor: disabled
            ? "#F1F5F9"
            : COLORS.inputBg,

          opacity: disabled
            ? 0.7
            : 1,
        }}
      >
        <Text
          className="flex-1 text-sm"
          style={{
            color: value
              ? COLORS.textValue
              : COLORS.textMuted,
          }}
        >
          {value || placeholder}
        </Text>

        <Calendar
          size={17}
          color={
            disabled
              ? "#94A3B8"
              : iconColor
          }
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={
            Platform.OS === "android"
              ? "calendar"
              : "default"
          }
          minimumDate={
            minDate
              ? parseDate(minDate)
              : undefined
          }
          maximumDate={
            maxDate
              ? parseDate(maxDate)
              : undefined
          }
          onChange={
            handleDateChange
          }
        />
      )}
    </>
  );
};

// ============================================================
// MAIN COMPONENT PROPS
// ============================================================

interface AddScheduleModalProps {
  showModal: boolean;

  onClose: () => void;

  formData: FormData;

  setFormData: React.Dispatch<
    React.SetStateAction<FormData>
  >;

  conflictWarning:
    | {
        type: string;
        conflict: Schedule;
      }
    | null;

  selectedAuditDepartment: string;

  setSelectedAuditDepartment: React.Dispatch<
    React.SetStateAction<string>
  >;

  departmentTeamInfo: DepartmentTeamInfo;

  departmentAuditors: User[];

  departmentAuditees: User[];

  saving: boolean;

  onSave: () => void;

  onAuditDepartmentChange: (
    departmentCode: string,
  ) => void;

  getAvailableDepartmentsForDate: (
    dateStr: string,
  ) => {
    department: string;
    auditElements: string[];
  }[];

  isDesktop: boolean;
}

// ============================================================
// MAIN MODAL
// ============================================================

export default function AddScheduleModal({
  showModal,
  onClose,

  formData,
  setFormData,

  conflictWarning,

  selectedAuditDepartment,
  setSelectedAuditDepartment,

  departmentTeamInfo,

  departmentAuditors,
  departmentAuditees,

  saving,

  onSave,

  onAuditDepartmentChange,

  getAvailableDepartmentsForDate,

  isDesktop,
}: AddScheduleModalProps) {
  if (!showModal) {
    return null;
  }

  // ==========================================================
  // AVAILABLE DEPARTMENTS
  // ==========================================================

  const availableDepartments =
    getAvailableDepartmentsForDate(
      formData.date,
    );

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const isSpecialEventWithoutLunch =
    formData.isSpecialEvent &&
    formData.specialEventType !==
      "LUNCH";

  const canSave =
    !saving &&
    !!selectedAuditDepartment &&
    !!formData.date &&
    !!formData.startTime &&
    !!formData.endTime &&
    (formData.isSpecialEvent
      ? !!formData.specialEventType &&
        (formData.specialEventType ===
          "LUNCH" ||
          (!!formData.auditorId &&
            !!formData.auditeeId))
      : !!formData.auditorId &&
        !!formData.auditeeId &&
        formData.selectedDepartments
          .length > 0);

  // ==========================================================
  // SELECT DEPARTMENT
  // ==========================================================

  const handleDepartmentChange = (
    departmentCode: string,
  ) => {
    setSelectedAuditDepartment(
      departmentCode,
    );

    onAuditDepartmentChange(
      departmentCode,
    );

    if (
      departmentCode &&
      formData.date
    ) {
      const selectedDeptInfo =
        availableDepartments.find(
          (dept) =>
            dept.department ===
            departmentCode,
        );

      if (selectedDeptInfo) {
        setFormData((prev) => ({
          ...prev,

          selectedDepartments: [
            {
              department:
                departmentCode,

              selectedElements: [
                ...selectedDeptInfo.auditElements,
              ],
            },
          ],
        }));
      }
    }

    if (!departmentCode) {
      setFormData((prev) => ({
        ...prev,

        selectedDepartments: [],
      }));
    }
  };

  // ==========================================================
  // SELECT ALL ELEMENTS FOR DEPARTMENT
  // ==========================================================

  const toggleDepartment = (
    departmentName: string,
    availableElements: string[],
  ) => {
    setFormData((prev) => {
      const existing =
        prev.selectedDepartments.find(
          (item) =>
            item.department ===
            departmentName,
        );

      if (existing) {
        const isAllSelected =
          existing.selectedElements
            .length ===
          availableElements.length;

        if (isAllSelected) {
          return {
            ...prev,

            selectedDepartments:
              prev.selectedDepartments.filter(
                (item) =>
                  item.department !==
                  departmentName,
              ),
          };
        }

        return {
          ...prev,

          selectedDepartments:
            prev.selectedDepartments.map(
              (item) =>
                item.department ===
                departmentName
                  ? {
                      ...item,

                      selectedElements: [
                        ...availableElements,
                      ],
                    }
                  : item,
            ),
        };
      }

      return {
        ...prev,

        selectedDepartments: [
          ...prev.selectedDepartments,

          {
            department:
              departmentName,

            selectedElements: [
              ...availableElements,
            ],
          },
        ],
      };
    });

    if (
      departmentName ===
      selectedAuditDepartment
    ) {
      setSelectedAuditDepartment("");
    }
  };

  // ==========================================================
  // TOGGLE SINGLE ELEMENT
  // ==========================================================

  const toggleElement = (
    departmentName: string,
    element: string,
  ) => {
    setFormData((prev) => {
      const departments = [
        ...prev.selectedDepartments,
      ];

      const departmentIndex =
        departments.findIndex(
          (item) =>
            item.department ===
            departmentName,
        );

      if (departmentIndex === -1) {
        departments.push({
          department:
            departmentName,

          selectedElements: [
            element,
          ],
        });

        return {
          ...prev,

          selectedDepartments:
            departments,
        };
      }

      const department =
        departments[
          departmentIndex
        ];

      const isSelected =
        department.selectedElements.includes(
          element,
        );

      const updatedElements =
        isSelected
          ? department.selectedElements.filter(
              (item) =>
                item !== element,
            )
          : [
              ...department.selectedElements,
              element,
            ];

      if (
        updatedElements.length ===
        0
      ) {
        departments.splice(
          departmentIndex,
          1,
        );
      } else {
        departments[
          departmentIndex
        ] = {
          ...department,

          selectedElements:
            updatedElements,
        };
      }

      return {
        ...prev,

        selectedDepartments:
          departments,
      };
    });
  };

  // ==========================================================
  // AUDITOR LIST
  // ==========================================================

  const availableAuditors =
    departmentTeamInfo.teamAuditorIds
      .length > 0
      ? departmentAuditors.filter(
          (auditor) =>
            departmentTeamInfo.teamAuditorIds.includes(
              Number(auditor.id),
            ),
        )
      : [];

  // ==========================================================
  // AUDITEE LIST
  // ==========================================================

  const availableAuditees =
    departmentTeamInfo.auditeeIds
      .length > 0
      ? departmentAuditees.filter(
          (auditee) =>
            departmentTeamInfo.auditeeIds.includes(
              Number(auditee.id),
            ),
        )
      : [];

  // ==========================================================
  // SELECT OPTIONS
  // ==========================================================

  const departmentOptions: SelectOption[] =
    [
      {
        label: "Select Department",
        value: "",
      },

      ...availableDepartments.map(
        (dept) => ({
          label: dept.department,

          value: dept.department,
        }),
      ),
    ];

  const startTimeOptions: SelectOption[] =
    [
      {
        label: "Select Start Time",
        value: "",
      },

      ...TIME_OPTIONS.map((time) => ({
        label: time,
        value: time,
      })),
    ];

  const endTimeOptions: SelectOption[] =
    [
      {
        label: "Select End Time",
        value: "",
      },

      ...TIME_OPTIONS.filter(
        (time) =>
          !formData.startTime ||
          getTimeValue(time) >
            getTimeValue(
              formData.startTime,
            ),
      ).map((time) => ({
        label: time,
        value: time,
      })),
    ];

  const eventTypeOptions: SelectOption[] =
    [
      {
        label: "Select Event Type",
        value: "",
      },

      {
        label: "Opening Meeting",
        value: "OPENING",
      },

      {
        label: "Lunch Break",
        value: "LUNCH",
      },

      {
        label: "Closing Meeting",
        value: "CLOSING",
      },
    ];

  const auditorOptions: SelectOption[] =
    [
      {
        label: "Select Auditor",
        value: "",
      },

      ...(availableAuditors.length > 0
        ? availableAuditors.map(
            (auditor) => ({
              label: `${auditor.firstName} ${auditor.lastName}`,

              value: String(
                auditor.id,
              ),
            }),
          )
        : [
            {
              label:
                "No team auditors assigned",

              value: "",

              disabled: true,
            },
          ]),
    ];

  const auditeeOptions: SelectOption[] =
    [
      {
        label: "Select Auditee",
        value: "",
      },

      ...(availableAuditees.length > 0
        ? availableAuditees.map(
            (auditee) => ({
              label: `${auditee.firstName} ${auditee.lastName}${
                auditee.role === "HOD"
                  ? " (HOD)"
                  : ""
              }`,

              value: String(
                auditee.id,
              ),
            }),
          )
        : [
            {
              label:
                "No matching auditees found",

              value: "",

              disabled: true,
            },
          ]),
    ];

  const statusOptions: SelectOption[] =
    [
      {
        label: "Scheduled",
        value: "SCHEDULED",
      },

      {
        label: "In Progress",
        value: "IN_PROGRESS",
      },

      {
        label: "Completed",
        value: "COMPLETED",
      },

      {
        label: "Cancelled",
        value: "CANCELLED",
      },
    ];

  // ==========================================================
  // MODAL
  // ==========================================================

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,

          backgroundColor:
            "rgba(0,0,0,0.30)",

          justifyContent: "center",

          alignItems: "center",

          padding: isDesktop
            ? 24
            : 12,
        }}
      >
        <View
          style={{
            width: isDesktop
              ? "90%"
              : "100%",

            maxWidth: 800,

            height: isDesktop
              ? undefined
              : "94%",

            maxHeight: isDesktop
              ? "92%"
              : "94%",

            backgroundColor:
              "#FFFFFF",

            borderRadius: isDesktop
              ? 16
              : 18,

            overflow: "hidden",

            borderWidth: 1,

            borderColor:
              "#E2E8F0",

            elevation: 5,

            shadowColor: "#000",

            shadowOffset: {
              width: 0,
              height: 4,
            },

            shadowOpacity: 0.15,

            shadowRadius: 12,
          }}
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <View
            className="flex-row items-center justify-between px-6 py-5 border-b"
            style={{
              borderBottomColor:
                "#F1F5F9",
            }}
          >
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">
                {formData.id
                  ? "Edit Schedule"
                  : "Add Schedule"}
              </Text>

              <Text className="mt-1 text-xs text-slate-500">
                Schedule daily audit for
                department
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="items-center justify-center rounded-lg w-9 h-9"
              style={{
                backgroundColor:
                  "#F1F5F9",
              }}
            >
              <X
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          {/* ==================================================
              BODY
          ================================================== */}

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={{
              padding: 24,

              paddingBottom: 28,
            }}
          >
            {/* ==================================================
                CONFLICT
            ================================================== */}

            {conflictWarning && (
              <AlertBanner
                type="error"
                icon={AlertCircle}
                title="Schedule Conflict!"
                message={
                  conflictWarning.type ===
                  "auditor"
                    ? `Auditor ${
                        conflictWarning
                          .conflict
                          .auditorName ||
                        ""
                      } is already scheduled.`
                    : conflictWarning.type ===
                        "auditee"
                      ? `Auditee ${
                          conflictWarning
                            .conflict
                            .auditeeName ||
                          ""
                        } is already scheduled.`
                      : "Another event is already scheduled at this time."
                }
              />
            )}

            {/* ==================================================
                DEPARTMENT
            ================================================== */}

            <View className="mb-5">
              <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                Department to Audit *
              </Text>

              <SelectField
                value={
                  selectedAuditDepartment
                }
                placeholder="Select Department"
                options={
                  departmentOptions
                }
                onChange={
                  handleDepartmentChange
                }
                searchable
                emptyMessage="No departments available for this date"
              />
            </View>

            {/* ==================================================
                DATE
            ================================================== */}

            <View className="mb-5">
              <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                Date *
              </Text>

              <DatePickerField
                value={formData.date}
                onChange={(date) => {
                  setFormData(
                    (prev) => ({
                      ...prev,

                      date,

                      selectedDepartments:
                        selectedAuditDepartment
                          ? (() => {
                              const deptInfo =
                                getAvailableDepartmentsForDate(
                                  date,
                                ).find(
                                  (dept) =>
                                    dept.department ===
                                    selectedAuditDepartment,
                                );

                              return deptInfo
                                ? [
                                    {
                                      department:
                                        selectedAuditDepartment,

                                      selectedElements:
                                        [
                                          ...deptInfo.auditElements,
                                        ],
                                    },
                                  ]
                                : [];
                            })()
                          : prev.selectedDepartments,
                    }),
                  );
                }}
                placeholder="Select Date"
              />
            </View>

            {/* ==================================================
                TIME
            ================================================== */}

            <View
              className={
                isDesktop
                  ? "flex-row gap-4 mb-5"
                  : "mb-5"
              }
            >
              {/* START TIME */}

              <View
                className={
                  isDesktop
                    ? "flex-1"
                    : "mb-4"
                }
              >
                <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                  Start Time *
                </Text>

                <SelectField
                  value={
                    formData.startTime
                  }
                  placeholder="Select Start Time"
                  options={
                    startTimeOptions
                  }
                  onChange={(
                    itemValue,
                  ) => {
                    let newEndTime =
                      formData.endTime;

                    if (
                      newEndTime &&
                      getTimeValue(
                        newEndTime,
                      ) <=
                        getTimeValue(
                          itemValue,
                        )
                    ) {
                      newEndTime = "";
                    }

                    setFormData(
                      (prev) => ({
                        ...prev,

                        startTime:
                          itemValue,

                        endTime:
                          newEndTime,
                      }),
                    );
                  }}
                />
              </View>

              {/* END TIME */}

              <View className="flex-1">
                <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                  End Time *
                </Text>

                <SelectField
                  value={
                    formData.endTime
                  }
                  placeholder="Select End Time"
                  options={
                    endTimeOptions
                  }
                  onChange={(
                    itemValue,
                  ) => {
                    setFormData(
                      (prev) => ({
                        ...prev,

                        endTime:
                          itemValue,
                      }),
                    );
                  }}
                />
              </View>
            </View>

            {/* ==================================================
                SPECIAL EVENT CHECKBOX
            ================================================== */}

            <View className="flex-row items-center gap-3 mb-5">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setFormData(
                    (prev) => ({
                      ...prev,

                      isSpecialEvent:
                        !prev.isSpecialEvent,

                      specialEventType:
                        "",
                    }),
                  );
                }}
                className="items-center justify-center rounded-md"
                style={{
                  width: 20,

                  height: 20,

                  borderWidth: 1,

                  borderColor:
                    formData.isSpecialEvent
                      ? COLORS.accent
                      : COLORS.borderStrong,

                  backgroundColor:
                    formData.isSpecialEvent
                      ? COLORS.accent
                      : "transparent",
                }}
              >
                {formData.isSpecialEvent && (
                  <Check
                    size={14}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>

              <Text className="flex-1 text-sm text-slate-800">
                This is a Special Event
                (Opening/Lunch/Closing)
              </Text>
            </View>

            {/* ==================================================
                SPECIAL EVENT
            ================================================== */}

            {formData.isSpecialEvent ? (
              <>
                {/* EVENT TYPE */}

                <View className="mb-5">
                  <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                    Event Type *
                  </Text>

                  <SelectField
                    value={
                      formData.specialEventType
                    }
                    placeholder="Select Event Type"
                    options={
                      eventTypeOptions
                    }
                    onChange={(
                      itemValue,
                    ) => {
                      setFormData(
                        (prev) => ({
                          ...prev,

                          specialEventType:
                            itemValue,

                          ...(itemValue ===
                          "LUNCH"
                            ? {
                                auditorId:
                                  "",

                                auditeeId:
                                  "",
                              }
                            : {}),
                        }),
                      );
                    }}
                  />
                </View>

                {/* SPECIAL EVENT AUDITOR/AUDITEE */}

                {isSpecialEventWithoutLunch && (
                  <View
                    className={
                      isDesktop
                        ? "flex-row gap-4 mb-5"
                        : "mb-5"
                    }
                  >
                    {/* AUDITOR */}

                    <View
                      className={
                        isDesktop
                          ? "flex-1"
                          : "mb-4"
                      }
                    >
                      <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                        Auditor *
                      </Text>

                      <SelectField
                        value={
                          formData.auditorId
                        }
                        placeholder="Select Auditor"
                        options={
                          auditorOptions
                        }
                        onChange={(
                          itemValue,
                        ) =>
                          setFormData(
                            (prev) => ({
                              ...prev,

                              auditorId:
                                itemValue,
                            }),
                          )
                        }
                        searchable
                        emptyMessage="No team auditors assigned"
                      />
                    </View>

                    {/* AUDITEE */}

                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                        Auditee *
                      </Text>

                      <SelectField
                        value={
                          formData.auditeeId
                        }
                        placeholder="Select Auditee"
                        options={
                          auditeeOptions
                        }
                        onChange={(
                          itemValue,
                        ) =>
                          setFormData(
                            (prev) => ({
                              ...prev,

                              auditeeId:
                                itemValue,
                            }),
                          )
                        }
                        searchable
                        emptyMessage="No matching auditees found"
                      />
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* ==================================================
                    DEPARTMENTS + ELEMENTS
                ================================================== */}

                <View className="mb-5">
                  <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                    Select Departments &
                    Audit Elements *
                  </Text>

                  <View
                    className="rounded-xl"
                    style={{
                      height: 240,

                      overflow: "hidden",

                      borderWidth: 1,

                      borderColor:
                        COLORS.border,

                      backgroundColor:
                        COLORS.inputBg,
                    }}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{
                        padding: 16,
                      }}
                    >
                      {availableDepartments
                        .filter(
                          (deptInfo) =>
                            !selectedAuditDepartment ||
                            deptInfo.department ===
                              selectedAuditDepartment,
                        )
                        .map(
                          (
                            deptInfo,
                          ) => {
                            const departmentName =
                              deptInfo.department;

                            const availableElements =
                              deptInfo.auditElements ||
                              [];

                            const selectedDept =
                              formData.selectedDepartments.find(
                                (dept) =>
                                  dept.department ===
                                  departmentName,
                              );

                            const selectedElements =
                              selectedDept?.selectedElements ||
                              [];

                            const allSelected =
                              availableElements.length >
                                0 &&
                              selectedElements.length ===
                                availableElements.length;

                            return (
                              <View
                                key={
                                  departmentName
                                }
                                className="pb-4 mb-4 border-b border-slate-200"
                              >
                                {/* DEPARTMENT CHECKBOX */}

                                <TouchableOpacity
                                  activeOpacity={
                                    0.7
                                  }
                                  onPress={() =>
                                    toggleDepartment(
                                      departmentName,
                                      availableElements,
                                    )
                                  }
                                  className="flex-row items-center gap-3 mb-3"
                                >
                                  <View
                                    className="items-center justify-center rounded-md"
                                    style={{
                                      width: 20,

                                      height: 20,

                                      borderWidth: 1,

                                      borderColor:
                                        allSelected
                                          ? COLORS.accent
                                          : COLORS.borderStrong,

                                      backgroundColor:
                                        allSelected
                                          ? COLORS.accent
                                          : "transparent",
                                    }}
                                  >
                                    {allSelected && (
                                      <Check
                                        size={
                                          14
                                        }
                                        color="#FFFFFF"
                                      />
                                    )}
                                  </View>

                                  <Text className="font-semibold text-slate-900">
                                    {
                                      departmentName
                                    }
                                  </Text>
                                </TouchableOpacity>

                                {/* ELEMENTS */}

                                <View className="flex-row flex-wrap gap-2 ml-8">
                                  {availableElements.map(
                                    (
                                      element,
                                    ) => {
                                      const selected =
                                        selectedElements.includes(
                                          element,
                                        );

                                      return (
                                        <TouchableOpacity
                                          key={
                                            element
                                          }
                                          activeOpacity={
                                            0.7
                                          }
                                          onPress={() =>
                                            toggleElement(
                                              departmentName,
                                              element,
                                            )
                                          }
                                          className="flex-row items-center gap-2 px-3 py-1.5 rounded-full border"
                                          style={{
                                            backgroundColor:
                                              selected
                                                ? "#EFF6FF"
                                                : "#F8FAFC",

                                            borderColor:
                                              selected
                                                ? "#BFDBFE"
                                                : "#E2E8F0",
                                          }}
                                        >
                                          {selected && (
                                            <Check
                                              size={
                                                12
                                              }
                                              color={
                                                COLORS.accent
                                              }
                                            />
                                          )}

                                          <Text
                                            className="text-xs font-medium"
                                            style={{
                                              color:
                                                selected
                                                  ? "#1D4ED8"
                                                  : "#475569",
                                            }}
                                          >
                                            {
                                              element
                                            }
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    },
                                  )}
                                </View>
                              </View>
                            );
                          },
                        )}

                      {availableDepartments.filter(
                        (deptInfo) =>
                          !selectedAuditDepartment ||
                          deptInfo.department ===
                            selectedAuditDepartment,
                      ).length ===
                        0 && (
                        <View className="items-center justify-center py-10">
                          <Text className="text-sm text-slate-500">
                            No departments
                            available for
                            this date.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>

                {/* ==================================================
                    REGULAR AUDITOR / AUDITEE
                ================================================== */}

                <View
                  className={
                    isDesktop
                      ? "flex-row gap-4 mb-5"
                      : "mb-5"
                  }
                >
                  {/* AUDITOR */}

                  <View
                    className={
                      isDesktop
                        ? "flex-1"
                        : "mb-4"
                    }
                  >
                    <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                      Auditor *
                    </Text>

                    <SelectField
                      value={
                        formData.auditorId
                      }
                      placeholder="Select Auditor"
                      options={
                        auditorOptions
                      }
                      onChange={(
                        itemValue,
                      ) =>
                        setFormData(
                          (prev) => ({
                            ...prev,

                            auditorId:
                              itemValue,
                          }),
                        )
                      }
                      searchable
                      emptyMessage="No team auditors assigned"
                    />
                  </View>

                  {/* AUDITEE */}

                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                      Auditee *
                    </Text>

                    <SelectField
                      value={
                        formData.auditeeId
                      }
                      placeholder="Select Auditee"
                      options={
                        auditeeOptions
                      }
                      onChange={(
                        itemValue,
                      ) =>
                        setFormData(
                          (prev) => ({
                            ...prev,

                            auditeeId:
                              itemValue,
                          }),
                        )
                      }
                      searchable
                      emptyMessage="No matching auditees found"
                    />
                  </View>
                </View>
              </>
            )}

            {/* ==================================================
                STATUS
            ================================================== */}

            <View className="mb-2">
              <Text className="mb-2 text-[13px] font-semibold text-slate-800">
                Status
              </Text>

              <SelectField
                value={formData.status}
                placeholder="Select Status"
                options={
                  statusOptions
                }
                onChange={(
                  itemValue,
                ) =>
                  setFormData(
                    (prev) => ({
                      ...prev,

                      status:
                        itemValue,
                    }),
                  )
                }
              />
            </View>
          </ScrollView>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <View
            className="flex-row items-center justify-end gap-3 px-6 py-4 border-t"
            style={{
              borderTopColor:
                "#E2E8F0",

              backgroundColor:
                "#F8FAFC",
            }}
          >
            {/* CANCEL */}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              disabled={saving}
              className="items-center justify-center px-5 rounded-xl"
              style={{
                height: 42,

                backgroundColor:
                  "#FFFFFF",

                borderWidth: 1,

                borderColor:
                  "#E2E8F0",

                opacity: saving
                  ? 0.6
                  : 1,
              }}
            >
              <Text className="text-sm font-semibold text-slate-700">
                Cancel
              </Text>
            </TouchableOpacity>

            {/* SAVE */}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onSave}
              disabled={!canSave}
              className="flex-row items-center justify-center gap-2 px-5 rounded-xl"
              style={{
                height: 42,

                backgroundColor:
                  canSave
                    ? COLORS.accent
                    : "#CBD5E1",

                opacity: canSave
                  ? 1
                  : 0.8,
              }}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Save
                  size={16}
                  color="#FFFFFF"
                />
              )}

              <Text className="text-sm font-semibold text-white">
                {formData.id
                  ? "Update Schedule"
                  : "Add Schedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}