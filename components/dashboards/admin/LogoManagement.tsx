// components/dashboards/admin/LogoManagement.tsx
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter, // ✅ Added for native event emitting
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { API_BASE_URL } from "@/config/apiConfig";
const LOGO_API = `${API_BASE_URL}/api/logo`;
// DELETE the hardcoded line above

// ✅ Safe cross-platform event dispatcher
const notifyLogoUpdated = () => {
  try {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof CustomEvent !== "undefined"
    ) {
      window.dispatchEvent(new CustomEvent("logo-updated"));
      console.log("📤 logo-updated event dispatched (web)");
    } else {
      // ✅ For iOS and Android
      DeviceEventEmitter.emit("logo-updated");
      console.log("📤 logo-updated event dispatched (native)");
    }
  } catch (e) {
    console.log("Event dispatch not supported on this platform", e);
  }
};

export default function LogoManagement() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [logo, setLogo] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [logoInfo, setLogoInfo] = useState<any>(null);

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  useEffect(() => {
    return () => {
      // ✅ Only revoke if it's actually a web blob URL
      if (Platform.OS === "web" && preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const loadCurrentLogo = async () => {
    setLoading(true);
    try {
      const infoResponse = await fetch(`${LOGO_API}/info?t=${Date.now()}`);
      const info = await infoResponse.json();

      if (info.exists) {
        // ✅ ADD ?t=Date.now() to force fresh image download
        const logoResponse = await fetch(`${LOGO_API}?t=${Date.now()}`);
        if (logoResponse.ok) {
          const blob = await logoResponse.blob();

          // ✅ FIX: React Native <Image> cannot load blob: URLs.
          // We must convert it to a Base64 Data URI on mobile.
          if (Platform.OS === "web") {
            const logoUrl = URL.createObjectURL(blob);
            setCurrentLogo(logoUrl);
          } else {
            const reader = new FileReader();
            reader.onloadend = () => {
              setCurrentLogo(reader.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      } else {
        setCurrentLogo(null);
      }
    } catch (err) {
      console.log("No logo found", err);
      setCurrentLogo(null);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        if (Platform.OS === "web" && asset.base64) {
          setLogo(
            `data:${asset.mimeType || "image/png"};base64,${asset.base64}`,
          );
        } else {
          setLogo(asset.uri);
        }

        setPreview(asset.uri);
        setError("");
        setSuccess("");

        setLogoInfo({
          name: "logo.png",
          type: "image/png",
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (err) {
      console.error("Error picking image:", err);
      setError("Failed to select image");
    }
  };

  const handleUpload = async () => {
    if (!logo) {
      setError("Please select a logo to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      const filename = "logo.png";
      const mimeType = "image/png";

      if (Platform.OS === "web" && logo.startsWith("data:")) {
        const base64Response = await fetch(logo);
        const blob = await base64Response.blob();
        const file = new File([blob], filename, { type: mimeType });
        formData.append("file", file, filename);
      } else {
        formData.append("file", {
          uri: logo,
          type: mimeType,
          name: filename,
        } as any);
      }

      const method = currentLogo ? "PUT" : "POST";

      console.log("📤 Uploading:", { filename, mimeType, method });

      const response = await fetch(LOGO_API, {
        method: method,
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          setSuccess(result.message || "Logo uploaded successfully!");
        } catch {
          setSuccess("Logo uploaded successfully!");
        }

        // ✅ Notify Navbar to refresh logo
        notifyLogoUpdated();

        setLogo(null);
        setPreview(null);
        setLogoInfo(null);
        setTimeout(() => loadCurrentLogo(), 500);
      } else {
        try {
          const result = JSON.parse(responseText);
          setError(result.error || `Upload failed (${response.status})`);
        } catch {
          setError(`Upload failed (${response.status})`);
        }
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError("Network error: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const executeDelete = async () => {
    setDeleteConfirm(false);
    if (!currentLogo) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(LOGO_API, { method: "DELETE" });
      const result = await response.json();

      if (response.ok) {
        setSuccess(result.message || "Logo deleted successfully!");
        setCurrentLogo(null);

        setTimeout(() => loadCurrentLogo(), 500);

        // ✅ Notify Navbar to refresh logo
        notifyLogoUpdated();
      } else {
        setError(result.error || "Failed to delete logo");
      }
    } catch (err: any) {
      setError("Network error: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleRemove = () => {
    // ✅ Only revoke if it's actually a web blob URL
    if (Platform.OS === "web" && preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setLogo(null);
    setPreview(null);
    setLogoInfo(null);
    setError("");
    setSuccess("");
  };

  if (loading)
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#00529B" />
      </View>
    );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="border-b border-gray-200 bg-white px-4 pb-3 pt-4">
        <View
          style={
            isDesktop
              ? { maxWidth: 800, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          {/* 👇 FIXED: Added w-full to ensure justify-between works perfectly */}
          <View className="w-full flex-row items-center justify-between">
            {/* Left Side: Title and Icon */}
            {/* 👇 FIXED: Removed flex-1 and added flex-shrink so it doesn't steal space from the button */}
            <View className="flex-shrink flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <ImageIcon size={22} color="#7c3aed" />
              </View>
              <View className="ml-3">
                <Text className="text-lg font-bold text-gray-900">
                  Company Logo
                </Text>
                <Text className="text-xs text-gray-500">
                  Upload and manage your company logo
                </Text>
              </View>
            </View>

            {/* ✅ Right Side: RELOAD BUTTON */}
            {/* 👇 FIXED: Removed the {isDesktop && ...} wrapper so it is ALWAYS visible on all devices */}
            <TouchableOpacity
              onPress={loadCurrentLogo}
              disabled={loading}
              className="ml-4 flex-row items-center rounded-lg border border-blue-200 bg-blue-50 px-2 py-2"
              style={{ flexShrink: 0 }} // ✅ Prevents the button from ever being squished or hidden
            >
              {loading ? (
                <ActivityIndicator size="small" color="#00529B" />
              ) : (
                <>
                  <RefreshCw size={14} color="#00529B" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {success ? (
        <View
          className="mx-4 mt-3 flex-row items-center rounded-xl border border-green-200 bg-green-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 800, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <CheckCircle size={16} color="#16a34a" />
          <Text className="ml-2 flex-1 text-sm text-green-700">{success}</Text>
          <TouchableOpacity onPress={() => setSuccess("")}>
            <Text className="text-lg font-bold text-green-500">×</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? (
        <View
          className="mx-4 mt-3 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          style={
            isDesktop
              ? { maxWidth: 800, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <AlertCircle size={16} color="#dc2626" />
          <Text className="ml-2 flex-1 text-sm text-red-700">{error}</Text>
          <TouchableOpacity onPress={() => setError("")}>
            <Text className="text-lg font-bold text-red-500">×</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={
          isDesktop
            ? {
                maxWidth: 800,
                alignSelf: "center",
                width: "100%",
                paddingBottom: 40,
              }
            : { paddingBottom: 40 }
        }
      >
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-6">
          <Text className="mb-4 text-base font-semibold text-gray-800">
            Current Logo
          </Text>

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#00529B" />
              <Text className="mt-3 text-sm text-gray-500">Loading...</Text>
            </View>
          ) : currentLogo || preview ? (
            <View className="items-center">
              <View className="mb-4 h-24 w-40 items-center justify-center overflow-hidden rounded-xl border bg-gray-50">
                <Image
                  source={{ uri: preview || currentLogo || "" }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                  onError={() => console.log("Image load error")}
                />
              </View>

              <Text className="mb-3 text-sm font-medium text-gray-600">
                {preview ? "Logo selected for upload" : "Current company logo"}
              </Text>

              {logoInfo && preview && (
                <View className="mb-4 w-full rounded-lg bg-gray-50 p-3">
                  <Text className="mb-1 text-xs font-medium text-gray-700">
                    File Information
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Name: {logoInfo.name}
                  </Text>
                  {logoInfo.width && logoInfo.height && (
                    <Text className="text-xs text-gray-500">
                      Dimensions: {logoInfo.width} × {logoInfo.height}
                    </Text>
                  )}
                </View>
              )}

              <View className="flex-row gap-3">
                {currentLogo && !preview && (
                  <TouchableOpacity
                    onPress={() => setDeleteConfirm(true)}
                    disabled={uploading}
                    className="flex-row items-center rounded-lg bg-red-50 px-4 py-2.5"
                  >
                    <Trash2 size={16} color="#dc2626" />
                    <Text className="ml-2 text-sm font-medium text-red-600">
                      Remove Logo
                    </Text>
                  </TouchableOpacity>
                )}
                {preview && (
                  <>
                    <TouchableOpacity
                      onPress={handleRemove}
                      className="rounded-lg border border-gray-300 px-4 py-2.5"
                    >
                      <Text className="text-sm font-medium text-gray-700">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleUpload}
                      disabled={uploading}
                      className="flex-row items-center rounded-lg bg-blue-900 px-6 py-2.5"
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <CheckCircle size={16} color="white" />
                          <Text className="ml-2 text-sm font-medium text-white">
                            {currentLogo ? "Update Logo" : "Upload Logo"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ) : (
            <View className="items-center">
              <TouchableOpacity
                onPress={pickImage}
                className="mb-4 w-full items-center rounded-xl border-2 border-dashed border-gray-300 p-10"
              >
                <Upload size={36} color="#9ca3af" />
                <Text className="mt-3 text-sm font-medium text-gray-500">
                  Tap to choose logo image
                </Text>
                <Text className="mt-1 text-xs text-gray-400">
                  PNG, JPG, GIF, SVG up to 5MB
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImage}
                className="rounded-lg bg-blue-900 px-8 py-2.5"
              >
                <Text className="text-sm font-medium text-white">
                  Choose File
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={deleteConfirm} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50 p-4">
          <View className="w-80 rounded-xl bg-white p-6 shadow-lg">
            <Text className="mb-2 text-lg font-bold text-gray-900">
              Remove Logo
            </Text>
            <Text className="mb-6 text-sm text-gray-600">
              Are you sure you want to remove the company logo?
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2.5"
              >
                <Text className="text-sm font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={executeDelete}
                disabled={uploading}
                className="rounded-lg bg-red-600 px-4 py-2.5"
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Remove
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
