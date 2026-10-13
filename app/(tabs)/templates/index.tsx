import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: number;
  usage: number;
  icon: string;
  color: string;
}

const templates: Template[] = [
  {
    id: "1",
    name: "Financial Audit",
    description:
      "Complete financial audit including balance sheet, income statement, and cash flow analysis.",
    category: "Financial",
    steps: 12,
    usage: 145,
    icon: "💰",
    color: "#6C63FF",
  },
  {
    id: "2",
    name: "ISO 9001 Compliance",
    description: "Quality management system audit for ISO 9001 certification.",
    category: "Compliance",
    steps: 15,
    usage: 89,
    icon: "📋",
    color: "#3B82F6",
  },
  {
    id: "3",
    name: "IT Security Assessment",
    description:
      "Comprehensive IT security audit including vulnerability and penetration testing.",
    category: "IT Audit",
    steps: 18,
    usage: 67,
    icon: "🛡️",
    color: "#EF4444",
  },
  {
    id: "4",
    name: "Environmental Impact",
    description: "Environmental compliance audit for regulatory requirements.",
    category: "Environmental",
    steps: 10,
    usage: 34,
    icon: "🌱",
    color: "#10B981",
  },
  {
    id: "5",
    name: "HR Compliance Review",
    description:
      "Human resources compliance audit covering policies and procedures.",
    category: "Compliance",
    steps: 8,
    usage: 23,
    icon: "👥",
    color: "#F59E0B",
  },
  {
    id: "6",
    name: "Supply Chain Audit",
    description:
      "Audit of supply chain processes, vendor management, and logistics.",
    category: "Operational",
    steps: 14,
    usage: 12,
    icon: "🚚",
    color: "#8B5CF6",
  },
];

export default function TemplatesScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const categories = [
    "all",
    "Financial",
    "Compliance",
    "IT Audit",
    "Environmental",
    "Operational",
  ];

  const filteredTemplates = templates.filter(
    (template) =>
      selectedCategory === "all" || template.category === selectedCategory,
  );

  const useTemplate = (template: Template) => {
    Alert.alert(
      "Use Template",
      `Create a new audit from "${template.name}" template?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Audit",
          onPress: () => {
            router.push("/create" as any);
          },
        },
      ],
    );
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <TouchableOpacity
      className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      onPress={() => useTemplate(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <View
          className="mr-3 h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${item.color}20` }}
        >
          <Text className="text-3xl">{item.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">
            {item.name}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={2}>
            {item.description}
          </Text>
          <View className="mt-2 flex-row items-center">
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${item.color}20` }}
            >
              <Text
                style={{ color: item.color }}
                className="text-xs font-medium"
              >
                {item.category}
              </Text>
            </View>
            <Text className="ml-3 text-xs text-gray-400">
              <Feather name="check-square" size={10} color="#9CA3AF" />{" "}
              {item.steps} steps
            </Text>
            <Text className="ml-3 text-xs text-gray-400">
              <Feather name="users" size={10} color="#9CA3AF" /> {item.usage}{" "}
              used
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#6C63FF", "#8B83FF"]}
          className="rounded-b-3xl px-5 pb-8 pt-4"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text className="text-2xl font-bold text-white">Audit Templates</Text>
          <Text className="mt-1 text-sm text-white/80">
            Start with a pre-built template or create your own
          </Text>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center rounded-xl bg-white/20 p-3"
              onPress={() => router.push("/create" as any)}
            >
              <Feather name="plus" size={18} color="white" />
              <Text className="ml-2 font-semibold text-white">Create New</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center rounded-xl bg-white/20 p-3">
              <Feather name="download" size={18} color="white" />
              <Text className="ml-2 font-semibold text-white">Import</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View className="px-5 pt-4">
          <Text className="mb-3 text-sm font-semibold text-gray-700">
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                className={`mr-2 rounded-full px-4 py-2 ${
                  selectedCategory === category
                    ? "bg-primary"
                    : "border border-gray-200 bg-white"
                }`}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  className={`capitalize ${
                    selectedCategory === category
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplate}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View className="items-center py-20">
                <Feather name="file-text" size={48} color="#D1D5DB" />
                <Text className="mt-4 text-center text-gray-500">
                  No templates found
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
