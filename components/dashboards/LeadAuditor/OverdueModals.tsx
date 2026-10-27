// app/components/dashboards/LeadAuditor/OverdueModals.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    AlertCircle,
    Calendar,
    Check,
    CheckCircle,
    CheckSquare,
    ChevronDown,
    Clock,
    Search,
    X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ════ STRICT MONOCHROMATIC MNC PALETTE ═════
export const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  headerBg: "#F8FAFC",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
  chipBg: "#EFF6FF",
  chipBorder: "#BFDBFE",
  chipText: "#1E40AF",
};

export const TIME_OPTIONS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

// ═════ TABLE COLUMN CONFIG ═════
export const COLUMN_MIN_WIDTHS = {
  date: 150,
  dept: 150,
  elements: 180,
  team: 220,
  status: 160,
  actions: 200,
};

export const TABLE_MIN_WIDTH = Object.values(COLUMN_MIN_WIDTHS).reduce(
  (a, b) => a + b,
  0,
);

export const COLUMN_FLEX = {
  date: 1.1,
  dept: 1.2,
  elements: 1.6,
  team: 2.0,
  status: 1.3,
  actions: 1.8,
};

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────
export const monthOrder = (m: string) => {
  const order = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ];
  return order.indexOf(m);
};

export const extractData = (response: any) => {
  if (Array.isArray(response)) return response;
  return response?.data !== undefined ? response.data : response;
};

export const toNumArray = (raw: any): number[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = value
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(value)) value = [value];
  return value
    .flat(1)
    .map((v: any) => Number(v))
    .filter((n: number) => !Number.isNaN(n));
};

export const normalizeNames = (raw: any): string[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [value];
    }
  }
  if (!Array.isArray(value)) return [String(value)];
  return value
    .flat(1)
    .map((v: any) => (typeof v === "string" ? v : String(v)))
    .filter((v) => v.length > 0);
};

export const hasEnded = (s: any): boolean => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const scheduled = String(s.scheduledDate || "").slice(0, 10);

  if (s.toDate) {
    const toDateStr = String(s.toDate).slice(0, 10);
    if (toDateStr > todayStr) return false;
    if (toDateStr < todayStr) return true;
  }

  if (scheduled && scheduled < todayStr) return true;
  if (scheduled && scheduled > todayStr) return false;

  if (scheduled === todayStr) {
    const raw = String(s.endTime || "").trim();
    if (!raw) return false;
    const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!match) return false;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const mod = (match[3] || "").toUpperCase();
    if (mod === "PM" && h !== 12) h += 12;
    if (mod === "AM" && h === 12) h = 0;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = h * 60 + m;
    return nowMinutes >= endMinutes + 1;
  }

  return false;
};

export const getWeekNumber = (dateStr: string): string => {
  if (!dateStr) return "W-1";
  const date = new Date(dateStr);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  let weekNum = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  if (weekNum < 1) weekNum = 1;
  if (weekNum > 6) weekNum = 6;
  return `W-${weekNum}`;
};

export const convertToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  if (!time) return 0;
  let [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// ─────────────────────────────────────────────────────────────
// DATE / TIME helpers
// ─────────────────────────────────────────────────────────────
export const getLocalDateString = (dateInput: any): string => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateSafe = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    );
  }
  return new Date(dateStr);
};

// Minimum selectable date for reschedule / extend = tomorrow
export const tomorrowStr = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export const DatePickerField = ({
  label,
  value,
  onChange,
  error,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  minimumDate?: string; // "YYYY-MM-DD"
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(parseDateSafe(value));

  useEffect(() => {
    if (value) setTempDate(parseDateSafe(value));
  }, [value]);

  const minDateObj = minimumDate ? parseDateSafe(minimumDate) : undefined;

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        // guard: don't accept a date before the minimum
        if (minDateObj && selectedDate.getTime() < minDateObj.getTime()) {
          return;
        }
        onChange(getLocalDateString(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    if (minDateObj && tempDate.getTime() < minDateObj.getTime()) {
      // do nothing — user must pick a valid date
      return;
    }
    onChange(getLocalDateString(tempDate));
    setShowPicker(false);
  };

  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>

      {Platform.OS === "web" ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            height: 44,
            backgroundColor: "#FFF",
            borderWidth: 1,
            borderColor: error ? COLORS.stateErrorText : COLORS.border,
            borderRadius: 10,
          }}
        >
          <Calendar size={16} color={COLORS.textMuted} />
          {/* @ts-ignore */}
          <input
            type="date"
            value={value}
            min={minimumDate || undefined}
            onChange={(e: any) => {
              const v = e.target.value;
              // guard: block past dates even if browser lets them through
              if (minimumDate && v && v < minimumDate) return;
              onChange(v);
            }}
            style={
              {
                flex: 1,
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                color: value ? COLORS.text : "#9CA3AF",
                fontSize: 13,
                padding: 0,
                marginLeft: 8,
                fontFamily: "inherit",
                cursor: "pointer",
              } as any
            }
          />
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              height: 44,
              backgroundColor: "#FFF",
              borderWidth: 1,
              borderColor: error ? COLORS.stateErrorText : COLORS.border,
              borderRadius: 10,
            }}
          >
            <Text
              style={{ fontSize: 13, color: value ? COLORS.text : "#9CA3AF" }}
            >
              {value || "Select Date"}
            </Text>
            <Calendar size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          {Platform.OS === "ios" && showPicker && (
            <Modal transparent animationType="slide" visible={showPicker}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15,23,42,0.6)",
                  justifyContent: "flex-end",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#FFF",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 16,
                    paddingBottom: 30,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text
                        style={{
                          fontSize: 15,
                          color: COLORS.stateErrorText,
                          fontWeight: "500",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: COLORS.text,
                      }}
                    >
                      Select Date
                    </Text>
                    <TouchableOpacity onPress={handleConfirm}>
                      <Text
                        style={{
                          fontSize: 15,
                          color: COLORS.primary,
                          fontWeight: "700",
                        }}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    minimumDate={minDateObj}
                    onChange={onDateChange}
                    textColor="#000000"
                  />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === "android" && showPicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              minimumDate={minDateObj}
              onChange={onDateChange}
            />
          )}
        </>
      )}
      {error ? (
        <Text
          style={{ fontSize: 11, color: COLORS.stateErrorText, marginTop: 4 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════
// TIME PICKER FIELD
// ═════════════════════════════════════════════════════════════
export const TimePickerField = ({
  label,
  value,
  onChange,
  options = TIME_OPTIONS,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  disabled?: boolean;
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>

      <TouchableOpacity
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          height: 44,
          backgroundColor: disabled ? COLORS.bg : "#FFF",
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: disabled
              ? COLORS.textMuted
              : value
                ? COLORS.text
                : "#9CA3AF",
          }}
        >
          {value || "Select Time"}
        </Text>
        <Clock size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "70%",
              maxWidth: 320,
              maxHeight: "50%",
              backgroundColor: "#FFF",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFF" }}>
                Select Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={{ padding: 4 }}
              >
                <X size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item: string) => item}
              contentContainerStyle={{ padding: 8 }}
              renderItem={({ item }) => {
                const isSelected = value === item;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item);
                      setShowPicker(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 4,
                      backgroundColor: isSelected
                        ? COLORS.primaryLight
                        : "#FFF",
                      borderWidth: 1,
                      borderColor: isSelected
                        ? COLORS.primaryBorder
                        : COLORS.borderSubtle,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isSelected
                            ? COLORS.primary
                            : "#CBD5E1",
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected
                            ? COLORS.primaryDark
                            : COLORS.textValue,
                        }}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && (
                      <CheckCircle size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════
// TIME SELECT FIELD (AddScheduleModal-style dropdown)
// ═════════════════════════════════════════════════════════════
const getTimeValue = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  if (!time) return 0;
  let [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
};

export const TimeSelectField = ({
  label,
  value,
  onChange,
  options = TIME_OPTIONS,
  disabled,
  placeholder = "Select Time",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={modalStyles.sectionLabel}>{label}</Text>

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled}
        onPress={() => !disabled && setOpen(true)}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
          backgroundColor: disabled ? COLORS.bg : "#FFF",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            color: value ? COLORS.text : "#9CA3AF",
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ChevronDown
          size={16}
          color={disabled ? "#94A3B8" : COLORS.textMuted}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 380,
              maxHeight: "70%",
              backgroundColor: "#FFF",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: COLORS.text,
                }}
              >
                {placeholder}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ padding: 8 }}
            >
              {options.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    No options available
                  </Text>
                </View>
              ) : (
                options.map((item) => {
                  const isSelected = value === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 8,
                        marginBottom: 4,
                        backgroundColor: isSelected
                          ? COLORS.primaryLight
                          : "#FFF",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected
                          ? COLORS.primaryBorder
                          : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? COLORS.primaryDark : COLORS.text,
                        }}
                      >
                        {item}
                      </Text>
                      {isSelected && (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: COLORS.primary,
                          }}
                        >
                          <Check size={12} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════
// AUDITOR PICKER FIELD (with inline conflict indicator)
// ═════════════════════════════════════════════════════════════
export const AuditorPickerField = ({
  label,
  value,
  onChange,
  auditors,
  conflictsMap,
  excludeCurrent,
  currentAuditorId,
  currentAuditorName,
  placeholder = "Select Auditor",
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  auditors: any[];
  conflictsMap?: Record<string, string>;
  excludeCurrent?: boolean;
  currentAuditorId?: string | number | null;
  currentAuditorName?: string | null;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const map = conflictsMap || {};

  const filtered = (auditors || []).filter((a: any) => {
    if (!excludeCurrent) return true;
    const isCurrent =
      String(a.id) === String(currentAuditorId) ||
      `${a.firstName} ${a.lastName}`.toLowerCase() ===
        (currentAuditorName || "").toLowerCase();
    return !isCurrent;
  });

  const selected = filtered.find((a: any) => String(a.id) === String(value));
  const selectedHasConflict = selected
    ? map[String(selected.id)] !== undefined
    : false;

  return (
    <View>
      <Text style={modalStyles.sectionLabel}>{label}</Text>

      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 12,
          height: 48,
          backgroundColor: "#FFF",
          borderWidth: 1,
          borderColor: selectedHasConflict ? "#FCA5A5" : COLORS.border,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: selected
              ? selectedHasConflict
                ? "#B91C1C"
                : COLORS.text
              : "#9CA3AF",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {selected
            ? `${selected.firstName} ${selected.lastName}${
                selectedHasConflict ? "  •  conflict" : ""
              }`
            : placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(15,23,42,0.5)",
            padding: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "70%",
              backgroundColor: "#FFF",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: COLORS.text,
                }}
              >
                {placeholder}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 8 }}
            >
              {filtered.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    No auditors available
                  </Text>
                </View>
              ) : (
                filtered.map((a: any) => {
                  const id = String(a.id);
                  const isSelected = id === String(value);
                  const hasConflict = map[id] !== undefined;

                  const rowStyle = {
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    justifyContent: "space-between" as const,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginBottom: 4,
                    backgroundColor: hasConflict
                      ? "#F8FAFC"
                      : isSelected
                        ? COLORS.primaryLight
                        : "#FFF",
                    borderWidth: 1,
                    borderColor: hasConflict
                      ? "#991B1B"
                      : isSelected
                        ? COLORS.primaryBorder
                        : COLORS.borderSubtle,
                    opacity: hasConflict ? 0.9 : 1,
                  };

                  const rowContent = (
                    <>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight:
                            isSelected && !hasConflict ? "700" : "500",
                          color: hasConflict
                            ? "#991B1B"
                            : isSelected
                              ? COLORS.primaryDark
                              : COLORS.text,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {a.firstName} {a.lastName}
                        {hasConflict ? "  • Time conflict" : ""}
                      </Text>

                      {hasConflict ? (
                        <AlertCircle
                          size={14}
                          color="#B91C1C"
                          strokeWidth={2.5}
                          style={{ marginLeft: 8 }}
                        />
                      ) : isSelected ? (
                        <Check size={16} color={COLORS.primary} />
                      ) : null}
                    </>
                  );

                  // Conflicting auditor → NOT selectable
                  if (hasConflict) {
                    return (
                      <View key={id} style={rowStyle}>
                        {rowContent}
                      </View>
                    );
                  }

                  // Normal auditor → selectable
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => {
                        onChange(id);
                        setOpen(false);
                      }}
                      style={rowStyle}
                    >
                      {rowContent}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MULTI-SELECT MODAL
// ─────────────────────────────────────────────────────────────
export const MultiSelectModal = ({
  isOpen,
  onClose,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  emptyMsg,
  title,
  loading,
}: any) => {
  const [search, setSearch] = useState("");
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((opt: any) =>
    `${opt.firstName} ${opt.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            padding: 16,
          }}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "95%",
              maxWidth: 440,
              backgroundColor: COLORS.card,
              borderRadius: 16,
              overflow: "hidden",
              maxHeight: "85%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: COLORS.text,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: COLORS.textMuted,
                  }}
                >
                  {selectedIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
                backgroundColor: COLORS.headerBg,
              }}
            >
              <Search size={16} color={COLORS.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 13,
                  color: COLORS.text,
                }}
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>

            {safeOptions.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  padding: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.borderSubtle,
                }}
              >
                <View style={{ flex: 1 }}>
                  <OutlineButton
                    title="Select All"
                    icon={CheckSquare}
                    onPress={onSelectAll}
                    variant="primary"
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <OutlineButton
                    title="Clear All"
                    icon={X}
                    onPress={onClearAll}
                    variant="primary"
                    size="sm"
                  />
                </View>
              </View>
            )}

            <ScrollView
              style={{ width: "100%" }}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: COLORS.textMuted,
                    }}
                  >
                    Loading...
                  </Text>
                </View>
              ) : filteredOptions.length === 0 ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    {emptyMsg}
                  </Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = item.id.toString();
                  const checked = selectedIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => onToggle(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.borderSubtle,
                        backgroundColor: checked ? COLORS.primaryLight : "#FFF",
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: checked ? COLORS.primary : "#CBD5E1",
                          backgroundColor: checked ? COLORS.primary : "#FFF",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checked && <Check size={12} color="#FFF" />}
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: checked ? "600" : "500",
                          color: checked ? COLORS.primaryDark : COLORS.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.firstName} {item.lastName}
                        {item.role === "HOD" ? " (HOD)" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: COLORS.borderSubtle,
                backgroundColor: COLORS.headerBg,
              }}
            >
              <SecondaryButton title="Close" onPress={onClose} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Table cell helpers ────────────────────────────────────────────
export const HeaderCell = ({
  flex,
  minWidth,
  fixedWidth,
  label,
  last,
}: {
  flex: number;
  minWidth: number;
  fixedWidth?: number;
  label: string;
  last?: boolean;
}) => (
  <View
    style={{
      ...(fixedWidth != null
        ? { width: fixedWidth }
        : { flex, minWidth, flexShrink: 1 }),
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: COLORS.border,
      justifyContent: "center",
    }}
  >
    <Text
      style={{
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  </View>
);

export const BodyCell = ({
  flex,
  minWidth,
  fixedWidth,
  children,
  last,
}: {
  flex: number;
  minWidth: number;
  fixedWidth?: number;
  children: React.ReactNode;
  last?: boolean;
}) => (
  <View
    style={{
      ...(fixedWidth != null
        ? { width: fixedWidth }
        : { flex, flexShrink: 1, minWidth: 0 }),
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: COLORS.borderSubtle,
      justifyContent: "center",
    }}
  >
    {children}
  </View>
);

export const ActionChip = ({
  label,
  icon,
  bgColor,
  borderColor,
  textColor,
  onPress,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor,
      backgroundColor: bgColor,
    }}
  >
    {icon}
    <Text style={{ fontSize: 11, fontWeight: "600", color: textColor }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ═════════════════════════════════════════════════════════════
// UNIFIED OUTLINE BUTTON (Form4View-style)
// ═════════════════════════════════════════════════════════════
export const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  variant = "default", // "default" | "primary" | "danger" | "success" | "filled" | "warning"
  size = "md", // "sm" | "md" | "lg"
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "primary" | "danger" | "success" | "filled" | "warning";
  size?: "sm" | "md" | "lg";
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled && !loading;

  const variantColors: Record<
    string,
    {
      hoverBorder: string;
      hoverText: string;
      hoverIcon: string;
      hoverBg: string;
      baseBorder: string;
      baseText: string;
      baseIcon: string;
      baseBg: string;
    }
  > = {
    default: {
      hoverBorder: "#2563EB",
      hoverText: "#2563EB",
      hoverIcon: "#2563EB",
      hoverBg: "rgba(37, 99, 235, 0.08)",
      baseBorder: "#D1D5DB",
      baseText: "#111827",
      baseIcon: "#6B7280",
      baseBg: "transparent",
    },
    primary: {
      hoverBorder: COLORS.primaryDark,
      hoverText: COLORS.primaryDark,
      hoverIcon: COLORS.primaryDark,
      hoverBg: "rgba(30, 58, 138, 0.1)",
      baseBorder: COLORS.primaryBorder,
      baseText: COLORS.primaryDark,
      baseIcon: COLORS.primary,
      baseBg: "transparent",
    },
    danger: {
      hoverBorder: "#B91C1C",
      hoverText: "#B91C1C",
      hoverIcon: "#B91C1C",
      hoverBg: "rgba(185, 28, 28, 0.08)",
      baseBorder: COLORS.border,
      baseText: COLORS.stateErrorText,
      baseIcon: COLORS.stateErrorText,
      baseBg: "transparent",
    },
    success: {
      hoverBorder: COLORS.primaryDark,
      hoverText: COLORS.primaryDark,
      hoverIcon: COLORS.primaryDark,
      hoverBg: "rgba(30, 58, 138, 0.1)",
      baseBorder: COLORS.primaryBorder,
      baseText: COLORS.primaryDark,
      baseIcon: COLORS.primary,
      baseBg: "transparent",
    },
    warning: {
      hoverBorder: COLORS.primaryDark,
      hoverText: COLORS.primaryDark,
      hoverIcon: COLORS.primaryDark,
      hoverBg: "rgba(30, 58, 138, 0.1)",
      baseBorder: COLORS.border,
      baseText: COLORS.textMuted,
      baseIcon: COLORS.textMuted,
      baseBg: "transparent",
    },
    filled: {
      hoverBorder: COLORS.primaryDark,
      hoverText: "#FFF",
      hoverIcon: "#FFF",
      hoverBg: COLORS.primaryDark,
      baseBorder: COLORS.primary,
      baseText: "#FFF",
      baseIcon: "#FFF",
      baseBg: COLORS.primary,
    },
  };

  const v = variantColors[variant] || variantColors.default;

  const borderColor = isHoveredAndEnabled ? v.hoverBorder : v.baseBorder;
  const textColor = isHoveredAndEnabled ? v.hoverText : v.baseText;
  const iconColor = isHoveredAndEnabled ? v.hoverIcon : v.baseIcon;
  const backgroundColor = isHoveredAndEnabled ? v.hoverBg : v.baseBg;

  // Size presets matching Form4View (px-3 py-2.5 → md)
  const sizeMap = {
    sm: { px: 10, py: 6, fontSize: 11, icon: 13, gap: 4 },
    md: { px: 12, py: 10, fontSize: 13, icon: 16, gap: 8 },
    lg: { px: 16, py: 12, fontSize: 14, icon: 18, gap: 8 },
  };
  const s = sizeMap[size];

  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && !loading && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && !loading && setIsHovered(true)}
      onPressOut={() => !disabled && !loading && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: s.gap,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: 8,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        opacity: disabled ? 0.5 : 1,
        ...(Platform.OS === "web"
          ? ({
              transitionProperty: "all",
              transitionDuration: "150ms",
              transitionTimingFunction: "ease-in-out",
              cursor: disabled || loading ? "not-allowed" : "pointer",
            } as any)
          : {}),
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : Icon ? (
        <Icon size={s.icon} color={iconColor} />
      ) : null}
      <Text
        style={{ fontSize: s.fontSize, fontWeight: "600", color: textColor }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// Backward-compatible alias (so existing usages don't break)
export const HoverOutlineButton = OutlineButton;

// ═════════════════════════════════════════════════════════════
// PRIMARY / SECONDARY FOOTER BUTTONS (Form4View-style)
// ═════════════════════════════════════════════════════════════
export const PrimaryButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  color = COLORS.primary,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled && !loading;

  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && !loading && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && !loading && setIsHovered(true)}
      onPressOut={() => !disabled && !loading && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: isHoveredAndEnabled
          ? COLORS.primaryDark
          : disabled || loading
            ? "#94A3B8"
            : color,
        opacity: disabled || loading ? 0.7 : 1,
        ...(Platform.OS === "web"
          ? ({
              transitionProperty: "background-color, opacity",
              transitionDuration: "150ms",
              cursor: disabled || loading ? "not-allowed" : "pointer",
            } as any)
          : {}),
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : Icon ? (
        <Icon size={14} color="#FFF" />
      ) : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFF" }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const SecondaryButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isHoveredAndEnabled ? "#2563EB" : COLORS.border,
        backgroundColor: isHoveredAndEnabled
          ? "rgba(37, 99, 235, 0.06)"
          : "#FFF",
        opacity: disabled ? 0.5 : 1,
        ...(Platform.OS === "web"
          ? ({
              transitionProperty: "all",
              transitionDuration: "150ms",
              cursor: disabled ? "not-allowed" : "pointer",
            } as any)
          : {}),
      }}
    >
      {Icon ? (
        <Icon size={14} color={isHoveredAndEnabled ? "#2563EB" : COLORS.text} />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: isHoveredAndEnabled ? "#2563EB" : COLORS.text,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View
    style={{
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderSubtle,
    }}
  >
    <Text
      style={{
        width: 130,
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "500",
      }}
    >
      {label}
    </Text>
    <Text style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{value}</Text>
  </View>
);

export const InfoCell = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View
    style={{
      flex: 1,
      minWidth: "45%",
      padding: 12,
      backgroundColor: COLORS.headerBg,
      borderRadius: 10,
    }}
  >
    <Text
      style={{
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
        fontWeight: "500",
      }}
    >
      {label}
    </Text>
    <Text
      style={{ fontSize: 13, fontWeight: "600", color: COLORS.text }}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

export const modalStyles = {
  backdrop: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingVertical: Platform.OS === "web" ? 40 : 16,
    paddingHorizontal: 16,
  },
  sheet: {
    width: "100%" as const,
    maxWidth: 480,
    maxHeight: "90%" as const,
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" as const, color: COLORS.text },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textarea: {
    width: "100%" as const,
    minHeight: 100,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    fontSize: 13,
    textAlignVertical: "top" as const,
    color: COLORS.text,
  },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bg,
  },
};

// ═════════════════════════════════════════════════════════════
// LA DIRECT ASSIGN MODAL (Reschedule / Extend)
// ═════════════════════════════════════════════════════════════
export const LAAssignModal: React.FC<any> = ({
  visible,
  onClose,
  submitting,
  target,
  mode,
  modeHint,
  date,
  setDate,
  start,
  setStart,
  end,
  setEnd,
  endDate,
  setEndDate,
  reason,
  setReason,
  showReassign,
  setShowReassign,
  selectedAuditorId,
  setSelectedAuditorId,
  showCoAuditor,
  setShowCoAuditor,
  additionalAuditorIds,
  setAdditionalAuditorIds,
  auditors,
  teamInfo,
  loadingTeam,
  conflictWarning,
  conflictsMap,
  checkingAvailability,
  checkConflicts,
  onSubmit,
}) => {
  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !submitting && onClose()}
    >
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { maxWidth: 620 }]}>
          <View style={modalStyles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: COLORS.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={modalStyles.headerTitle}>
                  {mode === "EXTEND"
                    ? "Extend Overdue Schedule"
                    : "Reschedule Overdue Schedule"}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  {mode === "EXTEND"
                    ? "Extend deadline to give auditor more time"
                    : "Move the whole audit to a new date"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flexGrow: 1, flexShrink: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
          >
            {/* Audit info */}
            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginBottom: 6,
                }}
              >
                Audit
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
              >
                {target.auditType || "Audit"} — {target.department}
              </Text>
            </View>

            {/* Requested changes card */}
            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.primaryLight,
                borderWidth: 1,
                borderColor: COLORS.primaryBorder,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: COLORS.primaryDark,
                  }}
                >
                  Requested Changes
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontStyle: "italic",
                    color: COLORS.textMuted,
                  }}
                >
                  Editable by LA
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  backgroundColor: COLORS.card,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: COLORS.primaryLight,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: COLORS.primaryDark,
                      marginBottom: 2,
                    }}
                  >
                    {mode === "EXTEND" ? "Extend Deadline" : "Reschedule Audit"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.textValue,
                      lineHeight: 16,
                    }}
                  >
                    {modeHint ||
                      (mode === "EXTEND"
                        ? "Work has already started on this audit."
                        : "No work has been done on this audit yet.")}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Current
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                    marginTop: 2,
                  }}
                >
                  {target.scheduledDate} • {target.startTime}
                </Text>
              </View>

              {mode === "RESCHEDULE" ? (
                <>
                  <View style={{ marginBottom: 10 }}>
                    <DatePickerField
                      label="New Date"
                      value={date}
                      onChange={setDate}
                      minimumDate={tomorrowStr}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <TimeSelectField
                        label="Start Time"
                        value={start}
                        onChange={(newStart) => {
                          setStart(newStart);
                          if (
                            end &&
                            getTimeValue(end) <= getTimeValue(newStart)
                          ) {
                            setEnd("");
                          }
                        }}
                        options={TIME_OPTIONS}
                        placeholder="Select Start Time"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimeSelectField
                        label="End Time"
                        value={end}
                        onChange={setEnd}
                        options={TIME_OPTIONS.filter(
                          (t) =>
                            !start || getTimeValue(t) > getTimeValue(start),
                        )}
                        placeholder="Select End Time"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <DatePickerField
                  label="New End Date"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={tomorrowStr}
                />
              )}
            </View>

            {/* Current auditor */}
            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginBottom: 6,
                }}
              >
                Current Auditor
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
              >
                {target.auditorName || "—"}
              </Text>
            </View>

            {!loadingTeam && teamInfo.teamAuditorNames.length > 0 && (
              <View
                style={{
                  padding: 14,
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.primaryDark,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Assigned Audit Team
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.primaryDark,
                    marginTop: 2,
                  }}
                >
                  👥 Team: {teamInfo.teamAuditorNames.join(", ")}
                </Text>
              </View>
            )}

            {/* Reassign checkbox */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowReassign(!showReassign);
                  if (showReassign) setSelectedAuditorId("");
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: showReassign ? COLORS.primary : COLORS.border,
                  backgroundColor: showReassign ? COLORS.primary : "#FFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                {showReassign && <Check size={14} color="#FFF" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                  }}
                >
                  🔄 Reassign to different auditor
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Replace the current auditor with a new one
                </Text>
              </View>
            </View>

            {showReassign && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: COLORS.headerBg,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                {loadingTeam ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <AuditorPickerField
                    label="Select Primary Auditor *"
                    value={selectedAuditorId}
                    onChange={(id) => {
                      setSelectedAuditorId(id);
                      if (id) checkConflicts(id, true);
                    }}
                    auditors={auditors}
                    excludeCurrent
                    currentAuditorId={target.auditorId}
                    currentAuditorName={target.auditorName}
                    conflictsMap={conflictsMap}
                  />
                )}
                {checkingAvailability && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.primary,
                      marginTop: 6,
                    }}
                  >
                    Checking availability...
                  </Text>
                )}
              </View>
            )}

            {/* Add co-auditor */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowCoAuditor(!showCoAuditor);
                  if (showCoAuditor) setAdditionalAuditorIds([]);
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: showCoAuditor ? COLORS.primary : COLORS.border,
                  backgroundColor: showCoAuditor ? COLORS.primary : "#FFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                {showCoAuditor && <Check size={14} color="#FFF" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                  }}
                >
                  ➕ Add another auditor (Co-auditor)
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Add additional auditor without removing the primary one
                </Text>
              </View>
            </View>

            {showCoAuditor && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: COLORS.headerBg,
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                <Text style={modalStyles.sectionLabel}>
                  Select Additional Auditor(s)
                </Text>
                {loadingTeam ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <ScrollView style={{ maxHeight: 160 }}>
                    {auditors
                      .filter((a: any) => {
                        const isCurrent =
                          String(a.id) === String(target.auditorId) ||
                          `${a.firstName} ${a.lastName}`.toLowerCase() ===
                            (target.auditorName || "").toLowerCase();
                        if (isCurrent) return false;
                        if (
                          showReassign &&
                          selectedAuditorId &&
                          String(a.id) === selectedAuditorId
                        )
                          return false;
                        if (additionalAuditorIds.includes(String(a.id)))
                          return false;
                        return true;
                      })
                      .map((a: any) => {
                        const id = String(a.id);
                        const hasConflict =
                          (conflictsMap || {})[id] !== undefined;

                        const rowStyle = {
                          flexDirection: "row" as const,
                          justifyContent: "space-between" as const,
                          alignItems: "center" as const,
                          padding: 10,
                          backgroundColor: hasConflict ? "#F8FAFC" : "#FFF",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: hasConflict ? "#991B1B" : COLORS.border,
                          marginBottom: 6,
                          opacity: hasConflict ? 0.9 : 1,
                        };

                        const rowContent = (
                          <>
                            <Text
                              style={{
                                fontSize: 13,
                                color: hasConflict ? "#991B1B" : COLORS.text,
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {a.firstName} {a.lastName}
                              {hasConflict ? "  •  Time conflict" : ""}
                            </Text>
                            {hasConflict ? (
                              <AlertCircle
                                size={14}
                                color="#B91C1C"
                                strokeWidth={2.5}
                                style={{ marginLeft: 8 }}
                              />
                            ) : (
                              <Check size={16} color={COLORS.primary} />
                            )}
                          </>
                        );

                        if (hasConflict) {
                          return (
                            <View key={id} style={rowStyle}>
                              {rowContent}
                            </View>
                          );
                        }

                        return (
                          <TouchableOpacity
                            key={id}
                            onPress={() => {
                              setAdditionalAuditorIds([
                                ...additionalAuditorIds,
                                id,
                              ]);
                              checkConflicts(id, false);
                            }}
                            style={rowStyle}
                          >
                            {rowContent}
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                )}

                {additionalAuditorIds.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={modalStyles.sectionLabel}>
                      Selected Co-auditors
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {additionalAuditorIds.map((id: string) => {
                        const a = auditors.find(
                          (x: any) => String(x.id) === id,
                        );
                        if (!a) return null;
                        return (
                          <View
                            key={id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: COLORS.primaryLight,
                              borderWidth: 1,
                              borderColor: COLORS.primaryBorder,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: COLORS.primaryDark,
                                fontWeight: "600",
                              }}
                            >
                              {a.firstName} {a.lastName}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setAdditionalAuditorIds(
                                  additionalAuditorIds.filter(
                                    (x: string) => x !== id,
                                  ),
                                )
                              }
                            >
                              <X size={13} color={COLORS.stateErrorText} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Reason */}
            <Text style={modalStyles.sectionLabel}>Reason *</Text>
            <TextInput
              style={modalStyles.textarea}
              value={reason}
              onChangeText={setReason}
              placeholder={
                mode === "RESCHEDULE"
                  ? "Why are you rescheduling this overdue audit?"
                  : "Why does this audit need more time?"
              }
              placeholderTextColor="#94A3B8"
              multiline
              editable={!submitting}
            />
          </ScrollView>

          <View style={modalStyles.footer}>
            <SecondaryButton
              title="Cancel"
              onPress={onClose}
              disabled={submitting}
            />
            <PrimaryButton
              title={
                submitting
                  ? mode === "EXTEND"
                    ? "Extending..."
                    : "Rescheduling..."
                  : mode === "EXTEND"
                    ? "Extend"
                    : "Reschedule"
              }
              icon={Check}
              onPress={onSubmit}
              loading={submitting}
              disabled={
                submitting ||
                (showReassign && !selectedAuditorId) ||
                (showReassign && conflictWarning?.type === "reassign")
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// REQUEST PREVIEW MODAL
// ═════════════════════════════════════════════════════════════
export const RequestPreviewModal: React.FC<any> = ({
  visible,
  onClose,
  target,
  overrideDate,
  setOverrideDate,
  overrideStart,
  setOverrideStart,
  overrideEnd,
  setOverrideEnd,
  overrideEndDate,
  setOverrideEndDate,
  onReject,
  onApprove,
}) => {
  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { maxWidth: 560 }]}>
          <View style={modalStyles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: COLORS.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={modalStyles.headerTitle}>
                  {target.rescheduleRequested
                    ? "Reschedule Request"
                    : "Extension Request"}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Review and edit before assigning
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flexGrow: 1, flexShrink: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <InfoCell label="Department" value={target.department} />
              <InfoCell label="Audit Type" value={target.auditType || "—"} />
              <InfoCell label="Auditor" value={target.auditorName || "—"} />
              <InfoCell
                label="Auditees"
                value={
                  target.auditeeNames?.join(", ") || target.auditeeName || "—"
                }
              />
            </View>

            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.primaryLight,
                borderWidth: 1,
                borderColor: COLORS.primaryBorder,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: COLORS.primaryDark,
                  }}
                >
                  Requested Changes
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontStyle: "italic",
                    color: COLORS.textMuted,
                  }}
                >
                  Editable by LA
                </Text>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Current
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                    marginTop: 2,
                  }}
                >
                  {target.scheduledDate} • {target.startTime}
                </Text>
              </View>

              {target.rescheduleRequested ? (
                <>
                  <View style={{ marginBottom: 10 }}>
                    <DatePickerField
                      label="New Date"
                      value={overrideDate}
                      onChange={setOverrideDate}
                      minimumDate={tomorrowStr}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <TimePickerField
                        label="Start Time"
                        value={overrideStart}
                        onChange={setOverrideStart}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TimePickerField
                        label="End Time"
                        value={overrideEnd}
                        onChange={setOverrideEnd}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <DatePickerField
                  label="New End Date"
                  value={overrideEndDate}
                  onChange={setOverrideEndDate}
                  minimumDate={tomorrowStr}
                />
              )}
            </View>

            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.headerBg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: COLORS.textMuted,
                  marginBottom: 6,
                }}
              >
                Reason for Request
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.text }}>
                {target.rescheduleRequested
                  ? target.rescheduleReason || "No reason provided"
                  : target.extensionReason || "No reason provided"}
              </Text>
            </View>
          </ScrollView>

          <View style={modalStyles.footer}>
            <SecondaryButton title="Cancel" onPress={onClose} />
            <OutlineButton
              title="Reject"
              icon={X}
              variant="danger"
              onPress={onReject}
            />
            <OutlineButton
              title="Approve"
              icon={Check}
              variant="filled"
              onPress={onApprove}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// ASSIGN REQUEST MODAL
// ═════════════════════════════════════════════════════════════
export const AssignRequestModal: React.FC<any> = ({
  visible,
  onClose,
  submitting,
  target,
  teamInfo,
  loadingTeamMembers,
  approvalAuditors,
  showReassignOptions,
  setShowReassignOptions,
  selectedReassignAuditorId,
  setSelectedReassignAuditorId,
  showAddAnotherAuditor,
  setShowAddAnotherAuditor,
  additionalAuditorIds,
  setAdditionalAuditorIds,
  conflictWarning,
  conflictsMap,
  checkingAvailability,
  checkConflicts,
  overrideDate,
  overrideStart,
  overrideEnd,
  overrideEndDate,
  approvalComment,
  setApprovalComment,
  onSubmit,
}) => {
  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { maxWidth: 600 }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              Assign {target.rescheduleRequested ? "Reschedule" : "Extension"}{" "}
              Request
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flexGrow: 1, flexShrink: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
          >
            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginBottom: 6,
                }}
              >
                Audit
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
              >
                {target.auditType || "Audit"} — {target.department}
              </Text>
            </View>

            <View
              style={{
                padding: 14,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  marginBottom: 6,
                }}
              >
                Current Auditor
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
              >
                {target.auditorName || "—"}
              </Text>
            </View>

            {!loadingTeamMembers && teamInfo.leadAuditorName && (
              <View
                style={{
                  padding: 14,
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.primaryDark,
                    fontWeight: "700",
                    marginBottom: 6,
                  }}
                >
                  Assigned Audit Team
                </Text>
                {teamInfo.teamAuditorNames.length > 0 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.primaryDark,
                      marginTop: 2,
                    }}
                  >
                    👥 Team: {teamInfo.teamAuditorNames.join(", ")}
                  </Text>
                )}
              </View>
            )}

            {/* Reassign checkbox */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginTop: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowReassignOptions(!showReassignOptions);
                  if (showReassignOptions) setSelectedReassignAuditorId("");
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: showReassignOptions
                    ? COLORS.primary
                    : COLORS.border,
                  backgroundColor: showReassignOptions
                    ? COLORS.primary
                    : "#FFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                {showReassignOptions && <Check size={14} color="#FFF" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                  }}
                >
                  🔄 Reassign to different auditor
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Replace the current auditor with a new one
                </Text>
              </View>
            </View>

            {showReassignOptions && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: COLORS.headerBg,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              >
                {loadingTeamMembers ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <AuditorPickerField
                    label="Select Primary Auditor *"
                    value={selectedReassignAuditorId}
                    onChange={(id) => {
                      setSelectedReassignAuditorId(id);
                      if (id) {
                        checkConflicts(id, true, {
                          date: overrideDate,
                          start: overrideStart,
                          end: overrideEnd,
                        });
                      }
                    }}
                    auditors={approvalAuditors}
                    excludeCurrent
                    currentAuditorId={target.auditorId}
                    currentAuditorName={target.auditorName}
                    conflictsMap={conflictsMap}
                  />
                )}
                {checkingAvailability && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.primary,
                      marginTop: 6,
                    }}
                  >
                    Checking availability...
                  </Text>
                )}

                {/* 🔥 RED WARNING BOX - Goes right below the dropdown */}
                {(conflictWarning ||
                  (conflictsMap && Object.keys(conflictsMap).length > 0)) && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#FCA5A5",
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#991B1B",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Time Conflict Detected!
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}
                    >
                      {conflictWarning?.auditorName
                        ? `Auditor ${conflictWarning.auditorName} is already scheduled at this time.`
                        : `Selected auditor has an existing schedule at this time.`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Add co-auditor */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                backgroundColor: COLORS.headerBg,
                borderRadius: 10,
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowAddAnotherAuditor(!showAddAnotherAuditor);
                  if (showAddAnotherAuditor) setAdditionalAuditorIds([]);
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 2,
                  borderColor: showAddAnotherAuditor
                    ? COLORS.primary
                    : COLORS.border,
                  backgroundColor: showAddAnotherAuditor
                    ? COLORS.primary
                    : "#FFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                {showAddAnotherAuditor && <Check size={14} color="#FFF" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.text,
                  }}
                >
                  ➕ Add another auditor (Co-auditor)
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                  Add additional auditor without removing the primary one
                </Text>
              </View>
            </View>

            {showAddAnotherAuditor && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: COLORS.headerBg,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              >
                <Text style={modalStyles.sectionLabel}>
                  Select Additional Auditor(s)
                </Text>

                {/* 🔥 NEW: Warning Box for Co-auditors */}
                {additionalAuditorIds.some(
                  (id: string) =>
                    conflictsMap && conflictsMap[id] !== undefined,
                ) && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#FCA5A5",
                      marginTop: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#991B1B",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Time Conflict Detected!
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#991B1B", marginTop: 4 }}
                    >
                      One or more selected co-auditors are already scheduled at
                      this time.
                    </Text>
                  </View>
                )}

                {loadingTeamMembers ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <ScrollView style={{ maxHeight: 160 }}>
                    {approvalAuditors
                      .filter((a: any) => {
                        if (
                          teamInfo.teamAuditorIds.length > 0 &&
                          !teamInfo.teamAuditorIds.includes(Number(a.id))
                        )
                          return false;
                        const isCurrent =
                          String(a.id) === String(target.auditorId) ||
                          `${a.firstName} ${a.lastName}`.toLowerCase() ===
                            (target.auditorName || "").toLowerCase();
                        if (isCurrent) return false;
                        if (
                          showReassignOptions &&
                          selectedReassignAuditorId &&
                          String(a.id) === selectedReassignAuditorId
                        )
                          return false;
                        if (additionalAuditorIds.includes(String(a.id)))
                          return false;
                        return true;
                      })
                      .map((a: any) => {
                        const id = String(a.id);
                        const hasConflict =
                          (conflictsMap || {})[id] !== undefined;

                        const rowStyle = {
                          flexDirection: "row" as const,
                          justifyContent: "space-between" as const,
                          alignItems: "center" as const,
                          padding: 10,
                          backgroundColor: hasConflict ? "#F8FAFC" : "#FFF",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: hasConflict
                            ? COLORS.border
                            : COLORS.border,
                          marginBottom: 6,
                          opacity: hasConflict ? 0.6 : 1,
                        };

                        const rowContent = (
                          <>
                            <Text
                              style={{
                                fontSize: 13,
                                color: hasConflict ? "#9CA3AF" : COLORS.text,
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {a.firstName} {a.lastName}
                              {hasConflict ? "  •  conflict" : ""}
                            </Text>
                            {hasConflict ? (
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "700",
                                  color: "#B91C1C",
                                  marginLeft: 8,
                                }}
                              >
                                ⚠️
                              </Text>
                            ) : (
                              <Check size={16} color={COLORS.primary} />
                            )}
                          </>
                        );

                        if (hasConflict) {
                          return (
                            <View key={id} style={rowStyle}>
                              {rowContent}
                            </View>
                          );
                        }

                        return (
                          <TouchableOpacity
                            key={id}
                            onPress={() => {
                              setAdditionalAuditorIds([
                                ...additionalAuditorIds,
                                id,
                              ]);
                              checkConflicts(id, false, {
                                date: overrideDate,
                                start: overrideStart,
                                end: overrideEnd,
                              });
                            }}
                            style={rowStyle}
                          >
                            {rowContent}
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                )}

                {additionalAuditorIds.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={modalStyles.sectionLabel}>
                      Selected Co-auditors
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {additionalAuditorIds.map((id: string) => {
                        const a = approvalAuditors.find(
                          (x: any) => String(x.id) === id,
                        );
                        if (!a) return null;
                        return (
                          <View
                            key={id}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 8,
                              backgroundColor: COLORS.primaryLight,
                              borderWidth: 1,
                              borderColor: COLORS.primaryBorder,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: COLORS.primaryDark,
                                fontWeight: "600",
                              }}
                            >
                              {a.firstName} {a.lastName}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setAdditionalAuditorIds(
                                  additionalAuditorIds.filter(
                                    (x: string) => x !== id,
                                  ),
                                )
                              }
                            >
                              <X size={13} color={COLORS.stateErrorText} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View
              style={{
                padding: 12,
                backgroundColor: COLORS.primaryLight,
                borderWidth: 1,
                borderColor: COLORS.primaryBorder,
                borderRadius: 10,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: COLORS.primaryDark,
                  marginBottom: 6,
                }}
              >
                Requested Changes (LA Overrides)
              </Text>
              {target.rescheduleRequested ? (
                <>
                  <Text style={{ fontSize: 12, color: COLORS.text }}>
                    New Date:{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {overrideDate || "—"}
                    </Text>
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.text, marginTop: 2 }}
                  >
                    New Time: {overrideStart || "—"} – {overrideEnd || "—"}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 12, color: COLORS.text }}>
                  New End Date:{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {overrideEndDate || "—"}
                  </Text>
                </Text>
              )}
            </View>

            <Text style={[modalStyles.sectionLabel, { marginTop: 12 }]}>
              Comments (Optional)
            </Text>
            <TextInput
              style={modalStyles.textarea}
              placeholder="Add any comments about this assignment..."
              placeholderTextColor="#94A3B8"
              value={approvalComment}
              onChangeText={setApprovalComment}
              multiline
              editable={!submitting}
            />
          </ScrollView>

          <View style={modalStyles.footer}>
            <SecondaryButton
              title="Cancel"
              onPress={onClose}
              disabled={submitting}
            />
            <PrimaryButton
              title={submitting ? "Assigning..." : "Assign"}
              icon={Check}
              onPress={onSubmit}
              loading={submitting}
              disabled={
                submitting ||
                (showReassignOptions && !selectedReassignAuditorId) ||
                (showReassignOptions && conflictWarning?.type === "reassign")
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// REJECT REQUEST MODAL
// ═════════════════════════════════════════════════════════════
export const RejectRequestModal: React.FC<any> = ({
  visible,
  onClose,
  submitting,
  target,
  rejectionReason,
  setRejectionReason,
  onSubmit,
}) => {
  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.sheet, { maxWidth: 500 }]}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              Reject {target.rescheduleRequested ? "Reschedule" : "Extension"}{" "}
              Request
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, color: COLORS.text }}>
              You are about to reject the{" "}
              <Text style={{ fontWeight: "700" }}>
                {target.rescheduleRequested ? "reschedule" : "extension"}
              </Text>{" "}
              request for{" "}
              <Text style={{ fontWeight: "700" }}>{target.department}</Text>.
            </Text>
            <TextInput
              style={[modalStyles.textarea, { marginTop: 12 }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#94A3B8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              editable={!submitting}
            />
          </View>

          <View style={modalStyles.footer}>
            <SecondaryButton
              title="Cancel"
              onPress={onClose}
              disabled={submitting}
            />
            <PrimaryButton
              title={submitting ? "Rejecting..." : "Reject"}
              icon={X}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !rejectionReason.trim()}
              color={COLORS.stateErrorText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// DETAIL MODAL
// ═════════════════════════════════════════════════════════════
export const DetailModal: React.FC<any> = ({ visible, onClose, target }) => {
  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Daily Schedule Detail</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flexGrow: 1, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator
          >
            <DetailRow label="Date" value={target.scheduledDate || "—"} />
            <DetailRow
              label="Time"
              value={`${target.startTime || "—"} – ${target.endTime || "—"}`}
            />
            <DetailRow label="Department" value={target.department} />
            <DetailRow label="Audit Type" value={target.auditType || "—"} />
            <DetailRow
              label="Audit Elements"
              value={target.auditElements?.join(", ") || "—"}
            />
            <DetailRow label="Auditor" value={target.auditorName || "—"} />
            <DetailRow
              label="Co-Auditors"
              value={target.coAuditorNames?.join(", ") || "—"}
            />
            <DetailRow
              label="Auditees"
              value={
                target.auditeeNames?.join(", ") || target.auditeeName || "—"
              }
            />
          </ScrollView>
          <View style={modalStyles.footer}>
            <SecondaryButton title="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};
