// YearView.tsx - Updated to match JSX version

import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react-native';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function YearView({ date, events, onEventClick, onDateClick, onMonthClick }: any) {
  const currentYear = moment(date).year();
  const today = moment();
  const [showSummary, setShowSummary] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<{ [key: number]: boolean }>({});

  const validEvents = useMemo(() => {
    return Array.isArray(events) ? events.filter((e: any) => e && e.start) : [];
  }, [events]);

  const getEventsForMonth = (monthIndex: number) => {
    const start = moment().year(currentYear).month(monthIndex).startOf('month');
    const end = moment().year(currentYear).month(monthIndex).endOf('month');
    return validEvents.filter((e: any) => moment(e.start).isBetween(start, end, 'day', '[]'));
  };

  const getEventColor = (event: any) => {
    if (event.isFullyCompleted) return '#059669';
    if (event.isSubmitted) return '#3B82F6';
    if (event.status === 'PENDING_APPROVAL') return '#F59E0B';
    if (event.status === 'OVERDUE' || event.status === 'REJECTED') return '#EF4444';
    if (event.isDateRange) return '#8B5CF6';
    return '#0EA5E9';
  };

  const renderMiniMonth = (monthIndex: number) => {
    const monthStart = moment().year(currentYear).month(monthIndex).startOf('month');
    const calendarStart = monthStart.clone().startOf('week');
    const weeks = [];
    let currentWeek = calendarStart.clone();
    const monthEnd = monthStart.clone().endOf('month');

    while (currentWeek.isSameOrBefore(monthEnd, 'day') || currentWeek.month() === monthIndex) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = currentWeek.clone().add(i, 'day');
        const dayEvents = validEvents.filter((e: any) => moment(e.start).isSame(day, 'day'));
        week.push({
          day: day.date(),
          isCurrentMonth: day.month() === monthIndex,
          hasEvents: dayEvents.length > 0,
          isToday: day.isSame(today, 'day'),
          date: day.toDate()
        });
      }
      weeks.push(week);
      currentWeek.add(1, 'week');
      if (currentWeek.month() > monthIndex && currentWeek.year() === currentYear) break;
    }

    return (
      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '500', color: '#9ca3af' }}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wIdx) => (
          <View key={wIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {week.map((d, dIdx) => {
              const hasEvents = d.hasEvents;
              const isToday = d.isToday;
              
              return (
                <TouchableOpacity
                  key={dIdx}
                  style={{
                    flex: 1,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    backgroundColor: isToday ? '#00529B' : (hasEvents ? '#EFF6FF' : 'transparent'),
                  }}
                  onPress={() => {
                    if (d.isCurrentMonth && onDateClick) {
                      onDateClick(d.date);
                    }
                  }}
                  disabled={!d.isCurrentMonth}
                >
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '500',
                    color: d.isCurrentMonth ? (isToday ? '#FFFFFF' : '#1f2937') : '#9ca3af'
                  }}>
                    {d.day}
                  </Text>
                  {hasEvents && !isToday && (
                    <View style={{ position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: '#3B82F6' }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Calculate stats
  const totalEvents = validEvents.length;
  const completedEvents = validEvents.filter((e: any) => e.isFullyCompleted).length;
  const pendingEvents = validEvents.filter((e: any) => e.status === 'PENDING_APPROVAL').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Year Header */}
      <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>{currentYear}</Text>
        <TouchableOpacity onPress={() => setShowSummary(!showSummary)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
          <BarChart3 size={16} color="#374151" />
          <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '500', color: '#374151' }}>Summary</Text>
          {showSummary ? <ChevronUp size={16} color="#374151" /> : <ChevronDown size={16} color="#374151" />}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {showSummary && (
        <View style={{ margin: 16, padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 }}>{currentYear} Audit Summary</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB' }}>{totalEvents}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Total Audits</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#059669' }}>{completedEvents}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Completed</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#F59E0B' }}>{pendingEvents}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Pending</Text>
            </View>
          </View>
        </View>
      )}

      {/* Month Grid */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {Array.from({ length: 12 }).map((_, monthIndex) => {
            const monthName = moment().month(monthIndex).format('MMMM');
            const monthEvents = getEventsForMonth(monthIndex);
            const isExpanded = expandedMonths[monthIndex];
            const isCurrent = moment().month(monthIndex).isSame(today, 'month');

            return (
              <View key={monthIndex} style={{ width: '47%', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 2, padding: 12, borderColor: isCurrent ? '#3B82F6' : '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => onMonthClick && onMonthClick(moment().year(currentYear).month(monthIndex).toDate())}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isCurrent ? '#2563EB' : '#1f2937' }}>
                      {monthName}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                    {monthEvents.length} audit{monthEvents.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {renderMiniMonth(monthIndex)}
                {isExpanded && monthEvents.length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    {monthEvents.slice(0, 4).map((e: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => onEventClick(e)}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: getEventColor(e) }} />
                        <Text style={{ flex: 1, fontSize: 12, color: '#374151' }} numberOfLines={1}>
                          {e.auditType || 'Audit'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                          {moment(e.start).format('MMM DD')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {monthEvents.length > 4 && (
                      <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                        +{monthEvents.length - 4} more
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}