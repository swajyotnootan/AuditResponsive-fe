import { API_BASE_URL } from "@/config/apiConfig";
import { auditAPI } from "@/services/api";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck,
  PenTool,
  Save,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// ✅ DYNAMIC API BASE: Prevents "Failed to fetch" on Web

// ============================================================================
// COLOR PALETTE
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

// 5S Score options (0-4 scale)
const SCORE_OPTIONS = [
  {
    value: 0,
    label: "No Compliance",
    short: "0",
    description: "Complete non-compliance, no evidence found",
  },
  {
    value: 1,
    label: "Very Little Compliance",
    short: "1",
    description: "Minimal compliance, major gaps identified",
  },
  {
    value: 2,
    label: "Some Compliance",
    short: "2",
    description: "Partial compliance, significant gaps",
  },
  {
    value: 3,
    label: "Significant Compliance",
    short: "3",
    description: "Good compliance, minor gaps",
  },
  {
    value: 4,
    label: "Total Compliance",
    short: "4",
    description: "Full compliance, best practice",
  },
];

// Document number generator
const generateDocumentNumber = (sheetKey: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `AUD-${sheetKey.toUpperCase()}-${year}${month}-${random}`;
};

// 5S Sections with max scores
const FIVE_S_SECTIONS = [
  {
    name: "Sort (1S)",
    slNos: [1, 2, 3, 4, 5, 6, 7, 8],
    maxScore: 32,
    color: "blue",
  },
  {
    name: "Set in Order (2S)",
    slNos: [9, 10, 11, 12, 13, 14, 15, 16],
    maxScore: 32,
    color: "teal",
  },
  {
    name: "Shine (3S)",
    slNos: [17, 18, 19, 20, 21, 22, 23, 24, 25],
    maxScore: 36,
    color: "green",
  },
  {
    name: "Standardize (4S)",
    slNos: [26, 27, 28, 29, 30, 31],
    maxScore: 24,
    color: "orange",
  },
  {
    name: "Sustain (5S)",
    slNos: [32, 33, 34, 35, 36],
    maxScore: 20,
    color: "purple",
  },
];

// Simple FadeIn Animation Component
const FadeInView = ({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [fadeAnim, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

export default function FiveSAuditForm(props: any) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ Supports both Expo Router (params) and Conditional Rendering (props)
  const editId = props.editId || params.edit;
  const scheduleId = props.scheduleId || params.scheduleId;
  const urlDepartment = props.department || params.department;
  const urlAuditeeId = props.auditeeId || params.auditeeId;
  const urlAuditeeName = props.auditeeName || params.auditeeName;
  const urlLocation = props.location || params.location;

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState<string | number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState<any>(null);
  const [fiveSCheckSheetIds, setFiveSCheckSheetIds] = useState<any[]>([]);

  // ✅ Changed to 'string' and initialized to "" to satisfy React Native's Image component
  const [auditorSignatureImage, setAuditorSignatureImage] =
    useState<string>("");
  const [auditorSignatureBase64, setAuditorSignatureBase64] =
    useState<string>("");
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);
  const sheetKey = "five_s";

  const [auditeeInfo, setAuditeeInfo] = useState({
    auditeeId: null as number | null,
    auditeeName: "",
    auditeeIds: [] as any[],
  });

  const [formData, setFormData] = useState({
    documentNumber: "",
    department: "",
    supervisor: "",
    area: "",
    shift: "Morning",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString(),
    auditorName: user?.name || "",
    auditorId: user?.id ? Number(user.id) : null,
    hodEmail: "",
    status: "IN_PROGRESS",
    scores: {} as Record<number, number | null>,
    comments: {} as Record<number, string>,
    totalScore: null as number | null,
    maxPossibleScore: 144,
    percentage: null as number | null,
    auditorSignature: "",
    createdAt: new Date().toISOString(),
  });

  const getLocationHierarchy = (userData: any) => {
    const parts = [];
    if (userData?.companyName) parts.push(userData.companyName);
    if (userData?.plantName) parts.push(userData.plantName);
    if (userData?.siteName) parts.push(userData.siteName);
    if (userData?.unitName) parts.push(userData.unitName);
    return parts.join(", ") || "";
  };

  const fetchAuditorLocation = async () => {
    if (!user?.id) return;
    let locationHierarchy = getLocationHierarchy(user);
    if (!locationHierarchy) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch user");
        const userData = await response.json();
        locationHierarchy = getLocationHierarchy(userData);
      } catch (error) {
        try {
          const allUsersRes = await fetch(`${API_BASE_URL}/api/users`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          if (!allUsersRes.ok) throw new Error("Failed to fetch users");
          const allUsers = (await allUsersRes.json()) || [];
          const currentUser = allUsers.find(
            (u: any) => String(u.id) === String(user.id),
          );
          if (currentUser)
            locationHierarchy = getLocationHierarchy(currentUser);
        } catch (fallbackError) {
          console.error("❌ Fallback fetch also failed:", fallbackError);
        }
      }
    }
    if (locationHierarchy) {
      setFormData((prev) => ({ ...prev, area: locationHierarchy }));
    }
  };

  const fetchAuditorSignature = async () => {
    if (!user?.id) {
      setLoadingSignature(false);
      return;
    }
    setLoadingSignature(true);
    setSignatureError(false);
    try {
      const signatureBase64 = await auditAPI.fetchSignatureById(
        String(user.id),
      );

      // ✅ DEBUG: Check what the API actually returns
      console.log(
        "🖼️ Raw signature from API:",
        signatureBase64 ? "Exists" : "Null/Empty",
      );

      // ✅ FIX: Ensure the string has the correct Data URI prefix for React Native/Web
      if (signatureBase64 && signatureBase64.trim().length > 20) {
        const formattedUri = signatureBase64.startsWith("data:image")
          ? signatureBase64
          : `data:image/png;base64,${signatureBase64.trim()}`;

        console.log(
          "🖼️ Formatted URI starts with:",
          formattedUri.substring(0, 30),
        );

        setAuditorSignatureBase64(formattedUri);
        setAuditorSignatureImage(formattedUri);
        setFormData((prev) => ({ ...prev, auditorSignature: formattedUri }));
      } else {
        console.warn("⚠️ Signature returned from API was empty or invalid.");
        setSignatureError(true);
      }
    } catch (error) {
      console.error("❌ Error fetching signature:", error);
      setSignatureError(true);
    } finally {
      setLoadingSignature(false);
    }
  };

  useEffect(() => {
    const fetchScheduleAuditeeInfo = async () => {
      if (scheduleId && !editId) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/audit-schedule/${scheduleId}`,
            {
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            },
          );
          if (!response.ok) throw new Error("Failed to fetch schedule");
          const schedule = await response.json();

          setAuditeeInfo({
            auditeeId: schedule.auditeeId || urlAuditeeId || null,
            auditeeName: schedule.auditeeName || urlAuditeeName || "",
            auditeeIds: schedule.auditeeIds || [],
          });
          if (schedule.department) {
            setFormData((prev) => ({
              ...prev,
              department: String(schedule.department),
            }));
          } else if (urlDepartment) {
            setFormData((prev) => ({
              ...prev,
              department: String(urlDepartment),
            }));
          }
          if (schedule.location) {
            setFormData((prev) => ({ ...prev, area: schedule.location }));
          } else if (urlLocation) {
            setFormData((prev) => ({ ...prev, area: String(urlLocation) }));
          }
        } catch (error) {
          console.error("Error fetching schedule auditee info:", error);
          if (urlDepartment)
            setFormData((prev) => ({
              ...prev,
              department: String(urlDepartment),
            }));
          if (urlAuditeeName)
            setAuditeeInfo((prev) => ({
              ...prev,
              auditeeName: String(urlAuditeeName),
            }));
          if (urlLocation)
            setFormData((prev) => ({ ...prev, area: String(urlLocation) }));
        }
      }
    };
    fetchScheduleAuditeeInfo();
    fetchAuditorSignature();
  }, [scheduleId, editId]);

  const fetchFiveSCheckSheetIds = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/templates/type/FIVE_S`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch templates");
      const fiveSSheets = (await response.json()) || [];
      const ids = fiveSSheets.map((sheet: any) => sheet.id);
      setFiveSCheckSheetIds(ids);
      return ids;
    } catch (error) {
      console.error("Error fetching 5S check sheets:", error);
      return [];
    }
  };

  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const fiveSIds = await fetchFiveSCheckSheetIds();
      if (fiveSIds.length === 0)
        throw new Error("No 5S check sheets found in database");
      const checkSheetId = fiveSIds[0];

      const response = await fetch(`${API_BASE_URL}/api/templates/${checkSheetId}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch template");
      const checkSheet = await response.json();
      setCurrentCheckSheet(checkSheet);

      let parsedQuestions: any[] = [];
      if (checkSheet.questions) {
        try {
          parsedQuestions =
            typeof checkSheet.questions === "string"
              ? JSON.parse(checkSheet.questions)
              : checkSheet.questions;
        } catch (e) {
          console.error("Error parsing questions:", e);
        }
      }

      const formattedQuestions = parsedQuestions.map((q: any, idx: number) => ({
        slNo: q.sNo || q.slNo || idx + 1,
        checkpoint: q.displayLabel,
        category: q.category || "",
        documentsVerified:
          q.documentsVerified ||
          q.consideration ||
          q.whatToLookFor ||
          q.method ||
          "",
        fieldKey: q.fieldKey,
        fieldType: q.fieldType,
        maxRating: q.maxRating || 4,
      }));

      setQuestions(formattedQuestions);

      const initialScores: Record<number, number | null> = {};
      const initialComments: Record<number, string> = {};
      formattedQuestions.forEach((q: any) => {
        initialScores[q.slNo] = null;
        initialComments[q.slNo] = "";
      });

      setFormData((prev) => ({
        ...prev,
        scores: { ...prev.scores, ...initialScores },
        comments: { ...prev.comments, ...initialComments },
      }));
    } catch (error) {
      console.error("Error fetching 5S questions from backend:", error);
      addToast("Failed to load audit questions from database", "error");
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchQuestionsFromBackend();
    fetchAuditorSignature();
    fetchAuditorLocation();

    const currentTime = new Date();
    const formattedDate = currentTime.toISOString().split("T")[0];

    let decodedDepartment = "";
    if (
      urlDepartment &&
      urlDepartment !== "undefined" &&
      urlDepartment !== "null"
    ) {
      try {
        decodedDepartment = decodeURIComponent(String(urlDepartment));
      } catch (e) {
        decodedDepartment = String(urlDepartment);
      }
    }
    let decodedAuditeeName = "";
    if (
      urlAuditeeName &&
      urlAuditeeName !== "undefined" &&
      urlAuditeeName !== "null"
    ) {
      try {
        decodedAuditeeName = decodeURIComponent(String(urlAuditeeName));
      } catch (e) {
        decodedAuditeeName = String(urlAuditeeName);
      }
    }
    let decodedLocation = "";
    if (urlLocation && urlLocation !== "undefined" && urlLocation !== "null") {
      try {
        decodedLocation = decodeURIComponent(String(urlLocation));
      } catch (e) {
        decodedLocation = String(urlLocation);
      }
    }

    const auditorIdValue = user?.id
      ? typeof user.id === "string"
        ? parseInt(user.id)
        : user.id
      : null;

    setFormData((prev) => ({
      ...prev,
      documentNumber: generateDocumentNumber(sheetKey),
      date: formattedDate,
      auditorName: user?.name || "",
      auditorId: auditorIdValue,
      department: decodedDepartment || prev.department,
      area: decodedLocation || prev.area,
    }));

    if (urlAuditeeId || urlAuditeeName) {
      setAuditeeInfo((prev) => ({
        ...prev,
        auditeeId: urlAuditeeId
          ? parseInt(String(urlAuditeeId))
          : prev.auditeeId,
        auditeeName: decodedAuditeeName || prev.auditeeName,
      }));
    }
  }, []);

  useEffect(() => {
    if (editId && questions.length > 0) {
      loadAuditData();
    } else if (!editId && questions.length > 0) {
      const docNumber = generateDocumentNumber(sheetKey);
      setFormData((prev) => ({ ...prev, documentNumber: docNumber }));
    }
  }, [editId, questions]);

  useEffect(() => {
    if (user?.id && !editId) {
      setFormData((prev) => ({ ...prev, auditorName: user.name || "" }));
    }
  }, [user, editId]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const response = await auditScheduleApi.getAuditResponse(
        parseInt(String(editId)),
      );
      const audit = response.data;
      if (audit) {
        setResponseId(audit.id ?? null);
        let answers: any = {};
        try {
          answers =
            typeof audit.answers === "string"
              ? JSON.parse(audit.answers)
              : audit.answers || {};
        } catch (e) {
          answers = {};
        }

        const savedScores = answers.scores || {};
        const savedComments = answers.comments || {};
        const savedAuditeeName = answers.auditeeName || audit.auditeeName || "";
        const savedDepartment = answers.department || audit.department || "";

        setFormData((prev) => ({
          ...prev,
          documentNumber: answers.documentNumber || "",
          department: savedDepartment || prev.department,
          supervisor: answers.supervisor || "",
          area: answers.area || "",
          date: answers.date || audit.auditDate || prev.date,
          scores: savedScores,
          comments: savedComments,
          totalScore: answers.totalScore || audit.totalScore || 0,
          percentage: answers.percentage || audit.percentageScore || 0,
          status: audit.status || "IN_PROGRESS",
        }));

        setAuditeeInfo((prev) => ({
          ...prev,
          auditeeName: savedAuditeeName,
          auditeeId: audit.auditeeId || prev.auditeeId,
        }));

        auditLoaded.current = true;
      }
    } catch (error) {
      console.error("Error loading audit:", error);
      addToast("Failed to load audit data", "error");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date(formData.date);

    setShowDatePicker(Platform.OS === "ios");

    const formattedDate = currentDate.toISOString().split("T")[0];
    setFormData((prev) => ({ ...prev, date: formattedDate }));
  };

  const handleInputChange = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleScoreChange = (questionId: number, score: number) =>
    setFormData((prev) => ({
      ...prev,
      scores: { ...prev.scores, [questionId]: score },
    }));
  const handleCommentChange = (questionId: number, comment: string) =>
    setFormData((prev) => ({
      ...prev,
      comments: { ...prev.comments, [questionId]: comment },
    }));

  const calculateTotalScore = () => {
    let total = 0;
    questions.forEach((q) => {
      total += formData.scores[q.slNo] || 0;
    });
    return total;
  };

  const calculatePercentage = () => {
    const total = calculateTotalScore();
    const maxPossible = questions.length * 4;
    return maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  };

  const getSectionScore = (section: any) => {
    let total = 0;
    section.slNos.forEach((slNo: number) => {
      total += formData.scores[slNo] || 0;
    });
    return total;
  };

  const getSectionPercentage = (section: any) => {
    const score = getSectionScore(section);
    return Math.round((score / section.maxScore) * 100);
  };

  // ✅ UNIVERSAL NAVIGATION HANDLER
  const handleGoBack = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      router.back();
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id)
        throw new Error(
          "Check sheet not loaded. Please refresh and try again.",
        );

      const totalScore = calculateTotalScore();
      const maxPossibleScore = questions.length * 4;
      const percentage =
        maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const roundedPercentage = Math.round(percentage * 100) / 100;

      const answersObject = {
        documentNumber: formData.documentNumber,
        department: formData.department,
        supervisor: formData.supervisor,
        area: formData.area,
        date: formData.date,
        hodEmail: formData.hodEmail,
        scores: formData.scores,
        comments: formData.comments,
        totalScore: totalScore,
        percentage: roundedPercentage,
        auditorSignature: auditorSignatureImage || formData.auditorSignature,
        auditeeName: auditeeInfo.auditeeName,
        completedBy: formData.auditorName,
        formName: "5S Audit Checklist",
      };

      const auditorIdValue = formData.auditorId
        ? Number(formData.auditorId)
        : user?.id
          ? Number(user.id)
          : null;

      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: scheduleId ? parseInt(String(scheduleId)) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: auditorIdValue,
        auditeeId: auditeeInfo.auditeeId
          ? parseInt(String(auditeeInfo.auditeeId))
          : null,
        auditeeName: auditeeInfo.auditeeName,
        auditeeIds: auditeeInfo.auditeeIds,
        auditeeAcknowledged: false,
        answers: JSON.stringify(answersObject),
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore,
        percentageScore: roundedPercentage,
        summary: null,
        recommendations: null,
        status: "DRAFT",
      };

      let saved;
      if (responseId) {
        await auditScheduleApi.updateAuditResponse(responseId, payload);
        saved = { id: responseId };
        addToast("Draft updated successfully", "success");
      } else {
        const response = await auditScheduleApi.saveAuditResponse(payload);
        console.log("💾 Draft Save API Response:", response); // ✅ DEBUG LOG

        // ✅ FIX: Safely handle both { data: { id: ... } } and direct { id: ... } responses
        saved = response?.data || response;

        if (!saved || !saved.id) {
          throw new Error(
            "Failed to get ID from save response. Check console logs.",
          );
        }

        setResponseId(saved.id);
        addToast("Draft saved successfully", "success");

        if (props.onUpdateEditId) {
          props.onUpdateEditId(String(saved.id));
        } else {
          router.replace({
            pathname: "/FiveSAuditForm" as any,
            params: {
              edit: String(saved.id),
              scheduleId: scheduleId ? String(scheduleId) : undefined,
            },
          });
        }
      }
    } catch (error: any) {
      console.error("Error saving draft:", error);
      addToast(`Failed to save draft: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;

    const unanswered = questions.filter(
      (q) =>
        formData.scores[q.slNo] === undefined ||
        formData.scores[q.slNo] === null,
    );
    if (unanswered.length > 0) {
      addToast(
        `Please rate all ${unanswered.length} remaining questions`,
        "error",
      );
      setCurrentStep(2);
      setCurrentCheckpointIndex(
        questions.findIndex((q) => formData.scores[q.slNo] === undefined),
      );
      return;
    }

    if (!auditeeInfo.auditeeName?.trim()) {
      addToast("Please enter auditee name", "error");
      setCurrentStep(3);
      return;
    }

    if (!auditorSignatureImage && !formData.auditorSignature.trim()) {
      addToast("Please provide auditor signature", "error");
      setCurrentStep(3);
      return;
    }

    setSaving(true);
    try {
      if (!currentCheckSheet || !currentCheckSheet.id)
        throw new Error(
          "Check sheet not loaded. Please refresh and try again.",
        );

      const totalScore = calculateTotalScore();
      const maxPossibleScore = questions.length * 4;
      const percentage =
        maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      const roundedPercentage = Math.round(percentage * 100) / 100;

      const answersObject = {
        documentNumber: formData.documentNumber,
        department: formData.department,
        supervisor: formData.supervisor,
        area: formData.area,
        date: formData.date,
        hodEmail: formData.hodEmail,
        scores: formData.scores,
        comments: formData.comments,
        totalScore: totalScore,
        percentage: roundedPercentage,
        auditorSignature: auditorSignatureImage || formData.auditorSignature,
        auditeeName: auditeeInfo.auditeeName,
        completedBy: formData.auditorName,
        formName: "5S Audit Checklist",
      };

      const auditorIdValue = formData.auditorId
        ? Number(formData.auditorId)
        : user?.id
          ? Number(user.id)
          : null;

      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: scheduleId ? parseInt(String(scheduleId)) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: auditorIdValue,
        auditeeId: auditeeInfo.auditeeId
          ? parseInt(String(auditeeInfo.auditeeId))
          : null,
        auditeeName: auditeeInfo.auditeeName,
        auditeeIds: auditeeInfo.auditeeIds,
        auditeeAcknowledged: false,
        answers: JSON.stringify(answersObject),
        totalScore: totalScore,
        maxPossibleScore: maxPossibleScore,
        percentageScore: roundedPercentage,
        summary: null,
        recommendations: null,
        status: "SUBMITTED",
      };

      let saved;
      if (responseId) {
        await auditScheduleApi.updateAuditResponse(responseId, payload);
        await auditScheduleApi.submitAuditResponse(responseId);
        saved = { id: responseId };
      } else {
        const response = await auditScheduleApi.saveAuditResponse(payload);
        console.log("🚀 Submit Save API Response:", response); // ✅ DEBUG LOG

        // ✅ FIX: Safely handle both { data: { id: ... } } and direct { id: ... } responses
        saved = response?.data || response;

        if (!saved || !saved.id) {
          throw new Error(
            "Failed to get ID from submit response. Check console logs.",
          );
        }

        setResponseId(saved.id);
        await auditScheduleApi.submitAuditResponse(saved.id);
      }

      let ratingText = "";
      if (roundedPercentage >= 90) ratingText = "Excellent!";
      else if (roundedPercentage >= 75) ratingText = "Good";
      else if (roundedPercentage >= 60) ratingText = "Needs Improvement";
      else ratingText = "Poor - Immediate Action Required";

      addToast(
        `5S Audit submitted! Score: ${totalScore}/${maxPossibleScore} (${roundedPercentage}%) - ${ratingText}`,
        "success",
      );

      if (props.onClose) {
        props.onClose();
      } else {
        router.replace("/auditor");
      }
    } catch (error: any) {
      console.error("Error submitting audit:", error);
      addToast(`Failed to submit audit: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = () => {
    const sampleComments = [
      "All unnecessary items removed. Work area well organized.",
      "No tripping hazards. Excellent cable management.",
      "Inventory optimized. Only required parts in stock.",
      "No unnecessary documents on walls. Information boards organized.",
      "Tools placed in ergonomic locations. Shadow boards excellent.",
    ];
    const scores = [
      4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 3, 4, 4,
      4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
    ];
    questions.forEach((q, idx) => {
      handleScoreChange(q.slNo, scores[idx % scores.length]);
      handleCommentChange(q.slNo, sampleComments[idx % sampleComments.length]);
    });
    addToast("Demo data filled successfully", "success");
  };

  const getProgressStats = () => {
    const total = questions.length;
    const rated = Object.keys(formData.scores).filter(
      (key) =>
        formData.scores[Number(key)] !== null &&
        formData.scores[Number(key)] !== undefined,
    ).length;
    const totalScore = calculateTotalScore();
    const maxScore = questions.length * 4;
    const percentage =
      totalScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return { total, rated, totalScore, maxScore, percentage };
  };

  const stats = getProgressStats();
  const allQuestionsRated = stats.rated === stats.total;
  const currentQ = questions[currentCheckpointIndex];

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const nextCheckpoint = () => {
    if (currentCheckpointIndex < questions.length - 1) {
      setCurrentCheckpointIndex(currentCheckpointIndex + 1);
      scrollToTop();
    }
  };

  const prevCheckpoint = () => {
    if (currentCheckpointIndex > 0) {
      setCurrentCheckpointIndex(currentCheckpointIndex - 1);
      scrollToTop();
    }
  };

  const navigateToCheckpoint = (index: number) => {
    setCurrentCheckpointIndex(index);
    scrollToTop();
  };

  const getCurrentSection = () =>
    FIVE_S_SECTIONS.find((s) => s.slNos.includes(currentQ?.slNo));

  const getScoreColor = (score: number | null | undefined) => {
    if (score === 4) return "border-emerald-500";
    if (score === 3) return "border-lime-500";
    if (score === 2) return "border-amber-500";
    if (score === 1) return "border-orange-500";
    if (score === 0) return "border-rose-500";
    return "border-slate-200";
  };

  const steps = [
    { number: 1, title: "General Info", icon: User },
    { number: 2, title: "5S Checkpoints", icon: ClipboardList },
    { number: 3, title: "Signature & Submit", icon: PenTool },
  ];

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setCurrentCheckpointIndex(0);
      scrollToTop();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCurrentCheckpointIndex(0);
      scrollToTop();
    }
  };

  const currentSection = getCurrentSection();
  const shiftOptions = ["Morning", "Evening", "Night", "General"];

  if (loadingQuestions) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <ActivityIndicator
            size="large"
            color={NAVBAR_COLORS.primary}
            className="mb-4"
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading 5S audit questions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <ActivityIndicator
            size="large"
            color={NAVBAR_COLORS.primary}
            className="mb-4"
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading audit data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <Text className="mb-2 text-2xl font-bold text-slate-800">
            No Questions Found
          </Text>
          <Text className="mb-4 text-sm text-center text-slate-500">
            No checkpoints available for 5S audit.
          </Text>
          <TouchableOpacity
            onPress={handleGoBack}
            className="px-5 py-2.5 rounded-xl shadow-md"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <Text className="text-sm font-medium text-white">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
      {/* ✅ FIX: Only use 'padding' for iOS. 'undefined' prevents Web layout breaks */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          // ✅ FIX: Remove flexGrow: 1. Use minHeight for reliable cross-platform scrolling
          contentContainerStyle={{
            minHeight: "100%",
            paddingBottom: 40,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={true} // Turned ON temporarily so you can visually confirm scrolling works
          keyboardShouldPersistTaps="handled"
        >
          {/* ✅ DESKTOP/MOBILE RESPONSIVE CONTAINER */}
          <View
            style={{
              maxWidth: 900,
              width: "100%",
              alignSelf: "center",
            }}
          >
            {/* Header */}
            <FadeInView delay={0}>
              <View className="flex-row items-center justify-between mb-8">
                <TouchableOpacity
                  onPress={handleGoBack}
                  className="flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm"
                >
                  <ArrowLeft size={16} color="#334155" />
                  <Text className="text-sm font-medium text-slate-700">
                    Back
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center gap-3">
                  {currentStep === 2 && (
                    <TouchableOpacity
                      onPress={handleAutoFill}
                      className="flex-row items-center gap-2 px-4 py-2.5 rounded-xl shadow-md"
                      style={{ backgroundColor: NAVBAR_COLORS.secondary }}
                    >
                      <Sparkles size={16} color="#ffffff" />
                      <Text className="text-sm font-medium text-white">
                        Auto-Fill
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={saveDraft}
                    disabled={saving}
                    className="flex-row items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm disabled:opacity-50"
                  >
                    <Save size={16} color="#334155" />
                    <Text className="text-sm font-medium text-slate-700">
                      {saving ? "Saving..." : "Save Draft"}
                    </Text>
                  </TouchableOpacity>
                  {currentStep === 3 && (
                    <TouchableOpacity
                      onPress={() => {
                        isManualSubmitRef.current = true;
                        submitAudit();
                      }}
                      disabled={!allQuestionsRated || saving}
                      className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl shadow-md ${allQuestionsRated && !saving ? "" : "opacity-50"}`}
                      style={{
                        backgroundColor:
                          allQuestionsRated && !saving
                            ? NAVBAR_COLORS.primary
                            : "#94a3b8",
                      }}
                    >
                      <Send size={16} color="#ffffff" />
                      <Text className="text-sm font-medium text-white">
                        Submit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </FadeInView>

            {/* Step Progress Bar */}
            <FadeInView delay={100}>
              <View className="flex-row items-center justify-between mb-8">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  let isClickable = false;
                  if (step.number < currentStep) isClickable = true;
                  else if (step.number === 2 && currentStep === 1)
                    isClickable = true;
                  else if (step.number === 3 && currentStep === 2)
                    isClickable = true;

                  // Shorten title for mobile to prevent squishing (e.g., "General Info" -> "General")
                  const mobileTitle = step.title.split(" ")[0];

                  return (
                    <React.Fragment key={step.number}>
                      <TouchableOpacity
                        onPress={() =>
                          isClickable && setCurrentStep(step.number)
                        }
                        disabled={!isClickable}
                        className={`flex-row items-center flex-1 ${isClickable ? "" : "opacity-70"}`}
                      >
                        <View
                          className={`w-9 h-9 rounded-xl items-center justify-center shadow-sm ${isActive || isCompleted ? "bg-[#00529B]" : "bg-slate-100"}`}
                        >
                          {isCompleted ? (
                            <CheckCircle size={18} color="#ffffff" />
                          ) : (
                            <Icon
                              size={18}
                              color={
                                isActive || isCompleted ? "#ffffff" : "#64748b"
                              }
                            />
                          )}
                        </View>

                        <View className="flex-1 ml-2">
                          <Text className="text-[10px] font-medium text-slate-500">
                            Step {step.number}
                          </Text>
                          <Text
                            className={`text-xs font-semibold leading-tight ${isActive ? "text-slate-800" : "text-slate-600"}`}
                            numberOfLines={1}
                          >
                            {/* ✅ Use full title on desktop, short title on mobile */}
                            {isDesktop ? step.title : mobileTitle}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* ✅ FIX: Responsive connecting line */}
                      {step.number < steps.length && (
                        <View
                          className={`h-0.5 mx-2 ${isCompleted ? "bg-[#3b82f6]" : "bg-slate-200"}`}
                          style={{
                            flex: isDesktop ? 1 : 0,
                            width: isDesktop ? undefined : 24, // Stretches on desktop, fixed 24px on mobile
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </FadeInView>
            {/* Step 1: General Information */}
            {currentStep === 1 && (
              <FadeInView delay={200}>
                <View className="mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View
                    className="flex-row items-center gap-3 p-6 border-b border-slate-100"
                    style={{ backgroundColor: NAVBAR_COLORS.bg }}
                  >
                    <View
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: NAVBAR_COLORS.lighter }}
                    >
                      <Sparkles size={20} color={NAVBAR_COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-slate-800">
                        5S Audit - General Info
                      </Text>
                      <Text className="text-xs text-slate-500 mt-0.5">
                        Workplace Organization Audit
                      </Text>
                    </View>
                  </View>

                  <View className="p-6">
                    {/* Two-column layout for desktop, single for mobile */}
                    <View
                      className={`flex-row flex-wrap ${isDesktop ? "" : ""}`}
                    >
                      {/* Audit Number - Full width */}
                      <View className={isDesktop ? "w-1/2 pr-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Audit Number
                          </Text>
                          <TextInput
                            value={formData.documentNumber}
                            editable={false}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                          />
                        </View>
                      </View>

                      {/* Department - Full width */}
                      <View className={isDesktop ? "w-1/2 pl-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Department <Text className="text-rose-500">*</Text>
                          </Text>
                          <TextInput
                            value={formData.department}
                            onChangeText={(val) =>
                              handleInputChange("department", val)
                            }
                            placeholder="Department"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                          />
                          {scheduleId && (
                            <Text
                              className="mt-1 text-xs font-medium"
                              style={{ color: NAVBAR_COLORS.secondary }}
                            >
                              ✓ Pre-filled from schedule
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Auditor - Full width */}
                      <View className={isDesktop ? "w-1/2 pr-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Auditor (Supervisor)
                          </Text>
                          <TextInput
                            value={formData.auditorName}
                            editable={false}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                          />
                        </View>
                      </View>

                      {/* Date - Full width */}
                      <View className={isDesktop ? "w-1/2 pl-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Date <Text className="text-rose-500">*</Text>
                          </Text>

                          {/* ✅ WEB: Native HTML date input with showPicker() fix */}
                          {Platform.OS === "web" ? (
                            <input
                              type="date"
                              value={formData.date}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  date: e.target.value,
                                }))
                              }
                              onClick={(e) => {
                                // ✅ This forces the calendar to open when clicking ANYWHERE in the field on Web
                                const target = e.target as HTMLInputElement;
                                if (target.showPicker) {
                                  target.showPicker();
                                }
                              }}
                              className="w-5xl px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-1 focus:ring-black cursor-pointer"
                              style={{
                                fontFamily: "inherit",
                                fontSize: "inherit",
                              }}
                            />
                          ) : (
                            /* ✅ MOBILE (iOS/Android): Custom Button + DateTimePicker */
                            <>
                              <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl flex-row items-center justify-between"
                                activeOpacity={0.7}
                              >
                                {/* ✅ flex-1 ensures the text area also registers the touch */}
                                <Text
                                  className={`flex-1 ${formData.date ? "text-slate-800" : "text-slate-400"}`}
                                >
                                  {formData.date || "Select Date"}
                                </Text>
                                <Calendar size={18} color="#94a3b8" />
                              </TouchableOpacity>

                              {showDatePicker && (
                                <DateTimePicker
                                  value={new Date(formData.date)}
                                  mode="date"
                                  display={
                                    Platform.OS === "ios"
                                      ? "spinner"
                                      : "default"
                                  }
                                  onChange={(event, selectedDate) => {
                                    if (event.type === "dismissed") {
                                      setShowDatePicker(false);
                                      return;
                                    }

                                    if (selectedDate) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        date: selectedDate
                                          .toISOString()
                                          .split("T")[0],
                                      }));
                                    }

                                    setShowDatePicker(false);
                                  }}
                                />
                              )}
                            </>
                          )}
                        </View>
                      </View>

                      {/* Area/Location - Full width */}
                      <View className={isDesktop ? "w-1/2 pr-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Specific Area/Location
                          </Text>
                          <TextInput
                            value={formData.area}
                            onChangeText={(val) =>
                              handleInputChange("area", val)
                            }
                            placeholder="e.g., Assembly Line"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                          />
                        </View>
                      </View>

                      {/* Shift - Full width */}
                      <View className={isDesktop ? "w-1/2 pl-2" : "w-full"}>
                        <View className="mb-5">
                          <Text className="text-sm font-medium text-slate-700 mb-1.5">
                            Shift
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            {shiftOptions.map((shift) => (
                              <TouchableOpacity
                                key={shift}
                                onPress={() =>
                                  handleInputChange("shift", shift)
                                }
                                className={`px-4 py-2 rounded-lg border ${formData.shift === shift ? "bg-[#00529B] border-[#00529B]" : "bg-white border-slate-200"}`}
                              >
                                <Text
                                  className={`text-sm font-medium ${formData.shift === shift ? "text-white" : "text-slate-700"}`}
                                >
                                  {shift}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Rating Scale - Full width */}
                      <View className="w-full">
                        <View
                          className="p-4 mt-2 border rounded-xl"
                          style={{
                            backgroundColor: NAVBAR_COLORS.bg,
                            borderColor: NAVBAR_COLORS.lighter,
                          }}
                        >
                          <Text
                            className="mb-3 text-sm font-bold"
                            style={{ color: NAVBAR_COLORS.dark }}
                          >
                            Rating Scale:
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            {[
                              {
                                label: "0 = No",
                                color: "border-rose-200 bg-white text-rose-700",
                              },
                              {
                                label: "1 = Very Little",
                                color:
                                  "border-orange-200 bg-white text-orange-700",
                              },
                              {
                                label: "2 = Some",
                                color:
                                  "border-amber-200 bg-white text-amber-700",
                              },
                              {
                                label: "3 = Significant",
                                color: "border-lime-200 bg-white text-lime-700",
                              },
                              {
                                label: "4 = Total",
                                color:
                                  "border-emerald-200 bg-white text-emerald-700",
                              },
                            ].map((item, idx) => (
                              <View
                                key={idx}
                                className={`px-3 py-2 border rounded-lg ${item.color}`}
                              >
                                <Text className="text-xs font-medium">
                                  {item.label}
                                </Text>
                              </View>
                            ))}
                          </View>
                          <Text className="mt-3 text-xs font-medium text-slate-500">
                            Max Score: 4 points per question | Total Max: 144
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row justify-end p-6 pt-0">
                    <TouchableOpacity
                      onPress={nextStep}
                      className="flex-row items-center gap-2 px-6 py-2.5 rounded-xl shadow-md"
                      style={{ backgroundColor: NAVBAR_COLORS.primary }}
                    >
                      <Text className="text-sm font-medium text-white">
                        Next Step
                      </Text>
                      <ChevronRight size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeInView>
            )}

            {/* Step 2: 5S Checkpoints */}
            {currentStep === 2 && currentQ && (
              <FadeInView delay={200}>
                <View className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-3">
                      <Text className="text-sm font-medium text-slate-600">
                        Checkpoint {currentCheckpointIndex + 1} of{" "}
                        {questions.length}
                      </Text>
                      {currentSection && (
                        <View
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: NAVBAR_COLORS.bg }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: NAVBAR_COLORS.primary }}
                          >
                            {currentSection.name} (Max:{" "}
                            {currentSection.maxScore})
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row gap-4">
                      <View className="flex-row items-center gap-1.5">
                        <Star size={12} color={NAVBAR_COLORS.primary} />
                        <Text
                          className="text-xs font-medium"
                          style={{ color: NAVBAR_COLORS.primary }}
                        >
                          Score: {stats.totalScore}/{stats.maxScore}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <TrendingUp size={12} color="#64748b" />
                        <Text className="text-xs font-medium text-slate-500">
                          {stats.percentage}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="pb-2"
                  >
                    <View className="flex-row gap-2">
                      {questions.map((q, idx) => {
                        const hasScore =
                          formData.scores[q.slNo] !== undefined &&
                          formData.scores[q.slNo] !== null;
                        const score = formData.scores[q.slNo];
                        let bgColor = "#f8fafc",
                          borderColor = "#e2e8f0",
                          textColor = "#64748b";

                        if (currentCheckpointIndex === idx) {
                          bgColor = NAVBAR_COLORS.primary;
                          borderColor = NAVBAR_COLORS.primary;
                          textColor = "#ffffff";
                        } else if (hasScore) {
                          if (score === 4) {
                            bgColor = "#dcfce7";
                            borderColor = "#86efac";
                            textColor = "#166534";
                          } else if (score === 3) {
                            bgColor = "#ecfccb";
                            borderColor = "#bef264";
                            textColor = "#3f6212";
                          } else if (score === 2) {
                            bgColor = "#fef9c3";
                            borderColor = "#fde047";
                            textColor = "#854d0e";
                          } else if (score === 1) {
                            bgColor = "#ffedd5";
                            borderColor = "#fdba74";
                            textColor = "#9a3412";
                          } else {
                            bgColor = "#fee2e2";
                            borderColor = "#fca5a5";
                            textColor = "#991b1b";
                          }
                        }

                        return (
                          <TouchableOpacity
                            key={q.slNo}
                            onPress={() => navigateToCheckpoint(idx)}
                            className="items-center justify-center flex-shrink-0 border rounded-lg w-9 h-9"
                            style={{
                              backgroundColor: bgColor,
                              borderColor,
                              borderWidth: 1,
                            }}
                          >
                            <Text
                              className="text-sm font-medium"
                              style={{ color: textColor }}
                            >
                              {idx + 1}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View
                  className={`bg-white border shadow-sm rounded-2xl overflow-hidden border-l-4 ${getScoreColor(formData.scores[currentQ.slNo])}`}
                >
                  <View className="p-6">
                    <View className="flex-row flex-wrap items-center justify-between gap-3 mb-5">
                      <View className="flex-row items-center gap-3">
                        <View
                          className="items-center justify-center w-10 h-10 shadow-md rounded-xl"
                          style={{ backgroundColor: NAVBAR_COLORS.primary }}
                        >
                          <Text className="font-bold text-white">
                            {currentQ.slNo}
                          </Text>
                        </View>
                        {currentSection && (
                          <View
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: NAVBAR_COLORS.bg }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{ color: NAVBAR_COLORS.primary }}
                            >
                              {currentSection.name}
                            </Text>
                          </View>
                        )}
                        {formData.scores[currentQ.slNo] !== undefined &&
                          formData.scores[currentQ.slNo] !== null && (
                            <View className="px-3 py-1 border rounded-full bg-slate-100 border-slate-200">
                              <Text className="text-xs font-semibold text-slate-700">
                                Score: {formData.scores[currentQ.slNo]}/4
                              </Text>
                            </View>
                          )}
                      </View>
                    </View>

                    <Text className="mb-4 text-lg font-bold text-slate-800">
                      {currentQ.checkpoint}
                    </Text>

                    {currentQ.documentsVerified ? (
                      <View
                        className="p-4 mb-5 border rounded-xl"
                        style={{
                          backgroundColor: NAVBAR_COLORS.bg,
                          borderColor: NAVBAR_COLORS.lighter,
                        }}
                      >
                        <Text
                          className="mb-1 text-sm font-bold"
                          style={{ color: NAVBAR_COLORS.dark }}
                        >
                          What to look for:
                        </Text>
                        <Text className="text-sm text-slate-600">
                          {currentQ.documentsVerified}
                        </Text>
                      </View>
                    ) : null}

                    <View className="mb-6">
                      <Text className="mb-3 text-sm font-bold text-slate-700">
                        Level of Judgment (Score){" "}
                        <Text className="text-rose-500">*</Text>
                      </Text>
                      <View className="flex-row flex-wrap justify-between gap-3">
                        {SCORE_OPTIONS.map((option) => {
                          const isSelected =
                            formData.scores[currentQ.slNo] === option.value;
                          let bg = "#ffffff",
                            border = "#e2e8f0",
                            text = "#64748b";
                          if (isSelected) {
                            if (option.value === 4) {
                              bg = "#dcfce7";
                              border = "#22c55e";
                              text = "#166534";
                            } else if (option.value === 3) {
                              bg = "#ecfccb";
                              border = "#84cc16";
                              text = "#3f6212";
                            } else if (option.value === 2) {
                              bg = "#fef9c3";
                              border = "#eab308";
                              text = "#854d0e";
                            } else if (option.value === 1) {
                              bg = "#ffedd5";
                              border = "#f97316";
                              text = "#9a3412";
                            } else {
                              bg = "#fee2e2";
                              border = "#ef4444";
                              text = "#991b1b";
                            }
                          }
                          return (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() =>
                                handleScoreChange(currentQ.slNo, option.value)
                              }
                              className="flex-1 min-w-[60px] p-3 items-center border-2 rounded-xl shadow-sm"
                              style={{
                                backgroundColor: bg,
                                borderColor: isSelected ? border : "#e2e8f0",
                              }}
                            >
                              <Text
                                className="text-2xl font-bold"
                                style={{ color: isSelected ? text : "#64748b" }}
                              >
                                {option.short}
                              </Text>
                              <Text
                                className="text-[10px] font-medium mt-1 text-center"
                                style={{ color: isSelected ? text : "#64748b" }}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View className="mb-6">
                      <Text className="mb-2 text-sm font-bold text-slate-700">
                        Comments / Actions to be taken
                      </Text>
                      <TextInput
                        value={formData.comments[currentQ.slNo] || ""}
                        onChangeText={(val) =>
                          handleCommentChange(currentQ.slNo, val)
                        }
                        placeholder="Enter comments or actions..."
                        multiline
                        numberOfLines={3}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-800"
                        style={{ textAlignVertical: "top" }}
                      />
                    </View>

                    <View className="flex-row items-center justify-between pt-5 mt-5 border-t border-slate-100">
                      <TouchableOpacity
                        onPress={prevCheckpoint}
                        disabled={currentCheckpointIndex === 0}
                        className="flex-row items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 shadow-sm"
                      >
                        <ChevronLeft size={16} color="#334155" />
                        <Text className="text-sm font-medium text-slate-700">
                          Previous
                        </Text>
                      </TouchableOpacity>

                      <View>
                        {formData.scores[currentQ.slNo] !== undefined &&
                        formData.scores[currentQ.slNo] !== null ? (
                          <View className="flex-row items-center gap-1.5">
                            <CheckCircle size={14} color="#059669" />
                            <Text className="text-sm font-medium text-emerald-600">
                              Rated: {formData.scores[currentQ.slNo]}/4
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1.5">
                            <AlertCircle size={14} color="#d97706" />
                            <Text className="text-sm font-medium text-amber-600">
                              Select Score
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={nextCheckpoint}
                        disabled={
                          currentCheckpointIndex === questions.length - 1
                        }
                        className="flex-row items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-50 shadow-md"
                        style={{ backgroundColor: NAVBAR_COLORS.primary }}
                      >
                        <Text className="text-sm font-medium text-white">
                          Next
                        </Text>
                        <ChevronRight size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View className="p-5 mt-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                      <Star size={16} color={NAVBAR_COLORS.secondary} />
                      <Text className="text-sm font-bold text-slate-700">
                        Overall 5S Score
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className="text-2xl font-bold"
                        style={{ color: NAVBAR_COLORS.primary }}
                      >
                        {stats.totalScore}
                      </Text>
                      <Text className="text-sm text-slate-500">
                        {" "}
                        / {stats.maxScore} ({stats.percentage}%)
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap justify-between gap-3 mt-4">
                    {FIVE_S_SECTIONS.map((section) => {
                      const sectionScore = getSectionScore(section);
                      const percentage = getSectionPercentage(section);
                      return (
                        <View
                          key={section.name}
                          className="flex-1 min-w-[60px] p-3 bg-slate-50 border border-slate-100 rounded-xl items-center"
                        >
                          <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                            {section.name}
                          </Text>
                          <Text className="mt-1 text-lg font-bold text-slate-800">
                            {sectionScore}
                          </Text>
                          <Text className="text-[10px] text-slate-400">
                            / {section.maxScore}
                          </Text>
                          <View className="w-full h-1.5 mt-2 bg-slate-200 rounded-full overflow-hidden">
                            <View
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: NAVBAR_COLORS.secondary,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {!allQuestionsRated && (
                    <View className="items-center p-3 mt-4 border border-amber-200 rounded-xl bg-amber-50">
                      <Text className="text-xs font-medium text-center text-amber-700">
                        ⚠️ Please rate all {stats.total - stats.rated} remaining
                        checkpoints
                      </Text>
                    </View>
                  )}
                </View>

                {allQuestionsRated && (
                  <View className="flex-row justify-end mt-6 mb-8">
                    <TouchableOpacity
                      onPress={nextStep}
                      className="flex-row items-center gap-2 px-6 py-2.5 rounded-xl shadow-md"
                      style={{ backgroundColor: NAVBAR_COLORS.primary }}
                    >
                      <Text className="text-sm font-medium text-white">
                        Next: Signature
                      </Text>
                      <ChevronRight size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </FadeInView>
            )}

            {/* Step 3: Signature & Submit */}
            {currentStep === 3 && (
              <FadeInView delay={200}>
                <View className="mb-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View
                    className="p-6 border-b border-slate-100"
                    style={{ backgroundColor: NAVBAR_COLORS.bg }}
                  >
                    <Text className="text-lg font-bold text-slate-800">
                      Signature & Submit
                    </Text>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Review, sign and submit the 5S audit report
                    </Text>
                  </View>

                  <View className="gap-6 p-6">
                    <View
                      className="p-5 border rounded-xl"
                      style={{
                        backgroundColor: NAVBAR_COLORS.bg,
                        borderColor: NAVBAR_COLORS.lighter,
                      }}
                    >
                      <Text
                        className="mb-4 text-sm font-bold"
                        style={{ color: NAVBAR_COLORS.dark }}
                      >
                        Audit Summary
                      </Text>
                      <View className="flex-row flex-wrap justify-between gap-4">
                        {[
                          {
                            label: "Total Questions",
                            value: stats.total.toString(),
                            color: "text-slate-800",
                          },
                          {
                            label: "Total Score",
                            value: stats.totalScore.toString(),
                            color: "text-[#00529B]",
                          },
                          {
                            label: "Max Possible",
                            value: stats.maxScore.toString(),
                            color: "text-slate-800",
                          },
                          {
                            label: "Percentage",
                            value: `${stats.percentage}%`,
                            color: "text-slate-800",
                          },
                        ].map((item, idx) => (
                          <View
                            key={idx}
                            className="flex-1 min-w-[70px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm"
                          >
                            <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                              {item.label}
                            </Text>
                            <Text
                              className={`mt-1 text-xl font-bold ${item.color}`}
                            >
                              {item.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View>
                      <View className="flex-row items-center mb-2">
                        <FileCheck size={14} color="#334155" />
                        <Text className="ml-1 text-sm font-bold text-slate-700">
                          Auditor Signature{" "}
                          <Text className="text-rose-500">*</Text>
                        </Text>
                      </View>

                      {loadingSignature ? (
                        <View className="flex-row items-center justify-center p-5 border border-slate-200 rounded-xl bg-slate-50">
                          <ActivityIndicator
                            size="small"
                            color={NAVBAR_COLORS.primary}
                          />
                          <Text className="ml-2 text-sm font-medium text-slate-500">
                            Loading signature...
                          </Text>
                        </View>
                      ) : auditorSignatureImage ? (
                        <View
                          className="items-center p-5 border rounded-xl"
                          style={{
                            backgroundColor: NAVBAR_COLORS.bg,
                            borderColor: NAVBAR_COLORS.lighter,
                          }}
                        >
                          <Image
                            source={{ uri: auditorSignatureImage }}
                            style={{
                              width: 200,
                              height: 80,
                              resizeMode: "contain",
                              marginBottom: 8,
                              // ✅ Added backgroundColor to ensure it's visible if the signature is white/transparent
                              backgroundColor: "#ffffff",
                              borderRadius: 4,
                            }}
                          />
                          <Text
                            className="text-xs font-medium"
                            style={{ color: NAVBAR_COLORS.secondary }}
                          >
                            ✓ Signature loaded from profile
                          </Text>
                        </View>
                      ) : signatureError ? (
                        <View className="p-5 border rounded-xl bg-amber-50 border-amber-200">
                          <View className="flex-row items-center gap-2 mb-2">
                            <AlertTriangle size={16} color="#b45309" />
                            <Text className="text-sm font-medium text-amber-700">
                              No signature found in profile
                            </Text>
                          </View>
                          <Text className="mb-3 text-xs text-slate-600">
                            Please upload your signature in profile settings.
                            You can still proceed with typed signature below.
                          </Text>
                          <TextInput
                            value={formData.auditorSignature}
                            onChangeText={(val) =>
                              handleInputChange("auditorSignature", val)
                            }
                            placeholder="Type your full name as signature (fallback)"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                          />
                        </View>
                      ) : (
                        <View className="p-5 border rounded-xl bg-slate-50 border-slate-200">
                          <Text className="mb-3 text-sm font-medium text-slate-500">
                            No signature loaded. Please type your signature
                            below.
                          </Text>
                          <TextInput
                            value={formData.auditorSignature}
                            onChangeText={(val) =>
                              handleInputChange("auditorSignature", val)
                            }
                            placeholder="Type your full name as signature"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                          />
                        </View>
                      )}
                    </View>

                    <View>
                      <View className="flex-row items-center mb-2">
                        <Calendar size={14} color="#334155" />
                        <Text className="ml-1 text-sm font-bold text-slate-700">
                          Date <Text className="text-rose-500">*</Text>
                        </Text>
                      </View>

                      {/* ✅ WEB: Native HTML date input with showPicker() fix */}
                      {Platform.OS === "web" ? (
                        <input
                          type="date"
                          value={formData.date}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          onClick={(e) => {
                            // ✅ This forces the calendar to open when clicking ANYWHERE in the field on Web
                            const target = e.target as HTMLInputElement;
                            if (target.showPicker) {
                              target.showPicker();
                            }
                          }}
                          className="w-5xl px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-black cursor-pointer"
                          style={{ fontFamily: "inherit", fontSize: "inherit" }}
                        />
                      ) : (
                        /* ✅ MOBILE (iOS/Android): Custom Button + DateTimePicker */
                        <>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl flex-row items-center justify-between"
                            activeOpacity={0.7}
                          >
                            {/* ✅ flex-1 ensures the text area also registers the touch */}
                            <Text
                              className={`flex-1 ${formData.date ? "text-slate-800" : "text-slate-400"}`}
                            >
                              {formData.date || "Select Date"}
                            </Text>
                            <Calendar size={18} color="#94a3b8" />
                          </TouchableOpacity>

                          {showDatePicker && (
                            <DateTimePicker
                              value={new Date(formData.date)}
                              mode="date"
                              display={
                                Platform.OS === "ios" ? "spinner" : "default"
                              }
                              onChange={(event, selectedDate) => {
                                if (event.type === "dismissed") {
                                  setShowDatePicker(false);
                                  return;
                                }

                                if (selectedDate) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    date: selectedDate
                                      .toISOString()
                                      .split("T")[0],
                                  }));
                                }

                                setShowDatePicker(false);
                              }}
                            />
                          )}
                        </>
                      )}
                    </View>

                    <View>
                      <View className="flex-row items-center mb-2">
                        <User size={14} color="#334155" />
                        <Text className="ml-1 text-sm font-bold text-slate-700">
                          Auditee Name <Text className="text-rose-500">*</Text>
                        </Text>
                      </View>
                      <TextInput
                        value={auditeeInfo.auditeeName}
                        onChangeText={(val) =>
                          setAuditeeInfo((prev) => ({
                            ...prev,
                            auditeeName: val,
                          }))
                        }
                        placeholder="Enter auditee name"
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                    </View>

                    <View className="flex-row items-center justify-between pt-6 mt-2 border-t border-slate-100">
                      <TouchableOpacity
                        onPress={prevStep}
                        className="flex-row items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm"
                      >
                        <ChevronLeft size={18} color="#334155" />
                        <Text className="text-sm font-medium text-slate-700">
                          Previous
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          isManualSubmitRef.current = true;
                          submitAudit();
                        }}
                        disabled={
                          (!auditorSignatureImage &&
                            !formData.auditorSignature.trim()) ||
                          !formData.date.trim() ||
                          !auditeeInfo.auditeeName?.trim() ||
                          saving ||
                          !allQuestionsRated
                        }
                        className={`flex-row items-center gap-2 px-6 py-2.5 rounded-xl shadow-md ${(!auditorSignatureImage && !formData.auditorSignature.trim()) || !formData.date.trim() || !auditeeInfo.auditeeName?.trim() || saving || !allQuestionsRated ? "opacity-50" : ""}`}
                        style={{
                          backgroundColor:
                            (!auditorSignatureImage &&
                              !formData.auditorSignature.trim()) ||
                            !formData.date.trim() ||
                            !auditeeInfo.auditeeName?.trim() ||
                            saving ||
                            !allQuestionsRated
                              ? "#94a3b8"
                              : NAVBAR_COLORS.primary,
                        }}
                      >
                        <Send size={18} color="#ffffff" />
                        <Text className="text-sm font-medium text-white">
                          {saving ? "Submitting..." : "Submit Audit Report"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </FadeInView>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
