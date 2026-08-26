// app/components/eightd/steps/D2FormProblem.tsx
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

const workAreas = [
  "Assembly Line",
  "Packaging Area",
  "Testing Lab",
  "Warehouse",
  "Quality Control",
  "Maintenance Workshop",
  "Other",
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

export default function D2FormProblem({
  eventId,
  updateParent,
}: D2FormProblemProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D2FormData>({
    eventId: eventId || "",
    problemStatement: "",
    what: "",
    why: "",
    where: "",
    otherWhere: "",
    when: "",
    who: "",
    how: "",
    howMuch: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  const showDateTimePicker = () => {
    // Initialize pickers with current value or current time
    if (formData.when) {
      const d = new Date(formData.when);
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
        setShowTimePicker(true); // 👈 Chain to time picker automatically on Android
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    setShowTimePicker(true); // 👈 Chain to time picker on iOS
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (event.type === "set" && selectedTime) {
        const combined = new Date(tempDate);
        combined.setHours(selectedTime.getHours());
        combined.setMinutes(selectedTime.getMinutes());
        handleChange("when", combined.toISOString());
      }
    } else {
      if (selectedTime) setTempTime(selectedTime);
    }
  };

  const handleTimeConfirm = () => {
    const combined = new Date(tempDate);
    combined.setHours(tempTime.getHours());
    combined.setMinutes(tempTime.getMinutes());
    handleChange("when", combined.toISOString());
    setShowTimePicker(false);
  };

  // 👇 Helper to format ISO string for HTML datetime-local input (Web)
  const formatForWebInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16); // Returns "YYYY-MM-DDTHH:mm"
  };

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
            problemStatement: d2Data.problemStatement || "",
            what: d2Data.what || "",
            why: d2Data.why || "",
            where: d2Data.where || "",
            otherWhere: d2Data.otherWhere || "",
            when: d2Data.when || "",
            who: d2Data.who || "",
            how: d2Data.how || "",
            howMuch: d2Data.howMuch || "",
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D2 data:", error);
        addToast("Error loading D2 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D2FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.problemStatement.trim()) {
      addToast("Problem Statement is required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d2: [formData] };
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
        addToast("D2 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D2:", error);
      addToast(error?.message || "Failed to save D2 form", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = () => {
    const mockData: D2FormData = {
      eventId: formData.eventId,
      problemStatement:
        "Product X shows cracks after 2 hours of operation under normal load.",
      what: "Cracks in the casing",
      why: "Material fatigue due to substandard alloy",
      where: "Assembly Line",
      otherWhere: "",
      when: new Date().toISOString(),
      who: "Quality Control Team",
      how: "Visual inspection during routine check",
      howMuch: "Approx. 50 units affected, estimated cost $5000",
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D2 form auto-filled!", "success");
  };

  const getWhereDisplay = () => {
    if (formData.where === "Other" && formData.otherWhere) {
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
        <TouchableOpacity
          style={styles.autoFillButton}
          onPress={handleAutoFill}
        >
          <Icon name="zap" size={16} color="#FFFFFF" />
          <Text style={styles.autoFillButtonText}>Auto-fill</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" // 👈 ADD THIS
        nestedScrollEnabled={true} // 👈 ADD THIS
        pointerEvents="box-none" // 👈 ADD THIS
      >
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

        {/* Briefly Describe the Problem */}
        <View style={styles.fieldGroup} pointerEvents="box-none">
          {" "}
          {/* 👈 ADD wrapper with box-none */}
          <Text style={styles.label}>
            Briefly Describe the Problem <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            pointerEvents="auto" // 👈 ADD THIS
            collapsable={false} // 👈 ADD THIS
            value={formData.problemStatement}
            onChangeText={(text) => handleChange("problemStatement", text)}
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
                onChangeText={(text) => handleChange("what", text)}
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
                onChangeText={(text) => handleChange("why", text)}
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
                      formData.where === area && styles.dropdownOptionActive,
                    ]}
                    onPress={() => handleChange("where", area)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        formData.where === area &&
                          styles.dropdownOptionTextActive,
                      ]}
                    >
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formData.where === "Other" && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={formData.otherWhere}
                  onChangeText={(text) => handleChange("otherWhere", text)}
                  placeholder="Enter other location..."
                />
              )}
            </View>
          </View>

          <View style={styles.gridRight}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHEN did it occur?</Text>
              {Platform.OS === "web" ? (
                // @ts-ignore - HTML input is valid in RN Web
                <input
                  type="datetime-local"
                  value={formatForWebInput(formData.when)}
                  onChange={(e: any) => {
                    const localDate = new Date(e.target.value);
                    handleChange("when", localDate.toISOString());
                  }}
                  style={styles.webDateTimeInput as any}
                />
              ) : (
                // 👇 MOBILE PLATFORMS: Opens Date Picker, then Time Picker
                <TouchableOpacity
                  style={[styles.input, styles.dateTouchable]}
                  onPress={showDateTimePicker}
                >
                  <Text
                    style={
                      formData.when ? styles.dateText : styles.datePlaceholder
                    }
                  >
                    {formData.when
                      ? new Date(formData.when).toLocaleString()
                      : "Select Date & Time"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>WHO reported it?</Text>
              <TextInput
                style={styles.input}
                value={formData.who}
                onChangeText={(text) => handleChange("who", text)}
                placeholder="Person or team"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>HOW was it detected?</Text>
              <TextInput
                style={styles.input}
                value={formData.how}
                onChangeText={(text) => handleChange("how", text)}
                placeholder="Detection method"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>HOW much impact?</Text>
              <TextInput
                style={styles.input}
                value={formData.howMuch}
                onChangeText={(text) => handleChange("howMuch", text)}
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

      {/* Android Native Dialogs (No Modal wrapper needed) */}
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
    fontSize: isMobile ? 14 : 20,
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 1, // 👈 ADD THIS (Allows text to truncate with "...")
  },
  headerBadge: {
    fontSize: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    color: "#FFFFFF",
    flexShrink: 0, // 👈 ADD THIS
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
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  textAreaSmall: {
    minHeight: 50,
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  gridContainer: {
    flexDirection: isMobile ? "column" : "row",
    gap: 16,
  },
  gridLeft: {
    flex: 1,
  },
  gridRight: {
    flex: 1,
  },
  dropdownContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  dropdownOptionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  dropdownOptionTextActive: {
    color: "#FFFFFF",
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
  // --- Add these inside your StyleSheet.create ---
  webDateTimeInput: {
    width: "100%",
    boxSizing: "border-box", // Ensures border+padding are included in 100% width
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
