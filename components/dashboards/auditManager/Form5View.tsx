import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Grid,
  List,
  MessageSquare,
  MoreVertical,
  Plus,
  RefreshCw,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import DocumentControlSection from "./DocumentControlSection";
import ScheduleListView from "./ScheduleListView";
import ScheduleMatrixView from "./ScheduleMatrixView";
import ScheduleModal from "./ScheduleModal";

// ═════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
const COLORS = {
  // Primary Blue Shades
  primary: "#2563EB", // Blue 600 (Main actions)
  primaryLight: "#EFF6FF", // Blue 50 (Subtle backgrounds)
  primaryBorder: "#DBEAFE", // Blue 200 (Borders)
  primaryDark: "#1E3A8A", // Blue 900 (Text on blue bg)

  // Neutral Slate Shades (For structure, no extra colors)
  bg: "#F8FAFC", // Slate 50 (App background)
  card: "#FFFFFF", // White (Cards)
  border: "#E2E8F0", // Slate 200 (Dividers)
  text: "#0F172A", // Slate 900 (Headings)
  textValue: "#334155", // Slate 700 (Body text)
  textMuted: "#64748B", // Slate 500 (Secondary text)

  // Monochromatic State Adaptations (No Red/Green/Amber)
  stateSuccessBg: "#EFF6FF", // Blue 50
  stateErrorBg: "#F1F5F9", // Slate 100
  stateWarningBg: "#F8FAFC", // Slate 50
  stateErrorText: "#475569", // Slate 600
  stateWarningText: "#64748B", // Slate 500
};

// Add these constants and helpers at the top of Form5View.tsx
const PLANT_FIELD_CANDIDATES = [
  "plantId",
  "plant_id",
  "plant",
  "plantCode",
  "plantName",
  "unitId",
  "unit_id",
  "locationId",
  "location_id",
] as const;

const plantOf = (row: any): string | number | null => {
  if (!row) return null;
  for (const k of PLANT_FIELD_CANDIDATES) {
    const v = (row as any)[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const samePlant = (row: any, plantId: string | number | null): boolean => {
  if (plantId === null || plantId === undefined || plantId === "") return true;
  const rowPlant = plantOf(row);
  if (rowPlant === null) return true;
  return String(rowPlant) === String(plantId);
};

const filterByPlant = <T,>(rows: T[], plantId: string | number | null): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
};

const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
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
const auditElementsMap: Record<string, string> = {
  "System Audit (ISO9001)": "A",
  "System Audit (IATF16949)": "B",
  "5S Audit": "C",
  "Process Audit": "D",
  "Product Audit": "E",
};

// ═════ REUSABLE UI COMPONENTS (Clean, Monochromatic, Spacious) ═════
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
  // Strictly Blue and Slate shades only
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
    info: {
      bg: COLORS.primaryLight,
      border: COLORS.primaryBorder,
      color: COLORS.primaryDark,
      iconColor: COLORS.primary,
      iconBg: "#FFFFFF",
    },
  };
  const s = stylesMap[type] || stylesMap.info;
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

// ✅ REUSABLE OUTLINE BUTTON WITH HOVER EFFECT
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? "#2563EB" : "#D1D5DB"; // Blue : Light Gray
  const textColor = isHoveredAndEnabled ? "#2563EB" : "#111827"; // Blue : Black
  const iconColor = isHoveredAndEnabled ? "#2563EB" : "#6B7280"; // Blue : Gray
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(37, 99, 235, 0.1)"
    : "transparent"; // Transparent Light Blue

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
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
      className="flex-row items-center gap-2 rounded-lg border px-4 py-2.5"
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

const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const [offset, setOffset] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const GAP = 60;
  const SPEED = 0.6; // px per frame — slower looks better

  useEffect(() => {
    // Need both measurements
    if (textWidth === 0 || containerWidth === 0) return;
    // Only animate if text is wider than the container
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
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
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
            if (w > 0 && Math.abs(w - textWidth) > 1) {
              setTextWidth(w);
            }
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
// ═════ MAIN COMPONENT ═════
interface Form5ViewProps {
  year?: number;
  preselectedYear?: number;
  preselectedMonth?: string;
  onBack?: () => void;
  allUsers?: any[];
  onOpenForum?: (forumId: string) => void;
}

export default function Form5View({
  year: propYear,
  preselectedYear: propPreselectedYear,
  preselectedMonth: propPreselectedMonth,
  onBack,
  onOpenForum,
  allUsers = [],
}: Form5ViewProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addToast } = useToast();

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const preselectedYear = params?.preselectedYear
    ? parseInt(params.preselectedYear as string)
    : propPreselectedYear || null;
  const preselectedMonth =
    (params?.preselectedMonth as string) || propPreselectedMonth || null;

  const showToast = (
    msg: string,
    type: "success" | "error" | "warning" = "success",
  ) => {
    Alert.alert(type.charAt(0).toUpperCase() + type.slice(1), msg);
  };

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => {
    if (urlYear) return urlYear;
    if (preselectedYear) return preselectedYear;
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(preselectedMonth || "");
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [planStatus, setPlanStatus] = useState<Record<string, string>>({});
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewMode, setViewMode] = useState("matrix");
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [monthComments, setMonthComments] = useState({
    approvalComments: "",
    rejectionReason: "",
    rejectedBy: "",
    rejectedAt: null as string | null,
    changeRequestedBy: "",
    changeRequestedAt: null as string | null,
    laRejectionReason: "",
    laRejectedBy: "",
    laRejectedAt: null as string | null,
  });
  const [summary, setSummary] = useState({
    totalSchedules: 0,
    departmentsCount: 0,
    weeksCovered: 0,
    completed: 0,
    inProgress: 0,
    scheduled: 0,
  });
  const [documentInfo, setDocumentInfo] = useState({
    documentRevision: "1.0",
    revisionDate: new Date().toISOString().split("T")[0],
    revisionDetails: "First Approved copy (IATF16949)",
    auditFrequency: "Half yearly",
    preparedBy: "",
    approvedBy: "",
    approvedAt: null,
  });
  const [auditObjective, setAuditObjective] = useState(
    `* To assess the effectiveness and efficiency of the quality management system.\n* To verify compliance with IATF16949:2016 requirement.\n* To detect a particular problem for improvement.\n* Other.`,
  );
  const [auditScope, setAuditScope] = useState(
    "All elements of quality system",
  );
  const [formData, setFormData] = useState({
    plantId: user?.plantId || "",
    plantName: user?.plantName || "",
    department: "",
    month: "",
    week: "",
    auditElements: [] as string[],
    auditorId: "",
    auditeeId: "",
    status: "SCHEDULED",
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });

  const getWeeksForMonth = useCallback((year: number, month: string) => {
    const monthMap: Record<string, number> = {
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
      Jan: 0,
      Feb: 1,
      Mar: 2,
    };
    const monthNum = monthMap[month];
    if (monthNum === undefined) return 4;
    const actualYear =
      month === "Jan" || month === "Feb" || month === "Mar" ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  }, []);

  const monthWeeksCount = selectedMonth
    ? getWeeksForMonth(selectedYear, selectedMonth)
    : 4;
  const displayWeeks = weeks.slice(0, monthWeeksCount);

  // ════ API CALLS (Using auditScheduleApi) ═════
  const fetchAvailableMonths = useCallback(async () => {
    if (!user?.id) {
      console.warn("⚠️ No userId, skipping availableMonths fetch");
      return;
    }
    try {
      const response = await auditScheduleApi.getAvailableMonths(
        selectedYear,
        user.id,
      );
      const months = Array.isArray(response) ? response : response?.data || [];
      setAvailableMonths(months);
      const initialStatus: Record<string, string> = {};
      months.forEach((month: any) => {
        initialStatus[month.month] = month.approvalStatus || "DRAFT";
      });
      setPlanStatus((prev) => ({ ...prev, ...initialStatus }));
      if (!selectedMonth && months.length > 0) {
        const firstWithPlan = months.find((m: any) => m.hasPlannedAudits);
        setSelectedMonth(firstWithPlan ? firstWithPlan.month : months[0].month);
      }
    } catch (error: any) {
      showToast("Failed to load available months", "error");
    }
  }, [selectedYear, selectedMonth, user?.id]);

  const fetchAvailableDepartments = useCallback(async () => {
    if (!selectedMonth) return;
    if (!user?.id) {
      console.warn("⚠️ No userId, skipping departments fetch");
      return;
    }
    try {
      const response = await auditScheduleApi.getAvailableDepartments(
        selectedYear,
        selectedMonth as any,
        user.id,
      );
      const departments = Array.isArray(response)
        ? response
        : response?.data || [];
      setAvailableDepartments(departments);
    } catch (error: any) {
      setAvailableDepartments([]);
    }
  }, [selectedYear, selectedMonth, user?.id]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedMonth) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await auditScheduleApi.getByYearAndMonth(
        selectedYear,
        selectedMonth as any,
        user?.id,
      );
      const allSchedules = Array.isArray(response)
        ? response
        : response?.data || [];
      const plantScopedSchedules = filterByPlant(
        allSchedules,
        user?.plantId ?? null,
      );
      const weekSchedules = plantScopedSchedules.filter(
        (schedule: any) => !schedule.scheduledDate,
      );
      setSchedules(weekSchedules);
    } catch (error: any) {
      showToast("Failed to load schedules", "error");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, user?.plantId]);

  const fetchSummary = useCallback(async () => {
    if (!selectedMonth) return;
    if (!user?.id) {
      console.warn("⚠️ No userId, skipping summary fetch");
      return;
    }
    try {
      const response = await auditScheduleApi.getSummary(
        selectedYear,
        selectedMonth as any,
        user.id,
      );
      const summaryData = response?.data ||
        response || {
          totalSchedules: 0,
          departmentsCount: 0,
          weeksCovered: 0,
          completed: 0,
          inProgress: 0,
          scheduled: 0,
        };
      setSummary(summaryData);
    } catch (error: any) {
      console.error("❌ ERROR fetching summary:", error);
    }
  }, [selectedYear, selectedMonth, user?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        console.warn("⚠️ No userId, skipping loadData");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const yearToFetch = preselectedYear || urlYear || selectedYear;
        const response = await auditScheduleApi.getAvailableMonths(
          yearToFetch,
          user.id,
        );
        const months = Array.isArray(response)
          ? response
          : response?.data || [];
        setAvailableMonths(months);
        const initialStatus: Record<string, string> = {};
        months.forEach((month: any) => {
          initialStatus[month.month] = month.approvalStatus || "DRAFT";
        });
        setPlanStatus((prev) => ({ ...prev, ...initialStatus }));
        let finalMonth = "";
        if (preselectedMonth) {
          finalMonth = preselectedMonth;
        } else if (months.length > 0) {
          const firstWithPlan = months.find((m: any) => m.hasPlannedAudits);
          finalMonth = firstWithPlan ? firstWithPlan.month : months[0].month;
        }
        if (finalMonth) setSelectedMonth(finalMonth);
      } catch (error) {
        console.error("Error fetching available months:", error);
        showToast("Failed to load available months", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      setLoading(true);
      Promise.all([
        fetchAvailableDepartments(),
        fetchSchedules(),
        fetchSummary(),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (!user?.id) return;
    const refetchMonths = async () => {
      setLoading(true);
      try {
        const response = await auditScheduleApi.getAvailableMonths(
          selectedYear,
          user.id,
        );
        const months = Array.isArray(response)
          ? response
          : response?.data || [];
        setAvailableMonths(months);
        const initialStatus: Record<string, string> = {};
        months.forEach((month: any) => {
          initialStatus[month.month] = month.approvalStatus || "DRAFT";
        });
        setPlanStatus((prev) => ({ ...prev, ...initialStatus }));
        if (!months.find((m: any) => m.month === selectedMonth)) {
          const firstWithPlan = months.find((m: any) => m.hasPlannedAudits);
          setSelectedMonth(
            firstWithPlan
              ? firstWithPlan.month
              : months.length > 0
                ? months[0].month
                : "",
          );
        }
      } catch (error) {
        console.error("Error refetching months:", error);
      } finally {
        setLoading(false);
      }
    };
    refetchMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, user?.id]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years);
  }, []);

  // ═════ HANDLERS ═════
  const handleRefresh = () => {
    fetchAvailableMonths();
    fetchSchedules();
    fetchSummary();
  };

  const handleViewPDF = async () => {
    if (!selectedMonth) {
      showToast("Please select a month first", "warning");
      return;
    }
    setDownloading(true);
    try {
      const fileName = `Form5_Internal_Quality_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`;
      const endpoint = `${API_BASE_URL}/api/audit-schedule/${selectedYear}/${selectedMonth}/download`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });
      if (!response.ok)
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setPDFViewer({ visible: true, pdfData: base64, fileName: fileName });
      setDownloading(false);
    } catch (error: any) {
      console.error("PDF View error:", error);
      showToast(error?.message || "Failed to load PDF", "error");
      setDownloading(false);
    }
  };

  const handleShareComplete = (forumId?: string) => {
    setPDFViewer({ visible: false, pdfData: "", fileName: "" });
    addToast("✅ PDF shared to forum successfully!", "success");
    if (forumId && onOpenForum) {
      setTimeout(() => {
        onOpenForum(forumId);
      }, 300);
    }
  };

  const handleNavigateToForum = (forumId: string) => {
    if (onOpenForum) {
      onOpenForum(forumId);
      setPDFViewer({ visible: false, pdfData: "", fileName: "" });
    } else {
      addToast("Please open the forum from the main menu", "info");
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedMonth) {
      showToast("Please select a month first", "warning");
      return;
    }
    setDownloading(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/audit-schedule/${selectedYear}/${selectedMonth}/download`;
      if (Platform.OS === "web") {
        const response = await axios.get(pdfUrl, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Form5_Internal_Quality_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast("PDF downloaded successfully!", "success");
      } else {
        let token = null;
        try {
          const AsyncStorage = (
            await import("@react-native-async-storage/async-storage")
          ).default;
          token = await AsyncStorage.getItem("authToken");
        } catch (e) {
          console.warn("AsyncStorage not found, proceeding without token.");
        }
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const fileUri = `${FileSystem.documentDirectory}Form5_Internal_Quality_Audit_Schedule_${selectedMonth}_${selectedYear}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
          headers,
        });
        if (downloadResult.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: "application/pdf",
              dialogTitle: "Save or Share Audit Schedule",
              UTI: "com.adobe.pdf",
            });
            showToast("PDF downloaded successfully!", "success");
          } else {
            showToast("PDF downloaded to app directory.", "success");
          }
        } else {
          throw new Error(
            "Download failed with status: " + downloadResult.status,
          );
        }
      }
    } catch (error: any) {
      console.error("PDF Export Error:", error);
      showToast(
        error.response?.data?.message ||
          error.message ||
          "Failed to download PDF",
        "error",
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmitSchedule = async (scheduleData: any) => {
    const currentStatus = planStatus[selectedMonth];
    if (
      currentStatus !== "DRAFT" &&
      currentStatus !== "REJECTED" &&
      currentStatus !== "CHANGE_REQUESTED" &&
      currentStatus !== "FEASIBILITY_REJECTED"
    ) {
      showToast(
        `Cannot modify schedule when status is ${currentStatus}`,
        "warning",
      );
      return false;
    }
    const parsedAuditorId = scheduleData.auditorId
      ? parseInt(String(scheduleData.auditorId), 10)
      : NaN;
    if (!parsedAuditorId || isNaN(parsedAuditorId)) {
      showToast(
        "Primary auditor is missing. Please select at least one team member.",
        "error",
      );
      return false;
    }
    setSaving(true);
    try {
      const saveData = {
        id: scheduleData.id,
        planYear: selectedYear,
        plantId: scheduleData.plantId || null,
        plantName: scheduleData.plantName || "",
        department: scheduleData.department,
        month: scheduleData.month,
        week: scheduleData.week,
        auditorId: parsedAuditorId,
        leadAuditorId: parsedAuditorId,
        leadAuditorName: scheduleData.leadAuditorName || "",
        coAuditorIdList: scheduleData.coAuditorIdList || [],
        coAuditorNames: scheduleData.coAuditorNames || [],
        auditeeIdList: scheduleData.auditeeIdList || [],
        auditeeNames: scheduleData.auditeeNames || [],
        status: scheduleData.status || "SCHEDULED",
        auditElements: scheduleData.auditElements || [],
      };
      if (editingSchedule && editingSchedule.id) {
        await auditScheduleApi.update(editingSchedule.id, saveData);
      } else {
        await auditScheduleApi.create(saveData, user?.id as string | number);
      }
      showToast("Schedule saved successfully!", "success");
      await fetchSchedules();
      await fetchSummary();
      setShowForm(false);
      setEditingSchedule(null);
      return true;
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to save schedule",
        "error",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: number, month: string) => {
    const currentStatus = planStatus[month];
    if (
      currentStatus !== "DRAFT" &&
      currentStatus !== "REJECTED" &&
      currentStatus !== "CHANGE_REQUESTED" &&
      currentStatus !== "FEASIBILITY_REJECTED"
    ) {
      showToast(
        `Cannot delete schedule when status is ${currentStatus}`,
        "warning",
      );
      return;
    }
    const performDelete = async () => {
      try {
        await auditScheduleApi.delete(id);
        showToast("Schedule deleted successfully!", "success");
        await fetchSchedules();
        await fetchSummary();
      } catch (error) {
        showToast("Failed to delete schedule", "error");
      }
    };
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this schedule?",
      );
      if (confirmed) await performDelete();
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this schedule?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ],
      );
    }
  };

  const handleSaveDocument = async () => {
    const currentStatus = planStatus[selectedMonth];
    if (
      currentStatus !== "DRAFT" &&
      currentStatus !== "REJECTED" &&
      currentStatus !== "CHANGE_REQUESTED" &&
      currentStatus !== "FEASIBILITY_REJECTED"
    ) {
      showToast(
        `Only draft, rejected, or feasibility-rejected plans can be saved`,
        "warning",
      );
      return;
    }
    setSaving(true);
    try {
      const preparedByName =
        user?.name ||
        user?.username ||
        documentInfo.preparedBy ||
        "Unknown User";
      const saveData = {
        planYear: selectedYear,
        month: selectedMonth,
        schedules: schedules,
        auditObjective,
        auditScope,
        documentRevision: documentInfo.documentRevision,
        revisionDate: documentInfo.revisionDate,
        revisionDetails: documentInfo.revisionDetails,
        auditFrequency: documentInfo.auditFrequency,
        preparedBy: preparedByName,
        preparedByName,
        approvalStatus: "DRAFT",
      };
      await auditScheduleApi.saveMonthDocument(
        saveData,
        user?.id as string | number,
      );
      showToast(
        `${monthDisplay[selectedMonth]} schedule saved as DRAFT!`,
        "success",
      );
      await fetchSchedules();
      await fetchAvailableMonths();
    } catch (error) {
      showToast("Failed to save document", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (schedules.length === 0) {
      showToast(`No schedules found. Please add schedules first.`, "warning");
      return;
    }
    setSubmitting(true);
    try {
      const preparedByName =
        user?.name ||
        user?.username ||
        documentInfo.preparedBy ||
        "Unknown User";
      const saveData = {
        planYear: selectedYear,
        month: selectedMonth,
        schedules: schedules,
        auditObjective,
        auditScope,
        documentRevision: documentInfo.documentRevision,
        revisionDate: documentInfo.revisionDate,
        revisionDetails: documentInfo.revisionDetails,
        auditFrequency: documentInfo.auditFrequency,
        preparedBy: preparedByName,
        preparedByName,
        approvalStatus: "PENDING_LA_CONFIRMATION",
      };
      await auditScheduleApi.saveMonthDocument(
        saveData,
        user?.id as string | number,
      );
      await auditScheduleApi.submitMonth(
        selectedYear,
        selectedMonth as any,
        user?.id as string | number,
      );
      setPlanStatus((prev) => ({
        ...prev,
        [selectedMonth]: "PENDING_LA_CONFIRMATION",
      }));
      showToast(
        `${monthDisplay[selectedMonth]} schedule submitted to Lead Auditor for feasibility confirmation.`,
        "success",
      );
      await fetchSchedules();
      await fetchAvailableMonths();
    } catch (error) {
      showToast("Failed to submit plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      showToast("Please provide approval comments", "warning");
      return;
    }
    if (planStatus[selectedMonth] !== "CONFIRMED_BY_LA") {
      showToast(
        "This schedule has not been confirmed by the Lead Auditor yet.",
        "warning",
      );
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.approveMonth(
        selectedYear,
        selectedMonth as any,
        user?.id as string | number,
        tempApprovalComment,
      );
      setPlanStatus((prev) => ({ ...prev, [selectedMonth]: "APPROVED" }));
      setMonthComments({
        approvalComments: tempApprovalComment,
        rejectionReason: "",
        rejectedBy: "",
        rejectedAt: null,
        changeRequestedBy: "",
        changeRequestedAt: null,
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null,
      });
      setShowApproveModal(false);
      setTempApprovalComment("");
      showToast(
        `${monthDisplay[selectedMonth]} schedule approved successfully!`,
        "success",
      );
      await fetchSchedules();
      await fetchAvailableMonths();
    } catch (error) {
      showToast("Failed to approve schedule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectMonth(
        selectedYear,
        selectedMonth as any,
        user?.id as string | number,
        tempRejectionReason,
      );
      setPlanStatus((prev) => ({ ...prev, [selectedMonth]: "REJECTED" }));
      setRejectionReason(tempRejectionReason);
      setMonthComments({
        approvalComments: "",
        rejectionReason: tempRejectionReason,
        rejectedBy: user?.name || user?.username || "",
        rejectedAt: new Date().toISOString(),
        changeRequestedBy: "",
        changeRequestedAt: null,
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null,
      });
      setShowRejectModal(false);
      setTempRejectionReason("");
      showToast(`${monthDisplay[selectedMonth]} schedule rejected`, "error");
      await fetchSchedules();
      await fetchAvailableMonths();
    } catch (error) {
      showToast("Failed to reject schedule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      showToast("Please provide a reason for changes", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { apiClient } = await import("@/services/api");
      await apiClient.post(
        `/api/audit-schedule/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      setPlanStatus((prev) => ({
        ...prev,
        [selectedMonth]: "CHANGE_REQUESTED",
      }));
      setMonthComments({
        approvalComments: "",
        rejectionReason: changeRequestReason,
        rejectedBy: "",
        rejectedAt: null,
        changeRequestedBy: user?.name || user?.username || "",
        changeRequestedAt: new Date().toISOString(),
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null,
      });
      showToast(
        `Change request submitted for ${monthDisplay[selectedMonth]}`,
        "warning",
      );
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchAvailableMonths();
      await fetchSchedules();
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to submit change request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ═════ HELPERS & BADGES (Strictly Monochromatic) ═════
  const isMonthEditable = (month: string) => {
    const status = planStatus[month] || "DRAFT";
    return (
      status === "DRAFT" ||
      status === "REJECTED" ||
      status === "CHANGE_REQUESTED" ||
      status === "FEASIBILITY_REJECTED"
    );
  };

  const hasSchedules = schedules.length > 0;
  const canEdit = isAuditManager && isMonthEditable(selectedMonth);
  const canSubmit =
    isAuditManager && isMonthEditable(selectedMonth) && hasSchedules;
  const canApprove =
    isTopManagement && planStatus[selectedMonth] === "CONFIRMED_BY_LA";

  const getPlanStatusBadge = () => {
    const status = planStatus[selectedMonth] || "DRAFT";
    // All badges use ONLY Blue or Slate shades
    const stylesMap: any = {
      APPROVED: {
        bg: COLORS.stateSuccessBg,
        color: COLORS.primaryDark,
        border: COLORS.primaryBorder,
        text: "Approved",
        icon: CheckCircle,
      },
      PENDING_LA_CONFIRMATION: {
        bg: COLORS.primaryLight,
        color: COLORS.primary,
        border: COLORS.primaryBorder,
        text: "Awaiting LA",
        icon: Clock,
      },
      CONFIRMED_BY_LA: {
        bg: "#F0F9FF",
        color: "#0369A1",
        border: "#BAE6FD",
        text: "Confirmed by LA",
        icon: CheckCircle,
      },
      FEASIBILITY_REJECTED: {
        bg: COLORS.stateErrorBg,
        color: COLORS.stateErrorText,
        border: COLORS.border,
        text: "Feasibility Rejected",
        icon: X,
      },
      PENDING_APPROVAL: {
        bg: COLORS.stateWarningBg,
        color: COLORS.stateWarningText,
        border: COLORS.border,
        text: "Pending",
        icon: Clock,
      },
      REJECTED: {
        bg: COLORS.stateErrorBg,
        color: COLORS.stateErrorText,
        border: COLORS.border,
        text: "Rejected",
        icon: X,
      },
      CHANGE_REQUESTED: {
        bg: "#F8FAFC",
        color: "#475569",
        border: "#E2E8F0",
        text: "Changes Requested",
        icon: MessageSquare,
      },
    };
    const s = stylesMap[status] || {
      bg: "#F1F5F9",
      color: "#475569",
      border: "#E2E8F0",
      text: "Draft",
      icon: FileText,
    };
    const Icon = s.icon;
    return (
      <View
        className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        <Icon size={14} color={s.color} />
        <Text
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: s.color }}
        >
          {s.text}
        </Text>
      </View>
    );
  };

  const getStatusBadge = (status: string) => {
    const stylesMap: any = {
      COMPLETED: {
        bg: COLORS.stateSuccessBg,
        color: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      IN_PROGRESS: {
        bg: COLORS.primaryLight,
        color: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      CANCELLED: {
        bg: COLORS.stateErrorBg,
        color: COLORS.stateErrorText,
        border: COLORS.border,
      },
    };
    const s = stylesMap[status] || {
      bg: COLORS.stateWarningBg,
      color: COLORS.stateWarningText,
      border: COLORS.border,
    };
    return (
      <View
        className="flex-row items-center rounded-full border px-2.5 py-1"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        <Text className="text-[11px] font-semibold" style={{ color: s.color }}>
          {status || "SCHEDULED"}
        </Text>
      </View>
    );
  };

  if (loading && !selectedMonth) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading schedule...
        </Text>
      </View>
    );
  }

  // ... (keep all the imports and existing code the same until the return statement)

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="w-full px-4">
          <View
            className={`${isDesktop ? "flex-row items-center justify-between" : "flex-col gap-4"}`}
          >
            {/* LEFT: Back + Icon + Title */}
            <View
              className="flex-row items-center gap-3"
              style={
                !isDesktop
                  ? { width: "100%", alignSelf: "stretch" }
                  : { flex: 1 }
              }
            >
              {/* Back button */}
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#475569" />
              </TouchableOpacity>

              {/* Calendar icon */}
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <Calendar size={20} color={COLORS.primary} />
              </View>

              {/* Title block — flex:1 with minWidth:0 so it can shrink and give marquee a real width */}
              <View style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {isDesktop ? (
                  <>
                    <Text
                      className="text-xl font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      Internal Quality Audit Schedule
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Form 5 - Week-wise Audit Planning
                    </Text>
                  </>
                ) : (
                  <>
                    <MarqueeText text="Internal Quality Audit Schedule" />
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Form 5 - Week-wise Audit Planning
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* RIGHT: Desktop toolbar / Mobile badge + menu */}
            {isDesktop ? (
              <View className="flex-row flex-wrap items-center gap-3">
                {/* 1. Plan Status Badge */}
                <View className="flex-row items-center gap-2">
                  {getPlanStatusBadge()}
                </View>

                {/* 2. Year Selector (Dropdown style for Desktop) */}
                <TouchableOpacity
                  onPress={() => setShowYearModal(true)}
                  className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  activeOpacity={0.7}
                >
                  <Calendar size={16} color="#64748B" />
                  <Text className="text-sm font-semibold text-slate-700">
                    {selectedYear}-{selectedYear + 1}
                  </Text>
                  <ChevronDown size={14} color="#94A3B8" />
                </TouchableOpacity>

                {/* 3. Month Selector (Dropdown style for Desktop) */}
                <TouchableOpacity
                  onPress={() => setShowMonthModal(true)}
                  className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  activeOpacity={0.7}
                >
                  <Calendar size={16} color="#64748B" />
                  <Text className="text-sm font-semibold text-slate-700">
                    {monthDisplay[selectedMonth] || "Select Month"}
                  </Text>
                  <ChevronDown size={14} color="#94A3B8" />
                </TouchableOpacity>

                {/* 4. View Mode Toggle (Matrix / List) */}
                <View className="flex-row items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <TouchableOpacity
                    onPress={() => setViewMode("matrix")}
                    className={`flex-row items-center gap-1.5 rounded-md px-3 py-1.5 ${
                      viewMode === "matrix" ? "bg-white shadow-sm" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <Grid
                      size={14}
                      color={viewMode === "matrix" ? COLORS.primary : "#64748B"}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        viewMode === "matrix"
                          ? "text-blue-600"
                          : "text-slate-500"
                      }`}
                    >
                      Matrix
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setViewMode("list")}
                    className={`flex-row items-center gap-1.5 rounded-md px-3 py-1.5 ${
                      viewMode === "list" ? "bg-white shadow-sm" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <List
                      size={14}
                      color={viewMode === "list" ? COLORS.primary : "#64748B"}
                    />
                    <Text
                      className={`text-xs font-semibold ${
                        viewMode === "list" ? "text-blue-600" : "text-slate-500"
                      }`}
                    >
                      List
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 5. Action Buttons (View PDF, Download, Refresh) */}
                <View className="flex-row items-center gap-2 border-l border-slate-200 pl-3">
                  {/* View PDF */}
                  <TouchableOpacity
                    onPress={handleViewPDF}
                    disabled={!selectedMonth || downloading}
                    className="rounded-lg bg-slate-100 p-2.5"
                    activeOpacity={0.7}
                    style={{ opacity: !selectedMonth || downloading ? 0.5 : 1 }}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <FileText size={16} color="#475569" />
                    )}
                  </TouchableOpacity>

                  {/* Download PDF */}
                  <TouchableOpacity
                    onPress={handleDownloadPDF}
                    disabled={!selectedMonth || downloading}
                    className="rounded-lg bg-slate-100 p-2.5"
                    activeOpacity={0.7}
                    style={{ opacity: !selectedMonth || downloading ? 0.5 : 1 }}
                  >
                    <Download size={16} color="#475569" />
                  </TouchableOpacity>

                  {/* Refresh */}
                  <TouchableOpacity
                    onPress={handleRefresh}
                    className="rounded-lg bg-slate-100 p-2.5"
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={16} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                {getPlanStatusBadge()}
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

      {/* ✅ Dropdown Menu - Rendered at root level for Form5View */}
      {showMobileMenu && !isDesktop && (
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
          {/* Year Selection */}
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              setShowYearModal(true);
            }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-900">
                  {selectedYear}-{selectedYear + 1}
                </Text>
                <Text className="text-[11px] text-slate-500">Change Year</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Month Selection */}
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              setShowMonthModal(true);
            }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-900">
                  {monthDisplay[selectedMonth] || "Select Month"}
                </Text>
                <Text className="text-[11px] text-slate-500">Change Month</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* View PDF */}
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              handleViewPDF();
            }}
            disabled={!selectedMonth || downloading}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
              opacity: !selectedMonth || downloading ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <FileText size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">View</Text>
              {downloading && (
                <Text className="text-[11px] text-slate-500">Loading...</Text>
              )}
            </View>
            {downloading && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </TouchableOpacity>

          {/* Download PDF */}
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              handleDownloadPDF();
            }}
            disabled={!selectedMonth || downloading}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{ opacity: !selectedMonth || downloading ? 0.5 : 1 }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Download size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                Download PDF
              </Text>
              {downloading && (
                <Text className="text-[11px] text-slate-500">
                  Downloading...
                </Text>
              )}
            </View>
            {downloading && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </TouchableOpacity>
          {/* Refresh */}
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              handleRefresh();
            }}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <RefreshCw size={18} color="#475569" />
            </View>
            <Text className="text-sm font-semibold text-slate-900">
              Refresh Data
            </Text>
          </TouchableOpacity>

          {/* View Mode Toggle */}
          <View className="border-t border-slate-100 p-3">
            <Text className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              View Mode
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setViewMode("matrix");
                  setShowMobileMenu(false);
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-2.5 ${viewMode === "matrix" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                activeOpacity={0.7}
              >
                <Grid
                  size={16}
                  color={viewMode === "matrix" ? COLORS.primary : "#64748B"}
                />
                <Text
                  className={`text-xs font-semibold ${viewMode === "matrix" ? "text-blue-600" : "text-slate-600"}`}
                >
                  Matrix
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setViewMode("list");
                  setShowMobileMenu(false);
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-2.5 ${viewMode === "list" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
                activeOpacity={0.7}
              >
                <List
                  size={16}
                  color={viewMode === "list" ? COLORS.primary : "#64748B"}
                />
                <Text
                  className={`text-xs font-semibold ${viewMode === "list" ? "text-blue-600" : "text-slate-600"}`}
                >
                  List
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ✅ Invisible overlay to close dropdown when tapping outside */}
      {showMobileMenu && !isDesktop && (
        <TouchableOpacity
          className="absolute inset-0 z-50"
          activeOpacity={1}
          onPress={() => setShowMobileMenu(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* Scrollable Content */}
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
        {/* Status Banners */}
        {selectedMonth && planStatus[selectedMonth] === "APPROVED" && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Month Approved"
            message="This month's schedule has been approved and is ready for execution."
          />
        )}
        {selectedMonth && planStatus[selectedMonth] === "PENDING_APPROVAL" && (
          <AlertBanner
            type="warning"
            icon={Clock}
            title="Pending Approval"
            message="Waiting for Top Management review. No changes allowed."
          />
        )}
        {selectedMonth &&
          planStatus[selectedMonth] === "PENDING_LA_CONFIRMATION" && (
            <AlertBanner
              type="info"
              icon={Clock}
              title="Awaiting Lead Auditor Confirmation"
              message="This schedule has been submitted to the Lead Auditor for feasibility review. You'll be notified once confirmed."
            />
          )}
        {selectedMonth && planStatus[selectedMonth] === "CONFIRMED_BY_LA" && (
          <AlertBanner
            type="info"
            icon={CheckCircle}
            title="Confirmed by Lead Auditor"
            message="Feasibility confirmed. The schedule has been forwarded to Top Management for final approval."
          />
        )}
        {selectedMonth &&
          planStatus[selectedMonth] === "FEASIBILITY_REJECTED" && (
            <AlertBanner
              type="error"
              icon={X}
              title="Feasibility Rejected by Lead Auditor"
              message={
                monthComments.laRejectionReason ||
                "The Lead Auditor rejected this schedule's feasibility. Please rework and resubmit."
              }
              footer={
                monthComments.laRejectedBy
                  ? `Rejected by: ${monthComments.laRejectedBy}`
                  : undefined
              }
            />
          )}
        {selectedMonth &&
          planStatus[selectedMonth] === "APPROVED" &&
          monthComments.approvalComments && (
            <AlertBanner
              type="info"
              icon={MessageSquare}
              title="Approval Comments"
              message={monthComments.approvalComments}
            />
          )}
        {selectedMonth &&
          planStatus[selectedMonth] === "CHANGE_REQUESTED" &&
          monthComments.rejectionReason && (
            <AlertBanner
              type="warning"
              icon={MessageSquare}
              title="Change Request"
              message={monthComments.rejectionReason}
              footer={`Requested by: ${monthComments.changeRequestedBy}`}
            />
          )}
        {selectedMonth &&
          planStatus[selectedMonth] === "REJECTED" &&
          monthComments.rejectionReason && (
            <AlertBanner
              type="error"
              icon={X}
              title="Rejection Reason"
              message={monthComments.rejectionReason}
              footer={`Rejected by: ${monthComments.rejectedBy}`}
            />
          )}

        {/* Main Table / List View */}
        <Card className="overflow-hidden">
          {viewMode === "matrix" ? (
            <ScheduleMatrixView
              departments={availableDepartments.map((d: any) => d.department)}
              deptPlanData={Object.fromEntries(
                availableDepartments.map((d: any) => [
                  d.department,
                  [{ month: selectedMonth, elements: d.auditElements }],
                ]),
              )}
              selectedMonth={selectedMonth}
              schedules={schedules}
              weeks={displayWeeks}
              selectedYear={selectedYear}
              canEdit={canEdit}
              userRole={user?.role}
              currentUserPlantId={user?.plantId}
              onCellClick={(
                department: string,
                week: string,
                existingSchedule: any,
              ) => {
                const deptData = availableDepartments.find(
                  (d: any) => d.department === department,
                );
                if (existingSchedule) {
                  setEditingSchedule(existingSchedule);
                  setFormData({
                    plantId: existingSchedule.plantId || "",
                    plantName: existingSchedule.plantName || "",
                    department: existingSchedule.department,
                    month: existingSchedule.month,
                    week: existingSchedule.week,
                    auditElements: existingSchedule.auditElements || [],
                    auditorId: existingSchedule.auditorId?.toString() || "",
                    auditeeId: existingSchedule.auditeeId?.toString() || "",
                    status: existingSchedule.status || "SCHEDULED",
                  });
                } else {
                  setEditingSchedule(null);
                  setFormData({
                    plantId: user?.plantId || "",
                    plantName: user?.plantName || "",
                    department,
                    month: selectedMonth,
                    week,
                    auditElements: deptData?.auditElements || [],
                    auditorId: "",
                    auditeeId: "",
                    status: "SCHEDULED",
                  });
                }
                setShowForm(true);
              }}
              onDeleteSchedule={handleDeleteSchedule}
              auditElementsMap={auditElementsMap}
              getStatusBadge={getStatusBadge}
            />
          ) : (
            <View className="p-6">
              {canEdit && availableDepartments.length > 0 && (
                <View className="mb-5 flex-row justify-end">
                  <OutlineButton
                    title="Add"
                    icon={Plus}
                    onPress={() => {
                      setEditingSchedule(null);
                      setFormData({
                        plantId: user?.plantId || "",
                        plantName: user?.plantName || "",
                        department: "",
                        month: selectedMonth,
                        week: "",
                        auditElements: [],
                        auditorId: "",
                        auditeeId: "",
                        status: "SCHEDULED",
                      });
                      setShowForm(true);
                    }}
                  />
                </View>
              )}
              <ScheduleListView
                schedules={schedules}
                canEdit={canEdit}
                onEdit={(schedule: any) => {
                  setEditingSchedule(schedule);
                  setFormData({
                    plantId: schedule.plantId || "",
                    plantName: schedule.plantName || "",
                    department: schedule.department,
                    month: schedule.month,
                    week: schedule.week,
                    auditElements: schedule.auditElements || [],
                    auditorId: schedule.auditorId?.toString() || "",
                    auditeeId: schedule.auditeeId?.toString() || "",
                    status: schedule.status || "SCHEDULED",
                  });
                  setShowForm(true);
                }}
                onDelete={handleDeleteSchedule}
                auditElementsMap={auditElementsMap}
                getStatusBadge={getStatusBadge}
              />
            </View>
          )}
        </Card>

        {/* Document Control Section */}
        <Card>
          <DocumentControlSection
            documentInfo={documentInfo}
            setDocumentInfo={(newInfo: any) => setDocumentInfo(newInfo)}
            planStatus={planStatus[selectedMonth]}
            selectedMonth={selectedMonth}
            monthDisplay={monthDisplay[selectedMonth]}
            canEdit={canEdit}
            canSubmit={canSubmit}
            canApprove={canApprove}
            stats={summary}
            onSaveDocument={handleSaveDocument}
            onSubmitForApproval={handleSubmitForApproval}
            onApprove={() => setShowApproveModal(true)}
            onReject={() => setShowRejectModal(true)}
            saving={saving}
            submitting={submitting}
            approvalComment=""
            setApprovalComment={() => {}}
          />
        </Card>

        {/* Resubmit button for AM when plan was rejected */}
        {isAuditManager &&
          (planStatus[selectedMonth] === "FEASIBILITY_REJECTED" ||
            planStatus[selectedMonth] === "CHANGE_REQUESTED" ||
            planStatus[selectedMonth] === "REJECTED") &&
          hasSchedules && (
            <View className="mb-6 flex-row justify-end">
              <OutlineButton
                title="Resubmit"
                icon={RefreshCw}
                onPress={handleSubmitForApproval}
                disabled={submitting}
                loading={submitting}
              />
            </View>
          )}

        {/* Request Changes Button */}
        {isTopManagement && planStatus[selectedMonth] === "APPROVED" && (
          <View className="mb-6 flex-row justify-end">
            <OutlineButton
              title="Request Changes"
              icon={MessageSquare}
              onPress={() => setShowChangeRequestModal(true)}
            />
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <ActionModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setTempApprovalComment("");
        }}
        title={`Approve ${monthDisplay[selectedMonth]} Schedule`}
        description="Please provide approval comments:"
        icon={Check}
        iconColor={COLORS.primary}
        iconBg={COLORS.stateSuccessBg}
        value={tempApprovalComment}
        setValue={setTempApprovalComment}
        placeholder="Enter approval comments..."
        onSubmit={handleApprove}
        submitLabel="Confirm Approve"
        submitBg={COLORS.primary}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setTempRejectionReason("");
        }}
        title={`Reject ${monthDisplay[selectedMonth]} Schedule`}
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor={COLORS.stateErrorText}
        iconBg={COLORS.stateErrorBg}
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg={COLORS.stateErrorText}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showChangeRequestModal}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
        }}
        title={`Request Changes - ${monthDisplay[selectedMonth]}`}
        description="Please provide details about what changes are needed:"
        icon={MessageSquare}
        iconColor={COLORS.stateWarningText}
        iconBg={COLORS.stateWarningBg}
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg={COLORS.stateWarningText}
        submitting={submitting}
      />

      <ScheduleModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingSchedule(null);
        }}
        onSave={handleSubmitSchedule}
        formData={formData}
        setFormData={setFormData}
        departments={availableDepartments.map((d) => d.department)}
        deptPlanData={Object.fromEntries(
          availableDepartments.map((d) => [
            d.department,
            [{ month: selectedMonth, elements: d.auditElements }],
          ]),
        )}
        weeks={displayWeeks}
        selectedMonth={selectedMonth}
        monthDisplay={monthDisplay}
        editingSchedule={editingSchedule}
        saving={saving}
        selectedYear={selectedYear}
        allSchedules={schedules}
        currentUserPlantId={user?.plantId}
        currentUserPlantName={user?.plantName}
      />

      {/* Year Selection Modal */}
      <Modal
        visible={showYearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-slate-900/30 p-6"
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-3xl bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
              <Text className="text-lg font-bold text-slate-900">
                Select Year
              </Text>
              <TouchableOpacity
                onPress={() => setShowYearModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearModal(false);
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedYear === year ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white"}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${selectedYear === year ? "font-bold text-blue-700" : "text-slate-700"}`}
                  >
                    {year} - {year + 1}
                  </Text>
                  {selectedYear === year && (
                    <Check size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Month Selection Modal */}
      <Modal
        visible={showMonthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-slate-900/30 p-6"
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-3xl bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
              <Text className="text-lg font-bold text-slate-900">
                Select Month
              </Text>
              <TouchableOpacity
                onPress={() => setShowMonthModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              {availableMonths.map((month: any) => (
                <TouchableOpacity
                  key={month.month}
                  onPress={() => {
                    setSelectedMonth(month.month);
                    setShowMonthModal(false);
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedMonth === month.month ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white"}`}
                  disabled={!month.hasPlannedAudits}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${selectedMonth === month.month ? "font-bold text-blue-700" : "text-slate-700"}`}
                  >
                    {monthDisplay[month.month]}{" "}
                    {!month.hasPlannedAudits && "(No plan)"}
                  </Text>
                  {selectedMonth === month.month && (
                    <Check size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PDF Viewer with Sharing */}
      <PDFViewer
        visible={pdfViewer.visible}
        pdfData={pdfViewer.pdfData}
        fileName={pdfViewer.fileName}
        auditId={String(selectedYear)}
        auditNumber={`Form5-${selectedYear}`}
        pdfType="form5"
        selectedMonth={selectedMonth}
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
    </View>
  );
}
