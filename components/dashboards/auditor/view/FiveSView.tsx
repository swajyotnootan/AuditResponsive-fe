import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import { ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Film,
  Info,
  MapPin,
  Mic,
  Pause, // ✅ ADDED
  PenTool,
  Play, // ✅ ADDED
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  XCircle,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ ADDED useRef
import React, { useEffect, useRef, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";

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

// =====================================================
// ✅ WEB VIDEO PLAYER (Robust HTML5 Fallback)
// =====================================================
const WebVideoPlayer = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedData = () => { setIsLoading(false); setError(null); };
      const handleError = () => { setError("Failed to load video"); setIsLoading(false); };
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        video.pause();
        video.src = "";
        video.load();
      };
    }
  }, [url]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16, backgroundColor: "rgba(0,0,0,0.9)" }}>
        <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
          <XCircle size={28} color="white" />
        </TouchableOpacity>
        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>Video Evidence</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        {isLoading && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 10 }}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: "white", marginTop: 12, fontSize: 14 }}>Loading video...</Text>
          </View>
        )}
        {error && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.9)", zIndex: 10, padding: 20 }}>
            <Text style={{ color: "white", fontSize: 16, textAlign: "center", marginBottom: 16 }}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => { setError(null); setIsLoading(true); if (videoRef.current) videoRef.current.load(); }} style={{ backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: "white", fontWeight: "600", fontSize: 14 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* @ts-ignore */}
        <video ref={videoRef} src={url} controls autoPlay playsInline style={{ width: "100%", height: "100%", backgroundColor: "#000", objectFit: "contain", display: error ? "none" : "block" }} />
      </View>
    </View>
  );
};

// =====================================================
// ✅ WEB AUDIO PLAYER (Robust HTML5 Fallback)
// =====================================================
const WebAudioPlayerModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (url) {
      try {
        const audio = new Audio(url);
        audio.preload = "metadata";
        audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setIsLoading(false); });
        audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
        audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
        audio.addEventListener("error", () => { setError("Cannot play audio"); setIsLoading(false); });
        audioRef.current = audio;
        return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; } };
      } catch (err) { setError("Cannot setup audio"); setIsLoading(false); }
    }
  }, [url]);

  const handlePlayPause = () => {
    if (error || !audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play().then(() => { setIsPlaying(true); setError(null); }).catch(() => setError("Cannot play audio")); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" }}>
      <TouchableOpacity style={{ position: "absolute", top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={onClose}>
        <XCircle size={34} color="white" />
      </TouchableOpacity>
      <View style={{ width: "90%", maxWidth: 400, padding: 24, backgroundColor: "white", borderRadius: 16, alignItems: "center" }}>
        <View style={{ padding: 16, marginBottom: 16, borderRadius: 999, backgroundColor: "#eff6ff" }}>
          <Mic size={32} color="#00529B" />
        </View>
        <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: "bold", color: "#1e293b" }}>Audio Evidence</Text>
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#00529B" style={{ marginBottom: 12 }} />
        ) : error ? (
          <Text style={{ color: "red", marginBottom: 12, textAlign: "center" }}>⚠️ {error}</Text>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", width: "100%", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={handlePlayPause} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#00529B", justifyContent: "center", alignItems: "center" }} disabled={!!error || isLoading}>
            {isPlaying ? <Pause size={24} color="#fff" /> : <Play size={24} color="#fff" />}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
              <View style={{ height: "100%", width: `${progress}%`, backgroundColor: "#00529B", borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{formatDuration(currentTime)}</Text>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{formatDuration(duration)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const getFullMediaUrl = (uri: string) => {
  if (!uri) return "";
  if (
    uri.startsWith("http") ||
    uri.startsWith("data:") ||
    uri.startsWith("blob:") ||
    uri.startsWith("file:") ||
    uri.startsWith("content:")
  ) {
    return uri;
  }

  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
  const cleanUri = uri.startsWith("/") ? uri : `/${uri}`;
  return `${baseUrl}${cleanUri}`;
};

const ensureBase64 = async (uri: string): Promise<string> => {
  if (uri.startsWith("data:")) return uri; 
  if (Platform.OS === "web" && uri.startsWith("blob:")) {
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  }
  if (uri.startsWith("file://")) {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:application/octet-stream;base64,${b64}`;
  }
  return uri;
};

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

const getScoreInfo = (score: number | null | undefined) => {
  if (score === 4)
    return {
      label: "Total Compliance",
      level: "Excellent",
      color: "green",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
    };
  if (score === 3)
    return {
      label: "Significant Compliance",
      level: "Good",
      color: "lime",
      bgColor: "bg-lime-50",
      textColor: "text-lime-700",
    };
  if (score === 2)
    return {
      label: "Some Compliance",
      level: "Average",
      color: "yellow",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
    };
  if (score === 1)
    return {
      label: "Very Little Compliance",
      level: "Poor",
      color: "orange",
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
    };
  if (score === 0)
    return {
      label: "No Compliance",
      level: "Very Poor",
      color: "red",
      bgColor: "bg-rose-50",
      textColor: "text-rose-700",
    };
  return {
    label: "Not Rated",
    level: "Not Rated",
    color: "gray",
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
  };
};

const getLevelOfJudgment = (score: number | null | undefined) => {
  if (score === 4) return "Total Compliance";
  if (score === 3) return "Significant Compliance";
  if (score === 2) return "Some Compliance";
  if (score === 1) return "Very Little Compliance";
  if (score === 0) return "No Compliance";
  return "Not Rated";
};

const getSectionStyles = (sectionName: string) => {
  switch (sectionName) {
    case "1S - SORT":
      return {
        displayName: "1S - SORT",
        headerBg: "bg-blue-50",
        headerBorder: "border-blue-200",
        textColor: "text-blue-700",
        barColor: "bg-blue-500",
        description: "Determine what is needed and remove the rest.",
      };
    case "2S - SET IN ORDER":
      return {
        displayName: "2S - SET IN ORDER",
        headerBg: "bg-cyan-50",
        headerBorder: "border-cyan-200",
        textColor: "text-cyan-700",
        barColor: "bg-cyan-500",
        description: "A place for everything and everything in its place.",
      };
    case "3S - SHINE":
      return {
        displayName: "3S - SHINE",
        headerBg: "bg-emerald-50",
        headerBorder: "border-emerald-200",
        textColor: "text-emerald-700",
        barColor: "bg-emerald-500",
        description: "Cleaning and looking for ways to keep it clean.",
      };
    case "4S - STANDARDIZE":
      return {
        displayName: "4S - STANDARDIZE",
        headerBg: "bg-amber-50",
        headerBorder: "border-amber-200",
        textColor: "text-amber-700",
        barColor: "bg-amber-500",
        description: "Make standards obvious and maintained.",
      };
    case "5S - SUSTAIN":
      return {
        displayName: "5S - SUSTAIN",
        headerBg: "bg-indigo-50",
        headerBorder: "border-indigo-200",
        textColor: "text-indigo-700",
        barColor: "bg-indigo-500",
        description: "Maintain high standards and constantly seek to improve.",
      };
    default:
      return {
        displayName: sectionName,
        headerBg: "bg-slate-50",
        headerBorder: "border-slate-200",
        textColor: "text-slate-700",
        barColor: "bg-slate-500",
        description: "",
      };
  }
};

export default function FiveSView({
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
  const [auditeeSignature, setAuditeeSignature] = useState("");
  const [auditeeComment, setAuditeeComment] = useState("");
  const [auditorSignedAt, setAuditorSignedAt] = useState<string | null>(null);
  const [auditeeSignedAt, setAuditeeSignedAt] = useState<string | null>(null);

  const [auditorSignatureUrl, setAuditorSignatureUrl] = useState<string | null>(null);
  const [auditeeSignatureUrl, setAuditeeSignatureUrl] = useState<string | null>(null);
  const [loadingSignatures, setLoadingSignatures] = useState(false);

  const [evidences, setEvidences] = useState<Record<number, any[]>>({});

  const [imageModal, setImageModal] = useState({ open: false, url: "" });
  const [videoModal, setVideoModal] = useState({ open: false, url: "" });
  const [audioModal, setAudioModal] = useState({ open: false, url: "" });
  
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

      const auditData: any =
        response?.data !== undefined ? response.data : response;
      if (!auditData) {
        console.error("❌ API returned empty or invalid response:", response);
        addToast("Failed to load audit data: Empty response", "error");
        setLoading(false);
        return;
      }

      setAudit(auditData);

      if (auditData.id) {
  try {
    const evidenceResponse = await auditScheduleApi.getEvidenceForResponse(auditData.id);
    const existingEvidences = evidenceResponse?.data || evidenceResponse || [];
    const mappedEvidences: Record<number, any[]> = {};

    if (Array.isArray(existingEvidences)) {
      existingEvidences.forEach((ev: any) => {
        const slNo = ev.questionSlNo;
        if (!mappedEvidences[slNo]) mappedEvidences[slNo] = [];

        // ✅ Get the best available URL
        let mediaUrl = ev.uri || ev.filePath || "";
        
        // ✅ If it's a blob URL, use filePath instead
        if (mediaUrl && mediaUrl.startsWith("blob:")) {
          mediaUrl = ev.filePath || "";
        }
        
        // ✅ CRITICAL FIX: Don't use Windows file paths as URLs
        // If it contains "\" or starts with a drive letter, it's a file system path
        if (mediaUrl && (mediaUrl.includes(":\\") || mediaUrl.match(/^[A-Za-z]:/))) {
          // Extract just the filename from the Windows path
          const fileName = mediaUrl.split(/[\\/]/).pop() || ev.fileName || `evidence_${ev.id}`;
          
          // Try to build a proper URL - check if the backend has an endpoint for serving files
          const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
          // Use a relative path if the backend serves files from a specific directory
          // This assumes your backend serves uploaded files from /uploads/ or similar
          mediaUrl = `${baseUrl}/uploads/evidences/${fileName}`;
          
          console.log(`📸 Converted Windows path to URL: ${mediaUrl}`);
        }
        
        // ✅ Build full URL if relative path
        if (mediaUrl && !mediaUrl.startsWith("http") && !mediaUrl.startsWith("data:") && !mediaUrl.startsWith("file:")) {
          const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
          mediaUrl = mediaUrl.startsWith("/") ? `${baseUrl}${mediaUrl}` : `${baseUrl}/${mediaUrl}`;
        }

        mappedEvidences[slNo].push({
          id: ev.id,
          type: ev.evidenceType,
          uri: mediaUrl,
          name: ev.fileName || `Evidence ${slNo}`,
          filePath: ev.filePath,
        });
      });
    }
    setEvidences(mappedEvidences);
    console.log(`✅ Loaded ${Object.keys(mappedEvidences).length} evidence items`);
  } catch (e) {
    console.warn("Could not load evidence:", e);
  }
}

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
      if (parsedAnswers.auditorSignedAt)
        setAuditorSignedAt(parsedAnswers.auditorSignedAt);

      let auditor = "";
      if (auditData.auditorId) {
        try {
          const auditorUser = await userAPI.getUserById(auditData.auditorId);
          auditor =
            auditorUser?.name ||
            `${auditorUser?.firstName} ${auditorUser?.lastName}`;
          setAuditorName(auditor);
        } catch (e) {
          auditor =
            auditData.auditorName || parsedAnswers.auditorName || "Unknown";
          setAuditorName(auditor);
        }
      } else {
        auditor =
          auditData.auditorName || parsedAnswers.auditorName || "Unknown";
        setAuditorName(auditor);
      }

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

      const checkSheet = auditData.checkSheet;
      if (checkSheet && checkSheet.questions) {
        let parsedQuestions: any[] = [];
        try {
          parsedQuestions =
            typeof checkSheet.questions === "string"
              ? JSON.parse(checkSheet.questions)
              : checkSheet.questions;

          const formattedQuestions = parsedQuestions.map(
            (q: any, idx: number) => {
              let category = q.category || "";
              if (!category && q.consideration) {
                if (
                  q.consideration.includes("SORT") ||
                  q.consideration.includes("1S")
                )
                  category = "1S - SORT";
                else if (
                  q.consideration.includes("SET") ||
                  q.consideration.includes("2S")
                )
                  category = "2S - SET IN ORDER";
                else if (
                  q.consideration.includes("SHINE") ||
                  q.consideration.includes("3S")
                )
                  category = "3S - SHINE";
                else if (
                  q.consideration.includes("STANDARDIZE") ||
                  q.consideration.includes("4S")
                )
                  category = "4S - STANDARDIZE";
                else if (
                  q.consideration.includes("SUSTAIN") ||
                  q.consideration.includes("5S")
                )
                  category = "5S - SUSTAIN";
              }
              return {
                slNo: q.sNo || q.slNo || idx + 1,
                checkpoint: q.displayLabel,
                category: category,
                maxMarks: q.maxRating || 4,
                fieldKey: q.fieldKey,
              };
            },
          );
          setQuestions(formattedQuestions);
        } catch (e) {
          console.error("Error parsing questions:", e);
          setQuestions([]);
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const handleDownloadPDF = async () => {
    if (!audit || !audit.id) {
      addToast("Audit data not available", "error");
      return;
    }
    setDownloading(true);
    try {
      const responseId = audit.id;
      const endpoint = `${API_BASE_URL}/api/fives-audits/${responseId}/pdf`;

      const response = await fetch(endpoint, {
        headers: { Accept: "application/pdf" },
      });

      if (!response.ok) throw new Error("Failed to fetch PDF from server");

      const blob = await response.blob();

      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `5S_Audit_Report_${responseId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        addToast("PDF downloaded successfully", "success");
        setDownloading(false);
      } else {
        const directory =
          FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${directory}5S_Audit_Report_${responseId}.pdf`;

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            await FileSystem.writeAsStringAsync(
              fileUri,
              base64data.split(",")[1],
              {
                encoding: FileSystem.EncodingType.Base64,
              },
            );

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
          headers: {
            "Content-Type": "application/json",
          },
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
          headers: {
            "Content-Type": "application/json",
          },
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

  const scores: Record<string, any> = answers.scores || {};
  const comments: Record<string, any> = answers.comments || {};
  const totalScore = Object.values(scores).reduce(
    (a: number, b: any) => a + (Number(b) || 0),
    0,
  );
  const maxScore = 144;
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const totalQuestions = questions.length;
  const ratedCount = Object.keys(scores).filter(
    (key) => scores[key] !== null && scores[key] !== undefined,
  ).length;

  const getSectionScore = (startSlNo: number, endSlNo: number) => {
    let total = 0;
    for (let i = startSlNo; i <= endSlNo; i++) total += Number(scores[i]) || 0;
    return total;
  };

  const getSectionMaxScore = (startSlNo: number, endSlNo: number) => {
    let total = 0;
    for (let i = startSlNo; i <= endSlNo; i++) total += 4;
    return total;
  };

  const groupQuestionsBySection = () => {
    const sections: any = {
      "1S - SORT": { questions: [], start: 1, end: 8, maxScore: 32 },
      "2S - SET IN ORDER": { questions: [], start: 9, end: 16, maxScore: 32 },
      "3S - SHINE": { questions: [], start: 17, end: 25, maxScore: 36 },
      "4S - STANDARDIZE": { questions: [], start: 26, end: 31, maxScore: 24 },
      "5S - SUSTAIN": { questions: [], start: 32, end: 36, maxScore: 20 },
    };
    questions.forEach((q: any) => {
      if (q.slNo <= 8) sections["1S - SORT"].questions.push(q);
      else if (q.slNo <= 16) sections["2S - SET IN ORDER"].questions.push(q);
      else if (q.slNo <= 25) sections["3S - SHINE"].questions.push(q);
      else if (q.slNo <= 31) sections["4S - STANDARDIZE"].questions.push(q);
      else if (q.slNo <= 36) sections["5S - SUSTAIN"].questions.push(q);
    });
    return sections;
  };

  const sections = groupQuestionsBySection();
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
            onPress={() => router.back()}
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
    <>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View
          className="p-4"
          style={{ maxWidth: 1200, alignSelf: "center", width: "100%" }}
        >
          <View className="flex-row flex-wrap items-center justify-between gap-3 mb-6">
            <View className="flex-row items-center flex-1 gap-2">
              <TouchableOpacity
                onPress={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    router.back();
                  }
                }}
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
                  5S Audit Report
                </Text>
                <Text
                  className="text-xs text-slate-500 mt-0.5"
                  numberOfLines={1}
                >
                  Workplace organization audit details
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

          <View
            className="p-4 mb-6 text-center shadow-md rounded-2xl"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <View className="flex-row items-center justify-center gap-2 mb-1">
              <Sparkles size={24} color="#ffffff" />
              <Text className="text-xl font-bold text-white">
                5S AUDIT CHECK SHEET
              </Text>
            </View>
            <Text className="text-sm text-center text-blue-100">
              Sort | Set in Order | Shine | Standardize | Sustain
            </Text>
          </View>

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
                  value: answers.documentNumber || `5S-${audit.id}`,
                },
                {
                  icon: Building,
                  label: "Department",
                  value: answers.department || audit.department || "-",
                },
                {
                  icon: User,
                  label: "Auditor (Supervisor)",
                  value: auditorName || answers.auditorName || "N/A",
                },
                {
                  icon: User,
                  label: "Auditee",
                  value: auditeeName || answers.auditeeName || "N/A",
                },
                {
                  icon: Calendar,
                  label: "Audit Date",
                  value: answers.date || formatDate(audit.auditDate),
                },
                {
                  icon: MapPin,
                  label: "Area / Location",
                  value: answers.area || "-",
                },
                {
                  icon: Clock,
                  label: "Shift",
                  value: audit.shift || answers.shift || "-",
                },
              ].map((item, idx) => (
                <View key={idx} className="w-full px-2 mb-4 md:w-1/2">
                  <View className="flex-row items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
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
              <View className="w-full px-2 mb-4 md:w-1/2">
                <View className="flex-row items-center gap-3 p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <View className="w-4 h-4" />
                  <View>
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </Text>
                    <View className={`px-2.5 py-1 rounded-lg self-start`}>
                      <Text
                        className={`text-xs font-semibold ${getStatusBadge(currentStatus)}`}
                      >
                        {currentStatus || "DRAFT"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
            <Text className="mb-3 text-sm font-bold text-slate-700">
              Rating Scale:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                {
                  label: "0 = No",
                  bg: "bg-rose-50",
                  border: "border-rose-200",
                  text: "text-rose-700",
                },
                {
                  label: "1 = Very Little",
                  bg: "bg-orange-50",
                  border: "border-orange-200",
                  text: "text-orange-700",
                },
                {
                  label: "2 = Some",
                  bg: "bg-amber-50",
                  border: "border-amber-200",
                  text: "text-amber-700",
                },
                {
                  label: "3 = Significant",
                  bg: "bg-lime-50",
                  border: "border-lime-200",
                  text: "text-lime-700",
                },
                {
                  label: "4 = Total",
                  bg: "bg-emerald-50",
                  border: "border-emerald-200",
                  text: "text-emerald-700",
                },
              ].map((item, idx) => (
                <View
                  key={idx}
                  className={`px-3 py-2 border rounded-lg ${item.bg} ${item.border}`}
                >
                  <Text className={`text-xs font-medium ${item.text}`}>
                    {item.label} Compliance
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="flex-row flex-wrap mb-6 -mx-2">
            {[
              {
                label: "Total Questions",
                value: totalQuestions.toString(),
                color: "text-slate-800",
              },
              {
                label: "Rated",
                value: ratedCount.toString(),
                color: "text-emerald-600",
              },
              {
                label: "Total Score",
                value: totalScore.toString(),
                color: "text-[#00529B]",
              },
              {
                label: "Percentage",
                value: `${percentage}%`,
                color: getScoreColor(percentage),
              },
            ].map((item, idx) => (
              <View key={idx} className="w-1/2 px-2 mb-4">
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

          <View className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
  <Text className="mb-4 text-base font-bold text-slate-800">
    5S Sections Summary
  </Text>
  <View className="flex-row flex-wrap -mx-2">
    {Object.entries(sections).map(
      ([sectionName, section]: [string, any]) => {
        const sectionScore = getSectionScore(
          section.start,
          section.end,
        );
        const sectionMaxScore = getSectionMaxScore(
          section.start,
          section.end,
        );
        const sectionPercentage = Math.round(
          (sectionScore / sectionMaxScore) * 100,
        );
        const styles = getSectionStyles(sectionName);
        
        // Determine color based on percentage
        let scoreColor = "text-slate-800";
        if (sectionPercentage >= 80) scoreColor = "text-emerald-600";
        else if (sectionPercentage >= 60) scoreColor = "text-amber-600";
        else scoreColor = "text-rose-600";
        
        return (
          <View
            key={sectionName}
            className="w-1/2 px-2 mb-4 md:w-1/5"
          >
            <View className="p-4 text-center border rounded-xl bg-slate-50 border-slate-100">
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${styles.textColor}`}
              >
                {styles.displayName}
              </Text>
              <Text className={`mt-1 text-2xl font-bold ${scoreColor}`}>
                {sectionScore}
              </Text>
              <Text className="text-[10px] text-slate-400">
                / {sectionMaxScore}
              </Text>
              <View className="w-full h-1.5 mt-2 bg-slate-200 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${styles.barColor}`}
                  style={{ width: `${sectionPercentage}%` }}
                />
              </View>
              <Text className="mt-1 text-xs font-medium text-slate-600">
                {sectionPercentage}% {sectionPercentage >= 80 ? "✅" : sectionPercentage >= 60 ? "⚠️" : "❌"}
              </Text>
            </View>
          </View>
        );
      },
    )}
  </View>
  
  {/* Overall Score Bar */}
  <View className="flex-row flex-wrap items-center justify-between p-3 mt-2 bg-slate-50 border border-slate-200 rounded-xl">
    <View>
      <Text className="text-xs font-medium text-slate-500">Overall Score</Text>
      <Text className="text-lg font-bold text-slate-800">{totalScore} / {maxScore}</Text>
    </View>
    <View className="flex-1 mx-4">
      <View className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <View 
          className="h-full rounded-full"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: percentage >= 80 ? "#059669" : percentage >= 60 ? "#d97706" : "#dc2626"
          }}
        />
      </View>
    </View>
    <Text className={`text-lg font-bold ${percentage >= 80 ? "text-emerald-600" : percentage >= 60 ? "text-amber-600" : "text-rose-600"}`}>
      {percentage}%
    </Text>
  </View>
</View>

          {/* Audit Findings Table */}
          <View className="p-4 mb-6 bg-white border shadow-sm md:p-6 border-slate-200 rounded-2xl">
            <View className="flex-row items-center gap-2 mb-4">
              <Sparkles size={20} color={NAVBAR_COLORS.primary} />
              <Text className="text-base font-bold text-slate-800">
                Audit Findings
              </Text>
            </View>

            {/* ✅ HORIZONTAL SCROLL FOR TABLE RESPONSIVENESS */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 700, width: "100%" }}>
                {Object.entries(sections).map(
                  ([sectionName, section]: [string, any]) => {
                    const sectionScore = getSectionScore(
                      section.start,
                      section.end,
                    );
                    const sectionMaxScore = getSectionMaxScore(
                      section.start,
                      section.end,
                    );
                    const sectionPercentage = Math.round(
                      (sectionScore / sectionMaxScore) * 100,
                    );
                    const styles = getSectionStyles(sectionName);

                    return (
                      <View
                        key={sectionName}
                        className="mb-6 overflow-hidden border border-slate-200 rounded-xl"
                      >
                        <View
                          className={`p-4 ${styles.headerBg} border-b ${styles.headerBorder}`}
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <View className="flex-row items-center gap-2">
                                <Text
                                  className={`text-sm font-bold ${styles.textColor}`}
                                >
                                  {styles.displayName}
                                </Text>
                                <View>
                                  <Info size={14} color="#94a3b8" />
                                </View>
                              </View>
                              <Text className="text-xs text-slate-500 mt-0.5">
                                Max marks: {sectionMaxScore} | Score: {sectionScore}
                                /{sectionMaxScore} ({sectionPercentage}%)
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text
                                className={`text-xs font-semibold ${styles.textColor}`}
                              >
                                Level:{" "}
                                {sectionPercentage >= 80
                                  ? "Excellent"
                                  : sectionPercentage >= 60
                                    ? "Good"
                                    : sectionPercentage >= 40
                                      ? "Average"
                                      : "Poor"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View className="flex-row border-b bg-slate-50 border-slate-200">
                          <View className="items-center justify-center w-10 px-1 py-2">
                            <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                              S.No
                            </Text>
                          </View>
                          <View className="flex-[2] px-2 py-2 justify-center">
                            <Text className="text-[10px] font-bold text-slate-600 uppercase">
                              Checkpoint
                            </Text>
                          </View>
                          <View className="items-center justify-center w-10 px-1 py-2">
                            <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                              Max
                            </Text>
                          </View>
                          <View className="items-center justify-center px-1 py-2 w-14">
                            <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                              Score
                            </Text>
                          </View>
                          <View className="justify-center flex-1 px-2 py-2">
                            <Text className="text-[10px] font-bold text-slate-600 uppercase">
                              Comments
                            </Text>
                          </View>
                          <View className="items-center justify-center px-1 py-2 w-28">
                            <Text className="text-[10px] font-bold text-center uppercase text-slate-600">
                              Evidence
                            </Text>
                          </View>
                        </View>

                        {section.questions.map((q: any) => {
                          const score = scores[q.slNo];
                          const comment = comments[q.slNo];
                          const scoreInfo = getScoreInfo(score);

                          return (
                            <View
                              key={q.slNo}
                              className="flex-row border-b border-slate-100"
                            >
                              <View className="items-center justify-center w-10 px-1 py-3">
                                <Text className="text-xs font-medium text-center text-slate-600">
                                  {q.slNo}
                                </Text>
                              </View>
                              <View className="flex-[2] px-2 py-3 justify-center">
                                <Text
                                  className="text-xs text-slate-800"
                                  numberOfLines={3}
                                >
                                  {q.checkpoint}
                                </Text>
                              </View>
                              <View className="items-center justify-center w-10 px-1 py-3">
                                <Text className="text-xs text-center text-slate-500">
                                  4
                                </Text>
                              </View>
                              <View className="items-center justify-center px-1 py-3 w-14">
                                {score !== undefined && score !== null ? (
                                  <View className="items-center gap-1">
                                    <View
                                      className={`items-center justify-center w-7 h-7 rounded-full border-2 ${scoreInfo.bgColor} ${scoreInfo.textColor}`}
                                    >
                                      <Text className="text-xs font-bold">
                                        {score}
                                      </Text>
                                    </View>
                                  </View>
                                ) : (
                                  <View className="px-1 py-1 rounded-full bg-slate-100">
                                    <Text className="text-[9px] font-medium text-slate-500 text-center">
                                      N/A
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View className="justify-center flex-1 px-2 py-3">
                                <Text
                                  className="text-xs text-slate-600"
                                  numberOfLines={3}
                                >
                                  {comment || "-"}
                                </Text>
                              </View>

                              <View className="items-center justify-center px-1 py-3 w-28">
  <View className="flex-row gap-1.5 flex-wrap justify-center">
    {evidences[q.slNo] && evidences[q.slNo].length > 0 ? (
      evidences[q.slNo].map((ev, idx) => {
        const evType = ev.type?.toLowerCase();
        const mediaUrl = ev.uri || ev.filePath;
        
        if (!mediaUrl) return null;
        
        // Check if URL is valid
        const isValidUrl = mediaUrl.startsWith('http') || 
                           mediaUrl.startsWith('data:') || 
                           mediaUrl.startsWith('file:');

        // Check if it's a Windows path that won't load
        const isWindowsPath = mediaUrl.includes(':\\') || mediaUrl.match(/^[A-Za-z]:/);

        return (
          <TouchableOpacity
            key={idx}
            onPress={() => {
              if (!isValidUrl || isWindowsPath) {
                addToast("This media file cannot be previewed - file path is invalid", "warning");
                return;
              }
              if (evType === "image") {
                setImageModal({ open: true, url: mediaUrl });
              } else if (evType === "video") {
                setVideoModal({ open: true, url: mediaUrl });
              } else if (evType === "audio") {
                setAudioModal({ open: true, url: mediaUrl });
              }
            }}
            className="active:opacity-70"
          >
            {evType === "image" && isValidUrl && !isWindowsPath ? (
              <Image
                source={{ uri: mediaUrl }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: "#f1f5f9",
                }}
                onError={() => {
                  console.warn(`Failed to load image: ${mediaUrl}`);
                }}
              />
            ) : evType === "image" && (isValidUrl || !isWindowsPath) ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: "#f1f5f9",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16 }}>📷</Text>
              </View>
            ) : evType === "video" ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: "#1e293b",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Film size={18} color="#fff" />
              </View>
            ) : evType === "audio" ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: "#00529B",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Mic size={18} color="#fff" />
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })
    ) : (
      <Text className="text-xs text-slate-400">-</Text>
    )}
  </View>
</View>
                            </View>
                          );
                        })}

                        <View className="flex-row border-t bg-slate-50 border-slate-200">
                          <View className="w-10 px-1 py-3" />
                          <View className="flex-[2] px-2 py-3 justify-center">
                            <Text className="text-xs font-bold text-right text-slate-700">
                              Section Total:
                            </Text>
                          </View>
                          <View className="items-center justify-center w-10 px-1 py-3">
                            <Text className="text-xs font-bold text-center text-slate-800">
                              {sectionMaxScore}
                            </Text>
                          </View>
                          <View className="items-center justify-center px-1 py-3 w-14">
                            <Text className="text-xs font-bold text-slate-800">
                              {sectionScore}
                            </Text>
                          </View>
                          <View className="justify-center flex-1 px-2 py-3">
                            <Text className="text-xs font-medium text-slate-600">
                              {sectionPercentage}%
                            </Text>
                          </View>
                          <View className="px-1 py-3 w-28" />
                        </View>
                      </View>
                    );
                  },
                )}
              </View>
            </ScrollView>
          </View>

          

          {/* ============================================================
    5S OVERALL SCORE & PERCENTAGE CALCULATION
    ============================================================ */}
<View className="p-6 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
  <Text className="mb-4 text-base font-bold text-slate-800">
    📊 5S Overall Score Calculation
  </Text>
  
  {/* Score Summary Cards */}
  <View className="flex-row flex-wrap mb-4 -mx-2">
    {[
      { label: "Total Questions", value: totalQuestions, color: "text-slate-800" },
      { label: "Rated", value: ratedCount, color: "text-emerald-600" },
      { label: "Total Score", value: totalScore, color: "text-[#00529B]" },
      { label: "Max Score", value: maxScore, color: "text-slate-800" },
      { label: "Percentage", value: `${percentage}%`, color: percentage >= 80 ? "text-emerald-600" : percentage >= 60 ? "text-amber-600" : "text-rose-600" },
    ].map((item, idx) => (
      <View key={idx} className="w-1/3 px-2 mb-3 md:w-1/5">
        <View className="p-3 text-center bg-white border shadow-sm border-slate-200 rounded-xl">
          <Text className={`text-xl font-bold ${item.color}`}>
            {item.value}
          </Text>
          <Text className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            {item.label}
          </Text>
        </View>
      </View>
    ))}
  </View>

  {/* Progress Bar */}
  <View className="w-full mb-2">
    <View className="flex-row justify-between mb-1">
      <Text className="text-xs font-medium text-slate-600">Progress</Text>
      <Text className="text-xs font-bold text-slate-800">{percentage}%</Text>
    </View>
    <View className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
      <View 
        className="h-full rounded-full"
        style={{ 
          width: `${percentage}%`, 
          backgroundColor: percentage >= 80 ? "#059669" : percentage >= 60 ? "#d97706" : "#dc2626" 
        }}
      />
    </View>
  </View>

  {/* Rating Text */}
  <View className={`p-3 mt-2 text-center rounded-xl border ${
    percentage >= 90
      ? "bg-emerald-50 border-emerald-200"
      : percentage >= 75 && percentage < 90
        ? "bg-lime-50 border-lime-200"
        : percentage >= 60 && percentage < 75
          ? "bg-amber-50 border-amber-200"
          : "bg-rose-50 border-rose-200"
  }`}>
    <View className="flex-row items-center justify-center gap-2">
      {percentage >= 90 && <Star size={18} color="#047857" />}
      {percentage >= 75 && percentage < 90 && (
        <ThumbsUp size={18} color="#3f6212" />
      )}
      {percentage >= 60 && percentage < 75 && (
        <AlertCircle size={18} color="#b45309" />
      )}
      {percentage < 60 && <AlertCircle size={18} color="#be123c" />}
      <Text
        className={`font-bold ${
          percentage >= 90
            ? "text-emerald-800"
            : percentage >= 75 && percentage < 90
              ? "text-lime-800"
              : percentage >= 60 && percentage < 75
                ? "text-amber-800"
                : "text-rose-800"
        }`}
      >
        {percentage >= 90
          ? "🌟 Excellent - World Class 5S!"
          : percentage >= 75
            ? "👍 Good - Above Average"
            : percentage >= 60
              ? "⚠️ Needs Improvement"
              : "🚨 Poor - Immediate Action Required"}
      </Text>
    </View>
  </View>
</View>

          <View className="p-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
            <View className="flex-row items-center gap-2 mb-4">
              <PenTool size={18} color={NAVBAR_COLORS.primary} />
              <Text className="text-base font-bold text-slate-800">
                Signatures & Comments
              </Text>
            </View>
            <View className="flex-row flex-wrap -mx-2">
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

              <View className="w-full px-2 mb-4 md:w-1/2">
                <View className="p-5 border rounded-xl bg-slate-50 border-slate-200">
                  {showAuditeeActions ? (
                    <>
                      <Text className="text-xs font-bold tracking-wider uppercase text-slate-500">
                        Your Electronic Signature
                      </Text>
                      {loadingSignatures ? (
                        <View className="items-center justify-center p-4">
                          <ActivityIndicator
                            size="small"
                            color={NAVBAR_COLORS.primary}
                          />
                        </View>
                      ) : auditeeSignatureUrl ? (
                        <View className="mt-3">
                          <Image
                            source={{ uri: auditeeSignatureUrl }}
                            className="object-contain p-3 bg-white border rounded-lg shadow-sm border-slate-200"
                            style={{ height: 96, width: "100%" }}
                            resizeMode="contain"
                          />
                          <Text
                            className="mt-2 text-xs font-medium"
                            style={{ color: NAVBAR_COLORS.secondary }}
                          >
                            ✓ Signature loaded from your profile
                          </Text>
                          <Text className="mt-1 text-xs text-slate-500">
                            Name: {auditeeName}
                          </Text>
                        </View>
                      ) : (
                        <View className="mt-3">
                          <View className="flex-row items-center gap-2">
                            <AlertTriangle size={16} color="#94a3b8" />
                            <Text className="text-sm font-medium text-slate-400">
                              No signature uploaded in profile
                            </Text>
                          </View>
                          <TextInput
                            value={auditeeSignature}
                            onChangeText={setAuditeeSignature}
                            placeholder="Type your full name as signature (fallback)"
                            className="w-full px-4 py-2.5 mt-3 text-sm bg-white border border-slate-200 rounded-xl"
                          />
                        </View>
                      )}

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
                        {loadingSignatures ? (
                          <View className="items-center justify-center p-4">
                            <ActivityIndicator
                              size="small"
                              color={NAVBAR_COLORS.primary}
                            />
                          </View>
                        ) : isApproved || isRejected ? (
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

          <View className="items-center pb-6 mt-8">
            <Text className="text-xs text-center text-slate-400">
              5S Workplace Organization Audit Report | Generated on{" "}
              {formatDate(new Date().toISOString())}
            </Text>
            <Text className="mt-1 text-xs text-center text-slate-400">
              This is an electronic document and does not require a physical
              signature
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <Modal
  visible={imageModal.open}
  transparent
  animationType="fade"
  onRequestClose={() => setImageModal({ open: false, url: "" })}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <TouchableOpacity
      style={{
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
      }}
      onPress={() => setImageModal({ open: false, url: "" })}
    >
      <XCircle size={34} color="white" />
    </TouchableOpacity>
    {imageModal.url && (
      <Image
        source={{ uri: imageModal.url }}
        style={{ width: "95%", height: "85%" }}
        resizeMode="contain"
        onError={() => {
          addToast("Failed to load image", "error");
          setImageModal({ open: false, url: "" });
        }}
        onLoadStart={() => {
          console.log("Loading image:", imageModal.url);
        }}
      />
    )}
  </View>
</Modal>

      {/* ✅ FULLSCREEN VIDEO MODAL */}
      <Modal
        visible={videoModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setVideoModal({ open: false, url: "" })}
      >
        {Platform.OS === "web" ? (
          <WebVideoPlayer url={videoModal.url} onClose={() => setVideoModal({ open: false, url: "" })} />
        ) : (
          <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center" }}>
            <TouchableOpacity style={{ position: "absolute", top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setVideoModal({ open: false, url: "" })}>
              <XCircle size={34} color="white" />
            </TouchableOpacity>
            {videoModal.url && (
              <Video
                source={{ uri: videoModal.url }}
                style={{ width: "100%", height: "100%" }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            )}
          </View>
        )}
      </Modal>

      {/* ✅ FULLSCREEN AUDIO MODAL */}
      <Modal
        visible={audioModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setAudioModal({ open: false, url: "" })}
      >
        {Platform.OS === "web" ? (
          <WebAudioPlayerModal url={audioModal.url} onClose={() => setAudioModal({ open: false, url: "" })} />
        ) : (
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" }}>
            <TouchableOpacity style={{ position: "absolute", top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setAudioModal({ open: false, url: "" })}>
              <XCircle size={34} color="white" />
            </TouchableOpacity>
            <View style={{ width: "90%", maxWidth: 400, padding: 24, backgroundColor: "white", borderRadius: 16, alignItems: "center" }}>
              <View style={{ padding: 16, marginBottom: 16, borderRadius: 999, backgroundColor: "#eff6ff" }}>
                <Mic size={32} color="#00529B" />
              </View>
              <Text style={{ marginBottom: 16, fontSize: 18, fontWeight: "bold", color: "#1e293b" }}>Audio Evidence</Text>
              {audioModal.url && (
                <Video
                  source={{ uri: audioModal.url }}
                  style={{ width: "100%", height: 60 }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              )}
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}