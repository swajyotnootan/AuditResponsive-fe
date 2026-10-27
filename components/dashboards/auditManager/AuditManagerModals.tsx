import { useAuth } from "@/components/context/AuthContext";
import { apiClient } from "@/services/api";
import { Picker } from "@react-native-picker/picker";
import {
  Calendar,
  Check,
  MessageSquare,
  UserCheck,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
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

export const ApproveModal = ({
  visible,
  request,
  onClose,
  onSuccess,
  allUsersList,
  departmentTeamMembers,
  loadingTeamMembers,
}: any) => {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] =
    useState("");
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState<string[]>(
    [],
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  if (!visible || !request) return null;

  const approvalAuditors = departmentTeamMembers?.auditors || [];
  const approvalTeamInfo = {
    teamAuditorIds: departmentTeamMembers?.teamAuditorIds || [],
  };

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

  const checkConflictsForAuditor = async (
    auditorId: string | number,
    isReassign = false,
  ) => {
    if (!auditorId) return;
    setCheckingAvailability(true);
    try {
      const daySchedulesRes = await apiClient
        .get(`/api/audit-schedule/by-date/${request.currentDate}`)
        .catch(() => []);
      const daySchedules = Array.isArray(daySchedulesRes)
        ? daySchedulesRes
        : (daySchedulesRes as any)?.data || [];
      const conflict = daySchedules.find((schedule: any) => {
        if (Number(schedule.auditorId) !== Number(auditorId)) return false;
        if (schedule.id === request.scheduleId) return false;
        const s1Start = convertToMinutes(request.currentStartTime);
        const s1End = convertToMinutes(request.currentEndTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return s1Start < s2End && s1End > s2Start;
      });
      if (conflict) {
        const auditor = approvalAuditors.find(
          (a: any) => String(a.id) === String(auditorId),
        );
        setConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: auditor?.firstName || "Unknown",
          conflicts: [{ date: request.currentDate, conflict }],
        });
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const endpoint =
        request.type === "RESCHEDULE"
          ? "approve-reschedule"
          : "approve-extension";
      const body = {
        comments: comment,
        reassignToAuditorId: showReassignOptions
          ? selectedReassignAuditorId
          : null,
        additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
        keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions,
      };
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
    (showReassignOptions && conflictWarning?.type === "reassign");

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
                <Text style={styles.modalTitleV2}>
                  Approve{" "}
                  {request.type === "RESCHEDULE" ? "Reschedule" : "Extension"}{" "}
                  Request
                </Text>
                <Text style={styles.modalSubtitle}>
                  Review and confirm the approval details
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
            <View style={{ gap: 16 }}>
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionLabel}>Audit</Text>
                <Text style={styles.infoSectionValue}>
                  {request.auditType} - {request.department}
                </Text>
              </View>
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
                  {request.auditorName}
                </Text>
              </View>
              {!loadingTeamMembers && departmentTeamMembers.leadAuditorName && (
                <View
                  style={[styles.infoSection, { backgroundColor: COLORS.bg }]}
                >
                  <Text
                    style={[styles.infoSectionLabel, { color: COLORS.dark }]}
                  >
                    Assigned Audit Team for {request.department}:
                  </Text>
                  <Text
                    style={[
                      styles.infoSectionValue,
                      { fontSize: 12, color: COLORS.primary, marginTop: 4 },
                    ]}
                  >
                    ⭐ Lead: {departmentTeamMembers.leadAuditorName}
                  </Text>
                  {departmentTeamMembers.teamAuditorNames?.length > 0 && (
                    <Text
                      style={[
                        styles.infoSectionValue,
                        { fontSize: 12, color: COLORS.primary, marginTop: 2 },
                      ]}
                    >
                      {" "}
                      Team: {departmentTeamMembers.teamAuditorNames.join(", ")}
                    </Text>
                  )}
                </View>
              )}
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
                          checkConflictsForAuditor(val, true);
                        }}
                        style={APPROVAL_PICKER_STYLE}
                      >
                        <Picker.Item label="Select Auditor" value="" />
                        {approvalAuditors
                          .filter((a: any) => {
                            if (
                              approvalTeamInfo.teamAuditorIds.length > 0 &&
                              !approvalTeamInfo.teamAuditorIds.includes(
                                Number(a.id),
                              )
                            )
                              return false;
                            const isCurrent =
                              String(a.id) === String(request?.auditorId) ||
                              `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                request?.auditorName?.toLowerCase();
                            return !isCurrent;
                          })
                          .map((auditor: any) => (
                            <Picker.Item
                              key={auditor.id}
                              label={`${auditor.firstName} ${auditor.lastName}`}
                              value={auditor.id.toString()}
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
                        style={{ fontSize: 12, color: "#B91C1C", marginTop: 4 }}
                      >
                        Auditor {conflictWarning.auditorName} is already
                        scheduled.
                      </Text>
                    </View>
                  )}
                </View>
              )}
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
                  ) : (
                    <ScrollView
                      style={{ maxHeight: 150 }}
                      showsVerticalScrollIndicator
                    >
                      {approvalAuditors
                        .filter((a: any) => {
                          if (
                            approvalTeamInfo.teamAuditorIds.length > 0 &&
                            !approvalTeamInfo.teamAuditorIds.includes(
                              Number(a.id),
                            )
                          )
                            return false;
                          const isCurrent =
                            String(a.id) === String(request?.auditorId) ||
                            `${a.firstName} ${a.lastName}`.toLowerCase() ===
                              request?.auditorName?.toLowerCase();
                          if (isCurrent) return false;
                          if (
                            showReassignOptions &&
                            selectedReassignAuditorId &&
                            String(a.id) === String(selectedReassignAuditorId)
                          )
                            return false;
                          if (additionalAuditorIds.includes(String(a.id)))
                            return false;
                          return true;
                        })
                        .map((auditor: any) => (
                          <TouchableOpacity
                            key={auditor.id}
                            style={styles.auditorOption}
                            onPress={() => {
                              if (
                                !additionalAuditorIds.includes(
                                  String(auditor.id),
                                )
                              ) {
                                setAdditionalAuditorIds([
                                  ...additionalAuditorIds,
                                  String(auditor.id),
                                ]);
                                checkConflictsForAuditor(auditor.id, false);
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
                          const auditor = approvalAuditors.find(
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
              <View>
                <Text style={styles.commentsLabel}>Comments (Optional)</Text>
                <TextInput
                  style={styles.commentsInput}
                  placeholder="Add any comments about this approval..."
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
              <Text style={styles.footerBtnTextWhite}>Approve</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
