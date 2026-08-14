// app/components/dashboards/LeadAuditor/DashboardAnalytics.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/Feather";

// Types
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

const { width } = Dimensions.get("window");
const isMobile = width < 768;

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

// Strict Blue Palette for Pie Charts
const BLUE_SHADES = [
  "#00529B", // Deep Professional Blue
  "#1e3a8a", // Navy Blue
  "#3b82f6", // Standard Blue
  "#60a5fa", // Soft Blue
  "#93c5fd", // Pale Blue
];

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

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
}> = ({ title, value, subtitle, icon }) => (
  <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
    <View style={styles.metricLeft}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
    <View style={[styles.metricIcon, { backgroundColor: NAVBAR_COLORS.bg }]}>
      <Icon
        name={icon}
        size={isMobile ? 20 : 24}
        color={NAVBAR_COLORS.primary}
      />
    </View>
  </View>
);

const TopPerformerCard: React.FC<{
  rank: number;
  name: string;
  score: number;
  department: string;
}> = ({ rank, name, score, department }) => (
  <View style={styles.topPerformerCard}>
    <View
      style={[styles.rankBadge, { backgroundColor: NAVBAR_COLORS.primary }]}
    >
      <Text style={styles.rankText}>{rank}</Text>
    </View>
    <View style={styles.performerInfo}>
      <Text style={styles.performerName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.performerDept}>{department}</Text>
    </View>
    <View style={styles.performerScoreContainer}>
      <Text style={styles.performerScore}>{score}%</Text>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${score}%`, backgroundColor: NAVBAR_COLORS.secondary },
          ]}
        />
      </View>
    </View>
  </View>
);

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
  const [selectedSpeed, setSelectedSpeed] = useState(carouselSpeed);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayRef = useRef<any>(null);

  const avgResponseScore = allResponses.length
    ? (
        allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) /
        allResponses.length
      ).toFixed(1)
    : "0.0";

  const totalAudits = allSchedules.filter((s) => s.scheduledDate).length;
  const momImprovement = 8;
  const overdueAudits = allSchedules.filter((s) => {
    if (!s.scheduledDate) return false;
    return (
      new Date(s.scheduledDate as string) < new Date() &&
      s.status !== "COMPLETED" &&
      s.status !== "REJECTED"
    );
  }).length;

  // Centered Carousel Math (1/2 width on tablet, 80% on mobile)
  const cardWidth = isMobile ? width * 0.8 : width * 0.5;
  const itemSpacing = 20;
  const horizontalPadding = (width - cardWidth) / 2;
  const chartInnerWidth = cardWidth - 32; // Accounts for 16px padding inside the card

  const lineChartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalCount: 0,
    color: (opacity = 1) => NAVBAR_COLORS.primary,
    labelColor: (opacity = 1) => "#6B7280",
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: NAVBAR_COLORS.primary },
  };
  const barChartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalCount: 0,
    color: (opacity = 1) => NAVBAR_COLORS.primary,
    labelColor: (opacity = 1) => "#6B7280",
    style: { borderRadius: 16 },
    barPercentage: 0.5,
  };

  const approvalTrendData = React.useMemo(() => {
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
        (s) => s.approvalStatus === "APPROVED" || s.status === "APPROVED",
      ).length;
      const monthResponses = allResponses.filter((r) => {
        if (!r.submittedAt && !r.createdAt) return false;
        const d = r.submittedAt
          ? new Date(r.submittedAt as string)
          : new Date(r.createdAt as string);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const responsesApproved = monthResponses.filter(
        (r) => r.status === "APPROVED",
      ).length;
      months.push({ month: monthStr, approved: approved + responsesApproved });
    }
    return months;
  }, [allSchedules, allResponses]);

  const departmentPerformanceData = React.useMemo(() => {
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

  const auditorPerformanceData = React.useMemo(() => {
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
            100,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [allSchedules]);

  const monthlyPerformanceData = React.useMemo(() => {
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

  const auditStatusDistributionData = React.useMemo(
    () =>
      [
        { name: "Sch", value: stats.scheduled || 0 },
        { name: "Prog", value: stats.inProgress || 0 },
        { name: "Comp", value: stats.completedSchedules || 0 },
        { name: "Appr", value: stats.approved || 0 },
        { name: "Rej", value: stats.rejected || 0 },
      ].filter((s) => s.value > 0),
    [stats],
  );

  const responseStatusDistributionData = React.useMemo(
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
    [allResponses],
  );

  // PIE CHART DATA (Strictly Blue Shades)
  const ncrSeverityPieData = React.useMemo(() => {
    const data = [
      {
        name: "Critical",
        population: stats.criticalNCRs || 0,
        color: BLUE_SHADES[0],
        legendFontColor: "#6B7280",
        legendFontSize: 11,
      },
      {
        name: "Major",
        population: stats.majorNCRs || 0,
        color: BLUE_SHADES[1],
        legendFontColor: "#6B7280",
        legendFontSize: 11,
      },
      {
        name: "Minor",
        population: stats.minorNCRs || 0,
        color: BLUE_SHADES[2],
        legendFontColor: "#6B7280",
        legendFontSize: 11,
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
            legendFontSize: 11,
          },
        ];
  }, [stats]);

  const auditStatusPieData = React.useMemo(() => {
    const data = auditStatusDistributionData.map((d, i) => ({
      name: d.name,
      population: d.value,
      color: BLUE_SHADES[i % BLUE_SHADES.length],
      legendFontColor: "#6B7280",
      legendFontSize: 11,
    }));
    return data.length > 0
      ? data
      : [
          {
            name: "None",
            population: 1,
            color: "#E5E7EB",
            legendFontColor: "#6B7280",
            legendFontSize: 11,
          },
        ];
  }, [auditStatusDistributionData]);

  const responseStatusPieData = React.useMemo(() => {
    const data = responseStatusDistributionData.map((d, i) => ({
      name: d.name,
      population: d.value,
      color: BLUE_SHADES[i % BLUE_SHADES.length],
      legendFontColor: "#6B7280",
      legendFontSize: 11,
    }));
    return data.length > 0
      ? data
      : [
          {
            name: "None",
            population: 1,
            color: "#E5E7EB",
            legendFontColor: "#6B7280",
            legendFontSize: 11,
          },
        ];
  }, [responseStatusDistributionData]);

  const scoreDistributionData = React.useMemo(() => {
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

  const weeklyActivityData = React.useMemo(() => {
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

  const topAuditors = React.useMemo(
    () => auditorPerformanceData.slice(0, 3),
    [auditorPerformanceData],
  );

  const alerts = [];
  if (stats.pendingApproval > 0)
    alerts.push({
      message: `${stats.pendingApproval} audit(s) pending approval`,
      time: "Urgent",
      icon: "clock",
    });
  if (overdueAudits > 0)
    alerts.push({
      message: `${overdueAudits} overdue audit(s) need attention`,
      time: "Overdue",
      icon: "alert-triangle",
    });
  if (stats.criticalNCRs > 0)
    alerts.push({
      message: `${stats.criticalNCRs} critical NCR(s) require immediate action`,
      time: "High Priority",
      icon: "alert-circle",
    });
  if (stats.responsesSubmitted > 0)
    alerts.push({
      message: `${stats.responsesSubmitted} response(s) waiting for review`,
      time: "Pending",
      icon: "file-text",
    });

  const speedOptions = [
    { label: "3s", value: 3000 },
    { label: "5s", value: 5000 },
    { label: "7s", value: 7000 },
    { label: "10s", value: 10000 },
  ];

  const NoData = () => (
    <View style={styles.noDataPlaceholder}>
      <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
      <Text style={styles.noDataText}>No data available</Text>
    </View>
  );

  const chartSlides = [
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
          width={chartInnerWidth}
          height={220}
          chartConfig={lineChartConfig}
          bezier
          style={styles.chart}
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
      component:
        stats.totalNCRs > 0 ? (
          <PieChart
            data={ncrSeverityPieData}
            width={chartInnerWidth}
            height={220}
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
      component:
        departmentPerformanceData.length > 0 ? (
          <BarChart
            data={{
              labels: departmentPerformanceData.map((d) => d.name),
              datasets: [
                {
                  data: departmentPerformanceData.map((d) => d.completionRate),
                },
              ],
            }}
            width={chartInnerWidth}
            height={220}
            chartConfig={barChartConfig}
            style={styles.chart}
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
      component:
        auditorPerformanceData.length > 0 ? (
          <LineChart
            data={{
              labels: auditorPerformanceData.map((d) => d.name),
              datasets: [{ data: auditorPerformanceData.map((d) => d.score) }],
            }}
            width={chartInnerWidth}
            height={220}
            chartConfig={lineChartConfig}
            bezier
            style={styles.chart}
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
          width={chartInnerWidth}
          height={220}
          chartConfig={lineChartConfig}
          bezier
          style={styles.chart}
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
      component:
        auditStatusPieData[0].name !== "None" ? (
          <PieChart
            data={auditStatusPieData}
            width={chartInnerWidth}
            height={220}
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
      component:
        responseStatusPieData[0].name !== "None" ? (
          <PieChart
            data={responseStatusPieData}
            width={chartInnerWidth}
            height={220}
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
          width={chartInnerWidth}
          height={220}
          chartConfig={barChartConfig}
          style={styles.chart}
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
          width={chartInnerWidth}
          height={220}
          chartConfig={lineChartConfig}
          bezier
          style={styles.chart}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <NoData />
      ),
    },
  ];

  useEffect(() => {
    if (isAutoPlaying && chartSlides.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setActiveChartIndex((prev) => {
          const nextIndex = (prev + 1) % chartSlides.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * (cardWidth + itemSpacing),
            animated: true,
          });
          return nextIndex;
        });
      }, carouselSpeed);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, carouselSpeed, chartSlides.length, cardWidth]);

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const roundIndex = Math.round(offset / (cardWidth + itemSpacing));
    setActiveChartIndex((prev) => (prev !== roundIndex ? roundIndex : prev));
  };

  const goToSlide = (index: number) => {
    setActiveChartIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * (cardWidth + itemSpacing),
      animated: true,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.metricsGrid}>
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

      <View style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <View>
            <Text style={styles.analyticsTitle}>Analytics Dashboard</Text>
            <Text style={styles.analyticsSubtitle}>
              Real-time audit performance metrics
            </Text>
          </View>
          <View style={styles.analyticsControls}>
            <View style={styles.speedSelector}>
              {speedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.speedOption,
                    selectedSpeed === option.value && {
                      backgroundColor: NAVBAR_COLORS.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedSpeed(option.value);
                    setCarouselSpeed(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.speedOptionText,
                      selectedSpeed === option.value && { color: "#FFFFFF" },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.refreshButton,
                { backgroundColor: NAVBAR_COLORS.primary },
              ]}
              onPress={onRefresh}
            >
              <Icon name="refresh-cw" size={16} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={cardWidth + itemSpacing}
            contentContainerStyle={{
              paddingHorizontal: horizontalPadding,
              alignItems: "center",
            }}
            style={styles.chartsScroll}
          >
            {chartSlides.map((slide, index) => (
              <View
                key={slide.id}
                style={{
                  width: cardWidth,
                  marginRight:
                    index === chartSlides.length - 1 ? 0 : itemSpacing,
                }}
              >
                <View style={styles.chartWrapper}>
                  <View style={styles.chartHeader}>
                    <View
                      style={[
                        styles.chartIconContainer,
                        { backgroundColor: NAVBAR_COLORS.bg },
                      ]}
                    >
                      <Icon
                        name={slide.icon}
                        size={16}
                        color={NAVBAR_COLORS.primary}
                      />
                    </View>
                    <Text style={styles.chartTitle}>{slide.title}</Text>
                  </View>
                  <View style={styles.chartBody}>{slide.component}</View>
                </View>
              </View>
            ))}
          </ScrollView>

          {chartSlides.length > 1 && (
            <View style={styles.carouselControls}>
              <View style={styles.paginationDots}>
                {chartSlides.map((_, idx) => (
                  <TouchableOpacity key={idx} onPress={() => goToSlide(idx)}>
                    <View
                      style={[
                        styles.dot,
                        activeChartIndex === idx && styles.dotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.playPauseButton}
                onPress={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                <Icon
                  name={isAutoPlaying ? "pause" : "play"}
                  size={14}
                  color={NAVBAR_COLORS.primary}
                />
                <Text style={styles.playPauseText}>
                  {isAutoPlaying ? "Pause" : "Play"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.bottomGrid}>
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: NAVBAR_COLORS.bg },
              ]}
            >
              <Icon name="target" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={styles.insightTitle}>Key Insights</Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Month-over-Month</Text>
              <Text style={[styles.insightItemValue, { color: "#22C55E" }]}>
                +{momImprovement}%
              </Text>
            </View>
            <Text style={styles.insightItemDesc}>
              Compared to previous month
            </Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Quality Score</Text>
              <Text style={[styles.insightItemValue, { color: "#22C55E" }]}>
                {Math.round(
                  (stats.responsesApproved /
                    (stats.responsesApproved + stats.responsesRejected || 1)) *
                    100,
                )}
                %
              </Text>
            </View>
            <Text style={styles.insightItemDesc}>Response quality rating</Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Audit Efficiency</Text>
              <Text style={[styles.insightItemValue, { color: "#22C55E" }]}>
                {stats.totalSchedules
                  ? Math.round(
                      (stats.completedSchedules / stats.totalSchedules) * 100,
                    )
                  : 0}
                %
              </Text>
            </View>
            <Text style={styles.insightItemDesc}>
              Audit completion efficiency
            </Text>
          </View>
        </View>

        <View style={styles.topPerformersCard}>
          <View style={styles.insightHeader}>
            <View
              style={[
                styles.insightIcon,
                { backgroundColor: NAVBAR_COLORS.bg },
              ]}
            >
              <Icon name="award" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={styles.insightTitle}>Top Performers</Text>
          </View>
          <ScrollView
            style={styles.performersScroll}
            showsVerticalScrollIndicator={false}
          >
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
              <View style={styles.noDataPlaceholder}>
                <Icon name="users" size={30} color="#CBD5E1" />
                <Text style={styles.noDataText}>No auditor data available</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View
              style={[styles.alertIcon, { backgroundColor: NAVBAR_COLORS.bg }]}
            >
              <Icon
                name="alert-circle"
                size={16}
                color={NAVBAR_COLORS.primary}
              />
            </View>
            <Text style={styles.alertTitle}>Alerts & Notifications</Text>
            {alerts.length > 0 && (
              <View
                style={[
                  styles.alertBadge,
                  { backgroundColor: NAVBAR_COLORS.primary },
                ]}
              >
                <Text style={styles.alertBadgeText}>{alerts.length}</Text>
              </View>
            )}
          </View>
          <ScrollView
            style={styles.alertScroll}
            showsVerticalScrollIndicator={false}
          >
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <View key={idx} style={styles.alertItem}>
                  <View
                    style={[
                      styles.alertItemIcon,
                      { backgroundColor: NAVBAR_COLORS.bg },
                    ]}
                  >
                    <Icon
                      name={alert.icon}
                      size={14}
                      color={NAVBAR_COLORS.primary}
                    />
                  </View>
                  <View style={styles.alertItemContent}>
                    <Text style={styles.alertItemMessage}>{alert.message}</Text>
                    <Text style={styles.alertItemTime}>{alert.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noAlerts}>
                <Icon name="check-circle" size={40} color="#22C55E" />
                <Text style={styles.noAlertsText}>No pending alerts</Text>
                <Text style={styles.noAlertsSubtext}>
                  All systems running smoothly
                </Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.alertStats}>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatLabel}>Active Audits</Text>
              <Text
                style={[
                  styles.alertStatValue,
                  { color: NAVBAR_COLORS.primary },
                ]}
              >
                {stats.inProgress || 0}
              </Text>
            </View>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatLabel}>Open NCRs</Text>
              <Text style={styles.alertStatValue}>{stats.openNCRs || 0}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: isMobile ? "45%" : "22%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: isMobile ? 12 : 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricCardMobile: { minWidth: "45%", padding: 10 },
  metricLeft: { flex: 1 },
  metricLabel: { fontSize: isMobile ? 11 : 14, color: "#6B7280" },
  metricValue: {
    fontSize: isMobile ? 18 : 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
  },
  metricSubtitle: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  metricIcon: { padding: isMobile ? 8 : 12, borderRadius: 8 },
  analyticsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  analyticsHeader: {
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "flex-start" : "center",
    gap: 12,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: isMobile ? 16 : 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  analyticsSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  analyticsControls: {
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    gap: 8,
    width: isMobile ? "100%" : "auto",
  },
  speedSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
  },
  speedOption: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  speedOptionText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "500" },
  carouselContainer: { marginTop: 8 },
  chartsScroll: { flexGrow: 0 },
  chartWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    alignItems: "center",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  chartIconContainer: { padding: 8, borderRadius: 8 },
  chartTitle: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  chartBody: { width: "100%", alignItems: "center", justifyContent: "center" },
  chart: { marginVertical: 8, borderRadius: 16 },
  carouselControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  paginationDots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CBD5E1" },
  dotActive: { width: 24, backgroundColor: NAVBAR_COLORS.primary },
  playPauseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  playPauseText: { fontSize: 12, fontWeight: "500", color: "#475569" },
  noDataPlaceholder: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  noDataText: { color: "#9CA3AF", fontSize: 14, marginTop: 8 },
  bottomGrid: {
    flexDirection: isMobile ? "column" : "row",
    gap: 16,
    marginBottom: 20,
  },
  insightCard: {
    flex: isMobile ? 1 : 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  insightIcon: { padding: 6, borderRadius: 8 },
  insightTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  insightItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  insightItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  insightItemTitle: { fontSize: 13, color: "#6B7280" },
  insightItemValue: { fontSize: 16, fontWeight: "bold" },
  insightItemDesc: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  topPerformersCard: {
    flex: isMobile ? 1 : 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginTop: isMobile ? 16 : 0,
  },
  performersScroll: { maxHeight: 220 },
  topPerformerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
  performerInfo: { flex: 1 },
  performerName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  performerDept: { fontSize: 12, color: "#64748B", marginTop: 2 },
  performerScoreContainer: { alignItems: "flex-end" },
  performerScore: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  progressBarBg: {
    width: 64,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },
  alertCard: {
    flex: isMobile ? 1 : 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginTop: isMobile ? 16 : 0,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertIcon: { padding: 6, borderRadius: 8 },
  alertTitle: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: "auto",
  },
  alertBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  alertScroll: { maxHeight: 180, marginBottom: 12 },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  alertItemIcon: { padding: 6, borderRadius: 8 },
  alertItemContent: { flex: 1 },
  alertItemMessage: { fontSize: 13, color: "#1F2937" },
  alertItemTime: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  noAlerts: { alignItems: "center", paddingVertical: 20 },
  noAlertsText: { fontSize: 14, color: "#1F2937", marginTop: 8 },
  noAlertsSubtext: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  alertStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  alertStatItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  alertStatLabel: { fontSize: 11, color: "#6B7280" },
  alertStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
  },
});

export default DashboardAnalytics;
