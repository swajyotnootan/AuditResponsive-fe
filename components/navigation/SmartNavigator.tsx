import { useAuth } from "@/components/context/AuthContext";
import { getNavigationByRole } from "@/config/navigation.config";
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import * as Icons from "lucide-react-native";
import React from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

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

  if (!user) return null;

  const navigationItems = getNavigationByRole(user.role);

  const handleNavigation = (item: any) => {
    onClose?.();
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

  // ✅ Extract the base route from URL
  const getBaseRoute = (route: string) => {
    const base = route.split("?")[0];
    const clean = base.replace(/\([^)]*\)\//g, "");
    return clean;
  };

  // ✅ Extract tab/section from URL
  const getParam = (key: string) => {
    const p = params as any;
    
    if (p[key]) return Array.isArray(p[key]) ? p[key][0] : p[key];
    
    if (p.params && typeof p.params === "object") {
      if (p.params[key]) {
        return Array.isArray(p.params[key]) ? p.params[key][0] : p.params[key];
      }
      if (p.params.params && typeof p.params.params === "object") {
        if (p.params.params[key]) {
          return Array.isArray(p.params.params[key]) 
            ? p.params.params[key][0] 
            : p.params.params[key];
        }
      }
    }
    
    // ✅ Only on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has(key)) {
          return urlParams.get(key);
        }
      } catch (e) {
        // Ignore URL parsing errors on native
      }
    }
    
    return undefined;
  };

  // ✅ Helper to check if this is a "first tab" (should be active when no tab is selected)
  const isFirstTab = (tab: string): boolean => {
    const firstTabs = ["dashboard", "overview", "my-audits", "audits"];
    return firstTabs.includes(tab);
  };

  // ✅ FIXED: Robust isActive function that works on both web and Android
  const isActive = (item: any): boolean => {
    const currentPath = "/" + segments.filter(Boolean).join("/");
    const itemBaseRoute = getBaseRoute(item.route);
    const currentTab = getParam("tab");
    const currentSection = getParam("section");

    // ✅ For Master role with section param
    if (item.action) {
      const routeMatches = currentPath === itemBaseRoute || 
                           currentPath.includes(itemBaseRoute);
      const sectionMatches = String(currentSection) === String(item.action);
      return routeMatches && sectionMatches;
    }

    // ✅ For roles with tab param (Auditor, Lead Auditor, Audit Manager, etc.)
    if (item.tab) {
      const routeMatches = currentPath === itemBaseRoute || 
                           currentPath.includes(itemBaseRoute);
      const tabMatches = String(currentTab) === String(item.tab);
      
      // ✅ FIX: On Android, when there's no tab param, the first tab should be active
      // This preserves web behavior while fixing Android
      if (routeMatches && !currentTab && !currentSection && isFirstTab(item.tab)) {
        return true;
      }
      
      return routeMatches && tabMatches;
    }

    // ✅ For Calendar and other simple routes
    if (item.route === "/(app)/(tabs)/calendar") {
      return currentPath === "/calendar" || currentPath.includes("/calendar");
    }

    // ✅ For Dashboard (Home) - preserves existing logic
    if (item.route === "/(app)/(tabs)" || item.route === "/(app)/(tabs)/" || item.route === "/") {
      const isHomeRoute = currentPath === "/" || currentPath === "" || currentPath === "/(app)/(tabs)";
      if (isHomeRoute) {
        return true;
      }
      if (currentPath !== "/" && !currentTab && !currentSection) {
        const otherItemsMatch = navigationItems.some((otherItem: any) => {
          if (otherItem.route === item.route) return false;
          const otherBaseRoute = getBaseRoute(otherItem.route);
          return currentPath.includes(otherBaseRoute) && otherBaseRoute !== "/";
        });
        if (!otherItemsMatch) {
          return true;
        }
      }
      return false;
    }

    // ✅ Default: exact path match
    if (currentPath === itemBaseRoute) {
      return true;
    }

    // ✅ Partial match for nested routes
    if (currentPath.includes(itemBaseRoute) && itemBaseRoute !== "/") {
      if (!currentTab && !currentSection) {
        return true;
      }
    }

    return false;
  };

  const getIcon = (iconName: string) => {
    const iconMap: any = {
      Home: Icons.Home,
      Award: Icons.Award,
      Calendar: Icons.Calendar,
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

  // ✅ Debug logs (remove in production)
  console.log("📍 Current path:", "/" + segments.filter(Boolean).join("/"));
  console.log("📍 Current tab:", getParam("tab"));
  console.log("📍 Current section:", getParam("section"));
  console.log("📍 User role:", user.role);

  return (
    <View
      style={{ 
        flex: 1, 
        backgroundColor: '#FFFFFF', 
        borderRightWidth: 1, 
        borderRightColor: '#E2E8F0',
        width: 256 
      }}
    >
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingTop: 24, 
        paddingBottom: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
              borderRadius: 12,
              backgroundColor: '#2563EB',
            }}
          >
            <Icons.LayoutGrid size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: '#1E293B',
              lineHeight: 20
            }}>
              {user.role
                .split("_")
                .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                .join(" ")}
            </Text>
            <Text style={{ 
              fontSize: 12, 
              color: '#64748B',
              marginTop: 2 
            }}>
              Management Console
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView style={{ flex: 1, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        {navigationItems.map((item: any, index: number) => {
          const IconComponent = getIcon(item.icon);
          const active = isActive(item);
          
          console.log(`📌 ${item.title}: active=${active}, tab=${item.tab || 'none'}, action=${item.action || 'none'}`);

          return (
            <TouchableOpacity
              key={`${item.route}-${item.tab || item.action || index}`}
              onPress={() => handleNavigation(item)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginHorizontal: 12,
                marginBottom: 8,
                borderRadius: 12,
                backgroundColor: active ? "#2563EB" : "transparent",
                shadowColor: active ? "#2563EB" : "transparent",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: active ? 0.3 : 0,
                shadowRadius: 6,
                elevation: active ? 4 : 0,
              }}
            >
              {/* Icon Container */}
              <View
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: active
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
                }}
              >
                <IconComponent
                  size={20}
                  color={active ? "#FFFFFF" : "#64748b"}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </View>

              {/* Title */}
              <Text
                style={{
                  marginLeft: 12,
                  fontSize: 14,
                  flex: 1,
                  color: active ? "#FFFFFF" : "#64748b",
                  fontWeight: active ? "600" : "400",
                }}
              >
                {item.title}
              </Text>

              {/* Badge */}
              {item.badge && (
                <View
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: active
                      ? "rgba(255,255,255,0.3)"
                      : "#EF4444",
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

              {/* Active Chevron */}
              {active && (
                <View style={{ marginLeft: 8 }}>
                  <Icons.ChevronRight size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
          borderRadius: 12,
          backgroundColor: "transparent",
        }}
        activeOpacity={0.7}
      >
        <View style={{ padding: 8, borderRadius: 8 }}>
          <Icons.LogOut size={20} color="#ef4444" strokeWidth={1.5} />
        </View>
        <Text style={{ 
          marginLeft: 12, 
          fontSize: 14, 
          fontWeight: '600', 
          color: '#ef4444' 
        }}>Logout</Text>
      </TouchableOpacity>

      <View style={{ paddingHorizontal: 20, paddingVertical: 8, marginBottom: 8 }}>
        <Text style={{ 
          fontSize: 12, 
          textAlign: 'center', 
          color: '#D1D5DB' 
        }}>v2.0.1</Text>
      </View>
    </View>
  );
}