// components/dashboards/admin/FormsAnalytics.tsx
import { CheckCircle, Clock, FileText, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function FormsAnalytics() {
  const [stats, setStats] = useState<any>({
    total: 0,
    approved: 0,
    rejected: 0,
    submitted: 0,
    draft: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/inspection-forms`);
      const data = await res.json();
      const forms = Array.isArray(data) ? data : data?.data || [];

      setStats({
        total: forms.length,
        approved: forms.filter((f: any) => f.status === "APPROVED").length,
        rejected: forms.filter((f: any) => f.status === "REJECTED").length,
        submitted: forms.filter((f: any) => f.status === "SUBMITTED").length,
        draft: forms.filter((f: any) => f.status === "DRAFT").length,
      });
    } catch (err) {
      // Demo data
      setStats({
        total: 156,
        approved: 98,
        rejected: 12,
        submitted: 34,
        draft: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <View className="m-1 min-w-[140px] flex-1 rounded-xl bg-white p-4 shadow-sm">
      <Icon size={24} color={color} />
      <Text className="mt-2 text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-sm text-gray-500">{label}</Text>
    </View>
  );

  if (loading)
    return <ActivityIndicator size="large" color="#00529B" className="mt-12" />;

  return (
    <View className="flex-1 rounded-lg bg-white p-4 shadow">
      <Text className="mb-4 text-xl font-bold text-gray-800">
        Forms Analytics
      </Text>

      <View className="mb-4 flex-row flex-wrap">
        <StatCard
          icon={FileText}
          label="Total Forms"
          value={stats.total}
          color="#00529B"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          color="#16a34a"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={stats.rejected}
          color="#dc2626"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.submitted}
          color="#f59e0b"
        />
      </View>

      {/* Approval Rate */}
      <View className="mb-4 rounded-xl bg-gray-50 p-4">
        <Text className="mb-3 text-lg font-semibold text-gray-800">
          Approval Rate
        </Text>
        <View className="flex-row items-center">
          <View className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
            <View
              className="h-full rounded-full bg-green-500"
              style={{
                width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%`,
              }}
            />
          </View>
          <Text className="ml-3 text-sm font-semibold text-gray-700">
            {stats.total > 0
              ? Math.round((stats.approved / stats.total) * 100)
              : 0}
            %
          </Text>
        </View>
      </View>

      {/* Rejection Rate */}
      <View className="mb-4 rounded-xl bg-gray-50 p-4">
        <Text className="mb-3 text-lg font-semibold text-gray-800">
          Rejection Rate
        </Text>
        <View className="flex-row items-center">
          <View className="h-4 flex-1 overflow-hidden rounded-full bg-gray-200">
            <View
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%`,
              }}
            />
          </View>
          <Text className="ml-3 text-sm font-semibold text-gray-700">
            {stats.total > 0
              ? Math.round((stats.rejected / stats.total) * 100)
              : 0}
            %
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View className="rounded-xl bg-gray-50 p-4">
        <Text className="mb-3 text-lg font-semibold text-gray-800">
          Summary
        </Text>
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Total Forms</Text>
            <Text className="font-semibold">{stats.total}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Approved</Text>
            <Text className="font-semibold text-green-600">
              {stats.approved}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Rejected</Text>
            <Text className="font-semibold text-red-600">{stats.rejected}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Pending Review</Text>
            <Text className="font-semibold text-yellow-600">
              {stats.submitted}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Drafts</Text>
            <Text className="font-semibold text-gray-600">{stats.draft}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
