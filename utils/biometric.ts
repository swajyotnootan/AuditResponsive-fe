// utils/biometric.ts
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type BiometricType = "fingerprint" | "face" | "iris" | "none";

export type BiometricInfo = {
  available: boolean;
  enrolled: boolean;
  type: BiometricType;
  label: string;
};

/* -------------------------------------------------------------------------- */
/* Web helper: use WebAuthn directly                                         */
/* -------------------------------------------------------------------------- */
async function webBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (!w.PublicKeyCredential) return false;
  if (
    typeof w.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable !== "function"
  ) {
    return false;
  }
  try {
    const ok =
      await w.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return ok === true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getBiometricInfo(): Promise<BiometricInfo> {
  /* -------- WEB: bypass expo-local-authentication, use WebAuthn directly -------- */
  if (Platform.OS === "web") {
    const available = await webBiometricAvailable();
    console.log("🌐 [biometric web] available:", available);

    if (available) {
      return {
        available: true,
        enrolled: true,
        type: "fingerprint",
        label: "Windows Hello",
      };
    }
    return {
      available: false,
      enrolled: false,
      type: "none",
      label: "Not available",
    };
  }

  /* -------- NATIVE (iOS / Android) -------- */
  /* -------- NATIVE (iOS / Android) -------- */
  /* -------- NATIVE (iOS / Android) -------- */
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    console.log(
      "🔐 [native] hw:",
      hasHardware,
      "enrolled:",
      isEnrolled,
      "types:",
      types,
      "platform:",
      Platform.OS,
    );

    if (!hasHardware) {
      return {
        available: false,
        enrolled: false,
        type: "none",
        label: "No sensor",
      };
    }

    let type: BiometricType = "none";
    let label = "Biometric";

    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      type = "face";
      label = Platform.OS === "ios" ? "Face ID" : "Face Recognition";
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      type = "fingerprint";
      label = Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      type = "iris";
      label = "Iris";
    }

    return {
      available: hasHardware,
      enrolled: isEnrolled,
      type,
      label,
    };
  } catch (err) {
    console.warn("biometric check failed:", err);
    return {
      available: false,
      enrolled: false,
      type: "none",
      label: "Unavailable",
    };
  }
}

/**
 * Trigger the biometric prompt.
 * On web, we can't run full WebAuthn (needs a server challenge), so we use
 * a confirm() dialog to prove the flow. On native, the real OS prompt fires.
 */
export async function promptBiometric(
  reason = "Sign in to Qsutra",
): Promise<boolean> {
  /* -------- WEB -------- */
  if (Platform.OS === "web") {
    const available = await webBiometricAvailable();
    if (!available) return false;
    try {
      return window.confirm(
        `${reason}\n\nPress OK to confirm biometric unlock.`,
      );
    } catch {
      return false;
    }
  }

  /* -------- NATIVE -------- */
  try {
    const info = await getBiometricInfo();
    if (!info.available || !info.enrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Use password",
      disableDeviceFallback: false,
      requireConfirmation: false,
    });

    return result.success === true;
  } catch (err) {
    console.warn("biometric prompt failed:", err);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Secure storage wrappers                                                   */
/* -------------------------------------------------------------------------- */

export async function saveSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(`qsutra.${key}`, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readSecure(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(`qsutra.${key}`);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(`qsutra.${key}`);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

/* -------------------------------------------------------------------------- */
/* Storage keys                                                              */
/* -------------------------------------------------------------------------- */

export const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
export const BIOMETRIC_USER_KEY = "biometric_user";
export const BIOMETRIC_TOKEN_KEY = "biometric_token";
