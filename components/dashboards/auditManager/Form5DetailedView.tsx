// Form5DetailedView.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi, User } from "@/services/auditScheduleApi";
import DateTimePicker from "@react-native-community/datetimepicker"; // ← ADD THIS LINE
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Coffee,
  Download,
  Edit2,
  FileText,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Sunrise,
  Sunset,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import AddScheduleModal from "./AddScheduleModal"; // ✅ NEW IMPORT

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

// ═════ CONSTANTS ═════
const monthNumber: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const monthDisplay: Record<string, string> = {
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
  Jan: "January",
  Feb: "February",
  Mar: "March",
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
  "Stores & Despatch": "STORES_DESPATCH",
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

interface HeaderData {
  auditObjective: string;
  auditScope: string;
  leadAuditorId: number | null;
  leadAuditorName: string;
  teamAuditorIds: number[];
  teamAuditorNames: string[];
  documentRevision: string;
  preparedBy: string;
  approvedBy: string;
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

interface BulkData {
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  selectedDepartments: { department: string; selectedElements: string[] }[];
  auditorId: string;
  auditeeId: string;
  auditType: string;
  status: string;
  isSpecialEvent: boolean;
  specialEventType: string;
}

interface DepartmentTeamInfo {
  leadAuditorId: number | null;
  leadAuditorName: string | null;
  teamAuditorIds: number[];
  teamAuditorNames: string[];
  auditeeIds: number[];
  auditeeNames: string[];
}

interface BasicSchedule {
  week: string;
  department: string;
  approvalStatus: string;
  auditElements?: string[] | string;
  leadAuditorId?: number;
  leadAuditorName?: string;
  auditorId?: number;
  auditorName?: string;
  teamAuditorIds?: number[] | string;
  teamAuditorNames?: string[] | string;
  coAuditorIds?: number[] | string;
  coAuditorNames?: string[] | string;
  auditeeIds?: number[] | string;
  auditeeIdList?: number[] | string;
  auditeeNames?: string[] | string;
  auditObjective?: string;
  auditScope?: string;
  documentRevision?: string;
  preparedByName?: string;
  approvedByName?: string;
}

// ═════ SUB-COMPONENTS ═════
const Card = ({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: any;
}) => (
  <View
    className={`rounded-xl border border-gray-200 bg-white shadow-sm mb-4 ${className}`}
    style={style}
  >
    {children}
  </View>
);

const ActionButton = ({
  onPress,
  disabled,
  loading,
  color,
  bgColor,
  borderColor,
  icon: Icon,
  children,
  className = "",
}: {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  color: string;
  bgColor: string;
  borderColor?: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    className={`h-10 px-5 rounded-lg border flex-row items-center justify-center gap-2 ${disabled || loading ? "bg-gray-100 border-gray-200" : ""} ${className}`}
    style={{
      backgroundColor: disabled || loading ? undefined : bgColor,
      borderColor:
        disabled || loading ? undefined : borderColor || "transparent",
    }}
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : Icon ? (
      <Icon size={16} color={disabled || loading ? "#94A3B8" : color} />
    ) : null}
    <Text
      className={`text-sm font-semibold ${disabled || loading ? "text-gray-400" : ""}`}
      style={{ color: disabled || loading ? undefined : color }}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

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

const ActionModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  iconBorder,
  value,
  setValue,
  placeholder,
  onSubmit,
  submitLabel,
  submitBg,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  value: string;
  setValue: (val: string) => void;
  placeholder: string;
  onSubmit: () => void;
  submitLabel: string;
  submitBg: string;
  submitting: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
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
          className="w-full max-w-md overflow-hidden bg-white rounded-2xl"
        >
          <View className="flex-row items-center gap-4 p-6 border-b border-gray-200">
            <View
              className="items-center justify-center border w-11 h-11 rounded-xl"
              style={{ backgroundColor: iconBg, borderColor: iconBorder }}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">{title}</Text>
              <Text className="mt-1 text-xs text-gray-500">{description}</Text>
            </View>
          </View>
          <View className="p-6">
            <TextInput
              className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 min-h-[120px]"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </View>
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
              onPress={onSubmit}
              disabled={!value.trim() || submitting}
              className="flex-row items-center justify-center h-10 gap-2 px-5 rounded-lg"
              style={{
                backgroundColor:
                  !value.trim() || submitting ? "#F1F5F9" : submitBg,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon size={16} color="#FFF" />
              )}
              <Text className="text-sm font-semibold text-white">
                {submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ═════ HELPERS ═════
const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysISO = (dateStr: string, days: number): string => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

const normalizeWeek = (week?: string | null): string => {
  if (!week) return "";
  const cleaned = String(week).trim().toUpperCase();
  if (/^W-\d+$/.test(cleaned)) return cleaned;
  const number = cleaned.replace(/[^0-9]/g, "");
  if (number) return `W-${number}`;
  return cleaned;
};

const isSubmittableDraft = (status?: string | null): boolean => {
  const normalized = (status ?? "").toUpperCase().trim();
  return (
    normalized === "" ||
    normalized === "DRAFT" ||
    normalized === "CHANGE_REQUESTED"
  );
};

const convertToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getTimeValue = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
};

// ═════ MAIN COMPONENT ═════
interface Form5DetailedViewProps {
  year?: number;
  month?: string;
  preSelectedDepartment?: string;
  preSelectedWeek?: string;
  startDate?: string;
  endDate?: string;
  onBack?: () => void;
}

export default function Form5DetailedView({
  year: propYear,
  month: propMonth,
  preSelectedDepartment,
  preSelectedWeek,
  startDate: preStartDate,
  endDate: preEndDate,
  onBack,
}: Form5DetailedViewProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const showToast = (
    msg: string,
    type: "success" | "error" | "warning" = "success",
  ) => {
    const title = type.charAt(0).toUpperCase() + type.slice(1);
    if (Platform.OS === "web") {
      console.log(`[${type.toUpperCase()}] ${msg}`);
      if (
        typeof window !== "undefined" &&
        typeof (window as any).alert === "function"
      ) {
        (window as any).alert(`${title}: ${msg}`);
      }
      return;
    }
    Alert.alert(title, msg);
  };

  // Parse URL params
  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const urlMonth = (params?.month as string) || null;
  const urlStartDate = (params?.startDate as string) || null;
  const urlEndDate = (params?.endDate as string) || null;
  const urlWeek = (params?.week as string) || null;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const defaultMonth = new Date().toLocaleString("default", { month: "short" });
  const defaultYear = new Date().getFullYear();

  const [selectedYear] = useState(urlYear || propYear || defaultYear);
  const [selectedMonth] = useState(urlMonth || propMonth || defaultMonth);
  const [selectedWeek] = useState(
    normalizeWeek(urlWeek || preSelectedWeek || ""),
  );

  const [basicSchedules, setBasicSchedules] = useState<BasicSchedule[]>([]);
  const [auditSchedules, setAuditSchedules] = useState<Schedule[]>([]);
  const [auditors, setAuditors] = useState<User[]>([]);
  const [auditees, setAuditees] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [approvalStatus, setApprovalStatus] = useState("CHECKING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [selectedRejectDate, setSelectedRejectDate] = useState<string | null>(
    null,
  );
  const [globalAuditType, setGlobalAuditType] = useState("");
  const [globalAuditTypesList, setGlobalAuditTypesList] = useState<string[]>(
    [],
  );
  const [startDate, setStartDate] = useState(
    urlStartDate || preStartDate || "",
  );
  const [endDate, setEndDate] = useState(urlEndDate || preEndDate || "");
  const [auditNumber, setAuditNumber] = useState("");
  const [filteredAuditSchedules, setFilteredAuditSchedules] = useState<
    Schedule[]
  >([]);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [departmentAuditors, setDepartmentAuditors] = useState<User[]>([]);
  const [departmentAuditees, setDepartmentAuditees] = useState<User[]>([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [selectedAuditDepartment, setSelectedAuditDepartment] = useState("");
  const [tempScheduleId, setTempScheduleId] = useState<number | null>(null);
  const [headerData, setHeaderData] = useState<HeaderData>({
    auditObjective: "",
    auditScope: "",
    leadAuditorId: null,
    leadAuditorName: "",
    teamAuditorIds: [],
    teamAuditorNames: [],
    documentRevision: "1.0",
    preparedBy: "",
    approvedBy: "",
  });
  const [formData, setFormData] = useState<FormData>({
    id: null,
    date: "",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    selectedDepartments: [],
    auditorId: "",
    auditeeId: "",
    isSpecialEvent: false,
    specialEventType: "",
    auditType: "",
    status: "SCHEDULED",
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedAuditDepartment, setBulkSelectedAuditDepartment] =
    useState("");
  const [bulkDepartmentAuditors, setBulkDepartmentAuditors] = useState<User[]>(
    [],
  );
  const [bulkDepartmentAuditees, setBulkDepartmentAuditees] = useState<User[]>(
    [],
  );
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [departmentTeamInfo, setDepartmentTeamInfo] =
    useState<DepartmentTeamInfo>({
      leadAuditorId: null,
      leadAuditorName: null,
      teamAuditorIds: [],
      teamAuditorNames: [],
      auditeeIds: [],
      auditeeNames: [],
    });

  const [bulkData, setBulkData] = useState<BulkData>({
    fromDate: "",
    toDate: "",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    selectedDepartments: [],
    auditorId: "",
    auditeeId: "",
    auditType: "",
    status: "SCHEDULED",
    isSpecialEvent: false,
    specialEventType: "",
  });

  const getUserIdAsNumber = (): number => {
    if (!user?.id) return 0;
    if (typeof user.id === "number") return user.id;
    const parsed = parseInt(user.id as string, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // ═════ HELPER FUNCTIONS ═════
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

  const getMonthLimits = useCallback(() => {
    if (!selectedMonth) return null;
    const monthIdx = monthNumber[selectedMonth];
    const year =
      selectedMonth === "Jan" ||
      selectedMonth === "Feb" ||
      selectedMonth === "Mar"
        ? selectedYear + 1
        : selectedYear;
    const firstDate = new Date(year, monthIdx, 1);
    const lastDate = new Date(year, monthIdx + 1, 0);
    return { min: toISODate(firstDate), max: toISODate(lastDate) };
  }, [selectedMonth, selectedYear]);

  const getWeekLimits = useCallback(
    (week: string) => {
      const monthLimits = getMonthLimits();
      if (!monthLimits) return null;
      const start = new Date(`${monthLimits.min}T00:00:00`);
      const end = new Date(`${monthLimits.max}T00:00:00`);
      let weekMin = "";
      let weekMax = "";
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = toISODate(d);
        if (getWeekNumber(dateStr) === week) {
          if (!weekMin) weekMin = dateStr;
          weekMax = dateStr;
        }
      }
      if (weekMin && weekMax) return { min: weekMin, max: weekMax };
      return monthLimits;
    },
    [getMonthLimits],
  );

  // ✅ NEW — only uses selectedWeek or full month, never startDate
  const getDateLimits = useCallback(() => {
    if (selectedWeek) {
      return getWeekLimits(selectedWeek);
    }
    // Always fall back to full month limits so user can pick ANY date in the month
    return getMonthLimits();
  }, [selectedWeek, getWeekLimits, getMonthLimits]);

  // useEffect(() => {
  //   if (!selectedWeek) return;
  //   const limits = getWeekLimits(selectedWeek);
  //   if (!limits) return;
  //   if (!startDate && !endDate) {
  //     setStartDate(limits.min);
  //     setEndDate(limits.max);
  //   }
  // }, [selectedWeek, getWeekLimits, startDate, endDate]);

  // ✅ Fill table data: sync auditSchedules → filteredAuditSchedules
  useEffect(() => {
    if (!globalAuditType || globalAuditType === "") {
      setFilteredAuditSchedules(auditSchedules);
      return;
    }
    const filtered = auditSchedules.filter((schedule: any) => {
      if (schedule.isSpecialEvent) return true;
      let auditElements: string[] = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === "string") {
          try {
            auditElements = JSON.parse(schedule.auditElements);
          } catch (_e) {
            auditElements = [];
          }
        } else if (Array.isArray(schedule.auditElements)) {
          auditElements = schedule.auditElements;
        }
      }
      return auditElements.some((el) =>
        el.toLowerCase().includes(globalAuditType.toLowerCase()),
      );
    });
    setFilteredAuditSchedules(filtered);
  }, [auditSchedules, globalAuditType]);

  const generateDateRange = (): {
    dateStr: string;
    displayDate: string;
    dayOfWeek: string;
    isWeekend: boolean;
  }[] => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: {
      dateStr: string;
      displayDate: string;
      dayOfWeek: string;
      isWeekend: boolean;
    }[] = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      dates.push({
        dateStr: `${year}-${month}-${day}`,
        displayDate: `${day}/${month}/${year}`,
        dayOfWeek: dt.toLocaleDateString("en-US", { weekday: "long" }),
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      });
    }
    return dates;
  };

  const getSchedulesForDate = (dateStr: string): Schedule[] => {
    return filteredAuditSchedules
      .filter((s) => s.scheduledDate === dateStr || s.date === dateStr)
      .sort((a, b) => {
        const timeA = convertToMinutes(a.startTime);
        const timeB = convertToMinutes(b.startTime);
        if (timeA === timeB) {
          const deptA =
            Array.isArray(a.departments) && a.departments.length > 0
              ? a.departments[0]
              : "";
          const deptB =
            Array.isArray(b.departments) && b.departments.length > 0
              ? b.departments[0]
              : "";
          return deptA.localeCompare(deptB);
        }
        return timeA - timeB;
      });
  };

  const getAvailableDepartmentsForDate = (
    dateStr: string,
  ): { department: string; auditElements: string[] }[] => {
    if (!dateStr) return [];
    const weekNum = getWeekNumber(dateStr);
    const departmentsMap = new Map<
      string,
      { department: string; auditElements: string[] }
    >();
    basicSchedules.forEach((schedule) => {
      if (
        schedule.week === weekNum &&
        schedule.department &&
        schedule.department !== "OPENING" &&
        schedule.department !== "CLOSING" &&
        schedule.approvalStatus === "APPROVED"
      ) {
        let auditElements: string[] = [];
        if (schedule.auditElements) {
          if (typeof schedule.auditElements === "string") {
            try {
              auditElements = JSON.parse(schedule.auditElements);
            } catch (_e) {
              auditElements = [];
            }
          } else if (Array.isArray(schedule.auditElements)) {
            auditElements = schedule.auditElements;
          }
        }
        let filteredElements = auditElements;
        if (globalAuditType && globalAuditType !== "") {
          filteredElements = auditElements.filter((element) =>
            element.toLowerCase().includes(globalAuditType.toLowerCase()),
          );
        }
        const shouldShowDepartment =
          !globalAuditType || filteredElements.length > 0;
        if (shouldShowDepartment) {
          departmentsMap.set(schedule.department, {
            department: schedule.department,
            auditElements: filteredElements,
          });
        }
      }
    });
    return Array.from(departmentsMap.values());
  };

  const getAvailableDepartmentsForBulk = useCallback((): {
    department: string;
    auditElements: string[];
  }[] => {
    if (!bulkData.fromDate || !bulkData.toDate) return [];
    const fromDate = new Date(bulkData.fromDate);
    const toDate = new Date(bulkData.toDate);
    const weeksInRange = new Set<string>();
    for (
      let dt = new Date(fromDate);
      dt <= toDate;
      dt.setDate(dt.getDate() + 1)
    ) {
      const dateStr = dt.toISOString().split("T")[0];
      weeksInRange.add(getWeekNumber(dateStr));
    }
    const departmentsMap = new Map<
      string,
      { department: string; auditElements: string[] }
    >();
    const relevantSchedules = basicSchedules.filter(
      (schedule) =>
        weeksInRange.has(schedule.week) &&
        schedule.department &&
        schedule.department !== "OPENING" &&
        schedule.department !== "CLOSING" &&
        schedule.approvalStatus === "APPROVED",
    );
    relevantSchedules.forEach((schedule) => {
      let auditElements: string[] = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === "string") {
          try {
            auditElements = JSON.parse(schedule.auditElements);
          } catch (_e) {
            auditElements = [];
          }
        } else if (Array.isArray(schedule.auditElements)) {
          auditElements = schedule.auditElements;
        }
      }
      let filteredElements = auditElements;
      if (globalAuditType) {
        filteredElements = auditElements.filter((element) =>
          element.toLowerCase().includes(globalAuditType.toLowerCase()),
        );
      }
      if (
        filteredElements.length > 0 &&
        !departmentsMap.has(schedule.department)
      ) {
        departmentsMap.set(schedule.department, {
          department: schedule.department,
          auditElements: filteredElements,
        });
      }
    });
    return Array.from(departmentsMap.values());
  }, [basicSchedules, bulkData.fromDate, bulkData.toDate, globalAuditType]);

  const getAvailableAuditors = useCallback((): User[] => {
    const auditorIds: number[] = [];
    if (headerData.leadAuditorId) auditorIds.push(headerData.leadAuditorId);
    if (headerData.teamAuditorIds) {
      const teamIds = Array.isArray(headerData.teamAuditorIds)
        ? headerData.teamAuditorIds
        : JSON.parse((headerData.teamAuditorIds as unknown as string) || "[]");
      auditorIds.push(...teamIds);
    }
    if (auditorIds.length === 0) return auditors;
    return auditors
      .filter((a) => auditorIds.includes(Number(a.id)))
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [auditors, headerData.leadAuditorId, headerData.teamAuditorIds]);

  const getSortedAuditees = useCallback((): User[] => {
    return [...auditees].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [auditees]);

  const getTeamMembersForDepartment = useCallback(
    (
      departmentName: string,
      dateStr: string | null = null,
      auditType: string | null = null,
    ): DepartmentTeamInfo => {
      const targetWeek = dateStr ? getWeekNumber(dateStr) : null;
      let matchedSchedule: BasicSchedule | null = null;
      const candidates = basicSchedules.filter((schedule) => {
        if (schedule.department !== departmentName) return false;
        if (schedule.approvalStatus !== "APPROVED") return false;
        if (targetWeek && schedule.week !== targetWeek) return false;
        if (auditType) {
          let elements: string[] = [];
          if (typeof schedule.auditElements === "string") {
            try {
              elements = JSON.parse(schedule.auditElements);
            } catch (_e) {
              elements = [];
            }
          } else if (Array.isArray(schedule.auditElements)) {
            elements = schedule.auditElements;
          }
          if (
            !Array.isArray(elements) ||
            !elements.some((el) => el.toLowerCase() === auditType.toLowerCase())
          ) {
            return false;
          }
        }
        return true;
      });
      if (candidates.length > 0) matchedSchedule = candidates[0];
      if (!matchedSchedule) {
        return {
          leadAuditorId: null,
          leadAuditorName: null,
          teamAuditorIds: [],
          teamAuditorNames: [],
          auditeeIds: [],
          auditeeNames: [],
        };
      }
      let teamIds: number[] = [];
      let teamNames: string[] = [];
      if (matchedSchedule.teamAuditorIds) {
        teamIds = matchedSchedule.teamAuditorIds as number[];
        if (typeof teamIds === "string") {
          try {
            teamIds = JSON.parse(teamIds);
          } catch (_e) {
            teamIds = [];
          }
        }
      }
      if (teamIds.length === 0 && matchedSchedule.coAuditorIds) {
        teamIds = matchedSchedule.coAuditorIds as number[];
        if (typeof teamIds === "string") {
          try {
            teamIds = JSON.parse(teamIds);
          } catch (_e) {
            teamIds = [];
          }
        }
      }
      teamIds = Array.isArray(teamIds)
        ? teamIds.map((id) => parseInt(id as any)).filter((id) => !isNaN(id))
        : [];
      if (matchedSchedule.teamAuditorNames) {
        teamNames = matchedSchedule.teamAuditorNames as string[];
        if (typeof teamNames === "string") {
          try {
            teamNames = JSON.parse(teamNames);
          } catch (_e) {
            teamNames = [];
          }
        }
      }
      if (teamNames.length === 0 && matchedSchedule.coAuditorNames) {
        teamNames = matchedSchedule.coAuditorNames as string[];
        if (typeof teamNames === "string") {
          try {
            teamNames = JSON.parse(teamNames);
          } catch (_e) {
            teamNames = [];
          }
        }
      }
      let auditeeIds: number[] = [];
      let auditeeNames: string[] = [];
      if (matchedSchedule.auditeeIds) {
        auditeeIds = matchedSchedule.auditeeIds as number[];
        if (typeof auditeeIds === "string") {
          try {
            auditeeIds = JSON.parse(auditeeIds);
          } catch (_e) {
            auditeeIds = [];
          }
        }
      } else if (matchedSchedule.auditeeIdList) {
        auditeeIds = matchedSchedule.auditeeIdList as number[];
        if (typeof auditeeIds === "string") {
          try {
            auditeeIds = JSON.parse(auditeeIds);
          } catch (_e) {
            auditeeIds = [];
          }
        }
      }
      auditeeIds = Array.isArray(auditeeIds)
        ? auditeeIds.map((id) => parseInt(id as any)).filter((id) => !isNaN(id))
        : [];
      if (matchedSchedule.auditeeNames) {
        auditeeNames = matchedSchedule.auditeeNames as string[];
        if (typeof auditeeNames === "string") {
          try {
            auditeeNames = JSON.parse(auditeeNames);
          } catch (_e) {
            auditeeNames = [];
          }
        }
      }
      if (teamIds.length > 0 && teamNames.length === 0) {
        teamNames = teamIds.map((id) => `Co-Auditor ${id}`);
      }
      return {
        leadAuditorId:
          matchedSchedule.leadAuditorId || matchedSchedule.auditorId || null,
        leadAuditorName:
          matchedSchedule.leadAuditorName ||
          matchedSchedule.auditorName ||
          null,
        teamAuditorIds: teamIds,
        teamAuditorNames: teamNames,
        auditeeIds: auditeeIds,
        auditeeNames: auditeeNames,
      };
    },
    [basicSchedules],
  );

  // ═════ API CALLS ═════
  const fetchUsers = useCallback(async () => {
    try {
      const auditorsData = await auditScheduleApi.getAuditors();
      setAuditors(auditorsData);
      const auditeesData = await auditScheduleApi.getAuditees();
      setAuditees(auditeesData);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAuditors([]);
      setAuditees([]);
    }
  }, []);

  const fetchDepartmentUsers = useCallback(async (departmentCode: string) => {
    if (!departmentCode) {
      setDepartmentAuditors([]);
      setDepartmentAuditees([]);
      return;
    }
    const enumValue =
      departmentDisplayToEnum[departmentCode] ||
      departmentCode.toUpperCase().replace(/[&\s/]+/g, "_");
    setLoadingDepartmentUsers(true);
    try {
      const token = "YOUR_AUTH_TOKEN";
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const auditorsUrl = `${API_BASE_URL}/api/audit-schedule/auditors/by-department/${encodeURIComponent(enumValue)}`;
      const auditorsRes = await fetch(auditorsUrl, { headers });
      const auditorsData = await auditorsRes.json();
      setDepartmentAuditors(
        Array.isArray(auditorsData) ? auditorsData : auditorsData.data || [],
      );
      const auditeesUrl = `${API_BASE_URL}/api/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`;
      const auditeesRes = await fetch(auditeesUrl, { headers });
      const auditeesData = await auditeesRes.json();
      setDepartmentAuditees(
        Array.isArray(auditeesData) ? auditeesData : auditeesData.data || [],
      );
    } catch (error) {
      console.error("Error fetching department users:", error);
      showToast("Failed to load department users", "error");
      setDepartmentAuditors([]);
      setDepartmentAuditees([]);
    } finally {
      setLoadingDepartmentUsers(false);
    }
  }, []);

  const fetchBasicSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const weekSchedules = await auditScheduleApi.getByYearAndMonth(
        selectedYear,
        selectedMonth as any,
      );
      const dateSchedules = await auditScheduleApi.getDateSchedulesByMonth(
        selectedYear,
        selectedMonth as any,
      );
      const allSchedules = [
        ...(weekSchedules.data || []),
        ...(dateSchedules.data || []),
      ];
      setBasicSchedules(allSchedules);
      const hasApprovedSchedules = allSchedules.some(
        (s: any) => s.approvalStatus === "APPROVED",
      );
      if (hasApprovedSchedules) {
        setApprovalStatus("APPROVED");
        const first = allSchedules.find(
          (s: any) => s.approvalStatus === "APPROVED",
        );
        if (first) {
          let teamIds = first.teamAuditorIds || [];
          if (typeof teamIds === "string") {
            try {
              teamIds = JSON.parse(teamIds);
            } catch (_e) {
              teamIds = [];
            }
          }
          setHeaderData({
            auditObjective: first.auditObjective || "",
            auditScope: first.auditScope || "",
            leadAuditorId: first.leadAuditorId || null,
            leadAuditorName: first.leadAuditorName || "",
            teamAuditorIds: teamIds,
            teamAuditorNames: first.teamAuditorNames || [],
            documentRevision: first.documentRevision || "1.0",
            preparedBy:
              first.preparedByName ||
              userRef.current?.name ||
              userRef.current?.username ||
              "",
            approvedBy: first.approvedByName || "",
          });
        }
      } else {
        setApprovalStatus("NOT_APPROVED");
      }
      setAuditNumber(`INT/${selectedYear}/01`);
      const auditTypesSet = new Set<string>();
      allSchedules.forEach((schedule: any) => {
        if (schedule.auditElements) {
          let auditElements: string[] = [];
          if (typeof schedule.auditElements === "string") {
            try {
              auditElements = JSON.parse(schedule.auditElements);
            } catch (_e) {
              auditElements = [];
            }
          } else if (Array.isArray(schedule.auditElements)) {
            auditElements = schedule.auditElements;
          }
          auditElements.forEach((element) => {
            if (element && element.trim()) auditTypesSet.add(element);
          });
        }
      });
      const auditTypes = Array.from(auditTypesSet);
      setGlobalAuditTypesList(auditTypes);
      setGlobalAuditType((prev) => (prev ? prev : auditTypes[0] || ""));
    } catch (error) {
      console.error("Error fetching basic schedules:", error);
      setApprovalStatus("ERROR");
    }
  }, [selectedYear, selectedMonth]);

  const fetchDetailedSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const response = await auditScheduleApi.getDateSchedulesByMonth(
        selectedYear,
        selectedMonth as any,
      );
      const dateSchedules = response.data || [];
      const processedSchedules = dateSchedules.map((schedule: any) => {
        if ((!schedule.startTime || !schedule.endTime) && schedule.remarks) {
          try {
            const remarks = JSON.parse(schedule.remarks);
            if (remarks.startTime) schedule.startTime = remarks.startTime;
            if (remarks.endTime) schedule.endTime = remarks.endTime;
            if (remarks.isSpecialEvent)
              schedule.isSpecialEvent = remarks.isSpecialEvent;
            if (remarks.specialEventType)
              schedule.specialEventType = remarks.specialEventType;
          } catch (_e) {}
        }
        if (schedule.departments && typeof schedule.departments === "string") {
          try {
            schedule.departments = JSON.parse(schedule.departments);
          } catch (_e) {
            schedule.departments = [];
          }
        }
        return schedule;
      });
      setAuditSchedules(processedSchedules);
      if (processedSchedules.length > 0) {
        const dates = [
          ...new Set(processedSchedules.map((s: any) => s.scheduledDate)),
        ].sort();
        if (dates.length > 0) {
          setStartDate((prev) => (prev ? prev : String(dates[0])));
          setEndDate((prev) => (prev ? prev : String(dates[dates.length - 1])));
        }
      }
    } catch (error) {
      console.error("Error fetching detailed schedules:", error);
      setAuditSchedules([]);
    }
  }, [selectedYear, selectedMonth]);

  const checkTimeConflict = (
    date: string,
    startTime: string,
    endTime: string,
    auditorId: string,
    auditeeId: string,
    isSpecialEvent: boolean,
    specialEventType: string,
    excludeId: number | null = null,
  ): { type: string; conflict: Schedule } | null => {
    const dateSchedules = auditSchedules.filter(
      (s) => s.scheduledDate === date || s.date === date,
    );
    if (isSpecialEvent && specialEventType !== "LUNCH") {
      const overlappingEvent = dateSchedules.find((schedule) => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType !== "LUNCH") {
          const s1Start = convertToMinutes(startTime);
          const s1End = convertToMinutes(endTime);
          const s2Start = convertToMinutes(schedule.startTime);
          const s2End = convertToMinutes(schedule.endTime);
          return s1Start < s2End && s1End > s2Start;
        }
        return false;
      });
      if (overlappingEvent)
        return { type: "event", conflict: overlappingEvent };
    }
    if (auditorId && !isSpecialEvent) {
      const auditorConflict = dateSchedules.find((schedule) => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.auditorId !== parseInt(auditorId)) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType === "LUNCH")
          return false;
        const s1Start = convertToMinutes(startTime);
        const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return s1Start < s2End && s1End > s2Start;
      });
      if (auditorConflict)
        return { type: "auditor", conflict: auditorConflict };
    }
    if (auditeeId && !isSpecialEvent) {
      const auditeeConflict = dateSchedules.find((schedule) => {
        if (excludeId && schedule.id === excludeId) return false;
        if (schedule.auditeeId !== parseInt(auditeeId)) return false;
        if (schedule.isSpecialEvent && schedule.specialEventType === "LUNCH")
          return false;
        const s1Start = convertToMinutes(startTime);
        const s1End = convertToMinutes(endTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return s1Start < s2End && s1End > s2Start;
      });
      if (auditeeConflict)
        return { type: "auditee", conflict: auditeeConflict };
    }
    return null;
  };

  // ═════ HANDLERS ═════
  const handleAuditDepartmentChange = async (departmentCode: string) => {
    setSelectedAuditDepartment(departmentCode);
    const teamInfo = getTeamMembersForDepartment(
      departmentCode,
      formData.date,
      globalAuditType,
    );
    setDepartmentTeamInfo(teamInfo);
    await fetchDepartmentUsers(departmentCode);
    setFormData((prev) => ({ ...prev, auditorId: "", auditeeId: "" }));
  };

  const handleSave = async () => {
    if (formData.id) {
      const existingSchedule = auditSchedules.find((s) => s.id === formData.id);
      if (existingSchedule?.detailedApprovalStatus === "APPROVED") {
        showToast("Cannot edit an approved schedule", "warning");
        return;
      }
    }
    if (!formData.date || !formData.startTime || !formData.endTime) {
      showToast("Please fill date and time", "error");
      return;
    }
    if (formData.isSpecialEvent) {
      if (!formData.specialEventType) {
        showToast("Please select event type", "error");
        return;
      }
      if (formData.specialEventType !== "LUNCH") {
        if (!formData.auditorId || !formData.auditeeId) {
          showToast(
            "Please select Auditor and Auditee for Opening/Closing Meeting",
            "error",
          );
          return;
        }
      }
    } else {
      if (
        !formData.selectedDepartments ||
        formData.selectedDepartments.length === 0
      ) {
        showToast("Please select at least one department", "error");
        return;
      }
      const auditTypeToUse = formData.auditType || globalAuditType;
      if (!auditTypeToUse) {
        showToast("Please select Audit Type", "error");
        return;
      }
      if (!formData.auditorId || !formData.auditeeId) {
        showToast("Please select Auditor and Auditee", "error");
        return;
      }
    }
    if (!formData.isSpecialEvent && formData.auditorId && formData.auditeeId) {
      const conflict = checkTimeConflict(
        formData.date,
        formData.startTime,
        formData.endTime,
        formData.auditorId,
        formData.auditeeId,
        formData.isSpecialEvent,
        formData.specialEventType,
        formData.id,
      );
      if (conflict) {
        if (conflict.type === "auditor") {
          showToast(
            `❌ Conflict: Auditor ${conflict.conflict.auditorName} already scheduled`,
            "error",
          );
        } else if (conflict.type === "auditee") {
          showToast(
            `❌ Conflict: Auditee ${conflict.conflict.auditeeName} already scheduled`,
            "error",
          );
        }
        return;
      }
    }
    setSaving(true);
    try {
      const auditTypeToUse = formData.auditType || globalAuditType;
      const saveData = {
        id: formData.id,
        planYear: selectedYear,
        month: selectedMonth,
        department:
          formData.selectedDepartments?.map((d) => d.department).join(", ") ||
          "General",
        week: getWeekNumber(formData.date),
        scheduledDate: formData.date,
        timeSlot: `${formData.startTime} - ${formData.endTime}`,
        startTime: formData.startTime,
        endTime: formData.endTime,
        fromDate: startDate,
        toDate: endDate,
        auditorId:
          formData.auditorId && formData.specialEventType !== "LUNCH"
            ? parseInt(formData.auditorId)
            : null,
        auditeeId:
          formData.auditeeId && formData.specialEventType !== "LUNCH"
            ? parseInt(formData.auditeeId)
            : null,
        status: formData.status,
        departments:
          formData.selectedDepartments?.map((d) => d.department) || [],
        auditElements:
          formData.selectedDepartments?.flatMap((d) => d.selectedElements) ||
          [],
        selectedDepartments: formData.selectedDepartments || [],
        isSpecialEvent: formData.isSpecialEvent || false,
        specialEventType: formData.specialEventType || "",
        auditType: auditTypeToUse,
        auditNumber: auditNumber,
        preparedByName:
          headerData.preparedBy || user?.name || user?.username || "",
        preparedByPosition: "Audit Manager",
      };
      if (formData.id) {
        await auditScheduleApi.updateDetailedSchedule(
          formData.id,
          saveData,
          getUserIdAsNumber(),
        );
        showToast("Schedule updated successfully!", "success");
      } else {
        await auditScheduleApi.saveDetailedSchedule(
          saveData,
          getUserIdAsNumber(),
        );
        showToast("Schedule added successfully!", "success");
      }
      setShowModal(false);
      resetForm();
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      showToast(
        error.response?.data?.message || "Failed to save schedule",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSchedule = async () => {
    if (!bulkData.fromDate || !bulkData.toDate) {
      showToast("Please select From Date and To Date", "error");
      return;
    }
    const fromDate = new Date(bulkData.fromDate);
    const toDate = new Date(bulkData.toDate);
    if (fromDate > toDate) {
      showToast("From Date must be before To Date", "error");
      return;
    }
    if (bulkData.isSpecialEvent) {
      if (!bulkData.specialEventType) {
        showToast("Please select event type", "error");
        return;
      }
      if (bulkData.specialEventType !== "LUNCH") {
        if (!bulkData.auditorId || !bulkData.auditeeId) {
          showToast(
            "Please select Auditor and Auditee for Opening/Closing Meeting",
            "error",
          );
          return;
        }
      }
    } else {
      if (
        !bulkData.selectedDepartments ||
        bulkData.selectedDepartments.length === 0
      ) {
        showToast(
          "Please select at least one department with audit elements",
          "error",
        );
        return;
      }
      const hasElements = bulkData.selectedDepartments.some(
        (d) => d.selectedElements && d.selectedElements.length > 0,
      );
      if (!hasElements) {
        showToast(
          "Please select at least one audit element for the selected departments",
          "error",
        );
        return;
      }
      if (!bulkData.auditorId || !bulkData.auditeeId) {
        showToast("Please select Auditor and Auditee", "error");
        return;
      }
    }
    setSaving(true);
    try {
      const firstDate = new Date(fromDate);
      const scheduledDateStr = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, "0")}-${String(firstDate.getDate()).padStart(2, "0")}`;
      const saveData = {
        id: null,
        planYear: selectedYear,
        month: selectedMonth,
        department: bulkData.isSpecialEvent
          ? bulkData.specialEventType === "OPENING"
            ? "Opening Meeting"
            : bulkData.specialEventType === "CLOSING"
              ? "Closing Meeting"
              : "Lunch Break"
          : bulkData.selectedDepartments?.map((d) => d.department).join(", ") ||
            "General",
        week: getWeekNumber(scheduledDateStr),
        scheduledDate: scheduledDateStr,
        fromDate: bulkData.fromDate,
        toDate: bulkData.toDate,
        timeSlot: `${bulkData.startTime} - ${bulkData.endTime}`,
        startTime: bulkData.startTime,
        endTime: bulkData.endTime,
        auditorId:
          bulkData.auditorId && bulkData.specialEventType !== "LUNCH"
            ? parseInt(bulkData.auditorId)
            : null,
        auditeeId:
          bulkData.auditeeId && bulkData.specialEventType !== "LUNCH"
            ? parseInt(bulkData.auditeeId)
            : null,
        status: bulkData.status,
        departments: bulkData.isSpecialEvent
          ? []
          : bulkData.selectedDepartments?.map((d) => d.department) || [],
        auditElements: bulkData.isSpecialEvent
          ? []
          : bulkData.selectedDepartments?.flatMap((d) => d.selectedElements) ||
            [],
        selectedDepartments: bulkData.isSpecialEvent
          ? []
          : bulkData.selectedDepartments || [],
        isSpecialEvent: bulkData.isSpecialEvent || false,
        specialEventType: bulkData.specialEventType || "",
        auditType: bulkData.auditType || globalAuditType,
        auditNumber: auditNumber,
        preparedByName:
          headerData.preparedBy || user?.name || user?.username || "",
        preparedByPosition: "Audit Manager",
      };
      await auditScheduleApi.saveDetailedSchedule(
        saveData,
        getUserIdAsNumber(),
      );
      showToast(
        `✅ Schedule created for date range ${bulkData.fromDate} to ${bulkData.toDate}`,
        "success",
      );
      setShowBulkModal(false);
      resetBulkForm();
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      showToast("Failed to create schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAllDraftSchedules = async () => {
    const userId = getUserIdAsNumber();
    if (!userId) {
      showToast("Logged-in user is invalid", "error");
      return;
    }
    const draftSchedules = filteredAuditSchedules.filter(
      (s) => s.id != null && isSubmittableDraft(s.detailedApprovalStatus),
    );
    if (draftSchedules.length === 0) {
      const message = globalAuditType
        ? `No draft schedules to submit for "${globalAuditType}"`
        : "No draft schedules to submit";
      showToast(message, "warning");
      return;
    }
    const submitDrafts = async () => {
      setSubmitting(true);
      let successCount = 0;
      let failCount = 0;
      try {
        for (const schedule of draftSchedules) {
          try {
            if (!schedule.id) continue;
            await auditScheduleApi.submitScheduleForApproval(
              schedule.id,
              userId,
            );
            successCount++;
          } catch (error: any) {
            console.error(`Failed to submit schedule ${schedule.id}:`, error);
            failCount++;
          }
        }
        if (successCount > 0 && failCount === 0) {
          showToast(
            `✅ ${successCount} schedule(s) submitted for approval!`,
            "success",
          );
        } else if (successCount > 0 && failCount > 0) {
          showToast(
            `⚠️ ${successCount} submitted, ${failCount} failed`,
            "warning",
          );
        } else {
          showToast(
            "❌ Failed to submit any schedules. Check console/network.",
            "error",
          );
        }
        await fetchDetailedSchedules();
      } catch (error) {
        console.error("Error in submit all:", error);
        showToast("An unexpected error occurred", "error");
      } finally {
        setSubmitting(false);
      }
    };
    const confirmMessage = `Are you sure you want to submit ${draftSchedules.length} draft schedule(s) for "${globalAuditType || "All"}"?`;
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" &&
        typeof (window as any).confirm === "function"
          ? (window as any).confirm(confirmMessage)
          : true;
      if (confirmed) await submitDrafts();
      return;
    }
    Alert.alert("Confirm Submit", confirmMessage, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        onPress: async () => {
          await submitDrafts();
        },
      },
    ]);
  };

 // =====================================================
// ✅ FIXED: handleDelete function (Works on Web + Mobile)
// =====================================================
const handleDelete = (id: number) => {
  console.log("🗑️ Delete function called for ID:", id);
  
  if (!id) {
    showToast("Invalid schedule ID", "error");
    return;
  }

  const scheduleToDelete = auditSchedules.find((s) => s.id === id);
  console.log("📋 Schedule found:", scheduleToDelete);

  if (!scheduleToDelete) {
    showToast("Schedule not found", "error");
    return;
  }

  // Check if schedule can be deleted
  if (scheduleToDelete.detailedApprovalStatus === "APPROVED") {
    showToast("Cannot delete an approved schedule", "warning");
    return;
  }

  if (scheduleToDelete.detailedApprovalStatus === "PENDING_APPROVAL") {
    showToast("Cannot delete a schedule pending approval", "warning");
    return;
  }

  // ✅ Confirmation dialog - works on BOTH web and mobile
  const confirmAndDelete = () => {
    console.log("🗑️ Confirming delete for schedule:", id);
    
    // ✅ WEB: Use browser confirm
    if (Platform.OS === "web") {
      const isConfirmed = window.confirm(
        "Are you sure you want to delete this schedule?"
      );
      if (isConfirmed) {
        performDelete(id);
      }
      return;
    }

    // ✅ MOBILE: Use Alert
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(id),
        },
      ]
    );
  };

  confirmAndDelete();
};

// ✅ Separate function to perform the actual API call
const performDelete = async (id: number) => {
  console.log("🗑️ Performing delete for ID:", id);
  try {
    await auditScheduleApi.delete(id);
    showToast("✅ Schedule deleted successfully!", "success");
    await fetchDetailedSchedules();
  } catch (error: any) {
    console.error("❌ Error deleting schedule:", error);
    showToast(
      error.response?.data?.message || "Failed to delete schedule",
      "error"
    );
  }
};

  const handleSubmitScheduleForApproval = async (scheduleId: number) => {
    setSubmitting(true);
    try {
      await auditScheduleApi.submitScheduleForApproval(
        scheduleId,
        getUserIdAsNumber(),
      );
      showToast("Schedule submitted for approval!", "success");
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error submitting schedule:", error);
      showToast(
        error.response?.data?.message || "Failed to submit schedule",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSchedule = async (scheduleId: number) => {
    setSubmitting(true);
    try {
      await auditScheduleApi.approveSchedule(
        scheduleId,
        getUserIdAsNumber(),
        approvalComment,
      );
      showToast("Schedule approved successfully!", "success");
      setApprovalComment("");
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error approving schedule:", error);
      showToast(
        error.response?.data?.message || "Failed to approve schedule",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSchedule = async (scheduleId: number) => {
    if (!rejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSchedule(
        scheduleId,
        getUserIdAsNumber(),
        rejectionReason,
      );
      showToast("Schedule rejected", "error");
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedRejectDate(null);
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error rejecting schedule:", error);
      showToast(
        error.response?.data?.message || "Failed to reject schedule",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async (scheduleId: number) => {
    if (!changeRequestReason.trim()) {
      showToast("Please provide a reason for changes", "error");
      return;
    }
    setSubmitting(true);
    try {
      const url = `${API_BASE_URL}/api/audit-schedule/detailed/${scheduleId}/request-changes?userId=${getUserIdAsNumber()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: changeRequestReason }),
      });
      if (!response.ok) throw new Error("Failed to request changes");
      showToast(`Change request submitted for schedule`, "warning");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error requesting changes:", error);
      showToast("Failed to submit change request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Date",
      "Day",
      "Start Time",
      "End Time",
      "Departments/Event",
      "Audit Type",
      "Auditor",
      "Auditee",
      "Status",
    ];
    const rows = auditSchedules.map((s) => [
      s.scheduledDate || s.date,
      new Date(s.scheduledDate || s.date || "").toLocaleDateString("en-US", {
        weekday: "long",
      }),
      s.startTime,
      s.endTime,
      s.isSpecialEvent
        ? s.specialEventType
        : Array.isArray(s.departments)
          ? s.departments.join(", ")
          : s.departments,
      s.auditType || globalAuditType || "-",
      s.auditorName || "-",
      s.auditeeName || "-",
      s.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    showToast("Schedule exported successfully!", "success");
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadPdf = async () => {
    if (!selectedMonth) {
      showToast("Please select a month first", "warning");
      return;
    }
    setDownloadingPdf(true);
    try {
      const response = await auditScheduleApi.downloadDetailedViewPdf(
        selectedYear,
        selectedMonth as any,
        {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          auditType: globalAuditType || undefined,
        },
      );
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: "application/pdf" });
      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Form5_Detailed_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast("Detailed schedule PDF downloaded successfully!", "success");
      } else {
        const base64Data = await blobToBase64(blob);
        const fileUri = `${FileSystem.documentDirectory}Form5_Detailed_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Save or Share Detailed Audit Schedule",
            UTI: "com.adobe.pdf",
          });
          showToast("PDF ready to save/share!", "success");
        } else {
          showToast("PDF downloaded to app directory.", "success");
        }
      }
    } catch (error: any) {
      console.error("Error downloading detailed schedule PDF:", error);
      showToast(
        error.response?.data?.message ||
          error.message ||
          "Failed to download detailed schedule PDF",
        "error",
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      date: "",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      selectedDepartments: [],
      auditorId: "",
      auditeeId: "",
      isSpecialEvent: false,
      specialEventType: "",
      auditType: globalAuditType,
      status: "SCHEDULED",
    });
    setConflictWarning(null);
    setEditingSchedule(null);
    setSelectedAuditDepartment("");
    setDepartmentAuditors([]);
    setDepartmentAuditees([]);
  };

  const resetBulkForm = () => {
    setBulkData({
      fromDate: "",
      toDate: "",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      selectedDepartments: [],
      auditorId: "",
      auditeeId: "",
      auditType: "",
      status: "SCHEDULED",
      isSpecialEvent: false,
      specialEventType: "",
    });
  };

  const handleAddSchedule = (dateStr: string) => {
    if (!canEdit) {
      showToast("You do not have permission to add schedules", "warning");
      return;
    }
    setFormData({
      id: null,
      date: dateStr || "",
      startTime: "09:00 AM",
      endTime: "10:00 AM",
      selectedDepartments: [],
      auditorId: "",
      auditeeId: "",
      isSpecialEvent: false,
      specialEventType: "",
      auditType: globalAuditType,
      status: "SCHEDULED",
    });
    setConflictWarning(null);
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    if (!canEdit) {
      showToast("You do not have permission to edit schedules", "warning");
      return;
    }
    if (schedule.detailedApprovalStatus === "APPROVED") {
      showToast("Cannot edit an approved schedule", "warning");
      return;
    }
    let selectedDepartments: {
      department: string;
      selectedElements: string[];
    }[] = [];
    if (
      schedule.selectedDepartments &&
      Array.isArray(schedule.selectedDepartments) &&
      schedule.selectedDepartments.length > 0
    ) {
      selectedDepartments = schedule.selectedDepartments;
    } else if (
      schedule.departments &&
      Array.isArray(schedule.departments) &&
      schedule.departments.length > 0
    ) {
      selectedDepartments = schedule.departments.map((dept) => ({
        department: dept,
        selectedElements: (schedule.auditElements as string[]) || [],
      }));
    } else if (
      schedule.department &&
      schedule.department !== "General" &&
      !schedule.isSpecialEvent
    ) {
      selectedDepartments = [
        {
          department: schedule.department,
          selectedElements: (schedule.auditElements as string[]) || [],
        },
      ];
    }
    let departmentToSelect = "";
    if (selectedDepartments.length > 0)
      departmentToSelect = selectedDepartments[0].department;
    else if (schedule.department && schedule.department !== "General")
      departmentToSelect = schedule.department;
    setFormData({
      id: schedule.id || null,
      date: schedule.scheduledDate || schedule.date || "",
      startTime: schedule.startTime || "09:00 AM",
      endTime: schedule.endTime || "10:00 AM",
      selectedDepartments: selectedDepartments,
      auditorId: schedule.auditorId?.toString() || "",
      auditeeId: schedule.auditeeId?.toString() || "",
      isSpecialEvent: schedule.isSpecialEvent || false,
      specialEventType: schedule.specialEventType || "",
      auditType: schedule.auditType || globalAuditType,
      status: schedule.status || "SCHEDULED",
    });
    setSelectedAuditDepartment(departmentToSelect);
    if (departmentToSelect) {
      const teamInfo = getTeamMembersForDepartment(
        departmentToSelect,
        schedule.scheduledDate || schedule.date || null,
        schedule.auditType || globalAuditType,
      );
      setDepartmentTeamInfo(teamInfo);
      fetchDepartmentUsers(departmentToSelect);
    }
    setShowModal(true);
  };

  // ═════ EFFECTS ═════
  useEffect(() => {
    if (bulkSelectedAuditDepartment) {
      fetchDepartmentUsers(bulkSelectedAuditDepartment);
      const enumValue =
        departmentDisplayToEnum[bulkSelectedAuditDepartment] ||
        bulkSelectedAuditDepartment.toUpperCase().replace(/[&\s/]+/g, "_");
      const fetchBulkDepartmentUsers = async () => {
        try {
          const auditorsUrl = `${API_BASE_URL}/api/audit-schedule/auditors/by-department/${encodeURIComponent(enumValue)}`;
          const auditorsRes = await fetch(auditorsUrl);
          const auditorsData = await auditorsRes.json();
          setBulkDepartmentAuditors(
            Array.isArray(auditorsData)
              ? auditorsData
              : auditorsData.data || [],
          );
          const auditeesUrl = `${API_BASE_URL}/api/audit-schedule/auditees/by-department/${encodeURIComponent(enumValue)}`;
          const auditeesRes = await fetch(auditeesUrl);
          const auditeesData = await auditeesRes.json();
          setBulkDepartmentAuditees(
            Array.isArray(auditeesData)
              ? auditeesData
              : auditeesData.data || [],
          );
        } catch (error) {
          console.error("Error fetching bulk department users:", error);
        }
      };
      fetchBulkDepartmentUsers();
    }
  }, [bulkSelectedAuditDepartment]);

  useEffect(() => {
    if (showModal && formData.date && formData.startTime && formData.endTime) {
      if (formData.isSpecialEvent && formData.specialEventType === "LUNCH") {
        setConflictWarning(null);
        return;
      }
      let checkAuditorId: string | null = null;
      let checkAuditeeId: string | null = null;
      if (!formData.isSpecialEvent) {
        checkAuditorId = formData.auditorId;
        checkAuditeeId = formData.auditeeId;
      } else if (formData.specialEventType !== "LUNCH") {
        checkAuditorId = formData.auditorId;
        checkAuditeeId = formData.auditeeId;
      }
      if (checkAuditorId || checkAuditeeId) {
        const conflict = checkTimeConflict(
          formData.date,
          formData.startTime,
          formData.endTime,
          checkAuditorId || "",
          checkAuditeeId || "",
          formData.isSpecialEvent,
          formData.specialEventType,
          formData.id,
        );
        setConflictWarning(conflict);
      } else {
        setConflictWarning(null);
      }
    }
  }, [
    showModal,
    formData.date,
    formData.startTime,
    formData.endTime,
    formData.auditorId,
    formData.auditeeId,
    formData.isSpecialEvent,
    formData.specialEventType,
    formData.id,
  ]);

  // ✅ Auto-fill defaults on first load
  useEffect(() => {
    const limits = getDateLimits();
    if (!limits) return;
    if (!startDate && !endDate) {
      setStartDate(limits.min);
      setEndDate(limits.max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, selectedMonth, selectedYear]);

  // ✅ Clamp dates if they fall outside month/week boundaries
  useEffect(() => {
    const limits = getDateLimits();
    if (!limits) return;

    if (startDate) {
      if (startDate < limits.min) setStartDate(limits.min);
      else if (startDate > limits.max) setStartDate(limits.max);
    }
    if (endDate) {
      if (endDate < limits.min || endDate > limits.max) setEndDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, selectedMonth, selectedYear]);

  // ✅ Clear To Date if it's before From Date
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate("");
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchUsers();
      await fetchBasicSchedules();
      await fetchDetailedSchedules();
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchBasicSchedules, fetchDetailedSchedules]);

  // ═════ COMPUTED VALUES ═════
  const availableAuditors = getAvailableAuditors();
  const canEdit = isAuditManager && approvalStatus === "APPROVED";
  const canApprove = isTopManagement;
  const hasSchedules = auditSchedules.length > 0;
  const dateRange = generateDateRange();

  const getBulkDateLimits = useCallback(() => {
    // If From Date is selected → lock to that week
    if (bulkData.fromDate) {
      const weekNum = getWeekNumber(bulkData.fromDate);
      return getWeekLimits(weekNum);
    }
    // Before any date is picked → allow full month
    return getMonthLimits();
  }, [bulkData.fromDate, getWeekLimits, getMonthLimits]);

  const bulkDateLimits = getDateLimits();

  const bulkFromMaxDate = bulkDateLimits?.max;
  const bulkToMinDate = bulkData.fromDate || bulkDateLimits?.min;

  const bulkFromMinDate = bulkDateLimits?.min;
  const bulkRawFromMaxDate = bulkDateLimits
    ? bulkData.toDate && bulkData.toDate < bulkDateLimits.max
      ? bulkData.toDate
      : bulkDateLimits.max
    : undefined;
  const bulkSafeFromMaxDate =
    bulkFromMinDate &&
    bulkRawFromMaxDate &&
    bulkRawFromMaxDate < bulkFromMinDate
      ? bulkFromMinDate
      : bulkRawFromMaxDate;
  const bulkRawToMinDate = bulkDateLimits
    ? bulkData.fromDate
      ? bulkData.fromDate
      : bulkDateLimits.min
    : undefined;
  const bulkToMaxDate = bulkDateLimits?.max;
  const bulkSafeToMinDate =
    bulkRawToMinDate && bulkToMaxDate && bulkRawToMinDate > bulkToMaxDate
      ? bulkToMaxDate
      : bulkRawToMinDate;
  const isBulkToDateDisabled =
    !bulkData.fromDate ||
    Boolean(
      bulkRawToMinDate && bulkToMaxDate && bulkRawToMinDate > bulkToMaxDate,
    );
  const bulkTeamInfo = getTeamMembersForDepartment(
    bulkSelectedAuditDepartment,
    bulkData.fromDate,
    globalAuditType,
  );
  const dateLimits = getDateLimits();

  const fromMaxDate = dateLimits?.max;

  // To Date: min = selected startDate (if any), max = month/week end
  const toMinDate = startDate || dateLimits?.min;

  const fromMinDate = dateLimits?.min;
  const rawFromMaxDate = dateLimits
    ? endDate && endDate < dateLimits.max
      ? endDate
      : dateLimits.max
    : undefined;
  const safeFromMaxDate =
    fromMinDate && rawFromMaxDate && rawFromMaxDate < fromMinDate
      ? fromMinDate
      : rawFromMaxDate;
  const rawToMinDate = dateLimits
    ? startDate
      ? startDate
      : dateLimits.min
    : undefined;
  const toMaxDate = dateLimits?.max;
  const safeToMinDate =
    rawToMinDate && toMaxDate && rawToMinDate > toMaxDate
      ? toMaxDate
      : rawToMinDate;
  const isToDateDisabled =
    !startDate ||
    Boolean(rawToMinDate && toMaxDate && rawToMinDate > toMaxDate);

  // ═════ REAL WORKING DATE PICKER ═════
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

    // ✅ WEB: Use native HTML date input
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

    // ✅ MOBILE: Use DateTimePicker
    // ✅ MOBILE: Use DateTimePicker (Fixed for iOS Modal)
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
    
    {showPicker && Platform.OS === "ios" ? (
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={{ color: COLORS.accent, fontSize: 16, fontWeight: "700" }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="spinner"
              onChange={(event: any, selectedDate: any) => {
                if (selectedDate) {
                  const isoDate = toISODate(selectedDate);
                  onChange(getSafeDate(isoDate));
                }
              }}
            />
          </View>
        </View>
      </Modal>
    ) : (
      showPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="calendar"
          onChange={(event: any, selectedDate: any) => {
            setShowPicker(false);
            if (selectedDate) {
              const isoDate = toISODate(selectedDate);
              onChange(getSafeDate(isoDate));
            }
          }}
        />
      )
    )}
  </>
);
  };

  // ═════ RENDER ═════
  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text className="mt-3 text-sm text-gray-500">Loading schedule...</Text>
      </View>
    );
  }

  if (approvalStatus !== "APPROVED") {
    return (
      <View className="flex-1 p-6 bg-gray-50">
        <View className="max-w-2xl mx-auto">
          <TouchableOpacity
            onPress={onBack || (() => router.back())}
            className="flex-row items-center gap-2 mb-6"
          >
            <ArrowLeft size={18} color={COLORS.accent} />
            <Text className="text-sm font-semibold text-blue-600">
              Back to Form 5
            </Text>
          </TouchableOpacity>
          <Card className="items-center p-12">
            <View className="items-center justify-center w-20 h-20 mb-4 border border-yellow-200 rounded-full bg-yellow-50">
              <AlertCircle size={40} color={COLORS.warning} />
            </View>
            <Text className="mb-2 text-xl font-bold text-gray-900">
              Form 5 Not Approved Yet
            </Text>
            <Text className="mb-6 text-sm text-center text-gray-500">
              Please complete and get approval for the basic schedule in Form 5
              first.{"\n"}
              {monthDisplay[selectedMonth]} {selectedYear} is not approved.
            </Text>
            <ActionButton
              onPress={onBack || (() => router.back())}
              color="#FFF"
              bgColor={COLORS.accent}
            >
              Go to Form 5
            </ActionButton>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={{
          width: "100%",
          paddingHorizontal: isDesktop ? 24 : 16,
          paddingVertical: isDesktop ? 20 : 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center" }}>
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: isDesktop ? "center" : "stretch",
              justifyContent: isDesktop ? "space-between" : "flex-start",
              gap: isDesktop ? 24 : 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 1,
              }}
            >
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                style={{
                  width: 40,
                  height: 40,
                  marginRight: 12,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={20} color="#6b7280" />
              </TouchableOpacity>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: COLORS.accentLight,
                  borderWidth: 1,
                  borderColor: COLORS.accentBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={22} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontSize: isDesktop ? 20 : 18,
                    fontWeight: "700",
                    color: "#111827",
                  }}
                  numberOfLines={1}
                >
                  Internal Audit Schedule
                </Text>
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {monthDisplay[selectedMonth]} {selectedYear}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                justifyContent: isDesktop ? "flex-end" : "flex-start",
              }}
            >
              <ActionButton
                onPress={handleDownloadPdf}
                loading={downloadingPdf}
                color="#FFF"
                bgColor={COLORS.accent}
                icon={Printer}
                className="h-10"
              >
                PDF
              </ActionButton>
              <ActionButton
                onPress={handleExport}
                color="#FFF"
                bgColor={COLORS.accent}
                icon={Download}
                className="h-10"
              >
                Export
              </ActionButton>
              <TouchableOpacity
                onPress={() => {
                  fetchDetailedSchedules();
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RefreshCw size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 1400,
                alignSelf: "center",
                width: "100%",
                padding: 24,
              }
            : { padding: 16 }
        }
        showsVerticalScrollIndicator={false}
      >
        <Card className="p-4">
          <View className="flex-row items-center gap-2 mb-4">
            <Calendar size={16} color={COLORS.accent} />
            <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
              Date Range
            </Text>
          </View>
          <View
            style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}
          >
            <View style={{ flex: 1 }}>
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                From Date
              </Text>
              <DatePickerField
                value={startDate}
                onChange={(dateStr) => {
                  setStartDate(dateStr);
                  if (endDate && dateStr && endDate < dateStr) {
                    setEndDate("");
                  }
                }}
                minDate={fromMinDate}
                maxDate={fromMaxDate}
                placeholder="Select Start Date"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                To Date
              </Text>
              <DatePickerField
                value={endDate}
                onChange={(dateStr) => setEndDate(dateStr)}
                minDate={toMinDate}
                maxDate={toMaxDate}
                disabled={isToDateDisabled}
                placeholder={
                  !startDate ? "Select From Date first" : "Select End Date"
                }
              />
            </View>
          </View>
        </Card>

        {/* Audit Type Filter */}
        <Card className="p-4">
          <View className="flex-row flex-wrap items-center gap-4">
            <Text className="text-sm font-semibold text-gray-900">
              Audit Type:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => setGlobalAuditType("")}
                className={`px-4 py-2 rounded-full border ${!globalAuditType ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}
              >
                <Text
                  className={`text-sm font-medium ${!globalAuditType ? "text-blue-600" : "text-gray-700"}`}
                >
                  All Types
                </Text>
              </TouchableOpacity>
              {globalAuditTypesList.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setGlobalAuditType(type)}
                  className={`px-4 py-2 rounded-full border ${globalAuditType === type ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}
                >
                  <Text
                    className={`text-sm font-medium ${globalAuditType === type ? "text-blue-600" : "text-gray-700"}`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Schedule Table */}
        <Card className="w-full overflow-hidden">
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <View style={{ width: 1350 }}>
              {/* Table Header */}
              <View className="flex-row border-b border-gray-200 bg-gray-50">
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Date & Time
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Area / Dept / Event
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Auditor
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Auditee
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Status
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-xs font-bold tracking-wider text-center text-gray-900 uppercase">
                    Actions
                  </Text>
                </View>
              </View>

              {/* Table Body */}
              {dateRange.map((dateInfo, idx) => {
                const daySchedules = getSchedulesForDate(dateInfo.dateStr);
                const isWeekend = dateInfo.isWeekend;
                if (isWeekend) {
                  return (
                    <View
                      key={idx}
                      className="flex-row border-b border-gray-200 bg-gray-50"
                    >
                      <View style={{ flex: 1 }} className="p-4">
                        <Text className="text-sm font-medium text-gray-500">
                          {dateInfo.displayDate}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {dateInfo.dayOfWeek}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} className="p-4">
                        <Text className="text-sm italic text-gray-400">
                          Weekend
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                    </View>
                  );
                }
                return (
                  <View key={idx}>
                    {/* Date Group Header */}
                    <View className="flex-row border-b border-gray-200 bg-gray-50">
                      <View style={{ flex: 1 }} className="p-4">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-sm font-bold text-gray-900">
                            {dateInfo.displayDate}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            {dateInfo.dayOfWeek}
                          </Text>
                          {daySchedules.length > 0 && (
                            <View className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                              <Text className="text-xs font-semibold text-blue-700">
                                {
                                  daySchedules.filter(
                                    (s) =>
                                      s.detailedApprovalStatus === "APPROVED",
                                  ).length
                                }
                                /{daySchedules.length} Approved
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                      <View style={{ flex: 1 }} className="p-4" />
                    </View>

                    {daySchedules.length === 0 ? (
                      <View className="flex-row bg-white border-b border-gray-200">
                        <View style={{ flex: 1 }} className="p-4">
                          <Text className="text-sm text-gray-900">
                            {dateInfo.displayDate}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }} className="p-4">
                          <Text className="text-sm italic text-gray-400">
                            No schedules
                          </Text>
                        </View>
                        <View style={{ flex: 1 }} className="p-4" />
                        <View style={{ flex: 1 }} className="p-4" />
                        <View style={{ flex: 1 }} className="p-4" />
                        <View style={{ flex: 1 }} className="items-center p-4">
                          {canEdit && (
                            <TouchableOpacity
                              onPress={() =>
                                handleAddSchedule(dateInfo.dateStr)
                              }
                              className="items-center justify-center border border-blue-200 rounded-full w-9 h-9 bg-blue-50"
                            >
                              <Plus size={18} color={COLORS.accent} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ) : (
                      daySchedules.map((schedule, sIdx) => {
                        const statusStyle =
                          schedule.status === "COMPLETED"
                            ? {
                                bg: COLORS.successLight,
                                color: "#065F46",
                                border: COLORS.successBorder,
                              }
                            : schedule.status === "IN_PROGRESS"
                              ? {
                                  bg: COLORS.accentLight,
                                  color: "#1E40AF",
                                  border: COLORS.accentBorder,
                                }
                              : {
                                  bg: COLORS.warningLight,
                                  color: "#92400E",
                                  border: COLORS.warningBorder,
                                };
                        const approvalStyle =
                          schedule.detailedApprovalStatus === "APPROVED"
                            ? {
                                bg: COLORS.successLight,
                                color: "#065F46",
                                border: COLORS.successBorder,
                              }
                            : schedule.detailedApprovalStatus ===
                                "PENDING_APPROVAL"
                              ? {
                                  bg: COLORS.warningLight,
                                  color: "#92400E",
                                  border: COLORS.warningBorder,
                                }
                              : schedule.detailedApprovalStatus === "REJECTED"
                                ? {
                                    bg: COLORS.errorLight,
                                    color: "#991B1B",
                                    border: COLORS.errorBorder,
                                  }
                                : {
                                    bg: "#F1F5F9",
                                    color: "#475569",
                                    border: "#E2E8F0",
                                  };
                        return (
                          <View
                            key={`${idx}-${sIdx}`}
                            className={`flex-row border-b border-gray-200 ${schedule.isSpecialEvent ? "bg-gray-50" : "bg-white"}`}
                          >
                            {/* Date & Time */}
                            <View style={{ flex: 1 }} className="p-4">
                              {schedule.fromDate &&
                              schedule.toDate &&
                              schedule.fromDate !== schedule.toDate ? (
                                <>
                                  <View className="flex-row items-center gap-1 mb-1">
                                    <Text className="text-xs font-semibold text-purple-600">
                                      Range:
                                    </Text>
                                    <View className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200">
                                      <Text className="text-xs font-semibold text-purple-700">
                                        Flexible
                                      </Text>
                                    </View>
                                  </View>
                                  <Text className="text-xs text-gray-700">
                                    {schedule.fromDate} → {schedule.toDate}
                                  </Text>
                                </>
                              ) : (
                                <Text className="mb-1 text-xs text-gray-500">
                                  {schedule.scheduledDate || schedule.date}
                                </Text>
                              )}
                              <Text className="font-mono text-sm font-semibold text-gray-900">
                                {schedule.startTime} - {schedule.endTime}
                              </Text>
                              <Text className="mt-1 text-xs text-gray-500">
                                {schedule.auditType || globalAuditType || "-"}
                              </Text>
                            </View>
                            {/* Area/Department */}
                            <View style={{ flex: 1 }} className="p-4">
                              {schedule.isSpecialEvent ? (
                                <View className="flex-row items-center gap-2">
                                  {schedule.specialEventType === "OPENING" && (
                                    <Sunrise size={16} color={COLORS.accent} />
                                  )}
                                  {schedule.specialEventType === "LUNCH" && (
                                    <Coffee size={16} color={COLORS.warning} />
                                  )}
                                  {schedule.specialEventType === "CLOSING" && (
                                    <Sunset size={16} color={COLORS.purple} />
                                  )}
                                  <Text className="text-sm font-semibold text-gray-900">
                                    {schedule.specialEventType === "OPENING" &&
                                      "Opening"}
                                    {schedule.specialEventType === "LUNCH" &&
                                      "Lunch"}
                                    {schedule.specialEventType === "CLOSING" &&
                                      "Closing"}
                                  </Text>
                                </View>
                              ) : (
                                <View className="gap-1">
                                  {(schedule.departments || []).map(
                                    (dept, i) => (
                                      <View
                                        key={i}
                                        className="flex-row items-center gap-2"
                                      >
                                        <View className="w-2 h-2 bg-blue-600 rounded-full" />
                                        <Text className="text-sm text-gray-900">
                                          {dept}
                                        </Text>
                                      </View>
                                    ),
                                  )}
                                </View>
                              )}
                            </View>
                            {/* Auditor */}
                            <View style={{ flex: 1 }} className="p-4">
                              <Text
                                className="text-sm text-gray-900"
                                numberOfLines={2}
                              >
                                {schedule.auditorName || "-"}
                              </Text>
                            </View>
                            {/* Auditee */}
                            <View style={{ flex: 1 }} className="p-4">
                              <Text
                                className="text-sm text-gray-900"
                                numberOfLines={2}
                              >
                                {schedule.auditeeName || "-"}
                              </Text>
                            </View>
                            {/* Status */}
                            <View style={{ flex: 1 }} className="p-4">
                              <View className="gap-1">
                                <View
                                  className="px-2 py-0.5 rounded-full border self-start"
                                  style={{
                                    backgroundColor: statusStyle.bg,
                                    borderColor: statusStyle.border,
                                  }}
                                >
                                  <Text
                                    className="text-xs font-semibold"
                                    style={{ color: statusStyle.color }}
                                  >
                                    {schedule.status || "SCHEDULED"}
                                  </Text>
                                </View>
                                <View
                                  className="px-2 py-0.5 rounded-full border self-start"
                                  style={{
                                    backgroundColor: approvalStyle.bg,
                                    borderColor: approvalStyle.border,
                                  }}
                                >
                                  <Text
                                    className="text-xs font-semibold"
                                    style={{ color: approvalStyle.color }}
                                  >
                                    {schedule.detailedApprovalStatus ===
                                    "APPROVED"
                                      ? "✓ Approved"
                                      : schedule.detailedApprovalStatus ===
                                          "PENDING_APPROVAL"
                                        ? "⏳ Pending"
                                        : schedule.detailedApprovalStatus ===
                                            "REJECTED"
                                          ? "✗ Rejected"
                                          : "📝 Draft"}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {/* Actions */}
                            <View
                              style={{ flex: 1 }}
                              className="items-center p-4"
                            >
                              <View className="flex-row items-center gap-2">
                                {canEdit &&
                                  (schedule.detailedApprovalStatus ===
                                    "DRAFT" ||
                                    schedule.detailedApprovalStatus ===
                                      "REJECTED" ||
                                    schedule.detailedApprovalStatus ===
                                      "CHANGE_REQUESTED") && (
                                    <>
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleEditSchedule(schedule)
                                        }
                                        delayPressIn={0} // ← ADD THIS
                                        activeOpacity={0.7} // ← ADD THIS
                                        className="items-center justify-center w-8 h-8 border border-blue-200 rounded bg-blue-50"
                                      >
                                        <Edit2
                                          size={14}
                                          color={COLORS.accent}
                                        />
                                      </TouchableOpacity>
                                      {/* ✅ DELETE BUTTON - FIXED */}
<TouchableOpacity
  onPress={() => {
    console.log("👆 Delete button clicked for schedule:", schedule.id);
    handleDelete(schedule.id!);
  }}
  activeOpacity={0.7}
  style={{
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <Trash2 size={14} color={COLORS.error} />
</TouchableOpacity>
                                      {isSubmittableDraft(
                                        schedule.detailedApprovalStatus,
                                      ) && (
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleSubmitScheduleForApproval(
                                              schedule.id!,
                                            )
                                          }
                                          className="items-center justify-center w-8 h-8 border border-green-200 rounded bg-green-50"
                                        >
                                          <Send
                                            size={14}
                                            color={COLORS.success}
                                          />
                                        </TouchableOpacity>
                                      )}
                                    </>
                                  )}
                                {canApprove &&
                                  schedule.detailedApprovalStatus ===
                                    "PENDING_APPROVAL" && (
                                    <>
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleApproveSchedule(schedule.id!)
                                        }
                                        className="items-center justify-center w-8 h-8 border border-green-200 rounded bg-green-50"
                                      >
                                        <Check
                                          size={14}
                                          color={COLORS.success}
                                        />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => {
                                          setSelectedRejectDate(
                                            schedule.scheduledDate || null,
                                          );
                                          setTempScheduleId(schedule.id!);
                                          setShowRejectModal(true);
                                        }}
                                        className="items-center justify-center w-8 h-8 border border-red-200 rounded bg-red-50"
                                      >
                                        <X size={14} color={COLORS.error} />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => {
                                          setSelectedRejectDate(
                                            schedule.scheduledDate || null,
                                          );
                                          setTempScheduleId(schedule.id!);
                                          setChangeRequestReason("");
                                          setShowChangeRequestModal(true);
                                        }}
                                        className="items-center justify-center w-8 h-8 border border-yellow-200 rounded bg-yellow-50"
                                      >
                                        <MessageSquare
                                          size={14}
                                          color={COLORS.warning}
                                        />
                                      </TouchableOpacity>
                                    </>
                                  )}
                                {schedule.detailedApprovalStatus ===
                                  "APPROVED" &&
                                  canApprove && (
                                    <TouchableOpacity
                                      onPress={() => {
                                        setSelectedRejectDate(
                                          schedule.scheduledDate || null,
                                        );
                                        setTempScheduleId(schedule.id!);
                                        setChangeRequestReason("");
                                        setShowChangeRequestModal(true);
                                      }}
                                      className="items-center justify-center w-8 h-8 border border-yellow-200 rounded bg-yellow-50"
                                    >
                                      <MessageSquare
                                        size={14}
                                        color={COLORS.warning}
                                      />
                                    </TouchableOpacity>
                                  )}
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row flex-wrap items-center justify-between gap-4 mb-4">
          <View className="flex-row flex-wrap gap-2">
            {canEdit &&
              dateRange
                .filter((d) => !d.isWeekend)
                .slice(0, 3)
                .map((dateInfo) => (
                  <ActionButton
                    key={dateInfo.dateStr}
                    onPress={() => handleAddSchedule(dateInfo.dateStr)}
                    color="#FFF"
                    bgColor={COLORS.accent}
                    icon={Plus}
                    className="h-10"
                  >
                    Add {dateInfo.displayDate}
                  </ActionButton>
                ))}
            {canEdit && (
              <ActionButton
                onPress={() => setShowBulkModal(true)}
                color="#FFF"
                bgColor={COLORS.purple}
                icon={Calendar}
                className="h-10"
              >
                Bulk Schedule
              </ActionButton>
            )}
          </View>
          {hasSchedules && canEdit && (
            <ActionButton
              onPress={handleSubmitAllDraftSchedules}
              loading={submitting}
              color="#FFF"
              bgColor={COLORS.accent}
              icon={Send}
              className="h-10"
            >
              Submit All Draft Schedules
            </ActionButton>
          )}
        </View>

        {/* Legend */}
        <Card className="p-6">
          <Text className="mb-4 text-xs font-bold tracking-wider text-gray-900 uppercase">
            Legend & Criteria
          </Text>
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-row items-center gap-2">
              <Sunrise size={16} color={COLORS.accent} />
              <Text className="text-xs text-gray-500">Opening Meeting</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Coffee size={16} color={COLORS.warning} />
              <Text className="text-xs text-gray-500">Lunch Break</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Sunset size={16} color={COLORS.purple} />
              <Text className="text-xs text-gray-500">Closing Meeting</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 border border-yellow-200 rounded-full bg-yellow-50" />
              <Text className="text-xs text-gray-500">Scheduled</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 border border-blue-200 rounded-full bg-blue-50" />
              <Text className="text-xs text-gray-500">In Progress</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="w-3 h-3 border border-green-200 rounded-full bg-green-50" />
              <Text className="text-xs text-gray-500">Completed</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* ✅ EXTRACTED ADD SCHEDULE MODAL */}
      <AddScheduleModal
        showModal={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        conflictWarning={conflictWarning}
        selectedAuditDepartment={selectedAuditDepartment}
        setSelectedAuditDepartment={setSelectedAuditDepartment}
        departmentTeamInfo={departmentTeamInfo}
        departmentAuditors={departmentAuditors}
        departmentAuditees={departmentAuditees}
        saving={saving}
        onSave={handleSave}
        onAuditDepartmentChange={handleAuditDepartmentChange}
        getAvailableDepartmentsForDate={getAvailableDepartmentsForDate}
        isDesktop={isDesktop}
      />

      {/* Bulk Schedule Modal (kept in main file) */}
      {showBulkModal && (
        <Modal
          visible={showBulkModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowBulkModal(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 p-5 bg-black/30"
            activeOpacity={1}
            onPress={() => setShowBulkModal(false)}
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
                    Bulk Schedule
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Schedule same audit for multiple dates
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowBulkModal(false);
                    setBulkSelectedAuditDepartment("");
                  }}
                  className="items-center justify-center border border-gray-200 rounded-lg w-9 h-9"
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
                {/* Date Range */}
                {/* Date Range - Week Locked */}
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-semibold text-gray-900">
                      From Date *
                    </Text>
                    <DatePickerField
                      value={bulkData.fromDate}
                      onChange={(dateStr) =>
                        setBulkData((prev) => ({
                          ...prev,
                          fromDate: dateStr,
                          // Reset To Date if it falls outside the new week
                          toDate: "",
                        }))
                      }
                      minDate={getMonthLimits()?.min}
                      maxDate={getMonthLimits()?.max}
                      placeholder="Select Start Date"
                    />
                    {bulkData.fromDate && (
                      <Text className="mt-1 text-xs text-blue-600">
                        📅 Week: {getWeekNumber(bulkData.fromDate)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-semibold text-gray-900">
                      To Date *
                    </Text>
                    <DatePickerField
                      value={bulkData.toDate}
                      onChange={(dateStr) =>
                        setBulkData({ ...bulkData, toDate: dateStr })
                      }
                      minDate={bulkToMinDate}
                      maxDate={bulkToMaxDate}
                      disabled={isBulkToDateDisabled}
                      placeholder={
                        !bulkData.fromDate
                          ? "Select From Date first"
                          : "Select End Date"
                      }
                    />
                    {bulkData.fromDate && bulkData.toDate && (
                      <Text className="mt-1 text-xs text-gray-500">
                        Range: {bulkData.fromDate} → {bulkData.toDate}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Department Picker */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-900">
                    Department to Audit *
                  </Text>
                  {!bulkData.fromDate || !bulkData.toDate ? (
                    <View className="justify-center px-3 bg-gray-100 border border-gray-200 rounded-lg h-11">
                      <Text className="text-sm text-gray-500">
                        ⚠️ Please select From Date and To Date first
                      </Text>
                    </View>
                  ) : (
                    <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                      <Picker
                        selectedValue={bulkSelectedAuditDepartment}
                        onValueChange={(itemValue: string) => {
                          setBulkSelectedAuditDepartment(itemValue);
                          if (itemValue) {
                            const availableDepts =
                              getAvailableDepartmentsForBulk();
                            const selectedDeptInfo = availableDepts.find(
                              (d) => d.department === itemValue,
                            );
                            if (selectedDeptInfo) {
                              setBulkData((prev) => ({
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
                          } else {
                            setBulkData((prev) => ({
                              ...prev,
                              selectedDepartments: [],
                            }));
                          }
                        }}
                        style={{ height: 50, width: "100%" }}
                      >
                        <Picker.Item label="Select Department" value="" />
                        {getAvailableDepartmentsForBulk().map((dept, index) => (
                          <Picker.Item
                            key={index}
                            label={dept.department}
                            value={dept.department}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Time Pickers */}
                <View className="flex-row gap-4 mb-4">
                  <View className="flex-1">
                    <Text className="mb-2 text-sm font-semibold text-gray-900">
                      Start Time *
                    </Text>
                    <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                      <Picker
                        selectedValue={bulkData.startTime}
                        onValueChange={(itemValue: string) => {
                          let newEndTime = bulkData.endTime;
                          if (
                            newEndTime &&
                            getTimeValue(newEndTime) <= getTimeValue(itemValue)
                          )
                            newEndTime = "";
                          setBulkData({
                            ...bulkData,
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
                        selectedValue={bulkData.endTime}
                        onValueChange={(itemValue: string) =>
                          setBulkData({ ...bulkData, endTime: itemValue })
                        }
                        style={{ height: 50 }}
                      >
                        {timeOptions
                          .filter(
                            (t) =>
                              !bulkData.startTime ||
                              getTimeValue(t) >
                                getTimeValue(bulkData.startTime),
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
                      setBulkData({
                        ...bulkData,
                        isSpecialEvent: !bulkData.isSpecialEvent,
                        specialEventType: "",
                        selectedDepartments: [],
                      })
                    }
                    className="items-center justify-center w-5 h-5 border border-gray-300 rounded"
                    style={{
                      backgroundColor: bulkData.isSpecialEvent
                        ? COLORS.accent
                        : "transparent",
                    }}
                  >
                    {bulkData.isSpecialEvent && (
                      <Check size={14} color="#FFF" />
                    )}
                  </TouchableOpacity>
                  <Text className="text-sm text-gray-900">
                    This is a Special Event (Opening/Lunch/Closing)
                  </Text>
                </View>

                {bulkData.isSpecialEvent ? (
                  <>
                    <View className="mb-4">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Event Type *
                      </Text>
                      <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                        <Picker
                          selectedValue={bulkData.specialEventType}
                          onValueChange={(itemValue: string) =>
                            setBulkData({
                              ...bulkData,
                              specialEventType: itemValue,
                            })
                          }
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Select Event Type" value="" />
                          <Picker.Item
                            label="Opening Meeting"
                            value="OPENING"
                          />
                          <Picker.Item label="Lunch Break" value="LUNCH" />
                          <Picker.Item
                            label="Closing Meeting"
                            value="CLOSING"
                          />
                        </Picker>
                      </View>
                    </View>
                    {bulkData.specialEventType !== "LUNCH" && (
                      <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                          <Text className="mb-2 text-sm font-semibold text-gray-900">
                            Auditor *
                          </Text>
                          <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                            <Picker
                              selectedValue={bulkData.auditorId}
                              onValueChange={(itemValue: string) =>
                                setBulkData({
                                  ...bulkData,
                                  auditorId: itemValue,
                                })
                              }
                              style={{ height: 50 }}
                            >
                              <Picker.Item label="Select Auditor" value="" />
                              {bulkTeamInfo.teamAuditorIds.length > 0 ? (
                                bulkDepartmentAuditors
                                  .filter((a) =>
                                    bulkTeamInfo.teamAuditorIds.includes(
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
                              selectedValue={bulkData.auditeeId}
                              onValueChange={(itemValue: string) =>
                                setBulkData({
                                  ...bulkData,
                                  auditeeId: itemValue,
                                })
                              }
                              style={{ height: 50 }}
                            >
                              <Picker.Item label="Select Auditee" value="" />
                              {bulkTeamInfo.auditeeIds.length > 0 ? (
                                bulkDepartmentAuditees
                                  .filter((a) =>
                                    bulkTeamInfo.auditeeIds.includes(
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
                    {/* Audit Elements Selection */}
                    <View className="mb-4">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Select Audit Elements *
                      </Text>
                      <View className="p-4 border border-gray-200 rounded-lg max-h-60">
                        {!bulkSelectedAuditDepartment ? (
                          <Text className="text-sm text-center text-gray-500">
                            Please select a department first
                          </Text>
                        ) : (
                          (() => {
                            const availableDepts =
                              getAvailableDepartmentsForBulk();
                            const deptInfo = availableDepts.find(
                              (d) =>
                                d.department === bulkSelectedAuditDepartment,
                            );
                            if (
                              !deptInfo ||
                              deptInfo.auditElements.length === 0
                            ) {
                              return (
                                <Text className="text-sm text-center text-gray-500">
                                  No audit elements available
                                </Text>
                              );
                            }
                            const selectedDept =
                              bulkData.selectedDepartments?.find(
                                (d) =>
                                  d.department === bulkSelectedAuditDepartment,
                              );
                            const selectedElements =
                              selectedDept?.selectedElements || [];
                            return (
                              <View>
                                <TouchableOpacity
                                  onPress={() => {
                                    let updated = [
                                      ...(bulkData.selectedDepartments || []),
                                    ];
                                    const existingIndex = updated.findIndex(
                                      (d) =>
                                        d.department ===
                                        bulkSelectedAuditDepartment,
                                    );
                                    if (existingIndex >= 0) {
                                      updated[existingIndex].selectedElements =
                                        [...deptInfo.auditElements];
                                    } else {
                                      updated.push({
                                        department: bulkSelectedAuditDepartment,
                                        selectedElements: [
                                          ...deptInfo.auditElements,
                                        ],
                                      });
                                    }
                                    setBulkData((prev) => ({
                                      ...prev,
                                      selectedDepartments: updated,
                                    }));
                                  }}
                                  className="flex-row items-center gap-3 mb-3"
                                >
                                  <View
                                    className="items-center justify-center w-5 h-5 border border-gray-300 rounded"
                                    style={{
                                      backgroundColor:
                                        selectedElements.length ===
                                        deptInfo.auditElements.length
                                          ? COLORS.accent
                                          : "transparent",
                                    }}
                                  >
                                    {selectedElements.length ===
                                      deptInfo.auditElements.length && (
                                      <Check size={14} color="#FFF" />
                                    )}
                                  </View>
                                  <Text className="font-semibold text-gray-900">
                                    {bulkSelectedAuditDepartment}
                                  </Text>
                                </TouchableOpacity>
                                <View className="flex-row flex-wrap gap-2 ml-8">
                                  {deptInfo.auditElements.map((element) => (
                                    <TouchableOpacity
                                      key={element}
                                      onPress={() => {
                                        let updated = [
                                          ...(bulkData.selectedDepartments ||
                                            []),
                                        ];
                                        let deptIndex = updated.findIndex(
                                          (d) =>
                                            d.department ===
                                            bulkSelectedAuditDepartment,
                                        );
                                        if (deptIndex === -1) {
                                          updated.push({
                                            department:
                                              bulkSelectedAuditDepartment,
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
                                          updated[deptIndex].selectedElements =
                                            [
                                              ...updated[deptIndex]
                                                .selectedElements,
                                              element,
                                            ];
                                        }
                                        if (
                                          updated[deptIndex].selectedElements
                                            .length === 0
                                        )
                                          updated.splice(deptIndex, 1);
                                        setBulkData((prev) => ({
                                          ...prev,
                                          selectedDepartments: updated,
                                        }));
                                      }}
                                      className={`px-3 py-1.5 rounded-full border flex-row items-center gap-2 ${selectedElements.includes(element) ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
                                    >
                                      {selectedElements.includes(element) && (
                                        <Check
                                          size={12}
                                          color={COLORS.accent}
                                        />
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
                          })()
                        )}
                      </View>
                    </View>
                    {/* Auditor Picker */}
                    <View className="flex-1 mb-4">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Auditor *
                      </Text>
                      <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                        <Picker
                          selectedValue={bulkData.auditorId}
                          onValueChange={(itemValue: string) =>
                            setBulkData({ ...bulkData, auditorId: itemValue })
                          }
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Select Auditor" value="" />
                          {bulkTeamInfo.teamAuditorIds.length > 0 ? (
                            bulkDepartmentAuditors
                              .filter((a) =>
                                bulkTeamInfo.teamAuditorIds.includes(
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
                    {/* Auditee Picker */}
                    <View className="flex-1 mb-4">
                      <Text className="mb-2 text-sm font-semibold text-gray-900">
                        Auditee *
                      </Text>
                      <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                        <Picker
                          selectedValue={bulkData.auditeeId}
                          onValueChange={(itemValue: string) =>
                            setBulkData({ ...bulkData, auditeeId: itemValue })
                          }
                          style={{ height: 50 }}
                        >
                          <Picker.Item label="Select Auditee" value="" />
                          {bulkTeamInfo.auditeeIds.length > 0 ? (
                            bulkDepartmentAuditees
                              .filter((a) =>
                                bulkTeamInfo.auditeeIds.includes(Number(a.id)),
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
                  </>
                )}

                {/* Status Picker */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-semibold text-gray-900">
                    Status
                  </Text>
                  <View className="overflow-hidden bg-white border border-gray-200 rounded-lg">
                    <Picker
                      selectedValue={bulkData.status}
                      onValueChange={(itemValue: string) =>
                        setBulkData({ ...bulkData, status: itemValue })
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
                  onPress={() => {
                    setShowBulkModal(false);
                    setBulkSelectedAuditDepartment("");
                  }}
                  className="justify-center h-10 px-5 bg-white border border-gray-200 rounded-lg"
                >
                  <Text className="text-sm font-semibold text-gray-700">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBulkSchedule}
                  disabled={
                    saving ||
                    !bulkSelectedAuditDepartment ||
                    !bulkData.auditorId ||
                    !bulkData.auditeeId ||
                    !bulkData.startTime ||
                    !bulkData.endTime
                  }
                  className="flex-row items-center h-10 gap-2 px-5 rounded-lg"
                  style={{
                    backgroundColor:
                      saving ||
                      !bulkSelectedAuditDepartment ||
                      !bulkData.auditorId ||
                      !bulkData.auditeeId ||
                      !bulkData.startTime ||
                      !bulkData.endTime
                        ? "#F1F5F9"
                        : COLORS.purple,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Calendar size={16} color="#FFF" />
                  )}
                  <Text className="text-sm font-semibold text-white">
                    Create Bulk Schedules
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Reject Modal */}
      <ActionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason("");
          setSelectedRejectDate(null);
          setTempScheduleId(null);
        }}
        title="Reject Schedule"
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor={COLORS.error}
        iconBg={COLORS.errorLight}
        iconBorder={COLORS.errorBorder}
        value={rejectionReason}
        setValue={setRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={() => {
          if (tempScheduleId) {
            handleRejectSchedule(tempScheduleId);
            setTempScheduleId(null);
          }
        }}
        submitLabel="Confirm Reject"
        submitBg={COLORS.error}
        submitting={submitting}
      />

      {/* Change Request Modal */}
      <ActionModal
        isOpen={showChangeRequestModal}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
          setTempScheduleId(null);
          setSelectedRejectDate(null);
        }}
        title="Request Changes"
        description="Please provide details about what changes are needed:"
        icon={MessageSquare}
        iconColor={COLORS.warning}
        iconBg={COLORS.warningLight}
        iconBorder={COLORS.warningBorder}
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={() => {
          if (tempScheduleId) {
            handleRequestChanges(tempScheduleId);
            setTempScheduleId(null);
          }
        }}
        submitLabel="Submit Request"
        submitBg={COLORS.warning}
        submitting={submitting}
      />
    </View>
  );
}
