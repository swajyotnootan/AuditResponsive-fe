import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Archive,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  List,
  RefreshCw,
  Send,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";

import Form3View from "./auditManager/Form3View";
import Form4View from "./auditManager/Form4View";
import Form5View from "./auditManager/Form5View";
import DeptPlanDetailsModal from "./topManagement/DeptPlanDetailsModal";
import PlanDetailsModal from "./topManagement/PlanDetailsModal";
import RejectModal from "./topManagement/RejectModal";

import {
  COLORS,
  DailyScheduleCard,
  KpiCard,
  NativeGroupedBarChart,
  NativePieChart,
  PlanSectionCard,
} from "./topManagement/TopManagementHelpers";

import {
  ChangeRequestModal,
  DetailedScheduleModal,
  Form5DetailsModal,
  ScheduleApproveModal,
} from "./topManagement/TopManagementModals";
import { useDashboardData } from "./topManagement/useDashboardData";

export default function TopManagementDashboard() {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width >= 768;
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION & TABS
  // ═══════════════════════════════════════════════════════════════════════
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);

      const tabMap: Record<string, string> = {
        overview: "overview",
        annual: "annual",
        dept: "dept",
        week: "week",
        daily: "daily",
      };

      setActiveSection(tabMap[tabValue] || "overview");
    } else {
      setActiveSection("overview");
    }
  }, [params?.tab]);

  // ═══════════════════════════════════════════════════════════════════════
  // PLANT FILTER
  // ═══════════════════════════════════════════════════════════════════════
  const [selectedPlant, setSelectedPlant] = useState<string | number | null>(
    () => (user as any)?.plantId ?? null,
  );

  // ═══════════════════════════════════════════════════════════════════════
  // DATA
  // ═══════════════════════════════════════════════════════════════════════
  const {
    loading,
    refreshing,
    allUsersList,
    availablePlants,
    pendingPlans,
    approvedPlans,
    pendingDeptPlans,
    approvedDeptPlans,
    pendingForm5Plans,
    approvedForm5Plans,
    allDetailedSchedules,
    pendingDetailedPlans,
    approvedDetailedPlans,
    stats,
    monthlyAuditData,
    approvalStatusData,
    auditTypeDistribution,
    completionTrendData,
    refresh,
    fetchDashboardData,
    fetchDetailedPlans,
    refetchAnnualPlans,
    refetchDeptPlans,
    refetchWeekSchedules,
    refetchDailySchedules,
  } = useDashboardData(user, selectedPlant, activeSection);

  // ═══════════════════════════════════════════════════════════════════════
  // UI-ONLY STATE
  // ═══════════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState("pending");

  // Annual — modal state
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [planApprovalComment, setPlanApprovalComment] = useState("");
  const [planRejectionReason, setPlanRejectionReason] = useState("");
  const [showPlanRejectModal, setShowPlanRejectModal] = useState(false);

  // Dept — modal state
  const [selectedDeptPlan, setSelectedDeptPlan] = useState<any>(null);
  const [showDeptPlanDetails, setShowDeptPlanDetails] = useState(false);
  const [deptApprovalComment, setDeptApprovalComment] = useState("");
  const [deptRejectionReason, setDeptRejectionReason] = useState("");
  const [showDeptRejectModal, setShowDeptRejectModal] = useState(false);

  // Form5 — modal state
  const [selectedForm5Plan, setSelectedForm5Plan] = useState<any>(null);
  const [showForm5Details, setShowForm5Details] = useState(false);
  const [form5RejectionReason, setForm5RejectionReason] = useState("");
  const [showForm5RejectModal, setShowForm5RejectModal] = useState(false);
  const [form5SchedulesDetail, setForm5SchedulesDetail] = useState<any[]>([]);
  const [form5ApprovalComment, setForm5ApprovalComment] = useState("");

  // Detailed — modal state
  const [selectedDetailedPlan, setSelectedDetailedPlan] = useState<any>(null);
  const [showDetailedDetails, setShowDetailedDetails] = useState(false);
  const [detailedRejectionReason, setDetailedRejectionReason] = useState("");
  const [showDetailedRejectModal, setShowDetailedRejectModal] = useState(false);
  const [detailedSchedulesList, setDetailedSchedulesList] = useState<any[]>([]);
  const [detailedAuditTypeFilter, setDetailedAuditTypeFilter] = useState("");
  const [detailedApprovalComment, setDetailedApprovalComment] = useState("");

  // Search + pagination
  const [annualPendingSearchQuery, setAnnualPendingSearchQuery] = useState("");
  const [annualPendingCurrentPage, setAnnualPendingCurrentPage] = useState(1);
  const [annualApprovedSearchQuery, setAnnualApprovedSearchQuery] =
    useState("");
  const [annualApprovedCurrentPage, setAnnualApprovedCurrentPage] = useState(1);
  const [deptPendingSearchQuery, setDeptPendingSearchQuery] = useState("");
  const [deptPendingCurrentPage, setDeptPendingCurrentPage] = useState(1);
  const [deptApprovedSearchQuery, setDeptApprovedSearchQuery] = useState("");
  const [deptApprovedCurrentPage, setDeptApprovedCurrentPage] = useState(1);
  const [weekPendingSearchQuery, setWeekPendingSearchQuery] = useState("");
  const [weekPendingCurrentPage, setWeekPendingCurrentPage] = useState(1);
  const [weekApprovedSearchQuery, setWeekApprovedSearchQuery] = useState("");
  const [weekApprovedCurrentPage, setWeekApprovedCurrentPage] = useState(1);
  const [dailyPendingSearchQuery, setDailyPendingSearchQuery] = useState("");
  const [dailyPendingCurrentPage, setDailyPendingCurrentPage] = useState(1);
  const [dailyHistorySearchQuery, setDailyHistorySearchQuery] = useState("");
  const [dailyHistoryCurrentPage, setDailyHistoryCurrentPage] = useState(1);

  // Modal action state
  const [submitting, setSubmitting] = useState(false);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
  const [selectedScheduleForAction, setSelectedScheduleForAction] =
    useState<any>(null);
  const [showScheduleRejectModal, setShowScheduleRejectModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [allMonthlyPlans, setAllMonthlyPlans] = useState<any[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [showScheduleApproveModal, setShowScheduleApproveModal] =
    useState(false);
  const [scheduleApprovalComment, setScheduleApprovalComment] = useState("");

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setPlanApprovalComment("");
    setPlanRejectionReason("");
    setShowPlanDetails(true);
  };

  const handleApprovePlan = async () => {
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-plan/${selectedPlan.year}/approve?userId=${user.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comments: planApprovalComment }),
        },
      );
      if (response.ok) {
        toast.success(
          `Annual Audit Plan ${selectedPlan.year} approved successfully!`,
        );
        setShowPlanDetails(false);
        setSelectedPlan(null);
        setPlanApprovalComment("");
        await fetchDashboardData();
        await refetchAnnualPlans();
      } else {
        throw new Error("Failed to approve plan");
      }
    } catch (error) {
      toast.error("Failed to approve plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!planRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-plan/${selectedPlan.year}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: planRejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Annual Audit Plan ${selectedPlan.year} rejected`);
        setShowPlanRejectModal(false);
        setShowPlanDetails(false);
        setSelectedPlan(null);
        setPlanRejectionReason("");
        await fetchDashboardData();
        await refetchAnnualPlans();
      } else {
        throw new Error("Failed to reject plan");
      }
    } catch (error) {
      toast.error("Failed to reject plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDeptPlan = (plan: any) => {
    setSelectedDeptPlan(plan);
    setDeptRejectionReason("");
    setShowDeptPlanDetails(true);
  };

  const handleApproveDeptPlan = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/department-plan/${selectedDeptPlan.year}/approve?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comments: "" }),
        },
      );
      if (response.ok) {
        toast.success(
          `Department Audit Plan ${selectedDeptPlan.year} approved successfully!`,
        );
        setShowDeptPlanDetails(false);
        setSelectedDeptPlan(null);
        await fetchDashboardData();
        await refetchDeptPlans();
      } else {
        throw new Error("Failed to approve department plan");
      }
    } catch (error) {
      toast.error("Failed to approve department plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectDeptPlan = async () => {
    if (!deptRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/department-plan/${selectedDeptPlan.year}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: deptRejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Department Audit Plan ${selectedDeptPlan.year} rejected`);
        setShowDeptRejectModal(false);
        setShowDeptPlanDetails(false);
        setSelectedDeptPlan(null);
        setDeptRejectionReason("");
        await fetchDashboardData();
        await refetchDeptPlans();
      } else {
        throw new Error("Failed to reject department plan");
      }
    } catch (error) {
      toast.error("Failed to reject department plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewForm5Plan = (plan: any) => {
    setSelectedForm5Plan(plan);
    setForm5SchedulesDetail(plan.schedules || []);
    setForm5RejectionReason("");
    setForm5ApprovalComment("");
    setShowForm5Details(true);
  };

  const handleApproveForm5Plan = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/approve?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comments: form5ApprovalComment }),
        },
      );
      if (response.ok) {
        toast.success(
          `Week Schedule for ${selectedForm5Plan.month} approved successfully!`,
        );
        setShowForm5Details(false);
        setSelectedForm5Plan(null);
        setForm5ApprovalComment("");
        await fetchDashboardData();
        await refetchWeekSchedules();
      } else {
        throw new Error("Failed to approve week schedule");
      }
    } catch (error) {
      toast.error("Failed to approve week schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectForm5Plan = async () => {
    if (!form5RejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: form5RejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Week Schedule for ${selectedForm5Plan.month} rejected`);
        setShowForm5RejectModal(false);
        setShowForm5Details(false);
        setSelectedForm5Plan(null);
        setForm5RejectionReason("");
        await fetchDashboardData();
        await refetchWeekSchedules();
      } else {
        throw new Error("Failed to reject week schedule");
      }
    } catch (error) {
      toast.error("Failed to reject week schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetailedPlan = (plan: any, tab: string = "pending") => {
    setSelectedDetailedPlan(plan);
    setDetailedSchedulesList(plan.schedules || []);
    const allMonths = [...pendingDetailedPlans, ...approvedDetailedPlans];
    setAllMonthlyPlans(allMonths);
    setCurrentMonthIndex(
      allMonths.findIndex(
        (m) => m.year === plan.year && m.month === plan.month,
      ) || 0,
    );

    const hasPendingSchedules = plan.schedules?.some(
      (s: any) =>
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA",
    );
    setActiveTab(hasPendingSchedules ? "pending" : tab);

    setDetailedRejectionReason("");
    setDetailedAuditTypeFilter("");
    setDetailedApprovalComment("");
    setShowDetailedDetails(true);
  };

  const handleApproveSingleSchedule = (schedule: any) => {
    setSelectedScheduleForAction(schedule);
    setScheduleApprovalComment("");
    setShowScheduleApproveModal(true);
  };

  const handleConfirmApproveSingleSchedule = async () => {
    if (!selectedScheduleForAction) return;
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.approveSchedule(
        selectedScheduleForAction.id,
        user.id,
        scheduleApprovalComment,
      );
      toast.success("Schedule approved!");

      setDetailedSchedulesList((prevList) =>
        prevList.map((s) =>
          s.id === selectedScheduleForAction.id
            ? {
                ...s,
                detailedApprovalStatus: "APPROVED",
                approvedByName: user?.name,
                approvedBy: user?.id ?? user?.name,
                approvedAt: new Date().toISOString(),
                detailedRejectionReason: null,
              }
            : s,
        ),
      );

      setShowScheduleApproveModal(false);
      setScheduleApprovalComment("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to approve schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSingleSchedule = async () => {
    if (!detailedRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSchedule(
        selectedScheduleForAction.id,
        user.id,
        detailedRejectionReason,
      );
      toast.success("Schedule rejected");

      setDetailedSchedulesList((prevList) =>
        prevList.map((s) =>
          s.id === selectedScheduleForAction.id
            ? {
                ...s,
                detailedApprovalStatus: "REJECTED",
                detailedRejectionReason: detailedRejectionReason,
                rejectedByName: user?.name,
                approvedByName: user?.name,
                approvedBy: user?.id,
              }
            : s,
        ),
      );

      setShowScheduleRejectModal(false);
      setDetailedRejectionReason("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to reject schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChangesForSchedule = async () => {
    if (!selectedScheduleForAction) return;
    if (!changeRequestReason.trim()) {
      toast.error("Please provide a reason for change request");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.requestChanges(
        selectedScheduleForAction.id,
        user.id,
        changeRequestReason,
      );
      toast.success("Change request submitted");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to request changes");
    } finally {
      setSubmitting(false);
    }
  };

  const doesScheduleMatchFilter = useCallback(
    (schedule: any, filterValue: string) => {
      if (!filterValue || filterValue.trim() === "") return true;
      const normalizedFilter = filterValue.toLowerCase().trim();

      if (
        schedule.auditType &&
        schedule.auditType.toLowerCase().includes(normalizedFilter)
      ) {
        return true;
      }

      let elements: any[] = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === "string") {
          try {
            elements = JSON.parse(schedule.auditElements);
          } catch (e) {}
        } else if (Array.isArray(schedule.auditElements)) {
          elements = schedule.auditElements;
        }
      }

      return elements.some(
        (el: any) => el && String(el).toLowerCase().includes(normalizedFilter),
      );
    },
    [],
  );

  const handleBulkApproveByAuditType = async () => {
    const pendingSchedules = detailedSchedulesList.filter((s: any) => {
      const isPending =
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA";
      if (!isPending) return false;
      return doesScheduleMatchFilter(s, detailedAuditTypeFilter);
    });

    if (pendingSchedules.length === 0) {
      toast.warning("No pending schedules to approve");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    setSubmitting(true);
    const approvedIds = new Set(pendingSchedules.map((s: any) => s.id));
    let successCount = 0;
    const commentToUse = detailedApprovalComment || "";

    for (const schedule of pendingSchedules) {
      try {
        await auditScheduleApi.approveSchedule(
          schedule.id,
          user.id,
          commentToUse,
        );
        successCount++;
      } catch (error) {
        console.error("Failed to approve schedule", schedule.id, error);
      }
    }

    setDetailedSchedulesList((prevList: any[]) =>
      prevList.map((schedule: any) =>
        approvedIds.has(schedule.id)
          ? {
              ...schedule,
              detailedApprovalStatus: "APPROVED",
              approvedByName: user?.name,
              approvedBy: user?.name,
              approvedAt: new Date().toISOString(),
            }
          : schedule,
      ),
    );

    toast.success(`${successCount} schedule(s) approved!`);
    setDetailedApprovalComment("");

    const remainingPending = detailedSchedulesList.filter(
      (s: any) =>
        !approvedIds.has(s.id) &&
        (s.detailedApprovalStatus === "PENDING_APPROVAL" ||
          s.detailedApprovalStatus === "CHANGE_REQUESTED"),
    ).length;

    if (remainingPending === 0 && activeTab === "pending") {
      setActiveTab("history");
    }

    setTimeout(() => fetchDetailedPlans(), 1000);
    setSubmitting(false);
  };

  const handleBulkRejectByAuditType = async () => {
    if (!detailedRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    const pendingSchedules = detailedSchedulesList.filter((s: any) => {
      const isPending =
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA";
      if (!isPending) return false;
      return doesScheduleMatchFilter(s, detailedAuditTypeFilter);
    });

    if (pendingSchedules.length === 0) {
      toast.warning("No pending schedules to reject");
      return;
    }

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            `Reject ${pendingSchedules.length} pending schedule(s)?`,
          )
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Bulk Reject",
              `Reject ${pendingSchedules.length} pending schedule(s)?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Reject",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );

    if (!confirmed) return;

    setSubmitting(true);
    let rejectedCount = 0;
    const rejectedIds = new Set();
    const rejectionReason = detailedRejectionReason;

    for (const schedule of pendingSchedules) {
      try {
        await auditScheduleApi.rejectSchedule(
          schedule.id,
          user.id,
          rejectionReason,
        );
        rejectedCount++;
        rejectedIds.add(schedule.id);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Failed to reject schedule", schedule.id, error);
      }
    }

    setDetailedSchedulesList((prevList: any[]) =>
      prevList.map((schedule: any) =>
        rejectedIds.has(schedule.id)
          ? {
              ...schedule,
              detailedApprovalStatus: "REJECTED",
              detailedRejectionReason: rejectionReason,
              rejectedByName: user?.name,
              approvedByName: user?.name,
              approvedBy: user?.id,
            }
          : schedule,
      ),
    );

    toast.success(`${rejectedCount} schedule(s) rejected`);
    setShowDetailedRejectModal(false);
    setDetailedRejectionReason("");
    setTimeout(() => fetchDetailedPlans(), 1000);
    setSubmitting(false);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 font-medium text-slate-500">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  if (activeSection === "form3") {
    return (
      <Form3View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")}
      />
    );
  }
  if (activeSection === "form4") {
    return (
      <Form4View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")}
      />
    );
  }
  if (activeSection === "form5") {
    return (
      <Form5View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")}
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View className="w-full pb-2 pt-4 md:pb-4 md:pt-6">
          <View className="w-full flex-col gap-4 px-4 md:mx-auto md:max-w-7xl md:flex-row md:items-center md:justify-between md:px-8 lg:px-16">
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-800 md:text-3xl">
                {activeSection === "overview" && "Dashboard Overview"}
                {activeSection === "annual" && "Annual Audit Plans"}
                {activeSection === "dept" && "Department Audit Plans"}
                {activeSection === "week" && "Week Schedules"}
                {activeSection === "daily" && "Daily Schedules"}
              </Text>
              <Text className="mt-1 text-sm text-slate-500 md:text-base">
                Welcome back,{" "}
                <Text className="font-semibold text-slate-700">
                  {user?.name}
                </Text>
              </Text>
            </View>
            <View className="flex-row items-center gap-3 self-start md:self-auto">
              <TouchableOpacity
                onPress={refresh}
                disabled={refreshing}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm active:bg-slate-50 disabled:opacity-50"
                activeOpacity={0.7}
              >
                <RefreshCw size={18} color="#475569" />
                <Text className="text-sm font-semibold text-slate-700">
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View className="w-full px-4 pb-6 md:mx-auto md:max-w-7xl md:px-8 lg:px-16">
          {activeSection === "overview" && (
            <View className="gap-4">
              {isDesktop ? (
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <KpiCard
                      title="Total Audits Planned"
                      value={stats.totalAudits}
                      icon={<Calendar />}
                      color={{ bg: "#eff6ff", text: "#00529B" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Completed Audits"
                      value={stats.completedAudits}
                      icon={<CheckCircle />}
                      color={{ bg: "#f0fdf4", text: "#166534" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Plans Pending"
                      value={
                        stats.pendingAnnualPlans +
                        stats.pendingDeptPlans +
                        stats.pendingWeekSchedules +
                        stats.pendingDailySchedules
                      }
                      icon={<Send />}
                      color={{ bg: "#fffbeb", text: "#b45309" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Completion Rate"
                      value={`${stats.overallCompletion}%`}
                      icon={<TrendingUp />}
                      color={{ bg: "#faf5ff", text: "#7e22ce" }}
                      isDesktop={true}
                    />
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <KpiCard
                        title="Total Audits Planned"
                        value={stats.totalAudits}
                        icon={<Calendar />}
                        color={{ bg: "#eff6ff", text: "#00529B" }}
                        isDesktop={false}
                      />
                    </View>
                    <View className="flex-1">
                      <KpiCard
                        title="Completed Audits"
                        value={stats.completedAudits}
                        icon={<CheckCircle />}
                        color={{ bg: "#f0fdf4", text: "#166534" }}
                        isDesktop={false}
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <KpiCard
                        title="Plans Pending"
                        value={
                          stats.pendingAnnualPlans +
                          stats.pendingDeptPlans +
                          stats.pendingWeekSchedules +
                          stats.pendingDailySchedules
                        }
                        icon={<Send />}
                        color={{ bg: "#fffbeb", text: "#b45309" }}
                        isDesktop={false}
                      />
                    </View>
                    <View className="flex-1">
                      <KpiCard
                        title="Completion Rate"
                        value={`${stats.overallCompletion}%`}
                        icon={<TrendingUp />}
                        color={{ bg: "#faf5ff", text: "#7e22ce" }}
                        isDesktop={false}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
                <NativeGroupedBarChart
                  data={monthlyAuditData}
                  title="Monthly Audit Trend"
                  subtitle="Planned vs Completed audits over the last 12 months"
                  keys={["Planned", "Completed"]}
                  colors={[COLORS.secondary, COLORS.primary]}
                />
                <NativeGroupedBarChart
                  data={approvalStatusData}
                  title="Approval Status"
                  subtitle="Pending vs Approved by plan type"
                  keys={["Pending", "Approved"]}
                  colors={[COLORS.light, COLORS.primary]}
                />
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
                <NativePieChart
                  data={auditTypeDistribution}
                  title="Audit Type Distribution"
                  subtitle="Breakdown of audits by type"
                  total={auditTypeDistribution.reduce(
                    (sum, d) => sum + d.value,
                    0,
                  )}
                />
                <NativeGroupedBarChart
                  data={completionTrendData}
                  title="Cumulative Completion"
                  subtitle="Running total of completed audits over time"
                  keys={["CumulativeCompleted"]}
                  colors={[COLORS.primary]}
                />
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4`}>
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <Text className="mb-3 font-bold text-slate-800">
                    Approved Plans Summary
                  </Text>
                  {isDesktop ? (
                    <View className="flex-row gap-4">
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Annual
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {stats.approvedAnnualPlans}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Department
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {stats.approvedDeptPlans}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Week
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {stats.approvedWeekSchedules}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Daily
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {stats.approvedDailySchedules}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="gap-3">
                      <View className="flex-row gap-3">
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Annual
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {stats.approvedAnnualPlans}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Department
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {stats.approvedDeptPlans}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-3">
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Week
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {stats.approvedWeekSchedules}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Daily
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {stats.approvedDailySchedules}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4`}>
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="rounded-xl bg-indigo-50 p-2.5">
                      <TrendingUp size={20} color="#4f46e5" />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">
                        Management Review
                      </Text>
                      <Text className="text-xs text-slate-500">
                        High-level audit oversight
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 rounded-lg bg-slate-50 p-3">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Pending Actions
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-amber-600">
                        {stats.pendingAnnualPlans +
                          stats.pendingDeptPlans +
                          stats.pendingWeekSchedules +
                          stats.pendingDailySchedules}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-slate-50 p-3">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Completion
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-green-600">
                        {stats.overallCompletion}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Text className="mb-4 text-base font-bold text-slate-800">
                    Audit Plans
                  </Text>
                  <View
                    className={`${isDesktop ? "flex-row" : "flex-col"} gap-3`}
                  >
                    <TouchableOpacity
                      onPress={() => setActiveSection("form3")}
                      className="flex-1 items-center justify-center rounded-xl bg-blue-50 p-3 active:bg-blue-100"
                    >
                      <FileText
                        size={18}
                        color="#1d4ed8"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-blue-700">
                        Annual Plan
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveSection("form4")}
                      className="flex-1 items-center justify-center rounded-xl bg-green-50 p-3 active:bg-green-100"
                    >
                      <List
                        size={18}
                        color="#15803d"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-green-700">
                        Dept Plan
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setActiveSection("form5")}
                      className="flex-1 items-center justify-center rounded-xl bg-indigo-50 p-3 active:bg-indigo-100"
                    >
                      <Calendar
                        size={18}
                        color="#4338ca"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-indigo-700">
                        Week Schedule
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeSection === "annual" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Annual Plans"
                icon={FileText}
                color={{
                  bg: "#eff6ff",
                  border: "#bfdbfe",
                  text: "#00529B",
                  badge: { bg: "#dbeafe", text: "#1e3a8a" },
                }}
                plans={pendingPlans}
                onViewPlan={handleViewPlan}
                formType="annual"
                showAll={true}
                delay={0}
                searchQuery={annualPendingSearchQuery}
                onSearchChange={setAnnualPendingSearchQuery}
                currentPage={annualPendingCurrentPage}
                onPageChange={setAnnualPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Annual Plans"
                icon={CheckCircle}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={approvedPlans}
                onViewPlan={handleViewPlan}
                formType="annual"
                showAll={true}
                delay={100}
                searchQuery={annualApprovedSearchQuery}
                onSearchChange={setAnnualApprovedSearchQuery}
                currentPage={annualApprovedCurrentPage}
                onPageChange={setAnnualApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "dept" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Department Plans"
                icon={List}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={pendingDeptPlans}
                onViewPlan={handleViewDeptPlan}
                formType="dept"
                showAll={true}
                delay={0}
                searchQuery={deptPendingSearchQuery}
                onSearchChange={setDeptPendingSearchQuery}
                currentPage={deptPendingCurrentPage}
                onPageChange={setDeptPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Department Plans"
                icon={CheckCircle}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={approvedDeptPlans}
                onViewPlan={handleViewDeptPlan}
                formType="dept"
                showAll={true}
                delay={100}
                searchQuery={deptApprovedSearchQuery}
                onSearchChange={setDeptApprovedSearchQuery}
                currentPage={deptApprovedCurrentPage}
                onPageChange={setDeptApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "week" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Week Schedules"
                icon={Calendar}
                color={{
                  bg: "#eef2ff",
                  border: "#c7d2fe",
                  text: "#3730a3",
                  badge: { bg: "#e0e7ff", text: "#312e81" },
                }}
                plans={pendingForm5Plans}
                onViewPlan={handleViewForm5Plan}
                formType="week"
                showAll={true}
                delay={0}
                searchQuery={weekPendingSearchQuery}
                onSearchChange={setWeekPendingSearchQuery}
                currentPage={weekPendingCurrentPage}
                onPageChange={setWeekPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Week Schedules"
                icon={CheckCircle}
                color={{
                  bg: "#eef2ff",
                  border: "#c7d2fe",
                  text: "#3730a3",
                  badge: { bg: "#e0e7ff", text: "#312e81" },
                }}
                plans={approvedForm5Plans}
                onViewPlan={handleViewForm5Plan}
                formType="week"
                showAll={true}
                delay={100}
                searchQuery={weekApprovedSearchQuery}
                onSearchChange={setWeekApprovedSearchQuery}
                currentPage={weekApprovedCurrentPage}
                onPageChange={setWeekApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "daily" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <DailyScheduleCard
                title="Pending Daily Schedules"
                icon={Clock}
                color={{
                  bg: "#f0fdfa",
                  border: "#99f6e4",
                  text: "#0f766e",
                  badge: { bg: "#ccfbf1", text: "#115e59" },
                }}
                pendingPlans={pendingDetailedPlans}
                approvedPlans={[]}
                onViewPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab)
                }
                onViewHistoryPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab || "history")
                }
                showAll={true}
                delay={0}
                searchQuery={dailyPendingSearchQuery}
                onSearchChange={setDailyPendingSearchQuery}
                currentPage={dailyPendingCurrentPage}
                onPageChange={setDailyPendingCurrentPage}
              />
              <DailyScheduleCard
                title="Approved/History Daily Schedules"
                icon={Archive}
                color={{
                  bg: "#f0fdfa",
                  border: "#99f6e4",
                  text: "#0f766e",
                  badge: { bg: "#ccfbf1", text: "#115e59" },
                }}
                pendingPlans={[]}
                approvedPlans={approvedDetailedPlans}
                onViewPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab)
                }
                onViewHistoryPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab || "history")
                }
                showAll={true}
                delay={100}
                searchQuery={dailyHistorySearchQuery}
                onSearchChange={setDailyHistorySearchQuery}
                currentPage={dailyHistoryCurrentPage}
                onPageChange={setDailyHistoryCurrentPage}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ═══════════════════ REJECT MODALS ═══════════════════ */}
      <RejectModal
        isOpen={showPlanRejectModal}
        onClose={() => {
          setShowPlanRejectModal(false);
          setPlanRejectionReason("");
        }}
        onConfirm={handleRejectPlan}
        year={selectedPlan?.year}
        rejectionReason={planRejectionReason}
        setRejectionReason={setPlanRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showDeptRejectModal}
        onClose={() => {
          setShowDeptRejectModal(false);
          setDeptRejectionReason("");
        }}
        onConfirm={handleRejectDeptPlan}
        year={selectedDeptPlan?.year}
        rejectionReason={deptRejectionReason}
        setRejectionReason={setDeptRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showForm5RejectModal}
        onClose={() => {
          setShowForm5RejectModal(false);
          setForm5RejectionReason("");
        }}
        onConfirm={handleRejectForm5Plan}
        year={selectedForm5Plan?.year}
        rejectionReason={form5RejectionReason}
        setRejectionReason={setForm5RejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showScheduleRejectModal}
        onClose={() => {
          setShowScheduleRejectModal(false);
          setDetailedRejectionReason("");
          setSelectedScheduleForAction(null);
        }}
        onConfirm={handleRejectSingleSchedule}
        year={selectedScheduleForAction?.scheduledDate}
        rejectionReason={detailedRejectionReason}
        setRejectionReason={setDetailedRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showDetailedRejectModal}
        onClose={() => {
          setShowDetailedRejectModal(false);
          setDetailedRejectionReason("");
        }}
        onConfirm={handleBulkRejectByAuditType}
        year="Pending Schedules"
        rejectionReason={detailedRejectionReason}
        setRejectionReason={setDetailedRejectionReason}
        submitting={submitting}
      />

      {/* ═══════════════════ PLAN / DEPT MODALS ═══════════════════ */}
      {showPlanDetails && selectedPlan && (
        <PlanDetailsModal
          selectedPlan={selectedPlan}
          onClose={() => {
            setShowPlanDetails(false);
            setSelectedPlan(null);
            setPlanApprovalComment("");
          }}
          onApprove={handleApprovePlan}
          onReject={() => {
            setShowPlanDetails(false);
            setShowPlanRejectModal(true);
          }}
          approvalComment={planApprovalComment}
          setApprovalComment={setPlanApprovalComment}
          submitting={submitting}
        />
      )}

      {showDeptPlanDetails && selectedDeptPlan && (
        <DeptPlanDetailsModal
          selectedPlan={selectedDeptPlan}
          onClose={() => {
            setShowDeptPlanDetails(false);
            setSelectedDeptPlan(null);
            setDeptApprovalComment("");
          }}
          onApprove={handleApproveDeptPlan}
          onReject={() => {
            setShowDeptPlanDetails(false);
            setShowDeptRejectModal(true);
          }}
          approvalComment={deptApprovalComment}
          setApprovalComment={setDeptApprovalComment}
          submitting={submitting}
        />
      )}

      {/* ═══════════════════ FORUM MODAL ═══════════════════ */}
      {showForumModal && selectedAuditForForum && (
        <AuditCheckSheetNCRForumModal
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedAuditForForum(null);
          }}
          auditId={
            selectedAuditForForum.id || selectedAuditForForum.auditId || "demo"
          }
          auditNumber={selectedAuditForForum.auditNumber || "AUD-001"}
          auditTitle={
            selectedAuditForForum.auditTitle ||
            selectedAuditForForum.auditType ||
            "Audit Discussion"
          }
          auditStatus={selectedAuditForForum.auditStatus || "IN_PROGRESS"}
          auditType={selectedAuditForForum.auditType || "System Audit"}
          department={selectedAuditForForum.department || "Quality"}
          auditorId={selectedAuditForForum.auditorId || user?.id}
          auditorName={
            selectedAuditForForum.auditorName ||
            user?.name ||
            user?.email ||
            "Unknown"
          }
          auditeeId={selectedAuditForForum.auditeeId}
          auditeeName={selectedAuditForForum.auditeeName}
          hodEmail={selectedAuditForForum.hodEmail}
          hodName={selectedAuditForForum.hodName}
          memberEmails={selectedAuditForForum.memberEmails || []}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}

      {/* ═══════════════════ EXTRACTED MODALS ═══════════════════ */}
      <ScheduleApproveModal
        visible={showScheduleApproveModal}
        schedule={selectedScheduleForAction}
        comment={scheduleApprovalComment}
        setComment={setScheduleApprovalComment}
        submitting={submitting}
        onCancel={() => {
          setShowScheduleApproveModal(false);
          setScheduleApprovalComment("");
          setSelectedScheduleForAction(null);
        }}
        onConfirm={handleConfirmApproveSingleSchedule}
      />

      <ChangeRequestModal
        visible={showChangeRequestModal}
        schedule={selectedScheduleForAction}
        reason={changeRequestReason}
        setReason={setChangeRequestReason}
        submitting={submitting}
        onCancel={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
          setSelectedScheduleForAction(null);
        }}
        onConfirm={handleRequestChangesForSchedule}
      />

      <Form5DetailsModal
        visible={showForm5Details}
        plan={selectedForm5Plan}
        schedulesDetail={form5SchedulesDetail}
        isDesktop={isDesktop}
        approvalComment={form5ApprovalComment}
        setApprovalComment={setForm5ApprovalComment}
        submitting={submitting}
        onClose={() => setShowForm5Details(false)}
        onApprove={handleApproveForm5Plan}
        onReject={() => setShowForm5RejectModal(true)}
      />

      <DetailedScheduleModal
        visible={showDetailedDetails}
        plan={selectedDetailedPlan}
        schedulesList={detailedSchedulesList}
        isDesktop={isDesktop}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditTypeFilter={detailedAuditTypeFilter}
        setAuditTypeFilter={setDetailedAuditTypeFilter}
        approvalComment={detailedApprovalComment}
        setApprovalComment={setDetailedApprovalComment}
        submitting={submitting}
        allUsersList={allUsersList}
        onClose={() => setShowDetailedDetails(false)}
        onApproveSingle={handleApproveSingleSchedule}
        onRejectSingle={(schedule: any) => {
          setSelectedScheduleForAction(schedule);
          setDetailedRejectionReason("");
          setShowScheduleRejectModal(true);
        }}
        onRequestChange={(schedule: any) => {
          setSelectedScheduleForAction(schedule);
          setChangeRequestReason("");
          setShowChangeRequestModal(true);
        }}
        onBulkApprove={handleBulkApproveByAuditType}
        onBulkReject={handleBulkRejectByAuditType}
        onOpenRejectModal={() => setShowDetailedRejectModal(true)}
      />
    </View>
  );
}
