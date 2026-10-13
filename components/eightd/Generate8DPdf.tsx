import PDFViewer from "@/components/audit/PDFViewer";
import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

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

      const response = await axios.post(
        `${API_BASE_URL}/api/eightd/generate-pdf`,
        payload,
        { responseType: "arraybuffer" },
      );

      const buffer: ArrayBuffer = response.data;

      // ✅ Verify it's a real PDF
      const head = new TextDecoder("utf-8").decode(buffer.slice(0, 5));
      console.log("🔎 [8D] PDF header:", head);
      if (!head.startsWith("%PDF-")) {
        const txt = new TextDecoder("utf-8").decode(buffer);
        console.error("❌ [8D] Not a PDF:", txt.substring(0, 300));
        Alert.alert("Error", "Server did not return a PDF");
        return;
      }

      // ✅ Blob URL (no base64, no data: URI size limits, no encoding drift)
      const blob = new Blob([buffer], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      console.log("✅ [8D] Blob URL:", blobUrl, "size:", blob.size);

      setPDFViewer({
        visible: true,
        pdfData: blobUrl, // ← now a blob: URL
        fileName: `${title || "8D_Report"}.pdf`,
      });
    } catch (error: any) {
      console.error("Error viewing PDF:", error);
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
        <Pressable
          onPress={generatePdf}
          disabled={generating || !eventId}
          className="flex flex-row items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 shadow active:bg-indigo-700 disabled:opacity-50"
        >
          <View className="flex-row items-center gap-2">
            {generating ? (
              <View className="flex-row items-center gap-2">
                <View className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <Text className="font-medium text-white">
                  Generating PDF...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-lg text-white">📥</Text>
                <Text className="font-medium text-white">Download PDF</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* View PDF Button */}
        <Pressable
          onPress={handleViewPDF}
          disabled={generating || !eventId}
          className="flex flex-row items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 shadow active:bg-purple-700 disabled:opacity-50"
        >
          <View className="flex-row items-center gap-2">
            {generating ? (
              <View className="flex-row items-center gap-2">
                <View className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <Text className="font-medium text-white">Loading...</Text>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-lg text-white">📄</Text>
                <Text className="font-medium text-white">View PDF</Text>
              </View>
            )}
          </View>
        </Pressable>
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
