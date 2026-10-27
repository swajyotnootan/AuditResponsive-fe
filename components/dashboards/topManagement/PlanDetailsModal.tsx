import { Check, CheckCircle, Clock, FileText, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

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
};

const monthDisplay: Record<string, string> = {
  Apr: "Apr",
  May: "May",
  Jun: "Jun",
  Jul: "Jul",
  Aug: "Aug",
  Sep: "Sep",
  Oct: "Oct",
  Nov: "Nov",
  Dec: "Dec",
  Jan: "Jan",
  Feb: "Feb",
  Mar: "Mar",
};

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

// ═══ REUSABLE OUTLINE BUTTON ═══
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? "#2563EB" : "#D1D5DB";
  const textColor = isHoveredAndEnabled ? "#2563EB" : "#111827";
  const iconColor = isHoveredAndEnabled ? "#2563EB" : "#6B7280";
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(37, 99, 235, 0.1)"
    : "transparent";

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
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

interface PlanDetailsModalProps {
  selectedPlan: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approvalComment: string;
  setApprovalComment: (text: string) => void;
  submitting: boolean;
}

const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({
  selectedPlan,
  onClose,
  onApprove,
  onReject,
  approvalComment,
  setApprovalComment,
  submitting,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isSmallMobile = width < 420;

  if (!selectedPlan) return null;

  // ═══ DATA DERIVATION (UNCHANGED) ═══
  const planItems = selectedPlan.planItems || selectedPlan.items || [];

  const monthsInPlan = new Set<string>();
  planItems.forEach((item: any) => {
    item.months?.forEach((m: any) => {
      const monthKey = m.month || m;
      if (monthKey) monthsInPlan.add(monthKey);
    });
  });

  const displayedMonths = monthOrder.filter((m) => monthsInPlan.has(m));

  const getMonthStatus = (item: any, month: string) => {
    if (!item.months) return null;
    const found = item.months.find((m: any) => (m.month || m) === month);
    return found || null;
  };

  const totalPlanned = planItems.reduce(
    (sum: number, item: any) =>
      sum +
      (item.months?.filter(
        (m: any) => (m.status || "").toUpperCase() === "PLANNED",
      ).length || 0),
    0,
  );

  const totalCompleted = planItems.reduce(
    (sum: number, item: any) =>
      sum +
      (item.months?.filter(
        (m: any) => (m.status || "").toUpperCase() === "COMPLETED",
      ).length || 0),
    0,
  );

  const completionRate =
    totalPlanned + totalCompleted > 0
      ? ((totalCompleted / (totalPlanned + totalCompleted)) * 100).toFixed(1)
      : "0.0";

  const approvalStatus = (selectedPlan.approvalStatus || "").toUpperCase();
  const isApproved = approvalStatus.includes("APPROVED");
  const isPending = approvalStatus.includes("PENDING");

  // ═══ STATUS CELL — all blue ═══
  const renderStatusCell = (item: any, month: string) => {
    const statusData = getMonthStatus(item, month);
    if (!statusData) return <Text style={styles.cellEmpty}>—</Text>;

    const status = (statusData.status || "").toUpperCase();
    let label = "—";
    let badgeStyle: any = styles.cellEmptyBadge;
    let textStyle: any = styles.cellEmptyBadgeText;

    if (status === "PLANNED" || status === "PENDING") {
      label = "P";
      badgeStyle = styles.cellPlannedBadge;
      textStyle = styles.cellPlannedBadgeText;
    } else if (status === "COMPLETED" || status === "DONE") {
      label = "C";
      badgeStyle = styles.cellCompletedBadge;
      textStyle = styles.cellCompletedBadgeText;
    } else if (status === "IN_PROGRESS") {
      label = "IP";
      badgeStyle = styles.cellInProgressBadge;
      textStyle = styles.cellInProgressBadgeText;
    } else {
      label = status.substring(0, 2);
    }

    return (
      <View style={badgeStyle}>
        <Text style={textStyle}>{label}</Text>
      </View>
    );
  };

  // ═══ STATUS PILL (extracted for cleaner mobile layout) ═══
  const renderStatusPill = () => {
    if (isApproved) {
      return (
        <View style={styles.statusPillApproved}>
          <CheckCircle size={12} color={COLORS.primary} />
          <Text style={styles.statusPillApprovedText}>Approved</Text>
        </View>
      );
    }
    if (isPending) {
      return (
        <View style={styles.statusPillPending}>
          <Clock size={12} color={COLORS.textMuted} />
          <Text style={styles.statusPillPendingText}>Pending</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusPillDefault}>
        <FileText size={12} color={COLORS.textMuted} />
        <Text style={styles.statusPillDefaultText}>Draft</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            isDesktop
              ? styles.modalContainerDesktop
              : styles.modalContainerMobile,
          ]}
        >
          {/* ═══════════════ HEADER ═══════════════ */}
          {isDesktop ? (
            /* ── DESKTOP HEADER — UNCHANGED ── */
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Annual Audit Plan {selectedPlan.year}
                </Text>
              </View>

              <View style={styles.headerRight}>
                {renderStatusPill()}

                <Text style={styles.headerSubText} numberOfLines={1}>
                  Prepared by: {selectedPlan.preparedBy || "N/A"}
                </Text>

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
            /* ── MOBILE HEADER — STACKED ── */
            <View style={styles.headerMobile}>
              {/* Row 1: Title + close */}
              <View style={styles.headerMobileTop}>
                <Text
                  style={styles.headerTitleMobile}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Annual Audit Plan {selectedPlan.year}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeIconButton}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Row 2: Status pill + Prepared by */}
              <View style={styles.headerMobileBottom}>
                {renderStatusPill()}
                <Text
                  style={styles.headerSubTextMobile}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Prepared by: {selectedPlan.preparedBy || "N/A"}
                </Text>
              </View>
            </View>
          )}

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* ═══ KPI CARDS ═══ */}
            {isDesktop ? (
              /* ── DESKTOP KPI — UNCHANGED (3 columns) ── */
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, styles.kpiCardBlue]}>
                  <Text style={styles.kpiLabelBlue}>Total Planned</Text>
                  <Text style={styles.kpiValueBlue}>{totalPlanned}</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardBlueLight]}>
                  <Text style={styles.kpiLabelBlueLight}>Completed</Text>
                  <Text style={styles.kpiValueBlueLight}>{totalCompleted}</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardBlueSubtle]}>
                  <Text style={styles.kpiLabelBlueSubtle}>Completion Rate</Text>
                  <Text style={styles.kpiValueBlueSubtle}>
                    {completionRate}%
                  </Text>
                </View>
              </View>
            ) : (
              /* ── MOBILE KPI — 3 COLUMNS, COMPACT ── */
              <View style={styles.kpiRowMobile}>
                <View style={[styles.kpiCardMobile, styles.kpiCardBlue]}>
                  <Text style={styles.kpiLabelMobile}>Planned</Text>
                  <Text style={styles.kpiValueMobile}>{totalPlanned}</Text>
                </View>
                <View style={[styles.kpiCardMobile, styles.kpiCardBlueLight]}>
                  <Text style={styles.kpiLabelMobile}>Completed</Text>
                  <Text style={styles.kpiValueMobile}>{totalCompleted}</Text>
                </View>
                <View style={[styles.kpiCardMobile, styles.kpiCardBlueSubtle]}>
                  <Text style={styles.kpiLabelMobile}>Rate</Text>
                  <Text style={styles.kpiValueMobile}>{completionRate}%</Text>
                </View>
              </View>
            )}

            {/* ═══ PLAN TABLE ═══ */}
            <View style={styles.tableContainer}>
              {/* On mobile: horizontal scroll. On desktop: full-width table, no scroll. */}
              <ScrollView
                horizontal={!isDesktop}
                showsHorizontalScrollIndicator={!isDesktop}
              >
                <View style={isDesktop ? styles.tableInnerDesktop : undefined}>
                  <View style={styles.tableHeader}>
                    <View
                      style={[
                        styles.tableHeaderCell,
                        styles.tableHeaderCellAudit,
                        isDesktop && styles.tableHeaderCellAuditDesktop,
                      ]}
                    >
                      <Text style={styles.tableHeaderText}>Audit Element</Text>
                    </View>
                    {displayedMonths.map((m) => (
                      <View
                        key={m}
                        style={[
                          styles.tableHeaderCell,
                          isDesktop && styles.tableHeaderCellDesktop,
                        ]}
                      >
                        <Text style={styles.tableHeaderText}>
                          {monthDisplay[m] || m}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {planItems.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.tableRow,
                        idx % 2 === 0
                          ? styles.tableRowEven
                          : styles.tableRowOdd,
                      ]}
                    >
                      <View
                        style={[
                          styles.tableCell,
                          styles.tableCellAudit,
                          isDesktop && styles.tableCellAuditDesktop,
                        ]}
                      >
                        <Text style={styles.tableCellText} numberOfLines={2}>
                          {item.auditElement ||
                            item.element ||
                            item.name ||
                            "-"}
                        </Text>
                      </View>
                      {displayedMonths.map((m) => (
                        <View
                          key={m}
                          style={[
                            styles.tableCell,
                            isDesktop && styles.tableCellDesktop,
                          ]}
                        >
                          {renderStatusCell(item, m)}
                        </View>
                      ))}
                    </View>
                  ))}

                  {planItems.length === 0 && (
                    <View style={styles.emptyTable}>
                      <Text style={styles.emptyTableText}>
                        No audit elements found in this plan
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* ═══ APPROVED BANNER ═══ */}
            {isApproved && (
              <View style={styles.approvedBanner}>
                <View style={styles.approvedBannerHeader}>
                  <CheckCircle size={20} color={COLORS.primary} />
                  <Text style={styles.approvedBannerTitle}>Plan Approved</Text>
                </View>
                <Text style={styles.approvedBannerText}>
                  This audit plan has been fully approved and is ready for
                  execution.
                </Text>
                <Text style={styles.approvedBannerMeta}>
                  Approved by: {selectedPlan.approvedBy || "Top Management"}
                  {selectedPlan.approvedAt
                    ? ` • ${new Date(
                        selectedPlan.approvedAt,
                      ).toLocaleDateString()}`
                    : ""}
                </Text>
              </View>
            )}

            {/* ═══ PENDING → ACTIONS ═══ */}
            {!isApproved && (
              <View style={styles.actionsSection}>
                <Text style={styles.actionsLabel}>
                  Approval Comments (Optional)
                </Text>
                <TextInput
                  style={styles.actionsInput}
                  placeholder="Add any comments for approval..."
                  placeholderTextColor={COLORS.textMuted}
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {/* ═══ FOOTER ═══ */}
          {!isApproved && (
            <View style={isDesktop ? styles.footer : styles.footerMobile}>
              <OutlineButton
                title="Close"
                onPress={onClose}
                disabled={submitting}
              />

              <View style={styles.footerRight}>
                <OutlineButton
                  title="Reject"
                  icon={X}
                  onPress={onReject}
                  disabled={submitting}
                />
                <OutlineButton
                  title="Approve"
                  icon={Check}
                  onPress={onApprove}
                  disabled={submitting}
                  loading={submitting}
                />
              </View>
            </View>
          )}

          {isApproved && (
            <View style={isDesktop ? styles.footer : styles.footerMobile}>
              <OutlineButton title="Close" onPress={onClose} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PlanDetailsModal;

// ═══ STYLES ═══
const styles: any = {
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
  modalContainerDesktop: { width: "90%", maxWidth: 1100, flex: 1 },
  modalContainerMobile: { width: "98%", flex: 1 },

  // ═══ DESKTOP HEADER (UNCHANGED) ═══
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

  // ═══ MOBILE HEADER (NEW — STACKED) ═══
  headerMobile: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 10,
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

  headerSubText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  closeIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    flexShrink: 0,
  },

  // Status pills (unchanged)
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  statusPillDefaultText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

  body: { paddingHorizontal: 24, paddingTop: 20 },

  // ═══ DESKTOP KPI (UNCHANGED) ═══
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  kpiLabelBlue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.blue800,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  kpiValueBlue: { fontSize: 26, fontWeight: "800", color: COLORS.blue800 },
  kpiLabelBlueLight: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.blue800,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  kpiValueBlueLight: { fontSize: 26, fontWeight: "800", color: COLORS.blue800 },
  kpiLabelBlueSubtle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.blue900,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  kpiValueBlueSubtle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.blue900,
  },
  kpiCardBlue: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.blue200,
  },
  kpiCardBlueLight: {
    backgroundColor: COLORS.blue100,
    borderColor: COLORS.blue200,
  },
  kpiCardBlueSubtle: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },

  // ═══ MOBILE KPI (NEW — COMPACT 3-COL) ═══
  kpiRowMobile: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCardMobile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  kpiLabelMobile: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.blue800,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  kpiValueMobile: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.blue800,
    textAlign: "center",
  },

  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    minWidth: 80,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableHeaderCellAudit: {
    minWidth: 220,
    alignItems: "flex-start",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textValue,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowEven: { backgroundColor: COLORS.card },
  tableRowOdd: { backgroundColor: COLORS.bg },
  tableCell: {
    minWidth: 80,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableCellAudit: {
    minWidth: 220,
    alignItems: "flex-start",
  },
  tableCellText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },

  // ═══ DESKTOP-ONLY: full-width table, no horizontal scroll ═══
  tableInnerDesktop: {
    width: "100%",
    flexDirection: "column",
  },
  tableHeaderCellDesktop: {
    flex: 1, // each month column shares remaining width equally
    minWidth: 0, // allow shrinking to fit
    paddingHorizontal: 4,
  },
  tableCellDesktop: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  tableHeaderCellAuditDesktop: {
    flex: 0, // don't grow/shrink the audit-element column
    width: 220, // fixed width for the left column
    minWidth: 220,
  },
  tableCellAuditDesktop: {
    flex: 0,
    width: 220,
    minWidth: 220,
  },

  cellEmpty: { fontSize: 14, color: COLORS.gray400, fontWeight: "500" },
  cellEmptyBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmptyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray400,
  },
  cellPlannedBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cellPlannedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  cellCompletedBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.blue200,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cellCompletedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  cellInProgressBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.blue100,
    borderWidth: 1,
    borderColor: COLORS.blue300,
    alignItems: "center",
    justifyContent: "center",
  },
  cellInProgressBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },

  emptyTable: { padding: 32, alignItems: "center" },
  emptyTableText: { fontSize: 13, color: COLORS.textMuted },

  approvedBanner: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 12,
    padding: 20,
  },
  approvedBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  approvedBannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  approvedBannerText: {
    fontSize: 14,
    color: COLORS.textValue,
    lineHeight: 20,
    marginBottom: 10,
  },
  approvedBannerMeta: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  actionsSection: { marginTop: 4 },
  actionsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textValue,
    marginBottom: 8,
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
    minHeight: 80,
    textAlignVertical: "top",
  },

  // ═══ DESKTOP FOOTER (UNCHANGED) ═══
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  footerRight: { flexDirection: "row", gap: 12 },

  // ═══ MOBILE FOOTER (NEW — STACKED / WIDE BUTTONS) ═══
  footerMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 8,
    flexWrap: "nowrap",
  },
};
