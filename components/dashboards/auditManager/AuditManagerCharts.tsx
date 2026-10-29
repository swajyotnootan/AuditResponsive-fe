import { Activity } from "lucide-react-native";
import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Stop,
  Svg,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
} from "react-native-svg";
import { COLORS, styles } from "./AuditManagerStyles";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ChartDataItem {
  label: string;
  value: number;
}
export interface PieDataItem {
  name: string;
  value: number;
  color: string;
}
export interface DeptDataItem {
  department: string;
  count: number;
}
export interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: ReactNode;
}

export const AnimatedGlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  delay?: number;
}> = ({ children, style, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[
        styles.glassCard,
        { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================================
// BAR CHART — Clean MNC style, proper Y-axis, baseline
// ============================================================
export const CustomBarChart = ({
  data = [],
  title,
  subtitle,
  isDesktop,
}: {
  data?: ChartDataItem[];
  title: string;
  subtitle: string;
  isDesktop: boolean;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const safeData = data || [];
  const rawMax = Math.max(...safeData.map((d) => d.value), 1);
  // Round max to a nice number for the y-axis so ticks are integers
  const tickStep = Math.max(1, Math.ceil(rawMax / 4));
  const axisMax = tickStep * 4;
  const hasData = safeData.some((d) => d.value > 0);
  const totalAudits = safeData.reduce((sum, d) => sum + d.value, 0);

  const animatedValues = useMemo(
    () => safeData.map(() => new Animated.Value(0)),
    [safeData.length],
  );

  useEffect(() => {
    animatedValues.forEach((v) => v.setValue(0));
    Animated.stagger(
      55,
      animatedValues.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [safeData.length]);

  const chartHeight = isDesktop ? 200 : 160;
  const yTicks = [4, 3, 2, 1, 0]; // top-to-bottom

  return (
    <AnimatedGlassCard style={{ flex: 1, width: "100%" }} delay={100}>
      <View style={styles.chartInnerPadding}>
        {/* Header */}
        <View style={styles.chartHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.chartTotalBadge}>
            <Text style={styles.chartTotalLabel}>Total</Text>
            <Text style={styles.chartTotalValue}>{totalAudits}</Text>
          </View>
        </View>

        {!hasData ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {/* Y-axis labels + gridlines */}
            <View
              style={{
                width: 28,
                height: chartHeight,
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingRight: 6,
              }}
            >
              {yTicks.map((t) => (
                <Text
                  key={t}
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    fontWeight: "500",
                    lineHeight: 12,
                  }}
                >
                  {Math.round((t / 4) * axisMax)}
                </Text>
              ))}
            </View>

            {/* Chart area */}
            <View style={{ flex: 1 }}>
              {/* Gridlines behind bars */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: chartHeight,
                  justifyContent: "space-between",
                  pointerEvents: "none",
                }}
              >
                {yTicks.map((t) => (
                  <View
                    key={t}
                    style={{
                      height: 1,
                      backgroundColor:
                        t === 0 ? COLORS.border : COLORS.borderLight,
                      opacity: t === 0 ? 1 : 0.6,
                    }}
                  />
                ))}
              </View>

              {/* Bars */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  height: chartHeight,
                  gap: isDesktop ? 6 : 3,
                  zIndex: 1,
                }}
              >
                {safeData.map((item, idx) => {
                  const targetPct = (item.value / axisMax) * 100;
                  const isActive = activeIndex === idx;
                  const dimmed = activeIndex !== null && !isActive;
                  const animVal = animatedValues[idx];

                  return (
                    <Pressable
                      key={idx}
                      onHoverIn={() => setActiveIndex(idx)}
                      onHoverOut={() => setActiveIndex(null)}
                      onPressIn={() => setActiveIndex(idx)}
                      onPressOut={() => setActiveIndex(null)}
                      style={{
                        flex: 1,
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        position: "relative",
                      }}
                    >
                      {/* Tooltip */}
                      {isActive && (
                        <View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            bottom: `${targetPct}%`,
                            marginBottom: 6,
                            backgroundColor: COLORS.primary,
                            borderRadius: 6,
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            minWidth: 48,
                            alignItems: "center",
                            zIndex: 50,
                            elevation: 6,
                            shadowColor: "#0F172A",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFF",
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            {item.value}
                          </Text>
                          <Text
                            style={{
                              color: "#BFDBFE",
                              fontSize: 10,
                              fontWeight: "500",
                            }}
                          >
                            {item.label}
                          </Text>
                        </View>
                      )}

                      {/* Bar */}
                      <Animated.View
                        style={{
                          width: "100%",
                          maxWidth: 48, // ← cap the bar thickness
                          alignSelf: "center", // ← center the capped bar in its column
                          height: animVal.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", `${targetPct}%`],
                          }),
                          backgroundColor: isActive
                            ? COLORS.primaryDark
                            : COLORS.primary,
                          borderRadius: 4,
                          opacity: dimmed ? 0.35 : 1,
                          minHeight: item.value > 0 ? 2 : 0,
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* X-axis labels */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  gap: isDesktop ? 6 : 3,
                }}
              >
                {safeData.map((item, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <Text
                      key={idx}
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 10,
                        textAlign: "center",
                        color: isActive ? COLORS.primary : COLORS.textMuted,
                        fontWeight: isActive ? "600" : "500",
                      }}
                    >
                      {item.label}
                    </Text>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};

// ============================================================
// PIE / DONUT CHART
// ============================================================
export const CustomPieChart = ({
  data = [],
  title,
  subtitle,
  total,
  isDesktop,
}: {
  data?: PieDataItem[];
  title: string;
  subtitle: string;
  total?: number;
  isDesktop: boolean;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sweep = useRef(new Animated.Value(0)).current;

  const safeData = data || [];
  const totalValue = safeData.reduce((sum, d) => sum + d.value, 0) || 1;
  const hasData = safeData.some((d) => d.value > 0);
  const activeItem = activeIndex !== null ? safeData[activeIndex] : null;
  const displayTotal = activeItem ? activeItem.value : total || totalValue;
  const displayLabel = activeItem ? activeItem.name : "Total";

  useEffect(() => {
    if (hasData) {
      sweep.setValue(0);
      Animated.timing(sweep, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [safeData.length, hasData]);

  const layout = useMemo(() => {
    let cursor = 0;
    return safeData.map((item) => {
      const angle = (item.value / totalValue) * 360;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      return { item, start, end };
    });
  }, [safeData, totalValue]);

  const buildPath = (
    startAngle: number,
    endAngle: number,
    isExploded: boolean,
  ) => {
    const radius = isExploded ? 62 : 58;
    const innerRadius = 42;
    const cx = 70;
    const cy = 70;
    const mid = (startAngle + endAngle) / 2;
    const midRad = (mid - 90) * (Math.PI / 180);
    const explodeX = isExploded ? Math.cos(midRad) * 6 : 0;
    const explodeY = isExploded ? Math.sin(midRad) * 6 : 0;
    const sRad = (startAngle - 90) * (Math.PI / 180);
    const eRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(sRad) + explodeX;
    const y1 = cy + radius * Math.sin(sRad) + explodeY;
    const x2 = cx + radius * Math.cos(eRad) + explodeX;
    const y2 = cy + radius * Math.sin(eRad) + explodeY;
    const x3 = cx + innerRadius * Math.cos(eRad) + explodeX;
    const y3 = cy + innerRadius * Math.sin(eRad) + explodeY;
    const x4 = cx + innerRadius * Math.cos(sRad) + explodeX;
    const y4 = cy + innerRadius * Math.sin(sRad) + explodeY;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const renderSlice = (
    idx: number,
    start: number,
    end: number,
    color: string,
  ) => {
    const isExploded = activeIndex === idx;
    return (
      <AnimatedPath
        key={idx}
        d={buildPath(start, end, isExploded)}
        fill={color}
        opacity={
          sweep.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [
              0,
              1,
              activeIndex !== null && activeIndex !== idx ? 0.4 : 1,
            ],
          }) as any
        }
        onPressIn={() => setActiveIndex(idx)}
        onPressOut={() => setActiveIndex(null)}
      />
    );
  };

  return (
    <AnimatedGlassCard style={{ flex: 1, width: "100%" }} delay={200}>
      <View style={styles.chartInnerPadding}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {!hasData ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        ) : (
          <View style={styles.pieChartContainer}>
            <View style={styles.donutWrapper}>
              <Svg width="150" height="150" viewBox="0 0 140 140">
                {layout.map(({ item, start, end }, idx) =>
                  renderSlice(idx, start, end, item.color),
                )}
              </Svg>
              <View style={styles.donutCenter} pointerEvents="none">
                <Text
                  style={[
                    styles.donutTotal,
                    { color: activeItem ? activeItem.color : COLORS.textMain },
                  ]}
                >
                  {displayTotal}
                </Text>
                <Text style={styles.donutLabel} numberOfLines={2}>
                  {displayLabel}
                </Text>
              </View>
            </View>
            <View style={styles.legendContainer}>
              {safeData.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={[
                    styles.legendItem,
                    activeIndex === idx && styles.legendItemActive,
                  ]}
                  onHoverIn={() => setActiveIndex(idx)}
                  onHoverOut={() => setActiveIndex(null)}
                  onPressIn={() => setActiveIndex(idx)}
                  onPressOut={() => setActiveIndex(null)}
                >
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <View style={styles.legendTextContainer}>
                    <Text
                      style={[
                        styles.legendText,
                        { fontWeight: activeIndex === idx ? "600" : "500" },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.legendValue}>{item.value}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};

// ============================================================
// LINE CHART — Blue gradient line
// ============================================================
export const DepartmentLineChart = ({
  data = [],
  isDesktop,
}: {
  data?: DeptDataItem[];
  isDesktop: boolean;
}) => {
  const safeData = data || [];
  const totalNCRs = safeData.reduce((sum, d) => sum + d.count, 0);
  const hasData = safeData.length > 0 && totalNCRs > 0;
  const maxCount = Math.max(...safeData.map((d) => d.count), 1);
  const svgWidth = 500;
  const svgHeight = 200;
  const padding = { top: 30, right: 20, bottom: 40, left: 40 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxCount / yTicks) * i),
  );

  const points = hasData
    ? safeData.map((item, idx) => ({
        x: padding.left + (idx / (safeData.length - 1 || 1)) * chartWidth,
        y: padding.top + chartHeight - (item.count / maxCount) * chartHeight,
        label: item.department,
        value: item.count,
      }))
    : [];

  const linePath =
    points.length > 0
      ? points
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : "";
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : "";

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const drawAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  const pathLength = useMemo(() => {
    return (
      points.reduce((acc, p, i) => {
        if (i === 0) return 0;
        const prev = points[i - 1];
        return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
      }, 0) || 1
    );
  }, [points.length, safeData.length]);

  useEffect(() => {
    if (hasData) {
      drawAnim.setValue(0);
      dotAnim.setValue(0);
      Animated.sequence([
        Animated.timing(drawAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [safeData.length, hasData]);

  const handleChartPress = (event: any) => {
    const x = event.nativeEvent.locationX;
    if (!points.length) return;
    let closestIdx = 0;
    let minDist = Math.abs(points[0].x - x);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - x);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    setActiveIndex(closestIdx);
  };

  return (
    <AnimatedGlassCard style={{ flex: 1, width: "100%" }} delay={300}>
      <View style={styles.chartInnerPadding}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.cardTitle}>NCR by Department</Text>
            <Text style={styles.cardSubtitle}>
              Distribution across departments
            </Text>
          </View>
          <View style={styles.chartTotalBadge}>
            <Text style={styles.chartTotalValue}>{totalNCRs}</Text>
            <Text style={styles.chartTotalLabel}>Total</Text>
          </View>
        </View>
        {!hasData ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No department data available</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 4 }}>
            <Pressable
              onHoverIn={handleChartPress}
              onPressIn={handleChartPress}
              onHoverOut={() => setActiveIndex(null)}
              onPressOut={() => setActiveIndex(null)}
              style={{ width: "100%" }}
            >
              <Svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              >
                <Defs>
                  <SvgLinearGradient
                    id="areaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <Stop
                      offset="0%"
                      stopColor={COLORS.primary}
                      stopOpacity="0.15"
                    />
                    <Stop
                      offset="100%"
                      stopColor={COLORS.primary}
                      stopOpacity="0.0"
                    />
                  </SvgLinearGradient>
                </Defs>
                {yTickValues.map((val, idx) => {
                  const y =
                    padding.top + chartHeight - (val / maxCount) * chartHeight;
                  return (
                    <G key={`y-${idx}`}>
                      <Line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke={COLORS.borderLight}
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                      <SvgText
                        x={padding.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill={COLORS.textMuted}
                        fontWeight="500"
                      >
                        {val}
                      </SvgText>
                    </G>
                  );
                })}
                <Line
                  x1={padding.left}
                  y1={padding.top + chartHeight}
                  x2={svgWidth - padding.right}
                  y2={padding.top + chartHeight}
                  stroke={COLORS.border}
                  strokeWidth="1"
                />
                {areaPath && (
                  <AnimatedPath
                    d={areaPath}
                    fill="url(#areaGradient)"
                    opacity={drawAnim as any}
                  />
                )}
                {linePath && (
                  <AnimatedPath
                    d={linePath}
                    fill="none"
                    stroke={COLORS.primary} // Blue stroke
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`${pathLength} ${pathLength}`}
                    strokeDashoffset={
                      drawAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [pathLength, 0],
                      }) as any
                    }
                  />
                )}
                {points.map((p, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <G key={`point-${idx}`} pointerEvents="none">
                      {isActive && (
                        <>
                          <Line
                            x1={p.x}
                            y1={padding.top}
                            x2={p.x}
                            y2={padding.top + chartHeight}
                            stroke={COLORS.primary}
                            strokeWidth="1"
                            strokeDasharray="4,4"
                            opacity="0.3"
                          />
                          <Circle
                            cx={p.x}
                            cy={p.y}
                            r="14"
                            fill={COLORS.primary}
                            opacity="0.1"
                          />
                        </>
                      )}
                      <AnimatedCircle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? 6 : 4}
                        fill={COLORS.surface}
                        stroke={COLORS.primary} // Blue dot
                        strokeWidth="2"
                        opacity={dotAnim as any}
                      />
                      {isActive && (
                        <G>
                          <Rect
                            x={p.x - 30}
                            y={p.y - 28}
                            width="60"
                            height="20"
                            rx="4"
                            fill={COLORS.primary}
                          />
                          <SvgText
                            x={p.x}
                            y={p.y - 15}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="#FFFFFF"
                          >
                            {p.value} NCRs
                          </SvgText>
                        </G>
                      )}
                      <SvgText
                        x={p.x}
                        y={padding.top + chartHeight + 16}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isActive ? COLORS.primary : COLORS.textSub}
                        fontWeight={isActive ? "600" : "500"}
                      >
                        {p.label.length > 8
                          ? p.label.substring(0, 7) + "…"
                          : p.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </Pressable>
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};

export const NcrTrendChart = ({
  data = [],
  isDesktop,
}: {
  data?: ChartDataItem[];
  isDesktop: boolean;
}) => (
  <CustomBarChart
    data={data}
    title="NCR Trend"
    subtitle="Monthly NCR count"
    isDesktop={isDesktop}
  />
);

export const NcrPriorityChart = ({
  data = [],
  isDesktop,
}: {
  data?: PieDataItem[];
  isDesktop: boolean;
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <CustomPieChart
      data={data}
      title="NCR by Priority"
      subtitle="Severity breakdown"
      total={total}
      isDesktop={isDesktop}
    />
  );
};

export const ActivityFeed = ({
  activities = [],
  isDesktop,
}: {
  activities?: ActivityItem[];
  isDesktop: boolean;
}) => {
  const safeActivities = activities || [];
  return (
    <AnimatedGlassCard style={{ flex: 1, width: "100%" }} delay={400}>
      <View style={styles.chartInnerPadding}>
        <View style={styles.feedHeader}>
          <View>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <Text style={styles.cardSubtitle}>Latest updates and actions</Text>
          </View>
          <View style={styles.feedIconBox}>
            <Activity size={16} color={COLORS.primary} />
          </View>
        </View>
        {safeActivities.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No recent activity</Text>
          </View>
        ) : (
          <View style={{ gap: 2 }}>
            {safeActivities.map((activity, idx) => (
              <View key={idx} style={styles.feedItem}>
                <View style={styles.feedItemIcon}>{activity.icon}</View>
                <View style={styles.feedItemContent}>
                  <Text style={styles.feedItemTitle}>{activity.title}</Text>
                  <Text style={styles.feedItemDesc}>
                    {activity.description}
                  </Text>
                </View>
                <Text style={styles.feedItemTime}>{activity.time}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};
