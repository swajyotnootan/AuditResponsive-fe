import { API_BASE_URL } from "@/config/apiConfig";
import { auditAPI } from "@/services/api"; // ✅ Add this import
import { auditScheduleApi } from "@/services/auditScheduleApi"; // ✅ ADD THIS IMPORT
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
  Clock,
  FileCheck,
  Flag,
  Info,
  Layers,
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
  Modal,
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
// // ✅ DYNAMIC API BASE

// ============================================================================
// COLOR PALETTE & CONSTANTS
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

const STATUS_OPTIONS = [
  {
    value: "COMPLIANT",
    label: "Compliant / Observation (O+)",
    short: "O+",
    icon: CheckCircle,
  },
  {
    value: "MINOR_NC",
    label: "Minor Non-Conformity (Mi/OI)",
    short: "OI",
    icon: Info,
  },
  {
    value: "MAJOR_NC",
    label: "Major Non-Conformity (Ma/O-)",
    short: "O-",
    icon: AlertCircle,
  },
  {
    value: "NOT_APPLICABLE",
    label: "Not Applicable",
    short: "N/A",
    icon: Flag,
  },
];

const generateDocumentNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `AUD-IATF-${year}${month}-${random}`;
};

const calculateScore = (
  responses: Record<number, string>,
  questions: any[],
) => {
  if (!questions || questions.length === 0) return 0;
  const total = questions.length;
  const compliant = Object.values(responses).filter(
    (r) => r === "COMPLIANT",
  ).length;
  return parseFloat(((compliant / total) * 100).toFixed(2));
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "COMPLIANT":
      return {
        bg: "#ecfdf5",
        border: "#10b981",
        text: "#047857",
        icon: "#10b981",
      };
    case "MINOR_NC":
      return {
        bg: "#fffbeb",
        border: "#f59e0b",
        text: "#b45309",
        icon: "#f59e0b",
      };
    case "MAJOR_NC":
      return {
        bg: "#fff1f2",
        border: "#f43f5e",
        text: "#be123c",
        icon: "#f43f5e",
      };
    default:
      return {
        bg: "#f8fafc",
        border: "#cbd5e1",
        text: "#64748b",
        icon: "#94a3b8",
      };
  }
};

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

export default function IATFInternalAuditForm(props: any) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const editId = props.editId || params.edit;
  const scheduleId = props.scheduleId || params.scheduleId;
  const departmentParam = props.department || params.department;
  const processNameParam = props.processName || params.processName;
  const formIdParam = props.formId || params.formId;
  const urlAuditeeId = props.auditeeId || params.auditeeId;
  const urlAuditeeName = props.auditeeName || params.auditeeName;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [responseId, setResponseId] = useState<string | number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentCheckSheet, setCurrentCheckSheet] = useState<any>(null);
  const [availableSheets, setAvailableSheets] = useState<any[]>([]);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const [auditorSignatureImage, setAuditorSignatureImage] =
    useState<string>("");
  const [auditorSignatureBase64, setAuditorSignatureBase64] =
    useState<string>("");
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [loadingSignature, setLoadingSignature] = useState(true);
  const [signatureError, setSignatureError] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const isManualSubmitRef = useRef(false);
  const initialized = useRef(false);

  const [formData, setFormData] = useState({
    documentNumber: generateDocumentNumber(),
    department: departmentParam || "",
    location: "",
    shift: "Morning",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString(),
    auditorName: user?.name || "",
    auditorId: user?.id,
    auditorSignature: "",
    auditeeName: "",
    auditeeId: "",
    status: "IN_PROGRESS",
    responses: {} as Record<number, string>,
    observations: {} as Record<number, string>,
    score: null as number | null,
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
        });
        if (response.ok) {
          const userData = await response.json();
          locationHierarchy = getLocationHierarchy(userData);
        }
      } catch (error) {
        console.error("❌ Error fetching user details:", error);
      }
    }
    if (locationHierarchy) {
      setFormData((prev) => ({
        ...prev,
        location: prev.location || locationHierarchy,
      }));
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
      // ✅ Use the same working API service as FiveSAuditForm
      const signatureBase64 = await auditAPI.fetchSignatureById(
        String(user.id),
      );

      console.log(
        "🖼️ Raw signature from API:",
        signatureBase64 ? "Exists" : "Null/Empty",
      );

      if (signatureBase64 && String(signatureBase64).trim().length > 20) {
        const formattedUri = String(signatureBase64).startsWith("data:image")
          ? String(signatureBase64)
          : `data:image/png;base64,${String(signatureBase64).trim()}`;

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

  const fetchScheduleDetails = async () => {
    if (!scheduleId) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/audit-schedule/${scheduleId}`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const schedule = await response.json();
        if (schedule.auditeeName && !editId) {
          setFormData((prev) => ({
            ...prev,
            auditeeName: schedule.auditeeName,
            auditeeId: schedule.auditeeId || prev.auditeeId,
            department: schedule.department || prev.department,
            location: schedule.location || prev.location,
            shift: schedule.shift || prev.shift,
            date: schedule.scheduledDate
              ? schedule.scheduledDate.split("T")[0]
              : prev.date,
            auditorName: schedule.auditorName || prev.auditorName,
            auditorId: schedule.auditorId || prev.auditorId,
          }));
        }
      }
    } catch (error) {
      console.warn("⚠️ Could not fetch schedule details:", error);
    }
  };

  const fetchSheetsForDepartment = async (department: string) => {
    if (!department) return [];
    const deptUpper = department.toUpperCase().trim();
    if (deptUpper === "QA/QC" || deptUpper === "QC" || deptUpper === "Q.C") {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/templates/type/IATF_16949`,
          {
            credentials: "include",
          },
        );
        if (res.ok) {
          const allForms = await res.json();
          return allForms.filter((form: any) => form.department === "QA");
        }
      } catch (error) {
        return [];
      }
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/iatf/by-department/${encodeURIComponent(department)}`,
        { credentials: "include" },
      );
      if (response.ok) return await response.json();
    } catch (error) {
      return [];
    }
    return [];
  };

  const manualExtractQuestions = (jsonString: string) => {
    const questions = [];
    if (!jsonString || typeof jsonString !== "string")
      return getFallbackQuestions();
    let cleaned = jsonString.replace(/\n/g, " ").replace(/\r/g, "");
    const objectPattern = /\{[^{}]*?"sNo"\s*:\s*\d+[^{}]*?\}/g;
    const questionMatches = cleaned.match(objectPattern);
    if (questionMatches && questionMatches.length > 0) {
      for (let qStr of questionMatches) {
        try {
          const sNoMatch = qStr.match(/"sNo"\s*:\s*(\d+)/);
          if (!sNoMatch) continue;
          let clauseNo = "";
          const clauseMatch = qStr.match(/"clauseNo"\s*:\s*"([^"]*?)"/);
          if (clauseMatch) clauseNo = clauseMatch[1];
          let displayLabel = "";
          const labelMatch = qStr.match(/"displayLabel"\s*:\s*"([^"]*?)"/);
          if (labelMatch)
            displayLabel = labelMatch[1]
              .replace(/\\n/g, " ")
              .replace(/\\"/g, '"');
          let documentsVerified = "";
          const docsMatch = qStr.match(/"documentsVerified"\s*:\s*"([^"]*?)"/);
          if (docsMatch)
            documentsVerified = docsMatch[1]
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"');
          questions.push({
            sNo: parseInt(sNoMatch[1]),
            clauseNo,
            displayLabel: displayLabel || `Question ${sNoMatch[1]}`,
            documentsVerified:
              documentsVerified || "Review relevant documentation",
          });
        } catch (e) {
          console.error("Error parsing question part:", e);
        }
      }
    }
    return questions.length === 0 ? getFallbackQuestions() : questions;
  };

  const getFallbackQuestions = () => [
    {
      sNo: 1,
      clauseNo: "4.1",
      displayLabel:
        "Has the organization determined external and internal issues?",
      documentsVerified: "Risk analysis document",
    },
    {
      sNo: 2,
      clauseNo: "4.2",
      displayLabel: "Has the organization determined interested parties?",
      documentsVerified: "Interested parties register",
    },
    {
      sNo: 3,
      clauseNo: "5.1",
      displayLabel: "Is top management demonstrating leadership?",
      documentsVerified: "Quality policy and objectives",
    },
    {
      sNo: 4,
      clauseNo: "6.1",
      displayLabel: "Has the organization planned actions to address risks?",
      documentsVerified: "Risk mitigation plan",
    },
    {
      sNo: 5,
      clauseNo: "7.1",
      displayLabel: "Are resources needed for QMS determined?",
      documentsVerified: "Resource allocation records",
    },
  ];

  const loadSheetQuestions = async (sheet: any) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${sheet.id}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to fetch template");
      const fullSheet = await response.json();
      setCurrentCheckSheet(fullSheet);

      let parsedQuestions = [];
      if (fullSheet.questions) {
        try {
          parsedQuestions =
            typeof fullSheet.questions === "string"
              ? JSON.parse(fullSheet.questions)
              : fullSheet.questions;
        } catch (e) {
          parsedQuestions = manualExtractQuestions(fullSheet.questions);
        }
      }
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0)
        parsedQuestions = getFallbackQuestions();

      const formattedQuestions = parsedQuestions.map((q: any, idx: number) => ({
        slNo: q?.sNo || q?.slNo || idx + 1,
        checkpoint: q?.displayLabel || q?.checkpoint || `Question ${idx + 1}`,
        clause: q?.clauseNo || q?.clause || "",
        documentsVerified:
          q?.documentsVerified ||
          q?.whatToLookFor ||
          "Review relevant documentation",
      }));

      setQuestions(formattedQuestions);
      const initialResponses: Record<number, string> = {};
      const initialObservations: Record<number, string> = {};
      formattedQuestions.forEach((q: any) => {
        initialResponses[q.slNo] = "";
        initialObservations[q.slNo] = "";
      });
      setFormData((prev) => ({
        ...prev,
        responses: initialResponses,
        observations: initialObservations,
      }));
      setShowSheetSelector(false);
      setCurrentCheckpointIndex(0);
    } catch (error) {
      console.error("Error loading questions:", error);
      addToast("Failed to load audit questions.", "error");
      setQuestions(getFallbackQuestions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initialize = async () => {
      await fetchAuditorSignature();
      await fetchAuditorLocation();
      await fetchScheduleDetails();

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
        setFormData((prev) => ({
          ...prev,
          auditeeName: decodedAuditeeName,
          auditeeId: urlAuditeeId || "",
        }));
      }

      let deptToFetch = departmentParam;
      if (deptToFetch) {
        setFormData((prev) => ({ ...prev, department: deptToFetch }));
        const forms = await fetchSheetsForDepartment(deptToFetch);
        if (forms.length > 0 && (processNameParam || formIdParam)) {
          let targetSheet = null;
          if (formIdParam)
            targetSheet = forms.find(
              (f: any) => f.id === parseInt(String(formIdParam)),
            );
          if (!targetSheet && processNameParam)
            targetSheet = forms.find(
              (f: any) =>
                f.processName === processNameParam ||
                f.name.includes(processNameParam),
            );
          if (!targetSheet && forms.length === 1) targetSheet = forms[0];

          if (targetSheet) await loadSheetQuestions(targetSheet);
          else if (forms.length > 0) {
            setAvailableSheets(forms);
            setShowSheetSelector(true);
            setLoading(false);
          }
        } else if (forms.length === 1) await loadSheetQuestions(forms[0]);
        else if (forms.length > 1) {
          setAvailableSheets(forms);
          setShowSheetSelector(true);
          setLoading(false);
        } else {
          addToast("No IATF forms found for this department", "error");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // ✅ Use auditScheduleApi instead of raw fetch
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
        setFormData((prev) => ({
          ...prev,
          documentNumber: answers.documentNumber || prev.documentNumber,
          department: audit.department || prev.department,
          location: answers.location || "",
          shift: audit.shift || "Morning",
          date: audit.auditDate ? audit.auditDate.split("T")[0] : prev.date,
          auditorName: audit.auditorName || user?.name || "",
          auditorId: audit.auditorId || user?.id,
          auditorSignature: answers.auditorSignature || "",
          auditeeName: audit.auditeeName || answers.auditeeName || "",
          auditeeId: audit.auditeeId || answers.auditeeId || "",
          status: audit.status || "IN_PROGRESS",
          responses: answers.responses || prev.responses,
          observations: answers.observations || prev.observations,
          score: answers.score || null,
        }));
      }
    } catch (error) {
      console.error("Error loading audit:", error);
      addToast("Failed to load audit data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (editId && questions.length > 0 && !currentCheckSheet) loadAuditData();
  }, [editId, questions]);

  // ✅ ADD KEYBOARD NAVIGATION FOR STEP 2 (WEB ONLY)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (currentStep === 2) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true";

        // Ignore arrow keys if the user is actively typing in the observation field
        if (isInput) return;

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          if (currentCheckpointIndex > 0) {
            setCurrentCheckpointIndex((prev) => prev - 1);
            scrollToTop();
          }
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          if (currentCheckpointIndex < questions.length - 1) {
            setCurrentCheckpointIndex((prev) => prev + 1);
            scrollToTop();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentStep, currentCheckpointIndex, questions.length]);

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

  useEffect(() => {
    const keywordStatusMap = {
      MAJOR_NC: [
        "critical",
        "major",
        "serious",
        "severe",
        "not performed",
        "not met",
        "overdue",
        "ineffective",
        "no evidence",
        "missing completely",
        "not implemented",
        "failure",
        "rejected",
        "non-conforming",
        "risk",
        "danger",
        "urgent",
        "immediate action",
        "breakdown",
        "shutdown",
        "stop production",
        "customer complaint",
        "recall",
      ],
      MINOR_NC: [
        "minor",
        "some",
        "gaps",
        "incomplete",
        "partial",
        "occasional",
        "not consistently",
        "not always",
        "sometimes",
        "few",
        "slight",
        "needs improvement",
        "could be improved",
        "deficiency",
        "observation",
        "suggestion",
        "recommendation",
      ],
      COMPLIANT: [
        "met",
        "maintained",
        "adequate",
        "documented",
        "compliant",
        "satisfactory",
        "properly",
        "all requirements",
        "followed",
        "up to date",
        "verified",
        "confirmed",
        "ok",
        "good",
        "fine",
        "acceptable",
        "sufficient",
        "complete",
        "available",
      ],
    };
    questions.forEach((q) => {
      const observation = formData.observations[q.slNo] || "";
      const currentStatus = formData.responses[q.slNo];
      const lowerObservation = observation.toLowerCase();
      if (!observation.trim()) return;
      let detectedStatus: string | null = null;
      for (const keyword of keywordStatusMap.MAJOR_NC) {
        if (lowerObservation.includes(keyword)) {
          detectedStatus = "MAJOR_NC";
          break;
        }
      }
      if (!detectedStatus) {
        for (const keyword of keywordStatusMap.MINOR_NC) {
          if (lowerObservation.includes(keyword)) {
            detectedStatus = "MINOR_NC";
            break;
          }
        }
      }
      if (!detectedStatus) {
        for (const keyword of keywordStatusMap.COMPLIANT) {
          if (lowerObservation.includes(keyword)) {
            detectedStatus = "COMPLIANT";
            break;
          }
        }
      }
      if (detectedStatus && detectedStatus !== currentStatus)
        handleStatusChange(q.slNo, detectedStatus);
    });
  }, [formData.observations, questions]);

  const calculateCurrentScore = () =>
    calculateScore(formData.responses, questions);
  const getNcrFindings = () =>
    questions.filter((q) =>
      ["MINOR_NC", "MAJOR_NC"].includes(formData.responses[q.slNo]),
    );

  const buildNcrQuery = (savedResponseId: any) => {
    const ncQuestions = getNcrFindings();
    const params = new URLSearchParams();
    params.append("auditId", String(savedResponseId || ""));
    params.append("department", formData.department || "");
    params.append("shift", formData.shift || "Day");
    params.append("auditReportNumber", formData.documentNumber || "");
    if (formData.auditeeId)
      params.append("auditeeId", String(formData.auditeeId));
    if (formData.auditeeName)
      params.append("auditeeName", formData.auditeeName);
    params.append(
      "clause",
      ncQuestions
        .map((q) => (q.clause ? `Clause ${q.clause}` : `Question ${q.slNo}`))
        .join("\n"),
    );
    params.append(
      "evidence",
      ncQuestions
        .map((q) => {
          const status =
            formData.responses[q.slNo] === "MAJOR_NC" ? "Major NC" : "Minor NC";
          const observation =
            formData.observations[q.slNo] || "Observation not entered";
          return `Q${q.slNo}: ${q.checkpoint}\nStatus: ${status}\nEvidence: ${observation}`;
        })
        .join("\n"),
    );
    params.append(
      "statement",
      ncQuestions
        .map((q) => {
          const status =
            formData.responses[q.slNo] === "MAJOR_NC"
              ? "Major nonconformity"
              : "Minor nonconformity";
          return `${status} identified for Q${q.slNo}: ${q.checkpoint}`;
        })
        .join("\n"),
    );
    return params.toString();
  };

  const goToNcrForm = (savedResponseId: any) => {
    if (!savedResponseId) {
      addToast("First submit the audit to save the report number.", "warning");
      return;
    }
    router.push(`/form7?${buildNcrQuery(savedResponseId)}` as any);
  };

  const saveAuditData = async (status: string, isSubmit = false) => {
    if (!currentCheckSheet || !currentCheckSheet.id) {
      addToast("No form selected", "error");
      return;
    }
    setSaving(true);
    try {
      const score = calculateCurrentScore();
      const answersObject = {
        documentNumber: formData.documentNumber,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        auditorSignature: formData.auditorSignature,
        responses: formData.responses,
        observations: formData.observations,
        score,
        formName: currentCheckSheet.name,
        processName: currentCheckSheet.processName,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId,
        auditorName: formData.auditorName,
        department: formData.department,
        shift: formData.shift,
      };
      const totalQuestions = questions.length;
      const compliantCount = Object.values(formData.responses).filter(
        (r) => r === "COMPLIANT",
      ).length;
      const minorNCCount = Object.values(formData.responses).filter(
        (r) => r === "MINOR_NC",
      ).length;
      const majorNCCount = Object.values(formData.responses).filter(
        (r) => r === "MAJOR_NC",
      ).length;
      const percentageScore =
        totalQuestions > 0 ? (compliantCount * 100.0) / totalQuestions : 0;

      const payload = {
        checkSheet: { id: currentCheckSheet.id },
        auditScheduleId: scheduleId ? parseInt(String(scheduleId)) : null,
        department: formData.department,
        shift: formData.shift,
        auditDate: formData.date,
        auditorName: formData.auditorName,
        auditorId: formData.auditorId
          ? parseInt(String(formData.auditorId))
          : null,
        auditeeName: formData.auditeeName,
        auditeeId: formData.auditeeId
          ? parseInt(String(formData.auditeeId))
          : null,
        answers: JSON.stringify(answersObject),
        totalScore: compliantCount,
        maxPossibleScore: totalQuestions,
        percentageScore,
        compliantCount,
        minorNCCount,
        majorNCCount,
        status,
      };

      let saved;
      if (responseId) {
        // ✅ Use auditScheduleApi for updates
        await auditScheduleApi.updateAuditResponse(responseId, payload);
        saved = { id: responseId };
        if (!isSubmit) addToast("Draft updated", "success");
      } else {
        // ✅ Use auditScheduleApi for saving
        const response = await auditScheduleApi.saveAuditResponse(payload);

        // ✅ Safely handle both { data: { id: ... } } and direct { id: ... } responses
        saved = response?.data || response;
        if (!saved || !saved.id) {
          throw new Error(
            "Failed to get ID from save response. Check console logs.",
          );
        }

        setResponseId(saved.id);
        if (!isSubmit) addToast("Draft saved", "success");
      }

      if (isSubmit && saved.id) {
        // ✅ Use auditScheduleApi for submission
        await auditScheduleApi.submitAuditResponse(saved.id);
        addToast(
          `Audit submitted! Score: ${percentageScore.toFixed(2)}%`,
          "success",
        );
        setSubmissionResult({
          savedId: saved.id,
          score: percentageScore,
          ncrCount: minorNCCount + majorNCCount,
          compliantCount,
          department: formData.department,
          documentNumber: formData.documentNumber,
        });
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("Error saving:", error);
      addToast(
        `Failed to ${isSubmit ? "submit" : "save"} audit: ${error.message}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveDraft = async () => {
    if (!currentCheckSheet) {
      addToast("Please select an audit form first", "warning");
      return;
    }
    await saveAuditData("DRAFT", false);
  };

  const submitAudit = async () => {
    if (!isManualSubmitRef.current) return;
    isManualSubmitRef.current = false;
    if (!currentCheckSheet) {
      addToast("No audit form selected", "error");
      return;
    }
    const unanswered = questions.filter((q) => !formData.responses[q.slNo]);
    if (unanswered.length > 0) {
      addToast(
        `Please answer all ${unanswered.length} remaining questions`,
        "error",
      );
      setCurrentStep(2);
      setCurrentCheckpointIndex(
        questions.findIndex((q) => !formData.responses[q.slNo]),
      );
      return;
    }
    if (!formData.auditeeName.trim()) {
      addToast("Please enter Auditee Name", "error");
      setCurrentStep(1);
      return;
    }
    if (!formData.auditorSignature && !auditorSignatureImage) {
      addToast("Please provide auditor signature", "error");
      setCurrentStep(3);
      return;
    }
    await saveAuditData("SUBMITTED", true);
  };

  const handleAutoFill = () => {
    const allObservations = [
      {
        text: "✓ Risk assessment documented and reviewed. All mitigation plans in place and effective.",
        status: "COMPLIANT",
      },
      {
        text: "✓ Interested parties identified and their requirements documented. Regular monitoring in place.",
        status: "COMPLIANT",
      },
      {
        text: "✓ Management actively engaged. Quality policy communicated and understood by all employees.",
        status: "COMPLIANT",
      },
      {
        text: "✓ Documentation complete and up-to-date. All processes follow defined procedures.",
        status: "COMPLIANT",
      },
      {
        text: "✓ Training records maintained. Competency matrix updated. All personnel qualified.",
        status: "COMPLIANT",
      },
      {
        text: "⚠ Quality objectives defined but monitoring not consistently done. Some targets not tracked monthly.",
        status: "MINOR_NC",
      },
      {
        text: "⚠ 5S audit conducted but some areas need improvement. Minor housekeeping issues observed.",
        status: "MINOR_NC",
      },
      {
        text: "⚠ Training need identified but schedule not fully followed. Minor gaps in skill matrix.",
        status: "MINOR_NC",
      },
      {
        text: "⚠ Documentation available but some records not properly filed. Minor procedural deviations.",
        status: "MINOR_NC",
      },
      {
        text: "⚠ Preventive maintenance conducted but some records incomplete. Minor delays in schedule.",
        status: "MINOR_NC",
      },
      {
        text: "🔴 CRITICAL: Risk assessment NOT performed for key processes. No mitigation plan in place.",
        status: "MAJOR_NC",
      },
      {
        text: "🔴 MAJOR: Quality requirements NOT MET. Customer specification not followed for critical parameters.",
        status: "MAJOR_NC",
      },
      {
        text: "🔴 SERIOUS: Calibration overdue for critical measuring equipment. Product quality at risk.",
        status: "MAJOR_NC",
      },
      {
        text: "🔴 CRITICAL: Root cause analysis NOT performed for recurring non-conformities.",
        status: "MAJOR_NC",
      },
      {
        text: "🔴 MAJOR: Management review NOT conducted as per schedule. No evidence of top management commitment.",
        status: "MAJOR_NC",
      },
    ];
    const shuffledObservations = [...allObservations];
    for (let i = shuffledObservations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledObservations[i], shuffledObservations[j]] = [
        shuffledObservations[j],
        shuffledObservations[i],
      ];
    }
    questions.forEach((q, idx) => {
      const randomIndex = Math.floor(
        Math.random() * shuffledObservations.length,
      );
      const observation = shuffledObservations[randomIndex];
      handleObservationChange(q.slNo, observation.text);
      handleStatusChange(q.slNo, observation.status);
    });
    if (!formData.auditeeName.trim())
      handleInputChange("auditeeName", "Demo Auditee User");
    if (!formData.location.trim())
      handleInputChange("location", "Plant A, Main Production Area");
    const stats = getProgressStats();
    addToast(
      `✅ Demo data filled: ${stats.compliant} Compliant, ${stats.minorNC} Minor NC, ${stats.majorNC} Major NC`,
      "success",
    );
  };

  const getProgressStats = () => {
    const total = questions.length;
    const completed = Object.keys(formData.responses).filter(
      (key) => formData.responses[Number(key)],
    ).length;
    const compliant = Object.values(formData.responses).filter(
      (r) => r === "COMPLIANT",
    ).length;
    const minorNC = Object.values(formData.responses).filter(
      (r) => r === "MINOR_NC",
    ).length;
    const majorNC = Object.values(formData.responses).filter(
      (r) => r === "MAJOR_NC",
    ).length;
    return { total, completed, compliant, minorNC, majorNC };
  };

  const stats = getProgressStats();
  const allCheckpointsRated = stats.completed === stats.total;
  const currentQ = questions[currentCheckpointIndex];
  const ncrFindings = getNcrFindings();

  const scrollToTop = () =>
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

  const handleGoBack = () => {
    if (props.onClose) props.onClose();
    else router.back();
  };

  // ✅ EMPTY STATES
  if (isAlreadyCompleted) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="max-w-md p-8 mx-auto text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: 16 }} />
          <Text className="text-xl font-bold text-slate-800">
            Form Already Completed
          </Text>
          <Text className="mt-2 text-sm text-slate-500">
            The form "{processNameParam}" has already been completed for this
            audit schedule.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/auditor")}
            className="px-5 py-2.5 mt-6 rounded-xl shadow-md"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <Text className="text-sm font-medium text-white">
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !currentCheckSheet) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm rounded-2xl border-slate-200">
          <ActivityIndicator
            size="large"
            color={NAVBAR_COLORS.primary}
            style={{ marginBottom: 16 }}
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading audit forms...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showSheetSelector && availableSheets.length > 1 && !currentCheckSheet) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <ScrollView
          className="flex-1 px-4 py-8"
          contentContainerStyle={{
            maxWidth: 900,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <TouchableOpacity
            onPress={handleGoBack}
            className="flex-row items-center gap-2 px-4 py-2.5 mb-6 bg-white border border-slate-200 rounded-xl shadow-sm self-start"
          >
            <ArrowLeft size={16} color="#334155" />
            <Text className="text-sm font-medium text-slate-700">Back</Text>
          </TouchableOpacity>
          <View className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
            <View
              className="flex-row items-center gap-3 p-6 border-b border-slate-100"
              style={{ backgroundColor: NAVBAR_COLORS.bg }}
            >
              <View
                className="p-2 rounded-lg"
                style={{ backgroundColor: NAVBAR_COLORS.lighter }}
              >
                <Layers size={28} color={NAVBAR_COLORS.primary} />
              </View>
              <View>
                <Text className="text-xl font-bold text-slate-800">
                  Select IATF Audit Form
                </Text>
                <Text className="text-sm text-slate-500 mt-0.5">
                  Department:{" "}
                  <Text className="font-semibold text-slate-700">
                    {departmentParam || formData.department}
                  </Text>
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Multiple audit forms available. Please choose one.
                </Text>
              </View>
            </View>
            <View className="gap-3 p-6">
              {availableSheets.map((sheet) => (
                <TouchableOpacity
                  key={sheet.id}
                  onPress={() => loadSheetQuestions(sheet)}
                  className="flex-row items-center justify-between p-4 bg-white border shadow-sm border-slate-200 rounded-xl"
                >
                  <View className="flex-1">
                    <Text className="font-bold text-slate-800">
                      {sheet.name}
                    </Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      {sheet.description ||
                        `IATF 16949 audit for ${sheet.processName} process`}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (
    !currentCheckSheet &&
    !loading &&
    !showSheetSelector &&
    (departmentParam || formData.department)
  ) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: NAVBAR_COLORS.bg }}
      >
        <View className="max-w-md p-8 mx-auto text-center bg-white border shadow-sm border-slate-200 rounded-2xl">
          <AlertCircle size={48} color="#f43f5e" style={{ marginBottom: 16 }} />
          <Text className="text-xl font-bold text-slate-800">
            No IATF Forms Found
          </Text>
          <Text className="mt-2 text-sm text-slate-500">
            Department "{departmentParam || formData.department}" has no
            associated IATF audit forms.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/auditor")}
            className="px-5 py-2.5 mt-6 rounded-xl shadow-md"
            style={{ backgroundColor: NAVBAR_COLORS.primary }}
          >
            <Text className="text-sm font-medium text-white">
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ SUCCESS MODAL
  const SubmissionSuccessModal = () => {
    if (!showSuccessModal || !submissionResult) return null;
    return (
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View className="items-center justify-center flex-1 p-4 bg-slate-900/60">
          <View className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-3xl">
            <View
              className="items-center px-6 pt-8 pb-6"
              style={{ backgroundColor: NAVBAR_COLORS.primary }}
            >
              <View className="items-center justify-center w-16 h-16 mb-4 bg-white rounded-full shadow-lg">
                <CheckCircle size={32} color="#10b981" />
              </View>
              <Text className="text-xl font-bold text-white">
                Audit Submitted!
              </Text>
              <Text className="mt-1 text-sm text-blue-200">
                Report #{submissionResult.documentNumber}
              </Text>
            </View>
            <View className="px-6 py-5">
              <View className="flex-row gap-3 mb-5">
                <View className="items-center flex-1 p-3 border rounded-xl bg-emerald-50 border-emerald-100">
                  <Text className="text-2xl font-bold text-emerald-600">
                    {submissionResult.compliantCount}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500">
                    Compliant
                  </Text>
                </View>
                <View className="items-center flex-1 p-3 border border-blue-100 rounded-xl bg-blue-50">
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: NAVBAR_COLORS.primary }}
                  >
                    {submissionResult.score.toFixed(1)}%
                  </Text>
                  <Text className="text-xs font-medium text-slate-500">
                    Score
                  </Text>
                </View>
                <View className="items-center flex-1 p-3 border rounded-xl bg-rose-50 border-rose-100">
                  <Text className="text-2xl font-bold text-rose-600">
                    {submissionResult.ncrCount}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500">
                    NCR Findings
                  </Text>
                </View>
              </View>

              {submissionResult.ncrCount > 0 ? (
                <View className="flex-row items-start gap-2 p-3 mb-4 border rounded-xl bg-amber-50 border-amber-200">
                  <AlertTriangle
                    size={16}
                    color="#d97706"
                    style={{ marginTop: 2 }}
                  />
                  <Text className="flex-1 text-xs text-amber-700">
                    <Text className="font-bold">
                      {submissionResult.ncrCount} non-conformit
                      {submissionResult.ncrCount > 1 ? "ies" : "y"} found.
                    </Text>{" "}
                    Raise an NCR to initiate corrective action for{" "}
                    {submissionResult.department} department.
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-start gap-2 p-3 mb-4 border rounded-xl bg-emerald-50 border-emerald-200">
                  <CheckCircle
                    size={16}
                    color="#059669"
                    style={{ marginTop: 2 }}
                  />
                  <Text className="flex-1 text-xs text-emerald-700">
                    <Text className="font-bold">
                      All checkpoints compliant.
                    </Text>{" "}
                    No non-conformities found. Great audit!
                  </Text>
                </View>
              )}

              <View className="flex-col gap-3">
                {submissionResult.ncrCount > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowSuccessModal(false);
                      goToNcrForm(submissionResult.savedId);
                    }}
                    className="flex-row items-center justify-center gap-2 px-5 py-3 font-semibold text-white shadow-md bg-rose-600 rounded-xl"
                  >
                    <AlertCircle size={18} color="#ffffff" />
                    <Text className="text-white">
                      Raise NCR ({submissionResult.ncrCount} finding
                      {submissionResult.ncrCount > 1 ? "s" : ""})
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.replace("/auditor");
                  }}
                  className={`flex-row items-center justify-center gap-2 px-5 py-3 font-semibold rounded-xl shadow-sm ${submissionResult.ncrCount > 0 ? "text-slate-700 bg-white border border-slate-200" : "text-white"}`}
                  style={
                    submissionResult.ncrCount === 0
                      ? { backgroundColor: NAVBAR_COLORS.primary }
                      : {}
                  }
                >
                  <ArrowLeft
                    size={18}
                    color={
                      submissionResult.ncrCount > 0 ? "#334155" : "#ffffff"
                    }
                  />
                  <Text
                    style={{
                      color:
                        submissionResult.ncrCount > 0 ? "#334155" : "#ffffff",
                    }}
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
      <SubmissionSuccessModal />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            minHeight: "100%",
            paddingBottom: 40,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ maxWidth: 900, width: "100%", alignSelf: "center" }}>
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
                  {currentStep === 2 && questions.length > 0 && (
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
                      disabled={
                        !allCheckpointsRated || saving || !currentCheckSheet
                      }
                      className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl shadow-md ${allCheckpointsRated && !saving && currentCheckSheet ? "" : "opacity-50"}`}
                      style={{
                        backgroundColor:
                          allCheckpointsRated && !saving && currentCheckSheet
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

            {currentCheckSheet && (
              <FadeInView delay={100}>
                <View
                  className="px-4 py-3 mb-6 border rounded-xl"
                  style={{
                    backgroundColor: NAVBAR_COLORS.bg,
                    borderColor: NAVBAR_COLORS.lighter,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: NAVBAR_COLORS.dark }}
                  >
                    <Text className="font-bold">Selected Form:</Text>{" "}
                    {currentCheckSheet.name}{" "}
                    {currentCheckSheet.processName
                      ? `(Process: ${currentCheckSheet.processName})`
                      : ""}
                  </Text>
                </View>
              </FadeInView>
            )}

            {/* Step Progress Bar */}
            <FadeInView delay={150}>
              <View
                className="flex-row items-start justify-between w-full px-4 mb-8"
                style={{ maxWidth: 900, alignSelf: "center" }}
              >
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  const isClickable =
                    step.number < currentStep ||
                    (step.number === 2 && currentStep === 1) ||
                    (step.number === 3 && currentStep === 2);

                  return (
                    <React.Fragment key={step.number}>
                      {/* Step Item (Vertical Stack) */}
                      <TouchableOpacity
                        onPress={() =>
                          isClickable && setCurrentStep(step.number)
                        }
                        disabled={!isClickable}
                        className={`flex-1 items-center ${isClickable ? "" : "opacity-70"}`}
                      >
                        {/* Icon Container */}
                        <View
                          className={`w-10 h-10 rounded-xl items-center justify-center shadow-sm ${
                            isActive || isCompleted
                              ? "bg-[#00529B]"
                              : "bg-slate-100"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle size={20} color="#ffffff" />
                          ) : (
                            <Icon
                              size={20}
                              color={
                                isActive || isCompleted ? "#ffffff" : "#64748b"
                              }
                            />
                          )}
                        </View>

                        {/* Text Labels */}
                        <View className="items-center mt-2">
                          <Text
                            className="text-[10px] font-medium"
                            style={{
                              color: isActive
                                ? NAVBAR_COLORS.secondary
                                : "#64748b",
                            }}
                          >
                            Step {step.number}
                          </Text>
                          <Text
                            className={`text-xs font-semibold text-center ${
                              isActive ? "text-slate-800" : "text-slate-600"
                            }`}
                            numberOfLines={1}
                          >
                            {isDesktop ? step.title : step.title.split(" ")[0]}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Connecting Line (Centered with the icon) */}
                      {idx < steps.length - 1 && (
                        <View className="justify-center flex-1 px-2 mt-5">
                          <View
                            className={`h-0.5 w-full ${
                              isCompleted ? "bg-blue-500" : "bg-slate-200"
                            }`}
                          />
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </FadeInView>

            {/* ======================================================================== */}
            {/* STEP 1: General Information (ALL FIELDS INCLUDED)                        */}
            {/* ======================================================================== */}
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
                      <Building size={20} color={NAVBAR_COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-slate-800">
                        General Information
                      </Text>
                      <Text className="text-xs text-slate-500 mt-0.5">
                        Audit details for {formData.department} Department
                        {currentCheckSheet?.processName &&
                          ` - ${currentCheckSheet.processName} Process`}
                      </Text>
                    </View>
                  </View>
                  <View className="p-6">
                    <View
                      className={`flex-row flex-wrap ${isDesktop ? "-mx-2" : ""}`}
                    >
                      {/* Audit Number */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Audit Number
                        </Text>
                        <TextInput
                          value={formData.documentNumber}
                          editable={false}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                        />
                      </View>

                      {/* Department */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Department
                        </Text>
                        <TextInput
                          value={formData.department}
                          editable={false}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                          style={{ color: NAVBAR_COLORS.primary }}
                        />
                      </View>

                      {/* Process (IATF Form) */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Process (IATF Form)
                        </Text>
                        <TextInput
                          value={currentCheckSheet?.processName || "N/A"}
                          editable={false}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-blue-50 text-blue-700 font-medium"
                        />
                      </View>

                      {/* Location */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Location
                        </Text>
                        <TextInput
                          value={formData.location}
                          onChangeText={(val) =>
                            handleInputChange("location", val)
                          }
                          placeholder="Audit location"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
                      </View>

                      {/* Date */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                        style={{ flexShrink: 0 }}
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Date <Text className="text-rose-500">*</Text>
                        </Text>
                        {Platform.OS === "web" ? (
                          <View style={{ width: "95%" }}>
                            <input
                              type="date"
                              value={formData.date}
                              onChange={(e) =>
                                handleInputChange("date", e.target.value)
                              }
                              onClick={(e) => {
                                const target = e.target as HTMLInputElement;
                                if (target.showPicker) target.showPicker();
                              }}
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                color: "#1e293b",
                                outline: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontFamily: "inherit",
                              }}
                            />
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              onPress={() => setShowDatePicker(true)}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl flex-row items-center justify-between"
                            >
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
                                  setShowDatePicker(Platform.OS === "ios");
                                  if (selectedDate)
                                    handleInputChange(
                                      "date",
                                      selectedDate.toISOString().split("T")[0],
                                    );
                                }}
                              />
                            )}
                          </>
                        )}
                      </View>

                      {/* Shift */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <View className="flex-row items-center gap-1.5 mb-1.5">
                          <Clock size={14} color="#334155" />
                          <Text className="text-sm font-medium text-slate-700">
                            Shift
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setIsShiftOpen(true)}
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
                          <ChevronDown size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        {/* Shift Selection Modal */}
                        <Modal
                          visible={isShiftOpen}
                          transparent
                          animationType="fade"
                          onRequestClose={() => setIsShiftOpen(false)}
                        >
                          <TouchableOpacity
                            className="items-center justify-center flex-1 bg-slate-900/50"
                            activeOpacity={1}
                            onPressOut={() => setIsShiftOpen(false)}
                          >
                            <View
                              className="overflow-hidden bg-white rounded-2xl"
                              style={{
                                width: "90%",
                                maxWidth: 400,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 10,
                              }}
                            >
                              <View className="p-4 border-b border-slate-100">
                                <Text className="text-lg font-bold text-center text-slate-800">
                                  Select Shift
                                </Text>
                              </View>
                              <View>
                                {["Morning", "Evening", "Night", "General"].map(
                                  (shift, idx) => (
                                    <TouchableOpacity
                                      key={shift}
                                      onPress={() => {
                                        handleInputChange("shift", shift);
                                        setIsShiftOpen(false);
                                      }}
                                      style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 14,
                                        backgroundColor:
                                          formData.shift === shift
                                            ? NAVBAR_COLORS.bg
                                            : "#ffffff",
                                        borderBottomWidth: idx < 3 ? 1 : 0,
                                        borderBottomColor: "#f1f5f9",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 15,
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
                                          size={18}
                                          color={NAVBAR_COLORS.primary}
                                        />
                                      )}
                                    </TouchableOpacity>
                                  ),
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        </Modal>
                      </View>

                      {/* Auditor Name */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Auditor Name
                        </Text>
                        <TextInput
                          value={formData.auditorName}
                          editable={false}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                        />
                      </View>

                      {/* Auditee Name */}
                      <View
                        className={
                          isDesktop ? "w-1/2 px-2 mb-5" : "w-full mb-5"
                        }
                      >
                        <Text className="text-sm font-medium text-slate-700 mb-1.5">
                          Auditee Name <Text className="text-rose-500">*</Text>
                        </Text>
                        <TextInput
                          value={formData.auditeeName}
                          onChangeText={(val) =>
                            handleInputChange("auditeeName", val)
                          }
                          placeholder="Enter auditee name"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
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
            {/* ======================================================================== */}
            {/* STEP 2: Audit Checkpoints                                                */}
            {/* ======================================================================== */}
            {currentStep === 2 && questions.length > 0 && currentQ && (
              <FadeInView delay={200}>
                <View className="p-5 mb-6 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-sm font-medium text-slate-600">
                      Checkpoint {currentCheckpointIndex + 1} of{" "}
                      {questions.length}
                    </Text>
                    <View className="flex-row gap-4">
                      <View className="flex-row items-center gap-1.5">
                        <CheckCircle size={12} color="#059669" />
                        <Text className="text-xs font-medium text-emerald-600">
                          {stats.compliant}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Info size={12} color="#d97706" />
                        <Text className="text-xs font-medium text-amber-600">
                          {stats.minorNC}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <AlertCircle size={12} color="#e11d48" />
                        <Text className="text-xs font-medium text-rose-600">
                          {stats.majorNC}
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
                        const isCompleted = formData.responses[q.slNo];
                        let bgColor = "#f8fafc",
                          borderColor = "#e2e8f0",
                          textColor = "#64748b";
                        if (currentCheckpointIndex === idx) {
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
                            className="items-center justify-center border rounded-lg w-9 h-9"
                            style={{ backgroundColor: bgColor, borderColor }}
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
                  className="overflow-hidden bg-white border shadow-sm rounded-2xl"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: getStatusStyle(
                      formData.responses[currentQ.slNo],
                    ).border,
                  }}
                >
                  <View className="p-6">
                    <View className="flex-row flex-wrap items-center gap-3 mb-5">
                      <View
                        className="items-center justify-center w-10 h-10 shadow-md rounded-xl"
                        style={{ backgroundColor: NAVBAR_COLORS.primary }}
                      >
                        <Text className="font-bold text-white">
                          {currentQ.slNo}
                        </Text>
                      </View>
                      {currentQ.clause && (
                        <View
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: NAVBAR_COLORS.bg }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: NAVBAR_COLORS.primary }}
                          >
                            Clause {currentQ.clause}
                          </Text>
                        </View>
                      )}
                      {formData.responses[currentQ.slNo] && (
                        <View
                          className="px-3 py-1 border rounded-full"
                          style={{
                            backgroundColor: getStatusStyle(
                              formData.responses[currentQ.slNo],
                            ).bg,
                            borderColor: getStatusStyle(
                              formData.responses[currentQ.slNo],
                            ).border,
                          }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{
                              color: getStatusStyle(
                                formData.responses[currentQ.slNo],
                              ).text,
                            }}
                          >
                            {
                              STATUS_OPTIONS.find(
                                (o) =>
                                  o.value === formData.responses[currentQ.slNo],
                              )?.short
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="mb-4 text-lg font-bold text-slate-800">
                      {currentQ.checkpoint}
                    </Text>
                    {currentQ.documentsVerified &&
                      currentQ.documentsVerified !==
                        "No documents specified" && (
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
                      )}
                    <View className="mb-6">
                      <Text className="mb-2 text-sm font-bold text-slate-700">
                        Observations / Findings
                      </Text>
                      <View className="mb-2">
                        <Text className="text-xs text-slate-500">
                          💡 <Text className="font-medium">Tip:</Text> Status
                          auto-detects based on keywords:{" "}
                          <Text className="ml-2 font-medium text-emerald-600">
                            ✓ met/compliant
                          </Text>{" "}
                          <Text className="ml-2 font-medium text-amber-600">
                            ⚠ minor/gaps
                          </Text>{" "}
                          <Text className="ml-2 font-medium text-rose-600">
                            🔴 critical/failure
                          </Text>
                        </Text>
                      </View>
                      <TextInput
                        value={formData.observations[currentQ.slNo] || ""}
                        onChangeText={(val) =>
                          handleObservationChange(currentQ.slNo, val)
                        }
                        placeholder="Enter your observations here... (Status will auto-detect)"
                        multiline
                        numberOfLines={3}
                        className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-800"
                        style={{ textAlignVertical: "top" }}
                      />
                    </View>
                    <View className="p-5 mb-6 border rounded-xl bg-slate-50 border-slate-200">
                      <Text className="mb-3 text-sm font-bold text-slate-700">
                        Status / Rating
                      </Text>
                      <View className="flex-row flex-wrap gap-3">
                        {STATUS_OPTIONS.filter(
                          (opt) => opt.value !== "NOT_APPLICABLE",
                        ).map((option) => {
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
                              className="flex-1 min-w-[80px] p-4 items-center border-2 rounded-xl shadow-sm"
                              style={{
                                backgroundColor: isSelected
                                  ? style.bg
                                  : "#ffffff",
                                borderColor: isSelected
                                  ? style.border
                                  : "#e2e8f0",
                              }}
                            >
                              <Icon
                                size={22}
                                color={isSelected ? style.icon : "#94a3b8"}
                              />
                              <Text
                                className="text-sm font-bold mt-1.5"
                                style={{
                                  color: isSelected ? style.text : "#64748b",
                                }}
                              >
                                {option.short}
                              </Text>
                              <Text
                                className="text-[10px] font-medium text-center mt-0.5"
                                style={{
                                  color: isSelected ? style.text : "#64748b",
                                }}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
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
                        {formData.responses[currentQ.slNo] ? (
                          <View className="flex-row items-center gap-1.5">
                            <CheckCircle size={14} color="#059669" />
                            <Text className="text-sm font-medium text-emerald-600">
                              Completed
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1.5">
                            <AlertCircle size={14} color="#d97706" />
                            <Text className="text-sm font-medium text-amber-600">
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
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row gap-6">
                      <View className="items-center">
                        <Text className="text-xl font-bold text-emerald-600">
                          {stats.compliant}
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">
                          Compliant (O)
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xl font-bold text-amber-600">
                          {stats.minorNC}
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">
                          Minor NC (Mi)
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xl font-bold text-rose-600">
                          {stats.majorNC}
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">
                          Major NC (Ma)
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xl font-bold text-slate-600">
                          {stats.total - stats.completed}
                        </Text>
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">
                          Pending
                        </Text>
                      </View>
                    </View>
                  </View>
                  {!allCheckpointsRated && (
                    <View className="p-3 mt-4 border rounded-xl bg-amber-50 border-amber-200">
                      <Text className="text-xs font-medium text-center text-amber-700">
                        ⚠️ Please select status for all{" "}
                        {stats.total - stats.completed} remaining checkpoints
                      </Text>
                    </View>
                  )}
                </View>
                {allCheckpointsRated && (
                  <View className="flex-row justify-end mt-6">
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

            {/* ======================================================================== */}
            {/* STEP 3: Signature & Submit                                               */}
            {/* ======================================================================== */}
            {currentStep === 3 && (
              <FadeInView delay={200}>
                <View className="mb-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
                  <View
                    className="p-6 border-b border-slate-100"
                    style={{ backgroundColor: NAVBAR_COLORS.bg }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: NAVBAR_COLORS.lighter }}
                      >
                        <FileCheck size={20} color={NAVBAR_COLORS.primary} />
                      </View>
                      <View>
                        <Text className="text-lg font-bold text-slate-800">
                          Signature & Submit
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          Review, sign and submit the audit report
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="p-6">
                    <View
                      className="p-5 mb-6 border rounded-xl"
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
                      <View className="flex-row flex-wrap gap-3">
                        <View className="flex-1 min-w-[60px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm">
                          <Text className="text-[10px] font-bold text-slate-500 uppercase">
                            Total
                          </Text>
                          <Text className="mt-1 text-xl font-bold text-slate-800">
                            {stats.total}
                          </Text>
                        </View>
                        <View className="flex-1 min-w-[60px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm">
                          <Text className="text-[10px] font-bold text-slate-500 uppercase">
                            O (Comp)
                          </Text>
                          <Text className="mt-1 text-xl font-bold text-emerald-600">
                            {stats.compliant}
                          </Text>
                        </View>
                        <View className="flex-1 min-w-[60px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm">
                          <Text className="text-[10px] font-bold text-slate-500 uppercase">
                            Mi (Minor)
                          </Text>
                          <Text className="mt-1 text-xl font-bold text-amber-600">
                            {stats.minorNC}
                          </Text>
                        </View>
                        <View className="flex-1 min-w-[60px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm">
                          <Text className="text-[10px] font-bold text-slate-500 uppercase">
                            Ma (Major)
                          </Text>
                          <Text className="mt-1 text-xl font-bold text-rose-600">
                            {stats.majorNC}
                          </Text>
                        </View>
                        <View className="flex-1 min-w-[60px] p-3 bg-white border border-slate-100 rounded-xl items-center shadow-sm">
                          <Text className="text-[10px] font-bold text-slate-500 uppercase">
                            Score
                          </Text>
                          <Text
                            className="mt-1 text-xl font-bold"
                            style={{ color: NAVBAR_COLORS.primary }}
                          >
                            {calculateCurrentScore()}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    {stats.minorNC + stats.majorNC > 0 &&
                      ncrFindings.length > 0 && (
                        <View className="p-5 mb-6 border rounded-xl bg-rose-50 border-rose-200">
                          <View className="flex-row items-start justify-between gap-3 mb-3">
                            <View style={{ flex: 1, flexShrink: 1 }}>
                              <Text className="text-sm font-bold text-rose-800">
                                ⚠️ NCR Required for audit report{" "}
                                {formData.documentNumber}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => goToNcrForm(responseId)}
                              className="flex-row items-center gap-2 px-3 py-1.5 bg-rose-600 rounded-lg shadow-sm"
                              style={{ flexShrink: 0 }}
                            >
                              <AlertCircle size={14} color="#ffffff" />
                              <Text className="text-xs font-medium text-white">
                                Raise NCR
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View className="gap-2">
                            {ncrFindings.slice(0, 3).map((finding) => (
                              <View
                                key={finding.slNo}
                                className="p-3 bg-white border rounded-lg border-rose-100"
                              >
                                <Text className="text-xs font-bold text-slate-800">
                                  Q{finding.slNo}:{" "}
                                  {finding.checkpoint.substring(0, 60)}
                                </Text>
                                <Text className="mt-0.5 text-rose-700 font-medium text-xs">
                                  {formData.responses[finding.slNo] ===
                                  "MAJOR_NC"
                                    ? "Major NC"
                                    : "Minor NC"}
                                  {finding.clause ? ` - ${finding.clause}` : ""}
                                </Text>
                              </View>
                            ))}
                            {ncrFindings.length > 3 && (
                              <Text className="text-xs font-medium text-center text-rose-600">
                                +{ncrFindings.length - 3} more findings
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                    <View className="mb-6">
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

                    <View
                      className={isDesktop ? "w-auto  mb-5" : "w-full mb-5"}
                      style={{ flexShrink: 0 }}
                    >
                      <Text className="text-sm font-medium text-slate-700 mb-1.5">
                        Date <Text className="text-rose-500">*</Text>
                      </Text>
                      {Platform.OS === "web" ? (
                        <View style={{ width: "97%" }}>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) =>
                              handleInputChange("date", e.target.value)
                            }
                            onClick={(e) => {
                              const target = e.target as HTMLInputElement;
                              if (target.showPicker) target.showPicker();
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              color: "#1e293b",
                              outline: "none",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontFamily: "inherit",
                            }}
                          />
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl flex-row items-center justify-between"
                          >
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
                                setShowDatePicker(Platform.OS === "ios");
                                if (selectedDate)
                                  handleInputChange(
                                    "date",
                                    selectedDate.toISOString().split("T")[0],
                                  );
                              }}
                            />
                          )}
                        </>
                      )}
                    </View>

                    <View className="mb-6">
                      <View className="flex-row items-center mb-2">
                        <User size={14} color="#334155" />
                        <Text className="ml-1 text-sm font-bold text-slate-700">
                          Auditee Name
                        </Text>
                      </View>
                      <TextInput
                        value={formData.auditeeName}
                        editable={false}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                      />
                      <Text className="mt-1 text-xs text-slate-500">
                        Auditee will review and sign separately
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between pt-6 mt-6 border-t border-slate-100">
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
                          (!formData.auditorSignature &&
                            !auditorSignatureImage) ||
                          !formData.date.trim() ||
                          saving ||
                          !allCheckpointsRated
                        }
                        className={`flex-row items-center gap-2 px-6 py-2.5 rounded-xl shadow-md ${(!formData.auditorSignature && !auditorSignatureImage) || !formData.date.trim() || saving || !allCheckpointsRated ? "opacity-50" : ""}`}
                        style={{
                          backgroundColor:
                            (!formData.auditorSignature &&
                              !auditorSignatureImage) ||
                            !formData.date.trim() ||
                            saving ||
                            !allCheckpointsRated
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
