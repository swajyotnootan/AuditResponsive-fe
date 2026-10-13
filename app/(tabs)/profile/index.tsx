import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotifications, setIsNotifications] = useState(true);
  const [isBiometric, setIsBiometric] = useState(false);
  const [isOffline, setIsOffline] = useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => router.push("/" as any),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#6C63FF", "#8B83FF"]}
          className="items-center rounded-b-3xl px-5 pb-8 pt-4"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-white/30 bg-white/20">
            <Feather name="user" size={40} color="white" />
          </View>
          <Text className="mt-3 text-2xl font-bold text-white">John Doe</Text>
          <Text className="text-sm text-white/80">Audit Manager</Text>
          <View className="mt-3 flex-row gap-3">
            <View className="rounded-full bg-white/20 px-4 py-1">
              <Text className="text-xs font-semibold text-white">Admin</Text>
            </View>
            <View className="rounded-full bg-white/20 px-4 py-1">
              <Text className="text-xs font-semibold text-white">5 Years</Text>
            </View>
            <View className="rounded-full bg-white/20 px-4 py-1">
              <Text className="text-xs font-semibold text-white">
                24 Audits
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View className="-mt-4 px-5">
          {/* Stats */}
          <View className="mb-5 flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <Text className="text-2xl font-bold text-primary">89%</Text>
              <Text className="text-xs text-gray-500">Completion Rate</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <Text className="text-2xl font-bold text-green-500">4.8</Text>
              <Text className="text-xs text-gray-500">Avg Rating</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <Text className="text-2xl font-bold text-blue-500">12</Text>
              <Text className="text-xs text-gray-500">This Month</Text>
            </View>
          </View>

          {/* Settings */}
          <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <Text className="mb-4 text-lg font-bold text-gray-800">
              <Feather name="settings" size={20} color="#6C63FF" /> Settings
            </Text>

            <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
              <View>
                <Text className="text-base text-gray-800">Dark Mode</Text>
                <Text className="text-xs text-gray-400">Enable dark theme</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: "#d1d5db", true: "#6C63FF" }}
                thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
              />
            </View>

            <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
              <View>
                <Text className="text-base text-gray-800">Notifications</Text>
                <Text className="text-xs text-gray-400">
                  Push notifications
                </Text>
              </View>
              <Switch
                value={isNotifications}
                onValueChange={setIsNotifications}
                trackColor={{ false: "#d1d5db", true: "#6C63FF" }}
                thumbColor={isNotifications ? "#ffffff" : "#f4f3f4"}
              />
            </View>

            <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
              <View>
                <Text className="text-base text-gray-800">Biometric Login</Text>
                <Text className="text-xs text-gray-400">
                  Face ID / Fingerprint
                </Text>
              </View>
              <Switch
                value={isBiometric}
                onValueChange={setIsBiometric}
                trackColor={{ false: "#d1d5db", true: "#6C63FF" }}
                thumbColor={isBiometric ? "#ffffff" : "#f4f3f4"}
              />
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View>
                <Text className="text-base text-gray-800">Offline Mode</Text>
                <Text className="text-xs text-gray-400">
                  Work without internet
                </Text>
              </View>
              <Switch
                value={isOffline}
                onValueChange={setIsOffline}
                trackColor={{ false: "#d1d5db", true: "#6C63FF" }}
                thumbColor={isOffline ? "#ffffff" : "#f4f3f4"}
              />
            </View>
          </View>

          {/* Account Options */}
          <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <TouchableOpacity className="flex-row items-center border-b border-gray-100 py-3">
              <Feather name="shield" size={20} color="#6B7280" />
              <Text className="ml-3 text-base text-gray-800">
                Privacy Policy
              </Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center border-b border-gray-100 py-3">
              <Feather name="file-text" size={20} color="#6B7280" />
              <Text className="ml-3 text-base text-gray-800">
                Terms of Service
              </Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3">
              <Feather name="help-circle" size={20} color="#6B7280" />
              <Text className="ml-3 text-base text-gray-800">
                Help & Support
              </Text>
              <View className="flex-1" />
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4"
            onPress={handleLogout}
          >
            <Text className="text-center font-semibold text-red-500">
              <Feather name="log-out" size={18} color="#EF4444" /> Logout
            </Text>
          </TouchableOpacity>

          <Text className="mb-5 text-center text-xs text-gray-400">
            Version 1.0.0 • Built with Expo + NativeWind
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
