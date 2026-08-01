import { Calendar as CalendarIcon, Clock, Tag } from 'lucide-react-native';
import moment from 'moment';
import React from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EventList({ events, onEventClick }: any) {
  const groupedEvents = events.reduce((acc: any, event: any) => {
    const dateKey = event.start || 'Unknown';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const sections = Object.keys(groupedEvents).sort().map(date => ({
    title: date,
    data: groupedEvents[date]
  }));

  const formatDate = (dateStr: string) => {
    const eventDate = moment(dateStr);
    const today = moment();
    if (eventDate.isSame(today, 'day')) return 'Today';
    if (eventDate.isSame(today.clone().add(1, 'day'), 'day')) return 'Tomorrow';
    return eventDate.format('dddd, MMMM D, YYYY');
  };

  const renderItem = ({ item }: any) => {
    const isPast = moment(item.start).isBefore(moment(), 'day');
    const dotColor = item.isFullyCompleted ? '#059669' : item.isSubmitted ? '#3b82f6' : item.status === 'PENDING_APPROVAL' ? '#f59e0b' : '#0ea5e9';

    return (
      <TouchableOpacity 
        onPress={() => onEventClick(item)}
        style={[
          styles.eventCard,
          isPast ? styles.eventCardPast : styles.eventCardActive
        ]}
        activeOpacity={0.7}
      >
        <View style={[styles.dotIndicator, { backgroundColor: dotColor }]} />
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, isPast && styles.textPast]} numberOfLines={1}>
              {item.auditType || 'Audit'}
            </Text>
            <View style={styles.timeBadge}>
              <Clock size={12} color="#6b7280" />
              <Text style={styles.timeText}>{item.startTime || '09:00 AM'} - {item.endTime || '10:00 AM'}</Text>
            </View>
          </View>
          <View style={styles.eventDetails}>
            {item.department && (
              <View style={styles.detailRow}>
                <Tag size={14} color="#9ca3af" />
                <Text style={styles.detailText}>{item.department}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarIcon size={48} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No events found</Text>
        <Text style={styles.emptyText}>No audits match your current filters.</Text>
      </View>
);
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => item.id || index.toString()}
      renderItem={renderItem}
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{formatDate(title)}</Text>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionCount}>{groupedEvents[title].length} events</Text>
        </View>
      )}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
}

const styles = StyleSheet.create({
  eventCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  eventCardActive: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  eventCardPast: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', opacity: 0.75 },
  dotIndicator: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
  eventContent: { flex: 1 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1 },
  textPast: { color: '#4b5563' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  timeText: { fontSize: 12, fontWeight: '500', color: '#374151', marginLeft: 4 },
  eventDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailText: { fontSize: 14, color: '#6b7280', marginLeft: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sectionHeaderText: { fontSize: 14, fontWeight: '600', color: '#1e3a8a', marginRight: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  sectionCount: { fontSize: 12, color: '#6b7280', marginLeft: 12 }
});