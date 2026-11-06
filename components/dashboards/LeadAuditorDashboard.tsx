// app/components/dashboards/LeadAuditorDashboard.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { Building2, FileText, RefreshCw, Users, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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
import { usePlantFilter } from "../context/PlantFilterContext";
import { ToastProvider, useToast } from "../context/ToastContext";
import AuditsAndResponses from "./LeadAuditor/AuditsAndResponses";
import DailyFeasibilityQueue from "./LeadAuditor/DailyFeasibilityQueue";
import DashboardAnalytics from "./LeadAuditor/DashboardAnalytics";
import FeasibilityConfirmationQueue from "./LeadAuditor/FeasibilityConfirmationQueue";
import ResponseDetailModal from "./LeadAuditor/ResponseDetailModal";
import StakeholderManagement from "./LeadAuditor/StakeholderManagement";
import type { NCR, Response, Schedule, Stats, User } from "./LeadAuditor/types";
import { normalizePlantId } from "./LeadAuditor/types";

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

// ────────────────────────────────────────────────────────────────
// filterDataByPlant — typed, MNC-standard scope
//   • plantId == null  → "All Plants" — nothing is plant-filtered
//   • plantId != null  → plant-filter schedules/NCRs/responses/auditees
//                        **auditors are always company-scoped**
// ────────────────────────────────────────────────────────────────
function buildSchedulePlantMap(
  schedules: Schedule[],
): Map<string, number | null> {
  const map = new Map<string, number | null>();
  schedules.forEach((s) => {
    if (s.id != null) {
      map.set(String(s.id), normalizePlantId(s.plantId));
    }
  });
  return map;
}

function filterDataByPlant(
  plantId: number | null,
  companyId: number | null,
  schedules: Schedule[],
  ncrs: NCR[],
  auditors: User[],
  auditees: User[],
  responses: Response[],
): {
  schedules: Schedule[];
  ncrs: NCR[];
  auditors: User[];
  auditees: User[];
  responses: Response[];
} {
  // ── Step 1: drop records provably belonging to another company ──
  //    (defense in depth — the backend is authoritative)
  const sameCompany = <T extends { companyId?: any }>(item: T) => {
    if (companyId === null) return true; // no company → don't filter
    const itemCompany = normalizePlantId(item.companyId);
    if (itemCompany === null) return true; // unknown → keep
    return itemCompany === companyId;
  };

  const coSchedules = schedules.filter(sameCompany);
  const coNcrs = ncrs.filter(sameCompany);
  const coAuditors = auditors.filter(sameCompany);
  const coAuditees = auditees.filter(sameCompany);
  const coResponses = responses.filter(sameCompany);

  // ── Step 2: "All Plants" → no plant filter ──
  if (plantId === null) {
    return {
      schedules: coSchedules,
      ncrs: coNcrs,
      auditors: coAuditors, // company-scoped, unchanged
      auditees: coAuditees,
      responses: coResponses,
    };
  }

  const schedulePlantMap = buildSchedulePlantMap(coSchedules);

  const resolvePlant = (item: any): number | null | undefined => {
    const direct = normalizePlantId(item.plantId);
    if (direct !== null) return direct;
    const schedId =
      item.auditScheduleId ?? item.scheduleId ?? item.auditSchedule?.id;
    if (schedId != null) {
      const viaSchedule = schedulePlantMap.get(String(schedId));
      if (viaSchedule !== undefined) return viaSchedule;
    }
    return undefined;
  };

  return {
    // Plant-scoped (physical location of the audit)
    schedules: coSchedules.filter(
      (s) => normalizePlantId(s.plantId) === plantId,
    ),
    ncrs: coNcrs.filter((n) => resolvePlant(n) === plantId),
    responses: coResponses.filter((r) => resolvePlant(r) === plantId),

    // Auditees are process owners at a plant → plant-scoped
    auditees: coAuditees.filter((a) => normalizePlantId(a.plantId) === plantId),

    // ✅ Auditors are COMPANY-SCOPED — do NOT filter by plant.
    auditors: coAuditors,
  };
}

const LeadAuditorDashboardContent: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

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

  const [leadAuditorPlantId, setLeadAuditorPlantId] = useState<number | null>(
    null,
  );
  const [leadAuditorPlantName, setLeadAuditorPlantName] = useState<
    string | null
  >(null);
  const [leadAuditorCompanyName, setLeadAuditorCompanyName] = useState<
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

  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const { selectedPlantId } = usePlantFilter();

  // ─────────────────────────────────────────────────────────────
  // Effective plant = user's own plant (if plant-scoped)
  //                   OR the navbar selection (if corporate)
  //                   OR null = "All Plants"
  // ─────────────────────────────────────────────────────────────
  const effectivePlantId = useMemo<number | null>(() => {
    const ownPlant = normalizePlantId(user?.plantId);
    if (ownPlant !== null) return ownPlant;
    return normalizePlantId(selectedPlantId);
  }, [user?.plantId, selectedPlantId]);

  const effectiveCompanyId = useMemo<number | null>(() => {
    return normalizePlantId(user?.companyId);
  }, [user?.companyId]);

  const subtabParam =
    typeof params?.subtab === "string"
      ? (params.subtab as "PENDING" | "CONFIRMED" | "REJECTED" | "OVERDUE")
      : Array.isArray(params?.subtab)
        ? (params.subtab[0] as "PENDING" | "CONFIRMED" | "REJECTED" | "OVERDUE")
        : undefined;

  useEffect(() => {
    if (params?.tab) setActiveTab(params.tab as string);
  }, [params?.tab]);

  const unwrapArray = <T,>(raw: any): T[] => {
    if (Array.isArray(raw)) return raw;
    if (raw == null) return [];
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.content)) return raw.content;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.ncrs)) return raw.ncrs;
    if (Array.isArray(raw.responses)) return raw.responses;
    if (Array.isArray(raw.schedules)) return raw.schedules;
    return [];
  };

  // ─────────────────────────────────────────────────────────────
  // Fetch plant + company display names for the header
  // ─────────────────────────────────────────────────────────────
  const fetchLeadAuditorPlant = async (): Promise<{
    plantId: number | null;
    plantName: string | null;
    companyName: string | null;
  }> => {
    try {
      // 1. Try to get the user record for company name
      const response = await axios.get(`${API_BASE_URL}/api/users/${user?.id}`);
      const userData = response.data;

      let plantName: string | null = userData?.plantName || null;
      let companyName: string | null =
        userData?.companyName ||
        userData?.company?.name ||
        userData?.plant?.company?.name ||
        userData?.plant?.companyName ||
        null;

      // 2. If a specific plant is effective, fetch its display name
      if (effectivePlantId !== null) {
        try {
          const plantRes = await axios.get(
            `${API_BASE_URL}/api/plants/${effectivePlantId}`,
          );
          const plantData = plantRes.data;
          plantName = plantData?.name || plantData?.plantName || plantName;
          companyName =
            plantData?.company?.name ||
            plantData?.companyName ||
            plantData?.company?.displayName ||
            companyName;
        } catch (plantErr) {
          console.warn("Could not fetch plant detail:", plantErr);
        }
      }

      setLeadAuditorPlantId(effectivePlantId);
      setLeadAuditorPlantName(plantName);
      setLeadAuditorCompanyName(companyName);

      return { plantId: effectivePlantId, plantName, companyName };
    } catch (error) {
      console.warn("Could not fetch user/plant metadata:", error);
      // Fallback: derive from context
      setLeadAuditorPlantId(effectivePlantId);
      setLeadAuditorPlantName(
        (user as any)?.plantName && effectivePlantId !== null
          ? (user as any).plantName
          : null,
      );
      setLeadAuditorCompanyName(null);
      return {
        plantId: effectivePlantId,
        plantName: null,
        companyName: null,
      };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Apply filter + recompute stats
  // ─────────────────────────────────────────────────────────────
  const updateFilteredData = (
    plantId: number | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[],
  ) => {
    const filtered = filterDataByPlant(
      plantId,
      effectiveCompanyId, // ← ADD
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

  // ─────────────────────────────────────────────────────────────
  // Fetch all data
  // ─────────────────────────────────────────────────────────────
  const fetchAllData = async (year: number = selectedYear) => {
    try {
      setLoading(true);

      await fetchLeadAuditorPlant();

      const userParams = user?.id ? { userId: user.id } : {};

      const [schedulesRes, ncrRes, auditorsRes, auditeesRes, responsesRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/audit-schedule/year/${year}`, {
            params: userParams,
          }),
          axios
            .get(`${API_BASE_URL}/api/ncr/all`, { params: userParams })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditors`, {
              params: userParams,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditees`, {
              params: userParams,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/templates/responses/all`, {
              params: userParams,
            })
            .catch(() => ({ data: [] })),
        ]);

      const schedules = unwrapArray<Schedule>(schedulesRes.data);
      let ncrs = unwrapArray<NCR>(ncrRes.data);
      const auditors = unwrapArray<User>(auditorsRes.data);
      const auditees = unwrapArray<User>(auditeesRes.data);
      let responses = unwrapArray<Response>(responsesRes.data);

      // Year filter
      ncrs = ncrs.filter((ncr) => {
        const d = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        if (!d) return true;
        try {
          return new Date(d as string).getFullYear() === year;
        } catch {
          return true;
        }
      });

      responses = responses.filter((r) => {
        if (!r.createdAt) return true;
        try {
          return new Date(r.createdAt as string).getFullYear() === year;
        } catch {
          return true;
        }
      });

      setAllSchedules(schedules);
      setAllNCRs(ncrs);
      setAllAuditors(auditors);
      setAllAuditees(auditees);
      setAllResponses(responses);

      updateFilteredData(
        effectivePlantId,
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
    const years: number[] = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  // Refetch when year OR plant changes
  useEffect(() => {
    fetchAllData(selectedYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, effectivePlantId, effectiveCompanyId]);

  // ─────────────────────────────────────────────────────────────
  // MNC header strings
  // ─────────────────────────────────────────────────────────────
  const plantLabel =
    leadAuditorPlantName && effectivePlantId !== null
      ? leadAuditorPlantName
      : "All Plants";

  const auditorCount = filteredAuditors.length;
  const auditeeCount = filteredAuditees.length;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator
          size="large"
          color={NAVBAR_COLORS.primary}
          style={{ marginBottom: 16 }}
        />
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
            leadAuditorDepartment={leadAuditorPlantName}
          />
        );
      case "feasibility":
        return (
          <FeasibilityConfirmationQueue
            selectedYear={selectedYear}
            plantId={effectivePlantId}
            onNavigateToForm5={(_year, _month) => {
              // Optional: navigate to Form5View
            }}
          />
        );
      case "daily-feasibility":
        return (
          <DailyFeasibilityQueue
            selectedYear={selectedYear}
            plantId={effectivePlantId}
            initialStatusTab={subtabParam}
            onNavigateToForm5={(_year, _month) => {
              // Optional: navigate to Form5DetailedView
            }}
          />
        );
      case "checksheets-ncrs":
        return (
          <AuditsAndResponses
            activeTab="checksheets-ncrs"
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
            leadAuditorDepartment={leadAuditorPlantName}
          />
        );
      case "stakeholders":
        return (
          <StakeholderManagement
            activeTab="stakeholders"
            allAuditors={filteredAuditors}
            allAuditees={filteredAuditees}
            allSchedules={filteredSchedules}
            allResponses={filteredResponses}
            allNCRs={filteredNCRs}
            onViewResponse={handleViewResponse}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorPlantName}
          />
        );
      default:
        return (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: 40,
              marginTop: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Text
              style={{ fontSize: 16, textAlign: "center", color: "#64748B" }}
            >
              Select a section from the navigation
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {/* ─────── HEADER ─────── */}
      <View
        style={{
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
        }}
      >
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View
            style={{
              flexDirection: isMobile ? "column" : "row",
              flexWrap: "wrap",
              alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between",
              gap: isMobile ? 12 : 16,
            }}
          >
            {/* Title Section */}
            <View style={{ minWidth: isMobile ? "100%" : 200 }}>
              <Text
                style={{
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: "bold",
                  color: "#1E293B",
                }}
              >
                Lead Auditor Dashboard
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 11 : 13,
                  color: "#64748B",
                  marginTop: 4,
                  flexWrap: "wrap",
                }}
              >
                Welcome back,{" "}
                <Text style={{ fontWeight: "600", color: "#334155" }}>
                  {user?.name || user?.username || "User"}
                </Text>
              </Text>

              {/* ─────── MNC CHIPS: company · plant · counts ─────── */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {/* Company chip */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: NAVBAR_COLORS.bg,
                    borderWidth: 1,
                    borderColor: "#DBEAFE",
                  }}
                >
                  <Building2 size={11} color={NAVBAR_COLORS.primary} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: NAVBAR_COLORS.primary,
                    }}
                    numberOfLines={1}
                  >
                    {leadAuditorCompanyName || "Company"}
                  </Text>
                </View>

                {/* Plant chip */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor:
                      effectivePlantId !== null ? "#EFF6FF" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor:
                      effectivePlantId !== null ? "#BFDBFE" : "#E2E8F0",
                  }}
                >
                  <Building2
                    size={11}
                    color={
                      effectivePlantId !== null
                        ? NAVBAR_COLORS.primary
                        : "#64748B"
                    }
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color:
                        effectivePlantId !== null
                          ? NAVBAR_COLORS.primary
                          : "#64748B",
                    }}
                    numberOfLines={1}
                  >
                    {plantLabel}
                  </Text>
                </View>

                {/* Auditor count chip — company-wide, does NOT change with plant */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: "#EFF6FF",
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <Users size={11} color={NAVBAR_COLORS.primary} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: NAVBAR_COLORS.primary,
                    }}
                  >
                    {auditorCount} auditors (company-wide)
                  </Text>
                </View>

                {/* Auditee count chip — plant-scoped */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: "#F1F5F9",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <Users size={11} color="#475569" />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    {auditeeCount} auditees
                    {effectivePlantId !== null ? " (this plant)" : ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* Controls */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
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
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ─────── CONTENT ─────── */}
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

      {/* Review Modal */}
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
            <View
              style={{
                width: "100%",
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
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 16,
                  marginBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: NAVBAR_COLORS.bg,
                    }}
                  >
                    <FileText size={20} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text
                    style={{
                      fontSize: isMobile ? 16 : 18,
                      fontWeight: "bold",
                      color: "#1E293B",
                    }}
                  >
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
              <View
                style={{
                  padding: 16,
                  marginBottom: 20,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#F1F5F9",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "bold", color: "#1E293B" }}
                >
                  {reviewingResponse.department}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 8,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Score:{" "}
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: NAVBAR_COLORS.primary,
                      }}
                    >
                      {reviewingResponse.totalScore}/
                      {reviewingResponse.maxPossibleScore}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748B" }}>
                    Auditee:{" "}
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: NAVBAR_COLORS.primary,
                      }}
                    >
                      {reviewingResponse.auditeeName}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Approve / Reject Toggle */}
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
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: reviewApproved ? "#10B981" : "#CBD5E1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {reviewApproved && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#10B981",
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: reviewApproved ? "#059669" : "#64748B",
                    }}
                  >
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
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: !reviewApproved ? "#EF4444" : "#CBD5E1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {!reviewApproved && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: "#EF4444",
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: !reviewApproved ? "#DC2626" : "#64748B",
                    }}
                  >
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
                placeholder={
                  reviewApproved
                    ? "Add approval comments (optional)..."
                    : "Please provide reason for rejection..."
                }
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Footer Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
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
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#334155",
                    }}
                  >
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
                    backgroundColor: submitting
                      ? "#94A3B8"
                      : reviewApproved
                        ? "#10B981"
                        : "#EF4444",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
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
