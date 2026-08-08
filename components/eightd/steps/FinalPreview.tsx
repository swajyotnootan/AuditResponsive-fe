// app/components/eightd/steps/FinalPreview.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { eightDAPI } from '../../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

let FileSystem: any = null;
let Sharing: any = null;

if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
    Sharing = require('expo-sharing');
  } catch (e) {
    console.log('Native modules not available on this platform');
  }
}

const downloadAndShareFile = async (url: string, fileName: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return;
    }

    if (FileSystem && Sharing) {
      const fileUri = FileSystem.documentDirectory 
        ? FileSystem.documentDirectory + fileName 
        : FileSystem.cacheDirectory + fileName;
      
      const downloadResumable = FileSystem.createDownloadResumable(url, fileUri, {}, (downloadProgress: any) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        console.log(`Download progress: ${Math.round(progress * 100)}%`);
      });

      const result = await downloadResumable.downloadAsync();
      if (result?.uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

const StepIcons: Record<string, string> = {
  d0: 'file-text', d1: 'users', d2: 'file-text', d3: 'shield',
  d4: 'lightbulb', d5: 'clipboard', d6: 'calendar', d7: 'lightbulb', d8: 'user-check',
};

const stepTitles: Record<string, string> = {
  d0: 'D0 – Plan & Contain', d1: 'D1 – Form the Team', d2: 'D2 – Describe the Problem',
  d3: 'D3 – Interim Containment Actions', d4: 'D4 – Root Cause Analysis',
  d5: 'D5 – Permanent Corrective Actions', d6: 'D6 – Implement & Validate PCAs',
  d7: 'D7 – Prevent Recurrence', d8: 'D8 – Close & Recognize',
};

const stepFields: Record<string, any[]> = {
  d0: [
    { key: 'eventNo', label: 'Event ID' }, { key: 'plantLine', label: 'Plant / Line' },
    { key: 'partName', label: 'Part Name' }, { key: 'lotSerial', label: 'Lot / Serial' },
    { key: 'defectCode', label: 'Defect Code' }, { key: 'dateDiscovered', label: 'Date Discovered' },
    { key: 'reportedBy', label: 'Reported By' }, { key: 'personName', label: 'Person Name' },
    { key: 'department', label: 'Department' }, { key: 'companyName', label: 'Company' },
    { key: 'contactPerson', label: 'Contact Person' }, { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Primary Email' }, { key: 'additionalEmails', label: 'Team Members' },
  ],
  d1: [
    { key: 'eventId', label: 'Event ID' }, { key: 'teamLeader', label: 'Team Leader' },
    { key: 'dateFormed', label: 'Date Formed' }, { key: 'responsibilities', label: 'Team Responsibilities' },
    { key: 'suppliers', label: 'Suppliers' }, { key: 'customers', label: 'Customers' },
  ],
  d2: [
    { key: 'eventId', label: 'Event ID' }, { key: 'problemStatement', label: 'Problem Statement' },
    { key: 'what', label: 'WHAT' }, { key: 'why', label: 'WHY' }, { key: 'where', label: 'WHERE' },
    { key: 'when', label: 'WHEN' }, { key: 'who', label: 'WHO' }, { key: 'how', label: 'HOW' },
    { key: 'howMuch', label: 'Impact (HOW MUCH)' },
  ],
  d3: [
    { key: 'eventId', label: 'Event ID' }, { key: 'problemStatement', label: 'Problem Statement' },
    { key: 'hasContainment', label: 'Containment Actions?' }, { key: 'actions', label: 'Containment Actions' },
  ],
  d4: [
    { key: 'eventId', label: 'Event ID' }, { key: 'rootCauseSummary', label: 'Root Cause Summary' },
    { key: 'businessProcessFlaws', label: 'Business Process Flaws?' }, { key: 'whyNotDetected', label: 'Why Not Detected?' },
  ],
  d5: [{ key: 'eventId', label: 'Event ID' }, { key: 'actions', label: 'Corrective Actions' }],
  d6: [
    { key: 'eventId', label: 'Event ID' }, { key: 'implementationDate', label: 'Implementation Date & Time' },
    { key: 'communicatedToStakeholders', label: 'Communicated to Stakeholders?' }, { key: 'notes', label: 'Notes / Comments' },
  ],
  d7: [
    { key: 'eventId', label: 'Event ID' }, { key: 'additionalMeasuresNeeded', label: 'Additional Measures Needed?' },
    { key: 'lessonsLearned', label: 'Lessons Learned' }, { key: 'proceduresUpdated', label: 'Procedures Updated?' },
  ],
  d8: [
    { key: 'eventId', label: 'Event ID' }, { key: 'rewardDescription', label: 'Reward Description' },
    { key: 'additionalRecommendations', label: 'Additional Recommendations' },
    { key: 'teamLeaderName', label: 'Team Leader Name' }, { key: 'signatureDate', label: 'Signature Date & Time' },
  ],
};

const stepsOrder = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];

interface FinalPreviewProps {
  eventId?: string | null;
  isHOD?: boolean;
}

export default function FinalPreview({ eventId, isHOD = false }: FinalPreviewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [eventData, setEventData] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; fileName: string; mimeType: string } | null>(null);
  
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [tempTeamMembers, setTempTeamMembers] = useState<any[]>([]);
  const [updatingMembers, setUpdatingMembers] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (memberError || memberSuccess) {
      const timer = setTimeout(() => {
        setMemberError(null);
        setMemberSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [memberError, memberSuccess]);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const eventIdString = String(eventId);
        const [eventRes, filesRes] = await Promise.all([
          eightDAPI.getById(eventIdString),
          eightDAPI.getFiles(eventIdString),
        ]);
        
        if (eventRes?.success && eventRes.data) {
          setEventData(eventRes.data);
          const d0Data = eventRes.data.content?.d0?.[0] || {};
          
          if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
            setTempTeamMembers([...d0Data.teamMembers]);
          } else if (Array.isArray(d0Data.additionalEmails)) {
            setTempTeamMembers(d0Data.additionalEmails.map((email: string) => ({
              email, firstName: '', lastName: '', department: '', isExternal: true
            })));
          } else {
            setTempTeamMembers([]);
          }
        }
        if (filesRes?.success && filesRes.data) {
          setFiles(filesRes.data);
        }
      } catch (error) {
        console.error('Error fetching final preview:', error);
        addToast('Failed to load preview data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const getEightDFileUrl = (fileId: string) => `http:///api/eightd/files/${fileId}`;

  const handleFileClick = async (fileId: string, mimeType: string, fileName: string) => {
    try {
      const blob = await eightDAPI.downloadFile(fileId);
      const url = URL.createObjectURL(blob);
      setPreviewFile({ url, fileName, mimeType });
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error fetching file:', error);
      addToast('Failed to load file', 'error');
    }
  };

  const handleDownloadFile = async () => {
    if (!previewFile) return;
    try {
      await downloadAndShareFile(previewFile.url, previewFile.fileName);
    } catch (error) {
      console.error('Error downloading file:', error);
      addToast('Failed to download file', 'error');
    }
  };

  const formatValue = (value: any): React.ReactNode => {
    if (value == null || value === '') return '—';
    if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) {
      try { return new Date(value).toLocaleString(); } catch { return value; }
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (value.every((item) => typeof item === 'string' && item.includes('@'))) {
        return value.map((email, idx) => (
          <View key={idx} style={styles.emailTag}><Text style={styles.emailTagText}>{email}</Text></View>
        ));
      }
      return value.join(', ');
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const startEditingTeamMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    const d0Data = eventData.content?.d0?.[0] || {};
    let currentMembers = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map((email: string) => ({
        email, firstName: '', lastName: '', department: '', isExternal: true
      }));
    }
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(true);
  };

  const addNewMemberField = () => {
    setTempTeamMembers(prev => [...prev, { firstName: '', lastName: '', email: '', department: '', isExternal: true, username: '' }]);
  };

  const removeMemberField = (index: number) => {
    setTempTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateMemberField = (index: number, field: string, value: any) => {
    const newMembers = [...tempTeamMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setTempTeamMembers(newMembers);
  };

  const saveTeamMembers = async () => {
    setMemberError(null);
    setMemberSuccess(null);
    try {
      setUpdatingMembers(true);
      const validMembers = tempTeamMembers
        .filter((member) => member.email && member.email.trim())
        .map((member) => ({
          ...member,
          email: member.email.trim(),
          firstName: member.firstName?.trim() || '',
          lastName: member.lastName?.trim() || '',
          department: member.department?.trim() || '',
          isExternal: member.isExternal || true,
        }));

      const invalidEmails = validMembers.filter((member) => !isValidEmail(member.email));
      if (invalidEmails.length > 0) {
        setMemberError(`Invalid email format: ${invalidEmails.map(m => m.email).join(', ')}`);
        return;
      }

      const emails = validMembers.map((m) => m.email);
      if ([...new Set(emails)].length !== emails.length) {
        setMemberError('Duplicate email addresses found. Please remove duplicates.');
        return;
      }

      if (validMembers.length === 0) {
        setMemberError('Please add at least one team member with a valid email');
        return;
      }

      const updatedD0Data = {
        ...eventData.content?.d0?.[0],
        teamMembers: validMembers,
        additionalEmails: validMembers.map((member) => member.email),
      };

      const formDataToSend = new FormData();
      const jsonPayload = {
        content: {
          ...eventData.content,
          d0: [updatedD0Data],
        },
      };
      formDataToSend.append('jsonContent', JSON.stringify(jsonPayload));

      const res = await eightDAPI.update(String(eventId), formDataToSend);

      if (res?.success) {
        setEventData((prev: any) => ({
          ...prev,
          content: { ...prev.content, d0: [updatedD0Data] },
        }));
        setMemberSuccess('✅ Team members updated successfully!');
        setIsEditingMembers(false);
      } else {
        throw new Error(res?.error || 'Failed to update team members');
      }
    } catch (error: any) {
      console.error('Failed to update team members:', error);
      setMemberError(`❌ Failed to update: ${error?.message || 'Unknown error'}`);
    } finally {
      setUpdatingMembers(false);
    }
  };

  const cancelEditingMembers = () => {
    setMemberError(null);
    setMemberSuccess(null);
    const d0Data = eventData.content?.d0?.[0] || {};
    let currentMembers = [];
    if (d0Data.teamMembers && Array.isArray(d0Data.teamMembers)) {
      currentMembers = [...d0Data.teamMembers];
    } else if (Array.isArray(d0Data.additionalEmails)) {
      currentMembers = d0Data.additionalEmails.map((email: string) => ({
        email, firstName: '', lastName: '', department: '', isExternal: true
      }));
    }
    setTempTeamMembers(currentMembers);
    setIsEditingMembers(false);
  };

  const handleApprove = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10) return;
    if (!eventId) { addToast('Event ID is required', 'error'); return; }

    try {
      setApproving(true);
      const res = await eightDAPI.approve(String(eventId), {
        userEmail: user?.email || '',
        comment: approvalComment.trim(),
      });
      if (res?.success) {
        addToast('✅ Document approved successfully!', 'success');
        setApprovalComment('');
        const response = await eightDAPI.getById(String(eventId));
        if (response?.success && response.data) setEventData(response.data);
      }
    } catch (error: any) {
      addToast('Approval failed: ' + (error?.response?.data?.error || error?.message), 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!isHOD || !approvalComment.trim() || approvalComment.trim().length < 10) return;
    if (!eventId) { addToast('Event ID is required', 'error'); return; }

    try {
      setRejecting(true);
      const res = await eightDAPI.reject(String(eventId), {
        userEmail: user?.email || '',
        comment: approvalComment.trim(),
      });
      if (res?.success) {
        addToast('❌ Document rejected successfully!', 'error');
        setApprovalComment('');
        const response = await eightDAPI.getById(String(eventId));
        if (response?.success && response.data) setEventData(response.data);
      }
    } catch (error: any) {
      addToast('Rejection failed: ' + (error?.response?.data?.error || error?.message), 'error');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  }

  if (!eventData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available for this event.</Text>
      </View>
    );
  }

  const isApprovalPending = eventData.status?.toLowerCase() === 'approval pending';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="award" size={32} color="#2242a1" />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>8D Report - Preview</Text>
            <Text style={styles.headerSubtitle}>Event ID: <Text style={styles.headerEventId}>{eventId}</Text></Text>
          </View>
        </View>

        {memberError && (
          <View style={[styles.messageContainer, styles.messageError]}>
            <Icon name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.messageErrorText}>{memberError}</Text>
          </View>
        )}
        {memberSuccess && (
          <View style={[styles.messageContainer, styles.messageSuccess]}>
            <Icon name="check-circle" size={16} color="#059669" />
            <Text style={styles.messageSuccessText}>{memberSuccess}</Text>
          </View>
        )}

        {stepsOrder.map((stepKey) => {
          const stepData = eventData.content?.[stepKey]?.[0] || {};
          const stepFiles = files.filter((file) => file.formType === stepKey);
          const iconName = StepIcons[stepKey] || 'file-text';

          return (
            <View key={stepKey} style={styles.stepSection}>
              <View style={styles.stepHeader}>
                <Icon name={iconName} size={20} color="#4F46E5" />
                <Text style={styles.stepTitle}>{stepTitles[stepKey]}</Text>
              </View>

              <View style={styles.stepContent}>
                {stepFields[stepKey].map((field) => {
                  const value = stepData[field.key];

                  if (field.key === 'additionalEmails' && stepKey === 'd0') {
                    const teamMembersData = stepData.teamMembers || [];
                    const additionalEmailsData = stepData.additionalEmails || [];
                    const displayMembers = teamMembersData.length > 0 
                      ? teamMembersData 
                      : additionalEmailsData.map((email: string) => ({ email, isExternal: true }));

                    return (
                      <View key={field.key} style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>{field.label}:</Text>
                        <View style={styles.fieldValueContainer}>
                          {isEditingMembers ? (
                            <View style={styles.editMembersContainer}>
                              {tempTeamMembers.map((member, idx) => (
                                <View key={idx} style={styles.editMemberRow}>
                                  <View style={styles.editMemberInputs}>
                                    <View style={styles.editInputRow}>
                                      <TextInput style={[styles.editInput, { flex: 1 }]} value={member.firstName} onChangeText={(text) => updateMemberField(idx, 'firstName', text)} placeholder="First Name" placeholderTextColor="#9CA3AF" />
                                      <TextInput style={[styles.editInput, { flex: 1 }]} value={member.lastName} onChangeText={(text) => updateMemberField(idx, 'lastName', text)} placeholder="Last Name" placeholderTextColor="#9CA3AF" />
                                    </View>
                                    <TextInput
                                      style={[styles.editInput, styles.editInputEmail, member.email && !isValidEmail(member.email) && styles.inputError]}
                                      value={member.email}
                                      onChangeText={(text) => updateMemberField(idx, 'email', text)}
                                      placeholder="Email *"
                                      placeholderTextColor="#9CA3AF"
                                      keyboardType="email-address"
                                      autoCapitalize="none"
                                    />
                                    {member.email && !isValidEmail(member.email) && (
                                      <Text style={styles.errorText}>Invalid email format</Text>
                                    )}
                                    <TextInput style={styles.editInput} value={member.department} onChangeText={(text) => updateMemberField(idx, 'department', text)} placeholder="Department" placeholderTextColor="#9CA3AF" />
                                    
                                    <TouchableOpacity style={styles.checkboxRow} onPress={() => updateMemberField(idx, 'isExternal', !member.isExternal)}>
                                      <View style={[styles.checkbox, member.isExternal && styles.checkboxChecked]}>
                                        {member.isExternal && <Icon name="check" size={12} color="#FFFFFF" />}
                                      </View>
                                      <Text style={styles.checkboxLabel}>External team member (not in system)</Text>
                                    </TouchableOpacity>
                                  </View>
                                  <TouchableOpacity style={styles.removeMemberBtn} onPress={() => removeMemberField(idx)}>
                                    <Icon name="trash-2" size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                              
                              <View style={styles.editActions}>
                                <TouchableOpacity style={styles.addMemberBtn} onPress={addNewMemberField}>
                                  <Icon name="plus" size={16} color="#FFFFFF" />
                                  <Text style={styles.addMemberBtnText}>Add Member</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveMembersBtn, updatingMembers && styles.disabledBtn]} onPress={saveTeamMembers} disabled={updatingMembers || tempTeamMembers.some(m => !m.email || !isValidEmail(m.email))}>
                                  {updatingMembers ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveMembersBtnText}>Save Changes</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.cancelMembersBtn, updatingMembers && styles.disabledBtn]} onPress={cancelEditingMembers} disabled={updatingMembers}>
                                  <Text style={styles.cancelMembersBtnText}>Cancel</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.memberDisplayContainer}>
                              {displayMembers.length > 0 ? (
                                displayMembers.map((member: any, idx: number) => (
                                  <View key={idx} style={styles.memberCard}>
                                    <View style={styles.memberCardHeader}>
                                      <View style={styles.memberAvatar}>
                                        <Icon name="user" size={14} color="#3B82F6" />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>
                                          {member.firstName || member.lastName ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : 'Unnamed Member'}
                                        </Text>
                                        <Text style={styles.memberEmail}>{member.email}</Text>
                                      </View>
                                    </View>
                                    <View style={styles.memberCardDetails}>
                                      {member.department && <Text style={styles.memberDetailText}>Dept: {member.department}</Text>}
                                      <View style={[styles.memberStatusBadge, member.isExternal ? styles.memberExternal : styles.memberInternal]}>
                                        <Text style={[styles.memberStatusText, member.isExternal ? styles.memberExternalText : styles.memberInternalText]}>
                                          {member.isExternal ? 'External' : 'System User'}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                ))
                              ) : (
                                <View style={styles.noMembersContainer}>
                                  <Icon name="users" size={32} color="#9CA3AF" />
                                  <Text style={styles.noMembersText}>No team members added yet</Text>
                                </View>
                              )}
                              
                              {(isHOD || user?.role === 'INITIATOR' || user?.role === 'MASTER') && !isEditingMembers && (
                                <TouchableOpacity style={styles.manageMembersBtn} onPress={startEditingTeamMembers}>
                                  <Icon name="edit-2" size={14} color="#FFFFFF" />
                                  <Text style={styles.manageMembersBtnText}>Manage Team Members</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={field.key} style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>{field.label}:</Text>
                      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
                    </View>
                  );
                })}
              </View>

              {stepFiles.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  <Text style={styles.attachmentsLabel}>
                    <Icon name="paperclip" size={14} color="#6B7280" /> Attachments ({stepFiles.length})
                  </Text>
                  <View style={styles.attachmentsGrid}>
                    {stepFiles.map((file) => (
                      <TouchableOpacity key={file.id} style={styles.attachmentItem} onPress={() => handleFileClick(file.id, file.mimeType, file.fileName)}>
                        {file.fileType === 'IMAGE' ? (
                          <Image source={{ uri: getEightDFileUrl(file.id) }} style={styles.attachmentImage} />
                        ) : file.mimeType === 'application/pdf' ? (
                          <View style={[styles.attachmentIcon, styles.attachmentPdf]}><Icon name="file" size={24} color="#DC2626" /></View>
                        ) : (
                          <View style={[styles.attachmentIcon, styles.attachmentDoc]}><Icon name="file" size={24} color="#3B82F6" /></View>
                        )}
                        <Text style={styles.attachmentName} numberOfLines={1}>{file.fileName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* HOD APPROVAL SECTION */}
        {isHOD && isApprovalPending && (
          <View style={styles.approvalSection}>
            <View style={styles.approvalHeader}>
              <Icon name="eye" size={20} color="#D97706" />
              <Text style={styles.approvalTitle}>HOD Approval Required</Text>
            </View>
            <Text style={styles.approvalSubtext}>
              Please review D0 data above before approving or rejecting this 8D event.
              {'\n'}
              <Text style={styles.approvalNote}>Note: A comment of at least 10 characters is required.</Text>
            </Text>

            <View style={styles.approvalCommentContainer}>
              <Text style={styles.approvalCommentLabel}>Approval/Rejection Comment:</Text>
              <TextInput
                style={styles.approvalCommentInput}
                value={approvalComment}
                onChangeText={setApprovalComment}
                placeholder="Enter your comment for approval or rejection (min. 10 characters)..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.approvalActions}>
              <TouchableOpacity
                style={[styles.approveBtn, (approving || !approvalComment.trim() || approvalComment.trim().length < 10) && styles.disabledBtn]}
                onPress={handleApprove}
                disabled={approving || !approvalComment.trim() || approvalComment.trim().length < 10}
              >
                {approving ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <><Icon name="check" size={16} color="#FFFFFF" /><Text style={styles.approveBtnText}>Approve & Move to D1</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, (rejecting || !approvalComment.trim() || approvalComment.trim().length < 10) && styles.disabledBtn]}
                onPress={handleReject}
                disabled={rejecting || !approvalComment.trim() || approvalComment.trim().length < 10}
              >
                {rejecting ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <><Icon name="x" size={16} color="#FFFFFF" /><Text style={styles.rejectBtnText}>Reject</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* File Preview Modal */}
      <Modal visible={previewVisible} transparent={true} animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText} numberOfLines={1}>{previewFile?.fileName}</Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity onPress={handleDownloadFile} style={styles.modalHeaderBtn}>
                  <Icon name="download" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPreviewVisible(false)} style={styles.modalHeaderBtn}>
                  <Icon name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalBody}>
              {previewFile?.mimeType?.startsWith('image/') ? (
                <Image source={{ uri: previewFile.url }} style={styles.modalImage} resizeMode="contain" />
              ) : previewFile?.mimeType === 'application/pdf' ? (
                <View style={styles.pdfContainer}>
                  <Text style={styles.pdfText}>PDF Preview</Text>
                  <Text style={styles.pdfSubtext}>Tap download to view PDF</Text>
                  <TouchableOpacity style={styles.pdfDownloadBtn} onPress={handleDownloadFile}>
                    <Icon name="download" size={24} color="#3B82F6" />
                    <Text style={styles.pdfDownloadText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filePreviewContainer}>
                  <Icon name="file" size={48} color="#9CA3AF" />
                  <Text style={styles.filePreviewText}>Preview not available</Text>
                  <TouchableOpacity style={styles.filePreviewDownload} onPress={handleDownloadFile}>
                    <Text style={styles.filePreviewDownloadText}>Download File</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280' },
  header: { flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 16, gap: 12 },
  logoContainer: { padding: 8, backgroundColor: '#EEF2FF', borderRadius: 8 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: isMobile ? 18 : 24, fontWeight: 'bold', color: '#1F2937' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  headerEventId: { fontWeight: '600', color: '#2242a1' },
  messageContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, marginBottom: 12 },
  messageError: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  messageSuccess: { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' },
  messageErrorText: { flex: 1, fontSize: 13, color: '#991B1B' },
  messageSuccessText: { flex: 1, fontSize: 13, color: '#065F46' },
  stepSection: { marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stepTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  stepContent: { padding: 12 },
  fieldRow: { flexDirection: isMobile ? 'column' : 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', minWidth: isMobile ? undefined : 160, marginBottom: isMobile ? 4 : 0 },
  fieldValue: { flex: 1, fontSize: 13, color: '#1F2937' },
  fieldValueContainer: { flex: 1 },
  emailTag: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 4, marginBottom: 4, alignSelf: 'flex-start' },
  emailTagText: { fontSize: 12, color: '#1E40AF' },
  attachmentsContainer: { padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  attachmentsLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 8 },
  attachmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attachmentItem: { width: isMobile ? 100 : 120, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' },
  attachmentImage: { width: '100%', height: isMobile ? 80 : 96 },
  attachmentIcon: { width: '100%', height: isMobile ? 80 : 96, justifyContent: 'center', alignItems: 'center' },
  attachmentPdf: { backgroundColor: '#FEF2F2' },
  attachmentDoc: { backgroundColor: '#EFF6FF' },
  attachmentName: { fontSize: 10, padding: 4, textAlign: 'center', color: '#6B7280' },
  
  // Edit Members Styles
  editMembersContainer: { paddingVertical: 8 },
  editMemberRow: { flexDirection: 'row', marginBottom: 8, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'flex-start' },
  editMemberInputs: { flex: 1, gap: 8 },
  editInputRow: { flexDirection: 'row', gap: 8 },
  editInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1F2937', backgroundColor: '#FFFFFF' },
  editInputEmail: { borderColor: '#3B82F6' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: -4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  checkboxChecked: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkboxLabel: { fontSize: 13, color: '#4B5563' },
  removeMemberBtn: { padding: 4, marginTop: 4 },
  editActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addMemberBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  saveMembersBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  saveMembersBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  cancelMembersBtn: { backgroundColor: '#6B7280', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  cancelMembersBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
  disabledBtn: { opacity: 0.6 },
  
  // Member Display Styles
  memberDisplayContainer: { gap: 8 },
  memberCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  memberCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  memberEmail: { fontSize: 12, color: '#6B7280' },
  memberCardDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberDetailText: { fontSize: 12, color: '#6B7280' },
  memberStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  memberExternal: { backgroundColor: '#FEF3C7' },
  memberInternal: { backgroundColor: '#D1FAE5' },
  memberStatusText: { fontSize: 11, fontWeight: '600' },
  memberExternalText: { color: '#D97706' },
  memberInternalText: { color: '#059669' },
  noMembersContainer: { alignItems: 'center', paddingVertical: 16, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 8 },
  noMembersText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  manageMembersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, backgroundColor: '#3B82F6', borderRadius: 8 },
  manageMembersBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  
  // Approval Styles
  approvalSection: { marginTop: 16, padding: 16, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8 },
  approvalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  approvalTitle: { fontSize: 16, fontWeight: '600', color: '#92400E' },
  approvalSubtext: { fontSize: 13, color: '#78350F', marginBottom: 12 },
  approvalNote: { fontWeight: '600' },
  approvalCommentContainer: { marginBottom: 12 },
  approvalCommentLabel: { fontSize: 13, fontWeight: '600', color: '#78350F', marginBottom: 6 },
  approvalCommentInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 13, color: '#1F2937', minHeight: 80, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  approvalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  approveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  rejectBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 12, width: isMobile ? '95%' : '80%', maxWidth: 800, maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#1F2937' },
  modalHeaderText: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  modalHeaderActions: { flexDirection: 'row', gap: 12 },
  modalHeaderBtn: { padding: 4 },
  modalBody: { padding: 16, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: 400 },
  pdfContainer: { alignItems: 'center', padding: 20 },
  pdfText: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  pdfSubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  pdfDownloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#EFF6FF', borderRadius: 8 },
  pdfDownloadText: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },
  filePreviewContainer: { alignItems: 'center', padding: 20 },
  filePreviewText: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  filePreviewDownload: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#3B82F6', borderRadius: 8 },
  filePreviewDownloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});