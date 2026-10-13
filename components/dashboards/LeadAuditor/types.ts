// app/components/dashboards/LeadAuditor/types.ts

// ✅ SINGLE SOURCE OF TRUTH — no other file should redefine these
export interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  username?: string;
  name?: string;
  // ✅ Allow BOTH string and object (flexible for API quirks)
  department?: string | { displayName?: string; name?: string } | null;
  plantId?: number | string | null;
  plantName?: string | null;
  plantCode?: string | null;
}

export interface Schedule {
  id: string | number;
  department?: string;

  // ✅ Auditor fields
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorId?: string | number;
  leadAuditorName?: string;
  coAuditorIds?: string[] | string;

  // ✅ Auditee fields — ADDED to fix the TS error
  auditeeId?: string | number;
  auditeeIds?: string[] | string;
  auditeeName?: string;
  auditeeNames?: string[];

  // Dates & times
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;

  // Status
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
  createdAt?: string;

  // Plant
  plantId?: number | string | null;
  plantName?: string;
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
  plantId?: number | string | null;
  auditScheduleId?: string | number; // ← ADD
  scheduleId?: string | number; // ← ADD
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
  plantId?: number | string | null;
  auditScheduleId?: string | number; // ← ADD
  scheduleId?: string | number; // ← ADD
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

// ✅ Helper to safely convert plantId to number
export const normalizePlantId = (
  value: number | string | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  return isNaN(num) ? null : num;
};
