import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Download, FileText } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─────────────────────────────────────────────────────────────
// REUSABLE OUTLINE BUTTON (Matches other views)
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  border: "#E2E8F0",
  textValue: "#334155",
  textMuted: "#64748B",
};

const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? COLORS.primary : COLORS.border;
  const textColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textValue;
  const iconColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textMuted;
  const backgroundColor = isHoveredAndEnabled ? COLORS.primaryLight : "#FFFFFF";

  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg border px-4 py-2.5 shadow-sm"
      style={{
        borderColor,
        backgroundColor,
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
        transitionProperty: "all",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text
        className="text-sm font-semibold"
        style={{
          color: textColor,
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export interface Generate8DPdfProps {
  title?: string;
  eventId: string | number | null;
  formData: any;
  attachments?: any[];
}

export default function Generate8DPdf({
  title,
  eventId,
  formData,
  attachments = [],
}: Generate8DPdfProps) {
  const [generating, setGenerating] = useState<boolean>(false);
  const [pdfViewer, setPDFViewer] = useState({
    visible: false,
    pdfData: "",
    fileName: "",
  });

  const generatePdf = async () => {
    if (!eventId) {
      Alert.alert("Error", "Event ID is missing.");
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        title: title || "8D_Report",
        eventId: String(eventId),
        formData: formData || {},
      };

      console.log("🚀 Sending Payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/eightd/generate-pdf`,
        payload,
        { responseType: Platform.OS === "web" ? "blob" : "arraybuffer" },
      );

      const fileName = `${title || "8D_Report"}.pdf`;

      if (Platform.OS === "web") {
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const uint8Array = new Uint8Array(response.data);
        let binary = "";
        for (let i = 0; i < uint8Array.byteLength; i++)
          binary += String.fromCharCode(uint8Array[i]);
        const base64 = btoa(binary);
        const fs = FileSystem as any;
        const directory = fs.cacheDirectory || fs.documentDirectory || "";
        const fileUri = `${directory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: "base64" as any,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Save 8D Report",
          });
        }
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.data instanceof Blob) {
          const errorText = await error.response.data.text();
          console.error("❌ JAVA BACKEND STACK TRACE:", errorText);
          Alert.alert("Backend Crashed (500)", errorText.substring(0, 300));
        } else if (error.response.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder("utf-8");
          console.error(
            "❌ JAVA BACKEND STACK TRACE:",
            decoder.decode(error.response.data),
          );
        } else {
          console.error("❌ BACKEND ERROR:", error.response.data);
        }
      } else {
        console.error("Network Error:", error.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  // src/eightd/Generate8DPdf.tsx  (or wherever this file lives)

  const handleViewPDF = async () => {
    if (!eventId) {
      Alert.alert("Error", "Event ID is missing.");
      return;
    }

    setGenerating(true);

    try {
      const payload = {
        title: title || "8D_Report",
        eventId: String(eventId),
        formData: formData || {},
      };

      const fileName = `${title || "8D_Report"}.pdf`;

      // ════════════════════════════════════════════════════════════
      // WEB — keep the existing blob-URL flow, it works perfectly
      // ════════════════════════════════════════════════════════════
      if (Platform.OS === "web") {
        const response = await axios.post(
          `${API_BASE_URL}/api/eightd/generate-pdf`,
          payload,
          { responseType: "blob" },
        );

        const blobUrl = URL.createObjectURL(response.data);

        setPDFViewer({
          visible: true,
          pdfData: blobUrl,
          fileName,
        });
        return;
      }

      // ════════════════════════════════════════════════════════════
      // NATIVE (Android / iOS) — no Blob, write to disk instead
      // ════════════════════════════════════════════════════════════
      const response = await axios.post(
        `${API_BASE_URL}/api/eightd/generate-pdf`,
        payload,
        { responseType: "arraybuffer" },
      );

      const buffer: ArrayBuffer = response.data;

      // ✅ Sanity check: verify it's a real PDF
      const head = new TextDecoder("utf-8").decode(buffer.slice(0, 5));
      console.log("🔎 [8D] PDF header:", head);
      if (!head.startsWith("%PDF-")) {
        const txt = new TextDecoder("utf-8").decode(buffer);
        console.error("❌ [8D] Not a PDF:", txt.substring(0, 300));
        Alert.alert("Error", "Server did not return a PDF");
        return;
      }

      // ✅ Convert ArrayBuffer → base64 (no Blob involved)
      const uint8Array = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000; // avoid call-stack overflow for large PDFs
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(uint8Array.subarray(i, i + chunkSize)) as any,
        );
      }
      const base64 = btoa(binary);

      // ✅ Write to a real file:  file:///...
      const fs = FileSystem as any;
      const directory = fs.cacheDirectory || fs.documentDirectory;
      if (!directory) {
        Alert.alert("Error", "Storage not available.");
        return;
      }
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileUri = `${directory}8D_${eventId}_${safeName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64" as any,
      });

      // ✅ Verify the file exists
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || (info as any).size === 0) {
        Alert.alert("Error", "PDF file was not created.");
        return;
      }

      console.log("✅ [8D] Saved PDF to:", fileUri);

      // ✅ Pass file:// URI — PDFViewer.getPDFUri already returns it untouched
      setPDFViewer({
        visible: true,
        pdfData: fileUri,
        fileName,
      });
    } catch (error: any) {
      console.error("Error viewing PDF:", error);

      // Keep the detailed backend-error logging you already had
      if (error?.response) {
        try {
          if (error.response.data instanceof Blob) {
            const errorText = await error.response.data.text();
            console.error("❌ JAVA BACKEND STACK TRACE:", errorText);
            Alert.alert("Backend Crashed (500)", errorText.substring(0, 300));
            return;
          }
          if (error.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder("utf-8");
            const errorText = decoder.decode(error.response.data);
            console.error("❌ JAVA BACKEND STACK TRACE:", errorText);
            Alert.alert("Backend Crashed (500)", errorText.substring(0, 300));
            return;
          }
        } catch {
          /* fall through */
        }
      }

      Alert.alert("Error", "Failed to load PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Button Container */}
      <View className="flex-row items-center gap-3">
        {/* Download PDF Button */}
        <OutlineButton
          title={generating ? "Generating PDF..." : "Download PDF"}
          icon={Download}
          onPress={generatePdf}
          disabled={generating || !eventId}
          loading={generating}
        />

        {/* View PDF Button */}
        <OutlineButton
          title={generating ? "Loading..." : "View PDF"}
          icon={FileText}
          onPress={handleViewPDF}
          disabled={generating || !eventId}
          loading={generating}
        />
      </View>

      {/* PDF Viewer Modal */}
      <PDFViewer
        visible={pdfViewer.visible}
        pdfData={pdfViewer.pdfData}
        fileName={pdfViewer.fileName}
        auditId={String(eventId || "")}
        auditNumber={`8D-${eventId || ""}`}
        pdfType="8d"
        forumGroups={[
          {
            id: `8D-${eventId || ""}`,
            name: `📋 8D Report ${eventId || ""}`,
            type: "8D",
          },
          {
            id: "AUDIT-general-forum",
            name: "📢 General Discussion",
            type: "General",
          },
        ]}
        onClose={() =>
          setPDFViewer({ visible: false, pdfData: "", fileName: "" })
        }
        onShareComplete={(forumId?: string) => {
          Alert.alert("Success", "PDF shared to forum successfully!");
          setPDFViewer({ visible: false, pdfData: "", fileName: "" });
        }}
        currentUser={null}
        allUsers={[]}
      />
    </>
  );
}
