import { LinearGradient } from "expo-linear-gradient";
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
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const hasData = data.some((d) => d.value > 0);
  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 2 : 1, width: "100%" }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {!hasData ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      ) : (
        <View style={styles.barChartContainer}>
          {data.map((item, idx) => {
            const heightPercent = (item.value / maxValue) * 100;
            return (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barValue}>{item.value}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { height: `${heightPercent}%` }]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      )}
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
  const totalValue = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const hasData = data.some((d) => d.value > 0);
  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 1 : 1, width: "100%" }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {!hasData ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      ) : (
        <View>
          <View style={styles.stackedBar}>
            {data.map((item, idx) => (
              <View
                key={idx}
                style={{
                  width: `${(item.value / totalValue) * 100}%`,
                  backgroundColor: item.color,
                  height: 16,
                  borderTopLeftRadius: idx === 0 ? 8 : 0,
                  borderBottomLeftRadius: idx === 0 ? 8 : 0,
                  borderTopRightRadius: idx === data.length - 1 ? 8 : 0,
                  borderBottomRightRadius: idx === data.length - 1 ? 8 : 0,
                }}
              />
            ))}
          </View>
          <View style={styles.legendContainer}>
            <Text style={styles.legendTotal}>{total || totalValue} Total</Text>
            {data.map((item, idx) => (
              <View key={idx} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendText}>{item.name}</Text>
                <Text style={styles.legendValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </AnimatedGlassCard>
  );
};

const DepartmentAnalysis = ({
  data,
  isDesktop,
}: {
  data: DeptDataItem[];
  isDesktop: boolean;
}) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <AnimatedGlassCard style={{ flex: isDesktop ? 2 : 1, width: "100%" }}>
      <Text style={styles.cardTitle}>NCR by Department</Text>
      <Text style={styles.cardSubtitle}>Distribution across departments</Text>
      <View style={{ gap: 12 }}>
        {data.map((item, idx) => (
          <View key={idx}>
            <View style={styles.deptHeader}>
              <Text style={styles.deptName}>{item.department}</Text>
              <Text style={styles.deptCount}>{item.count}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(item.count / maxCount) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
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
    <View style={styles.feedHeader}>
      <View>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <Text style={styles.cardSubtitle}>Latest updates</Text>
      </View>
      <View style={styles.feedIconBox}>
        <Activity size={16} color={COLORS.primary} />
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
            <View style={styles.feedItemIcon}>
              {React.cloneElement(activity.icon as any, {
                color: COLORS.primary,
              })}
            </View>
            <View style={styles.feedItemContent}>
              <Text style={styles.feedItemTitle}>{activity.title}</Text>
              <Text style={styles.feedItemDesc}>{activity.description}</Text>
            </View>
            <Text style={styles.feedItemTime}>{activity.time}</Text>
          </View>
        ))}
      </View>
    )}
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

  const { user } = useAuth();

  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.firstName) return user.firstName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const displayName = getUserName().split(" ")[0];

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
      u.role?.toUpperCase().includes('TOP_MANAGEMENT')
    );
    const auditManagers = allUsersList.filter((u: any) =>
      u.role?.toUpperCase().includes('AUDIT_MANAGER')
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
      Open: 0,
      "In Progress": 0,
      "Pending Verification": 0,
      Closed: 0,
    };
    allNcrs.forEach((ncr: any) => {
      const status = (ncr.status || "").toUpperCase();
      if (status === "CLOSED") groups["Closed"]++;
      else if (status.includes("IN_PROGRESS")) groups["Pending Verification"]++;
      else if (status === "OPEN" || status === "NEW") groups["Open"]++;
      else groups["In Progress"]++;
    });
    return [
      { name: "Open", value: groups["Open"], color: COLORS.chartColors[0] },
      {
        name: "In Progress",
        value: groups["In Progress"],
        color: COLORS.chartColors[2],
      },
      {
        name: "Pending Verification",
        value: groups["Pending Verification"],
        color: COLORS.chartColors[4],
      },
      { name: "Closed", value: groups["Closed"], color: COLORS.chartColors[6] },
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
            <View
              style={{
                flexDirection: isDesktop ? "row" : "column",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
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
              <DepartmentAnalysis
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
                title="NCR Summary"
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
              <DepartmentAnalysis
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
      return <Form9View />;
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
              style={[styles.header, isSmallMobile && styles.headerSmall]}
            >
              <View
                style={[
                  styles.headerInner,
                  isSmallMobile && {
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 12,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.greetingText,
                      isSmallMobile && { fontSize: 18 },
                    ]}
                  >
                    {greeting}, {displayName}
                  </Text>
                  <Text
                    style={[
                      styles.subGreetingText,
                      isSmallMobile && { fontSize: 12 },
                    ]}
                  >
                    Manage your audit workflow and schedules
                  </Text>
                </View>
                <View
                  style={[
                    styles.headerActions,
                    isSmallMobile && {
                      width: "100%",
                      justifyContent: "space-between",
                    },
                  ]}
                >
                  <YearFilter
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    availableYears={availableYears}
                  />
                  <TouchableOpacity
                    style={styles.forumBtn}
                    onPress={openAuditForum}
                  >
                    <MessageSquare size={16} color={COLORS.white} />
                    {!isSmallMobile && (
                      <Text style={styles.forumBtnText}>Forum</Text>
                    )}
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
  glassCard: {
    backgroundColor: COLORS.glass.light,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  header: { padding: 20, marginBottom: 20 },
  headerSmall: { padding: 16, marginBottom: 16 },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  subGreetingText: { fontSize: 14, color: COLORS.gray[500], marginTop: 4 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  forumBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  forumBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },
  kpiCard: { padding: 20, marginBottom: 0 },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textMain,
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 12, color: COLORS.textSub, marginBottom: 16 },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  emptyText: { color: COLORS.textSub, fontSize: 14 },
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 200,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barValue: { fontSize: 10, color: COLORS.textSub, marginBottom: 4 },
  barTrack: {
    width: "60%",
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barLabel: { fontSize: 10, color: COLORS.textSub, marginTop: 8 },
  stackedBar: {
    flexDirection: "row",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
  },
  legendContainer: { gap: 12 },
  legendTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 12, color: COLORS.textMain },
  legendValue: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  deptName: { fontSize: 12, color: COLORS.textMain },
  deptCount: { fontSize: 12, fontWeight: "bold", color: COLORS.primary },
  progressTrack: {
    height: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  feedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  feedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
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
  workflowCard: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
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
    padding: 20,
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
  modalBodyV2: { padding: 24, maxHeight: "60%" },
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
