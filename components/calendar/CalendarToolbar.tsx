import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, List } from 'lucide-react-native';
import moment from 'moment';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function CalendarToolbar({ view, date, onNavigate, onViewChange, layout, onLayoutChange }: any) {
  const navigate = (action: string) => {
    let newDate = moment(date);
    if (action === 'PREV') newDate.subtract(view === 'year' ? 1 : view === 'month' ? 1 : view === 'week' ? 7 : 1, view === 'year' ? 'years' : 'days');
    if (action === 'NEXT') newDate.add(view === 'year' ? 1 : view === 'month' ? 1 : view === 'week' ? 7 : 1, view === 'year' ? 'years' : 'days');
    if (action === 'TODAY') newDate = moment();
    onNavigate(newDate.format('YYYY-MM-DD'));
  };

  const getDateLabel = () => {
    if (view === 'year') return moment(date).format('YYYY');
    if (view === 'month') return moment(date).format('MMMM YYYY');
    if (view === 'week') return `Week of ${moment(date).startOf('week').format('MMM DD')}`;
    return moment(date).format('MMMM DD, YYYY');
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <View className="flex-row items-center gap-2">
        <TouchableOpacity onPress={() => navigate('TODAY')} className="px-3 py-2 bg-gray-100 rounded-lg">
          <Text className="text-sm font-medium text-gray-700">Today</Text>
        </TouchableOpacity>
        <View className="flex-row border border-gray-300 rounded-lg">
          <TouchableOpacity onPress={() => navigate('PREV')} className="p-2 border-r border-gray-300">
            <ChevronLeft size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate('NEXT')} className="p-2">
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <Text className="text-base font-semibold text-gray-900 ml-2">{getDateLabel()}</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {view !== 'year' && (
          <View className="flex-row border border-gray-300 rounded-lg">
            <TouchableOpacity onPress={() => onLayoutChange('calendar')} className={`p-2 ${layout === 'calendar' ? 'bg-blue-900' : 'bg-white'}`}>
              <CalendarIcon size={20} color={layout === 'calendar' ? '#fff' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onLayoutChange('list')} className={`p-2 border-l border-gray-300 ${layout === 'list' ? 'bg-blue-900' : 'bg-white'}`}>
              <List size={20} color={layout === 'list' ? '#fff' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}