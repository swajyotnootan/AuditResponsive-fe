import PDFViewer from "@/components/audit/PDFViewer";
import YearFilter from "@/components/common/YearFilter";
import { apiClient } from "@/services/api";
import { pdfService } from "@/services/pdfService";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  Eye,
  FileText,
  MessageSquare,
  MoreVertical,
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
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ActionModal,
  AlertBanner,
  Card,
  COLORS,
  ConfirmModal,
  MarqueeText,
  MonthCellTooltip,
  OutlineButton,
  PlanStatusBadge,
  ScheduleDetailsModal,
  StatusBadge,
} from "./form3Components";

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
  onOpenForum?: (forumId: string) => void;
  allUsers?: any[];
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

// ═════ MAIN COMPONENT ═════
export default function Form3View({
  year: propYear,
  onBack,
  onOpenForum,
  allUsers = [],
}: Form3ViewProps) {
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [planData, setPlanData] = useState<PlanItem[]>([]);
  const [planStatus, setPlanStatus] = useState("DRAFT");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showYearModal, setShowYearModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [detailsModal, setDetailsModal] = useState<{
    visible: boolean;
    auditElement: string;
    month: string;
    loading: boolean;
    schedules: any[];
    error: string | null;
  }>({
    visible: false,
    auditElement: "",
    month: "",
    loading: false,
    schedules: [],
    error: null,
  });

  // ═════ CONFIRM MODAL STATE (for PLANNED → COMPLETED) ═════
  const [pendingComplete, setPendingComplete] = useState<{
    elementIndex: number;
    month: string;
  } | null>(null);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);

  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [tooltip, setTooltip] = useState({
    visible: false,
    month: "",
    status: "",
    auditElement: "",
    count: 0,
    anchor: null as { x: number; y: number } | null,
  });
  const [scheduleCounts, setScheduleCounts] = useState<
    Record<string, Record<string, number>>
  >({});

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const [selectedYear, setSelectedYear] = useState(
    propYear || urlYear || new Date().getFullYear(),
  );
  const availableYears = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i),
    [],
  );
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

  useEffect(() => {
    if (params?.year) setSelectedYear(parseInt(params.year as string));
  }, [params?.year]);
  useEffect(() => {
    if (propYear && propYear !== selectedYear) setSelectedYear(propYear);
  }, [propYear]);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/api/audit-plan/${selectedYear}?userId=${user?.id}`,
      );
      const data = res.data || res;
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
      addToast("Failed to load plan data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchPlanData();
  }, [selectedYear, user?.id]);

  const mapElementToAuditType = (elementName: string): string[] => {
    if (elementName.includes("ISO9001"))
      return ["System Audit (ISO9001)", "ISO9001"];
    if (elementName.includes("IATF16949"))
      return ["System Audit (IATF16949)", "IATF16949"];
    if (elementName.includes("5S")) return ["5S Audit"];
    if (elementName.includes("Process")) return ["Process Audit"];
    if (elementName.includes("Product")) return ["Product Audit"];
    return [elementName];
  };

  const fetchScheduleCounts = async () => {
    if (!user?.id || planData.length === 0) {
      setScheduleCounts({});
      return;
    }
    const userPlantId = (user as any)?.plantId;
    const counts: Record<string, Record<string, number>> = {};
    try {
      const monthlyData: Record<string, any[]> = {};
      await Promise.all(
        financialMonths.map(async (month) => {
          try {
            const r = await apiClient.get(
              `/api/audit-schedule/detailed/${selectedYear}/${month}`,
            );
            monthlyData[month] = r.data || r || [];
          } catch {
            monthlyData[month] = [];
          }
        }),
      );
      planData.forEach((element) => {
        const acceptedTypes = mapElementToAuditType(element.auditElement).map(
          (t) => t.toLowerCase(),
        );
        counts[element.auditElement] = {};
        financialMonths.forEach((month) => {
          const filtered = (monthlyData[month] || []).filter((s) => {
            if (
              userPlantId &&
              s.plantId &&
              String(s.plantId) !== String(userPlantId)
            )
              return false;
            let matchesElement = false;
            if (Array.isArray(s.auditElements) && s.auditElements.length > 0)
              matchesElement = s.auditElements.some((el: string) =>
                acceptedTypes.some((t) => el.toLowerCase().includes(t)),
              );
            if (!matchesElement && s.auditType)
              matchesElement = acceptedTypes.some((t) =>
                s.auditType.toLowerCase().includes(t),
              );
            if (!matchesElement) return false;
            if (!isAuditManager && !isTopManagement)
              return (
                s.auditorId === user?.id ||
                (Array.isArray(s.coAuditorIdList) &&
                  s.coAuditorIdList.includes(user?.id))
              );
            return true;
          });
          counts[element.auditElement][month] = filtered.length;
        });
      });
      setScheduleCounts(counts);
    } catch {
      setScheduleCounts({});
    }
  };

  useEffect(() => {
    fetchScheduleCounts();
  }, [selectedYear, planData, user?.id]);

  const handleCellPress = async (auditElement: string, month: string) => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    setDetailsModal({
      visible: true,
      auditElement,
      month,
      loading: true,
      schedules: [],
      error: null,
    });
    try {
      const response = await apiClient.get(
        `/api/audit-schedule/detailed/${selectedYear}/${month}`,
      );
      const all: any[] = response.data || response || [];
      const acceptedTypes = mapElementToAuditType(auditElement).map((t) =>
        t.toLowerCase(),
      );
      const userPlantId = (user as any)?.plantId;
      let filtered = all.filter((s) => {
        if (
          userPlantId &&
          s.plantId &&
          String(s.plantId) !== String(userPlantId)
        )
          return false;
        let matchesElement = false;
        if (Array.isArray(s.auditElements) && s.auditElements.length > 0)
          matchesElement = s.auditElements.some((el: string) =>
            acceptedTypes.some((t) => el.toLowerCase().includes(t)),
          );
        if (!matchesElement && s.auditType)
          matchesElement = acceptedTypes.some((t) =>
            s.auditType.toLowerCase().includes(t),
          );
        if (!matchesElement) return false;
        if (!isAuditManager && !isTopManagement)
          return (
            s.auditorId === user?.id ||
            (Array.isArray(s.coAuditorIdList) &&
              s.coAuditorIdList.includes(user?.id))
          );
        return true;
      });
      filtered.sort(
        (a, b) =>
          (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0) -
          (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0),
      );
      setDetailsModal((prev) => ({
        ...prev,
        loading: false,
        schedules: filtered,
      }));
    } catch {
      setDetailsModal((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load schedules.",
      }));
    }
  };

  const handleViewPDF = async () => {
    if (!user?.id) {
      addToast("User session not ready. Please wait.", "warning");
      return;
    }
    setExporting(true);
    try {
      await pdfService.viewPDF(
        {
          auditId: String(selectedYear),
          type: "form3",
          year: selectedYear,
          userId: user.id,
        },
        (result) => {
          setPDFViewer({
            visible: true,
            pdfData: result.pdfData,
            fileName: result.fileName,
          });
          setExporting(false);
        },
      );
    } catch {
      addToast("Failed to load PDF", "error");
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (planStatus === "APPROVED") {
      addToast("Approved plan cannot be modified", "warning");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      addToast("Annual Audit Plan saved successfully!", "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.setParams({ year: year.toString() });
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = planData.some((e) =>
      e?.months?.some((m) => m?.status === "PLANNED"),
    );
    if (!hasPlanned) {
      addToast(
        "Please mark at least one month as PLANNED before submitting",
        "warning",
      );
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
        `Plan ${planStatus === "REJECTED" ? "resubmitted" : "submitted"} for approval!`,
        "success",
      );
      await fetchPlanData();
    } catch (e: any) {
      addToast(e.response?.data?.message || "Failed to submit plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ═════ CLICK-TO-EDIT: cycle status with confirm for irreversible COMPLETED ═════
  const handleStatusChange = (elementIndex: number, monthName: string) => {
    if (!canEdit) return;
    const element = planData[elementIndex];
    if (!element) return;
    const mIdx = element.months.findIndex((m) => m.month === monthName);
    if (mIdx === -1) return;

    const current = element.months[mIdx].status;

    // Require confirmation before marking COMPLETED (irreversible-ish)
    if (current === "PLANNED") {
      setPendingComplete({ elementIndex, month: monthName });
      return;
    }

    // Empty → PLANNED, or COMPLETED → "" : apply directly
    const newPlanData = [...planData];
    const nextStatus = current === "COMPLETED" ? "" : "PLANNED";
    newPlanData[elementIndex].months[mIdx].status = nextStatus;
    setPlanData(newPlanData);

    addToast(
      nextStatus === "PLANNED"
        ? `Marked ${monthName} as PLANNED`
        : `Cleared ${monthName}`,
      "info",
    );
  };

  const confirmMarkCompleted = () => {
    if (!pendingComplete) return;
    const { elementIndex, month } = pendingComplete;
    const newPlanData = [...planData];
    const mIdx = newPlanData[elementIndex].months.findIndex(
      (m) => m.month === month,
    );
    if (mIdx === -1) {
      setPendingComplete(null);
      return;
    }
    newPlanData[elementIndex].months[mIdx].status = "COMPLETED";
    setPlanData(newPlanData);
    setPendingComplete(null);
    addToast(`Marked ${month} as COMPLETED`, "success");
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast("Please provide approval comments", "warning");
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
      addToast("Plan approved successfully!", "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to approve plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error");
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
      addToast("Plan rejected", "error");
      await fetchPlanData();
    } catch {
      addToast("Failed to reject plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      addToast(`Change request submitted for ${selectedYear}`, "warning");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchPlanData();
    } catch (e: any) {
      addToast(
        e.response?.data?.message || "Failed to submit change request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan in its current status", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      let newPlanData =
        planData.length === 0
          ? auditElements.map((e) => ({
              auditElement: e.name,
              months: financialMonths.map((m) => ({ month: m, status: "" })),
            }))
          : [...planData];
      let count = 0;
      newPlanData.forEach((el) => {
        if (
          el.auditElement === "System Audit (IATF16949)" ||
          el.auditElement === "5S Audit"
        ) {
          el.months.forEach((m) => {
            if (m.status !== "PLANNED") {
              m.status = "PLANNED";
              count++;
            }
          });
        }
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      addToast(`Demo mode: ${count} audits marked as PLANNED!`, "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to mark audits as planned", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const totalPlanned = useMemo(
    () =>
      planData.reduce(
        (acc, el) =>
          acc +
          (el?.months?.filter((m) => m?.status === "PLANNED").length || 0),
        0,
      ),
    [planData],
  );
  const canEdit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED");
  const canSubmit = canEdit && totalPlanned > 0;
  const canApprove = isTopManagement && planStatus === "PENDING_APPROVAL";

  // ═════ Safety: if plan becomes editable, kill any visible tooltip ═════
  useEffect(() => {
    if (canEdit && tooltip.visible) {
      setTooltip((p) => ({ ...p, visible: false }));
    }
  }, [canEdit]);

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading plan data...
        </Text>
      </View>
    );

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
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {isDesktop ? (
                  <>
                    <Text
                      className="text-xl font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      Annual Internal Audit Plan
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Annual Audit Planning (Financial Year)
                    </Text>
                  </>
                ) : (
                  <>
                    <MarqueeText text="Annual Internal Audit Plan" />
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Annual Audit Planning (Financial Year)
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
                  <PlanStatusBadge status={planStatus} />
                </View>
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={() => {
                    fetchPlanData();
                    fetchScheduleCounts();
                  }}
                  className="rounded-lg bg-slate-100 p-2.5"
                  activeOpacity={0.7}
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                <PlanStatusBadge status={planStatus} />
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

      {/* Mobile dropdown */}
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
                  FY {selectedYear}-{selectedYear + 1}
                </Text>
                <Text className="text-[11px] text-slate-500">Change Year</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              handleViewPDF();
            }}
            disabled={exporting}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
              opacity: exporting ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <FileText size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                View PDF
              </Text>
              {exporting && (
                <Text className="text-[11px] text-slate-500">Loading...</Text>
              )}
            </View>
            {exporting && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              fetchPlanData();
              fetchScheduleCounts();
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
        </View>
      )}
      {showMobileMenu && !isDesktop && (
        <Pressable
          onPress={() => setShowMobileMenu(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
          }}
        />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 1200,
                alignSelf: "center",
                width: "100%",
                padding: 24,
              }
            : { padding: 16 }
        }
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
              footer={`Requested by: ${planInfo.rejectedBy}`}
            />
          )}
        {planStatus === "REJECTED" &&
          (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner
              type="error"
              icon={AlertCircle}
              title="Rejection Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Rejected by: ${planInfo.rejectedBy}`}
            />
          )}
        {planStatus === "APPROVED" && planInfo.approvalComments && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Approval Comments"
            message={planInfo.approvalComments}
            footer={`Approved by: ${planInfo.approvedBy}`}
          />
        )}

        {/* Demo Banner */}
        {canEdit && (
          <Card className="border-blue-200 bg-blue-50 p-5">
            <View className="flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white">
                  <Star size={20} color={COLORS.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-bold text-blue-900">
                    Quick Planning Demo
                  </Text>
                  <Text className="mt-1 flex-wrap text-sm text-blue-700">
                    Save time with automatic planning for IATF16949 & 5S audits
                  </Text>
                </View>
              </View>
              <OutlineButton
                title="Demo"
                icon={Star}
                onPress={handleDemoPlanned}
                loading={demoLoading}
              />
            </View>
          </Card>
        )}

        {/* Main Table */}
        <Card className="overflow-hidden p-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            className="max-h-[500px]"
          >
            <View style={{ minWidth: 950 }}>
              <View className="flex-row border-b border-slate-200 bg-slate-50">
                <View className="w-[60px] items-center justify-center border-r border-slate-200 p-3">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    S.NO
                  </Text>
                </View>
                <View className="w-[220px] items-center justify-center border-r border-slate-200 p-3">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    AUDIT ELEMENTS
                  </Text>
                </View>
                {financialMonths.map((month, idx) => (
                  <View
                    key={month}
                    className={`w-[72.5px] items-center justify-center p-3 ${idx === 11 ? "" : "border-r border-slate-200"}`}
                  >
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {month}
                    </Text>
                  </View>
                ))}
              </View>

              {planData.length === 0 ? (
                <View className="items-center p-10">
                  <Text className="text-sm text-slate-500">
                    No audit elements found. Click "Demo" to initialize.
                  </Text>
                </View>
              ) : (
                planData.map((element, elementIndex) => (
                  <View
                    key={elementIndex}
                    className="flex-row border-b border-slate-200 bg-white"
                  >
                    <View className="w-[60px] items-center justify-center border-r border-slate-200 p-3">
                      <Text className="text-sm text-slate-600">
                        {elementIndex + 1}
                      </Text>
                    </View>
                    <View className="w-[220px] items-center justify-center border-r border-slate-200 p-3">
                      <Text className="text-sm font-semibold text-slate-800">
                        {element.auditElement}
                      </Text>
                    </View>
                    {financialMonths.map((month, idx) => {
                      const status =
                        element.months?.find((m) => m.month === month)
                          ?.status || "";
                      const count =
                        scheduleCounts[element.auditElement]?.[month] || 0;

                      const isPlanning = canEdit;

                      // Hover/tooltip ONLY in locked (read-only) mode
                      const webProps =
                        Platform.OS === "web" && !isPlanning
                          ? {
                              // @ts-ignore
                              onMouseEnter: (e: any) => {
                                const rect =
                                  e.currentTarget?.getBoundingClientRect?.();
                                if (rect) {
                                  setTooltip({
                                    visible: true,
                                    month,
                                    status,
                                    auditElement: element.auditElement,
                                    count,
                                    anchor: {
                                      x: rect.left + rect.width / 2,
                                      y: rect.bottom,
                                    },
                                  });
                                }
                              },
                              // @ts-ignore
                              onMouseLeave: () => {
                                setTooltip((p: any) =>
                                  p.month === month &&
                                  p.auditElement === element.auditElement
                                    ? { ...p, visible: false }
                                    : p,
                                );
                              },
                            }
                          : {};

                      // Click = edit in planning mode, drill-down in locked mode
                      const onCellClick = () => {
                        if (isPlanning) {
                          handleStatusChange(elementIndex, month);
                        } else {
                          handleCellPress(element.auditElement, month);
                        }
                      };

                      // Keyboard a11y (web) — works in both modes
                      const keyboardProps =
                        Platform.OS === "web"
                          ? {
                              // @ts-ignore
                              tabIndex: 0,
                              // @ts-ignore
                              onKeyDown: (e: any) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onCellClick();
                                }
                              },
                            }
                          : {};

                      const a11yLabel = isPlanning
                        ? `${element.auditElement}, ${month}: ${
                            status || "not planned"
                          }. Activate to change status.`
                        : `${element.auditElement}, ${month}: ${
                            status || "not planned"
                          }. ${count} schedule${
                            count !== 1 ? "s" : ""
                          }. Activate to view schedules.`;

                      return (
                        <TouchableOpacity
                          key={month}
                          className={`w-[72.5px] items-center justify-center p-3 ${
                            idx === 11 ? "" : "border-r border-slate-200"
                          }`}
                          style={
                            isPlanning
                              ? {
                                  cursor:
                                    Platform.OS === "web"
                                      ? ("pointer" as any)
                                      : undefined,
                                }
                              : undefined
                          }
                          onPress={onCellClick}
                          {...webProps}
                          {...keyboardProps}
                          accessibilityRole="button"
                          accessibilityLabel={a11yLabel}
                          activeOpacity={0.7}
                        >
                          <StatusBadge status={status} count={count} />
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
        <Card className="p-5">
          <View
            className={`${isDesktop ? "flex-row" : "flex-col"} items-center justify-between gap-4`}
            style={
              isDesktop ? { flexDirection: "row" } : { flexDirection: "column" }
            }
          >
            <View className="flex-row flex-wrap items-center gap-4">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Legend:
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <Text className="text-sm text-slate-600">P - Planned</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-blue-800" />
                <Text className="text-sm text-slate-600">C - Completed</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <Text className="text-sm text-slate-600">— - Not Planned</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: COLORS.primaryDark,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: "800", color: "#FFF" }}
                  >
                    3
                  </Text>
                </View>
                <Text className="text-sm text-slate-600">
                  Schedules scheduled
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Eye size={13} color={COLORS.primary} />
                <Text className="text-xs text-slate-500">
                  {canEdit
                    ? "Click a cell to change status"
                    : "Click a cell to view schedules · Hover for details"}
                </Text>
              </View>
            </View>
            {(planData.length > 0 ||
              canEdit ||
              canSubmit ||
              canApprove ||
              (isTopManagement && planStatus === "APPROVED")) && (
              <View
                className={`${isDesktop ? "flex-row" : "flex-row"} flex-wrap ${isDesktop ? "justify-end" : "justify-center"} gap-4`}
              >
                {planData.length > 0 && (
                  <OutlineButton
                    title="View"
                    icon={Eye}
                    onPress={handleViewPDF}
                    loading={exporting}
                  />
                )}
                {canEdit && (
                  <OutlineButton
                    title="Save Draft"
                    icon={Save}
                    onPress={handleSave}
                    loading={saving}
                  />
                )}
                {canSubmit && (
                  <OutlineButton
                    title={planStatus === "REJECTED" ? "Resubmit" : "Submit"}
                    icon={Send}
                    onPress={handleSubmitForApproval}
                    loading={submitting}
                    variant="default"
                  />
                )}
                {canApprove && (
                  <>
                    <OutlineButton
                      title="Reject"
                      icon={X}
                      onPress={() => setShowRejectModal(true)}
                      variant="danger"
                    />
                    <OutlineButton
                      title="Approve"
                      icon={Check}
                      onPress={() => setShowApproveModal(true)}
                      variant="success"
                    />
                  </>
                )}
                {isTopManagement && planStatus === "APPROVED" && (
                  <OutlineButton
                    title="Request Changes"
                    icon={MessageSquare}
                    onPress={() => setShowChangeRequestModal(true)}
                  />
                )}
              </View>
            )}
          </View>
        </Card>

        {/* History */}
        {(planInfo.approvalComments ||
          rejectionReason ||
          planInfo.rejectionReason) && (
          <Card className="p-6">
            <View className="mb-4 flex-row items-center gap-2">
              <MessageSquare size={16} color={COLORS.text} />
              <Text className="text-sm font-bold text-slate-900">
                Plan History & Comments
              </Text>
            </View>
            <View className="gap-4">
              {planInfo.approvalComments && (
                <View className="border-l-2 border-blue-500 pl-4">
                  <View className="mb-1 flex-row items-center gap-2">
                    <CheckCircle size={14} color={COLORS.primary} />
                    <Text className="text-xs font-bold text-blue-800">
                      Approval Comment
                    </Text>
                  </View>
                  <Text className="mb-1 text-sm text-slate-700">
                    {planInfo.approvalComments}
                  </Text>
                  {planInfo.approvedBy && (
                    <Text className="text-xs text-slate-500">
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
                  <View className="border-l-2 border-red-500 pl-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <X size={14} color="#DC2626" />
                      <Text className="text-xs font-bold text-red-800">
                        Rejection Reason
                      </Text>
                    </View>
                    <Text className="mb-1 text-sm text-slate-700">
                      {rejectionReason || planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text className="text-xs text-slate-500">
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
                  <View className="border-l-2 border-amber-500 pl-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <MessageSquare size={14} color="#D97706" />
                      <Text className="text-xs font-bold text-amber-800">
                        Change Request Reason
                      </Text>
                    </View>
                    <Text className="mb-1 text-sm text-slate-700">
                      {planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text className="text-xs text-slate-500">
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
        <Card className="p-6">
          <View className="flex-row flex-wrap gap-6">
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prepared By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {planInfo.preparedBy}
              </Text>
            </View>
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Approved By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {planInfo.approvedBy ||
                  (planStatus === "APPROVED" ? "Pending" : "Not Approved")}
              </Text>
              {planInfo.approvedAt && (
                <Text className="mt-1 text-xs text-slate-500">
                  {new Date(planInfo.approvedAt).toLocaleDateString()}
                </Text>
              )}
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

        <PDFViewer
          visible={pdfViewer.visible}
          pdfData={pdfViewer.pdfData}
          fileName={pdfViewer.fileName}
          auditId={String(selectedYear)}
          auditNumber={`Form3-${selectedYear}`}
          pdfType="form3"
          forumGroups={[]}
          plantId={(user as any)?.plantId ?? null}
          plantName={(user as any)?.plantName ?? null}
          onClose={() =>
            setPDFViewer({ visible: false, pdfData: "", fileName: "" })
          }
          onShareComplete={(id?: string) => {
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
            addToast("✅ PDF shared to forum!", "success");
            if (id)
              router.push({
                pathname: "/",
                params: { tab: "dashboard", openForum: id, fromShare: "true" },
              });
          }}
          onNavigateToForum={(id: string) => {
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
            if (onOpenForum) setTimeout(() => onOpenForum(id), 300);
            else addToast("Please open the forum from the main menu", "info");
          }}
          currentUser={user}
          allUsers={allUsers}
        />
      </ScrollView>

      <ActionModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setTempApprovalComment("");
        }}
        title="Approve Plan"
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
        title="Reject Plan"
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor="#DC2626"
        iconBg="#FEF2F2"
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg="#DC2626"
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
        iconColor="#D97706"
        iconBg="#FFFBEB"
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg="#D97706"
        submitting={submitting}
      />

      {/* Confirm: PLANNED → COMPLETED */}
      <ConfirmModal
        isOpen={!!pendingComplete}
        onClose={() => setPendingComplete(null)}
        onConfirm={confirmMarkCompleted}
        title="Mark as Completed?"
        message={`This will mark ${
          pendingComplete?.month || ""
        } as COMPLETED. You can still clear it later, but Completed usually means the audit has been performed.`}
        confirmLabel="Mark Completed"
        confirmBg={COLORS.primary}
        icon={CheckCircle}
      />

      <ScheduleDetailsModal
        visible={detailsModal.visible}
        onClose={() =>
          setDetailsModal({
            visible: false,
            auditElement: "",
            month: "",
            loading: false,
            schedules: [],
            error: null,
          })
        }
        auditElement={detailsModal.auditElement}
        month={detailsModal.month}
        year={selectedYear}
        loading={detailsModal.loading}
        error={detailsModal.error}
        schedules={detailsModal.schedules}
      />

      {/* Tooltip only renders in locked (read-only) mode */}
      {!canEdit && (
        <MonthCellTooltip
          visible={tooltip.visible}
          month={tooltip.month}
          year={selectedYear}
          status={tooltip.status}
          auditElement={tooltip.auditElement}
          count={tooltip.count}
          anchor={tooltip.anchor}
        />
      )}

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
                    handleYearChange(year);
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
                    <CheckCircle size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
