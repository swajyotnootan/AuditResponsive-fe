import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
interface AuditStats {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  pendingReview: number;
}

interface RecentAudit {
  id: string;
  title: string;
  client: string;
  status: "in-progress" | "completed" | "overdue" | "pending-review";
  priority: "high" | "medium" | "low";
  dueDate: string;
  progress: number;
  assignedTo: string;
}

// Mock Data
const mockStats: AuditStats = {
  total: 24,
  inProgress: 8,
  completed: 12,
  overdue: 2,
  pendingReview: 2,
};

const recentAudits: RecentAudit[] = [
  {
    id: "1",
    title: "Financial Audit - Q4 2024",
    client: "Tech Innovations Inc.",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-02-15",
    progress: 65,
    assignedTo: "John Doe",
  },
  {
    id: "2",
    title: "ISO 9001 Compliance Audit",
    client: "Global Manufacturing Co.",
    status: "pending-review",
    priority: "high",
    dueDate: "2024-02-10",
    progress: 90,
    assignedTo: "Jane Smith",
  },
  {
    id: "3",
    title: "Annual Financial Review",
    client: "Startup Ventures LLC",
    status: "completed",
    priority: "medium",
    dueDate: "2024-01-30",
    progress: 100,
    assignedTo: "Mike Johnson",
  },
  {
    id: "4",
    title: "IT Security Assessment",
    client: "Cloud Systems Corp",
    status: "overdue",
    priority: "high",
    dueDate: "2024-01-20",
    progress: 45,
    assignedTo: "Sarah Wilson",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-50 border-green-200";
    case "in-progress":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "pending-review":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "overdue":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    case "low":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats] = useState<AuditStats>(mockStats);
  const [audits] = useState<RecentAudit[]>(recentAudits);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const navigateToAudit = (id: string) => {
    router.push(`/audits/${id}` as any);
  };

  const navigateToCreateAudit = () => {
    router.push("/create" as any);
  };

  const navigateToAudits = () => {
    router.push("/audits" as any);
  };

  const renderAuditCard = ({ item }: { item: RecentAudit }) => (
    <TouchableOpacity
      className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      onPress={() => navigateToAudit(item.id)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="mb-1 flex-row items-center">
            <Text className="flex-1 text-sm font-semibold text-gray-800">
              {item.title}
            </Text>
            <View
              className={`rounded-full px-2 py-0.5 ${getPriorityColor(item.priority)}`}
            >
              <Text className="text-xs font-medium capitalize">
                {item.priority}
              </Text>
            </View>
          </View>

          <Text className="mb-2 text-xs text-gray-500">
            <Feather name="briefcase" size={12} color="#6B7280" /> {item.client}
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className={`rounded-full px-2 py-0.5 ${getStatusColor(item.status)}`}
              >
                <Text className="text-xs font-medium capitalize">
                  {item.status.replace("-", " ")}
                </Text>
              </View>
              <Text className="ml-2 text-xs text-gray-400">
                <Feather name="calendar" size={10} color="#9CA3AF" />{" "}
                {item.dueDate}
              </Text>
            </View>
            <Text className="text-xs text-gray-400">{item.progress}%</Text>
          </View>

          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <View
              className={`h-full rounded-full ${
                item.progress === 100 ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${item.progress}%` }}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({
    icon,
    label,
    value,
    color,
    bgColor,
  }: {
    icon: string;
    label: string;
    value: number;
    color: string;
    bgColor: string;
  }) => (
    <View className="w-[30%] items-center rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <View
        className={`h-10 w-10 ${bgColor} mb-1 items-center justify-center rounded-full`}
      >
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text className="text-xl font-bold text-gray-800">{value}</Text>
      <Text className="text-center text-xs text-gray-500">{label}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#6C63FF", "#8B83FF"]}
          className="mb-5 rounded-3xl p-6"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-sm font-medium text-white/80">
                {greeting} 👋
              </Text>
              <Text className="mt-1 text-2xl font-bold text-white">
                John Doe
              </Text>
              <Text className="mt-1 text-sm text-white/70">
                Audit Manager • 24 audits
              </Text>
            </View>
            <View className="rounded-full bg-white/20 p-3">
              <Feather name="user" size={24} color="white" />
            </View>
          </View>

          <View className="mt-4 flex-row justify-between border-t border-white/10 pt-4">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center"
              onPress={navigateToCreateAudit}
            >
              <Feather name="plus-circle" size={20} color="white" />
              <Text className="ml-2 text-sm font-semibold text-white">
                New Audit
              </Text>
            </TouchableOpacity>
            <View className="w-px bg-white/20" />
            <TouchableOpacity className="flex-1 flex-row items-center justify-center">
              <Feather name="upload" size={20} color="white" />
              <Text className="ml-2 text-sm font-semibold text-white">
                Import
              </Text>
            </TouchableOpacity>
            <View className="w-px bg-white/20" />
            <TouchableOpacity className="flex-1 flex-row items-center justify-center">
              <Feather name="download" size={20} color="white" />
              <Text className="ml-2 text-sm font-semibold text-white">
                Export
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View className="mb-5 flex-row justify-between">
          <StatCard
            icon="clipboard"
            label="Total"
            value={stats.total}
            color="#6C63FF"
            bgColor="bg-primary/10"
          />
          <StatCard
            icon="clock"
            label="In Progress"
            value={stats.inProgress}
            color="#3B82F6"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon="check-circle"
            label="Completed"
            value={stats.completed}
            color="#10B981"
            bgColor="bg-green-50"
          />
        </View>

        <View className="mb-5 flex-row justify-between">
          <StatCard
            icon="alert-circle"
            label="Overdue"
            value={stats.overdue}
            color="#EF4444"
            bgColor="bg-red-50"
          />
          <StatCard
            icon="user-check"
            label="In Review"
            value={stats.pendingReview}
            color="#F59E0B"
            bgColor="bg-yellow-50"
          />
          <View className="w-[30%] items-center rounded-2xl border border-gray-100 bg-white p-3 opacity-0 shadow-sm">
            <Text className="text-xl font-bold">0</Text>
            <Text className="text-xs text-gray-500">Placeholder</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-5 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 p-4"
            onPress={navigateToCreateAudit}
          >
            <Feather name="file-plus" size={20} color="#6C63FF" />
            <Text className="ml-2 font-semibold text-primary">New Audit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-gray-200 p-4"
            onPress={navigateToAudits}
          >
            <Feather name="filter" size={20} color="#4B5563" />
            <Text className="ml-2 font-semibold text-gray-700">Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Audits */}
        <View className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-800">
              Recent Audits
            </Text>
            <TouchableOpacity onPress={navigateToAudits}>
              <Text className="text-sm font-semibold text-primary">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={audits}
            renderItem={renderAuditCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Feather name="clipboard" size={48} color="#D1D5DB" />
                <Text className="mt-4 text-center text-gray-500">
                  No audits found
                </Text>
              </View>
            }
          />
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
