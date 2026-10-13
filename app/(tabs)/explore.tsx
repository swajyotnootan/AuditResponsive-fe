import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: 1, name: "Design", color: "bg-purple-100", icon: "🎨" },
    { id: 2, name: "Tech", color: "bg-blue-100", icon: "💻" },
    { id: 3, name: "Photography", color: "bg-pink-100", icon: "📸" },
    { id: 4, name: "Music", color: "bg-green-100", icon: "🎵" },
    { id: 5, name: "Books", color: "bg-orange-100", icon: "📚" },
    { id: 6, name: "Sports", color: "bg-red-100", icon: "🏃" },
  ];

  const features = [
    {
      id: 1,
      name: "Camera",
      icon: <Feather name="camera" size={28} color="white" />,
      description: "Capture moments",
      color: "bg-blue-500",
    },
    {
      id: 2,
      name: "Location",
      icon: <Feather name="map-pin" size={28} color="white" />,
      description: "Find places",
      color: "bg-green-500",
    },
    {
      id: 3,
      name: "Messages",
      icon: <Feather name="message-circle" size={28} color="white" />,
      description: "Stay connected",
      color: "bg-purple-500",
    },
    {
      id: 4,
      name: "Music",
      icon: <Feather name="music" size={28} color="white" />,
      description: "Listen to tunes",
      color: "bg-pink-500",
    },
    {
      id: 5,
      name: "Photos",
      icon: <Feather name="image" size={28} color="white" />,
      description: "View gallery",
      color: "bg-orange-500",
    },
    {
      id: 6,
      name: "Settings",
      icon: <Feather name="settings" size={28} color="white" />,
      description: "Configure app",
      color: "bg-gray-500",
    },
  ];

  const renderFeature = ({ item }: { item: (typeof features)[0] }) => (
    <TouchableOpacity
      className="mb-4 w-[30%] items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      onPress={() => Alert.alert(item.name, `Opening ${item.name}...`)}
    >
      <View
        className={`${item.color} mb-2 h-14 w-14 items-center justify-center rounded-full`}
      >
        {item.icon}
      </View>
      <Text className="text-sm font-semibold text-gray-800">{item.name}</Text>
      <Text className="mt-1 text-center text-xs text-gray-400">
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View className="mb-5 flex-row items-center rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          <Feather
            name="search"
            size={20}
            color="#9CA3AF"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            className="flex-1 p-2 text-base text-gray-800"
            placeholder="Search features, categories..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="px-2"
            >
              <Feather name="x" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero Section */}
        <View className="mb-5 rounded-3xl bg-primary p-6">
          <Feather name="compass" size={32} color="white" />
          <Text className="mt-2 text-2xl font-bold text-white">Explore</Text>
          <Text className="mt-1 text-base text-white/80">
            Discover amazing features and tools
          </Text>
          <TouchableOpacity className="mt-4 flex-row items-center self-start rounded-full bg-white/20 px-6 py-2">
            <Text className="mr-2 font-semibold text-white">Get Started</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View className="mb-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800">Categories</Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary">
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-3"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                className={`${category.color} mr-3 min-w-[100px] items-center rounded-2xl p-4 shadow-sm`}
              >
                <Text className="mb-2 text-3xl">{category.icon}</Text>
                <Text className="text-sm font-semibold text-gray-700">
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Features */}
        <View className="mb-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800">
              Popular Features
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-primary">
                View All
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between">
            {features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                className="mb-4 w-[30%] items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                onPress={() =>
                  Alert.alert(feature.name, `Opening ${feature.name}...`)
                }
              >
                <View
                  className={`${feature.color} mb-2 h-14 w-14 items-center justify-center rounded-full`}
                >
                  {feature.icon}
                </View>
                <Text className="text-center text-sm font-semibold text-gray-800">
                  {feature.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Links */}
        <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Text className="mb-4 text-lg font-bold text-gray-800">
            <Feather name="link" size={20} color="#6C63FF" /> Quick Links
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-gray-100 py-3"
            onPress={() => Alert.alert("Profile", "Viewing your profile...")}
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Feather name="user" size={20} color="#6C63FF" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">
                  Profile
                </Text>
                <Text className="text-xs text-gray-400">
                  View and edit your profile
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-gray-100 py-3"
            onPress={() => Alert.alert("Settings", "Opening settings...")}
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Feather name="settings" size={20} color="#6B7280" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">
                  Settings
                </Text>
                <Text className="text-xs text-gray-400">App preferences</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => Alert.alert("About", "App version 1.0.0")}
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Feather name="info" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-800">
                  About
                </Text>
                <Text className="text-xs text-gray-400">Version 1.0.0</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
