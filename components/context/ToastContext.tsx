// src/context/ToastContext.tsx
import { AlertCircle, CheckCircle, Info, X } from "lucide-react-native";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ============================================================
// Types
// ============================================================

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  // Legacy aliases
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

// ============================================================
// Toast Item Component
// ============================================================

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle size={18} color="#16a34a" />;
      case "error":
        return <AlertCircle size={18} color="#dc2626" />;
      case "warning":
        return <AlertCircle size={18} color="#ea580c" />;
      default:
        return <Info size={18} color="#2563eb" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "#f0fdf4";
      case "error":
        return "#fef2f2";
      case "warning":
        return "#fff7ed";
      default:
        return "#eff6ff";
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      case "warning":
        return "#ea580c";
      default:
        return "#3b82f6";
    }
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        marginBottom: 8,
        backgroundColor: getBgColor(toast.type),
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderLeftWidth: 4,
        borderLeftColor: getBorderColor(toast.type),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        padding: 12,
        paddingLeft: 16,
        width: "100%",
        maxWidth: 400,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ marginRight: 12 }}>{getIcon(toast.type)}</View>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            color: "#1f2937",
            flexWrap: "wrap",
          }}
        >
          {toast.message}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={{ padding: 4, marginLeft: 8 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============================================================
// Toast Container Component
// ============================================================

const ToastContainer = ({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: number) => void;
}) => {
  if (toasts.length === 0) return null;

  return (
    <SafeAreaView
      style={{
        position: "absolute",
        bottom: Platform.OS === "ios" ? 40 : 20,
        right: 20,
        left: 20,
        zIndex: 9999,
        alignItems: "flex-end",
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: "100%",
          alignItems: "flex-end",
        }}
      >
        {toasts.map((toast) => (
          <View key={toast.id} style={{ width: "100%", maxWidth: 400 }}>
            <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};

// ============================================================
// Toast Context
// ============================================================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    console.warn("useToast must be used within a ToastProvider");
    // Return fallback with all methods
    return {
      addToast: () => {},
      showToast: () => {},
      showSuccess: () => {},
      showError: () => {},
      showInfo: () => {},
      showWarning: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return context;
};

// ============================================================
// Toast Provider
// ============================================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<{ [key: number]: ReturnType<typeof setTimeout> }>(
    {},
  );

  const addToast = (
    message: string,
    type: ToastType = "info",
    duration: number = 3000,
  ) => {
    const id = Date.now();

    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }

    setToasts((prev) => [...prev, { id, message, type }]);

    timeoutRefs.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timeoutRefs.current[id];
    }, duration);
  };

  const removeToast = (id: number) => {
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Helper methods
  const showSuccess = (message: string, duration?: number) =>
    addToast(message, "success", duration);
  const showError = (message: string, duration?: number) =>
    addToast(message, "error", duration);
  const showInfo = (message: string, duration?: number) =>
    addToast(message, "info", duration);
  const showWarning = (message: string, duration?: number) =>
    addToast(message, "warning", duration);
  const showToast = addToast;

  // Aliases for backward compatibility
  const success = showSuccess;
  const error = showError;
  const info = showInfo;
  const warning = showWarning;

  return (
    <ToastContext.Provider
      value={{
        addToast,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
