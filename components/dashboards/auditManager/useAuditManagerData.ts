import { useAuth } from "@/components/context/AuthContext";
import { apiClient, userAPI } from "@/services/api";
import { ncrService } from "@/services/ncrService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { ActivityItem } from "./AuditManagerCharts";

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

const getNcrYear = (ncr: any): number => {
  const dateValue = ncr?.createdAt || ncr?.raisedDate || ncr?.dueDate;
  if (!dateValue) return new Date().getFullYear();
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return new Date().getFullYear();
  return d.getFullYear();
};

const getRequestYear = (request: any): number | null => {
  const raw =
    request?.requestedAt || request?.createdAt || request?.requestDate || null;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
};

export function useAuditManagerData() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // ── state: core ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedYear, setSelectedYear] = useState(() => {
    const urlYear = params?.year ? parseInt(params.year as string) : null;
    return urlYear || new Date().getFullYear();
  });

  const currentYear = new Date().getFullYear();
  const [availableYears] = useState(() => {
    const years = [];
    for (let i = 5; i >= -5; i--) years.push(currentYear + i);
    return years;
  });

  const [stats, setStats] = useState({
    totalAudits: 0,
    completedAudits: 0,
    pendingSchedules: 0,
    openNCRs: 0,
    pendingRequests: 0,
    pendingCaVerification: 0,
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allNcrs, setAllNcrs] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [form3Status, setForm3Status] = useState({ status: "NOT_STARTED" });
  const [form4Status, setForm4Status] = useState({ status: "NOT_STARTED" });
  const [hasApprovedForm5, setHasApprovedForm5] = useState(false);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [selectedPlant] = useState<string | number | null>(
    () => (user as any)?.plantId ?? null,
  );

  // ── state: modal & team ──────────────────────────────────────────────
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [departmentTeamMembers, setDepartmentTeamMembers] = useState({
    auditors: [] as any[],
    teamAuditorIds: [] as any[],
    leadAuditorName: null as string | null,
    teamAuditorNames: [] as string[],
  });
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // ── tab routing ──────────────────────────────────────────────────────
  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);
      const tabMap: Record<string, string> = {
        dashboard: "dashboard",
        schedules: "schedules",
        ncr: "ncr",
        requests: "requests",
        schedule: "schedules",
        scheduling: "schedules",
        "ncr-management": "ncr",
        "ncr-pending": "ncr",
      };
      setActiveSection(tabMap[tabValue] || tabValue);
    } else {
      setActiveSection("dashboard");
    }
  }, [params?.tab]);

  // ── fetchAllData ─────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [statsRes, ncrsRes, reqRes, f3Res, f4Res, f5Res, usersRes] =
        await Promise.all([
          apiClient
            .get(`/api/audit-schedule/year/${selectedYear}?userId=${user.id}`)
            .catch(() => []),
          ncrService.getAllNCRs(user.id).catch(() => ({ success: false })),
          apiClient
            .get(`/api/audit-schedule/pending-requests?userId=${user.id}`)
            .catch(() => []),
          apiClient
            .get(`/api/audit-plan/${selectedYear}?userId=${user.id}`)
            .catch(() => null),
          apiClient
            .get(`/api/department-plan/${selectedYear}?userId=${user.id}`)
            .catch(() => null),
          apiClient
            .get(
              `/api/audit-schedule/available-months/${selectedYear}?userId=${user.id}`,
            )
            .catch(() => []),
          userAPI.getAll().catch(() => []),
        ]);

      const allSchedules = Array.isArray(statsRes)
        ? statsRes
        : (statsRes as any)?.data || [];
      const rawNcrs = Array.isArray(ncrsRes)
        ? ncrsRes
        : (ncrsRes as any)?.data || [];
      const allNcrsData = rawNcrs.filter(
        (ncr: any) => getNcrYear(ncr) === selectedYear,
      );
      const rawRequests = Array.isArray(reqRes)
        ? reqRes
        : (reqRes as any)?.data || [];
      const requests = rawRequests.filter((r: any) => {
        const y = getRequestYear(r);
        return y === null || y === selectedYear;
      });
      const users = Array.isArray(usersRes)
        ? usersRes
        : (usersRes as any)?.data || [];

      setSchedules(allSchedules);
      setAllNcrs(allNcrsData);
      setPendingRequests(requests);
      setAllUsersList(users);

      const extractApprovalStatus = (res: any): string => {
        if (!res) return "NOT_STARTED";
        const payload = res.data ?? res;
        const obj = Array.isArray(payload) ? payload[0] : payload;
        return obj?.approvalStatus ?? obj?.status ?? "NOT_STARTED";
      };
      setForm3Status({ status: extractApprovalStatus(f3Res) });
      setForm4Status({ status: extractApprovalStatus(f4Res) });
      setHasApprovedForm5(
        Array.isArray(f5Res)
          ? f5Res.some((m: any) => m.approvalStatus === "APPROVED")
          : false,
      );

      // Count ONLY open/active NCRs (exclude CLOSED, REJECTED, and COMPLETED)
      const activeNcrs = allNcrsData.filter(
        (n: any) =>
          n.status !== "CLOSED" &&
          n.status !== "REJECTED" &&
          n.status !== "NCR2_COMPLETED",
      );

      setStats({
        totalAudits: allSchedules.length,
        completedAudits: allSchedules.filter(
          (s: any) => s.status === "COMPLETED" || s.status === "CLOSED",
        ).length,
        pendingSchedules: allSchedules.filter(
          (s: any) =>
            s.approvalStatus === "PENDING_APPROVAL" ||
            (s.approvalStatus === "APPROVED" && s.status === "SCHEDULED"),
        ).length,
        openNCRs: activeNcrs.length, // ✅ Fixed: Only counts active NCRs
        pendingRequests: requests.length,
        pendingCaVerification: allNcrsData.filter(
          (n: any) =>
            n.status === "IN_PROGRESS" || n.status === "NCR2_IN_PROGRESS",
        ).length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ── fetchDepartmentTeamMembers ───────────────────────────────────────
  const fetchDepartmentTeamMembers = async (
    departmentName: string,
    request?: any,
  ) => {
    if (!departmentName) return;
    setLoadingTeamMembers(true);

    try {
      const enumValue =
        departmentDisplayToEnum[departmentName] ||
        departmentName.toUpperCase().replace(/[&\s\/]+/g, "_");

      const parseArr = (val: any): any[] => {
        if (!val || val === "null") return [];
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const getIds = (s: any): number[] => {
        const ids =
          parseArr(s?.coAuditorIds).length > 0
            ? parseArr(s?.coAuditorIds)
            : parseArr(s?.teamAuditorIds);
        return ids.map((x: any) => Number(x)).filter((n) => !isNaN(n));
      };
      const getNames = (s: any): string[] => {
        const names =
          parseArr(s?.coAuditorNames).length > 0
            ? parseArr(s?.coAuditorNames)
            : parseArr(s?.teamAuditorNames);
        return names.map(String);
      };
      const hasTeam = (s: any) =>
        getIds(s).length > 0 || getNames(s).length > 0;

      let target: any = schedules.find(
        (s: any) => String(s.id) === String(request?.scheduleId),
      );

      if (!target || !hasTeam(target)) {
        const reqLower = String(departmentName).trim().toLowerCase();
        const siblings = schedules.filter((s: any) => {
          const d = String(s.department || "")
            .trim()
            .toLowerCase();
          return d === reqLower || d === String(enumValue).toLowerCase();
        });
        target = siblings.find(hasTeam) || target;
      }

      if (!target || !hasTeam(target)) {
        const res = await apiClient
          .get(
            `/api/audit-schedule/year/${selectedYear}/department/${encodeURIComponent(enumValue)}`,
          )
          .catch(() => []);
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        target = list.find((s: any) => hasTeam(s)) || target;
      }

      let teamIds: number[] = target ? getIds(target) : [];
      let teamNames: string[] = target ? getNames(target) : [];

      const leadId = target?.leadAuditorId || target?.auditorId;
      const leadName = target?.leadAuditorName || target?.auditorName || null;

      if (leadId) {
        teamIds = teamIds.filter((id) => Number(id) !== Number(leadId));
      }
      if (leadName) {
        teamNames = teamNames.filter(
          (name) => String(name) !== String(leadName),
        );
      }

      let assignedAuditors: any[] = teamIds.map((id, i) => {
        const u = allUsersList.find((x: any) => Number(x.id) === Number(id));
        if (u) return u;
        const parts = (teamNames[i] || "Unknown").split(" ");
        return {
          id: Number(id),
          firstName: parts[0],
          lastName: parts.slice(1).join(" "),
          role: "AUDITOR",
        };
      });

      if (assignedAuditors.length === 0 && teamNames.length > 0) {
        assignedAuditors = teamNames.map((name) => {
          const u = allUsersList.find(
            (x: any) =>
              `${x.firstName} ${x.lastName}`.toLowerCase() ===
              name.toLowerCase(),
          );
          return (
            u || {
              id: -1,
              firstName: name.split(" ")[0],
              lastName: name.split(" ").slice(1).join(" "),
              role: "AUDITOR",
            }
          );
        });
      }

      if (assignedAuditors.length === 0) {
        const auditorsRes = await apiClient
          .get(
            `/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`,
          )
          .catch(() => []);
        assignedAuditors = Array.isArray(auditorsRes)
          ? auditorsRes
          : (auditorsRes as any)?.data || [];

        if (leadId) {
          assignedAuditors = assignedAuditors.filter(
            (a: any) => Number(a.id) !== Number(leadId),
          );
        }
      }

      const validIds = assignedAuditors
        .map((a: any) => Number(a.id))
        .filter((n) => !isNaN(n) && n > 0);

      setDepartmentTeamMembers({
        auditors: assignedAuditors,
        teamAuditorIds: validIds,
        leadAuditorName: leadName,
        teamAuditorNames: assignedAuditors.map(
          (a: any) => `${a.firstName} ${a.lastName}`,
        ),
      });
    } catch (error) {
      console.error("❌ Error fetching department team:", error);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  // ── handleViewRequest ────────────────────────────────────────────────
  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    fetchDepartmentTeamMembers(request.department, request);
  };

  // ── openForumById ────────────────────────────────────────────────────
  const openForumById = (forumId: string) => {
    console.log("📤 [Dashboard] Opening forum by ID:", forumId);

    if (
      forumId === "general-forum" ||
      forumId === "AUDIT-general-forum" ||
      forumId.startsWith("AUDIT-general-forum-plant-")
    ) {
      const topManagers = allUsersList.filter(
        (u: any) =>
          u.role?.toUpperCase().includes("TOP_MANAGEMENT") &&
          (!selectedPlant || String(u.plantId) === String(selectedPlant)),
      );
      const auditManagers = allUsersList.filter(
        (u: any) =>
          u.role?.toUpperCase().includes("AUDIT_MANAGER") &&
          (!selectedPlant || String(u.plantId) === String(selectedPlant)),
      );

      const memberEmails: string[] = [];
      topManagers.forEach((tm: any) => {
        if (tm.email && !memberEmails.includes(tm.email))
          memberEmails.push(tm.email);
      });
      auditManagers.forEach((am: any) => {
        if (am.email && !memberEmails.includes(am.email))
          memberEmails.push(am.email);
      });
      if (user?.email && !memberEmails.includes(user.email)) {
        memberEmails.push(user.email);
      }

      const resolvedPlantId = selectedPlant ?? (user as any)?.plantId ?? null;
      const bareGeneralId = forumId.startsWith("AUDIT-")
        ? forumId.replace(/^AUDIT-/, "")
        : resolvedPlantId
          ? `general-forum-plant-${resolvedPlantId}`
          : "general-forum";

      setSelectedAuditForForum({
        id: bareGeneralId,
        auditNumber: "GENERAL",
        auditType: "General Audit Discussion",
        department: "All Departments",
        auditorId: user?.id || null,
        auditorName: user?.name || "Unknown User",
        auditeeId: null,
        auditeeName: "N/A",
        hodEmail: null,
        hodName: "N/A",
        memberEmails: [],
        plantId: resolvedPlantId,
        plantName: (user as any)?.plantName ?? null,
      });
      setShowForumModal(true);
      return;
    }

    if (
      forumId === "schedule-plan" ||
      forumId.startsWith("schedule-plan-") ||
      forumId.startsWith("AUDIT-schedule-plan")
    ) {
      const bareId = forumId.startsWith("AUDIT-")
        ? forumId.replace(/^AUDIT-/, "")
        : forumId;
      const resolvedPlantId = selectedPlant ?? (user as any)?.plantId ?? null;

      setSelectedAuditForForum({
        id: bareId,
        auditNumber: "SCHEDULE-PLAN",
        auditType: "Schedule Plan",
        department: "All Departments",
        auditorId: user?.id || null,
        auditorName: user?.name || "Unknown User",
        auditeeId: null,
        auditeeName: "N/A",
        hodEmail: null,
        hodName: "N/A",
        memberEmails: [],
        plantId: resolvedPlantId,
        plantName: (user as any)?.plantName ?? null,
      });
      setShowForumModal(true);
      return;
    }

    const resolvedPlantId = selectedPlant ?? (user as any)?.plantId ?? null;

    if (forumId.startsWith("AUDIT-")) {
      const auditId = forumId.replace("AUDIT-", "");
      setSelectedAuditForForum({
        id: forumId,
        auditNumber: auditId,
        auditType: `Audit Review ${auditId}`,
        department: "All Departments",
        auditorId: user?.id || null,
        auditorName: user?.name || "Unknown User",
        auditeeId: null,
        auditeeName: "N/A",
        hodEmail: null,
        hodName: "N/A",
        memberEmails: [user?.email].filter(Boolean),
        plantId: resolvedPlantId,
        plantName: (user as any)?.plantName ?? null,
      });
      setShowForumModal(true);
      return;
    }

    setSelectedAuditForForum({
      id: forumId,
      auditNumber: forumId,
      auditType: "Forum Discussion",
      department: "All Departments",
      auditorId: user?.id || null,
      auditorName: user?.name || "Unknown User",
      auditeeId: null,
      auditeeName: "N/A",
      hodEmail: null,
      hodName: "N/A",
      memberEmails: [user?.email].filter(Boolean),
    });
    setShowForumModal(true);
  };

  useEffect(() => {
    if (params?.openForum) {
      openForumById(params.openForum as string);
      router.setParams({ openForum: undefined, fromShare: undefined });
    }
  }, [params?.openForum]);

  // ── chart data memos ─────────────────────────────────────────────────
  const monthlyTrendData = useMemo(() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthCounts = new Array(12).fill(0);
    schedules
      .filter((s: any) => !selectedPlant || s.plantId === selectedPlant)
      .forEach((s: any) => {
        const dateStr = s.auditDate || s.scheduledDate;
        if (dateStr) {
          const date = new Date(dateStr);
          if (date.getFullYear() === selectedYear)
            monthCounts[date.getMonth()]++;
        }
      });
    return monthNames.map((name, idx) => ({
      label: name,
      value: monthCounts[idx],
    }));
  }, [schedules, selectedPlant, selectedYear]);

  const ncrDistributionData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    const groups = { Pending: 0, "In Progress": 0, "Approved / Closed": 0 };
    allNcrs.forEach((ncr: any) => {
      const status = (ncr.status || "").toUpperCase();
      if (
        status === "CLOSED" ||
        status === "APPROVED" ||
        status === "NCR2_COMPLETED"
      ) {
        groups["Approved / Closed"]++;
      } else if (status.includes("IN_PROGRESS")) {
        groups["In Progress"]++;
      } else {
        groups["Pending"]++;
      }
    });
    return [
      { name: "Pending", value: groups["Pending"], color: "#00529B" },
      { name: "In Progress", value: groups["In Progress"], color: "#3b82f6" },
      {
        name: "Approved / Closed",
        value: groups["Approved / Closed"],
        color: "#60a5fa",
      },
    ].filter((i) => i.value > 0);
  }, [allNcrs]);

  const ncrByDepartmentData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    const deptCounts: Record<string, number> = {};
    allNcrs.forEach((ncr: any) => {
      const dept = ncr.department || "Unknown";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return Object.entries(deptCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allNcrs]);

  // NCR priority data — real values from `allNcrs` (no hardcoded numbers)
  const ncrPriorityData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    const groups = { High: 0, Medium: 0, Low: 0 };
    allNcrs.forEach((ncr: any) => {
      const raw = (ncr.priority || ncr.severity || ncr.criticality || "")
        .toString()
        .toUpperCase();
      if (raw === "HIGH" || raw === "CRITICAL") groups.High++;
      else if (raw === "LOW" || raw === "MINOR") groups.Low++;
      else groups.Medium++;
    });
    return [
      { name: "High", value: groups.High, color: "#EF4444" },
      { name: "Medium", value: groups.Medium, color: "#F59E0B" },
      { name: "Low", value: groups.Low, color: "#10B981" },
    ].filter((d) => d.value > 0);
  }, [allNcrs]);

  const recentActivities = useMemo(() => {
    const activities: ActivityItem[] = [];
    pendingRequests.slice(0, 3).forEach((req) => {
      activities.push({
        title: `${req.type === "RESCHEDULE" ? "Reschedule" : "Extension"} Request`,
        description: `${req.auditType} - ${req.department}`,
        time: new Date(req.requestedAt).toLocaleDateString(),
        icon: null as any,
      });
    });
    if (stats.openNCRs > 0) {
      activities.push({
        title: "Open NCRs",
        description: `${stats.openNCRs} reports require attention`,
        time: "Active",
        icon: null as any,
      });
    }
    return activities.slice(0, 5);
  }, [pendingRequests, stats]);

  return {
    user,
    loading,
    refreshing,
    activeSection,
    setActiveSection,
    selectedYear,
    setSelectedYear,
    availableYears,
    selectedPlant,
    stats,
    schedules,
    allNcrs,
    pendingRequests,
    form3Status,
    form4Status,
    hasApprovedForm5,
    allUsersList,
    monthlyTrendData,
    ncrDistributionData,
    ncrByDepartmentData,
    recentActivities,
    fetchAllData,
    refresh,
    ncrPriorityData,

    // Modals & Team Exports
    departmentTeamMembers,
    loadingTeamMembers,
    handleViewRequest,
    openForumById,
    showForumModal,
    setShowForumModal,
    selectedAuditForForum,
    setSelectedAuditForForum,
    selectedRequest,
    setSelectedRequest,
  };
}
