import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react-native";
import moment from "moment";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function CalendarToolbar({
  view,
  date,
  onNavigate,
  onViewChange,
  layout,
  onLayoutChange,
}: any) {
  const navigate = (action: string) => {
    let newDate = moment(date);
    if (action === "PREV")
      newDate.subtract(
        view === "year" ? 1 : view === "month" ? 1 : view === "week" ? 7 : 1,
        view === "year" ? "years" : "days",
      );
    if (action === "NEXT")
      newDate.add(
        view === "year" ? 1 : view === "month" ? 1 : view === "week" ? 7 : 1,
        view === "year" ? "years" : "days",
      );
    if (action === "TODAY") newDate = moment();
    onNavigate(newDate.format("YYYY-MM-DD"));
  };

  const getDateLabel = () => {
    if (view === "year") return moment(date).format("YYYY");
    if (view === "month") return moment(date).format("MMMM YYYY");
    if (view === "week")
      return `Week of ${moment(date).startOf("week").format("MMM DD")}`;
    return moment(date).format("MMMM DD, YYYY");
  };

  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => navigate("TODAY")}
          className="rounded-lg bg-gray-100 px-3 py-2"
        >
          <Text className="text-sm font-medium text-gray-700">Today</Text>
        </TouchableOpacity>
        <View className="flex-row rounded-lg border border-gray-300">
          <TouchableOpacity
            onPress={() => navigate("PREV")}
            className="border-r border-gray-300 p-2"
          >
            <ChevronLeft size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate("NEXT")} className="p-2">
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <Text className="ml-2 text-base font-semibold text-gray-900">
          {getDateLabel()}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        {view !== "year" && (
          <View className="flex-row rounded-lg border border-gray-300">
            <TouchableOpacity
              onPress={() => onLayoutChange("calendar")}
              className={`p-2 ${layout === "calendar" ? "bg-blue-900" : "bg-white"}`}
            >
              <CalendarIcon
                size={20}
                color={layout === "calendar" ? "#fff" : "#6b7280"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onLayoutChange("list")}
              className={`border-l border-gray-300 p-2 ${layout === "list" ? "bg-blue-900" : "bg-white"}`}
            >
              <List size={20} color={layout === "list" ? "#fff" : "#6b7280"} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
