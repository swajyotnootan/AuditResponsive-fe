// app/components/eightd/steps/D4RootCause.tsx
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

interface D4FormData {
  eventId: string;
  rootCauseSummary: string;
  businessProcessFlaws: string;
  whyNotDetected: string;
}

interface D4RootCauseProps {
  eventId?: string | null;
  updateParent?: (data: D4FormData[]) => void;
}

export default function D4RootCause({
  eventId,
  updateParent,
}: D4RootCauseProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D4FormData>({
    eventId: eventId || "",
    rootCauseSummary: "",
    businessProcessFlaws: "Yes",
    whyNotDetected: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d4?.[0]) {
          const d4Data = response.data.content.d4[0];
          setFormData({
            eventId: d4Data.eventId || eventId,
            rootCauseSummary: d4Data.rootCauseSummary || "",
            businessProcessFlaws: d4Data.businessProcessFlaws || "Yes",
            whyNotDetected: d4Data.whyNotDetected || "",
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D4 data:", error);
        addToast("Error loading D4 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D4FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = () => {
    const mockData: D4FormData = {
      eventId: formData.eventId,
      rootCauseSummary:
        "The root cause is the use of a substandard alloy in the manufacturing process, which fails under normal operational stress.",
      businessProcessFlaws: "Yes",
      whyNotDetected:
        "The incoming material inspection checklist did not include a stress test for this specific alloy batch.",
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D4 form auto-filled!", "success");
  };

  const handleSubmit = async () => {
    if (!formData.rootCauseSummary.trim()) {
      addToast("Root Cause Summary is required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d4: [formData] };
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
        addToast("D4 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D4:", error);
      addToast(error?.message || "Failed to save D4 form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D4 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="lightbulb" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D4 – Root Cause Analysis</Text>
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
            Root Cause Summary <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.rootCauseSummary}
            onChangeText={(text) => handleChange("rootCauseSummary", text)}
            placeholder="Describe the root cause..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Does the Root Cause reveal flaws in business processes?
          </Text>
          <View style={styles.radioGroup}>
            {["Yes", "No"].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  formData.businessProcessFlaws === option &&
                    styles.radioOptionActive,
                ]}
                onPress={() => handleChange("businessProcessFlaws", option)}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.businessProcessFlaws === option &&
                      styles.radioCircleActive,
                  ]}
                >
                  {formData.businessProcessFlaws === option && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Reason problem was not detected/resolved
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.whyNotDetected}
            onChangeText={(text) => handleChange("whyNotDetected", text)}
            placeholder="Explain why the issue was not detected..."
            multiline
            numberOfLines={3}
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
            <Text style={styles.submitButtonText}>Save D4</Text>
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
});
