// src/components/modals/RejectModalEnhanced.tsx
import { X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ═══ MONOCHROMATIC BLUE PALETTE ═══
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  blue50: "#EFF6FF",
  blue100: "#DBEAFE",
  blue200: "#BFDBFE",
  blue800: "#1E40AF",
  blue900: "#1E3A8A",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  white: "#FFFFFF",
};

// ═══ REUSABLE OUTLINE BUTTON (same as DeptPlanDetailsModal / Form4View) ═══
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  variant = "default", // "default" | "danger"
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  // Danger variant uses primaryDark for its normal state
  const isDanger = variant === "danger";

  const borderColor = isHoveredAndEnabled
    ? isDanger
      ? "#1E3A8A"
      : "#2563EB"
    : isDanger
      ? "#1E3A8A"
      : "#D1D5DB";
  const textColor = isHoveredAndEnabled
    ? isDanger
      ? "#FFFFFF"
      : "#2563EB"
    : isDanger
      ? "#FFFFFF"
      : "#111827";
  const iconColor = isHoveredAndEnabled
    ? isDanger
      ? "#FFFFFF"
      : "#2563EB"
    : isDanger
      ? "#FFFFFF"
      : "#6B7280";
  const backgroundColor = isDanger
    ? isHoveredAndEnabled
      ? "#1E40AF"
      : "#1E3A8A"
    : isHoveredAndEnabled
      ? "rgba(37, 99, 235, 0.1)"
      : "transparent";

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderColor,
        backgroundColor,
        opacity: disabled ? 0.5 : 1,
        // @ts-ignore
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDanger ? "#FFFFFF" : "#2563EB"}
        />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  year?: string | number;
  rejectionReason: string;
  setRejectionReason: (text: string) => void;
  submitting: boolean;
}

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  year,
  rejectionReason,
  setRejectionReason,
  submitting,
}: RejectModalProps) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Reject Plan</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ═══ DESCRIPTION ═══ */}
            <Text style={styles.description}>
              Please provide a reason for rejecting the{" "}
              <Text style={styles.descriptionHighlight}>{year}</Text> audit
              plan:
            </Text>

            {/* ═══ TEXT INPUT ═══ */}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor={COLORS.gray400}
              editable={!submitting}
              textAlignVertical="top"
            />

            {/* ═══ ACTION BUTTONS ═══ */}
            <View style={styles.buttonRow}>
              <OutlineButton
                title="Cancel"
                onPress={onClose}
                disabled={submitting}
              />
              <OutlineButton
                title="Confirm Reject"
                icon={X}
                onPress={onConfirm}
                disabled={submitting}
                loading={submitting}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RejectModal;

// ═══ STYLES — Monochromatic Blue ═══
const styles: any = {
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    // MNC professional shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },

  // ═══ Header ═══
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  closeIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    flexShrink: 0,
  },

  // ═══ Description ═══
  description: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
  },
  descriptionHighlight: {
    color: COLORS.primaryDark,
    fontWeight: "700",
  },

  // ═══ Text input ═══
  textInput: {
    minHeight: 120,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: COLORS.bg,
  },

  // ═══ Button row ═══
  buttonRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
};
