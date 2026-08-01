import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react-native';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function YearView({ date, events, onEventClick }: any) {
  const currentYear = moment(date).year();
  const [showSummary, setShowSummary] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<{[key: number]: boolean}>({});

  const validEvents = useMemo(() => Array.isArray(events) ? events.filter((e: any) => e && e.start) : [], [events]);

  const getEventsForMonth = (monthIndex: number) => {
    const start = moment().year(currentYear).month(monthIndex).startOf('month');
    const end = moment().year(currentYear).month(monthIndex).endOf('month');
    return validEvents.filter((e: any) => moment(e.start).isBetween(start, end, 'day', '[]'));
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
        week.push({ day: day.date(), isCurrentMonth: day.month() === monthIndex, hasEvents: dayEvents.length > 0, isToday: day.isSame(moment(), 'day') });
      }
      weeks.push(week);
      currentWeek.add(1, 'week');
      if (currentWeek.month() > monthIndex && currentWeek.year() === currentYear) break;
    }

    return (
      <View className="mt-2">
        <View className="flex-row mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <Text key={i} className="flex-1 text-center text-[10px] font-medium text-gray-500">{d}</Text>
          ))}
        </View>
        {weeks.map((week, wIdx) => (
          <View key={wIdx} className="flex-row mb-0.5">
            {week.map((d, dIdx) => (
              <View key={dIdx} className={`flex-1 h-6 items-center justify-center rounded-sm ${d.isToday ? 'bg-blue-600' : (d.hasEvents ? 'bg-blue-50' : '')}`}>
                <Text className={`text-[10px] font-medium ${d.isCurrentMonth ? (d.isToday ? 'text-white' : 'text-gray-800') : 'text-gray-400'}`}>
                  {d.day}
                </Text>
                {d.hasEvents && !d.isToday && <View className="absolute bottom-0 w-1 h-1 bg-blue-500 rounded-full" />}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">{currentYear}</Text>
        <TouchableOpacity onPress={() => setShowSummary(!showSummary)} className="flex-row items-center px-3 py-1 bg-gray-100 rounded-lg">
          <BarChart3 size={16} color="#374151" />
          <Text className="ml-1 text-xs font-medium text-gray-700">Summary</Text>
          {showSummary ? <ChevronUp size={16} color="#374151" /> : <ChevronDown size={16} color="#374151" />}
        </TouchableOpacity>
      </View>

      {showSummary && (
        <View className="p-4 bg-blue-50 m-4 rounded-xl">
          <Text className="text-base font-bold text-gray-900 mb-3">{currentYear} Audit Summary</Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 bg-white p-3 rounded-lg items-center">
              <Text className="text-xl font-bold text-blue-600">{validEvents.length}</Text>
              <Text className="text-xs text-gray-500">Total</Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-lg items-center">
              <Text className="text-xl font-bold text-green-600">{validEvents.filter((e: any) => e.isFullyCompleted).length}</Text>
              <Text className="text-xs text-gray-500">Completed</Text>
            </View>
          </View>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row flex-wrap gap-3">
          {Array.from({ length: 12 }).map((_, monthIndex) => {
            const monthName = moment().month(monthIndex).format('MMMM');
            const monthEvents = getEventsForMonth(monthIndex);
            const isExpanded = expandedMonths[monthIndex];
            const isCurrent = moment().month(monthIndex).isSame(moment(), 'month');

            return (
              <View key={monthIndex} className={`w-[48%] bg-white rounded-lg border-2 p-3 ${isCurrent ? 'border-blue-500' : 'border-gray-200'}`}>
                <View className="flex-row items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <Text className={`text-sm font-semibold ${isCurrent ? 'text-blue-600' : 'text-gray-800'}`}>{monthName}</Text>
                  <TouchableOpacity onPress={() => setExpandedMonths(prev => ({ ...prev, [monthIndex]: !prev[monthIndex] }))}>
                    {isExpanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                  </TouchableOpacity>
                </View>
                {renderMiniMonth(monthIndex)}
                {isExpanded && monthEvents.length > 0 && (
                  <View className="mt-3 pt-3 border-t border-gray-100">
                    {monthEvents.slice(0, 3).map((e: any, idx: number) => (
                      <TouchableOpacity key={idx} onPress={() => onEventClick(e)} className="flex-row items-center py-1">
                        <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        <Text className="flex-1 text-xs text-gray-700 truncate">{e.auditType || 'Audit'}</Text>
                        <Text className="text-[10px] text-gray-500">{moment(e.start).format('MMM DD')}</Text>
                      </TouchableOpacity>
                    ))}
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