// components/dashboards/admin/EnterpriseManagement.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { enterpriseAPI } from "@/services/enterpriseAPI";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  CheckCircle,
  ChevronRight,
  Edit,
  Factory,
  Layers,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
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

const emptyFormData = {
  name: "",
  code: "",
  city: "",
  state: "",
  country: "",
  classification: "",
  unitType: "",
};

export default function EnterpriseManagement() {
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

  const [companies, setCompanies] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"companies" | "plants" | "sites" | "units">(
    "companies",
  );
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
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
    loadData();
  }, []);

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
        name: item.name || "",
        code: item.code || "",
        city: item.city || "",
        state: item.state || "",
        country: item.country || "",
        classification: item.classification || "",
        unitType: item.unitType || "",
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

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await enterpriseAPI.getCompanies();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlants = async (companyId: string) => {
    setLoading(true);
    try {
      const data = await enterpriseAPI.getPlantsByCompany(companyId);
      setPlants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async (plantId: string) => {
    setLoading(true);
    try {
      const data = await enterpriseAPI.getSitesByPlant(plantId);
      setSites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async (siteId: string) => {
    setLoading(true);
    try {
      const data = await enterpriseAPI.getUnitsBySite(siteId);
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = () => {
    switch (view) {
      case "companies":
        return companies;
      case "plants":
        return plants;
      case "sites":
        return sites;
      case "units":
        return units;
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case "companies":
        return "Companies";
      case "plants":
        return "Plants";
      case "sites":
        return "Sites";
      case "units":
        return "Units";
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case "companies":
        return Building;
      case "plants":
        return Factory;
      case "sites":
        return MapPin;
      case "units":
        return Layers;
    }
  };

  const handleSave = async () => {
    console.log("🔄 Saving...", { editingItem, view, formData });

    if (!formData.name) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = { ...formData };

      // Add parent ID for nested entities
      if (view !== "companies") {
        if (view === "plants") (data as any).companyId = selectedParent?.id;
        else if (view === "sites") (data as any).plantId = selectedParent?.id;
        else if (view === "units") (data as any).siteId = selectedParent?.id;
      }

      // ✅ Check if we're editing or creating
      const isEditing =
        editingItem && editingItem.id !== undefined && editingItem.id !== null;

      console.log("📌 isEditing:", isEditing);

      if (isEditing) {
        // ✅ UPDATE
        console.log("📌 UPDATING:", editingItem.id);
        switch (view) {
          case "companies":
            await enterpriseAPI.updateCompany(editingItem.id, data);
            break;
          case "plants":
            await enterpriseAPI.updatePlant(editingItem.id, data);
            break;
          case "sites":
            await enterpriseAPI.updateSite(editingItem.id, data);
            break;
          case "units":
            await enterpriseAPI.updateUnit(editingItem.id, data);
            break;
        }
      } else {
        // ✅ CREATE
        console.log("📌 CREATING NEW");
        switch (view) {
          case "companies":
            await enterpriseAPI.createCompany(data);
            break;
          case "plants":
            await enterpriseAPI.createPlant(data);
            break;
          case "sites":
            await enterpriseAPI.createSite(data);
            break;
          case "units":
            await enterpriseAPI.createUnit(data);
            break;
        }
      }

      setSuccess(`${editingItem ? "Updated" : "Created"} successfully!`);
      resetDirty();
      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyFormData);
      setInitialFormData(emptyFormData);
      refreshView();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("❌ Save error:", err);
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    setLoading(true);
    setError("");
    setDeleteConfirm(null);
    try {
      let url = "";
      switch (view) {
        case "companies":
          url = `${API_BASE_URL}/api/enterprise/companies/${id}`;
          break;
        case "plants":
          url = `${API_BASE_URL}/api/enterprise/plants/${id}`;
          break;
        case "sites":
          url = `${API_BASE_URL}/api/enterprise/sites/${id}`;
          break;
        case "units":
          url = `${API_BASE_URL}/api/enterprise/units/${id}`;
          break;
      }
      const response = await fetch(url, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        setSuccess("Deleted successfully!");
        refreshView();
      } else {
        const errorText = await response.text();
        setError(`Delete failed (${response.status})`);
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const refreshView = () => {
    switch (view) {
      case "companies":
        loadData();
        break;
      case "plants":
        if (selectedParent) loadPlants(String(selectedParent.id));
        break;
      case "sites":
        if (selectedParent) loadSites(String(selectedParent.id));
        break;
      case "units":
        if (selectedParent) loadUnits(String(selectedParent.id));
        break;
    }
  };

  const drillDown = (item: any) => {
    setSelectedParent(item);
    switch (view) {
      case "companies":
        loadPlants(String(item.id));
        setView("plants");
        break;
      case "plants":
        loadSites(String(item.id));
        setView("sites");
        break;
      case "sites":
        loadUnits(String(item.id));
        setView("units");
        break;
    }
  };

  const goBack = () => {
    switch (view) {
      case "plants":
        setView("companies");
        break;
      case "sites":
        setView("plants");
        break;
      case "units":
        setView("sites");
        break;
    }
  };

  const data = getCurrentData() || [];
  const filteredData = data.filter(
    (item: any) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const ViewIcon = getViewIcon();

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
            {view !== "companies" && (
              <TouchableOpacity
                onPress={goBack}
                className="mr-3 rounded-lg bg-gray-100 p-1.5"
              >
                <ArrowLeft size={18} color="#00529B" />
              </TouchableOpacity>
            )}
            <ViewIcon size={22} color="#00529B" />
            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">
                {getViewTitle()}
              </Text>
              <Text className="text-xs text-gray-500">{data.length} items</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={openModal}
            className="flex-row items-center rounded-lg bg-blue-900 px-3 py-2"
          >
            <Plus size={14} color="white" />
            <Text className="ml-1 text-sm font-medium text-white">Add New</Text>
          </TouchableOpacity>
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
            placeholder={`Search ${getViewTitle().toLowerCase()}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
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
          {filteredData.length === 0 ? (
            <View className="items-center py-16">
              <ViewIcon size={56} color="#d1d5db" />
              <Text className="mt-3 text-base text-gray-400">
                No {getViewTitle().toLowerCase()} found
              </Text>
            </View>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              {!isDesktop &&
                filteredData.map((item: any) => (
                  <View
                    key={item.id}
                    className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                  >
                    <TouchableOpacity
                      className="px-4 py-3"
                      onPress={() =>
                        view !== "units" ? drillDown(item) : null
                      }
                      disabled={view === "units"}
                    >
                      <View className="flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <ViewIcon size={18} color="#00529B" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </Text>
                          <View className="mt-1 flex-row flex-wrap gap-2">
                            {item.code && (
                              <Text className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                {item.code}
                              </Text>
                            )}
                            {item.city && (
                              <Text className="text-xs text-gray-500">
                                {item.city}
                                {item.state ? `, ${item.state}` : ""}
                              </Text>
                            )}
                            {item.classification && (
                              <Text className="text-xs text-gray-500">
                                {item.classification}
                              </Text>
                            )}
                            {item.unitType && (
                              <Text className="text-xs text-gray-500">
                                {item.unitType}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center">
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              openModal(item);
                            }}
                            className="mr-1 rounded-lg bg-blue-50 p-2"
                          >
                            <Edit size={14} color="#00529B" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                id: String(item.id),
                                name: item.name,
                              });
                            }}
                            className="rounded-lg bg-red-50 p-2"
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                          {view !== "units" && (
                            <ChevronRight
                              size={18}
                              color="#9ca3af"
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}

              {/* Desktop: Table Layout */}
              {isDesktop && (
                <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <View className="flex-row border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <Text className="flex-1 text-xs font-semibold uppercase text-gray-500">
                      Name
                    </Text>
                    <Text className="w-24 text-xs font-semibold uppercase text-gray-500">
                      Code
                    </Text>
                    <Text className="w-40 text-xs font-semibold uppercase text-gray-500">
                      Details
                    </Text>
                    <Text className="w-24 text-center text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </Text>
                  </View>
                  {filteredData.map((item: any) => (
                    <View
                      key={item.id}
                      className="flex-row items-center border-b border-gray-100 px-4 py-3"
                    >
                      <TouchableOpacity
                        className="flex-1 flex-row items-center"
                        onPress={() =>
                          view !== "units" ? drillDown(item) : null
                        }
                        disabled={view === "units"}
                      >
                        <ViewIcon size={16} color="#00529B" />
                        <Text className="ml-2 text-sm font-semibold text-gray-900">
                          {item.name}
                        </Text>
                        {view !== "units" && (
                          <ChevronRight
                            size={14}
                            color="#9ca3af"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </TouchableOpacity>
                      <Text className="w-24 text-xs text-gray-500">
                        {item.code || "-"}
                      </Text>
                      <Text
                        className="w-40 text-xs text-gray-500"
                        numberOfLines={1}
                      >
                        {[item.city, item.classification, item.unitType]
                          .filter(Boolean)
                          .join(" • ") || "-"}
                      </Text>
                      <View className="w-24 flex-row justify-center gap-1">
                        <TouchableOpacity
                          onPress={() => openModal(item)}
                          className="rounded-lg bg-blue-50 p-1.5"
                        >
                          <Edit size={14} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            setDeleteConfirm({
                              id: String(item.id),
                              name: item.name,
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
            Showing {filteredData.length} of {data.length}{" "}
            {getViewTitle().toLowerCase()}
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
                    width: 500,
                    maxHeight: "80%",
                  }
                : {
                    backgroundColor: "white",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "80%",
                  }
            }
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
              {/* ✅ Cancel with confirmation */}
              <TouchableOpacity onPress={closeModal}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">
                {editingItem ? "Edit" : "Add"} {getViewTitle().slice(0, -1)}
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
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Name *
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={formData.name}
                onChangeText={(t) => updateFormField("name", t)}
                placeholder="Enter name"
              />
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Code
              </Text>
              <TextInput
                className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                value={formData.code}
                onChangeText={(t) => updateFormField("code", t)}
                placeholder="Enter code"
              />
              {view === "plants" && (
                <View
                  style={isDesktop ? { flexDirection: "row", gap: 12 } : {}}
                >
                  <View style={{ flex: 1 }}>
                    <Text className="mb-1 text-sm font-medium text-gray-700">
                      City
                    </Text>
                    <TextInput
                      className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                      value={formData.city}
                      onChangeText={(t) => updateFormField("city", t)}
                      placeholder="City"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="mb-1 text-sm font-medium text-gray-700">
                      State
                    </Text>
                    <TextInput
                      className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                      value={formData.state}
                      onChangeText={(t) => updateFormField("state", t)}
                      placeholder="State"
                    />
                  </View>
                </View>
              )}
              {view === "sites" && (
                <>
                  <Text className="mb-1 text-sm font-medium text-gray-700">
                    Classification
                  </Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                    value={formData.classification}
                    onChangeText={(t) => updateFormField("classification", t)}
                    placeholder="e.g., PRODUCTION"
                  />
                </>
              )}
              {view === "units" && (
                <>
                  <Text className="mb-1 text-sm font-medium text-gray-700">
                    Unit Type
                  </Text>
                  <TextInput
                    className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                    value={formData.unitType}
                    onChangeText={(t) => updateFormField("unitType", t)}
                    placeholder="e.g., PRODUCTION_LINE"
                  />
                </>
              )}
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
            <Text className="mb-2 text-lg font-bold text-gray-900">Delete</Text>
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
                  if (deleteConfirm?.id) executeDelete(deleteConfirm.id);
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
