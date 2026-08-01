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
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Save,
  Sparkles,
  Target,
} from "lucide-react-native";
import React, {
  ComponentType,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Import your existing services and context
// Adjust paths as needed for your React Native project structure
import { userAPI } from "@/services/api";
import { ncrService } from "@/services/ncrService";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getDashboardPath } from "../../../utils/roleUtils";
import { useAuth } from "../../context/AuthContext";
// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FormCardProps {
  title: string;
  children: ReactNode;
  icon?: ComponentType<{ size: number; color: string }>;
  subtitle?: string;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
}

interface RouteParams {
  id?: string;
  type?: string;
  [key: string]: any;
}

// ============================================================================
// COLOR PALETTE (MNC Professional Style)
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
// REUSABLE UI COMPONENTS
// ============================================================================

const FormCard = ({ title, children, icon: Icon, subtitle }: FormCardProps) => (
  <View className="mb-4 bg-white border shadow-sm border-slate-200 rounded-xl">
    <View
      className="flex flex-row items-center gap-3 p-4 border-b border-slate-100"
      style={{ backgroundColor: COLORS.bg }}
    >
      <View
        className="p-1.5 rounded-lg"
        style={{ backgroundColor: COLORS.lighter }}
      >
        {Icon && <Icon size={18} color={COLORS.primary} />}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-slate-800">{title}</Text>
        {subtitle && (
          <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>
        )}
      </View>
    </View>
    <View className="p-5">{children}</View>
  </View>
);

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  required,
  disabled,
}: InputFieldProps) => (
  <View className="mb-4">
    <View className="flex flex-row items-center mb-1.5">
      <Text className="text-xs font-medium text-slate-700">{label}</Text>
      {required && <Text className="ml-1 text-rose-500">*</Text>}
    </View>
    <TextInput
      className="w-full px-3 py-3 text-sm bg-white border rounded-lg border-slate-200 text-slate-800"
      style={{
        minHeight: multiline ? 100 : 44,
        textAlignVertical: multiline ? "top" : "center",
      }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      editable={!disabled}
      multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
    />
  </View>
);

const DateInputField = ({
  label,
  value,
  onChange,
  placeholder = "Select Date",
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) => {
  const [show, setShow] = useState(false);

  const getSafeDate = () => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // ✅ WEB FIX: Use native HTML date input for 100% reliability on desktop
  if (Platform.OS === "web") {
    return (
      <View className="mb-4">
        <View className="flex flex-row items-center mb-1.5">
          <Text className="text-xs font-medium text-slate-700">{label}</Text>
          {required && <Text className="ml-1 text-rose-500">*</Text>}
        </View>
        <View className="relative">
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-5xl px-3 py-3 pr-10 text-sm bg-white border rounded-lg border-slate-200 text-slate-800 focus:outline-none focus:ring-2  focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </View>
      </View>
    );
  }

  // ✅ MOBILE: Keep the TouchableOpacity + DateTimePicker logic with added icon
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    }

    if (event.type === "set" || event.type === "dismissed") {
      setShow(false);
    }
  };

  return (
    <View className="mb-4">
      <View className="flex flex-row items-center mb-1.5">
        <Text className="text-xs font-medium text-slate-700">{label}</Text>
        {required && <Text className="ml-1 text-rose-500">*</Text>}
      </View>

      <TouchableOpacity
        onPress={() => !disabled && setShow(true)}
        disabled={disabled}
        className={`flex flex-row items-center justify-between w-full px-3 py-3 bg-white border rounded-lg border-slate-200 ${disabled ? "bg-slate-100" : ""}`}
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm ${value ? "text-slate-800" : "text-slate-400"}`}
        >
          {value || placeholder}
        </Text>
        {/* Calendar Icon for Mobile */}
        <Calendar size={18} color={disabled ? "#cbd5e1" : "#94a3b8"} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={getSafeDate()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};
// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Form8View({ initialParams, onClose }: any) {
  const router = useRouter();
  const urlParams = useLocalSearchParams();
  const { user } = useAuth();

  // ✅ MERGE inline params and URL params safely
  const params = { ...urlParams, ...initialParams };
  const paramId = params.id as string;
  const paramType = params.type as string;
  const isNCR2Mode = paramType === "ncr2";

  const dashboardPath = getDashboardPath(user);
  const scrollViewRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ncrId, setNcrId] = useState<string | null>(paramId || null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    department: "",
    auditees: "",
    auditors: "",
    pageDetails: "",
    ncrNo: "",
    auditNo: "",
    auditDate: "",
    detailOfObservation: "",
    rootCause: "",
    correction: "",
    correctionResp: "",
    correctionTarget: "",
    correctiveActions: "",
    actionResp: "",
    actionTarget: "",
    horizontalDeployment: "",
    actualDate: "",
    remarks: "",
    ncrStatus: "",
    rejectionReason: "",
    managerReviewComment: "",
  });

  const setValue = (key: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  // Scroll to top helper
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ─── Step validation ───────────────────────────────────────
  const validateStep = (): boolean => {
    if (currentStep === 1) {
      return true;
    } else if (currentStep === 2) {
      if (!formData.rootCause.trim()) {
        setError("Root Cause is required");
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.correction.trim()) {
        setError("Correction is required");
        return false;
      }
      if (!formData.correctiveActions.trim()) {
        setError("Corrective Actions are required");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setError(null);
      setCurrentStep((prev) => prev + 1);
      scrollToTop();
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
    scrollToTop();
  };

  // ─── Step Indicator ────────────────────────────────────────
  const StepIndicator = () => {
    const steps = [
      { number: 1, title: "NCR Info", icon: FileText },
      { number: 2, title: "Root Cause", icon: HelpCircle },
      { number: 3, title: "Correction & Actions", icon: Target },
      { number: 4, title: "Deployment & Submit", icon: Layers },
    ];

    return (
      <View className="mb-6">
        <View className="flex flex-row items-center justify-between">
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
                  className={`flex flex-row items-center gap-2 ${isClickable ? "opacity-80" : "opacity-100"}`}
                >
                  <View
                    className="items-center justify-center w-10 h-10 rounded-lg shadow-sm"
                    style={{
                      backgroundColor:
                        isActive || isCompleted ? COLORS.primary : "#94a3b8",
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} color="#ffffff" />
                    ) : (
                      <Icon size={20} color="#ffffff" />
                    )}
                  </View>
                  <View className="hidden sm:flex">
                    <Text
                      className="text-xs font-medium"
                      style={{ color: isActive ? COLORS.secondary : "#64748b" }}
                    >
                      Step {step.number}
                    </Text>
                    <Text className="text-xs text-slate-500">{step.title}</Text>
                  </View>
                </TouchableOpacity>

                {index < steps.length - 1 && (
                  <View
                    className="flex-1 h-0.5 mx-2"
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

  // ─── On mount: read NCR id from route params ───────────────
  useEffect(() => {
    if (paramId && paramId !== "null" && paramId !== "undefined") {
      setNcrId(paramId);
      fetchNCRData(paramId);
    }
  }, [paramId]);

  // ─── Helper: resolve a display name from a user object ─────
  const resolveUserName = (userObj: any, fallback = ""): string => {
    if (!userObj) return fallback;
    return (
      userObj.name ||
      userObj.fullName ||
      [userObj.firstName, userObj.lastName].filter(Boolean).join(" ") ||
      userObj.username ||
      fallback
    );
  };

  // ─── Fetch NCR data + auditor / auditee names ──────────────
  const fetchNCRData = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await ncrService.getNCRById(id);

      if (result.success) {
        const ncr = result.data;

        let resolvedAuditorName = ncr.auditorName || "";
        if (ncr.auditorId) {
          try {
            const auditorUser = await userAPI.getUserById(ncr.auditorId);
            resolvedAuditorName = resolveUserName(
              auditorUser,
              resolvedAuditorName,
            );
          } catch (e) {
            // silently keep fallback
          }
        }

        let resolvedAuditeeName = ncr.auditeeName || "";
        if (ncr.auditeeId) {
          try {
            const auditeeUser = await userAPI.getUserById(ncr.auditeeId);
            resolvedAuditeeName = resolveUserName(
              auditeeUser,
              resolvedAuditeeName,
            );
          } catch (e) {
            // silently keep fallback
          }
        }

        setFormData((prev) => ({
          ...prev,
          ncrNo: ncr.ncrNumber || "",
          department: ncr.department || "",
          detailOfObservation: ncr.statementOfNonconformity || "",
          rootCause: isNCR2Mode ? ncr.ncr2RootCause || "" : ncr.rootCause || "",
          correction: isNCR2Mode
            ? ncr.ncr2Correction || ""
            : ncr.correction || "",
          correctiveActions: isNCR2Mode
            ? ncr.ncr2CorrectiveAction || ""
            : ncr.correctiveAction || "",
          horizontalDeployment: isNCR2Mode
            ? ncr.ncr2HorizontalDeployment || ""
            : ncr.horizontalDeployment || "",
          auditNo: ncr.auditReportNumber || "",
          ncrStatus: ncr.status || "",
          rejectionReason: ncr.rejectionReason || "",
          managerReviewComment: ncr.managerReviewComment || "",
          auditors: resolvedAuditorName,
          auditees: resolvedAuditeeName,
        }));
      } else {
        setError(result.error || "Failed to fetch NCR data");
      }
    } catch (err: any) {
      setError("An unexpected error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Demo data ─────────────────────────────────────────────
  const fillDemoData = () => {
    setFormData((prev) => ({
      ...prev,
      pageDetails: "1 of 1",
      auditNo: prev.auditNo || "AUD-2024-015",
      auditDate: "2024-04-15",
      rootCause:
        "1. Calibration schedule not properly maintained\n2. Lack of awareness about in-process check requirements\n3. Document control process not followed for work instructions",
      correction:
        "1. Torque wrench sent for immediate calibration\n2. In-process checks initiated from current shift\n3. Work instruction printed and placed at workstation",
      correctionResp: "QA Department",
      correctionTarget: "2024-04-18",
      correctiveActions:
        "1. Implement digital calibration tracking system\n2. Conduct training for all production staff\n3. Update document control procedure",
      actionResp: "Production Manager & QA Head",
      actionTarget: "2024-05-15",
      horizontalDeployment: "Check all other assembly lines for similar issues",
      actualDate: "2024-05-10",
      remarks: "All corrective actions implemented effectively.",
    }));
    setSuccess("✅ Demo data loaded!");
    setTimeout(() => setSuccess(null), 2000);
  };

  // ─── Final validation ──────────────────────────────────────
  const validateForm = (): boolean => {
    if (!formData.rootCause.trim()) {
      setError("Root Cause is required");
      return false;
    }
    if (!formData.correction.trim()) {
      setError("Correction is required");
      return false;
    }
    if (!formData.correctiveActions.trim()) {
      setError("Corrective Actions are required");
      return false;
    }
    return true;
  };

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!ncrId) {
      setError("No NCR selected.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const actionData = {
      rootCause: formData.rootCause,
      correction: formData.correction,
      correctiveAction: formData.correctiveActions,
      horizontalDeployment: formData.horizontalDeployment,
      auditeeName: formData.auditees,
      auditeeSignature: "",
    };

    try {
      let result;
      if (isNCR2Mode) {
        result = await ncrService.submitNCR2(ncrId, actionData);
      } else {
        result = await ncrService.submitCorrectiveAction(ncrId, actionData);
      }

      if (result.success) {
        const message = isNCR2Mode
          ? `NCR2 corrective action submitted for NCR #${result.data.ncrNumber}`
          : `Corrective action submitted for NCR #${result.data.ncrNumber}`;
        setSuccess(message);
        setTimeout(
          () => router.replace(`/form7-detail?id=${ncrId}` as any),
          1800,
        );
      } else {
        setError(result.error || "Submission failed");
      }
    } catch (err: any) {
      setError("An error occurred during submission.");
    } finally {
      setSaving(false);
    }
  };

  // ─── PDF download ──────────────────────────────────────────
  const downloadForm8Pdf = async () => {
    if (!ncrId) {
      setError("No NCR selected.");
      return;
    }

    setPdfDownloading(true);
    try {
      // NOTE: Replace with your actual secure storage solution
      // (e.g., import AsyncStorage from '@react-native-async-storage/async-storage')
      const token = "YOUR_TOKEN_HERE";

      const url = `http://localhost:8080/api/ncr/${ncrId}/form8-pdf`;
      const downloadUrl = token ? `${url}?token=${token}` : url;

      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        setSuccess("Opening PDF in browser...");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        throw new Error("Cannot open PDF URL");
      }
    } catch (pdfError: any) {
      setError(
        "Failed to download Form 8 PDF. Please ensure Expo File System is configured for native downloads.",
      );
    } finally {
      setPdfDownloading(false);
    }
  };

  // ─── Loading screen ────────────────────────────────────────
  if (loading) {
    return (
      <View
        className="items-center justify-center flex-1"
        style={{ backgroundColor: COLORS.bg }}
      >
        <View className="items-center p-8 bg-white border shadow-sm border-slate-200 rounded-2xl">
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginBottom: 16 }}
          />
          <Text className="text-sm font-medium text-slate-500">
            Loading NCR data...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerClassName="px-4 py-8 max-w-4xl w-full mx-auto"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() =>
              onClose ? onClose() : router.replace(dashboardPath as any)
            }
            className="flex flex-row items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm border-slate-200"
          >
            <ArrowLeft size={16} color="#334155" />
            <Text className="text-sm font-medium text-slate-700">Back</Text>
          </TouchableOpacity>

          <View className="flex flex-row items-center gap-3">
            <TouchableOpacity
              onPress={fillDemoData}
              className="flex flex-row items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm border-emerald-200"
            >
              <Sparkles size={16} color="#047857" />
              <Text className="text-sm font-medium text-emerald-700">
                Load Demo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={downloadForm8Pdf}
              disabled={!ncrId || pdfDownloading}
              className={`flex flex-row items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm ${!ncrId || pdfDownloading ? "opacity-50" : ""}`}
            >
              {pdfDownloading ? (
                <Loader2 size={16} color="#334155" />
              ) : (
                <Download size={16} color="#334155" />
              )}
              <Text className="text-sm font-medium text-slate-700">
                Form 8 PDF
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step Progress Bar */}
        <StepIndicator />

        {/* Alerts */}
        {success && (
          <View className="flex flex-row items-center p-3 mb-4 border rounded-lg bg-emerald-50 border-emerald-200">
            <CheckCircle size={16} color="#047857" style={{ marginRight: 8 }} />
            <Text className="text-sm text-emerald-700">{success}</Text>
          </View>
        )}

        {error && (
          <View className="flex flex-row items-center p-3 mb-4 border rounded-lg bg-rose-50 border-rose-200">
            <AlertCircle size={16} color="#be123c" style={{ marginRight: 8 }} />
            <Text className="text-sm text-rose-700">{error}</Text>
          </View>
        )}

        {!ncrId && (
          <View className="flex flex-row items-center p-3 mb-4 border rounded-lg bg-amber-50 border-amber-200">
            <AlertCircle size={16} color="#b45309" style={{ marginRight: 8 }} />
            <Text className="text-sm text-amber-700">No NCR selected.</Text>
          </View>
        )}

        {/* Rejection Reason for NCR2 Mode */}
        {isNCR2Mode && formData.rejectionReason ? (
          <View className="p-4 mb-4 border bg-rose-50 border-rose-200 rounded-xl">
            <View className="flex flex-row items-start gap-3">
              <AlertCircle size={18} color="#e11d48" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-rose-800">
                  HOD rejection message from 8D D0
                </Text>
                <Text className="mt-1 text-sm text-rose-700">
                  {formData.rejectionReason}
                </Text>
                {formData.managerReviewComment && (
                  <Text className="mt-2 text-xs text-rose-600">
                    {formData.managerReviewComment}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : null}

        <View className="space-y-4">
          {/* STEP 1 — NCR Info */}
          {currentStep === 1 && (
            <FormCard
              title="Step 1: NCR Information"
              subtitle="Review NCR details and observation"
              icon={FileText}
            >
              <View className="flex flex-row flex-wrap -mx-2">
                <View className="w-full px-2 md:w-1/2">
                  <InputField
                    label="NCR No."
                    value={formData.ncrNo}
                    onChangeText={() => {}}
                    disabled
                  />
                </View>
                <View className="w-full px-2 md:w-1/2">
                  <InputField
                    label="Dept / Area"
                    value={formData.department}
                    onChangeText={(v) => setValue("department", v)}
                    disabled
                  />
                </View>
                <View className="w-full px-2 md:w-1/2">
                  <InputField
                    label="Auditee(s)"
                    value={formData.auditees}
                    onChangeText={(v) => setValue("auditees", v)}
                    placeholder="Loading…"
                  />
                </View>
                <View className="w-full px-2 md:w-1/2">
                  <InputField
                    label="Auditor(s)"
                    value={formData.auditors}
                    onChangeText={(v) => setValue("auditors", v)}
                    placeholder="Loading…"
                  />
                </View>
                <View className="w-full px-2 md:w-1/2">
                  <InputField
                    label="Audit No."
                    value={formData.auditNo}
                    onChangeText={(v) => setValue("auditNo", v)}
                  />
                </View>
                <View className="w-full px-2 md:w-1/2">
                  <DateInputField
                    label="Audit Date"
                    value={formData.auditDate}
                    onChange={(v) => setValue("auditDate", v)}
                    placeholder="Select Audit Date"
                  />
                </View>
              </View>
              <View className="mt-2">
                <InputField
                  multiline
                  label="Detail of Observation"
                  value={formData.detailOfObservation}
                  onChangeText={(v) => setValue("detailOfObservation", v)}
                  disabled
                />
              </View>
            </FormCard>
          )}

          {/* STEP 2 — Root Cause */}
          {currentStep === 2 && (
            <FormCard
              title="Step 2: Root Cause Analysis"
              subtitle="Identify the root cause of the nonconformity"
              icon={HelpCircle}
            >
              <InputField
                multiline
                label="Root Cause"
                value={formData.rootCause}
                onChangeText={(v) => setValue("rootCause", v)}
                placeholder="Enter root cause analysis..."
                required
              />
            </FormCard>
          )}

          {/* STEP 3 — Correction & Actions */}
          {currentStep === 3 && (
            <View className="space-y-4">
              <FormCard
                title="Step 3A: Immediate Correction"
                subtitle="Actions taken to contain the issue"
                icon={CheckCircle}
              >
                <InputField
                  multiline
                  label="Correction"
                  value={formData.correction}
                  onChangeText={(v) => setValue("correction", v)}
                  placeholder="Immediate correction applied..."
                  required
                />
                <View className="flex flex-row flex-wrap mt-2 -mx-2">
                  <View className="w-full px-2 md:w-1/2">
                    <InputField
                      label="Responsible"
                      value={formData.correctionResp}
                      onChangeText={(v) => setValue("correctionResp", v)}
                    />
                  </View>
                  <View className="w-full px-2 md:w-1/2">
                    <DateInputField
                      label="Target Date"
                      value={formData.correctionTarget}
                      onChange={(v) => setValue("correctionTarget", v)}
                      placeholder="Select Target Date"
                    />
                  </View>
                </View>
              </FormCard>

              <FormCard
                title="Step 3B: Permanent Corrective Actions"
                subtitle="Long-term actions to prevent recurrence"
                icon={Target}
              >
                <InputField
                  multiline
                  label="Corrective Actions"
                  value={formData.correctiveActions}
                  onChangeText={(v) => setValue("correctiveActions", v)}
                  placeholder="Long-term corrective actions..."
                  required
                />
                <View className="flex flex-row flex-wrap mt-2 -mx-2">
                  <View className="w-full px-2 md:w-1/2">
                    <InputField
                      label="Responsible"
                      value={formData.actionResp}
                      onChangeText={(v) => setValue("actionResp", v)}
                    />
                  </View>
                  <View className="w-full px-2 md:w-1/2">
                    <DateInputField
                      label="Target Date"
                      value={formData.actionTarget}
                      onChange={(v) => setValue("actionTarget", v)}
                      placeholder="Select Target Date"
                    />
                  </View>
                </View>
              </FormCard>
            </View>
          )}

          {/* STEP 4 — Deployment & Submit */}
          {currentStep === 4 && (
            <View className="space-y-4">
              <FormCard
                title="Step 4A: Horizontal Deployment"
                subtitle="Apply similar fixes to other areas if applicable"
                icon={Layers}
              >
                <InputField
                  multiline
                  label="Horizontal Deployment"
                  value={formData.horizontalDeployment}
                  onChangeText={(v) => setValue("horizontalDeployment", v)}
                />
                <View className="mt-2">
                  <DateInputField
                    label="Actual Completion Date"
                    value={formData.actualDate}
                    onChange={(v) => setValue("actualDate", v)}
                    placeholder="Select Completion Date"
                  />
                </View>
              </FormCard>

              <FormCard
                title="Step 4B: Remarks & Submission"
                subtitle="Final comments before submission"
                icon={FileText}
              >
                <InputField
                  multiline
                  label="Remarks"
                  value={formData.remarks}
                  onChangeText={(v) => setValue("remarks", v)}
                />
                <View
                  className="flex flex-row items-start gap-2 p-3 mt-4 border rounded-xl"
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
                  <Text
                    className="flex-1 text-xs"
                    style={{ color: COLORS.dark }}
                  >
                    Once submitted, this NCR will move to "In Progress" status
                    for audit manager verification.
                  </Text>
                </View>
              </FormCard>
            </View>
          )}
        </View>

        {/* Navigation buttons */}
        <View className="flex flex-row items-center justify-between pt-4 mt-6 border-t border-slate-200">
          <View>
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={prevStep}
                className="flex flex-row items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm border-slate-200"
              >
                <ChevronLeft size={16} color="#334155" />
                <Text className="text-sm font-medium text-slate-700">
                  Previous
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex flex-row gap-2">
            <TouchableOpacity
              onPress={() =>
                onClose ? onClose() : router.replace(dashboardPath as any)
              }
              className="px-4 py-2 bg-white border rounded-lg shadow-sm border-slate-200"
            >
              <Text className="text-sm font-medium text-slate-700">Cancel</Text>
            </TouchableOpacity>

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={nextStep}
                className="flex flex-row items-center gap-2 px-5 py-2 rounded-lg shadow-md"
                style={{ backgroundColor: COLORS.primary }}
              >
                <Text className="text-sm font-medium text-white">
                  Next Step
                </Text>
                <ChevronRight size={16} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={saving || !ncrId}
                className={`flex flex-row items-center gap-2 px-5 py-2 rounded-lg shadow-md ${saving || !ncrId ? "opacity-50" : ""}`}
                style={{ backgroundColor: COLORS.primary }}
              >
                {saving ? (
                  <Loader2 size={14} color="#ffffff" />
                ) : (
                  <Save size={14} color="#ffffff" />
                )}
                <Text className="text-sm font-medium text-white">
                  {saving
                    ? "Submitting..."
                    : isNCR2Mode
                      ? "Submit NCR2"
                      : "Submit Corrective Action"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom padding for keyboard avoidance */}
        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
