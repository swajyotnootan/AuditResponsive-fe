import { useAuth } from "@/components/context/AuthContext";
import { getNavigationByRole } from "@/config/navigation.config";
import { LinearGradient } from "expo-linear-gradient";
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import * as Icons from "lucide-react-native";
import React from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTodayWorkPopup } from "../context/TodayWorkPopupContext";

interface SmartNavigatorProps {
  type: "drawer" | "tabs";
  onClose?: () => void;
}

export default function SmartNavigator({ type, onClose }: SmartNavigatorProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const { open: openTodayWork } = useTodayWorkPopup();

  if (!user) return null;
  const navigationItems = getNavigationByRole(user.role);

  const handleNavigation = (item: any) => {
    onClose?.();
    if (item.route?.includes("today-work")) {
      openTodayWork(0);
      return;
    }
    router.push(item.route as any);
  };

  const handleLogout = async () => {
    onClose?.();
    try {
      await logout();
      router.replace("/auth/login" as any);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getBaseRoute = (route: string) => {
    const base = route.split("?")[0];
    const clean = base.replace(/\([^)]*\)\//g, "");
    return clean;
  };

  const getParam = (key: string) => {
    const p = params as any;
    if (p[key]) return Array.isArray(p[key]) ? p[key][0] : p[key];
    const gp = globalParams as any;
    if (gp[key]) return Array.isArray(gp[key]) ? gp[key][0] : gp[key];
    if (p.params && typeof p.params === "object") {
      if (p.params[key])
        return Array.isArray(p.params[key]) ? p.params[key][0] : p.params[key];
      if (
        p.params.params &&
        typeof p.params.params === "object" &&
        p.params.params[key]
      ) {
        return Array.isArray(p.params.params[key])
          ? p.params.params[key][0]
          : p.params.params[key];
      }
    }
    if (pathname) {
      const match = pathname.match(new RegExp(`[?&]${key}=([^&]+)`));
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location
    ) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has(key)) return urlParams.get(key);
      } catch (e) {}
    }
    return undefined;
  };

  const isFirstTab = (tab: string): boolean =>
    ["dashboard", "overview", "my-audits", "audits"].includes(tab);

  const isActive = (item: any): boolean => {
    const currentPath = "/" + segments.filter(Boolean).join("/");
    const itemBaseRoute = getBaseRoute(item.route);
    const currentTab = getParam("tab");
    const currentSection = getParam("section");

    if (item.action) {
      const routeMatches =
        currentPath === itemBaseRoute || currentPath.includes(itemBaseRoute);
      const sectionMatches = String(currentSection) === String(item.action);
      return routeMatches && sectionMatches;
    }
    if (item.tab) {
      const routeMatches =
        currentPath === itemBaseRoute || currentPath.includes(itemBaseRoute);
      const tabMatches = String(currentTab) === String(item.tab);
      if (
        routeMatches &&
        !currentTab &&
        !currentSection &&
        isFirstTab(item.tab)
      )
        return true;
      return routeMatches && tabMatches;
    }
    if (item.route === "/(app)/(tabs)/calendar")
      return currentPath === "/calendar" || currentPath.includes("/calendar");
    if (
      item.route === "/(app)/(tabs)" ||
      item.route === "/(app)/(tabs)/" ||
      item.route === "/"
    ) {
      const isHomeRoute =
        currentPath === "/" ||
        currentPath === "" ||
        currentPath === "/(app)/(tabs)";
      if (isHomeRoute) return true;
      if (currentPath !== "/" && !currentTab && !currentSection) {
        const otherItemsMatch = navigationItems.some((otherItem: any) => {
          if (otherItem.route === item.route) return false;
          const otherBaseRoute = getBaseRoute(otherItem.route);
          return currentPath.includes(otherBaseRoute) && otherBaseRoute !== "/";
        });
        if (!otherItemsMatch) return true;
      }
      return false;
    }
    if (currentPath === itemBaseRoute) return true;
    if (currentPath.includes(itemBaseRoute) && itemBaseRoute !== "/") {
      if (!currentTab && !currentSection) return true;
    }
    return false;
  };

  const getIcon = (iconName: string) => {
    const iconMap: any = {
      Home: Icons.Home,
      Award: Icons.Award,
      Calendar: Icons.Calendar,
      Sun: Icons.Sun,
      CheckCircle: Icons.CheckCircle,
      Users: Icons.Users,
      Building: Icons.Building,
      MessageCircle: Icons.MessageCircle,
      BarChart: Icons.BarChart,
      ClipboardCheck: Icons.ClipboardCheck,
      FileText: Icons.FileText,
      AlertTriangle: Icons.AlertTriangle,
      Shield: Icons.Shield,
      Settings: Icons.Settings,
      Star: Icons.Star,
      TrendingUp: Icons.TrendingUp,
      UserCheck: Icons.UserCheck,
      AlertCircle: Icons.AlertCircle,
      PlusCircle: Icons.PlusCircle,
      Globe: Icons.Globe,
      GraduationCap: Icons.GraduationCap,
      LayoutGrid: Icons.LayoutGrid,
      Folder: Icons.Folder,
      ClipboardList: Icons.ClipboardList,
      MessageSquare: Icons.MessageSquare,
      Factory: Icons.Factory,
      ListChecks: Icons.ListChecks,
      CheckSquare: Icons.CheckSquare,
      BarChart2: Icons.BarChart2,
      Activity: Icons.Activity,
      FilePlus: Icons.FilePlus,
      LogOut: Icons.LogOut,
      Search: Icons.Search,
      List: Icons.List,
    };
    return iconMap[iconName] || Icons.Circle;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRightWidth: 1,
        borderRightColor: "#E2E8F0",
        width: 260,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <LinearGradient
            colors={["#1E3A8A", "#1D4ED8"]} // Dark Navy to Blue
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 12,
            }}
          >
            <Icons.LayoutGrid size={20} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#0F172A",
                lineHeight: 20,
                letterSpacing: -0.3,
              }}
            >
              {user.role
                .split("_")
                .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                .join(" ")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#64748B",
                marginTop: 2,
                fontWeight: "500",
              }}
            >
              Management Console
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView
        style={{ flex: 1, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {navigationItems.map((item: any, index: number) => {
          const IconComponent = getIcon(item.icon);
          const active = isActive(item);

          return (
            <TouchableOpacity
              key={`${item.route}-${item.tab || item.action || index}`}
              onPress={() => handleNavigation(item)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginHorizontal: 12,
                marginBottom: 4,
                borderRadius: 10,
                backgroundColor: active ? "#EFF6FF" : "transparent",
                borderLeftWidth: active ? 3 : 0,
                borderLeftColor: active ? "#2563EB" : "transparent",
              }}
            >
              <View
                style={{
                  padding: 6,
                  borderRadius: 8,
                  backgroundColor: active ? "transparent" : "transparent",
                }}
              >
                <IconComponent
                  size={18}
                  color={active ? "#1D4ED8" : "#64748B"}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </View>
              <Text
                style={{
                  marginLeft: 12,
                  fontSize: 14,
                  flex: 1,
                  color: active ? "#1D4ED8" : "#475569",
                  fontWeight: active ? "600" : "500",
                }}
              >
                {item.title}
              </Text>
              {item.badge && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: active ? "#2563EB" : "#EF4444",
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    !
                  </Text>
                </View>
              )}
              {active && (
                <Icons.ChevronRight
                  size={16}
                  color="#1D4ED8"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Security */}
      <TouchableOpacity
        onPress={() => {
          onClose?.();
          router.push("/(app)/settings/security" as any);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginHorizontal: 12,
          marginBottom: 4,
          borderRadius: 10,
          backgroundColor: "transparent",
        }}
        activeOpacity={0.7}
      >
        <View style={{ padding: 6, borderRadius: 8 }}>
          <Icons.Shield size={18} color="#64748B" strokeWidth={1.5} />
        </View>
        <Text
          style={{
            marginLeft: 12,
            fontSize: 14,
            fontWeight: "600",
            color: "#475569",
          }}
        >
          Security
        </Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginHorizontal: 12,
          marginBottom: 16,
          borderRadius: 10,
          backgroundColor: "transparent",
        }}
        activeOpacity={0.7}
      >
        <View style={{ padding: 6, borderRadius: 8 }}>
          <Icons.LogOut size={18} color="#EF4444" strokeWidth={1.5} />
        </View>
        <Text
          style={{
            marginLeft: 12,
            fontSize: 14,
            fontWeight: "600",
            color: "#EF4444",
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>

      <View
        style={{ paddingHorizontal: 20, paddingVertical: 8, marginBottom: 8 }}
      >
        <Text
          style={{
            fontSize: 11,
            textAlign: "center",
            color: "#CBD5E1",
            fontWeight: "500",
          }}
        >
          v2.0.1
        </Text>
      </View>
    </View>
  );
}
