// app/components/eightd/steps/D1FormTeam.tsx
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

interface Supplier {
  name: string;
  role: string;
  department: string;
  contact: string;
  countryCode?: string;
  dialCode?: string;
}

interface Customer {
  name: string;
  role: string;
  department: string;
  contact: string;
  countryCode?: string;
  dialCode?: string;
}

interface D1FormData {
  eventId: string;
  teamLeader: string;
  dateFormed: string;
  responsibilities: string;
  suppliers: Supplier[];
  customers: Customer[];
  showCustomers: boolean;
}

interface D1FormTeamProps {
  eventId?: string | null;
  updateParent?: (data: D1FormData[]) => void;
}

export default function D1FormTeam({ eventId, updateParent }: D1FormTeamProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [formData, setFormData] = useState<D1FormData>({
    eventId: eventId || "",
    teamLeader: "",
    dateFormed: "",
    responsibilities: "",
    suppliers: [
      {
        name: "",
        role: "",
        department: "",
        contact: "",
        countryCode: "in",
        dialCode: "+91",
      },
    ],
    customers: [],
    showCustomers: false,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Keep tempDate in sync with formData.dateFormed
  useEffect(() => {
    if (formData.dateFormed) {
      const parts = formData.dateFormed.split("-");
      if (parts.length === 3) {
        setTempDate(
          new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
          ),
        );
      }
    } else {
      setTempDate(new Date());
    }
  }, [formData.dateFormed]);

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false); // Android dialog closes automatically
      if (event.type === "set" && selectedDate) {
        const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        handleChange("dateFormed", formattedDate);
      }
    } else {
      // iOS keeps spinner open until "Done" is pressed
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    const formattedDate = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, "0")}-${String(tempDate.getDate()).padStart(2, "0")}`;
    handleChange("dateFormed", formattedDate);
    setShowDatePicker(false);
  };

  // Load existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const response = await eightDAPI.getById(eventId);
        if (response?.success && response.data?.content?.d1?.[0]) {
          const d1Data = response.data.content.d1[0];

          // Process suppliers
          const suppliers = (d1Data.suppliers || []).map((s: any) => ({
            name: s.name || "",
            role: s.role || "",
            department: s.department || "",
            contact: s.contact || "",
            countryCode: s.countryCode || "in",
            dialCode: s.dialCode || "+91",
          }));

          // Process customers
          const customers = (d1Data.customers || []).map((c: any) => ({
            name: c.name || "",
            role: c.role || "",
            department: c.department || "",
            contact: c.contact || "",
            countryCode: c.countryCode || "in",
            dialCode: c.dialCode || "+91",
          }));

          setFormData({
            eventId: d1Data.eventId || eventId,
            teamLeader: d1Data.teamLeader || "",
            dateFormed: d1Data.dateFormed || "",
            responsibilities: d1Data.responsibilities || "",
            suppliers:
              suppliers.length > 0
                ? suppliers
                : [
                    {
                      name: "",
                      role: "",
                      department: "",
                      contact: "",
                      countryCode: "in",
                      dialCode: "+91",
                    },
                  ],
            customers: customers,
            showCustomers:
              (d1Data.customers && d1Data.customers.length > 0) || false,
          });
          setRecordId(eventId);
        }
      } catch (error) {
        console.error("Error fetching D1 data:", error);
        addToast("Error loading D1 data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleChange = (field: keyof D1FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (
    index: number,
    field: keyof Supplier,
    value: string,
  ) => {
    const newSuppliers = [...formData.suppliers];
    newSuppliers[index] = { ...newSuppliers[index], [field]: value };
    setFormData((prev) => ({ ...prev, suppliers: newSuppliers }));
  };

  const handleCustomerChange = (
    index: number,
    field: keyof Customer,
    value: string,
  ) => {
    const newCustomers = [...formData.customers];
    newCustomers[index] = { ...newCustomers[index], [field]: value };
    setFormData((prev) => ({ ...prev, customers: newCustomers }));
  };

  const addSupplier = () => {
    setFormData((prev) => ({
      ...prev,
      suppliers: [
        ...prev.suppliers,
        {
          name: "",
          role: "",
          department: "",
          contact: "",
          countryCode: "in",
          dialCode: "+91",
        },
      ],
    }));
  };

  const removeSupplier = (index: number) => {
    if (formData.suppliers.length <= 1) {
      addToast("At least one supplier is required", "warning");
      return;
    }
    const newSuppliers = formData.suppliers.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, suppliers: newSuppliers }));
  };

  const addCustomer = () => {
    setFormData((prev) => ({
      ...prev,
      customers: [
        ...prev.customers,
        {
          name: "",
          role: "",
          department: "",
          contact: "",
          countryCode: "in",
          dialCode: "+91",
        },
      ],
    }));
  };

  const removeCustomer = (index: number) => {
    const newCustomers = formData.customers.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, customers: newCustomers }));
  };

  const toggleCustomers = () => {
    setFormData((prev) => ({
      ...prev,
      showCustomers: !prev.showCustomers,
      customers: !prev.showCustomers ? [] : prev.customers,
    }));
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.teamLeader.trim()) {
      addToast("Team Leader is required", "error");
      return;
    }

    // Validate suppliers
    const invalidSupplier = formData.suppliers.some(
      (s) => !s.name.trim() || !s.role.trim(),
    );
    if (invalidSupplier) {
      addToast("All suppliers must have name and role", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = { d1: [formData] };
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
        addToast("D1 form saved successfully!", "success");
        if (updateParent) updateParent([formData]);
      }
    } catch (error: any) {
      console.error("Error saving D1:", error);
      addToast(error?.message || "Failed to save D1 form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2242a1" />
        <Text style={styles.loadingText}>Loading D1 data...</Text>
      </View>
    );
  }

  const handleAutoFill = () => {
    const mockData: D1FormData = {
      eventId: formData.eventId,
      teamLeader: "John Doe",
      dateFormed: new Date().toISOString().split("T")[0],
      responsibilities:
        "Investigate and resolve the reported issue efficiently.",
      suppliers: [
        {
          name: "Acme Corp",
          role: "Supplier",
          department: "Procurement",
          contact: "1234567890",
          countryCode: "in",
          dialCode: "+91",
        },
      ],
      customers: [],
      showCustomers: false,
    };
    setFormData(mockData);
    if (updateParent) updateParent([mockData]);
    addToast("D1 form auto-filled!", "success");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="users" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>D1 – Form the Team</Text>
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
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true} // 👈 CRITICAL: Allows scrolling/tapping inside parent ScrollViews/Modals
        pointerEvents="box-none" // 👈 CRITICAL: Lets touches pass through the ScrollView wrapper to the inputs
      >
        {/* Event ID */}
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

        {/* Team Leader */}
        <View style={styles.fieldGroup} pointerEvents="box-none">
          <Text style={styles.label}>
            Team Leader <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            pointerEvents="auto" // 👈 Forces this specific element to accept touches
            collapsable={false} // 👈 Prevents React Native from optimizing this View away and breaking touch handling
            value={formData.teamLeader}
            onChangeText={(text) => handleChange("teamLeader", text)}
            placeholder="Enter Team Leader Name"
          />
        </View>

        {/* Date Formed */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date Formed</Text>
          {Platform.OS === "web" ? (
            // @ts-ignore - HTML input is valid in RN Web
            <input
              type="date"
              value={formData.dateFormed}
              onChange={(e: any) => handleChange("dateFormed", e.target.value)}
              style={styles.webDateInput}
            />
          ) : (
            // 👇 MOBILE PLATFORMS: Opens native DateTimePicker modal
            <TouchableOpacity
              style={[styles.input, styles.dateTouchable]}
              onPress={showDatepicker}
            >
              <Text
                style={
                  formData.dateFormed ? styles.dateText : styles.datePlaceholder
                }
              >
                {formData.dateFormed || "Select Date"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Responsibilities */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Team Responsibilities</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.responsibilities}
            onChangeText={(text) => handleChange("responsibilities", text)}
            placeholder="Define team scope and responsibilities..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Suppliers */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Suppliers (Mandatory) <Text style={styles.required}>*</Text>
          </Text>
          {formData.suppliers.map((supplier, index) => (
            <View key={index} style={styles.memberCard}>
              <View style={styles.memberRow}>
                <View style={styles.memberField}>
                  <Text style={styles.memberLabel}>Name</Text>
                  <TextInput
                    style={styles.memberInput}
                    value={supplier.name}
                    onChangeText={(text) =>
                      handleSupplierChange(index, "name", text)
                    }
                    placeholder="Name"
                  />
                </View>
                <View style={styles.memberField}>
                  <Text style={styles.memberLabel}>Role</Text>
                  <TextInput
                    style={styles.memberInput}
                    value={supplier.role}
                    onChangeText={(text) =>
                      handleSupplierChange(index, "role", text)
                    }
                    placeholder="Role"
                  />
                </View>
              </View>
              <View style={styles.memberRow}>
                <View style={styles.memberField}>
                  <Text style={styles.memberLabel}>Department</Text>
                  <TextInput
                    style={styles.memberInput}
                    value={supplier.department}
                    onChangeText={(text) =>
                      handleSupplierChange(index, "department", text)
                    }
                    placeholder="Department"
                  />
                </View>
                <View style={[styles.memberField, { flex: 1.5 }]}>
                  <Text style={styles.memberLabel}>Contact</Text>
                  <TextInput
                    style={styles.memberInput}
                    value={supplier.contact}
                    onChangeText={(text) =>
                      handleSupplierChange(index, "contact", text)
                    }
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                  />
                </View>
                {formData.suppliers.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSupplier(index)}
                  >
                    <Icon name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addSupplier}>
            <Icon name="plus" size={16} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add Supplier</Text>
          </TouchableOpacity>
        </View>

        {/* Customers Toggle */}
        <TouchableOpacity style={styles.toggleButton} onPress={toggleCustomers}>
          <Icon
            name={formData.showCustomers ? "check-square" : "square"}
            size={20}
            color="#3B82F6"
          />
          <Text style={styles.toggleText}>Add Customers</Text>
        </TouchableOpacity>

        {/* Customers */}
        {formData.showCustomers && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Customers</Text>
            {formData.customers.map((customer, index) => (
              <View key={index} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={styles.memberField}>
                    <Text style={styles.memberLabel}>Name</Text>
                    <TextInput
                      style={styles.memberInput}
                      value={customer.name}
                      onChangeText={(text) =>
                        handleCustomerChange(index, "name", text)
                      }
                      placeholder="Name"
                    />
                  </View>
                  <View style={styles.memberField}>
                    <Text style={styles.memberLabel}>Role</Text>
                    <TextInput
                      style={styles.memberInput}
                      value={customer.role}
                      onChangeText={(text) =>
                        handleCustomerChange(index, "role", text)
                      }
                      placeholder="Role"
                    />
                  </View>
                </View>
                <View style={styles.memberRow}>
                  <View style={styles.memberField}>
                    <Text style={styles.memberLabel}>Department</Text>
                    <TextInput
                      style={styles.memberInput}
                      value={customer.department}
                      onChangeText={(text) =>
                        handleCustomerChange(index, "department", text)
                      }
                      placeholder="Department"
                    />
                  </View>
                  <View style={[styles.memberField, { flex: 1.5 }]}>
                    <Text style={styles.memberLabel}>Contact</Text>
                    <TextInput
                      style={styles.memberInput}
                      value={customer.contact}
                      onChangeText={(text) =>
                        handleCustomerChange(index, "contact", text)
                      }
                      placeholder="Phone number"
                      keyboardType="phone-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeCustomer(index)}
                  >
                    <Icon name="trash-2" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addCustomer}>
              <Icon name="plus" size={16} color="#3B82F6" />
              <Text style={styles.addButtonText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit D1</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal (iOS Bottom Sheet) */}
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
                  <Text style={styles.modalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                testID="dateTimePicker"
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                textColor="#000000" // Prevents invisible text in iOS Dark Mode
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Date Picker (Android Native Dialog) */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={tempDate}
          mode="date"
          display="default"
          onChange={onDateChange}
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
    padding: 12, // Slightly reduced padding for mobile
    backgroundColor: "#2242a1",
    borderTopWidth: 4,
    borderTopColor: "#EE161F",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1, // 👈 Takes all available space
    minWidth: 0, // 👈 Allows children to shrink below their content size
    marginRight: 8, // 👈 Guarantees space between the text and the button
  },
  headerTitle: {
    fontSize: isMobile ? 14 : 20, // 👈 Smaller, more compact font on mobile
    fontWeight: "600",
    color: "#FFFFFF",
    flexShrink: 1, // 👈 Allows the text to truncate with "..." if needed
  },
  headerBadge: {
    fontSize: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    color: "#FFFFFF",
    flexShrink: 0, // 👈 Prevents the badge from squishing
  },
  autoFillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0, // 👈 CRITICAL: Prevents the button from being pushed off-screen or squished
  },
  autoFillButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
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
  memberCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  memberRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  memberField: {
    flex: 1,
  },
  memberLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  memberInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  removeButton: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 14,
    color: "#1F2937",
  },
  submitButton: {
    backgroundColor: "#10B981",
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

  // --- Add these inside your StyleSheet.create ---
  webDateContainer: {
    padding: 0,
    justifyContent: "center",
  },
  webDateInput: {
    width: "100%",
    boxSizing: "border-box", // 👈 Ensures border+padding are included in the 100% width
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
  } as any,
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
