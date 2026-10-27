// Form5DetailedView.tsx
import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi, User } from "@/services/auditScheduleApi";
import { pdfService } from "@/services/pdfService";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  Coffee,
  Edit2,
  Eye,
  FileText,
  Filter,
  MessageSquare,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  Repeat,
  Send,
  Sunrise,
  Sunset,
  Trash2,
  X,
  XCircle,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import AddScheduleModal from "./AddScheduleModal";

// ════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
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

// ═════ STYLES ═════
const styles = StyleSheet.create({
  expandedRow: {
    backgroundColor: "#F8FAFC",
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
  },
});

// ═════ PLANT FILTER HELPERS ═════
type PlantKey = string | number | null | undefined;

const PLANT_FIELD_CANDIDATES = [
  "plantId",
  "plant_id",
  "plant",
  "plantCode",
  "plantName",
] as const;

const plantOf = (row: any): string | number | null => {
  if (!row) return null;
  for (const k of PLANT_FIELD_CANDIDATES) {
    const v = (row as any)[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const samePlant = (row: any, plantId: PlantKey): boolean => {
  if (plantId === null || plantId === undefined || plantId === "") return true;
  const rowPlant = plantOf(row);
  if (rowPlant === null) return true;
  return String(rowPlant) === String(plantId);
};

const filterByPlant = <T,>(rows: T[], plantId: PlantKey): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
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

const getQuarter = (month: string) => {
  const quarters: Record<string, string> = {
    Apr: "Q1",
    May: "Q1",
    Jun: "Q1",
    Jul: "Q2",
    Aug: "Q2",
    Sep: "Q2",
    Oct: "Q3",
    Nov: "Q3",
    Dec: "Q3",
    Jan: "Q4",
    Feb: "Q4",
    Mar: "Q4",
  };
  return quarters[month] || "";
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
const Card = ({ children, className = "" }: any) => (
  <View
    className={`mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    style={{
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    }}
  >
    {children}
  </View>
);

const AlertBanner = ({ type, title, message, footer, icon: Icon }: any) => {
  const stylesMap: any = {
    error: {
      bg: COLORS.stateErrorBg,
      border: COLORS.border,
      color: COLORS.stateErrorText,
      iconColor: COLORS.stateErrorText,
      iconBg: "#E2E8F0",
    },
    warning: {
      bg: COLORS.stateWarningBg,
      border: COLORS.border,
      color: COLORS.stateWarningText,
      iconColor: COLORS.stateWarningText,
      iconBg: "#F1F5F9",
    },
    success: {
      bg: COLORS.stateSuccessBg,
      border: COLORS.primaryBorder,
      color: COLORS.primaryDark,
      iconColor: COLORS.primary,
      iconBg: "#FFFFFF",
    },
  };
  const s = stylesMap[type] || stylesMap.error;
  return (
    <View
      className="mb-6 flex-row gap-4 rounded-2xl border p-5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: s.iconBg,
          borderColor: s.border,
          borderWidth: 1,
        }}
      >
        <Icon size={20} color={s.iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-sm font-bold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text
          className="mt-1 text-sm leading-5 opacity-90"
          style={{ color: s.color }}
        >
          {message}
        </Text>
        {footer && (
          <Text
            className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-70"
            style={{ color: s.color }}
          >
            {footer}
          </Text>
        )}
      </View>
    </View>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "COMPLETED") {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
        <Check size={14} color={COLORS.primary} />
      </View>
    );
  }
  if (status === "SCHEDULED" || status === "PLANNED") {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
        <Clock size={14} color={COLORS.primary} />
      </View>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
        <Repeat size={14} color={COLORS.primary} />
      </View>
    );
  }
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
      <Text className="text-[11px] font-bold text-slate-400">—</Text>
    </View>
  );
};

const ApprovalBadge = ({ status }: { status?: string }) => {
  const getStyle = () => {
    switch (status) {
      case "APPROVED":
        return {
          bg: COLORS.stateSuccessBg,
          color: COLORS.primaryDark,
          border: COLORS.primaryBorder,
          text: "Approved",
          icon: CheckCircle,
        };
      case "CONFIRMED_BY_LA":
        return {
          bg: COLORS.primaryLight,
          color: COLORS.primary,
          border: COLORS.primaryBorder,
          text: "Confirmed by LA",
          icon: CheckCircle,
        };
      case "PENDING_LA_CONFIRMATION":
        return {
          bg: COLORS.primaryLight,
          color: COLORS.primary,
          border: COLORS.primaryBorder,
          text: "Pending LA",
          icon: Clock,
        };
      case "PENDING_APPROVAL":
        return {
          bg: COLORS.stateWarningBg,
          color: COLORS.stateWarningText,
          border: COLORS.border,
          text: "Pending TM",
          icon: Clock,
        };
      case "FEASIBILITY_REJECTED":
      case "REJECTED":
        return {
          bg: COLORS.stateErrorBg,
          color: COLORS.stateErrorText,
          border: COLORS.border,
          text: status === "REJECTED" ? "Rejected" : "Rejected by LA",
          icon: XCircle,
        };
      case "CHANGE_REQUESTED":
        return {
          bg: COLORS.stateWarningBg,
          color: COLORS.stateWarningText,
          border: COLORS.border,
          text: "Changes Requested",
          icon: MessageSquare,
        };
      default:
        return {
          bg: "#F1F5F9",
          color: "#475569",
          border: "#E2E8F0",
          text: "Draft",
          icon: FileText,
        };
    }
  };

  const s = getStyle();
  const Icon = s.icon;
  return (
    <View
      className="flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <Icon size={12} color={s.color} />
      <Text
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: s.color }}
      >
        {s.text}
      </Text>
    </View>
  );
};

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
    className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-4 ${disabled || loading ? "border-slate-200 bg-slate-100" : ""} ${className}`}
    style={{
      backgroundColor: disabled || loading ? undefined : bgColor,
      borderColor:
        disabled || loading ? undefined : borderColor || "transparent",
    }}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : Icon ? (
      <Icon size={16} color={disabled || loading ? "#94A3B8" : color} />
    ) : null}
    <Text
      className={`text-sm font-semibold ${disabled || loading ? "text-slate-400" : ""}`}
      style={{ color: disabled || loading ? undefined : color }}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;
  const borderColor = isHoveredAndEnabled ? "#2563EB" : "#D1D5DB";
  const textColor = isHoveredAndEnabled ? "#2563EB" : "#111827";
  const iconColor = isHoveredAndEnabled ? "#2563EB" : "#6B7280";
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(37, 99, 235, 0.1)"
    : "transparent";
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
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg border px-3 py-2.5"
      style={{
        borderColor,
        backgroundColor,
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
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
  value,
  setValue,
  placeholder,
  onSubmit,
  submitLabel,
  submitBg,
  submitting,
}: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/30 p-6"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center gap-4 border-b border-slate-100 p-6">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl border border-slate-100"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{description}</Text>
            </View>
          </View>
          <View className="p-6">
            <TextInput
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </View>
          <View className="flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <TouchableOpacity
              onPress={onClose}
              className="h-11 justify-center rounded-xl border border-slate-200 bg-white px-6"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-slate-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!value.trim() || submitting}
              className="h-11 flex-row items-center justify-center gap-2 rounded-xl px-6"
              style={{
                backgroundColor:
                  !value.trim() || submitting ? "#CBD5E1" : submitBg,
                opacity: !value.trim() || submitting ? 0.7 : 1,
              }}
              activeOpacity={0.8}
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

const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const [offset, setOffset] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const GAP = 60;
  const SPEED = 0.6;
  useEffect(() => {
    if (textWidth === 0 || containerWidth === 0) return;
    if (textWidth <= containerWidth) {
      setOffset(0);
      return;
    }
    const cycle = textWidth + GAP;
    const interval = setInterval(() => {
      setOffset((prev) => {
        const next = prev - SPEED;
        return next <= -cycle ? 0 : next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [textWidth, containerWidth]);
  return (
    <View
      style={[
        {
          width: "100%",
          height: 30,
          overflow: "hidden",
          justifyContent: "center",
        },
        style,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) setContainerWidth(w);
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          transform: [{ translateX: offset }],
        }}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: GAP,
            flexShrink: 0,
          }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - textWidth) > 1) setTextWidth(w);
          }}
        >
          {text}
        </Text>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: GAP,
            flexShrink: 0,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
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
  allUsers?: any[];
  onOpenForum?: (forumId: string) => void;
}

export default function Form5DetailedView({
  year: propYear,
  month: propMonth,
  preSelectedDepartment,
  preSelectedWeek,
  startDate: preStartDate,
  endDate: preEndDate,
  onBack,
  onOpenForum,
  allUsers = [],
}: Form5DetailedViewProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement, isLeadAuditor } = useAuth();
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
  const [showLaRejectModal, setShowLaRejectModal] = useState(false);
  const [laRejectReason, setLaRejectReason] = useState("");
  const [departmentAuditors, setDepartmentAuditors] = useState<User[]>([]);
  const [departmentAuditees, setDepartmentAuditees] = useState<User[]>([]);
  const [competentAuditors, setCompetentAuditors] = useState<User[]>([]);
  const [competentAuditees, setCompetentAuditees] = useState<User[]>([]);
  const [loadingCompetentAuditors, setLoadingCompetentAuditors] =
    useState(false);
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

  const [bulkCompetentAuditors, setBulkCompetentAuditors] = useState<User[]>(
    [],
  );
  const [bulkCompetentAuditees, setBulkCompetentAuditees] = useState<User[]>(
    [],
  );
  const [bulkLoadingCompetent, setBulkLoadingCompetent] = useState(false);
  const [bulkDepartmentTeamInfo, setBulkDepartmentTeamInfo] =
    useState<DepartmentTeamInfo>({
      leadAuditorId: null,
      leadAuditorName: null,
      teamAuditorIds: [],
      teamAuditorNames: [],
      auditeeIds: [],
      auditeeNames: [],
    });

  const bulkAvailableAuditors: User[] = useMemo(() => {
    const teamIds = bulkDepartmentTeamInfo.teamAuditorIds;

    if (teamIds.length > 0) {
      const result: User[] = [];
      const seen = new Set<number>();
      for (const a of bulkDepartmentAuditors) {
        const id = Number(a.id);
        if (teamIds.includes(id) && !seen.has(id)) {
          seen.add(id);
          result.push(a);
        }
      }
      for (const id of teamIds) {
        if (!seen.has(id)) {
          const fromCompetent = bulkCompetentAuditors.find(
            (a) => Number(a.id) === id,
          );
          if (fromCompetent) {
            seen.add(id);
            result.push(fromCompetent);
          }
        }
      }
      return result;
    }

    return bulkCompetentAuditors;
  }, [
    bulkDepartmentTeamInfo.teamAuditorIds,
    bulkDepartmentAuditors,
    bulkCompetentAuditors,
  ]);

  const bulkAvailableAuditees: User[] = useMemo(() => {
    const teamIds = bulkDepartmentTeamInfo.auditeeIds;

    if (teamIds.length > 0) {
      const result: User[] = [];
      const seen = new Set<number>();
      for (const a of bulkDepartmentAuditees) {
        const id = Number(a.id);
        if (teamIds.includes(id) && !seen.has(id)) {
          seen.add(id);
          result.push(a);
        }
      }
      for (const id of teamIds) {
        if (!seen.has(id)) {
          const fromCompetent = bulkCompetentAuditees.find(
            (a) => Number(a.id) === id,
          );
          if (fromCompetent) {
            seen.add(id);
            result.push(fromCompetent);
          }
        }
      }
      return result;
    }

    return bulkCompetentAuditees;
  }, [
    bulkDepartmentTeamInfo.auditeeIds,
    bulkDepartmentAuditees,
    bulkCompetentAuditees,
  ]);

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
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
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

  const getDateLimits = useCallback(() => {
    if (selectedWeek) {
      return getWeekLimits(selectedWeek);
    }
    return getMonthLimits();
  }, [selectedWeek, getWeekLimits, getMonthLimits]);

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

    const fromDate = new Date(`${bulkData.fromDate}T00:00:00`);
    const toDate = new Date(`${bulkData.toDate}T00:00:00`);
    const weeksInRange = new Set<string>();

    for (
      let dt = new Date(fromDate);
      dt <= toDate;
      dt.setDate(dt.getDate() + 1)
    ) {
      const dateStr = toISODate(dt);
      weeksInRange.add(getWeekNumber(dateStr));
    }

    const departmentsMap = new Map<
      string,
      { department: string; auditElements: string[] }
    >();

    basicSchedules
      .filter(
        (schedule) =>
          weeksInRange.has(schedule.week) &&
          schedule.department &&
          schedule.department !== "OPENING" &&
          schedule.department !== "CLOSING" &&
          schedule.approvalStatus === "APPROVED",
      )
      .forEach((schedule) => {
        let auditElements: string[] = [];
        if (schedule.auditElements) {
          if (typeof schedule.auditElements === "string") {
            try {
              auditElements = JSON.parse(schedule.auditElements);
            } catch {
              auditElements = [];
            }
          } else if (Array.isArray(schedule.auditElements)) {
            auditElements = schedule.auditElements;
          }
        }

        let filteredElements = auditElements;
        if (globalAuditType && globalAuditType !== "") {
          filteredElements = auditElements.filter((el) =>
            el.toLowerCase().includes(globalAuditType.toLowerCase()),
          );
        }

        const shouldShow = !globalAuditType || filteredElements.length > 0;
        if (shouldShow && !departmentsMap.has(schedule.department)) {
          departmentsMap.set(schedule.department, {
            department: schedule.department,
            auditElements:
              filteredElements.length > 0 ? filteredElements : auditElements,
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

      const primaryAuditorId =
        matchedSchedule.auditorId ?? matchedSchedule.leadAuditorId ?? null;

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

      if (primaryAuditorId != null) {
        const primary = parseInt(primaryAuditorId as any);
        if (!isNaN(primary) && !teamIds.includes(primary)) {
          teamIds.unshift(primary);
        }
      }
      if (matchedSchedule.coAuditorNames) {
        teamNames = matchedSchedule.coAuditorNames as string[];
        if (typeof teamNames === "string") {
          try {
            teamNames = JSON.parse(teamNames);
          } catch (_e) {
            teamNames = [];
          }
        }
      }
      if (teamNames.length === 0 && matchedSchedule.teamAuditorNames) {
        teamNames = matchedSchedule.teamAuditorNames as string[];
        if (typeof teamNames === "string") {
          try {
            teamNames = JSON.parse(teamNames);
          } catch (_e) {
            teamNames = [];
          }
        }
      }

      const primaryName =
        matchedSchedule.auditorName ?? matchedSchedule.leadAuditorName ?? null;
      if (
        primaryName &&
        typeof primaryName === "string" &&
        primaryName.trim() &&
        !teamNames.includes(primaryName.trim())
      ) {
        teamNames.unshift(primaryName.trim());
      }

      teamNames = teamNames
        .filter((n: any) => typeof n === "string" && n.trim().length > 0)
        .map((n: string) => n.trim());
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

  const fetchDepartmentUsers = useCallback(
    async (departmentCode: string, forBulk: boolean = false) => {
      if (!departmentCode) {
        if (forBulk) {
          setBulkDepartmentAuditors([]);
          setBulkDepartmentAuditees([]);
        } else {
          setDepartmentAuditors([]);
          setDepartmentAuditees([]);
        }
        return;
      }

      const plantId = (user as any)?.plantId;
      if (!plantId) {
        if (forBulk) {
          setBulkDepartmentAuditors([]);
          setBulkDepartmentAuditees([]);
        } else {
          setDepartmentAuditors([]);
          setDepartmentAuditees([]);
        }
        return;
      }

      const enumValue =
        departmentDisplayToEnum[departmentCode] || departmentCode;

      if (forBulk) {
        setBulkLoadingCompetent(true);
      } else {
        setLoadingDepartmentUsers(true);
      }

      try {
        const auditorsRes = await auditScheduleApi
          .getAuditorsByDepartment(enumValue)
          .catch((err) => {
            console.error("Auditors API FAILED", err);
            return [] as User[];
          });
        const auditorsList = Array.isArray(auditorsRes)
          ? auditorsRes
          : (auditorsRes as any)?.data || [];

        const auditeesRes = await auditScheduleApi
          .getAuditeesByDepartment(enumValue, plantId)
          .catch(() => [] as User[]);
        const auditeesList = Array.isArray(auditeesRes)
          ? auditeesRes
          : (auditeesRes as any)?.data || [];

        if (forBulk) {
          setBulkDepartmentAuditors(auditorsList);
          setBulkDepartmentAuditees(auditeesList);
        } else {
          setDepartmentAuditors(auditorsList);
          setDepartmentAuditees(auditeesList);
        }
      } catch (error) {
        console.error("Error fetching department users:", error);
        if (forBulk) {
          setBulkDepartmentAuditors([]);
          setBulkDepartmentAuditees([]);
        } else {
          setDepartmentAuditors([]);
          setDepartmentAuditees([]);
        }
      } finally {
        if (forBulk) {
          setBulkLoadingCompetent(false);
        } else {
          setLoadingDepartmentUsers(false);
        }
      }
    },
    [user],
  );

  const fetchCompetentUsers = useCallback(
    async (
      departmentCode: string,
      auditElements: string[],
      teamAuditorIds: number[] = [],
      teamAuditeeIds: number[] = [],
    ) => {
      if (!departmentCode || !user?.id) {
        setCompetentAuditors([]);
        setCompetentAuditees([]);
        return;
      }

      const plantId = (user as any)?.plantId;
      if (!plantId) {
        setCompetentAuditors([]);
        setCompetentAuditees([]);
        return;
      }

      setLoadingCompetentAuditors(true);
      try {
        if (teamAuditorIds.length > 0) {
          const enumDept =
            departmentDisplayToEnum[departmentCode] || departmentCode;
          const [leadRes, regularRes] = await Promise.all([
            auditScheduleApi
              .getLeadAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
            auditScheduleApi
              .getRegularAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
          ]);

          const leadList = Array.isArray(leadRes)
            ? leadRes
            : (leadRes as any)?.data || [];
          const regularList = Array.isArray(regularRes)
            ? regularRes
            : (regularRes as any)?.data || [];

          const seen = new Set<number>();
          const merged: User[] = [];
          for (const u of [...leadList, ...regularList]) {
            const id = Number((u as any).id);
            if (!isNaN(id) && !seen.has(id)) {
              seen.add(id);
              merged.push(u as User);
            }
          }

          setCompetentAuditors(merged);
        } else if (auditElements.length > 0) {
          const auditorsRes = await auditScheduleApi.getFullyCompetentAuditors(
            auditElements,
            selectedYear,
            selectedMonth,
            plantId,
          );
          let auditorsList = Array.isArray(auditorsRes)
            ? auditorsRes
            : (auditorsRes as any)?.data || [];

          if (auditorsList.length === 0) {
            const enumDept =
              departmentDisplayToEnum[departmentCode] || departmentCode;
            const [leadRes, regularRes] = await Promise.all([
              auditScheduleApi
                .getLeadAuditorsByDepartment(enumDept)
                .catch(() => []),
              auditScheduleApi
                .getRegularAuditorsByDepartment(enumDept)
                .catch(() => []),
            ]);
            const leadList = Array.isArray(leadRes)
              ? leadRes
              : (leadRes as any)?.data || [];
            const regList = Array.isArray(regularRes)
              ? regularRes
              : (regularRes as any)?.data || [];
            const seen = new Set<number>();
            auditorsList = [];
            for (const u of [...leadList, ...regList]) {
              const id = Number((u as any).id);
              if (!isNaN(id) && !seen.has(id)) {
                seen.add(id);
                auditorsList.push(u as User);
              }
            }
          }
          setBulkCompetentAuditors(auditorsList);
        } else {
          const enumDept =
            departmentDisplayToEnum[departmentCode] || departmentCode;
          const [leadRes, regularRes] = await Promise.all([
            auditScheduleApi
              .getLeadAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
            auditScheduleApi
              .getRegularAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
          ]);
          const leadList = Array.isArray(leadRes)
            ? leadRes
            : (leadRes as any)?.data || [];
          const regularList = Array.isArray(regularRes)
            ? regularRes
            : (regularRes as any)?.data || [];
          const seen = new Set<number>();
          const merged: User[] = [];
          for (const u of [...leadList, ...regularList]) {
            const id = Number((u as any).id);
            if (!isNaN(id) && !seen.has(id)) {
              seen.add(id);
              merged.push(u as User);
            }
          }
          setCompetentAuditors(merged);
        }

        if (teamAuditeeIds.length > 0) {
          setCompetentAuditees([]);
        } else if (auditElements.length > 0) {
          const auditeesRes =
            await auditScheduleApi.getCompetentAuditeesByDepartment(
              departmentDisplayToEnum[departmentCode] || departmentCode,
              plantId,
              auditElements,
            );
          const auditeesList = Array.isArray(auditeesRes)
            ? auditeesRes
            : (auditeesRes as any)?.data || [];
          setCompetentAuditees(auditeesList);
        } else {
          const auditeesRes = await auditScheduleApi.getAuditeesByDepartment(
            departmentDisplayToEnum[departmentCode] || departmentCode,
            plantId,
          );
          const auditeesList = Array.isArray(auditeesRes)
            ? auditeesRes
            : (auditeesRes as any)?.data || [];
          setCompetentAuditees(auditeesList);
        }
      } catch (err) {
        console.error("❌ Failed to fetch competent users:", err);
        setCompetentAuditors([]);
        setCompetentAuditees([]);
      } finally {
        setLoadingCompetentAuditors(false);
      }
    },
    [user, selectedYear, selectedMonth],
  );

  const fetchBulkCompetentUsers = useCallback(
    async (
      departmentCode: string,
      auditElements: string[],
      teamAuditorIds: number[] = [],
      teamAuditeeIds: number[] = [],
    ) => {
      if (!departmentCode || !user?.id) {
        setBulkCompetentAuditors([]);
        setBulkCompetentAuditees([]);
        return;
      }

      const plantId = (user as any)?.plantId;
      if (!plantId) {
        setBulkCompetentAuditors([]);
        setBulkCompetentAuditees([]);
        return;
      }

      setBulkLoadingCompetent(true);
      try {
        const enumDept =
          departmentDisplayToEnum[departmentCode] || departmentCode;

        if (teamAuditorIds.length > 0) {
          setBulkCompetentAuditors([]);
        } else if (auditElements.length > 0) {
          const auditorsRes = await auditScheduleApi.getFullyCompetentAuditors(
            auditElements,
            selectedYear,
            selectedMonth,
            plantId,
          );
          let auditorsList = Array.isArray(auditorsRes)
            ? auditorsRes
            : (auditorsRes as any)?.data || [];

          if (auditorsList.length === 0) {
            const enumDeptLocal =
              departmentDisplayToEnum[departmentCode] || departmentCode;
            const [leadRes, regularRes] = await Promise.all([
              auditScheduleApi
                .getLeadAuditorsByDepartment(enumDeptLocal)
                .catch(() => []),
              auditScheduleApi
                .getRegularAuditorsByDepartment(enumDeptLocal)
                .catch(() => []),
            ]);
            const leadList = Array.isArray(leadRes)
              ? leadRes
              : (leadRes as any)?.data || [];
            const regList = Array.isArray(regularRes)
              ? regularRes
              : (regularRes as any)?.data || [];
            const seen = new Set<number>();
            auditorsList = [];
            for (const u of [...leadList, ...regList]) {
              const id = Number((u as any).id);
              if (!isNaN(id) && !seen.has(id)) {
                seen.add(id);
                auditorsList.push(u as User);
              }
            }
          }
          setBulkCompetentAuditors(auditorsList);
        } else {
          const [leadRes, regularRes] = await Promise.all([
            auditScheduleApi
              .getLeadAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
            auditScheduleApi
              .getRegularAuditorsByDepartment(enumDept)
              .catch(() => [] as User[]),
          ]);
          const leadList = Array.isArray(leadRes)
            ? leadRes
            : (leadRes as any)?.data || [];
          const regList = Array.isArray(regularRes)
            ? regularRes
            : (regularRes as any)?.data || [];
          const seen = new Set<number>();
          const merged: User[] = [];
          for (const u of [...leadList, ...regList]) {
            const id = Number((u as any).id);
            if (!isNaN(id) && !seen.has(id)) {
              seen.add(id);
              merged.push(u as User);
            }
          }
          setBulkCompetentAuditors(merged);
        }

        if (teamAuditeeIds.length > 0) {
          setBulkCompetentAuditees([]);
        } else if (auditElements.length > 0) {
          const auditeesRes =
            await auditScheduleApi.getCompetentAuditeesByDepartment(
              enumDept,
              plantId,
              auditElements,
            );
          const list = Array.isArray(auditeesRes)
            ? auditeesRes
            : (auditeesRes as any)?.data || [];
          setBulkCompetentAuditees(list);
        } else {
          const auditeesRes = await auditScheduleApi.getAuditeesByDepartment(
            enumDept,
            plantId,
          );
          const list = Array.isArray(auditeesRes)
            ? auditeesRes
            : (auditeesRes as any)?.data || [];
          setBulkCompetentAuditees(list);
        }
      } catch (err) {
        console.error("❌ Bulk competent users fetch failed:", err);
        setBulkCompetentAuditors([]);
        setBulkCompetentAuditees([]);
      } finally {
        setBulkLoadingCompetent(false);
      }
    },
    [user, selectedYear, selectedMonth],
  );

  const fetchBasicSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const weekSchedules = await auditScheduleApi.getByYearAndMonth(
        selectedYear,
        selectedMonth as any,
      );
      if (!user?.id) return;
      const dateSchedules = await auditScheduleApi.getDateSchedulesByMonth(
        selectedYear,
        selectedMonth as any,
        user.id,
      );

      const rawAllSchedules = [
        ...(weekSchedules.data || []),
        ...(dateSchedules.data || []),
      ];

      const allSchedules = filterByPlant(rawAllSchedules, user?.plantId);

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
  }, [selectedYear, selectedMonth, user?.id]);

  const fetchDetailedSchedules = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      if (!user?.id) return;
      const response = await auditScheduleApi.getDateSchedulesByMonth(
        selectedYear,
        selectedMonth as any,
        user.id,
      );
      const dateSchedules = response.data || [];

      const plantScopedSchedules = filterByPlant(dateSchedules, user?.plantId);

      const processedSchedules = plantScopedSchedules.map((schedule: any) => {
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
  }, [selectedYear, selectedMonth, user?.id]);

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

  const handleAuditDepartmentChange = async (departmentCode: string) => {
    setSelectedAuditDepartment(departmentCode);

    const effectiveDate =
      formData.date ||
      startDate ||
      (selectedWeek ? (getWeekLimits(selectedWeek)?.min ?? null) : null);

    const teamInfo = getTeamMembersForDepartment(
      departmentCode,
      effectiveDate,
      globalAuditType,
    );
    setDepartmentTeamInfo(teamInfo);

    await fetchDepartmentUsers(departmentCode);

    const elementsToUse = globalAuditType ? [globalAuditType] : [];
    await fetchCompetentUsers(
      departmentCode,
      elementsToUse,
      teamInfo.teamAuditorIds,
      teamInfo.auditeeIds,
    );

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
        fromDate: formData.date,
        toDate: formData.date,
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
        auditNumber: "",
        preparedByName:
          headerData.preparedBy || user?.name || user?.username || "",
        preparedByPosition: "Audit Manager",
        plantId: (user as any)?.plantId ?? null,
        plantName: (user as any)?.plantName ?? null,
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
        plantId: (user as any)?.plantId ?? null,
        plantName: (user as any)?.plantName ?? null,
        auditType: bulkData.auditType || globalAuditType,
        auditNumber: "",
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

  const handleDelete = (id: number) => {
    if (!id) {
      showToast("Invalid schedule ID", "error");
      return;
    }

    const scheduleToDelete = auditSchedules.find((s) => s.id === id);

    if (!scheduleToDelete) {
      showToast("Schedule not found", "error");
      return;
    }

    if (scheduleToDelete.detailedApprovalStatus === "APPROVED") {
      showToast("Cannot delete an approved schedule", "warning");
      return;
    }

    if (scheduleToDelete.detailedApprovalStatus === "PENDING_APPROVAL") {
      showToast("Cannot delete a schedule pending approval", "warning");
      return;
    }

    const confirmAndDelete = () => {
      if (Platform.OS === "web") {
        const isConfirmed = window.confirm(
          "Are you sure you want to delete this schedule?",
        );
        if (isConfirmed) {
          performDelete(id);
        }
        return;
      }

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
        ],
      );
    };

    confirmAndDelete();
  };

  const performDelete = async (id: number) => {
    try {
      await auditScheduleApi.delete(id);
      showToast("✅ Schedule deleted successfully!", "success");
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("❌ Error deleting schedule:", error);
      showToast(
        error.response?.data?.message || "Failed to delete schedule",
        "error",
      );
    }
  };

  const handleLaConfirmSingle = async (scheduleId: number) => {
    setSubmitting(true);
    try {
      await auditScheduleApi.confirmSingleDailyFeasibility(
        scheduleId,
        getUserIdAsNumber(),
      );
      showToast("✅ Daily schedule confirmed for feasibility!", "success");
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error confirming daily feasibility:", error);
      showToast(
        error.response?.data?.message || error.message || "Failed to confirm",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLaRejectSingle = async (scheduleId: number) => {
    if (!laRejectReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSingleDailyFeasibility(
        scheduleId,
        getUserIdAsNumber(),
        laRejectReason,
      );
      showToast("❌ Daily schedule rejected", "warning");
      setShowLaRejectModal(false);
      setLaRejectReason("");
      setTempScheduleId(null);
      await fetchDetailedSchedules();
    } catch (error: any) {
      console.error("Error rejecting daily feasibility:", error);
      showToast(
        error.response?.data?.message || error.message || "Failed to reject",
        "error",
      );
    } finally {
      setSubmitting(false);
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

  const handleViewPDF = async () => {
    try {
      setDownloadingPdf(true);

      await pdfService.viewPDF(
        {
          auditId: String(selectedYear),
          type: "form5",
          year: selectedYear,
          month: selectedMonth,
          fromDetailedView: true,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          auditType: globalAuditType || undefined,
        },
        (result) => {
          setPDFViewer({
            visible: true,
            pdfData: result.pdfData,
            fileName: result.fileName,
          });
          setDownloadingPdf(false);
        },
      );
    } catch (error) {
      console.error("PDF View error:", error);
      showToast("Failed to load PDF", "error");
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

  useEffect(() => {
    if (!showModal) return;
    if (!selectedAuditDepartment) return;
    if (!formData.date) return;

    const teamInfo = getTeamMembersForDepartment(
      selectedAuditDepartment,
      formData.date,
      globalAuditType,
    );
    setDepartmentTeamInfo(teamInfo);

    const elementsToUse = globalAuditType ? [globalAuditType] : [];
    fetchCompetentUsers(
      selectedAuditDepartment,
      elementsToUse,
      teamInfo.teamAuditorIds,
      teamInfo.auditeeIds,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, selectedAuditDepartment, showModal]);

  useEffect(() => {
    if (!bulkSelectedAuditDepartment) {
      setBulkCompetentAuditors([]);
      setBulkCompetentAuditees([]);
      setBulkDepartmentTeamInfo({
        leadAuditorId: null,
        leadAuditorName: null,
        teamAuditorIds: [],
        teamAuditorNames: [],
        auditeeIds: [],
        auditeeNames: [],
      });
      return;
    }

    const teamInfo = getTeamMembersForDepartment(
      bulkSelectedAuditDepartment,
      bulkData.fromDate,
      globalAuditType,
    );
    setBulkDepartmentTeamInfo(teamInfo);

    (async () => {
      await fetchDepartmentUsers(bulkSelectedAuditDepartment, true);

      const elementsToUse =
        bulkData.selectedDepartments?.flatMap((d) => d.selectedElements) || [];
      await fetchBulkCompetentUsers(
        bulkSelectedAuditDepartment,
        elementsToUse,
        teamInfo.teamAuditorIds,
        teamInfo.auditeeIds,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkSelectedAuditDepartment, bulkData.fromDate]);

  useEffect(() => {
    if (!bulkSelectedAuditDepartment) return;
    const elementsToUse =
      bulkData.selectedDepartments?.flatMap((d) => d.selectedElements) || [];
    fetchBulkCompetentUsers(bulkSelectedAuditDepartment, elementsToUse);
  }, [bulkData.selectedDepartments]);

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

  useEffect(() => {
    const limits = getDateLimits();
    if (!limits) return;
    if (!startDate && !endDate) {
      setStartDate(limits.min);
      setEndDate(limits.max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, selectedMonth, selectedYear]);

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

  const availableAuditors: User[] = (() => {
    if (departmentTeamInfo.teamAuditorIds.length > 0) {
      return departmentAuditors.filter((auditor) =>
        departmentTeamInfo.teamAuditorIds.includes(Number(auditor.id)),
      );
    }
    if (competentAuditors.length > 0) {
      return competentAuditors;
    }
    return [];
  })();

  const availableAuditees: User[] = (() => {
    if (departmentTeamInfo.auditeeIds.length > 0) {
      return departmentAuditees.filter((auditee) =>
        departmentTeamInfo.auditeeIds.includes(Number(auditee.id)),
      );
    }
    if (competentAuditees.length > 0) {
      return competentAuditees;
    }
    return [];
  })();

  const canEdit = isAuditManager && approvalStatus === "APPROVED";
  const canApprove = isTopManagement;
  const hasSchedules = auditSchedules.length > 0;
  const dateRange = generateDateRange();

  const getBulkDateLimits = useCallback(() => {
    if (bulkData.fromDate) {
      const weekNum = getWeekNumber(bulkData.fromDate);
      return getWeekLimits(weekNum);
    }
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

    if (Platform.OS === "web") {
      return (
        <View className={`relative ${className}`}>
          <View
            className="h-11 flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3"
            style={{
              position: "relative",
              overflow: "hidden",
              opacity: disabled ? 0.6 : 1,
              backgroundColor: disabled ? "#F1F5F9" : "#FFFFFF",
            }}
          >
            <Text
              className="flex-1 text-slate-800"
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
          className={`h-11 flex-row items-center justify-between rounded-lg border border-slate-200 px-3 ${className}`}
          style={{
            backgroundColor: disabled ? "#F1F5F9" : "#FFFFFF",
            opacity: disabled ? 0.7 : 1,
          }}
        >
          <Text className="flex-1 text-slate-800">{value || placeholder}</Text>
          <Calendar size={16} color={disabled ? "#94A3B8" : iconColor} />
        </TouchableOpacity>

        {showPicker && Platform.OS === "ios" ? (
          <Modal
            visible={showPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowPicker(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: "flex-end",
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  paddingBottom: 30,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 15,
                  }}
                >
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text
                      style={{
                        color: COLORS.primary,
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text
                      style={{
                        color: COLORS.primary,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      Done
                    </Text>
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
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading schedule...
        </Text>
      </View>
    );
  }

  if (approvalStatus !== "APPROVED") {
    return (
      <View className="flex-1 bg-slate-50 p-6">
        <View className="mx-auto max-w-2xl">
          <TouchableOpacity
            onPress={onBack || (() => router.back())}
            className="mb-6 flex-row items-center gap-2"
          >
            <ArrowLeft size={18} color={COLORS.primary} />
            <Text className="text-sm font-semibold text-blue-600">
              Back to Form 5
            </Text>
          </TouchableOpacity>
          <Card className="items-center p-12">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
              <AlertCircle size={40} color={COLORS.primary} />
            </View>
            <Text className="mb-2 text-xl font-bold text-slate-900">
              Form 5 Not Approved Yet
            </Text>
            <Text className="mb-6 text-center text-sm text-slate-500">
              Please complete and get approval for the basic schedule in Form 5
              first.{"\n"}
              {monthDisplay[selectedMonth]} {selectedYear} is not approved.
            </Text>
            <OutlineButton
              title="Go to Form 5"
              icon={ArrowLeft}
              onPress={onBack || (() => router.back())}
            />
          </Card>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* HEADER */}
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="w-full px-4">
          <View
            className={`${isDesktop ? "flex-row items-center justify-between" : "flex-col gap-4"}`}
          >
            <View
              className="flex-row items-center gap-3"
              style={
                !isDesktop
                  ? { width: "100%", alignSelf: "stretch" }
                  : { flex: 1 }
              }
            >
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#475569" />
              </TouchableOpacity>
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <FileText size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {isDesktop ? (
                  <>
                    <Text
                      className="text-xl font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      Internal Audit Schedule
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      {monthDisplay[selectedMonth]} {selectedYear} - Detailed
                      View
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      className="text-lg font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      Internal Audit Schedule
                    </Text>
                    <Text
                      className="mt-0.5 text-xs font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      {monthDisplay[selectedMonth]} {selectedYear} - Detailed
                      View
                    </Text>
                  </>
                )}
              </View>
            </View>

            {isDesktop ? (
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-semibold text-slate-500">
                    Status:
                  </Text>
                  <View
                    className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
                    style={{
                      backgroundColor: COLORS.stateSuccessBg,
                      borderColor: COLORS.primaryBorder,
                    }}
                  >
                    <CheckCircle size={14} color={COLORS.primary} />
                    <Text
                      className="text-xs font-bold uppercase tracking-wide"
                      style={{ color: COLORS.primaryDark }}
                    >
                      Approved
                    </Text>
                  </View>
                </View>
                <OutlineButton
                  title="View PDF"
                  icon={Eye}
                  onPress={handleViewPDF}
                  loading={downloadingPdf}
                />
                <OutlineButton
                  title="Download"
                  icon={Printer}
                  onPress={handleDownloadPdf}
                  loading={downloadingPdf}
                />
                <TouchableOpacity
                  onPress={() => {
                    fetchDetailedSchedules();
                  }}
                  className="rounded-lg bg-slate-100 p-2.5"
                  activeOpacity={0.7}
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                <View
                  className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
                  style={{
                    backgroundColor: COLORS.stateSuccessBg,
                    borderColor: COLORS.primaryBorder,
                  }}
                >
                  <CheckCircle size={14} color={COLORS.primary} />
                  <Text
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: COLORS.primaryDark }}
                  >
                    Approved
                  </Text>
                </View>
                <View style={{ zIndex: 1000 }}>
                  <TouchableOpacity
                    onPress={() => setShowMobileMenu(!showMobileMenu)}
                    className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    activeOpacity={0.7}
                  >
                    <MoreVertical size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && !isDesktop && (
        <>
          <View
            style={{
              position: "absolute",
              top: 70,
              right: 16,
              width: 280,
              zIndex: 9999,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 15,
              elevation: 10,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowMobileMenu(false);
                handleViewPDF();
              }}
              disabled={downloadingPdf}
              className="flex-row items-center gap-3 px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
                opacity: downloadingPdf ? 0.5 : 1,
              }}
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Eye size={18} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">
                  View PDF
                </Text>
                {downloadingPdf && (
                  <Text className="text-[11px] text-slate-500">Loading...</Text>
                )}
              </View>
              {downloadingPdf && (
                <ActivityIndicator size="small" color={COLORS.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowMobileMenu(false);
                handleDownloadPdf();
              }}
              disabled={downloadingPdf}
              className="flex-row items-center gap-3 px-4 py-3.5"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
                opacity: downloadingPdf ? 0.5 : 1,
              }}
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Printer size={18} color={COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-slate-900">
                Download PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowMobileMenu(false);
                fetchDetailedSchedules();
              }}
              className="flex-row items-center gap-3 px-4 py-3.5"
              activeOpacity={0.7}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <RefreshCw size={18} color="#475569" />
              </View>
              <Text className="text-sm font-semibold text-slate-900">
                Refresh Data
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="absolute inset-0 z-50"
            activeOpacity={1}
            onPress={() => setShowMobileMenu(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}

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
        {/* Date Range Card */}
        <Card className="p-5">
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
              <Calendar size={18} color={COLORS.primary} />
            </View>
            <Text className="text-base font-bold text-slate-900">
              Date Range
            </Text>
          </View>
          <View
            style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}
          >
            <View style={{ flex: 1 }}>
              <Text className="mb-2 text-sm font-semibold text-slate-900">
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
              <Text className="mb-2 text-sm font-semibold text-slate-900">
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
        <Card className="p-5">
          <View className="mb-4 flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
              <Filter size={18} color={COLORS.primary} />
            </View>
            <Text className="text-base font-bold text-slate-900">
              Audit Type Filter
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => setGlobalAuditType("")}
              className="rounded-full border px-4 py-2"
              style={{
                borderColor: !globalAuditType ? COLORS.primary : "#E2E8F0",
                backgroundColor: !globalAuditType ? COLORS.primary : "#FFFFFF",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: !globalAuditType ? "#FFFFFF" : "#475569",
                }}
              >
                All Types
              </Text>
            </TouchableOpacity>
            {globalAuditTypesList.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setGlobalAuditType(type)}
                className="rounded-full border px-4 py-2"
                style={{
                  borderColor:
                    globalAuditType === type ? COLORS.primary : "#E2E8F0",
                  backgroundColor:
                    globalAuditType === type ? COLORS.primary : "#FFFFFF",
                }}
                activeOpacity={0.7}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: globalAuditType === type ? "#FFFFFF" : "#475569",
                  }}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Schedule Table */}
        <Card className="w-full overflow-hidden p-0">
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            <View style={{ width: 1350 }}>
              {/* Table Header */}
              <View className="flex-row border-b border-slate-200 bg-slate-50">
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Date & Time
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Area / Dept / Event
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Auditor
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Auditee
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Status
                  </Text>
                </View>
                <View style={{ flex: 1 }} className="p-4">
                  <Text className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-700">
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
                      className="flex-row border-b border-slate-200 bg-slate-50"
                    >
                      <View style={{ flex: 1 }} className="p-4">
                        <Text className="text-sm font-medium text-slate-500">
                          {dateInfo.displayDate}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          {dateInfo.dayOfWeek}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} className="p-4">
                        <Text className="text-sm italic text-slate-400">
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
                    <View className="flex-row border-b border-slate-200 bg-slate-50">
                      <View style={{ flex: 1 }} className="p-4">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-sm font-bold text-slate-900">
                            {dateInfo.displayDate}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            {dateInfo.dayOfWeek}
                          </Text>
                          {daySchedules.length > 0 && (
                            <View className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5">
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
                      <View className="flex-row border-b border-slate-200 bg-white">
                        <View style={{ flex: 1 }} className="p-4">
                          <Text className="text-sm text-slate-900">
                            {dateInfo.displayDate}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }} className="p-4">
                          <Text className="text-sm italic text-slate-400">
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
                              className="h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50"
                              activeOpacity={0.7}
                            >
                              <Plus size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ) : (
                      daySchedules.map((schedule, sIdx) => {
                        return (
                          <View
                            key={`${idx}-${sIdx}`}
                            className={`flex-row border-b border-slate-200 ${schedule.isSpecialEvent ? "bg-slate-50" : "bg-white"}`}
                          >
                            {/* Date & Time */}
                            <View style={{ flex: 1 }} className="p-4">
                              {schedule.fromDate &&
                              schedule.toDate &&
                              schedule.fromDate !== schedule.toDate ? (
                                <>
                                  <View className="mb-1 flex-row items-center gap-1">
                                    <Text className="text-xs font-semibold text-blue-600">
                                      Range:
                                    </Text>
                                    <View className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5">
                                      <Text className="text-xs font-semibold text-blue-700">
                                        Flexible
                                      </Text>
                                    </View>
                                  </View>
                                  <Text className="text-xs text-slate-700">
                                    {schedule.fromDate} → {schedule.toDate}
                                  </Text>
                                </>
                              ) : (
                                <Text className="mb-1 text-xs text-slate-500">
                                  {schedule.scheduledDate || schedule.date}
                                </Text>
                              )}
                              <Text className="font-mono text-sm font-semibold text-slate-900">
                                {schedule.startTime} - {schedule.endTime}
                              </Text>
                              <Text className="mt-1 text-xs text-slate-500">
                                {schedule.auditType || globalAuditType || "-"}
                              </Text>
                            </View>
                            {/* Area/Department */}
                            <View style={{ flex: 1 }} className="p-4">
                              {schedule.isSpecialEvent ? (
                                <View className="flex-row items-center gap-2">
                                  {schedule.specialEventType === "OPENING" && (
                                    <Sunrise size={16} color={COLORS.primary} />
                                  )}
                                  {schedule.specialEventType === "LUNCH" && (
                                    <Coffee size={16} color={COLORS.primary} />
                                  )}
                                  {schedule.specialEventType === "CLOSING" && (
                                    <Sunset size={16} color={COLORS.primary} />
                                  )}
                                  <Text className="text-sm font-semibold text-slate-900">
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
                                        <View className="h-2 w-2 rounded-full bg-blue-600" />
                                        <Text className="text-sm text-slate-900">
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
                                className="text-sm text-slate-900"
                                numberOfLines={2}
                              >
                                {schedule.auditorName || "-"}
                              </Text>
                            </View>
                            {/* Auditee */}
                            <View style={{ flex: 1 }} className="p-4">
                              <Text
                                className="text-sm text-slate-900"
                                numberOfLines={2}
                              >
                                {schedule.auditeeName || "-"}
                              </Text>
                            </View>
                            {/* Status */}
                            <View style={{ flex: 1 }} className="p-4">
                              <View className="gap-1">
                                <View className="self-start rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1">
                                  <Text className="text-[10px] font-bold uppercase tracking-wide text-blue-800">
                                    {schedule.status || "SCHEDULED"}
                                  </Text>
                                </View>
                                <ApprovalBadge
                                  status={schedule.detailedApprovalStatus}
                                />
                              </View>
                            </View>
                            {/* Actions */}
                            <View
                              style={{ flex: 1 }}
                              className="items-center p-4"
                            >
                              <View className="flex-row items-center gap-2">
                                {/* LA confirm/reject for daily schedules */}
                                {isLeadAuditor &&
                                  schedule.detailedApprovalStatus ===
                                    "PENDING_LA_CONFIRMATION" && (
                                    <>
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleLaConfirmSingle(schedule.id!)
                                        }
                                        disabled={submitting}
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50"
                                        activeOpacity={0.7}
                                      >
                                        {submitting ? (
                                          <ActivityIndicator
                                            size="small"
                                            color={COLORS.primary}
                                          />
                                        ) : (
                                          <CheckSquare
                                            size={14}
                                            color={COLORS.primary}
                                          />
                                        )}
                                      </TouchableOpacity>

                                      <TouchableOpacity
                                        onPress={() => {
                                          setTempScheduleId(schedule.id!);
                                          setLaRejectReason("");
                                          setShowLaRejectModal(true);
                                        }}
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                                        activeOpacity={0.7}
                                      >
                                        <XCircle
                                          size={14}
                                          color={COLORS.stateErrorText}
                                        />
                                      </TouchableOpacity>
                                    </>
                                  )}
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
                                        activeOpacity={0.7}
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50"
                                      >
                                        <Edit2
                                          size={14}
                                          color={COLORS.primary}
                                        />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => {
                                          handleDelete(schedule.id!);
                                        }}
                                        activeOpacity={0.7}
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                                      >
                                        <Trash2
                                          size={14}
                                          color={COLORS.stateErrorText}
                                        />
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
                                          className="h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50"
                                          activeOpacity={0.7}
                                        >
                                          <Send
                                            size={14}
                                            color={COLORS.primary}
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
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50"
                                        activeOpacity={0.7}
                                      >
                                        <Check
                                          size={14}
                                          color={COLORS.primary}
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
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                                        activeOpacity={0.7}
                                      >
                                        <X
                                          size={14}
                                          color={COLORS.stateErrorText}
                                        />
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
                                        className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                                        activeOpacity={0.7}
                                      >
                                        <MessageSquare
                                          size={14}
                                          color={COLORS.stateWarningText}
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
                                      className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                                      activeOpacity={0.7}
                                    >
                                      <MessageSquare
                                        size={14}
                                        color={COLORS.stateWarningText}
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
        <Card className="p-5">
          <View
            className={`${
              isDesktop
                ? "flex-row items-center justify-between"
                : "flex-col gap-3"
            }`}
          >
            {/* Left group: Add buttons + Bulk Schedule */}
            <View className="flex-row flex-wrap items-center gap-2">
              {canEdit &&
                dateRange
                  .filter((d) => !d.isWeekend)
                  .slice(0, 3)
                  .map((dateInfo) => (
                    <OutlineButton
                      key={dateInfo.dateStr}
                      title={`Add ${dateInfo.displayDate}`}
                      icon={Plus}
                      onPress={() => handleAddSchedule(dateInfo.dateStr)}
                    />
                  ))}
              {canEdit && (
                <OutlineButton
                  title="Bulk Schedule"
                  icon={Calendar}
                  onPress={() => setShowBulkModal(true)}
                />
              )}
            </View>

            {/* Submit button */}
            {hasSchedules && canEdit && (
              <View
                className={`flex-row items-center ${
                  isDesktop ? "justify-end" : "justify-start"
                }`}
              >
                <OutlineButton
                  title="Submit"
                  icon={Send}
                  onPress={handleSubmitAllDraftSchedules}
                  loading={submitting}
                />
              </View>
            )}
          </View>
        </Card>
        {/* Legend */}
        <Card className="p-5">
          <Text className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-700">
            Legend & Criteria
          </Text>
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-row items-center gap-2">
              <Sunrise size={16} color={COLORS.primary} />
              <Text className="text-xs text-slate-500">Opening Meeting</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Coffee size={16} color={COLORS.primary} />
              <Text className="text-xs text-slate-500">Lunch Break</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Sunset size={16} color={COLORS.primary} />
              <Text className="text-xs text-slate-500">Closing Meeting</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full border border-blue-200 bg-blue-50" />
              <Text className="text-xs text-slate-500">Scheduled</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full border border-blue-200 bg-blue-50" />
              <Text className="text-xs text-slate-500">In Progress</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full border border-blue-200 bg-blue-50" />
              <Text className="text-xs text-slate-500">Completed</Text>
            </View>
          </View>
        </Card>

        {/* Document Control */}
        <Card className="p-5">
          <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
            <View className="flex-1">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                Document Control
              </Text>
              <View className="gap-2">
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Document No.:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    IQA/F/05
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Revision:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {headerData.documentRevision || "1.0"}
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Month:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {monthDisplay[selectedMonth]} {selectedYear}
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                Audit Info
              </Text>
              <View className="gap-2">
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Objective:
                  </Text>
                  <Text
                    className="flex-1 text-sm font-medium text-slate-800"
                    numberOfLines={2}
                  >
                    {headerData.auditObjective || "—"}
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Scope:
                  </Text>
                  <Text
                    className="flex-1 text-sm font-medium text-slate-800"
                    numberOfLines={2}
                  >
                    {headerData.auditScope || "—"}
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Lead Auditor:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {headerData.leadAuditorName || "—"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Footer */}
        <Card className="p-6">
          <View className="flex-row flex-wrap gap-6">
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prepared By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {headerData.preparedBy || "—"}
              </Text>
            </View>
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Approved By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {headerData.approvedBy || "—"}
              </Text>
            </View>
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Date
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Add Schedule Modal */}
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
          competentAuditors={competentAuditors}
          competentAuditees={competentAuditees}
          loadingCompetentAuditors={loadingCompetentAuditors}
          saving={saving}
          onSave={handleSave}
          onAuditDepartmentChange={handleAuditDepartmentChange}
          getAvailableDepartmentsForDate={getAvailableDepartmentsForDate}
          isDesktop={isDesktop}
        />

        {/* Bulk Schedule Modal */}
        {showBulkModal && (
          <Modal
            visible={showBulkModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBulkModal(false)}
          >
            <TouchableOpacity
              className="flex-1 items-center justify-center bg-slate-900/30 p-6"
              activeOpacity={1}
              onPress={() => setShowBulkModal(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                className="max-h-[90%] overflow-hidden rounded-3xl bg-white"
                style={{
                  maxWidth: isDesktop ? 800 : "100%",
                  alignSelf: "center",
                  margin: isDesktop ? 40 : 0,
                  width: isDesktop ? "90%" : "100%",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.05,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
                  <View className="flex-1 flex-row items-center gap-4">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                      <Calendar size={22} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-slate-900">
                        Bulk Schedule
                      </Text>
                      <Text className="mt-1 text-sm text-slate-500">
                        Schedule same audit for multiple dates
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowBulkModal(false);
                      setBulkSelectedAuditDepartment("");
                    }}
                    className="h-9 w-9 items-center justify-center rounded-lg bg-slate-50"
                  >
                    <X size={18} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <ScrollView
                  className="px-6 py-4"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Date Range */}
                  <View className="mb-4 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="mb-2 text-sm font-semibold text-slate-900">
                        From Date *
                      </Text>
                      <DatePickerField
                        value={bulkData.fromDate}
                        onChange={(dateStr) =>
                          setBulkData((prev) => ({
                            ...prev,
                            fromDate: dateStr,
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
                      <Text className="mb-2 text-sm font-semibold text-slate-900">
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
                        <Text className="mt-1 text-xs text-slate-500">
                          Range: {bulkData.fromDate} → {bulkData.toDate}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Department Picker */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-semibold text-slate-900">
                      Department to Audit *
                    </Text>
                    {!bulkData.fromDate || !bulkData.toDate ? (
                      <View className="h-11 justify-center rounded-lg border border-slate-200 bg-slate-100 px-3">
                        <Text className="text-sm text-slate-500">
                          ⚠️ Please select From Date and To Date first
                        </Text>
                      </View>
                    ) : (
                      <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                          {getAvailableDepartmentsForBulk().map(
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
                    )}
                  </View>

                  {/* Time Pickers */}
                  <View className="mb-4 flex-row gap-4">
                    <View className="flex-1">
                      <Text className="mb-2 text-sm font-semibold text-slate-900">
                        Start Time *
                      </Text>
                      <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <Picker
                          selectedValue={bulkData.startTime}
                          onValueChange={(itemValue: string) => {
                            let newEndTime = bulkData.endTime;
                            if (
                              newEndTime &&
                              getTimeValue(newEndTime) <=
                                getTimeValue(itemValue)
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
                      <Text className="mb-2 text-sm font-semibold text-slate-900">
                        End Time *
                      </Text>
                      <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                              <Picker.Item
                                key={time}
                                label={time}
                                value={time}
                              />
                            ))}
                        </Picker>
                      </View>
                    </View>
                  </View>

                  {/* Special Event Checkbox */}
                  <View className="mb-4 flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        setBulkData({
                          ...bulkData,
                          isSpecialEvent: !bulkData.isSpecialEvent,
                          specialEventType: "",
                          selectedDepartments: [],
                        })
                      }
                      className="h-5 w-5 items-center justify-center rounded border border-slate-300"
                      style={{
                        backgroundColor: bulkData.isSpecialEvent
                          ? COLORS.primary
                          : "transparent",
                      }}
                    >
                      {bulkData.isSpecialEvent && (
                        <Check size={14} color="#FFF" />
                      )}
                    </TouchableOpacity>
                    <Text className="text-sm text-slate-900">
                      This is a Special Event (Opening/Lunch/Closing)
                    </Text>
                  </View>

                  {bulkData.isSpecialEvent ? (
                    <>
                      <View className="mb-4">
                        <Text className="mb-2 text-sm font-semibold text-slate-900">
                          Event Type *
                        </Text>
                        <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                        <View className="mb-4 flex-row gap-4">
                          <View className="flex-1">
                            <Text className="mb-2 text-sm font-semibold text-slate-900">
                              Auditor *
                            </Text>
                            <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                                {bulkAvailableAuditors.length > 0 ? (
                                  bulkAvailableAuditors.map((auditor) => (
                                    <Picker.Item
                                      key={auditor.id}
                                      label={`${auditor.firstName} ${auditor.lastName}`}
                                      value={auditor.id.toString()}
                                    />
                                  ))
                                ) : (
                                  <Picker.Item
                                    label={
                                      bulkLoadingCompetent
                                        ? "Loading auditors..."
                                        : "No auditors available"
                                    }
                                    value=""
                                    enabled={false}
                                  />
                                )}
                              </Picker>
                            </View>
                          </View>
                          <View className="flex-1">
                            <Text className="mb-2 text-sm font-semibold text-slate-900">
                              Auditee *
                            </Text>
                            <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                                {bulkAvailableAuditees.length > 0 ? (
                                  bulkAvailableAuditees.map((auditee) => (
                                    <Picker.Item
                                      key={auditee.id}
                                      label={`${auditee.firstName} ${auditee.lastName}${
                                        auditee.role === "HOD" ? " (HOD)" : ""
                                      }`}
                                      value={auditee.id.toString()}
                                    />
                                  ))
                                ) : (
                                  <Picker.Item
                                    label={
                                      bulkLoadingCompetent
                                        ? "Loading auditees..."
                                        : "No auditees available"
                                    }
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
                        <Text className="mb-2 text-sm font-semibold text-slate-900">
                          Select Audit Elements *
                        </Text>
                        <View className="max-h-60 rounded-lg border border-slate-200 p-4">
                          {!bulkSelectedAuditDepartment ? (
                            <Text className="text-center text-sm text-slate-500">
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
                                  <Text className="text-center text-sm text-slate-500">
                                    No audit elements available
                                  </Text>
                                );
                              }
                              const selectedDept =
                                bulkData.selectedDepartments?.find(
                                  (d) =>
                                    d.department ===
                                    bulkSelectedAuditDepartment,
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
                                        updated[
                                          existingIndex
                                        ].selectedElements = [
                                          ...deptInfo.auditElements,
                                        ];
                                      } else {
                                        updated.push({
                                          department:
                                            bulkSelectedAuditDepartment,
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
                                    className="mb-3 flex-row items-center gap-3"
                                  >
                                    <View
                                      className="h-5 w-5 items-center justify-center rounded border border-slate-300"
                                      style={{
                                        backgroundColor:
                                          selectedElements.length ===
                                          deptInfo.auditElements.length
                                            ? COLORS.primary
                                            : "transparent",
                                      }}
                                    >
                                      {selectedElements.length ===
                                        deptInfo.auditElements.length && (
                                        <Check size={14} color="#FFF" />
                                      )}
                                    </View>
                                    <Text className="font-semibold text-slate-900">
                                      {bulkSelectedAuditDepartment}
                                    </Text>
                                  </TouchableOpacity>
                                  <View className="ml-8 flex-row flex-wrap gap-2">
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
                                            ].selectedElements.includes(
                                              element,
                                            );
                                          if (isSelected) {
                                            updated[
                                              deptIndex
                                            ].selectedElements = updated[
                                              deptIndex
                                            ].selectedElements.filter(
                                              (el) => el !== element,
                                            );
                                          } else {
                                            updated[
                                              deptIndex
                                            ].selectedElements = [
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
                                        className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
                                        style={{
                                          borderColor:
                                            selectedElements.includes(element)
                                              ? COLORS.primaryBorder
                                              : "#E2E8F0",
                                          backgroundColor:
                                            selectedElements.includes(element)
                                              ? COLORS.primaryLight
                                              : "#F8FAFC",
                                        }}
                                      >
                                        {selectedElements.includes(element) && (
                                          <Check
                                            size={12}
                                            color={COLORS.primary}
                                          />
                                        )}
                                        <Text
                                          className="text-xs font-medium"
                                          style={{
                                            color: selectedElements.includes(
                                              element,
                                            )
                                              ? COLORS.primaryDark
                                              : "#475569",
                                          }}
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
                      <View className="mb-4 flex-1">
                        <Text className="mb-2 text-sm font-semibold text-slate-900">
                          Auditor *
                        </Text>
                        <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                            {bulkAvailableAuditors.length > 0 ? (
                              bulkAvailableAuditors.map((auditor) => (
                                <Picker.Item
                                  key={auditor.id}
                                  label={`${auditor.firstName || ""} ${auditor.lastName || ""}`.trim()}
                                  value={String(auditor.id)}
                                />
                              ))
                            ) : (
                              <Picker.Item
                                label={
                                  bulkLoadingCompetent
                                    ? "Loading auditors..."
                                    : "No auditors available"
                                }
                                value=""
                                enabled={false}
                              />
                            )}
                          </Picker>
                        </View>
                      </View>
                      {/* Auditee Picker */}
                      <View className="mb-4 flex-1">
                        <Text className="mb-2 text-sm font-semibold text-slate-900">
                          Auditee *
                        </Text>
                        <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                            {bulkAvailableAuditees.length > 0 ? (
                              bulkAvailableAuditees.map((auditee) => (
                                <Picker.Item
                                  key={auditee.id}
                                  label={`${auditee.firstName || ""} ${auditee.lastName || ""}${
                                    auditee.role === "HOD" ? " (HOD)" : ""
                                  }`.trim()}
                                  value={String(auditee.id)}
                                />
                              ))
                            ) : (
                              <Picker.Item
                                label={
                                  bulkLoadingCompetent
                                    ? "Loading auditees..."
                                    : "No auditees available"
                                }
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
                    <Text className="mb-2 text-sm font-semibold text-slate-900">
                      Status
                    </Text>
                    <View className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                <View className="flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
                  <TouchableOpacity
                    onPress={() => {
                      setShowBulkModal(false);
                      setBulkSelectedAuditDepartment("");
                    }}
                    className="h-11 justify-center rounded-xl border border-slate-200 bg-white px-6"
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm font-semibold text-slate-600">
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
                    className="h-11 flex-row items-center justify-center gap-2 rounded-xl px-6"
                    style={{
                      backgroundColor:
                        saving ||
                        !bulkSelectedAuditDepartment ||
                        !bulkData.auditorId ||
                        !bulkData.auditeeId ||
                        !bulkData.startTime ||
                        !bulkData.endTime
                          ? "#CBD5E1"
                          : COLORS.primary,
                      opacity:
                        saving ||
                        !bulkSelectedAuditDepartment ||
                        !bulkData.auditorId ||
                        !bulkData.auditeeId ||
                        !bulkData.startTime ||
                        !bulkData.endTime
                          ? 0.7
                          : 1,
                    }}
                    activeOpacity={0.8}
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
          iconColor={COLORS.stateErrorText}
          iconBg={COLORS.stateErrorBg}
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
          submitBg={COLORS.stateErrorText}
          submitting={submitting}
        />

        {/* LA Reject Modal (Daily Feasibility) */}
        <ActionModal
          isOpen={showLaRejectModal}
          onClose={() => {
            setShowLaRejectModal(false);
            setLaRejectReason("");
            setTempScheduleId(null);
          }}
          title="Reject Daily Feasibility"
          description="Please provide a reason for rejecting this daily schedule:"
          icon={XCircle}
          iconColor={COLORS.stateErrorText}
          iconBg={COLORS.stateErrorBg}
          value={laRejectReason}
          setValue={setLaRejectReason}
          placeholder="Explain why this schedule is not feasible..."
          onSubmit={() => {
            if (tempScheduleId) handleLaRejectSingle(tempScheduleId);
          }}
          submitLabel="Reject Feasibility"
          submitBg={COLORS.stateErrorText}
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
          iconColor={COLORS.stateWarningText}
          iconBg={COLORS.stateWarningBg}
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
          submitBg={COLORS.stateWarningText}
          submitting={submitting}
        />

        <PDFViewer
          visible={pdfViewer.visible}
          pdfData={pdfViewer.pdfData}
          fileName={pdfViewer.fileName}
          auditId={String(selectedYear)}
          auditNumber={`Form5-Detailed-${selectedYear}`}
          pdfType="form5"
          selectedMonth={selectedMonth}
          fromDetailedView={true}
          forumGroups={[
            {
              id: `AUDIT-${selectedYear}`,
              name: `📋 Audit Review ${selectedYear}`,
              type: "Audit",
            },
            {
              id: "AUDIT-general-forum",
              name: "📢 General Discussion",
              type: "General",
            },
          ]}
          onClose={() =>
            setPDFViewer({ visible: false, pdfData: "", fileName: "" })
          }
          onShareComplete={(forumId?: string) => {
            showToast("PDF shared to forum successfully!", "success");
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
          }}
          currentUser={user}
          allUsers={allUsers}
        />
      </ScrollView>
    </View>
  );
}
