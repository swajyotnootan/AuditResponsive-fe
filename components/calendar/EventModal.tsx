// EventModal.tsx - FIXED time parsing

import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  Crown,
  Tag,
  UserCheck,
  X,
} from "lucide-react-native";
import moment from "moment";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getEventColor, getRescheduleInfo } from "./CalendarUtils";
import UserAvatar from "./UserAvatar";

export default function EventModal({
  visible,
  event,
  onClose,
  onRefresh,
}: any) {
  if (!event) return null;

  // ✅ FIXED: Parse time from description if startTime/endTime are N/A
  const parseTimeFromDescription = (description: string) => {
    if (!description) return null;

    // Look for "Time: 10:30 AM - 12:30 PM"
    const timeMatch = description.match(
      /Time:\s*([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)\s*-\s*[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM))/i,
    );
    if (timeMatch) {
      return timeMatch[1];
    }

    // Look for bullet format: "• Time: 09:00 AM - 10:00 AM"
    const bulletMatch = description.match(/[•●]\s*Time:\s*([^\n]+)/i);
    if (bulletMatch) {
      return bulletMatch[1].trim();
    }

    return null;
  };

  // ✅ FIXED: Get display time
  const getDisplayTime = () => {
    // First check if startTime/endTime exist and are not N/A
    if (
      event.startTime &&
      event.startTime !== "N/A" &&
      event.endTime &&
      event.endTime !== "N/A"
    ) {
      return `${event.startTime} - ${event.endTime}`;
    }

    // Try to parse from description
    const parsedTime = parseTimeFromDescription(event.description);
    if (parsedTime) {
      return parsedTime;
    }

    return "N/A - N/A";
  };

  // ✅ FIXED: Proper status detection
  const getStatusBadge = () => {
    // COMPLETED - highest priority
    if (event.isFullyCompleted || event.status === "COMPLETED") {
      return { bg: "#ecfdf5", text: "#047857", label: "✓ Audit Completed" };
    }
    // SUBMITTED - waiting for auditee approval
    if (event.isSubmitted || event.status === "SUBMITTED") {
      return {
        bg: "#eff6ff",
        text: "#1d4ed8",
        label: "⏳ Pending Auditee Approval",
      };
    }
    // OVERDUE
    if (event.status === "OVERDUE" || event.isOverdue) {
      return { bg: "#fef2f2", text: "#b91c1c", label: "⚠️ OVERDUE" };
    }
    // REJECTED
    if (event.status === "REJECTED") {
      return { bg: "#fef2f2", text: "#b91c1c", label: "❌ Rejected" };
    }
    // PENDING APPROVAL
    if (event.status === "PENDING_APPROVAL") {
      return {
        bg: "#fefce8",
        text: "#a16207",
        label: "⏳ Pending Schedule Approval",
      };
    }
    // APPROVED
    if (event.status === "APPROVED") {
      return { bg: "#d1fae5", text: "#065f46", label: "✅ Schedule Approved" };
    }
    // CHANGE REQUESTED
    if (event.status === "CHANGE_REQUESTED") {
      return { bg: "#fffbeb", text: "#b45309", label: "🔄 Changes Requested" };
    }
    // DEFAULT: SCHEDULED
    return { bg: "#f0f9ff", text: "#0369a1", label: "📅 Scheduled" };
  };

  const badge = getStatusBadge();
  // ✅ SAME AS WEB: detect rescheduled audit
  const { hasReschedule, originalDate } = getRescheduleInfo(event);
  const dotColor = getEventColor(event);
  const displayTime = getDisplayTime();
  const isOverdue = event.status === "OVERDUE" || event.isOverdue;

  // Format date properly
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return moment(dateStr).format("dddd, MMMM DD, YYYY");
  };

  // Check if date range
  const isDateRange = event.isDateRange || (event.fromDate && event.toDate);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerDot, { backgroundColor: dotColor }]} />
              <Text style={styles.headerTitle}>Audit Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              {/* Title and Status */}
              <View style={styles.titleRow}>
                <Text style={styles.auditTitle}>
                  {event.auditType || "Audit"}
                </Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>
                    {badge.label}
                  </Text>
                </View>
              </View>

              {event.auditNumber && (
                <Text style={styles.auditNumber}>#{event.auditNumber}</Text>
              )}

              {/* Department */}
              {event.department && (
                <View style={styles.departmentContainer}>
                  <Tag size={16} color="#6b7280" />
                  <Text style={styles.departmentText}>
                    Department: {event.department}
                  </Text>
                </View>
              )}

              {event.isDateRange && event.fromDate && event.toDate && (
                <View style={styles.dateRangeContainer}>
                  <View style={styles.infoRow}>
                    <CalendarDays size={16} color="#8B5CF6" />
                    <Text style={styles.infoLabel}>Date Range:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: "#8B5CF6", fontWeight: "600" },
                      ]}
                    >
                      {moment(event.fromDate).format("MMM D, YYYY")} →{" "}
                      {moment(event.toDate).format("MMM D, YYYY")}
                    </Text>
                  </View>
                  <Text style={styles.dateRangeHint}>
                    ✅ Auditor can complete any day within this range
                  </Text>
                </View>
              )}
              {/* Info Block */}
              <View style={styles.infoBlock}>
                {/* ✅ NEW: Reschedule box — exactly like Web (Image 3) */}
                <View
                  style={[
                    styles.scheduleBox,
                    hasReschedule && styles.scheduleBoxRescheduled,
                  ]}
                >
                  {hasReschedule && (
                    <View style={styles.scheduleRow}>
                      <CalendarDays size={14} color="#d97706" />
                      <Text style={styles.wasText}>Was:</Text>
                      <Text style={styles.wasText}>
                        {moment(originalDate).format("MMM D, YYYY")}
                      </Text>
                      <View style={styles.rescheduledBadge}>
                        <Text style={styles.rescheduledBadgeText}>
                          Rescheduled
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.scheduleRow}>
                    <Calendar
                      size={14}
                      color={hasReschedule ? "#059669" : "#9ca3af"}
                    />
                    <Text
                      style={[
                        styles.scheduleLabel,
                        hasReschedule && styles.rescheduledLabelText,
                      ]}
                    >
                      Date:
                    </Text>
                    <Text
                      style={[
                        styles.scheduleValue,
                        hasReschedule && styles.rescheduledValueText,
                      ]}
                    >
                      {isDateRange
                        ? `${moment(event.fromDate).format("MMM D, YYYY")} → ${moment(event.toDate).format("MMM D, YYYY")}`
                        : moment(event.start).format("MMM D, YYYY")}
                    </Text>
                  </View>
                </View>

                {/* ✅ Pending reschedule / extension banner (same as Web) */}
                {(event.pendingReschedule || event.pendingExtension) && (
                  <View style={styles.pendingBlock}>
                    <Clock size={14} color="#a16207" />
                    <Text style={styles.pendingText}>
                      {event.pendingReschedule
                        ? "⏳ Reschedule request pending approval"
                        : "⏳ Extension request pending approval"}
                    </Text>
                  </View>
                )}

                {/* ✅ FIXED: Time - uses parsed time from description */}
                <View style={styles.infoRow}>
                  <Clock size={16} color="#9ca3af" />
                  <Text style={styles.infoLabel}>Time:</Text>
                  <Text style={styles.infoValue}>{displayTime}</Text>
                </View>

                {/* Auditor with Avatar */}
                <View style={styles.infoRow}>
                  <Crown size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>Auditor:</Text>
                  <View style={styles.avatarContainer}>
                    <UserAvatar
                      userId={event.auditorId}
                      userName={event.auditorName || "Unassigned"}
                      size="sm"
                      showName={true}
                    />
                  </View>
                </View>

                {/* Auditee with Avatar */}
                <View style={styles.infoRow}>
                  <UserCheck size={16} color="#10b981" />
                  <Text style={styles.infoLabel}>Auditee:</Text>
                  <View style={styles.avatarContainer}>
                    <UserAvatar
                      userId={event.auditeeId}
                      userName={event.auditeeName || "Unassigned"}
                      size="sm"
                      showName={true}
                    />
                  </View>
                </View>

                {/* Co-Auditors if any */}
                {event.coAuditorNames && event.coAuditorNames.length > 0 && (
                  <View style={styles.infoRow}>
                    <UserCheck size={16} color="#8b5cf6" />
                    <Text style={styles.infoLabel}>Co-Auditors:</Text>
                    <View style={styles.coAuditorContainer}>
                      {event.coAuditorNames.map(
                        (name: string, index: number) => (
                          <UserAvatar
                            key={index}
                            userId={event.coAuditorIdList?.[index]}
                            userName={name}
                            size="xs"
                            showName={true}
                          />
                        ),
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Description */}
              {event.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {event.description}
                  </Text>
                </View>
              )}

              {/* Overdue Warning */}
              {isOverdue && (
                <View style={styles.overdueBlock}>
                  <AlertCircle size={16} color="#dc2626" />
                  <Text style={styles.overdueText}>
                    ⚠️ This audit is OVERDUE
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 450,
    maxHeight: "85%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#00529B",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 500,
  },
  body: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  auditTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  auditNumber: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#6b7280",
    marginBottom: 12,
  },
  departmentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  departmentText: {
    fontSize: 14,
    color: "#6b7280",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoBlock: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  avatarContainer: {
    flex: 1,
  },
  coAuditorContainer: {
    flex: 1,
    gap: 4,
  },
  descriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
  },
  overdueBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  overdueText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  footerButton: {
    backgroundColor: "#00529B",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  dateRangeContainer: {
    backgroundColor: "#f5f3ff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    marginTop: 8,
  },
  dateRangeHint: {
    fontSize: 12,
    color: "#8B5CF6",
    marginTop: 4,
    fontStyle: "italic",
    paddingLeft: 24,
  },
  statusDateRange: {
    backgroundColor: "#f5f3ff",
    color: "#8B5CF6",
  },
  scheduleBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  scheduleBoxRescheduled: {
    backgroundColor: "#fffbeb", // amber-50 (same as Web)
    borderWidth: 1,
    borderColor: "#fde68a", // amber-200
  },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  wasText: {
    fontSize: 12,
    color: "#6b7280",
    textDecorationLine: "line-through", // strikethrough like Web
  },
  rescheduledBadge: {
    backgroundColor: "#fef3c7", // amber-100
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  rescheduledBadgeText: { fontSize: 10, fontWeight: "600", color: "#b45309" },
  scheduleLabel: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  rescheduledLabelText: { color: "#047857" },
  scheduleValue: { fontSize: 14, fontWeight: "500", color: "#111827", flex: 1 },
  rescheduledValueText: { color: "#047857", fontWeight: "700" }, // green date
  pendingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  pendingText: { fontSize: 12, color: "#a16207", fontWeight: "600" },
});
