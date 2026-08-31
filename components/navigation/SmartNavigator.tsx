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
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

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

  const isActive = (item: any) => {
    const itemBaseRoute = item.route.split("?")[0];
    const currentPath = "/" + segments.filter(Boolean).join("/");

    // ✅ ROBUST PARAM EXTRACTION: Digs through deeply nested Expo Router params
    const getParam = (key: string) => {
      const p = params as any;

      // Level 1: Direct param
      if (p[key]) return Array.isArray(p[key]) ? p[key][0] : p[key];

      // Level 2: Nested inside params.params
      if (p.params && typeof p.params === "object") {
        if (p.params[key])
          return Array.isArray(p.params[key])
            ? p.params[key][0]
            : p.params[key];

        // Level 3: Deeply nested (common in Modals/Drawers)
        if (p.params.params && typeof p.params.params === "object") {
          if (p.params.params[key])
            return Array.isArray(p.params.params[key])
              ? p.params.params[key][0]
              : p.params.params[key];
        }
      }
      return undefined;
    };

    const currentTab = getParam("tab");
    const currentSection = getParam("section");

    // Optional: Uncomment to verify it finally found the tab!
    // console.log(`[Check] ${item.title} | Path: ${currentPath} | Tab: ${currentTab} === ${item.tab}`);

    // 1. Tab-based navigation
    if (item.tab) {
      const pathMatch = currentPath.includes(itemBaseRoute);
      const tabMatch = String(currentTab) === String(item.tab);
      return pathMatch && tabMatch;
    }

    // 2. Section-based navigation
    if (item.action) {
      const pathMatch = currentPath.includes(itemBaseRoute);
      const sectionMatch = String(currentSection) === String(item.action);
      return pathMatch && sectionMatch;
    }

    // 3. Regular routes
    return currentPath.includes(itemBaseRoute);
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
    };
    return iconMap[iconName] || Icons.Circle;
  };

  return (
    <View
      className="flex-1 bg-white border-r border-slate-200"
      style={{ width: 256 }}
    >
      {/* Header */}
      <View className="px-5 pt-6 pb-5 border-b border-slate-100">
        <View className="flex-row items-center gap-3">
          <View
            className="items-center justify-center w-10 h-10 shadow-md rounded-xl"
            style={{ backgroundColor: "#2563EB" }}
          >
            <Icons.LayoutGrid size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold leading-tight text-slate-800">
              {user.role
                .split("_")
                .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                .join(" ")}
            </Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              Management Console
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView className="flex-1 pt-2" showsVerticalScrollIndicator={false}>
        {navigationItems.map((item, index) => {
          const IconComponent = getIcon(item.icon);
          const active = isActive(item);

          return (
            <TouchableOpacity
              key={`${item.route}-${item.tab || index}`}
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
                // ✅ Exact match to React web active state
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
        className="flex-row items-center px-4 py-3 mx-3 mb-4 rounded-xl"
        style={{ backgroundColor: "transparent" }}
        activeOpacity={0.7}
      >
        <View className="p-2 rounded-lg">
          <Icons.LogOut size={20} color="#ef4444" strokeWidth={1.5} />
        </View>
        <Text className="ml-3 text-sm font-semibold text-red-500">Logout</Text>
      </TouchableOpacity>

      <View className="px-5 py-2 mb-2">
        <Text className="text-xs text-center text-gray-300">v2.0.1</Text>
      </View>
    </View>
  );
}
