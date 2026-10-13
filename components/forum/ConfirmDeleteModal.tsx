// components/forum/ConfirmDeleteModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  /** Exact text the user must type to enable delete. Defaults to "DELETE". */
  confirmWord?: string;
  onConfirm: () => Promise<void>;
}

export default function ConfirmDeleteModal({
  visible,
  onClose,
  groupName,
  confirmWord = "DELETE",
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Reset on open
  React.useEffect(() => {
    if (visible) {
      setTyped("");
      setError("");
      setDeleting(false);
    }
  }, [visible]);

  const canDelete = typed.trim().toUpperCase() === confirmWord;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not delete group");
    } finally {
      setDeleting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.title}>Delete Group</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.warn}>
              This will <Text style={styles.bold}>permanently delete</Text>{" "}
              <Text style={styles.bold}>"{groupName}"</Text> for everyone. All
              messages, files, and members will be removed. This cannot be
              undone.
            </Text>

            <Text style={styles.label}>
              Type <Text style={styles.bold}>{confirmWord}</Text> to confirm
            </Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={confirmWord}
              placeholderTextColor="#CBD5E1"
              style={styles.input}
              editable={!deleting}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={onClose}
              disabled={deleting}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnDanger,
                (!canDelete || deleting) && { opacity: 0.4 },
              ]}
              onPress={handleConfirm}
              disabled={!canDelete || deleting}
            >
              {deleting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.btnDangerText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 40px rgba(0,0,0,0.25)" },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: "#0F172A" },
  closeBtn: { padding: 4 },
  body: { padding: 20 },
  warn: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 16 },
  bold: { fontWeight: "700", color: "#111827" },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    letterSpacing: 1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  errorText: { color: "#DC2626", fontSize: 13, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  btnDanger: { backgroundColor: "#DC2626" },
  btnDangerText: { fontSize: 14, fontWeight: "700", color: "white" },
});
