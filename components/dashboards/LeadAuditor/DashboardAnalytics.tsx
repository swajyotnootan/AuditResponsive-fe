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
import { LineChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/Feather";

// ============================================================================
// COLOR PALETTE (Strictly Professional Blue Shades)
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
// CLEAN UI COMPONENTS (MNC Professional Look)
// ============================================================================
const Card = ({ children, className = "", style = {} }: any) => (
  <View
    style={[
      {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        padding: 20,
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

const MetricCard = ({ title, value, subtitle, iconName }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  return (
    <Card 
      style={{ 
        flex: 1, 
        // ✅ FIXED: Use NUMBER for minWidth, not string
        minWidth: isMobile ? 150 : 200,
        maxWidth: isMobile ? "100%" : 280,
        padding: isMobile ? 12 : 16,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: isMobile ? 12 : 14, color: "#64748B", fontWeight: "500" }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ fontSize: isMobile ? 20 : 24, fontWeight: "bold", color: "#1E293B", marginTop: 4 }}>
            {value}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#94A3B8", marginTop: 4 }} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ padding: 10, borderRadius: 12, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name={iconName} size={20} color={NAVBAR_COLORS.primary} />
        </View>
      </View>
    </Card>
  );
};

const InsightCard = ({ title, value, iconName, description, trend }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <Card style={{ padding: isMobile ? 12 : 16, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ padding: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name={iconName} size={16} color={NAVBAR_COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>{title}</Text>
            {trend !== undefined && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name={trend > 0 ? "trending-up" : "trending-down"} size={12} color={trend > 0 ? "#059669" : "#64748B"} />
                <Text style={{ fontSize: 11, fontWeight: "600", color: trend > 0 ? "#059669" : "#64748B" }}>
                  {trend !== 0 ? `${Math.abs(trend)}%` : "0%"}
                </Text>
                {trend === 0 && <Text style={{ fontSize: 11, color: "#64748B" }}>0%</Text>}
              </View>
                )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1E293B", marginTop: 4 }}>{value}</Text>
          <Text style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{description}</Text>
        </View>
      </View>
    </Card>
  );
};

const TopPerformerCard = ({ rank, name, score, department }: any) => {
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
      <View style={{ width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", backgroundColor: NAVBAR_COLORS.primary }}>
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "bold" }}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "600", color: "#1E293B" }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: isMobile ? 10 : 12, color: "#64748B", marginTop: 2 }}>{department}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "bold", color: "#1E293B" }}>{score}%</Text>
        <View style={{ width: isMobile ? 50 : 64, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
          <View style={{ width: `${score}%`, height: "100%", backgroundColor: NAVBAR_COLORS.secondary, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
};

const AlertItem = ({ message, time, iconName }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: isMobile ? 10 : 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View style={{ padding: 6, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
        <Icon name={iconName} size={14} color={NAVBAR_COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 12 : 13, color: "#334155" }}>{message}</Text>
        <Text style={{ fontSize: isMobile ? 10 : 11, color: "#94A3B8", marginTop: 4 }}>{time}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// CHART CAROUSEL COMPONENT
// ============================================================================
// ============================================================================
// FIXED CHART CAROUSEL COMPONENT
// ============================================================================
const ChartCarousel = ({ slides, autoPlayInterval = 5000 }: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayRef = useRef<any>(null);

  // ✅ FIXED: Use NUMBER for width calculation, not string
  const containerWidth = isMobile ? width - 32 : Math.min(width - 48, 750);
  const cardWidth = containerWidth;
  const gap = 16;

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    const nextIndex = (currentIndex + 1) % slides.length;
    setCurrentIndex(nextIndex);
    scrollViewRef.current?.scrollTo({ x: nextIndex * (cardWidth + gap), animated: true });
  }, [currentIndex, slides.length, cardWidth, gap]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    setCurrentIndex(prevIndex);
    scrollViewRef.current?.scrollTo({ x: prevIndex * (cardWidth + gap), animated: true });
  }, [currentIndex, slides.length, cardWidth, gap]);

  useEffect(() => {
    if (isAutoPlaying && slides.length > 1) {
      autoPlayRef.current = setInterval(nextSlide, autoPlayInterval);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, nextSlide, slides.length]);

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (cardWidth + gap));
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={{ width: "100%", alignItems: "center", overflow: "hidden" }}>
      <View style={{ width: cardWidth, position: "relative", overflow: "hidden" }}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + gap}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ gap: gap, paddingHorizontal: 0 }}
          style={{ overflow: "hidden" }}
        >
          {slides.map((slide: any, index: number) => (
            <View key={index} style={{ width: cardWidth, overflow: "hidden" }}>
              <Card style={{ padding: isMobile ? 12 : 16, overflow: "hidden", width: cardWidth }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 16 }}>
                  <View style={{ padding: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
                    <Icon name={slide.icon} size={16} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B", flexShrink: 1 }} numberOfLines={1}>
                    {slide.title}
                  </Text>
                </View>
                <View style={{ alignItems: "center", justifyContent: "center", width: "100%", overflow: "hidden" }}>
                  {slide.component}
                </View>
              </Card>
            </View>
          ))}
        </ScrollView>

        {/* ✅ FIXED: Arrows INSIDE the container, not outside */}
        {slides.length > 1 && (
          <>
            <TouchableOpacity
              onPress={prevSlide}
              style={{ 
                position: "absolute", 
                left: 8, 
                top: "50%", 
                marginTop: -20, 
                padding: 8, 
                backgroundColor: "rgba(255,255,255,0.9)", 
                borderRadius: 20, 
                borderWidth: 1, 
                borderColor: "#E2E8F0", 
                shadowColor: "#000", 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 4, 
                elevation: 3, 
                zIndex: 10 
              }}
            >
              <Icon name="chevron-left" size={20} color="#475569" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={nextSlide}
              style={{ 
                position: "absolute", 
                right: 8, 
                top: "50%", 
                marginTop: -20, 
                padding: 8, 
                backgroundColor: "rgba(255,255,255,0.9)", 
                borderRadius: 20, 
                borderWidth: 1, 
                borderColor: "#E2E8F0", 
                shadowColor: "#000", 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.1, 
                shadowRadius: 4, 
                elevation: 3, 
                zIndex: 10 
              }}
            >
              <Icon name="chevron-right" size={20} color="#475569" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ✅ FIXED: Pagination row with proper width and wrapping */}
      {slides.length > 1 && (
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          justifyContent: "space-between", 
          width: "100%", 
          maxWidth: cardWidth,
          marginTop: 20,
          paddingHorizontal: 8,
          flexWrap: "wrap",
          gap: 8,
        }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {slides.map((_: any, idx: number) => (
              <TouchableOpacity 
                key={idx} 
                onPress={() => {
                  setCurrentIndex(idx);
                  scrollViewRef.current?.scrollTo({ x: idx * (cardWidth + gap), animated: true });
                }}
                style={{ padding: 4 }}
              >
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentIndex === idx ? NAVBAR_COLORS.primary : "#CBD5E1",
                    width: currentIndex === idx ? 32 : 8,
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
              gap: 6, 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 8, 
              borderWidth: 1, 
              borderColor: "#E2E8F0", 
              backgroundColor: "#FFFFFF",
              alignSelf: "flex-end",
            }}
          >
            <Icon name={isAutoPlaying ? "pause" : "play"} size={14} color={NAVBAR_COLORS.primary} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#475569" }}>
              {isAutoPlaying ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MAIN DASHBOARD ANALYTICS COMPONENT
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

  // Professional Chart Config mimicking Recharts
  const chartConfig = useMemo(
    () => ({
      backgroundColor: "#ffffff",
      backgroundGradientFrom: "#ffffff",
      backgroundGradientTo: "#ffffff",
      decimalCount: 0,
      color: (opacity = 1) => `rgba(0, 82, 155, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
      style: { borderRadius: 16 },
      propsForDots: { r: "4", strokeWidth: "2", stroke: "#ffffff" },
      propsForBackgroundLines: { strokeDasharray: "3 3", stroke: "#e2e8f0", strokeWidth: 1 },
      fillShadowGradient: NAVBAR_COLORS.primary,
      fillShadowGradientOpacity: 0.15,
    }),
    []
  );

  const chartWidth = Math.min(width * (isMobile ? 0.85 : 0.65), 750);
  const chartHeight = isMobile ? 240 : 280;

  // ============================================================
  // DATA CALCULATION FUNCTIONS (Ported from Web Version)
  // ============================================================
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
      const d = new Date(s.scheduledDate as string); // ✅ Cast to string
      return d.getMonth() === month && d.getFullYear() === year;
    });
    
    const approved = monthSchedules.filter(
      (s) => s.approvalStatus === "APPROVED" || s.status === "APPROVED"
    ).length;
    const rejected = monthSchedules.filter(
      (s) => s.approvalStatus === "REJECTED" || s.status === "REJECTED"
    ).length;
    const pending = monthSchedules.filter(
      (s) => 
        s.approvalStatus === "SUBMITTED" || 
        s.approvalStatus === "PENDING" || 
        s.status === "SUBMITTED"
    ).length;

    const monthResponses = allResponses.filter((r) => {
      const dateStr = r.submittedAt || r.createdAt; // ✅ Get first available
      if (!dateStr) return false;
      const d = new Date(dateStr as string); // ✅ Cast to string
      return d.getMonth() === month && d.getFullYear() === year;
    });
    
    const responsesApproved = monthResponses.filter(
      (r) => r.status === "APPROVED"
    ).length;
    const responsesRejected = monthResponses.filter(
      (r) => r.status === "REJECTED"
    ).length;

    months.push({
      month: monthStr,
      approved: approved + responsesApproved,
      rejected: rejected + responsesRejected,
      pending: pending,
    });
  }
  return months;
}, [allSchedules, allResponses]);

  const getDepartmentPerformance = useMemo(() => {
  const deptMap = new Map<string, { total: number; completed: number; approved: number }>();
  
  allSchedules.forEach((s) => {
    const dept = s.department || "Unknown";
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { total: 0, completed: 0, approved: 0 });
    }
    const data = deptMap.get(dept)!; // ✅ Non-null assertion
    data.total++;
    if (s.status === "COMPLETED") data.completed++;
    if (s.approvalStatus === "APPROVED") data.approved++;
  });
  
  return Array.from(deptMap.entries())
    .map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 10) + "..." : name,
      total: data.total,
      completionRate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
      approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}, [allSchedules]);

 const getAuditorPerformance = useMemo(() => {
  const auditorMap = new Map<string, {
    total: number;
    completed: number;
    approved: number;
    responsesCount: number;
    responsesApproved: number;
  }>();
  
  allSchedules.forEach((s) => {
    const auditorName = s.auditorName || s.leadAuditorName;
    if (!auditorName) return;
    
    if (!auditorMap.has(auditorName)) {
      auditorMap.set(auditorName, { 
        total: 0, 
        completed: 0, 
        approved: 0, 
        responsesCount: 0, 
        responsesApproved: 0 
      });
    }
    const data = auditorMap.get(auditorName)!;
    data.total++;
    if (s.status === "COMPLETED") data.completed++;
    if (s.approvalStatus === "APPROVED") data.approved++;
  });
  
  allResponses.forEach((r) => {
    const auditorName = r.auditorName;
    if (!auditorName) return;
    
    if (!auditorMap.has(auditorName)) {
      auditorMap.set(auditorName, { 
        total: 0, 
        completed: 0, 
        approved: 0, 
        responsesCount: 0, 
        responsesApproved: 0 
      });
    }
    const data = auditorMap.get(auditorName)!;
    data.responsesCount++;
    if (r.status === "APPROVED") data.responsesApproved++;
  });
  
  return Array.from(auditorMap.entries())
    .map(([name, data]) => ({
      name: name.split(" ")[0],
      total: data.total,
      completionRate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
      approvalRate: data.total ? Math.round((data.approved / data.total) * 100) : 0,
      responseApprovalRate: data.responsesCount ? Math.round((data.responsesApproved / data.responsesCount) * 100) : 0,
      score: Math.round(((data.completed / (data.total || 1)) * 0.5 + (data.approved / (data.total || 1)) * 0.5) * 100),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}, [allSchedules, allResponses]);

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
      const d = new Date(s.scheduledDate as string); // ✅ Cast
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    });
    
    const scheduledCount = schedulesInMonth.length;
    const completedCount = schedulesInMonth.filter((s) => s.status === "COMPLETED").length;
    
    const ncrCount = allNCRs.filter((n) => {
      if (!n.createdAt) return false;
      const d = new Date(n.createdAt as string); // ✅ Cast
      return d.getMonth() === monthIndex && d.getFullYear() === year;
    }).length;
    
    months.push({ 
      month: monthName, 
      audits: scheduledCount, 
      completedAudits: completedCount, 
      ncrs: ncrCount 
    });
  }
  return months;
}, [allSchedules, allNCRs]);

  const getAuditStatusDistribution = useMemo(() => {
    return [
      { name: "Scheduled", value: stats.scheduled || 0 },
      { name: "In Progress", value: stats.inProgress || 0 },
      { name: "Completed", value: stats.completedSchedules || 0 },
      { name: "Approved", value: stats.approved || 0 },
      { name: "Rejected", value: stats.rejected || 0 },
    ].filter((s) => s.value > 0);
  }, [stats]);

  const getResponseStatusDistribution = useMemo(() => {
    const approved = allResponses.filter((r) => r.status === "APPROVED").length;
    const rejected = allResponses.filter((r) => r.status === "REJECTED").length;
    const submitted = allResponses.filter((r) => r.status === "SUBMITTED").length;
    const draft = allResponses.filter((r) => !r.status || r.status === "DRAFT").length;
    return [
      { name: "Approved", value: approved },
      { name: "Rejected", value: rejected },
      { name: "Submitted", value: submitted },
      { name: "Draft", value: draft },
    ].filter((s) => s.value > 0);
  }, [allResponses]);

  const getScoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
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

  const getScheduledAuditsCount = () => {
  return allSchedules.filter((s) => {
    if (!s.scheduledDate) return false;
    const scheduledStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "APPROVED", "REJECTED"];
    return scheduledStatuses.includes(s.status || ""); // ✅ Handle undefined
  }).length;
};

  const overdueAudits = allSchedules.filter((s) => {
    if (!s.scheduledDate) return false;
    return new Date(s.scheduledDate) < new Date() && s.status !== "COMPLETED" && s.status !== "REJECTED";
  }).length;

  const alerts = [];
  if (stats.pendingApproval > 0) alerts.push({ message: `${stats.pendingApproval} audit(s) pending approval`, time: "Urgent", iconName: "clock" });
  if (overdueAudits > 0) alerts.push({ message: `${overdueAudits} overdue audit(s) need attention`, time: "Overdue", iconName: "alert-triangle" });
  if (stats.criticalNCRs > 0) alerts.push({ message: `${stats.criticalNCRs} critical NCR(s) require immediate action`, time: "High Priority", iconName: "alert-circle" });
  if (stats.responsesSubmitted > 0) alerts.push({ message: `${stats.responsesSubmitted} response(s) waiting for review`, time: "Pending", iconName: "file-text" });

  // ========================================================================
  // CHART SLIDES (Mimicking Recharts Line/Area Charts)
  // ========================================================================
  const chartSlides = useMemo(() => [
    {
      title: "Approval Trend (Last 6 Months)",
      icon: "trending-up",
      component: getApprovalTrend.some((d: any) => d.approved > 0) ? (
        <LineChart
          data={{
            labels: getApprovalTrend.map((d: any) => d.month),
            datasets: [
              { data: getApprovalTrend.map((d: any) => d.approved), color: () => NAVBAR_COLORS.primary },
              { data: getApprovalTrend.map((d: any) => d.rejected), color: () => "#ef4444" },
              { data: getApprovalTrend.map((d: any) => d.pending), color: () => NAVBAR_COLORS.light },
            ],
            legend: ["Approved", "Rejected", "Pending"],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          withInnerLines={true}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Department Performance",
      icon: "briefcase",
      component: getDepartmentPerformance.length > 0 ? (
        <LineChart
          data={{
            labels: getDepartmentPerformance.map((d: any) => d.name),
            datasets: [
              { data: getDepartmentPerformance.map((d: any) => d.completionRate), color: () => NAVBAR_COLORS.primary },
              { data: getDepartmentPerformance.map((d: any) => d.approvalRate), color: () => NAVBAR_COLORS.light },
            ],
            legend: ["Completion %", "Approval %"],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix="%"
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Auditor Performance Ranking",
      icon: "users",
      component: getAuditorPerformance.length > 0 ? (
        <LineChart
          data={{
            labels: getAuditorPerformance.map((d: any) => d.name),
            datasets: [
              { data: getAuditorPerformance.map((d: any) => d.score), color: () => NAVBAR_COLORS.primary },
              { data: getAuditorPerformance.map((d: any) => d.responseApprovalRate), color: () => NAVBAR_COLORS.secondary },
            ],
            legend: ["Performance Score", "Response Approval %"],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Monthly Performance Trend",
      icon: "activity",
      component: getMonthlyPerformance.some((d: any) => d.completedAudits > 0) ? (
        <LineChart
          data={{
            labels: getMonthlyPerformance.map((d: any) => d.month),
            datasets: [
              { data: getMonthlyPerformance.map((d: any) => d.audits), color: () => NAVBAR_COLORS.light },
              { data: getMonthlyPerformance.map((d: any) => d.completedAudits), color: () => NAVBAR_COLORS.primary },
              { data: getMonthlyPerformance.map((d: any) => d.ncrs), color: () => "#ef4444" },
            ],
            legend: ["Scheduled", "Completed", "NCRs Raised"],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Audit Status Distribution",
      icon: "alert-circle",
      component: getAuditStatusDistribution.length > 0 ? (
        <LineChart
          data={{
            labels: getAuditStatusDistribution.map((d: any) => d.name),
            datasets: [{ data: getAuditStatusDistribution.map((d: any) => d.value), color: () => NAVBAR_COLORS.primary }],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Check Sheet Response Status",
      icon: "file-text",
      component: getResponseStatusDistribution.length > 0 ? (
        <LineChart
          data={{
            labels: getResponseStatusDistribution.map((d: any) => d.name),
            datasets: [{ data: getResponseStatusDistribution.map((d: any) => d.value), color: () => NAVBAR_COLORS.secondary }],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Response Score Distribution",
      icon: "bar-chart-2",
      component: getScoreDistribution.some((d: any) => d.count > 0) ? (
        <LineChart
          data={{
            labels: getScoreDistribution.map((d: any) => d.range),
            datasets: [{ data: getScoreDistribution.map((d: any) => d.count), color: () => NAVBAR_COLORS.primary }],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
    {
      title: "Weekly Audit Activity (Last 8 Weeks)",
      icon: "activity",
      component: getWeeklyActivity.some((d: any) => d.completed > 0) ? (
        <LineChart
          data={{
            labels: getWeeklyActivity.map((d: any) => d.week),
            datasets: [
              { data: getWeeklyActivity.map((d: any) => d.audits), color: () => NAVBAR_COLORS.light },
              { data: getWeeklyActivity.map((d: any) => d.completed), color: () => NAVBAR_COLORS.primary },
              { data: getWeeklyActivity.map((d: any) => d.ncrs), color: () => "#ef4444" },
            ],
            legend: ["Scheduled", "Completed", "NCRs"],
          }}
          width={chartWidth}
          height={chartHeight}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          withShadow={false}
          yAxisLabel=""
          yAxisSuffix=""
        />
      ) : (
        <View style={{ height: chartHeight, justifyContent: "center", alignItems: "center" }}>
          <Icon name="bar-chart-2" size={40} color="#CBD5E1" />
          <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No data available</Text>
        </View>
      ),
    },
  ], [getApprovalTrend, getDepartmentPerformance, getAuditorPerformance, getMonthlyPerformance, getAuditStatusDistribution, getResponseStatusDistribution, getScoreDistribution, getWeeklyActivity, chartWidth, chartHeight, chartConfig]);

  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F8FAFC" }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: isMobile ? 12 : 24, paddingTop: 16, maxWidth: 1200, width: "100%", alignSelf: "center" }}>
        
        {/* Key Metrics Cards */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: isMobile ? 12 : 16, marginBottom: 24 }}>
          <MetricCard title="Total Audits" value={getScheduledAuditsCount()} subtitle="scheduled this year" iconName="calendar" />
          <MetricCard title="Total NCRs" value={stats.totalNCRs} subtitle="non-conformities" iconName="alert-triangle" />
          <MetricCard title="Response Approval" value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`} subtitle="approved" iconName="thumbs-up" />
          <MetricCard title="Avg Score" value={`${avgResponseScore}%`} subtitle="average score" iconName="bar-chart-2" />
        </View>

        {/* Chart Dashboard */}
        <Card style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16, marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: isMobile ? 18 : 20, fontWeight: "bold", color: "#1E293B" }}>Analytics Dashboard</Text>
              <Text style={{ fontSize: isMobile ? 12 : 14, color: "#64748B", marginTop: 4 }}>Real-time audit performance metrics and insights</Text>
            </View>
            <View style={{ flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: 12, width: isMobile ? "100%" : "auto" }}>
              <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 8, padding: 2 }}>
                {[3000, 5000, 7000, 10000].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    onPress={() => setCarouselSpeed(speed)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: carouselSpeed === speed ? NAVBAR_COLORS.primary : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: carouselSpeed === speed ? "#FFFFFF" : "#64748B", fontWeight: "500" }}>
                      {speed / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={onRefresh}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.primary }}
              >
                <Icon name="refresh-cw" size={16} color="#FFFFFF" style={refreshing ? { transform: [{ rotate: "360deg" }] } : {}} />
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ChartCarousel slides={chartSlides} autoPlayInterval={carouselSpeed} />
        </Card>

        {/* BOTTOM SECTION */}
        {/* ✅ FIXED BOTTOM SECTION - No Overlapping */}
<View style={{ 
  flexDirection: isMobile ? "column" : "row", 
  gap: isMobile ? 16 : 20,
  flexWrap: "wrap",
}}>
  
  {/* Left Column: Key Insights */}
  <View style={{ 
    flex: 1, 
    minWidth: isMobile ? "100%" : 300,
    maxWidth: isMobile ? "100%" : "33%",
  }}>
    <Card style={{ padding: isMobile ? 14 : 20, height: "100%" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View style={{ padding: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name="target" size={16} color={NAVBAR_COLORS.primary} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B" }}>Key Insights</Text>
      </View>
      <InsightCard
        title="Month-over-Month"
        value={`${momImprovement > 0 ? "+" : ""}${momImprovement}%`}
        iconName="trending-up"
        description="Compared to previous month"
        trend={momImprovement}
      />
      <InsightCard
        title="Quality Score"
        value={`${Math.round((stats.responsesApproved / (stats.responsesApproved + stats.responsesRejected || 1)) * 100)}%`}
        iconName="shield"
        description="Response quality rating"
        trend={5}
      />
      <InsightCard
        title="Audit Efficiency"
        value={`${stats.totalSchedules ? Math.round((stats.completedSchedules / stats.totalSchedules) * 100) : 0}%`}
        iconName="zap"
        description="Audit completion efficiency"
        trend={8}
      />
    </Card>
  </View>

  {/* Middle Column: Top Performers */}
  <View style={{ 
    flex: 1, 
    minWidth: isMobile ? "100%" : 300,
    maxWidth: isMobile ? "100%" : "33%",
    marginTop: isMobile ? 16 : 0,
  }}>
    <Card style={{ padding: isMobile ? 14 : 20, height: "100%" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View style={{ padding: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name="award" size={16} color={NAVBAR_COLORS.primary} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B" }}>Top Performers</Text>
      </View>
      <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
        {topAuditors.length > 0 ? (
          topAuditors.map((auditor: any, idx: number) => (
            <TopPerformerCard key={idx} rank={idx + 1} name={auditor.name} score={auditor.score} department="Auditor" />
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Icon name="users" size={32} color="#CBD5E1" />
            <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>No auditor data available</Text>
          </View>
        )}
      </ScrollView>
    </Card>
  </View>

  {/* Right Column: Alerts & Notifications */}
  <View style={{ 
    flex: 1, 
    minWidth: isMobile ? "100%" : 300,
    maxWidth: isMobile ? "100%" : "33%",
    marginTop: isMobile ? 16 : 0,
  }}>
    <Card style={{ padding: isMobile ? 14 : 20, height: "100%" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View style={{ padding: 8, borderRadius: 8, backgroundColor: NAVBAR_COLORS.bg }}>
          <Icon name="alert-circle" size={16} color={NAVBAR_COLORS.primary} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#1E293B" }}>Alerts & Notifications</Text>
        {alerts.length > 0 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: "auto", backgroundColor: NAVBAR_COLORS.primary }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}>{alerts.length}</Text>
          </View>
        )}
      </View>
      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
        {alerts.length > 0 ? (
          alerts.map((alert: any, idx: number) => <AlertItem key={idx} message={alert.message} time={alert.time} iconName={alert.iconName} />)
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Icon name="check-circle" size={32} color="#10B981" />
            <Text style={{ fontSize: 14, color: "#334155", marginTop: 8 }}>No pending alerts</Text>
            <Text style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>All systems running smoothly</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Quick Stats Summary */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
          <Text style={{ fontSize: 11, color: "#64748B" }}>Active Audits</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: NAVBAR_COLORS.primary, marginTop: 4 }}>{stats.inProgress || 0}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }}>
          <Text style={{ fontSize: 11, color: "#64748B" }}>Open NCRs</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1E293B", marginTop: 4 }}>{stats.openNCRs || 0}</Text>
        </View>
      </View>
    </Card>
  </View>

</View>
      </View>
    </ScrollView>
  );
};

export default DashboardAnalytics;