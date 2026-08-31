// components/dashboards/admin/RoleManagement.tsx

import { API_BASE_URL } from '@/config/apiConfig';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

interface Role {
  id: number | string;
  name: string;
  displayName: string;
  description?: string;
  requiresCompetency?: boolean;
  auditorRole?: boolean;
  minimumCompetencyLevel?: number;
}

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
  requiresCompetency: boolean;
  auditorRole: boolean;
  minimumCompetencyLevel: number;
}

const emptyFormData: RoleFormData = {
  name: '',
  displayName: '',
  description: '',
  requiresCompetency: false,
  auditorRole: false,
  minimumCompetencyLevel: 1,
};

export default function RoleManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [formData, setFormData] =
    useState<RoleFormData>(emptyFormData);

  /*
   * ------------------------------------------------------------
   * UNSAVED CHANGES
   * ------------------------------------------------------------
   */

  const [initialFormData, setInitialFormData] =
    useState<RoleFormData>(emptyFormData);

  const hasUnsavedChanges =
    JSON.stringify(formData) !== JSON.stringify(initialFormData);

  /*
   * ------------------------------------------------------------
   * FETCH ROLES
   * ------------------------------------------------------------
   */

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/roles`);
      const data = await res.json();

      setRoles(
        Array.isArray(data)
          ? data
          : data?.data || data?.roles || []
      );
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * OPEN ADD MODAL
   * ------------------------------------------------------------
   */

  const openAddModal = () => {
    setEditingRole(null);

    const freshFormData: RoleFormData = {
      ...emptyFormData,
    };

    setFormData(freshFormData);
    setInitialFormData(freshFormData);
    setShowModal(true);
  };

  /*
   * ------------------------------------------------------------
   * OPEN EDIT MODAL
   * ------------------------------------------------------------
   */

  const openEditModal = (role: Role) => {
    const roleFormData: RoleFormData = {
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      requiresCompetency: role.requiresCompetency || false,
      auditorRole: role.auditorRole || false,
      minimumCompetencyLevel:
        role.minimumCompetencyLevel || 1,
    };

    setEditingRole(role);
    setFormData(roleFormData);
    setInitialFormData(roleFormData);
    setShowModal(true);
  };

  /*
   * ------------------------------------------------------------
   * CLOSE MODAL
   * ------------------------------------------------------------
   */

  const actuallyCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData(emptyFormData);
    setInitialFormData(emptyFormData);
    setError('');
  };

  const handleCloseModal = () => {
    if (!hasUnsavedChanges) {
      actuallyCloseModal();
      return;
    }

    Alert.alert(
      'Unsaved Changes',
      'You have unsaved changes. Are you sure you want to close?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: actuallyCloseModal,
        },
      ]
    );
  };

  /*
   * ------------------------------------------------------------
   * ANDROID BACK BUTTON
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!showModal) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCloseModal();
        return true;
      }
    );

    return () => subscription.remove();
  }, [showModal, formData, initialFormData]);

  /*
   * ------------------------------------------------------------
   * SAVE
   * ------------------------------------------------------------
   */

  const handleSave = async () => {
    if (!formData.name || !formData.displayName) {
      setError('Name and display name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const method = editingRole ? 'PUT' : 'POST';

      const url = editingRole?.id
        ? `${API_BASE_URL}/api/roles/${editingRole.id}`
        : `${API_BASE_URL}/api/roles`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        let message = 'Failed to save';

        try {
          const err = await res.json();
          message = err.message || message;
        } catch {
          // Keep default error message
        }

        throw new Error(message);
      }

      setSuccess(
        editingRole
          ? 'Role updated!'
          : 'Role created!'
      );

      /*
       * Mark current data as saved before closing.
       * This prevents the unsaved-changes alert from appearing.
       */
      setInitialFormData({
        ...formData,
      });

      setShowModal(false);
      setEditingRole(null);
      setFormData(emptyFormData);
      setInitialFormData(emptyFormData);

      fetchRoles();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * DELETE
   * ------------------------------------------------------------
   */

  const executeDelete = async (
    id: string,
    name: string
  ) => {
    setDeleteConfirm(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/roles/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok || res.status === 204) {
        setRoles(prev =>
          prev.filter(
            r => String(r.id) !== id
          )
        );

        setSuccess(`"${name}" deleted!`);
      } else {
        setError(
          `Delete failed (${res.status})`
        );

        fetchRoles();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(
        err.message || 'Failed to delete'
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * SEARCH
   * ------------------------------------------------------------
   */

  const filteredRoles = roles.filter(r =>
    r.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    r.displayName
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  /*
   * ------------------------------------------------------------
   * UI
   * ------------------------------------------------------------
   */

  return (
    <View className="flex-1 bg-gray-50">

      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
        <View
          className="flex-row justify-between items-center"
          style={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: 'center',
                  width: '100%',
                }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <Shield
              size={22}
              color="#00529B"
            />

            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">
                Role Management
              </Text>

              <Text className="text-xs text-gray-500">
                {roles.length} roles
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">

            <TouchableOpacity
              onPress={fetchRoles}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <RefreshCw
                size={16}
                color="#6b7280"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openAddModal}
              className="bg-blue-900 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Plus
                size={14}
                color="white"
              />

              <Text className="text-white ml-1 text-sm font-medium">
                Add Role
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>

      {/* Messages */}

      {success ? (
        <View
          className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3"
          style={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: 'center',
                  width: '100%',
                }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <CheckCircle
              size={16}
              color="#16a34a"
            />

            <Text className="text-green-700 ml-2 text-sm">
              {success}
            </Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View
          className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
          style={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: 'center',
                  width: '100%',
                }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <AlertCircle
              size={16}
              color="#dc2626"
            />

            <Text className="text-red-700 ml-2 text-sm">
              {error}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Search */}

      <View
        className="px-4 py-3"
        style={
          isDesktop
            ? {
                maxWidth: 1200,
                alignSelf: 'center',
                width: '100%',
              }
            : undefined
        }
      >
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">

          <Search
            size={14}
            color="#9ca3af"
          />

          <TextInput
            className="flex-1 ml-2 text-sm py-1"
            placeholder="Search roles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />

        </View>
      </View>

      {/* Content */}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color="#00529B"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: 'center',
                  width: '100%',
                  paddingHorizontal: 16,
                  paddingTop: 8,
                }
              : {
                  paddingHorizontal: 16,
                  paddingTop: 8,
                }
          }
        >
          {filteredRoles.length === 0 ? (
            <View className="items-center py-16">

              <Shield
                size={56}
                color="#d1d5db"
              />

              <Text className="text-gray-400 mt-3 text-base">
                {searchQuery
                  ? 'No roles match'
                  : 'No roles found'}
              </Text>

            </View>
          ) : (
            <>
              {/* Mobile Cards */}

              {!isDesktop &&
                filteredRoles.map(role => (
                  <View
                    key={role.id?.toString()}
                    className="bg-white rounded-xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <View className="px-4 py-3">

                      <View className="flex-row justify-between items-start">

                        <View className="flex-1">

                          <Text className="text-sm font-semibold text-gray-900">
                            {role.displayName}
                          </Text>

                          <Text className="text-xs text-gray-500 mt-0.5">
                            {role.name}
                          </Text>

                          <View className="flex-row flex-wrap gap-2 mt-2">

                            {role.requiresCompetency && (
                              <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-purple-700">
                                  Competency L
                                  {role.minimumCompetencyLevel || 1}
                                </Text>
                              </View>
                            )}

                            {role.auditorRole && (
                              <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-blue-700">
                                  Auditor
                                </Text>
                              </View>
                            )}

                          </View>

                          {role.description && (
                            <Text
                              className="text-xs text-gray-400 mt-1"
                              numberOfLines={2}
                            >
                              {role.description}
                            </Text>
                          )}

                        </View>

                        <View className="flex-row ml-2">

                          <TouchableOpacity
                            onPress={() =>
                              openEditModal(role)
                            }
                            className="p-2 bg-blue-50 rounded-lg mr-1"
                          >
                            <Edit
                              size={15}
                              color="#00529B"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              setDeleteConfirm({
                                id: String(role.id),
                                name: role.displayName,
                              })
                            }
                            className="p-2 bg-red-50 rounded-lg"
                          >
                            <Trash2
                              size={15}
                              color="#ef4444"
                            />
                          </TouchableOpacity>

                        </View>

                      </View>
                    </View>
                  </View>
                ))}

              {/* Desktop Table */}

              {isDesktop && (
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                  <View className="flex-row bg-gray-50 py-2.5 px-4 border-b border-gray-200">

                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">
                      Role
                    </Text>

                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase">
                      Code
                    </Text>

                    <Text className="w-32 text-xs font-semibold text-gray-500 uppercase">
                      Type
                    </Text>

                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">
                      Actions
                    </Text>

                  </View>

                  {filteredRoles.map(role => (
                    <View
                      key={role.id?.toString()}
                      className="flex-row items-center py-3 px-4 border-b border-gray-100"
                    >

                      <View className="flex-1">

                        <Text className="text-sm font-semibold text-gray-900">
                          {role.displayName}
                        </Text>

                        {role.description && (
                          <Text
                            className="text-xs text-gray-400 mt-0.5"
                            numberOfLines={1}
                          >
                            {role.description}
                          </Text>
                        )}

                      </View>

                      <Text className="w-24 text-xs font-mono text-gray-500">
                        {role.name}
                      </Text>

                      <View className="w-32 flex-row gap-1">

                        {role.auditorRole && (
                          <View className="bg-blue-100 px-1.5 py-0.5 rounded-full">
                            <Text className="text-xs text-blue-700">
                              Auditor
                            </Text>
                          </View>
                        )}

                        {role.requiresCompetency && (
                          <View className="bg-purple-100 px-1.5 py-0.5 rounded-full">
                            <Text className="text-xs text-purple-700">
                              L
                              {role.minimumCompetencyLevel || 1}
                            </Text>
                          </View>
                        )}

                        {!role.auditorRole &&
                          !role.requiresCompetency && (
                            <Text className="text-xs text-gray-400">
                              Standard
                            </Text>
                          )}

                      </View>

                      <View className="w-24 flex-row justify-center gap-1">

                        <TouchableOpacity
                          onPress={() =>
                            openEditModal(role)
                          }
                          className="p-1.5 bg-blue-50 rounded-lg"
                        >
                          <Edit
                            size={14}
                            color="#00529B"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            setDeleteConfirm({
                              id: String(role.id),
                              name: role.displayName,
                            })
                          }
                          className="p-1.5 bg-red-50 rounded-lg"
                        >
                          <Trash2
                            size={14}
                            color="#ef4444"
                          />
                        </TouchableOpacity>

                      </View>

                    </View>
                  ))}

                </View>
              )}
            </>
          )}

          <Text className="text-sm text-gray-500 mt-3 mb-6">
            Showing {filteredRoles.length} of {roles.length} roles
          </Text>

        </ScrollView>
      )}

      {/* Add/Edit Modal */}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View
          className="flex-1 bg-black/50"
          style={
            isDesktop
              ? {
                  justifyContent: 'center',
                  alignItems: 'center',
                }
              : {
                  justifyContent: 'flex-end',
                }
          }
        >

          <View
            style={
              isDesktop
                ? {
                    backgroundColor: 'white',
                    borderRadius: 16,
                    width: 500,
                    maxHeight: '80%',
                  }
                : {
                    backgroundColor: 'white',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '80%',
                  }
            }
          >

            {/* Modal Header */}

            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">

              <TouchableOpacity
                onPress={handleCloseModal}
              >
                <X
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>

              <Text className="text-base font-bold text-gray-900">
                {editingRole ? 'Edit' : 'Add'} Role
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
              >
                <Text className="text-blue-600 font-semibold text-sm">
                  {loading
                    ? 'Saving...'
                    : 'Save'}
                </Text>
              </TouchableOpacity>

            </View>

            {/* Form */}

            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Role Code *
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm uppercase mb-3"
                value={formData.name}
                onChangeText={t =>
                  setFormData({
                    ...formData,
                    name: t.toUpperCase(),
                  })
                }
                placeholder="e.g., SUPERVISOR"
                editable={!editingRole}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.displayName}
                onChangeText={t =>
                  setFormData({
                    ...formData,
                    displayName: t,
                  })
                }
                placeholder="e.g., Supervisor"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Description
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-4"
                value={formData.description}
                onChangeText={t =>
                  setFormData({
                    ...formData,
                    description: t,
                  })
                }
                placeholder="Describe this role"
                multiline
                numberOfLines={2}
              />

              <View className="flex-row justify-between items-center py-2 mb-2">

                <Text className="text-sm font-medium text-gray-700">
                  Requires Competency
                </Text>

                <Switch
                  value={formData.requiresCompetency}
                  onValueChange={v =>
                    setFormData({
                      ...formData,
                      requiresCompetency: v,
                    })
                  }
                  trackColor={{
                    false: '#d1d5db',
                    true: '#00529B',
                  }}
                />

              </View>

              {formData.requiresCompetency && (
                <View className="mb-3">

                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Min Competency Level
                  </Text>

                  <View className="flex-row gap-2">

                    {[1, 2, 3, 4].map(level => (
                      <TouchableOpacity
                        key={level}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            minimumCompetencyLevel:
                              level,
                          })
                        }
                        className={`flex-1 py-2 rounded-lg border ${
                          formData.minimumCompetencyLevel ===
                          level
                            ? 'bg-blue-900 border-blue-900'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`text-xs text-center font-medium ${
                            formData.minimumCompetencyLevel ===
                            level
                              ? 'text-white'
                              : 'text-gray-600'
                          }`}
                        >
                          Level {level}
                        </Text>
                      </TouchableOpacity>
                    ))}

                  </View>
                </View>
              )}

              <View className="flex-row justify-between items-center py-2 mb-2">

                <Text className="text-sm font-medium text-gray-700">
                  Auditor Role
                </Text>

                <Switch
                  value={formData.auditorRole}
                  onValueChange={v =>
                    setFormData({
                      ...formData,
                      auditorRole: v,
                    })
                  }
                  trackColor={{
                    false: '#d1d5db',
                    true: '#00529B',
                  }}
                />

              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}

      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">

          <View className="bg-white rounded-xl p-6 w-80 shadow-lg">

            <Text className="text-lg font-bold text-gray-900 mb-2">
              Delete Role
            </Text>

            <Text className="text-gray-600 text-sm mb-6">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
            </Text>

            <View className="flex-row justify-end gap-3">

              <TouchableOpacity
                onPress={() =>
                  setDeleteConfirm(null)
                }
                className="px-4 py-2.5 rounded-lg border border-gray-300"
              >
                <Text className="text-gray-700 text-sm font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (deleteConfirm) {
                    executeDelete(
                      deleteConfirm.id,
                      deleteConfirm.name
                    );
                  }
                }}
                className="px-4 py-2.5 rounded-lg bg-red-600"
              >
                <Text className="text-white text-sm font-semibold">
                  Delete
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

