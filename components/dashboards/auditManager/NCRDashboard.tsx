import { ncrService } from "@/services/ncrService";
// ✅ CORRECT: Import the icon family, NOT individual icon names
import { Feather } from "@expo/vector-icons";

import ForumThreadView from "@/components/forum/ForumThreadView";
import AuditCheckSheetNCRForumModal from "@/components/modals/AuditCheckSheetNCRForumModal";
import { API_BASE_URL } from "@/config/apiConfig";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Form7DetailView from "../auditor/view/Form7DetailView";


// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#000000",
  textValue: "#1F2937",
  textMuted: "#6B7280",
  accent: "#00529B",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

const FONT_FAMILY = Platform.OS === "ios" ? "System" : "Roboto";

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const hasNcr2Data = (ncr: any) =>
  Boolean(
    ncr?.ncr2RootCause ||
    ncr?.ncr2Correction ||
    ncr?.ncr2CorrectiveAction ||
    ["READY_FOR_NCR2", "NCR2_IN_PROGRESS", "NCR2_COMPLETED"].includes(
      ncr?.status,
    ),
  );

const hasForm8Data = (ncr: any) =>
  Boolean(
    ncr?.rootCause ||
    ncr?.correction ||
    ncr?.correctiveAction ||
    hasNcr2Data(ncr),
  );

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    AWAITING_AUDITEE: "Awaiting Auditee Review",
    OPEN: "Pending Manager Approval",
    APPROVED: "Approved",
    IN_PROGRESS: "In Progress",
    CLOSED: "Closed",
    REJECTED: "Rejected",
    SENT_TO_8D: "Sent to 8D",
    IN_8D_PROCESS: "In 8D Process",
    READY_FOR_NCR2: "Ready for NCR2",
    NCR2_IN_PROGRESS: "NCR2 Verification",
    NCR2_COMPLETED: "NCR2 Completed",
  };
  return labels[status] || status;
};

const FILTER_TYPES = { ALL: "all", REGULAR: "regular", EIGHT_D: "8d" };

// ─────────────────────────────────────────────────────────────
// Reusable UI Components
// ─────────────────────────────────────────────────────────────

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <View
    className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm ${className}`}
  >
    {children}
  </View>
);

const Spinner = ({
  size = 24,
  color = "#FFFFFF",
}: {
  size?: number;
  color?: string;
}) => <ActivityIndicator size={size as any} color={color} />;

// ✅ UPDATED: Accepts iconName as a string and uses the Feather component
const StatCard = ({
  title,
  value,
  iconName,
  color,
  bg,
  border,
}: {
  title: string;
  value: string | number;
  iconName?: string;
  color?: string;
  bg?: string;
  border?: string;
}) => (
  <View className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm min-w-[140px] flex-1">
    <View className="flex-row items-start justify-between">
      <View className="flex-1">
        <Text className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
          {title}
        </Text>
        <Text className="text-2xl font-bold" style={{ color: color || T.text }}>
          {value}
        </Text>
      </View>
      {iconName && (
        <View
          className="items-center justify-center w-10 h-10 rounded-lg"
          style={{
            backgroundColor: bg || "#F1F5F9",
            borderWidth: 1,
            borderColor: border || T.border,
          }}
        >
          <Feather
            name={iconName as any}
            size={20}
            color={color || T.textMuted}
          />
        </View>
      )}
    </View>
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, any> = {
    AWAITING_AUDITEE: {
      label: "Awaiting Auditee",
      bg: T.warningLight,
      color: "#92400E",
      border: T.warningBorder,
    },
    OPEN: {
      label: "Pending Approval",
      bg: T.warningLight,
      color: "#92400E",
      border: T.warningBorder,
    },
    APPROVED: {
      label: "Approved",
      bg: T.accentLight,
      color: "#1E40AF",
      border: T.accentBorder,
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: T.purpleLight,
      color: "#5B21B6",
      border: T.purpleBorder,
    },
    CLOSED: {
      label: "Closed",
      bg: T.successLight,
      color: "#065F46",
      border: T.successBorder,
    },
    REJECTED: {
      label: "Rejected",
      bg: T.errorLight,
      color: "#991B1B",
      border: T.errorBorder,
    },
    SENT_TO_8D: {
      label: "Sent to 8D",
      bg: T.purpleLight,
      color: "#5B21B6",
      border: T.purpleBorder,
    },
    IN_8D_PROCESS: {
      label: "In 8D Process",
      bg: "#ECFEFF",
      color: "#155E75",
      border: "#A5F3FC",
    },
    READY_FOR_NCR2: {
      label: "Ready for NCR2",
      bg: T.accentLight,
      color: "#1E40AF",
      border: T.accentBorder,
    },
    NCR2_IN_PROGRESS: {
      label: "NCR2 Verification",
      bg: "#F5F3FF",
      color: "#5B21B6",
      border: "#DDD6FE",
    },
    NCR2_COMPLETED: {
      label: "NCR2 Completed",
      bg: T.successLight,
      color: "#065F46",
      border: T.successBorder,
    },
  };
  const { label, bg, color, border } = config[status] || {
    label: status,
    bg: "#F1F5F9",
    color: "#475569",
    border: "#E2E8F0",
  };
  return (
    <View
      className="flex-row items-center px-3 py-1 border rounded-full"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color, fontFamily: FONT_FAMILY }}
      >
        {label}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRDashboard = ({
  onBack,
  onViewNcr,
}: {
  onBack?: () => void;
  onViewNcr?: (id: string) => void;
}) => {
  const [viewingNcrId, setViewingNcrId] = useState<string | null>(null);
  // ... rest of your code
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ncrList, setNcrList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.ALL);

  const [showSendTo8DModal, setShowSendTo8DModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<any>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [sendTo8DComment, setSendTo8DComment] = useState("");

  const [show8DForumDrawer, setShow8DForumDrawer] = useState(false);
  const [selected8DNCR, setSelected8DNCR] = useState<any>(null);
  const [eightDTeamMembers, setEightDTeamMembers] = useState<string[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  const isAuditManager = user?.role === "AUDIT_MANAGER";

  const is8DRelated = (ncr: any) => {
    const eightDStatuses = [
      "SENT_TO_8D",
      "IN_8D_PROCESS",
      "READY_FOR_NCR2",
      "NCR2_IN_PROGRESS",
      "NCR2_COMPLETED",
    ];
    return eightDStatuses.includes(ncr?.status) || ncr?.requires8D === true;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const allResult = await ncrService.getAllNCRs();
    if (!allResult.success) setError(allResult.error);
    setNcrList(allResult.success ? allResult.data : []);
    setLoading(false);
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setAllUsersList(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsersList([]);
    }
  };

  useEffect(() => {
    loadData();
    fetchAllUsers();
  }, []);

  const openNCRForum = (ncr: any) => {
    const auditor = allUsersList.find((u: any) => u.id === ncr.auditorId);
    const auditee = allUsersList.find((u: any) => u.id === ncr.auditeeId);
    const auditManager = allUsersList.find(
      (u: any) => u.role === "AUDIT_MANAGER",
    );

    setSelectedNCRForForum({
      id: ncr.id,
      ncrNumber: ncr.ncrNumber,
      department: ncr.department,
      severity: ncr.severity,
      status: ncr.status,
      auditorId: ncr.auditorId,
      auditorName: ncr.auditorName || auditor?.name,
      auditeeId: ncr.auditeeId,
      auditeeName: ncr.auditeeName || auditee?.name,
      memberEmails: [
        auditor?.email,
        auditee?.email,
        user?.email,
        auditManager?.email,
      ].filter(Boolean),
    });
    setShowForumModal(true);
  };

  const open8DForum = async (ncr: any) => {
    setSelected8DNCR(ncr);
    setEightDTeamMembers([]);
    setShow8DForumDrawer(true);
    setLoadingTeamMembers(true);

    try {
      const eightDEventId = `8D-${ncr.ncrNumber}`;
      const response = await fetch(
        `${API_BASE_URL}/api/eightd/data/${eightDEventId}`,
      );
      if (!response.ok) throw new Error("Network response was not ok");

      const responseData = await response.json();
      if (responseData?.success && responseData.data) {
        const d0Data = responseData.data.content?.d0?.[0] || {};
        const emails = Array.isArray(d0Data.additionalEmails)
          ? d0Data.additionalEmails
          : [];
        setEightDTeamMembers(emails);
      }
    } catch (err) {
      console.error("Failed to fetch 8D team members:", err);
      setEightDTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const handleSendTo8D = (ncr: any) => {
    setSelectedNCR(ncr);
    setSendTo8DComment("");
    setShowSendTo8DModal(true);
  };

  const confirmSendTo8D = async () => {
    if (!selectedNCR) return;
    setProcessingAction(true);
    try {
      const result = await ncrService.sendTo8D(
        selectedNCR.id,
        sendTo8DComment,
        user?.id ?? "",
      );
      if (result.success) {
        setShowSendTo8DModal(false);
        await loadData();
        addToast(`NCR #${selectedNCR.ncrNumber} sent to 8D team!`, "success");
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error("Error sending to 8D:", error);
      setError("Failed to send NCR to 8D process");
    } finally {
      setProcessingAction(false);
      setSelectedNCR(null);
    }
  };

  const filteredNCRs = useMemo(() => {
    let filtered = ncrList;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((ncr) =>
        [
          ncr.ncrNumber,
          ncr.department,
          ncr.auditorName,
          ncr.auditeeName,
          ncr.statementOfNonconformity,
        ]
          .filter(Boolean)
          .some((value: any) => value.toLowerCase().includes(term)),
      );
    }
    if (activeFilter === FILTER_TYPES.REGULAR)
      filtered = filtered.filter((ncr: any) => !is8DRelated(ncr));
    else if (activeFilter === FILTER_TYPES.EIGHT_D)
      filtered = filtered.filter((ncr: any) => is8DRelated(ncr));
    return filtered;
  }, [ncrList, searchTerm, activeFilter]);

  const stats = useMemo(
    () => ({
      total: ncrList.length,
      regularCount: ncrList.filter((ncr: any) => !is8DRelated(ncr)).length,
      eightDCount: ncrList.filter((ncr: any) => is8DRelated(ncr)).length,
      awaitingAuditee: ncrList.filter(
        (ncr: any) => ncr.status === "AWAITING_AUDITEE",
      ).length,
      open: ncrList.filter((ncr: any) => ncr.status === "OPEN").length,
      approved: ncrList.filter((ncr: any) => ncr.status === "APPROVED").length,
      inProgress: ncrList.filter((ncr: any) => ncr.status === "IN_PROGRESS")
        .length,
      closed: ncrList.filter((ncr: any) => ncr.status === "CLOSED").length,
      rejected: ncrList.filter((ncr: any) => ncr.status === "REJECTED").length,
      sentTo8D: ncrList.filter(
        (ncr: any) => ncr.status === "SENT_TO_8D" || ncr.requires8D,
      ).length,
      readyForNCR2: ncrList.filter(
        (ncr: any) => ncr.status === "READY_FOR_NCR2",
      ).length,
      ncr2InProgress: ncrList.filter(
        (ncr: any) => ncr.status === "NCR2_IN_PROGRESS",
      ).length,
      ncr2Completed: ncrList.filter(
        (ncr: any) => ncr.status === "NCR2_COMPLETED",
      ).length,
    }),
    [ncrList],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <Spinner size={40} color={T.accent} />
        <Text className="mt-4 text-base font-semibold text-[#000000]">
          Loading NCR register...
        </Text>
      </View>
    );
  }

  if (viewingNcrId) {
    return (
      <Form7DetailView
        initialParams={{ id: viewingNcrId }}
        onClose={() => setViewingNcrId(null)} // Clears state to return to dashboard
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" style={{ height: "100%" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 h-full"
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          style={{ flex: 1 }} // Explicit flex for web
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} // Forces content to fill space
        >
          <View className="p-6 max-w-[1400px] self-center w-full">
            {/* Header */}
            <Card className="p-6 mb-6">
              <View className="flex-row flex-wrap items-center justify-between gap-4">
                <View className="flex-row items-center gap-4">
                  <Pressable
                    // ✅ NEW: Safely calls onBack if provided, does nothing otherwise
                    onPress={() => onBack?.()}
                    className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] items-center justify-center"
                  >
                    {({ pressed }) => (
                      <Feather
                        name="arrow-left"
                        size={18}
                        color={pressed ? T.accent : T.textMuted}
                      />
                    )}
                  </Pressable>
                  <View className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] items-center justify-center">
                    <Feather name="file-text" size={24} color={T.accent} />
                  </View>
                  <View>
                    <Text className="text-xl font-bold text-[#000000]">
                      Form 7: Nonconformity Reports
                    </Text>
                    <Text className="mt-1 text-sm text-[#6B7280]">
                      View all NCRs raised by auditors
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={loadData}
                  className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] items-center justify-center"
                >
                  {({ pressed }) => (
                    <Feather
                      name="refresh-cw"
                      size={18}
                      color={pressed ? T.accent : T.textMuted}
                    />
                  )}
                </Pressable>
              </View>
            </Card>

            {/* Error Alert */}
            {error && (
              <View className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl mb-6 flex-row gap-3">
                <View className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#FECACA] items-center justify-center">
                  <Feather name="alert-circle" size={18} color={T.error} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-[#991B1B]">
                    Error
                  </Text>
                  <Text className="mt-1 text-sm text-[#991B1B] opacity-90">
                    {error}
                  </Text>
                </View>
              </View>
            )}

            {/* Statistics Cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              className="mb-6"
              style={{
                overflowX: "auto",
                overflowY: "hidden", // Prevents it from hijacking vertical scroll on web
              }}
            >
              <View className="flex-row gap-4 px-1">
                <StatCard
                  title="Total NCRs"
                  value={stats.total}
                  iconName="file-text"
                  color={T.textValue}
                  bg="#F1F5F9"
                  border={T.border}
                />
                <StatCard
                  title="Awaiting Auditee"
                  value={stats.awaitingAuditee}
                  iconName="clock"
                  color={T.warning}
                  bg={T.warningLight}
                  border={T.warningBorder}
                />
                <StatCard
                  title="Pending Approval"
                  value={stats.open}
                  iconName="clock"
                  color={T.warning}
                  bg={T.warningLight}
                  border={T.warningBorder}
                />
                <StatCard
                  title="Approved"
                  value={stats.approved}
                  iconName="check-circle"
                  color={T.accent}
                  bg={T.accentLight}
                  border={T.accentBorder}
                />
                <StatCard
                  title="In Progress"
                  value={stats.inProgress}
                  iconName="alert-circle"
                  color={T.purple}
                  bg={T.purpleLight}
                  border={T.purpleBorder}
                />
                <StatCard
                  title="Closed"
                  value={stats.closed}
                  iconName="check-circle"
                  color={T.success}
                  bg={T.successLight}
                  border={T.successBorder}
                />
                <StatCard
                  title="Rejected"
                  value={stats.rejected}
                  iconName="x-circle"
                  color={T.error}
                  bg={T.errorLight}
                  border={T.errorBorder}
                />
                <StatCard
                  title="In 8D Process"
                  value={stats.eightDCount}
                  iconName="alert-triangle"
                  color={T.purple}
                  bg={T.purpleLight}
                  border={T.purpleBorder}
                />
              </View>
            </ScrollView>

            {/* 8D Status Cards */}
            {activeFilter === FILTER_TYPES.EIGHT_D && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6"
              >
                <View className="flex-row gap-4 px-1">
                  <StatCard
                    title="Sent to 8D"
                    value={stats.sentTo8D}
                    iconName="send"
                    color={T.purple}
                    bg={T.purpleLight}
                    border={T.purpleBorder}
                  />
                  <StatCard
                    title="Ready for NCR2"
                    value={stats.readyForNCR2}
                    iconName="clock"
                    color="#1E40AF"
                    bg={T.accentLight}
                    border={T.accentBorder}
                  />
                  <StatCard
                    title="NCR2 Verification"
                    value={stats.ncr2InProgress}
                    iconName="alert-circle"
                    color="#5B21B6"
                    bg="#F5F3FF"
                    border="#DDD6FE"
                  />
                  <StatCard
                    title="NCR2 Completed"
                    value={stats.ncr2Completed}
                    iconName="check-circle"
                    color={T.success}
                    bg={T.successLight}
                    border={T.successBorder}
                  />
                </View>
              </ScrollView>
            )}

            {/* Filter Section */}
            <Card className="p-5 mb-6">
              <View className="flex-row flex-wrap items-center justify-between gap-4">
                <View className="flex-row items-center gap-2">
                  <Feather name="filter" size={18} color={T.textMuted} />
                  <Text className="text-sm font-semibold text-[#1F2937]">
                    Filter NCRs:
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setActiveFilter(FILTER_TYPES.ALL)}
                    className="flex-row items-center h-10 gap-2 px-4 border rounded-lg"
                    style={{
                      borderColor:
                        activeFilter === FILTER_TYPES.ALL ? T.text : T.border,
                      backgroundColor:
                        activeFilter === FILTER_TYPES.ALL ? T.text : T.card,
                    }}
                  >
                    {({ pressed }) => (
                      <>
                        <Feather
                          name="layers"
                          size={14}
                          color={
                            pressed
                              ? "#FFF"
                              : activeFilter === FILTER_TYPES.ALL
                                ? "#FFF"
                                : T.textValue
                          }
                        />
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color:
                              activeFilter === FILTER_TYPES.ALL
                                ? "#FFF"
                                : T.textValue,
                          }}
                        >
                          All NCRs
                        </Text>
                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              activeFilter === FILTER_TYPES.ALL
                                ? "rgba(255,255,255,0.2)"
                                : "#F1F5F9",
                          }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{
                              color:
                                activeFilter === FILTER_TYPES.ALL
                                  ? "#FFF"
                                  : T.textMuted,
                            }}
                          >
                            {stats.total}
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveFilter(FILTER_TYPES.REGULAR)}
                    className="flex-row items-center h-10 gap-2 px-4 border rounded-lg"
                    style={{
                      borderColor:
                        activeFilter === FILTER_TYPES.REGULAR
                          ? T.accent
                          : T.border,
                      backgroundColor:
                        activeFilter === FILTER_TYPES.REGULAR
                          ? T.accent
                          : T.card,
                    }}
                  >
                    {({ pressed }) => (
                      <>
                        <Feather
                          name="file-text"
                          size={14}
                          color={
                            pressed
                              ? "#FFF"
                              : activeFilter === FILTER_TYPES.REGULAR
                                ? "#FFF"
                                : T.textValue
                          }
                        />
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color:
                              activeFilter === FILTER_TYPES.REGULAR
                                ? "#FFF"
                                : T.textValue,
                          }}
                        >
                          Regular NCRs
                        </Text>
                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              activeFilter === FILTER_TYPES.REGULAR
                                ? "rgba(255,255,255,0.2)"
                                : T.accentLight,
                          }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{
                              color:
                                activeFilter === FILTER_TYPES.REGULAR
                                  ? "#FFF"
                                  : "#1E40AF",
                            }}
                          >
                            {stats.regularCount}
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => setActiveFilter(FILTER_TYPES.EIGHT_D)}
                    className="flex-row items-center h-10 gap-2 px-4 border rounded-lg"
                    style={{
                      borderColor:
                        activeFilter === FILTER_TYPES.EIGHT_D
                          ? T.purple
                          : T.border,
                      backgroundColor:
                        activeFilter === FILTER_TYPES.EIGHT_D
                          ? T.purple
                          : T.card,
                    }}
                  >
                    {({ pressed }) => (
                      <>
                        <Feather
                          name="alert-triangle"
                          size={14}
                          color={
                            pressed
                              ? "#FFF"
                              : activeFilter === FILTER_TYPES.EIGHT_D
                                ? "#FFF"
                                : T.textValue
                          }
                        />
                        <Text
                          className="text-sm font-semibold"
                          style={{
                            color:
                              activeFilter === FILTER_TYPES.EIGHT_D
                                ? "#FFF"
                                : T.textValue,
                          }}
                        >
                          8D Process
                        </Text>
                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              activeFilter === FILTER_TYPES.EIGHT_D
                                ? "rgba(255,255,255,0.2)"
                                : T.purpleLight,
                          }}
                        >
                          <Text
                            className="text-[11px] font-bold"
                            style={{
                              color:
                                activeFilter === FILTER_TYPES.EIGHT_D
                                  ? "#FFF"
                                  : "#5B21B6",
                            }}
                          >
                            {stats.eightDCount}
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
              {activeFilter !== FILTER_TYPES.ALL && (
                <View className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <Text
                    className="text-sm"
                    style={{
                      color:
                        activeFilter === FILTER_TYPES.REGULAR
                          ? "#1E40AF"
                          : "#5B21B6",
                    }}
                  >
                    {activeFilter === FILTER_TYPES.REGULAR
                      ? "📋 Showing only regular NCRs (not in 8D process)"
                      : "🔍 Showing only NCRs in 8D process"}
                  </Text>
                </View>
              )}
            </Card>

            {/* NCR Table Section */}
            <Card className="mb-6 overflow-hidden">
              <View className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex-row justify-between items-center flex-wrap gap-4">
                <View>
                  <Text className="text-base font-bold text-[#000000]">
                    {activeFilter === FILTER_TYPES.REGULAR && "Regular NCRs"}
                    {activeFilter === FILTER_TYPES.EIGHT_D && "8D Process NCRs"}
                    {activeFilter === FILTER_TYPES.ALL && "All NCRs"}
                  </Text>
                  <Text className="mt-1 text-sm text-[#6B7280]">
                    {filteredNCRs.length} NCR
                    {filteredNCRs.length !== 1 ? "s" : ""} found
                  </Text>
                </View>
                <View className="relative w-full max-w-[320px]">
                  <View className="absolute z-10 -translate-y-1/2 left-3 top-1/2">
                    <Feather name="search" size={16} color="#94A3B8" />
                  </View>
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search NCR, department, auditor..."
                    placeholderTextColor="#94A3B8"
                    className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-[#1F2937]"
                    style={{ fontFamily: FONT_FAMILY }}
                  />
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View className="min-w-[1000px]">
                  <View className="flex-row bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3">
                    {[
                      { label: "NCR No.", width: "w-[150px]" },
                      { label: "Department", width: "w-[165px]" },
                      { label: "Auditor", width: "w-[190px]" },
                      { label: "Auditee", width: "w-[190px]" },
                      { label: "Status", width: "w-[190px]" },
                      { label: "Audit Score", width: "w-[190px]" },
                      { label: "Action", width: "w-[220px]" },
                    ].map((col) => (
                      <View key={col.label} className={`${col.width} px-2`}>
                        <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                          {col.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {filteredNCRs.length > 0 ? (
                    filteredNCRs.map((ncr: any) => (
                      <View
                        key={ncr.id}
                        className="flex-row border-b border-[#E2E8F0] px-6 py-4 items-center"
                      >
                        {/* NCR No. */}
                        <View className="w-[150px] px-2">
                          <Text
                            className="text-sm font-semibold text-[#1F2937]"
                            numberOfLines={1}
                          >
                            {ncr.ncrNumber || `NCR ${ncr.id}`}
                          </Text>
                        </View>

                        {/* Department */}
                        <View className="w-[165px] px-2">
                          <Text
                            className="text-sm text-[#6B7280]"
                            numberOfLines={1}
                          >
                            {ncr.department || "-"}
                          </Text>
                        </View>

                        {/* Auditor */}
                        <View className="w-[190px] px-2">
                          <Text
                            className="text-sm text-[#6B7280]"
                            numberOfLines={1}
                          >
                            {ncr.auditorName || "-"}
                          </Text>
                        </View>

                        {/* Auditee */}
                        <View className="w-[190px] px-2">
                          <Text
                            className="text-sm text-[#6B7280]"
                            numberOfLines={1}
                          >
                            {ncr.auditeeName || "-"}
                          </Text>
                        </View>

                        {/* Status */}
                        <View className="w-[190px] px-2">
                          <View className="flex-row flex-wrap items-center gap-1.5">
                            <StatusBadge status={ncr.status} />
                            {is8DRelated(ncr) && (
                              <View className="flex-row items-center px-2 py-0.5 rounded-full border border-[#DDD6FE] bg-[#F5F3FF]">
                                <Text className="text-[11px] font-semibold text-[#5B21B6]">
                                  🔄 8D
                                </Text>
                              </View>
                            )}
                            {ncr.auditScore < 70 &&
                              ncr.status === "APPROVED" &&
                              !ncr.requires8D && (
                                <View className="flex-row items-center px-2 py-0.5 rounded-full border border-[#FECACA] bg-[#FEF2F2]">
                                  <Text className="text-[11px] font-semibold text-[#991B1B]">
                                    ⚠️ Needs 8D
                                  </Text>
                                </View>
                              )}
                          </View>
                        </View>

                        {/* Audit Score */}
                        <View className="w-[190px] px-2">
                          {ncr.auditScore != null ? (
                            <Text
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  ncr.auditScore >= 70 ? T.success : T.error,
                              }}
                            >
                              {ncr.auditScore}%
                            </Text>
                          ) : (
                            <Text className="text-sm text-[#6B7280]">-</Text>
                          )}
                        </View>

                        {/* Action */}
                        <View className="w-[220px] px-2 flex-row items-center gap-2">
                          <Pressable
                            // ✅ UPDATED: Set the state to trigger the detail view
                            onPress={() => setViewingNcrId(ncr.id)}
                            className="w-8 h-8 rounded-md border border-[#DBEAFE] bg-[#EFF6FF] items-center justify-center"
                          >
                            {({ pressed }) => (
                              <Feather
                                name="eye"
                                size={14}
                                color={pressed ? "#FFF" : T.accent}
                              />
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => openNCRForum(ncr)}
                            className="h-8 px-3 rounded-md border border-[#DDD6FE] bg-[#F5F3FF] flex-row items-center gap-1.5"
                          >
                            {({ pressed }) => (
                              <>
                                <Feather
                                  name="message-square"
                                  size={12}
                                  color={pressed ? "#FFF" : "#5B21B6"}
                                />
                                <Text
                                  className="text-xs font-semibold"
                                  style={{
                                    color: pressed ? "#FFF" : "#5B21B6",
                                  }}
                                >
                                  Forum
                                </Text>
                              </>
                            )}
                          </Pressable>
                          {is8DRelated(ncr) && (
                            <Pressable
                              onPress={() => open8DForum(ncr)}
                              className="h-8 px-3 rounded-md border border-[#DBEAFE] bg-[#EFF6FF] flex-row items-center gap-1.5"
                            >
                              {({ pressed }) => (
                                <>
                                  <Feather
                                    name="message-square"
                                    size={12}
                                    color={pressed ? "#FFF" : "#1E40AF"}
                                  />
                                  <Text
                                    className="text-xs font-semibold"
                                    style={{
                                      color: pressed ? "#FFF" : "#1E40AF",
                                    }}
                                  >
                                    8D Forum
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}
                          {isAuditManager &&
                            ncr.status === "APPROVED" &&
                            ncr.auditScore < 70 &&
                            !ncr.requires8D &&
                            !is8DRelated(ncr) && (
                              <Pressable
                                onPress={() => handleSendTo8D(ncr)}
                                className="h-8 px-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] flex-row items-center gap-1.5"
                              >
                                {({ pressed }) => (
                                  <>
                                    <Feather
                                      name="send"
                                      size={12}
                                      color={pressed ? "#FFF" : "#991B1B"}
                                    />
                                    <Text
                                      className="text-xs font-semibold"
                                      style={{
                                        color: pressed ? "#FFF" : "#991B1B",
                                      }}
                                    >
                                      Send to 8D
                                    </Text>
                                  </>
                                )}
                              </Pressable>
                            )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className="items-center py-10">
                      <Text className="text-sm text-[#6B7280]">
                        {activeFilter === FILTER_TYPES.REGULAR &&
                          "No regular NCRs found."}
                        {activeFilter === FILTER_TYPES.EIGHT_D &&
                          "No NCRs in 8D process found."}
                        {activeFilter === FILTER_TYPES.ALL && "No NCRs found."}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </Card>
          </View>
        </ScrollView>

        {/* Send to 8D Confirmation Modal */}
        <Modal visible={showSendTo8DModal} transparent animationType="fade">
          <Pressable
            className="items-center justify-center flex-1 p-5 bg-black/30"
            onPress={() => {
              setShowSendTo8DModal(false);
              setSelectedNCR(null);
            }}
          >
            <Pressable
              className="bg-[#FFFFFF] rounded-2xl w-full max-w-[480px] shadow-lg border border-[#E2E8F0] overflow-hidden"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="p-6 border-b border-[#E2E8F0] flex-row items-center gap-4">
                <View className="w-11 h-11 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] items-center justify-center">
                  <Feather name="send" size={22} color={T.purple} />
                </View>
                <View>
                  <Text className="text-lg font-bold text-[#000000]">
                    Send to 8D Process
                  </Text>
                  <Text className="mt-1 text-sm text-[#6B7280]">
                    NCR #{selectedNCR?.ncrNumber}
                  </Text>
                </View>
              </View>

              <View className="p-6">
                {selectedNCR?.auditScore < 70 && (
                  <View className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-4">
                    <Text className="text-sm font-semibold text-[#991B1B]">
                      ⚠️ Audit Score: {selectedNCR.auditScore}% (Below 70%
                      threshold)
                    </Text>
                    <Text className="mt-1 text-sm text-[#991B1B] opacity-90">
                      This NCR requires 8D investigation.
                    </Text>
                  </View>
                )}
                <Text className="text-sm text-[#1F2937] mb-4">
                  Are you sure you want to send{" "}
                  <Text className="font-bold">
                    NCR #{selectedNCR?.ncrNumber}
                  </Text>{" "}
                  to the 8D process?
                </Text>
                <Text className="text-sm font-semibold text-[#000000] mb-2">
                  Comments (Optional)
                </Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  className="w-full p-3 text-sm rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#1F2937]"
                  style={{ fontFamily: FONT_FAMILY, textAlignVertical: "top" }}
                  placeholder="Add any comments about why this needs 8D investigation..."
                  placeholderTextColor="#94A3B8"
                  value={sendTo8DComment}
                  onChangeText={setSendTo8DComment}
                />
              </View>

              <View className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex-row justify-end gap-3">
                <Pressable
                  onPress={() => {
                    setShowSendTo8DModal(false);
                    setSelectedNCR(null);
                  }}
                  className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] justify-center"
                >
                  <Text className="text-sm font-semibold text-[#1F2937]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmSendTo8D}
                  disabled={processingAction}
                  className="h-10 px-5 rounded-lg bg-[#8B5CF6] flex-row items-center gap-2 justify-center"
                  style={{ opacity: processingAction ? 0.7 : 1 }}
                >
                  {processingAction && <Spinner size={16} color="#FFF" />}
                  <Feather name="send" size={16} color="#FFF" />
                  <Text className="text-sm font-semibold text-[#FFFFFF]">
                    Send to 8D
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* NCR Forum Modal */}
       {/* NCR Forum Modal */}
        {/* NCR Forum Modal */}
        {selectedNCRForForum && (
          <AuditCheckSheetNCRForumModal
            auditId={selectedNCRForForum.id}
            auditNumber={selectedNCRForForum.ncrNumber}
            auditTitle={`NCR #${selectedNCRForForum.ncrNumber} Discussion`}
            auditStatus={selectedNCRForForum.status}
            auditType="NCR Resolution"
            department={selectedNCRForForum.department}
            auditorId={selectedNCRForForum.auditorId}
            auditorName={selectedNCRForForum.auditorName}
            auditeeId={selectedNCRForForum.auditeeId}
            auditeeName={selectedNCRForForum.auditeeName}
            hodEmail={null}
            hodName={null}
            memberEmails={selectedNCRForForum.memberEmails || []}
            isOpen={showForumModal}
            onClose={() => {
              setShowForumModal(false);
              setSelectedNCRForForum(null);
            }}
            currentUser={user}
            allUsers={allUsersList}
          />
        )}
        {/* 8D Forum Drawer */}
        <Modal visible={show8DForumDrawer} transparent animationType="slide">
          <View className="flex-1 bg-black/30">
            <Pressable
              className="flex-1"
              onPress={() => {
                setShow8DForumDrawer(false);
                setSelected8DNCR(null);
                setEightDTeamMembers([]);
              }}
            />
            <View className="w-full sm:w-1/2 h-full bg-[#F8FAFC] border-l border-[#E2E8F0] shadow-2xl">
              {selected8DNCR && (
                <View className="flex-1">
                  {loadingTeamMembers ? (
                    <View className="items-center justify-center flex-1">
                      <Spinner size={24} color={T.accent} />
                      <Text className="ml-3 text-sm text-[#6B7280]">
                        Loading team members...
                      </Text>
                    </View>
                  ) : (
                    <ForumThreadView
                      groupId={`8D-${selected8DNCR.ncrNumber}`}
                      groupName={`8D-${selected8DNCR.ncrNumber}`}
                      isInDrawer={true}
                      setForumDrawerOpen={setShow8DForumDrawer}
                      username={user?.email || user?.username || "Unknown"}
                      currentUser={user}
                      allUsers={allUsersList}
                      memberEmails={eightDTeamMembers}
                      onBack={() => setShow8DForumDrawer(false)}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NCRDashboard;
