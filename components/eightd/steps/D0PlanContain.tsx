// app/components/eightd/steps/D0PlanContain.tsx
'use client';

import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import axios from 'axios';
import { eightDAPI, userAPI } from '../../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// FIX 2: Dynamic Base URL for Expo (Web vs Android Emulator vs Physical Device)
const getBaseURL = (): string => {
  if (__DEV__) {
    return (
      Platform.select({
        ios: "http://10.2.0.95:8080/api",
        android: "http://10.2.0.95:8080/api",
        default: "http://10.2.0.73:8080/api",
      }) || "http://10.2.0.73:8080/api"
    );
  }
  return "https://auditchecksheetncr-be.hub.swajyot.co.in:9443/api";
};

const API_BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});


// FIX 3: Safe Image Paths. Use require() for local assets, or full URIs for web.
const companies = [
  { name: 'TTK Prestige', logo: 'https://via.placeholder.com/48?text=TTK' }, // Replace with require('../../../assets/logos/ttk.png') if local
  { name: 'Boeing', logo: 'https://via.placeholder.com/48?text=Boeing' },
  { name: 'Feather Light Furniture', logo: 'https://via.placeholder.com/48?text=FLF' },
];

const defaultDepartments = [
  { id: '1', name: 'Quality' },
  { id: '2', name: 'Production' },
  { id: '3', name: 'Engineering' },
  { id: '4', name: 'Maintenance' },
  { id: '5', name: 'Supply Chain' },
  { id: '6', name: 'R&D' },
  { id: '7', name: 'Other' },
];

interface TeamMember {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  isExternal?: boolean;
  username?: string;
}

interface D0FormData {
  eventNo: string;
  plantLine: string;
  partName: string;
  lotSerial: string;
  defectCode: string;
  dateDiscovered: string;
  reportedBy: string;
  personName: string;
  department: string;
  companyName: string;
  companyLogo: string;
  contactPerson: string;
  phone: string;
  email: string;
  teamMembers: TeamMember[];
  countryCode: string;
  pictures: any[];
  reports: any[];
  videos: any[];
  status: string;
  currentStep: string;
  isNcrBased: boolean;
  sourceType: string;
  sourceNcrId?: string;
  sourceNcrNumber?: string;
}

interface D0PlanContainProps {
  eventId?: string | null;
  initialIsNcrBased?: boolean;
  updateParent?: (data: D0FormData[]) => void;
}

export default function D0PlanContain({
  eventId,
  initialIsNcrBased = false,
  updateParent
}: D0PlanContainProps) {
  const authContext = useAuth();
  const user = authContext?.user;
  
  const toastContext = useToast();
  const addToast = toastContext?.addToast || ((msg: string, type: string) => console.log(`[Toast ${type}] ${msg}`));

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'team'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState(defaultDepartments);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  const userRole = user?.role?.toUpperCase() || '';
  const isInitiator = userRole === 'INITIATOR' || userRole === 'MASTER' || userRole === 'ADMIN';
  const isHOD = userRole === 'HOD' || userRole === 'MASTER' || userRole === 'ADMIN';
  const isAdmin = userRole === 'ADMIN' || userRole === 'MASTER';

  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateForInput = (value: any): string => {
    if (!value) return getTodayDate();
    if (typeof value === "string") {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const parsedDate = new Date(value);
    if (isNaN(parsedDate.getTime())) return getTodayDate();
    
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<D0FormData>({
    eventNo: eventId || '',
    plantLine: '',
    partName: '',
    lotSerial: '',
    defectCode: '',
    dateDiscovered: getTodayDate(),
    reportedBy: '',
    personName: '',
    department: '',
    companyName: '',
    companyLogo: '',
    contactPerson: '',
    phone: '',
    email: '',
    teamMembers: [],
    countryCode: '+91',
    pictures: [],
    reports: [],
    videos: [],
    status: 'draft',
    currentStep: 'd0',
    isNcrBased: initialIsNcrBased,
    sourceType: initialIsNcrBased ? 'ncr' : 'fresh',
  });

  const isNcrBased8D = Boolean(
    initialIsNcrBased ||
    formData.isNcrBased ||
    formData.sourceType === 'ncr' ||
    formData.sourceNcrId ||
    formData.sourceNcrNumber ||
    String(eventId || formData.eventNo || '').startsWith('8D-')
  );

  const effectiveReportedBy = isNcrBased8D ? 'self' : formData.reportedBy;

  useEffect(() => {
    loadUsersAndDepartments();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        if (!eightDAPI || typeof eightDAPI.getById !== 'function') {
          console.warn('eightDAPI is not available. Check your services/api exports.');
          setLoading(false);
          return;
        }

        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d0?.[0]) {
          const d0Data = response.data.content.d0[0];
          
          let teamMembers: TeamMember[] = [];
          if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers) && d0Data.teamMembers.length > 0) {
            teamMembers = d0Data.teamMembers;
          } else if (d0Data.additionalEmails && Array.isArray(d0Data.additionalEmails)) {
            teamMembers = await convertEmailsToTeamMembers(d0Data.additionalEmails);
          }

          const loadedIsNcrBased = Boolean(
            d0Data.sourceNcrId || d0Data.sourceNcrNumber || d0Data.isNcrBased ||
            d0Data.sourceType === 'ncr' || String(eventId || d0Data.eventNo || '').startsWith('8D-')
          );

          setFormData({
            ...d0Data,
            dateDiscovered: normalizeDateForInput(d0Data.dateDiscovered),
            reportedBy: loadedIsNcrBased ? 'self' : (d0Data.reportedBy || ''),
            teamMembers,
            status: response.data.status || 'draft',
            currentStep: response.data.currentStep || 'd0',
            pictures: Array.isArray(d0Data.pictures) ? d0Data.pictures : [],
            reports: Array.isArray(d0Data.reports) ? d0Data.reports : [],
            videos: Array.isArray(d0Data.videos) ? d0Data.videos : [],
            isNcrBased: loadedIsNcrBased,
            sourceType: loadedIsNcrBased ? 'ncr' : (d0Data.sourceType || 'fresh'),
          });
        }
      } catch (error) {
        console.error('Error fetching D0 data:', error);
        addToast('Failed to load D0 data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const loadUsersAndDepartments = async () => {
    try {
      setLoadingUsers(true);
      let users: any[] = [];
      
      if (userAPI && typeof (userAPI as any).getAllUsers === 'function') {
        users = await (userAPI as any).getAllUsers();
      } else {
        // FIX 2: Using dynamic API_BASE_URL
        const response = await fetch(`${API_BASE_URL}/api/users/all`, {
          headers: { 'Authorization': `Bearer ${user?.token}` },
        });
        if (response.ok) users = await response.json();
      }
      
      if (users && Array.isArray(users)) {
        setAllUsers(users);
        setDepartments(extractDepartmentsFromUsers(users));
      } else {
        setDepartments(defaultDepartments);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setDepartments(defaultDepartments);
    } finally {
      setLoadingUsers(false);
    }
  };

  const extractDepartmentsFromUsers = (users: any[]) => {
    if (!users || !Array.isArray(users) || users.length === 0) return defaultDepartments;
    const departmentSet = new Set();
    const departmentsList: { id: string; name: string }[] = [];
    
    users.forEach((u: any) => {
      if (u.department && u.department.trim() && !departmentSet.has(u.department)) {
        departmentSet.add(u.department);
        departmentsList.push({ id: `dept_${departmentsList.length + 1}`, name: u.department });
      }
    });

    if (departmentsList.length === 0) return defaultDepartments;
    if (!departmentSet.has('Other')) {
      departmentsList.push({ id: `dept_${departmentsList.length + 1}`, name: 'Other' });
    }
    return departmentsList;
  };

  const convertEmailsToTeamMembers = async (emails: string[]): Promise<TeamMember[]> => {
    const teamMembers: TeamMember[] = [];
    for (const email of emails) {
      if (email && email.trim()) {
        const userData = findUserByEmailOrUsername(email.trim());
        teamMembers.push({
          firstName: userData?.firstName || '',
          lastName: userData?.lastName || '',
          department: userData?.department || '',
          email: email.trim(),
          username: userData?.username || '',
          isExternal: !userData,
        });
      }
    }
    return teamMembers;
  };

  const findUserByEmailOrUsername = (searchTerm: string): any | null => {
    if (!searchTerm || !allUsers.length) return null;
    return allUsers.find((u: any) => {
      const emailMatch = u.email?.toLowerCase() === searchTerm.toLowerCase();
      const usernameMatch = u.username?.toLowerCase() === searchTerm.toLowerCase();
      return emailMatch || usernameMatch;
    }) || null;
  };

  useEffect(() => {
    if (userSearchTerm.length > 1) {
      const filtered = allUsers.filter((u: any) => {
        const searchLower = userSearchTerm.toLowerCase();
        return u.email?.toLowerCase().includes(searchLower) || 
               u.username?.toLowerCase().includes(searchLower) || 
               `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(searchLower);
      });
      setFilteredUsers(filtered);
      setShowUserDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowUserDropdown(false);
    }
  }, [userSearchTerm, allUsers]);

  const handleUserSelect = (selectedUser: any, index: number) => {
    const newMembers = [...formData.teamMembers];
    newMembers[index] = {
      ...newMembers[index],
      firstName: selectedUser.firstName || '',
      lastName: selectedUser.lastName || '',
      email: selectedUser.email || '',
      department: selectedUser.department || '',
      username: selectedUser.username || '',
      isExternal: false,
    };
    setFormData({ ...formData, teamMembers: newMembers });
    setUserSearchTerm('');
    setShowUserDropdown(false);
    setSelectedUserIndex(null);
    
    if (errors[`teamMember_${index}_email`]) {
      const newErrors = { ...errors };
      delete newErrors[`teamMember_${index}_email`];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const requiredFields = ['eventNo', 'plantLine', 'partName', 'defectCode'];

    requiredFields.forEach(field => {
      if (!formData[field as keyof D0FormData]?.toString().trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    if (!Array.isArray(formData.pictures) || formData.pictures.length === 0) {
      newErrors.pictures = 'At least one picture is required.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email format';
    }

    formData.teamMembers.forEach((member, idx) => {
      if (!member.email || !member.email.trim()) {
        newErrors[`teamMember_${idx}_email`] = 'Email is required for team members';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())) {
        newErrors[`teamMember_${idx}_email`] = 'Invalid email format';
      } else if (!member.firstName?.trim() || !member.lastName?.trim()) {
        newErrors[`teamMember_${idx}_email`] = 'Please fill in first and last name';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!isInitiator && !isAdmin) {
      addToast('Only initiators or admins can submit D0 forms.', 'error');
      return;
    }
    if (!validateForm()) {
      addToast('Please fix the errors before submitting.', 'error');
      return;
    }

    setLoading(true);
    setSubmitted(true);

    try {
      const teamEmails = formData.teamMembers
        .map((member) => member.email?.trim())
        .filter((email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      const submittedStatus = formData.status === 'in progress' ? 'in progress' : 'approval pending';

      const jsonPayload = {
        ...formData,
        reportedBy: isNcrBased8D ? 'self' : formData.reportedBy,
        additionalEmails: teamEmails,
        status: submittedStatus,
        currentStep: 'd0',
        isNcrBased: isNcrBased8D,
        sourceType: isNcrBased8D ? 'ncr' : 'fresh',
        submittedBy: user?.email || '',
        submittedAt: new Date().toISOString(),
        entry_type: '8D_D0_FORM',
        content: {
          d0: [{
            ...formData,
            reportedBy: isNcrBased8D ? 'self' : formData.reportedBy,
            isNcrBased: isNcrBased8D,
            sourceType: isNcrBased8D ? 'ncr' : 'fresh',
            teamMembers: formData.teamMembers,
            additionalEmails: teamEmails
          }]
        }
      };

      const formDataToSend = new FormData();
      formDataToSend.append('jsonContent', JSON.stringify(jsonPayload));

      const allFiles = [
        ...(Array.isArray(formData.pictures) ? formData.pictures.filter((pic: any) => pic.file) : []),
        ...(Array.isArray(formData.reports) ? formData.reports.filter((rep: any) => rep.file) : []),
        ...(Array.isArray(formData.videos) ? formData.videos.filter((vid: any) => vid.file) : [])
      ];

      allFiles.forEach((fileObj: any) => {
        if (fileObj.file) {
          formDataToSend.append('files', {
            uri: fileObj.uri,
            name: fileObj.name,
            type: fileObj.type,
          } as any);
        }
      });

      let res;
      if (!eightDAPI) throw new Error('eightDAPI is not available');
      
      if (eventId) {
        res = await eightDAPI.update(eventId, formDataToSend);
      } else {
        res = await eightDAPI.create(formDataToSend);
      }

      if (res?.success) {
        addToast('D0 form submitted successfully!', 'success');
        await createForumGroup(teamEmails);

        const newStatus = 'approval pending';
        const updatedData = { ...formData, status: newStatus, currentStep: 'd0', id: res.data?.id || eventId };
        setFormData(updatedData);

        if (updateParent) updateParent([updatedData]);
      }
    } catch (error: any) {
      console.error('D0 Submit Error:', error);
      addToast(error?.response?.data?.error || 'Failed to save form', 'error');
    } finally {
      setLoading(false);
      setSubmitted(false);
    }
  };

  const createForumGroup = async (teamEmails: string[]) => {
    try {
      const primaryEmail = formData.email?.trim();
      const allMembers = [...new Set([primaryEmail, ...teamEmails].filter(Boolean))];
      const isAuthorized = userRole === 'MASTER' || userRole === 'ADMIN' || userRole === 'INITIATOR';
      
      if (allMembers.length > 0 && user?.email && isAuthorized) {
        await fetch(`${API_BASE_URL}/api/forum/8d/groups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            groupId: formData.eventNo,
            groupName: `8D Event: ${formData.eventNo}`,
            description: `Defect: ${formData.defectCode} | Part: ${formData.partName}`,
            createdBy: user.email,
            members: allMembers
          })
        });
      }
    } catch (error) {
      console.log('⚠️ Forum group creation note:', error);
    }
  };

  const handleApprove = async (): Promise<void> => {
    if (!eventId || !eightDAPI) return;
    try {
      setLoading(true);
      const res = await eightDAPI.approve(eventId, { userEmail: user?.email || '' });
      if (res?.success) {
        const updatedFormData = { ...formData, status: 'in progress', currentStep: 'd1' };
        setFormData(updatedFormData);
        if (updateParent) updateParent([updatedFormData]);
        addToast('Document approved! Proceeding to D1.', 'success');
      }
    } catch (error: any) {
      addToast('Approval failed: ' + (error?.response?.data?.error || error?.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!eventId || !eightDAPI) return;
    try {
      setLoading(true);
      const res = await eightDAPI.reject(eventId, { userEmail: user?.email || '' });
      if (res?.success) {
        const updatedFormData = { ...formData, status: 'rejected', currentStep: 'd0' };
        setFormData(updatedFormData);
        if (updateParent) updateParent([updatedFormData]);
        addToast('Document rejected.', 'error');
      }
    } catch (error: any) {
      addToast('Rejection failed: ' + (error?.response?.data?.error || error?.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = (): void => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { firstName: '', lastName: '', email: '', department: '', isExternal: true }]
    }));
  };

  const updateTeamMember = (index: number, field: keyof TeamMember, value: string | boolean): void => {
    const newMembers = [...formData.teamMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, teamMembers: newMembers });
    
    if (errors[`teamMember_${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`teamMember_${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const removeTeamMember = (index: number): void => {
    const newMembers = formData.teamMembers.filter((_, i) => i !== index);
    setFormData({ ...formData, teamMembers: newMembers });
    
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`teamMember_${index}_`)) delete newErrors[key];
    });
    setErrors(newErrors);
  };

  // FIX 4: Use expo-document-picker API
   const handleFileUpload = async (type: 'image' | 'pdf' | 'video'): Promise<void> => {
    try {
      let mimeType = '*/*';
      if (type === 'image') mimeType = 'image/*';
      if (type === 'pdf') mimeType = 'application/pdf';
      if (type === 'video') mimeType = 'video/*';

      const result = await DocumentPicker.getDocumentAsync({
        type: mimeType,
        multiple: true,
      });

      if (result.canceled) return;

      const newFiles = result.assets.map((asset: any) => ({
        id: null,
        name: asset.name || 'Untitled',
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        title: asset.name || 'Untitled',
        description: '',
        file: asset,
        uri: asset.uri,
      }));

      const key = type === 'image' ? 'pictures' : type === 'pdf' ? 'reports' : 'videos';
      
      setFormData(prev => {
        // 1. Safely extract the current array
        const currentFiles = prev[key as keyof D0FormData];
        const safeFiles = Array.isArray(currentFiles) ? currentFiles : [];
        
        // 2. Return the updated state cleanly
        return {
          ...prev,
          [key]: [...safeFiles, ...newFiles],
        } as D0FormData; // Satisfies TypeScript's strict state updater requirements
      });

    } catch (err: any) {
      console.error('File picker error:', err);
      addToast('Failed to pick file.', 'error');
    }
  };
  const removeFile = (index: number, type: 'image' | 'pdf' | 'video'): void => {
    const key = type === 'image' ? 'pictures' : type === 'pdf' ? 'reports' : 'videos';
    setFormData(prev => {
      const arr = Array.isArray(prev[key as keyof D0FormData]) ? prev[key as keyof D0FormData] : [];
      const updatedFiles = [...(arr as any[])];
      updatedFiles.splice(index, 1);
      return { ...prev, [key]: updatedFiles };
    });
  };

  const renderTeamMember = (member: TeamMember, index: number) => {
    const isSearching = selectedUserIndex === index;
    return (
      <View key={index} style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberHeaderText}>Team Member {index + 1}</Text>
          <TouchableOpacity onPress={() => removeTeamMember(index)}>
            <Icon name="trash-2" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.memberRow}>
          <View style={styles.memberField}>
            <Text style={styles.memberLabel}>First Name</Text>
            <TextInput style={styles.memberInput} value={member.firstName} onChangeText={(text) => updateTeamMember(index, 'firstName', text)} placeholder="First name" />
          </View>
          <View style={styles.memberField}>
            <Text style={styles.memberLabel}>Last Name</Text>
            <TextInput style={styles.memberInput} value={member.lastName} onChangeText={(text) => updateTeamMember(index, 'lastName', text)} placeholder="Last name" />
          </View>
        </View>
        <View style={styles.memberRow}>
          <View style={[styles.memberField, { flex: 2 }]}>
            <Text style={styles.memberLabel}>Email / Username <Text style={styles.required}>*</Text></Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.memberInput, styles.searchInput, errors[`teamMember_${index}_email`] && styles.inputError]}
                value={member.email}
                onChangeText={(text) => { updateTeamMember(index, 'email', text); setUserSearchTerm(text); setSelectedUserIndex(index); }}
                onFocus={() => { setSelectedUserIndex(index); if (member.email && member.email.length > 1) setUserSearchTerm(member.email); }}
                placeholder="Search or enter email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isSearching && showUserDropdown && filteredUsers.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id || item.email}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.dropdownItem} onPress={() => handleUserSelect(item, index)}>
                        <Text style={styles.dropdownName}>{item.firstName} {item.lastName}</Text>
                        <Text style={styles.dropdownEmail}>{item.email}</Text>
                        <Text style={styles.dropdownDept}>{item.department}</Text>
                      </TouchableOpacity>
                    )}
                    style={styles.dropdownList}
                  />
                </View>
              )}
            </View>
            {errors[`teamMember_${index}_email`] && <Text style={styles.errorText}>{errors[`teamMember_${index}_email`]}</Text>}
          </View>
        </View>
        <View style={styles.memberRow}>
          <View style={[styles.memberField, { flex: 2 }]}>
            <Text style={styles.memberLabel}>Department</Text>
            <View style={[styles.pickerWrapper, styles.memberInput]}>
              <Picker selectedValue={member.department} onValueChange={(value) => updateTeamMember(index, 'department', value)} style={styles.picker}>
                <Picker.Item label="Select Department" value="" />
                {departments.map((dept) => <Picker.Item key={dept.id} label={dept.name} value={dept.name} />)}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !submitted) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D0 data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="users" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D0 – Plan & Contain</Text>
          {eventId && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{eventId}</Text></View>}
        </View>
        {formData.status !== 'draft' && (
          <View style={[styles.statusBadge, formData.status === 'approval pending' && styles.statusPending, formData.status === 'in progress' && styles.statusProgress, formData.status === 'rejected' && styles.statusRejected]}>
            <Text style={styles.statusBadgeText}>{formData.status}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'basic' && styles.tabActive]} onPress={() => setActiveTab('basic')}>
          <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>Basic Information</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'team' && styles.tabActive]} onPress={() => setActiveTab('team')}>
          <Text style={[styles.tabText, activeTab === 'team' && styles.tabTextActive]}>Team Members & Files</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {activeTab === 'basic' ? (
          <View style={styles.basicInfo}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Event No. <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, errors.eventNo && styles.inputError]} value={formData.eventNo} onChangeText={(text) => setFormData({...formData, eventNo: text})} placeholder="Enter Event No" />
              {errors.eventNo && <Text style={styles.errorText}>{errors.eventNo}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Plant / Line <Text style={styles.required}>*</Text></Text>
              <View style={[styles.pickerWrapper, errors.plantLine && styles.inputError]}>
                <Picker selectedValue={formData.plantLine} onValueChange={(value) => setFormData({...formData, plantLine: value})} style={styles.picker}>
                  <Picker.Item label="Select Plant Line" value="" />
                  <Picker.Item label="Pune Plant – Threading Line 1" value="Pune Plant – Threading Line 1" />
                  <Picker.Item label="Pune Plant – Threading Line 2" value="Pune Plant – Threading Line 2" />
                </Picker>
              </View>
              {errors.plantLine && <Text style={styles.errorText}>{errors.plantLine}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Part No. / Name <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, errors.partName && styles.inputError]} value={formData.partName} onChangeText={(text) => setFormData({...formData, partName: text})} placeholder="Enter Part Name" />
              {errors.partName && <Text style={styles.errorText}>{errors.partName}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Lot / Serial(s)</Text>
              <TextInput style={[styles.input, styles.textArea]} value={formData.lotSerial} onChangeText={(text) => setFormData({...formData, lotSerial: text})} placeholder="Enter Lot / Serial numbers" multiline numberOfLines={2} textAlignVertical="top" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Defect Code / Type <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, errors.defectCode && styles.inputError]} value={formData.defectCode} onChangeText={(text) => setFormData({...formData, defectCode: text})} placeholder="Enter Defect Code" />
              {errors.defectCode && <Text style={styles.errorText}>{errors.defectCode}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date Discovered</Text>
              <TextInput style={styles.input} value={formData.dateDiscovered} onChangeText={(text) => setFormData({...formData, dateDiscovered: text})} placeholder="YYYY-MM-DD" />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reported By <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {['customer', 'self'].map((option) => (
                  <TouchableOpacity key={option} style={[styles.radioOption, formData.reportedBy === option && styles.radioOptionActive]} onPress={() => setFormData({...formData, reportedBy: option})} disabled={isNcrBased8D}>
                    <View style={[styles.radioCircle, formData.reportedBy === option && styles.radioCircleActive]}>
                      {formData.reportedBy === option && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioText}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {effectiveReportedBy === 'self' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Person Name</Text>
                  <TextInput style={styles.input} value={formData.personName} onChangeText={(text) => setFormData({...formData, personName: text})} placeholder="Enter Person Name" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Department</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={formData.department} onValueChange={(value) => setFormData({...formData, department: value})} style={styles.picker}>
                      <Picker.Item label="Select Department" value="" />
                      {departments.map((dept) => <Picker.Item key={dept.id} label={dept.name} value={dept.name} />)}
                    </Picker>
                  </View>
                </View>
              </>
            )}

            {effectiveReportedBy === 'customer' && !isNcrBased8D && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Company</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker selectedValue={formData.companyName} onValueChange={(value) => { const selected = companies.find(c => c.name === value); setFormData({ ...formData, companyName: value, companyLogo: selected?.logo || "" }); }} style={styles.picker}>
                      <Picker.Item label="Select a Company" value="" />
                      {companies.map((c) => <Picker.Item key={c.name} label={c.name} value={c.name} />)}
                    </Picker>
                  </View>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Contact Person</Text>
                  <TextInput style={styles.input} value={formData.contactPerson} onChangeText={(text) => setFormData({...formData, contactPerson: text})} placeholder="Enter Contact Person" />
                </View>
              </>
            )}

            {(effectiveReportedBy === 'self' || effectiveReportedBy === 'customer') && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput style={styles.input} value={formData.phone} onChangeText={(text) => setFormData({...formData, phone: text})} placeholder="Enter Phone Number" keyboardType="phone-pad" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Primary Email</Text>
                  <TextInput style={[styles.input, errors.email && styles.inputError]} value={formData.email} onChangeText={(text) => setFormData({...formData, email: text})} placeholder="Enter Primary Email" keyboardType="email-address" autoCapitalize="none" />
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.continueButton} onPress={() => setActiveTab('team')}>
              <Text style={styles.continueButtonText}>Continue to Team & Files</Text>
              <Icon name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.teamInfo}>
            <View style={styles.fieldGroup}>
              <View style={styles.teamHeader}>
                <Text style={styles.label}>Team Members</Text>
                <TouchableOpacity style={styles.addMemberButton} onPress={addTeamMember}>
                  <Icon name="user-plus" size={16} color="#3B82F6" />
                  <Text style={styles.addMemberText}>Add Member</Text>
                </TouchableOpacity>
              </View>

              {loadingUsers ? (
                <View style={styles.loadingUsersContainer}>
                  <ActivityIndicator size="small" color="#2242a1" />
                  <Text style={styles.loadingUsersText}>Loading users...</Text>
                </View>
              ) : (
                formData.teamMembers.map((member, index) => renderTeamMember(member, index))
              )}

              {formData.teamMembers.length === 0 && !loadingUsers && (
                <View style={styles.emptyMembers}>
                  <Icon name="users" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyMembersText}>No team members added yet</Text>
                  <TouchableOpacity onPress={addTeamMember}><Text style={styles.emptyMembersLink}>Add first team member</Text></TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Pictures <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileUpload('image')}>
                <Icon name="camera" size={20} color="#6B7280" />
                <Text style={styles.uploadText}>Upload Pictures</Text>
              </TouchableOpacity>
              {errors.pictures && <Text style={styles.errorText}>{errors.pictures}</Text>}
              {Array.isArray(formData.pictures) && formData.pictures.length > 0 && (
                <View style={styles.filePreviewContainer}>
                  {formData.pictures.map((pic: any, idx) => (
                    <View key={idx} style={styles.filePreview}>
                      {/* FIX 3: Safe Image Source */}
                      {pic.uri ? (
                        <Image source={{ uri: pic.uri }} style={styles.filePreviewImage} />
                      ) : (
                        <Icon name="image" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                      )}
                      <Text style={styles.filePreviewText} numberOfLines={1}>{pic.title || pic.name || `Image ${idx + 1}`}</Text>
                      <TouchableOpacity onPress={() => removeFile(idx, 'image')}><Icon name="x" size={16} color="#EF4444" /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reports (PDFs)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileUpload('pdf')}>
                <Icon name="file" size={20} color="#6B7280" />
                <Text style={styles.uploadText}>Upload Reports</Text>
              </TouchableOpacity>
              {Array.isArray(formData.reports) && formData.reports.length > 0 && (
                <View style={styles.filePreviewContainer}>
                  {formData.reports.map((rep: any, idx) => (
                    <View key={idx} style={styles.filePreview}>
                      <Icon name="file-text" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                      <Text style={styles.filePreviewText} numberOfLines={1}>{rep.title || rep.name || `Report ${idx + 1}`}</Text>
                      <TouchableOpacity onPress={() => removeFile(idx, 'pdf')}><Icon name="x" size={16} color="#EF4444" /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Videos</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileUpload('video')}>
                <Icon name="video" size={20} color="#6B7280" />
                <Text style={styles.uploadText}>Upload Videos</Text>
              </TouchableOpacity>
              {Array.isArray(formData.videos) && formData.videos.length > 0 && (
                <View style={styles.filePreviewContainer}>
                  {formData.videos.map((vid: any, idx) => (
                    <View key={idx} style={styles.filePreview}>
                      <Icon name="film" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                      <Text style={styles.filePreviewText} numberOfLines={1}>{vid.title || vid.name || `Video ${idx + 1}`}</Text>
                      <TouchableOpacity onPress={() => removeFile(idx, 'video')}><Icon name="x" size={16} color="#EF4444" /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {formData.status === 'draft' && (isInitiator || isAdmin) && (
              <TouchableOpacity style={[styles.submitButton, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <><Icon name="check-circle" size={16} color="#FFFFFF" /><Text style={styles.submitButtonText}>Submit for Approval</Text></>
                )}
              </TouchableOpacity>
            )}

            {formData.status === 'approval pending' && (isHOD || isAdmin) && (
              <View style={styles.approvalContainer}>
                <TouchableOpacity style={[styles.approvalButton, styles.approveButton]} onPress={handleApprove} disabled={loading}>
                  <Icon name="check" size={16} color="#FFFFFF" /><Text style={styles.approvalButtonText}>Approve & Move to D1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.approvalButton, styles.rejectButton]} onPress={handleReject} disabled={loading}>
                  <Icon name="x" size={16} color="#FFFFFF" /><Text style={styles.approvalButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {formData.status === 'in progress' && (
              <View style={styles.statusMessage}>
                <Icon name="check-circle" size={20} color="#10B981" />
                <Text style={styles.statusMessageText}>✓ D0 Approved & Locked - You can proceed to next steps</Text>
              </View>
            )}

            {formData.status === 'rejected' && (
              <View style={[styles.statusMessage, styles.statusMessageError]}>
                <Icon name="x-circle" size={20} color="#EF4444" />
                <Text style={[styles.statusMessageText, styles.statusMessageTextError]}>✗ D0 Rejected - Cannot proceed</Text>
              </View>
            )}
            
            {formData.status === 'approval pending' && !isHOD && !isAdmin && (
              <View style={[styles.statusMessage, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <ActivityIndicator size="small" color="#D97706" />
                <Text style={[styles.statusMessageText, { color: '#92400E' }]}>⏳ Awaiting HOD Approval</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#2242a1', borderTopWidth: 4, borderTopColor: '#EE161F' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: isMobile ? 16 : 20, fontWeight: '600', color: '#FFFFFF' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  headerBadgeText: { fontSize: 12, color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusProgress: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 12, fontWeight: '500', color: '#1F2937' },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#3B82F6' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: '#3B82F6' },
  formContent: { flex: 1, padding: 16 },
  basicInfo: { gap: 16 },
  teamInfo: { gap: 16 },
  fieldGroup: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  required: { color: '#EF4444' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937', backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  radioGroup: { flexDirection: 'row', gap: 16, marginTop: 4 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioOptionActive: { opacity: 1 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioCircleActive: { borderColor: '#3B82F6' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  radioText: { fontSize: 14, color: '#1F2937' },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  continueButtonText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addMemberButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addMemberText: { fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  memberCard: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  memberHeaderText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  memberRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  memberField: { flex: 1 },
  memberLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  memberInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: '#1F2937', backgroundColor: '#FFFFFF' },
  searchContainer: { position: 'relative', zIndex: 10 },
  searchInput: {},
  dropdownContainer: { position: 'absolute', top: 40, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, maxHeight: 200, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  dropdownList: { maxHeight: 200 },
  dropdownItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dropdownName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  dropdownEmail: { fontSize: 12, color: '#6B7280' },
  dropdownDept: { fontSize: 11, color: '#9CA3AF' },
  pickerWrapper: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  picker: { height: 40, width: '100%' },
  loadingUsersContainer: { padding: 20, alignItems: 'center' },
  loadingUsersText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
  emptyMembers: { padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8 },
  emptyMembersText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
  emptyMembersLink: { marginTop: 8, fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 8, paddingVertical: 16, justifyContent: 'center' },
  uploadText: { fontSize: 14, color: '#6B7280' },
  filePreviewContainer: { marginTop: 8, gap: 4 },
  filePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: '#F3F4F6', borderRadius: 6 },
  filePreviewImage: { width: 24, height: 24, borderRadius: 4, marginRight: 8 },
  filePreviewText: { fontSize: 13, color: '#1F2937', flex: 1 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#06B6D4', paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  submitDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  approvalContainer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approvalButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  approvalButtonText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  statusMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  statusMessageError: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  statusMessageText: { fontSize: 13, color: '#065F46', flex: 1 },
  statusMessageTextError: { color: '#991B1B' },
});