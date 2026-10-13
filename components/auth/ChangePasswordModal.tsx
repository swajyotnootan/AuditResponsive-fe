// components/auth/ChangePasswordModal.tsx
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const ACCENT = "#4F46E5";
const ACCENT_DARK = "#312E81";
const ACCENT_TINT = "#EEF2FF";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

function StrengthHint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
      }}
    >
      <Feather
        name={ok ? "check-circle" : "circle"}
        size={12}
        color={ok ? "#10B981" : "#CBD5E1"}
      />
      <Text style={{ fontSize: 11, color: ok ? "#10B981" : "#94A3B8" }}>
        {label}
      </Text>
    </View>
  );
}

export default function ChangePasswordModal({
  visible,
  onClose,
  onSubmit,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reset on open
  useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError("");
      setBusy(false);
    }
  }, [visible]);

  // Live password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const differentFromOld =
    newPassword.length > 0 && newPassword !== currentPassword;

  const canSubmit =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasLetter &&
    hasNumber &&
    matches &&
    differentFromOld &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setError("");

    try {
      const result = await onSubmit(
        currentPassword,
        newPassword,
        confirmPassword,
      );

      if (!result.success) {
        setError(result.error || "Could not change password");
        return;
      }

      // Success — parent will show a toast and close
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !busy && onClose()}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15,23,42,0.55)",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 500,
            backgroundColor: "#fff",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: ACCENT_TINT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="lock" size={20} color={ACCENT_DARK} />
              </View>
              <View>
                <Text
                  style={{ fontSize: 17, fontWeight: "700", color: "#0F172A" }}
                >
                  Change Password
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  Choose a strong new password
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => !busy && onClose()}
              disabled={busy}
              style={{ padding: 6 }}
            >
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ padding: 20 }}
          >
            {!!error && (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={{ flex: 1, fontSize: 12, color: "#991B1B" }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Current password */}
            <Text style={labelStyle}>Current password</Text>
            <View style={inputWrapperStyle}>
              <Feather name="lock" size={16} color="#9AA1B1" />
              <TextInput
                style={inputStyle}
                placeholder="Enter your current password"
                placeholderTextColor="#9AA1B1"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                editable={!busy}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Feather
                  name={showCurrent ? "eye-off" : "eye"}
                  size={16}
                  color="#9AA1B1"
                />
              </TouchableOpacity>
            </View>

            {/* New password */}
            <Text style={[labelStyle, { marginTop: 16 }]}>New password</Text>
            <View style={inputWrapperStyle}>
              <Feather name="key" size={16} color="#9AA1B1" />
              <TextInput
                style={inputStyle}
                placeholder="At least 8 characters"
                placeholderTextColor="#9AA1B1"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                editable={!busy}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Feather
                  name={showNew ? "eye-off" : "eye"}
                  size={16}
                  color="#9AA1B1"
                />
              </TouchableOpacity>
            </View>

            {/* Strength hints */}
            <View style={{ marginTop: 8, marginLeft: 4 }}>
              <StrengthHint ok={hasMinLength} label="At least 8 characters" />
              <StrengthHint ok={hasLetter} label="Contains a letter" />
              <StrengthHint ok={hasNumber} label="Contains a number" />
              <StrengthHint
                ok={differentFromOld}
                label="Different from current password"
              />
            </View>

            {/* Confirm password */}
            <Text style={[labelStyle, { marginTop: 16 }]}>
              Confirm new password
            </Text>
            <View style={inputWrapperStyle}>
              <Feather name="check-circle" size={16} color="#9AA1B1" />
              <TextInput
                style={inputStyle}
                placeholder="Re-enter new password"
                placeholderTextColor="#9AA1B1"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                editable={!busy}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Feather
                  name={showConfirm ? "eye-off" : "eye"}
                  size={16}
                  color="#9AA1B1"
                />
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && !matches && (
              <Text style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>
                Passwords don't match
              </Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: "#F1F5F9",
              backgroundColor: "#FFFFFF",
            }}
          >
            <TouchableOpacity
              onPress={() => !busy && onClose()}
              disabled={busy}
              style={secondaryBtnStyle}
            >
              <Text style={secondaryBtnTextStyle}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[
                primaryBtnStyle,
                { backgroundColor: canSubmit ? ACCENT : "#CBD5E1" },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check" size={14} color="#fff" />
              )}
              <Text style={primaryBtnTextStyle}>
                {busy ? "Saving…" : "Change Password"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const labelStyle = {
  fontSize: 13,
  fontWeight: "600" as const,
  color: "#374151",
  marginBottom: 6,
};

const inputWrapperStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  borderWidth: 1,
  borderColor: "#D9E0EC",
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 12,
};

const inputStyle = {
  flex: 1,
  paddingVertical: Platform.OS === "web" ? 12 : 14,
  paddingHorizontal: 8,
  fontSize: 14,
  color: "#0F172A",
};

const secondaryBtnStyle = {
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#D9E0EC",
  backgroundColor: "#FFF",
};

const secondaryBtnTextStyle = {
  fontSize: 13,
  fontWeight: "600" as const,
  color: "#1F2937",
};

const primaryBtnStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 6,
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 12,
};

const primaryBtnTextStyle = {
  fontSize: 13,
  fontWeight: "600" as const,
  color: "#FFF",
};
