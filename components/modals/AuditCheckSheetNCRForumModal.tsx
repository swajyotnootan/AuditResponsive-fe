// app/components/modals/AuditCheckSheetNCRForumModal.tsx
// COMPLETE FIXED VERSION

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

  const user = currentUser || {
    email: 'user@example.com',
    name: 'Unknown',
    id: null,
    role: 'AUDITEE'
  };

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
      const auditor = allUsers.find(u => Number(u.id) === Number(auditorId));
      if (auditor?.email) {
        addParticipant(auditor.id, auditor.email, auditor.name || '', 'AUDITOR');
      } else if (auditorName) {
        addParticipant(auditorId, auditorName.includes('@') ? auditorName : '', auditorName, 'AUDITOR');
      }
    }

    if (auditeeId) {
      const auditee = allUsers.find(u => Number(u.id) === Number(auditeeId));
      if (auditee?.email) {
        addParticipant(auditee.id, auditee.email, auditee.name || '', 'AUDITEE');
      } else if (auditeeName) {
        addParticipant(auditeeId, auditeeName.includes('@') ? auditeeName : '', auditeeName, 'AUDITEE');
      }
    }

    if (user?.email && !addedEmails.has(user.email)) {
      addParticipant(user.id, user.email, user.name || '', user.role || 'Participant');
    }

    return participants;
  }, [auditorId, auditorName, auditeeId, auditeeName, hodEmail, hodName, allUsers, user]);

  const getParticipantEmails = useCallback(() => {
    const emails = new Set<string>();

    if (user?.email) emails.add(user.email);

    if (auditorId) {
      const auditor = allUsers.find(u => Number(u.id) === Number(auditorId));
      if (auditor?.email) emails.add(auditor.email);
    }
    if (auditorName && auditorName.includes('@')) emails.add(auditorName);

    if (auditeeId) {
      const auditee = allUsers.find(u => Number(u.id) === Number(auditeeId));
      if (auditee?.email) emails.add(auditee.email);
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

  useEffect(() => {
    if (isOpen && auditId) {
      initializeAuditForum();
    }
  }, [isOpen, auditId]);

  if (!isOpen) return null;

  return (
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
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                  <Icon name="arrow-left" size={20} color="#6B7280" />
                </TouchableOpacity>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Icon name="message-circle" size={16} color="#3B82F6" />
                    <Text style={styles.headerTitle}>Audit Discussion</Text>
                  </View>
                  <View style={styles.headerSubRow}>
                    <Text style={styles.headerAuditNumber}>{auditNumber}</Text>
                    {auditStatus && (
                      <View style={[
                        styles.statusBadge,
                        auditStatus === 'APPROVED' ? styles.statusApproved :
                        auditStatus === 'REJECTED' ? styles.statusRejected :
                        auditStatus === 'IN_PROGRESS' ? styles.statusInProgress :
                        styles.statusPending
                      ]}>
                        <Text style={styles.statusText}>{auditStatus}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

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
  );
};

const styles = StyleSheet.create({
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
      web: {
        boxShadow: '-2px 0 20px rgba(0,0,0,0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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