// app/auth/register.tsx
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      // Simulate registration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      Alert.alert("Success", "Registration successful! Please login.");
      router.push("/auth/login");
    } catch (error) {
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-6"
        >
          {/* Header */}
          <View className="mb-8 mt-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
              <Feather name="arrow-left" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-gray-900">
              Create Account
            </Text>
            <Text className="mt-2 text-gray-500">Sign up to get started</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-gray-700">
                  First Name *
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
                  placeholder="John"
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium text-gray-700">
                  Last Name *
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                />
              </View>
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Email *
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
              />
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Company
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
                placeholder="Your company name"
                value={formData.company}
                onChangeText={(text) =>
                  setFormData({ ...formData, company: text })
                }
              />
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Password *
              </Text>
              <View className="relative">
                <TextInput
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-gray-800"
                  placeholder="Min 8 characters"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData({ ...formData, password: text })
                  }
                />
                <TouchableOpacity
                  className="absolute right-3 top-3"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Confirm Password *
              </Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800"
                placeholder="Confirm your password"
                secureTextEntry
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
              />
            </View>

            <TouchableOpacity
              className="mt-4 rounded-xl bg-[#6C63FF] py-4"
              onPress={handleRegister}
              disabled={loading}
            >
              <Text className="text-center font-semibold text-white">
                {loading ? "Creating account..." : "Create Account"}
              </Text>
            </TouchableOpacity>

            <View className="mt-4 flex-row justify-center">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text className="font-semibold text-[#6C63FF]">Sign In</Text>
              </TouchableOpacity>
            </View>

            <View className="h-8" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
