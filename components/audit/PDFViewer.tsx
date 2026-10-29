// components/audit/PDFViewer.tsx
// ✅ FULL FEATURES: Download, Print, Highlight, Text, Share, Email, Teams, QR Code
// ✅ REAL PDF HIGHLIGHTING & ANNOTATION

import { fetchUser8DGroups } from "@/components/forum/Api/forumapi";
import { API_BASE_URL } from "@/config/apiConfig";
import { pdfService } from "@/services/pdfService";
import { BlurView } from "expo-blur";
import * as Sharing from "expo-sharing";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Highlighter,
  Link,
  Mail,
  MessageCircle,
  Printer,
  QrCode,
  Send,
  Share,
  Type,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  Dimensions,
  Image, // ✅ ADD THIS
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// ============================================================
// TYPES
// ============================================================
interface ForumGroup {
  id: string;
  name: string;
  type: string;
}

interface Highlight {
  id: string;
  text: string;
  color: string;
  page: number;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Annotation {
  id: string;
  text: string;
  page: number;
  x: number;
  y: number;
  author?: string;
  timestamp?: string;
}

interface PDFViewerProps {
  visible: boolean;
  pdfData: string;
  fileName: string;
  auditId: string;
  auditNumber?: string;
  forumGroups?: ForumGroup[];
  onClose: () => void;
  onShareComplete?: (forumId?: string) => void;
  currentUser: any;
  plantId?: string | number | null; // 👈 ADD
  plantName?: string | null; // 👈 ADD
  onNavigateToForum?: (forumId: string) => void;
  allUsers?: any[]; // ✅ ADD THIS - list of all users for email search
  pdfType?:
    | "form3"
    | "form4"
    | "form5"
    | "ncr"
    | "8d"
    | "corrective-action"
    | "iatf"
    | "manufacturing"
    | "5s";
  formVariant?: "form7" | "form8" | "ncr2"; // ✅ ADD THIS

  selectedMonth?: string; // ✅ ADD THIS for Form5
  fromDetailedView?: boolean; // ✅ ADD THIS
}

// ============================================================
// PDF RENDERER COMPONENT
// ============================================================
interface PDFRendererProps {
  pdfData: string;
  fileName: string;
  zoomLevel: number;
  onTextSelect: (text: string, rect: any) => void;
  highlights: Highlight[];
  annotations: Annotation[];
}

const PDFRenderer: React.FC<PDFRendererProps> = ({
  pdfData,
  fileName,
  zoomLevel,
  onTextSelect,
  highlights,
  annotations,
}) => {
  const [selectedText, setSelectedText] = useState("");
  const [selectionRect, setSelectionRect] = useState<any>(null);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(selectedText);
      setSelectionRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
      setShowSelectionToolbar(true);
      onTextSelect(selectedText, rect);
    } else {
      setShowSelectionToolbar(false);
    }
  };

  if (Platform.OS === "web") {
    return (
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "auto",
          backgroundColor: "#f3f4f6",
          position: "relative",
        }}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
            width: `${100 / zoomLevel}%`,
            height: `${100 / zoomLevel}%`,
            padding: "40px",
          }}
        >
          <iframe
            src={pdfData}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            }}
            title={fileName}
          />
        </div>

        {showSelectionToolbar && selectedText && (
          <div
            style={{
              position: "fixed",
              top: selectionRect ? selectionRect.y - 60 : 0,
              left: selectionRect
                ? selectionRect.x + selectionRect.width / 2 - 100
                : 0,
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex",
              gap: "8px",
              zIndex: 1000,
              borderWidth: "1px",
              borderColor: "#e5e7eb",
            }}
          >
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#eab308",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "600",
              }}
              onClick={() => {
                onTextSelect(selectedText, selectionRect);
                setShowSelectionToolbar(false);
              }}
            >
              <Highlighter size={16} color="white" />
              Highlight
            </button>
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "600",
              }}
              onClick={() => {
                const annotationText = prompt("Enter annotation text:");
                if (annotationText) {
                  onTextSelect(annotationText, selectionRect);
                }
                setShowSelectionToolbar(false);
              }}
            >
              <Type size={16} color="white" />
              Annotate
            </button>
            <button
              style={{
                padding: "8px 8px",
                backgroundColor: "transparent",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#6b7280",
              }}
              onClick={() => setShowSelectionToolbar(false)}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <FileText size={60} color="#1e3a8a" />
      <Text style={styles.pdfMobileText}>{fileName}</Text>
      <Text style={styles.pdfMobileSubtext}>
        Tap Download to view and annotate this PDF
      </Text>
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>
          {highlights.length} highlights • {annotations.length} annotations
        </Text>
      </View>
    </View>
  );
};

// ============================================================
// HIGHLIGHTS & ANNOTATIONS LIST
// ============================================================
interface HighlightsListProps {
  highlights: Highlight[];
  annotations: Annotation[];
  onRemoveHighlight: (id: string) => void;
  onRemoveAnnotation: (id: string) => void;
}

const HighlightsList: React.FC<HighlightsListProps> = ({
  highlights,
  annotations,
  onRemoveHighlight,
  onRemoveAnnotation,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (highlights.length === 0 && annotations.length === 0) {
    return null;
  }

  return (
    <View style={styles.highlightsPanel}>
      <TouchableOpacity
        style={styles.highlightsHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.highlightsTitle}>
          📌 Annotations ({highlights.length + annotations.length})
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.highlightsList} nestedScrollEnabled>
          {highlights.map((highlight) => (
            <View key={highlight.id} style={styles.highlightItem}>
              <View
                style={[
                  styles.highlightColor,
                  { backgroundColor: highlight.color },
                ]}
              />
              <Text style={styles.highlightText} numberOfLines={2}>
                {highlight.text}
              </Text>
              <TouchableOpacity
                onPress={() => onRemoveHighlight(highlight.id)}
                style={styles.highlightRemove}
              >
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          {annotations.map((annotation) => (
            <View key={annotation.id} style={styles.annotationItem}>
              <View style={styles.annotationIcon}>
                <Type size={14} color="#2563eb" />
              </View>
              <Text style={styles.annotationText} numberOfLines={2}>
                {annotation.text}
              </Text>
              <TouchableOpacity
                onPress={() => onRemoveAnnotation(annotation.id)}
                style={styles.highlightRemove}
              >
                <X size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ============================================================
// SHARE OPTIONS PANEL
// ============================================================
// ============================================================
// SHARE OPTIONS PANEL - Compact & Professional
// ============================================================
// ============================================================
// SHARE OPTIONS PANEL - Fixed with proper flow
// ============================================================
interface ShareOptionsPanelProps {
  visible: boolean;
  onClose: () => void;
  onOptionSelect: (option: string) => void;
  fileName: string;
}

const ShareOptionsPanel: React.FC<ShareOptionsPanelProps> = ({
  visible,
  onClose,
  onOptionSelect,
  fileName,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const options = [
    {
      id: "forum",
      icon: MessageCircle,
      label: "Audit Forum",
      color: "#7c3aed",
      bgColor: "#f3e8ff",
      description: "Share with audit team",
    },
    {
      id: "teams",
      icon: Users,
      label: "Microsoft Teams",
      color: "#0ea5e9",
      bgColor: "#eff6ff",
      description: "Share in Teams channel",
    },
    {
      id: "email",
      icon: Mail,
      label: "Email",
      color: "#2563eb",
      bgColor: "#eff6ff",
      description: "Send via email",
    },
    {
      id: "link",
      icon: Link,
      label: "Copy Link",
      color: "#6b7280",
      bgColor: "#f3f4f6",
      description: "Copy document link",
    },
    {
      id: "qr",
      icon: QrCode,
      label: "QR Code",
      color: "#8b5cf6",
      bgColor: "#f3e8ff",
      description: "Scan to open",
    },
  ];

  // ✅ Handle option selection - close panel THEN call the handler
  // In ShareOptionsPanel.tsx - Updated handleOptionPress

  const handleOptionPress = (optionId: string) => {
    console.log("🔵 [ShareOptionsPanel] Option selected:", optionId);

    // ✅ DON'T close the share panel - keep it open behind
    // Just call the option handler directly
    onOptionSelect(optionId);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.shareOverlay}>
        {/* Background overlay - click to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{ width: "100%", alignItems: "center" }}
        >
          <Animated.View
            style={[
              styles.sharePanel,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.shareHandleBar} />

            {/* Header */}
            <View style={styles.shareHeader}>
              <View style={styles.shareHeaderLeft}>
                <View style={styles.shareHeaderIcon}>
                  <Share size={20} color="#7c3aed" />
                </View>
                <View>
                  <Text style={styles.shareHeaderTitle}>Share Document</Text>
                  <Text style={styles.shareHeaderSubtitle}>
                    Choose how to share this document
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.shareCloseBtn}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Document Name */}
            <View style={styles.shareDocContainer}>
              <FileText size={16} color="#6b7280" />
              <Text style={styles.shareDocName} numberOfLines={1}>
                {fileName}
              </Text>
            </View>

            {/* Options Grid */}
            <View style={styles.shareOptionsGrid}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.shareOptionCard}
                  onPress={() => handleOptionPress(opt.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.shareOptionIcon,
                      { backgroundColor: opt.bgColor },
                    ]}
                  >
                    <opt.icon size={24} color={opt.color} />
                  </View>
                  <Text style={styles.shareOptionLabel}>{opt.label}</Text>
                  <Text style={styles.shareOptionDesc}>{opt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Footer Note */}
            <View style={styles.shareFooter}>
              <Text style={styles.shareFooterText}>
                🔒 All shares are secure and tracked
              </Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ============================================================
// EMAIL MODAL
// ============================================================
// ============================================================
// EMAIL MODAL - Enhanced with User Search & Multi-Select
// ============================================================
// ============================================================
// EMAIL MODAL - Fixed with Proper User Search
// ============================================================
// ============================================================
// EMAIL MODAL - Complete Fixed Version
// ============================================================
interface EmailModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (
    emails: string[],
    cc: string[],
    bcc: string[],
    message: string,
  ) => void;
  fileName: string;
  loading: boolean;
  allUsers?: any[];
  currentUser?: any;
  year?: number;
  pdfType?: string; // ✅ ADD THIS
  auditId?: string; // ✅ ADD THIS
  selectedMonth?: string; // ✅ ADD THIS
  fromDetailedView?: boolean; // ✅ ADD THIS
  formVariant?: "form7" | "form8" | "ncr2"; // ✅ ADD THIS
}

const EmailModal: React.FC<EmailModalProps> = ({
  visible,
  onClose,
  onSend,
  fileName,
  loading,
  allUsers = [],
  currentUser,
  year = new Date().getFullYear(),
  pdfType = "8d", // ✅ ADD THIS with default
  auditId, // ✅ ADD THIS
  selectedMonth, // ✅ ADD THIS
  fromDetailedView, // ✅ ADD THIS
  formVariant, // ✅ ADD THIS
}) => {
  // ---- States ----
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccList, setBccList] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // ✅ ADD: Track failed photo loads so we fall back to initials
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  // ✅ ADD: Helper to build profile photo URL (same logic as Navbar)
  const getProfilePhotoUrl = (user: any): string | null => {
    if (user?.profilePhoto) {
      return user.profilePhoto;
    }
    if (user?.id) {
      return `${API_BASE_URL}/api/users/${user.id}/profile-photo`;
    }
    return null;
  };

  // Separate input states for each field
  const [toInput, setToInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [bccInput, setBccInput] = useState("");

  // Separate search states for each field
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [ccSearchQuery, setCcSearchQuery] = useState("");
  const [bccSearchQuery, setBccSearchQuery] = useState("");

  // Separate suggestion visibility for each field
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [showCcSuggestions, setShowCcSuggestions] = useState(false);
  const [showBccSuggestions, setShowBccSuggestions] = useState(false);

  // ---- Get shareable link ----
  // In EmailModal - getShareableLink
  const getShareableLink = (): string => {
    const baseUrl = API_BASE_URL;
    const typeStr = String(pdfType || "8d").toLowerCase();

    // Form5 Detailed View
    if (typeStr === "form5" && fromDetailedView) {
      const month = selectedMonth || "Apr";
      return `${baseUrl}/api/audit-detailed-view/${year}/${month}/download`;
    }

    if (typeStr === "form3") {
      const uid = currentUser?.id;
      return `${baseUrl}/api/audit-plan/${year}/export-pdf${uid ? `?userId=${uid}` : ""}`;
    }

    if (typeStr === "form4") {
      const uid = currentUser?.id;
      return `${baseUrl}/api/department-plan/${year}/download${uid ? `?userId=${uid}` : ""}`;
    }

    if (typeStr === "form5") {
      const month = selectedMonth || "Apr";
      return `${baseUrl}/api/audit-schedule/${year}/${month}/download`;
    }

    if (pdfType === "ncr" || pdfType === "corrective-action") {
      if (formVariant === "form7") {
        return `${baseUrl}/api/ncr/${auditId}/form7-pdf`;
      }
      if (formVariant === "ncr2") {
        return `${baseUrl}/api/ncr/${auditId}/form8-pdf?type=ncr2`;
      }
      // default = form8
      return `${baseUrl}/api/ncr/${auditId}/form8-pdf`;
    }
    if (typeStr === "8d") {
      return `${baseUrl}/api/eightd/${auditId || year}/download`;
    }

    if (typeStr === "iatf") {
      return `${baseUrl}/api/iatf-audits/${auditId || year}/pdf`;
    }

    if (typeStr === "manufacturing") {
      return `${baseUrl}/api/manufacturing-audits/${auditId || year}/pdf`;
    }

    if (typeStr === "5s") {
      return `${baseUrl}/api/fives-audits/${auditId || year}/pdf`;
    }

    return `${baseUrl}/api/audit-plan/${year}/export-pdf`;
  };
  // ---- Initialize message with PDF link ----
  useEffect(() => {
    if (visible) {
      const link = getShareableLink();
      setMessage(
        `Please find the audit document: ${fileName}\n\n` +
          `📎 Download: ${link}\n\n` +
          `📅 Generated: ${new Date().toLocaleString()}\n\n` +
          `Regards,\nAudit Team`,
      );
    }
  }, [visible, fileName, year, pdfType, selectedMonth, auditId]);

  // ---- Filter users for a specific field ----
  const getFilteredUsers = (query: string, existingEmails: string[]) => {
    if (!query || query.trim().length === 0) return [];

    const searchLower = query.toLowerCase().trim();
    const existingSet = new Set(existingEmails);

    return allUsers
      .filter((user: any) => {
        const userEmail = user?.email || user?.username || "";
        if (!userEmail || existingSet.has(userEmail)) return false;

        const firstName = (user?.firstName || "").toLowerCase();
        const lastName = (user?.lastName || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = userEmail.toLowerCase();
        const department = (user?.department || user?.dept || "").toLowerCase();
        const username = (user?.username || "").toLowerCase();

        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          username.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          department.includes(searchLower)
        );
      })
      .slice(0, 15);
  };

  // ---- Get filtered users for each field ----
  const toFilteredUsers = getFilteredUsers(toSearchQuery, recipients);
  const ccFilteredUsers = getFilteredUsers(ccSearchQuery, [
    ...recipients,
    ...ccList,
  ]);
  const bccFilteredUsers = getFilteredUsers(bccSearchQuery, [
    ...recipients,
    ...ccList,
    ...bccList,
  ]);

  // ---- Validate email format ----
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ---- Add recipient to specific list ----
  const addRecipient = (email: string, list: "to" | "cc" | "bcc") => {
    if (!email || !email.trim()) return;

    const cleanEmail = email.trim();

    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Check if already in any list
    if (
      recipients.includes(cleanEmail) ||
      ccList.includes(cleanEmail) ||
      bccList.includes(cleanEmail)
    ) {
      Alert.alert("Duplicate", "This email is already in the recipient list.");
      return;
    }

    if (list === "to") {
      setRecipients([...recipients, cleanEmail]);
      setToInput("");
      setToSearchQuery("");
      setShowToSuggestions(false);
    } else if (list === "cc") {
      setCcList([...ccList, cleanEmail]);
      setCcInput("");
      setCcSearchQuery("");
      setShowCcSuggestions(false);
    } else if (list === "bcc") {
      setBccList([...bccList, cleanEmail]);
      setBccInput("");
      setBccSearchQuery("");
      setShowBccSuggestions(false);
    }
  };

  // ---- Remove recipient ----
  const removeRecipient = (email: string, list: "to" | "cc" | "bcc") => {
    if (list === "to") {
      setRecipients(recipients.filter((e) => e !== email));
    } else if (list === "cc") {
      setCcList(ccList.filter((e) => e !== email));
    } else if (list === "bcc") {
      setBccList(bccList.filter((e) => e !== email));
    }
  };

  // ---- Handle key press for specific field ----
  const handleKeyPress = (e: any, list: "to" | "cc" | "bcc") => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const input =
        list === "to" ? toInput : list === "cc" ? ccInput : bccInput;
      if (input.trim()) {
        addRecipient(input, list);
      }
    }
    if (e.key === "Escape") {
      if (list === "to") setShowToSuggestions(false);
      else if (list === "cc") setShowCcSuggestions(false);
      else if (list === "bcc") setShowBccSuggestions(false);
    }
  };

  // ---- Handle input change for specific field ----
  const handleInputChange = (text: string, list: "to" | "cc" | "bcc") => {
    if (list === "to") {
      setToInput(text);
      setToSearchQuery(text);
      setShowToSuggestions(text.trim().length > 0);
    } else if (list === "cc") {
      setCcInput(text);
      setCcSearchQuery(text);
      setShowCcSuggestions(text.trim().length > 0);
    } else if (list === "bcc") {
      setBccInput(text);
      setBccSearchQuery(text);
      setShowBccSuggestions(text.trim().length > 0);
    }
  };

  // ---- Handle blur for specific field ----
  const handleBlur = (list: "to" | "cc" | "bcc") => {
    setTimeout(() => {
      if (list === "to") setShowToSuggestions(false);
      else if (list === "cc") setShowCcSuggestions(false);
      else if (list === "bcc") setShowBccSuggestions(false);
    }, 200);
  };

  // ---- Handle focus for specific field ----
  const handleFocus = (list: "to" | "cc" | "bcc") => {
    const input = list === "to" ? toInput : list === "cc" ? ccInput : bccInput;
    if (input.trim().length > 0) {
      if (list === "to") setShowToSuggestions(true);
      else if (list === "cc") setShowCcSuggestions(true);
      else if (list === "bcc") setShowBccSuggestions(true);
    }
  };

  // ---- Get user display name ----
  const getUserDisplayName = (user: any): string => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user?.username || user?.email || "User";
  };

  // ---- Get user initials ----
  const getUserInitials = (user: any): string => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) return firstName.charAt(0).toUpperCase();
    const email = user?.email || user?.username || "";
    return email.charAt(0).toUpperCase();
  };

  // ---- Handle send ----
  const handleSend = () => {
    if (recipients.length === 0) {
      Alert.alert("Error", "Please add at least one recipient.");
      return;
    }
    onSend(recipients, ccList, bccList, message);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.emailModalOverlay}>
        <View style={styles.emailModalContent}>
          {/* Header */}
          <View style={styles.emailModalHeader}>
            <Text style={styles.emailModalTitle}>📧 Share via Email</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.emailModalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* ===== TO: FIELD ===== */}
            <View style={styles.emailFieldContainer}>
              <View style={styles.emailFieldHeader}>
                <Text style={styles.emailFieldLabel}>To *</Text>
                <View style={styles.emailFieldBadge}>
                  <Text style={styles.emailFieldBadgeText}>
                    {recipients.length}
                  </Text>
                </View>
              </View>

              <View style={styles.emailTagsContainer}>
                {/* Recipient Tags */}
                {recipients.map((email) => (
                  <View key={email} style={styles.emailTag}>
                    <Text style={styles.emailTagText} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeRecipient(email, "to")}
                      style={styles.emailTagRemove}
                    >
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Input */}
                <View style={styles.emailInputWrapper}>
                  <TextInput
                    style={styles.emailSearchInput}
                    placeholder={
                      recipients.length === 0
                        ? "Search users or enter email..."
                        : ""
                    }
                    value={toInput}
                    onChangeText={(text) => handleInputChange(text, "to")}
                    onFocus={() => handleFocus("to")}
                    onBlur={() => handleBlur("to")}
                    onKeyPress={(e) => handleKeyPress(e, "to")}
                  />
                  {toInput.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => addRecipient(toInput, "to")}
                      style={styles.emailAddBtn}
                    >
                      <Check size={16} color="#2563eb" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* To Suggestions */}
              {showToSuggestions && toFilteredUsers.length > 0 && (
                <View style={styles.emailSuggestions}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {toFilteredUsers.map((user: any) => {
                      const userEmail = user?.email || user?.username || "";
                      const displayName = getUserDisplayName(user);
                      const initials = getUserInitials(user);
                      const department = user?.department || user?.dept || "";
                      const photoUrl = getProfilePhotoUrl(user);
                      const showPhoto =
                        photoUrl && !failedPhotos.has(userEmail);

                      return (
                        <TouchableOpacity
                          key={user.id || userEmail}
                          style={styles.emailSuggestionItem}
                          onPress={() => {
                            addRecipient(userEmail, "to");
                            setShowToSuggestions(false);
                          }}
                        >
                          <View style={styles.emailSuggestionAvatar}>
                            {getProfilePhotoUrl(user) &&
                            !failedPhotos.has(userEmail) ? (
                              <Image
                                source={{ uri: getProfilePhotoUrl(user)! }}
                                style={styles.emailSuggestionAvatarImage}
                                onError={() => {
                                  setFailedPhotos((prev) =>
                                    new Set(prev).add(userEmail),
                                  );
                                }}
                              />
                            ) : (
                              <Text style={styles.emailSuggestionAvatarText}>
                                {initials}
                              </Text>
                            )}
                          </View>
                          <View style={styles.emailSuggestionInfo}>
                            <Text style={styles.emailSuggestionName}>
                              {displayName}
                            </Text>
                            <Text style={styles.emailSuggestionEmail}>
                              {userEmail}
                            </Text>
                          </View>
                          {department && (
                            <View style={styles.emailSuggestionTag}>
                              <Text style={styles.emailSuggestionTagText}>
                                {department}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {showToSuggestions &&
                toSearchQuery.trim().length > 0 &&
                toFilteredUsers.length === 0 && (
                  <View style={styles.emailNoResults}>
                    <Text style={styles.emailNoResultsText}>
                      No users found. Press Enter to add "{toSearchQuery}" as
                      external email.
                    </Text>
                  </View>
                )}
            </View>

            {/* ===== CC: FIELD ===== */}
            <View style={styles.emailFieldContainer}>
              <View style={styles.emailFieldHeader}>
                <Text style={styles.emailFieldLabel}>Cc</Text>
                <View style={styles.emailFieldBadge}>
                  <Text style={styles.emailFieldBadgeText}>
                    {ccList.length}
                  </Text>
                </View>
              </View>

              <View style={styles.emailTagsContainer}>
                {ccList.map((email) => (
                  <View
                    key={email}
                    style={[styles.emailTag, styles.emailTagCc]}
                  >
                    <Text style={styles.emailTagText} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeRecipient(email, "cc")}
                      style={styles.emailTagRemove}
                    >
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.emailInputWrapper}>
                  <TextInput
                    style={styles.emailSearchInput}
                    placeholder={
                      ccList.length === 0 ? "Add CC recipients..." : ""
                    }
                    value={ccInput}
                    onChangeText={(text) => handleInputChange(text, "cc")}
                    onFocus={() => handleFocus("cc")}
                    onBlur={() => handleBlur("cc")}
                    onKeyPress={(e) => handleKeyPress(e, "cc")}
                  />
                  {ccInput.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => addRecipient(ccInput, "cc")}
                      style={styles.emailAddBtn}
                    >
                      <Check size={16} color="#2563eb" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* CC Suggestions */}
              {showCcSuggestions && ccFilteredUsers.length > 0 && (
                <View style={styles.emailSuggestions}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {ccFilteredUsers.map((user: any) => {
                      const userEmail = user?.email || user?.username || "";
                      const displayName = getUserDisplayName(user);
                      const initials = getUserInitials(user);
                      const department = user?.department || user?.dept || "";

                      return (
                        <TouchableOpacity
                          key={user.id || userEmail}
                          style={styles.emailSuggestionItem}
                          onPress={() => {
                            addRecipient(userEmail, "cc");
                            setShowCcSuggestions(false);
                          }}
                        >
                          <View style={styles.emailSuggestionAvatar}>
                            {getProfilePhotoUrl(user) &&
                            !failedPhotos.has(userEmail) ? (
                              <Image
                                source={{ uri: getProfilePhotoUrl(user)! }}
                                style={styles.emailSuggestionAvatarImage}
                                onError={() => {
                                  setFailedPhotos((prev) =>
                                    new Set(prev).add(userEmail),
                                  );
                                }}
                              />
                            ) : (
                              <Text style={styles.emailSuggestionAvatarText}>
                                {initials}
                              </Text>
                            )}
                          </View>
                          <View style={styles.emailSuggestionInfo}>
                            <Text style={styles.emailSuggestionName}>
                              {displayName}
                            </Text>
                            <Text style={styles.emailSuggestionEmail}>
                              {userEmail}
                            </Text>
                          </View>
                          {department && (
                            <View style={styles.emailSuggestionTag}>
                              <Text style={styles.emailSuggestionTagText}>
                                {department}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ===== BCC: FIELD ===== */}
            <View style={styles.emailFieldContainer}>
              <View style={styles.emailFieldHeader}>
                <Text style={styles.emailFieldLabel}>Bcc</Text>
                <View style={styles.emailFieldBadge}>
                  <Text style={styles.emailFieldBadgeText}>
                    {bccList.length}
                  </Text>
                </View>
              </View>

              <View style={styles.emailTagsContainer}>
                {bccList.map((email) => (
                  <View
                    key={email}
                    style={[styles.emailTag, styles.emailTagBcc]}
                  >
                    <Text style={styles.emailTagText} numberOfLines={1}>
                      {email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeRecipient(email, "bcc")}
                      style={styles.emailTagRemove}
                    >
                      <X size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.emailInputWrapper}>
                  <TextInput
                    style={styles.emailSearchInput}
                    placeholder={
                      bccList.length === 0 ? "Add BCC recipients..." : ""
                    }
                    value={bccInput}
                    onChangeText={(text) => handleInputChange(text, "bcc")}
                    onFocus={() => handleFocus("bcc")}
                    onBlur={() => handleBlur("bcc")}
                    onKeyPress={(e) => handleKeyPress(e, "bcc")}
                  />
                  {bccInput.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => addRecipient(bccInput, "bcc")}
                      style={styles.emailAddBtn}
                    >
                      <Check size={16} color="#2563eb" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* BCC Suggestions */}
              {showBccSuggestions && bccFilteredUsers.length > 0 && (
                <View style={styles.emailSuggestions}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {bccFilteredUsers.map((user: any) => {
                      const userEmail = user?.email || user?.username || "";
                      const displayName = getUserDisplayName(user);
                      const initials = getUserInitials(user);
                      const department = user?.department || user?.dept || "";

                      return (
                        <TouchableOpacity
                          key={user.id || userEmail}
                          style={styles.emailSuggestionItem}
                          onPress={() => {
                            addRecipient(userEmail, "bcc");
                            setShowBccSuggestions(false);
                          }}
                        >
                          <View style={styles.emailSuggestionAvatar}>
                            {getProfilePhotoUrl(user) &&
                            !failedPhotos.has(userEmail) ? (
                              <Image
                                source={{ uri: getProfilePhotoUrl(user)! }}
                                style={styles.emailSuggestionAvatarImage}
                                onError={() => {
                                  setFailedPhotos((prev) =>
                                    new Set(prev).add(userEmail),
                                  );
                                }}
                              />
                            ) : (
                              <Text style={styles.emailSuggestionAvatarText}>
                                {initials}
                              </Text>
                            )}
                          </View>
                          <View style={styles.emailSuggestionInfo}>
                            <Text style={styles.emailSuggestionName}>
                              {displayName}
                            </Text>
                            <Text style={styles.emailSuggestionEmail}>
                              {userEmail}
                            </Text>
                          </View>
                          {department && (
                            <View style={styles.emailSuggestionTag}>
                              <Text style={styles.emailSuggestionTagText}>
                                {department}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ===== MESSAGE ===== */}
            <View style={styles.emailFieldContainer}>
              <Text style={styles.emailFieldLabel}>Message</Text>
              <TextInput
                style={styles.emailMessageInput}
                placeholder="Add your message..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* ===== INFO BOX ===== */}
            <View style={styles.emailInfoBox}>
              <Text style={styles.emailInfoText}>
                📌 Type to search for internal users by name or email.
              </Text>
              <Text style={styles.emailInfoText}>
                ✉️ Enter external emails and press Enter or comma to add.
              </Text>
              <Text style={styles.emailInfoText}>
                📎 The PDF download link is auto-included in the message.
              </Text>
            </View>
          </ScrollView>

          {/* ===== FOOTER ===== */}
          <View style={styles.emailModalFooter}>
            <View style={styles.emailFooterInfo}>
              <Text style={styles.emailFooterText}>
                {recipients.length} recipient
                {recipients.length !== 1 ? "s" : ""}
                {ccList.length > 0 && `, ${ccList.length} CC`}
                {bccList.length > 0 && `, ${bccList.length} BCC`}
              </Text>
            </View>
            <View style={styles.emailFooterActions}>
              <TouchableOpacity
                style={[styles.emailModalBtn, styles.emailModalBtnCancel]}
                onPress={onClose}
              >
                <Text style={styles.emailModalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.emailModalBtn,
                  styles.emailModalBtnSend,
                  (recipients.length === 0 || loading) &&
                    styles.emailModalBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={recipients.length === 0 || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Send size={18} color="white" />
                    <Text style={styles.emailModalBtnSendText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================
// FORUM SHARE MODAL - FIXED (Prevents closing on dropdown click)
// ============================================================
// ============================================================
// FORUM SHARE MODAL - Compact & Professional
// ============================================================
interface ForumShareModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  fileName: string;
  forumGroups: ForumGroup[];
  loading: boolean;
  selectedForum: string;
  setSelectedForum: (id: string) => void;
  comment: string;
  setComment: (text: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
}

const ForumShareModal: React.FC<ForumShareModalProps> = ({
  visible,
  onClose,
  onShare,
  fileName,
  forumGroups,
  loading,
  selectedForum,
  setSelectedForum,
  comment,
  setComment,
  showDropdown,
  setShowDropdown,
}) => {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const selected = forumGroups.find((f: ForumGroup) => f.id === selectedForum);

  // Get forum icon based on type
  const getForumIcon = (type?: string) => {
    if (type?.toLowerCase().includes("general")) return "📢";
    if (type?.toLowerCase().includes("audit")) return "📋";
    if (type?.toLowerCase().includes("ncr")) return "⚠️";
    return "💬";
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.forumOverlay}>
        {/* Background overlay - click to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Modal Content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{ width: "100%", alignItems: "center" }}
        >
          <Animated.View
            style={[
              styles.forumSharePanel,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.forumHandleBar} />

            {/* Header */}
            <View style={styles.forumHeader}>
              <View style={styles.forumHeaderLeft}>
                <View style={styles.forumHeaderIcon}>
                  <MessageCircle size={20} color="#7c3aed" />
                </View>
                <View>
                  <Text style={styles.forumHeaderTitle}>Share to Forum</Text>
                  <Text style={styles.forumHeaderSubtitle}>
                    Share this document with your audit team
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.forumCloseBtn}>
                <X size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Document Name */}
            <View style={styles.forumDocContainer}>
              <FileText size={16} color="#6b7280" />
              <Text style={styles.forumDocName} numberOfLines={1}>
                {fileName}
              </Text>
            </View>

            {/* Forum Selector */}
            <View style={styles.forumSelectorContainer}>
              <Text style={styles.forumSelectorLabel}>Select Forum</Text>
              <TouchableOpacity
                style={styles.forumSelectorButton}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <View style={styles.forumSelectorLeft}>
                  <Text style={styles.forumSelectorIcon}>
                    {selected ? getForumIcon(selected.type) : "💬"}
                  </Text>
                  <Text
                    style={[
                      styles.forumSelectorText,
                      !selected && styles.forumSelectorPlaceholder,
                    ]}
                  >
                    {selected ? selected.name : "Choose a forum..."}
                  </Text>
                </View>
                <ChevronDown
                  size={20}
                  color="#6b7280"
                  style={{
                    transform: [{ rotate: showDropdown ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>

              {/* Dropdown */}
              {showDropdown && (
                <View style={styles.forumDropdown}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {forumGroups.map((forum: ForumGroup) => {
                      const isSelected = selectedForum === forum.id;
                      return (
                        <TouchableOpacity
                          key={forum.id}
                          style={[
                            styles.forumDropdownItem,
                            isSelected && styles.forumDropdownItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedForum(forum.id);
                            setShowDropdown(false);
                          }}
                        >
                          <View style={styles.forumDropdownLeft}>
                            <Text style={styles.forumDropdownIcon}>
                              {getForumIcon(forum.type)}
                            </Text>
                            <View>
                              <Text
                                style={[
                                  styles.forumDropdownText,
                                  isSelected &&
                                    styles.forumDropdownTextSelected,
                                ]}
                              >
                                {forum.name}
                              </Text>
                              <Text style={styles.forumDropdownType}>
                                {forum.type || "Forum"}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <Check size={16} color="#7c3aed" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Comment Input */}
            <View style={styles.forumCommentContainer}>
              <Text style={styles.forumCommentLabel}>Comment (Optional)</Text>
              <TextInput
                style={styles.forumCommentInput}
                placeholder="Add context about this document..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Footer Actions */}
            <View style={styles.forumFooter}>
              <TouchableOpacity style={styles.forumCancelBtn} onPress={onClose}>
                <Text style={styles.forumCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.forumShareBtn,
                  (!selectedForum || loading) && styles.forumShareBtnDisabled,
                ]}
                onPress={onShare}
                disabled={!selectedForum || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Send size={18} color="white" />
                    <Text style={styles.forumShareBtnText}>Share to Forum</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// ============================================================
// QR CODE MODAL
// ============================================================
interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  fileName: string;
  auditId: string;
  currentUser?: any;
  year: number;
  pdfType?:
    | "form3"
    | "form4"
    | "form5"
    | "ncr"
    | "8d"
    | "corrective-action"
    | "iatf"
    | "manufacturing"
    | "5s";
  selectedMonth?: string; // ✅ ADD THIS
  fromDetailedView?: boolean; // ✅ ADD THIS
  formVariant?: "form7" | "form8" | "ncr2"; // ✅ ADD
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  fileName,
  auditId,
  year,
  pdfType = "8d",
  selectedMonth, // ✅ ADD THIS
  fromDetailedView, // ✅ ADD THIS
  formVariant,
  currentUser,
}) => {
  const [shortUrl, setShortUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      generateShortUrl();
    }
  }, [visible]);

  // In QRCodeModal - generateShortUrl
  const generateShortUrl = async () => {
    setLoading(true);
    try {
      const baseUrl = API_BASE_URL;
      let shareableUrl = "";

      // Form5 Detailed View
      if (pdfType === "form5" && fromDetailedView) {
        const month = selectedMonth || "Apr";
        shareableUrl = `${baseUrl}/api/audit-detailed-view/${year}/${month}/download`;
      } else if (pdfType === "form3") {
        const uid = currentUser?.id;
        shareableUrl = `${baseUrl}/api/audit-plan/${year}/export-pdf${uid ? `?userId=${uid}` : ""}`;
      } else if (pdfType === "form4") {
        const uid = currentUser?.id;
        shareableUrl = `${baseUrl}/api/department-plan/${year}/download${uid ? `?userId=${uid}` : ""}`;
      } else if (pdfType === "form5") {
        const month = selectedMonth || "Apr";
        shareableUrl = `${baseUrl}/api/audit-schedule/${year}/${month}/download`;
      } else if (pdfType === "ncr" || pdfType === "corrective-action") {
        if (formVariant === "form7") {
          shareableUrl = `${baseUrl}/api/ncr/${auditId}/form7-pdf`;
        } else if (formVariant === "ncr2") {
          shareableUrl = `${baseUrl}/api/ncr/${auditId}/form8-pdf?type=ncr2`;
        } else {
          shareableUrl = `${baseUrl}/api/ncr/${auditId}/form8-pdf`;
        }
      } else if (pdfType === "8d") {
        shareableUrl = `${baseUrl}/api/eightd/${auditId}/download`;
      } else if (pdfType === "iatf") {
        shareableUrl = `${baseUrl}/api/iatf-audits/${auditId}/pdf`;
      } else if (pdfType === "manufacturing") {
        shareableUrl = `${baseUrl}/api/manufacturing-audits/${auditId}/pdf`;
      } else if (pdfType === "5s") {
        shareableUrl = `${baseUrl}/api/fives-audits/${auditId}/pdf`;
      } else {
        shareableUrl = `${baseUrl}/api/audit-plan/${year}/export-pdf`;
      }

      setShortUrl(shareableUrl);
    } catch (error) {
      console.error("Error generating URL:", error);
      const baseUrl = API_BASE_URL;
      const month = selectedMonth || "Apr";
      if (pdfType === "form5" && fromDetailedView) {
        setShortUrl(
          `${baseUrl}/api/audit-detailed-view/${year}/${month}/download`,
        );
      } else {
        setShortUrl(`${baseUrl}/api/audit-plan/${year}/export-pdf`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert("✅ Copied!", "Link copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.qrOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.qrContainer}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>📱 Share QR Code</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.qrLoading}>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={styles.qrLoadingText}>Generating QR Code...</Text>
            </View>
          ) : (
            <>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={shortUrl}
                  size={200}
                  color="#1e3a8a"
                  backgroundColor="white"
                  quietZone={10}
                />
              </View>

              <Text style={styles.qrDocName} numberOfLines={1}>
                {fileName}
              </Text>

              <Text style={styles.qrHint}>
                Scan to open this document on your mobile device
              </Text>

              <View style={styles.qrActions}>
                <TouchableOpacity
                  style={[styles.qrActionBtn, styles.qrCopyBtn]}
                  onPress={handleCopyLink}
                >
                  {copied ? (
                    <Check size={18} color="#059669" />
                  ) : (
                    <Copy size={18} color="#1e3a8a" />
                  )}
                  <Text
                    style={[
                      styles.qrActionText,
                      copied && { color: "#059669" },
                    ]}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.qrActionBtn, styles.qrDownloadBtn]}
                  onPress={() => {
                    Alert.alert(
                      "📱 QR Code",
                      "QR Code image download coming soon!",
                    );
                  }}
                >
                  <Download size={18} color="white" />
                  <Text style={[styles.qrActionText, { color: "white" }]}>
                    Download QR
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.qrFooter} numberOfLines={1}>
                🔗 {shortUrl}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================================
// MAIN PDF VIEWER
// ============================================================
export default function PDFViewer({
  visible,
  pdfData,
  fileName,
  auditId,
  auditNumber,
  forumGroups = [],
  onClose,
  onShareComplete,
  currentUser,
  onNavigateToForum,
  allUsers = [], // ✅ ADD THIS with default empty array
  pdfType = "8d", // ✅ ADD THIS with default
  selectedMonth, // ✅ ADD THIS
  fromDetailedView,
  formVariant, // ✅ ADD THIS
}: PDFViewerProps) {
  // ---- States ----
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showForumShare, setShowForumShare] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedForum, setSelectedForum] = useState<string>("");
  const [comment, setComment] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [userForums, setUserForums] = useState<ForumGroup[]>([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentSelection, setCurrentSelection] = useState<{
    text: string;
    rect: any;
  } | null>(null);

  // ---- Refs ----
  const iframeRef = useRef<any>(null);
  const printGuardRef = useRef<boolean>(false); // ✅ prevents double-fire
  const printIframeRef = useRef<HTMLIFrameElement | null>(null); // ✅ keeps iframe reference
  // ---- Fetch User Forums ----
  useEffect(() => {
    if (showForumShare && currentUser?.email) {
      fetchUserForums();
    }
  }, [showForumShare, currentUser]);

  const fetchUserForums = async () => {
    setLoadingForums(true);
    try {
      // ✅ EXACT same call as ForumHome
      const response = await fetchUser8DGroups(
        currentUser.email,
        currentUser?.plantId ?? null,
      );

      console.log(
        "📋 [PDFViewer] User 8D groups (same as ForumHome):",
        response,
      );

      if (Array.isArray(response) && response.length > 0) {
        const mappedForums: ForumGroup[] = response.map((g: any) => ({
          id: g.groupId || g.id,
          name: g.groupName || g.name || g.id,
          type:
            g.groupType ||
            (String(g.groupId || "").startsWith("AUDIT-general-forum")
              ? "General"
              : String(g.groupId || "").startsWith("AUDIT-")
                ? "Audit"
                : String(g.groupId || "").startsWith("8D-")
                  ? "8D"
                  : String(g.groupId || "").startsWith("GRP-")
                    ? "Custom"
                    : "Forum"),
        }));
        setUserForums(mappedForums);
        return;
      }

      // Only fall back to props if the API returned nothing
      setUserForums(forumGroups);
    } catch (error) {
      console.error("❌ [PDFViewer] fetchUserForums error:", error);
      setUserForums(forumGroups);
    } finally {
      setLoadingForums(false);
    }
  };

  const displayForums = userForums.length > 0 ? userForums : forumGroups;

  const getPDFUri = (): string => {
    if (!pdfData) return "";

    const s = String(pdfData);

    // ✅ NEW: only pass-through blob URLs on web
    if (Platform.OS === "web" && s.startsWith("blob:")) return s;
    // ✅ NEW: only pass-through file URIs on native
    if (Platform.OS !== "web" && s.startsWith("file://")) return s;

    // ⬇️ EVERYTHING BELOW IS EXACTLY AS BEFORE — untouched
    if (s.startsWith("data:application/pdf")) return s;
    if (s.startsWith("http")) return s;
    return `data:application/pdf;base64,${s}`;
  };

  // In PDFViewer.tsx - Updated getShareableLink

  // In PDFViewer.tsx - Updated getShareableLink

  const getShareableLink = (): string => {
    const year = parseInt(auditId) || new Date().getFullYear();
    const baseUrl = API_BASE_URL;

    // Form5 Detailed View
    if (pdfType === "form5" && fromDetailedView) {
      const month = selectedMonth || "Apr";
      return `${baseUrl}/api/audit-detailed-view/${year}/${month}/download`;
    }

    // Form3
    // Form3
    if (pdfType === "form3") {
      const uid = currentUser?.id;
      if (!uid) {
        console.warn("⚠️ userId missing — Form3 download may fail");
      }
      return `${baseUrl}/api/audit-plan/${year}/export-pdf${uid ? `?userId=${uid}` : ""}`;
    }

    // Form4
    // Form4
    if (pdfType === "form4") {
      const uid = currentUser?.id;
      if (!uid) {
        console.warn("⚠️ userId missing — Form4 download may fail");
      }
      return `${baseUrl}/api/department-plan/${year}/download${uid ? `?userId=${uid}` : ""}`;
    }

    // Form5
    if (pdfType === "form5") {
      const month = selectedMonth || "Apr";
      return `${baseUrl}/api/audit-schedule/${year}/${month}/download`;
    }

    // NCR (Form7 & Form8)
    if (pdfType === "ncr" || pdfType === "corrective-action") {
      if (formVariant === "form7") {
        return `${baseUrl}/api/ncr/${auditId}/form7-pdf`;
      }
      if (formVariant === "ncr2") {
        return `${baseUrl}/api/ncr/${auditId}/form8-pdf?type=ncr2`;
      }
      // default = form8
      return `${baseUrl}/api/ncr/${auditId}/form8-pdf`;
    }
    // 8D Report
    if (pdfType === "8d") {
      return `${baseUrl}/api/eightd/${auditId}/download`;
    }

    // IATF Audit
    if (pdfType === "iatf") {
      return `${baseUrl}/api/iatf-audits/${auditId}/pdf`;
    }

    // Manufacturing Audit
    if (pdfType === "manufacturing") {
      return `${baseUrl}/api/manufacturing-audits/${auditId}/pdf`;
    }

    // 5S Audit
    if (pdfType === "5s") {
      return `${baseUrl}/api/fives-audits/${auditId}/pdf`;
    }

    // Default fallback
    return `${baseUrl}/api/audit-plan/${year}/export-pdf`;
  };
  // ---- Text Selection ----
  const handleTextSelect = (text: string, rect: any) => {
    setCurrentSelection({ text, rect });

    Alert.alert(
      "📝 Text Selected",
      `"${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
      [
        {
          text: "Highlight",
          onPress: () => handleHighlightText(text, rect),
        },
        {
          text: "Annotate",
          onPress: () => handleAnnotateText(text, rect),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const handleHighlightText = (text: string, rect: any) => {
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      text: text,
      color: "#eab308",
      page: 1,
      rect: {
        x: rect.x || 0,
        y: rect.y || 0,
        width: rect.width || 0,
        height: rect.height || 0,
      },
    };
    setHighlights([...highlights, newHighlight]);
    Alert.alert("✅ Highlight Added", "Text highlighted successfully!");
  };

  const handleAnnotateText = (text: string, rect: any) => {
    if (Platform.OS === "web") {
      const annotationText = prompt("Enter your annotation:", "");
      if (annotationText && annotationText.trim()) {
        const newAnnotation: Annotation = {
          id: Date.now().toString(),
          text: annotationText.trim(),
          page: 1,
          x: rect?.x || 100,
          y: rect?.y || 200,
          author: currentUser?.displayName || "User",
          timestamp: new Date().toLocaleString(),
        };
        setAnnotations([...annotations, newAnnotation]);
        Alert.alert("✅ Annotation Added", "Text annotation saved!");
      }
    } else {
      setShowTextAnnotation(true);
    }
  };

  const [showTextAnnotation, setShowTextAnnotation] = useState(false);

  const handleHighlight = () => {
    if (currentSelection) {
      handleHighlightText(currentSelection.text, currentSelection.rect);
    } else {
      Alert.alert(
        "No Text Selected",
        "Please select text from the PDF first, then click Highlight.",
      );
    }
  };

  const handleAddText = () => {
    if (currentSelection) {
      setShowTextAnnotation(true);
    } else {
      Alert.alert(
        "No Text Selected",
        "Please select text from the PDF first, then click Add Text.",
      );
    }
  };

  const handleSaveTextAnnotation = (text: string) => {
    if (currentSelection) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        text: text,
        page: 1,
        x: currentSelection.rect?.x || 100,
        y: currentSelection.rect?.y || 200,
        author: currentUser?.displayName || "User",
        timestamp: new Date().toLocaleString(),
      };
      setAnnotations([...annotations, newAnnotation]);
      Alert.alert("✅ Annotation Added", "Text annotation saved!");
    }
  };

  const handleRemoveHighlights = () => {
    if (highlights.length === 0) {
      Alert.alert("No Highlights", "There are no highlights to remove.");
      return;
    }

    Alert.alert(
      "Remove All Highlights",
      `This will remove ${highlights.length} highlight(s). Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove All",
          style: "destructive",
          onPress: () => {
            setHighlights([]);
            Alert.alert("✅ Removed", "All highlights removed");
          },
        },
      ],
    );
  };

  const handleRemoveHighlight = (id: string) => {
    setHighlights(highlights.filter((h) => h.id !== id));
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(annotations.filter((a) => a.id !== id));
  };

  // ✅ Share Highlighted - Uses short URL
  const handleShareHighlighted = () => {
    if (highlights.length === 0) {
      Alert.alert("No Highlights", "Please highlight some text first.");
      return;
    }

    const highlightedText = highlights
      .map((h, i) => `${i + 1}. "${h.text}"`)
      .join("\n");
    const annotationsText = annotations
      .map((a, i) => `${i + 1}. ${a.text}`)
      .join("\n");
    const shareableLink = getShareableLink();

    let shareMessage = `📄 Document: ${fileName}\n\n📌 Highlighted Content:\n${highlightedText}`;

    if (annotations.length > 0) {
      shareMessage += `\n\n📝 Annotations:\n${annotationsText}`;
    }

    shareMessage += `\n\n📎 Download: ${shareableLink}`;
    shareMessage += `\n\n---\nShared via Audit System`;

    if (Platform.OS === "web") {
      navigator.clipboard.writeText(shareMessage);
      Alert.alert(
        "✅ Copied",
        "Highlighted text with link copied to clipboard!",
      );
    } else {
      Sharing.shareAsync(shareMessage, {
        dialogTitle: `Share ${fileName} highlights`,
      });
    }
  };

  // ✅ Convert data: URI to a same-origin blob: URL so we can print it
  const dataUriToBlobUrl = (dataUri: string): string | null => {
    try {
      // Format: data:application/pdf;base64,JVBERi0xLjQK...
      const parts = dataUri.split(",");
      if (parts.length !== 2) return null;

      const meta = parts[0]; // "data:application/pdf;base64"
      const base64 = parts[1];

      const mimeMatch = meta.match(/data:(.*?)(;base64)?$/);
      const mime = mimeMatch?.[1] || "application/pdf";

      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });

      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("dataUriToBlobUrl failed:", e);
      return null;
    }
  };

  useEffect(() => {
    if (!visible && printIframeRef.current) {
      if (printIframeRef.current.parentNode) {
        printIframeRef.current.parentNode.removeChild(printIframeRef.current);
      }
      printIframeRef.current = null;
      printGuardRef.current = false;
    }
  }, [visible]);

  // ============================================================
  // SHARE HANDLERS
  // ============================================================

  // ---- Teams Share - Uses short URL ----
  const shareToTeams = async () => {
    try {
      setLoading(true);
      const shareableLink = getShareableLink();

      let message = `📋 **Audit Document**: ${fileName}\n\n`;
      message += `**Document Type**: ${auditNumber || "Audit Report"}\n`;
      message += `**Generated**: ${new Date().toLocaleString()}\n\n`;

      if (highlights.length > 0) {
        message += `📌 **Highlights** (${highlights.length}):\n`;
        highlights.forEach((h, i) => {
          message += `${i + 1}. "${h.text}"\n`;
        });
        message += "\n";
      }

      if (annotations.length > 0) {
        message += `📝 **Annotations** (${annotations.length}):\n`;
        annotations.forEach((a, i) => {
          message += `${i + 1}. ${a.text}\n`;
        });
        message += "\n";
      }

      message += `🔗 **Download**: ${shareableLink}\n\n`;
      message += `---\n`;
      message += `*This document was shared via the Audit Management System.*`;

      const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=&message=${encodeURIComponent(message)}`;

      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(message);
        Alert.alert(
          "✅ Copied to Clipboard",
          "Message ready for Microsoft Teams. Would you like to open Teams?",
          [
            {
              text: "Open Teams",
              onPress: () => window.open(teamsUrl, "_blank"),
            },
            { text: "OK", style: "cancel" },
          ],
        );
      } else {
        const supported = await Linking.canOpenURL("msteams://");
        if (supported) {
          await Linking.openURL(teamsUrl);
        } else {
          await Sharing.shareAsync(shareableLink, {
            dialogTitle: `Share ${fileName} via Teams`,
          });
        }
      }
    } catch (error) {
      console.error("Teams share error:", error);
      Alert.alert("Error", "Failed to share to Teams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Email Share ----
  // In PDFViewer.tsx - Updated handleEmailSend

  const handleEmailSend = async (
    emails: string[],
    cc: string[],
    bcc: string[],
    message: string,
  ) => {
    setEmailSending(true);
    try {
      // ✅ Send to multiple recipients
      const result = await pdfService.emailPDF(
        {
          auditId: String(parseInt(auditId) || new Date().getFullYear()),
          type: pdfType, // ✅ Changed from '8d' to pdfType
          year: parseInt(auditId) || new Date().getFullYear(),
          month: pdfType === "form5" ? selectedMonth : undefined, // ✅ This should be 'Sep'
          fromDetailedView: pdfType === "form5" ? fromDetailedView : undefined, // ✅ ADD THIS
          formVariant,
          userId: currentUser?.id, // 👈 ADD
        },
        emails, // Now accepts array
        cc, // CC list
        bcc, // BCC list
        message,
      );

      if (result) {
        setShowEmailModal(false);
        Alert.alert(
          "✅ Email Sent!",
          `Document sent to ${emails.length} recipient(s).`,
        );
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error: any) {
      console.error("Email send error:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to send email. Please try again.",
      );
    } finally {
      setEmailSending(false);
    }
  };

  // ---- Copy Link - Uses short URL instead of base64 data ----
  const copyLink = async () => {
    try {
      const shareableLink = getShareableLink();

      const message = `📄 Audit Document: ${fileName}

📎 Download: ${shareableLink}

📅 Generated: ${new Date().toLocaleString()}
📋 Document ID: ${auditId}
🔒 This is a confidential audit document.

---
Shared via Audit Management System`;

      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(message);

        Alert.alert(
          "✅ Link Copied!",
          "The document link has been copied to your clipboard.",
          [
            {
              text: "View Content",
              onPress: () => Alert.alert("📋 Copied Content", message),
            },
            { text: "OK", style: "default" },
          ],
        );
      } else {
        await Clipboard.setString(message);
        Alert.alert("✅ Link Copied!", "Document link copied to clipboard.");
      }
    } catch (error) {
      console.error("Copy link error:", error);
      Alert.alert("Error", "Failed to copy link. Please try again.");
    }
  };

  // ---- Share Options Handler ----
  // In PDFViewer.tsx - Updated handleShareOption

  const handleShareOption = async (option: string) => {
    // ✅ The share panel is already closed by handleOptionPress
    // Now handle the specific option
    switch (option) {
      case "forum":
        setShowForumShare(true);
        break;
      case "teams":
        await shareToTeams();
        break;
      case "email":
        setShowEmailModal(true);
        break;
      case "link":
        await copyLink();
        break;
      case "qr":
        setShowQRCode(true);
        break;
    }
  };

  // ---- Forum Share ----
  const handleForumShare = async () => {
    if (!selectedForum) {
      Alert.alert("Error", "Please select a forum");
      return;
    }

    setLoading(true);
    try {
      const shareableLink = getShareableLink();

      let shareContent = comment;

      if (highlights.length > 0) {
        shareContent += "\n\n📌 Highlighted Text:\n";
        highlights.forEach((h, i) => {
          shareContent += `${i + 1}. "${h.text}"\n`;
        });
      }

      if (annotations.length > 0) {
        shareContent += "\n📝 Annotations:\n";
        annotations.forEach((a, i) => {
          shareContent += `${i + 1}. ${a.text}\n`;
        });
      }

      // ✅ ADD: Always append the download link
      // shareContent += `\n\n📎 Download: ${shareableLink}`;

      const success = await pdfService.sharePDFToForum(
        {
          auditId: String(parseInt(auditId) || new Date().getFullYear()),
          type: pdfType, // ✅ Changed from '8d' to pdfType
          year: parseInt(auditId) || new Date().getFullYear(),
          month: pdfType === "form5" ? selectedMonth : undefined, // 👈 ADD THIS
          fromDetailedView: pdfType === "form5" ? fromDetailedView : undefined, // ✅ ADD THIS
          formVariant, // ✅ ADD THIS
          userId: currentUser?.id, // 👈 ADD — this is the missing piece
        },
        selectedForum,
        shareContent,
        currentUser,
      );

      if (success) {
        setShowForumShare(false);
        setShowShareOptions(false);

        onClose();

        if (onShareComplete) {
          onShareComplete(selectedForum);
        }

        Alert.alert(
          "✅ PDF Shared Successfully!",
          `Document "${fileName}" shared to forum.`,
          [
            {
              text: "View in Forum",
              onPress: () => {
                if (onNavigateToForum) {
                  onNavigateToForum(selectedForum);
                } else if (onShareComplete) {
                  onShareComplete(selectedForum);
                }
              },
              style: "default",
            },
            {
              text: "OK",
              style: "cancel",
            },
          ],
        );
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share to forum");
    } finally {
      setLoading(false);
    }
  };

  // ---- Download ----
  const handleDownload = async () => {
    try {
      // ✅ Get auth token
      let token: string | null = null;
      if (Platform.OS === "web") {
        token = localStorage.getItem("authToken");
      } else {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        token = await AsyncStorage.getItem("authToken");
      }

      // ✅ Build the correct endpoint using the SAME logic as getShareableLink
      const downloadUrl = getShareableLink();
      console.log("📥 Download URL:", downloadUrl);

      if (Platform.OS === "web") {
        const response = await fetch(downloadUrl, {
          headers: {
            Accept: "application/pdf",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok)
          throw new Error(`Download failed: ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        Alert.alert("📥 Download Complete", `${fileName} downloaded.`);
      } else {
        // Native — use expo-file-system
        const FileSystem = await import("expo-file-system/legacy");
        const Sharing = await import("expo-sharing");

        const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
        const { uri } = await (FileSystem as any).downloadAsync(
          downloadUrl,
          fileUri,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Save ${fileName}`,
          });
        }
      }
    } catch (error: any) {
      console.error("Download error:", error);
      Alert.alert("Error", error.message || "Failed to download");
    }
  };

  // ---- Print ----
  const handlePrint = () => {
    // ✅ Native fallback
    if (Platform.OS !== "web") {
      Alert.alert("🖨️ Print", "Print functionality coming soon");
      return;
    }

    // ✅ Guard: prevent double-fire
    if (printGuardRef.current) {
      console.log("⏳ Print already in progress, ignoring duplicate click");
      return;
    }
    printGuardRef.current = true;

    try {
      const rawUri = getPDFUri();
      if (!rawUri) {
        Alert.alert("Error", "No PDF data available to print.");
        printGuardRef.current = false;
        return;
      }

      // ✅ Step 1: Get a same-origin, printable URL
      //    - If it's already a blob:/http(s) URL from same origin, use as-is.
      //    - If it's a data: URI, convert to a blob: URL (same-origin!).
      let printableUrl = rawUri;
      let blobUrlToRevoke: string | null = null;

      if (rawUri.startsWith("data:application/pdf")) {
        const blobUrl = dataUriToBlobUrl(rawUri);
        if (!blobUrl) {
          // Fallback: open the raw data URI in a new tab, user prints manually
          window.open(rawUri, "_blank");
          printGuardRef.current = false;
          return;
        }
        printableUrl = blobUrl;
        blobUrlToRevoke = blobUrl;
      }

      // ✅ Step 2: Remove any previous print iframe
      if (printIframeRef.current && printIframeRef.current.parentNode) {
        printIframeRef.current.parentNode.removeChild(printIframeRef.current);
        printIframeRef.current = null;
      }

      // ✅ Step 3: Create the hidden iframe with the SAME-ORIGIN blob URL
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      // Optional: if you want the browser's native PDF viewer inside the iframe
      iframe.setAttribute("title", "print-frame");

      let printed = false;

      const cleanup = () => {
        // Revoke blob URL after printing
        if (blobUrlToRevoke) {
          setTimeout(() => {
            try {
              URL.revokeObjectURL(blobUrlToRevoke!);
            } catch {}
          }, 5000);
        }
        // Reset the guard a bit later
        setTimeout(() => {
          printGuardRef.current = false;
        }, 1500);
      };

      // ✅ Step 4: Wait for load, then print
      iframe.onload = () => {
        if (printed) return;
        printed = true;

        // Small delay so the PDF plugin inside the iframe is fully ready
        setTimeout(() => {
          try {
            const win = iframe.contentWindow;
            if (!win) throw new Error("No iframe window");

            win.focus();
            win.print();

            cleanup();
          } catch (err: any) {
            console.error("Print trigger failed:", err);

            // ✅ Fallback: open the blob URL in a new tab for manual print
            try {
              const w = window.open(printableUrl, "_blank");
              if (w) {
                // Give the PDF viewer a moment, then trigger print
                setTimeout(() => {
                  try {
                    w.focus();
                    w.print();
                  } catch {
                    // User can still press Ctrl+P manually
                  }
                }, 800);
              }
            } catch (openErr) {
              console.error("Window.open fallback failed:", openErr);
              Alert.alert(
                "Print",
                "Your browser blocked the print preview. Please allow pop-ups and try again.",
              );
            }

            cleanup();
          }
        }, 350);
      };

      iframe.onerror = () => {
        console.error("Iframe failed to load PDF");
        // Fallback to opening in a new tab
        window.open(printableUrl, "_blank");
        cleanup();
      };

      // ✅ Step 5: Set src AFTER wiring handlers, then attach to DOM
      iframe.src = printableUrl;
      document.body.appendChild(iframe);
      printIframeRef.current = iframe;

      // ✅ Safety net — always release the guard eventually
      setTimeout(() => {
        printGuardRef.current = false;
      }, 15000);
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Failed to print the document.");
      printGuardRef.current = false;
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarBtn}>
            <X size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {fileName}
          </Text>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              onPress={() => setZoomLevel(Math.min(zoomLevel + 0.2, 2))}
              style={styles.toolbarBtn}
            >
              <ZoomIn size={20} color="#1f2937" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setZoomLevel(Math.max(zoomLevel - 0.2, 0.5))}
              style={styles.toolbarBtn}
            >
              <ZoomOut size={20} color="#1f2937" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Annotation Toolbar */}

        {/* Highlights & Annotations List */}
        <HighlightsList
          highlights={highlights}
          annotations={annotations}
          onRemoveHighlight={handleRemoveHighlight}
          onRemoveAnnotation={handleRemoveAnnotation}
        />

        {/* PDF View */}
        <View style={styles.pdfContainer}>
          <PDFRenderer
            pdfData={getPDFUri()}
            fileName={fileName}
            zoomLevel={zoomLevel}
            onTextSelect={handleTextSelect}
            highlights={highlights}
            annotations={annotations}
          />
        </View>

        {/* Bottom Toolbar */}
        <View style={styles.bottomToolbar}>
          <TouchableOpacity
            style={styles.bottomToolbarBtn}
            onPress={handleDownload}
          >
            <Download size={22} color="#1f2937" />
            <Text style={styles.bottomToolbarBtnText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomToolbarBtn, styles.shareBtnPrimary]}
            onPress={() => setShowShareOptions(true)}
          >
            <Share size={22} color="white" />
            <Text style={[styles.bottomToolbarBtnText, { color: "white" }]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomToolbarBtn}
            onPress={handlePrint}
          >
            <Printer size={22} color="#1f2937" />
            <Text style={styles.bottomToolbarBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <ShareOptionsPanel
          visible={showShareOptions}
          onClose={() => setShowShareOptions(false)}
          onOptionSelect={handleShareOption}
          fileName={fileName}
        />

        <ForumShareModal
          visible={showForumShare}
          onClose={() => setShowForumShare(false)}
          onShare={handleForumShare}
          fileName={fileName}
          forumGroups={displayForums}
          loading={loading}
          selectedForum={selectedForum}
          setSelectedForum={setSelectedForum}
          comment={comment}
          setComment={setComment}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
        />

        <QRCodeModal
          visible={showQRCode}
          onClose={() => setShowQRCode(false)}
          fileName={fileName}
          auditId={auditId}
          year={parseInt(auditId) || new Date().getFullYear()}
          pdfType={pdfType} // ✅ Pass pdfType
          selectedMonth={selectedMonth} // ✅ Pass month for Form5
          fromDetailedView={fromDetailedView} // ✅ PASS THIS
          formVariant={formVariant}
        />

        <EmailModal
          visible={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSend={handleEmailSend}
          fileName={fileName}
          loading={emailSending}
          auditId={auditId}
          allUsers={allUsers} // ✅ Pass allUsers from props
          currentUser={currentUser} // ✅ Pass current user
          pdfType={pdfType} // ✅ Pass pdfType
          selectedMonth={selectedMonth} // ✅ Pass month for Form5
          fromDetailedView={fromDetailedView} // ✅ PASS THIS
          formVariant={formVariant}
        />

        <TextAnnotationModal
          visible={showTextAnnotation}
          onClose={() => setShowTextAnnotation(false)}
          onSave={handleSaveTextAnnotation}
          selectedText={currentSelection?.text || ""}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ============================================================
// TEXT ANNOTATION MODAL
// ============================================================
interface TextAnnotationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  selectedText?: string;
}

const TextAnnotationModal: React.FC<TextAnnotationModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedText = "",
}) => {
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible && selectedText) {
      setText(
        `Annotation for: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? "..." : ""}"\n\n`,
      );
    }
  }, [visible, selectedText]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.annotationModalContent}>
          <View style={styles.annotationModalHeader}>
            <Text style={styles.annotationModalTitle}>📝 Add Annotation</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedText && (
            <View style={styles.selectedTextPreview}>
              <Text style={styles.selectedTextLabel}>Selected Text:</Text>
              <Text style={styles.selectedTextValue} numberOfLines={2}>
                "{selectedText}"
              </Text>
            </View>
          )}

          <TextInput
            style={styles.annotationTextInput}
            placeholder="Enter your annotation text..."
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.annotationModalFooter}>
            <TouchableOpacity
              style={[
                styles.annotationModalBtn,
                styles.annotationModalBtnCancel,
              ]}
              onPress={onClose}
            >
              <Text style={styles.annotationModalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.annotationModalBtn, styles.annotationModalBtnSave]}
              onPress={() => {
                if (text.trim()) {
                  onSave(text);
                  setText("");
                  onClose();
                }
              }}
            >
              <Text style={styles.annotationModalBtnSaveText}>
                Add Annotation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  // Add to StyleSheet
  emailSuggestionAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    height: 60,
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginHorizontal: 12,
  },
  toolbarRight: {
    flexDirection: "row",
    gap: 4,
  },
  toolbarBtn: {
    padding: 8,
    borderRadius: 8,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  pdfMobileText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
  },
  pdfMobileSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
  bottomToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    height: 70,
  },
  bottomToolbarBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bottomToolbarBtnText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  shareBtnPrimary: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  annotationToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#faf5ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexWrap: "wrap",
    gap: 8,
  },
  annotationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3e8ff",
  },
  annotationBtnSecondary: {
    backgroundColor: "#dbeafe",
  },
  annotationBtnDanger: {
    backgroundColor: "#fee2e2",
  },
  annotationBtnShare: {
    backgroundColor: "#f3e8ff",
  },
  annotationBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7c3aed",
  },

  highlightsPanel: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    maxHeight: 200,
  },
  highlightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  highlightsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  highlightsList: {
    maxHeight: 150,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  highlightColor: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  highlightRemove: {
    padding: 4,
  },
  annotationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  annotationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  annotationText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  // Add to your StyleSheet

  // Forum Modal - Compact Styles
  forumOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  forumSharePanel: {
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    width: "90%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  forumHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  forumHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  forumHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  forumHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  forumHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  forumHeaderSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  forumCloseBtn: {
    padding: 4,
  },
  forumDocContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  forumDocName: {
    flex: 1,
    fontSize: 13,
    color: "#1f2937",
    fontWeight: "500",
  },
  forumSelectorContainer: {
    marginBottom: 16,
  },
  forumSelectorLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  forumSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  forumSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  forumSelectorIcon: {
    fontSize: 18,
  },
  forumSelectorText: {
    fontSize: 14,
    color: "#1f2937",
    flex: 1,
  },
  forumSelectorPlaceholder: {
    color: "#9ca3af",
  },
  forumDropdown: {
    marginTop: 4,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  forumDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  forumDropdownItemSelected: {
    backgroundColor: "#f3e8ff",
  },
  forumDropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  forumDropdownIcon: {
    fontSize: 16,
  },
  forumDropdownText: {
    fontSize: 14,
    color: "#1f2937",
  },
  forumDropdownTextSelected: {
    color: "#7c3aed",
    fontWeight: "600",
  },
  forumDropdownType: {
    fontSize: 11,
    color: "#9ca3af",
  },
  forumCommentContainer: {
    marginBottom: 16,
  },
  forumCommentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  forumCommentInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 80,
    textAlignVertical: "top",
  },
  forumFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  forumCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  forumCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  forumShareBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  forumShareBtnDisabled: {
    opacity: 0.5,
  },
  forumShareBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },

  // Add to your StyleSheet - Replace old share panel styles

  // Share Panel - Compact Styles
  shareOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sharePanel: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    width: "90%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  shareHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  shareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  shareHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  shareHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  shareHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  shareHeaderSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  shareCloseBtn: {
    padding: 4,
  },
  shareDocContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  shareDocName: {
    flex: 1,
    fontSize: 13,
    color: "#1f2937",
    fontWeight: "500",
  },
  shareOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  shareOptionCard: {
    width: (440 - 24 - 24 - 20) / 3, // Responsive calculation
    alignItems: "center",
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  shareOptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
  shareOptionDesc: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  shareFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    alignItems: "center",
  },
  shareFooterText: {
    fontSize: 11,
    color: "#6b7280",
  },

  sharePanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sharePanelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  // Add to your StyleSheet

  emailNoResults: {
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  emailNoResultsText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
  },
  emailSuggestionTags: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  emailSuggestionTag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emailSuggestionTagRole: {
    backgroundColor: "#f3e8ff",
  },
  emailSuggestionTagText: {
    fontSize: 10,
    color: "#6b7280",
  },
  emailTagText: {
    fontSize: 13,
    color: "#1e293b",
    maxWidth: 150,
  },

  forumShareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  forumShareTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  forumShareSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  forumSelector: {
    marginBottom: 16,
  },

  commentSection: {
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  commentInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 80,
    textAlignVertical: "top",
  },
  forumShareActions: {
    flexDirection: "row",
    gap: 12,
  },

  qrOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  qrContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  qrHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  qrLoading: {
    padding: 40,
    alignItems: "center",
  },
  qrLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  qrDocName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
  },
  qrHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  qrActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    width: "100%",
  },
  qrActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  qrCopyBtn: {
    borderColor: "#e5e7eb",
    backgroundColor: "white",
  },
  qrDownloadBtn: {
    backgroundColor: "#1e3a8a",
    borderColor: "#1e3a8a",
  },
  qrActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e3a8a",
  },
  qrFooter: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 12,
    textAlign: "center",
    maxWidth: "100%",
  },

  emailModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  emailModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "90%",
    maxWidth: 480,
    maxHeight: "80%",
  },
  emailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  emailModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  emailModalBody: {
    padding: 20,
    gap: 16,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  emailInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  emailMessageInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  emailInfoBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  emailInfoText: {
    fontSize: 12,
    color: "#1e40af",
    marginBottom: 4,
    lineHeight: 16,
  },
  emailModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  emailModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emailModalBtnCancel: {
    backgroundColor: "#f3f4f6",
  },
  emailModalBtnCancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  emailModalBtnSend: {
    backgroundColor: "#2563eb",
  },
  emailModalBtnSendText: {
    color: "white",
    fontWeight: "600",
  },
  emailModalBtnDisabled: {
    opacity: 0.5,
  },

  // Email Modal - Additional Styles
  emailFieldContainer: {
    marginBottom: 16,
  },
  emailFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  emailFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  emailFieldBadge: {
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  emailFieldBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  emailTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
    minHeight: 48,
  },
  emailTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  emailTagCc: {
    backgroundColor: "#fef3c7",
  },
  emailTagBcc: {
    backgroundColor: "#fce4ec",
  },

  emailTagRemove: {
    padding: 2,
  },
  emailInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
  },
  emailSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 100,
    backgroundColor: "transparent",
  },
  emailInputSmall: {
    flex: 1,
    fontSize: 13,
    color: "#1f2937",
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
    backgroundColor: "transparent",
  },
  emailAddBtn: {
    padding: 4,
  },
  emailSuggestions: {
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 4,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  emailSuggestionItemLast: {
    borderBottomWidth: 0,
  },
  emailSuggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  emailSuggestionAvatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emailSuggestionInfo: {
    flex: 1,
  },
  emailSuggestionName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  emailSuggestionEmail: {
    fontSize: 12,
    color: "#6b7280",
  },
  emailSuggestionDept: {
    fontSize: 11,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emailFooterInfo: {
    flex: 1,
  },
  emailFooterText: {
    fontSize: 12,
    color: "#6b7280",
  },
  emailFooterActions: {
    flexDirection: "row",
    gap: 12,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  annotationModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  annotationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  annotationModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  selectedTextPreview: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedTextLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  selectedTextValue: {
    fontSize: 14,
    color: "#1f2937",
    fontStyle: "italic",
  },
  annotationTextInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#f9fafb",
  },
  annotationModalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  annotationModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  annotationModalBtnCancel: {
    backgroundColor: "#f3f4f6",
  },
  annotationModalBtnCancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  annotationModalBtnSave: {
    backgroundColor: "#7c3aed",
  },
  annotationModalBtnSaveText: {
    color: "white",
    fontWeight: "600",
  },
});
