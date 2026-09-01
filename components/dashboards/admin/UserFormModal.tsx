// components/dashboards/admin/UserFormModal.tsx
import { API_BASE_URL } from '@/config/apiConfig';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { enterpriseAPI } from '@/services/enterpriseAPI';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Camera, Check, ChevronDown, GraduationCap, Upload, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';

import {
  Alert, Image, Modal,
  Platform,
  ScrollView, Switch, Text,
  TextInput, TouchableOpacity, useWindowDimensions, View
} from 'react-native';

// ==================== CONSTANTS ====================

// Add this helper function at the top of UserFormModal (outside component):
const uriToBase64 = async (uri: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error converting to base64:', err);
    return uri;
  }
};

// const ROLES = [
//   { name: 'MASTER', displayName: 'Master' },
//   { name: 'AUDIT_MANAGER', displayName: 'Audit Manager' },
//   { name: 'LEAD_AUDITOR', displayName: 'Lead Auditor' },
//   { name: 'AUDITOR', displayName: 'Auditor' },
//   { name: 'HOD', displayName: 'HOD' },
//   { name: 'AUDITEE', displayName: 'Auditee' },
//   { name: 'HR_ADMIN', displayName: 'HR Admin' },
//   { name: 'INITIATOR', displayName: 'Initiator' },
//   { name: 'TOP_MANAGEMENT', displayName: 'Top Management' },
// ];

const NAME_PREFIXES = ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Dr.', 'Prof.'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const DEPARTMENTS = ['MR', 'ENGG', 'PLANT_MAINTENANCE', 'STORES_DESPATCH', 'PURCHASE', 'PPC', 'PRODUCTION', 'HR', 'UNIT_HEAD', 'TOOL_MAINTENANCE', 'QA', 'MARKETING'];
const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT', 'TEMPORARY', 'INTERN'];
const CORE_TOOLS = ['APQP', 'FMEA', 'PPAP', 'SPC', 'MSA'];
const PROBLEM_SOLVING_TOOLS = ['8D', 'Why-Why', 'Fishbone', 'Pareto', '5W1H'];
const PROCESSES = ['Machining', 'Assembly', 'Welding', 'Painting', 'Heat Treatment', 'Surface Finishing', 'Quality Control', 'Warehouse', 'Maintenance'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ==================== HELPER COMPONENTS (Outside main component) ====================

const Field = React.memo(({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
      {label} {required && <Text style={{ color: '#ef4444' }}>*</Text>}
    </Text>
    {children}
  </View>
));

const StyledInput = React.memo(({ value, onChangeText, placeholder, ...props }: any) => (
  <TextInput
    style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white', fontSize: 14, color: '#111827' }}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9ca3af"
    {...props}
  />
));

const DateInput = React.memo(({ value, onPress, placeholder }: any) => (
  <TouchableOpacity onPress={onPress} style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text style={{ fontSize: 14, color: value ? '#111827' : '#9ca3af' }}>{value || placeholder || 'Select date'}</Text>
    <Calendar size={18} color="#6b7280" />
  </TouchableOpacity>
));

const PickerButton = React.memo(({ value, placeholder, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <Text style={{ fontSize: 14, color: value ? '#111827' : '#9ca3af' }} numberOfLines={1}>{value || placeholder}</Text>
    <ChevronDown size={16} color="#9ca3af" />
  </TouchableOpacity>
));

const PickerModal = React.memo(({ visible, onClose, title, options, selected, onSelect }: any) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: isDesktop ? 'center' : 'flex-end',
          alignItems: isDesktop ? 'center' : 'stretch',
        }} 
        onPress={onClose} 
        activeOpacity={1}
      >
        <View style={{ 
          backgroundColor: 'white', 
          borderTopLeftRadius: 16, 
          borderTopRightRadius: 16,
          borderBottomLeftRadius: isDesktop ? 16 : 0,
          borderBottomRightRadius: isDesktop ? 16 : 0,
          padding: 20, 
          maxHeight: isDesktop ? 500 : 400,
          width: isDesktop ? 450 : '100%',
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {/* Options List */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
            {options.map((opt: any) => {
              const val = typeof opt === 'string' ? opt : opt.name;
              const label = typeof opt === 'string' ? opt : (opt.displayName || opt.name || opt);
              const isSelected = typeof opt === 'string' ? selected === opt : selected === opt.name;
              return (
                <TouchableOpacity 
                  key={val} 
                  onPress={() => { onSelect(val); onClose(); }}
                  style={{ 
                    paddingVertical: 14, 
                    paddingHorizontal: 16, 
                    borderBottomWidth: 1, 
                    borderColor: '#f3f4f6', 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    borderRadius: 8,
                    marginBottom: 2,
                  }}
                >
                  <Text style={{ 
                    color: isSelected ? '#1e3a5f' : '#374151', 
                    fontWeight: isSelected ? '600' : '400',
                    fontSize: 15,
                    flex: 1,
                  }}>
                    {label}
                  </Text>
                  {isSelected && <Check size={18} color="#00529B" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const DatePickerModal = React.memo(({ visible, value, onSelect, onClose }: { visible: boolean; value: string; onSelect: (date: string) => void; onClose: () => void }) => {
  const today = new Date();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedYear(d.getFullYear());
        setSelectedMonth(d.getMonth());
        setSelectedDay(d.getDate());
      }
    }
  }, [value, visible]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const years = Array.from({ length: 80 }, (_, i) => today.getFullYear() - i);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity 
        style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: isDesktop ? 'center' : 'flex-end',
          alignItems: isDesktop ? 'center' : 'stretch',
        }} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 16, 
            borderTopRightRadius: 16,
            borderBottomLeftRadius: isDesktop ? 16 : 0,
            borderBottomRightRadius: isDesktop ? 16 : 0,
            padding: 20,
            width: isDesktop ? 420 : '100%',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={(onClose)}>
              <Text style={{ color: '#ef4444', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Select Date</Text>
            <TouchableOpacity onPress={() => { 
              onSelect(`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`); 
              onClose(); 
            }}>
              <Text style={{ color: '#2563eb', fontSize: 16, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Date Display */}
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' }}>
              {selectedDay} {MONTHS[selectedMonth]} {selectedYear}
            </Text>
          </View>

          {/* Scrollable Pickers */}
          <View style={{ flexDirection: 'row', height: 200 }}>
            {/* Month */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: '600' }}>MONTH</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {MONTHS.map((month, idx) => (
                  <TouchableOpacity 
                    key={month} 
                    onPress={() => setSelectedMonth(idx)}
                    style={{ 
                      paddingVertical: 10, 
                      paddingHorizontal: 15, 
                      borderRadius: 8, 
                      backgroundColor: selectedMonth === idx ? '#1e3a5f' : 'transparent', 
                      marginBottom: 4 
                    }}
                  >
                    <Text style={{ 
                      fontSize: 14, 
                      color: selectedMonth === idx ? 'white' : '#374151', 
                      fontWeight: selectedMonth === idx ? '600' : '400', 
                      textAlign: 'center' 
                    }}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: '600' }}>DAY</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')).map(day => (
                  <TouchableOpacity 
                    key={day} 
                    onPress={() => setSelectedDay(Number(day))}
                    style={{ 
                      paddingVertical: 10, 
                      paddingHorizontal: 15, 
                      borderRadius: 8, 
                      backgroundColor: selectedDay === Number(day) ? '#1e3a5f' : 'transparent', 
                      marginBottom: 4 
                    }}
                  >
                    <Text style={{ 
                      fontSize: 14, 
                      color: selectedDay === Number(day) ? 'white' : '#374151', 
                      fontWeight: selectedDay === Number(day) ? '600' : '400', 
                      textAlign: 'center' 
                    }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: '600' }}>YEAR</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {years.map(year => (
                  <TouchableOpacity 
                    key={year} 
                    onPress={() => setSelectedYear(year)}
                    style={{ 
                      paddingVertical: 10, 
                      paddingHorizontal: 15, 
                      borderRadius: 8, 
                      backgroundColor: selectedYear === year ? '#1e3a5f' : 'transparent', 
                      marginBottom: 4 
                    }}
                  >
                    <Text style={{ 
                      fontSize: 14, 
                      color: selectedYear === year ? 'white' : '#374151', 
                      fontWeight: selectedYear === year ? '600' : '400', 
                      textAlign: 'center' 
                    }}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

// ==================== MAIN COMPONENT ====================
interface UserFormModalProps {
  isEdit: boolean;
  user: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function UserFormModal({ isEdit, user, onClose, onSave }: UserFormModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const {
  markDirty,
  resetDirty,
  confirmDiscard,
  showDiscardModal,
  cancelDiscard,
  discardChanges,
} = useUnsavedChanges();
  const [step, setStep] = useState(1);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showPrefixPicker, setShowPrefixPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  // Enterprise Picker States
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  // Fetch dropdown data
  const [companies, setCompanies] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [formData, setFormData] = useState({
    namePrefix: user?.namePrefix || 'Mr.',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    userName: user?.username || user?.userName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    role: user?.role || '',
    department: user?.department || '',
    active: user?.active ?? true,
    password: '',
    employeeId: user?.employeeId || '',
    designation: user?.designation || '',
    employmentType: user?.employmentType || '',
    joiningDate: user?.joiningDate || '',
    confirmationDate: user?.confirmationDate || '',
    workCity: user?.workCity || '',
    workState: user?.workState || '',
    workPincode: user?.workPincode || '',
    workCountry: user?.workCountry || 'India',
    companyId: user?.companyId || '',
    companyName: user?.companyName || '',
    plantId: user?.plantId || '',
    plantName: user?.plantName || '',
    siteId: user?.siteId || '',
    siteName: user?.siteName || '',
    unitId: user?.unitId || '',
    unitName: user?.unitName || '',
    managerId: user?.managerId || '',
    hodId: user?.hodId || '',
    reportingToId: user?.reportingToId || '',
    qualification: user?.qualification || '',
    totalExperience: user?.totalExperience || '',
    internalAuditorTraining: user?.internalAuditorTraining || '',
    coreToolsTraining: user?.coreToolsTraining || '',
    problemSolvingTools: user?.problemSolvingTools || '',
    certifiedForProcess: Array.isArray(user?.certifiedForProcess) ? user.certifiedForProcess : (user?.certifiedForProcess ? user.certifiedForProcess.split(',') : []),
    certifiedForProduct: user?.certifiedForProduct || '',
    certificationDate: user?.certificationDate || '',
    certificationExpiryDate: user?.certificationExpiryDate || '',
  });

  const isAuditorRole = formData.role === 'AUDITOR' || formData.role === 'LEAD_AUDITOR';

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
    fetchRoles(); // ✅ Add this line
    loadProfilePhoto();
    loadSignature();
  }, []);


  // Add this function to fetch roles from API
const fetchRoles = async () => {
  try {
    setLoadingRoles(true);
    const response = await fetch(`${API_BASE_URL}/api/roles`);
    const data = await response.json();
    
    let rolesArray = [];
    if (Array.isArray(data)) {
      rolesArray = data;
    } else if (data?.data && Array.isArray(data.data)) {
      rolesArray = data.data;
    } else if (data?.roles && Array.isArray(data.roles)) {
      rolesArray = data.roles;
    } else {
      // Fallback to hardcoded if API fails
      rolesArray = [
        { name: 'MASTER', displayName: 'Master' },
        { name: 'AUDIT_MANAGER', displayName: 'Audit Manager' },
        { name: 'LEAD_AUDITOR', displayName: 'Lead Auditor' },
        { name: 'AUDITOR', displayName: 'Auditor' },
        { name: 'HOD', displayName: 'HOD' },
        { name: 'AUDITEE', displayName: 'Auditee' },
        { name: 'HR_ADMIN', displayName: 'HR Admin' },
        { name: 'INITIATOR', displayName: 'Initiator' },
        { name: 'TOP_MANAGEMENT', displayName: 'Top Management' },
      ];
    }
    
    console.log('✅ Roles loaded:', rolesArray.length);
    setAvailableRoles(rolesArray);
  } catch (error) {
    console.error('❌ Failed to load roles:', error);
    // Fallback to hardcoded roles
    setAvailableRoles([
      { name: 'MASTER', displayName: 'Master' },
      { name: 'AUDIT_MANAGER', displayName: 'Audit Manager' },
      { name: 'LEAD_AUDITOR', displayName: 'Lead Auditor' },
      { name: 'AUDITOR', displayName: 'Auditor' },
      { name: 'HOD', displayName: 'HOD' },
      { name: 'AUDITEE', displayName: 'Auditee' },
      { name: 'HR_ADMIN', displayName: 'HR Admin' },
      { name: 'INITIATOR', displayName: 'Initiator' },
      { name: 'TOP_MANAGEMENT', displayName: 'Top Management' },
    ]);
  } finally {
    setLoadingRoles(false);
  }
};
  // Fetch functions with proper error handling
  const fetchCompanies = async () => {
    try {
      console.log('📡 Fetching companies...');
      let data;
      try {
        data = await enterpriseAPI.getCompanies();
      } catch (apiErr) {
        console.log('⚠️ enterpriseAPI failed, using direct fetch...');
        const res = await fetch(`${API_BASE_URL}/api/enterprise/companies`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      
      console.log('📦 Companies response:', data);
      
      let companiesArray = [];
      if (Array.isArray(data)) {
        companiesArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        companiesArray = data.data;
      } else if (data?.companies && Array.isArray(data.companies)) {
        companiesArray = data.companies;
      } else {
        const values = Object.values(data).find(v => Array.isArray(v));
        if (values) companiesArray = values;
      }
      
      console.log('✅ Companies loaded:', companiesArray.length);
      setCompanies(companiesArray);
      
    } catch (err) { 
      console.error('❌ Failed to load companies:', err);
      setCompanies([]);
      Alert.alert('Error', 'Failed to load companies. Please check your connection.');
    }
  };

  const fetchPlants = async (companyId: string) => {
    try {
      console.log('📡 Fetching plants for company:', companyId);
      let data;
      try {
        data = await enterpriseAPI.getPlantsByCompany(companyId);
      } catch (apiErr) {
        const res = await fetch(`${API_BASE_URL}/api/enterprise/plants/company/${companyId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      
      const plantsArray = Array.isArray(data) ? data : (data?.data || []);
      console.log('✅ Plants loaded:', plantsArray.length);
      setPlants(plantsArray);
      
    } catch (err) { 
      console.error('❌ Failed to load plants:', err);
      setPlants([]);
      Alert.alert('Error', 'Failed to load plants');
    }
  };

  const fetchSites = async (plantId: string) => {
    try {
      console.log('📡 Fetching sites for plant:', plantId);
      let data;
      try {
        data = await enterpriseAPI.getSitesByPlant(plantId);
      } catch (apiErr) {
        const res = await fetch(`${API_BASE_URL}/api/enterprise/sites/plant/${plantId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      
      const sitesArray = Array.isArray(data) ? data : (data?.data || []);
      console.log('✅ Sites loaded:', sitesArray.length);
      setSites(sitesArray);
      
    } catch (err) { 
      console.error('❌ Failed to load sites:', err);
      setSites([]);
      Alert.alert('Error', 'Failed to load sites');
    }
  };

  const fetchUnits = async (siteId: string) => {
    try {
      console.log('📡 Fetching units for site:', siteId);
      let data;
      try {
        data = await enterpriseAPI.getUnitsBySite(siteId);
      } catch (apiErr) {
        const res = await fetch(`${API_BASE_URL}/api/enterprise/units/site/${siteId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      
      const unitsArray = Array.isArray(data) ? data : (data?.data || []);
      console.log('✅ Units loaded:', unitsArray.length);
      setUnits(unitsArray);
      
    } catch (err) { 
      console.error('❌ Failed to load units:', err);
      setUnits([]);
      Alert.alert('Error', 'Failed to load units');
    }
  };

  // Enterprise handlers
  const handleCompanySelect = (companyId: string) => {
    const company = companies.find(c => String(c.id) === companyId);
    if (company) {
      updateField('companyId', companyId);
      updateField('companyName', company.name);
      // Reset child selections
      updateField('plantId', '');
      updateField('plantName', '');
      updateField('siteId', '');
      updateField('siteName', '');
      updateField('unitId', '');
      updateField('unitName', '');
      setPlants([]);
      setSites([]);
      setUnits([]);
      fetchPlants(companyId);
    }
    setShowCompanyPicker(false);
  };

  const handlePlantSelect = (plantId: string) => {
    const plant = plants.find(p => String(p.id) === plantId);
    if (plant) {
      updateField('plantId', plantId);
      updateField('plantName', plant.name);
      // Reset child selections
      updateField('siteId', '');
      updateField('siteName', '');
      updateField('unitId', '');
      updateField('unitName', '');
      setSites([]);
      setUnits([]);
      fetchSites(plantId);
    }
    setShowPlantPicker(false);
  };

  const handleSiteSelect = (siteId: string) => {
    const site = sites.find(s => String(s.id) === siteId);
    if (site) {
      updateField('siteId', siteId);
      updateField('siteName', site.name);
      // Reset child selections
      updateField('unitId', '');
      updateField('unitName', '');
      setUnits([]);
      fetchUnits(siteId);
    }
    setShowSitePicker(false);
  };

  const handleUnitSelect = (unitId: string) => {
    const unit = units.find(u => String(u.id) === unitId);
    if (unit) {
      updateField('unitId', unitId);
      updateField('unitName', unit.name);
    }
    setShowUnitPicker(false);
  };

  const loadProfilePhoto = async () => {
    if (user?.profilePhotoPath && user?.id) {
      setProfilePhoto(`${API_BASE_URL}/api/users/${user.id}/profile-photo`);
    } else if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  };

  const loadSignature = () => {
    if (user?.signaturePath && user?.id) {
      setSignature(`${API_BASE_URL}/api/users/${user.id}/signature`);
    } else if (user?.signature) {
      setSignature(user.signature);
    }
  };

  // Auto age
  useEffect(() => {
    if (formData.dateOfBirth) {
      const today = new Date();
      const birth = new Date(formData.dateOfBirth);
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      setAge(a > 0 ? String(a) : '');
    } else setAge('');
  }, [formData.dateOfBirth]);

  // Stable callbacks
  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
   markDirty();
}, [markDirty]);

  const handleSave = useCallback(() => {
  if (
    !formData.firstName ||
    !formData.lastName ||
    !formData.email ||
    !formData.role
  ) {
    Alert.alert('Error', 'Please fill all required fields');
    return;
  }

  resetDirty();

  onSave({
    ...formData,
    profilePhoto,
    signature,
  });
}, [
  formData,
  profilePhoto,
  signature,
  onSave,
  resetDirty,
]);
  const pickImage = useCallback(async (setter: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setter(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        const base64 = await uriToBase64(asset.uri);
        setter(base64);
      }
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Web', 'Camera not available on web. Use Choose Photo instead.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setProfilePhoto(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        const base64 = await uriToBase64(asset.uri);
        setProfilePhoto(base64);
      }
    }
  }, []);

  const toggleArray = useCallback(
  (field: string, item: string, isArray = false) => {
    setFormData(prev => {
      const current = isArray
        ? (prev[field as keyof typeof prev] as string[])
        : (prev[field as keyof typeof prev] as string)?.split(',') || [];

      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];

      return {
        ...prev,
        [field]: isArray ? updated : updated.join(','),
      };
    });

    markDirty();
  },
  [markDirty]
);

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  // Format enterprise display name
  const getDisplayName = (list: any[], id: string, field = 'name') => {
    const item = list.find(i => String(i.id) === String(id));
    return item ? item[field] : '';
  };

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ 
          flex: 1, marginTop: isDesktop ? 60 : 50, backgroundColor: 'white',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          width: '100%', maxWidth: isDesktop ? 700 : '100%', alignSelf: 'center',
          borderLeftWidth: isDesktop ? 1 : 0, borderRightWidth: isDesktop ? 1 : 0, borderColor: '#e5e7eb',
          borderBottomLeftRadius: isDesktop ? 16 : 0, borderBottomRightRadius: isDesktop ? 16 : 0,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
            <TouchableOpacity onPress={() => confirmDiscard(onClose)}><X size={24} color="#6b7280" /></TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>{isEdit ? 'Edit User' : 'Add User'}</Text>
            <TouchableOpacity onPress={handleSave}><Text style={{ color: '#2563eb', fontWeight: '600' }}>Save</Text></TouchableOpacity>
          </View>

          {/* Steps */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f9fafb' }}>
            {['Basic', 'Work', 'Competency'].map((s, i) => (
              <TouchableOpacity key={i} onPress={() => setStep(i + 1)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2, borderRadius: 4, backgroundColor: step === i + 1 ? '#1e3a5f' : '#e5e7eb' }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: step === i + 1 ? 'white' : '#6b7280' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>Personal Information</Text>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ width: 80 }}>
                    <Field label="Prefix"><PickerButton value={formData.namePrefix} placeholder="Mr." onPress={() => setShowPrefixPicker(true)} /></Field>
                  </View>
                  <View style={{ flex: 1 }}><Field label="First Name" required><StyledInput value={formData.firstName} onChangeText={(t: string) => updateField('firstName', t)} placeholder="First name" /></Field></View>
                  <View style={{ flex: 1 }}><Field label="Last Name" required><StyledInput value={formData.lastName} onChangeText={(t: string) => updateField('lastName', t)} placeholder="Last name" /></Field></View>
                </View>

                <Field label="Username"><StyledInput value={formData.userName} onChangeText={(t: string) => updateField('userName', t)} placeholder="Username" /></Field>
                <Field label="Email" required><StyledInput value={formData.email} onChangeText={(t: string) => updateField('email', t)} placeholder="Email" keyboardType="email-address" /></Field>
                <Field label="Phone"><StyledInput value={formData.phone} onChangeText={(t: string) => updateField('phone', t)} placeholder="Phone" keyboardType="phone-pad" /></Field>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Field label="Date of Birth"><DateInput value={formData.dateOfBirth ? formatDate(formData.dateOfBirth) : ''} onPress={() => setShowDatePicker('dateOfBirth')} placeholder="Select date" /></Field></View>
                  <View style={{ width: 80 }}><Field label="Age"><View style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f3f4f6' }}><Text style={{ fontSize: 14, color: '#6b7280' }}>{age ? `${age} yrs` : '--'}</Text></View></Field></View>
                </View>

                <Field label="Gender"><PickerButton value={formData.gender} placeholder="Select gender" onPress={() => setShowGenderPicker(true)} /></Field>
<Field label="Role" required>
  <PickerButton 
    value={availableRoles.find(r => r.name === formData.role)?.displayName} 
    placeholder="Select role" 
    onPress={() => {
      if (availableRoles.length === 0) {
        Alert.alert('Info', 'Loading roles... Please wait.');
        fetchRoles();
        return;
      }
      setShowRolePicker(true);
    }} 
  />
</Field>
                <Field label="Department"><PickerButton value={formData.department} placeholder="Select department" onPress={() => setShowDeptPicker(true)} /></Field>

                {!isEdit && <Field label="Password" required><StyledInput value={formData.password} onChangeText={(t: string) => updateField('password', t)} placeholder="Password" secureTextEntry /></Field>}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, color: '#4b5563' }}>Active</Text>
                  <Switch value={formData.active} onValueChange={(v) => updateField('active', v)} />
                </View>

              {/* Profile Photo */}
<Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 }}>Profile Photo</Text>
<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#e5e7eb' }}>
    {profilePhoto ? (
      <Image 
        source={{ uri: profilePhoto }} 
        style={{ width: '100%', height: '100%' }} 
        onError={() => setProfilePhoto(null)} 
      />
    ) : (
      <Camera size={24} color="#9ca3af" />
    )}
  </View>
  <View style={{ gap: 8 }}>
    <TouchableOpacity 
      onPress={() => pickImage(setProfilePhoto)} 
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1e3a5f', borderRadius: 8 }}
    >
      <Upload size={14} color="white" />
      <Text style={{ color: 'white', fontSize: 12, marginLeft: 6 }}>Choose Photo</Text>
    </TouchableOpacity>
    {Platform.OS !== 'web' && (
      <TouchableOpacity 
        onPress={takePhoto} 
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 8 }}
      >
        <Camera size={14} color="#374151" />
        <Text style={{ color: '#374151', fontSize: 12, marginLeft: 6 }}>Take Photo</Text>
      </TouchableOpacity>
    )}
    {profilePhoto && (
      <TouchableOpacity onPress={() => setProfilePhoto(null)}>
        <Text style={{ color: '#ef4444', fontSize: 12 }}>Remove Photo</Text>
      </TouchableOpacity>
    )}
  </View>
</View>

{/* Signature */}
<Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Digital Signature</Text>
<View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
  <View style={{ width: 140, height: 60, borderRadius: 8, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
    {signature ? (
      <Image 
        source={{ uri: signature }} 
        style={{ width: '100%', height: '100%' }} 
        resizeMode="contain"
        onError={() => setSignature(null)}
      />
    ) : (
      <Text style={{ color: '#9ca3af', fontSize: 11 }}>No signature</Text>
    )}
  </View>
  <View style={{ gap: 8 }}>
    <TouchableOpacity 
      onPress={() => pickImage(setSignature)} 
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#7c3aed', borderRadius: 8 }}
    >
      <Upload size={14} color="white" />
      <Text style={{ color: 'white', fontSize: 12, marginLeft: 6 }}>Upload Signature</Text>
    </TouchableOpacity>
    {signature && (
      <TouchableOpacity onPress={() => setSignature(null)}>
        <Text style={{ color: '#ef4444', fontSize: 12 }}>Remove Signature</Text>
      </TouchableOpacity>
    )}
  </View>
</View>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>Employee Details</Text>
                <Field label="Employee ID"><StyledInput value={formData.employeeId} onChangeText={(t: string) => updateField('employeeId', t)} placeholder="EMP001" /></Field>
                <Field label="Designation"><StyledInput value={formData.designation} onChangeText={(t: string) => updateField('designation', t)} placeholder="e.g., Senior Engineer" /></Field>
                <Field label="Employment Type"><PickerButton value={formData.employmentType} placeholder="Select type" onPress={() => {
                  Alert.alert('Select', '', [...EMPLOYMENT_TYPES.map(t => ({ text: t, onPress: () => updateField('employmentType', t) })), { text: 'Cancel', onPress: () => {} }]);
                }} /></Field>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Field label="Joining Date"><DateInput value={formData.joiningDate ? formatDate(formData.joiningDate) : ''} onPress={() => setShowDatePicker('joiningDate')} placeholder="Select date" /></Field></View>
                  <View style={{ flex: 1 }}><Field label="Confirmation Date"><DateInput value={formData.confirmationDate ? formatDate(formData.confirmationDate) : ''} onPress={() => setShowDatePicker('confirmationDate')} placeholder="Select date" /></Field></View>
                </View>

                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12, marginTop: 16 }}>Work Location</Text>
                <Field label="City"><StyledInput value={formData.workCity} onChangeText={(t: string) => updateField('workCity', t)} placeholder="City" /></Field>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Field label="State"><StyledInput value={formData.workState} onChangeText={(t: string) => updateField('workState', t)} placeholder="State" /></Field></View>
                  <View style={{ flex: 1 }}><Field label="Country"><StyledInput value={formData.workCountry} onChangeText={(t: string) => updateField('workCountry', t)} placeholder="Country" /></Field></View>
                </View>
                <Field label="Pincode"><StyledInput value={formData.workPincode} onChangeText={(t: string) => updateField('workPincode', t)} placeholder="Pincode" keyboardType="numeric" /></Field>

                {/* Enterprise Location - Using PickerModal */}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12, marginTop: 16 }}>Enterprise Location</Text>
                
                <Field label="Company">
                  <PickerButton 
                    value={companies.find(c => String(c.id) === formData.companyId)?.name || ''} 
                    placeholder="Select company" 
                    onPress={() => {
                      if (companies.length === 0) {
                        Alert.alert('Info', 'Loading companies... Please wait.');
                        fetchCompanies();
                        return;
                      }
                      setShowCompanyPicker(true);
                    }} 
                  />
                </Field>

                <Field label="Plant">
                  <PickerButton 
                    value={plants.find(p => String(p.id) === formData.plantId)?.name || ''} 
                    placeholder="Select plant" 
                    onPress={() => {
                      if (!formData.companyId) {
                        Alert.alert('Info', 'Please select a company first');
                        return;
                      }
                      if (plants.length === 0) {
                        Alert.alert('Info', 'No plants found for this company');
                        return;
                      }
                      setShowPlantPicker(true);
                    }} 
                  />
                </Field>

                <Field label="Site">
                  <PickerButton 
                    value={sites.find(s => String(s.id) === formData.siteId)?.name || ''} 
                    placeholder="Select site" 
                    onPress={() => {
                      if (!formData.plantId) {
                        Alert.alert('Info', 'Please select a plant first');
                        return;
                      }
                      if (sites.length === 0) {
                        Alert.alert('Info', 'No sites found for this plant');
                        return;
                      }
                      setShowSitePicker(true);
                    }} 
                  />
                </Field>

                <Field label="Unit">
                  <PickerButton 
                    value={units.find(u => String(u.id) === formData.unitId)?.name || ''} 
                    placeholder="Select unit" 
                    onPress={() => {
                      if (!formData.siteId) {
                        Alert.alert('Info', 'Please select a site first');
                        return;
                      }
                      if (units.length === 0) {
                        Alert.alert('Info', 'No units found for this site');
                        return;
                      }
                      setShowUnitPicker(true);
                    }} 
                  />
                </Field>

                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12, marginTop: 16 }}>Reporting Structure</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Field label="Manager ID"><StyledInput value={formData.managerId} onChangeText={(t: string) => updateField('managerId', t)} placeholder="Manager ID" keyboardType="numeric" /></Field></View>
                  <View style={{ flex: 1 }}><Field label="HOD ID"><StyledInput value={formData.hodId} onChangeText={(t: string) => updateField('hodId', t)} placeholder="HOD ID" keyboardType="numeric" /></Field></View>
                </View>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                {isAuditorRole ? (
                  <>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>Auditor Competency</Text>
                    <Field label="Qualification"><StyledInput value={formData.qualification} onChangeText={(t: string) => updateField('qualification', t)} placeholder="e.g., B.Tech Mechanical" /></Field>
                    <Field label="Total Experience (Years)"><StyledInput value={formData.totalExperience} onChangeText={(t: string) => updateField('totalExperience', t)} placeholder="Years" keyboardType="numeric" /></Field>
                    <Field label="Internal Auditor Training"><StyledInput value={formData.internalAuditorTraining} onChangeText={(t: string) => updateField('internalAuditorTraining', t)} placeholder="e.g., ISO 9001 & IATF 16949" /></Field>

                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 }}>Core Tools Training</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {CORE_TOOLS.map(tool => {
                        const selected = (formData.coreToolsTraining || '').split(',').includes(tool);
                        return <TouchableOpacity key={tool} onPress={() => toggleArray('coreToolsTraining', tool)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: selected ? '#1e3a5f' : 'white', borderColor: selected ? '#1e3a5f' : '#d1d5db' }}><Text style={{ fontSize: 12, color: selected ? 'white' : '#4b5563' }}>{tool}</Text></TouchableOpacity>;
                      })}
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Problem Solving Tools</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {PROBLEM_SOLVING_TOOLS.map(tool => {
                        const selected = (formData.problemSolvingTools || '').split(',').includes(tool);
                        return <TouchableOpacity key={tool} onPress={() => toggleArray('problemSolvingTools', tool)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: selected ? '#7c3aed' : 'white', borderColor: selected ? '#7c3aed' : '#d1d5db' }}><Text style={{ fontSize: 12, color: selected ? 'white' : '#4b5563' }}>{tool}</Text></TouchableOpacity>;
                      })}
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Certified Processes</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {PROCESSES.map(process => {
                        const selected = (formData.certifiedForProcess || []).includes(process);
                        return <TouchableOpacity key={process} onPress={() => toggleArray('certifiedForProcess', process, true)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: selected ? '#16a34a' : 'white', borderColor: selected ? '#16a34a' : '#d1d5db' }}><Text style={{ fontSize: 12, color: selected ? 'white' : '#4b5563' }}>{process}</Text></TouchableOpacity>;
                      })}
                    </View>

                    <Field label="Certified Products"><StyledInput value={formData.certifiedForProduct} onChangeText={(t: string) => updateField('certifiedForProduct', t)} placeholder="Product IDs" /></Field>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><Field label="Certification Date"><DateInput value={formData.certificationDate ? formatDate(formData.certificationDate) : ''} onPress={() => setShowDatePicker('certificationDate')} placeholder="Select date" /></Field></View>
                      <View style={{ flex: 1 }}><Field label="Expiry Date"><DateInput value={formData.certificationExpiryDate ? formatDate(formData.certificationExpiryDate) : ''} onPress={() => setShowDatePicker('certificationExpiryDate')} placeholder="Select date" /></Field></View>
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                    <GraduationCap size={48} color="#d1d5db" />
                    <Text style={{ color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>Competency settings only for Auditor and Lead Auditor roles</Text>
                  </View>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Regular Pickers */}
      <DatePickerModal visible={!!showDatePicker} value={showDatePicker ? (formData[showDatePicker as keyof typeof formData] as string) || '' : ''} onSelect={(dateStr: string) => { if (showDatePicker) updateField(showDatePicker, dateStr); setShowDatePicker(null); }} onClose={() => setShowDatePicker(null)} />
<PickerModal 
  visible={showRolePicker} 
  onClose={() => setShowRolePicker(false)} 
  title="Select Role" 
  options={availableRoles} 
  selected={formData.role} 
  onSelect={(v: string) => updateField('role', v)} 
/>      <PickerModal visible={showDeptPicker} onClose={() => setShowDeptPicker(false)} title="Select Department" options={DEPARTMENTS} selected={formData.department} onSelect={(v: string) => updateField('department', v)} />
      <PickerModal visible={showPrefixPicker} onClose={() => setShowPrefixPicker(false)} title="Select Prefix" options={NAME_PREFIXES} selected={formData.namePrefix} onSelect={(v: string) => updateField('namePrefix', v)} />
      <PickerModal visible={showGenderPicker} onClose={() => setShowGenderPicker(false)} title="Select Gender" options={GENDERS} selected={formData.gender} onSelect={(v: string) => updateField('gender', v)} />

      {/* Enterprise Picker Modals */}
      <PickerModal 
        visible={showCompanyPicker} 
        onClose={() => setShowCompanyPicker(false)} 
        title="Select Company" 
        options={companies.map(c => ({ 
          name: String(c.id), 
          displayName: c.name || `Company ${c.id}` 
        }))} 
        selected={formData.companyId} 
        onSelect={handleCompanySelect} 
      />

      <PickerModal 
        visible={showPlantPicker} 
        onClose={() => setShowPlantPicker(false)} 
        title="Select Plant" 
        options={plants.map(p => ({ 
          name: String(p.id), 
          displayName: p.name || `Plant ${p.id}` 
        }))} 
        selected={formData.plantId} 
        onSelect={handlePlantSelect} 
      />

      <PickerModal 
        visible={showSitePicker} 
        onClose={() => setShowSitePicker(false)} 
        title="Select Site" 
        options={sites.map(s => ({ 
          name: String(s.id), 
          displayName: s.name || `Site ${s.id}` 
        }))} 
        selected={formData.siteId} 
        onSelect={handleSiteSelect} 
      />

            <PickerModal 
        visible={showUnitPicker} 
        onClose={() => setShowUnitPicker(false)} 
        title="Select Unit" 
        options={units.map(u => ({ 
          name: String(u.id), 
          displayName: u.name || `Unit ${u.id}` 
        }))} 
        selected={formData.unitId} 
        onSelect={handleUnitSelect} 
      />

      {/* ==================== DISCARD CHANGES MODAL ==================== */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDiscard}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.25,
              shadowRadius: 10,
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 16,
              }}
            >
              <X size={26} color="#dc2626" />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#111827',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Discard changes?
            </Text>

            {/* Message */}
            <Text
              style={{
                fontSize: 14,
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: 21,
                marginBottom: 24,
              }}
            >
              You have unsaved changes. Are you sure you want to leave without saving?
            </Text>

            {/* Buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
              }}
            >
              {/* Stay */}
              <TouchableOpacity
                onPress={cancelDiscard}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  backgroundColor: 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#374151',
                  }}
                >
                  Stay
                </Text>
              </TouchableOpacity>

              {/* Discard */}
              <TouchableOpacity
                onPress={() => discardChanges(onClose)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: '#dc2626',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  Discard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    
    </Modal>
  );
}