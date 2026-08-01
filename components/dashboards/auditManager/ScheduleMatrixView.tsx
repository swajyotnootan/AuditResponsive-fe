import {
  Calendar,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#1F2937",
  textMuted: "#6B7280",
  accent: "#3B82F6",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",
  primary: "#00529B",
  primaryDark: "#1e3a8a",
  primaryLight: "#93c5fd",
};

const ScheduleMatrixView = ({
  departments,
  deptPlanData,
  selectedMonth,
  schedules,
  weeks,
  canEdit,
  onCellClick,
  onDeleteSchedule,
  auditElementsMap,
  getStatusBadge,
  selectedYear,
}: any) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [popupSchedules, setPopupSchedules] = useState<any>(null);

  // ✅ REPLACE THIS FUNCTION
  const getSchedulesForCell = (department: string, week: string) => {
    if (!schedules || schedules.length === 0) return [];

    return schedules.filter((s: any) => {
      // 1. Normalize Department (case-insensitive, trim spaces)
      const scheduleDept = String(s.department || "")
        .trim()
        .toLowerCase();
      const cellDept = String(department || "")
        .trim()
        .toLowerCase();

      // 2. Normalize Week (extracts only numbers: "W-1" -> "1", "1" -> "1")
      const scheduleWeek = String(s.week || "").replace(/[^0-9]/g, "");
      const cellWeek = String(week || "").replace(/[^0-9]/g, "");

      // 3. Normalize Month (handles "Apr" vs "April" vs "4")
      const scheduleMonth = String(s.month || "")
        .trim()
        .toLowerCase();
      const cellMonth = String(selectedMonth || "")
        .trim()
        .toLowerCase();

      const isDeptMatch = scheduleDept === cellDept;
      const isWeekMatch = scheduleWeek === cellWeek;
      // Check if month matches exactly OR starts with the same 3 letters (Apr == April)
      const isMonthMatch =
        scheduleMonth === cellMonth ||
        scheduleMonth.startsWith(cellMonth.substring(0, 3));

      return isDeptMatch && isWeekMatch && isMonthMatch;
    });
  };

  const getAuditElementsForDept = (department: string) => {
    return (
      deptPlanData[department]?.find((m: any) => m.month === selectedMonth)
        ?.elements || []
    );
  };

  const displayDepartments = departments.length > 0 ? departments : [];

  const getWeekWorkingDays = (year: number, month: string, week: string) => {
    const weekNum = parseInt(week.split("-")[1]);
    const monthMap: Record<string, number> = {
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
      Jan: 0,
      Feb: 1,
      Mar: 2,
    };
    const monthNum = monthMap[month];
    if (monthNum === undefined)
      return { hasWorkingDays: true, workingDaysCount: 5 };

    const actualYear =
      month === "Jan" || month === "Feb" || month === "Mar" ? year + 1 : year;
    const firstDayOfMonth = new Date(actualYear, monthNum, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    let startDay, endDay;
    const monthDays = new Date(actualYear, monthNum + 1, 0).getDate();

    switch (weekNum) {
      case 1:
        startDay = 1;
        endDay = 7 - firstDayWeekday;
        break;
      case 2:
        startDay = 8 - firstDayWeekday;
        endDay = 14 - firstDayWeekday;
        break;
      case 3:
        startDay = 15 - firstDayWeekday;
        endDay = 21 - firstDayWeekday;
        break;
      case 4:
        startDay = 22 - firstDayWeekday;
        endDay = 28 - firstDayWeekday;
        break;
      case 5:
        startDay = 29 - firstDayWeekday;
        endDay = 35 - firstDayWeekday;
        break;
      case 6:
        startDay = 36 - firstDayWeekday;
        endDay = monthDays;
        break;
      default:
        return { hasWorkingDays: true, workingDaysCount: 5 };
    }

    startDay = Math.max(1, Math.min(startDay, monthDays));
    endDay = Math.max(startDay, Math.min(endDay, monthDays));

    let workingDaysCount = 0;
    for (let day = startDay; day <= endDay; day++) {
      const dayOfWeek = new Date(actualYear, monthNum, day).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) workingDaysCount++;
    }

    return { hasWorkingDays: workingDaysCount > 0, workingDaysCount };
  };

  const getDisplayNames = (names: string[], maxDisplay = 2) => {
    if (!names || names.length === 0) return "-";
    if (names.length === 1) return names[0].split(" ")[0];
    if (names.length <= maxDisplay)
      return names.map((n) => n.split(" ")[0]).join(", ");
    return `${names
      .slice(0, maxDisplay)
      .map((n) => n.split(" ")[0])
      .join(", ")} +${names.length - maxDisplay}`;
  };

  const handlePlusClick = (
    department: string,
    week: string,
    cellSchedules: any[],
  ) => {
    setPopupSchedules({ department, week, schedules: cellSchedules });
  };

  const closePopup = () => setPopupSchedules(null);

  const handleDeleteFromPopup = (scheduleId: number, scheduleMonth: string) => {
    onDeleteSchedule(scheduleId, scheduleMonth);
    setPopupSchedules((prev: any) => ({
      ...prev,
      schedules: prev.schedules.filter((s: any) => s.id !== scheduleId),
    }));
  };

  return (
    <View style={styles.container}>
      {/* ✅ FIX 1: Add contentContainerStyle={{ flexGrow: 1 }} */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ✅ FIX 2: Add flex: 1 so it stretches to fill the screen width */}
        <View style={{ minWidth: isDesktop ? 1200 : 800, flex: 1 }}>
          {/* Header */}
          <View style={styles.tableHeader}>
            {/* ... rest of your code remains exactly the same ... */}
            <View style={styles.headerCell}>
              <Text style={styles.headerCellText}>Area/Department</Text>
            </View>
            {weeks.map((week: string) => {
              const workingInfo = getWeekWorkingDays(
                selectedYear,
                selectedMonth,
                week,
              );
              return (
                <View key={week} style={styles.weekHeaderCell}>
                  <Text style={styles.headerCellText}>{week}</Text>
                  {!workingInfo.hasWorkingDays && (
                    <Text style={styles.workingDaysWarning}>
                      ⚠️ No working days
                    </Text>
                  )}
                  {workingInfo.hasWorkingDays &&
                    workingInfo.workingDaysCount <= 2 && (
                      <Text style={styles.workingDaysWarning}>
                        Only {workingInfo.workingDaysCount} day(s)
                      </Text>
                    )}
                </View>
              );
            })}
          </View>

          {/* Body */}
          {displayDepartments.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No departments available</Text>
            </View>
          ) : (
            displayDepartments.map((department: string) => {
              const auditElements = getAuditElementsForDept(department);
              return (
                <View key={department} style={styles.tableRow}>
                  <View style={styles.departmentCell}>
                    <Text style={styles.departmentCellText}>{department}</Text>
                    {auditElements.length > 0 && (
                      <View style={styles.auditElementsRow}>
                        {auditElements.map((el: string, idx: number) => (
                          <View key={idx} style={styles.auditElementBadge}>
                            <Text style={styles.auditElementBadgeText}>
                              {auditElementsMap[el] || el.substring(0, 1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  {weeks.map((week: string) => {
                    const cellSchedules = getSchedulesForCell(department, week);
                    const workingInfo = getWeekWorkingDays(
                      selectedYear,
                      selectedMonth,
                      week,
                    );
                    const canClick = canEdit && workingInfo.hasWorkingDays;
                    const hasMultipleSchedules = cellSchedules.length > 1;
                    const primarySchedule = cellSchedules[0];

                    return (
                      <TouchableOpacity
                        key={week}
                        style={[
                          styles.weekCell,
                          canClick
                            ? styles.weekCellClickable
                            : styles.weekCellDisabled,
                        ]}
                        onPress={() =>
                          canClick &&
                          onCellClick(department, week, primarySchedule)
                        }
                        disabled={!canClick}
                      >
                        {primarySchedule ? (
                          <View style={styles.scheduleCard}>
                            {hasMultipleSchedules && (
                              <TouchableOpacity
                                style={styles.plusBadge}
                                onPress={() =>
                                  handlePlusClick(
                                    department,
                                    week,
                                    cellSchedules,
                                  )
                                }
                              >
                                <Text style={styles.plusBadgeText}>
                                  +{cellSchedules.length - 1}
                                </Text>
                              </TouchableOpacity>
                            )}

                            <Text
                              style={styles.leadAuditorText}
                              numberOfLines={1}
                            >
                              {
                                (
                                  primarySchedule.leadAuditorName ||
                                  primarySchedule.auditorName ||
                                  "-"
                                ).split(" ")[0]
                              }
                            </Text>

                            {(
                              primarySchedule.coAuditorNames ||
                              primarySchedule.teamAuditorNames ||
                              []
                            ).length > 0 && (
                              <View style={styles.teamRow}>
                                <Users size={12} color={COLORS.primaryDark} />
                                <Text style={styles.teamText} numberOfLines={1}>
                                  {getDisplayNames(
                                    primarySchedule.coAuditorNames ||
                                      primarySchedule.teamAuditorNames ||
                                      [],
                                    2,
                                  )}
                                </Text>
                              </View>
                            )}

                            <Text style={styles.elementsText}>
                              {primarySchedule.auditElements
                                ?.map(
                                  (el: string) =>
                                    auditElementsMap[el] || el.substring(0, 1),
                                )
                                .join(", ") || "-"}
                            </Text>

                            {(primarySchedule.auditeeNames || []).length >
                              0 && (
                              <Text
                                style={styles.auditeesText}
                                numberOfLines={1}
                              >
                                👥{" "}
                                {getDisplayNames(
                                  primarySchedule.auditeeNames || [],
                                  2,
                                )}
                              </Text>
                            )}

                            <View style={{ marginTop: 4 }}>
                              {getStatusBadge(primarySchedule.status)}
                            </View>

                            {canEdit && !hasMultipleSchedules && (
                              <TouchableOpacity
                                onPress={() => {
                                  onDeleteSchedule(
                                    primarySchedule.id,
                                    primarySchedule.month,
                                  );
                                }}
                                style={styles.deleteButton}
                              >
                                <Trash2 size={12} color="#EF4444" />
                              </TouchableOpacity>
                            )}

                            {canEdit && (
                              <TouchableOpacity
                                onPress={() =>
                                  onCellClick(department, week, null)
                                }
                                style={styles.addButton}
                              >
                                <Plus size={12} color={COLORS.primary} />
                                <Text style={styles.addButtonText}>Add</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (
                          <View style={styles.emptyCell}>
                            {workingInfo.hasWorkingDays ? (
                              <>
                                <Plus
                                  size={16}
                                  color={COLORS.primary}
                                  style={{ opacity: 0.5, marginBottom: 4 }}
                                />
                                <Text style={styles.emptyCellText}>
                                  Click to add
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.noWorkingDaysText}>
                                No working days
                              </Text>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Popup for Multiple Schedules */}
      {popupSchedules && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={closePopup}
        >
          <TouchableOpacity
            style={styles.popupOverlay}
            activeOpacity={1}
            onPress={closePopup}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.popupContent, { height: height * 0.85 }]}
            >
              {/* Popup Header */}
              <View style={styles.popupHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.popupHeaderRow}>
                    <Calendar size={20} color="#FFF" />
                    <Text style={styles.popupTitle}>Multiple Schedules</Text>
                  </View>
                  <Text style={styles.popupSubtitle}>
                    {popupSchedules.department} - {popupSchedules.week} (
                    {selectedMonth})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closePopup}
                  style={styles.popupCloseButton}
                >
                  <X size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Popup Content */}
              <ScrollView style={styles.popupBody}>
                <View style={styles.popupGrid}>
                  {popupSchedules.schedules.map(
                    (schedule: any, index: number) => {
                      const elementText = schedule.auditElements
                        ?.map((el: string) => auditElementsMap[el] || el)
                        .join(", ");
                      const teamText = (
                        schedule.coAuditorNames ||
                        schedule.teamAuditorNames ||
                        []
                      ).join(", ");
                      const auditeeText = (schedule.auditeeNames || []).join(
                        ", ",
                      );

                      return (
                        <View key={schedule.id} style={styles.popupCard}>
                          {/* Compact Header */}
                          <View style={styles.popupCardHeader}>
                            <View style={styles.popupCardNumber}>
                              <Text style={styles.popupCardNumberText}>
                                {index + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.popupCardTitle}
                                numberOfLines={1}
                              >
                                {schedule.leadAuditorName ||
                                  schedule.auditorName ||
                                  "No Lead Auditor"}
                              </Text>
                              <Text
                                style={styles.popupCardSubtitle}
                                numberOfLines={1}
                              >
                                Element: {elementText || "N/A"}
                              </Text>
                            </View>
                            <View>{getStatusBadge(schedule.status)}</View>
                          </View>

                          {/* 2-Column Body */}
                          <View style={styles.popupCardBody}>
                            <View style={styles.popupCardColumn}>
                              <View style={styles.popupCardLabel}>
                                <Users size={12} color={COLORS.primary} />
                                <Text style={styles.popupCardLabelText}>
                                  Team:
                                </Text>
                              </View>
                              <Text
                                style={styles.popupCardValue}
                                numberOfLines={1}
                              >
                                {teamText || "None"}
                              </Text>
                            </View>
                            <View style={styles.popupCardColumn}>
                              <View style={styles.popupCardLabel}>
                                <Text style={styles.popupCardEmoji}>👥</Text>
                                <Text style={styles.popupCardLabelText}>
                                  Auditees:
                                </Text>
                              </View>
                              <Text
                                style={styles.popupCardValue}
                                numberOfLines={1}
                              >
                                {auditeeText || "None"}
                              </Text>
                            </View>
                          </View>

                          {/* Compact Remarks */}
                          {schedule.remarks && (
                            <View style={styles.popupCardRemarks}>
                              <Text
                                style={styles.popupCardRemarksText}
                                numberOfLines={1}
                              >
                                <Text style={{ fontWeight: "600" }}>Note:</Text>{" "}
                                {schedule.remarks}
                              </Text>
                            </View>
                          )}

                          {/* Compact Footer Actions */}
                          <View style={styles.popupCardFooter}>
                            {canEdit && (
                              <>
                                <TouchableOpacity
                                  onPress={() => {
                                    closePopup();
                                    onCellClick(
                                      popupSchedules.department,
                                      popupSchedules.week,
                                      schedule,
                                    );
                                  }}
                                  style={styles.popupEditButton}
                                >
                                  <Edit size={12} color={COLORS.primary} />
                                  <Text style={styles.popupEditButtonText}>
                                    Edit
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() =>
                                    handleDeleteFromPopup(
                                      schedule.id,
                                      schedule.month,
                                    )
                                  }
                                  style={styles.popupDeleteButton}
                                >
                                  <Trash2 size={12} color="#DC2626" />
                                  <Text style={styles.popupDeleteButtonText}>
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        </View>
                      );
                    },
                  )}
                </View>

                <View style={styles.popupSummary}>
                  <CheckCircle size={16} color={COLORS.primaryDark} />
                  <Text style={styles.popupSummaryText}>
                    Total: {popupSchedules.schedules.length} schedule(s) for{" "}
                    {popupSchedules.department} in {popupSchedules.week}
                  </Text>
                </View>
              </ScrollView>

              {/* Popup Footer */}
              <View style={styles.popupFooter}>
                <TouchableOpacity
                  onPress={() => {
                    closePopup();
                    onCellClick(
                      popupSchedules.department,
                      popupSchedules.week,
                      null,
                    );
                  }}
                  style={styles.popupAddButton}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={styles.popupAddButtonText}>
                    Add New Schedule
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closePopup}
                  style={styles.popupCloseBtn}
                >
                  <Text style={styles.popupCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.accentLight,
    borderBottomWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  headerCell: {
    width: 176,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: "center",
  },
  weekHeaderCell: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
    textAlign: "center",
  },
  workingDaysWarning: {
    fontSize: 11,
    color: COLORS.primary,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyRow: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: `${COLORS.primaryLight}50`,
  },
  departmentCell: {
    width: 176,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderColor: `${COLORS.primaryLight}50`,
    justifyContent: "flex-start",
  },
  departmentCellText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primaryDark,
  },
  auditElementsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  auditElementBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.accentLight,
    borderRadius: 4,
  },
  auditElementBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary,
  },
  weekCell: {
    flex: 1,
    minWidth: 150,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderColor: `${COLORS.primaryLight}50`,
    justifyContent: "center",
    alignItems: "center",
  },
  weekCellClickable: {
    backgroundColor: COLORS.card,
  },
  weekCellDisabled: {
    backgroundColor: "#F9FAFB",
    opacity: 0.6,
  },
  scheduleCard: {
    padding: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: `${COLORS.primaryLight}80`,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  plusBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  plusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  leadAuditorText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  teamText: {
    fontSize: 11,
    color: COLORS.primaryDark,
  },
  elementsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  auditeesText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    marginTop: 4,
    textAlign: "center",
  },
  deleteButton: {
    marginTop: 4,
    padding: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "500",
  },
  emptyCell: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCellText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  noWorkingDaysText: {
    fontSize: 11,
    color: COLORS.primary,
    opacity: 0.6,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  popupContent: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: "100%",
    maxWidth: 800,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  popupHeader: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  popupSubtitle: {
    fontSize: 13,
    color: COLORS.primaryLight,
    marginTop: 2,
  },
  popupCloseButton: {
    padding: 8,
    borderRadius: 8,
  },
  popupBody: {
    flex: 1,
    padding: 20,
    backgroundColor: `${COLORS.accentLight}30`,
  },
  popupGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-start",
  },
  popupCard: {
    flexGrow: 1, // ✅ CHANGE 'flex: 1' TO 'flexGrow: 1'
    flexBasis: 250,
    minWidth: 250,
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: `${COLORS.primaryLight}80`,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  popupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: `${COLORS.primaryLight}50`,
  },
  popupCardNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  popupCardNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  popupCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  popupCardSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  popupCardBody: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  popupCardColumn: {
    flex: 1,
  },
  popupCardLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  popupCardLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  popupCardEmoji: {
    fontSize: 10,
  },
  popupCardValue: {
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  popupCardRemarks: {
    backgroundColor: `${COLORS.accentLight}99`,
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  popupCardRemarksText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  popupCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    marginTop: "auto",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
  popupEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.accentLight,
    borderRadius: 6,
  },
  popupEditButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary,
  },
  popupDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
  },
  popupDeleteButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#DC2626",
  },
  popupSummary: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  popupSummaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  popupFooter: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  popupAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  popupAddButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFF",
  },
  popupCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.accentLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  popupCloseBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primaryDark,
  },
});

export default ScheduleMatrixView;
