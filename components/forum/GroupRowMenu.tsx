// components/forum/GroupRowMenu.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  danger?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: MenuItem[];
}

export default function GroupRowMenu({
  visible,
  onClose,
  title,
  items,
}: Props) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                setTimeout(() => item.onPress(), 100);
              }}
            >
              <View
                style={[
                  styles.iconWrap,
                  item.danger && { backgroundColor: "#FEE2E2" },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.danger ? "#DC2626" : "#00529B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.label, item.danger && { color: "#DC2626" }]}
                >
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text style={styles.sublabel}>{item.sublabel}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    }),
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  sublabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
});
