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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
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
  const { user, loading } = useAuth();
  const { isOpen: drawerVisible, toggleSidebar, closeSidebar } = useSidebar();
  const { openOncePerDay } = useTodayWorkPopup();

  // ✅ Track which user we've already tried to auto-open for
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      console.log("📱 AppLayout mounted on Android");
    }
  }, []);

  useEffect(() => {
    if (!user || !user.id) return;

    const currentUserId = String(user.id);

    // ✅ Only run once per user session (not per app session)
    if (lastUserIdRef.current === currentUserId) return;

    const checkAutoOpen = async () => {
      try {
        // Small delay ensures login page has finished writing the flag
        await new Promise((resolve) => setTimeout(resolve, 300));

        const flag = await AsyncStorage.getItem("@today_popup_auto_open");
        if (flag === "true") {
          await AsyncStorage.removeItem("@today_popup_auto_open");
          // 5-second auto-close
          await openOncePerDay(currentUserId, 10000);
        }
      } catch (e) {
        console.warn("Failed to check auto-open flag:", e);
      } finally {
        // ✅ Remember we checked for this user
        lastUserIdRef.current = currentUserId;
      }
    };

    checkAutoOpen();
  }, [user, openOncePerDay]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#5B4E97" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

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
    </View>
  );
}
