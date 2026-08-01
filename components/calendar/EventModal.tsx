import { AlertCircle, Calendar, Clock, Crown, Tag, UserCheck, X } from 'lucide-react-native';
import moment from 'moment';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function EventModal({ visible, event, onClose }: any) {
  if (!event) return null;

  const getStatusBadge = () => {
    if (event.isFullyCompleted) return { bg: '#ecfdf5', text: '#047857', label: '✓ Completed' };
    if (event.isSubmitted) return { bg: '#eff6ff', text: '#1d4ed8', label: '⏳ Pending Approval' };
    if (event.status === 'PENDING_APPROVAL') return { bg: '#fefce8', text: '#a16207', label: 'Pending Schedule' };
    if (event.status === 'OVERDUE' || event.status === 'REJECTED') return { bg: '#fef2f2', text: '#b91c1c', label: event.status };
    return { bg: '#f0f9ff', text: '#0369a1', label: 'Scheduled' };
  };

  const badge = getStatusBadge();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerDot, { backgroundColor: event.isFullyCompleted ? '#059669' : '#3b82f6' }]} />
              <Text style={styles.headerTitle}>Audit Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.auditTitle}>{event.auditType || 'Audit'}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              {event.auditNumber && <Text style={styles.auditNumber}>{event.auditNumber}</Text>}

              <View style={styles.infoBlock}>
                <View style={styles.infoRow}>
                  <Tag size={16} color="#9ca3af" />
                  <Text style={styles.infoLabel}>Department:</Text>
                  <Text style={styles.infoValue}>{event.department || 'N/A'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Calendar size={16} color="#9ca3af" />
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>{event.start ? moment(event.start).format('MMM DD, YYYY') : 'N/A'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Clock size={16} color="#9ca3af" />
                  <Text style={styles.infoLabel}>Time:</Text>
                  <Text style={styles.infoValue}>{event.startTime || 'N/A'} - {event.endTime || 'N/A'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Crown size={16} color="#3b82f6" />
                  <Text style={styles.infoLabel}>Auditor:</Text>
                  <Text style={styles.infoValue}>{event.auditorName || 'Unassigned'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <UserCheck size={16} color="#10b981" />
                  <Text style={styles.infoLabel}>Auditee:</Text>
                  <Text style={styles.infoValue}>{event.auditeeName || 'Unassigned'}</Text>
                </View>
              </View>

              {event.status === 'OVERDUE' && (
                <View style={styles.overdueBlock}>
                  <AlertCircle size={16} color="#dc2626" />
                  <Text style={styles.overdueText}>⚠️ This audit is OVERDUE</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 450, maxHeight: '85%', backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#00529B' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerDot: { width: 12, height: 12, borderRadius: 6 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  closeButton: { padding: 4 },
  scrollArea: { maxHeight: 500 },
  body: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  auditTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  auditNumber: { fontSize: 12, fontFamily: 'monospace', color: '#6b7280', marginBottom: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  infoBlock: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14, color: '#6b7280', width: 70 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827', flex: 1 },
  overdueBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: '#fecaca' },
  overdueText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  footerButton: { backgroundColor: '#00529B', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  footerButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' }
});