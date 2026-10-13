// components/context/AuthContext.tsx
import {
  useAuth as useAuthHook,
  type BiometricStatus,
  type WebAuthnDevice,
} from "@/hooks/useAuth";
import React, { createContext, ReactNode, useContext } from "react";

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

  companyId?: string | number;
  companyCode?: string;
  companyName?: string;

  plantId?: string | number;
  plantCode?: string;
  plantName?: string;

  siteId?: string | number;
  siteCode?: string;
  siteName?: string;

  unitId?: string | number;
  unitCode?: string;
  unitName?: string;

  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
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

  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;

  biometricStatus: BiometricStatus;
  enrollBiometric: () => Promise<boolean>;
  unlockWithBiometric: () => Promise<User | null>;
  disableBiometric: () => Promise<void>;

  // WebAuthn (web biometric)
  webAuthnDevices: WebAuthnDevice[];
  webAuthnAvailable: boolean;
  webAuthnBusy: boolean;
  registerWebAuthnDevice: (deviceName?: string) => Promise<boolean>;
  loginWithWebAuthn: (username: string) => Promise<User | null>;
  loginWithDiscoverablePasskey: () => Promise<User | null>;
  removeWebAuthnDevice: (credentialId: number) => Promise<boolean>;
  refreshWebAuthnDevices: () => Promise<void>;
  userHasWebAuthnDevices: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const {
    user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUser,
    biometricStatus,
    enrollBiometric,
    unlockWithBiometric,
    disableBiometric,

    webAuthnDevices,
    webAuthnAvailable,
    webAuthnBusy,
    registerWebAuthnDevice,
    loginWithWebAuthn,
    loginWithDiscoverablePasskey,

    removeWebAuthnDevice,
    refreshWebAuthnDevices,
    userHasWebAuthnDevices,
  } = useAuthHook();

  const userRole = user?.role?.toUpperCase() || "";

  const isInitiator = userRole === "INITIATOR";
  const isHOD = userRole === "HOD";
  const isAdmin = userRole === "ADMIN" || userRole === "MASTER";
  const isAuditor = userRole === "AUDITOR";
  const isLeadAuditor = userRole === "LEAD_AUDITOR";
  const isAuditee = userRole === "AUDITEE";
  const isMaster = userRole === "MASTER";
  const isAuditManager = userRole === "AUDIT_MANAGER";
  const isTopManagement = userRole === "TOP_MANAGEMENT";
  const isHRAdmin = userRole === "HR_ADMIN";
  const isQMSAdmin = userRole === "QMS_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isLoading,
        isAuthenticated: !!user,
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
        login,
        logout,
        updateUser,
        refreshUser,
        biometricStatus,
        enrollBiometric,
        unlockWithBiometric,
        disableBiometric,

        webAuthnDevices,
        webAuthnAvailable,
        webAuthnBusy,
        registerWebAuthnDevice,
        loginWithWebAuthn,
        loginWithDiscoverablePasskey,
        removeWebAuthnDevice,
        refreshWebAuthnDevices,
        userHasWebAuthnDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
