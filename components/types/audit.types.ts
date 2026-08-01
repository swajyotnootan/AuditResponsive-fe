// src/types/audit.types.ts

export interface User {
  id: number | string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  roleName?: string;
  department?: string;
  profileImage?: string;
}

export interface AuditSchedule {
  id: number | string;
  auditNumber: string;
  auditType: string;
  department: string;
  status: string;
  approvalStatus: string;
  auditDate: string;
  scheduledDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  auditorId?: number | string;
  auditorName?: string;
  auditorEmail?: string;
  auditeeId?: number | string;
  auditeeName?: string;
  auditeeEmail?: string;
  hodEmail?: string;
  hodName?: string;
  memberEmails?: string[];
  teamAuditorIds?: number[] | string;
  teamAuditorNames?: string[] | string;
  progress?: number;
}

export interface PendingRequest {
  requestId: string;
  scheduleId: string | number;
  type: 'RESCHEDULE' | 'EXTENSION';
  auditType: string;
  department: string;
  auditorId: number | string;
  auditorName: string;
  auditeeId: number | string;
  auditeeName: string;
  currentDate: string;
  currentStartTime?: string;
  currentEndTime?: string;
  currentFromDate?: string;
  requestedNewDate?: string;
  requestedNewStartTime?: string;
  requestedNewEndTime?: string;
  requestedNewToDate?: string;
  reason: string;
  status: string;
  requestedAt: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  title: string;
  description: string;
  status: string;
  department: string;
  auditDepartment?: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalAudits: number;
  completedAudits: number;
  pendingSchedules: number;
  openNCRs: number;
  pendingRequests: number;
  pendingCaVerification: number;
}

export interface FormStatus {
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'NOT_STARTED' | 'DRAFT';
  year: number;
}

export interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'locked';
  icon: string;
  time?: string;
}

export interface DepartmentTeamMembers {
  auditors: User[];
  auditees: User[];
  leadAuditorId?: number | string | null;
  leadAuditorName?: string | null;
  teamAuditorIds?: (number | string)[];
  teamAuditorNames?: string[];
  auditeeIds?: (number | string)[];
  auditeeNames?: string[];
}

export interface ConflictWarning {
  type: 'reassign' | 'coauditor';
  auditorId: string | number;
  auditorName: string;
  conflicts: {
    date: string;
    conflict: AuditSchedule;
  }[];
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface DepartmentNCRData {
  department: string;
  count: number;
}