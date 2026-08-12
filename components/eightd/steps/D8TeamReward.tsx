// app/components/eightd/steps/D8TeamReward.tsx
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

export default function D8TeamReward({
  eventId,
  updateParent,
}: D8TeamRewardProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D8FormData>({
    eventId: eventId || "",
    rewardDescription: "",
    additionalRecommendations: "",
    teamLeaderName: "",
    signatureDate: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  const showDateTimePicker = () => {
    if (formData.signatureDate) {
      const d = new Date(formData.signatureDate);
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
        handleChange("signatureDate", combined.toISOString());
      }
    } else {
      if (selectedTime) setTempTime(selectedTime);
    }
  };

  const handleTimeConfirm = () => {
    const combined = new Date(tempDate);
    combined.setHours(tempTime.getHours());
    combined.setMinutes(tempTime.getMinutes());
    handleChange("signatureDate", combined.toISOString());
    setShowTimePicker(false);
  };

  // Helper to format ISO string for HTML datetime-local input (Web)
  const formatForWebInput = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  };
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
            rewardDescription: d8Data.rewardDescription || "",
            additionalRecommendations: d8Data.additionalRecommendations || "",
            teamLeaderName: d8Data.teamLeaderName || "",
            signatureDate: d8Data.signatureDate || "",
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D8 data:", error);
        addToast("Error loading D8 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D8FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = () => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    const mockData: D8FormData = {
      eventId: formData.eventId,
      rewardDescription:
        "The team will be rewarded with a bonus and a formal recognition letter from the Plant Manager.",
      additionalRecommendations:
        "Implement a digital tracking system for all 8D reports to improve visibility.",
      teamLeaderName: "John Doe",
      signatureDate: formattedDate,
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D8 form auto-filled!", "success");
  };

  const handleSubmit = async () => {
    if (!formData.teamLeaderName.trim()) {
      addToast("Team Leader Name is required", "error");
      return;
    }
    if (!formData.signatureDate) {
      addToast("Please select a date & time for the signature", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d8: [formData] };
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
        addToast("D8 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D8:", error);
      addToast(error?.message || "Failed to save D8 form", "error");
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
          <Text style={styles.label}>Reward Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.rewardDescription}
            onChangeText={(text) => handleChange("rewardDescription", text)}
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
            onChangeText={(text) =>
              handleChange("additionalRecommendations", text)
            }
            placeholder="Enter any additional recommendations..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Full Name of 8D Team Leader <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={formData.teamLeaderName}
            onChangeText={(text) => handleChange("teamLeaderName", text)}
            placeholder="Enter team leader name..."
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Date & Time <Text style={styles.required}>*</Text>
          </Text>
          {Platform.OS === "web" ? (
            // @ts-ignore - HTML input is valid in RN Web
            <input
              type="datetime-local"
              value={formatForWebInput(formData.signatureDate)}
              onChange={(e: any) => {
                if (!e.target.value) {
                  handleChange("signatureDate", "");
                  return;
                }
                const localDate = new Date(e.target.value);
                handleChange("signatureDate", localDate.toISOString());
              }}
              style={webDateTimeInputStyle}
            />
          ) : (
            <TouchableOpacity
              style={[styles.input, styles.dateTouchable]}
              onPress={showDateTimePicker}
            >
              <Text
                style={
                  formData.signatureDate
                    ? styles.dateText
                    : styles.datePlaceholder
                }
              >
                {formData.signatureDate
                  ? new Date(formData.signatureDate).toLocaleString()
                  : "Select Date & Time"}
              </Text>
            </TouchableOpacity>
          )}
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

// 👇 Defined outside StyleSheet because it uses raw web CSS properties
const webDateTimeInputStyle: any = {
  width: "100%",
  boxSizing: "border-box",
  display: "block",
  border: "1px solid #D1D5DB",
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
};

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
    gap: 8,
  },
  headerTitle: {
    fontSize: isMobile ? 16 : 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
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
  autoFillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  autoFillButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // --- Date & Time Picker Styles ---

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
