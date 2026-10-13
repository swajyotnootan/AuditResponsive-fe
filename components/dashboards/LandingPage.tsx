// src/screens/LandingPage.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { Picker } from "@react-native-picker/picker";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import axios from "axios";
import { format } from "date-fns";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { G, Line, Path, Rect } from "react-native-svg";

// Icons
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  Grid,
  ListChecks,
  Search,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react-native";

// Components
import { useAuth } from "../context/AuthContext";
import FinalPreview from "../eightd/steps/FinalPreview";
import ForumThreadView from "../forum/ForumThreadView";

console.log("🚀 LandingPage API Base URL being used:", API_BASE_URL);

const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];

// --- TypeScript Interfaces ---
interface StepSummaryItem {
  filled: boolean;
  complete: boolean;
  summary: string;
}

interface RawEventData {
  eventNo: string;
  status?: string;
  d0_id?: string | null;
  d1_id?: string | null;
  d2_id?: string | null;
  d3_id?: string | null;
  d4_id?: string | null;
  d5_id?: string | null;
  d6_id?: string | null;
  d7_id?: string | null;
  d8_id?: string | null;
  content?: any;
  createdAt?: string;
  initiatorEmail?: string;
  rejectionComment?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  isNcrBased?: boolean;
  sourceType?: string;
  sourceNcrId?: string;
  sourceNcrNumber?: string;
  [key: string]: any;
}

interface ParsedEvent {
  eventNo: string;
  title: string;
  owner: string;
  status: string;
  created: string;
  currentStep: string;
  content: any;
  stepSummary: Record<string, StepSummaryItem>;
  completedSteps: number;
  totalSteps: number;
  createdAt?: string;
  isApprovalPending: boolean;
  rejectionReason: string | null;
  hodRemarks: string | null;
  rejectedBy?: string;
  rejectedAt?: string;
  isNcrBased: boolean;
  d0_id?: string | null;
  d1_id?: string | null;
  d2_id?: string | null;
  d3_id?: string | null;
  d4_id?: string | null;
  d5_id?: string | null;
  d6_id?: string | null;
  d7_id?: string | null;
  d8_id?: string | null;
  // ✅ NEW: plant/company info from backend
  plantId?: number | null;
  plantCode?: string | null;
  plantName?: string | null;
  companyId?: number | null;
  companyCode?: string | null;
  companyName?: string | null;
}

// --- Utility Functions ---
function getCurrentStep(eventData: RawEventData | null): string {
  if (!eventData) return "D0";
  const completedSteps: string[] = [];
  if (eventData.d0_id) completedSteps.push("D0");
  if (eventData.d1_id) completedSteps.push("D1");
  if (eventData.d2_id) completedSteps.push("D2");
  if (eventData.d3_id) completedSteps.push("D3");
  if (eventData.d4_id) completedSteps.push("D4");
  if (eventData.d5_id) completedSteps.push("D5");
  if (eventData.d6_id) completedSteps.push("D6");
  if (eventData.d7_id) completedSteps.push("D7");
  if (eventData.d8_id) completedSteps.push("D8");
  return completedSteps.length > 0
    ? completedSteps[completedSteps.length - 1]
    : "D0";
}

const getTeamMembersForEvent = async (
  eventId: string,
  userId?: string | number | null,
): Promise<string[]> => {
  if (!eventId) return [];
  try {
    const response = await axios.get<{ success: boolean; data: any }>(
      `${API_BASE_URL}/api/eightd/data/${eventId}`,
      {
        headers: {
          "X-User-Id": String(userId ?? ""),
          "X-Timezone":
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        },
      },
    );
    if (response.data?.success && response.data.data) {
      const d0Data = response.data.data.content?.d0?.[0] || {};
      return Array.isArray(d0Data.additionalEmails)
        ? d0Data.additionalEmails
        : [];
    }
    return [];
  } catch (error) {
    console.error("❌ Failed to fetch team members:", error);
    return [];
  }
};

function getNextStep(eventData: RawEventData | null): string {
  if (!eventData) return "D0";
  for (let i = 0; i < steps.length; i++) {
    const stepIdField = `d${i}_id` as keyof RawEventData;
    if (!eventData[stepIdField]) return steps[i];
  }
  return "D8";
}

function getStepSummary(eventData: RawEventData): {
  summary: Record<string, StepSummaryItem>;
  completedSteps: number;
  totalSteps: number;
} {
  const summary: Record<string, StepSummaryItem> = {};
  let completedSteps = 0;
  steps.forEach((step, index) => {
    const stepIdField = `d${index}_id` as keyof RawEventData;
    const isCompleted = !!eventData[stepIdField];
    if (isCompleted) completedSteps++;
    summary[step] = {
      filled: isCompleted,
      complete: isCompleted,
      summary: isCompleted ? "Completed" : "Not started",
    };
  });
  return { summary, completedSteps, totalSteps: steps.length };
}

function isNcrBasedEvent(eventData: RawEventData | null | undefined): boolean {
  if (!eventData) return false;
  const d0Data = Array.isArray(eventData?.content?.d0)
    ? eventData.content.d0[0]
    : null;
  return Boolean(
    d0Data?.sourceNcrId ||
    d0Data?.sourceNcrNumber ||
    d0Data?.isNcrBased ||
    d0Data?.sourceType === "ncr" ||
    eventData?.isNcrBased ||
    eventData?.sourceType === "ncr" ||
    String(eventData?.eventNo || "").startsWith("8D-"),
  );
}

function isDraftLikeStatus(status: string | null | undefined): boolean {
  return ["draft", "open", "initiated"].includes(
    String(status || "").toLowerCase(),
  );
}

function determineFunctionalStatus(
  eventData: RawEventData & { status: string; currentStep: string },
): string {
  const { completedSteps, totalSteps } = getStepSummary(eventData);
  const currentStatus = eventData.status || "Open";
  const currentStep = eventData.currentStep;

  if (completedSteps === totalSteps) return "Closed";
  if (
    eventData.d0_id &&
    !eventData.d1_id &&
    currentStatus === "Approval Pending"
  )
    return "Approval Pending";
  if (eventData.d0_id && !eventData.d1_id && currentStatus === "Rejected")
    return "Rejected";
  if (currentStep === "D0") {
    if (isDraftLikeStatus(currentStatus)) {
      const normalized = String(currentStatus).toLowerCase();
      if (normalized === "draft") return "Draft";
      if (normalized === "initiated") return "Initiated";
      return "Open";
    }
    return "D0 Approved";
  }
  if (["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"].includes(currentStep))
    return "In Progress";
  if (currentStatus === "Approved" && completedSteps === 0)
    return "D0 Approved";
  return currentStatus;
}

const statusColors: Record<string, string> = {
  Open: "#7aa6eeff",
  Closed: "#7973ebff",
  Initiated: "#f59e0b",
  Draft: "#6b7280",
  Submitted: "#8b5cf6",
  "Approval Pending": "#f59e0b",
  "In Progress": "#3b82f6",
  Rejected: "#ef4444",
  "D0 Approved": "#10b981",
};

// --- Sub-Components ---
const StatusProgress = ({
  status,
  count,
  color,
  percentage,
}: {
  status: string;
  count: number;
  color: string;
  percentage: number;
}) => (
  <View className="flex-row items-center justify-between px-1 py-2.5">
    <View className="flex-1 flex-row items-center gap-2">
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Text
        className="text-xs font-semibold text-slate-700"
        style={{ minWidth: 95 }}
        numberOfLines={1}
      >
        {status}
      </Text>
      <View className="max-w-[140px] flex-1">
        <View className="h-2 w-full rounded-full bg-slate-100">
          <View
            className="h-2 rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    </View>
    <View className="min-w-[60px] items-end pl-2">
      <Text className="text-sm font-bold text-slate-800">{count}</Text>
      <Text className="text-[10px] font-medium text-slate-500">
        {percentage}%
      </Text>
    </View>
  </View>
);

const StepProgress = ({
  data,
  completionRate,
}: {
  data: { step: string; count: number }[];
  completionRate: number;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 768;

  // 1. Dynamic chart height based on screen size
  const chartHeight = isMobile ? 150 : 180;

  // 2. Prevent division by zero if all counts are 0
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View
      className="rounded-2xl border border-slate-100 bg-white shadow-sm"
      style={{
        padding: isMobile ? 16 : 24,
        flex: isDesktop ? 1 : undefined,
        width: isDesktop ? "50%" : "100%",
        maxWidth: isDesktop ? undefined : width - 32, // Prevents overflow on small mobile screens
      }}
    >
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="rounded-lg bg-emerald-50 p-2">
            <BarChart3 size={20} color="#10b981" />
          </View>
          <Text className="text-base font-bold text-slate-800">
            Step Progress
          </Text>
        </View>
        <View className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
          <Text className="text-xs font-bold text-emerald-600">
            {completionRate}% Done
          </Text>
        </View>
      </View>

      {/* Chart Area */}
      <View style={{ width: "100%" }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            height: chartHeight,
            paddingBottom: 28, // Reserved space at the bottom for the text labels
          }}
        >
          {data.map((item, index) => {
            // 3. CRITICAL FIX: Calculate height in PIXELS, not percentages
            const maxBarHeight = chartHeight - 28;
            const barHeight = Math.max(
              (item.count / maxCount) * maxBarHeight,
              4, // Minimum 4px height so empty steps still show a tiny baseline
            );

            return (
              <View
                key={index}
                style={{
                  flex: 1,
                  marginHorizontal: isMobile ? 2 : 4,
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                {/* The Bar */}
                <View
                  style={{
                    height: barHeight,
                    width: isMobile ? "65%" : "50%", // Thinner bars on desktop for a cleaner look
                    backgroundColor: item.count > 0 ? "#6366F1" : "#E0E7FF",
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                  }}
                />

                {/* The Label (D0, D1, etc.) */}
                <Text
                  style={{
                    position: "absolute",
                    bottom: 0,
                    textAlign: "center",
                    color: "#64748B",
                    fontWeight: "600",
                    fontSize: isMobile ? 10 : 12,
                    width: "100%",
                  }}
                >
                  {item.step}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ── MiniFishbone (Deliverable 10) ──
type MiniCategory = {
  id: string;
  label: string;
  side: "top" | "bottom";
  causes: { id: string; text: string }[];
};

function MiniFishbone({
  categories,
  onPress,
}: {
  categories: MiniCategory[];
  onPress?: () => void;
}) {
  const W = 320;
  const H = 80;
  const spineY = H / 2;
  const startX = 12;
  const endX = W - 24;
  const usable = endX - startX;
  const count = categories.length;

  return (
    <Pressable
      testID="mini-fishbone-preview"
      onPress={onPress}
      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      style={{ height: H }}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line
          x1={startX}
          y1={spineY}
          x2={endX}
          y2={spineY}
          stroke="#1E40AF"
          strokeWidth={2}
        />
        <Path
          d={`M ${endX} ${spineY} L ${endX - 8} ${spineY - 5} L ${endX - 8} ${
            spineY + 5
          } Z`}
          fill="#1E40AF"
        />
        {categories.slice(0, 6).map((cat, i) => {
          const step = usable / (count + 1);
          const x = startX + step * (i + 1);
          const isTop = cat.side === "top";
          const boneEndY = isTop ? spineY - 24 : spineY + 24;
          const boneEndX = x - 8;
          return (
            <G key={cat.id}>
              <Line
                x1={x}
                y1={spineY}
                x2={boneEndX}
                y2={boneEndY}
                stroke="#3B82F6"
                strokeWidth={1.5}
              />
              <Rect
                x={boneEndX - 12}
                y={isTop ? boneEndY - 10 : boneEndY - 2}
                width={24}
                height={10}
                rx={2}
                fill="#DBEAFE"
              />
              {cat.causes.slice(0, 3).map((c, ci) => {
                const t = (ci + 1) / (cat.causes.length + 1);
                const cx = x + (boneEndX - x) * t;
                const cy = spineY + (boneEndY - spineY) * t;
                return (
                  <Rect
                    key={c.id}
                    x={cx - 2}
                    y={cy - 2}
                    width={4}
                    height={4}
                    rx={1}
                    fill="#3B82F6"
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>
      <View className="absolute right-2 top-1.5 rounded bg-white/90 px-1.5 py-0.5">
        <Text className="text-[9px] font-bold text-blue-700">
          RCA · Tap to open
        </Text>
      </View>
    </Pressable>
  );
}

export interface LandingPageProps {
  type?: "fresh" | "ncr" | "all" | string;
}

export default function LandingPage({ type }: LandingPageProps) {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { isInitiator, isHOD, user, isAdmin } = useAuth();
  const { width, height } = useWindowDimensions();

  const isDesktop = width >= 768;
  const isLargeDesktop = width >= 1024;

  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stepSort, setStepSort] = useState("None");
  const [viewLimit, setViewLimit] = useState("All");
  const [loading, setLoading] = useState(false);
  const [forumDrawerOpen, setForumDrawerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showRejectionReason, setShowRejectionReason] = useState(false);
  const [selectedRejectionEvent, setSelectedRejectionEvent] =
    useState<ParsedEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ParsedEvent | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembersMap, setTeamMembersMap] = useState<
    Record<string, string[]>
  >({});

  // 🔍 DEBUG — inspect the auth user
  useEffect(() => {
    console.log("═══════════════════════════════════════");
    console.log("🔍 [LandingPage] user object:", JSON.stringify(user, null, 2));
    console.log("🔍 [LandingPage] user?.id:", user?.id);
    console.log("🔍 [LandingPage] user?.userId:", (user as any)?.userId);
    console.log("🔍 [LandingPage] user?.plantId:", (user as any)?.plantId);
    console.log("🔍 [LandingPage] user?.plantName:", (user as any)?.plantName);
    console.log("🔍 [LandingPage] user?.companyId:", (user as any)?.companyId);
    console.log("═══════════════════════════════════════");
  }, [user]);

  // ✅ Dynamic Padding & Math for perfect responsive grids
  const horizontalPadding = isLargeDesktop ? 96 : isDesktop ? 64 : 16;

  const kpiCardWidth = isDesktop
    ? (width - horizontalPadding * 2 - 36) / 4
    : (width - horizontalPadding * 2 - 12) / 2;

  const chartWidth = isDesktop
    ? (width - horizontalPadding * 2) / 2 - 48
    : width - horizontalPadding * 2 - 32;

  const dashboardType = type || route.params?.type || "all";
  const dashboardTitle =
    dashboardType === "fresh"
      ? "Fresh 8D Dashboard"
      : dashboardType === "ncr"
        ? "NCR Based 8D Dashboard"
        : "8D Dashboard";
  const dashboardSubtitle =
    dashboardType === "fresh"
      ? "Showing only freshly created 8D forms"
      : dashboardType === "ncr"
        ? "Showing only NCR-based 8D forms"
        : "Showing all 8D forms";

  const createNew8D = () => {
    console.log("🆕 [LANDING] Creating new 8D with resetKey:", Date.now());

    router.push({
      pathname: "/eightdflow",
      params: {
        eventId: null, // ✅ Must be actual null, not string "null"
        step: "D0",
        type: dashboardType,
        isNcrBased: String(dashboardType === "ncr"),
        isHOD: String(isHOD),
        resetKey: Date.now(), // ✅ Unique key every time
      },
    });
  };

  const fetchFullRecordData = async (eventNo: string) => {
    try {
      const response = await axios.get<{ success: boolean; data: any }>(
        `${API_BASE_URL}/api/eightd/data/${eventNo}`,
        {
          headers: {
            "X-User-Id": String((user as any)?.id ?? ""),
            "X-Timezone":
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "Asia/Kolkata",
          },
        },
      );
      return response.data?.success ? response.data.data || {} : null;
    } catch (err) {
      console.error("Failed to fetch full record ", eventNo, err);
      return null;
    }
  };

  const continueForm = async (ev: ParsedEvent) => {
    // ✅ NEW: Log the exact event being clicked
    console.log(
      "🚀 [LandingPage] User clicked to continue form for Event ID:",
      ev.eventNo,
    );

    if (ev.status === "Rejected") {
      Alert.alert(
        "Error",
        "This document was rejected and cannot be accessed or edited.",
      );
      return;
    }
    if (isHOD && ev.status === "Approval Pending") {
      setActiveEventId(ev.eventNo);
      setShowPreview(true);
      return;
    }
    if (!isInitiator && !isAdmin) {
      setActiveEventId(ev.eventNo);
      setShowPreview(true);
      return;
    }
    if (ev.status === "Approval Pending") {
      Alert.alert(
        "Warning",
        "HOD approval is required before proceeding to D1.",
      );
      return;
    }

    const shouldStartFromD0 = ev.isNcrBased && isDraftLikeStatus(ev.status);
    const nextStep = shouldStartFromD0 ? "D0" : getNextStep(ev);

    console.log("🚀 [LandingPage] Routing to /eightdflow with params:", {
      eventId: ev.eventNo,
      step: nextStep,
    });

    router.push({
      pathname: "/eightdflow",
      params: {
        eventId: ev.eventNo, // This is correctly using ev.eventNo
        step: nextStep,
        isNcrBased: String(ev.isNcrBased),
        type: ev.isNcrBased ? "ncr" : "fresh",
        isHOD: String(isHOD),
      },
    });
  };

  const fetchEvents = async () => {
    console.log(
      "🚀 [LandingPage] fetchEvents → X-User-Id:",
      (user as any)?.id,
      "plant:",
      (user as any)?.plantId,
      "dashboardType:",
      dashboardType,
    );
    setLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: RawEventData[] }>(
        `${API_BASE_URL}/api/eightd/data?t=` + Date.now(),
        {
          headers: {
            "X-User-Id": String((user as any)?.id ?? ""),
            "X-Timezone":
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "Asia/Kolkata",
          },
        },
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        const parsed: ParsedEvent[] = res.data.data.map((item) => {
          let status = item.status || "Open";
          const statusMap: Record<string, string> = {
            IN_PROGRESS: "In Progress",
            "in progress": "In Progress",
            "approval pending": "Approval Pending",
            REJECTED: "Rejected",
            rejected: "Rejected",
            Reject: "Rejected",
            REJECT: "Rejected",
            STATUS_REJECTED: "Rejected",
            APPROVED: "D0 Approved",
            approved: "D0 Approved",
            D0_APPROVED: "D0 Approved",
            DRAFT: "Draft",
            draft: "Draft",
            OPEN: "Open",
            open: "Open",
            INITIATED: "Initiated",
            initiated: "Initiated",
          };
          status = statusMap[status] || status;
          const currentStep = getCurrentStep(item);
          status = determineFunctionalStatus({ ...item, status, currentStep });

          const dateStr = item.createdAt ? String(item.createdAt) : "";
          const created = dateStr
            ? format(new Date(dateStr), "dd/MM/yyyy HH:mm")
            : "N/A";
          const stepSummaryData = getStepSummary(item);

          return {
            eventNo: item.eventNo,
            title: item.eventNo,
            owner:
              item.initiatorEmail ||
              (user as any)?.name ||
              (user as any)?.email ||
              "Unassigned",
            status,
            created,
            currentStep,
            content: item.content || {},
            stepSummary: stepSummaryData.summary,
            completedSteps: stepSummaryData.completedSteps,
            totalSteps: stepSummaryData.totalSteps,
            createdAt: item.createdAt,
            isApprovalPending: status === "Approval Pending",
            rejectionReason:
              item.rejectionComment ||
              (item.content && item.content.rejectionComment) ||
              null,
            hodRemarks: item.rejectedBy
              ? `Rejected by: ${item.rejectedBy}`
              : null,
            rejectedBy: item.rejectedBy,
            rejectedAt: item.rejectedAt,
            isNcrBased: isNcrBasedEvent(item),
            d0_id: item.d0_id,
            d1_id: item.d1_id,
            d2_id: item.d2_id,
            d3_id: item.d3_id,
            d4_id: item.d4_id,
            d5_id: item.d5_id,
            d6_id: item.d6_id,
            d7_id: item.d7_id,
            d8_id: item.d8_id,
            plantId: item.plantId ?? null,
            plantCode: item.plantCode ?? null,
            plantName: item.plantName ?? null,
            companyId: item.companyId ?? null,
            companyCode: item.companyCode ?? null,
            companyName: item.companyName ?? null,
          };
        });
        parsed.sort(
          (a, b) =>
            new Date(b.createdAt || "").getTime() -
            new Date(a.createdAt || "").getTime(),
        );
        setEvents(parsed);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      Alert.alert("Error", "Failed to fetch events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchEvents();
  }, [user?.id, (user as any)?.plantId]);

  useEffect(() => {
    const fetchAllTeamMembers = async () => {
      if (!events.length) return;
      const membersMap: Record<string, string[]> = {};
      for (const event of events) {
        if (event.eventNo) {
          membersMap[event.eventNo] = await getTeamMembersForEvent(
            event.eventNo,
            (user as any)?.id,
          );
        }
      }
      setTeamMembersMap(membersMap);
    };
    fetchAllTeamMembers();
  }, [events]);

  const showPreviewWithLatestData = (ev: ParsedEvent) => {
    setActiveEventId(ev.eventNo);
    setShowPreview(true);
  };

  useEffect(() => {
    fetchEvents();
  }, [route.params?.refreshToken]); // Triggers when EightDFlow sends the new token

  // Optional: Also refresh when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, []),
  );
  const showRejectionDetails = async (ev: ParsedEvent) => {
    if (!ev.rejectionReason) {
      try {
        const fullData = await fetchFullRecordData(ev.eventNo);
        if (fullData) {
          setSelectedRejectionEvent({
            ...ev,
            rejectionReason:
              fullData.rejectionComment || "No specific reason provided",
            hodRemarks: fullData.rejectedBy
              ? `Rejected by: ${fullData.rejectedBy}`
              : ev.hodRemarks,
          });
        } else {
          setSelectedRejectionEvent(ev);
        }
      } catch {
        setSelectedRejectionEvent(ev);
      }
    } else {
      setSelectedRejectionEvent(ev);
    }
    setShowRejectionReason(true);
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/api/eightd/data/${eventToDelete.eventNo}`,
        {
          headers: {
            "X-User-Id": String((user as any)?.id ?? ""),
            "X-Timezone":
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "Asia/Kolkata",
          },
        },
      );
      fetchEvents();
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 3000);
    } catch {
      Alert.alert("Error", "Failed to delete record.");
    }
  };

  const scopedEvents = useMemo(() => {
    let result = events;

    // 1. Filter by dashboard type (fresh vs ncr)
    if (dashboardType === "fresh") {
      result = result.filter((e) => !e.isNcrBased);
    } else if (dashboardType === "ncr") {
      result = result.filter((e) => e.isNcrBased);
    }

    // 2. ✅ HOD FILTER: Hide unsubmitted (Draft/Open/Initiated) events from HOD view
    // HODs should only see events that have been submitted for their attention or are already in progress
    if (isHOD) {
      result = result.filter(
        (e) => !["Draft", "Open", "Initiated"].includes(e.status),
      );
    }

    return result;
  }, [dashboardType, events, isHOD]); // ✅ Added isHOD to dependencies
  const filtered = useMemo(() => {
    let list = [...scopedEvents];
    if (statusFilter !== "All")
      list = list.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) ||
          e.owner.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (stepSort === "StepSort") {
      list.sort(
        (a, b) => steps.indexOf(a.currentStep) - steps.indexOf(b.currentStep),
      );
    } else if (steps.includes(stepSort)) {
      list = list.filter((e) => e.currentStep === stepSort);
    }

    return list;
  }, [scopedEvents, search, statusFilter, stepSort]);

  const limitedFiltered =
    viewLimit === "All" ? filtered : filtered.slice(0, parseInt(viewLimit));
  const totalEvents = scopedEvents.length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "In Progress": 0,
      Rejected: 0,
      "Approval Pending": 0,
      "D0 Approved": 0,
      Closed: 0,
    };
    scopedEvents.forEach((event) => {
      if (counts.hasOwnProperty(event.status)) counts[event.status]++;
    });
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      color: statusColors[label] || "#94a3b8",
      percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
    }));
  }, [scopedEvents, totalEvents]);

  const stepCounts = useMemo(
    () =>
      steps.map((s) => ({
        step: s,
        count: scopedEvents.filter((e) => e.currentStep === s).length,
      })),
    [scopedEvents],
  );

  const completionRate = useMemo(() => {
    if (scopedEvents.length === 0) return 0;
    const totalStepsPossible = scopedEvents.length * steps.length;
    const completedStepsTotal = scopedEvents.reduce(
      (sum, event) => sum + event.completedSteps,
      0,
    );
    return Math.round((completedStepsTotal / totalStepsPossible) * 100);
  }, [scopedEvents]);

  const renderEventCard = (ev: ParsedEvent) => {
    const isApprovalPending = ev.status === "Approval Pending";

    return (
      <View
        className={`overflow-hidden rounded-xl border bg-white shadow-md ${
          isApprovalPending ? "border-2 border-amber-400" : "border-slate-100"
        }`}
        style={{
          backgroundColor: isApprovalPending ? "#fffbeb" : "#ffffff",
          marginBottom: 16,
          // ✅ FIXED: Use exact 33.333% width - NO flex expansion
          width: isDesktop ? "32.5%" : "100%",
          // ✅ Add spacing between cards
          marginHorizontal: isDesktop ? 4 : 0,
        }}
      >
        {isApprovalPending && (
          <View className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5">
            <Text className="text-center text-xs font-bold tracking-wide text-white">
              ⚡ AWAITING HOD APPROVAL
            </Text>
          </View>
        )}

        <View className={isDesktop ? "p-3" : "p-4"}>
          {/* ... rest of the card content remains exactly the same ... */}
          <View className="mb-3 flex-row items-start justify-between">
            <View className="rounded-full bg-slate-100 px-3 py-1.5">
              <Text
                className="text-xs font-bold"
                style={{ color: statusColors[ev.status] || "#64748b" }}
              >
                {ev.status}
              </Text>
            </View>

            {(isInitiator || isAdmin) && (
              <TouchableOpacity
                onPress={() => {
                  setEventToDelete(ev);
                  setShowDeleteConfirm(true);
                }}
                className="rounded-lg bg-red-50 p-2 active:bg-red-100"
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <Text
            className={`mb-2 font-bold text-slate-800 ${
              isDesktop ? "text-base" : "text-lg"
            }`}
            numberOfLines={1}
          >
            {ev.title}
          </Text>

          <Text
            className={`font-medium text-slate-600 ${
              isDesktop ? "text-[10px]" : "text-xs"
            }`}
            numberOfLines={1}
          >
            Owner: {ev.owner}
          </Text>

          <View className="mb-4 flex-row items-center gap-2">
            <Clock size={isDesktop ? 12 : 14} color="#64748b" />
            <Text className="text-xs font-medium text-slate-600">
              Created: {ev.created}
            </Text>
          </View>

          <View className="mb-2 flex-row items-center justify-between">
            <View
              className={`rounded-lg border border-indigo-100 bg-indigo-50 ${
                isDesktop ? "px-2 py-1" : "px-3 py-1.5"
              }`}
            >
              <Text
                className={`font-bold text-indigo-700 ${
                  isDesktop ? "text-[10px]" : "text-xs"
                }`}
              >
                Current Step: {ev.currentStep}
              </Text>
            </View>
            <Text className="text-xs font-bold text-slate-600">
              {ev.completedSteps}/{ev.totalSteps} Steps
            </Text>
          </View>

          <View
            className={`w-full overflow-hidden rounded-full bg-slate-100 ${
              isDesktop ? "mb-3 h-2" : "mb-5 h-2.5"
            }`}
          >
            <View
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
              style={{ width: `${(ev.completedSteps / ev.totalSteps) * 100}%` }}
            />
          </View>

          {/* ✅ STRICT SINGLE ROW: flex-row (no wrap), flex-1 for equal sharing */}
          <View className="mt-2 flex-row gap-2">
            {/* 1. View Details Button (Conditionally shown) */}
            {(ev.status !== "Approval Pending" || isHOD) && (
              <TouchableOpacity
                onPress={() => showPreviewWithLatestData(ev)}
                className={`flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 active:bg-slate-100 ${
                  isDesktop ? "px-1 py-1.5" : "px-1 py-2"
                }`}
              >
                <Text
                  className={`font-semibold text-slate-700 ${
                    isDesktop ? "text-[10px]" : "text-[11px]"
                  }`}
                  numberOfLines={1}
                >
                  Details
                </Text>
              </TouchableOpacity>
            )}

            {/* 2. Dynamic Action Button based on Status and Role */}
            {ev.status === "Rejected" ? (
              <TouchableOpacity
                onPress={() => showRejectionDetails(ev)}
                className="flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-1 py-2 active:bg-red-100"
              >
                <AlertCircle size={12} color="#dc2626" />
                <Text
                  className="text-[11px] font-semibold text-red-700"
                  numberOfLines={1}
                >
                  Reason
                </Text>
              </TouchableOpacity>
            ) : ev.status === "Approval Pending" ? (
              isHOD ? (
                <TouchableOpacity
                  onPress={() => continueForm(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-1 py-2 active:bg-blue-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    Review
                  </Text>
                </TouchableOpacity>
              ) : isInitiator || isAdmin ? (
                <View className="flex-1 items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-1 py-2">
                  <Text
                    className="text-[11px] font-semibold text-yellow-700"
                    numberOfLines={1}
                  >
                    Pending
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => showPreviewWithLatestData(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-1 py-2 active:bg-blue-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    View
                  </Text>
                </TouchableOpacity>
              )
            ) : ev.status === "Submitted" || ev.status === "Closed" ? (
              <TouchableOpacity
                onPress={() => showPreviewWithLatestData(ev)}
                className="flex-1 items-center justify-center rounded-lg bg-purple-600 px-1 py-2 active:bg-purple-700"
              >
                <Text
                  className="text-[11px] font-semibold text-white"
                  numberOfLines={1}
                >
                  View Details
                </Text>
              </TouchableOpacity>
            ) : ev.status === "D0 Approved" ? (
              isInitiator || isAdmin ? (
                <TouchableOpacity
                  onPress={() => continueForm(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-green-600 px-1 py-2 active:bg-green-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    Continue
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => showPreviewWithLatestData(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-1 py-2 active:bg-blue-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    View
                  </Text>
                </TouchableOpacity>
              )
            ) : ev.isNcrBased && isDraftLikeStatus(ev.status) ? (
              isInitiator || isAdmin ? (
                <TouchableOpacity
                  onPress={() => continueForm(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-green-600 px-1 py-2 active:bg-green-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    Start
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => showPreviewWithLatestData(ev)}
                  className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-1 py-2 active:bg-blue-700"
                >
                  <Text
                    className="text-[11px] font-semibold text-white"
                    numberOfLines={1}
                  >
                    View
                  </Text>
                </TouchableOpacity>
              )
            ) : isInitiator || isAdmin ? (
              <TouchableOpacity
                onPress={() => continueForm(ev)}
                className="flex-1 items-center justify-center rounded-lg bg-green-600 px-1 py-2 active:bg-green-700"
              >
                <Text
                  className="text-[11px] font-semibold text-white"
                  numberOfLines={1}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => showPreviewWithLatestData(ev)}
                className="flex-1 items-center justify-center rounded-lg bg-blue-600 px-1 py-2 active:bg-blue-700"
              >
                <Text
                  className="text-[11px] font-semibold text-white"
                  numberOfLines={1}
                >
                  View
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. Forum Button */}
            <TouchableOpacity
              onPress={() => {
                setSelectedGroupId(ev.eventNo);
                setForumDrawerOpen(true);
              }}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-indigo-600 px-1 py-2 active:bg-indigo-700"
            >
              <Users size={12} color="#ffffff" />
              <Text
                className="text-[11px] font-semibold text-white"
                numberOfLines={1}
              >
                Forum
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3b82f6"]}
            tintColor="#3b82f6"
          />
        }
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: horizontalPadding,
        }}
      >
        {/* ✅ RESPONSIVE HEADER */}
        {isDesktop ? (
          // DESKTOP HEADER (Original Layout Restored)
          <View className="mb-6 flex-row items-start justify-between gap-4">
            <View className="flex-1 flex-row items-center gap-4">
              <View className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg">
                <Grid size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-extrabold text-slate-800">
                  {dashboardTitle}
                </Text>
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <CalendarDays size={16} color="#64748b" />
                  <Text className="text-sm font-medium text-slate-600">
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-slate-500">
                  {dashboardSubtitle}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1 flex-row items-center gap-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-3.5 shadow-md">
                {/* ✅ FIXED: Inline rgba guarantees translucent blue on mobile, bypassing NativeWind opacity bugs */}
                <View
                  className="rounded-lg p-2"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.25)" }}
                >
                  <FileText size={20} color="#ffffff" />
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                    Total 8D
                  </Text>
                  <Text className="text-xl font-extrabold leading-tight text-white">
                    {totalEvents}
                  </Text>
                </View>
              </View>

              {(isInitiator || isAdmin) && dashboardType !== "ncr" && (
                <TouchableOpacity
                  onPress={createNew8D}
                  className="flex-row items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 shadow-md active:opacity-90"
                >
                  <Zap size={16} color="#ffffff" />
                  <Text className="text-sm font-bold text-white">
                    New 8D Event
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          // MOBILE HEADER (Optimized Stacked Layout)
          <View className="mb-6">
            <View className="mb-4 flex-row items-center gap-3">
              <View
                className="rounded-xl p-3 shadow-lg"
                style={{ backgroundColor: "#2563eb" }} // Solid blue-600
              >
                <Grid size={24} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xl font-extrabold text-slate-800"
                  numberOfLines={1}
                >
                  {dashboardTitle}
                </Text>
                <View className="mt-1 flex-row items-center gap-1.5">
                  <CalendarDays size={14} color="#64748b" />
                  <Text
                    className="text-xs font-medium text-slate-600"
                    numberOfLines={1}
                  >
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between gap-3">
              {/* Outer Card with guaranteed blue background */}
              <View
                className="flex-1 flex-row items-center gap-3 rounded-xl px-4 py-3.5 shadow-md"
                style={{ backgroundColor: "#2563eb" }} // Solid blue-600
              >
                {/* Icon background - lighter blue */}
                <View
                  className="rounded-lg p-2"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  <FileText size={20} color="#ffffff" />
                </View>

                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                    Total 8D
                  </Text>
                  <Text className="text-xl font-extrabold leading-tight text-white">
                    {totalEvents}
                  </Text>
                </View>
              </View>

              {(isInitiator || isAdmin) && dashboardType !== "ncr" && (
                <TouchableOpacity
                  onPress={createNew8D}
                  style={{ backgroundColor: "#6366f1" }} // Solid indigo-500
                  className="flex-row items-center gap-2 rounded-xl px-4 py-3.5 shadow-md active:opacity-90"
                >
                  <Zap size={18} color="#ffffff" />
                  <Text className="text-sm font-bold text-white">New 8D</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              className="mt-3 text-xs font-medium text-slate-500"
              numberOfLines={2}
            >
              {dashboardSubtitle}
            </Text>
          </View>
        )}

        {loading && (
          <View className="items-center py-8">
            <View className="flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 shadow-sm">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-base font-medium text-slate-700">
                Loading dashboard data...
              </Text>
            </View>
          </View>
        )}

        {/* Analytics Dashboard */}
        {/* Analytics Dashboard */}
        <View className="mb-6">
          {/* ✅ FIXED: Use flex-row for desktop (equal columns), flex-wrap for mobile */}
          <View
            className={`mb-6 ${isDesktop ? "flex-row" : "flex-row flex-wrap"}`}
            style={{ gap: isDesktop ? 24 : 12 }}
          >
            {[
              {
                title: "Total 8D",
                value: totalEvents,
                icon: FileText,
                color: "#3b82f6",
                subtitle: "All 8D processes",
              },
              {
                title: "Completion Rate",
                value: `${completionRate}%`,
                icon: CheckSquare,
                color: "#10b981",
                subtitle: "Overall progress",
              },
              {
                title: "Avg. Time",
                value: "5.2 days",
                icon: Clock,
                color: "#8b5cf6",
                subtitle: "Resolution time",
              },
              {
                title: "Efficiency",
                value: "78%",
                icon: Target,
                color: "#f97316",
                subtitle: "Process efficiency",
              },
            ].map((card, index) => (
              <View
                key={index}
                className={`rounded-xl border border-slate-100 bg-white shadow-sm ${
                  isDesktop ? "flex-1 p-6" : "p-4" // ✅ More padding and flex-1 for desktop
                }`}
                style={{
                  width: isDesktop ? undefined : kpiCardWidth, // ✅ Let flexbox handle desktop width
                }}
              >
                <View className="mb-4 flex-row items-center justify-between">
                  <View
                    className="rounded-xl p-3" // ✅ Larger icon container on desktop
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon size={isDesktop ? 28 : 20} color={card.color} />
                  </View>
                </View>
                <Text
                  className={`mb-1 font-extrabold text-slate-800 ${
                    isDesktop ? "text-3xl" : "text-2xl" // ✅ Larger value text on desktop
                  }`}
                  numberOfLines={1}
                >
                  {card.value}
                </Text>
                <Text
                  className={`mb-1 font-bold text-slate-600 ${
                    isDesktop ? "text-sm" : "text-xs" // ✅ Larger title text on desktop
                  }`}
                  numberOfLines={1}
                >
                  {card.title}
                </Text>
                <Text
                  className={`font-medium text-slate-400 ${
                    isDesktop ? "text-xs" : "text-[10px]" // ✅ Larger subtitle text on desktop
                  }`}
                  numberOfLines={1}
                >
                  {card.subtitle}
                </Text>
              </View>
            ))}
          </View>

          {/* ... Keep the rest of your Step Progress and Status Breakdown charts exactly as they were ... */}

          <View className={`mb-6 gap-4 ${isDesktop ? "flex-row" : "flex-col"}`}>
            {/* Step Progress Chart */}
            <StepProgress data={stepCounts} completionRate={completionRate} />

            {/* Status Breakdown Chart - Keep as is */}
            <View
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              style={{
                flex: isDesktop ? 1 : undefined,
                width: isDesktop ? "50%" : "100%",
                maxWidth: isDesktop ? undefined : width - 32,
              }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-lg bg-orange-50 p-1.5">
                    <ListChecks size={18} color="#f97316" />
                  </View>
                  <Text className="text-sm font-bold text-slate-800">
                    Status Breakdown
                  </Text>
                </View>
              </View>
              <View className="gap-1">
                {statusCounts.map((item, index) => (
                  <View key={item.label}>
                    <StatusProgress
                      status={item.label}
                      count={item.count}
                      color={item.color}
                      percentage={item.percentage}
                    />
                    {index < statusCounts.length - 1 && (
                      <View className="ml-8 h-px bg-slate-100" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Event Management & Filters */}
        <View className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <View className="border-b border-slate-100 bg-slate-50/50 p-4">
            <Text className="mb-3 text-lg font-extrabold text-slate-800">
              8D Event Management
            </Text>

            {isDesktop ? (
              // ✅ DESKTOP: All filters in one single, perfectly aligned row
              <View className="flex-row items-center gap-4">
                {/* Search Input (Takes 2x the width of a single dropdown) */}
                <View
                  className="flex-row items-center rounded-xl border border-slate-200 bg-white px-4 shadow-sm"
                  style={{ flex: 2, height: 48 }}
                >
                  <Search size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="Search events or owner..."
                    value={search}
                    onChangeText={setSearch}
                    className="ml-3 flex-1 bg-transparent text-sm font-medium outline-none"
                    placeholderTextColor="#94a3b8"
                    style={{ height: 48 }}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      className="p-1"
                    >
                      <X size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Status Filter (Takes 1x width) */}
                <View
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  style={{ flex: 1, height: 48 }}
                >
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    mode="dropdown"
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="All Status" value="All" />
                    <Picker.Item label="In Progress" value="In Progress" />
                    <Picker.Item label="Rejected" value="Rejected" />
                    <Picker.Item
                      label="Awaiting Approval"
                      value="Approval Pending"
                    />
                    <Picker.Item label="D0 Approved" value="D0 Approved" />
                    <Picker.Item label="Closed" value="Closed" />
                  </Picker>
                </View>

                {/* Step Filter (Takes 1x width) */}
                <View
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  style={{ flex: 1, height: 48 }}
                >
                  <Picker
                    selectedValue={stepSort}
                    onValueChange={setStepSort}
                    mode="dropdown"
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="All Steps" value="None" />
                    <Picker.Item label="Sort by Step" value="StepSort" />
                    {steps.map((s) => (
                      <Picker.Item key={s} label={s} value={s} />
                    ))}
                  </Picker>
                </View>

                {/* View Limit Filter (Takes 1x width) */}
                <View
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  style={{ flex: 1, height: 48 }}
                >
                  <Picker
                    selectedValue={viewLimit}
                    onValueChange={setViewLimit}
                    mode="dropdown"
                    style={{ height: 48 }}
                  >
                    <Picker.Item label="All Events" value="All" />
                    <Picker.Item label="Last 10" value="10" />
                    <Picker.Item label="Last 20" value="20" />
                    <Picker.Item label="Last 50" value="50" />
                  </Picker>
                </View>
              </View>
            ) : (
              // ✅ MOBILE: Stacked layout with horizontal scroll for pickers (Unchanged)
              <>
                <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Search size={18} color="#94a3b8" />
                  <TextInput
                    placeholder="Search events or owner..."
                    value={search}
                    onChangeText={setSearch}
                    className="ml-3 flex-1 bg-transparent text-sm font-medium outline-none"
                    placeholderTextColor="#94a3b8"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      className="p-1"
                    >
                      <X size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingRight: 16 }}
                >
                  <View className="min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Picker
                      selectedValue={statusFilter}
                      onValueChange={setStatusFilter}
                      mode="dropdown"
                    >
                      <Picker.Item label="All Status" value="All" />
                      <Picker.Item label="In Progress" value="In Progress" />
                      <Picker.Item label="Rejected" value="Rejected" />
                      <Picker.Item
                        label="Awaiting Approval"
                        value="Approval Pending"
                      />
                      <Picker.Item label="D0 Approved" value="D0 Approved" />
                      <Picker.Item label="Closed" value="Closed" />
                    </Picker>
                  </View>

                  <View className="min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Picker
                      selectedValue={stepSort}
                      onValueChange={setStepSort}
                      mode="dropdown"
                    >
                      <Picker.Item label="All Steps" value="None" />
                      <Picker.Item label="Sort by Step" value="StepSort" />
                      {steps.map((s) => (
                        <Picker.Item key={s} label={s} value={s} />
                      ))}
                    </Picker>
                  </View>

                  <View className="min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <Picker
                      selectedValue={viewLimit}
                      onValueChange={setViewLimit}
                      mode="dropdown"
                    >
                      <Picker.Item label="All Events" value="All" />
                      <Picker.Item label="Last 10" value="10" />
                      <Picker.Item label="Last 20" value="20" />
                      <Picker.Item label="Last 50" value="50" />
                    </Picker>
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          <View className="p-4">
            {limitedFiltered.length > 0 ? (
              <FlatList
                data={limitedFiltered}
                renderItem={({ item }) => renderEventCard(item)}
                keyExtractor={(item) => item.eventNo}
                key={isDesktop ? "desktop-3-col-grid" : "mobile-1-col-list"}
                numColumns={isDesktop ? 3 : 1}
                columnWrapperStyle={
                  isDesktop
                    ? {
                        justifyContent: "flex-start", // ✅ Changed from "space-between"
                        // gap: 8, // ✅ Increased gap for better spacing
                      }
                    : undefined
                }
                contentContainerStyle={{
                  paddingBottom: 20,
                }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={{ width: "100%" }}
              />
            ) : (
              // ... empty state remains exactly the same ...
              !loading && (
                <View className="items-center py-16">
                  <Grid size={48} color="#cbd5e1" />
                  <Text className="mt-3 text-base font-bold text-slate-500">
                    No 8D events found
                  </Text>
                  <Text className="mt-1 px-8 text-center text-sm font-medium text-slate-400">
                    Try adjusting your filters or create a new 8D event
                  </Text>
                  {(isInitiator || isAdmin) && (
                    <TouchableOpacity
                      onPress={createNew8D}
                      className="mt-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 shadow-md active:opacity-90"
                    >
                      <Text className="text-sm font-bold text-white">
                        Create Your First 8D
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={isDesktop}
        onRequestClose={() => setShowPreview(false)}
      >
        <View className={`flex-1 ${isDesktop ? "items-end" : "bg-white"}`}>
          <View
            className={`bg-white ${
              isDesktop
                ? "h-full w-[60%] border-l border-slate-200 shadow-2xl"
                : "h-full w-full"
            }`}
          >
            <SafeAreaView className="flex-1">
              <View className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
                <Text className="text-lg font-bold text-slate-800">
                  Preview - Latest Data
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPreview(false)}
                  className="rounded-full bg-slate-200 p-2 active:bg-slate-300"
                >
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {activeEventId && (
                <FinalPreview
                  eventId={activeEventId}
                  isHOD={isHOD}
                  onRefresh={fetchEvents}
                  onClose={() => setShowPreview(false)}
                />
              )}
            </SafeAreaView>
          </View>
          {isDesktop && (
            <TouchableOpacity
              className="flex-1 bg-black/30"
              onPress={() => setShowPreview(false)}
            />
          )}
        </View>
      </Modal>

      {/* Forum Modal */}
      <Modal
        visible={forumDrawerOpen}
        animationType="slide"
        transparent={isDesktop}
        onRequestClose={() => setForumDrawerOpen(false)}
      >
        <View className={`flex-1 ${isDesktop ? "items-end" : "bg-white"}`}>
          <View
            className={`bg-white ${
              isDesktop
                ? "h-full w-[50%] border-l border-slate-200 shadow-2xl"
                : "h-full w-full"
            }`}
          >
            <SafeAreaView className="flex-1">
              {selectedGroupId && (
                <ForumThreadView
                  groupId={selectedGroupId}
                  isInDrawer={true}
                  setForumDrawerOpen={setForumDrawerOpen}
                  username={(user as any)?.email || (user as any)?.username}
                  currentUser={user}
                  allUsers={[]}
                  memberEmails={teamMembersMap[selectedGroupId] || []}
                  onBack={() => setForumDrawerOpen(false)}
                  groupName={`${selectedGroupId}`}
                />
              )}
            </SafeAreaView>
          </View>
          {isDesktop && (
            <TouchableOpacity
              className="flex-1 bg-black/30"
              onPress={() => setForumDrawerOpen(false)}
            />
          )}
        </View>
      </Modal>

      {/* Centered Modals for Rejection, Delete, Success */}
      {[
        {
          visible: showRejectionReason,
          onClose: () => {
            setShowRejectionReason(false);
            setSelectedRejectionEvent(null);
          },
          title: "Rejection Details",
          icon: AlertCircle,
          iconColor: "#dc2626",
          titleColor: "text-red-700",
        },
        {
          visible: showDeleteConfirm,
          onClose: () => {
            setShowDeleteConfirm(false);
            setEventToDelete(null);
          },
          title: "Confirm Deletion",
          icon: AlertCircle,
          iconColor: "#dc2626",
          titleColor: "text-red-700",
        },
        {
          visible: showDeleteSuccess,
          onClose: () => setShowDeleteSuccess(false),
          title: "Deleted Successfully!",
          icon: CheckCircle,
          iconColor: "#10b981",
          titleColor: "text-green-700",
          isCentered: true,
        },
      ].map((modal, idx) => (
        <Modal
          key={idx}
          visible={modal.visible}
          animationType="fade"
          transparent={true}
          onRequestClose={modal.onClose}
        >
          <View className="flex-1 items-center justify-center bg-black/50 p-4">
            <View
              className={`rounded-2xl bg-white p-5 shadow-2xl ${
                isDesktop ? "w-[500px]" : "w-full max-w-md"
              }`}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <modal.icon size={22} color={modal.iconColor} />
                  <Text className={`text-lg font-bold ${modal.titleColor}`}>
                    {modal.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={modal.onClose}
                  className="p-1 active:opacity-70"
                >
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {idx === 0 && selectedRejectionEvent && (
                <View className="gap-4">
                  <View>
                    <Text className="mb-1 text-sm font-bold text-slate-700">
                      Event Number
                    </Text>
                    <View className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <Text className="font-mono font-medium text-slate-800">
                        {selectedRejectionEvent.eventNo}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Text className="mb-1 text-sm font-bold text-slate-700">
                      Rejection Reason
                    </Text>
                    <View className="min-h-[60px] rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                      <Text className="font-medium text-slate-800">
                        {selectedRejectionEvent.rejectionReason ||
                          "No specific reason provided"}
                      </Text>
                    </View>
                  </View>
                  {selectedRejectionEvent.hodRemarks && (
                    <View>
                      <Text className="mb-1 text-sm font-bold text-slate-700">
                        HOD Information
                      </Text>
                      <View className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <Text className="font-medium text-slate-800">
                          {selectedRejectionEvent.hodRemarks}
                        </Text>
                        {selectedRejectionEvent.rejectedAt && (
                          <Text className="mt-1.5 text-xs font-medium text-slate-600">
                            Rejected on:{" "}
                            {format(
                              new Date(selectedRejectionEvent.rejectedAt),
                              "MM/dd/yyyy",
                            )}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  <View className="flex-row justify-end pt-2">
                    <TouchableOpacity
                      onPress={modal.onClose}
                      className="rounded-lg bg-slate-600 px-5 py-2.5 active:bg-slate-700"
                    >
                      <Text className="font-bold text-white">Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {idx === 1 && eventToDelete && (
                <View className="gap-4">
                  <Text className="font-medium text-slate-700">
                    Are you sure you want to delete this event?
                  </Text>
                  <View className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Text className="font-bold text-slate-800">
                      Event: {eventToDelete.eventNo}
                    </Text>
                    <Text className="mt-1 text-sm font-medium text-slate-600">
                      Status: {eventToDelete.status}
                    </Text>
                    <Text className="text-sm font-medium text-slate-600">
                      Owner: {eventToDelete.owner}
                    </Text>
                  </View>
                  <Text className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
                    ⚠️ This action cannot be undone. All event data and forum
                    discussions will be permanently deleted.
                  </Text>
                  <View className="flex-row justify-end gap-3 pt-2">
                    <TouchableOpacity
                      onPress={modal.onClose}
                      className="rounded-lg bg-slate-200 px-5 py-2.5 active:bg-slate-300"
                    >
                      <Text className="font-bold text-slate-700">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDelete}
                      className="flex-row items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 active:bg-red-700"
                    >
                      <Trash2 size={16} color="#ffffff" />
                      <Text className="font-bold text-white">
                        Delete Permanently
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {idx === 2 && (
                <View className="items-center py-4">
                  <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle size={32} color="#10b981" />
                  </View>
                  <Text className="mb-2 text-center font-medium text-slate-600">
                    The event has been permanently deleted from the system.
                  </Text>
                  <TouchableOpacity
                    onPress={modal.onClose}
                    className="mt-2 rounded-lg bg-green-600 px-8 py-2.5 active:bg-green-700"
                  >
                    <Text className="font-bold text-white">OK</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      ))}
    </SafeAreaView>
  );
}
