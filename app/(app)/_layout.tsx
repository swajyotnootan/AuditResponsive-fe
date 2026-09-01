// app/(app)/_layout.tsx
import { useAuth } from '@/components/context/AuthContext';
import { useSidebar } from '@/components/context/SidebarContext';
import Navbar from '@/components/Navbar';
import SmartNavigator from '@/components/navigation/SmartNavigator';
import { Redirect, Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, LogBox, Platform, TouchableOpacity, View } from 'react-native';

// ✅ Ignore specific warnings on Android
if (Platform.OS === 'android') {
  LogBox.ignoreLogs([
    'ViewPropTypes will be removed',
    'ColorPropType will be removed',
    'Require cycle:',
  ]);
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AppLayout() {
  const { user, loading } = useAuth();
  const { isOpen: drawerVisible, toggleSidebar, closeSidebar } = useSidebar();

  // ✅ Android crash prevention - only render if user exists
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('📱 AppLayout mounted on Android');
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#5B4E97" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ Navbar has higher zIndex, stays on top */}
      <View style={{ zIndex: 10, elevation: 10 }}>
        <Navbar onMenuPress={toggleSidebar} />
      </View>

      {/* Content area with drawer */}
      <View style={{ flex: 1 }}>
        {/* ✅ Drawer inside content - starts below Navbar */}
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
            {/* ✅ FIXED: Exact width match with SmartNavigator (256) */}
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

            {/* Overlay */}
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
    </View>
  );
}