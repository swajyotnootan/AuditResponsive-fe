// app/(app)/settings/security.tsx
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import { useAppMode } from "@/components/context/AppModeContext";
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { WebAuthnDevice } from "@/hooks/useAuth";
import { markIntentionalLogout } from "@/utils/sessionFlags";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
    user,
    biometricStatus,
    enrollBiometric,
    disableBiometric,
    logout,
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

  // ═══════════════════════════════════════════════════════════
  // LOGIN HISTORY
  // ═══════════════════════════════════════════════════════════
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  const fetchLoginHistory = async () => {
    try {
      setLoginHistoryLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/sessions/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setLoginHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn("Failed to load login history:", e?.message);
      setLoginHistory([]);
    } finally {
      setLoginHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    void fetchLoginHistory();
  }, [user?.id]);

  const isWeb = Platform.OS === "web";

  /* ---------------- Revoke Session (Logout from history) ---------------- */
  const handleRevokeSession = async (sessionId: number) => {
    const doRevoke = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          void fetchLoginHistory();
        } else {
          Alert.alert("Error", "Could not log out this device.");
        }
      } catch (e) {
        Alert.alert("Error", "Network error.");
      }
    };

    if (isWeb) {
      if (
        window.confirm(
          "Log out this device? It will be disconnected immediately.",
        )
      ) {
        void doRevoke();
      }
    } else {
      Alert.alert(
        "Log out device",
        "Are you sure you want to log out this device?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log out",
            style: "destructive",
            onPress: () => void doRevoke(),
          },
        ],
      );
    }
  };

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
      await markIntentionalLogout(); // ✅ marks this as intentional
      await logout();
      router.replace("/auth/login" as any);
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

  const formatDateTime = (entry: any) => {
    const iso = entry.loginAt || entry.createdAt || entry.timestamp;
    if (!iso) return "Unknown time";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "Unknown time";
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown time";
    }
  };

  const getDeviceName = (entry: any) => {
    if (
      entry.deviceName &&
      entry.deviceName !== "Unknown device" &&
      entry.deviceName !== "—"
    ) {
      return entry.deviceName;
    }
    if (entry.userAgent) {
      if (/iPhone|iPad/i.test(entry.userAgent)) return "iOS Device";
      if (/Android/i.test(entry.userAgent)) return "Android Device";
      if (/Macintosh/i.test(entry.userAgent)) return "MacBook";
      if (/Windows/i.test(entry.userAgent)) return "Windows PC";
      return "Web Browser";
    }
    return "Unknown Device";
  };

  const activeSessions = loginHistory.filter((entry) => !entry.revoked);

  /* ---------------- Close popup ---------------------------------------- */
  const handleClosePopup = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/settings" as any);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClosePopup}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.55)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <SafeAreaView
          style={{
            width: "100%",
            maxWidth: 640,
            maxHeight: "92%",
            backgroundColor: "#F8FAFC",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* ---- Popup header with close button ---- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 8,
              backgroundColor: "#F8FAFC",
              borderBottomWidth: 1,
              borderBottomColor: "#E2E8F0",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#0F172A",
              }}
            >
              Security
            </Text>
            <TouchableOpacity
              onPress={handleClosePopup}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#E2E8F0",
              }}
            >
              <Feather name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                marginBottom: 20,
              }}
            >
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
                    <Text
                      style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}
                    >
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
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#0F172A",
                      }}
                    >
                      Biometric unlock
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}
                    >
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
                        name={
                          biometricStatus.type === "face" ? "smile" : "lock"
                        }
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
            {/* Login History                                                 */}
            {/* ============================================================ */}
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
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#0F172A",
                  }}
                >
                  Login history
                </Text>
                <TouchableOpacity
                  onPress={fetchLoginHistory}
                  disabled={loginHistoryLoading}
                  style={{ padding: 4, opacity: loginHistoryLoading ? 0.5 : 1 }}
                >
                  <Feather name="refresh-cw" size={14} color={ACCENT} />
                </TouchableOpacity>
              </View>

              {loginHistoryLoading ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text
                    style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}
                  >
                    Loading history…
                  </Text>
                </View>
              ) : loginHistory.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 24,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 10,
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <Feather name="clock" size={22} color="#94A3B8" />
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    No login history yet. Your sign-ins will appear here.
                  </Text>
                </View>
              ) : (
                activeSessions.slice(0, 10).map((entry) => {
                  const isActive = !entry.revoked;
                  const isBiometric =
                    (entry.method || "").toUpperCase() === "BIOMETRIC";

                  return (
                    <View
                      key={entry.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: isBiometric
                            ? ACCENT_TINT
                            : "#E0F2FE",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name={isBiometric ? "smile" : "lock"}
                          size={18}
                          color={isBiometric ? ACCENT_DARK : "#0369A1"}
                        />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#0F172A",
                            }}
                          >
                            {isBiometric ? "Biometric login" : "Password login"}
                          </Text>

                          {isActive ? (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <View
                                style={{
                                  backgroundColor: "#DCFCE7",
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 999,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: "700",
                                    color: "#166534",
                                  }}
                                >
                                  Active now
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleRevokeSession(entry.id)}
                                style={{ padding: 4 }}
                              >
                                <Feather
                                  name="log-out"
                                  size={14}
                                  color="#DC2626"
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 10, color: "#94A3B8" }}>
                              Revoked
                            </Text>
                          )}
                        </View>

                        <Text
                          style={{
                            fontSize: 12,
                            color: "#475569",
                            marginTop: 3,
                            fontWeight: "500",
                          }}
                          numberOfLines={1}
                        >
                          {getDeviceName(entry)}
                          {entry.ipAddress &&
                          entry.ipAddress !== "0:0:0:0:0:0:0:1"
                            ? ` · ${entry.ipAddress}`
                            : ""}
                        </Text>

                        <Text
                          style={{
                            fontSize: 11,
                            color: "#94A3B8",
                            marginTop: 2,
                          }}
                        >
                          {formatDateTime(entry)}
                          {entry.revoked && entry.revokedReason
                            ? ` · ${entry.revokedReason}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}

              {activeSessions.length > 10 && (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  Showing 10 of {activeSessions.length} active sessions
                </Text>
              )}
            </View>

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
                Biometric data never leaves your device. Fingerprint and face
                data are handled entirely by your device's secure hardware (TPM
                on Windows, Secure Enclave on Apple, TEE on Android). Qsutra's
                servers never see or store biometric information — only a public
                key used to verify signatures.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* ============================================================ */}
        {/* BIOMETRIC DEVICES MODAL                                       */}
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
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
                      Make sure you're using Windows Hello (or Touch ID / Face
                      ID on Mac), and open the app over HTTPS or localhost.
                    </Text>
                  </View>
                ) : (
                  <>
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
                                device.deviceName
                                  ?.toLowerCase()
                                  .includes("face")
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

                    <TouchableOpacity
                      onPress={() => {
                        if (typeof window === "undefined") return;
                        const ua =
                          (globalThis as any).navigator?.userAgent ?? "";
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
      </View>
    </Modal>
  );
}
