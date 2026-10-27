// app/components/dashboards/LeadAuditor/OverdueScheduleQueue.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  // Modals
  AssignRequestModal,
  BodyCell,
  // Constants
  COLORS,
  COLUMN_FLEX,
  COLUMN_MIN_WIDTHS,
  DetailModal,
  HeaderCell,
  HoverOutlineButton,
  LAAssignModal,
  RejectRequestModal,
  RequestPreviewModal,
  TABLE_MIN_WIDTH,
  convertToMinutes,
  // Helpers
  extractData,
  getLocalDateString,
  getWeekNumber,
  hasEnded,
  monthOrder,
  normalizeNames,
  toNumArray,
} from "./OverdueModals";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface DailyScheduleDto {
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

interface Props {
  selectedYear: number;
  onCountChange?: (count: number) => void;
}

// ─────────────────────────────────────────────────────────────
// Local helper — derive month/year from a YYYY-MM-DD string
// (kept here because it's only used in this file)
// ─────────────────────────────────────────────────────────────
const MONTH_ABBRS = [
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

const monthAbbrFromDate = (dateStr?: string): string | null => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  return MONTH_ABBRS[mm - 1];
};

const yearFromDate = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isNaN(y) ? null : y;
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const OverdueScheduleQueue: React.FC<Props> = ({
  selectedYear,
  onCountChange,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [submitting, setSubmitting] = useState(false);
  const [overdueSchedules, setOverdueSchedules] = useState<DailyScheduleDto[]>(
    [],
  );
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [detailSchedule, setDetailSchedule] = useState<DailyScheduleDto | null>(
    null,
  );

  // ─── LA direct Assign modal state ───
  const [laAssignTarget, setLaAssignTarget] = useState<DailyScheduleDto | null>(
    null,
  );
  const [laAssignMode, setLaAssignMode] = useState<"RESCHEDULE" | "EXTEND">(
    "RESCHEDULE",
  );
  const [laAssignModeHint, setLaAssignModeHint] = useState<string>("");
  const [laAssignDate, setLaAssignDate] = useState("");
  const [laAssignStart, setLaAssignStart] = useState("");
  const [laAssignEnd, setLaAssignEnd] = useState("");
  const [laAssignEndDate, setLaAssignEndDate] = useState("");
  const [laAssignReason, setLaAssignReason] = useState("");
  const [laAssignComment, setLaAssignComment] = useState("");

  const [laAssignShowReassign, setLaAssignShowReassign] = useState(false);
  const [laAssignSelectedAuditorId, setLaAssignSelectedAuditorId] =
    useState<string>("");
  const [laAssignShowCoAuditor, setLaAssignShowCoAuditor] = useState(false);
  const [laAssignAdditionalAuditorIds, setLaAssignAdditionalAuditorIds] =
    useState<string[]>([]);
  const [laAssignAuditors, setLaAssignAuditors] = useState<ScheduleUser[]>([]);
  const [laAssignTeamInfo, setLaAssignTeamInfo] = useState<{
    teamAuditorIds: number[];
    teamAuditorNames: string[];
    leadAuditorName: string | null;
  }>({ teamAuditorIds: [], teamAuditorNames: [], leadAuditorName: null });
  const [laAssignLoadingTeam, setLaAssignLoadingTeam] = useState(false);
  const [laAssignConflictWarning, setLaAssignConflictWarning] =
    useState<any>(null);
  const [laAssignCheckingAvailability, setLaAssignCheckingAvailability] =
    useState(false);

  const [laAssignConflicts, setLaAssignConflicts] = useState<
    Record<string, string>
  >({});
  const [requestConflicts, setRequestConflicts] = useState<
    Record<string, string>
  >({});
  // ─── Request Review flow ───
  const [requestPreviewTarget, setRequestPreviewTarget] =
    useState<DailyScheduleDto | null>(null);
  const [requestApprovalTarget, setRequestApprovalTarget] =
    useState<DailyScheduleDto | null>(null);
  const [requestRejectionTarget, setRequestRejectionTarget] =
    useState<DailyScheduleDto | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalAuditors, setApprovalAuditors] = useState<ScheduleUser[]>([]);
  const [teamInfo, setTeamInfo] = useState<{
    teamAuditorIds: number[];
    teamAuditorNames: string[];
    leadAuditorName: string | null;
  }>({ teamAuditorIds: [], teamAuditorNames: [], leadAuditorName: null });
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] =
    useState<string>("");
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState<string[]>(
    [],
  );
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [laOverrideNewDate, setLaOverrideNewDate] = useState("");
  const [laOverrideNewStart, setLaOverrideNewStart] = useState("");
  const [laOverrideNewEnd, setLaOverrideNewEnd] = useState("");
  const [laOverrideNewEndDate, setLaOverrideNewEndDate] = useState("");
  const conflictRef = useRef<any>(null);
  // ─────────── Fetch overdue ───────────
  const fetchOverdue = useCallback(async () => {
    if (!user?.id) return;
    setOverdueLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/overdue-schedules/${selectedYear}`,
        { params: { userId: user.id } },
      );

      const raw = Array.isArray(res.data) ? res.data : [];

      const data: DailyScheduleDto[] = raw.map((row: any) => ({
        ...row,
        coAuditorIdList: toNumArray(row.coAuditorIdList ?? row.coAuditorIds),
        coAuditorNames: normalizeNames(row.coAuditorNames),
        auditeeIdList: toNumArray(row.auditeeIdList ?? row.auditeeIds),
        auditeeNames: normalizeNames(row.auditeeNames),
        rescheduleRequested: row.rescheduleRequested === true,
        extensionRequested: row.extensionRequested === true,
      }));

      const trulyOverdue = data.filter((s) => hasEnded(s));

      setOverdueSchedules(trulyOverdue);

      if (trulyOverdue.length > 0 && expandedMonths.size === 0) {
        setExpandedMonths(new Set([trulyOverdue[0].month]));
      }

      if (onCountChange) onCountChange(trulyOverdue.length);
    } catch (error: any) {
      console.error("Failed to fetch overdue schedules:", error);
      addToast("Failed to load overdue schedules", "error");
      setOverdueSchedules([]);
      if (onCountChange) onCountChange(0);
    } finally {
      setOverdueLoading(false);
    }
  }, [selectedYear, addToast, user?.id, expandedMonths.size, onCountChange]);

  useEffect(() => {
    fetchOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, user?.id]);

  const groupedByMonth: MonthGroup[] = useMemo(() => {
    const monthMap = new Map<string, Map<string, DailyScheduleDto[]>>();
    for (const s of overdueSchedules) {
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
  }, [overdueSchedules, selectedYear]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════
  // LA DIRECT ASSIGN
  // ═══════════════════════════════════════════════════════════
  const openLAAssignModal = async (s: DailyScheduleDto) => {
    setLaAssignTarget(s);
    setLaAssignConflicts({});
    const statusUpper = (s.status || "").toUpperCase();
    const hasStartedWork =
      statusUpper === "IN_PROGRESS" ||
      s.hasWorkStarted === true ||
      (s.completedForms ?? 0) > 0;

    if (hasStartedWork) {
      setLaAssignMode("EXTEND");
      setLaAssignModeHint(
        s.completedForms && s.totalForms
          ? `Auditor has already completed ${s.completedForms}/${s.totalForms} form(s). Extending keeps existing submissions intact.`
          : "Auditor has already started this audit. Extending keeps existing form submissions intact.",
      );
    } else {
      setLaAssignMode("RESCHEDULE");
      setLaAssignModeHint(
        "No work has been done on this audit yet. Reschedule the whole audit to a new date.",
      );
    }

    setLaAssignDate("");
    setLaAssignStart(s.startTime || "09:00 AM");
    setLaAssignEnd(s.endTime || "10:00 AM");

    if (hasStartedWork && s.scheduledDate) {
      try {
        const d = new Date(s.scheduledDate);
        d.setDate(d.getDate() + 7);
        setLaAssignEndDate(getLocalDateString(d));
      } catch {
        setLaAssignEndDate("");
      }
    } else {
      setLaAssignEndDate("");
    }

    setLaAssignReason("");
    setLaAssignComment("");

    setLaAssignShowReassign(false);
    setLaAssignSelectedAuditorId("");
    setLaAssignShowCoAuditor(false);
    setLaAssignAdditionalAuditorIds([]);
    setLaAssignConflictWarning(null);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null,
    });

    await fetchAuditorsForAssign(s);

    // ✅ Pre-compute conflicts for the whole auditor list on modal open
    const slotDate = s.scheduledDate || "";
    const slotStart = s.startTime || "";
    const slotEnd = s.endTime || "";

    if (slotDate && slotStart && slotEnd) {
      // Refetch the pool because setLaAssignAuditors is async
      const targetDept = s.department;
      const enumDept = departmentDisplayToEnum[targetDept] || targetDept;
      const weekTeam = await fetchWeekTeamForDailySchedule(s);
      let pool: ScheduleUser[] = [];
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
          for (const id of weekTeam.teamAuditorIds) {
            const u = byId.get(id);
            if (u) pool.push(u);
            else {
              const name =
                weekTeam.teamAuditorNames[
                  weekTeam.teamAuditorIds.indexOf(id)
                ] || `Auditor ${id}`;
              const parts = name.trim().split(/\s+/);
              pool.push({
                id,
                firstName: parts[0] || "Auditor",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITOR",
              });
            }
          }
        } else {
          const res = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
            {},
          );
          const raw = extractData(res);
          pool = Array.isArray(raw) ? raw : [];
        }
      } catch (err) {
        console.warn("batch pool fetch failed:", err);
      }

      const conflicts = await computeBatchConflicts(
        pool,
        slotDate,
        slotStart,
        slotEnd,
        s.id,
      );
      setLaAssignConflicts(conflicts);
    }
  };

  const closeLAAssignModal = () => {
    setLaAssignTarget(null);
    setLaAssignMode("RESCHEDULE");
    setLaAssignModeHint("");
    setLaAssignDate("");
    setLaAssignStart("");
    setLaAssignEnd("");
    setLaAssignEndDate("");
    setLaAssignReason("");
    setLaAssignComment("");
    setLaAssignShowReassign(false);
    setLaAssignSelectedAuditorId("");
    setLaAssignShowCoAuditor(false);
    setLaAssignAdditionalAuditorIds([]);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null,
    });
    setLaAssignConflictWarning(null);
    setLaAssignConflicts({});
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

  const computeBatchConflicts = useCallback(
    async (
      auditorPool: ScheduleUser[],
      dateStr: string,
      startTime: string,
      endTime: string,
      ignoreScheduleId?: number,
    ): Promise<Record<string, string>> => {
      const result: Record<string, string> = {};
      if (
        !auditorPool.length ||
        !dateStr ||
        !startTime ||
        !endTime ||
        !user?.id
      ) {
        return result;
      }

      const checkMonth = monthAbbrFromDate(dateStr);
      const checkYear = yearFromDate(dateStr) || selectedYear;
      if (!checkMonth) return result;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/date-schedules/${checkYear}/${checkMonth}?userId=${user.id}`,
          {},
        );
        const dayList = extractData(res) || [];
        const sameDay = (Array.isArray(dayList) ? dayList : []).filter(
          (s: any) => String(s.scheduledDate || "").slice(0, 10) === dateStr,
        );

        const s1S = convertToMinutes(startTime);
        const s1E = convertToMinutes(endTime);

        for (const auditor of auditorPool) {
          const aid = Number(auditor.id);
          const conflict = sameDay.find((s: any) => {
            if (Number(s.auditorId) !== aid) return false;
            if (
              ignoreScheduleId != null &&
              Number(s.id) === Number(ignoreScheduleId)
            )
              return false;
            const s2S = convertToMinutes(s.startTime || "");
            const s2E = convertToMinutes(s.endTime || "");
            return s1S < s2E && s1E > s2S;
          });

          if (conflict) {
            result[String(aid)] =
              `${auditor.firstName} ${auditor.lastName}`.trim() ||
              `Auditor ${aid}`;
          }
        }
      } catch (err) {
        console.error("❌ [computeBatchConflicts] failed:", err);
      }

      return result;
    },
    [user, selectedYear],
  );
  const fetchAuditorsForAssign = async (target: DailyScheduleDto) => {
    setLaAssignLoadingTeam(true);
    setLaAssignAuditors([]);
    setLaAssignTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null,
    });

    try {
      const weekTeam = await fetchWeekTeamForDailySchedule(target);
      let pool: ScheduleUser[] = [];

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
        for (const id of weekTeam.teamAuditorIds) {
          const u = byId.get(id);
          if (u) pool.push(u);
          else {
            const name =
              weekTeam.teamAuditorNames[weekTeam.teamAuditorIds.indexOf(id)] ||
              `Auditor ${id}`;
            const parts = name.trim().split(/\s+/);
            pool.push({
              id,
              firstName: parts[0] || "Auditor",
              lastName: parts.slice(1).join(" ") || String(id),
              role: "AUDITOR",
            });
          }
        }
      } else {
        const dept = target.department;
        const enumDept = departmentDisplayToEnum[dept] || dept;
        const res = await axios.get(
          `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
          {},
        );
        const raw = extractData(res);
        pool = Array.isArray(raw) ? raw : [];
      }

      const leadName =
        (target as any).leadAuditorName ?? target.auditorName ?? null;

      setLaAssignAuditors(pool);
      setLaAssignTeamInfo({
        teamAuditorIds: pool.map((a) => Number(a.id)),
        teamAuditorNames: pool.map((a) => `${a.firstName} ${a.lastName}`),
        leadAuditorName: leadName,
      });
    } catch (err) {
      console.error("❌ [fetchAuditorsForAssign] failed:", err);
    } finally {
      setLaAssignLoadingTeam(false);
    }
  };

  const checkConflictsForAssign = async (
    auditorId: string | number,
    isReassign = false,
  ) => {
    const target = laAssignTarget;
    if (!target || !auditorId) return;

    let checkDate = target.scheduledDate || "";
    let checkStart = target.startTime || "";
    let checkEnd = target.endTime || "";

    if (laAssignMode === "RESCHEDULE") {
      checkDate = laAssignDate || target.scheduledDate || "";
      checkStart = laAssignStart || target.startTime || "";
      checkEnd = laAssignEnd || target.endTime || "";
    } else {
      checkDate = target.scheduledDate || "";
      checkStart = target.startTime || "";
      checkEnd = target.endTime || "";
    }

    if (!checkDate || !checkStart || !checkEnd) {
      setLaAssignConflictWarning(null);
      return;
    }

    const checkMonth = monthAbbrFromDate(checkDate) || target.month;
    const checkYear =
      yearFromDate(checkDate) || target.planYear || selectedYear;

    setLaAssignCheckingAvailability(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/date-schedules/${checkYear}/${checkMonth}?userId=${user?.id}`,
        {},
      );
      const dayList = extractData(res) || [];
      const sameDay = (Array.isArray(dayList) ? dayList : []).filter(
        (s: any) => String(s.scheduledDate || "").slice(0, 10) === checkDate,
      );

      const s1S = convertToMinutes(checkStart);
      const s1E = convertToMinutes(checkEnd);

      const conflict = sameDay.find((s: any) => {
        if (Number(s.auditorId) !== Number(auditorId)) return false;
        if (Number(s.id) === Number(target.id)) return false;
        const s2S = convertToMinutes(s.startTime || "");
        const s2E = convertToMinutes(s.endTime || "");
        return s1S < s2E && s1E > s2S;
      });

      const key = String(auditorId);

      if (conflict) {
        const auditor = laAssignAuditors.find(
          (a) => Number(a.id) === Number(auditorId),
        );
        const name = auditor
          ? `${auditor.firstName} ${auditor.lastName}`
          : "Unknown";

        setLaAssignConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: name,
          conflictDate: checkDate,
          conflictStart: checkStart,
          conflictEnd: checkEnd,
        });

        setLaAssignConflicts((prev) => ({ ...prev, [key]: name }));
      } else {
        setLaAssignConflicts((prev) => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setLaAssignConflictWarning((prev: any) =>
          prev && String(prev.auditorId) === key ? null : prev,
        );
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
      setLaAssignConflictWarning(null);
    } finally {
      setLaAssignCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (!laAssignTarget) return;
    if (laAssignShowReassign && laAssignSelectedAuditorId) {
      checkConflictsForAssign(laAssignSelectedAuditorId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    laAssignTarget?.id,
    laAssignMode,
    laAssignDate,
    laAssignStart,
    laAssignEnd,
    laAssignEndDate,
  ]);

  useEffect(() => {
    if (!laAssignTarget) return;
    if (laAssignAdditionalAuditorIds.length === 0) return;
    const lastId =
      laAssignAdditionalAuditorIds[laAssignAdditionalAuditorIds.length - 1];
    if (lastId) checkConflictsForAssign(lastId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    laAssignTarget?.id,
    laAssignMode,
    laAssignDate,
    laAssignStart,
    laAssignEnd,
    laAssignEndDate,
  ]);

  const handleLAAssign = async () => {
    if (!laAssignTarget || !user?.id) return;

    if (!laAssignReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }

    if (laAssignMode === "RESCHEDULE") {
      if (!laAssignDate || !laAssignStart || !laAssignEnd) {
        addToast("Please fill date, start time and end time", "error");
        return;
      }
      if (convertToMinutes(laAssignStart) >= convertToMinutes(laAssignEnd)) {
        addToast("End time must be after start time", "error");
        return;
      }
    } else {
      if (!laAssignEndDate) {
        addToast("Please select a new end date", "error");
        return;
      }
    }

    if (laAssignShowReassign && !laAssignSelectedAuditorId) {
      addToast("Please select a replacement auditor", "error");
      return;
    }

    setSubmitting(true);
    try {
      const reassignBody = {
        reassignToAuditorId: laAssignShowReassign
          ? Number(laAssignSelectedAuditorId) || null
          : null,
        additionalAuditorIds: laAssignShowCoAuditor
          ? laAssignAdditionalAuditorIds.map((x) => Number(x))
          : [],
        keepOriginalAuditor: laAssignShowCoAuditor && !laAssignShowReassign,
        comments: laAssignComment,
      };

      if (laAssignMode === "RESCHEDULE") {
        await axios.post(
          `${API_BASE_URL}/api/audit-schedule/schedule/${laAssignTarget.id}/la-reschedule?userId=${user.id}`,
          {
            newDate: laAssignDate,
            newStartTime: laAssignStart,
            newEndTime: laAssignEnd,
            reason: laAssignReason,
            ...reassignBody,
          },
          {},
        );
        addToast(
          `Assigned: ${laAssignTarget.department} → ${laAssignDate}`,
          "success",
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/audit-schedule/schedule/${laAssignTarget.id}/la-extend?userId=${user.id}`,
          {
            newEndDate: laAssignEndDate,
            reason: laAssignReason,
            ...reassignBody,
          },
          {},
        );
        addToast(
          `Assigned: ${laAssignTarget.department} → ${laAssignEndDate}`,
          "success",
        );
      }

      closeLAAssignModal();
      fetchOverdue();
    } catch (error: any) {
      addToast(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to assign",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // REQUEST REVIEW flow
  // ═══════════════════════════════════════════════════════════
  const fetchDepartmentTeamForRequest = useCallback(
    async (target: DailyScheduleDto) => {
      setLoadingTeamMembers(true);
      setApprovalAuditors([]);
      setTeamInfo({
        teamAuditorIds: [],
        teamAuditorNames: [],
        leadAuditorName: null,
      });

      try {
        const dept = target.department;
        const enumDept = departmentDisplayToEnum[dept] || dept;

        const weekTeam = await fetchWeekTeamForDailySchedule(target);
        let pool: ScheduleUser[] = [];

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
          for (const id of weekTeam.teamAuditorIds) {
            const u = byId.get(id);
            if (u) pool.push(u);
            else {
              const name =
                weekTeam.teamAuditorNames[
                  weekTeam.teamAuditorIds.indexOf(id)
                ] || `Auditor ${id}`;
              const parts = name.trim().split(/\s+/);
              pool.push({
                id,
                firstName: parts[0] || "Auditor",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITOR",
              });
            }
          }
        } else {
          const res = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
            {},
          );
          const raw = extractData(res);
          pool = Array.isArray(raw) ? raw : [];
        }

        const leadId = (target as any).leadAuditorId ?? target.auditorId;
        const leadName =
          (target as any).leadAuditorName ?? target.auditorName ?? null;
        const teamIds = pool
          .map((a) => Number(a.id))
          .filter((id) => !Number.isNaN(id) && id !== Number(leadId));

        setApprovalAuditors(pool);
        setTeamInfo({
          teamAuditorIds: teamIds,
          teamAuditorNames: pool.map((a) => `${a.firstName} ${a.lastName}`),
          leadAuditorName: leadName,
        });
      } catch (err) {
        console.error("❌ [fetchDepartmentTeamForRequest] failed:", err);
      } finally {
        setLoadingTeamMembers(false);
      }
    },
    [fetchWeekTeamForDailySchedule],
  );
  const checkConflictsForReassign = async (
    auditorId: string | number,
    isReassign = false,
    overrides?: { date?: string; start?: string; end?: string },
  ) => {
    const target = requestApprovalTarget;
    if (!target || !auditorId) return;

    const isReschedule = target.rescheduleRequested === true;

    let checkDate = target.scheduledDate || "";
    let checkStart = target.startTime || "";
    let checkEnd = target.endTime || "";

    if (isReschedule) {
      checkDate =
        overrides?.date ||
        target.requestedNewDate ||
        laOverrideNewDate ||
        target.scheduledDate ||
        "";
      checkStart =
        overrides?.start ||
        target.requestedNewStartTime ||
        laOverrideNewStart ||
        target.startTime ||
        "";
      checkEnd =
        overrides?.end ||
        target.requestedNewEndTime ||
        laOverrideNewEnd ||
        target.endTime ||
        "";
    }

    if (!checkDate || !checkStart || !checkEnd) {
      setConflictWarning(null);
      return;
    }

    const checkMonth = monthAbbrFromDate(checkDate) || target.month;
    const checkYear =
      yearFromDate(checkDate) || target.planYear || selectedYear;

    setCheckingAvailability(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/date-schedules/${checkYear}/${checkMonth}?userId=${user?.id}`,
        {},
      );
      const dayList = extractData(res) || [];
      const sameDay = (Array.isArray(dayList) ? dayList : []).filter(
        (s: any) => String(s.scheduledDate || "").slice(0, 10) === checkDate,
      );

      const s1S = convertToMinutes(checkStart);
      const s1E = convertToMinutes(checkEnd);

      const conflict = sameDay.find((s: any) => {
        if (Number(s.auditorId) !== Number(auditorId)) return false;
        if (Number(s.id) === Number(target.id)) return false;
        const s2S = convertToMinutes(s.startTime || "");
        const s2E = convertToMinutes(s.endTime || "");
        return s1S < s2E && s1E > s2S;
      });

      const key = String(auditorId);

      if (conflict) {
        const auditor = approvalAuditors.find(
          (a) => Number(a.id) === Number(auditorId),
        );
        const name = auditor
          ? `${auditor.firstName} ${auditor.lastName}`
          : "Unknown";

        // 1. Set the big warning box
        setConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: name,
          conflictDate: checkDate,
          conflictStart: checkStart,
          conflictEnd: checkEnd,
        });

        // 2. Set the map so the AuditorPickerField shows the red text
        setRequestConflicts((prev) => ({ ...prev, [key]: name }));
      } else {
        // 1. Remove from the map
        setRequestConflicts((prev) => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        // 2. Clear the warning box
        setConflictWarning((prev: any) =>
          prev && String(prev.auditorId) === key ? null : prev,
        );
      }
    } catch (err) {
      console.error("Conflict check failed:", err);
      setConflictWarning(null);
    } finally {
      setCheckingAvailability(false);
    }
  };
  const openRequestPreview = async (s: DailyScheduleDto) => {
    setRequestPreviewTarget(s);
    setRequestConflicts({});
    fetchDepartmentTeamForRequest(s);

    setLaOverrideNewDate(s.requestedNewDate || "");
    setLaOverrideNewStart(s.requestedNewStartTime || "");
    setLaOverrideNewEnd(s.requestedNewEndTime || "");
    setLaOverrideNewEndDate(s.requestedNewToDate || "");

    // ✅ Pre-compute conflicts on modal open using the requested slot
    const slotDate = s.rescheduleRequested
      ? s.requestedNewDate || s.scheduledDate || ""
      : s.scheduledDate || "";
    const slotStart = s.rescheduleRequested
      ? s.requestedNewStartTime || s.startTime || ""
      : s.startTime || "";
    const slotEnd = s.rescheduleRequested
      ? s.requestedNewEndTime || s.endTime || ""
      : s.endTime || "";

    if (slotDate && slotStart && slotEnd) {
      const targetDept = s.department;
      const enumDept = departmentDisplayToEnum[targetDept] || targetDept;
      const weekTeam = await fetchWeekTeamForDailySchedule(s);
      let pool: ScheduleUser[] = [];
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
          for (const id of weekTeam.teamAuditorIds) {
            const u = byId.get(id);
            if (u) pool.push(u);
            else {
              const name =
                weekTeam.teamAuditorNames[
                  weekTeam.teamAuditorIds.indexOf(id)
                ] || `Auditor ${id}`;
              const parts = name.trim().split(/\s+/);
              pool.push({
                id,
                firstName: parts[0] || "Auditor",
                lastName: parts.slice(1).join(" ") || String(id),
                role: "AUDITOR",
              });
            }
          }
        } else {
          const res = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumDept)}`,
            {},
          );
          const raw = extractData(res);
          pool = Array.isArray(raw) ? raw : [];
        }
      } catch (err) {
        console.warn("batch pool fetch failed:", err);
      }

      const conflicts = await computeBatchConflicts(
        pool,
        slotDate,
        slotStart,
        slotEnd,
        s.id,
      );
      setRequestConflicts(conflicts);
    }
  };
  const closeRequestFlow = () => {
    setRequestPreviewTarget(null);
    setRequestApprovalTarget(null);
    setRequestRejectionTarget(null);
    setApprovalComment("");
    setRejectionReason("");
    setShowReassignOptions(false);
    setSelectedReassignAuditorId("");
    setShowAddAnotherAuditor(false);
    setAdditionalAuditorIds([]);
    setConflictWarning(null);
    setTeamInfo({
      teamAuditorIds: [],
      teamAuditorNames: [],
      leadAuditorName: null,
    });
    setApprovalAuditors([]);
    setLaOverrideNewDate("");
    setLaOverrideNewStart("");
    setLaOverrideNewEnd("");
    setLaOverrideNewEndDate("");
    setRequestConflicts({});
  };

  const handleApproveRequest = async () => {
    const target = requestApprovalTarget;
    if (!target || !user?.id) return;

    const type = target.rescheduleRequested ? "RESCHEDULE" : "EXTENSION";
    const endpoint =
      type === "RESCHEDULE" ? "approve-reschedule" : "approve-extension";

    const body: any = {
      comments: approvalComment,
      reassignToAuditorId: showReassignOptions
        ? Number(selectedReassignAuditorId) || null
        : null,
      additionalAuditorIds: showAddAnotherAuditor
        ? additionalAuditorIds.map((x) => Number(x))
        : [],
      keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions,
    };

    if (type === "RESCHEDULE") {
      if (laOverrideNewDate) body.newDate = laOverrideNewDate;
      if (laOverrideNewStart) body.newStartTime = laOverrideNewStart;
      if (laOverrideNewEnd) body.newEndTime = laOverrideNewEnd;
    } else {
      if (laOverrideNewEndDate) body.newEndDate = laOverrideNewEndDate;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/request/${target.id}/${endpoint}?userId=${user.id}`,
        body,
        {},
      );

      addToast(
        `${type === "RESCHEDULE" ? "Reschedule" : "Extension"} assigned for ${target.department}`,
        "success",
      );

      closeRequestFlow();
      fetchOverdue();
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to assign request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    const target = requestRejectionTarget;
    if (!target || !user?.id) return;

    if (!rejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }

    const type = target.rescheduleRequested ? "RESCHEDULE" : "EXTENSION";
    const endpoint =
      type === "RESCHEDULE" ? "reject-reschedule" : "reject-extension";

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/request/${target.id}/${endpoint}?userId=${user.id}`,
        { reason: rejectionReason },
        {},
      );

      addToast(
        `${type === "RESCHEDULE" ? "Reschedule" : "Extension"} rejected for ${target.department}`,
        "warning",
      );

      closeRequestFlow();
      fetchOverdue();
    } catch (err: any) {
      addToast(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to reject request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status badges ──────────────────────────────────────────
  const renderStatusBadges = (s: DailyScheduleDto) => {
    const badges: {
      icon: any;
      label: string;
      bg: string;
      bd: string;
      tc: string;
    }[] = [];

    if (s.rescheduleRequested) {
      badges.push({
        icon: AlertCircle,
        label: "Reschedule Requested",
        bg: COLORS.stateWarningBg,
        bd: COLORS.border,
        tc: COLORS.textMuted,
      });
    }
    if (s.extensionRequested && !s.rescheduleRequested) {
      badges.push({
        icon: AlertCircle,
        label: "Extension Requested",
        bg: COLORS.stateWarningBg,
        bd: COLORS.border,
        tc: COLORS.textMuted,
      });
    }
    if (!s.rescheduleRequested && !s.extensionRequested) {
      badges.push({
        icon: AlertCircle,
        label: "Overdue — No Request",
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
    const teamNames = normalizeNames(s.coAuditorNames);
    const primary = s.auditorName ? [s.auditorName] : [];
    const auditorDisplay = [...primary, ...teamNames].join(", ") || "—";
    const auditeeDisplay =
      normalizeNames(s.auditeeNames).join(", ") || s.auditeeName || "—";
    const auditElementsDisplay =
      normalizeNames(s.auditElements).join(", ") || "—";

    const isInProgress =
      (s.status || "").toUpperCase() === "IN_PROGRESS" ||
      s.hasWorkStarted === true ||
      (s.completedForms ?? 0) > 0;

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

        <BodyCell
          flex={COLUMN_FLEX.status}
          minWidth={COLUMN_MIN_WIDTHS.status}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.status}
        >
          {renderStatusBadges(s)}
        </BodyCell>

        <BodyCell
          flex={COLUMN_FLEX.actions}
          minWidth={COLUMN_MIN_WIDTHS.actions}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.actions}
          last
        >
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <HoverOutlineButton
              title="View"
              icon={FileText}
              variant="primary"
              onPress={() => setDetailSchedule(s)}
            />

            {(s.rescheduleRequested || s.extensionRequested) && (
              <HoverOutlineButton
                title={
                  s.rescheduleRequested
                    ? "Review Reschedule"
                    : "Review Extension"
                }
                icon={FileText}
                variant="filled"
                onPress={() => openRequestPreview(s)}
              />
            )}

            {!s.rescheduleRequested && !s.extensionRequested && (
              <HoverOutlineButton
                title={isInProgress ? "Extend" : "Reschedule"}
                icon={Calendar}
                variant="filled"
                onPress={() => openLAAssignModal(s)}
              />
            )}
          </View>
        </BodyCell>
      </View>
    );
  };

  if (overdueLoading) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>
          Loading overdue schedules...
        </Text>
      </View>
    );
  }

  if (overdueSchedules.length === 0) {
    return (
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
          No overdue schedules — great!
        </Text>
      </View>
    );
  }

  return (
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
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
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
                    {group.days.length !== 1 ? "s" : ""} • {allDepts.size} dept
                  </Text>
                </View>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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
                  <AlertCircle size={11} color={COLORS.primary} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: COLORS.primaryDark,
                    }}
                  >
                    {group.total} overdue
                  </Text>
                </View>
                {expanded ? (
                  <ChevronDown size={20} color={COLORS.primary} />
                ) : (
                  <ChevronRight size={20} color={COLORS.primary} />
                )}
              </View>
            </TouchableOpacity>

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

            {/* TABLE */}
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

      {/* ══════════ DETAIL MODAL ══════════ */}
      <DetailModal
        visible={!!detailSchedule}
        target={detailSchedule}
        onClose={() => setDetailSchedule(null)}
      />

      {/* ══════════ LA DIRECT ASSIGN MODAL ══════════ */}
      <LAAssignModal
        visible={!!laAssignTarget}
        onClose={closeLAAssignModal}
        submitting={submitting}
        target={laAssignTarget}
        mode={laAssignMode}
        modeHint={laAssignModeHint}
        date={laAssignDate}
        setDate={setLaAssignDate}
        start={laAssignStart}
        setStart={setLaAssignStart}
        end={laAssignEnd}
        setEnd={setLaAssignEnd}
        endDate={laAssignEndDate}
        setEndDate={setLaAssignEndDate}
        reason={laAssignReason}
        setReason={setLaAssignReason}
        showReassign={laAssignShowReassign}
        setShowReassign={setLaAssignShowReassign}
        selectedAuditorId={laAssignSelectedAuditorId}
        setSelectedAuditorId={setLaAssignSelectedAuditorId}
        showCoAuditor={laAssignShowCoAuditor}
        setShowCoAuditor={setLaAssignShowCoAuditor}
        additionalAuditorIds={laAssignAdditionalAuditorIds}
        setAdditionalAuditorIds={setLaAssignAdditionalAuditorIds}
        auditors={laAssignAuditors}
        teamInfo={laAssignTeamInfo}
        loadingTeam={laAssignLoadingTeam}
        conflictWarning={laAssignConflictWarning}
        conflictsMap={laAssignConflicts}
        checkingAvailability={laAssignCheckingAvailability}
        checkConflicts={checkConflictsForAssign}
        onSubmit={handleLAAssign}
      />

      {/* ══════════ REQUEST PREVIEW MODAL ══════════ */}
      <RequestPreviewModal
        visible={!!requestPreviewTarget}
        target={requestPreviewTarget}
        onClose={closeRequestFlow}
        overrideDate={laOverrideNewDate}
        conflictsMap={requestConflicts}
        setOverrideDate={setLaOverrideNewDate}
        overrideStart={laOverrideNewStart}
        setOverrideStart={setLaOverrideNewStart}
        overrideEnd={laOverrideNewEnd}
        setOverrideEnd={setLaOverrideNewEnd}
        overrideEndDate={laOverrideNewEndDate}
        setOverrideEndDate={setLaOverrideNewEndDate}
        onReject={() => {
          setRequestRejectionTarget(requestPreviewTarget);
          setRequestPreviewTarget(null);
          setRejectionReason("");
        }}
        onApprove={() => {
          setRequestApprovalTarget({
            ...requestPreviewTarget,
            requestedNewDate:
              laOverrideNewDate || requestPreviewTarget?.requestedNewDate,
            requestedNewStartTime:
              laOverrideNewStart || requestPreviewTarget?.requestedNewStartTime,
            requestedNewEndTime:
              laOverrideNewEnd || requestPreviewTarget?.requestedNewEndTime,
            requestedNewToDate:
              laOverrideNewEndDate || requestPreviewTarget?.requestedNewToDate,
          } as DailyScheduleDto);
          setRequestPreviewTarget(null);
          setApprovalComment("");
        }}
      />

      {/* ══════════ ASSIGN REQUEST MODAL ══════════ */}
      <AssignRequestModal
        visible={!!requestApprovalTarget}
        target={requestApprovalTarget}
        onClose={closeRequestFlow}
        submitting={submitting}
        teamInfo={teamInfo}
        loadingTeamMembers={loadingTeamMembers}
        approvalAuditors={approvalAuditors}
        showReassignOptions={showReassignOptions}
        setShowReassignOptions={setShowReassignOptions}
        selectedReassignAuditorId={selectedReassignAuditorId}
        setSelectedReassignAuditorId={setSelectedReassignAuditorId}
        showAddAnotherAuditor={showAddAnotherAuditor}
        setShowAddAnotherAuditor={setShowAddAnotherAuditor}
        additionalAuditorIds={additionalAuditorIds}
        setAdditionalAuditorIds={setAdditionalAuditorIds}
        conflictWarning={conflictWarning}
        checkingAvailability={checkingAvailability}
        checkConflicts={checkConflictsForReassign}
        overrideDate={laOverrideNewDate}
        overrideStart={laOverrideNewStart}
        overrideEnd={laOverrideNewEnd}
        overrideEndDate={laOverrideNewEndDate}
        approvalComment={approvalComment}
        setApprovalComment={setApprovalComment}
        onSubmit={handleApproveRequest}
      />

      {/* ══════════ REJECT REQUEST MODAL ══════════ */}
      <RejectRequestModal
        visible={!!requestRejectionTarget}
        target={requestRejectionTarget}
        onClose={closeRequestFlow}
        submitting={submitting}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        onSubmit={handleRejectRequest}
      />
    </View>
  );
};

export default OverdueScheduleQueue;
