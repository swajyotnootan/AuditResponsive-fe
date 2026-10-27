// hooks/useAuth.tsx
import { useAppMode } from "@/components/context/AppModeContext";
import { API_BASE_URL } from "@/config/apiConfig";
import { auditScheduleApi } from "@/services/auditScheduleApi";
import {
  BIOMETRIC_ENABLED_KEY,
  BIOMETRIC_TOKEN_KEY,
  BIOMETRIC_USER_KEY,
  deleteSecure,
  getBiometricInfo,
  promptBiometric,
  readSecure,
  saveSecure,
} from "@/utils/biometric";
import { normalizeRole } from "@/utils/roleUtils";
import {
  userHasWebAuthnDevices as checkUserHasWebAuthnDevices,
  isWebAuthnAvailable,
  listWebAuthnCredentials,
  registerWebAuthn,
  removeWebAuthnCredential,
  signalAllAcceptedCredentials,
  signalUnknownCredential,
  userHandleB64Url,
  loginWithDiscoverablePasskey as webauthnDiscoverableLogin,
  loginWithWebAuthn as webauthnLogin,
} from "@/utils/webauthn";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const USER_STORAGE_KEY = "user";
const AUTH_TOKEN_KEY = "authToken";

export interface User {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  username?: string;
  profilePhoto?: string;
  department?: string;

  companyId?: string | number;
  companyCode?: string;
  companyName?: string;

  plantId?: string | number;
  plantCode?: string;
  plantName?: string;

  siteId?: string | number;
  siteCode?: string;
  siteName?: string;

  unitId?: string | number;
  unitCode?: string;
  unitName?: string;

  token?: string;
  [key: string]: any;
}

export type BiometricType = "fingerprint" | "face" | "iris" | "none";

export interface BiometricStatus {
  available: boolean;
  enrolled: boolean;
  enabled: boolean;
  type: BiometricType;
  label: string;
}

export interface WebAuthnDevice {
  id: number;
  credentialId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMaster: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;

  biometricStatus: BiometricStatus;
  enrollBiometric: () => Promise<boolean>;
  unlockWithBiometric: () => Promise<User | null>;
  disableBiometric: () => Promise<void>;

  webAuthnDevices: WebAuthnDevice[];
  webAuthnAvailable: boolean;
  webAuthnBusy: boolean;
  registerWebAuthnDevice: (deviceName?: string) => Promise<boolean>;
  loginWithWebAuthn: (username: string) => Promise<User | null>;
  removeWebAuthnDevice: (credentialId: number) => Promise<boolean>;
  refreshWebAuthnDevices: () => Promise<void>;
  userHasWebAuthnDevices: (username: string) => Promise<boolean>;
  loginWithDiscoverablePasskey: () => Promise<User | null>;
}

export const useAuth = (): UseAuthReturn => {
  const { isDemo } = useAppMode();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    available: false,
    enrolled: false,
    enabled: false,
    type: "none",
    label: "Not available",
  });

  const [webAuthnDevices, setWebAuthnDevices] = useState<WebAuthnDevice[]>([]);
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false);
  const [webAuthnBusy, setWebAuthnBusy] = useState(false);

  useEffect(() => {
    void loadUser();
  }, []);

  useEffect(() => {
    void loadBiometricStatus();
  }, [isDemo, user?.id]);

  useEffect(() => {
    (async () => {
      const ok = await isWebAuthnAvailable();
      setWebAuthnAvailable(ok);
      if (ok) {
        console.log("🔐 [WebAuthn] Platform authenticator available");
      } else {
        console.log("🔐 [WebAuthn] Not available on this device");
      }
    })();
  }, []);

  useEffect(() => {
    void refreshWebAuthnDevices();
  }, [user?.id]);

  const loadBiometricStatus = async () => {
    const info = await getBiometricInfo();
    const enabledRaw = await readSecure(BIOMETRIC_ENABLED_KEY);
    setBiometricStatus({
      available: info.available,
      enrolled: info.enrolled,
      enabled: !isDemo && enabledRaw === "1",
      type: info.type,
      label: info.label,
    });
  };

  const enrichUserWithPlant = async (targetUser: User): Promise<User> => {
    const enriched = { ...targetUser };

    if (enriched.plantId && enriched.companyName) {
      console.log("✅ [enrich] Already has full context:", {
        company: enriched.companyName,
        plant: enriched.plantName,
      });
      return enriched;
    }

    try {
      console.log("📡 [enrich] Fetching /api/users/me");

      // ✅ FIX: Removed manual token retrieval. Global fetchSetup handles it.
      const response = await fetch(`${API_BASE_URL}/api/users/me`);

      if (response.ok) {
        const profile = await response.json();
        console.log("📥 [enrich] Profile response:", profile);

        enriched.companyId = profile.companyId ?? enriched.companyId;
        enriched.companyCode = profile.companyCode ?? enriched.companyCode;
        enriched.companyName = profile.companyName ?? enriched.companyName;

        enriched.plantId = profile.plantId ?? enriched.plantId;
        enriched.plantCode = profile.plantCode ?? enriched.plantCode;
        enriched.plantName = profile.plantName ?? enriched.plantName;

        enriched.siteId = profile.siteId ?? enriched.siteId;
        enriched.siteCode = profile.siteCode ?? enriched.siteCode;
        enriched.siteName = profile.siteName ?? enriched.siteName;

        enriched.unitId = profile.unitId ?? enriched.unitId;
        enriched.unitCode = profile.unitCode ?? enriched.unitCode;
        enriched.unitName = profile.unitName ?? enriched.unitName;

        console.log("✅ [enrich] After merge:", {
          companyName: enriched.companyName,
          plantName: enriched.plantName,
        });
      } else {
        console.warn("⚠️ [enrich] Profile fetch failed:", response.status);
      }
    } catch (err) {
      // If the global interceptor caught a 401, it will have already kicked the user out.
      console.warn("⚠️ [enrich] Could not fetch profile:", err);
    }

    if (enriched.plantId && !enriched.plantName) {
      try {
        const plants = await auditScheduleApi.getPlants();
        const found = plants.find(
          (p: any) => String(p.id) === String(enriched.plantId),
        );
        if (found) {
          enriched.plantName = found.name || `Plant ${enriched.plantId}`;
          console.log("✅ [enrich] Resolved plantName:", enriched.plantName);
        }
      } catch (err) {
        console.warn("⚠️ [enrich] Could not resolve plantName:", err);
      }
    }

    return enriched;
  };

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      let storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

      console.log("🔍 useAuth - Token exists:", !!token);
      console.log("🔍 useAuth - Stored user exists:", !!storedUser);

      // If NO token, we're definitely logged out.
      if (!token) {
        console.log("🔍 useAuth - No token → logged out");
        setUser(null);
        setIsLoading(false);
        return;
      }

      // If we have a token but no stored user, we MUST fetch from /me
      if (!storedUser) {
        console.log(
          "🔍 useAuth - Token exists but no stored user. Fetching /me...",
        );
        try {
          // ✅ FIX: Removed manual token header. Global fetchSetup handles it.
          const res = await fetch(`${API_BASE_URL}/api/users/me`);

          if (res.ok) {
            const profile = await res.json();
            const freshUser = {
              ...profile,
              token,
              role: normalizeRole(profile.role) || "AUDITOR",
            };
            await AsyncStorage.setItem(
              USER_STORAGE_KEY,
              JSON.stringify(freshUser),
            );
            setUser(freshUser);
            setIsLoading(false);
            return;
          } else {
            // Token invalid
            console.log("🔍 useAuth - /me failed. Logging out.");
            await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_STORAGE_KEY]);
            setUser(null);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // If apiFetch throws a 401, it already logged them out and redirected.
          console.warn("🔍 useAuth - /me fetch failed:", e);
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      // We have token AND stored user. Load from cache instantly, then enrich.
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser.role) {
          parsedUser.role = normalizeRole(parsedUser.role) || "AUDITOR";
        }
        setUser(parsedUser);
        setIsLoading(false); // ← Set loading false immediately after user is set

        // Enrich in the background
        const enriched = await enrichUserWithPlant(parsedUser);
        setUser(enriched);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(enriched));
      } catch (e) {
        console.error("Failed to parse user from AsyncStorage", e);
        await AsyncStorage.multiRemove([USER_STORAGE_KEY, AUTH_TOKEN_KEY]);
        setUser(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      const normalizedRole = normalizeRole(userData.role) || "AUDITOR";

      const baseUser: User = {
        ...userData,
        role: normalizedRole,
        firstName: userData.firstName || userData.name?.split(" ")[0] || "",
        lastName: userData.lastName || userData.name?.split(" ")[1] || "",
      };

      console.log("✅ [useAuth.login] Base user:", baseUser);

      const userWithRole = await enrichUserWithPlant(baseUser);

      console.log("✅ [useAuth.login] Enriched user:", userWithRole);

      await AsyncStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(userWithRole),
      );
      if (userData.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, userData.token);
      }
      await AsyncStorage.setItem("userRole", normalizedRole);

      setUser(userWithRole);

      // 🧹 Best-effort: sync accepted credentials with the browser after login.
      // Runs silently on unsupported browsers.
      try {
        const devices = await listWebAuthnCredentials(Number(userWithRole.id));
        const accepted = devices.map((d) => d.credentialId);
        if (accepted.length > 0) {
          await signalAllAcceptedCredentials(
            userHandleB64Url(userWithRole.id),
            accepted,
          );
        }
      } catch (e) {
        console.warn("Signal API sync after login failed (ignored):", e);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log("🔴 useAuth - Logging out...");

      setUser(null);
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        USER_STORAGE_KEY,
        "userRole",
        "userName",
        "userEmail",
        "refreshToken",
      ]);

      const enabledRaw = await readSecure(BIOMETRIC_ENABLED_KEY);
      setBiometricStatus((s) => ({ ...s, enabled: enabledRaw === "1" }));

      setWebAuthnDevices([]);

      console.log(
        "✅ useAuth - Logout - Auth cleared, biometric preserved:",
        enabledRaw,
      );
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser: User = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    try {
      if (!user?.id) {
        console.warn("⚠️ [refreshUser] No user id — skipping");
        return;
      }

      console.log("🔄 [refreshUser] Re-fetching profile for id:", user.id);

      const refreshed = await enrichUserWithPlant({ ...user });
      setUser(refreshed);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(refreshed));

      console.log("✅ [refreshUser] User refreshed");
    } catch (err) {
      console.error("❌ [refreshUser] Failed:", err);
    }
  };

  const enrollBiometric = async (): Promise<boolean> => {
    if (isDemo) {
      setBiometricStatus((s) => ({ ...s, enabled: true }));
      return true;
    }
    if (!user) return false;

    const info = await getBiometricInfo();
    if (!info.available || !info.enrolled) return false;

    const ok = await promptBiometric("Enable biometric unlock for Qsutra");
    if (!ok) return false;

    let token: string | null = null;
    try {
      token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch {}
    if (!token && Platform.OS === "web") {
      try {
        token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {}
    }
    if (!token) {
      console.warn("🔒 [enroll] No token found — cannot enroll biometric");
      return false;
    }

    console.log("🔒 [enroll] Saving user + token to secure storage");

    await saveSecure(BIOMETRIC_USER_KEY, JSON.stringify(user));
    await saveSecure(BIOMETRIC_TOKEN_KEY, token);
    await saveSecure(BIOMETRIC_ENABLED_KEY, "1");

    setBiometricStatus((s) => ({ ...s, enabled: true }));
    return true;
  };

  const unlockWithBiometric = async (): Promise<User | null> => {
    if (isDemo) return null;

    const enabledRaw = await readSecure(BIOMETRIC_ENABLED_KEY);
    console.log("🔓 [unlock] enabledRaw:", enabledRaw);
    if (enabledRaw !== "1") {
      console.log("🔓 [unlock] early return: not enabled");
      return null;
    }

    const ok = await promptBiometric("Unlock Qsutra");
    console.log("🔓 [unlock] promptBiometric result:", ok);
    if (!ok) {
      console.log("🔓 [unlock] early return: prompt failed or cancelled");
      return null;
    }

    const userStr = await readSecure(BIOMETRIC_USER_KEY);
    const token = await readSecure(BIOMETRIC_TOKEN_KEY);
    console.log("🔓 [unlock] userStr present:", !!userStr);
    console.log("🔓 [unlock] token present:", !!token);
    if (!userStr || !token) {
      console.log("🔓 [unlock] early return: missing user or token");
      return null;
    }

    let parsed: User;
    try {
      parsed = JSON.parse(userStr);
    } catch {
      console.log("🔓 [unlock] early return: JSON parse failed");
      return null;
    }
    parsed.role = normalizeRole(parsed.role) || "AUDITOR";

    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed));
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem("userRole", parsed.role);
    setUser(parsed);

    console.log("🔓 [unlock] success");
    return parsed;
  };

  const disableBiometric = async (): Promise<void> => {
    await deleteSecure(BIOMETRIC_USER_KEY);
    await deleteSecure(BIOMETRIC_TOKEN_KEY);
    await deleteSecure(BIOMETRIC_ENABLED_KEY);
    setBiometricStatus((s) => ({ ...s, enabled: false }));
  };

  /* ============================================================
   * WebAuthn methods (web biometric / passkeys)
   * ============================================================ */

  const registerWebAuthnDevice = async (
    deviceName?: string,
  ): Promise<boolean> => {
    if (!user) {
      console.warn("🔐 [WebAuthn] Cannot register — no logged-in user");
      return false;
    }
    if (!webAuthnAvailable) {
      console.warn("🔐 [WebAuthn] Not available on this device");
      return false;
    }

    setWebAuthnBusy(true);
    try {
      const result = await registerWebAuthn(
        user.username || String(user.id),
        deviceName,
      );

      if (!result.success) {
        console.error("🔐 [WebAuthn] register failed:", result.error);
        return false;
      }

      console.log("✅ [WebAuthn] device registered:", result.credentialId);
      await refreshWebAuthnDevices();
      return true;
    } catch (e) {
      console.error("🔐 [WebAuthn] register exception:", e);
      return false;
    } finally {
      setWebAuthnBusy(false);
    }
  };

  const loginWithWebAuthn = async (username: string): Promise<User | null> => {
    if (!webAuthnAvailable) {
      console.warn("🔐 [WebAuthn] Not available on this device");
      return null;
    }

    setWebAuthnBusy(true);
    try {
      const result = await webauthnLogin(username);

      if (!result.success || !result.token || !result.user) {
        console.error("🔐 [WebAuthn] login failed:", result.error);
        return null;
      }

      const rawUser = result.user;
      const normalizedRole = normalizeRole(rawUser.role) || "AUDITOR";

      const userData: User = {
        id: rawUser.id || "1",
        role: normalizedRole,
        name: rawUser.name || rawUser.username || username,
        username: rawUser.username || username,
        email: rawUser.email || `${username}@example.com`,
        firstName: rawUser.firstName || "",
        lastName: rawUser.lastName || "",
        department: rawUser.department || null,
        profilePhoto:
          rawUser.profilePhoto ||
          (rawUser.id
            ? `${API_BASE_URL}/api/users/${rawUser.id}/profile-photo`
            : ""),
        token: result.token,
      };

      await login(userData);

      console.log("✅ [WebAuthn] login success for", username);
      return userData;
    } catch (e) {
      console.error("🔐 [WebAuthn] login exception:", e);
      return null;
    } finally {
      setWebAuthnBusy(false);
    }
  };

  const loginWithDiscoverablePasskey = async (): Promise<User | null> => {
    if (!webAuthnAvailable) {
      console.warn("🔐 [WebAuthn] Not available on this device");
      return null;
    }

    setWebAuthnBusy(true);
    try {
      const result = await webauthnDiscoverableLogin();

      if (!result.success || !result.token || !result.user) {
        console.error("🔐 [WebAuthn] discoverable login failed:", result.error);
        return null;
      }

      const rawUser = result.user;
      const normalizedRole = normalizeRole(rawUser.role) || "AUDITOR";

      const userData: User = {
        id: rawUser.id || "1",
        role: normalizedRole,
        name: rawUser.name || rawUser.username || "User",
        username: rawUser.username || "",
        email: rawUser.email || "",
        firstName: rawUser.firstName || "",
        lastName: rawUser.lastName || "",
        department: rawUser.department || null,
        profilePhoto:
          rawUser.profilePhoto ||
          (rawUser.id
            ? `${API_BASE_URL}/api/users/${rawUser.id}/profile-photo`
            : ""),
        token: result.token,
      };

      await login(userData);

      console.log(
        "✅ [WebAuthn] discoverable login success for",
        userData.username,
      );
      return userData;
    } catch (e) {
      console.error("🔐 [WebAuthn] discoverable login exception:", e);
      return null;
    } finally {
      setWebAuthnBusy(false);
    }
  };

  /**
   * Remove a WebAuthn device (passkey).
   * Also tells the browser to forget it via the Signal API, so the
   * passkey no longer appears in the picker.
   */
  const removeWebAuthnDevice = async (
    credentialId: number,
  ): Promise<boolean> => {
    if (!user) return false;

    setWebAuthnBusy(true);
    try {
      // Grab the credentialId string BEFORE deleting — we need it for the signal
      const device = webAuthnDevices.find((d) => d.id === credentialId);
      const credentialIdB64 = device?.credentialId;

      const ok = await removeWebAuthnCredential(credentialId, Number(user.id));
      if (ok) {
        console.log("✅ [WebAuthn] device removed from DB:", credentialId);

        // 🧹 Tell the browser to hide this passkey from its picker
        if (credentialIdB64) {
          await signalUnknownCredential(credentialIdB64);
        }

        await refreshWebAuthnDevices();
      }
      return ok;
    } catch (e) {
      console.error("🔐 [WebAuthn] remove exception:", e);
      return false;
    } finally {
      setWebAuthnBusy(false);
    }
  };

  const refreshWebAuthnDevices = async (): Promise<void> => {
    if (!user?.id) {
      setWebAuthnDevices([]);
      return;
    }
    try {
      const list = await listWebAuthnCredentials(Number(user.id));
      setWebAuthnDevices(list);
    } catch (e) {
      console.error("🔐 [WebAuthn] refresh devices failed:", e);
      setWebAuthnDevices([]);
    }
  };

  const userHasWebAuthnDevices = async (username: string): Promise<boolean> => {
    return checkUserHasWebAuthnDevices(username);
  };

  const isAuthenticated = !!user;
  const isMaster = user ? normalizeRole(user.role) === "MASTER" : false;

  return {
    user,
    isLoading,
    isAuthenticated,
    isMaster,
    login,
    logout,
    updateUser,
    refreshUser,
    biometricStatus,
    enrollBiometric,
    unlockWithBiometric,
    disableBiometric,

    webAuthnDevices,
    webAuthnAvailable,
    webAuthnBusy,
    registerWebAuthnDevice,
    loginWithWebAuthn,
    removeWebAuthnDevice,
    refreshWebAuthnDevices,
    userHasWebAuthnDevices,
    loginWithDiscoverablePasskey,
  };
};
