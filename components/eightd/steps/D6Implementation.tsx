// app/components/eightd/steps/D6Implementation.tsx
"use client";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal, // 👈 Add Modal
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { eightDAPI } from "../../../services/api";
import { useToast } from "../../context/ToastContext";

const { width } = Dimensions.get("window");
const isMobile = width < 768;

interface D6FormData {
  eventId: string;
  implementationDate: string;
  communicatedToStakeholders: string;
  notes: string;
}

interface D6ImplementationProps {
  eventId?: string | null;
  updateParent?: (data: D6FormData[]) => void;
}

export default function D6Implementation({
  eventId,
  updateParent,
}: D6ImplementationProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D6FormData>({
    eventId: eventId || "",
    implementationDate: "",
    communicatedToStakeholders: "Yes",
    notes: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  const showDateTimePicker = () => {
    if (formData.implementationDate) {
      const d = new Date(formData.implementationDate);
      if (!isNaN(d.getTime())) {
        setTempDate(d);
        setTempTime(d);
      }
    } else {
      const now = new Date();
      setTempDate(now);
      setTempTime(now);
    }
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selectedDate) {
        setTempDate(selectedDate);
        setShowTimePicker(true); // Chain to time picker on Android
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    setShowTimePicker(true); // Chain to time picker on iOS
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "set" && selectedTime) {
        const combined = new Date(tempDate);
        combined.setHours(selectedTime.getHours());
        combined.setMinutes(selectedTime.getMinutes());
        handleChange("implementationDate", combined.toISOString());
      }
    } else {
      if (selectedTime) setTempTime(selectedTime);
    }
  };

  const handleTimeConfirm = () => {
    const combined = new Date(tempDate);
    combined.setHours(tempTime.getHours());
    combined.setMinutes(tempTime.getMinutes());
    handleChange("implementationDate", combined.toISOString());
    setShowTimePicker(false);
  };

  // Helper to format ISO string for HTML datetime-local input (Web)
  const formatForWebInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d6?.[0]) {
          const d6Data = response.data.content.d6[0];
          setFormData({
            eventId: d6Data.eventId || eventId,
            implementationDate: d6Data.implementationDate || "",
            communicatedToStakeholders:
              d6Data.communicatedToStakeholders || "Yes",
            notes: d6Data.notes || "",
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D6 data:", error);
        addToast("Error loading D6 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D6FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = () => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    const mockData: D6FormData = {
      eventId: formData.eventId,
      implementationDate: formattedDate,
      communicatedToStakeholders: "Yes",
      notes:
        "All stakeholders have been informed via email and a town hall meeting.",
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D6 form auto-filled!", "success");
  };

  const handleSubmit = async () => {
    if (!formData.implementationDate) {
      addToast("Please select the Implementation Date & Time", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d6: [formData] };
      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));

      let response;
      if (recordId) {
        response = await eightDAPI.update(recordId, formDataToSend);
      } else {
        response = await eightDAPI.create(formDataToSend);
      }

      if (response?.success) {
        const savedId = response.data?.id;
        if (savedId && !recordId) setRecordId(savedId);
        addToast("D6 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D6:", error);
      addToast(error?.message || "Failed to save D6 form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D6 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="calendar" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>
            D6 – Implementation & Communication
          </Text>
          {eventId && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{eventId}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.autoFillButton}
          onPress={handleAutoFill}
        >
          <Icon name="zap" size={16} color="#FFFFFF" />
          <Text style={styles.autoFillButtonText}>Auto-fill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event ID</Text>
          <TextInput
            style={styles.input}
            value={formData.eventId}
            onChangeText={(text) => handleChange("eventId", text)}
            placeholder="Enter Event ID"
            editable={false}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Implementation Date & Time <Text style={styles.required}>*</Text>
          </Text>
          {Platform.OS === "web" ? (
            // @ts-ignore - HTML input is valid in RN Web
            <input
              type="datetime-local"
              value={formatForWebInput(formData.implementationDate)}
              onChange={(e: any) => {
                const localDate = new Date(e.target.value);
                handleChange("implementationDate", localDate.toISOString());
              }}
              style={styles.webDateTimeInput as any}
            />
          ) : (
            <TouchableOpacity
              style={[styles.input, styles.dateTouchable]}
              onPress={showDateTimePicker}
            >
              <Text
                style={
                  formData.implementationDate
                    ? styles.dateText
                    : styles.datePlaceholder
                }
              >
                {formData.implementationDate
                  ? new Date(formData.implementationDate).toLocaleString()
                  : "Select Date & Time"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Communicated to all stakeholders?</Text>
          <View style={styles.radioGroup}>
            {["Yes", "No"].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  formData.communicatedToStakeholders === option &&
                    styles.radioOptionActive,
                ]}
                onPress={() =>
                  handleChange("communicatedToStakeholders", option)
                }
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.communicatedToStakeholders === option &&
                      styles.radioCircleActive,
                  ]}
                >
                  {formData.communicatedToStakeholders === option && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes / Comments</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => handleChange("notes", text)}
            placeholder="Add any relevant notes..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
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
            <Text style={styles.submitButtonText}>Save D6</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitleText}>Select Date</Text>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text style={styles.modalDoneText}>Next</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                textColor="#000000"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* iOS Time Picker Modal */}
      {Platform.OS === "ios" && showTimePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showTimePicker}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitleText}>Select Time</Text>
                <TouchableOpacity onPress={handleTimeConfirm}>
                  <Text style={styles.modalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                textColor="#000000"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android Native Dialogs */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2242a1",
    borderTopWidth: 4,
    borderTopColor: "#EE161F",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1, // 👈 ADD THIS
    minWidth: 0, // 👈 ADD THIS
    marginRight: 8, // 👈 ADD THIS
  },
  headerTitle: {
    fontSize: isMobile ? 14 : 20, // 👈 Smaller font on mobile
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 1, // 👈 ADD THIS (Allows text to truncate with "...")
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    flexShrink: 0, // 👈 ADD THIS
  },
  headerBadgeText: {
    fontSize: 10, // 👈 Smaller font on mobile
    color: "#FFFFFF",
  },
  autoFillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0, // 👈 ADD THIS (Prevents button from being squished)
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
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  radioGroup: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
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
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleActive: {
    borderColor: "#3B82F6",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },
  radioText: {
    fontSize: 14,
    color: "#1F2937",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  autoFillButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // --- Date & Time Picker Styles ---
  webDateTimeInput: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  dateTouchable: {
    justifyContent: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#1F2937",
  },
  datePlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  modalTitleText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
  },
  modalDoneText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
});
