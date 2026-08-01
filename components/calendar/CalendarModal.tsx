import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import CalendarView from './CalendarView';

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
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="w-[95%] h-[90%] bg-white rounded-2xl shadow-2xl flex-col">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Audit Calendar</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-lg">
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