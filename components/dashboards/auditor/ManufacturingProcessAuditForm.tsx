import { API_BASE_URL } from "@/config/apiConfig";
import { auditAPI } from "@/services/api";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock as ClockIcon,
  FileCheck,
  FileText,
  Flag,
  MapPin,
  PenTool,
  Save,
  Send,
  Sparkles,
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

// ✅ DYNAMIC API BASE

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

// STATUS OPTIONS
const STATUS_OPTIONS = [
  { value: "COMPLIANT", label: "Compliant", short: "C", icon: CheckCircle },
  { value: "MINOR", label: "Minor NC", short: "Minor", icon: AlertCircle },
  { value: "MAJOR", label: "Major NC", short: "Major", icon: AlertCircle },
  {
    value: "NOT_APPLICABLE",
    label: "Not Applicable",
    short: "N/A",
    icon: Flag,
  },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case "COMPLIANT":
      return { bg: "#ecfdf5", border: "#10b981", text: "#047857" };
    case "MINOR":
      return { bg: "#fffbeb", border: "#f59e0b", text: "#b45309" };
    case "MAJOR":
      return { bg: "#fff1f2", border: "#f43f5e", text: "#be123c" };
    case "NOT_APPLICABLE":
      return { bg: "#f8fafc", border: "#cbd5e1", text: "#64748b" };
    default:
      return { bg: "#ffffff", border: "#e2e8f0", text: "#64748b" };
  }
};

const generateDocumentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `AUD/QMS/MP/${year}${month}/${random}`;
};

const getWEFDate = () => new Date().toISOString().split("T")[0];
const getRevisionDate = () => new Date().toISOString().split("T")[0];
const getIssueDate = () => new Date().toISOString().split("T")[0];
const getRevisionNumber = () => "00";
const MANUFACTURING_CHECK_SHEET_ID = 1;

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

export default function ManufacturingProcessAuditForm(props: any) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const editId = props.editId || params.edit;
  const scheduleId = props.scheduleId || params.scheduleId;
  const urlAuditeeId = props.auditeeId || params.auditeeId;
  const urlAuditeeName = props.auditeeName || params.auditeeName;
  const urlDepartment = props.department || params.department;
  const urlLocation = props.location || params.location;

  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState<string | number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [sheetConfig, setSheetConfig] = useState<any>(null);
  const [auditorSignatureImage, setAuditorSignatureImage] =
    useState<string>("");
  const [auditorSignatureBase64, setAuditorSignatureBase64] =
    useState<string>("");
  const [showShiftDropdown, setShowShiftDropdown] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const shiftOptions = ["Morning", "Evening", "Night"];
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const auditLoaded = useRef(false);
  const isManualSubmitRef = useRef(false);

  const [formData, setFormData] = useState({
    documentNumber: "",
    auditNumber: "",
    wefDate: "",
    revNo: "",
    revDate: "",
    issueDate: "",
    department: "",
    partNumber: "",
    machine: "",
    date: "",
    shift: "Morning",
    time: "",
    location: "",
    auditorName: "",
    auditorId: null as number | null,
    auditeeName: "",
    auditeeId: null as number | null,
    hodEmail: "",
    status: "IN_PROGRESS",
    responses: {} as Record<number, string>,
    observations: {} as Record<number, string>,
    documentsVerified: {} as Record<number, string>,
    score: null as number | null,
    auditorSignature: "",
    createdAt: "",
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
    if (!user?.id) return "";
    let locationHierarchy = getLocationHierarchy(user);
    if (!locationHierarchy) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch user");
        const userData = await response.json();
        locationHierarchy = getLocationHierarchy(userData);
      } catch (error) {
        try {
          const allUsersRes = await fetch(`${API_BASE_URL}/api/users`, {
            credentials: "include",
          });
          if (!allUsersRes.ok) throw new Error("Fallback fetch failed");
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
    return locationHierarchy;
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
      if (signatureBase64 && signatureBase64.trim().length > 20) {
        const formattedUri = signatureBase64.startsWith("data:image")
          ? signatureBase64
          : `data:image/png;base64,${signatureBase64.trim()}`;
        setAuditorSignatureBase64(formattedUri);
        setAuditorSignatureImage(formattedUri);
        setFormData((prev) => ({ ...prev, auditorSignature: formattedUri }));
      } else {
        setSignatureError(true);
      }
    } catch (error) {
      console.error("❌ Error fetching signature:", error);
      setSignatureError(true);
    } finally {
      setLoadingSignature(false);
    }
  };

  const fetchQuestionsFromBackend = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${MANUFACTURING_CHECK_SHEET_ID}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch template");
      const checkSheet = await response.json();
      setSheetConfig(checkSheet);
      let parsedQuestions = [];
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
        checkpoint: q.displayLabel || q.checkpoint,
        clause: q.clauseNo || q.category || q.clause || "",
        consideration:
          q.consideration || q.whatToLookFor || q.documentsVerified || "",
        fieldKey: q.fieldKey,
        fieldType: q.fieldType || "rating",
        maxRating: q.maxRating || 4,
        category: q.category || "",
        method: q.method || "",
        frequency: q.frequency || "",
      }));
      setQuestions(formattedQuestions);
      const initialResponses: Record<number, string> = {};
      const initialObservations: Record<number, string> = {};
      const initialDocumentsVerified: Record<number, string> = {};
      formattedQuestions.forEach((q: any) => {
        initialResponses[q.slNo] = "";
        initialObservations[q.slNo] = "";
        initialDocumentsVerified[q.slNo] = "";
      });
      setFormData((prev) => ({
        ...prev,
        responses: { ...prev.responses, ...initialResponses },
        observations: { ...prev.observations, ...initialObservations },
        documentsVerified: {
          ...prev.documentsVerified,
          ...initialDocumentsVerified,
        },
      }));
    } catch (error) {
      console.error("Error fetching questions:", error);
      addToast("Failed to load audit questions", "error");
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    const initializeForm = async () => {
      fetchQuestionsFromBackend();
      fetchAuditorSignature();
      const currentTime = new Date();
      const formattedDate = currentTime.toISOString().split("T")[0];
      const formattedTime = currentTime.toLocaleTimeString();
      let decodedAuditeeName = "";
      if (urlAuditeeName && !["undefined", "null"].includes(urlAuditeeName)) {
        try {
          decodedAuditeeName = decodeURIComponent(String(urlAuditeeName));
        } catch (e) {
          decodedAuditeeName = String(urlAuditeeName);
        }
      }
      let decodedDepartment = "";
      if (urlDepartment && !["undefined", "null"].includes(urlDepartment)) {
        try {
          decodedDepartment = decodeURIComponent(String(urlDepartment));
        } catch (e) {
          decodedDepartment = String(urlDepartment);
        }
      }
      let decodedLocation = "";
      if (urlLocation && !["undefined", "null"].includes(urlLocation)) {
        try {
          decodedLocation = decodeURIComponent(String(urlLocation));
        } catch (e) {
          decodedLocation = String(urlLocation);
        }
      }
      const auditorLocation = await fetchAuditorLocation();
      const finalLocation = decodedLocation || auditorLocation || "";
      const auditorIdValue = user?.id
        ? typeof user.id === "string"
          ? parseInt(user.id)
          : user.id
        : null;
      setFormData((prev) => ({
        ...prev,
        documentNumber: generateDocumentNumber(),
        auditNumber: `AUD-${Date.now()}`,
        wefDate: getWEFDate(),
        revNo: getRevisionNumber(),
        revDate: getRevisionDate(),
        issueDate: getIssueDate(),
        date: formattedDate,
        time: formattedTime,
        auditorName: user?.name || "",
        auditorId: auditorIdValue,
        auditeeName: decodedAuditeeName || prev.auditeeName,
        auditeeId: urlAuditeeId
          ? parseInt(String(urlAuditeeId))
          : prev.auditeeId,
        department: decodedDepartment || prev.department,
        location: finalLocation,
      }));
    };
    initializeForm();
  }, []);

  useEffect(() => {
    if (editId && questions.length > 0) {
      loadAuditData();
    }
  }, [editId, questions]);

   useEffect(() => {
    // Only enable on web and only on Step 2
    if (Platform.OS !== "web" || currentStep !== 2) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent navigation if the user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Left Arrow: Go to previous checkpoint
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentCheckpointIndex > 0) {
          setCurrentCheckpointIndex(currentCheckpointIndex - 1);
          scrollToTop();
        }
      }
      // Right Arrow: Go to next checkpoint
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentCheckpointIndex < questions.length - 1) {
          setCurrentCheckpointIndex(currentCheckpointIndex + 1);
          scrollToTop();
        }
      }
    };

    // Attach the event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup the event listener when component unmounts or dependencies change
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentStep, currentCheckpointIndex, questions.length]);


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
              : audit.answers;
        } catch (e) {
          answers = {};
        }
        setFormData({
          documentNumber: answers.documentNumber || generateDocumentNumber(),
          auditNumber: answers.auditNumber || `AUD-${Date.now()}`,
          wefDate: answers.wefDate || getWEFDate(),
          revNo: answers.revNo || getRevisionNumber(),
          revDate: answers.revDate || getRevisionDate(),
          issueDate: answers.issueDate || getIssueDate(),
          department: answers.department || audit.department || "",
          partNumber: answers.partNumber || "",
          machine: answers.machine || "",
          date: answers.date || new Date().toISOString().split("T")[0],
          shift: audit.shift || "Morning",
          time: answers.time || new Date().toLocaleTimeString(),
          location: answers.location || "",
          auditorName: audit.auditorName || user?.name || "",
          auditorId:
            audit.auditorId || (user?.id ? parseInt(String(user.id)) : null),
          auditeeName: audit.auditeeName || answers.auditeeName || "",
          auditeeId: audit.auditeeId || answers.auditeeId || null,
          hodEmail: answers.hodEmail || "",
          status: audit.status || "IN_PROGRESS",
          responses: answers.responses || {},
          observations: answers.observations || {},
          documentsVerified: answers.documentsVerified || {},
          score: answers.score || null,
          auditorSignature: answers.auditorSignature || "",
          createdAt: audit.createdAt || new Date().toISOString(),
        });
        auditLoaded.current = true;
      }
    } catch (error) {
      console.error("Error loading audit:", error);
      addToast("Failed to load audit data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleObservationChange = (questionId: number, observation: string) =>
    setFormData((prev) => ({
      ...prev,
      observations: { ...prev.observations, [questionId]: observation },
    }));
  const handleStatusChange = (questionId: number, status: string) =>
    setFormData((prev) => ({
      ...prev,
      responses: { ...prev.responses, [questionId]: status },
    }));

  const calculateScore = () => {
    if (questions.length === 0) return 0;
    const compliant = Object.values(formData.responses).filter(
      (r) => r === "COMPLIANT",
    ).length;
    return Math.round((compliant / questions.length) * 100);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(
        (r) => r === "COMPLIANT",
      ).length;
      const minorCount = Object.values(formData.responses).filter(
        (r) => r === "MINOR",
      ).length;
      const majorCount = Object.values(formData.responses).filter(
        (r) => r === "MAJOR",
      ).length;
      let percentageScore = 0;
      if (totalQuestions > 0) {
        const weightedScore =
          compliantCount * 100 + minorCount * 50 + majorCount * 0;
        percentageScore = weightedScore / totalQuestions;
      }
      const answersObject = {
        ...formData,
        responses: formData.responses,
        observations: formData.observations,
        documentsVerified: formData.documentsVerified,
        score: percentageScore,
      };
      const auditorIdNumber = formData.auditorId
        ? parseInt(String(formData.auditorId))
        : user?.id
          ? parseInt(String(user.id))
          : null;
      const payload = {
        checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID },
        auditScheduleId: scheduleId ? parseInt(String(scheduleId)) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: auditorIdNumber,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId
          ? parseInt(String(formData.auditeeId))
          : null,
        answers: JSON.stringify(answersObject),
        totalScore: compliantCount,
        maxPossibleScore: totalQuestions,
        percentageScore: percentageScore,
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
        saved = response?.data || response;
        if (!saved?.id) throw new Error("Failed to get ID from save response");
        setResponseId(saved.id);
        addToast("Draft saved successfully", "success");
        if (props.onUpdateEditId) {
          props.onUpdateEditId(String(saved.id));
        } else {
          router.replace({
            pathname: "/ManufacturingProcessAuditForm" as any,
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
    const unanswered = questions.filter((q) => !formData.responses[q.slNo]);
    if (unanswered.length > 0) {
      addToast(
        `Please answer all ${unanswered.length} remaining questions`,
        "error",
      );
      setCurrentStep(2);
      return;
    }
    setSaving(true);
    try {
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(
        (r) => r === "COMPLIANT",
      ).length;
      const minorCount = Object.values(formData.responses).filter(
        (r) => r === "MINOR",
      ).length;
      const majorCount = Object.values(formData.responses).filter(
        (r) => r === "MAJOR",
      ).length;
      let percentageScore = 0;
      if (totalQuestions > 0) {
        const weightedScore =
          compliantCount * 100 + minorCount * 50 + majorCount * 0;
        percentageScore = weightedScore / totalQuestions;
      }
      const answersObject = {
        ...formData,
        auditorSignature: auditorSignatureImage || formData.auditorSignature,
        formName: sheetConfig?.name || "Manufacturing Process Audit",
        questionsData: questions,
        score: percentageScore,
      };
      const auditorIdNumber = formData.auditorId
        ? parseInt(String(formData.auditorId))
        : user?.id
          ? parseInt(String(user.id))
          : null;
      const payload = {
        checkSheet: { id: MANUFACTURING_CHECK_SHEET_ID },
        auditScheduleId: scheduleId ? parseInt(String(scheduleId)) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: auditorIdNumber,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId
          ? parseInt(String(formData.auditeeId))
          : null,
        answers: JSON.stringify(answersObject),
        totalScore: compliantCount,
        maxPossibleScore: totalQuestions,
        percentageScore: percentageScore,
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
        saved = response?.data || response;
        if (!saved?.id)
          throw new Error("Failed to get ID from submit response");
        setResponseId(saved.id);
        await auditScheduleApi.submitAuditResponse(saved.id);
      }
      addToast(
        `Audit submitted successfully! Score: ${percentageScore.toFixed(2)}%`,
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
    const sampleObservations = [
      "All documentation properly maintained. Incoming inspection tags present on all raw material bins.",
      "Workers have clear understanding of their responsibilities. Authority to stop production is documented.",
      "Employee competence records maintained. Training matrix updated.",
      "Shift plan displayed and followed. Replacement policy documented.",
      "Preventive maintenance schedule followed. Records maintained.",
      "Control charts displayed and updated. CpK values within acceptable range.",
      "MSA studies conducted annually. Calibration records up to date.",
      "Lighting adequate at all workstations. Housekeeping score 85%.",
      "Control plan available at each workstation. All requirements documented.",
      "Production logs maintained. Quality records filed chronologically.",
    ];
    const statuses = [
      "COMPLIANT",
      "COMPLIANT",
      "COMPLIANT",
      "MINOR",
      "COMPLIANT",
      "MAJOR",
      "COMPLIANT",
      "COMPLIANT",
      "COMPLIANT",
      "COMPLIANT",
    ];
    questions.forEach((q, idx) => {
      handleObservationChange(
        q.slNo,
        sampleObservations[idx % sampleObservations.length],
      );
      handleStatusChange(q.slNo, statuses[idx % statuses.length]);
    });
    addToast("Demo data filled successfully", "success");
  };

  const getProgressStats = () => {
    const total = questions.length;
    const completed = Object.keys(formData.responses).filter(
      (key) => formData.responses[Number(key)],
    ).length;
    const compliant = Object.values(formData.responses).filter(
      (r) => r === "COMPLIANT",
    ).length;
    const minor = Object.values(formData.responses).filter(
      (r) => r === "MINOR",
    ).length;
    const major = Object.values(formData.responses).filter(
      (r) => r === "MAJOR",
    ).length;
    return { total, completed, compliant, minor, major };
  };

  const stats = getProgressStats();
  const allCheckpointsRated = stats.completed === stats.total;
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

  const handleGoBack = () => {
    if (props.onClose) props.onClose();
    else router.back();
  };

  const steps = [
    { number: 1, title: "General Information", icon: User },
    { number: 2, title: "Audit Checkpoints", icon: ClipboardList },
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

 // ✅ Reusable Date Input
  const DateInput = ({
    value,
    onChange,
    onOpen,
    placeholder = "Select Date",
  }: {
    value: string;
    onChange: (val: string) => void;
    onOpen?: () => void;
    placeholder?: string;
  }) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={value || ""}
          onChange={(e: any) => onChange(e.target.value)}
          onClick={(e: any) => {
            const target = e.target as HTMLInputElement;
            if (target.showPicker) target.showPicker();
          }}
          style={
            {
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "block",
              height: "40px",
              padding: "0 12px", // ✅ Use standard CSS padding instead of paddingHorizontal
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "14px",
              color: value ? "#1e293b" : "#94a3b8",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            } as any
          } // ✅ Cast to any to prevent strict TS CSS errors
        />
      );
    }

    return (
      <TouchableOpacity
        onPress={() => {
          if (onOpen) {
            onOpen();
          } else {
            // fallback if needed
          }
        }}
        activeOpacity={0.7}
        style={{
          width: "100%",
          maxWidth: "100%",
          height: 44,
          paddingHorizontal: 12, // ✅ React Native TouchableOpacity accepts this
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e2e8f0",
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: value ? "#1e293b" : "#94a3b8",
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>

        <Calendar size={18} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  // ✅ Reusable Time Input
  const TimeInput = ({
    value,
    onChange,
    placeholder = "Select Time",
  }: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  }) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            const target = e.target as HTMLInputElement;
            if (target.showPicker) target.showPicker();
          }}
          style={
            {
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "block",
              height: "40px",
              padding: "0 12px", // ✅ Use standard CSS padding instead of paddingHorizontal
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "14px",
              color: value ? "#1e293b" : "#94a3b8",
              fontFamily: "inherit",
              outline: "none",
              cursor: "pointer",
            } as any
          }
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "#3b82f6";
            (e.target as HTMLInputElement).style.boxShadow =
              "0 0 0 2px rgba(59,130,246,0.3)";
          }}
          onBlur={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "#e2e8f0";
            (e.target as HTMLInputElement).style.boxShadow = "none";
          }}
        />
      );
    }
    return (
      <TouchableOpacity
        onPress={() => setShowTimePicker(true)}
        activeOpacity={0.7}
        style={{
          width: "100%",
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: "#e2e8f0",
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: value ? "#1e293b" : "#94a3b8",
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <ClockIcon size={18} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  if (loadingQuestions || loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NAVBAR_COLORS.bg,
        }}
      >
        <View
          style={{
            alignItems: "center",
            padding: 32,
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            borderRadius: 16,
          }}
        >
          <ActivityIndicator
            size="large"
            color={NAVBAR_COLORS.primary}
            style={{ marginBottom: 16 }}
          />
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#64748b" }}>
            {loadingQuestions
              ? "Loading audit questions..."
              : "Loading audit data..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            minHeight: "100%",
            paddingBottom: 40,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ maxWidth: 1100, width: "100%", alignSelf: "center" }}>
            {/* Header */}
            <FadeInView delay={0}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 32,
                }}
              >
                <TouchableOpacity
                  onPress={handleGoBack}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <ArrowLeft size={16} color="#334155" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#334155",
                    }}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {currentStep === 2 && (
                    <TouchableOpacity
                      onPress={handleAutoFill}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: NAVBAR_COLORS.secondary,
                        borderRadius: 12,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Sparkles size={16} color="#ffffff" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#ffffff",
                        }}
                      >
                        Demo Auto-Fill
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={saveDraft}
                    disabled={saving}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: "#ffffff",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 12,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <Save size={16} color="#334155" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#334155",
                      }}
                    >
                      {saving ? "Saving..." : "Save Draft"}
                    </Text>
                  </TouchableOpacity>
                  {currentStep === 3 && (
                    <TouchableOpacity
                      onPress={() => {
                        isManualSubmitRef.current = true;
                        submitAudit();
                      }}
                      disabled={!allCheckpointsRated || saving}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor:
                          allCheckpointsRated && !saving
                            ? NAVBAR_COLORS.primary
                            : "#94a3b8",
                        borderRadius: 12,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        opacity: allCheckpointsRated && !saving ? 1 : 0.5,
                      }}
                    >
                      <Send size={16} color="#ffffff" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#ffffff",
                        }}
                      >
                        Submit Audit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </FadeInView>

            {/* Step Progress Bar */}
            <FadeInView delay={100}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 32,
                }}
              >
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  const isClickable =
                    currentStep === 1 ||
                    (currentStep === 2 && step.number <= 2) ||
                    (currentStep === 3 && step.number <= 3);
                  return (
                    <React.Fragment key={step.number}>
                      <TouchableOpacity
                        onPress={() =>
                          isClickable && setCurrentStep(step.number)
                        }
                        disabled={!isClickable}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                          opacity: isClickable ? 1 : 0.7,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              isActive || isCompleted
                                ? NAVBAR_COLORS.primary
                                : "#f1f5f9",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
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
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "500",
                              color: "#64748b",
                            }}
                          >
                            Step {step.number}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              lineHeight: 16,
                              color: isActive ? "#1e293b" : "#475569",
                            }}
                            numberOfLines={1}
                          >
                            {step.title}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {step.number < steps.length && (
                        <View
                          style={{
                            height: 2,
                            marginHorizontal: 8,
                            flex: isDesktop ? 1 : 0,
                            width: isDesktop ? undefined : 24,
                            backgroundColor: isCompleted
                              ? NAVBAR_COLORS.secondary
                              : "#e2e8f0",
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
                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    marginBottom: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 24,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f1f5f9",
                      backgroundColor: NAVBAR_COLORS.bg,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    }}
                  >
                    <View
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: NAVBAR_COLORS.lighter,
                      }}
                    >
                      <FileText size={20} color={NAVBAR_COLORS.primary} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        {sheetConfig?.name || "Manufacturing Process Audit"}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                      >
                        Document Control & Audit Information
                      </Text>
                    </View>
                  </View>
                  <View style={{ padding: 24, gap: 32 }}>
                    <View style={{ marginBottom: 32 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#334155",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          marginBottom: 16,
                        }}
                      >
                        Document Control Information
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 16,
                        }}
                      >
                        <View
                          style={{
                            width: isDesktop
                              ? "18%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 140,
                            
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            Doc No.
                          </Text>
                          <TextInput
                            value={formData.documentNumber}
                            editable={false}
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#f8fafc",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#475569",
                              fontFamily:
                                Platform.OS === "ios" ? "Menlo" : "monospace",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "18%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 140,
                           
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            W.e.f.
                          </Text>
                          <DateInput
                            value={formData.wefDate}
                            onChange={(val) =>
                              handleInputChange("wefDate", val)
                            }
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "18%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 140,
                            
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            Rev No.
                          </Text>
                          <TextInput
                            value={formData.revNo}
                            onChangeText={(val) =>
                              handleInputChange("revNo", val)
                            }
                            placeholder="00"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "18%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 140,
                          
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            Rev Date
                          </Text>
                          <DateInput
                            value={formData.revDate}
                            onChange={(val) =>
                              handleInputChange("revDate", val)
                            }
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "18%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 140,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            Issue Date
                          </Text>
                          <DateInput
                            value={formData.issueDate}
                            onChange={(val) =>
                              handleInputChange("issueDate", val)
                            }
                          />
                        </View>
                      </View>
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#334155",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          marginBottom: 16,
                        }}
                      >
                        Audit Information
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 20,
                        }}
                      >
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Building size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Department
                            </Text>
                            <Text style={{ color: "#f43f5e" }}>*</Text>
                          </View>
                          <TextInput
                            value={formData.department}
                            onChangeText={(val) =>
                              handleInputChange("department", val)
                            }
                            placeholder="Enter department name"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: scheduleId
                                ? "#f8fafc"
                                : "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                          {scheduleId && formData.department ? (
                            <Text
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                fontWeight: "500",
                                color: NAVBAR_COLORS.secondary,
                              }}
                            >
                              ✓ Loaded from schedule
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#334155",
                              marginBottom: 6,
                            }}
                          >
                            Part Number
                          </Text>
                          <TextInput
                            value={formData.partNumber}
                            onChangeText={(val) =>
                              handleInputChange("partNumber", val)
                            }
                            placeholder="Enter part number"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Building size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Machine
                            </Text>
                          </View>
                          <TextInput
                            value={formData.machine}
                            onChangeText={(val) =>
                              handleInputChange("machine", val)
                            }
                            placeholder="Machine name / number"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <MapPin size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Location
                            </Text>
                          </View>
                          <TextInput
                            value={formData.location}
                            onChangeText={(val) =>
                              handleInputChange("location", val)
                            }
                            placeholder="Audit location"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <Calendar size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Date
                            </Text>
                          </View>
                          <DateInput
                            value={formData.date}
                            onChange={(val) => handleInputChange("date", val)}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                            zIndex: 10,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <ClockIcon size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Shift
                            </Text>
                          </View>
                          <View style={{ position: "relative" }}>
                            <TouchableOpacity
                              onPress={() =>
                                setShowShiftDropdown(!showShiftDropdown)
                              }
                              style={{
                                width: "100%",
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: "#ffffff",
                                borderWidth: 1,
                                borderColor: showShiftDropdown
                                  ? NAVBAR_COLORS.primary
                                  : "#e2e8f0",
                                borderRadius: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: formData.shift ? "#1e293b" : "#94a3b8",
                                  fontWeight: "500",
                                }}
                              >
                                {formData.shift || "Select Shift"}
                              </Text>
                              <ChevronDown
                                size={18}
                                color="#94a3b8"
                                style={{
                                  transform: [
                                    {
                                      rotate: showShiftDropdown
                                        ? "180deg"
                                        : "0deg",
                                    },
                                  ],
                                }}
                              />
                            </TouchableOpacity>
                            {showShiftDropdown && (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 48,
                                  left: 0,
                                  right: 0,
                                  backgroundColor: "#ffffff",
                                  borderWidth: 1,
                                  borderColor: "#e2e8f0",
                                  borderRadius: 12,
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.1,
                                  shadowRadius: 4,
                                  elevation: 5,
                                  zIndex: 999,
                                  overflow: "hidden",
                                }}
                              >
                                {shiftOptions.map((shift, idx) => (
                                  <TouchableOpacity
                                    key={shift}
                                    onPress={() => {
                                      handleInputChange("shift", shift);
                                      setShowShiftDropdown(false);
                                    }}
                                    style={{
                                      paddingHorizontal: 16,
                                      paddingVertical: 12,
                                      backgroundColor:
                                        formData.shift === shift
                                          ? NAVBAR_COLORS.bg
                                          : "#ffffff",
                                      borderBottomWidth:
                                        idx < shiftOptions.length - 1 ? 1 : 0,
                                      borderBottomColor: "#f1f5f9",
                                    }}
                                  >
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          fontWeight:
                                            formData.shift === shift
                                              ? "600"
                                              : "400",
                                          color:
                                            formData.shift === shift
                                              ? NAVBAR_COLORS.primary
                                              : "#334155",
                                        }}
                                      >
                                        {shift}
                                      </Text>
                                      {formData.shift === shift && (
                                        <CheckCircle
                                          size={16}
                                          color={NAVBAR_COLORS.primary}
                                        />
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <ClockIcon size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Time
                            </Text>
                          </View>
                          <TimeInput
                            value={formData.time}
                            onChange={(val) => handleInputChange("time", val)}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <User size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Auditor Name
                            </Text>
                          </View>
                          <TextInput
                            value={formData.auditorName}
                            editable={false}
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#f8fafc",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#475569",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            width: isDesktop
                              ? "23%"
                              : isTablet
                                ? "31%"
                                : "100%",
                            minWidth: 160,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <User size={14} color="#334155" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#334155",
                              }}
                            >
                              Auditee Name
                            </Text>
                            <Text style={{ color: "#f43f5e" }}>*</Text>
                          </View>
                          <TextInput
                            value={formData.auditeeName}
                            onChangeText={(val) =>
                              handleInputChange("auditeeName", val)
                            }
                            placeholder="Enter auditee name"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              backgroundColor: "#ffffff",
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                          {scheduleId && formData.auditeeName ? (
                            <Text
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                fontWeight: "500",
                                color: NAVBAR_COLORS.secondary,
                              }}
                            >
                              ✓ Loaded from schedule
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      padding: 24,
                      paddingTop: 0,
                    }}
                  >
                    <TouchableOpacity
                      onPress={nextStep}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        backgroundColor: NAVBAR_COLORS.primary,
                        borderRadius: 12,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#ffffff",
                        }}
                      >
                        Next Step
                      </Text>
                      <ChevronRight size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeInView>
            )}

            {/* Step 2: Audit Checkpoints */}
            {currentStep === 2 && currentQ && (
              <FadeInView delay={200}>
                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    marginBottom: 24,
                    padding: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#475569",
                      }}
                    >
                      Checkpoint {currentCheckpointIndex + 1} of{" "}
                      {questions.length}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={12} color="#059669" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#059669",
                          }}
                        >
                          {stats.compliant}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={12} color="#d97706" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#d97706",
                          }}
                        >
                          {stats.minor}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={12} color="#e11d48" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#e11d48",
                          }}
                        >
                          {stats.major}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                  >
                    {questions.map((q, idx) => {
                      const isCompleted = formData.responses[q.slNo];
                      const isCurrent = currentCheckpointIndex === idx;
                      let bgColor = "#f8fafc";
                      let borderColor = "#e2e8f0";
                      let textColor = "#64748b";
                      if (isCurrent) {
                        bgColor = NAVBAR_COLORS.primary;
                        borderColor = NAVBAR_COLORS.primary;
                        textColor = "#ffffff";
                      } else if (isCompleted) {
                        const style = getStatusStyle(
                          formData.responses[q.slNo],
                        );
                        bgColor = style.bg;
                        borderColor = style.border;
                        textColor = style.text;
                      }
                      return (
                        <TouchableOpacity
                          key={q.slNo}
                          onPress={() => navigateToCheckpoint(idx)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: bgColor,
                            borderWidth: 1,
                            borderColor: borderColor,
                            alignItems: "center",
                            justifyContent: "center",
                            shadowColor: isCurrent ? "#000" : "transparent",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isCurrent ? 0.1 : 0,
                            shadowRadius: isCurrent ? 4 : 0,
                            elevation: isCurrent ? 3 : 0,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: textColor,
                            }}
                          >
                            {idx + 1}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    marginBottom: 24,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      padding: 24,
                      borderLeftWidth: 4,
                      borderLeftColor: getStatusStyle(
                        formData.responses[currentQ.slNo] || "NOT_APPLICABLE",
                      ).border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: NAVBAR_COLORS.primary,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          {currentQ.slNo}
                        </Text>
                      </View>
                      {currentQ.clause ? (
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: NAVBAR_COLORS.bg,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: NAVBAR_COLORS.primary,
                            }}
                          >
                            Clause {currentQ.clause}
                          </Text>
                        </View>
                      ) : null}
                      {formData.responses[currentQ.slNo] ? (
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 999,
                            borderWidth: 1,
                            backgroundColor: getStatusStyle(
                              formData.responses[currentQ.slNo],
                            ).bg,
                            borderColor: getStatusStyle(
                              formData.responses[currentQ.slNo],
                            ).border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: getStatusStyle(
                                formData.responses[currentQ.slNo],
                              ).text,
                            }}
                          >
                            {STATUS_OPTIONS.find(
                              (o) =>
                                o.value === formData.responses[currentQ.slNo],
                            )?.short || ""}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: 16,
                        lineHeight: 26,
                      }}
                    >
                      {currentQ.checkpoint}
                    </Text>
                    {currentQ.consideration ? (
                      <View
                        style={{
                          padding: 16,
                          marginBottom: 20,
                          borderRadius: 12,
                          borderWidth: 1,
                          backgroundColor: NAVBAR_COLORS.bg,
                          borderColor: NAVBAR_COLORS.lighter,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: NAVBAR_COLORS.dark,
                            marginBottom: 4,
                          }}
                        >
                          Documents/Records to Verify:
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#475569",
                            lineHeight: 20,
                          }}
                        >
                          {currentQ.consideration}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{ marginBottom: 24 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: 8,
                        }}
                      >
                        Observations / Findings
                      </Text>
                      <TextInput
                        value={formData.observations[currentQ.slNo] || ""}
                        onChangeText={(val) =>
                          handleObservationChange(currentQ.slNo, val)
                        }
                        placeholder="Enter your observations here..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={{
                          width: "100%",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 12,
                          fontSize: 14,
                          color: "#1e293b",
                          minHeight: 100,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        padding: 20,
                        marginBottom: 24,
                        borderRadius: 12,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: "#334155",
                          marginBottom: 12,
                        }}
                      >
                        Status / Rating
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        {STATUS_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isSelected =
                            formData.responses[currentQ.slNo] === option.value;
                          const style = getStatusStyle(option.value);
                          return (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() =>
                                handleStatusChange(currentQ.slNo, option.value)
                              }
                              style={{
                                flex: 1,
                                minWidth: 140,
                                paddingVertical: 16,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                borderWidth: 2,
                                borderColor: isSelected
                                  ? style.border
                                  : "#e2e8f0",
                                backgroundColor: isSelected
                                  ? style.bg
                                  : "#ffffff",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                              }}
                            >
                              <Icon
                                size={22}
                                color={isSelected ? style.text : "#94a3b8"}
                              />
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "700",
                                  color: isSelected ? style.text : "#64748b",
                                }}
                              >
                                {option.short}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "500",
                                  color: isSelected ? style.text : "#64748b",
                                  textAlign: "center",
                                }}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 20,
                        marginTop: 20,
                        borderTopWidth: 1,
                        borderTopColor: "#f1f5f9",
                      }}
                    >
                      <TouchableOpacity
                        onPress={prevCheckpoint}
                        disabled={currentCheckpointIndex === 0}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 12,
                          opacity: currentCheckpointIndex === 0 ? 0.5 : 1,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <ChevronLeft size={16} color="#334155" />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#334155",
                          }}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <View style={{ alignItems: "center" }}>
                        {formData.responses[currentQ.slNo] ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle size={14} color="#059669" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#059669",
                              }}
                            >
                              Completed
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <AlertCircle size={14} color="#d97706" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#d97706",
                              }}
                            >
                              Select Status
                            </Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={nextCheckpoint}
                        disabled={
                          currentCheckpointIndex === questions.length - 1
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          backgroundColor: NAVBAR_COLORS.primary,
                          borderRadius: 12,
                          opacity:
                            currentCheckpointIndex === questions.length - 1
                              ? 0.5
                              : 1,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#ffffff",
                          }}
                        >
                          Next
                        </Text>
                        <ChevronRight size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    marginBottom: 24,
                    padding: 20,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 24 }}>
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#059669",
                          }}
                        >
                          {stats.compliant}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Compliant
                        </Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#d97706",
                          }}
                        >
                          {stats.minor}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Minor NC
                        </Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#e11d48",
                          }}
                        >
                          {stats.major}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Major NC
                        </Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#475569",
                          }}
                        >
                          {stats.total - stats.completed}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Pending
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#475569",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: "#1e293b" }}>
                        {stats.completed}
                      </Text>{" "}
                      / <Text style={{ color: "#64748b" }}>{stats.total}</Text>{" "}
                      completed
                    </Text>
                  </View>
                  {!allCheckpointsRated && (
                    <View
                      style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        backgroundColor: "#fffbeb",
                        borderColor: "#fde68a",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "500",
                          color: "#b45309",
                        }}
                      >
                        ⚠️ Please select status for all{" "}
                        {stats.total - stats.completed} remaining checkpoints
                      </Text>
                    </View>
                  )}
                </View>

                {allCheckpointsRated && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 24,
                    }}
                  >
                    <TouchableOpacity
                      onPress={nextStep}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 24,
                        paddingVertical: 10,
                        backgroundColor: NAVBAR_COLORS.primary,
                        borderRadius: 12,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#ffffff",
                        }}
                      >
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
                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 16,
                    marginBottom: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      padding: 24,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f1f5f9",
                      backgroundColor: NAVBAR_COLORS.bg,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: NAVBAR_COLORS.lighter,
                      }}
                    >
                      <FileCheck size={20} color={NAVBAR_COLORS.primary} />
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        Signature & Submit
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                      >
                        Review and submit the audit report
                      </Text>
                    </View>
                  </View>
                  <View style={{ padding: 24 }}>
                    <View
                      style={{
                        padding: 20,
                        marginBottom: 24,
                        borderRadius: 12,
                        borderWidth: 1,
                        backgroundColor: NAVBAR_COLORS.bg,
                        borderColor: NAVBAR_COLORS.lighter,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: NAVBAR_COLORS.dark,
                          marginBottom: 16,
                        }}
                      >
                        Audit Summary
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            minWidth: 100,
                            padding: 12,
                            backgroundColor: "#ffffff",
                            borderWidth: 1,
                            borderColor: "#f1f5f9",
                            borderRadius: 12,
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Total Checkpoints
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "700",
                              color: "#1e293b",
                              marginTop: 4,
                            }}
                          >
                            {stats.total}
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            minWidth: 100,
                            padding: 12,
                            backgroundColor: "#ffffff",
                            borderWidth: 1,
                            borderColor: "#f1f5f9",
                            borderRadius: 12,
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Compliant
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "700",
                              color: "#059669",
                              marginTop: 4,
                            }}
                          >
                            {stats.compliant}
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            minWidth: 100,
                            padding: 12,
                            backgroundColor: "#ffffff",
                            borderWidth: 1,
                            borderColor: "#f1f5f9",
                            borderRadius: 12,
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Non-Conformities
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "700",
                              color: "#e11d48",
                              marginTop: 4,
                            }}
                          >
                            {stats.minor + stats.major}
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            minWidth: 100,
                            padding: 12,
                            backgroundColor: "#ffffff",
                            borderWidth: 1,
                            borderColor: "#f1f5f9",
                            borderRadius: 12,
                            alignItems: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Score
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: "700",
                              color: NAVBAR_COLORS.primary,
                              marginTop: 4,
                            }}
                          >
                            {calculateScore()}%
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      style={{
                        padding: 16,
                        marginBottom: 24,
                        borderRadius: 12,
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#475569" }}>
                        <Text style={{ fontWeight: "700", color: "#1e293b" }}>
                          Department:
                        </Text>{" "}
                        {formData.department || "Not specified"}
                      </Text>
                    </View>
                    <View style={{ marginBottom: 24 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <FileCheck
                          size={14}
                          color="#334155"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#334155",
                          }}
                        >
                          Auditor Signature
                        </Text>
                        <Text style={{ color: "#f43f5e", marginLeft: 4 }}>
                          *
                        </Text>
                      </View>
                      {loadingSignature ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 20,
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            borderRadius: 12,
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          <ActivityIndicator
                            size="small"
                            color={NAVBAR_COLORS.primary}
                          />
                          <Text
                            style={{
                              marginLeft: 8,
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#64748b",
                            }}
                          >
                            Loading signature...
                          </Text>
                        </View>
                      ) : auditorSignatureImage ? (
                        <View
                          style={{
                            padding: 20,
                            borderRadius: 12,
                            borderWidth: 1,
                            backgroundColor: NAVBAR_COLORS.bg,
                            borderColor: NAVBAR_COLORS.lighter,
                          }}
                        >
                          <Image
                            source={{ uri: auditorSignatureImage }}
                            style={{
                              height: 80,
                              width: "100%",
                              resizeMode: "contain",
                            }}
                          />
                          <Text
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              fontWeight: "500",
                              color: NAVBAR_COLORS.secondary,
                            }}
                          >
                            ✓ Signature loaded from your profile
                          </Text>
                        </View>
                      ) : signatureError ? (
                        <View
                          style={{
                            padding: 20,
                            borderRadius: 12,
                            borderWidth: 1,
                            backgroundColor: "#fffbeb",
                            borderColor: "#fde68a",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <AlertTriangle size={16} color="#b45309" />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: "#b45309",
                              }}
                            >
                              No signature found in your profile
                            </Text>
                          </View>
                          <Text
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: "#475569",
                            }}
                          >
                            Please upload your signature in your profile
                            settings. You can still proceed with typed signature
                            below.
                          </Text>
                          <TextInput
                            value={formData.auditorSignature}
                            onChangeText={(val) =>
                              handleInputChange("auditorSignature", val)
                            }
                            placeholder="Type your full name as signature (fallback)"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              marginTop: 12,
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            padding: 20,
                            borderRadius: 12,
                            borderWidth: 1,
                            backgroundColor: "#f8fafc",
                            borderColor: "#e2e8f0",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: "#64748b",
                            }}
                          >
                            No signature loaded. Please type your signature
                            below.
                          </Text>
                          <TextInput
                            value={formData.auditorSignature}
                            onChangeText={(val) =>
                              handleInputChange("auditorSignature", val)
                            }
                            placeholder="Type your full name as signature"
                            style={{
                              width: "100%",
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              marginTop: 12,
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                              borderRadius: 12,
                              fontSize: 14,
                              color: "#1e293b",
                            }}
                          />
                        </View>
                      )}
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}
                      >
                        Your electronic signature will be used for this audit
                        report
                      </Text>
                    </View>
                    <View style={{ marginBottom: 24 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Calendar
                          size={14}
                          color="#334155"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#334155",
                          }}
                        >
                          Date
                        </Text>
                        <Text style={{ color: "#f43f5e", marginLeft: 4 }}>
                          *
                        </Text>
                      </View>
                      <DateInput
                        value={formData.date}
                        onChange={(val) => handleInputChange("date", val)}
                      />
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}
                      >
                        Date of signature
                      </Text>
                    </View>
                    <View style={{ marginBottom: 24 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <User
                          size={14}
                          color="#334155"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: "#334155",
                          }}
                        >
                          Auditee Name
                        </Text>
                        <Text style={{ color: "#f43f5e", marginLeft: 4 }}>
                          *
                        </Text>
                      </View>
                      <TextInput
                        value={formData.auditeeName}
                        onChangeText={(val) =>
                          handleInputChange("auditeeName", val)
                        }
                        placeholder="Enter auditee full name"
                        style={{
                          width: "100%",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 12,
                          fontSize: 14,
                          color: "#1e293b",
                        }}
                      />
                      <Text
                        style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}
                      >
                        The auditee will review and sign separately
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 24,
                        marginTop: 24,
                        borderTopWidth: 1,
                        borderTopColor: "#f1f5f9",
                      }}
                    >
                      <TouchableOpacity
                        onPress={prevStep}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 20,
                          paddingVertical: 10,
                          backgroundColor: "#ffffff",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                          borderRadius: 12,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                        }}
                      >
                        <ChevronLeft size={18} color="#334155" />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#334155",
                          }}
                        >
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
                          !formData.auditeeName.trim() ||
                          saving ||
                          !allCheckpointsRated
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 24,
                          paddingVertical: 10,
                          backgroundColor:
                            (auditorSignatureImage ||
                              formData.auditorSignature.trim()) &&
                            formData.date.trim() &&
                            formData.auditeeName.trim() &&
                            !saving &&
                            allCheckpointsRated
                              ? NAVBAR_COLORS.primary
                              : "#94a3b8",
                          borderRadius: 12,
                          opacity:
                            (auditorSignatureImage ||
                              formData.auditorSignature.trim()) &&
                            formData.date.trim() &&
                            formData.auditeeName.trim() &&
                            !saving &&
                            allCheckpointsRated
                              ? 1
                              : 0.5,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Send size={18} color="#ffffff" />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#ffffff",
                          }}
                        >
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

        {/* Date Picker */}
        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={new Date(formData.date)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              if (event.type === "dismissed") {
                setShowDatePicker(false);
                return;
              }
              if (selectedDate) {
                const formattedDate = selectedDate.toISOString().split("T")[0];
                setFormData((prev) => ({ ...prev, date: formattedDate }));
              }
              setShowDatePicker(false);
            }}
          />
        )}

        {/* Time Picker - Mobile Only */}
        {showTimePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={
              formData.time
                ? new Date(`1970-01-01T${formData.time}`)
                : new Date()
            }
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              if (event.type === "dismissed") {
                setShowTimePicker(false);
                return;
              }
              if (selectedDate) {
                const hours = selectedDate
                  .getHours()
                  .toString()
                  .padStart(2, "0");
                const minutes = selectedDate
                  .getMinutes()
                  .toString()
                  .padStart(2, "0");
                const formattedTime = `${hours}:${minutes}`;
                setFormData((prev) => ({ ...prev, time: formattedTime }));
              }
              setShowTimePicker(false);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
