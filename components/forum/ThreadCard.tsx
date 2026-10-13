import { API_BASE_URL } from "@/config/apiConfig";
import { authFetch } from "@/utils/authFetch";
import * as FileSystem from "expo-file-system";
import { documentDirectory } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Building2,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Mail,
  MapPin,
  RefreshCw,
  Smile,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Attachment,
  AudioPlayer,
  base64ToUri,
  formatDateAndTime,
  formatEditedTime,
  formatFileSize,
  getProfileImageUrl,
  InlineVideoPlayer,
  MessageContent,
  PDFViewerModal,
  QUICK_REACTIONS,
  SENTINEL_SYSTEM,
  styles,
  ThreadCardProps,
  Tooltip,
  UserProfile,
  useTimeWindow,
  WebVideoPlayer,
} from "./ThreadCardShared";

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ThreadCard({
  thread,
  currentUsername,
  currentUser,
  allUsers,
  onRetry,
  memberEmails = [],
  reactions = [],
  onReact,
  onEdit,
  onDelete,
  onUndoDelete,
}: ThreadCardProps) {
  // ── ALL HOOKS FIRST (never early-return before hooks) ──
  const [imageModal, setImageModal] = useState({ open: false, url: "" });
  const [videoModal, setVideoModal] = useState({ open: false, url: "" });
  const [pdfModal, setPdfModal] = useState({
    open: false,
    url: "",
    fileName: "",
  });
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [imageDataCache, setImageDataCache] = useState<Record<string, string>>(
    {},
  );
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageFetchAttempts, setImageFetchAttempts] = useState<
    Record<string, number>
  >({});

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionDetail, setShowReactionDetail] = useState<string | null>(
    null,
  );
  const [extraAttachmentData, setExtraAttachmentData] = useState<
    Record<string, any>
  >({});
  const [showUndo, setShowUndo] = useState(false);
  const [showReadBy, setShowReadBy] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!thread?.attachments?.length) return;
    thread.attachments.forEach(async (att) => {
      if (!att?.id) return;
      if (blobUrls[att.id]) return;
      const isFileTag =
        att.attachmentType === "VIDEO" ||
        att.attachmentType === "AUDIO" ||
        att.fileName?.toLowerCase().endsWith(".pdf") ||
        att.fileType === "application/pdf";
      if (!isFileTag) return;
      try {
        const res = await authFetch(
          `${API_BASE_URL}/api/forum/8d/files/${att.id}`,
        );
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrls((prev) => ({ ...prev, [att.id!]: url }));
      } catch (e) {
        console.error("blob fetch failed:", e);
      }
    });
  }, [thread?.attachments]);

  // useTimeWindow must be called unconditionally
  const {
    editAllowed,
    deleteAllowed,
    hardDeleteAllowed,
    editRemaining,
    deleteRemaining,
    hardDeleteRemaining,
  } = useTimeWindow(thread?.createdAt);

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const readBlinkAnim = useRef(new Animated.Value(1)).current;
  const readPulseAnim = useRef(new Animated.Value(1)).current;
  const prevStatusRef = useRef(thread?.deliveryStatus);

  // ── Safe guard AFTER hooks (returns null only for render) ──
  if (!thread) return null;

  // =====================================================
  // ATTACHMENT DATA PARSER
  // =====================================================
  const getAttachmentData = (attachment: Attachment) => {
    if (attachment.fileData && typeof attachment.fileData === "object") {
      return attachment.fileData;
    }

    if (
      attachment.fileData &&
      typeof attachment.fileData === "string" &&
      attachment.fileData.trim().startsWith("{")
    ) {
      try {
        return JSON.parse(attachment.fileData);
      } catch (error) {
        console.log("JSON parse error:", error);
      }
    }

    if (attachment.fileData && typeof attachment.fileData === "string") {
      try {
        let decoded;
        if (Platform.OS === "web") {
          decoded = atob(attachment.fileData);
        } else {
          try {
            decoded = Buffer.from(attachment.fileData, "base64").toString(
              "utf-8",
            );
          } catch (e) {
            decoded = decodeURIComponent(escape(atob(attachment.fileData)));
          }
        }
        if (decoded && decoded.trim().startsWith("{")) {
          return JSON.parse(decoded);
        }
      } catch (error) {
        console.log("Base64 decode error:", error);
      }
    }

    if (attachment.id && extraAttachmentData[attachment.id]) {
      return extraAttachmentData[attachment.id];
    }

    return null;
  };

  // =====================================================
  // FETCH ATTACHMENT DATA FOR LOCATION/EVENT
  // =====================================================
  useEffect(() => {
    if (!thread.attachments?.length) return;

    thread.attachments.forEach((att) => {
      if (
        (att.attachmentType === "LOCATION" || att.attachmentType === "EVENT") &&
        att.id &&
        !extraAttachmentData[att.id]
      ) {
        const fetchAttachmentData = async () => {
          try {
            const url = `${API_BASE_URL}/api/forum/8d/files/${att.id}`;
            const response = await authFetch(url);

            if (!response.ok) {
              console.error("Failed to fetch attachment:", response.status);
              return;
            }

            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
              try {
                const result = reader.result as string;
                const base64 = result.split(",")[1];

                if (!base64) {
                  console.error("No Base64 data found for attachment:", att.id);
                  return;
                }

                let decodedText;
                if (Platform.OS === "web") {
                  decodedText = atob(base64);
                } else {
                  try {
                    decodedText = Buffer.from(base64, "base64").toString(
                      "utf-8",
                    );
                  } catch (e) {
                    decodedText = decodeURIComponent(escape(atob(base64)));
                  }
                }

                const parsedData = JSON.parse(decodedText);
                console.log(
                  "✅ Attachment data loaded:",
                  att.attachmentType,
                  parsedData,
                );

                setExtraAttachmentData((prev) => ({
                  ...prev,
                  [att.id!]: parsedData,
                }));
              } catch (error) {
                console.error("❌ Failed to decode attachment data:", error);
              }
            };

            reader.onerror = () => {
              console.error("❌ FileReader error for attachment:", att.id);
            };

            reader.readAsDataURL(blob);
          } catch (error) {
            console.error("❌ Error fetching attachment data:", error);
          }
        };

        fetchAttachmentData();
      }
    });
  }, [thread.attachments]);

  const currentEmail = String(currentUser?.email || currentUsername || "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .toLowerCase();
  const isOwnMessage = thread.createdBy === currentEmail;
  const isDeleted = thread.isDeleted === true;

  const canEditNow = isOwnMessage && editAllowed;
  const canDeleteNow = isOwnMessage && deleteAllowed;

  // =====================================================
  // READ RECEIPTS
  // =====================================================
  const readBy = useMemo(() => {
    if (!thread.seenBy || thread.seenBy.length === 0) return [];
    const sender = (thread.createdBy || "").toLowerCase();
    return thread.seenBy.filter(
      (email) =>
        email &&
        email.toLowerCase() !== SENTINEL_SYSTEM &&
        email.toLowerCase() !== sender,
    );
  }, [thread.seenBy, thread.createdBy]);

  const deliveredByMembers = useMemo(() => {
    if (!thread.deliveredTo || thread.deliveredTo.length === 0) return [];
    const sender = (thread.createdBy || "").toLowerCase();
    const readLower = readBy.map((r) => r.toLowerCase());
    return thread.deliveredTo
      .map((e: string) => (e || "").toLowerCase())
      .filter(
        (e) =>
          e && e !== SENTINEL_SYSTEM && e !== sender && !readLower.includes(e),
      );
  }, [thread.deliveredTo, readBy, thread.createdBy]);

  const undeliveredMembers = useMemo(() => {
    if (!memberEmails || memberEmails.length === 0) return [];
    const sender = (thread.createdBy || "").toLowerCase();
    const deliveredLower = (thread.deliveredTo || []).map((e) =>
      (e || "").toLowerCase(),
    );
    const readLower = readBy.map((r) => r.toLowerCase());
    return memberEmails
      .map((e: any) => (typeof e === "string" ? e : e?.email))
      .filter(Boolean)
      .map((e: string) => e.toLowerCase())
      .filter(
        (e) =>
          e !== SENTINEL_SYSTEM &&
          e !== sender &&
          !readLower.includes(e) &&
          !deliveredLower.includes(e),
      );
  }, [memberEmails, thread.deliveredTo, readBy, thread.createdBy]);

  const readCount = readBy.length;
  const deliveredCount = deliveredByMembers.length;

  const deliveredToOthers = useMemo(() => {
    if (!thread.deliveredTo || thread.deliveredTo.length === 0) return false;
    const sender = (thread.createdBy || "").toLowerCase();
    return thread.deliveredTo.some((email: string) => {
      const lower = (email || "").toLowerCase();
      return lower !== sender && lower !== SENTINEL_SYSTEM;
    });
  }, [thread.deliveredTo, thread.createdBy]);

  const seenByOthers = useMemo(() => {
    if (!thread.seenBy || thread.seenBy.length === 0) return false;
    const sender = (thread.createdBy || "").toLowerCase();
    return thread.seenBy.some((email: string) => {
      const lower = (email || "").toLowerCase();
      return lower !== sender && lower !== SENTINEL_SYSTEM;
    });
  }, [thread.seenBy, thread.createdBy]);

  const showMenuButton = isOwnMessage && (canEditNow || canDeleteNow);

  useEffect(() => {
    if (!showMenu) return;
    if (!canEditNow && !canDeleteNow) {
      setShowMenu(false);
    }
  }, [showMenu, canEditNow, canDeleteNow]);

  useEffect(() => {
    if (thread.deliveryStatus === "SEEN" && prevStatusRef.current !== "SEEN") {
      blinkAnim.setValue(0.3);
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevStatusRef.current = thread.deliveryStatus;
  }, [thread.deliveryStatus]);

  useEffect(() => {
    if (isDeleted && isOwnMessage) {
      setShowUndo(true);
      const timer = setTimeout(() => setShowUndo(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowUndo(false);
    }
  }, [isDeleted, isOwnMessage]);

  const getStatusIcon = () => {
    if (thread.failed || thread.deliveryStatus === "FAILED") {
      return (
        <Pressable onPress={() => onRetry?.(thread)}>
          <RefreshCw size={13} color="#ef4444" />
        </Pressable>
      );
    }

    if (seenByOthers) {
      return (
        <Animated.View style={{ opacity: blinkAnim }}>
          <CheckCheck size={13} color="#3b82f6" />
        </Animated.View>
      );
    }

    if (deliveredToOthers) {
      return <CheckCheck size={13} color="#9ca3af" />;
    }

    if (thread.deliveryStatus === "SENDING") {
      return <Clock size={13} color="#9ca3af" />;
    }

    return <Check size={13} color="#9ca3af" />;
  };

  const getStatusWithCount = () => {
    const icon = getStatusIcon();

    if (!isOwnMessage || readCount === 0) return icon;

    let totalOthers = 0;
    if (memberEmails && memberEmails.length > 0) {
      totalOthers = memberEmails
        .map((e: any) => (typeof e === "string" ? e : e?.email))
        .filter(Boolean)
        .map((e: string) => e.toLowerCase())
        .filter(
          (e) =>
            e !== SENTINEL_SYSTEM && e !== (currentEmail || "").toLowerCase(),
        ).length;
    } else {
      totalOthers = readCount;
    }

    const everyoneRead = totalOthers > 0 && readCount >= totalOthers;

    if (everyoneRead) {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
          }}
        >
          {icon}
          <Animated.View
            style={{
              opacity: readBlinkAnim,
              transform: [{ scale: readPulseAnim }],
              backgroundColor: "#dcfce7",
              borderRadius: 8,
              paddingHorizontal: 3,
              paddingVertical: 1,
              marginLeft: 2,
            }}
          >
            <Eye size={13} color="#22c55e" />
          </Animated.View>
        </View>
      );
    }

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
        }}
      >
        {icon}
        <Text
          style={{
            fontSize: 10,
            color: "#3b82f6",
            fontWeight: "700",
            marginLeft: 2,
          }}
        >
          {readCount}
        </Text>
      </View>
    );
  };

  const groupedReactions = useMemo(() => {
    const groups: Record<
      string,
      { count: number; users: string[]; hasReacted: boolean }
    > = {};
    reactions?.forEach((r: any) => {
      if (!groups[r.content])
        groups[r.content] = { count: 0, users: [], hasReacted: false };
      groups[r.content].count++;
      groups[r.content].users.push(r.createdByName || r.createdBy);
      if (
        r.createdBy === currentUsername ||
        r.createdBy === currentUser?.email
      ) {
        groups[r.content].hasReacted = true;
      }
    });
    return groups;
  }, [reactions, currentUsername, currentUser]);

  const handleReactionSelect = (emoji: string) => {
    if (onReact && thread.id) {
      const threadId = String(thread.id);
      onReact(threadId, emoji);
    }
    setShowReactionBar(false);
  };

  const confirmDelete = () => {
    setShowMenu(false);

    if (!canDeleteNow) {
      Alert.alert(
        "Delete window expired",
        "You can only delete a message within 1 minute of sending.",
      );
      return;
    }

    const executeDelete = () => {
      console.log("🗑️ Executing delete for thread ID:", thread.id);
      onDelete?.(String(thread.id));
    };

    if (hardDeleteAllowed) {
      const msg =
        "This message will be permanently deleted for everyone. This cannot be undone.";
      if (Platform.OS === "web") {
        if (window.confirm(msg)) executeDelete();
      } else {
        Alert.alert("Delete Permanently?", msg, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]);
      }
    } else {
      const msg =
        "This message will be deleted for everyone. You can undo for 5 seconds.";
      if (Platform.OS === "web") {
        if (window.confirm(msg)) executeDelete();
      } else {
        Alert.alert("Delete Message?", msg, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete },
        ]);
      }
    }
  };

  const processedAttachments = useMemo(() => {
    if (!thread.attachments || thread.attachments.length === 0) return [];
    return thread.attachments
      .filter((att) => att != null)
      .map((attachment) => {
        let uri = "";
        let isValidData = false;
        if (
          attachment.fileData &&
          typeof attachment.fileData === "string" &&
          attachment.fileData.length > 0
        ) {
          if (attachment.fileData.length > 100) {
            isValidData = true;
            const mimeType =
              attachment.fileType ||
              (attachment.attachmentType === "IMAGE"
                ? "image/jpeg"
                : attachment.attachmentType === "VIDEO"
                  ? "video/mp4"
                  : attachment.attachmentType === "AUDIO"
                    ? "audio/mpeg"
                    : "application/octet-stream");
            uri = base64ToUri(attachment.fileData, mimeType);
          }
        }
        if (
          !uri &&
          attachment.attachmentType === "IMAGE" &&
          attachment.id &&
          imageDataCache[attachment.id]
        ) {
          uri = imageDataCache[attachment.id];
        }
        if (!uri && attachment.id) {
          uri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
        }
        return { ...attachment, uri, hasValidFileData: isValidData };
      });
  }, [thread.attachments, imageDataCache]);

  const loadImageData = async (
    attachment: Attachment & { hasValidFileData?: boolean },
  ) => {
    if (
      !attachment.id ||
      (attachment.attachmentType || "").toUpperCase() !== "IMAGE" ||
      loadingImages[attachment.id] ||
      imageDataCache[attachment.id] ||
      imageErrors[attachment.id]
    )
      return;
    if (attachment.hasValidFileData) return;
    const attempts = imageFetchAttempts[attachment.id] || 0;
    if (attempts >= 1) {
      setImageErrors((prev) => ({ ...prev, [attachment.id!]: true }));
      return;
    }
    setLoadingImages((prev) => ({ ...prev, [attachment.id!]: true }));
    setImageFetchAttempts((prev) => ({
      ...prev,
      [attachment.id!]: attempts + 1,
    }));
    try {
      const url = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      const response = await authFetch(url);
      if (!response.ok) {
        setImageErrors((prev) => ({ ...prev, [attachment.id!]: true }));
        setLoadingImages((prev) => ({ ...prev, [attachment.id!]: false }));
        return;
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const blob = await response.blob();
      if (blob.size < 100) {
        setImageErrors((prev) => ({ ...prev, [attachment.id!]: true }));
        setLoadingImages((prev) => ({ ...prev, [attachment.id!]: false }));
        return;
      }
      const reader = new FileReader();
      const dataUri = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          let dataUriResult = result;
          if (!result.startsWith("data:"))
            dataUriResult = `data:${contentType};base64,${result}`;
          resolve(dataUriResult);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setImageDataCache((prev) => ({ ...prev, [attachment.id!]: dataUri }));
    } catch (error) {
      setImageErrors((prev) => ({ ...prev, [attachment.id!]: true }));
    } finally {
      setLoadingImages((prev) => ({ ...prev, [attachment.id!]: false }));
    }
  };

  const openImagePreview = (url: string) => setImageModal({ open: true, url });
  const closeImagePreview = () => setImageModal({ open: false, url: "" });
  const openVideoPreview = (url: string) => {
    if (Platform.OS === "web") setVideoModal({ open: true, url });
    else Linking.openURL(url);
  };
  const closeVideoPreview = () => setVideoModal({ open: false, url: "" });
  const openPdfPreview = (url: string, fileName: string) =>
    setPdfModal({ open: true, url, fileName });
  const closePdfPreview = () =>
    setPdfModal({ open: false, url: "", fileName: "" });

  const downloadFile = async (attachment: Attachment) => {
    try {
      setLoading(true);
      const fileName = attachment.fileName || `file_${attachment.id}`;
      const url =
        blobUrls[attachment.id as number] || // blob first
        (attachment.uri && attachment.uri.startsWith("data:") // data: URIs are fine
          ? attachment.uri
          : "") ||
        (attachment.uri && attachment.uri.startsWith("blob:") // already a blob
          ? attachment.uri
          : "") ||
        `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`; // fallback
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setLoading(false);
        return;
      }
      const localUri = documentDirectory + fileName;
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri,
        {},
      );
      const result = await downloadResumable.downloadAsync();
      if (result && result.uri)
        await Sharing.shareAsync(result.uri, {
          mimeType: attachment.fileType || "application/octet-stream",
          dialogTitle: `Downloaded: ${fileName}`,
        });
      else Alert.alert("Error", "Download failed.");
    } catch (error) {
      Alert.alert("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = async (
    userIdentifier?: string | number | null,
  ) => {
    if (!userIdentifier) return;
    setProfileModalOpen(true);
    setProfileLoading(true);
    setProfileError(null);
    setFetchedProfile(null);
    if (allUsers && allUsers.length > 0) {
      const localUser = allUsers.find(
        (u: any) =>
          String(u.id) === String(userIdentifier) ||
          String(u.email).toLowerCase() ===
            String(userIdentifier).toLowerCase(),
      );
      if (localUser) {
        setFetchedProfile({
          id: localUser.id,
          name:
            localUser.name ||
            `${localUser.firstName || ""} ${localUser.lastName || ""}`.trim(),
          email: localUser.email,
          username: localUser.username,
          role: localUser.role,
          department: localUser.department,
          profilePhoto: localUser.profilePhoto || localUser.profileImage,
        });
        setProfileLoading(false);
        return;
      }
    }
    try {
      let url = `${API_BASE_URL}/api/users/${userIdentifier}`;
      let response = await authFetch(url);
      if (
        !response.ok &&
        typeof userIdentifier === "string" &&
        userIdentifier.includes("@")
      )
        response = await authFetch(
          `${API_BASE_URL}/api/users/by-email/${encodeURIComponent(userIdentifier)}`,
        );
      if (response.ok) {
        const data = await response.json();
        setFetchedProfile(data);
      } else
        setFetchedProfile({
          id: userIdentifier,
          name:
            thread.createdByName ||
            (typeof userIdentifier === "string" && userIdentifier.includes("@")
              ? userIdentifier.split("@")[0]
              : "User"),
          email:
            typeof userIdentifier === "string" && userIdentifier.includes("@")
              ? userIdentifier
              : undefined,
        });
    } catch (error) {
      setFetchedProfile({
        id: userIdentifier,
        name: thread.createdByName || "User",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // =====================================================
  // LOCATION RENDERER
  // =====================================================
  const renderLocation = (attachment: any, index: number) => {
    const location = getAttachmentData(attachment) || {};

    const latitude = Number(location.latitude ?? location.lat);
    const longitude = Number(location.longitude ?? location.lng);
    const address = location.address || location.name || "Shared location";

    const mapUrl =
      location.url ||
      location.mapUrl ||
      (Number.isFinite(latitude) && Number.isFinite(longitude)
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : "");

    const openLocation = async () => {
      if (!mapUrl) {
        Alert.alert(
          "Location unavailable",
          "No valid location information was provided.",
        );
        return;
      }

      try {
        if (Platform.OS === "web") {
          window.open(mapUrl, "_blank", "noopener,noreferrer");
        } else {
          const supported = await Linking.canOpenURL(mapUrl);
          if (supported) {
            await Linking.openURL(mapUrl);
          } else {
            Alert.alert(
              "Unable to open location",
              "No map application available",
            );
          }
        }
      } catch (error) {
        console.error("Open location error:", error);
        Alert.alert("Error", "Unable to open location");
      }
    };

    return (
      <Pressable
        key={index}
        onPress={openLocation}
        style={{
          marginTop: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#bfdbfe",
          backgroundColor: "#eff6ff",
          width: "100%",
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#3b82f6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <MapPin size={22} color="#fff" />
          </View>

          <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#1e40af",
                marginBottom: 3,
              }}
              numberOfLines={1}
            >
              Shared Live Location
            </Text>

            <Text
              style={{
                fontSize: 12,
                color: "#4b5563",
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {address}
            </Text>

            {Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              latitude !== 0 &&
              longitude !== 0 && (
                <Text
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                  }}
                  numberOfLines={1}
                >
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Text>
              )}
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: "#2563eb",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              flexShrink: 0,
            }}
            onPress={(e) => {
              e.stopPropagation();
              openLocation();
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              Open
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  // =====================================================
  // EVENT RENDERER
  // =====================================================
  const renderEvent = (attachment: any, index: number) => {
    const event = getAttachmentData(attachment) || {};

    const formatEventDateTime = (datetime: any): string => {
      if (!datetime) return "No date set";

      try {
        let date: Date;

        if (datetime instanceof Date) {
          date = datetime;
        } else if (typeof datetime === "number") {
          date = new Date(datetime);
        } else if (typeof datetime === "string") {
          let isoString = datetime.replace(/^"|"$/g, "").trim();

          if (!isoString.includes("T")) {
            isoString = isoString.replace(" ", "T");
          }

          if (!isoString.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(isoString)) {
            isoString += "Z";
          }

          date = new Date(isoString);
        } else {
          return "No date set";
        }

        if (isNaN(date.getTime())) return "Invalid date";

        return (
          date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          }) +
          " at " +
          date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        );
      } catch (error) {
        return "No date set";
      }
    };

    return (
      <View
        key={index}
        style={{
          marginTop: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#c4b5fd",
          backgroundColor: "#faf5ff",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            backgroundColor: "#7c3aed",
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Calendar size={18} color="#fff" />
          <Text
            style={{
              marginLeft: 8,
              color: "#fff",
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            EVENT
          </Text>
        </View>

        <View style={{ padding: 14 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#111827",
            }}
          >
            {event.title || "Event"}
          </Text>

          <Text
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#374151",
            }}
          >
            📅 {formatEventDateTime(event.datetime)}
          </Text>

          {event.location ? (
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#374151",
              }}
            >
              📍 {event.location}
            </Text>
          ) : null}

          {event.url ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(event.url)}
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                backgroundColor: "#7c3aed",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Open Event →
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  // =====================================================
  // ATTACHMENT RENDERER
  // =====================================================
  const renderAttachment = (attachment: any, index: number) => {
    if (!attachment) return null;

    // IMAGE
    if (attachment.attachmentType === "IMAGE") {
      let imageUri = attachment.uri || "";
      if (attachment.hasValidFileData && attachment.fileData)
        imageUri = base64ToUri(
          attachment.fileData,
          attachment.fileType || "image/jpeg",
        );
      else if (attachment.id && imageDataCache[attachment.id])
        imageUri = imageDataCache[attachment.id];
      else if (
        attachment.id &&
        !imageErrors[attachment.id] &&
        !loadingImages[attachment.id]
      )
        loadImageData(attachment);

      if (loadingImages[attachment.id] && !imageUri)
        return (
          <View key={index} style={styles.attachmentContainer}>
            <View
              style={[
                styles.imagePreview,
                { justifyContent: "center", alignItems: "center" },
              ]}
            >
              <ActivityIndicator size="large" color="#4a90d9" />
              <Text style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                Loading...
              </Text>
            </View>
          </View>
        );

      if (!imageUri || imageErrors[attachment.id])
        return (
          <View key={index} style={styles.attachmentContainer}>
            <View
              style={[
                styles.imagePreview,
                {
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#f3f4f6",
                },
              ]}
            >
              <Text style={{ fontSize: 40 }}>🖼️</Text>
              <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                {attachment.fileName || "Image"}
              </Text>
              {imageErrors[attachment.id] && (
                <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>
                  Failed to load
                </Text>
              )}
            </View>
          </View>
        );

      return (
        <View key={index} style={styles.attachmentContainer}>
          <Pressable onPress={() => openImagePreview(imageUri)}>
            <Image
              source={{ uri: imageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </Pressable>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.fileName || "Image"}
            </Text>
            <Pressable onPress={() => downloadFile(attachment)}>
              <Download size={18} color="green" />
            </Pressable>
          </View>
        </View>
      );
    }

    // VIDEO
    if (attachment.attachmentType === "VIDEO") {
      let videoUri = attachment.uri || "";
      if (attachment.fileData && attachment.fileData.length > 100)
        videoUri = base64ToUri(
          attachment.fileData,
          attachment.fileType || "video/mp4",
        );
      else if (attachment.id && blobUrls[attachment.id])
        videoUri = blobUrls[attachment.id];

      return (
        <View key={index} style={styles.attachmentContainer}>
          <InlineVideoPlayer uri={videoUri} />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.fileName || "Video"}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(attachment.fileSize)}
            </Text>
          </View>
        </View>
      );
    }

    // AUDIO
    if (attachment.attachmentType === "AUDIO") {
      let audioUri = attachment.uri || "";
      if (attachment.fileData && attachment.fileData.length > 100)
        audioUri = base64ToUri(
          attachment.fileData,
          attachment.fileType || "audio/mpeg",
        );
      else if (attachment.id && blobUrls[attachment.id])
        audioUri = blobUrls[attachment.id];
      return (
        <AudioPlayer
          key={index}
          uri={audioUri}
          fileName={attachment.fileName}
        />
      );
    }

    // LOCATION
    if (attachment.attachmentType === "LOCATION") {
      return renderLocation(attachment, index);
    }

    // EVENT
    if (attachment.attachmentType === "EVENT") {
      return renderEvent(attachment, index);
    }

    // PDF
    const isPDF =
      attachment.fileName?.toLowerCase().endsWith(".pdf") ||
      attachment.fileType === "application/pdf";
    let fileUri = attachment.uri || "";
    if (isPDF) {
      if (attachment.fileData && attachment.fileData.length > 100)
        fileUri = base64ToUri(
          attachment.fileData,
          attachment.fileType || "application/pdf",
        );
      else if (attachment.id && blobUrls[attachment.id])
        fileUri = blobUrls[attachment.id];
      return (
        <View key={index} style={styles.documentContainer}>
          <FileText size={32} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.fileName || "PDF Document"}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(attachment.fileSize)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (fileUri)
                openPdfPreview(fileUri, attachment.fileName || "document.pdf");
            }}
            style={{ padding: 8 }}
          >
            <Eye size={20} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => downloadFile(attachment)}>
            <Download size={20} color="green" />
          </TouchableOpacity>
        </View>
      );
    }

    // DEFAULT FILE
    return (
      <View key={index} style={styles.documentContainer}>
        <FileText size={32} color="#555" />
        <View style={{ flex: 1 }}>
          <Text style={styles.fileName} numberOfLines={1}>
            {attachment.fileName || "File"}
          </Text>
          <Text style={styles.fileSize}>
            {formatFileSize(attachment.fileSize)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => downloadFile(attachment)}>
          <Download size={20} color="green" />
        </TouchableOpacity>
      </View>
    );
  };

  const getAvatarUserId = () => {
    if (isOwnMessage) return currentUser?.id;
    const senderIdentifier = thread.createdBy;
    if (!senderIdentifier) return null;
    if (typeof senderIdentifier === "number") return senderIdentifier;
    if (
      typeof senderIdentifier === "string" &&
      !isNaN(Number(senderIdentifier)) &&
      !senderIdentifier.includes("@")
    )
      return Number(senderIdentifier);
    if (
      allUsers &&
      allUsers.length > 0 &&
      typeof senderIdentifier === "string" &&
      senderIdentifier.includes("@")
    ) {
      const matchedUser = allUsers.find(
        (u: any) =>
          String(u.email || "").toLowerCase() ===
            senderIdentifier.toLowerCase() ||
          String(u.username || "").toLowerCase() ===
            senderIdentifier.toLowerCase(),
      );
      if (matchedUser) return matchedUser.id;
    }
    return null;
  };

  const openLink = async (url: string) => {
    try {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }
      await Linking.openURL(finalUrl);
    } catch (error) {
      console.error("Open link error:", error);
      Alert.alert("Unable to open link");
    }
  };

  const avatarUserId = getAvatarUserId();
  const avatar = isOwnMessage
    ? getProfileImageUrl(currentUser?.id, currentUser?.profileImage)
    : getProfileImageUrl(avatarUserId, thread.createdByProfileImage);

  return (
    <>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Downloading...</Text>
        </View>
      )}

      <Modal
        visible={imageModal.open}
        transparent
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <View style={styles.imageModal}>
          <Pressable style={styles.closeButton} onPress={closeImagePreview}>
            <X size={30} color="white" />
          </Pressable>
          {imageModal.url && (
            <Image
              source={{ uri: imageModal.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {Platform.OS === "web" && (
        <Modal
          visible={videoModal.open}
          onRequestClose={closeVideoPreview}
          animationType="slide"
        >
          <WebVideoPlayer url={videoModal.url} onClose={closeVideoPreview} />
        </Modal>
      )}

      <Modal visible={pdfModal.open} onRequestClose={closePdfPreview}>
        <PDFViewerModal
          url={pdfModal.url}
          onClose={closePdfPreview}
          fileName={pdfModal.fileName}
        />
      </Modal>

      <Modal
        visible={profileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalOpen(false)}
      >
        <Pressable
          style={styles.profileModalBackdrop}
          onPress={() => setProfileModalOpen(false)}
        >
          <Pressable
            style={styles.profileModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalHeaderText}>User Profile</Text>
              <TouchableOpacity
                onPress={() => setProfileModalOpen(false)}
                style={styles.profileModalClose}
              >
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.profileModalBody}>
              {profileLoading ? (
                <View style={styles.profileLoadingContainer}>
                  <ActivityIndicator size="large" color="#00529B" />
                  <Text style={{ marginTop: 10, color: "#666" }}>
                    Loading profile...
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatarWrapper}>
                      {getProfileImageUrl(
                        fetchedProfile?.id,
                        fetchedProfile?.profilePhoto,
                      ) ? (
                        <Image
                          source={{
                            uri: getProfileImageUrl(
                              fetchedProfile?.id,
                              fetchedProfile?.profilePhoto,
                            )!,
                          }}
                          style={styles.profileAvatarImage}
                        />
                      ) : (
                        <Text style={styles.profileAvatarInitials}>
                          {fetchedProfile?.name
                            ? fetchedProfile.name.charAt(0).toUpperCase()
                            : "?"}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.profileModalName}>
                      {fetchedProfile?.name ||
                        fetchedProfile?.username ||
                        "User"}
                    </Text>
                    {fetchedProfile?.role && (
                      <Text style={styles.profileModalRole}>
                        {fetchedProfile.role}
                      </Text>
                    )}
                  </View>
                  <View style={styles.profileDetailsContainer}>
                    {fetchedProfile?.email && (
                      <View style={styles.profileDetailRow}>
                        <Mail size={18} color="#00529B" />
                        <Text style={styles.profileDetailLabel}>Email:</Text>
                        <Text style={styles.profileDetailValue}>
                          {fetchedProfile.email}
                        </Text>
                      </View>
                    )}
                    {fetchedProfile?.username && (
                      <View style={styles.profileDetailRow}>
                        <User size={18} color="#00529B" />
                        <Text style={styles.profileDetailLabel}>Username:</Text>
                        <Text style={styles.profileDetailValue}>
                          {fetchedProfile.username}
                        </Text>
                      </View>
                    )}
                    {fetchedProfile?.department && (
                      <View style={styles.profileDetailRow}>
                        <Building2 size={18} color="#00529B" />
                        <Text style={styles.profileDetailLabel}>
                          Department:
                        </Text>
                        <Text style={styles.profileDetailValue}>
                          {fetchedProfile.department}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* READ RECEIPT POPUP */}
      <Modal
        visible={showReadBy}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReadBy(false)}
      >
        <Pressable
          style={styles.readByBackdrop}
          onPress={() => setShowReadBy(false)}
        >
          <Pressable
            style={styles.readBySheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.readByHeader}>
              <Text style={styles.readByTitle}>Message Info</Text>
              <TouchableOpacity
                onPress={() => setShowReadBy(false)}
                style={styles.readByClose}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.readBySectionLabel}>READ BY ({readCount})</Text>

            {readCount === 0 ? (
              <Text style={styles.readByEmpty}>No one has read this yet</Text>
            ) : (
              readBy.map((email) => {
                const u = (allUsers || []).find(
                  (x: any) =>
                    (x.email || "").toLowerCase() === email.toLowerCase(),
                );
                const name =
                  `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                  u?.email ||
                  email;
                const initial = (name[0] || "?").toUpperCase();

                return (
                  <View key={email} style={styles.readByRow}>
                    <View style={styles.readByAvatar}>
                      <Text style={styles.readByAvatarText}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.readByName}>{name}</Text>
                      <Text style={styles.readByEmail}>{email}</Text>
                    </View>
                    <CheckCheck size={16} color="#3b82f6" />
                  </View>
                );
              })
            )}

            {deliveredCount > 0 && (
              <>
                <Text style={styles.readBySectionLabel}>
                  DELIVERED ({deliveredCount})
                </Text>
                {deliveredByMembers.map((email) => {
                  const u = (allUsers || []).find(
                    (x: any) =>
                      (x.email || "").toLowerCase() === email.toLowerCase(),
                  );
                  const name =
                    `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
                    u?.email ||
                    email;
                  const initial = (name[0] || "?").toUpperCase();

                  return (
                    <View key={email} style={styles.readByRow}>
                      <View style={[styles.readByAvatar, { opacity: 0.55 }]}>
                        <Text style={styles.readByAvatarText}>{initial}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.readByName, { color: "#94a3b8" }]}>
                          {name}
                        </Text>
                        <Text style={styles.readByEmail}>{email}</Text>
                      </View>
                      <CheckCheck size={16} color="#94a3b8" />
                    </View>
                  );
                })}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <View
        style={[
          styles.messageRow,
          isOwnMessage ? styles.rightAlign : styles.leftAlign,
        ]}
      >
        {showReactionBar && (
          <>
            <Pressable
              style={styles.popupBackdrop}
              onPress={() => setShowReactionBar(false)}
            />
            <View
              style={[
                styles.reactionBarContainer,
                isOwnMessage ? styles.reactionBarRight : styles.reactionBarLeft,
              ]}
            >
              <View style={styles.reactionBar}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReactionSelect(emoji)}
                    style={styles.reactionBarItem}
                  >
                    <Text style={{ fontSize: 18 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setShowReactionBar(false)}
                  style={styles.reactionBarItem}
                >
                  <X size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.avatarContainer}>
          <Pressable
            onPress={() =>
              handleProfileClick(
                isOwnMessage ? currentUser?.id : thread.createdBy,
              )
            }
          >
            {avatar && !avatarError ? (
              <Image
                source={{ uri: avatar }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <User size={16} color="#666" />
              </View>
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          {!isOwnMessage && (
            <Pressable onPress={() => handleProfileClick(thread.createdBy)}>
              <Text style={styles.senderName}>
                {thread.createdByName || thread.createdBy || "User"}
              </Text>
            </Pressable>
          )}

          {isDeleted ? (
            <View style={styles.tombstoneRow}>
              <Text style={styles.tombstoneIcon}>🚫</Text>
              <Text style={styles.deletedText}>This message was deleted</Text>
            </View>
          ) : (
            <>
              {processedAttachments.length > 0 &&
                processedAttachments.map((attachment, index) =>
                  renderAttachment(attachment, index),
                )}

              {thread.content && thread.messageType !== "EVENT" && (
                <MessageContent
                  content={thread.content}
                  onOpenLink={openLink}
                />
              )}
            </>
          )}

          <View
            style={[
              styles.timeRow,
              isOwnMessage ? styles.timeRight : styles.timeLeft,
            ]}
          >
            <Text style={styles.timeText}>
              {formatDateAndTime(thread.createdAt)}
            </Text>
            {thread.isEdited && !isDeleted && (
              <Text style={styles.editedText}>
                {thread.updatedAt || thread.editedAt
                  ? `(edited · ${formatEditedTime(thread.updatedAt || thread.editedAt)})`
                  : "(edited)"}
              </Text>
            )}

            {isOwnMessage && (
              <Tooltip
                label={(() => {
                  if (readCount === 0) return "Not read yet";

                  let totalOthers = 0;
                  if (memberEmails && memberEmails.length > 0) {
                    totalOthers = memberEmails
                      .map((e: any) => (typeof e === "string" ? e : e?.email))
                      .filter(Boolean)
                      .map((e: string) => e.toLowerCase())
                      .filter(
                        (e) =>
                          e !== SENTINEL_SYSTEM &&
                          e !== (currentEmail || "").toLowerCase(),
                      ).length;
                  } else {
                    totalOthers = readCount;
                  }
                  const everyoneRead =
                    totalOthers > 0 && readCount >= totalOthers;

                  if (everyoneRead) return "Seen by all";
                  if (readCount === 1) return "Read by 1";
                  return `Read by ${readCount} of ${totalOthers} — click to see`;
                })()}
              >
                <TouchableOpacity
                  onPress={() => setShowReadBy(true)}
                  style={styles.statusIcon}
                  activeOpacity={0.6}
                >
                  {getStatusWithCount()}
                </TouchableOpacity>
              </Tooltip>
            )}

            {isDeleted && isOwnMessage && showUndo && (
              <TouchableOpacity
                onPress={() => onUndoDelete?.(String(thread.id))}
                style={styles.undoBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            )}

            {!isDeleted && (
              <Tooltip label="React">
                <TouchableOpacity
                  onPress={() => setShowReactionBar(!showReactionBar)}
                  style={styles.actionIconBtn}
                  activeOpacity={0.7}
                >
                  <Smile size={16} color="#6b7280" />
                </TouchableOpacity>
              </Tooltip>
            )}

            {!isDeleted && canEditNow && (
              <Tooltip label="Edit message">
                <TouchableOpacity
                  onPress={() => onEdit?.(thread)}
                  style={styles.actionIconBtn}
                  activeOpacity={0.7}
                >
                  <Edit size={14} color="#374151" />
                </TouchableOpacity>
              </Tooltip>
            )}

            {!isDeleted && canDeleteNow && (
              <Tooltip label="Delete message">
                <TouchableOpacity
                  onPress={confirmDelete}
                  style={styles.actionIconBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </Tooltip>
            )}
          </View>

          {!isDeleted && Object.keys(groupedReactions).length > 0 && (
            <View
              style={{
                marginTop: 6,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 4,
                justifyContent: isOwnMessage ? "flex-end" : "flex-start",
              }}
            >
              {Object.entries(groupedReactions).map(([emoji, data]) => (
                <View
                  key={emoji}
                  style={{
                    alignItems: isOwnMessage ? "flex-end" : "flex-start",
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setShowReactionDetail(
                        showReactionDetail === emoji ? null : emoji,
                      )
                    }
                    style={[
                      styles.reactionBadge,
                      data.hasReacted && styles.reactionBadgeActive,
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                    <Text
                      style={[
                        styles.reactionCount,
                        data.hasReacted && styles.reactionCountActive,
                      ]}
                    >
                      {data.count}
                    </Text>
                  </TouchableOpacity>

                  {showReactionDetail === emoji && (
                    <View style={styles.reactionDetailPopup}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: 4,
                        }}
                      >
                        Reacted by:
                      </Text>
                      {data.users.map((userName: string, idx: number) => (
                        <Text
                          key={idx}
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            marginBottom: 2,
                          }}
                        >
                          • {userName}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );
}
