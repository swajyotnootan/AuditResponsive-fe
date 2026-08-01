import CalendarView from '@/components/calendar/CalendarView'; // Import the big component
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <CalendarView />
    </SafeAreaView>
  );
}