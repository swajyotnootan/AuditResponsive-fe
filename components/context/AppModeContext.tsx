// components/context/AppModeContext.tsx
import { IS_DEMO_ENV } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type AppMode = "demo" | "real";

const STORAGE_KEY = "qsutra.app_mode_override";

interface AppModeContextType {
  mode: AppMode;
  isDemo: boolean;
  isReal: boolean;
  setMode: (mode: AppMode) => Promise<void>;
  toggleMode: () => Promise<void>;
  ready: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mode, setModeState] = useState<AppMode>(IS_DEMO_ENV ? "demo" : "real");
  const [ready, setReady] = useState(false);

  // Load saved override on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "demo" || stored === "real") {
          setModeState(stored);
        }
      } catch (e) {
        console.warn("AppMode: failed to load override", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = async (next: AppMode) => {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      console.warn("AppMode: failed to persist override", e);
    }
  };

  const toggleMode = async () => {
    await setMode(mode === "demo" ? "real" : "demo");
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isDemo: mode === "demo",
        isReal: mode === "real",
        setMode,
        toggleMode,
        ready,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = (): AppModeContextType => {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within AppModeProvider");
  }
  return ctx;
};
