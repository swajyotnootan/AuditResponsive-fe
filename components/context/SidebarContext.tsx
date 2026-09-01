// components/context/SidebarContext.tsx
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

// ✅ Create context with undefined default (better for debugging)
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    console.log('🔄 toggleSidebar called, current state:', isOpen, 'Platform:', Platform.OS);
    setIsOpen(prev => !prev);
  }, [isOpen]);

  const openSidebar = useCallback(() => {
    console.log('📖 openSidebar called, Platform:', Platform.OS);
    setIsOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    console.log('📕 closeSidebar called, Platform:', Platform.OS);
    setIsOpen(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextType => {
  const context = useContext(SidebarContext);
  if (!context) {
    // ✅ Return a fallback instead of throwing (prevents crash)
    console.warn('⚠️ useSidebar called outside of SidebarProvider! Using fallback.');
    return {
      isOpen: false,
      toggleSidebar: () => console.warn('⚠️ toggleSidebar fallback called'),
      openSidebar: () => console.warn('⚠️ openSidebar fallback called'),
      closeSidebar: () => console.warn('⚠️ closeSidebar fallback called'),
    };
  }
  return context;
};