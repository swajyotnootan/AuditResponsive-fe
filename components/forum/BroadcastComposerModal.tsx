import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface BroadcastComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

export default function BroadcastComposerModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: BroadcastComposerModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "CRITICAL">(
    "NORMAL",
  );
  const [requiresAck, setRequiresAck] = useState(true);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!content.trim()) return;

    onSubmit({
      title: title.trim() || "Announcement",
      content: content.trim(),
      broadcastPriority: priority,
      broadcastRequiresAck: requiresAck,
      broadcastPinned: true,
      broadcastExpiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 86400000).toISOString()
        : null,
    });

    // Reset form
    setTitle("");
    setContent("");
    setPriority("NORMAL");
    setRequiresAck(true);
    setExpiresIn(null);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="megaphone" size={18} color="#B45309" />
              </View>
              <View>
                <Text style={styles.title}>New Broadcast</Text>
                <Text style={styles.subtitle}>
                  Send an official announcement
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Title Input */}
            <Text style={styles.label}>TITLE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mandatory PPE Training"
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />

            {/* Content Input */}
            <Text style={styles.label}>MESSAGE *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your announcement here..."
              placeholderTextColor="#9ca3af"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Priority Picker */}
            <Text style={styles.label}>PRIORITY LEVEL</Text>
            <View style={styles.row}>
              {(["NORMAL", "HIGH", "CRITICAL"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.pill,
                    priority === p && styles.pillActive,
                    p === "CRITICAL" &&
                      priority === p && {
                        backgroundColor: "#FEE2E2",
                        borderColor: "#FCA5A5",
                      },
                    p === "HIGH" &&
                      priority === p && {
                        backgroundColor: "#FEF3C7",
                        borderColor: "#FCD34D",
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      priority === p && styles.pillTextActive,
                      p === "CRITICAL" &&
                        priority === p && { color: "#991B1B" },
                      p === "HIGH" && priority === p && { color: "#92400E" },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expiry Picker */}
            <Text style={styles.label}>AUTO-EXPIRE (UNPIN)</Text>
            <View style={styles.row}>
              {[
                { label: "Never", val: null },
                { label: "24 Hours", val: 1 },
                { label: "7 Days", val: 7 },
                { label: "30 Days", val: 30 },
              ].map((opt) => (
                <TouchableOpacity
                  key={String(opt.val)}
                  onPress={() => setExpiresIn(opt.val)}
                  style={[
                    styles.pill,
                    expiresIn === opt.val && styles.pillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      expiresIn === opt.val && styles.pillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Requires Ack Toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setRequiresAck(!requiresAck)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.checkbox, requiresAck && styles.checkboxActive]}
              >
                {requiresAck && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Require Acknowledgment</Text>
                <Text style={styles.toggleSub}>
                  Members must click "Acknowledge" to confirm they read this.
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, !content.trim() && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              <Ionicons name="send" size={16} color="white" />
              <Text style={styles.sendText}>
                {isSubmitting ? "Sending..." : "Send Broadcast"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: "90%",
    ...Platform.select({
      web: { boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFBEB",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { padding: 20 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  textArea: { minHeight: 100 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "white",
  },
  pillActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  pillTextActive: { color: "#1E40AF" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#00529B", borderColor: "#00529B" },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  toggleSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#B45309",
  },
  sendText: { fontSize: 14, fontWeight: "700", color: "white" },
});
