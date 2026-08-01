import { yupResolver } from '@hookform/resolvers/yup';
import { Calendar, Clock, FileText, MapPin, Minus, Plus, Save, Users, X } from 'lucide-react-native';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
    ArrayPath,
    Controller,
    FieldPath, get,
    useFieldArray,
    useForm
} from 'react-hook-form';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import * as yup from 'yup';

// ✅ STEP 1: Define explicit FormValues type (matches your yup schema)
type FormValues = {
  title: string;
  description?: string;
  start: string;
  end: string;
  category: 'work' | 'personal' | 'health' | 'education';
  priority: 'low' | 'medium' | 'high';
  location?: string;
  attendees: string[];
};

// Validation schema
const eventSchema = yup.object().shape({
  title: yup.string().required('Title is required').min(3, 'Min 3 chars'),
  description: yup.string().max(2000, 'Max 2000 chars'),
  start: yup.string().required('Start is required'),
  end: yup.string().required('End is required'),
  category: yup.string().oneOf(['work', 'personal', 'health', 'education']).required(),
  priority: yup.string().oneOf(['low', 'medium', 'high']).required(),
  location: yup.string().max(500),
  attendees: yup.array().of(yup.string().email('Invalid email').required('Required')),
});

export default function EventForm({ event, onClose, onSave }: any) {
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ STEP 2: Pass FormValues generic to useForm
  const { 
    control, 
    handleSubmit, 
    watch, 
    reset, 
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: yupResolver(eventSchema) as any,
    defaultValues: {
      title: '', 
      description: '', 
      location: '',
      start: moment().format('YYYY-MM-DDTHH:mm'),
      end: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
      category: 'work', 
      priority: 'medium',
      attendees: [''],
    }
  });

  // ✅ STEP 3: useFieldArray now works because 'attendees' is a known key of FormValues
  const { 
    fields: attendeeFields, 
    append: appendAttendee, 
    remove: removeAttendee 
  } = useFieldArray({
    control, 
   name: "attendees" as ArrayPath<FormValues> // ← This bypasses the 'never' inference bug
  });

  useEffect(() => {
    if (event) {
      reset({
        title: event.title || '',
        description: event.description || '',
        start: event.start ? moment(event.start).format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm'),
        end: event.end ? moment(event.end).format('YYYY-MM-DDTHH:mm') : moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        category: event.category || 'work',
        priority: event.priority || 'medium',
        location: event.location || '',
        attendees: event.attendees?.length > 0 ? event.attendees : [''],
      });
    }
  }, [event, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await onSave({ ...data, start: new Date(data.start), end: new Date(data.end) });
      onClose();
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  // ✅ STEP 4: Type `name` as FieldPath<FormValues> so TS knows it's a valid key
  const InputField = ({ 
    name, 
    label, 
    icon: Icon, 
    multiline = false, 
    placeholder 
  }: { 
    name: FieldPath<FormValues>;  // ✅ Typed as valid form field
    label: string;
    icon?: any;
    multiline?: boolean;
    placeholder?: string;
  }) => {
    // ✅ STEP 5: Use `get()` from react-hook-form to safely access nested errors
    const errorMessage = get(errors, name)?.message as string | undefined;

    return (
      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          {Icon && <Icon size={16} color="#374151" style={{ marginRight: 4 }} />}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              value={(value as string) || ''}
              multiline={multiline}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              style={[
                styles.input,
                errorMessage ? styles.inputError : styles.inputNormal
              ]}
            />
          )}
        />
        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>
    );
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{event ? 'Edit Event' : 'New Event'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <InputField name="title" label="Title *" icon={Calendar} placeholder="Event title" />
            
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <InputField name="start" label="Start *" icon={Clock} placeholder="YYYY-MM-DD HH:mm" />
              </View>
              <View style={styles.halfWidth}>
                <InputField name="end" label="End *" icon={Clock} placeholder="YYYY-MM-DD HH:mm" />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                {(['work', 'personal', 'health', 'education'] as const).map((cat) => {
                  const isSelected = watch('category') === cat;
                  return (
                    <Controller
                      key={cat}
                      name="category"
                      control={control}
                      render={({ field: { onChange } }) => (
                        <TouchableOpacity
                          onPress={() => onChange(cat)}
                          style={[
                            styles.categoryButton,
                            isSelected ? styles.categoryButtonActive : styles.categoryButtonInactive
                          ]}
                        >
                          <Text style={[
                            styles.categoryText,
                            isSelected ? styles.categoryTextActive : styles.categoryTextInactive
                          ]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  );
                })}
              </View>
            </View>

            <InputField name="location" label="Location" icon={MapPin} placeholder="Meeting link or room" />
            <InputField name="description" label="Description" icon={FileText} multiline placeholder="Add details..." />

            {/* ✅ STEP 6: Safe array error access */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.labelRow}>
                  <Users size={16} color="#374151" style={{ marginRight: 4 }} />
                  <Text style={styles.label}>Attendees</Text>
                </View>
                <TouchableOpacity onPress={() => appendAttendee('')} style={styles.addButton}>
                  <Plus size={16} color="#2563eb" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {attendeeFields.map((field, index) => {
                // ✅ Use get() for safe array error access
                const attendeeError = get(errors, `attendees.${index}.message`) as string | undefined;

                return (
                  <View key={field.id} style={styles.attendeeRow}>
                    <Controller
                      name={`attendees.${index}` as const}
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={(value as string) || ''}
                          placeholder="Enter email address"
                          placeholderTextColor="#9ca3af"
                          keyboardType="email-address"
                          style={[
                            styles.attendeeInput,
                            attendeeError ? styles.inputError : styles.inputNormal
                          ]}
                        />
                      )}
                    />
                    <TouchableOpacity onPress={() => removeAttendee(index)} style={styles.removeButton}>
                      <Minus size={18} color="#dc2626" />
                    </TouchableOpacity>
                    {attendeeError && <Text style={styles.errorText}>{attendeeError}</Text>}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSubmit(onSubmit)} 
              disabled={isLoading} 
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            >
              {isLoading ? (
                <Text style={styles.saveButtonText}>Saving...</Text>
              ) : (
                <>
                  <Save size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveButtonText}>Save Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  closeButton: { padding: 4 },
  scrollView: { paddingHorizontal: 16, paddingTop: 16 },
  inputContainer: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151' },
  input: { borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#111827' },
  inputNormal: { borderColor: '#d1d5db' },
  inputError: { borderColor: '#f87171' },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  halfWidth: { flex: 1 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 2 },
  categoryButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  categoryButtonInactive: { borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  categoryText: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  categoryTextActive: { color: '#1d4ed8' },
  categoryTextInactive: { color: '#374151' },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#eff6ff', borderRadius: 6 },
  addButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  attendeeRow: { marginBottom: 8 },
  attendeeInput: { flex: 1, borderWidth: 2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#111827', marginRight: 8 },
  removeButton: { position: 'absolute', right: 0, top: 12, padding: 4 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 12 },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: '#1e3a8a' },
  saveButtonDisabled: { backgroundColor: '#93c5fd' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});