// app/components/eightd/steps/D3InterimContainment.tsx
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

interface ActionItem {
  action: string;
  rating: number;
}

interface D3FormData {
  eventId: string;
  problemStatement: string;
  hasContainment: string;
  actions: ActionItem[];
}

interface D3InterimContainmentProps {
  eventId?: string | null;
  updateParent?: (data: D3FormData[]) => void;
}

export default function D3InterimContainment({
  eventId,
  updateParent,
}: D3InterimContainmentProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [newAction, setNewAction] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const [formData, setFormData] = useState<D3FormData>({
    eventId: eventId || "",
    problemStatement: "",
    hasContainment: "No",
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
        if (response?.success && response.data?.content?.d3?.[0]) {
          const d3Data = response.data.content.d3[0];

          let actions: ActionItem[] = [];
          if (Array.isArray(d3Data.actions)) {
            actions = d3Data.actions.map((item: any) => {
              if (typeof item === "string") {
                return { action: item, rating: 5 };
              }
              return {
                action: item.action || item.actionText || "",
                rating: typeof item.rating === "number" ? item.rating : 5,
              };
            });
          }

          setFormData({
            eventId: d3Data.eventId || eventId,
            problemStatement: d3Data.problemStatement || "",
            hasContainment: d3Data.hasContainment || "No",
            actions: actions,
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D3 data:", error);
        addToast("Error loading D3 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D3FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = () => {
    const mockData: D3FormData = {
      eventId: formData.eventId,
      problemStatement: "Product X shows cracks after 2 hours of operation.",
      hasContainment: "Yes",
      actions: [
        { action: "Quarantine all affected batches immediately.", rating: 5 },
      ],
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D3 form auto-filled!", "success");
  };

  const addAction = () => {
    if (newAction.trim()) {
      setFormData((prev) => ({
        ...prev,
        actions: [...prev.actions, { action: newAction.trim(), rating: 5 }],
      }));
      setNewAction("");
    }
  };

  const deleteAction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(formData.actions[index].action);
  };

  const saveEdit = (index: number) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = {
      ...updatedActions[index],
      action: editValue.trim(),
    };
    setFormData((prev) => ({ ...prev, actions: updatedActions }));
    setEditingIndex(null);
    setEditValue("");
  };

  const updateRating = (index: number, rating: number) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], rating };
    setFormData((prev) => ({ ...prev, actions: updatedActions }));
  };

  const StarRating = ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (rating: number) => void;
  }) => (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          style={styles.starButton}
          onPress={() => onChange(star)}
        >
          <Icon
            name="star"
            size={16}
            color={star <= (hoverValue ?? value) ? "#F59E0B" : "#D1D5DB"}
          />
        </TouchableOpacity>
      ))}
      <Text style={styles.starText}>{value}/5</Text>
    </View>
  );

  const handleSubmit = async () => {
    if (formData.hasContainment === "Yes" && formData.actions.length === 0) {
      addToast("Please add at least one containment action", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d3: [formData] };
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
        addToast("D3 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D3:", error);
      addToast(error?.message || "Failed to save D3 form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D3 data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="shield" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>
            D3 – Interim Containment Actions
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
          <Text style={styles.label}>Problem Statement</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.problemStatement}
            onChangeText={(text) => handleChange("problemStatement", text)}
            placeholder="Reference the problem statement with 5W2H"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Are there interim containment actions?
          </Text>
          <View style={styles.radioGroup}>
            {["Yes", "No"].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.radioOption,
                  formData.hasContainment === option &&
                    styles.radioOptionActive,
                ]}
                onPress={() => handleChange("hasContainment", option)}
              >
                <View
                  style={[
                    styles.radioCircle,
                    formData.hasContainment === option &&
                      styles.radioCircleActive,
                  ]}
                >
                  {formData.hasContainment === option && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {formData.hasContainment === "Yes" && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Containment Actions</Text>

            {formData.actions.map((item, index) => (
              <View key={index} style={styles.actionCard}>
                <View style={styles.actionRow}>
                  <View style={styles.actionNumber}>
                    <Text style={styles.actionNumberText}>{index + 1}</Text>
                  </View>
                  {editingIndex === index ? (
                    <TextInput
                      style={[styles.input, styles.actionInput]}
                      value={editValue}
                      onChangeText={setEditValue}
                      placeholder="Edit action"
                    />
                  ) : (
                    <Text style={styles.actionText}>
                      <Icon name="check" size={14} color="#10B981" />
                      {item.action}
                    </Text>
                  )}
                  <View style={styles.actionButtons}>
                    {editingIndex === index ? (
                      <>
                        <TouchableOpacity onPress={() => saveEdit(index)}>
                          <Icon name="check" size={16} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingIndex(null)}>
                          <Icon name="x" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity onPress={() => startEdit(index)}>
                          <Icon name="edit-2" size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteAction(index)}>
                          <Icon name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                {editingIndex !== index && (
                  <StarRating
                    value={item.rating}
                    onChange={(val) => updateRating(index, val)}
                  />
                )}
              </View>
            ))}

            <View style={styles.addActionContainer}>
              <TextInput
                style={[styles.input, styles.addActionInput]}
                value={newAction}
                onChangeText={setNewAction}
                placeholder="Enter an action and press Add..."
                onSubmitEditing={addAction}
              />
              <TouchableOpacity
                style={styles.addActionButton}
                onPress={addAction}
              >
                <Icon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addActionButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Save D3</Text>
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
  actionCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  actionNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  actionInput: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  starContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  starButton: {
    padding: 2,
  },
  starText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  addActionContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  addActionInput: {
    flex: 1,
  },
  addActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
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
