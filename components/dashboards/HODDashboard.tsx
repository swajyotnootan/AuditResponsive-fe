import axios from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  User,
  UserCheck,
  Users,
  X, // 👈 ADD
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal, // 👈 ADD
  Platform,
  SafeAreaView, // 👈 ADD
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// 👈 ADD (adjust the path to where FinalPreview lives in your project)
import FinalPreview from "../eightd/steps/FinalPreview";

const NAVBAR_COLORS = {
  primary1: "#005f9b",
  primary: "#00799b",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const getBaseUrl = () => {
  // ✅ 1. WEB BROWSER ONLY (Expo Web)
  if (Platform.OS === "web") {
    return "https://auditchecksheetncr-be.hub.swajyot.co.in:9443";
  }

  // ✅ 2. PHYSICAL ANDROID PHONE (Your current setup)
  if (Platform.OS === "android") {
    return "https://auditchecksheetncr-be.hub.swajyot.co.in:9443";
  }

  // ✅ 3. ANDROID STUDIO EMULATOR (If you are using the emulator instead of a physical phone, use this instead of #2)
  // if (Platform.OS === "android") {
  //   return "http://10.0.2.2:8080";
  // }

  // ✅ 4. iOS (Simulator or Physical)
  if (Platform.OS === "ios") {
    return "https://auditchecksheetncr-be.hub.swajyot.co.in:9443"; // Physical iPhone needs the IP. Simulator can use localhost.
  }

  // ✅ 5. FALLBACK
  return "https://auditchecksheetncr-be.hub.swajyot.co.in:9443";
};

const API_BASE_URL = getBaseUrl();
console.log("🚀 API Base URL being used:", API_BASE_URL); // <-- WATCH THIS LOG

// ... [Keep your isNcrBasedEvent, isApprovalPendingStatus, StatusBadge, ActionCard, ApprovalCard exactly as they were] ...
const isNcrBasedEvent = (event: any): boolean => {
  const d0Data = Array.isArray(event?.content?.d0) ? event.content.d0[0] : null;
  const eventNo = String(event?.eventNo || "").toUpperCase();
  return Boolean(
    d0Data?.sourceNcrId ||
    d0Data?.sourceNcrNumber ||
    d0Data?.isNcrBased === true ||
    d0Data?.sourceType === "ncr" ||
    event?.isNcrBased === true ||
    event?.sourceType === "ncr" ||
    eventNo.includes("NCR"),
  );
};

const isApprovalPendingStatus = (status: string) => {
  const s = String(status || "").toLowerCase();
  return s === "approval pending" || s === "approval_pending";
};

// ... [Paste your StatusBadge, ActionCard, and ApprovalCard components here unchanged] ...
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "COMPLETED":
      case "CLOSED":
        return {
          bg: "bg-green-50",
          text: "text-green-800",
          border: "border-green-200",
          label: "Completed",
          icon: CheckCircle,
          iconColor: "#166534",
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-cyan-50",
          text: "text-cyan-800",
          border: "border-cyan-200",
          label: "In Progress",
          icon: RefreshCw,
          iconColor: "#155E75",
        };
      case "APPROVAL_PENDING":
      case "APPROVAL PENDING":
        return {
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
          label: "Awaiting Approval",
          icon: Clock,
          iconColor: "#92400E",
        };
      case "D0_APPROVED":
      case "D0 APPROVED":
        return {
          bg: "bg-blue-50",
          text: "text-blue-800",
          border: "border-blue-200",
          label: "D0 Approved",
          icon: CheckCircle,
          iconColor: "#1E40AF",
        };
      case "REJECTED":
        return {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          label: "Rejected",
          icon: AlertCircle,
          iconColor: "#991B1B",
        };
      case "DRAFT":
        return {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          label: "Draft",
          icon: FileText,
          iconColor: "#374151",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          label: status || "Pending",
          icon: FileText,
          iconColor: "#374151",
        };
    }
  };
  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  return (
    <View
      className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 self-start ${config.bg} ${config.text} ${config.border}`}
    >
      <IconComponent size={14} color={config.iconColor} />
      <Text className={`text-xs font-semibold ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};

const ActionCard = ({ title, description, iconName, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-col items-center w-full p-6 bg-white border border-blue-100 shadow-lg rounded-3xl active:scale-95 md:p-8"
    activeOpacity={0.9}
  >
    <View className="flex items-center justify-center w-16 h-16 mx-auto mb-4 shadow-sm rounded-2xl bg-blue-50 md:w-20 md:h-20 md:mb-6">
      <View className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl md:w-16 md:h-16">
        {iconName === "bar-chart-2" && <BarChart3 size={24} color="#FFFFFF" />}
        {iconName === "user-check" && <UserCheck size={24} color="#FFFFFF" />}
      </View>
    </View>
    <View className="w-full mb-6 text-center">
      <Text className="mb-2 text-xl font-bold text-center text-gray-900 md:text-2xl">
        {title}
      </Text>
      <Text className="text-sm leading-relaxed text-center text-gray-600">
        {description}
      </Text>
    </View>
    <View className="flex-row items-center justify-center w-full gap-2 px-4 py-3 mt-auto font-medium rounded-xl bg-blue-50">
      <Text className="text-base font-semibold text-[#00799b]">
        Go to Dashboard
      </Text>
      <ChevronRight size={20} color="#00799b" />
    </View>
  </TouchableOpacity>
);

const ApprovalCard = ({ report, onReview }: any) => (
  <TouchableOpacity
    onPress={onReview}
    className="w-full p-5 bg-white border shadow-lg rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 to-white active:scale-95"
    activeOpacity={0.9}
  >
    <View className="mb-3 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full self-start shadow">
      <Text className="text-xs font-bold text-white">
        ⚡ Awaiting HOD Approval
      </Text>
    </View>
    <View className="mb-3">
      <StatusBadge status="Approval Pending" />
    </View>
    <Text className="mb-2 text-lg font-bold text-slate-800" numberOfLines={2}>
      {report?.title || report?.eventNo || "8D Report"}
    </Text>
    <View className="flex-row items-center gap-2 mb-2">
      <User size={14} color="#64748B" />
      <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
        Owner: {report?.initiatorEmail || "Unassigned"}
      </Text>
    </View>
    <View className="flex-row items-center gap-2 mb-4">
      <Calendar size={14} color="#64748B" />
      <Text className="text-xs text-slate-500">
        Created:{" "}
        {report?.createdAt
          ? new Date(report.createdAt).toLocaleDateString()
          : "N/A"}
      </Text>
    </View>
    <View className="pt-3 mt-auto border-t border-slate-100">
      <View className="flex-row items-center justify-center gap-2 px-4 py-3 bg-amber-600 rounded-xl active:bg-amber-700">
        <Eye size={16} color="#FFFFFF" />
        <Text className="text-sm font-semibold text-white">
          Review & Approve
        </Text>
        <ChevronRight size={16} color="#FFFFFF" />
      </View>
    </View>
  </TouchableOpacity>
);

export default function HODDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  // ✅ SAFE TOAST FALLBACK: Prevents crash/warning if Provider is missing
  let addToast = (
    message: string,
    type: "error" | "success" | "info" = "info",
  ) => {
    console.warn(`[Toast Fallback - ${type}]`, message);
  };
  try {
    const toastContext = useToast();
    if (toastContext?.addToast) {
      addToast = toastContext.addToast;
    }
  } catch (e) {
    console.warn("ToastProvider is missing. Using console fallback.");
  }

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [previewEvent, setPreviewEvent] = useState<any | null>(null);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    freshPendingApprovals: 0,
    ncrPendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const token = user?.token;
      const url = `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`;

      console.log("📡 Attempting to fetch from:", url); // ✅ DEBUG LOG

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10-second timeout prevents infinite hanging
      });

      if (response.data?.success && Array.isArray(response.data.data)) {
        const pending = response.data.data.filter((event: any) =>
          isApprovalPendingStatus(event.status),
        );
        const freshPending = pending.filter(
          (event: any) => !isNcrBasedEvent(event),
        );
        const ncrPending = pending.filter((event: any) =>
          isNcrBasedEvent(event),
        );

        setPendingApprovals(pending);
        setStats({
          pendingApprovals: pending.length,
          freshPendingApprovals: freshPending.length,
          ncrPendingApprovals: ncrPending.length,
        });
      }
    } catch (error: any) {
      // ✅ DETAILED ERROR LOGGING
      console.error("❌ Axios Error Details:", {
        message: error.message,
        code: error.code,
        url: `${API_BASE_URL}/api/eightd/data`,
      });

      addToast(
        "Failed to load pending approvals. Check network connection.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.token, addToast]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingApprovals();
    }, [fetchPendingApprovals]),
  );

  const handleReview = (event: any) => {
    setPreviewEvent(event); // 👈 This is all you need to open the Modal
  };

  const handleViewDashboard = (type = "all") => {
    router.push({ pathname: "/landing-page", params: { type } });
  };

  const freshPendingApprovals = pendingApprovals.filter(
    (event) => !isNcrBasedEvent(event),
  );
  const ncrPendingApprovals = pendingApprovals.filter((event) =>
    isNcrBasedEvent(event),
  );

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-blue-50">
        <ActivityIndicator size="large" color={NAVBAR_COLORS.primary1} />
        <Text className="mt-4 text-sm text-gray-500">
          Loading HOD Dashboard...
        </Text>
      </View>
    );
  }

  // ... [Keep your entire return (JSX) statement exactly as it was] ...
  return (
    <>
      <ScrollView
        className="flex-1 bg-blue-50"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        <View className="w-full px-4 py-6 mx-auto md:px-6 lg:px-8 md:py-12 max-w-7xl">
          <View className="items-center mb-8 md:mb-10">
            <Text className="text-2xl font-bold text-center text-[#005f9b] md:text-4xl">
              HOD Dashboard
            </Text>
            <Text className="mt-2 text-base text-center text-gray-500 md:text-lg">
              Welcome back, {user?.name || user?.username || "User"}
            </Text>
            <View className="flex-row flex-wrap items-center justify-center gap-2 mt-3">
              <View className="px-3 py-1 bg-blue-100 rounded-full">
                <Text className="text-xs font-medium text-blue-700">
                  {user?.department || "Quality Assurance"}
                </Text>
              </View>
              <View className="px-3 py-1 bg-blue-100 rounded-full">
                <Text className="text-xs font-medium text-blue-700">
                  Head of Department
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-col gap-4 mb-8 md:flex-row md:gap-6 md:mb-12">
            <View className="w-full p-5 bg-white border shadow-lg border-slate-200 rounded-2xl md:flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-gray-500">
                    Pending Approvals
                  </Text>
                  <Text className="mt-1 text-2xl font-bold text-black md:text-3xl">
                    {stats.pendingApprovals}
                  </Text>
                </View>
                <View
                  className="items-center justify-center w-12 h-12 rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <Clock size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View className="w-full p-5 bg-white border shadow-lg border-slate-200 rounded-2xl md:flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-gray-500">
                    Department
                  </Text>
                  <Text
                    className="mt-1 text-lg font-bold text-gray-800 md:text-xl"
                    numberOfLines={1}
                  >
                    {user?.department || "Quality"}
                  </Text>
                </View>
                <View
                  className="items-center justify-center w-12 h-12 rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <Users size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View className="w-full p-5 bg-white border shadow-lg border-slate-200 rounded-2xl md:flex-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-gray-500">
                    Role
                  </Text>
                  <Text className="mt-1 text-lg font-bold text-gray-800 md:text-xl">
                    HOD
                  </Text>
                </View>
                <View
                  className="items-center justify-center w-12 h-12 rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <UserCheck size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>

          <View className="flex-col gap-6 mb-8 md:flex-row md:gap-8 md:mb-12">
            <View className="w-full md:flex-1">
              <ActionCard
                title="Fresh 8D Dashboard"
                description={`${stats.freshPendingApprovals} item(s) waiting for HOD action.`}
                iconName="bar-chart-2"
                onPress={() => handleViewDashboard("fresh")}
              />
            </View>
            <View className="w-full md:flex-1">
              <ActionCard
                title="NCR 8D Dashboard"
                description={`${stats.ncrPendingApprovals} item(s) waiting for HOD action.`}
                iconName="user-check"
                onPress={() => handleViewDashboard("ncr")}
              />
            </View>
          </View>

          {freshPendingApprovals.length > 0 && (
            <>
              <View className="flex-row items-center justify-center mb-6">
                <View className="flex-1 h-px bg-gray-200" />
                <View className="px-4 bg-blue-50">
                  <Text className="text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                    Fresh 8D Awaiting Approval
                  </Text>
                </View>
                <View className="flex-1 h-px bg-gray-200" />
              </View>
              <View className="flex-col gap-4 mb-8 md:flex-row md:flex-wrap md:gap-6">
                {freshPendingApprovals.map((event) => (
                  <View
                    key={event.eventNo || event.id}
                    className="w-full md:w-[48%] lg:w-[32%]"
                  >
                    <ApprovalCard
                      report={event}
                      onReview={() => handleReview(event)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {ncrPendingApprovals.length > 0 && (
            <>
              <View className="flex-row items-center justify-center mb-6">
                <View className="flex-1 h-px bg-gray-200" />
                <View className="px-4 bg-blue-50">
                  <Text className="text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                    NCR 8D Awaiting Approval
                  </Text>
                </View>
                <View className="flex-1 h-px bg-gray-200" />
              </View>
              <View className="flex-col gap-4 mb-8 md:flex-row md:flex-wrap md:gap-6">
                {ncrPendingApprovals.map((event) => (
                  <View
                    key={event.eventNo || event.id}
                    className="w-full md:w-[48%] lg:w-[32%]"
                  >
                    <ApprovalCard
                      report={event}
                      onReview={() => handleReview(event)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}

          {pendingApprovals.length === 0 && (
            <View className="items-center justify-center py-12 mt-4 bg-white border border-gray-300 border-dashed rounded-3xl">
              <CheckCircle
                size={48}
                color={NAVBAR_COLORS.primary1}
                style={{ marginBottom: 12 }}
              />
              <Text className="text-lg font-medium text-gray-500">
                No pending approvals
              </Text>
              <Text className="px-6 mt-2 text-sm text-center text-gray-400">
                All 8D reports are approved or in progress
              </Text>
              <TouchableOpacity
                onPress={fetchPendingApprovals}
                className="flex-row items-center gap-2 px-6 py-3 mt-6 rounded-xl bg-blue-50"
              >
                <RefreshCw size={16} color={NAVBAR_COLORS.primary1} />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: NAVBAR_COLORS.primary1 }}
                >
                  Refresh Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Preview Drawer Modal (Right Side) */}
      <Modal
        visible={!!previewEvent}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setPreviewEvent(null)}
      >
        <View className="flex-1 flex-row bg-black/50">
          {/* Left Backdrop (closes the drawer when tapped) */}
          <TouchableOpacity
            className="flex-1 h-full"
            onPress={() => setPreviewEvent(null)}
            activeOpacity={1}
          />

          {/* Right Drawer */}
          <SafeAreaView
            className="h-full bg-white"
            style={{
              // Takes 550px on desktop, 90% width on mobile
              width:
                Dimensions.get("window").width >= 768
                  ? 550
                  : Dimensions.get("window").width * 0.9,
              maxWidth: 650,
              shadowColor: "#000",
              shadowOffset: { width: -4, height: 0 }, // Shadow casts to the left
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 20,
            }}
          >
            {/* Drawer Header */}
            <View className="z-10 flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
              <Text
                className="text-base font-semibold text-[#005f9b] flex-1 mr-2"
                numberOfLines={1}
              >
                8D Review — {previewEvent?.eventNo || previewEvent?.id || ""}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewEvent(null)}
                className="p-2 rounded-full active:bg-gray-200 bg-gray-100"
              >
                <X size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Drawer Content */}
            <ScrollView
              className="flex-1 bg-gray-50"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {previewEvent && (
                <FinalPreview
                  key={previewEvent.eventNo || previewEvent.id}
                  eventId={previewEvent.eventNo || previewEvent.id || null}
                  isHOD={true}
                  onRefresh={fetchPendingApprovals}
                  onClose={() => setPreviewEvent(null)}
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
