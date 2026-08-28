import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { Path, Svg } from "react-native-svg";
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
// EMPTY STATE COMPONENT
// ============================================================================
const EmptyChartState = ({
  iconName,
  text,
}: {
  iconName: string;
  text: string;
}) => (
  <View style={{ height: 200, justifyContent: "center", alignItems: "center" }}>
    <Icon name={iconName} size={32} color="#CBD5E1" />
    <Text
      style={{
        color: "#94A3B8",
        fontSize: 12,
        marginTop: 6,
        fontWeight: "500",
      }}
    >
      {text}
    </Text>
  </View>
);

const CustomLineChart = ({ data, height = 220 }: any) => {
  const { width } = useWindowDimensions();

  // ✅ FIX: Calculate width based on screen size and account for card padding
  const isDesktop = width >= 768;
  const isMobile = width < 768;

  // Mobile: full width minus card padding (16 * 2 = 32)
  // Desktop: constrained width for better readability
  const chartWidth = isMobile
    ? width - 32 // Account for Card padding (16px each side)
    : Math.min(width - 96, 700); // Account for container padding (16px) + Card padding (32px)

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 82, 155, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#00529B" },
    propsForBackgroundLines: { strokeDasharray: "3 3", stroke: "#E2E8F0" },
    fillShadowGradient: "#00529B",
    fillShadowGradientOpacity: 0.15,
    paddingRight: 16, // ✅ Prevent right-side label cutoff
  };

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* ✅ REMOVED: Horizontal ScrollView - charts now fit naturally */}
      <LineChart
        data={data}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={{ marginVertical: 8, borderRadius: 12 }}
        fromZero
        withShadow={false}
        withInnerLines={true}
        yAxisLabel=""
        yAxisSuffix=""
      />

      {/* Simple Legend for Multiple Datasets */}
      {data.legend && data.legend.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 8,
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          {data.legend.map((label: string, idx: number) => {
            const color =
              typeof data.datasets[idx]?.color === "function"
                ? data.datasets[idx].color(1)
                : NAVBAR_COLORS.primary;
            return (
              <View
                key={idx}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <Text
                  style={{ fontSize: 11, color: "#64748B", fontWeight: "500" }}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const CustomBarChart = ({ data, height = 220 }: any) => {
  const { width } = useWindowDimensions();

  // ✅ FIX: Calculate width based on screen size
  const isDesktop = width >= 768;
  const isMobile = width < 768;

  const chartWidth = isMobile
    ? width - 32 // Account for Card padding
    : Math.min(width - 96, 700); // Account for container + card padding

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: { borderRadius: 12 },
    barPercentage: 0.6,
    paddingRight: 16, // ✅ Prevent right-side label cutoff
  };

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      {/* ✅ REMOVED: Horizontal ScrollView */}
      <BarChart
        data={data}
        width={chartWidth}
        height={height}
        chartConfig={chartConfig}
        style={{ marginVertical: 8, borderRadius: 12 }}
        fromZero
        showValuesOnTopOfBars
        yAxisLabel=""
        yAxisSuffix=""
      />
    </View>
  );
};

const CustomPieChart = ({
  data = [],
  title,
  subtitle,
  total,
}: {
  data?: { name: string; value: number; color: string }[];
  title?: string;
  subtitle?: string;
  total?: number;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const hasData = data.some((d) => d.value > 0);

  const activeItem = activeIndex !== null ? data[activeIndex] : null;
  const displayTotal = activeItem ? activeItem.value : total || totalValue;
  const displayLabel = activeItem ? activeItem.name : "Total";

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

  if (!hasData) {
    return (
      <Card style={{ padding: 16, alignItems: "center" }}>
        {title && (
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
            {subtitle}
          </Text>
        )}
        <EmptyChartState iconName="pie-chart" text="No data available" />
      </Card>
    );
  }

  return (
    <Card style={{ padding: 16, width: "100%" }}>
      {title && (
        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
          {subtitle}
        </Text>
      )}

      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <View
          style={{
            width: 140,
            height: 140,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Svg width="180" height="180" viewBox="0 0 120 120">
            {
              data.reduce(
                (acc, item, idx) => {
                  const startAngle = acc.currentAngle;
                  const angle = (item.value / totalValue) * 360;
                  const endAngle = startAngle + angle;
                  acc.elements.push(
                    <Path
                      key={idx}
                      d={calculatePath(startAngle, endAngle)}
                      fill={item.color}
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
                { elements: [] as any[], currentAngle: 0 },
              ).elements
            }
          </Svg>
          <View
            style={{
              position: "absolute",
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: NAVBAR_COLORS.primary,
              }}
            >
              {displayTotal}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#64748B",
                marginTop: 2,
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {displayLabel}
            </Text>
          </View>
        </View>

        <View style={{ width: "100%", gap: 12, marginTop: 8 }}>
          {data.map((item, idx) => (
            <Pressable
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: activeIndex === idx ? "#E2E8F0" : "#F8FAFC",
              }}
              onHoverIn={() => setActiveIndex(idx)}
              onHoverOut={() => setActiveIndex(null)}
              onPressIn={() => setActiveIndex(idx)}
              onPressOut={() => setActiveIndex(null)}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: item.color,
                }}
              />
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 13, color: "#334155", flex: 1 }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: NAVBAR_COLORS.primary,
                    marginLeft: 8,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </Card>
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
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, marginRight: 6 }}>
          <Text
            style={{
              fontSize: isMobile ? 10 : 13,
              color: "#64748B",
              fontWeight: "500",
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: isMobile ? 18 : 22,
              fontWeight: "bold",
              color: "#1E293B",
              marginTop: 2,
            }}
          >
            {value}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: isMobile ? 8 : 11,
                color: "#94A3B8",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <View
          style={{
            padding: 8,
            borderRadius: 10,
            backgroundColor: NAVBAR_COLORS.bg,
          }}
        >
          <Icon
            name={iconName}
            size={isMobile ? 16 : 20}
            color={NAVBAR_COLORS.primary}
          />
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
    <View
      style={{
        padding: isMobile ? 8 : 12,
        marginBottom: isMobile ? 4 : 8,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#F1F5F9",
      }}
    >
      <View style={{ flexDirection: "row", gap: isMobile ? 6 : 10 }}>
        <View
          style={{
            padding: isMobile ? 5 : 8,
            borderRadius: 8,
            backgroundColor: NAVBAR_COLORS.bg,
            alignSelf: "flex-start",
          }}
        >
          <Icon
            name={iconName}
            size={isMobile ? 12 : 16}
            color={NAVBAR_COLORS.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: isMobile ? 10 : 13,
                fontWeight: "600",
                color: "#334155",
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {trend !== undefined && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Icon
                  name={trend > 0 ? "trending-up" : "trending-down"}
                  size={10}
                  color={trend > 0 ? "#059669" : "#64748B"}
                />
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "600",
                    color: trend > 0 ? "#059669" : "#64748B",
                  }}
                >
                  {trend !== 0 ? `${Math.abs(trend)}%` : "0%"}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: isMobile ? 14 : 18,
              fontWeight: "bold",
              color: "#1E293B",
              marginTop: 2,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontSize: isMobile ? 8 : 10,
              color: "#64748B",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
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
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: NAVBAR_COLORS.primary,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "bold" }}>
          {rank}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: isMobile ? 11 : 13,
            fontWeight: "600",
            color: "#1E293B",
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: isMobile ? 8 : 11,
            color: "#64748B",
            marginTop: 1,
          }}
        >
          {department}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontSize: isMobile ? 11 : 13,
            fontWeight: "bold",
            color: "#1E293B",
          }}
        >
          {score}%
        </Text>
        <View
          style={{
            width: isMobile ? 35 : 50,
            height: 4,
            backgroundColor: "#E2E8F0",
            borderRadius: 2,
            marginTop: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${score}%`,
              height: "100%",
              backgroundColor: NAVBAR_COLORS.secondary,
              borderRadius: 2,
            }}
          />
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
      <View
        style={{
          padding: 5,
          borderRadius: 6,
          backgroundColor: NAVBAR_COLORS.bg,
        }}
      >
        <Icon name={iconName} size={12} color={NAVBAR_COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: isMobile ? 10 : 12, color: "#334155" }}>
          {message}
        </Text>
        <Text
          style={{
            fontSize: isMobile ? 8 : 10,
            color: "#94A3B8",
            marginTop: 2,
          }}
        >
          {time}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// CHART CAROUSEL
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
      <View style={{ width: "100%" }}>
        <Card style={{ width: "100%", overflow: "hidden" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
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
              <Icon
                name={slides[currentIndex].icon}
                size={14}
                color={NAVBAR_COLORS.primary}
              />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#1E293B",
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {slides[currentIndex].title}
            </Text>
          </View>
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {slides[currentIndex].component}
          </View>
        </Card>
      </View>

      {slides.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {slides.map((_: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentIndex(idx)}
                style={{ padding: 3 }}
              >
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      currentIndex === idx ? NAVBAR_COLORS.primary : "#CBD5E1",
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
            <Icon
              name={isAutoPlaying ? "pause" : "play"}
              size={12}
              color={NAVBAR_COLORS.primary}
            />
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
// TYPES
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
  auditDate?: string;
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

  // ✅ 1. ADDED: Department Performance Calculation (Matches Web Version)
  const getDepartmentPerformance = useMemo(() => {
    const deptMap = new Map();
    allSchedules.forEach((s) => {
      const dept = s.department || "Unknown";
      if (!deptMap.has(dept))
        deptMap.set(dept, { total: 0, completed: 0, approved: 0 });
      const data = deptMap.get(dept);
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
      if (s.approvalStatus === "APPROVED") data.approved++;
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({
        name: name.length > 12 ? name.substring(0, 10) + "..." : name,
        total: data.total,
        completionRate: data.total
          ? Math.round((data.completed / data.total) * 100)
          : 0,
        approvalRate: data.total
          ? Math.round((data.approved / data.total) * 100)
          : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allSchedules]);

  const getApprovalTrend = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthSchedules = allSchedules.filter((s) => {
        const dateStr = s.scheduledDate || s.auditDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const approved = monthSchedules.filter(
        (s) => s.approvalStatus === "APPROVED" || s.status === "APPROVED",
      ).length;
      const rejected = monthSchedules.filter(
        (s) => s.approvalStatus === "REJECTED" || s.status === "REJECTED",
      ).length;
      const pending = monthSchedules.filter(
        (s) =>
          s.approvalStatus === "SUBMITTED" ||
          s.approvalStatus === "PENDING" ||
          s.status === "SUBMITTED" ||
          s.status === "PENDING",
      ).length;

      const monthResponses = allResponses.filter((r) => {
        const dateStr = r.submittedAt || r.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === month && d.getFullYear() === year;
      });
      const responsesApproved = monthResponses.filter(
        (r) => r.status === "APPROVED",
      ).length;
      const responsesRejected = monthResponses.filter(
        (r) => r.status === "REJECTED",
      ).length;

      months.push({
        month: monthStr,
        approved: approved + responsesApproved,
        rejected: rejected + responsesRejected,
        pending,
      });
    }
    return months;
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
        const dateStr = s.scheduledDate || s.auditDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      });
      const ncrCount = allNCRs.filter((n) => {
        if (!n.createdAt) return false;
        const d = new Date(n.createdAt);
        return d.getMonth() === monthIndex && d.getFullYear() === year;
      }).length;
      months.push({
        month: monthName,
        audits: schedulesInMonth.length,
        completedAudits: schedulesInMonth.filter(
          (s) => s.status === "COMPLETED",
        ).length,
        ncrs: ncrCount,
      });
    }
    return months;
  }, [allSchedules, allNCRs]);

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
        const dateStr = s.scheduledDate || s.auditDate;
        if (!dateStr) return false;
        const d = new Date(dateStr);
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

  const getAuditorPerformance = useMemo(() => {
    const auditorMap = new Map<
      string,
      { total: number; completed: number; approved: number }
    >();
    allSchedules.forEach((s) => {
      const auditorName = s.auditorName || s.leadAuditorName;
      if (!auditorName) return;
      if (!auditorMap.has(auditorName))
        auditorMap.set(auditorName, { total: 0, completed: 0, approved: 0 });
      const data = auditorMap.get(auditorName)!;
      data.total++;
      if (s.status === "COMPLETED") data.completed++;
      if (s.approvalStatus === "APPROVED") data.approved++;
    });
    return Array.from(auditorMap.entries())
      .map(([name, data]) => ({
        name: name.split(" ")[0],
        total: data.total,
        score: Math.round(
          ((data.completed / (data.total || 1)) * 0.5 +
            (data.approved / (data.total || 1)) * 0.5) *
            100,
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // ✅ Increased to 6 to match web version
  }, [allSchedules]);

  const getAuditStatusDistribution = useMemo(
    () =>
      [
        { name: "Scheduled", value: stats.scheduled || 0 },
        { name: "In Progress", value: stats.inProgress || 0 },
        { name: "Completed", value: stats.completedSchedules || 0 },
        { name: "Approved", value: stats.approved || 0 },
        { name: "Rejected", value: stats.rejected || 0 },
      ].filter((s) => s.value > 0),
    [stats],
  );

  const getResponseStatusDistribution = useMemo(() => {
    const approved = allResponses.filter((r) => r.status === "APPROVED").length;
    const rejected = allResponses.filter((r) => r.status === "REJECTED").length;
    const submitted = allResponses.filter(
      (r) => r.status === "SUBMITTED",
    ).length;
    const draft = allResponses.filter(
      (r) => !r.status || r.status === "DRAFT",
    ).length;
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

  const avgResponseScore = allResponses.length
    ? (
        allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) /
        allResponses.length
      ).toFixed(1)
    : "0.0";

  const topAuditors = getAuditorPerformance.slice(0, 3);

  const getMoMImprovement = () => {
    if (getMonthlyPerformance.length < 2) return 0;
    const lastMonth = getMonthlyPerformance[getMonthlyPerformance.length - 1];
    const prevMonth = getMonthlyPerformance[getMonthlyPerformance.length - 2];
    if (prevMonth.completedAudits === 0) return 0;
    return Math.round(
      ((lastMonth.completedAudits - prevMonth.completedAudits) /
        prevMonth.completedAudits) *
        100,
    );
  };
  const momImprovement = getMoMImprovement();

  const getScheduledAuditsCount = () =>
    allSchedules.filter((s) => {
      if (!s.scheduledDate && !s.auditDate) return false;
      return [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "APPROVED",
        "REJECTED",
      ].includes(s.status || "");
    }).length;

  const overdueAudits = allSchedules.filter((s) => {
    const dateStr = s.scheduledDate || s.auditDate;
    if (!dateStr) return false;
    return (
      new Date(dateStr) < new Date() &&
      s.status !== "COMPLETED" &&
      s.status !== "REJECTED"
    );
  }).length;

  const alerts = [];
  if (stats.pendingApproval > 0)
    alerts.push({
      message: `${stats.pendingApproval} audit(s) pending approval`,
      time: "Urgent",
      iconName: "clock",
    });
  if (overdueAudits > 0)
    alerts.push({
      message: `${overdueAudits} overdue audit(s) need attention`,
      time: "Overdue",
      iconName: "alert-triangle",
    });
  if (stats.criticalNCRs > 0)
    alerts.push({
      message: `${stats.criticalNCRs} critical NCR(s) require immediate action`,
      time: "High Priority",
      iconName: "alert-circle",
    });
  if (stats.responsesSubmitted > 0)
    alerts.push({
      message: `${stats.responsesSubmitted} response(s) waiting for review`,
      time: "Pending",
      iconName: "file-text",
    });

  // ✅ Helper to format data for the new Pie Chart
  const formatPieData = (items: { name: string; value: number }[]) => {
    const colors = [
      NAVBAR_COLORS.primary,
      NAVBAR_COLORS.secondary,
      NAVBAR_COLORS.light,
      NAVBAR_COLORS.lighter,
      "#F59E0B",
      "#10B981",
    ];
    return items.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length],
    }));
  };

  // ✅ 2. UPDATED: Chart Slides to perfectly match the 8 slides from the Web Version
  const chartSlides = useMemo(
    () => [
      {
        title: "Auditor Performance Ranking",
        icon: "users",
        component:
          getAuditorPerformance.length > 0 ? (
            <CustomLineChart
              data={{
                labels: getAuditorPerformance.map((d: any) => d.name),
                datasets: [
                  {
                    data: getAuditorPerformance.map((d: any) => d.score),
                    color: () => NAVBAR_COLORS.primary,
                  },
                ],
                legend: ["Performance Score"],
              }}
              height={isMobile ? 220 : 260}
            />
          ) : (
            <EmptyChartState iconName="users" text="No auditor data" />
          ),
      },
      {
        title: "Department Performance",
        icon: "briefcase",
        component:
          getDepartmentPerformance.length > 0 ? (
            <CustomLineChart
              data={{
                labels: getDepartmentPerformance.map((d: any) => d.name),
                datasets: [
                  {
                    data: getDepartmentPerformance.map(
                      (d: any) => d.completionRate,
                    ),
                    color: () => NAVBAR_COLORS.primary,
                  },
                  {
                    data: getDepartmentPerformance.map(
                      (d: any) => d.approvalRate,
                    ),
                    color: () => NAVBAR_COLORS.light,
                  },
                ],
                legend: ["Completion %", "Approval %"],
              }}
              height={isMobile ? 220 : 260}
            />
          ) : (
            <EmptyChartState iconName="briefcase" text="No department data" />
          ),
      },
      {
        title: "Monthly Performance Trend",
        icon: "activity",
        component: getMonthlyPerformance.some(
          (d: any) => d.audits > 0 || d.completedAudits > 0,
        ) ? (
          <CustomLineChart
            data={{
              labels: getMonthlyPerformance.map((d: any) => d.month),
              datasets: [
                {
                  data: getMonthlyPerformance.map((d: any) => d.audits),
                  color: () => NAVBAR_COLORS.light,
                },
                {
                  data: getMonthlyPerformance.map(
                    (d: any) => d.completedAudits,
                  ),
                  color: () => NAVBAR_COLORS.primary,
                },
                {
                  data: getMonthlyPerformance.map((d: any) => d.ncrs),
                  color: () => "#ef4444",
                },
              ],
              legend: ["Scheduled", "Completed", "NCRs"],
            }}
            height={isMobile ? 220 : 260}
          />
        ) : (
          <EmptyChartState
            iconName="activity"
            text="No monthly performance data"
          />
        ),
      },
      {
        title: "Audit Status Distribution",
        icon: "pie-chart",
        component:
          getAuditStatusDistribution.length > 0 ? (
            <CustomPieChart
              data={formatPieData(getAuditStatusDistribution)}
              title="Audit Status"
              subtitle="Real-time status breakdown"
              total={getAuditStatusDistribution.reduce(
                (sum, d) => sum + d.value,
                0,
              )}
            />
          ) : (
            <EmptyChartState iconName="pie-chart" text="No audit status data" />
          ),
      },
      {
        title: "Check Sheet Response Status",
        icon: "file-text",
        component:
          getResponseStatusDistribution.length > 0 ? (
            <CustomPieChart
              data={formatPieData(getResponseStatusDistribution)}
              title="Response Status"
              subtitle="Real-time status breakdown"
              total={getResponseStatusDistribution.reduce(
                (sum, d) => sum + d.value,
                0,
              )}
            />
          ) : (
            <EmptyChartState
              iconName="file-text"
              text="No response status data"
            />
          ),
      },
      {
        title: "Response Score Distribution",
        icon: "bar-chart-2",
        component: getScoreDistribution.some((d: any) => d.count > 0) ? (
          <CustomBarChart
            data={{
              labels: getScoreDistribution.map((d: any) => d.range),
              datasets: [
                {
                  data: getScoreDistribution.map((d: any) => d.count),
                  color: () => NAVBAR_COLORS.primary,
                },
              ],
            }}
            height={isMobile ? 220 : 260}
          />
        ) : (
          <EmptyChartState
            iconName="bar-chart-2"
            text="No score distribution data"
          />
        ),
      },
      {
        title: "Weekly Audit Activity (Last 8 Weeks)",
        icon: "activity",
        component: getWeeklyActivity.some(
          (d: any) => d.audits > 0 || d.completed > 0,
        ) ? (
          <CustomLineChart
            data={{
              labels: getWeeklyActivity.map((d: any) => d.week),
              datasets: [
                {
                  data: getWeeklyActivity.map((d: any) => d.audits),
                  color: () => NAVBAR_COLORS.light,
                },
                {
                  data: getWeeklyActivity.map((d: any) => d.completed),
                  color: () => NAVBAR_COLORS.primary,
                },
                {
                  data: getWeeklyActivity.map((d: any) => d.ncrs),
                  color: () => "#ef4444",
                },
              ],
              legend: ["Scheduled", "Completed", "NCRs"],
            }}
            height={isMobile ? 220 : 260}
          />
        ) : (
          <EmptyChartState iconName="activity" text="No weekly activity data" />
        ),
      },
      {
        title: "Approval Trend (Last 6 Months)",
        icon: "trending-up",
        component: getApprovalTrend.some(
          (d: any) => d.approved > 0 || d.pending > 0 || d.rejected > 0,
        ) ? (
          <CustomLineChart
            data={{
              labels: getApprovalTrend.map((d: any) => d.month),
              datasets: [
                {
                  data: getApprovalTrend.map((d: any) => d.approved),
                  color: () => NAVBAR_COLORS.primary,
                },
                {
                  data: getApprovalTrend.map((d: any) => d.rejected),
                  color: () => "#ef4444",
                },
                {
                  data: getApprovalTrend.map((d: any) => d.pending),
                  color: () => NAVBAR_COLORS.light,
                },
              ],
              legend: ["Approved", "Rejected", "Pending"],
            }}
            height={isMobile ? 220 : 260}
          />
        ) : (
          <EmptyChartState iconName="trending-up" text="No approval data" />
        ),
      },
    ],
    [
      getApprovalTrend,
      getDepartmentPerformance,
      getAuditorPerformance,
      getMonthlyPerformance,
      getWeeklyActivity,
      getAuditStatusDistribution,
      getResponseStatusDistribution,
      getScoreDistribution,
      isMobile,
    ],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View
        style={{
          paddingHorizontal: isMobile ? 8 : 16,
          paddingTop: 12,
          maxWidth: 1000,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* Key Metrics Cards */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: isMobile ? 6 : 10,
            marginBottom: 16,
          }}
        >
          <MetricCard
            title="Total Audits"
            value={getScheduledAuditsCount()}
            subtitle="scheduled this year"
            iconName="calendar"
          />
          <MetricCard
            title="Total NCRs"
            value={stats.totalNCRs}
            subtitle="non-conformities"
            iconName="alert-triangle"
          />
          <MetricCard
            title="Response Approval"
            value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`}
            subtitle="approved"
            iconName="thumbs-up"
          />
          <MetricCard
            title="Avg Score"
            value={`${avgResponseScore}%`}
            subtitle="average score"
            iconName="bar-chart-2"
          />
        </View>

        {/* Chart Dashboard */}
        <Card style={{ marginBottom: 16, padding: isMobile ? 8 : 12 }}>
          <View
            style={{
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: "bold",
                  color: "#1E293B",
                }}
              >
                Analytics Dashboard
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 10 : 12,
                  color: "#64748B",
                  marginTop: 2,
                }}
              >
                Real-time audit performance metrics and insights
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 6,
                  padding: 2,
                }}
              >
                {[3000, 5000, 7000, 10000].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    onPress={() => setCarouselSpeed(speed)}
                    style={{
                      paddingHorizontal: isMobile ? 6 : 10,
                      paddingVertical: 4,
                      borderRadius: 5,
                      backgroundColor:
                        carouselSpeed === speed
                          ? NAVBAR_COLORS.primary
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: isMobile ? 9 : 11,
                        color: carouselSpeed === speed ? "#FFFFFF" : "#64748B",
                        fontWeight: "500",
                      }}
                    >
                      {speed / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={onRefresh}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: NAVBAR_COLORS.primary,
                }}
              >
                <Icon name="refresh-cw" size={12} color="#FFFFFF" />
                <Text
                  style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "600" }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ChartCarousel
            slides={chartSlides}
            autoPlayInterval={carouselSpeed}
          />
        </Card>

        {/* Bottom Section - Stacked */}
        <View style={{ flexDirection: "column", gap: 10, width: "100%" }}>
          {/* Key Insights */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: NAVBAR_COLORS.bg,
                }}
              >
                <Icon name="target" size={14} color={NAVBAR_COLORS.primary} />
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}
              >
                Key Insights
              </Text>
            </View>
            <View style={{ gap: 4 }}>
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
            </View>
          </Card>

          {/* Top Performers */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: NAVBAR_COLORS.bg,
                }}
              >
                <Icon name="award" size={14} color={NAVBAR_COLORS.primary} />
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}
              >
                Top Performers
              </Text>
            </View>
            {topAuditors.length > 0 ? (
              topAuditors.map((auditor: any, idx: number) => (
                <TopPerformerCard
                  key={idx}
                  rank={idx + 1}
                  name={auditor.name}
                  score={auditor.score}
                  department="Auditor"
                />
              ))
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Icon name="users" size={24} color="#CBD5E1" />
                <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
                  No auditor data available
                </Text>
              </View>
            )}
          </Card>

          {/* Alerts */}
          <Card style={{ padding: isMobile ? 8 : 12, width: "100%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: NAVBAR_COLORS.bg,
                }}
              >
                <Icon
                  name="alert-circle"
                  size={14}
                  color={NAVBAR_COLORS.primary}
                />
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}
              >
                Alerts & Notifications
              </Text>
              {alerts.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: "auto",
                    backgroundColor: NAVBAR_COLORS.primary,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 9,
                      fontWeight: "bold",
                    }}
                  >
                    {alerts.length}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ maxHeight: 250 }}>
              {alerts.length > 0 ? (
                alerts.map((alert: any, idx: number) => (
                  <AlertItem
                    key={idx}
                    message={alert.message}
                    time={alert.time}
                    iconName={alert.iconName}
                  />
                ))
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 16 }}>
                  <Icon name="check-circle" size={24} color="#10B981" />
                  <Text
                    style={{ fontSize: 12, color: "#334155", marginTop: 4 }}
                  >
                    No pending alerts
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}
                  >
                    All systems running smoothly
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Stats Summary */}
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#F8FAFC",
                  borderRadius: 6,
                  padding: 8,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text style={{ fontSize: 9, color: "#64748B" }}>
                  Active Audits
                </Text>
                <Text
                  style={{
                    fontSize: 14,
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
                  backgroundColor: "#F8FAFC",
                  borderRadius: 6,
                  padding: 8,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                }}
              >
                <Text style={{ fontSize: 9, color: "#64748B" }}>Open NCRs</Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#1E293B",
                    marginTop: 2,
                  }}
                >
                  {stats.openNCRs || 0}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
};

export default DashboardAnalytics;
