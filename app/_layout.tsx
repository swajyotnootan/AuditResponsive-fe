import "@/services/axiosSetup";
import "@/utils/fetchSetup";

import { AppModeProvider } from "@/components/context/AppModeContext";
import { AuthProvider, useAuth } from "@/components/context/AuthContext";
import { NotificationProvider } from "@/components/context/NotificationContext";
import { SidebarProvider } from "@/components/context/SidebarContext";
import { ToastProvider } from "@/components/context/ToastContext";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // ✅ ADDED

// ✅ Polyfill for Windows flag emojis — with font override
// ✅ Polyfill MUST run before CSS is imported
import "./global.css";

// ✅ Polyfill for Windows flag emojis — web only
if (Platform.OS === "web" && typeof document !== "undefined") {
  const { polyfillCountryFlagEmojis } = require("country-flag-emoji-polyfill");
  polyfillCountryFlagEmojis();
}
// Keep the native splash screen visible while we fetch assets (Only on Mobile)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

function RootLayoutContent() {
  const { loading, isAuthenticated } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);

  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      setAppIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    if (appIsReady) {
      setTimeout(async () => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(async () => {
          if (Platform.OS !== "web") {
            await SplashScreen.hideAsync();
          }
        });
      }, 1200);
    }
  }, [appIsReady]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (loading || !appIsReady) {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          opacity: fadeAnim,
        }}
      >
        <Image
          source={require("@/assets/images/splash-icon.png")}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode="contain"
        />
        <Animated.Image
          source={require("@/assets/images/icon.png")}
          style={{
            width: 80,
            height: 80,
            transform: [{ rotate: spin }],
            marginTop: Platform.OS === "web" ? 250 : 200,
          }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        )}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    // ✅ GestureHandlerRootView MUST be the outermost wrapper
    //    so drag/pan gestures work app-wide (Fishbone, 5 Why, etc.)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppModeProvider>
        <AuthProvider>
          <NotificationProvider>
            <SidebarProvider>
              <ToastProvider>
                <RootLayoutContent />
              </ToastProvider>
            </SidebarProvider>
          </NotificationProvider>
        </AuthProvider>
      </AppModeProvider>
    </GestureHandlerRootView>
  );
}
