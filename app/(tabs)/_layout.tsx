// app/(app)/(tabs)/_layout.tsx
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const getTabsForRole = (role: string) => {
  const commonTabs = [
    { name: 'index', title: 'Dashboard', icon: 'pie-chart' },
    { name: 'profile', title: 'Profile', icon: 'user' },
  ];

  const roleSpecificTabs: Record<string, any[]> = {
    MASTER: [
      ...commonTabs,
      { name: 'master', title: 'Master', icon: 'award' },
      { name: 'calendar', title: 'Calendar', icon: 'calendar' },
      { name: 'reports', title: 'Reports', icon: 'file-text' },
    ],
    AUDIT_MANAGER: [
      ...commonTabs,
      { name: 'audit-manager', title: 'Audits', icon: 'clipboard' },
      { name: 'calendar', title: 'Calendar', icon: 'calendar' },
      { name: 'reports', title: 'Reports', icon: 'file-text' },
    ],
    LEAD_AUDITOR: [
      ...commonTabs,
      { name: 'lead-auditor', title: 'Audits', icon: 'clipboard' },
      { name: 'calendar', title: 'Calendar', icon: 'calendar' },
    ],
    AUDITOR: [
      ...commonTabs,
      { name: 'auditor', title: 'My Audits', icon: 'clipboard' },
    ],
    HOD: [
      ...commonTabs,
      { name: 'hod', title: 'Department', icon: 'users' },
    ],
    AUDITEE: [
      ...commonTabs,
      { name: 'auditee', title: 'My Audits', icon: 'clipboard' },
    ],
  };

  return roleSpecificTabs[role] || commonTabs;
};

export default function TabLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || 'AUDITOR');
    } catch (error) {
      setUserRole('AUDITOR');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const tabs = getTabsForRole(userRole || 'AUDITOR');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View className={`p-1 rounded-full ${focused ? 'bg-primary/10' : ''}`}>
                <Feather name={tab.icon as any} size={24} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}