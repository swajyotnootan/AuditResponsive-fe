import YearFilter from "@/components/common/YearFilter";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Info,
  MoreVertical,
  RefreshCw,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// ═════ STRICT MONOCHROMATIC MNC PALETTE ════
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
};

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

// ════ REUSABLE UI COMPONENTS ════
const Card = ({ children, className = "" }: any) => (
  <View
    className={`mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    style={{
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    }}
  >
    {children}
  </View>
);

const AlertBanner = ({ type, title, message, icon: Icon }: any) => {
  const stylesMap: any = {
    info: {
      bg: COLORS.primaryLight,
      border: COLORS.primaryBorder,
      color: COLORS.primaryDark,
      iconColor: COLORS.primary,
      iconBg: "#FFFFFF",
    },
  };
  const s = stylesMap[type] || stylesMap.info;
  return (
    <View
      className="mb-6 flex-row gap-4 rounded-2xl border p-5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: s.iconBg,
          borderColor: s.border,
          borderWidth: 1,
        }}
      >
        <Icon size={20} color={s.iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-sm font-bold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text
          className="mt-1 text-sm leading-5 opacity-90"
          style={{ color: s.color }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};

// ✅ OUTLINE BUTTON WITH HOVER EFFECT
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
      className="flex-row items-center gap-2 rounded-lg border px-4 py-2.5"
      style={{
        borderColor,
        backgroundColor,
        borderWidth: 1,
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
      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

interface Form5DashboardProps {
  year?: number;
  onBack?: () => void;
  onMonthSelect?: (month: string) => void;
}

export default function Form5Dashboard({
  year,
  onBack,
  onMonthSelect,
}: Form5DashboardProps = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const { addToast } = useToast();

  const isDesktop = width >= 768;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isGridDesktop = width >= 1024;

  const [selectedYear, setSelectedYear] = useState(
    year ||
      (params?.year ? parseInt(params.year as string) : null) ||
      new Date().getFullYear(),
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getCardWidth = () => {
    const horizontalPadding = isGridDesktop ? 48 : 32;
    const availableWidth = Math.min(width, 1400) - horizontalPadding;
    const gap = 20;
    if (isMobile) return availableWidth;
    if (isTablet) return (availableWidth - 2 * gap) / 3;
    return (availableWidth - 3 * gap) / 4;
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      console.warn("⚠️ No userId, skipping fetch");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(
        selectedYear,
        user.id,
      );
      const months = Array.isArray(response) ? response : response?.data || [];
      const validMonths = months.filter((m: any) => m.hasPlannedAudits);
      const counts: Record<string, number> = {};
      await Promise.all(
        validMonths.map(async (m: any) => {
          try {
            const res = await auditScheduleApi.getByYearAndMonth(
              selectedYear,
              m.month,
              user?.id,
            );
            const allSchedules = Array.isArray(res) ? res : res?.data || [];
            const plantScopedSchedules = filterByPlant(
              allSchedules,
              user?.plantId,
            );
            const weekSchedules = plantScopedSchedules.filter(
              (s: any) => !s.scheduledDate,
            );
            counts[m.month] = weekSchedules.length;
          } catch (error: any) {
            counts[m.month] = 0;
          }
        }),
      );
      setAvailableMonths(
        months.map((m: any) => ({ ...m, scheduleCount: counts[m.month] || 0 })),
      );
    } catch (error: any) {
      console.error("❌ ERROR in fetchData:", error.message);
      addToast("Failed to load schedule data. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, addToast, user?.id, user?.plantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (params?.year) setSelectedYear(parseInt(params.year as string));
  }, [params?.year]);
  useEffect(() => {
    if (year) setSelectedYear(year);
  }, [year]);

  const handleMonthClick = (monthData: any) => {
    if (onMonthSelect) {
      onMonthSelect(monthData.month);
    } else {
      router.push(
        `/form5?preselectedYear=${selectedYear}&preselectedMonth=${monthData.month}` as RelativePathString,
      );
    }
  };

  const handleCreateNew = () => {
    router.push(`/form5?preselectedYear=${selectedYear}` as RelativePathString);
    setShowDropdown(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      APPROVED: {
        bg: COLORS.stateSuccessBg,
        color: COLORS.primaryDark,
        border: COLORS.primaryBorder,
        text: "Approved",
        Icon: CheckCircle,
        iconColor: COLORS.primary,
      },
      PENDING_LA_CONFIRMATION: {
        bg: COLORS.primaryLight,
        color: COLORS.primary,
        border: COLORS.primaryBorder,
        text: "Awaiting LA",
        Icon: Clock,
        iconColor: COLORS.primary,
      },
      CONFIRMED_BY_LA: {
        bg: "#F0F9FF",
        color: "#0369A1",
        border: "#BAE6FD",
        text: "Confirmed by LA",
        Icon: CheckCircle,
        iconColor: "#0369A1",
      },
      FEASIBILITY_REJECTED: {
        bg: COLORS.stateErrorBg,
        color: COLORS.stateErrorText,
        border: COLORS.border,
        text: "Feasibility Rejected",
        Icon: AlertCircle,
        iconColor: COLORS.stateErrorText,
      },
      CHANGE_REQUESTED: {
        bg: COLORS.stateWarningBg,
        color: COLORS.stateWarningText,
        border: COLORS.border,
        text: "Changes Requested",
        Icon: AlertCircle,
        iconColor: COLORS.stateWarningText,
      },
      PENDING_APPROVAL: {
        bg: COLORS.stateWarningBg,
        color: COLORS.stateWarningText,
        border: COLORS.border,
        text: "Pending",
        Icon: Clock,
        iconColor: COLORS.stateWarningText,
      },
      REJECTED: {
        bg: COLORS.stateErrorBg,
        color: COLORS.stateErrorText,
        border: COLORS.border,
        text: "Rejected",
        Icon: AlertCircle,
        iconColor: COLORS.stateErrorText,
      },
    };
    const s = styles[status] || {
      bg: "#F1F5F9",
      color: "#475569",
      border: "#E2E8F0",
      text: "Draft",
      Icon: FileText,
      iconColor: "#475569",
    };
    const Icon = s.Icon;
    return (
      <View
        className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
        style={{ backgroundColor: s.bg, borderColor: s.border }}
      >
        <Icon size={14} color={s.color} />
        <Text
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: s.color }}
        >
          {s.text}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  const validMonths = financialMonths;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="w-full px-4">
          {/* ✅ Single row for both desktop and mobile */}
          <View className="flex-row items-center justify-between gap-3">
            {/* Left side: Back + Icon + Title */}
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#475569" />
              </TouchableOpacity>
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className={`${isDesktop ? "text-xl" : "text-lg"} font-bold text-slate-900`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Internal Quality Audit Schedule
                </Text>
                <Text
                  className="mt-0.5 text-sm font-medium text-slate-500"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Form 5 - Month-wise Audit Planning
                </Text>
              </View>
            </View>

            {/* Right side: Desktop buttons OR Mobile 3-dot */}
            {isDesktop ? (
              <View className="flex-row items-center gap-3">
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={(newYear) => {
                    setSelectedYear(newYear);
                    router.setParams({ year: newYear.toString() });
                  }}
                  availableYears={Array.from(
                    { length: 11 },
                    (_, i) => new Date().getFullYear() - 5 + i,
                  )}
                />
                <TouchableOpacity
                  onPress={fetchData}
                  className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                  activeOpacity={0.7}
                >
                  <RefreshCw size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ zIndex: 1000 }}>
                <TouchableOpacity
                  onPress={() => setShowDropdown(!showDropdown)}
                  className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
                  activeOpacity={0.7}
                >
                  <MoreVertical size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ✅ Dropdown Menu - Rendered at root level to avoid clipping */}
      {showDropdown && !isDesktop && (
        <View
          style={{
            position: "absolute",
            top: 70, // Adjust based on header height
            right: 16, // Match header padding
            width: 260,
            zIndex: 9999,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 15,
            elevation: 10,
            overflow: "hidden",
          }}
        >
          {/* Year Selection */}
          <TouchableOpacity
            onPress={() => {
              setShowDropdown(false);
              setShowYearModal(true);
            }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-900">
                  {selectedYear}-{selectedYear + 1}
                </Text>
                <Text className="text-[11px] text-slate-500">Change Year</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* Refresh */}
          <TouchableOpacity
            onPress={() => {
              setShowDropdown(false);
              fetchData();
            }}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <RefreshCw size={18} color="#475569" />
            </View>
            <Text className="text-sm font-semibold text-slate-900">
              Refresh Data
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Year Selection Modal */}
      <Modal
        visible={showYearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-slate-900/30 p-6"
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-3xl bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
              <Text className="text-lg font-bold text-slate-900">
                Select Year
              </Text>
              <TouchableOpacity
                onPress={() => setShowYearModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              {Array.from(
                { length: 11 },
                (_, i) => new Date().getFullYear() - 5 + i,
              ).map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearModal(false);
                    router.setParams({ year: year.toString() });
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedYear === year ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white"}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${selectedYear === year ? "font-bold text-blue-700" : "text-slate-700"}`}
                  >
                    {year} - {year + 1}
                  </Text>
                  {selectedYear === year && (
                    <CheckCircle size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isGridDesktop
            ? {
                maxWidth: 1400,
                alignSelf: "center",
                width: "100%",
                padding: 24,
                paddingBottom: 32,
              }
            : { padding: 16, paddingBottom: 32 }
        }
        showsVerticalScrollIndicator={false}
      >
        <AlertBanner
          type="info"
          icon={Info}
          title="How to use Form 5"
          message="Select a month below to create week-wise audit schedules. After completing all weeks, submit for approval. Once approved, you can create daily schedules with specific time slots."
        />

        {validMonths.length === 0 ? (
          <Card className="items-center p-10">
            <Calendar size={40} color="#CBD5E1" />
            <Text className="mb-2 mt-4 text-lg font-semibold text-slate-900">
              No months available for {selectedYear}
            </Text>
            <Text className="mb-5 text-center text-sm text-slate-500">
              Please complete Form 4 (Department Audit Plan) first.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/form4" as RelativePathString)}
              className="h-10 flex-row items-center gap-2 rounded-xl bg-blue-600 px-5"
              activeOpacity={0.8}
            >
              <FileText size={16} color="#FFF" />
              <Text className="text-sm font-semibold text-white">
                Go to Form 4
              </Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <View className="flex-row flex-wrap gap-5">
            {validMonths.map((month) => {
              const monthData = availableMonths.find((m) => m.month === month);
              const hasData = !!monthData;
              const approvalStatus = monthData?.approvalStatus || "DRAFT";
              const scheduleCount = monthData?.scheduleCount || 0;

              return (
                <TouchableOpacity
                  key={month}
                  onPress={() =>
                    handleMonthClick(
                      monthData ?? {
                        month,
                        approvalStatus: "DRAFT",
                        scheduleCount: 0,
                      },
                    )
                  }
                  activeOpacity={0.7}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  style={{ width: getCardWidth() }}
                >
                  <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                        <Calendar size={18} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text className="text-lg font-bold text-slate-900">
                          {monthDisplay[month]}
                        </Text>
                        <Text className="mt-0.5 text-xs font-medium text-slate-500">
                          FY {selectedYear}-{selectedYear + 1}
                        </Text>
                      </View>
                    </View>
                    {hasData ? (
                      getStatusBadge(approvalStatus)
                    ) : (
                      <View className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1">
                        <Text className="text-[11px] font-semibold text-slate-500">
                          No Plan
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="p-5">
                    <View className="mb-4 flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                        <FileText size={18} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Total Schedules
                        </Text>
                        <Text className="text-2xl font-bold text-slate-900">
                          {scheduleCount}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <Text className="text-sm font-semibold text-blue-800">
                        {hasData ? "View Schedule Details" : "Start Planning"}
                      </Text>
                      <ArrowRight size={16} color={COLORS.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <Card className="p-6">
          <Text className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            Status Legend
          </Text>
          <View className="flex-row flex-wrap gap-6">
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
                <CheckCircle size={10} color={COLORS.primary} />
              </View>
              <Text className="text-sm text-slate-600">
                Approved - Ready for daily scheduling
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
                <Clock size={10} color={COLORS.primary} />
              </View>
              <Text className="text-sm text-slate-600">
                Awaiting LA - Pending Lead Auditor confirmation
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <AlertCircle size={10} color="#475569" />
              </View>
              <Text className="text-sm text-slate-600">
                Rejected / Changes Requested - Needs correction
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
                <FileText size={10} color="#475569" />
              </View>
              <Text className="text-sm text-slate-600">
                Draft - In progress, not submitted
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* ✅ Invisible overlay to close dropdown when tapping outside */}
      {showDropdown && (
        <Pressable
          className="absolute inset-0 z-50"
          onPress={() => setShowDropdown(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
    </View>
  );
}
