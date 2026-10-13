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
  MessageSquare,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Path, Svg } from "react-native-svg"; // ? ADD THIS IMPORT
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

// ============================================================================
// PLANT FILTER CONSTANTS
// ============================================================================
const PLANT_FIELD_CANDIDATES = [
  "plantId",
  "plant_id",
  "plant",
  "plantCode",
  "plantName",
  "unitId",
  "unit_id",
  "locationId",
  "location_id",
] as const;

const plantOf = (row: any): string | number | null => {
  if (!row) return null;
  for (const k of PLANT_FIELD_CANDIDATES) {
    const v = (row as any)[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const samePlant = (row: any, plantId: string | number | null): boolean => {
  if (plantId === null || plantId === undefined || plantId === "") return true;
  const rowPlant = plantOf(row);
  if (rowPlant === null) return true; // fail-open when row has no plant
  return String(rowPlant) === String(plantId);
};

const filterByPlant = <T,>(rows: T[], plantId: string | number | null): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
};

const normalizeMonth = (monthVal: any): string => {
  if (!monthVal) return "";
  const str = String(monthVal).toLowerCase().trim();

  // 1. Check if it's already in monthOrder (e.g., "apr", "may")
  const foundOrder = monthOrder.find((m) => m.toLowerCase() === str);
  if (foundOrder) return foundOrder;

  // 2. Check full month name (e.g., "april", "september")
  for (const [abbr, full] of Object.entries(monthDisplay)) {
    if (full.toLowerCase() === str) return abbr;
  }

  // 3. Check month number (e.g., "4", "04")
  const num = parseInt(str);
  if (num >= 1 && num <= 12) {
    const jsMonth = num - 1; // 0-11
    return monthOrder[jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9];
  }

  return str;
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
    className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
    style={{ padding: isDesktop ? 24 : 12 }}
  >
    <View className="mb-2 flex-row items-start justify-between">
      <View className="rounded-xl p-2" style={{ backgroundColor: color.bg }}>
        {React.cloneElement(icon, {
          color: color.text,
          size: isDesktop ? 24 : 18,
        })}
      </View>
    </View>
    <Text
      className={`font-bold text-slate-800 ${isDesktop ? "mb-1 text-3xl" : "mb-1 text-xl"}`}
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text
      className="text-[10px] font-medium uppercase tracking-wide text-slate-500 md:text-xs"
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
    className={`min-w-[300px] flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
  >
    <Text className="text-lg font-bold text-slate-800">{title}</Text>
    {subtitle && (
      <Text className="mb-4 mt-1 text-xs text-slate-500">{subtitle}</Text>
    )}
    {children}
  </View>
);
const NativeGroupedBarChart = ({
  data,
  title,
  subtitle,
  keys,
  colors,
}: any) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxValue = Math.max(
    ...data.map((d: any) =>
      Math.max(...keys.map((k: string) => Number(d[k] || 0))),
    ),
    1,
  );

  const isAllZero = data.every((d: any) =>
    keys.every((k: string) => !d[k] || Number(d[k]) === 0),
  );

  return (
    <View
      className="flex-1 rounded-xl bg-white p-4"
      style={{ overflow: "visible" }}
    >
      <Text className="mb-1 font-bold text-slate-800">{title}</Text>
      <Text className="mb-4 text-xs text-slate-500">{subtitle}</Text>

      {isAllZero ? (
        <View className="h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
          <Text className="text-sm font-medium text-slate-400">
            No data available for this period
          </Text>
        </View>
      ) : (
        <>
          <View
            className="h-48 flex-row items-end gap-2 px-2"
            style={{ overflow: "visible" }}
          >
            {data.map((item: any, idx: number) => (
              // ? CHANGED <View> TO <Pressable>
              <Pressable
                key={idx}
                className="h-full flex-1 items-center justify-end"
                // ? Web Hover Events
                onHoverIn={() => setActiveIndex(idx)}
                onHoverOut={() => setActiveIndex(null)}
                // ? Mobile Touch Events
                onPressIn={() => setActiveIndex(idx)}
                onPressOut={() => setActiveIndex(null)}
              >
                {/* FLOATING TOOLTIP */}
                {activeIndex === idx && (
                  <View
                    className="absolute z-50 mb-2 rounded-lg bg-slate-800 px-3 py-2 shadow-xl"
                    style={{ bottom: "100%", minWidth: 120 }}
                    pointerEvents="none"
                  >
                    <Text className="mb-1 text-center text-xs font-bold text-white">
                      {item.name || item.month}
                    </Text>
                    {keys.map((key: string, kIdx: number) => (
                      <View
                        key={key}
                        className="mt-0.5 flex-row items-center justify-between gap-2"
                      >
                        <View className="flex-row items-center gap-1">
                          <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: colors[kIdx] }}
                          />
                          <Text className="text-[10px] text-slate-300">
                            {key}
                          </Text>
                        </View>
                        <Text className="text-[11px] font-bold text-white">
                          {item[key] || 0}
                        </Text>
                      </View>
                    ))}
                    <View className="absolute -bottom-1 left-1/2 -ml-1 h-2 w-2 rotate-45 bg-slate-800" />
                  </View>
                )}

                {/* BARS */}
                <View className="w-full flex-1 flex-row items-end justify-center gap-1">
                  {keys.map((key: string, kIdx: number) => (
                    <View
                      key={key}
                      style={{
                        height: `${Math.max((Number(item[key] || 0) / maxValue) * 100, 4)}%`,
                        backgroundColor: colors[kIdx],
                        width: 16,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        opacity:
                          activeIndex !== null && activeIndex !== idx ? 0.4 : 1,
                      }}
                    />
                  ))}
                </View>
                <Text
                  className="mt-2 text-center text-[10px] text-slate-500"
                  numberOfLines={1}
                >
                  {item.name || item.month}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* LEGEND */}
          <View className="mt-4 flex-row justify-center gap-4">
            {keys.map((key: string, kIdx: number) => (
              <View key={key} className="flex-row items-center gap-1">
                <View
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: colors[kIdx] }}
                />
                <Text className="text-xs text-slate-600">{key}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const NativePieChart = ({ data, title, subtitle, total }: any) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalValue =
    data.reduce((sum: number, d: any) => sum + d.value, 0) || 1;
  const hasData = data.some((d: any) => d.value > 0);
  const chartColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.light,
    COLORS.lighter,
    COLORS.lightest,
    COLORS.dark,
  ];

  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const displayTotal = activeItem ? activeItem.value : total || totalValue;
  const displayLabel = activeItem
    ? activeItem.fullName || activeItem.name
    : "Total";

  const calculatePath = (startAngle: number, endAngle: number) => {
    const radius = 50;
    const innerRadius = 35;
    const centerX = 60;
    const centerY = 60;
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const x3 = centerX + innerRadius * Math.cos(endRad);
    const y3 = centerY + innerRadius * Math.sin(endRad);
    const x4 = centerX + innerRadius * Math.cos(startRad);
    const y4 = centerY + innerRadius * Math.sin(startRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <View className="flex-1 rounded-xl bg-white p-4">
      <Text className="mb-1 font-bold text-slate-800">{title}</Text>
      <Text className="mb-4 text-xs text-slate-500">{subtitle}</Text>

      {!hasData ? (
        <View className="h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
          <Text className="text-sm font-medium text-slate-400">
            No data available
          </Text>
        </View>
      ) : (
        <View className="items-center py-3">
          {/* Donut Chart SVG */}
          <View className="mb-6 h-36 w-36 items-center justify-center">
            <Svg width="144" height="144" viewBox="0 0 120 120">
              {
                data.reduce(
                  (acc: any, item: any, idx: number) => {
                    const startAngle = acc.currentAngle;
                    const angle = (item.value / totalValue) * 360;
                    const endAngle = startAngle + angle;
                    acc.elements.push(
                      <Path
                        key={idx}
                        d={calculatePath(startAngle, endAngle)}
                        fill={chartColors[idx % chartColors.length]}
                        opacity={
                          activeIndex !== null && activeIndex !== idx ? 0.4 : 1
                        }
                        // ? Mobile Touch & Basic Web Click (Safe from TS errors)
                        onPressIn={() => setActiveIndex(idx)}
                        onPressOut={() => setActiveIndex(null)}
                        // ? REMOVED: style={{ cursor: "pointer" }} (Not supported by PathProps)
                      />,
                    );
                    acc.currentAngle = endAngle;
                    return acc;
                  },
                  { elements: [], currentAngle: 0 },
                ).elements
              }
            </Svg>
            {/* Center Text (Updates dynamically) */}
            <View
              className="absolute items-center justify-center"
              pointerEvents="none"
            >
              <Text className="text-2xl font-bold text-slate-800">
                {displayTotal}
              </Text>
              <Text
                className="px-2 text-center text-xs text-slate-500"
                numberOfLines={2}
              >
                {displayLabel}
              </Text>
            </View>
          </View>

          {/* Legend (Changed <View> to <Pressable> for Web Hover & Mobile Touch) */}
          <View className="mt-2 w-full gap-2">
            {data.map((item: any, idx: number) => (
              <Pressable
                key={idx}
                className={`flex-row items-center justify-between rounded-lg px-2 py-2 ${
                  activeIndex === idx ? "bg-slate-200" : "bg-slate-50"
                }`}
                // ? Web Hover Events
                onHoverIn={() => setActiveIndex(idx)}
                onHoverOut={() => setActiveIndex(null)}
                // ? Mobile Touch Events
                onPressIn={() => setActiveIndex(idx)}
                onPressOut={() => setActiveIndex(null)}
              >
                <View className="flex-1 flex-row items-center gap-2">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: chartColors[idx % chartColors.length],
                    }}
                  />
                  <Text
                    className="flex-1 text-sm text-slate-700"
                    numberOfLines={1}
                  >
                    {item.fullName || item.name}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-slate-800">
                  {item.value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
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
    <View className="mb-6 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <View
        className="border-b px-5 py-4"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="rounded-lg p-2"
              style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
            >
              <Icon size={20} style={{ color: color.text }} />
            </View>
            <Text className="font-bold text-slate-800">{title}</Text>
          </View>
          <View
            className="rounded-full px-3 py-1 shadow-sm"
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
        <View className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <View className="relative">
            <TextInput
              className="w-full rounded-lg border border-slate-200 px-4 py-2 pl-10 text-sm text-slate-800"
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
              className="border-b border-slate-100 p-4"
              onPress={() => onViewPlan(plan)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-sm font-semibold text-slate-800">
                      {plan.month
                        ? `${getFormTypeLabel()} - ${monthDisplay[plan.month] || plan.month} ${plan.year}`
                        : `${getFormTypeLabel()} ${plan.year}`}
                    </Text>
                    {plan.isPartiallyConfirmed && ( // ? NEW
                      <View className="rounded-full bg-purple-100 px-2 py-0.5">
                        <Text className="text-xs font-medium text-purple-700">
                          Partially Confirmed by LA
                        </Text>
                      </View>
                    )}
                  </View>
                  {plan.preparedBy && (
                    <Text
                      className="mt-1 text-xs text-slate-500"
                      numberOfLines={1}
                    >
                      Prepared by: {plan.preparedBy}
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
        <View className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-600">
              Page {currentPage} of {totalPages} ({filteredPlans.length} total)
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">
                  Previous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!showAll && filteredPlans.length > 0 && (
        <View className="border-t border-slate-100 bg-slate-50 px-4 py-3">
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
        <View className="rounded-full bg-orange-100 px-2 py-0.5">
          <Text className="text-xs font-medium text-orange-700">
            Changes Requested
          </Text>
        </View>
      );
    if (plan.pendingCount > 0)
      return (
        <View className="rounded-full bg-yellow-100 px-2 py-0.5">
          <Text className="text-xs font-medium text-yellow-700">
            {plan.pendingCount} pending
          </Text>
        </View>
      );
    if (plan.rejectedCount > 0)
      return (
        <View className="rounded-full bg-red-100 px-2 py-0.5">
          <Text className="text-xs font-medium text-red-700">
            {plan.rejectedCount} rejected
          </Text>
        </View>
      );
    return null;
  };

  return (
    <View className="mb-6 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <View
        className="border-b px-5 py-4"
        style={{ backgroundColor: color.bg, borderColor: color.border }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View
              className="rounded-lg p-2"
              style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
            >
              <Icon size={20} style={{ color: color.text }} />
            </View>
            <Text className="font-bold text-slate-800">{title}</Text>
          </View>
          <View className="flex-row gap-2">
            {filteredPendingPlans.length > 0 && (
              <View
                className="rounded-full px-3 py-1 shadow-sm"
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
              <View className="rounded-full bg-green-100 px-3 py-1 shadow-sm">
                <Text className="text-xs font-bold text-green-700">
                  {filteredApprovedPlans.length} History
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {showAll && onSearchChange && (
        <View className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <TextInput
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-800"
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
            className="border-b border-slate-100 p-4"
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
                  Prepared by: {plan.preparedBy || "N/A"} �{" "}
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
              className={`mx-2 my-2 rounded-lg border p-4 ${
                isRejected
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
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
                      <View className="rounded-full bg-red-100 px-2 py-0.5">
                        <Text className="text-xs font-medium text-red-700">
                          {plan.rejectedCount} rejected
                        </Text>
                      </View>
                    ) : (
                      <View className="rounded-full bg-green-100 px-2 py-0.5">
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
                      `Approved by: ${plan.approvedBy} � `}
                    {plan.scheduleCount || 0} schedule(s)
                    {plan.approvedAt &&
                      ` � ${new Date(plan.approvedAt).toLocaleDateString()}`}
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
        <View className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-slate-600">
              Page {currentPage} of {totalPages} ({allFilteredPlans.length}{" "}
              total)
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">
                  Previous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onPageChange && onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
              >
                <Text className="text-xs font-medium text-slate-600">Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!showAll && totalMonths > 0 && (
        <View className="border-t border-slate-100 bg-slate-50 px-4 py-3">
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

  // ? FIXED: Single source of truth for tab routing (matches Audit Manager)
  const [activeSection, setActiveSection] = useState("overview");

  // ? FIXED: Listen for param changes and update activeSection
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
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // ? PLANT FILTER
  const [selectedPlant, setSelectedPlant] = useState<string | number | null>(
    () => (user as any)?.plantId ?? null,
  );
  const [availablePlants, setAvailablePlants] = useState<any[]>([]);

  // ? STRICTLY USE AUTH CONTEXT (No default fallback data)

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
      });
      if (response.ok) {
        const data = await response.json();

        setAllUsersList(data || []);
        console.log(`? Fetched ${data.length} users for forum`);
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
          if (!user?.id) {
            console.warn(
              "?? [TM Dashboard] No user.id � skipping annual plans fetch",
            );
            return {
              totalPlanned: 0,
              totalCompleted: 0,
              allPlans: [],
              pending: [],
              approved: [],
            };
          }

          const response = await fetch(
            `${API_BASE_URL}/api/audit-plan/${year}?userId=${user.id}`,
            {
              method: "GET",
            },
          );
          const data = await response.json();

          if (data) {
            allPlans.push({
              year,
              ...data,
              approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
              preparedBy: data.preparedBy || data.preparedByName || "N/A",
              preparedAt:
                data.preparedAt || data.createdAt || new Date().toISOString(),
              // Fallback for different API key names
              planItems:
                data.planItems ||
                data.items ||
                data.schedules ||
                data.audits ||
                [],
            });
          }
        } catch (err) {
          console.error(`Error fetching annual plan for year ${year}:`, err);
        }
      }

      const pending = allPlans.filter((p) =>
        (p.approvalStatus || "").toUpperCase().includes("PENDING"),
      );
      const approved = allPlans.filter((p) =>
        (p.approvalStatus || "").toUpperCase().includes("APPROVED"),
      );
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
          if (!user?.id) {
            console.warn(
              "?? [TM Dashboard] No user.id � skipping dept plans fetch",
            );
            return {
              pendingCount: 0,
              approvedCount: 0,
              allPlans: [],
              pending: [],
              approved: [],
            };
          }

          const response = await fetch(
            `${API_BASE_URL}/api/department-plan/${year}?userId=${user.id}`,
            {
              method: "GET",
            },
          );
          const data = await response.json();
          if (data) {
            allDeptPlans.push({
              year,
              ...data,
              approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
              preparedBy: data.preparedBy || data.preparedByName || "N/A",
              preparedAt:
                data.preparedAt || data.createdAt || new Date().toISOString(),
              // Fallback for different API key names
              planItems:
                data.planItems ||
                data.items ||
                data.schedules ||
                data.audits ||
                [],
            });
          }
        } catch (err) {
          console.error(`Error fetching dept plan for year ${year}:`, err);
        }
      }

      allDeptPlans = allDeptPlans.map((plan: any) => {
        const items = Array.isArray(plan.planItems) ? plan.planItems : [];
        return { ...plan, planItems: filterByPlant(items, selectedPlant) };
      });

      if (selectedPlant != null && selectedPlant !== "") {
        allDeptPlans = allDeptPlans.filter(
          (p: any) => (p.planItems?.length ?? 0) > 0,
        );
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
            { method: "GET" },
          );
          const raw = await response.json();
          const allSchedulesRaw: any[] = Array.isArray(raw)
            ? raw
            : raw?.data && Array.isArray(raw.data)
              ? raw.data
              : [];

          // ? PLANT SCOPE
          const allSchedules = filterByPlant(allSchedulesRaw, selectedPlant);

          const weekSchedules = allSchedules.filter(
            (s: any) => !s.scheduledDate,
          );

          const tmVisibleSchedules = weekSchedules.filter((s: any) => {
            const status = (s.approvalStatus || "DRAFT").toUpperCase();
            return [
              "CONFIRMED_BY_LA",
              "APPROVED",
              "REJECTED",
              "CHANGE_REQUESTED",
            ].includes(status);
          });

          if (tmVisibleSchedules.length > 0) {
            const monthMap = new Map();
            tmVisibleSchedules.forEach((schedule: any) => {
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
              const schedules: any[] = monthData.schedules;

              // Compute booleans from the TM-visible schedules only
              const anyConfirmed = schedules.some(
                (s: any) =>
                  (s.approvalStatus || "").toUpperCase() === "CONFIRMED_BY_LA",
              );
              const allConfirmed =
                schedules.length > 0 &&
                schedules.every(
                  (s: any) =>
                    (s.approvalStatus || "").toUpperCase() ===
                    "CONFIRMED_BY_LA",
                );

              const allApprovedStatus =
                schedules.length > 0 &&
                schedules.every(
                  (s: any) =>
                    (s.approvalStatus || "").toUpperCase() === "APPROVED",
                );

              const anyPendingConfirmation = schedules.some(
                (s: any) =>
                  (s.approvalStatus || "").toUpperCase() ===
                  "PENDING_LA_CONFIRMATION",
              );

              const anyTmRejected = schedules.some(
                (s: any) =>
                  (s.approvalStatus || "").toUpperCase() === "REJECTED",
              );

              const anyTmChangeRequested = schedules.some(
                (s: any) =>
                  (s.approvalStatus || "").toUpperCase() === "CHANGE_REQUESTED",
              );

              // Derive a single status for the month
              let derivedStatus:
                | "APPROVED"
                | "CONFIRMED_BY_LA"
                | "PARTIALLY_CONFIRMED_BY_LA"
                | "PENDING_LA_CONFIRMATION"
                | "REJECTED"
                | "CHANGE_REQUESTED"
                | "DRAFT";

              if (allApprovedStatus) {
                derivedStatus = "APPROVED";
              } else if (allConfirmed) {
                derivedStatus = "CONFIRMED_BY_LA";
              } else if (anyConfirmed) {
                derivedStatus = "PARTIALLY_CONFIRMED_BY_LA";
              } else if (anyPendingConfirmation) {
                derivedStatus = "PENDING_LA_CONFIRMATION";
              } else if (anyTmRejected) {
                derivedStatus = "REJECTED";
              } else if (anyTmChangeRequested) {
                derivedStatus = "CHANGE_REQUESTED";
              } else {
                derivedStatus = "DRAFT";
              }

              monthData.approvalStatus = derivedStatus;
              monthData.isPartiallyConfirmed =
                derivedStatus === "PARTIALLY_CONFIRMED_BY_LA";

              if (
                derivedStatus === "CONFIRMED_BY_LA" ||
                derivedStatus === "PARTIALLY_CONFIRMED_BY_LA"
              ) {
                allPendingApprovals.push(monthData);
              } else if (
                derivedStatus === "APPROVED" ||
                derivedStatus === "REJECTED" ||
                derivedStatus === "CHANGE_REQUESTED"
              ) {
                allApproved.push(monthData);
              }
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
      if (!user?.id) {
        return {
          pendingCount: 0,
          approvedCount: 0,
          pending: [],
          approved: [],
          allSchedules: [],
        };
      }

      const currentYear = new Date().getFullYear();
      const years: number[] = [];
      for (let i = currentYear - 5; i <= currentYear + 2; i++) years.push(i);

      const allPendingMonths: any[] = [];
      const allApprovedMonths: any[] = [];
      const allDailySchedules: any[] = [];

      for (const year of years) {
        try {
          // ? 1. PENDING � only CONFIRMED_BY_LA months (TM approval queue)
          const pendingRes = await fetch(
            `${API_BASE_URL}/api/audit-schedule/pending-date-approvals/${year}/detailed?userId=${user.id}`,
            {},
          );
          const rawPending = await pendingRes.json();
          const pendingRowsRaw: any[] = Array.isArray(rawPending)
            ? rawPending
            : Array.isArray(rawPending?.data)
              ? rawPending.data
              : [];

          // ? PLANT SCOPE
          const pendingRows = filterByPlant(pendingRowsRaw, selectedPlant);
          // Group by month
          const pendingByMonth = new Map<string, any>();
          for (const row of pendingRows) {
            const month = row.month;
            if (!month) continue;

            if (!pendingByMonth.has(month)) {
              pendingByMonth.set(month, {
                year,
                month,
                schedules: [],
                scheduleCount: 0,
                preparedBy: row.preparedBy || "N/A",
                approvedBy: "Not approved yet",
                pendingCount: 0,
                rejectedCount: 0,
                changeRequestedCount: 0,
                isChangeRequested: false,
              });
            }
            const m = pendingByMonth.get(month);
            m.scheduleCount += 1;
            m.pendingCount += 1;

            // ? Keep ALL DTO fields and normalize arrays
            const coNames = Array.isArray(row.coAuditorNames)
              ? row.coAuditorNames
              : typeof row.coAuditorNames === "string"
                ? (() => {
                    try {
                      const p = JSON.parse(row.coAuditorNames);
                      return Array.isArray(p) ? p : [row.coAuditorNames];
                    } catch {
                      return [row.coAuditorNames];
                    }
                  })()
                : [];

            const audNames = Array.isArray(row.auditeeNames)
              ? row.auditeeNames
              : typeof row.auditeeNames === "string"
                ? (() => {
                    try {
                      const p = JSON.parse(row.auditeeNames);
                      return Array.isArray(p) ? p : [row.auditeeNames];
                    } catch {
                      return [row.auditeeNames];
                    }
                  })()
                : [];

            m.schedules.push({
              ...row, // ? all DTO fields
              scheduledDate: row.scheduledDate || row.date, // ? correct field
              department:
                row.department ||
                (Array.isArray(row.departments)
                  ? row.departments.join(", ")
                  : ""),
              detailedApprovalStatus:
                row.detailedApprovalStatus || "CONFIRMED_BY_LA",
              auditorName:
                row.auditorName ||
                (coNames.length > 0 ? coNames.join(", ") : ""),
              auditeeName:
                row.auditeeName ||
                (audNames.length > 0 ? audNames.join(", ") : ""),
              coAuditorNames: coNames,
              auditeeNames: audNames,
              month,
              planYear: year,
            });
          }

          pendingByMonth.forEach((m) => allPendingMonths.push(m));
        } catch (err) {
          console.error(
            `Error fetching pending date approvals for ${year}:`,
            err,
          );
        }

        try {
          // ? 2. APPROVED HISTORY � fetch all daily schedules and keep only APPROVED
          for (const month of monthOrder) {
            const response = await auditScheduleApi.getDateSchedulesByMonth(
              year,
              month as any,
              user.id,
            );
            const raw = Array.isArray(response) ? response : response?.data;
            const rawList: any[] = Array.isArray(raw) ? raw : [];

            // ? PLANT SCOPE
            const scopedList = filterByPlant(rawList, selectedPlant);

            const schedules: any[] = scopedList.map((s: any) => {
              const coNames = Array.isArray(s.coAuditorNames)
                ? s.coAuditorNames
                : typeof s.coAuditorNames === "string"
                  ? (() => {
                      try {
                        const p = JSON.parse(s.coAuditorNames);
                        return Array.isArray(p) ? p : [s.coAuditorNames];
                      } catch {
                        return [s.coAuditorNames];
                      }
                    })()
                  : [];

              const audNames = Array.isArray(s.auditeeNames)
                ? s.auditeeNames
                : typeof s.auditeeNames === "string"
                  ? (() => {
                      try {
                        const p = JSON.parse(s.auditeeNames);
                        return Array.isArray(p) ? p : [s.auditeeNames];
                      } catch {
                        return [s.auditeeNames];
                      }
                    })()
                  : [];

              // ? NEW: Resolve the display name for approved/rejected by
              const resolveUserName = (
                rawName: any,
                rawId: any,
              ): string | null => {
                // 1. Prefer an explicit name string
                if (
                  typeof rawName === "string" &&
                  rawName.trim() &&
                  rawName !== "null" &&
                  rawName !== "N/A" &&
                  rawName !== "undefined"
                ) {
                  return rawName.trim();
                }
                // 2. Fall back to looking up the ID in allUsersList
                if (rawId != null) {
                  const u = allUsersList.find(
                    (x: any) =>
                      String(x.id) === String(rawId) ||
                      Number(x.id) === Number(rawId),
                  );
                  if (u) {
                    const full =
                      u.name ||
                      `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                      u.email;
                    if (full) return full;
                  }
                }
                return null;
              };

              const approvedByName =
                resolveUserName(s.approvedByName, s.approvedBy) ||
                (typeof s.approvedByName === "string"
                  ? s.approvedByName
                  : null);

              const rejectedByName =
                resolveUserName(s.rejectedByName, s.rejectedBy) || null;

              return {
                ...s,
                planYear: year,
                month,
                coAuditorNames: coNames,
                auditeeNames: audNames,
                auditorName:
                  s.auditorName ||
                  (coNames.length > 0 ? coNames.join(", ") : ""),
                auditeeName:
                  s.auditeeName ||
                  (audNames.length > 0 ? audNames.join(", ") : ""),
                // ? Guarantee these fields exist on every schedule object
                approvedByName,
                rejectedByName,
              };
            });

            allDailySchedules.push(...schedules);

            // Keep only approved + rejected schedules for history
            const historySchedules = schedules.filter((s: any) => {
              const status =
                s.detailedApprovalStatus || s.approvalStatus || "DRAFT";
              return status === "APPROVED" || status === "REJECTED";
            });

            if (historySchedules.length === 0) continue;

            const approvedCount = historySchedules.filter(
              (s: any) =>
                (s.detailedApprovalStatus || s.approvalStatus) === "APPROVED",
            ).length;
            const rejectedCount = historySchedules.filter(
              (s: any) =>
                (s.detailedApprovalStatus || s.approvalStatus) === "REJECTED",
            ).length;

            const approvedBySet = new Set<string>();
            let latestApprovedAt: string | null = null;
            historySchedules.forEach((s: any) => {
              const name = s.approvedByName || s.approvedBy;
              if (name && name !== "N/A" && name !== "null") {
                approvedBySet.add(name);
              }
              const date = s.approvedAt || s.approvedDate;
              if (
                date &&
                (!latestApprovedAt ||
                  new Date(date) > new Date(latestApprovedAt))
              ) {
                latestApprovedAt = date;
              }
            });

            allApprovedMonths.push({
              year,
              month,
              schedules: historySchedules,
              scheduleCount: historySchedules.length,
              approvedCount,
              rejectedCount,
              preparedBy:
                historySchedules[0]?.preparedByName ||
                historySchedules[0]?.preparedBy ||
                "N/A",
              approvedBy:
                approvedBySet.size > 0
                  ? Array.from(approvedBySet).join(", ")
                  : "Not approved yet",
              approvedAt: latestApprovedAt,
            });
          }
        } catch (err) {
          console.error(`Error fetching history for ${year}:`, err);
        }
      }

      setPendingDetailedPlans(allPendingMonths);
      setApprovedDetailedPlans(allApprovedMonths);
      setAllDetailedSchedules(allDailySchedules);

      return {
        pendingCount: allPendingMonths.length,
        approvedCount: allApprovedMonths.length,
        pending: allPendingMonths,
        approved: allApprovedMonths,
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
  }, [user?.id, selectedPlant]);
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
                    if (normalizeMonth(month.month) === monthAbbr) {
                      const status = (month.status || "").toUpperCase();
                      if (status === "PLANNED" || status === "PENDING")
                        planned++;
                      if (
                        status === "COMPLETED" ||
                        status === "APPROVED" ||
                        status === "DONE"
                      )
                        completed++;
                    }
                  });
                }
              });
            }
          });

          detailedData.allSchedules.forEach((schedule: any) => {
            // ? Use normalizeMonth here too
            if (
              schedule.planYear === year &&
              normalizeMonth(schedule.month) === monthAbbr
            ) {
              const status = (
                schedule.detailedApprovalStatus ||
                schedule.approvalStatus ||
                ""
              ).toUpperCase();

              if (status.includes("APPROVED") || status.includes("COMPLETED"))
                completed++;
              else if (status.includes("PENDING") || status.includes("CHANGE"))
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
    if (!user?.id) return;
    (async () => {
      await fetchAllUsers();
      await fetchDashboardData();
    })();
  }, [user?.id, selectedPlant]); // ? added

  useEffect(() => {
    if (!user?.id) return;

    const fetchPlants = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/plants`, {});
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : raw?.data || [];
        setAvailablePlants(list);

        // If the user has a plant, prefer it, unless user already picked
        setSelectedPlant((prev) =>
          prev == null ? ((user as any)?.plantId ?? null) : prev,
        );
      } catch (e) {
        console.warn("Failed to load plants:", e);
      }
    };

    fetchPlants();
  }, [user?.id]);

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

    // ? Treat CONFIRMED_BY_LA as pending too
    const hasPendingSchedules = plan.schedules.some(
      (s: any) =>
        s.detailedApprovalStatus === "PENDING_APPROVAL" ||
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA",
    );
    setActiveTab(hasPendingSchedules ? "pending" : tab);

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
                approvedBy: user?.id ?? user?.name,
                approvedAt: new Date().toISOString(),
                detailedRejectionReason: null,
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
      const auditor = allUsersList.find(
        (u: any) =>
          Number(u.id) === Number(auditData.auditorId) ||
          String(u.id) === String(auditData.auditorId),
      );
      if (auditor?.email) {
        memberEmails.push(auditor.email);
        auditData.auditorName = auditor.name;
      }
    }

    // Try to find auditee by ID
    if (auditData.auditeeId) {
      const auditee = allUsersList.find(
        (u: any) =>
          Number(u.id) === Number(auditData.auditeeId) ||
          String(u.id) === String(auditData.auditeeId),
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
          <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-1">
            <CheckCircle size={12} color="#166534" />
            <Text className="text-xs text-green-700">Approved</Text>
          </View>
        );
      case "REJECTED":
        return (
          <View className="flex-row items-center gap-1 rounded-full bg-red-100 px-2 py-1">
            <X size={12} color="#e11d48" />
            <Text className="text-xs text-red-700">Rejected</Text>
          </View>
        );
      case "PENDING_APPROVAL":
        return (
          <View className="flex-row items-center gap-1 rounded-full bg-yellow-100 px-2 py-1">
            <Clock size={12} color="#b45309" />
            <Text className="text-xs text-yellow-700">Pending</Text>
          </View>
        );
      case "CHANGE_REQUESTED":
        return (
          <View className="flex-row items-center gap-1 rounded-full bg-orange-100 px-2 py-1">
            <MessageSquare size={12} color="#ea580c" />
            <Text className="text-xs text-orange-700">Changes Requested</Text>
          </View>
        );
      default:
        return (
          <View className="rounded-full bg-gray-100 px-2 py-1">
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
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA"; // ? ADD
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
        s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
        s.detailedApprovalStatus === "CONFIRMED_BY_LA"; // ? ADD
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
      <View className="flex-1 items-center justify-center bg-slate-50">
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
        onBack={() => setActiveSection("overview")} // ? Goes back to Overview
      />
    );
  }
  if (activeSection === "form4") {
    return (
      <Form4View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")} // ? Goes back to Overview
      />
    );
  }
  if (activeSection === "form5") {
    return (
      <Form5View
        year={new Date().getFullYear()}
        onBack={() => setActiveSection("overview")} // ? Goes back to Overview
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
        <View className="w-full pb-2 pt-4 md:pb-4 md:pt-6">
          <View className="w-full flex-col gap-4 px-4 md:mx-auto md:max-w-7xl md:flex-row md:items-center md:justify-between md:px-8 lg:px-16">
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-800 md:text-3xl">
                {activeSection === "overview" && "Dashboard Overview"}
                {activeSection === "annual" && "Annual Audit Plans"}
                {activeSection === "dept" && "Department Audit Plans"}
                {activeSection === "week" && "Week Schedules"}
                {activeSection === "daily" && "Daily Schedules"}
              </Text>
              <Text className="mt-1 text-sm text-slate-500 md:text-base">
                Welcome back,{" "}
                <Text className="font-semibold text-slate-700">
                  {user?.name}
                </Text>
              </Text>
            </View>
            <View className="flex-row items-center gap-3 self-start md:self-auto">
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm active:bg-slate-50 disabled:opacity-50"
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
        <View className="w-full px-4 pb-6 md:mx-auto md:max-w-7xl md:px-8 lg:px-16">
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
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <Text className="mb-3 font-bold text-slate-800">
                    Approved Plans Summary
                  </Text>
                  {isDesktop ? (
                    <View className="flex-row gap-4">
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Annual
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedPlans.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Department
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedDeptPlans.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                        <Text className="mb-1 text-xs font-bold text-slate-800">
                          Week
                        </Text>
                        <Text className="text-lg font-bold text-slate-800">
                          {approvedForm5Plans.length}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
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
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Annual
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedPlans.length}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Department
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedDeptPlans.length}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-3">
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
                          <Text className="mb-1 text-xs font-bold text-slate-800">
                            Week
                          </Text>
                          <Text className="text-lg font-bold text-slate-800">
                            {approvedForm5Plans.length}
                          </Text>
                        </View>
                        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-3">
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
                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <View className="mb-4 flex-row items-center gap-3">
                    <View className="rounded-xl bg-indigo-50 p-2.5">
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
                    <View className="flex-1 rounded-lg bg-slate-50 p-3">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Pending Actions
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-amber-600">
                        {stats.pendingApproval +
                          stats.pendingDeptApproval +
                          stats.pendingForm5Approval +
                          stats.pendingDetailedApproval}
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-slate-50 p-3">
                      <Text className="text-[10px] font-semibold uppercase text-slate-500">
                        Completion
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-green-600">
                        {stats.overallCompletion}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Text className="mb-4 text-base font-bold text-slate-800">
                    Audit Plans
                  </Text>
                  <View
                    className={`${isDesktop ? "flex-row" : "flex-col"} gap-3`}
                  >
                    {/* ? Annual Plan -> Opens Form3View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form3")}
                      className="flex-1 items-center justify-center rounded-xl bg-blue-50 p-3 active:bg-blue-100"
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

                    {/* ? Dept Plan -> Opens Form4View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form4")}
                      className="flex-1 items-center justify-center rounded-xl bg-green-50 p-3 active:bg-green-100"
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

                    {/* ? Week Schedule -> Opens Form5View */}
                    <TouchableOpacity
                      onPress={() => setActiveSection("form5")}
                      className="flex-1 items-center justify-center rounded-xl bg-indigo-50 p-3 active:bg-indigo-100"
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
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
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
                className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
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
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium"
                >
                  <Text className="text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmApproveSingleSchedule}
                  disabled={submitting}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white shadow-sm disabled:opacity-50"
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
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
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
                className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
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
                  className="rounded-lg border border-slate-200 px-4 py-2 font-medium"
                >
                  <Text className="text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRequestChangesForSchedule}
                  disabled={submitting}
                  className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white shadow-sm disabled:opacity-50"
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
          auditId={
            selectedAuditForForum.id || selectedAuditForForum.auditId || "demo"
          }
          auditNumber={selectedAuditForForum.auditNumber || "AUD-001"}
          auditTitle={
            selectedAuditForForum.auditTitle ||
            selectedAuditForForum.auditType ||
            "Audit Discussion"
          }
          auditStatus={selectedAuditForForum.auditStatus || "IN_PROGRESS"}
          auditType={selectedAuditForForum.auditType || "System Audit"}
          department={selectedAuditForForum.department || "Quality"}
          auditorId={selectedAuditForForum.auditorId || user?.id}
          auditorName={
            selectedAuditForForum.auditorName ||
            user?.name ||
            user?.email ||
            "Unknown"
          }
          auditeeId={selectedAuditForForum.auditeeId}
          auditeeName={selectedAuditForForum.auditeeName}
          hodEmail={selectedAuditForForum.hodEmail}
          hodName={selectedAuditForForum.hodName}
          memberEmails={selectedAuditForForum.memberEmails || []}
          currentUser={user}
          allUsers={allUsersList} // ? PASS THE ACTUAL USERS LIST - THIS IS THE KEY FIX
        />
      )}

      {showForm5Details && selectedForm5Plan && (
        <Modal visible={true} transparent animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View
              className={`overflow-hidden rounded-2xl bg-white shadow-2xl ${isDesktop ? "max-h-[100%] w-full max-w-6xl" : "max-h-[92%] w-full flex-1"}`}
            >
              <View className="flex-shrink-0 flex-row items-center justify-between border-b border-slate-200 bg-white p-4">
                <View className="flex-1 pr-4">
                  <Text
                    className="text-base font-bold text-slate-800 md:text-xl"
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
                  className="rounded-lg bg-slate-100 p-2"
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
                  className="m-2 rounded-lg border border-slate-200 bg-white"
                >
                  <View style={{ minWidth: isDesktop ? 1130 : 750 }}>
                    <View className="flex-row border-b border-slate-200 bg-slate-50">
                      <View
                        style={{ width: isDesktop ? 150 : 120 }}
                        className="border-r border-slate-200 px-2 py-3"
                      >
                        <Text className="text-center text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Department
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 120 : 70 }}
                        className="justify-center border-r border-slate-200 px-2 py-3"
                      >
                        <Text className="text-center text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Week
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 120 : 100 }}
                        className="border-r border-slate-200 px-2 py-3"
                      >
                        <Text className="text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Elements
                        </Text>
                      </View>
                      {/* ? Team ? Auditor */}
                      <View
                        style={{ width: isDesktop ? 260 : 180 }}
                        className="border-r border-slate-200 px-2 py-3"
                      >
                        <Text className="text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Auditor
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 180 : 120 }}
                        className="border-r border-slate-200 px-2 py-3"
                      >
                        <Text className="text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Auditees
                        </Text>
                      </View>
                      <View
                        style={{ width: isDesktop ? 100 : 100 }}
                        className="justify-center px-2 py-3"
                      >
                        <Text className="text-center text-[10px] font-bold uppercase text-slate-600 md:text-[11px]">
                          Status
                        </Text>
                      </View>
                    </View>
                    {form5SchedulesDetail.map((schedule: any, idx: number) => {
                      // ? Use the SAME priority as ScheduleMatrixView / ScheduleListView:
                      //    coAuditorNames (primary + co-auditors) ? teamAuditorNames ? auditorName
                      let teamAuditorNames: string[] = [];

                      // Priority 1: coAuditorNames (this is where the full team lives)
                      const primarySource =
                        schedule.coAuditorNames ??
                        schedule.teamAuditorNames ??
                        schedule.auditorNames ??
                        null;

                      if (typeof primarySource === "string") {
                        try {
                          const parsed = JSON.parse(primarySource);
                          teamAuditorNames = Array.isArray(parsed)
                            ? parsed.filter(
                                (n: any) => typeof n === "string" && n.trim(),
                              )
                            : primarySource.trim()
                              ? [primarySource.trim()]
                              : [];
                        } catch {
                          teamAuditorNames = primarySource.trim()
                            ? [primarySource.trim()]
                            : [];
                        }
                      } else if (Array.isArray(primarySource)) {
                        teamAuditorNames = primarySource.filter(
                          (n: any) => typeof n === "string" && n.trim(),
                        );
                      }

                      // Priority 2: fall back to scalar single-name fields
                      if (teamAuditorNames.length === 0) {
                        const single =
                          schedule.leadAuditorName ||
                          schedule.auditorName ||
                          null;
                        if (
                          single &&
                          typeof single === "string" &&
                          single.trim()
                        ) {
                          teamAuditorNames = [single.trim()];
                        }
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
                                className="mb-1 mr-1 rounded bg-blue-100 px-1.5 py-0.5"
                              >
                                <Text className="text-[14px] font-medium text-blue-700 md:text-[14px]">
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
                                className="mb-1 mr-1 rounded bg-blue-100 px-1.5 py-0.5"
                              >
                                <Text className="text-[18px] font-medium text-blue-700 md:text-[14px]">
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
                          className="flex-row border-b border-slate-100 bg-white"
                        >
                          {/* Department */}
                          <View
                            style={{ width: isDesktop ? 150 : 120 }}
                            className="border-r border-slate-100 px-2 py-3"
                          >
                            <Text
                              className="text-center text-xs font-medium text-slate-800 md:text-sm"
                              numberOfLines={2}
                            >
                              {schedule.department || "-"}
                            </Text>
                          </View>

                          {/* Week */}
                          <View
                            style={{ width: isDesktop ? 120 : 70 }}
                            className="border-r border-slate-100 px-2 py-3"
                          >
                            <Text className="text-center text-xs text-slate-800 md:text-sm">
                              {schedule.week || "-"}
                            </Text>
                          </View>

                          {/* Elements */}
                          <View
                            style={{ width: isDesktop ? 120 : 100 }}
                            className="flex-row flex-wrap border-r border-slate-100 px-2 py-3"
                          >
                            {renderElements()}
                          </View>

                          {/* ? Auditor (was "Team") � now shows the full audit team */}
                          <View
                            style={{ width: isDesktop ? 260 : 180 }}
                            className="flex-row flex-wrap border-r border-slate-100 px-2 py-3"
                          >
                            {teamAuditorNames.length > 0 ? (
                              teamAuditorNames.map(
                                (name: string, i: number) => (
                                  <View
                                    key={i}
                                    className="mb-1 mr-1 rounded bg-indigo-100 px-1.5 py-0.5"
                                  >
                                    <Text
                                      className="text-center text-[12px] text-indigo-700 md:text-[12px]"
                                      numberOfLines={1}
                                    >
                                      {name}
                                    </Text>
                                  </View>
                                ),
                              )
                            ) : (
                              <Text className="w-full text-center text-xs text-slate-400">
                                -
                              </Text>
                            )}
                          </View>

                          {/* Auditees */}
                          <View
                            style={{ width: isDesktop ? 180 : 120 }}
                            className="flex-row flex-wrap border-r border-slate-100 px-2 py-3"
                          >
                            {auditeeNames.length > 0 ? (
                              auditeeNames.map((name: string, i: number) => (
                                <View
                                  key={i}
                                  className="mb-1 mr-1 rounded bg-green-100 px-1.5 py-0.5"
                                >
                                  <Text
                                    className="text-center text-[12px] text-green-700 md:text-[12px]"
                                    numberOfLines={1}
                                  >
                                    {name}
                                  </Text>
                                </View>
                              ))
                            ) : (
                              <Text className="w-full text-center text-xs text-slate-400">
                                -
                              </Text>
                            )}
                          </View>

                          {/* Status */}
                          <View
                            style={{ width: isDesktop ? 100 : 100 }}
                            className="justify-center px-2 py-3"
                          >
                            <View className="self-center rounded-full bg-yellow-100 px-2 py-1">
                              <Text className="text-center text-[9px] font-bold text-yellow-700 md:text-[10px]">
                                {schedule.status || "SCHEDULED"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                <View className="m-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
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
                  <View className="px-6 pb-6 pt-2">
                    <View className="mb-4">
                      <Text className="mb-2 text-sm font-bold text-slate-700">
                        Approval Comments (Optional)
                      </Text>
                      <TextInput
                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
                        multiline
                        numberOfLines={2}
                        value={form5ApprovalComment}
                        onChangeText={setForm5ApprovalComment}
                        placeholder="Add any comments for approval..."
                      />
                    </View>
                    <View className="flex-row items-center justify-end gap-3 border-t border-slate-100 pt-4">
                      <TouchableOpacity
                        onPress={() => setShowForm5RejectModal(true)}
                        className="flex-row items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 shadow-sm active:bg-red-700"
                      >
                        <X size={16} color="#FFF" />
                        <Text className="font-medium text-white">Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleApproveForm5Plan}
                        disabled={submitting}
                        className="flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 shadow-sm active:bg-green-700 disabled:opacity-50"
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
                  <View className="mx-6 mb-6 flex-row items-center justify-center rounded-lg border border-green-200 bg-green-50 p-4">
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
              s.detailedApprovalStatus === "CHANGE_REQUESTED" ||
              s.detailedApprovalStatus === "CONFIRMED_BY_LA"; // <--- ADD THIS
            // ... rest of filter
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
              <View className="flex-1 items-center justify-center bg-black/50 p-4">
                <View className="max-h-[90%] w-full max-w-6xl flex-1 rounded-2xl bg-white shadow-2xl">
                  <View className="border-b border-slate-100 p-3">
                    <View className="mb-4 flex-row items-center justify-between">
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
                        className="rounded-lg bg-slate-100 p-2"
                      >
                        <X size={20} color="#475569" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row border-b border-slate-200">
                      <TouchableOpacity
                        onPress={() => setActiveTab("pending")}
                        className={`px-2 py-2 ${activeTab === "pending" ? "border-b-2 border-teal-600" : ""}`}
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
                        className={`px-3 py-2 ${activeTab === "history" ? "border-b-2 border-teal-600" : ""}`}
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
                      <View className="mb-4 flex-row items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <Filter size={16} color="#64748b" />
                        <TextInput
                          className="flex-1 py-1 text-sm text-slate-800"
                          value={detailedAuditTypeFilter}
                          onChangeText={setDetailedAuditTypeFilter}
                          placeholder="Filter by audit type or elements..."
                        />
                      </View>
                      <View className="mb-4 overflow-hidden rounded-lg border border-slate-200">
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={{ minWidth: 1100 }}>
                            <View className="flex-row border-b border-slate-200 bg-slate-100 p-3">
                              <View className="w-28">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Date
                                </Text>
                              </View>
                              <View className="w-24">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Time Slot
                                </Text>
                              </View>
                              <View className="w-36">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Dept/Event
                                </Text>
                              </View>
                              <View className="w-32">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Audit Type
                                </Text>
                              </View>
                              <View className="w-28">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Auditor
                                </Text>
                              </View>
                              <View className="w-28">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Auditee
                                </Text>
                              </View>
                              <View className="w-32">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Status
                                </Text>
                              </View>
                              <View className="w-40">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Approved/Rejected By
                                </Text>
                              </View>
                              <View className="w-28 items-center">
                                <Text className="text-xs font-bold uppercase tracking-wider text-slate-600">
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
                                      "CHANGE_REQUESTED" ||
                                    s.detailedApprovalStatus ===
                                      "CONFIRMED_BY_LA"
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
                                    className={`min-w-[1100px] flex-row items-center border-b border-slate-100 p-3 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                  >
                                    <View className="w-28">
                                      {schedule.fromDate &&
                                      schedule.toDate &&
                                      schedule.fromDate !== schedule.toDate ? (
                                        <>
                                          <View className="mb-0.5 flex-row items-center gap-1">
                                            <Text className="text-[10px] text-purple-600">
                                              ??
                                            </Text>
                                            <Text className="text-[10px] font-bold text-slate-700">
                                              Range:
                                            </Text>
                                            <Text className="rounded-full bg-purple-100 px-1 py-0.5 text-[10px] font-medium text-purple-700">
                                              Flexible
                                            </Text>
                                          </View>
                                          <Text className="text-xs font-medium text-slate-600">
                                            {schedule.fromDate} ?{" "}
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
                                              ? "?? Opening"
                                              : schedule.specialEventType ===
                                                  "LUNCH"
                                                ? "??? Lunch"
                                                : "?? Closing"}
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
                                                  className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
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
                                    {/* Auditor */}
                                    <View className="w-28">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={2}
                                      >
                                        {(() => {
                                          const names =
                                            Array.isArray(
                                              schedule.coAuditorNames,
                                            ) &&
                                            schedule.coAuditorNames.length > 0
                                              ? schedule.coAuditorNames
                                              : Array.isArray(
                                                    schedule.teamAuditorNames,
                                                  ) &&
                                                  schedule.teamAuditorNames
                                                    .length > 0
                                                ? schedule.teamAuditorNames
                                                : schedule.auditorName
                                                  ? [schedule.auditorName]
                                                  : [];
                                          return names.length > 0
                                            ? names.join(", ")
                                            : "-";
                                        })()}
                                      </Text>
                                    </View>

                                    {/* Auditee */}
                                    <View className="w-28">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={2}
                                      >
                                        {(() => {
                                          const names =
                                            Array.isArray(
                                              schedule.auditeeNames,
                                            ) &&
                                            schedule.auditeeNames.length > 0
                                              ? schedule.auditeeNames
                                              : schedule.auditeeName
                                                ? [schedule.auditeeName]
                                                : [];
                                          return names.length > 0
                                            ? names.join(", ")
                                            : "-";
                                        })()}
                                      </Text>
                                    </View>
                                    {/* <View className="w-28">
                                      <Text
                                        className="text-sm text-slate-700"
                                        numberOfLines={1}
                                      >
                                        {schedule.auditeeName || "-"}
                                      </Text>
                                    </View> */}
                                    <View className="w-32">
                                      {getStatusBadge(approvalStatus)}
                                    </View>
                                    <View className="w-40">
                                      {(() => {
                                        const resolveDisplay = (
                                          rawName: any,
                                          rawId: any,
                                        ): string => {
                                          if (
                                            typeof rawName === "string" &&
                                            rawName.trim() &&
                                            rawName !== "null" &&
                                            rawName !== "N/A"
                                          ) {
                                            return rawName.trim();
                                          }
                                          if (rawId != null) {
                                            const u = allUsersList.find(
                                              (x: any) =>
                                                String(x.id) ===
                                                  String(rawId) ||
                                                Number(x.id) === Number(rawId),
                                            );
                                            if (u) {
                                              const full =
                                                u.name ||
                                                `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                                                u.email;
                                              if (full) return full;
                                            }
                                          }
                                          return "�";
                                        };

                                        if (approvalStatus === "APPROVED") {
                                          const name = resolveDisplay(
                                            schedule.approvedByName ||
                                              schedule.approvedBy,
                                            schedule.approvedBy,
                                          );
                                          return (
                                            <Text
                                              className="text-xs font-medium text-green-700"
                                              numberOfLines={2}
                                            >
                                              {name}
                                            </Text>
                                          );
                                        }

                                        if (approvalStatus === "REJECTED") {
                                          const name = resolveDisplay(
                                            schedule.rejectedByName ||
                                              schedule.laRejectedBy ||
                                              schedule.approvedByName,
                                            schedule.rejectedBy ||
                                              schedule.approvedBy,
                                          );
                                          return (
                                            <Text
                                              className="text-xs font-medium text-red-600"
                                              numberOfLines={2}
                                            >
                                              {name}
                                            </Text>
                                          );
                                        }

                                        if (
                                          approvalStatus === "CHANGE_REQUESTED"
                                        ) {
                                          const name = resolveDisplay(
                                            schedule.rejectedByName ||
                                              schedule.approvedByName,
                                            schedule.rejectedBy ||
                                              schedule.approvedBy,
                                          );
                                          return (
                                            <View>
                                              <Text
                                                className="text-xs font-medium text-orange-600"
                                                numberOfLines={1}
                                              >
                                                {name}
                                              </Text>
                                              <Text
                                                className="text-[10px] text-orange-500"
                                                numberOfLines={1}
                                              >
                                                Changes requested
                                              </Text>
                                            </View>
                                          );
                                        }

                                        if (
                                          approvalStatus === "PENDING_APPROVAL"
                                        ) {
                                          return (
                                            <Text className="text-xs font-medium text-slate-400">
                                              Awaiting review
                                            </Text>
                                          );
                                        }

                                        return (
                                          <Text className="text-xs text-slate-400">
                                            �
                                          </Text>
                                        );
                                      })()}
                                    </View>
                                    <View className="w-28 items-center justify-center">
                                      {(approvalStatus === "PENDING_APPROVAL" ||
                                        approvalStatus === "CHANGE_REQUESTED" ||
                                        approvalStatus ===
                                          "CONFIRMED_BY_LA") && (
                                        <View className="flex-row gap-2">
                                          <TouchableOpacity
                                            onPress={() =>
                                              handleApproveSingleSchedule(
                                                schedule,
                                              )
                                            }
                                            className="rounded-lg bg-green-100 p-1.5 active:bg-green-200"
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
                                            className="rounded-lg bg-red-100 p-1.5 active:bg-red-200"
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
                                            className="rounded-lg bg-orange-100 p-1.5 active:bg-orange-200"
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
                                      {approvalStatus === "REJECTED" && (
                                        <Text className="text-xs font-bold text-red-600">
                                          Rejected
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
                                      "CHANGE_REQUESTED" ||
                                    s.detailedApprovalStatus ===
                                      "CONFIRMED_BY_LA"
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
                              <View className="min-w-[1100px] items-center justify-center py-12">
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
                          <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <View className="mb-2 flex-row items-center gap-2">
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
                                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                                placeholder="Add comments for bulk action..."
                                textAlignVertical="top"
                              />
                            </View>
                            <View className="flex-row justify-end gap-3">
                              <TouchableOpacity
                                onPress={() => setShowDetailedRejectModal(true)}
                                className="flex-row items-center gap-2 rounded-lg bg-red-600 px-4 py-2 shadow-sm active:bg-red-700"
                              >
                                <X size={16} color="#ffffff" />
                                <Text className="font-medium text-white">
                                  Reject All
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={handleBulkApproveByAuditType}
                                className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2 shadow-sm active:bg-green-700"
                              >
                                <CheckSquare size={16} color="#ffffff" />
                                <Text className="font-medium text-white">
                                  Approve All
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
