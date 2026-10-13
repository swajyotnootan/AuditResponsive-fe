// components/forum/EditGroupAppearanceModal.tsx
import { updateGroupAppearance } from "@/components/forum/Api/forumapi";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const ACCENT = "#00529B";
const ACCENT_TINT = "#EAF2FB";
const EMOJI_CHOICES = [
  "💬",
  "🏢",
  "📋",
  "🔧",
  "✅",
  "⚠️",
  "🚀",
  "🎯",
  "📊",
  "🧪",
  "🛠️",
  "📌",
  "🏭",
  "🧑‍💼",
  "⭐",
  "🔥",
  "💡",
  "📝",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  group: any;
  currentUser: any;
  onSaved: () => void;
}

export default function EditGroupAppearanceModal({
  visible,
  onClose,
  group,
  currentUser,
  onSaved,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [emoji, setEmoji] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible && group) {
      setPhotoUrl(group.photoUrl || "");
      setEmoji(group.emoji || "");
      setDescription(group.description || "");
      setError("");
      setBusy(false);
    }
  }, [visible, group]);

  // (adjust path if needed — same relative path you use in ForumHome.tsx)

  const handleSave = async () => {
    if (!group?.groupId) return;
    setBusy(true);
    setError("");
    try {
      await updateGroupAppearance(group.groupId, {
        requester: currentUser?.email,
        photoUrl: photoUrl || null,
        emoji: emoji || null,
        description: description || null,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  const preview = photoUrl
    ? { type: "photo" as const }
    : emoji
      ? { type: "emoji" as const }
      : { type: "none" as const };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !busy && onClose()}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={styles.headerIcon}>
                <Feather name="image" size={20} color={ACCENT} />
              </View>
              <View>
                <Text style={styles.title}>Group Profile</Text>
                <Text style={styles.subtitle}>
                  {group?.groupName || group?.groupId}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => !busy && onClose()}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ padding: 20 }}
          >
            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Preview */}
            <View style={styles.previewWrap}>
              <View style={styles.previewIcon}>
                {preview.type === "photo" ? (
                  <Image source={{ uri: photoUrl }} style={styles.previewImg} />
                ) : preview.type === "emoji" ? (
                  <Text style={{ fontSize: 34 }}>{emoji}</Text>
                ) : (
                  <Feather name="image" size={28} color={ACCENT} />
                )}
              </View>
              <Text style={styles.previewHint}>Live preview</Text>
            </View>

            {/* Photo URL */}
            <Text style={styles.label}>Photo URL</Text>
            <View style={styles.inputWrap}>
              <Feather name="link" size={16} color="#9AA7B8" />
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#9AA7B8"
                value={photoUrl}
                onChangeText={setPhotoUrl}
                editable={!busy}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Emoji picker */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Or pick an emoji
            </Text>
            <View style={styles.emojiGrid}>
              <Pressable
                onPress={() => setEmoji("")}
                style={[styles.emojiCell, !emoji && styles.emojiCellActive]}
              >
                <Feather name="x" size={16} color="#64748B" />
              </Pressable>
              {EMOJI_CHOICES.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[
                    styles.emojiCell,
                    emoji === e && styles.emojiCellActive,
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            {/* Description */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Description (optional)
            </Text>
            <View style={[styles.inputWrap, { alignItems: "flex-start" }]}>
              <Feather name="file-text" size={16} color="#9AA7B8" />
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="What's this group about?"
                placeholderTextColor="#9AA7B8"
                value={description}
                onChangeText={setDescription}
                editable={!busy}
                multiline
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => !busy && onClose()}
              disabled={busy}
              style={styles.btnGhost}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={busy}
              style={[styles.btnPrimary, { opacity: busy ? 0.8 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check" size={14} color="#fff" />
              )}
              <Text style={styles.btnPrimaryText}>
                {busy ? "Saving…" : "Save changes"}
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
    backgroundColor: "rgba(15,23,42,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACCENT_TINT,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 11.5, color: "#64748B", marginTop: 2 },

  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 12, color: "#991B1B" },

  previewWrap: { alignItems: "center", marginBottom: 20 },
  previewIcon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: ACCENT_TINT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  previewHint: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3E9F2",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#0F172A",
  },

  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#EFF3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiCellActive: {
    backgroundColor: ACCENT_TINT,
    borderColor: ACCENT,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  btnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3E9F2",
    backgroundColor: "#FFFFFF",
  },
  btnGhostText: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  btnPrimaryText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
});
