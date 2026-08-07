// CalendarView.tsx - UPDATED with proper event display

import { API_BASE_URL } from "@/config/apiConfig";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  EyeOff,
  List,
  RefreshCw,
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
import { Calendar, LocaleConfig } from "react-native-calendars";
import { useAuth } from "../context/AuthContext";
import { CalendarEvent, EventFilter, ViewType } from "./CalendarTypes";
import {
  buildMarkedDates,
  getEventColor,
  getRescheduleInfo,
  getStatusDisplay,
  isEventOverdue,
} from "./CalendarUtils";
import EventList from "./EventList";
import EventModal from "./EventModal";
import { useResponsive } from "./Responsive";
import UserAvatar from "./UserAvatar";
import YearView from "./YearView";

// Configure calendar locale
LocaleConfig.locales["en"] = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
};
LocaleConfig.defaultLocale = "en";

const WEEK_START_HOUR = 6; // 6 AM
const WEEK_END_HOUR = 19; // 7 PM
const HOUR_HEIGHT = 50;
const parseTimeToHours = (timeStr: string): number => {
  if (!timeStr) return 9;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const p = match[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h + m / 60;
  }
  const m24 = timeStr.match(/(\d+):(\d+)/);
  if (m24) return parseInt(m24[1]) + parseInt(m24[2]) / 60;
  return 9;
};

// ✅ ADD THIS: Helper to normalize department names for Lead Auditor filtering
const normalizeDepartmentForFilter = (dept: any): string => {
  if (!dept) return "";
  let deptStr = String(dept).toUpperCase().trim();
  const deptMap: Record<string, string> = {
    HR: "HR",
    "R&D": "ENGG",
    ENGINEERING: "ENGG",
    "R AND D": "ENGG",
    PURCHASE: "PURCHASE",
    RMS: "STORES_DESPATCH",
    SQA: "QA",
    PPC: "PPC",
    PRODUCTION: "PRODUCTION",
    "QA/QC": "QA",
    QA: "QA",
    QC: "QA",
    FGS: "STORES_DESPATCH",
    MARKETING: "MARKETING",
    "IMS (BE)": "MR",
    "IMS(BE)": "MR",
    IMS: "MR",
    MAINTENANCE: "PLANT_MAINTENANCE",
    MANAGEMENT: "UNIT_HEAD",
    "PLANT MAINTENANCE": "PLANT_MAINTENANCE",
    "TOOL MAINTENANCE": "TOOL_MAINTENANCE",
    "TOOL MANAGEMENT": "TOOL_MAINTENANCE",
    "STORES & DESPATCH": "STORES_DESPATCH",
    STORES: "STORES_DESPATCH",
    DESPATCH: "STORES_DESPATCH",
    "UNIT HEAD": "UNIT_HEAD",
    MR: "MR",
  };
  return deptMap[deptStr] || deptStr;
};
// ✅ Split overlapping events into side-by-side columns
// ✅ Group events by time slot and limit display
const groupEventsByTimeSlot = (dayEvents: CalendarEvent[]) => {
  const sorted = [...dayEvents].sort(
    (a, b) => parseTimeToHours(a.startTime) - parseTimeToHours(b.startTime),
  );

  const groups: { events: CalendarEvent[]; startH: number; endH: number }[] =
    [];

  sorted.forEach((event) => {
    const startH = parseTimeToHours(event.startTime);
    const endH = Math.max(startH + 0.5, parseTimeToHours(event.endTime));

    // Find overlapping group
    const existingGroup = groups.find(
      (g) => startH < g.endH && endH > g.startH,
    );

    if (existingGroup) {
      existingGroup.events.push(event);
      existingGroup.endH = Math.max(existingGroup.endH, endH);
    } else {
      groups.push({ events: [event], startH, endH });
    }
  });

  return groups;
};

const CustomDay = ({ date, state, marking, onPress }: any) => {
  const isToday = state === "today";
  const isSelected = state === "selected";
  const isDisabled = state === "disabled";
  const dots = marking?.dots || [];
  const hasEvents = dots.length > 0;

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(date)}
      disabled={isDisabled}
      style={[
        styles.dayContainer,
        isToday && styles.dayToday,
        isSelected && styles.daySelected,
        hasEvents && !isSelected && styles.dayWithEvents,
        // ✅ Add margin for better spacing
        {
          marginHorizontal: 2,
        },
      ]}
    >
      <Text
        style={[
          styles.dayText,
          isToday && styles.dayTextToday,
          isSelected && styles.dayTextSelected,
          hasEvents && !isSelected && styles.dayTextWithEvents,
          !isToday && !isSelected && styles.dayTextNormal,
          isDisabled && styles.dayTextDisabled,
        ]}
      >
        {date.day}
      </Text>

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

// ✅ NEW: Helper to get the first valid, non-empty string
const getValidString = (...values: any[]) => {
  for (const val of values) {
    if (
      val &&
      typeof val === "string" &&
      val.trim() !== "" &&
      val.toLowerCase() !== "null" &&
      val.toLowerCase() !== "undefined" &&
      val.toLowerCase() !== "n/a"
    ) {
      return val.trim();
    }
  }
  return "Unassigned";
};

// ✅ IMPROVED: Parser handles different bullet styles (•, -, *) and extra spaces
const parseFromDescription = (description: string, field: string) => {
  if (!description) return null;
  const regex = new RegExp(
    `(?:[•\\-\\*]\\s*)?${field}:\\s*([^\\n•\\-\\*]+)`,
    "i",
  );
  const match = description.match(regex);
  if (match) {
    const value = match[1].trim();
    if (value && value.length > 0) {
      return value;
    }
  }
  return null;
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
      "5S Audit": "5S",
      "IATF 16949": "IATF",
      "Process Audit": "PRC",
      "Product Audit": "PRD",
      "ISO 9001": "ISO",
      "System Audit (ISO9001)": "ISO",
      "System Audit (IATF16949)": "IATF",
    };
    return types[type] || type?.substring(0, 3).toUpperCase() || "AUD";
  };

  let textColor = "#374151";
  if (isOverdue) textColor = "#DC2626";
  else if (isCompleted) textColor = "#059669";
  else if (isSubmitted) textColor = "#3B82F6";

  return (
    <View style={styles.calendarEventContainer}>
      <View style={[styles.calendarEventDot, { backgroundColor: color }]} />
      <Text
        style={[styles.calendarEventText, { color: textColor }]}
        numberOfLines={1}
      >
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
  const { isMobile, sidebarWidth, fontLarge, fontMedium, fontSmall } =
    responsive;

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [searchText, setSearchText] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [expandedLegend, setExpandedLegend] = useState(true);
  const [userRole, setUserRole] = useState<string>("AUDITOR");
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>(
    [],
  );
  const [showDateEventsModal, setShowDateEventsModal] = useState(false);
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState<
    string | null
  >(null);
  const getApiRole = useCallback(() => {
    const role = (user?.role || "").toUpperCase();

    if (
      ["AUDIT_MANAGER", "TOP_MANAGEMENT", "LEAD_AUDITOR", "AUDITEE"].includes(
        role,
      )
    ) {
      return role;
    }

    return "AUDITOR";
  }, [user]);

  // ✅ ADD THIS: Fetch Lead Auditor's department to filter schedules
  const fetchLeadAuditorDepartment = useCallback(async () => {
    const role = getApiRole(); // Use getApiRole to avoid race conditions
    if (role !== "LEAD_AUDITOR" || !user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const userData = await response.json();
        let department =
          userData.department ||
          userData.departmentName ||
          userData.departmentCode;

        if (typeof department === "object" && department !== null) {
          department = department.displayName || department.name;
        }

        if (department) {
          const normalizedDept = normalizeDepartmentForFilter(department);
          console.log(
            "🎯 Lead Auditor Department:",
            department,
            "→ Normalized:",
            normalizedDept,
          );
          setLeadAuditorDepartment(normalizedDept);
        }
      }
    } catch (error) {
      console.error("Error fetching lead auditor department:", error);
    }
  }, [getApiRole, user]);

  // ✅ ADD THIS: Trigger fetch when role is determined
  useEffect(() => {
    if (getApiRole() === "LEAD_AUDITOR") {
      fetchLeadAuditorDepartment();
    }
  }, [getApiRole, fetchLeadAuditorDepartment]);

  // Determine user role
  useEffect(() => {
    const role = user?.role?.toUpperCase() || "";
    if (
      ["AUDIT_MANAGER", "TOP_MANAGEMENT", "LEAD_AUDITOR", "AUDITEE"].includes(
        role,
      )
    ) {
      setUserRole(role);
    } else {
      setUserRole("AUDITOR");
    }
  }, [user]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setEvents([]);
        return;
      }

      // ✅ Fix role race condition
      const userRoleForAPI = getApiRole();

      console.log("👤 Current user:", user);
      console.log("👤 Current role for API:", userRoleForAPI);

      const commonHeaders = {
        "Content-Type": "application/json",
        "User-ID": String(user?.id || ""),
        "User-Email": user?.email || "", // ✅ missing in your RN code
      };

      // ✅ Step 1: Fetch schedules based on role
      let url: string;

      if (userRoleForAPI === "AUDITOR") {
        url = `${API_BASE_URL}/api/audit-schedule/auditor/${user.id}/schedules-with-status`;
      } else {
        url = `${API_BASE_URL}/api/audit-schedule/year/${new Date().getFullYear()}`;
      }

      console.log("📡 Fetching schedules from:", url);

      const response = await fetch(url, {
        headers: commonHeaders,
      });

      if (!response.ok) {
        throw new Error(`Schedule API failed with status ${response.status}`);
      }

      // ✅ Step 2: Fetch template responses
      const responsesResponse = await fetch(
        `${API_BASE_URL}/api/templates/responses/all`,
        {
          headers: commonHeaders,
        },
      );

      if (!responsesResponse.ok) {
        console.warn(
          "⚠️ Template responses API failed:",
          responsesResponse.status,
        );
      }

      const allResponses = await responsesResponse.json();

      // ✅ Step 3: Create completion map
      // Use string keys to avoid number/string mismatch
      const auditCompletionMap = new Map<
        string,
        {
          status: string;
          isFullyCompleted: boolean;
          isSubmitted: boolean;
        }
      >();

      if (Array.isArray(allResponses)) {
        allResponses.forEach((res: any) => {
          const scheduleId = String(res?.auditScheduleId ?? "");

          if (!scheduleId) return;

          auditCompletionMap.set(scheduleId, {
            status: res?.status || "",
            isFullyCompleted: res?.status === "APPROVED",
            isSubmitted: res?.status === "SUBMITTED",
          });
        });
      }

      console.log("✅ Completion map size:", auditCompletionMap.size);

      // ✅ Step 4: Parse schedules
      let allSchedules = await response.json();
      if (userRoleForAPI === "LEAD_AUDITOR" && leadAuditorDepartment) {
        allSchedules = allSchedules.filter((schedule: any) => {
          const scheduleDept = normalizeDepartmentForFilter(
            schedule?.department,
          );
          return scheduleDept === leadAuditorDepartment;
        });
      }

      // Auditor endpoint may return { schedule: {...} }
      if (
        userRoleForAPI === "AUDITOR" &&
        Array.isArray(allSchedules) &&
        allSchedules.length > 0 &&
        allSchedules[0]?.schedule
      ) {
        allSchedules = allSchedules
          .map((item: any) => item.schedule)
          .filter(Boolean);
      }

      if (!Array.isArray(allSchedules)) {
        allSchedules = [];
      }

      // ✅ Step 5: Filter by role
      let filteredSchedules: any[] = [];

      if (userRoleForAPI === "AUDITEE") {
        filteredSchedules = allSchedules.filter(
          (s: any) => s && String(s?.auditeeId) === String(user.id),
        );
      } else {
        filteredSchedules = allSchedules;
      }

      console.log("📊 Filtered schedules count:", filteredSchedules.length);

      const formattedEvents: any[] = [];

      // ✅ Step 6: Format events
      for (const audit of filteredSchedules) {
        if (!audit?.id) continue;

        // ✅ Important: use string key
        const completionInfo = auditCompletionMap.get(String(audit.id));

        const isFullyCompleted = completionInfo?.isFullyCompleted === true;
        const isSubmitted = completionInfo?.isSubmitted === true;

        // ✅ Same status priority as React Web
        let displayStatus: string;

        if (isFullyCompleted) {
          displayStatus = "COMPLETED";
        } else if (isSubmitted) {
          displayStatus = "SUBMITTED";
        } else {
          displayStatus =
            audit.detailedApprovalStatus || audit.approvalStatus || "SCHEDULED";
        }

        // ✅ Parse co-auditors
        let coAuditorIdList: any[] = [];
        let isCoAuditor = false;

        if (
          audit.coAuditorIds &&
          audit.coAuditorIds !== "null" &&
          audit.coAuditorIds !== "[]"
        ) {
          try {
            let parsedCoIds: any[] = [];

            if (Array.isArray(audit.coAuditorIds)) {
              parsedCoIds = audit.coAuditorIds;
            } else if (typeof audit.coAuditorIds === "string") {
              if (audit.coAuditorIds.trim().startsWith("[")) {
                parsedCoIds = JSON.parse(audit.coAuditorIds);
              } else {
                parsedCoIds = audit.coAuditorIds
                  .split(",")
                  .map((id: string) => id.trim())
                  .filter(Boolean);
              }
            }

            coAuditorIdList = parsedCoIds;

            isCoAuditor = coAuditorIdList.map(String).includes(String(user.id));
          } catch (error) {
            console.error(
              "Error parsing coAuditorIds for audit:",
              audit.id,
              error,
            );
          }
        }

        const isOwner = String(audit?.auditorId ?? "") === String(user.id);
        const isAttendee = String(audit?.auditeeId ?? "") === String(user.id);

        const userRelationship = isOwner
          ? "owner"
          : isCoAuditor
            ? "co_auditor"
            : isAttendee
              ? "attendee"
              : "none";

        const baseEvent = {
          title:
            audit.title ||
            `${audit.department || "Audit"} - ${audit.auditType || "General"}`,

          auditType: audit.auditType || "Audit",
          department: audit.department || "",

          startTime: audit.startTime || "",
          endTime: audit.endTime || "",

          status: displayStatus,
          isOverdue: false,

          description: audit.auditObjective || "",

          isOwner,
          isAttendee,
          isCoAuditor,
          userRelationship,

          auditorName: audit.auditorName || "Unassigned",
          auditorId: audit.auditorId ?? null,

          auditeeName: audit.auditeeName || "Unassigned",
          auditeeId: audit.auditeeId ?? null,

          coAuditorNames: Array.isArray(audit.coAuditorNames)
            ? audit.coAuditorNames
            : [],

          coAuditorIdList,

          isFullyCompleted,
          isSubmitted,

          auditNumber: audit.auditNumber || "",

          originalScheduledDate: audit.originalScheduledDate || null,
          rescheduleHistory: audit.rescheduleHistory || [],
          extensionHistory: audit.extensionHistory || [],

          pendingReschedule: audit.pendingReschedule || false,
          pendingExtension: audit.pendingExtension || false,
        };

        const isDateRange = Boolean(
          audit.fromDate && audit.toDate && audit.fromDate !== audit.toDate,
        );

        if (isDateRange) {
          const fromMoment = moment(audit.fromDate);
          const toMoment = moment(audit.toDate);

          if (fromMoment.isValid() && toMoment.isValid()) {
            const current = fromMoment.clone();

            // ✅ Create one event per day for calendar rendering
            while (current.isSameOrBefore(toMoment)) {
              const dateStr = current.format("YYYY-MM-DD");

              formattedEvents.push({
                ...baseEvent,

                // ✅ unique ID per day avoids duplicate key issues
                id: `${audit.id}_${dateStr}`,

                // ✅ keep original audit ID for grouping/deduplication
                originalAuditId: audit.id,

                start: dateStr,
                end: dateStr,

                isDateRange: true,
                fromDate: fromMoment.format("YYYY-MM-DD"),
                toDate: toMoment.format("YYYY-MM-DD"),
              });

              current.add(1, "day");
            }
          }
        } else if (audit.scheduledDate) {
          const dateStr = moment(audit.scheduledDate).format("YYYY-MM-DD");

          formattedEvents.push({
            ...baseEvent,

            id: audit.id,
            originalAuditId: audit.id,

            start: dateStr,
            end: dateStr,

            isDateRange: false,
            fromDate: null,
            toDate: null,
          });
        }
      }

      // ✅ Compute overdue only after final status is set
      const finalEvents = formattedEvents.map((evt) => ({
        ...evt,
        isOverdue: isEventOverdue(evt),
      }));

      setEvents(finalEvents);

      console.log("✅ Final events loaded:", finalEvents.length);
    } catch (err) {
      console.error("❌ Error loading events:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, getApiRole, leadAuditorDepartment]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
  }, [loadEvents]);

  const handleDayPress = useCallback(
    (day: any) => {
      const dateStr = day.dateString;

      setCurrentDate(dateStr);

      const dayEvents = events.filter((event) => {
        return event.start === dateStr;
      });

      const seenIds = new Set<string | number>();

      const uniqueEvents = dayEvents.filter((evt) => {
        const uniqueKey = evt.originalAuditId ?? evt.id;

        if (seenIds.has(uniqueKey)) {
          return false;
        }

        seenIds.add(uniqueKey);
        return true;
      });

      if (uniqueEvents.length > 0) {
        setSelectedDateEvents(uniqueEvents);
        setShowDateEventsModal(true);
      }
    },
    [events],
  );

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
      if (eventFilter === "owned" && !event.isOwner && !event.isCoAuditor) {
        return false;
      }
      if (eventFilter === "attending" && !event.isAttendee) return false;

      return true;
    });
  }, [events, searchText, eventFilter]);

  const weekDays = useMemo(() => {
    const start = moment(currentDate).startOf("week");
    return Array.from({ length: 7 }, (_, i) => start.clone().add(i, "day"));
  }, [currentDate]);

  const gridDays = useMemo(() => {
    if (view === "day") return [moment(currentDate)];
    return weekDays;
  }, [view, weekDays]);

  const getWeekDayEvents = useCallback(
    (day: moment.Moment) => {
      const dateStr = day.format("YYYY-MM-DD");
      // ✅ ONLY start-date match — no isDateRange branch (that caused duplicates)
      return filteredEvents.filter((e) => e.start === dateStr);
    },
    [filteredEvents],
  );

  // Marked dates for calendar
  const markedDates = useMemo(
    () => buildMarkedDates(filteredEvents),
    [filteredEvents],
  );

  // Navigation functions
  const navigateDate = useCallback(
    (direction: "prev" | "next" | "today") => {
      let date = moment(currentDate);
      if (direction === "today") {
        date = moment();
      } else if (view === "month") {
        date =
          direction === "prev"
            ? date.subtract(1, "month")
            : date.add(1, "month");
      } else if (view === "week") {
        date =
          direction === "prev" ? date.subtract(1, "week") : date.add(1, "week");
      } else if (view === "year") {
        date =
          direction === "prev" ? date.subtract(1, "year") : date.add(1, "year");
      } else {
        date =
          direction === "prev" ? date.subtract(1, "day") : date.add(1, "day");
      }
      setCurrentDate(date.format("YYYY-MM-DD"));
    },
    [currentDate, view],
  );

  // Date label
  const getDateLabel = useMemo(() => {
    if (view === "year") return moment(currentDate).format("YYYY");
    if (view === "month") return moment(currentDate).format("MMMM YYYY");
    if (view === "day")
      return moment(currentDate).format("dddd, MMMM DD, YYYY");
    if (view === "week")
      return `Week of ${moment(currentDate).startOf("week").format("MMM DD")}`;
    return moment(currentDate).format("MMMM DD, YYYY");
  }, [currentDate, view]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00529B" />
        <Text style={[styles.loadingText, { fontSize: fontMedium }]}>
          Loading your audit calendar...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar - Mobile Modal */}
      {isMobile && showSidebar && (
        <Modal
          transparent
          animationType="slide"
          visible={showSidebar}
          onRequestClose={() => setShowSidebar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.sidebar, { width: sidebarWidth }]}>
              <View style={styles.sidebarHeader}>
                <Text style={[styles.sidebarTitle, { fontSize: fontLarge }]}>
                  Audit Calendar
                </Text>
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
            <Text style={[styles.sidebarTitle, { fontSize: fontLarge }]}>
              Audit Calendar
            </Text>
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
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowSidebar(true)}
              >
                <List size={22} color="#374151" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => navigateDate("today")}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
            <View style={styles.navArrows}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateDate("prev")}
              >
                <ChevronLeft size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonBorder]}
                onPress={() => navigateDate("next")}
              >
                <ChevronRight size={20} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.currentDateText, { fontSize: fontMedium }]}
              numberOfLines={1}
            >
              {getDateLabel}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.viewSelector}
            style={styles.viewSelectorScroll}
          >
            {(["month", "week", "day", "year", "list"] as ViewType[]).map(
              (item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.viewButton,
                    view === item && styles.viewButtonActive,
                  ]}
                  onPress={() => setView(item)}
                >
                  <Text
                    style={[
                      styles.viewButtonText,
                      view === item && styles.viewButtonTextActive,
                      { fontSize: fontSmall },
                    ]}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </ScrollView>
        </View>
        {/* ✅ RESTORED: Wrapper for all calendar views */}
        <View style={styles.calendarContainer}>
          {view === "month" && (
            <Calendar
              current={currentDate}
              markingType="multi-dot"
              markedDates={markedDates}
              enableSwipeMonths
              onDayPress={handleDayPress}
              onMonthChange={(month: any) => {
                if (month.dateString !== currentDate)
                  setCurrentDate(month.dateString);
              }}
              dayComponent={CustomDay}
              theme={{
                todayTextColor: "#00529B",
                selectedDayBackgroundColor: "#00529B",
                selectedDayTextColor: "#FFFFFF",
                arrowColor: "#00529B",
                textMonthFontWeight: "700",
                textMonthFontSize: fontMedium,
                calendarBackground: "#FFFFFF",
                backgroundColor: "#FFFFFF",
                dayTextColor: "#1F2937",
                textDisabledColor: "#D1D5DB",
                textDayFontWeight: "500",
                textDayFontSize: fontSmall + 2,
                dotColor: "#00529B",
                selectedDotColor: "#FFFFFF",
              }}
              style={[
                styles.calendar,
                {
                  paddingHorizontal: 4,
                },
              ]}
            />
          )}

          {(view === "week" || view === "day") && (
            <View style={styles.weekViewContainer}>
              {/* ✅ Header: gridDays = 1 day in Day view, 7 days in Week view */}
              <View style={styles.weekHeaderRow}>
                <View style={styles.weekTimeGutter} />
                {gridDays.map((day) => {
                  const isToday = day.isSame(moment(), "day"); // ✅ restored
                  return (
                    <View
                      key={day.format("YYYY-MM-DD")}
                      style={[
                        styles.weekHeaderCell,
                        isToday && styles.weekHeaderCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekHeaderDate,
                          isToday && styles.weekHeaderDateToday,
                        ]}
                      >
                        {day.format("DD")}
                      </Text>
                      <Text
                        style={[
                          styles.weekHeaderDay,
                          isToday && styles.weekHeaderDayToday,
                        ]}
                      >
                        {day.format("ddd")}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <ScrollView style={{ flex: 1 }} nestedScrollEnabled>
                <View style={styles.weekBodyRow}>
                  {/* Time labels */}
                  <View style={styles.weekTimeGutter}>
                    {Array.from(
                      { length: WEEK_END_HOUR - WEEK_START_HOUR },
                      (_, i) => (
                        <View key={i} style={{ height: HOUR_HEIGHT }}>
                          <Text style={styles.weekHourText}>
                            {moment()
                              .hour(WEEK_START_HOUR + i)
                              .minute(0)
                              .format("h A")}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>

                  {/* ✅✅ THE FIX: body maps gridDays (NOT weekDays) ✅✅ */}
                  {gridDays.map((day) => {
                    const dateStr = day.format("YYYY-MM-DD");
                    const isToday = day.isSame(moment(), "day");
                    const dayEvents = getWeekDayEvents(day); // only this day's events

                    return (
                      <View
                        key={dateStr}
                        style={[
                          styles.weekDayColumn,
                          isToday && styles.weekDayColumnToday,
                        ]}
                      >
                        {Array.from(
                          { length: WEEK_END_HOUR - WEEK_START_HOUR },
                          (_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.weekHourLine,
                                { height: HOUR_HEIGHT },
                              ]}
                            />
                          ),
                        )}

                        {groupEventsByTimeSlot(dayEvents).map(
                          (group, groupIdx) => {
                            const firstEvent = group.events[0];
                            const startH = group.startH;
                            const endH = group.endH;
                            const top = Math.max(
                              0,
                              (startH - WEEK_START_HOUR) * HOUR_HEIGHT,
                            );
                            const height = Math.max(
                              34,
                              (endH - startH) * HOUR_HEIGHT,
                            );
                            const color = getEventColor(firstEvent);
                            const overdue = isEventOverdue(firstEvent);
                            const hasMore = group.events.length > 1;

                            return (
                              <TouchableOpacity
                                key={`group-${dateStr}-${groupIdx}`}
                                activeOpacity={0.7}
                                style={[
                                  styles.weekEventBlock,
                                  {
                                    top,
                                    height,
                                    borderLeftColor: color,
                                    left: "2%",
                                    width: "96%",
                                  },
                                ]}
                                onPress={() => {
                                  if (hasMore) {
                                    // Open date events modal showing all events for this day
                                    setSelectedDateEvents(dayEvents);
                                    setShowDateEventsModal(true);
                                  } else {
                                    // Open single event modal
                                    setSelectedEvent(firstEvent);
                                    setShowModal(true);
                                  }
                                }}
                              >
                                <Text
                                  style={styles.weekEventTime}
                                  numberOfLines={1}
                                >
                                  {firstEvent.startTime} - {firstEvent.endTime}
                                </Text>
                                <View style={styles.weekEventRow}>
                                  <View
                                    style={[
                                      styles.calendarEventDot,
                                      { backgroundColor: color },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.weekEventLabel,
                                      {
                                        color: overdue ? "#DC2626" : "#374151",
                                        textDecorationLine: overdue
                                          ? "line-through"
                                          : "none",
                                        flex: 1,
                                      },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {firstEvent.auditType}
                                  </Text>
                                  {/* ✅ Show "+N more" badge if multiple events */}
                                  {hasMore && (
                                    <View style={styles.moreEventsBadge}>
                                      <Text style={styles.moreEventsText}>
                                        +{group.events.length - 1}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
          {/* ✅ RESTORED: LIST VIEW */}
          {view === "list" && (
            <EventList
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => {
                setSelectedEvent(event);
                setShowModal(true);
              }}
              currentDate={currentDate}
            />
          )}

          {/* ✅ RESTORED: YEAR VIEW */}
          {view === "year" && (
            <YearView
              date={currentDate}
              events={filteredEvents}
              onEventClick={(event: CalendarEvent) => {
                setSelectedEvent(event);
                setShowModal(true);
              }}
              onDateClick={(date: Date) => {
                setCurrentDate(moment(date).format("YYYY-MM-DD"));
                setView("day");
              }}
              onMonthClick={(date: Date) => {
                setCurrentDate(moment(date).format("YYYY-MM-DD"));
                setView("month"); // ✅ same as web
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
                {moment(currentDate).format("dddd, MMMM DD, YYYY")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDateEventsModal(false)}
                style={styles.dateEventsClose}
              >
                <Text style={{ color: "#6B7280", fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dateEventsList}>
              {selectedDateEvents.map((event) => {
                const reschedule = getRescheduleInfo(event); // ✅ compute once

                return (
                  <TouchableOpacity
                    key={`${event.originalAuditId || event.id}_${event.start}`}
                    style={styles.dateEventCard}
                    onPress={() => {
                      setShowDateEventsModal(false);
                      setSelectedEvent(event);
                      setShowModal(true);
                    }}
                  >
                    <View
                      style={[
                        styles.dateEventDot,
                        { backgroundColor: getEventColor(event) },
                      ]}
                    />
                    <View style={styles.dateEventContent}>
                      <Text style={styles.dateEventTitle}>
                        {event.auditType}
                      </Text>
                      <Text style={styles.dateEventDept}>
                        {event.department}
                      </Text>

                      {/* ✅ NEW: Was date + Rescheduled badge (like Image 3) */}
                      {reschedule.hasReschedule && (
                        <View style={styles.rescheduledRow}>
                          <Text style={styles.rescheduledWas}>
                            Was:{" "}
                            {moment(reschedule.originalDate).format(
                              "MMM D, YYYY",
                            )}
                          </Text>
                          <View style={styles.rescheduledBadge}>
                            <Text style={styles.rescheduledBadgeText}>
                              Rescheduled
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* ✅ SHOW DATE RANGE IF APPLICABLE */}
                      {event.isDateRange && event.fromDate && event.toDate ? (
                        <View style={styles.dateEventMeta}>
                          <Text
                            style={[styles.dateEventTime, { color: "#8B5CF6" }]}
                          >
                            📅 {moment(event.fromDate).format("MMM D")} →{" "}
                            {moment(event.toDate).format("MMM D, YYYY")}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.dateEventMeta}>
                          <Text style={styles.dateEventTime}>
                            {event.startTime} - {event.endTime}
                          </Text>
                        </View>
                      )}

                      <Text
                        style={[
                          styles.dateEventStatus,
                          event.isFullyCompleted && styles.statusCompleted,
                          event.isSubmitted && styles.statusSubmitted,
                          event.isDateRange && styles.statusDateRange,
                        ]}
                      >
                        {getStatusDisplay(event)}
                      </Text>

                      {/* Show auditor with avatar */}
                      <UserAvatar
                        userId={event.auditorId}
                        userName={event.auditorName}
                        size="xs"
                        showName={true}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
              {selectedDateEvents.length === 0 && (
                <View style={styles.dateEventsEmpty}>
                  <Text style={styles.dateEventsEmptyText}>
                    No events on this day
                  </Text>
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
  searchText,
  setSearchText,
  eventFilter,
  setEventFilter,
  expandedLegend,
  setExpandedLegend,
  fontSmall,
  fontMedium,
  onRefresh,
  refreshing,
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
      <TouchableOpacity
        onPress={onRefresh}
        style={styles.refreshButton}
        disabled={refreshing}
      >
        <RefreshCw size={18} color={refreshing ? "#9CA3AF" : "#00529B"} />
        <Text style={[styles.refreshText, { fontSize: fontSmall }]}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Text>
      </TouchableOpacity>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            eventFilter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setEventFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              eventFilter === "all" && styles.filterTextActive,
              { fontSize: fontSmall },
            ]}
          >
            All Audits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            eventFilter === "owned" && styles.filterButtonActive,
          ]}
          onPress={() => setEventFilter("owned")}
        >
          <Crown size={16} color="#2563EB" />
          <Text
            style={[
              styles.filterText,
              eventFilter === "owned" && styles.filterTextActive,
              { fontSize: fontSmall },
            ]}
          >
            As Auditor
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            eventFilter === "attending" && styles.filterButtonActive,
          ]}
          onPress={() => setEventFilter("attending")}
        >
          <UserCheck size={16} color="#16A34A" />
          <Text
            style={[
              styles.filterText,
              eventFilter === "attending" && styles.filterTextActive,
              { fontSize: fontSmall },
            ]}
          >
            As Auditee
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <TouchableOpacity
        style={styles.legendHeader}
        onPress={() => setExpandedLegend(!expandedLegend)}
      >
        <Text style={[styles.legendTitle, { fontSize: fontMedium }]}>
          Legend
        </Text>
        {expandedLegend ? (
          <ChevronUp size={18} color="#6B7280" />
        ) : (
          <ChevronDown size={18} color="#6B7280" />
        )}
      </TouchableOpacity>

      {expandedLegend && (
        <View style={styles.legendContainer}>
          <LegendItem color="#0EA5E9" title="Scheduled" fontSmall={fontSmall} />
          <LegendItem
            color="#10B981"
            title="Schedule Approved"
            fontSmall={fontSmall}
          />
          <LegendItem
            color="#F59E0B"
            title="Pending Schedule Approval"
            fontSmall={fontSmall}
          />
          <LegendItem
            color="#3B82F6"
            title="Audit Submitted (Awaiting Approval)"
            fontSmall={fontSmall}
          />
          <LegendItem
            color="#059669"
            title="✓ Audit Completed"
            fontSmall={fontSmall}
          />
          <LegendItem color="#EF4444" title="Overdue" fontSmall={fontSmall} />
          <LegendItem color="#F87171" title="Rejected" fontSmall={fontSmall} />
          <LegendItem
            color="#8B5CF6"
            title="Date Range"
            fontSmall={fontSmall}
          />
          <LegendItem
            color="#F97316"
            title="Changes Requested"
            fontSmall={fontSmall}
          />
        </View>
      )}
    </>
  );
}

function LegendItem({
  color,
  title,
  fontSmall,
}: {
  color: string;
  title: string;
  fontSmall: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { fontSize: fontSmall }]}>{title}</Text>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#F3F4F6" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: { marginTop: 16, color: "#4B5563" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },

  sidebar: {
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    height: "100%",
    flexShrink: 0,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sidebarTitle: { fontWeight: "700", color: "#111827" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  refreshText: { color: "#00529B", marginLeft: 8, fontWeight: "500" },

  filterContainer: { marginBottom: 20 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#F3F4F6",
  },
  filterButtonActive: { backgroundColor: "#DBEAFE" },
  filterText: { marginLeft: 8, color: "#374151" },
  filterTextActive: { fontWeight: "700", color: "#2563EB" },

  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendTitle: { fontWeight: "700", color: "#374151" },
  legendContainer: { marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { color: "#4B5563" },

  mainContent: { flex: 1, overflow: "hidden" },

  toolbar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexShrink: 0,
  },
  toolbarRow1: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  iconButton: { padding: 8 },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#00529B",
    borderRadius: 8,
  },
  todayButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  navArrows: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
  },
  navButton: { padding: 8 },
  navButtonBorder: { borderLeftWidth: 1, borderColor: "#D1D5DB" },
  currentDateText: { fontWeight: "700", color: "#111827", flexShrink: 1 },
  viewSelectorScroll: { maxHeight: 40 },
  viewSelector: { flexDirection: "row", paddingRight: 16, gap: 8 },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  viewButtonActive: { backgroundColor: "#00529B" },
  viewButtonText: { color: "#374151" },
  viewButtonTextActive: { color: "#FFFFFF", fontWeight: "700" },

  calendarContainer: {
    flex: 1,
    padding: 15,
    paddingHorizontal: 10,
  },

  calendar: {
    borderRadius: 8,
    elevation: 2,
    width: "100%",
    minHeight: 380,
    paddingHorizontal: 4,
  },

  dayContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 50,
    minWidth: 42,
    borderRadius: 8,
    backgroundColor: "transparent",
    marginHorizontal: 2,
  },

  // ✅ Update day text size
  dayText: {
    fontSize: 18, // Increased from 16
    fontWeight: "500",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // ✅ Update dots container spacing
  dayDotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4, // Increased from 3
    gap: 3, // Increased from 2
    height: 16, // Increased from 14
  },

  dayDot: {
    width: 8, // Increased from 6
    height: 8, // Increased from 6
    borderRadius: 4,
    opacity: 0.9,
  },

  dayDotMore: {
    width: 10, // Increased from 8
    height: 8, // Increased from 6
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
  },

  dayDotMoreText: {
    fontSize: 10, // Increased from 8
    color: "#6B7280",
    fontWeight: "600",
    marginLeft: 2,
  },

  weekContainer: {
    width: 900,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
  },
  weekCalendar: { width: 900, height: 110 },

  // Calendar Event Styles
  calendarEventContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
    flexShrink: 1,
  },
  calendarEventCheck: {
    fontSize: 10,
    color: "#10B981",
    flexShrink: 0,
  },

  // Date Events Modal
  dateEventsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dateEventsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  dateEventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  dateEventsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  dateEventsClose: {
    padding: 8,
  },
  dateEventsList: {
    padding: 16,
  },
  dateEventCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    fontWeight: "600",
    color: "#111827",
  },
  dateEventDept: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  dateEventMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  dateEventTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  dateEventStatus: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  statusCompleted: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  statusSubmitted: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
  },
  dateEventsEmpty: {
    padding: 32,
    alignItems: "center",
  },
  dateEventsEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  // ✅ NEW: Style for days with events
  dayWithEvents: {
    backgroundColor: "rgba(0, 82, 155, 0.08)",
    borderRadius: 8,
  },

  dayToday: {
    backgroundColor: "rgba(0, 82, 155, 0.15)",
    borderWidth: 2,
    borderColor: "#00529B",
    borderRadius: 8,
  },

  daySelected: {
    backgroundColor: "#00529B",
    borderRadius: 8,
  },

  dayTextNormal: {
    color: "#1F2937",
  },

  // ✅ NEW: Text style for days with events
  dayTextWithEvents: {
    color: "#00529B",
    fontWeight: "600",
  },

  dayTextToday: {
    color: "#00529B",
    fontWeight: "700",
  },

  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  dayTextDisabled: {
    color: "#D1D5DB",
  },
  statusDateRange: {
    backgroundColor: "#f5f3ff",
    color: "#8B5CF6",
  },

  // ADD to styles
  weekViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
  },
  weekHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  weekTimeGutter: { width: 56 },
  weekHeaderCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  weekHeaderCellToday: { backgroundColor: "rgba(0,82,155,0.1)" },
  weekHeaderDate: { fontSize: 16, fontWeight: "700", color: "#111827" },
  weekHeaderDateToday: { color: "#00529B" },
  weekHeaderDay: { fontSize: 11, color: "#6B7280" },
  weekHeaderDayToday: { color: "#00529B", fontWeight: "700" },
  weekBodyRow: { flexDirection: "row" },
  weekDayColumn: { flex: 1, borderLeftWidth: 1, borderLeftColor: "#E5E7EB" },
  weekDayColumnToday: { backgroundColor: "rgba(0,82,155,0.05)" },
  weekHourLine: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  weekHourText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
    paddingRight: 4,
  },
  weekEventBlock: {
    position: "absolute",
    // left: 2,
    // right: 2,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  weekEventTime: { fontSize: 9, fontWeight: "600", color: "#374151" },
  weekEventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  weekEventLabel: { fontSize: 10, fontWeight: "600", flexShrink: 1 },

  moreEventsBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  moreEventsText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#374151",
  },

  rescheduledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: "#fffbeb", // amber-50 background
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fde68a", // amber-200 border
  },
  rescheduledWas: {
    fontSize: 11,
    color: "#6b7280",
    textDecorationLine: "line-through", // Strikethrough for old date
  },
  rescheduledBadge: {
    backgroundColor: "#fef3c7", // amber-100
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  rescheduledBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#b45309", // amber-800 text
  },
});
