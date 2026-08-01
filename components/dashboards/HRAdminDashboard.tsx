// app/components/dashboards/HRAdminDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal, // <-- FIXED: Added Modal back to imports
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { userAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';

// --- Helper Functions (Defined at module level) ---
const truncateList = (text: string | undefined | null, limit: number): string => {
  if (!text) return '-';
  const items = text.split(',');
  if (items.length <= limit) return text.trim();
  return items.slice(0, limit).join(', ').trim() + ` +${items.length - limit}`;
};

// Types
interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  qualification?: string;
  totalExperience?: number;
  internalAuditorTraining?: string;
  coreToolsTraining?: string;
  customerSpecificApproved?: boolean;
  problemSolvingTools?: string;
  certifiedForProcess?: string;
  certifiedForProduct?: string;
  certificationDate?: string;
  certificationExpiryDate?: string;
  username?: string;
  name?: string;
  active?: boolean;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  site?: string;
  location?: string;
  reportingTo?: { id: string };
  namePrefix?: string;
}

interface Stats {
  totalAuditors: number;
  certified: number;
  expiringSoon: number;
  avgExperience: number;
}

interface CompetencyFormData {
  qualification: string;
  totalExperience: string;
  internalAuditorTraining: string;
  coreToolsTraining: string;
  customerSpecificApproved: boolean;
  problemSolvingTools: string;
  certifiedForProcess: string[];
  certifiedForProduct: string;
  certificationDate: string;
  certificationExpiryDate: string;
}

const processes = [
  "Machining", "Assembly", "Welding", "Painting", "Heat Treatment",
  "Surface Finishing", "Quality Control", "Warehouse", "Maintenance",
  "Procurement", "Sales", "Engineering", "HR", "IT", "Logistics"
];

const coreToolsList = ["APQP", "FMEA", "PPAP", "SPC", "MSA"];
const problemSolvingToolsList = ["8D", "Why-Why", "Fishbone", "Pareto", "5W1H"];

const departments: Record<string, string> = {
  'MR': 'Management Representative', 'ENGG': 'Engineering',
  'PLANT_MAINTENANCE': 'Plant Maintenance', 'STORES_DESPATCH': 'Stores & Despatch',
  'PURCHASE': 'Purchase', 'PPC': 'Production Planning & Control',
  'PRODUCTION': 'Production', 'HR': 'Human Resources',
  'UNIT_HEAD': 'Unit Head', 'TOOL_MAINTENANCE': 'Tool Management',
  'QA': 'Quality Assurance', 'MARKETING': 'Marketing'
};

const getDepartmentName = (deptCode?: string): string => {
  if (!deptCode) return '-';
  return departments[deptCode] || deptCode;
};

// Dynamic Styles Function
const getStyles = (isMobile: boolean, isTablet: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1, padding: isMobile ? 12 : 24 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginRight: 12, flex: 1 },
  headerIcon: { padding: isMobile ? 10 : 12, backgroundColor: '#F3F0FF', borderRadius: 12, marginRight: 12 },
  headerTitle: { fontSize: isMobile ? 20 : 26, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: isMobile ? 12 : 14, color: '#6B7280', marginTop: 2 },
  viewFormButton: {
    paddingHorizontal: isMobile ? 14 : 20, paddingVertical: isMobile ? 8 : 10,
    backgroundColor: '#22C55E', borderRadius: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
  },
  viewFormButtonText: { color: '#FFFFFF', fontSize: isMobile ? 13 : 15, fontWeight: '600' },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, marginHorizontal: -6 },
  statCard: {
    flex: 1, minWidth: isMobile ? '46%' : '23%', margin: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: isMobile ? 14 : 18, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statLeft: { flex: 1 },
  statLabel: { fontSize: isMobile ? 12 : 14, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: isMobile ? 22 : 28, fontWeight: '800', color: '#1F2937', marginTop: 2 },
  statIcon: { padding: isMobile ? 10 : 14, borderRadius: 12 },

  searchContainer: { flexDirection: 'row', marginBottom: 20 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, marginRight: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: isMobile ? 10 : 12, fontSize: 15, color: '#1F2937' },
  refreshButton: {
    padding: isMobile ? 10 : 12, backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
  },

  tableContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden', marginBottom: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tableScrollContent: { flexGrow: 1 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerCell: {
    fontSize: isMobile ? 11 : 13, fontWeight: '700', color: '#4B5563', textAlign: 'center',
    paddingHorizontal: 4, paddingVertical: isMobile ? 12 : 16,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center', backgroundColor: '#FFFFFF' },
  tableCell: {
    fontSize: isMobile ? 11 : 13, color: '#1F2937', textAlign: 'center',
    paddingHorizontal: 4, paddingVertical: isMobile ? 12 : 16,
  },
  
  srNoCell: { width: isMobile ? 40 : 50 },
  nameCell: { width: isMobile ? 120 : 180 },
  deptCell: { width: isMobile ? 90 : 140 },
  qualCell: { width: isMobile ? 100 : 140 },
  expCell: { width: isMobile ? 50 : 70 },
  trainingCell: { width: isMobile ? 120 : 180 },
  coreToolCell: { width: isMobile ? 45 : 60 },
  processCell: { width: isMobile ? 120 : 180 },
  productCell: { width: isMobile ? 120 : 180 },
  solvingCell: { width: isMobile ? 100 : 150 },
  actionCell: { width: isMobile ? 50 : 70 },
  
  trainingText: { color: '#15803D', fontSize: isMobile ? 10 : 12, fontWeight: '600' },
  actionButton: {
    padding: isMobile ? 6 : 8, borderRadius: 8, backgroundColor: '#F3F0FF',
    width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, justifyContent: 'center', alignItems: 'center',
  },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: isMobile ? 'flex-end' : 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', width: isMobile ? '100%' : '90%', maxWidth: isTablet ? 700 : '100%',
    maxHeight: isMobile ? '95%' : '90%', overflow: 'hidden',
    borderTopLeftRadius: isMobile ? 24 : 16, borderTopRightRadius: isMobile ? 24 : 16,
    borderBottomLeftRadius: isTablet ? 16 : 0, borderBottomRightRadius: isTablet ? 16 : 0,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: isMobile ? 16 : 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: isMobile ? 18 : 22, fontWeight: '700', color: '#1F2937', flex: 1 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  closeButton: { padding: 6 },
  modalBody: { padding: isMobile ? 16 : 24, flexGrow: 1 },
  modalFooter: {
    flexDirection: 'row', justifyContent: 'flex-end', padding: isMobile ? 16 : 20,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: isMobile ? 16 : 18, fontWeight: '700', color: '#1F2937' },
  infoGrid: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB'
  },
  
  toolContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  toolButton: {
    margin: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  toolButtonActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  toolButtonText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  toolButtonTextActive: { color: '#FFFFFF' },
  
  processContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, maxHeight: 150 },
  processButton: {
    margin: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  processButtonActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  processButtonText: { fontSize: 12, color: '#6B7280' },
  processButtonTextActive: { color: '#FFFFFF' },
  
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  
  cancelButton: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#E5E7EB', marginRight: 12,
  },
  cancelButtonText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#6C63FF' },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  form1Container: { flex: 1 },
  form1Header: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  form1HeaderCell: {
    fontSize: isMobile ? 11 : 13, fontWeight: '700', color: '#4B5563', textAlign: 'center',
    paddingHorizontal: 4, paddingVertical: 12,
  },
  form1Row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center', backgroundColor: '#FFFFFF' },
  form1Cell: {
    fontSize: isMobile ? 11 : 13, color: '#1F2937', textAlign: 'center',
    paddingHorizontal: 4, paddingVertical: 12,
  },
  form1SrNoCell: { width: isMobile ? 50 : 70 },
  form1NameCell: { width: isMobile ? 150 : 280 },
  form1SystemCell: { width: isMobile ? 120 : 200 },
  form1ProcessCell: { width: isMobile ? 150 : 250 },
  form1ProductCell: { width: isMobile ? 150 : 250 },
});

const HRAdminDashboard: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isMobile = width < 768;
  const styles = getStyles(isMobile, isTablet);

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auditors, setAuditors] = useState<User[]>([]);
  const [filteredAuditors, setFilteredAuditors] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAuditor, setEditingAuditor] = useState<User | null>(null);
  const [showCompetencyForm, setShowCompetencyForm] = useState(false);
  const [showForm1, setShowForm1] = useState(false);

  const [stats, setStats] = useState<Stats>({ totalAuditors: 0, certified: 0, expiringSoon: 0, avgExperience: 0 });

  const fetchAuditors = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAll();
      let allUsers: any[] = [];
      
      if (Array.isArray(response)) {
        allUsers = response;
      } else if (response && typeof response === 'object') {
        const res = response as any;
        if (Array.isArray(res.data)) allUsers = res.data;
        else if (Array.isArray(res.users)) allUsers = res.users;
        else if (Array.isArray(res.items)) allUsers = res.items;
      }
      
      if (!Array.isArray(allUsers)) { 
        setAuditors([]); 
        setFilteredAuditors([]); 
        return; 
      }
      
      const auditorList = allUsers
        .filter((u: any) => ['AUDITOR', 'LEAD_AUDITOR'].includes(u?.role || u?.userRole || u?.Role || ''))
        .map((u: any) => ({
          id: u.id || u._id, 
          firstName: u.firstName || u.first_name || '', 
          lastName: u.lastName || u.last_name || '',
          email: u.email || '', 
          role: u.role || 'AUDITOR', 
          department: u.department || u.dept || '',
          qualification: u.qualification || '', 
          totalExperience: Number(u.totalExperience || u.total_experience || 0),
          internalAuditorTraining: u.internalAuditorTraining || u.internal_auditor_training || '',
          coreToolsTraining: u.coreToolsTraining || u.core_tools_training || '',
          customerSpecificApproved: u.customerSpecificApproved || false,
          problemSolvingTools: u.problemSolvingTools || u.problem_solving_tools || '',
          certifiedForProcess: u.certifiedForProcess || u.certified_for_process || '',
          certifiedForProduct: u.certifiedForProduct || u.certified_for_product || '',
          certificationDate: u.certificationDate || u.certification_date || '',
          certificationExpiryDate: u.certificationExpiryDate || u.certification_expiry_date || '',
          username: u.username || u.userName || '', 
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth || u.dob || '', 
          gender: u.gender || '',
          site: u.site || '', 
          location: u.location || '', 
          active: u.active !== undefined ? u.active : true,
          namePrefix: u.namePrefix || u.prefix || '',
        }));
        
      setAuditors(auditorList); 
      setFilteredAuditors(auditorList);
      
      const certified = auditorList.filter((a: User) => {
        const training = a.internalAuditorTraining;
        return typeof training === 'string' && training.length > 0;
      }).length;
      
      const expiringSoon = auditorList.filter((a: User) => {
        if (!a.certificationExpiryDate) return false;
        const expiry = new Date(a.certificationExpiryDate);
        const limit = new Date(); 
        limit.setMonth(limit.getMonth() + 3);
        return !isNaN(expiry.getTime()) && expiry <= limit;
      }).length;
      
      const avgExp = auditorList.length > 0 
        ? auditorList.reduce((sum, a) => sum + (a.totalExperience || 0), 0) / auditorList.length 
        : 0;
      
      setStats({ 
        totalAuditors: auditorList.length, 
        certified, 
        expiringSoon, 
        avgExperience: Number(avgExp.toFixed(1)) 
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load data');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchAuditors(); }, []);

  useEffect(() => {
    let filtered = auditors;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = auditors.filter((a: User) => 
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) || 
        a.qualification?.toLowerCase().includes(term)
      );
    }
    setFilteredAuditors(filtered);
  }, [searchTerm, auditors]);

  const handleUpdateCompetency = async (auditorId: string | number, competencyData: any) => {
    try {
      const currentUser = await userAPI.getUserById(String(auditorId));
      await userAPI.update(String(auditorId), { ...currentUser, ...competencyData });
      Alert.alert('Success', 'Competency updated successfully');
      setShowCompetencyForm(false); 
      setEditingAuditor(null); 
      fetchAuditors();
    } catch (error: any) { 
      Alert.alert('Error', error?.message || 'Failed to update'); 
    }
  };

  // Form1 Component
  const Form1View: React.FC = () => {
    const [form1Auditors, setForm1Auditors] = useState<any[]>([]);
    const [form1Loading, setForm1Loading] = useState(true);

    useEffect(() => {
      const fetchForm1 = async () => {
        try {
          const response = await userAPI.getAll();
          let allUsers = Array.isArray(response) ? response : (response as any)?.data || [];
          setForm1Auditors(allUsers.filter((u: any) => ['AUDITOR', 'LEAD_AUDITOR'].includes(u?.role || '')).map((u: any) => ({
            id: u.id, firstName: u.firstName, lastName: u.lastName, namePrefix: u.namePrefix,
            internalAuditorTraining: u.internalAuditorTraining, certifiedForProcess: u.certifiedForProcess,
            certifiedForProduct: u.certifiedForProduct, role: u.role
          })));
        } catch (e) {} finally { setForm1Loading(false); }
      };
      fetchForm1();
    }, []);

    return (
      <Modal visible={showForm1} animationType="slide" transparent={true} onRequestClose={() => setShowForm1(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>List of Internal Auditors</Text>
                <Text style={styles.modalSubtitle}>Form 1</Text>
              </View>
              <TouchableOpacity onPress={() => setShowForm1(false)} style={styles.closeButton}>
                <Icon name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {form1Loading ? (
                <ActivityIndicator size="large" color="#6C63FF" style={{marginVertical: 40}}/>
              ) : (
                <View style={styles.form1Container}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      <View style={styles.form1Header}>
                        <Text style={[styles.form1HeaderCell, styles.form1SrNoCell]}>Sr NO.</Text>
                        <Text style={[styles.form1HeaderCell, styles.form1NameCell]}>Name</Text>
                        <Text style={[styles.form1HeaderCell, styles.form1SystemCell]}>System</Text>
                        <Text style={[styles.form1HeaderCell, styles.form1ProcessCell]}>Process</Text>
                        <Text style={[styles.form1HeaderCell, styles.form1ProductCell]}>Product</Text>
                      </View>
                      
                      {form1Auditors.map((item, index) => (
                        <View key={String(item.id || index)} style={styles.form1Row}>
                          <Text style={[styles.form1Cell, styles.form1SrNoCell]}>{index + 1}</Text>
                          <Text style={[styles.form1Cell, styles.form1NameCell]} numberOfLines={1}>
                            {item?.namePrefix} {item?.firstName} {item?.lastName}
                          </Text>
                          <Text style={[styles.form1Cell, styles.form1SystemCell]} numberOfLines={1}>
                            {item?.internalAuditorTraining || '-'}
                          </Text>
                          <Text style={[styles.form1Cell, styles.form1ProcessCell]} numberOfLines={1}>
                            {truncateList(item?.certifiedForProcess, isMobile ? 1 : 2)}
                          </Text>
                          <Text style={[styles.form1Cell, styles.form1ProductCell]} numberOfLines={1}>
                            {truncateList(item?.certifiedForProduct, isMobile ? 1 : 2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowForm1(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Competency Form
  const CompetencyForm: React.FC<{ auditor: User; onSave: (data: any) => void; onCancel: () => void }> = ({ auditor, onSave, onCancel }) => {
    const [formData, setFormData] = useState<CompetencyFormData>({
      qualification: auditor?.qualification || '', 
      totalExperience: auditor?.totalExperience?.toString() || '',
      internalAuditorTraining: auditor?.internalAuditorTraining || '', 
      coreToolsTraining: auditor?.coreToolsTraining || '',
      customerSpecificApproved: auditor?.customerSpecificApproved || false, 
      problemSolvingTools: auditor?.problemSolvingTools || '',
      certifiedForProcess: auditor?.certifiedForProcess ? auditor.certifiedForProcess.split(',') : [],
      certifiedForProduct: auditor?.certifiedForProduct || '',
      certificationDate: auditor?.certificationDate?.split('T')[0] || '',
      certificationExpiryDate: auditor?.certificationExpiryDate?.split('T')[0] || ''
    });

    const handleProcessToggle = (p: string) => setFormData(prev => ({ 
      ...prev, 
      certifiedForProcess: prev.certifiedForProcess.includes(p) 
        ? prev.certifiedForProcess.filter(x => x !== p) 
        : [...prev.certifiedForProcess, p] 
    }));
    
    const handleToolToggle = (tool: string, field: 'coreToolsTraining' | 'problemSolvingTools') => {
      const current = formData[field] ? formData[field].split(',') : [];
      setFormData(prev => ({ 
        ...prev, 
        [field]: (current.includes(tool) ? current.filter(t => t !== tool) : [...current, tool]).join(',') 
      }));
    };

    return (
      <Modal visible={true} animationType="slide" transparent={true} onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Competency: {auditor?.firstName} {auditor?.lastName}</Text>
              <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <Icon name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>User Information</Text></View>
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{auditor?.email}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Department</Text><Text style={styles.infoValue}>{getDepartmentName(auditor?.department)}</Text></View>
              </View>

              <View style={styles.divider} />
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Competency Details</Text></View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Qualification</Text>
                <TextInput style={styles.input} value={formData.qualification} onChangeText={(t) => setFormData({...formData, qualification: t})} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Total Experience (Years)</Text>
                <TextInput style={styles.input} value={formData.totalExperience} onChangeText={(t) => setFormData({...formData, totalExperience: t})} keyboardType="numeric" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Internal Auditor Training</Text>
                <TextInput style={styles.input} value={formData.internalAuditorTraining} onChangeText={(t) => setFormData({...formData, internalAuditorTraining: t})} />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Core Tools Training</Text>
                <View style={styles.toolContainer}>
                  {coreToolsList.map(tool => (
                    <TouchableOpacity key={tool} style={[styles.toolButton, formData.coreToolsTraining?.includes(tool) && styles.toolButtonActive]} onPress={() => handleToolToggle(tool, 'coreToolsTraining')}>
                      <Text style={[styles.toolButtonText, formData.coreToolsTraining?.includes(tool) && styles.toolButtonTextActive]}>{tool}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Certified Processes</Text>
                <View style={styles.processContainer}>
                  {processes.map(p => (
                    <TouchableOpacity key={p} style={[styles.processButton, formData.certifiedForProcess.includes(p) && styles.processButtonActive]} onPress={() => handleProcessToggle(p)}>
                      <Text style={[styles.processButtonText, formData.certifiedForProcess.includes(p) && styles.processButtonTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Customer Specific Approved</Text>
                <Switch value={formData.customerSpecificApproved} onValueChange={(v) => setFormData({...formData, customerSpecificApproved: v})} trackColor={{ false: '#767577', true: '#6C63FF' }} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => onSave({ ...formData, certifiedForProcess: formData.certifiedForProcess.join(',') })}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && auditors.length === 0) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}><Icon name="award" size={24} color="#6C63FF" /></View>
            <View>
              <Text style={styles.headerTitle}>HR Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage auditor competencies</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewFormButton} onPress={() => setShowForm1(true)}>
            <Text style={styles.viewFormButtonText}>Form 1</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {[
            { label: 'Total Auditors', value: stats.totalAuditors, color: '#6C63FF', icon: 'users', bg: '#F3F0FF' },
            { label: 'Certified', value: stats.certified, color: '#22C55E', icon: 'user-check', bg: '#F0FDF4' },
            { label: 'Expiring Soon', value: stats.expiringSoon, color: '#F59E0B', icon: 'clock', bg: '#FFFBEB' },
            { label: 'Avg Experience', value: `${stats.avgExperience} yrs`, color: '#3B82F6', icon: 'trending-up', bg: '#EFF6FF' }
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={styles.statLeft}>
                <Text style={[styles.statLabel, { color: stat.color }]}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                <Icon name={stat.icon as any} size={24} color={stat.color} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Search..." value={searchTerm} onChangeText={setSearchTerm} />
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchAuditors}>
            <Icon name="refresh-cw" size={20} color="#6C63FF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.tableScrollContent}>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.srNoCell]}>#</Text>
                <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
                <Text style={[styles.headerCell, styles.deptCell]}>Dept</Text>
                <Text style={[styles.headerCell, styles.qualCell]}>Qual</Text>
                <Text style={[styles.headerCell, styles.expCell]}>Exp</Text>
                <Text style={[styles.headerCell, styles.trainingCell]}>Training</Text>
                {coreToolsList.map(tool => <Text key={tool} style={[styles.headerCell, styles.coreToolCell]}>{tool}</Text>)}
                <Text style={[styles.headerCell, styles.processCell]}>Process</Text>
                <Text style={[styles.headerCell, styles.productCell]}>Product</Text>
                <Text style={[styles.headerCell, styles.solvingCell]}>Solving</Text>
                <Text style={[styles.headerCell, styles.actionCell]}>Action</Text>
              </View>

              {filteredAuditors.length > 0 ? filteredAuditors.map((item, index) => (
                <View key={String(item.id || index)} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.srNoCell]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, styles.nameCell]} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                  <Text style={[styles.tableCell, styles.deptCell]} numberOfLines={1}>{getDepartmentName(item.department)}</Text>
                  <Text style={[styles.tableCell, styles.qualCell]} numberOfLines={1}>{item.qualification || '-'}</Text>
                  <Text style={[styles.tableCell, styles.expCell]}>{item.totalExperience || 0}</Text>
                  <Text style={[styles.tableCell, styles.trainingCell]} numberOfLines={1}>
                    {item.internalAuditorTraining ? <Text style={styles.trainingText}>{item.internalAuditorTraining}</Text> : '-'}
                  </Text>
                  {coreToolsList.map(tool => (
                    <Text key={tool} style={[styles.tableCell, styles.coreToolCell]}>{item.coreToolsTraining?.includes(tool) ? '✓' : '-'}</Text>
                  ))}
                  
                  <Text style={[styles.tableCell, styles.processCell]} numberOfLines={1}>
                    {truncateList(item.certifiedForProcess, isMobile ? 1 : 2)}
                  </Text>
                  <Text style={[styles.tableCell, styles.productCell]} numberOfLines={1}>
                    {truncateList(item.certifiedForProduct, isMobile ? 1 : 2)}
                  </Text>
                  <Text style={[styles.tableCell, styles.solvingCell]} numberOfLines={1}>
                    {truncateList(item.problemSolvingTools, isMobile ? 1 : 2)}
                  </Text>
                  
                  <TouchableOpacity style={[styles.actionButton, styles.actionCell]} onPress={() => { setEditingAuditor(item); setShowCompetencyForm(true); }}>
                    <Icon name="edit-2" size={16} color="#6C63FF" />
                  </TouchableOpacity>
                </View>
              )) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{searchTerm ? 'No matches found' : 'No auditors available'}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {showCompetencyForm && editingAuditor && (
          <CompetencyForm 
            auditor={editingAuditor} 
            onSave={(data) => handleUpdateCompetency(editingAuditor.id, data)} 
            onCancel={() => { setShowCompetencyForm(false); setEditingAuditor(null); }} 
          />
        )}
        <Form1View />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HRAdminDashboard;