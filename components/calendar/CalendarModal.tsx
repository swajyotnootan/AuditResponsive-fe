import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import CalendarView from "./CalendarView";

export default function CalendarModal({ isOpen, onClose }: any) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="h-[90%] w-[95%] flex-col rounded-2xl bg-white shadow-2xl">
          <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
            <Text className="text-lg font-semibold text-gray-800">
              Audit Calendar
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-lg bg-gray-100 p-2"
            >
              <X size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <CalendarView />
          </View>
        </View>
      </View>
    </Modal>
  );
}
