// app/components/dashboards/LeadAuditor/DashboardAnalytics.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/Feather";

// ============================================================================
// COLOR PALETTE
// ============================================================================
const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

// ============================================================================
// CARD COMPONENT
// ============================================================================
const Card = ({ children, style = {} }: any) => (
  <View
    style={[
      {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      },
      style,
    ]}
  >
    {children}
  </View>
);

// ============================================================================
// RESPONSIVE CHART COMPONENT (Fixed Width)
// ============================================================================
// ============================================================================
// RESPONSIVE CHART COMPONENT (Fixed for TypeScript)
// ============================================================================
const ResponsiveLineChart = ({ 
  data, 
  height = 220,
  suffix = "",
  bezier = true,
}: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  // Calculate chart width properly
  const containerPadding = isMobile ? 8 : 16; // Screen padding
  const cardPadding = isMobile ? 16 : 24; // Card inner padding
  const chartMargin = 8; // Extra margin
  
  const chartWidth = Math.max(width - containerPadding * 2 - cardPadding - chartMargin, 200);

  // @ts-ignore - Suppress chartConfig type error
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(0, 82, 155, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#00529B" },
    propsForBackgroundLines: { strokeDasharray: "3 3", stroke: "#E2E8F0" },
    fillShadowGradient: "#00529B",
    fillShadowGradientOpacity: 0.15,
  };

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* @ts-ignore - Suppress LineChart props type error */}
      <LineChart
        data={data}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        bezier={bezier}
        style={{ 
          marginVertical: 8, 
          borderRadius: 12,
          alignSelf: "center",
        }}
        fromZero
        withShadow={false}
        withInnerLines={true}
        yAxisLabel=""
        yAxisSuffix={suffix}
      />
      
      {/* Legend */}
      {data.legend && data.legend.length > 0 && (
        <View style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 8,
          justifyContent: "center",
          width: "100%",
        }}>
          {data.legend.map((label: string, idx: number) => {
            const color = typeof data.datasets[idx]?.color === "function" 
              ? data.datasets[idx].color(1) 
              : NAVBAR_COLORS.primary;
            return (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={{ fontSize: 9, color: "#64748B", fontWeight: "500" }}>{label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// METRIC CARD
// ============================================================================
const MetricCard = ({ title, value, subtitle, iconName }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  return (
    <Card 
      style={{ 
        flex: 1, 
        minWidth: isMobile ? 140 : 180,
        padding: isMobile ? 10 : 14,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text style={{ fontSize: isMobile ? 10 : 13, color: "#64748B", fontWeight: "500" }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ fontSize: isMobile ? 18 : 22, fontWeight: "bold", color: "#1E293B", marginTop: 2 }}>
            {value}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: isMobile ? 8 : 11, color: "#94A3B8", marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ padding: 8, borderRadius: 10, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name={iconName} size={isMobile ? 16 : 20} color={NAVBAR_COLORS.primary} />
        </View>
      </View>
    </Card>
  );
};

// ============================================================================
// INSIGHT CARD
// ============================================================================
const InsightCard = ({ title, value, iconName, description, trend }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  return (
    <View style={{ 
      padding: isMobile ? 8 : 12, 
      marginBottom: isMobile ? 4 : 8,
      backgroundColor: "#F8FAFC",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#F1F5F9",
    }}>
      <View style={{ flexDirection: "row", gap: isMobile ? 6 : 10 }}>
        <View style={{ 
          padding: isMobile ? 5 : 8, 
          borderRadius: 8, 
          backgroundColor: NAVBAR_COLORS.bg,
          alignSelf: "flex-start",
        }}>
          <Icon name={iconName} size={isMobile ? 12 : 16} color={NAVBAR_COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ fontSize: isMobile ? 10 : 13, fontWeight: "600", color: "#334155" }} numberOfLines={1}>
              {title}
            </Text>
            {trend !== undefined && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Icon name={trend > 0 ? "trending-up" : "trending-down"} size={10} color={trend > 0 ? "#059669" : "#64748B"} />
                <Text style={{ fontSize: 9, fontWeight: "600", color: trend > 0 ? "#059669" : "#64748B" }}>
                  {trend !== 0 ? `${Math.abs(trend)}%` : "0%"}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: isMobile ? 14 : 18, fontWeight: "bold", color: "#1E293B", marginTop: 2 }}>
            {value}
          </Text>
          <Text style={{ fontSize: isMobile ? 8 : 10, color: "#64748B", marginTop: 2 }} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TOP PERFORMER CARD
// ============================================================================
const TopPerformerCard = ({ rank, name, score, department }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: isMobile ? 8 : 10,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        marginBottom: 6,
      }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: NAVBAR_COLORS.primary }}>
        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 11 : 13, fontWeight: "600", color: "#1E293B" }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: isMobile ? 8 : 11, color: "#64748B", marginTop: 1 }}>{department}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: isMobile ? 11 : 13, fontWeight: "bold", color: "#1E293B" }}>{score}%</Text>
        <View style={{ width: isMobile ? 35 : 50, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
          <View style={{ width: `${score}%`, height: "100%", backgroundColor: NAVBAR_COLORS.secondary, borderRadius: 2 }} />
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// ALERT ITEM
// ============================================================================
const AlertItem = ({ message, time, iconName }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: isMobile ? 8 : 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View style={{ padding: 5, borderRadius: 6, backgroundColor: NAVBAR_COLORS.bg }}>
        <Icon name={iconName} size={12} color={NAVBAR_COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 10 : 12, color: "#334155" }}>{message}</Text>
        <Text style={{ fontSize: isMobile ? 8 : 10, color: "#94A3B8", marginTop: 2 }}>{time}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// CHART CAROUSEL - One chart at a time (No horizontal scroll issues)
// ============================================================================
const ChartCarousel = ({ slides, autoPlayInterval = 5000 }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<any>(null);

  useEffect(() => {
    if (isAutoPlaying && slides.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, autoPlayInterval);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* Current Slide */}
      <View style={{ width: "100%" }}>
        <Card style={{ width: "100%", overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 12 }}>
            <View style={{ padding: 6, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
              <Icon name={slides[currentIndex].icon} size={14} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B", flexShrink: 1 }} numberOfLines={1}>
              {slides[currentIndex].title}
            </Text>
          </View>
          <View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
            {slides[currentIndex].component}
          </View>
        </Card>
      </View>

      {/* Pagination */}
      {slides.length > 1 && (
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          justifyContent: "space-between", 
          width: "100%",
          marginTop: 12,
          flexWrap: "wrap",
          gap: 8,
        }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {slides.map((_: any, idx: number) => (
              <TouchableOpacity key={idx} onPress={() => setCurrentIndex(idx)} style={{ padding: 3 }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: currentIndex === idx ? NAVBAR_COLORS.primary : "#CBD5E1",
                    width: currentIndex === idx ? 24 : 6,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setIsAutoPlaying(!isAutoPlaying)}
            style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              gap: 5, 
              paddingHorizontal: 10, 
              paddingVertical: 5, 
              borderRadius: 6, 
              borderWidth: 1, 
              borderColor: "#E2E8F0", 
              backgroundColor: "#FFFFFF",
            }}
          >
            <Icon name={isAutoPlaying ? "pause" : "play"} size={12} color={NAVBAR_COLORS.primary} />
            <Text style={{ fontSize: 11, fontWeight: "500", color: "#475569" }}>
              {isAutoPlaying ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// TYPES (Keep same)
// ============================================================================
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
  auditorName?: string;
  leadAuditorName?: string;
  scheduledDate?: string;
  status?: string;
  approvalStatus?: string;
}

interface NCR {
  id: string | number;
  createdAt?: string;
}

interface Response {
  id: string | number;
  status?: string;
  percentageScore?: number;
  submittedAt?: string;
  createdAt?: string;
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  stats,
  allSchedules,
  allNCRs,
  allResponses,
  carouselSpeed,
  setCarouselSpeed,
  onRefresh,
  refreshing,
  leadAuditorDepartment,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Data calculation functions (keep same as before)
  const getApprovalTrend = useMemo(() => {
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
      const approved = monthSchedules.filter((s) => s.approvalStatus === "APPROVED" || s.status === "APPROVED").length;
      const rejected = monthSchedules.filter((s) => s.approvalStatus === "REJECTED" || s.status === "REJECTED").length;
      const pending = monthSchedules.filter((s) => s.approvalStatus === "SUBMITTED" || s.approvalStatus === "PENDING" || s.status === "SUBMITTED").length;
      const monthResponses = allResponses.filter((r) => {
        const dateStr = r.submittedAt || r.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr as string);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const responsesApproved = monthResponses.filter((r) => r.status === "APPROVED").length;
      const responsesRejected = monthResponses.filter((r) => r.status === "REJECTED").length;
      months.push({ month: monthStr, approved: approved + responsesApproved, rejected: rejected + responsesRejected, pending });
    }
    return months;
  }, [allSchedules, allResponses]);

  const getDepartmentPerformance = useMemo(() => {
    const deptMap = new Map<string, { total: number; completed: number; approved: number }>();
    allSchedules.forEach((s) => {
      const dept = s.department || "Unknown";
      if (!deptMap.has(dept)) deptMap.set(dept, { total: 0, completed: 0, approved: 0 });
      const data = deptMap.get(dept)!;
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
      if (s.approvalStatus === "APPROVED") data.approved++;
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({
        name: name.length > 10 ? name.substring(0, 8) + ".." : name,
        total: data.total,
        completionRate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
        approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [allSchedules]);

  const getAuditorPerformance = useMemo(() => {
    const auditorMap = new Map<string, { total: number; completed: number; approved: number }>();
    allSchedules.forEach((s) => {
      const auditorName = s.auditorName || s.leadAuditorName;
      if (!auditorName) return;
      if (!auditorMap.has(auditorName)) auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0 });
      const data = auditorMap.get(auditorName)!;
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
      if (s.approvalStatus === "APPROVED") data.approved++;
    });
    return Array.from(auditorMap.entries())
      .map(([name, data]) => ({
        name: name.split(" ")[0],
        total: data.total,
        score: Math.round(((data.completed / (data.total || 1)) * 0.5 + (data.approved / (data.total || 1)) * 0.5) * 100),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [allSchedules]);

  const getMonthlyPerformance = useMemo(() => {
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
      const schedulesInMonth = allSchedules.filter((s) => {
        if (!s.scheduledDate) return false;
        const d = new Date(s.scheduledDate as string);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      });
      const ncrCount = allNCRs.filter((n) => {
        if (!n.createdAt) return false;
        const d = new Date(n.createdAt as string);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      }).length;
      months.push({ month: monthName, audits: schedulesInMonth.length, completedAudits: schedulesInMonth.filter((s) => s.status === "COMPLETED").length, ncrs: ncrCount });
    }
    return months;
  }, [allSchedules, allNCRs]);

  const getAuditStatusDistribution = useMemo(() => [
    { name: "Sch", value: stats.scheduled || 0 },
    { name: "Prog", value: stats.inProgress || 0 },
    { name: "Comp", value: stats.completedSchedules || 0 },
    { name: "Appr", value: stats.approved || 0 },
    { name: "Rej", value: stats.rejected || 0 },
  ].filter((s) => s.value > 0), [stats]);

  const getResponseStatusDistribution = useMemo(() => {
    const approved = allResponses.filter((r) => r.status === "APPROVED").length;
    const rejected = allResponses.filter((r) => r.status === "REJECTED").length;
    const submitted = allResponses.filter((r) => r.status === "SUBMITTED").length;
    const draft = allResponses.filter((r) => !r.status || r.status === "DRAFT").length;
    return [
      { name: "Appr", value: approved },
      { name: "Rej", value: rejected },
      { name: "Sub", value: submitted },
      { name: "Draft", value: draft },
    ].filter((s) => s.value > 0);
  }, [allResponses]);

  const getScoreDistribution = useMemo(() => {
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
        if (score >= range.min && score <= range.max) { range.count++; break; }
      }
    });
    return ranges;
  }, [allResponses]);

  const getWeeklyActivity = useMemo(() => {
    const weeks = [];
    const today = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekLabel = `W${Math.floor(weekStart.getDate() / 7 + 1)}`;
      const weekSchedules = allSchedules.filter((s) => {
        if (!s.scheduledDate) return false;
        const d = new Date(s.scheduledDate);
        return d >= weekStart && d <= weekEnd;
      });
      weeks.push({
        week: weekLabel,
        audits: weekSchedules.length,
        completed: weekSchedules.filter((s) => s.status === "COMPLETED").length,
        ncrs: allNCRs.filter((n) => {
          if (!n.createdAt) return false;
          const d = new Date(n.createdAt);
          return d >= weekStart && d <= weekEnd;
        }).length,
      });
    }
    return weeks;
  }, [allSchedules, allNCRs]);

  const avgResponseScore = allResponses.length
    ? (allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / allResponses.length).toFixed(1)
    : "0.0";

  const topAuditors = getAuditorPerformance.slice(0, 3);

  const getMoMImprovement = () => {
    if (getMonthlyPerformance.length < 2) return 0;
    const lastMonth = getMonthlyPerformance[getMonthlyPerformance.length - 1];
    const prevMonth = getMonthlyPerformance[getMonthlyPerformance.length - 2];
    if (prevMonth.completedAudits === 0) return 0;
    return Math.round(((lastMonth.completedAudits - prevMonth.completedAudits) / prevMonth.completedAudits) * 100);
  };
  const momImprovement = getMoMImprovement();

  const getScheduledAuditsCount = () => allSchedules.filter((s) => {
    if (!s.scheduledDate) return false;
    return ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "APPROVED", "REJECTED"].includes(s.status || "");
  }).length;

  const overdueAudits = allSchedules.filter((s) => {
    if (!s.scheduledDate) return false;
    return new Date(s.scheduledDate) < new Date() && s.status !== "COMPLETED" && s.status !== "REJECTED";
  }).length;

  const alerts = [];
  if (stats.pendingApproval > 0) alerts.push({ message: `${stats.pendingApproval} audit(s) pending approval`, time: "Urgent", iconName: "clock" });
  if (overdueAudits > 0) alerts.push({ message: `${overdueAudits} overdue audit(s) need attention`, time: "Overdue", iconName: "alert-triangle" });
  if (stats.criticalNCRs > 0) alerts.push({ message: `${stats.criticalNCRs} critical NCR(s) require immediate action`, time: "High Priority", iconName: "alert-circle" });
  if (stats.responsesSubmitted > 0) alerts.push({ message: `${stats.responsesSubmitted} response(s) waiting for review`, time: "Pending", iconName: "file-text" });

  // Chart Slides - One at a time, fully visible
  const chartSlides = useMemo(() => [
    {
      title: "Approval Trend (6 Mo)",
      icon: "trending-up",
      component: getApprovalTrend.some((d: any) => d.approved > 0) ? (
        <ResponsiveLineChart data={{ labels: getApprovalTrend.map((d: any) => d.month), datasets: [
          { data: getApprovalTrend.map((d: any) => d.approved), color: () => NAVBAR_COLORS.primary },
        ], legend: ["Approved"] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Department Performance",
      icon: "briefcase",
      component: getDepartmentPerformance.length > 0 ? (
        <ResponsiveLineChart data={{ labels: getDepartmentPerformance.map((d: any) => d.name), datasets: [
          { data: getDepartmentPerformance.map((d: any) => d.completionRate), color: () => NAVBAR_COLORS.primary },
        ], legend: ["Completion %"] }} height={isMobile ? 180 : 240} suffix="%" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Auditor Performance",
      icon: "users",
      component: getAuditorPerformance.length > 0 ? (
        <ResponsiveLineChart data={{ labels: getAuditorPerformance.map((d: any) => d.name), datasets: [
          { data: getAuditorPerformance.map((d: any) => d.score), color: () => NAVBAR_COLORS.primary },
        ], legend: ["Score"] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Monthly Performance",
      icon: "activity",
      component: getMonthlyPerformance.some((d: any) => d.completedAudits > 0) ? (
        <ResponsiveLineChart data={{ labels: getMonthlyPerformance.map((d: any) => d.month), datasets: [
          { data: getMonthlyPerformance.map((d: any) => d.completedAudits), color: () => NAVBAR_COLORS.primary },
        ], legend: ["Completed"] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Audit Status",
      icon: "alert-circle",
      component: getAuditStatusDistribution.length > 0 ? (
        <ResponsiveLineChart data={{ labels: getAuditStatusDistribution.map((d: any) => d.name), datasets: [
          { data: getAuditStatusDistribution.map((d: any) => d.value), color: () => NAVBAR_COLORS.primary },
        ] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Response Status",
      icon: "file-text",
      component: getResponseStatusDistribution.length > 0 ? (
        <ResponsiveLineChart data={{ labels: getResponseStatusDistribution.map((d: any) => d.name), datasets: [
          { data: getResponseStatusDistribution.map((d: any) => d.value), color: () => NAVBAR_COLORS.secondary },
        ] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Score Distribution",
      icon: "bar-chart-2",
      component: getScoreDistribution.some((d: any) => d.count > 0) ? (
        <ResponsiveLineChart data={{ labels: getScoreDistribution.map((d: any) => d.range), datasets: [
          { data: getScoreDistribution.map((d: any) => d.count), color: () => NAVBAR_COLORS.primary },
        ] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
    {
      title: "Weekly Activity",
      icon: "activity",
      component: getWeeklyActivity.some((d: any) => d.completed > 0) ? (
        <ResponsiveLineChart data={{ labels: getWeeklyActivity.map((d: any) => d.week), datasets: [
          { data: getWeeklyActivity.map((d: any) => d.completed), color: () => NAVBAR_COLORS.primary },
        ], legend: ["Completed"] }} height={isMobile ? 180 : 240} suffix="" />
      ) : (
        <View style={{ height: 180, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={32} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>No data</Text>
        </View>
      ),
    },
  ], [getApprovalTrend, getDepartmentPerformance, getAuditorPerformance, getMonthlyPerformance, getAuditStatusDistribution, getResponseStatusDistribution, getScoreDistribution, getWeeklyActivity, isMobile]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F8FAFC" }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ paddingHorizontal: isMobile ? 8 : 16, paddingTop: 12, maxWidth: 1000, width: "100%", alignSelf: "center" }}>
        
        {/* Key Metrics Cards */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: isMobile ? 6 : 10, marginBottom: 16 }}>
          <MetricCard title="Total Audits" value={getScheduledAuditsCount()} subtitle="scheduled" iconName="calendar" />
          <MetricCard title="Total NCRs" value={stats.totalNCRs} subtitle="non-conf." iconName="alert-triangle" />
          <MetricCard title="Approval" value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`} subtitle="approved" iconName="thumbs-up" />
          <MetricCard title="Avg Score" value={`${avgResponseScore}%`} subtitle="average" iconName="bar-chart-2" />
        </View>

        {/* Chart Dashboard */}
        <Card style={{ marginBottom: 16, padding: isMobile ? 8 : 12 }}>
          <View style={{ flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 8, marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#1E293B" }}>Analytics</Text>
              <Text style={{ fontSize: isMobile ? 10 : 12, color: "#64748B", marginTop: 2 }}>Performance metrics</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 6, padding: 2 }}>
                {[3000, 5000, 7000, 10000].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    onPress={() => setCarouselSpeed(speed)}
                    style={{
                      paddingHorizontal: isMobile ? 6 : 10,
                      paddingVertical: 4,
                      borderRadius: 5,
                      backgroundColor: carouselSpeed === speed ? NAVBAR_COLORS.primary : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: isMobile ? 9 : 11, color: carouselSpeed === speed ? "#FFFFFF" : "#64748B", fontWeight: "500" }}>
                      {speed / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={onRefresh}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: NAVBAR_COLORS.primary }}
              >
                <Icon name="refresh-cw" size={12} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "600" }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ChartCarousel slides={chartSlides} autoPlayInterval={carouselSpeed} />
        </Card>

        {/* Bottom Section - Stacked */}
        <View style={{ flexDirection: "column", gap: 10, width: "100%" }}>
          
          {/* Key Insights */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ padding: 6, borderRadius: 6, backgroundColor: NAVBAR_COLORS.bg }}>
                <Icon name="target" size={14} color={NAVBAR_COLORS.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>Key Insights</Text>
            </View>
            <View style={{ gap: 4 }}>
              <InsightCard title="Month-over-Month" value={`${momImprovement > 0 ? "+" : ""}${momImprovement}%`} iconName="trending-up" description="vs previous month" trend={momImprovement} />
              <InsightCard title="Quality Score" value={`${Math.round((stats.responsesApproved / (stats.responsesApproved + stats.responsesRejected || 1)) * 100)}%`} iconName="shield" description="Response quality" trend={5} />
              <InsightCard title="Audit Efficiency" value={`${stats.totalSchedules ? Math.round((stats.completedSchedules / stats.totalSchedules) * 100) : 0}%`} iconName="zap" description="Completion efficiency" trend={8} />
            </View>
          </Card>

          {/* Top Performers */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ padding: 6, borderRadius: 6, backgroundColor: NAVBAR_COLORS.bg }}>
                <Icon name="award" size={14} color={NAVBAR_COLORS.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>Top Performers</Text>
            </View>
            {topAuditors.length > 0 ? (
              topAuditors.map((auditor: any, idx: number) => (
                <TopPerformerCard key={idx} rank={idx + 1} name={auditor.name} score={auditor.score} department="Auditor" />
              ))
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Icon name="users" size={24} color="#CBD5E1" />
                <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>No data</Text>
              </View>
            )}
          </Card>

          {/* Alerts */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ padding: 6, borderRadius: 6, backgroundColor: NAVBAR_COLORS.bg }}>
                <Icon name="alert-circle" size={14} color={NAVBAR_COLORS.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>Alerts</Text>
              {alerts.length > 0 && (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: "auto", backgroundColor: NAVBAR_COLORS.primary }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "bold" }}>{alerts.length}</Text>
                </View>
              )}
            </View>
            {alerts.length > 0 ? (
              alerts.map((alert: any, idx: number) => <AlertItem key={idx} message={alert.message} time={alert.time} iconName={alert.iconName} />)
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <Icon name="check-circle" size={24} color="#10B981" />
                <Text style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>No pending alerts</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 6, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
                <Text style={{ fontSize: 9, color: "#64748B" }}>Active</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: NAVBAR_COLORS.primary, marginTop: 2 }}>{stats.inProgress || 0}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 6, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
                <Text style={{ fontSize: 9, color: "#64748B" }}>Open NCRs</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1E293B", marginTop: 2 }}>{stats.openNCRs || 0}</Text>
              </View>
            </View>
          </Card>

        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardAnalytics;