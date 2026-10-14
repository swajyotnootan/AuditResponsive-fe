// config/apiConfig.ts
import { Platform } from "react-native";

// Explicit override wins (e.g. staging builds)
const ENV_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;

// Otherwise pick by platform
const DEFAULT_URL = Platform.select({
  web: "http://localhost:8080",
  ios: "http://10.2.0.40:8080",
  android: "http://10.2.0.40:8080",
  default: "http://localhost:8080",
});

export const API_BASE_URL = ENV_URL || DEFAULT_URL;

export const IS_DEMO_ENV =
  (process.env.EXPO_PUBLIC_APP_MODE || "demo") === "demo";
