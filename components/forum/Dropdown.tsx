// components/forum/Dropdown.tsx
import { Check, ChevronDown, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface DropdownOption {
  id: string | number;
  label: string;
  sublabel?: string;
  icon?: string; // emoji
}

interface DropdownProps {
  label: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyText?: string;
}

export default function Dropdown({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  disabled,
  emptyText = "No options available",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.id) === String(value));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        <Text
          style={[styles.triggerText, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected
            ? `${selected.icon ? selected.icon + " " : ""}${selected.label}`
            : placeholder}
        </Text>
        <ChevronDown size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {options.length === 0 ? (
              <Text style={styles.empty}>{emptyText}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 380 }}
                renderItem={({ item }) => {
                  const isSel = String(item.id) === String(value);
                  return (
                    <TouchableOpacity
                      style={[styles.option, isSel && styles.optionActive]}
                      onPress={() => {
                        onChange(String(item.id));
                        setOpen(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSel && styles.optionLabelActive,
                          ]}
                        >
                          {item.icon ? `${item.icon} ` : ""}
                          {item.label}
                        </Text>
                        {item.sublabel ? (
                          <Text style={styles.optionSub}>{item.sublabel}</Text>
                        ) : null}
                      </View>
                      {isSel && <Check size={18} color="#00529B" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 12 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  triggerDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.7,
  },
  triggerText: { fontSize: 14, color: "#0F172A", flex: 1, marginRight: 8 },
  placeholder: { color: "#94A3B8" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 12px 40px rgba(0,0,0,0.25)" },
    }),
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },

  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  optionActive: { backgroundColor: "#EFF6FF" },
  optionLabel: { fontSize: 14, fontWeight: "500", color: "#0F172A" },
  optionLabelActive: { color: "#00529B", fontWeight: "600" },
  optionSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  empty: {
    textAlign: "center",
    padding: 24,
    color: "#94A3B8",
    fontSize: 13,
  },
});
