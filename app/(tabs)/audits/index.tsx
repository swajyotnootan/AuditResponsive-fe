import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Audit {
  id: string;
  title: string;
  client: string;
  status: "in-progress" | "completed" | "overdue" | "pending-review";
  priority: "high" | "medium" | "low";
  dueDate: string;
  progress: number;
  assignedTo: string;
  findings: number;
}

const mockAudits: Audit[] = [
  {
    id: "1",
    title: "Financial Audit - Q4 2024",
    client: "Tech Innovations Inc.",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-02-15",
    progress: 65,
    assignedTo: "John Doe",
    findings: 12,
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
    findings: 8,
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
    findings: 4,
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
    findings: 16,
  },
  {
    id: "5",
    title: "Environmental Impact Audit",
    client: "Eco Systems Inc.",
    status: "in-progress",
    priority: "low",
    dueDate: "2024-03-01",
    progress: 30,
    assignedTo: "John Doe",
    findings: 6,
  },
  {
    id: "6",
    title: "HR Compliance Review",
    client: "People First Corp",
    status: "pending-review",
    priority: "medium",
    dueDate: "2024-02-28",
    progress: 85,
    assignedTo: "Jane Smith",
    findings: 10,
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

export default function AuditsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const statuses = [
    "all",
    "in-progress",
    "pending-review",
    "completed",
    "overdue",
  ];
  const priorities = ["all", "high", "medium", "low"];

  const filteredAudits = mockAudits.filter((audit) => {
    const matchesSearch =
      audit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || audit.status === selectedStatus;
    const matchesPriority =
      selectedPriority === "all" || audit.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const renderAudit = ({ item }: { item: Audit }) => (
    <TouchableOpacity
      className="mb-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      onPress={() => router.push(`/audits/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-base font-semibold text-gray-800">
            {item.title}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            <Feather name="briefcase" size={12} color="#6B7280" /> {item.client}
          </Text>

          <View className="mt-2 flex-row items-center">
            <View
              className={`rounded-full px-2 py-0.5 ${getStatusColor(item.status)}`}
            >
              <Text className="text-xs font-medium capitalize">
                {item.status.replace("-", " ")}
              </Text>
            </View>
            <View
              className={`ml-2 rounded-full px-2 py-0.5 ${getPriorityColor(item.priority)}`}
            >
              <Text className="text-xs font-medium capitalize">
                {item.priority}
              </Text>
            </View>
            <Text className="ml-2 text-xs text-gray-400">
              <Feather name="calendar" size={10} color="#9CA3AF" />{" "}
              {item.dueDate}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center">
            <Text className="mr-2 text-xs text-gray-400">Progress</Text>
            <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
              <View
                className={`h-full rounded-full ${item.progress === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${item.progress}%` }}
              />
            </View>
            <Text className="ml-2 text-xs text-gray-400">{item.progress}%</Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-xs text-gray-400">
            {item.findings} findings
          </Text>
          <View className="mt-1 flex-row items-center">
            <Feather name="user" size={12} color="#9CA3AF" />
            <Text className="ml-1 text-xs text-gray-400">
              {item.assignedTo.split(" ")[0]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">All Audits</Text>
          <TouchableOpacity
            className="rounded-full bg-primary/10 p-2"
            onPress={() => router.push("/create" as any)}
          >
            <Feather name="plus" size={24} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="mb-4 flex-row items-center rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          <Feather
            name="search"
            size={20}
            color="#9CA3AF"
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            className="flex-1 p-2 text-base text-gray-800"
            placeholder="Search audits, clients..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            className="px-2"
          >
            <Feather name="sliders" size={20} color="#6C63FF" />
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="px-2"
            >
              <Feather name="x" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              className={`mr-2 rounded-full px-4 py-2 ${
                selectedStatus === status
                  ? "bg-primary"
                  : "border border-gray-200 bg-white"
              }`}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                className={`capitalize ${
                  selectedStatus === status ? "text-white" : "text-gray-600"
                }`}
              >
                {status === "all" ? "All" : status.replace("-", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredAudits}
        renderItem={renderAudit}
        keyExtractor={(item) => item.id}
        className="px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <Feather name="clipboard" size={48} color="#D1D5DB" />
            <Text className="mt-4 text-center text-gray-500">
              No audits found
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-full bg-primary px-6 py-3"
              onPress={() => router.push("/create" as any)}
            >
              <Text className="font-semibold text-white">Create New Audit</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-800">Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Priority
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {priorities.map((priority) => (
                <TouchableOpacity
                  key={priority}
                  className={`mr-2 rounded-full px-4 py-2 ${
                    selectedPriority === priority ? "bg-primary" : "bg-gray-100"
                  }`}
                  onPress={() => setSelectedPriority(priority)}
                >
                  <Text
                    className={`capitalize ${
                      selectedPriority === priority
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {priority === "all" ? "All" : priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-xl bg-gray-200 p-3"
                onPress={() => {
                  setSelectedStatus("all");
                  setSelectedPriority("all");
                }}
              >
                <Text className="text-center font-semibold text-gray-700">
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl bg-primary p-3"
                onPress={() => setShowFilters(false)}
              >
                <Text className="text-center font-semibold text-white">
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
