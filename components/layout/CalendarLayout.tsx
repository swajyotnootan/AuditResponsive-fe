import { API_BASE_URL } from "@/config/apiConfig";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, LogOut } from "lucide-react-native";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { getDashboardPath, getRoleDisplayName } from "../../utils/roleUtils";
import { useAuth } from "../context/AuthContext";

// Replace with your actual asset paths
const QSUTRA_LOGO = require("../../assets/Qsutra_RMS_White_Logo_Small.png");
const STRATUM_LOGO = require("../../assets/RenewsysLogo.png");

export default function CalendarLayout({ children, onLogout }: any) {
  const navigation = useNavigation();
  const { user } = useAuth();

  const dashboardPath = getDashboardPath(user);
  // Simplified back button logic for RN
  const showBackButton = user && navigation.canGoBack();

  const getDisplayName = () => {
    if (!user?.name) return "User";
    return (
      user.name
        .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, "")
        .trim() || "User"
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-blue-900 px-4 pb-4 pt-12">
        <View className="flex-row items-center">
          <Image
            source={QSUTRA_LOGO}
            resizeMode="contain"
            className="mr-4 h-8 w-24"
          />
          {showBackButton && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="flex-row items-center rounded border border-white px-3 py-1.5"
            >
              <ArrowLeft size={16} color="#fff" />
              <Text className="ml-1 text-sm font-medium text-white">Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <View className="rounded bg-white px-3 py-1">
            <Image
              source={STRATUM_LOGO}
              resizeMode="contain"
              className="h-8 w-20"
            />
          </View>

          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-300">
            {user?.id ? (
              <Image
                source={{
                  uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo`,
                }}
                className="h-10 w-10"
              />
            ) : (
              <Text className="text-lg font-bold text-gray-700">
                {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
              </Text>
            )}
          </View>

          <View className="mr-2">
            <Text className="text-sm font-medium text-white">
              {getDisplayName()}
            </Text>
            <Text className="text-xs text-white/80">
              {user?.role === "SITE_SUPERVISOR"
                ? "Site-1 Supervisor"
                : getRoleDisplayName(user?.role)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onLogout}
            className="flex-row items-center rounded bg-red-600 px-3 py-2"
          >
            <LogOut size={18} color="#fff" />
            <Text className="ml-1 text-sm font-medium text-white">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        {children}
      </ScrollView>
    </View>
  );
}
