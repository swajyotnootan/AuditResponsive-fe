// ═══════════════════════════════════════════════════════════════════════
// TopManagementModals.tsx
// Restyled with monochromatic blue UI & fixed-width tables.
// Functionality is 100% PRESERVED from the original code.
// ═══════════════════════════════════════════════════════════════════════

import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  Filter,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getAuditElementCode, monthDisplay } from "./TopManagementHelpers";

// ═══ MONOCHROMATIC BLUE PALETTE ═══
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  blue50: "#EFF6FF",
  blue100: "#DBEAFE",
  blue200: "#BFDBFE",
  blue300: "#93C5FD",
  blue800: "#1E40AF",
  blue900: "#1E3A8A",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  white: "#FFFFFF",
  // For raw statuses like "SCHEDULED"
  yellow50: "#FEFCE8",
  yellow700: "#A16207",
  yellowBorder: "#FEF08A",
};

// ═══════════════════════════════════════════════════════════════════════
// OUTLINE BUTTON
// ═══════════════════════════════════════════════════════════════════════
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  variant = "default",
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled && !loading;

  let baseBorder = "#D1D5DB";
  let baseText = "#111827";
  let baseIcon = "#6B7280";
  let hoverBorder = COLORS.primary;
  let hoverText = COLORS.primary;
  let hoverIcon = COLORS.primary;
  let hoverBg = "rgba(37, 99, 235, 0.1)";

  if (variant === "destructive") {
    baseBorder = "#FCA5A5";
    baseText = "#B91C1C";
    baseIcon = "#B91C1C";
    hoverBorder = "#DC2626";
    hoverText = "#DC2626";
    hoverIcon = "#DC2626";
    hoverBg = "rgba(220, 38, 38, 0.08)";
  } else if (variant === "primary") {
    baseBorder = COLORS.primary;
    baseText = COLORS.primary;
    baseIcon = COLORS.primary;
    hoverBorder = COLORS.primaryDark;
    hoverText = COLORS.primaryDark;
    hoverIcon = COLORS.primaryDark;
    hoverBg = "rgba(37, 99, 235, 0.08)";
  }

  const borderColor = isHoveredAndEnabled ? hoverBorder : baseBorder;
  const textColor = isHoveredAndEnabled ? hoverText : baseText;
  const iconColor = isHoveredAndEnabled ? hoverIcon : baseIcon;
  const backgroundColor = isHoveredAndEnabled ? hoverBg : "transparent";

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderColor,
        backgroundColor,
        opacity: disabled ? 0.5 : 1,
        // @ts-ignore
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// STATUS BADGES
// ═══════════════════════════════════════════════════════════════════════
const getStatusBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return (
        <View style={styles.statusPillApproved}>
          <CheckCircle size={12} color={COLORS.primary} />
          <Text style={styles.statusPillApprovedText}>Approved</Text>
        </View>
      );
    case "REJECTED":
      return (
        <View style={styles.statusPillRejected}>
          <X size={12} color="#B91C1C" />
          <Text style={styles.statusPillRejectedText}>Rejected</Text>
        </View>
      );
    case "PENDING_APPROVAL":
      return (
        <View style={styles.statusPillPending}>
          <Clock size={12} color={COLORS.textMuted} />
          <Text style={styles.statusPillPendingText}>Pending</Text>
        </View>
      );
    case "CHANGE_REQUESTED":
      return (
        <View style={styles.statusPillChange}>
          <MessageSquare size={12} color={COLORS.primaryDark} />
          <Text style={styles.statusPillChangeText}>Changes Requested</Text>
        </View>
      );
    case "SCHEDULED":
      return (
        <View style={styles.statusPillScheduled}>
          <Text style={styles.statusPillScheduledText}>SCHEDULED</Text>
        </View>
      );
    default:
      return (
        <View style={styles.statusPillDefault}>
          <Text style={styles.statusPillDefaultText}>Draft</Text>
        </View>
      );
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 1. ScheduleApproveModal
// ═══════════════════════════════════════════════════════════════════════
export const ScheduleApproveModal = ({
  visible,
  schedule,
  comment,
  setComment,
  submitting,
  onCancel,
  onConfirm,
}: any) => {
  if (!visible || !schedule) return null;
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.smallModal}>
          <View style={styles.modalHeaderSimple}>
            <Text style={styles.modalTitleSimple}>Approve Schedule</Text>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={styles.modalBodyText}>
              Approve schedule for{" "}
              <Text style={{ fontWeight: "700", color: COLORS.textValue }}>
                {schedule.scheduledDate || schedule.fromDate || "this date"}
              </Text>
              ?
            </Text>

            <Text style={styles.actionsLabel}>Comments (Optional)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              style={styles.actionsInput}
              placeholder="Add any comments for approval..."
              placeholderTextColor={COLORS.textMuted}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <OutlineButton title="Cancel" onPress={onCancel} />
            <OutlineButton
              title="Confirm Approve"
              icon={Check}
              onPress={onConfirm}
              disabled={submitting}
              loading={submitting}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 2. ChangeRequestModal
// ═══════════════════════════════════════════════════════════════════════
export const ChangeRequestModal = ({
  visible,
  schedule,
  reason,
  setReason,
  submitting,
  onCancel,
  onConfirm,
}: any) => {
  if (!visible || !schedule) return null;
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.smallModal}>
          <View style={styles.modalHeaderSimple}>
            <Text style={styles.modalTitleSimple}>Request Changes</Text>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={styles.modalBodyText}>
              Request changes for schedule on{" "}
              <Text style={{ fontWeight: "700", color: COLORS.textValue }}>
                {schedule.scheduledDate || schedule.fromDate || "this date"}
              </Text>
              ?
            </Text>

            <Text style={styles.actionsLabel}>Reason for Changes *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              style={styles.actionsInput}
              placeholder="Describe what changes are needed..."
              placeholderTextColor={COLORS.textMuted}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <OutlineButton title="Cancel" onPress={onCancel} />
            <OutlineButton
              title="Request Changes"
              icon={MessageSquare}
              onPress={onConfirm}
              disabled={submitting}
              loading={submitting}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 3. Form5DetailsModal — Week Schedule
// ═══════════════════════════════════════════════════════════════════════
export const Form5DetailsModal = ({
  visible,
  plan,
  schedulesDetail,
  isDesktop,
  approvalComment,
  setApprovalComment,
  submitting,
  onClose,
  onApprove,
  onReject,
}: any) => {
  if (!visible || !plan) return null;

  const MOBILE_TABLE_WIDTH = 150 + 60 + 90 + 160 + 120 + 90; // = 670

  const parseRowData = (schedule: any) => {
    let teamAuditorNames: string[] = [];
    const primarySource =
      schedule.coAuditorNames ??
      schedule.teamAuditorNames ??
      schedule.auditorNames ??
      null;

    if (typeof primarySource === "string") {
      try {
        const parsed = JSON.parse(primarySource);
        teamAuditorNames = Array.isArray(parsed)
          ? parsed.filter((n: any) => typeof n === "string" && n.trim())
          : primarySource.trim()
            ? [primarySource.trim()]
            : [];
      } catch {
        teamAuditorNames = primarySource.trim() ? [primarySource.trim()] : [];
      }
    } else if (Array.isArray(primarySource)) {
      teamAuditorNames = primarySource.filter(
        (n: any) => typeof n === "string" && n.trim(),
      );
    }
    if (teamAuditorNames.length === 0) {
      const single = schedule.leadAuditorName || schedule.auditorName || null;
      if (single && typeof single === "string" && single.trim()) {
        teamAuditorNames = [single.trim()];
      }
    }

    const auditeeNames =
      typeof schedule.auditeeNames === "string"
        ? (() => {
            try {
              return JSON.parse(schedule.auditeeNames);
            } catch (e) {
              return [schedule.auditeeNames];
            }
          })()
        : Array.isArray(schedule.auditeeNames)
          ? schedule.auditeeNames
          : schedule.auditeeName
            ? [schedule.auditeeName]
            : [];

    let elementCodes: string[] = [];
    if (schedule.auditElements) {
      if (typeof schedule.auditElements === "string") {
        try {
          const parsed = JSON.parse(schedule.auditElements);
          elementCodes = (Array.isArray(parsed) ? parsed : []).map((el: any) =>
            getAuditElementCode(String(el)),
          );
        } catch (e) {
          elementCodes = [String(schedule.auditElements).substring(0, 3)];
        }
      } else if (Array.isArray(schedule.auditElements)) {
        elementCodes = schedule.auditElements.map((el: any) =>
          getAuditElementCode(String(el)),
        );
      }
    }

    return { teamAuditorNames, auditeeNames, elementCodes };
  };

  const renderElementBadges = (codes: string[]) =>
    codes.length > 0 ? (
      <View style={styles.badgeRow}>
        {codes.map((code, i) => (
          <View key={i} style={styles.elementBadge}>
            <Text style={styles.elementText}>{code}</Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.tableEmptyText}>-</Text>
    );

  const renderNameBadges = (names: string[], kind: "auditor" | "auditee") =>
    names.length > 0 ? (
      <View style={styles.badgeRow}>
        {names.map((name: string, i: number) => (
          <View
            key={i}
            style={
              kind === "auditor" ? styles.auditorBadge : styles.auditeeBadge
            }
          >
            <Text
              style={
                kind === "auditor" ? styles.auditorText : styles.auditeeText
              }
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
        ))}
      </View>
    ) : (
      <Text style={styles.tableEmptyText}>-</Text>
    );

  // ═══════════════════════════════════════════════════════════
  // DESKTOP TABLE — flex-fit, no horizontal scroll
  // ═══════════════════════════════════════════════════════════
  const renderDesktopTable = () => (
    <View style={styles.tableWrapperDesktop}>
      <View style={styles.tableHeaderDesktop}>
        <View style={[styles.tableCellDesktop, styles.cellDeptDesktop]}>
          <Text style={styles.tableHeaderText}>Department</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.cellWeekDesktop]}>
          <Text style={styles.tableHeaderText}>Week</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.cellElemDesktop]}>
          <Text style={styles.tableHeaderText}>Elements</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.cellAuditorDesktop]}>
          <Text style={styles.tableHeaderText}>Auditor</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.cellAuditeeDesktop]}>
          <Text style={styles.tableHeaderText}>Auditees</Text>
        </View>
        <View
          style={[
            styles.tableCellDesktop,
            styles.cellStatusDesktop,
            {
              borderLeftWidth: 1,
              borderLeftColor: COLORS.border,
              borderRightWidth: 0,
            },
          ]}
        >
          <Text style={styles.tableHeaderText}>Status</Text>
        </View>
      </View>

      {schedulesDetail.map((schedule: any, idx: number) => {
        const isLastRow = idx === schedulesDetail.length - 1;
        const { teamAuditorNames, auditeeNames, elementCodes } =
          parseRowData(schedule);
        return (
          <View
            key={idx}
            style={[
              styles.tableRowDesktop,
              !isLastRow && styles.tableRowBorderBottom,
            ]}
          >
            <View style={[styles.tableCellDesktop, styles.cellDeptDesktop]}>
              <Text style={styles.tableTextCenter} numberOfLines={2}>
                {schedule.department || "-"}
              </Text>
            </View>
            <View style={[styles.tableCellDesktop, styles.cellWeekDesktop]}>
              <Text style={styles.tableTextCenter}>{schedule.week || "-"}</Text>
            </View>
            <View style={[styles.tableCellDesktop, styles.cellElemDesktop]}>
              {renderElementBadges(elementCodes)}
            </View>
            <View style={[styles.tableCellDesktop, styles.cellAuditorDesktop]}>
              {renderNameBadges(teamAuditorNames, "auditor")}
            </View>
            <View style={[styles.tableCellDesktop, styles.cellAuditeeDesktop]}>
              {renderNameBadges(auditeeNames, "auditee")}
            </View>
            <View
              style={[
                styles.tableCellDesktop,
                styles.cellStatusDesktop,
                {
                  borderLeftWidth: 1,
                  borderLeftColor: COLORS.border,
                  borderRightWidth: 0,
                },
              ]}
            >
              {/* ORIGINAL LOGIC: Uses schedule.status || "SCHEDULED" */}
              {getStatusBadge(schedule.status || "SCHEDULED")}
            </View>
          </View>
        );
      })}
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // MOBILE TABLE — fixed width, horizontal scroll
  // ═══════════════════════════════════════════════════════════
  const renderMobileTable = () => (
    <View style={styles.tableWrapperMobile}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: MOBILE_TABLE_WIDTH }}>
          <View style={styles.tableHeader}>
            <View
              style={[styles.tableCell, { width: 150 }, styles.tableCellBorder]}
            >
              <Text style={styles.tableHeaderText}>Department</Text>
            </View>
            <View
              style={[styles.tableCell, { width: 60 }, styles.tableCellBorder]}
            >
              <Text style={styles.tableHeaderText}>Week</Text>
            </View>
            <View
              style={[styles.tableCell, { width: 90 }, styles.tableCellBorder]}
            >
              <Text style={styles.tableHeaderText}>Elements</Text>
            </View>
            <View
              style={[styles.tableCell, { width: 160 }, styles.tableCellBorder]}
            >
              <Text style={styles.tableHeaderText}>Auditor</Text>
            </View>
            <View
              style={[styles.tableCell, { width: 120 }, styles.tableCellBorder]}
            >
              <Text style={styles.tableHeaderText}>Auditees</Text>
            </View>
            <View style={[styles.tableCell, { width: 90 }]}>
              <Text style={styles.tableHeaderText}>Status</Text>
            </View>
          </View>

          {schedulesDetail.map((schedule: any, idx: number) => {
            const isLastRow = idx === schedulesDetail.length - 1;
            const { teamAuditorNames, auditeeNames, elementCodes } =
              parseRowData(schedule);
            return (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  !isLastRow && styles.tableRowBorderBottom,
                ]}
              >
                <View
                  style={[
                    styles.tableCell,
                    { width: 150 },
                    styles.tableCellBorder,
                  ]}
                >
                  <Text style={styles.tableTextCenter} numberOfLines={2}>
                    {schedule.department || "-"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: 60 },
                    styles.tableCellBorder,
                  ]}
                >
                  <Text style={styles.tableTextCenter}>
                    {schedule.week || "-"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: 90 },
                    styles.tableCellBorder,
                  ]}
                >
                  {renderElementBadges(elementCodes)}
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: 160 },
                    styles.tableCellBorder,
                  ]}
                >
                  {renderNameBadges(teamAuditorNames, "auditor")}
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: 120 },
                    styles.tableCellBorder,
                  ]}
                >
                  {renderNameBadges(auditeeNames, "auditee")}
                </View>
                <View style={[styles.tableCell, { width: 90 }]}>
                  {/* ORIGINAL LOGIC: Uses schedule.status || "SCHEDULED" */}
                  {getStatusBadge(schedule.status || "SCHEDULED")}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            isDesktop
              ? styles.modalContainerDesktop
              : styles.modalContainerMobile,
          ]}
        >
          {/* HEADER */}
          {isDesktop ? (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Week Schedule - {monthDisplay[plan.month]} {plan.year}
                </Text>
                {plan.leadAuditorName && (
                  <Text style={styles.headerSubText} numberOfLines={1}>
                    Lead Auditor: {plan.leadAuditorName}
                  </Text>
                )}
                <Text style={styles.headerSubText} numberOfLines={1}>
                  Prepared by: {plan.preparedBy || "N/A"}
                </Text>
              </View>
              <View style={styles.headerRight}>
                {/* ORIGINAL LOGIC: plan.approvalStatus */}
                {getStatusBadge(plan.approvalStatus || "DRAFT")}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeIconButton}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.headerMobile}>
              <View style={styles.headerMobileTop}>
                <Text
                  style={styles.headerTitleMobile}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Week Schedule - {monthDisplay[plan.month]} {plan.year}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeIconButton}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.headerMobileBottom}>
                {getStatusBadge(plan.approvalStatus || "DRAFT")}
                <Text
                  style={styles.headerSubTextMobile}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {plan.leadAuditorName
                    ? `Lead Auditor: ${plan.leadAuditorName}`
                    : "—"}
                </Text>
              </View>
              <Text
                style={[styles.headerSubTextMobile, { flex: 0 }]}
                numberOfLines={1}
              >
                Prepared by: {plan.preparedBy || "N/A"}
              </Text>
            </View>
          )}

          {/* BODY */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {isDesktop ? renderDesktopTable() : renderMobileTable()}

            {/* Legend */}
            <View style={styles.legendBox}>
              <Text style={styles.legendTitle}>
                Legend - Audit Elements codes:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Text style={styles.legendText}>
                  A - System Audit (ISO9001)
                </Text>
                <Text style={styles.legendText}>
                  B - System Audit (IATF16949)
                </Text>
                <Text style={styles.legendText}>C - 5S Audit</Text>
                <Text style={styles.legendText}>D - Process Audit</Text>
                <Text style={styles.legendText}>E - Product Audit</Text>
              </View>
            </View>

            {/* Approve / Reject */}
            {plan.approvalStatus !== "APPROVED" ? (
              <View style={{ paddingTop: 4 }}>
                <View style={styles.actionsSection}>
                  <Text style={styles.actionsLabel}>
                    Approval Comments (Optional)
                  </Text>
                  <TextInput
                    style={styles.actionsInput}
                    multiline
                    numberOfLines={2}
                    value={approvalComment}
                    onChangeText={setApprovalComment}
                    placeholder="Add any comments for approval..."
                    placeholderTextColor={COLORS.textMuted}
                    textAlignVertical="top"
                  />
                </View>
                <View style={styles.footerRightAligned}>
                  <OutlineButton
                    title="Reject"
                    icon={X}
                    onPress={onReject}
                    variant="destructive"
                  />
                  <OutlineButton
                    title="Approve"
                    icon={Check}
                    onPress={onApprove}
                    disabled={submitting}
                    loading={submitting}
                    variant="primary"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.approvedBanner}>
                <View style={styles.approvedBannerHeader}>
                  <CheckCircle size={20} color={COLORS.primary} />
                  <Text style={styles.approvedBannerTitle}>
                    This week schedule has already been approved.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// 4. DetailedScheduleModal — Daily Schedule
// ═══════════════════════════════════════════════════════════════════════
export const DetailedScheduleModal = ({
  visible,
  plan,
  schedulesList,
  isDesktop,
  activeTab,
  setActiveTab,
  auditTypeFilter,
  setAuditTypeFilter,
  approvalComment,
  setApprovalComment,
  submitting,
  allUsersList,
  onClose,
  onApproveSingle,
  onRejectSingle,
  onRequestChange,
  onBulkApprove,
  onBulkReject,
  onOpenRejectModal,
}: any) => {
  if (!visible || !plan) return null;

  const filteredPending = schedulesList.filter((s: any) => {
    const isPending =
      s.detailedApprovalStatus === "PENDING_APPROVAL" ||
      s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
      s.detailedApprovalStatus === "CONFIRMED_BY_LA";
    if (!isPending) return false;
    if (!auditTypeFilter.trim()) return true;
    const filter = auditTypeFilter.toLowerCase();
    if (s.auditType?.toLowerCase().includes(filter)) return true;
    if (s.auditElements) {
      let elements: any[] = [];
      if (typeof s.auditElements === "string") {
        try {
          elements = JSON.parse(s.auditElements);
        } catch (e) {}
      } else if (Array.isArray(s.auditElements)) {
        elements = s.auditElements;
      }
      return elements.some((el: string) => el?.toLowerCase().includes(filter));
    }
    return false;
  });

  const MOBILE_TABLE_WIDTH = 120 * 9; // 1080

  const visibleRows = schedulesList
    .filter((s: any) => {
      if (activeTab === "pending") {
        return (
          s.detailedApprovalStatus === "PENDING_APPROVAL" ||
          s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
          s.detailedApprovalStatus === "CONFIRMED_BY_LA"
        );
      }
      return (
        s.detailedApprovalStatus === "APPROVED" ||
        s.detailedApprovalStatus === "REJECTED"
      );
    })
    .filter((s: any) => {
      if (!auditTypeFilter.trim()) return true;
      const filter = auditTypeFilter.toLowerCase();
      if (s.auditType?.toLowerCase().includes(filter)) return true;
      if (s.auditElements) {
        let elements: any[] = [];
        if (typeof s.auditElements === "string") {
          try {
            elements = JSON.parse(s.auditElements);
          } catch (e) {}
        } else if (Array.isArray(s.auditElements)) {
          elements = s.auditElements;
        }
        return elements.some((el: string) =>
          el?.toLowerCase().includes(filter),
        );
      }
      return false;
    });

  const resolveDisplay = (rawName: any, rawId: any): string => {
    if (
      typeof rawName === "string" &&
      rawName.trim() &&
      rawName !== "null" &&
      rawName !== "N/A"
    ) {
      return rawName.trim();
    }
    if (rawId != null) {
      const u = allUsersList.find(
        (x: any) =>
          String(x.id) === String(rawId) || Number(x.id) === Number(rawId),
      );
      if (u) {
        const full =
          u.name ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          u.email;
        if (full) return full;
      }
    }
    return "—";
  };

  const renderActions = (schedule: any, approvalStatus: string) => {
    if (
      approvalStatus === "PENDING_APPROVAL" ||
      approvalStatus === "CHANGE_REQUESTED" ||
      approvalStatus === "CONFIRMED_BY_LA"
    ) {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => onApproveSingle(schedule)}
            style={styles.actionButton}
          >
            <ThumbsUp size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRejectSingle(schedule)}
            style={styles.actionButton}
          >
            <ThumbsDown size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRequestChange(schedule)}
            style={styles.actionButton}
          >
            <MessageSquare size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      );
    }
    if (approvalStatus === "APPROVED") {
      return <Text style={styles.textSuccess}>Approved</Text>;
    }
    if (approvalStatus === "REJECTED") {
      return <Text style={styles.textDanger}>Rejected</Text>;
    }
    return null;
  };

  const renderApprovedBy = (schedule: any, approvalStatus: string) => {
    if (approvalStatus === "APPROVED") {
      const name = resolveDisplay(
        schedule.approvedByName || schedule.approvedBy,
        schedule.approvedBy,
      );
      return (
        <Text style={styles.textSuccess} numberOfLines={2}>
          {name}
        </Text>
      );
    }
    if (approvalStatus === "REJECTED") {
      const name = resolveDisplay(
        schedule.rejectedByName ||
          schedule.laRejectedBy ||
          schedule.approvedByName,
        schedule.rejectedBy || schedule.approvedBy,
      );
      return (
        <Text style={styles.textDanger} numberOfLines={2}>
          {name}
        </Text>
      );
    }
    if (approvalStatus === "CHANGE_REQUESTED") {
      const name = resolveDisplay(
        schedule.rejectedByName || schedule.approvedByName,
        schedule.rejectedBy || schedule.approvedBy,
      );
      return (
        <View>
          <Text style={styles.textWarning} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={{ fontSize: 10, color: COLORS.primary }}
            numberOfLines={1}
          >
            Changes requested
          </Text>
        </View>
      );
    }
    if (approvalStatus === "PENDING_APPROVAL") {
      return (
        <Text
          style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: "500" }}
        >
          Awaiting review
        </Text>
      );
    }
    return <Text style={{ fontSize: 11, color: COLORS.textMuted }}>—</Text>;
  };

  const renderDate = (schedule: any) => {
    if (
      schedule.fromDate &&
      schedule.toDate &&
      schedule.fromDate !== schedule.toDate
    ) {
      return (
        <>
          <View style={styles.rangeRow}>
            <Text style={styles.rangeIcon}>📅</Text>
            <Text style={styles.rangeLabel}>Range:</Text>
            <View style={styles.rangeBadgeWrap}>
              <Text style={styles.rangeBadgeText}>Flexible</Text>
            </View>
          </View>
          <Text style={styles.rangeText}>
            {schedule.fromDate} → {schedule.toDate}
          </Text>
        </>
      );
    }
    return (
      <Text style={styles.tableCellText}>
        {schedule.scheduledDate || schedule.date}
      </Text>
    );
  };

  const renderDept = (schedule: any) => {
    if (schedule.isSpecialEvent) {
      return (
        <Text style={styles.eventText}>
          {schedule.specialEventType === "OPENING"
            ? "🔴 Opening"
            : schedule.specialEventType === "LUNCH"
              ? "🍽️ Lunch"
              : "🔵 Closing"}
        </Text>
      );
    }
    return (
      <View style={styles.deptRow}>
        {Array.isArray(schedule.departments) &&
        schedule.departments.length > 0 ? (
          schedule.departments.map((dept: string, i: number) => (
            <View key={i} style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{dept}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.cellEmpty}>—</Text>
        )}
      </View>
    );
  };

  const renderAuditor = (schedule: any) => {
    const names =
      Array.isArray(schedule.coAuditorNames) &&
      schedule.coAuditorNames.length > 0
        ? schedule.coAuditorNames
        : Array.isArray(schedule.teamAuditorNames) &&
            schedule.teamAuditorNames.length > 0
          ? schedule.teamAuditorNames
          : schedule.auditorName
            ? [schedule.auditorName]
            : [];
    return (
      <Text style={styles.tableCellText} numberOfLines={2}>
        {names.length > 0 ? names.join(", ") : "-"}
      </Text>
    );
  };

  const renderAuditee = (schedule: any) => {
    const names =
      Array.isArray(schedule.auditeeNames) && schedule.auditeeNames.length > 0
        ? schedule.auditeeNames
        : schedule.auditeeName
          ? [schedule.auditeeName]
          : [];
    return (
      <Text style={styles.tableCellText} numberOfLines={2}>
        {names.length > 0 ? names.join(", ") : "-"}
      </Text>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // DESKTOP TABLE — flex-fit
  // ═══════════════════════════════════════════════════════════
  const renderDesktopTable = () => (
    <View style={styles.tableWrapperDesktop}>
      <View style={styles.tableHeaderDesktop}>
        <View style={[styles.tableCellDesktop, styles.colDateDesktop]}>
          <Text style={styles.tableHeaderText}>Date</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colTimeDesktop]}>
          <Text style={styles.tableHeaderText}>Time Slot</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colDeptDesktop]}>
          <Text style={styles.tableHeaderText}>Dept/Event</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colAuditTypeDesktop]}>
          <Text style={styles.tableHeaderText}>Audit Type</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colAuditorDesktop]}>
          <Text style={styles.tableHeaderText}>Auditor</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colAuditeeDesktop]}>
          <Text style={styles.tableHeaderText}>Auditee</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colStatusDesktop]}>
          <Text style={styles.tableHeaderText}>Status</Text>
        </View>
        <View style={[styles.tableCellDesktop, styles.colApprovedByDesktop]}>
          <Text style={styles.tableHeaderText}>Approved/Rejected By</Text>
        </View>
        <View
          style={[
            styles.tableCellDesktop,
            styles.colActionsDesktop,
            { borderRightWidth: 0 },
          ]}
        >
          <Text style={styles.tableHeaderText}>Actions</Text>
        </View>
      </View>

      {visibleRows.map((schedule: any, idx: number) => {
        const approvalStatus =
          schedule.detailedApprovalStatus || schedule.approvalStatus || "DRAFT";
        const isLastRow = idx === visibleRows.length - 1;
        return (
          <View
            key={schedule.id || idx}
            style={[
              styles.tableRowDesktop,
              idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              !isLastRow && styles.tableRowBorderBottom,
            ]}
          >
            <View style={[styles.tableCellDesktop, styles.colDateDesktop]}>
              {renderDate(schedule)}
            </View>
            <View style={[styles.tableCellDesktop, styles.colTimeDesktop]}>
              <Text style={styles.tableCellText}>
                {schedule.startTime} - {schedule.endTime}
              </Text>
            </View>
            <View style={[styles.tableCellDesktop, styles.colDeptDesktop]}>
              {renderDept(schedule)}
            </View>
            <View style={[styles.tableCellDesktop, styles.colAuditTypeDesktop]}>
              <Text style={styles.tableCellText} numberOfLines={2}>
                {schedule.auditType || "-"}
              </Text>
            </View>
            <View style={[styles.tableCellDesktop, styles.colAuditorDesktop]}>
              {renderAuditor(schedule)}
            </View>
            <View style={[styles.tableCellDesktop, styles.colAuditeeDesktop]}>
              {renderAuditee(schedule)}
            </View>
            <View style={[styles.tableCellDesktop, styles.colStatusDesktop]}>
              {getStatusBadge(approvalStatus)}
            </View>
            <View
              style={[styles.tableCellDesktop, styles.colApprovedByDesktop]}
            >
              {renderApprovedBy(schedule, approvalStatus)}
            </View>
            <View
              style={[
                styles.tableCellDesktop,
                styles.colActionsDesktop,
                { borderRightWidth: 0 },
              ]}
            >
              {renderActions(schedule, approvalStatus)}
            </View>
          </View>
        );
      })}

      {visibleRows.length === 0 && (
        <View style={styles.emptyStateDesktop}>
          <Text style={styles.emptyTableText}>
            No schedules found for selected filter and tab.
          </Text>
        </View>
      )}
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  // MOBILE TABLE — fixed width, horizontal scroll
  // ═══════════════════════════════════════════════════════════
  const renderMobileTable = () => (
    <View style={styles.tableWrapperMobile}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: MOBILE_TABLE_WIDTH }}>
          <View style={styles.tableHeaderMobile}>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Date</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Time Slot</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Dept/Event</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Audit Type</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Auditor</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Auditee</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Status</Text>
            </View>
            <View style={styles.tableCellMobile}>
              <Text style={styles.tableHeaderText}>Approved/Rejected By</Text>
            </View>
            <View style={[styles.tableCellMobile, { borderRightWidth: 0 }]}>
              <Text style={styles.tableHeaderText}>Actions</Text>
            </View>
          </View>

          {visibleRows.map((schedule: any, idx: number) => {
            const approvalStatus =
              schedule.detailedApprovalStatus ||
              schedule.approvalStatus ||
              "DRAFT";
            const isLastRow = idx === visibleRows.length - 1;
            return (
              <View
                key={schedule.id || idx}
                style={[
                  styles.tableRowMobile,
                  idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                  !isLastRow && styles.tableRowBorderBottom,
                ]}
              >
                <View style={styles.tableCellMobile}>
                  {renderDate(schedule)}
                </View>
                <View style={styles.tableCellMobile}>
                  <Text style={styles.tableCellText}>
                    {schedule.startTime} - {schedule.endTime}
                  </Text>
                </View>
                <View style={styles.tableCellMobile}>
                  {renderDept(schedule)}
                </View>
                <View style={styles.tableCellMobile}>
                  <Text style={styles.tableCellText} numberOfLines={2}>
                    {schedule.auditType || "-"}
                  </Text>
                </View>
                <View style={styles.tableCellMobile}>
                  {renderAuditor(schedule)}
                </View>
                <View style={styles.tableCellMobile}>
                  {renderAuditee(schedule)}
                </View>
                <View style={styles.tableCellMobile}>
                  {getStatusBadge(approvalStatus)}
                </View>
                <View style={styles.tableCellMobile}>
                  {renderApprovedBy(schedule, approvalStatus)}
                </View>
                <View style={[styles.tableCellMobile, { borderRightWidth: 0 }]}>
                  {renderActions(schedule, approvalStatus)}
                </View>
              </View>
            );
          })}

          {visibleRows.length === 0 && (
            <View
              style={[styles.emptyStateMobile, { width: MOBILE_TABLE_WIDTH }]}
            >
              <Text style={styles.emptyTableText}>
                No schedules found for selected filter and tab.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            isDesktop
              ? styles.modalContainerDesktop
              : styles.modalContainerMobile,
          ]}
        >
          {/* HEADER */}
          {isDesktop ? (
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Daily Schedule - {monthDisplay[plan.month]} {plan.year}
                </Text>
                {plan.leadAuditorName && (
                  <Text style={styles.headerSubText} numberOfLines={1}>
                    Lead Auditor: {plan.leadAuditorName}
                  </Text>
                )}
                <Text style={styles.headerSubText} numberOfLines={1}>
                  Prepared by: {plan.preparedBy || "N/A"}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeIconButton}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.headerMobile}>
              <View style={styles.headerMobileTop}>
                <Text
                  style={styles.headerTitleMobile}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Daily Schedule - {monthDisplay[plan.month]} {plan.year}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeIconButton}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.headerMobileBottom}>
                <Text
                  style={styles.headerSubTextMobile}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {plan.leadAuditorName
                    ? `Lead Auditor: ${plan.leadAuditorName}`
                    : "—"}
                </Text>
              </View>
              <Text
                style={[styles.headerSubTextMobile, { flex: 0 }]}
                numberOfLines={1}
              >
                Prepared by: {plan.preparedBy || "N/A"}
              </Text>
            </View>
          )}

          {/* TABS */}
          <View style={styles.tabsBar}>
            <TouchableOpacity
              onPress={() => setActiveTab("pending")}
              style={[
                styles.tabItem,
                activeTab === "pending" && styles.tabItemActive,
              ]}
            >
              <Clock
                size={16}
                color={
                  activeTab === "pending" ? COLORS.primary : COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "pending" && styles.tabTextActive,
                ]}
              >
                Pending Approval ({filteredPending.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("history")}
              style={[
                styles.tabItem,
                activeTab === "history" && styles.tabItemActive,
              ]}
            >
              <Archive
                size={16}
                color={
                  activeTab === "history" ? COLORS.primary : COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "history" && styles.tabTextActive,
                ]}
              >
                History & Approved (
                {
                  schedulesList.filter(
                    (s: any) =>
                      s.detailedApprovalStatus === "APPROVED" ||
                      s.detailedApprovalStatus === "REJECTED",
                  ).length
                }
                )
              </Text>
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Filter */}
            <View style={styles.filterBar}>
              <Filter size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.filterInput}
                value={auditTypeFilter}
                onChangeText={setAuditTypeFilter}
                placeholder="Filter by audit type or elements..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {isDesktop ? renderDesktopTable() : renderMobileTable()}

            {/* Bulk actions */}
            {activeTab === "pending" && filteredPending.length > 0 && (
              <View style={styles.bulkBox}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <AlertCircle size={16} color={COLORS.primaryDark} />
                  <Text style={styles.bulkTitle}>
                    Bulk Actions: {filteredPending.length} pending schedule(s)
                    {auditTypeFilter
                      ? ` for audit type "${auditTypeFilter}"`
                      : " (all audit types)"}
                  </Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.actionsLabel}>
                    Comments / Reason (Optional for approve, required for
                    reject)
                  </Text>
                  <TextInput
                    multiline
                    numberOfLines={2}
                    value={approvalComment || ""}
                    onChangeText={setApprovalComment}
                    style={styles.actionsInput}
                    placeholder="Add comments for bulk action..."
                    placeholderTextColor={COLORS.textMuted}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.footerRightAligned}>
                  <OutlineButton
                    title="Reject All"
                    icon={X}
                    onPress={onOpenRejectModal}
                    variant="destructive"
                  />
                  <OutlineButton
                    title="Approve All"
                    icon={CheckSquare}
                    onPress={onBulkApprove}
                    disabled={submitting}
                    loading={submitting}
                    variant="primary"
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const styles: any = {
  // Overlay / containers
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: "92%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContainerDesktop: { width: "90%", maxWidth: 1200, flex: 1 },
  modalContainerMobile: { width: "98%", flex: 1 },

  // Small dialog
  smallModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
    maxWidth: 480,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderSimple: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleSimple: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  modalBodyText: {
    fontSize: 14,
    color: COLORS.textValue,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Header (desktop)
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexShrink: 0,
  },
  headerLeft: { flex: 1, paddingRight: 12, justifyContent: "center" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },

  // Header (mobile)
  headerMobile: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 8,
    flexShrink: 0,
  },
  headerMobileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitleMobile: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  headerMobileBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  headerSubTextMobile: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  closeIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    flexShrink: 0,
  },

  // Tabs
  tabsBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    flexShrink: 0,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  body: { paddingHorizontal: 24, paddingTop: 20 },

  // Filter bar
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  filterInput: {
    flex: 1,
    paddingVertical: 4,
    fontSize: 14,
    color: COLORS.text,
  },

  // Status pills
  statusPillApproved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignSelf: "flex-start",
  },
  statusPillApprovedText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusPillPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start",
  },
  statusPillPendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  statusPillDefault: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start",
  },
  statusPillDefaultText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  statusPillRejected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignSelf: "flex-start",
  },
  statusPillRejectedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B91C1C",
  },
  statusPillChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.blue100,
    borderWidth: 1,
    borderColor: COLORS.blue200,
    alignSelf: "flex-start",
  },
  statusPillChangeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  statusPillScheduled: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: COLORS.yellow50,
    borderWidth: 1,
    borderColor: COLORS.yellowBorder,
    alignSelf: "flex-start",
  },
  statusPillScheduledText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.yellow700,
  },

  // ─────────────── DESKTOP TABLE (flex-fit, no scroll) ───────────────
  tableWrapperDesktop: {
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  tableHeaderDesktop: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowDesktop: {
    flexDirection: "row",
    alignItems: "stretch", // equal-height cells
    backgroundColor: COLORS.card,
  },
  tableRowBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCellDesktop: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: "center",
  },
  // Form5 week-schedule column weights
  cellDeptDesktop: {
    flex: 2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellWeekDesktop: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellElemDesktop: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellAuditorDesktop: {
    flex: 3,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellAuditeeDesktop: {
    flex: 2.5,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellStatusDesktop: {
    flex: 1.2,
    minWidth: 0,
    alignItems: "center",
  },

  // Detailed schedule column weights
  colDateDesktop: {
    flex: 1.2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colTimeDesktop: {
    flex: 1.2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colDeptDesktop: {
    flex: 1.3,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colAuditTypeDesktop: {
    flex: 2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colAuditorDesktop: {
    flex: 2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colAuditeeDesktop: {
    flex: 2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colStatusDesktop: {
    flex: 1.2,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colApprovedByDesktop: {
    flex: 1.8,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  colActionsDesktop: { flex: 1.2, minWidth: 0 },

  // ─────────────── MOBILE TABLE (fixed width + horizontal scroll) ───────────────
  tableWrapperMobile: {
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderMobile: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: COLORS.card,
  },
  tableRowMobile: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: COLORS.card,
  },
  tableRowEven: { backgroundColor: COLORS.card },
  tableRowOdd: { backgroundColor: COLORS.bg },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: "center",
  },
  tableCellMobile: {
    width: 120,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: "center",
  },
  tableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  // Shared text
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  tableTextCenter: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
  },
  tableCellText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
    textAlign: "center",
  },
  tableEmptyText: {
    fontSize: 12,
    color: COLORS.gray300,
    textAlign: "center",
  },
  cellEmpty: { fontSize: 13, color: COLORS.gray400, fontWeight: "500" },

  // Badge rows
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  elementBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  elementText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  auditorBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  auditorText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: "500",
    maxWidth: 120,
  },
  auditeeBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  auditeeText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: "500",
    maxWidth: 110,
  },

  // Legend
  legendBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    padding: 12,
    marginBottom: 16,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textValue,
    marginBottom: 6,
  },
  legendText: { fontSize: 11, color: COLORS.textMuted },

  // Actions
  actionsSection: { marginTop: 4, marginBottom: 12 },
  actionsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textValue,
    marginBottom: 6,
  },
  actionsInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 72,
    textAlignVertical: "top",
  },

  // Footer / action rows
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  footerRightAligned: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 8,
  },

  // Bulk box
  bulkBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    marginBottom: 16,
  },
  bulkTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primaryDark,
    flex: 1,
  },

  // Approved banner
  approvedBanner: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  approvedBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  approvedBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryDark,
    flex: 1,
  },

  // Empty states
  emptyStateDesktop: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateMobile: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTableText: { fontSize: 13, color: COLORS.textMuted },

  // Action icon buttons
  actionsRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  actionButton: {
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Text helpers
  textSuccess: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
  textDanger: { fontSize: 11, fontWeight: "600", color: "#B91C1C" },
  textWarning: { fontSize: 11, fontWeight: "600", color: COLORS.primaryDark },

  // Date range helpers
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  rangeIcon: { fontSize: 10, color: COLORS.primary },
  rangeLabel: { fontSize: 10, fontWeight: "700", color: COLORS.textValue },
  rangeBadgeWrap: {
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  rangeBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.primary,
  },
  rangeText: { fontSize: 12, fontWeight: "500", color: COLORS.textMuted },

  // Event / Dept chips
  eventText: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  deptRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  deptBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: "100%",
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.primary,
  },
};
