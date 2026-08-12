import YearFilter from "@/components/common/YearFilter";
import { apiClient } from "@/services/api"; // Adjust path if needed
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  FileText,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  Star,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useToast } from "../../context/ToastContext"; // ✅ Toast Context Imported

import { API_BASE_URL } from "@/config/apiConfig";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

// ══════ MNC STANDARD PALETTE ══════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textValue: "#1E293B",
  textSub: "#64748B",
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  dangerBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

// ══════ TYPES ══════
interface MonthData {
  month: string;
  status: string;
}

interface PlanItem {
  auditElement: string;
  months: MonthData[];
}

interface Form3ViewProps {
  year?: number;
  onBack?: () => void;
}

interface PlanInfo {
  preparedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  approvalComments: string;
  rejectedAt: string | null;
  rejectedBy: string;
  rejectionReason: string;
}

// ══════ REUSABLE COMPONENTS ══════

const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>{children}</View>
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
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.actionButton,
      {
        backgroundColor: disabled || loading ? "#F1F5F9" : bgColor,
        borderColor:
          disabled || loading ? "#E2E8F0" : borderColor || "transparent",
      },
    ]}
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : Icon ? (
      <Icon size={16} color={disabled || loading ? "#94A3B8" : color} />
    ) : null}
    <Text
      style={[
        styles.actionButtonText,
        { color: disabled || loading ? "#94A3B8" : color },
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const AlertBanner = ({ type, title, message, footer, icon: Icon }: any) => {
  const stylesMap = {
    error: {
      bg: COLORS.dangerLight,
      border: COLORS.dangerBorder,
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
  };
  const s = stylesMap[type as keyof typeof stylesMap] || stylesMap.error;

  return (
    <View
      style={[
        styles.alertBanner,
        { backgroundColor: s.bg, borderColor: s.border },
      ]}
    >
      <Icon size={20} color={s.iconColor} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertTitle, { color: s.color }]}>{title}</Text>
        <Text style={[styles.alertMessage, { color: s.color }]}>{message}</Text>
        {footer && (
          <Text style={[styles.alertFooter, { color: s.color }]}>{footer}</Text>
        )}
      </View>
    </View>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "COMPLETED") {
    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: COLORS.successLight,
            borderColor: COLORS.successBorder,
          },
        ]}
      >
        <Check size={14} color={COLORS.success} />
      </View>
    );
  }
  if (status === "PLANNED") {
    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: COLORS.primaryLight,
            borderColor: COLORS.primaryBorder,
          },
        ]}
      >
        <Clock size={14} color={COLORS.primary} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
      ]}
    >
      <Text style={styles.statusBadgeEmpty}>—</Text>
    </View>
  );
};

const PlanStatusBadge = ({ status }: { status: string }) => {
  const stylesMap: any = {
    APPROVED: {
      bg: COLORS.successLight,
      color: "#065F46",
      border: COLORS.successBorder,
      text: "Approved",
      icon: CheckCircle,
    },
    PENDING_APPROVAL: {
      bg: COLORS.warningLight,
      color: "#92400E",
      border: COLORS.warningBorder,
      text: "Pending Approval",
      icon: Clock,
    },
    REJECTED: {
      bg: COLORS.dangerLight,
      color: "#991B1B",
      border: COLORS.dangerBorder,
      text: "Rejected",
      icon: X,
    },
    CHANGE_REQUESTED: {
      bg: "#FFF7ED",
      color: "#9A3412",
      border: "#FED7AA",
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
      style={[
        styles.planStatusBadge,
        { backgroundColor: s.bg, borderColor: s.border },
      ]}
    >
      <Icon size={14} color={s.color} />
      <Text style={[styles.planStatusText, { color: s.color }]}>{s.text}</Text>
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
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIconBox,
                { backgroundColor: iconBg, borderColor: iconBorder },
              ]}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalDesc}>{description}</Text>
            </View>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={styles.modalInput}
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              textAlignVertical="top"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.modalFooter}>
            <ActionButton
              onPress={onClose}
              color={COLORS.textValue}
              bgColor={COLORS.card}
              borderColor={COLORS.border}
            >
              Cancel
            </ActionButton>
            <ActionButton
              onPress={onSubmit}
              disabled={!value.trim()}
              loading={submitting}
              color="#FFF"
              bgColor={submitBg}
              icon={Icon}
            >
              {submitLabel}
            </ActionButton>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default function Form3View({ year: propYear, onBack }: Form3ViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // ✅ Initialize Toast Context
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [planData, setPlanData] = useState<PlanItem[]>([]);
  const [planStatus, setPlanStatus] = useState("DRAFT");
  const [rejectionReason, setRejectionReason] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);

  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");

  const urlYear = params?.year ? parseInt(params.year as string) : null;

  // ✅ Priority: propYear > urlYear > current year
  const [selectedYear, setSelectedYear] = useState(
    propYear || urlYear || new Date().getFullYear(),
  );

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  // ✅ Sync state if route params change
  useEffect(() => {
    if (params?.year) {
      setSelectedYear(parseInt(params.year as string));
    }
  }, [params?.year]);

  // ✅ Sync with prop changes from parent
  useEffect(() => {
    if (propYear && propYear !== selectedYear) {
      setSelectedYear(propYear);
    }
  }, [propYear]);

  // ✅ Fetch data when year changes
  useEffect(() => {
    fetchPlanData();
  }, [selectedYear]);

  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    preparedBy: "",
    approvedBy: "",
    approvedAt: null,
    approvalComments: "",
    rejectedAt: null,
    rejectedBy: "",
    rejectionReason: "",
  });

  const auditElements = [
    { id: 1, name: "System Audit (ISO9001)" },
    { id: 2, name: "System Audit (IATF16949)" },
    { id: 3, name: "5S Audit" },
    { id: 4, name: "Process Audit" },
    { id: 5, name: "Product Audit" },
  ];

  const financialMonths = [
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

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/audit-plan/${selectedYear}`);
      const data = response.data || response;
      if (data) {
        setPlanData(data.planItems || []);
        setPlanStatus(data.approvalStatus || "DRAFT");
        setRejectionReason(data.rejectionReason || "");
        setPlanInfo({
          preparedBy: data.preparedBy || user?.name || user?.username || "",
          approvedBy: data.approvedBy || "",
          approvedAt: data.approvedAt || null,
          approvalComments: data.approvalComments || "",
          rejectedAt: data.rejectedAt || null,
          rejectedBy: data.rejectedBy || "",
          rejectionReason: data.rejectionReason || "",
        });
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      addToast("Failed to load plan data", "error"); // ✅ Toast
    } finally {
      setLoading(false);
    }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan in its current status", "warning"); // ✅ Toast
      return;
    }
    setDemoLoading(true);
    try {
      let newPlanData = [...planData];
      if (newPlanData.length === 0) {
        auditElements.forEach((element) => {
          const monthsData = financialMonths.map((month) => ({
            month,
            status: "",
          }));
          newPlanData.push({ auditElement: element.name, months: monthsData });
        });
      }
      let totalPlannedCount = 0;
      newPlanData.forEach((element) => {
        if (
          element.auditElement === "System Audit (IATF16949)" ||
          element.auditElement === "5S Audit"
        ) {
          element.months.forEach((month) => {
            if (month.status !== "PLANNED") {
              month.status = "PLANNED";
              totalPlannedCount++;
            }
          });
        }
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
      });
      addToast(
        `Demo mode: ${totalPlannedCount} audits marked as PLANNED!`,
        "success",
      ); // ✅ Toast
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to mark audits as planned", "error"); // ✅ Toast
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSave = async () => {
    if (planStatus === "APPROVED") {
      addToast("Approved plan cannot be modified", "warning"); // ✅ Toast
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      addToast("Annual Audit Plan saved successfully!", "success"); // ✅ Toast
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to save plan", "error"); // ✅ Toast
    } finally {
      setSaving(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.setParams({ year: year.toString() });
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false;
    let plannedCount = 0;
    planData.forEach((element) =>
      element?.months?.forEach((month) => {
        if (month?.status === "PLANNED") {
          hasPlanned = true;
          plannedCount++;
        }
      }),
    );
    if (!hasPlanned) {
      addToast(
        "Please mark at least one month as PLANNED before submitting",
        "warning",
      ); // ✅ Toast
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/submit?userId=${user?.id}`,
        {},
      );
      addToast(
        `Plan ${planStatus === "REJECTED" ? "resubmitted" : "submitted"} for approval! (${plannedCount} months planned)`,
        "success",
      ); // ✅ Toast
      await fetchPlanData();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to submit plan",
        "error",
      ); // ✅ Toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (elementIndex: number, monthName: string) => {
    if (!canEdit) return;
    const newPlanData = [...planData];
    const element = newPlanData[elementIndex];
    if (!element) return;
    const monthIndex = element.months.findIndex((m) => m.month === monthName);
    if (monthIndex === -1) return;
    const currentStatus = element.months[monthIndex].status;
    element.months[monthIndex].status =
      currentStatus === ""
        ? "PLANNED"
        : currentStatus === "PLANNED"
          ? "COMPLETED"
          : "";
    setPlanData(newPlanData);
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast("Please provide approval comments", "warning"); // ✅ Toast
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/approve?userId=${user?.id}`,
        { comments: tempApprovalComment },
      );
      setPlanStatus("APPROVED");
      setPlanInfo((prev) => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedAt: new Date().toISOString(),
        approvedBy: user?.name || user?.username || "",
      }));
      setShowApproveModal(false);
      setTempApprovalComment("");
      addToast("Plan approved successfully!", "success"); // ✅ Toast
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to approve plan", "error"); // ✅ Toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error"); // ✅ Toast
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/reject?userId=${user?.id}`,
        { reason: tempRejectionReason },
      );
      setPlanStatus("REJECTED");
      setRejectionReason(tempRejectionReason);
      setPlanInfo((prev) => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.name || user?.username || "",
      }));
      setShowRejectModal(false);
      setTempRejectionReason("");
      addToast("Plan rejected", "error"); // ✅ Toast
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to reject plan", "error"); // ✅ Toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      addToast("Please provide a reason", "error"); // ✅ Toast
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      addToast(`Change request submitted for ${selectedYear}`, "warning"); // ✅ Toast
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchPlanData();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to submit change request",
        "error",
      ); // ✅ Toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const pdfUrl = `${API_BASE_URL}/api/audit-plan/${selectedYear}/export-pdf`;

      if (Platform.OS === "web") {
        // ✅ WEB: Standard Blob Download
        const response = await axios.get(pdfUrl, {
          responseType: "blob",
          withCredentials: true,
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Annual_Audit_Plan_${selectedYear}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        addToast("PDF exported successfully!", "success");
      } else {
        // ✅ MOBILE: FileSystem Download + Native Share Sheet (Save to Files)

        // 1. Get Auth Token (adjust key if you store it differently)
        let token = null;
        try {
          const AsyncStorage = (
            await import("@react-native-async-storage/async-storage")
          ).default;
          token = await AsyncStorage.getItem("token");
        } catch (e) {
          console.warn("AsyncStorage not found, proceeding without token.");
        }

        // ✅ FIX: Explicitly type headers as Record<string, string> to fix TS Error #2
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        // Using documentDirectory safely from the legacy import
        const fileUri = `${FileSystem.documentDirectory}Annual_Audit_Plan_${selectedYear}.pdf`;

        // 2. Download the file to the app's local directory
        const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri, {
          headers,
        });

        // 3. Open the native Share Sheet so the user can save it to "Files" or share it
        if (downloadResult.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: "application/pdf",
              dialogTitle: "Save or Share Annual Audit Plan",
              UTI: "com.adobe.pdf", // iOS specific
            });
            addToast("PDF ready to save/share!", "success");
          } else {
            addToast("PDF downloaded to app directory.", "success");
          }
        } else {
          throw new Error(
            "Download failed with status: " + downloadResult.status,
          );
        }
      }
    } catch (error: any) {
      console.error("PDF Export Error:", error);
      addToast(
        error.response?.data?.message ||
          error.message ||
          "Failed to export PDF",
        "error",
      );
    } finally {
      setExporting(false);
    }
  };
  const totalPlanned = useMemo(() => {
    let count = 0;
    planData.forEach((element) =>
      element?.months?.forEach((month) => {
        if (month?.status === "PLANNED") count++;
      }),
    );
    return count;
  }, [planData]);

  const canEdit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED");
  const canSubmit = canEdit && totalPlanned > 0;
  const canApprove = isTopManagement && planStatus === "PENDING_APPROVAL";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading plan data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ NEW HEADER (Matches UserManagement look & feel, fixed at top) */}
      <View className="px-4 pt-3 pb-3 bg-white border-b border-gray-200">
        <View
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          {/* Top Row: Back, Icon, Title (Always visible) */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-4">
              {/* Back Button */}
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="items-center justify-center w-10 h-10 mr-2 bg-gray-100 rounded-xl"
              >
                <ArrowLeft size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Icon Box */}
              <View
                className="items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                }}
              >
                <Calendar size={22} color={COLORS.primary} />
              </View>

              {/* Title & Subtitle */}
              <View className="flex-1 ml-3">
                <Text
                  className="text-lg font-bold text-gray-900"
                  numberOfLines={1}
                >
                  Annual Internal Audit Plan
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  Annual Audit Planning (Financial Year)
                </Text>
              </View>
            </View>

            {/* Desktop Only: Right side controls in the same row */}
            {isDesktop && (
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-semibold text-gray-500">
                    Status:
                  </Text>
                  <PlanStatusBadge status={planStatus} />
                </View>
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={fetchPlanData}
                  className="p-2 bg-gray-100 rounded-lg"
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Mobile Only: Right side controls drop to a second row */}
          {!isDesktop && (
            <View className="flex-row flex-wrap items-center justify-end gap-2 mt-3">
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-gray-500">
                  Status:
                </Text>
                <PlanStatusBadge status={planStatus} />
              </View>
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                availableYears={availableYears}
              />
              <TouchableOpacity
                onPress={fetchPlanData}
                className="p-2 bg-gray-100 rounded-lg"
              >
                <RefreshCw size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ✅ SCROLLVIEW STARTS BELOW HEADER */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && {
            maxWidth: 1200,
            alignSelf: "center",
            width: "100%",
            paddingHorizontal: 32, // Adds left/right margins on desktop
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts */}
        {planStatus === "CHANGE_REQUESTED" &&
          (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner
              type="warning"
              icon={AlertCircle}
              title="Change Request Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Requested by: ${planInfo.rejectedBy} | Date: ${planInfo.rejectedAt ? new Date(planInfo.rejectedAt).toLocaleDateString() : ""}`}
            />
          )}
        {planStatus === "REJECTED" &&
          (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner
              type="error"
              icon={AlertCircle}
              title="Rejection Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Rejected by: ${planInfo.rejectedBy} | Date: ${planInfo.rejectedAt ? new Date(planInfo.rejectedAt).toLocaleDateString() : ""}`}
            />
          )}
        {planStatus === "APPROVED" && planInfo.approvalComments && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Approval Comments"
            message={planInfo.approvalComments}
            footer={`Approved by: ${planInfo.approvedBy} | Date: ${planInfo.approvedAt ? new Date(planInfo.approvedAt).toLocaleDateString() : ""}`}
          />
        )}

        {/* Demo Banner */}
        {canEdit && (
          <Card style={styles.demoCard}>
            <View style={styles.demoContent}>
              <View style={styles.demoLeft}>
                <View style={styles.demoIconBox}>
                  <Star size={20} color={COLORS.purple} />
                </View>
                <View>
                  <Text style={styles.demoTitle}>Quick Planning Demo</Text>
                  <Text style={styles.demoSubtitle}>
                    Save time with automatic planning for IATF16949 & 5S audits
                  </Text>
                </View>
              </View>
              <ActionButton
                onPress={handleDemoPlanned}
                loading={demoLoading}
                color="#FFF"
                bgColor={COLORS.purple}
                icon={Star}
              >
                Demo: Plan All (IATF & 5S)
              </ActionButton>
            </View>
          </Card>
        )}

        {/* Main Table */}
        <Card style={styles.tableCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableScroll}
          >
            <View style={{ minWidth: 950 }}>
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.tableHeaderCell, { width: 60 }]}>
                  <Text style={styles.tableHeaderText}>S.NO</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: 220 }]}>
                  <Text style={styles.tableHeaderText}>AUDIT ELEMENTS</Text>
                </View>
                {financialMonths.map((month, idx) => (
                  <View
                    key={month}
                    style={[
                      styles.tableHeaderCell,
                      { width: 71, borderRightWidth: idx === 11 ? 0 : 1 },
                    ]}
                  >
                    <Text style={styles.tableHeaderText}>{month}</Text>
                  </View>
                ))}
              </View>

              {/* Table Body */}
              {planData.length === 0 ? (
                <View style={styles.emptyTable}>
                  <Text style={styles.emptyTableText}>
                    No audit elements found. Click "Demo" to initialize.
                  </Text>
                </View>
              ) : (
                planData.map((element, elementIndex) => (
                  <View key={elementIndex} style={styles.tableRow}>
                    <View style={[styles.tableCell, { width: 60 }]}>
                      <Text style={styles.tableCellText}>
                        {elementIndex + 1}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { width: 220 }]}>
                      <Text
                        style={[styles.tableCellText, { fontWeight: "600" }]}
                      >
                        {element.auditElement}
                      </Text>
                    </View>
                    {financialMonths.map((month, idx) => {
                      const status =
                        element.months?.find((m) => m.month === month)
                          ?.status || "";
                      return (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.tableCell,
                            { width: 71, borderRightWidth: idx === 11 ? 0 : 1 },
                          ]}
                          onPress={() =>
                            handleStatusChange(elementIndex, month)
                          }
                          disabled={!canEdit}
                          activeOpacity={0.7}
                        >
                          <StatusBadge status={status} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </Card>

        {/* Legend & Actions */}
        <Card style={styles.actionsCard}>
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Legend:</Text>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
              />
              <Text style={styles.legendText}>P - Planned</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: COLORS.success }]}
              />
              <Text style={styles.legendText}>C - Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#CBD5E1" }]}
              />
              <Text style={styles.legendText}>— - Not Planned</Text>
            </View>
          </View>
          <View style={styles.actionsContainer}>
            {planData.length > 0 && (
              <ActionButton
                onPress={handleExportPDF}
                loading={exporting}
                color={COLORS.textValue}
                bgColor={COLORS.card}
                borderColor={COLORS.border}
                icon={Download}
              >
                Export PDF
              </ActionButton>
            )}
            {canEdit && (
              <ActionButton
                onPress={handleSave}
                loading={saving}
                color={COLORS.textValue}
                bgColor={COLORS.card}
                borderColor={COLORS.border}
                icon={Save}
              >
                Save Draft
              </ActionButton>
            )}
            {canSubmit && (
              <ActionButton
                onPress={handleSubmitForApproval}
                loading={submitting}
                color="#FFF"
                bgColor={COLORS.primary}
                icon={Send}
              >
                {planStatus === "REJECTED"
                  ? "Resubmit for Approval"
                  : "Submit for Approval"}
              </ActionButton>
            )}
            {canApprove && (
              <>
                <ActionButton
                  onPress={() => setShowRejectModal(true)}
                  color="#FFF"
                  bgColor={COLORS.danger}
                  icon={X}
                >
                  Reject
                </ActionButton>
                <ActionButton
                  onPress={() => setShowApproveModal(true)}
                  color="#FFF"
                  bgColor={COLORS.success}
                  icon={Check}
                >
                  Approve
                </ActionButton>
              </>
            )}
            {isTopManagement && planStatus === "APPROVED" && (
              <ActionButton
                onPress={() => setShowChangeRequestModal(true)}
                color="#FFF"
                bgColor={COLORS.warning}
                icon={MessageSquare}
              >
                Request Changes
              </ActionButton>
            )}
          </View>
        </Card>

        {/* Comments History */}
        {(planInfo.approvalComments ||
          rejectionReason ||
          planInfo.rejectionReason) && (
          <Card style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <MessageSquare size={16} color={COLORS.textMain} />
              <Text style={styles.historyTitle}>Plan History & Comments</Text>
            </View>
            <View style={styles.historyContent}>
              {planInfo.approvalComments && (
                <View
                  style={[
                    styles.historyItem,
                    { borderLeftColor: COLORS.success },
                  ]}
                >
                  <View style={styles.historyItemHeader}>
                    <CheckCircle size={14} color={COLORS.success} />
                    <Text
                      style={[styles.historyItemLabel, { color: "#065F46" }]}
                    >
                      Approval Comment
                    </Text>
                  </View>
                  <Text style={styles.historyItemText}>
                    {planInfo.approvalComments}
                  </Text>
                  {planInfo.approvedBy && (
                    <Text style={styles.historyItemMeta}>
                      By: {planInfo.approvedBy} | Date:{" "}
                      {planInfo.approvedAt
                        ? new Date(planInfo.approvedAt).toLocaleDateString()
                        : ""}
                    </Text>
                  )}
                </View>
              )}
              {(rejectionReason || planInfo.rejectionReason) &&
                planStatus === "REJECTED" && (
                  <View
                    style={[
                      styles.historyItem,
                      { borderLeftColor: COLORS.danger },
                    ]}
                  >
                    <View style={styles.historyItemHeader}>
                      <X size={14} color={COLORS.danger} />
                      <Text
                        style={[styles.historyItemLabel, { color: "#991B1B" }]}
                      >
                        Rejection Reason
                      </Text>
                    </View>
                    <Text style={styles.historyItemText}>
                      {rejectionReason || planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text style={styles.historyItemMeta}>
                        By: {planInfo.rejectedBy} | Date:{" "}
                        {planInfo.rejectedAt
                          ? new Date(planInfo.rejectedAt).toLocaleDateString()
                          : ""}
                      </Text>
                    )}
                  </View>
                )}
              {planStatus === "CHANGE_REQUESTED" &&
                planInfo.rejectionReason && (
                  <View
                    style={[
                      styles.historyItem,
                      { borderLeftColor: COLORS.warning },
                    ]}
                  >
                    <View style={styles.historyItemHeader}>
                      <MessageSquare size={14} color={COLORS.warning} />
                      <Text
                        style={[styles.historyItemLabel, { color: "#92400E" }]}
                      >
                        Change Request Reason
                      </Text>
                    </View>
                    <Text style={styles.historyItemText}>
                      {planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text style={styles.historyItemMeta}>
                        By: {planInfo.rejectedBy} | Date:{" "}
                        {planInfo.rejectedAt
                          ? new Date(planInfo.rejectedAt).toLocaleDateString()
                          : ""}
                      </Text>
                    )}
                  </View>
                )}
            </View>
          </Card>
        )}

        {/* Footer */}
        <Card style={styles.footerCard}>
          <View style={styles.footerGrid}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Prepared By</Text>
              <Text style={styles.footerValue}>{planInfo.preparedBy}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Approved By</Text>
              <Text style={styles.footerValue}>
                {planInfo.approvedBy ||
                  (planStatus === "APPROVED" ? "Pending" : "Not Approved")}
              </Text>
              {planInfo.approvedAt && (
                <Text style={styles.footerMeta}>
                  {new Date(planInfo.approvedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Date</Text>
              <Text style={styles.footerValue}>
                {new Date().toLocaleDateString()}
              </Text>
            </View>
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
        title="Approve Plan"
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
        title="Reject Plan"
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor={COLORS.danger}
        iconBg={COLORS.dangerLight}
        iconBorder={COLORS.dangerBorder}
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg={COLORS.danger}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showChangeRequestModal}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
        }}
        title={`Request Changes - ${selectedYear}`}
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
    </View>
  );
}

// ══════ STYLES ══════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { marginTop: 12, color: COLORS.textSub, fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Card Base
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 24,
  },

  // Plan Status Badge
  planStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  planStatusText: { fontSize: 12, fontWeight: "600" },

  // Alert Banner
  alertBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start", // Keeps icon at the top if text wraps
  },
  alertTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  alertMessage: { fontSize: 13, opacity: 0.9, flexWrap: "wrap" }, // Allows text to wrap
  alertFooter: { fontSize: 12, opacity: 0.7, marginTop: 8 },

  // Demo Card
  demoCard: {
    padding: 20,
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purpleBorder,
  },
  demoContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  demoLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  demoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.purpleBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  demoTitle: { fontSize: 15, fontWeight: "700", color: "#4C1D95" },
  demoSubtitle: { fontSize: 13, color: "#6D28D9", marginTop: 2 },

  // Table
  tableCard: { padding: 0, overflow: "hidden" },
  tableScroll: { maxHeight: 500 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeaderCell: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tableCell: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  tableCellText: { fontSize: 13, color: COLORS.textValue },
  emptyTable: { padding: 40, alignItems: "center" },
  emptyTableText: { color: COLORS.textSub, fontSize: 14 },

  // Status Badges in Table
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  statusBadgeEmpty: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },

  // Actions & Legend
  actionsCard: { padding: 20 },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: COLORS.textSub },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
  },
  // Action Button
  actionButton: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: { fontSize: 14, fontWeight: "600" },

  // History
  historyCard: { padding: 24 },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  historyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textMain },
  historyContent: { gap: 16 },
  historyItem: { paddingLeft: 16, borderLeftWidth: 3 },
  historyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  historyItemLabel: { fontSize: 13, fontWeight: "600" },
  historyItemText: { fontSize: 14, color: COLORS.textValue, marginBottom: 4 },
  historyItemMeta: { fontSize: 12, color: COLORS.textSub },

  // Footer
  footerCard: { padding: 24 },
  footerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  footerItem: { flex: 1, minWidth: 150 },
  footerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerValue: { fontSize: 14, fontWeight: "500", color: COLORS.textValue },
  footerMeta: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textMain },
  modalDesc: { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  modalBody: { padding: 24 },
  modalInput: {
    width: "100%",
    minHeight: 120,
    padding: 12,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    color: COLORS.textValue,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});
