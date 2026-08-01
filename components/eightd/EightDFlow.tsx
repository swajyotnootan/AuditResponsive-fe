// app/components/eightd/EightDFlow.tsx
'use client';

import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { eightDAPI } from '../../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EightDStepper from './EightDStepper';
import D0PlanContain from './steps/D0PlanContain';
import D1FormTeam from './steps/D1FormTeam';
import D2FormProblem from './steps/D2FormProblem';
import D3InterimContainment from './steps/D3InterimContainment';
import D4RootCause from './steps/D4RootCause';
import D5CorrectiveActions from './steps/D5CorrectiveActions';
import D6Implementation from './steps/D6Implementation';
import D7LessonsLearned from './steps/D7LessonsLearned';
import D8TeamReward from './steps/D8TeamReward';
import FinalPreview from './steps/FinalPreview';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const STEPS = ['D0 – Plan & Contain', 'D1 – Form the Team', 'D2 – Describe the Problem', 'D3 – Interim Containment Actions', 'D4 – Root Cause Analysis', 'D5 – Permanent Corrective Actions', 'D6 – Implement & Validate PCAs', 'D7 – Prevent Recurrence', 'D8 – Close & Recognize', 'Final Preview'];

const STEP_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];

interface EightDFlowProps {
  eventId?: string | null;
  initialStep?: string;
  isNcrBased?: boolean;
  type?: string;
}

export default function EightDFlow({ 
  eventId: propEventId, 
  initialStep: propInitialStep, 
  isNcrBased: propIsNcrBased, 
  type: propType 
}: EightDFlowProps) {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const eventId = propEventId ?? (params?.eventId === 'null' ? null : (params?.eventId as string));
  const startStep = propInitialStep ?? (params?.step as string || 'D0');
  const isNcrBased = propIsNcrBased ?? (params?.isNcrBased === 'true');
  const type = propType ?? (params?.type as string || 'fresh');
  
  // ✅ FIX 1: Extract isHOD from params
  const isHODParam = params?.isHOD === 'true';

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [eventNo, setEventNo] = useState<string | null>(eventId || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [documentStatus, setDocumentStatus] = useState<string>('draft');
  const [formData, setFormData] = useState<Record<string, any[]>>({
    d0: [], d1: [], d2: [], d3: [], d4: [],
    d5: [], d6: [], d7: [], d8: [],
  });

  // ✅ FIX 2: Removed the buggy startsWith('8D-') check
  const startedFromNcrFlow = Boolean(
    isNcrBased ||
    type === 'ncr'
  );

  const getFirstUnfilledStep = (data: Record<string, any[]>): number => {
    for (let i = 0; i < STEP_KEYS.length; i++) {
      if (!data[STEP_KEYS[i]] || data[STEP_KEYS[i]].length === 0) {
        return i;
      }
    }
    return STEP_KEYS.length;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!eventNo) {
        setLoading(false);
        const stepIndex = STEP_KEYS.indexOf(startStep.toLowerCase());
        setCurrentStep(stepIndex >= 0 ? stepIndex : 0);
        return;
      }

      try {
        const eventIdString = String(eventNo);
        const response = await eightDAPI.getById(eventIdString);
        if (response?.success && response.data?.content) {
          const content = response.data.content;
          const loadedData: Record<string, any[]> = {};
          STEP_KEYS.forEach(key => {
            loadedData[key] = Array.isArray(content[key]) ? content[key] : [];
          });
          setFormData(loadedData);
          setDocumentStatus(response.data.status || 'draft');

          if (startStep) {
            const stepIndex = STEP_KEYS.indexOf(startStep.toLowerCase());
            if (stepIndex >= 0) {
              setCurrentStep(stepIndex);
            } 
            // ✅ FIX 3: Explicitly handle "Final Preview" step name
            else if (startStep.toLowerCase() === 'final preview') {
              setCurrentStep(9);
            } else {
              setCurrentStep(0);
            }
          } else {
            setCurrentStep(getFirstUnfilledStep(loadedData));
          }
        }
      } catch (error) {
        console.error('Error fetching 8D data:', error);
        addToast('Failed to load 8D data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventNo, startStep]);

  const saveStep = useCallback(async (currentFormData: Record<string, any[]>): Promise<boolean> => {
    try {
      setSaving(true);
      
      if (!eventNo && currentFormData.d0 && currentFormData.d0.length > 0) {
        const d0Data = currentFormData.d0[0];
        if (!d0Data.eventNo || d0Data.eventNo.trim() === '') {
          addToast('Please enter an Event ID in D0 before proceeding.', 'error');
          return false;
        }
      }

      const payload: Record<string, any[]> = {};
      STEP_KEYS.forEach(key => {
        if (currentFormData[key] && currentFormData[key].length > 0) {
          const formWithId = currentFormData[key].map((form: any) => ({
            ...form,
            ...(key === 'd0'
              ? { eventNo: form.eventNo || eventNo }
              : { eventId: eventNo || (currentFormData.d0?.[0]?.eventNo) }
            )
          }));
          payload[key] = formWithId;
        }
      });

      const formDataToSend = new FormData();
      formDataToSend.append('jsonContent', JSON.stringify(payload));

      let response;
      if (eventNo) {
        const eventIdString = String(eventNo);
        response = await eightDAPI.update(eventIdString, formDataToSend);
      } else {
        response = await eightDAPI.create(formDataToSend);
      }

      if (response?.success) {
        const savedEventNo = response.data?.id;
        if (savedEventNo && !eventNo) {
          setEventNo(savedEventNo);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error saving 8D step:', error);
      addToast(error?.message || 'Failed to save step', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [eventNo, addToast]);

  const nextStep = async (): Promise<void> => {
    const success = await saveStep(formData);
    if (!success) return;

    if (currentStep === 0 && currentStep + 1 === 1) {
      if (documentStatus === 'rejected') {
        addToast('This document was rejected and cannot be continued.', 'error');
        return;
      }
      if (documentStatus !== 'in progress') {
        addToast('HOD approval is required before proceeding to D1.', 'warning');
        return;
      }
    }

    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = (): void => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (index: number): void => {
    if (index === 0) {
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
      return;
    }

    if (documentStatus !== 'in progress') {
      addToast('You must get HOD approval before accessing steps beyond D0.', 'warning');
      return;
    }

    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  const handleFinalSubmit = async (): Promise<void> => {
    const success = await saveStep(formData);
    if (success) {
      addToast('8D Report submitted successfully!', 'success');
    }
  };

  const updateFormData = (stepKey: string, data: any[]): void => {
    setFormData((prev: Record<string, any[]>) => ({ ...prev, [stepKey]: data }));
    if (stepKey === 'd0' && data[0]?.status) {
      setDocumentStatus(data[0].status);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading 8D Flow...</Text>
      </View>
    );
  }

  const renderStep = (): React.ReactNode => {
    switch (currentStep) {
      case 0:
        return (
          <D0PlanContain
            eventId={eventNo}
            initialIsNcrBased={startedFromNcrFlow}
            updateParent={(data: any[]) => updateFormData('d0', data)}
          />
        );
      case 1:
        return (
          <D1FormTeam
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d1', data)}
          />
        );
      case 2:
        return (
          <D2FormProblem
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d2', data)}
          />
        );
      case 3:
        return (
          <D3InterimContainment
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d3', data)}
          />
        );
      case 4:
        return (
          <D4RootCause
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d4', data)}
          />
        );
      case 5:
        return (
          <D5CorrectiveActions
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d5', data)}
          />
        );
      case 6:
        return (
          <D6Implementation
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d6', data)}
          />
        );
      case 7:
        return (
          <D7LessonsLearned
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d7', data)}
          />
        );
      case 8:
        return (
          <D8TeamReward
            eventId={eventNo}
            updateParent={(data: any[]) => updateFormData('d8', data)}
          />
        );
      case 9:
        // ✅ FIX 4: Pass isHODParam to FinalPreview so the approval UI shows up
        return <FinalPreview eventId={eventNo} isHOD={isHODParam} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <EightDStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
        stepData={formData}
      >
        <View style={styles.contentWrapper}>
          {renderStep()}

          {/* Navigation Buttons */}
          <View style={[styles.navigation, isMobile && styles.navigationMobile]}>
            <TouchableOpacity
              style={[styles.backButton, currentStep === 0 && styles.disabledButton]}
              onPress={prevStep}
              disabled={currentStep === 0 || saving}
            >
              <Icon name="arrow-left" size={16} color={currentStep === 0 ? '#9CA3AF' : '#1F2937'} />
              <Text style={[styles.backButtonText, currentStep === 0 && styles.disabledText]}>Back</Text>
            </TouchableOpacity>

            {currentStep < STEPS.length - 1 ? (
              <TouchableOpacity style={styles.nextButton} onPress={nextStep} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>Save & Next</Text>
                    <Icon name="arrow-right" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleFinalSubmit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </EightDStepper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  contentWrapper: {
    flex: 1,
    padding: isMobile ? 12 : 16,
    paddingTop: Platform.OS === 'web' ? 80 : 12,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationMobile: {
    flexDirection: 'row',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});