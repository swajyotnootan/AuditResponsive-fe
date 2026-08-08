import { API_BASE_URL } from "@/config/apiConfig";
import axios from "axios";
import * as FileSystem from "expo-file-system";
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

  const generatePdf = async () => {
    if (!eventId) {
      Alert.alert("Error", "Event ID is missing.");
      return;
    }

    setGenerating(true);
    try {
      
      // ✅ FIX 1: DO NOT send 'attachments'. Your Java PdfRequest DTO doesn't accept it!
      const payload = {
        title: title || "8D_Report",
        eventId: String(eventId), // Force String
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
      // ✅ FIX 2: DECODE THE 5207-BYTE BLOB TO SEE THE JAVA STACK TRACE
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

  return (
    <Pressable
      onPress={generatePdf}
      disabled={generating || !eventId}
      className="flex flex-row items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg shadow disabled:opacity-50 active:bg-indigo-700"
    >
      <View className="flex-row items-center gap-2">
        {generating ? (
          <View className="flex-row items-center gap-2">
            <View className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
            <Text className="font-medium text-white">Generating PDF...</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Text className="text-lg text-white">📥</Text>
            <Text className="font-medium text-white">Download PDF</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
