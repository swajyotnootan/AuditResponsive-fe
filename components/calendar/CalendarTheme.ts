import { CalendarEvent } from "./CalendarTypes";

export const COLORS = {
    primary: "#00529B",
    background: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E5E7EB",
    text: "#111827",
    subText: "#6B7280",
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
    submitted: "#2563EB"
};

export const STATUS_COLORS: Record<string, string> = {
    COMPLETED: COLORS.success,
    SUBMITTED: COLORS.submitted,
    PENDING_APPROVAL: COLORS.warning,
    OVERDUE: COLORS.danger,
    REJECTED: COLORS.danger,
    SCHEDULED: COLORS.info
};

export function buildMarkedDates(events: CalendarEvent[]) {
    const marked: any = {};
    events.forEach(event => {
        if (!event.start) return;
        if (!marked[event.start]) {
            marked[event.start] = { dots: [] };
        }
        const color = STATUS_COLORS[event.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.SCHEDULED;
        marked[event.start].dots.push({
            color,
            selectedDotColor: "#fff"
        });
        marked[event.start].selected = true;
        marked[event.start].selectedColor = "rgba(37,99,235,.10)";
    });
    return marked;
}