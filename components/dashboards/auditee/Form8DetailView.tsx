import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
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
import { ncrService } from "@/services/ncrService";
import { getDashboardPath } from "@/utils/roleUtils";
import { useAuth } from "../../context/AuthContext";
// Add this near your other imports at the top of Form8DetailView.tsx
import Form7DetailView from "../auditor/view/Form7DetailView";
// =====================================================================
// TEMPORARY MOCK COMPONENTS
// (Remove these and uncomment your real imports once converted to RN)
// =====================================================================
/*
import BackButton from "../dashboards/leadAuditor/BackButton";
import FinalPreview from "../steps/FinalPreview";
*/

const BackButton = ({
  label,
  onPress,
  defaultTab,
}: {
  label: string;
  onPress: () => void;
  defaultTab?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg"
  >
    <ArrowLeft size={16} color="#374151" />
    <Text className="font-medium text-gray-800">{label}</Text>
  </TouchableOpacity>
);

const FinalPreview = ({
  eventId,
  isHOD,
}: {
  eventId: string;
  isHOD?: boolean;
}) => (
  <View className="items-center p-8">
    <FileBarChart size={48} color="#00529B" />
    <Text className="mt-4 text-lg font-bold text-gray-800">
      8D Report Preview
    </Text>
    <Text className="text-gray-500">Event ID: {eventId}</Text>
    {isHOD && (
      <Text className="text-blue-600 mt-2 font-semibold">HOD View Active</Text>
    )}
  </View>
);
// =====================================================================

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
  icon: ElementType;
  label: string;
}

// ─────────────────────────────────────────────────────────────
// Constants & Styles
// ─────────────────────────────────────────────────────────────
const fontFamily = Platform.OS === "ios" ? "Times New Roman" : "serif";

const COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

// ─────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config: Record<string, StatusConfig> = {
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
    NCR2_IN_PROGRESS: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: FileText,
      label: "NCR2 In Progress",
    },
    NCR2_COMPLETED: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: CheckCircle,
      label: "NCR2 Completed",
    },
    READY_FOR_NCR2: {
      bg: "bg-indigo-100",
      text: "text-indigo-800",
      icon: Target,
      label: "Ready for NCR2",
    },
  };

  const { bg, text, icon: Icon, label } = config[status] || config["OPEN"];

  return (
    <View
      className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}
    >
      <Icon
        size={12}
        color={
          text.includes("amber")
            ? "#92400e"
            : text.includes("blue")
              ? "#1e40af"
              : text.includes("emerald")
                ? "#065f46"
                : text.includes("purple")
                  ? "#581c87"
                  : text.includes("green")
                    ? "#166534"
                    : text.includes("red")
                      ? "#991b1b"
                      : "#3730a3"
        }
      />
      <Text className={`text-xs font-semibold ${text}`} style={{ fontFamily }}>
        {label}
      </Text>
    </View>
  );
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ElementType;
  label: string;
  value?: string | null;
  className?: string;
}) => (
  <View
    className={`flex-row items-start gap-3 p-3 border border-gray-100 bg-gray-50 rounded-xl ${className}`}
  >
    <View className="p-2 bg-white rounded-lg shadow-sm">
      <Icon size={16} color="#ef4444" />
    </View>
    <View className="flex-1">
      <Text
        className="text-xs tracking-wider text-gray-500 uppercase"
        style={{ fontFamily }}
      >
        {label}
      </Text>
      <Text
        className="text-sm font-semibold text-gray-800"
        style={{ fontFamily }}
      >
        {value || "—"}
      </Text>
    </View>
  </View>
);
const FormSection: React.FC<FormSectionProps> = ({ title, children }) => (
  <View className="px-6 py-5 border-b border-gray-100">
    <Text
      className="self-start pb-2 mb-4 text-base font-bold text-gray-800 border-b-2 border-red-500"
      style={{ fontFamily }}
    >
      {title}
    </Text>
    <View className="mt-3">{children}</View>
  </View>
);

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  multiline = false,
}) => (
  <View className="pb-2 mb-3 border-b border-gray-50">
    {label && (
      <Text
        className="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase"
        style={{ fontFamily }}
      >
        {label}
      </Text>
    )}
    <View>
      {multiline ? (
        <View className="p-3 rounded-lg bg-gray-50">
          <Text
            className="text-sm leading-5 text-gray-800"
            style={{ fontFamily }}
          >
            {value || "—"}
          </Text>
        </View>
      ) : (
        <Text
          className="text-sm font-medium text-gray-800"
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
      const borderColor = isMajor ? "#dc2626" : isMinor ? "#d97706" : "#2563eb";
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
          className={`flex-row items-start gap-3 p-4 rounded-lg border-l-4 ${bgColor}`}
          style={{ borderLeftColor: borderColor }}
        >
          <Text className="text-lg font-bold" style={{ color: borderColor }}>
            {item.type}
          </Text>
          <View className="flex-1">
            {item.status && (
              <View
                className={`inline-flex px-2 py-0.5 mb-1.5 rounded-full self-start ${badgeColor}`}
              >
                <Text className="text-[10px] font-bold">{item.status}</Text>
              </View>
            )}
            <Text
              className="text-sm leading-5 text-gray-800"
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
  <View className="p-4 border-l-4 border-red-500 rounded-lg bg-red-50">
    <Text className="text-sm leading-5 text-gray-800" style={{ fontFamily }}>
      {data?.nonconformity || "—"}
    </Text>
  </View>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function Form8DetailView({ initialParams, onClose }: any) {
  const router = useRouter();
  const urlParams = useLocalSearchParams();

  // ✅ Merge inline params and URL params safely
  const params = { ...urlParams, ...initialParams };
  const id = params.id as string;
  const type = params.type as string;

  const auth = useAuth() as any;
  const { user } = auth;
  const dashboardPath = getDashboardPath(user) as string;
  const isNCR2Mode = type === "ncr2";
  const [activeForm7Config, setActiveForm7Config] = useState<any>(null);
  // const { id, type } = route.params || {};

  // const auth = useAuth() as any;
  // const { user } = auth;
  // const dashboardPath = getDashboardPath(user) as string;

  // const isNCR2Mode = type === "ncr2";

  const [loading, setLoading] = useState(true);
  const [ncr, setNcr] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [show8DReportModal, setShow8DReportModal] = useState(false);
  const [selected8DEventId, setSelected8DEventId] = useState<string | null>(
    null,
  );
  const [loading8DReport, setLoading8DReport] = useState(false);

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
      const token = await AsyncStorage.getItem("token");
      const endpoint = isNCR2Mode
        ? `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf?type=ncr2`
        : `${API_BASE_URL}/api/ncr/${ncr.id}/form8-pdf`;

      // FIX: Cast FileSystem to 'any' to bypass strict TS documentDirectory errors
      const fileSystem = FileSystem as any;
      const fileUri = `${fileSystem.documentDirectory}${isNCR2Mode ? "NCR2" : "Form8"}_CA_${ncr.ncrNumber || ncr.id}.pdf`;

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

      const modalMsg = isNCR2Mode
        ? `NCR2 PDF for NCR ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`
        : `Form 8 PDF for NCR ${ncr.ncrNumber || ncr.id} has been downloaded successfully!`;
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
          `8D report not found for NCR ${ncr?.ncrNumber || ncr?.id}`,
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
      if (onClose) {
        onClose();
      } else {
        router.replace(dashboardPath || ("/" as any));
      }
    };

    const handleDownloadAgain = async () => {
      await downloadPDF();
    };

    return (
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
            <View
              className="items-center px-6 pt-8 pb-6"
              style={{ backgroundColor: COLORS.bg }}
            >
              <View className="items-center justify-center w-16 h-16 mb-4 bg-white rounded-full shadow-lg">
                <CheckCircle size={32} color={COLORS.success} />
              </View>
              <Text
                className="text-xl font-bold text-slate-800"
                style={{ fontFamily }}
              >
                Download Successful!
              </Text>
              <Text
                className="mt-1 text-sm text-center text-slate-600"
                style={{ fontFamily }}
              >
                {modalMessage}
              </Text>
            </View>
            <View className="px-6 py-5">
              <View className="flex-row flex-wrap justify-between gap-3 mb-5">
                <View className="p-3 items-center border rounded-xl bg-slate-50 border-slate-100 flex-1 min-w-[45%]">
                  <Text
                    className="mb-1 text-xs text-slate-500"
                    style={{ fontFamily }}
                  >
                    NCR Number
                  </Text>
                  <Text
                    className="text-sm font-semibold text-slate-800"
                    style={{ fontFamily }}
                  >
                    {ncr?.ncrNumber || "—"}
                  </Text>
                </View>
                <View className="p-3 items-center border rounded-xl bg-slate-50 border-slate-100 flex-1 min-w-[45%]">
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
              <View
                className="flex-row items-start gap-2 p-3 mb-4 border rounded-xl"
                style={{
                  backgroundColor: COLORS.bg,
                  borderColor: COLORS.lighter,
                }}
              >
                <CheckCircle
                  size={16}
                  color={COLORS.primary}
                  style={{ marginTop: 2 }}
                />
                <Text
                  className="flex-1 text-xs"
                  style={{ color: COLORS.dark, fontFamily }}
                >
                  <Text style={{ fontWeight: "bold" }}>
                    {isNCR2Mode
                      ? "NCR2 (Post-8D Corrective Action)"
                      : "Form 8 (Corrective Action Report)"}
                  </Text>{" "}
                  has been successfully generated.
                </Text>
              </View>
              <View className="flex-col gap-3">
                <TouchableOpacity
                  onPress={handleDownloadAgain}
                  disabled={pdfDownloading}
                  className="flex-row items-center justify-center w-full gap-2 px-5 py-3 shadow-md rounded-xl"
                  style={{ backgroundColor: COLORS.secondary }}
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
                  className="flex-row items-center justify-center w-full gap-2 px-5 py-3 bg-white border shadow-sm rounded-xl border-slate-200"
                >
                  <ArrowLeft size={18} color="#334155" />
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

  const renderActiveForm7Detail = () => {
    if (!activeForm7Config) return null;
    return (
      <Form7DetailView
        initialParams={activeForm7Config}
        onClose={() => {
          setActiveForm7Config(null); // Clears the state to go back
        }}
      />
    );
  };

  if (activeForm7Config) {
    return renderActiveForm7Detail();
  }
  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 font-medium text-gray-500" style={{ fontFamily }}>
          Loading NCR details...
        </Text>
      </View>
    );
  }

  if (error || !ncr) {
    return (
      <View className="items-center justify-center flex-1 p-8 bg-gray-50">
        <AlertCircle size={48} color={COLORS.danger} />
        <Text
          className="mt-4 mb-4 text-center text-gray-600"
          style={{ fontFamily }}
        >
          {error || "NCR not found"}
        </Text>
        <TouchableOpacity
          onPress={() =>
            onClose ? onClose() : router.replace(dashboardPath || ("/" as any))
          }
          className="px-5 py-2.5 rounded-xl"
          style={{ backgroundColor: COLORS.danger }}
        >
          <Text className="font-medium text-white" style={{ fontFamily }}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
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
    <ScrollView className="flex-1 bg-gray-50">
      {isNCR2Mode && (
        <View className="self-center w-full max-w-5xl px-4 mt-4 mb-4">
          <View
            className="flex-row items-center gap-3 p-3 shadow-sm rounded-xl"
            style={{ backgroundColor: "#0ea5e9" }}
          >
            <CheckCircle size={20} color="#fff" style={{ opacity: 0.9 }} />
            <View className="flex-1">
              <Text
                className="text-sm font-bold text-white"
                style={{ fontFamily }}
              >
                NCR2 Mode - Corrective Action After 8D Investigation
              </Text>
              <Text
                className="text-xs text-white"
                style={{ fontFamily, opacity: 0.9 }}
              >
                This corrective action was submitted after 8D investigation
                completion
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Top Action Bar */}
      <View className="flex-row flex-wrap items-center self-center justify-between w-full max-w-5xl gap-3 px-4 mt-4 mb-5">
        <BackButton
          defaultTab="ncrs"
          label="Back to NCRs"
          onPress={() => (onClose ? onClose() : router.back())}
        />
        <View className="flex-row items-center gap-3">
          <StatusBadge status={ncr.status} />
          <TouchableOpacity
            onPress={downloadPDF}
            disabled={pdfDownloading}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm"
            style={{
              backgroundColor: COLORS.primary,
              opacity: pdfDownloading ? 0.5 : 1,
            }}
          >
            {pdfDownloading ? (
              <Loader2 size={18} color="#fff" />
            ) : (
              <Download size={18} color="#fff" />
            )}
            <Text
              className="text-sm font-medium text-white"
              style={{ fontFamily }}
            >
              Download PDF
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Form Card */}
      <View className="self-center w-full max-w-5xl mx-4 mb-8 overflow-hidden bg-white shadow-xl rounded-2xl">
        {/* Header */}
        <View className="px-6 py-5" style={{ backgroundColor: COLORS.primary }}>
          <View className="flex-row flex-wrap items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                className="text-xl font-bold text-white"
                style={{ fontFamily }}
              >
                {isNCR2Mode
                  ? "NCR2 - Corrective Action Report"
                  : "Corrective Action Report (Form 8)"}
              </Text>
              <Text
                className="mt-1 text-sm text-gray-300"
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
                className="text-sm font-medium text-white/80"
                style={{ fontFamily }}
              >
                <Text style={{ opacity: 0.7 }}>Audit Report:</Text>{" "}
                {auditReportNumber}
              </Text>
              <Text
                className="text-lg font-bold text-white"
                style={{ fontFamily }}
              >
                {ncr.ncrNumber || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Cards Row */}
        {/* Info Cards Row */}
        <View className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          {/* First Row - 4 cards on desktop, 2 on mobile */}
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard icon={Building} label="Department" value={department} />
            </View>
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard icon={User} label="Auditor" value={auditorName} />
            </View>
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard icon={Users} label="Auditee" value={auditeeName} />
            </View>
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard icon={Calendar} label="Audit Date" value={auditDate} />
            </View>
          </View>

          {/* Second Row - 4 cards on desktop, 2 on mobile */}
          <View className="flex-row flex-wrap -mx-1.5 mt-3">
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard icon={Hash} label="NCR Number" value={ncr.ncrNumber} />
            </View>
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard
                icon={FileText}
                label="Audit Report No."
                value={auditReportNumber}
              />
            </View>
            <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
              <InfoCard
                icon={Calendar}
                label="Closure Date"
                value={closedDate}
              />
            </View>
            {isNCR2Mode && (
              <View className="w-full md:w-1/2 lg:w-1/4 px-1.5 mb-3">
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
        {/* Objective Evidence */}
        <FormSection title="🔍 Objective Evidence / Observations">
          <BulletPointEvidence items={evidenceItems} />
        </FormSection>

        {/* Statement of Nonconformity */}
        <FormSection title="📋 Statement of Nonconformity">
          <StatementCard data={statementData} />
        </FormSection>

        {/* Root Cause */}
        <FormSection title="🌱 Root Cause Analysis">
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

        {/* Correction */}
        <FormSection
          title={
            isNCR2Mode
              ? "✨ NCR2 - Correction of Problem"
              : "✨ Correction of Problem"
          }
        >
          <DetailRow
            label="Action Details"
            value={correction.action}
            multiline
          />
          <View className="flex-row flex-wrap gap-4 mt-3">
            <View className="flex-1 min-w-[45%]">
              <DetailRow
                label="Responsible Person/Dept"
                value={correction.resp}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <DetailRow
                label="Target Completion Date"
                value={correction.target}
              />
            </View>
          </View>
        </FormSection>

        {/* Corrective Action */}
        <FormSection
          title={
            isNCR2Mode
              ? "⚙️ NCR2 - Permanent Corrective Actions"
              : "⚙️ Corrective Actions"
          }
        >
          <DetailRow
            label="Action Details"
            value={correctiveAction.action}
            multiline
          />
          <View className="flex-row flex-wrap gap-4 mt-3">
            <View className="flex-1 min-w-[45%]">
              <DetailRow
                label="Responsible Person/Dept"
                value={correctiveAction.resp}
              />
            </View>
            <View className="flex-1 min-w-[45%]">
              <DetailRow
                label="Target Completion Date"
                value={correctiveAction.target}
              />
            </View>
          </View>
        </FormSection>

        {/* Acceptability */}
        <FormSection title="✅ Acceptability of Corrective Action">
          <View className="p-4 border border-green-200 rounded-lg bg-green-50">
            <Text
              className="text-sm font-medium text-green-800"
              style={{ fontFamily }}
            >
              Proposed Corrective actions are adequate to prevent the recurrence
              of the non-conformity
            </Text>
            <View className="flex-row justify-between pt-3 mt-4 border-t border-green-200">
              <View>
                <Text className="text-xs text-gray-500" style={{ fontFamily }}>
                  Date
                </Text>
                <Text
                  className="text-sm font-medium text-gray-800"
                  style={{ fontFamily }}
                >
                  {closedDate}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xs text-gray-500" style={{ fontFamily }}>
                  Auditor(s) / MR
                </Text>
                <Text
                  className="text-sm font-medium text-gray-800"
                  style={{ fontFamily }}
                >
                  {auditorName}
                </Text>
              </View>
            </View>
          </View>
        </FormSection>

        {/* Horizontal Deployment */}
        <FormSection title="🔄 Horizontal Deployment">
          <DetailRow
            label="Applying corrective actions to similar processes or areas"
            value={hdData.action}
            multiline
          />
          <View className="items-end mt-3">
            <View className="flex-row items-center gap-2 px-4 py-2 border border-blue-200 rounded-full bg-blue-50">
              <Calendar size={14} color="#2563eb" />
              <Text
                className="text-xs font-semibold text-blue-700"
                style={{ fontFamily }}
              >
                Actual Completion Date: {hdData.actual}
              </Text>
            </View>
          </View>
        </FormSection>

        {/* Verification */}
        <FormSection title="📋 Verification of Effectiveness">
          <DetailRow
            label="Objective evidence collected during follow-up audit"
            value={verificationComment}
            multiline
          />
          <View className="flex-row justify-between pt-3 mt-3 border-t border-gray-100">
            <View>
              <Text className="text-xs text-gray-500" style={{ fontFamily }}>
                Verification Date
              </Text>
              <Text
                className="text-sm font-medium text-gray-800"
                style={{ fontFamily }}
              >
                {closedDate}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-gray-500" style={{ fontFamily }}>
                Auditor(s) / MR
              </Text>
              <Text
                className="text-sm font-medium text-gray-800"
                style={{ fontFamily }}
              >
                {auditorName}
              </Text>
            </View>
          </View>
        </FormSection>

        {/* Remarks */}
        {managerReviewComment && (
          <FormSection title="📝 Management Remarks">
            <DetailRow value={managerReviewComment} multiline />
          </FormSection>
        )}

        {hodD0RejectionMessage && (
          <FormSection title="HOD Rejection Message from 8D D0">
            <View className="p-4 border border-red-200 rounded-lg bg-red-50">
              <Text
                className="text-sm leading-5 text-red-800"
                style={{ fontFamily }}
              >
                {hodD0RejectionMessage}
              </Text>
            </View>
          </FormSection>
        )}

        {/* Footer */}
        <View className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <View className="flex-row flex-wrap justify-center gap-4">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 bg-green-500 rounded-full" />
              <Text className="text-xs text-gray-600" style={{ fontFamily }}>
                (O+)Ve: Conformance
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 bg-red-500 rounded-full" />
              <Text className="text-xs text-gray-600" style={{ fontFamily }}>
                (O-)Ve: Non Conformance
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-amber-500" />
              <Text className="text-xs text-gray-600" style={{ fontFamily }}>
                (OI): Opportunity for Improvement
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Action Buttons */}
      <View className="flex-row flex-wrap self-center justify-end w-full max-w-5xl gap-3 px-4 mb-8">
        <TouchableOpacity
          onPress={() => {
            // ✅ SET STATE TO OPEN FORM 7 DETAIL VIEW INLINE
            setActiveForm7Config({
              id: ncr.id,
            });
          }}
          className="flex-row items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
          style={{ backgroundColor: "#0ea5e9" }}
        >
          <Eye size={16} color="#fff" />
          <Text
            className="text-sm font-medium text-white"
            style={{ fontFamily }}
          >
            View NCR1
          </Text>
        </TouchableOpacity>

        {is8DRelated && (
          <TouchableOpacity
            onPress={open8DReport}
            disabled={loading8DReport}
            className="flex-row items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
            style={{
              backgroundColor: COLORS.primary,
              opacity: loading8DReport ? 0.6 : 1,
            }}
          >
            {loading8DReport ? (
              <Loader2 size={16} color="#fff" />
            ) : (
              <FileBarChart size={16} color="#fff" />
            )}
            <Text
              className="text-sm font-medium text-white"
              style={{ fontFamily }}
            >
              View 8D Report
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <SuccessModal />

      {/* 8D Report Modal */}
      <Modal visible={show8DReportModal} transparent animationType="slide">
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="relative w-full max-w-6xl bg-white rounded-2xl overflow-hidden max-h-[90%]">
            <TouchableOpacity
              onPress={() => {
                setShow8DReportModal(false);
                setSelected8DEventId(null);
              }}
              className="absolute z-10 p-2 bg-red-500 rounded-full shadow-lg top-4 right-4"
              style={{ elevation: 5 }}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <ScrollView className="p-4">
              <FinalPreview
                eventId={selected8DEventId as string}
                isHOD={user?.role === "AUDIT_MANAGER" || user?.role === "HOD"}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
