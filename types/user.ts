// types/user.ts

// ✅ ADD THIS ENUM
export enum UserRole {
  MASTER = 'MASTER',
  AUDIT_MANAGER = 'AUDIT_MANAGER',
  LEAD_AUDITOR = 'LEAD_AUDITOR',
  AUDITOR = 'AUDITOR',
  INITIATOR = 'INITIATOR',
  HOD = 'HOD',
  AUDITEE = 'AUDITEE',
  HR_ADMIN = 'HR_ADMIN',
  QMS_ADMIN = 'QMS_ADMIN',
  TOP_MANAGEMENT = 'TOP_MANAGEMENT',
}

export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role: string; // Keep as string for API compatibility, but use enum for checks
  username?: string;
  phone?: string;
  department?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  token?: string;
  [key: string]: any;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: User;
  message?: string;
  id?: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
  status?: number;
  [key: string]: any;
}