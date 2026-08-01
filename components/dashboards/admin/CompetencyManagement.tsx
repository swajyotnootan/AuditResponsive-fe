// components/dashboards/admin/CompetencyManagement.tsx
import { API_BASE_URL } from '@/config/apiConfig';
import { AlertCircle, Award, CheckCircle, ChevronDown, ChevronUp, Edit, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';


export default function CompetencyManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  
  const [loading, setLoading] = useState(false);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAuditor, setSelectedAuditor] = useState<any>(null);
  const [editingCompetency, setEditingCompetency] = useState<any>(null);
  const [auditTypes, setAuditTypes] = useState<any[]>([]);
  const [expandedAuditor, setExpandedAuditor] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; auditorName: string } | null>(null);
  const [formData, setFormData] = useState({
    auditTypeId: '', elementIds: [] as number[], certifiedProcesses: [] as string[],
    certifiedProducts: [] as string[], certificationDate: '', expiryDate: '',
    certificationBody: '', certificationNumber: ''
  });

  useEffect(() => { fetchAuditors(); fetchAuditTypes(); }, []);

  const fetchAuditors = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/auditors`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAuditors(Array.isArray(data) ? data : []);
    } catch (err) { setError('Failed to load auditors'); }
    finally { setLoading(false); }
  };

  const fetchAuditTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/audit-types`);
      const data = await res.json();
      setAuditTypes(Array.isArray(data) ? data : []);
    } catch (err) { /* use defaults */ }
  };

  const handleAddCompetency = (auditor: any) => {
    setSelectedAuditor(auditor); setEditingCompetency(null);
    setFormData({ auditTypeId: '', elementIds: [], certifiedProcesses: [], certifiedProducts: [], certificationDate: '', expiryDate: '', certificationBody: '', certificationNumber: '' });
    setShowModal(true);
  };

  const handleEditCompetency = (auditor: any, competency: any) => {
    setSelectedAuditor(auditor); setEditingCompetency(competency);
    setFormData({
      auditTypeId: competency.auditTypeId || String(competency.auditType?.id || ''),
      elementIds: competency.certifiedElements?.map((e: any) => e.id) || [],
      certifiedProcesses: competency.certifiedProcesses || [], certifiedProducts: competency.certifiedProducts || [],
      certificationDate: competency.certificationDate || '', expiryDate: competency.expiryDate || '',
      certificationBody: competency.certificationBody || '', certificationNumber: competency.certificationNumber || ''
    });
    setShowModal(true);
  };

  const handleSaveCompetency = async () => {
    if (!selectedAuditor) { setError('Please select an auditor'); return; }
    if (!formData.auditTypeId) { setError('Please select an audit type'); return; }
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ auditorId: String(selectedAuditor.id), auditTypeId: formData.auditTypeId });
      if (formData.certificationDate) params.append('certificationDate', formData.certificationDate);
      if (formData.expiryDate) params.append('expiryDate', formData.expiryDate);
      if (formData.certificationBody) params.append('certificationBody', formData.certificationBody);
      if (formData.certificationNumber) params.append('certificationNumber', formData.certificationNumber);
      formData.certifiedProcesses.forEach(p => params.append('certifiedProcesses', p));
      formData.certifiedProducts.forEach(p => params.append('certifiedProducts', p));
      const isUpdate = editingCompetency !== null;
      const url = isUpdate ? `${API_BASE_URL}/api/competency/${editingCompetency.id}?${params}` : `${API_BASE_URL}/api/competency/assign?${params}`;
      const res = await fetch(url, { method: isUpdate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess(isUpdate ? 'Competency updated!' : 'Competency assigned!');
      setShowModal(false); fetchAuditors();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name, auditorName } = deleteConfirm;
    setDeleteConfirm(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setAuditors(prev => prev.map(a => ({ ...a, auditCompetencies: (a.auditCompetencies || []).filter((c: any) => String(c.id) !== id) })));
        setSuccess(`"${name}" removed from ${auditorName}!`);
        fetchAuditors();
      } else { setError(`Delete failed (${res.status})`); }
    } catch (err: any) { setError(err.message || 'Failed to delete'); }
    finally { setLoading(false); setTimeout(() => setSuccess(''), 3000); }
  };

  const getOverallStatus = (auditor: any) => {
    if (!auditor.auditCompetencies?.length) return { label: 'PENDING', color: 'bg-blue-100', text: 'text-blue-700' };
    const hasExpiring = auditor.auditCompetencies.some((c: any) => c.isExpiringSoon);
    if (hasExpiring) return { label: 'EXPIRING', color: 'bg-yellow-100', text: 'text-yellow-700' };
    const hasValid = auditor.auditCompetencies.some((c: any) => c.expiryDate > new Date().toISOString().split('T')[0]);
    return hasValid ? { label: 'ACTIVE', color: 'bg-green-100', text: 'text-green-700' } : { label: 'EXPIRED', color: 'bg-red-100', text: 'text-red-700' };
  };

  const filteredAuditors = auditors.filter((a: any) =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCompetencies = auditors.reduce((sum, a) => sum + (a.auditCompetencies?.length || 0), 0);
  const activeCount = auditors.filter(a => getOverallStatus(a).label === 'ACTIVE').length;
  const expiringCount = auditors.filter(a => getOverallStatus(a).label === 'EXPIRING').length;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header - Same as EnterpriseManagement */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-200">
        <View className="flex-row justify-between items-center" style={isDesktop ? { maxWidth: 1200, alignSelf: 'center', width: '100%' } : undefined}>
          <View className="flex-row items-center">
            <Award size={22} color="#00529B" />
            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">Competency Management</Text>
              <Text className="text-xs text-gray-500">{auditors.length} auditors • {totalCompetencies} competencies</Text>
            </View>
          </View>
          <TouchableOpacity onPress={fetchAuditors} className="p-2 bg-gray-100 rounded-lg">
            <RefreshCw size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages - Same as EnterpriseManagement */}
      {success ? (
        <View className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3" style={isDesktop ? { maxWidth: 1200, alignSelf: 'center', width: '100%' } : undefined}>
          <View className="flex-row items-center"><CheckCircle size={16} color="#16a34a" /><Text className="text-green-700 ml-2 text-sm">{success}</Text></View>
        </View>
      ) : null}
      {error ? (
        <View className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3" style={isDesktop ? { maxWidth: 1200, alignSelf: 'center', width: '100%' } : undefined}>
          <View className="flex-row items-center"><AlertCircle size={16} color="#dc2626" /><Text className="text-red-700 ml-2 text-sm">{error}</Text></View>
        </View>
      ) : null}

      {/* Search & Add - Same as EnterpriseManagement */}
      <View className="px-4 py-3" style={isDesktop ? { maxWidth: 1200, alignSelf: 'center', width: '100%' } : undefined}>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={14} color="#9ca3af" />
            <TextInput className="flex-1 ml-2 text-sm py-1" placeholder="Search auditors..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#9ca3af" />
          </View>
          <TouchableOpacity onPress={() => { setSelectedAuditor(null); setEditingCompetency(null); setFormData({ auditTypeId: '', elementIds: [], certifiedProcesses: [], certifiedProducts: [], certificationDate: '', expiryDate: '', certificationBody: '', certificationNumber: '' }); setShowModal(true); }} className="bg-blue-900 px-3 py-2 rounded-lg flex-row items-center">
            <Plus size={14} color="white" />
            <Text className="text-white ml-1 text-sm font-medium">Assign</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#00529B" /></View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={isDesktop ? { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 16, paddingTop: 8 } : { paddingHorizontal: 16, paddingTop: 8 }}>
          {filteredAuditors.length === 0 ? (
            <View className="items-center py-16"><Users size={56} color="#d1d5db" /><Text className="text-gray-400 mt-3 text-base">{searchQuery ? 'No auditors match' : 'No auditors found'}</Text></View>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              {!isDesktop && filteredAuditors.map((a: any) => {
                const status = getOverallStatus(a);
                const isExpanded = expandedAuditor === a.id;
                const compCount = a.auditCompetencies?.length || 0;
                
                return (
                  <View key={a.id} className="bg-white rounded-xl mb-3 shadow-sm border border-gray-100 overflow-hidden">
                    <View className="px-4 py-3">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
                          <Text className="text-blue-900 font-bold text-sm">{(a.name?.charAt(0) || 'A').toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity className="flex-1" onPress={() => compCount > 0 && setExpandedAuditor(isExpanded ? null : a.id)} activeOpacity={0.7}>
                          <Text className="text-sm font-semibold text-gray-900">{a.name}</Text>
                          <View className="flex-row items-center mt-0.5 gap-2">
                            <Text className="text-xs text-gray-500">{a.role === 'LEAD_AUDITOR' ? 'Lead Auditor' : 'Auditor'}</Text>
                            {a.department && <Text className="text-xs text-gray-400">• {a.department}</Text>}
                          </View>
                          <View className="flex-row items-center mt-1 gap-2">
                            <View className={`px-2 py-0.5 rounded-full ${status.color}`}><Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text></View>
                            <Text className="text-xs text-blue-600 font-bold">{compCount} competencies</Text>
                          </View>
                        </TouchableOpacity>
                        <View className="flex-row">
                          <TouchableOpacity onPress={() => handleAddCompetency(a)} className="p-2 bg-blue-50 rounded-lg mr-1"><Plus size={15} color="#00529B" /></TouchableOpacity>
                          {compCount > 0 && (
                            <TouchableOpacity onPress={() => setExpandedAuditor(isExpanded ? null : a.id)} className="p-2">{isExpanded ? <ChevronUp size={15} color="#6b7280" /> : <ChevronDown size={15} color="#6b7280" />}</TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {isExpanded && a.auditCompetencies?.map((comp: any, idx: number) => (
                        <View key={idx} className="border-t border-gray-100 bg-blue-50/30 mt-3 pt-3 ml-10">
                          <View className="flex-row items-center">
                            <View className="flex-1">
                              <Text className="text-xs font-semibold text-blue-900">{comp.auditType || comp.auditType?.name || `#${idx + 1}`}</Text>
                              <View className="flex-row flex-wrap gap-1 mt-1">{comp.certifiedProcesses?.slice(0, 3).map((p: string, i: number) => (<View key={i} className="bg-white px-1.5 py-0.5 rounded border border-blue-200"><Text className="text-blue-700 text-xs">{p}</Text></View>))}{comp.certifiedProcesses?.length > 3 && <Text className="text-xs text-blue-400">+{comp.certifiedProcesses.length - 3}</Text>}</View>
                              <Text className="text-xs text-gray-400 mt-1">Expires: {comp.expiryDate || 'N/A'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleEditCompetency(a, comp)} className="p-2 bg-blue-50 rounded-lg mr-1"><Edit size={14} color="#00529B" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => setDeleteConfirm({ id: String(comp.id), name: comp.auditType || comp.auditType?.name || 'Competency', auditorName: a.name })} className="p-2 bg-red-50 rounded-lg"><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Desktop: Table Layout */}
              {isDesktop && (
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <View className="flex-row bg-gray-50 py-2.5 px-4 border-b border-gray-200">
                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">Auditor</Text>
                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">Status</Text>
                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">Competencies</Text>
                    <Text className="w-24 text-xs font-semibold text-gray-500 uppercase text-center">Actions</Text>
                  </View>
                  {filteredAuditors.map((a: any) => {
                    const status = getOverallStatus(a);
                    const isExpanded = expandedAuditor === a.id;
                    const compCount = a.auditCompetencies?.length || 0;
                    
                    return (
                      <View key={a.id}>
                        <View className="flex-row items-center py-3 px-4 border-b border-gray-100">
                          <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => compCount > 0 && setExpandedAuditor(isExpanded ? null : a.id)}>
                            <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mr-3">
                              <Text className="text-blue-900 font-bold text-xs">{(a.name?.charAt(0) || 'A').toUpperCase()}</Text>
                            </View>
                            <View>
                              <Text className="text-sm font-semibold text-gray-900">{a.name}</Text>
                              <Text className="text-xs text-gray-500">{a.role === 'LEAD_AUDITOR' ? 'Lead Auditor' : 'Auditor'}{a.department ? ` • ${a.department}` : ''}</Text>
                            </View>
                          </TouchableOpacity>
                          <View className="w-24 items-center"><View className={`px-2 py-0.5 rounded-full ${status.color}`}><Text className={`text-xs font-medium ${status.text}`}>{status.label}</Text></View></View>
                          <Text className="w-24 text-center text-sm font-bold text-blue-600">{compCount}</Text>
                          <View className="w-24 flex-row justify-center gap-1">
                            <TouchableOpacity onPress={() => handleAddCompetency(a)} className="p-1.5 bg-blue-50 rounded-lg"><Plus size={14} color="#00529B" /></TouchableOpacity>
                            {compCount > 0 && (
                              <TouchableOpacity onPress={() => setExpandedAuditor(isExpanded ? null : a.id)} className="p-1.5 bg-gray-100 rounded-lg">
                                {isExpanded ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        {isExpanded && a.auditCompetencies?.map((comp: any, idx: number) => (
                          <View key={idx} className="flex-row items-center py-2 px-4 pl-16 bg-blue-50/30 border-b border-gray-100">
                            <View className="flex-1">
                              <Text className="text-xs font-semibold text-blue-900">{comp.auditType || comp.auditType?.name || `#${idx + 1}`}</Text>
                              <View className="flex-row flex-wrap gap-1 mt-1">{comp.certifiedProcesses?.slice(0, 3).map((p: string, i: number) => (<View key={i} className="bg-white px-1.5 py-0.5 rounded border border-blue-200"><Text className="text-blue-700 text-xs">{p}</Text></View>))}</View>
                              <Text className="text-xs text-gray-400 mt-0.5">Expires: {comp.expiryDate || 'N/A'}</Text>
                            </View>
                            <View className="flex-row">
                              <TouchableOpacity onPress={() => handleEditCompetency(a, comp)} className="p-1.5 bg-blue-50 rounded-lg mr-1"><Edit size={14} color="#00529B" /></TouchableOpacity>
                              <TouchableOpacity onPress={() => setDeleteConfirm({ id: String(comp.id), name: comp.auditType || comp.auditType?.name || 'Competency', auditorName: a.name })} className="p-1.5 bg-red-50 rounded-lg"><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
          <Text className="text-sm text-gray-500 mt-3 mb-6">Showing {filteredAuditors.length} of {auditors.length} auditors</Text>
        </ScrollView>
      )}

      {/* Assign/Edit Modal - Same as EnterpriseManagement */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50" style={isDesktop ? { justifyContent: 'center', alignItems: 'center' } : { justifyContent: 'flex-end' }}>
          <View style={isDesktop ? { backgroundColor: 'white', borderRadius: 16, width: 500, maxHeight: '80%' } : { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color="#6b7280" /></TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">{editingCompetency ? 'Edit' : 'Assign'} Competency</Text>
              <TouchableOpacity onPress={handleSaveCompetency} disabled={loading}><Text className="text-blue-600 font-semibold text-sm">{loading ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
            </View>
            {selectedAuditor && (<View className="px-5 py-3 bg-gray-50 border-b border-gray-100"><Text className="text-sm font-medium text-gray-700">{selectedAuditor.name}</Text><Text className="text-xs text-gray-500">{selectedAuditor.role} • {selectedAuditor.department || 'No dept'}</Text></View>)}
            <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-2">Audit Type *</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {auditTypes.map((t: any) => (
                  <TouchableOpacity key={t.id} onPress={() => setFormData({...formData, auditTypeId: String(t.id)})} className={`px-4 py-2 rounded-full border ${formData.auditTypeId === String(t.id) ? 'bg-blue-900 border-blue-900' : 'bg-white border-gray-300'}`}>
                    <Text className={`text-xs font-medium ${formData.auditTypeId === String(t.id) ? 'text-white' : 'text-gray-600'}`}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-3 mb-3"><View className="flex-1"><Text className="text-sm font-medium text-gray-700 mb-1">Certification Date</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm" value={formData.certificationDate} onChangeText={(t) => setFormData({...formData, certificationDate: t})} placeholder="YYYY-MM-DD" /></View><View className="flex-1"><Text className="text-sm font-medium text-gray-700 mb-1">Expiry Date</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm" value={formData.expiryDate} onChangeText={(t) => setFormData({...formData, expiryDate: t})} placeholder="YYYY-MM-DD" /></View></View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Certified Processes</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3" value={formData.certifiedProcesses.join(', ')} onChangeText={(t) => setFormData({...formData, certifiedProcesses: t.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="Machining, Assembly..." />
              <Text className="text-sm font-medium text-gray-700 mb-1">Certified Products</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3" value={formData.certifiedProducts.join(', ')} onChangeText={(t) => setFormData({...formData, certifiedProducts: t.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="24611, 2452..." />
              <Text className="text-sm font-medium text-gray-700 mb-1">Certification Body</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3" value={formData.certificationBody} onChangeText={(t) => setFormData({...formData, certificationBody: t})} placeholder="e.g., IRCA" />
              <Text className="text-sm font-medium text-gray-700 mb-1">Certification Number</Text><TextInput className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3" value={formData.certificationNumber} onChangeText={(t) => setFormData({...formData, certificationNumber: t})} placeholder="e.g., IRCA-2024-001" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal - Same as EnterpriseManagement */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-xl p-6 w-80 shadow-lg">
            <Text className="text-lg font-bold text-gray-900 mb-2">Delete</Text>
            <Text className="text-gray-600 text-sm mb-6">Delete "{deleteConfirm?.name}"? This cannot be undone.</Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setDeleteConfirm(null)} className="px-4 py-2.5 rounded-lg border border-gray-300"><Text className="text-gray-700 text-sm font-medium">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={executeDelete} className="px-4 py-2.5 rounded-lg bg-red-600"><Text className="text-white text-sm font-semibold">Delete</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}