// utils/webauthn.ts
// Browser WebAuthn wrapper — works on Windows Hello, macOS Touch ID,
// Android fingerprint, iOS Face ID — whatever the platform provides.

import { API_BASE_URL } from "@/config/apiConfig";

// ============================================================
// BASE64URL <-> ArrayBuffer HELPERS
// ============================================================

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ============================================================
// AVAILABILITY
// ============================================================

export async function isWebAuthnAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ============================================================
// DEVICE LABEL
// ============================================================

function guessDeviceName(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;

  if (/Windows/i.test(ua)) return "Windows Hello";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac Touch ID";
  if (/iPhone/i.test(ua)) return "iPhone Face ID / Touch ID";
  if (/iPad/i.test(ua)) return "iPad Face ID / Touch ID";
  if (/Android/i.test(ua)) return "Android biometrics";
  return "This device";
}

// ============================================================
// WEBAUTHN SIGNAL API
// Lets the browser hide/remove credentials it should no longer offer.
// Spec: https://w3c.github.io/webauthn/#signal-methods
// Supported: Chrome/Edge 132+ (desktop), Chrome Android 144+
// Silently no-ops on unsupported browsers.
// ============================================================

/**
 * Tell the browser a specific credential is no longer valid.
 * Call after a 401 on verify, or right after the user deletes a passkey.
 */
export async function signalUnknownCredential(
  credentialIdB64Url: string,
  rpIdOverride?: string,
): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const PKC: any = (window as any).PublicKeyCredential;
    if (!PKC || typeof PKC.signalUnknownCredential !== "function") {
      console.log(
        "ℹ️ [Signal] signalUnknownCredential not supported in this browser",
      );
      return;
    }

    await PKC.signalUnknownCredential({
      rpId: rpIdOverride || window.location.hostname,
      credentialId: credentialIdB64Url,
    });
    console.log("✅ [Signal] Browser told to forget:", credentialIdB64Url);
  } catch (e) {
    console.warn("⚠️ [Signal] signalUnknownCredential failed:", e);
  }
}

/**
 * Tell the browser the complete, authoritative list of credentials this
 * user should have. The browser hides every other passkey it stored for
 * this rpId + userHandle.
 */
export async function signalAllAcceptedCredentials(
  userIdHandleB64Url: string,
  acceptedCredentialIdsB64Url: string[],
  rpIdOverride?: string,
): Promise<void> {
  try {
    if (typeof window === "undefined") return;
    const PKC: any = (window as any).PublicKeyCredential;
    if (!PKC || typeof PKC.signalAllAcceptedCredentials !== "function") {
      console.log(
        "ℹ️ [Signal] signalAllAcceptedCredentials not supported in this browser",
      );
      return;
    }

    await PKC.signalAllAcceptedCredentials({
      rpId: rpIdOverride || window.location.hostname,
      userId: userIdHandleB64Url,
      allAcceptedCredentialIds: acceptedCredentialIdsB64Url,
    });
    console.log(
      "✅ [Signal] Accepted credentials synced:",
      acceptedCredentialIdsB64Url.length,
    );
  } catch (e) {
    console.warn("⚠️ [Signal] signalAllAcceptedCredentials failed:", e);
  }
}

/**
 * Helper: encode a numeric user id the same way the backend does.
 * Backend uses: String.valueOf(userId).getBytes(StandardCharsets.UTF_8)
 */
export function userHandleB64Url(userId: string | number): string {
  const bytes = new TextEncoder().encode(String(userId));
  return bufferToBase64url(bytes.buffer);
}

// ============================================================
// REGISTER
// ============================================================

export async function registerWebAuthn(
  username: string,
  deviceName?: string,
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    if (!(await isWebAuthnAvailable())) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device.",
      };
    }

    // 1. Get challenge from backend
    const startRes = await fetch(
      `${API_BASE_URL}/api/webauthn/register/challenge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      },
    );

    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || `Server error (${startRes.status})`,
      };
    }

    const raw = await startRes.json();

    // Server returns { publicKey: { challenge, user, ... } }
    const options = raw?.publicKey ?? raw;

    // Guard: make sure the server returned proper options
    if (!options?.challenge || !options?.user?.id) {
      return {
        success: false,
        error: raw?.error || "Server returned invalid registration options",
      };
    }

    // 2. Convert base64url fields to ArrayBuffer (browser API requirement)
    const publicKey: PublicKeyCredentialCreationOptions = {
      ...options,
      challenge: base64urlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64urlToBuffer(options.user.id),
      },
      excludeCredentials:
        options.excludeCredentials?.map((c: any) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })) || [],
    };

    // 3. Prompt the user (Windows Hello dialog appears)
    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: "Registration was cancelled." };
    }

    const attestationResponse =
      credential.response as AuthenticatorAttestationResponse;

    // 4. Send the response back to the server
    const credentialJson = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
        attestationObject: bufferToBase64url(
          attestationResponse.attestationObject,
        ),
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };

    const verifyRes = await fetch(
      `${API_BASE_URL}/api/webauthn/register/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          credential: JSON.stringify(credentialJson),
          deviceName: deviceName || guessDeviceName(),
        }),
      },
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || `Verification failed (${verifyRes.status})`,
      };
    }

    const verifyData = await verifyRes.json();
    return {
      success: true,
      credentialId: verifyData.credentialId,
    };
  } catch (e: any) {
    console.error("registerWebAuthn failed:", e);
    return {
      success: false,
      error: e?.message || "Registration failed.",
    };
  }
}

// ============================================================
// LOGIN (username-based)
// ============================================================

export async function loginWithWebAuthn(
  username: string,
): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  try {
    if (!(await isWebAuthnAvailable())) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device.",
      };
    }

    // 1. Get challenge from backend
    const startRes = await fetch(
      `${API_BASE_URL}/api/webauthn/login/challenge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      },
    );

    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || `Server error (${startRes.status})`,
      };
    }

    const raw = await startRes.json();

    // Server returns { publicKey: { challenge, rpId, allowCredentials, ... } }
    const options = raw?.publicKey ?? raw;

    // Guard: make sure the server returned proper options
    if (!options?.challenge) {
      return {
        success: false,
        error: raw?.error || "Server returned invalid login options",
      };
    }

    const publicKey: PublicKeyCredentialRequestOptions = {
      ...options,
      challenge: base64urlToBuffer(options.challenge),
      allowCredentials:
        options.allowCredentials?.map((c: any) => ({
          ...c,
          id: base64urlToBuffer(c.id),
        })) || [],
    };

    // 2. Prompt the user
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: "Login was cancelled." };
    }

    const assertionResponse =
      credential.response as AuthenticatorAssertionResponse;

    // 3. Send the response back to the server
    const credentialJson = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
        authenticatorData: bufferToBase64url(
          assertionResponse.authenticatorData,
        ),
        signature: bufferToBase64url(assertionResponse.signature),
        userHandle: assertionResponse.userHandle
          ? bufferToBase64url(assertionResponse.userHandle)
          : null,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };

    const verifyRes = await fetch(`${API_BASE_URL}/api/webauthn/login/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        credential: JSON.stringify(credentialJson),
      }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));

      // 🧹 401 → the browser still has a stale passkey. Tell it to forget.
      if (verifyRes.status === 401 && credential?.id) {
        await signalUnknownCredential(credential.id);
      }

      return {
        success: false,
        error:
          err.error ||
          (verifyRes.status === 401
            ? "This passkey is no longer valid. Please sign in with your password and set up biometrics again."
            : `Verification failed (${verifyRes.status})`),
      };
    }

    const data = await verifyRes.json();
    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (e: any) {
    console.error("loginWithWebAuthn failed:", e);
    return {
      success: false,
      error: e?.message || "Login failed.",
    };
  }
}

// ============================================================
// LIST CREDENTIALS
// ============================================================

export async function listWebAuthnCredentials(userId: number): Promise<
  Array<{
    id: number;
    credentialId: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>
> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/webauthn/credentials?userId=${userId}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.credentials || [];
  } catch (e) {
    console.error("listWebAuthnCredentials failed:", e);
    return [];
  }
}

// ============================================================
// DELETE CREDENTIAL
// ============================================================

export async function removeWebAuthnCredential(
  credentialId: number,
  userId: number,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/webauthn/credentials/${credentialId}?userId=${userId}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (e) {
    console.error("removeWebAuthnCredential failed:", e);
    return false;
  }
}

// ============================================================
// CHECK WHETHER A USERNAME HAS ANY REGISTERED PASSKEY
// ============================================================

export async function userHasWebAuthnDevices(
  username: string,
): Promise<boolean> {
  const name = (username || "").trim();
  if (name.length < 2) return false;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/webauthn/credentials/count?username=${encodeURIComponent(
        name,
      )}`,
      { method: "GET" },
    );
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return (data?.count ?? 0) > 0;
  } catch (e) {
    console.error("userHasWebAuthnDevices failed:", e);
    return false;
  }
}

// ============================================================
// DISCOVERABLE (username-less) LOGIN
// ============================================================

export async function loginWithDiscoverablePasskey(): Promise<{
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}> {
  try {
    if (!(await isWebAuthnAvailable())) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device.",
      };
    }

    // 1. Ask server for a discoverable challenge (no username)
    const startRes = await fetch(
      `${API_BASE_URL}/api/webauthn/login/discoverable/challenge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || `Server error (${startRes.status})`,
      };
    }

    const payload = await startRes.json();
    const sessionKey: string = payload?.sessionKey;
    const optionsJson: string = payload?.optionsJson;

    if (!sessionKey || !optionsJson) {
      return {
        success: false,
        error: "Server returned invalid discoverable challenge",
      };
    }

    const parsed = JSON.parse(optionsJson);
    const options = parsed?.publicKey ?? parsed;

    if (!options?.challenge) {
      return {
        success: false,
        error: "Server returned invalid login options",
      };
    }

    const publicKey: PublicKeyCredentialRequestOptions = {
      ...options,
      challenge: base64urlToBuffer(options.challenge),
      // No allowCredentials — discoverable passkey picker
    };

    // 2. Prompt Windows Hello → user picks passkey from the list
    const credential = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    if (!credential) {
      return { success: false, error: "Login was cancelled." };
    }

    const assertionResponse =
      credential.response as AuthenticatorAssertionResponse;

    // 3. Send assertion back, along with the session key
    const credentialJson = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
        authenticatorData: bufferToBase64url(
          assertionResponse.authenticatorData,
        ),
        signature: bufferToBase64url(assertionResponse.signature),
        userHandle: assertionResponse.userHandle
          ? bufferToBase64url(assertionResponse.userHandle)
          : null,
      },
      clientExtensionResults: credential.getClientExtensionResults(),
    };

    const verifyRes = await fetch(
      `${API_BASE_URL}/api/webauthn/login/discoverable/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          credential: JSON.stringify(credentialJson),
        }),
      },
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));

      // 🧹 401 → the browser still has a stale passkey. Tell it to forget.
      // This is the main fix: after a failed login with a deleted passkey,
      // the browser will hide it from the picker on the next attempt.
      if (verifyRes.status === 401 && credential?.id) {
        await signalUnknownCredential(credential.id);
      }

      return {
        success: false,
        error:
          err.error ||
          (verifyRes.status === 401
            ? "This passkey is no longer valid. Please sign in with your password and set up biometrics again."
            : `Verification failed (${verifyRes.status})`),
      };
    }

    const data = await verifyRes.json();
    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (e: any) {
    console.error("loginWithDiscoverablePasskey failed:", e);
    return {
      success: false,
      error: e?.message || "Login failed.",
    };
  }
}
