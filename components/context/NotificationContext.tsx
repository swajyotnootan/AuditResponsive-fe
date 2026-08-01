import { useNavigation } from '@react-navigation/native';
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

// 🚨 ADJUST THESE PATHS if your files are in different folders
import { notificationAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';

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
  [key: string]: any; // Allow extra metadata
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
// NOTIFICATION SOUND MANAGER (Using Haptics)
// ==========================================
class NotificationSound {
  isEnabled: boolean = true;
  volume: number = 0.8;
  isInitialized: boolean = false;
  pendingSounds: { type: string; timestamp: number }[] = [];
  isPlaying: boolean = false;

  async init(): Promise<boolean> { this.isInitialized = true; return true; }
  async forceInit(): Promise<boolean> { this.isInitialized = true; return true; }
  async ensureInitialized(): Promise<void> { this.isInitialized = true; }

  queueSound(type: string) {
    this.pendingSounds.push({ type, timestamp: Date.now() });
    if (!this.isPlaying) this.processPendingSounds();
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
      case 'success': this.playSuccessSound(); break;
      case 'error': this.playErrorSound(); break;
      case 'warning': this.playWarningSound(); break;
      default: this.playDefaultSound();
    }
  }

  playSuccessSound() { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
  playErrorSound() { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
  playWarningSound() { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }
  playDefaultSound() { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }
  playBeep() { this.playDefaultSound(); }

  setEnabled(enabled: boolean) { this.isEnabled = enabled; }
  setVolume(volume: number) { this.volume = Math.min(1, Math.max(0, volume)); }
}

// ==========================================
// NOTIFICATION PROVIDER
// ==========================================
export const NotificationProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Cast to any to avoid strict React Navigation route typing errors
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
  const isFirstLoadRef = useRef<boolean>(true);

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

  useEffect(() => { initSoundSystem(); }, [initSoundSystem]);

  useEffect(() => {
    if (user?.id) {
      if (notificationSound.current) notificationSound.current.init();
      else initSoundSystem();
    }
  }, [user?.id, user?.role, initSoundSystem]);

  // Load Notifications from Backend
    // Load Notifications from Backend
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
     const response = await notificationAPI.getForUser(String(user.id));
      
      // ✅ FIX: Ensure data is ALWAYS an array, even if the backend returns it weirdly
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      const currentDataStr = JSON.stringify(data);
      const lastDataStr = JSON.stringify(lastNotificationsRef.current);

      if (currentDataStr !== lastDataStr) {
        setNotifications(data);
        lastNotificationsRef.current = data;
        const newUnreadCount = data.filter((n: Notification) => !n.read).length;

        if (newUnreadCount > previousUnreadCount.current && soundEnabled) {
          const newNotifications = data.filter((n: Notification) => !n.read);
          if (newNotifications.length > 0) {
            const latestNotification = newNotifications[0];
            const notificationType = getNotificationSoundType(latestNotification.title);
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
  }, [user?.id, user?.role, soundEnabled, isSoundReady]);
  useEffect(() => {
    if (user?.id) {
      lastNotificationsRef.current = [];
      previousUnreadCount.current = 0;
      loadNotifications();
      const intervalId = setInterval(() => { loadNotifications(); }, 15000);
      return () => clearInterval(intervalId);
    }
  }, [user?.id, loadNotifications]);

  const getNotificationSoundType = (title: string | undefined): string => {
    if (title?.includes('Approved') || title?.includes('Success')) return 'success';
    if (title?.includes('Rejected') || title?.includes('Failed') || title?.includes('Error')) return 'error';
    if (title?.includes('Warning') || title?.includes('Pending') || title?.includes('requires')) return 'warning';
    return 'info';
  };

  const playNotificationSoundWithThrottle = useCallback(async (type: string = 'info') => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastNotificationTime.current < 500) return;
    lastNotificationTime.current = now;
    if (notificationSound.current) {
      if (!notificationSound.current.isInitialized) await notificationSound.current.init();
      await notificationSound.current.playNotificationSound(type);
    }
  }, [soundEnabled]);

  const addNotification = (title: string, message: string, type: Notification['type'] = 'info', metadata: Partial<Notification> = {}): Notification => {
    const { navigateTo, location, actionText, ...restMetadata } = metadata;
    const newNotification: Notification = {
      id: Date.now(), title, message, type,
      timestamp: new Date().toISOString(), read: false,
      navigateTo, location, actionText: actionText || 'Review & Take Action',
      ...restMetadata,
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    const soundType = getNotificationSoundType(title);
    playNotificationSoundWithThrottle(soundType);
    showBrowserNotification(title, message);
    showToastNotification(title, message, type);
    return newNotification;
  };

  // Native OS Notifications
  const showBrowserNotification = async (title: string, message: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body: message },
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

  const markAsReadAndNavigate = async (notification: Notification) => {
    if (!notification.read) {
      try {
        // await notificationAPI.markAsRead(String(notification.id), String(user.id));
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

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      
      await notificationAPI.markAllAsRead(String(user.id));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read', 'Success');
    } catch (error) {
      showError('Failed to mark all as read', 'Error');
    }
  };

  const clearAllNotifications = () => {
    if (!user?.id) return;
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
              await notificationAPI.clearAll(String(user.id));
              setNotifications([]);
              setUnreadCount(0);
              showSuccess('All notifications cleared', 'Success');
            } catch (error) {
              showError('Failed to clear notifications', 'Error');
            }
          }
        }
      ]
    );
  };

  // Toast Functions
   // Toast Functions
  const addToast = useCallback((toast: Partial<Omit<Toast, 'id'>>): number => {
    const id = Date.now() + Math.random();
    
    // ✅ FIX: Explicitly assign every property instead of using ...toast
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

  const showToastNotification = useCallback((title: string, message: string, type: Toast['type'] = 'info', duration: number = 5000) => addToast({ type, title, message, duration }), [addToast]);
  const showSuccess = useCallback((message: string, title: string = 'Success', duration: number = 5000) => { playNotificationSoundWithThrottle('success'); return addToast({ type: 'success', title, message, duration }); }, [addToast, playNotificationSoundWithThrottle]);
  const showError = useCallback((message: string, title: string = 'Error', duration: number = 7000) => { playNotificationSoundWithThrottle('error'); return addToast({ type: 'error', title, message, duration }); }, [addToast, playNotificationSoundWithThrottle]);
  const showWarning = useCallback((message: string, title: string = 'Warning', duration: number = 6000) => { playNotificationSoundWithThrottle('warning'); return addToast({ type: 'warning', title, message, duration }); }, [addToast, playNotificationSoundWithThrottle]);
  const showInfo = useCallback((message: string, title: string = 'Info', duration: number = 5000) => { playNotificationSoundWithThrottle('info'); return addToast({ type: 'info', title, message, duration }); }, [addToast, playNotificationSoundWithThrottle]);

  const enableSound = useCallback(() => {
    setSoundEnabled(true);
    if (notificationSound.current) {
      notificationSound.current.setEnabled(true);
      notificationSound.current.init();
      setTimeout(() => notificationSound.current!.playDefaultSound(), 100);
    }
  }, []);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    if (notificationSound.current) notificationSound.current.setEnabled(false);
  }, []);

  const setSoundVolumeLevel = useCallback((volume: number) => {
    const newVolume = Math.min(1, Math.max(0, volume));
    setSoundVolume(newVolume);
    if (notificationSound.current) notificationSound.current.setVolume(newVolume);
  }, []);

  const testSound = useCallback(() => {
    if (soundEnabled && notificationSound.current) notificationSound.current.playNotificationSound('info');
  }, [soundEnabled]);

  const addWorkflowNotification = (workflowType: string, action: string, data: any) => console.log('Workflow notification triggered:', { workflowType, action, data });

  const formatDate = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
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
  // UI COMPONENTS (Converted to React Native)
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
                <TouchableOpacity onPress={() => setSoundVolumeLevel(soundVolume - 0.1)} className="px-4 py-1 bg-white border border-gray-200 rounded">
                  <Text className="text-lg font-bold">-</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSoundVolumeLevel(soundVolume + 0.1)} className="px-4 py-1 bg-white border border-gray-200 rounded">
                  <Text className="text-lg font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={testSound} className="flex-row items-center justify-center py-2 rounded-lg bg-blue-50">
              <Text className="text-sm font-medium text-blue-600">🔊 Test Sound</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={requestNotificationPermission} className="items-center py-2 rounded-lg bg-gray-50">
          <Text className="text-sm text-gray-700">🔔 Enable OS Notifications</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const NotificationBell: FC = () => (
    <TouchableOpacity onPress={() => setIsOpen(!isOpen)} className="relative p-2 rounded-lg">
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
    
    // ✅ Different animation for mobile vs desktop
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
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setIsOpen(false)} />
        
        {/* ✅ Mobile: slide from bottom | Desktop: slide from right */}
        <Animated.View 
  style={[
    {
      position: 'absolute',
      backgroundColor: '#f9fafb', // bg-gray-50
    },
    // Mobile styles
    isMobile ? {
      bottom: 0,
      left: 0,
      right: 0,
      height: '75%',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      transform: [{ translateY: slideAnim }],
    } : 
    // Desktop styles
    {
      top: 0,
      bottom: 0,
      right: 0,
      width: '100%',
      maxWidth: 448, // max-w-md
      transform: [{ translateX: slideAnim }],
    },
  ]}
>
          {/* Header */}
          <View className="px-5 py-4 bg-white border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {notifications.length > 0 && unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} className="px-2 py-1 rounded-md bg-blue-50">
                    <Text className="text-xs font-medium text-blue-600">Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsOpen(false)} className="p-1.5 bg-gray-100 rounded-lg">
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
                      <Text className="text-xs text-gray-600 mt-1">{notification.message}</Text>
                      <View className="flex-row items-center justify-between mt-2">
                        <Text className="text-xs text-gray-400">{formatDate(notification.timestamp)}</Text>
                        <Text className={`text-xs font-medium ${getStatusColor(notification.title, notification.type)}`}>
                          {getStatusText(notification.title)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          {notifications.length > 0 && (
            <View className="px-5 py-3 bg-white border-t border-gray-200">
              <TouchableOpacity onPress={clearAllNotifications} className="items-center py-2 rounded-lg bg-gray-50">
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
        </View>
      ))}
    </View>
  );

  const value: NotificationContextType = {
    notifications, unreadCount, isOpen, setIsOpen, loading,
    addNotification, addWorkflowNotification, markAsReadAndNavigate,
    markAllAsRead, clearAllNotifications,
    showSuccess, showError, showWarning, showInfo,
    NotificationBell, NotificationPanel, ToastContainer,
    soundEnabled, soundVolume, enableSound, disableSound, setSoundVolumeLevel, testSound,
    SoundControlPanel, requestNotificationPermission, isSoundReady,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer />
      <NotificationPanel />
    </NotificationContext.Provider>
  );
};