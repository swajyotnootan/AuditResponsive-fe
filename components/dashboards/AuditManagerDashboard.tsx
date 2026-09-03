import { LinearGradient } from "expo-linear-gradient";
import {
  Circle,
  Defs,
  G,
  Line, // ✅ Aliased to avoid conflict
  Path,
  Stop,
  Svg,
  LinearGradient as SvgLinearGradient,
  Text as SvgText, // ✅ Aliased to avoid conflict with React Native Text
} from "react-native-svg";

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  AlertCircle,
  ArrowRightCircle,
  BarChart2,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Grid,
  Layers,
  Lock,
  MessageSquare,
  UserCheck,
  X,
} from "lucide-react-native";
import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable, // ✅ ADD THIS
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import Form3View from "@/components/dashboards/auditManager/Form3View";
import Form4View from "@/components/dashboards/auditManager/Form4View";
import Form5Dashboard from "@/components/dashboards/auditManager/Form5Dashboard";
import Form5DetailedView from "@/components/dashboards/auditManager/Form5DetailedView";
import Form5View from "@/components/dashboards/auditManager/Form5View";
import Form9View from "@/components/dashboards/auditManager/Form9View";
import NCRDashboard from "@/components/dashboards/auditManager/NCRDashboard";
import WeekSelectionView from "@/components/dashboards/auditManager/WeekSelectionView";
import { apiClient, ncrAPI, userAPI } from "@/services/api";
import { Picker } from "@react-native-picker/picker";
import YearFilter from "../common/YearFilter";
import { useAuth } from "../context/AuthContext";
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";
import NCRPendingDashboard from "./auditManager/NCRPendingDashboard";
import NCRViewManager from "./auditor/view/NCRViewManager";

const APPROVAL_PICKER_STYLE: any = {
  height: 48,
  width: "100%",
  borderWidth: 0,
  borderColor: "transparent",
  backgroundColor: "transparent",
  color: "#334155",
  paddingHorizontal: 16,
  outline: "none",
};

// ============================================================================
// GLASSMORPHIC PALETTE & CONSTANTS
// ============================================================================
const COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  accent: "#2563EB",
  accentGradient: ["#2563EB", "#3B82F6", "#60A5FA"] as const,
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
  textMain: "#1e293b",
  textSub: "#64748b",
  border: "#e2e8f0",
  danger: "#e11d48",
  success: "#059669",
  successLight: "#D1FAE5",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  gray: {
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
  },
  chartColors: [
    "#1e3a8a",
    "#1d4ed8",
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#bfdbfe",
  ],
  glass: {
    light:
      Platform.OS === "android"
        ? "rgba(255,255,255,0.92)"
        : "rgba(255,255,255,0.75)",
    border: "rgba(255,255,255,0.4)",
  },
};

const departmentDisplayToEnum: Record<string, string> = {
  HR: "HR",
  "R&D": "ENGG",
  Purchase: "PURCHASE",
  RMS: "STORES_DESPATCH",
  SQA: "QA",
  PPC: "PPC",
  Production: "PRODUCTION",
  "QA/QC": "QA",
  FGS: "STORES_DESPATCH",
  Marketing: "MARKETING",
  "IMS (BE)": "MR",
  Maintenance: "PLANT_MAINTENANCE",
  Management: "UNIT_HEAD",
  "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE",
  "Stores & Despatch": "STORES_DESPATCH",
};
// ============================================================================
// ANIMATED GLASS CARD
// ============================================================================
const AnimatedGlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  delay?: number;
}> = ({ children, style, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
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

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================
interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  isDesktop: boolean;
}
interface ChartDataItem {
  label: string;
  value: number;
}
interface PieDataItem {
  name: string;
  value: number;
  color: string;
}
interface DeptDataItem {
  department: string;
  count: number;
}
interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: ReactNode;
}

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================
const KpiCard = ({ title, value, icon, isDesktop }: KpiCardProps) => (
  <AnimatedGlassCard
    style={
      isDesktop
        ? [styles.kpiCard, { flex: 1 }]
        : [styles.kpiCard, { width: "100%" }]
    }
  >
    <View style={styles.kpiIconContainer}>{icon}</View>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiTitle}>{title}</Text>
  </AnimatedGlassCard>
);

// ============================================================================
// REUSABLE UI COMPONENTS (UPDATED FOR MNC PROFESSIONAL LOOK)
// ============================================================================

// ============================================================================
// REUSABLE UI COMPONENTS - PROFESSIONAL MNC STYLE
// ============================================================================

const SummaryStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: any) => (
  <AnimatedGlassCard
    style={[styles.summaryStatCard, { borderLeftColor: color }]}
  >
    <View style={styles.summaryStatHeader}>
      <View style={[styles.summaryStatIcon, { backgroundColor: `${color}15` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={[styles.summaryStatValue, { color: color }]}>{value}</Text>
    </View>
    <Text style={styles.summaryStatTitle}>{title}</Text>
    {subtitle && <Text style={styles.summaryStatSubtitle}>{subtitle}</Text>}
  </AnimatedGlassCard>
);

const CustomBarChart = ({
  data,
  title,
  subtitle,
  isDesktop,
}: {
  data: ChartDataItem[];
  title: string;
  subtitle: string;
  isDesktop: boolean;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const hasData = data.some((d) => d.value > 0);
  const totalAudits = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 2 : 1, width: "100%" }}>
      <View style={styles.chartInnerPadding}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.chartTotalBadge}>
            <Text style={styles.chartTotalValue}>{totalAudits}</Text>
            <Text style={styles.chartTotalLabel}>Total Audits</Text>
          </View>
        </View>
        {!hasData ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        ) : (
          <View style={[styles.barChartContainer, { overflow: "visible" }]}>
            {data.map((item, idx) => {
              const heightPercent = (item.value / maxValue) * 100;
              return (
                <Pressable
                  key={idx}
                  style={styles.barColumn}
                  // ✅ Desktop Hover Events
                  onHoverIn={() => setActiveIndex(idx)}
                  onHoverOut={() => setActiveIndex(null)}
                  // ✅ Mobile Touch Events
                  onPressIn={() => setActiveIndex(idx)}
                  onPressOut={() => setActiveIndex(null)}
                >
                  {/* ✅ FLOATING TOOLTIP */}
                  {activeIndex === idx && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        marginBottom: 8,
                        backgroundColor: "#1E293B",
                        borderRadius: 8,
                        padding: 8,
                        minWidth: 100,
                        alignItems: "center",
                        zIndex: 50,
                      }}
                      pointerEvents="none"
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 12,
                          fontWeight: "bold",
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          color: "#93C5FD",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        {item.value}
                      </Text>
                      {/* Little arrow pointing down */}
                      <View
                        style={{
                          position: "absolute",
                          bottom: -4,
                          left: "50%",
                          marginLeft: -4,
                          width: 8,
                          height: 8,
                          backgroundColor: "#1E293B",
                          transform: [{ rotate: "45deg" }],
                        }}
                      />
                    </View>
                  )}

                  <View style={styles.barWrapper}>
                    <LinearGradient
                      colors={["#3B82F6", "#1E40AF"]}
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          // ✅ Dim other bars when one is active
                          opacity:
                            activeIndex !== null && activeIndex !== idx
                              ? 0.4
                              : 1,
                        },
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barValue,
                      {
                        opacity:
                          activeIndex !== null && activeIndex !== idx ? 0.4 : 1,
                      },
                    ]}
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={[
                      styles.barLabel,
                      {
                        opacity:
                          activeIndex !== null && activeIndex !== idx ? 0.4 : 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};

const CustomPieChart = ({
  data,
  title,
  subtitle,
  total,
  isDesktop,
}: {
  data: PieDataItem[];
  title: string;
  subtitle: string;
  total?: number;
  isDesktop: boolean;
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const hasData = data.some((d) => d.value > 0);

  // ✅ Dynamic center text based on hover/touch
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

  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 1 : 1, width: "100%" }}>
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
                          // ✅ Dim other slices when one is active
                          opacity={
                            activeIndex !== null && activeIndex !== idx
                              ? 0.4
                              : 1
                          }
                          // ✅ Mobile Touch & Basic Web Click
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
              {/* ✅ CENTER TEXT (Updates dynamically) */}
              <View style={styles.donutCenter} pointerEvents="none">
                <Text style={styles.donutTotal}>{displayTotal}</Text>
                <Text style={styles.donutLabel} numberOfLines={2}>
                  {displayLabel}
                </Text>
              </View>
            </View>

            {/* ✅ LEGEND (Also interactive) */}
            <View style={styles.legendContainer}>
              {data.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={[
                    styles.legendItem,
                    activeIndex === idx && { backgroundColor: "#E2E8F0" },
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
                    <Text style={styles.legendText}>{item.name}</Text>
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

// =====================================================
// DepartmentLineChart - FIXED VERSION
// =====================================================
const DepartmentLineChart = ({
  data,
  isDesktop,
}: {
  data: DeptDataItem[];
  isDesktop: boolean;
}) => {
  const totalNCRs = data.reduce((sum, d) => sum + d.count, 0);
  const hasData = data.length > 0 && totalNCRs > 0;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 280;
  const padding = { top: 50, right: 20, bottom: 50, left: 50 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // ✅ Y-axis ticks (5 levels)
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxCount / yTicks) * i),
  );

  // ✅ SAFE: Calculate points only if data exists
  const points = hasData ? data.map((item, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (item.count / maxCount) * chartHeight;
    return { x, y, label: item.department, value: item.count };
  }) : [];

  // ✅ SAFE: Build paths only if points exist
  const linePath = points.length > 0
    ? points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    : "";

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : "";

  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 2 : 1, width: "100%" }}>
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
            <Text style={styles.chartTotalLabel}>Total NCRs</Text>
          </View>
        </View>
        {!hasData ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No department data available</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
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
                  <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                </SvgLinearGradient>
                <SvgLinearGradient
                  id="lineGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <Stop offset="0%" stopColor="#1E40AF" />
                  <Stop offset="100%" stopColor="#3B82F6" />
                </SvgLinearGradient>
              </Defs>

              {/* Y-axis grid lines and labels */}
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
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                    <SvgText
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#64748B"
                      fontWeight="500"
                    >
                      {val}
                    </SvgText>
                  </G>
                );
              })}

              {/* X-axis baseline */}
              <Line
                x1={padding.left}
                y1={padding.top + chartHeight}
                x2={svgWidth - padding.right}
                y2={padding.top + chartHeight}
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />

              {/* Y-axis line */}
              <Line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + chartHeight}
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />

              {/* ✅ SAFE: Only render path if it exists */}
              {areaPath && (
                <Path d={areaPath} fill="url(#areaGradient)" />
              )}

              {linePath && (
                <Path
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points and X-axis labels */}
              {points.map((p, idx) => (
                <G key={`point-${idx}`}>
                  {/* Outer glow circle */}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="#3B82F6"
                    opacity="0.15"
                  />
                  {/* White border circle */}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill="#FFFFFF"
                    stroke="#1E40AF"
                    strokeWidth="2.5"
                  />
                  {/* Inner dot */}
                  <Circle cx={p.x} cy={p.y} r="3.5" fill="#1E40AF" />

                  {/* Value label above point */}
                  <SvgText
                    x={p.x}
                    y={p.y - 16}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill="#1E40AF"
                  >
                    {p.value}
                  </SvgText>

                  {/* X-axis label (department name) */}
                  <SvgText
                    x={p.x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    fontWeight="600"
                  >
                    {p.label.length > 10
                      ? p.label.substring(0, 9) + "..."
                      : p.label}
                  </SvgText>
                </G>
              ))}
            </Svg>
          </View>
        )}
      </View>
    </AnimatedGlassCard>
  );
};

const ActivityFeed = ({
  activities,
  isDesktop,
}: {
  activities: ActivityItem[];
  isDesktop: boolean;
}) => (
  <AnimatedGlassCard style={{ flex: isDesktop ? 1 : 1, width: "100%" }}>
    {/* ✅ ADDED: Padding wrapper */}
    <View style={styles.chartInnerPadding}>
      <View style={styles.feedHeader}>
        <View>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <Text style={styles.cardSubtitle}>Latest updates and actions</Text>
        </View>
        <View style={styles.feedIconBox}>
          <Activity size={18} color={COLORS.primary} />
        </View>
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {activities.map((activity, idx) => (
            <View key={idx} style={styles.feedItem}>
              <View style={styles.feedItemIcon}>{activity.icon}</View>
              <View style={styles.feedItemContent}>
                <Text style={styles.feedItemTitle}>{activity.title}</Text>
                <Text style={styles.feedItemDesc}>{activity.description}</Text>
              </View>
              <Text style={styles.feedItemTime}>{activity.time}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </AnimatedGlassCard>
);

const NcrCard = ({
  title,
  description,
  icon,
  onPress,
  badgeText,
  isDesktop,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={
      isDesktop
        ? styles.ncrCard
        : [styles.ncrCard, { width: "100%", marginBottom: 16 }]
    }
  >
    <View style={styles.ncrCardContent}>
      <View style={styles.ncrCardIcon}>
        {React.cloneElement(icon as any, { color: COLORS.white })}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ncrCardTitle}>{title}</Text>
        <Text style={styles.ncrCardDesc}>{description}</Text>
      </View>
      <ChevronRight size={20} color={COLORS.primary} style={{ opacity: 0.6 }} />
    </View>
    <View style={styles.ncrCardBadge}>
      <Text style={styles.ncrCardBadgeText}>{badgeText}</Text>
    </View>
  </TouchableOpacity>
);

const RequestCard = ({
  request,
  onView,
}: {
  request: any;
  onView: (req: any) => void;
}) => {
  const typeLabel = request.type === "RESCHEDULE" ? "Reschedule" : "Extension";
  const typeIcon = request.type === "RESCHEDULE" ? "📅" : "⏰";
  return (
    <TouchableOpacity
      onPress={() => onView(request)}
      style={styles.requestCard}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestBadges}>
          <View style={[styles.badge, { backgroundColor: COLORS.bg }]}>
            <Text style={[styles.badgeText, { color: COLORS.primary }]}>
              <Text>{typeIcon}</Text> {typeLabel}
            </Text>
          </View>
          <Text style={styles.requestDate}>
            {new Date(request.requestedAt).toLocaleDateString()}
          </Text>
          <View style={[styles.badge, { backgroundColor: COLORS.lighter }]}>
            <Text style={[styles.badgeText, { color: COLORS.dark }]}>
              {request.status || "PENDING"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.requestTitle}>
        {request.auditType} - {request.department}
      </Text>
      <View style={styles.requestSubtitle}>
        <UserCheck size={14} color={COLORS.secondary} />
        <Text style={{ fontSize: 14, color: COLORS.textSub, marginLeft: 6 }}>
          {request.auditorName} → {request.auditeeName}
        </Text>
      </View>
      <View style={styles.requestFooter}>
        <Text style={styles.requestFooterText}>
          {request.type === "RESCHEDULE"
            ? `Current: ${request.currentDate} → Requested: ${request.requestedNewDate}`
            : `Current end: ${request.currentDate} → Requested end: ${request.requestedNewToDate}`}
        </Text>
      </View>
      <View style={styles.requestViewBtn}>
        <Eye size={16} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function AuditManagerDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const isSmallMobile = width < 375;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isCompactHeader = width < 900;
  const isVerySmall = width < 420;
  const isNarrowTablet = width >= 768 && width < 900;
  const { user } = useAuth();

  const getFullNameWithTitle = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim() || "User";
    let title = user?.salutation || user?.title || "Mr.";
    return `${title} ${fullName}`;
  };

  const getDisplayName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.name) return user.name.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };
  const greeting = getGreeting();
  const displayName = getDisplayName();
  const fullDisplayName = getFullNameWithTitle();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedForm5Month, setSelectedForm5Month] = useState<string | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState(() => {
    const urlYear = params?.year ? parseInt(params.year as string) : null;
    return urlYear || new Date().getFullYear();
  });

  const currentYear = new Date().getFullYear();
  const [availableYears] = useState(() => {
    const years = [];
    for (let i = 5; i >= -5; i--) years.push(currentYear + i);
    return years;
  });

  const [stats, setStats] = useState({
    totalAudits: 0,
    completedAudits: 0,
    pendingSchedules: 0,
    openNCRs: 0,
    pendingRequests: 0,
    pendingCaVerification: 0,
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allNcrs, setAllNcrs] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [form3Status, setForm3Status] = useState({ status: "NOT_STARTED" });
  const [form4Status, setForm4Status] = useState({ status: "NOT_STARTED" });
  const [hasApprovedForm5, setHasApprovedForm5] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [departmentTeamMembers, setDepartmentTeamMembers] = useState({
    auditors: [] as any[],
    teamAuditorIds: [] as any[],
    leadAuditorName: null as string | null,
    teamAuditorNames: [] as string[],
  });
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedReassignAuditorId, setSelectedReassignAuditorId] =
    useState<string>("");
  const [additionalAuditorIds, setAdditionalAuditorIds] = useState<string[]>(
    [],
  );

  const [fullyCompetentLeadAuditors, setFullyCompetentLeadAuditors] = useState<
    any[]
  >([]);
  const [fullyCompetentTeamAuditors, setFullyCompetentTeamAuditors] = useState<
    any[]
  >([]);
  const [loadingCompetent, setLoadingCompetent] = useState(false);
  const [approvalAuditors, setApprovalAuditors] = useState<any[]>([]);
  const [approvalTeamInfo, setApprovalTeamInfo] = useState<{
    teamAuditorIds: number[];
  }>({ teamAuditorIds: [] });
  const [showReassignOptions, setShowReassignOptions] = useState(false);
  const [showAddAnotherAuditor, setShowAddAnotherAuditor] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [showWeekSelection, setShowWeekSelection] = useState(false);
  const [activeNcrViewId, setActiveNcrViewId] = useState<string | null>(null);
  const [showForm5Detailed, setShowForm5Detailed] = useState(false);
  const [form5DetailedParams, setForm5DetailedParams] = useState<{
    year?: number;
    month?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // ✅ FIXED: EXACT COPY OF LEAD AUDITOR PATTERN FOR TAB ROUTING
  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);

      // Map tab values to internal section names
      const tabMap: Record<string, string> = {
        dashboard: "dashboard",
        schedules: "schedules",
        ncr: "ncr",
        requests: "requests",
        schedule: "schedules",
        scheduling: "schedules",
        "ncr-management": "ncr",
        "ncr-pending": "ncr",
      };

      const normalizedTab = tabMap[tabValue] || tabValue;
      setActiveSection(normalizedTab);
    } else {
      // Default to dashboard if no tab specified
      setActiveSection("dashboard");
    }
  }, [params?.tab]);

  useEffect(() => {
    fetchAllData();
  }, [selectedYear]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, ncrsRes, reqRes, f3Res, f4Res, f5Res, usersRes] =
        await Promise.all([
          apiClient
            .get(`/api/audit-schedule/year/${selectedYear}`)
            .catch(() => []),
          ncrAPI.getAll().catch(() => []),
          apiClient.get("/api/audit-schedule/pending-requests").catch(() => []),
          apiClient.get(`/api/audit-plan/${selectedYear}`).catch(() => null),
          apiClient
            .get(`/api/department-plan/${selectedYear}`)
            .catch(() => null),
          apiClient
            .get(`/api/audit-schedule/available-months/${selectedYear}`)
            .catch(() => []),
          userAPI.getAll().catch(() => []),
        ]);

      const allSchedules = Array.isArray(statsRes)
        ? statsRes
        : (statsRes as any)?.data || [];
      const allNcrsData = Array.isArray(ncrsRes)
        ? ncrsRes
        : (ncrsRes as any)?.data || [];
      const requests = Array.isArray(reqRes)
        ? reqRes
        : (reqRes as any)?.data || [];
      const users = Array.isArray(usersRes)
        ? usersRes
        : (usersRes as any)?.data || [];

      setSchedules(allSchedules);
      setAllNcrs(allNcrsData);
      setPendingRequests(requests);
      setAllUsersList(users);
      setForm3Status({ status: f3Res?.approvalStatus || "NOT_STARTED" });
      setForm4Status({ status: f4Res?.approvalStatus || "NOT_STARTED" });
      setHasApprovedForm5(
        Array.isArray(f5Res)
          ? f5Res.some((m: any) => m.approvalStatus === "APPROVED")
          : false,
      );

      setStats({
        totalAudits: allSchedules.length,
        completedAudits: allSchedules.filter(
          (s: any) => s.status === "COMPLETED" || s.status === "CLOSED",
        ).length,
        pendingSchedules: allSchedules.filter(
          (s: any) =>
            s.approvalStatus === "PENDING_APPROVAL" ||
            (s.approvalStatus === "APPROVED" && s.status === "SCHEDULED"),
        ).length,
        openNCRs: allNcrsData.filter(
          (n: any) => n.status !== "CLOSED" && n.status !== "NCR2_COMPLETED",
        ).length,
        pendingRequests: requests.length,
        pendingCaVerification: allNcrsData.filter(
          (n: any) =>
            n.status === "IN_PROGRESS" || n.status === "NCR2_IN_PROGRESS",
        ).length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentTeamMembers = async (
    departmentName: string,
    request?: any,
  ) => {
    if (!departmentName) return;
    setLoadingTeamMembers(true);

    try {
      const enumValue =
        departmentDisplayToEnum[departmentName] ||
        departmentName.toUpperCase().replace(/[&\s\/]+/g, "_");

      // ---------- Helpers ----------
      const parseArr = (val: any): any[] => {
        if (!val || val === "null") return [];
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      const getIds = (s: any): number[] => {
        const ids =
          parseArr(s?.coAuditorIds).length > 0
            ? parseArr(s?.coAuditorIds)
            : parseArr(s?.teamAuditorIds);
        return ids.map((x: any) => Number(x)).filter((n) => !isNaN(n));
      };
      const getNames = (s: any): string[] => {
        const names =
          parseArr(s?.coAuditorNames).length > 0
            ? parseArr(s?.coAuditorNames)
            : parseArr(s?.teamAuditorNames);
        return names.map(String);
      };
      const hasTeam = (s: any) =>
        getIds(s).length > 0 || getNames(s).length > 0;

      // ---------- STEP 1: exact schedule by ID ----------
      let target: any = schedules.find(
        (s: any) => String(s.id) === String(request?.scheduleId),
      );

      // ---------- STEP 2: sibling schedule with team (same dept) ----------
      if (!target || !hasTeam(target)) {
        const reqLower = String(departmentName).trim().toLowerCase();
        const siblings = schedules.filter((s: any) => {
          const d = String(s.department || "")
            .trim()
            .toLowerCase();
          return d === reqLower || d === String(enumValue).toLowerCase();
        });
        target = siblings.find(hasTeam) || target;
      }

      // ---------- STEP 3: department API ----------
      if (!target || !hasTeam(target)) {
        const res = await apiClient
          .get(
            `/api/audit-schedule/year/${selectedYear}/department/${encodeURIComponent(enumValue)}`,
          )
          .catch(() => []);
        const list = Array.isArray(res) ? res : (res as any)?.data || [];
        target = list.find((s: any) => hasTeam(s)) || target;
      }

      // ---------- STEP 4: build the pool (ONLY team auditors, EXCLUDE lead auditor) ----------
      let teamIds: number[] = target ? getIds(target) : [];
      let teamNames: string[] = target ? getNames(target) : [];

      // Keep lead info for the UI display section (⭐ Lead: ...)
      const leadId = target?.leadAuditorId || target?.auditorId;
      const leadName = target?.leadAuditorName || target?.auditorName || null;

      // ❌ FIX: Remove Lead Auditor from the dropdown pool
      if (leadId) {
        teamIds = teamIds.filter((id) => Number(id) !== Number(leadId));
      }
      if (leadName) {
        teamNames = teamNames.filter(
          (name) => String(name) !== String(leadName),
        );
      }

      console.log(
        "✅ [MATRIX-SOURCE] scheduleId:",
        target?.id,
        "| team ids (no lead):",
        teamIds,
        "| lead:",
        leadName,
      );

      let assignedAuditors: any[] = teamIds.map((id, i) => {
        const u = allUsersList.find((x: any) => Number(x.id) === Number(id));
        if (u) return u;
        const parts = (teamNames[i] || "Unknown").split(" ");
        return {
          id: Number(id),
          firstName: parts[0],
          lastName: parts.slice(1).join(" "),
          role: "AUDITOR",
        };
      });

      // Names-only fallback
      if (assignedAuditors.length === 0 && teamNames.length > 0) {
        assignedAuditors = teamNames.map((name) => {
          const u = allUsersList.find(
            (x: any) =>
              `${x.firstName} ${x.lastName}`.toLowerCase() ===
              name.toLowerCase(),
          );
          return (
            u || {
              id: -1,
              firstName: name.split(" ")[0],
              lastName: name.split(" ").slice(1).join(" "),
              role: "AUDITOR",
            }
          );
        });
      }

      // LAST RESORT only
      if (assignedAuditors.length === 0) {
        const auditorsRes = await apiClient
          .get(
            `/api/audit-schedule/regular-auditors/by-department/${encodeURIComponent(enumValue)}`,
          )
          .catch(() => []);
        assignedAuditors = Array.isArray(auditorsRes)
          ? auditorsRes
          : (auditorsRes as any)?.data || [];

        // Filter out lead from last resort too
        if (leadId) {
          assignedAuditors = assignedAuditors.filter(
            (a: any) => Number(a.id) !== Number(leadId),
          );
        }
      }

      const validIds = assignedAuditors
        .map((a: any) => Number(a.id))
        .filter((n) => !isNaN(n) && n > 0);

      setApprovalAuditors(assignedAuditors);
      setApprovalTeamInfo({ teamAuditorIds: validIds });
      setDepartmentTeamMembers({
        auditors: assignedAuditors,
        teamAuditorIds: validIds,
        leadAuditorName: leadName, // Still keep this for the UI display text
        teamAuditorNames: assignedAuditors.map(
          (a: any) => `${a.firstName} ${a.lastName}`,
        ),
      });
    } catch (error) {
      console.error("❌ Error fetching department team:", error);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const convertToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(" ");
    const time = parts[0];
    const modifier = parts[1];
    let [hours, minutes] = time.split(":");
    let h = parseInt(hours);
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    return h * 60 + parseInt(minutes);
  };

  const checkConflictsForAuditor = async (
    auditorId: string | number,
    isReassign = false,
  ) => {
    if (!selectedRequest || !auditorId) return;
    setCheckingAvailability(true);
    try {
      const daySchedulesRes = await apiClient
        .get(`/api/audit-schedule/by-date/${selectedRequest.currentDate}`)
        .catch(() => []);
      const daySchedules = Array.isArray(daySchedulesRes)
        ? daySchedulesRes
        : (daySchedulesRes as any)?.data || [];
      const conflict = daySchedules.find((schedule: any) => {
        if (Number(schedule.auditorId) !== Number(auditorId)) return false;
        if (schedule.id === selectedRequest.scheduleId) return false;
        const s1Start = convertToMinutes(selectedRequest.currentStartTime);
        const s1End = convertToMinutes(selectedRequest.currentEndTime);
        const s2Start = convertToMinutes(schedule.startTime);
        const s2End = convertToMinutes(schedule.endTime);
        return s1Start < s2End && s1End > s2Start;
      });
      if (conflict) {
        const auditor = departmentTeamMembers.auditors.find(
          (a: any) => String(a.id) === String(auditorId),
        );
        setConflictWarning({
          type: isReassign ? "reassign" : "coauditor",
          auditorId,
          auditorName: auditor?.firstName || "Unknown",
          conflicts: [{ date: selectedRequest.currentDate, conflict }],
        });
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error("Error checking conflicts:", error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleViewRequest = (request: any) => {
    console.log(
      "🚀 [DEBUG 0] handleViewRequest triggered. Full request object:",
      request,
    );
    setSelectedRequest(request);
    // ✅ Pass the FULL request object so we can access auditElements, currentDate, etc.
    fetchDepartmentTeamMembers(request.department, request);
    setShowRequestModal(true);
  };

  const resetAndClose = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowRequestModal(false);
    setApprovalComment("");
    setRejectionReason("");
    setSelectedReassignAuditorId("");
    setAdditionalAuditorIds([]);
    setShowReassignOptions(false);
    setShowAddAnotherAuditor(false);
    setSelectedRequest(null);
    setConflictWarning(null);

    // ✅ Clear competent auditor states
    setFullyCompetentLeadAuditors([]);
    setFullyCompetentTeamAuditors([]);

    fetchAllData();
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const endpoint =
        selectedRequest.type === "RESCHEDULE"
          ? "approve-reschedule"
          : "approve-extension";
      const body = {
        comments: approvalComment,
        reassignToAuditorId: showReassignOptions
          ? selectedReassignAuditorId
          : null,
        additionalAuditorIds: showAddAnotherAuditor ? additionalAuditorIds : [],
        keepOriginalAuditor: showAddAnotherAuditor && !showReassignOptions,
      };
      await apiClient.post(
        `/api/audit-schedule/request/${selectedRequest.requestId}/${endpoint}`,
        body,
        { userId: user?.id },
      );
      Alert.alert("Success", "Request approved successfully");
      resetAndClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      Alert.alert("Error", "Please provide a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint =
        selectedRequest.type === "RESCHEDULE"
          ? "reject-reschedule"
          : "reject-extension";
      await apiClient.post(
        `/api/audit-schedule/request/${selectedRequest.requestId}/${endpoint}`,
        { reason: rejectionReason },
        { userId: user?.id },
      );
      Alert.alert("Success", "Request rejected");
      resetAndClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject request");
    } finally {
      setSubmitting(false);
    }
  };

  const openAuditForum = () => {
    // 1. Find all Top Management and Audit Manager users from the fetched list
    const topManagers = allUsersList.filter((u: any) =>
      u.role?.toUpperCase().includes("TOP_MANAGEMENT"),
    );
    const auditManagers = allUsersList.filter((u: any) =>
      u.role?.toUpperCase().includes("AUDIT_MANAGER"),
    );

    // 2. Build a unique list of member emails
    const memberEmails: string[] = [];

    topManagers.forEach((tm: any) => {
      if (tm.email && !memberEmails.includes(tm.email)) {
        memberEmails.push(tm.email);
      }
    });

    auditManagers.forEach((am: any) => {
      if (am.email && !memberEmails.includes(am.email)) {
        memberEmails.push(am.email);
      }
    });

    // Ensure current user is included just in case their role is named differently
    if (user?.email && !memberEmails.includes(user.email)) {
      memberEmails.push(user.email);
    }

    // 3. Set the forum data
    setSelectedAuditForForum({
      id: "general-forum", // ✅ Keep this static so messages persist
      auditNumber: "GENERAL",
      auditType: "General Audit Discussion",
      department: "All Departments",
      auditorId: user?.id || null,
      auditorName: user?.name || "Unknown User",
      auditeeId: null,
      auditeeName: "N/A",
      hodEmail: null,
      hodName: "N/A",
      memberEmails: memberEmails, // ✅ Now correctly includes Top Management & Audit Managers
    });
    setShowForumModal(true);
  };

  const getWorkflowSteps = () => {
    const isForm3Approved = form3Status.status === "APPROVED";
    const isForm4Approved = form4Status.status === "APPROVED";
    const isForm5Approved = hasApprovedForm5;
    return [
      {
        id: 1,
        title: "Annual Audit Plan",
        desc: "Form 3 - Define yearly audit elements",
        icon: FileText,
        status:
          form3Status.status === "APPROVED"
            ? "approved"
            : form3Status.status === "PENDING_APPROVAL"
              ? "pending"
              : "ready",
        isLocked: false,
        action: () => setActiveSection("form3"),
      },
      {
        id: 2,
        title: "Department Audit Plan",
        desc: "Form 4 - Assign audits to departments",
        icon: Layers,
        status: isForm3Approved
          ? form4Status.status === "APPROVED"
            ? "approved"
            : form4Status.status === "PENDING_APPROVAL"
              ? "pending"
              : "ready"
          : "locked",
        isLocked: !isForm3Approved,
        action: () => setActiveSection("form4"),
      },
      {
        id: 3,
        title: "Schedule Dashboard",
        desc: "Form 5 - Month-wise audit schedule",
        icon: Grid,
        status: isForm4Approved
          ? isForm5Approved
            ? "approved"
            : "ready"
          : "locked",
        isLocked: !isForm4Approved,
        action: () => setActiveSection("form5"),
      },
      {
        id: 4,
        title: "Schedule Calendar",
        desc: "Daily schedules with time slots",
        icon: Calendar,
        status: isForm5Approved ? "ready" : "locked",
        isLocked: !isForm5Approved,
        action: () => {
          setActiveSection("week-selection");
          setShowWeekSelection(true);
        },
      },
    ];
  };

  const monthlyTrendData = useMemo(() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthCounts = new Array(12).fill(0);
    schedules.forEach((s: any) => {
      const dateStr = s.auditDate || s.scheduledDate;
      if (dateStr) {
        const date = new Date(dateStr);
        if (date.getFullYear() === selectedYear) monthCounts[date.getMonth()]++;
      }
    });
    return monthNames.map((name, idx) => ({
      label: name,
      value: monthCounts[idx],
    }));
  }, [schedules, selectedYear]);

  const ncrDistributionData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    const groups = {
      Pending: 0,
      "In Progress": 0,
      "Approved / Closed": 0,
    };
    allNcrs.forEach((ncr: any) => {
      const status = (ncr.status || "").toUpperCase();
      if (
        status === "CLOSED" ||
        status === "APPROVED" ||
        status === "NCR2_COMPLETED"
      ) {
        groups["Approved / Closed"]++;
      } else if (status.includes("IN_PROGRESS")) {
        groups["In Progress"]++;
      } else {
        groups["Pending"]++;
      }
    });
    return [
      { name: "Pending", value: groups["Pending"], color: COLORS.primary }, // Dark blue (#00529B)
      {
        name: "In Progress",
        value: groups["In Progress"],
        color: COLORS.secondary, // Medium blue (#3b82f6)
      },
      {
        name: "Approved / Closed",
        value: groups["Approved / Closed"],
        color: COLORS.light, // Light blue (#60a5fa)
      },
    ].filter((item) => item.value > 0);
  }, [allNcrs]);
  const ncrByDepartmentData = useMemo(() => {
    if (allNcrs.length === 0) return [];
    const deptCounts: Record<string, number> = {};
    allNcrs.forEach((ncr: any) => {
      const dept = ncr.department || "Unknown";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return Object.entries(deptCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allNcrs]);

  const recentActivities = useMemo(() => {
    const activities: ActivityItem[] = [];
    pendingRequests.slice(0, 3).forEach((req) => {
      activities.push({
        title: `${req.type === "RESCHEDULE" ? "Reschedule" : "Extension"} Request`,
        description: `${req.auditType} - ${req.department}`,
        time: new Date(req.requestedAt).toLocaleDateString(),
        icon: <MessageSquare size={16} />,
      });
    });
    if (stats.openNCRs > 0)
      activities.push({
        title: "Open NCRs",
        description: `${stats.openNCRs} reports require attention`,
        time: "Active",
        icon: <AlertCircle size={16} />,
      });
    return activities.slice(0, 5);
  }, [pendingRequests, stats]);

  // ============================================================================
  // RENDER CONTENT FUNCTION - SAME PATTERN AS LEAD AUDITOR
  // ============================================================================
  const renderContent = () => {
    const workflowSteps = getWorkflowSteps();
    const completedSteps = workflowSteps.filter(
      (s) => s.status === "approved",
    ).length;
    const progress = Math.round((completedSteps / workflowSteps.length) * 100);

    switch (activeSection) {
      case "dashboard":
        return (
          <View style={{ gap: 16 }}>
            {isDesktop ? (
              // Desktop: Normal Row Layout
              <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
                <KpiCard
                  title="Total Audits"
                  value={stats.totalAudits}
                  icon={<Calendar size={24} color={COLORS.primary} />}
                  isDesktop={isDesktop}
                />
                <KpiCard
                  title="Completed"
                  value={stats.completedAudits}
                  icon={<CheckCircle size={24} color={COLORS.success} />}
                  isDesktop={isDesktop}
                />
                <KpiCard
                  title="Open NCRs"
                  value={stats.openNCRs}
                  icon={<AlertCircle size={24} color={COLORS.danger} />}
                  isDesktop={isDesktop}
                />
                <KpiCard
                  title="Pending Requests"
                  value={stats.pendingRequests}
                  icon={<MessageSquare size={24} color={COLORS.warning} />}
                  isDesktop={isDesktop}
                />
              </View>
            ) : (
              // Mobile: Horizontal Scrollable Layout (Fixes vertical space issue)
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                <View style={{ width: 160, marginRight: 16 }}>
                  <KpiCard
                    title="Total Audits"
                    value={stats.totalAudits}
                    icon={<Calendar size={24} color={COLORS.primary} />}
                    isDesktop={isDesktop}
                  />
                </View>
                <View style={{ width: 160, marginRight: 16 }}>
                  <KpiCard
                    title="Completed"
                    value={stats.completedAudits}
                    icon={<CheckCircle size={24} color={COLORS.success} />}
                    isDesktop={isDesktop}
                  />
                </View>
                <View style={{ width: 160, marginRight: 16 }}>
                  <KpiCard
                    title="Open NCRs"
                    value={stats.openNCRs}
                    icon={<AlertCircle size={24} color={COLORS.danger} />}
                    isDesktop={isDesktop}
                  />
                </View>
                <View style={{ width: 160, marginRight: 16 }}>
                  <KpiCard
                    title="Pending Requests"
                    value={stats.pendingRequests}
                    icon={<MessageSquare size={24} color={COLORS.warning} />}
                    isDesktop={isDesktop}
                  />
                </View>
              </ScrollView>
            )}

            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 16,
              }}
            >
              <CustomBarChart
                data={monthlyTrendData}
                title="Monthly Audit Trend"
                subtitle={`Audits scheduled in ${selectedYear}`}
                isDesktop={isDesktop}
              />
              <CustomPieChart
                data={ncrDistributionData}
                title="NCR Distribution"
                subtitle="Status breakdown"
                total={allNcrs.length}
                isDesktop={isDesktop}
              />
            </View>
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 16,
              }}
            >
              <DepartmentLineChart
                data={ncrByDepartmentData}
                isDesktop={isDesktop}
              />
              <ActivityFeed
                activities={recentActivities}
                isDesktop={isDesktop}
              />
            </View>
            <AnimatedGlassCard
              delay={100}
              style={[styles.workflowSection, isSmallMobile && { padding: 16 }]}
            >
              <View style={styles.workflowHeader}>
                <View>
                  <Text style={styles.workflowTitle}>Audit Workflow</Text>
                  <Text style={styles.workflowSubtitle}>
                    Follow the clockwise workflow to complete setup
                  </Text>
                </View>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {completedSteps}/{workflowSteps.length}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.workflowProgressTrack}>
                  <LinearGradient
                    colors={COLORS.accentGradient}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
                <Text style={styles.progressLabel}>{progress}% Complete</Text>
              </View>
              <View
                style={[
                  styles.workflowGrid,
                  isMobile && !isTablet && styles.workflowGridMobile,
                ]}
              >
                {workflowSteps.map((step) => {
                  const isLocked = step.isLocked;
                  const isApproved = step.status === "approved";
                  const isPending = step.status === "pending";
                  let statusColor = COLORS.gray[400];
                  let statusBg = COLORS.gray[100];
                  let statusLabel = "Not Started";
                  let StatusIcon = Clock;
                  if (isLocked) {
                    statusColor = COLORS.gray[400];
                    statusBg = COLORS.gray[100];
                    statusLabel = "Locked";
                    StatusIcon = Lock;
                  } else if (isApproved) {
                    statusColor = COLORS.success;
                    statusBg = COLORS.successLight;
                    statusLabel = "Approved";
                    StatusIcon = CheckCircle;
                  } else if (isPending) {
                    statusColor = COLORS.warning;
                    statusBg = COLORS.warningLight;
                    statusLabel = "Pending";
                    StatusIcon = Clock;
                  } else {
                    statusColor = COLORS.accent;
                    statusBg = "#DBEAFE";
                    statusLabel = "Ready";
                    StatusIcon = ArrowRightCircle;
                  }
                  const IconComponent = step.icon;
                  return (
                    <TouchableOpacity
                      key={step.id}
                      activeOpacity={0.7}
                      disabled={isLocked}
                      onPress={step.action}
                      style={[
                        styles.workflowCard,
                        isLocked && styles.workflowCardLocked,
                        isApproved && styles.workflowCardApproved,
                        {
                          width: isDesktop
                            ? "23.5%"
                            : isTablet
                              ? "48%"
                              : isSmallMobile
                                ? "100%"
                                : "48%",
                        },
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <View
                          style={[
                            styles.stepNumberBadge,
                            {
                              backgroundColor: isLocked
                                ? COLORS.gray[200]
                                : COLORS.accent,
                            },
                          ]}
                        >
                          <Text style={styles.stepNumberText}>{step.id}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusBg },
                          ]}
                        >
                          <StatusIcon size={12} color={statusColor} />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusColor },
                            ]}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.cardIconWrapper,
                          {
                            backgroundColor: isLocked
                              ? COLORS.gray[100]
                              : statusBg,
                          },
                        ]}
                      >
                        <IconComponent
                          size={20}
                          color={isLocked ? COLORS.gray[400] : statusColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.workflowCardTitle,
                          isLocked && { color: COLORS.gray[400] },
                        ]}
                        numberOfLines={1}
                      >
                        {step.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardDesc,
                          isLocked && { color: COLORS.gray[400] },
                        ]}
                        numberOfLines={2}
                      >
                        {step.desc}
                      </Text>
                      {!isLocked && (
                        <View style={styles.cardAction}>
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: statusColor },
                            ]}
                          >
                            {isApproved ? "View Details" : "Start Workflow"}
                          </Text>
                          <ChevronRight size={14} color={statusColor} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AnimatedGlassCard>
          </View>
        );

      case "schedules":
        return (
          <View style={{ gap: 16 }}>
            <AnimatedGlassCard
              delay={100}
              style={[styles.workflowSection, isSmallMobile && { padding: 16 }]}
            >
              <View style={styles.workflowHeader}>
                <View>
                  <Text style={styles.workflowTitle}>Audit Workflow</Text>
                  <Text style={styles.workflowSubtitle}>
                    Follow the clockwise workflow to complete setup
                  </Text>
                </View>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {completedSteps}/{workflowSteps.length}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.workflowProgressTrack}>
                  <LinearGradient
                    colors={COLORS.accentGradient}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
                <Text style={styles.progressLabel}>{progress}% Complete</Text>
              </View>
              <View
                style={[
                  styles.workflowGrid,
                  isMobile && !isTablet && styles.workflowGridMobile,
                ]}
              >
                {workflowSteps.map((step) => {
                  const isLocked = step.isLocked;
                  const isApproved = step.status === "approved";
                  const isPending = step.status === "pending";
                  let statusColor = COLORS.gray[400];
                  let statusBg = COLORS.gray[100];
                  let statusLabel = "Not Started";
                  let StatusIcon = Clock;
                  if (isLocked) {
                    statusColor = COLORS.gray[400];
                    statusBg = COLORS.gray[100];
                    statusLabel = "Locked";
                    StatusIcon = Lock;
                  } else if (isApproved) {
                    statusColor = COLORS.success;
                    statusBg = COLORS.successLight;
                    statusLabel = "Approved";
                    StatusIcon = CheckCircle;
                  } else if (isPending) {
                    statusColor = COLORS.warning;
                    statusBg = COLORS.warningLight;
                    statusLabel = "Pending";
                    StatusIcon = Clock;
                  } else {
                    statusColor = COLORS.accent;
                    statusBg = "#DBEAFE";
                    statusLabel = "Ready";
                    StatusIcon = ArrowRightCircle;
                  }
                  const IconComponent = step.icon;
                  return (
                    <TouchableOpacity
                      key={step.id}
                      activeOpacity={0.7}
                      disabled={isLocked}
                      onPress={step.action}
                      style={[
                        styles.workflowCard,
                        isLocked && styles.workflowCardLocked,
                        isApproved && styles.workflowCardApproved,
                        {
                          width: isDesktop
                            ? "23.5%"
                            : isTablet
                              ? "48%"
                              : isSmallMobile
                                ? "100%"
                                : "48%",
                        },
                      ]}
                    >
                      <View style={styles.cardTopRow}>
                        <View
                          style={[
                            styles.stepNumberBadge,
                            {
                              backgroundColor: isLocked
                                ? COLORS.gray[200]
                                : COLORS.accent,
                            },
                          ]}
                        >
                          <Text style={styles.stepNumberText}>{step.id}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusBg },
                          ]}
                        >
                          <StatusIcon size={12} color={statusColor} />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusColor },
                            ]}
                          >
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.cardIconWrapper,
                          {
                            backgroundColor: isLocked
                              ? COLORS.gray[100]
                              : statusBg,
                          },
                        ]}
                      >
                        <IconComponent
                          size={20}
                          color={isLocked ? COLORS.gray[400] : statusColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.workflowCardTitle,
                          isLocked && { color: COLORS.gray[400] },
                        ]}
                        numberOfLines={1}
                      >
                        {step.title}
                      </Text>
                      <Text
                        style={[
                          styles.cardDesc,
                          isLocked && { color: COLORS.gray[400] },
                        ]}
                        numberOfLines={2}
                      >
                        {step.desc}
                      </Text>
                      {!isLocked && (
                        <View style={styles.cardAction}>
                          <Text
                            style={[
                              styles.cardActionText,
                              { color: statusColor },
                            ]}
                          >
                            {isApproved ? "View Details" : "Start Workflow"}
                          </Text>
                          <ChevronRight size={14} color={statusColor} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AnimatedGlassCard>
          </View>
        );

      case "ncr":
        return (
          <AnimatedGlassCard style={styles.sectionCard}>
            <Text style={styles.cardTitle}>NCR Management</Text>
            <Text style={styles.cardSubtitle}>
              Manage Non-Conformance Reports and corrective actions
            </Text>
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <NcrCard
                title="CA Verification"
                description="Verify corrective actions"
                icon={<CheckCircle size={24} />}
                onPress={() => setActiveSection("ncr-pending")}
                badgeText={`${stats.pendingCaVerification} Pending`}
                isDesktop={isDesktop}
              />
              <NcrCard
                title="NCR Report"
                description="View all Non-Conformance Reports"
                icon={<AlertCircle size={24} />}
                onPress={() => setActiveSection("ncr-dashboard")}
                badgeText={`${stats.openNCRs} Open`}
                isDesktop={isDesktop}
              />
              <NcrCard
                title="NC Summary"
                description="All NCRs at a glance"
                icon={<BarChart2 size={24} />}
                onPress={() => setActiveSection("form9")}
                badgeText={`${allNcrs.length} Total`}
                isDesktop={isDesktop}
              />
            </View>
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 16,
                marginTop: 16,
              }}
            >
              <CustomPieChart
                data={ncrDistributionData}
                title="NCR Status Distribution"
                subtitle="Real-time status breakdown"
                total={allNcrs.length}
                isDesktop={isDesktop}
              />
              <DepartmentLineChart
                data={ncrByDepartmentData}
                isDesktop={isDesktop}
              />
            </View>
          </AnimatedGlassCard>
        );

      case "requests":
        return (
          <AnimatedGlassCard style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Pending Auditor Requests</Text>
            <Text style={styles.cardSubtitle}>
              Review and manage all reschedule and extension requests
            </Text>
            {pendingRequests.length > 0 ? (
              <View style={{ gap: 12 }}>
                {pendingRequests.map((req: any, idx: number) => (
                  <RequestCard
                    key={idx}
                    request={req}
                    onView={handleViewRequest}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MessageSquare size={40} color={COLORS.lighter} />
                <Text style={styles.emptyTitle}>No pending requests</Text>
                <Text style={styles.emptySubtitle}>
                  All auditor requests have been processed
                </Text>
              </View>
            )}
          </AnimatedGlassCard>
        );

      default:
        return (
          <View style={styles.defaultContainer}>
            <Text style={styles.defaultText}>
              Select a section from the navigation
            </Text>
          </View>
        );
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // ============================================================================
  // FULL-PAGE VIEWS SWITCH (Handled before main render)
  // ============================================================================
  switch (activeSection) {
    case "form3":
      return (
        <Form3View
          year={selectedYear}
          onBack={() => setActiveSection("schedules")}
        />
      );
    case "form4":
      return (
        <Form4View
          year={selectedYear}
          onBack={() => setActiveSection("schedules")}
        />
      );
    case "form5":
      return (
        <Form5Dashboard
          year={selectedYear}
          onBack={() => setActiveSection("schedules")}
          onMonthSelect={(month) => {
            setSelectedForm5Month(month);
            setActiveSection("form5-view");
          }}
        />
      );
    case "form5-view":
      return selectedForm5Month ? (
        <Form5View
          preselectedYear={selectedYear}
          preselectedMonth={selectedForm5Month}
          onBack={() => setActiveSection("form5")}
        />
      ) : (
        <Form5Dashboard
          year={selectedYear}
          onBack={() => setActiveSection("schedules")}
          onMonthSelect={(month) => {
            setSelectedForm5Month(month);
            setActiveSection("form5-view");
          }}
        />
      );
    case "week-selection":
      return (
        <WeekSelectionView
          year={selectedYear}
          onBack={() => setActiveSection("schedules")}
          onWeekSelect={(weekData) => {
            setForm5DetailedParams({
              year: selectedYear,
              month: weekData.month,
              startDate: weekData.startDate,
              endDate: weekData.endDate,
            });
            setActiveSection("form5-detailed");
          }}
        />
      );
    case "form5-detailed":
      return (
        <Form5DetailedView
          year={form5DetailedParams.year || selectedYear}
          month={form5DetailedParams.month || ""}
          startDate={form5DetailedParams.startDate}
          endDate={form5DetailedParams.endDate}
          onBack={() => setActiveSection("week-selection")}
        />
      );
    case "ncr-pending":
      return <NCRPendingDashboard onBack={() => setActiveSection("ncr")} />;
    case "ncr-dashboard":
      return (
        <NCRDashboard
          onBack={() => setActiveSection("ncr")}
          onViewNcr={(id: string) => setActiveNcrViewId(id)}
        />
      );
    case "form9":
      return <Form9View onBack={() => setActiveSection("ncr")} />;
    default:
      break;
  }

  // ============================================================================
  // NCR DETAIL VIEW (Handled before main render)
  // ============================================================================
  if (activeNcrViewId) {
    return (
      // ✅ USE YOUR MANAGER HERE
      <NCRViewManager
        initialId={activeNcrViewId}
        initialType="form7"
        onClose={() => {
          setActiveNcrViewId(null);
          fetchAllData();
        }}
      />
    );
  }

  // ============================================================================
  // MAIN RENDER - Uses renderContent() like Lead Auditor
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8FAFC", "#EFF6FF", "#F8FAFC"]}
        style={styles.background}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* HEADER - Only show on main tab views */}
          {["dashboard", "schedules", "ncr", "requests"].includes(
            activeSection,
          ) && (
            <AnimatedGlassCard
              style={[
                styles.header,
                isSmallMobile && styles.headerSmall,
                isCompactHeader && styles.headerCompact,
              ]}
            >
              <View
                style={[
                  styles.headerInner,
                  isCompactHeader && styles.headerInnerCompact,
                ]}
              >
                {/* =========================================================
          LEFT SIDE - GREETING
      ========================================================= */}
                <View
                  style={[
                    styles.headerGreetingSection,
                    isCompactHeader && styles.headerGreetingSectionCompact,
                  ]}
                >
                  <View style={styles.greetingRow}>
                    <Text
                      style={[
                        styles.greetingText,
                        isSmallMobile && styles.greetingTextSmall,
                        isCompactHeader && styles.greetingTextCompact,
                      ]}
                    >
                      {greeting},
                    </Text>

                    <Text
                      style={[
                        styles.greetingName,
                        isSmallMobile && styles.greetingNameSmall,
                        isCompactHeader && styles.greetingNameCompact,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayName}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.subGreetingText,
                      isSmallMobile && styles.subGreetingTextSmall,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {fullDisplayName}
                  </Text>
                </View>

                {/* =========================================================
          RIGHT SIDE - YEAR + FORUM
      ========================================================= */}
                <View
                  style={[
                    styles.headerActions,
                    isCompactHeader && styles.headerActionsCompact,
                    isVerySmall && styles.headerActionsVerySmall,
                  ]}
                >
                  {/* YEAR FILTER */}
                  <View
                    style={[
                      styles.yearFilterWrapper,
                      isVerySmall && styles.yearFilterWrapperSmall,
                    ]}
                  >
                    <YearFilter
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                      availableYears={availableYears}
                    />
                  </View>

                  {/* FORUM BUTTON */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.forumBtn,
                      isVerySmall && styles.forumBtnSmall,
                      isCompactHeader && styles.forumBtnCompact,
                    ]}
                    onPress={openAuditForum}
                  >
                    <MessageSquare
                      size={isVerySmall ? 15 : 17}
                      color={COLORS.white}
                    />

                    <Text
                      style={[
                        styles.forumBtnText,
                        isVerySmall && styles.forumBtnTextSmall,
                      ]}
                    >
                      Forum
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedGlassCard>
          )}

          {/* MAIN CONTENT - Using renderContent function like Lead Auditor */}
          {renderContent()}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Modals remain exactly the same as before */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContentV2, { width: isDesktop ? 600 : "95%" }]}
          >
            <View style={styles.modalHeaderV2}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Calendar size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitleV2}>Reschedule Request</Text>
                  <Text style={styles.modalSubtitle}>
                    Review request details and take action
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                style={styles.closeBtnV2}
              >
                <X size={20} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBodyV2}
              showsVerticalScrollIndicator={false}
            >
              {selectedRequest && (
                <View style={{ gap: 20 }}>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Audit Type</Text>
                      <Text style={styles.infoGridValue}>
                        {selectedRequest.auditType}
                      </Text>
                    </View>
                    <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Department</Text>
                      <Text style={styles.infoGridValue}>
                        {selectedRequest.department}
                      </Text>
                    </View>
                    <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Current Auditor</Text>
                      <Text style={styles.infoGridValue}>
                        {selectedRequest.auditorName}
                      </Text>
                    </View>
                    <View style={styles.infoGridItem}>
                      <Text style={styles.infoGridLabel}>Auditee</Text>
                      <Text style={styles.infoGridValue}>
                        {selectedRequest.auditeeName}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon}>
                        <Calendar size={16} color={COLORS.primary} />
                      </View>
                      <Text style={styles.sectionTitle}>Requested Changes</Text>
                    </View>
                    <View style={styles.changesGrid}>
                      <View style={styles.changeColumn}>
                        <Text style={styles.changeLabel}>Current Schedule</Text>
                        <Text style={styles.changeValue}>
                          {selectedRequest.currentDate} •{" "}
                          {selectedRequest.currentStartTime}
                        </Text>
                      </View>
                      <View style={styles.changeColumn}>
                        <Text
                          style={[
                            styles.changeLabel,
                            { color: COLORS.primary },
                          ]}
                        >
                          Requested
                        </Text>
                        <Text
                          style={[
                            styles.changeValue,
                            { color: COLORS.primary },
                          ]}
                        >
                          {selectedRequest.requestedNewDate} •{" "}
                          {selectedRequest.requestedNewTime ||
                            selectedRequest.currentStartTime}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIcon}>
                        <MessageSquare size={16} color={COLORS.primary} />
                      </View>
                      <Text style={styles.sectionTitle}>
                        Reason for Request
                      </Text>
                    </View>
                    <Text style={styles.reasonText}>
                      {selectedRequest.reason || "No reason provided"}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowRequestModal(false)}
                style={[styles.footerBtn, styles.footerBtnCancel]}
              >
                <Text style={styles.footerBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowRequestModal(false);
                  setShowRejectModal(true);
                }}
                style={[styles.footerBtn, styles.footerBtnReject]}
              >
                <X size={16} color={COLORS.white} />
                <Text style={styles.footerBtnTextWhite}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowRequestModal(false);
                  setShowApproveModal(true);
                }}
                style={[styles.footerBtn, styles.footerBtnApprove]}
              >
                <Check size={16} color={COLORS.white} />
                <Text style={styles.footerBtnTextWhite}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={resetAndClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContentV2, { width: isDesktop ? 600 : "95%" }]}
          >
            <View style={styles.modalHeaderV2}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Check size={24} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitleV2}>
                    Approve{" "}
                    {selectedRequest?.type === "RESCHEDULE"
                      ? "Reschedule"
                      : "Extension"}{" "}
                    Request
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Review and confirm the approval details
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={resetAndClose}
                style={styles.closeBtnV2}
              >
                <X size={20} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyV2}
              showsVerticalScrollIndicator={false}
            >
              {selectedRequest && (
                <View style={{ gap: 16 }}>
                  {/* Audit Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionLabel}>Audit</Text>
                    <Text style={styles.infoSectionValue}>
                      {selectedRequest.auditType} - {selectedRequest.department}
                    </Text>
                  </View>

                  {/* Current Auditor */}
                  <View
                    style={[styles.infoSection, { backgroundColor: COLORS.bg }]}
                  >
                    <View style={styles.infoSectionLabelRow}>
                      <UserCheck size={14} color={COLORS.primary} />
                      <Text
                        style={[styles.infoSectionLabel, { marginBottom: 0 }]}
                      >
                        Current Auditor
                      </Text>
                    </View>
                    <Text style={styles.infoSectionValue}>
                      {selectedRequest.auditorName}
                    </Text>
                  </View>

                  {/* Team Info */}
                  {!loadingTeamMembers &&
                    departmentTeamMembers.leadAuditorName && (
                      <View
                        style={[
                          styles.infoSection,
                          { backgroundColor: COLORS.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.infoSectionLabel,
                            { color: COLORS.dark },
                          ]}
                        >
                          Assigned Audit Team for {selectedRequest.department}:
                        </Text>
                        <Text
                          style={[
                            styles.infoSectionValue,
                            {
                              fontSize: 12,
                              color: COLORS.primary,
                              marginTop: 4,
                            },
                          ]}
                        >
                          ⭐ Lead: {departmentTeamMembers.leadAuditorName}
                        </Text>
                        {departmentTeamMembers.teamAuditorNames?.length > 0 && (
                          <Text
                            style={[
                              styles.infoSectionValue,
                              {
                                fontSize: 12,
                                color: COLORS.primary,
                                marginTop: 2,
                              },
                            ]}
                          >
                            👥 Team:{" "}
                            {departmentTeamMembers.teamAuditorNames.join(", ")}
                          </Text>
                        )}
                      </View>
                    )}

                  {/* Reassign Checkbox */}
                  <View style={styles.checkboxRowV2}>
                    <TouchableOpacity
                      style={[
                        styles.checkboxV2,
                        showReassignOptions && styles.checkboxV2Active,
                      ]}
                      onPress={() => {
                        setShowReassignOptions(!showReassignOptions);
                        if (showReassignOptions)
                          setSelectedReassignAuditorId("");
                      }}
                    >
                      {showReassignOptions && (
                        <Check size={14} color={COLORS.white} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.checkboxContent}>
                      <Text style={styles.checkboxTextV2}>
                        🔄 Reassign to different auditor
                      </Text>
                      <Text style={styles.checkboxSubtext}>
                        Replace the current auditor with a new one
                      </Text>
                    </View>
                  </View>

                  {showReassignOptions && (
                    <View style={styles.reassignSection}>
                      <Text style={styles.reassignLabel}>
                        Select Primary Auditor *
                      </Text>

                      {loadingTeamMembers ? (
                        <Text
                          style={{
                            color: COLORS.textSub,
                            textAlign: "center",
                            padding: 8,
                          }}
                        >
                          Loading auditors...
                        </Text>
                      ) : (
                        <View
                          style={{
                            backgroundColor: "#F8FAFC",
                            borderWidth: 1,
                            borderColor: "#E2E8F0",
                            borderRadius: 12,
                            overflow: "hidden",
                          }}
                        >
                          <Picker
                            selectedValue={selectedReassignAuditorId}
                            onValueChange={(itemValue: string) => {
                              setSelectedReassignAuditorId(itemValue);
                              checkConflictsForAuditor(itemValue, true);
                            }}
                            style={APPROVAL_PICKER_STYLE}
                          >
                            <Picker.Item label="Select Auditor" value="" />
                            {approvalAuditors
                              .filter((a) => {
                                // 1. Filter by assigned team (Fallback to all if teamAuditorIds is empty)
                                if (
                                  approvalTeamInfo.teamAuditorIds.length > 0 &&
                                  !approvalTeamInfo.teamAuditorIds.includes(
                                    Number(a.id),
                                  )
                                ) {
                                  return false;
                                }
                                // 2. Hide the current auditor from the reassign list
                                const isCurrent =
                                  String(a.id) ===
                                    String(selectedRequest?.auditorId) ||
                                  `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                    selectedRequest?.auditorName?.toLowerCase();
                                return !isCurrent;
                              })
                              .map((auditor) => (
                                <Picker.Item
                                  key={auditor.id}
                                  label={`${auditor.firstName} ${auditor.lastName}`}
                                  value={auditor.id.toString()}
                                />
                              ))}
                          </Picker>
                        </View>
                      )}

                      {/* Keep your existing checkingAvailability and conflictWarning UI here */}
                      {checkingAvailability && (
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontSize: 12,
                            marginTop: 8,
                          }}
                        >
                          Checking auditor availability...
                        </Text>
                      )}
                      {conflictWarning &&
                        conflictWarning.type === "reassign" && (
                          <View style={styles.warningBoxV2}>
                            <Text style={styles.warningTextV2}>
                              ⚠️ Time Conflict Detected!
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#B91C1C",
                                marginTop: 4,
                              }}
                            >
                              Auditor {conflictWarning.auditorName} is already
                              scheduled at this time.
                            </Text>
                          </View>
                        )}
                    </View>
                  )}
                  {/* Add Co-auditor Checkbox */}
                  <View style={styles.checkboxRowV2}>
                    <TouchableOpacity
                      style={[
                        styles.checkboxV2,
                        showAddAnotherAuditor && styles.checkboxV2Active,
                      ]}
                      onPress={() => {
                        setShowAddAnotherAuditor(!showAddAnotherAuditor);
                        if (showAddAnotherAuditor) setAdditionalAuditorIds([]);
                      }}
                    >
                      {showAddAnotherAuditor && (
                        <Check size={14} color={COLORS.white} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.checkboxContent}>
                      <Text style={styles.checkboxTextV2}>
                        ➕ Add another auditor (Co-auditor)
                      </Text>
                      <Text style={styles.checkboxSubtext}>
                        Add additional auditor without removing the primary one
                      </Text>
                    </View>
                  </View>
                  {showAddAnotherAuditor && (
                    <View style={styles.coAuditorSection}>
                      <Text style={styles.reassignLabel}>
                        Select Additional Auditor(s)
                      </Text>

                      {loadingTeamMembers ? (
                        <Text
                          style={{
                            color: COLORS.textSub,
                            textAlign: "center",
                            padding: 8,
                          }}
                        >
                          Loading auditors...
                        </Text>
                      ) : (
                        <ScrollView
                          style={{ maxHeight: 150 }}
                          showsVerticalScrollIndicator
                        >
                          {approvalAuditors
                            .filter((a) => {
                              // 1. Filter by assigned team
                              if (
                                approvalTeamInfo.teamAuditorIds.length > 0 &&
                                !approvalTeamInfo.teamAuditorIds.includes(
                                  Number(a.id),
                                )
                              )
                                return false;

                              // 2. Hide current auditor
                              const isCurrent =
                                String(a.id) ===
                                  String(selectedRequest?.auditorId) ||
                                `${a.firstName} ${a.lastName}`.toLowerCase() ===
                                  selectedRequest?.auditorName?.toLowerCase();
                              if (isCurrent) return false;

                              // 3. Hide newly selected primary auditor (if reassign is active)
                              if (
                                showReassignOptions &&
                                selectedReassignAuditorId &&
                                String(a.id) ===
                                  String(selectedReassignAuditorId)
                              )
                                return false;

                              // 4. Hide already selected co-auditors
                              if (additionalAuditorIds.includes(String(a.id)))
                                return false;

                              return true;
                            })
                            .map((auditor) => (
                              <TouchableOpacity
                                key={auditor.id}
                                style={styles.auditorOption}
                                onPress={() => {
                                  if (
                                    !additionalAuditorIds.includes(
                                      String(auditor.id),
                                    )
                                  ) {
                                    setAdditionalAuditorIds([
                                      ...additionalAuditorIds,
                                      String(auditor.id),
                                    ]);
                                    checkConflictsForAuditor(auditor.id, false);
                                  }
                                }}
                              >
                                <Text style={styles.auditorOptionText}>
                                  ✅ {auditor.firstName} {auditor.lastName}
                                </Text>
                                <Check size={16} color={COLORS.lighter} />
                              </TouchableOpacity>
                            ))}
                        </ScrollView>
                      )}

                      {/* Keep checkingAvailability and conflictWarning UI exactly as is */}
                      {checkingAvailability && (
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontSize: 12,
                            marginTop: 8,
                          }}
                        >
                          Checking auditor availability...
                        </Text>
                      )}
                      {conflictWarning &&
                        conflictWarning.type === "coauditor" && (
                          <View
                            style={[
                              styles.warningBoxV2,
                              {
                                backgroundColor: COLORS.bg,
                                borderColor: COLORS.lighter,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.warningTextV2,
                                { color: COLORS.dark },
                              ]}
                            >
                              ⚠️ Potential Time Conflict!
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: COLORS.dark,
                                marginTop: 4,
                              }}
                            >
                              Auditor {conflictWarning.auditorName} is already
                              scheduled.
                            </Text>
                          </View>
                        )}

                      {/* SELECTED TAGS */}
                      {additionalAuditorIds.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.reassignLabel}>
                            Selected Co-auditors:
                          </Text>
                          <View style={styles.selectedAuditors}>
                            {additionalAuditorIds.map((id) => {
                              const auditor = approvalAuditors.find(
                                (a) => String(a.id) === id,
                              );
                              return auditor ? (
                                <View
                                  key={id}
                                  style={styles.selectedAuditorTag}
                                >
                                  <Text style={styles.selectedAuditorTagText}>
                                    {auditor.firstName} {auditor.lastName}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() =>
                                      setAdditionalAuditorIds(
                                        additionalAuditorIds.filter(
                                          (aid) => aid !== id,
                                        ),
                                      )
                                    }
                                  >
                                    <X size={14} color={COLORS.danger} />
                                  </TouchableOpacity>
                                </View>
                              ) : null;
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Requested Changes */}
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Requested Changes</Text>
                    {selectedRequest.type === "RESCHEDULE" ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.changeText}>
                          New Date:{" "}
                          <Text style={{ fontWeight: "bold" }}>
                            {selectedRequest.requestedNewDate}
                          </Text>
                        </Text>
                        <Text style={styles.changeText}>
                          New Time: {selectedRequest.requestedNewStartTime} -{" "}
                          {selectedRequest.requestedNewEndTime}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.changeText, { marginTop: 8 }]}>
                        New End Date:{" "}
                        <Text style={{ fontWeight: "bold" }}>
                          {selectedRequest.requestedNewToDate}
                        </Text>
                      </Text>
                    )}
                  </View>

                  {/* Comments */}
                  <View>
                    <Text style={styles.commentsLabel}>
                      Comments (Optional)
                    </Text>
                    <TextInput
                      style={styles.commentsInput}
                      placeholder="Add any comments about this approval..."
                      value={approvalComment}
                      onChangeText={setApprovalComment}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* Approval Summary */}
                  {(showReassignOptions || showAddAnotherAuditor) && (
                    <View
                      style={[
                        styles.infoSection,
                        { backgroundColor: "#F8FAFC" },
                      ]}
                    >
                      <Text style={styles.sectionTitleSmall}>
                        Approval Summary:
                      </Text>
                      <View style={{ gap: 4, marginTop: 8 }}>
                        {showReassignOptions && selectedReassignAuditorId && (
                          <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                            • Current auditor ({selectedRequest.auditorName})
                            will be{" "}
                            <Text
                              style={{
                                color: COLORS.primary,
                                fontWeight: "bold",
                              }}
                            >
                              REPLACED
                            </Text>
                          </Text>
                        )}
                        {!showReassignOptions && showAddAnotherAuditor && (
                          <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                            • Current auditor ({selectedRequest.auditorName})
                            will be{" "}
                            <Text
                              style={{
                                color: COLORS.secondary,
                                fontWeight: "bold",
                              }}
                            >
                              KEPT
                            </Text>{" "}
                            as primary auditor
                          </Text>
                        )}
                        {additionalAuditorIds.length > 0 && (
                          <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                            • {additionalAuditorIds.length} co-auditor(s) will
                            be{" "}
                            <Text
                              style={{
                                color: COLORS.secondary,
                                fontWeight: "bold",
                              }}
                            >
                              ADDED
                            </Text>
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={resetAndClose}
                style={[styles.footerBtn, styles.footerBtnCancel]}
              >
                <Text style={styles.footerBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApprove}
                disabled={
                  submitting ||
                  (showReassignOptions && !selectedReassignAuditorId) ||
                  (showReassignOptions && conflictWarning?.type === "reassign")
                }
                style={[
                  styles.footerBtn,
                  styles.footerBtnApprove,
                  (submitting ||
                    (showReassignOptions && !selectedReassignAuditorId) ||
                    (showReassignOptions &&
                      conflictWarning?.type === "reassign")) &&
                    styles.footerBtnDisabled,
                ]}
              >
                {submitting ? (
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: COLORS.white,
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <Check size={16} color={COLORS.white} />
                )}
                <Text style={styles.footerBtnTextWhite}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={resetAndClose}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContentV2, { width: isDesktop ? 500 : "90%" }]}
          >
            <View style={styles.modalHeaderV2}>
              <View style={styles.headerLeft}>
                <View
                  style={[styles.headerIcon, { backgroundColor: "#FEE2E2" }]}
                >
                  <X size={24} color={COLORS.danger} />
                </View>
                <View>
                  <Text style={styles.modalTitleV2}>
                    Reject{" "}
                    {selectedRequest?.type === "RESCHEDULE"
                      ? "Reschedule"
                      : "Extension"}{" "}
                    Request
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Please provide a reason for rejection
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={resetAndClose}
                style={styles.closeBtnV2}
              >
                <X size={20} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBodyV2}>
              <TextInput
                style={[styles.commentsInput, { minHeight: 100 }]}
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                autoFocus
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={resetAndClose}
                style={[styles.footerBtn, styles.footerBtnCancel]}
              >
                <Text style={styles.footerBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                style={[
                  styles.footerBtn,
                  styles.footerBtnReject,
                  (submitting || !rejectionReason.trim()) &&
                    styles.footerBtnDisabled,
                ]}
              >
                {submitting ? (
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: COLORS.white,
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <X size={16} color={COLORS.white} />
                )}
                <Text style={styles.footerBtnTextWhite}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {showForumModal && selectedAuditForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedAuditForForum.id}
          auditNumber={selectedAuditForForum.auditNumber}
          auditTitle={selectedAuditForForum.auditType}
          auditStatus="IN_PROGRESS"
          auditType={selectedAuditForForum.auditType}
          department={selectedAuditForForum.department}
          auditorId={selectedAuditForForum.auditorId}
          auditorName={selectedAuditForForum.auditorName}
          auditeeId={selectedAuditForForum.auditeeId}
          auditeeName={selectedAuditForForum.auditeeName}
          hodEmail={selectedAuditForForum.hodEmail}
          hodName={selectedAuditForForum.hodName}
          memberEmails={selectedAuditForForum.memberEmails || []}
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedAuditForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // ... (keep all existing styles from your original code)

  // ✅ NEW: Universal inner padding for all chart cards
  chartInnerPadding: {
    padding: 20, // ✅ This is the key fix - adds breathing room inside every card
  },

  // ✅ UPDATED: Better chart header spacing
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24, // ✅ Increased from 20
    gap: 12,
  },

  // ✅ UPDATED: Better pie chart container spacing
  pieChartContainer: {
    alignItems: "center",
    paddingVertical: 12, // ✅ Added vertical padding
  },

  // ✅ UPDATED: Better donut wrapper spacing
  donutWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24, // ✅ Increased from 16
  },

  // ✅ UPDATED: Better legend spacing
  legendContainer: {
    width: "100%",
    gap: 12,
    marginTop: 8, // ✅ Added top margin
  },

  // ✅ UPDATED: Better bar chart spacing
  // ✅ Ensure bar columns can show tooltips without clipping
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 180,
    gap: 4,
    paddingTop: 8,
    paddingHorizontal: 4,
    overflow: "visible", // Critical for tooltips
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    minWidth: 0,
  },
  // ✅ Add hover background to legend items
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  // ✅ UPDATED: Better mobile bar column spacing
  mobileBarColumn: {
    width: 65, // ✅ Increased from 60
    alignItems: "center",
    justifyContent: "flex-end",
    height: 180,
    marginRight: 16, // ✅ Increased from 12
  },

  // ✅ UPDATED: Better activity feed item spacing
  feedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12, // ✅ Added vertical padding
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  // ✅ UPDATED: Better feed header spacing
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20, // ✅ Increased from 16
  },

  // ✅ UPDATED: Better department header spacing
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8, // ✅ Increased from 6
  },

  // ✅ UPDATED: Better progress track spacing
  progressTrack: {
    height: 10, // ✅ Increased from 8
    backgroundColor: "#F1F5F9",
    borderRadius: 5,
    overflow: "hidden",
  },

  // ✅ UPDATED: Better empty chart spacing
  emptyChart: {
    height: 200, // ✅ Increased from 180
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 8, // ✅ Added vertical margin
  },

  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotal: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  donutLabel: {
    fontSize: 11,
    color: COLORS.textSub,
    marginTop: 2,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendText: {
    fontSize: 13,
    color: COLORS.textMain,
    flex: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 8,
  },

  container: { flex: 1, backgroundColor: "#F8FAFC" },
  background: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 16, paddingBottom: 20 },
  contentDesktop: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    borderTopColor: COLORS.accent,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.gray[500],
    fontWeight: "500",
  },

  // Add these new styles to your StyleSheet

  summaryStatCard: {
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  summaryStatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  summaryStatTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  summaryStatSubtitle: {
    fontSize: 11,
    color: COLORS.textSub,
  },

  chartTotalBadge: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  chartTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
  chartTotalLabel: {
    fontSize: 10,
    color: COLORS.textSub,
    fontWeight: "500",
  },
  barWrapper: {
    width: "80%", // Full width of column
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 4, // Slightly smaller radius
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  barValue: {
    fontSize: 10, // Smaller font
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  barFill: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barLabel: {
    fontSize: 9, // Smaller font for mobile
    color: COLORS.textSub,
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },

  segmentedBar: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#F1F5F9", // Subtle background for empty space
  },
  donutChart: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 20,
    borderColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },

  legendGrid: {
    width: "100%",
    gap: 12,
  },
  legendItemModern: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },

  glassCard: {
    backgroundColor: COLORS.glass.light,
    borderRadius: 12, // ✅ Reduced from 20 for professional MNC look
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, // ✅ Subtler, more professional shadow
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textMain,
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: "500",
    marginBottom: 5,
  },

  emptyText: { color: COLORS.textSub, fontSize: 13, fontWeight: "500" },

  barTrack: {
    width: "60%",
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 6, // ✅ Reduced from 8
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  stackedBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#F1F5F9",
  },

  legendHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 4,
  },
  legendTotal: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primary,
  },
  legendTotalLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: "500",
  },

  deptName: {
    fontSize: 12,
    color: COLORS.textMain,
    fontWeight: "600",
  },
  deptCount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  // Also update these for consistency:
  kpiCard: { padding: 16, marginBottom: 0 },
  kpiIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10, // Reduced from 12
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  workflowCard: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12, // Reduced from 16
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  header: { padding: 20, marginBottom: 20 },
  headerSmall: { padding: 16, marginBottom: 16 },

  headerCompact: {
    padding: 18,
  },

  headerInner: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },

  headerInnerCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
    gap: 14,
  },

  headerGreetingSection: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  headerGreetingSectionCompact: {
    width: "100%",
    flex: 0,
  },

  greetingRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    minWidth: 0,
  },

  greetingText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: -0.5,
    flexShrink: 0,
  },

  greetingName: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: -0.5,
    marginLeft: 6,
  },

  greetingTextCompact: {
    fontSize: 20,
    lineHeight: 26,
  },

  greetingNameCompact: {
    fontSize: 20,
    lineHeight: 26,
  },

  greetingTextSmall: {
    fontSize: 17,
    lineHeight: 22,
  },
  greetingNameSmall: {
    fontSize: 17,
    lineHeight: 22,
    marginLeft: 4,
  },

  subGreetingText: { fontSize: 14, color: COLORS.gray[500], marginTop: 4 },

  subGreetingTextSmall: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexShrink: 0,
  },

  headerActionsCompact: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
  },

  headerActionsVerySmall: {
    gap: 30,
  },

  yearFilterWrapper: {
    minWidth: 100, // Reduced from 120
    maxWidth: 160, // Reduced from 180
    flexShrink: 0,
  },

  yearFilterWrapperSmall: {
    flex: 0, // Changed from flex: 1
    minWidth: 80, // Added specific minWidth
    maxWidth: 160, // Added maxWidth constraint
  },

  // Also update for very small screens
  yearFilterWrapperVerySmall: {
    minWidth: 70,
    maxWidth: 100,
    flexShrink: 0,
  },

  forumBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexShrink: 0,
  },

  forumBtnCompact: {
    minWidth: 100,
  },

  forumBtnSmall: {
    minHeight: 40,
    minWidth: 84,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },

  forumBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  forumBtnTextSmall: {
    fontSize: 12,
  },

  kpiValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 12,
    color: COLORS.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  feedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  feedItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  feedItemContent: { flex: 1 },
  feedItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  feedItemDesc: { fontSize: 12, color: COLORS.textSub },
  feedItemTime: { fontSize: 12, color: COLORS.textSub },
  workflowSection: { padding: 24, marginBottom: 20 },
  workflowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  workflowTitle: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  workflowSubtitle: { fontSize: 13, color: COLORS.gray[500], marginTop: 4 },
  progressBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  progressBadgeText: { fontSize: 13, fontWeight: "700", color: COLORS.accent },
  progressBarContainer: { marginBottom: 24 },
  workflowProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gray[100],
    overflow: "hidden",
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 8,
    fontWeight: "600",
  },
  workflowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  workflowGridMobile: { gap: 12 },

  workflowCardLocked: { opacity: 0.6, backgroundColor: COLORS.gray[100] },
  workflowCardApproved: {
    borderColor: COLORS.successLight,
    backgroundColor: "#F0FDF4",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: { fontSize: 12, fontWeight: "700", color: COLORS.white },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  workflowCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.gray[500],
    lineHeight: 16,
    marginBottom: 16,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: "auto",
  },
  cardActionText: { fontSize: 13, fontWeight: "600" },
  sectionCard: { padding: 24, marginBottom: 20 },
  ncrCard: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lighter,
    marginBottom: 16,
  },
  ncrCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  ncrCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  ncrCardTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.textMain },
  ncrCardDesc: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
  ncrCardBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lighter,
  },
  ncrCardBadgeText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  requestCard: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  requestHeader: { marginBottom: 12 },
  requestBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  requestDate: { fontSize: 10, color: COLORS.textSub },
  requestTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textMain,
    marginBottom: 8,
  },
  requestSubtitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  requestFooter: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 12,
  },
  requestFooterText: { fontSize: 12, color: COLORS.textSub },
  requestViewBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 10,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lighter,
  },
  emptyState: { alignItems: "center", padding: 40 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMain,
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textMain },
  closeBtn: { padding: 8 },
  modalBody: { padding: 20 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  textSub: { fontSize: 14, color: COLORS.textSub, marginBottom: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnDanger: { backgroundColor: COLORS.danger },
  btnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
  btnTextWhite: { fontSize: 14, fontWeight: "600", color: COLORS.white },
  modalContentV2: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderV2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitleV2: { fontSize: 18, fontWeight: "700", color: COLORS.textMain },
  modalSubtitle: { fontSize: 14, color: COLORS.textSub, marginTop: 2 },
  closeBtnV2: { padding: 8, borderRadius: 8 },
  modalBodyV2: { padding: 24, maxHeight: "90%" },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  infoGridItem: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  infoGridLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 6,
    fontWeight: "500",
  },
  infoGridValue: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
  sectionBox: {
    padding: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 8,
  },
  changesGrid: { flexDirection: "row", gap: 16 },
  changeColumn: { flex: 1 },
  changeLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 6,
    fontWeight: "500",
  },
  changeValue: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
  changeLabelSmall: { fontWeight: "600", color: COLORS.textMain },
  changeText: { fontSize: 14, color: COLORS.textMain, marginBottom: 4 },
  requestedChangesContent: { gap: 4 },
  reasonText: { fontSize: 14, color: COLORS.textMain, lineHeight: 20 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
  },
  footerBtnCancel: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerBtnReject: { backgroundColor: COLORS.danger },
  footerBtnApprove: { backgroundColor: COLORS.primary },
  footerBtnDisabled: { opacity: 0.6 },
  footerBtnTextCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMain,
  },
  footerBtnTextWhite: { fontSize: 14, fontWeight: "600", color: COLORS.white },
  infoSection: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 4,
  },
  infoSectionLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: 6,
    fontWeight: "500",
  },
  infoSectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoSectionValue: { fontSize: 14, fontWeight: "600", color: COLORS.textMain },
  teamBadge: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  teamBadgeText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  checkboxRowV2: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 8,
  },
  checkboxV2: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxV2Active: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxContent: { flex: 1 },
  checkboxTextV2: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 2,
  },
  checkboxSubtext: { fontSize: 12, color: COLORS.textSub },
  reassignSection: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  reassignLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textMain },
  auditorOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  auditorOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.bg,
  },
  auditorOptionText: { fontSize: 14, color: COLORS.textMain },
  coAuditorSection: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  selectedAuditors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  selectedAuditorTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lighter,
  },
  selectedAuditorTagText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
  },
  warningBoxV2: {
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningTextV2: { fontSize: 13, color: "#B91C1C", fontWeight: "600" },
  commentsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 8,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
    minHeight: 80,
    textAlignVertical: "top",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  defaultContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultText: {
    fontSize: 16,
    color: COLORS.textSub,
    textAlign: "center",
  },
});
