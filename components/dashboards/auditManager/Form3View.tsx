import PDFViewer from "@/components/audit/PDFViewer";
import YearFilter from "@/components/common/YearFilter";
import { apiClient } from "@/services/api";
import { pdfService } from "@/services/pdfService";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Save,
  Send,
  Star,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// ════ STRICT MONOCHROMATIC MNC PALETTE ═════
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
};

interface MonthData {
  month: string;
  status: string;
}
interface PlanItem {
  auditElement: string;
  months: MonthData[];
}
interface Form3ViewProps {
  year?: number;
  onBack?: () => void;
  onOpenForum?: (forumId: string) => void;
  allUsers?: any[];
}
interface PlanInfo {
  preparedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  approvalComments: string;
  rejectedAt: string | null;
  rejectedBy: string;
  rejectionReason: string;
}

// ═════ REUSABLE UI COMPONENTS ═════
const Card = ({ children, className = "" }: any) => (
  <View
    className={`mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    style={{
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    }}
  >
    {children}
  </View>
);

const AlertBanner = ({ type, title, message, footer, icon: Icon }: any) => {
  const stylesMap: any = {
    error: {
      bg: COLORS.stateErrorBg,
      border: COLORS.border,
      color: COLORS.stateErrorText,
      iconColor: COLORS.stateErrorText,
      iconBg: "#E2E8F0",
    },
    warning: {
      bg: COLORS.stateWarningBg,
      border: COLORS.border,
      color: COLORS.stateWarningText,
      iconColor: COLORS.stateWarningText,
      iconBg: "#F1F5F9",
    },
    success: {
      bg: COLORS.stateSuccessBg,
      border: COLORS.primaryBorder,
      color: COLORS.primaryDark,
      iconColor: COLORS.primary,
      iconBg: "#FFFFFF",
    },
  };
  const s = stylesMap[type] || stylesMap.error;
  return (
    <View
      className="mb-6 flex-row gap-4 rounded-2xl border p-5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: s.iconBg,
          borderColor: s.border,
          borderWidth: 1,
        }}
      >
        <Icon size={20} color={s.iconColor} />
      </View>
      <View className="flex-1 justify-center">
        <Text className="text-sm font-bold" style={{ color: s.color }}>
          {title}
        </Text>
        <Text
          className="mt-1 text-sm leading-5 opacity-90"
          style={{ color: s.color }}
        >
          {message}
        </Text>
        {footer && (
          <Text
            className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-70"
            style={{ color: s.color }}
          >
            {footer}
          </Text>
        )}
      </View>
    </View>
  );
};

const PlanStatusBadge = ({ status }: { status: string }) => {
  const sMap: any = {
    APPROVED: {
      bg: COLORS.stateSuccessBg,
      color: COLORS.primaryDark,
      border: COLORS.primaryBorder,
      text: "Approved",
      icon: CheckCircle,
    },
    PENDING_APPROVAL: {
      bg: COLORS.primaryLight,
      color: COLORS.primary,
      border: COLORS.primaryBorder,
      text: "Pending Approval",
      icon: Clock,
    },
    REJECTED: {
      bg: COLORS.stateErrorBg,
      color: COLORS.stateErrorText,
      border: COLORS.border,
      text: "Rejected",
      icon: X,
    },
    CHANGE_REQUESTED: {
      bg: COLORS.stateWarningBg,
      color: COLORS.stateWarningText,
      border: COLORS.border,
      text: "Changes Requested",
      icon: MessageSquare,
    },
  };
  const s = sMap[status] || {
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
    text: "Draft",
    icon: FileText,
  };
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <s.icon size={14} color={s.color} />
      <Text
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: s.color }}
      >
        {s.text}
      </Text>
    </View>
  );
};

const StatusBadge = ({
  status,
  count = 0,
}: {
  status: string;
  count?: number;
}) => {
  const base = (
    <View
      className={`h-7 w-7 items-center justify-center rounded-full border ${status === "COMPLETED" ? "border-blue-200 bg-blue-50" : status === "PLANNED" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-100"}`}
    >
      {status === "COMPLETED" ? (
        <Check size={14} color={COLORS.primary} />
      ) : status === "PLANNED" ? (
        <Clock size={14} color={COLORS.primary} />
      ) : (
        <Text className="text-[11px] font-bold text-slate-400">—</Text>
      )}
    </View>
  );
  if (count <= 0) return base;
  return (
    <View className="relative">
      {base}
      <View
        style={{
          position: "absolute",
          top: -6,
          right: -6,
          minWidth: 16,
          height: 16,
          paddingHorizontal: 3,
          borderRadius: 8,
          backgroundColor: COLORS.primaryDark,
          borderWidth: 1.5,
          borderColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: "800",
            color: "#FFFFFF",
            lineHeight: 11,
          }}
        >
          {count > 99 ? "99+" : count}
        </Text>
      </View>
    </View>
  );
};

const ActionModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  value,
  setValue,
  placeholder,
  onSubmit,
  submitLabel,
  submitBg,
  submitting,
}: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/30 p-6"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center gap-4 border-b border-slate-100 p-6">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl border border-slate-100"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">{title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{description}</Text>
            </View>
          </View>
          <View className="p-6">
            <TextInput
              className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              textAlignVertical="top"
            />
          </View>
          <View className="flex-row justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <TouchableOpacity
              onPress={onClose}
              className="h-11 justify-center rounded-xl border border-slate-200 bg-white px-6"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-slate-600">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!value.trim() || submitting}
              className="h-11 flex-row items-center justify-center gap-2 rounded-xl px-6"
              style={{
                backgroundColor:
                  !value.trim() || submitting ? "#CBD5E1" : submitBg,
                opacity: !value.trim() || submitting ? 0.7 : 1,
              }}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon size={16} color="#FFF" />
              )}
              <Text className="text-sm font-semibold text-white">
                {submitLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const StatusChip = ({ status }: { status: string }) => {
  const map: any = {
    DRAFT: { bg: "#F1F5F9", color: "#475569" },
    PENDING_LA_CONFIRMATION: { bg: "#FEF3C7", color: "#92400E" },
    PENDING_APPROVAL: { bg: "#FEF3C7", color: "#92400E" },
    CONFIRMED_BY_LA: { bg: "#DBEAFE", color: "#1E40AF" },
    APPROVED: { bg: "#DCFCE7", color: "#166534" },
    REJECTED: { bg: "#FEE2E2", color: "#991B1B" },
    FEASIBILITY_REJECTED: { bg: "#FEE2E2", color: "#991B1B" },
    CHANGE_REQUESTED: { bg: "#FEF3C7", color: "#92400E" },
  };
  const s = map[status] || { bg: "#F1F5F9", color: "#475569" };
  return (
    <View
      style={{
        backgroundColor: s.bg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: s.color, fontSize: 10, fontWeight: "700" }}>
        {status?.replace(/_/g, " ")}
      </Text>
    </View>
  );
};

const ScheduleCard = ({ item }: { item: any }) => {
  const formatDate = (d: any) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(d);
    }
  };
  const teamNames = Array.isArray(item.coAuditorNames)
    ? item.coAuditorNames.filter((n: string) => n !== item.auditorName)
    : [];
  const auditeeNames = Array.isArray(item.auditeeNames)
    ? item.auditeeNames
    : item.auditeeName
      ? [item.auditeeName]
      : [];

  return (
    <View className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-900">
            {item.department || "—"}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {item.auditType || "General Audit"}
          </Text>
        </View>
        <StatusChip status={item.detailedApprovalStatus || item.status} />
      </View>
      <View className="mt-2 gap-1.5">
        <View className="flex-row items-center gap-2">
          <Calendar size={13} color="#64748B" />
          <Text className="text-xs text-slate-600">
            {formatDate(item.scheduledDate)}
            {item.week ? `  •  ${item.week}` : ""}
          </Text>
        </View>
        {(item.startTime || item.endTime) && (
          <View className="flex-row items-center gap-2">
            <Clock size={13} color="#64748B" />
            <Text className="text-xs text-slate-600">
              {item.startTime || "—"} – {item.endTime || "—"}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-2">
          <Text className="text-[11px] font-semibold text-slate-500">
            AUDITOR:
          </Text>
          <Text className="flex-1 text-xs text-slate-700">
            {item.auditorName || "—"}
          </Text>
        </View>
        {teamNames.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold text-slate-500">
              TEAM:
            </Text>
            <Text className="flex-1 text-xs text-slate-700">
              {teamNames.join(", ")}
            </Text>
          </View>
        )}
        {auditeeNames.length > 0 && (
          <View className="flex-row items-center gap-2">
            <Text className="text-[11px] font-semibold text-slate-500">
              AUDITEE:
            </Text>
            <Text className="flex-1 text-xs text-slate-700">
              {auditeeNames.join(", ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ScheduleDetailsModal = ({
  visible,
  onClose,
  auditElement,
  month,
  year,
  loading,
  error,
  schedules,
}: any) => {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/40 p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white"
          style={{
            maxHeight: "85%",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">
                {auditElement}
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                {month} {year} · {schedules.length} schedule
                {schedules.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-lg bg-white"
              activeOpacity={0.7}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="px-5 py-4"
            style={{ maxHeight: 520 }}
            showsVerticalScrollIndicator={true}
          >
            {loading && (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text className="mt-3 text-sm text-slate-500">
                  Loading schedules...
                </Text>
              </View>
            )}
            {!loading && error && (
              <View className="items-center py-10">
                <AlertCircle size={32} color="#94A3B8" />
                <Text className="mt-3 text-sm text-slate-500">{error}</Text>
              </View>
            )}
            {!loading && !error && schedules.length === 0 && (
              <View className="items-center py-10">
                <FileText size={32} color="#CBD5E1" />
                <Text className="mt-3 text-sm font-medium text-slate-500">
                  No schedules yet
                </Text>
                <Text className="mt-1 px-6 text-center text-xs text-slate-400">
                  No detailed schedules for this audit element in {month}.
                  Create them from Form 5 (Daily Schedule).
                </Text>
              </View>
            )}
            {!loading &&
              !error &&
              schedules.map((s: any) => <ScheduleCard key={s.id} item={s} />)}
          </ScrollView>
          <View className="border-t border-slate-200 bg-slate-50 px-5 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 items-center justify-center rounded-lg bg-slate-900"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isH = isHovered && !disabled;
  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg border px-2 py-2.5"
      style={{
        borderColor: isH ? "#2563EB" : "#D1D5DB",
        backgroundColor: isH ? "rgba(37, 99, 235, 0.1)" : "transparent",
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={isH ? "#2563EB" : "#6B7280"} />
      ) : null}
      <Text
        className="text-sm font-semibold"
        style={{ color: isH ? "#2563EB" : "#111827" }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const [offset, setOffset] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (
      textWidth === 0 ||
      containerWidth === 0 ||
      textWidth <= containerWidth
    ) {
      setOffset(0);
      return;
    }
    const cycle = textWidth + 60;
    const interval = setInterval(
      () => setOffset((prev) => (prev - 0.6 <= -cycle ? 0 : prev - 0.6)),
      16,
    );
    return () => clearInterval(interval);
  }, [textWidth, containerWidth]);
  return (
    <View
      style={[
        {
          width: "100%",
          height: 30,
          overflow: "hidden",
          justifyContent: "center",
        },
        style,
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) setContainerWidth(w);
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          transform: [{ translateX: offset }],
        }}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: 60,
            flexShrink: 0,
          }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - textWidth) > 1) setTextWidth(w);
          }}
        >
          {text}
        </Text>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#0F172A",
            marginRight: 60,
            flexShrink: 0,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const MonthCellTooltip = ({
  visible,
  month,
  year,
  status,
  auditElement,
  count,
  anchor,
}: any) => {
  if (!visible || !anchor || Platform.OS !== "web") return null;

  const W = 240;
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const TAIL = 12;
  const GAP = 12;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;

  // Center the tooltip over the hovered cell while keeping it on-screen.
  const left = Math.max(8, Math.min(anchor.x - W / 2, viewportWidth - W - 8));

  // Keep the pointer aligned with the hovered cell.
  const tailX = Math.max(20, Math.min(W - 20, anchor.x - left));

  const statusColor =
    status === "COMPLETED" ? COLORS.primaryDark : COLORS.primary;
  const statusBg =
    status === "COMPLETED" ? COLORS.stateSuccessBg : COLORS.primaryLight;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "fixed" as any,
        left,
        // Show the tooltip below the hovered cell.
        top: Math.max(8, anchor.y - tooltipHeight - GAP - TAIL),
        width: W,
        zIndex: 999999,
        elevation: 20,
      }}
    >
      {/* Pointer border */}
      <View
        style={{
          position: "absolute",
          bottom: -TAIL,
          left: tailX - TAIL,
          width: 0,
          height: 0,
          borderLeftWidth: TAIL,
          borderRightWidth: TAIL,
          borderTopWidth: TAIL,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: COLORS.border,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -TAIL + 1,
          left: tailX - TAIL + 1,
          width: 0,
          height: 0,
          borderLeftWidth: TAIL - 1,
          borderRightWidth: TAIL - 1,
          borderTopWidth: TAIL - 1,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: "#FFFFFF",
        }}
      />

      {/* Tooltip card */}
      <View
        onLayout={(event) => {
          setTooltipHeight(event.nativeEvent.layout.height);
        }}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 12,
          shadowColor: "#000000",
          shadowOpacity: 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
        }}
      >
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={13} color={COLORS.primary} />
            <Text className="text-[13px] font-bold text-slate-900">
              {month} {year}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: statusBg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 5,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: statusColor,
              }}
            >
              {status === "COMPLETED" ? "Completed" : "Planned"}
            </Text>
          </View>
        </View>

        <Text
          className="text-[11px] font-semibold text-slate-500"
          numberOfLines={2}
        >
          {auditElement}
        </Text>

        <View className="mt-2 flex-row items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5">
          <Clock size={13} color={COLORS.primary} />
          <Text className="text-[11px] font-bold text-blue-800">
            {count} audit schedule{count !== 1 ? "s" : ""}
          </Text>
        </View>

        <Text className="mt-2 text-[10px] text-slate-400">
          Click to view schedules
        </Text>
      </View>
    </View>
  );
};

// ═════ MAIN COMPONENT ═════
export default function Form3View({
  year: propYear,
  onBack,
  onOpenForum,
  allUsers = [],
}: Form3ViewProps) {
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [planData, setPlanData] = useState<PlanItem[]>([]);
  const [planStatus, setPlanStatus] = useState("DRAFT");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showYearModal, setShowYearModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // ✅ FIXED TYPES HERE
  const [detailsModal, setDetailsModal] = useState<{
    visible: boolean;
    auditElement: string;
    month: string;
    loading: boolean;
    schedules: any[];
    error: string | null;
  }>({
    visible: false,
    auditElement: "",
    month: "",
    loading: false,
    schedules: [],
    error: null,
  });

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);

  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [tooltip, setTooltip] = useState({
    visible: false,
    month: "",
    status: "",
    auditElement: "",
    count: 0,
    anchor: null as { x: number; y: number } | null,
  });
  const [scheduleCounts, setScheduleCounts] = useState<
    Record<string, Record<string, number>>
  >({});

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const [selectedYear, setSelectedYear] = useState(
    propYear || urlYear || new Date().getFullYear(),
  );
  const availableYears = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i),
    [],
  );
  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    preparedBy: "",
    approvedBy: "",
    approvedAt: null,
    approvalComments: "",
    rejectedAt: null,
    rejectedBy: "",
    rejectionReason: "",
  });

  const auditElements = [
    { id: 1, name: "System Audit (ISO9001)" },
    { id: 2, name: "System Audit (IATF16949)" },
    { id: 3, name: "5S Audit" },
    { id: 4, name: "Process Audit" },
    { id: 5, name: "Product Audit" },
  ];
  const financialMonths = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ];

  useEffect(() => {
    if (params?.year) setSelectedYear(parseInt(params.year as string));
  }, [params?.year]);
  useEffect(() => {
    if (propYear && propYear !== selectedYear) setSelectedYear(propYear);
  }, [propYear]);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/api/audit-plan/${selectedYear}?userId=${user?.id}`,
      );
      const data = res.data || res;
      if (data) {
        setPlanData(data.planItems || []);
        setPlanStatus(data.approvalStatus || "DRAFT");
        setRejectionReason(data.rejectionReason || "");
        setPlanInfo({
          preparedBy: data.preparedBy || user?.name || user?.username || "",
          approvedBy: data.approvedBy || "",
          approvedAt: data.approvedAt || null,
          approvalComments: data.approvalComments || "",
          rejectedAt: data.rejectedAt || null,
          rejectedBy: data.rejectedBy || "",
          rejectionReason: data.rejectionReason || "",
        });
      }
    } catch (error) {
      addToast("Failed to load plan data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchPlanData();
  }, [selectedYear, user?.id]);

  const mapElementToAuditType = (elementName: string): string[] => {
    if (elementName.includes("ISO9001"))
      return ["System Audit (ISO9001)", "ISO9001"];
    if (elementName.includes("IATF16949"))
      return ["System Audit (IATF16949)", "IATF16949"];
    if (elementName.includes("5S")) return ["5S Audit"];
    if (elementName.includes("Process")) return ["Process Audit"];
    if (elementName.includes("Product")) return ["Product Audit"];
    return [elementName];
  };

  const fetchScheduleCounts = async () => {
    if (!user?.id || planData.length === 0) {
      setScheduleCounts({});
      return;
    }
    const userPlantId = (user as any)?.plantId;
    const counts: Record<string, Record<string, number>> = {};
    try {
      const monthlyData: Record<string, any[]> = {};
      await Promise.all(
        financialMonths.map(async (month) => {
          try {
            const r = await apiClient.get(
              `/api/audit-schedule/detailed/${selectedYear}/${month}`,
            );
            monthlyData[month] = r.data || r || [];
          } catch {
            monthlyData[month] = [];
          }
        }),
      );
      planData.forEach((element) => {
        const acceptedTypes = mapElementToAuditType(element.auditElement).map(
          (t) => t.toLowerCase(),
        );
        counts[element.auditElement] = {};
        financialMonths.forEach((month) => {
          const filtered = (monthlyData[month] || []).filter((s) => {
            if (
              userPlantId &&
              s.plantId &&
              String(s.plantId) !== String(userPlantId)
            )
              return false;
            let matchesElement = false;
            if (Array.isArray(s.auditElements) && s.auditElements.length > 0)
              matchesElement = s.auditElements.some((el: string) =>
                acceptedTypes.some((t) => el.toLowerCase().includes(t)),
              );
            if (!matchesElement && s.auditType)
              matchesElement = acceptedTypes.some((t) =>
                s.auditType.toLowerCase().includes(t),
              );
            if (!matchesElement) return false;
            if (!isAuditManager && !isTopManagement)
              return (
                s.auditorId === user?.id ||
                (Array.isArray(s.coAuditorIdList) &&
                  s.coAuditorIdList.includes(user?.id))
              );
            return true;
          });
          counts[element.auditElement][month] = filtered.length;
        });
      });
      setScheduleCounts(counts);
    } catch {
      setScheduleCounts({});
    }
  };

  useEffect(() => {
    fetchScheduleCounts();
  }, [selectedYear, planData, user?.id]);

  const handleCellPress = async (auditElement: string, month: string) => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    setDetailsModal({
      visible: true,
      auditElement,
      month,
      loading: true,
      schedules: [],
      error: null,
    });
    try {
      const response = await apiClient.get(
        `/api/audit-schedule/detailed/${selectedYear}/${month}`,
      );
      const all: any[] = response.data || response || [];
      const acceptedTypes = mapElementToAuditType(auditElement).map((t) =>
        t.toLowerCase(),
      );
      const userPlantId = (user as any)?.plantId;
      let filtered = all.filter((s) => {
        if (
          userPlantId &&
          s.plantId &&
          String(s.plantId) !== String(userPlantId)
        )
          return false;
        let matchesElement = false;
        if (Array.isArray(s.auditElements) && s.auditElements.length > 0)
          matchesElement = s.auditElements.some((el: string) =>
            acceptedTypes.some((t) => el.toLowerCase().includes(t)),
          );
        if (!matchesElement && s.auditType)
          matchesElement = acceptedTypes.some((t) =>
            s.auditType.toLowerCase().includes(t),
          );
        if (!matchesElement) return false;
        if (!isAuditManager && !isTopManagement)
          return (
            s.auditorId === user?.id ||
            (Array.isArray(s.coAuditorIdList) &&
              s.coAuditorIdList.includes(user?.id))
          );
        return true;
      });
      filtered.sort(
        (a, b) =>
          (a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0) -
          (b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0),
      );
      setDetailsModal((prev) => ({
        ...prev,
        loading: false,
        schedules: filtered,
      }));
    } catch {
      setDetailsModal((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load schedules.",
      }));
    }
  };

  const handleViewPDF = async () => {
    if (!user?.id) {
      addToast("User session not ready. Please wait.", "warning");
      return;
    }
    setExporting(true);
    try {
      await pdfService.viewPDF(
        {
          auditId: String(selectedYear),
          type: "form3",
          year: selectedYear,
          userId: user.id,
        },
        (result) => {
          setPDFViewer({
            visible: true,
            pdfData: result.pdfData,
            fileName: result.fileName,
          });
          setExporting(false);
        },
      );
    } catch {
      addToast("Failed to load PDF", "error");
      setExporting(false);
    }
  };

  const handleSave = async () => {
    if (planStatus === "APPROVED") {
      addToast("Approved plan cannot be modified", "warning");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      addToast("Annual Audit Plan saved successfully!", "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.setParams({ year: year.toString() });
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = planData.some((e) =>
      e?.months?.some((m) => m?.status === "PLANNED"),
    );
    if (!hasPlanned) {
      addToast(
        "Please mark at least one month as PLANNED before submitting",
        "warning",
      );
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/submit?userId=${user?.id}`,
        {},
      );
      addToast(
        `Plan ${planStatus === "REJECTED" ? "resubmitted" : "submitted"} for approval!`,
        "success",
      );
      await fetchPlanData();
    } catch (e: any) {
      addToast(e.response?.data?.message || "Failed to submit plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = (elementIndex: number, monthName: string) => {
    if (!canEdit) return;
    const newPlanData = [...planData];
    const element = newPlanData[elementIndex];
    if (!element) return;
    const mIdx = element.months.findIndex((m) => m.month === monthName);
    if (mIdx === -1) return;
    const c = element.months[mIdx].status;
    element.months[mIdx].status =
      c === "" ? "PLANNED" : c === "PLANNED" ? "COMPLETED" : "";
    setPlanData(newPlanData);
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast("Please provide approval comments", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/approve?userId=${user?.id}`,
        { comments: tempApprovalComment },
      );
      setPlanStatus("APPROVED");
      setPlanInfo((prev) => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedAt: new Date().toISOString(),
        approvedBy: user?.name || user?.username || "",
      }));
      setShowApproveModal(false);
      setTempApprovalComment("");
      addToast("Plan approved successfully!", "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to approve plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/reject?userId=${user?.id}`,
        { reason: tempRejectionReason },
      );
      setPlanStatus("REJECTED");
      setRejectionReason(tempRejectionReason);
      setPlanInfo((prev) => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.name || user?.username || "",
      }));
      setShowRejectModal(false);
      setTempRejectionReason("");
      addToast("Plan rejected", "error");
      await fetchPlanData();
    } catch {
      addToast("Failed to reject plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/audit-plan/${selectedYear}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      addToast(`Change request submitted for ${selectedYear}`, "warning");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchPlanData();
    } catch (e: any) {
      addToast(
        e.response?.data?.message || "Failed to submit change request",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan in its current status", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      let newPlanData =
        planData.length === 0
          ? auditElements.map((e) => ({
              auditElement: e.name,
              months: financialMonths.map((m) => ({ month: m, status: "" })),
            }))
          : [...planData];
      let count = 0;
      newPlanData.forEach((el) => {
        if (
          el.auditElement === "System Audit (IATF16949)" ||
          el.auditElement === "5S Audit"
        ) {
          el.months.forEach((m) => {
            if (m.status !== "PLANNED") {
              m.status = "PLANNED";
              count++;
            }
          });
        }
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/audit-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
      });
      addToast(`Demo mode: ${count} audits marked as PLANNED!`, "success");
      await fetchPlanData();
    } catch {
      addToast("Failed to mark audits as planned", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const totalPlanned = useMemo(
    () =>
      planData.reduce(
        (acc, el) =>
          acc +
          (el?.months?.filter((m) => m?.status === "PLANNED").length || 0),
        0,
      ),
    [planData],
  );
  const canEdit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED");
  const canSubmit = canEdit && totalPlanned > 0;
  const canApprove = isTopManagement && planStatus === "PENDING_APPROVAL";

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading plan data...
        </Text>
      </View>
    );

  return (
    <View className="flex-1 bg-slate-50">
      {/* HEADER */}
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="w-full px-4">
          <View
            className={`${isDesktop ? "flex-row items-center justify-between" : "flex-col gap-4"}`}
          >
            <View
              className="flex-row items-center gap-3"
              style={
                !isDesktop
                  ? { width: "100%", alignSelf: "stretch" }
                  : { flex: 1 }
              }
            >
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#475569" />
              </TouchableOpacity>
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {isDesktop ? (
                  <>
                    <Text
                      className="text-xl font-bold text-slate-900"
                      numberOfLines={1}
                    >
                      Annual Internal Audit Plan
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Annual Audit Planning (Financial Year)
                    </Text>
                  </>
                ) : (
                  <>
                    <MarqueeText text="Annual Internal Audit Plan" />
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Annual Audit Planning (Financial Year)
                    </Text>
                  </>
                )}
              </View>
            </View>
            {isDesktop ? (
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-semibold text-slate-500">
                    Status:
                  </Text>
                  <PlanStatusBadge status={planStatus} />
                </View>
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={() => {
                    fetchPlanData();
                    fetchScheduleCounts();
                  }}
                  className="rounded-lg bg-slate-100 p-2.5"
                  activeOpacity={0.7}
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center justify-between gap-3">
                <PlanStatusBadge status={planStatus} />
                <View style={{ zIndex: 1000 }}>
                  <TouchableOpacity
                    onPress={() => setShowMobileMenu(!showMobileMenu)}
                    className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
                    activeOpacity={0.7}
                  >
                    <MoreVertical size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Mobile dropdown */}
      {showMobileMenu && !isDesktop && (
        <View
          style={{
            position: "absolute",
            top: 70,
            right: 16,
            width: 280,
            zIndex: 9999,
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 15,
            elevation: 10,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              setShowYearModal(true);
            }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-900">
                  FY {selectedYear}-{selectedYear + 1}
                </Text>
                <Text className="text-[11px] text-slate-500">Change Year</Text>
              </View>
            </View>
            <ArrowRight size={16} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              handleViewPDF();
            }}
            disabled={exporting}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
              opacity: exporting ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <FileText size={18} color={COLORS.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                View PDF
              </Text>
              {exporting && (
                <Text className="text-[11px] text-slate-500">Loading...</Text>
              )}
            </View>
            {exporting && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setShowMobileMenu(false);
              fetchPlanData();
              fetchScheduleCounts();
            }}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{ borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}
            activeOpacity={0.7}
          >
            <View className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <RefreshCw size={18} color="#475569" />
            </View>
            <Text className="text-sm font-semibold text-slate-900">
              Refresh Data
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {showMobileMenu && !isDesktop && (
        <Pressable
          onPress={() => setShowMobileMenu(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
          }}
        />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 1200,
                alignSelf: "center",
                width: "100%",
                padding: 24,
              }
            : { padding: 16 }
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts */}
        {planStatus === "CHANGE_REQUESTED" &&
          (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner
              type="warning"
              icon={AlertCircle}
              title="Change Request Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Requested by: ${planInfo.rejectedBy}`}
            />
          )}
        {planStatus === "REJECTED" &&
          (rejectionReason || planInfo.rejectionReason) && (
            <AlertBanner
              type="error"
              icon={AlertCircle}
              title="Rejection Reason"
              message={rejectionReason || planInfo.rejectionReason}
              footer={`Rejected by: ${planInfo.rejectedBy}`}
            />
          )}
        {planStatus === "APPROVED" && planInfo.approvalComments && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Approval Comments"
            message={planInfo.approvalComments}
            footer={`Approved by: ${planInfo.approvedBy}`}
          />
        )}

        {/* Demo Banner */}
        {canEdit && (
          <Card className="border-blue-200 bg-blue-50 p-5">
            <View className="flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white">
                  <Star size={20} color={COLORS.primary} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-bold text-blue-900">
                    Quick Planning Demo
                  </Text>
                  <Text className="mt-1 flex-wrap text-sm text-blue-700">
                    Save time with automatic planning for IATF16949 & 5S audits
                  </Text>
                </View>
              </View>
              <OutlineButton
                title="Demo"
                icon={Star}
                onPress={handleDemoPlanned}
                loading={demoLoading}
              />
            </View>
          </Card>
        )}

        {/* Main Table */}
        <Card className="overflow-hidden p-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            className="max-h-[500px]"
          >
            <View style={{ minWidth: 950 }}>
              <View className="flex-row border-b border-slate-200 bg-slate-50">
                <View className="w-[60px] items-center justify-center border-r border-slate-200 p-3">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    S.NO
                  </Text>
                </View>
                <View className="w-[220px] items-center justify-center border-r border-slate-200 p-3">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    AUDIT ELEMENTS
                  </Text>
                </View>
                {financialMonths.map((month, idx) => (
                  <View
                    key={month}
                    className={`w-[72.5px] items-center justify-center p-3 ${idx === 11 ? "" : "border-r border-slate-200"}`}
                  >
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      {month}
                    </Text>
                  </View>
                ))}
              </View>

              {planData.length === 0 ? (
                <View className="items-center p-10">
                  <Text className="text-sm text-slate-500">
                    No audit elements found. Click "Demo" to initialize.
                  </Text>
                </View>
              ) : (
                planData.map((element, elementIndex) => (
                  <View
                    key={elementIndex}
                    className="flex-row border-b border-slate-200 bg-white"
                  >
                    <View className="w-[60px] items-center justify-center border-r border-slate-200 p-3">
                      <Text className="text-sm text-slate-600">
                        {elementIndex + 1}
                      </Text>
                    </View>
                    <View className="w-[220px] items-center justify-center border-r border-slate-200 p-3">
                      <Text className="text-sm font-semibold text-slate-800">
                        {element.auditElement}
                      </Text>
                    </View>
                    {financialMonths.map((month, idx) => {
                      const status =
                        element.months?.find((m) => m.month === month)
                          ?.status || "";
                      const count =
                        scheduleCounts[element.auditElement]?.[month] || 0;

                      // 🖥️ Web hover logic
                      const webProps =
                        Platform.OS === "web"
                          ? {
                              // @ts-ignore
                              onMouseEnter: (e: any) => {
                                if (count === 0) {
                                  setTooltip((prev) => ({
                                    ...prev,
                                    visible: false,
                                  }));
                                  return;
                                }

                                const rect =
                                  e.currentTarget?.getBoundingClientRect?.();

                                if (rect) {
                                  setTooltip({
                                    visible: true,
                                    month,
                                    status,
                                    auditElement: element.auditElement,
                                    count,
                                    anchor: {
                                      x: rect.left + rect.width / 2,
                                      y: rect.bottom,
                                    },
                                  });
                                }
                              },

                              // @ts-ignore
                              onMouseLeave: (e: any) => {
                                // Only hide if we are leaving THIS exact cell
                                if (count > 0)
                                  setTooltip((p: any) =>
                                    p.month === month &&
                                    p.auditElement === element.auditElement
                                      ? { ...p, visible: false }
                                      : p,
                                  );
                              },
                            }
                          : {};

                      return (
                        <TouchableOpacity
                          key={month}
                          className={`w-[72.5px] items-center justify-center p-3 ${idx === 11 ? "" : "border-r border-slate-200"}`}
                          onPress={() =>
                            handleCellPress(element.auditElement, month)
                          }
                          onLongPress={() =>
                            handleStatusChange(elementIndex, month)
                          }
                          delayLongPress={350}
                          {...webProps}
                          activeOpacity={0.7}
                        >
                          <StatusBadge status={status} count={count} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </Card>

        {/* Legend & Actions */}
        <Card className="p-5">
          <View
            className={`${isDesktop ? "flex-row" : "flex-col"} items-center justify-between gap-4`}
            style={
              isDesktop ? { flexDirection: "row" } : { flexDirection: "column" }
            }
          >
            <View className="flex-row flex-wrap items-center gap-4">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Legend:
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <Text className="text-sm text-slate-600">P - Planned</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-blue-800" />
                <Text className="text-sm text-slate-600">C - Completed</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <Text className="text-sm text-slate-600">— - Not Planned</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: COLORS.primaryDark,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: "800", color: "#FFF" }}
                  >
                    3
                  </Text>
                </View>
                <Text className="text-sm text-slate-600">
                  Schedules scheduled
                </Text>
              </View>
            </View>
            {(planData.length > 0 ||
              canEdit ||
              canSubmit ||
              canApprove ||
              (isTopManagement && planStatus === "APPROVED")) && (
              <View
                className={`${isDesktop ? "flex-row" : "flex-row"} flex-wrap ${isDesktop ? "justify-end" : "justify-center"} gap-4`}
              >
                {planData.length > 0 && (
                  <OutlineButton
                    title="View"
                    icon={Eye}
                    onPress={handleViewPDF}
                    loading={exporting}
                  />
                )}
                {canEdit && (
                  <OutlineButton
                    title="Save Draft"
                    icon={Save}
                    onPress={handleSave}
                    loading={saving}
                  />
                )}
                {canSubmit && (
                  <OutlineButton
                    title={planStatus === "REJECTED" ? "Resubmit" : "Submit"}
                    icon={Send}
                    onPress={handleSubmitForApproval}
                    loading={submitting}
                    variant="default"
                  />
                )}
                {canApprove && (
                  <>
                    <OutlineButton
                      title="Reject"
                      icon={X}
                      onPress={() => setShowRejectModal(true)}
                      variant="danger"
                    />
                    <OutlineButton
                      title="Approve"
                      icon={Check}
                      onPress={() => setShowApproveModal(true)}
                      variant="success"
                    />
                  </>
                )}
                {isTopManagement && planStatus === "APPROVED" && (
                  <OutlineButton
                    title="Request Changes"
                    icon={MessageSquare}
                    onPress={() => setShowChangeRequestModal(true)}
                  />
                )}
              </View>
            )}
          </View>
        </Card>

        {/* History */}
        {(planInfo.approvalComments ||
          rejectionReason ||
          planInfo.rejectionReason) && (
          <Card className="p-6">
            <View className="mb-4 flex-row items-center gap-2">
              <MessageSquare size={16} color={COLORS.text} />
              <Text className="text-sm font-bold text-slate-900">
                Plan History & Comments
              </Text>
            </View>
            <View className="gap-4">
              {planInfo.approvalComments && (
                <View className="border-l-2 border-blue-500 pl-4">
                  <View className="mb-1 flex-row items-center gap-2">
                    <CheckCircle size={14} color={COLORS.primary} />
                    <Text className="text-xs font-bold text-blue-800">
                      Approval Comment
                    </Text>
                  </View>
                  <Text className="mb-1 text-sm text-slate-700">
                    {planInfo.approvalComments}
                  </Text>
                  {planInfo.approvedBy && (
                    <Text className="text-xs text-slate-500">
                      By: {planInfo.approvedBy} | Date:{" "}
                      {planInfo.approvedAt
                        ? new Date(planInfo.approvedAt).toLocaleDateString()
                        : ""}
                    </Text>
                  )}
                </View>
              )}
              {(rejectionReason || planInfo.rejectionReason) &&
                planStatus === "REJECTED" && (
                  <View className="border-l-2 border-red-500 pl-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <X size={14} color="#DC2626" />
                      <Text className="text-xs font-bold text-red-800">
                        Rejection Reason
                      </Text>
                    </View>
                    <Text className="mb-1 text-sm text-slate-700">
                      {rejectionReason || planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text className="text-xs text-slate-500">
                        By: {planInfo.rejectedBy} | Date:{" "}
                        {planInfo.rejectedAt
                          ? new Date(planInfo.rejectedAt).toLocaleDateString()
                          : ""}
                      </Text>
                    )}
                  </View>
                )}
              {planStatus === "CHANGE_REQUESTED" &&
                planInfo.rejectionReason && (
                  <View className="border-l-2 border-amber-500 pl-4">
                    <View className="mb-1 flex-row items-center gap-2">
                      <MessageSquare size={14} color="#D97706" />
                      <Text className="text-xs font-bold text-amber-800">
                        Change Request Reason
                      </Text>
                    </View>
                    <Text className="mb-1 text-sm text-slate-700">
                      {planInfo.rejectionReason}
                    </Text>
                    {planInfo.rejectedBy && (
                      <Text className="text-xs text-slate-500">
                        By: {planInfo.rejectedBy} | Date:{" "}
                        {planInfo.rejectedAt
                          ? new Date(planInfo.rejectedAt).toLocaleDateString()
                          : ""}
                      </Text>
                    )}
                  </View>
                )}
            </View>
          </Card>
        )}

        {/* Footer */}
        <Card className="p-6">
          <View className="flex-row flex-wrap gap-6">
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Prepared By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {planInfo.preparedBy}
              </Text>
            </View>
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Approved By
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {planInfo.approvedBy ||
                  (planStatus === "APPROVED" ? "Pending" : "Not Approved")}
              </Text>
              {planInfo.approvedAt && (
                <Text className="mt-1 text-xs text-slate-500">
                  {new Date(planInfo.approvedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            <View className="min-w-[150px] flex-1">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Date
              </Text>
              <Text className="text-sm font-medium text-slate-800">
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Card>

        <PDFViewer
          visible={pdfViewer.visible}
          pdfData={pdfViewer.pdfData}
          fileName={pdfViewer.fileName}
          auditId={String(selectedYear)}
          auditNumber={`Form3-${selectedYear}`}
          pdfType="form3"
          forumGroups={[]}
          plantId={(user as any)?.plantId ?? null}
          plantName={(user as any)?.plantName ?? null}
          onClose={() =>
            setPDFViewer({ visible: false, pdfData: "", fileName: "" })
          }
          onShareComplete={(id?: string) => {
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
            addToast("✅ PDF shared to forum!", "success");
            if (id)
              router.push({
                pathname: "/",
                params: { tab: "dashboard", openForum: id, fromShare: "true" },
              });
          }}
          onNavigateToForum={(id: string) => {
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
            if (onOpenForum) setTimeout(() => onOpenForum(id), 300);
            else addToast("Please open the forum from the main menu", "info");
          }}
          currentUser={user}
          allUsers={allUsers}
        />
      </ScrollView>

      <ActionModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setTempApprovalComment("");
        }}
        title="Approve Plan"
        description="Please provide approval comments:"
        icon={Check}
        iconColor={COLORS.primary}
        iconBg={COLORS.stateSuccessBg}
        value={tempApprovalComment}
        setValue={setTempApprovalComment}
        placeholder="Enter approval comments..."
        onSubmit={handleApprove}
        submitLabel="Confirm Approve"
        submitBg={COLORS.primary}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setTempRejectionReason("");
        }}
        title="Reject Plan"
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor="#DC2626"
        iconBg="#FEF2F2"
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg="#DC2626"
        submitting={submitting}
      />
      <ActionModal
        isOpen={showChangeRequestModal}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
        }}
        title={`Request Changes - ${selectedYear}`}
        description="Please provide details about what changes are needed:"
        icon={MessageSquare}
        iconColor="#D97706"
        iconBg="#FFFBEB"
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg="#D97706"
        submitting={submitting}
      />

      <ScheduleDetailsModal
        visible={detailsModal.visible}
        onClose={() =>
          setDetailsModal({
            visible: false,
            auditElement: "",
            month: "",
            loading: false,
            schedules: [],
            error: null,
          })
        }
        auditElement={detailsModal.auditElement}
        month={detailsModal.month}
        year={selectedYear}
        loading={detailsModal.loading}
        error={detailsModal.error}
        schedules={detailsModal.schedules}
      />

      <MonthCellTooltip
        visible={tooltip.visible}
        month={tooltip.month}
        year={selectedYear}
        status={tooltip.status}
        auditElement={tooltip.auditElement}
        count={tooltip.count}
        anchor={tooltip.anchor}
      />

      <Modal
        visible={showYearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-slate-900/30 p-6"
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[80%] w-full max-w-md overflow-hidden rounded-3xl bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.05,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
              <Text className="text-lg font-bold text-slate-900">
                Select Year
              </Text>
              <TouchableOpacity
                onPress={() => setShowYearModal(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    handleYearChange(year);
                    setShowYearModal(false);
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${selectedYear === year ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white"}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${selectedYear === year ? "font-bold text-blue-700" : "text-slate-700"}`}
                  >
                    {year} - {year + 1}
                  </Text>
                  {selectedYear === year && (
                    <CheckCircle size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
