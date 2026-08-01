// app/(app)/(tabs)/index.tsx
import { useAuth } from '@/components/context/AuthContext';
import { UserRole } from '@/types/user';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

// Import dashboards
import AuditeeDashboard from '@/components/dashboards/AuditeeDashboard';
import AuditManagerDashboard from '@/components/dashboards/AuditManagerDashboard';
import AuditorDashboard from '@/components/dashboards/AuditorDashboard';
import HODDashboard from '@/components/dashboards/HODDashboard';
import HRAdminDashboard from '@/components/dashboards/HRAdminDashboard';
import InitiatorDashboard from '@/components/dashboards/InitiatorDashboard';
import LeadAuditorDashboard from '@/components/dashboards/LeadAuditorDashboard';
import MasterDashboard from '@/components/dashboards/MasterDashboard';
import TopManagementDashboard from '@/components/dashboards/TopManagementDashboard';

export default function DashboardScreen() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#5B4E97" />
      </View>
    );
  }

  const renderDashboard = () => {
    const role = user.role?.toUpperCase();

    switch (role) {
      case UserRole.MASTER: return <MasterDashboard />;
      case UserRole.AUDITOR: return <AuditorDashboard />;
      case UserRole.HOD: return <HODDashboard />;
      case UserRole.AUDITEE: return <AuditeeDashboard />;
      case UserRole.LEAD_AUDITOR: return <LeadAuditorDashboard />;
      case UserRole.AUDIT_MANAGER: return <AuditManagerDashboard />;
      case UserRole.INITIATOR: return <InitiatorDashboard />;
      case UserRole.TOP_MANAGEMENT: return <TopManagementDashboard />;
      case UserRole.HR_ADMIN: return <HRAdminDashboard />;
      default: return <AuditorDashboard />;
    }
  };

  // ✅ Just return the dashboard directly - no extra SafeAreaView
  return (
    <View style={{ flex: 1}}>
      {renderDashboard()}
    </View>
  );
}