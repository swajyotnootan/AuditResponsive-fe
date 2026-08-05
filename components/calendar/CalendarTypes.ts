// CalendarTypes.ts - ADD isOverdue to the interface

export type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'year' | 'list';
export type EventFilter = 'all' | 'owned' | 'attending';

export interface CalendarEvent {
  id: number;
  title: string;
  auditType: string;
  department: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  status: string;
  location?: string;
  description?: string;
  
  // User relationships
  isOwner: boolean;
  isAttendee: boolean;
  isCoAuditor: boolean;
  
  // People - WITH IDs for profile photos
  auditorName: string;
  auditorId: number | null;
  auditeeName: string;
  auditeeId: number | null;
  coAuditorNames: string[];
  coAuditorIdList: number[];
  
  // Date range
  isDateRange: boolean;
  fromDate: string | null;
  toDate: string | null;
  
  // Status flags
  isFullyCompleted: boolean;
  isSubmitted: boolean;
  isOverdue: boolean;  // ✅ ADD THIS
  auditNumber: string;
  
  // History
  originalScheduledDate: string | null;
  rescheduleHistory: any[];
  extensionHistory: any[];
  pendingReschedule: boolean;
  pendingExtension: boolean;
}