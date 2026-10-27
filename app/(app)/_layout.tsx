// app/(app)/_layout.tsx
import { useAuth } from "@/components/context/AuthContext";
import { useSidebar } from "@/components/context/SidebarContext";
import { TodayWorkPopup } from "@/components/context/TodayWorkPopup";
import {
  TodayWorkPopupProvider,
  useTodayWorkPopup,
} from "@/components/context/TodayWorkPopupContext";
import Navbar from "@/components/Navbar";
import SmartNavigator from "@/components/navigation/SmartNavigator";
import { WelcomePopup } from "@/components/WelcomePopup";
import { API_BASE_URL } from "@/config/apiConfig";
import { consumeIntentionalLogout } from "@/utils/sessionFlags";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  LogBox,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";

if (Platform.OS === "android") {
  LogBox.ignoreLogs([
    "ViewPropTypes will be removed",
    "ColorPropType will be removed",
    "Require cycle:",
  ]);
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function AppLayout() {
  return (
    <TodayWorkPopupProvider>
      <AppLayoutInner />
    </TodayWorkPopupProvider>
  );
}

function AppLayoutInner() {
  const { user, logout } = useAuth();
  const { isOpen: drawerVisible, toggleSidebar, closeSidebar } = useSidebar();
  const { openOncePerDay } = useTodayWorkPopup();

  const lastUserIdRef = useRef<string | null>(null);

  // Welcome popup state
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<any>(null);
  const welcomeCheckedRef = useRef(false);

  // Gate the today-popup until welcome is dismissed
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // ✅ marks whether this mount is a fresh login (skip Today popup)
  const freshLoginRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      console.log("📱 AppLayout mounted on Android");
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 1) Welcome popup + fresh-login detection
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || welcomeCheckedRef.current) return;
    welcomeCheckedRef.current = true;

    (async () => {
      try {
        const pending = await AsyncStorage.getItem("@welcome_pending");

        if (pending !== "true") {
          setWelcomeDismissed(true);
          return;
        }

        // ✅ Fresh login → mark it so effect #3 can skip the Today popup
        freshLoginRef.current = true;

        const raw = await AsyncStorage.getItem("@welcome_user");
        let parsed: any = user;
        if (raw) {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = user;
          }
        }

        setWelcomeUser(parsed);
        setShowWelcome(true);

        await AsyncStorage.multiRemove(["@welcome_pending", "@welcome_user"]);
      } catch (e) {
        console.warn("Welcome flag read failed:", e);
        setWelcomeDismissed(true);
      }
    })();
  }, [user]);

  // ─────────────────────────────────────────────────────────────
  // 2) Session watchdog — kicks user out on 401 (revoked/expired)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        if (res.status === 401 && !stopped) {
          stopped = true;

          let reason = "Your session has ended. Please sign in again.";
          try {
            const body = await res.clone().json();
            if (body?.error) reason = body.error;
          } catch {}

          const wasIntentional = await consumeIntentionalLogout();
          if (!wasIntentional) {
            await AsyncStorage.setItem("@logout_reason", reason);
          }

          await logout();

          if (Platform.OS === "web" && typeof window !== "undefined") {
            window.location.href = "/auth/login";
          } else {
            router.replace("/auth/login" as any);
          }
        }
      } catch {}
    };

    void check();
    const id = setInterval(check, 15_000);

    let onFocus: (() => void) | undefined;
    let onVisible: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      onFocus = () => void check();
      onVisible = () => {
        if (document.visibilityState === "visible") void check();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisible);
    }

    return () => {
      stopped = true;
      clearInterval(id);
      if (onFocus) window.removeEventListener("focus", onFocus);
      if (onVisible)
        document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, logout]);

  // ─────────────────────────────────────────────────────────────
  // 2b) SSE — instant kick when this session is revoked remotely
  //     ✅ TOP-LEVEL EFFECT (was previously nested — that was the bug)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (typeof EventSource === "undefined") return;

    let closed = false;
    let retryDelay = 1000;
    let currentEs: EventSource | null = null;

    const connect = async () => {
      if (closed) return;

      // Retry reading the token a few times — handles login→dashboard race
      let token: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        token = await AsyncStorage.getItem("authToken");
        if (token) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!token) {
        console.warn("[SSE] no token after retries, retrying in 2s...");
        setTimeout(connect, 2000);
        return;
      }

      console.log("[SSE] opening with token:", token.slice(0, 20) + "...");
      const url = `${API_BASE_URL}/api/sessions/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      currentEs = es;

      es.addEventListener("connected", () => {
        console.log("[SSE] connected");
        retryDelay = 1000;
      });

      es.addEventListener("revoked", async (evt: MessageEvent) => {
        console.warn("[SSE] session revoked:", evt.data);
        closed = true;
        es.close();

        let reason = "Your session has ended. Please sign in again.";
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed?.reason) reason = parsed.reason;
        } catch {}

        const wasIntentional = await consumeIntentionalLogout();
        if (!wasIntentional) {
          await AsyncStorage.setItem("@logout_reason", reason);
        }

        await logout();
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = "/auth/login";
        } else {
          router.replace("/auth/login" as any);
        }
      });

      es.onerror = () => {
        es.close();
        currentEs = null;
        if (closed) return;
        console.log("[SSE] disconnected, retrying in", retryDelay, "ms");
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    };

    void connect();

    return () => {
      closed = true;
      currentEs?.close();
    };
  }, [user, logout]);

  // ─────────────────────────────────────────────────────────────
  // 3) Today's Work popup — SKIP on fresh login
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !user.id) return;
    if (!welcomeDismissed) return;

    if (freshLoginRef.current) {
      freshLoginRef.current = false;
      AsyncStorage.removeItem("@today_popup_auto_open").catch(() => {});
      lastUserIdRef.current = String(user.id);
      return;
    }

    const currentUserId = String(user.id);
    if (lastUserIdRef.current === currentUserId) return;

    const checkAutoOpen = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const flag = await AsyncStorage.getItem("@today_popup_auto_open");
        if (flag === "true") {
          await AsyncStorage.removeItem("@today_popup_auto_open");
          await openOncePerDay(currentUserId, 10000);
        }
      } catch (e) {
        console.warn("Failed to check auto-open flag:", e);
      } finally {
        lastUserIdRef.current = currentUserId;
      }
    };

    checkAutoOpen();
  }, [user, openOncePerDay, welcomeDismissed]);

  if (!user) {
    return null;
  }

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    setWelcomeDismissed(true);
  };

  useEffect(() => {
    if (!showWelcome) return;
    const t = setTimeout(() => handleCloseWelcome(), 1000);
    return () => clearTimeout(t);
  }, [showWelcome]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ zIndex: 10, elevation: 10 }}>
        <Navbar onMenuPress={toggleSidebar} />
      </View>

      <View style={{ flex: 1 }}>
        {drawerVisible && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5,
              flexDirection: "row",
            }}
          >
            <View
              style={{
                width: 256,
                height: "100%",
                backgroundColor: "white",
                elevation: 10,
                shadowColor: "#000",
                shadowOffset: { width: 2, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
              }}
            >
              <SmartNavigator type="drawer" onClose={closeSidebar} />
            </View>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
              activeOpacity={1}
              onPress={closeSidebar}
            />
          </View>
        )}

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>

      <TodayWorkPopup />

      <WelcomePopup
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        userData={welcomeUser}
      />
    </View>
  );
}
