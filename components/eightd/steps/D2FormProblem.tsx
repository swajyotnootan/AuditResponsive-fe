// app/components/eightd/steps/D2FormProblem.tsx
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

const workAreas = [
  'Assembly Line',
  'Packaging Area',
  'Testing Lab',
  'Warehouse',
  'Quality Control',
  'Maintenance Workshop',
  'Other',
];

interface D2FormData {
  eventId: string;
  problemStatement: string;
  what: string;
  why: string;
  where: string;
  otherWhere: string;
  when: string;
  who: string;
  how: string;
  howMuch: string;
}

interface D2FormProblemProps {
  eventId?: string | null;
  updateParent?: (data: D2FormData[]) => void;
}

export default function D2FormProblem({ eventId, updateParent }: D2FormProblemProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D2FormData>({
    eventId: eventId || '',
    problemStatement: '',
    what: '',
    why: '',
    where: '',
    otherWhere: '',
    when: '',
    who: '',
    how: '',
    howMuch: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d2?.[0]) {
          const d2Data = response.data.content.d2[0];
          setFormData({
            eventId: d2Data.eventId || eventId,
            problemStatement: d2Data.problemStatement || '',
            what: d2Data.what || '',
            why: d2Data.why || '',
            where: d2Data.where || '',
            otherWhere: d2Data.otherWhere || '',
            when: d2Data.when || '',
            who: d2Data.who || '',
            how: d2Data.how || '',
            howMuch: d2Data.howMuch || '',
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error('Error fetching D2 data:', error);
        addToast('Error loading D2 data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D2FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.problemStatement.trim()) {
      addToast('Problem Statement is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = { d2: [formData] };
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
        addToast('D2 form saved successfully!', 'success');
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error('Error saving D2:', error);
      addToast(error?.message || 'Failed to save D2 form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getWhereDisplay = () => {
    if (formData.where === 'Other' && formData.otherWhere) {
      return formData.otherWhere;
    }
    return formData.where;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D2 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="file-text" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D2 – Describe the Problem</Text>
          {eventId && <Text style={styles.headerBadge}>{eventId}</Text>}
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
          <Text style={styles.label}>Briefly Describe the Problem <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.problemStatement}
            onChangeText={(text) => handleChange('problemStatement', text)}
            placeholder="e.g. Product X shows cracks after 2 hours of operation..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridLeft}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHAT is the problem?</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                value={formData.what}
                onChangeText={(text) => handleChange('what', text)}
                placeholder="What happened?"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHY is it a problem?</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                value={formData.why}
                onChangeText={(text) => handleChange('why', text)}
                placeholder="Why does this matter?"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHERE did it occur?</Text>
              <View style={styles.dropdownContainer}>
                {workAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.dropdownOption,
                      formData.where === area && styles.dropdownOptionActive
                    ]}
                    onPress={() => handleChange('where', area)}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      formData.where === area && styles.dropdownOptionTextActive
                    ]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formData.where === 'Other' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={formData.otherWhere}
                  onChangeText={(text) => handleChange('otherWhere', text)}
                  placeholder="Enter other location..."
                />
              )}
            </View>
          </View>

          <View style={styles.gridRight}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHEN did it occur?</Text>
              <TextInput
                style={styles.input}
                value={formData.when}
                onChangeText={(text) => handleChange('when', text)}
                placeholder="Date and time"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHO reported it?</Text>
              <TextInput
                style={styles.input}
                value={formData.who}
                onChangeText={(text) => handleChange('who', text)}
                placeholder="Person or team"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>HOW was it detected?</Text>
              <TextInput
                style={styles.input}
                value={formData.how}
                onChangeText={(text) => handleChange('how', text)}
                placeholder="Detection method"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>HOW much impact?</Text>
              <TextInput
                style={styles.input}
                value={formData.howMuch}
                onChangeText={(text) => handleChange('howMuch', text)}
                placeholder="Estimated cost or quantity"
              />
            </View>
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
            <Text style={styles.submitButtonText}>Save Problem</Text>
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
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
  textAreaSmall: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  gridContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 16,
  },
  gridLeft: {
    flex: 1,
  },
  gridRight: {
    flex: 1,
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dropdownOptionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdownOptionTextActive: {
    color: '#FFFFFF',
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