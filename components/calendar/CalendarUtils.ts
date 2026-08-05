// CalendarUtils.ts

import { CalendarEvent } from './CalendarTypes';

export function buildMarkedDates(events: CalendarEvent[]) {
  const marked: any = {};

  events.forEach((event) => {
    if (!event.start) return;

    if (!marked[event.start]) {
      marked[event.start] = {
        dots: [],
        selected: true,
        selectedColor: 'rgba(37,99,235,.10)'
      };
    }

    // Determine dot color
    let color = '#0EA5E9'; // Default: Scheduled
    
    if (event.isFullyCompleted) {
      color = '#059669'; // Completed
    } else if (event.isSubmitted) {
      color = '#3B82F6'; // Submitted
    } else if (event.status === 'PENDING_APPROVAL') {
      color = '#F59E0B'; // Pending
    } else if (event.status === 'REJECTED' || event.status === 'OVERDUE') {
      color = '#EF4444'; // Rejected/Overdue
    } else if (event.isDateRange) {
      color = '#8B5CF6'; // Date Range
    }

    marked[event.start].dots.push({
      color,
      selectedDotColor: '#ffffff'
    });
  });

  return marked;
}