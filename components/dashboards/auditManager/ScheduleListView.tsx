import { Calendar, Edit, Trash2 } from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const ScheduleListView = ({
  schedules,
  canEdit,
  onEdit,
  onDelete,
  auditElementsMap,
  getStatusBadge,
}: any) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (schedules.length === 0) {
    return (
      <View className="items-center p-12 bg-white border border-gray-200 rounded-xl">
        <Calendar size={48} color="#6B7280" style={{ opacity: 0.5 }} />
        <Text className="mt-2 text-sm text-gray-500">
          No schedules found for this month
        </Text>
      </View>
    );
  }

  // ✅ Mobile-optimized table with better column widths and touch targets
  const tableWidth = isMobile ? 900 : 800;

  return (
    <View className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ minWidth: tableWidth, flex: 1 }}>
          {/* Header */}
          <View
            className="flex-row border-b border-gray-200 bg-gray-50"
            style={{
              paddingHorizontal: isMobile ? 12 : 16,
              paddingVertical: 12,
            }}
          >
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Department
            </Text>
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 1, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Week
            </Text>
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 1.5, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Elements
            </Text>
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Auditor
            </Text>
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Auditee
            </Text>
            <Text
              className="font-semibold text-gray-700"
              style={{ flex: 1.2, fontSize: isMobile ? 13 : 13 }}
              numberOfLines={1}
            >
              Status
            </Text>
            {canEdit && (
              <Text
                className="font-semibold text-center text-gray-700"
                style={{ flex: 1.5, fontSize: isMobile ? 13 : 13 }}
                numberOfLines={1}
              >
                Actions
              </Text>
            )}
          </View>

          {/* Body */}
          {schedules.map((schedule: any) => {
            let auditElements = schedule.auditElements;
            if (typeof auditElements === "string") {
              try {
                auditElements = JSON.parse(auditElements);
              } catch (e) {
                auditElements = [];
              }
            }

            return (
              <View
                key={schedule.id}
                className="flex-row border-b border-gray-100"
                style={{
                  paddingHorizontal: isMobile ? 12 : 16,
                  paddingVertical: isMobile ? 14 : 12,
                  // ✅ FIX: Align items to top so rows can grow naturally
                  alignItems: "flex-start",
                }}
              >
                {/* Department */}
                <Text
                  className="text-gray-800"
                  style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
                  numberOfLines={3}
                >
                  {schedule.department}
                </Text>

                {/* Week */}
                <Text
                  className="text-gray-800"
                  style={{ flex: 1, fontSize: isMobile ? 13 : 13 }}
                  numberOfLines={1}
                >
                  {schedule.week}
                </Text>

                {/* Audit Elements */}
                <View style={{ flex: 1.5 }} className="justify-center">
                  <View className="flex-row flex-wrap" style={{ gap: 4 }}>
                    {auditElements?.map((el: string, idx: number) => (
                      <View key={idx} className="px-2 py-1 bg-blue-100 rounded">
                        <Text
                          className="text-blue-700"
                          style={{ fontSize: 11 }}
                        >
                          {auditElementsMap[el] || el.substring(0, 3)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Auditor - ✅ Removed numberOfLines limit, let it wrap naturally */}
                <Text
                  className="text-gray-800"
                  style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
                >
                  {schedule.leadAuditorName || schedule.auditorName || "-"}
                </Text>

                {/* Auditee - ✅ Removed numberOfLines limit, let it wrap naturally */}
                <Text
                  className="text-gray-800"
                  style={{ flex: 2, fontSize: isMobile ? 13 : 13 }}
                >
                  {schedule.auditeeNames?.join(", ") ||
                    schedule.auditeeName ||
                    "-"}
                </Text>

                {/* Status */}
                <View className="justify-center" style={{ flex: 1.2 }}>
                  {getStatusBadge(schedule.status)}
                </View>

                {/* Actions - ✅ Larger touch targets for mobile */}
                {canEdit && (
                  <View
                    className="flex-row items-center justify-center"
                    style={{ flex: 1.5, gap: 8, minHeight: isMobile ? 40 : 32 }}
                  >
                    <TouchableOpacity
                      onPress={() => onEdit(schedule)}
                      style={{
                        padding: isMobile ? 10 : 6,
                        backgroundColor: "#EFF6FF",
                        borderRadius: 8,
                        minWidth: isMobile ? 40 : 32,
                        minHeight: isMobile ? 40 : 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Edit size={isMobile ? 18 : 16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(schedule.id, schedule.month)}
                      style={{
                        padding: isMobile ? 10 : 6,
                        backgroundColor: "#FEF2F2",
                        borderRadius: 8,
                        minWidth: isMobile ? 40 : 32,
                        minHeight: isMobile ? 40 : 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={isMobile ? 18 : 16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

export default ScheduleListView;
