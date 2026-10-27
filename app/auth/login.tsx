// app/(auth)/login.tsx
import { useAppMode } from "@/components/context/AppModeContext";
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { normalizeRole } from "@/utils/roleUtils";
import { consumeIntentionalLogout } from "@/utils/sessionFlags";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder, // 👈 ADDED
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type Role = {
  label: string;
  username: string;
  password: string;
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  fg: string;
};

const ROLES: Role[] = [
  {
    label: "Master",
    username: "master",
    password: "1234567",
    icon: "award",
    bg: "bg-violet-50",
    fg: "#7C3AED",
  },
  {
    label: "Audit Manager",
    username: "blr.audit.manager",
    password: "user123",
    icon: "briefcase",
    bg: "bg-blue-50",
    fg: "#3B82F6",
  },
  {
    label: "Lead Auditor",
    username: "blr.lead.auditor",
    password: "user123",
    icon: "user-check",
    bg: "bg-violet-50",
    fg: "#5B4E97",
  },
  {
    label: "Initiator",
    username: "blr.initiator",
    password: "user123",
    icon: "file",
    bg: "bg-green-50",
    fg: "#16A34A",
  },
  {
    label: "Auditor",
    username: "blr.auditor1",
    password: "user123",
    icon: "users",
    bg: "bg-cyan-50",
    fg: "#06B6D4",
  },
  {
    label: "HOD",
    username: "blr.hod",
    password: "user123",
    icon: "shield",
    bg: "bg-orange-50",
    fg: "#EA580C",
  },
  {
    label: "Auditee",
    username: "blr.hr.emp1",
    password: "user123",
    icon: "user",
    bg: "bg-slate-50",
    fg: "#6B7280",
  },
  {
    label: "HR Admin",
    username: "hr.admin",
    password: "user123",
    icon: "settings",
    bg: "bg-pink-50",
    fg: "#DB2777",
  },
  {
    label: "Top Management",
    username: "blr.top.mgmt",
    password: "user123",
    icon: "briefcase",
    bg: "bg-amber-50",
    fg: "#D97706",
  },
];

const ACCENT = "#5B4E97";
const ACCENT_DARK = "#3F3566";
const ACCENT_TINT = "#EFEDF7";

const ABS = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/* ───────────── Falling particles (unchanged) ───────────── */
function FallingParticles({ panelHeight }: { panelHeight: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 45 }).map((_, i) => {
        const startY = 0.35 + Math.random() * 0.2;
        return {
          key: `p-${i}`,
          size: 2 + Math.random() * 5,
          left: Math.random() * 100,
          duration: 6000 + Math.random() * 8000,
          delay: Math.random() * 8000,
          startY,
        };
      }),
    [],
  );

  return (
    <View pointerEvents="none" style={{ ...ABS, zIndex: 2 }}>
      {particles.map(({ key, ...rest }) => (
        <Particle key={key} {...rest} panelHeight={panelHeight} />
      ))}
    </View>
  );
}

function Particle({
  size,
  left,
  duration,
  delay,
  panelHeight,
  startY,
}: {
  size: number;
  left: number;
  duration: number;
  delay: number;
  panelHeight: number;
  startY: number;
}) {
  const startPixel = panelHeight * startY;
  const y = useRef(new Animated.Value(startPixel)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: panelHeight + 40,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.85,
              duration: duration * 0.12,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.85,
              duration: duration * 0.72,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.0,
              duration: duration * 0.16,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(y, {
          toValue: startPixel,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    fall.start();
    return () => fall.stop();
  }, [panelHeight, duration, delay, startPixel]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${left}%`,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        opacity,
        transform: [{ translateY: y }],
        shadowColor: "#FFFFFF",
        shadowOpacity: 0.9,
        shadowRadius: size * 2,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

/* ───────────── Mode toggle (unchanged) ───────────── */
function ModeToggle() {
  const { isDemo, toggleMode } = useAppMode();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    const isPreview =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.includes("vercel.app");
    if (!isPreview) return null;
  }
  return (
    <TouchableOpacity
      onPress={toggleMode}
      style={{
        position: "absolute",
        top: Platform.OS === "web" ? 24 : 56,
        right: 24,
        zIndex: 9999,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: isDemo ? "#FEF3C7" : "#EFF6FF",
        borderWidth: 1,
        borderColor: isDemo ? "#FDE68A" : "#BFDBFE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
      activeOpacity={0.85}
    >
      <Feather
        name={isDemo ? "play-circle" : "shield"}
        size={13}
        color={isDemo ? "#92400E" : "#1E40AF"}
      />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.6,
          color: isDemo ? "#92400E" : "#1E40AF",
        }}
      >
        {isDemo ? "DEMO" : "LIVE"}
      </Text>
    </TouchableOpacity>
  );
}

/* ───────────── Form input (unchanged) ───────────── */
function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  onToggleSecure,
  showToggle,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  showToggle?: boolean;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 22 }}>
      <Text
        style={{
          marginBottom: 8,
          fontSize: 11,
          fontWeight: "700",
          color: "#64748B",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          minHeight: 54,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: focused ? ACCENT : "#E2E8F0",
          backgroundColor: focused ? "#FFFFFF" : "#F8FAFC",
          paddingHorizontal: 18,
          shadowColor: focused ? ACCENT : "#5B4E97",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: focused ? 0.2 : 0.06,
          shadowRadius: focused ? 14 : 8,
          elevation: focused ? 3 : 1,
        }}
      >
        <Feather name={icon} size={16} color={focused ? ACCENT : "#94A3B8"} />
        <TextInput
          style={
            {
              flex: 1,
              paddingHorizontal: 10,
              paddingVertical: 14,
              fontSize: 14,
              color: "#1E293B",
              outlineStyle: "none",
              backgroundColor: "transparent",
            } as any
          }
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showToggle && (
          <TouchableOpacity
            onPress={onToggleSecure}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Feather
              name={secureTextEntry ? "eye" : "eye-off"}
              size={16}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ───────────── Role select (unchanged) ───────────── */
function RoleSelect({
  value,
  onChange,
  isSubmitting,
}: {
  value: string;
  onChange: (role: Role) => void;
  isSubmitting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredRoles = ROLES.filter((role) =>
    role.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selectedRole = ROLES.find((r) => r.label === value);

  return (
    <View style={{ width: "100%" }}>
      <TouchableOpacity
        style={{
          minHeight: 46,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          backgroundColor: "#F8FAFC",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onPress={() => setIsOpen(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {selectedRole ? (
            <>
              <View
                style={{
                  marginRight: 8,
                  borderRadius: 8,
                  padding: 4,
                  backgroundColor: ACCENT_TINT,
                }}
              >
                <Feather
                  name={selectedRole.icon}
                  size={14}
                  color={selectedRole.fg}
                />
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: "#334155" }}
              >
                {selectedRole.label}
              </Text>
            </>
          ) : (
            <>
              <Feather name="shield" size={16} color="#9CA3AF" />
              <Text style={{ marginLeft: 8, fontSize: 14, color: "#94A3B8" }}>
                Select your role...
              </Text>
            </>
          )}
        </View>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.4)",
            paddingHorizontal: 24,
          }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: 420,
              backgroundColor: "#fff",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: ACCENT,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                Select role
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={{ padding: 8 }}
              >
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
                padding: 12,
              }}
            >
              <View
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  backgroundColor: "#F8FAFC",
                  paddingHorizontal: 12,
                }}
              >
                <Feather name="search" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search roles..."
                  style={
                    {
                      flex: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: "#1E293B",
                    } as any
                  }
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus={Platform.OS === "web"}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <ScrollView
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {filteredRoles.map((role) => {
                const isSelected = selectedRole?.label === role.label;
                return (
                  <TouchableOpacity
                    key={role.label}
                    style={{
                      minHeight: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      backgroundColor: isSelected ? ACCENT_TINT : "transparent",
                    }}
                    onPress={() => {
                      onChange(role);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <View
                      style={{
                        marginRight: 8,
                        borderRadius: 8,
                        padding: 4,
                        backgroundColor: ACCENT_TINT,
                      }}
                    >
                      <Feather name={role.icon} size={14} color={role.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#334155",
                        }}
                      >
                        {role.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                        @{role.username}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={16} color={ACCENT_DARK} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ───────────── Biometric enroll (unchanged) ───────────── */
function BiometricEnrollPrompt({
  visible,
  label,
  onEnable,
  onSkip,
}: {
  visible: boolean;
  label: string;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: ACCENT_TINT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="lock" size={32} color={ACCENT_DARK} />
            </View>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              color: "#1E293B",
            }}
          >
            Enable faster sign-in?
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              color: "#64748B",
              marginTop: 8,
            }}
          >
            Use {label} to sign in next time without typing your password.
          </Text>
          <TouchableOpacity
            onPress={onEnable}
            style={{
              marginTop: 20,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: ACCENT,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
              Enable {label}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSkip}
            style={{ marginTop: 10, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#64748B", fontSize: 14 }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────── Logout notice modal (extracted) ───────────── */
function LogoutNoticeModal({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!message}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
            maxWidth: 400,
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="alert-triangle" size={30} color="#D97706" />
            </View>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Signed out
          </Text>
          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              color: "#64748B",
              lineHeight: 20,
            }}
          >
            {message || "Your session has ended."}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={{
              marginTop: 20,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: ACCENT,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
              Sign in again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────── Conflict modal — "already signed in" ───────────── */
function ConflictModal({
  conflict,
  onForce,
  onCancel,
  isSubmitting,
}: {
  conflict: {
    devices: {
      sessionId: string;
      deviceName: string;
      ipAddress: string;
      loginAt: string | null;
    }[];
  } | null;
  onForce: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Modal
      visible={!!conflict}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            maxWidth: 420,
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FEF3C7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="alert-triangle" size={30} color="#D97706" />
            </View>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              textAlign: "center",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Already signed in
          </Text>

          <Text
            style={{
              fontSize: 14,
              textAlign: "center",
              color: "#64748B",
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            Your account is active on another device. If you continue here, that
            session will be signed out.
          </Text>

          {conflict?.devices?.map((d, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#F8FAFC",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Feather name="monitor" size={16} color="#64748B" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#0F172A",
                  }}
                >
                  {d.deviceName || "Unknown device"}
                </Text>
                <Text style={{ fontSize: 11, color: "#64748B" }}>
                  {d.ipAddress || "—"}
                  {d.loginAt
                    ? ` · ${new Date(d.loginAt).toLocaleString()}`
                    : ""}
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={onForce}
            disabled={isSubmitting}
            activeOpacity={0.85}
            style={{
              marginTop: 16,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: isSubmitting ? "#CBD5E1" : ACCENT,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
              {isSubmitting
                ? "Signing in…"
                : "Sign out other device & continue"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            disabled={isSubmitting}
            style={{
              marginTop: 10,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#64748B", fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────── Left panel (unchanged) ───────────── */
function LeftPanel({ isWide }: { isWide: boolean }) {
  const [panelHeight, setPanelHeight] = useState(800);
  const PHOTO =
    "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?auto=format&fit=crop&w=1200&q=80";
  return (
    <View
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#1E1B4B",
      }}
      onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
    >
      <Image source={{ uri: PHOTO }} style={ABS} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(30,27,75,0.90)", "rgba(49,46,129,0.82)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ABS}
      />
      <FallingParticles panelHeight={panelHeight} />
      <View
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          justifyContent: "center",
          alignItems: isWide ? "flex-start" : "center",
          paddingLeft: isWide ? 64 : 24,
          paddingRight: isWide ? 100 : 24,
        }}
      >
        <Image
          source={require("@/assets/QsutraQMS.png")}
          style={{
            width: isWide ? 190 : 115,
            height: isWide ? 190 : 62,
            borderRadius: 16,
            marginBottom: isWide ? 24 : 16,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: isWide ? 20 : 14,
            fontWeight: "700",
            color: "#FFFFFF",
            marginBottom: 8,
            lineHeight: isWide ? 30 : 22,
            textAlign: isWide ? "left" : "center",
          }}
        >
          Qsutra — Quality Management System
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
            marginBottom: isWide ? 20 : 14,
            fontWeight: "500",
            textAlign: isWide ? "left" : "center",
          }}
        >
          Ver 2.0.1 (7th April, 2025)
        </Text>
        {isWide && (
          <Text
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 19,
              marginBottom: 20,
              fontWeight: "400",
              maxWidth: 400,
            }}
          >
            International copyright laws and treaties for Intellectual Property,
            govern and protect this computer program. Any form of unauthorised
            reproduction, copying or distribution of this program in whole or
            part, will attract severe civil and criminal prosecution for maximum
            extent implications possible under law.
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: isWide ? "flex-start" : "center",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.25)",
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
          }}
        >
          <Feather name="shield" size={12} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 11.5, fontWeight: "500" }}>
            Secure Access Only
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ───────────── Login form (unchanged) ───────────── */
function LoginForm(props: {
  isDemo: boolean;
  formData: { selectedField: string; username: string; password: string };
  error: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSubmitting: boolean;
  isWide: boolean;
  onRoleChange: (role: Role) => void;
  onChangeField: (field: "username" | "password", value: string) => void;
  onTogglePassword: () => void;
  onToggleRemember: () => void;
  onSubmit: () => void;
  onBiometric: () => void;
}) {
  const {
    isDemo,
    formData,
    error,
    showPassword,
    rememberMe,
    isSubmitting,
    isWide,
    onRoleChange,
    onChangeField,
    onTogglePassword,
    onToggleRemember,
    onSubmit,
    onBiometric,
  } = props;

  return (
    <View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
      <View
        style={{
          width: isWide ? 140 : 100,
          height: isWide ? 50 : 38,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "#F8FAFC",
          alignSelf: "center",
          marginBottom: isWide ? 24 : 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("@/assets/Stratum.png")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </View>

      <Text
        style={{
          fontSize: isWide ? 24 : 18,
          fontWeight: "600",
          color: "#1E293B",
          textAlign: "center",
          marginBottom: 6,
          letterSpacing: -0.6,
          lineHeight: isWide ? 40 : 30,
        }}
      >
        Internal Audits
      </Text>
      <Text
        style={{
          fontSize: isWide ? 14 : 13,
          color: "#8996aa",
          textAlign: "center",
          marginBottom: isWide ? 32 : 24,
          fontWeight: "400",
        }}
      >
        Sign in to access your dashboard
      </Text>

      {!!error && (
        <View
          style={{
            marginBottom: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#FECACA",
            backgroundColor: "#FEF2F2",
            padding: 12,
          }}
        >
          <Text style={{ textAlign: "center", fontSize: 13, color: "#DC2626" }}>
            {error}
          </Text>
        </View>
      )}

      {isDemo && (
        <View style={{ marginBottom: 22 }}>
          <Text
            style={{
              marginBottom: 8,
              fontSize: 11,
              fontWeight: "700",
              color: "#64748B",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Select Role
          </Text>
          <RoleSelect
            value={formData.selectedField}
            onChange={onRoleChange}
            isSubmitting={isSubmitting}
          />
        </View>
      )}

      <FormInput
        label="Username"
        value={formData.username}
        onChangeText={(v) => onChangeField("username", v)}
        placeholder="Enter your username"
        icon="user"
        editable={!isSubmitting}
      />
      <FormInput
        label="Password"
        value={formData.password}
        onChangeText={(v) => onChangeField("password", v)}
        placeholder="Enter your password"
        icon="lock"
        secureTextEntry={!showPassword}
        showToggle
        onToggleSecure={onTogglePassword}
        editable={!isSubmitting}
      />

      <View
        style={{
          marginBottom: 26,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingRight: 8,
          }}
          onPress={onToggleRemember}
        >
          <View
            style={{
              marginRight: 8,
              width: 18,
              height: 18,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 5,
              borderWidth: 2,
              borderColor: rememberMe ? ACCENT : "#CBD5E1",
              backgroundColor: rememberMe ? ACCENT : "transparent",
            }}
          >
            {rememberMe && (
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
                ✓
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 13, color: "#475569", fontWeight: "500" }}>
            Remember me
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/auth/forgot-password" as any)}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: ACCENT }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
        style={{
          borderRadius: 12,
          overflow: "hidden",
          opacity: isSubmitting ? 0.85 : 1,
          shadowColor: ACCENT,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={["#6655A3", "#5B4E97", "#4B3E82"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 48, borderRadius: 12, overflow: "hidden" }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#fff",
                    letterSpacing: 0.4,
                  }}
                >
                  Signing in…
                </Text>
              </>
            ) : (
              <>
                <Feather name="log-in" size={15} color="#fff" />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#fff",
                    letterSpacing: 0.4,
                  }}
                >
                  Sign In
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginVertical: 20,
        }}
      >
        <LinearGradient
          colors={["transparent", "#E2E8F0", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, height: 1 }}
        />
        <Text
          style={{
            paddingHorizontal: 16,
            fontSize: 12,
            fontWeight: "600",
            color: "#CBD5E1",
            letterSpacing: 1,
          }}
        >
          OR
        </Text>
        <LinearGradient
          colors={["transparent", "#E2E8F0", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, height: 1 }}
        />
      </View>

      <TouchableOpacity
        onPress={onBiometric}
        activeOpacity={0.8}
        style={{
          minHeight: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E9D5FF",
          backgroundColor: "#F5F3FF",
          shadowColor: ACCENT,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <Ionicons name="finger-print" size={20} color={ACCENT} />
        <Text style={{ fontSize: 14, fontWeight: "600", color: ACCENT }}>
          Sign in with Biometrics
        </Text>
      </TouchableOpacity>

      <Text
        style={{
          marginTop: 28,
          textAlign: "center",
          fontSize: 12,
          color: "#94A3B8",
          fontWeight: "400",
        }}
      >
        © 2025 Swajyot Technologies. All rights reserved.
      </Text>
    </View>
  );
}

/* ───────────── MAIN SCREEN ───────────── */
export default function LoginScreen() {
  const { isDemo } = useAppMode();
  const {
    login,
    biometricStatus,
    enrollBiometric,
    unlockWithBiometric,
    webAuthnAvailable,
    loginWithDiscoverablePasskey,
  } = useAuth();

  const { width, height } = useWindowDimensions();
  const isWide =
    Platform.OS === "web" ? width >= 900 : width >= 1100 && height >= 700;
  const isWebPlatform = Platform.OS === "web";

  const [formData, setFormData] = useState({
    selectedField: "",
    username: "",
    password: "",
  });

  // --- 15 MINUTE AUTO-LOGOUT LOGIC ---
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAutoLogout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "authToken",
      "userRole",
      "userName",
      "userEmail",
      "@welcome_pending",
      "@welcome_user",
    ]);
    await AsyncStorage.setItem(
      "@logout_reason",
      "You have been automatically logged out due to 15 minutes of inactivity.",
    );
    router.replace("/(auth)/login" as any);
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => {
        handleAutoLogout();
      },
      15 * 60 * 1000,
    ); // 15 minutes
  }, [handleAutoLogout]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resetTimer]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
    }),
  ).current;
  // -----------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    devices: {
      sessionId: string;
      deviceName: string;
      ipAddress: string;
      loginAt: string | null;
    }[];
    username: string;
    password: string;
  } | null>(null);

  // ✅ FIX — read @logout_reason at the TOP of LoginScreen, before any early returns.
  //    Also skip if this was an intentional logout (manual sign-out).
  useEffect(() => {
    (async () => {
      const wasIntentional = await consumeIntentionalLogout();
      const reason = await AsyncStorage.getItem("@logout_reason");
      if (reason) await AsyncStorage.removeItem("@logout_reason");
      if (reason && !wasIntentional) {
        setLogoutNotice(reason);
      }
    })();
  }, []);

  const onBiometricSuccess = () => {
    router.replace("/(app)/(tabs)" as any);
  };

  const runBiometric = async () => {
    try {
      if (isWebPlatform && webAuthnAvailable) {
        const restored = await loginWithDiscoverablePasskey();
        if (restored) onBiometricSuccess();
      } else if (!isWebPlatform && biometricStatus.enabled) {
        setBiometricBusy(true);
        const restored = await unlockWithBiometric();
        setBiometricBusy(false);
        if (restored) onBiometricSuccess();
      }
    } catch (e) {
      console.error("Biometric sign-in failed:", e);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setFormData({
      selectedField: role.label,
      username: role.username,
      password: role.password,
    });
    setError("");
  };
  const handleInputChange = (field: "username" | "password", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleLogin = async () => {
    if (isDemo && !formData.selectedField)
      return setError("Please select a role");
    if (!formData.username) return setError("Please enter username");
    if (!formData.password) return setError("Please enter password");

    try {
      setIsSubmitting(true);
      setError("");
      const params = new URLSearchParams();
      params.append("username", formData.username);
      params.append("password", formData.password);

      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      // ✅ 409 = "already signed in elsewhere" → show conflict modal
      // No fallback to /api/auth/login (that endpoint doesn't exist)
      if (response.status === 409) {
        const body = await response.json().catch(() => null);
        if (body?.code === "ACTIVE_SESSION_EXISTS") {
          setConflict({
            devices: body.activeDevices || [],
            username: formData.username,
            password: formData.password,
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.message || "Invalid username or password");
      }

      const data = await response.json();
      const user = data.user || data;
      const normalizedRole = normalizeRole(user.role) || "AUDITOR";
      const token = data.token || data.accessToken || "dummy_token";

      await AsyncStorage.multiSet([
        ["authToken", token],
        ["userRole", normalizedRole],
        ["userName", user.name || user.username || formData.username],
        ["userEmail", user.email || `${formData.username}@example.com`],
      ]);

      const profilePhotoUrl =
        user.profilePhoto ||
        (user.id ? `${API_BASE_URL}/api/users/${user.id}/profile-photo` : "");

      const userData = {
        id: user.id || user.email || "unknown",
        role: normalizedRole,
        name: user.name || user.username || formData.username,
        email: user.email || `${formData.username}@example.com`,
        username: user.username || formData.username,
        department: user.department || "Quality Assurance",
        field: formData.selectedField,
        profilePhoto: profilePhotoUrl,
        firstName: user.firstName || user.name?.split(" ")[0] || "",
        lastName: user.lastName || user.name?.split(" ")[1] || "",
        token,
      };

      await login(userData);
      await AsyncStorage.setItem("@welcome_pending", "true");
      await AsyncStorage.setItem("@welcome_user", JSON.stringify(userData));

      if (
        !isDemo &&
        !isWebPlatform &&
        biometricStatus.available &&
        biometricStatus.enrolled &&
        !biometricStatus.enabled
      ) {
        setShowEnrollPrompt(true);
      } else {
        router.replace("/(app)/(tabs)" as any);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.message || "Invalid username or password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ NEW — retry with force=true after user confirms
  const handleForceLogin = async () => {
    if (!conflict) return;
    try {
      setIsSubmitting(true);
      setError("");

      const params = new URLSearchParams();
      params.append("username", conflict.username);
      params.append("password", conflict.password);
      params.append("force", "true");

      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.message || "Login failed");
      }

      const data = await response.json();
      const user = data.user || data;
      const normalizedRole = normalizeRole(user.role) || "AUDITOR";
      const token = data.token || data.accessToken || "dummy_token";

      await AsyncStorage.multiSet([
        ["authToken", token],
        ["userRole", normalizedRole],
        ["userName", user.name || user.username || conflict.username],
        ["userEmail", user.email || `${conflict.username}@example.com`],
      ]);

      const profilePhotoUrl =
        user.profilePhoto ||
        (user.id ? `${API_BASE_URL}/api/users/${user.id}/profile-photo` : "");

      const userData = {
        id: user.id || user.email || "unknown",
        role: normalizedRole,
        name: user.name || user.username || conflict.username,
        email: user.email || `${conflict.username}@example.com`,
        username: user.username || conflict.username,
        department: user.department || "Quality Assurance",
        field: formData.selectedField,
        profilePhoto: profilePhotoUrl,
        firstName: user.firstName || user.name?.split(" ")[0] || "",
        lastName: user.lastName || user.name?.split(" ")[1] || "",
        token,
      };

      setConflict(null);
      await login(userData);
      await AsyncStorage.setItem("@welcome_pending", "true");
      await AsyncStorage.setItem("@welcome_user", JSON.stringify(userData));
      router.replace("/(app)/(tabs)" as any);
    } catch (err: any) {
      console.error("Force login error:", err);
      setError(err.message || "Login failed");
      setConflict(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formProps = {
    isDemo,
    formData,
    error,
    showPassword,
    rememberMe,
    isSubmitting,
    isWide,
    onRoleChange: handleRoleSelect,
    onChangeField: handleInputChange,
    onTogglePassword: () => setShowPassword((v) => !v),
    onToggleRemember: () => setRememberMe((v) => !v),
    onSubmit: handleLogin,
    onBiometric: runBiometric,
  };

  const enrollPrompt = (
    <BiometricEnrollPrompt
      visible={showEnrollPrompt}
      label={biometricStatus.label}
      onEnable={async () => {
        await enrollBiometric();
        setShowEnrollPrompt(false);
        router.replace("/(app)/(tabs)" as any);
      }}
      onSkip={() => {
        setShowEnrollPrompt(false);
        router.replace("/(app)/(tabs)" as any);
      }}
    />
  );

  const noticeModal = (
    <LogoutNoticeModal
      message={logoutNotice}
      onClose={() => setLogoutNotice(null)}
    />
  );

  const conflictModal = (
    <ConflictModal
      conflict={conflict}
      onForce={handleForceLogin}
      onCancel={() => setConflict(null)}
      isSubmitting={isSubmitting}
    />
  );

  if (isWide) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#fff" }}
        {...panResponder.panHandlers}
      >
        <StatusBar style="dark" />
        <ModeToggle />
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View style={{ flex: 52 }}>
            <LeftPanel isWide />
          </View>
          <ScrollView
            style={{ flex: 55, backgroundColor: "#FFFFFF" }}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: width >= 1200 ? 60 : 32,
              paddingVertical: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            <LoginForm {...formProps} />
          </ScrollView>
        </View>
        {enrollPrompt}
        {noticeModal}
        {conflictModal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#1E1B4B" }}
      {...panResponder.panHandlers}
    >
      <StatusBar style="light" />
      <ModeToggle />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 340 }}>
            <LeftPanel isWide={false} />
          </View>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 32,
              paddingBottom: 40,
              marginTop: -24,
              minHeight: 500,
            }}
          >
            <LoginForm {...formProps} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {enrollPrompt}
      {noticeModal}
      {conflictModal}
    </SafeAreaView>
  );
}
