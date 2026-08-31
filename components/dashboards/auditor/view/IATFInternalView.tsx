import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import { auditScheduleApi } from "@/services/auditScheduleApi";
// ✅ Added /legacy to fix the downloadAsync deprecation error
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
  Layers,
  MapPin,
  ThumbsDown,
  ThumbsUp,
  User,
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
import { useAuth } from "../../../context/AuthContext"; // Adjust path if needed
import { useToast } from "../../../context/ToastContext"; // Adjust path if needed

// ============================================================================
// MNC PROFESSIONAL COLOR PALETTE
// ============================================================================
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
// HELPER FUNCTIONS
// ============================================================================

// ✅ FIX 1: Added ': any' to questionsData to resolve implicit any error
const safeParseQuestions = (questionsData: any) => {
  if (!questionsData) return [];
  if (typeof questionsData === "object" && questionsData !== null) {
    return Array.isArray(questionsData) ? questionsData : [];
  }
  if (typeof questionsData === "string") {
    let cleanJson = questionsData;
    if (cleanJson.charCodeAt(0) === 0xfeff) cleanJson = cleanJson.substring(1);
    cleanJson = cleanJson.replace(/\\n/g, "\\\\n");
    cleanJson = cleanJson.replace(/&/g, "&amp;");
    cleanJson = cleanJson.replace(
      /:\s*"([^"]*?)"/g,
      function (match: string, content: string) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `: "${escapedContent}"`;
      },
    );
    cleanJson = cleanJson.replace(/,(\s*[}\]])/g, "$1");
    cleanJson = cleanJson.replace(
      /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );
    try {
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON parse error:", e);
      return [];
    }
  }
  return [];
};

// ✅ FIX 2: Added explicit types (string, number) to resolve implicit any errors
const formatWhatToLookForAsNumberedList = (text: string) => {
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

// ✅ FIX 3: Added ': string' to status to resolve implicit any error
const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 border border-slate-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
    SUBMITTED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border border-rose-200",
    CLOSED: "bg-slate-50 text-slate-700 border border-slate-200",
  };
  return (
    badges[status] || "bg-slate-100 text-slate-700 border border-slate-200"
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function IATFInternalView({
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
  const [processName, setProcessName] = useState("");

  const [auditeeSignature, setAuditeeSignature] = useState("");
  const [auditeeComment, setAuditeeComment] = useState("");
  const [auditorComment, setAuditorComment] = useState("");
  const [auditorSignedAt, setAuditorSignedAt] = useState<string | null>(null);
  const [auditeeSignedAt, setAuditeeSignedAt] = useState<string | null>(null);

  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState<string | null>(
    null,
  );
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState<string | null>(
    null,
  );
  const [loadingSignatures, setLoadingSignatures] = useState(false);

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
      const auditData = response.data; // ✅ Directly access .data

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

      if (parsedAnswers.auditeeSignature) {
        setAuditeeSignature(parsedAnswers.auditeeSignature);
        const sigImage = getSignatureFromBase64(parsedAnswers.auditeeSignature);
        if (sigImage) setAuditeeSignatureUrl(sigImage);
      }
      if (parsedAnswers.auditeeComment)
        setAuditeeComment(parsedAnswers.auditeeComment);
      if (parsedAnswers.auditeeSignedAt)
        setAuditeeSignedAt(parsedAnswers.auditeeSignedAt);
      if (parsedAnswers.auditorComment)
        setAuditorComment(parsedAnswers.auditorComment);
      if (parsedAnswers.auditorSignedAt)
        setAuditorSignedAt(parsedAnswers.auditorSignedAt);

      const deptName =
        parsedAnswers.departmentName || auditData.department || "";
      const procName =
        parsedAnswers.processName || auditData.checkSheet?.processName || "";
      setDepartmentName(deptName);
      setProcessName(procName);

      
      let auditor = "";
      if (auditData.auditorId) {
        try {
          // ✅ Explicitly convert the number to a string
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
      const isAuditeeUser =
        currentUserRole === "auditee" || auditData.auditeeId === user?.id;

      if (isAuditeeUser) {
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
      } else if (isAuditorUser) {
        setAuditeeSignatureUrl(null);
      }
      setLoadingSignatures(false);

      const checkSheetId = auditData.checkSheet?.id;
      if (checkSheetId) {
        try {
          const sheetRes = await fetch(`${API_BASE_URL}/api/templates/${checkSheetId}`);
          const sheet = await sheetRes.json();
          if (sheet.questions) {
            let parsedQuestions = safeParseQuestions(sheet.questions);
            const formattedQuestions = parsedQuestions.map(
              (q: any, idx: number) => ({
                slNo: q.sNo || q.slNo || idx + 1,
                clause: q.clauseNo || q.clause || "",
                checkpoint: q.displayLabel || q.checkpoint,
                whatToLookFor:
                  q.documentsVerified ||
                  q.whatToLookFor ||
                  q.consideration ||
                  "No documents specified",
                fieldKey: q.fieldKey,
                fieldType: q.fieldType,
              }),
            );
            setQuestions(formattedQuestions);
          }
        } catch (error) {
          await fetchQuestionsByDepartment(deptName, procName);
        }
      } else if (deptName) {
        await fetchQuestionsByDepartment(deptName, procName);
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

  const fetchQuestionsByDepartment = async (
    department: string,
    process: string,
  ) => {
    if (!department) return;
    try {
      const checkSheetRes = await fetch(
        `${API_BASE_URL}/api/templates/iatf/by-department/${encodeURIComponent(department)}`,
      );
      const sheets = await checkSheetRes.json();
      if (sheets && sheets.length > 0) {
        let selectedSheet = sheets[0];
        if (process) {
          const matchingSheet = sheets.find(
            (s: any) => s.processName === process,
          );
          if (matchingSheet) selectedSheet = matchingSheet;
        }
        const sheetDetailsRes = await fetch(
          `${API_BASE_URL}/api/templates/${selectedSheet.id}`,
        );
        const sheet = await sheetDetailsRes.json();
        if (sheet.questions) {
          let parsedQuestions = safeParseQuestions(sheet.questions);
          const formattedQuestions = parsedQuestions.map(
            (q: any, idx: number) => ({
              slNo: q.sNo || q.slNo || idx + 1,
              clause: q.clauseNo || q.clause || "",
              checkpoint: q.displayLabel || q.checkpoint,
              whatToLookFor:
                q.documentsVerified ||
                q.whatToLookFor ||
                q.consideration ||
                "No documents specified",
              fieldKey: q.fieldKey,
              fieldType: q.fieldType,
            }),
          );
          setQuestions(formattedQuestions);
        }
      }
    } catch (error) {
      console.error("Error fetching by department:", error);
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

      // ✅ FIX 1: Use the correct IATF endpoint (not fives-audits)
      const endpoint = `${API_BASE_URL}/api/iatf-audits/${responseId}/pdf`;

      if (Platform.OS === "web") {
        // ✅ FIX 2: Use browser-native fetch + blob for Web compatibility
        const response = await fetch(endpoint, {
          headers: { Accept: "application/pdf" },
        });

        if (!response.ok) throw new Error("Failed to fetch PDF");

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", `IATF_Audit_Report_${responseId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        addToast("PDF downloaded successfully", "success");
      } else {
        // ✅ FIX 3: Use expo-file-system ONLY for Native (iOS/Android)
        const fs = FileSystem as any;
        const directory = fs.documentDirectory || fs.cacheDirectory;
        const fileUri = `${directory}IATF_Audit_Report_${responseId}.pdf`;

        const { uri } = await fs.downloadAsync(endpoint, fileUri, {
          headers: { Accept: "application/pdf" },
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          addToast("PDF downloaded to device", "success");
        }
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      addToast(`Failed to download PDF: ${error.message}`, "error");
    } finally {
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
          credentials: "include",
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
          credentials: "include",
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
  const responses = answers.responses || {};
  const observations = answers.observations || {};
  const totalQuestions = questions.length;

  let compliantCount = 0;
  let minorNCCount = 0;
  let majorNCCount = 0;

  questions.forEach((q, idx) => {
    const questionKey = String(idx + 1);
    const response =
      responses[questionKey] || responses[idx + 1] || responses[q.fieldKey];
    if (response === "COMPLIANT") compliantCount++;
    else if (response === "MINOR_NC") minorNCCount++;
    else if (response === "MAJOR_NC") majorNCCount++;
  });

  const percentage = answers.score || 0;
  const finalPercentage =
    percentage > 0
      ? percentage
      : totalQuestions > 0
        ? Math.round((compliantCount / totalQuestions) * 100)
        : 0;

  const currentStatus = audit?.status || "SUBMITTED";
  const statusUpper = currentStatus?.toUpperCase?.() || "";
  const isDraft = statusUpper === "DRAFT";
  const isSubmitted = statusUpper === "SUBMITTED";
  const isApproved = statusUpper === "APPROVED";
  const isRejected = statusUpper === "REJECTED";

  const currentUserRole = user?.role?.toLowerCase?.() || "";
  const isAuditor =
    currentUserRole === "auditor" || audit?.auditorId === user?.id;
  const isAuditee =
    currentUserRole === "auditee" || audit?.auditeeId === user?.id;
  const showAuditeeActions = isAuditee && !isApproved && !isRejected;

  // ============================================================================
  // RENDER STATES
  // ============================================================================
  if (loading) {
    return (
      <View
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <ActivityIndicator
            size="large"
            color={NAVBAR_COLORS.primary}
            className="mb-4"
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading audit report...
          </Text>
        </View>
      </View>
    );
  }

  if (!audit) {
    return (
      <View
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="p-8 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <AlertCircle size={48} color="#f43f5e" className="mx-auto mb-4" />
          <Text className="text-lg font-bold text-slate-800">
            Audit not found
          </Text>
          <TouchableOpacity
            onPress={() => (onClose ? onClose() : router.back())}
            className="px-5 py-2.5 mt-4 rounded-xl shadow-md"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <Text className="text-sm font-medium text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: NAVBAR_COLORS.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View
        className="p-4"
        style={{ maxWidth: 1200, alignSelf: "center", width: "100%" }}
      >
        {/* Header with Action Buttons */}
        <View className="flex-row flex-wrap items-center justify-between gap-3 mb-6">
          <View className="flex-row items-center flex-1 gap-2">
            <TouchableOpacity
              onPress={() => (onClose ? onClose() : router.back())}
              className="flex-row items-center flex-shrink-0 gap-2 px-3 py-2 bg-white border shadow-sm border-slate-200 rounded-xl"
            >
              <ArrowLeft size={18} color="#334155" />
              <Text className="text-sm font-medium text-slate-700">Back</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text
                className="text-lg font-bold text-slate-800"
                numberOfLines={1}
              >
                IATF Internal Audit Report
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                View audit details and findings
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDownloadPDF}
            disabled={downloading}
            className="flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl shadow-md disabled:opacity-50 flex-shrink-0"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Download size={16} color="#ffffff" />
            )}
            <Text className="text-sm font-medium text-white">
              {downloading ? "Generating..." : "Download PDF"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Approval Status Banners */}
        {isApproved && (
          <View className="p-4 mb-6 text-center border rounded-xl bg-emerald-50 border-emerald-200">
            <View className="flex-row items-center justify-center gap-2">
              <CheckCircle size={20} color="#047857" />
              <Text className="text-lg font-bold text-emerald-800">
                ✓ Audit Approved by Auditee
              </Text>
            </View>
            {answers.auditeeComment && (
              <View className="mt-2">
                <Text className="text-sm text-emerald-700">
                  <Text className="font-semibold">Comment: </Text>
                  {answers.auditeeComment}
                </Text>
              </View>
            )}
          </View>
        )}

        {isRejected && (
          <View className="p-4 mb-6 text-center border rounded-xl bg-rose-50 border-rose-200">
            <View className="flex-row items-center justify-center gap-2">
              <XCircle size={20} color="#be123c" />
              <Text className="text-lg font-bold text-rose-800">
                ✗ Audit Rejected - Corrections Required
              </Text>
            </View>
            {answers.auditeeComment && (
              <View className="mt-2">
                <Text className="text-sm text-rose-700">
                  <Text className="font-semibold">Reason: </Text>
                  {answers.auditeeComment}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Main Banner */}
        <View
          className="p-4 mb-6 text-center shadow-md rounded-2xl"
          style={{ backgroundColor: NAVBAR_COLORS.primary }}
        >
          <View className="flex-row items-center justify-center gap-2 mb-1">
            <FileText size={24} color="#ffffff" />
            <Text className="text-xl font-bold text-white">
              IATF 16949 INTERNAL AUDIT CHECK SHEET
            </Text>
          </View>
          <Text className="text-sm text-center text-blue-100">
            IATF 16949:2016 | Process Audit Compliance
          </Text>
          {(departmentName || processName) && (
            <View className="pt-2 mt-3 border-t border-white/20">
              <View className="flex-row flex-wrap items-center justify-center gap-3">
                {departmentName && (
                  <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                    <Building size={12} color="#ffffff" />
                    <Text className="text-sm text-white">
                      Dept: {departmentName}
                    </Text>
                  </View>
                )}
                {processName && (
                  <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/20">
                    <Layers size={12} color="#ffffff" />
                    <Text className="text-sm text-white">
                      Process: {processName}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Audit Information */}
        {/* Audit Information */}
<View className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
  <View className="flex-row items-center gap-2 mb-4">
    <FileText size={18} color={NAVBAR_COLORS.primary} />
    <Text className="text-base font-bold text-slate-800">
      Audit Information
    </Text>
  </View>
  <View className="flex-row flex-wrap -mx-2">
    {[
      {
        icon: FileText,
        label: "Document Number",
        value: answers.documentNumber || `IATF-${audit.id}`,
      },
      {
        icon: Calendar,
        label: "Audit Date",
        value: answers.date || formatDate(audit.auditDate),
      },
      {
        icon: User,
        label: "Auditor",
        value: auditorName || answers.auditorName || "N/A",
      },
      {
        icon: User,
        label: "Auditee",
        value: auditeeName || answers.auditeeName || "N/A",
      },
      {
        icon: MapPin,
        label: "Location",
        value: (answers.location || "-").substring(0, 20), // ✅ Truncate long location names
      },
      {
        icon: Clock,
        label: "Shift",
        value: audit.shift || answers.shift || "-",
      },
      {
        icon: Building,
        label: "Department",
        value: (departmentName || answers.departmentName || "-").substring(0, 20), // ✅ Truncate long department names
      },
      {
        icon: Layers,
        label: "Process",
        value: (processName || answers.processName || "-").substring(0, 20), // ✅ Truncate long process names
      },
    ].map((item, idx) => (
      <View key={idx} className="w-full px-2 mb-4 md:w-1/2 lg:w-1/4">
        <View className="flex-row items-start gap-2 p-3 border rounded-xl bg-slate-50 border-slate-100 min-h-[60px]">
          <item.icon size={16} color="#94a3b8" className="flex-shrink-0 mt-0.5" />
          <View className="flex-1 min-w-0">
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {item.label}
            </Text>
            <Text 
              className="text-sm font-semibold text-slate-800 break-words"
              numberOfLines={2}
            >
              {item.value}
            </Text>
          </View>
        </View>
      </View>
    ))}
    {finalPercentage > 0 && (
      <View className="w-full px-2 mb-4 md:w-1/2 lg:w-1/4">
        <View className="flex-row items-center gap-2 p-3 border rounded-xl bg-slate-50 border-slate-100">
          <Award size={16} color="#94a3b8" />
          <View>
            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Score
            </Text>
            <Text
              className="text-sm font-bold"
              style={{ color: NAVBAR_COLORS.primary }}
            >
              {finalPercentage}%
            </Text>
          </View>
        </View>
      </View>
    )}
  </View>
</View>

        {/* Score Summary Cards */}
        <View className="flex-row flex-wrap mb-6 -mx-2">
          {[
            {
              label: "Total",
              value: totalQuestions.toString(),
              color: "text-slate-800",
            },
            {
              label: "O (Compliant)",
              value: compliantCount.toString(),
              color: "text-emerald-600",
            },
            {
              label: "Mi (Minor)",
              value: minorNCCount.toString(),
              color: "text-amber-600",
            },
            {
              label: "Ma (Major)",
              value: majorNCCount.toString(),
              color: "text-rose-600",
            },
            {
              label: "Score",
              value: `${finalPercentage}%`,
              color: "text-[#00529B]",
            },
          ].map((item, idx) => (
            <View key={idx} className="w-1/2 px-2 mb-4 md:w-1/5">
              <View className="p-4 text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
                <Text className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </Text>
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                  {item.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Audit Findings Table - MOBILE OPTIMIZED */}
        <View className="p-4 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <View className="flex-row items-center gap-2 mb-4">
            <ClipboardList size={20} color={NAVBAR_COLORS.primary} />
            <Text className="text-base font-bold text-slate-800">
              Audit Findings
            </Text>
          </View>

          {/* ✅ HORIZONTAL SCROLL WRAPPER FOR MOBILE */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* ✅ Increased minWidth to 1060 to perfectly fit the optimized column proportions */}
            <View style={{ minWidth: 1060, width: "100%" }}>
              {/* ✅ TABLE HEADER (Optimized Widths + flex-shrink-0) */}
              <View className="flex-row border-b-2 bg-slate-50 border-slate-200">
                <View className="items-center justify-center flex-shrink-0 w-12 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    S.No.
                  </Text>
                </View>
                <View className="items-center justify-center flex-shrink-0 w-16 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    Clause
                  </Text>
                </View>
                {/* ✅ Increased from w-48 to w-56 for better text wrapping */}
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    Check Point
                  </Text>
                </View>
                {/* ✅ Increased from w-56 to w-64 for maximum readability */}
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3 bg-slate-100/50">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    What to look for
                  </Text>
                </View>
                {/* ✅ Increased from w-48 to w-56 for better text wrapping */}
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    Observation
                  </Text>
                </View>
                <View className="items-center justify-center flex-shrink-0 w-12 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    Ma
                  </Text>
                </View>
                <View className="items-center justify-center flex-shrink-0 w-12 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    Mi
                  </Text>
                </View>
                <View className="items-center justify-center flex-shrink-0 w-12 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    O
                  </Text>
                </View>
                {/* ✅ Decreased from w-28 to w-24 (96px is perfect for "MAJOR NC") */}
                <View className="items-center justify-center flex-shrink-0 w-20 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    Compliance
                  </Text>
                </View>
              </View>

              {/* ✅ TABLE BODY */}
              {questions.length > 0 ? (
                questions.map((q: any, idx: number) => {
                  const questionKey = String(idx + 1);
                  let response =
                    responses[questionKey] ||
                    responses[idx + 1] ||
                    responses[q.fieldKey];

                  const observation =
                    observations[questionKey] || observations[idx + 1] || "";
                  const formattedWhatToLookFor =
                    formatWhatToLookForAsNumberedList(q.whatToLookFor);

                  let ma = "",
                    mi = "",
                    o = "",
                    complianceText = "";
                  let complianceBadgeClass =
                    "bg-slate-50 text-slate-700 border border-slate-200";

                  if (response === "MAJOR_NC") {
                    ma = "✓";
                    complianceText = "MAJOR NC";
                    complianceBadgeClass =
                      "bg-rose-50 text-rose-700 border border-rose-200";
                  } else if (response === "MINOR_NC") {
                    mi = "✓";
                    complianceText = "MINOR NC";
                    complianceBadgeClass =
                      "bg-amber-50 text-amber-700 border border-amber-200";
                  } else if (response === "COMPLIANT") {
                    o = "✓";
                    complianceText = "Compliant";
                    complianceBadgeClass =
                      "bg-emerald-50 text-emerald-700 border border-emerald-200";
                  } else {
                    complianceText = response || "Pending";
                  }

                  return (
                    <View
                      key={q.slNo || idx}
                      className="flex-row border-b border-slate-100"
                    >
                      <View className="items-center justify-start flex-shrink-0 w-12 px-2 py-3">
                        <Text className="text-xs font-medium text-center text-slate-600">
                          {q.slNo || idx + 1}
                        </Text>
                      </View>
                      <View className="items-center justify-start flex-shrink-0 w-16 px-2 py-3">
                        <Text className="text-xs text-center text-slate-600">
                          {q.clause || "-"}
                        </Text>
                      </View>
                      <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                        <Text
                          className="text-xs text-slate-800"
                          numberOfLines={4}
                        >
                          {q.checkpoint}
                        </Text>
                      </View>
                      <View className="justify-start flex-shrink-0 w-64 px-2 py-3 bg-slate-50/50">
                        <Text
                          className="text-xs text-slate-600"
                          numberOfLines={4}
                        >
                          {formattedWhatToLookFor}
                        </Text>
                      </View>
                      <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                        <Text
                          className="text-xs text-slate-600"
                          numberOfLines={4}
                        >
                          {observation || "-"}
                        </Text>
                      </View>
                      <View className="items-center justify-start flex-shrink-0 w-12 px-2 py-3">
                        <Text className="text-xs font-bold text-center text-rose-600">
                          {ma}
                        </Text>
                      </View>
                      <View className="items-center justify-start flex-shrink-0 w-12 px-2 py-3">
                        <Text className="text-xs font-bold text-center text-amber-600">
                          {mi}
                        </Text>
                      </View>
                      <View className="items-center justify-start flex-shrink-0 w-12 px-2 py-3">
                        <Text className="text-xs font-bold text-center text-emerald-600">
                          {o}
                        </Text>
                      </View>
                      <View className="items-center justify-start flex-shrink-0 w-20 px-2 py-3">
                        <View
                          className={`px-2 py-1.5 rounded-md border ${complianceBadgeClass}`}
                        >
                          <Text className="text-[10px] font-semibold text-center">
                            {complianceText}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center justify-center py-8">
                  <Text className="text-sm text-slate-500">
                    No IATF questions loaded for this audit
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Signature Section */}
        <View className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Award size={18} color={NAVBAR_COLORS.primary} />
            <Text className="text-base font-bold text-slate-800">
              Signatures & Comments
            </Text>
          </View>
          <View className="flex-row flex-wrap -mx-2">
            {/* AUDITOR SIGNATURE SECTION */}
            <View className="w-full px-2 mb-4 md:w-1/2">
              <View className="p-5 border rounded-xl bg-slate-50 border-slate-200">
                <Text className="text-xs font-bold tracking-wider uppercase text-slate-500">
                  Auditor Signature
                </Text>
                <View className="mt-3">
                  {loadingSignatures ? (
                    <View className="items-center justify-center p-4">
                      <ActivityIndicator
                        size="small"
                        color={NAVBAR_COLORS.primary}
                      />
                    </View>
                  ) : auditorSignatureUrl ? (
                    <Image
                      source={{ uri: auditorSignatureUrl }}
                      className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200"
                      style={{ height: 96, width: "100%" }}
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <AlertTriangle size={16} color="#94a3b8" />
                      <Text className="text-sm font-medium text-slate-400">
                        No signature uploaded
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="mt-3 text-sm font-semibold text-slate-700">
                  Name: {auditorName}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  Date:{" "}
                  {auditorSignedAt
                    ? formatDateTime(auditorSignedAt)
                    : answers.date || formatDate(audit.auditDate) || "-"}
                </Text>
                {auditorComment && (
                  <View className="p-3 mt-3 bg-white border rounded-lg border-slate-200">
                    <Text className="text-xs text-slate-600">
                      <Text className="font-bold">Comment:</Text>{" "}
                      {auditorComment}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* AUDITEE SIGNATURE SECTION */}
            <View className="w-full px-2 mb-4 md:w-1/2">
              <View className="p-5 border rounded-xl bg-slate-50 border-slate-200">
                {showAuditeeActions ? (
                  <>
                    <Text className="text-xs font-bold tracking-wider uppercase text-slate-500">
                      Your Electronic Signature
                    </Text>
                    <View className="mt-3">
                      {!auditeeSignatureUrl && !auditeeSignature ? (
                        <View>
                          <View className="flex-row items-center gap-2 mb-2">
                            <AlertTriangle size={16} color="#94a3b8" />
                            <Text className="text-sm font-medium text-slate-400">
                              No signature uploaded in profile
                            </Text>
                          </View>
                          <TextInput
                            value={auditeeSignature}
                            onChangeText={setAuditeeSignature}
                            placeholder="Type your full name as signature (fallback)"
                            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl"
                          />
                        </View>
                      ) : (
                        <View>
                          {auditeeSignatureUrl && (
                            <Image
                              source={{ uri: auditeeSignatureUrl }}
                              className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200"
                              style={{ height: 96, width: "100%" }}
                              resizeMode="contain"
                            />
                          )}
                          <Text className="mt-2 text-xs font-medium text-emerald-600">
                            ✓ Signature loaded from your profile
                          </Text>
                          <Text className="mt-1 text-xs text-slate-500">
                            Name: {auditeeName}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text className="mt-4 text-xs font-bold tracking-wider uppercase text-slate-500">
                      Comments / Remarks
                    </Text>
                    <TextInput
                      value={auditeeComment}
                      onChangeText={setAuditeeComment}
                      placeholder="Enter your comments (required for rejection)"
                      multiline
                      numberOfLines={3}
                      className="w-full px-4 py-3 mt-2 text-sm bg-white border border-slate-200 rounded-xl"
                      style={{ textAlignVertical: "top" }}
                    />

                    <View className="flex-row gap-3 mt-4">
                      <TouchableOpacity
                        onPress={handleApprove}
                        disabled={
                          submitting ||
                          (!auditeeSignatureUrl && !auditeeSignature.trim())
                        }
                        className="flex-1 flex-row items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 rounded-xl disabled:opacity-50 shadow-md"
                      >
                        <ThumbsUp size={16} color="#ffffff" />
                        <Text className="text-sm font-medium text-white">
                          {submitting ? "Processing..." : "Approve & Sign"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleReject}
                        disabled={submitting}
                        className="flex-1 flex-row items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 rounded-xl disabled:opacity-50 shadow-md"
                      >
                        <ThumbsDown size={16} color="#ffffff" />
                        <Text className="text-sm font-medium text-white">
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-xs font-bold tracking-wider uppercase text-slate-500">
                      Auditee Signature
                    </Text>
                    <View className="mt-3">
                      {isApproved || isRejected ? (
                        auditeeSignatureUrl ? (
                          <Image
                            source={{ uri: auditeeSignatureUrl }}
                            className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200"
                            style={{ height: 96, width: "100%" }}
                            resizeMode="contain"
                          />
                        ) : auditeeSignature ? (
                          <View className="p-3 bg-white border rounded-lg shadow-sm border-slate-200">
                            <Text className="text-sm font-semibold text-slate-800">
                              {auditeeSignature}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-2">
                            <AlertTriangle size={16} color="#94a3b8" />
                            <Text className="text-sm font-medium text-slate-400">
                              No signature available
                            </Text>
                          </View>
                        )
                      ) : (
                        <View className="items-center justify-center p-6 border-2 border-dashed rounded-xl bg-amber-50 border-amber-200">
                          <Clock size={32} color="#f59e0b" className="mb-2" />
                          <Text className="text-sm font-bold text-amber-700">
                            Waiting for Approval
                          </Text>
                          <Text className="text-xs text-amber-600 mt-0.5 text-center">
                            Signature will appear after auditee approval
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-3 text-sm font-semibold text-slate-700">
                      Name: {auditeeName}
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Date:{" "}
                      {auditeeSignedAt
                        ? formatDateTime(auditeeSignedAt)
                        : isApproved || isRejected
                          ? formatDateTime(audit.updatedAt)
                          : "-"}
                    </Text>

                    {(answers.auditeeComment || auditeeComment) &&
                      (isApproved || isRejected) && (
                        <View className="p-3 mt-3 bg-white border rounded-lg border-slate-200">
                          <Text className="text-xs text-slate-600">
                            <Text className="font-bold">Comment:</Text>{" "}
                            {answers.auditeeComment || auditeeComment}
                          </Text>
                        </View>
                      )}

                    <View className="mt-4">
                      <Text className="text-xs font-bold tracking-wider uppercase text-slate-500">
                        Status
                      </Text>
                      <View className="mt-2">
                        {isApproved ? (
                          <View className="flex-row items-center gap-1.5 px-3 py-1.5 self-start bg-emerald-50 border border-emerald-200 rounded-lg">
                            <CheckCircle size={12} color="#047857" />
                            <Text className="text-xs font-semibold text-emerald-700">
                              Approved
                            </Text>
                          </View>
                        ) : isRejected ? (
                          <View className="flex-row items-center gap-1.5 px-3 py-1.5 self-start bg-rose-50 border border-rose-200 rounded-lg">
                            <XCircle size={12} color="#be123c" />
                            <Text className="text-xs font-semibold text-rose-700">
                              Rejected
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1.5 px-3 py-1.5 self-start bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle size={12} color="#b45309" />
                            <Text className="text-xs font-semibold text-amber-700">
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
        <View className="items-center pb-6 mt-8">
          <Text className="text-xs text-center text-slate-400">
            IATF 16949 Internal Audit Report | Generated on{" "}
            {formatDate(new Date().toISOString())}
          </Text>
          <Text className="mt-1 text-xs text-center text-slate-400">
            This is an electronic document and does not require a physical
            signature
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
