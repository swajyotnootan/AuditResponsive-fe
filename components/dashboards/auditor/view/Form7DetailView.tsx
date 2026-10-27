import PDFViewer from "@/components/audit/PDFViewer";
import { useAuth } from "@/components/context/AuthContext";
import FinalPreview from "@/components/eightd/steps/FinalPreview";
import { API_BASE_URL } from "@/config/apiConfig";
import { ncrService } from "@/services/ncrService";
import { getDashboardPath } from "@/utils/roleUtils";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileBarChart,
  FileText,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Form8View from "../../auditee/Form8View";

// ─────────────────────────────────────────────────────────────
// ✅ Build auth headers consistently
// ─────────────────────────────────────────────────────────────
const getAuthHeaders = (user: any) => {
  return {
    "X-User-Id": user?.id != null ? String(user.id) : "",
    "X-Timezone":
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  };
};
// ─────────────────────────────────────────────────────────────
// COLOR PALETTE & STYLES
// ─────────────────────────────────────────────────────────────
// const COLORS = {
//   primary: "#00529B",
//   secondary: "#3b82f6",
//   dark: "#1e3a8a",
//   light: "#60a5fa",
//   lighter: "#93c5fd",
//   bg: "#eff6ff",
//   white: "#ffffff",
//   success: "#10b981",
//   warning: "#f59e0b",
//   danger: "#ef4444",
//   stateErrorText: "#475569", // Added to fix TS error
//   stateWarningText: "#64748B", // Added to fix TS error
// };

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

// ─────────────────────────────────────────────────────────────
// ✅ UTC TO IST CONVERTER
// ─────────────────────────────────────────────────────────────
const convertUTCToIST = (
  utcDateString: string | null | undefined,
): string | null => {
  if (!utcDateString) return null;

  try {
    const date = new Date(utcDateString);
    if (isNaN(date.getTime())) return null;

    // IST is UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istDate = new Date(date.getTime() + istOffset);

    return istDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata", // Explicitly set timezone
    });
  } catch (error) {
    console.error("Error converting UTC to IST:", error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// ✅ FORMAT DATE FOR DISPLAY (with IST conversion)
// ─────────────────────────────────────────────────────────────
const formatDateIST = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch (error) {
    return "—";
  }
};

const getIconColor = (textClass: string) => {
  if (textClass.includes("amber")) return "#92400e";
  if (textClass.includes("blue")) return "#1e40af";
  if (textClass.includes("emerald")) return "#065f46";
  if (textClass.includes("purple")) return "#581c87";
  if (textClass.includes("green")) return "#166534";
  if (textClass.includes("red")) return "#991b1b";
  if (textClass.includes("cyan")) return "#0e7490";
  return "#334155";
};

// ============================================================================
// REUSABLE OUTLINE BUTTON WITH HOVER EFFECT
// ============================================================================
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? COLORS.primary : "#D1D5DB";
  const textColor = isHoveredAndEnabled ? COLORS.primary : "#111827";
  const iconColor = isHoveredAndEnabled ? COLORS.primary : "#6B7280";
  const backgroundColor = isHoveredAndEnabled
    ? "rgba(0, 82, 155, 0.1)"
    : "transparent";

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
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg border px-4 py-2.5"
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
        <Icon size={16} color={iconColor} />
      ) : null}

      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// REUSABLE UI COMPONENTS
// ─────────────────────────────────────────────────────────────
const BackButton = ({
  label = "Back to NCRs",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
  >
    <ArrowLeft size={16} color="#334155" />
    <Text className="font-serif text-sm font-medium text-slate-700">
      {label}
    </Text>
  </TouchableOpacity>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: any = {
    AWAITING_AUDITEE: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      icon: Clock,
      label: "Awaiting Auditee Review",
    },
    OPEN: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: AlertCircle,
      label: "Pending Manager Approval",
    },
    APPROVED: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      icon: CheckCircle,
      label: "Approved - Ready for Corrective Action",
    },
    IN_PROGRESS: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: FileText,
      label: "Corrective Action Submitted",
    },
    CLOSED: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: CheckCircle,
      label: "Closed",
    },
    REJECTED: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: X,
      label: "Rejected",
    },
    SENT_TO_8D: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: FileBarChart,
      label: "Sent to 8D",
    },
    IN_8D_PROCESS: {
      bg: "bg-cyan-100",
      text: "text-cyan-800",
      icon: FileBarChart,
      label: "In 8D Process",
    },
    READY_FOR_NCR2: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: FileText,
      label: "Ready for NCR2",
    },
    NCR2_IN_PROGRESS: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: FileText,
      label: "NCR2 Verification",
    },
    NCR2_COMPLETED: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: CheckCircle,
      label: "NCR2 Completed",
    },
  };
  const { bg, text, icon: Icon, label } = config[status] || config.OPEN;
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${bg}`}
    >
      <Icon size={12} color={getIconColor(text)} />
      <Text className={`text-xs font-semibold ${text} font-serif`}>
        {label}
      </Text>
    </View>
  );
};

const InfoCard = ({ icon: Icon, label, value }: any) => (
  <View className="flex-row items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
    <View className="rounded-lg border border-slate-200 bg-white p-2">
      <Icon size={16} color="#ef4444" />
    </View>
    <View className="flex-1">
      <Text className="font-serif text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </Text>
      <Text className="font-serif text-sm font-semibold text-gray-800">
        {value || "—"}
      </Text>
    </View>
  </View>
);

const FormSection = ({ title, children }: any) => (
  <View className="border-b border-gray-100 px-4 py-5">
    <View className="mb-4 self-start border-b-2 border-red-500 pb-2">
      <Text className="font-serif text-base font-bold text-gray-800">
        {title}
      </Text>
    </View>
    <View className="mt-3">{children}</View>
  </View>
);

const DetailRow = ({ label, value, multiline = false }: any) => (
  <View className="mb-3 border-b border-gray-50 pb-2">
    <Text className="mb-1 font-serif text-xs font-semibold uppercase tracking-wider text-gray-500">
      {label}
    </Text>
    {multiline ? (
      <View className="rounded-lg bg-slate-50 p-3">
        <Text className="font-serif text-sm leading-relaxed text-gray-800">
          {value || "—"}
        </Text>
      </View>
    ) : (
      <Text className="font-serif text-sm font-medium text-gray-800">
        {value || "—"}
      </Text>
    )}
  </View>
);

const SignatureField = ({
  label,
  name,
  signature,
  pending = false,
  timestamp,
}: any) => {
  const formattedTimestamp = convertUTCToIST(timestamp);

  if (signature) {
    console.log(
      `🖼️ [SIGNATURE UI DEBUG] ${label} received. Starts with:`,
      signature.substring(0, 30),
    );
  }

  return (
    <View className="w-full items-center">
      <Text className="mb-2 font-serif text-xs font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </Text>

      {signature &&
      (signature.startsWith("data:image") || signature.startsWith("http")) ? (
        <View
          className="w-full rounded-lg border border-gray-200 bg-slate-50 p-2"
          style={{
            minHeight: 60,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={{ uri: signature }}
            style={{ width: "100%", height: 48 }}
            resizeMode="contain"
            onError={(e) =>
              console.error(
                `❌ Image load error for ${label}:`,
                e.nativeEvent.error,
              )
            }
          />
        </View>
      ) : pending ? (
        <View className="h-20 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50">
          <Clock size={20} color="#f59e0b" style={{ marginBottom: 4 }} />
          <Text className="font-serif text-xs font-medium text-amber-600">
            Pending Acknowledgement
          </Text>
        </View>
      ) : (
        <View className="h-20 w-full rounded-lg border-2 border-dashed border-gray-300 bg-slate-50" />
      )}

      <Text className="mt-2 font-serif text-xs font-medium text-gray-500">
        {name || "—"}
      </Text>

      {formattedTimestamp && (
        <View className="mt-1 flex-row items-center justify-center gap-1">
          <Clock size={11} color="#9ca3af" />
          <Text className="font-serif text-xs text-gray-400">
            {formattedTimestamp}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────
const ReviewModal = ({
  ncr,
  onClose,
  onReview,
  loading,
  title = "Review NCR",
  approveLabel = "Approve",
  rejectLabel = "Reject",
  sendTo8D,
  setSendTo8D,
  reviewComment,
  setReviewComment,
}: any) => {
  const [decision, setDecision] = useState<string | null>(null);

  const handleReview = (approved: boolean) => {
    if (!approved && !reviewComment.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }
    setDecision(approved ? "approve" : "reject");
    onReview(approved, reviewComment);
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
            <View className="flex-row items-center gap-2">
              <FileText size={18} color={COLORS.primary} />
              <Text className="font-serif text-lg font-bold text-slate-900">
                {decision === "approve"
                  ? "Approving..."
                  : decision === "reject"
                    ? "Rejecting..."
                    : title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-lg p-1"
              activeOpacity={0.7}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" keyboardShouldPersistTaps="handled">
            <View className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <Text className="text-sm font-semibold text-slate-800">
                {ncr?.ncrNumber}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                Department: {ncr?.department}
              </Text>
            </View>

            {ncr?.auditScore != null && (
              <View className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Audit Score
                    </Text>
                    <Text
                      className="text-2xl font-bold"
                      style={{
                        color:
                          ncr.auditScore >= 70
                            ? COLORS.primary
                            : COLORS.stateErrorText,
                      }}
                    >
                      {ncr.auditScore}%
                    </Text>
                  </View>
                  <View className="flex-1 items-end pl-2">
                    <Text className="text-right text-xs text-slate-500">
                      {ncr.auditScore >= 70
                        ? "✅ Above threshold - Normal NCR flow"
                        : "⚠️ Below threshold - Requires 8D process"}
                    </Text>
                  </View>
                </View>
                <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <View
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${ncr.auditScore}%`,
                      backgroundColor:
                        ncr.auditScore >= 70
                          ? COLORS.primary
                          : COLORS.stateErrorText,
                    }}
                  />
                </View>
              </View>
            )}

            {ncr?.auditScore != null && ncr.auditScore < 70 && (
              <View className="mb-4 flex-row items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <TouchableOpacity
                  onPress={() => setSendTo8D(!sendTo8D)}
                  className="mt-0.5"
                  activeOpacity={0.7}
                >
                  <View
                    className={`h-4 w-4 items-center justify-center rounded border ${
                      sendTo8D
                        ? "border-[#00529B] bg-[#00529B]"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {sendTo8D && <CheckCircle size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-800">
                    Send to 8D Team for investigation
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Audit score ({ncr.auditScore}%) is below threshold (70%).
                    Recommended to send to 8D instead of normal corrective
                    action.
                  </Text>
                </View>
              </View>
            )}

            <View className="mb-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Comments{" "}
                {!decision && (
                  <Text className="text-[10px] text-slate-400">
                    (required for rejection)
                  </Text>
                )}
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                style={{ textAlignVertical: "top", minHeight: 100 }}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Enter review comments..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity
                onPress={() => handleReview(false)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
                activeOpacity={0.8}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading && decision === "reject" ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.stateErrorText}
                  />
                ) : (
                  <ThumbsDown size={16} color={COLORS.stateErrorText} />
                )}
                <Text
                  className="text-sm font-semibold"
                  style={{ color: COLORS.stateErrorText }}
                >
                  {rejectLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReview(true)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: COLORS.primary,
                  opacity: loading ? 0.5 : 1,
                }}
                activeOpacity={0.8}
              >
                {loading && decision === "approve" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThumbsUp size={16} color="#fff" />
                )}
                <Text className="text-sm font-semibold text-white">
                  {approveLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const AuditeeReviewModal = ({
  ncr,
  onClose,
  onReview,
  loading,
  reviewComment,
  setReviewComment,
}: any) => {
  return (
    <Modal visible={true} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <View className="items-center border-b border-slate-100 bg-slate-50 px-6 pb-6 pt-8">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 shadow-lg">
              <Users size={32} color={COLORS.primary} />
            </View>
            <Text className="text-xl font-bold text-slate-900">
              Auditee NCR Review
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              NCR Number:{" "}
              <Text className="font-semibold" style={{ color: COLORS.primary }}>
                {ncr?.ncrNumber || "—"}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="absolute right-4 top-4 rounded-lg p-2"
              activeOpacity={0.7}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
            <View className="mb-5">
              <View className="items-center rounded-xl border border-slate-100 bg-slate-50 p-4">
                <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Department
                </Text>
                <Text
                  className="text-sm font-semibold text-slate-800"
                  numberOfLines={1}
                >
                  {ncr?.department || "—"}
                </Text>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Comments{" "}
                <Text className="text-[10px] text-slate-400">(required)</Text>
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                style={{ textAlignVertical: "top", minHeight: 100 }}
                placeholder="Enter your review comments..."
                placeholderTextColor="#94A3B8"
                value={reviewComment}
                onChangeText={setReviewComment}
              />
            </View>

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity
                onPress={() => onReview(false, reviewComment)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
                activeOpacity={0.8}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.stateErrorText}
                  />
                ) : (
                  <ThumbsDown size={16} color={COLORS.stateErrorText} />
                )}
                <Text
                  className="text-sm font-semibold"
                  style={{ color: COLORS.stateErrorText }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onReview(true, reviewComment)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: COLORS.primary,
                  opacity: loading ? 0.5 : 1,
                }}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThumbsUp size={16} color="#fff" />
                )}
                <Text className="text-sm font-semibold text-white">Accept</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function Form7DetailView({
  initialParams,
  onClose,
  onNavigateToForm8,
}: any) {
  const router = useRouter();
  const urlParams = useLocalSearchParams();

  const [activeForm8Config, setActiveForm8Config] = useState<any>(null);

  const params = { ...urlParams, ...initialParams };
  const id = params.id as string;

  const { user, isAuditManager, isAuditee, isHOD } = useAuth();
  const dashboardPath = getDashboardPath(user) || "/";
  const isAuditeeRole = isAuditee || isHOD;

  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [ncr, setNcr] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAuditeeReviewModal, setShowAuditeeReviewModal] = useState(false);
  const [auditorSignature, setAuditorSignature] = useState<string | null>(null);
  const [auditeeSignature, setAuditeeSignature] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [sendTo8D, setSendTo8D] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [show8DReportModal, setShow8DReportModal] = useState(false);
  const [selected8DEventId, setSelected8DEventId] = useState<string | null>(
    null,
  );
  const [loading8DReport, setLoading8DReport] = useState(false);
  const [activeForm8DetailConfig, setActiveForm8DetailConfig] =
    useState<any>(null);
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          headers: {
            Accept: "application/json",
            ...getAuthHeaders(user),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAllUsers(Array.isArray(data) ? data : data.users || []);
        }
      } catch (error) {
        console.error("Failed to fetch users for email:", error);
      }
    };
    fetchUsers();
  }, [user?.id]);

  const fetchSignature = async (userId: string | number, fullName?: string) => {
    try {
      let url = "";

      if (userId) {
        url = `${API_BASE_URL}/api/users/${userId}/signature`;
      } else if (
        fullName &&
        fullName !== "Not specified" &&
        fullName !== "N/A" &&
        fullName !== "Unknown"
      ) {
        const nameParts = fullName.trim().split(" ", 2);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts[1] : "";
        url = `${API_BASE_URL}/api/users/signature?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`;
      } else {
        return null;
      }

      console.log("🔗 [FETCH SIGNATURE] Fetching from:", url);

      if (Platform.OS === "web") {
        const response = await fetch(url, {
          headers: {
            Accept: "image/png, image/jpeg, application/json",
            ...getAuthHeaders(user),
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          console.log(
            "✅ [FETCH SIGNATURE] Web Blob received, size:",
            blob.size,
          );

          return new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log("✅ [FETCH SIGNATURE] Web FileReader completed");
              resolve(reader.result as string);
            };
            reader.onerror = (error) => {
              console.error(
                "❌ [FETCH SIGNATURE] Web FileReader error:",
                error,
              );
              resolve(null);
            };
            reader.readAsDataURL(blob);
          });
        }
        console.warn(
          "⚠️ [FETCH SIGNATURE] Web Response not OK:",
          response.status,
        );
        return null;
      } else {
        const fileUri = `${FileSystem.cacheDirectory}signature_${userId}.tmp`;

        console.log("📱 [FETCH SIGNATURE] Downloading via expo-file-system...");
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {
            headers: {
              Accept: "image/png, image/jpeg, application/json",
              ...getAuthHeaders(user),
            },
          },
        );
        const downloadResult = await downloadResumable.downloadAsync();

        if (!downloadResult || downloadResult.status !== 200) {
          console.error(
            "❌ [FETCH SIGNATURE] Mobile download failed, status:",
            downloadResult?.status,
          );
          return null;
        }

        console.log(
          "✅ [FETCH SIGNATURE] Mobile Downloaded to:",
          downloadResult.uri,
        );

        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const contentType =
          downloadResult.headers?.["content-type"] || "image/png";
        const dataUri = `data:${contentType};base64,${base64}`;

        console.log(
          "✅ [FETCH SIGNATURE] Mobile base64 generated successfully, length:",
          dataUri.length,
        );
        return dataUri;
      }
    } catch (error) {
      console.error("❌ [FETCH SIGNATURE] Exception:", error);
      return null;
    }
  };

  const fetchNCRDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ncrService.getNCRById(id);
      if (result.success) {
        const ncrData = result.data;
        console.log("🔍 [DEBUG] NCR Data fetched:", ncrData);
        setNcr(ncrData);

        const auditorId = ncrData.auditorId || ncrData.auditor?.id;
        const auditorName = ncrData.auditorName || ncrData.auditor?.name;

        if (auditorId || auditorName) {
          console.log(
            "🔍 [DEBUG] Fetching signature for auditorId:",
            auditorId,
            "or name:",
            auditorName,
          );
          const sig = await fetchSignature(auditorId, auditorName);
          console.log(
            "🔍 [DEBUG] Auditor signature result:",
            sig ? "Success" : "Null",
          );
          if (sig) setAuditorSignature(sig);
        }

        const auditeeId = ncrData.auditeeId || ncrData.auditee?.id;
        const auditeeName = ncrData.auditeeName || ncrData.auditee?.name;

        if (auditeeId || auditeeName) {
          console.log(
            "🔍 [DEBUG] Fetching signature for auditeeId:",
            auditeeId,
            "or name:",
            auditeeName,
          );
          const sig = await fetchSignature(auditeeId, auditeeName);
          console.log(
            "🔍 [DEBUG] Auditee signature result:",
            sig ? "Success" : "Null",
          );
          if (sig) setAuditeeSignature(sig);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("❌ [DEBUG] Error in fetchNCRDetail:", err);
      setError("Failed to load NCR details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchNCRDetail();
  }, [id]);

  const downloadPDF = async () => {
    if (!ncr?.id) {
      Alert.alert("Error", "NCR ID not found");
      return;
    }
    setPdfDownloading(true);
    try {
      let token = null;
      if (Platform.OS === "web") {
        token = localStorage.getItem("token");
      } else {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        token = await AsyncStorage.getItem("authToken");
      }

      const url = `${API_BASE_URL}/api/ncr/${ncr.id}/form7-pdf`;

      if (Platform.OS === "web") {
        const response = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            ...getAuthHeaders(user),
          },
        });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `Form7_NCR_${ncr.ncrNumber || ncr.id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(blobUrl);
        } else {
          Alert.alert("Error", "Failed to download PDF");
        }
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error("PDF download error:", err);
      Alert.alert("Error", "Error downloading PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleViewPDF = async () => {
    if (!ncr?.id) {
      Alert.alert("Error", "NCR ID not found");
      return;
    }
    setPdfDownloading(true);
    try {
      let token = null;
      if (Platform.OS === "web") {
        token = localStorage.getItem("token");
      } else {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        token = await AsyncStorage.getItem("authToken");
      }

      const url = `${API_BASE_URL}/api/ncr/${ncr.id}/form7-pdf`;

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          ...getAuthHeaders(user),
        },
      });

      if (!response.ok) throw new Error("Failed to fetch PDF");

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setPDFViewer({
        visible: true,
        pdfData: base64,
        fileName: `Form7_NCR_${ncr.ncrNumber || ncr.id}.pdf`,
      });
    } catch (err) {
      console.error("PDF view error:", err);
      Alert.alert("Error", "Failed to load PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleReview = async (approved: boolean, comment: string) => {
    setReviewLoading(true);
    setError(null);
    try {
      let result;
      if (approved && sendTo8D && ncr?.auditScore < 70) {
        result = await ncrService.sendTo8D(id, comment, user?.id as any);
        if (!result || !result.success) {
          throw new Error(result?.error || "Failed to send to 8D");
        }
        setShowReviewModal(false);
        await fetchNCRDetail();
        return;
      }

      if (approved) {
        result = await ncrService.reviewNCR(id, comment, true);
      } else {
        result = await ncrService.reviewNCR(id, comment, false);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || "Operation failed");
      }

      setShowReviewModal(false);
      await fetchNCRDetail();
    } catch (error: any) {
      console.error("Review Error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAuditeeReview = async (approved: boolean, comment: string) => {
    setReviewLoading(true);
    const result = await ncrService.auditeeReviewNCR(id, approved, comment, "");
    if (result.success) {
      setShowAuditeeReviewModal(false);
      await fetchNCRDetail();
    } else {
      setError(result.error);
    }
    setReviewLoading(false);
  };

  const resolve8DEventId = async () => {
    const directCandidates = [
      ncr?.eightDEventId,
      ncr?.eightDEventNo,
      ncr?.eventNo,
      ncr?.ncrNumber ? `8D-${ncr.ncrNumber}` : null,
    ].filter(Boolean);

    for (const candidate of directCandidates) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/eightd/data/${encodeURIComponent(candidate as string)}`,
          {
            headers: getAuthHeaders(user),
          },
        );
        const data = await response.json();
        if (response.ok && data?.success && data?.data) return candidate;
      } catch {
        // Try the next candidate/fallback search.
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`,
      {
        headers: getAuthHeaders(user),
      },
    );
    const data = await response.json();
    const events = Array.isArray(data?.data) ? data.data : [];
    const matchedEvent = events.find((event: any) => {
      const d0Data = Array.isArray(event?.content?.d0)
        ? event.content.d0[0]
        : {};
      return (
        String(d0Data?.sourceNcrId || "") === String(ncr?.id || "") ||
        String(d0Data?.sourceNcrNumber || "") ===
          String(ncr?.ncrNumber || "") ||
        String(event?.eventNo || "") === `8D-${ncr?.ncrNumber || ""}`
      );
    });

    return matchedEvent?.eventNo || null;
  };

  const open8DReport = async () => {
    try {
      setLoading8DReport(true);
      const eventId = await resolve8DEventId();
      if (!eventId) {
        Alert.alert(
          "Not Found",
          `8D report not found for NCR ${ncr?.ncrNumber || ncr?.id}`,
        );
        return;
      }
      setSelected8DEventId(eventId);
      setShow8DReportModal(true);
    } catch (error) {
      console.error("Error opening 8D report:", error);
      Alert.alert("Error", "Failed to open 8D report.");
    } finally {
      setLoading8DReport(false);
    }
  };

  const finalAuditorSignature = auditorSignature || ncr?.auditorSignature;
  const auditeeHasReviewed = ncr?.status !== "AWAITING_AUDITEE";
  const finalAuditeeSignature = auditeeHasReviewed
    ? auditeeSignature || ncr?.auditeeSignature
    : null;

  const canManagerReview = isAuditManager && ncr?.status === "OPEN";
  const canAuditeeReview = isAuditeeRole && ncr?.status === "AWAITING_AUDITEE";
  const canSubmitCA =
    isAuditeeRole &&
    (ncr?.status === "APPROVED" || ncr?.status === "READY_FOR_NCR2");
  const canEdit = ncr?.status === "OPEN";

  const isNcr2Flow = Boolean(
    ncr?.ncr2RootCause ||
    ncr?.ncr2Correction ||
    ncr?.ncr2CorrectiveAction ||
    ["READY_FOR_NCR2", "NCR2_IN_PROGRESS", "NCR2_COMPLETED"].includes(
      ncr?.status,
    ),
  );

  const is8DRelated = Boolean(
    ncr?.requires8D ||
    [
      "SENT_TO_8D",
      "IN_8D_PROCESS",
      "READY_FOR_NCR2",
      "NCR2_IN_PROGRESS",
      "NCR2_COMPLETED",
    ].includes(ncr?.status),
  );

  const renderActiveForm8 = () => {
    if (!activeForm8Config) return null;
    return (
      <Form8View
        initialParams={activeForm8Config}
        onClose={() => {
          setActiveForm8Config(null);
          fetchNCRDetail();
        }}
      />
    );
  };

  const render8DPreview = () => {
    if (!show8DReportModal || !selected8DEventId) return null;

    return (
      <FinalPreview
        eventId={selected8DEventId}
        isHOD={isHOD || false}
        onRefresh={() => {
          setShow8DReportModal(false);
          setSelected8DEventId(null);
          fetchNCRDetail();
        }}
      />
    );
  };

  if (activeForm8Config) {
    return renderActiveForm8();
  }

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-50"
        style={{ flex: 1 }}
      >
        <View className="items-center">
          <Loader2 size={48} color="#ef4444" className="mb-4" />
          <Text className="font-serif font-medium text-gray-500">
            Loading NCR details...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !ncr) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-50"
        style={{ flex: 1 }}
      >
        <View className="mx-4 max-w-md items-center rounded-2xl bg-white p-8 shadow-lg">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="mb-4 text-center font-serif text-gray-600">
            {error || "NCR not found"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              onClose ? onClose() : router.replace(dashboardPath as any)
            }
            className="rounded-xl bg-red-500 px-5 py-2.5"
          >
            <Text className="font-serif font-medium text-white">
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          contentContainerClassName="p-4"
        >
          {/* Top Action Bar */}
          <View className="mx-auto mb-5 w-full max-w-5xl flex-row flex-wrap items-center justify-between gap-3">
            <BackButton
              label="Back"
              onPress={() =>
                onClose ? onClose() : router.replace(dashboardPath as any)
              }
            />
            <View className="flex-row items-center gap-3">
              <StatusBadge status={ncr.status} />
              <OutlineButton
                title="View PDF"
                icon={FileText}
                onPress={handleViewPDF}
                disabled={pdfDownloading}
                loading={pdfDownloading}
              />
              <OutlineButton
                title="Download PDF"
                icon={Download}
                onPress={downloadPDF}
                disabled={pdfDownloading}
                loading={pdfDownloading}
              />
            </View>
          </View>

          {/* Main Form Card */}
          <View className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
            {/* Header */}
            <View
              className="px-6 py-6"
              style={{
                backgroundColor: COLORS.primaryLight,
                borderColor: COLORS.primaryBorder,
              }}
            >
              <View className="flex-row flex-wrap items-start justify-between gap-4">
                <View className="min-w-[200px] flex-1">
                  <Text
                    className="text-xl font-bold"
                    style={{ color: COLORS.primaryDark }}
                  >
                    Nonconformity Report (NCR)
                  </Text>
                  <Text
                    className="mt-1 text-sm"
                    style={{ color: COLORS.primaryDark }}
                  >
                    {ncr.companyName}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: COLORS.primaryDark }}
                  >
                    Audit Report:{" "}
                    {ncr.auditReportNumber || "AUD-IATF-202610-006"}
                  </Text>
                  <Text
                    className="mt-1 text-xl font-bold"
                    style={{ color: COLORS.primaryDark }}
                  >
                    {ncr.ncrNumber || "NCR-000001"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Cards Row */}
            <View className="border-b border-gray-100 bg-white px-4 py-4">
              <View className="flex-row flex-wrap gap-3">
                <View className="w-[48%] md:w-[23%]">
                  <InfoCard
                    icon={Building}
                    label="Department"
                    value={ncr.department}
                  />
                </View>
                <View className="w-[48%] md:w-[23%]">
                  <InfoCard
                    icon={User}
                    label="Auditor"
                    value={ncr.auditorName}
                  />
                </View>
                <View className="w-[48%] md:w-[23%]">
                  <InfoCard
                    icon={Users}
                    label="Auditee"
                    value={ncr.auditeeName}
                  />
                </View>
                <View className="w-[48%] md:w-[23%]">
                  <InfoCard
                    icon={Calendar}
                    label="Due Date"
                    value={formatDateIST(ncr.dueDate)}
                  />
                </View>
              </View>
            </View>

            {/* Section 1: Nonconformity Details */}
            <FormSection title="📋 Nonconformity Details">
              <DetailRow
                label="Process / Area / Department"
                value={ncr.department}
              />
              <DetailRow label="Clause Reference" value={ncr.clauseNumber} />
              <DetailRow
                label="Objective Evidence"
                value={ncr.objectiveEvidence}
                multiline
              />
              <DetailRow
                label="Statement of Nonconformity"
                value={ncr.statementOfNonconformity}
                multiline
              />
            </FormSection>

            {/* Section 2: Acknowledgement & Signatures */}
            <FormSection title="✍️ Acknowledgement">
              <View className="flex-row flex-wrap gap-6">
                <View className="min-w-[45%] flex-1">
                  <SignatureField
                    label="Auditor Signature"
                    name={ncr.auditorName}
                    signature={finalAuditorSignature}
                    timestamp={ncr.createdAt || ncr.auditorSignedAt || null}
                  />
                </View>
                <View className="min-w-[45%] flex-1">
                  <SignatureField
                    label="Auditee Representative"
                    name={ncr.auditeeName}
                    signature={finalAuditeeSignature}
                    pending={!auditeeHasReviewed}
                    timestamp={
                      auditeeHasReviewed
                        ? ncr.updatedAt || ncr.auditeeSignedAt || null
                        : null
                    }
                  />
                </View>
              </View>
            </FormSection>

            {/* Manager Comment Section */}
            {ncr.managerReviewComment && (
              <View className="border-b border-blue-100 bg-blue-50 px-4 py-4">
                <View className="flex-row gap-3">
                  <View className="rounded-lg bg-blue-100 p-2">
                    <AlertCircle size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-serif text-xs font-semibold uppercase tracking-wider text-blue-700">
                      Audit Manager Comment
                    </Text>
                    <Text className="mt-1 font-serif text-sm text-blue-900">
                      {ncr.managerReviewComment}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Footer */}
            <View className="border-t border-gray-200 bg-slate-50 px-4 py-4">
              <View className="flex-row flex-wrap justify-center gap-4">
                <View className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full bg-green-500" />
                  <Text className="font-serif text-xs text-slate-600">
                    (O+)Ve: Conformance
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full bg-red-500" />
                  <Text className="font-serif text-xs text-slate-600">
                    (O-)Ve: Non Conformance
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="h-2 w-2 rounded-full bg-amber-500" />
                  <Text className="font-serif text-xs text-slate-600">
                    (OI): Opportunity for Improvement
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mx-auto mt-6 w-full max-w-5xl flex-row flex-wrap justify-end gap-3 px-4">
            {(ncr?.rootCause?.trim() ||
              ncr?.correction?.trim() ||
              ncr?.correctiveAction?.trim() ||
              ncr?.ncr2RootCause?.trim() ||
              ncr?.ncr2Correction?.trim() ||
              ncr?.ncr2CorrectiveAction?.trim()) && (
              <OutlineButton
                title="View NCR2"
                icon={Eye}
                onPress={() => {
                  if (onNavigateToForm8) {
                    onNavigateToForm8({
                      id: ncr.id,
                      type: isNcr2Flow ? "ncr2" : "normal",
                    });
                  }
                }}
              />
            )}

            {is8DRelated && (
              <OutlineButton
                title="View 8D Report"
                icon={FileBarChart}
                onPress={open8DReport}
                disabled={loading8DReport}
                loading={loading8DReport}
              />
            )}

            {canManagerReview && (
              <OutlineButton
                title="Review & Decide"
                icon={CheckCircle}
                onPress={() => setShowReviewModal(true)}
              />
            )}

            {canAuditeeReview && (
              <OutlineButton
                title="Accept / Reject"
                icon={ThumbsUp}
                onPress={() => setShowAuditeeReviewModal(true)}
              />
            )}

            {canEdit && (
              <OutlineButton
                title="Edit NCR"
                icon={Edit}
                onPress={() => router.push(`/form7?id=${ncr.id}` as any)}
              />
            )}

            {canSubmitCA && (
              <OutlineButton
                title={
                  ncr?.status === "READY_FOR_NCR2"
                    ? "Submit NCR2"
                    : "Submit Corrective Action"
                }
                icon={FileText}
                onPress={() => {
                  setActiveForm8Config({
                    id: ncr.id,
                    type: ncr?.status === "READY_FOR_NCR2" ? "ncr2" : "normal",
                  });
                }}
              />
            )}

            {isAuditeeRole &&
              ncr.status === "IN_PROGRESS" &&
              ncr.rejectionReason && (
                <OutlineButton
                  title="Revise Corrective Action"
                  icon={Edit}
                  onPress={() => router.push(`/form8?id=${ncr.id}` as any)}
                />
              )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      {showReviewModal && ncr && (
        <ReviewModal
          ncr={ncr}
          onClose={() => setShowReviewModal(false)}
          onReview={handleReview}
          loading={reviewLoading}
          title="Review NCR"
          approveLabel={
            sendTo8D && ncr.auditScore < 70 ? "Approve & Send to 8D" : "Approve"
          }
          rejectLabel="Reject"
          sendTo8D={sendTo8D}
          setSendTo8D={setSendTo8D}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
        />
      )}

      {showAuditeeReviewModal && (
        <AuditeeReviewModal
          ncr={ncr}
          onClose={() => setShowAuditeeReviewModal(false)}
          onReview={handleAuditeeReview}
          loading={reviewLoading}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
        />
      )}

      {/* 8D Report Preview Modal */}
      {show8DReportModal && selected8DEventId && (
        <Modal visible={true} transparent animationType="slide">
          <View className="flex-1 bg-black/60">
            <View className="flex-1 flex-row justify-end">
              <TouchableOpacity
                className="flex-1"
                activeOpacity={1}
                onPress={() => {
                  setShow8DReportModal(false);
                  setSelected8DEventId(null);
                }}
              />

              <View className="h-full w-full border-l border-slate-200 bg-white shadow-2xl md:w-[500px] lg:w-[600px]">
                <View className="flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <View className="flex-row items-center gap-3">
                    <FileBarChart size={20} color={COLORS.primary} />
                    <Text className="font-serif text-lg font-bold text-slate-800">
                      8D Report Preview
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShow8DReportModal(false);
                      setSelected8DEventId(null);
                    }}
                    className="rounded-full border border-slate-200 bg-white p-2 shadow-sm active:bg-slate-100"
                  >
                    <X size={20} color="#475569" />
                  </TouchableOpacity>
                </View>

                <View className="flex-1 bg-slate-50">
                  <FinalPreview
                    eventId={selected8DEventId}
                    isHOD={isHOD || false}
                    onRefresh={() => {
                      setShow8DReportModal(false);
                      setSelected8DEventId(null);
                      fetchNCRDetail();
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <PDFViewer
        visible={pdfViewer.visible}
        pdfData={pdfViewer.pdfData}
        fileName={pdfViewer.fileName}
        auditId={String(ncr?.id || "")}
        auditNumber={`NCR-${ncr?.ncrNumber || ""}`}
        pdfType="ncr"
        formVariant="form7"
        forumGroups={[
          {
            id: `AUDIT-${ncr?.auditId || ""}`,
            name: `📋 NCR ${ncr?.ncrNumber || ""}`,
            type: "NCR",
          },
          {
            id: "AUDIT-general-forum",
            name: "📢 General Discussion",
            type: "General",
          },
        ]}
        onClose={() =>
          setPDFViewer({ visible: false, pdfData: "", fileName: "" })
        }
        onShareComplete={(forumId?: string) => {
          Alert.alert("Success", "PDF shared to forum successfully!");
          setPDFViewer({ visible: false, pdfData: "", fileName: "" });
        }}
        currentUser={user}
        allUsers={allUsers}
      />
    </View>
  );
}
