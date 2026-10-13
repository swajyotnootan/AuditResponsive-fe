// components/dashboards/admin/UserManagement.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Platform,
  Image as RNImage,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import UserFormModal from "./UserFormModal";

interface Company {
  id: string | number; // ✅ Allow number
  name: string;
}
interface Plant {
  id: string | number; // ✅ Allow number
  name: string;
  companyId: string | number;
}
interface Site {
  id: string | number; // ✅ Allow number
  name: string;
  plantId: string | number;
}

interface UserData {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  phone?: string;
  active?: boolean;

  companyId?: string | number;
  plantId?: string | number;
  siteId?: string | number;
  company?: { id: string | number; name: string };
  plant?: { id: string | number; name: string };
  site?: { id: string | number; name: string };
  [key: string]: any;
}

// ✅ Emit profile-photo-updated event (web + native)
const emitProfilePhotoUpdated = (userId: string | number) => {
  const payload = { userId: String(userId) };
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("profile-photo-updated", { detail: payload }),
    );
  } else {
    DeviceEventEmitter.emit("profile-photo-updated", payload);
  }
};

export default function UserManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [cachedPlants, setCachedPlants] = useState<Record<string, Plant[]>>({});
  const [cachedSites, setCachedSites] = useState<Record<string, Site[]>>({});

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  const [hoveredPlant, setHoveredPlant] = useState<string | null>(null);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now());

  useEffect(() => {
    fetchUsers();
    fetchCompaniesForFilter();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await userAPI.getAll();
      const userList = Array.isArray(res) ? res : res?.data || [];
      setUsers(userList);
      setAvatarCacheBuster(Date.now());
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompaniesForFilter = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enterprise/companies`);
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  const fetchPlantsForCompany = async (companyId: string | number) => {
    const idStr = String(companyId); // ✅ Force to string
    if (cachedPlants[idStr]) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/enterprise/plants/company/${idStr}`,
      );
      const data = await res.json();
      const plantList = Array.isArray(data) ? data : data?.data || [];
      setCachedPlants((prev) => ({ ...prev, [idStr]: plantList }));
    } catch (err) {
      console.error("Error fetching plants:", err);
    }
  };

  const fetchSitesForPlant = async (plantId: string | number) => {
    const idStr = String(plantId); // ✅ Force to string
    if (cachedSites[idStr]) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/enterprise/sites/plant/${idStr}`,
      );
      const data = await res.json();
      const siteList = Array.isArray(data) ? data : data?.data || [];
      setCachedSites((prev) => ({ ...prev, [idStr]: siteList }));
    } catch (err) {
      console.error("Error fetching sites:", err);
    }
  };

  const filteredUsers = users.filter((user, index) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search);

    const uCompanyId = String(
      user.companyId ?? user.company?.id ?? user.company_id ?? "",
    );
    const uPlantId = String(
      user.plantId ?? user.plant?.id ?? user.plant_id ?? "",
    );
    const uSiteId = String(user.siteId ?? user.site?.id ?? user.site_id ?? "");

    const matchesCompany = !selectedCompany || uCompanyId === selectedCompany;
    const matchesPlant = !selectedPlant || uPlantId === selectedPlant;
    const matchesSite =
      selectedSites.length === 0 || selectedSites.includes(uSiteId);

    const isMatch =
      matchesSearch && matchesCompany && matchesPlant && matchesSite;

    // ✅ NEW DEBUG: ONLY log users who ACTUALLY HAVE location data
    if (selectedCompany || selectedPlant || selectedSites.length > 0) {
      if (uCompanyId !== "" || uPlantId !== "" || uSiteId !== "") {
        console.log(
          `🧪 [FILTER TEST - HAS DATA] User: ${user.firstName} ${user.lastName} (Role: ${user.role})`,
        );
        console.log(
          `   -> User's IDs: Company="${uCompanyId}", Plant="${uPlantId}", Site="${uSiteId}"`,
        );
        console.log(
          `   -> Selected IDs: Company="${selectedCompany}", Plant="${selectedPlant}", Sites=[${selectedSites}]`,
        );
        console.log(
          `   -> Matches? Company: ${matchesCompany}, Plant: ${matchesPlant}, Site: ${matchesSite} => FINAL: ${isMatch ? "✅ KEEP" : "❌ FILTERED OUT"}`,
        );
      }
    }

    return isMatch;
  });

  const handleCompanyInteract = (companyId: string | number) => {
    const idStr = String(companyId); // ✅ Force to string
    console.log("👆 [CLICK] Company clicked, ID:", idStr);
    setHoveredCompany(idStr);
    setHoveredPlant(null);
    setSelectedCompany(idStr);
    setSelectedPlant("");
    setSelectedSites([]);
    fetchPlantsForCompany(idStr);
  };

  const handlePlantInteract = (plantId: string | number) => {
    const idStr = String(plantId); // ✅ Force to string
    console.log("👆 [CLICK] Plant clicked, ID:", idStr);
    setHoveredPlant(idStr);
    setSelectedPlant(idStr);
    setSelectedSites([]);
    fetchSitesForPlant(idStr);
  };

  const toggleSiteSelection = (siteId: string | number) => {
    const idStr = String(siteId); // ✅ Force to string
    setSelectedSites((prev) => {
      const isNew = !prev.includes(idStr);
      console.log(
        `👆 [CLICK] Site ${idStr} ${isNew ? "selected" : "deselected"}`,
      );
      return isNew ? [...prev, idStr] : prev.filter((id) => id !== idStr);
    });
  };

  // If you use Option A, you can simplify applyLocationFilter to just close the modal:
  const applyLocationFilter = () => {
    setShowLocationDropdown(false);
  };

  const clearLocationFilter = () => {
    setSelectedCompany("");
    setSelectedPlant("");
    setSelectedSites([]);
    setHoveredCompany(null);
    setHoveredPlant(null);
  };

  const getFilterSummary = () => {
    if (selectedSites.length > 0) return `${selectedSites.length} Sites`;
    if (selectedPlant) {
      const allPlants = Object.values(cachedPlants).flat();
      return (
        allPlants.find((p) => String(p.id) === selectedPlant)?.name || "Plant"
      );
    }
    if (selectedCompany) {
      return (
        companies.find((c) => String(c.id) === selectedCompany)?.name ||
        "Company"
      );
    }
    return "Location Filter";
  };
  const executeDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      await userAPI.deleteUser(id);
      setUsers((prev) => prev.filter((u) => String(u.id) !== id));
      setSuccess("User deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  const handleToggleActive = async (userId: number | string) => {
    try {
      await userAPI.toggleActive(String(userId));
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (user: UserData) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const handleSave = async (data: any) => {
    try {
      const { profilePhoto, signature, password, ...restData } = data;
      const cleanedData: any = {};

      Object.keys(restData).forEach((key) => {
        const val = restData[key];
        if (val === undefined || val === null || val === "") return;
        if (Array.isArray(val) && val.length === 0) return;
        cleanedData[key] = val;
      });

      if (Array.isArray(cleanedData.certifiedForProcess)) {
        cleanedData.certifiedForProcess =
          cleanedData.certifiedForProcess.join(",");
      }

      delete cleanedData.age;
      delete cleanedData.confirmPassword;

      // Convert numeric IDs
      [
        "companyId",
        "plantId",
        "siteId",
        "unitId",
        "managerId",
        "hodId",
        "reportingToId",
      ].forEach((k) => {
        if (cleanedData[k]) cleanedData[k] = Number(cleanedData[k]);
      });

      // Uppercase enum-like fields
      if (cleanedData.gender)
        cleanedData.gender = String(cleanedData.gender).toUpperCase();
      if (cleanedData.role)
        cleanedData.role = String(cleanedData.role).toUpperCase();
      if (cleanedData.department)
        cleanedData.department = String(cleanedData.department).toUpperCase();
      if (cleanedData.employmentType)
        cleanedData.employmentType = String(
          cleanedData.employmentType,
        ).toUpperCase();

      if (profilePhoto && profilePhoto.startsWith("data:image")) {
        cleanedData.profilePhoto = profilePhoto;
      }
      if (signature && signature.startsWith("data:image")) {
        cleanedData.signature = signature;
      }

      cleanedData.profilePhotoAction = data.profilePhotoAction || "KEEP";
      cleanedData.signatureAction = data.signatureAction || "KEEP";

      if (
        !cleanedData.firstName ||
        !cleanedData.lastName ||
        !cleanedData.email
      ) {
        setError("Required fields missing");
        return;
      }

      let savedUserId: string | number | null = null; // ✅ NEW

      if (editUser?.id) {
        await userAPI.update(String(editUser.id), cleanedData);
        savedUserId = editUser.id; // ✅ NEW
      } else {
        if (!password) {
          setError("Password is required");
          return;
        }
        cleanedData.password = password;
        cleanedData.status = data.active ?? true;
        delete cleanedData.active;

        console.log(
          "🟢 [CREATE] Payload:",
          JSON.stringify(cleanedData, null, 2),
        );
        const created = await userAPI.create(cleanedData); // ✅ capture result
        savedUserId = created?.id ?? created?.data?.id ?? null; // ✅ NEW
      }

      // ✅ NEW — tell Navbar (and anyone else) that a photo may have changed
      if (savedUserId) {
        emitProfilePhotoUpdated(savedUserId);
      }

      setSuccess(editUser ? "User updated!" : "User created!");
      setShowForm(false);
      setEditUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("🟣 [PARENT SAVE] Error:", err);
      setError(err.message || "Failed to save");
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
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Mail size={22} color="#00529B" />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold text-gray-900">
                User Management
              </Text>
              <Text className="text-xs text-gray-500">
                {users.length} users
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {/* ✅ Unified Cascading Location Filter Button */}
            <View className="relative" style={{ zIndex: 1000 }}>
              <TouchableOpacity
                onPress={() => setShowLocationDropdown(!showLocationDropdown)}
                className={`flex-row items-center rounded-lg border px-3 py-2 ${
                  selectedCompany || selectedPlant || selectedSites.length > 0
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Building
                  size={14}
                  color={
                    selectedCompany || selectedPlant || selectedSites.length > 0
                      ? "#00529B"
                      : "#6b7280"
                  }
                />
                <Text
                  className={`ml-1 text-xs font-medium ${
                    selectedCompany || selectedPlant || selectedSites.length > 0
                      ? "text-blue-900"
                      : "text-gray-600"
                  }`}
                >
                  {getFilterSummary()}
                </Text>
                <ChevronDown size={14} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Clear Filter Indicator */}
            {(selectedCompany || selectedPlant || selectedSites.length > 0) && (
              <TouchableOpacity
                onPress={clearLocationFilter}
                className="rounded-lg border border-red-200 bg-red-50 p-2"
              >
                <X size={14} color="#ef4444" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={fetchUsers}
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
                Add User
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ✅ LOCATION DROPDOWN MODAL - Renders at root level to avoid z-index issues */}
      <Modal
        visible={showLocationDropdown}
        transparent
        animationType="none"
        onRequestClose={() => setShowLocationDropdown(false)}
      >
        <View className="flex-1 bg-transparent">
          {/* Invisible overlay to close on click outside */}
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowLocationDropdown(false)}
          />

          {/* Dropdown container - positioned absolutely */}
          <View
            style={{
              position: "absolute",
              top: 85,
              right: isDesktop ? (screenWidth - 1200) / 2 + 320 : 16,
              zIndex: 99999,
            }}
          >
            <View
              className="flex-row overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
              style={{ width: 450, height: 300 }}
            >
              {/* Column 1: Companies */}
              <View className="w-1/3 border-r border-gray-100">
                <View className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                  <Text className="text-xs font-bold uppercase text-gray-500">
                    Companies
                  </Text>
                </View>
                <ScrollView>
                  {companies.map((company) => {
                    const webProps =
                      Platform.OS === "web"
                        ? { onHoverIn: () => handleCompanyInteract(company.id) }
                        : {};
                    return (
                      <TouchableOpacity
                        key={company.id}
                        onPress={() => handleCompanyInteract(company.id)}
                        {...webProps}
                        className={`flex-row items-center justify-between px-3 py-2.5 ${
                          hoveredCompany === String(company.id) // ✅ Convert to string
                            ? "bg-blue-50"
                            : "bg-white"
                        }`}
                      >
                        <Text
                          className={`text-sm ${hoveredCompany === String(company.id) ? "font-medium text-blue-900" : "text-gray-700"}`}
                        >
                          {company.name}
                        </Text>
                        <ChevronRight size={14} color="#9ca3af" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Column 2: Plants */}
              <View className="w-1/3 border-r border-gray-100">
                <View className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                  <Text className="text-xs font-bold uppercase text-gray-500">
                    Plants
                  </Text>
                </View>
                <ScrollView>
                  {hoveredCompany && cachedPlants[hoveredCompany] ? (
                    cachedPlants[hoveredCompany].map((plant) => {
                      const webProps =
                        Platform.OS === "web"
                          ? { onHoverIn: () => handlePlantInteract(plant.id) }
                          : {};
                      return (
                        <TouchableOpacity
                          key={plant.id}
                          onPress={() => handlePlantInteract(plant.id)}
                          {...webProps}
                          className={`flex-row items-center justify-between px-3 py-2.5 ${
                            hoveredPlant === String(plant.id) // ✅ Convert to string
                              ? "bg-blue-50"
                              : "bg-white"
                          }`}
                        >
                          <Text
                            className={`text-sm ${hoveredPlant === String(plant.id) ? "font-medium text-blue-900" : "text-gray-700"}`}
                          >
                            {plant.name}
                          </Text>
                          <ChevronRight size={14} color="#9ca3af" />
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View className="items-center p-4">
                      <Text className="text-center text-xs text-gray-400">
                        {hoveredCompany
                          ? "No plants found"
                          : "Select a company"}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Column 3: Sites (with Checkboxes) */}
              <View className="w-1/3">
                <View className="flex-row items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
                  <Text className="text-xs font-bold uppercase text-gray-500">
                    Sites
                  </Text>
                  {hoveredPlant && (
                    <Text className="text-[10px] text-blue-600">
                      {selectedSites.length} selected
                    </Text>
                  )}
                </View>
                <ScrollView>
                  {hoveredPlant && cachedSites[hoveredPlant] ? (
                    cachedSites[hoveredPlant].map((site) => {
                      const siteIdStr = String(site.id);
                      const isSelected = selectedSites.includes(siteIdStr);

                      // 🔍 DEBUG: Add this log
                      if (selectedSites.length > 0) {
                        console.log(
                          `🔍 Site: ${site.name}, ID: ${site.id} (${siteIdStr}), In selectedSites:`,
                          isSelected,
                          "selectedSites:",
                          selectedSites,
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={site.id}
                          onPress={() => toggleSiteSelection(site.id)}
                          className={`flex-row items-center px-3 py-2.5 ${isSelected ? "bg-blue-50" : "bg-white"}`}
                        >
                          <View
                            className={`mr-2 h-4 w-4 items-center justify-center rounded border ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={12} color="white" />}
                          </View>
                          <Text
                            className={`flex-1 text-sm ${isSelected ? "font-medium text-blue-900" : "text-gray-700"}`}
                          >
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View className="items-center p-4">
                      <Text className="text-center text-xs text-gray-400">
                        {hoveredPlant ? "No sites found" : "Select a plant"}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Dropdown Footer Actions */}
              <View className="absolute bottom-0 left-0 right-0 flex-row justify-between border-t border-gray-200 bg-gray-50 px-3 py-2">
                <TouchableOpacity
                  onPress={clearLocationFilter}
                  className="px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-red-600">
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={applyLocationFilter}
                  className="rounded-lg bg-blue-900 px-4 py-1.5"
                >
                  <Text className="text-xs font-medium text-white">
                    Apply Filter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      {success ? (
        <View
          className="mx-4 mt-3 flex-row items-center rounded-xl border border-green-200 bg-green-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <CheckCircle size={16} color="#16a34a" />
          <Text className="ml-2 flex-1 text-sm text-green-700">{success}</Text>
          <TouchableOpacity onPress={() => setSuccess("")}>
            <Text className="text-lg font-bold text-green-500">×</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? (
        <View
          className="mx-4 mt-3 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <AlertCircle size={16} color="#dc2626" />
          <Text className="ml-2 flex-1 text-sm text-red-700">{error}</Text>
          <TouchableOpacity onPress={() => setError("")}>
            <Text className="text-lg font-bold text-red-500">×</Text>
          </TouchableOpacity>
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
            placeholder="Search users..."
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
          {filteredUsers.length === 0 ? (
            <View className="items-center py-16">
              <Mail size={56} color="#d1d5db" />
              <Text className="mt-3 text-base text-gray-400">
                {searchQuery ? "No users match" : "No users found"}
              </Text>
            </View>
          ) : (
            <>
              {/* Mobile: Cards */}
              {!isDesktop &&
                filteredUsers.map((user) => (
                  <View
                    key={String(user.id)}
                    className="mb-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                  >
                    <View className="px-4 py-3">
                      <View className="flex-row items-center">
                        <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100">
                          {user.profilePhotoPath ? (
                            <RNImage
                              source={{
                                uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo?t=${avatarCacheBuster}`,
                              }}
                              style={{ width: "100%", height: "100%" }}
                              onError={() => console.log("No photo")}
                            />
                          ) : (
                            <Text className="font-bold text-blue-900">
                              {(user.firstName?.charAt(0) || "") +
                                (user.lastName?.charAt(0) || "") || "U"}
                            </Text>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </Text>
                          <View className="mt-0.5 flex-row items-center">
                            <Mail size={12} color="#9ca3af" />
                            <Text className="ml-1 text-xs text-gray-500">
                              {user.email}
                            </Text>
                          </View>
                          <View className="mt-1 flex-row items-center gap-2">
                            <View
                              className={`rounded-full px-2 py-0.5 ${user.active ? "bg-green-100" : "bg-red-100"}`}
                            >
                              <Text
                                className={`text-xs ${user.active ? "text-green-700" : "text-red-700"}`}
                              >
                                {user.active ? "Active" : "Inactive"}
                              </Text>
                            </View>
                            <Text className="text-xs text-gray-400">
                              {user.role}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="mt-3 flex-row justify-end gap-1">
                        <TouchableOpacity
                          onPress={() => handleEdit(user)}
                          className="rounded-lg bg-blue-50 p-2"
                        >
                          <Edit size={15} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleToggleActive(user.id)}
                          className="rounded-lg bg-gray-50 p-2"
                        >
                          {user.active ? (
                            <X size={15} color="#ef4444" />
                          ) : (
                            <Check size={15} color="#22c55e" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            setDeleteConfirm({
                              id: String(user.id),
                              name: `${user.firstName} ${user.lastName}`,
                            })
                          }
                          className="rounded-lg bg-red-50 p-2"
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

              {/* Desktop: Table */}
              {isDesktop && (
                <View className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <View className="flex-row border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                    <Text className="flex-1 text-xs font-semibold uppercase text-gray-500">
                      User
                    </Text>
                    <Text className="w-40 text-xs font-semibold uppercase text-gray-500">
                      Email
                    </Text>
                    <Text className="w-24 text-xs font-semibold uppercase text-gray-500">
                      Role
                    </Text>
                    <Text className="w-20 text-center text-xs font-semibold uppercase text-gray-500">
                      Status
                    </Text>
                    <Text className="w-28 text-center text-xs font-semibold uppercase text-gray-500">
                      Actions
                    </Text>
                  </View>
                  {filteredUsers.map((user) => (
                    <View
                      key={String(user.id)}
                      className="flex-row items-center border-b border-gray-100 px-4 py-3"
                    >
                      <View className="flex-1 flex-row items-center">
                        <View className="mr-3 h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-100">
                          {user.profilePhotoPath ? (
                            <RNImage
                              source={{
                                uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo?t=${avatarCacheBuster}`,
                              }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <Text className="text-xs font-bold text-blue-900">
                              {(user.firstName?.charAt(0) || "") +
                                (user.lastName?.charAt(0) || "") || "U"}
                            </Text>
                          )}
                        </View>
                        <Text className="text-sm font-semibold text-gray-900">
                          {user.firstName} {user.lastName}
                        </Text>
                      </View>
                      <Text
                        className="w-40 text-xs text-gray-500"
                        numberOfLines={1}
                      >
                        {user.email}
                      </Text>
                      <Text className="w-24 text-xs text-gray-500">
                        {user.role}
                      </Text>
                      <View className="w-20 items-center">
                        <View
                          className={`rounded-full px-2 py-0.5 ${user.active ? "bg-green-100" : "bg-red-100"}`}
                        >
                          <Text
                            className={`text-xs ${user.active ? "text-green-700" : "text-red-700"}`}
                          >
                            {user.active ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <View className="w-28 flex-row justify-center gap-1">
                        <TouchableOpacity
                          onPress={() => handleEdit(user)}
                          className="rounded-lg bg-blue-50 p-1.5"
                        >
                          <Edit size={14} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleToggleActive(user.id)}
                          className="rounded-lg bg-gray-50 p-1.5"
                        >
                          {user.active ? (
                            <X size={14} color="#ef4444" />
                          ) : (
                            <Check size={14} color="#22c55e" />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            setDeleteConfirm({
                              id: String(user.id),
                              name: `${user.firstName} ${user.lastName}`,
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
            Showing {filteredUsers.length} of {users.length} users
          </Text>
        </ScrollView>
      )}

      {/* UserFormModal */}
      {showForm && (
        <UserFormModal
          isEdit={!!editUser}
          user={editUser}
          onClose={() => {
            setShowForm(false);
            setEditUser(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-80 rounded-xl bg-white p-6 shadow-lg">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              Delete User
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
