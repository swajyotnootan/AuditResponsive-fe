// components/forum/ManageGroupMembersModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addGroupMembersSecure,
  changeGroupAdmin,
  removeGroupMembersSecure,
} from "./Api/forumapi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  group: any; // { groupId, groupName, members, adminEmail }
  currentUser: any;
  allUsers: any[];
  isAdmin: boolean;
  onUpdated: () => void;
}

export default function ManageGroupMembersModal({
  isOpen,
  onClose,
  group,
  currentUser,
  allUsers,
  isAdmin,
  onUpdated,
}: Props) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<string[]>([]);

  const myEmail = currentUser?.email || "";
  const members: string[] = group?.members || [];
  const adminEmail: string = group?.adminEmail || "";

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (allUsers || [])
      .filter((u) => u?.email && !members.includes(u.email))
      .filter(
        (u) =>
          !q ||
          u.email.toLowerCase().includes(q) ||
          `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [allUsers, members, search]);

  const displayName = (u: any) =>
    `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;

  const toggleAdd = (email: string) =>
    setPendingAdd((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );

  const toggleRemove = (email: string) =>
    setPendingRemove((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );

  const handleSave = async () => {
    if (!group?.groupId) return;
    setSaving(true);
    try {
      if (pendingAdd.length > 0) {
        await addGroupMembersSecure(group.groupId, pendingAdd, myEmail);
      }
      if (pendingRemove.length > 0) {
        await removeGroupMembersSecure(group.groupId, pendingRemove, myEmail);
      }
      setPendingAdd([]);
      setPendingRemove([]);
      onUpdated();
      onClose();
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not update members");
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = (email: string) => {
    const confirmText =
      `Transfer admin to ${email}?\n\n` +
      `⚠️ They become the new admin.\n` +
      `⚠️ You will become a regular member.\n` +
      `⚠️ You can no longer add/remove members.`;

    const doPromote = async () => {
      try {
        setSaving(true);
        await changeGroupAdmin(group.groupId, email, myEmail);

        // Success message — cross-platform
        if (Platform.OS === "web") {
          window.alert(`${email} is now the group admin.`);
        } else {
          Alert.alert("Success", `${email} is now the group admin.`);
        }

        onUpdated();
        onClose();
      } catch (e: any) {
        const msg = e?.message || "Could not change admin";
        if (Platform.OS === "web") {
          window.alert("Failed: " + msg);
        } else {
          Alert.alert("Failed", msg);
        }
      } finally {
        setSaving(false);
      }
    };

    // Confirmation — cross-platform
    if (Platform.OS === "web") {
      if (window.confirm(confirmText)) doPromote();
    } else {
      Alert.alert("Transfer admin?", confirmText, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: doPromote },
      ]);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Manage Members</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Current members */}
          <Text style={styles.sectionLabel}>MEMBERS ({members.length})</Text>
          <FlatList
            data={members}
            keyExtractor={(e) => e}
            style={{ maxHeight: 220 }}
            renderItem={({ item: email }) => {
              const u = allUsers.find((x) => x.email === email);
              const isMe = email === myEmail;
              const isGroupAdmin = email === adminEmail;
              const markedForRemoval = pendingRemove.includes(email);

              return (
                <View style={[styles.row, markedForRemoval && styles.rowDim]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(u?.firstName?.[0] || email[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {u ? displayName(u) : email} {isMe && "(you)"}
                    </Text>
                    <Text style={styles.sub}>
                      {email}
                      {isGroupAdmin ? "  •  👑 Admin" : ""}
                    </Text>
                  </View>

                  {isAdmin && !isMe && !isGroupAdmin && (
                    <>
                      <TouchableOpacity
                        onPress={() => toggleRemove(email)}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name={markedForRemoval ? "refresh" : "remove-circle"}
                          size={20}
                          color={markedForRemoval ? "#6b7280" : "#ef4444"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handlePromote(email)}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name="star-outline"
                          size={20}
                          color="#f59e0b"
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            }}
          />

          {/* Add new members (admin only) */}
          {isAdmin && (
            <>
              <Text style={styles.sectionLabel}>ADD MEMBERS</Text>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users by name or email..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <FlatList
                data={candidates}
                keyExtractor={(u) => u.email}
                style={{ maxHeight: 180 }}
                renderItem={({ item: u }) => {
                  const selected = pendingAdd.includes(u.email);
                  return (
                    <TouchableOpacity
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => toggleAdd(u.email)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(
                            u.firstName?.[0] ||
                            u.email[0] ||
                            "?"
                          ).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{displayName(u)}</Text>
                        <Text style={styles.sub}>{u.email}</Text>
                      </View>
                      <Ionicons
                        name={
                          selected ? "checkmark-circle" : "add-circle-outline"
                        }
                        size={22}
                        color={selected ? "#22c55e" : "#00529B"}
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {search
                      ? "No matching users"
                      : "All users are already members"}
                  </Text>
                }
              />
            </>
          )}

          {/* Footer */}
          {isAdmin && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => {
                  setPendingAdd([]);
                  setPendingRemove([]);
                  onClose();
                }}
                disabled={saving}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSave}
                disabled={
                  saving ||
                  (pendingAdd.length === 0 && pendingRemove.length === 0)
                }
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.btnPrimaryText}>
                    Save ({pendingAdd.length + pendingRemove.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: Platform.OS === "web" ? 20 : 0,
    borderBottomRightRadius: Platform.OS === "web" ? 20 : 0,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 10,
  },
  rowSelected: { backgroundColor: "#EFF6FF" },
  rowDim: { opacity: 0.45 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#00529B", fontWeight: "700", fontSize: 14 },
  name: { fontSize: 14, fontWeight: "600", color: "#111827" },
  sub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  iconBtn: { padding: 6 },
  empty: {
    padding: 16,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 13,
  },
  footer: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnGhost: { backgroundColor: "#F3F4F6" },
  btnGhostText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  btnPrimary: { backgroundColor: "#00529B" },
  btnPrimaryText: { fontSize: 14, fontWeight: "700", color: "white" },
});
