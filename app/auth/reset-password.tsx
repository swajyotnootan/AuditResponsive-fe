// app/auth/reset-password.tsx
import FallingParticles from "@/components/auth/FallingParticles";
import { API_BASE_URL } from "@/config/apiConfig";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const GRADIENT: [string, string, string] = ["#8B80B3", "#6B5A92", "#473D72"];
const ACCENT = "#5B4E97";
const ACCENT_DARK = "#3F3566";
const ACCENT_TINT = "#EFEDF7";

type PageState = "validating" | "invalid" | "ready" | "success";

/* ---------- animated backdrop ---------- */

const NIGHT_SKY: [string, string, string] = ["#1B1B3A", "#2B2B5C", "#473D72"];

function AuthBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={NIGHT_SKY}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <FallingParticles />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/* ---------- screen ---------- */
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const token = typeof params.token === "string" ? params.token : "";

  const [pageState, setPageState] = useState<PageState>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setPageState("invalid");
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/validate-reset-token/${encodeURIComponent(token)}`,
        );
        const data = await res.json().catch(() => ({}));
        setPageState(data.valid ? "ready" : "invalid");
      } catch {
        setPageState("invalid");
      }
    })();
  }, [token]);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const matches = password.length > 0 && password === confirmPassword;
  const canSubmit =
    hasMinLength && hasLetter && hasNumber && matches && !loading;

  const handleReset = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Server error (${res.status})`);
      setPageState("success");
    } catch (e: any) {
      setError(e?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GRADIENT[2] }}>
      <StatusBar style="light" />
      <AuthBackdrop>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 460,
                backgroundColor: "#fff",
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
                elevation: 12,
              }}
            >
              {/* Header — matches ChangePasswordModal */}
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
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
                    <Feather name="key" size={20} color={ACCENT_DARK} />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      Set a new password
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                    >
                      Choose a strong password you'll remember
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => router.replace("/auth/login")}
                  style={{ padding: 6 }}
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={{ padding: 24 }}>
                {pageState === "validating" && (
                  <View style={{ alignItems: "center", paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color={ACCENT} />
                    <Text
                      style={{ marginTop: 12, fontSize: 13, color: "#64748B" }}
                    >
                      Validating reset link…
                    </Text>
                  </View>
                )}

                {pageState === "invalid" && (
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "#FEF2F2",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Feather name="x-circle" size={28} color="#EF4444" />
                    </View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: "#0F172A",
                        textAlign: "center",
                      }}
                    >
                      Link expired or invalid
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#64748B",
                        textAlign: "center",
                        lineHeight: 20,
                        maxWidth: 340,
                      }}
                    >
                      This reset link is invalid or has expired. Please request
                      a new one.
                    </Text>

                    <TouchableOpacity
                      onPress={() => router.replace("/auth/forgot-password")}
                      style={{
                        marginTop: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: ACCENT,
                      }}
                    >
                      <Feather name="refresh-cw" size={14} color="#fff" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#fff",
                        }}
                      >
                        Request New Link
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {pageState === "ready" && (
                  <>
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
                        <Feather
                          name="alert-circle"
                          size={14}
                          color="#DC2626"
                        />
                        <Text
                          style={{ flex: 1, fontSize: 12, color: "#991B1B" }}
                        >
                          {error}
                        </Text>
                      </View>
                    )}

                    <Text style={labelStyle}>New password</Text>
                    <View style={inputWrapperStyle}>
                      <Feather name="key" size={16} color="#9AA1B1" />
                      <TextInput
                        style={inputStyle}
                        placeholder="At least 8 characters"
                        placeholderTextColor="#9AA1B1"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather
                          name={showPassword ? "eye-off" : "eye"}
                          size={16}
                          color="#9AA1B1"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 8, marginLeft: 4 }}>
                      <Hint ok={hasMinLength} label="At least 8 characters" />
                      <Hint ok={hasLetter} label="Contains a letter" />
                      <Hint ok={hasNumber} label="Contains a number" />
                    </View>

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
                        editable={!loading}
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
                      <Text
                        style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}
                      >
                        Passwords don't match
                      </Text>
                    )}

                    <TouchableOpacity
                      onPress={handleReset}
                      disabled={!canSubmit}
                      style={{
                        marginTop: 24,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: canSubmit ? ACCENT : "#CBD5E1",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Feather name="check" size={14} color="#fff" />
                      )}
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        {loading ? "Resetting…" : "Reset Password"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {pageState === "success" && (
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "#ECFDF5",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Feather name="check-circle" size={28} color="#10B981" />
                    </View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: "#0F172A",
                        textAlign: "center",
                      }}
                    >
                      Password reset
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#64748B",
                        textAlign: "center",
                        lineHeight: 20,
                        maxWidth: 340,
                      }}
                    >
                      Your password has been changed. You can now sign in with
                      your new password.
                    </Text>

                    <TouchableOpacity
                      onPress={() => router.replace("/auth/login")}
                      style={{
                        marginTop: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: ACCENT,
                      }}
                    >
                      <Feather name="log-in" size={14} color="#fff" />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#fff",
                        }}
                      >
                        Go to Login
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthBackdrop>
    </SafeAreaView>
  );
}

function Hint({ ok, label }: { ok: boolean; label: string }) {
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
  minHeight: 48,
};
const inputStyle = {
  flex: 1,
  paddingVertical: Platform.OS === "web" ? 12 : 14,
  paddingHorizontal: 8,
  fontSize: 14,
  color: "#0F172A",
};
