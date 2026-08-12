import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  LucideIcon,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

// ==================== TYPES & INTERFACES ====================

interface NavbarColors {
  primary1: string;
  primary: string;
  secondary: string;
  dark: string;
  light: string;
  lighter: string;
  bg: string;
  white: string;
}

interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: string;
}

interface PriorityConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
  icon: string;
}

interface StatusBadgeProps {
  status?: string;
}

interface PriorityBadgeProps {
  priority?: string;
}

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

interface EightDCardProps {
  report: Report;
  onClick: () => void;
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  colorTheme: "primary" | "secondary";
  onClick: () => void;
}

interface ThemeConfig {
  cardBg: [string, string];
  iconOuterBg: string;
  iconBg: [string, string];
  iconColor: string;
  buttonBg: [string, string];
  buttonText: string;
  borderColor: string;
  titleColor: string;
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

// ==================== CONSTANTS ====================

const NAVBAR_COLORS: NavbarColors = {
  primary1: "#005f9b",
  primary: "#00799b",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const { width } = Dimensions.get("window");
const isTablet = width > 768;
const cardWidth = isTablet ? "32%" : "100%";

// ==================== STYLES ====================

const styles = StyleSheet.create({
  // Base
  safeArea: {
    flex: 1,
    backgroundColor: "#eff6ff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    maxWidth: 1280,
    alignSelf: "center",
    width: "100%",
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  headerTitle: {
    paddingHorizontal: 8,
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
    color: NAVBAR_COLORS.primary1,
  },
  headerSubtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 8,
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 48,
  },
  existingReportsTitle: {
    marginBottom: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 14,
  },

  // Action Card
  actionCardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
  actionCardBody: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
  } as ViewStyle,
  actionCardInner: {
    flex: 1,
    flexDirection: "column",
  } as ViewStyle,
  actionIconOuter: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  actionIconInner: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 12,
  } as ViewStyle,
  actionTitleContainer: {
    flexGrow: 1,
    marginBottom: 32,
  } as ViewStyle,
  actionTitle: {
    marginBottom: 12,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  } as TextStyle,
  actionDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    color: "#4b5563",
  } as TextStyle,
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  } as ViewStyle,
  actionButtonText: {
    fontSize: 16,
    fontWeight: "500",
  } as TextStyle,

  // 8D Card - COMPACT VERSION
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  } as ViewStyle,
  cardBody: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  } as ViewStyle,
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  } as ViewStyle,
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  badgesContainer: {
    gap: 6,
    alignItems: "flex-end",
  } as ViewStyle,
  categoryRow: {
    marginBottom: 10,
  } as ViewStyle,
  categoryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  } as ViewStyle,
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#faf5ff",
  } as ViewStyle,
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#9333ea",
    textTransform: "uppercase",
  } as TextStyle,
  departmentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#f3f4f6",
  } as ViewStyle,
  departmentText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6b7280",
  } as TextStyle,
  cardTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
    color: "#111827",
  } as TextStyle,
  cardDescription: {
    marginBottom: 12,
    fontSize: 11,
    lineHeight: 15,
    color: "#4b5563",
  } as TextStyle,
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  } as ViewStyle,
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  } as ViewStyle,
  metaLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#6b7280",
  } as TextStyle,
  metaValue: {
    fontSize: 10,
    color: "#6b7280",
  } as TextStyle,
  cardFooter: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  } as ViewStyle,
  initiatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as ViewStyle,
  initiatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9333ea",
  } as TextStyle,
  initiatorName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
  } as TextStyle,
  initiatorRole: {
    fontSize: 9,
    color: "#6b7280",
  } as TextStyle,
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  } as ViewStyle,
  continueButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  } as TextStyle,
});

// ==================== BADGES ====================

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status?: string): StatusConfig => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return {
          bg: "#f0fdf4",
          text: "#166534",
          border: "#bbf7d0",
          label: "Completed",
          icon: "✅",
        };
      case "IN_PROGRESS":
        return {
          bg: "#ecfeff",
          text: "#155e75",
          border: "#a5f3fc",
          label: "In Progress",
          icon: "🔄",
        };
      case "UNDER_REVIEW":
        return {
          bg: "#fefce8",
          text: "#854d0e",
          border: "#fde047",
          label: "Under Review",
          icon: "📋",
        };
      case "DRAFT":
        return {
          bg: "#f9fafb",
          text: "#1f2937",
          border: "#e5e7eb",
          label: "Draft",
          icon: "📝",
        };
      default:
        return {
          bg: "#f9fafb",
          text: "#1f2937",
          border: "#e5e7eb",
          label: status || "Draft",
          icon: "📄",
        };
    }
  };
  const config = getStatusConfig(status);

  const badgeStyle: ViewStyle = {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: config.border,
    backgroundColor: config.bg,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  };

  const textStyle: TextStyle = {
    fontSize: 9,
    fontWeight: "500",
    color: config.text,
  };

  return (
    <View style={badgeStyle}>
      <Text style={{ fontSize: 9 }}>{config.icon}</Text>
      <Text style={textStyle}>{config.label}</Text>
    </View>
  );
};

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityConfig = (priority?: string): PriorityConfig => {
    switch (priority?.toUpperCase()) {
      case "CRITICAL":
        return {
          bg: "#fef2f2",
          text: "#b91c1c",
          border: "#fecaca",
          label: "Critical",
          icon: "🔴",
        };
      case "HIGH":
        return {
          bg: "#fff7ed",
          text: "#c2410c",
          border: "#fed7aa",
          label: "High",
          icon: "🟠",
        };
      case "MEDIUM":
        return {
          bg: "#fefce8",
          text: "#a16207",
          border: "#fde047",
          label: "Medium",
          icon: "🟡",
        };
      case "LOW":
        return {
          bg: "#f0fdf4",
          text: "#15803d",
          border: "#bbf7d0",
          label: "Low",
          icon: "🟢",
        };
      default:
        return {
          bg: "#fefce8",
          text: "#a16207",
          border: "#fde047",
          label: "Medium",
          icon: "🟡",
        };
    }
  };
  const config = getPriorityConfig(priority);

  const badgeStyle: ViewStyle = {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: config.border,
    backgroundColor: config.bg,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  };

  const textStyle: TextStyle = {
    fontSize: 9,
    fontWeight: "500",
    color: config.text,
  };

  return (
    <View style={badgeStyle}>
      <Text style={{ fontSize: 9 }}>{config.icon}</Text>
      <Text style={textStyle}>{config.label}</Text>
    </View>
  );
};

// ==================== EIGHT D CARD ====================

const EightDCard: React.FC<EightDCardProps> = ({ report, onClick }) => {
  // ✅ 1. Normalize the status: convert to lowercase and remove all spaces
  // "in progress" -> "inprogress", "D0 Approved" -> "d0approved", "Approval Pending" -> "approvalpending"
  const statusLower = (report.status || "").toLowerCase().replace(/\s+/g, "");

  // ✅ 2. Check if it's an approved state (HOD has approved D0)
  const isD0Approved =
    statusLower.includes("inprogress") ||
    statusLower.includes("d0approved") ||
    statusLower.includes("completed") ||
    statusLower.includes("closed");

  // ✅ 3. Set Pending UI configurations based on the normalized status
  let pendingText = "Awaiting HOD Approval";
  let bgColor = "#fef3c7"; // amber-100
  let textColor = "#92400e"; // amber-800
  let borderColor = "#fcd34d"; // amber-300

  if (statusLower === "draft" || statusLower === "") {
    pendingText = "Draft - Not Submitted";
    bgColor = "#f3f4f6";
    textColor = "#4b5563";
    borderColor = "#d1d5db";
  } else if (statusLower === "rejected") {
    pendingText = "Rejected - Needs Revision";
    bgColor = "#fef2f2";
    textColor = "#991b1b";
    borderColor = "#fecaca";
  }

  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.8}
      style={[styles.cardWrapper, { width: cardWidth }]}
    >
      <LinearGradient
        colors={["#ffffff", "#faf5ff", "#fdf2f8"] as [string, string, string]}
        style={styles.cardBody}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={["#faf5ff", "#fdf2f8"] as [string, string]}
            style={styles.cardIcon}
          >
            <FileText size={20} color="#9333ea" />
          </LinearGradient>
          <View style={styles.badgesContainer}>
            <StatusBadge status={report?.status} />
            <PriorityBadge priority={report?.priority} />
          </View>
        </View>

        {/* Category and Department */}
        <View style={styles.categoryRow}>
          <View style={styles.categoryInner}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>8D Report</Text>
            </View>
            <View style={styles.departmentBadge}>
              <Text style={styles.departmentText}>
                {report?.department || "Quality"}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {report?.title || "8D Quality Report"}
        </Text>

        {/* Description */}
        <Text style={styles.cardDescription} numberOfLines={2}>
          {report?.problem ||
            report?.description ||
            "Create and manage 8D quality reports for continuous improvement and root cause analysis."}
        </Text>

        {/* Meta Information */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>ID:</Text>
            <Text style={styles.metaValue}>
              {report?.eventNo || report?.id || "N/A"}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.initiatorRow}>
            <View style={styles.initiatorInfo}>
              {/* Action button OR Pending State */}
              {isD0Approved ? (
                // ✅ SHOW IF APPROVED: Normal Continue Button
                <LinearGradient
                  colors={["#f3e8ff", "#fce7f3"] as [string, string]}
                  style={styles.continueButton}
                >
                  <Text style={styles.continueButtonText}>
                    Continue 8D Process
                  </Text>
                  <ChevronRight size={12} color="#334155" />
                </LinearGradient>
              ) : (
                // ✅ SHOW IF PENDING: Flat Status Indicator
                <View
                  style={[
                    styles.continueButton,
                    {
                      backgroundColor: bgColor,
                      borderWidth: 1,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[styles.continueButtonText, { color: textColor }]}
                  >
                    {pendingText}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.initiatorName}>Quality Team</Text>
                <Text style={styles.initiatorRole}>Initiator</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ==================== ACTION CARD ====================

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  colorTheme,
  onClick,
}) => {
  const themes: Record<string, ThemeConfig> = {
    primary: {
      cardBg: ["#eff6ff", "#ffffff"],
      iconOuterBg: "#eff6ff",
      iconBg: ["#93c5fd", "#60a5fa"],
      iconColor: "#ffffff",
      buttonBg: ["#eff6ff", "#93c5fd"],
      buttonText: "#00799b",
      borderColor: "#93c5fd",
      titleColor: "#111827",
    },
    secondary: {
      cardBg: ["#ffffff", "#eff6ff"],
      iconOuterBg: "#eff6ff",
      iconBg: ["#3b82f6", "#00799b"],
      iconColor: "#ffffff",
      buttonBg: ["#93c5fd", "#eff6ff"],
      buttonText: "#1e3a8a",
      borderColor: "#93c5fd",
      titleColor: "#111827",
    },
  };

  const theme: ThemeConfig = themes[colorTheme] || themes.primary;

  const wrapperStyle: ViewStyle = {
    ...styles.actionCardWrapper,
    width: isTablet ? "48%" : "100%",
  };

  const bodyStyle: ViewStyle = {
    ...styles.actionCardBody,
    borderColor: theme.borderColor,
  };

  const titleStyle: TextStyle = {
    ...styles.actionTitle,
    color: theme.titleColor,
  };

  const buttonTextStyle: TextStyle = {
    ...styles.actionButtonText,
    color: theme.buttonText,
  };

  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.7}
      style={wrapperStyle}
    >
      <LinearGradient colors={theme.cardBg} style={bodyStyle}>
        <View style={styles.actionCardInner}>
          {/* Icon */}
          <View style={styles.actionIconOuter}>
            <LinearGradient
              colors={theme.iconBg}
              style={styles.actionIconInner}
            >
              <Icon size={32} color={theme.iconColor} />
            </LinearGradient>
          </View>

          {/* Title & Description */}
          <View style={styles.actionTitleContainer}>
            <Text style={titleStyle}>{title}</Text>
            <Text style={styles.actionDescription}>{description}</Text>
          </View>

          {/* Button */}
          <LinearGradient colors={theme.buttonBg} style={styles.actionButton}>
            <Text style={buttonTextStyle}>Start Process</Text>
            <ChevronRight size={20} color={theme.buttonText} />
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ==================== INITIATOR DASHBOARD ====================

const InitiatorDashboard: React.FC<InitiatorDashboardProps> = ({ user }) => {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `${API_BASE_URL}/api/eightd/data?t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } },
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
                user?.name ||
                user?.email ||
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

  // Navigation handler matching the reference component
  const handleNavigate = (params: any) => {
    if (params.createNew) {
      // Navigate to LandingPage with type parameter
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
      // Continue with existing event - go to eightdflow
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.loaderText}>Loading 8D Reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>8D Quality Management</Text>
            <Text style={styles.headerSubtitle}>
              Select an option below to start or continue a problem-solving
              process
            </Text>
          </View>

          {/* Creation Options Grid */}
          <View style={styles.gridContainer}>
            <ActionCard
              title="Create Fresh 8D"
              description="Start a new 8D report from scratch for general quality issues, customer complaints, or internal improvements."
              icon={Zap}
              colorTheme="primary"
              onClick={() => handleNavigate({ createNew: true, type: "fresh" })}
            />
            <ActionCard
              title="NCR Based 8D"
              description="Convert an existing Non-Conformance Report (NCR) into an 8D problem-solving workflow immediately."
              icon={AlertTriangle}
              colorTheme="primary"
              onClick={() => handleNavigate({ createNew: true, type: "ncr" })}
            />
          </View>

          {/* Existing Reports Grid */}
          {reports.length > 0 && (
            <View>
              <Text style={styles.existingReportsTitle}>Existing Reports</Text>
              <View style={styles.reportsGrid}>
                {reports.map((report, index) => (
                  <EightDCard
                    key={report.id || index}
                    report={report}
                    onClick={() =>
                      handleNavigate({ selectedEventId: report.eventNo })
                    }
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default InitiatorDashboard;
