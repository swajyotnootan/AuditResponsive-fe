// src/components/modals/DeptPlanDetailsModal.tsx
import { AlertCircle, Check, CheckCircle, Clock, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
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

// ═══ MOBILE COLUMN WIDTHS ═══
const MOBILE_DEPT_WIDTH = 130;
const MOBILE_ELEM_WIDTH = 100;
const MOBILE_MONTH_WIDTH = 44;
const MOBILE_TABLE_WIDTH =
  MOBILE_DEPT_WIDTH + MOBILE_ELEM_WIDTH + MOBILE_MONTH_WIDTH * 12; // = 758

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

interface DeptPlanDetailsModalProps {
  selectedPlan: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approvalComment: string;
  setApprovalComment: (text: string) => void;
  submitting: boolean;
}

const DeptPlanDetailsModal = ({
  selectedPlan,
  onClose,
  onApprove,
  onReject,
  approvalComment,
  setApprovalComment,
  submitting,
}: DeptPlanDetailsModalProps) => {
  if (!selectedPlan) return null;

  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const isDesktop = windowWidth >= 768;

  const departments = selectedPlan.planItems || [];
  const months = [
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
  const monthDisplay: Record<string, string> = {
    Apr: "April",
    May: "May",
    Jun: "June",
    Jul: "July",
    Aug: "August",
    Sep: "September",
    Oct: "October",
    Nov: "November",
    Dec: "December",
    Jan: "January",
    Feb: "February",
    Mar: "March",
  };

  let totalPlanned = 0;
  let totalCompleted = 0;
  let totalRescheduled = 0;

  departments.forEach((dept: any) => {
    dept.months?.forEach((month: any) => {
      if (month?.status === "PLANNED") totalPlanned++;
      if (month?.status === "COMPLETED") totalCompleted++;
      if (month?.status === "RESCHEDULED") totalRescheduled++;
    });
  });

  const completionRate =
    totalPlanned > 0 ? ((totalCompleted / totalPlanned) * 100).toFixed(1) : "0";

  const approvalStatus = (selectedPlan.approvalStatus || "").toUpperCase();
  const isApproved = approvalStatus.includes("APPROVED");
  const isPending = approvalStatus.includes("PENDING_APPROVAL");
  const isRejected = approvalStatus.includes("REJECTED");

  // ═══ Status badge — ALL BLUE ═══
  const renderStatusBadge = () => {
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
    if (isRejected) {
      return (
        <View style={styles.statusPillRejected}>
          <X size={12} color={COLORS.primaryDark} />
          <Text style={styles.statusPillRejectedText}>Rejected</Text>
        </View>
      );
    }
    return (
      <View style={styles.statusPillDraft}>
        <Text style={styles.statusPillDraftText}>Draft</Text>
      </View>
    );
  };

  const modalMaxWidth = isDesktop ? 1100 : "100%";
  const modalHeight = isDesktop ? windowHeight * 0.9 : windowHeight * 0.92;
  const headerHeight = 70;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            { maxWidth: modalMaxWidth, height: modalHeight },
          ]}
        >
          {/* ═══════════════ HEADER ═══════════════ */}
          {isDesktop ? (
            /* ── DESKTOP HEADER — UNCHANGED ── */
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Department Audit Plan {selectedPlan.year}
                </Text>
              </View>

              <View style={styles.headerRight}>
                {renderStatusBadge()}

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
              <View style={styles.headerMobileTop}>
                <Text
                  style={styles.headerTitleMobile}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  Department Audit Plan {selectedPlan.year}
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
                {renderStatusBadge()}
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
            style={[styles.scrollView, { height: modalHeight - headerHeight }]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              paddingHorizontal: isDesktop ? 24 : 16,
              paddingTop: 20,
              paddingBottom: 24,
              flexGrow: 1,
            }}
          >
            {/* ═══ KPI CARDS ═══ */}
            {isDesktop ? (
              /* ── DESKTOP KPI — 4 in a row (UNCHANGED) ── */
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, styles.kpiCardBlue]}>
                  <Text style={styles.kpiLabelBlue}>Planned (P)</Text>
                  <Text style={styles.kpiValueBlue}>{totalPlanned}</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardBlueLight]}>
                  <Text style={styles.kpiLabelBlueLight}>Completed (C)</Text>
                  <Text style={styles.kpiValueBlueLight}>{totalCompleted}</Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardBlueSoft]}>
                  <Text style={styles.kpiLabelBlueSoft}>Rescheduled (R)</Text>
                  <Text style={styles.kpiValueBlueSoft}>
                    {totalRescheduled}
                  </Text>
                </View>
                <View style={[styles.kpiCard, styles.kpiCardBlueDeep]}>
                  <Text style={styles.kpiLabelBlueDeep}>Completion Rate</Text>
                  <Text style={styles.kpiValueBlueDeep}>{completionRate}%</Text>
                </View>
              </View>
            ) : (
              /* ── MOBILE KPI — 2×2 grid, compact ── */
              <View style={styles.kpiGridMobile}>
                <View style={styles.kpiRowMobile}>
                  <View style={[styles.kpiCardMobile, styles.kpiCardBlue]}>
                    <Text style={styles.kpiLabelMobile}>Planned</Text>
                    <Text style={styles.kpiValueMobile}>{totalPlanned}</Text>
                  </View>
                  <View style={[styles.kpiCardMobile, styles.kpiCardBlueLight]}>
                    <Text style={styles.kpiLabelMobile}>Completed</Text>
                    <Text style={styles.kpiValueMobile}>{totalCompleted}</Text>
                  </View>
                </View>
                <View style={styles.kpiRowMobile}>
                  <View style={[styles.kpiCardMobile, styles.kpiCardBlueSoft]}>
                    <Text style={styles.kpiLabelMobile}>Resched.</Text>
                    <Text style={styles.kpiValueMobile}>
                      {totalRescheduled}
                    </Text>
                  </View>
                  <View style={[styles.kpiCardMobile, styles.kpiCardBlueDeep]}>
                    <Text style={styles.kpiLabelMobile}>Rate</Text>
                    <Text style={styles.kpiValueMobile}>{completionRate}%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ═══ DEPARTMENT TABLE ═══ */}
            <View style={styles.tableContainer}>
              {isDesktop ? (
                /* ── DESKTOP: no scroll, table fills width via flex ── */
                <View style={{ width: "100%", flexDirection: "column" }}>
                  <View style={styles.tableHeader}>
                    <View
                      style={[
                        styles.tableHeaderCell,
                        styles.tableHeaderCellDeptDesktop,
                      ]}
                    >
                      <Text style={styles.tableHeaderText}>Department</Text>
                    </View>
                    <View
                      style={[
                        styles.tableHeaderCell,
                        styles.tableHeaderCellElemDesktop,
                      ]}
                    >
                      <Text style={styles.tableHeaderText}>Elements</Text>
                    </View>
                    {months.map((month) => (
                      <View
                        key={month}
                        style={[
                          styles.tableHeaderCell,
                          styles.tableHeaderCellMonthDesktop,
                        ]}
                      >
                        <Text style={styles.tableHeaderTextSmall}>
                          {monthDisplay[month].substring(0, 3)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {departments.map((dept: any, idx: number) => {
                    const hasSelected = dept.months?.some(
                      (m: any) => m.selectedElements?.length > 0,
                    );
                    return (
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
                            styles.tableCellDeptDesktop,
                          ]}
                        >
                          <Text style={styles.tableCellText} numberOfLines={2}>
                            {dept.department}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.tableCell,
                            styles.tableCellElemDesktop,
                          ]}
                        >
                          {hasSelected ? (
                            <View style={styles.selectedRow}>
                              <CheckCircle size={12} color={COLORS.primary} />
                              <Text style={styles.selectedText}>Selected</Text>
                            </View>
                          ) : (
                            <Text style={styles.tableCellMuted}>—</Text>
                          )}
                        </View>
                        {dept.months?.map((month: any, mIdx: number) => (
                          <View
                            key={mIdx}
                            style={[
                              styles.tableCell,
                              styles.tableCellCentered,
                              styles.tableCellMonthDesktop,
                            ]}
                          >
                            {month.status === "COMPLETED" && (
                              <View style={styles.cellBadgeCompleted}>
                                <Text style={styles.cellBadgeCompletedText}>
                                  C
                                </Text>
                              </View>
                            )}
                            {month.status === "PLANNED" && (
                              <View style={styles.cellBadgePlanned}>
                                <Text style={styles.cellBadgePlannedText}>
                                  P
                                </Text>
                              </View>
                            )}
                            {month.status === "RESCHEDULED" && (
                              <View style={styles.cellBadgeRescheduled}>
                                <Text style={styles.cellBadgeRescheduledText}>
                                  R
                                </Text>
                              </View>
                            )}
                            {!month.status && (
                              <Text style={styles.tableCellMutedLg}>—</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* ── MOBILE: horizontal scroll — table width = exact content width ── */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={{ flexGrow: 0 }}
                >
                  <View
                    style={{
                      width: MOBILE_TABLE_WIDTH,
                      flexDirection: "column",
                    }}
                  >
                    <View style={styles.tableHeader}>
                      <View
                        style={[
                          styles.tableHeaderCell,
                          styles.tableHeaderCellDeptMobile,
                        ]}
                      >
                        <Text style={styles.tableHeaderText}>Department</Text>
                      </View>
                      <View
                        style={[
                          styles.tableHeaderCell,
                          styles.tableHeaderCellElemMobile,
                        ]}
                      >
                        <Text style={styles.tableHeaderText}>Elements</Text>
                      </View>
                      {months.map((month) => (
                        <View
                          key={month}
                          style={[
                            styles.tableHeaderCell,
                            styles.tableHeaderCellMonthMobile,
                          ]}
                        >
                          <Text style={styles.tableHeaderTextSmall}>
                            {monthDisplay[month].substring(0, 3)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {departments.map((dept: any, idx: number) => {
                      const hasSelected = dept.months?.some(
                        (m: any) => m.selectedElements?.length > 0,
                      );
                      return (
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
                              styles.tableCellDeptMobile,
                            ]}
                          >
                            <Text
                              style={styles.tableCellText}
                              numberOfLines={2}
                            >
                              {dept.department}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.tableCell,
                              styles.tableCellElemMobile,
                            ]}
                          >
                            {hasSelected ? (
                              <View style={styles.selectedRow}>
                                <CheckCircle size={12} color={COLORS.primary} />
                                <Text style={styles.selectedText}>
                                  Selected
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.tableCellMuted}>—</Text>
                            )}
                          </View>
                          {dept.months?.map((month: any, mIdx: number) => (
                            <View
                              key={mIdx}
                              style={[
                                styles.tableCell,
                                styles.tableCellCentered,
                                styles.tableCellMonthMobile,
                              ]}
                            >
                              {month.status === "COMPLETED" && (
                                <View style={styles.cellBadgeCompleted}>
                                  <Text style={styles.cellBadgeCompletedText}>
                                    C
                                  </Text>
                                </View>
                              )}
                              {month.status === "PLANNED" && (
                                <View style={styles.cellBadgePlanned}>
                                  <Text style={styles.cellBadgePlannedText}>
                                    P
                                  </Text>
                                </View>
                              )}
                              {month.status === "RESCHEDULED" && (
                                <View style={styles.cellBadgeRescheduled}>
                                  <Text style={styles.cellBadgeRescheduledText}>
                                    R
                                  </Text>
                                </View>
                              )}
                              {!month.status && (
                                <Text style={styles.tableCellMutedLg}>—</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* ═══ PENDING → Review Decision Section ═══ */}
            {isPending && (
              <View style={styles.reviewSection}>
                <Text style={styles.reviewTitle}>Review Decision</Text>
                <View style={{ gap: 12 }}>
                  <Text style={styles.actionsLabel}>
                    Approval Comments (Optional)
                  </Text>
                  <TextInput
                    style={styles.reviewInput}
                    multiline
                    numberOfLines={3}
                    value={approvalComment}
                    onChangeText={(text) => setApprovalComment(text)}
                    placeholder="Add any comments about this plan..."
                    placeholderTextColor={COLORS.gray400}
                    editable={true}
                    pointerEvents="auto"
                    blurOnSubmit={false}
                  />

                  <View
                    style={
                      isDesktop
                        ? styles.footerButtons
                        : styles.footerButtonsMobile
                    }
                  >
                    <OutlineButton
                      title="Reject Plan"
                      icon={X}
                      onPress={onReject}
                      disabled={submitting}
                    />
                    <OutlineButton
                      title="Approve Plan"
                      icon={Check}
                      onPress={onApprove}
                      disabled={submitting}
                      loading={submitting}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ═══ APPROVED / REJECTED SUMMARY ═══ */}
            {!isPending && (
              <View
                style={[
                  styles.statusBanner,
                  isApproved
                    ? styles.statusBannerApproved
                    : styles.statusBannerRejected,
                ]}
              >
                <View style={styles.statusBannerHeader}>
                  {isApproved ? (
                    <CheckCircle size={20} color={COLORS.primary} />
                  ) : (
                    <AlertCircle size={20} color={COLORS.primaryDark} />
                  )}
                  <Text style={styles.statusBannerTitle}>
                    Plan {isApproved ? "Approved" : "Rejected"}
                  </Text>
                </View>
                <Text style={styles.statusBannerText}>
                  {isApproved
                    ? "This department audit plan has been fully approved and is ready for execution."
                    : "This department audit plan was rejected. Please review the rejection reason provided below."}
                </Text>
                {isApproved && selectedPlan.approvedBy && (
                  <Text style={styles.statusBannerMeta}>
                    Approved by: {selectedPlan.approvedBy}
                    {selectedPlan.approvedAt
                      ? ` • ${new Date(
                          selectedPlan.approvedAt,
                        ).toLocaleDateString()}`
                      : ""}
                  </Text>
                )}
              </View>
            )}

            {/* ═══ REJECTION REASON ═══ */}
            {isRejected && selectedPlan.rejectionReason && (
              <View style={styles.rejectionReason}>
                <View style={styles.rejectionReasonHeader}>
                  <AlertCircle size={18} color={COLORS.primaryDark} />
                  <Text style={styles.rejectionReasonTitle}>
                    Rejection Reason
                  </Text>
                </View>
                <Text style={styles.rejectionReasonText}>
                  {selectedPlan.rejectionReason}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* ═══ FOOTER — Close button ═══ */}
          <View style={isDesktop ? styles.footer : styles.footerMobile}>
            <OutlineButton
              title="Close"
              onPress={onClose}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DeptPlanDetailsModal;

// ═══ STYLES — Monochromatic Blue ═══
const styles: any = {
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    padding: 8,
  },
  modalContainer: {
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: COLORS.card,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },

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
  headerLeft: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "center",
  },
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

  // ═══ MOBILE HEADER (STACKED) ═══
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

  scrollView: { flex: 1 },

  // ═══ Status pills ═══
  statusPillApproved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillPendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  statusPillRejected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillRejectedText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  statusPillDraft: {
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillDraftText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },

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
  kpiCardBlue: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.blue200,
  },
  kpiCardBlueLight: {
    backgroundColor: COLORS.blue100,
    borderColor: COLORS.blue200,
  },
  kpiCardBlueSoft: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.blue200,
  },
  kpiCardBlueDeep: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
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
  kpiValueBlueLight: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.blue800,
  },
  kpiLabelBlueSoft: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.blue900,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  kpiValueBlueSoft: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.blue900,
  },
  kpiLabelBlueDeep: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  kpiValueBlueDeep: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  // ═══ MOBILE KPI (2×2 compact) ═══
  kpiGridMobile: {
    marginBottom: 16,
    gap: 8,
  },
  kpiRowMobile: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCardMobile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
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

  // ═══ Table ═══
  tableContainer: {
    marginBottom: 20,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  tableHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  tableHeaderText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textValue,
  },
  tableHeaderTextSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textValue,
  },

  // ── Desktop column widths (Department fixed, Elements fixed, months flex) ──
  tableHeaderCellDeptDesktop: {
    flex: 0,
    width: 180,
    minWidth: 180,
    alignItems: "flex-start",
  },
  tableHeaderCellElemDesktop: {
    flex: 0,
    width: 130,
    minWidth: 130,
  },
  tableHeaderCellMonthDesktop: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },

  // ── Mobile column widths (fixed px, table scrolls horizontally) ──
  tableHeaderCellDeptMobile: {
    width: MOBILE_DEPT_WIDTH,
    minWidth: MOBILE_DEPT_WIDTH,
    alignItems: "flex-start",
  },
  tableHeaderCellElemMobile: {
    width: MOBILE_ELEM_WIDTH,
    minWidth: MOBILE_ELEM_WIDTH,
  },
  tableHeaderCellMonthMobile: {
    width: MOBILE_MONTH_WIDTH,
    minWidth: MOBILE_MONTH_WIDTH,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    width: "100%",
  },
  tableRowEven: { backgroundColor: COLORS.card },
  tableRowOdd: { backgroundColor: COLORS.bg },
  tableCell: {
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  tableCellCentered: { alignItems: "center" },

  // Mirror column widths for body cells
  tableCellDeptDesktop: {
    flex: 0,
    width: 180,
    minWidth: 180,
  },
  tableCellElemDesktop: {
    flex: 0,
    width: 130,
    minWidth: 130,
  },
  tableCellMonthDesktop: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  tableCellDeptMobile: {
    width: MOBILE_DEPT_WIDTH,
    minWidth: MOBILE_DEPT_WIDTH,
  },
  tableCellElemMobile: {
    width: MOBILE_ELEM_WIDTH,
    minWidth: MOBILE_ELEM_WIDTH,
  },
  tableCellMonthMobile: {
    width: MOBILE_MONTH_WIDTH,
    minWidth: MOBILE_MONTH_WIDTH,
  },

  tableCellText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  tableCellMuted: { fontSize: 13, color: COLORS.gray400 },
  tableCellMutedLg: { fontSize: 16, color: COLORS.gray300 },

  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectedText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Cell badges — all blue
  cellBadgeCompleted: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: COLORS.blue200,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cellBadgeCompletedText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  cellBadgePlanned: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  cellBadgePlannedText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  cellBadgeRescheduled: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: COLORS.blue100,
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  cellBadgeRescheduledText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.blue800,
  },

  // ═══ Review section (pending) ═══
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginTop: 4,
  },
  reviewTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textValue,
    marginBottom: 4,
  },
  reviewInput: {
    width: "100%",
    minHeight: 80,
    textAlignVertical: "top",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  footerButtonsMobile: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },

  // ═══ Approved / Rejected summary banner ═══
  statusBanner: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  statusBannerApproved: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  statusBannerRejected: {
    backgroundColor: COLORS.blue50,
    borderColor: COLORS.primaryBorder,
  },
  statusBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  statusBannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  statusBannerText: {
    fontSize: 14,
    color: COLORS.textValue,
    lineHeight: 20,
    marginBottom: 10,
  },
  statusBannerMeta: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  // ═══ Rejection reason box ═══
  rejectionReason: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.blue50,
    padding: 16,
  },
  rejectionReasonHeader: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rejectionReasonTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  rejectionReasonText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primaryDark,
  },

  // ═══ DESKTOP footer (UNCHANGED) ═══
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  // ═══ MOBILE footer ═══
  footerMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
    gap: 8,
  },
};
