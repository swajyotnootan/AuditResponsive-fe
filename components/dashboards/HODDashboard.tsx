import { API_BASE_URL } from "@/config/apiConfig";
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
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView, // 👈 ADD
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import FinalPreview from "../eightd/steps/FinalPreview";
// ── Root Cause Analytics imports (Deliverable 9) ──
import { ScanSearch } from "lucide-react-native";

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
      className={`flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5 ${config.bg} ${config.text} ${config.border}`}
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
    className="flex w-full flex-col items-center rounded-3xl border border-blue-100 bg-white p-6 shadow-lg active:scale-95 md:p-8"
    activeOpacity={0.9}
  >
    <View className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-sm md:mb-6 md:h-20 md:w-20">
      <View className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 md:h-16 md:w-16">
        {iconName === "bar-chart-2" && <BarChart3 size={24} color="#FFFFFF" />}
        {iconName === "user-check" && <UserCheck size={24} color="#FFFFFF" />}
      </View>
    </View>
    <View className="mb-6 w-full text-center">
      <Text className="mb-2 text-center text-xl font-bold text-gray-900 md:text-2xl">
        {title}
      </Text>
      <Text className="text-center text-sm leading-relaxed text-gray-600">
        {description}
      </Text>
    </View>
    <View className="mt-auto w-full flex-row items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 font-medium">
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
    className="w-full rounded-2xl border border-amber-200 bg-white bg-gradient-to-br from-amber-50 to-white p-5 shadow-lg active:scale-95"
    activeOpacity={0.9}
  >
    <View className="mb-3 self-start rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 shadow">
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
    <View className="mb-2 flex-row items-center gap-2">
      <User size={14} color="#64748B" />
      <Text className="flex-1 text-xs text-slate-500" numberOfLines={1}>
        Owner: {report?.initiatorEmail || "Unassigned"}
      </Text>
    </View>
    <View className="mb-4 flex-row items-center gap-2">
      <Calendar size={14} color="#64748B" />
      <Text className="text-xs text-slate-500">
        Created:{" "}
        {report?.createdAt
          ? new Date(report.createdAt).toLocaleDateString()
          : "N/A"}
      </Text>
    </View>
    <View className="mt-auto border-t border-slate-100 pt-3">
      <View className="flex-row items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 active:bg-amber-700">
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
  // ── Root Cause Analytics state (Deliverable 9) ──
  const [rcEvent, setRcEvent] = useState<any | null>(null);
  const rcEvents = useMemo(
    () =>
      (pendingApprovals || [])
        .filter(
          (e: any) =>
            e?.content?.d4?.[0]?.fishboneCategories?.length > 0 ||
            e?.content?.d4?.[0]?.whySteps?.length > 0,
        )
        .slice(0, 6),
    [pendingApprovals],
  );
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
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-Id": String((user as any)?.id ?? ""), // ✅ ADD
          "X-Timezone":
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        },
        timeout: 10000,
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
      <View className="flex-1 items-center justify-center bg-blue-50">
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
        <View className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-12 lg:px-8">
          <View className="mb-8 items-center md:mb-10">
            <Text className="text-center text-2xl font-bold text-[#005f9b] md:text-4xl">
              HOD Dashboard
            </Text>
            <Text className="mt-2 text-center text-base text-gray-500 md:text-lg">
              Welcome back, {user?.name || user?.username || "User"}
            </Text>
            <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
              <View className="rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-xs font-medium text-blue-700">
                  {user?.department || "Quality Assurance"}
                </Text>
              </View>
              <View className="rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-xs font-medium text-blue-700">
                  Head of Department
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-8 flex-col gap-4 md:mb-12 md:flex-row md:gap-6">
            <View className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg md:flex-1">
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
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <Clock size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg md:flex-1">
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
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <Users size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-lg md:flex-1">
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
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: NAVBAR_COLORS.primary1 }}
                >
                  <UserCheck size={24} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>

          <View className="mb-8 flex-col gap-6 md:mb-12 md:flex-row md:gap-8">
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
              <View className="mb-6 flex-row items-center justify-center">
                <View className="h-px flex-1 bg-gray-200" />
                <View className="bg-blue-50 px-4">
                  <Text className="text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Fresh 8D Awaiting Approval
                  </Text>
                </View>
                <View className="h-px flex-1 bg-gray-200" />
              </View>
              <View className="mb-8 flex-col gap-4 md:flex-row md:flex-wrap md:gap-6">
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
              <View className="mb-6 flex-row items-center justify-center">
                <View className="h-px flex-1 bg-gray-200" />
                <View className="bg-blue-50 px-4">
                  <Text className="text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    NCR 8D Awaiting Approval
                  </Text>
                </View>
                <View className="h-px flex-1 bg-gray-200" />
              </View>
              <View className="mb-8 flex-col gap-4 md:flex-row md:flex-wrap md:gap-6">
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
            <View className="mt-4 items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white py-12">
              <CheckCircle
                size={48}
                color={NAVBAR_COLORS.primary1}
                style={{ marginBottom: 12 }}
              />
              <Text className="text-lg font-medium text-gray-500">
                No pending approvals
              </Text>
              <Text className="mt-2 px-6 text-center text-sm text-gray-400">
                All 8D reports are approved or in progress
              </Text>
              <TouchableOpacity
                onPress={fetchPendingApprovals}
                className="mt-6 flex-row items-center gap-2 rounded-xl bg-blue-50 px-6 py-3"
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ROOT CAUSE ANALYTICS — Deliverable 9                     */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <View
            testID="root-cause-analytics"
            className="mt-6"
            style={{ gap: 16 }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <ScanSearch size={16} color="#1E40AF" />
              </View>
              <Text className="text-lg font-bold text-slate-800">
                Root Cause Analytics
              </Text>
            </View>

            {/* Pareto across all events */}

            {/* Recent 8D events with View button */}
            <View className="rounded-2xl border border-slate-200 bg-white p-4">
              <Text className="mb-3 text-[15px] font-semibold text-slate-800">
                Recent 8D Reports
              </Text>
              {rcEvents.length === 0 ? (
                <Text className="py-4 text-center text-sm text-slate-400">
                  No 8D reports with root-cause data yet
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {rcEvents.map((ev: any) => {
                    const d4 = ev?.content?.d4?.[0] || {};
                    const d0 = ev?.content?.d0?.[0] || {};
                    const nCauses =
                      (d4.fishboneCategories || []).reduce(
                        (s: number, c: any) => s + (c.causes?.length || 0),
                        0,
                      ) || 0;
                    const nWhys = (d4.whySteps || []).length;
                    return (
                      <View
                        key={ev.eventNo || ev.id}
                        className="flex-row items-center justify-between rounded-xl border border-slate-200 p-3"
                        style={{ gap: 12 }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            className="text-[13px] font-semibold text-slate-800"
                            numberOfLines={1}
                          >
                            {d0.title || ev.eventNo || "Untitled 8D"}
                          </Text>
                          <Text className="mt-0.5 text-[11px] text-slate-500">
                            {nCauses} causes · {nWhys} whys
                            {d4.verifiedBy ? " · Verified" : ""}
                          </Text>
                        </View>
                        <Pressable
                          testID={`view-rc-${ev.eventNo || ev.id}`}
                          onPress={() => setRcEvent(ev)}
                          className="rounded-lg bg-blue-600 px-3 py-2"
                        >
                          <Text className="text-[12px] font-semibold text-white">
                            View Root Cause
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
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
            className="h-full flex-1"
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
            <View className="z-10 flex-row items-center justify-between border-b border-gray-200 bg-white p-4">
              <Text
                className="mr-2 flex-1 text-base font-semibold text-[#005f9b]"
                numberOfLines={1}
              >
                8D Review — {previewEvent?.eventNo || previewEvent?.id || ""}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewEvent(null)}
                className="rounded-full bg-gray-100 p-2 active:bg-gray-200"
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
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ROOT CAUSE MODAL — Deliverable 9                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!rcEvent}
        animationType="slide"
        transparent
        onRequestClose={() => setRcEvent(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="rounded-t-3xl bg-slate-50"
            style={{ maxHeight: "92%" }}
          >
            {/* Modal header */}
            <View className="flex-row items-center justify-between rounded-t-3xl border-b border-slate-200 bg-white px-5 py-4">
              <View style={{ flex: 1 }}>
                <Text className="text-[16px] font-bold text-slate-800">
                  Root Cause Analysis
                </Text>
                <Text
                  className="mt-0.5 text-[11px] text-slate-500"
                  numberOfLines={1}
                >
                  {rcEvent?.content?.d0?.[0]?.title ||
                    rcEvent?.eventNo ||
                    "8D Report"}
                </Text>
              </View>
              <TouchableOpacity
                testID="close-rc-modal"
                onPress={() => setRcEvent(null)}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={18} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 16 }}
              showsVerticalScrollIndicator={false}
            ></ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
