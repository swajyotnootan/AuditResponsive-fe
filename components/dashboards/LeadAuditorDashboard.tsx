// app/components/dashboards/LeadAuditorDashboard.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { FileText, RefreshCw, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import YearFilter from "../common/YearFilter";
import { useAuth } from "../context/AuthContext";
import { ToastProvider, useToast } from "../context/ToastContext";
import AuditsAndResponses from "./LeadAuditor/AuditsAndResponses";
import DashboardAnalytics from "./LeadAuditor/DashboardAnalytics";
import ResponseDetailModal from "./LeadAuditor/ResponseDetailModal";
import StakeholderManagement from "./LeadAuditor/StakeholderManagement";

// Types (keep same)
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
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  
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
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState<string | null>(null);

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

  const [reviewingResponse, setReviewingResponse] = useState<Response | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedResponseForDetail, setSelectedResponseForDetail] = useState<Response | null>(null);
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

  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
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
        new Date(s.scheduledDate as string) < today &&
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
      rejected: filtered.schedules.filter((s) => s.status === "REJECTED").length,
      pendingApproval: filtered.schedules.filter(
        (s) =>
          s.status === "COMPLETED" && s.detailedApprovalStatus !== "APPROVED",
      ).length,
      inProgress: filtered.schedules.filter((s) => s.status === "IN_PROGRESS").length,
      scheduled: filtered.schedules.filter((s) => s.status === "SCHEDULED").length,
      overdue,
      totalNCRs: filtered.ncrs.length,
      openNCRs: filtered.ncrs.filter((n) => n.status !== "CLOSED").length,
      closedNCRs: filtered.ncrs.filter((n) => n.status === "CLOSED").length,
      criticalNCRs: filtered.ncrs.filter((n) => n.severity === "CRITICAL").length,
      majorNCRs: filtered.ncrs.filter((n) => n.severity === "MAJOR").length,
      minorNCRs: filtered.ncrs.filter((n) => n.severity === "MINOR").length,
      totalResponses: filtered.responses.length,
      responsesApproved,
      responsesRejected,
      responsesSubmitted,
      ncrApproved: filtered.ncrs.filter((n) => n.status === "APPROVED").length,
      ncrInProgress: filtered.ncrs.filter((n) => n.status === "IN_PROGRESS").length,
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
        if (ncrDate) return new Date(ncrDate as string).getFullYear() === year;
        return false;
      });

      responses = responses.filter((response: Response) => {
        const responseYear = response.createdAt
          ? new Date(response.createdAt as string).getFullYear()
          : null;
        return responseYear === year;
      });

      setAllSchedules(schedules);
      setAllNCRs(ncrs);
      setAllAuditors(auditors);
      setAllAuditees(auditees);
      setAllResponses(responses);
      updateFilteredData(department, schedules, ncrs, auditors, auditees, responses);
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
      const endpoint = reviewApproved ? "lead-auditor/approve" : "lead-auditor/reject";
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

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  useEffect(() => {
    fetchAllData(selectedYear);
  }, [selectedYear]);

  const departmentDisplayName = leadAuditorDepartment || "All Departments";

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color={NAVBAR_COLORS.primary} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#64748B" }}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

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
          <View style={{ justifyContent: "center", alignItems: "center", padding: 40, marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
            <Text style={{ fontSize: 16, textAlign: "center", color: "#64748B" }}>
              Select a section from the navigation
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* ✅ RESPONSIVE HEADER */}
      <View style={{
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        paddingHorizontal: isMobile ? 16 : 24,
        paddingVertical: isMobile ? 12 : 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}>
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View style={{
            flexDirection: isMobile ? "column" : "row",
            flexWrap: "wrap",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 16,
          }}>
            {/* Title Section */}
            <View style={{ flex: 1, minWidth: isMobile ? "100%" : 200 }}>
              <Text style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: "bold",
                color: "#1E293B",
              }}>
                Lead Auditor Dashboard
              </Text>
              <Text style={{
                fontSize: isMobile ? 11 : 13,
                color: "#64748B",
                marginTop: 4,
                flexWrap: "wrap",
              }}>
                Welcome back,{" "}
                <Text style={{ fontWeight: "600", color: "#334155" }}>
                  {user?.name || user?.username || "User"}
                </Text>
                {" | "}
                <Text style={{ fontWeight: "500", color: NAVBAR_COLORS.primary }}>
                  Dept: {departmentDisplayName}
                </Text>
              </Text>
            </View>

            {/* Controls Section */}
            {/* ✅ FIXED: Year Filter & Refresh - Side by side, Refresh with text */}
<View style={{
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
}}>
  <YearFilter
    selectedYear={selectedYear}
    onYearChange={setSelectedYear}
    availableYears={availableYears}
  />
  
  <TouchableOpacity
    onPress={handleRefresh}
    disabled={refreshing}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: NAVBAR_COLORS.primary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: NAVBAR_COLORS.primary,
      opacity: refreshing ? 0.6 : 1,
      minWidth: 100,
    }}
  >
    {refreshing ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <RefreshCw size={16} color="#FFFFFF" />
    )}
    <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
      Refresh
    </Text>
  </TouchableOpacity>
</View>
          </View>
        </View>
      </View>

      {/* ✅ RESPONSIVE SCROLLABLE CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
          paddingHorizontal: isMobile ? 12 : isTablet ? 16 : 24,
          maxWidth: 1400,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ width: "100%", marginTop: isMobile ? 12 : 20 }}>
          {renderContent()}
        </View>
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

      {/* ✅ RESPONSIVE REVIEW MODAL */}
      {reviewingResponse && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReviewingResponse(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              paddingHorizontal: isMobile ? 16 : 24,
            }}
          >
            <View style={{
              width: isMobile ? "100%" : "100%",
              maxWidth: isMobile ? 400 : 480,
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: isMobile ? 16 : 24,
              borderWidth: 1,
              borderColor: "#F1F5F9",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 10,
            }}>
              {/* Header */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 16,
                marginBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ padding: 10, borderRadius: 10, backgroundColor: NAVBAR_COLORS.bg }}>
                    <FileText size={20} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#1E293B" }}>
                    Review Response
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setReviewingResponse(null)}
                  style={{ padding: 4 }}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Info Card */}
              <View style={{
                padding: 16,
                marginBottom: 20,
                backgroundColor: "#F8FAFC",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#F1F5F9",
              }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1E293B" }}>
                  {reviewingResponse.department}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Score:{" "}
                    <Text style={{ fontWeight: "bold", color: NAVBAR_COLORS.primary }}>
                      {reviewingResponse.totalScore}/{reviewingResponse.maxPossibleScore}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Auditee:{" "}
                    <Text style={{ fontWeight: "bold", color: NAVBAR_COLORS.primary }}>
                      {reviewingResponse.auditeeName}
                    </Text>
                  </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <View style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: 
                      reviewingResponse.status === "APPROVED" ? "#D1FAE5" :
                      reviewingResponse.status === "REJECTED" ? "#FEE2E2" :
                      reviewingResponse.status === "SUBMITTED" ? "#DBEAFE" : "#F3F4F6",
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color:
                        reviewingResponse.status === "APPROVED" ? "#059669" :
                        reviewingResponse.status === "REJECTED" ? "#DC2626" :
                        reviewingResponse.status === "SUBMITTED" ? "#2563EB" : "#6B7280",
                    }}>
                      {reviewingResponse.status || "DRAFT"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Approve / Reject Buttons */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: isMobile ? 12 : 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: reviewApproved ? "#10B981" : "#E2E8F0",
                    backgroundColor: reviewApproved ? "#ECFDF5" : "#FFFFFF",
                  }}
                  onPress={() => setReviewApproved(true)}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: reviewApproved ? "#10B981" : "#CBD5E1",
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                    {reviewApproved && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981" }} />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: reviewApproved ? "#059669" : "#64748B" }}>
                    Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: isMobile ? 12 : 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: !reviewApproved ? "#EF4444" : "#E2E8F0",
                    backgroundColor: !reviewApproved ? "#FEF2F2" : "#FFFFFF",
                  }}
                  onPress={() => setReviewApproved(false)}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: !reviewApproved ? "#EF4444" : "#CBD5E1",
                    justifyContent: "center",
                    alignItems: "center",
                  }}>
                    {!reviewApproved && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" }} />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: !reviewApproved ? "#DC2626" : "#64748B" }}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comment Input */}
              <TextInput
                style={{
                  width: "100%",
                  minHeight: isMobile ? 80 : 100,
                  padding: 12,
                  marginBottom: 20,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 12,
                  fontSize: 13,
                  textAlignVertical: "top",
                  color: "#1E293B",
                }}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={reviewApproved ? "Add approval comments (optional)..." : "Please provide reason for rejection..."}
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Footer Buttons */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setReviewingResponse(null)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#334155" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReviewResponse}
                  disabled={submitting}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: submitting ? "#94A3B8" : reviewApproved ? "#10B981" : "#EF4444",
                    shadowColor: submitting ? "transparent" : reviewApproved ? "#10B981" : "#EF4444",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                    {submitting ? "Processing..." : reviewApproved ? "Approve" : "Reject"}
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