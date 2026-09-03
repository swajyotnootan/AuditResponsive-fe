// components/dashboards/admin/UserManagement.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { userAPI } from "@/services/api";
import {
  AlertCircle,
  Check,
  CheckCircle,
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
  Modal,
  Image as RNImage,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import UserFormModal from "./UserFormModal";

interface UserData {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  phone?: string;
  active?: boolean;
  [key: string]: any;
}

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await userAPI.getAll();
      const userList = Array.isArray(res) ? res : res?.data || [];
      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = searchQuery.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

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
        if (val !== undefined && val !== null && val !== "")
          cleanedData[key] = val;
      });

      if (Array.isArray(cleanedData.certifiedForProcess)) {
        cleanedData.certifiedForProcess =
          cleanedData.certifiedForProcess.join(",");
      }

      delete cleanedData.age;
      delete cleanedData.confirmPassword;
      // delete cleanedData.namePrefix;

      if (profilePhoto && profilePhoto.startsWith("data:image")) {
        cleanedData.profilePhoto = profilePhoto;
      }
      if (signature && signature.startsWith("data:image")) {
        cleanedData.signature = signature;
      }

      if (
        !cleanedData.firstName ||
        !cleanedData.lastName ||
        !cleanedData.email
      ) {
        setError("Required fields missing");
        return;
      }

      if (editUser?.id) {
        await userAPI.update(String(editUser.id), cleanedData);
      } else {
        if (!password) {
          setError("Password is required");
          return;
        }
        cleanedData.password = password;
        await userAPI.create(cleanedData);
      }

      setSuccess(editUser ? "User updated!" : "User created!");
      setShowForm(false);
      setEditUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-200">
        <View
          className="flex-row items-center justify-between"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <View className="items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
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
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={fetchUsers}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <RefreshCw size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              className="flex-row items-center px-3 py-2 bg-blue-900 rounded-lg"
            >
              <Plus size={14} color="white" />
              <Text className="ml-1 text-sm font-medium text-white">
                Add User
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      {success ? (
        <View
          className="flex-row items-center px-4 py-3 mx-4 mt-3 border border-green-200 bg-green-50 rounded-xl"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <CheckCircle size={16} color="#16a34a" />
          <Text className="flex-1 ml-2 text-sm text-green-700">{success}</Text>
          <TouchableOpacity onPress={() => setSuccess("")}>
            <Text className="text-lg font-bold text-green-500">×</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? (
        <View
          className="flex-row items-center px-4 py-3 mx-4 mt-3 border border-red-200 bg-red-50 rounded-xl"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <AlertCircle size={16} color="#dc2626" />
          <Text className="flex-1 ml-2 text-sm text-red-700">{error}</Text>
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
        <View className="flex-row items-center px-3 py-2 bg-gray-100 rounded-lg">
          <Search size={14} color="#9ca3af" />
          <TextInput
            className="flex-1 py-1 ml-2 text-sm"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="items-center justify-center flex-1">
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
                    className="mb-3 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl"
                  >
                    <View className="px-4 py-3">
                      <View className="flex-row items-center">
                        <View className="items-center justify-center w-10 h-10 mr-3 overflow-hidden bg-blue-100 rounded-full">
                          {user.profilePhotoPath ? (
                            <RNImage
                              source={{
                                uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo`,
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
                          <View className="flex-row items-center mt-0.5">
                            <Mail size={12} color="#9ca3af" />
                            <Text className="ml-1 text-xs text-gray-500">
                              {user.email}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2 mt-1">
                            <View
                              className={`px-2 py-0.5 rounded-full ${user.active ? "bg-green-100" : "bg-red-100"}`}
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
                      <View className="flex-row justify-end gap-1 mt-3">
                        <TouchableOpacity
                          onPress={() => handleEdit(user)}
                          className="p-2 rounded-lg bg-blue-50"
                        >
                          <Edit size={15} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleToggleActive(user.id)}
                          className="p-2 rounded-lg bg-gray-50"
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
                          className="p-2 rounded-lg bg-red-50"
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

              {/* Desktop: Table */}
              {isDesktop && (
                <View className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
                  <View className="flex-row bg-gray-50 py-2.5 px-4 border-b border-gray-200">
                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">
                      User
                    </Text>
                    <Text className="w-40 text-xs font-semibold text-gray-500 uppercase">
                      Email
                    </Text>
                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase">
                      Role
                    </Text>
                    <Text className="w-20 text-xs font-semibold text-center text-gray-500 uppercase">
                      Status
                    </Text>
                    <Text className="text-xs font-semibold text-center text-gray-500 uppercase w-28">
                      Actions
                    </Text>
                  </View>
                  {filteredUsers.map((user) => (
                    <View
                      key={String(user.id)}
                      className="flex-row items-center px-4 py-3 border-b border-gray-100"
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="items-center justify-center w-8 h-8 mr-3 overflow-hidden bg-blue-100 rounded-full">
                          {user.profilePhotoPath ? (
                            <RNImage
                              source={{
                                uri: `${API_BASE_URL}/api/users/${user.id}/profile-photo`,
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
                      <View className="items-center w-20">
                        <View
                          className={`px-2 py-0.5 rounded-full ${user.active ? "bg-green-100" : "bg-red-100"}`}
                        >
                          <Text
                            className={`text-xs ${user.active ? "text-green-700" : "text-red-700"}`}
                          >
                            {user.active ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row justify-center gap-1 w-28">
                        <TouchableOpacity
                          onPress={() => handleEdit(user)}
                          className="p-1.5 bg-blue-50 rounded-lg"
                        >
                          <Edit size={14} color="#00529B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleToggleActive(user.id)}
                          className="p-1.5 bg-gray-50 rounded-lg"
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
                          className="p-1.5 bg-red-50 rounded-lg"
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
          <Text className="mt-3 mb-6 text-sm text-gray-500">
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
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="p-6 bg-white shadow-lg rounded-xl w-80">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              Delete User
            </Text>
            <Text className="mb-6 text-sm text-gray-600">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-300"
              >
                <Text className="text-sm font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (deleteConfirm) executeDelete(deleteConfirm.id);
                }}
                className="px-4 py-2.5 rounded-lg bg-red-600"
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
