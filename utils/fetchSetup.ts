// utils/fetchSetup.ts
import { consumeIntentionalLogout } from "@/utils/sessionFlags";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Platform } from "react-native";

const originalFetch = global.fetch;
let redirecting = false;

global.fetch = async (input: any, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : (input?.url ?? String(input));

  const isBackendCall =
    url.includes("/api/") &&
    !url.includes("/login") &&
    !url.includes("/auth/login") &&
    !url.includes("/signup") &&
    !url.startsWith("blob:") &&
    !url.startsWith("file:") &&
    !url.startsWith("data:");

  let finalResponse: Response;

  if (isBackendCall) {
    const token = await AsyncStorage.getItem("authToken");
    const headers = new Headers(init.headers || {});
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    finalResponse = await originalFetch(input, { ...init, headers });
  } else {
    finalResponse = await originalFetch(input, init);
  }

  if (finalResponse.status === 401 && isBackendCall && !redirecting) {
    const path =
      Platform.OS === "web" && typeof window !== "undefined"
        ? (window.location?.pathname ?? "")
        : "";

    if (!path.includes("/auth/login")) {
      redirecting = true;

      const wasIntentional = await consumeIntentionalLogout();

      if (!wasIntentional) {
        let reason = "Your session has ended. Please sign in again.";
        try {
          const body = await finalResponse.clone().json();
          if (body?.error) reason = body.error;
        } catch {}
        await AsyncStorage.setItem("@logout_reason", reason);
      }

      await AsyncStorage.multiRemove([
        "authToken",
        "userRole",
        "userName",
        "userEmail",
        "user",
      ]);

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = "/auth/login";
      } else {
        router.replace("/auth/login" as any);
      }
    }
  }

  return finalResponse;
};
