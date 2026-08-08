// app/components/eightd/steps/D6Implementation.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
          <TextInput
            style={styles.input}
            value={formData.implementationDate}
            onChangeText={(text) => handleChange("implementationDate", text)}
            placeholder="YYYY-MM-DDTHH:mm"
          />
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
});
