// components/comform/EmailNotificationModal.tsx
// React Native version of your JSX Email Modal

import { API_BASE_URL } from "@/config/apiConfig";
import { Mail, MessageSquare, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface User {
  id: string | number;
  username?: string;
  name?: string;
  email: string;
  role?: string;
}

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId: string | number;
  mode?: "submit" | "approve" | "reject";
  approvalComment?: string;
  onProceed?: () => Promise<void>;
}

// =============================================
// Custom Native Dropdown Component
// =============================================
// =============================================
// Custom Native Dropdown Component (Now Creatable)
// =============================================
// =============================================
// Custom Native Dropdown Component (Now Creatable)
// =============================================
const NativeDropdown = ({
  options,
  value,
  onChange,
  placeholder,
  isMulti = false,
}: any) => {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Filter options based on search text
  const filteredOptions = options.filter((opt: any) =>
    opt.label.toLowerCase().includes(searchText.toLowerCase())
  );

  // Check if the search text looks like an email
  const isValidEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text);
  };

  const handleSelect = (option: any) => {
    if (isMulti) {
      const isSelected = value.some((v: any) => v.value === option.value);
      if (isSelected) {
        onChange(value.filter((v: any) => v.value !== option.value));
      } else {
        onChange([...value, option]);
      }
    } else {
      onChange(option);
      setVisible(false);
    }
    setSearchText("");
  };

  // Handle creating a new email from search text
  const handleCreateNew = () => {
    if (isValidEmail(searchText)) {
      const newOption = {
        value: searchText,
        label: `Send to: ${searchText}`,
        email: searchText,
      };
      if (isMulti) {
        onChange([...value, newOption]);
      } else {
        onChange(newOption);
        setVisible(false);
      }
      setSearchText("");
    }
  };

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>
          {isMulti
            ? value.length > 0
              ? value.map((v: any) => v.label).join(", ")
              : placeholder
            : value
            ? value.label
            : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        {/* ✅ FIX: Use 'TouchableWithoutFeedback' or stop propagation */}
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()} // ✅ PREVENTS CLOSING ON TYPING
            style={styles.dropdownModal}
          >
            {/* Search Input to type new email */}
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder="Type email and press Enter..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              onSubmitEditing={handleCreateNew}
            />

            <ScrollView style={{ maxHeight: 300 }}>
              {filteredOptions.map((opt: any) => {
                const isSelected = isMulti
                  ? value.some((v: any) => v.value === opt.value)
                  : value?.value === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => handleSelect(opt)}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* "Create new" button when search text is a valid email */}
              {searchText.length > 0 && isValidEmail(searchText) && (
                <TouchableOpacity
                  onPress={handleCreateNew}
                  style={styles.dropdownCreateItem}
                >
                  <Text style={styles.dropdownCreateText}>
                    ➕ Add "{searchText}"
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// =============================================
// Main Modal Component
// =============================================
export default function EmailNotificationModal({
  isOpen,
  onClose,
  inspectionId,
  mode = "submit",
  approvalComment = "",
  onProceed,
}: EmailNotificationModalProps) {
  const [activeTab, setActiveTab] = useState<"email" | "sms">("email");
  const [users, setUsers] = useState<User[]>([]);
  const [toOptions, setToOptions] = useState<any[]>([]);
  const [ccOptions, setCcOptions] = useState<any[]>([]);
  const [selectedTo, setSelectedTo] = useState<any>(null);
  const [selectedCc, setSelectedCc] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [plainBody, setPlainBody] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderRole, setSenderRole] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ✅ Wrap plain text into the official company email HTML template (for backend)
  const wrapInOfficialTemplate = (plainText: string, name: string, role: string, id: string | number) => {
    const userHtml = plainText
      .split("\n\n")
      .filter((line) => line.trim() !== "")
      .map(
        (line) =>
          `<p style="margin: 0 0 16px 0; line-height: 1.6;">${line
            .trim()
            .replace(/\n/g, "<br>")}</p>`
      )
      .join("");

    return `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #003B82 0%, #0096D6 100%); color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 600;">Renewsys Quality Assurance</h2>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Inspection Notification System</p>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #333; background: #ffffff;">
          ${userHtml}
        </div>
        <div style="background: #f9fafb; padding: 16px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 4px 0; font-weight: 600;">Renewsys India Pvt. Ltd.</p>
          <p style="margin: 4px 0;">📧 quality@renewsys.com | 📞 +91-XXXX-XXXXXX</p>
          <p style="margin: 4px 0;">🌐 www.renewsys.com</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 10px auto; width: 80%;">
          <p style="margin: 8px 0 0; font-style: italic; color: #9ca3af;">
            This is an automated message from the QA Inspection System (ID: ${id}).<br/>
            Please do not reply directly to this email.
          </p>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        // ✅ Native fetch to fetch active users
        const res = await fetch(`${API_BASE_URL}/api/users/active`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const allUsers: User[] = await res.json();

        // Check AsyncStorage for current user
        // Note: We assume 'user' exists in storage from login
        const storedUserStr = await (require("@react-native-async-storage/async-storage").default.getItem("user"));
        let currentUser: User | null = null;
              if (storedUserStr) {
        currentUser = JSON.parse(storedUserStr);
        
        // ✅ SAFE CHECK: Ensure currentUser exists before using it
        const name = currentUser?.name || currentUser?.username || "User";
        const email = currentUser?.email || "";
        const role = currentUser?.role || "";
        
        setSenderName(name);
        setSenderEmail(email);
        setSenderRole(role);

          // Set default subject and body based on mode
          let defaultSubject = "";
          let defaultPlainBody = "";

          if (mode === "approve") {
            defaultSubject = `Inspection Report Approved – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Initiator,

Your inspection report (ID: ${inspectionId}) has been approved by the HOD.

Approval Comment:
${approvalComment || "No comment provided."}

Thank you for your diligence and attention to quality.

Best regards,
${name} (${role})
`.trim();
          } else if (mode === "reject") {
            defaultSubject = `Inspection Report Rejected – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Initiator,

Your inspection report (ID: ${inspectionId}) has been rejected by the HOD.

Rejection Reason:
${approvalComment || "No reason provided."}

Please review the feedback, make necessary corrections, and resubmit.

Best regards,
${name} (${role})
`.trim();
          } else {
            defaultSubject = `Inspection Report Submitted – ID: ${inspectionId}`;
            defaultPlainBody = `
Dear Team,

The inspection report for the following details has been successfully completed and submitted:

- Inspection ID: ${inspectionId}
- Date: ${new Date().toLocaleDateString()}

Please review the report at your earliest convenience.

Best regards,
${name} (${role})
`.trim();
          }

          setSubject(defaultSubject);
          setPlainBody(defaultPlainBody);
        }

        // Filter To options based on mode & role
        let toOpts: User[] = [];
        if (mode === "submit") {
          if (currentUser?.role?.toUpperCase() === "INITIATOR") {
            toOpts = allUsers.filter((u) => u.role?.toUpperCase() === "HOD");
          } else if (currentUser?.role?.toUpperCase() === "HOD") {
            toOpts = allUsers.filter((u) => u.role?.toUpperCase() === "INITIATOR");
          } else {
            toOpts = allUsers;
          }
        } else if (mode === "approve" || mode === "reject") {
          toOpts = allUsers.filter((u) => u.role?.toUpperCase() === "INITIATOR");
        }

        setToOptions(
          toOpts.map((user) => ({
            value: user.email,
            label: `${user.username || user.name || "User"} (${user.role}) <${user.email}>`,
            email: user.email,
          }))
        );

        // CC: only renewsys emails
        const ccOpts = allUsers.filter(
          (user) => user.email && user.email.toLowerCase().includes("renewsys")
        );
        setCcOptions(
          ccOpts.map((user) => ({
            value: user.email,
            label: `${user.username || user.name} <${user.email}>`,
            email: user.email,
          }))
        );

        setUsers(allUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        Alert.alert("Error", "Could not load user list.");
      }
    };

    fetchUsers();
  }, [isOpen, inspectionId, mode, approvalComment]);

  const handleSendEmailAndProceed = async () => {
    if (mode !== "submit" && !selectedTo) {
      Alert.alert("Error", "Please select an initiator to notify.");
      return;
    }

    try {
      setIsSending(true);

      if (selectedTo) {
        const htmlBody = wrapInOfficialTemplate(
          plainBody,
          senderName,
          senderRole,
          inspectionId
        );

        const payload = {
          from: senderEmail,
          to: [selectedTo.value],
          cc: selectedCc.map((opt: any) => opt.value),
          subject: subject.trim(),
          body: htmlBody.trim(),
          inspectionId,
        };

        // ✅ Native fetch to the backend (NO auth token required, just like your JSX)
        const response = await fetch(`${API_BASE_URL}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (response.ok && result.success === true) {
          Alert.alert("Success", "✅ Email sent successfully!");
        } else {
          Alert.alert(
            "Error",
            `❌ Email failed: ${result.message || "Unknown error"}`
          );
        }
      }

      // Proceed with main action (submit/approve/reject)
      if (typeof onProceed === "function") {
        await onProceed();
      }
    } catch (err: any) {
      console.error("Email send failed:", err);
      Alert.alert("Error", `❌ Failed to send email: ${err.message || "Network error"}`);
    } finally {
      setIsSending(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === "approve"
                ? "Approve & Notify"
                : mode === "reject"
                ? "Reject & Notify"
                : "Notify & Submit"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "email" && styles.tabActive]}
              onPress={() => setActiveTab("email")}
            >
              <Mail size={16} color={activeTab === "email" ? "#2563eb" : "#6b7280"} />
              <Text style={[styles.tabText, activeTab === "email" && styles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "sms" && styles.tabActive]}
              onPress={() => setActiveTab("sms")}
            >
              <MessageSquare size={16} color={activeTab === "sms" ? "#2563eb" : "#6b7280"} />
              <Text style={[styles.tabText, activeTab === "sms" && styles.tabTextActive]}>
                SMS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.formContent}>
            {activeTab === "email" ? (
              <View style={styles.formContainer}>
                {/* To */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>To *</Text>
                  <NativeDropdown
                    options={toOptions}
                    value={selectedTo}
                    onChange={setSelectedTo}
                    placeholder="Select recipient..."
                    isMulti={false}
                  />
                </View>

                {/* CC */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>CC</Text>
                  <NativeDropdown
                    options={ccOptions}
                    value={selectedCc}
                    onChange={setSelectedCc}
                    placeholder="Add CC recipients..."
                    isMulti={true}
                  />
                </View>

                {/* Subject */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Subject</Text>
                  <TextInput
                    style={styles.input}
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Enter subject..."
                  />
                </View>

                {/* Message */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Message</Text>
                  <TextInput
                    style={styles.textArea}
                    value={plainBody}
                    onChangeText={setPlainBody}
                    placeholder="Type your message here..."
                    multiline
                    numberOfLines={10}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.smsContainer}>
                <Text style={styles.smsTitle}>📱</Text>
                <Text style={styles.smsText}>SMS Notification</Text>
                <Text style={styles.smsSubtext}>
                  SMS service is coming soon.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendEmailAndProceed}
              disabled={isSending || (mode !== "submit" && !selectedTo)}
              style={[
                styles.submitButton,
                isSending && styles.submitButtonDisabled,
                mode === "approve" && styles.approveButton,
                mode === "reject" && styles.rejectButton,
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === "approve"
                    ? "Send Email & Approve"
                    : mode === "reject"
                    ? "Send Email & Reject"
                    : "Send Email & Submit"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// =============================================
// Styles
// =============================================
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    
  },
  modalContent: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#003B82",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#2563eb",
  },
  formContent: {
    // flex: 1,
    padding: 16,
  },
  formContainer: {
    gap: 16,
  },
  fieldContainer: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "white",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "white",
    minHeight: 120,
  },
  smsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  smsTitle: {
    fontSize: 48,
  },
  smsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  smsSubtext: {
    fontSize: 14,
    color: "#6b7280",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 6,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  submitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    minWidth: 100,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  approveButton: {
    backgroundColor: "#16a34a",
  },
  rejectButton: {
    backgroundColor: "#dc2626",
  },
  // Dropdown styles
  dropdownContainer: {
    position: "relative",
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "white",
  },
  dropdownText: {
    fontSize: 14,
    color: "#1f2937",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModal: {
    width: "80%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    maxHeight: 400,
  },
    dropdownSearchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  dropdownCreateItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
  },
  dropdownCreateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  dropdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemSelected: {
    backgroundColor: "#eff6ff",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownItemTextSelected: {
    color: "#2563eb",
    fontWeight: "500",
  },
});