// components/dashboards/admin/AuditTypeManagement.tsx

import { API_BASE_URL } from '@/config/apiConfig';
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
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';

const STANDARDS = [
  'ISO_9001',
  'IATF_16949',
  'VDA_6_3',
  'ISO_14001',
  'ISO_45001',
  'CUSTOMER_SPECIFIC',
  'INTERNAL',
];

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  standard: 'IATF_16949',
  minExperienceRequired: 2,
  requiresCertification: false,
  active: true,
};

export default function AuditTypeManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [auditTypes, setAuditTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchAuditTypes();
  }, []);

  const fetchAuditTypes = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/audit-types`);

      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }

      const data = await res.json();
      setAuditTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch audit types:', err);
      setError('Failed to load audit types');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    resetForm();
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setError('');
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);

    setFormData({
      code: item.code || '',
      name: item.name || '',
      description: item.description || '',
      standard: item.standard || 'IATF_16949',
      minExperienceRequired: item.minExperienceRequired ?? 2,
      requiresCertification: item.requiresCertification === true,
      active: item.active !== false,
    });

    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and code are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = editingItem
        ? `${API_BASE_URL}/api/audit-types/${editingItem.id}`
        : `${API_BASE_URL}/api/audit-types`;

      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim(),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          errorText || `Save failed (${res.status})`
        );
      }

      setSuccess(
        editingItem
          ? 'Audit type updated!'
          : 'Audit type created!'
      );

      closeModal();
      await fetchAuditTypes();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save audit type:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string, name: string) => {
    setDeleteConfirm(null);
    setError('');
    setSuccess(`Deleting "${name}"...`);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/audit-types/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok || res.status === 204) {
        setAuditTypes((prev) =>
          prev.filter((item) => String(item.id) !== id)
        );

        setSuccess(`"${name}" deleted!`);

        setTimeout(() => {
          fetchAuditTypes();
        }, 1000);
      } else {
        setError(`Delete failed (${res.status})`);
        await fetchAuditTypes();
      }
    } catch (err: any) {
      console.error('Failed to delete audit type:', err);
      setError(err.message || 'Failed to delete');
      await fetchAuditTypes();
    }

    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredTypes = auditTypes.filter((type: any) => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return true;

    return (
      type.name?.toLowerCase().includes(query) ||
      type.code?.toLowerCase().includes(query) ||
      type.standard?.toLowerCase().includes(query)
    );
  });

  const formatStandard = (standard?: string) =>
    standard?.replace(/_/g, ' ') || '-';

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
          <View className="flex-row items-center flex-1">
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
              disabled={loading}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <RefreshCw size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openAddModal}
              disabled={loading}
              className="bg-blue-900 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Plus size={14} color="white" />

              <Text className="text-white ml-1 text-sm font-medium">
                Add Type
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
            <CheckCircle size={16} color="#16a34a" />

            <Text className="text-green-700 ml-2 text-sm flex-1">
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
            <AlertCircle size={16} color="#dc2626" />

            <Text className="text-red-700 ml-2 text-sm flex-1">
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
          <Search size={14} color="#9ca3af" />

          <TextInput
            className="flex-1 ml-2 text-sm py-1"
            placeholder="Search audit types..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Content */}
      {loading && auditTypes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color="#00529B"
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
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
          {filteredTypes.length === 0 ? (
            <View className="items-center py-16">
              <Layers size={56} color="#d1d5db" />

              <Text className="text-gray-400 mt-3 text-base">
                {searchQuery
                  ? 'No audit types match'
                  : 'No audit types found'}
              </Text>
            </View>
          ) : (
            <>
              {/* Mobile Cards */}
              {!isDesktop &&
                filteredTypes.map((type: any) => (
                  <View
                    key={String(type.id)}
                    className="bg-white rounded-xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <View className="px-4 py-3">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-2">
                          <Text
                            className="text-sm font-semibold text-gray-900"
                            numberOfLines={1}
                          >
                            {type.name}
                          </Text>

                          <View className="flex-row items-center mt-1 flex-wrap gap-2">
                            <Text className="text-xs bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-medium">
                              {type.code || '-'}
                            </Text>

                            <Text
                              className="text-xs text-gray-500"
                              numberOfLines={1}
                            >
                              {formatStandard(type.standard)}
                            </Text>
                          </View>

                          <View className="flex-row items-center mt-2 gap-3">
                            <Text className="text-xs text-gray-500">
                              Exp:{' '}
                              {type.minExperienceRequired ?? '-'} yrs
                            </Text>

                            <View
                              className={`px-2 py-0.5 rounded-full ${
                                type.active !== false
                                  ? 'bg-green-100'
                                  : 'bg-red-100'
                              }`}
                            >
                              <Text
                                className={`text-xs ${
                                  type.active !== false
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                }`}
                              >
                                {type.active !== false
                                  ? 'Active'
                                  : 'Inactive'}
                              </Text>
                            </View>
                          </View>

                          {type.requiresCertification ? (
                            <Text className="text-xs text-purple-600 mt-1">
                              Certification required
                            </Text>
                          ) : null}

                          {type.description ? (
                            <Text
                              className="text-xs text-gray-400 mt-1"
                              numberOfLines={2}
                            >
                              {type.description}
                            </Text>
                          ) : null}
                        </View>

                        <View className="flex-row ml-1">
                          <TouchableOpacity
                            onPress={() => openEditModal(type)}
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
                                id: String(type.id),
                                name: type.name,
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
                    <Text className="w-20 text-xs font-semibold text-gray-500 uppercase">
                      Code
                    </Text>

                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">
                      Name
                    </Text>

                    <Text className="w-32 text-xs font-semibold text-gray-500 uppercase">
                      Standard
                    </Text>

                    <Text className="w-20 text-xs font-semibold text-gray-500 uppercase text-center">
                      Experience
                    </Text>

                    <Text className="w-20 text-xs font-semibold text-gray-500 uppercase text-center">
                      Status
                    </Text>

                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">
                      Actions
                    </Text>
                  </View>

                  {filteredTypes.map((type: any) => (
                    <View
                      key={String(type.id)}
                      className="flex-row items-center py-3 px-4 border-b border-gray-100"
                    >
                      <Text className="w-20 text-xs font-medium text-blue-700">
                        {type.code || '-'}
                      </Text>

                      <View className="flex-1 pr-3">
                        <Text
                          className="text-sm text-gray-900"
                          numberOfLines={1}
                        >
                          {type.name}
                        </Text>

                        {type.description ? (
                          <Text
                            className="text-xs text-gray-400 mt-0.5"
                            numberOfLines={1}
                          >
                            {type.description}
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        className="w-32 text-xs text-gray-500"
                        numberOfLines={1}
                      >
                        {formatStandard(type.standard)}
                      </Text>

                      <Text className="w-20 text-xs text-gray-500 text-center">
                        {type.minExperienceRequired ?? '-'} yrs
                      </Text>

                      <View className="w-20 items-center">
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            type.active !== false
                              ? 'bg-green-100'
                              : 'bg-red-100'
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              type.active !== false
                                ? 'text-green-700'
                                : 'text-red-700'
                            }`}
                          >
                            {type.active !== false
                              ? 'Active'
                              : 'Inactive'}
                          </Text>
                        </View>
                      </View>

                      <View className="w-24 flex-row justify-center gap-1">
                        <TouchableOpacity
                          onPress={() => openEditModal(type)}
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
                              id: String(type.id),
                              name: type.name,
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
            Showing {filteredTypes.length} of {auditTypes.length} audit
            types
          </Text>
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
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
                    width: 600,
                    maxHeight: '85%',
                  }
                : {
                    backgroundColor: 'white',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '85%',
                  }
            }
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={closeModal}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>

              <Text className="text-base font-bold text-gray-900">
                {editingItem ? 'Edit' : 'Add'} Audit Type
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
              >
                <Text
                  className={`font-semibold text-sm ${
                    loading
                      ? 'text-gray-400'
                      : 'text-blue-600'
                  }`}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={
                  isDesktop
                    ? {
                        flexDirection: 'row',
                        gap: 12,
                      }
                    : undefined
                }
              >
                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </Text>

                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                    value={formData.code}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        code: text.toUpperCase(),
                      })
                    }
                    placeholder="e.g., IATF"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </Text>

                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        name: text,
                      })
                    }
                    placeholder="e.g., IATF Internal Audit"
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Description
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    description: text,
                  })
                }
                placeholder="Description"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Standard
              </Text>

              <View className="flex-row flex-wrap gap-2 mb-3">
                {STANDARDS.map((standard) => (
                  <TouchableOpacity
                    key={standard}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        standard,
                      })
                    }
                    className={`px-3 py-1.5 rounded-full border ${
                      formData.standard === standard
                        ? 'bg-blue-900 border-blue-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        formData.standard === standard
                          ? 'text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {standard.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-1">
                Min Experience (Years)
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={String(formData.minExperienceRequired)}
                onChangeText={(text) =>
                  setFormData({
                    ...formData,
                    minExperienceRequired:
                      text === ''
                        ? 0
                        : Math.max(
                            0,
                            parseInt(text, 10) || 0
                          ),
                  })
                }
                keyboardType="numeric"
              />

              <View className="flex-row justify-between items-center py-2 mb-1">
                <Text className="text-sm font-medium text-gray-700">
                  Requires Certification
                </Text>

                <Switch
                  value={formData.requiresCertification}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      requiresCertification: value,
                    })
                  }
                  trackColor={{
                    false: '#d1d5db',
                    true: '#00529B',
                  }}
                />
              </View>

              <View className="flex-row justify-between items-center py-2 mb-2">
                <Text className="text-sm font-medium text-gray-700">
                  Active
                </Text>

                <Switch
                  value={formData.active}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      active: value,
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
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-xl p-6 w-80 shadow-lg">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Delete Audit Type
            </Text>

            <Text className="text-gray-600 text-sm mb-6">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
            </Text>

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirm(null)}
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