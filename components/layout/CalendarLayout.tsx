import { API_BASE_URL } from '@/config/apiConfig';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getDashboardPath, getRoleDisplayName } from '../../utils/roleUtils';
import { useAuth } from '../context/AuthContext';

// Replace with your actual asset paths
const QSUTRA_LOGO = require('../../assets/Qsutra_RMS_White_Logo_Small.png');
const STRATUM_LOGO = require('../../assets/RenewsysLogo.png');

export default function CalendarLayout({ children, onLogout }: any) {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const dashboardPath = getDashboardPath(user);
  // Simplified back button logic for RN
  const showBackButton = user && navigation.canGoBack();

  const getDisplayName = () => {
    if (!user?.name) return 'User';
    return user.name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss|Shri|Smt)\s+/i, '').trim() || 'User';
  };

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="pt-12 pb-4 px-4 bg-blue-900 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image source={QSUTRA_LOGO} resizeMode="contain" className="w-24 h-8 mr-4" />
          {showBackButton && (
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              className="flex-row items-center px-3 py-1.5 border border-white rounded"
            >
              <ArrowLeft size={16} color="#fff" />
              <Text className="ml-1 text-sm text-white font-medium">Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <View className="bg-white px-3 py-1 rounded">
            <Image source={STRATUM_LOGO} resizeMode="contain" className="w-20 h-8" />
          </View>
          
          <View className="w-10 h-10 bg-gray-300 rounded-full items-center justify-center overflow-hidden">
            {user?.id ? (
              <Image 
                source={{ uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo` }} 
                className="w-10 h-10"
              />
            ) : (
              <Text className="text-lg font-bold text-gray-700">
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>

          <View className="mr-2">
            <Text className="text-white font-medium text-sm">{getDisplayName()}</Text>
            <Text className="text-white/80 text-xs">
              {user?.role === 'SITE_SUPERVISOR' ? 'Site-1 Supervisor' : getRoleDisplayName(user?.role)}
            </Text>
          </View>

          <TouchableOpacity onPress={onLogout} className="bg-red-600 px-3 py-2 rounded flex-row items-center">
            <LogOut size={18} color="#fff" />
            <Text className="ml-1 text-white text-sm font-medium">Logout</Text>
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