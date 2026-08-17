import ForumThreadView from "@/components/forum/ForumThreadView";
import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  AlertCircle,
  AlertTriangle, // ✅ Added
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Eye,
  FileText,
  Grid3x3,
  Layers, // ✅ Added
  List,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  UserCheck,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import YearFilter from "../common/YearFilter";
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";
import FiveSAuditForm from "./auditor/FiveSAuditForm";
import ManufacturingProcessAuditForm from "./auditor/ManufacturingProcessAuditForm";
import NCRViewManager from "./auditor/view/NCRViewManager";
// ============================================================================
// ⚠️ STEP 1: UNCOMMENT YOUR REAL IMPORTS & DELETE THE FALLBACKS BELOW
// ============================================================================

import { useAuth } from "@/components/context/AuthContext";
import { useToast } from "@/components/context/ToastContext"; // or your actual path
import IATFInternalAuditForm from "./auditor/IATFInternalAuditForm";
// Adjust the path if your file is named differently (e.g., fives-view.tsx)
import FiveSView from "./auditor/view/FiveSView";
import IATFInternalView from "./auditor/view/IATFInternalView";
import ManufacturingProcessView from "./auditor/view/ManufacturingProcessView";
// ============================================================================
import Form7View from "./auditor/Form7View";


const TIME_OPTIONS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

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
// ✅ NATIVE FETCH HELPER
// ============================================================================
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const token = await AsyncStorage.getItem("token");

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`❌ [API FETCH] Failed (${endpoint}):`, error);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getFormRoute = (audit: any) => {
  const t = (audit.auditType || "").toLowerCase().trim();

  // 1. 5S Audit
  if (t.includes("5s") || t.includes("five_s") || t.includes("five s")) {
    return "AuditFiveS"; // ⚠️ CHANGE THIS to match your EXACT file name (e.g., "AuditFiveS" or "FiveSAuditForm")
  }
  // 2. System / IATF / Internal Audit
  if (
    t.includes("iatf") ||
    t.includes("system") ||
    t.includes("internal") ||
    t.includes("16949")
  ) {
    return "AuditIATFInternal"; // ⚠️ CHANGE THIS to match your file name
  }
  // 3. Process / Manufacturing Audit
  if (t.includes("process") || t.includes("manufacturing")) {
    return "AuditManufacturingProcess"; // ⚠️ CHANGE THIS to match your file name
  }

  // Default fallback
  return "AuditFiveS";
};

const getViewRoute = (audit: any) => {
  const auditType = (audit.auditType || "").toLowerCase().trim();
  console.log("📂 [DEBUG] Determining route for auditType:", auditType);

  // ⚠️ VERIFY THESE PATHS MATCH YOUR EXACT FILE NAMES IN THE `app` FOLDER
  if (
    auditType.includes("5s") ||
    auditType.includes("five_s") ||
    auditType.includes("five s")
  ) {
    // If your file is named FiveSView.tsx, change this to "/auditor/five-s-view"
    return "/auditor/fives-view";
  }
  if (auditType.includes("process") || auditType.includes("manufacturing")) {
    return "/auditor/manufacturing-view";
  }
  if (
    auditType.includes("iatf") ||
    auditType.includes("system") ||
    auditType.includes("16949")
  ) {
    return "/auditor/iatf-view";
  }

  console.warn(
    "⚠️ [DEBUG] Unknown audit type, defaulting to /auditor/fives-view",
  );
  return "/auditor/fives-view";
};

const isAuditExpired = (audit: any) => {
  if (!audit || audit.status === "COMPLETED") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateRange =
    audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;

  if (isDateRange) {
    // ✅ USE parseServerDate HERE
    const fromDate = parseServerDate(audit.fromDate);
    const toDate = parseServerDate(audit.toDate);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    if (today < fromDate) return false;
    if (today > toDate) return true;

    if (today >= fromDate && today <= toDate) {
      if (today.toDateString() === toDate.toDateString() && audit.endTime) {
        // ... (keep your existing time parsing logic here)
      }
      return false;
    }
    return false;
  }

  if (!audit?.scheduledDate) return false;

  // ✅ USE parseServerDate HERE
  const scheduleDate = parseServerDate(audit.scheduledDate);
  scheduleDate.setHours(0, 0, 0, 0);

  if (scheduleDate < today) return true;
  if (scheduleDate.getTime() === today.getTime() && audit.endTime) {
    // ... (keep your existing time parsing logic here)
  }
  return false;
};


const parseResponseAnswers = (r: any) => {
  try {
    return typeof r.answers === "string"
      ? JSON.parse(r.answers || "{}")
      : r.answers || {};
  } catch {
    return {};
  }
};

const getAuditReportNumber = (answers: any, response: any) =>
  answers.auditReportNumber ||
  answers.auditNumber ||
  answers.documentNumber ||
  `AUDIT-${response.id}`;

const getNcrFindingEntries = (answers: any) => {
  const responses: any = answers.responses || {};
  const observations: any = answers.observations || {};
  const questionData: any[] = answers.questionsData || [];
  const questionMap = new Map<string, any>(
    questionData.map((q: any) => [String(q.slNo), q]),
  );

  return Object.entries(responses)
    .filter(([, v]: any) => v === "MINOR_NC" || v === "MAJOR_NC")
    .map(([qId, v]: any) => {
      const q: any = questionMap.get(String(qId));
      return {
        questionId: qId,
        severity: v === "MAJOR_NC" ? "Major NC" : "Minor NC",
        clause: q?.clause ? `Clause ${q.clause}` : `Question ${qId}`,
        checkpoint: q?.checkpoint || `Question ${qId}`,
        observation: observations[qId] || "Observation not entered",
      };
    });
};

const buildPendingNcrQuery = (item: any) => {
  const p = new URLSearchParams();
  p.append("auditId", item.responseId);
  p.append("auditReportNumber", item.auditReportNumber);
  p.append("department", item.department || "");
  p.append("shift", item.shift || "Day");
  if (item.auditeeId) p.append("auditeeId", item.auditeeId);
  if (item.auditeeName) p.append("auditeeName", item.auditeeName);
  p.append("clause", item.findings.map((f: any) => f.clause).join("\n"));
  p.append(
    "evidence",
    item.findings
      .map(
        (f: any) =>
          `${f.questionId}: ${f.checkpoint}\nStatus: ${f.severity}\nEvidence: ${f.observation}`,
      )
      .join("\n"),
  );
  p.append(
    "statement",
    item.findings
      .map(
        (f: any) =>
          `${f.severity} identified for ${f.questionId}: ${f.checkpoint}`,
      )
      .join("\n"),
  );
  return p.toString();
};

const parseTimeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================
const TimePicker = ({ value, onChange, disabled, options }: any) => {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <View>
      <TouchableOpacity
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
        className={`w-full p-3 border rounded-xl bg-white ${disabled ? "bg-slate-100 border-slate-200" : "border-slate-200"}`}
      >
        <Text
          className={`text-sm ${disabled ? "text-slate-400" : "text-slate-800"}`}
        >
          {value || "Select Time"}
        </Text>
      </TouchableOpacity>
      <Modal visible={showPicker} transparent animationType="slide">
        <View className="justify-end flex-1 bg-slate-900/50">
          <View
            className="p-4 bg-white rounded-t-3xl"
            style={{ maxHeight: "50%" }}
          >
            <View className="flex-row items-center justify-between pb-2 mb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800">
                Select Time
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item: string) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item);
                    setShowPicker(false);
                  }}
                  className={`p-4 rounded-xl mb-2 ${value === item ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}
                >
                  <Text
                    className={`text-center font-medium ${value === item ? "text-blue-700" : "text-slate-700"}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const StatCard = ({ title, value, icon: Icon }: any) => (
  <View className="flex-1 p-3 bg-white border shadow-sm border-slate-200 rounded-2xl">
    <View className="flex-row items-start justify-start mb-2">
      <View
        className="p-2 rounded-xl"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <Icon size={18} color={NAVBAR_COLORS.primary} />
      </View>
    </View>
    <Text
      className="mb-1 text-lg font-bold tracking-tight text-left text-slate-800"
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text
      className="text-[10px] font-semibold tracking-wide uppercase text-left text-slate-500"
      numberOfLines={2}
    >
      {title}
    </Text>
  </View>
);
const StatCardsContainer = ({ stats, isNcr = false }: any) => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const auditStats = [
    { title: "Upcoming", value: stats.upcoming, icon: Calendar },
    { title: "Active", value: stats.active, icon: Play },
    { title: "In Progress", value: stats.inProgress, icon: Edit },
    { title: "Overdue (No Work)", value: stats.overdueNoWork, icon: XCircle },
    {
      title: "Overdue (Partial)",
      value: stats.overduePartialWork,
      icon: AlertTriangle,
    },
    { title: "Partial", value: stats.partiallyCompleted, icon: Layers },
    { title: "Completed", value: stats.completed, icon: CheckCircle },
  ];

  const ncrStatsData = [
    { title: "Total NCRs", value: stats.total, icon: FileText },
    { title: "Awaiting", value: stats.awaiting, icon: Clock },
    { title: "Pending", value: stats.pending, icon: AlertCircle },
    { title: "In Progress", value: stats.inProgress, icon: Edit },
    { title: "Closed", value: stats.closed, icon: CheckCircle },
    { title: "Rejected", value: stats.rejected, icon: XCircle },
  ];

  const statsData = isNcr ? ncrStatsData : auditStats;

  // ✅ MOBILE: Horizontal ScrollView (Fixed width per card so it doesn't squish)
  if (isMobile) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {statsData.map((stat, index) => (
          <View key={index} className="mr-4" style={{ width: 155 }}>
            <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
          </View>
        ))}
      </ScrollView>
    );
  }

  // ✅ TABLET & DESKTOP: Force ALL cards into a SINGLE row
  // Using flex: 1 ensures they divide the available width equally (whether 6 or 7 cards)
  return (
    <View className="flex-row">
      {statsData.map((stat, index) => (
        <View key={index} className="px-1 mb-4" style={{ flex: 1 }}>
          <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
        </View>
      ))}
    </View>
  );
};

// ✅ NEW: COMPACT LIST ITEM COMPONENT FOR LIST VIEW
const AuditListItem = ({
  item,
  handleViewForm,
  handleViewReport,
  onRequestReschedule,
  onRequestExtension,
  onOpenForum,
}: any) => {
  const audit = item.schedule;
  const timeStatus = item.timeStatus;
  const canStart = item.canStart;
  const isExpired = timeStatus === "EXPIRED" || isAuditExpired(audit);
  const allFormsCompleted =
    audit.allFormsCompleted ||
    (audit.completedForms === audit.totalForms && audit.totalForms > 0);
  const hasPendingForms = (audit.pendingForms || 0) > 0;
  const hasStartedWork = audit.hasFormData && audit.completedForms > 0;
  const isOverdueNoWork = isExpired && !hasStartedWork;
  const isOverduePartialWork = isExpired && hasStartedWork && hasPendingForms;
  const hasPendingReschedule = item.schedule.rescheduleRequested;
  const hasPendingExtension = item.schedule.extensionRequested;
  const nextPendingForm = audit.formDetails?.find((f: any) => !f.completed);

  const getStatusBadge = () => {
    const baseClass =
      "flex-row items-center gap-1.5 px-2 py-1 rounded-lg border";
    if (allFormsCompleted)
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <CheckCircle size={12} color="#047857" />
          <Text className="text-[10px] font-semibold text-emerald-700">
            Completed
          </Text>
        </View>
      );
    if (hasPendingReschedule)
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <Clock size={12} color="#1d4ed8" />
          <Text className="text-[10px] font-semibold text-blue-700">
            Reschedule Pending
          </Text>
        </View>
      );
    if (hasPendingExtension)
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <Clock size={12} color="#1d4ed8" />
          <Text className="text-[10px] font-semibold text-blue-700">
            Extension Pending
          </Text>
        </View>
      );
    if (isOverduePartialWork)
      return (
        <View className={`${baseClass} bg-amber-50 border-amber-200`}>
          <AlertCircle size={12} color="#b45309" />
          <Text className="text-[10px] font-semibold text-amber-700">
            Overdue
          </Text>
        </View>
      );
    if (isOverdueNoWork)
      return (
        <View className={`${baseClass} bg-rose-50 border-rose-200`}>
          <AlertCircle size={12} color="#be123c" />
          <Text className="text-[10px] font-semibold text-rose-700">
            Overdue
          </Text>
        </View>
      );
    if (timeStatus === "UPCOMING")
      return (
        <View className={`${baseClass} bg-slate-50 border-slate-200`}>
          <Calendar size={12} color="#475569" />
          <Text className="text-[10px] font-semibold text-slate-700">
            Upcoming
          </Text>
        </View>
      );
    if (timeStatus === "ACTIVE" && canStart)
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <Play size={12} color="#047857" />
          <Text className="text-[10px] font-semibold text-emerald-700">
            Ready
          </Text>
        </View>
      );
    return (
      <View className={`${baseClass} bg-slate-50 border-slate-200`}>
        <Calendar size={12} color="#475569" />
        <Text className="text-[10px] font-semibold text-slate-700">
          Scheduled
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-row items-center justify-between w-full p-4 mb-3 bg-white border shadow-sm border-slate-200 rounded-xl">
      <View className="flex-1 mr-4">
        <View className="flex-row flex-wrap items-center gap-2 mb-2">
          {getStatusBadge()}
          {audit.auditNumber && (
            <Text className="font-mono text-xs text-slate-600">
              #{audit.auditNumber}
            </Text>
          )}
        </View>
        <Text
          className="mb-1 text-sm font-bold text-slate-800"
          numberOfLines={1}
        >
          {audit.auditType || "Audit"} - {audit.department || "General"}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Calendar size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-600">
              {audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate
                ? `${audit.fromDate} → ${audit.toDate}`
                : audit.scheduledDate}
            </Text>
            {audit.originalScheduledDate && (
              <Text className="ml-1 text-xs line-through text-rose-500">
                Was: {audit.originalScheduledDate}
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            <UserCheck size={12} color="#94a3b8" />
            <Text className="text-xs text-slate-600">
              {audit.auditeeName || "TBD"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => onOpenForum(audit, null)}
          className="p-2 border rounded-lg bg-slate-50 border-slate-200"
        >
          <MessageCircle size={16} color="#334155" />
        </TouchableOpacity>

        {isOverdueNoWork && !hasPendingReschedule ? (
          <TouchableOpacity
            onPress={() => onRequestReschedule(audit)}
            className="px-3 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-xs font-semibold text-white">Reschedule</Text>
          </TouchableOpacity>
        ) : isOverduePartialWork && !hasPendingExtension ? (
          <TouchableOpacity
            onPress={() => onRequestExtension(audit)}
            className="px-3 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-xs font-semibold text-white">Extend</Text>
          </TouchableOpacity>
        ) : !hasPendingReschedule &&
          !hasPendingExtension &&
          !isExpired &&
          !allFormsCompleted &&
          hasPendingForms &&
          nextPendingForm &&
          (timeStatus === "ACTIVE" || canStart) ? ( // ✅ ADD THIS LINE
          <TouchableOpacity
            onPress={() => handleViewForm(audit, nextPendingForm)}
            className="px-3 py-2 border border-blue-200 rounded-lg bg-blue-50"
          >
            <Text className="text-xs font-semibold text-blue-700">
              Fill Next
            </Text>
          </TouchableOpacity>
        ) : !hasPendingReschedule &&
          !hasPendingExtension &&
          !hasStartedWork &&
          !isExpired &&
          (timeStatus === "ACTIVE" || canStart) ? ( // ✅ ADD THIS LINE
          <TouchableOpacity
            onPress={() => handleViewForm(audit, audit.formDetails?.[0])}
            className="px-3 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-xs font-semibold text-white">Start</Text>
          </TouchableOpacity>
        ) : audit.formDetails?.[0]?.responseId && allFormsCompleted ? ( // ✅ Added && allFormsCompleted
          <TouchableOpacity
            onPress={() =>
              handleViewReport(
                audit.formDetails?.[0]?.responseId,
                audit,
                audit.formDetails?.[0],
              )
            }
            className="px-3 py-2 border rounded-lg bg-emerald-50 border-emerald-200"
          >
            <Text className="text-xs font-semibold text-emerald-700">
              View Report
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const AuditCard = ({
  audit,
  timeStatus,
  canStart,
  onRequestReschedule,
  onRequestExtension,
  onViewForm,
  onViewReport,
  hasFormData,
  totalForms,
  completedForms,
  pendingForms,
  formDetails,
  isRescheduleRequested,
  isExtensionRequested,
  onOpenForum,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  
  const isExpired = timeStatus === "EXPIRED" || isAuditExpired(audit);
  const isMultiForm = totalForms > 1;
  const allFormsCompleted = completedForms === totalForms && totalForms > 0;
  const hasPendingForms = pendingForms > 0;
  const progressPercent =
    totalForms > 0 ? (completedForms / totalForms) * 100 : 0;
  const hasStartedWork = hasFormData && completedForms > 0;
  const isOverdueNoWork = isExpired && !hasStartedWork;
  const isOverduePartialWork = isExpired && hasStartedWork && hasPendingForms;
  const hasPendingReschedule = isRescheduleRequested === true;
  const hasPendingExtension = isExtensionRequested === true;
  const showRescheduleButton = isOverdueNoWork && !hasPendingReschedule;
  const showExtensionButton = isOverduePartialWork && !hasPendingExtension;
  const nextPendingForm = formDetails?.find((f: any) => !f.completed);

  const getStatusBadge = () => {
    const baseClass =
      "flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border";
    if (allFormsCompleted)
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <CheckCircle size={14} color="#047857" />
          <Text className="ml-1 text-[11px] font-semibold text-emerald-700">
            All Completed
          </Text>
        </View>
      );
    if (hasPendingReschedule)
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <Clock size={14} color="#1d4ed8" />
          <Text className="ml-1 text-[11px] font-semibold text-blue-700">
            Reschedule Pending
          </Text>
        </View>
      );
    if (hasPendingExtension)
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <Clock size={14} color="#1d4ed8" />
          <Text className="ml-1 text-[11px] font-semibold text-blue-700">
            Extension Pending
          </Text>
        </View>
      );
    if (isOverduePartialWork)
      return (
        <View className={`${baseClass} bg-amber-50 border-amber-200`}>
          <AlertCircle size={14} color="#b45309" />
          <Text className="ml-1 text-[11px] font-semibold text-amber-700">
            Overdue (In Progress)
          </Text>
        </View>
      );
    if (isOverdueNoWork)
      return (
        <View className={`${baseClass} bg-rose-50 border-rose-200`}>
          <AlertCircle size={14} color="#be123c" />
          <Text className="ml-1 text-[11px] font-semibold text-rose-700">
            Overdue (Not Started)
          </Text>
        </View>
      );
    if (hasFormData && hasPendingForms)
      return (
        <View className={`${baseClass} bg-indigo-50 border-indigo-200`}>
          <Edit size={14} color="#4338ca" />
          <Text className="ml-1 text-[11px] font-semibold text-indigo-700">
            In Progress
          </Text>
        </View>
      );
    if (audit.status === "IN_PROGRESS")
      return (
        <View className={`${baseClass} bg-amber-50 border-amber-200`}>
          <Play size={14} color="#b45309" />
          <Text className="ml-1 text-[11px] font-semibold text-amber-700">
            In Progress
          </Text>
        </View>
      );
    if (timeStatus === "UPCOMING")
      return (
        <View className={`${baseClass} bg-slate-50 border-slate-200`}>
          <Calendar size={14} color="#475569" />
          <Text className="ml-1 text-[11px] font-semibold text-slate-700">
            Upcoming
          </Text>
        </View>
      );
    if (timeStatus === "ACTIVE" && canStart)
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <Play size={14} color="#047857" />
          <Text className="ml-1 text-[11px] font-semibold text-emerald-700">
            Ready to Start
          </Text>
        </View>
      );
    return (
      <View className={`${baseClass} bg-slate-50 border-slate-200`}>
        <Calendar size={14} color="#475569" />
        <Text className="ml-1 text-[11px] font-semibold text-slate-700">
          Scheduled
        </Text>
      </View>
    );
  };

  const getCardBgColor = () => {
    if (allFormsCompleted) return "bg-white";
    if (hasPendingReschedule || hasPendingExtension) return "bg-blue-50/50";
    if (isOverduePartialWork) return "bg-amber-50/50";
    if (isOverdueNoWork) return "bg-rose-50/50";
    return "bg-white";
  };

  return (
    <View
      className={`flex-1 border shadow-sm rounded-2xl border-slate-200 ${getCardBgColor()}`}
    >
      <View className="flex-1 p-4">
        {/* ✅ ROW 1: Status badges at the TOP (full width, wrap safely) */}
        {/* ✅ HEADER: Status badges (LEFT) + Date (RIGHT) on the SAME line */}
        <View className="flex-row items-center justify-between gap-2 mb-3">
          {/* LEFT: badges — can wrap/shrink, so they never collide with the date */}
          <View
            className="flex-row flex-wrap items-center gap-2"
            style={{ flexShrink: 1 }}
          >
            {getStatusBadge()}
            {isMultiForm && (
              <View className="flex-row items-center gap-1 px-2 py-1 border rounded-lg bg-slate-100 border-slate-200">
                <Text className="text-[10px] font-semibold text-slate-700">
                  {completedForms}/{totalForms} Forms
                </Text>
              </View>
            )}
            {audit.auditNumber && (
              <View className="flex-row items-center gap-1 px-2 py-1 border rounded-lg bg-slate-50 border-slate-200">
                <Text className="text-[10px] font-mono font-semibold text-slate-600">
                  #{audit.auditNumber}
                </Text>
              </View>
            )}
          </View>

          {/* RIGHT: date chip — same line, capped at 55% so it can't overlap the badges */}
          <View
            className={`flex-row items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
              audit.originalScheduledDate
                ? "bg-emerald-50 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            }`}
            style={{ flexShrink: 0, maxWidth: "55%" }}
          >
            <Calendar
              size={12}
              color={audit.originalScheduledDate ? "#059669" : "#94a3b8"}
            />
            <Text
              className={`text-[11px] font-medium ${
                audit.originalScheduledDate
                  ? "text-emerald-700"
                  : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate
                ? `${audit.fromDate} → ${audit.toDate}`
                : audit.scheduledDate}
            </Text>
          </View>
        </View>

        {/* ✅ ROW 2: Title */}
        <Text
          className="mb-3 text-sm font-bold text-slate-800"
          numberOfLines={2}
        >
          {audit.auditType || "Audit"} - {audit.department || "General"}
        </Text>

        {/* ✅ ROW 3: ALL meta chips together — Date + Time + Auditee (wrap naturally, overlap impossible) */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {/* 🕐 Time chip */}
          <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200">
            <Clock size={12} color="#94a3b8" />
            <Text className="text-[11px] font-medium text-slate-600">
              {audit.startTime} - {audit.endTime}
            </Text>
          </View>

          {/* 👤 Auditee chip */}
          <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200">
            <UserCheck size={12} color="#94a3b8" />
            <Text className="text-[11px] font-medium text-slate-600">
              {audit.auditeeName || "TBD"}
            </Text>
          </View>
        </View>

        {/* ✅ Overdue warnings (keep as-is) */}
        {isOverdueNoWork && !hasPendingReschedule && (
          <View className="flex-row items-center gap-2 p-3 mb-3 border text-rose-700 bg-rose-50 rounded-xl border-rose-200">
            <AlertCircle size={14} color="#be123c" />
            <Text className="flex-1 text-[11px] font-medium text-rose-700">
              This audit hasn't started and is overdue! Please reschedule.
            </Text>
          </View>
        )}
        {isOverduePartialWork && !hasPendingExtension && (
          <View className="flex-row items-center gap-2 p-3 mb-3 border text-amber-700 bg-amber-50 rounded-xl border-amber-200">
            <AlertCircle size={14} color="#b45309" />
            <Text className="flex-1 text-[11px] font-medium text-amber-700">
              You've completed {completedForms} of {totalForms} forms. Request
              an extension.
            </Text>
          </View>
        )}

        {isMultiForm && (
          <View className="mb-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Progress
              </Text>
              <Text className="text-[10px] font-bold text-blue-600">
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${hasPendingReschedule || hasPendingExtension ? "bg-blue-500" : isOverduePartialWork ? "bg-amber-500" : isOverdueNoWork ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </View>
          </View>
        )}

        {isMultiForm && formDetails?.length > 0 && (
          <View className="mb-3">
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="flex-row items-center justify-between w-full px-3 py-2.5 border rounded-lg border-slate-200 bg-slate-50"
            >
              <Text className="text-[11px] font-semibold text-slate-600">
                Forms ({completedForms}/{totalForms})
              </Text>
              {expanded ? (
                <ChevronUp size={14} color="#475569" />
              ) : (
                <ChevronDown size={14} color="#475569" />
              )}
            </TouchableOpacity>
            {expanded && (
              <View className="mt-2">
                {formDetails.map((form: any, idx: number) => {
                  const isFormOverdue = isExpired && !form.completed;
                  const canFill =
                    (timeStatus === "ACTIVE" || canStart) &&
                    !hasPendingReschedule &&
                    !hasPendingExtension &&
                    !isOverdueNoWork &&
                    !isOverduePartialWork;
                  return (
                    <View
                      key={idx}
                      className={`flex-row items-center justify-between p-3 border rounded-lg mb-2 ${isFormOverdue ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <View className="flex-row items-center flex-1 gap-2">
                        <View
                          className={`w-2 h-2 rounded-full ${form.completed ? "bg-emerald-500" : isFormOverdue ? "bg-amber-500" : "bg-slate-400"}`}
                        />
                        <Text
                          className="flex-1 font-medium truncate text-slate-700"
                          numberOfLines={1}
                        >
                          {form.processName || form.name}
                        </Text>
                      </View>
                      {form.completed ? (
                        <TouchableOpacity
                          onPress={() =>
                            onViewReport(form.responseId, audit, form)
                          }
                          className="flex-row items-center gap-1 px-2.5 py-1.5 border border-blue-200 rounded-md bg-blue-50"
                        >
                          <Eye size={12} color="#1d4ed8" />
                          <Text className="text-[10px] font-semibold text-blue-700">
                            View
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() =>
                            canFill ? onViewForm(audit, form) : null
                          }
                          disabled={!canFill}
                          className={`flex-row items-center gap-1 px-2.5 py-1.5 rounded-md border ${canFill ? "bg-emerald-50 border-emerald-200" : "bg-slate-100 border-slate-200"}`}
                        >
                          <Edit
                            size={12}
                            color={canFill ? "#047857" : "#94a3b8"}
                          />
                          <Text
                            className={`text-[10px] font-semibold ${canFill ? "text-emerald-700" : "text-slate-400"}`}
                          >
                            Fill
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View className="flex-row flex-wrap justify-end gap-2 pt-3 mt-auto border-t border-slate-100">
          <TouchableOpacity
            onPress={() => onOpenForum(audit, null)}
            className="flex-row items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
          >
            <MessageCircle size={14} color="#334155" />
            <Text className="text-xs font-semibold text-slate-700">Forum</Text>
          </TouchableOpacity>

          {showRescheduleButton && (
            <TouchableOpacity
              onPress={() => onRequestReschedule(audit)}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-lg shadow-sm"
            >
              <Calendar size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">
                Reschedule
              </Text>
            </TouchableOpacity>
          )}

          {showExtensionButton && (
            <TouchableOpacity
              onPress={() => onRequestExtension(audit)}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-lg shadow-sm"
            >
              <Clock size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">Extend</Text>
            </TouchableOpacity>
          )}

          {/* ✅ View Report Button */}
          {formDetails?.[0]?.responseId &&
            allFormsCompleted && ( // ✅ Added && allFormsCompleted
              <TouchableOpacity
                onPress={() =>
                  onViewReport(formDetails[0].responseId, audit, formDetails[0])
                }
                className="flex-row items-center gap-1.5 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200"
              >
                <Eye size={14} color="#047857" />
                <Text className="text-xs font-semibold text-emerald-700">
                  View Report {/* ✅ Removed ternary, strictly "View Report" */}
                </Text>
              </TouchableOpacity>
            )}
          {/* ✅ Continue Button */}
                    {/* ✅ Continue Button - Only for multi-form audits */}
          {!hasPendingReschedule &&
            !hasPendingExtension &&
            isMultiForm && // ✅ Only show for multi-form audits
            hasFormData &&
            !allFormsCompleted &&
            !isExpired &&
            (timeStatus === "ACTIVE" || canStart) && (
              <TouchableOpacity
                onPress={() => {
                  const nextForm =
                    formDetails?.find((f: any) => !f.completed) ||
                    formDetails?.[0];
                  if (nextForm) onViewForm(audit, nextForm);
                }}
                className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200"
              >
                <Edit size={14} color="#1d4ed8" />
                <Text className="text-xs font-semibold text-blue-700">
                  Continue
                </Text>
              </TouchableOpacity>
            )}

          {/* ✅ Start Audit Button */}
          {!hasPendingReschedule &&
            !hasPendingExtension &&
            !hasFormData &&
            !isExpired &&
            (timeStatus === "ACTIVE" || canStart) && ( // ✅ ADD THIS LINE
              <TouchableOpacity
                onPress={() => {
                  const first = formDetails?.[0];
                  if (first) onViewForm(audit, first);
                }}
                className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-lg shadow-sm"
              >
                <Text className="text-xs font-semibold text-white">
                  Start Audit
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </View>
  );
};

const NcrPendingList = ({ pendingNcrAudits, onRaise, onOpenForum }: any) => {
  if (pendingNcrAudits.length === 0) {
    return (
      <View className="flex-col items-center justify-center py-16 bg-white border shadow-sm rounded-2xl border-slate-200">
        <View className="flex items-center justify-center w-16 h-16 mb-4 shadow-md rounded-2xl bg-emerald-50">
          <CheckCircle size={32} color="#059669" />
        </View>
        <Text className="text-lg font-semibold text-slate-700">
          No Pending NCRs
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          All audits are clear.
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
      {/* HEADER WITH COUNT BADGE */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={20} color="#e11d48" />
          <Text className="text-sm font-bold text-slate-800">
            Audits with NCR Findings
          </Text>
        </View>
        <View className="px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-200">
          <Text className="text-xs font-bold text-rose-700">
            {pendingNcrAudits.length} pending
          </Text>
        </View>
      </View>

      {/* ✅ FIX: Replaced FlatList with .map() to fix nested ScrollView rendering bugs */}
      <View>
        {pendingNcrAudits.map((item: any) => (
          <View
            key={String(item.responseId)}
            className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100"
          >
            <View className="flex-1 mr-3">
              <Text className="font-mono text-sm font-bold text-slate-900">
                {item.auditReportNumber}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                {item.formName} · {item.department}
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                {item.findings.slice(0, 3).map((f: any, i: number) => (
                  <View
                    key={i}
                    className={`px-2 py-1 rounded-md border ${
                      f.severity === "Major NC"
                        ? "bg-rose-50 border-rose-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${
                        f.severity === "Major NC"
                          ? "text-rose-700"
                          : "text-amber-700"
                      }`}
                    >
                      {f.severity} · {f.clause}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="flex-row gap-2">
              {onOpenForum && (
                <TouchableOpacity
                  onPress={() => onOpenForum(item)}
                  className="p-2 rounded-lg bg-purple-50"
                >
                  <MessageCircle size={18} color="#9333ea" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onRaise(item)}
                className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-600 rounded-lg shadow-sm"
              >
                <AlertCircle size={16} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">
                  Raise NCR
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const NcrListTab = ({
  raisedNCRs,
  ncrLoading,
  onViewNcr,
  onOpenForum,
}: any) => {
  if (ncrLoading)
    return (
      <View className="flex-row items-center justify-center py-16 bg-white border shadow-sm rounded-2xl border-slate-200">
        <ActivityIndicator size="small" color={NAVBAR_COLORS.primary} />
        <Text className="ml-2 text-sm text-slate-500">Loading NCRs...</Text>
      </View>
    );
  return (
    <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <View>
          <Text className="text-sm font-bold text-slate-800">
            Your Raised NCRs
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            All nonconformity reports you have created
          </Text>
        </View>
        {raisedNCRs.length > 0 && (
          <View className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <Text className="text-xs font-bold text-slate-700">
              {raisedNCRs.length} total
            </Text>
          </View>
        )}
      </View>
      {raisedNCRs.length === 0 ? (
        <View className="flex-col items-center justify-center py-16 text-center bg-white">
          <View className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-slate-100">
            <AlertCircle size={24} color="#94a3b8" />
          </View>
          <Text className="text-sm font-semibold text-slate-700">
            No NCRs raised yet
          </Text>
        </View>
      ) : (
        /* ✅ FIX: Replaced FlatList with .map() to fix nested ScrollView rendering bugs */
        <View>
          {raisedNCRs.map((item: any) => {
            const statusConfig: any = {
              AWAITING_AUDITEE: "bg-amber-50 text-amber-700 border-amber-200",
              OPEN: "bg-blue-50 text-blue-700 border-blue-200",
              APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
              IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200",
              REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
              CLOSED: "bg-slate-50 text-slate-700 border-slate-200",
            };
            const className =
              statusConfig[item.status] ||
              "bg-slate-50 text-slate-700 border-slate-200";
            return (
              <View
                key={String(item.id)}
                className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100"
              >
                <View className="flex-1">
                  <Text
                    className="font-mono text-sm font-semibold text-slate-900"
                    numberOfLines={1}
                  >
                    {item.ncrNumber || `NCR #${item.id}`}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-600">
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("en-GB")
                      : "—"}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1.5 rounded-lg border mr-3 ${className}`}
                >
                  <Text className="text-xs font-semibold">
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => onOpenForum(item)}
                    className="p-2 rounded-lg bg-slate-50"
                  >
                    <MessageCircle size={18} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onViewNcr(item.id)}
                    className="p-2 rounded-lg bg-slate-50"
                  >
                    <Eye size={18} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function AuditorDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  // ✅ FIX 1: These MUST be on separate lines
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  // ✅ FIXED: Single source of truth for tab routing (matches Audit Manager & Top Management)
  const [activeTab, setActiveTab] = useState("my-audits");
  // Add these state variables
const [forumModalVisible, setForumModalVisible] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
const [allUsers, setAllUsers] = useState<any[]>([]);

  
  // ✅ FIXED: Listen for param changes and update activeTab
  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);

      const tabMap: Record<string, string> = {
        "my-audits": "my-audits",
        "ncr-pending": "ncr-pending",
        "ncr-list": "ncr-list",
      };

      const normalizedTab = tabMap[tabValue] || "my-audits";
      setActiveTab(normalizedTab);
    } else {
      setActiveTab("my-audits"); // Default fallback
    }
  }, [params?.tab]);

  const [activeReportConfig, setActiveReportConfig] = useState<any>(null);
  const [activeFormConfig, setActiveFormConfig] = useState<any>(null);
    const [availableYears, setAvailableYears] = useState<number[]>([]);


  // ✅ 1. Add new state for viewing NCR details
  const [activeNcrViewConfig, setActiveNcrViewConfig] = useState<any>(null);
  // ✅ FIX 2: These MUST be on separate lines
  const [isFetching, setIsFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeNcrConfig, setActiveNcrConfig] = useState<any>(null);
  const [stats, setStats] = useState({
    upcoming: 0,
    active: 0,
    expired: 0,
    inProgress: 0,
    completed: 0,
    partiallyCompleted: 0,
    overdueNoWork: 0,
    overduePartialWork: 0,
  });

  const [pendingNcrAudits, setPendingNcrAudits] = useState<any[]>([]);
  const [raisedNCRs, setRaisedNCRs] = useState<any[]>([]);
  const [ncrLoading, setNcrLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
const [selected8DNCR, setSelected8DNCR] = useState<any>(null);
const [eightDTeamMembers, setEightDTeamMembers] = useState<string[]>([]);
const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  // ✅ ADD THIS: Calculate NCR Stats dynamically
  const ncrStats = useMemo(
    () => ({
      total: raisedNCRs.length,
      awaiting: raisedNCRs.filter((n: any) => n.status === "AWAITING_AUDITEE")
        .length,
      pending: raisedNCRs.filter((n: any) => n.status === "OPEN").length,
      inProgress: raisedNCRs.filter((n: any) => n.status === "IN_PROGRESS")
        .length,
      closed: raisedNCRs.filter((n: any) => n.status === "CLOSED").length,
      rejected: raisedNCRs.filter((n: any) => n.status === "REJECTED").length,
    }),
    [raisedNCRs],
  );

  // ... (keep the rest of your code exactly as it is below this point)
  useEffect(() => {
    const loadYear = async () => {
      try {
        const savedYear = await AsyncStorage.getItem("auditorSelectedYear");
        if (savedYear) setSelectedYear(parseInt(savedYear, 10));
      } catch (e) {}
    };
    loadYear();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("auditorSelectedYear", selectedYear.toString());
  }, [selectedYear]);

    const fetchRaisedNCRs = async (year = selectedYear) => {
    if (!user?.id) return;
    try {
      setNcrLoading(true);

      const allNcrs = await apiFetch("/ncr/all").catch(() => []);

      // Filter only the NCRs raised by the currently logged-in Auditor
      const myRaisedNcrs = (Array.isArray(allNcrs) ? allNcrs : []).filter(
        (ncr: any) => String(ncr.auditorId) === String(user?.id),
      );

      // Filter by the selected Year
      const filteredNCRs = myRaisedNcrs.filter((ncr: any) => {
        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        const ncrYear = ncrDate
          ? new Date(ncrDate).getFullYear()
          : new Date().getFullYear();
        return ncrYear === year;
      });

      console.log(
        "✅ [NCR DEBUG] Final filtered raised NCRs count:",
        filteredNCRs.length,
      );
      setRaisedNCRs(filteredNCRs);
    } catch (error) {
      console.error("❌ [NCR DEBUG] Error fetching raised NCRs:", error);
      addToast("Failed to load NCR list", "error");
      setRaisedNCRs([]);
    } finally {
      setNcrLoading(false);
    }
  };

   // ============================================================
  // ✅ CRITICAL FIX: Timezone-safe date helpers
  // ============================================================

  
  const toDateString = (date: any) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  };

  // ✅ RECALCULATE TIME STATUS ON FRONTEND (Fixes timezone issues)
// ✅ RECALCULATE TIME STATUS - FIXES DATE RANGE (BULK SCHEDULES) + TIME
const recalculateTimeStatus = (schedule: any): string => {
  if (!schedule) return "UPCOMING";
  
  // If completed, return completed
  if (schedule.allFormsCompleted || 
      schedule.status === "COMPLETED" || 
      schedule.status === "APPROVED" ||
      schedule.status === "CLOSED") {
    return "COMPLETED";
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse all possible date fields
  const hasFromDate = !!schedule.fromDate;
  const hasToDate = !!schedule.toDate;
  const hasScheduledDate = !!schedule.scheduledDate;
  
  const fromDate = hasFromDate ? parseServerDate(schedule.fromDate) : null;
  const toDate = hasToDate ? parseServerDate(schedule.toDate) : null;
  const scheduledDate = hasScheduledDate ? parseServerDate(schedule.scheduledDate) : null;

  // Normalize dates for comparison (strip time)
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(0, 0, 0, 0);
  if (scheduledDate) scheduledDate.setHours(0, 0, 0, 0);

  // ✅ Detect if this is a DATE RANGE (bulk schedule: fromDate + toDate, different dates)
  const isDateRange = hasFromDate && hasToDate && 
                      fromDate && toDate && 
                      fromDate.getTime() !== toDate.getTime();

  // ============ DATE RANGE LOGIC (Bulk Schedules) ============
  if (isDateRange && fromDate && toDate) {
    // ✅ BEFORE the range starts → UPCOMING
    if (today.getTime() < fromDate.getTime()) {
      return "UPCOMING";
    }
    
    // ✅ AFTER the range ends → EXPIRED
    if (today.getTime() > toDate.getTime()) {
      return "EXPIRED";
    }
    
    // ✅ WITHIN the range (today is between fromDate and toDate)
    
    // On the FIRST day of range → check start time
    if (today.getTime() === fromDate.getTime() && schedule.startTime) {
      const startMinutes = parseTimeToMinutesRobust(schedule.startTime);
      if (nowMinutes < startMinutes) return "UPCOMING";
    }
    
    // On the LAST day of range → check end time
    if (today.getTime() === toDate.getTime() && schedule.endTime) {
      const endMinutes = parseTimeToMinutesRobust(schedule.endTime);
      if (nowMinutes > endMinutes) return "EXPIRED";
    }
    
    // Middle days OR within valid times on first/last day → ACTIVE
    return "ACTIVE";
  }

  // ============ SINGLE DATE LOGIC ============
  const singleDate = scheduledDate || fromDate;
  if (!singleDate) return "UPCOMING";

  const daysDiff = Math.floor((singleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // ✅ Future date → UPCOMING
  if (daysDiff > 0) return "UPCOMING";
  
  // ✅ Past date → EXPIRED
  if (daysDiff < 0) return "EXPIRED";

  // ✅ Same day → check time window
  if (!schedule.startTime || !schedule.endTime) return "ACTIVE";

  const startTimeMinutes = parseTimeToMinutesRobust(schedule.startTime);
  const endTimeMinutes = parseTimeToMinutesRobust(schedule.endTime);

  if (nowMinutes < startTimeMinutes) return "UPCOMING";
  if (nowMinutes > endTimeMinutes) return "EXPIRED";
  return "ACTIVE";
};

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // ✅ ADD THIS HELPER FUNCTION ABOVE fetchSchedulesWithStatus
  const fetchAvailableFormsForDepartment = async (
    department: string,
    auditType: string,
  ) => {
    if (!department) return [];
    const deptUpper = department.toUpperCase().trim();

    // Only fetch multiple forms for IATF/System audits (Adjust if 5S/Process also have multiple forms)
    const isIATF =
      auditType.toLowerCase().includes("iatf") ||
      auditType.toLowerCase().includes("16949") ||
      auditType.toLowerCase().includes("system");
    if (!isIATF) return [];

    try {
      let endpoint = "";
      if (deptUpper === "SQA") {
        endpoint = `/templates/iatf/by-department/SQA`;
      } else {
        const isQualityDept =
          deptUpper.includes("QA") || deptUpper.includes("QC");
        if (!isQualityDept) {
          endpoint = `/templates/iatf/by-department/${encodeURIComponent(department)}`;
        } else {
          endpoint = `/templates/type/IATF_16949`;
        }
      }

      const forms = await apiFetch(endpoint);
      if (deptUpper.includes("QA") || deptUpper.includes("QC")) {
        return (forms || []).filter((f: any) => f.department === "QA");
      }
      return forms || [];
    } catch (error) {
      console.error("❌ Error fetching forms for department:", error);
      return [];
    }
  };

  // ============================================================
  // ✅ FIXED: Full fetchSchedulesWithStatus
  // ============================================================
const fetchSchedulesWithStatus = async (year = selectedYear) => {
  try {
    setIsFetching(true);
    setRefreshing(true);
    const [
      responsesData,
      ncrData,
      rescheduleData,
      extensionData,
      schedulesData,
    ] = await Promise.all([
      apiFetch("/templates/responses/all").catch(() => []),
      apiFetch("/ncr/all").catch(() => []),
      apiFetch(
        `/audit-schedule/reschedule-requests/auditor/${user?.id}`,
      ).catch(() => []),
      apiFetch(
        `/audit-schedule/extension-requests/auditor/${user?.id}`,
      ).catch(() => []),
      apiFetch(
        `/audit-schedule/auditor/${user?.id}/schedules-with-status`,
      ).catch(() => []),
    ]);

    const pendingRescheduleIds = new Set();
    (rescheduleData || []).forEach((req: any) => {
      if (req.status === "PENDING") pendingRescheduleIds.add(req.scheduleId);
    });
    const pendingExtensionIds = new Set();
    (extensionData || []).forEach((req: any) => {
      if (req.status === "PENDING") pendingExtensionIds.add(req.scheduleId);
    });

    const allResponses: any[] = responsesData || [];
    const existingNcrAuditIds = new Set(
      (ncrData || []).map((n: any) => Number(n.auditId)).filter(Boolean),
    );

    const pendingNcrItems = allResponses
      .filter((r: any) => {
        const isMyAudit = Number(r.auditorId) === Number(user?.id);
        if (!isMyAudit) {
          console.log(
            `⚠️ [NCR DEBUG] Skipped response ${r.id}: auditorId (${r.auditorId}) !== userId (${user?.id})`,
          );
        }
        return isMyAudit;
      })
      .map((r: any) => {
        const answers = parseResponseAnswers(r);
        return {
          responseId: r.id,
          auditReportNumber: getAuditReportNumber(answers, r),
          formName: answers.formName || r.checkSheet?.name || "Audit Form",
          department: r.department || answers.department || "Production",
          auditeeId: r.auditeeId || answers.auditeeId || "",
          auditeeName: r.auditeeName || answers.auditeeName || "",
          shift: r.shift || answers.shift || "Day",
          findings: getNcrFindingEntries(answers),
          createdAt: r.createdAt,
        };
      })
      .filter((item: any) => {
        const itemYear = item.createdAt
          ? new Date(item.createdAt).getFullYear()
          : new Date().getFullYear();
        const hasFindings = item.findings.length > 0;
        const notRaised = !existingNcrAuditIds.has(Number(item.responseId));
        const isCurrentYear = itemYear === year;

        return hasFindings && notRaised && isCurrentYear;
      });

    setPendingNcrAudits(pendingNcrItems);

    let filteredSchedules = schedulesData || [];
    if (year) {
      filteredSchedules = filteredSchedules.filter((item: any) => {
        const schedule = item.schedule || item;
        if (!schedule) return false;

        if (schedule.scheduledDate) {
          return (
            parseServerDate(schedule.scheduledDate).getFullYear() === year
          );
        }
        if (schedule.fromDate && schedule.toDate) {
          const fromYear = parseServerDate(schedule.fromDate).getFullYear();
          const toYear = parseServerDate(schedule.toDate).getFullYear();
          if (fromYear <= year && toYear >= year) return true;
        }
        return false;
      });
    }
    const todayStr = toDateString(new Date()) || '';

    const enhancedData = await Promise.all(filteredSchedules.map(async (item: any) => {
      const schedule = item.schedule || item;
      const scheduleId = schedule.id;
      const department = schedule.department || "";
      const auditType = schedule.auditType || "";

      // 1. Find all saved responses for this specific schedule
      const scheduleResponses = allResponses.filter(
        (r: any) => Number(r.auditScheduleId) === Number(scheduleId),
      );

      // Create a map for quick lookup: checkSheetId -> response
      const responseMap = new Map();
      scheduleResponses.forEach((r: any) => {
        if (r.checkSheet?.id) {
          responseMap.set(String(r.checkSheet.id), r);
        }
      });

      // 2. Determine the list of ALL assigned forms
            // 2. Determine the list of ALL assigned forms
      let formDetails: any[] = [];
      
      const assignedForms = schedule.forms || schedule.checkSheets || schedule.assignedForms;
      
      if (Array.isArray(assignedForms) && assignedForms.length > 0) {
        formDetails = assignedForms.map((form: any) => {
          const existingResponse = responseMap.get(String(form.id));
          return {
            id: form.id,
            name: form.name || form.processName || "Audit Form",
            processName: form.processName || form.name || "Audit",
            completed: !!existingResponse && (
              existingResponse.status === "COMPLETED" ||
              existingResponse.status === "APPROVED" ||
              existingResponse.status === "SUBMITTED" ||
              existingResponse.submittedAt !== null
            ),
            responseId: existingResponse?.id,
            status: existingResponse?.status,
          };
        });
      } else {
        const availableForms = await fetchAvailableFormsForDepartment(department, auditType);
        
        if (availableForms.length > 0) {
          formDetails = availableForms.map((form: any) => {
            const existingResponse = responseMap.get(String(form.id));
            return {
              id: form.id,
              name: form.name || form.processName || "Audit Form",
              processName: form.processName || form.name || "Audit",
              completed: !!existingResponse && (
                existingResponse.status === "COMPLETED" ||
                existingResponse.status === "APPROVED" ||
                existingResponse.status === "SUBMITTED" ||
                existingResponse.submittedAt !== null
              ),
              responseId: existingResponse?.id,
              status: existingResponse?.status,
            };
          });
        } else {
          // ✅ FIX: For single-form audits, only use the latest response
          if (scheduleResponses.length > 0) {
            // Sort by createdAt to get the most recent response
            const sortedResponses = [...scheduleResponses].sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA; // Descending order (newest first)
            });
            
            // Only take the first (most recent) response for single-form audits
            const latestResponse = sortedResponses[0];
            formDetails = [{
              id: latestResponse.checkSheet?.id || 1,
              name: latestResponse.checkSheet?.name || auditType || "Audit Form",
              processName: latestResponse.checkSheet?.processName || auditType || "Audit",
              completed:
                latestResponse.status === "COMPLETED" ||
                latestResponse.status === "APPROVED" ||
                latestResponse.status === "SUBMITTED" ||
                latestResponse.submittedAt !== null,
              responseId: latestResponse.id,
              status: latestResponse.status,
            }];
          } else {
            formDetails = [
              {
                id: schedule.checkSheet?.id || 1,
                name: auditType || "Audit Form",
                processName: auditType || "Audit",
                completed: schedule.status === "COMPLETED" || schedule.status === "APPROVED",
              },
            ];
          }
        }
      }

      // 3. Calculate accurate stats based on ALL forms
      const totalForms = formDetails.length;
      const completedForms = formDetails.filter((f: any) => f.completed).length;
      const hasFormData = completedForms > 0;
      const isAllFormsCompleted = totalForms > 0 && completedForms === totalForms;

      const isAuditCompleted =
        schedule.status === "COMPLETED" ||
        schedule.status === "APPROVED" ||
        schedule.status === "CLOSED";

      const allFormsCompleted = isAllFormsCompleted || isAuditCompleted;
      
      // ✅ CRITICAL FIX: Override backend's timeStatus with frontend calculation
      const finalTimeStatus = allFormsCompleted ? "COMPLETED" : recalculateTimeStatus(schedule);
      const finalCanStart = !allFormsCompleted && (finalTimeStatus === "ACTIVE");

      return {
        ...item,
        schedule: {
          ...schedule,
          hasFormData,
          totalForms,
          completedForms: allFormsCompleted ? totalForms : completedForms,
          pendingForms: allFormsCompleted ? 0 : totalForms - completedForms,
          allFormsCompleted,
          formDetails,
          rescheduleRequested: pendingRescheduleIds.has(scheduleId),
          extensionRequested: pendingExtensionIds.has(scheduleId),
          coAuditorNames: schedule.coAuditorNames || [],
        },
        timeStatus: finalTimeStatus,
        canStart: finalCanStart,
      };
    }));

    setSchedules(enhancedData);

    // ✅ Debug log to verify time status calculation
    console.log("✅ [TIME STATUS DEBUG] Current time:", new Date().toLocaleTimeString());
    console.log("✅ [TIME STATUS DEBUG] Schedules:", enhancedData.map(s => ({
      auditType: s.schedule.auditType,
      scheduledDate: s.schedule.scheduledDate,
      startTime: s.schedule.startTime,
      endTime: s.schedule.endTime,
      timeStatus: s.timeStatus,
    })));

    setStats({
      upcoming: enhancedData.filter((s: any) => s.timeStatus === "UPCOMING").length,
      active: enhancedData.filter((s: any) => s.timeStatus === "ACTIVE").length,
      inProgress: enhancedData.filter(
        (s: any) => s.schedule.hasFormData && !s.schedule.allFormsCompleted,
      ).length,
      expired: enhancedData.filter((s: any) => s.timeStatus === "EXPIRED").length,
      partiallyCompleted: 0,
      completed: enhancedData.filter((s: any) => s.schedule.allFormsCompleted).length,
      overdueNoWork: 0,
      overduePartialWork: 0,
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR in fetchSchedulesWithStatus:", error);
    addToast("Failed to load schedules", "error");
  } finally {
    setIsFetching(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    if (user?.id) {
      fetchSchedulesWithStatus(selectedYear);
      fetchRaisedNCRs(selectedYear);
    }
  }, [user?.id, selectedYear]);

   useEffect(() => {
    if (activeTab === "ncr-list" && user?.id) {
      fetchRaisedNCRs(selectedYear);
    }
  }, [activeTab, selectedYear, user?.id]);

  // Fetch all users for forum member selection
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const users = await apiFetch("/users");
      setAllUsers(users || []);
    } catch (error) {
      console.error("Failed to fetch users for forum:", error);
    }
  };
  fetchUsers();
}, []);

useEffect(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 5;
    const allYears: number[] = [];

    // Add default range
    for (let i = startYear; i <= endYear; i++) allYears.push(i);

    // Add years found in actual schedule data
    if (schedules.length > 0) {
      schedules.forEach((item) => {
        const schedule = item.schedule;
        if (schedule?.scheduledDate) {
          const year = new Date(schedule.scheduledDate).getFullYear();
          if (!allYears.includes(year) && year >= 2020) allYears.push(year);
        }
        if (schedule?.fromDate) {
          const year = new Date(schedule.fromDate).getFullYear();
          if (!allYears.includes(year) && year >= 2020) allYears.push(year);
        }
        if (schedule?.toDate) {
          const year = new Date(schedule.toDate).getFullYear();
          if (!allYears.includes(year) && year >= 2020) allYears.push(year);
        }
      });
    }

    // Sort descending (newest first) and update state
    setAvailableYears(allYears.sort((a, b) => b - a));
  }, [schedules]);

   const handleRefresh = () => {
    setRefreshing(true);
    fetchSchedulesWithStatus(selectedYear);
    fetchRaisedNCRs(selectedYear);
    addToast("Dashboard refreshed", "success");
    // Add a small timeout to stop the spinner visually if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleViewForm = (audit: any, form: any) => {
  setActiveFormConfig({
    scheduleId: audit.id,
    department: audit.department,
    auditeeId: audit.auditeeId,
    auditeeName: audit.auditeeName,
    location: audit.location,
    auditType: audit.auditType,
    formId: form?.id,
    processName: form?.processName || form?.name,
    // Pass these for forum
    auditorId: user?.id,
    auditorName: user?.name,
    hodEmail: audit.hodEmail,
    hodName: audit.hodName,
    memberEmails: audit.memberEmails || [],
  });
};

  const handleViewReport = (responseId: any, audit: any, form: any) => {
    console.log("🔍 [DEBUG] handleViewReport called with:", {
      responseId,
      auditType: audit?.auditType,
    });

    if (!responseId) {
      console.warn("⚠️ [DEBUG] responseId is missing!");
      addToast("Report not found (No response ID)", "error");
      return;
    }

    // ✅ Set state to render the report inline
    setActiveReportConfig({
      id: String(responseId),
      audit,
      form,
    });
  };

  const handleRequestReschedule = async (
    scheduleId: any,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason: string,
  ) => {
    try {
      await apiFetch(
        `/audit-schedule/schedule/${scheduleId}/request-reschedule?userId=${user?.id}`,
        {
          method: "POST",
          body: JSON.stringify({ newDate, newStartTime, newEndTime, reason }),
        },
      );
      addToast("Reschedule request submitted!", "success");
      await fetchSchedulesWithStatus();
    } catch (error: any) {
      addToast(error.message || "Failed to submit request", "error");
      throw error;
    }
  };

  const handleRequestExtension = async (
    scheduleId: any,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    reason: string,
    form: any = null,
  ) => {
    try {
      const payload: any = { newDate, newStartTime, newEndTime, reason };
      if (form) {
        payload.formId = form.id;
        payload.formName = form.name;
      }
      await apiFetch(
        `/audit-schedule/schedule/${scheduleId}/request-extension?userId=${user?.id}`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      addToast(
        `Extension request submitted${form ? ` for ${form.name}` : ""}!`,
        "success",
      );
      await fetchSchedulesWithStatus();
    } catch (error: any) {
      addToast(error.message || "Failed to submit request", "error");
      throw error;
    }
  };

    // Add this function in both dashboards
// Add this function in AuditorDashboard (already added, but ensure it's complete)
const handleOpenForum = (audit: any, form: any = null) => {
  console.log("🔍 Opening forum for audit:", audit);
  
  // Check if it's an NCR item (has id and ncrNumber or isNcr flag)
  const isNcrItem = audit?.ncrNumber || audit?.isNcr || audit?.status?.includes('NCR');
  
  if (!audit) {
    addToast("No data available for forum", "error");
    return;
  }
  
  setSelectedAuditForForum(audit);
  setForumModalVisible(true);
};

// Add this function after handleOpenForum
const open8DForum = async (ncr: any) => {
  console.log('🔍 [8D FORUM] Opening 8D forum for NCR:', ncr);
  
  if (!ncr) {
    addToast("No NCR data available for 8D forum", "error");
    return;
  }

  setSelected8DNCR(ncr);
  setEightDTeamMembers([]);
  setShow8DForumDrawer(true);
  setLoadingTeamMembers(true);

  try {
    const eightDEventId = `8D-${ncr.ncrNumber}`;
    const membersSet = new Set<string>();

    // Fetch existing 8D team members
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/eightd/data/${eightDEventId}`,
        { credentials: "include" }
      );
      
      if (response.ok) {
        const responseData = await response.json();
        if (responseData?.success && responseData.data) {
          const d0Data = responseData.data.content?.d0?.[0] || {};
          const emails = Array.isArray(d0Data.additionalEmails)
            ? d0Data.additionalEmails
            : [];
          emails.forEach((email: string) => membersSet.add(email));
        }
      }
    } catch (err) {
      console.log('Could not fetch existing 8D members:', err);
    }

    // Add current user
    if (user?.email) membersSet.add(user.email);

    // Add Audit Manager
    const auditManager = allUsers.find(
      (u: any) => u.role === "AUDIT_MANAGER" || u.role === "MASTER"
    );
    if (auditManager?.email) membersSet.add(auditManager.email);

    // Add HOD
    if (ncr.hodEmail) membersSet.add(ncr.hodEmail);

    // Add Auditor
    if (ncr.auditorEmail) membersSet.add(ncr.auditorEmail);
    if (ncr.auditorName?.includes('@')) {
      membersSet.add(ncr.auditorName);
    }

    // Add Auditee
    if (ncr.auditeeEmail) membersSet.add(ncr.auditeeEmail);
    if (ncr.auditeeName?.includes('@')) {
      membersSet.add(ncr.auditeeName);
    }

    // Add 8D Team members
    const eightDTeam = allUsers.filter(
      (u: any) => 
        u.role === "8D_TEAM" || 
        u.role === "EIGHT_D_TEAM" ||
        u.role === "INITIATOR"
    );
    eightDTeam.forEach((member: any) => {
      if (member.email) membersSet.add(member.email);
    });

    const finalMembers = [...membersSet];
    console.log('✅ [8D FORUM] Members:', finalMembers);
    setEightDTeamMembers(finalMembers);

  } catch (error) {
    console.error('❌ Failed to fetch 8D team members:', error);
    // Fallback: Add essential members
    const fallbackMembers = [
      user?.email,
      ncr.hodEmail,
      ncr.auditorEmail,
      ncr.auditeeEmail,
      allUsers.find((u: any) => u.role === "AUDIT_MANAGER")?.email,
    ].filter(Boolean);
    setEightDTeamMembers([...new Set(fallbackMembers)]);
  } finally {
    setLoadingTeamMembers(false);
  }
};
  

  const renderActiveReport = () => {
    if (!activeReportConfig) return null;

    const audit = activeReportConfig.audit || {};
    const form = activeReportConfig.form || {};

    // 🔍 DEBUG: Log the exact objects to see what data we actually have
    console.log("🔍 [DEBUG] renderActiveReport - audit object:", audit);
    console.log("🔍 [DEBUG] renderActiveReport - form object:", form);

    // ✅ Combine ALL possible fields that might contain the audit type
    const typeString = `
      ${audit.auditType || ""} 
      ${audit.auditName || ""} 
      ${audit.processName || ""} 
      ${audit.checkSheetName || ""}
      ${form.processName || ""} 
      ${form.name || ""}
    `.toLowerCase();

    console.log("🔍 [DEBUG] Evaluating combined typeString:", typeString);

    // ✅ 1. IATF / System / Internal Audit Report
    if (
      typeString.includes("iatf") ||
      typeString.includes("system") ||
      typeString.includes("internal") ||
      typeString.includes("16949") ||
      typeString.includes("qms") ||
      typeString.includes("ems") ||
      typeString.includes("vda") ||
      typeString.includes("iso")
    ) {
      console.log("✅ Matched IATF / System / Internal Audit");
      return (
        <IATFInternalView
          initialId={activeReportConfig.id}
          onClose={() => {
            setActiveReportConfig(null);
            handleRefresh();
          }}
        />
      );
    }

    // ✅ 2. Process / Manufacturing Audit Report
    if (
      typeString.includes("process") ||
      typeString.includes("manufacturing")
    ) {
      console.log("✅ Matched Process / Manufacturing Audit");
      return (
        <ManufacturingProcessView
          initialId={activeReportConfig.id}
          onClose={() => {
            setActiveReportConfig(null);
            handleRefresh();
          }}
        />
      );
    }

    // ✅ 3. 5S Audit Report (Default Fallback)
    console.log(
      "⚠️ No specific match found, defaulting to FiveSView. typeString was:",
      typeString,
    );
    return (
      <FiveSView
        initialId={activeReportConfig.id}
        onClose={() => {
          setActiveReportConfig(null);
          handleRefresh();
        }}
      />
    );
  };
  // ✅ ADD THIS NEW FUNCTION RIGHT HERE
  const renderActiveForm = () => {
    if (!activeFormConfig) return null;

    // Common props shared by all audit forms
    const commonProps = {
      ...activeFormConfig,
      onClose: () => {
        setActiveFormConfig(null);
        handleRefresh();
      },
      onUpdateEditId: (newEditId: string) => {
        setActiveFormConfig((prev: any) => ({ ...prev, editId: newEditId }));
      },
    };

    const type = (activeFormConfig.auditType || "").toLowerCase();

    // ✅ 1. 5S Audit
    if (
      type.includes("5s") ||
      type.includes("five_s") ||
      type.includes("five s")
    ) {
      return <FiveSAuditForm {...commonProps} />;
    }

    // ✅ 2. IATF / System / Internal Audit
    if (
      type.includes("iatf") ||
      type.includes("system") ||
      type.includes("internal") ||
      type.includes("16949")
    ) {
      return <IATFInternalAuditForm {...commonProps} />;
    }

    // // ✅ 3. Process / Manufacturing Audit
    if (type.includes("process") || type.includes("manufacturing")) {
      return <ManufacturingProcessAuditForm {...commonProps} />;
    }

    // ✅ Fallback (defaults to 5S if type is unrecognized)
    return <FiveSAuditForm {...commonProps} />;
  };

  // ✅ ADD THIS NEW FUNCTION
  const renderActiveNcrForm = () => {
    if (!activeNcrConfig) return null;

    return (
      <Form7View
        initialParams={activeNcrConfig}
        onClose={() => {
          setActiveNcrConfig(null); // Closes the form
          handleRefresh(); // Refreshes dashboard to update NCR stats/lists
        }}
      />
    );
  };

  const renderActiveNcrView = () => {
    if (!activeNcrViewConfig) return null;
    return (
      // ✅ USE YOUR NEW COMMON MANAGER HERE
      <NCRViewManager
        initialId={activeNcrViewConfig.id}
        initialType={activeNcrViewConfig.type || "form7"}
        onClose={() => {
          setActiveNcrViewConfig(null); // Closes the view and goes back to dashboard
          handleRefresh(); // Refreshes data when returning
        }}
      />
    );
  };

  if (authLoading || isFetching) {
    return (
      <View
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <ActivityIndicator
          size="large"
          color={NAVBAR_COLORS.primary}
          style={{ marginBottom: 16 }}
        />
        <Text className="text-sm font-medium text-slate-500">
          {authLoading ? "Authenticating..." : "Loading dashboard..."}
        </Text>
      </View>
    );
  }

  const filteredAudits = schedules.filter(
    (item: any) =>
      !searchQuery ||
      item.schedule?.auditType
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.schedule?.department
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // ✅ NEW: how many columns the grid currently shows (must match the flex layout)
  // 3 cols need: 3×300 (minWidth) + 2×16 (gap-4) = 932px | 2 cols need: 616px
  const containerWidth = Math.min(width - 32, 1200);
  const cols = containerWidth >= 932 ? 3 : containerWidth >= 616 ? 2 : 1;

  // ✅ NEW: how many invisible placeholders are needed to complete the last row
  const remainder = filteredAudits.length % cols;
  const placeholders = remainder === 0 ? 0 : cols - remainder;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}
    >
      {/* ✅ UPDATE THIS: Add activeNcrConfig check at the very top */}
      {activeNcrViewConfig ? (
        renderActiveNcrView()
      ) : activeNcrConfig ? (
        renderActiveNcrForm()
      ) : activeReportConfig ? (
        renderActiveReport()
      ) : activeFormConfig ? (
        renderActiveForm()
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 100,
            flexGrow: 1,
            paddingHorizontal: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              maxWidth: 1200,
              alignSelf: "center",
              width: "100%",
              paddingTop: 16,
            }}
          >
            {/* Header */}
             {/* Header */}
            {/* Replace the existing Header section (around line 850-880) with this: */}
            <View className="flex-row flex-wrap items-start justify-between gap-4 mb-6">
              <View className="flex-1 min-w-[200px]">
                <Text className="text-2xl font-bold text-slate-800">
                  Auditor Dashboard
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Welcome back,{" "}
                  <Text className="font-semibold text-slate-700">
                    {user?.name
                      ? user.name
                      : `${user?.namePrefix || ""} ${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                        user?.username ||
                        user?.email ||
                        "Auditor"}
                  </Text>
                </Text>
              </View>

              {/* Wrap buttons in a responsive container */}
              <View className="flex-row flex-wrap items-center gap-3">
                {/* Year Filter - make it more compact on mobile */}
                <View className="flex-shrink-0">
                  <YearFilter
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    availableYears={availableYears}
                  />
                </View>

                {/* Refresh Button - smaller on mobile */}
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={refreshing}
                  className={`flex-row items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl ${refreshing ? "opacity-60" : ""}`}
                >
                  {refreshing ? (
                    <ActivityIndicator
                      size="small"
                      color={NAVBAR_COLORS.primary}
                    />
                  ) : (
                    <RefreshCw size={16} color="#475569" />
                  )}
                  {/* <Text className="text-xs font-semibold md:text-sm text-slate-700">
                    {isMobile ? "" : "Refresh"}
                    {isMobile && (
                      <RefreshCw size={16} color="#475569" className="ml-1" />
                    )}
                  </Text> */}
                </TouchableOpacity>
              </View>
            </View>

            {activeTab === "my-audits" && (
              <View className="mb-6">
                <View className="flex-row items-center gap-2 mb-4">
                  <View
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: NAVBAR_COLORS.bg }}
                  >
                    <FileText size={16} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text className="text-sm font-semibold text-slate-700">
                    Audit Overview
                  </Text>
                </View>
                <StatCardsContainer stats={stats} isNcr={false} />
              </View>
            )}
            {/* Search & View Mode Toggle */}
            {activeTab === "my-audits" && (
              <View className="flex-row flex-wrap items-center justify-between gap-3 mb-6">
                <View className="relative flex-1">
                  <View className="absolute left-3 top-3.5">
                    <Search size={18} color="#94a3b8" />
                  </View>
                  <TextInput
                    placeholder="Search audits..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="w-full py-3 pl-10 pr-4 text-sm bg-white border shadow-sm border-slate-200 rounded-xl"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-row gap-1 p-1 bg-white border shadow-sm border-slate-200 rounded-xl">
                  <TouchableOpacity
                    onPress={() => setViewMode("grid")}
                    className={`p-2.5 rounded-lg ${viewMode === "grid" ? "bg-blue-600" : "bg-white"}`}
                  >
                    <Grid3x3
                      size={18}
                      color={viewMode === "grid" ? "#ffffff" : "#94a3b8"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setViewMode("list")}
                    className={`p-2.5 rounded-lg ${viewMode === "list" ? "bg-blue-600" : "bg-white"}`}
                  >
                    <List
                      size={18}
                      color={viewMode === "list" ? "#ffffff" : "#94a3b8"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Content: Grid vs List View */}
            {activeTab === "my-audits" &&
              (filteredAudits.length === 0 ? (
                <View className="items-center py-16 text-center bg-white border shadow-sm rounded-2xl border-slate-200">
                  <View className="flex items-center justify-center w-16 h-16 mb-4 shadow-md rounded-2xl bg-blue-50">
                    <Calendar size={32} color="#2563eb" />
                  </View>
                  <Text className="text-lg font-semibold text-slate-700">
                    No audits found
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    No audits are currently assigned to you
                  </Text>
                </View>
              ) : viewMode === "grid" ? (
                <View className="flex-row flex-wrap gap-4">
                  {filteredAudits.map((item: any, index: number) => (
                    <View
                      key={item.schedule?.id || index}
                      style={
                        isMobile
                          ? { width: "100%" }
                          : { flexGrow: 1, flexBasis: "31%", minWidth: 300 }
                      }
                    >
                      <AuditCard
                        audit={item.schedule}
                        timeStatus={item.timeStatus}
                        canStart={item.canStart}
                        hasFormData={item.schedule.hasFormData}
                        totalForms={item.schedule.totalForms || 1}
                        completedForms={item.schedule.completedForms || 0}
                        pendingForms={item.schedule.pendingForms || 0}
                        formDetails={item.schedule.formDetails || []}
                        isRescheduleRequested={
                          item.schedule.rescheduleRequested
                        }
                        isExtensionRequested={item.schedule.extensionRequested}
                        onRequestReschedule={(audit: any) => {
                          setSelectedAudit(audit);
                          setSelectedForm(null);
                          setShowRescheduleModal(true);
                        }}
                        onRequestExtension={(audit: any, form: any) => {
                          setSelectedAudit(audit);
                          setSelectedForm(form);
                          setShowExtensionModal(true);
                        }}
                        onViewForm={handleViewForm}
                        onViewReport={handleViewReport}
                        onOpenForum={handleOpenForum}  // ✅ Change this
                      />
                    </View>
                  ))}
                  {/* ✅ NEW: invisible fillers so the last card doesn't stretch */}
                  {Array.from({ length: placeholders }).map((_, i) => (
                    <View
                      key={`placeholder-${i}`}
                      style={{
                        flexGrow: 1,
                        flexBasis: "31%",
                        minWidth: 300,
                        height: 0,
                      }}
                      pointerEvents="none"
                    />
                  ))}
                </View>
              ) : (
                <View className="gap-3">
                  {filteredAudits.map((item: any, index: number) => (
                    <AuditListItem
                      key={item.schedule?.id || index}
                      item={item}
                      handleViewForm={handleViewForm}
                      handleViewReport={handleViewReport}
                      onRequestReschedule={(audit: any) => {
                        setSelectedAudit(audit);
                        setSelectedForm(null);
                        setShowRescheduleModal(true);
                      }}
                      onRequestExtension={(audit: any, form: any) => {
                        setSelectedAudit(audit);
                        setSelectedForm(form);
                        setShowExtensionModal(true);
                      }}
                      onOpenForum={() => addToast("Forum opened", "success")}
                    />
                  ))}
                </View>
              ))}

            {(activeTab === "ncr-pending" || activeTab === "ncr-list") && (
              <View className="mb-6">
                <View className="flex-row items-center gap-2 mb-4">
                  <View
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: NAVBAR_COLORS.bg }}
                  >
                    <AlertCircle size={16} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text className="text-sm font-semibold text-slate-700">
                    NCR Overview
                  </Text>
                </View>
                <StatCardsContainer stats={ncrStats} isNcr={true} />
              </View>
            )}
            {/* NCR Tabs */}
            {activeTab === "ncr-pending" && (
  <NcrPendingList
    pendingNcrAudits={pendingNcrAudits}
    onRaise={(item: any) => {
      const routeParams = {
        auditId: String(item.responseId),
        auditReportNumber: item.auditReportNumber || "",
        department: item.department || "",
        shift: item.shift || "Day",
        auditeeId: item.auditeeId ? String(item.auditeeId) : "",
        auditeeName: item.auditeeName || "",
        clause: item.findings.map((f: any) => f.clause).join("\n"),
        evidence: item.findings
          .map(
            (f: any) =>
              `${f.questionId}: ${f.checkpoint}\nStatus: ${f.severity}\nEvidence: ${f.observation}`,
          )
          .join("\n"),
        statement: item.findings
          .map(
            (f: any) =>
              `${f.severity} identified for ${f.questionId}: ${f.checkpoint}`,
          )
          .join("\n"),
      };
      setActiveNcrConfig(routeParams);
    }}
    onOpenForum={handleOpenForum}  // ✅ ADD THIS
  />
)}
            {activeTab === "ncr-list" && (
  <NcrListTab
    raisedNCRs={raisedNCRs}
    ncrLoading={ncrLoading}
// ✅ Pass both id and type to the state
                onViewNcr={(id: string) =>
                  setActiveNcrViewConfig({ id, type: "form7" })
                }    onOpenForum={(ncr: any) => {
      // Check if it's an 8D related NCR
      const is8D = ncr?.status === "SENT_TO_8D" || 
                   ncr?.status === "IN_8D_PROCESS" || 
                   ncr?.requires8D === true;
      if (is8D) {
        open8DForum(ncr);
      } else {
        handleOpenForum(ncr, null);
      }
    }}
  />
)}
          </View>
        </ScrollView>
      )}

      {/* Modals rendered outside the ternary, but inside SafeAreaView */}
      <RescheduleRequestModal
        audit={selectedAudit}
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setSelectedAudit(null);
          setSelectedForm(null);
        }}
        onSubmit={handleRequestReschedule}
        addToast={addToast}
        user={user}
      />
      <ExtensionRequestModal
        audit={selectedAudit}
        form={selectedForm}
        isOpen={showExtensionModal}
        onClose={() => {
          setShowExtensionModal(false);
          setSelectedAudit(null);
          setSelectedForm(null);
        }}
        onSubmit={handleRequestExtension}
        addToast={addToast}
      />
      {/* Forum Modal */}
{selectedAuditForForum && (
  <AuditCheckSheetNCRForumModal
    auditId={selectedAuditForForum.id || selectedAuditForForum.scheduleId}
    auditNumber={selectedAuditForForum.auditNumber || selectedAuditForForum.id?.toString() || ""}
    auditTitle={selectedAuditForForum.auditType || "Audit"}
    auditStatus={selectedAuditForForum.status || "ACTIVE"}
    auditType={selectedAuditForForum.auditType || ""}
    department={selectedAuditForForum.department || ""}
    auditorId={selectedAuditForForum.auditorId || selectedAuditForForum.leadAuditorId || null}
    auditorName={selectedAuditForForum.auditorName || selectedAuditForForum.leadAuditorName || ""}
    auditeeId={selectedAuditForForum.auditeeId || user?.id || null}
    auditeeName={selectedAuditForForum.auditeeName || user?.name || ""}
    hodEmail={selectedAuditForForum.hodEmail || null}
    hodName={selectedAuditForForum.hodName || null}
    memberEmails={selectedAuditForForum.memberEmails || []}
    isOpen={forumModalVisible}
    onClose={() => {
      setForumModalVisible(false);
      setSelectedAuditForForum(null);
    }}
    currentUser={user}
    allUsers={allUsers}
    onNCRCreated={() => {
      handleRefresh();
    }}
    onNCRUpdated={() => {
      handleRefresh();
    }}
  />
)}

{/* 8D Forum Drawer */}
<Modal visible={show8DForumDrawer} transparent animationType="slide">
  <View className="flex-1 bg-black/30">
    <TouchableOpacity
      className="flex-1"
      activeOpacity={1}
      onPress={() => {
        setShow8DForumDrawer(false);
        setSelected8DNCR(null);
        setEightDTeamMembers([]);
      }}
    />
    <View className="w-full sm:w-1/2 h-full bg-white border-l border-gray-200 shadow-2xl">
      {selected8DNCR && (
        <View className="flex-1">
          {loadingTeamMembers ? (
            <View className="items-center justify-center flex-1">
              <ActivityIndicator size="large" color="#00529B" />
              <Text className="mt-3 text-sm text-gray-500">
                Loading team members...
              </Text>
            </View>
          ) : (
            <ForumThreadView
              groupId={`8D-${selected8DNCR.ncrNumber}`}
              groupName={`8D-${selected8DNCR.ncrNumber}`}
              isInDrawer={true}
              setForumDrawerOpen={setShow8DForumDrawer}
              username={user?.email || user?.username || "Unknown"}
              currentUser={user}
              allUsers={allUsers}
              memberEmails={eightDTeamMembers}
              onBack={() => {
                setShow8DForumDrawer(false);
                setSelected8DNCR(null);
                setEightDTeamMembers([]);
              }}
            />
          )}
        </View>
      )}
    </View>
  </View>
</Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// REUSABLE DATE PICKER COMPONENT
// ============================================================================
const DatePickerField = ({ 
  label, 
  value, 
  onChange, 
  error 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  error?: string 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  
  const parseDateSafe = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
  };

  const [tempDate, setTempDate] = useState(parseDateSafe(value));

  useEffect(() => {
    if (value) setTempDate(parseDateSafe(value));
  }, [value]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        onChange(formattedDate);
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    const formattedDate = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, "0")}-${String(tempDate.getDate()).padStart(2, "0")}`;
    onChange(formattedDate);
    setShowPicker(false);
  };

  return (
    <View>
      <Text className="mb-1.5 text-sm font-semibold text-slate-700">{label}</Text>
      
      {Platform.OS === "web" ? (
        <View className={`w-full flex-row items-center px-3 h-12 bg-white border rounded-xl ${error ? "border-rose-500 bg-rose-50" : "border-slate-200"}`}>
          <Calendar size={18} color="#64748b" />
          {/* @ts-ignore */}
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              flex: 1, border: "none", outline: "none", backgroundColor: "transparent",
              color: value ? "#1e293b" : "#94a3b8", fontSize: 14, padding: 0,
              marginLeft: 8, fontFamily: "inherit", cursor: "pointer", width: "100%",
            }}
          />
        </View>
      ) : (
        <>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            className={`w-full flex-row items-center justify-between px-3 h-12 bg-white border rounded-xl ${error ? "border-rose-500 bg-rose-50" : "border-slate-200"}`}
          >
            <Text className={`text-sm ${value ? "text-slate-800" : "text-slate-400"}`}>
              {value || "Select Date"}
            </Text>
            <Calendar size={18} color="#64748b" />
          </TouchableOpacity>

          {Platform.OS === "ios" && showPicker && (
            <Modal transparent animationType="slide" visible={showPicker}>
              <View className="justify-end flex-1 bg-slate-900/60">
                <View className="p-4 pb-8 bg-white rounded-t-3xl">
                  <View className="flex-row items-center justify-between mb-3">
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text className="text-base font-medium text-rose-500">Cancel</Text>
                    </TouchableOpacity>
                    <Text className="text-base font-semibold text-slate-800">Select Date</Text>
                    <TouchableOpacity onPress={handleConfirm}>
                      <Text className="text-base font-bold text-blue-600">Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={onDateChange} textColor="#000000" />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === "android" && showPicker && (
            <DateTimePicker value={tempDate} mode="date" display="default" onChange={onDateChange} />
          )}
        </>
      )}
      {error ? <Text className="mt-1 text-xs text-rose-600">{error}</Text> : null}
    </View>
  );
};

const parseServerDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();
  if (typeof dateInput === "string") {
    // Extract YYYY-MM-DD to prevent UTC timezone shifting
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Months are 0-indexed in JS
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(dateInput);
};

const getLocalDateString = (dateInput: any): string => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
// Fixes the 24-Hour vs 12-Hour format mismatch
const parseTimeToMinutesRobust = (timeStr: string) => {
  if (!timeStr) return 0;
  // Try 12-hour format (e.g., "09:30 AM")
  let match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  // Try 24-hour format (e.g., "14:00" or "14:00:00")
  match = timeStr.match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  return 0;
};

// ============================================================================
// MODALS (Unchanged, fully functional)
// ============================================================================
const RescheduleRequestModal = ({
  audit,
  isOpen,
  onClose,
  onSubmit,
  user,
  addToast,
}: any) => {
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");
  const [timeConflictError, setTimeConflictError] = useState("");
  const [checkingConflict, setCheckingConflict] = useState(false);

  const getValidEndTimes = (startTime: string) => {
    if (!startTime) return TIME_OPTIONS;
    const startMinutes = parseTimeToMinutesRobust(startTime);
    return TIME_OPTIONS.filter(
      (time: string) => parseTimeToMinutesRobust(time) > startMinutes,
    );
  };
  const validEndTimes = getValidEndTimes(newStartTime);

  const doTimeRangesOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ) => {
    const start1Min = parseTimeToMinutesRobust(start1);
    const end1Min = parseTimeToMinutesRobust(end1);
    const start2Min = parseTimeToMinutesRobust(start2);
    const end2Min = parseTimeToMinutesRobust(end2);
    return start1Min < end2Min && end1Min > start2Min;
  };

  // ✅ MATCHES REACT CODE: Fetches schedules directly
  const fetchExistingSchedules = async () => {
    try {
      const auditorId = audit?.auditorId || audit?.leadAuditorId || user?.id;
      if (!auditorId) return [];
      const response = await apiFetch(
        `/audit-schedule/auditor/${auditorId}/schedules-with-status`,
      );
      return response || [];
    } catch (error) {
      console.error("Failed to fetch schedules", error);
      return [];
    }
  };

  const fetchPendingRescheduleRequests = async () => {
    try {
      const auditorId = audit?.auditorId || audit?.leadAuditorId || user?.id;
      if (!auditorId) return [];
      const response = await apiFetch(
        `/audit-schedule/reschedule-requests/auditor/${auditorId}`,
      );
      return response || [];
    } catch (error) {
      console.error("Failed to fetch pending requests", error);
      return [];
    }
  };

  // ✅ SIMPLIFIED TO MATCH REACT CODE EXACTLY
  const checkSchedulingConflict = async (
    date: string,
    startTime: string,
    endTime: string,
  ) => {
    if (!date || !startTime || !endTime || !audit?.id) return false;
    setCheckingConflict(true);
    setTimeConflictError("");

    try {
      const formattedDate = getLocalDateString(date);
      if (!formattedDate) {
        setTimeConflictError("Invalid date selected.");
        return true;
      }

      // ✅ FIX: Fetch fresh data every time to avoid stale state/closure bugs
      const schedules = await fetchExistingSchedules();
      const pendingRequests = await fetchPendingRescheduleRequests();

      // ✅ CHECK 0: Prevent submitting the exact same time
      const originalDate =
        getLocalDateString(audit.scheduledDate) ||
        getLocalDateString(audit.fromDate);
      if (
        formattedDate === originalDate &&
        startTime === audit.startTime &&
        endTime === audit.endTime
      ) {
        setTimeConflictError(
          "New date and time must be different from the current schedule.",
        );
        return true;
      }

      // ✅ CHECK 1: Conflicts with EXISTING scheduled audits (Matches React Logic exactly)
      const scheduleConflicts = schedules.filter((scheduleItem: any) => {
        const sch = scheduleItem.schedule || scheduleItem;
        if (String(sch?.id) === String(audit.id)) return false;

        // Strictly compare scheduledDate just like the React code does
        const scheduleDate = getLocalDateString(sch?.scheduledDate);
        if (scheduleDate !== formattedDate) return false;

        const scheduleStart = sch?.startTime;
        const scheduleEnd = sch?.endTime;
        if (!scheduleStart || !scheduleEnd) return false;

        return doTimeRangesOverlap(
          startTime,
          endTime,
          scheduleStart,
          scheduleEnd,
        );
      });

      if (scheduleConflicts.length > 0) {
        const conflict = scheduleConflicts[0];
        const sch = conflict.schedule || conflict;
        setTimeConflictError(
          `Time conflict: You already have an audit scheduled on ${formattedDate} from ${sch?.startTime} - ${sch?.endTime}.`,
        );
        return true;
      }

      // ✅ CHECK 2: Conflicts with PENDING reschedule requests
      // (NOW INCLUDES this audit's OWN pending request → blocks duplicates)
      console.log(
        "🔍 [CONFLICT DEBUG] Pending requests:",
        JSON.stringify(pendingRequests),
      );

      // ✅ CHECK 2: Conflicts with PENDING reschedule requests
      // (Backend uses requestedNewDate / requestedNewStartTime / requestedNewEndTime)
      const pendingConflicts = pendingRequests.filter((req: any) => {
        if (req.status !== "PENDING") return false;

        const reqDate = getLocalDateString(req.requestedNewDate || req.newDate);
        if (reqDate !== formattedDate) return false;

        const reqStart = req.requestedNewStartTime || req.newStartTime;
        const reqEnd = req.requestedNewEndTime || req.newEndTime;
        if (!reqStart || !reqEnd) return false;

        return doTimeRangesOverlap(startTime, endTime, reqStart, reqEnd);
      });

      if (pendingConflicts.length > 0) {
        const conflictReq = pendingConflicts[0];
        const displayDate = getLocalDateString(
          conflictReq.requestedNewDate || conflictReq.newDate,
        );
        const displayStart =
          conflictReq.requestedNewStartTime || conflictReq.newStartTime;
        const displayEnd =
          conflictReq.requestedNewEndTime || conflictReq.newEndTime;
        const isSameAudit = String(conflictReq.scheduleId) === String(audit.id);

        setTimeConflictError(
          isSameAudit
            ? `Duplicate request: This audit already has a PENDING reschedule request for ${displayDate} from ${displayStart} - ${displayEnd}. Please wait for approval or choose a different slot.`
            : `Time conflict: You already requested a reschedule for another audit on ${displayDate} from ${displayStart} - ${displayEnd}.`,
        );
        return true;
      }

      if (pendingConflicts.length > 0) {
        const conflictReq = pendingConflicts[0];
        const displayDate = getLocalDateString(
          conflictReq.newDate || conflictReq.requestedDate,
        );
        const isSameAudit = String(conflictReq.scheduleId) === String(audit.id);

        setTimeConflictError(
          isSameAudit
            ? `Duplicate request: This audit already has a PENDING reschedule request for ${displayDate} from ${conflictReq.newStartTime} - ${conflictReq.newEndTime}. Please wait for approval or choose a different slot.`
            : `Time conflict: You have already requested a reschedule for another audit on ${displayDate} from ${conflictReq.newStartTime} - ${conflictReq.newEndTime}.`,
        );
        return true;
      }

      if (pendingConflicts.length > 0) {
        const conflictReq = pendingConflicts[0];
        const displayDate = getLocalDateString(conflictReq.newDate);
        setTimeConflictError(
          `Time conflict: You have already requested a reschedule for another audit on ${displayDate} from ${conflictReq.newStartTime} - ${conflictReq.newEndTime}.`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking conflict:", error);
      return false;
    } finally {
      setCheckingConflict(false);
    }
  };

  const validateDate = (date: string) => {
    if (!date) {
      setDateError("Date is required");
      return false;
    }
    const selectedStr = getLocalDateString(date);
    const todayStr = getLocalDateString(new Date());

    if (!selectedStr || selectedStr <= todayStr) {
      setDateError("Reschedule date must be a future date");
      return false;
    }

    const maxAllowed = new Date();
    maxAllowed.setDate(maxAllowed.getDate() + 21);
    const maxStr = getLocalDateString(maxAllowed);

    if (selectedStr > maxStr) {
      setDateError("Reschedule date should be within the next 3 weeks");
      return false;
    }
    setDateError("");
    return true;
  };

  useEffect(() => {
    if (audit && isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      setNewDate(getLocalDateString(defaultDate));
      setNewStartTime(audit.startTime || "09:00 AM");
      setNewEndTime(audit.endTime || "10:00 AM");
      setReason("");
      setDateError("");
      setTimeConflictError("");
    }
  }, [audit, isOpen]);

  useEffect(() => {
    if (newDate && newStartTime && newEndTime && !dateError) {
      if (
        parseTimeToMinutesRobust(newStartTime) <
        parseTimeToMinutesRobust(newEndTime)
      ) {
        const delayDebounce = setTimeout(
          () => checkSchedulingConflict(newDate, newStartTime, newEndTime),
          500,
        );
        return () => clearTimeout(delayDebounce);
      } else {
        setTimeConflictError("End time must be after start time");
      }
    }
  }, [newDate, newStartTime, newEndTime, dateError]);

  const handleSubmit = async () => {
    if (
      !newDate ||
      !validateDate(newDate) ||
      !newStartTime ||
      !newEndTime ||
      parseTimeToMinutesRobust(newStartTime) >=
        parseTimeToMinutesRobust(newEndTime) ||
      !reason.trim()
    ) {
      addToast("Please fill all fields correctly", "error");
      return;
    }
    const hasConflict = await checkSchedulingConflict(
      newDate,
      newStartTime,
      newEndTime,
    );
    if (hasConflict) {
      addToast(timeConflictError || "Time slot conflicts", "error");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(
        audit.id,
        getLocalDateString(newDate),
        newStartTime,
        newEndTime,
        reason,
      );
      onClose();
    } catch (error: any) {
      addToast(error.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="items-center justify-center flex-1 bg-slate-900/60"
      >
        <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
          <Text className="mb-4 text-lg font-bold text-slate-800">
            Request Reschedule
          </Text>
          <Text className="mb-4 text-sm text-slate-600">
            Reschedule <Text className="font-bold">{audit?.auditType}</Text> for{" "}
            <Text className="font-bold">{audit?.department}</Text>
          </Text>
          <View className="gap-4">
            <DatePickerField
              label="New Date *"
              value={newDate}
              onChange={(text) => {
                setNewDate(text);
                if (text) validateDate(text);
                else {
                  setDateError("");
                  setTimeConflictError("");
                }
              }}
              error={dateError}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                  Start Time *
                </Text>
                <TimePicker
                  value={newStartTime}
                  onChange={setNewStartTime}
                  options={TIME_OPTIONS}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                  End Time *
                </Text>
                <TimePicker
                  value={newEndTime}
                  onChange={setNewEndTime}
                  options={validEndTimes}
                  disabled={!newStartTime}
                />
              </View>
            </View>
            {timeConflictError ? (
              <View className="flex-row items-center gap-2 p-3 text-sm border bg-rose-50 rounded-xl border-rose-200">
                <AlertCircle size={14} color="#be123c" />
                <Text className="flex-1 text-rose-700">
                  {timeConflictError}
                </Text>
              </View>
            ) : null}
            <View>
              <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                Reason *
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Reason for rescheduling..."
                multiline
                numberOfLines={3}
                className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl"
              />
            </View>
          </View>
          <View className="flex-row justify-end gap-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white"
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={
                submitting ||
                !!dateError ||
                !!timeConflictError ||
                checkingConflict
              }
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md ${submitting || dateError || timeConflictError || checkingConflict ? "bg-slate-400" : "bg-blue-600"}`}
            >
              <Text>{submitting ? "Submitting..." : "Submit Request"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const ExtensionRequestModal = ({
  audit,
  form,
  isOpen,
  onClose,
  onSubmit,
  addToast,
}: any) => {
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validEndTimes = newStartTime
    ? TIME_OPTIONS.filter(
        (time: string) =>
          parseTimeToMinutes(time) > parseTimeToMinutes(newStartTime),
      )
    : TIME_OPTIONS;

  useEffect(() => {
    if (audit && isOpen) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setNewDate(defaultDate.toISOString().split("T")[0]);
      setNewStartTime(audit.startTime || "09:00 AM");
      setNewEndTime(audit.endTime || "10:00 AM");
      setReason("");
    }
  }, [audit, isOpen]);

  const handleSubmit = async () => {
    if (
      !newDate ||
      !newStartTime ||
      !newEndTime ||
      parseTimeToMinutes(newStartTime) >= parseTimeToMinutes(newEndTime) ||
      !reason.trim()
    ) {
      addToast("Please fill all fields correctly", "error");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(audit.id, newDate, newStartTime, newEndTime, reason, form);
      onClose();
    } catch (error) {
      addToast("Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="items-center justify-center flex-1 bg-slate-900/60"
      >
        <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
          <Text className="mb-4 text-lg font-bold text-slate-800">
            Request Extension
          </Text>
          <Text className="mb-4 text-sm text-slate-600">
            Request extension for{" "}
            <Text className="font-bold">{audit?.auditType}</Text>
          </Text>
          <View className="gap-4">
            <DatePickerField
              label="New Due Date *"
              value={newDate}
              onChange={setNewDate}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                  Start Time *
                </Text>
                <TimePicker
                  value={newStartTime}
                  onChange={setNewStartTime}
                  options={TIME_OPTIONS}
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                  End Time *
                </Text>
                <TimePicker
                  value={newEndTime}
                  onChange={setNewEndTime}
                  options={validEndTimes}
                  disabled={!newStartTime}
                />
              </View>
            </View>
            <View>
              <Text className="mb-1.5 text-sm font-semibold text-slate-700">
                Reason *
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Detailed reason..."
                multiline
                numberOfLines={3}
                className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl"
              />
            </View>
          </View>
          <View className="flex-row justify-end gap-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white"
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md ${submitting ? "bg-slate-400" : "bg-blue-600"}`}
            >
              <Text>{submitting ? "Submitting..." : "Submit Request"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
