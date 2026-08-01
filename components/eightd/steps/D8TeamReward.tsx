// app/components/eightd/steps/D8TeamReward.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { eightDAPI } from '../../../services/api';
import { useToast } from '../../context/ToastContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface D8FormData {
  eventId: string;
  rewardDescription: string;
  additionalRecommendations: string;
  teamLeaderName: string;
  signatureDate: string;
}

interface D8TeamRewardProps {
  eventId?: string | null;
  updateParent?: (data: D8FormData[]) => void;
}

export default function D8TeamReward({ eventId, updateParent }: D8TeamRewardProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D8FormData>({
    eventId: eventId || '',
    rewardDescription: '',
    additionalRecommendations: '',
    teamLeaderName: '',
    signatureDate: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d8?.[0]) {
          const d8Data = response.data.content.d8[0];
          setFormData({
            eventId: d8Data.eventId || eventId,
            rewardDescription: d8Data.rewardDescription || '',
            additionalRecommendations: d8Data.additionalRecommendations || '',
            teamLeaderName: d8Data.teamLeaderName || '',
            signatureDate: d8Data.signatureDate || '',
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error('Error fetching D8 data:', error);
        addToast('Error loading D8 data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D8FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.teamLeaderName.trim()) {
      addToast('Team Leader Name is required', 'error');
      return;
    }
    if (!formData.signatureDate) {
      addToast('Please select a date & time for the signature', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { d8: [formData] };
      const formDataToSend = new FormData();
      formDataToSend.append('jsonContent', JSON.stringify(payload));

      let response;
      if (recordId) {
        response = await eightDAPI.update(recordId, formDataToSend);
      } else {
        response = await eightDAPI.create(formDataToSend);
      }

      if (response?.success) {
        const savedId = response.data?.id;
        if (savedId && !recordId) setRecordId(savedId);
        addToast('D8 form saved successfully!', 'success');
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error('Error saving D8:', error);
      addToast(error?.message || 'Failed to save D8 form', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D8 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="user-check" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D8 – Team Reward & Completion</Text>
          {eventId && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{eventId}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event ID</Text>
          <TextInput
            style={styles.input}
            value={formData.eventId}
            onChangeText={(text) => handleChange('eventId', text)}
            placeholder="Enter Event ID"
            editable={false}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Reward Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.rewardDescription}
            onChangeText={(text) => handleChange('rewardDescription', text)}
            placeholder="Describe how the team can be rewarded..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Additional Recommendations</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.additionalRecommendations}
            onChangeText={(text) => handleChange('additionalRecommendations', text)}
            placeholder="Enter any additional recommendations..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name of 8D Team Leader <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.teamLeaderName}
            onChangeText={(text) => handleChange('teamLeaderName', text)}
            placeholder="Enter team leader name..."
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date & Time <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.signatureDate}
            onChangeText={(text) => handleChange('signatureDate', text)}
            placeholder="YYYY-MM-DDTHH:mm"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save D8</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2242a1',
    borderTopWidth: 4,
    borderTopColor: '#EE161F',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: isMobile ? 16 : 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});