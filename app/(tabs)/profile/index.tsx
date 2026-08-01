import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotifications, setIsNotifications] = useState(true);
  const [isBiometric, setIsBiometric] = useState(false);
  const [isOffline, setIsOffline] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => router.push('/' as any)
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6C63FF', '#8B83FF']}
          className="px-5 pt-4 pb-8 rounded-b-3xl items-center"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center border-2 border-white/30">
            <Feather name="user" size={40} color="white" />
          </View>
          <Text className="text-white text-2xl font-bold mt-3">John Doe</Text>
          <Text className="text-white/80 text-sm">Audit Manager</Text>
          <View className="flex-row gap-3 mt-3">
            <View className="bg-white/20 px-4 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">Admin</Text>
            </View>
            <View className="bg-white/20 px-4 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">5 Years</Text>
            </View>
            <View className="bg-white/20 px-4 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">24 Audits</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5 -mt-4">
          {/* Stats */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center">
              <Text className="text-2xl font-bold text-primary">89%</Text>
              <Text className="text-gray-500 text-xs">Completion Rate</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center">
              <Text className="text-2xl font-bold text-green-500">4.8</Text>
              <Text className="text-gray-500 text-xs">Avg Rating</Text>
            </View>
            <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center">
              <Text className="text-2xl font-bold text-blue-500">12</Text>
              <Text className="text-gray-500 text-xs">This Month</Text>
            </View>
          </View>

          {/* Settings */}
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-5">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              <Feather name="settings" size={20} color="#6C63FF" /> Settings
            </Text>
            
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View>
                <Text className="text-base text-gray-800">Dark Mode</Text>
                <Text className="text-xs text-gray-400">Enable dark theme</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#d1d5db', true: '#6C63FF' }}
                thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View>
                <Text className="text-base text-gray-800">Notifications</Text>
                <Text className="text-xs text-gray-400">Push notifications</Text>
              </View>
              <Switch
                value={isNotifications}
                onValueChange={setIsNotifications}
                trackColor={{ false: '#d1d5db', true: '#6C63FF' }}
                thumbColor={isNotifications ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View>
                <Text className="text-base text-gray-800">Biometric Login</Text>
                <Text className="text-xs text-gray-400">Face ID / Fingerprint</Text>
              </View>
              <Switch
                value={isBiometric}
                onValueChange={setIsBiometric}
                trackColor={{ false: '#d1d5db', true: '#6C63FF' }}
                thumbColor={isBiometric ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View className="flex-row justify-between items-center py-3">
              <View>
                <Text className="text-base text-gray-800">Offline Mode</Text>
                <Text className="text-xs text-gray-400">Work without internet</Text>
              </View>
              <Switch
                value={isOffline}
                onValueChange={setIsOffline}
                trackColor={{ false: '#d1d5db', true: '#6C63FF' }}
                thumbColor={isOffline ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Account Options */}
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-5">
            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <Feather name="shield" size={20} color="#6B7280" />
              <Text className="text-base text-gray-800 ml-3">Privacy Policy</Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
              <Feather name="file-text" size={20} color="#6B7280" />
              <Text className="text-base text-gray-800 ml-3">Terms of Service</Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3">
              <Feather name="help-circle" size={20} color="#6B7280" />
              <Text className="text-base text-gray-800 ml-3">Help & Support</Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            className="bg-red-50 p-4 rounded-2xl border border-red-200 mb-5"
            onPress={handleLogout}
          >
            <Text className="text-red-500 text-center font-semibold">
              <Feather name="log-out" size={18} color="#EF4444" /> Logout
            </Text>
          </TouchableOpacity>

          <Text className="text-center text-gray-400 text-xs mb-5">
            Version 1.0.0 • Built with Expo + NativeWind
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}