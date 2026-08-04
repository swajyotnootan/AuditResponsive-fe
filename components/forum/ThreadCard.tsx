// components/forum/ThreadCard.tsx
// FINAL STABLE VERSION - Profile, Date, & Attachments Fixed

import { API_BASE_URL } from "@/config/apiConfig";
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from "expo-file-system/legacy";
import * as Sharing from 'expo-sharing';
import {
  Calendar,
  Check,
  Download,
  Eye,
  FileText,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// =====================================================
// Types
// =====================================================

type AttachmentType =
  "IMAGE" | "VIDEO" | "AUDIO" | "LOCATION" | "EVENT" | "DOCUMENT";

interface Attachment {
  id?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string;
  attachmentType: AttachmentType;
  uri?: string;
}

interface Thread {
  id?: string;
  content?: string;
  createdBy?: string;
  createdByName?: string;
  createdByProfileImage?: string;
  createdAt: string;
  messageType?: string;
  failed?: boolean;
  attachments?: Attachment[];
}

interface ThreadCardProps {
  thread: Thread;
  currentUsername?: string;
  currentUser?: {
    email?: string;
    profileImage?: string;
  };
  onRetry?: (thread: Thread) => void;
}

// =====================================================
// Helpers
// =====================================================

// ✅ RESTORED: Correct Date & Time formatter
const formatTime = (date?: string) => {
  try {
    const value = new Date(date || "");
    if (isNaN(value.getTime())) {
      return "";
    }
    return value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, index)).toFixed(1) + " " + sizes[index];
};

const base64ToUri = (base64: string, mime: string) => {
  if (!base64) return "";
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
};

// =====================================================
// WEB VIDEO PLAYER
// =====================================================
const WebVideoPlayer = ({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedData = () => { setIsLoading(false); setError(null); };
      const handleError = (e: any) => { console.warn("Video error:", e); setError("Failed to load video"); setIsLoading(false); };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("error", handleError);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.pause();
        video.src = "";
        video.load();
      };
    }
  }, [url]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play().catch(() => setError("Cannot play video"));
  };

  return (
    <View style={styles.videoModalContainer}>
      <View style={styles.videoModalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.videoModalClose}>
          <X size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.videoModalTitle}>Video</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.videoPlayerContainer}>
        {isLoading && (
          <View style={styles.videoLoadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
          </View>
        )}
        {error && (
          <View style={styles.videoErrorOverlay}>
            <Text style={styles.videoErrorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => { setError(null); setIsLoading(true); if (videoRef.current) videoRef.current.load(); }} style={styles.videoRetryBtn}>
              <Text style={styles.videoRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <video ref={videoRef} src={url} controls playsInline style={{ width: "100%", height: "100%", backgroundColor: "#000", objectFit: "contain", display: error ? "none" : "block" }} />
      </View>
      <View style={styles.videoModalControls}>
        <TouchableOpacity onPress={togglePlay} style={styles.videoModalPlayBtn}>
          {isPlaying ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
        </TouchableOpacity>
        <Text style={styles.videoModalStatus}>{isPlaying ? "Playing" : "Paused"}</Text>
      </View>
    </View>
  );
};

// =====================================================
// WEB AUDIO PLAYER
// =====================================================
const WebAudioPlayer = ({ uri, fileName }: { uri: string; fileName?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (Platform.OS === "web" && uri) {
      try {
        const audio = new Audio(uri);
        audio.preload = "metadata";
        audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setIsLoading(false); });
        audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
        audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
        audio.addEventListener("error", (e) => { console.warn("Audio error:", e); setError("Cannot play audio"); setIsLoading(false); });
        audioRef.current = audio;
        return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; } };
      } catch (err) { console.warn("Audio setup error:", err); setError("Cannot setup audio"); setIsLoading(false); }
    }
  }, [uri]);

  const handlePlayPause = () => {
    if (error || !audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
    else { audioRef.current.play().then(() => { setIsPlaying(true); setError(null); }).catch(() => setError("Cannot play audio")); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  if (!uri) return ( <View style={styles.audioContainer}><Text style={styles.audioFileName}>{fileName || "Audio"}</Text><Text style={styles.audioError}>No audio data</Text></View> );

  return (
    <View style={styles.audioContainer}>
      <View style={styles.audioRow}>
        <TouchableOpacity onPress={handlePlayPause} style={styles.audioPlayButton} disabled={!!error || isLoading}>
          {isLoading ? <ActivityIndicator size="small" color="#fff" /> : isPlaying ? <Pause size={20} color="#fff" /> : <Play size={20} color="#fff" />}
        </TouchableOpacity>
        <View style={styles.audioInfo}>
          <Text style={styles.audioFileName} numberOfLines={1}>{fileName || "Audio"}</Text>
          <View style={styles.audioProgressContainer}>
            <View style={styles.audioProgressTrack}><View style={[styles.audioProgressFill, { width: `${progress}%` }]} /></View>
            <Text style={styles.audioTime}>{formatDuration(currentTime)} / {formatDuration(duration)}</Text>
          </View>
        </View>
        <Text style={styles.audioFileSize}>{formatFileSize(0)}</Text>
      </View>
      {error && <Text style={styles.audioError}>{error}</Text>}
    </View>
  );
};

// =====================================================
// NATIVE AUDIO PLAYER
// =====================================================
const NativeAudioPlayer = ({ uri, fileName }: { uri: string; fileName?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handlePlayPause = () => {
    if (!uri) { setError("Audio not available"); return; }
    if (!isPlaying) { Linking.openURL(uri).catch(() => setError("Cannot play audio")); }
    setIsPlaying(!isPlaying);
  };
  return (
    <View style={styles.audioContainer}>
      <View style={styles.audioRow}>
        <TouchableOpacity onPress={handlePlayPause} style={styles.audioPlayButton} disabled={!!error}>
          <Play size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.audioInfo}>
          <Text style={styles.audioFileName} numberOfLines={1}>{fileName || "Audio"}</Text>
          <Text style={styles.audioTime}>{isPlaying ? "Playing..." : "Tap to play"}</Text>
        </View>
        <Text style={styles.audioFileSize}>{formatFileSize(0)}</Text>
      </View>
      {error && <Text style={styles.audioError}>{error}</Text>}
    </View>
  );
};

// =====================================================
// AUDIO PLAYER
// =====================================================
const AudioPlayer = ({ uri, fileName }: { uri: string; fileName?: string }) => {
  if (!uri) return ( <View style={styles.audioContainer}><Text style={styles.audioFileName}>{fileName || "Audio"}</Text><Text style={styles.audioError}>No audio data</Text></View> );
  if (Platform.OS === "web") return <WebAudioPlayer uri={uri} fileName={fileName} />;
  return <NativeAudioPlayer uri={uri} fileName={fileName} />;
};

// =====================================================
// PDF VIEWER
// =====================================================
const PDFViewerModal = ({ url, onClose, fileName }: { url: string; onClose: () => void; fileName?: string }) => {
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={styles.pdfHeader}>
        <Text style={styles.pdfTitle}>{fileName || "PDF Document"}</Text>
        <TouchableOpacity onPress={onClose} style={styles.pdfCloseButton}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>
      {Platform.OS === "web" ? (
        <iframe src={url} style={{ width: "100%", height: "100%", border: "none", backgroundColor: "#fff" }} title="PDF Viewer" />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, marginBottom: 16 }}>Opening PDF...</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url)} style={{ backgroundColor: "#2563eb", padding: 12, borderRadius: 8 }}>
            <Text style={{ color: "white", fontWeight: "600" }}>Open PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// =====================================================
// COMPONENT
// =====================================================
export default function ThreadCard({ thread, currentUsername, currentUser, onRetry }: ThreadCardProps) {
  if (!thread) return null;

  const [imageModal, setImageModal] = useState({ open: false, url: "" });
  const [videoModal, setVideoModal] = useState({ open: false, url: "" });
  const [pdfModal, setPdfModal] = useState({ open: false, url: "", fileName: "" });
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [imageDataCache, setImageDataCache] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageFetchAttempts, setImageFetchAttempts] = useState<Record<string, number>>({});

  const currentEmail = currentUser?.email || currentUsername;
  const isOwnMessage = thread.createdBy === currentEmail;

  // Process attachments
  const processedAttachments = useMemo(() => {
    if (!thread.attachments || thread.attachments.length === 0) return [];
    return thread.attachments.filter(att => att != null).map((attachment) => {
      let uri = "";
      let isValidData = false;
      if (attachment.fileData && attachment.fileData.length > 0) {
        if (attachment.fileData.length > 100) {
          isValidData = true;
          const mimeType = attachment.fileType || (attachment.attachmentType === "IMAGE" ? "image/jpeg" : attachment.attachmentType === "VIDEO" ? "video/mp4" : attachment.attachmentType === "AUDIO" ? "audio/mpeg" : "application/octet-stream");
          uri = base64ToUri(attachment.fileData, mimeType);
        } else {
          console.warn(`⚠️ Corrupted data for ${attachment.fileName}: ${attachment.fileData.length} bytes`);
        }
      }
      if (!uri && attachment.attachmentType === "IMAGE" && attachment.id && imageDataCache[attachment.id]) {
        uri = imageDataCache[attachment.id];
      }
      if (!uri && attachment.id) {
        uri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      }
      return { ...attachment, uri, hasValidFileData: isValidData };
    });
  }, [thread.attachments, imageDataCache]);

  // Load image data from server
  const loadImageData = async (attachment: Attachment & { hasValidFileData?: boolean }) => {
    if (!attachment.id || attachment.attachmentType !== "IMAGE" || loadingImages[attachment.id] || imageDataCache[attachment.id] || imageErrors[attachment.id]) return;
    if (attachment.hasValidFileData) return;
    const attempts = imageFetchAttempts[attachment.id] || 0;
    if (attempts >= 1) { setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); return; }
    setLoadingImages(prev => ({ ...prev, [attachment.id!]: true }));
    setImageFetchAttempts(prev => ({ ...prev, [attachment.id!]: attempts + 1 }));
    try {
      const url = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      console.log("📥 Fetching image from server:", url);
      const response = await fetch(url);
      if (!response.ok) { setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); setLoadingImages(prev => ({ ...prev, [attachment.id!]: false })); return; }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const blob = await response.blob();
      if (blob.size < 100) { setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); setLoadingImages(prev => ({ ...prev, [attachment.id!]: false })); return; }
      const reader = new FileReader();
      const dataUri = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => { const result = reader.result as string; let dataUriResult = result; if (!result.startsWith("data:")) dataUriResult = `data:${contentType};base64,${result}`; resolve(dataUriResult); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setImageDataCache(prev => ({ ...prev, [attachment.id!]: dataUri }));
    } catch (error) { setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); }
    finally { setLoadingImages(prev => ({ ...prev, [attachment.id!]: false })); }
  };

  const openImagePreview = (url: string) => setImageModal({ open: true, url });
  const closeImagePreview = () => setImageModal({ open: false, url: "" });

  const openVideoPreview = (url: string) => {
    console.log("🎬 Opening video inside app:", url);
    if (Platform.OS === "web") {
      setVideoModal({ open: true, url });
    } else {
      Linking.openURL(url);
    }
  };
  const closeVideoPreview = () => setVideoModal({ open: false, url: "" });

  const openPdfPreview = (url: string, fileName: string) => {
    setPdfModal({ open: true, url, fileName });
  };
  const closePdfPreview = () => setPdfModal({ open: false, url: "", fileName: "" });

  const downloadFile = async (attachment: Attachment) => {
    try {
      setLoading(true);
      const fileName = attachment.fileName || `file_${attachment.id}`;
      const url = attachment.uri || `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;

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

      // Mobile: Save to storage
      const localUri = documentDirectory + fileName;
      const downloadResumable = FileSystem.createDownloadResumable(url, localUri, {});
      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        await Sharing.shareAsync(result.uri, { 
          mimeType: attachment.fileType || 'application/octet-stream', 
          dialogTitle: `Downloaded: ${fileName}` 
        });
      } else {
        Alert.alert("Error", "Download failed.");
      }
    } catch (error) {
      console.log("download error", error);
      Alert.alert("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const renderAttachment = (attachment: any, index: number) => {
    if (!attachment) return null;

    // 1. IMAGE
    if (attachment.attachmentType === "IMAGE") {
      let imageUri = attachment.uri || "";
      if (attachment.hasValidFileData && attachment.fileData) {
        const mimeType = attachment.fileType || "image/jpeg";
        imageUri = base64ToUri(attachment.fileData, mimeType);
      } else if (attachment.id && imageDataCache[attachment.id]) {
        imageUri = imageDataCache[attachment.id];
      } else if (attachment.id && !imageErrors[attachment.id] && !loadingImages[attachment.id]) {
        loadImageData(attachment);
      }
      if (loadingImages[attachment.id] && !imageUri) {
        return (<View key={index} style={styles.attachmentContainer}><View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color="#4a90d9" /><Text style={{ marginTop: 8, color: "#666", fontSize: 12 }}>Loading...</Text></View></View>);
      }
      if (!imageUri || imageErrors[attachment.id]) {
        return (<View key={index} style={styles.attachmentContainer}><View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6" }]}><Text style={{ fontSize: 40 }}>🖼️</Text><Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{attachment.fileName || "Image"}</Text>{imageErrors[attachment.id] && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>Failed to load</Text>}</View></View>);
      }
      return (<View key={index} style={styles.attachmentContainer}><Pressable onPress={() => openImagePreview(imageUri)}><Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" onError={() => { if (attachment.id) setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); }} /></Pressable><View style={styles.fileInfo}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "Image"}</Text><Pressable onPress={() => downloadFile(attachment)}><Download size={18} color="green" /></Pressable></View></View>);
    }

    // 2. VIDEO
    if (attachment.attachmentType === "VIDEO") {
      let videoUri = attachment.uri || "";
      if (attachment.fileData && attachment.fileData.length > 100) {
        const mimeType = attachment.fileType || "video/mp4";
        videoUri = base64ToUri(attachment.fileData, mimeType);
      } else if (Platform.OS === "web" && attachment.id) {
        videoUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      }
      return (<View key={index} style={styles.attachmentContainer}><Pressable style={styles.videoPreview} onPress={() => { if (videoUri) openVideoPreview(videoUri); else if (attachment.id) openVideoPreview(`${API_BASE_URL}/api/forum/8d/files/${attachment.id}`); }}><View style={styles.videoPlayIconContainer}><Play size={45} color="white" /></View><Text style={styles.videoLabel} numberOfLines={1}>{attachment.fileName || "Video"}</Text>{attachment.fileSize && <Text style={styles.videoSize}>{formatFileSize(attachment.fileSize)}</Text>}</Pressable></View>);
    }

    // 3. AUDIO
    if (attachment.attachmentType === "AUDIO") {
      let audioUri = attachment.uri || "";
      if (attachment.fileData && attachment.fileData.length > 100) {
        const mimeType = attachment.fileType || "audio/mpeg";
        audioUri = base64ToUri(attachment.fileData, mimeType);
      } else if (Platform.OS === "web" && attachment.id) {
        audioUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      }
      return <AudioPlayer key={index} uri={audioUri} fileName={attachment.fileName} />;
    }

    // 4. LOCATION
    if (attachment.attachmentType === "LOCATION") {
      let location: any = {};
      try { if (attachment.fileData) { const decoded = atob(attachment.fileData); location = JSON.parse(decoded); } } catch (error) { console.log("Location parse error", error); }
      return (<Pressable key={index} style={styles.locationContainer} onPress={() => { const map = location.url || location.mapUrl; if (map) Linking.openURL(map); }}><MapPin size={20} color="red" /><Text style={{ fontSize: 14 }}>Open shared location</Text></Pressable>);
    }

    // 5. EVENT
    if (attachment.attachmentType === "EVENT") {
      let event: any = {};
      try { if (attachment.fileData) { const decoded = atob(attachment.fileData); event = JSON.parse(decoded); } } catch (error) { console.log("Event parse error", error); }
      return (<View key={index} style={styles.eventContainer}><Calendar size={22} color="purple" /><View><Text style={styles.eventTitle}>{event.title || "Event"}</Text><Text style={{ fontSize: 12, color: "#555" }}>{event.datetime ? new Date(event.datetime).toLocaleString() : "No date"}</Text></View></View>);
    }

    // 6. PDF
    const isPDF = attachment.fileName?.toLowerCase().endsWith(".pdf") || attachment.fileType === "application/pdf";
    let fileUri = attachment.uri || "";
    if (isPDF) {
      if (attachment.fileData && attachment.fileData.length > 100) {
        const mimeType = attachment.fileType || "application/pdf";
        fileUri = base64ToUri(attachment.fileData, mimeType);
      } else if (Platform.OS === "web" && attachment.id) {
        fileUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      }
      return (<View key={index} style={styles.documentContainer}><FileText size={32} color="#dc2626" /><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "PDF Document"}</Text><Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text></View><TouchableOpacity onPress={() => { if (fileUri) openPdfPreview(fileUri, attachment.fileName || "document.pdf"); else if (attachment.id) openPdfPreview(`${API_BASE_URL}/api/forum/8d/files/${attachment.id}`, "document.pdf"); }} style={{ padding: 8 }}><Eye size={20} color="#2563eb" /></TouchableOpacity><TouchableOpacity onPress={() => downloadFile(attachment)}><Download size={20} color="green" /></TouchableOpacity></View>);
    }

    // 7. Generic File
    return (<View key={index} style={styles.documentContainer}><FileText size={32} color="#555" /><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "File"}</Text><Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text></View><TouchableOpacity onPress={() => downloadFile(attachment)}><Download size={20} color="green" /></TouchableOpacity></View>);
  };

  const getStatus = () => {
    if (thread.failed) return { icon: (<Pressable onPress={() => onRetry?.(thread)}><RefreshCw size={13} color="red" /></Pressable>), text: "Failed" };
    return { icon: <Check size={13} color="blue" />, text: "Sent" };
  };

  const status = getStatus();
  const avatar = isOwnMessage ? currentUser?.profileImage : thread.createdByProfileImage;

  return (
    <>
      {loading && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#ffffff" /><Text style={styles.loadingText}>Downloading...</Text></View>)}

      {/* Modals */}
      <Modal visible={imageModal.open} transparent animationType="fade" onRequestClose={closeImagePreview}>
        <View style={styles.imageModal}><Pressable style={styles.closeButton} onPress={closeImagePreview}><X size={30} color="white" /></Pressable>{imageModal.url && <Image source={{ uri: imageModal.url }} style={styles.fullImage} resizeMode="contain" />}</View>
      </Modal>
      {Platform.OS === "web" && (<Modal visible={videoModal.open} onRequestClose={closeVideoPreview} animationType="slide"><WebVideoPlayer url={videoModal.url} onClose={closeVideoPreview} /></Modal>)}
      <Modal visible={pdfModal.open} onRequestClose={closePdfPreview}><PDFViewerModal url={pdfModal.url} onClose={closePdfPreview} fileName={pdfModal.fileName} /></Modal>

      {/* Message Bubble */}
      <View style={[styles.messageRow, isOwnMessage ? styles.rightAlign : styles.leftAlign]}>
        <View style={styles.avatarContainer}>
          {avatar && !avatarError ? (<Image source={{ uri: avatar }} style={styles.avatar} onError={() => setAvatarError(true)} />) : (<View style={styles.defaultAvatar}><User size={16} color="#666" /></View>)}
        </View>
        <View style={[styles.messageBubble, isOwnMessage ? styles.myMessage : styles.otherMessage]}>
          {!isOwnMessage && (<Text style={styles.senderName}>{thread.createdByName || thread.createdBy || "User"}</Text>)}
          {processedAttachments.length > 0 && processedAttachments.map((attachment, index) => renderAttachment(attachment, index))}
          {thread.content && thread.messageType !== "EVENT" && (<Text style={styles.messageText}>{thread.content}</Text>)}
          <View style={[styles.timeRow, isOwnMessage ? styles.timeRight : styles.timeLeft]}>
            <Text style={styles.timeText}>{formatTime(thread.createdAt)}</Text>
            {isOwnMessage && (<View style={styles.statusIcon}>{status.icon}</View>)}
          </View>
        </View>
      </View>
    </>
  );
}

// =====================================================
// Styles
// =====================================================
const styles = StyleSheet.create({
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 14 },
  messageRow: { flexDirection: "row", marginVertical: 8, paddingHorizontal: 12, alignItems: "flex-end" },
  leftAlign: { justifyContent: "flex-start" },
  rightAlign: { justifyContent: "flex-end" },
  messageBubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  myMessage: { backgroundColor: "#dcf8c6", borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: "#ffffff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#eeeeee" },
  messageText: { fontSize: 15, color: "#222", lineHeight: 21 },
  senderName: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 4 },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  timeLeft: { justifyContent: "flex-start" },
  timeRight: { justifyContent: "flex-end" },
  timeText: { fontSize: 10, color: "#777" },
  statusIcon: { marginLeft: 4 },
  avatarContainer: { marginHorizontal: 6 },
  avatar: { height: 34, width: 34, borderRadius: 17 },
  defaultAvatar: { height: 34, width: 34, borderRadius: 17, backgroundColor: "#ddd", justifyContent: "center", alignItems: "center" },
  attachmentContainer: { marginTop: 8 },
  imagePreview: { width: 220, height: 180, borderRadius: 12, backgroundColor: "#f3f4f6" },
  fileInfo: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  fileName: { fontSize: 14, fontWeight: "600", color: "#333", flex: 1 },
  fileSize: { fontSize: 12, color: "#777", marginTop: 2 },
  videoPreview: { width: 220, height: 150, borderRadius: 12, backgroundColor: "#111", justifyContent: "center", alignItems: "center", position: "relative" },
  videoPlayIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  videoLabel: { color: "white", marginTop: 8, fontSize: 12, fontWeight: "500" },
  videoSize: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 2 },
  videoModalContainer: { flex: 1, backgroundColor: "black" },
  videoModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 44, paddingBottom: 16, backgroundColor: "rgba(0,0,0,0.9)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  videoModalClose: { padding: 8 },
  videoModalTitle: { color: "white", fontSize: 16, fontWeight: "600" },
  videoPlayerContainer: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  videoLoadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 10 },
  videoLoadingText: { color: "white", marginTop: 12, fontSize: 14 },
  videoErrorOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.9)", zIndex: 10, padding: 20 },
  videoErrorText: { color: "white", fontSize: 16, textAlign: "center", marginBottom: 16 },
  videoRetryBtn: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  videoRetryText: { color: "white", fontWeight: "600", fontSize: 14 },
  videoModalControls: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.9)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  videoModalPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  videoModalStatus: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  audioContainer: { backgroundColor: "#f0f0f0", padding: 12, borderRadius: 12, marginTop: 8, width: 260 },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  audioPlayButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#4a90d9", justifyContent: "center", alignItems: "center" },
  audioInfo: { flex: 1 },
  audioFileName: { fontSize: 12, fontWeight: "500", color: "#333", marginBottom: 4 },
  audioProgressContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  audioProgressTrack: { flex: 1, height: 3, backgroundColor: "#ddd", borderRadius: 2, overflow: "hidden" },
  audioProgressFill: { height: "100%", backgroundColor: "#4a90d9", borderRadius: 2 },
  audioTime: { fontSize: 10, color: "#666", minWidth: 50 },
  audioFileSize: { fontSize: 10, color: "#999" },
  audioError: { fontSize: 11, color: "red", marginTop: 4 },
  documentContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f3f3", padding: 10, borderRadius: 10, marginTop: 8, gap: 10 },
  locationContainer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#e7f0ff", padding: 10, borderRadius: 10, marginTop: 8 },
  eventContainer: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f2e5ff", padding: 12, borderRadius: 10, marginTop: 8 },
  eventTitle: { fontWeight: "700", fontSize: 14 },
  imageModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.85 },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  pdfHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", backgroundColor: "#f5f5f5" },
  pdfTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  pdfCloseButton: { padding: 8 },
});