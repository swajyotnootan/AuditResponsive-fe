import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  LucideIcon,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useAuth } from "../context/AuthContext"; // adjust path to match your project

// ==================== TYPES & INTERFACES ====================

interface Report {
  id?: string;
  eventNo?: string;
  title?: string;
  owner?: string;
  status?: string;
  created?: string;
  createdAt?: string;
  currentStep?: string;
  completedSteps?: number;
  totalSteps?: number;
  priority?: string;
  department?: string;
  problem?: string;
  description?: string;
  initiatorEmail?: string;
  rejectionReason?: string;
  isNcrBased?: boolean;
  d0_id?: string;
  d1_id?: string;
  d2_id?: string;
  d3_id?: string;
  d4_id?: string;
  d5_id?: string;
  d6_id?: string;
  d7_id?: string;
  d8_id?: string;
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  delay?: number;
}

interface User {
  name?: string;
  email?: string;
}

interface InitiatorDashboardProps {
  user?: User;
  onLogout?: () => void;
}

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
}

// ==================== CONFIGURATION & CONSTANTS ====================

const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  white: "#ffffff",
};

// ==================== ANIMATED GLASS CARD ====================

const AnimatedGlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  delay?: number;
}> = ({ children, style, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.glassCard,
        { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ==================== KPI CARD (HORIZONTAL LAYOUT) ====================

const KpiCard = ({
  title,
  value,
  icon,
  isDesktop,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isDesktop: boolean;
}) => (
  <AnimatedGlassCard
    style={
      isDesktop
        ? [styles.kpiCard, { flex: 1 }]
        : [styles.kpiCardMobile, { width: 220 }]
    }
  >
    <View style={styles.kpiContentRow}>
      {/* Icon on the left */}
      <View style={styles.kpiIconContainer}>{icon}</View>

      {/* Value & Title on the right */}
      <View style={styles.kpiTextContainer}>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.kpiTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </View>
  </AnimatedGlassCard>
);

// ==================== ACTION CARD (CENTERED + ANIMATED) ====================

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  delay = 0,
}) => {
  // Press & Hover Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const arrowTranslateAnim = useRef(new Animated.Value(0)).current;

  // Icon Entrance Animation
  const iconScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Staggered pop-in for the icon
    Animated.spring(iconScaleAnim, {
      toValue: 1,
      delay: delay + 200,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [delay]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
      }),
      Animated.timing(arrowTranslateAnim, {
        toValue: 4,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(arrowTranslateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <AnimatedGlassCard delay={delay} style={styles.actionCard}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={styles.actionCardInner}>
          {/* Centered Icon with Pop Animation */}
          <Animated.View
            style={[
              styles.actionIconOuter,
              { transform: [{ scale: iconScaleAnim }] },
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.actionIconInner}
            >
              <Icon size={28} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>

          {/* Centered Title & Description */}
          <View style={styles.actionTitleContainer}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>

          {/* Centered Animated Button */}
          <TouchableOpacity
            onPress={onClick}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
            style={styles.actionButtonWrapper}
          >
            <Animated.View
              style={[
                styles.actionButton,
                { transform: [{ scale: buttonScaleAnim }] },
              ]}
            >
              <Text style={styles.actionButtonText}>Start Process</Text>
              <Animated.View
                style={{ transform: [{ translateX: arrowTranslateAnim }] }}
              >
                <ChevronRight size={18} color={COLORS.primary} />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </AnimatedGlassCard>
  );
};

// ==================== INITIATOR DASHBOARD ====================

const InitiatorDashboard: React.FC<InitiatorDashboardProps> = ({ user }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isSmallMobile = width < 375;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    inProgress: 0,
    completed: 0,
  });

  // Helper to get current step
  const getCurrentStep = (item: any): string => {
    const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];
    for (let i = 0; i < steps.length; i++) {
      if (!item[`d${i}_id`]) {
        return steps[i];
      }
    }
    return "D8";
  };

  // Helper to check if event is NCR based
  const isNcrBasedEvent = (item: any): boolean => {
    const d0Data = Array.isArray(item?.content?.d0) ? item.content.d0[0] : null;
    return Boolean(
      d0Data?.sourceNcrId ||
      d0Data?.sourceNcrNumber ||
      d0Data?.isNcrBased ||
      d0Data?.sourceType === "ncr" ||
      item?.isNcrBased ||
      item?.sourceType === "ncr" ||
      String(item?.eventNo || "").startsWith("8D-"),
    );
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await axios.get(
        `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-User-Id": String((authUser as any)?.id ?? ""),
            "X-Plant-Id": String((authUser as any)?.plantId ?? ""),
            "X-Timezone":
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "Asia/Kolkata",
          },
        },
      );

      if (response.data?.success && Array.isArray(response.data.data)) {
        const parsedEvents: Report[] = response.data.data.map(
          (item: Record<string, any>) => {
            const steps = [
              "D0",
              "D1",
              "D2",
              "D3",
              "D4",
              "D5",
              "D6",
              "D7",
              "D8",
            ];
            let completedCount = 0;
            steps.forEach((_, index) => {
              const stepIdField = `d${index}_id`;
              if (item[stepIdField]) completedCount++;
            });

            const currentStep = getCurrentStep(item);
            const isNcrBased = isNcrBasedEvent(item);

            let status = item.status || "Draft";
            const statusMap: Record<string, string> = {
              IN_PROGRESS: "In Progress",
              APPROVAL_PENDING: "Approval Pending",
              REJECTED: "Rejected",
              D0_APPROVED: "D0 Approved",
              CLOSED: "Closed",
              COMPLETED: "Completed",
            };
            status = statusMap[status] || status;

            return {
              id: item.eventNo,
              eventNo: item.eventNo,
              title: item.eventNo,
              owner:
                item.initiatorEmail ||
                (authUser as any)?.name ||
                (authUser as any)?.email ||
                "Unassigned",
              status,
              created: item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "N/A",
              createdAt: item.createdAt,
              currentStep,
              completedSteps: completedCount,
              totalSteps: steps.length,
              priority: item.priority || "MEDIUM",
              department: item.department,
              problem: item.problem,
              description: item.description,
              initiatorEmail: item.initiatorEmail,
              rejectionReason: item.rejectionComment,
              isNcrBased,
              d0_id: item.d0_id,
              d1_id: item.d1_id,
              d2_id: item.d2_id,
              d3_id: item.d3_id,
              d4_id: item.d4_id,
              d5_id: item.d5_id,
              d6_id: item.d6_id,
              d7_id: item.d7_id,
              d8_id: item.d8_id,
            };
          },
        );

        parsedEvents.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
        setReports(parsedEvents);

        setStats({
          total: parsedEvents.length,
          inProgress: parsedEvents.filter((e) => e.status === "In Progress")
            .length,
          completed: parsedEvents.filter(
            (e) => e.status === "Closed" || e.status === "Completed",
          ).length,
        });
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, []);

  const handleNavigate = (params: any) => {
    if (params.createNew) {
      const type = params.type || "all";
      router.push({
        pathname: "../landing-page",
        params: {
          type: type,
          tab:
            type === "fresh"
              ? "Fresh 8D"
              : type === "ncr"
                ? "NCR 8D"
                : "All 8D",
        },
      });
    } else if (params.selectedEventId) {
      const event = reports.find((r) => r.eventNo === params.selectedEventId);
      if (event) {
        const nextStep = getCurrentStep(event);
        router.push({
          pathname: "../eightdflow",
          params: {
            eventId: params.selectedEventId,
            step: nextStep,
            type: event.isNcrBased ? "ncr" : "fresh",
            isNcrBased: event.isNcrBased ? "true" : "false",
          },
        });
      } else {
        console.error("Event not found");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading 8D Reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#F8FAFC", "#EFF6FF", "#F8FAFC"]}
        style={styles.background}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* Header */}
          <View
            style={[
              styles.headerPlain,
              isSmallMobile && styles.headerPlainSmall,
            ]}
          >
            <View style={styles.headerInner}>
              <View style={styles.headerGreetingSection}>
                <Text style={styles.greetingTitle}>8D Quality Management</Text>
                <Text style={styles.greetingSubtitle}>
                  Welcome back,{" "}
                  <Text style={styles.greetingName}>
                    {user?.name || authUser?.name || authUser?.email || "User"}
                  </Text>
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={refreshing}
                  style={styles.refreshButton}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={18} color={COLORS.textMuted} />
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.sectionGap}>
              {/* KPI Cards - Horizontal Layout */}
              {isDesktop ? (
                <View style={styles.kpiRow}>
                  <KpiCard
                    title="Total 8D Reports"
                    value={stats.total}
                    icon={<Zap size={24} color={COLORS.primaryDark} />}
                    isDesktop={true}
                  />
                  <KpiCard
                    title="In Progress"
                    value={stats.inProgress}
                    icon={<TrendingUp size={24} color={COLORS.primaryDark} />}
                    isDesktop={true}
                  />
                  <KpiCard
                    title="Completed"
                    value={stats.completed}
                    icon={
                      <AlertTriangle size={24} color={COLORS.primaryDark} />
                    }
                    isDesktop={true}
                  />
                </View>
              ) : (
                /* Mobile Layout - Horizontal Scrollable Row */
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.kpiScrollContent}
                  style={styles.kpiScrollView}
                >
                  <KpiCard
                    title="Total 8D Reports"
                    value={stats.total}
                    icon={<Zap size={24} color={COLORS.primaryDark} />}
                    isDesktop={false}
                  />
                  <KpiCard
                    title="In Progress"
                    value={stats.inProgress}
                    icon={<TrendingUp size={24} color={COLORS.primaryDark} />}
                    isDesktop={false}
                  />
                  <KpiCard
                    title="Completed"
                    value={stats.completed}
                    icon={
                      <AlertTriangle size={24} color={COLORS.primaryDark} />
                    }
                    isDesktop={false}
                  />
                </ScrollView>
              )}

              {/* Action Cards Grid */}
              <View style={isDesktop ? styles.actionRow : styles.actionColumn}>
                <ActionCard
                  title="Create Fresh 8D"
                  description="Start a new 8D report from scratch for general quality issues, customer complaints, or internal improvements."
                  icon={Zap}
                  onClick={() =>
                    handleNavigate({ createNew: true, type: "fresh" })
                  }
                  delay={0}
                />
                <ActionCard
                  title="NCR Based 8D"
                  description="Convert an existing Non-Conformance Report (NCR) into an 8D problem-solving workflow immediately."
                  icon={AlertTriangle}
                  onClick={() =>
                    handleNavigate({ createNew: true, type: "ncr" })
                  }
                  delay={150}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default InitiatorDashboard;

// ==================== STYLES ====================

const styles = StyleSheet.create({
  // Container
  container: { flex: 1, backgroundColor: COLORS.bg },
  background: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 16, paddingBottom: 20 },
  contentDesktop: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    padding: 24,
  },
  mainContent: { width: "100%" },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "500",
  },

  // Glass Card
  glassCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // Header
  headerPlain: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  headerPlainSmall: {
    paddingVertical: 6,
    marginBottom: 12,
  },
  headerInner: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerGreetingSection: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  greetingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  greetingName: {
    fontWeight: "600",
    color: COLORS.textValue,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 10,
    flexShrink: 0,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textValue,
  },

  // Section gaps
  sectionGap: { gap: 16 },
  kpiRow: {
    flexDirection: "row",
    gap: 16,
  },

  // Mobile KPI Scroll View Styles
  kpiScrollView: {
    marginHorizontal: -16, // Negate parent padding so scroll goes edge-to-edge
  },
  kpiScrollContent: {
    paddingHorizontal: 16, // Add padding back inside the scroll
    gap: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 16,
  },
  actionColumn: {
    flexDirection: "column",
    gap: 16,
  },

  // ==================== KPI CARD (RIGHT-ALIGNED TEXT) ====================
  kpiCard: {
    padding: 20,
    marginBottom: 0,
  },
  kpiCardMobile: {
    padding: 16,
    marginBottom: 0,
  },
  kpiContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiTextContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 10,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 30,
    marginBottom: 2,
    textAlign: "right",
  },
  kpiTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    textAlign: "right",
  },

  // ==================== ACTION CARD ====================
  actionCard: {
    flex: 1,
  },
  actionCardInner: {
    padding: 24,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  actionIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
    alignSelf: "center",
  } as ViewStyle,
  actionIconInner: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  actionTitleContainer: {
    marginBottom: 24,
    alignItems: "center",
  } as ViewStyle,
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  } as TextStyle,
  actionDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
    textAlign: "center",
  } as TextStyle,

  // Button Styles
  actionButtonWrapper: {
    width: "100%",
  } as ViewStyle,
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  } as ViewStyle,
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  } as TextStyle,
});
