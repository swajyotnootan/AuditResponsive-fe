// app/auth/forgot-password.tsx
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSent(true);
      Alert.alert('Success', 'Password reset link sent to your email');
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Feather name="arrow-left" size={24} color="#6B7280" />
          </TouchableOpacity>

          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-[#6C63FF10] rounded-full items-center justify-center">
              <Feather name="lock" size={32} color="#6C63FF" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mt-4">Forgot Password?</Text>
            <Text className="text-gray-500 text-center mt-2">
              Enter your email address and we'll send you a link to reset your password
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email Address</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!sent}
              />
            </View>

            {!sent ? (
              <TouchableOpacity
                className="bg-[#6C63FF] py-4 rounded-xl mt-4"
                onPress={handleSendReset}
                disabled={loading}
              >
                <Text className="text-white text-center font-semibold">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="bg-[#6C63FF] py-4 rounded-xl mt-4"
                onPress={() => router.push('/auth/login')}
              >
                <Text className="text-white text-center font-semibold">
                  Back to Login
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="mt-4"
              onPress={() => router.push('/auth/login')}
            >
              <Text className="text-[#6C63FF] text-center font-semibold">
                Remember your password? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}