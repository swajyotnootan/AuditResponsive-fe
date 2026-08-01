// components/context/AuthContext.tsx
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import React, { createContext, ReactNode, useContext } from 'react';

interface User {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  username?: string;
  profilePhoto?: string;
  department?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  // Role-based permission flags
  isInitiator: boolean;
  isHOD: boolean;
  isAdmin: boolean;
  isAuditor: boolean;
  isLeadAuditor: boolean;
  isAuditee: boolean;
  isMaster: boolean;
  isAuditManager: boolean;
  isTopManagement: boolean;
  isHRAdmin: boolean;
  isQMSAdmin: boolean;
  // Auth methods
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, login, logout, updateUser } = useAuthHook();

  // Role-based permission checks
  const userRole = user?.role?.toUpperCase() || '';
  
  const isInitiator = userRole === 'INITIATOR';
  const isHOD = userRole === 'HOD';
  const isAdmin = userRole === 'ADMIN' || userRole === 'MASTER';
  const isAuditor = userRole === 'AUDITOR';
  const isLeadAuditor = userRole === 'LEAD_AUDITOR';
  const isAuditee = userRole === 'AUDITEE';
  const isMaster = userRole === 'MASTER';
  const isAuditManager = userRole === 'AUDIT_MANAGER';
  const isTopManagement = userRole === 'TOP_MANAGEMENT';
  const isHRAdmin = userRole === 'HR_ADMIN';
  const isQMSAdmin = userRole === 'QMS_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isLoading,
        isAuthenticated: !!user,
        // Role-based flags
        isInitiator,
        isHOD,
        isAdmin,
        isAuditor,
        isLeadAuditor,
        isAuditee,
        isMaster,
        isAuditManager,
        isTopManagement,
        isHRAdmin,
        isQMSAdmin,
        // Auth methods
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};