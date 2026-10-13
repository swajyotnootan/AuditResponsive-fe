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
// BUILD "Company Name, Plant Name" DISPLAY STRING
// ============================================================================
const buildCompanyDisplay = (user: any): string => {
  if (!user) return "";

  const companyName =
    user.companyName?.trim() ||
    user.company?.name?.trim() ||
    user.company_name?.trim() ||
    "";

  const plantName =
    user.plantName?.trim() ||
    user.plant?.name?.trim() ||
    user.plant_name?.trim() ||
    "";

  if (companyName && plantName) return `${companyName}, ${plantName}`;
  if (companyName) return companyName;
  if (plantName) return plantName;
  return "";
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
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
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
const DateInput = ({
  value,
  onChange,
  placeholder = "Select Date",
  label,
}: any) => {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState("");

  const getDateValue = () => {
    if (!value) return new Date();
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const formatDate = (dateStr: string) => {
    // Convert to dd-mm-yyyy format
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (Platform.OS === "web") {
    return (
      <View className="w-full">
        {label && (
          <Text className="mb-1 text-xs font-medium text-slate-700">
            {label}
          </Text>
        )}
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      </View>
    );
  }

  return (
    <View className="w-full">
      {label && (
        <Text className="mb-1 text-xs font-medium text-slate-700">{label}</Text>
      )}
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="w-full flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
        style={{ width: "100%" }}
        activeOpacity={0.7}
      >
        <Text
          className="flex-1 text-sm"
          numberOfLines={1}
          style={{ color: value ? "#1e293b" : "#94a3b8" }}
        >
          {value ? formatDate(value) : "dd-mm-yyyy"}
        </Text>
        <Calendar size={18} color="#64748b" />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={getDateValue()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            if (Platform.OS === "android") {
              setShow(false);
            } else {
              setShow(event.type === "dismissed" ? false : true);
            }

            if (selectedDate && event.type === "set") {
              onChange(selectedDate.toISOString().split("T")[0]);
            }
          }}
        />
      )}
    </View>
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

  useEffect(() => {
    console.log(
      "🔍 USER OBJECT FROM useAuth():",
      JSON.stringify(user, null, 2),
    );
  }, [user]);

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
        token = await AsyncStorage.getItem("authToken"); // ✅ Works perfectly on iOS/Android
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

  // Inside Form7View component — replace the prefill useEffect
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
        // ✅ AFTER — builds "Company Name, Plant Name"
        companyName:
          (params.companyName as string) || buildCompanyDisplay(user),
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

    // ✅ AFTER
    if (user) {
      setFormData((prev) => ({
        ...prev,
        auditorId: typeof user.id === "string" ? parseInt(user.id) : user.id,
        auditorName:
          user.name ||
          user.username ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        // ✅ Always use "Company Name, Plant Name"
        companyName: prev.companyName || buildCompanyDisplay(user),
      }));
    }
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
      // companyName: formData.companyName,
      auditReportNumber: formData.auditReportNumber,
      auditorName: formData.auditorName,
      auditorSignature: formData.auditorSignature,
      auditeeName: formData.auditeeName,
      auditeeSignature: "",
      companyId: (user as any)?.companyId,
      companyCode: (user as any)?.companyCode,
      companyName: formData.companyName || (user as any)?.companyName,
      plantId: (user as any)?.plantId,
      plantCode: (user as any)?.plantCode,
      plantName: (user as any)?.plantName,
      siteId: (user as any)?.siteId,
      siteCode: (user as any)?.siteCode,
      siteName: (user as any)?.siteName,
      unitId: (user as any)?.unitId,
      unitCode: (user as any)?.unitCode,
      unitName: (user as any)?.unitName,
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

  // ✅ FIXED: Function to go back/dismiss - same as Back button
  // ✅ FIXED: Function to go back/dismiss - same as Back button
  // ✅ FIXED: Properly navigate back to parent dashboard
  const handleGoBack = () => {
    // Close modal first if it's open
    if (showSuccessModal) {
      setShowSuccessModal(false);
    }

    // ✅ If onClose is provided (coming from AuditorDashboard via onRaiseNcr), call it to close Form7
    if (onClose && typeof onClose === "function") {
      onClose();
    } else {
      // Fallback: Navigate to dashboard based on role
      const dashboardPath = getDashboardPath(user) || "/";
      router.replace(dashboardPath as any);
    }
  };
  // ============================================================================
  // SUCCESS MODAL
  // ============================================================================
  const SuccessModal = () => {
    if (!showSuccessModal || !ncrResult) return null;

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
          className="flex-1 items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <View
              className="items-center px-6 pb-6 pt-8"
              style={{ backgroundColor: COLORS.bg }}
            >
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
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
              <View className="mb-5 flex-row gap-3">
                <View className="flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 p-3">
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
                <View className="flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 p-3">
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
                className="mb-5 flex-row items-start gap-2 rounded-xl border p-3"
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
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5 shadow-md disabled:opacity-50"
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
                    className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
                  >
                    <FileText size={16} color="#334155" />
                    <Text className="text-sm font-semibold text-slate-700">
                      View NCR
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowSuccessModal(false);
                    // ✅ Close the form and go back to parent dashboard
                    if (onClose && typeof onClose === "function") {
                      onClose();
                    } else {
                      // ✅ Use replace to clear navigation stack
                      const dashboardPath = getDashboardPath(user) || "/";
                      router.replace(dashboardPath as any);
                    }
                  }}
                  className="flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 shadow-md"
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
        <View className="w-full flex-row items-center justify-between px-4">
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
                    className="h-10 w-10 items-center justify-center rounded-lg shadow-sm"
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
                    className="mx-4 h-0.5 flex-1"
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
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: COLORS.bg }}
      >
        <View className="items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
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
            <View className="mb-6 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => {
                  if (onClose && typeof onClose === "function") {
                    onClose();
                  } else {
                    const dashboardPath = getDashboardPath(user) || "/";
                    router.replace(dashboardPath as any);
                  }
                }}
                className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm"
              >
                <ArrowLeft size={16} color="#334155" />
                <Text className="text-sm font-medium text-slate-700">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={downloadForm7Pdf}
                disabled={pdfDownloading || (!createdNcr?.id && !params.id)}
                className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm disabled:opacity-50"
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
              <View className="mb-4 flex-row items-center rounded-lg border border-rose-200 bg-rose-50 p-3">
                <AlertCircle size={16} color="#e11d48" className="mr-2" />
                <Text className="flex-1 text-sm text-rose-700">{error}</Text>
              </View>
            </FadeInView>
          )}

          {success && (
            <FadeInView delay={150}>
              <View className="mb-4 flex-row items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3">
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
              <View className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <View
                  className="border-b border-slate-100 p-4"
                  style={{ backgroundColor: COLORS.bg }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="rounded-lg p-1.5"
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
                    <View className="mt-4 flex-1 gap-3 md:mt-0">
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
                    className="flex-row items-center gap-2 rounded-lg px-5 py-2.5 shadow-md"
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
              <View className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <View
                  className="border-b border-slate-100 p-4"
                  style={{ backgroundColor: COLORS.bg }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="rounded-lg p-1.5"
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
                  <View className="mb-4 gap-3 md:flex-row">
                    <View className="flex-1">
                      <InputField
                        label="Company Name"
                        value={formData.companyName}
                        onChange={() => {}} // ← no-op
                        placeholder="Auto-filled from plant"
                        disabled // ← read-only
                      />
                    </View>
                    <View className="mt-4 flex-1 md:mt-0">
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
                      <View className="mb-1 flex-row items-center gap-2">
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
                            className="mt-1 rounded-lg border p-3"
                            style={{
                              backgroundColor: COLORS.bg,
                              borderColor: COLORS.lighter,
                            }}
                          >
                            <Image
                              source={{ uri: formData.auditorSignature }}
                              className="h-10 w-full"
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
                          <View className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <Text className="text-xs italic text-slate-500">
                              Loading signature...
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Right Column - Auditee */}
                    <View className="mt-4 flex-1 gap-3 md:mt-0">
                      <View className="mb-1 flex-row items-center gap-2">
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
                        <TouchableOpacity className="w-full flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
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
                          className="mt-1 rounded-xl border p-3"
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
                    className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
                  >
                    <ChevronLeft size={16} color="#334155" />
                    <Text className="text-sm font-medium text-slate-700">
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        if (onClose && typeof onClose === "function") {
                          onClose();
                        } else {
                          const dashboardPath = getDashboardPath(user) || "/";
                          router.replace(dashboardPath as any);
                        }
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
                    >
                      <Text className="text-sm font-medium text-slate-700">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={saving || !!createdNcr?.id}
                      className="flex-row items-center gap-2 rounded-lg px-5 py-2.5 shadow-md disabled:opacity-50"
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
