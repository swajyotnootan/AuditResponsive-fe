// app/components/dashboards/LeadAuditorDashboard.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { FileText, RefreshCw, X } from "lucide-react-native"; // ✅ ADD
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView, // ✅ ADD
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions, // ✅ ADD
} from "react-native";
import YearFilter from "../common/YearFilter"; // Adjust path as needed
import { useAuth } from "../context/AuthContext";
import { ToastProvider, useToast } from "../context/ToastContext";
import AuditsAndResponses from "./LeadAuditor/AuditsAndResponses";
import DashboardAnalytics from "./LeadAuditor/DashboardAnalytics";
import ResponseDetailModal from "./LeadAuditor/ResponseDetailModal";
import StakeholderManagement from "./LeadAuditor/StakeholderManagement";
// Types
interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string | { displayName?: string; name?: string };
  username?: string;
  name?: string;
}

interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  coAuditorIds?: string[] | string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
  createdAt?: string;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  createdAt?: string;
  raisedDate?: string;
  dueDate?: string;
}

interface Response {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  auditeeId?: string | number;
  status?: string;
  approvalStatus?: string;
  answers?: any;
  percentageScore?: number;
  totalScore?: number;
  maxPossibleScore?: number;
  createdAt?: string;
  submittedAt?: string;
  checkSheet?: { name: string };
}

interface Stats {
  totalSchedules: number;
  completedSchedules: number;
  approved: number;
  rejected: number;
  pendingApproval: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  majorNCRs: number;
  minorNCRs: number;
  totalResponses: number;
  responsesApproved: number;
  responsesRejected: number;
  responsesSubmitted: number;
  ncrApproved: number;
  ncrInProgress: number;
  ncrOpen: number;
}

// const { width, height } = Dimensions.get("window");
// const isMobile = width < 768;
// const isTablet = width >= 768 && width < 1024;
// const isDesktop = width >= 1024;
// const isWeb = Platform.OS === "web";


const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const LeadAuditorDashboardContent: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [carouselSpeed, setCarouselSpeed] = useState(5000);
  const [responseViewMode, setResponseViewMode] = useState("grid");
  const [ncrViewMode, setNcrViewMode] = useState("grid");
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState<
    string | null
  >(null);

  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [allNCRs, setAllNCRs] = useState<NCR[]>([]);
  const [allAuditors, setAllAuditors] = useState<User[]>([]);
  const [allAuditees, setAllAuditees] = useState<User[]>([]);
  const [allResponses, setAllResponses] = useState<Response[]>([]);

  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [filteredNCRs, setFilteredNCRs] = useState<NCR[]>([]);
  const [filteredAuditors, setFilteredAuditors] = useState<User[]>([]);
  const [filteredAuditees, setFilteredAuditees] = useState<User[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);

  const [reviewingResponse, setReviewingResponse] = useState<Response | null>(
    null,
  );
  const [reviewComment, setReviewComment] = useState("");
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedResponseForDetail, setSelectedResponseForDetail] =
    useState<Response | null>(null);
  const [showResponseDetailModal, setShowResponseDetailModal] = useState(false);

  const [stats, setStats] = useState<Stats>({
    totalSchedules: 0,
    completedSchedules: 0,
    approved: 0,
    rejected: 0,
    pendingApproval: 0,
    inProgress: 0,
    scheduled: 0,
    overdue: 0,
    totalNCRs: 0,
    openNCRs: 0,
    closedNCRs: 0,
    criticalNCRs: 0,
    majorNCRs: 0,
    minorNCRs: 0,
    totalResponses: 0,
    responsesApproved: 0,
    responsesRejected: 0,
    responsesSubmitted: 0,
    ncrApproved: 0,
    ncrInProgress: 0,
    ncrOpen: 0,
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Listen for tab param from drawer clicks
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as string);
    }
  }, [params?.tab]);

  // Helper to get department string
  const getDepartmentString = (dept: any): string => {
    if (!dept) return "";
    if (typeof dept === "string") return dept;
    if (typeof dept === "object") {
      return dept.displayName || dept.name || "";
    }
    return "";
  };

  const fetchLeadAuditorDepartment = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${user?.id}`, {
        withCredentials: true,
      });
      const userData = response.data;
      let department = null;
      if (userData.department) {
        department = getDepartmentString(userData.department);
      } else if (userData.departmentName) {
        department = userData.departmentName;
      } else if (userData.departmentCode) {
        department = userData.departmentCode;
      }
      setLeadAuditorDepartment(department);
      return department;
    } catch (error) {
      if (user?.department) {
        const dept = getDepartmentString(user.department);
        setLeadAuditorDepartment(dept);
        return dept;
      }
      return null;
    }
  };

  const normalizeDepartment = (dept: any): string => {
    const deptStr = getDepartmentString(dept).toUpperCase().trim();
    if (!deptStr) return "";
    const deptMap: Record<string, string> = {
      HR: "HR",
      "R&D": "ENGG",
      ENGINEERING: "ENGG",
      "R AND D": "ENGG",
      PURCHASE: "PURCHASE",
      RMS: "STORES_DESPATCH",
      SQA: "QA",
      PPC: "PPC",
      PRODUCTION: "PRODUCTION",
      "QA/QC": "QA",
      QA: "QA",
      QC: "QA",
      FGS: "STORES_DESPATCH",
      MARKETING: "MARKETING",
      "IMS (BE)": "MR",
      "IMS(BE)": "MR",
      IMS: "MR",
      MAINTENANCE: "PLANT_MAINTENANCE",
      MANAGEMENT: "UNIT_HEAD",
      "PLANT MAINTENANCE": "PLANT_MAINTENANCE",
      "TOOL MAINTENANCE": "TOOL_MAINTENANCE",
      "TOOL MANAGEMENT": "TOOL_MAINTENANCE",
      "STORES & DESPATCH": "STORES_DESPATCH",
      STORES: "STORES_DESPATCH",
      DESPATCH: "STORES_DESPATCH",
      "UNIT HEAD": "UNIT_HEAD",
      MR: "MR",
    };
    return deptMap[deptStr] || deptStr;
  };

  const filterDataByDepartment = (
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[],
  ) => {
    if (!department) return { schedules, ncrs, auditors, auditees, responses };
    const normalizedTarget = normalizeDepartment(department);
    return {
      schedules: schedules.filter(
        (s) => normalizeDepartment(s.department) === normalizedTarget,
      ),
      ncrs: ncrs.filter(
        (n) => normalizeDepartment(n.department) === normalizedTarget,
      ),
      auditors: auditors.filter(
        (a) => normalizeDepartment(a.department) === normalizedTarget,
      ),
      auditees: auditees.filter(
        (a) => normalizeDepartment(a.department) === normalizedTarget,
      ),
      responses: responses.filter(
        (r) => normalizeDepartment(r.department) === normalizedTarget,
      ),
    };
  };

  const updateFilteredData = (
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[],
  ) => {
    const filtered = filterDataByDepartment(
      department,
      schedules,
      ncrs,
      auditors,
      auditees,
      responses,
    );
    setFilteredSchedules(filtered.schedules);
    setFilteredNCRs(filtered.ncrs);
    setFilteredAuditors(filtered.auditors);
    setFilteredAuditees(filtered.auditees);
    setFilteredResponses(filtered.responses);

    const today = new Date();
    const responsesApproved = filtered.responses.filter(
      (r) => r.status === "APPROVED",
    ).length;
    const responsesRejected = filtered.responses.filter(
      (r) => r.status === "REJECTED",
    ).length;
    const responsesSubmitted = filtered.responses.filter(
      (r) => r.status === "SUBMITTED",
    ).length;
    const overdue = filtered.schedules.filter((s) => {
      if (!s.scheduledDate) return false;
      return (
        new Date(s.scheduledDate) < today &&
        s.status !== "COMPLETED" &&
        s.status !== "REJECTED" &&
        s.status !== "APPROVED"
      );
    }).length;

    setStats({
      totalSchedules: filtered.schedules.length,
      completedSchedules: filtered.schedules.filter(
        (s) => s.status === "COMPLETED",
      ).length,
      approved: filtered.schedules.filter(
        (s) =>
          s.status === "APPROVED" || s.detailedApprovalStatus === "APPROVED",
      ).length,
      rejected: filtered.schedules.filter((s) => s.status === "REJECTED")
        .length,
      pendingApproval: filtered.schedules.filter(
        (s) =>
          s.status === "COMPLETED" && s.detailedApprovalStatus !== "APPROVED",
      ).length,
      inProgress: filtered.schedules.filter((s) => s.status === "IN_PROGRESS")
        .length,
      scheduled: filtered.schedules.filter((s) => s.status === "SCHEDULED")
        .length,
      overdue,
      totalNCRs: filtered.ncrs.length,
      openNCRs: filtered.ncrs.filter((n) => n.status !== "CLOSED").length,
      closedNCRs: filtered.ncrs.filter((n) => n.status === "CLOSED").length,
      criticalNCRs: filtered.ncrs.filter((n) => n.severity === "CRITICAL")
        .length,
      majorNCRs: filtered.ncrs.filter((n) => n.severity === "MAJOR").length,
      minorNCRs: filtered.ncrs.filter((n) => n.severity === "MINOR").length,
      totalResponses: filtered.responses.length,
      responsesApproved,
      responsesRejected,
      responsesSubmitted,
      ncrApproved: filtered.ncrs.filter((n) => n.status === "APPROVED").length,
      ncrInProgress: filtered.ncrs.filter((n) => n.status === "IN_PROGRESS")
        .length,
      ncrOpen: filtered.ncrs.filter((n) => n.status === "OPEN").length,
    });
  };

  const fetchAllData = async (year: number = selectedYear) => {
    try {
      setLoading(true);
      const department = await fetchLeadAuditorDepartment();
      const [schedulesRes, ncrRes, auditorsRes, auditeesRes, responsesRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/audit-schedule/year/${year}`, {
            withCredentials: true,
          }),
          axios
            .get(`${API_BASE_URL}/api/ncr/all`, { withCredentials: true })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditors`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditees`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/templates/responses/all`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
        ]);

      let schedules = schedulesRes.data || [];
      let ncrs = ncrRes.data || [];
      const auditors = auditorsRes.data || [];
      const auditees = auditeesRes.data || [];
      let responses = responsesRes.data || [];

      ncrs = ncrs.filter((ncr: NCR) => {
        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        if (ncrDate) return new Date(ncrDate).getFullYear() === year;
        return false;
      });

      responses = responses.filter((response: Response) => {
        const responseYear = response.createdAt
          ? new Date(response.createdAt).getFullYear()
          : null;
        return responseYear === year;
      });

      setAllSchedules(schedules);
      setAllNCRs(ncrs);
      setAllAuditors(auditors);
      setAllAuditees(auditees);
      setAllResponses(responses);
      updateFilteredData(
        department,
        schedules,
        ncrs,
        auditors,
        auditees,
        responses,
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      addToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData(selectedYear);
  };

  const handleViewResponse = (response: Response) => {
    console.log("View Response:", response.id);
  };

  const handleViewNCR = (ncr: NCR) => {
    console.log("View NCR:", ncr.id);
  };

  const handleReviewResponseClick = (response: Response) => {
    setReviewingResponse(response);
    setReviewApproved(true);
    setReviewComment("");
  };

  const handleViewResponseDetail = (response: Response) => {
    setSelectedResponseForDetail(response);
    setShowResponseDetailModal(true);
  };

  const handleReviewResponse = async () => {
    if (!reviewingResponse) return;
    if (!reviewApproved && !reviewComment.trim()) {
      addToast("Please provide a reason for rejection", "error");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = reviewApproved
        ? "lead-auditor/approve"
        : "lead-auditor/reject";
      await axios.put(
        `${API_BASE_URL}/api/templates/responses/${reviewingResponse.id}/${endpoint}`,
        { comment: reviewComment, signature: "Lead Auditor" },
        { withCredentials: true },
      );
      addToast(
        `Response ${reviewApproved ? "approved" : "rejected"} successfully!`,
        reviewApproved ? "success" : "error",
      );
      setReviewingResponse(null);
      setReviewComment("");
      fetchAllData();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to submit review",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Effects
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  useEffect(() => {
    fetchAllData(selectedYear);
  }, [selectedYear]);

  const getResponseStatusBadge = (status?: string) => {
    const badges: Record<string, any> = {
      APPROVED: { bg: "#D1FAE5", text: "#059669" },
      REJECTED: { bg: "#FEE2E2", text: "#DC2626" },
      SUBMITTED: { bg: "#DBEAFE", text: "#2563EB" },
      DRAFT: { bg: "#F3F4F6", text: "#6B7280" },
    };
    return badges[status || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  };

  const departmentDisplayName = leadAuditorDepartment || "All Departments";

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-50">
        <ActivityIndicator size="large" color="#00529B" className="mb-4" />
        <Text className="text-sm font-medium text-slate-500">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <DashboardAnalytics
            stats={stats}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            carouselSpeed={carouselSpeed}
            setCarouselSpeed={setCarouselSpeed}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      case "audits":
      case "responses":
      case "ncrs":
        return (
          <AuditsAndResponses
            activeTab={activeTab}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            allAuditors={filteredAuditors}
            stats={stats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            responseViewMode={responseViewMode}
            setResponseViewMode={setResponseViewMode}
            ncrViewMode={ncrViewMode}
            setNcrViewMode={setNcrViewMode}
            onViewResponse={handleViewResponse}
            onReviewResponse={handleReviewResponseClick}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      case "auditors":
      case "auditees":
        return (
          <StakeholderManagement
            activeTab={activeTab}
            allAuditors={filteredAuditors}
            allAuditees={filteredAuditees}
            allSchedules={filteredSchedules}
            allResponses={filteredResponses}
            allNCRs={filteredNCRs}
            onViewResponse={handleViewResponse}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      default:
        return (
          <View className="items-center justify-center p-10 mt-4 bg-white border rounded-2xl border-slate-200">
            <Text className="text-base text-center text-slate-500">
              Select a section from the navigation
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50">
      {/* ✅ FULL-WIDTH HEADER (Moved outside ScrollView to span edge-to-edge) */}
      <View className="w-full px-4 py-5 bg-white border-b shadow-sm border-slate-200 md:px-8">
        {/* Inner wrapper to keep the text aligned with the 1400px content below */}
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View className="flex-row flex-wrap items-center justify-between gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text className="text-xl font-bold md:text-2xl text-slate-800">
                Lead Auditor Dashboard
              </Text>
              <Text className="mt-1 text-xs md:text-sm text-slate-500">
                Welcome back,{" "}
                <Text className="font-semibold text-slate-700">
                  {user?.name || user?.username || "User"}
                </Text>
                <Text className="text-slate-300"> | </Text>
                <Text className="font-medium text-blue-600">
                  Dept: {departmentDisplayName}
                </Text>
              </Text>
            </View>

            <View className="flex-row flex-wrap items-center gap-3">
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                availableYears={availableYears}
              />

              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                className={`flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl ${refreshing ? "opacity-60" : ""}`}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#00529B" />
                ) : (
                  <RefreshCw size={16} color="#475569" />
                )}
                {!isMobile && (
                  <Text className="text-sm font-semibold text-slate-700">
                    Refresh
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ✅ SCROLLABLE CONTENT AREA */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
          paddingHorizontal: isMobile ? 12 : 24,
          maxWidth: 1400,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* Content Wrapper */}
        <View className="w-full mt-6">{renderContent()}</View>
      </ScrollView>

      {/* Response Detail Modal */}
      {showResponseDetailModal && selectedResponseForDetail && (
        <ResponseDetailModal
          response={selectedResponseForDetail}
          visible={showResponseDetailModal}
          onClose={() => {
            setShowResponseDetailModal(false);
            setSelectedResponseForDetail(null);
          }}
        />
      )}

      {/* Review Response Modal */}
      {/* ✅ MODERN REVIEW MODAL */}
      {reviewingResponse && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReviewingResponse(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="items-center justify-center flex-1 bg-slate-900/60"
          >
            <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <View className="flex-row items-center gap-3">
                  <View className="p-2 rounded-lg bg-blue-50">
                    <FileText size={20} color="#00529B" />
                  </View>
                  <Text className="text-lg font-bold text-slate-800">
                    Review Response
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReviewingResponse(null)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Info Card */}
              <View className="p-4 mb-5 border bg-slate-50 rounded-xl border-slate-100">
                <Text className="text-sm font-bold text-slate-800">
                  {reviewingResponse.department}
                </Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-xs text-slate-600">
                    Score:{" "}
                    <Text className="font-bold text-blue-600">
                      {reviewingResponse.totalScore}/
                      {reviewingResponse.maxPossibleScore}
                    </Text>
                  </Text>
                  <Text className="text-xs text-slate-600">
                    Auditee:{" "}
                    <Text className="font-bold text-blue-600">
                      {reviewingResponse.auditeeName}
                    </Text>
                  </Text>
                </View>
                <View className="mt-3">
                  <View
                    className={`self-start px-3 py-1 rounded-lg ${
                      reviewingResponse.status === "APPROVED"
                        ? "bg-emerald-50"
                        : reviewingResponse.status === "REJECTED"
                          ? "bg-rose-50"
                          : reviewingResponse.status === "SUBMITTED"
                            ? "bg-blue-50"
                            : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        reviewingResponse.status === "APPROVED"
                          ? "text-emerald-700"
                          : reviewingResponse.status === "REJECTED"
                            ? "text-rose-700"
                            : reviewingResponse.status === "SUBMITTED"
                              ? "text-blue-700"
                              : "text-slate-600"
                      }`}
                    >
                      {reviewingResponse.status || "DRAFT"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Approve / Reject Radio Buttons */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  className={`flex-row items-center gap-3 flex-1 p-4 rounded-xl border transition-all ${
                    reviewApproved
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-slate-200"
                  }`}
                  onPress={() => setReviewApproved(true)}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      reviewApproved ? "border-emerald-600" : "border-slate-300"
                    }`}
                  >
                    {reviewApproved && (
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      reviewApproved ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center gap-3 flex-1 p-4 rounded-xl border transition-all ${
                    !reviewApproved
                      ? "bg-rose-50 border-rose-300"
                      : "bg-white border-slate-200"
                  }`}
                  onPress={() => setReviewApproved(false)}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      !reviewApproved ? "border-rose-600" : "border-slate-300"
                    }`}
                  >
                    {!reviewApproved && (
                      <View className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      !reviewApproved ? "text-rose-700" : "text-slate-600"
                    }`}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comment Input */}
              <TextInput
                className="w-full p-3 mb-6 text-sm bg-white border border-slate-200 rounded-xl"
                style={{ minHeight: 80, textAlignVertical: "top" }}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={
                  reviewApproved
                    ? "Add approval comments (optional)..."
                    : "Please provide reason for rejection..."
                }
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Footer Buttons */}
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => setReviewingResponse(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <Text className="text-sm font-semibold text-slate-700">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReviewResponse}
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl shadow-md ${
                    submitting
                      ? "bg-slate-400"
                      : reviewApproved
                        ? "bg-emerald-600"
                        : "bg-rose-600"
                  }`}
                >
                  <Text className="text-sm font-semibold text-white">
                    {submitting
                      ? "Processing..."
                      : reviewApproved
                        ? "Approve"
                        : "Reject"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default function LeadAuditorDashboard() {
  return (
    <ToastProvider>
      <LeadAuditorDashboardContent />
    </ToastProvider>
  );
}
