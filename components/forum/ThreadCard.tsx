// components/forum/ThreadCard.tsx
// FINAL VERSION - First Message Menu Fixed, Event Date Picker Support, Location Zoom, No Extra Spacing

import { API_BASE_URL } from "@/config/apiConfig";
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
  MoreVertical,
  Pause,
  Play,
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
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// =====================================================
// Types
// =====================================================

type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "LOCATION" | "EVENT" | "DOCUMENT";

interface Attachment {
  id?: string | number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string | any;
  attachmentType: AttachmentType | string;
  uri?: string;
}

interface Thread {
  id?: string | number;
  content?: string;
  createdBy?: string; 
  createdByName?: string;
  createdByProfileImage?: string;
  createdAt: string;
  messageType?: string;
  failed?: boolean;
  attachments?: Attachment[];
  isEdited?: boolean;
  deliveryStatus?: 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN' | 'FAILED';
  seenBy?: string[];
}

interface ThreadCardProps {
  thread: Thread;
  currentUsername?: string;
  currentUser?: {
    id?: string | number; 
    email?: string;
    profileImage?: string;
  };
  allUsers?: any[];
  onRetry?: (thread: Thread) => void;
  reactions?: any[];
  onReact?: (threadId: string | number, emoji: string) => void;
  onEdit?: (thread: Thread) => void;
  onDelete?: (threadId: string | number) => void;
}

interface UserProfile {
  id?: string | number;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  department?: string;
  profilePhoto?: string;
}

// =====================================================
// Helpers
// =====================================================

const getProfileImageUrl = (userId?: string | number | null, existingImage?: string) => {
  if (existingImage && (existingImage.startsWith('http') || existingImage.startsWith('data:'))) return existingImage;
  if (userId) return `${API_BASE_URL}/api/users/${userId}/profile-photo`;
  return null;
};

const isProductionBackend = () => {
  const url = API_BASE_URL || '';
  return !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('192.168.');
};

const parseBackendDate = (dateString: string): Date => {
  let isoString = dateString;
  if (!isoString.includes('T')) {
    isoString = isoString.replace(' ', 'T');
  }
  if (isProductionBackend() && !isoString.includes('Z') && !isoString.includes('+')) {
    isoString += 'Z';
  }
  return new Date(isoString);
};

const getTimeOnly = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDateAndTime = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = parseBackendDate(dateString);
    if (isNaN(date.getTime())) return "";
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
    
    if (diffDays === 0) return getTimeOnly(date);
    if (diffDays === 1) return `Yesterday, ${getTimeOnly(date)}`;
    if (diffDays < 7) return `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${getTimeOnly(date)}`;
    
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })}, ${getTimeOnly(date)}`;
  } catch (error) {
    return "";
  }
};

// ✅ FIX: Ultra-robust date parser for events with debug logging
const parseEventDate = (dateInput: any): string => {
  if (!dateInput) return "No date set";
  try {
    let date: Date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      const cleanStr = dateInput.replace(/^"|"$/g, '').trim();
      date = new Date(cleanStr);
      if (isNaN(date.getTime())) {
        const parts = cleanStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const [p1, p2, p3] = parts;
          if (parseInt(p1) > 12) {
            date = new Date(`${p3}-${p2}-${p1}`);
          } else {
            date = new Date(cleanStr);
          }
        }
      }
    } else {
      return "Invalid date format";
    }
    
    if (isNaN(date.getTime())) {
      console.warn("Invalid date parsed from:", dateInput);
      return "Invalid date";
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    console.warn("Date parse error:", error, dateInput);
    return "Invalid date";
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
const WebVideoPlayer = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedData = () => { setIsLoading(false); setError(null); };
      const handleError = () => { setError("Failed to load video"); setIsLoading(false); };
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
        video.pause(); video.src = ""; video.load();
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
        <TouchableOpacity onPress={onClose} style={styles.videoModalClose}><X size={28} color="white" /></TouchableOpacity>
        <Text style={styles.videoModalTitle}>Video</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.videoPlayerContainer}>
        {isLoading && (<View style={styles.videoLoadingOverlay}><ActivityIndicator size="large" color="#fff" /><Text style={styles.videoLoadingText}>Loading video...</Text></View>)}
        {error && (<View style={styles.videoErrorOverlay}><Text style={styles.videoErrorText}>⚠️ {error}</Text><TouchableOpacity onPress={() => { setError(null); setIsLoading(true); if (videoRef.current) videoRef.current.load(); }} style={styles.videoRetryBtn}><Text style={styles.videoRetryText}>Retry</Text></TouchableOpacity></View>)}
        <video ref={videoRef} src={url} controls playsInline style={{ width: "100%", height: "100%", backgroundColor: "#000", objectFit: "contain", display: error ? "none" : "block" }} />
      </View>
      <View style={styles.videoModalControls}>
        <TouchableOpacity onPress={togglePlay} style={styles.videoModalPlayBtn}>{isPlaying ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}</TouchableOpacity>
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
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (Platform.OS === "web" && uri) {
      try {
        const audio = new Audio(uri);
        audio.preload = "metadata";
        audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setIsLoading(false); });
        audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
        audio.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); });
        audio.addEventListener("error", () => { setError("Cannot play audio"); setIsLoading(false); });
        audioRef.current = audio;
        return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; } };
      } catch (err) { setError("Cannot setup audio"); setIsLoading(false); }
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
        <TouchableOpacity onPress={handlePlayPause} style={styles.audioPlayButton} disabled={!!error}><Play size={20} color="#fff" /></TouchableOpacity>
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
        <TouchableOpacity onPress={onClose} style={styles.pdfCloseButton}><X size={24} color="#000" /></TouchableOpacity>
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
export default function ThreadCard({ 
  thread, 
  currentUsername, 
  currentUser, 
  allUsers, 
  onRetry,
  reactions = [],
  onReact,
  onEdit,
  onDelete
}: ThreadCardProps) {  
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

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionDetail, setShowReactionDetail] = useState<string | null>(null);
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🙏', '👏'];

  const currentEmail = currentUser?.email || currentUsername;
  const isOwnMessage = thread.createdBy === currentEmail;

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const prevStatusRef = useRef(thread.deliveryStatus);

  useEffect(() => {
    if (thread.deliveryStatus === 'SEEN' && prevStatusRef.current !== 'SEEN') {
      blinkAnim.setValue(0.3);
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    prevStatusRef.current = thread.deliveryStatus;
  }, [thread.deliveryStatus]);

  const getStatusIcon = () => {
    if (thread.failed || thread.deliveryStatus === 'FAILED') {
      return (
        <Pressable onPress={() => onRetry?.(thread)}>
          <RefreshCw size={13} color="#ef4444" />
        </Pressable>
      );
    }

    const seenByOthers = thread.seenBy && thread.seenBy.length > 0 && 
      thread.seenBy.some((email: string) => email !== currentEmail);

    if (seenByOthers) {
      return (
        <Animated.View style={{ opacity: blinkAnim }}>
          <CheckCheck size={13} color="#3b82f6" />
        </Animated.View>
      );
    }

    switch (thread.deliveryStatus) {
      case 'SENDING': return <Clock size={13} color="#9ca3af" />;
      case 'SENT': return <Check size={13} color="#9ca3af" />;
      case 'DELIVERED': return <CheckCheck size={13} color="#9ca3af" />;
      case 'SEEN':
        return (
          <Animated.View style={{ opacity: blinkAnim }}>
            <CheckCheck size={13} color="#3b82f6" />
          </Animated.View>
        );
      default: return <CheckCheck size={13} color="#9ca3af" />;
    }
  };

  const groupedReactions = useMemo(() => {
    const groups: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
    reactions?.forEach((r: any) => {
      if (!groups[r.content]) groups[r.content] = { count: 0, users: [], hasReacted: false };
      groups[r.content].count++;
      groups[r.content].users.push(r.createdByName || r.createdBy);
      if (r.createdBy === currentUsername || r.createdBy === currentUser?.email) {
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
    const executeDelete = () => {
      console.log("🗑️ Executing delete for thread ID:", thread.id);
      onDelete?.(String(thread.id));
    };

    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm("Are you sure you want to delete this message?");
      if (isConfirmed) executeDelete();
    } else {
      Alert.alert(
        "Delete Message", 
        "Are you sure you want to delete this?", 
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDelete }
        ]
      );
    }
  };

  const processedAttachments = useMemo(() => {
    if (!thread.attachments || thread.attachments.length === 0) return [];
    return thread.attachments.filter(att => att != null).map((attachment) => {
      let uri = "";
      let isValidData = false;
      if (attachment.fileData && typeof attachment.fileData === 'string' && attachment.fileData.length > 0) {
        if (attachment.fileData.length > 100) {
          isValidData = true;
          const mimeType = attachment.fileType || (attachment.attachmentType === "IMAGE" ? "image/jpeg" : attachment.attachmentType === "VIDEO" ? "video/mp4" : attachment.attachmentType === "AUDIO" ? "audio/mpeg" : "application/octet-stream");
          uri = base64ToUri(attachment.fileData, mimeType);
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

  const loadImageData = async (attachment: Attachment & { hasValidFileData?: boolean }) => {
    if (!attachment.id || (attachment.attachmentType || "").toUpperCase() !== "IMAGE" || loadingImages[attachment.id] || imageDataCache[attachment.id] || imageErrors[attachment.id]) return;
    if (attachment.hasValidFileData) return;
    const attempts = imageFetchAttempts[attachment.id] || 0;
    if (attempts >= 1) { setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); return; }
    setLoadingImages(prev => ({ ...prev, [attachment.id!]: true }));
    setImageFetchAttempts(prev => ({ ...prev, [attachment.id!]: attempts + 1 }));
    try {
      const url = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
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
  const openVideoPreview = (url: string) => { if (Platform.OS === "web") setVideoModal({ open: true, url }); else Linking.openURL(url); };
  const closeVideoPreview = () => setVideoModal({ open: false, url: "" });
  const openPdfPreview = (url: string, fileName: string) => setPdfModal({ open: true, url, fileName });
  const closePdfPreview = () => setPdfModal({ open: false, url: "", fileName: "" });

  const downloadFile = async (attachment: Attachment) => {
    try {
      setLoading(true);
      const fileName = attachment.fileName || `file_${attachment.id}`;
      const url = attachment.uri || `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = url; link.download = fileName;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setLoading(false); return;
      }
      const localUri = documentDirectory + fileName;
      const downloadResumable = FileSystem.createDownloadResumable(url, localUri, {});
      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) await Sharing.shareAsync(result.uri, { mimeType: attachment.fileType || 'application/octet-stream', dialogTitle: `Downloaded: ${fileName}` });
      else Alert.alert("Error", "Download failed.");
    } catch (error) { Alert.alert("Download failed"); } finally { setLoading(false); }
  };

  const handleProfileClick = async (userIdentifier?: string | number | null) => {
    if (!userIdentifier) return;
    setProfileModalOpen(true); setProfileLoading(true); setProfileError(null); setFetchedProfile(null);
    if (allUsers && allUsers.length > 0) {
      const localUser = allUsers.find((u: any) => String(u.id) === String(userIdentifier) || String(u.email).toLowerCase() === String(userIdentifier).toLowerCase());
      if (localUser) {
        setFetchedProfile({ id: localUser.id, name: localUser.name || `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim(), email: localUser.email, username: localUser.username, role: localUser.role, department: localUser.department, profilePhoto: localUser.profilePhoto || localUser.profileImage });
        setProfileLoading(false); return;
      }
    }
    try {
      let url = `${API_BASE_URL}/api/users/${userIdentifier}`;
      let response = await fetch(url);
      if (!response.ok && typeof userIdentifier === 'string' && userIdentifier.includes('@')) response = await fetch(`${API_BASE_URL}/api/users/by-email/${encodeURIComponent(userIdentifier)}`);
      if (response.ok) { const data = await response.json(); setFetchedProfile(data); }
      else setFetchedProfile({ id: userIdentifier, name: thread.createdByName || (typeof userIdentifier === 'string' && userIdentifier.includes('@') ? userIdentifier.split('@')[0] : "User"), email: typeof userIdentifier === 'string' && userIdentifier.includes('@') ? userIdentifier : undefined });
    } catch (error) { setFetchedProfile({ id: userIdentifier, name: thread.createdByName || "User" }); }
    finally { setProfileLoading(false); }
  };

  const renderAttachment = (attachment: any, index: number) => {
    if (!attachment) return null;
    
    const type = (attachment.attachmentType || "").toUpperCase();

    if (type === "IMAGE") {
      let imageUri = attachment.uri || "";
      if (attachment.hasValidFileData && attachment.fileData) imageUri = base64ToUri(attachment.fileData, attachment.fileType || "image/jpeg");
      else if (attachment.id && imageDataCache[attachment.id]) imageUri = imageDataCache[attachment.id];
      else if (attachment.id && !imageErrors[attachment.id] && !loadingImages[attachment.id]) loadImageData(attachment);
      
      if (loadingImages[attachment.id] && !imageUri) return (<View key={index} style={styles.attachmentContainer}><View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color="#4a90d9" /><Text style={{ marginTop: 8, color: "#666", fontSize: 12 }}>Loading...</Text></View></View>);
      if (!imageUri || imageErrors[attachment.id]) return (<View key={index} style={styles.attachmentContainer}><View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6" }]}><Text style={{ fontSize: 40 }}>🖼️</Text><Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{attachment.fileName || "Image"}</Text>{imageErrors[attachment.id] && <Text style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>Failed to load</Text>}</View></View>);
      return (<View key={index} style={styles.attachmentContainer}><Pressable onPress={() => openImagePreview(imageUri)}><Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" onError={() => { if (attachment.id) setImageErrors(prev => ({ ...prev, [attachment.id!]: true })); }} /></Pressable><View style={styles.fileInfo}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "Image"}</Text><Pressable onPress={() => downloadFile(attachment)}><Download size={18} color="green" /></Pressable></View></View>);
    }
    
    if (type === "VIDEO") {
      let videoUri = attachment.uri || "";
      if (attachment.fileData && typeof attachment.fileData === 'string' && attachment.fileData.length > 100) videoUri = base64ToUri(attachment.fileData, attachment.fileType || "video/mp4");
      else if (Platform.OS === "web" && attachment.id) videoUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      return (<View key={index} style={styles.attachmentContainer}><Pressable style={styles.videoPreview} onPress={() => { if (videoUri) openVideoPreview(videoUri); else if (attachment.id) openVideoPreview(`${API_BASE_URL}/api/forum/8d/files/${attachment.id}`); }}><View style={styles.videoPlayIconContainer}><Play size={45} color="white" /></View><Text style={styles.videoLabel} numberOfLines={1}>{attachment.fileName || "Video"}</Text>{attachment.fileSize && <Text style={styles.videoSize}>{formatFileSize(attachment.fileSize)}</Text>}</Pressable></View>);
    }
    
    if (type === "AUDIO") {
      let audioUri = attachment.uri || "";
      if (attachment.fileData && typeof attachment.fileData === 'string' && attachment.fileData.length > 100) audioUri = base64ToUri(attachment.fileData, attachment.fileType || "audio/mpeg");
      else if (Platform.OS === "web" && attachment.id) audioUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      return <AudioPlayer key={index} uri={audioUri} fileName={attachment.fileName} />;
    }

    if (type === "LOCATION") {
      let location: any = {};
      try { 
        if (attachment.fileData) {
          if (typeof attachment.fileData === 'string') {
            try { location = JSON.parse(attachment.fileData); } 
            catch (e) { 
              try { location = JSON.parse(atob(attachment.fileData)); }
              catch (e2) { location = { url: attachment.fileData }; }
            }
          } else { location = attachment.fileData; }
        }
      } catch (error) { console.warn("Location parse error", error); }
      
      let mapUrl = location.url || location.mapUrl || location.uri;
      if (!mapUrl) {
        const lat = location.latitude || location.lat || location.coords?.latitude;
        const lng = location.longitude || location.lng || location.lon || location.coords?.longitude;
        if (lat && lng) {
          mapUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16`;
        } else {
          mapUrl = "https://maps.google.com";
        }
      }
      
      const locationName = location.name || location.title || location.address || "Shared Location";
      return (
        <Pressable key={index} style={styles.locationContainer} onPress={() => Linking.openURL(mapUrl)}>
          <MapPin size={20} color="#ef4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
            <Text style={styles.locationSubtext} numberOfLines={1}>Tap to open in maps</Text>
          </View>
        </Pressable>
      );
    }

    // ✅ FIX: Ultra-robust Event parsing checking multiple date keys
    if (type === "EVENT") {
      let event: any = {};
      try { 
        if (attachment.fileData) {
          if (typeof attachment.fileData === 'string') {
            try { 
              event = JSON.parse(attachment.fileData); 
            } catch (e) { 
              try { 
                event = JSON.parse(atob(attachment.fileData)); 
              } catch (e2) { 
                event = { title: attachment.fileData }; 
              }
            }
          } else { 
            event = attachment.fileData; 
          }
        }
      } catch (error) { 
        console.warn("Event parse error", error); 
      }
      
      // Check multiple possible date keys to ensure we find it
      const dateVal = event.datetime || event.date || event.time || event.timestamp;
      const dateDisplay = parseEventDate(dateVal);
      
      return (
        <View key={index} style={styles.eventContainer}>
          <Calendar size={22} color="#9333ea" />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={1}>{event.title || "Event"}</Text>
            <Text style={styles.eventDate} numberOfLines={2}>{dateDisplay}</Text>
            {event.description && (
              <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
            )}
          </View>
        </View>
      );
    }

    const isPDF = attachment.fileName?.toLowerCase().endsWith(".pdf") || attachment.fileType === "application/pdf";
    let fileUri = attachment.uri || "";
    if (isPDF) {
      if (attachment.fileData && typeof attachment.fileData === 'string' && attachment.fileData.length > 100) fileUri = base64ToUri(attachment.fileData, attachment.fileType || "application/pdf");
      else if (Platform.OS === "web" && attachment.id) fileUri = `${API_BASE_URL}/api/forum/8d/files/${attachment.id}`;
      return (<View key={index} style={styles.documentContainer}><FileText size={32} color="#dc2626" /><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "PDF Document"}</Text><Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text></View><TouchableOpacity onPress={() => { if (fileUri) openPdfPreview(fileUri, attachment.fileName || "document.pdf"); else if (attachment.id) openPdfPreview(`${API_BASE_URL}/api/forum/8d/files/${attachment.id}`, "document.pdf"); }} style={{ padding: 8 }}><Eye size={20} color="#2563eb" /></TouchableOpacity><TouchableOpacity onPress={() => downloadFile(attachment)}><Download size={20} color="green" /></TouchableOpacity></View>);
    }
    
    return (<View key={index} style={styles.documentContainer}><FileText size={32} color="#555" /><View style={{ flex: 1 }}><Text style={styles.fileName} numberOfLines={1}>{attachment.fileName || "File"}</Text><Text style={styles.fileSize}>{formatFileSize(attachment.fileSize)}</Text></View><TouchableOpacity onPress={() => downloadFile(attachment)}><Download size={20} color="green" /></TouchableOpacity></View>);
  };

  const getAvatarUserId = () => {
    if (isOwnMessage) return currentUser?.id;
    const senderIdentifier = thread.createdBy;
    if (!senderIdentifier) return null;
    if (typeof senderIdentifier === 'number') return senderIdentifier;
    if (typeof senderIdentifier === 'string' && !isNaN(Number(senderIdentifier)) && !senderIdentifier.includes('@')) return Number(senderIdentifier);
    if (allUsers && allUsers.length > 0 && typeof senderIdentifier === 'string' && senderIdentifier.includes('@')) {
      const matchedUser = allUsers.find((u: any) => String(u.email || "").toLowerCase() === senderIdentifier.toLowerCase() || String(u.username || "").toLowerCase() === senderIdentifier.toLowerCase());
      if (matchedUser) return matchedUser.id;
    }
    return null; 
  };

  const avatarUserId = getAvatarUserId();
  const avatar = isOwnMessage ? getProfileImageUrl(currentUser?.id, currentUser?.profileImage) : getProfileImageUrl(avatarUserId, thread.createdByProfileImage);

  return (
    <>
      {loading && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#ffffff" /><Text style={styles.loadingText}>Downloading...</Text></View>)}

      <Modal visible={imageModal.open} transparent animationType="fade" onRequestClose={closeImagePreview}><View style={styles.imageModal}><Pressable style={styles.closeButton} onPress={closeImagePreview}><X size={30} color="white" /></Pressable>{imageModal.url && <Image source={{ uri: imageModal.url }} style={styles.fullImage} resizeMode="contain" />}</View></Modal>
      {Platform.OS === "web" && (<Modal visible={videoModal.open} onRequestClose={closeVideoPreview} animationType="slide"><WebVideoPlayer url={videoModal.url} onClose={closeVideoPreview} /></Modal>)}
      <Modal visible={pdfModal.open} onRequestClose={closePdfPreview}><PDFViewerModal url={pdfModal.url} onClose={closePdfPreview} fileName={pdfModal.fileName} /></Modal>

      <Modal visible={profileModalOpen} transparent animationType="fade" onRequestClose={() => setProfileModalOpen(false)}>
        <Pressable style={styles.profileModalBackdrop} onPress={() => setProfileModalOpen(false)}>
          <Pressable style={styles.profileModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalHeaderText}>User Profile</Text>
              <TouchableOpacity onPress={() => setProfileModalOpen(false)} style={styles.profileModalClose}><X size={20} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.profileModalBody}>
              {profileLoading ? (
                <View style={styles.profileLoadingContainer}><ActivityIndicator size="large" color="#00529B" /><Text style={{ marginTop: 10, color: "#666" }}>Loading profile...</Text></View>
              ) : (
                <>
                  <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatarWrapper}>
                      {getProfileImageUrl(fetchedProfile?.id, fetchedProfile?.profilePhoto) ? (
                        <Image source={{ uri: getProfileImageUrl(fetchedProfile?.id, fetchedProfile?.profilePhoto)! }} style={styles.profileAvatarImage} />
                      ) : (
                        <Text style={styles.profileAvatarInitials}>{fetchedProfile?.name ? fetchedProfile.name.charAt(0).toUpperCase() : "?"}</Text>
                      )}
                    </View>
                    <Text style={styles.profileModalName}>{fetchedProfile?.name || fetchedProfile?.username || "User"}</Text>
                    {fetchedProfile?.role && <Text style={styles.profileModalRole}>{fetchedProfile.role}</Text>}
                  </View>
                  <View style={styles.profileDetailsContainer}>
                    {fetchedProfile?.email && (<View style={styles.profileDetailRow}><Mail size={18} color="#00529B" /><Text style={styles.profileDetailLabel}>Email:</Text><Text style={styles.profileDetailValue}>{fetchedProfile.email}</Text></View>)}
                    {fetchedProfile?.username && (<View style={styles.profileDetailRow}><User size={18} color="#00529B" /><Text style={styles.profileDetailLabel}>Username:</Text><Text style={styles.profileDetailValue}>{fetchedProfile.username}</Text></View>)}
                    {fetchedProfile?.department && (<View style={styles.profileDetailRow}><Building2 size={18} color="#00529B" /><Text style={styles.profileDetailLabel}>Department:</Text><Text style={styles.profileDetailValue}>{fetchedProfile.department}</Text></View>)}
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ✅ FIX: Removed messageRowPadded to eliminate "too much space" issue */}
      <View style={[
        styles.messageRow, 
        isOwnMessage ? styles.rightAlign : styles.leftAlign
      ]}>
        
        {showReactionBar && (
          <>
            <Pressable style={styles.popupBackdrop} onPress={() => setShowReactionBar(false)} />
            <View style={[styles.reactionBarContainer, isOwnMessage ? styles.reactionBarRight : styles.reactionBarLeft]}>
              <View style={styles.reactionBar}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity key={emoji} onPress={() => handleReactionSelect(emoji)} style={styles.reactionBarItem}><Text style={{ fontSize: 22 }}>{emoji}</Text></TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setShowReactionBar(false)} style={styles.reactionBarItem}><X size={16} color="#666" /></TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.avatarContainer}>
          <Pressable onPress={() => handleProfileClick(isOwnMessage ? currentUser?.id : thread.createdBy)}>
            {avatar && !avatarError ? (
              <Image source={{ uri: avatar }} style={styles.avatar} onError={() => setAvatarError(true)} />
            ) : (
              <View style={styles.defaultAvatar}><User size={16} color="#666" /></View>
            )}
          </Pressable>
        </View>
        
        <View style={[styles.messageBubble, isOwnMessage ? styles.myMessage : styles.otherMessage]}>
          {!isOwnMessage && (
            <Pressable onPress={() => handleProfileClick(thread.createdBy)}>
              <Text style={styles.senderName}>{thread.createdByName || thread.createdBy || "User"}</Text>
            </Pressable>
          )}
          
          {processedAttachments.length > 0 && processedAttachments.map((attachment, index) => renderAttachment(attachment, index))}
          {thread.content && thread.messageType !== "EVENT" && (<Text style={styles.messageText}>{thread.content}</Text>)}
          
          <View style={[styles.timeRow, isOwnMessage ? styles.timeRight : styles.timeLeft]}>
            <Text style={styles.timeText}>{formatDateAndTime(thread.createdAt)}</Text>
            {thread.isEdited && <Text style={styles.editedText}>(edited)</Text>}
            
            {isOwnMessage && (
              <View style={styles.statusIcon}>{getStatusIcon()}</View>
            )}
            
            <TouchableOpacity onPress={() => setShowReactionBar(!showReactionBar)} style={styles.actionIconBtn} activeOpacity={0.7}>
              <Smile size={16} color="#6b7280" />
            </TouchableOpacity>

            {isOwnMessage && (
              <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.actionIconBtn} activeOpacity={0.7}>
                <MoreVertical size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* ✅ FIX: Menu positioned tightly above the bubble (bottom: 100%, marginBottom: 4) with no extra row padding */}
          {showMenu && isOwnMessage && (
            <>
              <Pressable style={styles.popupBackdrop} onPress={() => setShowMenu(false)} />
              <View style={[styles.menuPopup, isOwnMessage ? styles.menuPopupRight : styles.menuPopupLeft]}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { onEdit?.(thread); setShowMenu(false); }}>
                  <Edit size={16} color="#374151" />
                  <Text style={styles.menuText}>Edit Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={confirmDelete}>
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {Object.keys(groupedReactions).length > 0 && (
            <View style={{ 
              marginTop: 6, 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: 4, 
              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' 
            }}>
              {Object.entries(groupedReactions).map(([emoji, data]) => (
                <View key={emoji} style={{ alignItems: isOwnMessage ? 'flex-end' : 'flex-start' }}>
                  <TouchableOpacity
                    onPress={() => setShowReactionDetail(showReactionDetail === emoji ? null : emoji)}
                    style={[
                      styles.reactionBadge, 
                      data.hasReacted && styles.reactionBadgeActive
                    ]}
                  >
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                    <Text style={[
                      styles.reactionCount, 
                      data.hasReacted && styles.reactionCountActive
                    ]}>
                      {data.count}
                    </Text>
                  </TouchableOpacity>

                  {showReactionDetail === emoji && (
                    <View style={styles.reactionDetailPopup}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
                        Reacted by:
                      </Text>
                      {data.users.map((userName: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
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

// =====================================================
// Styles
// =====================================================
const styles = StyleSheet.create({
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 14 },
  
  // ✅ FIX: Removed messageRowPadded to eliminate the "too much space" gap
  messageRow: { flexDirection: "row", marginVertical: 8, paddingHorizontal: 12, alignItems: "flex-end" },
  
  leftAlign: { justifyContent: "flex-start" },
  rightAlign: { justifyContent: "flex-end" },
  messageBubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  myMessage: { backgroundColor: "#dcf8c6", borderBottomRightRadius: 4 },
  otherMessage: { backgroundColor: "#ffffff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#eeeeee" },
  messageText: { fontSize: 15, color: "#222", lineHeight: 21 },
  senderName: { fontSize: 12, fontWeight: "600", color: "#00529B", marginBottom: 4, textDecorationLine: 'underline' },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  timeLeft: { justifyContent: "flex-start" },
  timeRight: { justifyContent: "flex-end" },
  timeText: { fontSize: 10, color: "#777" },
  editedText: { fontSize: 10, color: '#9ca3af', fontStyle: 'italic', marginLeft: 4 },
  statusIcon: { marginLeft: 4, alignItems: 'center', justifyContent: 'center', minWidth: 16 },
  
  actionIconBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  
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
  
  locationContainer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: "#fecaca" },
  locationText: { fontSize: 14, fontWeight: "500", color: "#991b1b" },
  locationSubtext: { fontSize: 11, color: "#dc2626", marginTop: 2 },
  eventContainer: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#faf5ff", padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: "#e9d5ff" },
  eventTitle: { fontWeight: "600", fontSize: 14, color: "#6b21a8" },
  eventDate: { fontSize: 12, color: "#7e22ce", marginTop: 2 },
  eventDescription: { fontSize: 11, color: "#9333ea", marginTop: 4, fontStyle: 'italic' },

  imageModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: Dimensions.get("window").width, height: Dimensions.get("window").height * 0.85 },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  pdfHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", backgroundColor: "#f5f5f5" },
  pdfTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  pdfCloseButton: { padding: 8 },
  profileModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  profileModalContent: { width: "85%", maxWidth: 400, backgroundColor: "white", borderRadius: 16, overflow: "hidden", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  profileModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  profileModalHeaderText: { fontSize: 18, fontWeight: "700", color: "#333" },
  profileModalClose: { padding: 4 },
  profileModalBody: { maxHeight: 400 },
  profileLoadingContainer: { padding: 40, alignItems: "center", justifyContent: "center" },
  profileAvatarContainer: { alignItems: "center", paddingVertical: 24, backgroundColor: "#f8f9fa", borderBottomWidth: 1, borderBottomColor: "#eee" },
  profileAvatarWrapper: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, overflow: "hidden" },
  profileAvatarImage: { width: "100%", height: "100%" },
  profileAvatarInitials: { fontSize: 36, fontWeight: "bold", color: "#00529B" },
  profileModalName: { fontSize: 20, fontWeight: "700", color: "#111", marginTop: 12, textAlign: "center" },
  profileModalRole: { fontSize: 14, color: "#666", marginTop: 4, textAlign: "center" },
  profileErrorText: { fontSize: 12, color: "#dc2626", marginTop: 8, textAlign: "center" },
  profileDetailsContainer: { padding: 20 },
  profileDetailRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  profileDetailLabel: { fontSize: 14, fontWeight: "600", color: "#555", marginLeft: 12, width: 90 },
  profileDetailValue: { flex: 1, fontSize: 14, color: "#111", fontWeight: "500" },
  
  popupBackdrop: { position: 'absolute', top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 50 },
  
  // ✅ FIX: Adjusted to -35 for cleaner floating without overlapping or pushing layout
  reactionBarContainer: { position: 'absolute', top: -35, zIndex: 100, paddingHorizontal: 12 },
  reactionBarLeft: { left: 0 },
  reactionBarRight: { right: 0 },
  reactionBar: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, padding: 6, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.15, shadowRadius: 4, elevation: 5, borderWidth: 1, borderColor: '#e5e7eb' },
  reactionBarItem: { paddingHorizontal: 8, paddingVertical: 4 },
  reactionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#e5e7eb' },
  reactionBadgeActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  reactionCount: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginLeft: 4 },
  reactionCountActive: { color: '#2563eb' },
  reactionDetailPopup: { backgroundColor: '#ffffff', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, minWidth: 120 },
  
  // ✅ FIX: Tight positioning (bottom: 100%, marginBottom: 4) eliminates extra space while keeping it visible
  menuPopup: { position: 'absolute', bottom: '100%', marginBottom: 2, marginTop: 6, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 100, minWidth: 150 },
  menuPopupRight: { right: 10 },
  menuPopupLeft: { left: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderBottomWidth: 0, borderBottomColor: '#f3f4f6' },
  menuText: { fontSize: 14, fontWeight: '500', color: '#374151' },
});