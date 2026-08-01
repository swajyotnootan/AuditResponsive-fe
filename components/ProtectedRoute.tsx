// components/ProtectedRoute.tsx
import { normalizeRole } from '@/utils/roleUtils';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  redirectPath = '/auth/login' 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!isAuthenticated) {
    router.replace(redirectPath as any);
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = normalizeRole(user?.role);
    const hasAccess = allowedRoles.some(role => normalizeRole(role) === userRole);
    
    if (!hasAccess) {
      router.replace('/' as any);
      return null;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;