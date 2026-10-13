// app/(app)/settings/security.tsx
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import { useAppMode } from "@/components/context/AppModeContext";
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { WebAuthnDevice } from "@/hooks/useAuth";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#5B4E97";
const ACCENT_DARK = "#3F3566";
const ACCENT_TINT = "#EFEDF7";

export default function SecurityScreen() {
  const { isDemo } = useAppMode();
  const {
    biometricStatus,
    enrollBiometric,
    disableBiometric,
    logout,

    // WebAuthn (web)
    webAuthnDevices,
    webAuthnAvailable,
    webAuthnBusy,
    registerWebAuthnDevice,
    removeWebAuthnDevice,
    refreshWebAuthnDevices,
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);

  const isWeb = Platform.OS === "web";

  /* ---------------- Mobile biometric (Expo LocalAuth) ------------------- */
  const handleToggleBiometric = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const ok = await enrollBiometric();
        if (!ok) {
          Alert.alert(
            "Could not enable",
            "Biometric enrollment was not completed.",
          );
        }
      } else {
        await disableBiometric();
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- WebAuthn (web) -------------------------------------- */
  const handleAddWebAuthnDevice = async () => {
    if (webAuthnBusy) return;
    try {
      const ok = await registerWebAuthnDevice();
      if (!ok) {
        Alert.alert(
          "Could not register",
          "The biometric registration was not completed, or this device doesn't support it.",
        );
      } else {
        Alert.alert(
          "Device registered",
          "You can now sign in with your fingerprint, face, or PIN on this device.",
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Registration failed.");
    }
  };

  const handleRemoveWebAuthnDevice = (id: number, name: string) => {
    const doRemove = async () => {
      const ok = await removeWebAuthnDevice(id);
      if (!ok) {
        Alert.alert("Error", "Could not remove this device.");
      }
    };

    if (isWeb) {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Remove "${name}"?\n\nYou'll no longer be able to sign in with biometrics on this device.`,
        )
      ) {
        void doRemove();
      }
    } else {
      Alert.alert("Remove device", `Remove "${name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void doRemove(),
        },
      ]);
    }
  };

  /* ---------------- Sign out -------------------------------------------- */
  const handleSignOut = () => {
    const doSignOut = async () => {
      await logout();
      router.replace("/(auth)/login" as any);
    };
    if (isWeb) {
      if (
        typeof window !== "undefined" &&
        window.confirm("Sign out of this device?")
      ) {
        void doSignOut();
      }
    } else {
      Alert.alert("Sign out", "Sign out of this device?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => void doSignOut(),
        },
      ]);
    }
  };

  /* ---------------- Helpers --------------------------------------------- */
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 4,
          }}
        >
          Security
        </Text>
        <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
          Manage how you sign in to Qsutra
        </Text>

        {/* ============================================================ */}
        {/* WEB: Biometric summary row → opens centered modal             */}
        {/* ============================================================ */}
        {isWeb && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 12,
              }}
            >
              Biometric login
            </Text>

            <TouchableOpacity
              onPress={() => setShowBioModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
              }}
              activeOpacity={0.75}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: ACCENT_TINT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="smartphone" size={18} color={ACCENT_DARK} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#0F172A",
                  }}
                >
                  Manage biometric devices
                </Text>
                <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  {!webAuthnAvailable
                    ? "Not available on this browser"
                    : webAuthnDevices.length === 0
                      ? "No devices registered yet"
                      : `${webAuthnDevices.length} device${
                          webAuthnDevices.length === 1 ? "" : "s"
                        } registered`}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================ */}
        {/* MOBILE: Biometric toggle (unchanged)                          */}
        {/* ============================================================ */}
        {!isWeb && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}
                >
                  Biometric unlock
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  {biometricStatus.available
                    ? `${biometricStatus.label} is ${
                        biometricStatus.enrolled ? "enrolled" : "not set up"
                      } on this device`
                    : "Not available on this device"}
                </Text>
              </View>
              <Switch
                value={biometricStatus.enabled}
                onValueChange={handleToggleBiometric}
                disabled={
                  !biometricStatus.available ||
                  !biometricStatus.enrolled ||
                  busy
                }
                trackColor={{ false: "#E2E8F0", true: ACCENT_TINT }}
                thumbColor={biometricStatus.enabled ? ACCENT : "#fff"}
              />
            </View>

            {biometricStatus.available && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#F1F5F9",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: ACCENT_TINT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={biometricStatus.type === "face" ? "smile" : "lock"}
                    size={18}
                    color={ACCENT_DARK}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#0F172A",
                      fontWeight: "500",
                    }}
                  >
                    {biometricStatus.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748B" }}>
                    {biometricStatus.enrolled
                      ? "Enrolled on this device"
                      : "Not enrolled"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* Account section                                                */}
        {/* ============================================================ */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#0F172A",
              marginBottom: 12,
            }}
          >
            Account
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={() => setShowChangePassword(true)}
          >
            <Feather name="lock" size={16} color="#64748B" />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 14,
                color: "#0F172A",
              }}
            >
              Change password
            </Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={16} color="#DC2626" />
            <Text
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 14,
                color: "#DC2626",
              }}
            >
              Sign out of this device
            </Text>
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* Info panel                                                     */}
        {/* ============================================================ */}
        <View
          style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            How we protect you
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", lineHeight: 18 }}>
            Biometric data never leaves your device. Fingerprint and face data
            are handled entirely by your device's secure hardware (TPM on
            Windows, Secure Enclave on Apple, TEE on Android). Qsutra's servers
            never see or store biometric information — only a public key used to
            verify signatures.
          </Text>
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* BIOMETRIC DEVICES MODAL — centered popup with back button     */}
      {/* ============================================================ */}
      <Modal
        visible={showBioModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBioModal(false)}
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
            {/* Header — matches ChangePasswordModal */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <TouchableOpacity
                  onPress={() => setShowBioModal(false)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: ACCENT_TINT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="arrow-left" size={18} color={ACCENT_DARK} />
                </TouchableOpacity>
                <View>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: "#0F172A",
                    }}
                  >
                    Biometric login
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                  >
                    Add or remove devices
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowBioModal(false)}
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
              {!webAuthnAvailable ? (
                <View
                  style={{
                    padding: 12,
                    backgroundColor: "#FEF3C7",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#FDE68A",
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#92400E" }}>
                    Biometric login isn't available on this browser or device.
                    Make sure you're using Windows Hello (or Touch ID / Face ID
                    on Mac), and open the app over HTTPS or localhost.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Device list */}
                  {webAuthnDevices.length === 0 ? (
                    <View
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <Feather name="smartphone" size={22} color="#94A3B8" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          marginTop: 8,
                          textAlign: "center",
                        }}
                      >
                        No devices registered yet. Add this device to enable
                        fingerprint or face login.
                      </Text>
                    </View>
                  ) : (
                    webAuthnDevices.map((device: WebAuthnDevice) => (
                      <View
                        key={device.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#F1F5F9",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: ACCENT_TINT,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather
                            name={
                              device.deviceName?.toLowerCase().includes("face")
                                ? "smile"
                                : "smartphone"
                            }
                            size={18}
                            color={ACCENT_DARK}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#0F172A",
                            }}
                          >
                            {device.deviceName || "This device"}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#64748B" }}>
                            Registered {formatDate(device.createdAt)}
                            {device.lastUsedAt
                              ? ` · Last used ${formatDate(device.lastUsedAt)}`
                              : " · Never used"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() =>
                            handleRemoveWebAuthnDevice(
                              device.id,
                              device.deviceName,
                            )
                          }
                          disabled={webAuthnBusy}
                          style={{ padding: 8 }}
                        >
                          <Feather name="trash-2" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}

                  {/* Add device button */}
                  <TouchableOpacity
                    onPress={handleAddWebAuthnDevice}
                    disabled={webAuthnBusy}
                    style={{
                      marginTop: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: webAuthnBusy ? "#CBD5E1" : ACCENT,
                    }}
                  >
                    {webAuthnBusy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="plus" size={16} color="#fff" />
                    )}
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {webAuthnBusy ? "Working…" : "Add this device"}
                    </Text>
                  </TouchableOpacity>

                  {/* Help link */}
                  <TouchableOpacity
                    onPress={() => {
                      if (typeof window === "undefined") return;
                      const ua = (globalThis as any).navigator?.userAgent ?? "";
                      if (/Windows/i.test(ua)) {
                        window.open("ms-settings:signinoptions");
                      } else {
                        Alert.alert(
                          "Add more fingerprints",
                          "Open your operating system's Settings to add more fingerprints or face data. Your OS manages biometric enrollment — Qsutra automatically picks up whatever is enrolled.",
                        );
                      }
                    }}
                    style={{
                      marginTop: 12,
                      alignItems: "center",
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: ACCENT,
                        fontWeight: "500",
                      }}
                    >
                      Want to add more fingerprints? Open system settings →
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Footer — back / done, matches modal pattern */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: "#F1F5F9",
                backgroundColor: "#FFFFFF",
              }}
            >
              <TouchableOpacity
                onPress={() => setShowBioModal(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#D9E0EC",
                  backgroundColor: "#FFF",
                }}
              >
                <Feather name="arrow-left" size={14} color="#1F2937" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowBioModal(false)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: ACCENT,
                }}
              >
                <Feather name="check" size={14} color="#fff" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#FFF",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={async (current, newPw, confirm) => {
          const token = await AsyncStorage.getItem("authToken");
          const res = await fetch(
            `${API_BASE_URL}/api/users/me/change-password`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                currentPassword: current,
                newPassword: newPw,
                confirmPassword: confirm,
              }),
            },
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return { success: false, error: data.error || "Failed" };
          }
          Alert.alert("Success", "Password changed successfully");
          setShowChangePassword(false);
          return { success: true };
        }}
      />
    </SafeAreaView>
  );
}
