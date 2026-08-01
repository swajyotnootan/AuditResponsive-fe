// app/(auth)/login.tsx
import { useAuth } from '@/components/context/AuthContext';
// At the top of login.tsx
import { API_BASE_URL } from '@/config/apiConfig';
import { normalizeRole } from '@/utils/roleUtils'; // ✅ ADD THIS
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

type Role = {
  label: string;
  username: string;
  password: string;
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  fg: string;
};

const ROLES: Role[] = [
  { label: 'Master', username: 'master', password: '1234567', icon: 'award', bg: 'bg-violet-50', fg: '#7C3AED' },
  { label: 'Audit Manager', username: 'audit.manager', password: '1234567', icon: 'briefcase', bg: 'bg-blue-50', fg: '#3B82F6' },
  { label: 'Lead Auditor', username: 'hr.lead', password: 'user123', icon: 'user-check', bg: 'bg-violet-50', fg: '#5B4E97' },
  { label: 'Initiator', username: 'initiator', password: 'init123', icon: 'file', bg: 'bg-green-50', fg: '#16A34A' },
  { label: 'Auditor', username: 'hr.aud1', password: 'user123', icon: 'users', bg: 'bg-cyan-50', fg: '#06B6D4' },
  { label: 'HOD', username: 'engg.hod', password: 'user123', icon: 'shield', bg: 'bg-orange-50', fg: '#EA580C' },
  { label: 'Auditee', username: 'hr.emp1', password: 'user123', icon: 'user', bg: 'bg-slate-50', fg: '#6B7280' },
  { label: 'HR Admin', username: 'hr.admin', password: 'user123', icon: 'settings', bg: 'bg-pink-50', fg: '#DB2777' },
  { label: 'Top Management', username: 'top.mgmt', password: 'user123', icon: 'briefcase', bg: 'bg-amber-50', fg: '#D97706' },
];

const GRADIENT: [string, string, string] = ['#8B80B3', '#6B5A92', '#473D72'];
const ACCENT = '#5B4E97';
const ACCENT_DARK = '#3F3566';
const ACCENT_TINT = '#EFEDF7';

// ============================================
// ROLE SELECT COMPONENT
// ============================================
function RoleSelect({
  value,
  onChange,
  isSubmitting,
}: {
  value: string;
  onChange: (role: Role) => void;
  isSubmitting: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoles = ROLES.filter((role) =>
    role.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedRole = ROLES.find((r) => r.label === value);

  return (
    <View className="w-full">
      <TouchableOpacity
        className="w-full min-h-11 flex-row items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200"
        onPress={() => setIsOpen(true)}
        disabled={isSubmitting}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          {selectedRole ? (
            <>
              <View className={`p-1 rounded-lg mr-2 ${selectedRole.bg}`}>
                <Feather name={selectedRole.icon} size={14} color={selectedRole.fg} />
              </View>
              <Text className="text-sm font-medium text-slate-700">{selectedRole.label}</Text>
            </>
          ) : (
            <>
              <Feather name="shield" size={16} color="#9CA3AF" />
              <Text className="text-sm text-slate-400 ml-2">Select your role...</Text>
            </>
          )}
        </View>
        <Feather name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 24 }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ width: '100%', maxWidth: 400, maxHeight: 420, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}
          >
            <View className="px-4 py-3 flex-row justify-between items-center" style={{ backgroundColor: ACCENT }}>
              <Text className="text-base font-semibold text-white">Select role</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} className="min-w-11 min-h-11 items-center justify-center">
                <Feather name="x" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="p-3 border-b border-slate-100">
              <View className="flex-row items-center min-h-11 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <Feather name="search" size={16} color="#9CA3AF" />
                <TextInput
                  placeholder="Search roles..."
                  className="flex-1 py-2 px-2 text-sm text-slate-800"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus={Platform.OS === 'web'}
                  placeholderTextColor="#9CA3AF"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchTerm('')} className="min-w-8 min-h-8 items-center justify-center">
                    <Feather name="x" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView className="px-2 py-1" style={{ maxHeight: 220 }}>
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => {
                  const isSelected = selectedRole?.label === role.label;
                  return (
                    <TouchableOpacity
                      key={role.label}
                      className={`flex-row items-center min-h-11 px-2 py-2 rounded-lg`}
                      style={{ backgroundColor: isSelected ? ACCENT_TINT : 'transparent' }}
                      onPress={() => {
                        onChange(role);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <View className={`p-1 rounded-lg mr-2 ${role.bg}`}>
                        <Feather name={role.icon} size={14} color={role.fg} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-slate-700">{role.label}</Text>
                        <Text className="text-xs text-slate-400">@{role.username}</Text>
                      </View>
                      {isSelected && <Feather name="check" size={16} color={ACCENT_DARK} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="py-6 items-center">
                  <Text className="text-sm text-slate-400">No roles found</Text>
                </View>
              )}
            </ScrollView>

            <View className="px-3 py-2 border-t border-slate-100 bg-slate-50 items-center">
              <Text className="text-xs text-slate-400">{filteredRoles.length} roles available</Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ============================================
// WELCOME POPUP
// ============================================
function WelcomePopup({
  isOpen,
  onClose,
  userData,
}: {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}) {
  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <View className="h-1" style={{ backgroundColor: ACCENT }} />
          <View className="p-6 items-center">
            <View className="w-16 h-16 items-center justify-center mb-4 rounded-full bg-emerald-50">
              <Feather name="check-circle" size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-slate-800 text-center">Welcome back!</Text>
            <Text className="text-sm text-slate-500 font-medium mt-1 text-center">
              {userData?.name || userData?.username}
            </Text>
            <View className="px-3 py-1 mt-2 rounded-full" style={{ backgroundColor: ACCENT_TINT }}>
              <Text className="text-xs font-medium" style={{ color: ACCENT_DARK }}>{userData?.role || 'User'}</Text>
            </View>
            <TouchableOpacity
              className="w-full min-h-11 mt-5 px-4 py-3 rounded-xl items-center justify-center"
              style={{ backgroundColor: ACCENT }}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text className="text-white text-center font-medium">Continue to dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// LOGIN FORM
// ============================================
function LoginForm({
  formData,
  error,
  showPassword,
  rememberMe,
  isSubmitting,
  onRoleChange,
  onChangeField,
  onTogglePassword,
  onToggleRemember,
  onSubmit,
}: {
  formData: { selectedField: string; username: string; password: string };
  error: string;
  showPassword: boolean;
  rememberMe: boolean;
  isSubmitting: boolean;
  onRoleChange: (role: Role) => void;
  onChangeField: (field: 'username' | 'password', value: string) => void;
  onTogglePassword: () => void;
  onToggleRemember: () => void;
  onSubmit: () => void;
}) {
  return (
    <>
      {!!error && (
        <View className="mb-3 p-3 rounded-lg border bg-red-50 border-red-200">
          <Text className="text-sm text-center text-red-500">{error}</Text>
        </View>
      )}

      <View className="mb-4">
        <Text className="text-sm font-medium mb-2 text-slate-500">Select Role</Text>
        <RoleSelect value={formData.selectedField} onChange={onRoleChange} isSubmitting={isSubmitting} />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium mb-2 text-slate-500">Username</Text>
        <View className="flex-row items-center min-h-11 border border-slate-200 rounded-xl px-4 bg-slate-50">
          <Feather name="user" size={16} color="#9AA1B1" />
          <TextInput
            className="flex-1 py-3 px-2 text-base text-slate-800"
            placeholder="Enter your username"
            placeholderTextColor="#9AA1B1"
            value={formData.username}
            onChangeText={(text) => onChangeField('username', text)}
            editable={!isSubmitting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium mb-2 text-slate-500">Password</Text>
        <View className="flex-row items-center min-h-11 border border-slate-200 rounded-xl px-4 bg-slate-50">
          <Feather name="lock" size={16} color="#9AA1B1" />
          <TextInput
            className="flex-1 py-3 px-2 text-base text-slate-800"
            placeholder="Enter your password"
            placeholderTextColor="#9AA1B1"
            value={formData.password}
            onChangeText={(text) => onChangeField('password', text)}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
          />
          <TouchableOpacity onPress={onTogglePassword} hitSlop={8} className="min-w-8 min-h-8 items-center justify-center">
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#9AA1B1" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-5">
        <TouchableOpacity className="flex-row items-center min-h-11 pr-2" onPress={onToggleRemember}>
          <View
            className="w-4 h-4 rounded items-center justify-center mr-2 border"
            style={{
              backgroundColor: rememberMe ? ACCENT : 'transparent',
              borderColor: rememberMe ? ACCENT : '#E2E8F0',
            }}
          >
            {rememberMe && <Feather name="check" size={10} color="white" />}
          </View>
          <Text className="text-sm text-slate-500">Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity className="min-h-11 justify-center">
          <Text className="text-sm font-medium" style={{ color: ACCENT }}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="w-full min-h-11 py-3 rounded-xl items-center justify-center flex-row"
        style={{ backgroundColor: ACCENT, opacity: isSubmitting ? 0.85 : 1 }}
        onPress={onSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color="white" />
            <Text className="text-white text-base font-medium ml-2">Signing in...</Text>
          </>
        ) : (
          <>
            <Feather name="log-in" size={16} color="white" />
            <Text className="text-white text-base font-medium ml-2">Sign in</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

// ============================================
// MAIN LOGIN SCREEN
// ============================================
export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  const [formData, setFormData] = useState({ selectedField: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role: Role) => {
    setFormData({ selectedField: role.label, username: role.username, password: role.password });
    setError('');
  };

  const handleInputChange = (field: 'username' | 'password', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

 const handleLogin = async () => {
  if (!formData.selectedField) return setError('Please select a role');
  if (!formData.username) return setError('Please enter username');
  if (!formData.password) return setError('Please enter password');

  try {
    setIsSubmitting(true);
    setError('');

    const params = new URLSearchParams();
    params.append('username', formData.username);
    params.append('password', formData.password);

    let response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      throw new Error(errBody?.message || 'Invalid username or password');
    }

    const data = await response.json();
    console.log('Login response:', data);

    const user = data.user || data;

    // ✅ CRITICAL FIX: Normalize the role!
    const normalizedRole = normalizeRole(user.role) || 'AUDITOR';
    
    console.log('✅ Normalized role:', normalizedRole);

    await AsyncStorage.multiSet([
      ['authToken', data.token || data.accessToken || 'dummy_token'],
      ['userRole', normalizedRole],
      ['userName', user.name || user.username || formData.username],
      ['userEmail', user.email || `${formData.username}@example.com`],
    ]);

    const profilePhotoUrl = user.profilePhoto || 
      (user.id ? `${API_BASE_URL}/api/users/${user.id}/profile-photo` : "");

    const userData = {
      id: user.id || '1',
      role: normalizedRole, // ✅ This is now "MASTER", "AUDITOR", etc.
      name: user.name || user.username || formData.username,
      email: user.email || `${formData.username}@example.com`,
      username: user.username || formData.username,
      department: user.department || 'Quality Assurance',
      field: formData.selectedField,
      profilePhoto: profilePhotoUrl,
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ')[1] || '',
    };

    console.log('✅ User data saved with role:', userData.role);

    await login(userData);
    setLoggedInUser(userData);
    setShowWelcomePopup(true);

    setTimeout(() => {
      setShowWelcomePopup(false);
      router.replace('/(app)/(tabs)' as any);
    }, 2500);

  } catch (err: any) {
    console.error('Login error:', err);
    setError(err.message || 'Invalid username or password. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  const formProps = {
    formData,
    error,
    showPassword,
    rememberMe,
    isSubmitting,
    onRoleChange: handleRoleSelect,
    onChangeField: handleInputChange,
    onTogglePassword: () => setShowPassword((v) => !v),
    onToggleRemember: () => setRememberMe((v) => !v),
    onSubmit: handleLogin,
  };

  // ============================================
  // WEB / TABLET — Split panel
  // ============================================
  if (isWeb) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={{ flexGrow: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={GRADIENT}
              style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 56, paddingVertical: 40 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={{ width: '100%', maxWidth: 360 }}>
                <Image
                  source={require('@/assets/QsutraQMS.png')}
                  style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 24 }}
                  resizeMode="contain"
                />
                <Text className="text-white font-bold text-xl">Qsutra - Quality Management System</Text>
                <Text className="text-white text-sm mt-1" style={{ opacity: 0.7 }}>
                  Ver 2.0.1 (7th April, 2025)
                </Text>

                <Text className="text-white text-xs mt-8" style={{ opacity: 0.6, lineHeight: 20 }}>
                  International copyright laws and treaties for Intellectual Property, govern and
                  protect this computer program. Any form of unauthorised reproduction, copying or
                  distribution of this program in whole or part, will attract severe civil and
                  criminal prosecution for maximum extent implications possible under law.
                </Text>

                <View
                  className="flex-row items-center px-4 py-2 mt-6 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start' }}
                >
                  <Feather name="shield" size={12} color="#fff" />
                  <Text className="text-xs font-medium text-white ml-2">Secure Access Only</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 }}>
            <View style={{ width: '100%', maxWidth: 440 }}>
              <View className="items-center mb-7">
                <Image
                  source={require('@/assets/Stratum.png')}
                  style={{ width: 150, height: 50, borderRadius: 6, marginBottom: 24 }}
                  resizeMode="contain"
                />
                <Text className="text-2xl font-bold text-slate-900">Internal Audits</Text>
                <Text className="text-sm text-slate-400 mt-2">Sign in to access your internal audit dashboard</Text>
              </View>

              <LoginForm {...formProps} />

              <View className="mt-6 pt-4 border-t border-slate-100 items-center">
                <Text className="text-center text-xs text-slate-400">
                  © 2025 Swajyot Technologies. All rights reserved.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userData={loggedInUser} />
      </SafeAreaView>
    );
  }

  // ============================================
  // MOBILE — Gradient hero + white card below
  // ============================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GRADIENT[2] }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 32, paddingHorizontal: 32 }}
          >
            <Image
              source={require('@/assets/QsutraQMS.png')}
              style={{ width: 100, height: 35, borderRadius: 16, marginBottom: 16 }}
              resizeMode="contain"
            />
            <Text className="text-white font-bold text-lg text-center">
              Qsutra - Quality Management System
            </Text>
            <Text className="text-white text-xs mt-1 text-center" style={{ opacity: 0.7 }}>
              Ver 2.0.1 (7th April, 2025)
            </Text>

            <View
              className="flex-row items-center px-3 py-2 mt-4 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Feather name="shield" size={11} color="#fff" />
              <Text className="text-xs font-medium text-white ml-2">Secure Access Only</Text>
            </View>
          </LinearGradient>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 28,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: -4 },
              elevation: 8,
            }}
          >
            <View className="items-center mb-6">
              <Image
                source={require('@/assets/Stratum.png')}
                style={{ width: 110, height: 38, borderRadius: 6, marginBottom: 16 }}
                resizeMode="contain"
              />
              <Text className="text-xl font-bold text-slate-900">Internal Audits</Text>
              <Text className="text-sm text-slate-400 mt-1 text-center">
                Sign in to access your dashboard
              </Text>
            </View>

            <LoginForm {...formProps} />

            <View className="mt-6 items-center" style={{ paddingBottom: 32 }}>
              <Text className="text-center text-xs text-slate-400">
                © 2025 Swajyot Technologies.{'\n'}All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <WelcomePopup isOpen={showWelcomePopup} onClose={() => setShowWelcomePopup(false)} userData={loggedInUser} />
    </SafeAreaView>
  );
}