// app/(app)/(tabs)/landing-page/index.tsx
import LandingPageComponent from '@/components/dashboards/LandingPage';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

type LandingPageType = 'all' | 'fresh' | 'ncr';

export default function LandingPage() {
  const params = useLocalSearchParams();
  const typeParam = params?.type as string;
  
  // Validate and set the type
  const isValidType = (value: string): value is LandingPageType => {
    return ['all', 'fresh', 'ncr'].includes(value);
  };
  
  const type: LandingPageType = isValidType(typeParam) ? typeParam : 'all';

  return (
    <SafeAreaView style={styles.container}>
      <LandingPageComponent type={type} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
});