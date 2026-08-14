// AddScheduleModal.tsx
import { User } from "@/services/auditScheduleApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { AlertCircle, Calendar, Check, Save, X } from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ═════ CONSTANTS ═════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#000000",
  textValue: "#1F2937",
  textMuted: "#6B7280",
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

const timeOptions = (() => {
  const options: string[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 17 && minute > 0) break;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, "0");
      const period = hour >= 12 ? "PM" : "AM";
      options.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }
  return options;
})();

// ═════ INTERFACES ═════
interface Schedule {
  id?: number;
  scheduledDate?: string;
  date?: string;
  startTime: string;
  endTime: string;
  department?: string;
  departments?: string[];
  selectedDepartments?: { department: string; selectedElements: string[] }[];
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
  selectedDepartments: { department: string; selectedElements: string[] }[];
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

// ═════ HELPER ═════
const getTimeValue = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
};

const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ═════ SUB-COMPONENTS ═════
const AlertBanner = ({
  type,
  title,
  message,
  footer,
  icon: Icon,
}: {
  type: "error" | "warning" | "success" | "info";
  title: string;
  message: string;
  footer?: string;
  icon: any;
}) => {
  const stylesMap: Record<string, any> = {
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
  const s = stylesMap[type] || stylesMap.info;
  return (
    <View
      className="flex-row gap-3 p-4 mb-4 border rounded-xl"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="items-center justify-center bg-white border rounded-lg w-9 h-9"
        style={{ borderColor: s.border }}
      >
        <Icon size={18} color={s.iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text className="mt-1 text-xs opacity-90" style={{ color: s.color }}>
          {message}
        </Text>
        {footer && (
          <Text className="mt-2 text-xs opacity-70" style={{ color: s.color }}>
            {footer}
          </Text>
        )}
      </View>
    </View>
  );
};

const DatePickerField = ({
  value,
  onChange,
  minDate,
  maxDate,
  disabled = false,
  placeholder = "Select Date",
  iconColor = "#6B7280",
  className = "",
}: {
  value: string;
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  placeholder?: string;
  iconColor?: string;
  className?: string;
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const getSafeDate = (dateStr: string) => {
    if (!dateStr) return dateStr;
    if (minDate && dateStr < minDate) return minDate;
    if (maxDate && dateStr > maxDate) return maxDate;
    return dateStr;
  };

  const pickerValue = value
    ? new Date(`${value}T00:00:00`)
    : minDate
      ? new Date(`${minDate}T00:00:00`)
      : new Date();

  if (Platform.OS === "web") {
    return (
      <View className={`relative ${className}`}>
        <View
          className="flex-row items-center justify-between px-3 bg-white border border-gray-200 rounded-lg h-11"
          style={{
            position: "relative",
            overflow: "hidden",
            opacity: disabled ? 0.6 : 1,
            backgroundColor: disabled ? "#F1F5F9" : "#FFFFFF",
          }}
        >
          <Text
            className="flex-1 text-gray-800"
            style={{ pointerEvents: "none" }}
          >
            {value || placeholder}
          </Text>
          <Calendar
            size={16}
            color={iconColor}
            style={{ pointerEvents: "none" }}
          />
        </View>
        <input
          type="date"
          value={value || ""}
          min={minDate || undefined}
          max={maxDate || undefined}
          disabled={disabled}
          onChange={(e: any) => {
            const selectedDate = e.target.value;
            onChange(getSafeDate(selectedDate));
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            zIndex: 10,
            pointerEvents: disabled ? "none" : "auto",
          }}
          onClick={(e: any) => {
            if (disabled) return;
            const target = e.target as HTMLInputElement;
            target.showPicker?.();
          }}
        />
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          if (!disabled) setShowPicker(true);
        }}
        disabled={disabled}
        className={`flex-row items-center justify-between px-3 border border-gray-200 rounded-lg h-11 ${className}`}
        style={{
          backgroundColor: disabled ? "#F1F5F9" : "#FFFFFF",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text className="flex-1 text-gray-800">{value || placeholder}</Text>
        <Calendar size={16} color={disabled ? "#94A3B8" : iconColor} />
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === "android" ? "calendar" : "default"}
          minimumDate={minDate ? new Date(`${minDate}T00:00:00`) : undefined}
          maximumDate={maxDate ? new Date(`${maxDate}T23:59:59`) : undefined}
          onChange={(event: any, selectedDate: any) => {
            if (Platform.OS === "android") {
              setShowPicker(false);
            }
            if (selectedDate) {
              const isoDate = toISODate(selectedDate);
              onChange(getSafeDate(isoDate));
            }
            if (Platform.OS === "ios" && event.type === "dismissed") {
              setShowPicker(false);
            }
          }}
        />
      )}
    </>
  );
};

// ═════ MAIN MODAL COMPONENT ═════
interface AddScheduleModalProps {
  showModal: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  conflictWarning: { type: string; conflict: Schedule } | null;
  selectedAuditDepartment: string;
  setSelectedAuditDepartment: React.Dispatch<React.SetStateAction<string>>;
  departmentTeamInfo: DepartmentTeamInfo;
  departmentAuditors: User[];
  departmentAuditees: User[];
  saving: boolean;
  onSave: () => void;
  onAuditDepartmentChange: (departmentCode: string) => void;
  getAvailableDepartmentsForDate: (
    dateStr: string,
  ) => { department: string; auditElements: string[] }[];
  isDesktop: boolean;
}

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
  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="items-center justify-center flex-1 p-5 bg-black/30"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-2xl max-h-[90%] overflow-hidden"
          style={{
            maxWidth: isDesktop ? 800 : "100%",
            alignSelf: "center",
            margin: isDesktop ? 40 : 0,
            width: isDesktop ? "90%" : "100%",
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <View>
              <Text className="text-lg font-bold text-gray-900">
                {formData.id ? "Edit Schedule" : "Add Schedule"}
              </Text>
              <Text className="text-xs text-gray-500">
                Schedule daily audit for department
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="items-center justify-center border border-gray-200 rounded-lg w-9 h-9"
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            className="p-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: isDesktop ? 40 : 24,
            }}
          >
            {/* Conflict Warning */}
            {conflictWarning && (
              <AlertBanner
                type="error"
                icon={AlertCircle}
                title="Schedule Conflict!"
                message={
                  conflictWarning.type === "auditor"
                    ? `Auditor ${conflictWarning.conflict.auditorName} already scheduled`
                    : conflictWarning.type === "auditee"
                      ? `Auditee ${conflictWarning.conflict.auditeeName} already scheduled`
                      : "Another event already scheduled at this time"
                }
              />
            )}

            {/* Department Selector */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                Department to Audit *
              </Text>
              <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                <Picker
                  selectedValue={selectedAuditDepartment}
                  onValueChange={(itemValue: string) => {
                    setSelectedAuditDepartment(itemValue);
                    onAuditDepartmentChange(itemValue);
                    // Auto-select elements if available
                    if (itemValue && formData.date) {
                      const availableDepts = getAvailableDepartmentsForDate(
                        formData.date,
                      );
                      const selectedDeptInfo = availableDepts.find(
                        (d) => d.department === itemValue,
                      );
                      if (selectedDeptInfo) {
                        setFormData((prev) => ({
                          ...prev,
                          selectedDepartments: [
                            {
                              department: itemValue,
                              selectedElements: [
                                ...selectedDeptInfo.auditElements,
                              ],
                            },
                          ],
                        }));
                      }
                    } else if (!itemValue) {
                      setFormData((prev) => ({
                        ...prev,
                        selectedDepartments: [],
                      }));
                    }
                  }}
                  style={{ height: 50, width: "100%" }}
                >
                  <Picker.Item label="Select Department" value="" />
                  {getAvailableDepartmentsForDate(formData.date).map(
                    (dept, index) => (
                      <Picker.Item
                        key={index}
                        label={dept.department}
                        value={dept.department}
                      />
                    ),
                  )}
                </Picker>
              </View>
            </View>

            {/* Date */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                Date *
              </Text>
              <DatePickerField
                value={formData.date}
                onChange={(dateStr) =>
                  setFormData({ ...formData, date: dateStr })
                }
                placeholder="Select Date"
              />
            </View>

            {/* Time Pickers */}
            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-gray-900">
                  Start Time *
                </Text>
                <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                  <Picker
                    selectedValue={formData.startTime}
                    onValueChange={(itemValue: string) => {
                      let newEndTime = formData.endTime;
                      if (
                        newEndTime &&
                        getTimeValue(newEndTime) <= getTimeValue(itemValue)
                      ) {
                        newEndTime = "";
                      }
                      setFormData({
                        ...formData,
                        startTime: itemValue,
                        endTime: newEndTime,
                      });
                    }}
                    style={{ height: 50 }}
                  >
                    {timeOptions.map((time) => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View className="flex-1">
                <Text className="mb-2 text-sm font-semibold text-gray-900">
                  End Time *
                </Text>
                <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                  <Picker
                    selectedValue={formData.endTime}
                    onValueChange={(itemValue: string) =>
                      setFormData({ ...formData, endTime: itemValue })
                    }
                    style={{ height: 50 }}
                  >
                    {timeOptions
                      .filter(
                        (t) =>
                          !formData.startTime ||
                          getTimeValue(t) > getTimeValue(formData.startTime),
                      )
                      .map((time) => (
                        <Picker.Item key={time} label={time} value={time} />
                      ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Special Event Checkbox */}
            <View className="flex-row items-center gap-3 mb-4">
              <TouchableOpacity
                onPress={() =>
                  setFormData({
                    ...formData,
                    isSpecialEvent: !formData.isSpecialEvent,
                    specialEventType: "",
                  })
                }
                className="items-center justify-center w-5 h-5 border border-gray-300 rounded"
                style={{
                  backgroundColor: formData.isSpecialEvent
                    ? COLORS.accent
                    : "transparent",
                }}
              >
                {formData.isSpecialEvent && <Check size={14} color="#FFF" />}
              </TouchableOpacity>
              <Text className="text-sm text-gray-900">
                This is a Special Event (Opening/Lunch/Closing)
              </Text>
            </View>

            {formData.isSpecialEvent ? (
              <>
                {/* Event Type Picker */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-900">
                    Event Type *
                  </Text>
                  <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                    <Picker
                      selectedValue={formData.specialEventType}
                      onValueChange={(itemValue: string) =>
                        setFormData({
                          ...formData,
                          specialEventType: itemValue,
                        })
                      }
                      style={{ height: 50 }}
                    >
                      <Picker.Item label="Select Event Type" value="" />
                      <Picker.Item label="Opening Meeting" value="OPENING" />
                      <Picker.Item label="Lunch Break" value="LUNCH" />
                      <Picker.Item label="Closing Meeting" value="CLOSING" />
                    </Picker>
                  </View>
                </View>

                {/* Auditor/Auditee for Special Events (non-LUNCH) */}
                {formData.specialEventType !== "LUNCH" && (
                  <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Auditor *
                      </Text>
                      <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                        <Picker
                          selectedValue={formData.auditorId}
                          onValueChange={(itemValue: string) =>
                            setFormData({
                              ...formData,
                              auditorId: itemValue,
                            })
                          }
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Select Auditor" value="" />
                          {departmentTeamInfo.teamAuditorIds.length > 0 ? (
                            departmentAuditors
                              .filter((a) =>
                                departmentTeamInfo.teamAuditorIds.includes(
                                  Number(a.id),
                                ),
                              )
                              .map((auditor) => (
                                <Picker.Item
                                  key={auditor.id}
                                  label={`${auditor.firstName} ${auditor.lastName}`}
                                  value={auditor.id.toString()}
                                />
                              ))
                          ) : (
                            <Picker.Item
                              label="No team auditors assigned"
                              value=""
                              enabled={false}
                            />
                          )}
                        </Picker>
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Auditee *
                      </Text>
                      <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                        <Picker
                          selectedValue={formData.auditeeId}
                          onValueChange={(itemValue: string) =>
                            setFormData({
                              ...formData,
                              auditeeId: itemValue,
                            })
                          }
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Select Auditee" value="" />
                          {departmentTeamInfo.auditeeIds.length > 0 ? (
                            departmentAuditees
                              .filter((a) =>
                                departmentTeamInfo.auditeeIds.includes(
                                  Number(a.id),
                                ),
                              )
                              .map((auditee) => (
                                <Picker.Item
                                  key={auditee.id}
                                  label={`${auditee.firstName} ${auditee.lastName}${auditee.role === "HOD" ? " (HOD)" : ""}`}
                                  value={auditee.id.toString()}
                                />
                              ))
                          ) : (
                            <Picker.Item
                              label="No matching auditees found"
                              value=""
                              enabled={false}
                            />
                          )}
                        </Picker>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                {/* Departments & Elements Selection */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-900">
                    Select Departments & Audit Elements *
                  </Text>
                  <View className="p-4 border border-gray-200 rounded-lg max-h-60">
                    {getAvailableDepartmentsForDate(formData.date)
                      .filter(
                        (deptInfo) =>
                          !selectedAuditDepartment ||
                          deptInfo.department === selectedAuditDepartment,
                      )
                      .map((deptInfo) => {
                        const departmentName = deptInfo.department;
                        const availableElements = deptInfo.auditElements || [];
                        const selectedDept = formData.selectedDepartments?.find(
                          (d) => d.department === departmentName,
                        );
                        const selectedElements =
                          selectedDept?.selectedElements || [];
                        return (
                          <View
                            key={departmentName}
                            className="pb-3 mb-3 border-b border-gray-200"
                          >
                            <TouchableOpacity
                              onPress={() => {
                                let updated = [
                                  ...(formData.selectedDepartments || []),
                                ];
                                const existingIndex = updated.findIndex(
                                  (d) => d.department === departmentName,
                                );
                                if (existingIndex >= 0) {
                                  updated[existingIndex].selectedElements = [
                                    ...availableElements,
                                  ];
                                } else {
                                  updated.push({
                                    department: departmentName,
                                    selectedElements: [...availableElements],
                                  });
                                }
                                setFormData((prev) => ({
                                  ...prev,
                                  selectedDepartments: updated,
                                }));
                                if (departmentName === selectedAuditDepartment)
                                  setSelectedAuditDepartment("");
                              }}
                              className="flex-row items-center gap-3 mb-2"
                            >
                              <View
                                className="items-center justify-center w-5 h-5 border border-gray-300 rounded"
                                style={{
                                  backgroundColor:
                                    availableElements.length > 0 &&
                                    selectedElements.length ===
                                      availableElements.length
                                      ? COLORS.accent
                                      : "transparent",
                                }}
                              >
                                {availableElements.length > 0 &&
                                  selectedElements.length ===
                                    availableElements.length && (
                                    <Check size={14} color="#FFF" />
                                  )}
                              </View>
                              <Text className="font-semibold text-gray-900">
                                {departmentName}
                              </Text>
                            </TouchableOpacity>
                            <View className="flex-row flex-wrap gap-2 ml-8">
                              {availableElements.map((element) => (
                                <TouchableOpacity
                                  key={element}
                                  onPress={() => {
                                    let updated = [
                                      ...(formData.selectedDepartments || []),
                                    ];
                                    let deptIndex = updated.findIndex(
                                      (d) => d.department === departmentName,
                                    );
                                    if (deptIndex === -1) {
                                      updated.push({
                                        department: departmentName,
                                        selectedElements: [],
                                      });
                                      deptIndex = updated.length - 1;
                                    }
                                    const isSelected =
                                      updated[
                                        deptIndex
                                      ].selectedElements.includes(element);
                                    if (isSelected) {
                                      updated[deptIndex].selectedElements =
                                        updated[
                                          deptIndex
                                        ].selectedElements.filter(
                                          (el) => el !== element,
                                        );
                                    } else {
                                      updated[deptIndex].selectedElements = [
                                        ...updated[deptIndex].selectedElements,
                                        element,
                                      ];
                                    }
                                    if (
                                      updated[deptIndex].selectedElements
                                        .length === 0
                                    )
                                      updated.splice(deptIndex, 1);
                                    setFormData((prev) => ({
                                      ...prev,
                                      selectedDepartments: updated,
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-full border flex-row items-center gap-2 ${selectedElements.includes(element) ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
                                >
                                  {selectedElements.includes(element) && (
                                    <Check size={12} color={COLORS.accent} />
                                  )}
                                  <Text
                                    className={`text-xs font-medium ${selectedElements.includes(element) ? "text-blue-700" : "text-gray-700"}`}
                                  >
                                    {element}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        );
                      })}
                  </View>
                </View>

                {/* Regular Auditor/Auditee Pickers */}
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-semibold text-gray-900">
                      Auditor *
                    </Text>
                    <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                      <Picker
                        selectedValue={formData.auditorId}
                        onValueChange={(itemValue: string) =>
                          setFormData({ ...formData, auditorId: itemValue })
                        }
                        style={{ height: 50 }}
                      >
                        <Picker.Item label="Select Auditor" value="" />
                        {departmentTeamInfo.teamAuditorIds.length > 0 ? (
                          departmentAuditors
                            .filter((a) =>
                              departmentTeamInfo.teamAuditorIds.includes(
                                Number(a.id),
                              ),
                            )
                            .map((auditor) => (
                              <Picker.Item
                                key={auditor.id}
                                label={`${auditor.firstName} ${auditor.lastName}`}
                                value={auditor.id.toString()}
                              />
                            ))
                        ) : (
                          <Picker.Item
                            label="No team auditors assigned"
                            value=""
                            enabled={false}
                          />
                        )}
                      </Picker>
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-semibold text-gray-900">
                      Auditee *
                    </Text>
                    <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                      <Picker
                        selectedValue={formData.auditeeId}
                        onValueChange={(itemValue: string) =>
                          setFormData({ ...formData, auditeeId: itemValue })
                        }
                        style={{ height: 50 }}
                      >
                        <Picker.Item label="Select Auditee" value="" />
                        {departmentTeamInfo.auditeeIds.length > 0 ? (
                          departmentAuditees
                            .filter((a) =>
                              departmentTeamInfo.auditeeIds.includes(
                                Number(a.id),
                              ),
                            )
                            .map((auditee) => (
                              <Picker.Item
                                key={auditee.id}
                                label={`${auditee.firstName} ${auditee.lastName}${auditee.role === "HOD" ? " (HOD)" : ""}`}
                                value={auditee.id.toString()}
                              />
                            ))
                        ) : (
                          <Picker.Item
                            label="No matching auditees found"
                            value=""
                            enabled={false}
                          />
                        )}
                      </Picker>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Status Picker */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                Status
              </Text>
              <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(itemValue: string) =>
                    setFormData({ ...formData, status: itemValue })
                  }
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Scheduled" value="SCHEDULED" />
                  <Picker.Item label="In Progress" value="IN_PROGRESS" />
                  <Picker.Item label="Completed" value="COMPLETED" />
                  <Picker.Item label="Cancelled" value="CANCELLED" />
                </Picker>
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="flex-row justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
            <TouchableOpacity
              onPress={onClose}
              className="justify-center h-10 px-5 bg-white border border-gray-200 rounded-lg"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSave}
              disabled={
                saving ||
                !selectedAuditDepartment ||
                !formData.auditorId ||
                !formData.auditeeId
              }
              className="flex-row items-center h-10 gap-2 px-5 rounded-lg"
              style={{
                backgroundColor:
                  saving ||
                  !selectedAuditDepartment ||
                  !formData.auditorId ||
                  !formData.auditeeId
                    ? "#F1F5F9"
                    : COLORS.accent,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Save size={16} color="#FFF" />
              )}
              <Text className="text-sm font-semibold text-white">
                {formData.id ? "Update Schedule" : "Add Schedule"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
