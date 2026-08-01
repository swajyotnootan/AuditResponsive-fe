// app/components/eightd/EightDStepper.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface EightDStepperProps {
  steps: string[];
  currentStep: number;
  onStepClick: (index: number) => void;
  stepData: Record<string, any[]>;
  children: React.ReactNode;
}

export default function EightDStepper({
  steps,
  currentStep,
  onStepClick,
  stepData,
  children
}: EightDStepperProps) {
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const scrollViewRef = useRef<ScrollView>(null);

  const stepNames = [
    'Plan & Contain',
    'Form Team',
    'Problem',
    'Interim Contain',
    'Root Cause',
    'Corrective Action',
    'Implement',
    'Prevent',
    'Close & Recognize',
    'Preview'
  ];

  const isStepCompleted = (index: number) => {
    const stepKey = `d${index}`;
    const stepContent = stepData[stepKey];
    return Array.isArray(stepContent) && stepContent.length > 0;
  };

  const getStepStatus = (index: number) => {
    if (index === currentStep) return 'current';
    if (isStepCompleted(index)) return 'completed';
    return 'pending';
  };

  const getStepColors = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#10B981', text: '#FFFFFF', border: '#10B981' };
      case 'current':
        return { bg: '#3B82F6', text: '#FFFFFF', border: '#3B82F6' };
      default:
        return { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB' };
    }
  };

  useEffect(() => {
    if (orientation === 'horizontal' && scrollViewRef.current) {
      const stepWidth = 80;
      const scrollPosition = currentStep * stepWidth - width / 2 + stepWidth / 2;
      scrollViewRef.current.scrollTo({ x: Math.max(0, scrollPosition), animated: true });
    }
  }, [currentStep, orientation]);

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, orientation === 'horizontal' && styles.toggleActive]}
          onPress={() => setOrientation('horizontal')}
        >
          <Icon name="grid" size={18} color={orientation === 'horizontal' ? '#FFFFFF' : '#6B7280'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, orientation === 'vertical' && styles.toggleActive]}
          onPress={() => setOrientation('vertical')}
        >
          <Icon name="list" size={18} color={orientation === 'vertical' ? '#FFFFFF' : '#6B7280'} />
        </TouchableOpacity>
      </View>

      <View style={[styles.contentContainer, orientation === 'vertical' && styles.verticalContainer]}>
        {/* Stepper */}
        {orientation === 'horizontal' ? (
          <View style={styles.horizontalStepper}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
            >
              {steps.map((_, index) => {
                const status = getStepStatus(index);
                const colors = getStepColors(status);
                const stepName = stepNames[index] || `D${index}`;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.horizontalStep}
                    onPress={() => onStepClick(index)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                        status === 'current' && styles.stepCircleCurrent,
                      ]}
                    >
                      {status === 'completed' ? (
                        <Icon name="check" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.stepCircleText, { color: colors.text }]}>
                          {index < 10 ? `D${index}` : index}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepName,
                        status === 'current' && styles.stepNameCurrent,
                        status === 'completed' && styles.stepNameCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {stepName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.verticalStepper}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.verticalScrollContent}>
              {steps.map((_, index) => {
                const status = getStepStatus(index);
                const colors = getStepColors(status);
                const stepName = stepNames[index] || `D${index}`;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.verticalStep}
                    onPress={() => onStepClick(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.verticalStepContent}>
                      <View
                        style={[
                          styles.stepCircle,
                          styles.stepCircleSmall,
                          { backgroundColor: colors.bg, borderColor: colors.border },
                        ]}
                      >
                        {status === 'completed' ? (
                          <Icon name="check" size={12} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.stepCircleText, { color: colors.text, fontSize: 10 }]}>
                            {index < 10 ? `D${index}` : index}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.verticalStepName,
                          status === 'current' && styles.stepNameCurrent,
                          status === 'completed' && styles.stepNameCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {stepName}
                      </Text>
                      {status === 'completed' && (
                        <Icon name="check-circle" size={14} color="#10B981" style={styles.checkIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={[styles.content, orientation === 'vertical' && styles.contentVertical]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  } as const,
  toggleContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 2,
    ...(Platform.select({
      web: {
        position: 'fixed',
        top: 80,
        right: 20,
      },
    }) as any),
  } as const,
  toggleButton: {
    padding: 6,
    borderRadius: 6,
  } as const,
  toggleActive: {
    backgroundColor: '#3B82F6',
  } as const,
  contentContainer: {
    flex: 1,
    paddingTop: 56,
  } as const,
  verticalContainer: {
    flexDirection: 'row',
  } as const,
  horizontalStepper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    ...(Platform.select({
      web: {
        position: 'fixed',
        top: 70,
        left: 0,
        right: 0,
        zIndex: 30,
        marginHorizontal: 0,
        borderRadius: 0,
        paddingVertical: 8,
      },
    }) as any),
  } as const,
  horizontalScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  } as const,
  horizontalStep: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  } as const,
  verticalStepper: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 8,
    marginRight: 16,
    maxHeight: 500,
    ...(Platform.select({
      web: {
        position: 'sticky',
        top: 80,
        maxHeight: 'calc(100vh - 120px)',
      },
    }) as any),
  } as const,
  verticalScrollContent: {
    paddingVertical: 4,
  } as const,
  verticalStep: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  } as const,
  verticalStepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as const,
  verticalStepName: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  } as const,
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 4,
  } as const,
  stepCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 0,
  } as const,
  stepCircleCurrent: {
    borderWidth: 3,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } as const,
  stepCircleText: {
    fontSize: 11,
    fontWeight: '600',
  } as const,
  stepName: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 60,
  } as const,
  stepNameCurrent: {
    color: '#3B82F6',
    fontWeight: '600',
  } as const,
  stepNameCompleted: {
    color: '#10B981',
  } as const,
  checkIcon: {
    marginLeft: 4,
  } as const,
  content: {
    flex: 1,
  } as const,
  contentVertical: {
    flex: 1,
  } as const,
});