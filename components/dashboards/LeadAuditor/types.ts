// app/components/dashboards/LeadAuditor/types.ts

export interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  username?: string;
  name?: string;
}

export interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  coAuditorIds?: string[] | string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
  createdAt?: string;
}

export interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  createdAt?: string;
  raisedDate?: string;
  dueDate?: string;
}

export interface Response {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  auditeeId?: string | number;
  status?: string;
  approvalStatus?: string;
  answers?: any;
  percentageScore?: number;
  totalScore?: number;
  maxPossibleScore?: number;
  createdAt?: string;
  submittedAt?: string;
  checkSheet?: { name: string };
}

export interface Stats {
  totalSchedules: number;
  completedSchedules: number;
  approved: number;
  rejected: number;
  pendingApproval: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  majorNCRs: number;
  minorNCRs: number;
  totalResponses: number;
  responsesApproved: number;
  responsesRejected: number;
  responsesSubmitted: number;
  ncrApproved: number;
  ncrInProgress: number;
  ncrOpen: number;
}