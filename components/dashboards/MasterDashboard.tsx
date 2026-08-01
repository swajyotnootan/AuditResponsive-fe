// components/dashboards/MasterDashboard.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';

import AuditTypeManagement from './admin/AuditTypeManagement';
import CompetencyManagement from './admin/CompetencyManagement';
import EnterpriseManagement from './admin/EnterpriseManagement';
import FormsAnalytics from './admin/FormsAnalytics';
import LineManagement from './admin/LineManagement';
import LogoManagement from './admin/LogoManagement';
import RoleManagement from './admin/RoleManagement';
import UserManagement from './admin/UserManagement';

export default function MasterDashboard() {
  const params = useLocalSearchParams();
  const [activeSection, setActiveSection] = useState('user-management');

  // ✅ Listen for section param from drawer clicks
  useEffect(() => {
    if (params?.section) {
      setActiveSection(params.section as string);
    }
  }, [params?.section]);

  switch (activeSection) {
    case 'user-management': return <UserManagement />;
    case 'enterprise-management': return <EnterpriseManagement />;
    case 'role-management': return <RoleManagement />;
    case 'audit-type-management': return <AuditTypeManagement />;
    case 'competency-management': return <CompetencyManagement />;
    case 'line-mgmt': return <LineManagement />;
    case 'logo-mgmt': return <LogoManagement />;
    case 'forms-analytics': return <FormsAnalytics />;
    default: return <UserManagement />;
  }
}