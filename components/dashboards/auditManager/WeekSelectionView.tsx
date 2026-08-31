import YearFilter from "@/components/common/YearFilter"; // Adjust the path if your folder structure is different
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  RefreshCw,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auditScheduleApi } from "@/services/auditScheduleApi";
import { useAuth } from "../../context/AuthContext";

// ═════ MNC STANDARD PALETTE ═════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textValue: "#1E293B",
  textMuted: "#64748B",
  primary: "#00529B",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  dangerBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
};

// ═════ SUBTLE MONTH COLORS ═════
const monthThemeColors: Record<string, any> = {
  Apr: { bg: "#ECFDF5", border: "#A7F3D0", text: "#065F46", icon: "#10B981" },
  May: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#3B82F6" },
  Jun: { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6", icon: "#8B5CF6" },
  Jul: { bg: "#FDF2F8", border: "#FBCFE8", text: "#9D174D", icon: "#EC4899" },
  Aug: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", icon: "#F97316" },
  Sep: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", icon: "#F59E0B" },
  Oct: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B", icon: "#EF4444" },
  Nov: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "#22C55E" },
  Dec: { bg: "#ECFEFF", border: "#A5F3FC", text: "#155E75", icon: "#06B6D4" },
  Jan: { bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", icon: "#0EA5E9" },
  Feb: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", icon: "#6366F1" },
  Mar: { bg: "#FAF5FF", border: "#E9D5FF", text: "#6B21A8", icon: "#A855F7" },
};

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

const financialMonths = [
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
const weeks = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];

interface WeekSelectionViewProps {
  year?: number;
  onBack?: () => void;
  onWeekSelect?: (data: {
    month: string;
    week: string;
    startDate: string;
    endDate: string;
  }) => void;
}

// ═════ MAIN COMPONENT ═════
export default function WeekSelectionView({
  year: propYear,
  onBack,
  onWeekSelect,
}: WeekSelectionViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const [selectedYear, setSelectedYear] = useState(
    propYear || urlYear || new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"months" | "weeks">("months");

  const getWeeksForMonth = (year: number, month: string) => {
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
    if (monthNum === undefined) return 4;
    const actualYear =
      month === "Jan" || month === "Feb" || month === "Mar" ? year + 1 : year;
    const firstDay = new Date(actualYear, monthNum, 1).getDay();
    const daysInMonth = new Date(actualYear, monthNum + 1, 0).getDate();
    return Math.ceil((daysInMonth + firstDay) / 7);
  };

  const getWeekDateRange = (year: number, month: string, week: string) => {
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
    if (monthNum === undefined) return null;

    const actualYear =
      month === "Jan" || month === "Feb" || month === "Mar" ? year + 1 : year;
    const firstDayOfMonth = new Date(actualYear, monthNum, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();

    let startDay, endDay;
    const monthDays = new Date(actualYear, monthNum + 1, 0).getDate();

    switch (week) {
      case "W-1":
        startDay = 1;
        endDay = 7 - firstDayWeekday;
        break;
      case "W-2":
        startDay = 8 - firstDayWeekday;
        endDay = 14 - firstDayWeekday;
        break;
      case "W-3":
        startDay = 15 - firstDayWeekday;
        endDay = 21 - firstDayWeekday;
        break;
      case "W-4":
        startDay = 22 - firstDayWeekday;
        endDay = 28 - firstDayWeekday;
        break;
      case "W-5":
        startDay = 29 - firstDayWeekday;
        endDay = 35 - firstDayWeekday;
        break;
      case "W-6":
        startDay = 36 - firstDayWeekday;
        endDay = monthDays;
        break;
      default:
        startDay = 1;
        endDay = 7;
    }

    startDay = Math.max(1, Math.min(startDay, monthDays));
    endDay = Math.max(startDay, Math.min(endDay, monthDays));

    if (startDay > monthDays) return null;

    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      startDate: `${actualYear}-${pad(monthNum + 1)}-${pad(startDay)}`,
      endDate: `${actualYear}-${pad(monthNum + 1)}-${pad(endDay)}`,
    };
  };

  const fetchAvailableMonths = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = Array.isArray(response) ? response : response?.data || [];
      const approvedMonths = months.filter(
        (month: any) =>
          month.approvalStatus === "APPROVED" && month.hasPlannedAudits,
      );
      setAvailableMonths(approvedMonths);
    } catch (error) {
      console.error("Error fetching available months:", error);
      Alert.alert("Error", "Failed to load months");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyData = async (month: string) => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getByYearAndMonth(
        selectedYear,
        month as any,
      );
      let schedules: any[] = [];
      if (Array.isArray(response)) {
        schedules = response;
      } else if (response?.data) {
        if (Array.isArray(response.data)) schedules = response.data;
      }

      const approvedSchedules = schedules.filter(
        (s: any) => s.approvalStatus === "APPROVED",
      );

      const weekData: any = {};
      weeks.forEach((week) => {
        const weekSchedules = approvedSchedules.filter(
          (s: any) => s.week === week,
        );
        weekData[week] = {
          scheduleCount: weekSchedules.length,
          departments: [
            ...new Set(
              weekSchedules.map(
                (s: any) => s.department || s.departmentName || "Unknown",
              ),
            ),
          ],
          hasSchedules: weekSchedules.length > 0,
          schedules: weekSchedules,
        };
      });
      setWeeklyData(weekData);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      Alert.alert("Error", "Failed to load week data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth) {
      fetchWeeklyData(selectedMonth);
      setViewMode("weeks");
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (params?.year) {
      setSelectedYear(parseInt(params.year as string));
    }
  }, [params?.year]);

  // ✅ Sync state if prop changes
  useEffect(() => {
    if (propYear) setSelectedYear(propYear);
  }, [propYear]);
  const handleMonthClick = (month: string) => setSelectedMonth(month);
  const handleBackToMonths = () => {
    setSelectedMonth(null);
    setViewMode("months");
  };

  const handleWeekClick = (week: string, weekData: any) => {
    if (!weekData.hasSchedules) {
      Alert.alert(
        "Warning",
        `No schedules found for ${week}. Please add schedules in Form 5 first.`,
      );
      return;
    }
    const dateRange = getWeekDateRange(selectedYear, selectedMonth!, week);
    if (!dateRange) {
      Alert.alert("Warning", `Week ${week} does not exist in this month`);
      return;
    }

    if (onWeekSelect) {
      onWeekSelect({
        month: selectedMonth!,
        week: week,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    } else {
      router.push({
        pathname: "/form5-detailed",
        params: {
          year: selectedYear,
          month: selectedMonth,
          week: week,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      } as any);
    }
  };

  if (loading && viewMode === "months") {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </SafeAreaView>
    );
  }

  const currentMonthTheme = selectedMonth
    ? monthThemeColors[selectedMonth] || {
        bg: "#F8FAFC",
        border: "#E2E8F0",
        text: "#1F2937",
        icon: "#6B7280",
      }
    : null;

  return (
    <View style={styles.container}>
      {/* ═════ NEW FORM5-STYLE HEADER ═════ */}
      <View
        style={{
          width: "100%",
          paddingHorizontal: isDesktop ? 24 : 16,
          paddingTop: isDesktop ? 25 : 16,
          paddingBottom: isDesktop ? 20 : 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center" }}>
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: isDesktop ? "center" : "stretch",
              justifyContent: isDesktop ? "space-between" : "flex-start",
              gap: isDesktop ? 24 : 16,
            }}
          >
            {/* Left Side: Back, Icon, Title, Subtitle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 1,
              }}
            >
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                style={{
                  width: 40,
                  height: 40,
                  marginRight: 12,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ArrowLeft size={20} color="#6b7280" />
              </TouchableOpacity>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: COLORS.primaryLight,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontSize: isDesktop ? 20 : 18,
                    fontWeight: "700",
                    color: "#111827",
                  }}
                  numberOfLines={1}
                >
                  Audit Schedule Calendar
                </Text>
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {viewMode === "months"
                    ? "Select a month to view weekly schedules"
                    : `${monthDisplay[selectedMonth!]} ${selectedYear} - Weekly Schedule`}
                </Text>
              </View>
            </View>

            {/* Right Side: Year & Refresh */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                justifyContent: isDesktop ? "flex-end" : "flex-start",
              }}
            >
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={(newYear) => {
                  setSelectedYear(newYear);
                  // Optional: Updates the URL so the year persists if the user refreshes
                  router.setParams({ year: newYear.toString() });
                }}
                availableYears={Array.from(
                  { length: 11 },
                  (_, i) => new Date().getFullYear() - 5 + i,
                )}
              />
              <TouchableOpacity
                onPress={() =>
                  viewMode === "months"
                    ? fetchAvailableMonths()
                    : fetchWeeklyData(selectedMonth!)
                }
                style={{
                  width: isDesktop ? 40 : 36,
                  height: isDesktop ? 40 : 36,
                  backgroundColor: "#F3F4F6",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RefreshCw size={isDesktop ? 18 : 16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ═════ SCROLLABLE CONTENT ═════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && {
            maxWidth: 1400,
            alignSelf: "center",
            width: "100%",
            paddingHorizontal: 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Grid View */}
        {viewMode === "months" && (
          <>
            {availableMonths.length === 0 ? (
              <View style={styles.emptyCard}>
                <Calendar
                  size={40}
                  color="#CBD5E1"
                  style={{ marginBottom: 16 }}
                />
                <Text style={styles.emptyTitle}>
                  No approved months found for {selectedYear}
                </Text>
                <Text style={styles.emptySubtitle}>
                  Please complete Form 5 and get approval first.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
                {financialMonths.map((month) => {
                  const monthData = availableMonths.find(
                    (m: any) => m.month === month,
                  );
                  const isApproved = monthData?.approvalStatus === "APPROVED";
                  const hasPlannedAudits = monthData?.hasPlannedAudits || false;
                  if (!hasPlannedAudits) return null;

                  const monthTheme = monthThemeColors[month];

                  return (
                    <TouchableOpacity
                      key={month}
                      onPress={() => isApproved && handleMonthClick(month)}
                      disabled={!isApproved}
                      activeOpacity={0.8}
                      style={[
                        styles.monthCard,
                        {
                          width: isDesktop ? "30%" : "100%",
                          opacity: isApproved ? 1 : 0.6,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.monthCardHeader,
                          { backgroundColor: monthTheme.bg },
                        ]}
                      >
                        <View style={styles.monthCardHeaderLeft}>
                          <View
                            style={[
                              styles.iconBox,
                              { borderColor: monthTheme.border },
                            ]}
                          >
                            <Calendar size={18} color={monthTheme.icon} />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.monthTitle,
                                { color: monthTheme.text },
                              ]}
                            >
                              {monthDisplay[month]}
                            </Text>
                            <Text style={styles.subtitle}>
                              Financial Year {selectedYear}-{selectedYear + 1}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isApproved
                              ? styles.badgeSuccess
                              : styles.badgeWarning,
                          ]}
                        >
                          {isApproved ? (
                            <CheckCircle size={12} color="#166534" />
                          ) : (
                            <Clock size={12} color="#92400E" />
                          )}
                          <Text
                            style={[
                              styles.badgeText,
                              isApproved
                                ? styles.badgeTextSuccess
                                : styles.badgeTextWarning,
                            ]}
                          >
                            {isApproved ? "Approved" : "Pending"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.actionRow}>
                          <Text
                            style={[
                              styles.actionText,
                              isApproved ? styles.textDark : styles.textMuted,
                            ]}
                          >
                            {isApproved
                              ? "Click to view weeks"
                              : "Awaiting approval"}
                          </Text>
                          {isApproved && (
                            <ChevronRight size={16} color={COLORS.primary} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Week Grid View */}
        {viewMode === "weeks" && selectedMonth && currentMonthTheme && (
          <>
            {/* Month Header Card */}
            <View
              style={[
                styles.weekViewHeader,
                {
                  backgroundColor: currentMonthTheme.bg,
                  borderColor: currentMonthTheme.border,
                },
              ]}
            >
              <View style={styles.weekViewHeaderLeft}>
                <View
                  style={[
                    styles.iconBoxLarge,
                    { borderColor: currentMonthTheme.border },
                  ]}
                >
                  <Calendar size={24} color={currentMonthTheme.icon} />
                </View>
                <View>
                  <Text
                    style={[
                      styles.weekViewTitle,
                      { color: currentMonthTheme.text },
                    ]}
                  >
                    {monthDisplay[selectedMonth]} {selectedYear}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Select a week to create or view daily schedules
                  </Text>
                </View>
              </View>
            </View>

            {/* Weeks Grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
              {weeks.map((week) => {
                const weekNum = parseInt(week.split("-")[1]);
                const monthWeeksCount = getWeeksForMonth(
                  selectedYear,
                  selectedMonth,
                );
                const dateRange = getWeekDateRange(
                  selectedYear,
                  selectedMonth,
                  week,
                );
                const weekData = weeklyData[week] || {
                  hasSchedules: false,
                  scheduleCount: 0,
                  departments: [],
                };
                const isScheduled = weekData.hasSchedules;

                if (weekNum > monthWeeksCount || !dateRange) return null;

                return (
                  <TouchableOpacity
                    key={week}
                    onPress={() => handleWeekClick(week, weekData)}
                    disabled={!isScheduled}
                    activeOpacity={0.8}
                    style={[
                      styles.weekCard,
                      {
                        width: isDesktop ? "23%" : "100%",
                        borderColor: isScheduled
                          ? COLORS.successBorder
                          : COLORS.border,
                        opacity: isScheduled ? 1 : 0.7,
                      },
                    ]}
                  >
                    <View style={styles.weekCardHeader}>
                      <Text
                        style={[
                          styles.weekTitle,
                          isScheduled ? styles.textSuccess : styles.textMuted,
                        ]}
                      >
                        {week}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isScheduled ? styles.badgeSuccess : styles.badgeGray,
                        ]}
                      >
                        {isScheduled ? (
                          <CheckCircle size={12} color="#166534" />
                        ) : (
                          <Clock size={12} color="#64748B" />
                        )}
                        <Text
                          style={[
                            styles.badgeText,
                            isScheduled
                              ? styles.badgeTextSuccess
                              : styles.badgeTextGray,
                          ]}
                        >
                          {isScheduled ? weekData.scheduleCount : "Empty"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.dateRangeBox,
                        {
                          borderColor: isScheduled
                            ? COLORS.successBorder
                            : COLORS.border,
                        },
                      ]}
                    >
                      <Text style={styles.dateRangeLabel}>Date Range</Text>
                      <Text style={styles.dateRangeText}>
                        {dateRange.startDate} to {dateRange.endDate}
                      </Text>
                    </View>

                    {isScheduled && weekData.departments.length > 0 && (
                      <View style={styles.deptContainer}>
                        <Text style={styles.deptLabel}>Departments</Text>
                        <View style={styles.deptChips}>
                          {weekData.departments
                            .slice(0, 3)
                            .map((dept: string) => (
                              <View key={dept} style={styles.deptChip}>
                                <Text style={styles.deptChipText}>{dept}</Text>
                              </View>
                            ))}
                          {weekData.departments.length > 3 && (
                            <View style={styles.deptChipMore}>
                              <Text style={styles.deptChipTextMore}>
                                +{weekData.departments.length - 3}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    <View
                      style={[
                        styles.weekActionRow,
                        {
                          borderTopColor: isScheduled
                            ? COLORS.successBorder
                            : COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          isScheduled ? styles.textSuccess : styles.textMuted,
                        ]}
                      >
                        {isScheduled
                          ? "Create Daily Schedule"
                          : "No schedules yet"}
                      </Text>
                      {isScheduled && (
                        <ChevronRight size={16} color="#166534" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Status Legend</Text>
              <View style={styles.legendContent}>
                <View style={styles.legendItem}>
                  <View style={styles.legendIconSuccess}>
                    <CheckCircle size={10} color={COLORS.success} />
                  </View>
                  <Text style={styles.legendText}>
                    Week has schedules - Click to create daily schedule
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendIconGray}>
                    <Clock size={10} color="#64748B" />
                  </View>
                  <Text style={styles.legendText}>
                    No schedules - Complete Form 5 first
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ═════ STYLES ═════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textValue,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },

  monthCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 20,
  },
  monthCardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthCardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBoxLarge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  monthTitle: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardBody: { padding: 20 },
  actionRow: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionText: { fontSize: 13, fontWeight: "500" },
  textDark: { color: COLORS.textValue },
  textMuted: { color: COLORS.textMuted },
  textSuccess: { color: "#166534" },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeSuccess: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successBorder,
  },
  badgeTextSuccess: { color: "#166534" },
  badgeWarning: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warningBorder,
  },
  badgeTextWarning: { color: "#92400E" },
  badgeGray: { backgroundColor: "#F1F5F9", borderColor: COLORS.border },
  badgeTextGray: { color: "#64748B" },

  weekViewHeader: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  weekViewHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  weekViewTitle: { fontSize: 20, fontWeight: "700" },

  weekCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 20,
  },
  weekCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  weekTitle: { fontSize: 24, fontWeight: "700" },

  dateRangeBox: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateRangeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textValue,
    marginTop: 4,
  },

  deptContainer: { marginBottom: 16 },
  deptLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deptChips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  deptChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 12,
  },
  deptChipText: { fontSize: 11, fontWeight: "500", color: "#1E40AF" },
  deptChipMore: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  deptChipTextMore: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },

  weekActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },

  legendCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 24,
    marginTop: 24,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  legendContent: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendIconSuccess: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  legendIconGray: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  legendText: { fontSize: 13, color: COLORS.textMuted },
});
