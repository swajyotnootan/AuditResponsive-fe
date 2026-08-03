import { useAuth } from "@/components/context/AuthContext";
import { getNavigationByRole } from "@/config/navigation.config";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
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
  const pathname = usePathname();
  const params = useLocalSearchParams();
 
  if (!user) return null;
 
  const navigationItems = getNavigationByRole(user.role);
 
  // ✅ EXACT LEAD AUDITOR PATTERN - Simple router.push
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
 
  // ✅ EXACT LEAD AUDITOR PATTERN - Simple active check
  const isActive = (item: any) => {
    const baseRoute = item.route.split("?")[0];
 
    if (item.tab) {
      return pathname === baseRoute && params?.tab === item.tab;
    }
 
    if (baseRoute === "/(app)/(tabs)") {
      return (
        (pathname === "/(app)/(tabs)" || pathname === "/(app)/(tabs)/") &&
        !params?.tab &&
        !params?.action &&
        !params?.section
      );
    }
 
    return pathname === baseRoute || pathname.startsWith(baseRoute + "/");
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
      <View className="px-5 pt-6 pb-4 border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-900">Qsutra</Text>
        <Text className="text-xs text-slate-500">Quality Management</Text>
      </View>
 
      <ScrollView className="flex-1 pt-2">
        {navigationItems.map((item, index) => {
          const IconComponent = getIcon(item.icon);
          const active = isActive(item);
 
          return (
            <TouchableOpacity
              key={`${item.route}-${item.tab || index}`}
              onPress={() => handleNavigation(item)}
              className={`flex-row items-center px-5 py-3 mx-3 rounded-lg mb-0.5 ${
                active
                  ? "bg-blue-50 border-l-4 border-blue-600"
                  : "border-l-4 border-transparent"
              }`}
              activeOpacity={0.7}
            >
              <View
                className={`p-1.5 rounded-lg ${active ? "bg-blue-100" : ""}`}
              >
                <IconComponent
                  size={20}
                  color={active ? "#00529B" : "#64748b"}
                  strokeWidth={active ? 2 : 1.5}
                />
              </View>
              <Text
                className={`ml-3 text-sm flex-1 ${active ? "text-blue-900 font-semibold" : "text-slate-600"}`}
              >
                {item.title}
              </Text>
              {item.badge && (
                <View className="items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                  <Text className="text-xs font-bold text-white">!</Text>
                </View>
              )}
              {active && (
                <View className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-2" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
 
      <TouchableOpacity
        onPress={handleLogout}
        className="flex-row items-center px-5 py-4 border-t border-slate-100 active:bg-red-50"
        activeOpacity={0.7}
      >
        <Icons.LogOut size={20} color="#ef4444" strokeWidth={1.5} />
        <Text className="ml-3 text-sm font-medium text-red-500">Logout</Text>
      </TouchableOpacity>
 
      <View className="px-5 py-2">
        <Text className="text-xs text-center text-gray-300">v2.0.1</Text>
      </View>
    </View>
  );
}
 
 