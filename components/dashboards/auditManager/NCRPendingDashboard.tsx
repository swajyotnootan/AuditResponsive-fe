import AuditCheckSheetNCRForumModal from "@/components/modals/AuditCheckSheetNCRForumModal";
import { API_BASE_URL } from "@/config/apiConfig";
import { ncrService } from "@/services/ncrService";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

import Form8DetailView from "../auditee/Form8DetailView";

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

// ─────────────────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────────────────

export interface NcrType {
  id: string | number;
  ncrNumber?: string;
  status: string;
  updatedAt?: string;
  createdAt?: string;
  ncr2SubmittedAt?: string;
  ncr2CorrectiveAction?: string;
  department?: string;
  closedAt?: string;
  ncr2ClosedAt?: string;
  rootCause?: string;
  correction?: string;
  correctiveAction?: string;
  ncr2RootCause?: string;
  ncr2Correction?: string;
  horizontalDeployment?: string;
  ncr2HorizontalDeployment?: string;
  auditeeReviewComment?: string;
  managerReviewComment?: string;
  statementOfNonconformity?: string;
  auditorId?: string;
  auditeeId?: string;
  auditorName?: string;
  auditeeName?: string;
  severity?: string;
}

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    AWAITING_AUDITEE: "Awaiting Auditee",
    OPEN: "Pending Approval",
    APPROVED: "Ready for Action",
    IN_PROGRESS: "Submitted - Pending Verification",
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

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB");
};

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
    className={`rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm ${className}`}
  >
    {children}
  </View>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<
    string,
    { label: string; bg: string; color: string; border: string }
  > = {
    IN_PROGRESS: {
      label: "Pending Verification",
      bg: "#F5F3FF",
      color: "#5B21B6",
      border: "#DDD6FE",
    },
    CLOSED: {
      label: "Closed",
      bg: "#ECFDF5",
      color: "#065F46",
      border: "#A7F3D0",
    },
    REJECTED: {
      label: "Rejected",
      bg: "#FEF2F2",
      color: "#991B1B",
      border: "#FECACA",
    },
    READY_FOR_NCR2: {
      label: "Ready for NCR2",
      bg: "#EFF6FF",
      color: "#1E40AF",
      border: "#DBEAFE",
    },
    NCR2_IN_PROGRESS: {
      label: "NCR2 Pending Verification",
      bg: "#F5F3FF",
      color: "#5B21B6",
      border: "#DDD6FE",
    },
    NCR2_COMPLETED: {
      label: "NCR2 Completed",
      bg: "#ECFDF5",
      color: "#065F46",
      border: "#A7F3D0",
    },
    AWAITING_AUDITEE: {
      label: "Awaiting Auditee",
      bg: "#FFFBEB",
      color: "#92400E",
      border: "#FDE68A",
    },
    OPEN: {
      label: "Pending Approval",
      bg: "#EFF6FF",
      color: "#1E40AF",
      border: "#DBEAFE",
    },
    APPROVED: {
      label: "Ready for Action",
      bg: "#EFF6FF",
      color: "#1E40AF",
      border: "#DBEAFE",
    },
    SENT_TO_8D: {
      label: "Sent to 8D",
      bg: "#F5F3FF",
      color: "#5B21B6",
      border: "#DDD6FE",
    },
    IN_8D_PROCESS: {
      label: "In 8D Process",
      bg: "#F5F3FF",
      color: "#5B21B6",
      border: "#DDD6FE",
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
      className="rounded-full border px-2.5 py-1.5"
      style={{
        backgroundColor: bg,
        borderColor: border,
        alignSelf: "flex-start",
      }}
    >
      <Text className="text-xs font-medium" style={{ color }}>
        {label}
      </Text>
    </View>
  );
};

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
  <Card className="m-2 p-5">
    <View className="flex-row items-start justify-between">
      <View>
        <Text className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          {title}
        </Text>
        <Text className="mt-2 text-3xl font-bold" style={{ color }}>
          {value}
        </Text>
      </View>
      {iconName && (
        <View
          className="h-10 w-10 items-center justify-center rounded-lg border"
          style={{ backgroundColor: bg, borderColor: border }}
        >
          <Feather name={iconName as any} size={20} color={color} />
        </View>
      )}
    </View>
  </Card>
);

const ActionButton = ({
  onPress,
  children,
  variant = "primary",
  iconName,
  disabled = false,
  title,
}: {
  onPress: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  iconName?: string;
  disabled?: boolean;
  title?: string;
}) => {
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`h-9 flex-row items-center justify-center rounded-lg border px-4 ${isPrimary ? "border-transparent" : "border-[#E2E8F0]"}`}
      style={{
        backgroundColor: disabled ? "#F1F5F9" : isPrimary ? T.accent : T.card,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {iconName && (
        <Feather
          name={iconName as any}
          size={14}
          color={disabled ? "#94A3B8" : isPrimary ? "#FFF" : T.textValue}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        className="text-sm font-semibold"
        style={{
          color: disabled ? "#94A3B8" : isPrimary ? "#FFF" : T.textValue,
        }}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const SectionCard = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Card className="mb-6 overflow-hidden">
    <View className="flex-row items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
      <View>
        <Text className="text-base font-bold text-[#000000]">{title}</Text>
        {subtitle && (
          <Text className="mt-1 text-sm text-[#6B7280]">{subtitle}</Text>
        )}
      </View>
      {action}
    </View>
    <View>{children}</View>
  </Card>
);

const EmptyState = ({
  iconName,
  title,
  description,
}: {
  iconName?: string;
  title: string;
  description?: string;
}) => (
  <View className="items-center p-10">
    <View className="mb-4 h-12 w-12 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F1F5F9]">
      {iconName && <Feather name={iconName as any} size={24} color="#94A3B8" />}
    </View>
    <Text className="mb-2 text-base font-semibold text-[#000000]">{title}</Text>
    {description && (
      <Text
        className="text-center text-sm text-[#6B7280]"
        style={{ maxWidth: 300 }}
      >
        {description}
      </Text>
    )}
  </View>
);

// ─────────────────────────────────────────────────────────────
// Verification Row Component
// ─────────────────────────────────────────────────────────────

const VerificationRow = ({
  ncr,
  onVerify,
  onView,
  onOpenForum,
}: {
  ncr: NcrType;
  onVerify: (ncr: NcrType) => void;
  onView: (ncr: NcrType) => void;
  onOpenForum: (ncr: NcrType) => void;
}) => {
  const isNCR2 = ncr.status === "NCR2_IN_PROGRESS" || ncr.ncr2CorrectiveAction;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <Pressable
      className={`border-b border-[#E2E8F0] ${isDesktop ? "flex-row px-6 py-4" : "px-4 py-3"}`}
      style={({ pressed }) => [
        { backgroundColor: pressed ? "#F8FAFC" : "transparent" },
      ]}
    >
      {isDesktop ? (
        /* Desktop Layout - 4 columns in 1 row */
        <>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              className="text-sm font-semibold text-[#1F2937]"
              style={{ fontFamily: "monospace" }}
            >
              {ncr.ncrNumber || `NCR #${ncr.id}`}
            </Text>
            {isNCR2 && (
              <Text className="mt-1 text-[11px] font-semibold text-[#8B5CF6]">
                (NCR2 Mode)
              </Text>
            )}
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Feather
              name="calendar"
              size={14}
              color="#94A3B8"
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm text-[#6B7280]">
              {formatDate(ncr.updatedAt || ncr.ncr2SubmittedAt)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <StatusBadge status={ncr.status} />
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {ncr.status === "IN_PROGRESS" ||
            ncr.status === "NCR2_IN_PROGRESS" ? (
              <ActionButton
                onPress={() => onVerify(ncr)}
                variant="primary"
                iconName="eye"
                title="View & Verify Corrective Action"
              >
                Verify
              </ActionButton>
            ) : (
              <ActionButton
                onPress={() => onView(ncr)}
                variant="secondary"
                iconName="eye"
                title="Preview Corrective Action"
              >
                Preview
              </ActionButton>
            )}
            <Pressable
              onPress={() => onOpenForum(ncr)}
              className="ml-4 h-8 flex-row items-center gap-1.5 rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-3"
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
          </View>
        </>
      ) : (
        /* Mobile Layout - 2 columns per row */
        <>
          {/* Row 1: NCR Number + Submitted On */}
          <View className="mb-3 flex-row">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                NCR Number
              </Text>
              <Text
                className="text-sm font-semibold text-[#1F2937]"
                style={{ fontFamily: "monospace" }}
              >
                {ncr.ncrNumber || `NCR #${ncr.id}`}
              </Text>
              {isNCR2 && (
                <Text className="mt-0.5 text-[10px] font-semibold text-[#8B5CF6]">
                  (NCR2 Mode)
                </Text>
              )}
            </View>
            <View style={{ width: "50%", paddingLeft: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Submitted On
              </Text>
              <View className="flex-row items-center">
                <Feather
                  name="calendar"
                  size={12}
                  color="#94A3B8"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-sm text-[#6B7280]">
                  {formatDate(ncr.updatedAt || ncr.ncr2SubmittedAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View className="mb-3 h-px bg-[#E2E8F0]" />

          {/* Row 2: Status + Action */}
          <View className="flex-row items-center">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Status
              </Text>
              <StatusBadge status={ncr.status} />
            </View>
            <View
              style={{
                width: "50%",
                paddingLeft: 4,
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {ncr.status === "IN_PROGRESS" ||
              ncr.status === "NCR2_IN_PROGRESS" ? (
                <ActionButton
                  onPress={() => onVerify(ncr)}
                  variant="primary"
                  iconName="eye"
                >
                  Verify
                </ActionButton>
              ) : (
                <ActionButton
                  onPress={() => onView(ncr)}
                  variant="secondary"
                  iconName="eye"
                >
                  Preview
                </ActionButton>
              )}
              <TouchableOpacity
                onPress={() => onOpenForum(ncr)}
                className="ml-2 h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF]"
              >
                <Feather name="message-square" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────
// Closed Row Component
// ─────────────────────────────────────────────────────────────

const ClosedRow = ({
  ncr,
  onView,
  onOpenForum,
}: {
  ncr: NcrType;
  onView: (ncr: NcrType) => void;
  onOpenForum: (ncr: NcrType) => void;
}) => {
  const isNCR2 = ncr.status === "NCR2_COMPLETED";
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <Pressable
      className={`border-b border-[#E2E8F0] ${isDesktop ? "flex-row px-6 py-4" : "px-4 py-3"}`}
      style={({ pressed }) => [
        { backgroundColor: pressed ? "#F8FAFC" : "transparent" },
      ]}
    >
      {isDesktop ? (
        /* Desktop Layout */
        <>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              className="text-sm font-semibold text-[#1F2937]"
              style={{ fontFamily: "monospace" }}
            >
              {ncr.ncrNumber || `NCR #${ncr.id}`}
            </Text>
            {isNCR2 && (
              <Text className="mt-1 text-[11px] font-semibold text-[#8B5CF6]">
                (NCR2)
              </Text>
            )}
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Feather
              name="users"
              size={14}
              color="#94A3B8"
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm text-[#6B7280]">
              {ncr.department || "—"}
            </Text>
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <Feather
              name="calendar"
              size={14}
              color="#94A3B8"
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm text-[#6B7280]">
              {formatDate(ncr.closedAt || ncr.ncr2ClosedAt)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <ActionButton
              onPress={() => onView(ncr)}
              variant="secondary"
              iconName="eye"
            >
              View
            </ActionButton>
            <TouchableOpacity
              onPress={() => onOpenForum(ncr)}
              className="ml-2 h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF]"
            >
              <Feather name="message-square" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Mobile Layout - 2 columns per row */
        <>
          <View className="mb-3 flex-row">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                NCR Number
              </Text>
              <Text
                className="text-sm font-semibold text-[#1F2937]"
                style={{ fontFamily: "monospace" }}
              >
                {ncr.ncrNumber || `NCR #${ncr.id}`}
              </Text>
              {isNCR2 && (
                <Text className="mt-0.5 text-[10px] font-semibold text-[#8B5CF6]">
                  (NCR2)
                </Text>
              )}
            </View>
            <View style={{ width: "50%", paddingLeft: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Department
              </Text>
              <View className="flex-row items-center">
                <Feather
                  name="users"
                  size={12}
                  color="#94A3B8"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-sm text-[#6B7280]">
                  {ncr.department || "—"}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-3 h-px bg-[#E2E8F0]" />

          <View className="flex-row items-center">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Closed On
              </Text>
              <View className="flex-row items-center">
                <Feather
                  name="calendar"
                  size={12}
                  color="#94A3B8"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-sm text-[#6B7280]">
                  {formatDate(ncr.closedAt || ncr.ncr2ClosedAt)}
                </Text>
              </View>
            </View>
            <View
              style={{
                width: "50%",
                paddingLeft: 4,
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <ActionButton
                onPress={() => onView(ncr)}
                variant="secondary"
                iconName="eye"
              >
                View
              </ActionButton>
              <TouchableOpacity
                onPress={() => onOpenForum(ncr)}
                className="ml-2 h-8 w-8 items-center justify-center rounded-lg border border-[#DDD6FE] bg-[#F5F3FF]"
              >
                <Feather name="message-square" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
};

// ─────────────────────────────────────────────────────────────
// Verify Modal Component (Responsive, 80% Height, Fixed Input Visibility)
// ─────────────────────────────────────────────────────────────

const VerifyModal = ({
  ncr,
  onClose,
  onVerify,
  loading,
}: {
  ncr: NcrType | null;
  onClose: () => void;
  onVerify: (accepted: boolean, comment: string) => void;
  loading: boolean;
}) => {
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"accept" | "reject" | null>(null);
  const isNCR2 = ncr?.status === "NCR2_IN_PROGRESS";

  // ✅ Detect mobile screen for responsive layout
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleVerify = (accepted: boolean) => {
    if (!accepted && !comment.trim()) {
      Alert.alert(
        "Missing Information",
        "Please provide a reason for rejection",
      );
      return;
    }
    setDecision(accepted ? "accept" : "reject");
    onVerify(accepted, comment);
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <View
        className="flex-1 items-center justify-center bg-black/40"
        style={{ padding: isMobile ? 0 : 16 }}
      >
        <View
          className="w-full border border-[#DBEAFE] bg-white shadow-lg"
          style={{
            maxWidth: 700,
            // ✅ Strictly 80% height for mobile as requested
            height: isMobile ? "80%" : "auto",
            maxHeight: isMobile ? "80%" : "90%",
            borderRadius: isMobile ? 12 : 16,
            overflow: "hidden",
            flexDirection: "column", // 👈 CRITICAL: Ensures flex-1 children calculate correctly
          }}
        >
          {/* Header */}
          <View
            className={`flex-row items-center justify-between border-b border-[#E2E8F0] bg-[#EFF6FF] ${isMobile ? "px-4 py-3" : "px-8 py-6"}`}
          >
            <View
              className="flex-row items-center"
              style={{ gap: isMobile ? 8 : 16 }}
            >
              <View
                className={`items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] ${isMobile ? "h-9 w-9" : "h-11 w-11"}`}
              >
                <Feather name="eye" size={isMobile ? 18 : 22} color="#8B5CF6" />
              </View>
              <View>
                <Text
                  className={`font-bold text-[#000000] ${isMobile ? "text-base" : "text-lg"}`}
                >
                  {decision === "accept"
                    ? "Accepting..."
                    : decision === "reject"
                      ? "Rejecting..."
                      : `Verify ${isNCR2 ? "NCR2" : "Action"}`}
                </Text>
                <Text
                  className={`text-[#6B7280] ${isMobile ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}
                >
                  NCR #{ncr?.ncrNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white"
            >
              <Feather name="x" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{
              gap: isMobile ? 12 : 20,
              paddingBottom: isMobile ? 40 : 8, // 👈 Extra bottom padding so input isn't cut off or hidden by keyboard
            }}
            style={{
              flex: 1, // 👈 Explicitly enforce flex: 1 to take remaining space
              paddingHorizontal: isMobile ? 16 : 32,
              paddingVertical: isMobile ? 16 : 24,
            }}
          >
            {/* NCR Summary */}
            <View
              className={`rounded-xl border border-[#E2E8F0] bg-[#EFF6FF] ${isMobile ? "p-3" : "p-5"}`}
            >
              <View className="mb-2 flex-row items-center">
                <Feather
                  name="file-text"
                  size={16}
                  color="#00529B"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-sm font-bold text-[#000000]">
                  NCR Summary
                </Text>
              </View>
              <View className="flex-row flex-wrap">
                <View
                  className={`${isMobile ? "mb-2 w-full" : "mb-3 w-1/2 pr-2"}`}
                >
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Status
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {getStatusLabel(ncr?.status || "")}
                  </Text>
                </View>
                <View
                  className={`${isMobile ? "mb-2 w-full" : "mb-3 w-1/2 pl-2"}`}
                >
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Department
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.department || "-"}
                  </Text>
                </View>
                <View
                  className={`${isMobile ? "mb-2 w-full" : "mb-3 w-1/2 pr-2"}`}
                >
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Auditee
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.auditeeName || "-"}
                  </Text>
                </View>
                <View
                  className={`${isMobile ? "mb-2 w-full" : "mb-3 w-1/2 pl-2"}`}
                >
                  <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Auditor
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.auditorName || "-"}
                  </Text>
                </View>
              </View>
              <View className="mt-2">
                <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Statement
                </Text>
                <Text
                  className="text-sm text-[#1F2937]"
                  style={{ lineHeight: 20 }}
                >
                  {ncr?.statementOfNonconformity?.substring(
                    0,
                    isMobile ? 120 : 200, // Slightly shorter on mobile to save space
                  )}
                  {(ncr?.statementOfNonconformity?.length ?? 0) >
                  (isMobile ? 120 : 200)
                    ? "..."
                    : ""}
                </Text>
              </View>
            </View>

            {/* Corrective Action Details */}
            <View
              className={`rounded-xl border p-4 ${isNCR2 ? "border-[#DDD6FE] bg-[#EFF6FF]" : "border-[#DDD6FE] bg-[#EFF6FF]"}`}
            >
              <View className="mb-3 flex-row items-center">
                <Feather
                  name="check-circle"
                  size={16}
                  color={isNCR2 ? "#1E3A8A" : "#6D28D9"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  className="text-sm font-bold"
                  style={{ color: isNCR2 ? "#1E3A8A" : "#6D28D9" }}
                >
                  {isNCR2 ? "NCR2 Corrective Action" : "Corrective Action"}
                </Text>
              </View>
              <View className="flex-row flex-wrap">
                {[
                  {
                    label: "Root Cause",
                    value: isNCR2 ? ncr?.ncr2RootCause : ncr?.rootCause,
                  },
                  {
                    label: "Correction",
                    value: isNCR2 ? ncr?.ncr2Correction : ncr?.correction,
                  },
                  {
                    label: "Corrective Action",
                    value: isNCR2
                      ? ncr?.ncr2CorrectiveAction
                      : ncr?.correctiveAction,
                  },
                  {
                    label: "Horizontal Deployment",
                    value: isNCR2
                      ? ncr?.ncr2HorizontalDeployment
                      : ncr?.horizontalDeployment,
                  },
                ].map(({ label, value }, index) => (
                  <View
                    key={label}
                    className={`${isMobile ? "mb-3 w-full" : `w-1/2 ${index % 2 === 0 ? "pr-2" : "pl-2"} mb-4`}`}
                  >
                    <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      {label}
                    </Text>
                    <View
                      className="justify-center rounded-lg border border-[#E2E8F0] bg-white p-2.5"
                      style={{ minHeight: 40 }}
                    >
                      <Text className="text-sm text-[#1F2937]">
                        {value || (
                          <Text className="italic text-[#CBD5E1]">
                            Not provided
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Previous Comments */}
            {(ncr?.auditeeReviewComment || ncr?.managerReviewComment) && (
              <View className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <View className="mb-2 flex-row items-center">
                  <Feather
                    name="message-square"
                    size={16}
                    color="#1E3A8A"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-sm font-bold text-[#1E3A8A]">
                    Previous Comments
                  </Text>
                </View>
                {ncr?.auditeeReviewComment && (
                  <View className="mb-3">
                    <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Auditee Review
                    </Text>
                    <View className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                      <Text className="text-sm text-[#1F2937]">
                        {ncr.auditeeReviewComment}
                      </Text>
                    </View>
                  </View>
                )}
                {ncr?.managerReviewComment && (
                  <View>
                    <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                      Manager Review
                    </Text>
                    <View className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                      <Text className="text-sm text-[#1F2937]">
                        {ncr.managerReviewComment}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Verification Comments */}
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#000000]">
                Verification Comments{" "}
                {!decision && <Text className="text-[#EF4444]">*</Text>}
              </Text>
              <TextInput
                multiline
                numberOfLines={isMobile ? 3 : 4} // 👈 Slightly fewer lines on mobile to save space
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-base text-[#1F2937]"
                style={{ textAlignVertical: "top" }}
                value={comment}
                onChangeText={setComment}
                placeholder={
                  decision === "reject"
                    ? "Reason for rejection (required)"
                    : "Add verification notes (optional)"
                }
              />
            </View>
          </ScrollView>

          {/* Footer: Responsive Layout */}
          <View
            className={`border-t border-[#E2E8F0] bg-[#F8FAFC] ${isMobile ? "p-4" : "px-8 py-5"}`}
          >
            <View
              className={isMobile ? "flex-col" : "flex-row items-start"}
              style={{ gap: isMobile ? 12 : 0 }}
            >
              {/* Info Box */}
              <View
                className={
                  isMobile
                    ? "mb-2 w-full rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3"
                    : "mr-4 flex-1 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4"
                }
              >
                <Text className="text-sm text-[#92400E]">
                  <Text className="font-bold">💡 Accept:</Text>{" "}
                  {isNCR2
                    ? "NCR2 will be marked COMPLETED."
                    : "NCR will be marked CLOSED."}
                  {"\n"}
                  <Text className="font-bold">Reject:</Text> Returns to Auditee
                  for rework.
                </Text>
              </View>

              {/* Buttons Container */}
              <View
                className={
                  isMobile ? "w-full flex-row" : "flex-row items-center"
                }
                style={{ gap: 12 }}
              >
                {/* Reject Button */}
                <TouchableOpacity
                  onPress={() => handleVerify(false)}
                  disabled={loading}
                  className={`h-11 flex-row items-center justify-center rounded-lg ${isMobile ? "flex-1 px-2" : "px-6"}`}
                  style={{
                    backgroundColor: loading ? "#FECACA" : "#EF4444",
                    opacity: loading ? 0.8 : 1,
                  }}
                >
                  {loading && decision === "reject" ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <Feather
                      name="x"
                      size={16}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text className="text-base font-semibold text-white">
                    Reject
                  </Text>
                </TouchableOpacity>

                {/* Accept Button */}
                <TouchableOpacity
                  onPress={() => handleVerify(true)}
                  disabled={loading}
                  className={`h-11 flex-row items-center justify-center rounded-lg ${isMobile ? "flex-1 px-2" : "px-6"}`}
                  style={{
                    backgroundColor: loading ? "#93C5FD" : "#00529B",
                    opacity: loading ? 0.8 : 1,
                  }}
                >
                  {loading && decision === "accept" ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <Feather
                      name="check-circle"
                      size={16}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text className="text-base font-semibold text-white">
                    Accept
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getNcrYear = (ncr: any): number | null => {
  const raw = ncr?.createdAt || ncr?.raisedDate || ncr?.dueDate;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRPendingDashboard = ({
  onBack,
  selectedYear, // 👈 ADD
}: {
  onBack?: () => void;
  selectedYear?: number; // 👈 ADD
}) => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions(); // ✅ ADD THIS
  const isDesktop = width >= 1024;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  // ✅ ADD THIS: State to trigger Form 8 Detail View inline
  const [activeForm8DetailConfig, setActiveForm8DetailConfig] =
    useState<any>(null);
  const [verificationQueue, setVerificationQueue] = useState<NcrType[]>([]);
  const [closedItems, setClosedItems] = useState<NcrType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedNCR, setSelectedNCR] = useState<NcrType | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const [showForumModal, setShowForumModal] = useState(false);
  const [selectedNCRForForum, setSelectedNCRForForum] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      setAllUsersList(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsersList([]);
    }
  };

  const loadData = async () => {
    if (!user?.id) return; // ✅ guard against user not loaded yet

    setLoading(true);
    setError(null);

    try {
      const [pendingResult, allResult] = await Promise.all([
        // ✅ Pass user.id so backend can plant-scope both endpoints
        ncrService.getPendingVerification(),
        ncrService.getAllNCRs(user.id),
      ]);

      // ✅ Helper: only keep NCRs from the selected year (safe: keeps NCRs with unknown year)
      const inSelectedYear = (ncr: any) => {
        if (!selectedYear) return true;
        const y = getNcrYear(ncr);
        return y === null || y === selectedYear;
      };

      if (!pendingResult.success) {
        setError(pendingResult.error);
        setVerificationQueue([]);
      } else {
        const allNcrs = allResult.success ? allResult.data : pendingResult.data;
        setVerificationQueue(
          (allNcrs as NcrType[])
            .filter(
              (ncr) =>
                (ncr.rootCause ||
                  ncr.correction ||
                  ncr.correctiveAction ||
                  ncr.ncr2RootCause ||
                  ncr.ncr2Correction ||
                  ncr.ncr2CorrectiveAction) &&
                ncr.status !== "CLOSED" &&
                ncr.status !== "REJECTED" &&
                ncr.status !== "NCR2_COMPLETED" &&
                (ncr.status === "IN_PROGRESS" ||
                  ncr.status === "NCR2_IN_PROGRESS"),
            )
            .filter(inSelectedYear) // 👈 ADD
            .sort(
              (a, b) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime(),
            ),
        );
      }

      if (allResult.success) {
        setClosedItems(
          (allResult.data as NcrType[])
            .filter(
              (ncr) =>
                (ncr.status === "CLOSED" || ncr.status === "NCR2_COMPLETED") &&
                (ncr.rootCause ||
                  ncr.correction ||
                  ncr.correctiveAction ||
                  ncr.ncr2RootCause ||
                  ncr.ncr2Correction ||
                  ncr.ncr2CorrectiveAction),
            )
            .filter(inSelectedYear), // 👈 ADD
        );
      }
    } catch (err) {
      setError("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    fetchAllUsers();
  }, [user?.id, selectedYear]);

  const handleVerify = async (accepted: boolean, comment: string) => {
    setVerifyLoading(true);

    try {
      if (!selectedNCR) return;

      let result;
      if (selectedNCR.status === "NCR2_IN_PROGRESS") {
        result = await ncrService.verifyNCR2(selectedNCR.id, accepted, comment);
      } else {
        result = await ncrService.verifyAndClose(
          selectedNCR.id,
          accepted,
          comment,
        );
      }

      if (!result.success) {
        setError(result.error);
      } else {
        setShowVerifyModal(false);
        setSelectedNCR(null);
        await loadData();
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  const openVerifyModal = (ncr: NcrType) => {
    setSelectedNCR(ncr);
    setShowVerifyModal(true);
  };

  const openNCRForum = (ncr: any) => {
    const auditor = allUsersList.find((u: any) => u.id === ncr.auditorId);
    const auditee = allUsersList.find((u: any) => u.id === ncr.auditeeId);

    const ncrPlantId =
      ncr.plantId ?? ncr.plant?.id ?? (user as any)?.plantId ?? null;
    const ncrPlantName =
      ncr.plantName ?? ncr.plant?.name ?? (user as any)?.plantName ?? null;

    const auditManager = allUsersList.find(
      (u: any) =>
        u.role === "AUDIT_MANAGER" &&
        (!ncrPlantId || String(u.plantId) === String(ncrPlantId)),
    );

    const memberEmails = [
      auditor?.email,
      auditee?.email,
      auditManager?.email,
      user?.email,
    ].filter(
      (e) =>
        !!e &&
        (!ncrPlantId ||
          allUsersList.some(
            (u: any) =>
              u.email === e && String(u.plantId) === String(ncrPlantId),
          ) ||
          e === user?.email),
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
      memberEmails,
      plantId: ncrPlantId,
      plantName: ncrPlantName,
    });
    setShowForumModal(true);
  };

  // ✅ ADD THIS: Render function for Form 8 Detail View
  const renderActiveForm8Detail = () => {
    if (!activeForm8DetailConfig) return null;
    return (
      <Form8DetailView
        initialParams={activeForm8DetailConfig}
        onClose={() => {
          setActiveForm8DetailConfig(null);
          loadData(); // ✅ Refreshes the dashboard data when returning
        }}
      />
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator
          size="large"
          color="#8B5CF6"
          style={{ marginBottom: 16 }}
        />
        <Text className="text-base font-semibold text-[#000000]">
          Loading verification queue...
        </Text>
        <Text className="mt-1.5 text-sm text-[#6B7280]">
          Fetching submitted corrective actions
        </Text>
      </View>
    );
  }

  return activeForm8DetailConfig ? (
    renderActiveForm8Detail()
  ) : (
    <View className="flex-1 bg-[#F8FAFC]">
      {/* ✅ FULL-WIDTH HEADER (Moved outside ScrollView to span edge-to-edge) */}
      <View className="w-full border-b border-[#E2E8F0] bg-white px-4 py-5 shadow-sm">
        {/* Inner wrapper to keep the text aligned with the 1400px content below */}
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View
            className="flex-row flex-wrap items-center justify-between"
            style={{ gap: 16 }}
          >
            <View style={{ flex: 1, minWidth: 200 }}>
              <View className="flex-row items-center" style={{ gap: 12 }}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (onBack) {
                      onBack();
                    } else {
                      navigation.goBack();
                    }
                  }}
                  className="h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white"
                >
                  <Feather name="arrow-left" size={18} color="#6B7280" />
                </TouchableOpacity>

                {/* Title & User Info */}
                <View>
                  <Text className="text-xl font-bold text-[#1E293B]">
                    Corrective Action Verification
                  </Text>
                  <Text className="mt-1 text-sm text-[#64748B]">
                    Welcome back,{" "}
                    <Text className="font-semibold text-[#334155]">
                      {user?.name || user?.username || "User"}
                    </Text>
                    <Text className="text-[#CBD5E1]"> | </Text>
                    <Text className="font-medium text-[#00529B]">
                      Dept: {user?.department || "N/A"}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Refresh Button */}
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={loadData}
                disabled={loading}
                className="flex-row items-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 shadow-sm"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color="#00529B"
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={16}
                    color="#475569"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text className="text-sm font-semibold text-[#334155]">
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ✅ SCROLLABLE CONTENT (Aligned to maxWidth 1400) */}
      <ScrollView className="flex-1">
        <View className="mx-auto w-full p-4" style={{ maxWidth: 1400 }}>
          {/* Error Alert */}
          {error && (
            <View
              className="mb-6 flex-row rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4"
              style={{ gap: 12 }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg border border-[#FECACA] bg-white">
                <Feather name="alert-circle" size={18} color="#EF4444" />
              </View>
              <View className="flex-1 justify-center">
                <Text className="text-sm font-semibold text-[#991B1B]">
                  Error
                </Text>
                <Text className="mt-1 text-sm text-[#991B1B] opacity-90">
                  {error}
                </Text>
              </View>
            </View>
          )}

          {/* Stat Cards */}
          <View
            className={`mb-6 flex-row flex-wrap ${isDesktop ? "" : "-mx-2"}`}
          >
            <View className={`${isDesktop ? "flex-1" : "w-1/2 px-2"} mb-4`}>
              <StatCard
                title="Total Pending"
                value={verificationQueue.length}
                iconName="clock"
                color="#8B5CF6"
                bg="#F5F3FF"
                border="#DDD6FE"
              />
            </View>
            <View className={`${isDesktop ? "flex-1" : "w-1/2 px-2"} mb-4`}>
              <StatCard
                title="Ready to Close"
                value={
                  verificationQueue.filter(
                    (ncr) =>
                      ncr.status === "IN_PROGRESS" ||
                      ncr.status === "NCR2_IN_PROGRESS",
                  ).length
                }
                iconName="check-circle"
                color="#3B82F6"
                bg="#EFF6FF"
                border="#DBEAFE"
              />
            </View>
            <View className={`${isDesktop ? "flex-1" : "w-1/2 px-2"} mb-4`}>
              <StatCard
                title="NCR2 Pending"
                value={
                  verificationQueue.filter(
                    (ncr) => ncr.status === "NCR2_IN_PROGRESS",
                  ).length
                }
                iconName="clock"
                color="#6D28D9"
                bg="#F5F3FF"
                border="#DDD6FE"
              />
            </View>
            <View className={`${isDesktop ? "flex-1" : "w-1/2 px-2"} mb-4`}>
              <StatCard
                title="Closed NCRs"
                value={closedItems.length}
                iconName="check-circle"
                color="#10B981"
                bg="#ECFDF5"
                border="#A7F3D0"
              />
            </View>
          </View>

          {/* Verification Queue Section */}
          <SectionCard
            title="Submitted Corrective Actions"
            subtitle="Review corrective actions with current status and preview history"
            action={
              verificationQueue.length > 0 ? (
                <View className="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-1">
                  <Text className="text-xs font-semibold text-[#6B7280]">
                    {
                      verificationQueue.filter(
                        (ncr) =>
                          ncr.status === "IN_PROGRESS" ||
                          ncr.status === "NCR2_IN_PROGRESS",
                      ).length
                    }{" "}
                    pending
                  </Text>
                </View>
              ) : null
            }
          >
            <View
              className={`flex-row border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3 ${isDesktop ? "" : "flex-wrap"}`}
            >
              <View
                style={
                  isDesktop
                    ? { flex: 1, paddingRight: 8 }
                    : { width: "50%", paddingRight: 8, marginBottom: 8 }
                }
              >
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  NCR Number
                </Text>
              </View>
              <View
                style={
                  isDesktop ? { flex: 1 } : { width: "50%", marginBottom: 8 }
                }
              >
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Submitted On
                </Text>
              </View>
              {!isDesktop && (
                <View
                  style={{
                    width: "100%",
                    height: 1,
                    backgroundColor: "#E2E8F0",
                    marginVertical: 4,
                  }}
                />
              )}
              <View
                style={
                  isDesktop ? { flex: 1 } : { width: "50%", marginBottom: 8 }
                }
              >
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Status
                </Text>
              </View>
              <View
                style={
                  isDesktop
                    ? { flex: 1, alignItems: "flex-end" }
                    : { width: "50%" }
                }
              >
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Action
                </Text>
              </View>
            </View>

            <View style={{ maxHeight: 400 }}>
              {verificationQueue.length === 0 ? (
                <EmptyState
                  iconName="clock"
                  title="No corrective action records"
                  description="Submitted corrective actions will remain here with their current status."
                />
              ) : (
                verificationQueue.map((ncr) => (
                  <VerificationRow
                    key={ncr.id}
                    ncr={ncr}
                    onVerify={openVerifyModal}
                    onView={(item) =>
                      navigation.navigate("Form8View", {
                        id: item.id,
                        type:
                          item.status === "NCR2_IN_PROGRESS" ? "ncr2" : "ncr1",
                      })
                    }
                    onOpenForum={openNCRForum}
                  />
                ))
              )}
            </View>
          </SectionCard>

          {/* Closed History Section */}
          <SectionCard
            title="Closed NCR History"
            subtitle="Approved corrective actions that have been closed"
            action={
              closedItems.length > 0 ? (
                <View className="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-1">
                  <Text className="text-xs font-semibold text-[#6B7280]">
                    {closedItems.length} closed
                  </Text>
                </View>
              ) : null
            }
          >
            <View className="flex-row border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3">
              <View style={{ flex: 2, paddingRight: 8 }}>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  NCR Number
                </Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Department
                </Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Closed On
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#000000]">
                  Action
                </Text>
              </View>
            </View>

            <View style={{ maxHeight: 300 }}>
              {closedItems.length === 0 ? (
                <EmptyState
                  iconName="check-circle"
                  title="No closed NCRs yet"
                  description="Verified NCRs will appear here once closed."
                />
              ) : (
                closedItems.map((ncr) => (
                  <ClosedRow
                    key={ncr.id}
                    ncr={ncr}
                    onView={(n) => {
                      setActiveForm8DetailConfig({
                        id: n.id,
                        type: n.status === "NCR2_COMPLETED" ? "ncr2" : "ncr1",
                      });
                    }}
                    onOpenForum={openNCRForum}
                  />
                ))
              )}
            </View>
          </SectionCard>
        </View>
      </ScrollView>

      {/* Verify Modal */}
      {showVerifyModal && selectedNCR && (
        <VerifyModal
          ncr={selectedNCR}
          onClose={() => {
            setShowVerifyModal(false);
            setSelectedNCR(null);
          }}
          onVerify={handleVerify}
          loading={verifyLoading}
        />
      )}

      {showForumModal && selectedNCRForForum && (
        <AuditCheckSheetNCRForumModal
          auditId={selectedNCRForForum.id}
          auditNumber={selectedNCRForForum.ncrNumber}
          auditTitle={`NCR #${selectedNCRForForum.ncrNumber}`}
          auditStatus={selectedNCRForForum.status}
          auditType={`NCR - ${selectedNCRForForum.department}`}
          department={selectedNCRForForum.department}
          auditorId={selectedNCRForForum.auditorId}
          auditorName={selectedNCRForForum.auditorName}
          auditeeId={selectedNCRForForum.auditeeId}
          auditeeName={selectedNCRForForum.auditeeName}
          hodEmail={selectedNCRForForum.hodEmail}
          hodName={selectedNCRForForum.hodName}
          memberEmails={selectedNCRForForum.memberEmails || []}
          plantId={selectedNCRForForum.plantId ?? null} // 👈 ADD
          plantName={selectedNCRForForum.plantName ?? null} // 👈 ADD
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedNCRForForum(null);
          }}
          currentUser={user}
          allUsers={allUsersList}
        />
      )}
    </View>
  );
};

export default NCRPendingDashboard;
