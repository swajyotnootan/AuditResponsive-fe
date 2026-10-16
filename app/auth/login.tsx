// app/(auth)/login.tsx
import { useAppMode } from "@/components/context/AppModeContext";
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { normalizeRole } from "@/utils/roleUtils";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
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

/* ============================================================
   FALLING PARTICLES — start from the middle of the panel
   ============================================================ */
function FallingParticles({ panelHeight }: { panelHeight: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 45 }).map((_, i) => {
        // Start at 35% – 55% of the panel height (where the hands are)
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
      {particles.map((p) => (
        <Particle
          key={p.key}
          size={p.size}
          left={p.left}
          duration={p.duration}
          delay={p.delay}
          panelHeight={panelHeight}
          startY={p.startY}
        />
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
        // Reset back to the START position (middle), not the top
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

/* ============================================ */
/* MODE TOGGLE — hidden on production domains   */
/* ============================================ */
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

/* ============================================ */
/* GLASSMORPHIC INPUT                           */
/* ============================================ */
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
          borderTopColor: focused ? ACCENT : "#F1F5F9",
          borderLeftColor: focused ? ACCENT : "#F1F5F9",
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

/* ============================================ */
/* ROLE SELECT                                  */
/* ============================================ */
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
          shadowColor: "#5B4E97",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 1,
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

/* ============================================ */
/* WELCOME POPUP                                */
/* ============================================ */
function WelcomePopup({
  isOpen,
  onClose,
  userData,
}: {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}) {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
            maxWidth: 360,
            backgroundColor: "#fff",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View style={{ height: 4, backgroundColor: ACCENT }} />
          <View style={{ alignItems: "center", padding: 24 }}>
            <View
              style={{
                marginBottom: 16,
                height: 64,
                width: 64,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 32,
                backgroundColor: "#ECFDF5",
              }}
            >
              <Feather name="check-circle" size={32} color="#10B981" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                textAlign: "center",
              }}
            >
              Welcome back!
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                fontWeight: "500",
                color: "#64748B",
                textAlign: "center",
              }}
            >
              {userData?.name || userData?.username}
            </Text>
            <View
              style={{
                marginTop: 8,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: ACCENT_TINT,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "500", color: ACCENT_DARK }}
              >
                {userData?.role || "User"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                marginTop: 20,
                minHeight: 44,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor: ACCENT,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#fff",
                }}
              >
                Continue to dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================ */
/* BIOMETRIC ENROLL PROMPT                      */
/* ============================================ */
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

/* ============================================
   LEFT PANEL — shifted left, 5-line text,
   smaller rounded logo
   ============================================ */
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

      {/* Content wrapper — centers on mobile, left-aligns on wide */}
      <View
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          justifyContent: "center", // vertical center (both)
          alignItems: isWide ? "flex-start" : "center", // ← KEY CHANGE
          paddingLeft: isWide ? 64 : 24,
          paddingRight: isWide ? 100 : 24,
        }}
      >
        {/* Logo — centered on mobile, left on wide */}
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
            textAlign: isWide ? "left" : "center", // ← text aligned
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
            textAlign: isWide ? "left" : "center", // ← text aligned
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
            alignSelf: isWide ? "flex-start" : "center", // ← badge centered on mobile
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

/* ============================================ */
/* LOGIN FORM                                   */
/* ============================================ */
function LoginForm({
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
}: {
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
  return (
    <View style={{ width: "100%", maxWidth: 440 }}>
      {/* Right logo — rounded card */}
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

      {/* Softer heading */}
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

      {/* Refined glass Sign In button — 48px tall */}
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
          style={{
            height: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderTopColor: "rgba(255,255,255,0.40)",
            borderLeftColor: "rgba(255,255,255,0.20)",
            borderRightColor: "rgba(0,0,0,0.10)",
            borderBottomColor: "rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0.25)",
              "rgba(255,255,255,0.04)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "55%",
              borderRadius: 12,
            }}
          />
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

      {/* Divider */}
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

      {/* Biometrics */}
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

/* ============================================ */
/* MAIN SCREEN                                  */
/* ============================================ */
export default function LoginScreen() {
  const { isDemo, ready: modeReady } = useAppMode();
  const {
    login,
    biometricStatus,
    enrollBiometric,
    unlockWithBiometric,
    webAuthnAvailable,
    loginWithDiscoverablePasskey,
  } = useAuth();

  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isWebPlatform = Platform.OS === "web";

  const [formData, setFormData] = useState({
    selectedField: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);

  const onBiometricSuccess = (restored: any) => {
    setLoggedInUser(restored);
    setShowWelcomePopup(true);
    setTimeout(() => {
      setShowWelcomePopup(false);
      router.replace("/(app)/(tabs)" as any);
    }, 1500);
  };

  const runBiometric = async () => {
    try {
      if (isWebPlatform && webAuthnAvailable) {
        const restored = await loginWithDiscoverablePasskey();
        if (restored) onBiometricSuccess(restored);
      } else if (!isWebPlatform && biometricStatus.enabled) {
        setBiometricBusy(true);
        const restored = await unlockWithBiometric();
        setBiometricBusy(false);
        if (restored) onBiometricSuccess(restored);
      }
    } catch (e: any) {
      console.error("Biometric sign-in failed:", e);
    }
  };

  useEffect(() => {
    (async () => {
      if (!modeReady) return;
      if (isDemo) return;
      if (isWebPlatform && webAuthnAvailable) {
        try {
          const restored = await loginWithDiscoverablePasskey();
          if (restored) onBiometricSuccess(restored);
        } catch {
          /* silent */
        }
      } else if (!isWebPlatform && biometricStatus.enabled) {
        setBiometricBusy(true);
        try {
          const restored = await unlockWithBiometric();
          if (restored) onBiometricSuccess(restored);
        } finally {
          setBiometricBusy(false);
        }
      }
    })();
  }, [
    modeReady,
    isDemo,
    isWebPlatform,
    webAuthnAvailable,
    biometricStatus.enabled,
  ]);

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

      let response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });
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
        id: user.id || "1",
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
      setLoggedInUser(userData);
      setShowWelcomePopup(true);
      await AsyncStorage.setItem("@today_popup_auto_open", "true");

      if (
        !isDemo &&
        !isWebPlatform &&
        biometricStatus.available &&
        biometricStatus.enrolled &&
        !biometricStatus.enabled
      ) {
        setShowEnrollPrompt(true);
      }

      setTimeout(() => {
        setShowWelcomePopup(false);
        router.replace("/(app)/(tabs)" as any);
      }, 2500);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.message || "Invalid username or password. Please try again.",
      );
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

  if (isWide) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        <ModeToggle />

        {/* 45 / 55 split — left narrower, right wider */}
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
              paddingHorizontal: 60,
              paddingVertical: 40,
            }}
            showsVerticalScrollIndicator={false}
          >
            <LoginForm {...formProps} />
          </ScrollView>
        </View>

        <WelcomePopup
          isOpen={showWelcomePopup}
          onClose={() => setShowWelcomePopup(false)}
          userData={loggedInUser}
        />
        <BiometricEnrollPrompt
          visible={showEnrollPrompt}
          label={biometricStatus.label}
          onEnable={async () => {
            await enrollBiometric();
            setShowEnrollPrompt(false);
          }}
          onSkip={() => setShowEnrollPrompt(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1E1B4B" }}>
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

      <WelcomePopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        userData={loggedInUser}
      />
      <BiometricEnrollPrompt
        visible={showEnrollPrompt}
        label={biometricStatus.label}
        onEnable={async () => {
          await enrollBiometric();
          setShowEnrollPrompt(false);
        }}
        onSkip={() => setShowEnrollPrompt(false)}
      />
    </SafeAreaView>
  );
}
