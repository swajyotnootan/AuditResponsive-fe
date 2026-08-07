// CalendarUtils.ts
import moment from "moment";
import { CalendarEvent } from "./CalendarTypes";

export const STATUS_COLORS = {
  COMPLETED: "#059669",
  SUBMITTED: "#3B82F6",
  PENDING_APPROVAL: "#F59E0B",
  OVERDUE: "#EF4444",
  REJECTED: "#EF4444",
  SCHEDULED: "#0EA5E9",
  DATE_RANGE: "#8B5CF6",
  APPROVED: "#10B981",
  CHANGE_REQUESTED: "#F97316",
};

function parseTimeToMoment(dateStr: string, timeStr?: string): moment.Moment {
  const base = moment(dateStr, "YYYY-MM-DD");

  if (!timeStr) {
    // No end time stored → treat as end of that day
    return base.hour(23).minute(59).second(59);
  }

  // "10:00 AM" / "2:00 PM"
  const m12 = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const m = parseInt(m12[2], 10);
    const p = m12[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return base.hour(h).minute(m).second(0).millisecond(0);
  }

  // "14:00" 24-hour format
  const m24 = timeStr.match(/(\d+):(\d+)/);
  if (m24) {
    return base
      .hour(parseInt(m24[1], 10))
      .minute(parseInt(m24[2], 10))
      .second(0);
  }

  return base.hour(23).minute(59).second(59);
}

export function isEventCompleted(event?: CalendarEvent | null): boolean {
  if (!event) return false;

  const status = (event.status || "").toUpperCase();

  return event.isFullyCompleted === true || status === "COMPLETED";
}

export function isEventSubmitted(event?: CalendarEvent | null): boolean {
  if (!event) return false;

  const status = (event.status || "").toUpperCase();

  return event.isSubmitted === true || status === "SUBMITTED";
}

export function isEventOverdue(event?: CalendarEvent | null): boolean {
  if (!event) return false;

  // Never overdue if completed / submitted
  if (isEventCompleted(event)) return false;
  if (isEventSubmitted(event)) return false;

  const status = (event.status || "SCHEDULED").toUpperCase();

  if (
    ["PENDING_APPROVAL", "REJECTED", "CHANGE_REQUESTED", "DRAFT"].includes(
      status,
    )
  ) {
    return false;
  }

  // End DATE: toDate for ranges, otherwise end/start
  const endDateStr =
    event.isDateRange && event.toDate ? event.toDate : event.end || event.start;

  if (!endDateStr) return false;

  // ✅ THE FIX: combine end DATE + end TIME (Web does this with setHours)
  const eventEnd = parseTimeToMoment(endDateStr, event.endTime);

  // ✅ SAME AS WEB: APPROVED or SCHEDULED + end time passed => OVERDUE
  if (
    (status === "APPROVED" || status === "SCHEDULED") &&
    eventEnd.isBefore(moment())
  ) {
    return true;
  }

  return false;
}

// CalendarUtils.ts (add at bottom)
export function getRescheduleInfo(event?: CalendarEvent | null): {
  hasReschedule: boolean;
  originalDate: string | null;
  currentDate: string | null;
} {
  if (!event) {
    return { hasReschedule: false, originalDate: null, currentDate: null };
  }

  const history = event.rescheduleHistory || [];
  const latestReschedule =
    history.length > 0 ? history[history.length - 1] : null;

  // Same priority as Web: originalScheduledDate → latestReschedule.oldDate
  const originalDate =
    event.originalScheduledDate || latestReschedule?.oldDate || null;

  const currentDate =
    event.isDateRange && event.fromDate ? event.fromDate : event.start;

  if (
    originalDate &&
    currentDate &&
    moment(originalDate).format("YYYY-MM-DD") !==
      moment(currentDate).format("YYYY-MM-DD")
  ) {
    return { hasReschedule: true, originalDate, currentDate };
  }

  return { hasReschedule: false, originalDate, currentDate };
}

export function getEventColor(event?: CalendarEvent | null): string {
  if (!event) return STATUS_COLORS.SCHEDULED;

  // ✅ Priority 1: COMPLETED
  if (isEventCompleted(event)) {
    return STATUS_COLORS.COMPLETED;
  }

  // ✅ Priority 2: SUBMITTED
  if (isEventSubmitted(event)) {
    return STATUS_COLORS.SUBMITTED;
  }

  // ✅ Priority 3: OVERDUE
  if (isEventOverdue(event)) {
    return STATUS_COLORS.OVERDUE;
  }

  // ✅ Priority 4: DATE RANGE
  if (event.isDateRange) {
    return STATUS_COLORS.DATE_RANGE;
  }

  const status = (event.status || "").toUpperCase();

  if (status === "APPROVED") return STATUS_COLORS.APPROVED;
  if (status === "PENDING_APPROVAL") return STATUS_COLORS.PENDING_APPROVAL;
  if (status === "REJECTED") return STATUS_COLORS.REJECTED;
  if (status === "CHANGE_REQUESTED") return STATUS_COLORS.CHANGE_REQUESTED;

  return STATUS_COLORS.SCHEDULED;
}

export function getStatusDisplay(event?: CalendarEvent | null): string {
  if (!event) return "Unknown";

  // ✅ Priority 1: COMPLETED
  if (isEventCompleted(event)) {
    return "✓ Audit Completed";
  }

  // ✅ Priority 2: SUBMITTED
  if (isEventSubmitted(event)) {
    return "⏳ Pending Auditee Approval";
  }

  // ✅ Priority 3: OVERDUE
  if (isEventOverdue(event)) {
    return event.isDateRange ? "⚠️ OVERDUE (Date Range)" : "⚠️ OVERDUE";
  }

  const status = (event.status || "SCHEDULED").toUpperCase();

  const statusMap: Record<string, string> = {
    SCHEDULED: "Scheduled",
    PENDING_APPROVAL: "Pending Schedule Approval",
    APPROVED: "Schedule Approved",
    REJECTED: "Rejected",
    DRAFT: "Draft",
    CHANGE_REQUESTED: "Changes Requested",
  };

  const baseStatus = statusMap[status] || event.status || "Unknown";

  // For date range, do not hide actual status.
  // Show status with date-range icon.
  if (event.isDateRange) {
    return `📅 ${baseStatus}`;
  }

  return baseStatus;
}

export function buildMarkedDates(events: CalendarEvent[]) {
  const marked: any = {};

  events.forEach((event) => {
    if (!event.start) return;

    const dateStr = moment(event.start).format("YYYY-MM-DD");
    const color = getEventColor(event);

    if (!marked[dateStr]) {
      marked[dateStr] = {
        dots: [],
      };
    }

    // Avoid duplicate same-color dots on the same date
    const alreadyHasColor = marked[dateStr].dots.some(
      (dot: any) => dot.color === color,
    );

    if (!alreadyHasColor) {
      marked[dateStr].dots.push({
        color,
        selectedDotColor: "#FFFFFF",
      });
    }

    // react-native-calendars usually shows max 3 dots cleanly
    if (marked[dateStr].dots.length > 3) {
      marked[dateStr].dots = marked[dateStr].dots.slice(0, 3);
    }
  });

  return marked;
}
