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
import { useToast } from "../../context/ToastContext";

// ═════ MNC STANDARD PALETTE ═════
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

// ═════ MONTH COLORS ═════
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

// ═════ REUSABLE UI ═════
const Card = ({ children, className }: any) => (
  <View
    className={`mb-6 rounded-xl border border-gray-200 bg-white shadow-sm ${className || ""}`}
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
      className="mb-6 flex-row gap-3 rounded-xl border p-4"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-lg border bg-white"
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

  useEffect(() => {
    if (params?.year) setSelectedYear(parseInt(params.year as string));
  }, [params?.year]);

  useEffect(() => {
    if (year) setSelectedYear(year);
  }, [year]);

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

  // ═════ FETCH (with plant scoping) ═════
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

            // ✅ PLANT FILTER
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
  }, [selectedYear, addToast, user?.id, user?.plantId]); // ✅ added plantId

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // ═════ STATUS BADGE (extended for full workflow) ═════
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
      // ✅ NEW
      PENDING_LA_CONFIRMATION: {
        bg: "bg-blue-50",
        color: "text-blue-800",
        border: "border-blue-200",
        text: "Awaiting LA",
        Icon: Clock,
        iconColor: "#3B82F6",
      },
      // ✅ NEW
      CONFIRMED_BY_LA: {
        bg: "bg-purple-50",
        color: "text-purple-800",
        border: "border-purple-200",
        text: "Confirmed by LA",
        Icon: CheckCircle,
        iconColor: "#8B5CF6",
      },
      // ✅ NEW
      FEASIBILITY_REJECTED: {
        bg: "bg-red-50",
        color: "text-red-800",
        border: "border-red-200",
        text: "Feasibility Rejected",
        Icon: AlertCircle,
        iconColor: "#EF4444",
      },
      // ✅ NEW
      CHANGE_REQUESTED: {
        bg: "bg-orange-50",
        color: "text-orange-800",
        border: "border-orange-200",
        text: "Changes Requested",
        Icon: AlertCircle,
        iconColor: "#F97316",
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
        className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${s.bg} ${s.border}`}
      >
        <Icon size={12} color={s.iconColor} />
        <Text className={`text-[11px] font-semibold ${s.color}`}>{s.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const validMonths = financialMonths;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header — unchanged */}
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
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center" }}>
          <View
            style={{
              flexDirection: isDesktop ? "row" : "column",
              alignItems: isDesktop ? "center" : "stretch",
              justifyContent: isDesktop ? "space-between" : "flex-start",
              gap: isDesktop ? 24 : 16,
            }}
          >
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
                  router.setParams({ year: newYear.toString() });
                }}
                availableYears={Array.from(
                  { length: 11 },
                  (_, i) => new Date().getFullYear() - 5 + i,
                )}
              />

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

      {/* Scrollable content */}
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
            <Text className="mb-2 mt-4 text-lg font-semibold text-gray-800">
              No months available for {selectedYear}
            </Text>
            <Text className="mb-5 text-sm text-gray-500">
              Please complete Form 4 (Department Audit Plan) first.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/form4" as RelativePathString)}
              className="h-10 flex-row items-center gap-2 rounded-lg px-5"
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
                  onPress={() =>
                    handleMonthClick(
                      monthData ?? {
                        month,
                        approvalStatus: "DRAFT",
                        scheduleCount: 0,
                      },
                    )
                  }
                  activeOpacity={0.8}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  style={{ width: getCardWidth(), opacity: 1 }}
                >
                  <View
                    className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4"
                    style={{ backgroundColor: monthTheme.bg }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-9 w-9 items-center justify-center rounded-lg border bg-white"
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
                        <Text className="mt-0.5 text-xs text-slate-500">
                          Financial Year {selectedYear}-{selectedYear + 1}
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
                      <View className="h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
                        <FileText size={18} color={COLORS.accent} />
                      </View>
                      <View>
                        <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Schedules
                        </Text>
                        <Text className="text-xl font-bold text-black">
                          {scheduleCount}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
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
          <Text className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-900">
            Status Legend
          </Text>
          <View className="flex-row flex-wrap gap-6">
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-green-200 bg-green-50">
                <CheckCircle size={10} color="#10B981" />
              </View>
              <Text className="text-sm text-slate-500">
                Approved - Ready for daily scheduling
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
                <Clock size={10} color="#3B82F6" />
              </View>
              <Text className="text-sm text-slate-500">
                Awaiting LA - Pending Lead Auditor confirmation
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-purple-200 bg-purple-50">
                <CheckCircle size={10} color="#8B5CF6" />
              </View>
              <Text className="text-sm text-slate-500">
                Confirmed by LA - Awaiting Top Management approval
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
                <Clock size={10} color="#F59E0B" />
              </View>
              <Text className="text-sm text-slate-500">
                Pending - Waiting for review
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-red-200 bg-red-50">
                <AlertCircle size={10} color="#EF4444" />
              </View>
              <Text className="text-sm text-slate-500">
                Rejected - Needs correction
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
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
