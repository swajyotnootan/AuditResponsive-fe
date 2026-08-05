// CalendarView.tsx - UPDATED with proper event display

import { API_BASE_URL } from '@/config/apiConfig';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Crown, EyeOff, List,
  RefreshCw,
  Search, UserCheck
} from 'lucide-react-native';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, LocaleConfig, WeekCalendar } from 'react-native-calendars';

import { useAuth } from '../context/AuthContext';
import { CalendarEvent, EventFilter, ViewType } from './CalendarTypes';
import { buildMarkedDates, getEventColor, getStatusDisplay, isEventOverdue } from './CalendarUtils';
import EventList from './EventList';
import EventModal from './EventModal';
import { useResponsive } from './Responsive';
import UserAvatar from './UserAvatar';
import YearView from './YearView';

// Configure calendar locale
LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today',
};
LocaleConfig.defaultLocale = 'en';


// Custom component to render events on calendar days
const CustomDay = ({ date, state, marking, onPress }: any) => {
  const isToday = state === 'today';
  const isSelected = state === 'selected';
  const dots = marking?.dots || [];
  const hasEvents = dots.length > 0;

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(date)}
      style={[
        styles.dayContainer,
        isToday && styles.dayToday,
        isSelected && styles.daySelected,
      ]}
    >
      <Text style={[
        styles.dayText,
        isToday && styles.dayTextToday,
        isSelected && styles.dayTextSelected,
        !isToday && !isSelected && styles.dayTextNormal,
      ]}>
        {date.day}
      </Text>
      
      {/* Event dots at bottom */}
      {hasEvents && (
        <View style={styles.dayDotsContainer}>
          {dots.slice(0, 3).map((dot: any, index: number) => (
            <View
              key={index}
              style={[
                styles.dayDot,
                { backgroundColor: dot.color },
                dots.length > 3 && index === 2 && styles.dayDotMore,
              ]}
            />
          ))}
          {dots.length > 3 && (
            <Text style={styles.dayDotMoreText}>+{dots.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Custom event component for calendar
const CalendarEventComponent = ({ event }: any) => {
  const color = getEventColor(event);
  const isOverdue = isEventOverdue(event);
  const isCompleted = event.isFullyCompleted;
  const isSubmitted = event.isSubmitted;
  
  // Get short audit type
  const getShortType = (type: string) => {
    const types: Record<string, string> = {
      '5S Audit': '5S',
      'IATF 16949': 'IATF',
      'Process Audit': 'PRC',
      'Product Audit': 'PRD',
      'ISO 9001': 'ISO',
      'System Audit (ISO9001)': 'ISO',
      'System Audit (IATF16949)': 'IATF',
    };
    return types[type] || type?.substring(0, 3).toUpperCase() || 'AUD';
  };

  let textColor = '#374151';
  if (isOverdue) textColor = '#DC2626';
  else if (isCompleted) textColor = '#059669';
  else if (isSubmitted) textColor = '#3B82F6';

  return (
    <View style={styles.calendarEventContainer}>
      <View style={[styles.calendarEventDot, { backgroundColor: color }]} />
      <Text style={[styles.calendarEventText, { color: textColor }]} numberOfLines={1}>
        {getShortType(event.auditType)}
      </Text>
      {(isCompleted || isSubmitted) && (
        <Text style={styles.calendarEventCheck}>✓</Text>
      )}
    </View>
  );
};

export default function CalendarView() {
  const { user } = useAuth();
  const responsive = useResponsive();
  const { isMobile, sidebarWidth, fontLarge, fontMedium, fontSmall } = responsive;

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [searchText, setSearchText] = useState('');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [expandedLegend, setExpandedLegend] = useState(true);
  const [userRole, setUserRole] = useState<string>('AUDITOR');
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [showDateEventsModal, setShowDateEventsModal] = useState(false);

  // Determine user role
  useEffect(() => {
    const role = user?.role?.toUpperCase() || '';
    if (['AUDIT_MANAGER', 'TOP_MANAGEMENT', 'LEAD_AUDITOR', 'AUDITEE'].includes(role)) {
      setUserRole(role);
    } else {
      setUserRole('AUDITOR');
    }
  }, [user]);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userRoleForAPI = userRole || 'AUDITOR';
      const url = `${API_BASE_URL}/api/audit-schedule/calendar-events?userId=${user?.id || ''}&userRole=${userRoleForAPI}`;
      
      console.log('📡 Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let eventsData = await response.json();
      console.log('📊 Calendar events received:', eventsData?.length || 0);

      const formattedEvents: CalendarEvent[] = [];

      if (Array.isArray(eventsData)) {
        for (const eventData of eventsData) {
          // Skip events without a start date
          if (!eventData.start) {
            console.log(`⏭️ Skipping event without start date:`, eventData.id);
            continue;
          }

          // Parse dates safely
          let startDate, endDate;
          try {
            startDate = new Date(eventData.start);
            if (isNaN(startDate.getTime())) continue;
            
            endDate = eventData.end ? new Date(eventData.end) : new Date(startDate.getTime() + 3600000);
            if (isNaN(endDate.getTime())) {
              endDate = new Date(startDate.getTime() + 3600000);
            }
          } catch (dateErr) {
            console.warn('Date parse error:', dateErr);
            continue;
          }

          // Determine status
          const isFullyCompleted = eventData.status === 'COMPLETED' || eventData.isFullyCompleted === true;
          const isSubmitted = eventData.status === 'SUBMITTED' || eventData.isSubmitted === true;
          
          let displayStatus = eventData.status || 'SCHEDULED';
          if (isFullyCompleted) displayStatus = 'COMPLETED';
          else if (isSubmitted) displayStatus = 'SUBMITTED';

          formattedEvents.push({
            id: eventData.id,
            title: eventData.title || `${eventData.department || 'Audit'} - ${eventData.auditType || 'General'}`,
            auditType: eventData.auditType || 'Audit',
            department: eventData.department || '',
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            startTime: eventData.startTime || '',
            endTime: eventData.endTime || '',
            status: displayStatus,
            description: eventData.description || '',
            isOwner: eventData.isOwner === true,
            isAttendee: eventData.isAttendee === true,
            isCoAuditor: eventData.isCoAuditor === true,
            auditorName: eventData.auditorName || '',
            auditorId: eventData.auditorId || null,
            auditeeName: eventData.auditeeName || '',
            auditeeId: eventData.auditeeId || null,
            coAuditorNames: eventData.coAuditorNames || [],
            coAuditorIdList: eventData.coAuditorIdList || [],
            isDateRange: eventData.isDateRange || false,
            fromDate: eventData.fromDate || null,
            toDate: eventData.toDate || null,
            isFullyCompleted: isFullyCompleted,
            isSubmitted: isSubmitted,
            auditNumber: eventData.auditNumber || '',
            originalScheduledDate: eventData.originalScheduledDate || null,
            rescheduleHistory: eventData.rescheduleHistory || [],
            extensionHistory: eventData.extensionHistory || [],
            pendingReschedule: eventData.pendingReschedule || false,
            pendingExtension: eventData.pendingExtension || false,
          });
        }
      }

      setEvents(formattedEvents);
      console.log('✅ Total events loaded:', formattedEvents.length);

    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userRole]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
  }, [loadEvents]);

  // Handle day press - show events for that day
  const handleDayPress = useCallback((day: any) => {
    const dateStr = day.dateString;
    setCurrentDate(dateStr);
    
    // Get events for this date
    const dayEvents = events.filter(event => {
      const eventDate = event.start;
      return eventDate === dateStr;
    });
    
    if (dayEvents.length > 0) {
      setSelectedDateEvents(dayEvents);
      setShowDateEventsModal(true);
    }
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Search filter
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        const matchTitle = event.auditType?.toLowerCase().includes(search);
        const matchDept = event.department?.toLowerCase().includes(search);
        if (!matchTitle && !matchDept) return false;
      }

      // Filter by ownership
      if (eventFilter === 'owned' && !event.isOwner) return false;
      if (eventFilter === 'attending' && !event.isAttendee) return false;

      return true;
    });
  }, [events, searchText, eventFilter]);

  // Marked dates for calendar
  const markedDates = useMemo(() => buildMarkedDates(filteredEvents), [filteredEvents]);

  // Navigation functions
  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    let date = moment(currentDate);
    if (direction === 'today') {
      date = moment();
    } else if (view === 'month') {
      date = direction === 'prev' ? date.subtract(1, 'month') : date.add(1, 'month');
    } else if (view === 'week') {
      date = direction === 'prev' ? date.subtract(1, 'week') : date.add(1, 'week');
    } else if (view === 'year') {
      date = direction === 'prev' ? date.subtract(1, 'year') : date.add(1, 'year');
    } else {
      date = direction === 'prev' ? date.subtract(1, 'day') : date.add(1, 'day');
    }
    setCurrentDate(date.format('YYYY-MM-DD'));
  }, [currentDate, view]);

  // Date label
  const getDateLabel = useMemo(() => {
    if (view === 'year') return moment(currentDate).format('YYYY');
    if (view === 'month') return moment(currentDate).format('MMMM YYYY');
    if (view === 'week') return `Week of ${moment(currentDate).startOf('week').format('MMM DD')}`;
    return moment(currentDate).format('MMMM DD, YYYY');
  }, [currentDate, view]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00529B" />
        <Text style={[styles.loadingText, { fontSize: fontMedium }]}>Loading your audit calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar - Mobile Modal */}
      {isMobile && showSidebar && (
        <Modal transparent animationType="slide" visible={showSidebar} onRequestClose={() => setShowSidebar(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.sidebar, { width: sidebarWidth }]}>
              <View style={styles.sidebarHeader}>
                <Text style={[styles.sidebarTitle, { fontSize: fontLarge }]}>Audit Calendar</Text>
                <TouchableOpacity onPress={() => setShowSidebar(false)}>
                  <EyeOff size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <SidebarContent
                searchText={searchText}
                setSearchText={setSearchText}
                eventFilter={eventFilter}
                setEventFilter={setEventFilter}
                expandedLegend={expandedLegend}
                setExpandedLegend={setExpandedLegend}
                fontSmall={fontSmall}
                fontMedium={fontMedium}
                onRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Sidebar - Desktop */}
      {!isMobile && showSidebar && (
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarTitle, { fontSize: fontLarge }]}>Audit Calendar</Text>
          </View>
          <SidebarContent
            searchText={searchText}
            setSearchText={setSearchText}
            eventFilter={eventFilter}
            setEventFilter={setEventFilter}
            expandedLegend={expandedLegend}
            setExpandedLegend={setExpandedLegend}
            fontSmall={fontSmall}
            fontMedium={fontMedium}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarRow1}>
            {isMobile && (
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowSidebar(true)}>
                <List size={22} color="#374151" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.todayButton} onPress={() => navigateDate('today')}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.navArrows}>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateDate('prev')}>
                <ChevronLeft size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navButton, styles.navButtonBorder]} onPress={() => navigateDate('next')}>
                <ChevronRight size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.currentDateText, { fontSize: fontMedium }]} numberOfLines={1}>
              {getDateLabel}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.viewSelector} style={styles.viewSelectorScroll}>
            {(['month', 'week', 'year', 'list'] as ViewType[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.viewButton, view === item && styles.viewButtonActive]}
                onPress={() => setView(item)}
              >
                <Text style={[styles.viewButtonText, view === item && styles.viewButtonTextActive, { fontSize: fontSmall }]}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Calendar Content */}
        <View style={styles.calendarContainer}>
          {view === 'month' && (
            <Calendar
              current={currentDate}
              markingType="multi-dot"
              markedDates={markedDates}
              enableSwipeMonths
              onDayPress={handleDayPress}
              onMonthChange={(month: any) => {
                if (month.dateString !== currentDate) setCurrentDate(month.dateString);
              }}
              theme={{
                todayTextColor: '#00529B',
                selectedDayBackgroundColor: '#00529B',
                selectedDayTextColor: '#FFFFFF',
                arrowColor: '#00529B',
                textMonthFontWeight: '700',
                textDayFontSize: fontSmall,
                textMonthFontSize: fontMedium,
                calendarBackground: '#FFFFFF',
                backgroundColor: '#FFFFFF',
                'stylesheet.calendar.header': {
                  week: {
                    marginTop: 7,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                  },
                },
                'stylesheet.day.basic': {
                  dayContainer: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 4,
                  },
                },
              }as any}
              style={styles.calendar}
            />
          )}

          {view === 'week' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 10 }}>
              <View style={styles.weekContainer}>
                <WeekCalendar
                  current={currentDate}
                  markedDates={markedDates}
                  firstDay={1}
                  onDayPress={handleDayPress}
                  theme={{
                    todayTextColor: '#00529B',
                    selectedDayBackgroundColor: '#00529B',
                    selectedDayTextColor: '#FFFFFF',
                    arrowColor: '#00529B',
                    textDayFontWeight: '500',
                    textDayFontSize: fontSmall,
                    calendarBackground: '#FFFFFF',
                    backgroundColor: '#FFFFFF',
                    'stylesheet.week': {
                      week: {
                        flexDirection: 'row',
                        justifyContent: 'space-around',
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      },
                    },
                  }as any}
                  style={styles.weekCalendar}
                />
              </View>
            </ScrollView>
          )}

          {view === 'list' && (
            <EventList
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => {
                setSelectedEvent(event);
                setShowModal(true);
              }}
              currentDate={currentDate}
            />
          )}

          {view === 'year' && (
            <YearView
              date={currentDate}
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => {
                setSelectedEvent(event);
                setShowModal(true);
              }}
              onDateClick={(date: Date) => {
                setCurrentDate(moment(date).format('YYYY-MM-DD'));
                setView('month');
              }}
              onMonthClick={(date: Date) => {
                setCurrentDate(moment(date).format('YYYY-MM-DD'));
                setView('month');
              }}
            />
          )}
        </View>
      </View>

      {/* Date Events Modal - Shows all events for a selected day */}
      <Modal
        visible={showDateEventsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateEventsModal(false)}
      >
        <View style={styles.dateEventsOverlay}>
          <View style={styles.dateEventsModal}>
            <View style={styles.dateEventsHeader}>
              <Text style={styles.dateEventsTitle}>
                {moment(currentDate).format('dddd, MMMM DD, YYYY')}
              </Text>
              <TouchableOpacity onPress={() => setShowDateEventsModal(false)} style={styles.dateEventsClose}>
                <Text style={{ color: '#6B7280', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dateEventsList}>
              {selectedDateEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.dateEventCard}
                  onPress={() => {
                    setShowDateEventsModal(false);
                    setSelectedEvent(event);
                    setShowModal(true);
                  }}
                >
                  <View style={[styles.dateEventDot, { backgroundColor: getEventColor(event) }]} />
                  <View style={styles.dateEventContent}>
                    <Text style={styles.dateEventTitle}>{event.auditType}</Text>
                    <Text style={styles.dateEventDept}>{event.department}</Text>
                    <View style={styles.dateEventMeta}>
                      <Text style={styles.dateEventTime}>
                        {event.startTime} - {event.endTime}
                      </Text>
                      <Text style={[styles.dateEventStatus, 
                        event.isFullyCompleted && styles.statusCompleted,
                        event.isSubmitted && styles.statusSubmitted,
                      ]}>
                        {getStatusDisplay(event)}
                      </Text>
                    </View>
                    {/* Show auditor with avatar */}
                    <UserAvatar 
                      userId={event.auditorId} 
                      userName={event.auditorName} 
                      size="xs" 
                      showName={true} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
              {selectedDateEvents.length === 0 && (
                <View style={styles.dateEventsEmpty}>
                  <Text style={styles.dateEventsEmptyText}>No events on this day</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Modal */}
      <EventModal
        visible={showModal}
        event={selectedEvent}
        onClose={() => {
          setShowModal(false);
          setSelectedEvent(null);
        }}
        onRefresh={loadEvents}
      />
    </View>
  );
}

// Sidebar Content Component
function SidebarContent({ 
  searchText, setSearchText, 
  eventFilter, setEventFilter,
  expandedLegend, setExpandedLegend,
  fontSmall, fontMedium,
  onRefresh, refreshing
}: any) {
  return (
    <>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Search audits..."
          style={[styles.searchInput, { fontSize: fontSmall }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Refresh Button */}
      <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} disabled={refreshing}>
        <RefreshCw size={18} color={refreshing ? '#9CA3AF' : '#00529B'} />
        <Text style={[styles.refreshText, { fontSize: fontSmall }]}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </TouchableOpacity>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, eventFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setEventFilter('all')}
        >
          <Text style={[styles.filterText, eventFilter === 'all' && styles.filterTextActive, { fontSize: fontSmall }]}>
            All Audits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, eventFilter === 'owned' && styles.filterButtonActive]}
          onPress={() => setEventFilter('owned')}
        >
          <Crown size={16} color="#2563EB" />
          <Text style={[styles.filterText, eventFilter === 'owned' && styles.filterTextActive, { fontSize: fontSmall }]}>
            As Auditor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, eventFilter === 'attending' && styles.filterButtonActive]}
          onPress={() => setEventFilter('attending')}
        >
          <UserCheck size={16} color="#16A34A" />
          <Text style={[styles.filterText, eventFilter === 'attending' && styles.filterTextActive, { fontSize: fontSmall }]}>
            As Auditee
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <TouchableOpacity style={styles.legendHeader} onPress={() => setExpandedLegend(!expandedLegend)}>
        <Text style={[styles.legendTitle, { fontSize: fontMedium }]}>Legend</Text>
        {expandedLegend ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
      </TouchableOpacity>

      {expandedLegend && (
        <View style={styles.legendContainer}>
          <LegendItem color="#0EA5E9" title="Scheduled" fontSmall={fontSmall} />
          <LegendItem color="#059669" title="Completed" fontSmall={fontSmall} />
          <LegendItem color="#3B82F6" title="Submitted (Pending Approval)" fontSmall={fontSmall} />
          <LegendItem color="#F59E0B" title="Pending Schedule Approval" fontSmall={fontSmall} />
          <LegendItem color="#EF4444" title="Overdue / Rejected" fontSmall={fontSmall} />
          <LegendItem color="#8B5CF6" title="Date Range" fontSmall={fontSmall} />
        </View>
      )}
    </>
  );
}

function LegendItem({ color, title, fontSmall }: { color: string; title: string; fontSmall: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { fontSize: fontSmall }]}>{title}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 16, color: '#4B5563' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  
  sidebar: { backgroundColor: '#FFFFFF', borderRightWidth: 1, borderColor: '#E5E7EB', padding: 16, height: '100%', flexShrink: 0 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sidebarTitle: { fontWeight: '700', color: '#111827' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },
  
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginBottom: 12, backgroundColor: '#EFF6FF', borderRadius: 8 },
  refreshText: { color: '#00529B', marginLeft: 8, fontWeight: '500' },
  
  filterContainer: { marginBottom: 20 },
  filterButton: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: '#F3F4F6' },
  filterButtonActive: { backgroundColor: '#DBEAFE' },
  filterText: { marginLeft: 8, color: '#374151' },
  filterTextActive: { fontWeight: '700', color: '#2563EB' },
  
  legendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  legendTitle: { fontWeight: '700', color: '#374151' },
  legendContainer: { marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { color: '#4B5563' },
  
  mainContent: { flex: 1, overflow: 'hidden' },
  
  toolbar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12, flexShrink: 0 },
  toolbarRow1: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  iconButton: { padding: 8 },
  todayButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#00529B', borderRadius: 8 },
  todayButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  navArrows: { flexDirection: 'row', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  navButton: { padding: 8 },
  navButtonBorder: { borderLeftWidth: 1, borderColor: '#D1D5DB' },
  currentDateText: { fontWeight: '700', color: '#111827', flexShrink: 1 },
  viewSelectorScroll: { maxHeight: 40 },
  viewSelector: { flexDirection: 'row', paddingRight: 16, gap: 8 },
  viewButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  viewButtonActive: { backgroundColor: '#00529B' },
  viewButtonText: { color: '#374151' },
  viewButtonTextActive: { color: '#FFFFFF', fontWeight: '700' },
  
  calendarContainer: { flex: 1, padding: 15 },
  calendar: { borderRadius: 8, elevation: 2 },
  
  weekContainer: { width: 900, backgroundColor: '#ffffff', borderRadius: 8, overflow: 'hidden' },
  weekCalendar: { width: 900, height: 110 },

  // Calendar Day Styles
  dayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 40,
    borderRadius: 8,
  },
  dayToday: {
    backgroundColor: 'rgba(0, 82, 155, 0.1)',
    borderWidth: 1,
    borderColor: '#00529B',
  },
  daySelected: {
    backgroundColor: '#00529B',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayTextNormal: {
    color: '#1F2937',
  },
  dayTextToday: {
    color: '#00529B',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
    height: 12,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayDotMore: {
    width: 8,
    height: 6,
    borderRadius: 3,
  },
  dayDotMoreText: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Calendar Event Styles
  calendarEventContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  calendarEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  calendarEventText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  calendarEventCheck: {
    fontSize: 10,
    color: '#10B981',
    flexShrink: 0,
  },

  // Date Events Modal
  dateEventsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateEventsModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dateEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dateEventsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dateEventsClose: {
    padding: 8,
  },
  dateEventsList: {
    padding: 16,
  },
  dateEventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  dateEventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 2,
  },
  dateEventContent: {
    flex: 1,
  },
  dateEventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dateEventDept: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dateEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dateEventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateEventStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusSubmitted: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  dateEventsEmpty: {
    padding: 32,
    alignItems: 'center',
  },
  dateEventsEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});