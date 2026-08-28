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

  if (!schedules || schedules.length === 0) {
    return (
      <View className="items-center w-full p-12 bg-white border border-gray-200 rounded-xl">
        <Calendar size={48} color="#6B7280" style={{ opacity: 0.5 }} />
        <Text className="mt-2 text-sm text-gray-500">
          No schedules found for this month
        </Text>
      </View>
    );
  }

  // ✅ Table column widths - optimized for both mobile and desktop
  const columns = [
    { label: "Department", width: isMobile ? 100 : 200 },
    { label: "Week", width: isMobile ? 70 : 140 },
    { label: "Elements", width: isMobile ? 70 : 250 },
    { label: "Auditor", width: isMobile ? 120 : 280 },
    { label: "Auditee", width: isMobile ? 190 : 290 },
    { label: "Status", width: isMobile ? 120 : 140 },
    ...(canEdit ? [{ label: "Actions", width: isMobile ? 90 : 140 }] : []),
  ];

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <View className="w-full overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ paddingVertical: 0 }}
      >
        <View style={{ minWidth: totalWidth, width: "100%" }}>
          {/* Table Header */}
          <View className="flex-row w-full border-b border-gray-200 bg-gray-50">
            {columns.map((col, idx) => (
              <View
                key={col.label}
                style={{
                  width: col.width,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  borderRightWidth: idx < columns.length - 1 ? 1 : 0,
                  borderRightColor: "#E5E7EB",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text className="text-xs font-bold tracking-wide text-gray-700 uppercase">
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Table Body */}
          {schedules.map((schedule: any, index: number) => {
            let auditElements = schedule.auditElements;
            if (typeof auditElements === "string") {
              try {
                auditElements = JSON.parse(auditElements);
              } catch (e) {
                auditElements = [];
              }
            }

            const isLastRow = index === schedules.length - 1;

            return (
              <View
                key={schedule.id}
                className={`flex-row w-full ${
                  index % 2 === 1 ? "bg-gray-50/50" : "bg-white"
                }`}
                style={{
                  borderBottomWidth: isLastRow ? 0 : 1,
                  borderBottomColor: "#F1F5F9",
                }}
              >
                {/* Department */}
                <View
                  style={{
                    width: columns[0].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: 1,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text className="text-sm text-gray-800 " numberOfLines={2}>
                    {schedule.department || "-"}
                  </Text>
                </View>

                {/* Week */}
                <View
                  style={{
                    width: columns[1].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: 1,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text className="text-sm text-gray-800" numberOfLines={1}>
                    {schedule.week || "-"}
                  </Text>
                </View>

                {/* Audit Elements */}
                <View
                  style={{
                    width: columns[2].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: 1,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View
                    className="flex-row flex-wrap justify-center"
                    style={{ gap: 4 }}
                  >
                    {auditElements?.length > 0 ? (
                      auditElements.map((el: string, idx: number) => (
                        <View
                          key={idx}
                          className="px-2 py-1 bg-blue-100 rounded"
                        >
                          <Text className="text-blue-700 text-[10px] font-medium">
                            {auditElementsMap[el] || el.substring(0, 3)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-xs text-gray-400">-</Text>
                    )}
                  </View>
                </View>

                {/* Auditor */}
                <View
                  style={{
                    width: columns[3].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: 1,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text className="text-sm text-gray-800" numberOfLines={2}>
                    {schedule.leadAuditorName || schedule.auditorName || "-"}
                  </Text>
                </View>

                {/* Auditee */}
                <View
                  style={{
                    width: columns[4].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: 1,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "flex-start",
                  }}
                >
                  <Text className="text-sm text-gray-800" numberOfLines={2}>
                    {schedule.auditeeNames?.join(", ") ||
                      schedule.auditeeName ||
                      "-"}
                  </Text>
                </View>

                {/* Status */}
                <View
                  style={{
                    width: columns[5].width,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRightWidth: canEdit ? 1 : 0,
                    borderRightColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {getStatusBadge ? (
                    getStatusBadge(schedule.status)
                  ) : (
                    <Text className="text-xs text-gray-500">
                      {schedule.status || "-"}
                    </Text>
                  )}
                </View>

                {/* Actions */}
                {canEdit && (
                  <View
                    style={{
                      width: columns[6].width,
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View
                      className="flex-row items-center justify-center"
                      style={{ gap: 8 }}
                    >
                      <TouchableOpacity
                        onPress={() => onEdit(schedule)}
                        className="p-2 rounded-lg bg-blue-50 active:bg-blue-100"
                        style={{
                          minWidth: 36,
                          minHeight: 36,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Edit size={isMobile ? 16 : 18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onDelete(schedule.id, schedule.month)}
                        className="p-2 rounded-lg bg-red-50 active:bg-red-100"
                        style={{
                          minWidth: 36,
                          minHeight: 36,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={isMobile ? 16 : 18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
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
