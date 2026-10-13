// context/TodayWorkPopupContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface TodayWorkPopupContextType {
  isOpen: boolean;
  open: (autoCloseMs?: number) => void;
  close: () => void;
  /**
   * Opens popup only if it hasn't been shown for this user today.
   * Uses date-based key so popup re-shows each new day per user.
   */
  openOncePerDay: (
    userId: string | number,
    autoCloseMs?: number,
  ) => Promise<void>;
  /** Removes today's flag for a user (used on logout) */
  resetForUser: (userId: string | number) => Promise<void>;
}

const TodayWorkPopupContext = createContext<
  TodayWorkPopupContextType | undefined
>(undefined);

export const useTodayWorkPopup = (): TodayWorkPopupContextType => {
  const ctx = useContext(TodayWorkPopupContext);
  if (!ctx)
    throw new Error(
      "useTodayWorkPopup must be used within TodayWorkPopupProvider",
    );
  return ctx;
};

// ✅ Per-user, per-day key
const getDailyKey = (userId: string | number): string => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `@today_popup_shown_${userId}_${dateStr}`;
};

export const TodayWorkPopupProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearAutoCloseTimer();
    setIsOpen(false);
  }, [clearAutoCloseTimer]);

  const open = useCallback(
    (autoCloseMs: number = 0) => {
      clearAutoCloseTimer();
      setIsOpen(true);
      if (autoCloseMs > 0) {
        autoCloseTimerRef.current = setTimeout(() => {
          setIsOpen(false);
          autoCloseTimerRef.current = null;
        }, autoCloseMs);
      }
    },
    [clearAutoCloseTimer],
  );

  //

  const openOncePerDay = useCallback(
    async (userId: string | number, autoCloseMs = 0) => {
      // 🚧 TEMP: dedup disabled — always open
      console.log("🟨 [CTX] openOncePerDay (dedup DISABLED) for user", userId);
      open(autoCloseMs);
    },
    [open],
  );
  const resetForUser = useCallback(async (userId: string | number) => {
    try {
      const key = getDailyKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("resetForUser failed:", e);
    }
  }, []);

  useEffect(() => {
    return () => clearAutoCloseTimer();
  }, [clearAutoCloseTimer]);

  return (
    <TodayWorkPopupContext.Provider
      value={{ isOpen, open, close, openOncePerDay, resetForUser }}
    >
      {children}
    </TodayWorkPopupContext.Provider>
  );
};
