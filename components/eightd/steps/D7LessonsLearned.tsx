// app/components/eightd/steps/D7LessonsLearned.tsx
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

interface D7FormData {
  eventId: string;
  additionalMeasuresNeeded: string;
  lessonsLearned: string;
  proceduresUpdated: string;
}

interface D7LessonsLearnedProps {
  eventId?: string | null;
  updateParent?: (data: D7FormData[]) => void;
}

export default function D7LessonsLearned({ eventId, updateParent }: D7LessonsLearnedProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D7FormData>({
    eventId: eventId || '',
    additionalMeasuresNeeded: 'No',
    lessonsLearned: '',
    proceduresUpdated: 'Yes',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d7?.[0]) {
          const d7Data = response.data.content.d7[0];
          setFormData({
            eventId: d7Data.eventId || eventId,
            additionalMeasuresNeeded: d7Data.additionalMeasuresNeeded || 'No',
            lessonsLearned: d7Data.lessonsLearned || '',
            proceduresUpdated: d7Data.proceduresUpdated || 'Yes',
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error('Error fetching D7 data:', error);
        addToast('Error loading D7 data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D7FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.lessonsLearned.trim()) {
      addToast('Lessons Learned is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { d7: [formData] };
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
        addToast('D7 form saved successfully!', 'success');
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error('Error saving D7:', error);
      addToast(error?.message || 'Failed to save D7 form', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D7 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="lightbulb" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D7 – Lessons Learned & Continuous Improvement</Text>
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
          <Text style={styles.label}>Are additional measures needed to prevent similar problems?</Text>
          <View style={styles.radioGroup}>
            {['Yes', 'No'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  formData.additionalMeasuresNeeded === option && styles.radioOptionActive
                ]}
                onPress={() => handleChange('additionalMeasuresNeeded', option)}
              >
                <View style={[
                  styles.radioCircle,
                  formData.additionalMeasuresNeeded === option && styles.radioCircleActive
                ]}>
                  {formData.additionalMeasuresNeeded === option && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Lessons Learned <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.lessonsLearned}
            onChangeText={(text) => handleChange('lessonsLearned', text)}
            placeholder="Describe insights gained and improvements for future processes..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Were procedures and work instructions updated?</Text>
          <View style={styles.radioGroup}>
            {['Yes', 'No'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  formData.proceduresUpdated === option && styles.radioOptionActive
                ]}
                onPress={() => handleChange('proceduresUpdated', option)}
              >
                <View style={[
                  styles.radioCircle,
                  formData.proceduresUpdated === option && styles.radioCircleActive
                ]}>
                  {formData.proceduresUpdated === option && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save D7</Text>
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
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOptionActive: {
    opacity: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  radioText: {
    fontSize: 14,
    color: '#1F2937',
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