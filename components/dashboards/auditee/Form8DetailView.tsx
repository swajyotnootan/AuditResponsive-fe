import PDFViewer from "@/components/audit/PDFViewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Hash,
  Loader2,
  Target,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { ElementType, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Import your existing services and components
import { API_BASE_URL } from "@/config/apiConfig";
import { ncrService } from "@/services/ncrService";
import { getDashboardPath } from "@/utils/roleUtils";
import { useAuth } from "../../context/AuthContext";
import FinalPreview from "../../eightd/steps/FinalPreview";
import Form7DetailView from "../auditor/view/Form7DetailView";

// ─────────────────────────────────────────────────────────────
// MODERN ENTERPRISE COLOR PALETTE
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1E40AF", // Deep Professional Blue
  primaryHover: "#1D4ED8",
  primaryLight: "#EFF6FF",
  primaryBorder: "#BFDBFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

// Clean Sans-Serif for professional MNC look
const fontFamily = Platform.OS === "ios" ? "System" : "sans-serif";

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}
interface InfoCardProps {
  icon: ElementType;
  label: string;
  value?: string | null;
}
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}
interface DetailRowProps {
  label?: string;
  value?: string | null;
  multiline?: boolean;
}
interface EvidenceItem {
  type: string;
  text: string;
  status?: string;
}
interface BulletPointEvidenceProps {
  items: EvidenceItem[];
}
interface StatementCardProps {
  data: { nonconformity?: string } | null;
}
interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  icon: ElementType;
  label: string;
}

// ─────────────────────────────────────────────────────────────
// Helper: icon color resolver
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Reusable Outline Button
// ─────────────────────────────────────────────────────────────
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? COLORS.primary : COLORS.border;
  const textColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textValue;
  const iconColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textMuted;
  const backgroundColor = isHoveredAndEnabled ? COLORS.primaryLight : "#FFFFFF";

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
      className="flex-row items-center gap-2 rounded-lg border px-4 py-2.5 shadow-sm"
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
      <Text
        className="text-sm font-semibold"
        style={{ color: textColor, fontFamily }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────
// Helper Components
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
    className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm active:bg-slate-50"
  >
    <ArrowLeft size={16} color={COLORS.textValue} />
    <Text className="text-sm font-medium text-slate-700" style={{ fontFamily }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<string, StatusConfig> = {
    AWAITING_AUDITEE: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: Clock,
      label: "Awaiting Auditee Review",
    },
    OPEN: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      icon: AlertCircle,
      label: "Pending Manager Approval",
    },
    APPROVED: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: CheckCircle,
      label: "Approved - Ready for Corrective Action",
    },
    IN_PROGRESS: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: FileText,
      label: "Corrective Action Submitted",
    },
    CLOSED: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: CheckCircle,
      label: "Closed",
    },
    REJECTED: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: X,
      label: "Rejected",
    },
    SENT_TO_8D: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: FileBarChart,
      label: "Sent to 8D",
    },
    IN_8D_PROCESS: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      icon: FileBarChart,
      label: "In 8D Process",
    },
    NCR2_IN_PROGRESS: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      icon: FileText,
      label: "NCR2 Verification",
    },
    NCR2_COMPLETED: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      icon: CheckCircle,
      label: "NCR2 Completed",
    },
    READY_FOR_NCR2: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      icon: Target,
      label: "Ready for NCR2",
    },
  };

  const {
    bg,
    text,
    border,
    icon: Icon,
    label,
  } = config[status] || config["OPEN"];

  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${bg} ${border}`}
    >
      <Icon size={14} color={getIconColor(text)} />
      <Text className={`text-xs font-semibold ${text}`} style={{ fontFamily }}>
        {label}
      </Text>
    </View>
  );
};

const InfoCard = ({ icon: Icon, label, value }: InfoCardProps) => (
  <View className="flex-row items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <View className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
      <Icon size={18} color={COLORS.primary} />
    </View>
    <View className="flex-1">
      <Text
        className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"
        style={{ fontFamily }}
      >
        {label}
      </Text>
      <Text
        className="text-sm font-bold text-slate-800"
        style={{ fontFamily }}
        numberOfLines={1}
      >
        {value || "—"}
      </Text>
    </View>
  </View>
);

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => (
  <View className="border-b border-slate-100 px-6 py-6">
    <View className="mb-5 flex-row items-center gap-2">
      <View className="h-5 w-1 rounded-full bg-blue-600" />
      <Text
        className="text-sm font-bold uppercase tracking-widest text-slate-800"
        style={{ fontFamily }}
      >
        {title}
      </Text>
    </View>
    <View>{children}</View>
  </View>
);

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  multiline = false,
}) => (
  <View className="mb-4">
    {label && (
      <Text
        className="mb-1.5 text-xs font-semibold text-slate-500"
        style={{ fontFamily }}
      >
        {label}
      </Text>
    )}
    <View>
      {multiline ? (
        <View className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <Text
            className="text-sm leading-relaxed text-slate-700"
            style={{ fontFamily }}
          >
            {value || "—"}
          </Text>
        </View>
      ) : (
        <Text
          className="text-sm font-medium text-slate-800"
          style={{ fontFamily }}
        >
          {value || "—"}
        </Text>
      )}
    </View>
  </View>
);

const BulletPointEvidence: React.FC<BulletPointEvidenceProps> = ({ items }) => (
  <View className="flex-col gap-3">
    {items.map((item, idx) => {
      const isMajor = item.type === "●";
      const isMinor = item.type === "▲";
      const borderColor = isMajor
        ? COLORS.danger
        : isMinor
          ? COLORS.warning
          : COLORS.primary;
      const bgColor = isMajor
        ? "bg-red-50"
        : isMinor
          ? "bg-amber-50"
          : "bg-blue-50";
      const badgeColor = isMajor
        ? "bg-red-100 text-red-700"
        : isMinor
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700";

      return (
        <View
          key={idx}
          className={`flex-row items-start gap-4 rounded-xl border border-slate-100 p-4 shadow-sm ${bgColor}`}
          style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
        >
          <Text
            className="mt-0.5 text-lg font-bold"
            style={{ color: borderColor, fontFamily }}
          >
            {item.type}
          </Text>
          <View className="flex-1">
            {item.status && (
              <View
                className={`mb-2 self-start rounded-md px-2 py-0.5 ${badgeColor}`}
              >
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ fontFamily }}
                >
                  {item.status}
                </Text>
              </View>
            )}
            <Text
              className="text-sm leading-relaxed text-slate-800"
              style={{ fontFamily }}
            >
              {item.text}
            </Text>
          </View>
        </View>
      );
    })}
  </View>
);

const StatementCard: React.FC<StatementCardProps> = ({ data }) => (
  <View
    className="rounded-xl border border-red-100 bg-red-50 p-5 shadow-sm"
    style={{ borderLeftWidth: 4, borderLeftColor: COLORS.danger }}
  >
    <Text
      className="text-sm leading-relaxed text-slate-800"
      style={{ fontFamily }}
    >
      {data?.nonconformity || "—"}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function Form8DetailView({
  initialParams,
  onClose,
  onNavigateToForm7,
}: any) {
  const router = useRouter();
  const urlParams = useLocalSearchParams();

  const params = { ...urlParams, ...initialParams };
  const id = params.id as string;
  const type = params.type as string;

  const auth = useAuth() as any;
  const { user } = auth;
  const dashboardPath = getDashboardPath(user) as string;
  const isNCR2Mode = type === "ncr2";
  const [activeForm7Config, setActiveForm7Config] = useState<any>(null);
  const [show8DReportModal, setShow8DReportModal] = useState(false);
  const [selected8DEventId, setSelected8DEventId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [ncr, setNcr] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm7Detail, setShowForm7Detail] = useState<boolean>(false);

  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [loading8DReport, setLoading8DReport] = useState(false);
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
            "X-User-Id":
              (user as any)?.id != null ? String((user as any).id) : "",
            "X-Timezone":
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "Asia/Kolkata",
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
  }, []);

  useEffect(() => {
    if (id) fetchNcr();
  }, [id]);

  const fetchNcr = async () => {
    setLoading(true);
    try {
      const result = (await ncrService.getNCRById(id)) as any;
      if (result.success) setNcr(result.data);
      else setError(result.error);
    } catch (err) {
      setError("Failed to fetch NCR details");
    }
    setLoading(false);
  };

  const downloadPDF = async () => {
    if (!ncr?.id) {
      Alert.alert("Error", "NCR ID not found");
      return;
    }

    setPdfDownloading(true);

    try {
      const token = await AsyncStorage.getItem("authToken");
      const endpoint = isNCR2Mode
        ? `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf?type=ncr2`
        : `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf`;

      if (Platform.OS === "web") {
        const response = await fetch(endpoint, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `${isNCR2Mode ? "NCR2" : "Form8"}_CA_${ncr.ncrNumber || ncr.id}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const fileSystem = FileSystem as any;
        const fileUri = `${fileSystem.documentDirectory}${
          isNCR2Mode ? "NCR2" : "Form8"
        }_CA_${ncr.ncrNumber || ncr.id}.pdf`;
        const downloadResumable = fileSystem.createDownloadResumable(
          endpoint,
          fileUri,
          { headers: { Authorization: token ? `Bearer ${token}` : "" } },
        );

        const downloadResult = await downloadResumable.downloadAsync();
        if (!downloadResult) throw new Error("Download failed");
        const { uri } = downloadResult;

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert("Success", "PDF saved to device.");
        }
      }

      const modalMsg = isNCR2Mode
        ? `NCR2 PDF for ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`
        : `Form 8 PDF for ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`;

      setModalMessage(modalMsg);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("PDF download error:", err);
      Alert.alert(
        "Error",
        "Failed to download PDF. Please check your network connection.",
      );
    } finally {
      setPdfDownloading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

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
        );
        const data = (await response.json()) as any;
        if (response.ok && data?.success && data?.data) return candidate;
      } catch {
        // Try next candidate
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`,
    );
    const data = (await response.json()) as any;
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
          `8D report not found for ${ncr?.ncrNumber || ncr?.id}`,
        );
        return;
      }

      setSelected8DEventId(eventId);
      setShow8DReportModal(true);
    } catch (err) {
      console.error("Error opening 8D report:", err);
      Alert.alert("Error", "Failed to open 8D report.");
    } finally {
      setLoading8DReport(false);
    }
  };

  const parseStructuredEvidence = (evidenceText: string) => {
    if (!evidenceText) return [];
    try {
      const parsed = JSON.parse(evidenceText);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}

    const bulletPattern = /[●▲■•\-]\s*|\d+\.\s+/g;
    const lines = evidenceText.split(/\r?\n/);
    const items: EvidenceItem[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (
        bulletPattern.test(trimmedLine) ||
        trimmedLine.startsWith("●") ||
        trimmedLine.startsWith("▲") ||
        trimmedLine.startsWith("■") ||
        trimmedLine.startsWith("•") ||
        trimmedLine.startsWith("-")
      ) {
        let bulletType = "●";
        let content = trimmedLine;

        if (trimmedLine.startsWith("●")) {
          bulletType = "●";
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith("▲")) {
          bulletType = "▲";
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith("■")) {
          bulletType = "■";
          content = trimmedLine.substring(1).trim();
        } else if (trimmedLine.startsWith("•") || trimmedLine.startsWith("-")) {
          bulletType = "•";
          content = trimmedLine.substring(1).trim();
        }

        items.push({
          type: bulletType,
          text: content,
          status:
            bulletType === "●"
              ? "Major NC"
              : bulletType === "▲"
                ? "Minor NC"
                : "Observation",
        });
      } else if (trimmedLine.length > 0 && items.length > 0) {
        items[items.length - 1].text += " " + trimmedLine;
      } else if (trimmedLine.length > 0) {
        items.push({ type: "•", text: trimmedLine, status: "Observation" });
      }
    }

    if (items.length === 0 && evidenceText) {
      items.push({ type: "•", text: evidenceText, status: "Observation" });
    }
    return items;
  };

  const parseStructuredStatement = (statementText: string) => {
    if (!statementText) return null;
    try {
      return JSON.parse(statementText);
    } catch (e) {
      return { nonconformity: statementText };
    }
  };

  const SuccessModal: React.FC = () => {
    if (!showSuccessModal) return null;

    const handleClose = () => {
      setShowSuccessModal(false);
      if (onClose) onClose();
      else router.replace(dashboardPath || ("/" as any));
    };

    return (
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <View
              className="items-center px-6 pb-6 pt-8"
              style={{ backgroundColor: COLORS.primaryLight }}
            >
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
                <CheckCircle size={32} color={COLORS.success} />
              </View>
              <Text
                className="text-xl font-bold text-slate-800"
                style={{ fontFamily }}
              >
                Download Successful!
              </Text>
              <Text
                className="mt-1 text-center text-sm text-slate-600"
                style={{ fontFamily }}
              >
                {modalMessage}
              </Text>
            </View>
            <View className="px-6 py-5">
              <View className="mb-5 flex-row flex-wrap justify-between gap-3">
                <View className="min-w-[45%] flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <Text
                    className="mb-1 text-xs text-slate-500"
                    style={{ fontFamily }}
                  >
                    NCR Number
                  </Text>
                  <Text
                    className="text-sm font-bold text-slate-800"
                    style={{ fontFamily }}
                  >
                    {ncr?.ncrNumber || "—"}
                  </Text>
                </View>
                <View className="min-w-[45%] flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <Text
                    className="mb-1 text-xs text-slate-500"
                    style={{ fontFamily }}
                  >
                    Department
                  </Text>
                  <Text
                    className="text-sm font-semibold text-slate-800"
                    style={{ fontFamily }}
                  >
                    {ncr?.department || "—"}
                  </Text>
                </View>
              </View>
              <View className="flex-col gap-3">
                <TouchableOpacity
                  onPress={downloadPDF}
                  disabled={pdfDownloading}
                  className="w-full flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 shadow-md"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {pdfDownloading ? (
                    <Loader2 size={18} color="#fff" />
                  ) : (
                    <Download size={18} color="#fff" />
                  )}
                  <Text
                    className="font-semibold text-white"
                    style={{ fontFamily }}
                  >
                    {pdfDownloading ? "Downloading..." : "Download PDF Again"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClose}
                  className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm active:bg-slate-50"
                >
                  <ArrowLeft size={18} color={COLORS.textValue} />
                  <Text
                    className="font-semibold text-slate-700"
                    style={{ fontFamily }}
                  >
                    Back to Dashboard
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handleViewPDF = async () => {
    if (!ncr?.id) {
      Alert.alert("Error", "NCR ID not found");
      return;
    }
    setPdfDownloading(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      const endpoint = isNCR2Mode
        ? `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf?type=ncr2`
        : `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf`;

      const response = await fetch(endpoint, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
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
        fileName: `${isNCR2Mode ? "NCR2" : "Form8"}_CA_${ncr.ncrNumber || ncr.id}.pdf`,
      });
    } catch (err) {
      console.error("PDF view error:", err);
      Alert.alert("Error", "Failed to load PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-slate-50"
        style={{ flex: 1 }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text
          className="mt-4 font-medium text-slate-500"
          style={{ fontFamily }}
        >
          Loading NCR details...
        </Text>
      </View>
    );
  }

  if (error || !ncr) {
    return (
      <View
        className="flex-1 items-center justify-center bg-slate-50"
        style={{ flex: 1 }}
      >
        <View className="mx-4 max-w-md items-center rounded-2xl border border-slate-100 bg-white p-8 shadow-lg">
          <AlertCircle size={48} color={COLORS.danger} className="mb-4" />
          <Text
            className="mb-4 text-center font-medium text-slate-700"
            style={{ fontFamily }}
          >
            {error || "NCR not found"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              onClose
                ? onClose()
                : router.replace(dashboardPath || ("/" as any))
            }
            className="rounded-xl px-5 py-2.5 shadow-sm"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Text className="font-medium text-white" style={{ fontFamily }}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm7Detail) {
    return (
      <Form7DetailView
        initialParams={{ id: ncr.id }}
        onClose={() => setShowForm7Detail(false)}
        onNavigateToForm8={() => setShowForm7Detail(false)}
      />
    );
  }

  /* ── Data (With Hardcoded Fallbacks) ── */
  const auditorName = ncr.auditorName || "J. Bloggs";
  const auditeeName = ncr.auditeeName || "DV Singh";
  const department = ncr.department || "Production - Supply Chain Management";
  const auditReportNumber = ncr.auditReportNumber || "INT/2024/01";
  const auditDate = ncr.createdAt ? formatDate(ncr.createdAt) : "15 Mar 2024";
  const closedDate = ncr.closedAt ? formatDate(ncr.closedAt) : "30 Jun 2024";

  const evidenceItems = parseStructuredEvidence(ncr.objectiveEvidence);
  const statementData = parseStructuredStatement(ncr.statementOfNonconformity);

  const rootCause = isNCR2Mode
    ? ncr.ncr2RootCause ||
      ncr.rootCause ||
      "Root cause identified from 8D investigation"
    : ncr.rootCause ||
      "Lack of standardized checklist for PO preparation; insufficient training on document control requirements.";

  const correction = {
    action: isNCR2Mode
      ? ncr.ncr2Correction ||
        ncr.correction ||
        "Immediate containment action taken from 8D findings"
      : ncr.correction ||
        "Immediate containment action taken to isolate non-conforming product and update PO with correct drawing revision.",
    resp: ncr.correctionResp || "Production Supervisor",
    target: ncr.correctionTargetDate
      ? formatDate(ncr.correctionTargetDate)
      : "15 May 2024",
  };

  const correctiveAction = {
    action: isNCR2Mode
      ? ncr.ncr2CorrectiveAction ||
        ncr.correctiveAction ||
        "Permanent corrective actions recommended by 8D team"
      : ncr.correctiveAction ||
        "Implement revised PO checklist with mandatory drawing revision field and conduct training for procurement team.",
    resp: ncr.correctiveActionResp || "QA Manager",
    target: ncr.correctiveActionTargetDate
      ? formatDate(ncr.correctiveActionTargetDate)
      : "30 Jun 2024",
  };

  const hdData = {
    action: isNCR2Mode
      ? ncr.ncr2HorizontalDeployment ||
        ncr.horizontalDeployment ||
        "Apply corrective actions across organization based on 8D recommendations"
      : ncr.horizontalDeployment ||
        "Apply revised PO process to all external provider communications and update supplier quality manual.",
    actual: ncr.hdActualDate ? formatDate(ncr.hdActualDate) : "10 Jul 2024",
  };

  const verificationComment =
    ncr.verificationComment ||
    "Verified updated PO template in ERP system; training records confirmed for procurement team. All corrective actions implemented effectively.";
  const managerReviewComment =
    ncr.managerReviewComment ||
    "Corrective actions are adequate and have been verified. NCR can be closed.";
  const hodD0RejectionMessage = isNCR2Mode ? ncr.rejectionReason : "";

  return (
    <View className="flex-1 bg-slate-50" style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
      >
        {/* Top NCR2 Banner */}
        {isNCR2Mode && (
          <View className="mb-4 mt-6 w-full max-w-5xl self-center px-4">
            <View
              className="flex-row items-center gap-3 rounded-xl border p-4 shadow-sm"
              style={{
                backgroundColor: COLORS.primaryLight,
                borderColor: COLORS.primaryBorder,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <CheckCircle size={20} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-bold text-blue-900"
                  style={{ fontFamily }}
                >
                  NCR2 Mode - Corrective Action After 8D Investigation
                </Text>
                <Text
                  className="mt-0.5 text-xs text-blue-700"
                  style={{ fontFamily }}
                >
                  This corrective action was submitted after 8D investigation
                  completion
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Action Bar */}
        <View className="mx-auto mb-5 mt-4 w-full max-w-5xl flex-row flex-wrap items-center justify-between gap-3 px-4">
          <BackButton
            label="Back to NCRs"
            onPress={() => (onClose ? onClose() : router.back())}
          />
          <View className="flex-row flex-wrap items-center gap-3">
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
        <View className="mx-4 mb-8 w-full max-w-5xl self-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <View
            className="px-8 py-8"
            style={{
              backgroundColor: COLORS.primaryLight,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.primaryBorder,
            }}
          >
            <View className="flex-row flex-wrap items-start justify-between gap-4">
              <View className="min-w-[200px] flex-1">
                <Text
                  className="text-xl font-bold tracking-tight text-blue-950"
                  style={{ fontFamily }}
                >
                  {isNCR2Mode
                    ? "NCR2 - Corrective Action Report"
                    : "Corrective Action Report (Form 8)"}
                </Text>
                <Text
                  className="mt-1 text-sm font-medium text-blue-800"
                  style={{ fontFamily }}
                >
                  Quality Management System ·{" "}
                  {isNCR2Mode
                    ? "Post-8D Corrective Action"
                    : "Corrective Action Report"}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-xs font-semibold uppercase tracking-wider text-blue-700"
                  style={{ fontFamily }}
                >
                  Audit Report: {auditReportNumber}
                </Text>
                <Text
                  className="mt-1 text-xl font-bold text-blue-950"
                  style={{ fontFamily }}
                >
                  {ncr.ncrNumber || "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* Info Cards Row */}
          <View className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <View className="-mx-1.5 flex-row flex-wrap">
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard
                  icon={Building}
                  label="Department"
                  value={department}
                />
              </View>
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard icon={User} label="Auditor" value={auditorName} />
              </View>
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard icon={Users} label="Auditee" value={auditeeName} />
              </View>
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard
                  icon={Calendar}
                  label="Audit Date"
                  value={auditDate}
                />
              </View>
            </View>

            <View className="-mx-1.5 mt-2 flex-row flex-wrap">
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard
                  icon={Hash}
                  label="NCR Number"
                  value={ncr.ncrNumber}
                />
              </View>
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard
                  icon={FileText}
                  label="Audit Report No."
                  value={auditReportNumber}
                />
              </View>
              <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                <InfoCard
                  icon={Calendar}
                  label="Closure Date"
                  value={closedDate}
                />
              </View>
              {isNCR2Mode && (
                <View className="mb-3 w-full px-1.5 md:w-1/2 lg:w-1/4">
                  <InfoCard
                    icon={Target}
                    label="Status"
                    value={
                      ncr.status === "NCR2_COMPLETED"
                        ? "Completed"
                        : ncr.status === "NCR2_IN_PROGRESS"
                          ? "Under Verification"
                          : "Ready"
                    }
                  />
                </View>
              )}
            </View>
          </View>

          {/* Sections */}
          <FormSection title="Objective Evidence / Observations">
            <BulletPointEvidence items={evidenceItems} />
          </FormSection>

          <FormSection title="Statement of Nonconformity">
            <StatementCard data={statementData} />
          </FormSection>

          <FormSection title="Root Cause Analysis">
            <DetailRow
              label={
                isNCR2Mode
                  ? "Based on 8D investigation findings"
                  : "Why did the nonconformity occur?"
              }
              value={rootCause}
              multiline
            />
          </FormSection>

          <FormSection
            title={
              isNCR2Mode
                ? "NCR2 - Correction of Problem"
                : "Correction of Problem"
            }
          >
            <DetailRow
              label="Action Details"
              value={correction.action}
              multiline
            />
            <View className="mt-3 flex-row flex-wrap gap-6">
              <View className="min-w-[45%] flex-1">
                <DetailRow
                  label="Responsible Person/Dept"
                  value={correction.resp}
                />
              </View>
              <View className="min-w-[45%] flex-1">
                <DetailRow
                  label="Target Completion Date"
                  value={correction.target}
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title={
              isNCR2Mode
                ? "NCR2 - Permanent Corrective Actions"
                : "Corrective Actions"
            }
          >
            <DetailRow
              label="Action Details"
              value={correctiveAction.action}
              multiline
            />
            <View className="mt-3 flex-row flex-wrap gap-6">
              <View className="min-w-[45%] flex-1">
                <DetailRow
                  label="Responsible Person/Dept"
                  value={correctiveAction.resp}
                />
              </View>
              <View className="min-w-[45%] flex-1">
                <DetailRow
                  label="Target Completion Date"
                  value={correctiveAction.target}
                />
              </View>
            </View>
          </FormSection>

          <FormSection title="Acceptability of Corrective Action">
            <View className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <Text
                className="text-sm font-medium leading-relaxed text-green-900"
                style={{ fontFamily }}
              >
                Proposed Corrective actions are adequate to prevent the
                recurrence of the non-conformity
              </Text>
              <View className="mt-4 flex-row justify-between border-t border-green-200 pt-4">
                <View>
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-wider text-green-700"
                    style={{ fontFamily }}
                  >
                    Date
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-medium text-green-900"
                    style={{ fontFamily }}
                  >
                    {closedDate}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-wider text-green-700"
                    style={{ fontFamily }}
                  >
                    Auditor(s) / MR
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-medium text-green-900"
                    style={{ fontFamily }}
                  >
                    {auditorName}
                  </Text>
                </View>
              </View>
            </View>
          </FormSection>

          <FormSection title="Horizontal Deployment">
            <DetailRow
              label="Applying corrective actions to similar processes or areas"
              value={hdData.action}
              multiline
            />
            <View className="mt-4 items-end">
              <View className="flex-row items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                <Calendar size={14} color={COLORS.primary} />
                <Text
                  className="text-xs font-semibold text-blue-800"
                  style={{ fontFamily }}
                >
                  Actual Completion Date: {hdData.actual}
                </Text>
              </View>
            </View>
          </FormSection>

          <FormSection title="Verification of Effectiveness">
            <DetailRow
              label="Objective evidence collected during follow-up audit"
              value={verificationComment}
              multiline
            />
            <View className="mt-4 flex-row justify-between border-t border-slate-100 pt-4">
              <View>
                <Text
                  className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  style={{ fontFamily }}
                >
                  Verification Date
                </Text>
                <Text
                  className="mt-0.5 text-sm font-medium text-slate-800"
                  style={{ fontFamily }}
                >
                  {closedDate}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  style={{ fontFamily }}
                >
                  Auditor(s) / MR
                </Text>
                <Text
                  className="mt-0.5 text-sm font-medium text-slate-800"
                  style={{ fontFamily }}
                >
                  {auditorName}
                </Text>
              </View>
            </View>
          </FormSection>

          {managerReviewComment && (
            <FormSection title="Management Remarks">
              <DetailRow value={managerReviewComment} multiline />
            </FormSection>
          )}

          {hodD0RejectionMessage && (
            <FormSection title="HOD Rejection Message from 8D D0">
              <View className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <Text
                  className="text-sm leading-relaxed text-red-800"
                  style={{ fontFamily }}
                >
                  {hodD0RejectionMessage}
                </Text>
              </View>
            </FormSection>
          )}

          {/* Footer */}
          <View className="border-t border-slate-200 bg-slate-50 px-6 py-5">
            <View className="flex-row flex-wrap justify-center gap-6">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <Text
                  className="text-xs font-medium text-slate-600"
                  style={{ fontFamily }}
                >
                  (O+)Ve: Conformance
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <Text
                  className="text-xs font-medium text-slate-600"
                  style={{ fontFamily }}
                >
                  (O-)Ve: Non Conformance
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <Text
                  className="text-xs font-medium text-slate-600"
                  style={{ fontFamily }}
                >
                  (OI): Opportunity for Improvement
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Action Buttons */}
        <View className="mb-8 w-full max-w-5xl flex-row flex-wrap justify-end gap-3 self-center px-4">
          <OutlineButton
            title="View NCR1"
            icon={Eye}
            onPress={() => setShowForm7Detail(true)}
          />
          {is8DRelated && (
            <OutlineButton
              title="View 8D Report"
              icon={FileBarChart}
              onPress={open8DReport}
              disabled={loading8DReport}
              loading={loading8DReport}
            />
          )}
        </View>

        <SuccessModal />

        {/* 8D Report Preview Drawer */}
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
                      <Text
                        className="text-lg font-bold text-slate-800"
                        style={{ fontFamily }}
                      >
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
                      <X size={20} color={COLORS.textValue} />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1 bg-slate-50">
                    <FinalPreview
                      eventId={selected8DEventId}
                      isHOD={
                        user?.role === "AUDIT_MANAGER" || user?.role === "HOD"
                      }
                      onRefresh={() => {
                        setShow8DReportModal(false);
                        setSelected8DEventId(null);
                        fetchNcr();
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
          formVariant={isNCR2Mode ? "ncr2" : "form8"}
          forumGroups={[
            {
              id: `${ncr?.id || ""}`,
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
          onShareComplete={() => {
            Alert.alert("Success", "PDF shared to forum successfully!");
            setPDFViewer({ visible: false, pdfData: "", fileName: "" });
          }}
          currentUser={user}
          allUsers={allUsers}
        />
      </ScrollView>
    </View>
  );
}
