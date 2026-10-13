// components/dashboards/admin/AuditTypeManagement.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const STANDARDS = [
  "ISO_9001",
  "IATF_16949",
  "VDA_6_3",
  "ISO_14001",
  "ISO_45001",
  "CUSTOMER_SPECIFIC",
  "INTERNAL",
];

const emptyFormData = {
  code: "",
  name: "",
  description: "",
  standard: "IATF_16949",
  minExperienceRequired: 2,
  requiresCertification: false,
  active: true,
};

export default function AuditTypeManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  // ✅ Use the unsaved changes hook
  const {
    markDirty,
    resetDirty,
    confirmDiscard,
    showDiscardModal,
    cancelDiscard,
    discardChanges,
  } = useUnsavedChanges();

  const [auditTypes, setAuditTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [initialFormData, setInitialFormData] = useState(emptyFormData);

  useEffect(() => {
    fetchAuditTypes();
  }, []);

  const fetchAuditTypes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit-types`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setAuditTypes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch audit types:", err);
      setError("Failed to load audit types");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Check if form has changed
  const hasFormChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  // ✅ Handle form field changes with dirty tracking
  const updateFormField = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const newData = { ...formData, [field]: value };
    if (JSON.stringify(newData) !== JSON.stringify(initialFormData)) {
      markDirty();
    }
  };

  // ✅ Handle modal open
  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      const data = {
        code: item.code || "",
        name: item.name || "",
        description: item.description || "",
        standard: item.standard || "IATF_16949",
        minExperienceRequired: item.minExperienceRequired || 2,
        requiresCertification: item.requiresCertification || false,
        active: item.active !== false,
      };
      setFormData(data);
      setInitialFormData(data);
    } else {
      setEditingItem(null);
      setFormData(emptyFormData);
      setInitialFormData(emptyFormData);
    }
    resetDirty();
    setShowModal(true);
  };

  // ✅ Handle modal close with confirmation
  const closeModal = () => {
    if (hasFormChanged()) {
      confirmDiscard(() => {
        setShowModal(false);
        setEditingItem(null);
        setFormData(emptyFormData);
        setInitialFormData(emptyFormData);
        resetDirty();
      });
    } else {
      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyFormData);
      setInitialFormData(emptyFormData);
      resetDirty();
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      setError("Name and code are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = editingItem
        ? `${API_BASE_URL}/api/audit-types/${editingItem.id}`
        : `${API_BASE_URL}/api/audit-types`;
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Save failed (${res.status}): ${errorText}`);
      }
      setSuccess(editingItem ? "Audit type updated!" : "Audit type created!");
      resetDirty(); // ✅ Reset dirty state after successful save
      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyFormData);
      setInitialFormData(emptyFormData);
      fetchAuditTypes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string, name: string) => {
    setDeleteConfirm(null);
    setSuccess(`Deleting "${name}"...`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit-types/${id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setAuditTypes((prev) => prev.filter((item) => String(item.id) !== id));
        setSuccess(`"${name}" deleted!`);
        setTimeout(() => fetchAuditTypes(), 2000);
      } else {
        setError(`Delete failed (${res.status})`);
        fetchAuditTypes();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete");
      fetchAuditTypes();
    }
    setTimeout(() => setSuccess(""), 3000);
  };

  const filteredTypes = auditTypes.filter(
    (t: any) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatStandard = (standard: string) =>
    standard?.replace(/_/g, " ") || "-";

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
            <Layers size={22} color="#00529B" />
            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">
                Audit Type Management
              </Text>
              <Text className="text-xs text-gray-500">
                {auditTypes.length} audit types
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={fetchAuditTypes}
              className="rounded-lg bg-gray-100 p-2"
            >
              <RefreshCw size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openModal()}
              className="flex-row items-center rounded-lg bg-blue-900 px-3 py-2"
            >
              <Plus size={14} color="white" />
              <Text className="ml-1 text-sm font-medium text-white">
                Add Type
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

      {/* Search */}
      <View
        className="px-4 py-3"
        style={
          isDesktop
            ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
            : undefined
        }
      >
        <View className="flex-row items-center rounded-lg bg-gray-100 px-3 py-2">
          <Search size={14} color="#9ca3af" />
          <TextInput
            className="ml-2 flex-1 py-1 text-sm"
            placeholder="Search audit types..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      {loading && auditTypes.length === 0 ? (
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
          {filteredTypes.length === 0 ? (
            <View className="items-center py-16">
              <Layers size={56} color="#d1d5db" />
              <Text className="mt-3 text-base text-gray-400">
                {searchQuery ? "No audit types match" : "No audit types found"}
              </Text>
            </View>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              {!isDesktop &&
                filteredTypes.map((type: any) => (
                  <View
                    key={type.id}
                    className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                  >
                    <View className="px-4 py-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {type.name}
                          </Text>
                          <View className="mt-1 flex-row flex-wrap items-center gap-2">
                            <Text className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {type.code}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {formatStandard(type.standard)}
                            </Text>
                          </View>
                          <View className="mt-2 flex-row items-center gap-3">
                            <Text className="text-xs text-gray-500">
                              Exp: {type.minExperienceRequired || "-"} yrs
                            </Text>
                            <View
                              className={`rounded-full px-2 py-0.5 ${type.active !== false ? "bg-green-100" : "bg-red-100"}`}
                            >
                              <Text
                                className={`text-xs ${type.active !== false ? "text-green-700" : "text-red-700"}`}
                              >
                                {type.active !== false ? "Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>
                          {type.description ? (
                            <Text
                              className="mt-1 text-xs text-gray-400"
                              numberOfLines={2}
                            >
                              {type.description}
                            </Text>
                          ) : null}
                        </View>
                        <View className="ml-2 flex-row">
                          <TouchableOpacity
                            onPress={() => openModal(type)}
                            className="mr-1 rounded-lg bg-blue-50 p-2"
                          >
                            <Edit size={15} color="#00529B" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setDeleteConfirm({
                                id: String(type.id),
                                name: type.name,
                              })
                            }
                            className="rounded-lg bg-red-50 p-2"
                          >
                            <Trash2 size={15} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

              {/* Desktop: Table Layout */}
              {isDesktop && (
                <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <View className="flex-row border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <Text className="w-20 text-xs font-semibold uppercase text-gray-500">
                      Code
                    </Text>
                    <Text className="flex-1 text-xs font-semibold uppercase text-gray-500">
                      Name
                    </Text>
                    <Text className="w-32 text-xs font-semibold uppercase text-gray-500">
                      Standard
                    </Text>
                    <Text className="w-20 text-center text-xs font-semibold uppercase text-gray-500">
                      Experience
                    </Text>
                    <Text className="w-20 text-center text-xs font-semibold uppercase text-gray-500">
                      Status
                    </Text>
                    <Text className="w-24 text-center text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </Text>
                  </View>
                  {filteredTypes.map((type: any) => (
                    <View
                      key={type.id}
                      className="flex-row items-center border-b border-gray-100 px-4 py-3 hover:bg-gray-50"
                    >
                      <Text className="w-20 text-xs font-medium text-blue-700">
                        {type.code}
                      </Text>
                      <Text
                        className="flex-1 text-sm text-gray-900"
                        numberOfLines={1}
                      >
                        {type.name}
                      </Text>
                      <Text className="w-32 text-xs text-gray-500">
                        {formatStandard(type.standard)}
                      </Text>
                      <Text className="w-20 text-center text-xs text-gray-500">
                        {type.minExperienceRequired || "-"} yrs
                      </Text>
                      <View className="w-20 items-center">
                        <View
                          className={`rounded-full px-2 py-0.5 ${type.active !== false ? "bg-green-100" : "bg-red-100"}`}
                        >
                          <Text
                            className={`text-xs ${type.active !== false ? "text-green-700" : "text-red-700"}`}
                          >
                            {type.active !== false ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <View className="w-24 flex-row justify-center gap-1">
                        <TouchableOpacity
                          onPress={() => openModal(type)}
                          className="rounded-lg bg-blue-50 p-1.5"
                        >
                          <Edit size={14} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            setDeleteConfirm({
                              id: String(type.id),
                              name: type.name,
                            })
                          }
                          className="rounded-lg bg-red-50 p-1.5"
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <Text className="mb-6 mt-3 text-sm text-gray-500">
            Showing {filteredTypes.length} of {auditTypes.length} audit types
          </Text>
        </ScrollView>
      )}

      {/* Add/Edit Modal - Responsive */}
      <Modal visible={showModal} transparent animationType="slide">
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
                    maxHeight: "85%",
                  }
                : {
                    backgroundColor: "white",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "85%",
                  }
            }
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
              {/* ✅ Cancel with confirmation */}
              <TouchableOpacity onPress={closeModal}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">
                {editingItem ? "Edit" : "Add"} Audit Type
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                <Text className="text-sm font-semibold text-blue-600">
                  {loading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >
              <View style={isDesktop ? { flexDirection: "row", gap: 12 } : {}}>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1 text-sm font-medium text-gray-700">
                    Code *
                  </Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm uppercase"
                    value={formData.code}
                    onChangeText={(t) =>
                      updateFormField("code", t.toUpperCase())
                    }
                    placeholder="e.g., IATF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="mb-1 text-sm font-medium text-gray-700">
                    Name *
                  </Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                    value={formData.name}
                    onChangeText={(t) => updateFormField("name", t)}
                    placeholder="e.g., IATF Internal Audit"
                  />
                </View>
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Description
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={formData.description}
                onChangeText={(t) => updateFormField("description", t)}
                placeholder="Description"
                multiline
                numberOfLines={2}
              />
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Standard
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {STANDARDS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => updateFormField("standard", s)}
                    className={`rounded-full border px-3 py-1.5 ${formData.standard === s ? "border-blue-900 bg-blue-900" : "border-gray-300 bg-white"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${formData.standard === s ? "text-white" : "text-gray-600"}`}
                    >
                      {s.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Min Experience (Years)
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={String(formData.minExperienceRequired)}
                onChangeText={(t) =>
                  updateFormField("minExperienceRequired", parseInt(t) || 0)
                }
                keyboardType="numeric"
              />
              <View className="mb-1 flex-row items-center justify-between py-2">
                <Text className="text-sm font-medium text-gray-700">
                  Requires Certification
                </Text>
                <Switch
                  value={formData.requiresCertification}
                  onValueChange={(v) =>
                    updateFormField("requiresCertification", v)
                  }
                  trackColor={{ false: "#d1d5db", true: "#00529B" }}
                />
              </View>
              <View className="mb-1 flex-row items-center justify-between py-2">
                <Text className="text-sm font-medium text-gray-700">
                  Active
                </Text>
                <Switch
                  value={formData.active}
                  onValueChange={(v) => updateFormField("active", v)}
                  trackColor={{ false: "#d1d5db", true: "#00529B" }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ✅ Discard Changes Modal */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDiscard}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 24,
              elevation: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#fef2f2",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: 16,
              }}
            >
              <X size={26} color="#dc2626" />
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#111827",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Discard changes?
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                textAlign: "center",
                lineHeight: 21,
                marginBottom: 24,
              }}
            >
              You have unsaved changes. Are you sure you want to leave without
              saving?
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={cancelDiscard}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  backgroundColor: "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}
                >
                  Stay
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  discardChanges(() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData(emptyFormData);
                    setInitialFormData(emptyFormData);
                    resetDirty();
                  })
                }
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: "#dc2626",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "white" }}
                >
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-80 rounded-xl bg-white p-6 shadow-lg">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              Delete Audit Type
            </Text>
            <Text className="mb-6 text-sm text-gray-600">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
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
                  if (deleteConfirm)
                    executeDelete(deleteConfirm.id, deleteConfirm.name);
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
