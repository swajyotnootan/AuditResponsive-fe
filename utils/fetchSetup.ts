// utils/fetchSetup.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const originalFetch = global.fetch;

global.fetch = async (input: any, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : (input?.url ?? String(input));

  const isBackendCall =
    (url.includes("/api/") || url.includes("API_BASE_URL")) &&
    !url.includes("/login") &&
    !url.includes("/signup") &&
    !url.startsWith("blob:") &&
    !url.startsWith("file:") &&
    !url.startsWith("data:");

  if (isBackendCall) {
    const token = await AsyncStorage.getItem("authToken");
    const headers = new Headers(init.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return originalFetch(input, { ...init, headers });
  }

  return originalFetch(input, init);
};
