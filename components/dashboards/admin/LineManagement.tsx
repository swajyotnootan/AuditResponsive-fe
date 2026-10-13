// components/dashboards/admin/LineManagement.tsx
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const emptyForm = {
  groupName: "",
  lineCode: "",
  lineName: "",
  description: "",
  members: [] as string[],
};

const normalizeRole = (value = "") => value.trim().toUpperCase();

export default function LineManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [lineGroups, setLineGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [backendRoles, setBackendRoles] = useState<any[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      setUsers(list);
      console.log("✅ Users loaded:", list.length);
    } catch (err) {
      console.error("Failed to load users");
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/roles?lineOnly=true`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setBackendRoles(list);
      console.log("✅ Roles loaded:", list.length);
    } catch (err) {
      console.error("Failed to load roles");
    }
  };

  // Filter users with no email - use username or id as fallback
  const validUsers = useMemo(() => {
    return users.map((u: any) => ({
      ...u,
      email: u.email || u.username || `user-${u.id}`,
    }));
  }, [users]);

  const filteredGroups = useMemo(() => {
    return lineGroups.filter((group: any) => {
      const matchesSearch =
        group.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.lineCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && group.isActive !== false) ||
        (statusFilter === "inactive" && group.isActive === false);
      return matchesSearch && matchesStatus;
    });
  }, [lineGroups, searchQuery, statusFilter]);

  const memberOptions = useMemo(() => {
    return validUsers
      .map((user: any) => {
        const label =
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          user.username ||
          `User ${user.id}`;
        const role = normalizeRole(user.role || user.roleName || "");
        return {
          label,
          value: user.email,
          role: user.role || "No Role",
          department: user.department || "N/A",
          isSupervisor:
            role === "SITE-SUPERVISOR" || role.includes("SUPERVISOR"),
        };
      })
      .sort((a: any, b: any) => {
        if (a.isSupervisor && !b.isSupervisor) return -1;
        if (!a.isSupervisor && b.isSupervisor) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [validUsers]);

  // ✅ Role options - use backend roles + fallback from users
  const roleOptions = useMemo(() => {
    const existingCodes = new Set(
      lineGroups.map((g: any) => normalizeRole(g.groupName)),
    );

    if (backendRoles.length > 0) {
      return backendRoles
        .map((r: any) => {
          const code = normalizeRole(
            r.lineCode || r.label || r.code || r.name || "",
          );
          const exists = existingCodes.has(code);
          return {
            value: code,
            label: r.displayName || r.label || r.name || code,
            disabled: exists,
          };
        })
        .filter((opt) => opt.value);
    }

    // Fallback: get unique roles from users
    const userRoles = [
      ...new Set(
        users.map((u: any) => normalizeRole(u.role || u.roleName || "")),
      ),
    ].filter(Boolean);
    return userRoles.map((role) => ({
      value: role,
      label: role.replace(/_/g, " "),
      disabled: existingCodes.has(role),
    }));
  }, [backendRoles, lineGroups, users]);

  const handleRoleSelect = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      lineCode: value,
      groupName: value,
      lineName: prev.lineName?.trim() ? prev.lineName : value,
      // Auto-add members with matching role
      members: validUsers
        .filter(
          (u: any) =>
            normalizeRole(u.role || u.roleName || "") === normalizeRole(value),
        )
        .map((u: any) => u.email),
    }));
    setShowRolePicker(false);
  };

  const selectedRoleLabel =
    roleOptions.find((r) => r.value === formData.groupName)?.label ||
    "Select a role";

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setFormData({
      groupName: group.groupName || "",
      lineCode: group.lineCode || "",
      lineName: group.lineName || "",
      description: group.description || "",
      members: group.members || [],
    });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingGroup(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.groupName || !formData.lineCode) {
      setError("Please select a role");
      return;
    }
    setSubmitting(true);
    setError("");

    // For now, just add to local state since API might not be available
    const newGroup = {
      groupId: Date.now(),
      groupName: formData.groupName,
      lineCode: formData.lineCode,
      lineName: formData.lineName || formData.groupName,
      description: formData.description,
      members: formData.members,
      isActive: true,
    };

    if (editingGroup) {
      setLineGroups((prev) =>
        prev.map((g) =>
          g.groupId === editingGroup.groupId
            ? { ...g, ...newGroup, groupId: g.groupId }
            : g,
        ),
      );
    } else {
      setLineGroups((prev) => [newGroup, ...prev]);
    }

    setSuccess(editingGroup ? "Group updated!" : "Group created!");
    setShowForm(false);
    setEditingGroup(null);
    setTimeout(() => setSuccess(""), 3000);
    setSubmitting(false);
  };

  const executeDelete = async (id: string) => {
    setDeleteConfirm(null);
    setLineGroups((prev) => prev.filter((g) => String(g.groupId) !== id));
    setSuccess("Group deleted!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const toggleMember = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.includes(email)
        ? prev.members.filter((m) => m !== email)
        : [...prev.members, email],
    }));
  };

  const cycleFilter = () => {
    setStatusFilter((prev) =>
      prev === "all" ? "active" : prev === "active" ? "inactive" : "all",
    );
  };

  const getFilterLabel = () => {
    switch (statusFilter) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      default:
        return "All";
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-3 pt-4">
        <View
          className="flex-row items-center justify-between"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Users size={22} color="#00529B" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold text-gray-900">
                Line Management
              </Text>
              <Text className="text-xs text-gray-500">
                {lineGroups.length} groups • {users.length} users
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {
                loadUsers();
                loadRoles();
              }}
              className="rounded-lg bg-gray-100 p-2"
            >
              <RefreshCw size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              className="flex-row items-center rounded-lg bg-blue-900 px-3 py-2"
            >
              <Plus size={14} color="white" />
              <Text className="ml-1 text-sm font-medium text-white">
                Add Group
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      {success ? (
        <View
          className="mx-4 mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#16a34a" />
            <Text className="ml-2 text-sm text-green-700">{success}</Text>
          </View>
        </View>
      ) : null}
      {error ? (
        <View
          className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <AlertCircle size={16} color="#dc2626" />
            <Text className="ml-2 text-sm text-red-700">{error}</Text>
          </View>
        </View>
      ) : null}

      {/* Search & Filter */}
      <View
        className="flex-row gap-2 px-4 py-3"
        style={
          isDesktop
            ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
            : undefined
        }
      >
        <View className="flex-1 flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Search size={14} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 py-1 text-sm"
            placeholder="Search groups..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
        <TouchableOpacity
          onPress={cycleFilter}
          className={`rounded-lg px-3 py-2 ${statusFilter !== "all" ? "bg-blue-100" : "bg-gray-100"}`}
        >
          <Text
            className={`text-xs font-medium ${statusFilter !== "all" ? "text-blue-700" : "text-gray-600"}`}
          >
            {getFilterLabel()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View
        className="flex-row gap-3 px-4 pb-3"
        style={
          isDesktop
            ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
            : undefined
        }
      >
        <View className="flex-1 items-center rounded-xl border border-gray-200 bg-white p-3">
          <Text className="text-2xl font-bold text-blue-600">
            {lineGroups.length}
          </Text>
          <Text className="text-xs text-gray-500">Total</Text>
        </View>
        <View className="flex-1 items-center rounded-xl border border-gray-200 bg-white p-3">
          <Text className="text-2xl font-bold text-green-600">
            {lineGroups.filter((g) => g.isActive !== false).length}
          </Text>
          <Text className="text-xs text-gray-500">Active</Text>
        </View>
        <View className="flex-1 items-center rounded-xl border border-gray-200 bg-white p-3">
          <Text className="text-2xl font-bold text-blue-600">
            {users.length}
          </Text>
          <Text className="text-xs text-gray-500">Users</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00529B" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: "center",
                  width: "100%",
                  paddingHorizontal: 16,
                  paddingTop: 8,
                }
              : { paddingHorizontal: 16, paddingTop: 8 }
          }
        >
          {filteredGroups.length === 0 ? (
            <View className="items-center py-16">
              <Users size={56} color="#d1d5db" />
              <Text className="mt-3 text-base text-gray-400">
                No line groups yet. Create one!
              </Text>
            </View>
          ) : (
            filteredGroups.map((group: any, idx: number) => (
              <View
                key={`group-${group.groupId || idx}`}
                className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                <View className="px-4 py-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {group.groupName}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <Text className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {group.lineCode}
                        </Text>
                        <View
                          className={`rounded-full px-2 py-0.5 ${group.isActive !== false ? "bg-green-100" : "bg-red-100"}`}
                        >
                          <Text
                            className={`text-xs ${group.isActive !== false ? "text-green-700" : "text-red-700"}`}
                          >
                            {group.isActive !== false ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-1 text-xs text-gray-400">
                        {(group.members || []).length} members
                      </Text>
                    </View>
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => handleEdit(group)}
                        className="mr-1 rounded-lg bg-blue-50 p-2"
                      >
                        <Edit size={14} color="#00529B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setDeleteConfirm({
                            id: String(group.groupId),
                            name: group.groupName,
                          })
                        }
                        className="rounded-lg bg-red-50 p-2"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
          <Text className="mb-6 mt-3 text-sm text-gray-500">
            Showing {filteredGroups.length} groups
          </Text>
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View
          className="flex-1 bg-black/50"
          style={
            isDesktop
              ? { justifyContent: "center", alignItems: "center" }
              : { justifyContent: "flex-end" }
          }
        >
          <View
            style={
              isDesktop
                ? {
                    backgroundColor: "white",
                    borderRadius: 16,
                    width: 600,
                    maxHeight: "90%",
                  }
                : {
                    backgroundColor: "white",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "90%",
                  }
            }
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  setEditingGroup(null);
                }}
              >
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">
                {editingGroup ? "Edit" : "Add"} Line Group
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={submitting}>
                <Text className="text-sm font-semibold text-blue-600">
                  {submitting ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >
              {/* ✅ Role Dropdown */}
              {/* Role Dropdown Button - Responsive width */}
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Select Role *
              </Text>
              <TouchableOpacity
                onPress={() => setShowRolePicker(true)}
                className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                style={isDesktop ? { maxWidth: 450 } : undefined} // ✅ Limit width on desktop
              >
                <Text
                  className={`text-sm ${formData.groupName ? "text-gray-900" : "text-gray-400"}`}
                  numberOfLines={1}
                >
                  {formData.groupName ? selectedRoleLabel : "Select a role"}
                </Text>
                <ChevronDown size={16} color="#9ca3af" />
              </TouchableOpacity>

              <Text className="mb-1 text-sm font-medium text-gray-700">
                Line Display Name
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={formData.lineName}
                onChangeText={(t) => setFormData({ ...formData, lineName: t })}
                placeholder="e.g., Production Line 1"
              />

              <Text className="mb-1 text-sm font-medium text-gray-700">
                Description
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={formData.description}
                onChangeText={(t) =>
                  setFormData({ ...formData, description: t })
                }
                placeholder="Optional description"
                multiline
                numberOfLines={3}
              />

              {/* Members */}
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Members ({formData.members.length})
              </Text>
              <View className="mb-3 max-h-48 rounded-lg border border-gray-200">
                <ScrollView>
                  {memberOptions
                    .slice(0, 30)
                    .map((member: any, midx: number) => {
                      const selected = formData.members.includes(member.value);
                      return (
                        <TouchableOpacity
                          key={`m-${midx}`}
                          onPress={() => toggleMember(member.value)}
                          disabled={member.isSupervisor}
                          className={`flex-row items-center justify-between border-b border-gray-100 px-3 py-2.5 ${member.isSupervisor ? "bg-blue-50" : selected ? "bg-blue-50" : ""}`}
                        >
                          <View className="flex-1">
                            <Text className="text-sm text-gray-900">
                              {member.label}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {member.value} • {member.role}
                            </Text>
                          </View>
                          {member.isSupervisor ? (
                            <View className="rounded-full bg-blue-100 px-2 py-0.5">
                              <Text className="text-xs text-blue-700">
                                Supervisor
                              </Text>
                            </View>
                          ) : (
                            <View
                              className={`h-5 w-5 items-center justify-center rounded border-2 ${selected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}
                            >
                              {selected && (
                                <Text className="text-xs text-white">✓</Text>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Role Picker Modal */}
      {/* Role Picker Modal - Responsive */}
      <Modal visible={showRolePicker} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/50"
          style={
            isDesktop
              ? { justifyContent: "center", alignItems: "center" }
              : { justifyContent: "flex-end" }
          }
          activeOpacity={1}
          onPress={() => setShowRolePicker(false)}
        >
          <View
            style={
              isDesktop
                ? {
                    backgroundColor: "white",
                    borderRadius: 16,
                    width: 450, // ✅ Fixed width on desktop
                    maxHeight: 500,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 8,
                  }
                : {
                    backgroundColor: "white",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "70%",
                  }
            }
          >
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
              <Text className="text-lg font-bold text-gray-900">
                Select Role
              </Text>
              <TouchableOpacity
                onPress={() => setShowRolePicker(false)}
                className="p-1"
              >
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Role List */}
            <ScrollView
              className="px-2 py-2"
              showsVerticalScrollIndicator={false}
            >
              {roleOptions.length === 0 ? (
                <View className="items-center py-12">
                  <Users size={40} color="#d1d5db" />
                  <Text className="mt-3 text-gray-400">No roles available</Text>
                  <Text className="mt-1 text-xs text-gray-400">
                    Load users and roles first
                  </Text>
                </View>
              ) : (
                roleOptions.map((opt: any, ridx: number) => (
                  <TouchableOpacity
                    key={`role-${ridx}`}
                    onPress={() => !opt.disabled && handleRoleSelect(opt.value)}
                    disabled={opt.disabled}
                    className={`mx-2 mb-1 flex-row items-center justify-between rounded-lg px-4 py-3 ${
                      formData.groupName === opt.value
                        ? "border border-blue-200 bg-blue-50"
                        : opt.disabled
                          ? "bg-gray-50 opacity-50"
                          : "border border-transparent bg-white hover:bg-gray-50"
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-sm ${formData.groupName === opt.value ? "font-semibold text-blue-900" : "text-gray-700"}`}
                      >
                        {opt.label}
                      </Text>
                      {opt.disabled && (
                        <Text className="mt-0.5 text-xs text-gray-400">
                          Already created
                        </Text>
                      )}
                    </View>
                    {formData.groupName === opt.value && (
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                        <Text className="text-xs text-white">✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            <View className="border-t border-gray-200 bg-gray-50 px-5 py-3">
              <Text className="text-center text-xs text-gray-400">
                {roleOptions.length} role{roleOptions.length !== 1 ? "s" : ""}{" "}
                available
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-80 rounded-xl bg-white p-6 shadow-lg">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              Delete Group
            </Text>
            <Text className="mb-6 text-sm text-gray-600">
              Delete "{deleteConfirm?.name}"?
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2.5"
              >
                <Text className="text-sm font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (deleteConfirm) executeDelete(deleteConfirm.id);
                }}
                className="rounded-lg bg-red-600 px-4 py-2.5"
              >
                <Text className="text-sm font-semibold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
