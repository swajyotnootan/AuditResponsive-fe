/// <reference types="nativewind/types" />
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  CalendarDays,
  Camera,
  CheckCircle,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  File,
  FileText,
  Lightbulb,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react-native";

import React, { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE_URL } from "@/config/apiConfig";
import { isInitiator } from "@/utils/roleUtils";
import Generate8DPdf from "../Generate8DPdf";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
export interface TeamMember {
  firstName?: string;
  lastName?: string;
  email: string;
  department?: string;
  isExternal?: boolean;
  username?: string;
  [key: string]: any;
}

export interface Attachment {
  name: string;
  url?: string;
  size?: number;
  mimeType?: string;
  formType?: string;
  [key: string]: any;
}

export interface FileData {
  id: string | number;
  fileName: string;
  mimeType: string;
  fileType: string;
  formType: string;
  fileSize?: number;
  [key: string]: any;
}

export interface FormData {
  status?: string;
  d0?: Record<string, any>[];
  d1?: Record<string, any>[];
  d2?: Record<string, any>[];
  d3?: Record<string, any>[];
  d4?: Record<string, any>[];
  d5?: Record<string, any>[];
  d6?: Record<string, any>[];
  d7?: Record<string, any>[];
  d8?: Record<string, any>[];
  [key: string]: any;
}

interface TooltipProps {
  content: string;
  children: ReactNode;
}

// ============================================================================
// CUSTOM TOOLTIP COMPONENT
// ============================================================================
const SimpleTooltip = ({ content, children }: TooltipProps) => {
  const [visible, setVisible] = useState<boolean>(false);
  return (
    <View className="relative">
      <TouchableOpacity
        onPress={() => setVisible(!visible)}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
      {visible && (
        <View className="absolute bottom-full left-0 z-50 mb-2 min-w-[150px] rounded-lg bg-gray-800 px-3 py-2">
          <Text className="text-xs text-white">{content}</Text>
          <View className="absolute bottom-[-6px] left-4 h-3 w-3 rotate-45 transform bg-gray-800" />
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MAIN FINAL PREVIEW COMPONENT
// ============================================================================
const StepIcons: Record<string, any> = {
  d0: FileText,
  d1: Users,
  d2: FileText,
  d3: ShieldCheck,
  d4: Lightbulb,
  d5: ClipboardCheck,
  d6: CalendarDays,
  d7: Lightbulb,
  d8: UserCheck,
};

const stepTitles: Record<string, string> = {
  d0: "D0 – Plan & Contain",
  d1: "D1 – Form the Team",
  d2: "D2 – Describe the Problem",
  d3: "D3 – Interim Containment Actions",
  d4: "D4 – Root Cause Analysis",
  d5: "D5 – Permanent Corrective Actions",
  d6: "D6 – Implement & Validate PCAs",
  d7: "D7 – Prevent Recurrence",
  d8: "D8 – Close & Recognize",
};

const stepFields: Record<string, { key: string; label: string }[]> = {
  d0: [
    { key: "eventNo", label: "Event ID" },
    { key: "plantLine", label: "Plant / Line" },
    { key: "partName", label: "Part Name" },
    { key: "lotSerial", label: "Lot / Serial" },
    { key: "defectCode", label: "Defect Code" },
    { key: "dateDiscovered", label: "Date Discovered" },
    { key: "reportedBy", label: "Reported By" },
    { key: "personName", label: "Person Name" },
    { key: "department", label: "Department" },
    { key: "companyName", label: "Company" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Primary Email" },
    { key: "additionalEmails", label: "Team Members" },
  ],
  d1: [
    { key: "eventId", label: "Event ID" },
    { key: "teamLeader", label: "Team Leader" },
    { key: "dateFormed", label: "Date Formed" },
    { key: "responsibilities", label: "Team Responsibilities" },
    { key: "suppliers", label: "Suppliers" },
    { key: "customers", label: "Customers" },
  ],
  d2: [
    { key: "eventId", label: "Event ID" },
    { key: "problemStatement", label: "Problem Statement" },
    { key: "what", label: "WHAT" },
    { key: "why", label: "WHY" },
    { key: "where", label: "WHERE" },
    { key: "when", label: "WHEN" },
    { key: "who", label: "WHO" },
    { key: "how", label: "HOW" },
    { key: "howMuch", label: "Impact (HOW MUCH)" },
  ],
  d3: [
    { key: "eventId", label: "Event ID" },
    { key: "problemStatement", label: "Problem Statement" },
    { key: "hasContainment", label: "Containment Actions?" },
    { key: "actions", label: "Containment Actions" },
  ],
  d4: [
    { key: "eventId", label: "Event ID" },
    { key: "rootCauseSummary", label: "Root Cause Summary" },
    { key: "businessProcessFlaws", label: "Business Process Flaws?" },
    { key: "whyNotDetected", label: "Why Not Detected?" },
  ],
  d5: [
    { key: "eventId", label: "Event ID" },
    { key: "actions", label: "Corrective Actions" },
  ],
  d6: [
    { key: "eventId", label: "Event ID" },
    { key: "implementationDate", label: "Implementation Date & Time" },
    {
      key: "communicatedToStakeholders",
      label: "Communicated to Stakeholders?",
    },
    { key: "notes", label: "Notes / Comments" },
  ],
  d7: [
    { key: "eventId", label: "Event ID" },
    { key: "additionalMeasuresNeeded", label: "Additional Measures Needed?" },
    { key: "lessonsLearned", label: "Lessons Learned" },
    { key: "proceduresUpdated", label: "Procedures Updated?" },
  ],
  d8: [
    { key: "eventId", label: "Event ID" },
    { key: "rewardDescription", label: "Reward Description" },
    { key: "additionalRecommendations", label: "Additional Recommendations" },
    { key: "teamLeaderName", label: "Team Leader Name" },
    { key: "signatureDate", label: "Signature Date & Time" },
  ],
};

const stepsOrder: string[] = [
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
];

export default function FinalPreview({
  eventId,
  isHOD = false,
  onRefresh,
  onClose,
}: {
  eventId: string | number | null;
  isHOD?: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
}) {
  const [eventData, setEventData] = useState<any>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewFile, setPreviewFile] = useState<{
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [isEditingMembers, setIsEditingMembers] = useState<boolean>(false);
  const [tempTeamMembers, setTempTeamMembers] = useState<TeamMember[]>([]);
  const [updatingMembers, setUpdatingMembers] = useState<boolean>(false);
  const [approvalComment, setApprovalComment] = useState<string>("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (memberError || memberSuccess) {
      const timer = setTimeout(() => {
        setMemberError(null);
        setMemberSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [memberError, memberSuccess]);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        setLoading(true);

        const [eventRes, filesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/eightd/data/${eventId}`),
          axios.get(`${API_BASE_URL}/api/eightd/data/${eventId}/files`),
        ]);
        if (eventRes.data.success && eventRes.data.data) {
          setEventData(eventRes.data.data);
          const d0Data = eventRes.data.data.content?.d0?.[0] || {};
          if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
            setTempTeamMembers([...d0Data.teamMembers]);
          } else if (Array.isArray(d0Data.additionalEmails)) {
            setTempTeamMembers(
              d0Data.additionalEmails.map((email: string) => ({
                email,
                firstName: "",
                lastName: "",
                department: "",
                isExternal: true,
              })),
            );
          } else {
            setTempTeamMembers([]);
          }
        }
        if (filesRes.data.success && filesRes.data.data) {
          setFiles(filesRes.data.data);
        }
      } catch (err: any) {
        console.error("Error fetching final preview ", err);
        Alert.alert(
          "Error",
          "Failed to load event data. Check your network connection.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserRole(user?.role || null);
        }
      } catch (error) {
        console.error("Failed to get user role", error);
      }
    };
    getUserRole();
  }, []);

  const startEditingTeamMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    const d0Data = eventData.content?.d0?.[0] || {};
    let currentMembers: TeamMember[] = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map((email: string) => ({
        email,
        firstName: "",
        lastName: "",
        department: "",
        isExternal: true,
      }));
    }
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(true);
  };

  const saveTeamMembers = async () => {
    setMemberError(null);
    setMemberSuccess(null);
    try {
      setUpdatingMembers(true);
      const validMembers = tempTeamMembers
        .filter((member) => member.email && member.email.trim())
        .map((member) => ({
          ...member,
          email: member.email.trim(),
          firstName: member.firstName?.trim() || "",
          lastName: member.lastName?.trim() || "",
          department: member.department?.trim() || "",
          isExternal: member.isExternal || true,
        }));
      const invalidEmails = validMembers.filter(
        (member) => !isValidEmail(member.email),
      );
      if (invalidEmails.length > 0) {
        setMemberError(
          `Invalid email format: ${invalidEmails.map((m) => m.email).join(", ")}`,
        );
        return;
      }
      const emails = validMembers.map((m) => m.email);
      if ([...new Set(emails)].length !== emails.length) {
        setMemberError(
          "Duplicate email addresses found. Please remove duplicates.",
        );
        return;
      }
      if (validMembers.length === 0) {
        setMemberError(
          "Please add at least one team member with a valid email",
        );
        return;
      }

      const updatedD0Data = {
        ...eventData.content?.d0?.[0],
        teamMembers: validMembers,
        additionalEmails: validMembers.map((member) => member.email),
      };
      const formDataToSend = new FormData();
      formDataToSend.append(
        "jsonContent",
        JSON.stringify({
          content: { ...eventData.content, d0: [updatedD0Data] },
        }),
      );

      const res = await axios.put(
        `${API_BASE_URL}/api/eightd/data/${eventId}`,
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (res.data.success) {
        setEventData((prev: any) => ({
          ...prev,
          content: { ...prev.content, d0: [updatedD0Data] },
        }));
        setMemberSuccess("✅ Team members updated successfully!");
        setIsEditingMembers(false);
      } else {
        throw new Error(res.data.error || "Failed to update team members");
      }
    } catch (err: any) {
      console.error("Failed to update team members:", err);
      setMemberError(
        "❌ Failed to update team members: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setUpdatingMembers(false);
    }
  };

  const cancelEditingMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    const d0Data = eventData.content?.d0?.[0] || {};
    let currentMembers: TeamMember[] = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map((email: string) => ({
        email,
        firstName: "",
        lastName: "",
        department: "",
        isExternal: true,
      }));
    }
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(false);
  };

  const addNewMemberField = () =>
    setTempTeamMembers((prev) => [
      ...prev,
      {
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        isExternal: true,
        username: "",
      },
    ]);

  const removeMemberField = (index: number) =>
    setTempTeamMembers((prev) => prev.filter((_, i) => i !== index));

  const updateMemberField = (index: number, field: string, value: any) => {
    const newMembers = [...tempTeamMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setTempTeamMembers(newMembers);
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const getFilesForForm = (formType: string) =>
    files.filter((file) => file.formType === formType);
  const getEightDFileUrl = (fileId: string | number) =>
    `${API_BASE_URL}/api/eightd/files/${fileId}`;

  const handleFileClick = async (
    fileId: string | number,
    mimeType: string,
    fileName: string,
  ) => {
    const fileUrl = getEightDFileUrl(fileId);

    try {
      if (Platform.OS === "web") {
        // Web: Use blob URL
        const response = await axios.get(fileUrl, { responseType: "blob" });
        const blobUrl = URL.createObjectURL(response.data);
        setPreviewUrl(blobUrl);
        setPreviewFile({ mimeType, fileName });
      } else {
        // Mobile: Use FileSystem.downloadAsync
        const directory =
          FileSystem.cacheDirectory || FileSystem.documentDirectory;

        if (!directory) {
          Alert.alert(
            "Error",
            "Storage not available. Please restart the app.",
          );
          return;
        }

        const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileUri = `${directory}${fileId}_${safeFileName}`;

        // Download file natively
        const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);

        // ✅ FIXED: Only check downloadResult.status (no statusText)
        if (downloadResult.status !== 200) {
          Alert.alert(
            "Error",
            `Failed to download file (Status: ${downloadResult.status})`,
          );
          return;
        }

        // Verify file was actually saved
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists || fileInfo.size === 0) {
          Alert.alert("Error", "Downloaded file is empty or corrupted.");
          return;
        }

        setPreviewUrl(fileUri);
        setPreviewFile({ mimeType, fileName });
      }
    } catch (err: any) {
      console.error("Error loading file:", err);
      Alert.alert(
        "Error",
        `Failed to load file: ${err.message || "Unknown error"}`,
      );
    }
  };
  const closePreview = () => {
    setPreviewUrl(undefined);
    setPreviewFile(null);
  };

  const handleDownloadFile = async () => {
    if (!previewUrl || !previewFile) return;

    if (Platform.OS === "web") {
      // Web: Direct download
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = previewFile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Mobile: "Downloading" on mobile means saving to device via Share sheet
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(previewUrl, {
            mimeType: previewFile.mimeType,
            dialogTitle: `Save ${previewFile.fileName}`,
          });
        } else {
          Alert.alert("Info", `File is saved in app cache:\n${previewUrl}`);
        }
      } catch (err: any) {
        Alert.alert("Error", `Failed to save file: ${err.message}`);
      }
    }
  };

  const handleDownloadOrShare = async () => {
    // On mobile, sharing IS the way to download/save.
    // We just reuse the same logic for the "Share" button.
    await handleDownloadFile();
  };

  const handleApprove = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10)
      return;
    try {
      setApproving(true);
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const res = await axios.post(
        `${API_BASE_URL}/api/eightd/approve/${eventId}`,
        {
          userEmail: user?.email,
          comment: approvalComment.trim(),
        },
      );

      if (res.data.success) {
        // 1. Update local modal state
        setEventData((prev: any) => ({
          ...prev,
          status: "in progress",
          currentStep: "d1",
        }));

        setApprovalComment("");

        // 2. ✅ CRITICAL FIX FOR WEB: Trigger refresh and close IMMEDIATELY.
        // Do not wait for the Alert callback, as it is unreliable on React Native Web.
        if (onRefresh) onRefresh();
        if (onClose) onClose();

        // 3. Show success message (window.alert is 100% reliable on Web)
        if (Platform.OS === "web") {
          window.alert("✅ Document approved successfully!");
        } else {
          Alert.alert("Success", "✅ Document approved successfully!");
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        "Approval failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10)
      return;
    try {
      setRejecting(true);
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const res = await axios.post(
        `${API_BASE_URL}/api/eightd/reject/${eventId}`,
        {
          userEmail: user?.email,
          comment: approvalComment.trim(),
        },
      );
      if (res.data.success) {
        // 1. Update local modal state
        setEventData((prev: any) => ({
          ...prev,
          status: "rejected",
          currentStep: "d0",
        }));

        setApprovalComment("");

        // 2. ✅ CRITICAL FIX FOR WEB: Trigger refresh and close IMMEDIATELY.
        if (onRefresh) onRefresh();
        if (onClose) onClose();

        // 3. Show success message
        if (Platform.OS === "web") {
          window.alert("❌ Document rejected successfully!");
        } else {
          Alert.alert("Rejected", "❌ Document rejected successfully!");
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        "Rejection failed: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setRejecting(false);
    }
  };

  const formatValue = (value: any) => {
    if (value == null || value === "")
      return <Text className="text-gray-500">—</Text>;
    if (typeof value === "string" && /\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return (
          <Text className="text-gray-800">
            {new Date(value).toLocaleString()}
          </Text>
        );
      } catch {
        return <Text className="text-gray-800">{value}</Text>;
      }
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <Text className="text-gray-500">—</Text>;
      if (
        value[0] &&
        (typeof value[0] === "string" ||
          (value[0].action && typeof value[0].action === "string"))
      ) {
        return (
          <View className="mt-1 pl-5">
            {value.map((item: any, idx: number) => (
              <View key={idx} className="mb-1 flex-row">
                <Text className="text-gray-700">
                  • {typeof item === "string" ? item : item.action}
                </Text>
              </View>
            ))}
          </View>
        );
      }
      if (value[0] && typeof value[0] === "object" && value[0].name) {
        return (
          <View className="mt-1">
            {value.map((member: any, idx: number) => (
              <View
                key={idx}
                className="mb-2 rounded border border-gray-200 bg-gray-50 p-2"
              >
                <Text>
                  <Text className="font-semibold">Name: </Text>
                  {member.name}
                </Text>
                <Text>
                  <Text className="font-semibold">Role: </Text>
                  {member.role}
                </Text>
                <Text>
                  <Text className="font-semibold">Dept: </Text>
                  {member.department}
                </Text>
                <Text>
                  <Text className="font-semibold">Contact: </Text>
                  {member.contact}
                </Text>
              </View>
            ))}
          </View>
        );
      }
      return (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {value.map((email: string, idx: number) => (
            <View key={idx} className="rounded-full bg-blue-100 px-2 py-1">
              <Text className="text-sm text-blue-800">{email}</Text>
            </View>
          ))}
        </View>
      );
    }
    if (typeof value === "object")
      return (
        <Text className="text-gray-800">{JSON.stringify(value, null, 2)}</Text>
      );
    return <Text className="text-gray-800">{String(value)}</Text>;
  };

  if (loading) {
    return (
      <View className="h-64 flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-2 text-lg text-gray-600">
          Loading final preview...
        </Text>
      </View>
    );
  }
  if (!eventData) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-center text-gray-600">
          No data available for this event.
        </Text>
      </View>
    );
  }

  const isApprovalPending = eventData.status === "approval pending";
  const checkIsInitiator = userRole
    ? typeof isInitiator === "function"
      ? isInitiator(userRole)
      : Boolean(isInitiator)
    : false;

  const mappedAttachments = files.map((file) => ({
    name: file.fileName,
    url: getEightDFileUrl(file.id),
    size: file.fileSize || 0,
    mimeType: file.mimeType,
    formType: file.formType,
  }));

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <View className="mb-4 flex-row items-center justify-between border-b border-gray-200 pb-4">
          <View className="flex-row items-center">
            <Image
              source={require("@/assets/Stratum.png")}
              className="mr-3 h-10 w-10"
              style={{ width: 70, height: 70 }}
              resizeMode="contain"
            />
            <View className="border-l border-gray-300 pl-3" />
          </View>
          <View className="mx-4 flex-1 items-center">
            <Text className="text-center text-xl font-bold text-gray-900">
              8D Report - Preview
            </Text>
            <Text className="mt-1 text-center text-gray-600">
              Event ID: <Text className="font-semibold">{eventId}</Text>
            </Text>
          </View>
          <View className="w-24" />
        </View>

        {eventData.status === "submitted" && (
          <View className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <View className="flex-row items-center gap-2">
              <CheckCircle size={20} color="#16A34A" />
              <Text className="font-semibold text-green-800">
                This 8D Report has been submitted and is now read-only.
              </Text>
            </View>
          </View>
        )}
        {memberError && (
          <View className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <View className="flex-row items-center gap-2">
              <XCircle size={16} color="#DC2626" />
              <Text className="text-sm text-red-800">{memberError}</Text>
            </View>
          </View>
        )}
        {memberSuccess && (
          <View className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <View className="flex-row items-center gap-2">
              <CheckCircle size={16} color="#16A34A" />
              <Text className="text-sm text-green-800">{memberSuccess}</Text>
            </View>
          </View>
        )}

        <View className="space-y-6">
          {stepsOrder.map((stepKey) => {
            const stepData = eventData.content?.[stepKey]?.[0] || {};
            const stepFiles = getFilesForForm(stepKey);
            const Icon = StepIcons[stepKey];
            return (
              <View
                key={stepKey}
                className="mb-6 border-b border-gray-200 pb-6 last:border-b-0"
              >
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon size={24} color="#4F46E5" />
                  <Text className="text-lg font-semibold">
                    {stepTitles[stepKey]}
                  </Text>
                </View>
                <View className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                  {stepFields[stepKey].map((field) => {
                    const value = stepData[field.key];
                    if (field.key === "additionalEmails" && stepKey === "d0") {
                      const teamMembersData = stepData.teamMembers || [];
                      const additionalEmailsData =
                        stepData.additionalEmails || [];
                      const displayMembers =
                        teamMembersData.length > 0
                          ? teamMembersData
                          : additionalEmailsData.map((email: string) => ({
                              email,
                              isExternal: true,
                            }));
                      return (
                        <View
                          key={field.key}
                          className="border-b border-gray-200 py-2 last:border-b-0"
                        >
                          <Text className="mb-2 font-medium text-gray-800">
                            {field.label}:
                          </Text>
                          {isEditingMembers ? (
                            <View className="space-y-3">
                              <View className="max-h-96 rounded-lg border border-gray-200 bg-white p-3">
                                {tempTeamMembers.map((member, idx) => (
                                  <View
                                    key={idx}
                                    className="mb-2 flex-row items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                                  >
                                    <View className="flex-1">
                                      <View className="mb-2">
                                        <Text className="mb-1 text-xs text-gray-500">
                                          First Name
                                        </Text>
                                        <TextInput
                                          value={member.firstName || ""}
                                          onChangeText={(text) =>
                                            updateMemberField(
                                              idx,
                                              "firstName",
                                              text,
                                            )
                                          }
                                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                          placeholder="First name"
                                        />
                                      </View>
                                      <View className="mb-2">
                                        <Text className="mb-1 text-xs text-gray-500">
                                          Last Name
                                        </Text>
                                        <TextInput
                                          value={member.lastName || ""}
                                          onChangeText={(text) =>
                                            updateMemberField(
                                              idx,
                                              "lastName",
                                              text,
                                            )
                                          }
                                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                          placeholder="Last name"
                                        />
                                      </View>
                                      <View className="mb-2">
                                        <Text className="mb-1 text-xs text-gray-500">
                                          Email *
                                        </Text>
                                        <TextInput
                                          value={member.email || ""}
                                          onChangeText={(text) =>
                                            updateMemberField(
                                              idx,
                                              "email",
                                              text,
                                            )
                                          }
                                          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${member.email && !isValidEmail(member.email) ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                                          placeholder="team.member@example.com"
                                          keyboardType="email-address"
                                          autoCapitalize="none"
                                        />
                                        {member.email &&
                                          !isValidEmail(member.email) && (
                                            <Text className="mt-1 text-xs text-red-500">
                                              Invalid email format
                                            </Text>
                                          )}
                                      </View>
                                      <View className="mb-2">
                                        <Text className="mb-1 text-xs text-gray-500">
                                          Department
                                        </Text>
                                        <TextInput
                                          value={member.department || ""}
                                          onChangeText={(text) =>
                                            updateMemberField(
                                              idx,
                                              "department",
                                              text,
                                            )
                                          }
                                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                          placeholder="Department"
                                        />
                                      </View>
                                      <View className="mt-2 flex-row items-center gap-2">
                                        <TouchableOpacity
                                          onPress={() =>
                                            updateMemberField(
                                              idx,
                                              "isExternal",
                                              !member.isExternal,
                                            )
                                          }
                                          className="h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white"
                                        >
                                          {member.isExternal && (
                                            <View className="h-3 w-3 rounded-sm bg-blue-500" />
                                          )}
                                        </TouchableOpacity>
                                        <Text className="text-xs text-gray-600">
                                          External team member
                                        </Text>
                                      </View>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => removeMemberField(idx)}
                                      className="rounded-full bg-red-100 p-2"
                                    >
                                      <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                ))}
                                {tempTeamMembers.length === 0 && (
                                  <View className="items-center py-4">
                                    <Users size={24} color="#9CA3AF" />
                                    <Text className="mt-2 text-center text-gray-500">
                                      No team members added yet.
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View className="flex-row flex-wrap gap-2">
                                <TouchableOpacity
                                  onPress={addNewMemberField}
                                  className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 active:bg-blue-700"
                                >
                                  <Plus size={16} color="white" />
                                  <Text className="text-sm text-white">
                                    Add Member
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={saveTeamMembers}
                                  disabled={
                                    updatingMembers ||
                                    tempTeamMembers.some(
                                      (member) =>
                                        !member.email ||
                                        !isValidEmail(member.email),
                                    )
                                  }
                                  className={`flex-row items-center gap-2 rounded-lg px-4 py-2 ${updatingMembers || tempTeamMembers.some((member) => !member.email || !isValidEmail(member.email)) ? "bg-gray-400" : "bg-green-600 active:bg-green-700"}`}
                                >
                                  {updatingMembers ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="white"
                                    />
                                  ) : (
                                    <Save size={16} color="white" />
                                  )}
                                  <Text className="text-sm text-white">
                                    {updatingMembers
                                      ? "Saving..."
                                      : "Save Changes"}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={cancelEditingMembers}
                                  disabled={updatingMembers}
                                  className="flex-row items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 active:bg-gray-700"
                                >
                                  <X size={16} color="white" />
                                  <Text className="text-sm text-white">
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <View className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                <Text className="text-xs text-blue-800">
                                  <Text className="font-semibold">
                                    Instructions:
                                  </Text>
                                  {"\n"}• Fill in team member details (email is
                                  required){"\n"}• Mark as "External" if the
                                  member is not in the system{"\n"}• Click "Add
                                  Member" to add more team members{"\n"}• These
                                  details will be saved to the 8D event data
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View className="flex-col gap-3">
                              {displayMembers.length > 0 ? (
                                <View className="gap-3">
                                  {displayMembers.map(
                                    (member: any, idx: number) => (
                                      <View
                                        key={idx}
                                        className="rounded-lg border border-gray-200 bg-white p-3"
                                      >
                                        <View className="flex-row items-start justify-between">
                                          <View className="flex-1">
                                            <View className="mb-2 flex-row items-center gap-2">
                                              <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                                                <Users
                                                  size={14}
                                                  color="#2563EB"
                                                />
                                              </View>
                                              <View className="flex-1">
                                                <Text
                                                  className="font-semibold text-gray-800"
                                                  numberOfLines={1}
                                                >
                                                  {member.firstName ||
                                                  member.lastName
                                                    ? `${member.firstName || ""} ${member.lastName || ""}`.trim()
                                                    : "Unnamed Member"}
                                                </Text>
                                                <SimpleTooltip
                                                  content={member.email}
                                                >
                                                  <View className="flex-row items-center gap-1">
                                                    <Mail
                                                      size={12}
                                                      color="#4B5563"
                                                    />
                                                    <Text
                                                      className="text-sm text-gray-600"
                                                      numberOfLines={1}
                                                    >
                                                      {member.email}
                                                    </Text>
                                                  </View>
                                                </SimpleTooltip>
                                              </View>
                                            </View>
                                            <View className="space-y-1">
                                              {member.department && (
                                                <SimpleTooltip
                                                  content={member.department}
                                                >
                                                  <Text
                                                    className="text-xs text-gray-600"
                                                    numberOfLines={1}
                                                  >
                                                    <Text className="font-medium">
                                                      Department:
                                                    </Text>{" "}
                                                    {member.department}
                                                  </Text>
                                                </SimpleTooltip>
                                              )}
                                              {member.username && (
                                                <SimpleTooltip
                                                  content={member.username}
                                                >
                                                  <Text
                                                    className="text-xs text-gray-600"
                                                    numberOfLines={1}
                                                  >
                                                    <Text className="font-medium">
                                                      Username:
                                                    </Text>{" "}
                                                    {member.username}
                                                  </Text>
                                                </SimpleTooltip>
                                              )}
                                              <View className="mt-1 flex-row items-center gap-2">
                                                <Text className="text-xs font-medium text-gray-600">
                                                  Status:
                                                </Text>
                                                <View
                                                  className={`rounded-full px-2 py-0.5 ${member.isExternal ? "bg-orange-100" : "bg-green-100"}`}
                                                >
                                                  <Text
                                                    className={`text-xs ${member.isExternal ? "text-orange-800" : "text-green-800"}`}
                                                  >
                                                    {member.isExternal
                                                      ? "External"
                                                      : "System User"}
                                                  </Text>
                                                </View>
                                              </View>
                                            </View>
                                          </View>
                                        </View>
                                      </View>
                                    ),
                                  )}
                                </View>
                              ) : (
                                <View className="items-center rounded-lg border-2 border-dashed border-gray-300 py-6">
                                  <Users size={32} color="#9CA3AF" />
                                  <Text className="mt-2 text-gray-500">
                                    No team members added yet
                                  </Text>
                                </View>
                              )}
                              {(isHOD || checkIsInitiator) && (
                                <View className="border-t border-gray-200 pt-3">
                                  <TouchableOpacity
                                    onPress={startEditingTeamMembers}
                                    className="flex-row items-center gap-2 self-start rounded-lg bg-blue-500 px-4 py-2 active:bg-blue-600"
                                  >
                                    <Edit3 size={16} color="white" />
                                    <Text className="text-sm text-white">
                                      Manage Team Members
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    }
                    return (
                      <View
                        key={field.key}
                        className="flex-row items-start gap-3 border-b border-gray-200 py-2 last:border-b-0"
                      >
                        <Text className="w-40 font-medium text-gray-800 sm:w-48">
                          {field.label}:
                        </Text>
                        <View className="flex-1">{formatValue(value)}</View>
                      </View>
                    );
                  })}
                </View>
                {stepFiles.length > 0 && (
                  <View className="mt-4">
                    <View className="mb-2 flex-row items-center gap-1">
                      <Camera size={16} color="#374151" />
                      <Text className="font-semibold text-gray-800">
                        Attachments ({stepFiles.length})
                      </Text>
                    </View>
                    <View className="mt-2 flex-row flex-wrap justify-between">
                      {stepFiles.map((file) => (
                        <TouchableOpacity
                          key={file.id}
                          className="mb-3 w-[48%] overflow-hidden rounded-lg border border-gray-200 bg-white"
                          activeOpacity={0.8}
                          onPress={() =>
                            handleFileClick(
                              file.id,
                              file.mimeType,
                              file.fileName,
                            )
                          }
                        >
                          {file.fileType === "IMAGE" ? (
                            <Image
                              source={{ uri: getEightDFileUrl(file.id) }}
                              style={{ width: "100%", height: 96 }}
                              className="h-24 w-full"
                              resizeMode="cover"
                            />
                          ) : file.mimeType === "application/pdf" ? (
                            <View className="h-20 items-center justify-center bg-red-100 sm:h-24">
                              <File size={32} color="#DC2626" />
                            </View>
                          ) : (
                            <View className="h-20 items-center justify-center bg-blue-100 sm:h-24">
                              <File size={32} color="#2563EB" />
                            </View>
                          )}
                          <View className="bg-white p-2">
                            <Text
                              className="text-[10px] text-gray-700 sm:text-xs"
                              numberOfLines={2}
                            >
                              {file.fileName}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {isHOD && isApprovalPending && (
            <View className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Eye size={16} color="#854D0E" />
                <Text className="font-semibold text-yellow-800">
                  HOD Approval Required
                </Text>
              </View>
              <Text className="mb-3 text-sm text-yellow-700">
                Please review D0 data above before approving or rejecting this
                8D event.{"\n"}
                <Text className="font-medium">
                  Note: A comment of at least 10 characters is required.
                </Text>
              </Text>
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Approval/Rejection Comment:
                </Text>
                <TextInput
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  placeholder="Enter your comment (min. 10 characters)..."
                  multiline
                  numberOfLines={3}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm"
                  textAlignVertical="top"
                />
              </View>
              <View className="flex-row flex-wrap gap-3">
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={
                    approving ||
                    !approvalComment.trim() ||
                    approvalComment.trim().length < 10
                  }
                  className={`flex-row items-center gap-2 rounded px-4 py-2 ${approving || !approvalComment.trim() || approvalComment.trim().length < 10 ? "bg-gray-400" : "bg-green-600 active:bg-green-700"}`}
                >
                  {approving && (
                    <ActivityIndicator size="small" color="white" />
                  )}
                  <CheckCircle size={16} color="white" />
                  <Text className="font-medium text-white">
                    Approve & Move to D1
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleReject}
                  disabled={
                    rejecting ||
                    !approvalComment.trim() ||
                    approvalComment.trim().length < 10
                  }
                  className={`flex-row items-center gap-2 rounded px-4 py-2 ${rejecting || !approvalComment.trim() || approvalComment.trim().length < 10 ? "bg-gray-400" : "bg-red-600 active:bg-red-700"}`}
                >
                  {rejecting && (
                    <ActivityIndicator size="small" color="white" />
                  )}
                  <XCircle size={16} color="white" />
                  <Text className="font-medium text-white">Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mt-6 flex-row justify-end gap-3 border-t border-gray-200 pt-4">
            <Generate8DPdf
              title={`8D_Report_${eventId}`}
              eventId={eventId}
              formData={eventData?.content || {}}
              attachments={mappedAttachments}
            />
          </View>
        </View>

        <Modal
          visible={!!previewUrl && !!previewFile}
          transparent={true}
          animationType="fade"
          onRequestClose={closePreview}
        >
          <View className="flex-1 bg-black/90">
            {/* Header */}
            <View className="flex-row items-center justify-between bg-gray-800 px-4 py-3">
              <Text
                className="mr-2 flex-1 truncate text-sm font-semibold text-white"
                numberOfLines={1}
              >
                {previewFile?.fileName}
              </Text>
              <View className="flex-row gap-2">
                {/* Download Button */}
                <TouchableOpacity
                  onPress={handleDownloadFile}
                  className="rounded-full bg-blue-600 p-2 active:bg-blue-700"
                >
                  <Download size={20} color="white" />
                </TouchableOpacity>
                {/* Share Button */}
                <TouchableOpacity
                  onPress={handleDownloadOrShare}
                  className="rounded-full bg-gray-700 p-2 active:bg-gray-600"
                >
                  <Users size={20} color="white" />
                </TouchableOpacity>
                {/* Close Button */}
                <TouchableOpacity
                  onPress={closePreview}
                  className="rounded-full bg-gray-700 p-2 active:bg-gray-600"
                >
                  <X size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Media Preview Area */}
            <View className="flex-1 bg-black">
              {previewFile?.mimeType?.startsWith("image/") ? (
                <Image
                  source={{ uri: previewUrl }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="contain"
                  onLoadStart={() => console.log(" Image loading...")}
                  onLoad={() => console.log("✅ Image loaded successfully")}
                  onError={(e) => {
                    console.error("❌ Image load error:", e.nativeEvent.error);
                    Alert.alert("Error", "Failed to display image");
                  }}
                />
              ) : previewFile?.mimeType?.startsWith("video/") ? (
                Platform.OS === "web" ? (
                  // Web: HTML5 Video
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      backgroundColor: "#000",
                    }}
                  />
                ) : (
                  // Mobile: Native Video Player with expo-av
                  // Mobile: Native Video Player with expo-av
                  <View className="flex-1 items-center justify-center bg-black">
                    <Video
                      source={{ uri: previewUrl as string }}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping={false}
                      shouldPlay={true}
                      onError={(e) => {
                        console.error("Video error:", e);
                        Alert.alert("Error", "Failed to play video");
                      }}
                    />
                  </View>
                )
              ) : previewFile?.mimeType === "application/pdf" ? (
                <View className="flex-1 items-center justify-center p-6">
                  <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-600">
                    <File size={48} color="white" />
                  </View>
                  <Text className="mb-2 text-center text-xl font-semibold text-white">
                    PDF Document
                  </Text>
                  <Text
                    className="mb-6 px-4 text-center text-sm text-gray-300"
                    numberOfLines={2}
                  >
                    {previewFile?.fileName}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-row items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 active:bg-blue-700"
                      onPress={handleDownloadFile}
                    >
                      <Download size={20} color="white" />
                      <Text className="text-base font-semibold text-white">
                        Download
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 active:bg-indigo-700"
                      onPress={handleDownloadOrShare}
                    >
                      <Users size={20} color="white" />
                      <Text className="text-base font-semibold text-white">
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Other file types
                <View className="flex-1 items-center justify-center p-6">
                  <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-600">
                    <File size={48} color="white" />
                  </View>
                  <Text
                    className="mb-6 px-4 text-center text-base text-gray-300"
                    numberOfLines={2}
                  >
                    {previewFile?.fileName}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-row items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 active:bg-blue-700"
                      onPress={handleDownloadFile}
                    >
                      <Download size={20} color="white" />
                      <Text className="text-base font-semibold text-white">
                        Download
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 active:bg-indigo-700"
                      onPress={handleDownloadOrShare}
                    >
                      <Users size={20} color="white" />
                      <Text className="text-base font-semibold text-white">
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}
