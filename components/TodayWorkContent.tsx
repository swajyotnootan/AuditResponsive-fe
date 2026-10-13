// components/context/TodayWorkContent.tsx
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ==========================================
// PLANT HELPERS
// ==========================================
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
  if (rowPlant === null) return true; // fail-open for rows without a plant
  return String(rowPlant) === String(plantId);
};

const filterByPlant = <T,>(rows: T[], plantId: string | number | null): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
};

// ==========================================
// TYPES
// ==========================================

export interface TodayWorkItem {
  scheduleId: number;
  department: string;
  auditType?: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  auditorId?: number;
  auditorName?: string;
  auditeeNames?: string[];
  workStarted?: boolean;
  rescheduleRequested?: boolean;
  extensionRequested?: boolean;
  detailedApprovalStatus?: string;
  category: string;
  daysOverdue?: number;
  action?: string;
  responseStatus?: string;
}

interface PendingRequest {
  type: string;
  requestId: number;
  scheduleId: number;
  department: string;
  auditorName?: string;
  requestedNewDate?: string;
  requestedNewToDate?: string;
  reason?: string;
  requestedBy?: string;
  requestedAt?: string;
}

interface TodayWorkData {
  overdue: TodayWorkItem[];
  dueToday: TodayWorkItem[];
  completedToday: TodayWorkItem[];
  pendingRequests: PendingRequest[];
  pendingApprovals: any[];
  counts: {
    overdue: number;
    dueToday: number;
    completedToday: number;
    pendingRequests: number;
    pendingApprovals: number;
    total: number;
  };
}

type FilterMode = "all" | "overdue" | "dueToday" | "completed";

const PAGE_SIZE = 10;

// ==========================================
// HELPERS
// ==========================================

const parseDateSafe = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m)
    return new Date(
      parseInt(m[1], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[3], 10),
    );
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const parseTimeSafe = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

const isAuditDone = (item: TodayWorkItem): boolean => {
  const s = (item.responseStatus || "").toUpperCase();
  return s === "SUBMITTED" || s === "APPROVED" || s === "COMPLETED";
};

const recomputeCategory = (item: TodayWorkItem): string => {
  if (isAuditDone(item)) return "COMPLETED";
  const scheduledDate = parseDateSafe(item.scheduledDate);
  if (!scheduledDate) return item.category || "UPCOMING";

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduledDate.setHours(0, 0, 0, 0);

  if (scheduledDate.getTime() < today.getTime()) return "OVERDUE";

  if (scheduledDate.getTime() === today.getTime()) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const endMin = parseTimeSafe(item.endTime);
    if (item.endTime && nowMin > endMin) return "OVERDUE";
    return "DUE_TODAY";
  }
  return "UPCOMING";
};

const recomputeAction = (item: TodayWorkItem, category: string): string => {
  if (category === "COMPLETED") return "VIEW";

  if (category === "OVERDUE") {
    if (item.rescheduleRequested || item.extensionRequested)
      return "AWAITING_MANAGER";
    if (item.workStarted) return "REQUEST_EXTENSION";
    return "REQUEST_RESCHEDULE";
  }

  if (category === "DUE_TODAY") {
    if (item.workStarted) return "COMPLETE_AUDIT";
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = parseTimeSafe(item.startTime);
    const endMin = parseTimeSafe(item.endTime);
    if (!item.startTime || !item.endTime) return "START_AUDIT";
    if (nowMin >= startMin && nowMin <= endMin) return "START_AUDIT";
    if (nowMin < startMin) return "WAIT";
    return "MISSED_TODAY";
  }
  return "VIEW";
};

const correctedData = (
  raw: TodayWorkData,
  plantId: string | number | null, // ✅ NEW PARAM
): TodayWorkData => {
  if (!raw) return raw;

  // ✅ PLANT SCOPE — filter every list BEFORE dedupe / sorting
  const scopedOverdue = filterByPlant(raw.overdue || [], plantId);
  const scopedDueToday = filterByPlant(raw.dueToday || [], plantId);
  const scopedCompleted = filterByPlant(raw.completedToday || [], plantId);
  const scopedRequests = filterByPlant(raw.pendingRequests || [], plantId);

  // ✅ Dedupe by scheduleId across overdue + dueToday
  const seenIds = new Set<number>();
  const allActive: TodayWorkItem[] = [];
  [...scopedOverdue, ...scopedDueToday].forEach((item) => {
    if (item.scheduleId == null) return;
    if (seenIds.has(item.scheduleId)) return;
    seenIds.add(item.scheduleId);
    allActive.push(item);
  });

  const overdue: TodayWorkItem[] = [];
  const dueToday: TodayWorkItem[] = [];
  const completedToday: TodayWorkItem[] = [...scopedCompleted];

  allActive.forEach((item) => {
    const newCat = recomputeCategory(item);
    const newAct = recomputeAction(item, newCat);
    const corrected: TodayWorkItem = {
      ...item,
      category: newCat,
      action: newAct,
    };
    if (newCat === "COMPLETED") completedToday.push(corrected);
    else if (newCat === "OVERDUE") overdue.push(corrected);
    else if (newCat === "DUE_TODAY") dueToday.push(corrected);
  });

  overdue.sort((a, b) => {
    const da = parseDateSafe(a.scheduledDate)?.getTime() ?? 0;
    const db = parseDateSafe(b.scheduledDate)?.getTime() ?? 0;
    if (da !== db) return da - db;
    return (a.startTime || "").localeCompare(b.startTime || "");
  });
  dueToday.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  // ✅ Dedupe pendingRequests
  const seenReq = new Set<string>();
  const pendingRequests = scopedRequests.filter((r) => {
    const key = `${r.type}-${r.requestId}-${r.scheduleId}`;
    if (seenReq.has(key)) return false;
    seenReq.add(key);
    return true;
  });

  return {
    ...raw,
    overdue,
    dueToday,
    completedToday,
    pendingRequests,
    counts: {
      ...raw.counts,
      overdue: overdue.length,
      dueToday: dueToday.length,
      completedToday: completedToday.length,
      pendingRequests: pendingRequests.length,
      total:
        overdue.length +
        dueToday.length +
        completedToday.length +
        pendingRequests.length +
        (raw.pendingApprovals?.length || 0),
    },
  };
};

// ==========================================
// DROPDOWN FILTER COMPONENT
// ==========================================

const FilterDropdown: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <TouchableOpacity
        style={styles.dropdownTrigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
          {selected?.label || label}
        </Text>
        <ChevronDown size={14} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdownSheet}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSel = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      isSel && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSel && styles.dropdownItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSel && <CheckCircle size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const TodayWorkContent: React.FC<{ onClose?: () => void }> = ({
  onClose,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TodayWorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ✅ Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Pagination
  const [overdueLimit, setOverdueLimit] = useState(PAGE_SIZE);
  const [completedLimit, setCompletedLimit] = useState(PAGE_SIZE);

  const userId = user?.id;
  const userRole = user?.role ?? "";

  // ✅ PLANT FILTER STATE
  const [plantId, setPlantId] = useState<string | number | null>(
    () => (user as any)?.plantId ?? null,
  );
  // ==========================================
  // FETCH
  // ==========================================
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!userId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const plantQuery =
          plantId != null && plantId !== "" ? `&plantId=${plantId}` : "";

        const res = await fetch(
          `${API_BASE_URL}/api/audit-schedule/today-work?userId=${userId}&userRole=${userRole}${plantQuery}`,
        );
        const json = await res.json();

        setData(correctedData(json, plantId));
        setLastRefresh(new Date());
      } catch (err) {
        console.error("Today work fetch failed:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, userRole, plantId],
  );

  // ✅ Resolve plant once user is loaded
  useEffect(() => {
    if (!userId) return;

    const existing = (user as any)?.plantId;
    if (existing != null && existing !== "") {
      setPlantId((prev) => (prev == null ? existing : prev));
      return;
    }

    const fetchPlant = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        });
        if (!res.ok) return;
        const data = await res.json();
        const resolved =
          data?.plantId ??
          data?.plant_id ??
          data?.plant?.id ??
          data?.plant?.plantId ??
          null;
        if (resolved != null && resolved !== "") setPlantId(resolved);
      } catch (e) {
        console.warn("Could not resolve plant for today-work:", e);
      }
    };

    fetchPlant();
  }, [userId, (user as any)?.plantId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Reset pagination when filters change
  useEffect(() => {
    setOverdueLimit(PAGE_SIZE);
    setCompletedLimit(PAGE_SIZE);
  }, [searchQuery, yearFilter, deptFilter, filterMode]);

  // ==========================================
  // FILTER OPTIONS (derived from data)
  // ==========================================
  const allItems: TodayWorkItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.overdue || []),
      ...(data.dueToday || []),
      ...(data.completedToday || []),
    ];
  }, [data]);

  // ✅ Available years — derived from actual data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allItems.forEach((item) => {
      const d = parseDateSafe(item.scheduledDate);
      if (d) years.add(d.getFullYear());
    });
    // Always include current year
    years.add(new Date().getFullYear());

    return [
      { label: "All Years", value: "all" },
      ...Array.from(years)
        .sort((a, b) => b - a)
        .map((y) => ({ label: String(y), value: String(y) })),
    ];
  }, [allItems]);

  // ✅ Available departments — derived from actual data
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    allItems.forEach((item) => {
      if (item.department) depts.add(item.department);
    });
    return [
      { label: "All Departments", value: "all" },
      ...Array.from(depts)
        .sort()
        .map((d) => ({ label: d, value: d })),
    ];
  }, [allItems]);

  // ==========================================
  // FILTER LOGIC
  // ==========================================
  const matchesFilters = useCallback(
    (item: TodayWorkItem) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.department?.toLowerCase().includes(q) ||
          item.auditType?.toLowerCase().includes(q) ||
          item.auditorName?.toLowerCase().includes(q) ||
          item.auditeeNames?.some((n) => n.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Year
      if (yearFilter !== "all") {
        const d = parseDateSafe(item.scheduledDate);
        if (!d || String(d.getFullYear()) !== yearFilter) return false;
      }

      // Department
      if (deptFilter !== "all") {
        if (item.department !== deptFilter) return false;
      }

      return true;
    },
    [searchQuery, yearFilter, deptFilter],
  );

  // ==========================================
  // FILTERED + LIMITED ARRAYS
  // ==========================================
  const filteredOverdue = useMemo(
    () => (data?.overdue || []).filter(matchesFilters),
    [data?.overdue, matchesFilters],
  );
  const filteredDueToday = useMemo(
    () => (data?.dueToday || []).filter(matchesFilters),
    [data?.dueToday, matchesFilters],
  );
  const filteredCompleted = useMemo(
    () => (data?.completedToday || []).filter(matchesFilters),
    [data?.completedToday, matchesFilters],
  );

  const visibleOverdue = filteredOverdue.slice(0, overdueLimit);
  const visibleCompleted = filteredCompleted.slice(0, completedLimit);

  const isManager = [
    "AUDIT_MANAGER",
    "TOP_MANAGEMENT",
    "LEAD_AUDITOR",
  ].includes(userRole.toUpperCase());

  const handleItemPress = (item: TodayWorkItem) => {
    onClose?.();
    const role = userRole.toUpperCase();

    if (role === "AUDIT_MANAGER") {
      // ✅ Managers: overdue items → Requests tab
      if (item.category === "OVERDUE" || item.action === "AWAITING_MANAGER") {
        router.push("/(app)/(tabs)/audit-manager?tab=requests" as any);
      } else {
        router.push("/(app)/(tabs)/audit-manager?tab=schedules" as any);
      }
      return;
    }

    if (role === "AUDITOR") {
      router.push("/(app)/(tabs)/auditor?tab=my-audits" as any);
      return;
    }

    if (role === "LEAD_AUDITOR") {
      // Route LA to the right LA tab based on item type
      const cat = (item.category || "").toUpperCase();
      const action = (item.action || "").toUpperCase();

      // Requests / overdue → daily-feasibility (Overdue subtab)
      if (action === "AWAITING_MANAGER" || cat === "OVERDUE") {
        router.push(
          "/(app)/(tabs)/lead-auditor?tab=daily-feasibility&subtab=OVERDUE" as any,
        );
        return;
      }

      // Completed → checksheets-ncrs
      if (cat === "COMPLETED") {
        router.push("/(app)/(tabs)/lead-auditor?tab=checksheets-ncrs" as any);
        return;
      }

      // Due today / upcoming → daily-feasibility
      router.push(
        "/(app)/(tabs)/lead-auditor?tab=daily-feasibility&subtab=PENDING" as any,
      );
      return;
    }

    if (role === "AUDITEE" || role === "HOD") {
      router.push("/(app)/(tabs)/auditee?tab=my-audits" as any);
      return;
    }

    if (role === "TOP_MANAGEMENT") {
      router.push("/(app)/(tabs)/top-management?tab=overview" as any);
      return;
    }

    router.push("/(app)/(tabs)" as any);
  };

  const handleRequestPress = () => {
    onClose?.();
    const role = userRole.toUpperCase();

    if (role === "LEAD_AUDITOR") {
      router.push(
        "/(app)/(tabs)/lead-auditor?tab=daily-feasibility&subtab=OVERDUE" as any,
      );
      return;
    }

    if (role === "AUDIT_MANAGER") {
      router.push("/(app)/(tabs)/audit-manager?tab=requests" as any);
      return;
    }

    if (role === "TOP_MANAGEMENT") {
      router.push("/(app)/(tabs)/top-management?tab=overview" as any);
      return;
    }

    router.push("/(app)/(tabs)" as any);
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading today's work...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={styles.errorText}>Could not load today's work</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showOverdue = filterMode === "all" || filterMode === "overdue";
  const showDueToday = filterMode === "all" || filterMode === "dueToday";
  const showCompleted = filterMode === "all" || filterMode === "completed";

  const hasNoMatches =
    allItems.length > 0 &&
    filteredOverdue.length === 0 &&
    filteredDueToday.length === 0 &&
    filteredCompleted.length === 0;

  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Today's Work</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchData(true)}
        >
          <RefreshCw size={16} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* ===== KPI STRIP ===== */}
      <View style={styles.kpiStrip}>
        <KpiCard
          label="Overdue"
          count={filteredOverdue.length}
          color="#ef4444"
          bgColor="#fef2f2"
          active={filterMode === "overdue"}
          onPress={() =>
            setFilterMode(filterMode === "overdue" ? "all" : "overdue")
          }
        />
        <KpiCard
          label="Due Today"
          count={filteredDueToday.length}
          color="#f59e0b"
          bgColor="#fffbeb"
          active={filterMode === "dueToday"}
          onPress={() =>
            setFilterMode(filterMode === "dueToday" ? "all" : "dueToday")
          }
        />
        <KpiCard
          label="Completed"
          count={filteredCompleted.length}
          color="#10b981"
          bgColor="#ecfdf5"
          active={filterMode === "completed"}
          onPress={() =>
            setFilterMode(filterMode === "completed" ? "all" : "completed")
          }
        />
      </View>

      {/* ===== SEARCH + FILTERS ===== */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ===== FILTER DROPDOWNS ===== */}
      <View style={styles.filtersRow}>
        <FilterDropdown
          label="Year"
          value={yearFilter}
          options={availableYears}
          onChange={setYearFilter}
        />
        <FilterDropdown
          label="Department"
          value={deptFilter}
          options={availableDepartments}
          onChange={setDeptFilter}
        />
        {(yearFilter !== "all" ||
          deptFilter !== "all" ||
          filterMode !== "all" ||
          searchQuery) && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSearchQuery("");
              setYearFilter("all");
              setDeptFilter("all");
              setFilterMode("all");
            }}
          >
            <X size={12} color="#2563eb" />
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ===== CONTENT ===== */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
          />
        }
      >
        {allItems.length === 0 && (
          <View style={styles.emptyState}>
            <CheckCircle size={56} color="#10b981" />
            <Text style={styles.emptyTitle}>Nothing needs your attention</Text>
            <Text style={styles.emptySubtitle}>You're all caught up</Text>
          </View>
        )}

        {hasNoMatches && (
          <View style={styles.emptyState}>
            <Search size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySubtitle}>Try different filters</Text>
          </View>
        )}

        {showOverdue && visibleOverdue.length > 0 && (
          <Section
            title="Overdue"
            count={filteredOverdue.length}
            color="#ef4444"
            bgColor="#fef2f2"
          >
            {visibleOverdue.map((item) => (
              <WorkItemCard
                key={item.scheduleId}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
            {filteredOverdue.length > overdueLimit && (
              <ShowMoreButton
                remaining={filteredOverdue.length - overdueLimit}
                onPress={() => setOverdueLimit(overdueLimit + PAGE_SIZE)}
              />
            )}
          </Section>
        )}

        {isManager && data.counts.pendingRequests > 0 && (
          <Section
            title="Pending Requests"
            count={data.counts.pendingRequests}
            color="#f59e0b"
            bgColor="#fffbeb"
          >
            {data.pendingRequests.map((req) => (
              <RequestCard
                key={`${req.type}-${req.requestId}`}
                request={req}
                onPress={handleRequestPress}
              />
            ))}
          </Section>
        )}

        {showDueToday && filteredDueToday.length > 0 && (
          <Section
            title="Due Today"
            count={filteredDueToday.length}
            color="#f59e0b"
            bgColor="#fffbeb"
          >
            {filteredDueToday.map((item) => (
              <WorkItemCard
                key={item.scheduleId}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </Section>
        )}

        {showCompleted && visibleCompleted.length > 0 && (
          <Section
            title="Completed"
            count={filteredCompleted.length}
            color="#10b981"
            bgColor="#ecfdf5"
          >
            {visibleCompleted.map((item) => (
              <WorkItemCard
                key={item.scheduleId}
                item={item}
                onPress={() => handleItemPress(item)}
                muted
              />
            ))}
            {filteredCompleted.length > completedLimit && (
              <ShowMoreButton
                remaining={filteredCompleted.length - completedLimit}
                onPress={() => setCompletedLimit(completedLimit + PAGE_SIZE)}
              />
            )}
          </Section>
        )}

        <Text style={styles.lastRefresh}>
          Last updated:{" "}
          {lastRefresh.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </ScrollView>
    </View>
  );
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

const KpiCard: React.FC<{
  label: string;
  count: number;
  color: string;
  bgColor: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, count, color, bgColor, active, onPress }) => (
  <TouchableOpacity
    style={[
      styles.kpiCard,
      { backgroundColor: bgColor, borderColor: active ? color : "transparent" },
      active && styles.kpiCardActive,
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.kpiCount, { color }]}>{count}</Text>
    <Text style={[styles.kpiLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const Section: React.FC<{
  title: string;
  count: number;
  color: string;
  bgColor: string;
  children: React.ReactNode;
}> = ({ title, count, color, bgColor, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionCount, { backgroundColor: bgColor }]}>
        <Text style={[styles.sectionCountText, { color }]}>{count}</Text>
      </View>
    </View>
    {children}
  </View>
);

const ShowMoreButton: React.FC<{ remaining: number; onPress: () => void }> = ({
  remaining,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.showMoreBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.showMoreText}>
      Show {Math.min(remaining, PAGE_SIZE)} more ({remaining} remaining)
    </Text>
  </TouchableOpacity>
);

const WorkItemCard: React.FC<{
  item: TodayWorkItem;
  onPress: () => void;
  muted?: boolean;
}> = ({ item, onPress, muted }) => {
  const actionLabel: Record<
    string,
    { text: string; color: string; bg: string }
  > = {
    REQUEST_RESCHEDULE: { text: "Reschedule", color: "#2563eb", bg: "#eff6ff" },
    REQUEST_EXTENSION: { text: "Extend", color: "#2563eb", bg: "#eff6ff" },
    START_AUDIT: { text: "Start Audit", color: "#047857", bg: "#ecfdf5" },
    COMPLETE_AUDIT: { text: "Continue", color: "#1d4ed8", bg: "#eff6ff" },
    AWAITING_MANAGER: {
      text: "Awaiting Manager",
      color: "#92400e",
      bg: "#fffbeb",
    },
    WAIT: { text: "Not Yet Time", color: "#6b7280", bg: "#f3f4f6" },
    MISSED_TODAY: {
      text: "Missed — Reschedule",
      color: "#be123c",
      bg: "#fef2f2",
    },
    VIEW: { text: "View Report", color: "#047857", bg: "#ecfdf5" },
  };
  const action = item.action ? actionLabel[item.action] : null;
  const rs = (item.responseStatus || "").toUpperCase();
  const showStatus = rs === "SUBMITTED" || rs === "APPROVED";

  return (
    <TouchableOpacity
      style={[styles.itemCard, muted && styles.itemCardMuted]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemTopRow}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemDept}>{item.department}</Text>
          {showStatus && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: rs === "APPROVED" ? "#ecfdf5" : "#eff6ff" },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: rs === "APPROVED" ? "#047857" : "#1d4ed8" },
                ]}
              >
                {rs === "APPROVED" ? "Approved" : "Submitted"}
              </Text>
            </View>
          )}
        </View>
        {item.daysOverdue != null && item.daysOverdue > 0 && (
          <View style={styles.daysLateBadge}>
            <Text style={styles.daysLateText}>{item.daysOverdue}d late</Text>
          </View>
        )}
      </View>

      {item.auditType && (
        <Text style={styles.itemAuditType} numberOfLines={1}>
          {item.auditType}
        </Text>
      )}

      <View style={styles.itemMetaRow}>
        {item.scheduledDate && (
          <View style={styles.itemMeta}>
            <Calendar size={11} color="#94a3b8" />
            <Text style={styles.itemMetaText}>{item.scheduledDate}</Text>
          </View>
        )}
        {item.startTime && item.endTime && (
          <View style={styles.itemMeta}>
            <Clock size={11} color="#94a3b8" />
            <Text style={styles.itemMetaText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
        )}
      </View>

      {item.auditorName && (
        <Text style={styles.itemAuditor} numberOfLines={1}>
          By: {item.auditorName}
        </Text>
      )}

      {item.auditeeNames && item.auditeeNames.length > 0 && (
        <Text style={styles.itemAuditees} numberOfLines={1}>
          Auditee: {item.auditeeNames.join(", ")}
        </Text>
      )}

      {action && (
        <View style={[styles.actionRow, { backgroundColor: action.bg }]}>
          <Text style={[styles.actionText, { color: action.color }]}>
            {action.text}
          </Text>
        </View>
      )}

      <ChevronRight
        size={16}
        color="#cbd5e1"
        style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}
      />
    </TouchableOpacity>
  );
};

const RequestCard: React.FC<{
  request: PendingRequest;
  onPress: () => void;
}> = ({ request, onPress }) => (
  <TouchableOpacity
    style={styles.itemCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.itemTopRow}>
      <Text style={styles.itemDept}>{request.department}</Text>
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              request.type === "RESCHEDULE" ? "#fef3c7" : "#dbeafe",
          },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: request.type === "RESCHEDULE" ? "#92400e" : "#1e40af" },
          ]}
        >
          {request.type}
        </Text>
      </View>
    </View>
    <Text style={styles.itemAuditor}>
      From: {request.requestedBy || request.auditorName}
    </Text>
    {request.requestedNewDate && (
      <Text style={styles.itemAuditees}>
        New date: {request.requestedNewDate}
      </Text>
    )}
    {request.reason && (
      <Text style={styles.itemReason} numberOfLines={2}>
        "{request.reason}"
      </Text>
    )}
    <ChevronRight
      size={16}
      color="#cbd5e1"
      style={{ position: "absolute", right: 12, top: "50%", marginTop: -8 }}
    />
  </TouchableOpacity>
);

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: { marginTop: 12, color: "#6b7280" },
  errorText: { marginTop: 12, color: "#ef4444", fontSize: 16 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2563eb",
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  date: { fontSize: 13, color: "#64748b", marginTop: 2 },
  refreshBtn: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  kpiStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  kpiCardActive: { borderWidth: 2 },
  kpiCount: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.2,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", padding: 0 },

  // ✅ Filter row
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: 100,
    maxWidth: 160,
  },
  dropdownTriggerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownSheet: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    paddingTop: 16,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemActive: { backgroundColor: "#eff6ff" },
  dropdownItemText: { fontSize: 14, color: "#334155" },
  dropdownItemTextActive: { color: "#1d4ed8", fontWeight: "600" },

  clearFiltersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  clearFiltersText: { fontSize: 12, fontWeight: "600", color: "#2563eb" },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  sectionCountText: { fontSize: 11, fontWeight: "700" },

  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingRight: 32,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  itemCardMuted: { opacity: 0.85 },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  itemDept: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  itemAuditType: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  itemMetaText: { fontSize: 12, color: "#64748b" },
  itemAuditor: { fontSize: 12, color: "#64748b", marginTop: 2 },
  itemAuditees: { fontSize: 12, color: "#64748b", marginTop: 2 },
  itemReason: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#94a3b8",
    marginTop: 4,
  },

  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  statusBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.2 },
  daysLateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "#fee2e2",
  },
  daysLateText: { fontSize: 10, fontWeight: "700", color: "#991b1b" },

  actionRow: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionText: { fontSize: 11, fontWeight: "600" },

  showMoreBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    marginTop: 4,
  },
  showMoreText: { fontSize: 12, fontWeight: "600", color: "#2563eb" },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  lastRefresh: {
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 20,
    marginBottom: 8,
  },
});
