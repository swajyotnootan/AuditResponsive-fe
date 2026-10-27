import YearFilter from "@/components/common/YearFilter";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  MoreVertical,
  RefreshCw,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { auditScheduleApi } from "@/services/auditScheduleApi";
import { useAuth } from "../../context/AuthContext";

// ═════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
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
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
  chipBg: "#EFF6FF",
  chipBorder: "#BFDBFE",
  chipText: "#1E40AF",
};

// ═════ MONTH THEME (All Blue Shades Only) ═════
const monthThemeColors: Record<string, any> = {
  Apr: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#2563EB" },
  May: { bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", icon: "#0EA5E9" },
  Jun: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", icon: "#4F46E5" },
  Jul: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#2563EB" },
  Aug: { bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", icon: "#0EA5E9" },
  Sep: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", icon: "#4F46E5" },
  Oct: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#2563EB" },
  Nov: { bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", icon: "#0EA5E9" },
  Dec: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", icon: "#4F46E5" },
  Jan: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF", icon: "#2563EB" },
  Feb: { bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", icon: "#0EA5E9" },
  Mar: { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", icon: "#4F46E5" },
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

const getQuarter = (month: string) => {
  const quarters: Record<string, string> = {
    Apr: "Q1",
    May: "Q1",
    Jun: "Q1",
    Jul: "Q2",
    Aug: "Q2",
    Sep: "Q2",
    Oct: "Q3",
    Nov: "Q3",
    Dec: "Q3",
    Jan: "Q4",
    Feb: "Q4",
    Mar: "Q4",
  };
  return quarters[month] || "";
};

// ✅ Get actual calendar year for a month in the financial year
const getActualYearForMonth = (fyStartYear: number, month: string) => {
  return month === "Jan" || month === "Feb" || month === "Mar"
    ? fyStartYear + 1
    : fyStartYear;
};

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

// ═════ PLANT FILTER HELPERS ═════
type PlantKey = string | number | null | undefined;

const PLANT_FIELD_CANDIDATES = [
  "plantId",
  "plant_id",
  "plant",
  "plantCode",
  "plantName",
] as const;

const plantOf = (row: any): string | number | null => {
  if (!row) return null;
  for (const k of PLANT_FIELD_CANDIDATES) {
    const v = (row as any)[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const samePlant = (row: any, plantId: PlantKey): boolean => {
  if (plantId === null || plantId === undefined || plantId === "") return true;
  const rowPlant = plantOf(row);
  if (rowPlant === null) return true;
  return String(rowPlant) === String(plantId);
};

const filterByPlant = <T,>(rows: T[], plantId: PlantKey): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
};

// ═════ REUSABLE UI COMPONENTS ═════
const Card = ({ children, style = {} }: any) => (
  <View
    style={[
      {
        marginBottom: 24,
        overflow: "hidden",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const StatusBadge = ({ status, count }: { status: string; count?: number }) => {
  if (status === "APPROVED") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: COLORS.primaryBorder,
          backgroundColor: COLORS.stateSuccessBg,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <CheckCircle size={14} color={COLORS.primary} />
        <Text
          style={{ fontSize: 11, fontWeight: "700", color: COLORS.primaryDark }}
        >
          {count !== undefined ? `${count} Schedules` : "Approved"}
        </Text>
      </View>
    );
  }
  if (status === "EMPTY") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          backgroundColor: "#F1F5F9",
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <Clock size={14} color={COLORS.textMuted} />
        <Text
          style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}
        >
          No Schedules
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Clock size={14} color={COLORS.textMuted} />
      <Text
        style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted }}
      >
        Pending
      </Text>
    </View>
  );
};

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
          onMouseEnter: () => !disabled && setIsHovered(true),
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
        gap: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : 1,
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

// ═════ YEAR PICKER MODAL ═════
const YearPickerModal = ({
  isOpen,
  onClose,
  selectedYear,
  availableYears,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  availableYears: number[];
  onSelect: (year: number) => void;
}) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          padding: 24,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            width: "100%",
            maxWidth: 400,
            overflow: "hidden",
            borderRadius: 20,
            backgroundColor: COLORS.card,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                  backgroundColor: COLORS.primaryLight,
                }}
              >
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: COLORS.text,
                  }}
                >
                  Select Financial Year
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  Choose a year to view schedules
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor: "#F1F5F9",
              }}
            >
              <X size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Year List */}
          <ScrollView
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            {availableYears.map((year) => {
              const isSelected = selectedYear === year;
              return (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    onSelect(year);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F1F5F9",
                    backgroundColor: isSelected
                      ? COLORS.primaryLight
                      : "transparent",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? COLORS.primary : COLORS.textValue,
                    }}
                  >
                    FY {year}-{year + 1}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: COLORS.primary,
                      }}
                    >
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

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
  const [filterStatus, setFilterStatus] = useState("all");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false); // ✅ New

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

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
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const response = await auditScheduleApi.getAvailableMonths(
        selectedYear,
        user.id,
      );
      const months = Array.isArray(response) ? response : response?.data || [];
      const plantScopedMonths = filterByPlant(months, user?.plantId);
      const approvedMonths = plantScopedMonths.filter(
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
      if (Array.isArray(response)) schedules = response;
      else if (response?.data) {
        if (Array.isArray(response.data)) schedules = response.data;
      }

      const plantScopedSchedules = filterByPlant(schedules, user?.plantId);
      const approvedSchedules = plantScopedSchedules.filter(
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
  }, [selectedYear, user?.plantId]);
  useEffect(() => {
    if (selectedMonth) {
      fetchWeeklyData(selectedMonth);
      setViewMode("weeks");
    }
  }, [selectedMonth, user?.plantId]);
  useEffect(() => {
    if (params?.year) setSelectedYear(parseInt(params.year as string));
  }, [params?.year]);
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 14,
            fontWeight: "500",
            color: COLORS.textMuted,
          }}
        >
          Loading schedule...
        </Text>
      </View>
    );
  }

  const currentMonthTheme = selectedMonth
    ? monthThemeColors[selectedMonth] || {
        bg: "#EFF6FF",
        border: "#BFDBFE",
        text: "#1E40AF",
        icon: "#2563EB",
      }
    : null;

  const filteredMonths = availableMonths.filter((m: any) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "approved") return m.approvalStatus === "APPROVED";
    if (filterStatus === "pending") return m.approvalStatus !== "APPROVED";
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* ═════ HEADER ═════ */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.card,
          paddingHorizontal: isDesktop ? 24 : 16,
          paddingVertical: 16,
          zIndex: 100, // ✅ ensure header sits above content
          elevation: 2, // ✅ Android
        }}
      >
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center" }}>
          {isDesktop ? (
            /* ─────────── DESKTOP HEADER ─────────── */
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              {/* Left */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <TouchableOpacity
                  onPress={onBack || (() => router.back())}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: "#F1F5F9",
                  }}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={20} color="#475569" />
                </TouchableOpacity>

                <View
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.primaryBorder,
                    backgroundColor: COLORS.primaryLight,
                  }}
                >
                  <Calendar size={20} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: COLORS.text,
                    }}
                    numberOfLines={1}
                  >
                    Audit Schedule Calendar
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      fontWeight: "500",
                      color: COLORS.textMuted,
                    }}
                    numberOfLines={1}
                  >
                    {viewMode === "months"
                      ? "Select a month to view weekly schedules"
                      : `${monthDisplay[selectedMonth!]} ${selectedYear} - Weekly Schedule`}
                  </Text>
                </View>
              </View>

              {/* Right */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                {viewMode === "weeks" && (
                  <OutlineButton
                    title="Back to Months"
                    icon={ArrowLeft}
                    onPress={handleBackToMonths}
                  />
                )}
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: COLORS.textMuted,
                    }}
                  >
                    Status:
                  </Text>
                  <StatusBadge
                    status={viewMode === "months" ? "APPROVED" : "EMPTY"}
                    count={
                      viewMode === "months" ? filteredMonths.length : undefined
                    }
                  />
                </View>
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={(newYear) => {
                    setSelectedYear(newYear);
                    router.setParams({ year: newYear.toString() });
                  }}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={() =>
                    viewMode === "months"
                      ? fetchAvailableMonths()
                      : fetchWeeklyData(selectedMonth!)
                  }
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: "#F1F5F9",
                  }}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ─────────── MOBILE HEADER (STACKED) ─────────── */
            <View style={{ gap: 12 }}>
              {/* Row 1: Back + Icon + Title */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <TouchableOpacity
                  onPress={onBack || (() => router.back())}
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: "#F1F5F9",
                  }}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={18} color="#475569" />
                </TouchableOpacity>

                <View
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.primaryBorder,
                    backgroundColor: COLORS.primaryLight,
                  }}
                >
                  <Calendar size={18} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLORS.text,
                    }}
                    numberOfLines={1}
                  >
                    Audit Schedule Calendar
                  </Text>
                  <Text
                    style={{
                      marginTop: 1,
                      fontSize: 11,
                      fontWeight: "500",
                      color: COLORS.textMuted,
                    }}
                    numberOfLines={1}
                  >
                    {viewMode === "months"
                      ? "Select a month to view weekly schedules"
                      : `${monthDisplay[selectedMonth!]} ${selectedYear} - Weekly Schedule`}
                  </Text>
                </View>
              </View>

              {/* Row 2: Status + Menu */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <StatusBadge
                  status={viewMode === "months" ? "APPROVED" : "EMPTY"}
                  count={
                    viewMode === "months" ? filteredMonths.length : undefined
                  }
                />

                <TouchableOpacity
                  onPress={() => setShowMobileMenu(!showMobileMenu)}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.card,
                  }}
                  activeOpacity={0.7}
                >
                  <MoreVertical size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ═════ MOBILE DROPDOWN MENU (3 items only) ═════ */}
      {showMobileMenu && !isDesktop && (
        <>
          <View
            style={{
              position: "absolute",
              top: 70,
              right: 16,
              width: 280,
              zIndex: 9999,
              backgroundColor: COLORS.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 15,
              elevation: 10,
              overflow: "hidden",
            }}
          >
            {/* 1. Year Info Row → opens Year Picker Modal */}
            <TouchableOpacity
              onPress={() => {
                setShowMobileMenu(false);
                setShowYearPicker(true); // ✅ Open year modal
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              }}
              activeOpacity={0.7}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: COLORS.primaryLight,
                  }}
                >
                  <Calendar size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.text,
                    }}
                  >
                    FY {selectedYear}-{selectedYear + 1}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                    Change Year
                  </Text>
                </View>
              </View>
              <ArrowRight size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Back to Months (only in weeks view) */}
            {viewMode === "weeks" && (
              <TouchableOpacity
                onPress={() => {
                  setShowMobileMenu(false);
                  handleBackToMonths();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: COLORS.primaryLight,
                  }}
                >
                  <ArrowLeft size={18} color={COLORS.primary} />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: COLORS.text,
                  }}
                >
                  Back to Months
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. Refresh Data */}
            <TouchableOpacity
              onPress={() => {
                setShowMobileMenu(false);
                viewMode === "months"
                  ? fetchAvailableMonths()
                  : fetchWeeklyData(selectedMonth!);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor: "#F1F5F9",
                }}
              >
                <RefreshCw size={18} color="#475569" />
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
              >
                Refresh Data
              </Text>
            </TouchableOpacity>
          </View>

          {/* Backdrop */}
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
            }}
            activeOpacity={1}
            onPress={() => setShowMobileMenu(false)}
          />
        </>
      )}

      {/* ═════ YEAR PICKER MODAL ═════ */}
      <YearPickerModal
        isOpen={showYearPicker}
        onClose={() => setShowYearPicker(false)}
        selectedYear={selectedYear}
        availableYears={availableYears}
        onSelect={(year) => {
          setSelectedYear(year);
          router.setParams({ year: year.toString() });
        }}
      />

      {/* ═════ MAIN SCROLLVIEW ═════ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 1400,
                alignSelf: "center",
                width: "100%",
                padding: 24,
              }
            : { padding: 16, paddingBottom: 40 }
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ═════ MONTH GRID VIEW ═════ */}
        {viewMode === "months" && (
          <>
            {/* Filter Bar */}
            <Card style={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Filter size={16} color={COLORS.textMuted} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.textValue,
                    }}
                  >
                    Filter:
                  </Text>
                  {[
                    { id: "all", label: "All", color: COLORS.primary },
                    {
                      id: "approved",
                      label: "Approved",
                      color: COLORS.primaryDark,
                    },
                    {
                      id: "pending",
                      label: "Pending",
                      color: COLORS.textMuted,
                    },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => setFilterStatus(f.id)}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          filterStatus === f.id ? f.color : COLORS.border,
                        backgroundColor:
                          filterStatus === f.id ? f.color : COLORS.card,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            filterStatus === f.id
                              ? "#FFFFFF"
                              : COLORS.textValue,
                        }}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                  Showing {filteredMonths.length} months
                </Text>
              </View>
            </Card>

            {filteredMonths.length === 0 ? (
              <Card style={{ padding: 40, alignItems: "center" }}>
                <Calendar
                  size={40}
                  color="#CBD5E1"
                  style={{ marginBottom: 16 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: COLORS.textValue,
                    marginBottom: 8,
                  }}
                >
                  No approved months found for {selectedYear}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                  Please complete Form 5 and get approval first.
                </Text>
              </Card>
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
                      style={{
                        width: isDesktop ? "30%" : "100%",
                        marginBottom: 20,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        backgroundColor: COLORS.card,
                        overflow: "hidden",
                        opacity: isApproved ? 1 : 0.6,
                        shadowColor: "#0F172A",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      {/* Card Header */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.border,
                          backgroundColor: monthTheme.bg,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: monthTheme.border,
                              backgroundColor: COLORS.card,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Calendar size={20} color={monthTheme.icon} />
                          </View>
                          <View>
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color: monthTheme.text,
                              }}
                            >
                              {monthDisplay[month]}{" "}
                              {getActualYearForMonth(selectedYear, month)}
                            </Text>
                            <Text
                              style={{
                                marginTop: 2,
                                fontSize: 12,
                                fontWeight: "500",
                                color: COLORS.textMuted,
                              }}
                            >
                              FY {selectedYear}-{selectedYear + 1} •{" "}
                              {getQuarter(month)}
                            </Text>
                          </View>
                        </View>
                        <StatusBadge
                          status={isApproved ? "APPROVED" : "PENDING"}
                        />
                      </View>

                      {/* Card Body */}
                      <View style={{ padding: 20 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            borderRadius: 10,
                            backgroundColor: "#F8FAFC",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "500",
                              color: isApproved
                                ? COLORS.textValue
                                : COLORS.textMuted,
                            }}
                          >
                            {isApproved
                              ? "Click to view weeks"
                              : "Awaiting approval"}
                          </Text>
                          {isApproved && (
                            <ChevronRight size={18} color={COLORS.primary} />
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

        {/* ═════ WEEK GRID VIEW ═════ */}
        {viewMode === "weeks" && selectedMonth && currentMonthTheme && (
          <>
            {/* Month Header Card */}
            <Card
              style={{
                backgroundColor: currentMonthTheme.bg,
                borderColor: currentMonthTheme.border,
                padding: 24,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: currentMonthTheme.border,
                    backgroundColor: COLORS.card,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={28} color={currentMonthTheme.icon} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: currentMonthTheme.text,
                    }}
                  >
                    {monthDisplay[selectedMonth]} {selectedYear}
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      color: COLORS.textMuted,
                    }}
                  >
                    Select a week to create or view daily schedules
                  </Text>
                </View>
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: currentMonthTheme.border,
                    backgroundColor: COLORS.card,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: currentMonthTheme.text,
                    }}
                  >
                    {getQuarter(selectedMonth)}
                  </Text>
                </View>
              </View>
            </Card>

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
                    style={{
                      width: isDesktop ? "23%" : "100%",
                      marginBottom: 20,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isScheduled
                        ? COLORS.primaryBorder
                        : COLORS.border,
                      backgroundColor: COLORS.card,
                      overflow: "hidden",
                      opacity: isScheduled ? 1 : 0.7,
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.03,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    {/* Week Header */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.border,
                        backgroundColor: isScheduled
                          ? COLORS.stateSuccessBg
                          : "#F8FAFC",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: "700",
                          color: isScheduled
                            ? COLORS.primaryDark
                            : COLORS.textMuted,
                        }}
                      >
                        {week}
                      </Text>
                      <StatusBadge
                        status={isScheduled ? "APPROVED" : "EMPTY"}
                        count={isScheduled ? weekData.scheduleCount : undefined}
                      />
                    </View>

                    {/* Date Range */}
                    <View style={{ padding: 20 }}>
                      <View
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isScheduled
                            ? COLORS.primaryBorder
                            : COLORS.border,
                          backgroundColor: "#F8FAFC",
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: COLORS.textMuted,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Date Range
                        </Text>
                        <Text
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            fontWeight: "600",
                            color: COLORS.textValue,
                          }}
                        >
                          {dateRange.startDate} to {dateRange.endDate}
                        </Text>
                      </View>

                      {/* Departments */}
                      {isScheduled && weekData.departments.length > 0 && (
                        <View style={{ marginBottom: 16 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: COLORS.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              marginBottom: 8,
                            }}
                          >
                            Departments
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            {weekData.departments
                              .slice(0, 3)
                              .map((dept: string) => (
                                <View
                                  key={dept}
                                  style={{
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: COLORS.chipBorder,
                                    backgroundColor: COLORS.chipBg,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "600",
                                      color: COLORS.chipText,
                                    }}
                                  >
                                    {dept}
                                  </Text>
                                </View>
                              ))}
                            {weekData.departments.length > 3 && (
                              <View
                                style={{
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: COLORS.border,
                                  backgroundColor: "#F1F5F9",
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: COLORS.textMuted,
                                  }}
                                >
                                  +{weekData.departments.length - 3}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Action Row */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 14,
                          borderTopWidth: 1,
                          borderTopColor: isScheduled
                            ? COLORS.primaryBorder
                            : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: isScheduled
                              ? COLORS.primaryDark
                              : COLORS.textMuted,
                          }}
                        >
                          {isScheduled
                            ? "Create Daily Schedule"
                            : "No schedules yet"}
                        </Text>
                        {isScheduled && (
                          <ChevronRight size={18} color={COLORS.primary} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <Card style={{ padding: 24 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: COLORS.text,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 16,
                }}
              >
                Status Legend
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.primaryBorder,
                      backgroundColor: COLORS.stateSuccessBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle size={12} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    Week has schedules - Click to create daily schedule
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      backgroundColor: "#F1F5F9",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock size={12} color={COLORS.textMuted} />
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                    No schedules - Complete Form 5 first
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}
