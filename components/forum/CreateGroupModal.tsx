// components/forum/CreateGroupModal.tsx
import { Check, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { createCustomGroup } from "./Api/forumapi";
import Dropdown from "./Dropdown";

interface Company {
  id: number | string;
  name: string;
}

interface Plant {
  id: number | string;
  name: string;
  companyId?: number | string;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  allUsers: any[];
  onCreated: (group: any) => void;
  plantId?: string | number | null;
  plantName?: string | null;
  companyId?: string | number | null;
  companyName?: string | null;
  availablePlants?: Plant[];
  availableCompanies?: Company[];
  onCompanyChange?: (companyId: string) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onCreated,
  plantId,
  plantName,
  companyId,
  companyName,
  availablePlants = [],
  availableCompanies = [],
  onCompanyChange,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const myEmail = currentUser?.email || "";
  const role = String(currentUser?.role || "").toUpperCase();
  const isMaster = role.includes("MASTER");

  // ─── Pickers ───
  const [pickedCompanyId, setPickedCompanyId] = useState<string | null>(
    companyId != null ? String(companyId) : null,
  );
  const [pickedPlantId, setPickedPlantId] = useState<string | null>(
    plantId != null ? String(plantId) : null,
  );

  // Visibility scope (Master only):
  //   "plant"   → specific plant
  //   "company" → all plants in the chosen company
  const [scope, setScope] = useState<"plant" | "company">("plant");

  // ─── Auto-select company if only one ───
  useEffect(() => {
    if (availableCompanies.length === 1 && !pickedCompanyId) {
      const only = String(availableCompanies[0].id);
      setPickedCompanyId(only);
      onCompanyChange?.(only);
    }
  }, [availableCompanies, pickedCompanyId, onCompanyChange]);

  // ─── Non-Master never gets "company" scope ───
  useEffect(() => {
    if (!isMaster && scope === "company") setScope("plant");
  }, [isMaster, scope]);

  // ─── Filter plants by picked company ───
  const filteredPlants = useMemo(() => {
    if (!pickedCompanyId) return availablePlants;
    return availablePlants.filter(
      (p) =>
        p.companyId == null || String(p.companyId) === String(pickedCompanyId),
    );
  }, [availablePlants, pickedCompanyId]);

  // ─── If company changes, reset plant if it doesn't belong ───
  useEffect(() => {
    if (!pickedPlantId) return;
    const stillValid = filteredPlants.some(
      (p) => String(p.id) === String(pickedPlantId),
    );
    if (!stillValid) setPickedPlantId(null);
  }, [filteredPlants, pickedPlantId]);

  // ─── Effective filters for the user list ───
  const effectiveCompanyId = isMaster ? pickedCompanyId : null;
  const effectivePlantId = isMaster
    ? scope === "plant"
      ? pickedPlantId
      : null
    : plantId != null
      ? String(plantId)
      : null;

  // ─── Filter + search users ───
  const filteredUsers = useMemo(() => {
    const others = (allUsers || []).filter((u) => {
      if (!u.email || u.email === myEmail) return false;

      // Company filter (Master only)
      if (effectiveCompanyId && u.companyId != null) {
        if (String(u.companyId) !== String(effectiveCompanyId)) return false;
      }

      // Plant filter
      if (effectivePlantId != null && u.plantId != null) {
        if (String(u.plantId) !== String(effectivePlantId)) return false;
      }

      return true;
    });

    if (!search.trim()) return others;
    const q = search.toLowerCase();
    return others.filter(
      (u) =>
        `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q),
    );
  }, [allUsers, search, myEmail, effectiveCompanyId, effectivePlantId]);

  const toggleUser = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  };

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setSelectedEmails([]);
    setSearch("");
    setError("");
    setSaving(false);
    setScope("plant");
    setPickedPlantId(plantId != null ? String(plantId) : null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ─── Resolve plant for submit ───
  const resolveFinalPlant = () => {
    if (isMaster && scope === "company") {
      return { plantId: null, plantName: null };
    }
    if (isMaster && scope === "plant") {
      const found = filteredPlants.find(
        (p) => String(p.id) === String(pickedPlantId),
      );
      return {
        plantId: pickedPlantId ?? null,
        plantName: found?.name ?? null,
      };
    }
    return {
      plantId: plantId != null ? String(plantId) : null,
      plantName: plantName || null,
    };
  };

  const handleCreate = async () => {
    setError("");

    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }
    if (isMaster && availableCompanies.length > 1 && !pickedCompanyId) {
      setError("Please select a company");
      return;
    }
    if (isMaster && scope === "plant" && !pickedPlantId) {
      setError("Please select a plant");
      return;
    }
    if (selectedEmails.length === 0) {
      setError("Add at least one member");
      return;
    }

    setSaving(true);
    try {
      const groupId = `GRP-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      const { plantId: finalPlantId, plantName: finalPlantName } =
        resolveFinalPlant();

      const finalCompanyId = pickedCompanyId ?? companyId ?? null;

      await createCustomGroup({
        groupId,
        groupName: groupName.trim(),
        description: description.trim(),
        createdBy: myEmail,
        members: [myEmail, ...selectedEmails],
        adminEmail: myEmail,
        plantId: finalPlantId,
        plantName: finalPlantName,
        // If backend supports it:
        // companyId: finalCompanyId,
      });

      const newGroup = {
        groupId,
        groupName: groupName.trim(),
        description: description.trim(),
        createdBy: myEmail,
        members: [myEmail, ...selectedEmails],
        adminEmail: myEmail,
        plantId: finalPlantId,
        plantName: finalPlantName,
        companyId: finalCompanyId,
        isAdmin: true,
      };

      resetForm();
      onCreated(newGroup);
    } catch (e: any) {
      setError(e.message || "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>New Group</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
            style={{ flex: 1 }}
          >
            {/* Group Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Group Name *</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g., Quality Team"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                editable={!saving}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What is this group about?"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                editable={!saving}
              />
            </View>

            {/* ── COMPANY DROPDOWN (Master only, when >1 company) ── */}
            {isMaster && availableCompanies.length > 1 && (
              <Dropdown
                label="Company *"
                placeholder="Select company..."
                options={availableCompanies.map((c) => ({
                  id: c.id,
                  label: c.name,
                  icon: "🏢",
                }))}
                value={pickedCompanyId}
                onChange={(id) => {
                  setPickedCompanyId(id);
                  onCompanyChange?.(id);
                }}
                disabled={saving}
              />
            )}

            {/* ── MASTER-ONLY: VISIBILITY ── */}
            {isMaster && (
              <>
                <View style={styles.scopeRow}>
                  <Text style={styles.scopeLabel}>Visibility:</Text>

                  <TouchableOpacity
                    style={[
                      styles.scopeBtn,
                      scope === "plant" && styles.scopeBtnActive,
                    ]}
                    onPress={() => setScope("plant")}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.scopeBtnText,
                        scope === "plant" && styles.scopeBtnTextActive,
                      ]}
                    >
                      🏭 Specific Plant
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.scopeBtn,
                      scope === "company" && styles.scopeBtnActive,
                    ]}
                    onPress={() => setScope("company")}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.scopeBtnText,
                        scope === "company" && styles.scopeBtnTextActive,
                      ]}
                    >
                      🏢 Company-Wide
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Plant dropdown (only in "plant" scope) */}
                {scope === "plant" && (
                  <Dropdown
                    label="Plant *"
                    placeholder="Select plant..."
                    options={filteredPlants.map((p) => ({
                      id: p.id,
                      label: p.name,
                      icon: "🏭",
                    }))}
                    value={pickedPlantId}
                    onChange={(id) => setPickedPlantId(id)}
                    disabled={saving}
                    emptyText="No plants found for this company"
                  />
                )}

                {/* Info banner */}
                <View style={styles.plantBanner}>
                  <Text style={styles.plantBannerIcon}>
                    {scope === "company" ? "🏢" : pickedPlantId ? "🏭" : "❓"}
                  </Text>
                  <Text style={styles.plantBannerLabel}>
                    {scope === "company"
                      ? `Company-wide · ${selectedEmails.length + 1} member(s)`
                      : pickedPlantId
                        ? `${pickedPlantId ? filteredPlants.find((p) => String(p.id) === String(pickedPlantId))?.name : "Plant"} · ${selectedEmails.length + 1} member(s)`
                        : "Please select a plant"}
                  </Text>
                </View>
              </>
            )}

            {/* ── NON-MASTER: READ-ONLY BANNER ── */}
            {!isMaster && (
              <View style={styles.plantBanner}>
                <Text style={styles.plantBannerIcon}>🏭</Text>
                <Text style={styles.plantBannerLabel}>
                  Visible to {plantName || "your plant"} members only ·{" "}
                  {selectedEmails.length + 1} member(s)
                </Text>
              </View>
            )}

            {/* Selected chips */}
            {selectedEmails.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {selectedEmails.map((email) => {
                  const u = allUsers.find((x) => x.email === email);
                  const label =
                    `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                    email;
                  return (
                    <View key={email} style={styles.chip}>
                      <Text style={styles.chipText}>{label}</Text>
                      <TouchableOpacity onPress={() => toggleUser(email)}>
                        <X size={14} color="#1E40AF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Search */}
            <View style={styles.searchBar}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search members..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                editable={!saving}
              />
            </View>

            <Text style={styles.sectionLabel}>
              SELECT MEMBERS ({selectedEmails.length})
            </Text>

            {/* User list */}
            {filteredUsers.length === 0 ? (
              <Text style={styles.noUsers}>No users match your search</Text>
            ) : (
              filteredUsers.map((u) => {
                const email = u.email;
                const isSel = selectedEmails.includes(email);
                const name =
                  `${u.firstName || ""} ${u.lastName || ""}`.trim() || email;
                return (
                  <TouchableOpacity
                    key={email}
                    onPress={() => toggleUser(email)}
                    disabled={saving}
                    style={[styles.userRow, isSel && styles.userRowSelected]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{name}</Text>
                      <Text style={styles.userSub} numberOfLines={1}>
                        {email}
                        {u.department ? ` • ${u.department}` : ""}
                        {u.plantName ? ` • ${u.plantName}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                      {isSel && <Check size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={saving}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={saving}
              style={[
                styles.createBtn,
                saving && { backgroundColor: "#93C5FD" },
              ]}
              activeOpacity={0.8}
            >
              {saving && <ActivityIndicator size="small" color="white" />}
              <Text style={styles.createBtnText}>
                {saving ? "Creating..." : "Create Group"}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: "#0F172A" },

  field: { paddingHorizontal: 20, paddingTop: 12 },
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
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },

  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    flexWrap: "wrap",
  },
  scopeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginRight: 4,
  },
  scopeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  scopeBtnActive: { backgroundColor: "#00529B", borderColor: "#00529B" },
  scopeBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  scopeBtnTextActive: { color: "#FFFFFF" },

  plantBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    backgroundColor: "#F0F9FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  plantBannerIcon: { fontSize: 18 },
  plantBannerLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#0C4A6E",
  },

  chipRow: { marginTop: 12, marginBottom: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipText: { fontSize: 12, color: "#1E40AF", fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0F172A" },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  userRowSelected: { backgroundColor: "#EFF6FF" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: "#4338CA" },
  userName: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  userSub: { fontSize: 12, color: "#64748B", marginTop: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#00529B", borderColor: "#00529B" },
  noUsers: { padding: 20, textAlign: "center", color: "#94A3B8", fontSize: 13 },
  error: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  createBtn: {
    backgroundColor: "#00529B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  createBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
});
