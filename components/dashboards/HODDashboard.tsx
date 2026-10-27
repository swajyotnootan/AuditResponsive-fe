import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  UserCheck,
  Users,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import FinalPreview from "../eightd/steps/FinalPreview";

// ── Palette (aligned with Initiator Dashboard) ──
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

// Kept for any external consumers / FinalPreview styling references
const NAVBAR_COLORS = {
  primary1: "#005f9b",
  primary: "#00799b",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

console.log("🚀 API Base URL being used:", API_BASE_URL);

// ── Helpers (unchanged logic) ──
const isNcrBasedEvent = (event: any): boolean => {
  const d0Data = Array.isArray(event?.content?.d0) ? event.content.d0[0] : null;
  const eventNo = String(event?.eventNo || "").toUpperCase();
  return Boolean(
    d0Data?.sourceNcrId ||
    d0Data?.sourceNcrNumber ||
    d0Data?.isNcrBased === true ||
    d0Data?.sourceType === "ncr" ||
    event?.isNcrBased === true ||
    event?.sourceType === "ncr" ||
    eventNo.includes("NCR"),
  );
};

const isApprovalPendingStatus = (status: string) => {
  const s = String(status || "").toLowerCase();
  return s === "approval pending" || s === "approval_pending";
};

// ── StatusBadge (logic unchanged, palette refreshed) ──
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case "COMPLETED":
      case "CLOSED":
        return {
          bg: "bg-green-50",
          text: "text-green-800",
          border: "border-green-200",
          label: "Completed",
          icon: CheckCircle,
          iconColor: "#166534",
        };
      case "IN_PROGRESS":
        return {
          bg: "bg-cyan-50",
          text: "text-cyan-800",
          border: "border-cyan-200",
          label: "In Progress",
          icon: RefreshCw,
          iconColor: "#155E75",
        };
      case "APPROVAL_PENDING":
      case "APPROVAL PENDING":
        return {
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
          label: "Awaiting Approval",
          icon: Clock,
          iconColor: "#92400E",
        };
      case "D0_APPROVED":
      case "D0 APPROVED":
        return {
          bg: "bg-blue-50",
          text: "text-blue-800",
          border: "border-blue-200",
          label: "D0 Approved",
          icon: CheckCircle,
          iconColor: "#1E40AF",
        };
      case "REJECTED":
        return {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          label: "Rejected",
          icon: AlertCircle,
          iconColor: "#991B1B",
        };
      case "DRAFT":
        return {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          label: "Draft",
          icon: FileText,
          iconColor: "#374151",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          label: status || "Pending",
          icon: FileText,
          iconColor: "#374151",
        };
    }
  };
  const config = getStatusConfig(status);
  const IconComponent = config.icon;
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-full border px-3 py-1.5 ${config.bg} ${config.text} ${config.border}`}
    >
      <IconComponent size={14} color={config.iconColor} />
      <Text className={`text-xs font-semibold ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
};

// ── Animated Glass Card (same as Initiator) ──
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

// ── Simplified & Unified KpiCard ──
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
      <View style={styles.kpiIconContainer}>{icon}</View>
      <View style={styles.kpiTextContainer}>
        <Text style={styles.kpiTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  </AnimatedGlassCard>
);

// ── ActionCard (centered + animated, same look as Initiator) ──
const ActionCard: React.FC<{
  title: string;
  description: string;
  iconName?: "bar-chart-2" | "user-check";
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  delay?: number;
  buttonLabel?: string;
}> = ({
  title,
  description,
  iconName,
  icon: IconProp,
  onPress,
  delay = 0,
  buttonLabel = "Go to Dashboard",
}) => {
  const Icon =
    IconProp ||
    (iconName === "bar-chart-2"
      ? BarChart3
      : iconName === "user-check"
        ? UserCheck
        : BarChart3);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const arrowTranslateAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
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
      Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }),
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

          <View style={styles.actionTitleContainer}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>

          <TouchableOpacity
            onPress={onPress}
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
              <Text style={styles.actionButtonText}>{buttonLabel}</Text>
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

// ── Main HOD Dashboard ──
export default function HODDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isSmallMobile = width < 375;

  // Safe toast fallback (unchanged)
  let addToast = (
    message: string,
    type: "error" | "success" | "info" = "info",
  ) => {
    console.warn(`[Toast Fallback - ${type}]`, message);
  };
  try {
    const toastContext = useToast();
    if (toastContext?.addToast) addToast = toastContext.addToast;
  } catch {
    console.warn("ToastProvider is missing. Using console fallback.");
  }

  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [previewEvent, setPreviewEvent] = useState<any | null>(null);
  const [rcEvent, setRcEvent] = useState<any | null>(null);
  const rcEvents = useMemo(
    () =>
      (pendingApprovals || [])
        .filter(
          (e: any) =>
            e?.content?.d4?.[0]?.fishboneCategories?.length > 0 ||
            e?.content?.d4?.[0]?.whySteps?.length > 0,
        )
        .slice(0, 6),
    [pendingApprovals],
  );
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    freshPendingApprovals: 0,
    ncrPendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const token = user?.token;
      const url = `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`;

      console.log("📡 Attempting to fetch from:", url);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-Id": String((user as any)?.id ?? ""),
          "X-Timezone":
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
        },
        timeout: 10000,
      });

      if (response.data?.success && Array.isArray(response.data.data)) {
        const pending = response.data.data.filter((event: any) =>
          isApprovalPendingStatus(event.status),
        );
        const freshPending = pending.filter(
          (event: any) => !isNcrBasedEvent(event),
        );
        const ncrPending = pending.filter((event: any) =>
          isNcrBasedEvent(event),
        );

        setPendingApprovals(pending);
        setStats({
          pendingApprovals: pending.length,
          freshPendingApprovals: freshPending.length,
          ncrPendingApprovals: ncrPending.length,
        });
      }
    } catch (error: any) {
      console.error("❌ Axios Error Details:", {
        message: error.message,
        code: error.code,
        url: `${API_BASE_URL}/api/eightd/data`,
      });
      addToast(
        "Failed to load pending approvals. Check network connection.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.token, addToast]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingApprovals();
    }, [fetchPendingApprovals]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingApprovals();
    setRefreshing(false);
  }, [fetchPendingApprovals]);

  const handleReview = (event: any) => setPreviewEvent(event);

  const handleViewDashboard = (type = "all") => {
    router.push({ pathname: "/landing-page", params: { type } });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading HOD Dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
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
            {/* ── Header ── */}
            <View
              style={[
                styles.headerPlain,
                isSmallMobile && styles.headerPlainSmall,
              ]}
            >
              <View style={styles.headerInner}>
                <View style={styles.headerGreetingSection}>
                  <Text style={styles.greetingTitle}>HOD Dashboard</Text>
                  <Text style={styles.greetingSubtitle}>
                    Welcome back,{" "}
                    <Text style={styles.greetingName}>
                      {user?.name || user?.username || "User"}
                    </Text>
                  </Text>
                  <View style={styles.headerPillRow}>
                    <View style={styles.headerPill}>
                      <Text style={styles.headerPillText} numberOfLines={1}>
                        {user?.department || "Quality Assurance"}
                      </Text>
                    </View>
                    <View style={styles.headerPill}>
                      <Text style={styles.headerPillText} numberOfLines={1}>
                        Head of Department
                      </Text>
                    </View>
                  </View>
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

            {/* ── Main Content ── */}
            <View style={styles.mainContent}>
              <View style={styles.sectionGap}>
                {/* KPI Cards */}
                {isDesktop ? (
                  <View style={styles.kpiRow}>
                    <KpiCard
                      title="Pending Approvals"
                      value={stats.pendingApprovals}
                      icon={<Clock size={24} color={COLORS.primaryDark} />}
                      isDesktop={true}
                    />
                    <KpiCard
                      title="Department"
                      value={user?.department || "Quality"}
                      icon={<Users size={24} color={COLORS.primaryDark} />}
                      isDesktop={true}
                    />
                    <KpiCard
                      title="Role"
                      value="HOD"
                      icon={<UserCheck size={24} color={COLORS.primaryDark} />}
                      isDesktop={true}
                    />
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.kpiScrollContent}
                    style={styles.kpiScrollView}
                  >
                    <KpiCard
                      title="Pending Approvals"
                      value={stats.pendingApprovals}
                      icon={<Clock size={24} color={COLORS.primaryDark} />}
                      isDesktop={false}
                    />
                    <KpiCard
                      title="Department"
                      value={user?.department || "Quality"}
                      icon={<Users size={24} color={COLORS.primaryDark} />}
                      isDesktop={false}
                    />
                    <KpiCard
                      title="Role"
                      value="HOD"
                      icon={<UserCheck size={24} color={COLORS.primaryDark} />}
                      isDesktop={false}
                    />
                  </ScrollView>
                )}

                {/* Action Cards */}
                <View
                  style={isDesktop ? styles.actionRow : styles.actionColumn}
                >
                  <ActionCard
                    title="Fresh 8D Dashboard"
                    description={`${stats.freshPendingApprovals} item(s) waiting for HOD action.`}
                    iconName="bar-chart-2"
                    onPress={() => handleViewDashboard("fresh")}
                    delay={0}
                    buttonLabel="Go to Dashboard"
                  />
                  <ActionCard
                    title="NCR 8D Dashboard"
                    description={`${stats.ncrPendingApprovals} item(s) waiting for HOD action.`}
                    iconName="user-check"
                    onPress={() => handleViewDashboard("ncr")}
                    delay={150}
                    buttonLabel="Go to Dashboard"
                  />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* ── Preview Drawer Modal ── */}
      <Modal
        visible={!!previewEvent}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setPreviewEvent(null)}
      >
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity
            style={styles.drawerBackdropTouch}
            onPress={() => setPreviewEvent(null)}
            activeOpacity={1}
          />
          <SafeAreaView
            style={[
              styles.drawerPanel,
              {
                width:
                  Dimensions.get("window").width >= 768
                    ? 550
                    : Dimensions.get("window").width * 0.9,
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle} numberOfLines={1}>
                8D Review — {previewEvent?.eventNo || previewEvent?.id || ""}
              </Text>
              <TouchableOpacity
                onPress={() => setPreviewEvent(null)}
                style={styles.drawerCloseBtn}
              >
                <X size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {previewEvent && (
                <FinalPreview
                  key={previewEvent.eventNo || previewEvent.id}
                  eventId={previewEvent.eventNo || previewEvent.id || null}
                  isHOD={true}
                  onRefresh={fetchPendingApprovals}
                  onClose={() => setPreviewEvent(null)}
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Root Cause Modal (kept unchanged) ── */}
      <Modal
        visible={!!rcEvent}
        animationType="slide"
        transparent
        onRequestClose={() => setRcEvent(null)}
      >
        <View style={styles.rcBackdrop}>
          <View style={styles.rcPanel}>
            <View style={styles.rcHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rcTitle}>Root Cause Analysis</Text>
                <Text style={styles.rcSubtitle} numberOfLines={1}>
                  {rcEvent?.content?.d0?.[0]?.title ||
                    rcEvent?.eventNo ||
                    "8D Report"}
                </Text>
              </View>
              <TouchableOpacity
                testID="close-rc-modal"
                onPress={() => setRcEvent(null)}
                style={styles.rcCloseBtn}
              >
                <X size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 16 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ==================== STYLES (mirrors Initiator Dashboard) ====================

const styles = StyleSheet.create({
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
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  headerPlainSmall: { paddingVertical: 6, marginBottom: 12 },
  headerInner: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerGreetingSection: { flex: 1, minWidth: 0 },
  greetingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  greetingSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  greetingName: { fontWeight: "600", color: COLORS.textValue },
  headerPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  headerPill: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  // FIX: Added explicit fontSize and lineHeight so it doesn't stretch inside the flex row
  headerPillText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    color: COLORS.primary,
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

  // Layout helpers
  sectionGap: { gap: 16 },
  kpiRow: { flexDirection: "row", gap: 16 },
  kpiScrollView: { marginHorizontal: -16 },
  kpiScrollContent: { paddingHorizontal: 16, gap: 12 },
  actionRow: { flexDirection: "row", gap: 16 },
  actionColumn: { flexDirection: "column", gap: 16 },

  // KPI card
  kpiCard: { padding: 20, marginBottom: 0 },
  kpiCardMobile: { padding: 16, marginBottom: 0 },
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
  // FIX: Title is now the small, muted text on top
  kpiTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 2,
  },
  // FIX: Value is now simple, small, and not overly bold
  kpiValue: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 22,
    textAlign: "right",
  },

  // Action card
  actionCard: { flex: 1 },
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
  actionTitleContainer: { marginBottom: 24, alignItems: "center" } as ViewStyle,
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
  actionButtonWrapper: { width: "100%" } as ViewStyle,
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

  // Drawer
  drawerBackdrop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawerBackdropTouch: { flex: 1, height: "100%" },
  drawerPanel: {
    height: "100%",
    maxWidth: 650,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHeader: {
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  drawerCloseBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  drawerScroll: { flex: 1, backgroundColor: COLORS.bg },

  // Root cause modal
  rcBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  rcPanel: {
    maxHeight: "92%",
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  rcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  rcTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  rcSubtitle: { marginTop: 2, fontSize: 11, color: COLORS.textMuted },
  rcCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});
