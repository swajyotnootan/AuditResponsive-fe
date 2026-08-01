// app/(app)/_layout.tsx
import { useAuth } from '@/components/context/AuthContext';
import Navbar from '@/components/Navbar';
import SmartNavigator from '@/components/navigation/SmartNavigator';
import { Redirect, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const toggleDrawer = useCallback(() => {
    setDrawerVisible(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
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
        <Navbar onMenuPress={toggleDrawer} />
      </View>
      
      {/* Content area with drawer */}
      <View style={{ flex: 1 }}>
        {/* ✅ Drawer inside content - starts below Navbar */}
        {drawerVisible && (
          <View style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            zIndex: 5, 
            flexDirection: 'row' 
          }}>
            <View style={{ 
              width: SCREEN_WIDTH * 0.8, 
              maxWidth: 300,
              backgroundColor: 'white',
            }}>
              <SmartNavigator type="drawer" onClose={closeDrawer} />
            </View>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
              activeOpacity={1}
              onPress={closeDrawer}
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