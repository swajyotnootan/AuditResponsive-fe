import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Eye,
  FileText,
  Grid3x3,
  List,
  MessageCircle,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
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
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";

// ⚠️ Adjust these paths to match your actual project structure
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// ⚠️ Adjust these paths to match your actual project structure
import FiveSView from "./auditor/view/FiveSView";
import Form7DetailView from "./auditor/view/Form7DetailView";
import IATFInternalView from "./auditor/view/IATFInternalView";
import ManufacturingProcessView from "./auditor/view/ManufacturingProcessView";

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
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`❌ [API FETCH] Failed (${endpoint}):`, error);
    throw error;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getViewRoute = (audit: any) => {
  const auditType = (audit.auditType || "").toLowerCase().trim();
  if (auditType.includes("5s") || auditType.includes("five_s"))
    return "/fives-view";
  if (auditType.includes("process") || auditType.includes("manufacturing"))
    return "/manufacturing-view";
  if (auditType.includes("iatf") || auditType.includes("system"))
    return "/iatf-view";
  return "/fives-view";
};

const parseResponseAnswers = (response: any) => {
  if (!response) return [];
  if (response.answers && Array.isArray(response.answers))
    return response.answers;
  if (response.answers && typeof response.answers === "string") {
    try {
      return JSON.parse(response.answers);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const getNcrFindingEntries = (answers: any) => {
  if (!Array.isArray(answers)) return [];
  return answers.filter(
    (a: any) => a.ncrFinding === true || a.ncrFinding === "true",
  );
};

const is8DRelated = (ncr: any) => {
  const eightDStatuses = [
    "SENT_TO_8D",
    "IN_8D_PROCESS",
    "READY_FOR_NCR2",
    "NCR2_IN_PROGRESS",
    "NCR2_COMPLETED",
  ];
  return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
};

// ============================================================================
// ✅ REUSABLE COMPONENTS (Matched to Auditor Dashboard)
// ============================================================================
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

// ✅ NEW: StatCardsContainer to handle proper width distribution (Mobile scroll vs Desktop flex)
const StatCardsContainer = ({ stats, isNcr = false }: any) => {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const auditStats = [
    { title: "Pending Forms", value: stats.pendingReview, icon: Clock },
    { title: "Approved Forms", value: stats.approvedAudits, icon: CheckCircle },
    { title: "Rejected Forms", value: stats.rejectedAudits, icon: XCircle },
    { title: "Open NCRs", value: stats.openNCRs, icon: AlertCircle },
    { title: "Overdue NCRs", value: stats.overdueNCRs, icon: Clock },
    { title: "Resolved NCRs", value: stats.resolvedNCRs, icon: CheckCircle },
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

  // ✅ TABLET & DESKTOP: Force ALL cards into a SINGLE row, dividing width equally
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

const NcrStatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    SENT_TO_8D: {
      label: "In 8D",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    IN_8D_PROCESS: {
      label: "In 8D",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    READY_FOR_NCR2: {
      label: "Ready for NCR2",
      className: "bg-violet-50 text-violet-700 border-violet-200",
    },
    NCR2_IN_PROGRESS: {
      label: "NCR2 Verification",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
    NCR2_COMPLETED: {
      label: "NCR2 Completed",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    AWAITING_AUDITEE: {
      label: "Awaiting Review",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    OPEN: {
      label: "Open",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    IN_PROGRESS: {
      label: "In Progress",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    },
    CLOSED: {
      label: "Closed",
      className: "bg-slate-50 text-slate-700 border-slate-200",
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  };
  const { label, className } = config[status] || {
    label: status,
    className: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <View
      className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg border ${className}`}
    >
      <Text className="text-xs font-medium">{label}</Text>
    </View>
  );
};

// ============================================================================
// AUDIT CARD (Grid View - Auditee Specific)
// ============================================================================
const AuditCard = ({
  audit,
  onViewReport,
  onApprove,
  onReject,
  formDetails,
  totalForms,
  completedForms,
  onOpenForum,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const isDateRange =
    audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  const isMultiForm = totalForms > 1;

  const allApproved =
    formDetails?.length > 0 &&
    formDetails?.every((f: any) => f.status === "APPROVED");
  const allRejected =
    formDetails?.length > 0 &&
    formDetails?.every((f: any) => f.status === "REJECTED");
  const hasAnyRejected = formDetails?.some((f: any) => f.status === "REJECTED");
  const hasAnyApproved = formDetails?.some((f: any) => f.status === "APPROVED");
  const hasPending = formDetails?.some((f: any) =>
    ["COMPLETED", "AWAITING_APPROVAL", "SUBMITTED"].includes(f.status),
  );

  let cardStatus = "PENDING";
  if (allApproved) cardStatus = "APPROVED";
  else if (allRejected) cardStatus = "REJECTED";
  else if (hasAnyRejected) cardStatus = "PARTIALLY_REJECTED";
  else if (hasAnyApproved && hasPending) cardStatus = "PARTIALLY_APPROVED";

  const progressPercent =
    totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

  const getStatusBadge = () => {
    const baseClass =
      "flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border";
    if (cardStatus === "APPROVED")
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <CheckCircle size={14} color="#047857" />
          <Text className="ml-1 text-[11px] font-semibold text-emerald-700">
            All Approved
          </Text>
        </View>
      );
    if (cardStatus === "REJECTED")
      return (
        <View className={`${baseClass} bg-rose-50 border-rose-200`}>
          <XCircle size={14} color="#be123c" />
          <Text className="ml-1 text-[11px] font-semibold text-rose-700">
            All Rejected
          </Text>
        </View>
      );
    if (cardStatus === "PARTIALLY_REJECTED")
      return (
        <View className={`${baseClass} bg-amber-50 border-amber-200`}>
          <AlertCircle size={14} color="#b45309" />
          <Text className="ml-1 text-[11px] font-semibold text-amber-700">
            Partially Rejected
          </Text>
        </View>
      );
    if (cardStatus === "PARTIALLY_APPROVED")
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <CheckCircle size={14} color="#1d4ed8" />
          <Text className="ml-1 text-[11px] font-semibold text-blue-700">
            Partially Approved
          </Text>
        </View>
      );
    return (
      <View className={`${baseClass} bg-orange-100 border-orange-200`}>
        <Clock size={14} color="#c2410c" />
        <Text className="ml-1 text-[11px] font-semibold text-orange-600">
          Pending Review
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white border shadow-sm rounded-2xl border-slate-200">
      <View className="p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row flex-wrap flex-1 gap-2 mr-2">
            {getStatusBadge()}
            {isMultiForm && (
              <View className="flex-row items-center gap-1 px-2 py-1 border rounded-lg bg-slate-100 border-slate-200">
                <Text className="text-[10px] font-semibold text-slate-700">
                  {completedForms}/{totalForms} Forms
                </Text>
              </View>
            )}
          </View>
          <View
            className="flex-col items-end flex-shrink-0 gap-1"
            style={{ maxWidth: "50%" }}
          >
            <View className="flex-row items-start gap-1 px-1.5 py-1 rounded border bg-slate-50 border-slate-200">
              <CalendarIcon
                size={10}
                color="#94a3b8"
                style={{ marginTop: 1 }}
              />
              <Text className="text-[11px] text-slate-500" numberOfLines={2}>
                {isDateRange
                  ? `${audit.fromDate} → ${audit.toDate}`
                  : audit.scheduledDate}
              </Text>
            </View>
          </View>
        </View>

        <Text
          className="mb-3 text-sm font-bold text-slate-800"
          numberOfLines={2}
        >
          {audit.auditType || "Audit"} - {audit.department || "General"}
        </Text>

        <View className="flex-row flex-wrap gap-2 mb-3">
          <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200">
            <Clock size={12} color="#94a3b8" />
            <Text className="text-[11px] font-medium text-slate-600">
              {audit.startTime} - {audit.endTime}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-200">
            <UserCheck size={12} color="#94a3b8" />
            <Text className="text-[11px] font-medium text-slate-600">
              {audit.auditorName || "Not Assigned"}
            </Text>
          </View>
        </View>

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
                className="h-full rounded-full bg-emerald-500"
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
                  const isFormPending = [
                    "COMPLETED",
                    "AWAITING_APPROVAL",
                    "SUBMITTED",
                  ].includes(form.status);
                  return (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between p-3 mb-2 border rounded-lg bg-slate-50 border-slate-200"
                    >
                      <View className="flex-row items-center flex-1 gap-2">
                        <View
                          className={`w-2 h-2 rounded-full ${form.status === "APPROVED" ? "bg-emerald-500" : form.status === "REJECTED" ? "bg-rose-500" : "bg-amber-500"}`}
                        />
                        <Text
                          className="flex-1 font-medium truncate text-slate-700"
                          numberOfLines={1}
                        >
                          {form.processName || form.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => onOpenForum(audit, null)}
                          className="p-1.5 rounded-md bg-purple-50"
                        >
                          <MessageCircle size={14} color="#9333ea" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onViewReport(audit, form.responseId)}
                          className="p-1.5 rounded-md bg-blue-50"
                        >
                          <Eye size={14} color="#1d4ed8" />
                        </TouchableOpacity>
                        {isFormPending && (
                          <>
                            <TouchableOpacity
                              onPress={() => onApprove(audit, form)}
                              className="p-1.5 rounded-md bg-emerald-50"
                            >
                              <ThumbsUp size={14} color="#047857" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => onReject(audit, form)}
                              className="p-1.5 rounded-md bg-rose-50"
                            >
                              <ThumbsDown size={14} color="#be123c" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
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

          {hasPending && (
            <TouchableOpacity
              onPress={() => {
                const pendingForm = formDetails.find((f: any) =>
                  ["COMPLETED", "AWAITING_APPROVAL", "SUBMITTED"].includes(
                    f.status,
                  ),
                );
                if (pendingForm)
                  onViewReport(audit, pendingForm.responseId, pendingForm);
              }}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200"
            >
              <Eye size={14} color="#1d4ed8" />
              <Text className="text-xs font-semibold text-blue-700">
                View Latest
              </Text>
            </TouchableOpacity>
          )}

          {(cardStatus === "APPROVED" || cardStatus === "REJECTED") &&
            formDetails?.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  onViewReport(audit, formDetails[0].responseId, formDetails[0])
                }
                className="flex-row items-center gap-1.5 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200"
              >
                <Eye size={14} color="#047857" />
                <Text className="text-xs font-semibold text-emerald-700">
                  View Reports
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// AUDIT LIST ITEM (List View - Auditee Specific)
// ============================================================================
const AuditListItem = ({
  audit,
  onViewReport,
  onApprove,
  onReject,
  formDetails,
  totalForms,
  completedForms,
  onOpenForum,
}: any) => {
  const [expanded, setExpanded] = useState(false);
  const isDateRange =
    audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate;
  const isMultiForm = totalForms > 1;

  const allApproved =
    formDetails?.length > 0 &&
    formDetails?.every((f: any) => f.status === "APPROVED");
  const allRejected =
    formDetails?.length > 0 &&
    formDetails?.every((f: any) => f.status === "REJECTED");
  const hasAnyRejected = formDetails?.some((f: any) => f.status === "REJECTED");
  const hasAnyApproved = formDetails?.some((f: any) => f.status === "APPROVED");
  const hasPending = formDetails?.some((f: any) =>
    ["COMPLETED", "AWAITING_APPROVAL", "SUBMITTED"].includes(f.status),
  );

  let cardStatus = "PENDING";
  if (allApproved) cardStatus = "APPROVED";
  else if (allRejected) cardStatus = "REJECTED";
  else if (hasAnyRejected) cardStatus = "PARTIALLY_REJECTED";
  else if (hasAnyApproved && hasPending) cardStatus = "PARTIALLY_APPROVED";

  const progressPercent =
    totalForms > 0 ? (completedForms / totalForms) * 100 : 0;

  const getStatusBadge = () => {
    const baseClass =
      "flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border";
    if (cardStatus === "APPROVED")
      return (
        <View className={`${baseClass} bg-emerald-50 border-emerald-200`}>
          <CheckCircle size={14} color="#047857" />
          <Text className="ml-1 text-[11px] font-semibold text-emerald-700">
            All Approved
          </Text>
        </View>
      );
    if (cardStatus === "REJECTED")
      return (
        <View className={`${baseClass} bg-rose-50 border-rose-200`}>
          <XCircle size={14} color="#be123c" />
          <Text className="ml-1 text-[11px] font-semibold text-rose-700">
            All Rejected
          </Text>
        </View>
      );
    if (cardStatus === "PARTIALLY_REJECTED")
      return (
        <View className={`${baseClass} bg-amber-50 border-amber-200`}>
          <AlertCircle size={14} color="#b45309" />
          <Text className="ml-1 text-[11px] font-semibold text-amber-700">
            Partially Rejected
          </Text>
        </View>
      );
    if (cardStatus === "PARTIALLY_APPROVED")
      return (
        <View className={`${baseClass} bg-blue-50 border-blue-200`}>
          <CheckCircle size={14} color="#1d4ed8" />
          <Text className="ml-1 text-[11px] font-semibold text-blue-700">
            Partially Approved
          </Text>
        </View>
      );
    return (
      <View className={`${baseClass} bg-orange-100 border-orange-200`}>
        <Clock size={14} color="#c2410c" />
        <Text className="ml-1 text-[11px] font-semibold text-orange-600">
          Pending Review
        </Text>
      </View>
    );
  };

  return (
    <View className="w-full p-4 mb-3 bg-white border shadow-sm border-slate-200 rounded-xl">
      <View className="flex-row flex-wrap items-center justify-between gap-4">
        <View className="flex-1 min-w-0">
          <View className="flex-row flex-wrap items-center gap-2 mb-2">
            {getStatusBadge()}
            {isMultiForm && (
              <View className="flex-row items-center gap-1 px-2 py-1 border rounded-lg bg-slate-100 border-slate-200">
                <Text className="text-[10px] font-semibold text-slate-700">
                  {completedForms}/{totalForms} Forms
                </Text>
              </View>
            )}
          </View>
          <Text
            className="mb-1 text-sm font-bold text-slate-800"
            numberOfLines={1}
          >
            {audit.auditType || "Audit"} - {audit.department || "General"}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <CalendarIcon size={10} color="#94a3b8" />
              <Text className="text-xs text-slate-600">
                {isDateRange
                  ? `${audit.fromDate} → ${audit.toDate}`
                  : audit.scheduledDate}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <Clock size={10} color="#94a3b8" />
              <Text className="text-xs text-slate-600">
                {audit.startTime} - {audit.endTime}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <UserCheck size={10} color="#94a3b8" />
              <Text className="text-xs text-slate-600">
                {audit.auditorName || "Not Assigned"}
              </Text>
            </View>
          </View>
          {isMultiForm && (
            <View className="max-w-md mt-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-medium text-slate-500">
                  Progress
                </Text>
                <Text className="text-[10px] font-semibold text-blue-600">
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          )}
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <TouchableOpacity
            onPress={() => onOpenForum(audit, null)}
            className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200"
          >
            <MessageCircle size={12} color="#334155" />
          </TouchableOpacity>

          {hasPending && (
            <TouchableOpacity
              onPress={() => {
                const pendingForm = formDetails.find((f: any) =>
                  ["COMPLETED", "AWAITING_APPROVAL", "SUBMITTED"].includes(
                    f.status,
                  ),
                );
                if (pendingForm) onViewReport(audit, pendingForm.responseId);
              }}
              className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200"
            >
              <Eye size={12} color="#1d4ed8" />
            </TouchableOpacity>
          )}

          {(cardStatus === "APPROVED" || cardStatus === "REJECTED") &&
            formDetails?.length > 0 && (
              <TouchableOpacity
                onPress={() => onViewReport(audit, formDetails[0].responseId)}
                className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200"
              >
                <Eye size={12} color="#047857" />
              </TouchableOpacity>
            )}
        </View>
      </View>
      {isMultiForm && formDetails?.length > 0 && (
        <View className="mt-4">
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            className="flex-row items-center gap-2"
          >
            {expanded ? (
              <ChevronUp size={14} color="#2563eb" />
            ) : (
              <ChevronDown size={14} color="#2563eb" />
            )}
            <Text className="text-xs font-medium text-blue-600">
              {expanded ? "Hide details" : `View all forms (${totalForms})`}
            </Text>
          </TouchableOpacity>
          {expanded && (
            <View className="mt-3">
              {formDetails.map((form: any, idx: number) => {
                const isFormPending = [
                  "COMPLETED",
                  "AWAITING_APPROVAL",
                  "SUBMITTED",
                ].includes(form.status);
                return (
                  <View
                    key={idx}
                    className="flex-row items-center justify-between p-3 mb-2 border rounded-lg bg-slate-50 border-slate-200"
                  >
                    <View className="flex-row items-center flex-1 gap-2">
                      <View
                        className={`w-2 h-2 rounded-full ${form.status === "APPROVED" ? "bg-emerald-500" : form.status === "REJECTED" ? "bg-rose-500" : "bg-amber-500"}`}
                      />
                      <Text
                        className="flex-1 font-medium truncate text-slate-700"
                        numberOfLines={1}
                      >
                        {form.processName || form.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <TouchableOpacity
                        onPress={() => onOpenForum(audit, null)}
                        className="p-1.5 rounded-md bg-purple-50"
                      >
                        <MessageCircle size={14} color="#9333ea" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onViewReport(audit, form.responseId)}
                        className="p-1.5 rounded-md bg-blue-50"
                      >
                        <Eye size={14} color="#1d4ed8" />
                      </TouchableOpacity>
                      {isFormPending && (
                        <>
                          <TouchableOpacity
                            onPress={() => onApprove(audit, form)}
                            className="p-1.5 rounded-md bg-emerald-50"
                          >
                            <ThumbsUp size={14} color="#047857" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => onReject(audit, form)}
                            className="p-1.5 rounded-md bg-rose-50"
                          >
                            <ThumbsDown size={14} color="#be123c" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// NCR PENDING LIST
// ============================================================================
const NcrPendingList = ({ pendingNcrAudits, onViewNcr, onOpenForum }: any) => {
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
          All NCRs have been reviewed
        </Text>
      </View>
    );
  }
  return (
    <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <View className="flex-row items-center gap-2">
          <AlertCircle size={20} color="#e11d48" />
          <Text className="text-sm font-bold text-slate-800">
            NCRs Awaiting Your Review
          </Text>
        </View>
        <View className="px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-200">
          <Text className="text-xs font-bold text-rose-700">
            {pendingNcrAudits.length} pending
          </Text>
        </View>
      </View>
      <FlatList
        data={pendingNcrAudits}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }: any) => (
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <View className="flex-1 mr-3">
              <Text className="font-mono text-sm font-bold text-slate-900">
                NCR #{item.ncrNumber || item.id}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                {item.department || "General"} · Due:{" "}
                {item.dueDate
                  ? new Date(item.dueDate).toLocaleDateString()
                  : "Not set"}
              </Text>
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                <View
                  className={`px-2 py-1 rounded-md border ${item.severity === "Major NC" ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${item.severity === "Major NC" ? "text-rose-700" : "text-amber-700"}`}
                  >
                    {item.severity || "NCR"}
                  </Text>
                </View>
                {item.clause && (
                  <View className="px-2 py-1 border rounded-md bg-slate-100 border-slate-200">
                    <Text className="text-[10px] font-semibold text-slate-600">
                      Clause {item.clause}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {/* ✅ ADD FORUM BUTTON */}
              {onOpenForum && (
                <TouchableOpacity
                  onPress={() => onOpenForum(item)}
                  className="p-2 rounded-lg bg-purple-50"
                >
                  <MessageCircle size={18} color="#9333ea" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onViewNcr(item.id)}
                className="p-2 rounded-lg bg-slate-50"
              >
                <Eye size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

// ============================================================================
// NCR LIST TAB
// ============================================================================
const NcrListTab = ({ assignedNCRs, onViewNcr, onOpenForum }: any) => {
  return (
    <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
        <View>
          <Text className="text-sm font-bold text-slate-800">
            All Assigned NCRs
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Nonconformity reports assigned to you
          </Text>
        </View>
        {assignedNCRs.length > 0 && (
          <View className="px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <Text className="text-xs font-bold text-slate-700">
              {assignedNCRs.length} total
            </Text>
          </View>
        )}
      </View>
      {assignedNCRs.length === 0 ? (
        <View className="flex-col items-center justify-center py-16 text-center bg-white">
          <View className="flex items-center justify-center w-12 h-12 mb-3 rounded-xl bg-slate-100">
            <AlertCircle size={24} color="#94a3b8" />
          </View>
          <Text className="text-sm font-semibold text-slate-700">
            No NCRs assigned
          </Text>
          <Text className="max-w-xs mt-1 text-xs text-center text-slate-500">
            When NCRs are raised against you, they will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={assignedNCRs}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }: any) => (
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
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
              <NcrStatusBadge status={item.status} />
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
                  onPress={() => onViewNcr(item.id)}
                  className="p-2 rounded-lg bg-slate-50"
                >
                  <Eye size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default function AuditeeDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const gridCardWidth = isMobile ? "100%" : "31%";
  const { user } = useAuth();
  const { addToast } = useToast();
  const getInitialTab = () => {
    const action = Array.isArray(params.action)
      ? params.action[0]
      : params.action;
    const section = Array.isArray(params.section)
      ? params.section[0]
      : params.section;

    return (section || action || "my-audits") as string;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    if (params?.tab) {
      const tabValue = Array.isArray(params.tab)
        ? params.tab[0]
        : (params.tab as string);

      const tabMap: Record<string, string> = {
        "my-audits": "my-audits",
        "ncr-pending": "ncr-pending",
        "my-ncrs": "my-ncrs",
      };

      const normalizedTab = tabMap[tabValue] || "my-audits";
      setActiveTab(normalizedTab);
    } else {
      setActiveTab("my-audits"); // Default fallback
    }
  }, [params?.tab]);

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
  const [isFetching, setIsFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeNcrViewConfig, setActiveNcrViewConfig] = useState<any>(null);
  const [completedAuditsForReview, setCompletedAuditsForReview] = useState<
    any[]
  >([]);
  const [assignedNCRs, setAssignedNCRs] = useState<any[]>([]);
  const [pendingNcrReviews, setPendingNcrReviews] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [activeReportConfig, setActiveReportConfig] = useState<any>(null);

  // Modals State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingForm, setRejectingForm] = useState<{
    audit: any;
    form: any;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [showNcrReviewModal, setShowNcrReviewModal] = useState(false);
  const [reviewingNcr, setReviewingNcr] = useState<any | null>(null);
  const [reviewApproved, setReviewApproved] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  // Add these state variables
const [forumModalVisible, setForumModalVisible] = useState(false);
const [selectedAuditForForum, setSelectedAuditForForum] = useState<any>(null);
const [allUsers, setAllUsers] = useState<any[]>([]);

  const [stats, setStats] = useState({
    pendingReview: 0,
    approvedAudits: 0,
    rejectedAudits: 0,
    openNCRs: 0,
    overdueNCRs: 0,
    resolvedNCRs: 0,
  });

  const ncrStats = useMemo(() => {
    return {
      total: assignedNCRs.length,
      awaiting: assignedNCRs.filter((n: any) => n.status === "AWAITING_AUDITEE")
        .length,
      pending: assignedNCRs.filter((n: any) => n.status === "OPEN").length,
      inProgress: assignedNCRs.filter((n: any) =>
        [
          "IN_PROGRESS",
          "SENT_TO_8D",
          "IN_8D_PROCESS",
          "NCR2_IN_PROGRESS",
        ].includes(n.status),
      ).length,
      closed: assignedNCRs.filter((n: any) =>
        ["CLOSED", "NCR2_COMPLETED"].includes(n.status),
      ).length,
      rejected: assignedNCRs.filter((n: any) => n.status === "REJECTED").length,
    };
  }, [assignedNCRs]);

  useEffect(() => {
    const loadYear = async () => {
      try {
        const savedYear = await AsyncStorage.getItem("auditeeSelectedYear");
        if (savedYear) setSelectedYear(parseInt(savedYear, 10));
      } catch (e) {}
    };
    loadYear();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("auditeeSelectedYear", selectedYear.toString());
  }, [selectedYear]);

  const fetchAuditeeData = async (year = selectedYear) => {
    try {
      setIsFetching(true);
      setRefreshing(true);

      const [schedulesRes, responsesRes, ncrsRes] = await Promise.all([
        apiFetch(`/audit-schedule/year/${year}`).catch(() => []),
        apiFetch("/templates/responses/all").catch(() => []),
        apiFetch("/ncr/all").catch(() => []),
      ]);

      const mySchedules = (schedulesRes || []).filter(
        (s: any) => s.auditeeId === user?.id || s.auditeeName === user?.name,
      );
      const myResponses = (responsesRes || []).filter(
        (r: any) => r.auditeeId === user?.id || r.auditeeName === user?.name,
      );
      const myResponsesByYear = myResponses.filter(
        (r: any) => r.createdAt && new Date(r.createdAt).getFullYear() === year,
      );

      const auditMap = new Map();
      for (const response of myResponsesByYear) {
        const scheduleId = response.auditScheduleId;
        if (!scheduleId) continue;
        if (!auditMap.has(scheduleId)) {
          const schedule =
            mySchedules.find((s: any) => s.id === scheduleId) ||
            (await apiFetch(`/audit-schedule/${scheduleId}`).catch(() => null));
          if (schedule)
            auditMap.set(scheduleId, {
              ...schedule,
              formDetails: [],
              totalForms: 0,
              completedForms: 0,
            });
        }
        const auditData = auditMap.get(scheduleId);
        if (auditData) {
          auditData.formDetails.push({
            id: response.checkSheet?.id,
            name: response.checkSheet?.name,
            processName: response.checkSheet?.name,
            responseId: response.id,
            completed: true,
            status: response.status || "COMPLETED",
          });
          auditData.totalForms = auditData.formDetails.length;
          auditData.completedForms = auditData.formDetails.filter(
            (f: any) => f.completed,
          ).length;
        }
      }

      const auditsArray = Array.from(auditMap.values());
      let pendingFormsCount = 0,
        approvedFormsCount = 0,
        rejectedFormsCount = 0;
      auditsArray.forEach((audit: any) => {
        audit.formDetails.forEach((form: any) => {
          if (form.status === "APPROVED") approvedFormsCount++;
          else if (form.status === "REJECTED") rejectedFormsCount++;
          else if (
            ["COMPLETED", "AWAITING_APPROVAL", "SUBMITTED"].includes(
              form.status,
            )
          )
            pendingFormsCount++;
        });
      });

      setCompletedAuditsForReview(auditsArray);

      // NCR Data
      let myNCRs = (ncrsRes || [])
        .filter(
          (ncr: any) =>
            String(ncr.assigneeId) === String(user?.id) ||
            String(ncr.auditeeId) === String(user?.id),
        )
        .filter((ncr: any) => {
          const ncrDate = ncr.createdAt || ncr.raisedDate;
          return !year || !ncrDate || new Date(ncrDate).getFullYear() === year;
        });

      const pendingReview = myNCRs.filter(
        (n: any) => n.status === "AWAITING_AUDITEE",
      );
      const openNCRs = myNCRs.filter((n: any) =>
        ["OPEN", "APPROVED", "READY_FOR_NCR2"].includes(n.status),
      );
      const inProgressNCRs = myNCRs.filter((n: any) =>
        [
          "IN_PROGRESS",
          "SENT_TO_8D",
          "IN_8D_PROCESS",
          "NCR2_IN_PROGRESS",
        ].includes(n.status),
      );
      const closedNCRs = myNCRs.filter((n: any) =>
        ["CLOSED", "NCR2_COMPLETED"].includes(n.status),
      );
      const today = new Date();
      const overdue = openNCRs.filter(
        (n: any) => n.dueDate && new Date(n.dueDate) < today,
      );

      setAssignedNCRs(myNCRs);
      setPendingNcrReviews(pendingReview);

      setStats({
        pendingReview: pendingFormsCount,
        approvedAudits: approvedFormsCount,
        rejectedAudits: rejectedFormsCount,
        openNCRs: openNCRs.length,
        overdueNCRs: overdue.length,
        resolvedNCRs: inProgressNCRs.length + closedNCRs.length,
      });
    } catch (error) {
      console.error("❌ CRITICAL ERROR in fetchAuditeeData:", error);
      addToast("Failed to load dashboard data", "error");
    } finally {
      setIsFetching(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAuditeeData(selectedYear);
    }
  }, [user?.id, selectedYear]);

 
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditeeData(selectedYear);
    addToast("Dashboard refreshed", "success");
  };

  const handleViewReport = (audit: any, responseId: any, form: any = null) => {
  if (!responseId) {
    addToast("No audit report data available", "error");
    return;
  }
  setActiveReportConfig({
    id: String(responseId),
    audit: {
      ...audit,
      // Ensure these are passed for forum
      auditorId: audit.auditorId,
      auditorName: audit.auditorName,
      hodEmail: audit.hodEmail,
      hodName: audit.hodName,
      memberEmails: audit.memberEmails || [],
    },
    form,
  });
};

  const renderActiveReport = () => {
    if (!activeReportConfig) return null;
    const audit = activeReportConfig.audit || {};
    const form = activeReportConfig.form || {};

    const typeString = `
    ${audit.auditType || ""}
    ${audit.auditName || ""}
    ${audit.processName || ""}
    ${audit.checkSheetName || ""}
    ${form.processName || ""}
    ${form.name || ""}
  `.toLowerCase();

    if (
      typeString.includes("iatf") ||
      typeString.includes("system") ||
      typeString.includes("internal") ||
      typeString.includes("16949")
    ) {
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

    if (
      typeString.includes("process") ||
      typeString.includes("manufacturing")
    ) {
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

  const renderActiveNcrView = () => {
    if (!activeNcrViewConfig) return null;
    return (
      <Form7DetailView
        initialParams={activeNcrViewConfig}
        onClose={() => {
          setActiveNcrViewConfig(null); // Closes the view and goes back to dashboard
          handleRefresh(); // Optional: refreshes data when returning
        }}
      />
    );
  };

  const handleApprove = async (audit: any, form: any) => {
    try {
      await apiFetch(`/templates/responses/${form.responseId}/approve`, {
        method: "PUT",
        body: JSON.stringify({
          approvedBy: user?.name,
          approvedAt: new Date().toISOString(),
          signature: user?.name,
        }),
      });
      addToast(
        `Form "${form.processName || form.name}" approved successfully`,
        "success",
      );
      await fetchAuditeeData(selectedYear);
    } catch (error) {
      addToast("Failed to approve audit", "error");
    }
  };

  const handleRejectClick = (audit: any, form: any) => {
    setRejectingForm({ audit, form });
    setRejectReason("");
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim() || !rejectingForm) {
      addToast("Rejection reason is required", "error");
      return;
    }
    try {
      const { audit, form } = rejectingForm;
      await apiFetch(`/templates/responses/${form.responseId}/reject`, {
        method: "PUT",
        body: JSON.stringify({
          rejectedBy: user?.name,
          rejectedAt: new Date().toISOString(),
          rejectionReason: rejectReason,
        }),
      });
      addToast(`Form "${form.processName || form.name}" rejected`, "warning");
      setShowRejectModal(false);
      await fetchAuditeeData(selectedYear);
    } catch (error) {
      addToast("Failed to reject audit", "error");
    }
  };

  const handleNcrReviewClick = (ncr: any, approved: boolean) => {
    setReviewingNcr(ncr);
    setReviewApproved(approved);
    setReviewComment("");
    setShowNcrReviewModal(true);
  };

  // Add this function in both dashboards
const handleOpenForum = (audit: any, form: any = null) => {
  console.log("🔍 Opening forum for audit:", audit);
  if (!audit) {
    addToast("No audit data available for forum", "error");
    return;
  }
  setSelectedAuditForForum(audit);
  setForumModalVisible(true);
};

  const submitNcrReview = async () => {
    if (!reviewApproved && !reviewComment.trim()) {
      addToast("Please enter rejection reason", "error");
      return;
    }
    if (!reviewingNcr) return;
    try {
      const newStatus = reviewApproved ? "APPROVED" : "REJECTED";
      await apiFetch(`/ncr/${reviewingNcr.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus,
          comment: reviewComment,
          reviewedBy: user?.name,
          reviewedAt: new Date().toISOString(),
        }),
      });
      addToast(
        reviewApproved ? "NCR approved successfully" : "NCR rejected",
        "success",
      );
      setShowNcrReviewModal(false);
      await fetchAuditeeData(selectedYear);
    } catch (error) {
      addToast("Failed to review NCR", "error");
    }
  };

  const filteredAudits = completedAuditsForReview.filter(
    (audit: any) =>
      !searchQuery ||
      audit.auditType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.department?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isFetching) {
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
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}
    >
      {activeNcrViewConfig ? (
        renderActiveNcrView()
      ) : activeReportConfig ? (
        renderActiveReport()
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
            <View className="flex-row flex-wrap items-start justify-between gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-slate-800">
                  Auditee Dashboard
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Welcome back,{" "}
                  <Text className="font-semibold text-slate-700">
                    {user?.name || user?.email || "Auditee"}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={refreshing}
                className="flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl"
              >
                {refreshing ? (
                  <ActivityIndicator
                    size="small"
                    color={NAVBAR_COLORS.primary}
                  />
                ) : (
                  <RefreshCw size={18} color="#475569" />
                )}
                <Text className="text-sm font-semibold text-slate-700">
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>

            {/* ✅ Dashboard Overview Stats (ONLY shows on "my-audits" tab) */}
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
                    Dashboard Overview
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
                    <FileText size={32} color="#2563eb" />
                  </View>
                  <Text className="text-lg font-semibold text-slate-700">
                    No audit forms available
                  </Text>
                  <Text className="mt-1 text-sm text-slate-500">
                    When audits are completed, forms will appear here for review
                  </Text>
                </View>
              ) : viewMode === "grid" ? (
                <View className="flex-row flex-wrap gap-8">
                  {filteredAudits.map((audit: any, index: number) => (
                    <View
                      key={audit.id || index}
                      style={{ width: gridCardWidth as any }}
                    >
                      <AuditCard
                        audit={audit}
                        onViewReport={handleViewReport}
                        onApprove={handleApprove}
                        onReject={handleRejectClick}
                        formDetails={audit.formDetails}
                        totalForms={audit.totalForms}
                        completedForms={audit.completedForms}
                        onOpenForum={handleOpenForum}  // ✅ Change this
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View className="gap-3">
                  {filteredAudits.map((audit: any, index: number) => (
                    <AuditListItem
                      key={audit.id || index}
                      audit={audit}
                      onViewReport={handleViewReport}
                      onApprove={handleApprove}
                      onReject={handleRejectClick}
                      formDetails={audit.formDetails}
                      totalForms={audit.totalForms}
                      completedForms={audit.completedForms}
                      onOpenForum={handleOpenForum}  // ✅ Change this
                    />
                  ))}
                </View>
              ))}

            {/* ✅ UPDATED: NCR Overview Stats (Uses StatCardsContainer for proper width) */}
            {(activeTab === "ncr-pending" || activeTab === "my-ncrs") && (
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
            {/* NCR Tabs */}
            {activeTab === "ncr-pending" && (
  <NcrPendingList
    pendingNcrAudits={pendingNcrReviews}
    onViewNcr={(id: string) => setActiveNcrViewConfig({ id })}
    onOpenForum={handleOpenForum}  // ✅ ADD THIS
  />
)}
            {activeTab === "my-ncrs" && (
  <NcrListTab
    assignedNCRs={assignedNCRs}
    onViewNcr={(id: string) => setActiveNcrViewConfig({ id })}
    onOpenForum={handleOpenForum}  // ✅ UPDATE THIS
  />
)}
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="items-center justify-center flex-1 bg-slate-900/60"
        >
          <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
            <Text className="mb-4 text-lg font-bold text-slate-800">
              Reject Form
            </Text>
            <Text className="mb-4 text-sm text-slate-600">
              Please provide rejection reason:
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason..."
              multiline
              numberOfLines={3}
              className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl"
            />
            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReject}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md bg-rose-600"
              >
                <Text>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showNcrReviewModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="items-center justify-center flex-1 bg-slate-900/60"
        >
          <View className="w-[90%] max-w-md p-6 bg-white shadow-2xl rounded-3xl border border-slate-100">
            <Text className="mb-4 text-lg font-bold text-slate-800">
              {reviewApproved ? "Approve" : "Reject"} NCR
            </Text>
            <Text className="mb-4 text-sm text-slate-600">
              {reviewApproved
                ? "Approval comment (optional)"
                : "Rejection reason (required)"}
            </Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Comment..."
              multiline
              numberOfLines={3}
              className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl"
            />
            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setShowNcrReviewModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white"
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitNcrReview}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md ${
                  reviewApproved ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                <Text>{reviewApproved ? "Approve" : "Reject"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    </SafeAreaView>
  );
}
