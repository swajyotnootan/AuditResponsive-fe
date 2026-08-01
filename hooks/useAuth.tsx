// hooks/useAuth.tsx
import { normalizeRole } from '@/utils/roleUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const USER_STORAGE_KEY = 'user';
const AUTH_TOKEN_KEY = 'authToken';

export interface User {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  username?: string;
  profilePhoto?: string;
  department?: string;
  token?: string;
  [key: string]: any;
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMaster: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      
      console.log('🔍 useAuth - Token exists:', !!token);
      console.log('🔍 useAuth - Stored user:', storedUser);
      
      if (token && storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          // Normalize role
          if (parsedUser.role) {
            parsedUser.role = normalizeRole(parsedUser.role) || 'AUDITOR';
          }
          setUser(parsedUser);
          console.log('✅ useAuth - User loaded:', parsedUser.role);
        } catch (e) {
          console.error('Failed to parse user from AsyncStorage', e);
          await AsyncStorage.multiRemove([USER_STORAGE_KEY, AUTH_TOKEN_KEY]);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      // Normalize role
      const normalizedRole = normalizeRole(userData.role) || 'AUDITOR';
      
      const userWithRole: User = {
        ...userData,
        role: normalizedRole,
        firstName: userData.firstName || userData.name?.split(' ')[0] || '',
        lastName: userData.lastName || userData.name?.split(' ')[1] || '',
      };
      
      console.log('✅ useAuth - Login - User role saved:', userWithRole.role);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userWithRole));
      if (userData.token) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, userData.token);
      }
      await AsyncStorage.setItem('userRole', normalizedRole);
      
      setUser(userWithRole);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔴 useAuth - Logging out...');
      
      setUser(null);
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY,
        USER_STORAGE_KEY,
        'userRole',
        'userName',
        'userEmail',
        'refreshToken',
      ]);
      
      console.log('✅ useAuth - Logout - All auth data cleared');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user) {
      const updatedUser: User = { ...user, ...userData };
      setUser(updatedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!user;
  const isMaster = user ? normalizeRole(user.role) === 'MASTER' : false;

  return { 
    user, 
    isLoading, 
    isAuthenticated,
    isMaster,
    login, 
    logout, 
    updateUser 
  };
};