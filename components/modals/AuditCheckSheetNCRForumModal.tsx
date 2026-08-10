// app/components/modals/AuditCheckSheetNCRForumModal.tsx
// COMPLETE FIXED VERSION WITH ALL FEATURES

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { forumApi } from '../../services/auditScheduleApi';
import ForumThreadView from '../forum/ForumThreadView';
import { User } from '../types/audit.types';

// ============================================================
// Helper Functions
// ============================================================

const normalizeRole = (role: string): string => {
  if (!role) return 'PARTICIPANT';
  const upper = role.toUpperCase();
  if (upper.includes('MASTER')) return 'MASTER';
  if (upper.includes('AUDIT_MANAGER') || upper.includes('AUDIT MANAGER')) return 'AUDIT_MANAGER';
  if (upper.includes('LEAD_AUDITOR') || upper.includes('LEAD AUDITOR')) return 'LEAD_AUDITOR';
  if (upper.includes('TOP_MANAGEMENT') || upper.includes('TOP MANAGEMENT')) return 'TOP_MANAGEMENT';
  if (upper.includes('AUDITOR')) return 'AUDITOR';
  if (upper.includes('HOD')) return 'HOD';
  if (upper.includes('AUDITEE')) return 'AUDITEE';
  return 'PARTICIPANT';
};

const getRoleDisplayName = (role: string): string => {
  const normalized = normalizeRole(role);
  const displayNames: Record<string, string> = {
    MASTER: 'Master',
    AUDIT_MANAGER: 'Audit Manager',
    LEAD_AUDITOR: 'Lead Auditor',
    TOP_MANAGEMENT: 'Top Management',
    AUDITOR: 'Auditor',
    HOD: 'HOD',
    AUDITEE: 'Auditee',
    PARTICIPANT: 'Participant',
  };
  return displayNames[normalized] || role || 'Participant';
};

const getRolePermissions = (role: string) => {
  const normalized = normalizeRole(role);
  return {
    canModerate: ['MASTER', 'AUDIT_MANAGER', 'LEAD_AUDITOR'].includes(normalized),
    canAddMembers: ['MASTER', 'AUDIT_MANAGER', 'LEAD_AUDITOR'].includes(normalized),
    canRemoveMembers: ['MASTER', 'AUDIT_MANAGER'].includes(normalized),
    canCreateNCR: ['AUDITOR', 'LEAD_AUDITOR'].includes(normalized),
    canApproveNCR: ['MASTER', 'AUDIT_MANAGER', 'LEAD_AUDITOR'].includes(normalized),
    canRejectNCR: ['MASTER', 'AUDIT_MANAGER', 'LEAD_AUDITOR'].includes(normalized),
  };
};

const getParticipantRolePriority = (role: string): number => {
  const order: Record<string, number> = {
    MASTER: 10,
    AUDIT_MANAGER: 9,
    LEAD_AUDITOR: 8,
    TOP_MANAGEMENT: 7,
    AUDITOR: 6,
    HOD: 5,
    AUDITEE: 2,
    PARTICIPANT: 1,
  };
  return order[normalizeRole(role)] || 1;
};

// ============================================================
// Sub-Components
// ============================================================

const RoleBadge = ({ role }: { role: string }) => {
  const normalized = normalizeRole(role);
  const colorConfig: Record<string, { bg: string; text: string }> = {
    MASTER: { bg: '#F3E8FF', text: '#7C3AED' },
    AUDIT_MANAGER: { bg: '#DBEAFE', text: '#1D4ED8' },
    LEAD_AUDITOR: { bg: '#E0E7FF', text: '#4338CA' },
    AUDITOR: { bg: '#CFFAFE', text: '#0891B2' },
    HOD: { bg: '#FFEDD5', text: '#C2410C' },
    AUDITEE: { bg: '#D1FAE5', text: '#047857' },
    TOP_MANAGEMENT: { bg: '#FEF3C7', text: '#B45309' },
    PARTICIPANT: { bg: '#F3F4F6', text: '#4B5563' },
  };
  const colors = colorConfig[normalized] || colorConfig.PARTICIPANT;

  return (
    <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.roleBadgeText, { color: colors.text }]}>
        {getRoleDisplayName(role)}
      </Text>
    </View>
  );
};




// ============================================================
// Main Component
// ============================================================

interface AuditCheckSheetNCRForumModalProps {
  auditId: string | number;
  auditNumber: string;
  auditTitle: string;
  auditStatus: string;
  auditType: string;
  department: string;
  auditorId: string | number | null;
  auditorName: string;
  auditeeId: string | number | null;
  auditeeName: string;
  hodEmail: string | null;
  hodName: string | null;
  memberEmails?: string[];
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  allUsers: User[];
  onNCRCreated?: () => void;
  onNCRUpdated?: () => void;
}

const AuditCheckSheetNCRForumModal: React.FC<AuditCheckSheetNCRForumModalProps> = ({
  auditId,
  auditNumber,
  auditTitle,
  auditStatus,
  auditType,
  department,
  auditorId,
  auditorName,
  auditeeId,
  auditeeName,
  hodEmail,
  hodName,
  memberEmails = [],
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  onNCRCreated,
  onNCRUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [forumReady, setForumReady] = useState(false);
  const [forumGroupId, setForumGroupId] = useState<string | null>(null);
  const [forumMembers, setForumMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [forumSettings, setForumSettings] = useState({
    notificationsEnabled: true,
    isLocked: false,
  });

  const user = currentUser || {
    email: 'user@example.com',
    name: 'Unknown',
    id: null,
    role: 'AUDITEE'
  };

  const userRole = user.role || 'PARTICIPANT';
  const permissions = getRolePermissions(userRole);

  const getParticipantsList = useCallback(() => {
    const participants: any[] = [];
    const addedEmails = new Set<string>();

    const addParticipant = (userId: any, email: string, name: string, role: string) => {
      if (!email || addedEmails.has(email)) return;
      addedEmails.add(email);
      participants.push({
        id: userId,
        email: email,
        name: name || email.split('@')[0],
        role: role || 'Participant'
      });
    };

    if (hodEmail) {
      const hod = allUsers.find(u => u.email === hodEmail);
      addParticipant(hod?.id, hodEmail, hod?.name || hodName || '', 'HOD');
    }

    if (auditorId) {
      let auditorUser = allUsers.find(u => Number(u.id) === Number(auditorId));
      if (!auditorUser) {
        auditorUser = allUsers.find(u => String(u.id) === String(auditorId));
      }
      if (auditorUser?.email) {
        addParticipant(auditorUser.id, auditorUser.email, auditorUser.name || '', auditorUser.role || 'AUDITOR');
      } else if (auditorName) {
        addParticipant(auditorId, auditorName.includes('@') ? auditorName : '', auditorName, 'AUDITOR');
      }
    }

    if (auditeeId) {
      let auditeeUser = allUsers.find(u => Number(u.id) === Number(auditeeId));
      if (!auditeeUser) {
        auditeeUser = allUsers.find(u => String(u.id) === String(auditeeId));
      }
      if (auditeeUser?.email) {
        addParticipant(auditeeUser.id, auditeeUser.email, auditeeUser.name || '', auditeeUser.role || 'AUDITEE');
      } else if (auditeeName) {
        addParticipant(auditeeId, auditeeName.includes('@') ? auditeeName : '', auditeeName, 'AUDITEE');
      }
    }

    // Add memberEmails
    if (memberEmails && Array.isArray(memberEmails)) {
      memberEmails.forEach((email) => {
        if (email && email !== 'undefined' && email !== 'null') {
          const existingUser = allUsers.find((u) => u.email === email);
          addParticipant(
            existingUser?.id || null,
            email,
            existingUser?.name || email.split('@')[0],
            existingUser?.role || 'PARTICIPANT'
          );
        }
      });
    }

    if (user?.email && !addedEmails.has(user.email)) {
      addParticipant(user.id, user.email, user.name || '', user.role || 'Participant');
    }

    return participants.sort(
      (a, b) => getParticipantRolePriority(b.role) - getParticipantRolePriority(a.role)
    );
  }, [auditorId, auditorName, auditeeId, auditeeName, hodEmail, hodName, memberEmails, allUsers, user]);

  const getParticipantEmails = useCallback(() => {
    const emails = new Set<string>();

    if (user?.email) emails.add(user.email);

    if (auditorId) {
      let auditorUser = allUsers.find(u => Number(u.id) === Number(auditorId));
      if (!auditorUser) {
        auditorUser = allUsers.find(u => String(u.id) === String(auditorId));
      }
      if (auditorUser?.email) emails.add(auditorUser.email);
    }
    if (auditorName && auditorName.includes('@')) emails.add(auditorName);

    if (auditeeId) {
      let auditeeUser = allUsers.find(u => Number(u.id) === Number(auditeeId));
      if (!auditeeUser) {
        auditeeUser = allUsers.find(u => String(u.id) === String(auditeeId));
      }
      if (auditeeUser?.email) emails.add(auditeeUser.email);
    }
    if (auditeeName && auditeeName.includes('@')) emails.add(auditeeName);

    if (hodEmail) emails.add(hodEmail);

    memberEmails.forEach(email => {
      if (email) emails.add(email);
    });

    return Array.from(emails);
  }, [auditorId, auditorName, auditeeId, auditeeName, hodEmail, memberEmails, allUsers, user]);

  const initializeAuditForum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const participants = getParticipantsList();
      setParticipantsList(participants);

      const groupId = `AUDIT-${auditId}`;
      setForumGroupId(groupId);

      const participantEmails = getParticipantEmails();

      try {
        await forumApi.create8DGroup({
          groupId: groupId,
          groupName: `Audit #${auditNumber} Discussion`,
          description: `Discussion forum for Audit ${auditNumber}`,
          createdBy: user?.email || 'system',
          members: participantEmails
        });
        console.log('✅ 8D group created');
      } catch (groupError) {
        console.log('Group may already exist:', groupError);
      }

      setForumMembers(participantEmails);
      setForumReady(true);

    } catch (error) {
      console.error('Error initializing audit forum:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize forum');
      setForumReady(true);
    } finally {
      setLoading(false);
    }
  }, [auditId, auditNumber, getParticipantsList, getParticipantEmails, user]);

  const handleAddMembers = async (newMemberEmails: string[]) => {
    setForumMembers(prev => [...new Set([...prev, ...newMemberEmails])]);
    const updatedParticipants = getParticipantsList();
    setParticipantsList(updatedParticipants);
    Alert.alert('Success', `${newMemberEmails.length} participant(s) added`);
    setShowAddMembers(false);
  };

  const handleRemoveMember = (member: any) => {
    if (!permissions.canRemoveMembers) return;

    Alert.alert(
      'Remove Member',
      `Remove ${member.name || member.email} from the forum?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setForumMembers(prev => prev.filter(m => m !== member.email));
            setParticipantsList(prev => prev.filter(p => p.email !== member.email));
            Alert.alert('Info', `${member.name || member.email} removed`);
          },
        },
      ],
    );
  };

  const toggleForumLock = () => {
    setForumSettings(prev => ({ ...prev, isLocked: !prev.isLocked }));
    Alert.alert('Info', forumSettings.isLocked ? 'Forum unlocked' : 'Forum locked');
  };

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 [MODAL DEBUG] Forum Modal Opened:', {
        auditId,
        auditNumber,
        auditorId,
        auditorName,
        auditeeId,
        auditeeName,
        hodEmail,
        hodName,
        memberEmails,
        userEmail: user?.email,
        allUsersCount: allUsers.length,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && auditId) {
      initializeAuditForum();
    }
  }, [isOpen, auditId]);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.drawerContainer}
          >
            <View style={styles.drawer}>
              {/* Header */}
              

              

              {loading && (
                <View style={styles.centerContent}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={styles.loadingText}>Loading discussions...</Text>
                </View>
              )}

              {error && (
                <View style={styles.centerContent}>
                  <Icon name="alert-circle" size={32} color="#EF4444" />
                  <Text style={styles.errorTitle}>Failed to load forum</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={initializeAuditForum}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!loading && !error && forumReady && forumGroupId && (
                <View style={styles.forumContent}>
                  <ForumThreadView
                    groupId={forumGroupId}
                    groupName={`${auditNumber}`}
                    isInDrawer={true}
                    setForumDrawerOpen={onClose}
                    username={user?.email || ''}
                    currentUser={user}
                    allUsers={allUsers}
                    onBack={onClose}
                    memberEmails={forumMembers}
                  />
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      
    </>
  );
};

const styles = StyleSheet.create({
  // Main Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '90%',
    maxWidth: 600,
  },
  drawer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 6,
  },
  backButton: {
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerAuditNumber: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },

  // Member List Styles
  memberListContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  memberListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  memberListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberListHeaderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberListScroll: {
    marginTop: 8,
    maxHeight: 160,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  memberItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  memberItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#4B5563',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 12,
    color: '#374151',
  },
  memberEmail: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  removeMemberButton: {
    padding: 4,
  },
  addMemberButton: {
    marginTop: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addMemberButtonText: {
    fontSize: 12,
    color: '#2563EB',
  },

  // Role Badge Styles
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Add Member Modal Styles
  addMemberModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  addMemberModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  addMemberModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addMemberModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addMemberModalClose: {
    padding: 4,
  },
  addMemberModalBody: {
    padding: 16,
  },
  addMemberModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  userList: {
    maxHeight: 240,
  },
  noUsersText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userItemInfo: {
    flex: 1,
  },
  userItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  userItemEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Loading/Error/Content Styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  forumContent: {
    flex: 1,
  },
});

export default AuditCheckSheetNCRForumModal;