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
  BookOpen,
  Calendar,
  CheckCircle,
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
import { useAuth } from "../../../context/AuthContext"; // Adjust path if needed
import { useToast } from "../../../context/ToastContext"; // Adjust path if needed

// MANUFACTURING PROCESS CHECK SHEET ID = 1
const MANUFACTURING_CHECK_SHEET_ID = 1;

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
    badges[status?.toUpperCase()] ||
    "bg-slate-100 text-slate-700 border border-slate-200"
  );
};

const getStatusClass = (status: string) => {
  if (status === "COMPLIANT")
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "MINOR_NC")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  if (status === "MAJOR_NC")
    return "bg-rose-50 text-rose-700 border border-rose-200";
  return "bg-slate-50 text-slate-700 border border-slate-200";
};

const getStatusText = (status: string) => {
  if (status === "COMPLIANT") return "Compliant";
  if (status === "MINOR_NC") return "Minor";
  if (status === "MAJOR_NC") return "Major";
  return status || "Not Rated";
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
          const sheetRes = await fetch(`${API_BASE_URL}/api/templates/${checkSheetId}`);
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

  const currentStatus = audit?.status || "SUBMITTED";
  const statusUpper = currentStatus?.toUpperCase?.() || "";
  const isSubmitted = statusUpper === "SUBMITTED";
  const isApproved = statusUpper === "APPROVED";
  const isRejected = statusUpper === "REJECTED";

  const currentUserRole = user?.role?.toLowerCase?.() || "";
  const isAuditor =
    currentUserRole === "auditor" || audit?.auditorId === user?.id;
  const isAuditee =
    currentUserRole === "auditee" ||
    audit?.auditeeId === user?.id ||
    (audit?.auditeeName && audit?.auditeeName === user?.name);
  const showAuditeeActions = isAuditee && isSubmitted;

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
          <XCircle size={48} color="#f43f5e" className="mx-auto mb-4" />
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
        {/* Header */}
        <View className="flex-row flex-wrap items-center justify-between gap-3 mb-6">
          <View className="flex-row items-center flex-1 gap-3">
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
                Manufacturing Process Audit
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

        {/* Banners */}
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
              MANUFACTURING PROCESS AUDIT CHECK SHEET
            </Text>
          </View>
          <Text className="text-sm text-center text-blue-100">
            IATF 16949:2016 | Process Audit Compliance
          </Text>
        </View>

        {/* Document Control Information */}
        <View className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Hash size={18} color={NAVBAR_COLORS.primary} />
            <Text className="text-base font-bold text-slate-800">
              Document Control Information
            </Text>
          </View>
          <View className="flex-row flex-wrap -mx-2">
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
              { icon: Hash, label: "Rev No.", value: answers.revNo || "00" },
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
                className="w-full px-2 mb-4 md:w-1/2 lg:w-1/3 xl:w-1/5"
              >
                <View className="flex-row items-center gap-2 p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <item.icon size={16} color="#94a3b8" />
                  <View>
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {item.label}
                    </Text>
                    <Text className="text-sm font-semibold text-slate-800">
                      {item.value}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Audit Information */}
        {/* Audit Information */}
<View className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
  <View className="flex-row items-center gap-2 mb-4">
    <Settings size={18} color={NAVBAR_COLORS.primary} />
    <Text className="text-base font-bold text-slate-800">
      Audit Information
    </Text>
  </View>
  <View className="flex-row flex-wrap -mx-2">
    {[
      {
        icon: Settings,
        label: "Department Name",
        value: (departmentName || answers.department || "-").substring(0, 25),
      },
      {
        icon: Package,
        label: "Part Name & Number",
        value: (answers.partNumber || "-").substring(0, 25),
      },
      {
        icon: Wrench, 
        label: "Machine", 
        value: (answers.machine || "-").substring(0, 25) 
      },
      {
        icon: User,
        label: "Auditor Name",
        value: (auditorName || answers.auditorName || "N/A").substring(0, 25),
      },
      {
        icon: User,
        label: "Auditee Name",
        value: (auditeeName || answers.auditeeName || "N/A").substring(0, 25),
      },
      {
        icon: MapPin,
        label: "Location",
        value: (answers.location || "-").substring(0, 25),
      },
      {
        icon: Settings,
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
        value: answers.time || "-" 
      },
    ].map((item, idx) => (
      <View key={idx} className="w-full px-2 mb-4 md:w-1/2 lg:w-1/3">
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
    <View className="w-full px-2 mb-4 md:w-1/2 lg:w-1/3">
      <View className="flex-row items-start gap-2 p-3 border rounded-xl bg-slate-50 border-slate-100 min-h-[60px]">
        <View className="w-4 h-4 flex-shrink-0" />
        <View className="flex-1 min-w-0">
          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Status
          </Text>
          <View
            className={`px-2.5 py-1 rounded-lg self-start border ${getStatusBadge(currentStatus)}`}
          >
            <Text className="text-xs font-medium">
              {currentStatus || "DRAFT"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  </View>
</View>

        {/* Summary Cards */}
        <View className="flex-row flex-wrap mb-6 -mx-2">
          {[
            {
              label: "Total Checkpoints",
              value: totalQuestions.toString(),
              color: "text-slate-800",
            },
            {
              label: "Compliant",
              value: compliantCount.toString(),
              color: "text-emerald-600",
            },
            {
              label: "Minor NC",
              value: minorNCCount.toString(),
              color: "text-amber-600",
            },
            {
              label: "Major NC",
              value: majorNCCount.toString(),
              color: "text-rose-600",
            },
          ].map((item, idx) => (
            <View key={idx} className="w-1/2 px-2 mb-4 md:w-1/4">
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
            <BookOpen size={20} color={NAVBAR_COLORS.primary} />
            <Text className="text-base font-bold text-slate-800">
              Audit Findings
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* ✅ minWidth set to 880 to perfectly fit the new explicit column widths (48+256+256+224+96) */}
            <View style={{ minWidth: 880, width: "100%" }}>
              {/* ✅ TABLE HEADER (Fixed Widths + flex-shrink-0) */}
              <View className="flex-row border-b-2 bg-slate-50 border-slate-200">
                <View className="items-center justify-center flex-shrink-0 w-12 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    S.No.
                  </Text>
                </View>
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    Check Point
                  </Text>
                </View>
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3 bg-slate-100/50">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    Consideration
                  </Text>
                </View>
                <View className="justify-start flex-shrink-0 w-64 px-2 py-3">
                  <Text className="text-[10px] font-bold text-left uppercase text-slate-600">
                    Observations
                  </Text>
                </View>
                {/* ✅ Decreased Status width to w-24 (96px) */}
                <View className="items-center justify-center flex-shrink-0 w-24 px-2 py-3">
                  <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                    Status
                  </Text>
                </View>
              </View>

              {/* ✅ TABLE BODY */}
              {questions.length > 0 ? (
                questions.map((q: any, idx: number) => {
                  const questionKey = q.slNo || idx + 1;
                  const response =
                    responses[questionKey] || responses[String(questionKey)];
                  const observation =
                    observations[questionKey] ||
                    observations[String(questionKey)];

                  let consideration = q.consideration || "-";
                  if (typeof consideration === "string") {
                    consideration = consideration
                      .replace(/\\n/g, "\n")
                      .replace(/(\d+)\.\s/g, "\n• ");
                  }

                  return (
                    <View
                      key={idx}
                      className="flex-row border-b border-slate-100"
                    >
                      <View className="items-center justify-start flex-shrink-0 w-12 px-2 py-3">
                        <Text className="text-xs font-medium text-center text-slate-600">
                          {questionKey}
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
                          {consideration}
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
                      <View className="items-center justify-center flex-shrink-0 w-24 px-2 py-3">
                        <View
                          className={`px-2 py-1.5 rounded-lg border ${getStatusClass(response)}`}
                        >
                          <Text className="text-[10px] font-medium text-center">
                            {getStatusText(response)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center justify-center py-8">
                  <BookOpen size={32} color="#cbd5e1" className="mb-2" />
                  <Text className="text-sm font-medium text-slate-500">
                    No questions loaded from the database
                  </Text>
                  <Text className="mt-1 text-xs text-slate-400">
                    Please ensure check sheet ID {MANUFACTURING_CHECK_SHEET_ID}{" "}
                    exists
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
                {answers.auditorComment && (
                  <View className="p-3 mt-3 bg-white border rounded-lg border-slate-200">
                    <Text className="text-xs text-slate-600">
                      <Text className="font-bold">Comment:</Text>{" "}
                      {answers.auditorComment}
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
            Manufacturing Process Audit Report | Generated on{" "}
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
