// components/dashboards/admin/EnterpriseManagement.tsx
import { API_BASE_URL } from '@/config/apiConfig';
import { enterpriseAPI } from '@/services/enterpriseAPI';
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
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

const emptyFormData = {
  name: '',
  code: '',
  city: '',
  state: '',
  country: '',
  classification: '',
  unitType: '',
};

export default function EnterpriseManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [companies, setCompanies] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState<
    'companies' | 'plants' | 'sites' | 'units'
  >('companies');

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [formData, setFormData] = useState(emptyFormData);

  // NEW: tracks whether Add/Edit form has unsaved changes
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      case 'companies':
        return companies;
      case 'plants':
        return plants;
      case 'sites':
        return sites;
      case 'units':
        return units;
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'companies':
        return 'Companies';
      case 'plants':
        return 'Plants';
      case 'sites':
        return 'Sites';
      case 'units':
        return 'Units';
    }
  };

  const getViewIcon = () => {
    switch (view) {
      case 'companies':
        return Building;
      case 'plants':
        return Factory;
      case 'sites':
        return MapPin;
      case 'units':
        return Layers;
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyFormData });
    setIsFormDirty(false);
    setError('');
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);

    setFormData({
      name: item.name || '',
      code: item.code || '',
      city: item.city || '',
      state: item.state || '',
      country: item.country || '',
      classification: item.classification || '',
      unitType: item.unitType || '',
    });

    setIsFormDirty(false);
    setError('');
    setShowModal(true);
  };

  // NEW: centralized form close handler
  const closeForm = () => {
    if (!isFormDirty) {
      setShowModal(false);
      setEditingItem(null);
      return;
    }

    Alert.alert(
      'Unsaved Changes',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setShowModal(false);
            setEditingItem(null);
            setFormData({ ...emptyFormData });
            setIsFormDirty(false);
            setError('');
          },
        },
      ],
    );
  };

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setIsFormDirty(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data: any = { ...formData };

      if (view !== 'companies') {
        if (view === 'plants') {
          data.companyId = selectedParent?.id;
        } else if (view === 'sites') {
          data.plantId = selectedParent?.id;
        } else if (view === 'units') {
          data.siteId = selectedParent?.id;
        }
      }

      if (editingItem) {
        switch (view) {
          case 'companies':
            await enterpriseAPI.updateCompany(editingItem.id, data);
            break;

          case 'plants':
            await enterpriseAPI.updatePlant(editingItem.id, data);
            break;

          case 'sites':
            await enterpriseAPI.updateSite(editingItem.id, data);
            break;

          case 'units':
            await enterpriseAPI.updateUnit(editingItem.id, data);
            break;
        }
      } else {
        switch (view) {
          case 'companies':
            await enterpriseAPI.createCompany(data);
            break;

          case 'plants':
            await enterpriseAPI.createPlant(data);
            break;

          case 'sites':
            await enterpriseAPI.createSite(data);
            break;

          case 'units':
            await enterpriseAPI.createUnit(data);
            break;
        }
      }

      setSuccess(
        `${editingItem ? 'Updated' : 'Created'} successfully!`,
      );

      setShowModal(false);
      setEditingItem(null);
      setFormData({ ...emptyFormData });
      setIsFormDirty(false);

      refreshView();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    setLoading(true);
    setError('');
    setDeleteConfirm(null);

    try {
      let url = '';

      switch (view) {
        case 'companies':
          url = `${API_BASE_URL}/api/enterprise/companies/${id}`;
          break;

        case 'plants':
          url = `${API_BASE_URL}/api/enterprise/plants/${id}`;
          break;

        case 'sites':
          url = `${API_BASE_URL}/api/enterprise/sites/${id}`;
          break;

        case 'units':
          url = `${API_BASE_URL}/api/enterprise/units/${id}`;
          break;
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        setSuccess('Deleted successfully!');
        refreshView();
      } else {
        setError(`Delete failed (${response.status})`);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const refreshView = () => {
    switch (view) {
      case 'companies':
        loadData();
        break;

      case 'plants':
        if (selectedParent) {
          loadPlants(String(selectedParent.id));
        }
        break;

      case 'sites':
        if (selectedParent) {
          loadSites(String(selectedParent.id));
        }
        break;

      case 'units':
        if (selectedParent) {
          loadUnits(String(selectedParent.id));
        }
        break;
    }
  };

  const drillDown = (item: any) => {
    setSelectedParent(item);

    switch (view) {
      case 'companies':
        loadPlants(String(item.id));
        setView('plants');
        break;

      case 'plants':
        loadSites(String(item.id));
        setView('sites');
        break;

      case 'sites':
        loadUnits(String(item.id));
        setView('units');
        break;
    }

    setSearchQuery('');
  };

  const goBack = () => {
    switch (view) {
      case 'plants':
        setView('companies');
        break;

      case 'sites':
        setView('plants');
        break;

      case 'units':
        setView('sites');
        break;
    }

    setSearchQuery('');
  };

  const data = getCurrentData() || [];

  const filteredData = data.filter(
    (item: any) =>
      item.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      item.code
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const ViewIcon = getViewIcon();

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
            {view !== 'companies' && (
              <TouchableOpacity
                onPress={goBack}
                className="mr-3 p-1.5 bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={18} color="#00529B" />
              </TouchableOpacity>
            )}

            <ViewIcon size={22} color="#00529B" />

            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">
                {getViewTitle()}
              </Text>

              <Text className="text-xs text-gray-500">
                {data.length} items
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            className="bg-blue-900 px-3 py-2 rounded-lg flex-row items-center"
          >
            <Plus size={14} color="white" />
            <Text className="text-white ml-1 text-sm font-medium">
              Add New
            </Text>
          </TouchableOpacity>
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
            <AlertCircle size={16} color="#dc2626" />
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
          <Search size={14} color="#9ca3af" />

          <TextInput
            className="flex-1 ml-2 text-sm py-1"
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
          {filteredData.length === 0 ? (
            <View className="items-center py-16">
              <ViewIcon size={56} color="#d1d5db" />

              <Text className="text-gray-400 mt-3 text-base">
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
                    className="bg-white rounded-xl mb-3 shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <TouchableOpacity
                      className="px-4 py-3"
                      onPress={() =>
                        view !== 'units'
                          ? drillDown(item)
                          : null
                      }
                      disabled={view === 'units'}
                    >
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
                          <ViewIcon
                            size={18}
                            color="#00529B"
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </Text>

                          <View className="flex-row flex-wrap gap-2 mt-1">
                            {item.code && (
                              <Text className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                {item.code}
                              </Text>
                            )}

                            {item.city && (
                              <Text className="text-xs text-gray-500">
                                {item.city}
                                {item.state
                                  ? `, ${item.state}`
                                  : ''}
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
                            onPress={() => handleEdit(item)}
                            className="p-2 bg-blue-50 rounded-lg mr-1"
                          >
                            <Edit
                              size={14}
                              color="#00529B"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              setDeleteConfirm({
                                id: String(item.id),
                                name: item.name,
                              })
                            }
                            className="p-2 bg-red-50 rounded-lg"
                          >
                            <Trash2
                              size={14}
                              color="#ef4444"
                            />
                          </TouchableOpacity>

                          {view !== 'units' && (
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
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <View className="flex-row bg-gray-50 py-2.5 px-4 border-b border-gray-200">
                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">
                      Name
                    </Text>

                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase">
                      Code
                    </Text>

                    <Text className="w-40 text-xs font-semibold text-gray-500 uppercase">
                      Details
                    </Text>

                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">
                      Actions
                    </Text>
                  </View>

                  {filteredData.map((item: any) => (
                    <View
                      key={item.id}
                      className="flex-row items-center py-3 px-4 border-b border-gray-100"
                    >
                      <TouchableOpacity
                        className="flex-1 flex-row items-center"
                        onPress={() =>
                          view !== 'units'
                            ? drillDown(item)
                            : null
                        }
                        disabled={view === 'units'}
                      >
                        <ViewIcon
                          size={16}
                          color="#00529B"
                        />

                        <Text className="ml-2 text-sm font-semibold text-gray-900">
                          {item.name}
                        </Text>

                        {view !== 'units' && (
                          <ChevronRight
                            size={14}
                            color="#9ca3af"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </TouchableOpacity>

                      <Text className="w-24 text-xs text-gray-500">
                        {item.code || '-'}
                      </Text>

                      <Text
                        className="w-40 text-xs text-gray-500"
                        numberOfLines={1}
                      >
                        {[
                          item.city,
                          item.classification,
                          item.unitType,
                        ]
                          .filter(Boolean)
                          .join(' • ') || '-'}
                      </Text>

                      <View className="w-24 flex-row justify-center gap-1">
                        <TouchableOpacity
                          onPress={() => handleEdit(item)}
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
                              id: String(item.id),
                              name: item.name,
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
            Showing {filteredData.length} of {data.length}{' '}
            {getViewTitle().toLowerCase()}
          </Text>
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
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
              <TouchableOpacity onPress={closeForm}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>

              <Text className="text-base font-bold text-gray-900">
                {editingItem ? 'Edit' : 'Add'}{' '}
                {getViewTitle().slice(0, -1)}
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
              >
                <Text className="text-blue-600 font-semibold text-sm">
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >
              {/* Name */}
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Name *
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.name}
                onChangeText={(t) =>
                  updateFormField('name', t)
                }
                placeholder="Enter name"
              />

              {/* Code */}
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Code
              </Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.code}
                onChangeText={(t) =>
                  updateFormField('code', t)
                }
                placeholder="Enter code"
              />

              {/* Plants */}
              {view === 'plants' && (
                <View
                  style={
                    isDesktop
                      ? {
                          flexDirection: 'row',
                          gap: 12,
                        }
                      : {}
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      City
                    </Text>

                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                      value={formData.city}
                      onChangeText={(t) =>
                        updateFormField('city', t)
                      }
                      placeholder="City"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-medium text-gray-700 mb-1">
                      State
                    </Text>

                    <TextInput
                      className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                      value={formData.state}
                      onChangeText={(t) =>
                        updateFormField('state', t)
                      }
                      placeholder="State"
                    />
                  </View>
                </View>
              )}

              {/* Sites */}
              {view === 'sites' && (
                <>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Classification
                  </Text>

                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                    value={formData.classification}
                    onChangeText={(t) =>
                      updateFormField(
                        'classification',
                        t,
                      )
                    }
                    placeholder="e.g., PRODUCTION"
                  />
                </>
              )}

              {/* Units */}
              {view === 'units' && (
                <>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Unit Type
                  </Text>

                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                    value={formData.unitType}
                    onChangeText={(t) =>
                      updateFormField('unitType', t)
                    }
                    placeholder="e.g., PRODUCTION_LINE"
                  />
                </>
              )}
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
              Delete
            </Text>

            <Text className="text-gray-600 text-sm mb-6">
              Delete "{deleteConfirm?.name}"? This cannot be
              undone.
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
                  if (deleteConfirm?.id) {
                    executeDelete(deleteConfirm.id);
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