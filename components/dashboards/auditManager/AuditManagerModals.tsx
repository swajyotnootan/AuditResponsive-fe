import { useAuth } from "@/components/context/AuthContext";
import { apiClient } from "@/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import {
  Calendar,
  Check,
  MessageSquare,
  UserCheck,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, styles } from "./AuditManagerStyles";

const APPROVAL_PICKER_STYLE: any = {
  height: 48,
  width: "100%",
  borderWidth: 0,
  borderColor: "transparent",
  backgroundColor: "transparent",
  color: COLORS.textMain,
  paddingHorizontal: 16,
  outline: "none",
};

// ═══════════════════════════════════════════════════════════════════════
// ViewRequestModal — unchanged
// ═══════════════════════════════════════════════════════════════════════
export const ViewRequestModal = ({
  visible,
  request,
  onClose,
  onApprove,
  onReject,
}: any) => {
  if (!visible || !request) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContentV2, { width: "95%", maxWidth: 600 }]}>
          <View style={styles.modalHeaderV2}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Calendar size={22} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.modalTitleV2}>Reschedule Request</Text>
                <Text style={styles.modalSubtitle}>
                  Review request details and take action
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnV2}>
              <X size={18} color={COLORS.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBodyV2}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 20 }}>
              <View style={styles.infoGrid}>
                <View style={styles.infoGridItem}>
                  <Text style={styles.infoGridLabel}>Audit Type</Text>
                  <Text style={styles.infoGridValue}>{request.auditType}</Text>
                </View>
                <View style={styles.infoGridItem}>
                  <Text style={styles.infoGridLabel}>Department</Text>
                  <Text style={styles.infoGridValue}>{request.department}</Text>
                </View>
                <View style={styles.infoGridItem}>
                  <Text style={styles.infoGridLabel}>Current Auditor</Text>
                  <Text style={styles.infoGridValue}>
                    {request.auditorName}
                  </Text>
                </View>
                <View style={styles.infoGridItem}>
                  <Text style={styles.infoGridLabel}>Auditee</Text>
                  <Text style={styles.infoGridValue}>
                    {request.auditeeName}
                  </Text>
                </View>
              </View>
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Calendar size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Requested Changes</Text>
                </View>
                <View style={styles.changesGrid}>
                  <View style={styles.changeColumn}>
                    <Text style={styles.changeLabel}>Current Schedule</Text>
                    <Text style={styles.changeValue}>
                      {request.currentDate} • {request.currentStartTime}
                    </Text>
                  </View>
                  <View style={styles.changeColumn}>
                    <Text
                      style={[styles.changeLabel, { color: COLORS.primary }]}
                    >
                      Requested
                    </Text>
                    <Text
                      style={[styles.changeValue, { color: COLORS.primary }]}
                    >
                      {request.requestedNewDate} •{" "}
                      {request.requestedNewTime || request.currentStartTime}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <MessageSquare size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Reason for Request</Text>
                </View>
                <Text style={styles.reasonText}>
                  {request.reason || "No reason provided"}
                </Text>
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.footerBtn, styles.footerBtnCancel]}
            >
              <Text style={styles.footerBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onReject}
              style={[styles.footerBtn, styles.footerBtnReject]}
            >
              <X size={16} color={COLORS.white} />
              <Text style={styles.footerBtnTextWhite}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onApprove}
              style={[styles.footerBtn, styles.footerBtnApprove]}
            >
              <Check size={16} color={COLORS.white} />
              <Text style={styles.footerBtnTextWhite}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// RejectModal — unchanged
// ═══════════════════════════════════════════════════════════════════════
export const RejectModal = ({ visible, request, onClose, onSuccess }: any) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !request) return null;

  const handleReject = async () => {
    if (!reason.trim())
      return Alert.alert("Error", "Please provide a rejection reason");
    setSubmitting(true);
    try {
      const endpoint =
        request.type === "RESCHEDULE"
          ? "reject-reschedule"
          : "reject-extension";
      await apiClient.post(
        `/api/audit-schedule/request/${request.requestId}/${endpoint}`,
        { reason },
        { userId: user?.id },
      );
      Alert.alert("Success", "Request rejected");
      setReason("");
      onSuccess();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContentV2, { width: "90%", maxWidth: 500 }]}>
          <View style={styles.modalHeaderV2}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: "#FEE2E2" }]}>
                <X size={22} color={COLORS.danger} />
              </View>
              <View>
                <Text style={styles.modalTitleV2}>
                  Reject{" "}
                  {request.type === "RESCHEDULE" ? "Reschedule" : "Extension"}{" "}
                  Request
                </Text>
                <Text style={styles.modalSubtitle}>
                  Please provide a reason for rejection
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnV2}>
              <X size={18} color={COLORS.textSub} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBodyV2}>
            <TextInput
              style={[styles.commentsInput, { minHeight: 120 }]}
              placeholder="Enter rejection reason..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              autoFocus
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.footerBtn, styles.footerBtnCancel]}
            >
              <Text style={styles.footerBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReject}
              disabled={submitting || !reason.trim()}
              style={[
                styles.footerBtn,
                styles.footerBtnReject,
                (submitting || !reason.trim()) && styles.footerBtnDisabled,
              ]}
            >
              {submitting ? (
                <Text style={styles.footerBtnTextWhite}>...</Text>
              ) : (
                <X size={16} color={COLORS.white} />
              )}
              <Text style={styles.footerBtnTextWhite}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// ApproveModal — full version with pickers + conflict check
// ═══════════════════════════════════════════════════════════════════════
export const ApproveModal = ({
  visible,
  request,
  onClose,
  onSuccess,
  reassignOptions,
  loadingTeamMembers,
}: any) => {
  const { user } = useAuth();

  // ─── State ─────────────────────────────────────────────────────
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] =
    useState("");
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState<string[]>(
    [],
  );
  const [showChangeAuditee, setShowChangeAuditee] = useState(false);
  const [selectedAuditeeId, setSelectedAuditeeId] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any>(null);

  // OVERDUE-only date/time state
  const [overdueNewDate, setOverdueNewDate] = useState("");
  const [overdueNewStartTime, setOverdueNewStartTime] = useState("");
  const [overdueNewEndTime, setOverdueNewEndTime] = useState("");

  // ─── Derived data (before useMemo) ─────────────────────────────
  const rawAuditors: any[] = reassignOptions?.auditors || [];
  const rawAuditees: any[] = reassignOptions?.auditees || [];
  const current = reassignOptions?.current || null;

  const normalize = (d: any) =>
    String(d || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  const requestDept = normalize(request?.department);

  const deptAliases: Record<string, string[]> = {
    RND: ["ENGG", "RND"],
    ENGG: ["ENGG", "RND"],
    QAQC: ["QA", "QAQC"],
    QA: ["QA", "QAQC"],
    SQA: ["QA", "QAQC", "SQA"],
    STORESANDDESPATCH: ["STORESDESPATCH", "STORESANDDESPATCH"],
    STORESDESPATCH: ["STORESDESPATCH", "STORESANDDESPATCH"],
    PLANTMAINTENANCE: ["PLANTMAINTENANCE"],
    TOOLMAINTENANCE: ["TOOLMAINTENANCE"],
    MANAGEMENT: ["MANAGEMENT", "UNIHEAD"],
    IMSEBE: ["MR", "IMSEBE"],
    MR: ["MR", "IMSEBE"],
  };

  const deptMatches = (candidate: any) => {
    if (!requestDept) return true;
    const cand = normalize(candidate);
    if (!cand) return true;
    const allowed = deptAliases[requestDept] || [requestDept];
    return allowed.includes(cand);
  };

  // ─── useMemo hooks ─────────────────────────────────────────────
  const auditorsForPicker = useMemo(() => {
    return rawAuditors
      .filter((a: any) => {
        const role = String(a.role || "").toUpperCase();
        if (role === "LEAD_AUDITOR") return false;
        if (role && role !== "AUDITOR") return false;
        return deptMatches(a.department);
      })
      .map((a: any) => ({
        ...a,
        _alreadyAssigned: String(a.id) === String(current?.auditorId),
      }))
      .sort((a: any, b: any) => {
        if (a._alreadyAssigned !== b._alreadyAssigned)
          return a._alreadyAssigned ? 1 : -1;
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        );
      });
  }, [rawAuditors, current?.auditorId, requestDept]);

  const auditeesForPicker = useMemo(() => {
    return rawAuditees
      .filter((a: any) => {
        const role = String(a.role || "").toUpperCase();
        if (role === "HOD") return false;
        if (role && role !== "AUDITEE") return false;
        return deptMatches(a.department);
      })
      .map((a: any) => ({
        ...a,
        _alreadyAssigned: String(a.id) === String(current?.auditeeId),
      }))
      .sort((a: any, b: any) => {
        if (a._alreadyAssigned !== b._alreadyAssigned)
          return a._alreadyAssigned ? 1 : -1;
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        );
      });
  }, [rawAuditees, current?.auditeeId, requestDept]);

  const coAuditorsForPicker = useMemo(() => {
    return auditorsForPicker.filter((a: any) => {
      if (a._alreadyAssigned) return false;
      if (
        showReassignOptions &&
        selectedReassignAuditorId &&
        String(a.id) === String(selectedReassignAuditorId)
      )
        return false;
      if (additionalAuditorIds.includes(String(a.id))) return false;
      return true;
    });
  }, [
    auditorsForPicker,
    showReassignOptions,
    selectedReassignAuditorId,
    additionalAuditorIds,
  ]);

  // ─── useEffect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !request) return;

    if (request.type === "OVERDUE") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setOverdueNewDate(tomorrow.toISOString().split("T")[0]);
      setOverdueNewStartTime(request.currentStartTime || "09:00 AM");
      setOverdueNewEndTime(request.currentEndTime || "10:00 AM");
    } else {
      setOverdueNewDate("");
      setOverdueNewStartTime("");
      setOverdueNewEndTime("");
    }

    setComment("");
    setShowReassignOptions(false);
    setSelectedReassignAuditorId("");
    setShowAddAnotherAuditor(false);
    setAdditionalAuditorIds([]);
    setShowChangeAuditee(false);
    setSelectedAuditeeId("");
    setConflictWarning(null);
  }, [visible, request?.scheduleId, request?.type]);

  // ─── Early return AFTER all hooks ──────────────────────────────
  if (!visible || !request) return null;

  // ─── Helpers ───────────────────────────────────────────────────
  const convertToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(" ");
    const time = parts[0];
    const modifier = parts[1];
    let [hours, minutes] = time.split(":");
    let h = parseInt(hours);
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    return h * 60 + parseInt(minutes);
  };

  const checkConflicts = async (
    userId: string | number,
    kind: "reassign" | "coauditor" | "auditee",
  ) => {
    if (!userId) return;
    setCheckingAvailability(true);
    try {
      const daySchedulesRes = await apiClient
        .get(`/api/audit-schedule/by-date/${request.currentDate}`)
        .catch(() => []);
      const daySchedules = Array.isArray(daySchedulesRes)
        ? daySchedulesRes
        : (daySchedulesRes as any)?.data || [];

      const conflict = daySchedules.find((schedule: any) => {
        if (schedule.id === request.scheduleId) return false;

        if (kind === "auditee") {
          const idsArr: number[] =
            String(schedule.auditeeIds || "")
              .match(/\d+/g)
              ?.map(Number) || [];
          const matches =
            Number(schedule.auditeeId) === Number(userId) ||
            idsArr.includes(Number(userId));
          if (!matches) return false;
        } else {
          if (Number(schedule.auditorId) !== Number(userId)) return false;
        }

        const s1Start = convertToMinutes(request.currentStartTime);
        const s1End = convertToMinutes(request.currentEndTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return s1Start < s2End && s1End > s2Start;
      });

      if (conflict) {
        const person =
          kind === "auditee"
            ? rawAuditees.find((a: any) => String(a.id) === String(userId))
            : rawAuditors.find((a: any) => String(a.id) === String(userId));
        setConflictWarning({
          type: kind,
          auditorId: userId,
          auditorName: person
            ? `${person.firstName} ${person.lastName}`
            : "Unknown",
          conflicts: [{ date: request.currentDate, conflict }],
        });
      } else {
        setConflictWarning(null);
      }
    } catch (e) {
      console.error("Error checking conflicts:", e);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const body = {
        comments: comment,
        reassignToAuditorId: showReassignOptions
          ? Number(selectedReassignAuditorId)
          : null,
        additionalAuditorIds: showAddAnotherAuditor
          ? additionalAuditorIds.map(Number)
          : [],
        keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions,
        newAuditeeId: showChangeAuditee ? Number(selectedAuditeeId) : null,
      };

      // ── OVERDUE path ─────────────────────────────────────────
      if (request.type === "OVERDUE") {
        await apiClient.post(
          `/api/audit-schedule/schedule/${request.scheduleId}/la-reschedule`,
          {
            newDate: overdueNewDate,
            newStartTime: overdueNewStartTime,
            newEndTime: overdueNewEndTime,
            reason: comment.trim(),
            reassignToAuditorId: body.reassignToAuditorId,
            additionalAuditorIds: body.additionalAuditorIds,
            keepOriginalAuditor: body.keepOriginalAuditor,
            newAuditeeId: body.newAuditeeId,
            comments: comment,
          },
          { userId: user?.id },
        );
        Alert.alert("Success", "Overdue audit rescheduled");
        onSuccess();
        return;
      }

      // ── Pending-request approval ─────────────────────────────
      const endpoint =
        request.type === "RESCHEDULE"
          ? "approve-reschedule"
          : "approve-extension";

      await apiClient.post(
        `/api/audit-schedule/request/${request.requestId}/${endpoint}`,
        body,
        { userId: user?.id },
      );

      Alert.alert("Success", "Request approved successfully");
      onSuccess();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  const isApproveDisabled =
    submitting ||
    (showReassignOptions && !selectedReassignAuditorId) ||
    (showReassignOptions && conflictWarning?.type === "reassign") ||
    (showChangeAuditee && !selectedAuditeeId) ||
    (showChangeAuditee && conflictWarning?.type === "auditee") ||
    (request.type === "OVERDUE" && !overdueNewDate.trim()) ||
    (request.type === "OVERDUE" && !overdueNewStartTime.trim()) ||
    (request.type === "OVERDUE" && !overdueNewEndTime.trim()) ||
    (request.type === "OVERDUE" && !comment.trim());

  const titleLabel =
    request.type === "OVERDUE"
      ? "Reschedule Overdue Audit"
      : `Approve ${
          request.type === "RESCHEDULE" ? "Reschedule" : "Extension"
        } Request`;

  const subtitleLabel =
    request.type === "OVERDUE"
      ? "This audit is overdue with no pending request — act directly"
      : "Review and confirm the approval details";

  const submitLabel = submitting
    ? "..."
    : request.type === "OVERDUE"
      ? "Reschedule"
      : "Approve";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContentV2, { width: "95%", maxWidth: 600 }]}>
          <View style={styles.modalHeaderV2}>
            <View style={styles.headerLeft}>
              <View
                style={[styles.headerIcon, { backgroundColor: COLORS.primary }]}
              >
                <Check size={22} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.modalTitleV2}>{titleLabel}</Text>
                <Text style={styles.modalSubtitle}>{subtitleLabel}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnV2}>
              <X size={18} color={COLORS.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBodyV2}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 16 }}>
              {/* Audit info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionLabel}>Audit</Text>
                <Text style={styles.infoSectionValue}>
                  {request.auditType} - {request.department}
                </Text>
              </View>

              {/* Current auditor */}
              <View
                style={[styles.infoSection, { backgroundColor: COLORS.bg }]}
              >
                <View style={styles.infoSectionLabelRow}>
                  <UserCheck size={14} color={COLORS.primary} />
                  <Text style={[styles.infoSectionLabel, { marginBottom: 0 }]}>
                    Current Auditor
                  </Text>
                </View>
                <Text style={styles.infoSectionValue}>
                  {current?.auditorName || request.auditorName}
                </Text>
              </View>

              {/* Current auditee */}
              <View
                style={[styles.infoSection, { backgroundColor: COLORS.bg }]}
              >
                <View style={styles.infoSectionLabelRow}>
                  <UserCheck size={14} color={COLORS.primary} />
                  <Text style={[styles.infoSectionLabel, { marginBottom: 0 }]}>
                    Current Auditee
                  </Text>
                </View>
                <Text style={styles.infoSectionValue}>
                  {current?.auditeeName || request.auditeeName}
                </Text>
              </View>

              {/* OVERDUE — proper date/time pickers */}
              {request.type === "OVERDUE" && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>New Schedule *</Text>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.changeLabel}>Current</Text>
                    <Text style={styles.changeValue}>
                      {request.currentDate} • {request.currentStartTime}–
                      {request.currentEndTime}
                    </Text>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <MiniDatePicker
                      label="New Date"
                      value={overdueNewDate}
                      onChange={setOverdueNewDate}
                      minimumDate={(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        return d;
                      })()}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <TimeDropdown
                      label="New Start Time"
                      value={overdueNewStartTime}
                      onChange={(v) => {
                        setOverdueNewStartTime(v);
                        if (
                          overdueNewEndTime &&
                          convertToMinutes(overdueNewEndTime) <=
                            convertToMinutes(v)
                        ) {
                          setOverdueNewEndTime("");
                        }
                      }}
                    />
                    <TimeDropdown
                      label="New End Time"
                      value={overdueNewEndTime}
                      onChange={setOverdueNewEndTime}
                      minStartTime={overdueNewStartTime}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.changeLabel}>New (preview)</Text>
                    <Text
                      style={[styles.changeValue, { color: COLORS.primary }]}
                    >
                      {overdueNewDate || "—"} • {overdueNewStartTime || "—"}–
                      {overdueNewEndTime || "—"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Reassign auditor */}
              <View style={styles.checkboxRowV2}>
                <TouchableOpacity
                  style={[
                    styles.checkboxV2,
                    showReassignOptions && styles.checkboxV2Active,
                  ]}
                  onPress={() => {
                    setShowReassignOptions(!showReassignOptions);
                    if (showReassignOptions) setSelectedReassignAuditorId("");
                  }}
                >
                  {showReassignOptions && (
                    <Check size={14} color={COLORS.white} />
                  )}
                </TouchableOpacity>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxTextV2}>
                    🔄 Reassign to different auditor
                  </Text>
                  <Text style={styles.checkboxSubtext}>
                    Replace the current auditor with a new one
                  </Text>
                </View>
              </View>

              {showReassignOptions && (
                <View style={styles.reassignSection}>
                  <Text style={styles.reassignLabel}>
                    Select Primary Auditor *
                  </Text>
                  {loadingTeamMembers ? (
                    <Text
                      style={{
                        color: COLORS.textSub,
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      Loading auditors...
                    </Text>
                  ) : auditorsForPicker.length === 0 ? (
                    <Text
                      style={{
                        color: COLORS.textSub,
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      No auditors in the {request.department} department
                    </Text>
                  ) : (
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <Picker
                        selectedValue={selectedReassignAuditorId}
                        onValueChange={(val: string) => {
                          setSelectedReassignAuditorId(val);
                          checkConflicts(val, "reassign");
                        }}
                        style={APPROVAL_PICKER_STYLE}
                      >
                        <Picker.Item label="Select Auditor" value="" />
                        {auditorsForPicker.map((auditor: any) => (
                          <Picker.Item
                            key={auditor.id}
                            label={
                              auditor._alreadyAssigned
                                ? `⚠️ ${auditor.firstName} ${auditor.lastName} (already assigned)`
                                : `${auditor.firstName} ${auditor.lastName}`
                            }
                            value={String(auditor.id)}
                            color={
                              auditor._alreadyAssigned
                                ? "#DC2626"
                                : COLORS.textMain
                            }
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                  {checkingAvailability && (
                    <Text
                      style={{
                        color: COLORS.primary,
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      Checking availability...
                    </Text>
                  )}
                  {conflictWarning && conflictWarning.type === "reassign" && (
                    <View style={styles.warningBoxV2}>
                      <Text style={styles.warningTextV2}>
                        ⚠️ Time Conflict Detected!
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#B91C1C",
                          marginTop: 4,
                        }}
                      >
                        Auditor {conflictWarning.auditorName} is already
                        scheduled.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Add co-auditor */}
              <View style={styles.checkboxRowV2}>
                <TouchableOpacity
                  style={[
                    styles.checkboxV2,
                    showAddAnotherAuditor && styles.checkboxV2Active,
                  ]}
                  onPress={() => {
                    setShowAddAnotherAuditor(!showAddAnotherAuditor);
                    if (showAddAnotherAuditor) setAdditionalAuditorIds([]);
                  }}
                >
                  {showAddAnotherAuditor && (
                    <Check size={14} color={COLORS.white} />
                  )}
                </TouchableOpacity>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxTextV2}>
                    ➕ Add another auditor (Co-auditor)
                  </Text>
                  <Text style={styles.checkboxSubtext}>
                    Add additional auditor without removing the primary one
                  </Text>
                </View>
              </View>

              {showAddAnotherAuditor && (
                <View style={styles.coAuditorSection}>
                  <Text style={styles.reassignLabel}>
                    Select Additional Auditor(s)
                  </Text>
                  {loadingTeamMembers ? (
                    <Text
                      style={{
                        color: COLORS.textSub,
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      Loading auditors...
                    </Text>
                  ) : coAuditorsForPicker.length === 0 ? (
                    <Text
                      style={{
                        color: COLORS.textSub,
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      No other auditors available in this department
                    </Text>
                  ) : (
                    <ScrollView
                      style={{ maxHeight: 150 }}
                      showsVerticalScrollIndicator
                    >
                      {coAuditorsForPicker.map((auditor: any) => (
                        <TouchableOpacity
                          key={auditor.id}
                          style={styles.auditorOption}
                          onPress={() => {
                            if (
                              !additionalAuditorIds.includes(String(auditor.id))
                            ) {
                              setAdditionalAuditorIds([
                                ...additionalAuditorIds,
                                String(auditor.id),
                              ]);
                              checkConflicts(auditor.id, "coauditor");
                            }
                          }}
                        >
                          <Text style={styles.auditorOptionText}>
                            ✅ {auditor.firstName} {auditor.lastName}
                          </Text>
                          <Check size={16} color={COLORS.success} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {conflictWarning && conflictWarning.type === "coauditor" && (
                    <View
                      style={[
                        styles.warningBoxV2,
                        {
                          backgroundColor: COLORS.bg,
                          borderColor: COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.warningTextV2, { color: COLORS.dark }]}
                      >
                        ⚠️ Potential Time Conflict!
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.dark,
                          marginTop: 4,
                        }}
                      >
                        Auditor {conflictWarning.auditorName} is already
                        scheduled.
                      </Text>
                    </View>
                  )}
                  {additionalAuditorIds.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.reassignLabel}>
                        Selected Co-auditors:
                      </Text>
                      <View style={styles.selectedAuditors}>
                        {additionalAuditorIds.map((id) => {
                          const auditor = auditorsForPicker.find(
                            (a: any) => String(a.id) === id,
                          );
                          return auditor ? (
                            <View key={id} style={styles.selectedAuditorTag}>
                              <Text style={styles.selectedAuditorTagText}>
                                {auditor.firstName} {auditor.lastName}
                              </Text>
                              <TouchableOpacity
                                onPress={() =>
                                  setAdditionalAuditorIds(
                                    additionalAuditorIds.filter(
                                      (aid) => aid !== id,
                                    ),
                                  )
                                }
                              >
                                <X size={14} color={COLORS.danger} />
                              </TouchableOpacity>
                            </View>
                          ) : null;
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Change auditee */}
              <View style={styles.checkboxRowV2}>
                <TouchableOpacity
                  style={[
                    styles.checkboxV2,
                    showChangeAuditee && styles.checkboxV2Active,
                  ]}
                  onPress={() => {
                    setShowChangeAuditee(!showChangeAuditee);
                    if (showChangeAuditee) setSelectedAuditeeId("");
                  }}
                >
                  {showChangeAuditee && (
                    <Check size={14} color={COLORS.white} />
                  )}
                </TouchableOpacity>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxTextV2}>👤 Change auditee</Text>
                  <Text style={styles.checkboxSubtext}>
                    Replace the current auditee (same plant only)
                  </Text>
                </View>
              </View>

              {showChangeAuditee && (
                <View style={styles.reassignSection}>
                  <Text style={styles.reassignLabel}>Select Auditee *</Text>
                  {auditeesForPicker.length === 0 ? (
                    <Text
                      style={{
                        color: COLORS.textSub,
                        textAlign: "center",
                        padding: 8,
                      }}
                    >
                      No auditees in the {request.department} department
                    </Text>
                  ) : (
                    <View
                      style={{
                        backgroundColor: COLORS.surface,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <Picker
                        selectedValue={selectedAuditeeId}
                        onValueChange={(val: string) => {
                          setSelectedAuditeeId(String(val));
                          if (val) checkConflicts(val, "auditee");
                        }}
                        style={APPROVAL_PICKER_STYLE}
                      >
                        <Picker.Item label="Select Auditee" value="" />
                        {auditeesForPicker.map((auditee: any) => (
                          <Picker.Item
                            key={auditee.id}
                            label={
                              auditee._alreadyAssigned
                                ? `⚠️ ${auditee.firstName} ${auditee.lastName} (already assigned)`
                                : `${auditee.firstName} ${auditee.lastName}`
                            }
                            value={String(auditee.id)}
                            color={
                              auditee._alreadyAssigned
                                ? "#DC2626"
                                : COLORS.textMain
                            }
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                  {conflictWarning && conflictWarning.type === "auditee" && (
                    <View style={styles.warningBoxV2}>
                      <Text style={styles.warningTextV2}>
                        ⚠️ Time Conflict Detected!
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#B91C1C",
                          marginTop: 4,
                        }}
                      >
                        Auditee {conflictWarning.auditorName} is already
                        scheduled at this time.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Requested changes (only for real requests, not OVERDUE) */}
              {request.type !== "OVERDUE" && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>Requested Changes</Text>
                  {request.type === "RESCHEDULE" ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.changeText}>
                        New Date:{" "}
                        <Text style={{ fontWeight: "600" }}>
                          {request.requestedNewDate}
                        </Text>
                      </Text>
                      <Text style={styles.changeText}>
                        New Time: {request.requestedNewStartTime} -{" "}
                        {request.requestedNewEndTime}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.changeText, { marginTop: 8 }]}>
                      New End Date:{" "}
                      <Text style={{ fontWeight: "600" }}>
                        {request.requestedNewToDate}
                      </Text>
                    </Text>
                  )}
                </View>
              )}

              {/* Comment / reason */}
              <View>
                <Text style={styles.commentsLabel}>
                  {request.type === "OVERDUE"
                    ? "Reason *"
                    : "Comments (Optional)"}
                </Text>
                <TextInput
                  style={styles.commentsInput}
                  placeholder={
                    request.type === "OVERDUE"
                      ? "Why are you rescheduling this overdue audit?"
                      : "Add any comments about this approval..."
                  }
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.footerBtn, styles.footerBtnCancel]}
            >
              <Text style={styles.footerBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApprove}
              disabled={isApproveDisabled}
              style={[
                styles.footerBtn,
                styles.footerBtnApprove,
                isApproveDisabled && styles.footerBtnDisabled,
              ]}
            >
              {submitting ? (
                <Text style={styles.footerBtnTextWhite}>...</Text>
              ) : (
                <Check size={16} color={COLORS.white} />
              )}
              <Text style={styles.footerBtnTextWhite}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Helper: mini date picker
// ═══════════════════════════════════════════════════════════════════════
const MiniDatePicker = ({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
}) => {
  const [open, setOpen] = useState(false);

  const parseDate = (s: string): Date => {
    if (!s) return new Date();
    const parts = s.split("-");
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(s);
  };

  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [temp, setTemp] = useState(parseDate(value));
  useEffect(() => {
    if (value) setTemp(parseDate(value));
  }, [value]);

  const handleChange = (event: any, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (event?.type === "dismissed" || !selected) return;
    onChange(toLocalISO(selected));
  };

  if (Platform.OS === "web") {
    return (
      <View>
        <Text style={styles.reassignLabel}>{label}</Text>
        {/* @ts-ignore */}
        <input
          type="date"
          value={value}
          min={minimumDate ? toLocalISO(minimumDate) : undefined}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            height: 44,
            width: "100%",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "0 12px",
            fontSize: 14,
            color: COLORS.textMain,
            backgroundColor: COLORS.surface,
            marginTop: 6,
            outline: "none",
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.reassignLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          height: 44,
          width: "100%",
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.surface,
          marginTop: 6,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: value ? COLORS.textMain : COLORS.textSub,
          }}
        >
          {value || "Select Date"}
        </Text>
        <Calendar size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {open && (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Helper: time dropdown
// ═══════════════════════════════════════════════════════════════════════
const TIME_OPTIONS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

const TimeDropdown = ({
  label,
  value,
  onChange,
  minStartTime,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minStartTime?: string;
}) => {
  const toMinutes = (t: string) => {
    if (!t) return 0;
    const [time, mod] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (mod === "PM" && h !== 12) h += 12;
    if (mod === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const options = minStartTime
    ? TIME_OPTIONS.filter((t) => toMinutes(t) > toMinutes(minStartTime))
    : TIME_OPTIONS;

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.reassignLabel}>{label}</Text>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 10,
          overflow: "hidden",
          marginTop: 6,
        }}
      >
        <Picker
          selectedValue={value}
          onValueChange={(val: string) => onChange(String(val))}
          style={{
            height: 44,
            width: "100%",
            borderWidth: 0,
            backgroundColor: "transparent",
            color: COLORS.textMain,
            paddingHorizontal: 12,
          }}
        >
          <Picker.Item label="Select Time" value="" />
          {options.map((t) => (
            <Picker.Item key={t} label={t} value={t} />
          ))}
        </Picker>
      </View>
    </View>
  );
};
