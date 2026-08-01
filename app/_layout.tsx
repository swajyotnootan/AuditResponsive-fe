import { AuthProvider, useAuth } from '@/components/context/AuthContext';
import { NotificationProvider } from '@/components/context/NotificationContext';
import { SidebarProvider } from '@/components/context/SidebarContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, LogBox, Platform } from 'react-native';
import './global.css';

LogBox.ignoreAllLogs(true);

// Keep the native splash screen visible while we fetch assets (Only on Mobile)
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

function RootLayoutContent() {
  const { loading, isAuthenticated } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // Starts fully visible

  // Handle Animation and Splash Screen Hide
  useEffect(() => {
    if (loading) {
      // Spin the loader while checking auth
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Loading finished. Mark app as ready.
      setAppIsReady(true);
    }
  }, [loading]);

  // Handle the Fade-out transition
  useEffect(() => {
    if (appIsReady) {
      // 1. Wait 1.2 seconds so user sees the static splash image
      setTimeout(async () => {
        // 2. Fade out the splash screen smoothly (MNC feel)
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800, // 0.8 second fade out
          useNativeDriver: true,
        }).start(async () => {
          // 3. Hide the native splash screen completely (Only if NOT Web)
          if (Platform.OS !== 'web') {
            await SplashScreen.hideAsync();
          }
        });
      }, 1200); // 1.2 seconds delay to show the brand
    }
  }, [appIsReady]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (loading || !appIsReady) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', opacity: fadeAnim }}>
        
        {/* SHOW YOUR SPLASH IMAGE (FULL SCREEN) */}
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="contain"
        />
        
        {/* SHOW YOUR SPINNING LOADER ON TOP */}
        <Animated.Image
          source={require('@/assets/images/icon.png')} 
          style={{ 
            width: 80, 
            height: 80, 
            transform: [{ rotate: spin }],
            marginTop: Platform.OS === 'web' ? 250 : 200 // Adjust spacing for web vs mobile
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
    <AuthProvider>
      <NotificationProvider>
        <SidebarProvider>
          <RootLayoutContent />
        </SidebarProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}