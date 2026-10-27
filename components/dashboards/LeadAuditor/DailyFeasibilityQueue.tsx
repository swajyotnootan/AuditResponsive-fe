// app/components/dashboards/LeadAuditor/DailyFeasibilityQueue.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Search,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { OutlineButton } from "./OverdueModals";
import OverdueScheduleQueue from "./OverdueScheduleQueue";

// ════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  headerBg: "#F8FAFC",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
  chipBg: "#EFF6FF",
  chipBorder: "#BFDBFE",
  chipText: "#1E40AF",
};

// ═════ TABLE COLUMN CONFIG ═════
const COLUMN_MIN_WIDTHS = {
  date: 150,
  dept: 150,
  elements: 180,
  team: 220,
  status: 140,
  actions: 200,
};
const TABLE_MIN_WIDTH = Object.values(COLUMN_MIN_WIDTHS).reduce(
  (a, b) => a + b,
  0,
);

const COLUMN_FLEX = {
  date: 1.1,
  dept: 1.2,
  elements: 1.6,
  team: 2.0,
  status: 1.1,
  actions: 1.8,
};

// ─────────────────────────────────────────────────────────────
// DTOs & TYPES
// ─────────────────────────────────────────────────────────────
export interface DailyScheduleDto {
  id: number;
  planYear: number;
  month: string;
  department: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  auditorId?: number;
  auditorName?: string;
  coAuditorIds?: string;
  coAuditorIdList?: number[];
  coAuditorNames?: string[];
  auditeeId?: number;
  auditeeName?: string;
  auditeeIds?: string;
  auditeeIdList?: number[];
  auditeeNames?: string[];
  auditees?: string[];
  auditElements?: string[];
  detailedApprovalStatus?: string;
  auditType?: string;
  plantId?: number;
  plantName?: string;

  status?: string;
  rescheduleRequested?: boolean;
  extensionRequested?: boolean;
  requestedNewDate?: string;
  requestedNewStartTime?: string;
  requestedNewEndTime?: string;
  requestedNewToDate?: string;
  rescheduleReason?: string;
  extensionReason?: string;
  toDate?: string;

  leadAuditorId?: number;
  leadAuditorName?: string;

  hasWorkStarted?: boolean;
  workStartedAt?: string;
  completedForms?: number;
  totalForms?: number;
  pendingForms?: number;
}

interface ScheduleUser {
  id: number;
  firstName: string;
  lastName: string;
  role?: string;
  department?: string;
  plantId?: number;
}

interface DayGroup {
  date: string;
  schedules: DailyScheduleDto[];
}

interface MonthGroup {
  month: string;
  year: number;
  days: DayGroup[];
  total: number;
}

interface WeekTeamInfo {
  teamAuditorIds: number[];
  teamAuditorNames: string[];
  auditeeIds: number[];
  auditeeNames: string[];
}

interface ConflictInfo {
  type: "AUDITOR" | "AUDITEE";
  id: number;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
}

interface Props {
  selectedYear: number;
  onNavigateToForm5?: (year: number, month: string) => void;
  initialStatusTab?: StatusTab;
}

type StatusTab = "PENDING" | "CONFIRMED" | "REJECTED" | "OVERDUE";

const monthOrder = (m: string) => {
  const order = [
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
  return order.indexOf(m);
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const extractData = (response: any) => {
  if (Array.isArray(response)) return response;
  return response?.data !== undefined ? response.data : response;
};

const toNumArray = (raw: any): number[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = value
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  if (!Array.isArray(value)) value = [value];
  return value
    .flat(1)
    .map((v: any) => Number(v))
    .filter((n: number) => !Number.isNaN(n));
};

const normalizeNames = (raw: any): string[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [value];
    }
  }
  if (!Array.isArray(value)) return [String(value)];
  return value
    .flat(1)
    .map((v: any) => (typeof v === "string" ? v : String(v)))
    .filter((v) => v.length > 0);
};

const getWeekNumber = (dateStr: string): string => {
  if (!dateStr) return "W-1";
  const date = new Date(dateStr);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  let weekNum = Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  if (weekNum < 1) weekNum = 1;
  if (weekNum > 6) weekNum = 6;
  return `W-${weekNum}`;
};

const convertToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  if (!time) return 0;
  let [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const timeRangesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean => {
  const a1 = convertToMinutes(startA);
  const a2 = convertToMinutes(endA);
  const b1 = convertToMinutes(startB);
  const b2 = convertToMinutes(endB);
  if (a2 === 0 || b2 === 0) return false;
  return a1 < b2 && a2 > b1;
};

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

// ─────────────────────────────────────────────────────────────
// OVERDUE CHECK
// ─────────────────────────────────────────────────────────────
const hasEnded = (s: any): boolean => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const scheduled = String(s.scheduledDate || "").slice(0, 10);

  if (s.toDate) {
    const toStr = String(s.toDate).slice(0, 10);
    if (toStr > todayStr) return false;
    if (toStr < todayStr) return true;
  }

  if (scheduled && scheduled < todayStr) return true;
  if (scheduled && scheduled > todayStr) return false;

  if (scheduled === todayStr) {
    const raw = String(s.endTime || "").trim();
    if (!raw) return false;
    const m = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    const mod = (m[3] || "").toUpperCase();
    if (mod === "PM" && h !== 12) h += 12;
    if (mod === "AM" && h === 12) h = 0;
    const nowM = now.getHours() * 60 + now.getMinutes();
    return nowM >= h * 60 + mi + 1;
  }

  return false;
};

// ─────────────────────────────────────────────────────────────
// MULTI-SELECT MODAL
// ─────────────────────────────────────────────────────────────
const MultiSelectModal = ({
  isOpen,
  onClose,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  emptyMsg,
  title,
  loading,
}: any) => {
  const [search, setSearch] = useState("");
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((opt: any) =>
    `${opt.firstName} ${opt.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            padding: 16,
          }}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "95%",
              maxWidth: 440,
              backgroundColor: COLORS.card,
              borderRadius: 16,
              overflow: "hidden",
              maxHeight: "85%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: COLORS.text,
                  }}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: COLORS.textMuted,
                  }}
                >
                  {selectedIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.borderSubtle,
                backgroundColor: COLORS.headerBg,
              }}
            >
              <Search size={16} color={COLORS.textMuted} />
              <TextInput
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 13,
                  color: COLORS.text,
                }}
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>

            {safeOptions.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  padding: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.borderSubtle,
                }}
              >
                <View style={{ flex: 1 }}>
                  <OutlineButton
                    title="Select All"
                    onPress={onSelectAll}
                    variant="primary"
                    size="sm"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <OutlineButton
                    title="Clear All"
                    onPress={onClearAll}
                    variant="primary"
                    size="sm"
                  />
                </View>
              </View>
            )}

            <ScrollView
              style={{ width: "100%" }}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: COLORS.textMuted,
                    }}
                  >
                    Loading...
                  </Text>
                </View>
              ) : filteredOptions.length === 0 ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    {emptyMsg}
                  </Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = item.id.toString();
                  const checked = selectedIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => onToggle(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.borderSubtle,
                        backgroundColor: checked ? COLORS.primaryLight : "#FFF",
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: checked ? COLORS.primary : "#CBD5E1",
                          backgroundColor: checked ? COLORS.primary : "#FFF",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checked && <Check size={12} color="#FFF" />}
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: checked ? "600" : "500",
                          color: checked ? COLORS.primaryDark : COLORS.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.firstName} {item.lastName}
                        {item.role === "HOD" ? " (HOD)" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: COLORS.borderSubtle,
                backgroundColor: COLORS.headerBg,
              }}
            >
              <OutlineButton
                title="Close"
                onPress={onClose}
                variant="primary"
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const DailyFeasibilityQueue: React.FC<Props> = ({
  selectedYear,
  initialStatusTab,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [statusTab, setStatusTab] = useState<StatusTab>(
    initialStatusTab ?? "PENDING",
  );
  const [schedules, setSchedules] = useState<DailyScheduleDto[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [detailSchedule, setDetailSchedule] = useState<DailyScheduleDto | null>(
    null,
  );
  const [confirmSchedule, setConfirmSchedule] =
    useState<DailyScheduleDto | null>(null);
  const [comments, setComments] = useState("");
  const [rejectSchedule, setRejectSchedule] = useState<DailyScheduleDto | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  const [bulkConfirmMonth, setBulkConfirmMonth] = useState<MonthGroup | null>(
    null,
  );
  const [bulkRejectMonth, setBulkRejectMonth] = useState<MonthGroup | null>(
    null,
  );
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const [overdueCount, setOverdueCount] = useState(0);

  const [reassignSchedule, setReassignSchedule] =
    useState<DailyScheduleDto | null>(null);
  const [newPrimaryAuditorId, setNewPrimaryAuditorId] = useState<number | null>(
    null,
  );
  const [newCoAuditorIds, setNewCoAuditorIds] = useState<number[]>([]);
  const [newAuditeeIds, setNewAuditeeIds] = useState<number[]>([]);
  const [reassignConflictMsg, setReassignConflictMsg] = useState<string | null>(
    null,
  );

  const [localConflicts, setLocalConflicts] = useState<ConflictInfo[]>([]);
  const [daySchedulesCache, setDaySchedulesCache] = useState<
    DailyScheduleDto[]
  >([]);
  const [loadingDaySchedules, setLoadingDaySchedules] = useState(false);

  const [fullyCompetentAuditors, setFullyCompetentAuditors] = useState<
    ScheduleUser[]
  >([]);
  const [departmentAuditees, setDepartmentAuditees] = useState<ScheduleUser[]>(
    [],
  );
  const [loadingCompetent, setLoadingCompetent] = useState(false);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAuditeeModal, setShowAuditeeModal] = useState(false);

  const fetchOverdueCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/overdue-schedules/${selectedYear}`,
        { params: { userId: user.id } },
      );
      const raw = Array.isArray(res.data) ? res.data : [];
      const ended = raw.filter((s: any) => hasEnded(s));
      setOverdueCount(ended.length);
    } catch (err) {
      console.error("Failed to fetch overdue count:", err);
    }
  }, [selectedYear, user?.id]);

  const fetchPending = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/daily-feasibility-queue/${selectedYear}`,
        { params: { userId: user.id } },
      );
      const raw = Array.isArray(res.data) ? res.data : [];

      const data: DailyScheduleDto[] = raw.map((row: any) => {
        const coIds = toNumArray(row.coAuditorIdList ?? row.coAuditorIds);
        const coNames = normalizeNames(row.coAuditorNames);
        const audIds = toNumArray(row.auditeeIdList ?? row.auditeeIds);
        const audNames = normalizeNames(row.auditeeNames);

        return {
          ...row,
          coAuditorIdList: coIds,
          coAuditorNames: coNames,
          auditeeIdList: audIds,
          auditeeNames: audNames,
          plantId: row.plantId ?? (user as any)?.plantId,
        } as DailyScheduleDto;
      });

      setSchedules(data);
      if (data.length > 0) {
        setExpandedMonths(new Set([data[0].month]));
      }
    } catch (error: any) {
      console.error("Failed to fetch daily feasibility queue:", error);
      addToast("Failed to load daily feasibility queue", "error");
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, addToast, user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPending();
    fetchOverdueCount();
  }, [fetchPending, fetchOverdueCount]);

  useEffect(() => {
    if (initialStatusTab) {
      setStatusTab(initialStatusTab);
    }
  }, [initialStatusTab]);

  const byStatus = useMemo(() => {
    const pending: DailyScheduleDto[] = [];
    const confirmed: DailyScheduleDto[] = [];
    const rejected: DailyScheduleDto[] = [];

    for (const s of schedules) {
      const st = (s.detailedApprovalStatus || "").toUpperCase();
      if (st === "PENDING_LA_CONFIRMATION") pending.push(s);
      else if (
        st === "CONFIRMED_BY_LA" ||
        st === "APPROVED" ||
        st === "REJECTED"
      )
        confirmed.push(s);
      else if (st === "FEASIBILITY_REJECTED") rejected.push(s);
    }
    return { pending, confirmed, rejected };
  }, [schedules]);

  const visibleSchedules = useMemo(() => {
    if (statusTab === "PENDING") return byStatus.pending;
    if (statusTab === "CONFIRMED") return byStatus.confirmed;
    if (statusTab === "REJECTED") return byStatus.rejected;
    return [];
  }, [statusTab, byStatus]);

  const groupedByMonth: MonthGroup[] = useMemo(() => {
    const monthMap = new Map<string, Map<string, DailyScheduleDto[]>>();
    for (const s of visibleSchedules) {
      const dateKey = s.scheduledDate || "unknown";
      if (!monthMap.has(s.month)) monthMap.set(s.month, new Map());
      const dayMap = monthMap.get(s.month)!;
      if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
      dayMap.get(dateKey)!.push(s);
    }

    const groups: MonthGroup[] = [];
    for (const [month, dayMap] of monthMap.entries()) {
      const days: DayGroup[] = Array.from(dayMap.entries())
        .map(([date, list]) => ({ date, schedules: list }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const total = days.reduce((sum, d) => sum + d.schedules.length, 0);
      groups.push({
        month,
        year: days[0]?.schedules[0]?.planYear || selectedYear,
        days,
        total,
      });
    }
    return groups.sort((a, b) => monthOrder(a.month) - monthOrder(b.month));
  }, [visibleSchedules, selectedYear]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  // ─────────── Confirm/Reject ───────────
  const handleConfirmSingle = async () => {
    if (!confirmSchedule || !user?.id) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/daily-schedule/${confirmSchedule.id}/confirm-feasibility?userId=${user.id}`,
        { comments: comments || "" },
        {},
      );
      addToast(
        `Confirmed: ${confirmSchedule.department} (${confirmSchedule.scheduledDate})`,
        "success",
      );
      setConfirmSchedule(null);
      setComments("");
      fetchPending();
    } catch (error: any) {
      addToast(error.response?.data?.message || "Failed to confirm", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSingle = async () => {
    if (!rejectSchedule || !user?.id) return;
    if (!rejectReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/daily-schedule/${rejectSchedule.id}/reject-feasibility?userId=${user.id}`,
        { reason: rejectReason },
        {},
      );
      addToast(
        `Rejected: ${rejectSchedule.department} (${rejectSchedule.scheduledDate})`,
        "warning",
      );
      setRejectSchedule(null);
      setRejectReason("");
      fetchPending();
    } catch (error: any) {
      addToast(error.response?.data?.message || "Failed to reject", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkConfirmMonth = async () => {
    if (!bulkConfirmMonth || !user?.id) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/detailed/${bulkConfirmMonth.year}/${bulkConfirmMonth.month}/confirm-feasibility?userId=${user.id}`,
        { comments: "" },
        {},
      );
      addToast(
        `All daily schedules confirmed for ${bulkConfirmMonth.month} ${bulkConfirmMonth.year}`,
        "success",
      );
      setBulkConfirmMonth(null);
      fetchPending();
    } catch (error: any) {
      addToast(
        error.response?.data?.message ||
          "Failed to confirm (check that all items are still PENDING_LA_CONFIRMATION)",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkRejectMonth = async () => {
    if (!bulkRejectMonth || !user?.id) return;
    if (!bulkRejectReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/detailed/${bulkRejectMonth.year}/${bulkRejectMonth.month}/reject-feasibility?userId=${user.id}`,
        { reason: bulkRejectReason },
        {},
      );
      addToast(
        `All daily schedules rejected for ${bulkRejectMonth.month} ${bulkRejectMonth.year}`,
        "warning",
      );
      setBulkRejectMonth(null);
      setBulkRejectReason("");
      fetchPending();
    } catch (error: any) {
      addToast(error.response?.data?.message || "Failed to reject", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchWeekTeamForDailySchedule = useCallback(
    async (schedule: DailyScheduleDto): Promise<WeekTeamInfo> => {
      const empty: WeekTeamInfo = {
        teamAuditorIds: [],
        teamAuditorNames: [],
        auditeeIds: [],
        auditeeNames: [],
      };
      if (!user?.id) return empty;

      const weekNum = getWeekNumber(schedule.scheduledDate || "");
      const month = schedule.month;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/year/${selectedYear}/month/${month}`,
          { params: { userId: user.id } },
        );
        const raw = extractData(res);
        const weekSchedules: any[] = Array.isArray(raw) ? raw : [];

        const matched = weekSchedules.find(
          (s: any) =>
            s.department === schedule.department &&
            (s.week || "") === weekNum &&
            s.approvalStatus === "APPROVED",
        );
        if (!matched) return empty;

        let teamIds: number[] = [];
        if (matched.teamAuditorIds)
          teamIds = toNumArray(matched.teamAuditorIds);
        if (teamIds.length === 0 && matched.coAuditorIds)
          teamIds = toNumArray(matched.coAuditorIds);

        const primaryId = matched.auditorId ?? matched.leadAuditorId ?? null;
        if (primaryId != null) {
          const pid = Number(primaryId);
          if (!isNaN(pid) && !teamIds.includes(pid)) teamIds.unshift(pid);
        }

        let teamNames: string[] = [];
        if (matched.coAuditorNames)
          teamNames = normalizeNames(matched.coAuditorNames);
        if (teamNames.length === 0 && matched.teamAuditorNames)
          teamNames = normalizeNames(matched.teamAuditorNames);
        const primaryName =
          matched.auditorName ?? matched.leadAuditorName ?? null;
        if (
          primaryName &&
          typeof primaryName === "string" &&
          primaryName.trim() &&
          !teamNames.includes(primaryName.trim())
        ) {
          teamNames.unshift(primaryName.trim());
        }

        let audIds: number[] = [];
        if (matched.auditeeIds) audIds = toNumArray(matched.auditeeIds);
        else if (matched.auditeeIdList)
          audIds = toNumArray(matched.auditeeIdList);

        let audNames: string[] = [];
        if (matched.auditeeNames)
          audNames = normalizeNames(matched.auditeeNames);

        return {
          teamAuditorIds: teamIds,
          teamAuditorNames: teamNames,
          auditeeIds: audIds,
          auditeeNames: audNames,
        };
      } catch (err) {
        console.error("❌ [fetchWeekTeam] failed:", err);
        return empty;
      }
    },
    [user, selectedYear],
  );

  const fetchDaySchedules = useCallback(
    async (dateStr: string, month: string) => {
      if (!dateStr || !month || !user?.id) {
        setDaySchedulesCache([]);
        return;
      }
      setLoadingDaySchedules(true);
      try {
        const url = `${API_BASE_URL}/api/audit-schedule/date-schedules/${selectedYear}/${month}?userId=${user.id}`;
        const res = await axios.get(url, {});
        const raw = extractData(res);
        const list = Array.isArray(raw) ? raw : [];

        const normalized: DailyScheduleDto[] = list.map((row: any) => ({
          ...row,
          coAuditorIdList: toNumArray(row.coAuditorIdList ?? row.coAuditorIds),
          coAuditorNames: normalizeNames(row.coAuditorNames),
          auditeeIdList: toNumArray(row.auditeeIdList ?? row.auditeeIds),
          auditeeNames: normalizeNames(row.auditeeNames),
        }));

        const sameDay = normalized.filter(
          (s: any) => s.scheduledDate === dateStr,
        );
        setDaySchedulesCache(sameDay);
      } catch (err) {
        console.error("❌ fetchDaySchedules failed:", err);
        const fallback = schedules.filter((s) => s.scheduledDate === dateStr);
        setDaySchedulesCache(fallback);
      } finally {
        setLoadingDaySchedules(false);
      }
    },
    [user, selectedYear, schedules],
  );

  const computeLocalConflicts = useCallback(
    (
      primaryAuditorId: number | null,
      coAuditorIds: number[],
      auditeeIds: number[],
      schedule: DailyScheduleDto,
      daySchedules: DailyScheduleDto[],
    ): ConflictInfo[] => {
      const conflicts: ConflictInfo[] = [];
      if (!schedule.scheduledDate || !schedule.startTime || !schedule.endTime)
        return conflicts;

      const myDate = schedule.scheduledDate;
      const myStart = schedule.startTime;
      const myEnd = schedule.endTime;

      const allAuditorIds = new Set<number>();
      if (primaryAuditorId != null) allAuditorIds.add(primaryAuditorId);
      for (const id of coAuditorIds) allAuditorIds.add(id);

      for (const other of daySchedules) {
        if (other.id === schedule.id) continue;
        if (other.scheduledDate !== myDate) continue;
        if (!other.startTime || !other.endTime) continue;

        const otherIsLunch =
          (other as any).isSpecialEvent &&
          (other as any).specialEventType === "LUNCH";
        if (otherIsLunch) continue;

        const overlaps = timeRangesOverlap(
          myStart,
          myEnd,
          other.startTime,
          other.endTime,
        );
        if (!overlaps) continue;

        const otherAuditorIds = new Set<number>();
        if (other.auditorId != null)
          otherAuditorIds.add(Number(other.auditorId));
        for (const id of other.coAuditorIdList || [])
          otherAuditorIds.add(Number(id));

        for (const myAuditorId of allAuditorIds) {
          if (otherAuditorIds.has(myAuditorId)) {
            let name = `Auditor ${myAuditorId}`;
            const match = fullyCompetentAuditors.find(
              (a) => Number(a.id) === myAuditorId,
            );
            if (match) name = `${match.firstName} ${match.lastName}`;
            conflicts.push({
              type: "AUDITOR",
              id: myAuditorId,
              name,
              department: other.department,
              startTime: other.startTime,
              endTime: other.endTime,
            });
          }
        }

        const otherAuditeeIds = new Set<number>();
        if (other.auditeeId != null)
          otherAuditeeIds.add(Number(other.auditeeId));
        for (const id of other.auditeeIdList || [])
          otherAuditeeIds.add(Number(id));

        for (const myAuditeeId of auditeeIds) {
          if (otherAuditeeIds.has(myAuditeeId)) {
            const match = departmentAuditees.find(
              (a) => Number(a.id) === myAuditeeId,
            );
            const name = match
              ? `${match.firstName} ${match.lastName}`
              : `Auditee ${myAuditeeId}`;
            conflicts.push({
              type: "AUDITEE",
              id: myAuditeeId,
              name,
              department: other.department,
              startTime: other.startTime,
              endTime: other.endTime,
            });
          }
        }
      }

      const seen = new Set<string>();
      return conflicts.filter((c) => {
        const key = `${c.type}-${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [fullyCompetentAuditors, departmentAuditees],
  );

  useEffect(() => {
    if (!reassignSchedule) {
      setLocalConflicts([]);
      return;
    }
    const conflicts = computeLocalConflicts(
      newPrimaryAuditorId,
      newCoAuditorIds,
      newAuditeeIds,
      reassignSchedule,
      daySchedulesCache,
    );
    setLocalConflicts(conflicts);
  }, [
    reassignSchedule,
    newPrimaryAuditorId,
    newCoAuditorIds,
    newAuditeeIds,
    daySchedulesCache,
    computeLocalConflicts,
  ]);

  const openReassign = async (s: DailyScheduleDto) => {
    setReassignSchedule(s);
    setReassignConflictMsg(null);
    setLocalConflicts([]);

    const rawCoIds = (s as any).coAuditorIdList ?? (s as any).coAuditorIds;
    const coIds = toNumArray(rawCoIds).filter((id) => id !== s.auditorId);
    setNewPrimaryAuditorId(s.auditorId ?? null);
    setNewCoAuditorIds(coIds);

    const rawAudIds =
      (s as any).auditeeIdList ??
      (s as any).auditeeIds ??
      (s.auditeeId ? [s.auditeeId] : []);
    setNewAuditeeIds(toNumArray(rawAudIds));

    setFullyCompetentAuditors([]);
    setDepartmentAuditees([]);
    setDaySchedulesCache([]);

    const plantId = (s as any).plantId ?? (user as any)?.plantId ?? null;
    const dept = s.department;
    const elements: string[] = Array.isArray(s.auditElements)
      ? s.auditElements
      : [];

    if (!plantId || !dept) {
      addToast(
        "Schedule is missing plant/department — cannot load reassignment options",
        "error",
      );
      return;
    }

    const enumDept = departmentDisplayToEnum[dept] || dept;

    if (s.scheduledDate && s.month) {
      fetchDaySchedules(s.scheduledDate, s.month);
    }
    try {
      const weekTeam = await fetchWeekTeamForDailySchedule(s);

      setLoadingCompetent(true);
      try {
        if (weekTeam.teamAuditorIds.length > 0) {
          const usersRes = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/users/by-ids`,
            {
              params: { ids: weekTeam.teamAuditorIds },
              paramsSerializer: { indexes: null },
            },
          );
          const users = extractData(usersRes) || [];
          const byId = new Map<number, ScheduleUser>();
          for (const u of users) byId.set(Number((u as any).id), u);

          const ordered: ScheduleUser[] = [];
          for (const id of weekTeam.teamAuditorIds) {
            const u = byId.get(id);
            if (u) ordered.push(u);
            else {
              const name =
                weekTeam.teamAuditorNames[
                  weekTeam.teamAuditorIds.indexOf(id)
                ] || `Auditor ${id}`;
              const parts = name.trim().split(/\s+/);
              ordered.push({
                id,
                firstName: parts[0] || "Auditor",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITOR",
              });
            }
          }
          setFullyCompetentAuditors(ordered);
        } else {
          const res = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/fully-competent-auditors/for-schedule`,
            {
              params: {
                department: enumDept,
                auditElements: elements,
                planYear: selectedYear,
                month: s.month,
                plantId: plantId,
              },
              paramsSerializer: { indexes: null },
            },
          );
          const raw = extractData(res);
          const list = (Array.isArray(raw) ? raw : []).filter(
            (a: any) => a.role === "AUDITOR" || a.role === "LEAD_AUDITOR",
          );
          setFullyCompetentAuditors(list);
        }
      } catch (err) {
        console.warn("Auditor fetch failed:", err);
        setFullyCompetentAuditors([]);
      } finally {
        setLoadingCompetent(false);
      }

      setLoadingDepartmentUsers(true);
      try {
        if (weekTeam.auditeeIds.length > 0) {
          const usersRes = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/users/by-ids`,
            {
              params: { ids: weekTeam.auditeeIds },
              paramsSerializer: { indexes: null },
            },
          );
          const users = extractData(usersRes) || [];
          const byId = new Map<number, ScheduleUser>();
          for (const u of users) byId.set(Number((u as any).id), u);

          const ordered: ScheduleUser[] = [];
          for (const id of weekTeam.auditeeIds) {
            const u = byId.get(id);
            if (u) ordered.push(u);
            else {
              const name =
                weekTeam.auditeeNames[weekTeam.auditeeIds.indexOf(id)] ||
                `Auditee ${id}`;
              const parts = name.trim().split(/\s+/);
              ordered.push({
                id,
                firstName: parts[0] || "Auditee",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITEE",
              });
            }
          }
          setDepartmentAuditees(ordered);
        } else {
          let auditeesRes;
          if (elements.length > 0) {
            auditeesRes = await axios.get(
              `${API_BASE_URL}/api/audit-schedule/competent-auditees/by-department/${encodeURIComponent(enumDept)}`,
              {
                params: {
                  plantId: plantId,
                  auditElementsJson: JSON.stringify(elements),
                },
              },
            );
          } else {
            auditeesRes = await axios.get(
              `${API_BASE_URL}/api/audit-schedule/auditees/by-department/${encodeURIComponent(enumDept)}`,
              { params: { plantId } },
            );
          }
          const raw = extractData(auditeesRes);
          setDepartmentAuditees(Array.isArray(raw) ? raw : []);
        }
      } catch (err) {
        console.warn("Auditee fetch failed:", err);
        setDepartmentAuditees([]);
      } finally {
        setLoadingDepartmentUsers(false);
      }
    } catch (err) {
      console.error("Failed to load reassign options:", err);
      addToast("Failed to load reassignment options", "error");
    }
  };

  const toggleCoAuditor = (auditor: ScheduleUser) => {
    const id = Number(auditor.id);
    if (id === newPrimaryAuditorId) return;
    setNewCoAuditorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAuditee = (auditee: ScheduleUser) => {
    const id = Number(auditee.id);
    setNewAuditeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllCoAuditors = () => {
    setNewCoAuditorIds(
      fullyCompetentAuditors
        .map((a) => Number(a.id))
        .filter((id) => id !== newPrimaryAuditorId),
    );
  };

  const selectAllAuditees = () => {
    setNewAuditeeIds(departmentAuditees.map((a) => Number(a.id)));
  };

  const handleReassign = async () => {
    if (!reassignSchedule || !user?.id) return;
    if (!newPrimaryAuditorId) {
      addToast("Please select a primary auditor", "error");
      return;
    }
    if (localConflicts.length > 0) {
      const msg = localConflicts.map((c) => `${c.type}: ${c.name}`).join(", ");
      addToast(`Cannot reassign — conflicts: ${msg}`, "error");
      return;
    }

    setSubmitting(true);
    setReassignConflictMsg(null);

    try {
      const checkRes = await axios.post(
        `${API_BASE_URL}/api/audit-schedule/schedule/${reassignSchedule.id}/check-reassign-conflicts`,
        {
          auditorId: newPrimaryAuditorId,
          auditeeIds: newAuditeeIds,
        },
        {},
      );

      if (checkRes.data?.hasConflict) {
        const conflicts = checkRes.data.conflicts || [];
        const msg = conflicts
          .map((c: any) => `${c.type}: ${c.name}`)
          .join(", ");
        setReassignConflictMsg(
          `❌ Conflict — already scheduled at this time: ${msg}`,
        );
        return;
      }

      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/schedule/${reassignSchedule.id}/reassign?userId=${user.id}`,
        {
          auditorId: newPrimaryAuditorId,
          coAuditorIds: newCoAuditorIds,
          auditeeIds: newAuditeeIds,
        },
        {},
      );

      addToast("Schedule reassigned successfully", "success");
      setReassignSchedule(null);
      setReassignConflictMsg(null);
      setLocalConflicts([]);
      fetchPending();
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to reassign";
      if (typeof msg === "string" && msg.includes("already scheduled")) {
        setReassignConflictMsg(`❌ ${msg}`);
      } else {
        addToast(msg, "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status badge renderer ──────────────────────────────────
  const renderStatusBadges = (status: string) => {
    const st = status.toUpperCase();
    const badges: {
      icon: any;
      label: string;
      bg: string;
      bd: string;
      tc: string;
    }[] = [];

    if (st === "PENDING_LA_CONFIRMATION") {
      badges.push({
        icon: Clock,
        label: "Pending",
        bg: COLORS.primaryLight,
        bd: COLORS.primaryBorder,
        tc: COLORS.primaryDark,
      });
    }
    if (st === "CONFIRMED_BY_LA") {
      badges.push({
        icon: Check,
        label: "Confirmed by LA",
        bg: COLORS.stateSuccessBg,
        bd: COLORS.primaryBorder,
        tc: COLORS.primaryDark,
      });
      badges.push({
        icon: AlertCircle,
        label: "Awaiting TM",
        bg: COLORS.stateWarningBg,
        bd: COLORS.border,
        tc: COLORS.textMuted,
      });
    }
    if (st === "APPROVED") {
      badges.push({
        icon: Check,
        label: "Confirmed by LA",
        bg: COLORS.stateSuccessBg,
        bd: COLORS.primaryBorder,
        tc: COLORS.primaryDark,
      });
      badges.push({
        icon: Check,
        label: "TM Approved",
        bg: "#DBEAFE",
        bd: "#93C5FD",
        tc: COLORS.primaryDark,
      });
    }
    if (st === "REJECTED") {
      badges.push({
        icon: Check,
        label: "Confirmed by LA",
        bg: COLORS.stateSuccessBg,
        bd: COLORS.primaryBorder,
        tc: COLORS.primaryDark,
      });
      badges.push({
        icon: X,
        label: "TM Rejected",
        bg: COLORS.stateErrorBg,
        bd: COLORS.border,
        tc: COLORS.stateErrorText,
      });
    }
    if (st === "FEASIBILITY_REJECTED") {
      badges.push({
        icon: X,
        label: "Rejected",
        bg: COLORS.stateErrorBg,
        bd: COLORS.border,
        tc: COLORS.stateErrorText,
      });
    }

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {badges.map((b, i) => {
          const Icon = b.icon;
          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: b.bd,
                backgroundColor: b.bg,
              }}
            >
              <Icon size={9} color={b.tc} />
              <Text
                style={{ fontSize: 9, fontWeight: "700", color: b.tc }}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Table Header ───────────────────────────────────────────
  const renderTableHeader = () => (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        backgroundColor: COLORS.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <HeaderCell
        flex={COLUMN_FLEX.date}
        minWidth={COLUMN_MIN_WIDTHS.date}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.date}
        label="Date / Time"
      />
      <HeaderCell
        flex={COLUMN_FLEX.dept}
        minWidth={COLUMN_MIN_WIDTHS.dept}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.dept}
        label="Audit Area"
      />
      <HeaderCell
        flex={COLUMN_FLEX.elements}
        minWidth={COLUMN_MIN_WIDTHS.elements}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.elements}
        label="Audit Elements"
      />
      <HeaderCell
        flex={COLUMN_FLEX.team}
        minWidth={COLUMN_MIN_WIDTHS.team}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.team}
        label="Team & Auditees"
      />
      <HeaderCell
        flex={COLUMN_FLEX.status}
        minWidth={COLUMN_MIN_WIDTHS.status}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.status}
        label="Status"
      />
      <HeaderCell
        flex={COLUMN_FLEX.actions}
        minWidth={COLUMN_MIN_WIDTHS.actions}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.actions}
        label="Actions"
        last
      />
    </View>
  );

  // ─── Table Row ──────────────────────────────────────────────
  const renderScheduleRow = (s: DailyScheduleDto) => {
    const status = (s.detailedApprovalStatus || "").toUpperCase();
    const isPending = status === "PENDING_LA_CONFIRMATION";
    const isConfirmed =
      status === "CONFIRMED_BY_LA" ||
      status === "APPROVED" ||
      status === "REJECTED";
    const isRejected = status === "FEASIBILITY_REJECTED";

    const teamNames = normalizeNames(s.coAuditorNames);
    const primary = s.auditorName ? [s.auditorName] : [];
    const auditorDisplay = [...primary, ...teamNames].join(", ") || "—";
    const auditeeDisplay =
      normalizeNames(s.auditeeNames).join(", ") || s.auditeeName || "—";
    const auditElementsDisplay =
      normalizeNames(s.auditElements).join(", ") || "—";

    return (
      <View
        key={s.id}
        style={{
          flexDirection: "row",
          width: "100%",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderSubtle,
          backgroundColor: COLORS.card,
        }}
      >
        {/* Date / Time */}
        <BodyCell
          flex={COLUMN_FLEX.date}
          minWidth={COLUMN_MIN_WIDTHS.date}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.date}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.text }}>
            {s.scheduledDate || "—"}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
            {s.startTime || "—"} – {s.endTime || "—"}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
            {s.auditType || "—"}
          </Text>
        </BodyCell>

        {/* Audit Area */}
        <BodyCell
          flex={COLUMN_FLEX.dept}
          minWidth={COLUMN_MIN_WIDTHS.dept}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.dept}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}
            numberOfLines={2}
          >
            {s.department}
          </Text>
        </BodyCell>

        {/* Audit Elements */}
        <BodyCell
          flex={COLUMN_FLEX.elements}
          minWidth={COLUMN_MIN_WIDTHS.elements}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.elements}
        >
          <Text
            style={{ fontSize: 12, color: COLORS.textValue }}
            numberOfLines={3}
          >
            {auditElementsDisplay}
          </Text>
        </BodyCell>

        {/* Team & Auditees */}
        <BodyCell
          flex={COLUMN_FLEX.team}
          minWidth={COLUMN_MIN_WIDTHS.team}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.team}
        >
          <Text
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              fontWeight: "600",
            }}
          >
            Auditor
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.text,
              marginTop: 1,
              fontWeight: "500",
            }}
            numberOfLines={2}
          >
            {auditorDisplay}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              fontWeight: "600",
              marginTop: 6,
            }}
          >
            Auditees
          </Text>
          <Text
            style={{ fontSize: 12, color: COLORS.textValue, marginTop: 1 }}
            numberOfLines={2}
          >
            {auditeeDisplay}
          </Text>
        </BodyCell>

        {/* Status */}
        <BodyCell
          flex={COLUMN_FLEX.status}
          minWidth={COLUMN_MIN_WIDTHS.status}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.status}
        >
          {renderStatusBadges(status)}
        </BodyCell>

        {/* Actions */}
        <BodyCell
          flex={COLUMN_FLEX.actions}
          minWidth={COLUMN_MIN_WIDTHS.actions}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.actions}
          last
        >
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <OutlineButton
              title="View"
              icon={FileText}
              variant="primary"
              size="sm"
              onPress={() => setDetailSchedule(s)}
            />

            {isPending && statusTab === "PENDING" && (
              <>
                <OutlineButton
                  title="Reassign"
                  icon={UserPlus}
                  variant="primary"
                  size="sm"
                  onPress={() => openReassign(s)}
                />
                <OutlineButton
                  title="Reject"
                  icon={X}
                  variant="danger"
                  size="sm"
                  onPress={() => {
                    setRejectSchedule(s);
                    setRejectReason("");
                  }}
                />
                <OutlineButton
                  title="Confirm"
                  icon={Check}
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setConfirmSchedule(s);
                    setComments("");
                  }}
                />
              </>
            )}

            {isConfirmed && !isRejected && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: COLORS.primaryDark,
                }}
              >
                ✓ Confirmed
              </Text>
            )}
            {isRejected && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: COLORS.stateErrorText,
                }}
              >
                ✗ Rejected
              </Text>
            )}
          </View>
        </BodyCell>
      </View>
    );
  };

  if (loading && statusTab !== "OVERDUE") {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>
          Loading daily feasibility queue...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: isDesktop ? "row" : "column",
          justifyContent: "space-between",
          alignItems: isDesktop ? "center" : "flex-start",
          marginBottom: 20,
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text }}
          >
            Daily Schedule Confirmation
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            {byStatus.pending.length} pending • {byStatus.confirmed.length}{" "}
            confirmed • {byStatus.rejected.length} rejected • {overdueCount}{" "}
            overdue for {selectedYear}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {(
          [
            {
              key: "PENDING",
              label: "Schedules",
              count: byStatus.pending.length,
            },
            {
              key: "CONFIRMED",
              label: "Confirmed",
              count: byStatus.confirmed.length,
            },
            {
              key: "REJECTED",
              label: "Rejected",
              count: byStatus.rejected.length,
            },
            {
              key: "OVERDUE",
              label: "Overdue",
              count: overdueCount,
            },
          ] as const
        ).map((tab) => {
          const active = statusTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setStatusTab(tab.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: active ? 2 : 0,
                borderBottomColor: COLORS.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? COLORS.primary : COLORS.textMuted,
                }}
              >
                {tab.label}
              </Text>
              <View
                style={{
                  minWidth: 22,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  backgroundColor: active ? COLORS.primary : "#E2E8F0",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: active ? "#FFF" : COLORS.textMuted,
                    textAlign: "center",
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* OVERDUE — delegate to child component */}
      {statusTab === "OVERDUE" ? (
        <OverdueScheduleQueue
          selectedYear={selectedYear}
          onCountChange={setOverdueCount}
        />
      ) : visibleSchedules.length === 0 ? (
        <View
          style={{
            padding: 60,
            alignItems: "center",
            backgroundColor: COLORS.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <CheckCircle size={48} color={COLORS.primary} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: COLORS.text,
              marginTop: 16,
            }}
          >
            {statusTab === "PENDING" && "All caught up!"}
            {statusTab === "CONFIRMED" && "No confirmed schedules yet"}
            {statusTab === "REJECTED" && "No rejected schedules yet"}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: COLORS.textMuted,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {statusTab === "PENDING" &&
              "No day schedules awaiting your feasibility confirmation."}
            {statusTab === "CONFIRMED" &&
              "Schedules you confirm will appear here."}
            {statusTab === "REJECTED" &&
              "Schedules you reject will appear here."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16, width: "100%" }}>
          {groupedByMonth.map((group) => {
            const expanded = expandedMonths.has(group.month);
            const allDepts = new Set(
              group.days.flatMap((d) => d.schedules.map((s) => s.department)),
            );

            return (
              <View
                key={group.month}
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                {/* Month header */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleMonth(group.month)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 14,
                    backgroundColor: COLORS.primaryLight,
                    borderBottomWidth: expanded ? 1 : 0,
                    borderBottomColor: COLORS.primaryBorder,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: "#FFF",
                        borderWidth: 1,
                        borderColor: COLORS.primaryBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Calendar size={17} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "700",
                          color: COLORS.primaryDark,
                        }}
                      >
                        {group.month} {group.year}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {group.total} schedule{group.total !== 1 ? "s" : ""} •{" "}
                        {group.days.length} day
                        {group.days.length !== 1 ? "s" : ""} • {allDepts.size}{" "}
                        dept
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: COLORS.primaryLight,
                        borderWidth: 1,
                        borderColor: COLORS.primaryBorder,
                        borderRadius: 20,
                      }}
                    >
                      {statusTab === "PENDING" && (
                        <>
                          <Clock size={11} color={COLORS.primary} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: COLORS.primaryDark,
                            }}
                          >
                            {group.total} pending
                          </Text>
                        </>
                      )}
                      {statusTab === "CONFIRMED" && (
                        <>
                          <Check size={11} color={COLORS.primary} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: COLORS.primaryDark,
                            }}
                          >
                            {group.total} confirmed
                          </Text>
                        </>
                      )}
                      {statusTab === "REJECTED" && (
                        <>
                          <X size={11} color={COLORS.textMuted} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: COLORS.textMuted,
                            }}
                          >
                            {group.total} rejected
                          </Text>
                        </>
                      )}
                    </View>
                    {expanded ? (
                      <ChevronDown size={20} color={COLORS.primary} />
                    ) : (
                      <ChevronRight size={20} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Bulk action bar (PENDING only) */}
                {expanded && statusTab === "PENDING" && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      padding: 12,
                      backgroundColor: COLORS.headerBg,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.borderSubtle,
                      flexWrap: "wrap",
                    }}
                  >
                    <OutlineButton
                      title={`Confirm All in ${group.month}`}
                      icon={Check}
                      variant="primary"
                      size="sm"
                      onPress={() => setBulkConfirmMonth(group)}
                      disabled={submitting}
                    />
                    <OutlineButton
                      title={`Reject All in ${group.month}`}
                      icon={X}
                      variant="danger"
                      size="sm"
                      onPress={() => {
                        setBulkRejectMonth(group);
                        setBulkRejectReason("");
                      }}
                      disabled={submitting}
                    />
                  </View>
                )}

                {/* Mobile swipe hint */}
                {expanded && !isDesktop && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      backgroundColor: COLORS.bg,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: COLORS.textMuted,
                        fontWeight: "500",
                      }}
                    >
                      ⇄ Swipe horizontally to see all columns
                    </Text>
                  </View>
                )}

                {/* TABLE — desktop fills container, mobile scrolls */}
                {expanded &&
                  (isDesktop ? (
                    <View style={{ width: "100%", alignSelf: "stretch" }}>
                      {renderTableHeader()}
                      {group.days.map((day) => (
                        <View key={day.date} style={{ width: "100%" }}>
                          <View
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: COLORS.headerBg,
                              borderBottomWidth: 1,
                              borderBottomColor: COLORS.borderSubtle,
                              width: "100%",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: COLORS.textMuted,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              {day.date} • {day.schedules.length} schedule
                              {day.schedules.length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                          {day.schedules.map(renderScheduleRow)}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator
                      contentContainerStyle={{ flexGrow: 0 }}
                    >
                      <View
                        style={{
                          width: TABLE_MIN_WIDTH,
                          flexDirection: "column",
                        }}
                      >
                        {renderTableHeader()}
                        {group.days.map((day) => (
                          <View key={day.date}>
                            <View
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                backgroundColor: COLORS.headerBg,
                                borderBottomWidth: 1,
                                borderBottomColor: COLORS.borderSubtle,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "700",
                                  color: COLORS.textMuted,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                }}
                              >
                                {day.date} • {day.schedules.length} schedule
                                {day.schedules.length !== 1 ? "s" : ""}
                              </Text>
                            </View>
                            {day.schedules.map(renderScheduleRow)}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  ))}
              </View>
            );
          })}
        </View>
      )}

      {/* ══════════ DETAIL MODAL ══════════ */}
      {detailSchedule && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDetailSchedule(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Daily Schedule Detail
                </Text>
                <TouchableOpacity onPress={() => setDetailSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 500 }}>
                <DetailRow
                  label="Date"
                  value={detailSchedule.scheduledDate || "—"}
                />
                <DetailRow
                  label="Time"
                  value={`${detailSchedule.startTime || "—"} – ${
                    detailSchedule.endTime || "—"
                  }`}
                />
                <DetailRow
                  label="Department"
                  value={detailSchedule.department}
                />
                <DetailRow
                  label="Audit Type"
                  value={detailSchedule.auditType || "—"}
                />
                <DetailRow
                  label="Audit Elements"
                  value={detailSchedule.auditElements?.join(", ") || "—"}
                />
                <DetailRow
                  label="Auditor"
                  value={detailSchedule.auditorName || "—"}
                />
                <DetailRow
                  label="Co-Auditors"
                  value={detailSchedule.coAuditorNames?.join(", ") || "—"}
                />
                <DetailRow
                  label="Auditees"
                  value={
                    detailSchedule.auditeeNames?.join(", ") ||
                    detailSchedule.auditeeName ||
                    "—"
                  }
                />
                <DetailRow
                  label="Plant"
                  value={detailSchedule.plantName || "—"}
                />
              </ScrollView>
              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Close"
                  onPress={() => setDetailSchedule(null)}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ CONFIRM MODAL ══════════ */}
      {confirmSchedule && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setConfirmSchedule(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>Confirm Feasibility</Text>
                <TouchableOpacity onPress={() => setConfirmSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 13, color: COLORS.text }}>
                  Confirm{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {confirmSchedule.department} —{" "}
                    {confirmSchedule.scheduledDate}
                  </Text>
                  ?
                </Text>
                <TextInput
                  style={modalStyles.textarea}
                  value={comments}
                  onChangeText={setComments}
                  placeholder="Optional comments..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!submitting}
                />
              </View>
              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Cancel"
                  onPress={() => setConfirmSchedule(null)}
                  disabled={submitting}
                  variant="primary"
                />
                <OutlineButton
                  title={submitting ? "Confirming..." : "Confirm"}
                  icon={Check}
                  onPress={handleConfirmSingle}
                  loading={submitting}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ REJECT MODAL ══════════ */}
      {rejectSchedule && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setRejectSchedule(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>Reject Feasibility</Text>
                <TouchableOpacity onPress={() => setRejectSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <TextInput
                  style={modalStyles.textarea}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Explain why this schedule is not feasible..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!submitting}
                />
              </View>
              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Cancel"
                  onPress={() => setRejectSchedule(null)}
                  disabled={submitting}
                  variant="primary"
                />
                <OutlineButton
                  title={submitting ? "Rejecting..." : "Reject"}
                  icon={X}
                  onPress={handleRejectSingle}
                  loading={submitting}
                  disabled={submitting || !rejectReason.trim()}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ BULK CONFIRM ══════════ */}
      {bulkConfirmMonth && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setBulkConfirmMonth(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Confirm All — {bulkConfirmMonth.month} {bulkConfirmMonth.year}
                </Text>
                <TouchableOpacity onPress={() => setBulkConfirmMonth(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 13, color: COLORS.text }}>
                  Confirm all{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {bulkConfirmMonth.total}
                  </Text>{" "}
                  daily schedules for {bulkConfirmMonth.month}{" "}
                  {bulkConfirmMonth.year}?
                </Text>
              </View>
              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Cancel"
                  onPress={() => setBulkConfirmMonth(null)}
                  disabled={submitting}
                  variant="primary"
                />
                <OutlineButton
                  title={submitting ? "Confirming..." : "Confirm All"}
                  icon={Check}
                  onPress={handleBulkConfirmMonth}
                  loading={submitting}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ BULK REJECT ══════════ */}
      {bulkRejectMonth && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setBulkRejectMonth(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Reject All — {bulkRejectMonth.month} {bulkRejectMonth.year}
                </Text>
                <TouchableOpacity onPress={() => setBulkRejectMonth(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <TextInput
                  style={modalStyles.textarea}
                  value={bulkRejectReason}
                  onChangeText={setBulkRejectReason}
                  placeholder="Reason for rejection..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!submitting}
                />
              </View>
              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Cancel"
                  onPress={() => setBulkRejectMonth(null)}
                  disabled={submitting}
                  variant="primary"
                />
                <OutlineButton
                  title={submitting ? "Rejecting..." : "Reject All"}
                  icon={X}
                  onPress={handleBulkRejectMonth}
                  loading={submitting}
                  disabled={submitting || !bulkRejectReason.trim()}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ REASSIGN MODAL ══════════ */}
      {reassignSchedule && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setReassignSchedule(null)}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.sheet, { maxWidth: 520 }]}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Reassign Daily Schedule
                </Text>
                <TouchableOpacity onPress={() => setReassignSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 500, padding: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginBottom: 12,
                  }}
                >
                  {reassignSchedule.department} •{" "}
                  {reassignSchedule.scheduledDate} •{" "}
                  {reassignSchedule.startTime}–{reassignSchedule.endTime}
                </Text>

                {reassignConflictMsg && (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      padding: 10,
                      backgroundColor: COLORS.stateErrorBg,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                  >
                    <AlertCircle size={16} color={COLORS.stateErrorText} />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: COLORS.stateErrorText,
                      }}
                    >
                      {reassignConflictMsg}
                    </Text>
                  </View>
                )}

                {localConflicts.length > 0 && !reassignConflictMsg && (
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: COLORS.stateErrorBg,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <AlertCircle size={16} color={COLORS.stateErrorText} />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: COLORS.stateErrorText,
                        }}
                      >
                        Schedule Conflict Detected
                      </Text>
                    </View>
                    {localConflicts.map((c, idx) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: 11,
                          color: COLORS.stateErrorText,
                          marginTop: 2,
                        }}
                      >
                        • {c.type === "AUDITOR" ? "Auditor" : "Auditee"}{" "}
                        <Text style={{ fontWeight: "700" }}>{c.name}</Text>{" "}
                        already has an audit in{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {c.department}
                        </Text>{" "}
                        from {c.startTime} to {c.endTime}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={modalStyles.sectionLabel}>Primary Auditor</Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {loadingCompetent ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={{ marginVertical: 20 }}
                    />
                  ) : fullyCompetentAuditors.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10,
                      }}
                    >
                      No auditors available.
                    </Text>
                  ) : (
                    fullyCompetentAuditors.map((a) => {
                      const selected = newPrimaryAuditorId === Number(a.id);
                      const hasConflict = localConflicts.some(
                        (c) => c.type === "AUDITOR" && c.id === Number(a.id),
                      );
                      return (
                        <TouchableOpacity
                          key={`pri-${a.id}`}
                          onPress={() => {
                            setNewPrimaryAuditorId(Number(a.id));
                            setNewCoAuditorIds((prev) =>
                              prev.filter((x) => x !== Number(a.id)),
                            );
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderWidth: 1,
                            borderColor: hasConflict
                              ? COLORS.stateErrorText
                              : selected
                                ? COLORS.primary
                                : COLORS.border,
                            backgroundColor: hasConflict
                              ? COLORS.stateErrorBg
                              : selected
                                ? COLORS.primaryLight
                                : "#FFF",
                            borderRadius: 8,
                          }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              borderWidth: 2,
                              borderColor: hasConflict
                                ? COLORS.stateErrorText
                                : selected
                                  ? COLORS.primary
                                  : "#CBD5E1",
                              backgroundColor: "#FFF",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 8,
                            }}
                          >
                            {selected && (
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: hasConflict
                                    ? COLORS.stateErrorText
                                    : COLORS.primary,
                                }}
                              />
                            )}
                          </View>
                          <Text style={{ fontSize: 13, flex: 1 }}>
                            {a.firstName} {a.lastName}
                          </Text>
                          {hasConflict && (
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: COLORS.stateErrorText,
                                marginLeft: 6,
                              }}
                            >
                              CONFLICT
                            </Text>
                          )}
                          {!hasConflict && a.role && (
                            <Text
                              style={{
                                fontSize: 10,
                                color: COLORS.textMuted,
                                marginLeft: 6,
                              }}
                            >
                              {a.role}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                <Text style={modalStyles.sectionLabel}>Co-Auditors (Team)</Text>
                <TouchableOpacity
                  onPress={() => setShowTeamModal(true)}
                  disabled={loadingCompetent}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    backgroundColor: "#FFF",
                    marginBottom: 16,
                  }}
                >
                  <Users size={16} color={COLORS.textMuted} />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontSize: 13,
                      color:
                        newCoAuditorIds.length === 0
                          ? COLORS.textMuted
                          : COLORS.text,
                    }}
                  >
                    {newCoAuditorIds.length === 0
                      ? "Select co-auditors..."
                      : `${newCoAuditorIds.length} selected`}
                  </Text>
                  <ChevronDown size={16} color={COLORS.textMuted} />
                </TouchableOpacity>

                <Text style={modalStyles.sectionLabel}>Auditees</Text>
                <TouchableOpacity
                  onPress={() => setShowAuditeeModal(true)}
                  disabled={loadingDepartmentUsers}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    backgroundColor: "#FFF",
                  }}
                >
                  <User size={16} color={COLORS.textMuted} />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      fontSize: 13,
                      color:
                        newAuditeeIds.length === 0
                          ? COLORS.textMuted
                          : COLORS.text,
                    }}
                  >
                    {newAuditeeIds.length === 0
                      ? "Select auditees..."
                      : `${newAuditeeIds.length} selected`}
                  </Text>
                  <ChevronDown size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </ScrollView>

              <View style={modalStyles.footer}>
                <OutlineButton
                  title="Cancel"
                  onPress={() => setReassignSchedule(null)}
                  disabled={submitting}
                  variant="primary"
                />
                <OutlineButton
                  title={
                    submitting
                      ? "Saving..."
                      : localConflicts.length > 0
                        ? "Resolve Conflicts First"
                        : "Save Reassignment"
                  }
                  icon={UserPlus}
                  onPress={handleReassign}
                  loading={submitting}
                  disabled={submitting || localConflicts.length > 0}
                  variant="primary"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ══════════ MULTI-SELECT MODALS ══════════ */}
      <MultiSelectModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        options={fullyCompetentAuditors.filter(
          (a) => Number(a.id) !== newPrimaryAuditorId,
        )}
        selectedIds={newCoAuditorIds.map(String)}
        onToggle={(a: ScheduleUser) => toggleCoAuditor(a)}
        onSelectAll={selectAllCoAuditors}
        onClearAll={() => setNewCoAuditorIds([])}
        emptyMsg="No matching auditors"
        title="Select Co-Auditors"
        loading={loadingCompetent}
      />

      <MultiSelectModal
        isOpen={showAuditeeModal}
        onClose={() => setShowAuditeeModal(false)}
        options={departmentAuditees}
        selectedIds={newAuditeeIds.map(String)}
        onToggle={(a: ScheduleUser) => toggleAuditee(a)}
        onSelectAll={selectAllAuditees}
        onClearAll={() => setNewAuditeeIds([])}
        emptyMsg="No matching auditees"
        title="Select Auditees"
        loading={loadingDepartmentUsers}
      />
    </View>
  );
};

// ─── Table cell helpers ────────────────────────────────────────────
const HeaderCell = ({
  flex,
  minWidth,
  fixedWidth,
  label,
  last,
}: {
  flex: number;
  minWidth: number;
  fixedWidth?: number;
  label: string;
  last?: boolean;
}) => (
  <View
    style={{
      ...(fixedWidth != null
        ? { width: fixedWidth }
        : { flex, minWidth, flexShrink: 1 }),
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: COLORS.border,
      justifyContent: "center",
    }}
  >
    <Text
      style={{
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  </View>
);

const BodyCell = ({
  flex,
  minWidth,
  fixedWidth,
  children,
  last,
}: {
  flex: number;
  minWidth: number;
  fixedWidth?: number;
  children: React.ReactNode;
  last?: boolean;
}) => (
  <View
    style={{
      ...(fixedWidth != null
        ? { width: fixedWidth }
        : { flex, flexShrink: 1, minWidth: 0 }),
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRightWidth: last ? 0 : 1,
      borderRightColor: COLORS.borderSubtle,
      justifyContent: "center",
    }}
  >
    {children}
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderSubtle,
    }}
  >
    <Text
      style={{
        width: 130,
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: "500",
      }}
    >
      {label}
    </Text>
    <Text style={{ flex: 1, fontSize: 13, color: COLORS.text }}>{value}</Text>
  </View>
);

const modalStyles = {
  backdrop: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 20,
  },
  sheet: {
    width: "100%" as const,
    maxWidth: 480,
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.text,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textarea: {
    width: "100%" as const,
    minHeight: 100,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    fontSize: 13,
    textAlignVertical: "top" as const,
    color: COLORS.text,
  },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bg,
  },
};

export const COLORS_EXPORT = COLORS;

export default DailyFeasibilityQueue;
