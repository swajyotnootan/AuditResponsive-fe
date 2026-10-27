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
  Platform,
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
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  Grid,
  ListChecks,
  Plus,
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

// ═══════════ LEAD AUDITOR DASHBOARD PALETTE (matched) ═══════════
const COLORS = {
  primary: "#00529B", // NAVBAR_COLORS.primary
  primaryLight: "#eff6ff", // NAVBAR_COLORS.bg
  primaryBorder: "#DBEAFE",
  primaryDark: "#1e3a8a", // NAVBAR_COLORS.dark
  secondary: "#3b82f6", // NAVBAR_COLORS.secondary
  light: "#60a5fa", // NAVBAR_COLORS.light
  lighter: "#93c5fd", // NAVBAR_COLORS.lighter

  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  text: "#1E293B", // slate-800 (Lead Auditor body text)
  textValue: "#334155", // slate-700
  textMuted: "#64748B", // slate-500
  textFaint: "#94A3B8", // slate-400
};

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

// Status colors — semantic dots only, aligned to Lead Auditor palette
const statusColors: Record<string, string> = {
  Open: "#3b82f6",
  Closed: "#1e3a8a",
  Initiated: "#F59E0B",
  Draft: "#64748B",
  Submitted: "#6366F1",
  "Approval Pending": "#F59E0B",
  "In Progress": "#00529B",
  Rejected: "#DC2626",
  "D0 Approved": "#059669",
};

// ═══════════════ REUSABLE UI PRIMITIVES (Lead Auditor Card style) ═══════════════
const Card = ({ children, className = "", style }: any) => (
  <View
    className={`overflow-hidden rounded-2xl border ${className}`}
    style={[
      {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 16,
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

const SectionHeader = ({
  title,
  subtitle,
  icon: Icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  right?: React.ReactNode;
}) => (
  <View className="mb-5 flex-row items-center justify-between">
    <View className="flex-row items-center gap-3">
      {Icon && (
        <View
          className="h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: COLORS.primaryLight }}
        >
          <Icon size={16} color={COLORS.primary} />
        </View>
      )}
      <View>
        <Text className="text-base font-bold" style={{ color: COLORS.text }}>
          {title}
        </Text>
        {subtitle && (
          <Text
            className="mt-0.5 text-xs font-medium"
            style={{ color: COLORS.textMuted }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {right}
  </View>
);

const OutlineActionButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled}
      className="w-full flex-row items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: isHoveredAndEnabled ? COLORS.primary : "#D1D5DB",
        backgroundColor: isHoveredAndEnabled
          ? "rgba(0, 82, 155, 0.08)"
          : "#FFFFFF",
        opacity: disabled ? 0.5 : 1,
        transitionProperty: "all",
        transitionDuration: "150ms",
      }}
      activeOpacity={0.8}
    >
      {Icon && (
        <Icon
          size={14}
          color={isHoveredAndEnabled ? COLORS.primary : COLORS.textMuted}
        />
      )}
      <Text
        className="text-xs font-semibold"
        style={{ color: isHoveredAndEnabled ? COLORS.primary : COLORS.text }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// ✅ OUTLINE BUTTON WITH HOVER EFFECT (kept intact)
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  compact = false,
}: {
  title: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isHoveredAndEnabled = isHovered && !disabled && !loading;

  const borderColor = isHoveredAndEnabled ? COLORS.primary : "#D1D5DB";
  const textColor = isHoveredAndEnabled ? COLORS.primary : COLORS.text;
  const iconColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textMuted;
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(0, 82, 155, 0.08)"
    : "transparent";

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && !loading && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && !loading && setIsHovered(true)}
      onPressOut={() => !disabled && !loading && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      className={`flex-row items-center gap-2 rounded-lg border ${
        compact ? "px-3 py-2" : "px-4 py-2.5"
      }`}
      style={{
        borderColor,
        backgroundColor,
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : Icon ? (
        <Icon size={compact ? 14 : 16} color={iconColor} />
      ) : null}

      <Text
        className={`${compact ? "text-xs" : "text-sm"} font-semibold`}
        style={{ color: textColor }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

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
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-1 flex-row items-center gap-2.5">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Text
          className="text-xs font-semibold"
          style={{ color: COLORS.textValue, minWidth: 96 }}
          numberOfLines={1}
        >
          {status}
        </Text>
        <View className="relative max-w-[140px] flex-1 justify-center">
          {/* Tooltip for Progress Bar */}
          {isHovered && (
            <View
              style={{
                position: "absolute",
                top: -24,
                left: `${percentage}%`,
                transform: [{ translateX: -16 }],
                backgroundColor: color,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                zIndex: 10,
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}
              >
                {count}
              </Text>
            </View>
          )}
          <Pressable
            onPressIn={() => setIsHovered(true)}
            onPressOut={() => setIsHovered(false)}
            {...webHoverProps}
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "#E2E8F0" }}
          >
            <View
              className="h-1.5 rounded-full"
              style={{
                width: `${percentage}%`,
                backgroundColor: color,
                opacity: isHovered ? 0.85 : 1,
              }}
            />
          </Pressable>
        </View>
      </View>
      <View className="min-w-[52px] items-end pl-2">
        <Text className="text-sm font-bold" style={{ color: COLORS.text }}>
          {count}
        </Text>
        <Text
          className="text-[10px] font-medium"
          style={{ color: COLORS.textFaint }}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
};
const StepProgress = ({
  data,
  completionRate,
}: {
  data: { step: string; count: number }[];
  completionRate: number;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const chartHeight = isMobile ? 150 : 230;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const webHoverProps = (index: number) =>
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => setHoveredIndex(index),
          // @ts-ignore
          onMouseLeave: () => setHoveredIndex(null),
        }
      : {};

  return (
    <Card className="p-5" style={{ flex: 1 }}>
      <SectionHeader
        title="Step Progress"
        subtitle="Events currently in each step"
        icon={BarChart3}
        right={
          <View
            className="rounded-lg border px-3 py-1.5"
            style={{
              backgroundColor: COLORS.primaryLight,
              borderColor: COLORS.primaryBorder,
            }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: COLORS.primaryDark }}
            >
              {completionRate}% Done
            </Text>
          </View>
        }
      />

      {/* ✅ FIX: Flex column container that pushes the chart to the very bottom */}
      <View
        style={{ flex: 1, flexDirection: "column", justifyContent: "flex-end" }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            height: chartHeight,
            paddingBottom: 28, // Space for the text at the very bottom
          }}
        >
          {data.map((item, index) => {
            const maxBarHeight = chartHeight - 28;
            const barHeight = Math.max(
              (item.count / maxCount) * maxBarHeight,
              4,
            );
            const isHovered = hoveredIndex === index;

            const barColor =
              isHovered || item.count > 0 ? COLORS.primary : "#E2E8F0";
            const tooltipTextColor = "#FFFFFF";

            // If the bar is taller than 14px, the text sits on the blue background.
            const isTextOverlappingBar =
              barHeight > 14 && (isHovered || item.count > 0);

            // Text is white if overlapping, otherwise dark gray/primary on hover.
            const labelColor = isTextOverlappingBar
              ? "#FFFFFF"
              : isHovered
                ? COLORS.primary
                : COLORS.text;

            return (
              <Pressable
                key={index}
                onPressIn={() => setHoveredIndex(index)}
                onPressOut={() => setHoveredIndex(null)}
                {...webHoverProps(index)}
                style={
                  {
                    flex: 1,
                    marginHorizontal: isMobile ? 2 : 4,
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                    cursor: Platform.OS === "web" ? "pointer" : "default",
                  } as any
                }
              >
                {/* Tooltip */}
                {isHovered && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: barHeight + 4,
                      backgroundColor: barColor,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      zIndex: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: tooltipTextColor,
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {item.count}
                    </Text>
                  </View>
                )}

                {/* Bar Container */}
                <View
                  style={{
                    height: barHeight,
                    width: isMobile
                      ? isHovered
                        ? "75%"
                        : "65%"
                      : isHovered
                        ? "60%"
                        : "50%",
                    backgroundColor: barColor,
                    opacity: isHovered ? 1 : hoveredIndex !== null ? 0.3 : 1,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    transitionProperty: "all",
                    transitionDuration: "150ms",
                    justifyContent: "flex-end",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      position: "absolute",
                      bottom: 4,
                      color: labelColor,
                      fontWeight: isHovered ? "bold" : "600",
                      fontSize: isMobile ? 10 : 11,
                      width: "100%",
                      textAlign: "center",
                      transitionProperty: "all",
                      transitionDuration: "150ms",
                      overflow: "visible",
                    }}
                    numberOfLines={1}
                  >
                    {item.step}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );
};

// ── Mini Fishbone (kept intact) ──
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
      className="overflow-hidden rounded-lg border"
      style={{
        height: H,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
      }}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line
          x1={startX}
          y1={spineY}
          x2={endX}
          y2={spineY}
          stroke={COLORS.primary}
          strokeWidth={2}
        />
        <Path
          d={`M ${endX} ${spineY} L ${endX - 8} ${spineY - 5} L ${endX - 8} ${spineY + 5} Z`}
          fill={COLORS.primary}
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
                stroke={COLORS.lighter}
                strokeWidth={1.5}
              />
              <Rect
                x={boneEndX - 12}
                y={isTop ? boneEndY - 10 : boneEndY - 2}
                width={24}
                height={10}
                rx={2}
                fill={COLORS.primaryBorder}
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
                    fill={COLORS.lighter}
                  />
                );
              })}
            </G>
          );
        })}
      </Svg>
      <View className="absolute right-2 top-1.5 rounded bg-white/90 px-1.5 py-0.5">
        <Text
          className="text-[9px] font-bold"
          style={{ color: COLORS.primaryDark }}
        >
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
  const { width } = useWindowDimensions();

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

  useEffect(() => {
    console.log("🔍 [LandingPage] user:", user);
  }, [user]);

  const horizontalPadding = isLargeDesktop ? 96 : isDesktop ? 64 : 16;

  const kpiCardWidth = isDesktop
    ? (width - horizontalPadding * 2 - 36) / 4
    : (width - horizontalPadding * 2 - 12) / 2;

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
    router.push({
      pathname: "/eightdflow",
      params: {
        eventId: null,
        step: "D0",
        type: dashboardType,
        isNcrBased: String(dashboardType === "ncr"),
        isHOD: String(isHOD),
        resetKey: Date.now(),
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

    router.push({
      pathname: "/eightdflow",
      params: {
        eventId: ev.eventNo,
        step: nextStep,
        isNcrBased: String(ev.isNcrBased),
        type: ev.isNcrBased ? "ncr" : "fresh",
        isHOD: String(isHOD),
      },
    });
  };

  const fetchEvents = async () => {
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
  }, [route.params?.refreshToken]);

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
    if (dashboardType === "fresh") {
      result = result.filter((e) => !e.isNcrBased);
    } else if (dashboardType === "ncr") {
      result = result.filter((e) => e.isNcrBased);
    }
    if (isHOD) {
      result = result.filter(
        (e) => !["Draft", "Open", "Initiated"].includes(e.status),
      );
    }
    return result;
  }, [dashboardType, events, isHOD]);

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

  // ═══════════ EVENT CARD (Lead Auditor-styled card) ═══════════
  const renderEventCard = (ev: ParsedEvent) => {
    const isApprovalPending = ev.status === "Approval Pending";
    const progressPct = (ev.completedSteps / ev.totalSteps) * 100;

    const primaryAction: {
      label: string;
      onPress: () => void;
      variant: "primary" | "outline" | "ghost" | "danger";
      icon: any;
      disabled?: boolean;
    } = (() => {
      if (ev.status === "Rejected") {
        return {
          label: "Reason",
          onPress: () => showRejectionDetails(ev),
          variant: "danger",
          icon: AlertCircle,
        };
      }
      if (ev.status === "Approval Pending") {
        if (isHOD) {
          return {
            label: "Review",
            onPress: () => continueForm(ev),
            variant: "primary",
            icon: Check,
          };
        }
        if (isInitiator || isAdmin) {
          return {
            label: "Pending",
            onPress: () => {},
            variant: "ghost",
            icon: Clock,
            disabled: true,
          };
        }
        return {
          label: "View",
          onPress: () => showPreviewWithLatestData(ev),
          variant: "primary",
          icon: FileText,
        };
      }
      if (ev.status === "Submitted" || ev.status === "Closed") {
        return {
          label: "Open",
          onPress: () => showPreviewWithLatestData(ev),
          variant: "primary",
          icon: FileText,
        };
      }
      if (ev.status === "D0 Approved") {
        if (isInitiator || isAdmin) {
          return {
            label: "Continue",
            onPress: () => continueForm(ev),
            variant: "primary",
            icon: Zap,
          };
        }
        return {
          label: "View",
          onPress: () => showPreviewWithLatestData(ev),
          variant: "primary",
          icon: FileText,
        };
      }
      if (ev.isNcrBased && isDraftLikeStatus(ev.status)) {
        if (isInitiator || isAdmin) {
          return {
            label: "Start",
            onPress: () => continueForm(ev),
            variant: "primary",
            icon: Zap,
          };
        }
        return {
          label: "View",
          onPress: () => showPreviewWithLatestData(ev),
          variant: "primary",
          icon: FileText,
        };
      }
      if (isInitiator || isAdmin) {
        return {
          label: "Continue",
          onPress: () => continueForm(ev),
          variant: "primary",
          icon: Zap,
        };
      }
      return {
        label: "View",
        onPress: () => showPreviewWithLatestData(ev),
        variant: "primary",
        icon: FileText,
      };
    })();

    return (
      <View
        className="overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: COLORS.card,
          borderColor: isApprovalPending ? "#FCD34D" : COLORS.border,
          borderWidth: isApprovalPending ? 1.5 : 1,
          borderRadius: 16,
          marginBottom: 16,
          width: isDesktop ? "32.2%" : "100%",
          marginHorizontal: isDesktop ? 4 : 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        {isApprovalPending && (
          <View
            className="flex-row items-center justify-center gap-1.5 px-4 py-2"
            style={{ backgroundColor: "#FFFBEB" }}
          >
            <Clock size={12} color="#B45309" />
            <Text
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#B45309" }}
            >
              Awaiting HOD Approval
            </Text>
          </View>
        )}

        <View style={{ padding: isDesktop ? 16 : 18 }}>
          <View className="mb-3 flex-row items-start justify-between">
            <View
              className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg }}
            >
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: statusColors[ev.status] || "#94A3B8",
                }}
              />
              <Text
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: COLORS.textValue }}
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
                className="rounded-lg p-1.5"
                style={{ backgroundColor: "#FEF2F2" }}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>

          <Text
            className="mb-1 font-bold"
            style={{ color: COLORS.text, fontSize: isDesktop ? 14 : 16 }}
            numberOfLines={1}
          >
            {ev.title}
          </Text>
          <Text
            className="mb-3 font-medium"
            style={{ color: COLORS.textMuted, fontSize: isDesktop ? 11 : 12 }}
            numberOfLines={1}
          >
            {ev.owner}
          </Text>

          <View className="mb-3 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Clock size={11} color={COLORS.textFaint} />
              <Text
                className="text-[10px] font-medium"
                style={{ color: COLORS.textMuted }}
              >
                {ev.created}
              </Text>
            </View>
          </View>

          <View
            className="mb-4 rounded-xl border p-3"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg }}
          >
            <View className="mb-2 flex-row items-center justify-between">
              <View
                className="rounded-md px-2 py-0.5"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: COLORS.primaryDark }}
                >
                  Step {ev.currentStep}
                </Text>
              </View>
              <Text
                className="text-[10px] font-bold"
                style={{ color: COLORS.textValue }}
              >
                {ev.completedSteps}/{ev.totalSteps} completed
              </Text>
            </View>
            <View
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "#E2E8F0" }}
            >
              <View
                className="h-1.5 rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: COLORS.primary,
                }}
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            {(ev.status !== "Approval Pending" || isHOD) && (
              <View className="flex-1">
                <OutlineActionButton
                  title="Details"
                  icon={FileText}
                  onPress={() => showPreviewWithLatestData(ev)}
                />
              </View>
            )}
            <View className="flex-1">
              <OutlineActionButton
                title={primaryAction.label}
                icon={primaryAction.icon}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
              />
            </View>
            <View className="flex-1">
              <OutlineActionButton
                title="Forum"
                icon={Users}
                onPress={() => {
                  setSelectedGroupId(ev.eventNo);
                  setForumDrawerOpen(true);
                }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.bg }}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{
          paddingBottom: 48,
          paddingHorizontal: horizontalPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════ HEADER ═══════════ */}
        {isDesktop ? (
          <View className="mb-6 mt-4 flex-row items-start justify-between gap-4">
            <View className="flex-1 flex-row items-center gap-4">
              <View
                className="h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <Grid size={26} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xl font-bold tracking-tight"
                  style={{ color: COLORS.text }}
                >
                  {dashboardTitle}
                </Text>
                <View className="mt-1 flex-row items-center gap-1.5">
                  <CalendarDays size={13} color={COLORS.textMuted} />
                  <Text
                    className="text-xs font-medium"
                    style={{ color: COLORS.textMuted }}
                  >
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </Text>
                </View>
                <Text
                  className="mt-1 text-xs font-medium"
                  style={{ color: COLORS.textFaint }}
                >
                  {dashboardSubtitle}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              {/* ✅ Compact Total 8D card — matches OutlineButton height */}
              <View
                className="flex-row items-center gap-2.5 rounded-xl border px-3.5 py-1.5"
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  height: 44,
                }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: COLORS.primaryLight }}
                >
                  <FileText size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text
                    className="text-[9px] font-bold uppercase leading-none tracking-wider"
                    style={{ color: COLORS.textMuted }}
                  >
                    Total 8D
                  </Text>
                  <Text
                    className="mt-0.5 text-base font-extrabold leading-tight"
                    style={{ color: COLORS.text }}
                  >
                    {totalEvents}
                  </Text>
                </View>
              </View>

              {(isInitiator || isAdmin) && dashboardType !== "ncr" && (
                <OutlineButton
                  title="New 8D"
                  icon={Zap}
                  onPress={createNew8D}
                />
              )}
            </View>
          </View>
        ) : (
          <View className="mb-6 mt-3">
            <View className="mb-4 flex-row items-center gap-3">
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: COLORS.primaryLight }}
              >
                <Grid size={22} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-lg font-extrabold tracking-tight"
                  style={{ color: COLORS.text }}
                  numberOfLines={1}
                >
                  {dashboardTitle}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <CalendarDays size={12} color={COLORS.textMuted} />
                  <Text
                    className="text-[11px] font-medium"
                    style={{ color: COLORS.textMuted }}
                    numberOfLines={1}
                  >
                    {format(new Date(), "EEEE, MMMM d, yyyy")}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between gap-2.5">
              <View
                className="flex-row items-center gap-2 rounded-xl border px-3 py-1.5"
                style={{
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  height: 40,
                }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: COLORS.primaryLight }}
                >
                  <FileText size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text
                    className="text-[8px] font-bold uppercase leading-none tracking-wider"
                    style={{ color: COLORS.textMuted }}
                  >
                    Total 8D
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-extrabold leading-tight"
                    style={{ color: COLORS.text }}
                  >
                    {totalEvents}
                  </Text>
                </View>
              </View>
              {(isInitiator || isAdmin) && dashboardType !== "ncr" && (
                <OutlineButton
                  title="New"
                  icon={Zap}
                  onPress={createNew8D}
                  compact
                />
              )}
            </View>
            <Text
              className="mt-2.5 text-[11px] font-medium"
              style={{ color: COLORS.textFaint }}
              numberOfLines={2}
            >
              {dashboardSubtitle}
            </Text>
          </View>
        )}

        {loading && (
          <View className="items-center py-8">
            <View
              className="flex-row items-center gap-2 rounded-2xl border px-6 py-3"
              style={{
                backgroundColor: COLORS.card,
                borderColor: COLORS.border,
              }}
            >
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text
                className="text-sm font-medium"
                style={{ color: COLORS.textValue }}
              >
                Loading dashboard...
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════ KPI CARDS (Lead Auditor MetricCard style) ═══════════ */}
        <View
          className={`mb-4 ${isDesktop ? "flex-row" : "flex-row flex-wrap"}`}
          style={{ gap: isDesktop ? 16 : 12 }}
        >
          {[
            {
              title: "Total 8D",
              value: totalEvents,
              icon: FileText,
              subtitle: "All processes",
            },
            {
              title: "Completion Rate",
              value: `${completionRate}%`,
              icon: CheckSquare,
              subtitle: "Overall progress",
            },
            {
              title: "Avg. Time",
              value: "5.2 days",
              icon: Clock,
              subtitle: "Resolution time",
            },
            {
              title: "Efficiency",
              value: "78%",
              icon: Target,
              subtitle: "Process efficiency",
            },
          ].map((card, index) => (
            <Card
              key={index}
              className={isDesktop ? "flex-1 p-4" : "p-3"}
              style={{
                width: isDesktop ? undefined : kpiCardWidth,
              }}
            >
              {/* ✅ HORIZONTAL LAYOUT: Icon left, right-aligned text */}
              <View className="flex-row items-center justify-between">
                <View
                  className={`items-center justify-center rounded-xl ${
                    isDesktop ? "h-12 w-12" : "h-14 w-14"
                  }`}
                  style={{ backgroundColor: COLORS.primaryLight }}
                >
                  <card.icon
                    size={isDesktop ? 24 : 24}
                    color={COLORS.primary}
                  />
                </View>

                <View className="flex-1 items-end justify-center pl-2">
                  <Text
                    className={`text-right font-extrabold tracking-tight ${
                      isDesktop ? "text-xl" : "text-lg"
                    }`}
                    style={{ color: COLORS.text }}
                    numberOfLines={1}
                  >
                    {card.value}
                  </Text>
                  <Text
                    className={`text-right font-bold ${
                      isDesktop ? "text-xs" : "text-[11px]"
                    }`}
                    style={{ color: COLORS.textValue }}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>
                  <Text
                    className={`text-right font-medium ${
                      isDesktop ? "text-[11px]" : "text-[10px]"
                    }`}
                    style={{ color: COLORS.textFaint }}
                    numberOfLines={1}
                  >
                    {card.subtitle}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* ═══════════ ANALYTICS CHARTS (Lead Auditor card style) ═══════════ */}
        <View
          className={`mb-6 ${isDesktop ? "flex-row" : "flex-col"}`}
          style={{ gap: 16 }}
        >
          <StepProgress data={stepCounts} completionRate={completionRate} />

          <Card className="p-5" style={{ flex: 1 }}>
            {/* ✅ FIX: Added a wrapper or direct style to reduce the bottom margin */}
            <View style={{ marginBottom: -16 }}>
              <SectionHeader
                title="Status Breakdown"
                subtitle="Distribution by current status"
                icon={ListChecks}
                right={
                  <View
                    className="rounded-lg border px-2.5 py-1"
                    style={{
                      backgroundColor: COLORS.primaryLight,
                      borderColor: COLORS.primaryBorder,
                    }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: COLORS.primaryDark }}
                    >
                      {totalEvents} total
                    </Text>
                  </View>
                }
              />
            </View>
            <View>
              {statusCounts.map((item, index) => (
                <View key={item.label}>
                  <StatusProgress
                    status={item.label}
                    count={item.count}
                    color={item.color}
                    percentage={item.percentage}
                  />
                  {index < statusCounts.length - 1 && (
                    <View
                      className="ml-4 h-px"
                      style={{ backgroundColor: "#F1F5F9" }}
                    />
                  )}
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* ═══════════ FILTERS ═══════════ */}
        <Card className="mb-6">
          <View className="border-b p-5" style={{ borderColor: COLORS.border }}>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text
                  className="text-base font-bold"
                  style={{ color: COLORS.text }}
                >
                  8D Event Management
                </Text>
                <Text
                  className="mt-0.5 text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  {filtered.length} {filtered.length === 1 ? "event" : "events"}{" "}
                  in view
                </Text>
              </View>
              <View
                className="rounded-lg border px-2.5 py-1.5"
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primaryBorder,
                }}
              >
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: COLORS.primaryDark }}
                >
                  {isHOD
                    ? "HOD View"
                    : isAdmin
                      ? "Admin View"
                      : "Initiator View"}
                </Text>
              </View>
            </View>

            {isDesktop ? (
              <View className="flex-row items-center gap-3">
                <View
                  className="flex-row items-center rounded-xl border px-4"
                  style={{
                    flex: 2,
                    height: 44,
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                  }}
                >
                  <Search size={16} color={COLORS.textFaint} />
                  <TextInput
                    placeholder="Search by event number or owner..."
                    value={search}
                    onChangeText={setSearch}
                    className="ml-2.5 flex-1 bg-transparent text-sm font-medium outline-none"
                    placeholderTextColor={COLORS.textFaint}
                    style={{ height: 44, color: COLORS.text }}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      className="p-1"
                    >
                      <X size={14} color={COLORS.textFaint} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Status Filter */}
                <View
                  className="overflow-hidden rounded-xl border"
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                  }}
                >
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    mode="dropdown"
                    style={
                      {
                        height: 44,
                        borderWidth: 0,
                        backgroundColor: "transparent",
                        outlineStyle: "none", // ✅ Cast to any below to fix TS error
                      } as any
                    }
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

                {/* Step Sort Filter */}
                <View
                  className="overflow-hidden rounded-xl border"
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                  }}
                >
                  <Picker
                    selectedValue={stepSort}
                    onValueChange={setStepSort}
                    mode="dropdown"
                    style={
                      {
                        height: 44,
                        borderWidth: 0,
                        backgroundColor: "transparent",
                        outlineStyle: "none", // ✅ Cast to any below to fix TS error
                      } as any
                    }
                  >
                    <Picker.Item label="All Steps" value="None" />
                    <Picker.Item label="Sort by Step" value="StepSort" />
                    {steps.map((s) => (
                      <Picker.Item key={s} label={s} value={s} />
                    ))}
                  </Picker>
                </View>

                {/* View Limit Filter */}
                <View
                  className="overflow-hidden rounded-xl border"
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                  }}
                >
                  <Picker
                    selectedValue={viewLimit}
                    onValueChange={setViewLimit}
                    mode="dropdown"
                    style={
                      {
                        height: 44,
                        borderWidth: 0,
                        backgroundColor: "transparent",
                        outlineStyle: "none", // ✅ Cast to any below to fix TS error
                      } as any
                    }
                  >
                    <Picker.Item label="All Events" value="All" />
                    <Picker.Item label="Last 10" value="10" />
                    <Picker.Item label="Last 20" value="20" />
                    <Picker.Item label="Last 50" value="50" />
                  </Picker>
                </View>
              </View>
            ) : (
              <>
                <View
                  className="mb-3 flex-row items-center rounded-xl border px-3.5 py-2.5"
                  style={{
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                  }}
                >
                  <Search size={16} color={COLORS.textFaint} />
                  <TextInput
                    placeholder="Search events or owner..."
                    value={search}
                    onChangeText={setSearch}
                    className="ml-2.5 flex-1 bg-transparent text-sm font-medium outline-none"
                    placeholderTextColor={COLORS.textFaint}
                    style={{ color: COLORS.text }}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      className="p-1"
                    >
                      <X size={14} color={COLORS.textFaint} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 8 }}
                >
                  {[
                    {
                      selectedValue: statusFilter,
                      onValueChange: setStatusFilter,
                      items: [
                        { label: "All Status", value: "All" },
                        { label: "In Progress", value: "In Progress" },
                        { label: "Rejected", value: "Rejected" },
                        {
                          label: "Awaiting Approval",
                          value: "Approval Pending",
                        },
                        { label: "D0 Approved", value: "D0 Approved" },
                        { label: "Closed", value: "Closed" },
                      ],
                    },
                    {
                      selectedValue: stepSort,
                      onValueChange: setStepSort,
                      items: [
                        { label: "All Steps", value: "None" },
                        { label: "Sort by Step", value: "StepSort" },
                        ...steps.map((s) => ({ label: s, value: s })),
                      ],
                    },
                    {
                      selectedValue: viewLimit,
                      onValueChange: setViewLimit,
                      items: [
                        { label: "All Events", value: "All" },
                        { label: "Last 10", value: "10" },
                        { label: "Last 20", value: "20" },
                        { label: "Last 50", value: "50" },
                      ],
                    },
                  ].map((picker, idx) => (
                    <View
                      key={idx}
                      className="min-w-[140px] overflow-hidden rounded-xl border"
                      style={{
                        backgroundColor: COLORS.card,
                        borderColor: COLORS.border,
                      }}
                    >
                      <Picker
                        selectedValue={picker.selectedValue}
                        onValueChange={picker.onValueChange}
                        mode="dropdown"
                        style={
                          {
                            borderWidth: 0,
                            backgroundColor: "transparent",
                            outlineStyle: "none",
                          } as any
                        }
                      >
                        {picker.items.map((it) => (
                          <Picker.Item
                            key={it.value}
                            label={it.label}
                            value={it.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>

          <View style={{ padding: 16 }}>
            {limitedFiltered.length > 0 ? (
              <FlatList
                data={limitedFiltered}
                renderItem={({ item }) => renderEventCard(item)}
                keyExtractor={(item) => item.eventNo}
                key={isDesktop ? "desktop-3-col" : "mobile-1-col"}
                numColumns={isDesktop ? 3 : 1}
                columnWrapperStyle={
                  isDesktop ? { justifyContent: "flex-start" } : undefined
                }
                contentContainerStyle={{ paddingBottom: 8 }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={{ width: "100%" }}
              />
            ) : (
              !loading && (
                <View className="items-center py-16">
                  <View
                    className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: COLORS.primaryLight }}
                  >
                    <Grid size={28} color={COLORS.primary} />
                  </View>
                  <Text
                    className="text-base font-bold"
                    style={{ color: COLORS.textValue }}
                  >
                    No 8D events found
                  </Text>
                  <Text
                    className="mt-1 max-w-md px-8 text-center text-sm font-medium"
                    style={{ color: COLORS.textMuted }}
                  >
                    Try adjusting your filters or create a new 8D event
                  </Text>
                  {(isInitiator || isAdmin) && (
                    <View style={{ marginTop: 20 }}>
                      <OutlineButton
                        title="Create New 8D"
                        icon={Plus}
                        onPress={createNew8D}
                      />
                    </View>
                  )}
                </View>
              )
            )}
          </View>
        </Card>
      </ScrollView>

      {/* ═══════════ PREVIEW MODAL ═══════════ */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={isDesktop}
        onRequestClose={() => setShowPreview(false)}
      >
        <View className={`flex-1 ${isDesktop ? "items-end" : "bg-white"}`}>
          <View
            style={{
              backgroundColor: COLORS.card,
              ...(isDesktop
                ? {
                    height: "100%",
                    width: "60%",
                    borderLeftWidth: 1,
                    borderColor: COLORS.border,
                  }
                : { height: "100%", width: "100%" }),
            }}
          >
            <SafeAreaView className="flex-1">
              <View
                className="flex-row items-center justify-between border-b p-4"
                style={{
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.bg,
                }}
              >
                <View className="flex-row items-center gap-2.5">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: COLORS.primaryLight }}
                  >
                    <FileText size={16} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text
                      className="text-sm font-bold"
                      style={{ color: COLORS.text }}
                    >
                      Preview
                    </Text>
                    <Text
                      className="text-[10px] font-medium"
                      style={{ color: COLORS.textMuted }}
                    >
                      Latest data
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPreview(false)}
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: COLORS.border }}
                  activeOpacity={0.7}
                >
                  <X size={18} color={COLORS.textValue} />
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

      {/* ═══════════ FORUM MODAL ═══════════ */}
      <Modal
        visible={forumDrawerOpen}
        animationType="slide"
        transparent={isDesktop}
        onRequestClose={() => setForumDrawerOpen(false)}
      >
        <View className={`flex-1 ${isDesktop ? "items-end" : "bg-white"}`}>
          <View
            style={{
              backgroundColor: COLORS.card,
              ...(isDesktop
                ? {
                    height: "100%",
                    width: "50%",
                    borderLeftWidth: 1,
                    borderColor: COLORS.border,
                  }
                : { height: "100%", width: "100%" }),
            }}
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

      {/* ═══════════ REJECTION / DELETE / SUCCESS MODALS ═══════════ */}
      {[
        {
          visible: showRejectionReason,
          onClose: () => {
            setShowRejectionReason(false);
            setSelectedRejectionEvent(null);
          },
          title: "Rejection Details",
          icon: AlertCircle,
          iconColor: "#DC2626",
          iconBg: "#FEF2F2",
        },
        {
          visible: showDeleteConfirm,
          onClose: () => {
            setShowDeleteConfirm(false);
            setEventToDelete(null);
          },
          title: "Confirm Deletion",
          icon: AlertCircle,
          iconColor: "#DC2626",
          iconBg: "#FEF2F2",
        },
        {
          visible: showDeleteSuccess,
          onClose: () => setShowDeleteSuccess(false),
          title: "Deleted Successfully",
          icon: CheckCircle,
          iconColor: "#059669",
          iconBg: "#ECFDF5",
        },
      ].map((modal, idx) => (
        <Modal
          key={idx}
          visible={modal.visible}
          animationType="fade"
          transparent={true}
          onRequestClose={modal.onClose}
        >
          <View className="flex-1 items-center justify-center bg-slate-900/40 p-4">
            <View
              className="overflow-hidden rounded-3xl"
              style={{
                backgroundColor: COLORS.card,
                width: isDesktop ? 500 : "100%",
                maxWidth: 500,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View
                className="flex-row items-center justify-between border-b p-5"
                style={{ borderColor: COLORS.border }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: modal.iconBg }}
                  >
                    <modal.icon size={18} color={modal.iconColor} />
                  </View>
                  <Text
                    className="text-base font-bold"
                    style={{ color: COLORS.text }}
                  >
                    {modal.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={modal.onClose}
                  className="h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: COLORS.bg }}
                  activeOpacity={0.7}
                >
                  <X size={16} color={COLORS.textValue} />
                </TouchableOpacity>
              </View>

              {idx === 0 && selectedRejectionEvent && (
                <ScrollView className="max-h-[400px] p-5">
                  <View className="gap-4">
                    <View>
                      <Text
                        className="mb-1.5 text-xs font-bold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted }}
                      >
                        Event Number
                      </Text>
                      <View
                        className="rounded-xl border px-3 py-2.5"
                        style={{
                          backgroundColor: COLORS.bg,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text
                          className="font-mono text-sm font-semibold"
                          style={{ color: COLORS.text }}
                        >
                          {selectedRejectionEvent.eventNo}
                        </Text>
                      </View>
                    </View>
                    <View>
                      <Text
                        className="mb-1.5 text-xs font-bold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted }}
                      >
                        Rejection Reason
                      </Text>
                      <View
                        className="rounded-xl border px-3 py-2.5"
                        style={{
                          backgroundColor: "#FEF2F2",
                          borderColor: "#FECACA",
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{ color: COLORS.textValue }}
                        >
                          {selectedRejectionEvent.rejectionReason ||
                            "No specific reason provided"}
                        </Text>
                      </View>
                    </View>
                    {selectedRejectionEvent.hodRemarks && (
                      <View>
                        <Text
                          className="mb-1.5 text-xs font-bold uppercase tracking-wider"
                          style={{ color: COLORS.textMuted }}
                        >
                          HOD Information
                        </Text>
                        <View
                          className="rounded-xl border px-3 py-2.5"
                          style={{
                            backgroundColor: "#FFFBEB",
                            borderColor: "#FCD34D",
                          }}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: COLORS.textValue }}
                          >
                            {selectedRejectionEvent.hodRemarks}
                          </Text>
                          {selectedRejectionEvent.rejectedAt && (
                            <Text
                              className="mt-1.5 text-[11px] font-medium"
                              style={{ color: COLORS.textMuted }}
                            >
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
                  </View>
                </ScrollView>
              )}

              {idx === 1 && eventToDelete && (
                <View className="gap-4 p-5">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: COLORS.textValue }}
                  >
                    Are you sure you want to delete this event? This action
                    cannot be undone.
                  </Text>
                  <View
                    className="rounded-xl border p-4"
                    style={{
                      backgroundColor: COLORS.bg,
                      borderColor: COLORS.border,
                    }}
                  >
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted }}
                      >
                        Event
                      </Text>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: COLORS.text }}
                      >
                        {eventToDelete.eventNo}
                      </Text>
                    </View>
                    <View className="mb-1.5 flex-row items-center justify-between">
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted }}
                      >
                        Status
                      </Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: COLORS.textValue }}
                      >
                        {eventToDelete.status}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: COLORS.textMuted }}
                      >
                        Owner
                      </Text>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: COLORS.textValue }}
                        numberOfLines={1}
                      >
                        {eventToDelete.owner}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="rounded-xl border p-3"
                    style={{
                      backgroundColor: "#FEF2F2",
                      borderColor: "#FECACA",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: "#B91C1C" }}
                    >
                      ⚠️ All event data and forum discussions will be
                      permanently deleted.
                    </Text>
                  </View>
                </View>
              )}

              {idx === 2 && (
                <View className="items-center py-8">
                  <View
                    className="mb-4 h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: "#ECFDF5" }}
                  >
                    <CheckCircle size={30} color="#059669" />
                  </View>
                  <Text
                    className="text-center text-sm font-medium"
                    style={{ color: COLORS.textValue }}
                  >
                    The event has been permanently deleted from the system.
                  </Text>
                </View>
              )}

              <View
                className="flex-row justify-end gap-2.5 border-t p-5"
                style={{
                  borderColor: COLORS.border,
                  backgroundColor: COLORS.bg,
                }}
              >
                {idx === 0 && (
                  <TouchableOpacity
                    onPress={modal.onClose}
                    className="rounded-lg px-5 py-2.5"
                    style={{ backgroundColor: COLORS.textValue }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-bold text-white">Close</Text>
                  </TouchableOpacity>
                )}
                {idx === 1 && (
                  <>
                    <TouchableOpacity
                      onPress={modal.onClose}
                      className="rounded-lg border px-5 py-2.5"
                      style={{
                        backgroundColor: COLORS.card,
                        borderColor: COLORS.border,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        className="text-sm font-bold"
                        style={{ color: COLORS.textValue }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDelete}
                      className="flex-row items-center gap-2 rounded-lg px-5 py-2.5"
                      style={{ backgroundColor: "#DC2626" }}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={14} color="#FFFFFF" />
                      <Text className="text-sm font-bold text-white">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {idx === 2 && (
                  <TouchableOpacity
                    onPress={modal.onClose}
                    className="rounded-lg px-6 py-2.5"
                    style={{ backgroundColor: COLORS.primary }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-bold text-white">OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      ))}
    </View>
  );
}
