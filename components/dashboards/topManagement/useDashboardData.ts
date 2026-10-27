import { apiClient } from "@/services/api";
import { useCallback, useEffect, useState } from "react";

const monthOrder = [
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

export function useDashboardData(
  user: any,
  selectedPlant: string | number | null,
  activeSection: string = "overview",
) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Overview ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    totalAudits: 0,
    completedAudits: 0,
    pendingAnnualPlans: 0,
    approvedAnnualPlans: 0,
    pendingDeptPlans: 0,
    approvedDeptPlans: 0,
    pendingWeekSchedules: 0,
    approvedWeekSchedules: 0,
    pendingDailySchedules: 0,
    approvedDailySchedules: 0,
    overallCompletion: 0,
  });
  const [monthlyAuditData, setMonthlyAuditData] = useState<any[]>([]);
  const [approvalStatusData, setApprovalStatusData] = useState<any[]>([]);
  const [auditTypeDistribution, setAuditTypeDistribution] = useState<any[]>([]);
  const [completionTrendData, setCompletionTrendData] = useState<any[]>([]);

  // ── Tab lists ─────────────────────────────────────────────────────────
  const [pendingPlans, setPendingPlans] = useState<any[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);
  const [pendingDeptPlans, setPendingDeptPlans] = useState<any[]>([]);
  const [approvedDeptPlans, setApprovedDeptPlans] = useState<any[]>([]);
  const [pendingForm5Plans, setPendingForm5Plans] = useState<any[]>([]);
  const [approvedForm5Plans, setApprovedForm5Plans] = useState<any[]>([]);
  const [pendingDetailedPlans, setPendingDetailedPlans] = useState<any[]>([]);
  const [approvedDetailedPlans, setApprovedDetailedPlans] = useState<any[]>([]);

  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});

  // ── Overview fetcher ──────────────────────────────────────────────────
  const fetchDashboardData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.id) return;
      if (!opts?.silent) setLoading(true);
      try {
        const res: any = await apiClient.get(
          "/api/audit-schedule/top-management/overview",
          {
            userId: user.id,
            ...(selectedPlant != null ? { plantId: selectedPlant } : {}),
          },
        );
        setStats(res?.stats || {});
        setMonthlyAuditData(res?.monthlyAuditData || []);
        setApprovalStatusData(res?.approvalStatusData || []);
        setAuditTypeDistribution(res?.auditTypeDistribution || []);
        setCompletionTrendData(res?.completionTrendData || []);
      } catch (error) {
        console.error("❌ overview fetch failed:", error);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [user?.id, selectedPlant],
  );

  // ── Annual Plans ──────────────────────────────────────────────────────
  const loadAnnualPlans = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      if (loadedTabs.annual && !force) return;
      try {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
        const rows = await Promise.all(
          years.map(async (y) => {
            try {
              const data: any = await apiClient.get(
                `/api/audit-plan/${y}?userId=${user.id}`,
              );
              if (!data) return null;
              return {
                year: y,
                approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
                preparedBy: data.preparedBy || "N/A",
                planItems: data.planItems || [],
              };
            } catch {
              return null;
            }
          }),
        );
        const filtered = rows.filter(Boolean) as any[];
        setPendingPlans(
          filtered.filter((p) => p.approvalStatus.includes("PENDING")),
        );
        setApprovedPlans(
          filtered.filter((p) => p.approvalStatus.includes("APPROVED")),
        );
        setLoadedTabs((prev) => ({ ...prev, annual: true }));
      } catch (e) {
        console.error("annual load failed:", e);
      }
    },
    [user?.id, loadedTabs.annual],
  );

  // ── Department Plans ──────────────────────────────────────────────────
  const loadDeptPlans = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      if (loadedTabs.dept && !force) return;
      try {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
        const rows = await Promise.all(
          years.map(async (y) => {
            try {
              const data: any = await apiClient.get(
                `/api/department-plan/${y}?userId=${user.id}`,
              );
              if (!data) return null;
              return {
                year: y,
                approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
                preparedBy: data.preparedBy || "N/A",
                planItems: data.planItems || [],
              };
            } catch {
              return null;
            }
          }),
        );
        const filtered = rows.filter(Boolean) as any[];
        setPendingDeptPlans(
          filtered.filter((p) => p.approvalStatus.includes("PENDING")),
        );
        setApprovedDeptPlans(
          filtered.filter((p) => p.approvalStatus.includes("APPROVED")),
        );
        setLoadedTabs((prev) => ({ ...prev, dept: true }));
      } catch (e) {
        console.error("dept load failed:", e);
      }
    },
    [user?.id, loadedTabs.dept],
  );

  // ── Week Schedules ────────────────────────────────────────────────────
  const loadWeekSchedules = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      if (loadedTabs.week && !force) return;
      try {
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
        const rows = await Promise.all(
          years.map(async (y) => {
            try {
              const data: any = await apiClient.get(
                `/api/audit-schedule/year/${y}?userId=${user.id}`,
              );
              const list = Array.isArray(data) ? data : data?.data || [];
              const weekOnly = list.filter((s: any) => !s.scheduledDate);
              const byMonth = new Map<string, any>();
              weekOnly.forEach((s: any) => {
                const m = s.month;
                if (!m) return;
                if (!byMonth.has(m))
                  byMonth.set(m, {
                    year: y,
                    month: m,
                    approvalStatus: s.approvalStatus || "DRAFT",
                    preparedBy: s.preparedByName,
                    scheduleCount: 0,
                    schedules: [],
                  });
                const row = byMonth.get(m);
                row.scheduleCount++;
                row.schedules.push(s);
              });
              return Array.from(byMonth.values());
            } catch {
              return [];
            }
          }),
        );
        const all = rows.flat();
        setPendingForm5Plans(
          all.filter((m: any) =>
            [
              "PENDING_LA_CONFIRMATION",
              "CONFIRMED_BY_LA",
              "PARTIALLY_CONFIRMED_BY_LA",
            ].includes((m.approvalStatus || "").toUpperCase()),
          ),
        );
        setApprovedForm5Plans(
          all.filter((m: any) =>
            ["APPROVED", "REJECTED", "CHANGE_REQUESTED"].includes(
              (m.approvalStatus || "").toUpperCase(),
            ),
          ),
        );
        setLoadedTabs((prev) => ({ ...prev, week: true }));
      } catch (e) {
        console.error("week load failed:", e);
      }
    },
    [user?.id, loadedTabs.week],
  );

  // ── Daily Schedules (Month-by-Month Fetch) ────────────────────────────
  // ── Daily Schedules (1 request via summary endpoint) ──────────────────
  const loadDailySchedules = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      if (loadedTabs.daily && !force) return;
      try {
        const res: any = await apiClient.get(
          "/api/audit-schedule/daily/summary",
          { userId: user.id },
        );

        const pendingRows = Array.isArray(res?.pending) ? res.pending : [];
        const historyRows = Array.isArray(res?.history) ? res.history : [];

        setPendingDetailedPlans(pendingRows);
        setApprovedDetailedPlans(historyRows);
        setLoadedTabs((prev) => ({ ...prev, daily: true }));
      } catch (e) {
        console.error("❌ daily load failed:", e);
      }
    },
    [user?.id, loadedTabs.daily],
  );

  // ── Effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeSection === "annual") loadAnnualPlans();
    if (activeSection === "dept") loadDeptPlans();
    if (activeSection === "week") loadWeekSchedules();
    if (activeSection === "daily") loadDailySchedules();
  }, [
    activeSection,
    loadAnnualPlans,
    loadDeptPlans,
    loadWeekSchedules,
    loadDailySchedules,
  ]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData({ silent: true });
    if (activeSection === "annual") await loadAnnualPlans(true);
    if (activeSection === "dept") await loadDeptPlans(true);
    if (activeSection === "week") await loadWeekSchedules(true);
    if (activeSection === "daily") await loadDailySchedules(true);
    setRefreshing(false);
  }, [
    fetchDashboardData,
    activeSection,
    loadAnnualPlans,
    loadDeptPlans,
    loadWeekSchedules,
    loadDailySchedules,
  ]);
  return {
    loading,
    refreshing,
    stats,
    monthlyAuditData,
    approvalStatusData,
    auditTypeDistribution,
    completionTrendData,
    pendingPlans,
    approvedPlans,
    pendingDeptPlans,
    approvedDeptPlans,
    pendingForm5Plans,
    approvedForm5Plans,
    pendingDetailedPlans,
    approvedDetailedPlans,
    allUsersList: [] as any[],
    availablePlants: [] as any[],
    allDetailedSchedules: [] as any[],
    fetchDashboardData,
    fetchDetailedPlans: () => loadDailySchedules(true),
    refetchAnnualPlans: () => loadAnnualPlans(true),
    refetchDeptPlans: () => loadDeptPlans(true),
    refetchWeekSchedules: () => loadWeekSchedules(true),
    refetchDailySchedules: () => loadDailySchedules(true),
    refresh,
  };
}
