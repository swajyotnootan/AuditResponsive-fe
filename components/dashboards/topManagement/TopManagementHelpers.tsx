import { CheckCircle, ChevronRight } from "lucide-react-native";
import React, { useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Path, Svg } from "react-native-svg";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const ITEMS_PER_PAGE = 5;

export const COLORS = {
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

export const monthDisplay: Record<string, string> = {
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

export const monthOrder = [
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

export const AUDIT_ELEMENTS_MAP: Record<string, string> = {
  "System Audit (ISO9001)": "A",
  "System Audit (IATF16949)": "B",
  "5S Audit": "C",
  "Process Audit": "D",
  "Product Audit": "E",
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

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

export const plantOf = (row: any): string | number | null => {
  if (!row) return null;
  for (const k of PLANT_FIELD_CANDIDATES) {
    const v = (row as any)[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

export const samePlant = (
  row: any,
  plantId: string | number | null,
): boolean => {
  if (plantId === null || plantId === undefined || plantId === "") return true;
  const rowPlant = plantOf(row);
  if (rowPlant === null) return true;
  return String(rowPlant) === String(plantId);
};

export const filterByPlant = <T,>(
  rows: T[],
  plantId: string | number | null,
): T[] => {
  if (plantId === null || plantId === undefined || plantId === "") return rows;
  return rows.filter((r) => samePlant(r as any, plantId));
};

export const normalizeMonth = (monthVal: any): string => {
  if (!monthVal) return "";
  const str = String(monthVal).toLowerCase().trim();
  const foundOrder = monthOrder.find((m) => m.toLowerCase() === str);
  if (foundOrder) return foundOrder;
  for (const [abbr, full] of Object.entries(monthDisplay)) {
    if (full.toLowerCase() === str) return abbr;
  }
  const num = parseInt(str);
  if (num >= 1 && num <= 12) {
    const jsMonth = num - 1;
    return monthOrder[jsMonth >= 3 ? jsMonth - 3 : jsMonth + 9];
  }
  return str;
};

export const getAuditElementCode = (
  element: string | undefined | null,
): string => {
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

// Batch promises so they don't saturate the DB pool
export async function chunked<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// SMALL UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

export const KpiCard = ({ title, value, icon, color, isDesktop }: any) => (
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

export const AnalyticsCard = ({
  title,
  subtitle,
  children,
  className = "",
}: any) => (
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

export const NativeGroupedBarChart = ({
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
              <Pressable
                key={idx}
                className="h-full flex-1 items-center justify-end"
                onHoverIn={() => setActiveIndex(idx)}
                onHoverOut={() => setActiveIndex(null)}
                onPressIn={() => setActiveIndex(idx)}
                onPressOut={() => setActiveIndex(null)}
              >
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

export const NativePieChart = ({ data, title, subtitle, total }: any) => {
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
                        onPressIn={() => setActiveIndex(idx)}
                        onPressOut={() => setActiveIndex(null)}
                      />,
                    );
                    acc.currentAngle = endAngle;
                    return acc;
                  },
                  { elements: [], currentAngle: 0 },
                ).elements
              }
            </Svg>
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

          <View className="mt-2 w-full gap-2">
            {data.map((item: any, idx: number) => (
              <Pressable
                key={idx}
                className={`flex-row items-center justify-between rounded-lg px-2 py-2 ${
                  activeIndex === idx ? "bg-slate-200" : "bg-slate-50"
                }`}
                onHoverIn={() => setActiveIndex(idx)}
                onHoverOut={() => setActiveIndex(null)}
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

export const PlanSectionCard = ({
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
                    {plan.isPartiallyConfirmed && (
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

export const DailyScheduleCard = ({
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
                  Prepared by: {plan.preparedBy || "N/A"} ·{" "}
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
                      `Approved by: ${plan.approvedBy} · `}
                    {plan.scheduleCount || 0} schedule(s)
                    {plan.approvedAt &&
                      ` · ${new Date(plan.approvedAt).toLocaleDateString()}`}
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
