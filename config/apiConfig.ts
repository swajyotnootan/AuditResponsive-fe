// config/apiConfig.ts
import { Platform } from "react-native";

const clean = (v?: string | null) => (v ? v.trim().replace(/\/$/, "") : "");

// Turns https://example.com into wss://example.com/ws
// Turns http://example.com  into ws://example.com/ws
const toWsUrl = (httpUrl: string, path: string) => {
  if (!httpUrl) return "";
  const secure = httpUrl.startsWith("https://");
  const base = httpUrl.replace(/^https?:\/\//, "");
  return `${secure ? "wss" : "ws"}://${base}${path}`;
};

// ---------- API URL ----------
const ENV_API_URL = clean(
  process.env.EXPO_PUBLIC_API_URL || process.env.API_URL,
);

const DEFAULT_API_URL = Platform.select({
  web: "http://localhost:8080",
  ios: "http://10.2.0.40:8080",
  android: "http://10.2.0.40:8080",
  default: "http://localhost:8080",
})!;

export const API_BASE_URL = ENV_API_URL || DEFAULT_API_URL;

// ---------- WebSocket URL ----------
// If you set EXPO_PUBLIC_WS_URL, use that.
// Otherwise build it from API_BASE_URL automatically.
const ENV_WS_URL = clean(process.env.EXPO_PUBLIC_WS_URL || process.env.WS_URL);

export const WS_URL = ENV_WS_URL || toWsUrl(API_BASE_URL, "/ws");

// ---------- App mode ----------
export const IS_DEMO_ENV =
  (process.env.EXPO_PUBLIC_APP_MODE || "demo") === "demo";
