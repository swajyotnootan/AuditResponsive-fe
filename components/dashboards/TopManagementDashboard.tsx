import Form3View from "@/components/dashboards/auditManager/Form3View";
import Form4View from "@/components/dashboards/auditManager/Form4View";
import Form5View from "@/components/dashboards/auditManager/Form5View";
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  Archive,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  List,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";
import DeptPlanDetailsModal from "./topManagement/DeptPlanDetailsModal";
import PlanDetailsModal from "./topManagement/PlanDetailsModal";
import RejectModal from "./topManagement/RejectModal";



// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 5;

const COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  lightest: "#bfdbfe",
  bg: "#eff6ff",
  white: "#ffffff",
  textMain: "#1e293b",
  textSub: "#64748b",
  border: "#e2e8f0",
  danger: "#e11d48",
  success: "#166534",
  warning: "#b45309",
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

const AUDIT_ELEMENTS_MAP: Record<string, string> = {
  "System Audit (ISO9001)": "A",
  "System Audit (IATF16949)": "B",
  "5S Audit": "C",
  "Process Audit": "D",
  "Product Audit": "E",
};

const getAuditElementCode = (element: string | undefined | null): string => {
  if (!element) return "";
  const strElement = String(element);
  if (AUDIT_ELEMENTS_MAP[strElement]) return AUDIT_ELEMENTS_MAP[strElement];

  const lowerElement = strElement.toLowerCase();
  for (const [key, value] of Object.entries(AUDIT_ELEMENTS_MAP)) {
    if (
      key.toLowerCase().includes(lowerElement) ||
      lowerElement.includes(key.toLowerCase())
    ) {
      return value;
    }
  }

  if (strElement.length === 1 && /^[A-E]$/i.test(strElement)) {
    return strElement.toUpperCase();
  }

  return strElement.substring(0, 3);
};

// ============================================================================
// KPI CARD
// ============================================================================
const KpiCard = ({ title, value, icon, color, isDesktop }: any) => (
  <View
    className="w-full bg-white border shadow-sm border-slate-200 rounded-2xl"
    style={{ padding: isDesktop ? 24 : 12 }}
  >
    <View className="flex-row items-start justify-between mb-2">
      <View className="p-2 rounded-xl" style={{ backgroundColor: color.bg }}>
        {React.cloneElement(icon, {
          color: color.text,
          size: isDesktop ? 24 : 18,
        })}
      </View>
    </View>
    <Text
      className={`font-bold text-slate-800 ${isDesktop ? "text-3xl mb-1" : "text-xl mb-1"}`}
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text
      className="text-[10px] md:text-xs font-medium tracking-wide uppercase text-slate-500"
      numberOfLines={2}
      style={{ lineHeight: 14 }}
    >
      {title}
    </Text>
  </View>
);

// ============================================================================
// ANALYTICS CARD
// ============================================================================
const AnalyticsCard = ({ title, subtitle, children, className = "" }: any) => (
  <View
    className={`p-6 bg-white border border-slate-200 shadow-sm rounded-2xl flex-1 min-w-[300px] ${className}`}
  >
    <Text className="text-lg font-bold text-slate-800">{title}</Text>
    {subtitle && (
      <Text className="mt-1 mb-4 text-xs text-slate-500">{subtitle}</Text>
    )}
    {children}
  </View>
);

// ============================================================================
// SIMPLE CHART COMPONENTS
// ============================================================================
const NativeGroupedBarChart = ({
  data,
  title,
  subtitle,
  keys,
  colors,
}: any) => {
  const maxValue = Math.max(
    ...data.map((d: any) => Math.max(...keys.map((k: string) => d[k] || 0))),
    1,
  );

  return (
    <View className="flex-1 p-4 bg-white rounded-xl">
      <Text className="mb-1 font-bold text-slate-800">{title}</Text>
      <Text className="mb-4 text-xs text-slate-500">{subtitle}</Text>
      <View className="flex-row items-end h-48 gap-2 px-2">
        {data.map((item: any, idx: number) => (
          <View key={idx} className="items-center justify-end flex-1 h-full">
            <View className="flex-row items-end justify-center w-full gap-1">
              {keys.map((key: string, kIdx: number) => (
                <View
                  key={key}
                  style={{
                    height: `${Math.max(((item[key] || 0) / maxValue) * 100, 4)}%`,
                    backgroundColor: colors[kIdx],
                    width: 16,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              ))}
            </View>
            <Text
              className="text-[10px] text-slate-500 mt-2 text-center"
              numberOfLines={1}
            >
              {item.name || item.month}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row justify-center gap-4 mt-4">
        {keys.map((key: string, kIdx: number) => (
          <View key={key} className="flex-row items-center gap-1">
            <View
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colors[kIdx] }}
            />
            <Text className="text-xs text-slate-600">{key}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const NativePieChart = ({ data, title, subtitle, total }: any) => {
  const totalValue =
    data.reduce((sum: number, d: any) => sum + d.value, 0) || 1;
  const chartColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.light,
    COLORS.lighter,
    COLORS.lightest,
    COLORS.dark,
  ];

  return (
    <View className="flex-1 p-4 bg-white rounded-xl">
      <Text className="mb-1 font-bold text-slate-800">{title}</Text>
      <Text className="mb-4 text-xs text-slate-500">{subtitle}</Text>
      <View className="flex-row h-4 mb-4 overflow-hidden rounded-full">
        {data.map((item: any, idx: number) => (
          <View
            key={idx}
            style={{
              width: `${(item.value / totalValue) * 100}%`,
              backgroundColor: chartColors[idx % chartColors.length],
            }}
          />
        ))}
      </View>
      <View className="gap-2">
        <Text className="mb-2 text-lg font-bold text-slate-800">
          {total || totalValue} Total
        </Text>
        {data.map((item: any, idx: number) => (
          <View key={idx} className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 gap-2">
              <View
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: chartColors[idx % chartColors.length],
                }}
              />
              <Text className="flex-1 text-sm text-slate-700" numberOfLines={1}>
                {item.fullName || item.name}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-slate-800">
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// PLAN SECTION CARD
// ============================================================================
const PlanSectionCard = ({
  title,
  icon: Icon,
  color,
  plans,
  onViewPlan,
  formType,
  showAll = false,
  delay = 0,
  searchQuery = "",
  onSearchChange,
  currentPage = 1,
  onPageChange,
}: any) => {
  const getFormTypeLabel = () => {
    switch (formType) {
      case "annual":
        return "Annual Plan";
      case "dept":
        return "Dept Plan";
      case "week":
        return "Week Schedule";
      case "daily":
        return "Daily Schedule";
      default:
        return "Plan";
    }
  };

  const filteredPlans = plans.filter((plan: any) => {
    if (!searchQuery || searchQuery.trim() === "") return true;
    const query = searchQuery.toLowerCase().trim();
    if (plan.year && plan.year.toString().includes(query)) return true;
    if (
      plan.month &&
      (monthDisplay[plan.month]?.toLowerCase().includes(query) ||
        plan.month.toLowerCase().includes(query))
    )
      return true;
    if (plan.preparedBy && plan.preparedBy.toLowerCase().includes(query))
      return true;
    return false;
  });

  const totalPages = Math.ceil(filteredPlans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayPlans = showAll
    ? filteredPlans.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    : filteredPlans.slice(0, 4);

  return (
    <View className="flex-1 mb-6 overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl">
      <View
        className="px-5 py-4 border-b"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="p-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
            >
              <Icon size={20} style={{ color: color.text }} />
            </View>
            <Text className="font-bold text-slate-800">{title}</Text>
          </View>
          <View
            className="px-3 py-1 rounded-full shadow-sm"
            style={{ backgroundColor: color.badge.bg }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: color.badge.text }}
            >
              {filteredPlans.length} {showAll ? "Total" : "Pending"}
            </Text>
          </View>
        </View>
      </View>

      {showAll && onSearchChange && (
        <View className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <View className="relative">
            <TextInput
              className="w-full px-4 py-2 pl-10 text-sm border rounded-lg border-slate-200 text-slate-800"
              value={searchQuery}
              onChangeText={(text) => {
                onSearchChange(text);
                if (onPageChange) onPageChange(1);
              }}
              placeholder={`Search by year, month, or prepared by...`}
            />
          </View>
        </View>
      )}

      <ScrollView style={{ maxHeight: showAll ? 500 : 280 }}>
        {filteredPlans.length === 0 ? (
          <View className="items-center p-8">
            <CheckCircle size={40} color="#cbd5e1" />
            <Text className="mt-3 text-sm font-medium text-slate-400">
              {searchQuery
                ? "No plans match your search"
                : `No ${getFormTypeLabel().toLowerCase()}s found`}
            </Text>
          </View>
        ) : (
          displayPlans.map((plan: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              className="p-4 border-b border-slate-100"
              onPress={() => onViewPlan(plan)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-800">
                    {plan.year
                      ? `${getFormTypeLabel()} ${plan.year}`
                      : plan.month
                        ? `${monthDisplay[plan.month] || plan.month} ${plan.year}`
                        : getFormTypeLabel()}
                  </Text>
                  {plan.preparedBy && (
                    <Text
                      className="mt-1 text-xs text-slate-500"
                      numberOfLines={1}
                    >
                      Prepared by: {plan.preparedBy}
                    </Text>
                  )}
                  {plan.scheduleCount && (
                    <Text className="mt-1 text-xs text-slate-500">
                      {plan.scheduleCount} schedule(s)
                    </Text>
                  )}
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {showAll && totalPages > 1 && (
        <View className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-600">
              Page {currentPage} of {totalPages} ({filteredPlans.length} total)
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border rounded-lg border-slate-200 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">
                  Previous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border rounded-lg border-slate-200 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!showAll && filteredPlans.length > 0 && (
        <View className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <TouchableOpacity
            onPress={() => onViewPlan(filteredPlans[0])}
            className="items-center"
          >
            <Text className="text-xs font-semibold text-slate-600">
              View All ({filteredPlans.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// DAILY SCHEDULE CARD
// ============================================================================
const DailyScheduleCard = ({
  title,
  icon: Icon,
  color,
  pendingPlans,
  approvedPlans,
  onViewPlan,
  onViewHistoryPlan,
  showAll = false,
  delay = 0,
  searchQuery = "",
  onSearchChange,
  currentPage = 1,
  onPageChange,
}: any) => {
  const totalMonths = pendingPlans.length + approvedPlans.length;

  const filterPlans = (plans: any[]) => {
    return plans.filter((plan: any) => {
      if (!searchQuery || searchQuery.trim() === "") return true;
      const query = searchQuery.toLowerCase().trim();
      if (plan.year && plan.year.toString().includes(query)) return true;
      if (
        plan.month &&
        (monthDisplay[plan.month]?.toLowerCase().includes(query) ||
          plan.month.toLowerCase().includes(query))
      )
        return true;
      if (plan.preparedBy && plan.preparedBy.toLowerCase().includes(query))
        return true;
      return false;
    });
  };

  const filteredPendingPlans = filterPlans(pendingPlans);
  const filteredApprovedPlans = filterPlans(approvedPlans);
  const allFilteredPlans = [...filteredPendingPlans, ...filteredApprovedPlans];

  const totalPages = Math.ceil(allFilteredPlans.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  let displayPending: any[] = [];
  let displayApproved: any[] = [];

  if (showAll) {
    const paginatedPlans = allFilteredPlans.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );
    displayPending = paginatedPlans.filter((p) =>
      filteredPendingPlans.includes(p),
    );
    displayApproved = paginatedPlans.filter((p) =>
      filteredApprovedPlans.includes(p),
    );
  } else {
    displayPending = filteredPendingPlans.slice(0, 3);
    displayApproved = filteredApprovedPlans.slice(0, 3);
  }

  const getStatusBadge = (plan: any) => {
    if (plan.isChangeRequested)
      return (
        <View className="px-2 py-0.5 bg-orange-100 rounded-full">
          <Text className="text-xs font-medium text-orange-700">
            Changes Requested
          </Text>
        </View>
      );
    if (plan.pendingCount > 0)
      return (
        <View className="px-2 py-0.5 bg-yellow-100 rounded-full">
          <Text className="text-xs font-medium text-yellow-700">
            {plan.pendingCount} pending
          </Text>
        </View>
      );
    if (plan.rejectedCount > 0)
      return (
        <View className="px-2 py-0.5 bg-red-100 rounded-full">
          <Text className="text-xs font-medium text-red-700">
            {plan.rejectedCount} rejected
          </Text>
        </View>
      );
    return null;
  };

  return (
    <View className="flex-1 mb-6 overflow-hidden bg-white border shadow-sm border-slate-200 rounded-2xl">
      <View
        className="px-5 py-4 border-b"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="p-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
            >
              <Icon size={20} style={{ color: color.text }} />
            </View>
            <Text className="font-bold text-slate-800">{title}</Text>
          </View>
          <View className="flex-row gap-2">
            {filteredPendingPlans.length > 0 && (
              <View
                className="px-3 py-1 rounded-full shadow-sm"
                style={{ backgroundColor: color.badge.bg }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: color.badge.text }}
                >
                  {filteredPendingPlans.length} Pending
                </Text>
              </View>
            )}
            {filteredApprovedPlans.length > 0 && (
              <View className="px-3 py-1 bg-green-100 rounded-full shadow-sm">
                <Text className="text-xs font-bold text-green-700">
                  {filteredApprovedPlans.length} History
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {showAll && onSearchChange && (
        <View className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <TextInput
            className="w-full px-4 py-2 text-sm border rounded-lg border-slate-200 text-slate-800"
            value={searchQuery}
            onChangeText={(text) => {
              onSearchChange(text);
              if (onPageChange) onPageChange(1);
            }}
            placeholder="Search by year, month, or prepared by..."
          />
        </View>
      )}

      <ScrollView style={{ maxHeight: showAll ? 500 : 280 }}>
        {displayPending.map((plan: any, idx: number) => (
          <TouchableOpacity
            key={`pending-${plan.year}-${plan.month}`}
            className="p-4 border-b border-slate-100"
            onPress={() => onViewPlan(plan, "pending")}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-sm font-semibold text-slate-800">
                    {monthDisplay[plan.month] || plan.month} {plan.year}
                  </Text>
                  {getStatusBadge(plan)}
                </View>
                <Text className="mt-1 text-xs text-slate-500">
                  Prepared by: {plan.preparedBy || "N/A"} •{" "}
                  {plan.scheduleCount || 0} schedule(s)
                </Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))}

        {displayApproved.map((plan: any, idx: number) => {
          const isRejected = plan.rejectedCount > 0;
          return (
            <TouchableOpacity
              key={`approved-${plan.year}-${plan.month}`}
              className={`p-4 border rounded-lg mx-2 my-2 ${
                isRejected
                  ? "bg-red-50 border-red-200"
                  : "bg-green-50 border-green-200"
              }`}
              onPress={() =>
                onViewHistoryPlan
                  ? onViewHistoryPlan(plan, "history")
                  : onViewPlan(plan, "history")
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-slate-800">
                      {monthDisplay[plan.month] || plan.month} {plan.year}
                    </Text>
                    {isRejected ? (
                      <View className="px-2 py-0.5 bg-red-100 rounded-full">
                        <Text className="text-xs font-medium text-red-700">
                          {plan.rejectedCount} rejected
                        </Text>
                      </View>
                    ) : (
                      <View className="px-2 py-0.5 bg-green-100 rounded-full">
                        <Text className="text-xs font-medium text-green-700">
                          {plan.approvedCount || plan.scheduleCount || 0}{" "}
                          approved
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-1 text-xs text-slate-500">
                    {plan.approvedBy &&
                      plan.approvedBy !== "Not approved yet" &&
                      `Approved by: ${plan.approvedBy} • `}
                    {plan.scheduleCount || 0} schedule(s)
                    {plan.approvedAt &&
                      ` • ${new Date(plan.approvedAt).toLocaleDateString()}`}
                  </Text>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredPendingPlans.length === 0 &&
          filteredApprovedPlans.length === 0 && (
            <View className="items-center p-8">
              <CheckCircle size={40} color="#cbd5e1" />
              <Text className="mt-3 text-sm font-medium text-slate-400">
                {searchQuery
                  ? "No schedules match your search"
                  : "No daily schedules found"}
              </Text>
            </View>
          )}
      </ScrollView>

      {showAll && totalPages > 1 && (
        <View className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-600">
              Page {currentPage} of {totalPages} ({allFilteredPlans.length}{" "}
              total)
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border rounded-lg border-slate-200 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">
                  Previous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border rounded-lg border-slate-200 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!showAll && totalMonths > 0 && (
        <View className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <TouchableOpacity
            onPress={() => {
              if (filteredPendingPlans.length > 0)
                onViewPlan(filteredPendingPlans[0], "pending");
              else if (filteredApprovedPlans.length > 0 && onViewHistoryPlan)
                onViewHistoryPlan(filteredApprovedPlans[0], "history");
            }}
            className="items-center"
          >
            <Text className="text-xs font-semibold text-teal-600">
              View All ({allFilteredPlans.length} months)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function TopManagementDashboard() {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isDesktop = width >= 768;
  const params = useLocalSearchParams();

  // ✅ FIXED: Single source of truth for tab routing (matches Audit Manager)
  const [activeSection, setActiveSection] = useState("overview");

  // ✅ FIXED: Listen for param changes and update activeSection
  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);

      const tabMap: Record<string, string> = {
        overview: "overview",
        annual: "annual",
        dept: "dept",
        week: "week",
        daily: "daily",
      };

      const normalizedTab = tabMap[tabValue] || "overview";
      setActiveSection(normalizedTab);
    } else {
      setActiveSection("overview"); // Default fallback
    }
  }, [params?.tab]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // ✅ STRICTLY USE AUTH CONTEXT (No default fallback data)
  const { user } = useAuth();

  // Annual Plan states
  const [pendingPlans, setPendingPlans] = useState<any[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [planApprovalComment, setPlanApprovalComment] = useState("");
  const [planRejectionReason, setPlanRejectionReason] = useState("");
  const [showPlanRejectModal, setShowPlanRejectModal] = useState(false);

  // Department Plan states
  const [pendingDeptPlans, setPendingDeptPlans] = useState<any[]>([]);
  const [approvedDeptPlans, setApprovedDeptPlans] = useState<any[]>([]);
  const [selectedDeptPlan, setSelectedDeptPlan] = useState<any>(null);
  const [showDeptPlanDetails, setShowDeptPlanDetails] = useState(false);
  const [deptApprovalComment, setDeptApprovalComment] = useState("");
  const [deptRejectionReason, setDeptRejectionReason] = useState("");
  const [showDeptRejectModal, setShowDeptRejectModal] = useState(false);

  // Week Schedule states
  const [pendingForm5Plans, setPendingForm5Plans] = useState<any[]>([]);
  const [approvedForm5Plans, setApprovedForm5Plans] = useState<any[]>([]);
  const [selectedForm5Plan, setSelectedForm5Plan] = useState<any>(null);
  const [showForm5Details, setShowForm5Details] = useState(false);
  const [form5RejectionReason, setForm5RejectionReason] = useState("");
  const [showForm5RejectModal, setShowForm5RejectModal] = useState(false);
  const [form5SchedulesDetail, setForm5SchedulesDetail] = useState<any[]>([]);
  const [form5ApprovalComment, setForm5ApprovalComment] = useState("");

  // Daily Schedule states
  const [allDetailedSchedules, setAllDetailedSchedules] = useState<any[]>([]);
  const [pendingDetailedPlans, setPendingDetailedPlans] = useState<any[]>([]);
  const [approvedDetailedPlans, setApprovedDetailedPlans] = useState<any[]>([]);
  const [selectedDetailedPlan, setSelectedDetailedPlan] = useState<any>(null);
  const [showDetailedDetails, setShowDetailedDetails] = useState(false);
  const [detailedRejectionReason, setDetailedRejectionReason] = useState("");
  const [showDetailedRejectModal, setShowDetailedRejectModal] = useState(false);
  const [detailedSchedulesList, setDetailedSchedulesList] = useState<any[]>([]);
  const [detailedAuditTypeFilter, setDetailedAuditTypeFilter] = useState("");
  const [detailedApprovalComment, setDetailedApprovalComment] = useState("");

  // Search and pagination states
  const [annualPendingSearchQuery, setAnnualPendingSearchQuery] = useState("");
  const [annualPendingCurrentPage, setAnnualPendingCurrentPage] = useState(1);
  const [annualApprovedSearchQuery, setAnnualApprovedSearchQuery] =
    useState("");
  const [annualApprovedCurrentPage, setAnnualApprovedCurrentPage] = useState(1);
  const [deptPendingSearchQuery, setDeptPendingSearchQuery] = useState("");
  const [deptPendingCurrentPage, setDeptPendingCurrentPage] = useState(1);
  const [deptApprovedSearchQuery, setDeptApprovedSearchQuery] = useState("");
  const [deptApprovedCurrentPage, setDeptApprovedCurrentPage] = useState(1);
  const [weekPendingSearchQuery, setWeekPendingSearchQuery] = useState("");
  const [weekPendingCurrentPage, setWeekPendingCurrentPage] = useState(1);
  const [weekApprovedSearchQuery, setWeekApprovedSearchQuery] = useState("");
  const [weekApprovedCurrentPage, setWeekApprovedCurrentPage] = useState(1);
  const [dailyPendingSearchQuery, setDailyPendingSearchQuery] = useState("");
  const [dailyPendingCurrentPage, setDailyPendingCurrentPage] = useState(1);
  const [dailyHistorySearchQuery, setDailyHistorySearchQuery] = useState("");
  const [dailyHistoryCurrentPage, setDailyHistoryCurrentPage] = useState(1);

  // Additional states
  const [submitting, setSubmitting] = useState(false);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
  const [selectedScheduleForAction, setSelectedScheduleForAction] =
    useState<any>(null);
  const [showScheduleRejectModal, setShowScheduleRejectModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [allMonthlyPlans, setAllMonthlyPlans] = useState<any[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [showScheduleApproveModal, setShowScheduleApproveModal] =
    useState(false);
  const [scheduleApprovalComment, setScheduleApprovalComment] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalAudits: 0,
    completedAudits: 0,
    pendingApproval: 0,
    approvedPlans: 0,
    pendingDeptApproval: 0,
    approvedDeptPlans: 0,
    pendingForm5Approval: 0,
    approvedForm5Plans: 0,
    pendingDetailedApproval: 0,
    approvedDetailedPlans: 0,
    overallCompletion: 0,
  });

  // Analytics data
  const [monthlyAuditData, setMonthlyAuditData] = useState<any[]>([]);
  const [approvalStatusData, setApprovalStatusData] = useState<any[]>([]);
  const [auditTypeDistribution, setAuditTypeDistribution] = useState<any[]>([]);
  const [completionTrendData, setCompletionTrendData] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);


  const pendingCounts = useMemo(
    () => ({
      annual: pendingPlans.length,
      dept: pendingDeptPlans.length,
      week: pendingForm5Plans.length,
      daily: pendingDetailedPlans.length,
    }),
    [pendingPlans, pendingDeptPlans, pendingForm5Plans, pendingDetailedPlans],
  );

  // ============================================================================
  // API CALLS
  // ============================================================================
  const fetchAllUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: "GET",
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      setAllUsersList(data || []);
      console.log(`✅ Fetched ${data.length} users for forum`);
    } else {
      console.error("Failed to fetch users:", response.status);
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    setAllUsersList([]);
  }
};
  const fetchAnnualPlans = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);

      let allPlans: any[] = [];
      for (const year of years) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/audit-plan/${year}`, {
            method: "GET",
            credentials: "include",
          });
          const data = await response.json();
          if (data && data.planItems && data.planItems.length > 0) {
            allPlans.push({
              year,
              ...data,
              approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
              preparedBy: data.preparedBy || data.preparedByName || "N/A",
              preparedAt:
                data.preparedAt || data.createdAt || new Date().toISOString(),
              planItems: data.planItems || [],
            });
          }
        } catch (err) {
          console.error(`Error fetching annual plan for year ${year}:`, err);
        }
      }

      const pending = allPlans.filter(
        (p) => p.approvalStatus === "PENDING_APPROVAL",
      );
      const approved = allPlans.filter((p) => p.approvalStatus === "APPROVED");

      setPendingPlans(pending);
      setApprovedPlans(approved);

      let totalPlanned = 0,
        totalCompleted = 0;
      approved.forEach((plan: any) => {
        plan.planItems?.forEach((item: any) => {
          item.months?.forEach((month: any) => {
            if (month?.status === "PLANNED") totalPlanned++;
            if (month?.status === "COMPLETED") totalCompleted++;
          });
        });
      });

      return { totalPlanned, totalCompleted, allPlans, pending, approved };
    } catch (error) {
      console.error("Error fetching annual plans:", error);
      return {
        totalPlanned: 0,
        totalCompleted: 0,
        allPlans: [],
        pending: [],
        approved: [],
      };
    }
  };

  const fetchDepartmentPlans = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);

      let allDeptPlans: any[] = [];
      for (const year of years) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/department-plan/${year}`, {
            method: "GET",
            credentials: "include",
          });
          const data = await response.json();
          if (data && data.planItems && data.planItems.length > 0)
            allDeptPlans.push({ year, ...data });
        } catch (err) {
          console.error(`Error fetching dept plan for year ${year}:`, err);
        }
      }

      const pending = allDeptPlans.filter(
        (p) => p.approvalStatus === "PENDING_APPROVAL",
      );
      const approved = allDeptPlans.filter(
        (p) => p.approvalStatus === "APPROVED",
      );

      setPendingDeptPlans(pending);
      setApprovedDeptPlans(approved);

      return {
        pendingCount: pending.length,
        approvedCount: approved.length,
        allPlans: allDeptPlans,
        pending,
        approved,
      };
    } catch (error) {
      console.error("Error fetching department plans:", error);
      return {
        pendingCount: 0,
        approvedCount: 0,
        allPlans: [],
        pending: [],
        approved: [],
      };
    }
  };

  const fetchForm5Plans = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 5; i <= currentYear + 5; i++) years.push(i);

      let allPendingApprovals: any[] = [];
      let allApproved: any[] = [];

      for (const year of years) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/audit-schedule/year/${year}`,
            {
              method: "GET",
              credentials: "include",
            },
          );
          const allSchedules = await response.json();
          const weekSchedules = allSchedules.filter(
            (s: any) => !s.scheduledDate,
          );

          if (weekSchedules.length > 0) {
            const monthMap = new Map();
            weekSchedules.forEach((schedule: any) => {
              const month = schedule.month;
              if (!monthMap.has(month)) {
                monthMap.set(month, {
                  year,
                  month,
                  approvalStatus: schedule.approvalStatus || "DRAFT",
                  preparedBy: schedule.preparedByName,
                  approvedBy: schedule.approvedByName,
                  approvedAt: schedule.approvedAt,
                  rejectionReason: schedule.rejectionReason,
                  leadAuditorId: schedule.leadAuditorId,
                  leadAuditorName: schedule.leadAuditorName,
                  scheduleCount: 0,
                  schedules: [],
                });
              }
              const monthData = monthMap.get(month);
              monthData.scheduleCount++;
              monthData.schedules.push(schedule);
            });

            for (const [month, monthData] of monthMap) {
              if (monthData.approvalStatus === "PENDING_APPROVAL")
                allPendingApprovals.push(monthData);
              else if (monthData.approvalStatus === "APPROVED")
                allApproved.push(monthData);
            }
          }
        } catch (err) {
          console.error(`Error fetching form 5 plan for year ${year}:`, err);
        }
      }

      setPendingForm5Plans(allPendingApprovals);
      setApprovedForm5Plans(allApproved);

      return {
        pendingCount: allPendingApprovals.length,
        approvedCount: allApproved.length,
        pending: allPendingApprovals,
        approved: allApproved,
      };
    } catch (error) {
      console.error("Error fetching Form 5 plans:", error);
      return { pendingCount: 0, approvedCount: 0, pending: [], approved: [] };
    }
  };

  const fetchDetailedPlans = useCallback(async () => {
    try {
      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      for (let i = currentYear - 5; i <= currentYear + 2; i++) years.push(i);

      let allDailySchedules: any[] = [];
      for (const year of years) {
        for (const month of monthOrder) {
          try {
            // ✅ FIX: Handle both cases — if API returns raw array OR AxiosResponse
            const response = await auditScheduleApi.getDateSchedulesByMonth(
              year,
              month as any,
            );
            const rawData = Array.isArray(response) ? response : response?.data;
            const schedules: any[] = Array.isArray(rawData) ? rawData : [];

            schedules.forEach((schedule: any) => {
              schedule.planYear = year;
              schedule.month = month;
              if (!schedule.preparedByName && schedule.preparedBy)
                schedule.preparedByName = schedule.preparedBy;
              if (!schedule.approvedByName && schedule.approvedBy)
                schedule.approvedByName = schedule.approvedBy;
              if (!schedule.detailedApprovalStatus && schedule.approvalStatus)
                schedule.detailedApprovalStatus = schedule.approvalStatus;
            });

            allDailySchedules.push(...schedules);
          } catch (err) {
            console.error(
              `Error fetching detailed plan for ${year} ${month}:`,
              err,
            );
          }
        }
      }

      setAllDetailedSchedules(allDailySchedules);

      // --- Grouping logic ---
      const monthMap = new Map<string, any>();
      allDailySchedules.forEach((schedule: any) => {
        const year = schedule.planYear;
        const month = schedule.month;
        const key = `${year}-${month}`;

        if (!monthMap.has(key)) {
          monthMap.set(key, {
            year,
            month,
            preparedBySet: new Set(),
            approvedBySet: new Set(),
            approvedAt: null,
            leadAuditorName: schedule.leadAuditorName,
            schedules: [],
          });
        }

        const monthData = monthMap.get(key);

        if (
          schedule.preparedBy &&
          schedule.preparedBy !== "N/A" &&
          schedule.preparedBy !== "null"
        )
          monthData.preparedBySet.add(schedule.preparedBy);
        else if (schedule.preparedByName && schedule.preparedByName !== "N/A")
          monthData.preparedBySet.add(schedule.preparedByName);

        if (
          schedule.approvedBy &&
          schedule.approvedBy !== "N/A" &&
          schedule.approvedBy !== "null"
        )
          monthData.approvedBySet.add(schedule.approvedBy);
        else if (schedule.approvedByName && schedule.approvedByName !== "N/A")
          monthData.approvedBySet.add(schedule.approvedByName);

        const approvalDate = schedule.approvedAt || schedule.approvedDate;
        if (
          approvalDate &&
          (!monthData.approvedAt ||
            new Date(approvalDate) > new Date(monthData.approvedAt))
        )
          monthData.approvedAt = approvalDate;

        monthData.schedules.push(schedule);
      });

      const pendingMonths: any[] = [];
      const approvedMonths: any[] = [];

      for (const [, monthData] of monthMap) {
        const schedules = monthData.schedules;
        const uniquePreparedBy = Array.from(monthData.preparedBySet);
        const uniqueApprovedBy = Array.from(monthData.approvedBySet);

        monthData.displayPreparedBy =
          uniquePreparedBy.length > 0
            ? uniquePreparedBy.join(", ")
            : "Not available";
        monthData.displayApprovedBy =
          uniqueApprovedBy.length > 0
            ? uniqueApprovedBy.join(", ")
            : "Not approved yet";

        const getStatus = (s: any) =>
          s.detailedApprovalStatus || s.approvalStatus || "DRAFT";

        const allApproved =
          schedules.length > 0 &&
          schedules.every((s: any) => getStatus(s) === "APPROVED");
        const hasPending = schedules.some(
          (s: any) => getStatus(s) === "PENDING_APPROVAL",
        );
        const hasChangeRequested = schedules.some(
          (s: any) => getStatus(s) === "CHANGE_REQUESTED",
        );
        const hasRejected = schedules.some(
          (s: any) => getStatus(s) === "REJECTED",
        );

        if (hasPending || hasChangeRequested) {
          pendingMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy,
            approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            pendingCount: schedules.filter(
              (s: any) => getStatus(s) === "PENDING_APPROVAL",
            ).length,
            changeRequestedCount: schedules.filter(
              (s: any) => getStatus(s) === "CHANGE_REQUESTED",
            ).length,
            isChangeRequested: hasChangeRequested,
            rejectedCount: schedules.filter(
              (s: any) => getStatus(s) === "REJECTED",
            ).length,
            schedules,
          });
        } else if (allApproved && schedules.length > 0) {
          approvedMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy,
            approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            approvedCount: schedules.length,
            approvedAt: monthData.approvedAt,
            schedules,
          });
        } else if (hasRejected) {
          approvedMonths.push({
            ...monthData,
            preparedBy: monthData.displayPreparedBy,
            approvedBy: monthData.displayApprovedBy,
            scheduleCount: schedules.length,
            rejectedCount: schedules.filter(
              (s: any) => getStatus(s) === "REJECTED",
            ).length,
            approvedCount: schedules.filter(
              (s: any) => getStatus(s) === "APPROVED",
            ).length,
            schedules,
          });
        }
      }

      setPendingDetailedPlans(pendingMonths);
      setApprovedDetailedPlans(approvedMonths);

      return {
        pendingCount: pendingMonths.length,
        approvedCount: approvedMonths.length,
        pending: pendingMonths,
        approved: approvedMonths,
        allSchedules: allDailySchedules,
      };
    } catch (error) {
      console.error("Error fetching detailed plans:", error);
      return {
        pendingCount: 0,
        approvedCount: 0,
        pending: [],
        approved: [],
        allSchedules: [],
      };
    }
  }, []);

  const prepareAnalyticsData = useCallback(
    (annualData: any, deptData: any, form5Data: any, detailedData: any) => {
      try {
        const now = new Date();
        const monthlyData = [];

        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthIndex = date.getMonth();
          const year = date.getFullYear();
          const monthAbbr =
            monthOrder[monthIndex >= 3 ? monthIndex - 3 : monthIndex + 9];
          const monthName = date.toLocaleString("default", { month: "short" });

          let planned = 0,
            completed = 0;

          annualData.approved.forEach((plan: any) => {
            if (plan.year === year && plan.planItems) {
              plan.planItems.forEach((item: any) => {
                if (item.months) {
                  item.months.forEach((month: any) => {
                    if (month.month === monthAbbr) {
                      if (month.status === "PLANNED") planned++;
                      if (month.status === "COMPLETED") completed++;
                    }
                  });
                }
              });
            }
          });

          detailedData.allSchedules.forEach((schedule: any) => {
            if (schedule.planYear === year && schedule.month === monthAbbr) {
              const status =
                schedule.detailedApprovalStatus || schedule.approvalStatus;
              if (status === "APPROVED") completed++;
              else if (
                status === "PENDING_APPROVAL" ||
                status === "CHANGE_REQUESTED"
              )
                planned++;
            }
          });

          monthlyData.push({
            name: `${monthName} ${year}`,
            month: monthAbbr,
            Planned: planned,
            Completed: completed,
            Total: planned + completed,
          });
        }

        setMonthlyAuditData(monthlyData);

        setApprovalStatusData([
          {
            name: "Annual Plans",
            Pending: annualData.pending.length,
            Approved: annualData.approved.length,
          },
          {
            name: "Dept Plans",
            Pending: deptData.pending.length,
            Approved: deptData.approved.length,
          },
          {
            name: "Week Schedules",
            Pending: form5Data.pending.length,
            Approved: form5Data.approved.length,
          },
          {
            name: "Daily Schedules",
            Pending: detailedData.pending.length,
            Approved: detailedData.approved.length,
          },
        ]);

        const auditTypeMap: Record<string, number> = {};
        detailedData.allSchedules.forEach((schedule: any) => {
          if (schedule.auditType)
            auditTypeMap[schedule.auditType] =
              (auditTypeMap[schedule.auditType] || 0) + 1;
          if (schedule.auditElements) {
            let elements: any[] = [];
            if (typeof schedule.auditElements === "string") {
              try {
                elements = JSON.parse(schedule.auditElements);
              } catch (e) {}
            } else if (Array.isArray(schedule.auditElements)) {
              elements = schedule.auditElements;
            }
            elements.forEach((el: any) => {
              if (el) auditTypeMap[el] = (auditTypeMap[el] || 0) + 1;
            });
          }
        });

        const auditTypeData = Object.entries(auditTypeMap)
          .map(([name, value]) => ({
            name: name.length > 20 ? name.substring(0, 18) + "..." : name,
            fullName: name,
            value,
          }))
          .sort((a, b) => b.value - a.value);

        setAuditTypeDistribution(auditTypeData);

        let cumulativeCompleted = 0;
        setCompletionTrendData(
          monthlyData.map((item: any) => {
            cumulativeCompleted += item.Completed;
            return { ...item, CumulativeCompleted: cumulativeCompleted };
          }),
        );
      } catch (error) {
        console.error("Error preparing analytics data:", error);
      }
    },
    [],
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [annualData, deptData, form5Data, detailedData] = await Promise.all(
        [
          fetchAnnualPlans(),
          fetchDepartmentPlans(),
          fetchForm5Plans(),
          fetchDetailedPlans(),
        ],
      );

      const statsData = {
        totalAudits: annualData.totalPlanned,
        completedAudits: annualData.totalCompleted,
        pendingApproval: annualData.pending.length,
        approvedPlans: annualData.approved.length,
        pendingDeptApproval: deptData.pending.length,
        approvedDeptPlans: deptData.approved.length,
        pendingForm5Approval: form5Data.pending.length,
        approvedForm5Plans: form5Data.approved.length,
        pendingDetailedApproval: detailedData.pending.length,
        approvedDetailedPlans: detailedData.approved.length,
        overallCompletion:
          annualData.totalPlanned > 0
            ? parseFloat(
                (
                  (annualData.totalCompleted / annualData.totalPlanned) *
                  100
                ).toFixed(1),
              )
            : 0,
      };

      setStats(statsData);
      prepareAnalyticsData(annualData, deptData, form5Data, detailedData);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  useEffect(() => {
      fetchAllUsers(); // ✅ ADD THIS
    fetchDashboardData();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleViewPlan = (plan: any) => {
    setSelectedPlan(plan);
    setPlanApprovalComment("");
    setPlanRejectionReason("");
    setShowPlanDetails(true);
  };

  const handleApprovePlan = async () => {
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-plan/${selectedPlan.year}/approve?userId=${user.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ comments: planApprovalComment }),
        },
      );
      if (response.ok) {
        toast.success(
          `Annual Audit Plan ${selectedPlan.year} approved successfully!`,
        );
        setShowPlanDetails(false);
        setSelectedPlan(null);
        setPlanApprovalComment("");
        fetchDashboardData();
      } else {
        throw new Error("Failed to approve plan");
      }
    } catch (error) {
      toast.error("Failed to approve plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!planRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-plan/${selectedPlan.year}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reason: planRejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Annual Audit Plan ${selectedPlan.year} rejected`);
        setShowPlanRejectModal(false);
        setShowPlanDetails(false);
        setSelectedPlan(null);
        setPlanRejectionReason("");
        fetchDashboardData();
      } else {
        throw new Error("Failed to reject plan");
      }
    } catch (error) {
      toast.error("Failed to reject plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDeptPlan = (plan: any) => {
    setSelectedDeptPlan(plan);
    setDeptRejectionReason("");
    setShowDeptPlanDetails(true);
  };

  const handleApproveDeptPlan = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/department-plan/${selectedDeptPlan.year}/approve?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ comments: "" }),
        },
      );
      if (response.ok) {
        toast.success(
          `Department Audit Plan ${selectedDeptPlan.year} approved successfully!`,
        );
        setShowDeptPlanDetails(false);
        setSelectedDeptPlan(null);
        fetchDashboardData();
      } else {
        throw new Error("Failed to approve department plan");
      }
    } catch (error) {
      toast.error("Failed to approve department plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectDeptPlan = async () => {
    if (!deptRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/department-plan/${selectedDeptPlan.year}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reason: deptRejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Department Audit Plan ${selectedDeptPlan.year} rejected`);
        setShowDeptRejectModal(false);
        setShowDeptPlanDetails(false);
        setSelectedDeptPlan(null);
        setDeptRejectionReason("");
        fetchDashboardData();
      } else {
        throw new Error("Failed to reject department plan");
      }
    } catch (error) {
      toast.error("Failed to reject department plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewForm5Plan = (plan: any) => {
    setSelectedForm5Plan(plan);
    setForm5SchedulesDetail(plan.schedules || []);
    setForm5RejectionReason("");
    setForm5ApprovalComment("");
    setShowForm5Details(true);
  };

  const handleApproveForm5Plan = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/approve?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ comments: form5ApprovalComment }),
        },
      );
      if (response.ok) {
        toast.success(
          `Week Schedule for ${selectedForm5Plan.month} approved successfully!`,
        );
        setShowForm5Details(false);
        setSelectedForm5Plan(null);
        setForm5ApprovalComment("");
        fetchDashboardData();
      } else {
        throw new Error("Failed to approve week schedule");
      }
    } catch (error) {
      toast.error("Failed to approve week schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectForm5Plan = async () => {
    if (!form5RejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-schedule/${selectedForm5Plan.year}/${selectedForm5Plan.month}/reject?userId=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reason: form5RejectionReason }),
        },
      );
      if (response.ok) {
        toast.info(`Week Schedule for ${selectedForm5Plan.month} rejected`);
        setShowForm5RejectModal(false);
        setShowForm5Details(false);
        setSelectedForm5Plan(null);
        setForm5RejectionReason("");
        fetchDashboardData();
      } else {
        throw new Error("Failed to reject week schedule");
      }
    } catch (error) {
      toast.error("Failed to reject week schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetailedPlan = (plan: any, tab: string = "pending") => {
    setSelectedDetailedPlan(plan);
    setDetailedSchedulesList(plan.schedules || []);
    const allMonths = [...pendingDetailedPlans, ...approvedDetailedPlans];
    setAllMonthlyPlans(allMonths);
    setCurrentMonthIndex(
      allMonths.findIndex(
        (m) => m.year === plan.year && m.month === plan.month,
      ) || 0,
    );

    const hasPendingSchedules = plan.schedules.some(
      (s: any) =>
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED",
    );
    setActiveTab(!hasPendingSchedules ? "history" : tab);

    setDetailedRejectionReason("");
    setDetailedAuditTypeFilter("");
    setDetailedApprovalComment("");
    setShowDetailedDetails(true);
  };

  const handleApproveSingleSchedule = (schedule: any) => {
    setSelectedScheduleForAction(schedule);
    setScheduleApprovalComment("");
    setShowScheduleApproveModal(true);
  };

  const handleConfirmApproveSingleSchedule = async () => {
    if (!selectedScheduleForAction) return;
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.approveSchedule(
        selectedScheduleForAction.id,
        user.id,
        scheduleApprovalComment,
      );
      toast.success("Schedule approved!");

      setDetailedSchedulesList((prevList) =>
        prevList.map((s) =>
          s.id === selectedScheduleForAction.id
            ? {
                ...s,
                detailedApprovalStatus: "APPROVED",
                approvedByName: user?.name,
                approvedBy: user?.name,
                approvedAt: new Date().toISOString(),
              }
            : s,
        ),
      );

      setShowScheduleApproveModal(false);
      setScheduleApprovalComment("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to approve schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSingleSchedule = async () => {
    if (!detailedRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.rejectSchedule(
        selectedScheduleForAction.id,
        user.id,
        detailedRejectionReason,
      );
      toast.success("Schedule rejected");

      setDetailedSchedulesList((prevList) =>
        prevList.map((s) =>
          s.id === selectedScheduleForAction.id
            ? {
                ...s,
                detailedApprovalStatus: "REJECTED",
                detailedRejectionReason: detailedRejectionReason,
                rejectedByName: user?.name,
                approvedByName: user?.name,
                approvedBy: user?.id,
              }
            : s,
        ),
      );

      setShowScheduleRejectModal(false);
      setDetailedRejectionReason("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to reject schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChangesForSchedule = async () => {
    if (!selectedScheduleForAction) return;
    if (!changeRequestReason.trim()) {
      toast.error("Please provide a reason for change request");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }
    setSubmitting(true);
    try {
      await auditScheduleApi.requestChanges(
        selectedScheduleForAction.id,
        user.id,
        changeRequestReason,
      );
      toast.success("Change request submitted");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      setSelectedScheduleForAction(null);
      fetchDetailedPlans();
    } catch (error) {
      toast.error("Failed to request changes");
    } finally {
      setSubmitting(false);
    }
  };

  const openAuditForum = (auditData: any) => {
  const memberEmails: string[] = [];
  
  // Add current user
  if (user?.email) memberEmails.push(user.email);
  
  // Try to find auditor by ID
  if (auditData.auditorId) {
    const auditor = allUsersList.find((u: any) => 
      Number(u.id) === Number(auditData.auditorId) ||
      String(u.id) === String(auditData.auditorId)
    );
    if (auditor?.email) {
      memberEmails.push(auditor.email);
      auditData.auditorName = auditor.name;
    }
  }
  
  // Try to find auditee by ID
  if (auditData.auditeeId) {
    const auditee = allUsersList.find((u: any) => 
      Number(u.id) === Number(auditData.auditeeId) ||
      String(u.id) === String(auditData.auditeeId)
    );
    if (auditee?.email) {
      memberEmails.push(auditee.email);
      auditData.auditeeName = auditee.name;
    }
  }
  
  // Add HOD
  if (auditData.hodEmail) memberEmails.push(auditData.hodEmail);
  
  // Add memberEmails
  if (auditData.memberEmails) {
    const emails = Array.isArray(auditData.memberEmails) 
      ? auditData.memberEmails 
      : [auditData.memberEmails];
    memberEmails.push(...emails);
  }
  
  // Remove duplicates
  auditData.memberEmails = [...new Set(memberEmails)];
  
  setSelectedAuditForForum(auditData);
  setShowForumModal(true);
};


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
            <CheckCircle size={12} color="#166534" />
            <Text className="text-xs text-green-700">Approved</Text>
          </View>
        );
      case "REJECTED":
        return (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-red-100 rounded-full">
            <X size={12} color="#e11d48" />
            <Text className="text-xs text-red-700">Rejected</Text>
          </View>
        );
      case "PENDING_APPROVAL":
        return (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
            <Clock size={12} color="#b45309" />
            <Text className="text-xs text-yellow-700">Pending</Text>
          </View>
        );
      case "CHANGE_REQUESTED":
        return (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
            <MessageSquare size={12} color="#ea580c" />
            <Text className="text-xs text-orange-700">Changes Requested</Text>
          </View>
        );
      default:
        return (
          <View className="px-2 py-1 bg-gray-100 rounded-full">
            <Text className="text-xs text-gray-600">Draft</Text>
          </View>
        );
    }
  };

  const doesScheduleMatchFilter = useCallback(
    (schedule: any, filterValue: string) => {
      if (!filterValue || filterValue.trim() === "") return true;
      const normalizedFilter = filterValue.toLowerCase().trim();

      if (
        schedule.auditType &&
        schedule.auditType.toLowerCase().includes(normalizedFilter)
      )
        return true;

      let elements: any[] = [];
      if (schedule.auditElements) {
        if (typeof schedule.auditElements === "string") {
          try {
            elements = JSON.parse(schedule.auditElements);
          } catch (e) {}
        } else if (Array.isArray(schedule.auditElements)) {
          elements = schedule.auditElements;
        }
      }

      return elements.some(
        (el: any) => el && String(el).toLowerCase().includes(normalizedFilter),
      );
    },
    [],
  );

  const handleBulkApproveByAuditType = async () => {
    const pendingSchedules = detailedSchedulesList.filter((s: any) => {
      const isPending =
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED";
      if (!isPending) return false;
      return doesScheduleMatchFilter(s, detailedAuditTypeFilter);
    });

    if (pendingSchedules.length === 0) {
      toast.warning("No pending schedules to approve");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    setSubmitting(true);
    const approvedIds = new Set(pendingSchedules.map((s: any) => s.id));
    let successCount = 0;
    const commentToUse = detailedApprovalComment || "";

    for (const schedule of pendingSchedules) {
      try {
        await auditScheduleApi.approveSchedule(
          schedule.id,
          user.id,
          commentToUse,
        );
        successCount++;
      } catch (error) {
        console.error("Failed to approve schedule", schedule.id, error);
      }
    }

    setDetailedSchedulesList((prevList: any[]) =>
      prevList.map((schedule: any) =>
        approvedIds.has(schedule.id)
          ? {
              ...schedule,
              detailedApprovalStatus: "APPROVED",
              approvedByName: user?.name,
              approvedBy: user?.name,
              approvedAt: new Date().toISOString(),
            }
          : schedule,
      ),
    );

    toast.success(`${successCount} schedule(s) approved!`);
    setDetailedApprovalComment("");

    const remainingPending = detailedSchedulesList.filter(
      (s: any) =>
        !approvedIds.has(s.id) &&
        (s.detailedApprovalStatus === "PENDING_APPROVAL" ||
          s.detailedApprovalStatus === "CHANGE_REQUESTED"),
    ).length;

    if (remainingPending === 0 && activeTab === "pending") {
      setActiveTab("history");
    }

    setTimeout(() => fetchDetailedPlans(), 1000);
    setSubmitting(false);
  };

  const handleBulkRejectByAuditType = async () => {
    if (!detailedRejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    if (!user?.id) {
      toast.error("User session missing. Please log in again.");
      return;
    }

    const pendingSchedules = detailedSchedulesList.filter((s: any) => {
      const isPending =
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED";
      if (!isPending) return false;
      return doesScheduleMatchFilter(s, detailedAuditTypeFilter);
    });

    if (pendingSchedules.length === 0) {
      toast.warning("No pending schedules to reject");
      return;
    }

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            `Reject ${pendingSchedules.length} pending schedule(s)?`,
          )
        : await new Promise<boolean>((resolve) =>
            Alert.alert(
              "Bulk Reject",
              `Reject ${pendingSchedules.length} pending schedule(s)?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "Reject",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            ),
          );

    if (!confirmed) return;

    setSubmitting(true);
    let rejectedCount = 0;
    const rejectedIds = new Set();
    const rejectionReason = detailedRejectionReason;

    for (const schedule of pendingSchedules) {
      try {
        await auditScheduleApi.rejectSchedule(
          schedule.id,
          user.id,
          rejectionReason,
        );
        rejectedCount++;
        rejectedIds.add(schedule.id);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Failed to reject schedule", schedule.id, error);
      }
    }

    setDetailedSchedulesList((prevList: any[]) =>
      prevList.map((schedule: any) =>
        rejectedIds.has(schedule.id)
          ? {
              ...schedule,
              detailedApprovalStatus: "REJECTED",
              detailedRejectionReason: rejectionReason,
              rejectedByName: user?.name,
              approvedByName: user?.name,
              approvedBy: user?.id,
            }
          : schedule,
      ),
    );

    toast.success(`${rejectedCount} schedule(s) rejected`);
    setShowDetailedRejectModal(false);
    setDetailedRejectionReason("");
    setTimeout(() => fetchDetailedPlans(), 1000);
    setSubmitting(false);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 font-medium text-slate-500">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  // Full-page view overrides
  if (activeSection === "form3") {
    return (
      <Form3View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")} // ✅ Goes back to Overview
      />
    );
  }
  if (activeSection === "form4") {
    return (
      <Form4View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")} // ✅ Goes back to Overview
      />
    );
  }
  if (activeSection === "form5") {
    return (
      <Form5View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")} // ✅ Goes back to Overview
      />
    );
  }
  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View className="w-full pt-4 pb-2 md:pt-6 md:pb-4">
          <View className="flex-col w-full gap-4 px-4 md:px-8 lg:px-16 md:max-w-7xl md:mx-auto md:flex-row md:items-center md:justify-between">
            <View className="flex-1">
              <Text className="text-xl font-bold md:text-3xl text-slate-800">
                {activeSection === "overview" && "Dashboard Overview"}
                {activeSection === "annual" && "Annual Audit Plans"}
                {activeSection === "dept" && "Department Audit Plans"}
                {activeSection === "week" && "Week Schedules"}
                {activeSection === "daily" && "Daily Schedules"}
              </Text>
              <Text className="mt-1 text-sm md:text-base text-slate-500">
                Welcome back,{" "}
                <Text className="font-semibold text-slate-700">
                  {user?.name}
                </Text>
              </Text>
            </View>
            <View className="flex-row items-center self-start gap-3 md:self-auto">
             <TouchableOpacity
  onPress={() => {
    // Find Audit Manager
    const auditManager = allUsersList.find((u: any) => 
      u.role?.toUpperCase().includes('AUDIT_MANAGER')
    );
    
    // Find Top Management
    const topManagement = allUsersList.find((u: any) => 
      u.role?.toUpperCase().includes('TOP_MANAGEMENT')
    );
    
    // Build member emails - ONLY Audit Manager and Top Management
    const memberEmails: string[] = [];
    if (auditManager?.email) memberEmails.push(auditManager.email);
    if (topManagement?.email && topManagement.email !== auditManager?.email) {
      memberEmails.push(topManagement.email);
    }
    
    // Add current user if they are either Audit Manager or Top Management
    if (user?.email && !memberEmails.includes(user.email)) {
      const userRole = user.role?.toUpperCase() || '';
      if (userRole.includes('AUDIT_MANAGER') || userRole.includes('TOP_MANAGEMENT')) {
        memberEmails.push(user.email);
      }
    }
    
    const forumData = {
      id: "general-forum", // ✅ Keep this static so messages persist
      auditNumber: "TOP-MGMT-FORUM",
      auditType: "Management Discussion",
      department: "Management",
      auditorId: auditManager?.id || user?.id,
      auditorName: auditManager?.name || user?.name || "Audit Manager",
      auditeeId: topManagement?.id,
      auditeeName: topManagement?.name || "Top Management",
      hodEmail: null,
      hodName: null,
      memberEmails: memberEmails,
      auditStatus: "ACTIVE",
      auditTitle: "Top Management Communication Forum"
    };
    
    // ✅ USE THE FUNCTION instead of inline code
    openAuditForum(forumData);
  }}
  className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm"
  style={{ backgroundColor: COLORS.primary }}
  activeOpacity={0.8}
>
  <MessageCircle size={18} color="#ffffff" />
  <Text className="text-sm font-semibold text-white">Forum</Text>
</TouchableOpacity>
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                className="flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm active:bg-slate-50 disabled:opacity-50"
                activeOpacity={0.7}
              >
                <RefreshCw size={18} color="#475569" />
                <Text className="text-sm font-semibold text-slate-700">
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content Views */}
        <View className="w-full px-4 pb-6 md:px-8 lg:px-16 md:max-w-7xl md:mx-auto">
          {activeSection === "overview" && (
            <View className="gap-4">
              {isDesktop ? (
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <KpiCard
                      title="Total Audits Planned"
                      value={stats.totalAudits}
                      icon={<Calendar />}
                      color={{ bg: "#eff6ff", text: "#00529B" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Completed Audits"
                      value={stats.completedAudits}
                      icon={<CheckCircle />}
                      color={{ bg: "#f0fdf4", text: "#166534" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Plans Pending"
                      value={
                        stats.pendingApproval +
                        stats.pendingDeptApproval +
                        stats.pendingForm5Approval +
                        stats.pendingDetailedApproval
                      }
                      icon={<Send />}
                      color={{ bg: "#fffbeb", text: "#b45309" }}
                      isDesktop={true}
                    />
                  </View>
                  <View className="flex-1">
                    <KpiCard
                      title="Completion Rate"
                      value={`${stats.overallCompletion}%`}
                      icon={<TrendingUp />}
                      color={{ bg: "#faf5ff", text: "#7e22ce" }}
                      isDesktop={true}
                    />
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <KpiCard
                        title="Total Audits Planned"
                        value={stats.totalAudits}
                        icon={<Calendar />}
                        color={{ bg: "#eff6ff", text: "#00529B" }}
                        isDesktop={false}
                      />
                    </View>
                    <View className="flex-1">
                      <KpiCard
                        title="Completed Audits"
                        value={stats.completedAudits}
                        icon={<CheckCircle />}
                        color={{ bg: "#f0fdf4", text: "#166534" }}
                        isDesktop={false}
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <KpiCard
                        title="Plans Pending"
                        value={
                          stats.pendingApproval +
                          stats.pendingDeptApproval +
                          stats.pendingForm5Approval +
                          stats.pendingDetailedApproval
                        }
                        icon={<Send />}
                        color={{ bg: "#fffbeb", text: "#b45309" }}
                        isDesktop={false}
                      />
                    </View>
                    <View className="flex-1">
                      <KpiCard
                        title="Completion Rate"
                        value={`${stats.overallCompletion}%`}
                        icon={<TrendingUp />}
                        color={{ bg: "#faf5ff", text: "#7e22ce" }}
                        isDesktop={false}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
                <NativeGroupedBarChart
                  data={monthlyAuditData}
                  title="Monthly Audit Trend"
                  subtitle="Planned vs Completed audits over the last 12 months"
                  keys={["Planned", "Completed"]}
                  colors={[COLORS.secondary, COLORS.primary]}
                />
                <NativeGroupedBarChart
                  data={approvalStatusData}
                  title="Approval Status"
                  subtitle="Pending vs Approved by plan type"
                  keys={["Pending", "Approved"]}
                  colors={[COLORS.light, COLORS.primary]}
                />
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
                <NativePieChart
                  data={auditTypeDistribution}
                  title="Audit Type Distribution"
                  subtitle="Breakdown of audits by type"
                  total={auditTypeDistribution.reduce(
                    (sum, d) => sum + d.value,
                    0,
                  )}
                />
                <NativeGroupedBarChart
                  data={completionTrendData}
                  title="Cumulative Completion"
                  subtitle="Running total of completed audits over time"
                  keys={["CumulativeCompleted"]}
                  colors={[COLORS.primary]}
                />
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4`}>
                <View className="flex-1 p-4 bg-white border rounded-2xl border-slate-200">
                  <Text className="mb-3 font-bold text-slate-800">
                    Approved Plans Summary
                  </Text>
                  {isDesktop ? (
                    <View className="flex-row gap-4">
                      <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Annual
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedPlans.length}
                        </Text>
                      </View>
                      <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Department
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedDeptPlans.length}
                        </Text>
                      </View>
                      <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Week
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedForm5Plans.length}
                        </Text>
                      </View>
                      <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Daily
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedDetailedPlans.length}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="gap-3">
                      <View className="flex-row gap-3">
                        <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Annual
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedPlans.length}
                          </Text>
                        </View>
                        <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Department
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedDeptPlans.length}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-3">
                        <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Week
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedForm5Plans.length}
                          </Text>
                        </View>
                        <View className="flex-1 p-3 bg-white border rounded-2xl border-slate-200">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Daily
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedDetailedPlans.length}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4`}>
                <View className="flex-1 p-5 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View className="flex-row items-center gap-3 mb-4">
                    <View className="p-2.5 rounded-xl bg-indigo-50">
                      <TrendingUp size={20} color="#4f46e5" />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">
                        Management Review
                      </Text>
                      <Text className="text-xs text-slate-500">
                        High-level audit oversight
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 p-3 rounded-lg bg-slate-50">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        Pending Actions
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-amber-600">
                        {stats.pendingApproval +
                          stats.pendingDeptApproval +
                          stats.pendingForm5Approval +
                          stats.pendingDetailedApproval}
                      </Text>
                    </View>
                    <View className="flex-1 p-3 rounded-lg bg-slate-50">
                      <Text className="text-[10px] font-semibold text-slate-500 uppercase">
                        Completion
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-green-600">
                        {stats.overallCompletion}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-1 p-5 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <Text className="mb-4 text-base font-bold text-slate-800">
                    Audit Plans
                  </Text>
                  <View
                    className={`${isDesktop ? "flex-row" : "flex-col"} gap-3`}
                  >
                    {/* ✅ Annual Plan -> Opens Form3View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form3")}
                      className="items-center justify-center flex-1 p-3 rounded-xl bg-blue-50 active:bg-blue-100"
                    >
                      <FileText
                        size={18}
                        color="#1d4ed8"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-blue-700">
                        Annual Plan
                      </Text>
                    </TouchableOpacity>

                    {/* ✅ Dept Plan -> Opens Form4View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form4")}
                      className="items-center justify-center flex-1 p-3 rounded-xl bg-green-50 active:bg-green-100"
                    >
                      <List
                        size={18}
                        color="#15803d"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-green-700">
                        Dept Plan
                      </Text>
                    </TouchableOpacity>

                    {/* ✅ Week Schedule -> Opens Form5View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form5")}
                      className="items-center justify-center flex-1 p-3 rounded-xl bg-indigo-50 active:bg-indigo-100"
                    >
                      <Calendar
                        size={18}
                        color="#4338ca"
                        style={{ marginBottom: 4 }}
                      />
                      <Text className="text-sm font-bold text-indigo-700">
                        Week Schedule
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeSection === "annual" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Annual Plans"
                icon={FileText}
                color={{
                  bg: "#eff6ff",
                  border: "#bfdbfe",
                  text: "#00529B",
                  badge: { bg: "#dbeafe", text: "#1e3a8a" },
                }}
                plans={pendingPlans}
                onViewPlan={handleViewPlan}
                formType="annual"
                showAll={true}
                delay={0}
                searchQuery={annualPendingSearchQuery}
                onSearchChange={setAnnualPendingSearchQuery}
                currentPage={annualPendingCurrentPage}
                onPageChange={setAnnualPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Annual Plans"
                icon={CheckCircle}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={approvedPlans}
                onViewPlan={handleViewPlan}
                formType="annual"
                showAll={true}
                delay={100}
                searchQuery={annualApprovedSearchQuery}
                onSearchChange={setAnnualApprovedSearchQuery}
                currentPage={annualApprovedCurrentPage}
                onPageChange={setAnnualApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "dept" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Department Plans"
                icon={List}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={pendingDeptPlans}
                onViewPlan={handleViewDeptPlan}
                formType="dept"
                showAll={true}
                delay={0}
                searchQuery={deptPendingSearchQuery}
                onSearchChange={setDeptPendingSearchQuery}
                currentPage={deptPendingCurrentPage}
                onPageChange={setDeptPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Department Plans"
                icon={CheckCircle}
                color={{
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                  text: "#166534",
                  badge: { bg: "#dcfce7", text: "#14532d" },
                }}
                plans={approvedDeptPlans}
                onViewPlan={handleViewDeptPlan}
                formType="dept"
                showAll={true}
                delay={100}
                searchQuery={deptApprovedSearchQuery}
                onSearchChange={setDeptApprovedSearchQuery}
                currentPage={deptApprovedCurrentPage}
                onPageChange={setDeptApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "week" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <PlanSectionCard
                title="Pending Week Schedules"
                icon={Calendar}
                color={{
                  bg: "#eef2ff",
                  border: "#c7d2fe",
                  text: "#3730a3",
                  badge: { bg: "#e0e7ff", text: "#312e81" },
                }}
                plans={pendingForm5Plans}
                onViewPlan={handleViewForm5Plan}
                formType="week"
                showAll={true}
                delay={0}
                searchQuery={weekPendingSearchQuery}
                onSearchChange={setWeekPendingSearchQuery}
                currentPage={weekPendingCurrentPage}
                onPageChange={setWeekPendingCurrentPage}
              />
              <PlanSectionCard
                title="Approved Week Schedules"
                icon={CheckCircle}
                color={{
                  bg: "#eef2ff",
                  border: "#c7d2fe",
                  text: "#3730a3",
                  badge: { bg: "#e0e7ff", text: "#312e81" },
                }}
                plans={approvedForm5Plans}
                onViewPlan={handleViewForm5Plan}
                formType="week"
                showAll={true}
                delay={100}
                searchQuery={weekApprovedSearchQuery}
                onSearchChange={setWeekApprovedSearchQuery}
                currentPage={weekApprovedCurrentPage}
                onPageChange={setWeekApprovedCurrentPage}
              />
            </View>
          )}

          {activeSection === "daily" && (
            <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
              <DailyScheduleCard
                title="Pending Daily Schedules"
                icon={Clock}
                color={{
                  bg: "#f0fdfa",
                  border: "#99f6e4",
                  text: "#0f766e",
                  badge: { bg: "#ccfbf1", text: "#115e59" },
                }}
                pendingPlans={pendingDetailedPlans}
                approvedPlans={[]}
                onViewPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab)
                }
                onViewHistoryPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab || "history")
                }
                showAll={true}
                delay={0}
                searchQuery={dailyPendingSearchQuery}
                onSearchChange={setDailyPendingSearchQuery}
                currentPage={dailyPendingCurrentPage}
                onPageChange={setDailyPendingCurrentPage}
              />
              <DailyScheduleCard
                title="Approved/History Daily Schedules"
                icon={Archive}
                color={{
                  bg: "#f0fdfa",
                  border: "#99f6e4",
                  text: "#0f766e",
                  badge: { bg: "#ccfbf1", text: "#115e59" },
                }}
                pendingPlans={[]}
                approvedPlans={approvedDetailedPlans}
                onViewPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab)
                }
                onViewHistoryPlan={(plan: any, tab: string) =>
                  handleViewDetailedPlan(plan, tab || "history")
                }
                showAll={true}
                delay={100}
                searchQuery={dailyHistorySearchQuery}
                onSearchChange={setDailyHistorySearchQuery}
                currentPage={dailyHistoryCurrentPage}
                onPageChange={setDailyHistoryCurrentPage}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <RejectModal
        isOpen={showPlanRejectModal}
        onClose={() => {
          setShowPlanRejectModal(false);
          setPlanRejectionReason("");
        }}
        onConfirm={handleRejectPlan}
        year={selectedPlan?.year}
        rejectionReason={planRejectionReason}
        setRejectionReason={setPlanRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showDeptRejectModal}
        onClose={() => {
          setShowDeptRejectModal(false);
          setDeptRejectionReason("");
        }}
        onConfirm={handleRejectDeptPlan}
        year={selectedDeptPlan?.year}
        rejectionReason={deptRejectionReason}
        setRejectionReason={setDeptRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showForm5RejectModal}
        onClose={() => {
          setShowForm5RejectModal(false);
          setForm5RejectionReason("");
        }}
        onConfirm={handleRejectForm5Plan}
        year={selectedForm5Plan?.year}
        rejectionReason={form5RejectionReason}
        setRejectionReason={setForm5RejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showScheduleRejectModal}
        onClose={() => {
          setShowScheduleRejectModal(false);
          setDetailedRejectionReason("");
          setSelectedScheduleForAction(null);
        }}
        onConfirm={handleRejectSingleSchedule}
        year={selectedScheduleForAction?.scheduledDate}
        rejectionReason={detailedRejectionReason}
        setRejectionReason={setDetailedRejectionReason}
        submitting={submitting}
      />
      <RejectModal
        isOpen={showDetailedRejectModal}
        onClose={() => {
          setShowDetailedRejectModal(false);
          setDetailedRejectionReason("");
        }}
        onConfirm={handleBulkRejectByAuditType}
        year="Pending Schedules"
        rejectionReason={detailedRejectionReason}
        setRejectionReason={setDetailedRejectionReason}
        submitting={submitting}
      />

      {showScheduleApproveModal && selectedScheduleForAction && (
        <Modal visible={true} transparent animationType="fade">
          <View className="items-center justify-center flex-1 p-4 bg-black/50">
            <View className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl">
              <Text className="mb-2 text-xl font-bold text-slate-800">
                Approve Schedule
              </Text>
              <Text className="mb-4 text-sm text-slate-600">
                Approve schedule for{" "}
                {selectedScheduleForAction.scheduledDate ||
                  selectedScheduleForAction.fromDate ||
                  "this date"}
                ?
              </Text>
              <Text className="mb-2 text-sm font-bold text-slate-700">
                Comments (Optional)
              </Text>
              <TextInput
                value={scheduleApprovalComment}
                onChangeText={setScheduleApprovalComment}
                multiline
                numberOfLines={3}
                className="w-full p-3 mb-4 text-sm bg-white border rounded-lg border-slate-200 text-slate-800"
                placeholder="Add any comments for approval..."
                textAlignVertical="top"
              />
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowScheduleApproveModal(false);
                    setScheduleApprovalComment("");
                    setSelectedScheduleForAction(null);
                  }}
                  className="px-4 py-2 font-medium border rounded-lg border-slate-200"
                >
                  <Text className="text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmApproveSingleSchedule}
                  disabled={submitting}
                  className="px-4 py-2 font-medium text-white bg-green-600 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white">Confirm Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showChangeRequestModal && selectedScheduleForAction && (
        <Modal visible={true} transparent animationType="fade">
          <View className="items-center justify-center flex-1 p-4 bg-black/50">
            <View className="w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl">
              <Text className="mb-2 text-xl font-bold text-slate-800">
                Request Changes
              </Text>
              <Text className="mb-4 text-sm text-slate-600">
                Request changes for schedule on{" "}
                {selectedScheduleForAction.scheduledDate ||
                  selectedScheduleForAction.fromDate ||
                  "this date"}
                ?
              </Text>
              <Text className="mb-2 text-sm font-bold text-slate-700">
                Reason for Changes *
              </Text>
              <TextInput
                value={changeRequestReason}
                onChangeText={setChangeRequestReason}
                multiline
                numberOfLines={3}
                className="w-full p-3 mb-4 text-sm bg-white border rounded-lg border-slate-200 text-slate-800"
                placeholder="Describe what changes are needed..."
                textAlignVertical="top"
              />
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowChangeRequestModal(false);
                    setChangeRequestReason("");
                    setSelectedScheduleForAction(null);
                  }}
                  className="px-4 py-2 font-medium border rounded-lg border-slate-200"
                >
                  <Text className="text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRequestChangesForSchedule}
                  disabled={submitting}
                  className="px-4 py-2 font-medium text-white bg-orange-600 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white">Request Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showPlanDetails && selectedPlan && (
        <PlanDetailsModal
          selectedPlan={selectedPlan}
          onClose={() => {
            setShowPlanDetails(false);
            setSelectedPlan(null);
            setPlanApprovalComment("");
          }}
          onApprove={handleApprovePlan}
          onReject={() => {
            setShowPlanDetails(false);
            setShowPlanRejectModal(true);
          }}
          approvalComment={planApprovalComment}
          setApprovalComment={setPlanApprovalComment}
          submitting={submitting}
        />
      )}

      {showDeptPlanDetails && selectedDeptPlan && (
        <DeptPlanDetailsModal
          selectedPlan={selectedDeptPlan}
          onClose={() => {
            setShowDeptPlanDetails(false);
            setSelectedDeptPlan(null);
            setDeptApprovalComment("");
          }}
          onApprove={handleApproveDeptPlan}
          onReject={() => {
            setShowDeptPlanDetails(false);
            setShowDeptRejectModal(true);
          }}
          approvalComment={deptApprovalComment}
          setApprovalComment={setDeptApprovalComment}
          submitting={submitting}
        />
      )}

     {showForumModal && selectedAuditForForum && (
  <AuditCheckSheetNCRForumModal
    isOpen={showForumModal}
    onClose={() => {
      setShowForumModal(false);
      setSelectedAuditForForum(null);
    }}
    auditId={selectedAuditForForum.id || selectedAuditForForum.auditId || "demo"}
    auditNumber={selectedAuditForForum.auditNumber || "AUD-001"}
    auditTitle={selectedAuditForForum.auditTitle || selectedAuditForForum.auditType || "Audit Discussion"}
    auditStatus={selectedAuditForForum.auditStatus || "IN_PROGRESS"}
    auditType={selectedAuditForForum.auditType || "System Audit"}
    department={selectedAuditForForum.department || "Quality"}
    auditorId={selectedAuditForForum.auditorId || user?.id}
    auditorName={selectedAuditForForum.auditorName || user?.name || user?.email || "Unknown"}
    auditeeId={selectedAuditForForum.auditeeId}
    auditeeName={selectedAuditForForum.auditeeName}
    hodEmail={selectedAuditForForum.hodEmail}
    hodName={selectedAuditForForum.hodName}
    memberEmails={selectedAuditForForum.memberEmails || []}
    currentUser={user}
    allUsers={allUsersList} // ✅ PASS THE ACTUAL USERS LIST - THIS IS THE KEY FIX
  />
)}




      {showForm5Details && selectedForm5Plan && (
        <Modal visible={true} transparent animationType="fade">
          <View className="items-center justify-center flex-1 p-4 bg-black/50">
            <View
              className={`bg-white shadow-2xl rounded-2xl overflow-hidden ${isDesktop ? "w-full max-w-6xl max-h-[100%]" : "w-full flex-1 max-h-[92%]"}`}
            >
              <View className="flex-row items-center justify-between flex-shrink-0 p-4 bg-white border-b border-slate-200">
                <View className="flex-1 pr-4">
                  <Text
                    className="text-base font-bold md:text-xl text-slate-800"
                    numberOfLines={2}
                  >
                    Week Schedule - {monthDisplay[selectedForm5Plan.month]}{" "}
                    {selectedForm5Plan.year}
                  </Text>
                  {selectedForm5Plan.leadAuditorName && (
                    <Text
                      className="mt-1 text-xs text-slate-500"
                      numberOfLines={1}
                    >
                      Lead Auditor: {selectedForm5Plan.leadAuditorName}
                    </Text>
                  )}
                  <Text className="text-xs text-slate-500">
                    Prepared by: {selectedForm5Plan.preparedBy || "N/A"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowForm5Details(false)}
                  className="p-2 rounded-lg bg-slate-100"
                >
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="flex-1 bg-slate-50"
                showsVerticalScrollIndicator={false}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  className="m-2 bg-white border rounded-lg border-slate-200"
                >
                  <View style={{ minWidth: isDesktop ? 1130 : 750 }}>
                    <View className="flex-row border-b bg-slate-50 border-slate-200">
                      <View
                        style={{ width: isDesktop ? 150 : 120 }}
                        className="px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-center text-slate-600 uppercase">
                          Department
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 120 : 70 }}
                        className="justify-center px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase text-center">
                          Week
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 120 : 100 }}
                        className="px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">
                          Elements
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 180 : 130 }}
                        className="px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">
                          Lead Auditor
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 180 : 120 }}
                        className="px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">
                          Team
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 180 : 120 }}
                        className="px-2 py-3 border-r border-slate-200"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase">
                          Auditees
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 100 : 100 }}
                        className="justify-center px-2 py-3"
                      >
                        <Text className="text-[10px] md:text-[11px] font-bold text-slate-600 uppercase text-center">
                          Status
                        </Text>
                      </View>
                    </View>
                    {form5SchedulesDetail.map((schedule: any, idx: number) => {
                      let teamAuditorNames =
                        typeof schedule.teamAuditorNames === "string"
                          ? (() => {
                              try {
                                return JSON.parse(schedule.teamAuditorNames);
                              } catch (e) {
                                return [];
                              }
                            })()
                          : Array.isArray(schedule.teamAuditorNames)
                            ? schedule.teamAuditorNames
                            : [];

                      if (
                        teamAuditorNames.length === 0 &&
                        schedule.coAuditorNames
                      ) {
                        teamAuditorNames =
                          typeof schedule.coAuditorNames === "string"
                            ? (() => {
                                try {
                                  return JSON.parse(schedule.coAuditorNames);
                                } catch (e) {
                                  return [];
                                }
                              })()
                            : Array.isArray(schedule.coAuditorNames)
                              ? schedule.coAuditorNames
                              : [];
                      }

                      let auditeeNames =
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

                      const leadAuditorName =
                        schedule.leadAuditorName || schedule.auditorName || "-";

                      const renderElements = () => {
                        if (!schedule.auditElements)
                          return (
                            <Text className="px-2 py-3 text-xs text-slate-400">
                              -
                            </Text>
                          );
                        if (typeof schedule.auditElements === "string") {
                          try {
                            const parsed = JSON.parse(schedule.auditElements);
                            return parsed.map((el: string, i: number) => (
                              <View
                                key={i}
                                className="px-1.5 py-0.5 bg-blue-100 rounded mr-1 mb-1"
                              >
                                <Text className="text-[14px] md:text-[14px] font-medium text-blue-700">
                                  {getAuditElementCode(String(el))}
                                </Text>
                              </View>
                            ));
                          } catch (e) {
                            return (
                              <Text className="px-2 py-3 text-xs text-slate-600">
                                {String(schedule.auditElements).substring(0, 3)}
                              </Text>
                            );
                          }
                        }
                        if (Array.isArray(schedule.auditElements)) {
                          return schedule.auditElements.map(
                            (el: string, i: number) => (
                              <View
                                key={i}
                                className="px-1.5 py-0.5 bg-blue-100 rounded mr-1 mb-1"
                              >
                                <Text className="text-[18px] md:text-[14px] font-medium text-blue-700">
                                  {getAuditElementCode(String(el))}
                                </Text>
                              </View>
                            ),
                          );
                        }
                        return (
                          <Text className="px-2 py-3 text-xs text-slate-400">
                            -
                          </Text>
                        );
                      };

                      return (
                        <View
                          key={idx}
                          className="flex-row bg-white border-b border-slate-100"
                        >
                          <View
                            style={{ width: isDesktop ? 150 : 120 }}
                            className="px-2 py-3 border-r border-slate-100"
                          >
                            <Text
                              className="text-xs font-medium text-center md:text-sm text-slate-800"
                              numberOfLines={2}
                            >
                              {schedule.department || "-"}
                            </Text>
                          </View>
                          <View
                            style={{ width: isDesktop ? 120 : 70 }}
                            className="px-2 py-3 border-r border-slate-100"
                          >
                            <Text className="text-xs text-center md:text-sm text-slate-800">
                              {schedule.week || "-"}
                            </Text>
                          </View>
                          <View
                            style={{ width: isDesktop ? 120 : 100 }}
                            className="flex-row flex-wrap px-2 py-3 border-r border-slate-100"
                          >
                            {renderElements()}
                          </View>
                          <View
                            style={{ width: isDesktop ? 180 : 130 }}
                            className="px-2 py-3 border-r border-slate-100"
                          >
                            <Text
                              className="text-xs font-medium md:text-sm text-slate-800"
                              numberOfLines={2}
                            >
                              {leadAuditorName}
                            </Text>
                          </View>
                          <View
                            style={{ width: isDesktop ? 180 : 120 }}
                            className="flex-row flex-wrap px-2 py-3 border-r border-slate-100"
                          >
                            {teamAuditorNames.length > 0 ? (
                              teamAuditorNames.map(
                                (name: string, i: number) => (
                                  <View
                                    key={i}
                                    className="px-1.5 py-0.5 bg-indigo-100 rounded mr-1 mb-1"
                                  >
                                    <Text
                                      className="text-[14px] md:text-[14px] text-indigo-700 text-center"
                                      numberOfLines={1}
                                    >
                                      {name}
                                    </Text>
                                  </View>
                                ),
                              )
                            ) : (
                              <Text className="w-full text-xs text-center text-slate-400">
                                -
                              </Text>
                            )}
                          </View>
                          <View
                            style={{ width: isDesktop ? 180 : 120 }}
                            className="flex-row flex-wrap px-2 py-3 border-r border-slate-100"
                          >
                            {auditeeNames.length > 0 ? (
                              auditeeNames.map((name: string, i: number) => (
                                <View
                                  key={i}
                                  className="px-1.5 py-0.5 bg-green-100 rounded mr-1 mb-1"
                                >
                                  <Text
                                    className="text-[12px] md:text-[12px] text-green-700 text-center"
                                    numberOfLines={1}
                                  >
                                    {name}
                                  </Text>
                                </View>
                              ))
                            ) : (
                              <Text className="w-full text-xs text-center text-slate-400">
                                -
                              </Text>
                            )}
                          </View>
                          <View
                            style={{ width: isDesktop ? 100 : 100 }}
                            className="justify-center px-2 py-3"
                          >
                            <View className="self-center px-2 py-1 bg-yellow-100 rounded-full">
                              <Text className="text-[9px] md:text-[10px] font-bold text-yellow-700 text-center">
                                {schedule.status || "SCHEDULED"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                <View className="p-3 m-2 border rounded-lg bg-slate-50 border-slate-100">
                  <Text className="mb-1 text-xs font-bold text-slate-600">
                    Legend - Audit Elements codes:
                  </Text>
                  <View className="flex-row flex-wrap gap-x-2 gap-y-1">
                    <Text className="text-[10px] text-slate-500">
                      A - System Audit (ISO9001)
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      B - System Audit (IATF16949)
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      C - 5S Audit
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      D - Process Audit
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      E - Product Audit
                    </Text>
                  </View>
                </View>
                {selectedForm5Plan.approvalStatus !== "APPROVED" ? (
                  <View className="px-6 pt-2 pb-6">
                    <View className="mb-4">
                      <Text className="mb-2 text-sm font-bold text-slate-700">
                        Approval Comments (Optional)
                      </Text>
                      <TextInput
                        className="w-full p-3 text-sm bg-white border rounded-lg border-slate-200 text-slate-800"
                        multiline
                        numberOfLines={2}
                        value={form5ApprovalComment}
                        onChangeText={setForm5ApprovalComment}
                        placeholder="Add any comments for approval..."
                      />
                    </View>
                    <View className="flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <TouchableOpacity
                        onPress={() => setShowForm5RejectModal(true)}
                        className="flex-row items-center justify-center gap-2 px-5 py-2.5 bg-red-600 rounded-lg shadow-sm active:bg-red-700"
                      >
                        <X size={16} color="#FFF" />
                        <Text className="font-medium text-white">Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleApproveForm5Plan}
                        disabled={submitting}
                        className="flex-row items-center justify-center gap-2 px-5 py-2.5 bg-green-600 rounded-lg shadow-sm active:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Check size={16} color="#FFF" />
                        )}
                        <Text className="font-medium text-white">Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center p-4 mx-6 mb-6 border border-green-200 rounded-lg bg-green-50">
                    <CheckCircle size={20} color="#166534" />
                    <Text className="ml-2 font-semibold text-green-700">
                      This week schedule has already been approved.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {showDetailedDetails &&
        selectedDetailedPlan &&
        (() => {
          const filteredPending = detailedSchedulesList.filter((s: any) => {
            const isPending =
              s.detailedApprovalStatus === "PENDING_APPROVAL" ||
              s.detailedApprovalStatus === "CHANGE_REQUESTED";
            if (!isPending) return false;
            if (!detailedAuditTypeFilter.trim()) return true;
            const filter = detailedAuditTypeFilter.toLowerCase();
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

          return (
            <Modal visible={true} transparent animationType="slide">
              <View className="items-center justify-center flex-1 p-4 bg-black/50">
                <View className="w-full max-w-6xl bg-white shadow-2xl rounded-2xl flex-1 max-h-[90%]">
                  <View className="p-6 border-b border-slate-100">
                    <View className="flex-row items-center justify-between mb-4">
                      <View>
                        <Text className="text-xl font-bold text-slate-800">
                          Daily Schedule -{" "}
                          {monthDisplay[selectedDetailedPlan.month]}{" "}
                          {selectedDetailedPlan.year}
                        </Text>
                        {selectedDetailedPlan.leadAuditorName && (
                          <Text className="mt-1 text-sm text-slate-500">
                            Lead Auditor: {selectedDetailedPlan.leadAuditorName}
                          </Text>
                        )}
                        <Text className="text-sm text-slate-500">
                          Prepared by:{" "}
                          {selectedDetailedPlan.preparedBy || "N/A"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowDetailedDetails(false)}
                        className="p-2 rounded-lg bg-slate-100"
                      >
                        <X size={20} color="#475569" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row border-b border-slate-200">
                      <TouchableOpacity
                        onPress={() => setActiveTab("pending")}
                        className={`py-2 px-3 ${activeTab === "pending" ? "border-b-2 border-teal-600" : ""}`}
                      >
                        <View className="flex-row items-center gap-2">
                          <Clock
                            size={16}
                            color={
                              activeTab === "pending" ? "#0d9488" : "#64748b"
                            }
                          />
                          <Text
                            className={`font-medium ${activeTab === "pending" ? "text-teal-600" : "text-slate-500"}`}
                          >
                            Pending Approval ({filteredPending.length})
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setActiveTab("history")}
                        className={`py-2 px-3 ${activeTab === "history" ? "border-b-2 border-teal-600" : ""}`}
                      >
                        <View className="flex-row items-center gap-2">
                          <Archive
                            size={16}
                            color={
                              activeTab === "history" ? "#0d9488" : "#64748b"
                            }
                          />
                          <Text
                            className={`font-medium ${activeTab === "history" ? "text-teal-600" : "text-slate-500"}`}
                          >
                            History & Approved (
                            {
                              detailedSchedulesList.filter(
                                (s) =>
                                  s.detailedApprovalStatus === "APPROVED" ||
                                  s.detailedApprovalStatus === "REJECTED",
                              ).length
                            }
                            )
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                  >
                    <View className="p-6">
                      <View className="flex-row items-center gap-2 p-2 mb-4 border rounded-lg border-slate-200 bg-slate-50">
                        <Filter size={16} color="#64748b" />
                        <TextInput
                          className="flex-1 py-1 text-sm text-slate-800"
                          value={detailedAuditTypeFilter}
                          onChangeText={setDetailedAuditTypeFilter}
                          placeholder="Filter by audit type or elements..."
                        />
                      </View>
                      <View className="mb-4 overflow-hidden border rounded-lg border-slate-200">
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={{ minWidth: 1100 }}>
                            <View className="flex-row p-3 border-b bg-slate-100 border-slate-200">
                              <View className="w-28">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Date
                                </Text>
                              </View>
                              <View className="w-24">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Time Slot
                                </Text>
                              </View>
                              <View className="w-36">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Dept/Event
                                </Text>
                              </View>
                              <View className="w-32">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Audit Type
                                </Text>
                              </View>
                              <View className="w-28">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Auditor
                                </Text>
                              </View>
                              <View className="w-28">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Auditee
                                </Text>
                              </View>
                              <View className="w-32">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Status
                                </Text>
                              </View>
                              <View className="w-40">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Approved/Rejected By
                                </Text>
                              </View>
                              <View className="items-center w-28">
                                <Text className="text-xs font-bold tracking-wider uppercase text-slate-600">
                                  Actions
                                </Text>
                              </View>
                            </View>
                            {detailedSchedulesList
                              .filter((s: any) => {
                                if (activeTab === "pending")
                                  return (
                                    s.detailedApprovalStatus ===
                                      "PENDING_APPROVAL" ||
                                    s.detailedApprovalStatus ===
                                      "CHANGE_REQUESTED"
                                  );
                                else
                                  return (
                                    s.detailedApprovalStatus === "APPROVED" ||
                                    s.detailedApprovalStatus === "REJECTED"
                                  );
                              })
                              .filter((s: any) => {
                                if (!detailedAuditTypeFilter.trim())
                                  return true;
                                const filter =
                                  detailedAuditTypeFilter.toLowerCase();
                                if (s.auditType?.toLowerCase().includes(filter))
                                  return true;
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
                              })
                              .map((schedule: any, idx: number) => {
                                const approvalStatus =
                                  schedule.detailedApprovalStatus ||
                                  schedule.approvalStatus ||
                                  "DRAFT";
                                return (
                                  <View
                                    key={schedule.id || idx}
                                    className={`flex-row p-3 border-b border-slate-100 items-center min-w-[1100px] ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                  >
                                    <View className="w-28">
                                      {schedule.fromDate &&
                                      schedule.toDate &&
                                      schedule.fromDate !== schedule.toDate ? (
                                        <>
                                          <View className="flex-row items-center gap-1 mb-0.5">
                                            <Text className="text-[10px] text-purple-600">
                                              📅
                                            </Text>
                                            <Text className="text-[10px] font-bold text-slate-700">
                                              Range:
                                            </Text>
                                            <Text className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded-full font-medium">
                                              Flexible
                                            </Text>
                                          </View>
                                          <Text className="text-xs font-medium text-slate-600">
                                            {schedule.fromDate} →{" "}
                                            {schedule.toDate}
                                          </Text>
                                        </>
                                      ) : (
                                        <Text className="text-sm font-medium text-slate-800">
                                          {schedule.scheduledDate ||
                                            schedule.date}
                                        </Text>
                                      )}
                                    </View>
                                    <View className="w-24">
                                      <Text className="text-sm text-slate-700">
                                        {schedule.startTime} -{" "}
                                        {schedule.endTime}
                                      </Text>
                                    </View>
                                    <View className="w-36">
                                      {schedule.isSpecialEvent ? (
                                        <View className="flex-row items-center gap-1">
                                          <Text className="text-sm font-medium text-slate-800">
                                            {schedule.specialEventType ===
                                            "OPENING"
                                              ? "☀️ Opening"
                                              : schedule.specialEventType ===
                                                  "LUNCH"
                                                ? "🍽️ Lunch"
                                                : "🌙 Closing"}
                                          </Text>
                                        </View>
                                      ) : (
                                        <View className="flex-row flex-wrap gap-1">
                                          {Array.isArray(
                                            schedule.departments,
                                          ) &&
                                          schedule.departments.length > 0 ? (
                                            schedule.departments.map(
                                              (dept: string, i: number) => (
                                                <Text
                                                  key={i}
                                                  className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium"
                                                >
                                                  {dept}
                                                </Text>
                                              ),
                                            )
                                          ) : (
                                            <Text className="text-sm text-slate-500">
                                              -
                                            </Text>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                    <View className="w-32">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={2}
                                      >
                                        {schedule.auditType || "-"}
                                      </Text>
                                    </View>
                                    <View className="w-28">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={1}
                                      >
                                        {schedule.auditorName || "-"}
                                      </Text>
                                    </View>
                                    <View className="w-28">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={1}
                                      >
                                        {schedule.auditeeName || "-"}
                                      </Text>
                                    </View>
                                    <View className="w-32">
                                      {getStatusBadge(approvalStatus)}
                                    </View>
                                    <View className="w-40">
                                      {approvalStatus === "APPROVED" &&
                                        schedule.approvedByName && (
                                          <Text
                                            className="text-xs font-medium text-green-700"
                                            numberOfLines={2}
                                          >
                                            {schedule.approvedByName}
                                          </Text>
                                        )}
                                      {approvalStatus === "REJECTED" && (
                                        <View>
                                          {(schedule.rejectedByName ||
                                            schedule.approvedByName) && (
                                            <Text
                                              className="text-xs font-medium text-red-600"
                                              numberOfLines={1}
                                            >
                                              {schedule.rejectedByName ||
                                                schedule.approvedByName}
                                            </Text>
                                          )}
                                          {schedule.detailedRejectionReason && (
                                            <Text
                                              className="text-[10px] text-red-500"
                                              numberOfLines={1}
                                            >
                                              {schedule.detailedRejectionReason
                                                .length > 30
                                                ? schedule.detailedRejectionReason.substring(
                                                    0,
                                                    30,
                                                  ) + "..."
                                                : schedule.detailedRejectionReason}
                                            </Text>
                                          )}
                                        </View>
                                      )}
                                      {approvalStatus ===
                                        "CHANGE_REQUESTED" && (
                                        <View>
                                          {(schedule.rejectedByName ||
                                            schedule.approvedByName) && (
                                            <Text
                                              className="text-xs font-medium text-orange-600"
                                              numberOfLines={1}
                                            >
                                              {schedule.rejectedByName ||
                                                schedule.approvedByName}
                                            </Text>
                                          )}
                                          <Text
                                            className="text-[10px] text-orange-500"
                                            numberOfLines={1}
                                          >
                                            Changes requested
                                          </Text>
                                        </View>
                                      )}
                                      {approvalStatus ===
                                        "PENDING_APPROVAL" && (
                                        <Text className="text-xs font-medium text-slate-400">
                                          Awaiting review
                                        </Text>
                                      )}
                                    </View>
                                    <View className="items-center justify-center w-28">
                                      {(approvalStatus === "PENDING_APPROVAL" ||
                                        approvalStatus ===
                                          "CHANGE_REQUESTED") && (
                                        <View className="flex-row gap-2">
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleApproveSingleSchedule(
                                                schedule,
                                              )
                                            }
                                            className="p-1.5 bg-green-100 rounded-lg active:bg-green-200"
                                          >
                                            <ThumbsUp
                                              size={16}
                                              color="#166534"
                                            />
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            onPress={() => {
                                              setSelectedScheduleForAction(
                                                schedule,
                                              );
                                              setDetailedRejectionReason("");
                                              setShowScheduleRejectModal(true);
                                            }}
                                            className="p-1.5 bg-red-100 rounded-lg active:bg-red-200"
                                          >
                                            <ThumbsDown
                                              size={16}
                                              color="#e11d48"
                                            />
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            onPress={() => {
                                              setSelectedScheduleForAction(
                                                schedule,
                                              );
                                              setChangeRequestReason("");
                                              setShowChangeRequestModal(true);
                                            }}
                                            className="p-1.5 bg-orange-100 rounded-lg active:bg-orange-200"
                                          >
                                            <MessageSquare
                                              size={16}
                                              color="#ea580c"
                                            />
                                          </TouchableOpacity>
                                        </View>
                                      )}
                                      {approvalStatus === "APPROVED" && (
                                        <Text className="text-xs font-bold text-green-600">
                                          Approved
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                );
                              })}
                            {detailedSchedulesList
                              .filter((s: any) => {
                                if (activeTab === "pending")
                                  return (
                                    s.detailedApprovalStatus ===
                                      "PENDING_APPROVAL" ||
                                    s.detailedApprovalStatus ===
                                      "CHANGE_REQUESTED"
                                  );
                                else
                                  return (
                                    s.detailedApprovalStatus === "APPROVED" ||
                                    s.detailedApprovalStatus === "REJECTED"
                                  );
                              })
                              .filter((s: any) => {
                                if (!detailedAuditTypeFilter.trim())
                                  return true;
                                const filter =
                                  detailedAuditTypeFilter.toLowerCase();
                                if (s.auditType?.toLowerCase().includes(filter))
                                  return true;
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
                              }).length === 0 && (
                              <View className="items-center justify-center py-12 min-w-[1100px]">
                                <Text className="text-sm text-slate-400">
                                  No schedules found for selected filter and
                                  tab.
                                </Text>
                              </View>
                            )}
                          </View>
                        </ScrollView>
                      </View>
                      {activeTab === "pending" &&
                        filteredPending.length > 0 && (
                          <View className="p-4 mb-4 border rounded-xl bg-amber-50 border-amber-200">
                            <View className="flex-row items-center gap-2 mb-2">
                              <AlertCircle size={16} color="#92400e" />
                              <Text className="text-sm font-bold text-amber-800">
                                Bulk Actions: {filteredPending.length} pending
                                schedule(s)
                                {detailedAuditTypeFilter
                                  ? ` for audit type "${detailedAuditTypeFilter}"`
                                  : " (all audit types)"}
                              </Text>
                            </View>
                            <View className="mb-3">
                              <Text className="mb-1 text-sm font-bold text-slate-700">
                                Comments / Reason (Optional for approve,
                                required for reject)
                              </Text>
                              <TextInput
                                multiline
                                numberOfLines={2}
                                value={detailedApprovalComment || ""}
                                onChangeText={setDetailedApprovalComment}
                                className="w-full p-2 text-sm bg-white border rounded-lg border-slate-200"
                                placeholder="Add comments for bulk action..."
                                textAlignVertical="top"
                              />
                            </View>
                            <View className="flex-row justify-end gap-3">
                              <TouchableOpacity
                                onPress={() => setShowDetailedRejectModal(true)}
                                className="flex-row items-center gap-2 px-4 py-2 bg-red-600 rounded-lg shadow-sm active:bg-red-700"
                              >
                                <X size={16} color="#ffffff" />
                                <Text className="font-medium text-white">
                                  Reject All Pending
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={handleBulkApproveByAuditType}
                                className="flex-row items-center gap-2 px-4 py-2 bg-green-600 rounded-lg shadow-sm active:bg-green-700"
                              >
                                <CheckSquare size={16} color="#ffffff" />
                                <Text className="font-medium text-white">
                                  Approve All Pending
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          );
        })()}
    </View>
  );
}
