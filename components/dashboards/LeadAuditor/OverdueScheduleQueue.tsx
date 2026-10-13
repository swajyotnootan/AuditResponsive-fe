// app/components/dashboards/LeadAuditor/OverdueScheduleQueue.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Search,
  X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  useWindowDimensions } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1F2937",
  textMuted: "#6B7280",
  accent: "#3B82F6",
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
  purpleBorder: "#DDD6FE" };

const TIME_OPTIONS = [
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

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface DailyScheduleDto {
  id: number;
  planYear: number;
  month: string;
  department: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  auditorId?: number;
  auditorName?: string;
  coAuditorIds?: string;
  coAuditorIdList?: number[];
  coAuditorNames?: string[];
  auditeeId?: number;
  auditeeName?: string;
  auditeeIds?: string;
  auditeeIdList?: number[];
  auditeeNames?: string[];
  auditees?: string[];
  auditElements?: string[];
  detailedApprovalStatus?: string;
  auditType?: string;
  plantId?: number;
  plantName?: string;
  status?: string;
  rescheduleRequested?: boolean;
  extensionRequested?: boolean;
  requestedNewDate?: string;
  requestedNewStartTime?: string;
  requestedNewEndTime?: string;
  requestedNewToDate?: string;
  rescheduleReason?: string;
  extensionReason?: string;
  toDate?: string;
  leadAuditorId?: number;
  leadAuditorName?: string;
  hasWorkStarted?: boolean;
  workStartedAt?: string;
  completedForms?: number;
  totalForms?: number;
  pendingForms?: number;
}

interface ScheduleUser {
  id: number;
  firstName: string;
  lastName: string;
  role?: string;
  department?: string;
  plantId?: number;
}

interface DayGroup {
  date: string;
  schedules: DailyScheduleDto[];
}

interface MonthGroup {
  month: string;
  year: number;
  days: DayGroup[];
  total: number;
}

interface WeekTeamInfo {
  teamAuditorIds: number[];
  teamAuditorNames: string[];
  auditeeIds: number[];
  auditeeNames: string[];
}

interface Props {
  selectedYear: number;
  onCountChange?: (count: number) => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const monthOrder = (m: string) => {
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

const extractData = (response: any) => {
  if (Array.isArray(response)) return response;
  return response?.data !== undefined ? response.data : response;
};

const toNumArray = (raw: any): number[] => {
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

const normalizeNames = (raw: any): string[] => {
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

// ─────────────────────────────────────────────────────────────
// HELPERS — overdue check
// ─────────────────────────────────────────────────────────────

const hasEnded = (s: any): boolean => {
  // Compute "today" in the browser's local timezone (avoids UTC drift)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const scheduled = String(s.scheduledDate || "").slice(0, 10);

  // ✅ If an extension moved toDate to the future → not ended
  if (s.toDate) {
    const toDateStr = String(s.toDate).slice(0, 10);
    if (toDateStr > todayStr) return false;
    if (toDateStr < todayStr) return true;
  }

  // Past date → ended
  if (scheduled && scheduled < todayStr) return true;

  // Future date → not ended
  if (scheduled && scheduled > todayStr) return false;

  // Same-day → compare endTime with current time
  if (scheduled === todayStr) {
    const raw = String(s.endTime || "").trim();
    if (!raw) return false; // no end time → safer to treat as still active

    // Flexible parse: "10:00 AM" | "10:00AM" | "10:00 am" | "22:00"
    const match = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!match) {
      console.warn("⚠️ Could not parse endTime:", raw);
      return false;
    }

    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const mod = (match[3] || "").toUpperCase();

    if (mod === "PM" && h !== 12) h += 12;
    if (mod === "AM" && h === 12) h = 0;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = h * 60 + m;

    // Small 1-minute grace period
    return nowMinutes >= endMinutes + 1;
  }

  return false;
};

const getWeekNumber = (dateStr: string): string => {
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

const convertToMinutes = (timeStr: string): number => {
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

const getLocalDateString = (dateInput: any): string => {
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

const parseDateSafe = (dateStr: string): Date => {
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

const departmentDisplayToEnum: Record<string, string> = {
  HR: "HR",
  "R&D": "ENGG",
  Purchase: "PURCHASE",
  RMS: "STORES_DESPATCH",
  SQA: "QA",
  PPC: "PPC",
  Production: "PRODUCTION",
  "QA/QC": "QA",
  FGS: "STORES_DESPATCH",
  Marketing: "MARKETING",
  "IMS (BE)": "MR",
  Maintenance: "PLANT_MAINTENANCE",
  Management: "UNIT_HEAD",
  "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE",
  "Stores & Despatch": "STORES_DESPATCH" };

// ═════════════════════════════════════════════════════════════
// DATE PICKER FIELD
// ═════════════════════════════════════════════════════════════
const DatePickerField = ({
  label,
  value,
  onChange,
  error }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(parseDateSafe(value));

  useEffect(() => {
    if (value) setTempDate(parseDateSafe(value));
  }, [value]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(getLocalDateString(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
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
          marginBottom: 4 }}
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
            borderColor: error ? COLORS.error : COLORS.border,
            borderRadius: 10 }}
        >
          <Calendar size={16} color="#64748b" />
          {/* @ts-ignore */}
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: value ? "#1F2937" : "#9CA3AF",
              fontSize: 13,
              padding: 0,
              marginLeft: 8,
              fontFamily: "inherit",
              cursor: "pointer" }}
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
              borderColor: error ? COLORS.error : COLORS.border,
              borderRadius: 10 }}
          >
            <Text
              style={{
                fontSize: 13,
                color: value ? "#1F2937" : "#9CA3AF" }}
            >
              {value || "Select Date"}
            </Text>
            <Calendar size={16} color="#64748b" />
          </TouchableOpacity>

          {Platform.OS === "ios" && showPicker && (
            <Modal transparent animationType="slide" visible={showPicker}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15,23,42,0.6)",
                  justifyContent: "flex-end" }}
              >
                <View
                  style={{
                    backgroundColor: "#FFF",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 16,
                    paddingBottom: 30 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 10 }}
                  >
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text
                        style={{
                          fontSize: 15,
                          color: "#EF4444",
                          fontWeight: "500" }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#1F2937" }}
                    >
                      Select Date
                    </Text>
                    <TouchableOpacity onPress={handleConfirm}>
                      <Text
                        style={{
                          fontSize: 15,
                          color: "#2563EB",
                          fontWeight: "700" }}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
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
              onChange={onDateChange}
            />
          )}
        </>
      )}
      {error ? (
        <Text style={{ fontSize: 11, color: COLORS.error, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

// ═════════════════════════════════════════════════════════════
// TIME PICKER FIELD
// ═════════════════════════════════════════════════════════════
const TimePickerField = ({
  label,
  value,
  onChange,
  options = TIME_OPTIONS,
  disabled }: {
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
          marginBottom: 4 }}
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
          backgroundColor: disabled ? "#F1F5F9" : "#FFF",
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10 }}
      >
        <Text
          style={{
            fontSize: 13,
            color: disabled ? "#94a3b8" : value ? "#1F2937" : "#9CA3AF" }}
        >
          {value || "Select Time"}
        </Text>
        <Clock size={16} color={disabled ? "#94a3b8" : "#64748b"} />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,42,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20 }}
        >
          <View
            style={{
              width: "70%",
              maxWidth: 320,
              maxHeight: "50%",
              backgroundColor: "#FFF",
              borderRadius: 16,
              overflow: "hidden" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "#2563EB" }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#FFF" }}
              >
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
                      backgroundColor: isSelected ? "#EFF6FF" : "#FFF",
                      borderWidth: 1,
                      borderColor: isSelected ? "#DBEAFE" : "#F1F5F9" }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10 }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: isSelected ? "#3B82F6" : "#CBD5E1" }}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected ? "#1D4ED8" : "#334155" }}
                      >
                        {item}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle size={16} color="#2563EB" />}
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

// ─────────────────────────────────────────────────────────────
// MULTI-SELECT MODAL
// ─────────────────────────────────────────────────────────────
const MultiSelectModal = ({
  isOpen,
  onClose,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  emptyMsg,
  title,
  loading }: any) => {
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
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/40 p-4"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {selectedIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-gray-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>

            {safeOptions.length > 0 && (
              <View className="flex-row gap-2 border-b border-gray-200 p-2">
                <TouchableOpacity
                  onPress={onSelectAll}
                  className="flex-1 items-center rounded-md bg-blue-50 py-2"
                >
                  <Text className="text-xs font-semibold text-blue-600">
                    Select All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClearAll}
                  className="flex-1 items-center rounded-md bg-blue-50 py-2"
                >
                  <Text className="text-xs font-semibold text-blue-600">
                    Clear All
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {loading ? (
                <View className="items-center p-6">
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text className="mt-2 text-[13px] text-gray-500">
                    Loading...
                  </Text>
                </View>
              ) : filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-gray-500">{emptyMsg}</Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = item.id.toString();
                  const checked = selectedIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => onToggle(item)}
                      className={`mb-1 flex-row items-center gap-3 rounded-lg p-3 ${
                        checked ? "bg-blue-50" : ""
                      }`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                          checked
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {checked && <Check size={14} color="#FFF" />}
                      </View>
                      <Text
                        className={`flex-1 text-[13px] ${
                          checked
                            ? "font-semibold text-blue-600"
                            : "text-gray-900"
                        }`}
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

            <View className="flex-row justify-end border-t border-gray-200 bg-gray-50 p-4">
              <TouchableOpacity
                onPress={onClose}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5"
              >
                <Text className="text-sm font-semibold text-gray-900">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Derive the 3-letter month abbrev from a YYYY-MM-DD string
// ─────────────────────────────────────────────────────────────
const MONTH_ABBRS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const monthAbbrFromDate = (dateStr?: string): string | null => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mm = parseInt(m[2], 10); // 1-12
  if (mm < 1 || mm > 12) return null;
  return MONTH_ABBRS[mm - 1];
};

const yearFromDate = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isNaN(y) ? null : y;
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const OverdueScheduleQueue: React.FC<Props> = ({
  selectedYear,
  onCountChange }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [submitting, setSubmitting] = useState(false);
  const [overdueSchedules, setOverdueSchedules] = useState<DailyScheduleDto[]>(
    [],
  );
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [detailSchedule, setDetailSchedule] = useState<DailyScheduleDto | null>(
    null,
  );

  // ─── LA direct Assign modal state ───
  const [laAssignTarget, setLaAssignTarget] = useState<DailyScheduleDto | null>(
    null,
  );
  const [laAssignMode, setLaAssignMode] = useState<"RESCHEDULE" | "EXTEND">(
    "RESCHEDULE",
  );
  const [laAssignModeHint, setLaAssignModeHint] = useState<string>("");
  const [laAssignDate, setLaAssignDate] = useState("");
  const [laAssignStart, setLaAssignStart] = useState("");
  const [laAssignEnd, setLaAssignEnd] = useState("");
  const [laAssignEndDate, setLaAssignEndDate] = useState("");
  const [laAssignReason, setLaAssignReason] = useState("");
  const [laAssignComment, setLaAssignComment] = useState("");

  const [laAssignShowReassign, setLaAssignShowReassign] = useState(false);
  const [laAssignSelectedAuditorId, setLaAssignSelectedAuditorId] =
    useState<string>("");
  const [laAssignShowCoAuditor, setLaAssignShowCoAuditor] = useState(false);
  const [laAssignAdditionalAuditorIds, setLaAssignAdditionalAuditorIds] =
    useState<string[]>([]);
  const [laAssignAuditors, setLaAssignAuditors] = useState<ScheduleUser[]>([]);
  const [laAssignTeamInfo, setLaAssignTeamInfo] = useState<{
    teamAuditorIds: number[];
    teamAuditorNames: string[];
    leadAuditorName: string | null;
  }>({ teamAuditorIds: [], teamAuditorNames: [], leadAuditorName: null });
  const [laAssignLoadingTeam, setLaAssignLoadingTeam] = useState(false);
  const [laAssignConflictWarning, setLaAssignConflictWarning] =
    useState<any>(null);
  const [laAssignCheckingAvailability, setLaAssignCheckingAvailability] =
    useState(false);

  // ─── Request Review flow ───
  const [requestPreviewTarget, setRequestPreviewTarget] =
    useState<DailyScheduleDto | null>(null);
  const [requestApprovalTarget, setRequestApprovalTarget] =
    useState<DailyScheduleDto | null>(null);
  const [requestRejectionTarget, setRequestRejectionTarget] =
    useState<DailyScheduleDto | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalAuditors, setApprovalAuditors] = useState<ScheduleUser[]>([]);
  const [teamInfo, setTeamInfo] = useState<{
    teamAuditorIds: number[];
    teamAuditorNames: string[];
    leadAuditorName: string | null;
  }>({ teamAuditorIds: [], teamAuditorNames: [], leadAuditorName: null });
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] =
    useState<string>("");
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState<string[]>(
    [],
  );
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [laOverrideNewDate, setLaOverrideNewDate] = useState("");
  const [laOverrideNewStart, setLaOverrideNewStart] = useState("");
  const [laOverrideNewEnd, setLaOverrideNewEnd] = useState("");
  const [laOverrideNewEndDate, setLaOverrideNewEndDate] = useState("");

  // ─────────── Fetch overdue ───────────
  const fetchOverdue = useCallback(async () => {
    if (!user?.id) return;
    setOverdueLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/overdue-schedules/${selectedYear}`,
        {
          params: { userId: user.id } },
      );

      const raw = Array.isArray(res.data) ? res.data : [];

      const data: DailyScheduleDto[] = raw.map((row: any) => ({
        ...row,
        coAuditorIdList: toNumArray(row.coAuditorIdList ?? row.coAuditorIds),
        coAuditorNames: normalizeNames(row.coAuditorNames),
        auditeeIdList: toNumArray(row.auditeeIdList ?? row.auditeeIds),
        auditeeNames: normalizeNames(row.auditeeNames),
        rescheduleRequested: row.rescheduleRequested === true,
        extensionRequested: row.extensionRequested === true }));

      // ✅ NEW: drop today's schedules whose end time hasn't passed yet
      const trulyOverdue = data.filter((s) => hasEnded(s));

      setOverdueSchedules(trulyOverdue);

      // Expand first month by default
      if (trulyOverdue.length > 0 && expandedMonths.size === 0) {
        setExpandedMonths(new Set([trulyOverdue[0].month]));
      }

      // Notify parent of count (used by the tab badge)
      if (onCountChange) onCountChange(trulyOverdue.length);
    } catch (error: any) {
      console.error("Failed to fetch overdue schedules:", error);
      addToast("Failed to load overdue schedules", "error");
      setOverdueSchedules([]);
      if (onCountChange) onCountChange(0);
    } finally {
      setOverdueLoading(false);
    }
  }, [selectedYear, addToast, user?.id, expandedMonths.size, onCountChange]);

  useEffect(() => {
    fetchOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, user?.id]);

  const groupedByMonth: MonthGroup[] = useMemo(() => {
    const monthMap = new Map<string, Map<string, DailyScheduleDto[]>>();
    for (const s of overdueSchedules) {
      const dateKey = s.scheduledDate || "unknown";
      if (!monthMap.has(s.month)) monthMap.set(s.month, new Map());
      const dayMap = monthMap.get(s.month)!;
      if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
      dayMap.get(dateKey)!.push(s);
    }

    const groups: MonthGroup[] = [];
    for (const [month, dayMap] of monthMap.entries()) {
      const days: DayGroup[] = Array.from(dayMap.entries())
        .map(([date, list]) => ({ date, schedules: list }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const total = days.reduce((sum, d) => sum + d.schedules.length, 0);
      groups.push({
        month,
        year: days[0]?.schedules[0]?.planYear || selectedYear,
        days,
        total });
    }
    return groups.sort((a, b) => monthOrder(a.month) - monthOrder(b.month));
  }, [overdueSchedules, selectedYear]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════
  // LA DIRECT ASSIGN — smart default based on work status
  // ═══════════════════════════════════════════════════════════

  const openLAAssignModal = async (s: DailyScheduleDto) => {
    setLaAssignTarget(s);

    const statusUpper = (s.status || "").toUpperCase();
    const hasStartedWork =
      statusUpper === "IN_PROGRESS" ||
      s.hasWorkStarted === true ||
      (s.completedForms ?? 0) > 0;

    if (hasStartedWork) {
      setLaAssignMode("EXTEND");
      setLaAssignModeHint(
        s.completedForms && s.totalForms
          ? `Auditor has already completed ${s.completedForms}/${s.totalForms} form(s). Extending keeps existing submissions intact.`
          : "Auditor has already started this audit. Extending keeps existing form submissions intact.",
      );
    } else {
      setLaAssignMode("RESCHEDULE");
      setLaAssignModeHint(
        "No work has been done on this audit yet. Reschedule the whole audit to a new date.",
      );
    }

    setLaAssignDate("");
    setLaAssignStart(s.startTime || "09:00 AM");
    setLaAssignEnd(s.endTime || "10:00 AM");

    if (hasStartedWork && s.scheduledDate) {
      try {
        const d = new Date(s.scheduledDate);
        d.setDate(d.getDate() + 7);
        setLaAssignEndDate(getLocalDateString(d));
      } catch {
        setLaAssignEndDate("");
      }
    } else {
      setLaAssignEndDate("");
    }

    setLaAssignReason("");
    setLaAssignComment("");

    setLaAssignShowReassign(false);
    setLaAssignSelectedAuditorId("");
    setLaAssignShowCoAuditor(false);
    setLaAssignAdditionalAuditorIds([]);
    setLaAssignConflictWarning(null);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null });

    await fetchAuditorsForAssign(s);
  };

  const closeLAAssignModal = () => {
    setLaAssignTarget(null);
    setLaAssignMode("RESCHEDULE");
    setLaAssignModeHint("");
    setLaAssignDate("");
    setLaAssignStart("");
    setLaAssignEnd("");
    setLaAssignEndDate("");
    setLaAssignReason("");
    setLaAssignComment("");
    setLaAssignShowReassign(false);
    setLaAssignSelectedAuditorId("");
    setLaAssignShowCoAuditor(false);
    setLaAssignAdditionalAuditorIds([]);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null });
    setLaAssignConflictWarning(null);
  };

  const fetchWeekTeamForDailySchedule = useCallback(
    async (schedule: DailyScheduleDto): Promise<WeekTeamInfo> => {
      const empty: WeekTeamInfo = {
        teamAuditorIds: [],
        teamAuditorNames: [],
        auditeeIds: [],
        auditeeNames: [] };

      if (!user?.id) return empty;

      const weekNum = getWeekNumber(schedule.scheduledDate || "");
      const month = schedule.month;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/year/${selectedYear}/month/${month}`,
          { params: { userId: user.id } },
        );

        const raw = extractData(res);
        const weekSchedules: any[] = Array.isArray(raw) ? raw : [];

        const matched = weekSchedules.find(
          (s: any) =>
            s.department === schedule.department &&
            (s.week || "") === weekNum &&
            s.approvalStatus === "APPROVED",
        );

        if (!matched) return empty;

        let teamIds: number[] = [];
        if (matched.teamAuditorIds)
          teamIds = toNumArray(matched.teamAuditorIds);
        if (teamIds.length === 0 && matched.coAuditorIds)
          teamIds = toNumArray(matched.coAuditorIds);

        const primaryId = matched.auditorId ?? matched.leadAuditorId ?? null;
        if (primaryId != null) {
          const pid = Number(primaryId);
          if (!isNaN(pid) && !teamIds.includes(pid)) teamIds.unshift(pid);
        }

        let teamNames: string[] = [];
        if (matched.coAuditorNames)
          teamNames = normalizeNames(matched.coAuditorNames);
        if (teamNames.length === 0 && matched.teamAuditorNames)
          teamNames = normalizeNames(matched.teamAuditorNames);
        const primaryName =
          matched.auditorName ?? matched.leadAuditorName ?? null;
        if (
          primaryName &&
          typeof primaryName === "string" &&
          primaryName.trim() &&
          !teamNames.includes(primaryName.trim())
        ) {
          teamNames.unshift(primaryName.trim());
        }

        let audIds: number[] = [];
        if (matched.auditeeIds) audIds = toNumArray(matched.auditeeIds);
        else if (matched.auditeeIdList)
          audIds = toNumArray(matched.auditeeIdList);

        let audNames: string[] = [];
        if (matched.auditeeNames)
          audNames = normalizeNames(matched.auditeeNames);

        return {
          teamAuditorIds: teamIds,
          teamAuditorNames: teamNames,
          auditeeIds: audIds,
          auditeeNames: audNames };
      } catch (err) {
        console.error("❌ [fetchWeekTeam] failed:", err);
        return empty;
      }
    },
    [user, selectedYear],
  );

  const fetchAuditorsForAssign = async (target: DailyScheduleDto) => {
    setLaAssignLoadingTeam(true);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null });

    try {
      const weekTeam = await fetchWeekTeamForDailySchedule(target);
      let pool: ScheduleUser[] = [];

      if (weekTeam.teamAuditorIds.length > 0) {
        const usersRes = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/users/by-ids`,
          {
            params: { ids: weekTeam.teamAuditorIds },
            paramsSerializer: { indexes: null } },
        );
        const users = extractData(usersRes) || [];
        const byId = new Map<number, ScheduleUser>();
        for (const u of users) byId.set(Number((u as any).id), u);
        for (const id of weekTeam.teamAuditorIds) {
          const u = byId.get(id);
          if (u) pool.push(u);
          else {
            const name =
              weekTeam.teamAuditorNames[weekTeam.teamAuditorIds.indexOf(id)] ||
              `Auditor ${id}`;
            const parts = name.trim().split(/\s+/);
            pool.push({
              id,
              firstName: parts[0] || "Auditor",
              lastName: parts.slice(1).join(" ") || String(id),
              role: "AUDITOR" });
          }
        }
      } else {
        const dept = target.department;
        const enumDept = departmentDisplayToEnum[dept] || dept;
        const res = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
          {},
        );
        const raw = extractData(res);
        pool = Array.isArray(raw) ? raw : [];
      }

      const leadId = (target as any).leadAuditorId ?? target.auditorId;
      const leadName =
        (target as any).leadAuditorName ?? target.auditorName ?? null;

      setLaAssignAuditors(pool);
      setLaAssignTeamInfo({
        teamAuditorIds: pool.map((a) => Number(a.id)),
        teamAuditorNames: pool.map((a) => `${a.firstName} ${a.lastName}`),
        leadAuditorName: leadName });
    } catch (err) {
      console.error("❌ [fetchAuditorsForAssign] failed:", err);
    } finally {
      setLaAssignLoadingTeam(false);
    }
  };

  const checkConflictsForAssign = async (
    auditorId: string | number,
    isReassign = false,
  ) => {
    const target = laAssignTarget;
    if (!target || !auditorId) return;

    // ✅ 1. Compute the EFFECTIVE slot the LA is trying to assign
    let checkDate = target.scheduledDate || "";
    let checkStart = target.startTime || "";
    let checkEnd = target.endTime || "";

    if (laAssignMode === "RESCHEDULE") {
      // Use the LA's new date/time if provided; otherwise fall back to original
      checkDate = laAssignDate || target.scheduledDate || "";
      checkStart = laAssignStart || target.startTime || "";
      checkEnd = laAssignEnd || target.endTime || "";
    } else {
      // EXTEND keeps the original start date/time
      checkDate = target.scheduledDate || "";
      checkStart = target.startTime || "";
      checkEnd = target.endTime || "";
    }

    if (!checkDate || !checkStart || !checkEnd) {
      setLaAssignConflictWarning(null);
      return;
    }

    // ✅ 2. Derive the month/year from the EFFECTIVE date (not target.month)
    const checkMonth = monthAbbrFromDate(checkDate) || target.month;
    const checkYear =
      yearFromDate(checkDate) || target.planYear || selectedYear;

    setLaAssignCheckingAvailability(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/date-schedules/${checkYear}/${checkMonth}?userId=${user?.id}`,
        {},
      );
      const dayList = extractData(res) || [];
      const sameDay = (Array.isArray(dayList) ? dayList : []).filter(
        (s: any) => String(s.scheduledDate || "").slice(0, 10) === checkDate,
      );

      // ✅ 3. Overlap test uses the EFFECTIVE slot, not target.startTime/endTime
      const s1S = convertToMinutes(checkStart);
      const s1E = convertToMinutes(checkEnd);

      const conflict = sameDay.find((s: any) => {
        if (Number(s.auditorId) !== Number(auditorId)) return false;
        if (Number(s.id) === Number(target.id)) return false; // exclude self
        const s2S = convertToMinutes(s.startTime || "");
        const s2E = convertToMinutes(s.endTime || "");
        return s1S < s2E && s1E > s2S;
      });

      if (conflict) {
        const auditor = laAssignAuditors.find(
          (a) => Number(a.id) === Number(auditorId),
        );
        setLaAssignConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: auditor
            ? `${auditor.firstName} ${auditor.lastName}`
            : "Unknown",
          // ✅ Extra info for the UI (optional, but useful for debugging)
          conflictDate: checkDate,
          conflictStart: checkStart,
          conflictEnd: checkEnd });
      } else {
        setLaAssignConflictWarning(null);
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
      setLaAssignConflictWarning(null);
    } finally {
      setLaAssignCheckingAvailability(false);
    }
  };

  // ✅ Re-run conflict check whenever the LA changes the effective slot
  // while an auditor is already selected.
  useEffect(() => {
    if (!laAssignTarget) return;
    if (laAssignShowReassign && laAssignSelectedAuditorId) {
      checkConflictsForAssign(laAssignSelectedAuditorId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    laAssignTarget?.id,
    laAssignMode,
    laAssignDate,
    laAssignStart,
    laAssignEnd,
    laAssignEndDate,
  ]);

  useEffect(() => {
    if (!laAssignTarget) return;
    if (laAssignAdditionalAuditorIds.length === 0) return;
    const lastId =
      laAssignAdditionalAuditorIds[laAssignAdditionalAuditorIds.length - 1];
    if (lastId) checkConflictsForAssign(lastId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    laAssignTarget?.id,
    laAssignMode,
    laAssignDate,
    laAssignStart,
    laAssignEnd,
    laAssignEndDate,
  ]);

  const handleLAAssign = async () => {
    if (!laAssignTarget || !user?.id) return;

    if (!laAssignReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }

    if (laAssignMode === "RESCHEDULE") {
      if (!laAssignDate || !laAssignStart || !laAssignEnd) {
        addToast("Please fill date, start time and end time", "error");
        return;
      }
      if (convertToMinutes(laAssignStart) >= convertToMinutes(laAssignEnd)) {
        addToast("End time must be after start time", "error");
        return;
      }
    } else {
      if (!laAssignEndDate) {
        addToast("Please select a new end date", "error");
        return;
      }
    }

    if (laAssignShowReassign && !laAssignSelectedAuditorId) {
      addToast("Please select a replacement auditor", "error");
      return;
    }

    setSubmitting(true);
    try {
      const reassignBody = {
        reassignToAuditorId: laAssignShowReassign
          ? Number(laAssignSelectedAuditorId) || null
          : null,
        additionalAuditorIds: laAssignShowCoAuditor
          ? laAssignAdditionalAuditorIds.map((x) => Number(x))
          : [],
        keepOriginalAuditor: laAssignShowCoAuditor && !laAssignShowReassign,
        comments: laAssignComment };

      if (laAssignMode === "RESCHEDULE") {
        await axios.post(
          `${API_BASE_URL}/api/audit-schedule/schedule/${laAssignTarget.id}/la-reschedule?userId=${user.id}`,
          {
            newDate: laAssignDate,
            newStartTime: laAssignStart,
            newEndTime: laAssignEnd,
            reason: laAssignReason,
            ...reassignBody },
          {},
        );
        addToast(
          `Assigned: ${laAssignTarget.department} → ${laAssignDate}`,
          "success",
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/audit-schedule/schedule/${laAssignTarget.id}/la-extend?userId=${user.id}`,
          {
            newEndDate: laAssignEndDate,
            reason: laAssignReason,
            ...reassignBody },
          {},
        );
        addToast(
          `Assigned: ${laAssignTarget.department} → ${laAssignEndDate}`,
          "success",
        );
      }

      closeLAAssignModal();
      fetchOverdue();
    } catch (error: any) {
      addToast(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to assign",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // REQUEST REVIEW (Approve/Reject) flow
  // ═══════════════════════════════════════════════════════════

  const fetchDepartmentTeamForRequest = useCallback(
    async (target: DailyScheduleDto) => {
      setLoadingTeamMembers(true);
      setApprovalAuditors([]);
      setTeamInfo({
        teamAuditorIds: [],
        teamAuditorNames: [],
        leadAuditorName: null });

      try {
        const dept = target.department;
        const enumDept = departmentDisplayToEnum[dept] || dept;

        const weekTeam = await fetchWeekTeamForDailySchedule(target);
        let pool: ScheduleUser[] = [];

        if (weekTeam.teamAuditorIds.length > 0) {
          const usersRes = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/users/by-ids`,
            {
              params: { ids: weekTeam.teamAuditorIds },
              paramsSerializer: { indexes: null } },
          );
          const users = extractData(usersRes) || [];
          const byId = new Map<number, ScheduleUser>();
          for (const u of users) byId.set(Number((u as any).id), u);
          for (const id of weekTeam.teamAuditorIds) {
            const u = byId.get(id);
            if (u) pool.push(u);
            else {
              const name =
                weekTeam.teamAuditorNames[
                  weekTeam.teamAuditorIds.indexOf(id)
                ] || `Auditor ${id}`;
              const parts = name.trim().split(/\s+/);
              pool.push({
                id,
                firstName: parts[0] || "Auditor",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITOR" });
            }
          }
        } else {
          const res = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
            {},
          );
          const raw = extractData(res);
          pool = Array.isArray(raw) ? raw : [];
        }

        const leadId = (target as any).leadAuditorId ?? target.auditorId;
        const leadName =
          (target as any).leadAuditorName ?? target.auditorName ?? null;
        const teamIds = pool
          .map((a) => Number(a.id))
          .filter((id) => !Number.isNaN(id) && id !== Number(leadId));

        setApprovalAuditors(pool);
        setTeamInfo({
          teamAuditorIds: teamIds,
          teamAuditorNames: pool.map((a) => `${a.firstName} ${a.lastName}`),
          leadAuditorName: leadName });
      } catch (err) {
        console.error("❌ [fetchDepartmentTeamForRequest] failed:", err);
      } finally {
        setLoadingTeamMembers(false);
      }
    },
    [fetchWeekTeamForDailySchedule],
  );

  const checkConflictsForReassign = async (
    auditorId: string | number,
    isReassign = false,
  ) => {
    const target = requestApprovalTarget;
    if (!target || !auditorId) return;

    const isReschedule = target.rescheduleRequested === true;

    // ✅ Compute effective slot
    let checkDate = target.scheduledDate || "";
    let checkStart = target.startTime || "";
    let checkEnd = target.endTime || "";

    if (isReschedule) {
      checkDate = laOverrideNewDate || target.scheduledDate || "";
      checkStart = laOverrideNewStart || target.startTime || "";
      checkEnd = laOverrideNewEnd || target.endTime || "";
    } else {
      // Extension — start date/time unchanged
      checkDate = target.scheduledDate || "";
      checkStart = target.startTime || "";
      checkEnd = target.endTime || "";
    }

    if (!checkDate || !checkStart || !checkEnd) {
      setConflictWarning(null);
      return;
    }

    const checkMonth = monthAbbrFromDate(checkDate) || target.month;
    const checkYear =
      yearFromDate(checkDate) || target.planYear || selectedYear;

    setCheckingAvailability(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/date-schedules/${checkYear}/${checkMonth}?userId=${user?.id}`,
        {},
      );
      const dayList = extractData(res) || [];
      const sameDay = (Array.isArray(dayList) ? dayList : []).filter(
        (s: any) => String(s.scheduledDate || "").slice(0, 10) === checkDate,
      );

      const s1S = convertToMinutes(checkStart);
      const s1E = convertToMinutes(checkEnd);

      const conflict = sameDay.find((s: any) => {
        if (Number(s.auditorId) !== Number(auditorId)) return false;
        if (Number(s.id) === Number(target.id)) return false;
        const s2S = convertToMinutes(s.startTime || "");
        const s2E = convertToMinutes(s.endTime || "");
        return s1S < s2E && s1E > s2S;
      });

      if (conflict) {
        const auditor = approvalAuditors.find(
          (a) => Number(a.id) === Number(auditorId),
        );
        setConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: auditor
            ? `${auditor.firstName} ${auditor.lastName}`
            : "Unknown",
          conflictDate: checkDate,
          conflictStart: checkStart,
          conflictEnd: checkEnd });
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
      setConflictWarning(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  // ✅ Re-run the request-flow conflict check whenever the LA edits overrides
  useEffect(() => {
    if (!requestApprovalTarget) return;

    if (showReassignOptions && selectedReassignAuditorId) {
      checkConflictsForReassign(selectedReassignAuditorId, true);
    }
    if (showAddAnotherAuditor && additionalAuditorIds.length > 0) {
      additionalAuditorIds.forEach((id) =>
        checkConflictsForReassign(id, false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    requestApprovalTarget?.id,
    laOverrideNewDate,
    laOverrideNewStart,
    laOverrideNewEnd,
    laOverrideNewEndDate,
  ]);

  const openRequestPreview = (s: DailyScheduleDto) => {
    setRequestPreviewTarget(s);
    fetchDepartmentTeamForRequest(s);

    setLaOverrideNewDate(s.requestedNewDate || "");
    setLaOverrideNewStart(s.requestedNewStartTime || "");
    setLaOverrideNewEnd(s.requestedNewEndTime || "");
    setLaOverrideNewEndDate(s.requestedNewToDate || "");
  };

  const closeRequestFlow = () => {
    setRequestPreviewTarget(null);
    setRequestApprovalTarget(null);
    setRequestRejectionTarget(null);
    setApprovalComment("");
    setRejectionReason("");
    setShowReassignOptions(false);
    setSelectedReassignAuditorId("");
    setShowAddAnotherAuditor(false);
    setAdditionalAuditorIds([]);
    setConflictWarning(null);
    setTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null });
    setApprovalAuditors([]);
    setLaOverrideNewDate("");
    setLaOverrideNewStart("");
    setLaOverrideNewEnd("");
    setLaOverrideNewEndDate("");
  };

  const handleApproveRequest = async () => {
    const target = requestApprovalTarget;
    if (!target || !user?.id) return;

    const type = target.rescheduleRequested ? "RESCHEDULE" : "EXTENSION";
    const endpoint =
      type === "RESCHEDULE" ? "approve-reschedule" : "approve-extension";

    const body: any = {
      comments: approvalComment,
      reassignToAuditorId: showReassignOptions
        ? Number(selectedReassignAuditorId) || null
        : null,
      additionalAuditorIds: showAddAnotherAuditor
        ? additionalAuditorIds.map((x) => Number(x))
        : [],
      keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions };

    if (type === "RESCHEDULE") {
      if (laOverrideNewDate) body.newDate = laOverrideNewDate;
      if (laOverrideNewStart) body.newStartTime = laOverrideNewStart;
      if (laOverrideNewEnd) body.newEndTime = laOverrideNewEnd;
    } else {
      if (laOverrideNewEndDate) body.newEndDate = laOverrideNewEndDate;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/request/${target.id}/${endpoint}?userId=${user.id}`,
        body,
        {},
      );

      addToast(
        `${type === "RESCHEDULE" ? "Reschedule" : "Extension"} assigned for ${target.department}`,
        "success",
      );

      closeRequestFlow();
      fetchOverdue();
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to assign request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    const target = requestRejectionTarget;
    if (!target || !user?.id) return;

    if (!rejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }

    const type = target.rescheduleRequested ? "RESCHEDULE" : "EXTENSION";
    const endpoint =
      type === "RESCHEDULE" ? "reject-reschedule" : "reject-extension";

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/request/${target.id}/${endpoint}?userId=${user.id}`,
        { reason: rejectionReason },
        {},
      );

      addToast(
        `${type === "RESCHEDULE" ? "Reschedule" : "Extension"} rejected for ${target.department}`,
        "warning",
      );

      closeRequestFlow();
      fetchOverdue();
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to reject request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────── Render row ───────────
  const renderScheduleRow = (s: DailyScheduleDto) => {
    const status = (s.detailedApprovalStatus || "").toUpperCase();

    return (
      <View
        key={s.id}
        style={{
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          backgroundColor: "#FFFFFF" }}
      >
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: isDesktop ? 12 : 8,
            alignItems: isDesktop ? "center" : "flex-start" }}
        >
          <View style={{ flex: isDesktop ? 2 : undefined }}>
            <Text
              style={{ fontSize: 12, fontWeight: "700", color: COLORS.text }}
            >
              {s.scheduledDate || "—"}
            </Text>
            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
            >
              {s.startTime || "—"} – {s.endTime || "—"}
            </Text>
            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
            >
              {s.auditType || "—"}
            </Text>
          </View>

          <View style={{ flex: isDesktop ? 3 : undefined }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap" }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}
              >
                {s.department}
              </Text>

              {s.rescheduleRequested && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "#FEF3C7" }}
                >
                  <AlertCircle size={10} color="#92400E" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#92400E" }}
                  >
                    Reschedule Requested
                  </Text>
                </View>
              )}
              {s.extensionRequested && !s.rescheduleRequested && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "#FEF3C7" }}
                >
                  <AlertCircle size={10} color="#92400E" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#92400E" }}
                  >
                    Extension Requested
                  </Text>
                </View>
              )}
              {!s.rescheduleRequested && !s.extensionRequested && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: "#FEE2E2" }}
                >
                  <AlertCircle size={10} color="#991B1B" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#991B1B" }}
                  >
                    Overdue — No Request
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
            >
              Auditor: {s.auditorName || "—"}
            </Text>
            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
            >
              Auditees:{" "}
              {s.auditeeNames?.join(", ") ||
                s.auditeeName ||
                s.auditees?.join(", ") ||
                "—"}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 6,
              flexWrap: "wrap",
              flex: isDesktop ? 2 : undefined,
              justifyContent: isDesktop ? "flex-end" : "flex-start" }}
          >
            <ActionChip
              label="View"
              icon={<FileText size={12} color={COLORS.accent} />}
              borderColor={COLORS.accentBorder}
              bgColor={COLORS.accentLight}
              textColor={COLORS.accent}
              onPress={() => setDetailSchedule(s)}
            />

            {(s.rescheduleRequested || s.extensionRequested) && (
              <ActionChip
                label={
                  s.rescheduleRequested
                    ? "Review Reschedule"
                    : "Review Extension"
                }
                icon={<FileText size={12} color="#FFF" />}
                borderColor={COLORS.purple}
                bgColor={COLORS.purple}
                textColor="#FFF"
                onPress={() => openRequestPreview(s)}
              />
            )}

            {!s.rescheduleRequested && !s.extensionRequested && (
              <ActionChip
                label={
                  (s.status || "").toUpperCase() === "IN_PROGRESS" ||
                  s.hasWorkStarted === true ||
                  (s.completedForms ?? 0) > 0
                    ? "Extend"
                    : "Reschedule"
                }
                icon={<Calendar size={12} color="#FFF" />}
                borderColor={COLORS.success}
                bgColor={COLORS.success}
                textColor="#FFF"
                onPress={() => openLAAssignModal(s)}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (overdueLoading) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>
          Loading overdue schedules...
        </Text>
      </View>
    );
  }

  if (overdueSchedules.length === 0) {
    return (
      <View
        style={{
          padding: 60,
          alignItems: "center",
          backgroundColor: COLORS.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border }}
      >
        <CheckCircle size={48} color={COLORS.success} />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: COLORS.text,
            marginTop: 16 }}
        >
          No overdue schedules — great!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {groupedByMonth.map((group) => {
        const expanded = expandedMonths.has(group.month);
        const allDepts = new Set(
          group.days.flatMap((d) => d.schedules.map((s) => s.department)),
        );

        return (
          <View
            key={group.month}
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: "hidden" }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleMonth(group.month)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                backgroundColor: COLORS.purpleLight,
                borderBottomWidth: expanded ? 1 : 0,
                borderBottomColor: COLORS.purpleBorder }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "#FFF",
                    borderWidth: 1,
                    borderColor: COLORS.purpleBorder,
                    alignItems: "center",
                    justifyContent: "center" }}
                >
                  <Calendar size={18} color={COLORS.purple} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: COLORS.purple }}
                  >
                    {group.month} {group.year}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      marginTop: 2 }}
                  >
                    {group.total} schedule{group.total !== 1 ? "s" : ""} •{" "}
                    {group.days.length} day
                    {group.days.length !== 1 ? "s" : ""} • {allDepts.size} dept
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8 }}
              >
                {expanded ? (
                  <ChevronDown size={20} color={COLORS.purple} />
                ) : (
                  <ChevronRight size={20} color={COLORS.purple} />
                )}
              </View>
            </TouchableOpacity>

            {expanded &&
              group.days.map((day) => (
                <View key={day.date}>
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: "#F8FAFC",
                      borderTopWidth: 1,
                      borderTopColor: "#F1F5F9" }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: COLORS.textMuted,
                        textTransform: "uppercase" }}
                    >
                      {day.date} • {day.schedules.length} schedule
                      {day.schedules.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  {day.schedules.map(renderScheduleRow)}
                </View>
              ))}
          </View>
        );
      })}

      {/* ══════════ DETAIL MODAL ══════════ */}
      {detailSchedule && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDetailSchedule(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Daily Schedule Detail
                </Text>
                <TouchableOpacity onPress={() => setDetailSchedule(null)}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 500 }}>
                <DetailRow
                  label="Date"
                  value={detailSchedule.scheduledDate || "—"}
                />
                <DetailRow
                  label="Time"
                  value={`${detailSchedule.startTime || "—"} – ${
                    detailSchedule.endTime || "—"
                  }`}
                />
                <DetailRow
                  label="Department"
                  value={detailSchedule.department}
                />
                <DetailRow
                  label="Audit Type"
                  value={detailSchedule.auditType || "—"}
                />
                <DetailRow
                  label="Auditor"
                  value={detailSchedule.auditorName || "—"}
                />
                <DetailRow
                  label="Co-Auditors"
                  value={detailSchedule.coAuditorNames?.join(", ") || "—"}
                />
                <DetailRow
                  label="Auditees"
                  value={
                    detailSchedule.auditeeNames?.join(", ") ||
                    detailSchedule.auditeeName ||
                    "—"
                  }
                />
              </ScrollView>
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={() => setDetailSchedule(null)}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ LA DIRECT ASSIGN MODAL ══════════ */}
      {laAssignTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && closeLAAssignModal()}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.sheet, { maxWidth: 620 }]}>
              <View style={modalStyles.header}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: COLORS.successLight,
                      alignItems: "center",
                      justifyContent: "center" }}
                  >
                    <Calendar size={20} color={COLORS.success} />
                  </View>
                  <View>
                    <Text style={modalStyles.headerTitle}>
                      {laAssignMode === "EXTEND"
                        ? "Extend Overdue Schedule"
                        : "Reschedule Overdue Schedule"}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                      {laAssignMode === "EXTEND"
                        ? "Extend deadline to give auditor more time"
                        : "Move the whole audit to a new date"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={closeLAAssignModal}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 600, padding: 16 }}>
                {/* Audit info */}
                <View
                  style={{
                    padding: 14,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    marginBottom: 10 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 6 }}
                  >
                    Audit
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.text }}
                  >
                    {laAssignTarget.auditType || "Audit"} —{" "}
                    {laAssignTarget.department}
                  </Text>
                </View>

                {/* Requested changes card */}
                <View
                  style={{
                    padding: 14,
                    backgroundColor: COLORS.accentLight,
                    borderWidth: 1,
                    borderColor: COLORS.accentBorder,
                    borderRadius: 10,
                    marginBottom: 12 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10 }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: COLORS.accent }}
                    >
                      Requested Changes (LA Overrides)
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontStyle: "italic",
                        color: COLORS.textMuted }}
                    >
                      Editable by LA
                    </Text>
                  </View>

                  {/* Action banner */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      backgroundColor:
                        laAssignMode === "EXTEND" ? "#FFF7ED" : "#F0F9FF",
                      borderWidth: 1,
                      borderColor:
                        laAssignMode === "EXTEND" ? "#FED7AA" : "#BAE6FD",
                      borderRadius: 8,
                      marginBottom: 14 }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor:
                          laAssignMode === "EXTEND" ? "#FFEDD5" : "#E0F2FE",
                        alignItems: "center",
                        justifyContent: "center" }}
                    >
                      <Calendar
                        size={16}
                        color={
                          laAssignMode === "EXTEND" ? "#C2410C" : "#0369A1"
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color:
                            laAssignMode === "EXTEND" ? "#9A3412" : "#0C4A6E",
                          marginBottom: 2 }}
                      >
                        {laAssignMode === "EXTEND"
                          ? "Extend Deadline"
                          : "Reschedule Audit"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color:
                            laAssignMode === "EXTEND" ? "#9A3412" : "#0C4A6E",
                          lineHeight: 16 }}
                      >
                        {laAssignModeHint ||
                          (laAssignMode === "EXTEND"
                            ? "Work has already started on this audit. Extending keeps existing form submissions intact."
                            : "No work has been done on this audit yet. Pick a new date and time to move the whole audit.")}
                      </Text>
                    </View>
                  </View>

                  {/* Current */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                      Current
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.text,
                        marginTop: 2 }}
                    >
                      {laAssignTarget.scheduledDate} •{" "}
                      {laAssignTarget.startTime}
                    </Text>
                  </View>

                  {/* Fields */}
                  {laAssignMode === "RESCHEDULE" ? (
                    <>
                      <View style={{ marginBottom: 10 }}>
                        <DatePickerField
                          label="New Date"
                          value={laAssignDate}
                          onChange={setLaAssignDate}
                        />
                      </View>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <TimePickerField
                            label="Start Time"
                            value={laAssignStart}
                            onChange={setLaAssignStart}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TimePickerField
                            label="End Time"
                            value={laAssignEnd}
                            onChange={setLaAssignEnd}
                          />
                        </View>
                      </View>
                    </>
                  ) : (
                    <DatePickerField
                      label="New End Date"
                      value={laAssignEndDate}
                      onChange={setLaAssignEndDate}
                    />
                  )}
                </View>

                {/* Current auditor */}
                <View
                  style={{
                    padding: 14,
                    backgroundColor: COLORS.accentLight,
                    borderRadius: 10,
                    marginBottom: 10 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 6 }}
                  >
                    Current Auditor
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.text }}
                  >
                    {laAssignTarget.auditorName || "—"}
                  </Text>
                </View>

                {/* Team */}
                {!laAssignLoadingTeam &&
                  laAssignTeamInfo.teamAuditorNames.length > 0 && (
                    <View
                      style={{
                        padding: 14,
                        backgroundColor: COLORS.accentLight,
                        borderRadius: 10,
                        marginBottom: 10 }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.accent,
                          fontWeight: "700",
                          marginBottom: 6 }}
                      >
                        Assigned Audit Team
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.accent,
                          marginTop: 2 }}
                      >
                        👥 Team: {laAssignTeamInfo.teamAuditorNames.join(", ")}
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
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    marginBottom: 10 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setLaAssignShowReassign(!laAssignShowReassign);
                      if (laAssignShowReassign)
                        setLaAssignSelectedAuditorId("");
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: laAssignShowReassign
                        ? COLORS.accent
                        : COLORS.border,
                      backgroundColor: laAssignShowReassign
                        ? COLORS.accent
                        : "#FFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2 }}
                  >
                    {laAssignShowReassign && <Check size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.text }}
                    >
                      🔄 Reassign to different auditor
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                      Replace the current auditor with a new one
                    </Text>
                  </View>
                </View>

                {laAssignShowReassign && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      marginBottom: 10 }}
                  >
                    <Text style={modalStyles.sectionLabel}>
                      Select Primary Auditor *
                    </Text>
                    {laAssignLoadingTeam ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          overflow: "hidden",
                          backgroundColor: "#FFF" }}
                      >
                        <Picker
                          selectedValue={laAssignSelectedAuditorId}
                          onValueChange={(v: string) => {
                            setLaAssignSelectedAuditorId(v);
                            if (v) checkConflictsForAssign(v, true);
                          }}
                          style={{ height: 48, color: COLORS.text }}
                        >
                          <Picker.Item label="Select Auditor" value="" />
                          {laAssignAuditors
                            .filter((a) => {
                              const isCurrent =
                                String(a.id) ===
                                  String(laAssignTarget.auditorId) ||
                                `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                  (
                                    laAssignTarget.auditorName || ""
                                  ).toLowerCase();
                              return !isCurrent;
                            })
                            .map((a) => (
                              <Picker.Item
                                key={a.id}
                                label={`${a.firstName} ${a.lastName}`}
                                value={String(a.id)}
                              />
                            ))}
                        </Picker>
                      </View>
                    )}
                    {laAssignCheckingAvailability && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.accent,
                          marginTop: 6 }}
                      >
                        Checking availability...
                      </Text>
                    )}
                    {laAssignConflictWarning?.type === "reassign" && (
                      <View
                        style={{
                          padding: 10,
                          marginTop: 8,
                          backgroundColor: COLORS.errorLight,
                          borderWidth: 1,
                          borderColor: COLORS.errorBorder,
                          borderRadius: 8 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#991B1B" }}
                        >
                          ⚠️ Time conflict
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#991B1B",
                            marginTop: 2 }}
                        >
                          {laAssignConflictWarning.auditorName} is already
                          scheduled at this time.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Add co-auditor checkbox */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 12,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    marginBottom: 10 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setLaAssignShowCoAuditor(!laAssignShowCoAuditor);
                      if (laAssignShowCoAuditor)
                        setLaAssignAdditionalAuditorIds([]);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: laAssignShowCoAuditor
                        ? COLORS.accent
                        : COLORS.border,
                      backgroundColor: laAssignShowCoAuditor
                        ? COLORS.accent
                        : "#FFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2 }}
                  >
                    {laAssignShowCoAuditor && <Check size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.text }}
                    >
                      ➕ Add another auditor (Co-auditor)
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                      Add additional auditor without removing the primary one
                    </Text>
                  </View>
                </View>
                {laAssignShowCoAuditor && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      marginBottom: 10 }}
                  >
                    <Text style={modalStyles.sectionLabel}>
                      Select Additional Auditor(s)
                    </Text>
                    {laAssignLoadingTeam ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <ScrollView style={{ maxHeight: 160 }}>
                        {laAssignAuditors
                          .filter((a) => {
                            const isCurrent =
                              String(a.id) ===
                                String(laAssignTarget.auditorId) ||
                              `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                (
                                  laAssignTarget.auditorName || ""
                                ).toLowerCase();
                            if (isCurrent) return false;
                            if (
                              laAssignShowReassign &&
                              laAssignSelectedAuditorId &&
                              String(a.id) === laAssignSelectedAuditorId
                            )
                              return false;
                            if (
                              laAssignAdditionalAuditorIds.includes(
                                String(a.id),
                              )
                            )
                              return false;
                            return true;
                          })
                          .map((a) => (
                            <TouchableOpacity
                              key={a.id}
                              onPress={() => {
                                // ✅ correct setter and state
                                setLaAssignAdditionalAuditorIds([
                                  ...laAssignAdditionalAuditorIds,
                                  String(a.id),
                                ]);
                                // ✅ correct conflict checker for the LA Direct Assign modal
                                checkConflictsForAssign(a.id, false);
                              }}
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: 10,
                                backgroundColor: "#FFF",
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: COLORS.border,
                                marginBottom: 6 }}
                            >
                              <Text style={{ fontSize: 13 }}>
                                ✅ {a.firstName} {a.lastName}
                              </Text>
                              <Check size={16} color={COLORS.accent} />
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    )}

                    {laAssignConflictWarning?.type === "coauditor" && (
                      <View
                        style={{
                          padding: 10,
                          marginTop: 8,
                          backgroundColor: COLORS.warningLight,
                          borderWidth: 1,
                          borderColor: COLORS.warningBorder,
                          borderRadius: 8 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#92400E" }}
                        >
                          ⚠️ Potential conflict
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#92400E",
                            marginTop: 2 }}
                        >
                          {laAssignConflictWarning.auditorName} is already
                          scheduled at this time.
                        </Text>
                      </View>
                    )}

                    {laAssignAdditionalAuditorIds.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={modalStyles.sectionLabel}>
                          Selected Co-auditors
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6 }}
                        >
                          {laAssignAdditionalAuditorIds.map((id) => {
                            const a = laAssignAuditors.find(
                              (x) => String(x.id) === id,
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
                                  backgroundColor: COLORS.accentLight,
                                  borderWidth: 1,
                                  borderColor: COLORS.accentBorder }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: COLORS.accent,
                                    fontWeight: "600" }}
                                >
                                  {a.firstName} {a.lastName}
                                </Text>
                                <TouchableOpacity
                                  onPress={() =>
                                    setLaAssignAdditionalAuditorIds(
                                      laAssignAdditionalAuditorIds.filter(
                                        (x) => x !== id,
                                      ),
                                    )
                                  }
                                >
                                  <X size={13} color={COLORS.error} />
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
                  value={laAssignReason}
                  onChangeText={setLaAssignReason}
                  placeholder={
                    laAssignMode === "RESCHEDULE"
                      ? "Why are you rescheduling this overdue audit?"
                      : "Why does this audit need more time?"
                  }
                  placeholderTextColor="#9CA3AF"
                  multiline
                  editable={!submitting}
                />
              </ScrollView>

              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={closeLAAssignModal}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLAAssign}
                  disabled={
                    submitting ||
                    (laAssignShowReassign && !laAssignSelectedAuditorId) ||
                    (laAssignShowReassign &&
                      laAssignConflictWarning?.type === "reassign")
                  }
                  style={[
                    modalStyles.primaryBtn,
                    {
                      backgroundColor:
                        submitting ||
                        (laAssignShowReassign && !laAssignSelectedAuditorId) ||
                        (laAssignShowReassign &&
                          laAssignConflictWarning?.type === "reassign")
                          ? "#94A3B8"
                          : COLORS.success },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Check size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting
                      ? laAssignMode === "EXTEND"
                        ? "Extending..."
                        : "Rescheduling..."
                      : laAssignMode === "EXTEND"
                        ? "Extend"
                        : "Reschedule"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ REQUEST PREVIEW MODAL ══════════ */}
      {requestPreviewTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeRequestFlow}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.sheet, { maxWidth: 560 }]}>
              <View style={modalStyles.header}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: COLORS.accentLight,
                      alignItems: "center",
                      justifyContent: "center" }}
                  >
                    <Calendar size={20} color={COLORS.accent} />
                  </View>
                  <View>
                    <Text style={modalStyles.headerTitle}>
                      {requestPreviewTarget.rescheduleRequested
                        ? "Reschedule Request"
                        : "Extension Request"}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                      Review and edit before assigning
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={closeRequestFlow}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 520, padding: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 16 }}
                >
                  <InfoCell
                    label="Department"
                    value={requestPreviewTarget.department}
                  />
                  <InfoCell
                    label="Audit Type"
                    value={requestPreviewTarget.auditType || "—"}
                  />
                  <InfoCell
                    label="Auditor"
                    value={requestPreviewTarget.auditorName || "—"}
                  />
                  <InfoCell
                    label="Auditees"
                    value={
                      requestPreviewTarget.auditeeNames?.join(", ") ||
                      requestPreviewTarget.auditeeName ||
                      "—"
                    }
                  />
                </View>

                <View
                  style={{
                    padding: 14,
                    backgroundColor: COLORS.accentLight,
                    borderWidth: 1,
                    borderColor: COLORS.accentBorder,
                    borderRadius: 10,
                    marginBottom: 12 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10 }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: COLORS.accent }}
                    >
                      Requested Changes
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontStyle: "italic",
                        color: COLORS.textMuted }}
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
                        marginTop: 2 }}
                    >
                      {requestPreviewTarget.scheduledDate} •{" "}
                      {requestPreviewTarget.startTime}
                    </Text>
                  </View>

                  {requestPreviewTarget.rescheduleRequested ? (
                    <>
                      <View style={{ marginBottom: 10 }}>
                        <DatePickerField
                          label="New Date"
                          value={laOverrideNewDate}
                          onChange={setLaOverrideNewDate}
                        />
                      </View>

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <TimePickerField
                            label="Start Time"
                            value={laOverrideNewStart}
                            onChange={setLaOverrideNewStart}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TimePickerField
                            label="End Time"
                            value={laOverrideNewEnd}
                            onChange={setLaOverrideNewEnd}
                          />
                        </View>
                      </View>
                    </>
                  ) : (
                    <DatePickerField
                      label="New End Date"
                      value={laOverrideNewEndDate}
                      onChange={setLaOverrideNewEndDate}
                    />
                  )}
                </View>

                <View
                  style={{
                    padding: 14,
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 10 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: COLORS.textMuted,
                      marginBottom: 6 }}
                  >
                    Reason for Request
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.text }}>
                    {requestPreviewTarget.rescheduleRequested
                      ? requestPreviewTarget.rescheduleReason ||
                        "No reason provided"
                      : requestPreviewTarget.extensionReason ||
                        "No reason provided"}
                  </Text>
                </View>
              </ScrollView>

              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={closeRequestFlow}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequestRejectionTarget(requestPreviewTarget);
                    setRequestPreviewTarget(null);
                    setRejectionReason("");
                  }}
                  style={[
                    modalStyles.primaryBtn,
                    { backgroundColor: COLORS.error },
                  ]}
                >
                  <X size={14} color="#FFF" />
                  <Text style={modalStyles.primaryBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRequestApprovalTarget(requestPreviewTarget);
                    setRequestPreviewTarget(null);
                    setApprovalComment("");
                  }}
                  style={[
                    modalStyles.primaryBtn,
                    { backgroundColor: COLORS.success },
                  ]}
                >
                  <Check size={14} color="#FFF" />
                  <Text style={modalStyles.primaryBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ ASSIGN REQUEST MODAL ══════════ */}
      {requestApprovalTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeRequestFlow}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.sheet, { maxWidth: 600 }]}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Assign{" "}
                  {requestApprovalTarget.rescheduleRequested
                    ? "Reschedule"
                    : "Extension"}{" "}
                  Request
                </Text>
                <TouchableOpacity onPress={closeRequestFlow}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 560, padding: 16 }}>
                <View
                  style={{
                    padding: 14,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 6 }}
                  >
                    Audit
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.text }}
                  >
                    {requestApprovalTarget.auditType || "Audit"} —{" "}
                    {requestApprovalTarget.department}
                  </Text>
                </View>

                <View
                  style={{
                    padding: 14,
                    backgroundColor: COLORS.accentLight,
                    borderRadius: 10,
                    marginTop: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 6 }}
                  >
                    Current Auditor
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.text }}
                  >
                    {requestApprovalTarget.auditorName || "—"}
                  </Text>
                </View>

                {!loadingTeamMembers && teamInfo.leadAuditorName && (
                  <View
                    style={{
                      padding: 14,
                      backgroundColor: COLORS.accentLight,
                      borderRadius: 10,
                      marginTop: 8 }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.accent,
                        fontWeight: "700",
                        marginBottom: 6 }}
                    >
                      Assigned Audit Team
                    </Text>

                    {teamInfo.teamAuditorNames.length > 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.accent,
                          marginTop: 2 }}
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
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    marginTop: 12 }}
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
                        ? COLORS.accent
                        : COLORS.border,
                      backgroundColor: showReassignOptions
                        ? COLORS.accent
                        : "#FFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2 }}
                  >
                    {showReassignOptions && <Check size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.text }}
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
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      marginTop: 8 }}
                  >
                    <Text style={modalStyles.sectionLabel}>
                      Select Primary Auditor *
                    </Text>
                    {loadingTeamMembers ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          overflow: "hidden",
                          backgroundColor: "#FFF" }}
                      >
                        <Picker
                          selectedValue={selectedReassignAuditorId}
                          onValueChange={(v: string) => {
                            setSelectedReassignAuditorId(v);
                            if (v) checkConflictsForReassign(v, true);
                          }}
                          style={{ height: 48, color: COLORS.text }}
                        >
                          <Picker.Item label="Select Auditor" value="" />
                          {approvalAuditors
                            .filter((a) => {
                              if (
                                teamInfo.teamAuditorIds.length > 0 &&
                                !teamInfo.teamAuditorIds.includes(Number(a.id))
                              )
                                return false;
                              const isCurrent =
                                String(a.id) ===
                                  String(requestApprovalTarget.auditorId) ||
                                `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                  (
                                    requestApprovalTarget.auditorName || ""
                                  ).toLowerCase();
                              return !isCurrent;
                            })
                            .map((a) => (
                              <Picker.Item
                                key={a.id}
                                label={`${a.firstName} ${a.lastName}`}
                                value={String(a.id)}
                              />
                            ))}
                        </Picker>
                      </View>
                    )}
                    {checkingAvailability && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.accent,
                          marginTop: 6 }}
                      >
                        Checking availability...
                      </Text>
                    )}
                    {conflictWarning?.type === "reassign" && (
                      <View
                        style={{
                          padding: 10,
                          marginTop: 8,
                          backgroundColor: COLORS.errorLight,
                          borderWidth: 1,
                          borderColor: COLORS.errorBorder,
                          borderRadius: 8 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#991B1B" }}
                        >
                          ⚠️ Time conflict
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#991B1B",
                            marginTop: 2 }}
                        >
                          {conflictWarning.auditorName} is already scheduled at
                          this time.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Add co-auditor checkbox */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 12,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    marginTop: 10 }}
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
                        ? COLORS.accent
                        : COLORS.border,
                      backgroundColor: showAddAnotherAuditor
                        ? COLORS.accent
                        : "#FFF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2 }}
                  >
                    {showAddAnotherAuditor && <Check size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: COLORS.text }}
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
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      marginTop: 8 }}
                  >
                    <Text style={modalStyles.sectionLabel}>
                      Select Additional Auditor(s)
                    </Text>
                    {loadingTeamMembers ? (
                      <ActivityIndicator size="small" color={COLORS.accent} />
                    ) : (
                      <ScrollView style={{ maxHeight: 160 }}>
                        {approvalAuditors
                          .filter((a) => {
                            if (
                              teamInfo.teamAuditorIds.length > 0 &&
                              !teamInfo.teamAuditorIds.includes(Number(a.id))
                            )
                              return false;
                            const isCurrent =
                              String(a.id) ===
                                String(requestApprovalTarget.auditorId) ||
                              `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                (
                                  requestApprovalTarget.auditorName || ""
                                ).toLowerCase();
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
                          .map((a) => (
                            <TouchableOpacity
                              key={a.id}
                              onPress={() => {
                                setAdditionalAuditorIds([
                                  ...additionalAuditorIds,
                                  String(a.id),
                                ]);
                                checkConflictsForReassign(a.id, false);
                              }}
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: 10,
                                backgroundColor: "#FFF",
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: COLORS.border,
                                marginBottom: 6 }}
                            >
                              <Text style={{ fontSize: 13 }}>
                                ✅ {a.firstName} {a.lastName}
                              </Text>
                              <Check size={16} color={COLORS.accent} />
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    )}

                    {conflictWarning?.type === "coauditor" && (
                      <View
                        style={{
                          padding: 10,
                          marginTop: 8,
                          backgroundColor: COLORS.warningLight,
                          borderWidth: 1,
                          borderColor: COLORS.warningBorder,
                          borderRadius: 8 }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#92400E" }}
                        >
                          ⚠️ Potential conflict
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#92400E",
                            marginTop: 2 }}
                        >
                          {conflictWarning.auditorName} is already scheduled at
                          this time.
                        </Text>
                      </View>
                    )}

                    {additionalAuditorIds.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={modalStyles.sectionLabel}>
                          Selected Co-auditors
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6 }}
                        >
                          {additionalAuditorIds.map((id) => {
                            const a = approvalAuditors.find(
                              (x) => String(x.id) === id,
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
                                  backgroundColor: COLORS.accentLight,
                                  borderWidth: 1,
                                  borderColor: COLORS.accentBorder }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: COLORS.accent,
                                    fontWeight: "600" }}
                                >
                                  {a.firstName} {a.lastName}
                                </Text>
                                <TouchableOpacity
                                  onPress={() =>
                                    setAdditionalAuditorIds(
                                      additionalAuditorIds.filter(
                                        (x) => x !== id,
                                      ),
                                    )
                                  }
                                >
                                  <X size={13} color={COLORS.error} />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Requested changes summary */}
                <View
                  style={{
                    padding: 12,
                    backgroundColor: COLORS.accentLight,
                    borderWidth: 1,
                    borderColor: COLORS.accentBorder,
                    borderRadius: 10,
                    marginTop: 12 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: COLORS.accent,
                      marginBottom: 6 }}
                  >
                    Requested Changes (LA Overrides)
                  </Text>
                  {requestApprovalTarget.rescheduleRequested ? (
                    <>
                      <Text style={{ fontSize: 12, color: COLORS.text }}>
                        New Date:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {laOverrideNewDate || "—"}
                        </Text>
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.text,
                          marginTop: 2 }}
                      >
                        New Time: {laOverrideNewStart || "—"} –{" "}
                        {laOverrideNewEnd || "—"}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ fontSize: 12, color: COLORS.text }}>
                      New End Date:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {laOverrideNewEndDate || "—"}
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
                  placeholderTextColor="#9CA3AF"
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  multiline
                  editable={!submitting}
                />
              </ScrollView>

              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={closeRequestFlow}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApproveRequest}
                  disabled={
                    submitting ||
                    (showReassignOptions && !selectedReassignAuditorId) ||
                    (showReassignOptions &&
                      conflictWarning?.type === "reassign")
                  }
                  style={[
                    modalStyles.primaryBtn,
                    {
                      backgroundColor:
                        submitting ||
                        (showReassignOptions && !selectedReassignAuditorId) ||
                        (showReassignOptions &&
                          conflictWarning?.type === "reassign")
                          ? "#94A3B8"
                          : COLORS.success },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Check size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting ? "Assigning..." : "Assign"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ REJECT REQUEST MODAL ══════════ */}
      {requestRejectionTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeRequestFlow}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.sheet, { maxWidth: 500 }]}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Reject{" "}
                  {requestRejectionTarget.rescheduleRequested
                    ? "Reschedule"
                    : "Extension"}{" "}
                  Request
                </Text>
                <TouchableOpacity onPress={closeRequestFlow}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 13, color: COLORS.text }}>
                  You are about to reject the{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {requestRejectionTarget.rescheduleRequested
                      ? "reschedule"
                      : "extension"}
                  </Text>{" "}
                  request for{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {requestRejectionTarget.department}
                  </Text>
                  .
                </Text>
                <TextInput
                  style={[modalStyles.textarea, { marginTop: 12 }]}
                  placeholder="Enter rejection reason..."
                  placeholderTextColor="#9CA3AF"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  editable={!submitting}
                />
              </View>

              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={closeRequestFlow}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRejectRequest}
                  disabled={submitting || !rejectionReason.trim()}
                  style={[
                    modalStyles.primaryBtn,
                    {
                      backgroundColor:
                        submitting || !rejectionReason.trim()
                          ? "#94A3B8"
                          : COLORS.error },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <X size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting ? "Rejecting..." : "Reject"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// ─── Helpers ───
const ActionChip = ({
  label,
  icon,
  bgColor,
  borderColor,
  textColor,
  onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor,
      backgroundColor: bgColor }}
  >
    {icon}
    <Text style={{ fontSize: 11, fontWeight: "600", color: textColor }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9" }}
  >
    <Text
      style={{
        width: 130,
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500" }}
    >
      {label}
    </Text>
    <Text style={{ flex: 1, fontSize: 13, color: "#1F2937" }}>{value}</Text>
  </View>
);

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flex: 1,
      minWidth: "45%",
      padding: 12,
      backgroundColor: "#F8FAFC",
      borderRadius: 10 }}
  >
    <Text
      style={{
        fontSize: 11,
        color: "#6B7280",
        marginBottom: 4,
        fontWeight: "500" }}
    >
      {label}
    </Text>
    <Text
      style={{ fontSize: 13, fontWeight: "600", color: "#1F2937" }}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

const modalStyles = {
  backdrop: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 20 },
  sheet: {
    width: "100%" as const,
    maxWidth: 480,
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden" as const },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#1F2937" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8 },
  textarea: {
    width: "100%" as const,
    minHeight: 100,
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    fontSize: 13,
    textAlignVertical: "top" as const,
    color: "#1F2937" },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#F8FAFC" },
  primaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10 },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFF" },
  secondaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFF" },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#1F2937" } };

export default OverdueScheduleQueue;
