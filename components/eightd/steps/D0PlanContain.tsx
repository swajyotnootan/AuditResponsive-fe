import { API_BASE_URL } from "@/config/apiConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  CountryCode,
  getExampleNumber,
  isPossiblePhoneNumber,
} from "libphonenumber-js";
import mobileExamples from "libphonenumber-js/examples.mobile.json";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Hash,
  Info,
  Plus,
  Search,
  User,
  Users,
  Video,
  X,
  XCircle,
} from "lucide-react-native";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import worldCountries from "world-countries";

import { userAPI } from "@/services/api";
import { useAuth } from "../../context/AuthContext";
import FinalPreview from "./FinalPreview";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isDesktop = isWeb && SCREEN_WIDTH >= 768;

// --- Types & Interfaces ---
interface UserData {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
}

interface Department {
  id: number;
  name: string;
}

interface Company {
  name: string;
  logo: string;
}

interface TeamMember {
  firstName: string;
  lastName: string;
  department: string;
  email: string;
  username: string;
}

interface FileItem {
  id: number | string;
  name: string;
  type: string;
  size: number;
  title: string;
  description: string;
  uri: string;
  isLocalFile?: boolean;
}

interface Country {
  name: string;
  iso2: string;
  dialCode: string;
  flagUrl: string;
}

interface FormDataState {
  id?: string | number;
  eventNo: string;
  plantLine: string;
  partName: string;
  lotSerial: string;
  defectCode: string;
  dateDiscovered: string;
  reportedBy: string;
  personName: string;
  department: string;
  companyName: string;
  companyLogo: string;
  contactPerson: string;
  phone: string;
  countryCode: string;
  countryIsoCode: string;
  email: string;
  teamMembers: TeamMember[];
  pictures: FileItem[];
  reports: FileItem[];
  videos: FileItem[];
  status: string;
  currentStep: string;
  isNcrBased: boolean;
  sourceType: string;
  sourceNcrId?: string;
  sourceNcrNumber?: string;
}

interface D0PlanContainProps {
  eventId?: string | null;
  updateParent?: (data: Partial<FormDataState>[]) => void;
  initialIsNcrBased?: boolean;
}

interface TooltipProps {
  content: string;
  children: ReactNode;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}

interface InputFieldProps {
  label?: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  type?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  placeholder?: string;
}

interface UserOption {
  value: string;
  label: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
}

interface UserDropdownProps {
  value: string;
  onChange: (option: UserOption) => void;
  options?: UserOption[];
  placeholder?: string;
  loading?: boolean;
  required?: boolean;
}

interface TeamMemberFieldProps {
  member: TeamMember;
  index: number;
  onChange: (index: number, field: keyof TeamMember, value: string) => void;
  onRemove: (index: number) => void;
  error?: string;
  onSearchUser: (searchTerm: string, index: number) => void;
  loadingSearch: number | null;
  departments: Department[];
  userOptions: UserOption[];
  loadingUsers: boolean;
}

interface LayoutTabsProps {
  activeLayout: string;
  setActiveLayout: (layout: string) => void;
}

const companies: Company[] = [
  { name: "TTK Prestige", logo: "/logos/ttk-prestige.png" },
  { name: "Boeing", logo: "/logos/boeing.png" },
  { name: "Feather Light Furniture", logo: "/logos/feather-light.png" },
];

const defaultDepartments: Department[] = [
  { id: 1, name: "Quality" },
  { id: 2, name: "Production" },
  { id: 3, name: "Engineering" },
  { id: 4, name: "Maintenance" },
  { id: 5, name: "Supply Chain" },
  { id: 6, name: "R&D" },
  { id: 7, name: "Other" },
];

const mobileLengthCache: Record<string, number> = {};
const getStandardMobileLength = (iso: string): number => {
  const code = (iso || "IN").toUpperCase();
  if (mobileLengthCache[code]) return mobileLengthCache[code];
  let len = 10;
  try {
    const example = getExampleNumber(
      code as CountryCode,
      mobileExamples as any,
    );
    if (example?.nationalNumber) len = example.nationalNumber.length;
  } catch (e) {}
  mobileLengthCache[code] = len;
  return len;
};

const phoneLengthCache: Record<string, number[]> = {};
const getPossiblePhoneLengths = (iso: string): number[] => {
  if (phoneLengthCache[iso]) return phoneLengthCache[iso];
  const lengths: number[] = [];
  try {
    for (let n = 1; n <= 17; n++) {
      if (isPossiblePhoneNumber("9".repeat(n), iso as any)) lengths.push(n);
    }
  } catch (e) {}
  const result = lengths.length > 0 ? lengths : [10];
  phoneLengthCache[iso] = result;
  return result;
};
const getMaxPhoneLength = (iso: string): number =>
  Math.max(...getPossiblePhoneLengths(iso));

const Tooltip = ({ content, children }: TooltipProps) => {
  const [show, setShow] = useState(false);
  return (
    <View className="relative">
      <Pressable onPress={() => setShow(!show)} className="p-1">
        {children}
      </Pressable>
      {show && (
        <View className="absolute left-0 z-50 w-48 px-3 py-2 mb-2 bg-gray-800 rounded-lg shadow-lg bottom-full">
          <Text className="text-xs text-white">{content}</Text>
          <View className="absolute bottom-0 w-3 h-3 transform rotate-45 translate-y-1/2 bg-gray-800 left-4" />
        </View>
      )}
    </View>
  );
};

const CustomSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
}: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);

  return (
    <View className="mb-3">
      {label && (
        <View className="flex-row items-center mb-1">
          <Text className="text-sm font-medium text-gray-600">{label}</Text>
          {required && <Text className="ml-1 text-red-500">*</Text>}
        </View>
      )}
      <Pressable
        onPress={() => setIsOpen(true)}
        className={`w-full flex-row items-center justify-between rounded-lg border px-3 py-2.5 shadow-sm ${
          error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"
        }`}
      >
        <Text
          className={`text-sm ${selected ? "text-gray-900" : "text-gray-400"}`}
        >
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>
      {error && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable
          className="items-center justify-center flex-1 p-4 bg-black/30"
          onPress={() => setIsOpen(false)}
        >
          <View
            className="overflow-hidden bg-white shadow-xl rounded-xl"
            style={{
              width: isDesktop ? 320 : Math.min(SCREEN_WIDTH * 0.85, 400),
              maxHeight: 400,
            }}
          >
            <View className="flex-row items-center justify-between p-3 border-b border-gray-200">
              <Text className="text-base font-semibold text-gray-800">
                {label || "Select"}
              </Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="max-h-80">
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`p-4 border-b border-gray-100 ${value === opt.value ? "bg-indigo-50" : "bg-white"}`}
                >
                  <Text
                    className={`text-sm ${value === opt.value ? "text-indigo-700 font-medium" : "text-gray-700"}`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  error,
  multiline = false,
  placeholder,
}: InputFieldProps) => (
  <View className="mb-3">
    {label && (
      <View className="flex-row items-center mb-1">
        <Text className="text-sm font-medium text-gray-600">{label}</Text>
        {required && <Text className="ml-1 text-red-500">*</Text>}
      </View>
    )}
    <TextInput
      value={value}
      onChangeText={(text) => onChange({ target: { name, value: text } })}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      keyboardType={type === "email" ? "email-address" : "default"}
      placeholder={placeholder || label}
      placeholderTextColor="#9CA3AF"
      className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm ${
        error ? "border-red-500 bg-red-50" : "border-gray-300 bg-white"
      } text-gray-900`}
    />
    {error && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
  </View>
);

const UserDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select user...",
  loading = false,
  required = false,
}: UserDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (option) =>
      option.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <View className="relative">
      <Pressable
        onPress={() => {
          setIsOpen(true);
          setSearchTerm("");
        }}
        className={`w-full flex-row items-center justify-between rounded-lg border px-3 py-2.5 shadow-sm ${
          required && !value
            ? "border-orange-500 bg-orange-50"
            : "border-gray-300 bg-white"
        }`}
      >
        <Text
          className={`text-sm flex-1 ${selectedOption ? "text-gray-900" : "text-gray-400"}`}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="items-center justify-center flex-1 bg-black/30"
        >
          {/* Backdrop to close the popup when clicking outside */}
          <Pressable
            className="absolute top-0 bottom-0 left-0 right-0"
            onPress={() => setIsOpen(false)}
          />

          <View
            className="overflow-hidden bg-white shadow-2xl rounded-2xl"
            style={{
              maxHeight: "80%",
              width: isDesktop ? 400 : Math.min(SCREEN_WIDTH * 0.9, 400),
            }}
          >
            <View className="flex-row items-center gap-2 p-4 border-b border-gray-200">
              <Search size={18} color="#6B7280" />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search users..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 text-base text-gray-900"
                autoFocus
              />
              <Pressable onPress={() => setIsOpen(false)}>
                <X size={20} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView
              className="max-h-96"
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View className="items-center p-6">
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text className="mt-2 text-sm text-gray-500">
                    Loading users...
                  </Text>
                </View>
              ) : filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-sm text-gray-500">No users found</Text>
                </View>
              ) : (
                filteredOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                    className="p-4 border-b border-gray-100 active:bg-indigo-50"
                  >
                    <Text className="text-sm font-medium text-gray-900">
                      {option.label}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {option.email}
                    </Text>
                    {option.department && (
                      <Text className="text-xs text-gray-400">
                        Dept: {option.department}
                      </Text>
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const TeamMemberField = ({
  member,
  index,
  onChange,
  onRemove,
  error,
  onSearchUser,
  loadingSearch,
  departments = [],
  userOptions = [],
  loadingUsers = false,
}: TeamMemberFieldProps) => {
  const [searchMode, setSearchMode] = useState<"dropdown" | "manual">(
    "dropdown",
  );

  const handleUserSelect = (selectedUser: UserOption) => {
    if (!selectedUser) return;
    const updates = {
      email: selectedUser.email || "",
      firstName: selectedUser.firstName || "",
      lastName: selectedUser.lastName || "",
      department: selectedUser.department || "",
      username: selectedUser.username || "",
    };
    Object.entries(updates).forEach(([field, val]) => {
      onChange(index, field as keyof TeamMember, val);
    });
  };

  const handleModeSwitch = (newMode: "dropdown" | "manual") => {
    if (newMode !== searchMode) {
      setSearchMode(newMode);
      if (newMode === "manual") {
        onChange(index, "firstName", "");
        onChange(index, "lastName", "");
        onChange(index, "department", "");
      }
    }
  };

  return (
    <View className="relative p-3 mb-2 border border-gray-200 rounded-lg bg-gray-50">
      <Pressable
        onPress={() => onRemove(index)}
        className="absolute p-2 rounded-full top-2 right-2 active:bg-red-100"
      >
        <X size={18} color="#EF4444" />
      </Pressable>
      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => handleModeSwitch("dropdown")}
          className={`px-4 py-2 rounded-lg ${searchMode === "dropdown" ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <Text
            className={`text-xs font-medium ${searchMode === "dropdown" ? "text-white" : "text-gray-700"}`}
          >
            Select User
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleModeSwitch("manual")}
          className={`px-4 py-2 rounded-lg ${searchMode === "manual" ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <Text
            className={`text-xs font-medium ${searchMode === "manual" ? "text-white" : "text-gray-700"}`}
          >
            Add Manually
          </Text>
        </Pressable>
      </View>
      <View className="gap-2">
        <View className={isDesktop ? "flex-row gap-2" : "flex-col"}>
          <View className={isDesktop ? "flex-1" : "w-full"}>
            <Text className="mb-1 text-sm font-medium text-gray-600">
              First Name
            </Text>
            <TextInput
              value={member.firstName || ""}
              onChangeText={(text) => onChange(index, "firstName", text)}
              placeholderTextColor="#9CA3AF"
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg shadow-sm"
              placeholder="First name"
            />
          </View>
          <View className={isDesktop ? "flex-1" : "w-full mt-2"}>
            <Text className="mb-1 text-sm font-medium text-gray-600">
              Last Name
            </Text>
            <TextInput
              value={member.lastName || ""}
              onChangeText={(text) => onChange(index, "lastName", text)}
              placeholderTextColor="#9CA3AF"
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg shadow-sm"
              placeholder="Last name"
            />
          </View>
        </View>
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-600">
            Department
          </Text>
          <CustomSelect
            value={member.department || ""}
            onChange={(val) => onChange(index, "department", val)}
            options={departments.map((d) => ({
              value: d.name || String(d.id),
              label: d.name || String(d.id),
            }))}
            placeholder="Select Department"
          />
        </View>
        <View>
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-medium text-gray-600">
              Email / Username
            </Text>
            <Text className="ml-1 text-red-500">*</Text>
          </View>

          {searchMode === "dropdown" ? (
            <View className="gap-2">
              <UserDropdown
                value={member.email}
                onChange={handleUserSelect}
                options={userOptions}
                placeholder="Select user..."
                loading={loadingUsers}
                required
              />
              {member.email && (
                <View className="p-2 border border-green-200 rounded-lg bg-green-50">
                  <Text className="text-xs text-green-700">
                    <Text className="font-semibold">Selected:</Text>{" "}
                    {member.firstName} {member.lastName}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="gap-2">
              <View className={isDesktop ? "flex-row gap-2" : "flex-col"}>
                <TextInput
                  value={member.email || ""}
                  onChangeText={(text) => onChange(index, "email", text)}
                  placeholderTextColor="#9CA3AF"
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm shadow-sm bg-white ${error ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter email"
                  keyboardType="email-address"
                />
                <Pressable
                  onPress={() => onSearchUser(member.email, index)}
                  disabled={loadingSearch === index || !member.email?.trim()}
                  className={`justify-center px-4 rounded-lg ${isDesktop ? "" : "mt-2"} ${
                    loadingSearch === index || !member.email?.trim()
                      ? "bg-indigo-300"
                      : "bg-indigo-600 active:bg-indigo-700"
                  }`}
                >
                  {loadingSearch === index ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Search size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          )}
          {error && <Text className="mt-1 text-xs text-red-600">{error}</Text>}
        </View>
      </View>
    </View>
  );
};

const LayoutTabs = ({ activeLayout, setActiveLayout }: LayoutTabsProps) => (
  <View className="flex-row mt-2 mb-4 border-b border-gray-200">
    <Pressable
      onPress={() => setActiveLayout("basic")}
      className={`flex-1 items-center py-3 border-b-2 ${activeLayout === "basic" ? "border-indigo-600" : "border-transparent"}`}
    >
      <Text
        className={`text-sm font-medium ${activeLayout === "basic" ? "text-indigo-600" : "text-gray-500"}`}
      >
        Basic Info
      </Text>
    </Pressable>
    <Pressable
      onPress={() => setActiveLayout("team")}
      className={`flex-1 items-center py-3 border-b-2 ${activeLayout === "team" ? "border-indigo-600" : "border-transparent"}`}
    >
      <Text
        className={`text-sm font-medium ${activeLayout === "team" ? "text-indigo-600" : "text-gray-500"}`}
      >
        Team & Files
      </Text>
    </Pressable>
  </View>
);

const getValidMimeType = (file: any, fallback: string): string => {
  const possibleMimeTypes = [
    file?.mimeType,
    file?.mimetype,
    file?.contentType,
    file?.type,
  ];

  for (const mimeType of possibleMimeTypes) {
    if (typeof mimeType === "string" && mimeType.includes("/")) {
      return mimeType;
    }
  }

  const fileName = String(file?.name || file?.fileName || "").toLowerCase();

  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".gif")) {
    return "image/gif";
  }

  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }

  if (fileName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (fileName.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (fileName.endsWith(".mov")) {
    return "video/quicktime";
  }

  if (fileName.endsWith(".webm")) {
    return "video/webm";
  }

  return fallback;
};

const ensureFileExtension = (fileName: string, mimeType: string): string => {
  if (/\.[a-z0-9]{2,5}$/i.test(fileName)) {
    return fileName;
  }

  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };

  const extension = extensionMap[mimeType] || mimeType.split("/")[1] || "bin";

  return `${fileName}.${extension}`;
};

export default function D0PlanContain({
  eventId = null,
  updateParent,
  initialIsNcrBased = false,
}: D0PlanContainProps) {
  const { user, isInitiator, isHOD, isAdmin } = useAuth();
  const rawId = eventId == null ? "" : String(eventId).trim();
  const safeEventId =
    rawId && rawId !== "null" && rawId !== "undefined" ? rawId : null;

  const [savedEventId, setSavedEventId] = useState<string | null>(safeEventId);

  useEffect(() => {
    setSavedEventId(safeEventId);
  }, [safeEventId]);

  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  const normalizeDateForInput = (value: string | undefined) => {
    if (!value) return getTodayDate();
    if (typeof value === "string") {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return getTodayDate();
    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
  };

  const [formData, setFormData] = useState<FormDataState>({
    eventNo: safeEventId || "",
    plantLine: "",
    partName: "",
    lotSerial: "",
    defectCode: "",
    dateDiscovered: getTodayDate(),
    reportedBy: initialIsNcrBased ? "self" : "",
    personName: "",
    department: "",
    companyName: "",
    companyLogo: "",
    contactPerson: "",
    phone: "",
    countryCode: "+91",
    countryIsoCode: "IN",
    email: "",
    teamMembers: [],
    pictures: [],
    reports: [],
    videos: [],
    status: "draft",
    currentStep: "d0",
    isNcrBased: initialIsNcrBased,
    sourceType: initialIsNcrBased ? "ncr" : "fresh",
  });

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeLayout, setActiveLayout] = useState("basic");
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] =
    useState<Department[]>(defaultDepartments);
  const [loadingSearch, setLoadingSearch] = useState<number | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const isNcrBased8D = Boolean(
    initialIsNcrBased ||
    formData.isNcrBased ||
    formData.sourceType === "ncr" ||
    formData.sourceNcrId ||
    formData.sourceNcrNumber ||
    String(safeEventId || formData.eventNo || "").startsWith("8D-"),
  );

  // 🚨 Live validation: Fresh 8D Event No must contain BOTH letters & numbers
  const eventNoError = useMemo(() => {
    const val = (formData.eventNo || "").trim();
    if (!val) return ""; // Let the "Required" validation handle empty state

    const hasLetters = /[a-zA-Z]/.test(val);
    const hasNumbers = /\d/.test(val);

    // Force strict checking so you can see the error immediately
    if (!hasLetters) {
      return "Must contain at least one letter (e.g., EVT123)";
    }
    if (!hasNumbers) {
      return "Must contain at least one number (e.g., EVT123)";
    }

    return "";
  }, [formData.eventNo]); // Removed isNcrBased8D from dependencies to force it to check
  const API_URL_JSON = `${API_BASE_URL}/api/eightd/data`;

  const maxPhoneDigits = getStandardMobileLength(
    formData.countryIsoCode || "IN",
  );
  const phoneLengthLabel = `${maxPhoneDigits}-digit`;

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    setFormData((prev) => ({
      ...prev,
      phone: digits.slice(
        0,
        getStandardMobileLength(prev.countryIsoCode || "IN"),
      ),
    }));
  };

  const phoneError = useMemo(() => {
    const effectiveReportedBy = isNcrBased8D ? "self" : formData.reportedBy;
    if (effectiveReportedBy !== "self" && effectiveReportedBy !== "customer")
      return "";
    if (!formData.phone) return "";
    const expected = getStandardMobileLength(formData.countryIsoCode || "IN");
    if (formData.phone.length === expected) return "";
    return `Invalid number – ${formData.countryCode} requires exactly ${expected} digits (you entered ${formData.phone.length})`;
  }, [
    formData.phone,
    formData.countryIsoCode,
    formData.countryCode,
    formData.reportedBy,
    isNcrBased8D,
  ]);

  const countries = useMemo<Country[]>(() => {
    return (worldCountries as any[])
      .map((c) => ({
        name: c?.name?.common || "",
        iso2: (c?.cca2 || "").toUpperCase(),
        dialCode: c?.idd?.root
          ? `${c.idd.root}${c.idd?.suffixes?.[0] || ""}`
          : "",
        flagUrl:
          c?.flags?.png ||
          `https://flagcdn.com/w40/${(c?.cca2 || "").toLowerCase()}.png`,
      }))
      .filter((c) => c.name && c.iso2 && c.dialCode)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q),
    );
  }, [countries, countrySearch]);

  const userOptions = useMemo<UserOption[]>(() => {
    if (!allUsers || allUsers.length === 0) return [];
    return allUsers
      .filter((u): u is UserData => Boolean(u && (u.email || u.username)))
      .map((u) => ({
        value: u.email || u.username || "",
        label:
          `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
          u.username ||
          u.email ||
          "",
        email: u.email,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        department: u.department,
      }))
      .filter((opt) => opt.value && opt.label);
  }, [allUsers]);

  useEffect(() => {
    loadUsersAndDepartments();
  }, []);

  const loadUsersAndDepartments = async () => {
    try {
      setLoadingUsers(true);
      const users = await userAPI.getAllUsers();
      if (users && Array.isArray(users)) {
        setAllUsers(users);
        setUsersLoaded(true);
        setDepartments(extractDepartmentsFromUsers(users));
        setDepartmentsLoaded(true);
      } else {
        setAllUsers([]);
        setUsersLoaded(true);
        setDepartments(defaultDepartments);
        setDepartmentsLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load users", err);
      setUsersLoaded(true);
      setDepartmentsLoaded(true);
      setDepartments(defaultDepartments);
    } finally {
      setLoadingUsers(false);
    }
  };

  const extractDepartmentsFromUsers = (users: UserData[]): Department[] => {
    if (!users || users.length === 0) return defaultDepartments;
    const departmentSet = new Set<string>();
    const departmentsList: Department[] = [];
    users.forEach((u) => {
      if (
        u.department &&
        u.department.trim() &&
        !departmentSet.has(u.department)
      ) {
        departmentSet.add(u.department);
        departmentsList.push({
          id: departmentsList.length + 1,
          name: u.department,
        });
      }
    });
    if (departmentsList.length === 0) return defaultDepartments;
    if (!departmentSet.has("Other"))
      departmentsList.push({ id: departmentsList.length + 1, name: "Other" });
    return departmentsList;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!safeEventId) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL_JSON}/${safeEventId}`);
        if (res.data.success && res.data.data) {
          const backendData = res.data.data.content?.d0?.[0];
          if (backendData) {
            if (!usersLoaded || !departmentsLoaded) {
              await new Promise((resolve) => {
                const check = () => {
                  if (usersLoaded && departmentsLoaded) resolve(undefined);
                  else setTimeout(check, 100);
                };
                check();
              });
            }
            let teamMembers: TeamMember[] = [];
            if (backendData.additionalEmails) {
              if (Array.isArray(backendData.additionalEmails)) {
                teamMembers = await convertEmailsToTeamMembers(
                  backendData.additionalEmails as string[],
                );
              } else if (typeof backendData.additionalEmails === "string") {
                const emails = backendData.additionalEmails
                  .split(",")
                  .map((e: string) => e.trim())
                  .filter(
                    (e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
                  );
                teamMembers = await convertEmailsToTeamMembers(emails);
              }
            } else if (
              backendData.teamMembers &&
              Array.isArray(backendData.teamMembers)
            ) {
              teamMembers = backendData.teamMembers as TeamMember[];
            }

            const loadedIsNcrBased = Boolean(
              backendData.sourceNcrId ||
              backendData.sourceNcrNumber ||
              backendData.isNcrBased ||
              backendData.sourceType === "ncr" ||
              String(eventId || backendData.eventNo || "").startsWith("8D-"),
            );

            setFormData((prev) => ({
              ...prev,
              ...backendData,
              dateDiscovered: normalizeDateForInput(backendData.dateDiscovered),
              reportedBy: loadedIsNcrBased
                ? "self"
                : backendData.reportedBy || "",
              teamMembers,
              status: res.data.data.status || "draft",
              currentStep: res.data.data.currentStep || "d0",
              pictures: backendData.pictures || [],
              reports: backendData.reports || [],
              videos: backendData.videos || [],
              isNcrBased: loadedIsNcrBased,
              sourceType: loadedIsNcrBased
                ? "ncr"
                : backendData.sourceType || "fresh",
              countryCode: backendData.countryCode || "+91",
              countryIsoCode: backendData.countryIsoCode || "IN",
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching D0 data:", err);
        Alert.alert("Error", `Failed to load D0 data.`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [safeEventId, usersLoaded, departmentsLoaded]);

  useEffect(() => {
    if (formData.dateDiscovered) {
      const parts = formData.dateDiscovered.split("-");
      if (parts.length === 3) {
        setTempDate(
          new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
          ),
        );
      }
    }
  }, [formData.dateDiscovered]);

  // 🔄 RESET FORM: Wipes data clean when navigating to a new/fresh form
  useEffect(() => {
    // If there is NO eventId, it means we are creating a fresh form
    if (!safeEventId) {
      setFormData({
        eventNo: "",
        plantLine: "",
        partName: "",
        lotSerial: "",
        defectCode: "",
        dateDiscovered: getTodayDate(),
        reportedBy: initialIsNcrBased ? "self" : "",
        personName: "",
        department: "",
        companyName: "",
        companyLogo: "",
        contactPerson: "",
        phone: "",
        countryCode: "+91",
        countryIsoCode: "IN",
        email: "",
        teamMembers: [],
        pictures: [],
        reports: [],
        videos: [],
        status: "draft",
        currentStep: "d0",
        isNcrBased: initialIsNcrBased,
        sourceType: initialIsNcrBased ? "ncr" : "fresh",
      });

      // Clear any lingering red error messages from the previous form
      setErrors({});
    }
  }, [safeEventId, initialIsNcrBased]); // Triggers every time the eventId changes

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selectedDate) {
        const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        handleChange({
          target: { name: "dateDiscovered", value: formattedDate },
        });
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    const formattedDate = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, "0")}-${String(tempDate.getDate()).padStart(2, "0")}`;
    handleChange({ target: { name: "dateDiscovered", value: formattedDate } });
    setShowDatePicker(false);
  };

  const convertEmailsToTeamMembers = async (
    emails: string[],
  ): Promise<TeamMember[]> => {
    const teamMembers: TeamMember[] = [];
    for (const email of emails) {
      if (email && email.trim()) {
        const userData = findUserByEmailOrUsername(email.trim());
        teamMembers.push({
          firstName: userData?.firstName || "",
          lastName: userData?.lastName || "",
          department: userData?.department || "",
          email: email.trim(),
          username: userData?.username || "",
        });
      }
    }
    return teamMembers;
  };

  const findUserByEmailOrUsername = (
    searchTerm: string,
  ): UserData | undefined => {
    if (!searchTerm || !allUsers.length) return undefined;
    return allUsers.find(
      (u) =>
        u.email?.toLowerCase() === searchTerm.toLowerCase() ||
        u.username?.toLowerCase() === searchTerm.toLowerCase(),
    );
  };

  const handleTeamMemberChange = (
    index: number,
    field: keyof TeamMember,
    value: string,
  ) => {
    setFormData((prev) => {
      const newTeamMembers = [...prev.teamMembers];
      newTeamMembers[index] = { ...newTeamMembers[index], [field]: value };
      return { ...prev, teamMembers: newTeamMembers };
    });
    if (errors[`teamMember_${index}_${field}`]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[`teamMember_${index}_${field}`];
        return updated;
      });
    }
  };

  const addTeamMember = () => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        {
          firstName: "",
          lastName: "",
          department: "",
          email: "",
          username: "",
        },
      ],
    }));
  };

  const removeTeamMember = (index: number) => {
    const newTeamMembers = formData.teamMembers.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, teamMembers: newTeamMembers }));
    setErrors((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith(`teamMember_${index}_`)) delete updated[key];
      });
      return updated;
    });
  };

  const searchUserByEmail = async (searchTerm: string, index: number) => {
    if (!searchTerm || !searchTerm.trim()) {
      Alert.alert("Error", "Please enter an email.");
      return;
    }
    setLoadingSearch(index);
    try {
      const foundUser = findUserByEmailOrUsername(searchTerm.trim());
      if (foundUser) {
        const newTeamMembers = [...formData.teamMembers];
        newTeamMembers[index] = {
          ...newTeamMembers[index],
          firstName: foundUser.firstName || "",
          lastName: foundUser.lastName || "",
          department: foundUser.department || "",
          email: foundUser.email || searchTerm.trim(),
          username: foundUser.username || "",
        };
        setFormData((prev) => ({ ...prev, teamMembers: newTeamMembers }));
        setErrors((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            if (key.startsWith(`teamMember_${index}_`)) delete updated[key];
          });
          return updated;
        });
      } else {
        Alert.alert("Not Found", `No user found.`);
      }
    } catch (error) {
      Alert.alert("Error", "Error searching for user.");
    } finally {
      setLoadingSearch(null);
    }
  };

  const handleChange = (
    e:
      | { target: { name: string; value: string } }
      | { name: string; value: string },
  ) => {
    const target = "target" in e ? e.target : e;
    const { name, value } = target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "reportedBy" && isNcrBased8D ? "self" : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (
    type: "image" | "pdf" | "video" = "image",
  ) => {
    try {
      console.log(`🔵 [UPLOAD] Starting file pick for type: ${type}`);
      let result: any;

      if (type === "image") {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      } else if (type === "pdf") {
        result = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });
      } else if (type === "video") {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      }

      console.log(
        `🔵 [UPLOAD] Raw Picker Result:`,
        JSON.stringify(result, null, 2),
      );

      if (!result || result.canceled) {
        console.log(`🔴 [UPLOAD] Picker canceled or returned no result.`);
        return;
      }

      const assets: any[] = result.assets
        ? Array.isArray(result.assets)
          ? result.assets
          : [result.assets]
        : result.uri
          ? [result]
          : [];

      if (assets.length === 0) {
        console.log(`🔴 [UPLOAD] No assets found in picker result.`);
        Alert.alert("Info", "No file returned from picker.");
        return;
      }

      const fallbackMimeType =
        type === "image"
          ? "image/jpeg"
          : type === "pdf"
            ? "application/pdf"
            : "video/mp4";

      const newFiles: FileItem[] = assets
        .map((file: any, index: number) => {
          const mimeType = getValidMimeType(file, fallbackMimeType);
          const rawName =
            file.name ||
            file.fileName ||
            file.filename ||
            `file_${Date.now()}_${index}`;
          const fileName = ensureFileExtension(rawName, mimeType);

          return {
            id: `${Date.now()}_${index}`,
            name: fileName,
            type: mimeType,
            size: file.fileSize || file.size || 0,
            title: fileName,
            description: "",
            uri: file.uri,
            isLocalFile: true,
          };
        })
        .filter((file: FileItem) => Boolean(file.uri));

      console.log(
        `🟢 [UPLOAD] Successfully mapped ${newFiles.length} files to local state.`,
      );
      console.log(
        `🟢 [UPLOAD] File Details:`,
        newFiles.map((f) => ({
          name: f.name,
          uri: f.uri.substring(0, 40) + "...",
          type: f.type,
        })),
      );

      if (newFiles.length === 0) {
        Alert.alert("Error", "Selected file is missing a usable file URI.");
        return;
      }

      const key =
        type === "image" ? "pictures" : type === "pdf" ? "reports" : "videos";
      console.log(
        `🟢 [UPLOAD] Saving files to formData state under key: '${key}'`,
      );

      setFormData((prev) => ({
        ...prev,
        [key]: [...prev[key], ...newFiles],
      }));
    } catch (err) {
      console.error("🔴 [UPLOAD] File pick error:", err);
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const removeFile = (
    index: number,
    type: "image" | "pdf" | "video" = "image",
  ) => {
    const key =
      type === "image" ? "pictures" : type === "pdf" ? "reports" : "videos";
    setFormData((prev) => {
      const updatedFiles = [...prev[key]];
      updatedFiles.splice(index, 1);
      return { ...prev, [key]: updatedFiles };
    });
  };

  const handleApprove = async () => {
    if (!safeEventId) return;
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/eightd/approve/${safeEventId}`,
        { userEmail: user?.email },
      );
      if (res.data.success) {
        const updatedFormData = {
          ...formData,
          status: "in progress",
          currentStep: "d1",
        };
        setFormData(updatedFormData);
        if (updateParent) updateParent([updatedFormData]);
        Alert.alert("Success", "✅ Approved!");
      }
    } catch (err: any) {
      Alert.alert("Error", "Approval failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!safeEventId) return;
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/eightd/reject/${safeEventId}`,
        { userEmail: user?.email },
      );
      if (res.data.success) {
        const updated = { ...formData, status: "rejected", currentStep: "d0" };
        setFormData(updated);
        Alert.alert("Rejected", "❌ Rejected");
        if (updateParent) updateParent([updated]);
      }
    } catch (err: any) {
      Alert.alert("Error", "Rejection failed");
    } finally {
      setLoading(false);
    }
  };

  const validateTeamMembers = () => {
    const newErrors: Record<string, string> = { ...errors };
    let isValid = true;
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith("teamMember_")) delete newErrors[key];
    });
    formData.teamMembers.forEach((member, idx) => {
      const { email, firstName, lastName } = member;
      if (!email || !email.trim()) {
        newErrors[`teamMember_${idx}_email`] = "Email is required";
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors[`teamMember_${idx}_email`] = "Invalid email";
        isValid = false;
      }
      if (email && (!firstName.trim() || !lastName.trim())) {
        newErrors[`teamMember_${idx}_email`] = "Name required";
        isValid = false;
      }
    });
    setErrors(newErrors);
    return isValid;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    ["eventNo", "plantLine", "partName", "defectCode"].forEach((field) => {
      if (!formData[field as keyof FormDataState]?.toString().trim())
        newErrors[field] = "Required";
    });

    // 🚨 Block submission if Fresh 8D Event No isn't perfectly alphanumeric
    if (!isNcrBased8D && formData.eventNo) {
      const val = formData.eventNo.trim();
      const hasLetters = /[a-zA-Z]/.test(val);
      const hasNumbers = /\d/.test(val);
      const isStrictlyAlphanumeric = /^[a-zA-Z0-9]+$/.test(val);

      if (!isStrictlyAlphanumeric) {
        newErrors.eventNo = "Special characters and spaces are not allowed";
      } else if (!hasLetters) {
        newErrors.eventNo = "Must contain at least one letter (e.g., EVT123)";
      } else if (!hasNumbers) {
        newErrors.eventNo = "Must contain at least one number (e.g., EVT123)";
      }
    }

    if (formData.pictures.length === 0) newErrors.pictures = "Picture required";
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    )
      newErrors.email = "Invalid email";

    const effectiveReportedBy = isNcrBased8D ? "self" : formData.reportedBy;
    // ... keep the rest of the function exactly the same
    if (effectiveReportedBy === "self" || effectiveReportedBy === "customer") {
      const expected = getStandardMobileLength(formData.countryIsoCode || "IN");
      if (formData.phone && formData.phone.length !== expected) {
        newErrors.phone = `Phone number must be exactly ${expected} digits for ${formData.countryCode}`;
      }
    }

    if (!validateTeamMembers()) Object.assign(newErrors, errors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isInitiator && !isAdmin) {
      Alert.alert("Unauthorized", "Only initiators can submit.");
      return;
    }
    if (!validateForm()) {
      Alert.alert("Error", "Fix errors first.");
      return;
    }
    setSubmitted(true);
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      const teamEmails = formData.teamMembers
        .map((m) => m.email?.trim())
        .filter((e): e is string =>
          Boolean(e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
        );

      const activeEventId = savedEventId || safeEventId;
      const isUpdating = Boolean(activeEventId);
      const submittedStatus =
        formData.status === "in progress" ? "in progress" : "approval pending";

      const jsonPayload = {
        // ... (Keep your existing jsonPayload object exactly as is) ...
        eventNo: formData.eventNo || "",
        plantLine: formData.plantLine,
        partName: formData.partName,
        lotSerial: formData.lotSerial,
        defectCode: formData.defectCode,
        dateDiscovered: formData.dateDiscovered,
        reportedBy: isNcrBased8D ? "self" : formData.reportedBy,
        personName: formData.personName,
        department: formData.department,
        companyName: formData.companyName,
        companyLogo: formData.companyLogo,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
        countryCode: formData.countryCode,
        countryIsoCode: formData.countryIsoCode,
        status: submittedStatus,
        currentStep: "d0",
        isNcrBased: isNcrBased8D,
        sourceType: isNcrBased8D ? "ncr" : "fresh",
        submittedBy: user?.email,
        submittedAt: new Date().toISOString(),
        entry_type: "8D_D0_FORM",
        additionalEmails: teamEmails,
        content: {
          d0: [
            {
              eventNo: formData.eventNo,
              plantLine: formData.plantLine,
              partName: formData.partName,
              lotSerial: formData.lotSerial,
              defectCode: formData.defectCode,
              dateDiscovered: formData.dateDiscovered,
              reportedBy: isNcrBased8D ? "self" : formData.reportedBy,
              personName: formData.personName,
              department: formData.department,
              companyName: formData.companyName,
              companyLogo: formData.companyLogo,
              contactPerson: formData.contactPerson,
              phone: formData.phone,
              email: formData.email,
              countryCode: formData.countryCode,
              countryIsoCode: formData.countryIsoCode,
              isNcrBased: isNcrBased8D,
              sourceType: isNcrBased8D ? "ncr" : "fresh",
              teamMembers: formData.teamMembers,
              additionalEmails: teamEmails,
            },
          ],
        },
      };

      formDataToSend.append("jsonContent", JSON.stringify(jsonPayload));
      console.log(`📦 [SUBMIT] JSON Payload appended successfully.`);

      // Map files to their specific categories
      const allLocalFiles = [
        ...formData.pictures.map((f) => ({ ...f, category: "pictures" })),
        ...formData.reports.map((f) => ({ ...f, category: "reports" })),
        ...formData.videos.map((f) => ({ ...f, category: "videos" })),
      ].filter((f) => f.isLocalFile && Boolean(f.uri));

      console.log(
        `📦 [SUBMIT] Total local files found in state: ${allLocalFiles.length}`,
      );
      console.log(
        `📦 [SUBMIT] Breakdown -> Pictures: ${formData.pictures.filter((f) => f.isLocalFile).length}, Reports: ${formData.reports.filter((f) => f.isLocalFile).length}, Videos: ${formData.videos.filter((f) => f.isLocalFile).length}`,
      );

      // 🚨 CRITICAL FIX FOR EXPO WEB: Convert blob: URIs to actual File objects
      // We MUST use a for...of loop instead of forEach to allow 'await'
      for (const [index, fileObj] of allLocalFiles.entries()) {
        const mimeType = getValidMimeType(fileObj, "application/octet-stream");
        const fileName = ensureFileExtension(
          fileObj.name || `file_${Date.now()}_${index}`,
          mimeType,
        );

        let filePayload: any;

        // 🌐 WEB SPECIFIC FIX (Expo Web returns "blob:http..." URIs)
        if (Platform.OS === "web" && fileObj.uri.startsWith("blob:")) {
          console.log(
            `🌐 [WEB] Converting blob URI to File object for: ${fileName}`,
          );
          try {
            // Fetch the temporary blob from browser memory
            const response = await fetch(fileObj.uri);
            const blob = await response.blob();
            // Create a native browser File object from the blob
            filePayload = new File([blob], fileName, { type: mimeType });
          } catch (err) {
            console.error(`🔴 [WEB] Failed to read blob for ${fileName}`, err);
            continue; // Skip this file if it fails to load
          }
        }
        // 📱 NATIVE (iOS/Android) HANDLING
        else {
          let fileUri = fileObj.uri;
          if (
            Platform.OS === "android" &&
            !fileUri.startsWith("content://") &&
            !fileUri.startsWith("file://")
          ) {
            fileUri = `file://${fileUri}`;
          }
          filePayload = { uri: fileUri, name: fileName, type: mimeType };
        }

        console.log(
          `📎 [SUBMIT] Appending File ${index + 1} -> Key: '${fileObj.category}', Name: ${fileName}, MIME: ${mimeType}`,
        );

        // Append to FormData.
        // On Web: filePayload is a real File object.
        // On Native: filePayload is the {uri, name, type} object.
        formDataToSend.append(fileObj.category, filePayload as any);
      }
      const url = isUpdating ? `${API_URL_JSON}/${safeEventId}` : API_URL_JSON;
      const method = isUpdating ? "PUT" : "POST";

      console.log(`🚀 [SUBMIT] Sending ${method} request to URL: ${url}`);
      // Note: console.log(formDataToSend) usually prints empty in React Native. This is normal!

      const response = await fetch(url, {
        method: method,
        body: formDataToSend,
        headers: { Accept: "application/json" },
      });

      console.log(`📥 [SUBMIT] Response Status Code: ${response.status}`);
      const resData = await response.json();
      console.log(
        "📥 [SUBMIT] Full Backend Response:",
        JSON.stringify(resData, null, 2),
      );

      if (resData?.success) {
        // ... (Keep your existing success logic exactly as is) ...
        const returnedEventId =
          resData?.data?.id || activeEventId || formData.eventNo;
        setSavedEventId(String(returnedEventId));
        Alert.alert("Success", "✅ Submitted!");

        const primaryEmail = formData.email?.trim();
        const additionalEmails = formData.teamMembers
          .map((m) => m.email?.trim())
          .filter((e): e is string =>
            Boolean(e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
          );
        const allMembers = [
          ...new Set([primaryEmail, ...additionalEmails].filter(Boolean)),
        ];

        if (
          allMembers.length > 0 &&
          (user?.role === "MASTER" ||
            user?.role === "ADMIN" ||
            user?.role === "INITIATOR")
        ) {
          try {
            await fetch(`${API_BASE_URL}/api/forum/8d/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId: formData.eventNo,
                groupName: `8D: ${formData.eventNo}`,
                description: `Defect: ${formData.defectCode}`,
                createdBy: user?.email,
                members: allMembers,
              }),
            });
          } catch (e) {}
        }

        const newStatus = "approval pending";
        setFormData((prev) => ({
          ...prev,
          status: newStatus,
          currentStep: "d0",
        }));
        if (updateParent)
          updateParent([
            {
              ...formData,
              id: returnedEventId,
              status: newStatus,
              currentStep: "d0",
            },
          ]);
      } else {
        throw new Error(resData?.error || "Unexpected response");
      }
    } catch (err: any) {
      console.error("🔴 [SUBMIT] Catch Block Error:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || err.message || "Failed to save",
      );
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };
  if (loading && !submitted) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 w-full bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 w-full"
      >
        <ScrollView
          className="flex-1 w-full px-3 py-2"
          contentContainerStyle={{
            flexGrow: 1, // 👈 keeps content container full height (required for stretch)
            paddingBottom: 16, // 👈 reduced from 50 → removes dead space at bottom
            width: "100%",
            maxWidth: 1400,
            alignSelf: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="w-full bg-[#2242a1]/90 p-3 rounded-t-xl border-t-[8px] border-[#ee161f] shadow-md">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Users size={20} color="#FFFFFF" />
                  <Text className="text-lg font-semibold text-white">
                    D0 – Plan & Contain
                  </Text>
                </View>
                {safeEventId && (
                  <View className="self-start px-2 py-0.5 rounded-full bg-white/20 mt-1">
                    <Text className="text-xs text-white">{safeEventId}</Text>
                  </View>
                )}
                {formData.status !== "draft" && (
                  <View
                    className={`self-start px-2 py-0.5 rounded-full mt-2 ${
                      formData.status === "approval pending"
                        ? "bg-yellow-200"
                        : formData.status === "in progress"
                          ? "bg-green-200"
                          : "bg-red-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        formData.status === "approval pending"
                          ? "text-yellow-800"
                          : formData.status === "in progress"
                            ? "text-green-800"
                            : "text-red-800"
                      }`}
                    >
                      {formData.status}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => setIsPreviewOpen(true)}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 active:bg-white/20"
              >
                <Eye size={14} color="#FFFFFF" />
                <Text className="text-xs font-medium text-white">Preview</Text>
              </Pressable>
            </View>
          </View>

          <LayoutTabs
            activeLayout={activeLayout}
            setActiveLayout={setActiveLayout}
          />

          {/* Form Content */}
          {/* Form Content */}
          <View
            className="w-full p-3 bg-white border border-gray-100 shadow-lg rounded-b-xl"
            style={{ flexGrow: 1 }} // 👈 card absorbs ALL leftover vertical space
          >
            {activeLayout === "basic" ? (
              <View
                className={isDesktop ? "w-full flex-row gap-4" : "w-full gap-1"}
                style={{ flexGrow: 1 }} // 👈 fields area grows, pushing Next/Submit to card bottom
              >
                {/* Left Column on Desktop */}
                <View className={isDesktop ? "flex-1" : "w-full"}>
                  {/* Event No */}
                  <View style={{ marginBottom: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <Hash size={16} color="#4F46E5" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#1F2937",
                        }}
                      >
                        Event No.
                      </Text>
                      <Tooltip content="Must contain letters + numbers (e.g. EVT123)">
                        <Info size={12} color="#9CA3AF" />
                      </Tooltip>
                      <Text style={{ color: "#EF4444" }}>*</Text>
                    </View>

                    <TextInput
                      value={formData.eventNo || ""}
                      onChangeText={(text) => {
                        // Physically block special characters/spaces
                        const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, "");
                        handleChange({
                          target: { name: "eventNo", value: sanitizedText },
                        });
                      }}
                      placeholderTextColor="#9CA3AF"
                      placeholder="Enter Event No (e.g. EVT123)"
                      style={{
                        width: "100%",
                        borderWidth: 1,
                        // 🔴 INLINE STYLES GUARANTEE THE RED BOX SHOWS UP
                        borderColor:
                          errors.eventNo || eventNoError
                            ? "#EF4444"
                            : "#D1D5DB",
                        backgroundColor:
                          errors.eventNo || eventNoError
                            ? "#FEF2F2"
                            : "#FFFFFF",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: "#111827",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    />

                    {(errors.eventNo || eventNoError) && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={14} color="#DC2626" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#DC2626",
                          }}
                        >
                          {errors.eventNo || eventNoError}
                        </Text>
                      </View>
                    )}
                  </View>

                  <CustomSelect
                    label="Plant / Line"
                    value={formData.plantLine}
                    onChange={(val) =>
                      handleChange({
                        target: { name: "plantLine", value: val },
                      })
                    }
                    options={[
                      {
                        value: "Pune Plant – Threading Line 1",
                        label: "Pune Plant – Threading Line 1",
                      },
                      {
                        value: "Pune Plant – Threading Line 2",
                        label: "Pune Plant – Threading Line 2",
                      },
                    ]}
                    placeholder="Select Plant Line"
                    required
                    error={errors.plantLine}
                  />

                  <InputField
                    label="Part No. / Name"
                    name="partName"
                    value={formData.partName}
                    onChange={handleChange}
                    required
                    error={errors.partName}
                  />
                  <InputField
                    label="Lot / Serial(s)"
                    name="lotSerial"
                    value={formData.lotSerial}
                    onChange={handleChange}
                    multiline
                  />

                  <View>
                    <View className="flex-row items-center gap-1 mb-1">
                      <AlertCircle size={16} color="#EF4444" />
                      <Text className="text-sm font-semibold text-gray-800">
                        Defect Code
                      </Text>
                      <Text className="text-red-500">*</Text>
                    </View>
                    <TextInput
                      value={formData.defectCode}
                      onChangeText={(text) =>
                        handleChange({
                          target: { name: "defectCode", value: text },
                        })
                      }
                      placeholderTextColor="#9CA3AF"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm bg-white ${errors.defectCode ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Enter Defect Code"
                    />
                    {errors.defectCode && (
                      <Text className="mt-1 text-xs text-red-600">
                        {errors.defectCode}
                      </Text>
                    )}
                  </View>

                  <View>
                    <View className="flex-row items-center gap-1 mt-3 mb-1">
                      <CalendarDays size={16} color="#4F46E5" />
                      <Text className="text-sm font-semibold text-gray-800">
                        Date Discovered
                      </Text>
                    </View>

                    {Platform.OS === "web" ? (
                      <View className="w-full flex-row items-center px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm">
                        <View pointerEvents="none" className="mr-2">
                          <CalendarDays size={18} color="#6B7280" />
                        </View>
                        {/* @ts-ignore */}
                        <input
                          type="date"
                          value={formData.dateDiscovered}
                          onChange={(e: any) =>
                            handleChange({
                              target: {
                                name: "dateDiscovered",
                                value: e.target.value,
                              },
                            })
                          }
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            backgroundColor: "transparent",
                            color: formData.dateDiscovered
                              ? "#111827"
                              : "#9CA3AF",
                            fontSize: 14,
                            padding: 0,
                            margin: 0,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        />
                      </View>
                    ) : (
                      <Pressable
                        onPress={showDatepicker}
                        className="w-full flex-row items-center justify-between px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm active:bg-gray-50"
                      >
                        <Text
                          className={`text-sm ${formData.dateDiscovered ? "text-gray-900" : "text-gray-400"}`}
                        >
                          {formData.dateDiscovered || "Select Date"}
                        </Text>
                        <CalendarDays size={18} color="#6B7280" />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Right Column on Desktop */}
                <View className={isDesktop ? "flex-1 min-w-0" : "w-full mt-2"}>
                  {/* Reported By Section */}
                  <View
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                    style={{ flexGrow: 1 }} // 👈 right box matches left column height
                  >
                    <View className="flex-row items-center gap-1 mb-2">
                      <User size={16} color="#4F46E5" />
                      <Text className="text-sm font-semibold text-gray-800">
                        Reported By
                      </Text>
                      <Text className="text-red-500">*</Text>
                    </View>

                    <CustomSelect
                      value={isNcrBased8D ? "self" : formData.reportedBy}
                      onChange={(val) =>
                        handleChange({
                          target: { name: "reportedBy", value: val },
                        })
                      }
                      options={
                        isNcrBased8D
                          ? [{ value: "self", label: "Self Inspection" }]
                          : [
                              { value: "", label: "-- Select Source --" },
                              {
                                value: "customer",
                                label: "Customer Complaint",
                              },
                              { value: "self", label: "Self Inspection" },
                            ]
                      }
                      placeholder="Select Source"
                      required
                    />

                    {(isNcrBased8D || formData.reportedBy === "self") && (
                      <View className="gap-1 mt-2">
                        <InputField
                          label="Person Name"
                          name="personName"
                          value={formData.personName}
                          onChange={handleChange}
                        />

                        <CustomSelect
                          label="Department"
                          value={formData.department}
                          onChange={(val) =>
                            handleChange({
                              target: { name: "department", value: val },
                            })
                          }
                          options={departments.map((d) => ({
                            value: d.name || String(d.id),
                            label: d.name || String(d.id),
                          }))}
                          placeholder="Select Department"
                        />
                      </View>
                    )}

                    {(isNcrBased8D ? "self" : formData.reportedBy) ===
                      "customer" &&
                      !isNcrBased8D && (
                        <View className="gap-1 mt-2">
                          <Text className="mb-1 text-sm font-medium text-gray-600">
                            Company
                          </Text>
                          <View className="flex-row items-center gap-2 p-2 bg-white border border-gray-300 rounded-lg shadow-sm">
                            {formData.companyLogo && (
                              <Image
                                source={{ uri: formData.companyLogo }}
                                className="w-10 h-10 border border-gray-200 rounded"
                                resizeMode="contain"
                              />
                            )}
                            <View className="flex-1">
                              <CustomSelect
                                value={formData.companyName}
                                onChange={(val) => {
                                  const selected = companies.find(
                                    (c) => c.name === val,
                                  );
                                  setFormData((prev) => ({
                                    ...prev,
                                    companyName: val,
                                    companyLogo: selected?.logo || "",
                                  }));
                                }}
                                options={companies.map((c) => ({
                                  value: c.name,
                                  label: c.name,
                                }))}
                                placeholder="Select Company"
                              />
                            </View>
                          </View>
                          <InputField
                            label="Contact Person"
                            name="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                          />
                        </View>
                      )}

                    {(isNcrBased8D ||
                      formData.reportedBy === "self" ||
                      formData.reportedBy === "customer") && (
                      <View className="gap-1 pt-2 mt-2 border-t border-slate-300">
                        <Text className="mb-1 text-sm font-medium text-gray-600">
                          Phone Number
                        </Text>
                        <View className="flex-row items-stretch overflow-hidden bg-white border border-gray-300 rounded-lg shadow-sm">
                          <Pressable
                            onPress={() => setShowCountryPicker(true)}
                            className="flex-row items-center justify-center px-2 border-r border-gray-300 bg-gray-50 shrink-0"
                            style={{ minWidth: 92 }}
                          >
                            <Image
                              source={{
                                uri: `https://flagcdn.com/w40/${(formData.countryIsoCode || "IN").toLowerCase()}.png`,
                              }}
                              style={{ width: 24, height: 16, borderRadius: 3 }}
                              resizeMode="cover"
                            />
                            <Text
                              className="ml-1 text-sm font-bold text-gray-800"
                              numberOfLines={1}
                            >
                              {formData.countryCode || "+91"}
                            </Text>
                            <ChevronDown
                              size={14}
                              color="#6B7280"
                              className="ml-1"
                            />
                          </Pressable>

                          <TextInput
                            value={formData.phone}
                            onChangeText={handlePhoneChange}
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 px-3 py-2.5 text-sm text-gray-900"
                            placeholder={`Enter ${phoneLengthLabel} number`}
                            keyboardType="phone-pad"
                            maxLength={maxPhoneDigits}
                          />
                        </View>
                        {(phoneError || errors.phone) && (
                          <Text className="mt-1 text-xs text-red-600">
                            {phoneError || errors.phone}
                          </Text>
                        )}

                        <InputField
                          label="Primary Email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          type="email"
                          error={errors.email}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View className="w-full gap-4" style={{ flexGrow: 1 }}>
                {/* Team Members Section */}
                <View
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                  style={{ flexGrow: 1 }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <Users size={16} color="#4B5563" />
                      <Text className="text-sm font-medium text-gray-600">
                        Team Members
                      </Text>
                    </View>
                    <Pressable
                      onPress={addTeamMember}
                      className="flex-row items-center gap-1 px-3 py-1.5 bg-indigo-600 rounded-lg active:bg-indigo-700"
                    >
                      <Plus size={12} color="#FFFFFF" />
                      <Text className="text-xs font-medium text-white">
                        Add
                      </Text>
                    </Pressable>
                  </View>

                  {loadingUsers ? (
                    <View className="items-center py-6">
                      <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                  ) : (
                    <View
                      className={
                        isDesktop ? "flex-row flex-wrap gap-3" : "gap-2"
                      }
                    >
                      {formData.teamMembers.map((member, index) => (
                        <View
                          key={index}
                          className={isDesktop ? "w-[calc(50%-6px)]" : "w-full"}
                        >
                          <TeamMemberField
                            member={member}
                            index={index}
                            onChange={handleTeamMemberChange}
                            onRemove={removeTeamMember}
                            error={errors[`teamMember_${index}_email`]}
                            onSearchUser={searchUserByEmail}
                            loadingSearch={loadingSearch}
                            departments={departments}
                            userOptions={userOptions}
                            loadingUsers={loadingUsers}
                          />
                        </View>
                      ))}
                      {formData.teamMembers.length === 0 && (
                        <Pressable
                          onPress={addTeamMember}
                          className={`items-center py-6 border-2 border-gray-300 border-dashed rounded-lg active:bg-gray-50 ${isDesktop ? "w-full" : ""}`}
                        >
                          <Users size={24} color="#9CA3AF" />
                          <Text className="mt-2 text-xs text-gray-500">
                            No team members added yet
                          </Text>
                          <Text className="mt-1 text-xs font-medium text-indigo-600">
                            Tap to add
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                {/* Files Section - Two column on desktop */}
                <View className={isDesktop ? "flex-row gap-4" : "gap-4"}>
                  {/* Pictures */}
                  <View className={isDesktop ? "flex-1" : "w-full"}>
                    <View className="flex-row items-center mb-2">
                      <Text className="text-sm font-medium text-gray-600">
                        Pictures
                      </Text>
                      <Text className="ml-1 text-red-500">*</Text>
                    </View>
                    <Pressable
                      onPress={() => handleFileUpload("image")}
                      className="flex-row items-center justify-center gap-2 py-2.5 border-2 border-gray-300 border-dashed rounded-lg active:bg-gray-50"
                    >
                      <Plus size={16} color="#4B5563" />
                      <Text className="text-sm text-gray-600">
                        Add Pictures
                      </Text>
                    </Pressable>
                    {errors.pictures && (
                      <Text className="mt-1 text-xs text-red-600">
                        {errors.pictures}
                      </Text>
                    )}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mt-2"
                    >
                      {formData.pictures.map((pic, idx) => (
                        <View
                          key={`pic-${pic.id || idx}`}
                          className="w-32 p-2 mr-2 bg-white border border-gray-200 rounded-lg"
                        >
                          <Image
                            source={{
                              uri:
                                pic.uri ||
                                "https://via.placeholder.com/112?text=Img",
                            }}
                            className="w-full h-24 mb-2 rounded"
                            resizeMode="cover"
                          />
                          <TextInput
                            placeholder="Title"
                            placeholderTextColor="#9CA3AF"
                            value={pic.title}
                            onChangeText={(text) => {
                              const newPics = [...formData.pictures];
                              newPics[idx].title = text;
                              setFormData((prev) => ({
                                ...prev,
                                pictures: newPics,
                              }));
                            }}
                            className="w-full px-2 py-1.5 mb-1 text-xs bg-white border border-gray-300 rounded"
                          />
                          <Pressable
                            onPress={() => removeFile(idx, "image")}
                            className="absolute p-1 bg-red-500 rounded-full top-1 right-1 active:bg-red-700"
                          >
                            <X size={12} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Reports */}
                  <View className={isDesktop ? "flex-1" : "w-full"}>
                    <Text className="mb-2 text-sm font-medium text-gray-600">
                      Reports (PDFs)
                    </Text>
                    <Pressable
                      onPress={() => handleFileUpload("pdf")}
                      className="flex-row items-center justify-center gap-2 py-2.5 border-2 border-gray-300 border-dashed rounded-lg active:bg-gray-50"
                    >
                      <Plus size={16} color="#4B5563" />
                      <Text className="text-sm text-gray-600">Add PDFs</Text>
                    </Pressable>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mt-2"
                    >
                      {formData.reports.map((rep, idx) => (
                        <View
                          key={`rep-${rep.id || idx}`}
                          className="items-center w-32 p-2 mr-2 bg-white border border-gray-200 rounded-lg"
                        >
                          <View className="items-center justify-center w-full h-24 mb-2 bg-indigo-100 border border-indigo-300 rounded">
                            <FileText size={24} color="#3730A3" />
                            <Text
                              className="w-full px-1 mt-1 text-xs text-center text-indigo-800"
                              numberOfLines={2}
                            >
                              {rep.title || `Report ${idx + 1}`}
                            </Text>
                          </View>
                          <TextInput
                            placeholder="Title"
                            placeholderTextColor="#9CA3AF"
                            value={rep.title}
                            onChangeText={(text) => {
                              const newReports = [...formData.reports];
                              newReports[idx].title = text;
                              setFormData((prev) => ({
                                ...prev,
                                reports: newReports,
                              }));
                            }}
                            className="w-full px-2 py-1.5 mb-1 text-xs bg-white border border-gray-300 rounded"
                          />
                          <Pressable
                            onPress={() => removeFile(idx, "pdf")}
                            className="absolute p-1 bg-red-500 rounded-full top-1 right-1 active:bg-red-700"
                          >
                            <X size={12} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Videos - Full width */}
                <View>
                  <Text className="mb-2 text-sm font-medium text-gray-600">
                    Videos
                  </Text>
                  <Pressable
                    onPress={() => handleFileUpload("video")}
                    className="flex-row items-center justify-center gap-2 py-2.5 border-2 border-gray-300 border-dashed rounded-lg active:bg-gray-50"
                  >
                    <Plus size={16} color="#4B5563" />
                    <Text className="text-sm text-gray-600">Add Videos</Text>
                  </Pressable>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-2"
                  >
                    {formData.videos.map((vid, idx) => (
                      <View
                        key={`vid-${vid.id || idx}`}
                        className="items-center w-32 p-2 mr-2 bg-white border border-gray-200 rounded-lg"
                      >
                        <View className="items-center justify-center w-full h-24 mb-2 bg-green-100 border border-green-300 rounded">
                          <Video size={24} color="#166534" />
                          <Text
                            className="w-full px-1 mt-1 text-xs text-center text-green-800"
                            numberOfLines={2}
                          >
                            {vid.title || `Video ${idx + 1}`}
                          </Text>
                        </View>
                        <TextInput
                          placeholder="Title"
                          placeholderTextColor="#9CA3AF"
                          value={vid.title}
                          onChangeText={(text) => {
                            const newVideos = [...formData.videos];
                            newVideos[idx].title = text;
                            setFormData((prev) => ({
                              ...prev,
                              videos: newVideos,
                            }));
                          }}
                          className="w-full px-2 py-1.5 mb-1 text-xs bg-white border border-gray-300 rounded"
                        />
                        <Pressable
                          onPress={() => removeFile(idx, "video")}
                          className="absolute p-1 bg-red-500 rounded-full top-1 right-1 active:bg-red-700"
                        >
                          <X size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
            {/* Action Buttons */}
            <View className="flex-row items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <View>
                {activeLayout === "team" && (
                  <Pressable
                    onPress={() => setActiveLayout("basic")}
                    className="flex-row items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg active:bg-gray-50"
                  >
                    <ChevronLeft size={16} color="#4B5563" />
                    <Text className="text-sm font-medium text-gray-600">
                      Back
                    </Text>
                  </Pressable>
                )}
              </View>

              <View className="flex-row gap-2">
                {activeLayout === "basic" && (
                  <Pressable
                    onPress={() => setActiveLayout("team")}
                    className="flex-row items-center gap-1 px-4 py-2 bg-indigo-600 rounded-lg active:bg-indigo-700"
                  >
                    <Text className="text-sm font-medium text-white">Next</Text>
                    <ChevronRight size={16} color="#FFFFFF" />
                  </Pressable>
                )}

                {(activeLayout === "team" ||
                  formData.teamMembers.length === 0) && (
                  <>
                    {formData.status === "draft" && (isInitiator || isAdmin) ? (
                      <Pressable
                        onPress={handleSubmit}
                        disabled={submitted || loading}
                        className={`px-4 py-2 rounded-lg ${submitted || loading ? "bg-green-600" : "bg-cyan-600 active:bg-cyan-700"}`}
                      >
                        <View className="flex-row items-center gap-2">
                          {loading && (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          )}
                          <Text className="text-sm font-medium text-white">
                            {loading
                              ? "Submitting..."
                              : submitted
                                ? "Submitted ✅"
                                : "Submit"}
                          </Text>
                        </View>
                      </Pressable>
                    ) : formData.status === "approval pending" &&
                      (isHOD || isAdmin) ? (
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={handleApprove}
                          disabled={loading}
                          className="flex-row items-center gap-1 px-3 py-2 bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-70"
                        >
                          <CheckCircle size={16} color="#FFFFFF" />
                          <Text className="text-sm font-medium text-white">
                            Approve
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleReject}
                          disabled={loading}
                          className="flex-row items-center gap-1 px-3 py-2 bg-red-600 rounded-lg active:bg-red-700 disabled:opacity-70"
                        >
                          <XCircle size={16} color="#FFFFFF" />
                          <Text className="text-sm font-medium text-white">
                            Reject
                          </Text>
                        </Pressable>
                      </View>
                    ) : formData.status === "in progress" ? (
                      <View className="flex-row items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
                        <CheckCircle size={16} color="#166534" />
                        <Text className="text-xs font-medium text-green-800">
                          ✓ Approved & Locked
                        </Text>
                      </View>
                    ) : formData.status === "rejected" ? (
                      <View className="flex-row items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                        <XCircle size={16} color="#991B1B" />
                        <Text className="text-xs font-medium text-red-800">
                          ✗ Rejected
                        </Text>
                      </View>
                    ) : formData.status === "approval pending" &&
                      !isHOD &&
                      !isAdmin ? (
                      <View className="flex-row items-center gap-2 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg">
                        <ActivityIndicator size="small" color="#854D0E" />
                        <Text className="text-xs font-medium text-yellow-800">
                          ⏳ Awaiting for HOD Approval
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-xs italic text-gray-500">
                        {formData.status === "draft" && !isInitiator && !isAdmin
                          ? "Initiators only"
                          : `Status: ${formData.status}`}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Preview Drawer Modal (Right Side) */}
      <Modal
        visible={isPreviewOpen}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View className="flex-1 flex-row bg-black/50">
          {/* Left Backdrop (closes the drawer when tapped) */}
          <Pressable
            className="flex-1 h-full"
            onPress={() => setIsPreviewOpen(false)}
          />

          {/* Right Drawer */}
          <SafeAreaView
            className="h-full bg-white"
            style={{
              width: isDesktop ? 450 : SCREEN_WIDTH * 0.85,
              maxWidth: 500,
              shadowColor: "#000",
              shadowOffset: { width: -3, height: 0 }, // Shadow casting to the left
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 15,
            }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 bg-white">
              <Text className="text-lg font-semibold text-gray-800">
                Preview
              </Text>
              <Pressable
                onPress={() => setIsPreviewOpen(false)}
                className="p-2 rounded-full bg-gray-100 active:bg-gray-200"
              >
                <X size={20} color="#4B5563" />
              </Pressable>
            </View>

            {/* Scrollable Area */}
            <ScrollView
              className="flex-1 bg-gray-50"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <FinalPreview
                eventId={savedEventId || safeEventId || formData.eventNo}
                onClose={() => setIsPreviewOpen(false)}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="items-center justify-center flex-1 bg-black/40"
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => setShowCountryPicker(false)}
          />

          <View
            className="overflow-hidden bg-white shadow-2xl rounded-2xl"
            style={{
              width: isDesktop ? 400 : Math.min(SCREEN_WIDTH * 0.92, 480),
              maxHeight: SCREEN_HEIGHT * 0.78,
            }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-base font-semibold text-gray-800">
                Select Country
              </Text>
              <Pressable onPress={() => setShowCountryPicker(false)}>
                <X size={20} color="#4B5563" />
              </Pressable>
            </View>

            <View className="px-4 py-3 border-b border-gray-200">
              <View className="flex-row items-center px-3 bg-gray-100 rounded-lg">
                <Search size={16} color="#6B7280" />
                <TextInput
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  placeholder="Search country or code..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-2.5 px-2 text-sm text-gray-900"
                  autoFocus={Platform.OS !== "android"}
                />
              </View>
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.iso2}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    const max = getStandardMobileLength(item.iso2);
                    setFormData((prev) => ({
                      ...prev,
                      countryCode: item.dialCode,
                      countryIsoCode: item.iso2,
                      phone: prev.phone.slice(0, max),
                    }));
                    setShowCountryPicker(false);
                    setCountrySearch("");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <Image
                    source={{ uri: item.flagUrl }}
                    style={{ width: 28, height: 20, borderRadius: 4 }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#111827",
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{ marginLeft: 8, fontSize: 14, color: "#6B7280" }}
                  >
                    {item.dialCode}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="text-sm text-gray-500">
                    No countries found
                  </Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Date Picker Modal (iOS Bottom Sheet) */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="justify-end flex-1 bg-black/40">
            <View className="p-4 pb-8 bg-white rounded-t-2xl">
              <View className="flex-row items-center justify-between mb-3">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-base font-medium text-red-500">
                    Cancel
                  </Text>
                </Pressable>
                <Text className="text-base font-semibold text-gray-800">
                  Select Date
                </Text>
                <Pressable onPress={handleDateConfirm}>
                  <Text className="text-base font-bold text-blue-600">
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                testID="dateTimePicker"
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                textColor="#000000"
              />
            </View>
          </View>
        </Modal>
      )}
      {/* Date Picker (Android Native Dialog) */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </SafeAreaView>
  );
}
