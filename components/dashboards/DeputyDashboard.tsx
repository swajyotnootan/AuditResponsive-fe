import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/components/context/AuthContext";
export default function DeputyDashboard() {
  const { user } = useAuth();
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <ScrollView className="flex-1 p-4">
        <View className="mb-4 rounded-xl bg-blue-900 p-6">
          <Text className="text-2xl font-bold text-white">DeputyDashboard</Text>
          <Text className="mt-1 text-blue-200">Welcome, {user?.firstName}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
