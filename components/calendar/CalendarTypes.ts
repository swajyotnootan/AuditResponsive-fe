export type ViewType =
  | "month"
  | "week"
  | "agenda"
  | "year"
  | "list";

export type EventFilter =
  | "all"
  | "owned"
  | "attending";

export interface CalendarEvent {

    id: number;

    auditId?: number;

    auditType: string;

    department?: string;

    start: string;

    end?: string;

    startTime?: string;

    endTime?: string;

    status: string;

    location?: string;

    auditor?: string;

    auditee?: string;

    description?: string;

    isOwner?: boolean;

    isAttendee?: boolean;

    isSubmitted?: boolean;

    isFullyCompleted?: boolean;

    color?: string;
}