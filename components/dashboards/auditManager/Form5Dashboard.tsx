import YearFilter from "@/components/common/YearFilter"; // ✅ Add this import (adjust path if needed)
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
    Plus,
    RefreshCw,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext"; // ✅ ADD THIS

// ═════ MNC STANDARD PALETTE (Matched to Form5View) ═════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#000000",
  textValue: "#1F2937",
  textMuted: "#6B7280",
  accent: "#3B82F6",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",
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

// ═════ REUSABLE UI COMPONENTS (Matched to Form5View) ═════
const Card = ({ children, className }: any) => (
  <View
    className={`rounded-xl border border-gray-200 bg-white shadow-sm mb-6 ${className || ""}`}
  >
    {children}
  </View>
);

const AlertBanner = ({ type, title, message, icon: Icon }: any) => {
  const stylesMap: any = {
    info: {
      bg: COLORS.accentLight,
      border: COLORS.accentBorder,
      color: "#1E3A8A",
      iconColor: COLORS.accent,
    },
  };
  const s = stylesMap[type] || stylesMap.info;
  return (
    <View
      className="flex-row gap-3 p-4 mb-6 border rounded-xl"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="items-center justify-center bg-white border rounded-lg w-9 h-9"
        style={{ borderColor: s.border }}
      >
        <Icon size={18} color={s.iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text className="mt-1 text-xs opacity-90" style={{ color: s.color }}>
          {message}
        </Text>
      </View>
    </View>
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
  const params = useLocalSearchParams(); // ✅ Add this
  const { addToast } = useToast();

  const isDesktop = width >= 768;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isGridDesktop = width >= 1024; // Used for grid layout (4 columns)

  const [selectedYear, setSelectedYear] = useState(
    year ||
      (params?.year ? parseInt(params.year as string) : null) ||
      new Date().getFullYear(),
  );

  // ✅ Sync state if route params change
  useEffect(() => {
    if (params?.year) {
      setSelectedYear(parseInt(params.year as string));
    }
  }, [params?.year]);

  // ✅ Sync state if prop changes
  useEffect(() => {
    if (year) setSelectedYear(year);
  }, [year]);

  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 📐 Dynamically calculate card width for perfect 4/3/1 grid inside a centered 1400px container
  const getCardWidth = () => {
    const horizontalPadding = isGridDesktop ? 48 : 32;
    const availableWidth = Math.min(width, 1400) - horizontalPadding;
    const gap = 20; // gap-5 in NativeWind is 20px

    if (isMobile) {
      return availableWidth; // 1 column
    } else if (isTablet) {
      return (availableWidth - 2 * gap) / 3; // 3 columns
    } else {
      return (availableWidth - 3 * gap) / 4; // 4 columns
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAvailableMonths(selectedYear);
      const months = Array.isArray(response) ? response : response?.data || [];

      const validMonths = months.filter((m: any) => m.hasPlannedAudits);
      const counts: Record<string, number> = {};

      await Promise.all(
        validMonths.map(async (m: any) => {
          try {
            const res = await auditScheduleApi.getByYearAndMonth(
              selectedYear,
              m.month,
            );
            const allSchedules = Array.isArray(res) ? res : res?.data || [];
            const weekSchedules = allSchedules.filter(
              (s: any) => !s.scheduledDate,
            );
            counts[m.month] = weekSchedules.length;
          } catch (error: any) {
            counts[m.month] = 0;
          }
        }),
      );

      const updatedMonths = months.map((m: any) => ({
        ...m,
        scheduleCount: counts[m.month] || 0,
      }));

      setAvailableMonths(updatedMonths);
    } catch (error: any) {
      console.error("❌ ERROR in fetchData:", error.message);
      addToast("Failed to load schedule data. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
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
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      APPROVED: {
        bg: "bg-green-50",
        color: "text-green-800",
        border: "border-green-200",
        text: "Approved",
        Icon: CheckCircle,
        iconColor: "#10B981",
      },
      PENDING_APPROVAL: {
        bg: "bg-amber-50",
        color: "text-amber-800",
        border: "border-amber-200",
        text: "Pending",
        Icon: Clock,
        iconColor: "#F59E0B",
      },
      REJECTED: {
        bg: "bg-red-50",
        color: "text-red-800",
        border: "border-red-200",
        text: "Rejected",
        Icon: AlertCircle,
        iconColor: "#EF4444",
      },
    };
    const s = styles[status] || {
      bg: "bg-slate-100",
      color: "text-slate-600",
      border: "border-slate-200",
      text: "Draft",
      Icon: FileText,
      iconColor: "#475569",
    };
    const Icon = s.Icon;
    return (
      <View
        className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${s.bg} ${s.border}`}
      >
        <Icon size={12} color={s.iconColor} />
        <Text className={`text-[11px] font-semibold ${s.color}`}>{s.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const validMonths = financialMonths;

  return (
    <View className="flex-1 bg-gray-50">
      {/* 🎨 REDESIGNED HEADER - Exact match to your reference code */}
      <View
        style={{
          width: "100%",
          paddingHorizontal: isDesktop ? 24 : 16,
          paddingTop: isDesktop ? 20 : 16,
          paddingBottom: isDesktop ? 20 : 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1400,
            alignSelf: "center",
          }}
        >
          {/* ✅ Responsive container: row on desktop, column on mobile */}
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: isDesktop ? "center" : "stretch",
              justifyContent: isDesktop ? "space-between" : "flex-start",
              gap: isDesktop ? 24 : 16,
            }}
          >
            {/* Title Section - Takes only needed space on desktop, full width on mobile */}
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
                  backgroundColor: COLORS.accentLight,
                  borderWidth: 1,
                  borderColor: COLORS.accentBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Calendar size={22} color={COLORS.accent} />
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
                  Internal Quality Audit Schedule
                </Text>
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  Form 5 - Month-wise Audit Planning (IATF16949)
                </Text>
              </View>
            </View>

            {/* Controls Section - Properly aligned on desktop, stacked on mobile */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                justifyContent: isDesktop ? "flex-end" : "flex-start",
              }}
            >
              {/* Year Selector */}
              {/* Year Selector */}
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

              {/* Create New Button */}
              <TouchableOpacity
                onPress={handleCreateNew}
                style={{
                  height: isDesktop ? 40 : 36,
                  paddingHorizontal: isDesktop ? 20 : 12,
                  backgroundColor: COLORS.accent,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Plus size={isDesktop ? 18 : 16} color="#FFF" />
                <Text
                  style={{
                    fontSize: isDesktop ? 14 : 12,
                    fontWeight: "600",
                    color: "#FFF",
                  }}
                >
                  Create New
                </Text>
              </TouchableOpacity>

              {/* Refresh Button */}
              <TouchableOpacity
                onPress={fetchData}
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

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isGridDesktop
            ? {
                maxWidth: 1400, // 🎯 Centers the entire grid block on large screens
                alignSelf: "center",
                width: "100%",
                padding: 24,
                paddingBottom: 32,
              }
            : {
                padding: 16,
                paddingBottom: 32,
              }
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <AlertBanner
          type="info"
          icon={Info}
          title="How to use Form 5"
          message="Select a month below to create week-wise audit schedules. After completing all weeks, submit for approval. Once approved, you can create daily schedules with specific time slots."
        />

        {/* Month Grid Cards */}
        {validMonths.length === 0 ? (
          <Card className="items-center p-10">
            <Calendar size={40} color="#CBD5E1" />
            <Text className="mt-4 mb-2 text-lg font-semibold text-gray-800">
              No months available for {selectedYear}
            </Text>
            <Text className="mb-5 text-sm text-gray-500">
              Please complete Form 4 (Department Audit Plan) first.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/form4" as RelativePathString)}
              className="flex-row items-center h-10 gap-2 px-5 rounded-lg"
              style={{ backgroundColor: COLORS.accent }}
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
              const monthTheme = monthThemeColors[month] || {
                bg: "#F8FAFC",
                border: "#E2E8F0",
                text: "#1F2937",
                icon: "#6B7280",
              };

              return (
                <TouchableOpacity
                  key={month}
                  onPress={() => handleMonthClick(monthData || { month })}
                  activeOpacity={0.8}
                  className="overflow-hidden bg-white border shadow-sm border-slate-200 rounded-xl"
                  style={{
                    width: getCardWidth(), // 📐 Applies the perfectly calculated width
                    opacity: 1,
                  }}
                >
                  {/* Card Header */}
                  <View
                    className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200"
                    style={{ backgroundColor: monthTheme.bg }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="items-center justify-center bg-white border rounded-lg w-9 h-9"
                        style={{ borderColor: monthTheme.border }}
                      >
                        <Calendar size={18} color={monthTheme.icon} />
                      </View>
                      <View>
                        <Text
                          className="text-lg font-bold"
                          style={{ color: monthTheme.text }}
                        >
                          {monthDisplay[month]}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          Financial Year {selectedYear}-{selectedYear + 1}
                        </Text>
                      </View>
                    </View>
                    {hasData ? (
                      getStatusBadge(approvalStatus)
                    ) : (
                      <View className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100">
                        <Text className="text-[11px] font-semibold text-slate-500">
                          No Plan
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Body */}
                  <View className="p-5">
                    <View className="flex-row items-center gap-3 mb-4">
                      <View className="items-center justify-center w-10 h-10 border border-blue-100 rounded-lg bg-blue-50">
                        <FileText size={18} color={COLORS.accent} />
                      </View>
                      <View>
                        <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Schedules
                        </Text>
                        <Text className="text-xl font-bold text-black">
                          {scheduleCount}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between px-4 py-3 border border-blue-100 rounded-lg bg-blue-50">
                      <Text className="text-sm font-semibold text-blue-800">
                        {hasData ? "View Schedule Details" : "Start Planning"}
                      </Text>
                      <ArrowRight size={16} color={COLORS.accent} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <Card className="p-6">
          <Text className="mb-4 text-xs font-bold tracking-wider text-gray-900 uppercase">
            Status Legend
          </Text>
          <View className="flex-row flex-wrap gap-6">
            <View className="flex-row items-center gap-2">
              <View className="items-center justify-center w-4 h-4 border border-green-200 rounded-full bg-green-50">
                <CheckCircle size={10} color="#10B981" />
              </View>
              <Text className="text-sm text-slate-500">
                Approved - Ready for daily scheduling
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="items-center justify-center w-4 h-4 border rounded-full bg-amber-50 border-amber-200">
                <Clock size={10} color="#F59E0B" />
              </View>
              <Text className="text-sm text-slate-500">
                Pending Approval - Waiting for review
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="items-center justify-center w-4 h-4 border border-red-200 rounded-full bg-red-50">
                <AlertCircle size={10} color="#EF4444" />
              </View>
              <Text className="text-sm text-slate-500">
                Rejected - Needs correction
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="items-center justify-center w-4 h-4 border rounded-full bg-slate-100 border-slate-200">
                <FileText size={10} color="#475569" />
              </View>
              <Text className="text-sm text-slate-500">
                Draft - In progress, not submitted
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
