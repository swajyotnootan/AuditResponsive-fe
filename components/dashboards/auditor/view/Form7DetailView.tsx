import { useAuth } from "@/components/context/AuthContext";
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
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Form8DetailView from "../../auditee/Form8DetailView";
import Form8View from "../../auditee/Form8View";
// ─────────────────────────────────────────────────────────────
// COLOR PALETTE & STYLES
// ─────────────────────────────────────────────────────────────
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

const getIconColor = (textClass: string) => {
  if (textClass.includes("amber")) return "#92400e";
  if (textClass.includes("blue")) return "#1e40af";
  if (textClass.includes("emerald")) return "#065f46";
  if (textClass.includes("purple")) return "#581c87";
  if (textClass.includes("green")) return "#166534";
  if (textClass.includes("red")) return "#991b1b";
  return "#334155";
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
    className="flex-row items-center gap-2 px-4 py-2.5 bg-white border rounded-xl shadow-sm border-slate-200"
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
  };
  const { bg, text, icon: Icon, label } = config[status] || config.OPEN;
  return (
    <View
      className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${bg}`}
    >
      <Icon size={12} color={getIconColor(text)} />
      <Text className={`text-xs font-semibold ${text} font-serif`}>
        {label}
      </Text>
    </View>
  );
};

const InfoCard = ({ icon: Icon, label, value }: any) => (
  <View className="flex-row items-start gap-3 p-3 border border-gray-100 bg-gray-50 rounded-xl">
    <View className="p-2 bg-white rounded-lg shadow-sm">
      <Icon size={16} color="#ef4444" />
    </View>
    <View className="flex-1">
      <Text className="font-serif text-xs tracking-wider text-gray-500 uppercase">
        {label}
      </Text>
      <Text className="font-serif text-sm font-semibold text-gray-800">
        {value || "—"}
      </Text>
    </View>
  </View>
);

const FormSection = ({ title, children }: any) => (
  <View className="px-4 py-5 border-b border-gray-100">
    <View className="self-start pb-2 mb-4 border-b-2 border-red-500">
      <Text className="font-serif text-base font-bold text-gray-800">
        {title}
      </Text>
    </View>
    <View className="mt-3">{children}</View>
  </View>
);

const DetailRow = ({ label, value, multiline = false }: any) => (
  <View className="pb-2 mb-3 border-b border-gray-50">
    <Text className="mb-1 font-serif text-xs font-semibold tracking-wider text-gray-500 uppercase">
      {label}
    </Text>
    {multiline ? (
      <View className="p-3 rounded-lg bg-gray-50">
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
  const formattedTimestamp = timestamp
    ? new Date(timestamp).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  // ✅ DEBUG: Verify the string is actually reaching the UI component
  if (signature) {
    console.log(
      `🖼️ [SIGNATURE UI DEBUG] ${label} received. Starts with:`,
      signature.substring(0, 30),
    );
  }

  return (
    <View className="items-center w-full">
      <Text className="mb-2 font-serif text-xs font-semibold tracking-wider text-gray-600 uppercase">
        {label}
      </Text>

      {signature &&
      (signature.startsWith("data:image") || signature.startsWith("http")) ? (
        // ✅ FIX: Added explicit style={{ minHeight: 60, alignItems: 'center', justifyContent: 'center' }}
        <View
          className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50"
          style={{
            minHeight: 60,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={{ uri: signature }}
            // ✅ CRITICAL FIX: React Native Web often ignores className dimensions on <Image>.
            // Explicit style guarantees it renders.
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
        <View className="flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg border-amber-300 bg-amber-50">
          <Clock size={20} color="#f59e0b" style={{ marginBottom: 4 }} />
          <Text className="font-serif text-xs font-medium text-amber-600">
            Pending Acknowledgement
          </Text>
        </View>
      ) : (
        <View className="w-full h-20 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50" />
      )}

      <Text className="mt-2 font-serif text-xs font-medium text-gray-500">
        {name || "—"}
      </Text>

      {formattedTimestamp && (
        <View className="flex-row items-center justify-center gap-1 mt-1">
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
      <View className="items-center justify-center flex-1 bg-black/50">
        <View className="w-full max-w-md mx-4 overflow-hidden bg-white shadow-2xl rounded-2xl">
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}
          >
            <Text
              className="font-serif text-lg font-bold"
              style={{ color: "rgba(220, 38, 38, 0.85)" }}
            >
              {decision === "approve"
                ? "Approving..."
                : decision === "reject"
                  ? "Rejecting..."
                  : title}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-lg">
              <X size={20} color="rgba(220, 38, 38, 0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" keyboardShouldPersistTaps="handled">
            <View
              className="p-3 mb-4 rounded-lg"
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.05)",
                borderWidth: 1,
                borderColor: "rgba(220, 38, 38, 0.1)",
              }}
            >
              <Text
                className="font-serif text-sm"
                style={{ color: "rgba(75, 85, 99, 0.9)" }}
              >
                <Text
                  style={{
                    color: "rgba(220, 38, 38, 0.8)",
                    fontWeight: "bold",
                  }}
                >
                  NCR {ncr?.ncrNumber}
                </Text>
                {"\n"}
                <Text style={{ fontWeight: "bold" }}>Department:</Text>{" "}
                {ncr?.department}
              </Text>
            </View>

            {ncr?.auditScore != null && (
              <View
                className="p-4 mb-4 border rounded-xl"
                style={{
                  backgroundColor: ncr.auditScore >= 70 ? "#f0fdf4" : "#fef2f2",
                  borderColor: ncr.auditScore >= 70 ? "#bbf7d0" : "#fecaca",
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View>
                    <Text className="text-xs font-medium text-slate-500">
                      Audit Score
                    </Text>
                    <Text
                      className="text-2xl font-bold"
                      style={{
                        color: ncr.auditScore >= 70 ? "#10b981" : "#ef4444",
                      }}
                    >
                      {ncr.auditScore}%
                    </Text>
                  </View>
                  <View className="items-end flex-1 pl-2">
                    <Text className="text-xs text-right text-slate-600">
                      {ncr.auditScore >= 70
                        ? "✅ Above threshold - Normal NCR flow"
                        : "⚠️ Below threshold - Requires 8D process"}
                    </Text>
                  </View>
                </View>
                <View className="w-full bg-white rounded-full h-1.5 overflow-hidden">
                  <View
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${ncr.auditScore}%`,
                      backgroundColor:
                        ncr.auditScore >= 70 ? "#10b981" : "#ef4444",
                    }}
                  />
                </View>
              </View>
            )}

            {ncr?.auditScore != null && ncr.auditScore < 70 && (
              <View
                className="flex-row items-start gap-3 p-3 mb-4 border rounded-xl"
                style={{ backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }}
              >
                <TouchableOpacity
                  onPress={() => setSendTo8D(!sendTo8D)}
                  className="mt-0.5"
                >
                  <View
                    className={`w-4 h-4 rounded border items-center justify-center ${sendTo8D ? "bg-purple-600 border-purple-600" : "bg-white border-slate-300"}`}
                  >
                    {sendTo8D && <CheckCircle size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-slate-800">
                    Send to 8D Team for investigation
                  </Text>
                  <Text className="mt-1 text-xs text-slate-600">
                    Audit score ({ncr.auditScore}%) is below threshold (70%).
                    Recommended to send to 8D instead of normal corrective
                    action.
                  </Text>
                </View>
              </View>
            )}

            <View className="mb-5">
              <Text
                className="mb-2 font-serif text-sm font-medium"
                style={{ color: "rgba(75, 85, 99, 0.8)" }}
              >
                Comments{" "}
                {!decision && (
                  <Text className="text-xs text-red-500">
                    (required for rejection)
                  </Text>
                )}
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="w-full p-3 font-serif border rounded-xl"
                style={{
                  borderColor: "rgba(209, 213, 219, 0.5)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                }}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Enter review comments..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity
                onPress={() => handleReview(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl flex-row items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "rgba(220, 38, 38, 0.8)" }}
              >
                {loading && decision === "reject" && (
                  <Loader2 size={16} color="#fff" />
                )}
                <ThumbsDown size={16} color="#fff" />
                <Text className="font-serif font-medium text-white">
                  {rejectLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReview(true)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl flex-row items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "rgba(16, 185, 129, 0.8)" }}
              >
                {loading && decision === "approve" && (
                  <Loader2 size={16} color="#fff" />
                )}
                <ThumbsUp size={16} color="#fff" />
                <Text className="font-serif font-medium text-white">
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
      <View className="items-center justify-center flex-1 bg-black/50">
        <View className="w-full max-w-md mx-4 overflow-hidden bg-white shadow-2xl rounded-2xl">
          <View
            className="items-center px-6 pt-8 pb-6"
            style={{ backgroundColor: COLORS.bg }}
          >
            <View className="items-center justify-center w-16 h-16 mb-4 bg-white rounded-full shadow-lg">
              <Users size={32} color={COLORS.primary} />
            </View>
            <Text className="font-serif text-xl font-bold text-slate-800">
              Auditee NCR Review
            </Text>
            <Text className="mt-1 font-serif text-sm text-slate-600">
              NCR Number:{" "}
              <Text className="font-semibold" style={{ color: COLORS.primary }}>
                {ncr?.ncrNumber || "—"}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="absolute p-2 rounded-lg top-4 right-4"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
            <View className="mb-5">
              <View className="items-center p-3 border rounded-xl bg-slate-50 border-slate-200">
                <Text className="mb-1 font-serif text-xs text-slate-500">
                  Department
                </Text>
                <Text
                  className="font-serif text-sm font-semibold text-slate-800"
                  numberOfLines={1}
                >
                  {ncr?.department || "—"}
                </Text>
              </View>
            </View>

            <View className="mb-5">
              <Text className="mb-2 font-serif text-sm font-semibold text-slate-700">
                Comments{" "}
                <Text className="ml-1 text-xs text-rose-500">(required)</Text>
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white shadow-sm font-serif"
                placeholder="Enter your review comments..."
                placeholderTextColor="#94a3b8"
                value={reviewComment}
                onChangeText={setReviewComment}
              />
            </View>

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity
                onPress={() => onReview(false, reviewComment)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50 shadow-md"
                style={{ backgroundColor: COLORS.danger }}
              >
                {loading ? (
                  <Loader2 size={16} color="#fff" />
                ) : (
                  <ThumbsDown size={16} color="#fff" />
                )}
                <Text className="font-serif text-sm font-semibold text-white">
                  Reject
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onReview(true, reviewComment)}
                disabled={loading}
                className="flex-1 flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50 shadow-md"
                style={{ backgroundColor: COLORS.secondary }}
              >
                {loading ? (
                  <Loader2 size={16} color="#fff" />
                ) : (
                  <ThumbsUp size={16} color="#fff" />
                )}
                <Text className="font-serif text-sm font-semibold text-white">
                  Accept
                </Text>
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
export default function Form7DetailView({ initialParams, onClose }: any) {
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

      // ✅ BRANCH 1: WEB (Keep your working blob logic)
      if (Platform.OS === "web") {
        const response = await fetch(url, {
          headers: { Accept: "image/png, image/jpeg, application/json" },
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
      }

      // ✅ BRANCH 2: MOBILE (Uses legacy import, fixing the deprecation error)
      else {
        const fileUri = `${FileSystem.cacheDirectory}signature_${userId}.tmp`;

        console.log("📱 [FETCH SIGNATURE] Downloading via expo-file-system...");
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          fileUri,
          {
            headers: { Accept: "image/png, image/jpeg, application/json" },
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

        // Read the downloaded file as a base64 string
        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Try to get the correct MIME type from headers, fallback to image/png
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

        // ✅ Fetch Auditor Signature (with name fallback like FiveSView)
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

        // ✅ Fetch Auditee Signature (with name fallback like FiveSView)
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
        token = await AsyncStorage.getItem("token");
      }

      const url = `${API_BASE_URL}/api/ncr/${ncr.id}/form7-pdf`;

      if (Platform.OS === "web") {
        const response = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
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
        );
        const data = await response.json();
        if (response.ok && data?.success && data?.data) return candidate;
      } catch {
        // Try the next candidate/fallback search.
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`,
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

  // ✅ ADD THIS: Render function for Form 8
  const renderActiveForm8 = () => {
    if (!activeForm8Config) return null;
    return (
      <Form8View
        initialParams={activeForm8Config}
        onClose={() => {
          setActiveForm8Config(null);
          fetchNCRDetail(); // Refresh data when returning from Form 8
        }}
      />
    );
  };

  const renderActiveForm8Detail = () => {
    if (!activeForm8DetailConfig) return null;
    return (
      <Form8DetailView
        initialParams={activeForm8DetailConfig}
        onClose={() => {
          setActiveForm8DetailConfig(null);
          fetchNCRDetail(); // Refresh data when returning from Form 8 Detail
        }}
      />
    );
  };

  if (activeForm8DetailConfig) {
    return renderActiveForm8Detail();
  }

  if (activeForm8Config) {
    return renderActiveForm8();
  }

  if (loading) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1 bg-gray-50"
        style={{ flex: 1 }}
      >
        <View className="items-center">
          <Loader2 size={48} color="#ef4444" className="mb-4" />
          <Text className="font-serif font-medium text-gray-500">
            Loading NCR details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ncr) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1 bg-gray-50"
        style={{ flex: 1 }}
      >
        <View className="items-center max-w-md p-8 mx-4 bg-white shadow-lg rounded-2xl">
          <AlertCircle size={48} color="#ef4444" className="mb-4" />
          <Text className="mb-4 font-serif text-center text-gray-600">
            {error || "NCR not found"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              onClose ? onClose() : router.replace(dashboardPath as any)
            }
            className="px-5 py-2.5 bg-red-500 rounded-xl"
          >
            <Text className="font-serif font-medium text-white">
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    // ✅ FIX 2: Added explicit style={{ flex: 1 }} to guarantee desktop web scrolling
    <SafeAreaView className="flex-1 bg-gray-50" style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true} // Turned on for desktop visibility
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          contentContainerClassName="p-4"
        >
          {/* Top Action Bar */}
          <View className="flex-row flex-wrap items-center justify-between w-full max-w-5xl gap-3 mx-auto mb-5">
            <BackButton
              label="Back"
              onPress={() =>
                onClose ? onClose() : router.replace(dashboardPath as any)
              }
            />
            <View className="flex-row items-center gap-3">
              <StatusBadge status={ncr.status} />
              <TouchableOpacity
                onPress={downloadPDF}
                disabled={pdfDownloading}
                className="flex-row items-center gap-2 px-3 py-2.5 rounded-xl shadow-sm disabled:opacity-50"
                style={{ backgroundColor: COLORS.primary }}
              >
                {pdfDownloading ? (
                  <Loader2 size={18} color="#fff" />
                ) : (
                  <Download size={18} color="#fff" />
                )}
                <Text className="font-serif text-sm font-medium text-white">
                  Download PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Form Card */}
          <View className="w-full max-w-5xl mx-auto overflow-hidden bg-white shadow-xl rounded-2xl">
            {/* Header */}
            <View
              className="px-4 py-5"
              style={{ backgroundColor: COLORS.primary }}
            >
              <View className="flex-row flex-wrap items-start justify-between gap-4">
                <View className="flex-1 min-w-[200px]">
                  <Text className="font-serif text-lg font-bold text-white">
                    Nonconformity Report (NCR)
                  </Text>
                  <Text className="mt-1 font-serif text-sm text-gray-300">
                    {ncr.companyName || "Quality Management System"}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-serif text-sm font-medium text-white/80">
                    <Text className="opacity-70">Audit Report:</Text>{" "}
                    {ncr.auditReportNumber || "INT/20xx/01"}
                  </Text>
                  <Text className="font-serif text-lg font-bold text-white">
                    {ncr.ncrNumber || "03"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Info Cards Row */}
            <View className="px-4 py-4 border-b border-gray-100 bg-gray-50">
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
                    value={
                      ncr.dueDate
                        ? new Date(ncr.dueDate).toLocaleDateString()
                        : "—"
                    }
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
                <View className="flex-1 min-w-[45%]">
                  <SignatureField
                    label="Auditor Signature"
                    name={ncr.auditorName}
                    signature={finalAuditorSignature}
                    timestamp={ncr.createdAt || ncr.auditorSignedAt || null}
                  />
                </View>
                <View className="flex-1 min-w-[45%]">
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
              <View className="px-4 py-4 border-b border-blue-100 bg-blue-50">
                <View className="flex-row gap-3">
                  <View className="p-2 bg-blue-100 rounded-lg">
                    <AlertCircle size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-serif text-xs font-semibold tracking-wider text-blue-700 uppercase">
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
            <View className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              <View className="flex-row flex-wrap justify-center gap-4">
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 bg-green-500 rounded-full" />
                  <Text className="font-serif text-xs">
                    (O+)Ve: Conformance
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 bg-red-500 rounded-full" />
                  <Text className="font-serif text-xs">
                    (O-)Ve: Non Conformance
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-2 h-2 rounded-full bg-amber-500" />
                  <Text className="font-serif text-xs">
                    (OI): Opportunity for Improvement
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row flex-wrap justify-end w-full max-w-5xl gap-3 px-4 mx-auto mt-6">
            {(ncr?.rootCause?.trim() ||
              ncr?.correction?.trim() ||
              ncr?.correctiveAction?.trim() ||
              ncr?.ncr2RootCause?.trim() ||
              ncr?.ncr2Correction?.trim() ||
              ncr?.ncr2CorrectiveAction?.trim()) && (
              <TouchableOpacity
                onPress={() => {
                  // ✅ SET STATE TO OPEN FORM 8 DETAIL VIEW INLINE
                  setActiveForm8DetailConfig({
                    id: ncr.id,
                    type: isNcr2Flow ? "ncr2" : "normal",
                  });
                }}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                style={{ backgroundColor: "#f97316" }}
              >
                <Eye size={16} color="#fff" />
                <Text className="font-serif text-sm font-medium text-white">
                  View NCR2
                </Text>
              </TouchableOpacity>
            )}
            {is8DRelated && (
              <TouchableOpacity
                onPress={open8DReport}
                disabled={loading8DReport}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-60"
                style={{ backgroundColor: COLORS.primary }}
              >
                {loading8DReport ? (
                  <Loader2 size={16} color="#fff" />
                ) : (
                  <FileBarChart size={16} color="#fff" />
                )}
                <Text className="font-serif text-sm font-medium text-white">
                  View 8D Report
                </Text>
              </TouchableOpacity>
            )}

            {canManagerReview && (
              <TouchableOpacity
                onPress={() => setShowReviewModal(true)}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                style={{ backgroundColor: COLORS.warning }}
              >
                <CheckCircle size={16} color="#fff" />
                <Text className="font-serif text-sm font-medium text-white">
                  Review & Decide
                </Text>
              </TouchableOpacity>
            )}

            {canAuditeeReview && (
              <TouchableOpacity
                onPress={() => setShowAuditeeReviewModal(true)}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                style={{ backgroundColor: COLORS.success }}
              >
                <ThumbsUp size={16} color="#fff" />
                <Text className="font-serif text-sm font-medium text-white">
                  Accept / Reject
                </Text>
              </TouchableOpacity>
            )}

            {canEdit && (
              <TouchableOpacity
                onPress={() => router.push(`/form7?id=${ncr.id}` as any)}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                style={{ backgroundColor: COLORS.secondary }}
              >
                <Edit size={16} color="#fff" />
                <Text className="font-serif text-sm font-medium text-white">
                  Edit NCR
                </Text>
              </TouchableOpacity>
            )}

            {canSubmitCA && (
              <TouchableOpacity
                onPress={() => {
                  // ✅ SET STATE TO OPEN FORM 8 INLINE
                  setActiveForm8Config({
                    id: ncr.id,
                    type: ncr?.status === "READY_FOR_NCR2" ? "ncr2" : "normal",
                  });
                }}
                className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                style={{ backgroundColor: "#f97316" }}
              >
                <FileText size={16} color="#fff" />
                <Text className="font-serif text-sm font-medium text-white">
                  {ncr?.status === "READY_FOR_NCR2"
                    ? "Submit NCR2"
                    : "Submit Corrective Action"}
                </Text>
              </TouchableOpacity>
            )}
            {isAuditeeRole &&
              ncr.status === "IN_PROGRESS" &&
              ncr.rejectionReason && (
                <TouchableOpacity
                  onPress={() => router.push(`/form8?id=${ncr.id}` as any)}
                  className="flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-sm"
                  style={{ backgroundColor: COLORS.warning }}
                >
                  <Edit size={16} color="#fff" />
                  <Text className="font-serif text-sm font-medium text-white">
                    Revise Corrective Action
                  </Text>
                </TouchableOpacity>
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

      {show8DReportModal && selected8DEventId && (
        <Modal visible={true} transparent animationType="slide">
          <View className="flex-1 bg-black/50">
            <View className="flex-1 px-4 py-6">
              <View className="relative flex-1 max-w-6xl mx-auto">
                <TouchableOpacity
                  onPress={() => {
                    setShow8DReportModal(false);
                    setSelected8DEventId(null);
                  }}
                  className="absolute z-10 p-2 bg-red-500 rounded-full shadow-lg -top-2 -right-2"
                >
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                <ScrollView className="flex-1 bg-white rounded-xl">
                  <View className="items-center justify-center p-8">
                    <Text className="font-serif text-gray-500">
                      8D Report Preview Component Loaded Here
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
