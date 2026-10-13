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
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-full max-w-md rounded-xl bg-white p-6">
            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-gray-800">
                Reject Plan
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="rounded-lg bg-gray-100 p-2"
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
              className="min-h-[120px] w-full rounded-lg border border-gray-200 p-3 text-gray-900"
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
            <View className="mt-6 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-200 bg-white px-5 py-3"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-base font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                disabled={submitting}
                className="flex-row items-center gap-2 rounded-lg bg-red-600 px-5 py-3 disabled:opacity-50"
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
