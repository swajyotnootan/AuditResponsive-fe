// app/auth/forgot-password.tsx
import FallingParticles from "@/components/auth/FallingParticles";
import { API_BASE_URL } from "@/config/apiConfig";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";

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
export default function ForgotPasswordScreen() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSendReset = async () => {
    if (!usernameOrEmail.trim()) {
      setError("Please enter your username or email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
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
                    <Feather name="lock" size={20} color={ACCENT_DARK} />
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      Forgot Password
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                    >
                      We'll email you a reset link
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
                {sent ? (
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
                      Check your email
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
                      If an account exists for{" "}
                      <Text style={{ fontWeight: "600", color: "#0F172A" }}>
                        {usernameOrEmail}
                      </Text>
                      , we've sent a reset link. It expires in 30 minutes.
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
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        Back to Login
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setSent(false);
                        setUsernameOrEmail("");
                      }}
                      style={{ marginTop: 10, padding: 8 }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: ACCENT,
                          fontWeight: "500",
                        }}
                      >
                        Didn't receive it? Try again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
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

                    <Text style={labelStyle}>Username or Email</Text>
                    <View style={inputWrapperStyle}>
                      <Feather name="user" size={16} color="#9AA1B1" />
                      <TextInput
                        style={inputStyle}
                        placeholder="e.g. master or you@example.com"
                        placeholderTextColor="#9AA1B1"
                        value={usernameOrEmail}
                        onChangeText={(t) => {
                          setUsernameOrEmail(t);
                          if (error) setError("");
                        }}
                        editable={!loading}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSendReset}
                      disabled={loading}
                      style={{
                        marginTop: 20,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: loading ? "#A5B4FC" : ACCENT,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Feather name="send" size={14} color="#fff" />
                      )}
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        {loading ? "Sending…" : "Send Reset Link"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.replace("/auth/login")}
                      style={{
                        marginTop: 14,
                        alignItems: "center",
                        padding: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: ACCENT_DARK,
                          fontWeight: "500",
                        }}
                      >
                        Remember your password? Sign in
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AuthBackdrop>
    </SafeAreaView>
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
