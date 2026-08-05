// CalendarUtils.ts - FIXED status detection

import { CalendarEvent } from './CalendarTypes';

// Status color mapping
export const STATUS_COLORS = {
  COMPLETED: '#059669',      // Emerald
  SUBMITTED: '#3B82F6',      // Blue
  PENDING_APPROVAL: '#F59E0B', // Yellow
  OVERDUE: '#EF4444',        // Red
  REJECTED: '#EF4444',       // Red
  SCHEDULED: '#0EA5E9',      // Sky
  DATE_RANGE: '#8B5CF6',     // Purple
  APPROVED: '#10B981',       // Green
  CHANGE_REQUESTED: '#F97316', // Orange
};

export function getEventColor(event: CalendarEvent): string {
  // ✅ FIXED: Check isFullyCompleted first
  if (event.isFullyCompleted || event.status === 'COMPLETED') {
    return STATUS_COLORS.COMPLETED;
  }
  if (event.isSubmitted || event.status === 'SUBMITTED') {
    return STATUS_COLORS.SUBMITTED;
  }
  if (event.status === 'PENDING_APPROVAL') {
    return STATUS_COLORS.PENDING_APPROVAL;
  }
  if (event.status === 'OVERDUE') {
    return STATUS_COLORS.OVERDUE;
  }
  if (event.status === 'REJECTED') {
    return STATUS_COLORS.REJECTED;
  }
  if (event.isDateRange) {
    return STATUS_COLORS.DATE_RANGE;
  }
  if (event.status === 'APPROVED') {
    return STATUS_COLORS.APPROVED;
  }
  if (event.status === 'CHANGE_REQUESTED') {
    return STATUS_COLORS.CHANGE_REQUESTED;
  }
  return STATUS_COLORS.SCHEDULED;
}

export function isEventOverdue(event: CalendarEvent): boolean {
  if (!event || !event.end) return false;
  
  const eventEnd = new Date(event.end);
  const now = new Date();
  
  // ✅ FIXED: Check completion status first
  if (event.isFullyCompleted || event.status === 'COMPLETED') return false;
  if (event.isSubmitted || event.status === 'SUBMITTED') return false;
  if (event.status === 'PENDING_APPROVAL') return false;
  if (event.status === 'REJECTED') return false;
  
  if ((event.status === 'APPROVED' || event.status === 'SCHEDULED') && eventEnd < now) {
    return true;
  }
  
  return false;
}

export function getStatusDisplay(event: CalendarEvent): string {
  // ✅ FIXED: Check in correct order
  if (event.isFullyCompleted || event.status === 'COMPLETED') {
    return '✓ Audit Completed';
  }
  if (event.isSubmitted || event.status === 'SUBMITTED') {
    return '⏳ Pending Auditee Approval';
  }
  if (isEventOverdue(event)) {
    return '⚠️ OVERDUE';
  }
  if (event.status === 'REJECTED') {
    return '❌ Rejected';
  }
  if (event.status === 'CHANGE_REQUESTED') {
    return '🔄 Changes Requested';
  }
  
  const statusMap: Record<string, string> = {
    'SCHEDULED': '📅 Scheduled',
    'PENDING_APPROVAL': '⏳ Pending Schedule Approval',
    'APPROVED': '✅ Schedule Approved',
    'DRAFT': '📝 Draft',
  };
  return statusMap[event.status] || event.status;
}

export function buildMarkedDates(events: CalendarEvent[]) {
  const marked: any = {};

  events.forEach((event) => {
    if (!event.start) return;

    const color = getEventColor(event);

    if (!marked[event.start]) {
      marked[event.start] = {
        dots: [],
        selected: true,
        selectedColor: 'rgba(37,99,235,0.1)',
      };
    }

    marked[event.start].dots.push({
      color,
      selectedDotColor: '#FFFFFF',
    });

    // Limit dots to 3
    if (marked[event.start].dots.length > 3) {
      marked[event.start].dots = marked[event.start].dots.slice(0, 3);
    }
  });

  return marked;
}
