import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import { ncrService } from "@/services/ncrService"; // Adjust path as needed
import { getDashboardPath } from "@/utils/roleUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Info,
  Loader2,
  PenTool,
  Save,
  User,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

// ============================================================================
// COLOR PALETTE
// ============================================================================
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

// ============================================================================
// ANIMATION WRAPPER (Mimics Tailwind animate-fadeInUp)
// ============================================================================
const FadeInView = ({ children, delay = 0, className = "" }: any) => {
  // Note: For full NativeWind animation support, ensure your tailwind.config.js
  // includes the fadeInUp keyframes, or use this simple opacity fade.
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setOpacity(1), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <View
      className={className}
      style={{ opacity, transitionDuration: "600ms" }}
    >
      {children}
    </View>
  );
};

// ============================================================================
// REUSABLE INPUT COMPONENT
// ============================================================================
const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  rows,
  required,
  disabled,
  multiline = false,
}: any) => (
  <View className="mb-1">
    {label && (
      <Text className="mb-1 text-xs font-medium text-slate-700">
        {label}
        {required && <Text className="ml-1 text-rose-500">*</Text>}
      </Text>
    )}
    <TextInput
      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white shadow-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      value={value}
      onChangeText={onChange}
      editable={!disabled}
      multiline={multiline}
      numberOfLines={rows || (multiline ? 4 : 1)}
      textAlignVertical="top"
    />
  </View>
);
// ============================================================================
// DATE INPUT (Fixed for Web & Mobile)
// ============================================================================
const DateInput = ({ value, onChange, placeholder = "Select Date" }: any) => {
  const [show, setShow] = useState(false);

  // ✅ Safely parse date to prevent "Invalid Date" crashes
  const getDateValue = () => {
    if (!value) return new Date();
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  if (Platform.OS === "web") {
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white shadow-sm text-slate-800 cursor-pointer"
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white shadow-sm flex-row items-center justify-between"
      >
        <Text
          className={`text-sm ${value ? "text-slate-800" : "text-slate-400"}`}
        >
          {value || placeholder}
        </Text>
        <Calendar size={16} color="#94a3b8" />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={getDateValue()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            // ✅ FIX: Properly handle Android picker dismissal
            if (Platform.OS === "android") {
              setShow(false);
            } else {
              // iOS requires manual dismissal check
              setShow(event.type === "dismissed" ? false : true);
            }

            // ✅ FIX: Only update the form state if the user actually selected a date
            if (selectedDate && event.type === "set") {
              onChange(selectedDate.toISOString().split("T")[0]);
            }
          }}
        />
      )}
    </>
  );
};
// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Form7View({ initialParams, onClose }: any) {
  const router = useRouter();
  const urlParams = useLocalSearchParams(); // ✅ 1. Declare urlParams FIRST

  // ✅ 2. Merge URL params and initial props AFTER urlParams is declared
  const params = useMemo(() => {
    return { ...urlParams, ...initialParams };
  }, [JSON.stringify(urlParams), JSON.stringify(initialParams)]);

  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [auditeeOptions, setAuditeeOptions] = useState<any[]>([]);
  const [createdNcr, setCreatedNcr] = useState<any>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [sourceAuditReportNumber, setSourceAuditReportNumber] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [ncrResult, setNcrResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    auditReportNumber: "",
    ncrNumber: "",
    processDepartment: "",
    clauseNumbers: "",
    objectiveEvidence: "",
    statement: "",
    dueDate: "",
    auditorName: "",
    auditorSignature: "",
    auditeeName: "",
    auditeeSignature: "",
    auditId: null as number | null,
    auditorId: null as number | null,
    auditeeId: null as number | null,
    shift: "Day",
  });

  const setValue = (key: string, value: any) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const fetchSignature = async (userId: string | number) => {
    if (!userId) return null;
    try {
      let token = null;

      // ✅ FIX: Reliably get token based on platform
      if (Platform.OS === "web") {
        token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
      } else {
        token = await AsyncStorage.getItem("token"); // ✅ Works perfectly on iOS/Android
      }

      const response = await fetch(
        `${API_BASE_URL}/api/users/${userId}/signature`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      return null;
    } catch (error) {
      console.error("❌ Error fetching signature:", error);
      return null;
    }
  };

  // Load auditor signature on mount
  useEffect(() => {
    const loadAuditorSignature = async () => {
      if (!user?.id) return; // ✅ Early return if no ID

      try {
        const signature = await fetchSignature(user.id);
        if (signature) {
          setFormData((prev) => ({
            ...prev,
            auditorSignature: signature as string,
            auditorName:
              user.name ||
              user.username ||
              `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          }));
        }
      } catch (error) {
        console.error("❌ Error loading signature:", error);
      }
    };

    loadAuditorSignature();
  }, [user?.id]); // ✅ CHANGE THIS: Only depend on user?.id, not the whole user object
  useEffect(() => {
    loadAuditeeOptions();

    const ncrId = params.id as string;
    if (ncrId) {
      fetchNCRData(ncrId);
    } else {
      const prefill = {
        processDepartment: (params.department as string) || "",
        clauseNumbers: (params.clause as string) || "",
        objectiveEvidence: (params.evidence as string) || "",
        statement: (params.statement as string) || "",
        dueDate: (params.dueDate as string) || "",
        auditId: params.auditId ? Number(params.auditId) : null,
        auditeeId: params.auditeeId ? Number(params.auditeeId) : null,
        auditeeName: (params.auditeeName as string) || "",
        shift: (params.shift as string) || "Day",
        auditReportNumber: (params.auditReportNumber as string) || "",
      };
      const incomingAuditReportNumber = (
        (params.auditReportNumber as string) || ""
      ).trim();
      setSourceAuditReportNumber(incomingAuditReportNumber);
      const hasPrefill = Object.values(prefill).some(
        (value) => value !== "" && value !== null && value !== "Day",
      );
      if (hasPrefill) {
        setFormData((prev) => ({ ...prev, ...prefill }));
      }
    }

    if (user) {
      setFormData((prev) => ({
        ...prev,
        auditorId: typeof user.id === "string" ? parseInt(user.id) : user.id,
        auditorName:
          user.name ||
          user.username ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      }));
    }
    // ✅ CRITICAL FIX: Depend on stringified params and user.id to prevent infinite re-renders
  }, [JSON.stringify(params), user?.id]);

  const loadAuditeeOptions = async () => {
    try {
      const [auditees, hods] = await Promise.all([
        userAPI.getUsersByRole("AUDITEE"),
        userAPI.getUsersByRole("HOD"),
      ]);
      const merged = [...(auditees || []), ...(hods || [])];
      const unique = Array.from(
        new Map(merged.map((item: any) => [item.id, item])).values(),
      );
      setAuditeeOptions(unique);
    } catch (loadError) {
      console.error("Failed to load auditee options:", loadError);
    }
  };

  const fetchNCRData = async (ncrId: string) => {
    setLoading(true);
    setError(null);
    const result = await ncrService.getNCRById(ncrId);
    if (result.success) {
      const ncr = result.data;
      setFormData({
        companyName: ncr.companyName || "",
        auditReportNumber: ncr.auditReportNumber || "",
        ncrNumber: ncr.ncrNumber || "",
        processDepartment: ncr.department || "",
        clauseNumbers: ncr.clauseNumber || "",
        objectiveEvidence: ncr.objectiveEvidence || "",
        statement: ncr.statementOfNonconformity || "",
        dueDate: ncr.dueDate || "",
        auditorName: ncr.auditorName || "",
        auditorSignature: ncr.auditorSignature || "",
        auditeeName: ncr.auditeeName || "",
        auditeeSignature: "",
        auditId: ncr.auditId,
        auditorId: ncr.auditorId,
        auditeeId: ncr.auditeeId,
        shift: ncr.shift || "Day",
      });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.processDepartment) {
        setError("Process/Department is required");
        return false;
      }
      if (!formData.clauseNumbers) {
        setError("Clause numbers are required");
        return false;
      }
      if (!formData.objectiveEvidence) {
        setError("Objective evidence is required");
        return false;
      }
      if (!formData.statement) {
        setError("Statement of nonconformity is required");
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.auditeeId) {
        setError("Please select the auditee responsible for this NCR");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setError(null);
      setCurrentStep(currentStep + 1);
      scrollToTop();
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
    scrollToTop();
  };

  const validateForm = () => {
    const isNewNcr = !params.id && !createdNcr?.id;
    if (isNewNcr && !formData.auditId) {
      setError(
        "Create NCR from the submitted audit form. Audit report number is required from the audit form.",
      );
      return false;
    }
    if (isNewNcr && !sourceAuditReportNumber) {
      setError(
        "Audit report number is missing. Go back to the audit form and use Raise NCR.",
      );
      return false;
    }
    if (
      isNewNcr &&
      formData.auditReportNumber.trim() !== sourceAuditReportNumber.trim()
    ) {
      setError(
        `Audit report number must match the audit form number: ${sourceAuditReportNumber}`,
      );
      return false;
    }
    if (!formData.processDepartment) {
      setError("Process/Department is required");
      return false;
    }
    if (!formData.clauseNumbers) {
      setError("Clause numbers are required");
      return false;
    }
    if (!formData.objectiveEvidence) {
      setError("Objective evidence is required");
      return false;
    }
    if (!formData.statement) {
      setError("Statement of nonconformity is required");
      return false;
    }
    if (!formData.auditeeId) {
      setError("Please select the auditee responsible for this NCR");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const ncrData = {
      department: formData.processDepartment,
      clauseNumber: formData.clauseNumbers,
      objectiveEvidence: formData.objectiveEvidence,
      statementOfNonconformity: formData.statement,
      dueDate: formData.dueDate,
      auditId: formData.auditId,
      auditorId: formData.auditorId,
      auditeeId: formData.auditeeId,
      shift: formData.shift,
      companyName: formData.companyName,
      auditReportNumber: formData.auditReportNumber,
      auditorName: formData.auditorName,
      auditorSignature: formData.auditorSignature,
      auditeeName: formData.auditeeName,
      auditeeSignature: "",
    };

    const result = await ncrService.createNCR(ncrData);

    if (result.success) {
      setCreatedNcr(result.data);
      setNcrResult(result.data);
      setShowSuccessModal(true);
    } else {
      setError(result.error);
    }

    setSaving(false);
  };

  const downloadForm7Pdf = async () => {
    const id = createdNcr?.id || params.id;
    if (!id) {
      setError("Create the NCR first, then download Form 7 PDF.");
      return;
    }
    setPdfDownloading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (Platform.OS === "web") {
        const response = await fetch(
          `${API_BASE_URL}/api/ncr/${id}/form7-pdf`,
          {
            headers: { Authorization: token ? `Bearer ${token}` : "" },
          },
        );
        if (!response.ok) throw new Error("Failed to download Form 7 PDF");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const linkElement = document.createElement("a");
        linkElement.href = url;
        linkElement.download = `Form7_NCR_${createdNcr?.ncrNumber || formData.ncrNumber || id}.pdf`;
        linkElement.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Mobile fallback: Open in browser or use expo-file-system + expo-sharing
        const pdfUrl = `${API_BASE_URL}/api/ncr/${id}/form7-pdf`;
        await Linking.openURL(pdfUrl);
      }
    } catch (pdfError: any) {
      setError(pdfError.message || "Failed to download Form 7 PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  // ============================================================================
  // SUCCESS MODAL
  // ============================================================================
  const SuccessModal = () => {
    if (!showSuccessModal || !ncrResult) return null;

    const handleGoToDashboard = () => {
      setShowSuccessModal(false);
      if (onClose) {
        onClose(); // ✅ Use inline close callback
      } else {
        router.replace((getDashboardPath(user) || "/") as any);
      }
    };

    const handleDownloadPdf = async () => {
      await downloadForm7Pdf();
    };

    const handleViewNcr = () => {
      setShowSuccessModal(false);
      router.push(`/ncr-view/${ncrResult.id}` as any);
    };

    return (
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View
          className="items-center justify-center flex-1 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl">
            <View
              className="items-center px-6 pt-8 pb-6"
              style={{ backgroundColor: COLORS.bg }}
            >
              <View className="items-center justify-center w-16 h-16 mb-4 bg-white rounded-full shadow-lg">
                <CheckCircle size={32} color={COLORS.success} />
              </View>
              <Text className="text-xl font-bold text-slate-800">
                NCR Created Successfully!
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                NCR Number:{" "}
                <Text
                  className="font-semibold"
                  style={{ color: COLORS.primary }}
                >
                  {ncrResult.ncrNumber}
                </Text>
              </Text>
            </View>

            <View className="px-6 py-5">
              <View className="flex-row gap-3 mb-5">
                <View className="items-center flex-1 p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <Text className="mb-1 text-xs text-slate-500">
                    Department
                  </Text>
                  <Text
                    className="text-sm font-semibold text-slate-800"
                    numberOfLines={1}
                  >
                    {formData.processDepartment || "—"}
                  </Text>
                </View>
                <View className="items-center flex-1 p-3 border rounded-xl bg-slate-50 border-slate-100">
                  <Text className="mb-1 text-xs text-slate-500">Auditee</Text>
                  <Text
                    className="text-sm font-semibold text-slate-800"
                    numberOfLines={1}
                  >
                    {formData.auditeeName || "—"}
                  </Text>
                </View>
              </View>

              <View
                className="flex-row items-start gap-2 p-3 mb-5 border rounded-xl"
                style={{
                  backgroundColor: COLORS.bg,
                  borderColor: COLORS.lighter,
                }}
              >
                <Info
                  size={16}
                  color={COLORS.primary}
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 text-xs" style={{ color: COLORS.dark }}>
                  The auditee will review and sign this NCR.
                </Text>
              </View>

              <View className="gap-3">
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleDownloadPdf}
                    disabled={pdfDownloading}
                    className="flex-1 flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl shadow-md disabled:opacity-50"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    {pdfDownloading ? (
                      <Loader2 size={16} color="#fff" />
                    ) : (
                      <Download size={16} color="#fff" />
                    )}
                    <Text className="text-sm font-semibold text-white">
                      Download PDF
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleViewNcr}
                    className="flex-1 flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm bg-white border-slate-200"
                  >
                    <FileText size={16} color="#334155" />
                    <Text className="text-sm font-semibold text-slate-700">
                      View NCR
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={handleGoToDashboard}
                  className="flex-row items-center justify-center gap-2 px-5 py-3 shadow-md rounded-xl"
                  style={{ backgroundColor: COLORS.secondary }}
                >
                  <ArrowLeft size={18} color="#fff" />
                  <Text className="font-semibold text-white">
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

  // ============================================================================
  // STEP INDICATOR
  // ============================================================================
  const StepIndicator = () => {
    const steps = [
      { number: 1, title: "Nonconformity Details", icon: AlertCircle },
      { number: 2, title: "Acknowledgement", icon: PenTool },
    ];

    return (
      <View className="mb-6">
        {/* ✅ CHANGE: Remove max-w-2xl and add w-full */}
        <View className="flex-row items-center justify-between w-full px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const isClickable = step.number < currentStep;

            return (
              <React.Fragment key={step.number}>
                <TouchableOpacity
                  onPress={() => {
                    if (isClickable) {
                      setError(null);
                      setCurrentStep(step.number);
                      scrollToTop();
                    }
                  }}
                  disabled={!isClickable}
                  className="flex-row items-center gap-3"
                >
                  <View
                    className="items-center justify-center w-10 h-10 rounded-lg shadow-sm"
                    style={{
                      backgroundColor:
                        isActive || isCompleted ? COLORS.primary : "#cbd5e1",
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} color="#fff" />
                    ) : (
                      <Icon
                        size={20}
                        color={isActive || isCompleted ? "#fff" : "#475569"}
                      />
                    )}
                  </View>
                  <View>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: isActive ? COLORS.secondary : "#64748b" }}
                    >
                      Step {step.number}
                    </Text>
                  </View>
                </TouchableOpacity>
                {index < steps.length - 1 && (
                  <View
                    className="flex-1 h-0.5 mx-4"
                    style={{
                      backgroundColor: isCompleted
                        ? COLORS.secondary
                        : "#cbd5e1",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        className="items-center justify-center flex-1"
        style={{ backgroundColor: COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            className="mb-4"
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading NCR data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerClassName="p-4 pb-8 max-w-4xl w-full mx-auto"
          keyboardShouldPersistTaps="handled"
        >
          <SuccessModal />

          {/* Header */}
          <FadeInView delay={0}>
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity
                onPress={() =>
                  onClose
                    ? onClose()
                    : router.replace((getDashboardPath(user) || "/") as any)
                }
                className="flex-row items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm border-slate-200"
              >
                <ArrowLeft size={16} color="#334155" />
                <Text className="text-sm font-medium text-slate-700">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={downloadForm7Pdf}
                disabled={pdfDownloading || (!createdNcr?.id && !params.id)}
                className="flex-row items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm border-slate-200 disabled:opacity-50"
              >
                {pdfDownloading ? (
                  <Loader2 size={16} color="#334155" />
                ) : (
                  <Download size={16} color="#334155" />
                )}
                <Text className="text-sm font-medium text-slate-700">
                  Form 7 PDF
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>

          {/* Step Progress Bar */}
          <FadeInView delay={100}>
            <StepIndicator />
          </FadeInView>

          {error && (
            <FadeInView delay={150}>
              <View className="flex-row items-center p-3 mb-4 border rounded-lg bg-rose-50 border-rose-200">
                <AlertCircle size={16} color="#e11d48" className="mr-2" />
                <Text className="flex-1 text-sm text-rose-700">{error}</Text>
              </View>
            </FadeInView>
          )}

          {success && (
            <FadeInView delay={150}>
              <View className="flex-row items-center p-3 mb-4 border rounded-lg bg-emerald-50 border-emerald-200">
                <CheckCircle size={16} color="#059669" className="mr-2" />
                <Text className="flex-1 text-sm text-emerald-700">
                  {success}
                </Text>
              </View>
            </FadeInView>
          )}

          {/* ============================================================================
              STEP 1: Nonconformity Details + Evidence & Statement
              ============================================================================ */}
          {currentStep === 1 && (
            <FadeInView delay={200}>
              <View className="bg-white border shadow-sm border-slate-200 rounded-xl">
                <View
                  className="p-4 border-b border-slate-100"
                  style={{ backgroundColor: COLORS.bg }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: COLORS.lighter }}
                    >
                      <AlertCircle size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">
                        Step 1: Nonconformity Details
                      </Text>
                      <Text className="text-xs text-slate-500">
                        Enter nonconformity details, evidence, and statement
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="p-4">
                  <View className="gap-4 md:flex-row">
                    {/* Left Column */}
                    <View className="flex-1 gap-3">
                      <InputField
                        label="Process / Department"
                        value={formData.processDepartment}
                        onChange={(v: string) =>
                          setValue("processDepartment", v)
                        }
                        placeholder="Department - Production..."
                        required
                      />
                      <InputField
                        label="Requirement / Clause numbers"
                        value={formData.clauseNumbers}
                        onChange={(v: string) => setValue("clauseNumbers", v)}
                        placeholder="Clause numbers..."
                        multiline
                        rows={3}
                        required
                      />
                    </View>

                    {/* Right Column */}
                    <View className="flex-1 gap-3 mt-4 md:mt-0">
                      <View>
                        <Text className="mb-1 text-xs font-medium text-slate-700">
                          Due date <Text className="text-rose-500">*</Text>
                        </Text>
                        <DateInput
                          value={formData.dueDate}
                          onChange={(v: string) => setValue("dueDate", v)}
                        />
                      </View>
                      <InputField
                        label="Objective evidence"
                        value={formData.objectiveEvidence}
                        onChange={(v: string) =>
                          setValue("objectiveEvidence", v)
                        }
                        placeholder="Purchase order number..."
                        multiline
                        rows={3}
                        required
                      />
                    </View>
                  </View>

                  <View className="mt-3">
                    <InputField
                      label="Statement of nonconformity"
                      value={formData.statement}
                      onChange={(v: string) => setValue("statement", v)}
                      placeholder="Statement of nonconformity..."
                      multiline
                      rows={4}
                      required
                    />
                  </View>
                </View>

                <View className="flex-row justify-end p-4 pt-0">
                  <TouchableOpacity
                    onPress={nextStep}
                    className="flex-row items-center gap-2 px-5 py-2.5 rounded-lg shadow-md"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    <Text className="text-sm font-medium text-white">
                      Next Step
                    </Text>
                    <ChevronRight size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>
          )}

          {/* ============================================================================
              STEP 2: Acknowledgement
              ============================================================================ */}
          {currentStep === 2 && (
            <FadeInView delay={200}>
              <View className="bg-white border shadow-sm border-slate-200 rounded-xl">
                <View
                  className="p-4 border-b border-slate-100"
                  style={{ backgroundColor: COLORS.bg }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: COLORS.lighter }}
                    >
                      <Users size={18} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">
                        Step 2: Acknowledgement
                      </Text>
                      <Text className="text-xs text-slate-500">
                        Company details and signatures
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="p-4">
                  {/* Header Information Section */}
                  <View className="gap-3 mb-4 md:flex-row">
                    <View className="flex-1">
                      <InputField
                        label="Company Name"
                        value={formData.companyName}
                        onChange={(v: string) => setValue("companyName", v)}
                        placeholder="Company name"
                      />
                    </View>
                    <View className="flex-1 mt-4 md:mt-0">
                      <InputField
                        label="Audit report number"
                        value={formData.auditReportNumber}
                        onChange={(v: string) =>
                          setValue("auditReportNumber", v)
                        }
                        placeholder="From audit form"
                        disabled
                      />
                    </View>
                  </View>

                  <View className="my-4 border-t border-slate-200" />

                  {/* Auditor and Auditee in Two Columns */}
                  <View className="gap-4 md:flex-row">
                    {/* Left Column - Auditor */}
                    <View className="flex-1 gap-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <User size={14} color={COLORS.primary} />
                        <Text className="text-sm font-bold text-slate-800">
                          Auditor
                        </Text>
                      </View>
                      <InputField
                        label="Name"
                        value={formData.auditorName}
                        onChange={(v: string) => setValue("auditorName", v)}
                        placeholder="Auditor name"
                      />
                      <View>
                        <Text className="mb-1 text-xs font-medium text-slate-700">
                          Signature
                        </Text>
                        {formData.auditorSignature ? (
                          <View
                            className="p-3 mt-1 border rounded-lg"
                            style={{
                              backgroundColor: COLORS.bg,
                              borderColor: COLORS.lighter,
                            }}
                          >
                            <Image
                              source={{ uri: formData.auditorSignature }}
                              className="w-full h-10"
                              resizeMode="contain"
                            />
                            <Text
                              className="mt-1 text-xs font-medium"
                              style={{ color: COLORS.secondary }}
                            >
                              ✓ Loaded from profile
                            </Text>
                          </View>
                        ) : (
                          <View className="p-3 mt-1 border rounded-lg bg-slate-50 border-slate-200">
                            <Text className="text-xs italic text-slate-500">
                              Loading signature...
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Right Column - Auditee */}
                    <View className="flex-1 gap-3 mt-4 md:mt-0">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Users size={14} color={COLORS.primary} />
                        <Text className="text-sm font-bold text-slate-800">
                          Auditee
                        </Text>
                      </View>
                      <View>
                        <Text className="mb-1 text-xs font-medium text-slate-700">
                          Name <Text className="text-rose-500">*</Text>
                        </Text>
                        {/* Dropdown simulation for Auditee Selection */}
                        <TouchableOpacity className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-white shadow-sm flex-row items-center justify-between">
                          <Text
                            className={`text-sm ${formData.auditeeName ? "text-slate-800" : "text-slate-400"}`}
                          >
                            {formData.auditeeName || "Select Auditee..."}
                          </Text>
                          <ChevronRight size={16} color="#94a3b8" />
                        </TouchableOpacity>
                        {/* Note: In a real app, replace the above TouchableOpacity with a proper Modal/BottomSheet picker populated from `auditeeOptions` */}
                      </View>
                      <View>
                        <Text className="mb-1 text-xs font-medium text-slate-700">
                          Signature
                        </Text>
                        <View
                          className="p-3 mt-1 border rounded-xl"
                          style={{
                            backgroundColor: "#fef3c7",
                            borderColor: "#fde68a",
                          }}
                        >
                          <View className="flex-row items-center gap-1">
                            <Info size={12} color="#92400e" />
                            <Text
                              className="text-xs italic"
                              style={{ color: "#92400e" }}
                            >
                              Pending for Auditee Review
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="flex-row justify-between p-4 pt-0">
                  <TouchableOpacity
                    onPress={prevStep}
                    className="flex-row items-center gap-2 px-4 py-2.5 bg-white border rounded-lg shadow-sm border-slate-200"
                  >
                    <ChevronLeft size={16} color="#334155" />
                    <Text className="text-sm font-medium text-slate-700">
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        onClose
                          ? onClose()
                          : router.replace(
                              (getDashboardPath(user) || "/") as any,
                            )
                      }
                      className="px-4 py-2.5 bg-white border rounded-lg shadow-sm border-slate-200"
                    >
                      <Text className="text-sm font-medium text-slate-700">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={saving || !!createdNcr?.id}
                      className="flex-row items-center gap-2 px-5 py-2.5 rounded-lg shadow-md disabled:opacity-50"
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      {saving ? (
                        <Loader2 size={14} color="#fff" />
                      ) : (
                        <Save size={14} color="#fff" />
                      )}
                      <Text className="text-sm font-medium text-white">
                        {saving ? "Saving..." : "Create NCR"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </FadeInView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
