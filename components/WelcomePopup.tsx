// components/WelcomePopup.tsx
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

const ACCENT = "#5B4E97";
const ACCENT_DARK = "#3F3566";
const ACCENT_TINT = "#EFEDF7";

export function WelcomePopup({
  isOpen,
  onClose,
  userData,
}: {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
}) {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            backgroundColor: "#fff",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <View style={{ height: 4, backgroundColor: ACCENT }} />
          <View style={{ alignItems: "center", padding: 24 }}>
            <View
              style={{
                marginBottom: 16,
                height: 64,
                width: 64,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 32,
                backgroundColor: "#ECFDF5",
              }}
            >
              <Feather name="check-circle" size={32} color="#10B981" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                textAlign: "center",
              }}
            >
              Welcome back!
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                fontWeight: "500",
                color: "#64748B",
                textAlign: "center",
              }}
            >
              {userData?.name || userData?.username}
            </Text>
            <View
              style={{
                marginTop: 8,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
                backgroundColor: ACCENT_TINT,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: "500", color: ACCENT_DARK }}
              >
                {userData?.role || "User"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                marginTop: 20,
                minHeight: 44,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor: ACCENT,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "500",
                  color: "#fff",
                }}
              >
                Continue to dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
