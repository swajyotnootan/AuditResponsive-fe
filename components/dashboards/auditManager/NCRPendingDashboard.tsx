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

// Note: If testing on a physical mobile device, replace 'localhost' with your computer's local IP address

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
    className={`bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm ${className}`}
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
      className="px-2.5 py-1.5 border rounded-full"
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
  <Card className="p-5 m-2">
    <View className="flex-row items-start justify-between">
      <View>
        <Text className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
          {title}
        </Text>
        <Text className="mt-2 text-3xl font-bold" style={{ color }}>
          {value}
        </Text>
      </View>
      {iconName && (
        <View
          className="items-center justify-center w-10 h-10 border rounded-lg"
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
      className={`h-9 px-4 rounded-lg border flex-row items-center justify-center ${isPrimary ? "border-transparent" : "border-[#E2E8F0]"}`}
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
    <View className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex-row justify-between items-center">
      <View>
        <Text className="text-base font-bold text-[#000000]">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-[#6B7280] mt-1">{subtitle}</Text>
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
    <View className="w-12 h-12 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] items-center justify-center mb-4">
      {iconName && <Feather name={iconName as any} size={24} color="#94A3B8" />}
    </View>
    <Text className="text-base font-semibold text-[#000000] mb-2">{title}</Text>
    {description && (
      <Text
        className="text-sm text-[#6B7280] text-center"
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
              <Text className="text-[11px] font-semibold text-[#8B5CF6] mt-1">
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
            <TouchableOpacity
              onPress={() => onOpenForum(ncr)}
              className="w-8 h-8 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] items-center justify-center ml-2"
            >
              <Feather name="message-square" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Mobile Layout - 2 columns per row */
        <>
          {/* Row 1: NCR Number + Submitted On */}
          <View className="flex-row mb-3">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                NCR Number
              </Text>
              <Text
                className="text-sm font-semibold text-[#1F2937]"
                style={{ fontFamily: "monospace" }}
              >
                {ncr.ncrNumber || `NCR #${ncr.id}`}
              </Text>
              {isNCR2 && (
                <Text className="text-[10px] font-semibold text-[#8B5CF6] mt-0.5">
                  (NCR2 Mode)
                </Text>
              )}
            </View>
            <View style={{ width: "50%", paddingLeft: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
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
          <View className="h-px bg-[#E2E8F0] mb-3" />

          {/* Row 2: Status + Action */}
          <View className="flex-row items-center">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
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
                className="w-8 h-8 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] items-center justify-center ml-2"
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
              <Text className="text-[11px] font-semibold text-[#8B5CF6] mt-1">
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
              className="w-8 h-8 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] items-center justify-center ml-2"
            >
              <Feather name="message-square" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Mobile Layout - 2 columns per row */
        <>
          <View className="flex-row mb-3">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                NCR Number
              </Text>
              <Text
                className="text-sm font-semibold text-[#1F2937]"
                style={{ fontFamily: "monospace" }}
              >
                {ncr.ncrNumber || `NCR #${ncr.id}`}
              </Text>
              {isNCR2 && (
                <Text className="text-[10px] font-semibold text-[#8B5CF6] mt-0.5">
                  (NCR2)
                </Text>
              )}
            </View>
            <View style={{ width: "50%", paddingLeft: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
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

          <View className="h-px bg-[#E2E8F0] mb-3" />

          <View className="flex-row items-center">
            <View style={{ width: "50%", paddingRight: 4 }}>
              <Text className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
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
                className="w-8 h-8 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] items-center justify-center ml-2"
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
// Verify Modal Component
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
      <View className="items-center justify-center flex-1 p-5 bg-black/30">
        <View
          className="bg-white rounded-2xl w-full max-h-[90%] shadow-lg border border-[#DBEAFE] overflow-hidden"
          style={{ maxWidth: 700 }}
        >
          {/* Header */}
          <View className="px-8 py-6 bg-[#EFF6FF] border-b border-[#E2E8F0] flex-row justify-between items-center">
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <View className="w-11 h-11 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] items-center justify-center">
                <Feather name="eye" size={22} color="#8B5CF6" />
              </View>
              <View>
                <Text className="text-lg font-bold text-[#000000]">
                  {decision === "accept"
                    ? "Accepting..."
                    : decision === "reject"
                      ? "Rejecting..."
                      : `Verify ${isNCR2 ? "NCR2" : "Corrective Action"}`}
                </Text>
                <Text className="text-sm text-[#6B7280] mt-1">
                  NCR #{ncr?.ncrNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center"
            >
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView className="px-8 py-6" contentContainerStyle={{ gap: 20 }}>
            {/* NCR Summary */}
            <View className="p-5 bg-[#EFF6FF] border border-[#E2E8F0] rounded-xl">
              <View className="flex-row items-center mb-3">
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
                <View className="w-1/2 pr-2 mb-3">
                  <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                    Status
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {getStatusLabel(ncr?.status || "")}
                  </Text>
                </View>
                <View className="w-1/2 pl-2 mb-3">
                  <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                    Department
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.department || "-"}
                  </Text>
                </View>
                <View className="w-1/2 pr-2 mb-3">
                  <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                    Auditee
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.auditeeName || "-"}
                  </Text>
                </View>
                <View className="w-1/2 pl-2 mb-3">
                  <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                    Auditor
                  </Text>
                  <Text className="text-sm text-[#1F2937]">
                    {ncr?.auditorName || "-"}
                  </Text>
                </View>
              </View>
              <View className="mt-2">
                <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                  Statement
                </Text>
                <Text
                  className="text-sm text-[#1F2937]"
                  style={{ lineHeight: 22 }}
                >
                  {ncr?.statementOfNonconformity?.substring(0, 200)}
                  {/* ✅ FIXED: Added '?? 0' to guarantee a number for TypeScript */}
                  {(ncr?.statementOfNonconformity?.length ?? 0) > 200
                    ? "..."
                    : ""}
                </Text>
              </View>
            </View>

            {/* Corrective Action Details */}
            <View
              className={`p-5 border rounded-xl ${isNCR2 ? "bg-[#EFF6FF] border-[#DDD6FE]" : "bg-[#EFF6FF] border-[#DDD6FE]"}`}
            >
              <View className="flex-row items-center mb-4">
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
                  {isNCR2
                    ? "NCR2 Corrective Action Details"
                    : "Corrective Action Details"}
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
                    className={`w-1/2 ${index % 2 === 0 ? "pr-2" : "pl-2"} mb-4`}
                  >
                    <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      {label}
                    </Text>
                    <View
                      className="p-3 bg-white border border-[#E2E8F0] rounded-lg justify-center"
                      style={{ minHeight: 40 }}
                    >
                      <Text className="text-sm text-[#1F2937]">
                        {value || (
                          <Text className="text-[#CBD5E1] italic">
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
              <View className="p-5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl">
                <View className="flex-row items-center mb-3">
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
                    <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Auditee Review
                    </Text>
                    <View className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
                      <Text className="text-sm text-[#1F2937]">
                        {ncr.auditeeReviewComment}
                      </Text>
                    </View>
                  </View>
                )}
                {ncr?.managerReviewComment && (
                  <View>
                    <Text className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
                      Manager Review
                    </Text>
                    <View className="p-3 bg-white border border-[#E2E8F0] rounded-lg">
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
              <Text className="text-sm font-semibold text-[#000000] mb-2">
                Verification Comments{" "}
                {!decision && <Text className="text-[#EF4444]">*</Text>}
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                className="w-full p-3.5 text-base rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#1F2937]"
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

          {/* Footer */}
          <View className="px-8 py-5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <View className="flex-row items-start">
              {/* Info Box */}
              <View className="flex-1 mr-4 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
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
              <View className="flex-row items-center" style={{ gap: 12 }}>
                {/* Reject Button */}
                <TouchableOpacity
                  onPress={() => handleVerify(false)}
                  disabled={loading}
                  className="h-11 px-6 rounded-lg flex-row items-center justify-center"
                  style={{
                    backgroundColor: loading ? "#FECACA" : "#EF4444",
                    opacity: loading ? 0.8 : 1,
                    minWidth: 120,
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
                  className="h-11 px-6 rounded-lg flex-row items-center justify-center"
                  style={{
                    backgroundColor: loading ? "#93C5FD" : "#00529B",
                    opacity: loading ? 0.8 : 1,
                    minWidth: 120,
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

// ─────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────

const NCRPendingDashboard = ({ onBack }: { onBack?: () => void }) => {
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
        credentials: "include",
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
    setLoading(true);
    setError(null);

    try {
      const [pendingResult, allResult] = await Promise.all([
        ncrService.getPendingVerification(),
        ncrService.getAllNCRs(),
      ]);

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
            .sort(
              (a, b) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime(),
            ),
        );
      }

      if (allResult.success) {
        setClosedItems(
          (allResult.data as NcrType[]).filter(
            (ncr) =>
              (ncr.status === "CLOSED" || ncr.status === "NCR2_COMPLETED") &&
              (ncr.rootCause ||
                ncr.correction ||
                ncr.correctiveAction ||
                ncr.ncr2RootCause ||
                ncr.ncr2Correction ||
                ncr.ncr2CorrectiveAction),
          ),
        );
      }
    } catch (err) {
      setError("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchAllUsers();
  }, []);

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

  const openNCRForum = (ncr: NcrType) => {
    const auditManager = allUsersList.find((u) => u.role === "AUDIT_MANAGER");
    const auditor = allUsersList.find((u) => u.id === ncr.auditorId);
    const auditee = allUsersList.find((u) => u.id === ncr.auditeeId);

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
      <View className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator
          size="large"
          color="#8B5CF6"
          style={{ marginBottom: 16 }}
        />
        <Text className="text-base font-semibold text-[#000000]">
          Loading verification queue...
        </Text>
        <Text className="text-sm text-[#6B7280] mt-1.5">
          Fetching submitted corrective actions
        </Text>
      </View>
    );
  }

  return activeForm8DetailConfig ? (
    renderActiveForm8Detail()
  ) : (
    <ScrollView className="flex-1 bg-[#F8FAFC]">
      <View className="w-full p-4 mx-auto" style={{ maxWidth: 1400 }}>
        {/* Header */}
        <Card className="p-6 mb-6">
          <View className="flex-row flex-wrap items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  if (onBack) {
                    onBack();
                  } else {
                    navigation.goBack();
                  }
                }}
                className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center"
              >
                <Feather name="arrow-left" size={18} color="#6B7280" />
              </TouchableOpacity>
              <View className="w-12 h-12 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] items-center justify-center">
                <Feather name="check-circle" size={24} color="#00529B" />
              </View>
              <View>
                <Text className="text-xl font-bold text-[#000000]">
                  Corrective Action Verification
                </Text>
                <Text className="text-sm text-[#6B7280] mt-1">
                  Form 8 • Review & Close NCRs
                </Text>
              </View>
            </View>
            <View
              className="flex-row items-center mt-4 sm:mt-0"
              style={{ gap: 12 }}
            >
              <TouchableOpacity
                onPress={loadData}
                className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center"
              >
                <Feather name="refresh-cw" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Error Alert */}
        {error && (
          <View
            className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl mb-6 flex-row"
            style={{ gap: 12 }}
          >
            <View className="w-9 h-9 rounded-lg bg-white border border-[#FECACA] items-center justify-center">
              <Feather name="alert-circle" size={18} color="#EF4444" />
            </View>
            <View className="justify-center flex-1">
              <Text className="text-sm font-semibold text-[#991B1B]">
                Error
              </Text>
              <Text className="text-sm text-[#991B1B] opacity-90 mt-1">
                {error}
              </Text>
            </View>
          </View>
        )}

        {/* Stat Cards */}
        {/* Stat Cards */}
        <View className={`flex-row flex-wrap mb-6 ${isDesktop ? "" : "-mx-2"}`}>
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
              <View className="px-3 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full">
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
          {/* Table Header - Responsive */}
          <View
            className={`flex-row px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] ${isDesktop ? "" : "flex-wrap"}`}
          >
            <View
              style={
                isDesktop
                  ? { flex: 1, paddingRight: 8 }
                  : { width: "50%", paddingRight: 8, marginBottom: 8 }
              }
            >
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                NCR Number
              </Text>
            </View>
            <View
              style={
                isDesktop ? { flex: 1 } : { width: "50%", marginBottom: 8 }
              }
            >
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
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
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
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
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
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
              <View className="px-3 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full">
                <Text className="text-xs font-semibold text-[#6B7280]">
                  {closedItems.length} closed
                </Text>
              </View>
            ) : null
          }
        >
          <View className="flex-row px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <View style={{ flex: 2, paddingRight: 8 }}>
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                NCR Number
              </Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                Department
              </Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                Closed On
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
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
                    // ✅ SET STATE TO OPEN FORM 8 DETAIL VIEW INLINE
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

      {/* ✅ RESTORED: Forum Modal (Commented out for future use) */}
      {/* {showForumModal && selectedNCRForForum && (
        <Modal visible={showForumModal} animationType="slide" transparent>
          <View className="items-center justify-center flex-1 p-5 bg-black/50">
            <View className="bg-white rounded-2xl w-full max-h-[90%] overflow-hidden" style={{ maxWidth: 700 }}>
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
                memberEmails={selectedNCRForForum.memberEmails || []}
                isOpen={showForumModal}
                onClose={() => {
                  setShowForumModal(false);
                  setSelectedNCRForForum(null);
                }}
                currentUser={user}
                allUsers={allUsersList}
              />
            </View>
          </View>
        </Modal>
      )} */}
    </ScrollView>
  );
};

export default NCRPendingDashboard;
