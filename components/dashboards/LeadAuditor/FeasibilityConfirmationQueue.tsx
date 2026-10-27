// app/components/dashboards/LeadAuditor/FeasibilityConfirmationQueue.tsx
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
  UserPlus,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
// Desktop: flex fills container proportionally.
// Mobile: fixed pixel widths (minWidth values) → horizontal scroll, perfect alignment.
const COLUMN_MIN_WIDTHS = {
  dept: 160,
  elements: 150,
  week: 100,
  auditors: 180,
  auditees: 160,
  status: 130,
  actions: 110,
};
const TABLE_MIN_WIDTH = Object.values(COLUMN_MIN_WIDTHS).reduce(
  (a, b) => a + b,
  0,
); // 990

// Flex weights — desktop only
const COLUMN_FLEX = {
  dept: 1.6,
  elements: 1.5,
  week: 1.0,
  auditors: 2.0,
  auditees: 1.7,
  status: 1.3,
  actions: 1.1,
};

// ─── Types ─────────────────────────────────────────────────────────────

interface ScheduleDto {
  id: number;
  planYear: number;
  month: string;
  week?: string;
  department: string;
  auditorId?: number;
  auditorName?: string;
  coAuditorIdList?: number[];
  coAuditorNames?: string[];
  auditeeIdList?: number[];
  auditeeNames?: string[];
  auditElements?: string[];
  approvalStatus?: string;
  plantId?: number;
  plantName?: string;
}

interface ScheduleUser {
  id: number;
  firstName: string;
  lastName: string;
  role?: string;
  department?: string;
  plantId?: number;
}

interface MonthGroup {
  month: string;
  year: number;
  schedules: ScheduleDto[];
}

interface Props {
  selectedYear: number;
  onNavigateToForm5?: (year: number, month: string) => void;
}

type StatusTab = "PENDING" | "CONFIRMED" | "REJECTED";

// ─── Helper: normalize name arrays ─────────────────────────────────────

const normalizeNames = (raw: any): string[] => {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (!Array.isArray(value)) return [String(value)];
  return value
    .flat(1)
    .map((v: any) => (typeof v === "string" ? v : String(v)))
    .filter((v) => v.length > 0);
};

// ─── Component ─────────────────────────────────────────────────────────

const FeasibilityConfirmationQueue: React.FC<Props> = ({ selectedYear }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [statusTab, setStatusTab] = useState<StatusTab>("PENDING");

  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const [detailSchedule, setDetailSchedule] = useState<ScheduleDto | null>(
    null,
  );

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkComments, setBulkComments] = useState("");

  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const [reassignAuditors, setReassignAuditors] = useState<ScheduleUser[]>([]);
  const [reassignAuditees, setReassignAuditees] = useState<ScheduleUser[]>([]);
  const [loadingReassignData, setLoadingReassignData] = useState(false);

  const [reassignSchedule, setReassignSchedule] = useState<ScheduleDto | null>(
    null,
  );
  const [newPrimaryAuditorId, setNewPrimaryAuditorId] = useState<number | null>(
    null,
  );
  const [newCoAuditorIds, setNewCoAuditorIds] = useState<number[]>([]);
  const [newAuditeeIds, setNewAuditeeIds] = useState<number[]>([]);

  // ─── Fetch ────────────────────────────────────────────────────────

  const fetchPending = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/week-feasibility-queue/${selectedYear}`,
        { params: { userId: user.id } },
      );
      const data: ScheduleDto[] = Array.isArray(res.data) ? res.data : [];
      setSchedules(data);
      if (data.length > 0) {
        setExpandedMonths(new Set([data[0].month]));
      }
    } catch (error: any) {
      console.error("Failed to fetch feasibility queue:", error);
      addToast("Failed to load feasibility queue", "error");
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, addToast, user?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPending();
  }, [fetchPending]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  // ─── Split by status ─────────────────────────────────────────────

  const byStatus = useMemo(() => {
    const pending: ScheduleDto[] = [];
    const confirmed: ScheduleDto[] = [];
    const rejected: ScheduleDto[] = [];

    for (const s of schedules) {
      const st = (s.approvalStatus || "").toUpperCase();
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
    return byStatus.rejected;
  }, [statusTab, byStatus]);

  // ─── Grouping ─────────────────────────────────────────────────────

  const groupedByMonth: MonthGroup[] = useMemo(() => {
    const map = new Map<string, MonthGroup>();
    for (const s of visibleSchedules) {
      if (!map.has(s.month)) {
        map.set(s.month, { month: s.month, year: s.planYear, schedules: [] });
      }
      map.get(s.month)!.schedules.push(s);
    }
    return Array.from(map.values()).sort(
      (a, b) => monthOrder(a.month) - monthOrder(b.month),
    );
  }, [visibleSchedules]);

  // ─── Actions ──────────────────────────────────────────────────────

  const toggleExpand = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!user?.id) return;
    if (byStatus.pending.length === 0) {
      addToast("No pending schedules to confirm", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        byStatus.pending.map((s) =>
          axios.post(
            `${API_BASE_URL}/api/audit-schedule/schedule/${s.id}/confirm-feasibility?userId=${user.id}`,
            { comments: bulkComments || "" },
            {},
          ),
        ),
      );
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - okCount;
      if (okCount > 0) {
        addToast(
          `Feasibility confirmed for ${okCount} schedule(s)` +
            (failCount > 0 ? ` • ${failCount} failed` : ""),
          failCount > 0 ? "warning" : "success",
        );
      } else {
        addToast("Failed to confirm schedules", "error");
      }
      setBulkConfirmOpen(false);
      setBulkComments("");
      fetchPending();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to confirm schedules",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user?.id) return;
    if (!bulkRejectReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    if (byStatus.pending.length === 0) {
      addToast("No pending schedules to reject", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        byStatus.pending.map((s) =>
          axios.post(
            `${API_BASE_URL}/api/audit-schedule/schedule/${s.id}/reject-feasibility?userId=${user.id}`,
            { reason: bulkRejectReason },
            {},
          ),
        ),
      );
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - okCount;
      if (okCount > 0) {
        addToast(
          `Feasibility rejected for ${okCount} schedule(s)` +
            (failCount > 0 ? ` • ${failCount} failed` : ""),
          failCount > 0 ? "warning" : "success",
        );
      } else {
        addToast("Failed to reject schedules", "error");
      }
      setBulkRejectOpen(false);
      setBulkRejectReason("");
      fetchPending();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to reject schedules",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openReassign = async (s: ScheduleDto) => {
    setReassignSchedule(s);

    const toNumArray = (raw: any): number[] => {
      if (!raw) return [];
      let value = raw;
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          value = [value];
        }
      }
      if (!Array.isArray(value)) value = [value];
      return value
        .flat(1)
        .map((v: any) => Number(v))
        .filter((n: number) => !Number.isNaN(n));
    };

    setNewPrimaryAuditorId(s.auditorId ?? null);
    const coIds = toNumArray(s.coAuditorIdList);
    setNewCoAuditorIds(coIds.filter((id) => id !== s.auditorId));
    setNewAuditeeIds(toNumArray(s.auditeeIdList));
    setReassignAuditors([]);
    setReassignAuditees([]);

    if (!s.plantId) {
      addToast(
        "Schedule has no plant — cannot load reassignment options",
        "error",
      );
      return;
    }
    const elements = s.auditElements ?? [];

    try {
      setLoadingReassignData(true);
      const auditorsParams: Record<string, any> = {
        plantId: s.plantId,
        auditElements: JSON.stringify(elements),
        planYear: s.planYear,
        month: s.month,
      };
      const auditorsRes = await axios.get(
        `${API_BASE_URL}/api/audit-schedule/fully-competent-auditors/for-schedule`,
        { params: auditorsParams },
      );
      const auditorsList: ScheduleUser[] = Array.isArray(auditorsRes.data)
        ? auditorsRes.data
        : [];
      const filteredAuditors = auditorsList.filter(
        (a) => a.role === "AUDITOR" || a.role === "LEAD_AUDITOR",
      );
      setReassignAuditors(filteredAuditors);

      let auditeesList: ScheduleUser[] = [];
      if (s.department) {
        if (elements.length > 0) {
          const auditeesRes = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/competent-auditees/by-department/${encodeURIComponent(s.department)}`,
            {
              params: {
                plantId: s.plantId,
                auditElementsJson: JSON.stringify(elements),
              },
            },
          );
          auditeesList = Array.isArray(auditeesRes.data)
            ? auditeesRes.data
            : [];
        } else {
          const auditeesRes = await axios.get(
            `${API_BASE_URL}/api/audit-schedule/auditees/by-department/${encodeURIComponent(s.department)}`,
            { params: { plantId: s.plantId } },
          );
          auditeesList = Array.isArray(auditeesRes.data)
            ? auditeesRes.data
            : [];
        }
      }
      setReassignAuditees(auditeesList);
    } catch (err: any) {
      console.error("Failed to load reassign options:", err);
      addToast("Failed to load reassignment options", "error");
    } finally {
      setLoadingReassignData(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignSchedule || !user?.id) return;
    if (!newPrimaryAuditorId) {
      addToast("Please select a primary auditor", "error");
      return;
    }
    setSubmitting(true);
    try {
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
      fetchPending();
    } catch (error: any) {
      addToast(error.response?.data?.message || "Failed to reassign", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status badge renderer (inline) ──────────────────────────────

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

  // ─── Table Header ────────────────────────────────────────────────

  const renderTableHeader = () => (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
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
        flex={COLUMN_FLEX.week}
        minWidth={COLUMN_MIN_WIDTHS.week}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.week}
        label="Week / Period"
      />
      <HeaderCell
        flex={COLUMN_FLEX.auditors}
        minWidth={COLUMN_MIN_WIDTHS.auditors}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.auditors}
        label="Team Auditors"
      />
      <HeaderCell
        flex={COLUMN_FLEX.auditees}
        minWidth={COLUMN_MIN_WIDTHS.auditees}
        fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.auditees}
        label="Auditees"
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

  // ─── Table Row ────────────────────────────────────────────────────

  const renderScheduleRow = (s: ScheduleDto) => {
    const status = (s.approvalStatus || "").toUpperCase();
    const isPending = status === "PENDING_LA_CONFIRMATION";
    const isConfirmed =
      status === "CONFIRMED_BY_LA" ||
      status === "APPROVED" ||
      status === "REJECTED";

    const teamNames = normalizeNames(s.coAuditorNames);
    const auditorDisplay = teamNames.length === 0 ? "—" : teamNames.join(", ");
    const auditeeNames = normalizeNames(s.auditeeNames);
    const auditeeDisplay =
      auditeeNames.length === 0 ? "—" : auditeeNames.join(", ");
    const auditElements = normalizeNames(s.auditElements);
    const auditElementsDisplay =
      auditElements.length === 0 ? "—" : auditElements.join(", ");

    return (
      <View
        key={s.id}
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderSubtle,
          backgroundColor: COLORS.card,
        }}
      >
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
            numberOfLines={2}
          >
            {auditElementsDisplay}
          </Text>
        </BodyCell>

        <BodyCell
          flex={COLUMN_FLEX.week}
          minWidth={COLUMN_MIN_WIDTHS.week}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.week}
        >
          <Text style={{ fontSize: 12, color: COLORS.textValue }}>
            {s.week || "—"}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
            {s.month} {s.planYear}
          </Text>
        </BodyCell>

        <BodyCell
          flex={COLUMN_FLEX.auditors}
          minWidth={COLUMN_MIN_WIDTHS.auditors}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.auditors}
        >
          <Text
            style={{ fontSize: 12, color: COLORS.text, fontWeight: "500" }}
            numberOfLines={2}
          >
            {auditorDisplay}
          </Text>
        </BodyCell>

        <BodyCell
          flex={COLUMN_FLEX.auditees}
          minWidth={COLUMN_MIN_WIDTHS.auditees}
          fixedWidth={isDesktop ? undefined : COLUMN_MIN_WIDTHS.auditees}
        >
          <Text
            style={{ fontSize: 12, color: COLORS.textValue }}
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
          {renderStatusBadges(status)}
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
            {isPending && (
              <HoverOutlineButton
                title="Reassign"
                icon={UserPlus}
                variant="primary"
                onPress={() => openReassign(s)}
              />
            )}
            {isConfirmed && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: COLORS.primaryDark,
                  alignSelf: "center",
                }}
              >
                ✓ Confirmed
              </Text>
            )}
            {status === "FEASIBILITY_REJECTED" && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: COLORS.stateErrorText,
                  alignSelf: "center",
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

  // ─── Main render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>
          Loading feasibility queue...
        </Text>
      </View>
    );
  }

  const pendingCount = byStatus.pending.length;

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
            Weekly Schedule Confirmation
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            {byStatus.pending.length} pending • {byStatus.confirmed.length}{" "}
            confirmed • {byStatus.rejected.length} rejected for {selectedYear}
          </Text>
        </View>
      </View>

      {/* Status tabs */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          marginBottom: 16,
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

      {/* Empty state per tab */}
      {visibleSchedules.length === 0 ? (
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
              "No week schedules awaiting your feasibility confirmation."}
            {statusTab === "CONFIRMED" &&
              "Schedules you confirm will appear here."}
            {statusTab === "REJECTED" &&
              "Schedules you reject will appear here."}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 16 }}>
            {groupedByMonth.map((group) => {
              const expanded = expandedMonths.has(group.month);
              const allDepts = new Set(
                group.schedules.map((s) => s.department),
              );
              const allAuditors = new Set(
                group.schedules.map((s) => s.auditorId).filter(Boolean),
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
                  }}
                >
                  {/* Month group header */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(group.month)}
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
                          {group.schedules.length} schedule
                          {group.schedules.length !== 1 ? "s" : ""} •{" "}
                          {allDepts.size} dept • {allAuditors.size} auditor
                          {allAuditors.size !== 1 ? "s" : ""}
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
                              {group.schedules.length} pending
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
                              {group.schedules.length} confirmed
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
                              {group.schedules.length} rejected
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
                      <View style={{ width: "100%" }}>
                        {renderTableHeader()}
                        {group.schedules.map(renderScheduleRow)}
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
                          {group.schedules.map(renderScheduleRow)}
                        </View>
                      </ScrollView>
                    ))}
                </View>
              );
            })}
          </View>

          {/* Bulk bar */}
          {statusTab === "PENDING" && pendingCount > 0 && (
            <View
              style={{
                marginTop: 20,
                padding: 16,
                backgroundColor: COLORS.card,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 14,
                flexDirection: isDesktop ? "row" : "column",
                alignItems: isDesktop ? "center" : "stretch",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: COLORS.text,
                  }}
                >
                  Bulk action
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginTop: 2,
                  }}
                >
                  Applies to all {pendingCount} pending schedule
                  {pendingCount !== 1 ? "s" : ""} for {selectedYear}.
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: isDesktop ? "flex-end" : "space-between",
                }}
              >
                <HoverOutlineButton
                  title="Reject All"
                  icon={X}
                  variant="danger"
                  disabled={submitting}
                  onPress={() => {
                    setBulkRejectReason("");
                    setBulkRejectOpen(true);
                  }}
                />
                <HoverOutlineButton
                  title="Confirm All"
                  icon={Check}
                  variant="primary"
                  disabled={submitting}
                  onPress={() => {
                    setBulkComments("");
                    setBulkConfirmOpen(true);
                  }}
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* ─── DETAIL MODAL ──────────────────────────────────────── */}
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
                <Text style={modalStyles.headerTitle}>Schedule Detail</Text>
                <TouchableOpacity onPress={() => setDetailSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 500 }}>
                <DetailRow
                  label="Department"
                  value={detailSchedule.department}
                />
                <DetailRow
                  label="Month / Week"
                  value={`${detailSchedule.month} ${detailSchedule.planYear} • ${detailSchedule.week || "—"}`}
                />
                <DetailRow
                  label="Audit Elements"
                  value={
                    normalizeNames(detailSchedule.auditElements).join(", ") ||
                    "—"
                  }
                />
                <DetailRow
                  label="Team Auditors"
                  value={
                    normalizeNames(detailSchedule.coAuditorNames).join(", ") ||
                    "—"
                  }
                />
                <DetailRow
                  label="Auditees"
                  value={
                    normalizeNames(detailSchedule.auditeeNames).join(", ") ||
                    "—"
                  }
                />
                <DetailRow
                  label="Plant"
                  value={detailSchedule.plantName || "—"}
                />
                <DetailRow
                  label="Approval Status"
                  value={detailSchedule.approvalStatus || "—"}
                />
              </ScrollView>
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={() => setDetailSchedule(null)}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── BULK CONFIRM MODAL ────────────────────────────────── */}
      {bulkConfirmOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setBulkConfirmOpen(false)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Confirm All Feasibility
                </Text>
                <TouchableOpacity onPress={() => setBulkConfirmOpen(false)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={{ fontSize: 13, color: COLORS.text }}>
                  Confirm all{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {pendingCount} pending schedule
                    {pendingCount !== 1 ? "s" : ""}
                  </Text>{" "}
                  for {selectedYear}?
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginTop: 8,
                    marginBottom: 14,
                  }}
                >
                  This will forward every pending schedule to Top Management for
                  approval.
                </Text>
                <TextInput
                  style={modalStyles.textarea}
                  value={bulkComments}
                  onChangeText={setBulkComments}
                  placeholder="Optional comments..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!submitting}
                />
              </View>
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={() => setBulkConfirmOpen(false)}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBulkConfirm}
                  disabled={submitting}
                  style={[
                    modalStyles.primaryBtn,
                    { backgroundColor: COLORS.primary },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Check size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting ? "Confirming..." : "Confirm All"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── BULK REJECT MODAL ─────────────────────────────────── */}
      {bulkRejectOpen && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => !submitting && setBulkRejectOpen(false)}
        >
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.headerTitle}>
                  Reject All Feasibility
                </Text>
                <TouchableOpacity onPress={() => setBulkRejectOpen(false)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    padding: 10,
                    backgroundColor: COLORS.stateErrorBg,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 10,
                    marginBottom: 14,
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
                    Rejecting{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {pendingCount} pending schedule
                      {pendingCount !== 1 ? "s" : ""}
                    </Text>
                    . The Audit Manager will need to rework the plan.
                  </Text>
                </View>
                <TextInput
                  style={modalStyles.textarea}
                  value={bulkRejectReason}
                  onChangeText={setBulkRejectReason}
                  placeholder="Explain why these schedules are not feasible..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!submitting}
                />
              </View>
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={() => setBulkRejectOpen(false)}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBulkReject}
                  disabled={submitting || !bulkRejectReason.trim()}
                  style={[
                    modalStyles.primaryBtn,
                    {
                      backgroundColor:
                        submitting || !bulkRejectReason.trim()
                          ? "#94A3B8"
                          : COLORS.stateErrorText,
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <X size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting ? "Rejecting..." : "Reject All"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── REASSIGN MODAL ────────────────────────────────────── */}
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
                <Text style={modalStyles.headerTitle}>Reassign Schedule</Text>
                <TouchableOpacity onPress={() => setReassignSchedule(null)}>
                  <X size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 450, padding: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginBottom: 12,
                  }}
                >
                  {reassignSchedule.department} • {reassignSchedule.week} •{" "}
                  {reassignSchedule.month} {reassignSchedule.planYear}
                </Text>

                <Text style={modalStyles.sectionLabel}>Primary Auditor</Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {loadingReassignData ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditors.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10,
                      }}
                    >
                      No competent auditors found for this schedule.
                    </Text>
                  ) : (
                    reassignAuditors.map((a) => {
                      const selected = newPrimaryAuditorId === Number(a.id);
                      return (
                        <TouchableOpacity
                          key={`primary-${a.id}`}
                          onPress={() => setNewPrimaryAuditorId(Number(a.id))}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderWidth: 1,
                            borderColor: selected
                              ? COLORS.primary
                              : COLORS.border,
                            backgroundColor: selected
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
                              borderColor: selected
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
                                  backgroundColor: COLORS.primary,
                                }}
                              />
                            )}
                          </View>
                          <Text style={{ fontSize: 13 }}>
                            {a.firstName} {a.lastName}
                          </Text>
                          {a.role && (
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
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {loadingReassignData ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditors.filter(
                      (a) => Number(a.id) !== newPrimaryAuditorId,
                    ).length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10,
                      }}
                    >
                      No other auditors available as co-auditors.
                    </Text>
                  ) : (
                    reassignAuditors
                      .filter((a) => Number(a.id) !== newPrimaryAuditorId)
                      .map((a) => {
                        const checked = newCoAuditorIds.includes(Number(a.id));
                        return (
                          <TouchableOpacity
                            key={`co-${a.id}`}
                            onPress={() =>
                              setNewCoAuditorIds((prev) =>
                                checked
                                  ? prev.filter((x) => x !== Number(a.id))
                                  : [...prev, Number(a.id)],
                              )
                            }
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              padding: 10,
                              borderWidth: 1,
                              borderColor: checked
                                ? COLORS.primary
                                : COLORS.border,
                              backgroundColor: checked
                                ? COLORS.primaryLight
                                : "#FFF",
                              borderRadius: 8,
                            }}
                          >
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                borderWidth: 2,
                                borderColor: checked
                                  ? COLORS.primary
                                  : "#CBD5E1",
                                backgroundColor: checked
                                  ? COLORS.primary
                                  : "#FFF",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8,
                              }}
                            >
                              {checked && <Check size={12} color="#FFF" />}
                            </View>
                            <Text style={{ fontSize: 13 }}>
                              {a.firstName} {a.lastName}
                            </Text>
                            {a.role && (
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

                <Text style={modalStyles.sectionLabel}>Auditees</Text>
                <View style={{ gap: 6 }}>
                  {loadingReassignData ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditees.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10,
                      }}
                    >
                      No competent auditees found for this department.
                    </Text>
                  ) : (
                    reassignAuditees.map((a) => {
                      const checked = newAuditeeIds.includes(Number(a.id));
                      return (
                        <TouchableOpacity
                          key={a.id}
                          onPress={() => {
                            setNewAuditeeIds((prev) =>
                              checked
                                ? prev.filter((x) => x !== Number(a.id))
                                : [...prev, Number(a.id)],
                            );
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 10,
                            borderWidth: 1,
                            borderColor: checked
                              ? COLORS.primary
                              : COLORS.border,
                            backgroundColor: checked
                              ? COLORS.primaryLight
                              : "#FFF",
                            borderRadius: 8,
                          }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              borderWidth: 2,
                              borderColor: checked ? COLORS.primary : "#CBD5E1",
                              backgroundColor: checked
                                ? COLORS.primary
                                : "#FFF",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 8,
                            }}
                          >
                            {checked && <Check size={12} color="#FFF" />}
                          </View>
                          <Text style={{ fontSize: 13 }}>
                            {a.firstName} {a.lastName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </ScrollView>
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  onPress={() => setReassignSchedule(null)}
                  disabled={submitting}
                  style={modalStyles.secondaryBtn}
                >
                  <Text style={modalStyles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReassign}
                  disabled={submitting}
                  style={[
                    modalStyles.primaryBtn,
                    { backgroundColor: COLORS.primaryDark },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <UserPlus size={14} color="#FFF" />
                  )}
                  <Text style={modalStyles.primaryBtnText}>
                    {submitting ? "Saving..." : "Save Reassignment"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
      ...(fixedWidth != null ? { width: fixedWidth } : { flex, minWidth }),
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
      ...(fixedWidth != null ? { width: fixedWidth } : { flex, minWidth }),
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

// ─── Small helpers ─────────────────────────────────────────────────

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

const ActionChip = ({
  label,
  icon,
  bgColor,
  borderColor,
  textColor,
  onPress,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor,
      backgroundColor: bgColor,
    }}
  >
    {icon}
    <Text style={{ fontSize: 11, fontWeight: "600", color: textColor }}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Hover-aware Outline Button (matches Form4View OutlineButton) ───

const HoverOutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  variant = "default", // "default" | "primary" | "danger"
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "primary" | "danger";
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled && !loading;

  // Variant-based colors (matching Form4View's monochromatic palette)
  const variantColors = {
    default: {
      hoverBorder: "#2563EB",
      hoverText: "#2563EB",
      hoverIcon: "#2563EB",
      hoverBg: "rgba(37, 99, 235, 0.08)",
      baseBorder: "#D1D5DB",
      baseText: "#111827",
      baseIcon: "#6B7280",
    },
    primary: {
      hoverBorder: COLORS.primaryDark,
      hoverText: COLORS.primaryDark,
      hoverIcon: COLORS.primaryDark,
      hoverBg: "rgba(30, 58, 138, 0.1)",
      baseBorder: COLORS.primaryBorder,
      baseText: COLORS.primaryDark,
      baseIcon: COLORS.primary,
    },
    danger: {
      hoverBorder: COLORS.stateErrorText,
      hoverText: COLORS.stateErrorText,
      hoverIcon: COLORS.stateErrorText,
      hoverBg: "rgba(71, 85, 105, 0.1)",
      baseBorder: COLORS.border,
      baseText: COLORS.stateErrorText,
      baseIcon: COLORS.stateErrorText,
    },
  };

  const v = variantColors[variant] || variantColors.default;

  const borderColor = isHoveredAndEnabled ? v.hoverBorder : v.baseBorder;
  const textColor = isHoveredAndEnabled ? v.hoverText : v.baseText;
  const iconColor = isHoveredAndEnabled ? v.hoverIcon : v.baseIcon;
  const backgroundColor = isHoveredAndEnabled ? v.hoverBg : "transparent";

  // Web-only hover props
  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && !loading && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && !loading && setIsHovered(true)}
      onPressOut={() => !disabled && !loading && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        opacity: disabled ? 0.5 : 1,
        // Smooth transition (web)
        ...(Platform.OS === "web"
          ? {
              transitionProperty: "all",
              transitionDuration: "150ms",
              transitionTimingFunction: "ease-in-out",
            }
          : {}),
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : Icon ? (
        <Icon size={14} color={iconColor} />
      ) : null}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: textColor,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: "row",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
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
    padding: 10,
    overflow: "hidden" as const,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.text,
  },
  textarea: {
    width: "100%" as const,
    minHeight: 100,
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
    borderTopColor: "#F1F5F9",
    backgroundColor: COLORS.bg,
  },
  primaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFF",
  },
  secondaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFF",
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
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
};

export default FeasibilityConfirmationQueue;
