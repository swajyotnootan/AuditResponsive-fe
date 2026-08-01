// @ts-nocheck
// src/components/NotificationBell.tsx

import React from 'react';
// 🚨 PATH FIX: Changed '../components/' to './' because this file is already inside the 'components' folder!
import { useNotifications } from './context/NotificationContext';
export default function NotificationBell() {
  // Extract the BellComponent from the context
  const { NotificationBell: BellComponent } = useNotifications();

  // 🛡️ Safety check: If the context isn't loaded yet, return null to prevent the app from crashing
  if (!BellComponent) {
    return null; 
  }

  // Render the actual bell component
  return <BellComponent />;
}
