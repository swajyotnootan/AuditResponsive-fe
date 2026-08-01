import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Crown,
    EyeOff,
    List,
    Search,
    UserCheck,
} from "lucide-react-native";
import moment from "moment";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Calendar,
    LocaleConfig,
    WeekCalendar,
} from "react-native-calendars";

import { useAuth } from "../context/AuthContext";
import { buildMarkedDates } from "./CalendarTheme";
import { CalendarEvent, EventFilter, ViewType } from "./CalendarTypes";
import EventList from "./EventList";
import EventModal from "./EventModal";
import { useResponsive } from "./Responsive";
import YearView from "./YearView";

LocaleConfig.locales["en"] = {
  monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
};
LocaleConfig.defaultLocale = "en";

const API_BASE_URL = "${API_BASE_URL}/api";

export default function CalendarView() {
  const { user } = useAuth();
  const responsive = useResponsive();
  const { isMobile, sidebarWidth, fontLarge, fontMedium, fontSmall } = responsive;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [searchText, setSearchText] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [expandedLegend, setExpandedLegend] = useState(true);

  const userRole = useMemo(() => {
    const role = user?.role?.toUpperCase() || "";
    if (["AUDIT_MANAGER", "TOP_MANAGEMENT", "LEAD_AUDITOR", "AUDITEE"].includes(role)) return role;
    return "AUDITOR";
  }, [user]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/audit-schedule/calendar-events?userId=${user?.id}&userRole=${userRole}`);
      const data = await response.json();
      const formatted = (Array.isArray(data) ? data : [])
        .map((event: any) => ({
          ...event,
          start: event.start ? new Date(event.start).toISOString().split("T")[0] : "",
          end: event.end ? new Date(event.end).toISOString().split("T")[0] : "",
          isFullyCompleted: event.status === "COMPLETED" || event.isFullyCompleted,
          isSubmitted: event.status === "SUBMITTED" || event.isSubmitted,
        }))
        .filter((event: CalendarEvent) => event.start);
      setEvents(formatted);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { setShowSidebar(!isMobile); }, [isMobile]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventFilter === "owned" && !event.isOwner) return false;
      if (eventFilter === "attending" && !event.isAttendee) return false;
      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        return event.auditType?.toLowerCase().includes(search) || event.department?.toLowerCase().includes(search);
      }
      return true;
    });
  }, [events, eventFilter, searchText]);

  const markedDates = useMemo(() => buildMarkedDates(filteredEvents), [filteredEvents]);

  const navigateDate = useCallback((direction: "prev" | "next" | "today") => {
    let date = moment(currentDate);
    if (direction === "today") date = moment();
    else if (view === "month") date = direction === "prev" ? date.subtract(1, "month") : date.add(1, "month");
    else if (view === "week") date = direction === "prev" ? date.subtract(1, "week") : date.add(1, "week");
    else if (view === "year") date = direction === "prev" ? date.subtract(1, "year") : date.add(1, "year");
    setCurrentDate(date.format("YYYY-MM-DD"));
  }, [currentDate, view]);

  const getDateLabel = useMemo(() => {
    if (view === "year") return moment(currentDate).format("YYYY");
    if (view === "month") return moment(currentDate).format("MMMM YYYY");
    if (view === "week") return `Week of ${moment(currentDate).startOf("week").format("MMM DD")}`;
    return moment(currentDate).format("MMMM DD, YYYY");
  }, [currentDate, view]);

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
      {/* Mobile Sidebar Modal */}
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
                searchText={searchText} setSearchText={setSearchText}
                eventFilter={eventFilter} setEventFilter={setEventFilter}
                expandedLegend={expandedLegend} setExpandedLegend={setExpandedLegend}
                fontSmall={fontSmall} fontMedium={fontMedium}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Desktop/Tablet Sidebar */}
      {!isMobile && showSidebar && (
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarTitle, { fontSize: fontLarge }]}>Audit Calendar</Text>
          </View>
          <SidebarContent
            searchText={searchText} setSearchText={setSearchText}
            eventFilter={eventFilter} setEventFilter={setEventFilter}
            expandedLegend={expandedLegend} setExpandedLegend={setExpandedLegend}
            fontSmall={fontSmall} fontMedium={fontMedium}
          />
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* ✅ RESPONSIVE TOOLBAR - Wraps on small screens */}
        <View style={styles.toolbar}>
          {/* Row 1: Navigation controls */}
          <View style={styles.toolbarRow1}>
            {isMobile && (
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowSidebar(true)}>
                <List size={22} color="#374151" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.todayButton} onPress={() => navigateDate("today")}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.navArrows}>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateDate("prev")}>
                <ChevronLeft size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navButton, styles.navButtonBorder]} onPress={() => navigateDate("next")}>
                <ChevronRight size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.currentDateText, { fontSize: fontMedium }]} numberOfLines={1}>
              {getDateLabel}
            </Text>
          </View>

          {/* Row 2: View selector (scrollable) */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.viewSelector}
            style={styles.viewSelectorScroll}
          >
            {(["month", "week", "year", "list"] as ViewType[]).map((item) => (
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

        {/* Calendar Content Area */}
        <View style={styles.calendarContainer}>
          {view === "month" && (
            <Calendar
              current={currentDate}
              markingType="multi-dot"
              markedDates={markedDates}
              enableSwipeMonths
              onDayPress={(day: any) => setCurrentDate(day.dateString)}
              onMonthChange={(month: any) => { if (month.dateString !== currentDate) setCurrentDate(month.dateString); }}
              theme={{
                todayTextColor: "#00529B", selectedDayBackgroundColor: "#00529B", arrowColor: "#00529B",
                dotColor: "#00529B", textMonthFontWeight: "700", textDayFontSize: fontSmall, textMonthFontSize: fontMedium,
              }}
              style={styles.calendar}
            />
          )}

          {/* ✅ FIXED WEEK VIEW: Uses currentDate, adds key prop, and proper styling */}
          {view === "week" && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={true}
    contentContainerStyle={{ paddingBottom: 10 }}
  >
    <View style={styles.weekContainer}>
      <WeekCalendar
        current={currentDate}
        markedDates={markedDates}
        firstDay={1}
        onDayPress={(day: any) => setCurrentDate(day.dateString)}
        theme={{
          todayTextColor: "#00529B",
          selectedDayBackgroundColor: "#00529B",
          selectedDayTextColor: "#ffffff",
          arrowColor: "#00529B",
          textDayFontWeight: "500",
          textDayFontSize: fontSmall,
          calendarBackground: "#ffffff",
          backgroundColor: "#ffffff",
        }}
        style={styles.weekCalendar}
      />
    </View>
  </ScrollView>
)}

          {view === "list" && (
            <EventList
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => { setSelectedEvent(event); setShowModal(true); }}
              currentDate={currentDate}
            />
          )}

          {/* ✅ FIXED YEAR VIEW: Matches expected props from YearView.jsx */}
          {view === "year" && (
            <YearView
              date={currentDate}
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => { setSelectedEvent(event); setShowModal(true); }}
              onDateClick={(date: Date) => { setCurrentDate(moment(date).format("YYYY-MM-DD")); setView("month"); }}
              onMonthClick={(date: Date) => { setCurrentDate(moment(date).format("YYYY-MM-DD")); setView("month"); }}
            />
          )}
        </View>
      </View>

      <EventModal
        visible={showModal}
        event={selectedEvent}
        onClose={() => { setShowModal(false); setSelectedEvent(null); }}
        onRefresh={loadEvents}
      />
    </View>
  );
}

// Sidebar Content Component
function SidebarContent({ searchText, setSearchText, eventFilter, setEventFilter, expandedLegend, setExpandedLegend, fontSmall, fontMedium }: any) {
  return (
    <>
      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" />
        <TextInput placeholder="Search audits..." style={[styles.searchInput, { fontSize: fontSmall }]} value={searchText} onChangeText={setSearchText} placeholderTextColor="#9CA3AF" />
      </View>
      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, eventFilter === "all" && styles.filterButtonActive]} onPress={() => setEventFilter("all")}>
          <Text style={[styles.filterText, eventFilter === "all" && styles.filterTextActive, { fontSize: fontSmall }]}>All Audits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, eventFilter === "owned" && styles.filterButtonActive]} onPress={() => setEventFilter("owned")}>
          <Crown size={16} color="#2563EB" />
          <Text style={[styles.filterText, eventFilter === "owned" && styles.filterTextActive, { fontSize: fontSmall }]}>As Auditor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, eventFilter === "attending" && styles.filterButtonActive]} onPress={() => setEventFilter("attending")}>
          <UserCheck size={16} color="#16A34A" />
          <Text style={[styles.filterText, eventFilter === "attending" && styles.filterTextActive, { fontSize: fontSmall }]}>As Auditee</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.legendHeader} onPress={() => setExpandedLegend(!expandedLegend)}>
        <Text style={[styles.legendTitle, { fontSize: fontMedium }]}>Legend</Text>
        {expandedLegend ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
      </TouchableOpacity>
      {expandedLegend && (
        <View style={styles.legendContainer}>
          <LegendItem color="#0EA5E9" title="Scheduled" fontSmall={fontSmall} />
          <LegendItem color="#16A34A" title="Completed" fontSmall={fontSmall} />
          <LegendItem color="#2563EB" title="Submitted" fontSmall={fontSmall} />
          <LegendItem color="#F59E0B" title="Pending Approval" fontSmall={fontSmall} />
          <LegendItem color="#EF4444" title="Rejected / Overdue" fontSmall={fontSmall} />
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

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#F3F4F6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
  loadingText: { marginTop: 16, color: "#4B5563" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-start" },
  sidebar: { backgroundColor: "#FFFFFF", borderRightWidth: 1, borderColor: "#E5E7EB", padding: 16, height: "100%", flexShrink: 0 },
  sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sidebarTitle: { fontWeight: "700", color: "#111827" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 10, marginBottom: 15 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },
  filterContainer: { marginBottom: 20 },
  filterButton: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, marginBottom: 8, backgroundColor: "#F3F4F6" },
  filterButtonActive: { backgroundColor: "#DBEAFE" },
  filterText: { marginLeft: 8, color: "#374151" },
  filterTextActive: { fontWeight: "700", color: "#2563EB" },
  legendHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  legendTitle: { fontWeight: "700", color: "#374151" },
  legendContainer: { marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { color: "#4B5563" },
  mainContent: { flex: 1, overflow: "hidden" },
  
  // ✅ RESPONSIVE TOOLBAR STYLES
  toolbar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingHorizontal: 16, paddingVertical: 12, flexShrink: 0 },
  toolbarRow1: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  iconButton: { padding: 8 },
  todayButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#00529B", borderRadius: 8 },
  todayButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  navArrows: { flexDirection: "row", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8 },
  navButton: { padding: 8 },
  navButtonBorder: { borderLeftWidth: 1, borderColor: "#D1D5DB" },
  currentDateText: { fontWeight: "700", color: "#111827", flexShrink: 1 },
  viewSelectorScroll: { maxHeight: 40 },
  viewSelector: { flexDirection: "row", paddingRight: 16, gap: 8 },
  viewButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  viewButtonActive: { backgroundColor: "#00529B" },
  viewButtonText: { color: "#374151" },
  viewButtonTextActive: { color: "#FFFFFF", fontWeight: "700" },
  
  calendarContainer: { flex: 1, padding: 15 },
  calendar: { borderRadius: 8, elevation: 2 },
  
  // ✅ WEEK VIEW STYLES (Prevents merging)
  weekContainer: {
  width: 900, // Desktop-like width
  backgroundColor: "#ffffff",
  borderRadius: 8,
  overflow: "hidden",
},
  weekCalendar: {
  width: 900,
  height: 110,
},
});