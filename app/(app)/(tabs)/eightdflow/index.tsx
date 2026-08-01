// app/(app)/(tabs)/eightdflow/index.tsx
'use client';

import EightDFlow from '@/components/eightd/EightDFlow';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Dimensions, SafeAreaView, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isDesktop = width >= 1024;

export default function EightDFlowPage() {
  const params = useLocalSearchParams();
  
  const eventId = params?.eventId === 'null' ? null : (params?.eventId as string || null);
  const step = params?.step as string || 'D0';
  const isNcrBased = params?.isNcrBased === 'true';
  const type = params?.type as string || 'fresh';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <EightDFlow 
          eventId={eventId}
          initialStep={step}
          isNcrBased={isNcrBased}
          type={type}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: isMobile ? 8 : 16,
    paddingVertical: isMobile ? 8 : 16,
    maxWidth: isDesktop ? 1400 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
});