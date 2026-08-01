// src/components/modals/RejectModalEnhanced.tsx
import { X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  year?: string | number;
  rejectionReason: string;
  setRejectionReason: (text: string) => void;
  submitting: boolean;
}

const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  year,
  rejectionReason,
  setRejectionReason,
  submitting,
}: RejectModalProps) => {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus the input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="w-full max-w-md p-6 bg-white rounded-xl">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-semibold text-gray-800">
                Reject Plan
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-gray-100 rounded-lg"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text className="mb-4 text-sm text-gray-600">
              Please provide a reason for rejecting the {year} audit plan:
            </Text>

            {/* Text Input */}
            <TextInput
              ref={inputRef}
              className="w-full p-3 border border-gray-200 rounded-lg text-gray-900 min-h-[120px]"
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
              editable={!submitting}
            />

            {/* Action Buttons */}
            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                className="px-5 py-3 bg-white border border-gray-200 rounded-lg"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-base font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={submitting}
                className="flex-row items-center gap-2 px-5 py-3 bg-red-600 rounded-lg disabled:opacity-50"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-base font-medium text-white">
                    Confirm Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RejectModal;
