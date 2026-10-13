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
  X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1F2937",
  textMuted: "#6B7280",
  accent: "#3B82F6",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE" };

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

// ─── Helper: normalize name arrays (handles strings, JSON strings, nested) ─

const normalizeNames = (raw: any): string[] => {
  if (!raw) return [];

  let value = raw;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      value = parsed;
    } catch {
      return [trimmed];
    }
  }

  if (!Array.isArray(value)) {
    return [String(value)];
  }

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

  // ✅ Tab state
  const [statusTab, setStatusTab] = useState<StatusTab>("PENDING");

  const [schedules, setSchedules] = useState<ScheduleDto[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  // Detail modal
  const [detailSchedule, setDetailSchedule] = useState<ScheduleDto | null>(
    null,
  );

  // ✅ Bulk confirm modal
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkComments, setBulkComments] = useState("");

  // ✅ Bulk reject modal
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Reassign modal — per-schedule scoped
  const [reassignAuditors, setReassignAuditors] = useState<ScheduleUser[]>([]);
  const [reassignAuditees, setReassignAuditees] = useState<ScheduleUser[]>([]);
  const [loadingReassignData, setLoadingReassignData] = useState(false);

  // Reassign modal
  const [reassignSchedule, setReassignSchedule] = useState<ScheduleDto | null>(
    null,
  );
  // ✅ NEW: primary auditor separated from co-auditors
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

  // ─── Split by status for tabs ────────────────────────────────────

  const byStatus = useMemo(() => {
    const pending: ScheduleDto[] = [];
    const confirmed: ScheduleDto[] = [];
    const rejected: ScheduleDto[] = [];

    for (const s of schedules) {
      const st = (s.approvalStatus || "").toUpperCase();
      if (st === "PENDING_LA_CONFIRMATION") {
        pending.push(s);
      } else if (
        st === "CONFIRMED_BY_LA" ||
        st === "APPROVED" ||
        st === "REJECTED"
      ) {
        confirmed.push(s);
      } else if (st === "FEASIBILITY_REJECTED") {
        rejected.push(s);
      }
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

  // ✅ Bulk confirm — confirms every PENDING schedule in the current tab
  const handleBulkConfirm = async () => {
    if (!user?.id) return;
    if (byStatus.pending.length === 0) {
      addToast("No pending schedules to confirm", "warning");
      return;
    }

    setSubmitting(true);
    try {
      // Fire confirm-feasibility for each pending schedule sequentially
      // (backend endpoint is per-schedule)
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

  // ✅ Bulk reject — rejects every PENDING schedule in the current tab
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

    // ✅ FIX: Primary comes from auditorId — NEVER falls back to coAuditorIdList
    setNewPrimaryAuditorId(s.auditorId ?? null);

    // ✅ FIX: Co-auditors come from coAuditorIdList ONLY (exclude primary to be safe)
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
        month: s.month };
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
                auditElementsJson: JSON.stringify(elements) } },
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

    // ✅ Validation — primary auditor required
    if (!newPrimaryAuditorId) {
      addToast("Please select a primary auditor", "error");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/audit-schedule/schedule/${reassignSchedule.id}/reassign?userId=${user.id}`,
        {
          auditorId: newPrimaryAuditorId, // ✅ explicit primary
          coAuditorIds: newCoAuditorIds, // ✅ explicit co-auditors
          auditeeIds: newAuditeeIds },
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

  // ─── Render helpers ──────────────────────────────────────────────

  const renderScheduleRow = (s: ScheduleDto) => {
    const status = (s.approvalStatus || "").toUpperCase();
    const isPending = status === "PENDING_LA_CONFIRMATION";
    const isConfirmed =
      status === "CONFIRMED_BY_LA" ||
      status === "APPROVED" ||
      status === "REJECTED";

    // ✅ Backend now returns complete team (primary + co-auditors) in coAuditorNames
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
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          backgroundColor: "#FFFFFF" }}
      >
        <View
          style={{
            flexDirection: isDesktop ? "row" : "column",
            gap: isDesktop ? 12 : 8,
            alignItems: isDesktop ? "center" : "flex-start" }}
        >
          {/* Left: dept + week + status badge */}
          <View style={{ flex: isDesktop ? 2 : undefined }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: COLORS.text }}
              >
                {s.department}
              </Text>

              {isPending && (
                <View style={badgeStyle(COLORS.warningBorder)}>
                  <Clock size={10} color="#92400E" />
                  <Text style={badgeTextStyle("#92400E")}>Pending</Text>
                </View>
              )}
              {status === "CONFIRMED_BY_LA" && (
                <View style={badgeStyle(COLORS.successBorder)}>
                  <Check size={10} color="#065F46" />
                  <Text style={badgeTextStyle("#065F46")}>Confirmed by LA</Text>
                </View>
              )}
              {status === "CONFIRMED_BY_LA" && (
                <View style={badgeStyle(COLORS.warningBorder)}>
                  <AlertCircle size={10} color="#92400E" />
                  <Text style={badgeTextStyle("#92400E")}>Awaiting TM</Text>
                </View>
              )}
              {status === "APPROVED" && (
                <>
                  <View style={badgeStyle(COLORS.successBorder)}>
                    <Check size={10} color="#065F46" />
                    <Text style={badgeTextStyle("#065F46")}>
                      Confirmed by LA
                    </Text>
                  </View>
                  <View style={badgeStyle("#D1FAE5")}>
                    <Check size={10} color="#047857" />
                    <Text style={badgeTextStyle("#047857")}>TM Approved</Text>
                  </View>
                </>
              )}
              {status === "REJECTED" && (
                <>
                  <View style={badgeStyle(COLORS.successBorder)}>
                    <Check size={10} color="#065F46" />
                    <Text style={badgeTextStyle("#065F46")}>
                      Confirmed by LA
                    </Text>
                  </View>
                  <View style={badgeStyle("#FEE2E2")}>
                    <X size={10} color="#B91C1C" />
                    <Text style={badgeTextStyle("#B91C1C")}>TM Rejected</Text>
                  </View>
                </>
              )}
              {status === "FEASIBILITY_REJECTED" && (
                <View style={badgeStyle(COLORS.errorBorder)}>
                  <X size={10} color="#991B1B" />
                  <Text style={badgeTextStyle("#991B1B")}>Rejected</Text>
                </View>
              )}
            </View>

            {/* ✅ NEW: Audit Elements */}
            <Text
              style={{ fontSize: 12, fontWeight: "500", color: COLORS.text }}
            >
              Audit Elements : {auditElementsDisplay}
            </Text>

            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}
            >
              Week: {s.week || "—"} • {s.month} {s.planYear}
            </Text>
          </View>

          {/* Mid: auditor + auditees */}
          <View style={{ flex: isDesktop ? 3 : undefined }}>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
              Team Auditors
            </Text>
            <Text
              style={{ fontSize: 12, color: COLORS.text, fontWeight: "500" }}
            >
              {auditorDisplay}
            </Text>

            <Text
              style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}
            >
              Auditees
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.text }}>
              {auditeeDisplay}
            </Text>
          </View>

          {/* Right: actions — ✅ only View + Reassign now */}
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              flexWrap: "wrap",
              flex: isDesktop ? 2 : undefined,
              justifyContent: isDesktop ? "flex-end" : "flex-start" }}
          >
            <ActionChip
              label="View"
              icon={<FileText size={12} color={COLORS.accent} />}
              borderColor={COLORS.accentBorder}
              bgColor={COLORS.accentLight}
              textColor={COLORS.accent}
              onPress={() => setDetailSchedule(s)}
            />

            {isPending && (
              <ActionChip
                label="Reassign"
                icon={<UserPlus size={12} color="#7C3AED" />}
                borderColor="#DDD6FE"
                bgColor="#F5F3FF"
                textColor="#7C3AED"
                onPress={() => openReassign(s)}
              />
            )}

            {isConfirmed && (
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#065F46" }}
              >
                ✓ Confirmed
              </Text>
            )}
            {status === "FEASIBILITY_REJECTED" && (
              <Text
                style={{ fontSize: 11, fontWeight: "600", color: "#991B1B" }}
              >
                ✗ Rejected
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
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
          gap: 12 }}
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
          marginBottom: 16 }}
      >
        {(
          [
            {
              key: "PENDING",
              label: "Schedules",
              count: byStatus.pending.length,
              color: COLORS.warning },
            {
              key: "CONFIRMED",
              label: "Confirmed",
              count: byStatus.confirmed.length,
              color: COLORS.success },
            {
              key: "REJECTED",
              label: "Rejected",
              count: byStatus.rejected.length,
              color: COLORS.error },
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
                borderBottomColor: tab.color }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? tab.color : COLORS.textMuted }}
              >
                {tab.label}
              </Text>
              <View
                style={{
                  minWidth: 22,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  backgroundColor: active ? tab.color : "#E2E8F0" }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: active ? "#FFF" : COLORS.textMuted,
                    textAlign: "center" }}
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
            borderColor: COLORS.border }}
        >
          <CheckCircle size={48} color={COLORS.success} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: COLORS.text,
              marginTop: 16 }}
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
              textAlign: "center" }}
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
                    overflow: "hidden" }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(group.month)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      backgroundColor: COLORS.purpleLight,
                      borderBottomWidth: expanded ? 1 : 0,
                      borderBottomColor: COLORS.purpleBorder }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10 }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: "#FFF",
                          borderWidth: 1,
                          borderColor: COLORS.purpleBorder,
                          alignItems: "center",
                          justifyContent: "center" }}
                      >
                        <Calendar size={18} color={COLORS.purple} />
                      </View>
                      <View>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "700",
                            color: COLORS.purple }}
                        >
                          {group.month} {group.year}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.textMuted,
                            marginTop: 2 }}
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
                        gap: 8 }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          backgroundColor:
                            statusTab === "PENDING"
                              ? COLORS.warningLight
                              : statusTab === "CONFIRMED"
                                ? COLORS.successLight
                                : COLORS.errorLight,
                          borderWidth: 1,
                          borderColor:
                            statusTab === "PENDING"
                              ? COLORS.warningBorder
                              : statusTab === "CONFIRMED"
                                ? COLORS.successBorder
                                : COLORS.errorBorder,
                          borderRadius: 20 }}
                      >
                        {statusTab === "PENDING" && (
                          <>
                            <Clock size={11} color={COLORS.warning} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: "#92400E" }}
                            >
                              {group.schedules.length} pending
                            </Text>
                          </>
                        )}
                        {statusTab === "CONFIRMED" && (
                          <>
                            <Check size={11} color={COLORS.success} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: "#065F46" }}
                            >
                              {group.schedules.length} confirmed
                            </Text>
                          </>
                        )}
                        {statusTab === "REJECTED" && (
                          <>
                            <X size={11} color={COLORS.error} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "600",
                                color: "#991B1B" }}
                            >
                              {group.schedules.length} rejected
                            </Text>
                          </>
                        )}
                      </View>
                      {expanded ? (
                        <ChevronDown size={20} color={COLORS.purple} />
                      ) : (
                        <ChevronRight size={20} color={COLORS.purple} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <View>{group.schedules.map(renderScheduleRow)}</View>
                  )}
                </View>
              );
            })}
          </View>

          {/* ✅ Bulk Confirm / Reject bar — only on the PENDING tab */}
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
                gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: COLORS.text }}
                >
                  Bulk action
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginTop: 2 }}
                >
                  Applies to all {pendingCount} pending schedule
                  {pendingCount !== 1 ? "s" : ""} for {selectedYear}.
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  justifyContent: isDesktop ? "flex-end" : "space-between" }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setBulkRejectReason("");
                    setBulkRejectOpen(true);
                  }}
                  disabled={submitting}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.errorBorder,
                    backgroundColor: COLORS.errorLight }}
                >
                  <X size={14} color={COLORS.error} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: COLORS.error }}
                  >
                    Reject All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setBulkComments("");
                    setBulkConfirmOpen(true);
                  }}
                  disabled={submitting}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: COLORS.success }}
                >
                  <Check size={14} color="#FFF" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#FFF" }}
                  >
                    Confirm All
                  </Text>
                </TouchableOpacity>
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
                  <X size={20} color="#6B7280" />
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
                  onPress={() => {
                    openReassign(detailSchedule);
                    setDetailSchedule(null);
                  }}
                  style={modalStyles.secondaryBtn}
                >
                  <UserPlus size={14} color="#7C3AED" />
                  <Text style={modalStyles.secondaryBtnText}>Reassign</Text>
                </TouchableOpacity>
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
                  <X size={20} color="#6B7280" />
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
                    marginBottom: 14 }}
                >
                  This will forward every pending schedule to Top Management for
                  approval.
                </Text>
                <TextInput
                  style={modalStyles.textarea}
                  value={bulkComments}
                  onChangeText={setBulkComments}
                  placeholder="Optional comments..."
                  placeholderTextColor="#9CA3AF"
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
                    { backgroundColor: COLORS.success },
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
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    padding: 10,
                    backgroundColor: COLORS.errorLight,
                    borderWidth: 1,
                    borderColor: COLORS.errorBorder,
                    borderRadius: 10,
                    marginBottom: 14 }}
                >
                  <AlertCircle size={16} color={COLORS.error} />
                  <Text style={{ flex: 1, fontSize: 12, color: "#991B1B" }}>
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
                  placeholderTextColor="#9CA3AF"
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
                          : COLORS.error },
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
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 450, padding: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginBottom: 12 }}
                >
                  {reassignSchedule.department} • {reassignSchedule.week} •{" "}
                  {reassignSchedule.month} {reassignSchedule.planYear}
                </Text>

                {/* ═══════ PRIMARY AUDITOR (radio — single select) ═══════ */}
                <Text style={modalStyles.sectionLabel}>Primary Auditor</Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {loadingReassignData ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.accent}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditors.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10 }}
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
                              ? COLORS.accent
                              : COLORS.border,
                            backgroundColor: selected
                              ? COLORS.accentLight
                              : "#FFF",
                            borderRadius: 8 }}
                        >
                          {/* Radio circle */}
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              borderWidth: 2,
                              borderColor: selected ? COLORS.accent : "#CBD5E1",
                              backgroundColor: "#FFF",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 8 }}
                          >
                            {selected && (
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: COLORS.accent }}
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
                                marginLeft: 6 }}
                            >
                              {a.role}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* ═══════ CO-AUDITORS (checkbox — multi select) ═══════ */}
                <Text style={modalStyles.sectionLabel}>Co-Auditors (Team)</Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {loadingReassignData ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.accent}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditors.filter(
                      (a) => Number(a.id) !== newPrimaryAuditorId,
                    ).length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10 }}
                    >
                      No other auditors available as co-auditors.
                    </Text>
                  ) : (
                    reassignAuditors
                      .filter((a) => Number(a.id) !== newPrimaryAuditorId) // exclude primary
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
                                ? COLORS.accent
                                : COLORS.border,
                              backgroundColor: checked
                                ? COLORS.accentLight
                                : "#FFF",
                              borderRadius: 8 }}
                          >
                            {/* Checkbox square */}
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                borderWidth: 2,
                                borderColor: checked
                                  ? COLORS.accent
                                  : "#CBD5E1",
                                backgroundColor: checked
                                  ? COLORS.accent
                                  : "#FFF",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8 }}
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
                                  marginLeft: 6 }}
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
                      color={COLORS.accent}
                      style={{ marginVertical: 20 }}
                    />
                  ) : reassignAuditees.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textMuted,
                        padding: 10 }}
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
                              ? COLORS.accent
                              : COLORS.border,
                            backgroundColor: checked
                              ? COLORS.accentLight
                              : "#FFF",
                            borderRadius: 8 }}
                        >
                          <View
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              borderWidth: 2,
                              borderColor: checked ? COLORS.accent : "#CBD5E1",
                              backgroundColor: checked ? COLORS.accent : "#FFF",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 8 }}
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
                    { backgroundColor: "#7C3AED" },
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

const badgeStyle = (backgroundColor: string) => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 999,
  backgroundColor });

const badgeTextStyle = (color: string) => ({
  fontSize: 10,
  fontWeight: "700" as const,
  color });

const ActionChip = ({
  label,
  icon,
  bgColor,
  borderColor,
  textColor,
  onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor,
      backgroundColor: bgColor }}
  >
    {icon}
    <Text style={{ fontSize: 11, fontWeight: "600", color: textColor }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: "row",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9" }}
  >
    <Text
      style={{ width: 130, fontSize: 12, color: "#6B7280", fontWeight: "500" }}
    >
      {label}
    </Text>
    <Text style={{ flex: 1, fontSize: 13, color: "#1F2937" }}>{value}</Text>
  </View>
);

const modalStyles = {
  backdrop: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 20 },
  sheet: {
    width: "100%" as const,
    maxWidth: 480,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 10,
    overflow: "hidden" as const },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#1F2937" },
  textarea: {
    width: "100%" as const,
    minHeight: 100,
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    fontSize: 13,
    textAlignVertical: "top" as const,
    color: "#1F2937" },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#F8FAFC" },
  primaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10 },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFF" },
  secondaryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFF" },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#1F2937" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8 } };

export default FeasibilityConfirmationQueue;
