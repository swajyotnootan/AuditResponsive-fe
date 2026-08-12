/// <reference types="nativewind/types" />
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as FileSystem from "expo-file-system";
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
        <View className="absolute bottom-full mb-2 left-0 bg-gray-800 px-3 py-2 rounded-lg z-50 min-w-[150px]">
          <Text className="text-xs text-white">{content}</Text>
          <View className="absolute bottom-[-6px] left-4 w-3 h-3 bg-gray-800 transform rotate-45" />
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
    try {
      const fileUrl = getEightDFileUrl(fileId);
      if (Platform.OS === "web") {
        const response = await axios.get(fileUrl, { responseType: "blob" });
        const blobUrl = URL.createObjectURL(response.data);
        setPreviewUrl(blobUrl);
        setPreviewFile({ mimeType, fileName });
      } else {
        const fs = FileSystem as any;
        const directory = fs.cacheDirectory || fs.documentDirectory || "";
        if (!directory) {
          Alert.alert(
            "Error",
            "File system directory not available on this device.",
          );
          return;
        }
        const fileUri = `${directory}${fileId}_${fileName}`;
        await FileSystem.downloadAsync(fileUrl, fileUri);
        setPreviewUrl(fileUri);
        setPreviewFile({ mimeType, fileName });
      }
    } catch (err: any) {
      console.error("Error fetching file:", err);
      Alert.alert("Error", "Failed to load file.");
    }
  };

  const closePreview = () => {
    setPreviewUrl(undefined);
    setPreviewFile(null);
  };

  // 👇 ADD THIS HELPER FUNCTION
  const handleDownloadOrShare = async () => {
    if (!previewUrl || !previewFile) return;

    if (Platform.OS === "web") {
      // On Web, trigger a direct download using a hidden anchor tag
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = previewFile.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // On Native (iOS/Android), use Expo Sharing
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(previewUrl);
      } else {
        Alert.alert(
          "Info",
          "File saved to cache. Sharing not available on this platform.",
        );
      }
    }
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
        // 👇 FIX: Update local state immediately so it shows "Approved / In Progress"
        setEventData((prev: any) => ({
          ...prev,
          status: "in progress",
          currentStep: "d1",
        }));
        Alert.alert("Success", "✅ Document approved successfully!", [
          {
            text: "OK",
            onPress: () => {
              setApprovalComment("");
              if (onRefresh) onRefresh();
              if (onClose) onClose();
            },
          },
        ]);
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
      const res = await axios.post(`${API_BASE_URL}/api/eightd/reject/${eventId}`, {
        userEmail: user?.email,
        comment: approvalComment.trim(),
      });
      if (res.data.success) {
        // 👇 FIX: Update local state immediately so it shows "Rejected"
        setEventData((prev: any) => ({
          ...prev,
          status: "rejected",
          currentStep: "d0",
        }));

        Alert.alert("Rejected", "❌ Document rejected successfully!", [
          {
            text: "OK",
            onPress: () => {
              setApprovalComment("");
              if (onRefresh) onRefresh(); // Triggers dashboard to re-fetch (turns card red)
              if (onClose) onClose(); // 👈 FIX: Closes the modal
            },
          },
        ]);
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
          <View className="pl-5 mt-1">
            {value.map((item: any, idx: number) => (
              <View key={idx} className="flex-row mb-1">
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
                className="p-2 mb-2 border border-gray-200 rounded bg-gray-50"
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
        <View className="flex-row flex-wrap gap-2 mt-1">
          {value.map((email: string, idx: number) => (
            <View key={idx} className="px-2 py-1 bg-blue-100 rounded-full">
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
      <View className="items-center justify-center flex-1 h-64 bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-2 text-lg text-gray-600">
          Loading final preview...
        </Text>
      </View>
    );
  }
  if (!eventData) {
    return (
      <View className="items-center justify-center flex-1 p-6 bg-white">
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
      <View className="p-4 bg-white border border-gray-200 shadow-lg rounded-xl">
        <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-gray-200">
          <View className="flex-row items-center">
            <Image
              source={require("@/assets/Stratum.png")}
              className="w-10 h-10 mr-3"
              style={{ width: 70, height: 70 }}
              resizeMode="contain"
            />
            <View className="pl-3 border-l border-gray-300" />
          </View>
          <View className="items-center flex-1 mx-4">
            <Text className="text-xl font-bold text-center text-gray-900">
              8D Report - Preview
            </Text>
            <Text className="mt-1 text-center text-gray-600">
              Event ID: <Text className="font-semibold">{eventId}</Text>
            </Text>
          </View>
          <View className="w-24" />
        </View>

        {eventData.status === "submitted" && (
          <View className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
            <View className="flex-row items-center gap-2">
              <CheckCircle size={20} color="#16A34A" />
              <Text className="font-semibold text-green-800">
                This 8D Report has been submitted and is now read-only.
              </Text>
            </View>
          </View>
        )}
        {memberError && (
          <View className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
            <View className="flex-row items-center gap-2">
              <XCircle size={16} color="#DC2626" />
              <Text className="text-sm text-red-800">{memberError}</Text>
            </View>
          </View>
        )}
        {memberSuccess && (
          <View className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
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
                className="pb-6 mb-6 border-b border-gray-200 last:border-b-0"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <Icon size={24} color="#4F46E5" />
                  <Text className="text-lg font-semibold">
                    {stepTitles[stepKey]}
                  </Text>
                </View>
                <View className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50">
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
                          className="py-2 border-b border-gray-200 last:border-b-0"
                        >
                          <Text className="mb-2 font-medium text-gray-800">
                            {field.label}:
                          </Text>
                          {isEditingMembers ? (
                            <View className="space-y-3">
                              <View className="p-3 bg-white border border-gray-200 rounded-lg max-h-96">
                                {tempTeamMembers.map((member, idx) => (
                                  <View
                                    key={idx}
                                    className="flex-row items-start gap-2 p-3 mb-2 border border-gray-200 rounded-lg bg-gray-50"
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
                                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
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
                                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
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
                                          className={`w-full px-3 py-2 text-sm bg-white border rounded-lg ${member.email && !isValidEmail(member.email) ? "border-red-300 bg-red-50" : "border-gray-300"}`}
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
                                          className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg"
                                          placeholder="Department"
                                        />
                                      </View>
                                      <View className="flex-row items-center gap-2 mt-2">
                                        <TouchableOpacity
                                          onPress={() =>
                                            updateMemberField(
                                              idx,
                                              "isExternal",
                                              !member.isExternal,
                                            )
                                          }
                                          className="items-center justify-center w-5 h-5 bg-white border border-gray-300 rounded"
                                        >
                                          {member.isExternal && (
                                            <View className="w-3 h-3 bg-blue-500 rounded-sm" />
                                          )}
                                        </TouchableOpacity>
                                        <Text className="text-xs text-gray-600">
                                          External team member
                                        </Text>
                                      </View>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => removeMemberField(idx)}
                                      className="p-2 bg-red-100 rounded-full"
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
                                  className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg active:bg-blue-700"
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
                                  className={`flex-row items-center gap-2 px-4 py-2 rounded-lg ${updatingMembers || tempTeamMembers.some((member) => !member.email || !isValidEmail(member.email)) ? "bg-gray-400" : "bg-green-600 active:bg-green-700"}`}
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
                                  className="flex-row items-center gap-2 px-4 py-2 bg-gray-600 rounded-lg active:bg-gray-700"
                                >
                                  <X size={16} color="white" />
                                  <Text className="text-sm text-white">
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <View className="p-3 border border-blue-200 rounded-lg bg-blue-50">
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
                                        className="p-3 bg-white border border-gray-200 rounded-lg"
                                      >
                                        <View className="flex-row items-start justify-between">
                                          <View className="flex-1">
                                            <View className="flex-row items-center gap-2 mb-2">
                                              <View className="items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
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
                                              <View className="flex-row items-center gap-2 mt-1">
                                                <Text className="text-xs font-medium text-gray-600">
                                                  Status:
                                                </Text>
                                                <View
                                                  className={`px-2 py-0.5 rounded-full ${member.isExternal ? "bg-orange-100" : "bg-green-100"}`}
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
                                <View className="items-center py-6 border-2 border-gray-300 border-dashed rounded-lg">
                                  <Users size={32} color="#9CA3AF" />
                                  <Text className="mt-2 text-gray-500">
                                    No team members added yet
                                  </Text>
                                </View>
                              )}
                              {(isHOD || checkIsInitiator) && (
                                <View className="pt-3 border-t border-gray-200">
                                  <TouchableOpacity
                                    onPress={startEditingTeamMembers}
                                    className="flex-row items-center self-start gap-2 px-4 py-2 bg-blue-500 rounded-lg active:bg-blue-600"
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
                        className="flex-row items-start gap-3 py-2 border-b border-gray-200 last:border-b-0"
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
                    <View className="flex-row items-center gap-1 mb-2">
                      <Camera size={16} color="#374151" />
                      <Text className="font-semibold text-gray-800">
                        Attachments ({stepFiles.length})
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap justify-between mt-2">
                      {stepFiles.map((file) => (
                        <TouchableOpacity
                          key={file.id}
                          className="w-[48%] mb-3 border border-gray-200 rounded-lg overflow-hidden bg-white"
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
                              className="w-full h-24"
                              resizeMode="cover"
                            />
                          ) : file.mimeType === "application/pdf" ? (
                            <View className="items-center justify-center h-20 bg-red-100 sm:h-24">
                              <File size={32} color="#DC2626" />
                            </View>
                          ) : (
                            <View className="items-center justify-center h-20 bg-blue-100 sm:h-24">
                              <File size={32} color="#2563EB" />
                            </View>
                          )}
                          <View className="p-2 bg-white">
                            <Text
                              className="text-[10px] sm:text-xs text-gray-700"
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
            <View className="p-4 mt-8 border border-yellow-200 rounded-lg bg-yellow-50">
              <View className="flex-row items-center gap-2 mb-3">
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
                  className="w-full p-3 text-sm bg-white border border-gray-300 rounded-lg"
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
                  className={`flex-row items-center gap-2 px-4 py-2 rounded ${approving || !approvalComment.trim() || approvalComment.trim().length < 10 ? "bg-gray-400" : "bg-green-600 active:bg-green-700"}`}
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
                  className={`flex-row items-center gap-2 px-4 py-2 rounded ${rejecting || !approvalComment.trim() || approvalComment.trim().length < 10 ? "bg-gray-400" : "bg-red-600 active:bg-red-700"}`}
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

          <View className="flex-row justify-end gap-3 pt-4 mt-6 border-t border-gray-200">
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
          <View className="items-center justify-center flex-1 p-4 bg-black/70">
            {/* 👇 FIXED: Added max-w-4xl to constrain width on desktop, and shadow-2xl for depth */}
            <View className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-3 bg-gray-800">
                <Text
                  className="flex-1 mr-2 text-sm font-semibold text-white truncate"
                  numberOfLines={1}
                >
                  {previewFile?.fileName}
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleDownloadOrShare}
                    className="p-1 active:bg-gray-700 rounded"
                  >
                    <Download size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closePreview}
                    className="p-1 active:bg-gray-700 rounded"
                  >
                    <X size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Media Preview Area */}
              <View
                className="items-center justify-center bg-gray-900 flex-1" // ✅ flex-1 fills the remaining height
                style={{ minHeight: 400 }} // Keeps it from collapsing on tiny screens
              >
                {previewFile?.mimeType?.startsWith("image/") ? (
                  <Image
                    source={{ uri: previewUrl }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                ) : previewFile?.mimeType?.startsWith("video/") &&
                  Platform.OS === "web" ? (
                  // Native HTML5 Video Player for Web
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
                ) : previewFile?.mimeType === "application/pdf" ? (
                  <View className="items-center justify-center p-4 flex-1">
                    <File size={48} color="#DC2626" />
                    <Text className="mt-4 text-center text-white font-semibold text-lg">
                      {previewFile?.fileName}
                    </Text>
                    <Text className="mt-2 text-center text-gray-300 px-4">
                      Native PDF preview is not supported. Tap below to
                      download.
                    </Text>
                    <TouchableOpacity
                      className="flex-row items-center gap-2 px-6 py-3 mt-6 bg-indigo-600 rounded-lg active:bg-indigo-700"
                      onPress={handleDownloadOrShare}
                    >
                      <Download size={18} color="white" />
                      <Text className="font-medium text-white">
                        {Platform.OS === "web"
                          ? "Download PDF"
                          : "Open / Share PDF"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center p-4">
                    <File size={48} color="#9CA3AF" />
                    <Text className="mt-2 text-sm text-center text-gray-300">
                      This file type cannot be previewed directly.
                    </Text>
                    <TouchableOpacity
                      className="flex-row items-center gap-2 px-6 py-3 mt-4 bg-blue-600 rounded-lg active:bg-blue-700"
                      onPress={handleDownloadOrShare}
                    >
                      <Download size={18} color="white" />
                      <Text className="font-medium text-white">
                        {Platform.OS === "web"
                          ? "Download File"
                          : "Download / Share File"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}
