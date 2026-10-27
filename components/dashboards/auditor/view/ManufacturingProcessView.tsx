import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Hash,
  MapPin,
  Package,
  Settings,
  ThumbsDown,
  ThumbsUp,
  User,
  Wrench,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";

// MANUFACTURING PROCESS CHECK SHEET ID = 1
const MANUFACTURING_CHECK_SHEET_ID = 1;

// ═════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatConsiderationAsNumberedList = (text: string) => {
  if (!text || text === "No documents specified") return "-";
  let items: string[] = [];
  if (text.includes("\n")) items = text.split("\n");
  else if (text.includes(",")) items = text.split(",");
  else items = [text];

  const cleanItems = items
    .map((item: string) =>
      item
        .replace(/^\d+\.\s*/, "")
        .replace(/[•●○▪▫-]\s*/, "")
        .trim(),
    )
    .filter((item: string) => item.length > 0);

  return cleanItems
    .map((item: string, idx: number) => `${idx + 1}. ${item}`)
    .join("\n");
};

// ✅ REUSABLE OUTLINE BUTTON WITH HOVER EFFECT
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ManufacturingProcessView({
  initialId,
  onClose,
}: { initialId?: string; onClose?: () => void } = {}) {
  const { id: paramId } = useLocalSearchParams();
  const id = initialId || paramId;

  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [questions, setQuestions] = useState<any[]>([]);

  const [auditorName, setAuditorName] = useState("");
  const [auditeeName, setAuditeeName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const [auditeeSignature, setAuditeeSignature] = useState("");
  const [auditeeComment, setAuditeeComment] = useState("");
  const [auditorSignedAt, setAuditorSignedAt] = useState<string | null>(null);
  const [auditeeSignedAt, setAuditeeSignedAt] = useState<string | null>(null);

  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState<string | null>(
    null,
  );
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState<string | null>(
    null,
  );
  const [loadingSignatures, setLoadingSignatures] = useState(false);
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
          headers: { Accept: "application/json" },
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
    if (id) {
      fetchAuditDetails();
    }
  }, [id]);

  const fetchSignatureAsImageUrl = async (
    userId: any,
    fullName: string,
  ): Promise<string | null> => {
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

      const response = await fetch(url, {
        headers: { Accept: "image/png, image/jpeg, application/json" },
      });

      if (response.ok) {
        const blob = await response.blob();
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      return null;
    } catch (error) {
      console.error("Error fetching signature:", error);
      return null;
    }
  };

  const getSignatureFromBase64 = (base64String: string): string | null => {
    if (
      base64String &&
      (base64String.startsWith("data:image") || base64String.includes("base64"))
    ) {
      return base64String;
    }
    return null;
  };

  const fetchAuditDetails = async () => {
    try {
      setLoading(true);
      const response = await auditScheduleApi.getAuditResponse(
        parseInt(id as string),
      );
      const auditData = response.data;

      if (!auditData) {
        addToast("Failed to load audit data: Empty response", "error");
        setLoading(false);
        return;
      }

      setAudit(auditData);

      let parsedAnswers: any = {};
      try {
        if (auditData.answers) {
          parsedAnswers =
            typeof auditData.answers === "string"
              ? JSON.parse(auditData.answers)
              : auditData.answers;
        }
      } catch (e) {
        console.error("Error parsing answers:", e);
      }
      setAnswers(parsedAnswers);

      setDepartmentName(
        parsedAnswers.department || auditData.department || "-",
      );

      if (parsedAnswers.auditeeSignature) {
        setAuditeeSignature(parsedAnswers.auditeeSignature);
        const sigImage = getSignatureFromBase64(parsedAnswers.auditeeSignature);
        if (sigImage) setAuditeeSignatureUrl(sigImage);
      }
      if (parsedAnswers.auditeeComment)
        setAuditeeComment(parsedAnswers.auditeeComment);
      if (parsedAnswers.auditeeSignedAt)
        setAuditeeSignedAt(parsedAnswers.auditeeSignedAt);
      if (parsedAnswers.auditorSignedAt)
        setAuditorSignedAt(parsedAnswers.auditorSignedAt);

      let auditor = "";
      if (auditData.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(
            String(auditData.auditorId),
          );
          auditor =
            auditorUser?.name ||
            `${auditorUser?.firstName} ${auditorUser?.lastName}`;
        } catch (e) {
          auditor =
            auditData.auditorName || parsedAnswers.auditorName || "Unknown";
        }
      } else {
        auditor =
          auditData.auditorName || parsedAnswers.auditorName || "Unknown";
      }
      setAuditorName(auditor);

      const auditee =
        auditData.auditeeName || parsedAnswers.auditeeName || "Not specified";
      setAuditeeName(auditee);

      setLoadingSignatures(true);
      const auditorSigUrl = await fetchSignatureAsImageUrl(
        auditData.auditorId,
        auditor,
      );
      if (auditorSigUrl) {
        setAuditorSignatureUrl(auditorSigUrl);
      } else {
        const auditorSigBase64 = parsedAnswers.auditorSignature;
        if (auditorSigBase64 && auditorSigBase64.startsWith("data:image")) {
          setAuditorSignatureUrl(auditorSigBase64);
        }
      }

      const currentUserRole = user?.role?.toLowerCase?.() || "";
      const isAuditorUser =
        currentUserRole === "auditor" || auditData.auditorId === user?.id;

      if (!isAuditorUser) {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(
          auditData.auditeeId,
          auditee,
        );
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else if (isAuditorUser && auditData.status === "APPROVED") {
        const auditeeSigUrl = await fetchSignatureAsImageUrl(
          auditData.auditeeId,
          auditee,
        );
        if (auditeeSigUrl) setAuditeeSignatureUrl(auditeeSigUrl);
      } else {
        setAuditeeSignatureUrl(null);
      }
      setLoadingSignatures(false);

      if (
        parsedAnswers.questionsData &&
        parsedAnswers.questionsData.length > 0
      ) {
        setQuestions(parsedAnswers.questionsData);
      } else {
        try {
          const checkSheetId =
            auditData.checkSheet?.id || MANUFACTURING_CHECK_SHEET_ID;
          const sheetRes = await fetch(
            `${API_BASE_URL}/api/templates/${checkSheetId}`,
          );
          const sheet = await sheetRes.json();
          if (sheet.questions) {
            let parsedQuestions: any[] = [];
            try {
              parsedQuestions =
                typeof sheet.questions === "string"
                  ? JSON.parse(sheet.questions)
                  : sheet.questions;
              const formattedQuestions = parsedQuestions.map(
                (q: any, idx: number) => ({
                  slNo: q.sNo || q.slNo || idx + 1,
                  checkpoint: q.displayLabel || q.checkpoint,
                  consideration:
                    q.consideration ||
                    q.whatToLookFor ||
                    q.documentsVerified ||
                    "No documents specified",
                  clause: q.clauseNo || q.category || q.clause || "",
                }),
              );
              setQuestions(formattedQuestions);
            } catch (e) {
              console.error("Error parsing questions:", e);
            }
          }
        } catch (error) {
          console.error("Error fetching check sheet:", error);
        }
      }
    } catch (error: any) {
      console.error("Error fetching audit details:", error);
      addToast(
        "Failed to load audit details: " + (error.message || "Unknown error"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) {
      addToast("Audit data not available", "error");
      return;
    }
    setDownloading(true);
    try {
      const responseId = audit.id;
      const endpoint = `${API_BASE_URL}/api/manufacturing-audits/${responseId}/pdf`;

      if (Platform.OS === "web") {
        const response = await fetch(endpoint, {
          headers: { Accept: "application/pdf" },
        });
        if (!response.ok) throw new Error("Failed to fetch PDF");
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute(
          "download",
          `Manufacturing_Audit_Report_${responseId}.pdf`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        addToast("PDF downloaded successfully", "success");
      } else {
        const fs = FileSystem as any;
        const directory = fs.documentDirectory || fs.cacheDirectory;
        const fileUri = `${directory}Manufacturing_Audit_Report_${responseId}.pdf`;

        const response = await fetch(endpoint, {
          headers: { Accept: "application/pdf" },
        });
        if (!response.ok) throw new Error("Failed to fetch PDF");
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            await fs.writeAsStringAsync(fileUri, base64data.split(",")[1], {
              encoding: "base64",
            });
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            } else {
              addToast("PDF downloaded to device", "success");
            }
          } catch (error: any) {
            console.error("Error saving PDF:", error);
            addToast(`Failed to save PDF: ${error.message}`, "error");
          } finally {
            setDownloading(false);
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      addToast(`Failed to download PDF: ${error.message}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleViewPDF = async () => {
    if (!audit || !audit.id) {
      addToast("Audit data not available", "error");
      return;
    }
    setDownloading(true);
    try {
      const responseId = audit.id;
      const endpoint = `${API_BASE_URL}/api/manufacturing-audits/${responseId}/pdf`;

      const response = await fetch(endpoint, {
        headers: { Accept: "application/pdf" },
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
        fileName: `Manufacturing_Audit_Report_${responseId}.pdf`,
      });
      setDownloading(false);
    } catch (error: any) {
      console.error("Error viewing PDF:", error);
      addToast(`Failed to load PDF: ${error.message}`, "error");
      setDownloading(false);
    }
  };

  const handleApprove = async () => {
    let signatureToSave: string = auditeeSignature;
    if (auditeeSignatureUrl && !auditeeSignatureUrl.startsWith("blob:")) {
      signatureToSave = auditeeSignatureUrl;
    } else if (auditeeSignatureUrl && auditeeSignatureUrl.startsWith("blob:")) {
      try {
        const response = await fetch(auditeeSignatureUrl);
        const blob = await response.blob();
        signatureToSave = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error converting signature to base64:", error);
        signatureToSave = auditeeSignature;
      }
    }

    if (!signatureToSave || !signatureToSave.trim()) {
      addToast(
        "No signature available. Please upload signature in your profile or type your name.",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/responses/${audit.id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signature: signatureToSave,
            comment: auditeeComment || "No comments provided",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to approve audit");
      }

      const responseData = await response.json();
      if (responseData) {
        addToast("✓ Audit approved successfully!", "success");
        await fetchAuditDetails();
      }
    } catch (error: any) {
      console.error("Error approving audit:", error);
      addToast(
        `Failed to approve: ${error.message || "Unknown error"}`,
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!auditeeComment.trim()) {
      addToast("Please provide a reason for rejection", "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/responses/${audit.id}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: auditeeComment }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reject audit");
      }

      const responseData = await response.json();
      if (responseData) {
        addToast("✗ Audit rejected. The auditor has been notified.", "warning");
        await fetchAuditDetails();
      }
    } catch (error: any) {
      console.error("Error rejecting audit:", error);
      addToast(
        `Failed to reject: ${error.message || "Unknown error"}`,
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  const currentStatus = audit?.status || "SUBMITTED";
  const statusUpper = currentStatus?.toUpperCase?.() || "";
  const isApproved = statusUpper === "APPROVED";
  const isRejected = statusUpper === "REJECTED";

  const currentUserRole = user?.role?.toLowerCase?.() || "";
  const isAuditor =
    currentUserRole === "auditor" || audit?.auditorId === user?.id;
  const isAuditee =
    currentUserRole === "auditee" ||
    audit?.auditeeId === user?.id ||
    (audit?.auditeeName && audit?.auditeeName === user?.name);
  const showAuditeeActions = isAuditee && !isApproved && !isRejected;

  const responses = answers.responses || {};
  const observations = answers.observations || {};
  const totalQuestions = questions.length;
  const compliantCount = Object.values(responses).filter(
    (r: any) => r === "COMPLIANT",
  ).length;
  const minorNCCount = Object.values(responses).filter(
    (r: any) => r === "MINOR_NC",
  ).length;
  const majorNCCount = Object.values(responses).filter(
    (r: any) => r === "MAJOR_NC",
  ).length;

  const percentage = answers.score || 0;
  const finalPercentage =
    percentage > 0
      ? percentage
      : totalQuestions > 0
        ? Math.round((compliantCount / totalQuestions) * 100)
        : 0;

  // ============================================================================
  // RENDER STATES
  // ============================================================================
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-3 text-sm font-medium text-slate-500">
          Loading audit report...
        </Text>
      </View>
    );
  }

  if (!audit) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-6">
        <View className="w-full max-w-md items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <AlertCircle
            size={48}
            color={COLORS.stateErrorText}
            className="mb-4"
          />
          <Text className="text-lg font-bold text-slate-900">
            Audit not found
          </Text>
          <TouchableOpacity
            onPress={() => (onClose ? onClose() : router.back())}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-sm font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            maxWidth: 1200,
            alignSelf: "center",
            width: "100%",
            padding: 16,
          }}
        >
          {/* Header with Actions */}
          <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => (onClose ? onClose() : router.back())}
                className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100"
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#475569" />
              </TouchableOpacity>
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <FileText size={20} color={COLORS.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-xl font-bold text-slate-900"
                  numberOfLines={1}
                >
                  Manufacturing Process Audit
                </Text>
                <Text
                  className="mt-0.5 text-sm font-medium text-slate-500"
                  numberOfLines={1}
                >
                  IATF 16949:2016 | Process Audit Compliance
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <OutlineButton
                title="View PDF"
                icon={FileText}
                onPress={handleViewPDF}
                disabled={downloading}
                loading={downloading}
              />

              <OutlineButton
                title="Download PDF"
                icon={Download}
                onPress={handleDownloadPDF}
                disabled={downloading}
                loading={downloading}
              />
            </View>
          </View>

          {/* Status Banners */}
          {isApproved && (
            <View
              className="mb-6 flex-row gap-4 rounded-2xl border p-5"
              style={{
                backgroundColor: COLORS.stateSuccessBg,
                borderColor: COLORS.primaryBorder,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-white bg-white">
                <CheckCircle size={20} color={COLORS.primary} />
              </View>
              <View className="flex-1 justify-center">
                <Text
                  className="text-sm font-bold"
                  style={{ color: COLORS.primaryDark }}
                >
                  Audit Approved by Auditee
                </Text>
                {answers.auditeeComment && (
                  <Text
                    className="mt-1 text-sm leading-5"
                    style={{ color: COLORS.primaryDark, opacity: 0.9 }}
                  >
                    Comment: {answers.auditeeComment}
                  </Text>
                )}
              </View>
            </View>
          )}

          {isRejected && (
            <View
              className="mb-6 flex-row gap-4 rounded-2xl border p-5"
              style={{
                backgroundColor: COLORS.stateErrorBg,
                borderColor: COLORS.border,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <XCircle size={20} color={COLORS.stateErrorText} />
              </View>
              <View className="flex-1 justify-center">
                <Text
                  className="text-sm font-bold"
                  style={{ color: COLORS.stateErrorText }}
                >
                  Audit Rejected - Corrections Required
                </Text>
                {answers.auditeeComment && (
                  <Text
                    className="mt-1 text-sm leading-5"
                    style={{ color: COLORS.stateErrorText, opacity: 0.9 }}
                  >
                    Reason: {answers.auditeeComment}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Main Banner */}
          <View
            className="mb-6 items-center justify-center overflow-hidden rounded-2xl border p-6"
            style={{
              backgroundColor: COLORS.primaryLight,
              borderColor: COLORS.primaryBorder,
            }}
          >
            <View className="mb-2 flex-row items-center justify-center gap-2">
              <FileText size={22} color={COLORS.primary} />
              <Text
                className="text-center text-lg font-bold"
                style={{ color: COLORS.primaryDark }}
              >
                Manufacturing Process Audit Check Sheet
              </Text>
            </View>
            <Text
              className="text-center text-sm"
              style={{ color: COLORS.primaryDark, opacity: 0.8 }}
            >
              IATF 16949:2016 | Process Audit Compliance
            </Text>
            {departmentName && (
              <View className="mt-4 w-full flex-row flex-wrap items-center justify-center gap-2 border-t border-blue-200 pt-4">
                <View className="flex-row items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5">
                  <Building size={12} color={COLORS.primary} />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: COLORS.primaryDark }}
                  >
                    {departmentName}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Document Control Information */}
          <View
            className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="border-b border-slate-100 p-5">
              <View className="flex-row items-center gap-2">
                <Hash size={18} color={COLORS.primary} />
                <Text className="text-base font-bold text-slate-900">
                  Document Control Information
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap p-3">
              {[
                {
                  icon: Hash,
                  label: "Doc No.",
                  value: answers.documentNumber || "-",
                },
                {
                  icon: Calendar,
                  label: "W.e.f. (Date)",
                  value: answers.wefDate || "-",
                },
                {
                  icon: Hash,
                  label: "Rev No.",
                  value: answers.revNo || "00",
                },
                {
                  icon: Calendar,
                  label: "Rev Date",
                  value: answers.revDate || "-",
                },
                {
                  icon: Calendar,
                  label: "Issue Date",
                  value: answers.issueDate || "-",
                },
              ].map((item, idx) => (
                <View
                  key={idx}
                  className="mb-2 w-full px-2 md:w-1/2 lg:w-1/3 xl:w-1/5"
                >
                  <View className="flex-row items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <item.icon size={16} color="#94A3B8" className="mt-0.5" />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.label}
                      </Text>
                      <Text
                        className="mt-1 text-sm font-semibold text-slate-800"
                        numberOfLines={2}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Audit Information */}
          <View
            className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="border-b border-slate-100 p-5">
              <View className="flex-row items-center gap-2">
                <Settings size={18} color={COLORS.primary} />
                <Text className="text-base font-bold text-slate-900">
                  Audit Information
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap p-3">
              {[
                {
                  icon: Building,
                  label: "Department Name",
                  value: departmentName || answers.department || "-",
                },
                {
                  icon: Package,
                  label: "Part Name & Number",
                  value: answers.partNumber || "-",
                },
                {
                  icon: Wrench,
                  label: "Machine",
                  value: answers.machine || "-",
                },
                {
                  icon: User,
                  label: "Auditor Name",
                  value: auditorName || answers.auditorName || "N/A",
                },
                {
                  icon: User,
                  label: "Auditee Name",
                  value: auditeeName || answers.auditeeName || "N/A",
                },
                {
                  icon: MapPin,
                  label: "Location",
                  value: answers.location || "-",
                },
                {
                  icon: Clock,
                  label: "Shift",
                  value: audit.shift || answers.shift || "-",
                },
                {
                  icon: Calendar,
                  label: "Date",
                  value: answers.date || formatDate(audit.auditDate),
                },
                {
                  icon: Clock,
                  label: "Time",
                  value: answers.time || "-",
                },
              ].map((item, idx) => (
                <View key={idx} className="mb-2 w-full px-2 md:w-1/2 lg:w-1/3">
                  <View className="flex-row items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <item.icon size={16} color="#94A3B8" className="mt-0.5" />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {item.label}
                      </Text>
                      <Text
                        className="mt-1 text-sm font-semibold text-slate-800"
                        numberOfLines={2}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Status Field */}
              <View className="mb-2 w-full px-2 md:w-1/2 lg:w-1/3">
                <View className="flex-row items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <Settings size={16} color="#94A3B8" className="mt-0.5" />
                  <View className="min-w-0 flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </Text>
                    <View className="mt-1 flex-row">
                      <View
                        className="self-start rounded-md border px-2 py-1"
                        style={{
                          backgroundColor:
                            statusUpper === "APPROVED"
                              ? COLORS.stateSuccessBg
                              : statusUpper === "REJECTED"
                                ? COLORS.stateErrorBg
                                : COLORS.primaryLight,
                          borderColor:
                            statusUpper === "APPROVED"
                              ? COLORS.primaryBorder
                              : statusUpper === "REJECTED"
                                ? COLORS.border
                                : COLORS.primaryBorder,
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{
                            color:
                              statusUpper === "APPROVED"
                                ? COLORS.primaryDark
                                : statusUpper === "REJECTED"
                                  ? COLORS.stateErrorText
                                  : COLORS.primary,
                          }}
                        >
                          {currentStatus || "DRAFT"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Score Summary Cards */}
          <View className="mb-6 flex-row flex-wrap gap-3">
            {[
              {
                label: "Total",
                value: totalQuestions.toString(),
                color: COLORS.text,
                bg: "#FFFFFF",
                border: COLORS.border,
              },
              {
                label: "Compliant (O)",
                value: compliantCount.toString(),
                color: COLORS.primary,
                bg: COLORS.stateSuccessBg,
                border: COLORS.primaryBorder,
              },
              {
                label: "Minor (Mi)",
                value: minorNCCount.toString(),
                color: COLORS.stateWarningText,
                bg: COLORS.stateWarningBg,
                border: COLORS.border,
              },
              {
                label: "Major (Ma)",
                value: majorNCCount.toString(),
                color: COLORS.stateErrorText,
                bg: COLORS.stateErrorBg,
                border: COLORS.border,
              },
              {
                label: "Score",
                value: `${finalPercentage}%`,
                color: COLORS.primaryDark,
                bg: COLORS.primaryLight,
                border: COLORS.primaryBorder,
              },
            ].map((item, idx) => (
              <View key={idx} style={{ flex: 1, minWidth: 120 }}>
                <View
                  className="rounded-2xl border p-4"
                  style={{ backgroundColor: item.bg, borderColor: item.border }}
                >
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </Text>
                  <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Audit Findings Table */}
          <View
            className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="border-b border-slate-100 p-5">
              <View className="flex-row items-center gap-2">
                <ClipboardList size={20} color={COLORS.primary} />
                <Text className="text-base font-bold text-slate-900">
                  Audit Findings
                </Text>
              </View>
            </View>

            {/* Removed horizontal ScrollView and used flex percentages to fit container exactly */}
            <View className="w-full">
              {/* Table Header */}
              <View className="flex-row border-b-2 border-slate-200 bg-slate-50">
                <View className="w-[8%] items-center justify-center px-2 py-3">
                  <Text className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    S.No.
                  </Text>
                </View>
                <View className="w-[27%] justify-start px-3 py-3">
                  <Text className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Check Point
                  </Text>
                </View>
                <View className="w-[25%] justify-start bg-slate-100/50 px-3 py-3">
                  <Text className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Consideration
                  </Text>
                </View>
                <View className="w-[28%] justify-start px-3 py-3">
                  <Text className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Observations
                  </Text>
                </View>
                <View className="w-[12%] items-center justify-center px-2 py-3">
                  <Text className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Status
                  </Text>
                </View>
              </View>

              {/* Table Body */}
              {questions.length > 0 ? (
                questions.map((q: any, idx: number) => {
                  const questionKey = q.slNo || idx + 1;
                  const response =
                    responses[questionKey] || responses[String(questionKey)];
                  const observation =
                    observations[questionKey] ||
                    observations[String(questionKey)];

                  const formattedConsideration =
                    formatConsiderationAsNumberedList(q.consideration);

                  let complianceBadgeClass =
                    "bg-slate-50 text-slate-700 border-slate-200";
                  let complianceText = response || "Pending";

                  if (response === "MAJOR_NC") {
                    complianceBadgeClass =
                      "bg-rose-50 text-rose-700 border-rose-200";
                    complianceText = "MAJOR NC";
                  } else if (response === "MINOR_NC") {
                    complianceBadgeClass =
                      "bg-amber-50 text-amber-700 border-amber-200";
                    complianceText = "MINOR NC";
                  } else if (response === "COMPLIANT") {
                    complianceBadgeClass =
                      "bg-emerald-50 text-emerald-700 border-emerald-200";
                    complianceText = "Compliant";
                  }

                  return (
                    <View
                      key={idx}
                      className="flex-row border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <View className="w-[8%] flex-shrink-0 items-center justify-start px-2 py-4">
                        <Text className="text-center text-xs font-medium text-slate-600">
                          {questionKey}
                        </Text>
                      </View>
                      <View className="w-[27%] flex-shrink-0 justify-start px-3 py-4">
                        <Text
                          className="text-xs leading-5 text-slate-800"
                          numberOfLines={5}
                        >
                          {q.checkpoint}
                        </Text>
                      </View>
                      <View className="w-[25%] flex-shrink-0 justify-start bg-slate-50/50 px-3 py-4">
                        <Text
                          className="text-xs leading-5 text-slate-600"
                          numberOfLines={5}
                        >
                          {formattedConsideration}
                        </Text>
                      </View>
                      <View className="w-[28%] flex-shrink-0 justify-start px-3 py-4">
                        <Text
                          className="text-xs leading-5 text-slate-600"
                          numberOfLines={5}
                        >
                          {observation || "-"}
                        </Text>
                      </View>
                      <View className="w-[12%] flex-shrink-0 items-center justify-start px-2 py-3">
                        <View
                          className={`rounded-md border px-2 py-1.5 ${complianceBadgeClass}`}
                        >
                          <Text className="text-center text-[10px] font-bold uppercase tracking-wider">
                            {complianceText}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center justify-center py-12">
                  <ClipboardList size={32} color="#94A3B8" />
                  <Text className="mt-3 text-sm text-slate-500">
                    No questions loaded from the database
                  </Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    Please ensure check sheet ID {MANUFACTURING_CHECK_SHEET_ID}{" "}
                    exists
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Signature Section */}
          <View
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="border-b border-slate-100 p-5">
              <View className="flex-row items-center gap-2">
                <Award size={18} color={COLORS.primary} />
                <Text className="text-base font-bold text-slate-900">
                  Signatures & Comments
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap p-4">
              {/* Auditor Signature */}
              <View className="mb-4 w-full px-2 md:w-1/2">
                <View className="h-full rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Auditor Signature
                  </Text>
                  <View className="mt-4">
                    {loadingSignatures ? (
                      <View className="items-center justify-center py-6">
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                      </View>
                    ) : auditorSignatureUrl ? (
                      <Image
                        source={{ uri: auditorSignatureUrl }}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                        style={{ height: 96, width: "100%" }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View className="flex-row items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-4">
                        <AlertTriangle size={16} color="#94A3B8" />
                        <Text className="text-sm font-medium text-slate-400">
                          No signature uploaded
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-4 text-sm font-semibold text-slate-800">
                    Name: {auditorName}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Date:{" "}
                    {auditorSignedAt
                      ? formatDateTime(auditorSignedAt)
                      : answers.date || formatDate(audit.auditDate) || "-"}
                  </Text>
                  {answers.auditorComment && (
                    <View className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                      <Text className="text-xs leading-5 text-slate-600">
                        <Text className="font-bold text-slate-800">
                          Comment:{" "}
                        </Text>
                        {answers.auditorComment}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Auditee Signature */}
              <View className="mb-4 w-full px-2 md:w-1/2">
                <View className="h-full rounded-xl border border-slate-200 bg-slate-50 p-5">
                  {showAuditeeActions ? (
                    <>
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Your Electronic Signature
                      </Text>
                      <View className="mt-4">
                        {!auditeeSignatureUrl && !auditeeSignature ? (
                          <View>
                            <View className="mb-2 flex-row items-center gap-2">
                              <AlertTriangle size={16} color="#94A3B8" />
                              <Text className="text-sm font-medium text-slate-400">
                                No signature uploaded in profile
                              </Text>
                            </View>
                            <TextInput
                              value={auditeeSignature}
                              onChangeText={setAuditeeSignature}
                              placeholder="Type your full name as signature"
                              placeholderTextColor="#94A3B8"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                            />
                          </View>
                        ) : (
                          <View>
                            {auditeeSignatureUrl && (
                              <Image
                                source={{ uri: auditeeSignatureUrl }}
                                className="rounded-lg border border-slate-200 bg-white p-3"
                                style={{ height: 96, width: "100%" }}
                                resizeMode="contain"
                              />
                            )}
                            <Text className="mt-2 text-xs font-medium text-blue-600">
                              ✓ Signature loaded from your profile
                            </Text>
                            <Text className="mt-1 text-xs text-slate-500">
                              Name: {auditeeName}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Comments / Remarks
                      </Text>
                      <TextInput
                        value={auditeeComment}
                        onChangeText={setAuditeeComment}
                        placeholder="Enter your comments (required for rejection)"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                        className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                        style={{ textAlignVertical: "top" }}
                      />

                      <View className="mt-4 flex-row gap-3">
                        <TouchableOpacity
                          onPress={handleApprove}
                          disabled={
                            submitting ||
                            (!auditeeSignatureUrl && !auditeeSignature.trim())
                          }
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3"
                          activeOpacity={0.8}
                          style={{
                            opacity:
                              submitting ||
                              (!auditeeSignatureUrl && !auditeeSignature.trim())
                                ? 0.5
                                : 1,
                          }}
                        >
                          <ThumbsUp size={16} color="#ffffff" />
                          <Text className="text-sm font-semibold text-white">
                            {submitting ? "Processing..." : "Approve & Sign"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleReject}
                          disabled={submitting}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
                          activeOpacity={0.8}
                          style={{ opacity: submitting ? 0.5 : 1 }}
                        >
                          <ThumbsDown size={16} color={COLORS.stateErrorText} />
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: COLORS.stateErrorText }}
                          >
                            Reject
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Auditee Signature
                      </Text>
                      <View className="mt-4">
                        {isApproved || isRejected ? (
                          auditeeSignatureUrl ? (
                            <Image
                              source={{ uri: auditeeSignatureUrl }}
                              className="rounded-lg border border-slate-200 bg-white p-3"
                              style={{ height: 96, width: "100%" }}
                              resizeMode="contain"
                            />
                          ) : auditeeSignature ? (
                            <View className="rounded-lg border border-slate-200 bg-white p-4">
                              <Text className="text-sm font-semibold text-slate-800">
                                {auditeeSignature}
                              </Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-4">
                              <AlertTriangle size={16} color="#94A3B8" />
                              <Text className="text-sm font-medium text-slate-400">
                                No signature available
                              </Text>
                            </View>
                          )
                        ) : (
                          <View className="items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6">
                            <Clock size={28} color="#94A3B8" className="mb-2" />
                            <Text className="text-sm font-bold text-slate-700">
                              Waiting for Approval
                            </Text>
                            <Text className="mt-1 text-center text-xs text-slate-500">
                              Signature will appear after auditee approval
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="mt-4 text-sm font-semibold text-slate-800">
                        Name: {auditeeName}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        Date:{" "}
                        {auditeeSignedAt
                          ? formatDateTime(auditeeSignedAt)
                          : isApproved || isRejected
                            ? formatDateTime(audit.updatedAt)
                            : "-"}
                      </Text>

                      {(answers.auditeeComment || auditeeComment) &&
                        (isApproved || isRejected) && (
                          <View className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                            <Text className="text-xs leading-5 text-slate-600">
                              <Text className="font-bold text-slate-800">
                                Comment:{" "}
                              </Text>
                              {answers.auditeeComment || auditeeComment}
                            </Text>
                          </View>
                        )}

                      <View className="mt-4">
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </Text>
                        <View className="mt-2">
                          {isApproved ? (
                            <View
                              className="flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5"
                              style={{
                                backgroundColor: COLORS.stateSuccessBg,
                                borderColor: COLORS.primaryBorder,
                              }}
                            >
                              <CheckCircle size={12} color={COLORS.primary} />
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: COLORS.primary }}
                              >
                                Approved
                              </Text>
                            </View>
                          ) : isRejected ? (
                            <View
                              className="flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5"
                              style={{
                                backgroundColor: COLORS.stateErrorBg,
                                borderColor: COLORS.border,
                              }}
                            >
                              <XCircle
                                size={12}
                                color={COLORS.stateErrorText}
                              />
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: COLORS.stateErrorText }}
                              >
                                Rejected
                              </Text>
                            </View>
                          ) : (
                            <View
                              className="flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5"
                              style={{
                                backgroundColor: COLORS.stateWarningBg,
                                borderColor: COLORS.border,
                              }}
                            >
                              <AlertCircle
                                size={12}
                                color={COLORS.stateWarningText}
                              />
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: COLORS.stateWarningText }}
                              >
                                Pending Approval
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-8 items-center pb-6">
            <Text className="text-center text-xs text-slate-400">
              Manufacturing Process Audit Report | Generated on{" "}
              {formatDate(new Date().toISOString())}
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              This is an electronic document and does not require a physical
              signature
            </Text>
          </View>

          <PDFViewer
            visible={pdfViewer.visible}
            pdfData={pdfViewer.pdfData}
            fileName={pdfViewer.fileName}
            auditId={String(audit?.id || "")}
            auditNumber={`Mfg-${audit?.id || ""}`}
            pdfType="manufacturing"
            forumGroups={[
              {
                id: `AUDIT-${audit?.auditScheduleId || audit?.scheduleId || ""}`,
                name: `📋 Manufacturing Audit ${audit?.auditScheduleId || audit?.scheduleId || ""}`,
                type: "Audit",
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
              addToast("PDF shared to forum successfully!", "success");
              setPDFViewer({ visible: false, pdfData: "", fileName: "" });
            }}
            currentUser={user}
            allUsers={allUsers}
          />
        </View>
      </ScrollView>
    </View>
  );
}
