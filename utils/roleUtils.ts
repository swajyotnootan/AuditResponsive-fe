// utils/roleUtils.ts
import { UserRole } from '@/types/user';

export const normalizeRole = (role: string | null | undefined): UserRole | null => {
  if (!role) return null;
  const upperRole = role.toUpperCase();
  
  // Check if it's a valid enum value
  if (Object.values(UserRole).includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }
  
  return UserRole.AUDITOR; // Default fallback
};

export const getRoleDisplayName = (role: string | null | undefined): string => {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case UserRole.MASTER: return 'Master';
    case UserRole.AUDIT_MANAGER: return 'Audit Manager';
    case UserRole.LEAD_AUDITOR: return 'Lead Auditor';
    case UserRole.AUDITOR: return 'Auditor';
    case UserRole.INITIATOR: return 'Initiator';
    case UserRole.HOD: return 'HOD';
    case UserRole.AUDITEE: return 'Auditee';
    case UserRole.HR_ADMIN: return 'HR Admin';
    case UserRole.QMS_ADMIN: return 'QMS Admin';
    case UserRole.TOP_MANAGEMENT: return 'Top Management';
    default: return role || 'User';
  }
};

// Role checkers
export const isMaster = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.MASTER;
export const isAuditManager = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.AUDIT_MANAGER;
export const isLeadAuditor = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.LEAD_AUDITOR;
export const isAuditor = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.AUDITOR;
export const isInitiator = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.INITIATOR;
export const isHOD = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.HOD;
export const isAuditee = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.AUDITEE;
export const isHRAdmin = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.HR_ADMIN;
export const isQMSAdmin = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.QMS_ADMIN;
export const isTopManagement = (role: string | null | undefined): boolean => normalizeRole(role) === UserRole.TOP_MANAGEMENT;

// Combined checkers
export const isAuditTeam = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === UserRole.AUDIT_MANAGER || normalized === UserRole.LEAD_AUDITOR || normalized === UserRole.AUDITOR;
};

export const canRaiseNCR = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === UserRole.AUDITOR || normalized === UserRole.LEAD_AUDITOR;
};

export const canCloseNCR = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === UserRole.LEAD_AUDITOR || normalized === UserRole.AUDIT_MANAGER;
};

export const canApprovePlan = (role: string | null | undefined): boolean => {
  const normalized = normalizeRole(role);
  return normalized === UserRole.AUDIT_MANAGER || normalized === UserRole.TOP_MANAGEMENT || normalized === UserRole.MASTER;
};

// Dashboard path mapping
export const getDashboardPath = (user: any): string => {
  if (!user) return '/';
  const role = typeof user === 'string' ? user : user.role;
  const normalized = normalizeRole(role);
  
  switch (normalized) {
    case UserRole.MASTER: return '/master';
    case UserRole.AUDIT_MANAGER: return '/audit-manager';
    case UserRole.LEAD_AUDITOR: return '/lead-auditor';
    case UserRole.AUDITOR: return '/auditor';
    case UserRole.INITIATOR: return '/initiator';
    case UserRole.HOD: return '/hod';
    case UserRole.AUDITEE: return '/auditee';
    case UserRole.HR_ADMIN: return '/hr-admin';
    case UserRole.QMS_ADMIN: return '/qms-admin';
    case UserRole.TOP_MANAGEMENT: return '/top-management';
    default: return '/dashboard';
  }
};

// All roles list
export const ALL_ROLES: UserRole[] = Object.values(UserRole);

// Login role options
export const LOGIN_ROLE_OPTIONS = [
  { value: 'master', label: 'Master', role: UserRole.MASTER },
  { value: 'audit_manager', label: 'Audit Manager', role: UserRole.AUDIT_MANAGER },
  { value: 'lead_auditor', label: 'Lead Auditor', role: UserRole.LEAD_AUDITOR },
  { value: 'auditor', label: 'Auditor', role: UserRole.AUDITOR },
  { value: 'initiator', label: 'Initiator', role: UserRole.INITIATOR },
  { value: 'hod', label: 'HOD', role: UserRole.HOD },
  { value: 'auditee', label: 'Auditee', role: UserRole.AUDITEE },
  { value: 'hr_admin', label: 'HR Admin', role: UserRole.HR_ADMIN },
  { value: 'top_management', label: 'Top Management', role: UserRole.TOP_MANAGEMENT },
];