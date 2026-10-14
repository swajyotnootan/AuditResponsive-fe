// app/(auth)/login.tsx
import { useAppMode } from "@/components/context/AppModeContext";
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { normalizeRole } from "@/utils/roleUtils";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

const GRADIENT: [string, string, string] = ["#8B80B3", "#6B5A92", "#473D72"];
const ACCENT = "#5B4E97";
const ACCENT_DARK = "#3F3566";
const ACCENT_TINT = "#EFEDF7";

/* ============================================================ */
/* BIOMETRIC AVAILABILITY HOOK                                  */
/* ============================================================ */
function useBiometricAvailable(opts: {
  webAuthnAvailable: boolean;
  biometricStatus: { available?: boolean; enrolled?: boolean };
}) {
  const { webAuthnAvailable, biometricStatus } = opts;
  const isWebPlatform = Platform.OS === "web";

  const [webPlatformAuthAvailable, setWebPlatformAuthAvailable] = useState<
    boolean | null
  >(isWebPlatform ? null : false);

  useEffect(() => {
    if (!isWebPlatform) return;
    let cancelled = false;

    (async () => {
      try {
        const PKC: any = (globalThis as any).Credential;
        if (
          !PKC ||
          typeof PKC.isUserVerifyingPlatformAuthenticatorAvailable !==
            "function"
        ) {
          if (!cancelled) setWebPlatformAuthAvailable(false);
          return;
        }
        const ok = await PKC.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!cancelled) setWebPlatformAuthAvailable(!!ok);
      } catch {
        if (!cancelled) setWebPlatformAuthAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isWebPlatform]);

  if (isWebPlatform) {
    return webAuthnAvailable && webPlatformAuthAvailable === true;
  }
  return !!biometricStatus.available && !!biometricStatus.enrolled;
}

/* ============================================ */
/* MODE TOGGLE                                  */
/* ============================================ */
function ModeToggle() {
  const { isDemo, toggleMode } = useAppMode();
  return (
    <TouchableOpacity
      onPress={toggleMode}
      style={{
        position: "absolute",
        top: Platform.OS === "web" ? 16 : 56,
        right: 16,
        zIndex: 9999,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: isDemo ? "#FEF3C7" : "#DBEAFE",
        borderWidth: 1,
        borderColor: isDemo ? "#FDE68A" : "#93C5FD",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
      }}
      activeOpacity={0.8}
    >
      <Feather
        name={isDemo ? "play-circle" : "shield"}
        size={14}
        color={isDemo ? "#92400E" : "#1E40AF"}
      />
      <Text
        style={{
          marginLeft: 6,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.5,
          color: isDemo ? "#92400E" : "#1E40AF",
        }}
      >
        {isDemo ? "DEMO" : "REAL"}
      </Text>
    </TouchableOpacity>
  );
}

/* ============================================ */
/* ROLE SELECT — DEMO ONLY                      */
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
    <View className="w-full">
      <TouchableOpacity
        className="min-h-11 w-full flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        onPress={() => setIsOpen(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        <View className="flex-1 flex-row items-center">
          {selectedRole ? (
            <>
              <View className={`mr-2 rounded-lg p-1 ${selectedRole.bg}`}>
                <Feather
                  name={selectedRole.icon}
                  size={14}
                  color={selectedRole.fg}
                />
              </View>
              <Text className="text-sm font-medium text-slate-700">
                {selectedRole.label}
              </Text>
            </>
          ) : (
            <>
              <Feather name="shield" size={16} color="#9CA3AF" />
              <Text className="ml-2 text-sm text-slate-400">
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
              className="flex-row items-center justify-between px-4 py-3"
              style={{ backgroundColor: ACCENT }}
            >
              <Text className="text-base font-semibold text-white">
                Select role
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                className="min-h-11 min-w-11 items-center justify-center"
              >
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="border-b border-slate-100 p-3">
              <View className="min-h-11 flex-row items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                <Feather name="search" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search roles..."
                  className="flex-1 px-2 py-2 text-sm text-slate-800"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus={Platform.OS === "web"}
                  placeholderTextColor="#9CA3AF"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchTerm("")}
                    className="min-h-8 min-w-8 items-center justify-center"
                  >
                    <Feather name="x" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView className="px-2 py-1" style={{ maxHeight: 220 }}>
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => {
                  const isSelected = selectedRole?.label === role.label;
                  return (
                    <TouchableOpacity
                      key={role.label}
                      className="min-h-11 flex-row items-center rounded-lg px-2 py-2"
                      style={{
                        backgroundColor: isSelected
                          ? ACCENT_TINT
                          : "transparent",
                      }}
                      onPress={() => {
                        onChange(role);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      <View className={`mr-2 rounded-lg p-1 ${role.bg}`}>
                        <Feather name={role.icon} size={14} color={role.fg} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-slate-700">
                          {role.label}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          @{role.username}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather name="check" size={16} color={ACCENT_DARK} />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="items-center py-6">
                  <Text className="text-sm text-slate-400">No roles found</Text>
                </View>
              )}
            </ScrollView>

            <View className="items-center border-t border-slate-100 bg-slate-50 px-3 py-2">
              <Text className="text-xs text-slate-400">
                {filteredRoles.length} roles available
              </Text>
            </View>
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
          <View className="h-1" style={{ backgroundColor: ACCENT }} />
          <View className="items-center p-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Feather name="check-circle" size={32} color="#10B981" />
            </View>
            <Text className="text-center text-xl font-bold text-slate-800">
              Welcome back!
            </Text>
            <Text className="mt-1 text-center text-sm font-medium text-slate-500">
              {userData?.name || userData?.username}
            </Text>
            <View
              className="mt-2 rounded-full px-3 py-1"
              style={{ backgroundColor: ACCENT_TINT }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: ACCENT_DARK }}
              >
                {userData?.role || "User"}
              </Text>
            </View>
            <TouchableOpacity
              className="mt-5 min-h-11 w-full items-center justify-center rounded-xl px-4 py-3"
              style={{ backgroundColor: ACCENT }}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text className="text-center font-medium text-white">
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

/* ============================================ */
/* BIOMETRIC OVERLAY — WhatsApp-style           */
/* ============================================ */
function BiometricOverlay({
  visible,
  label,
  busy,
  error,
  onRetry,
  onCancel,
}: {
  visible: boolean;
  label: string;
  busy: boolean;
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 12, 40, 0.55)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        zIndex: 1000,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 320,
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 24,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: ACCENT_TINT,
            borderWidth: 1,
            borderColor: "#D6CFEB",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          {busy ? (
            <ActivityIndicator size="large" color={ACCENT} />
          ) : (
            <Feather name="lock" size={30} color={ACCENT} />
          )}
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: "#1E293B",
            textAlign: "center",
          }}
        >
          {busy ? "Verify it's you" : "Sign in with biometrics"}
        </Text>

        <Text
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 19,
          }}
        >
          {busy
            ? `Use ${label} to continue. Look at the camera, touch the sensor, or enter your PIN.`
            : "We'll ask your device to verify your identity."}
        </Text>

        {!!error && (
          <View
            style={{
              marginTop: 14,
              width: "100%",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#FECACA",
              backgroundColor: "#FEF2F2",
              padding: 10,
            }}
          >
            <Text
              style={{ fontSize: 12, color: "#DC2626", textAlign: "center" }}
            >
              {error}
            </Text>
          </View>
        )}

        {!busy && (
          <>
            <TouchableOpacity
              onPress={onRetry}
              style={{
                marginTop: 18,
                width: "100%",
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: ACCENT,
                alignItems: "center",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                Try again
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCancel}
              style={{
                marginTop: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#64748B", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
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
  onRoleChange,
  onChangeField,
  onTogglePassword,
  onToggleRemember,
  onSubmit,
}: {
  isDemo: boolean;
  formData: { selectedField: string; username: string; password: string };
  error: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSubmitting: boolean;
  onRoleChange: (role: Role) => void;
  onChangeField: (field: "username" | "password", value: string) => void;
  onTogglePassword: () => void;
  onToggleRemember: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {!!error && (
        <View className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <Text className="text-center text-sm text-red-500">{error}</Text>
        </View>
      )}

      {isDemo && (
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-slate-500">
            Select Role
          </Text>
          <RoleSelect
            value={formData.selectedField}
            onChange={onRoleChange}
            isSubmitting={isSubmitting}
          />
        </View>
      )}

      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-slate-500">
          Username
        </Text>
        <View className="min-h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
          <Feather name="user" size={16} color="#9AA1B1" />
          <TextInput
            className="flex-1 px-2 py-3 text-base text-slate-800"
            placeholder="Enter your username"
            placeholderTextColor="#9AA1B1"
            value={formData.username}
            onChangeText={(text) => onChangeField("username", text)}
            editable={!isSubmitting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-slate-500">
          Password
        </Text>
        <View className="min-h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
          <Feather name="lock" size={16} color="#9AA1B1" />
          <TextInput
            className="flex-1 px-2 py-3 text-base text-slate-800"
            placeholder="Enter your password"
            placeholderTextColor="#9AA1B1"
            value={formData.password}
            onChangeText={(text) => onChangeField("password", text)}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            onPress={onTogglePassword}
            hitSlop={8}
            className="min-h-8 min-w-8 items-center justify-center"
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={16}
              color="#9AA1B1"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-5 flex-row items-center justify-between">
        <TouchableOpacity
          className="min-h-11 flex-row items-center pr-2"
          onPress={onToggleRemember}
        >
          <View
            className="mr-2 h-4 w-4 items-center justify-center rounded border"
            style={{
              backgroundColor: rememberMe ? ACCENT : "transparent",
              borderColor: rememberMe ? ACCENT : "#E2E8F0",
            }}
          >
            {rememberMe && <Feather name="check" size={10} color="white" />}
          </View>
          <Text className="text-sm text-slate-500">Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="min-h-11 justify-center"
          onPress={() => router.push("/auth/forgot-password" as any)}
        >
          <Text className="text-sm font-medium" style={{ color: ACCENT }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="min-h-11 w-full flex-row items-center justify-center rounded-xl py-3"
        style={{ backgroundColor: ACCENT, opacity: isSubmitting ? 0.85 : 1 }}
        onPress={onSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color="white" />
            <Text className="ml-2 text-base font-medium text-white">
              Signing in...
            </Text>
          </>
        ) : (
          <>
            <Feather name="log-in" size={16} color="white" />
            <Text className="ml-2 text-base font-medium text-white">
              Sign in
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

/* ============================================ */
/* MAIN LOGIN SCREEN                            */
/* ============================================ */
export default function LoginScreen() {
  const { isDemo, ready: modeReady } = useAppMode();
  const {
    login,
    biometricStatus,
    enrollBiometric,
    unlockWithBiometric,
    webAuthnAvailable,
    webAuthnBusy,
    loginWithDiscoverablePasskey,
  } = useAuth();

  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const isWebPlatform = Platform.OS === "web";

  const [formData, setFormData] = useState({
    selectedField: "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [showEnrollPrompt, setShowEnrollPrompt] = useState(false);

  // Biometric overlay states
  const [showBioOverlay, setShowBioOverlay] = useState(false);
  const [bioError, setBioError] = useState("");
  const [demoBioPreview, setDemoBioPreview] = useState(false);
  const [demoBioBusy, setDemoBioBusy] = useState(false);

  // Single source of truth for "device has real biometrics"
  const biometricActuallyAvailable = useBiometricAvailable({
    webAuthnAvailable,
    biometricStatus,
  });

  // Raw device capability (used for demo button gating).
  const deviceHasBiometrics = isWebPlatform
    ? webAuthnAvailable
    : !!biometricStatus.available && !!biometricStatus.enrolled;

  const onBiometricSuccess = (restored: any) => {
    setLoggedInUser(restored);
    setShowWelcomePopup(true);
    setTimeout(() => {
      setShowWelcomePopup(false);
      router.replace("/(app)/(tabs)" as any);
    }, 1500);
  };

  /* ---------------------------------------------
     The one biometric entry point (Real + Demo).
     Real: uses the real OS sheet + real backend.
     Demo: uses the real OS sheet, then fabricates
           a demo user from the picked role.
     --------------------------------------------- */
  const runBiometric = async (opts?: { demoPreview?: boolean }) => {
    const isDemoRun = isDemo || !!opts?.demoPreview;

    setBioError("");
    setDemoBioPreview(isDemoRun);
    setShowBioOverlay(true);
    setDemoBioBusy(true);

    try {
      // WEB — real WebAuthn call (OS sheet is real in both modes)
      if (isWebPlatform && webAuthnAvailable) {
        const restored = await loginWithDiscoverablePasskey();

        if (!restored && !isDemoRun) {
          setBioError(
            "No passkey found for this site, or prompt was cancelled.",
          );
          return;
        }

        // Demo user fabrication if the WebAuthn call gave us nothing
        const user =
          restored ||
          ({
            id: "demo",
            name: formData.username || "Demo User",
            username: formData.username || "demo",
            role: formData.selectedField || "Demo",
            email: `${formData.username || "demo"}@demo.local`,
          } as any);

        setShowBioOverlay(false);
        onBiometricSuccess(user);
        return;
      }

      // NATIVE — real biometric unlock (OS sheet is real in both modes)
      if (
        !isWebPlatform &&
        biometricStatus.available &&
        biometricStatus.enrolled
      ) {
        setBiometricBusy(true);
        const restored = await unlockWithBiometric();
        setBiometricBusy(false);

        if (!restored && !isDemoRun) {
          setBioError("Biometric unlock was cancelled.");
          return;
        }

        const user =
          restored ||
          ({
            id: "demo",
            name: formData.username || "Demo User",
            username: formData.username || "demo",
            role: formData.selectedField || "Demo",
            email: `${formData.username || "demo"}@demo.local`,
          } as any);

        setShowBioOverlay(false);
        onBiometricSuccess(user);
        return;
      }

      // No biometrics on this device
      setBioError(
        isWebPlatform
          ? "This browser or device doesn't have a platform authenticator set up."
          : "No biometrics enrolled on this device.",
      );
    } catch (e: any) {
      // In demo, swallow the WebAuthn "no credentials" error and succeed anyway
      if (isDemoRun) {
        const user = {
          id: "demo",
          name: formData.username || "Demo User",
          username: formData.username || "demo",
          role: formData.selectedField || "Demo",
          email: `${formData.username || "demo"}@demo.local`,
        };
        setShowBioOverlay(false);
        onBiometricSuccess(user);
        return;
      }
      setBioError(e?.message || "Biometric sign-in failed.");
    } finally {
      setDemoBioBusy(false);
    }
  };

  /* Auto-open overlay on mount — Real mode only, if biometrics truly exist */
  useEffect(() => {
    if (!modeReady) return;
    if (isDemo) return;
    if (!biometricActuallyAvailable) return;
    const t = setTimeout(() => {
      runBiometric();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeReady, isDemo, biometricActuallyAvailable]);

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
    onRoleChange: handleRoleSelect,
    onChangeField: handleInputChange,
    onTogglePassword: () => setShowPassword((v) => !v),
    onToggleRemember: () => setRememberMe((v) => !v),
    onSubmit: handleLogin,
  };

  const panelContent = (
    <>
      {/* Real mode: switch-to-biometrics button (only if device has it) */}
      {!isDemo && biometricActuallyAvailable && (
        <TouchableOpacity
          onPress={() => runBiometric()}
          style={{
            marginBottom: 16,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: ACCENT_TINT,
            borderWidth: 1,
            borderColor: "#D6CFEB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.85}
        >
          <Feather name="smile" size={15} color={ACCENT_DARK} />
          <Text
            style={{
              marginLeft: 8,
              fontWeight: "600",
              color: ACCENT_DARK,
              fontSize: 13,
            }}
          >
            Sign in with biometrics
          </Text>
        </TouchableOpacity>
      )}

      <LoginForm {...formProps} />

      {/* Demo mode: same button, same real OS flow */}
      {isDemo && deviceHasBiometrics && (
        <TouchableOpacity
          onPress={() => runBiometric({ demoPreview: true })}
          style={{
            marginTop: 16,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: ACCENT_TINT,
            borderWidth: 1,
            borderColor: "#D6CFEB",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.85}
        >
          <Feather name="smile" size={15} color={ACCENT_DARK} />
          <Text
            style={{
              marginLeft: 8,
              fontWeight: "600",
              color: ACCENT_DARK,
              fontSize: 13,
            }}
          >
            Sign in with biometrics
          </Text>
        </TouchableOpacity>
      )}
    </>
  );

  /* ============================================ */
  /* WIDE — Split layout                          */
  /* ============================================ */
  if (isWide) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <StatusBar style="dark" />
        <ModeToggle />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, flexDirection: "row" }}
        >
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={GRADIENT}
              style={{
                flex: 1,
                justifyContent: "center",
                paddingHorizontal: 56,
                paddingVertical: 40,
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={{ width: "100%", maxWidth: 360 }}>
                <Image
                  source={require("@/assets/QsutraQMS.png")}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 24,
                  }}
                  resizeMode="contain"
                />
                <Text className="text-xl font-bold text-white">
                  Qsutra - Quality Management System
                </Text>
                <Text
                  className="mt-1 text-sm text-white"
                  style={{ opacity: 0.7 }}
                >
                  Ver 2.0.1 (7th April, 2025)
                </Text>
                <Text
                  className="mt-8 text-xs text-white"
                  style={{ opacity: 0.6, lineHeight: 20 }}
                >
                  International copyright laws and treaties for Intellectual
                  Property, govern and protect this computer program. Any form
                  of unauthorised reproduction, copying or distribution of this
                  program in whole or part, will attract severe civil and
                  criminal prosecution for maximum extent implications possible
                  under law.
                </Text>
                <View
                  className="mt-6 flex-row items-center rounded-full px-4 py-2"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignSelf: "flex-start",
                  }}
                >
                  <Feather name="shield" size={12} color="#fff" />
                  <Text className="ml-2 text-xs font-medium text-white">
                    Secure Access Only
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
              paddingVertical: 40,
            }}
          >
            <View style={{ width: "100%", maxWidth: 440 }}>
              <View className="mb-7 items-center">
                <Image
                  source={require("@/assets/Stratum.png")}
                  style={{
                    width: 150,
                    height: 50,
                    borderRadius: 6,
                    marginBottom: 24,
                  }}
                  resizeMode="contain"
                />
                <Text className="text-2xl font-bold text-slate-900">
                  Internal Audits
                </Text>
                <Text className="mt-2 text-sm text-slate-400">
                  Sign in to access your internal audit dashboard
                </Text>
              </View>

              {panelContent}

              <View className="mt-6 items-center border-t border-slate-100 pt-4">
                <Text className="text-center text-xs text-slate-400">
                  © 2025 Swajyot Technologies. All rights reserved.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <BiometricOverlay
          visible={showBioOverlay}
          label={isWebPlatform ? "Windows Hello" : biometricStatus.label}
          busy={biometricBusy || webAuthnBusy || demoBioBusy}
          error={bioError}
          onRetry={() => runBiometric({ demoPreview: demoBioPreview })}
          onCancel={() => {
            setShowBioOverlay(false);
            setBioError("");
            setDemoBioPreview(false);
            setDemoBioBusy(false);
          }}
        />

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

  /* ============================================ */
  /* MOBILE — Gradient hero + white card          */
  /* ============================================ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GRADIENT[2] }}>
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
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 48,
              paddingBottom: 32,
              paddingHorizontal: 32,
            }}
          >
            <Image
              source={require("@/assets/QsutraQMS.png")}
              style={{
                width: 100,
                height: 35,
                borderRadius: 16,
                marginBottom: 16,
              }}
              resizeMode="contain"
            />
            <Text className="text-center text-lg font-bold text-white">
              Qsutra - Quality Management System
            </Text>
            <Text
              className="mt-1 text-center text-xs text-white"
              style={{ opacity: 0.7 }}
            >
              Ver 2.0.1 (7th April, 2025)
            </Text>
            <View
              className="mt-4 flex-row items-center rounded-full px-3 py-2"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Feather name="shield" size={11} color="#fff" />
              <Text className="ml-2 text-xs font-medium text-white">
                Secure Access Only
              </Text>
            </View>
          </LinearGradient>

          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 28,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
              elevation: 8,
            }}
          >
            <View className="mb-6 items-center">
              <Image
                source={require("@/assets/Stratum.png")}
                style={{
                  width: 110,
                  height: 38,
                  borderRadius: 6,
                  marginBottom: 16,
                }}
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-slate-900">
                Internal Audits
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-400">
                Sign in to access your dashboard
              </Text>
            </View>

            {panelContent}

            <View className="mt-6 items-center" style={{ paddingBottom: 32 }}>
              <Text className="text-center text-xs text-slate-400">
                © 2025 Swajyot Technologies.{"\n"}All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BiometricOverlay
        visible={showBioOverlay}
        label={isWebPlatform ? "Windows Hello" : biometricStatus.label}
        busy={biometricBusy || webAuthnBusy || demoBioBusy}
        error={bioError}
        onRetry={() => runBiometric({ demoPreview: demoBioPreview })}
        onCancel={() => {
          setShowBioOverlay(false);
          setBioError("");
          setDemoBioPreview(false);
          setDemoBioBusy(false);
        }}
      />

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
