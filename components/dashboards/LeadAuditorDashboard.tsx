// app/components/dashboards/LeadAuditorDashboard.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import YearFilter from "../common/YearFilter";
import { useAuth } from "../context/AuthContext";
import { ToastProvider, useToast } from "../context/ToastContext";
import AuditsAndResponses from "./LeadAuditor/AuditsAndResponses";
import DashboardAnalytics from "./LeadAuditor/DashboardAnalytics";
import ResponseDetailModal from "./LeadAuditor/ResponseDetailModal";
import StakeholderManagement from "./LeadAuditor/StakeholderManagement";

// ============================================
// TYPES
// ============================================
interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string | { displayName?: string; name?: string };
  username?: string;
  name?: string;
}

interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  coAuditorIds?: string[] | string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
  createdAt?: string;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  createdAt?: string;
  raisedDate?: string;
  dueDate?: string;
}

interface Response {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  auditeeId?: string | number;
  status?: string;
  approvalStatus?: string;
  answers?: any;
  percentageScore?: number;
  totalScore?: number;
  maxPossibleScore?: number;
  createdAt?: string;
  submittedAt?: string;
  checkSheet?: { name: string };
}

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
  ncrApproved: number;
  ncrInProgress: number;
  ncrOpen: number;
}

// ============================================
// 📊 CHART COMPONENTS - Professional & Responsive
// ============================================

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    label?: string;
  }[];
}

// 1. Responsive Chart Container
const ChartContainer: React.FC<{
  title: string;
  children: React.ReactNode;
  height?: number;
  className?: string;
}> = ({ title, children, height = 280, className = "" }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const chartHeight = useMemo(() => {
    if (isMobile) return height * 0.7;
    if (isTablet) return height * 0.85;
    return height;
  }, [isMobile, isTablet, height]);

  return (
    <View 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
      style={{ 
        minHeight: Math.max(chartHeight, 200),
        flex: 1,
        marginHorizontal: isMobile ? 0 : 8,
      }}
    >
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-sm font-semibold text-slate-700">{title}</Text>
      </View>
      <View style={{ flex: 1, padding: isMobile ? 8 : 12, justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
};

// 2. Bar Chart Component
const BarChart: React.FC<{ data: ChartData; height?: number }> = ({ 
  data, 
  height = 200 
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const maxValue = useMemo(() => Math.max(...data.datasets[0].data, 1), [data]);
  const chartWidth = useMemo(() => Math.max(width - (isMobile ? 48 : 80), 200), [width, isMobile]);
  const barWidth = useMemo(() => Math.max((chartWidth / data.labels.length) * 0.6, 20), [chartWidth, data.labels.length]);

  // For Web: HTML5 Canvas
  if (Platform.OS === 'web') {
    return (
      <View style={{ height, width: '100%' }}>
        <div style={{ width: '100%', height: '100%' }}>
          <canvas 
            id={`bar-chart-${Date.now()}`}
            width={chartWidth} 
            height={height}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </View>
    );
  }

  // Native: SVG bars
  return (
    <View style={{ height, width: '100%', justifyContent: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: '100%', gap: 4 }}>
        {data.datasets[0].data.map((value, index) => {
          const barHeight = Math.max((value / maxValue) * (height - 40), 4);
          return (
            <View key={index} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  height: barHeight,
                  width: Math.min(barWidth, 40),
                  backgroundColor: data.datasets[0].backgroundColor?.[index] || '#00529B',
                  borderRadius: 4,
                  minHeight: 4,
                }}
              />
              <Text 
                numberOfLines={1}
                style={{ 
                  fontSize: isMobile ? 8 : 10, 
                  color: '#6B7280', 
                  marginTop: 4,
                  textAlign: 'center',
                  maxWidth: Math.min(barWidth + 10, 60),
                }}
              >
                {data.labels[index]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 3. Donut/Pie Chart Component
const DonutChart: React.FC<{ 
  data: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ data, size = 160 }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const chartSize = useMemo(() => {
    if (isMobile) return Math.min(size * 0.7, width - 60);
    return Math.min(size, width - 120);
  }, [isMobile, size, width]);

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0) || 1, [data]);
  let currentAngle = 0;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'relative', width: chartSize, height: chartSize }}>
        <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            if (percentage < 0.5) return null;
            
            const x1 = chartSize / 2 + (chartSize / 2 - 2) * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = chartSize / 2 + (chartSize / 2 - 2) * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = chartSize / 2 + (chartSize / 2 - 2) * Math.cos((startAngle + angle - 90) * Math.PI / 180);
            const y2 = chartSize / 2 + (chartSize / 2 - 2) * Math.sin((startAngle + angle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;
            
            return (
              <path
                key={index}
                d={`M ${chartSize / 2} ${chartSize / 2} L ${x1} ${y1} A ${chartSize / 2 - 2} ${chartSize / 2 - 2} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={item.color}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
          <circle 
            cx={chartSize / 2} 
            cy={chartSize / 2} 
            r={chartSize / 2 - 16} 
            fill="white" 
          />
        </svg>
        <View 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: [{ translateX: -chartSize / 4 }, { translateY: -chartSize / 4 }],
            alignItems: 'center',
            width: chartSize / 2,
          }}
        >
          <Text style={{ fontSize: chartSize * 0.12, fontWeight: 'bold', color: '#1E293B' }}>
            {total}
          </Text>
          <Text style={{ fontSize: chartSize * 0.07, color: '#6B7280' }}>
            Total
          </Text>
        </View>
      </View>
      
      {/* Legend */}
      <View 
        style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          marginTop: 12,
          gap: 8,
        }}
      >
        {data.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color }} />
            <Text style={{ fontSize: isMobile ? 10 : 12, color: '#475569' }}>
              {item.label} ({Math.round((item.value / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// 4. Stats Card - Responsive Grid
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  className?: string;
}> = ({ title, value, icon, trend, color = '#00529B', className = "" }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 ${className}`}
      style={{ 
        flex: 1,
        minWidth: isMobile ? '100%' : '45%',
        maxWidth: isMobile ? '100%' : '48%',
        marginBottom: isMobile ? 12 : 0,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {title}
          </Text>
          <Text 
            className="font-bold text-slate-800"
            style={{ fontSize: isMobile ? 20 : 24, marginTop: 4 }}
          >
            {value}
          </Text>
          {trend !== undefined && (
            <View className="flex-row items-center mt-1">
              {trend >= 0 ? (
                <TrendingUp size={14} color="#10B981" />
              ) : (
                <TrendingDown size={14} color="#EF4444" />
              )}
              <Text 
                style={{ 
                  color: trend >= 0 ? '#10B981' : '#EF4444',
                  fontSize: isMobile ? 10 : 12,
                  marginLeft: 2,
                  fontWeight: '600',
                }}
              >
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
        <View 
          style={{ 
            backgroundColor: color + '15', 
            padding: isMobile ? 8 : 10, 
            borderRadius: 12 
          }}
        >
          {icon}
        </View>
      </View>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const LeadAuditorDashboardContent: React.FC = () => {
  // ============================================
  // ✅ STEP 1: ALL HOOKS DECLARED FIRST
  // ============================================
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [carouselSpeed, setCarouselSpeed] = useState(5000);
  const [responseViewMode, setResponseViewMode] = useState("grid");
  const [ncrViewMode, setNcrViewMode] = useState("grid");
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState<string | null>(null);

  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [allNCRs, setAllNCRs] = useState<NCR[]>([]);
  const [allAuditors, setAllAuditors] = useState<User[]>([]);
  const [allAuditees, setAllAuditees] = useState<User[]>([]);
  const [allResponses, setAllResponses] = useState<Response[]>([]);

  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [filteredNCRs, setFilteredNCRs] = useState<NCR[]>([]);
  const [filteredAuditors, setFilteredAuditors] = useState<User[]>([]);
  const [filteredAuditees, setFilteredAuditees] = useState<User[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);

  const [reviewingResponse, setReviewingResponse] = useState<Response | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedResponseForDetail, setSelectedResponseForDetail] = useState<Response | null>(null);
  const [showResponseDetailModal, setShowResponseDetailModal] = useState(false);

  const [stats, setStats] = useState<Stats>({
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
    ncrApproved: 0,
    ncrInProgress: 0,
    ncrOpen: 0,
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Listen for tab param from drawer clicks
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as string);
    }
  }, [params?.tab]);

  // Helper to get department string
  const getDepartmentString = useCallback((dept: any): string => {
    if (!dept) return "";
    if (typeof dept === "string") return dept;
    if (typeof dept === "object") {
      return dept.displayName || dept.name || "";
    }
    return "";
  }, []);

  const fetchLeadAuditorDepartment = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${user?.id}`, {
        withCredentials: true,
      });
      const userData = response.data;
      let department = null;
      if (userData.department) {
        department = getDepartmentString(userData.department);
      } else if (userData.departmentName) {
        department = userData.departmentName;
      } else if (userData.departmentCode) {
        department = userData.departmentCode;
      }
      setLeadAuditorDepartment(department);
      return department;
    } catch (error) {
      if (user?.department) {
        const dept = getDepartmentString(user.department);
        setLeadAuditorDepartment(dept);
        return dept;
      }
      return null;
    }
  }, [user, getDepartmentString]);

  const normalizeDepartment = useCallback((dept: any): string => {
    const deptStr = getDepartmentString(dept).toUpperCase().trim();
    if (!deptStr) return "";
    const deptMap: Record<string, string> = {
      HR: "HR",
      "R&D": "ENGG",
      ENGINEERING: "ENGG",
      "R AND D": "ENGG",
      PURCHASE: "PURCHASE",
      RMS: "STORES_DESPATCH",
      SQA: "QA",
      PPC: "PPC",
      PRODUCTION: "PRODUCTION",
      "QA/QC": "QA",
      QA: "QA",
      QC: "QA",
      FGS: "STORES_DESPATCH",
      MARKETING: "MARKETING",
      "IMS (BE)": "MR",
      "IMS(BE)": "MR",
      IMS: "MR",
      MAINTENANCE: "PLANT_MAINTENANCE",
      MANAGEMENT: "UNIT_HEAD",
      "PLANT MAINTENANCE": "PLANT_MAINTENANCE",
      "TOOL MAINTENANCE": "TOOL_MAINTENANCE",
      "TOOL MANAGEMENT": "TOOL_MAINTENANCE",
      "STORES & DESPATCH": "STORES_DESPATCH",
      STORES: "STORES_DESPATCH",
      DESPATCH: "STORES_DESPATCH",
      "UNIT HEAD": "UNIT_HEAD",
      MR: "MR",
    };
    return deptMap[deptStr] || deptStr;
  }, [getDepartmentString]);

  const filterDataByDepartment = useCallback((
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[],
  ) => {
    if (!department) return { schedules, ncrs, auditors, auditees, responses };
    const normalizedTarget = normalizeDepartment(department);
    return {
      schedules: schedules.filter(
        (s) => normalizeDepartment(s.department) === normalizedTarget,
      ),
      ncrs: ncrs.filter(
        (n) => normalizeDepartment(n.department) === normalizedTarget,
      ),
      auditors: auditors.filter(
        (a) => normalizeDepartment(a.department) === normalizedTarget,
      ),
      auditees: auditees.filter(
        (a) => normalizeDepartment(a.department) === normalizedTarget,
      ),
      responses: responses.filter(
        (r) => normalizeDepartment(r.department) === normalizedTarget,
      ),
    };
  }, [normalizeDepartment]);

  const updateFilteredData = useCallback((
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[],
  ) => {
    const filtered = filterDataByDepartment(
      department,
      schedules,
      ncrs,
      auditors,
      auditees,
      responses,
    );
    setFilteredSchedules(filtered.schedules);
    setFilteredNCRs(filtered.ncrs);
    setFilteredAuditors(filtered.auditors);
    setFilteredAuditees(filtered.auditees);
    setFilteredResponses(filtered.responses);

    const today = new Date();
    const responsesApproved = filtered.responses.filter(
      (r) => r.status === "APPROVED",
    ).length;
    const responsesRejected = filtered.responses.filter(
      (r) => r.status === "REJECTED",
    ).length;
    const responsesSubmitted = filtered.responses.filter(
      (r) => r.status === "SUBMITTED",
    ).length;
    const overdue = filtered.schedules.filter((s) => {
      if (!s.scheduledDate) return false;
      return (
        new Date(s.scheduledDate) < today &&
        s.status !== "COMPLETED" &&
        s.status !== "REJECTED" &&
        s.status !== "APPROVED"
      );
    }).length;

    setStats({
      totalSchedules: filtered.schedules.length,
      completedSchedules: filtered.schedules.filter(
        (s) => s.status === "COMPLETED",
      ).length,
      approved: filtered.schedules.filter(
        (s) =>
          s.status === "APPROVED" || s.detailedApprovalStatus === "APPROVED",
      ).length,
      rejected: filtered.schedules.filter((s) => s.status === "REJECTED")
        .length,
      pendingApproval: filtered.schedules.filter(
        (s) =>
          s.status === "COMPLETED" && s.detailedApprovalStatus !== "APPROVED",
      ).length,
      inProgress: filtered.schedules.filter((s) => s.status === "IN_PROGRESS")
        .length,
      scheduled: filtered.schedules.filter((s) => s.status === "SCHEDULED")
        .length,
      overdue,
      totalNCRs: filtered.ncrs.length,
      openNCRs: filtered.ncrs.filter((n) => n.status !== "CLOSED").length,
      closedNCRs: filtered.ncrs.filter((n) => n.status === "CLOSED").length,
      criticalNCRs: filtered.ncrs.filter((n) => n.severity === "CRITICAL")
        .length,
      majorNCRs: filtered.ncrs.filter((n) => n.severity === "MAJOR").length,
      minorNCRs: filtered.ncrs.filter((n) => n.severity === "MINOR").length,
      totalResponses: filtered.responses.length,
      responsesApproved,
      responsesRejected,
      responsesSubmitted,
      ncrApproved: filtered.ncrs.filter((n) => n.status === "APPROVED").length,
      ncrInProgress: filtered.ncrs.filter((n) => n.status === "IN_PROGRESS")
        .length,
      ncrOpen: filtered.ncrs.filter((n) => n.status === "OPEN").length,
    });
  }, [filterDataByDepartment]);

  const fetchAllData = useCallback(async (year: number = selectedYear) => {
    try {
      setLoading(true);
      const department = await fetchLeadAuditorDepartment();
      const [schedulesRes, ncrRes, auditorsRes, auditeesRes, responsesRes] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/api/audit-schedule/year/${year}`, {
            withCredentials: true,
          }),
          axios
            .get(`${API_BASE_URL}/api/ncr/all`, { withCredentials: true })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditors`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/audit-schedule/auditees`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
          axios
            .get(`${API_BASE_URL}/api/templates/responses/all`, {
              withCredentials: true,
            })
            .catch(() => ({ data: [] })),
        ]);

      let schedules = schedulesRes.data || [];
      let ncrs = ncrRes.data || [];
      const auditors = auditorsRes.data || [];
      const auditees = auditeesRes.data || [];
      let responses = responsesRes.data || [];

      ncrs = ncrs.filter((ncr: NCR) => {
        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        if (ncrDate) return new Date(ncrDate).getFullYear() === year;
        return false;
      });

      responses = responses.filter((response: Response) => {
        const responseYear = response.createdAt
          ? new Date(response.createdAt).getFullYear()
          : null;
        return responseYear === year;
      });

      setAllSchedules(schedules);
      setAllNCRs(ncrs);
      setAllAuditors(auditors);
      setAllAuditees(auditees);
      setAllResponses(responses);
      updateFilteredData(
        department,
        schedules,
        ncrs,
        auditors,
        auditees,
        responses,
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      addToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, fetchLeadAuditorDepartment, updateFilteredData, addToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData(selectedYear);
  }, [fetchAllData, selectedYear]);

  const handleViewResponse = useCallback((response: Response) => {
    console.log("View Response:", response.id);
  }, []);

  const handleViewNCR = useCallback((ncr: NCR) => {
    console.log("View NCR:", ncr.id);
  }, []);

  const handleReviewResponseClick = useCallback((response: Response) => {
    setReviewingResponse(response);
    setReviewApproved(true);
    setReviewComment("");
  }, []);

  const handleViewResponseDetail = useCallback((response: Response) => {
    setSelectedResponseForDetail(response);
    setShowResponseDetailModal(true);
  }, []);

  const handleReviewResponse = useCallback(async () => {
    if (!reviewingResponse) return;
    if (!reviewApproved && !reviewComment.trim()) {
      addToast("Please provide a reason for rejection", "error");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = reviewApproved
        ? "lead-auditor/approve"
        : "lead-auditor/reject";
      await axios.put(
        `${API_BASE_URL}/api/templates/responses/${reviewingResponse.id}/${endpoint}`,
        { comment: reviewComment, signature: "Lead Auditor" },
        { withCredentials: true },
      );
      addToast(
        `Response ${reviewApproved ? "approved" : "rejected"} successfully!`,
        reviewApproved ? "success" : "error",
      );
      setReviewingResponse(null);
      setReviewComment("");
      fetchAllData();
    } catch (error: any) {
      addToast(
        error.response?.data?.message || "Failed to submit review",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }, [reviewingResponse, reviewApproved, reviewComment, addToast, fetchAllData]);

  // Memoized chart data for better performance
  const chartData = useMemo(() => {
    return {
      scheduleStatus: {
        labels: ['Approved', 'Rejected', 'Pending', 'In Progress', 'Scheduled', 'Overdue'],
        datasets: [{
          data: [stats.approved, stats.rejected, stats.pendingApproval, stats.inProgress, stats.scheduled, stats.overdue],
          backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444'],
          borderColor: ['#059669', '#DC2626', '#D97706', '#2563EB', '#7C3AED', '#DC2626'],
        }]
      },
      ncrSeverity: {
        labels: ['Critical', 'Major', 'Minor'],
        datasets: [{
          data: [stats.criticalNCRs, stats.majorNCRs, stats.minorNCRs],
          backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6'],
          borderColor: ['#DC2626', '#D97706', '#2563EB'],
        }]
      },
      responseStatus: {
        labels: ['Approved', 'Rejected', 'Submitted'],
        datasets: [{
          data: [stats.responsesApproved, stats.responsesRejected, stats.responsesSubmitted],
          backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
          borderColor: ['#059669', '#DC2626', '#2563EB'],
        }]
      },
      donutData: [
        { label: 'Approved', value: stats.approved, color: '#10B981' },
        { label: 'Rejected', value: stats.rejected, color: '#EF4444' },
        { label: 'Pending', value: stats.pendingApproval, color: '#F59E0B' },
        { label: 'In Progress', value: stats.inProgress, color: '#3B82F6' },
      ],
      ncrDonut: [
        { label: 'Open', value: stats.openNCRs, color: '#EF4444' },
        { label: 'In Progress', value: stats.ncrInProgress, color: '#F59E0B' },
        { label: 'Closed', value: stats.closedNCRs, color: '#10B981' },
      ],
    };
  }, [stats]);

  // Effects
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  useEffect(() => {
    fetchAllData(selectedYear);
  }, [selectedYear, fetchAllData]);

  const getResponseStatusBadge = useCallback((status?: string) => {
    const badges: Record<string, any> = {
      APPROVED: { bg: "#D1FAE5", text: "#059669" },
      REJECTED: { bg: "#FEE2E2", text: "#DC2626" },
      SUBMITTED: { bg: "#DBEAFE", text: "#2563EB" },
      DRAFT: { bg: "#F3F4F6", text: "#6B7280" },
    };
    return badges[status || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  }, []);

  const departmentDisplayName = leadAuditorDepartment || "All Departments";

  // Render charts section with professional styling
  const renderChartsSection = useCallback(() => {
    return (
      <View style={{ marginTop: 20 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-slate-800">
            Analytics Overview
          </Text>
          <View className="flex-row items-center gap-2">
            <Activity size={18} color="#6B7280" />
            <Text className="text-xs text-slate-500">Live Data</Text>
          </View>
        </View>

        {/* Chart Grid - Responsive layout */}
        <View 
          style={{ 
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: isMobile ? 16 : 20,
          }}
        >
          {/* Bar Chart - Schedule Status */}
          <View style={{ 
            flex: isDesktop ? 1 : 2,
            width: isMobile ? '100%' : isTablet ? '48%' : '32%',
          }}>
            <ChartContainer title="Schedule Status Distribution" height={280}>
              <BarChart 
                data={chartData.scheduleStatus} 
                height={isMobile ? 150 : 200}
              />
            </ChartContainer>
          </View>

          {/* Donut Chart - Schedule Overview */}
          <View style={{ 
            flex: 1,
            width: isMobile ? '100%' : isTablet ? '48%' : '32%',
          }}>
            <ChartContainer title="Schedule Overview" height={280}>
              <DonutChart 
                data={chartData.donutData} 
                size={isMobile ? 140 : 180}
              />
            </ChartContainer>
          </View>

          {/* NCR Severity Chart */}
          <View style={{ 
            flex: 1,
            width: isMobile ? '100%' : isTablet ? '48%' : '32%',
          }}>
            <ChartContainer title="NCR Severity" height={280}>
              <BarChart 
                data={chartData.ncrSeverity} 
                height={isMobile ? 150 : 200}
              />
            </ChartContainer>
          </View>

          {/* Response Status - Second Row */}
          <View style={{ 
            flex: isDesktop ? 1 : 2,
            width: isMobile ? '100%' : isTablet ? '48%' : '32%',
          }}>
            <ChartContainer title="Response Status" height={280}>
              <BarChart 
                data={chartData.responseStatus} 
                height={isMobile ? 150 : 200}
              />
            </ChartContainer>
          </View>

          {/* NCR Donut Chart */}
          <View style={{ 
            flex: 1,
            width: isMobile ? '100%' : isTablet ? '48%' : '32%',
          }}>
            <ChartContainer title="NCR Status Distribution" height={280}>
              <DonutChart 
                data={chartData.ncrDonut} 
                size={isMobile ? 140 : 180}
              />
            </ChartContainer>
          </View>
        </View>
      </View>
    );
  }, [isMobile, isTablet, isDesktop, chartData]);

  // ✅ MOVED renderContent useCallback BEFORE the early return!
  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "overview":
        return (
          <View>
            {/* Stats Grid - Responsive */}
            <View 
              style={{ 
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                gap: isMobile ? 8 : 12,
                marginBottom: 16,
              }}
            >
              <StatsCard 
                title="Total Schedules" 
                value={stats.totalSchedules} 
                icon={<Calendar size={20} color="#00529B" />}
                color="#00529B"
              />
              <StatsCard 
                title="Approved" 
                value={stats.approved} 
                icon={<CheckCircle size={20} color="#10B981" />}
                color="#10B981"
                trend={12}
              />
              <StatsCard 
                title="Pending" 
                value={stats.pendingApproval} 
                icon={<AlertCircle size={20} color="#F59E0B" />}
                color="#F59E0B"
                trend={-5}
              />
              <StatsCard 
                title="Total NCRs" 
                value={stats.totalNCRs} 
                icon={<AlertCircle size={20} color="#EF4444" />}
                color="#EF4444"
              />
              <StatsCard 
                title="Open NCRs" 
                value={stats.openNCRs} 
                icon={<AlertCircle size={20} color="#EF4444" />}
                color="#EF4444"
                trend={8}
              />
              <StatsCard 
                title="Responses" 
                value={stats.totalResponses} 
                icon={<FileText size={20} color="#3B82F6" />}
                color="#3B82F6"
              />
            </View>

            {/* Charts Section */}
            {renderChartsSection()}

            {/* Original DashboardAnalytics - keep for detailed data */}
            <DashboardAnalytics
              stats={stats}
              allSchedules={filteredSchedules}
              allNCRs={filteredNCRs}
              allResponses={filteredResponses}
              carouselSpeed={carouselSpeed}
              setCarouselSpeed={setCarouselSpeed}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              leadAuditorDepartment={leadAuditorDepartment}
            />
          </View>
        );
      case "audits":
      case "responses":
      case "ncrs":
        return (
          <AuditsAndResponses
            activeTab={activeTab}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            allAuditors={filteredAuditors}
            stats={stats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            responseViewMode={responseViewMode}
            setResponseViewMode={setResponseViewMode}
            ncrViewMode={ncrViewMode}
            setNcrViewMode={setNcrViewMode}
            onViewResponse={handleViewResponse}
            onReviewResponse={handleReviewResponseClick}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      case "auditors":
      case "auditees":
        return (
          <StakeholderManagement
            activeTab={activeTab}
            allAuditors={filteredAuditors}
            allAuditees={filteredAuditees}
            allSchedules={filteredSchedules}
            allResponses={filteredResponses}
            allNCRs={filteredNCRs}
            onViewResponse={handleViewResponse}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      default:
        return (
          <View className="items-center justify-center p-10 mt-4 bg-white border rounded-2xl border-slate-200">
            <Text className="text-base text-center text-slate-500">
              Select a section from the navigation
            </Text>
          </View>
        );
    }
  }, [
    activeTab, 
    isMobile, 
    stats, 
    renderChartsSection, 
    filteredSchedules, 
    filteredNCRs, 
    filteredResponses, 
    filteredAuditors,
    carouselSpeed,
    refreshing,
    leadAuditorDepartment,
    searchTerm,
    responseViewMode,
    ncrViewMode,
    handleRefresh,
    handleViewResponse,
    handleReviewResponseClick,
    handleViewNCR,
    handleViewResponseDetail,
  ]);

  // ============================================
  // ✅ STEP 2: CONDITIONAL RETURNS (AFTER ALL HOOKS)
  // ============================================
  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-50">
        <ActivityIndicator size="large" color="#00529B" className="mb-4" />
        <Text className="text-sm font-medium text-slate-500">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  // ============================================
  // STEP 3: RENDER
  // ============================================
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-slate-50">
      {/* Header - Responsive */}
      <View className="w-full px-4 py-5 bg-white border-b shadow-sm border-slate-200 md:px-8">
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View className="flex-row flex-wrap items-center justify-between gap-4">
            <View className="flex-1 min-w-[200px]">
              <Text 
                className="font-bold text-slate-800"
                style={{ fontSize: isMobile ? 18 : 24 }}
              >
                Lead Auditor Dashboard
              </Text>
              <Text 
                className="text-slate-500"
                style={{ fontSize: isMobile ? 10 : 14, marginTop: 2 }}
              >
                Welcome back,{" "}
                <Text className="font-semibold text-slate-700">
                  {user?.name || user?.username || "User"}
                </Text>
                <Text className="text-slate-300"> | </Text>
                <Text className="font-medium text-blue-600">
                  Dept: {departmentDisplayName}
                </Text>
              </Text>
            </View>

            <View className="flex-row flex-wrap items-center gap-3">
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                availableYears={availableYears}
              />

              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                className={`flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl ${
                  refreshing ? "opacity-60" : ""
                }`}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#00529B" />
                ) : (
                  <RefreshCw size={16} color="#475569" />
                )}
                {!isMobile && (
                  <Text className="text-sm font-semibold text-slate-700">
                    Refresh
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Content - Responsive ScrollView */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 24,
          paddingHorizontal: isMobile ? 12 : 24,
          maxWidth: 1400,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View className="w-full mt-6">{renderContent()}</View>
      </ScrollView>

      {/* Response Detail Modal */}
      {showResponseDetailModal && selectedResponseForDetail && (
        <ResponseDetailModal
          response={selectedResponseForDetail}
          visible={showResponseDetailModal}
          onClose={() => {
            setShowResponseDetailModal(false);
            setSelectedResponseForDetail(null);
          }}
        />
      )}

      {/* Review Response Modal */}
      {reviewingResponse && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReviewingResponse(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="items-center justify-center flex-1 bg-slate-900/60"
          >
            <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <View className="flex-row items-center gap-3">
                  <View className="p-2 rounded-lg bg-blue-50">
                    <FileText size={20} color="#00529B" />
                  </View>
                  <Text className="text-lg font-bold text-slate-800">
                    Review Response
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReviewingResponse(null)}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Info Card */}
              <View className="p-4 mb-5 border bg-slate-50 rounded-xl border-slate-100">
                <Text className="text-sm font-bold text-slate-800">
                  {reviewingResponse.department}
                </Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-xs text-slate-600">
                    Score:{" "}
                    <Text className="font-bold text-blue-600">
                      {reviewingResponse.totalScore}/
                      {reviewingResponse.maxPossibleScore}
                    </Text>
                  </Text>
                  <Text className="text-xs text-slate-600">
                    Auditee:{" "}
                    <Text className="font-bold text-blue-600">
                      {reviewingResponse.auditeeName}
                    </Text>
                  </Text>
                </View>
                <View className="mt-3">
                  <View
                    className={`self-start px-3 py-1 rounded-lg ${
                      reviewingResponse.status === "APPROVED"
                        ? "bg-emerald-50"
                        : reviewingResponse.status === "REJECTED"
                          ? "bg-rose-50"
                          : reviewingResponse.status === "SUBMITTED"
                            ? "bg-blue-50"
                            : "bg-slate-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        reviewingResponse.status === "APPROVED"
                          ? "text-emerald-700"
                          : reviewingResponse.status === "REJECTED"
                            ? "text-rose-700"
                            : reviewingResponse.status === "SUBMITTED"
                              ? "text-blue-700"
                              : "text-slate-600"
                      }`}
                    >
                      {reviewingResponse.status || "DRAFT"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Approve / Reject Radio Buttons */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  className={`flex-row items-center gap-3 flex-1 p-4 rounded-xl border transition-all ${
                    reviewApproved
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-slate-200"
                  }`}
                  onPress={() => setReviewApproved(true)}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      reviewApproved ? "border-emerald-600" : "border-slate-300"
                    }`}
                  >
                    {reviewApproved && (
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      reviewApproved ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center gap-3 flex-1 p-4 rounded-xl border transition-all ${
                    !reviewApproved
                      ? "bg-rose-50 border-rose-300"
                      : "bg-white border-slate-200"
                  }`}
                  onPress={() => setReviewApproved(false)}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      !reviewApproved ? "border-rose-600" : "border-slate-300"
                    }`}
                  >
                    {!reviewApproved && (
                      <View className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    )}
                  </View>
                  <Text
                    className={`text-sm font-semibold ${
                      !reviewApproved ? "text-rose-700" : "text-slate-600"
                    }`}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comment Input */}
              <TextInput
                className="w-full p-3 mb-6 text-sm bg-white border border-slate-200 rounded-xl"
                style={{ minHeight: 80, textAlignVertical: "top" }}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={
                  reviewApproved
                    ? "Add approval comments (optional)..."
                    : "Please provide reason for rejection..."
                }
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Footer Buttons */}
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => setReviewingResponse(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <Text className="text-sm font-semibold text-slate-700">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReviewResponse}
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl shadow-md ${
                    submitting
                      ? "bg-slate-400"
                      : reviewApproved
                        ? "bg-emerald-600"
                        : "bg-rose-600"
                  }`}
                >
                  <Text className="text-sm font-semibold text-white">
                    {submitting
                      ? "Processing..."
                      : reviewApproved
                        ? "Approve"
                        : "Reject"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default function LeadAuditorDashboard() {
  return (
    <ToastProvider>
      <LeadAuditorDashboardContent />
    </ToastProvider>
  );
}