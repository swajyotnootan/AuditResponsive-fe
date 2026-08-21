// app/components/dashboards/LeadAuditor/DashboardAnalytics.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/Feather";

// ============================================
// TYPES
// ============================================
interface Stats {
  totalSchedules: number;
  completedSchedules: number;
  approved: number;
  rejected: number;
  pendingApproval: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  majorNCRs: number;
  minorNCRs: number;
  totalResponses: number;
  responsesApproved: number;
  responsesRejected: number;
  responsesSubmitted: number;
}

interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  scheduledDate?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  createdAt?: string;
}

interface Response {
  id: string | number;
  department?: string;
  status?: string;
  percentageScore?: number;
  createdAt?: string;
  submittedAt?: string;
  auditorName?: string;
}

interface DashboardAnalyticsProps {
  stats: Stats;
  allSchedules: Schedule[];
  allNCRs: NCR[];
  allResponses: Response[];
  carouselSpeed: number;
  setCarouselSpeed: (speed: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
  leadAuditorDepartment?: string | null;
}

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const BLUE_SHADES = ["#00529B", "#1e3a8a", "#3b82f6", "#60a5fa", "#93c5fd"];

const defaultStats: Stats = {
  totalSchedules: 0,
  completedSchedules: 0,
  approved: 0,
  rejected: 0,
  pendingApproval: 0,
  inProgress: 0,
  scheduled: 0,
  overdue: 0,
  totalNCRs: 0,
  openNCRs: 0,
  closedNCRs: 0,
  criticalNCRs: 0,
  majorNCRs: 0,
  minorNCRs: 0,
  totalResponses: 0,
  responsesApproved: 0,
  responsesRejected: 0,
  responsesSubmitted: 0,
};

// ============================================
// RESPONSIVE METRIC CARD
// ============================================
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: string;
}> = ({ title, value, subtitle, icon, color = NAVBAR_COLORS.primary }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View
      style={{
        flex: 1,
        minWidth: isMobile ? "45%" : "22%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: isMobile ? 10 : 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280", fontWeight: "500" }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: isMobile ? 18 : 24,
            fontWeight: "bold",
            color: "#1F2937",
            marginTop: 2,
          }}
        >
          {value}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: isMobile ? 9 : 11, color: "#9CA3AF", marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      <View
        style={{
          padding: isMobile ? 8 : 12,
          borderRadius: 8,
          backgroundColor: color + "15",
        }}
      >
        <Icon name={icon} size={isMobile ? 18 : 22} color={color} />
      </View>
    </View>
  );
};

// ============================================
// RESPONSIVE TOP PERFORMER CARD
// ============================================
const TopPerformerCard: React.FC<{
  rank: number;
  name: string;
  score: number;
  department: string;
}> = ({ rank, name, score, department }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: isMobile ? 10 : 12,
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: NAVBAR_COLORS.primary,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "bold" }}>
          {rank}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "600", color: "#1E293B" }}>
          {name}
        </Text>
        <Text style={{ fontSize: isMobile ? 10 : 12, color: "#64748B", marginTop: 2 }}>
          {department}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "bold", color: "#1E293B" }}>
          {score}%
        </Text>
        <View
          style={{
            width: isMobile ? 50 : 64,
            height: 6,
            backgroundColor: "#E2E8F0",
            borderRadius: 3,
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${score}%`,
              height: "100%",
              backgroundColor: NAVBAR_COLORS.secondary,
              borderRadius: 3,
            }}
          />
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  stats = defaultStats,
  allSchedules = [],
  allNCRs = [],
  allResponses = [],
  carouselSpeed,
  setCarouselSpeed,
  onRefresh,
  refreshing,
  leadAuditorDepartment,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [selectedSpeed, setSelectedSpeed] = useState(carouselSpeed);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayRef = useRef<any>(null);

  // ============================================
  // MEMOIZED DATA
  // ============================================
  const avgResponseScore = useMemo(() => {
    return allResponses.length
      ? (
          allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) /
          allResponses.length
        ).toFixed(1)
      : "0.0";
  }, [allResponses]);

  const totalAudits = useMemo(() => {
    return allSchedules.filter((s) => s.scheduledDate).length;
  }, [allSchedules]);

  const overdueAudits = useMemo(() => {
    return allSchedules.filter((s) => {
      if (!s.scheduledDate) return false;
      return (
        new Date(s.scheduledDate as string) < new Date() &&
        s.status !== "COMPLETED" &&
        s.status !== "REJECTED"
      );
    }).length;
  }, [allSchedules]);

  const chartDimensions = useMemo(() => {
    const cardWidth = isMobile ? width * 0.85 : width * 0.45;
    const chartWidth = cardWidth - 32;
    const chartHeight = isMobile ? 180 : 220;
    return { cardWidth, chartWidth, chartHeight };
  }, [width, isMobile]);

  // ============================================
  // CHART DATA
  // ============================================
  const chartConfig = useMemo(
    () => ({
      backgroundColor: "#ffffff",
      backgroundGradientFrom: "#ffffff",
      backgroundGradientTo: "#ffffff",
      decimalCount: 0,
      color: (opacity = 1) => NAVBAR_COLORS.primary,
      labelColor: (opacity = 1) => "#6B7280",
      style: { borderRadius: 16 },
      propsForDots: { r: "4", strokeWidth: "2", stroke: NAVBAR_COLORS.primary },
      barPercentage: 0.5,
    }),
    []
  );

  const approvalTrendData = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthSchedules = allSchedules.filter((s) => {
        if (!s.scheduledDate) return false;
        const d = new Date(s.scheduledDate as string);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const approved = monthSchedules.filter(
        (s) => s.approvalStatus === "APPROVED" || s.status === "APPROVED"
      ).length;
      const monthResponses = allResponses.filter((r) => {
        if (!r.submittedAt && !r.createdAt) return false;
        const d = r.submittedAt
          ? new Date(r.submittedAt as string)
          : new Date(r.createdAt as string);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const responsesApproved = monthResponses.filter(
        (r) => r.status === "APPROVED"
      ).length;
      months.push({ month: monthStr, approved: approved + responsesApproved });
    }
    return months;
  }, [allSchedules, allResponses]);

  const departmentPerformanceData = useMemo(() => {
    const deptMap = new Map();
    allSchedules.forEach((s) => {
      const dept = s.department || "Unknown";
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, completed: 0 });
      const data = deptMap.get(dept);
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({
        name: name.length > 8 ? name.substring(0, 6) + ".." : name,
        completionRate: data.total
          ? Math.round((data.completed / data.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 6);
  }, [allSchedules]);

  const auditorPerformanceData = useMemo(() => {
    const auditorMap = new Map();
    allSchedules.forEach((s) => {
      const auditorName = s.auditorName || s.leadAuditorName;
      if (!auditorName) return;
      if (!auditorMap.has(auditorName))
        auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0 });
      const data = auditorMap.get(auditorName);
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
      if (s.approvalStatus === "APPROVED") data.approved++;
    });
    return Array.from(auditorMap.entries())
      .map(([name, data]) => ({
        name: name.split(" ")[0],
        score: Math.round(
          ((data.completed / (data.total || 1)) * 0.5 +
            (data.approved / (data.total || 1)) * 0.5) *
            100
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [allSchedules]);

  const monthlyPerformanceData = useMemo(() => {
    const months = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    let startYear = currentYear;
    let startMonth = 3;
    if (today.getMonth() < 3) startYear = currentYear - 1;
    for (let i = 0; i < 12; i++) {
      const date = new Date(startYear, startMonth + i, 1);
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      const monthName = date.toLocaleString("default", { month: "short" });
      const completedCount = allSchedules.filter((s) => {
        if (!s.scheduledDate) return false;
        const d = new Date(s.scheduledDate as string);
        return (
          d.getMonth() === monthIndex &&
          d.getFullYear() === year &&
          s.status === "COMPLETED"
        );
      }).length;
      months.push({ month: monthName, completedAudits: completedCount });
    }
    return months;
  }, [allSchedules]);

  const auditStatusDistributionData = useMemo(
    () =>
      [
        { name: "Sch", value: stats.scheduled || 0 },
        { name: "Prog", value: stats.inProgress || 0 },
        { name: "Comp", value: stats.completedSchedules || 0 },
        { name: "Appr", value: stats.approved || 0 },
        { name: "Rej", value: stats.rejected || 0 },
      ].filter((s) => s.value > 0),
    [stats]
  );

  const responseStatusDistributionData = useMemo(
    () =>
      [
        {
          name: "Appr",
          value: allResponses.filter((r) => r.status === "APPROVED").length,
        },
        {
          name: "Rej",
          value: allResponses.filter((r) => r.status === "REJECTED").length,
        },
        {
          name: "Sub",
          value: allResponses.filter((r) => r.status === "SUBMITTED").length,
        },
        {
          name: "Draft",
          value: allResponses.filter((r) => !r.status || r.status === "DRAFT")
            .length,
        },
      ].filter((s) => s.value > 0),
    [allResponses]
  );

  const ncrSeverityPieData = useMemo(() => {
    const data = [
      {
        name: "Critical",
        population: stats.criticalNCRs || 0,
        color: BLUE_SHADES[0],
        legendFontColor: "#6B7280",
        legendFontSize: isMobile ? 10 : 11,
      },
      {
        name: "Major",
        population: stats.majorNCRs || 0,
        color: BLUE_SHADES[1],
        legendFontColor: "#6B7280",
        legendFontSize: isMobile ? 10 : 11,
      },
      {
        name: "Minor",
        population: stats.minorNCRs || 0,
        color: BLUE_SHADES[2],
        legendFontColor: "#6B7280",
        legendFontSize: isMobile ? 10 : 11,
      },
    ].filter((d) => d.population > 0);
    return data.length > 0
      ? data
      : [
          {
            name: "None",
            population: 1,
            color: "#E5E7EB",
            legendFontColor: "#6B7280",
            legendFontSize: isMobile ? 10 : 11,
          },
        ];
  }, [stats, isMobile]);

  const auditStatusPieData = useMemo(() => {
    const data = auditStatusDistributionData.map((d, i) => ({
      name: d.name,
      population: d.value,
      color: BLUE_SHADES[i % BLUE_SHADES.length],
      legendFontColor: "#6B7280",
      legendFontSize: isMobile ? 10 : 11,
    }));
    return data.length > 0
      ? data
      : [
          {
            name: "None",
            population: 1,
            color: "#E5E7EB",
            legendFontColor: "#6B7280",
            legendFontSize: isMobile ? 10 : 11,
          },
        ];
  }, [auditStatusDistributionData, isMobile]);

  const responseStatusPieData = useMemo(() => {
    const data = responseStatusDistributionData.map((d, i) => ({
      name: d.name,
      population: d.value,
      color: BLUE_SHADES[i % BLUE_SHADES.length],
      legendFontColor: "#6B7280",
      legendFontSize: isMobile ? 10 : 11,
    }));
    return data.length > 0
      ? data
      : [
          {
            name: "None",
            population: 1,
            color: "#E5E7EB",
            legendFontColor: "#6B7280",
            legendFontSize: isMobile ? 10 : 11,
          },
        ];
  }, [responseStatusDistributionData, isMobile]);

  const scoreDistributionData = useMemo(() => {
    const ranges = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    allResponses.forEach((r) => {
      const score = r.percentageScore || 0;
      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          range.count++;
          break;
        }
      }
    });
    return ranges;
  }, [allResponses]);

  const weeklyActivityData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekLabel = `W${Math.floor(weekStart.getDate() / 7 + 1)}`;
      const completed = allSchedules.filter((s) => {
        if (!s.scheduledDate) return false;
        const d = new Date(s.scheduledDate as string);
        return d >= weekStart && d <= weekEnd && s.status === "COMPLETED";
      }).length;
      weeks.push({ week: weekLabel, completed });
    }
    return weeks;
  }, [allSchedules]);

  const topAuditors = useMemo(() => auditorPerformanceData.slice(0, 3), [
    auditorPerformanceData,
  ]);

  const alerts = useMemo(() => {
    const alertsList = [];
    if (stats.pendingApproval > 0)
      alertsList.push({
        message: `${stats.pendingApproval} audit(s) pending approval`,
        time: "Urgent",
        icon: "clock",
      });
    if (overdueAudits > 0)
      alertsList.push({
        message: `${overdueAudits} overdue audit(s) need attention`,
        time: "Overdue",
        icon: "alert-triangle",
      });
    if (stats.criticalNCRs > 0)
      alertsList.push({
        message: `${stats.criticalNCRs} critical NCR(s) require immediate action`,
        time: "High Priority",
        icon: "alert-circle",
      });
    if (stats.responsesSubmitted > 0)
      alertsList.push({
        message: `${stats.responsesSubmitted} response(s) waiting for review`,
        time: "Pending",
        icon: "file-text",
      });
    return alertsList;
  }, [stats, overdueAudits]);

  const speedOptions = [
    { label: "3s", value: 3000 },
    { label: "5s", value: 5000 },
    { label: "7s", value: 7000 },
    { label: "10s", value: 10000 },
  ];

  // ============================================
  // NO DATA COMPONENT
  // ============================================
  const NoData = useCallback(
    () => (
      <View style={{ height: 180, justifyContent: "center", alignItems: "center", width: "100%" }}>
        <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
        <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
          No data available
        </Text>
      </View>
    ),
    []
  );

  // ============================================
  // CHART SLIDES
  // ============================================
  const chartSlides = useMemo(
    () => [
      {
        id: "approval",
        title: "Approval Trend (6 Mo)",
        icon: "trending-up",
        component: approvalTrendData.some((d) => d.approved > 0) ? (
          <LineChart
            data={{
              labels: approvalTrendData.map((d) => d.month),
              datasets: [{ data: approvalTrendData.map((d) => d.approved) }],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "ncrSeverity",
        title: "NCR Severity",
        icon: "shield",
        component: stats.totalNCRs > 0 ? (
          <PieChart
            data={ncrSeverityPieData}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "dept",
        title: "Department Performance",
        icon: "briefcase",
        component: departmentPerformanceData.length > 0 ? (
          <BarChart
            data={{
              labels: departmentPerformanceData.map((d) => d.name),
              datasets: [
                {
                  data: departmentPerformanceData.map(
                    (d) => d.completionRate
                  ),
                },
              ],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix="%"
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "auditor",
        title: "Auditor Performance",
        icon: "users",
        component: auditorPerformanceData.length > 0 ? (
          <LineChart
            data={{
              labels: auditorPerformanceData.map((d) => d.name),
              datasets: [
                { data: auditorPerformanceData.map((d) => d.score) },
              ],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "monthly",
        title: "Monthly Completed",
        icon: "activity",
        component: monthlyPerformanceData.some((d) => d.completedAudits > 0) ? (
          <LineChart
            data={{
              labels: monthlyPerformanceData.map((d) => d.month),
              datasets: [
                { data: monthlyPerformanceData.map((d) => d.completedAudits) },
              ],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "auditStatus",
        title: "Audit Status",
        icon: "alert-circle",
        component: auditStatusPieData[0].name !== "None" ? (
          <PieChart
            data={auditStatusPieData}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "responseStatus",
        title: "Response Status",
        icon: "file-text",
        component: responseStatusPieData[0].name !== "None" ? (
          <PieChart
            data={responseStatusPieData}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="12"
            absolute={false}
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "scoreDist",
        title: "Score Distribution",
        icon: "bar-chart-2",
        component: scoreDistributionData.some((d) => d.count > 0) ? (
          <BarChart
            data={{
              labels: scoreDistributionData.map((d) => d.range),
              datasets: [{ data: scoreDistributionData.map((d) => d.count) }],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <NoData />
        ),
      },
      {
        id: "weekly",
        title: "Weekly Activity",
        icon: "activity",
        component: weeklyActivityData.some((d) => d.completed > 0) ? (
          <LineChart
            data={{
              labels: weeklyActivityData.map((d) => d.week),
              datasets: [{ data: weeklyActivityData.map((d) => d.completed) }],
            }}
            width={chartDimensions.chartWidth}
            height={chartDimensions.chartHeight}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <NoData />
        ),
      },
    ],
    [
      approvalTrendData,
      chartDimensions,
      chartConfig,
      NoData,
      stats.totalNCRs,
      ncrSeverityPieData,
      departmentPerformanceData,
      auditorPerformanceData,
      monthlyPerformanceData,
      auditStatusPieData,
      responseStatusPieData,
      scoreDistributionData,
      weeklyActivityData,
    ]
  );

  // ============================================
  // AUTO-PLAY LOGIC
  // ============================================
  useEffect(() => {
    if (isAutoPlaying && chartSlides.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setActiveChartIndex((prev) => {
          const nextIndex = (prev + 1) % chartSlides.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (chartDimensions.cardWidth + 20),
            animated: true,
          });
          return nextIndex;
        });
      }, carouselSpeed);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, carouselSpeed, chartSlides.length, chartDimensions.cardWidth]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleScroll = useCallback(
    (event: any) => {
      const offset = event.nativeEvent.contentOffset.x;
      const roundIndex = Math.round(offset / (chartDimensions.cardWidth + 20));
      setActiveChartIndex((prev) => (prev !== roundIndex ? roundIndex : prev));
    },
    [chartDimensions.cardWidth]
  );

  const goToSlide = useCallback(
    (index: number) => {
      setActiveChartIndex(index);
      scrollViewRef.current?.scrollTo({
        x: index * (chartDimensions.cardWidth + 20),
        animated: true,
      });
    },
    [chartDimensions.cardWidth]
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 16, paddingTop: 16 }}>
      {/* Metrics Grid */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
        }}
      >
        <MetricCard
          title="Total Audits"
          value={totalAudits}
          subtitle="scheduled this year"
          icon="calendar"
        />
        <MetricCard
          title="Total NCRs"
          value={stats.totalNCRs}
          subtitle="non-conformities"
          icon="alert-triangle"
        />
        <MetricCard
          title="Response Approval"
          value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`}
          subtitle="approved"
          icon="thumbs-up"
        />
        <MetricCard
          title="Avg Score"
          value={`${avgResponseScore}%`}
          subtitle="average score"
          icon="bar-chart-2"
        />
      </View>

      {/* Analytics Card */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: isMobile ? 12 : 16,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View>
            <Text style={{ fontSize: isMobile ? 16 : 20, fontWeight: "bold", color: "#1F2937" }}>
              Analytics Dashboard
            </Text>
            <Text style={{ fontSize: isMobile ? 11 : 12, color: "#6B7280", marginTop: 2 }}>
              Real-time audit performance metrics
            </Text>
          </View>
          <View
            style={{
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "flex-start" : "center",
              gap: 8,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
                padding: 2,
              }}
            >
              {speedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor:
                      selectedSpeed === option.value
                        ? NAVBAR_COLORS.primary
                        : "transparent",
                  }}
                  onPress={() => {
                    setSelectedSpeed(option.value);
                    setCarouselSpeed(option.value);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color:
                        selectedSpeed === option.value ? "#FFFFFF" : "#6B7280",
                      fontWeight: "500",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: NAVBAR_COLORS.primary,
              }}
              onPress={onRefresh}
            >
              <Icon name="refresh-cw" size={14} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "500" }}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carousel */}
        <View style={{ marginTop: 8 }}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={chartDimensions.cardWidth + 20}
            contentContainerStyle={{
              paddingHorizontal: isMobile ? 10 : 20,
              alignItems: "center",
            }}
            style={{ flexGrow: 0 }}
          >
            {chartSlides.map((slide, index) => (
              <View
                key={slide.id}
                style={{
                  width: chartDimensions.cardWidth,
                  marginRight: index === chartSlides.length - 1 ? 0 : 20,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    padding: isMobile ? 12 : 16,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                      alignSelf: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: NAVBAR_COLORS.bg,
                      }}
                    >
                      <Icon name={slide.icon} size={16} color={NAVBAR_COLORS.primary} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}>
                      {slide.title}
                    </Text>
                  </View>
                  <View style={{ width: "100%", alignItems: "center", justifyContent: "center" }}>
                    {slide.component}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {chartSlides.length > 1 && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                paddingHorizontal: 4,
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {chartSlides.map((_, idx) => (
                  <TouchableOpacity key={idx} onPress={() => goToSlide(idx)}>
                    <View
                      style={{
                        width: activeChartIndex === idx ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor:
                          activeChartIndex === idx
                            ? NAVBAR_COLORS.primary
                            : "#CBD5E1",
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  backgroundColor: "#FFFFFF",
                }}
                onPress={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                <Icon
                  name={isAutoPlaying ? "pause" : "play"}
                  size={14}
                  color={NAVBAR_COLORS.primary}
                />
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569" }}>
                  {isAutoPlaying ? "Pause" : "Play"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Grid */}
      <View
        style={{
          flexDirection: isMobile ? "column" : "row",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Key Insights */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: isMobile ? 12 : 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: NAVBAR_COLORS.bg,
              }}
            >
              <Icon name="target" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
              Key Insights
            </Text>
          </View>
          <View
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                Month-over-Month
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#22C55E" }}>
                +8%
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              Compared to previous month
            </Text>
          </View>
          <View
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Quality Score</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#22C55E" }}>
                {Math.round(
                  (stats.responsesApproved /
                    (stats.responsesApproved + stats.responsesRejected || 1)) *
                    100
                )}
                %
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              Response quality rating
            </Text>
          </View>
          <View style={{ paddingVertical: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Audit Efficiency</Text>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#22C55E" }}>
                {stats.totalSchedules
                  ? Math.round(
                      (stats.completedSchedules / stats.totalSchedules) * 100
                    )
                  : 0}
                %
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              Audit completion efficiency
            </Text>
          </View>
        </View>

        {/* Top Performers */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: isMobile ? 12 : 16,
            marginTop: isMobile ? 16 : 0,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: NAVBAR_COLORS.bg,
              }}
            >
              <Icon name="award" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
              Top Performers
            </Text>
          </View>
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {topAuditors.length > 0 ? (
              topAuditors.map((auditor, idx) => (
                <TopPerformerCard
                  key={idx}
                  rank={idx + 1}
                  name={auditor.name}
                  score={auditor.score}
                  department="Auditor"
                />
              ))
            ) : (
              <View
                style={{
                  height: 180,
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Icon name="users" size={30} color="#CBD5E1" />
                <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
                  No auditor data available
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Alerts */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            padding: isMobile ? 12 : 16,
            marginTop: isMobile ? 16 : 0,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                padding: 6,
                borderRadius: 8,
                backgroundColor: NAVBAR_COLORS.bg,
              }}
            >
              <Icon name="alert-circle" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F2937" }}>
              Alerts & Notifications
            </Text>
            {alerts.length > 0 && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginLeft: "auto",
                  backgroundColor: NAVBAR_COLORS.primary,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}>
                  {alerts.length}
                </Text>
              </View>
            )}
          </View>
          <ScrollView style={{ maxHeight: 180, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      backgroundColor: NAVBAR_COLORS.bg,
                    }}
                  >
                    <Icon name={alert.icon} size={14} color={NAVBAR_COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: "#1F2937" }}>
                      {alert.message}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                      {alert.time}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Icon name="check-circle" size={40} color="#22C55E" />
                <Text style={{ fontSize: 14, color: "#1F2937", marginTop: 8 }}>
                  No pending alerts
                </Text>
                <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  All systems running smoothly
                </Text>
              </View>
            )}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, color: "#6B7280" }}>Active Audits</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: NAVBAR_COLORS.primary,
                  marginTop: 2,
                }}
              >
                {stats.inProgress || 0}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, color: "#6B7280" }}>Open NCRs</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1F2937",
                  marginTop: 2,
                }}
              >
                {stats.openNCRs || 0}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardAnalytics;