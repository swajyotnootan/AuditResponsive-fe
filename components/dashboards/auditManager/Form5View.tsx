import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi } from "@/services/auditScheduleApi"; // ✅ Added import for the API service
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Grid,
  List,
  MessageSquare,
  Plus,
  RefreshCw,
  X } from "lucide-react-native";
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
  useWindowDimensions } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext"; // Adjust path if needed
import DocumentControlSection from "./DocumentControlSection";
import ScheduleListView from "./ScheduleListView";
import ScheduleMatrixView from "./ScheduleMatrixView";
import ScheduleModal from "./ScheduleModal";

// ═════ MNC STANDARD PALETTE ═════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#000000",
  textValue: "#1F2937",
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
  warningBorder: "#FDE68A" };

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
  if (rowPlant === null) return true; // fail-open when row has no plant
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
  Mar: "March" };
const auditElementsMap: Record<string, string> = {
  "System Audit (ISO9001)": "A",
  "System Audit (IATF16949)": "B",
  "5S Audit": "C",
  "Process Audit": "D",
  "Product Audit": "E" };

// ═════ REUSABLE UI COMPONENTS ═════
const Card = ({ children, className }: any) => (
  <View
    className={`mb-6 rounded-xl border border-gray-200 bg-white shadow-sm ${className || ""}`}
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
  children }: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-5 ${disabled || loading ? "border-gray-200 bg-gray-100" : ""}`}
    style={{
      backgroundColor: disabled || loading ? undefined : bgColor,
      borderColor:
        disabled || loading ? undefined : borderColor || "transparent" }}
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

const AlertBanner = ({ type, title, message, footer, icon: Icon }: any) => {
  const stylesMap: any = {
    error: {
      bg: COLORS.errorLight,
      border: COLORS.errorBorder,
      color: "#991B1B",
      iconColor: "#DC2626" },
    warning: {
      bg: COLORS.warningLight,
      border: COLORS.warningBorder,
      color: "#92400E",
      iconColor: "#D97706" },
    success: {
      bg: COLORS.successLight,
      border: COLORS.successBorder,
      color: "#065F46",
      iconColor: "#059669" },
    info: {
      bg: COLORS.accentLight,
      border: COLORS.accentBorder,
      color: "#1E3A8A",
      iconColor: COLORS.accent } };
  const s = stylesMap[type] || stylesMap.info;
  return (
    <View
      className="mb-6 flex-row gap-3 rounded-xl border p-4"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-lg border bg-white"
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
  submitting }: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-black/30 p-5"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white"
        >
          <View className="flex-row items-center gap-4 border-b border-gray-200 p-6">
            <View
              className="h-11 w-11 items-center justify-center rounded-xl border"
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
              className="min-h-[120px] w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-800"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </View>
          <View className="flex-row justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 justify-center rounded-lg border border-gray-200 bg-white px-5"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!value.trim() || submitting}
              className="h-10 flex-row items-center justify-center gap-2 rounded-lg px-5"
              style={{
                backgroundColor:
                  !value.trim() || submitting ? "#F1F5F9" : submitBg }}
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

// ═════ MAIN COMPONENT ═════
interface Form5ViewProps {
  year?: number;
  preselectedYear?: number;
  preselectedMonth?: string;
  onBack?: () => void;
  allUsers?: any[]; // ← Add this
  onOpenForum?: (forumId: string) => void; // ✅ ADD THIS
}

export default function Form5View({
  year: propYear,
  preselectedYear: propPreselectedYear,
  preselectedMonth: propPreselectedMonth,
  onBack,
  onOpenForum,
  allUsers = [] }: Form5ViewProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();

  console.log("🟢🟢🟢 [Form5View] user from useAuth:");
  console.log("   user?.id:", user?.id);
  console.log("   user?.role:", user?.role);
  console.log("   user?.plantId:", user?.plantId);
  console.log("   user?.plantName:", user?.plantName);
  console.log("   FULL USER:", JSON.stringify(user, null, 2));
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
    // ✅ NEW
    laRejectionReason: "",
    laRejectedBy: "",
    laRejectedAt: null as string | null });
  const [summary, setSummary] = useState({
    totalSchedules: 0,
    departmentsCount: 0,
    weeksCovered: 0,
    completed: 0,
    inProgress: 0,
    scheduled: 0 });
  const [documentInfo, setDocumentInfo] = useState({
    documentRevision: "1.0",
    revisionDate: new Date().toISOString().split("T")[0],
    revisionDetails: "First Approved copy (IATF16949)",
    auditFrequency: "Half yearly",
    preparedBy: "",
    approvedBy: "",
    approvedAt: null });
  const [auditObjective, setAuditObjective] =
    useState(`* To assess the effectiveness and efficiency of the quality management system.
* To verify compliance with IATF16949:2016 requirement.
* To detect a particular problem for improvement.
* Other.`);
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
    status: "SCHEDULED" });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "" });

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
      Mar: 2 };
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

      // ✅ ADD PLANT FILTER HERE
      const plantScopedSchedules = filterByPlant(
        allSchedules,
        user?.plantId ?? null,
      );

      const weekSchedules = plantScopedSchedules.filter(
        (schedule: any) => !schedule.scheduledDate,
      );

      setSchedules(weekSchedules);
      // ... rest of the logic
    } catch (error: any) {
      showToast("Failed to load schedules", "error");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, user?.plantId]); // ✅ Add user?.plantId dependency
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
          scheduled: 0 };
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

        console.log("🟩 [loadData] availableMonths count =", months.length);
        console.log("🟩 [loadData] preselectedMonth =", preselectedMonth);

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

        console.log("🟩 [loadData] computed finalMonth =", finalMonth);
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
        // ...
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

  // Form5View.tsx - Replace handleDownloadPDF with handleViewPDF

  // ✅ View PDF with Viewer (replaces direct download)
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
        headers: {
          Accept: "application/pdf" },});

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const blob = await response.blob();

      // ✅ Convert blob to base64 for PDF viewer
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setPDFViewer({
        visible: true,
        pdfData: base64,
        fileName: fileName });
      setDownloading(false);
    } catch (error: any) {
      console.error("PDF View error:", error);
      showToast(error?.message || "Failed to load PDF", "error");
      setDownloading(false);
    }
  };

  const handleShareComplete = (forumId?: string) => {
    console.log("🟡 [Form4View] onShareComplete called with forumId:", forumId);

    // Close PDF viewer
    setPDFViewer({ visible: false, pdfData: "", fileName: "" });

    // Show toast
    addToast("✅ PDF shared to forum successfully!", "success");

    // Navigate to forum
    if (forumId && onOpenForum) {
      console.log("🟢 [Form4View] Calling onOpenForum with:", forumId);
      setTimeout(() => {
        onOpenForum(forumId);
      }, 300);
    }
  };

  // ✅ Handle Navigate to Forum
  const handleNavigateToForum = (forumId: string) => {
    console.log("🟣 [Form4View] onNavigateToForum called with:", forumId);
    if (onOpenForum) {
      console.log("🟢 [Form4View] Direct navigation via onOpenForum:", forumId);
      onOpenForum(forumId);
      setPDFViewer({ visible: false, pdfData: "", fileName: "" });
    } else {
      console.log("🔴 [Form4View] onOpenForum not available!");
      addToast("Please open the forum from the main menu", "info");
    }
  };

  // ✅ Keep this for direct download (optional)
  const handleDownloadPDF = async () => {
    if (!selectedMonth) {
      showToast("Please select a month first", "warning");
      return;
    }
    setDownloading(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/audit-schedule/${selectedYear}/${selectedMonth}/download`;

      if (Platform.OS === "web") {
        const response = await axios.get(pdfUrl, {
          responseType: "blob" });

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
          headers });

        if (downloadResult.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: "application/pdf",
              dialogTitle: "Save or Share Audit Schedule",
              UTI: "com.adobe.pdf" });
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

    // ✅ Validate that a primary auditor (first team member) exists
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

        // ✅ Plant info
        plantId: scheduleData.plantId || null,
        plantName: scheduleData.plantName || "",

        department: scheduleData.department,
        month: scheduleData.month,
        week: scheduleData.week,

        // ✅ Auto-derived lead auditor (first team member)
        auditorId: parsedAuditorId,
        leadAuditorId: parsedAuditorId,
        leadAuditorName: scheduleData.leadAuditorName || "",

        // ✅ Team auditors (single source of truth)
        // Sent as coAuditorIdList / coAuditorNames to match backend createSchedule()
        coAuditorIdList: scheduleData.coAuditorIdList || [],
        coAuditorNames: scheduleData.coAuditorNames || [],

        // Auditees
        auditeeIdList: scheduleData.auditeeIdList || [],
        auditeeNames: scheduleData.auditeeNames || [],

        status: scheduleData.status || "SCHEDULED",
        auditElements: scheduleData.auditElements || [] };

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
      currentStatus !== "FEASIBILITY_REJECTED" // ✅ ADD
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
      // ✅ DESKTOP FIX: window.confirm works in browsers and returns true/false
      const confirmed = window.confirm(
        "Are you sure you want to delete this schedule?",
      );
      if (confirmed) {
        await performDelete();
      }
    } else {
      // ✅ MOBILE: Native Alert with buttons
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
      currentStatus !== "FEASIBILITY_REJECTED" // ✅ ADD
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
        approvalStatus: "DRAFT" };
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
        approvalStatus: "PENDING_LA_CONFIRMATION", // ✅ CORRECT
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
        [selectedMonth]: "PENDING_LA_CONFIRMATION" }));
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
        approvalComments: tempApprovalComment, // ✅ Use the actual comment
        rejectionReason: "",
        rejectedBy: "",
        rejectedAt: null,
        changeRequestedBy: "",
        changeRequestedAt: null,
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null });
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
        rejectionReason: tempRejectionReason, // ✅ Correct
        rejectedBy: user?.name || user?.username || "", // ✅ Set this
        rejectedAt: new Date().toISOString(), // ✅ Set this
        changeRequestedBy: "",
        changeRequestedAt: null,
        // ✅ ADD
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null });
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
      // Note: request-changes is not yet in auditScheduleApi, so we fall back to apiClient
      // (matching the behavior of the React web version using axios directly for this endpoint).
      // You can add `requestChanges` to auditScheduleApi later for consistency.
      const { apiClient } = await import("@/services/api");
      await apiClient.post(
        `/api/audit-schedule/${selectedYear}/${selectedMonth}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );

      setPlanStatus((prev) => ({
        ...prev,
        [selectedMonth]: "CHANGE_REQUESTED" }));
      setMonthComments({
        approvalComments: "",
        rejectionReason: changeRequestReason,
        rejectedBy: "",
        rejectedAt: null,
        changeRequestedBy: user?.name || user?.username || "",
        changeRequestedAt: new Date().toISOString(),
        // ✅ ADD
        laRejectionReason: "",
        laRejectedBy: "",
        laRejectedAt: null });
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

  // ═════ HELPERS & BADGES ═════
  const isMonthEditable = (month: string) => {
    const status = planStatus[month] || "DRAFT";
    return (
      status === "DRAFT" ||
      status === "REJECTED" ||
      status === "CHANGE_REQUESTED" ||
      status === "FEASIBILITY_REJECTED" // ✅ NEW — AM can rework LA rejections
    );
  };

  const hasSchedules = schedules.length > 0;
  const canEdit = isAuditManager && isMonthEditable(selectedMonth);
  const canSubmit =
    isAuditManager && isMonthEditable(selectedMonth) && hasSchedules;
  // ✅ TM can ONLY approve when LA has confirmed feasibility
  const canApprove =
    isTopManagement && planStatus[selectedMonth] === "CONFIRMED_BY_LA";
  const getPlanStatusBadge = () => {
    const status = planStatus[selectedMonth] || "DRAFT";
    const stylesMap: any = {
      APPROVED: {
        bg: COLORS.successLight,
        color: "#065F46",
        border: COLORS.successBorder,
        text: "Approved",
        icon: CheckCircle },
      // ✅ NEW
      PENDING_LA_CONFIRMATION: {
        bg: "#EFF6FF", // light blue
        color: "#1E40AF",
        border: "#BFDBFE",
        text: "Awaiting LA",
        icon: Clock },
      // ✅ NEW
      CONFIRMED_BY_LA: {
        bg: "#EDE9FE", // light purple
        color: "#5B21B6",
        border: "#DDD6FE",
        text: "Confirmed by LA",
        icon: CheckCircle },
      // ✅ NEW
      FEASIBILITY_REJECTED: {
        bg: "#FEF2F2",
        color: "#991B1B",
        border: "#FECACA",
        text: "Feasibility Rejected",
        icon: X },
      PENDING_APPROVAL: {
        bg: COLORS.warningLight,
        color: "#92400E",
        border: COLORS.warningBorder,
        text: "Pending",
        icon: Clock },
      REJECTED: {
        bg: COLORS.errorLight,
        color: "#991B1B",
        border: COLORS.errorBorder,
        text: "Rejected",
        icon: X },
      CHANGE_REQUESTED: {
        bg: "#FFF7ED",
        color: "#9A3412",
        border: "#FED7AA",
        text: "Changes Requested",
        icon: MessageSquare } };

    const s = stylesMap[status] || {
      bg: "#F1F5F9",
      color: "#475569",
      border: "#E2E8F0",
      text: "Draft",
      icon: FileText };
    const Icon = s.icon;
    return (
      <View
        className="flex-row items-center gap-1.5 rounded-full border px-3 py-1"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        <Icon size={12} color={s.color} />
        <Text className="text-xs font-semibold" style={{ color: s.color }}>
          {s.text}
        </Text>
      </View>
    );
  };

  const getStatusBadge = (status: string) => {
    const stylesMap: any = {
      COMPLETED: {
        bg: COLORS.successLight,
        color: "#065F46",
        border: COLORS.successBorder },
      IN_PROGRESS: {
        bg: COLORS.accentLight,
        color: "#1E40AF",
        border: COLORS.accentBorder },
      CANCELLED: {
        bg: COLORS.errorLight,
        color: "#991B1B",
        border: COLORS.errorBorder } };
    const s = stylesMap[status] || {
      bg: COLORS.warningLight,
      color: "#92400E",
      border: COLORS.warningBorder };
    return (
      <View
        className="flex-row items-center rounded-full border px-2 py-0.5"
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
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text className="mt-3 text-sm text-gray-500">Loading schedule...</Text>
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
          paddingTop: isDesktop ? 20 : 16,
          paddingBottom: isDesktop ? 20 : 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB" }}
      >
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center" }}>
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: isDesktop ? "center" : "stretch",
              justifyContent: isDesktop ? "space-between" : "flex-start",
              gap: isDesktop ? 24 : 16 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 1 }}
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
                  justifyContent: "center" }}
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
                  justifyContent: "center" }}
              >
                <Calendar size={22} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontSize: isDesktop ? 20 : 18,
                    fontWeight: "700",
                    color: "#111827" }}
                  numberOfLines={1}
                >
                  Internal Quality Audit Schedule
                </Text>
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    color: "#6B7280",
                    marginTop: 2 }}
                  numberOfLines={1}
                >
                  Form 5 - Week-wise Audit Planning
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                justifyContent: isDesktop ? "flex-end" : "flex-start" }}
            >
              {getPlanStatusBadge()}
              <TouchableOpacity
                onPress={() => setShowYearModal(true)}
                style={{
                  height: isDesktop ? 40 : 36,
                  paddingHorizontal: isDesktop ? 16 : 12,
                  justifyContent: "center",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.card }}
              >
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: "500",
                    color: "#374151" }}
                >
                  {isDesktop
                    ? `${selectedYear}-${selectedYear + 1}`
                    : `${selectedYear}-${String(selectedYear + 1).slice(-2)}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowMonthModal(true)}
                style={{
                  height: isDesktop ? 40 : 36,
                  paddingHorizontal: isDesktop ? 16 : 12,
                  justifyContent: "center",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.card }}
              >
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: "500",
                    color: "#374151" }}
                >
                  {selectedMonth
                    ? isDesktop
                      ? monthDisplay[selectedMonth]
                      : selectedMonth
                    : "Select Month"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefresh}
                style={{
                  width: isDesktop ? 40 : 36,
                  height: isDesktop ? 40 : 36,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center" }}
              >
                <RefreshCw size={isDesktop ? 18 : 16} color="#6b7280" />
              </TouchableOpacity>

              {/* View PDF Button - Opens PDF Viewer */}
              <TouchableOpacity
                onPress={handleViewPDF}
                disabled={!selectedMonth || downloading}
                style={{
                  height: isDesktop ? 40 : 36,
                  paddingHorizontal: isDesktop ? 20 : 12,
                  backgroundColor:
                    !selectedMonth || downloading ? "#E5E7EB" : "#8B5CF6",
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8 }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <FileText size={isDesktop ? 18 : 16} color="#FFF" />
                )}
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: "600",
                    color: "#FFF" }}
                >
                  View PDF
                </Text>
              </TouchableOpacity>

              {/* Download PDF Button - Direct Download */}
              <TouchableOpacity
                onPress={handleDownloadPDF}
                disabled={!selectedMonth || downloading}
                style={{
                  height: isDesktop ? 40 : 36,
                  paddingHorizontal: isDesktop ? 20 : 12,
                  backgroundColor:
                    !selectedMonth || downloading ? "#E5E7EB" : COLORS.accent,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8 }}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Download size={isDesktop ? 18 : 16} color="#FFF" />
                )}
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: "600",
                    color: "#FFF" }}
                >
                  PDF
                </Text>
              </TouchableOpacity>
              <View
                style={{
                  flexDirection: "row",
                  padding: 4,
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 8 }}
              >
                <TouchableOpacity
                  onPress={() => setViewMode("matrix")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: isDesktop ? 16 : 12,
                    paddingVertical: isDesktop ? 8 : 6,
                    borderRadius: 6,
                    backgroundColor:
                      viewMode === "matrix" ? "#FFFFFF" : "transparent",
                    shadowColor: viewMode === "matrix" ? "#000" : "transparent",
                    shadowOffset:
                      viewMode === "matrix"
                        ? { width: 0, height: 1 }
                        : undefined,
                    shadowOpacity: viewMode === "matrix" ? 0.05 : 0,
                    shadowRadius: viewMode === "matrix" ? 2 : 0,
                    elevation: viewMode === "matrix" ? 1 : 0 }}
                >
                  <Grid
                    size={isDesktop ? 16 : 14}
                    color={viewMode === "matrix" ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    style={{
                      fontSize: isDesktop ? 14 : 12,
                      fontWeight: "600",
                      color: viewMode === "matrix" ? "#2563EB" : "#64748B" }}
                  >
                    Matrix
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode("list")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: isDesktop ? 16 : 12,
                    paddingVertical: isDesktop ? 8 : 6,
                    borderRadius: 6,
                    backgroundColor:
                      viewMode === "list" ? "#FFFFFF" : "transparent",
                    shadowColor: viewMode === "list" ? "#000" : "transparent",
                    shadowOffset:
                      viewMode === "list" ? { width: 0, height: 1 } : undefined,
                    shadowOpacity: viewMode === "list" ? 0.05 : 0,
                    shadowRadius: viewMode === "list" ? 2 : 0,
                    elevation: viewMode === "list" ? 1 : 0 }}
                >
                  <List
                    size={isDesktop ? 16 : 14}
                    color={viewMode === "list" ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    style={{
                      fontSize: isDesktop ? 14 : 12,
                      fontWeight: "600",
                      color: viewMode === "list" ? "#2563EB" : "#64748B" }}
                  >
                    List
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 1400,
                alignSelf: "center",
                width: "100%",
                padding: 24 }
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

        {/* ✅ NEW: Awaiting LA confirmation */}
        {selectedMonth &&
          planStatus[selectedMonth] === "PENDING_LA_CONFIRMATION" && (
            <AlertBanner
              type="info"
              icon={Clock}
              title="Awaiting Lead Auditor Confirmation"
              message="This schedule has been submitted to the Lead Auditor for feasibility review. You'll be notified once confirmed."
            />
          )}

        {/* ✅ NEW: Confirmed by LA — waiting for TM approval */}
        {selectedMonth && planStatus[selectedMonth] === "CONFIRMED_BY_LA" && (
          <AlertBanner
            type="info"
            icon={CheckCircle}
            title="Confirmed by Lead Auditor"
            message="Feasibility confirmed. The schedule has been forwarded to Top Management for final approval."
          />
        )}

        {/* ✅ NEW: LA rejected feasibility */}
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

        {/* Departments Info */}
        {availableDepartments.length > 0 && (
          <Card className="p-6">
            <View className="mb-4 flex-row items-center gap-2">
              <Text className="text-sm font-bold text-gray-900">
                Departments for {monthDisplay[selectedMonth]}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {availableDepartments.map((dept: any) => {
                const hasSchedule = schedules.some(
                  (s) => s.department === dept.department,
                );
                const scheduleCount = schedules.filter(
                  (s) => s.department === dept.department,
                ).length;
                const completedCount = schedules.filter(
                  (s) =>
                    s.department === dept.department &&
                    s.status === "COMPLETED",
                ).length;
                return (
                  <View
                    key={dept.department}
                    className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${hasSchedule ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${hasSchedule ? "text-green-800" : "text-gray-700"}`}
                    >
                      {dept.department}
                    </Text>
                    {hasSchedule ? (
                      <CheckCircle size={14} color="#10B981" />
                    ) : canEdit ? (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingSchedule(null);
                          setFormData({
                            plantId: user?.plantId || "",
                            plantName: user?.plantName || "",
                            department: dept.department,
                            month: selectedMonth,
                            week: "",
                            auditElements: dept.auditElements || [],
                            auditorId: "",
                            auditeeId: "",
                            status: "SCHEDULED" });
                          setShowForm(true);
                        }}
                      >
                        <Plus size={14} color="#2563EB" />
                      </TouchableOpacity>
                    ) : (
                      <Clock size={14} color="#64748B" />
                    )}
                    {scheduleCount > 0 && (
                      <Text
                        className={`text-[10px] font-bold ${completedCount === scheduleCount ? "text-green-600" : "text-gray-500"}`}
                      >
                        {completedCount}/{scheduleCount}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
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
                    plantId: existingSchedule.plantId || "", // ✅ NEW
                    plantName: existingSchedule.plantName || "", // ✅ NEW
                    department: existingSchedule.department,
                    month: existingSchedule.month,
                    week: existingSchedule.week,
                    auditElements: existingSchedule.auditElements || [],
                    auditorId: existingSchedule.auditorId?.toString() || "",
                    auditeeId: existingSchedule.auditeeId?.toString() || "",
                    status: existingSchedule.status || "SCHEDULED" });
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
                    status: "SCHEDULED" });
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
                  <ActionButton
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
                        status: "SCHEDULED" });
                      setShowForm(true);
                    }}
                    color="#FFF"
                    bgColor={COLORS.accent}
                    icon={Plus}
                  >
                    Add Schedule
                  </ActionButton>
                </View>
              )}
              <ScheduleListView
                schedules={schedules}
                canEdit={canEdit}
                onEdit={(schedule: any) => {
                  setEditingSchedule(schedule);
                  setFormData({
                    plantId: schedule.plantId || "", // ✅ NEW
                    plantName: schedule.plantName || "", // ✅ NEW
                    department: schedule.department,
                    month: schedule.month,
                    week: schedule.week,
                    auditElements: schedule.auditElements || [],
                    auditorId: schedule.auditorId?.toString() || "",
                    auditeeId: schedule.auditeeId?.toString() || "",
                    status: schedule.status || "SCHEDULED" });

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

        {/* ✅ NEW: Resubmit button for AM when plan was rejected */}
        {isAuditManager &&
          (planStatus[selectedMonth] === "FEASIBILITY_REJECTED" ||
            planStatus[selectedMonth] === "CHANGE_REQUESTED" ||
            planStatus[selectedMonth] === "REJECTED") &&
          hasSchedules && (
            <View className="mb-6 flex-row justify-end">
              <ActionButton
                onPress={handleSubmitForApproval}
                disabled={submitting}
                loading={submitting}
                color="#FFF"
                bgColor={COLORS.accent}
                icon={RefreshCw}
              >
                Resubmit to Lead Auditor
              </ActionButton>
            </View>
          )}

        {/* Request Changes Button */}
        {isTopManagement && planStatus[selectedMonth] === "APPROVED" && (
          <View className="mb-6 flex-row justify-end">
            <ActionButton
              onPress={() => setShowChangeRequestModal(true)}
              color="#FFF"
              bgColor={COLORS.warning}
              icon={MessageSquare}
            >
              Request Changes
            </ActionButton>
          </View>
        )}

        {/* Legend & Criteria */}
        <Card className="p-6">
          <Text className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-900">
            Legend & Criteria
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-6">
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-blue-500"></View>
              <Text className="text-xs text-gray-500">P - Planned</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-green-500"></View>
              <Text className="text-xs text-gray-500">C - Completed</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-full bg-gray-300"></View>
              <Text className="text-xs text-gray-500">— - Not Planned</Text>
            </View>
          </View>
          <View className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Text className="text-xs leading-5 text-gray-600">
              <Text className="font-bold text-gray-800">Audit Criteria:</Text>{" "}
              ISO9001:2015 IATF16949 Standard, QMS Manual, QMS Procedures, WI,
              etc.
            </Text>
            <Text className="mt-1 text-xs leading-5 text-gray-600">
              <Text className="font-bold text-gray-800">Audit Scope:</Text>{" "}
              Applicable process within department/function and clause No. 4, 5,
              6, 7, 8, 9 & 10
            </Text>
            <Text className="mt-1 text-xs leading-5 text-gray-600">
              <Text className="font-bold text-gray-800">Audit Method:</Text>{" "}
              Interview with Auditee, Observation and verification
            </Text>
          </View>
        </Card>
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
        iconColor={COLORS.success}
        iconBg={COLORS.successLight}
        iconBorder={COLORS.successBorder}
        value={tempApprovalComment}
        setValue={setTempApprovalComment}
        placeholder="Enter approval comments..."
        onSubmit={handleApprove}
        submitLabel="Confirm Approve"
        submitBg={COLORS.success}
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
        iconColor={COLORS.error}
        iconBg={COLORS.errorLight}
        iconBorder={COLORS.errorBorder}
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg={COLORS.error}
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
        iconColor={COLORS.warning}
        iconBg={COLORS.warningLight}
        iconBorder={COLORS.warningBorder}
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg={COLORS.warning}
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
          className="flex-1 items-center justify-center bg-black/30 p-5"
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-2xl bg-white"
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 p-6">
              <Text className="text-lg font-bold text-gray-900">
                Select Year
              </Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)}>
                <X size={20} color="#64748B" />
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
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedYear === year ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                >
                  <Text
                    className={`text-sm font-medium ${selectedYear === year ? "font-bold text-blue-600" : "text-gray-800"}`}
                  >
                    {year} - {year + 1}
                  </Text>
                  {selectedYear === year && <Check size={16} color="#2563EB" />}
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
          className="flex-1 items-center justify-center bg-black/30 p-5"
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-2xl bg-white"
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 p-6">
              <Text className="text-lg font-bold text-gray-900">
                Select Month
              </Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <X size={20} color="#64748B" />
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
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedMonth === month.month ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
                  disabled={!month.hasPlannedAudits}
                >
                  <Text
                    className={`text-sm font-medium ${selectedMonth === month.month ? "font-bold text-blue-600" : "text-gray-800"}`}
                  >
                    {monthDisplay[month.month]}{" "}
                    {!month.hasPlannedAudits && "(No plan)"}
                  </Text>
                  {selectedMonth === month.month && (
                    <Check size={16} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ✅ PDF Viewer with Sharing */}
      <PDFViewer
        visible={pdfViewer.visible}
        pdfData={pdfViewer.pdfData}
        fileName={pdfViewer.fileName}
        auditId={String(selectedYear)}
        auditNumber={`Form5-${selectedYear}`}
        pdfType="form5"
        selectedMonth={selectedMonth} // ← NEW PROP
        forumGroups={[
          {
            id: `AUDIT-${selectedYear}`,
            name: `📋 Audit Review ${selectedYear}`,
            type: "Audit" },
          {
            id: "AUDIT-general-forum",
            name: "📢 General Discussion",
            type: "General" },
        ]}
        onClose={() =>
          setPDFViewer({ visible: false, pdfData: "", fileName: "" })
        }
        onShareComplete={(forumId?: string) => {
          showToast("PDF shared to forum successfully!", "success");
          setPDFViewer({ visible: false, pdfData: "", fileName: "" });
          // Navigate to forum if needed
          if (forumId) {
            // You can add navigation logic here if needed
            // For Form5, you might want to navigate to forum or just close
          }
        }}
        currentUser={user}
        allUsers={allUsers} // ✅ PASS allUsers from props to PDFViewer
      />
    </View>
  );
}
