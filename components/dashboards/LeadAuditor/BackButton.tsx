// app/components/dashboards/LeadAuditor/BackButton.tsx
"use client";

import React from "react";
import { TouchableOpacity, Text, StyleSheet, View, useWindowDimensions } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useRouter } from "expo-router";

interface BackButtonProps {
  defaultTab?: string;
  label?: string;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  defaultTab = "responses",
  label = "Back",
  className = "",
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: isMobile ? 6 : 8,
        padding: isMobile ? 6 : 8,
        backgroundColor: "#00529B",
        borderRadius: 8,
      }}
      onPress={handleBack}
    >
      <Icon name="arrow-left" size={isMobile ? 16 : 18} color="#FFFFFF" />
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: isMobile ? 12 : 14,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default BackButton;