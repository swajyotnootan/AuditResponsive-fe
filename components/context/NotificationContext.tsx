// context/NotificationContext.tsx
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import {
  AlertCircle,
  Bell, Calendar,
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
  Alert, Animated, Dimensions,
  Modal,
  Platform,
  ScrollView,
  Text, TouchableOpacity,
  UIManager,
  View
} from 'react-native';

// ✅ Import from your api.ts
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
  addNotification: (title: string, message: string, type?: Notification['type'], metadata?: Partial<Notification>) => Notification;
  addWorkflowNotification: (workflowType: string, action: string, data: any) => void;
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
// ENHANCED NOTIFICATION SOUND MANAGER
// ==========================================
class NotificationSound {
  isEnabled: boolean = true;
  volume: number = 0.8;
  isInitialized: boolean = false;
  pendingSounds: { type: string; timestamp: number }[] = [];
  isPlaying: boolean = false;
  soundObject: Audio.Sound | null = null;

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
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADwAD///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAc4AAAAAAAAAABSAJAJB2AAgAADgCw==' },
        { shouldPlay: false }
      );
      await sound.unloadAsync();
      
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
    
    switch(type) {
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        this.playSuccessSound();
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        this.playErrorSound();
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        this.playWarningSound();
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        this.playDefaultSound();
    }
  }

  private async playSuccessSound() {
    try {
      const frequencies = [523.25, 659.25, 783.99];
      for (let i = 0; i < frequencies.length; i++) {
        await this.playTone(frequencies[i], 0.15);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  }

  private async playErrorSound() {
    try {
      await this.playTone(440, 0.3);
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.playTone(220, 0.3);
    } catch (error) {
      console.error('Error playing error sound:', error);
    }
  }

  private async playWarningSound() {
    try {
      await this.playTone(880, 0.15);
      await new Promise(resolve => setTimeout(resolve, 200));
      await this.playTone(660, 0.15);
    } catch (error) {
      console.error('Error playing warning sound:', error);
    }
  }

  private async playDefaultSound() {
    try {
      await this.playTone(800, 0.15);
    } catch (error) {
      console.error('Error playing default sound:', error);
    }
  }

  private async playTone(frequency: number, duration: number) {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Fallback to haptics only
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

  const notificationSound = useRef<NotificationSound | null>(null);
  const lastNotificationTime = useRef<number>(0);
  const previousUnreadCount = useRef<number>(0);
  const initAttempted = useRef<boolean>(false);
  const lastNotificationsRef = useRef<Notification[]>([]);

  // ✅ Safe access to user properties with fallbacks
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;
  const userEmail = user?.email ?? null;

  // Initialize sound system
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
        email: userEmail,
      });
      
      if (notificationSound.current) {
        notificationSound.current.init();
      } else {
        initSoundSystem();
      }
    }
  }, [userId, userRole, userEmail, initSoundSystem]);

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

  // ✅ FIXED: Load Notifications - Properly handles user.id
  const loadNotifications = useCallback(async () => {
    // ✅ Check if userId exists before making API call
    if (!userId) {
      console.log('⚠️ No user ID available, skipping notification load');
      return;
    }

    setLoading(true);
    try {
      // ✅ Convert userId to string explicitly
      const userIdString = String(userId);
      console.log(`📡 Fetching notifications for user: ${userIdString}`);
      
      const data = await notificationAPI.getForUser(userIdString);
      
      const notificationsData = Array.isArray(data) ? data : [];
      
      // ✅ Client-side role filtering
      const roleFilteredData = notificationsData.filter((n: Notification) => {
        if (n.role) return n.role === userRole;
        return true;
      });
      
      const currentDataStr = JSON.stringify(roleFilteredData);
      const lastDataStr = JSON.stringify(lastNotificationsRef.current);

      if (currentDataStr !== lastDataStr) {
        console.log(`📬 Loaded ${roleFilteredData.length} notifications for ${userRole || 'user'}`);
        
        setNotifications(roleFilteredData);
        lastNotificationsRef.current = roleFilteredData;
        
        const newUnreadCount = roleFilteredData.filter((n: Notification) => !n.read).length;

        if (newUnreadCount > previousUnreadCount.current && soundEnabled) {
          const newNotifications = roleFilteredData.filter((n: Notification) => !n.read);
          if (newNotifications.length > 0) {
            const latestNotification = newNotifications[0];
            const notificationType = getNotificationSoundType(latestNotification.title);
            
            console.log(`🔊 Playing ${notificationType} sound for ${userRole || 'user'}`);
            
            if (notificationSound.current && isSoundReady) {
              await notificationSound.current.playNotificationSound(notificationType);
            } else if (notificationSound.current) {
              notificationSound.current.queueSound(notificationType);
            }
          }
        }
        
        setUnreadCount(newUnreadCount);
        previousUnreadCount.current = newUnreadCount;
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, soundEnabled, isSoundReady]);

  // Polling for real-time notifications
  useEffect(() => {
    if (userId) {
      lastNotificationsRef.current = [];
      previousUnreadCount.current = 0;
      loadNotifications();
      
      const intervalId = setInterval(() => {
        loadNotifications();
      }, 15000);
      
      return () => clearInterval(intervalId);
    }
  }, [userId]);

  // Add Notification (Local fallback with API integration)
  const addNotification = (title: string, message: string, type: Notification['type'] = 'info', metadata: Partial<Notification> = {}): Notification => {
    const { navigateTo, location, actionText, role, ...restMetadata } = metadata;
    
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
      role: role || userRole || undefined,
      ...restMetadata,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    const soundType = getNotificationSoundType(title);
    playNotificationSoundWithThrottle(soundType);
    
    showBrowserNotification(title, message);
    showToastNotification(title, message, type);
    
    // ✅ Only send to backend if userId exists
    if (userId) {
      notificationAPI.sendToUser(
        String(userId), 
        title, 
        message, 
        type, 
        navigateTo || '', 
        location || ''
      ).catch(console.error);
    }
    
    return newNotification;
  };

  // Native OS Notifications
  const showBrowserNotification = async (title: string, message: string) => {
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
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  // ✅ FIXED: Mark as Read - Properly handles user.id
  const markAsReadAndNavigate = async (notification: Notification) => {
    if (!notification.read) {
      try {
        // ✅ Check if userId exists
        if (userId) {
          await notificationAPI.markAsRead(String(notification.id), String(userId));
        }
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    setIsOpen(false);
    if (notification.navigateTo) {
      setTimeout(() => {
        navigation.navigate(notification.navigateTo);
      }, 150);
    }
  };

  // ✅ FIXED: Mark All as Read - Properly handles user.id
  const markAllAsRead = async () => {
    // ✅ Check if userId exists
    if (!userId) {
      console.warn('No user ID available, cannot mark all as read');
      return;
    }
    
    try {
      await notificationAPI.markAllAsRead(String(userId));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read', 'Success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Failed to mark all as read', 'Error');
    }
  };

  // ✅ FIXED: Clear All - Properly handles user.id
  const clearAllNotifications = () => {
    // ✅ Check if userId exists
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

  const addWorkflowNotification = (workflowType: string, action: string, data: any) => {
    console.log('Workflow notification triggered:', { workflowType, action, data });
    
    if (userId) {
      notificationAPI.sendToUser(
        String(userId),
        `${workflowType} ${action}`,
        data.message || 'Workflow notification',
        'info',
        data.navigateTo || '',
        data.location || ''
      ).catch(console.error);
    }
  };

  // Helper functions
  const formatDate = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getActionText = (title: string | undefined): string => {
    if (title?.includes('Approval')) return 'Review & Approve';
    if (title?.includes('Review')) return 'Review & Take Action';
    if (title?.includes('Sign')) return 'Review & Sign';
    if (title?.includes('Assigned')) return 'View Details';
    return 'Take Action';
  };

  const getNotificationIcon = (title: string | undefined, type: string): React.ReactNode => {
    const size = 20;
    if (title?.includes('Schedule')) return <Calendar size={size} />;
    if (title?.includes('Audit')) return <ClipboardList size={size} />;
    if (title?.includes('Assigned')) return <UserCheck size={size} />;
    if (title?.includes('Approved')) return <ThumbsUp size={size} />;
    if (title?.includes('Rejected')) return <ThumbsDown size={size} />;
    if (title?.includes('Released')) return <Send size={size} />;
    if (title?.includes('Pending')) return <Clock size={size} />;
    switch (type) {
      case 'success': return <CheckCircle size={size} />;
      case 'error': return <XCircle size={size} />;
      case 'warning': return <AlertCircle size={size} />;
      default: return <Info size={size} />;
    }
  };

  const getStatusColor = (title: string | undefined, type: string): string => {
    if (title?.includes('Approved')) return 'text-green-600';
    if (title?.includes('Rejected')) return 'text-red-600';
    if (title?.includes('Pending') || title?.includes('requires')) return 'text-yellow-600';
    if (title?.includes('Released')) return 'text-purple-600';
    if (title?.includes('Assigned')) return 'text-blue-600';
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
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
  // UI COMPONENTS
  // ==========================================

  const SoundControlPanel: FC = () => (
    <View className="p-4 bg-white border border-gray-200 rounded-lg">
      <Text className="mb-3 text-sm font-semibold text-gray-900">🔔 Notification Sounds</Text>
      <View className="space-y-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-700">Enable Sounds</Text>
          <TouchableOpacity
            onPress={() => soundEnabled ? disableSound() : enableSound()}
            className={`relative h-6 w-11 rounded-full justify-center ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <View className={`h-4 w-4 bg-white rounded-full ${soundEnabled ? 'self-end mr-1' : 'self-start ml-1'}`} />
          </TouchableOpacity>
        </View>

        {soundEnabled && (
          <>
            <View>
              <Text className="mb-1 text-sm text-gray-700">🔊 Volume: {Math.round(soundVolume * 100)}%</Text>
              <View className="flex-row items-center justify-between p-2 bg-gray-100 rounded-lg">
                <TouchableOpacity 
                  onPress={() => setSoundVolumeLevel(Math.max(0, soundVolume - 0.1))} 
                  className="px-4 py-1 bg-white border border-gray-200 rounded"
                >
                  <Text className="text-lg font-bold">-</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setSoundVolumeLevel(Math.min(1, soundVolume + 0.1))} 
                  className="px-4 py-1 bg-white border border-gray-200 rounded"
                >
                  <Text className="text-lg font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              onPress={testSound} 
              className="flex-row items-center justify-center py-2 rounded-lg bg-blue-50"
            >
              <Text className="text-sm font-medium text-blue-600">🔊 Test Sound</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity 
          onPress={requestNotificationPermission} 
          className="items-center py-2 rounded-lg bg-gray-50"
        >
          <Text className="text-sm text-gray-700">🔔 Enable OS Notifications</Text>
        </TouchableOpacity>
        
        {!isSoundReady && (
          <Text className="mt-2 text-xs text-center text-yellow-600">
            ⚡ Tap anywhere to enable notification sounds
          </Text>
        )}

        <View className="mt-2 p-2 bg-blue-50 rounded-lg">
          <Text className="text-xs text-center text-gray-700">
            👤 Role: <Text className="font-bold text-blue-600">{userRole || 'Not logged in'}</Text>
          </Text>
          <Text className="text-xs text-center text-gray-500 mt-1">
            📬 {notifications.length} notifications
          </Text>
          <Text className="text-xs text-center text-gray-500 mt-1">
            🆔 User ID: <Text className="font-mono text-gray-600">{userId || 'N/A'}</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  const NotificationBell: FC = () => (
    <TouchableOpacity 
      onPress={() => setIsOpen(!isOpen)} 
      className="relative p-2 rounded-lg"
    >
      <Bell size={30} color="white" />
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 rounded-full items-center justify-center px-1">
          <Text className="text-white text-[12px] font-bold">
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
          className="flex-1 bg-black/40" 
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
          {/* Header with Role Badge */}
          <View className="px-5 py-4 bg-white border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                  {userRole && (
                    <View className="px-2 py-0.5 bg-blue-100 rounded-full">
                      <Text className="text-[10px] font-medium text-blue-700 uppercase">
                        {userRole}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {notifications.length > 0 && unreadCount > 0 && (
                  <TouchableOpacity 
                    onPress={markAllAsRead} 
                    className="px-2 py-1 rounded-md bg-blue-50"
                  >
                    <Text className="text-xs font-medium text-blue-600">Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => setIsOpen(false)} 
                  className="p-1.5 bg-gray-100 rounded-lg"
                >
                  <X size={18} color="gray" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notification List */}
          <ScrollView className="flex-1 p-4">
            {loading ? (
              <View className="items-center justify-center py-16">
                <Text className="text-sm text-gray-500">Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View className="items-center justify-center py-16">
                <Bell size={32} color="gray" />
                <Text className="font-medium text-gray-500 mt-3">No notifications</Text>
                <Text className="text-xs text-gray-400 mt-1">You're all caught up!</Text>
                {userRole && (
                  <Text className="text-xs text-gray-400 mt-1">
                    Showing notifications for: <Text className="font-medium">{userRole}</Text>
                  </Text>
                )}
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => markAsReadAndNavigate(notification)}
                  className={`bg-white rounded-xl border shadow-sm mb-3 p-4 overflow-hidden ${
                    !notification.read ? 'border-l-4 border-l-yellow-400' : 'border-gray-200'
                  }`}
                >
                  <View className="flex-row items-start">
                    <View className="mr-3 mt-1">
                      {getNotificationIcon(notification.title, notification.type)}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{notification.title}</Text>
                      {notification.role && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Text className="text-[10px] text-gray-400">For:</Text>
                          <View className="px-1.5 py-0.5 bg-gray-100 rounded">
                            <Text className="text-[9px] font-medium text-gray-600 uppercase">
                              {notification.role}
                            </Text>
                          </View>
                        </View>
                      )}
                      <Text className="text-xs text-gray-600 mt-1">{notification.message}</Text>
                      <View className="flex-row items-center justify-between mt-2">
                        <Text className="text-xs text-gray-400">{formatDate(notification.timestamp)}</Text>
                        <Text className={`text-xs font-medium ${getStatusColor(notification.title, notification.type)}`}>
                          {getStatusText(notification.title)}
                          {!notification.read && ' • Pending'}
                        </Text>
                      </View>
                      {!notification.read && (
                        <View className="pt-2 mt-2 border-t border-gray-100">
                          <Text className="text-[10px] text-yellow-600">
                            ⏱ Pending until action taken
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          {notifications.length > 0 && (
            <View className="px-5 py-3 bg-white border-t border-gray-200">
              <TouchableOpacity 
                onPress={clearAllNotifications} 
                className="items-center py-2 rounded-lg bg-gray-50"
              >
                <Text className="text-xs text-center text-gray-500">Clear all notifications</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Modal>
    );
  };

  const ToastContainer: FC = () => (
    <View className="absolute items-end bottom-4 right-4 left-4" pointerEvents="box-none">
      {toasts.map((toast) => (
        <View 
          key={toast.id} 
          className={`mb-2 w-full max-w-sm rounded-lg shadow-lg overflow-hidden border-l-4 ${
            toast.type === 'success' ? 'bg-green-50 border-green-500' :
            toast.type === 'error' ? 'bg-red-50 border-red-500' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
            'bg-blue-50 border-blue-500'
          }`}
        >
          <View className="flex-row items-start p-3 pr-8">
            <View className="mr-2">
              {toast.type === 'success' && <CheckCircle size={16} color="green" />}
              {toast.type === 'error' && <XCircle size={16} color="red" />}
              {toast.type === 'warning' && <AlertCircle size={16} color="orange" />}
              {toast.type === 'info' && <Info size={16} color="blue" />}
            </View>
            <View className="flex-1">
              {toast.title && (
                <Text className={`text-xs font-semibold ${
                  toast.type === 'success' ? 'text-green-800' :
                  toast.type === 'error' ? 'text-red-800' :
                  toast.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                }`}>{toast.title}</Text>
              )}
              <Text className={`text-xs ${
                toast.type === 'success' ? 'text-green-700' :
                toast.type === 'error' ? 'text-red-700' :
                toast.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
              }`}>{toast.message}</Text>
            </View>
            <TouchableOpacity onPress={() => removeToast(toast.id)} className="-mt-0.5 p-1">
              <X size={12} color="gray" />
            </TouchableOpacity>
          </View>
          {/* Progress bar */}
          <View className="h-0.5 bg-gray-200 w-full">
            <Animated.View 
              style={{
                width: new Animated.Value(100).interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                height: '100%',
                backgroundColor: toast.type === 'success' ? 'green' :
                                toast.type === 'error' ? 'red' :
                                toast.type === 'warning' ? 'orange' : 'blue',
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