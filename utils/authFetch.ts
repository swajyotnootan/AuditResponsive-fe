// utils/authFetch.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * fetch wrapper that auto-attaches the JWT from AsyncStorage.
 * Use for every protected API call.
 * Do NOT use for /api/users/login (public endpoint).
 */
export async function authFetch(
  input: RequestInfo | string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await AsyncStorage.getItem("authToken");

  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    !headers.has("Content-Type") &&
    init.body &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

export default authFetch;

const blobCache = new Map<string, string>();

export async function getAuthedFileUrl(
  endpoint: string,
): Promise<string | null> {
  if (blobCache.has(endpoint)) return blobCache.get(endpoint)!;
  try {
    const res = await authFetch(endpoint);
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    blobCache.set(endpoint, url);
    return url;
  } catch (e) {
    console.error("getAuthedFileUrl failed:", e);
    return null;
  }
}
