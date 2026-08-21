// app/components/dashboards/LeadAuditor/ResponseDetailModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface ResponseDetailModalProps {
  response: any;
  onClose: () => void;
  visible: boolean;
}

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({ response, onClose, visible }) => {
  const [answers, setAnswers] = useState<any>(null);

  useEffect(() => {
    if (response?.answers) {
      const parsed = typeof response.answers === 'string' 
        ? JSON.parse(response.answers) 
        : response.answers;
      setAnswers(parsed);
    }
  }, [response]);

  if (!answers) return null;

  const responsesObj = answers.responses || {};
  const compliantCount = Object.values(responsesObj).filter((v: any) => v === 'COMPLIANT').length;
  const minorCount = Object.values(responsesObj).filter((v: any) => v === 'MINOR_NC').length;
  const majorCount = Object.values(responsesObj).filter((v: any) => v === 'MAJOR_NC').length;

  const getResponseColor = (resp: string) => {
    switch(resp) {
      case 'COMPLIANT': return '#10B981';
      case 'MINOR_NC': return '#F59E0B';
      case 'MAJOR_NC': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getResponseLabel = (resp: string) => {
    switch(resp) {
      case 'COMPLIANT': return '✓ Compliant';
      case 'MINOR_NC': return '! Minor NC';
      case 'MAJOR_NC': return '✗ Major NC';
      default: return resp;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Response Details</Text>
              <Text style={styles.modalSubtitle}>{answers?.documentNumber || 'N/A'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Summary Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.statValue, { color: '#059669' }]}>{compliantCount}</Text>
                <Text style={styles.statLabel}>Compliant</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.statValue, { color: '#D97706' }]}>{minorCount}</Text>
                <Text style={styles.statLabel}>Minor NC</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statValue, { color: '#DC2626' }]}>{majorCount}</Text>
                <Text style={styles.statLabel}>Major NC</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.statValue, { color: '#2563EB' }]}>{response.percentageScore || 0}%</Text>
                <Text style={styles.statLabel}>Score</Text>
              </View>
            </View>

            {/* Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{answers?.department || response.department || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Process</Text>
                <Text style={styles.infoValue}>{answers?.processName || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Auditee</Text>
                <Text style={styles.infoValue}>{answers?.auditeeName || response.auditeeName || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{answers?.date || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[
                  styles.statusBadge,
                  response.status === 'APPROVED' ? styles.statusApproved : 
                  response.status === 'REJECTED' ? styles.statusRejected : 
                  styles.statusSubmitted
                ]}>
                  <Text style={styles.statusBadgeText}>{response.status || 'DRAFT'}</Text>
                </View>
              </View>
            </View>

            {/* Question Responses */}
            <View style={styles.questionsSection}>
              <Text style={styles.questionsTitle}>Question Responses</Text>
              {Object.entries(responsesObj).map(([qId, resp]: [string, any]) => (
                <View key={qId} style={[styles.questionItem, { borderLeftColor: getResponseColor(resp) }]}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionId}>Q{qId}</Text>
                    <Text style={[styles.questionResponse, { color: getResponseColor(resp) }]}>
                      {getResponseLabel(resp)}
                    </Text>
                  </View>
                  <Text style={styles.questionText}>
                    {answers?.observations?.[qId] || `Question ${qId}`}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.9,
    overflow: 'hidden',
  },
  modalContentMobile: {
    width: width * 0.95,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4F46E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#C7D2FE',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusSubmitted: {
    backgroundColor: '#DBEAFE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1F2937',
  },
  questionsSection: {
    marginTop: 8,
  },
  questionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  questionItem: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questionId: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  questionResponse: {
    fontSize: 12,
    fontWeight: '500',
  },
  questionText: {
    fontSize: 13,
    color: '#1F2937',
  },
});

export default ResponseDetailModal;