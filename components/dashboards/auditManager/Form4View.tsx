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
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Filter,
  MessageSquare,
  MoreVertical,
  Plus,
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// ════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
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
  chipBg: "#EFF6FF",
  chipBorder: "#BFDBFE",
  chipText: "#1E40AF",
};

// ═════ TABLE DIMENSIONS ═════
const AUDIT_AREA_WIDTH = 180;
const MONTHS_TOTAL_WIDTH = 972; // 12 months × 81px
const TABLE_TOTAL_WIDTH = AUDIT_AREA_WIDTH + MONTHS_TOTAL_WIDTH; // 1152
const EXPANDED_CARD_WIDTH = Math.floor(
  (TABLE_TOTAL_WIDTH - 24 - 24) / 3, // padding 12×2 + gaps 12×2 → 3 per row
);

// ═════ STYLES ═════
const styles = StyleSheet.create({
  expandedRow: {
    backgroundColor: "#F8FAFC",
  },
  expandedMonthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
  },
});

// ═════ GLOBAL CONSTANTS & HELPERS ═════
const departments = [
  "HR",
  "R&D",
  "Purchase",
  "RMS",
  "SQA",
  "PPC",
  "Production",
  "QA/QC",
  "FGS",
  "Marketing",
  "IMS (BE)",
  "Maintenance",
  "Management",
];

const months = [
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

const monthDisplay: Record<string, string> = {
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
  Jan: "January",
  Feb: "February",
  Mar: "March",
};

const getQuarter = (month: string) => {
  const quarters: Record<string, string> = {
    Apr: "Q1",
    May: "Q1",
    Jun: "Q1",
    Jul: "Q2",
    Aug: "Q2",
    Sep: "Q2",
    Oct: "Q3",
    Nov: "Q3",
    Dec: "Q3",
    Jan: "Q4",
    Feb: "Q4",
    Mar: "Q4",
  };
  return quarters[month] || "";
};

const getAuditElementsForMonth = (month: string) => {
  const elementMapping: Record<string, string[]> = {
    Apr: ["5S Audit", "System Audit (ISO9001)"],
    May: ["System Audit (IATF16949)", "Process Audit"],
    Jun: ["System Audit (IATF16949)", "5S Audit", "Product Audit"],
    Jul: ["5S Audit", "System Audit (IATF16949)"],
    Aug: ["Process Audit", "Product Audit"],
    Sep: ["System Audit (ISO9001)", "5S Audit"],
    Oct: ["System Audit (IATF16949)", "Process Audit"],
    Nov: ["Product Audit", "System Audit (ISO9001)"],
    Dec: ["5S Audit", "System Audit (IATF16949)"],
    Jan: ["Process Audit", "Product Audit"],
    Feb: ["System Audit (ISO9001)", "5S Audit"],
    Mar: ["System Audit (IATF16949)", "Process Audit", "Product Audit"],
  };
  return elementMapping[month] || [];
};

const isRelevantForDemo = (auditElement: string) =>
  auditElement.includes("IATF16949") || auditElement.includes("5S Audit");

const formatLocalDateTime = (utcDateStr: string | null) => {
  if (!utcDateStr) return "-";
  const date = new Date(utcDateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ═════ TYPES ═════
interface MonthData {
  month: string;
  status: string;
  selectedElements: string[];
}

interface DeptData {
  department: string;
  months: MonthData[];
}

interface PlanInfo {
  preparedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  preparedByPosition: string;
  approvedByPosition: string;
  approvalComments: string;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string;
}

interface Form4ViewProps {
  year?: number;
  onBack?: () => void;
  onOpenForum?: (forumId: string) => void;
  allUsers?: any[];
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
  const stylesMap: any = {
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
  const s = stylesMap[status] || {
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
    text: "Draft",
    icon: FileText,
  };
  const Icon = s.icon;
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ backgroundColor: s.bg, borderColor: s.border }}
    >
      <Icon size={14} color={s.color} />
      <Text
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: s.color }}
      >
        {s.text}
      </Text>
    </View>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const isPlanned = status === "PLANNED";
  const isCompleted = status === "COMPLETED";
  const isRescheduled = status === "RESCHEDULED";

  // Exact match to Form3View / PlanDetailsModal styles
  const badgeStyle = isCompleted
    ? {
        backgroundColor: "#BFDBFE", // COLORS.blue200
        borderColor: "#2563EB", // COLORS.primary
      }
    : isPlanned
      ? {
          backgroundColor: "#EFF6FF", // COLORS.primaryLight
          borderColor: "#DBEAFE", // COLORS.primaryBorder
        }
      : isRescheduled
        ? {
            backgroundColor: "#F1F5F9", // Gray for Rescheduled
            borderColor: "#E2E8F0",
          }
        : {
            backgroundColor: "#F8FAFC", // COLORS.bg
            borderColor: "#E2E8F0", // COLORS.border
          };

  return (
    <View
      style={[
        {
          width: 28,
          height: 28,
          borderRadius: 6,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        badgeStyle,
      ]}
    >
      {isCompleted ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E3A8A" }}>
          C
        </Text>
      ) : isPlanned ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E3A8A" }}>
          P
        </Text>
      ) : isRescheduled ? (
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748B" }}>
          R
        </Text>
      ) : (
        <Text style={{ fontSize: 14, fontWeight: "500", color: "#94A3B8" }}>
          —
        </Text>
      )}
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

const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;
  const borderColor = isHoveredAndEnabled ? "#2563EB" : "#D1D5DB";
  const textColor = isHoveredAndEnabled ? "#2563EB" : "#111827";
  const iconColor = isHoveredAndEnabled ? "#2563EB" : "#6B7280";
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(37, 99, 235, 0.1)"
    : "transparent";
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
      className="flex-row items-center gap-2 rounded-lg border px-3 py-2.5"
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
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const [offset, setOffset] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const GAP = 60;
  const SPEED = 0.6;
  useEffect(() => {
    if (textWidth === 0 || containerWidth === 0) return;
    if (textWidth <= containerWidth) {
      setOffset(0);
      return;
    }
    const cycle = textWidth + GAP;
    const interval = setInterval(() => {
      setOffset((prev) => {
        const next = prev - SPEED;
        return next <= -cycle ? 0 : next;
      });
    }, 16);
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
            marginRight: GAP,
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
            marginRight: GAP,
            flexShrink: 0,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
};

const ElementSelectionModal = ({
  isOpen,
  onClose,
  month,
  availableElements,
  selectedElements,
  onSave,
}: any) => {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  useEffect(() => {
    setTempSelected([...(selectedElements || [])]);
  }, [selectedElements, isOpen]);
  if (!isOpen) return null;
  const availableNotSelected = availableElements.filter(
    (el: string) => !tempSelected.includes(el),
  );
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 items-center justify-center bg-slate-900/40 p-4"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white"
          style={{
            maxHeight: "85%",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-100 p-6">
            <View className="flex-1 flex-row items-center gap-4">
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl border border-slate-100"
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primaryBorder,
                }}
              >
                <CheckSquare size={22} color={COLORS.primary} />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Select Audit Elements
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  For {monthDisplay[month]}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-lg bg-slate-50"
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="px-6 py-4"
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            {tempSelected.length > 0 && (
              <View className="mb-6">
                <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                  Selected Elements ({tempSelected.length})
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {tempSelected.map((el: string) => (
                    <View
                      key={el}
                      className="flex-row items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-blue-800">
                        {el}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setTempSelected(
                            tempSelected.filter((e: string) => e !== el),
                          )
                        }
                      >
                        <X size={12} color="#1E40AF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {availableNotSelected.length > 0 && (
              <View>
                <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                  Add More Elements
                </Text>
                {availableNotSelected.map((el: string) => (
                  <TouchableOpacity
                    key={el}
                    onPress={() => setTempSelected([...tempSelected, el])}
                    className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <Text className="text-sm font-medium text-slate-800">
                      {el}
                    </Text>
                    <Plus size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {availableElements.length === 0 && (
              <View className="items-center py-8">
                <AlertCircle
                  size={32}
                  color="#94A3B8"
                  style={{ opacity: 0.5, marginBottom: 8 }}
                />
                <Text className="text-sm text-slate-500">
                  No audit elements planned for this month
                </Text>
              </View>
            )}
          </ScrollView>
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
              onPress={() => {
                onSave(tempSelected);
                onClose();
              }}
              className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-6"
              activeOpacity={0.8}
            >
              <CheckSquare size={16} color="#FFF" />
              <Text className="text-sm font-semibold text-white">
                Save Elements
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ═════ MAIN COMPONENT ═════
export default function Form4View({
  year: propYear,
  onBack,
  onOpenForum,
  allUsers = [],
}: Form4ViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });
  const [planData, setPlanData] = useState<DeptData[]>([]);
  const [planStatus, setPlanStatus] = useState("DRAFT");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showYearModal, setShowYearModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");

  const [auditFrequency, setAuditFrequency] = useState("Half yearly");
  const [documentRevision, setDocumentRevision] = useState("1.0");
  const [revisionDate, setRevisionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [revisionDetails, setRevisionDetails] = useState(
    "First Approved copy (IATF16949)",
  );
  const [auditElementsFromForm3, setAuditElementsFromForm3] = useState<
    Record<string, string[]>
  >({});

  const [expandedDept, setExpandedDept] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm3Details, setShowForm3Details] = useState(true);
  const [selectedMonthForElements, setSelectedMonthForElements] = useState<{
    deptIndex: number;
    month: string;
  } | null>(null);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const [selectedYear, setSelectedYear] = useState<number>(
    Number(propYear) || Number(urlYear) || new Date().getFullYear(),
  );

  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    preparedBy: "",
    approvedBy: "",
    approvedAt: null,
    preparedByPosition: "Audit Manager",
    approvedByPosition: "Top Management",
    approvalComments: "",
    rejectedBy: "",
    rejectedAt: null,
    rejectionReason: "",
  });

  const handleViewPDF = async () => {
    if (!user?.id) {
      addToast("User session not ready. Please wait.", "warning");
      return;
    }
    try {
      setExporting(true);
      await pdfService.viewPDF(
        {
          auditId: String(selectedYear),
          type: "form4",
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
    } catch (error) {
      console.error("PDF View error:", error);
      addToast("Failed to load PDF", "error");
      setExporting(false);
    }
  };

  const handleShareComplete = (forumId?: string) => {
    setPDFViewer({ visible: false, pdfData: "", fileName: "" });
    addToast("✅ PDF shared to forum successfully!", "success");
    if (forumId && onOpenForum) {
      setTimeout(() => {
        onOpenForum(forumId);
      }, 300);
    }
  };

  const handleNavigateToForum = (forumId: string) => {
    if (onOpenForum) {
      onOpenForum(forumId);
      setPDFViewer({ visible: false, pdfData: "", fileName: "" });
    } else {
      addToast("Please open the forum from the main menu", "info");
    }
  };

  const handleQuickPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan in its current status", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      let totalPlannedCount = 0,
        totalElementsAdded = 0;
      const firstQuarterMonths = ["Apr", "May", "Jun"];
      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          if (firstQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth =
              auditElementsFromForm3[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter((el) =>
              isRelevantForDemo(el),
            );
            if (relevantElements.length > 0) {
              if (month.status !== "PLANNED") {
                month.status = "PLANNED";
                totalPlannedCount++;
              }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(
                (el) => !currentElements.includes(el),
              );
              if (newElements.length > 0) {
                month.selectedElements = [...currentElements, ...newElements];
                totalElementsAdded += newElements.length;
              }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(
        `✅ Quick plan: Updated ${totalPlannedCount} Q1 months with ${totalElementsAdded} elements`,
      );
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync with Form3 data", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const handlePlanCurrentQuarter = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      const currentMonth = new Date().toLocaleString("default", {
        month: "short",
      });
      let currentQuarterMonths = [];
      if (["Apr", "May", "Jun"].includes(currentMonth))
        currentQuarterMonths = ["Apr", "May", "Jun"];
      else if (["Jul", "Aug", "Sep"].includes(currentMonth))
        currentQuarterMonths = ["Jul", "Aug", "Sep"];
      else if (["Oct", "Nov", "Dec"].includes(currentMonth))
        currentQuarterMonths = ["Oct", "Nov", "Dec"];
      else currentQuarterMonths = ["Jan", "Feb", "Mar"];

      let totalPlannedCount = 0,
        totalElementsAdded = 0;
      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          if (currentQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth =
              auditElementsFromForm3[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter((el) =>
              isRelevantForDemo(el),
            );
            if (relevantElements.length > 0) {
              if (month.status !== "PLANNED") {
                month.status = "PLANNED";
                totalPlannedCount++;
              }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(
                (el) => !currentElements.includes(el),
              );
              if (newElements.length > 0) {
                month.selectedElements = [...currentElements, ...newElements];
                totalElementsAdded += newElements.length;
              }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(`✅ Current quarter sync: Updated ${totalPlannedCount} months`);
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      let totalPlannedCount = 0,
        totalElementsAdded = 0;
      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          const form3ElementsForMonth =
            auditElementsFromForm3[month.month] || [];
          const relevantElements = form3ElementsForMonth.filter((el) =>
            isRelevantForDemo(el),
          );
          if (relevantElements.length > 0) {
            if (month.status !== "PLANNED") {
              month.status = "PLANNED";
              totalPlannedCount++;
            }
            const currentElements = month.selectedElements || [];
            const newElements = relevantElements.filter(
              (el) => !currentElements.includes(el),
            );
            if (newElements.length > 0) {
              month.selectedElements = [...currentElements, ...newElements];
              totalElementsAdded += newElements.length;
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(
        `✅ Synced ${totalPlannedCount} months with ${totalElementsAdded} elements from Form3`,
      );
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync with Form3 data", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const fetchForm3Data = async () => {
    if (!user?.id) return;
    try {
      const response = await apiClient.get(
        `/api/audit-plan/${selectedYear}?userId=${user.id}`,
      );
      const data = response.data || response;
      const elementsByMonth: Record<string, string[]> = {};
      months.forEach((month) => {
        elementsByMonth[month] = [];
      });
      if (data?.planItems) {
        data.planItems.forEach((element: any) => {
          if (element?.months) {
            element.months.forEach((monthData: any) => {
              if (monthData?.status === "PLANNED" && monthData?.month) {
                if (
                  !elementsByMonth[monthData.month].includes(
                    element.auditElement,
                  )
                ) {
                  elementsByMonth[monthData.month].push(element.auditElement);
                }
              }
            });
          }
        });
      }
      setAuditElementsFromForm3(elementsByMonth);
    } catch (error) {
      const emptyElements: Record<string, string[]> = {};
      months.forEach((month) => {
        emptyElements[month] = [];
      });
      setAuditElementsFromForm3(emptyElements);
    }
  };

  const fetchPlanData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/department-plan/${selectedYear}?userId=${user.id}`,
      );
      const data = response.data || response;
      if (data?.planItems?.length > 0) {
        setPlanData(data.planItems);
        setPlanStatus(data.approvalStatus || "DRAFT");
        setPlanInfo({
          preparedBy: data.preparedBy || user?.name || user?.username || "",
          approvedBy: data.approvedBy || "",
          approvedAt: data.approvedAt || null,
          preparedByPosition: "Audit Manager",
          approvedByPosition: "Top Management",
          approvalComments: data.approvalComments || "",
          rejectedBy: data.rejectedBy || "",
          rejectedAt: data.rejectedAt || null,
          rejectionReason: data.rejectionReason || "",
        });
        setRejectionReason(data.rejectionReason || "");
        setAuditFrequency(data.auditFrequency || "Half yearly");
        setDocumentRevision(data.documentRevision || "1.0");
        setRevisionDate(
          data.revisionDate || new Date().toISOString().split("T")[0],
        );
        setRevisionDetails(
          data.revisionDetails || "First Approved copy (IATF16949)",
        );
      } else {
        const emptyPlanData = departments.map((dept) => ({
          department: dept,
          months: months.map((month) => ({
            month,
            status: "",
            selectedElements: [],
          })),
        }));
        setPlanData(emptyPlanData);
        setPlanStatus("DRAFT");
        setPlanInfo({
          preparedBy: user?.name || user?.username || "",
          approvedBy: "",
          approvedAt: null,
          preparedByPosition: "Audit Manager",
          approvedByPosition: "Top Management",
          approvalComments: "",
          rejectedBy: "",
          rejectedAt: null,
          rejectionReason: "",
        });
      }
    } catch (error) {
      addToast("Failed to load department plan data", "error");
      const emptyPlanData = departments.map((dept) => ({
        department: dept,
        months: months.map((month) => ({
          month,
          status: "",
          selectedElements: [],
        })),
      }));
      setPlanData(emptyPlanData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      const loadData = async () => {
        await fetchForm3Data();
        await fetchPlanData();
      };
      loadData();
    }
  }, [selectedYear, user?.id]);

  const handleAddElementsToMonth = (
    deptIndex: number,
    month: string,
    elements: string[],
  ) => {
    if (!canEdit) {
      addToast("Only draft or rejected plans can be modified", "warning");
      return;
    }
    const newPlanData = JSON.parse(JSON.stringify(planData));
    const monthIndex = newPlanData[deptIndex].months.findIndex(
      (m: MonthData) => m.month === month,
    );
    if (monthIndex !== -1) {
      const updatedSelected = [
        ...new Set([
          ...(newPlanData[deptIndex].months[monthIndex].selectedElements || []),
          ...elements,
        ]),
      ];
      newPlanData[deptIndex].months[monthIndex].selectedElements =
        updatedSelected;
      if (
        updatedSelected.length > 0 &&
        newPlanData[deptIndex].months[monthIndex].status === ""
      ) {
        newPlanData[deptIndex].months[monthIndex].status = "PLANNED";
      }
      setPlanData(newPlanData);
      setSelectedMonthForElements(null);
      addToast(`Added ${elements.length} element(s) to ${monthDisplay[month]}`);
    }
  };

  const handleMonthStatusChange = (deptIndex: number, month: string) => {
    if (!canEdit) {
      addToast("Only draft or rejected plans can be modified", "warning");
      return;
    }
    const newPlanData = JSON.parse(JSON.stringify(planData));
    const monthIndex = newPlanData[deptIndex].months.findIndex(
      (m: MonthData) => m.month === month,
    );
    if (monthIndex !== -1) {
      const currentStatus =
        newPlanData[deptIndex].months[monthIndex].status || "";
      const hasElements =
        newPlanData[deptIndex].months[monthIndex].selectedElements?.length > 0;
      if (!hasElements && currentStatus === "") {
        addToast("Please select audit elements first", "warning");
        return;
      }
      let newStatus =
        currentStatus === ""
          ? "PLANNED"
          : currentStatus === "PLANNED"
            ? "COMPLETED"
            : currentStatus === "COMPLETED"
              ? "RESCHEDULED"
              : "";
      newPlanData[deptIndex].months[monthIndex].status = newStatus;
      setPlanData(newPlanData);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      addToast(
        "Only draft, rejected, or change requested plans can be saved",
        "warning",
      );
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast("Department audit plan saved as DRAFT!", "success");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false;
    planData.forEach((dept) =>
      dept.months.forEach((month) => {
        if (month.status === "PLANNED") hasPlanned = true;
      }),
    );
    if (!hasPlanned) {
      addToast(
        "Please mark at least one department-month as PLANNED",
        "warning",
      );
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: "PENDING_APPROVAL",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      await apiClient.post(
        `/api/department-plan/${selectedYear}/submit?userId=${user?.id}`,
        {},
      );
      addToast("Plan submitted for approval successfully!", "success");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to submit plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast("Please provide approval comments", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/department-plan/${selectedYear}/approve?userId=${user?.id}`,
        { comments: tempApprovalComment },
      );
      setPlanStatus("APPROVED");
      setPlanInfo((prev) => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedBy: user?.name || user?.username || "",
        approvedAt: new Date().toISOString(),
      }));
      setShowApproveModal(false);
      setTempApprovalComment("");
      addToast("Plan approved successfully!", "success");
      fetchPlanData();
    } catch (error) {
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
        `/api/department-plan/${selectedYear}/reject?userId=${user?.id}`,
        { reason: tempRejectionReason },
      );
      setPlanStatus("REJECTED");
      setRejectionReason(tempRejectionReason);
      setPlanInfo((prev) => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedBy: user?.name || user?.username || "",
        rejectedAt: new Date().toISOString(),
      }));
      setShowRejectModal(false);
      setTempRejectionReason("");
      addToast("Plan rejected", "error");
      fetchPlanData();
    } catch (error) {
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
        `/api/department-plan/${selectedYear}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      addToast(`Change request submitted for ${selectedYear}`, "warning");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to submit change request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  let totalPlanned = 0,
    totalCompleted = 0,
    totalRescheduled = 0;
  if (planData && planData.length > 0) {
    planData.forEach((dept) => {
      if (dept?.months) {
        dept.months.forEach((month) => {
          if (month.status === "PLANNED") totalPlanned++;
          if (month.status === "COMPLETED") totalCompleted++;
          if (month.status === "RESCHEDULED") totalRescheduled++;
        });
      }
    });
  }

  const canEdit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED");
  const canSubmit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED") &&
    totalPlanned > 0;
  const canApprove = isTopManagement && planStatus === "PENDING_APPROVAL";

  const filteredDepartments = planData.filter((dept) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "planned")
      return dept.months.some((m) => m.status === "PLANNED");
    if (filterStatus === "completed")
      return dept.months.some((m) => m.status === "COMPLETED");
    if (filterStatus === "rescheduled")
      return dept.months.some((m) => m.status === "RESCHEDULED");
    if (filterStatus === "pending")
      return dept.months.some((m) => m.status === "");
    return true;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading department plan...
        </Text>
      </View>
    );
  }

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
                      Department Audit Plan
                    </Text>
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Dept-wise Planning (Financial Year)
                    </Text>
                  </>
                ) : (
                  <>
                    <MarqueeText text="Department Audit Plan" />
                    <Text
                      className="mt-0.5 text-sm font-medium text-slate-500"
                      numberOfLines={1}
                    >
                      Dept-wise Planning (Financial Year)
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
                  onYearChange={(newYear) => {
                    setSelectedYear(newYear);
                    router.setParams({ year: newYear.toString() });
                  }}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={() => {
                    fetchForm3Data();
                    fetchPlanData();
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

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && !isDesktop && (
        <>
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
            {/* ✅ NEW */}
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
                  <Text className="text-[11px] text-slate-500">
                    Change Year
                  </Text>
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
                fetchForm3Data();
                fetchPlanData();
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
          <TouchableOpacity
            className="absolute inset-0 z-50"
            activeOpacity={1}
            onPress={() => setShowMobileMenu(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}

      {/* MAIN SCROLLVIEW */}
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
        {planStatus === "APPROVED" && planInfo.approvalComments && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Approval Comments"
            message={planInfo.approvalComments}
            footer={`Approved by: ${planInfo.approvedBy} | Date: ${formatLocalDateTime(planInfo.approvedAt)}`}
          />
        )}
        {planStatus === "CHANGE_REQUESTED" && planInfo.rejectionReason && (
          <AlertBanner
            type="warning"
            icon={MessageSquare}
            title="Change Request Comments"
            message={planInfo.rejectionReason}
            footer={`Requested by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
          />
        )}
        {planStatus === "REJECTED" && planInfo.rejectionReason && (
          <AlertBanner
            type="error"
            icon={AlertCircle}
            title="Rejection Reason"
            message={planInfo.rejectionReason}
            footer={`Rejected by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
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
                    Sync with Form3 Data
                  </Text>
                  <Text className="mt-1 flex-wrap text-sm text-blue-700">
                    Auto-populate departments (IATF16949 & 5S only)
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <OutlineButton
                  title="Sync Q"
                  icon={Calendar}
                  onPress={handlePlanCurrentQuarter}
                  loading={demoLoading}
                />
                <OutlineButton
                  title="Sync Q1"
                  icon={Clock}
                  onPress={handleQuickPlanned}
                  loading={demoLoading}
                />
                <OutlineButton
                  title="Sync All"
                  icon={Star}
                  onPress={handleDemoPlanned}
                  loading={demoLoading}
                />
              </View>
            </View>
          </Card>
        )}

        {/* Form 3 Summary */}
        <Card className="overflow-hidden p-0">
          <TouchableOpacity
            onPress={() => setShowForm3Details(!showForm3Details)}
            className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 p-4"
          >
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <FileText size={18} color={COLORS.primary} />
              </View>
              <Text className="text-base font-bold text-slate-900">
                Planned Types (Form 3)
              </Text>
            </View>
            <View
              style={{
                transform: [{ rotate: showForm3Details ? "180deg" : "0deg" }],
              }}
            >
              <ChevronDown size={20} color="#64748B" />
            </View>
          </TouchableOpacity>
          {showForm3Details && (
            <View className="flex-row flex-wrap gap-3 p-4">
              {months.map((month) => {
                const elements =
                  auditElementsFromForm3[month] ||
                  getAuditElementsForMonth(month);
                return (
                  <View
                    key={month}
                    className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-slate-800">
                        {monthDisplay[month]}
                      </Text>
                      <View className="rounded-full bg-blue-100 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-blue-800">
                          {getQuarter(month)}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row flex-wrap gap-1.5">
                      {elements.length > 0 ? (
                        elements.map((el) => (
                          <View
                            key={el}
                            className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1"
                          >
                            <Text className="text-[10px] font-semibold text-blue-800">
                              {el.split("(")[0].trim()}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text className="text-xs italic text-slate-400">
                          No audits
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Filter Bar */}
        <Card className="flex-row flex-wrap items-center justify-between gap-3 p-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Filter size={16} color="#64748B" />
            <Text className="text-sm font-semibold text-slate-700">
              Filter:
            </Text>
            {[
              { id: "all", label: "All", color: COLORS.primary },
              { id: "planned", label: "Planned", color: COLORS.primary },
              {
                id: "completed",
                label: "Completed",
                color: COLORS.primaryDark,
              },
              {
                id: "rescheduled",
                label: "Rescheduled",
                color: COLORS.textMuted,
              },
              { id: "pending", label: "Pending", color: COLORS.textMuted },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterStatus(f.id)}
                className="rounded-full border px-3 py-1.5"
                style={{
                  borderColor: filterStatus === f.id ? f.color : "#E2E8F0",
                  backgroundColor: filterStatus === f.id ? f.color : "#FFFFFF",
                }}
                activeOpacity={0.7}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color: filterStatus === f.id ? "#FFFFFF" : "#475569",
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs text-slate-500">
            Showing {filteredDepartments.length} depts
          </Text>
        </Card>

        {/* Main Table */}
        <Card className="overflow-hidden p-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* ✅ Outer wrapper: fixed total width = 180 + 972 = 1152 */}
            <View
              style={{
                flexDirection: "column",
                alignSelf: "flex-start",
                width: TABLE_TOTAL_WIDTH,
              }}
            >
              {/* Table Header */}
              <View className="flex-row border-b border-slate-200 bg-slate-50">
                {/* Audit Area */}
                <View
                  style={{ width: AUDIT_AREA_WIDTH }}
                  className="items-center justify-center border-r border-slate-200 p-3"
                >
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Audit Area
                  </Text>
                </View>

                {/* ✅ Months container: fixed width, columns flex-1 */}
                <View style={{ width: MONTHS_TOTAL_WIDTH }}>
                  <View className="items-center justify-center border-b border-slate-200 p-3">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Months (Financial Year)
                    </Text>
                  </View>
                  <View className="flex-row">
                    {months.map((month) => (
                      <View
                        key={month}
                        className="flex-1 items-center justify-center border-r border-slate-200 p-3"
                      >
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          {monthDisplay[month]}
                        </Text>
                        <Text className="mt-1 text-[10px] font-medium text-slate-400">
                          {getQuarter(month)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Table Body */}
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept, idx) => {
                  const originalIndex = planData.findIndex(
                    (d) => d.department === dept.department,
                  );
                  const hasAnySelected = dept.months?.some(
                    (m) => m.selectedElements && m.selectedElements.length > 0,
                  );
                  const isExpanded = expandedDept === originalIndex;
                  return (
                    <View key={dept.department}>
                      {/* Department Row */}
                      <View className="flex-row border-b border-slate-200 bg-white">
                        {/* Audit Area cell */}
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedDept(isExpanded ? null : originalIndex)
                          }
                          style={{ width: AUDIT_AREA_WIDTH }}
                          className="flex-row items-center gap-2 border-r border-slate-200 p-3"
                          activeOpacity={0.7}
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} color="#64748B" />
                          ) : (
                            <ChevronDown size={16} color="#64748B" />
                          )}
                          <Text
                            className="flex-1 text-sm font-semibold text-slate-800"
                            numberOfLines={1}
                          >
                            {dept.department}
                          </Text>
                          {hasAnySelected && (
                            <View className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5">
                              <Text className="text-[9px] font-bold text-blue-800">
                                ✓
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* ✅ Months cells: fixed-width wrapper + flex-1 cells */}
                        <View
                          style={{ width: MONTHS_TOTAL_WIDTH }}
                          className="flex-row"
                        >
                          {dept.months &&
                            dept.months.map((month, monthIdx) => {
                              const selectedElementsCount =
                                month.selectedElements?.length || 0;
                              const availableElements =
                                auditElementsFromForm3[month.month] ||
                                getAuditElementsForMonth(month.month);
                              const hasElements = selectedElementsCount > 0;
                              return (
                                <View
                                  key={monthIdx}
                                  className="flex-1 items-center justify-center border-r border-slate-200 p-3"
                                >
                                  <TouchableOpacity
                                    onPress={() =>
                                      canEdit &&
                                      handleMonthStatusChange(
                                        originalIndex,
                                        month.month,
                                      )
                                    }
                                    disabled={!canEdit}
                                    className="mb-2"
                                    activeOpacity={0.7}
                                  >
                                    <StatusBadge status={month.status} />
                                  </TouchableOpacity>
                                  {hasElements ? (
                                    <TouchableOpacity
                                      onPress={() =>
                                        canEdit &&
                                        setSelectedMonthForElements({
                                          deptIndex: originalIndex,
                                          month: month.month,
                                        })
                                      }
                                      disabled={!canEdit}
                                      className="flex-row items-center gap-1"
                                      activeOpacity={0.7}
                                    >
                                      <CheckSquare
                                        size={12}
                                        color={COLORS.primary}
                                      />
                                      <Text className="text-[10px] font-bold text-blue-700">
                                        {selectedElementsCount}
                                      </Text>
                                    </TouchableOpacity>
                                  ) : (
                                    canEdit &&
                                    availableElements.length > 0 && (
                                      <TouchableOpacity
                                        onPress={() =>
                                          setSelectedMonthForElements({
                                            deptIndex: originalIndex,
                                            month: month.month,
                                          })
                                        }
                                        className="flex-row items-center gap-1"
                                        activeOpacity={0.7}
                                      >
                                        <Plus size={12} color="#64748B" />
                                        <Text className="text-[10px] font-semibold text-slate-500">
                                          Add
                                        </Text>
                                      </TouchableOpacity>
                                    )
                                  )}
                                  {!hasElements &&
                                    availableElements.length === 0 && (
                                      <Text className="text-[10px] text-slate-300">
                                        —
                                      </Text>
                                    )}
                                </View>
                              );
                            })}
                        </View>
                      </View>

                      {/* ✅ EXPANDED CONTENT — same width as table total */}
                      {isExpanded && (
                        <View
                          style={[
                            styles.expandedRow,
                            {
                              width: TABLE_TOTAL_WIDTH,
                              borderTopWidth: 1,
                              borderTopColor: COLORS.border,
                            },
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 12,
                              padding: 12,
                            }}
                          >
                            {dept.months.map((month, monthIdx) => {
                              const selectedElements =
                                month.selectedElements || [];
                              if (selectedElements.length === 0) return null;
                              return (
                                <View
                                  key={monthIdx}
                                  style={[
                                    styles.expandedMonthCard,
                                    {
                                      width: isDesktop
                                        ? EXPANDED_CARD_WIDTH
                                        : "47%",
                                      minWidth: isDesktop
                                        ? EXPANDED_CARD_WIDTH
                                        : 140,
                                      maxWidth: isDesktop
                                        ? EXPANDED_CARD_WIDTH
                                        : "47%",
                                    },
                                  ]}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 13,
                                        fontWeight: "700",
                                        color: COLORS.textValue,
                                      }}
                                    >
                                      {monthDisplay[month.month]}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: COLORS.primary,
                                        fontWeight: "700",
                                        backgroundColor: COLORS.primaryLight,
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 8,
                                      }}
                                    >
                                      {getQuarter(month.month)}
                                    </Text>
                                  </View>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      flexWrap: "wrap",
                                      gap: 6,
                                    }}
                                  >
                                    {selectedElements.map(
                                      (el: string, idx: number) => (
                                        <View
                                          key={idx}
                                          style={[
                                            styles.chip,
                                            {
                                              backgroundColor: COLORS.chipBg,
                                              borderColor: COLORS.chipBorder,
                                              paddingHorizontal: 10,
                                              paddingVertical: 6,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 11,
                                              color: COLORS.chipText,
                                              fontWeight: "600",
                                            }}
                                            numberOfLines={1}
                                          >
                                            {el}
                                          </Text>
                                        </View>
                                      ),
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="items-center p-10">
                  <FileText size={32} color="#CBD5E1" />
                  <Text className="mt-3 text-sm font-medium text-slate-500">
                    No departments match the selected filter
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Card>

        {/* Legend & Document Control */}
        <Card className="p-5">
          <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
            <View className="flex-1">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                Legend
              </Text>
              <Text className="mb-2 text-sm font-semibold text-slate-800">
                Status Codes:
              </Text>
              <View className="flex-row flex-wrap gap-4">
                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#EFF6FF",
                      borderColor: "#DBEAFE",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#1E3A8A",
                      }}
                    >
                      P
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-600">P - Planned</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#BFDBFE",
                      borderColor: "#2563EB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#1E3A8A",
                      }}
                    >
                      C
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-600">C - Completed</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#F1F5F9",
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#64748B",
                      }}
                    >
                      R
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-600">
                    R - Rescheduled
                  </Text>
                </View>
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                Document Control
              </Text>
              <View className="gap-2">
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Document No.:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    IQA/F/04
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Revision:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {documentRevision}
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Revision Date:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {revisionDate}
                  </Text>
                </View>
                <View className="flex-row">
                  <Text className="w-[100px] text-sm text-slate-500">
                    Frequency:
                  </Text>
                  <Text className="flex-1 text-sm font-medium text-slate-800">
                    {auditFrequency}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Text className="text-sm leading-5 text-slate-600">
              <Text className="font-semibold text-slate-800">
                Audit Criteria:{" "}
              </Text>
              ISO9001:2015, IATF16949 Standard, QMS Manual, Procedures, WI, etc.
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              <Text className="font-semibold text-slate-800">
                Audit Scope:{" "}
              </Text>
              Applicable process within department/function and clause No. 4, 5,
              6, 7, 8, 9 & 10.
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              <Text className="font-semibold text-slate-800">
                Audit Method:{" "}
              </Text>
              Interview with Auditee, Observation and verification to check
              compliance.
            </Text>
          </View>
        </Card>

        {/* Actions */}
        <Card className="p-5">
          <View
            className={`${isDesktop ? "flex-row" : "flex-col"} items-center justify-between gap-4`}
            style={
              isDesktop ? { flexDirection: "row" } : { flexDirection: "column" }
            }
          >
            <View className="flex-row items-center gap-2">
              {canSubmit ? (
                <CheckCircle size={16} color={COLORS.primary} />
              ) : (
                <AlertCircle size={16} color="#64748B" />
              )}
              <Text className="text-sm text-slate-600">
                {canSubmit ? "Ready to submit" : "Complete planning to submit"}
              </Text>
            </View>
            {(planData.length > 0 ||
              canEdit ||
              canSubmit ||
              canApprove ||
              (isTopManagement && planStatus === "APPROVED")) && (
              <View
                className={`${isDesktop ? "flex-row" : "flex-row"} flex-wrap ${isDesktop ? "justify-end" : "justify-center"} gap-3`}
              >
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
                  />
                )}
                {canApprove && (
                  <>
                    <OutlineButton
                      title="Reject"
                      icon={X}
                      onPress={() => setShowRejectModal(true)}
                    />
                    <OutlineButton
                      title="Approve"
                      icon={Check}
                      onPress={() => setShowApproveModal(true)}
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
                <OutlineButton
                  title="View PDF"
                  icon={Eye}
                  onPress={handleViewPDF}
                  loading={exporting}
                />
              </View>
            )}
          </View>
        </Card>

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

        {/* PDF Viewer */}
        <PDFViewer
          visible={pdfViewer.visible}
          pdfData={pdfViewer.pdfData}
          fileName={pdfViewer.fileName}
          auditId={String(selectedYear)}
          auditNumber={`Form4-${selectedYear}`}
          pdfType="form4"
          forumGroups={[
            {
              id: `AUDIT-${selectedYear}`,
              name: `📋 Audit Review ${selectedYear}`,
              type: "Audit",
            },
            {
              id: "AUDIT-general-forum",
              name: "📢 General Discussion",
              type: "General",
            },
          ]}
          plantId={(user as any)?.plantId ?? null}
          plantName={(user as any)?.plantName ?? null}
          onClose={() =>
            setPDFViewer({ visible: false, pdfData: "", fileName: "" })
          }
          onShareComplete={handleShareComplete}
          onNavigateToForum={handleNavigateToForum}
          currentUser={user}
          allUsers={allUsers}
        />
      </ScrollView>

      {/* Modals */}
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
        iconColor={COLORS.stateErrorText}
        iconBg={COLORS.stateErrorBg}
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg={COLORS.stateErrorText}
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
        iconColor={COLORS.stateWarningText}
        iconBg={COLORS.stateWarningBg}
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg={COLORS.stateWarningText}
        submitting={submitting}
      />

      <ElementSelectionModal
        isOpen={!!selectedMonthForElements}
        onClose={() => setSelectedMonthForElements(null)}
        month={selectedMonthForElements?.month}
        availableElements={
          selectedMonthForElements
            ? auditElementsFromForm3[selectedMonthForElements.month] ||
              getAuditElementsForMonth(selectedMonthForElements.month)
            : []
        }
        selectedElements={
          selectedMonthForElements
            ? planData[selectedMonthForElements.deptIndex]?.months.find(
                (m) => m.month === selectedMonthForElements.month,
              )?.selectedElements || []
            : []
        }
        onSave={(elements: string[]) =>
          handleAddElementsToMonth(
            selectedMonthForElements!.deptIndex,
            selectedMonthForElements!.month,
            elements,
          )
        }
      />

      {/* Year Selection Modal (Mobile) */}
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
                    setSelectedYear(year);
                    setShowYearModal(false);
                    router.setParams({ year: year.toString() });
                  }}
                  className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${
                    selectedYear === year
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-100 bg-white"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedYear === year
                        ? "font-bold text-blue-700"
                        : "text-slate-700"
                    }`}
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
