// context/NotificationContext.tsx

import { API_BASE_URL } from '@/config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Info,
  Send,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  X,
  XCircle
} from 'lucide-react-native';
import React, { createContext, FC, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import { notificationAPI } from '../../services/api';
import { useAuth } from './AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  navigateTo?: string;
  location?: string;
  actionText?: string;
  role?: string;
  targetRoles?: string[];
  senderRole?: string;
  [key: string]: any;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  loading: boolean;
  addNotification: (
    title: string,
    message: string,
    type?: Notification['type'],
    metadata?: Partial<Notification>
  ) => Notification;
  addWorkflowNotification: (
    workflowType: string,
    action: string,
    data: any
  ) => void;
  markAsReadAndNavigate: (notification: Notification) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => number;
  showError: (message: string, title?: string, duration?: number) => number;
  showWarning: (message: string, title?: string, duration?: number) => number;
  showInfo: (message: string, title?: string, duration?: number) => number;
  NotificationBell: FC;
  NotificationPanel: FC;
  ToastContainer: FC;
  soundEnabled: boolean;
  soundVolume: number;
  enableSound: () => void;
  disableSound: () => void;
  setSoundVolumeLevel: (volume: number) => void;
  testSound: () => void;
  SoundControlPanel: FC;
  requestNotificationPermission: () => Promise<boolean>;
  isSoundReady: boolean;
  userRole: string | null;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// ==========================================
// PERSISTENCE HELPERS
// ==========================================

const STORAGE_KEY = '@notifications_cache';
const STORAGE_KEY_USER = '@notifications_user_cache';

const saveNotificationsToStorage = async (userId: string, notifications: Notification[]) => {
  try {
    const cacheData = {
      userId,
      notifications,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(cacheData));
    await AsyncStorage.setItem(STORAGE_KEY_USER, userId);
  } catch (error) {
    console.error('Error saving notifications to storage:', error);
  }
};

const loadNotificationsFromStorage = async (userId: string): Promise<Notification[] | null> => {
  try {
    const data = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (data) {
      const parsed = JSON.parse(data);
      // Check if cache is less than 5 minutes old
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.notifications;
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading notifications from storage:', error);
    return null;
  }
};

const clearUserStorage = async (userId: string) => {
  try {
    await AsyncStorage.removeItem(`${STORAGE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing user storage:', error);
  }
};

// ==========================================
// ENHANCED NOTIFICATION SOUND MANAGER
// ==========================================

class NotificationSound {
  isEnabled: boolean = true;
  volume: number = 0.8;
  isInitialized: boolean = false;
  pendingSounds: { type: string; timestamp: number }[] = [];
  isPlaying: boolean = false;
  audioContext: Audio.Sound | null = null;

  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('✅ Notification sound system initialized');

      if (this.pendingSounds.length > 0) {
        this.processPendingSounds();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize notification sound:', error);
      return false;
    }
  }

  async forceInit(): Promise<boolean> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('✅ Force initialized notification sound');
      return true;
    } catch (error) {
      console.warn('Force init failed, will init on user interaction:', error);
      return false;
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  queueSound(type: string) {
    this.pendingSounds.push({ type, timestamp: Date.now() });
    if (!this.isPlaying) {
      this.processPendingSounds();
    }
  }

  async processPendingSounds() {
    this.isPlaying = true;
    while (this.pendingSounds.length > 0) {
      const sound = this.pendingSounds.shift();
      if (sound) {
        await this.playNotificationSound(sound.type);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    this.isPlaying = false;
  }

  async playNotificationSound(type: string = 'info') {
    if (!this.isEnabled) return;
    await this.ensureInitialized();

    switch (type) {
      case 'success':
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        this.playSuccessSound();
        break;
      case 'error':
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        this.playErrorSound();
        break;
      case 'warning':
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        this.playWarningSound();
        break;
      default:
        if (Platform.OS !== 'web') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        this.playDefaultSound();
    }
  }

  private async playSuccessSound() {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/success.mp3'),
        { shouldPlay: true, volume: this.volume }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing success sound:', error);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }

  private async playErrorSound() {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/error.mp3'),
        { shouldPlay: true, volume: this.volume }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing error sound:', error);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }

  private async playWarningSound() {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/warning.mp3'),
        { shouldPlay: true, volume: this.volume }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing warning sound:', error);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }

  private async playDefaultSound() {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/notification.mp3'),
        { shouldPlay: true, volume: this.volume }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing default sound:', error);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }

  async playBeep() {
    await this.playDefaultSound();
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled && !this.isInitialized) {
      this.init();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
  }
}

// ==========================================
// NOTIFICATION PROVIDER
// ==========================================

export const NotificationProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [isSoundReady, setIsSoundReady] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const notificationSound = useRef<NotificationSound | null>(null);
  const lastNotificationTime = useRef<number>(0);
  const previousUnreadCount = useRef<number>(0);
  const initAttempted = useRef<boolean>(false);
  const lastNotificationsRef = useRef<Notification[]>([]);
  const currentUserIdRef = useRef<string | null>(null);

  // Safe access to user properties
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  // ✅ ROLE-BASED FILTERING: Check if notification is for this user
    // ✅ ENHANCED: Check if user has access to notification based on role
  const hasRoleAccess = useCallback((notification: Notification): boolean => {
    if (!userRole) {
      console.warn('⚠️ No user role available');
      return false;
    }
    
    const normalizedUserRole = userRole.toUpperCase().trim();
    
    // If no role specified in notification, allow access (backward compatibility)
    if (!notification.role && !notification.targetRoles) {
      return true;
    }
    
    // Check single role
    if (notification.role) {
      const normalizedNotifRole = notification.role.toUpperCase().trim();
      const hasAccess = normalizedNotifRole === normalizedUserRole;
      
      console.log(`🔍 Role check: ${notification.role} vs ${userRole} = ${hasAccess}`);
      
      return hasAccess;
    }
    
    // Check multiple target roles
    if (notification.targetRoles && Array.isArray(notification.targetRoles)) {
      const hasAccess = notification.targetRoles.some(targetRole => {
        const normalizedTargetRole = targetRole.toUpperCase().trim();
        return normalizedTargetRole === normalizedUserRole;
      });
      
      console.log(`🔍 Multi-role check: ${JSON.stringify(notification.targetRoles)} vs ${userRole} = ${hasAccess}`);
      
      return hasAccess;
    }
    
    return true;
  }, [userRole]);

  // ✅ Initialize sound system
  const initSoundSystem = useCallback(async () => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    try {
      notificationSound.current = new NotificationSound();
      notificationSound.current.setVolume(soundVolume);
      notificationSound.current.setEnabled(soundEnabled);

      const initResult = await notificationSound.current.forceInit();
      setIsSoundReady(initResult);
    } catch (error) {
      console.error('Failed to initialize sound system:', error);
    }
  }, [soundVolume, soundEnabled]);

  useEffect(() => {
    initSoundSystem();
  }, [initSoundSystem]);

  useEffect(() => {
    if (userId) {
      console.log('👤 User logged in:', {
        id: userId,
        role: userRole,
      });

      if (notificationSound.current) {
        notificationSound.current.init();
      } else {
        initSoundSystem();
      }

      // Update current user ID ref
      currentUserIdRef.current = String(userId);
    }
  }, [userId, userRole, initSoundSystem]);

  // Get sound type based on notification title
  const getNotificationSoundType = (title: string | undefined): string => {
    if (title?.includes('Approved') || title?.includes('Success')) return 'success';
    if (title?.includes('Rejected') || title?.includes('Failed') || title?.includes('Error')) return 'error';
    if (title?.includes('Warning') || title?.includes('Pending') || title?.includes('requires')) return 'warning';
    return 'info';
  };

  // Play sound with throttling
  const playNotificationSoundWithThrottle = useCallback(async (type: string = 'info') => {
    if (!soundEnabled) return;

    const now = Date.now();
    if (now - lastNotificationTime.current < 500) return;
    lastNotificationTime.current = now;

    if (notificationSound.current) {
      if (!notificationSound.current.isInitialized) {
        await notificationSound.current.init();
      }
      await notificationSound.current.playNotificationSound(type);
    }
  }, [soundEnabled]);

  // ✅ Load Notifications with persistence and role filtering
  const loadNotifications = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      console.log('⚠️ No user ID, skipping notification load');
      return;
    }

    const userIdStr = String(userId);
    setLoading(true);

    try {
      // Try loading from cache first (unless force refresh)
      let cachedNotifications: Notification[] | null = null;
      if (!forceRefresh) {
        cachedNotifications = await loadNotificationsFromStorage(userIdStr);
      }

      if (cachedNotifications && cachedNotifications.length > 0) {
        // ✅ Use cached notifications with role filtering
        const filtered = cachedNotifications.filter((n: Notification) => hasRoleAccess(n));
        console.log(`📦 Loaded ${filtered.length} notifications from cache for role: ${userRole}`);
        
        setNotifications(filtered);
        const newUnreadCount = filtered.filter((n: Notification) => !n.read).length;
        setUnreadCount(newUnreadCount);
        previousUnreadCount.current = newUnreadCount;
        lastNotificationsRef.current = filtered;
        setIsInitialLoad(false);
        setLoading(false);
        
        // Still fetch in background for updates
        fetchAndUpdateNotifications(userIdStr);
        return;
      }

      // No cache, fetch from API
      await fetchAndUpdateNotifications(userIdStr);
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [userId, userRole, hasRoleAccess]);

  // ✅ Fetch from API and update cache
    // ✅ ENHANCED: Fetch from API and update cache with better logging
  const fetchAndUpdateNotifications = useCallback(async (userIdStr: string) => {
    try {
      console.log(`📡 Fetching fresh notifications for user: ${userIdStr} (Role: ${userRole})`);
      const data = await notificationAPI.getForUser(userIdStr);
      
      const notificationsData = Array.isArray(data) ? data : [];
      
      console.log(`📥 Received ${notificationsData.length} total notifications from backend`);
      
      // Log each notification for debugging
      notificationsData.forEach((n: Notification, idx: number) => {
        console.log(`   [${idx}] ${n.title} | role: ${n.role} | targetRoles: ${JSON.stringify(n.targetRoles)}`);
      });
      
      // Filter by role
      const roleFilteredData = notificationsData.filter((n: Notification) => hasRoleAccess(n));
      
      console.log(`✅ Filtered to ${roleFilteredData.length} notifications for role: ${userRole}`);
      console.log(`   Filtered out: ${notificationsData.length - roleFilteredData.length} notifications`);

      // Save to cache
      await saveNotificationsToStorage(userIdStr, roleFilteredData);

      // Update state
      setNotifications(roleFilteredData);
      lastNotificationsRef.current = roleFilteredData;

      const newUnreadCount = roleFilteredData.filter((n: Notification) => !n.read).length;
      
      // Play sound for NEW unread notifications
      if (newUnreadCount > previousUnreadCount.current && soundEnabled) {
        const newNotifications = roleFilteredData.filter((n: Notification) => !n.read);
        if (newNotifications.length > 0) {
          const latestNotification = newNotifications[0];
          const notificationType = getNotificationSoundType(latestNotification.title);
          
          console.log(`🔊 Playing ${notificationType} sound for new notification`);
          
          if (notificationSound.current && isSoundReady) {
            await notificationSound.current.playNotificationSound(notificationType);
          } else if (notificationSound.current) {
            notificationSound.current.queueSound(notificationType);
          }
        }
      }

      setUnreadCount(newUnreadCount);
      previousUnreadCount.current = newUnreadCount;
      
    } catch (error) {
      console.error('Error fetching notifications from API:', error);
    }
  }, [userRole, hasRoleAccess, soundEnabled, isSoundReady]);

  // ✅ Clear cache on logout
  const clearNotificationCache = useCallback(async () => {
    if (userId) {
      await clearUserStorage(String(userId));
    }
    setNotifications([]);
    setUnreadCount(0);
    lastNotificationsRef.current = [];
    previousUnreadCount.current = 0;
  }, [userId]);

  // ✅ Refresh notifications (exposed to components)
  const refreshNotifications = useCallback(async () => {
    if (userId) {
      await loadNotifications(true);
    }
  }, [userId, loadNotifications]);

  // ✅ Initial load and polling
  useEffect(() => {
    if (userId && userRole) {
      // Load notifications (with cache)
      loadNotifications(false);

      // Poll every 15 seconds for updates
      const intervalId = setInterval(() => {
        if (userId) {
          fetchAndUpdateNotifications(String(userId));
        }
      }, 15000);

      return () => clearInterval(intervalId);
    } else {
      // Clear notifications when logged out
      clearNotificationCache();
    }
  }, [userId, userRole, loadNotifications, fetchAndUpdateNotifications, clearNotificationCache]);

  // ✅ FIXED: Add Notification with persistence
   // ✅ ENHANCED: Add Notification with proper role targeting
  const addNotification = (
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    metadata: Partial<Notification> = {}
  ): Notification => {
    const { navigateTo, location, actionText, role, targetRoles, senderRole, ...restMetadata } = metadata;

    // ✅ Determine target roles - if role is specified, use it
    const finalTargetRoles = targetRoles || (role ? [role] : undefined);
    
    const newNotification: Notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      navigateTo,
      location,
      actionText: actionText || 'Review & Take Action',
      role: role || undefined,
      targetRoles: finalTargetRoles,
      senderRole: senderRole || userRole || undefined,
      ...restMetadata,
    };

    console.log('📤 Creating notification:', {
      title,
      role: newNotification.role,
      targetRoles: newNotification.targetRoles,
      currentUserRole: userRole
    });

    // If this notification is for the current user's role, show it
    if (hasRoleAccess(newNotification)) {
      console.log('✅ Notification matches current user role, adding to state');
      
      setNotifications(prev => {
        const updated = [newNotification, ...prev];
        // Save to cache
        if (userId) {
          saveNotificationsToStorage(String(userId), updated);
        }
        return updated;
      });
      setUnreadCount(prev => prev + 1);

      const soundType = getNotificationSoundType(title);
      playNotificationSoundWithThrottle(soundType);
    } else {
      console.log('❌ Notification does NOT match current user role');
    }

    // Always show toast for the action
    showToastNotification(title, message, type);

    // ✅ Send to backend with role targeting
    if (userId) {
      if (finalTargetRoles && finalTargetRoles.length > 0) {
        // Send to specific roles
        finalTargetRoles.forEach(targetRole => {
          console.log(`📡 Sending notification to role: ${targetRole}`);
          notificationAPI.sendToRole(
            targetRole,
            title,
            message,
            type,
            navigateTo || '',
            location || ''
          ).catch(err => console.error(`Failed to send to role ${targetRole}:`, err));
        });
      } else {
        // Send to current user only
        console.log(`📡 Sending notification to user: ${userId}`);
        notificationAPI.sendToUser(
          String(userId),
          title,
          message,
          type,
          navigateTo || '',
          location || ''
        ).catch(err => console.error('Failed to send to user:', err));
      }
    }

    return newNotification;
  };

  // Native OS Notifications
  const showBrowserNotification = async (title: string, message: string) => {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error showing native notification:', error);
    }
  };

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  // ✅ Mark as Read with persistence
  const markAsReadAndNavigate = async (notification: Notification) => {
    if (!notification.read) {
      try {
        if (userId) {
          await notificationAPI.markAsRead(String(notification.id), String(userId));
        }
        setNotifications(prev => {
          const updated = prev.map(n => n.id === notification.id ? { ...n, read: true } : n);
          // Save to cache
          if (userId) {
            saveNotificationsToStorage(String(userId), updated);
          }
          return updated;
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    setIsOpen(false);

    if (notification.navigateTo) {
      setTimeout(() => {
        try {
          navigation.navigate(notification.navigateTo);
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }, 150);
    }
  };

  // ✅ Mark All as Read with persistence
  const markAllAsRead = async () => {
    if (!userId) {
      console.warn('No user ID available, cannot mark all as read');
      return;
    }

    try {
      await notificationAPI.markAllAsRead(String(userId));
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        // Save to cache
        if (userId) {
          saveNotificationsToStorage(String(userId), updated);
        }
        return updated;
      });
      setUnreadCount(0);
      showSuccess('All notifications marked as read', 'Success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Failed to mark all as read', 'Error');
    }
  };

  // ✅ Clear All with persistence
  const clearAllNotifications = () => {
    if (!userId) {
      console.warn('No user ID available, cannot clear notifications');
      return;
    }

    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationAPI.clearAll(String(userId));
              await clearUserStorage(String(userId));
              setNotifications([]);
              setUnreadCount(0);
              showSuccess('All notifications cleared', 'Success');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              showError('Failed to clear notifications', 'Error');
            }
          }
        }
      ]
    );
  };

  // Toast Functions
  const addToast = useCallback((toast: Partial<Omit<Toast, 'id'>>): number => {
    const id = Date.now() + Math.random();
    const newToast: Toast = {
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message || '',
      duration: toast.duration ?? 5000,
    };
    setToasts(prev => [...prev, newToast]);
    if (newToast.duration > 0) setTimeout(() => removeToast(id), newToast.duration);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToastNotification = useCallback((title: string, message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
    return addToast({ type, title, message, duration });
  }, [addToast]);

  const showSuccess = useCallback((message: string, title: string = 'Success', duration: number = 5000) => {
    playNotificationSoundWithThrottle('success');
    return addToast({ type: 'success', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);

  const showError = useCallback((message: string, title: string = 'Error', duration: number = 7000) => {
    playNotificationSoundWithThrottle('error');
    return addToast({ type: 'error', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);

  const showWarning = useCallback((message: string, title: string = 'Warning', duration: number = 6000) => {
    playNotificationSoundWithThrottle('warning');
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);

  const showInfo = useCallback((message: string, title: string = 'Info', duration: number = 5000) => {
    playNotificationSoundWithThrottle('info');
    return addToast({ type: 'info', title, message, duration });
  }, [addToast, playNotificationSoundWithThrottle]);

  // Sound Control Functions
  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    if (notificationSound.current) {
      notificationSound.current.setEnabled(true);
      notificationSound.current.init();
      setTimeout(() => {
        notificationSound.current?.playBeep();
      }, 100);
    }
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    if (notificationSound.current) {
      notificationSound.current.setEnabled(false);
    }
  }, []);

  const setSoundVolumeLevel = useCallback((volume: number) => {
    const newVolume = Math.min(1, Math.max(0, volume));
    setSoundVolume(newVolume);
    if (notificationSound.current) {
      notificationSound.current.setVolume(newVolume);
    }
  }, []);

  const testSound = useCallback(() => {
    if (soundEnabled && notificationSound.current) {
      notificationSound.current.playNotificationSound('info');
    }
  }, [soundEnabled]);

  // Add Workflow Notification
  const addWorkflowNotification = (
    workflowType: string,
    action: string,
    data: any
  ) => {
    console.log('🔄 Workflow action triggered:', {
      workflowType,
      action,
      data,
      senderRole: userRole
    });

    playNotificationSoundWithThrottle('info');

    showToastNotification(
      `${workflowType} ${action}`,
      data.message || 'Action completed successfully',
      'info',
      3000
    );

    // Refresh notifications after action
    setTimeout(() => {
      if (userId) {
        refreshNotifications();
      }
    }, 1000);
  };

  // Helper functions
    // ✅ Detect if we're talking to the production (UTC) backend
  const isProductionBackend = () => {
    const url = API_BASE_URL || '';
    return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('192.168.');
  };

  // ✅ FIXED: Parse backend date correctly for BOTH local (IST) and prod (UTC)
  const parseBackendDate = (dateString: string): Date => {
    let isoString = dateString;
    if (!isoString.includes('T')) {
      isoString = isoString.replace(' ', 'T');
    }
    
    // ✅ Production returns UTC without marker → add 'Z' so browser converts UTC→local (IST)
    // ✅ Local returns IST → parse as-is (no 'Z')
    if (isProductionBackend() && !isoString.includes('Z') && !isoString.includes('+')) {
      isoString += 'Z';
    }
    
    return new Date(isoString);
  };

  // ✅ FIXED: Format date with timezone handling
  const formatDate = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = parseBackendDate(timestamp);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', timestamp);
        return 'Just now';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      // Show relative time for recent messages
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      
      // Show "Yesterday" with time
      if (diffDays === 1) {
        return `Yesterday ${date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })}`;
      }
      
      // Show day name for this week
      if (diffDays < 7) {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
      
      // Show full date for older messages
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
    } catch (error) {
      console.error('Date formatting error:', error, timestamp);
      return 'Just now';
    }
  };

  const getActionText = (title: string | undefined): string => {
    if (title?.includes('Approval')) return 'Review & Approve';
    if (title?.includes('Review')) return 'Review & Take Action';
    if (title?.includes('Sign')) return 'Review & Sign';
    if (title?.includes('Assigned')) return 'View Details';
    return 'Take Action';
  };

  const getNotificationIcon = (title: string | undefined, type: string, size: number = 20): React.ReactNode => {
    if (title?.includes('Schedule')) return <Calendar size={size} color="#3b82f6" />;
    if (title?.includes('Audit')) return <ClipboardList size={size} color="#8b5cf6" />;
    if (title?.includes('Assigned')) return <UserCheck size={size} color="#06b6d4" />;
    if (title?.includes('Approved')) return <ThumbsUp size={size} color="#10b981" />;
    if (title?.includes('Rejected')) return <ThumbsDown size={size} color="#ef4444" />;
    if (title?.includes('Released')) return <Send size={size} color="#a855f7" />;
    if (title?.includes('Pending')) return <Clock size={size} color="#f59e0b" />;

    switch (type) {
      case 'success': return <CheckCircle size={size} color="#10b981" />;
      case 'error': return <XCircle size={size} color="#ef4444" />;
      case 'warning': return <AlertCircle size={size} color="#f59e0b" />;
      default: return <Info size={size} color="#3b82f6" />;
    }
  };

  const getStatusColor = (title: string | undefined, type: string): string => {
    if (title?.includes('Approved')) return '#10b981';
    if (title?.includes('Rejected')) return '#ef4444';
    if (title?.includes('Pending') || title?.includes('requires')) return '#f59e0b';
    if (title?.includes('Released')) return '#a855f7';
    if (title?.includes('Assigned')) return '#3b82f6';

    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getStatusText = (title: string | undefined): string => {
    if (title?.includes('Approved')) return 'Approved';
    if (title?.includes('Rejected')) return 'Rejected';
    if (title?.includes('Pending') || title?.includes('requires')) return 'Pending';
    if (title?.includes('Released')) return 'Released';
    if (title?.includes('Assigned')) return 'Assigned';
    return 'Info';
  };

  // ==========================================
  // UI COMPONENTS (Same as before, with refresh button)
  // ==========================================

  const SoundControlPanel: FC = () => (
    <View style={{ padding: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
      <Text style={{ marginBottom: 12, fontSize: 14, fontWeight: '600', color: '#111827' }}>🔔 Notification Sounds</Text>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#374151' }}>Enable Sounds</Text>
          <TouchableOpacity
            onPress={() => soundEnabled ? disableSound() : enableSound()}
            style={{
              height: 24,
              width: 44,
              borderRadius: 12,
              backgroundColor: soundEnabled ? '#3b82f6' : '#d1d5db',
              justifyContent: 'center',
              paddingHorizontal: 2,
            }}
          >
            <View style={{
              height: 16,
              width: 16,
              backgroundColor: 'white',
              borderRadius: 8,
              alignSelf: soundEnabled ? 'flex-end' : 'flex-start',
            }} />
          </TouchableOpacity>
        </View>

        {soundEnabled && (
          <>
            <View>
              <Text style={{ marginBottom: 4, fontSize: 14, color: '#374151' }}>🔊 Volume: {Math.round(soundVolume * 100)}%</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
                <TouchableOpacity
                  onPress={() => setSoundVolumeLevel(Math.max(0, soundVolume - 0.1))}
                  style={{ paddingHorizontal: 16, paddingVertical: 4, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSoundVolumeLevel(Math.min(1, soundVolume + 0.1))}
                  style={{ paddingHorizontal: 16, paddingVertical: 4, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4 }}
                >
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={testSound}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#eff6ff' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#2563eb' }}>🔊 Test Sound</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          onPress={requestNotificationPermission}
          style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#f9fafb' }}
        >
          <Text style={{ fontSize: 14, color: '#374151' }}>🔔 Enable OS Notifications</Text>
        </TouchableOpacity>

        {!isSoundReady && (
          <Text style={{ marginTop: 8, fontSize: 12, textAlign: 'center', color: '#d97706' }}>
            ⚡ Tap anywhere to enable notification sounds
          </Text>
        )}

        <View style={{ marginTop: 8, padding: 8, backgroundColor: '#eff6ff', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#374151' }}>
            👤 Role: <Text style={{ fontWeight: 'bold', color: '#2563eb' }}>{userRole || 'Not logged in'}</Text>
          </Text>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#6b7280', marginTop: 4 }}>
            📬 {notifications.length} notifications
          </Text>
          <Text style={{ fontSize: 12, textAlign: 'center', color: '#6b7280', marginTop: 4 }}>
            🆔 User ID: <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#4b5563' }}>{userId || 'N/A'}</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  const NotificationBell: FC = () => (
    <TouchableOpacity
      onPress={() => setIsOpen(!isOpen)}
      style={{ position: 'relative', padding: 8, borderRadius: 8 }}
    >
      <Bell size={30} color="white" />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -4,
          right: -4,
          minWidth: 20,
          height: 20,
          backgroundColor: '#ef4444',
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const NotificationPanel: FC = () => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const isMobile = screenWidth < 768;

    const slideAnim = useRef(new Animated.Value(isMobile ? screenHeight : screenWidth)).current;

    useEffect(() => {
      if (isOpen) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: isMobile ? screenHeight : screenWidth,
          duration: 200,
          useNativeDriver: true
        }).start();
      }
    }, [isOpen, isMobile]);

    return (
      <Modal visible={isOpen} transparent={true} animationType="none" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        />

        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: '#f9fafb',
            },
            isMobile ? {
              bottom: 0,
              left: 0,
              right: 0,
              height: '75%',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              transform: [{ translateY: slideAnim }],
            } : {
              top: 0,
              bottom: 0,
              right: 0,
              width: '100%',
              maxWidth: 448,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header with Role Badge and Refresh Button */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>Notifications</Text>
                  {userRole && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#dbeafe', borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '500', color: '#1d4ed8', textTransform: 'uppercase' }}>
                        {userRole}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Refresh Button */}
                <TouchableOpacity
                  onPress={refreshNotifications}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f3f4f6' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#4b5563' }}>🔄</Text>
                </TouchableOpacity>
                {notifications.length > 0 && unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#eff6ff' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#2563eb' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsOpen(false)}
                  style={{ padding: 6, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                >
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notification List (same as before) */}
          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
                <Bell size={32} color="#9ca3af" />
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#6b7280', marginTop: 12 }}>No notifications</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>You're all caught up!</Text>
                {userRole && (
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                    Showing notifications for: <Text style={{ fontWeight: '500' }}>{userRole}</Text>
                  </Text>
                )}
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => markAsReadAndNavigate(notification)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderLeftWidth: 4,
                    borderLeftColor: !notification.read ? '#fbbf24' : '#e5e7eb',
                    borderColor: '#e5e7eb',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                    marginBottom: 12,
                    padding: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{
                        padding: 6,
                        borderRadius: 8,
                        backgroundColor: !notification.read ? '#fef3c7' : '#f9fafb'
                      }}>
                        {getNotificationIcon(notification.title, notification.type)}
                      </View>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        backgroundColor: !notification.read ? '#fef3c7' : '#f3f4f6'
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: getStatusColor(notification.title, notification.type)
                        }}>
                          {getStatusText(notification.title)}
                          {!notification.read && ' • Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color="#9ca3af" />
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(notification.timestamp)}</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 }}>
                    {notification.title}
                  </Text>

                  <Text style={{ fontSize: 12, color: '#4b5563', lineHeight: 18, marginBottom: 12 }}>
                    {notification.message}
                  </Text>

                  {notification.location && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>📍 {notification.location}</Text>
                    </View>
                  )}

                  {notification.role && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                      <Text style={{ fontSize: 10, color: '#9ca3af' }}>For:</Text>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '500', color: '#4b5563', textTransform: 'uppercase' }}>
                          {notification.role}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => markAsReadAndNavigate(notification)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: !notification.read ? '#2563eb' : '#f3f4f6',
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: !notification.read ? 'white' : '#4b5563'
                    }}>
                      {notification.actionText || getActionText(notification.title)}
                    </Text>
                    <ArrowRight size={12} color={!notification.read ? 'white' : '#4b5563'} />
                  </TouchableOpacity>

                  {!notification.read && (
                    <View style={{ paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} color="#d97706" />
                        <Text style={{ fontSize: 10, color: '#d97706' }}>Pending until action taken</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          {notifications.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <TouchableOpacity
                onPress={clearAllNotifications}
                style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#f9fafb' }}
              >
                <Text style={{ fontSize: 12, textAlign: 'center', color: '#6b7280' }}>Clear all notifications</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Modal>
    );
  };

  const ToastContainer: FC = () => (
    <View style={{ position: 'absolute', bottom: 16, right: 16, left: 16, alignItems: 'flex-end' }} pointerEvents="box-none">
      {toasts.map((toast) => (
        <View
          key={toast.id}
          style={{
            marginBottom: 8,
            width: '100%',
            maxWidth: 384,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
            borderLeftWidth: 4,
            borderLeftColor: toast.type === 'success' ? '#10b981' :
              toast.type === 'error' ? '#ef4444' :
                toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
            backgroundColor: toast.type === 'success' ? '#f0fdf4' :
              toast.type === 'error' ? '#fef2f2' :
                toast.type === 'warning' ? '#fffbeb' : '#eff6ff',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingRight: 32 }}>
            <View style={{ marginRight: 8 }}>
              {toast.type === 'success' && <CheckCircle size={16} color="#10b981" />}
              {toast.type === 'error' && <XCircle size={16} color="#ef4444" />}
              {toast.type === 'warning' && <AlertCircle size={16} color="#f59e0b" />}
              {toast.type === 'info' && <Info size={16} color="#3b82f6" />}
            </View>
            <View style={{ flex: 1 }}>
              {toast.title && (
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: toast.type === 'success' ? '#166534' :
                    toast.type === 'error' ? '#991b1b' :
                      toast.type === 'warning' ? '#92400e' : '#1e40af'
                }}>
                  {toast.title}
                </Text>
              )}
              <Text style={{
                fontSize: 12,
                color: toast.type === 'success' ? '#15803d' :
                  toast.type === 'error' ? '#b91c1c' :
                    toast.type === 'warning' ? '#b45309' : '#1d4ed8',
                marginTop: 2
              }}>
                {toast.message}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeToast(toast.id)} style={{ padding: 4 }}>
              <X size={12} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          <View style={{ height: 2, backgroundColor: '#e5e7eb', width: '100%' }}>
            <Animated.View
              style={{
                height: '100%',
                backgroundColor: toast.type === 'success' ? '#10b981' :
                  toast.type === 'error' ? '#ef4444' :
                    toast.type === 'warning' ? '#f59e0b' : '#3b82f6',
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    loading,
    addNotification,
    addWorkflowNotification,
    markAsReadAndNavigate,
    markAllAsRead,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    NotificationBell,
    NotificationPanel,
    ToastContainer,
    soundEnabled,
    soundVolume,
    enableSound,
    disableSound,
    setSoundVolumeLevel,
    testSound,
    SoundControlPanel,
    requestNotificationPermission,
    isSoundReady,
    userRole,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer />
      <NotificationPanel />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;