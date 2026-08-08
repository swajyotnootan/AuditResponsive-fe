// app/components/eightd/steps/D5CorrectiveActions.tsx
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

const predefinedActions = [
  "Hiring additional staff to reduce workload and improve safety and quality standards.",
  "Introducing read-do and do-confirm pre-surgery checklists to ensure safety protocols are followed.",
  "Imposing stricter penalties to staff committing documentation errors.",
  "Assigning staff to monitor IV line errors and conduct monthly huddles for vigilance.",
];

interface ActionItem {
  action: string;
}

interface D5FormData {
  eventId: string;
  actions: ActionItem[];
}

interface D5CorrectiveActionsProps {
  eventId?: string | null;
  updateParent?: (data: D5FormData[]) => void;
}

export default function D5CorrectiveActions({
  eventId,
  updateParent,
}: D5CorrectiveActionsProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [customActionInput, setCustomActionInput] = useState("");

  const [formData, setFormData] = useState<D5FormData>({
    eventId: eventId || "",
    actions: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d5?.[0]) {
          const d5Data = response.data.content.d5[0];

          let actions: ActionItem[] = [];
          if (Array.isArray(d5Data.actions)) {
            actions = d5Data.actions.map((item: any) => {
              if (typeof item === "string") {
                return { action: item };
              }
              return { action: item.action || "" };
            });
          }

          setFormData({
            eventId: d5Data.eventId || eventId,
            actions: actions,
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D5 data:", error);
        addToast("Error loading D5 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const toggleAction = (actionText: string) => {
    setFormData((prev) => {
      const exists = prev.actions.some((a) => a.action === actionText);
      if (exists) {
        return {
          ...prev,
          actions: prev.actions.filter((a) => a.action !== actionText),
        };
      } else {
        return { ...prev, actions: [...prev.actions, { action: actionText }] };
      }
    });
  };

  const addCustomAction = () => {
    const actionText = customActionInput.trim();
    if (!actionText) {
      addToast("Please enter an action", "warning");
      return;
    }
    if (formData.actions.some((a) => a.action === actionText)) {
      addToast("This action already exists", "warning");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      actions: [...prev.actions, { action: actionText }],
    }));
    setCustomActionInput("");
  };

  const removeAction = (actionText: string) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.action !== actionText),
    }));
  };

  const handleAutoFill = () => {
    const mockData: D5FormData = {
      eventId: formData.eventId,
      actions: [
        {
          action:
            "Hiring additional staff to reduce workload and improve safety and quality standards.",
        },
        {
          action:
            "Introducing read-do and do-confirm pre-surgery checklists to ensure safety protocols are followed.",
        },
      ],
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D5 form auto-filled!", "success");
  };
  const handleSubmit = async () => {
    if (formData.actions.length === 0) {
      addToast("Please select at least one corrective action", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d5: [formData] };
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
        addToast("D5 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D5:", error);
      addToast(error?.message || "Failed to save D5 form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D5 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="clipboard" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>
            D5 – Permanent Corrective Actions
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
            onChangeText={(text) => setFormData({ ...formData, eventId: text })}
            placeholder="Enter Event ID"
            editable={false}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Corrective Actions <Text style={styles.required}>*</Text>
          </Text>

          <Text style={styles.sectionLabel}>Predefined Actions:</Text>
          {predefinedActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.checkboxOption,
                formData.actions.some((a) => a.action === action) &&
                  styles.checkboxOptionActive,
              ]}
              onPress={() => toggleAction(action)}
            >
              <View
                style={[
                  styles.checkbox,
                  formData.actions.some((a) => a.action === action) &&
                    styles.checkboxActive,
                ]}
              >
                {formData.actions.some((a) => a.action === action) && (
                  <Icon name="check" size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.checkboxText}>{action}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Custom Actions:
          </Text>
          <View style={styles.addCustomContainer}>
            <TextInput
              style={[styles.input, styles.customInput]}
              value={customActionInput}
              onChangeText={setCustomActionInput}
              placeholder="Type custom corrective action"
            />
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={addCustomAction}
            >
              <Icon name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addCustomButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {formData.actions.length > 0 && (
            <View style={styles.selectedActions}>
              <Text style={styles.selectedLabel}>Selected Actions:</Text>
              {formData.actions.map((item, idx) => (
                <View key={idx} style={styles.selectedAction}>
                  <Text style={styles.selectedActionText}>{item.action}</Text>
                  <TouchableOpacity onPress={() => removeAction(item.action)}>
                    <Icon name="x" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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
            <Text style={styles.submitButtonText}>Save D5</Text>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
    marginBottom: 6,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  checkboxOptionActive: {
    opacity: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
  },
  addCustomContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
  },
  addCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addCustomButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  selectedActions: {
    marginTop: 12,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  selectedAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  selectedActionText: {
    flex: 1,
    fontSize: 13,
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
