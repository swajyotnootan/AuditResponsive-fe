// components/forum/ThreadCardShared.tsx
// Shared helpers, types, constants, sub-components, and styles for ThreadCard.

import { API_BASE_URL } from "@/config/apiConfig";
import { createEmojiDatabase } from "@softwhere-uz/react-native-emoji-keyboard";
import { Audio, ResizeMode, Video } from "expo-av";
import { Pause, Play, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// =====================================================
// TYPES
// =====================================================

export type AttachmentType =
  "IMAGE" | "VIDEO" | "AUDIO" | "LOCATION" | "EVENT" | "DOCUMENT";

export interface Attachment {
  id?: string | number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string | any;
  attachmentType: AttachmentType | string;
  uri?: string;
}

export interface Thread {
  id?: string | number;
  content?: string;
  createdBy?: string;
  createdByName?: string;
  createdByProfileImage?: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  messageType?: string;
  failed?: boolean;
  attachments?: Attachment[];
  isEdited?: boolean;
  deliveryStatus?: "SENDING" | "SENT" | "DELIVERED" | "SEEN" | "FAILED";
  seenBy?: string[];
  deliveredTo?: string[];
}

export interface ThreadCardProps {
  thread: Thread;
  currentUsername?: string;
  memberEmails?: string[];
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
  onUndoDelete?: (threadId: string | number) => void;
}

export interface UserProfile {
  id?: string | number;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  department?: string;
  profilePhoto?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const EDIT_WINDOW_MS = 3 * 60 * 1000;
export const DELETE_WINDOW_MS = 1 * 60 * 1000;
export const HARD_DELETE_WINDOW_MS = 5 * 1000;

export const SENTINEL_SYSTEM = "system@jws.com";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🙏", "👏"];

export const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

export const EMOJI_REGEX =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;

// =====================================================
// EMOJI NAME LOOKUP
// =====================================================

const emojiDb = createEmojiDatabase();

export const getEmojiName = (glyph: string): string | null => {
  if (!glyph) return null;
  try {
    const found: any = (emojiDb as any).fromGlyph?.(glyph);
    if (!found) return null;

    const name =
      found.n ??
      found.name ??
      found.label ??
      found.title ??
      found.annotation ??
      null;

    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch (e) {
    console.warn("Emoji lookup failed:", glyph, e);
    return null;
  }
};

// =====================================================
// GENERAL HELPERS
// =====================================================

export const getProfileImageUrl = (
  userId?: string | number | null,
  existingImage?: string,
) => {
  if (
    existingImage &&
    (existingImage.startsWith("http") || existingImage.startsWith("data:"))
  )
    return existingImage;
  if (userId) return `${API_BASE_URL}/api/users/${userId}/profile-photo`;
  return null;
};

export const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, index)).toFixed(1) + " " + sizes[index];
};

export const base64ToUri = (base64: string, mime: string) => {
  if (!base64) return "";
  if (base64.startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
};

// =====================================================
// DATE / TIME HELPERS
// =====================================================

export const parseBackendDate = (dateString: string): Date => {
  if (!dateString) return new Date();

  let isoString = String(dateString).trim();

  // Backend format: "2026-10-16 11:20:00" → make it ISO
  if (!isoString.includes("T")) {
    isoString = isoString.replace(" ", "T");
  }

  // ✅ If the backend doesn't append Z or an offset, treat it as UTC.
  //    Otherwise `new Date(...)` will interpret it as LOCAL time and
  //    the deployed server (UTC environment) will show the wrong hour.
  const hasZone =
    isoString.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(isoString);

  if (!hasZone) {
    isoString += "Z";
  }

  return new Date(isoString);
};

export const getTimeOnly = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateAndTime = (dateString?: string) => {
  if (!dateString) return "";

  try {
    const date = parseBackendDate(dateString);

    if (isNaN(date.getTime())) return "";

    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    const diffDays = Math.floor(
      (today.getTime() - messageDate.getTime()) / 86400000,
    );

    if (diffDays === 0) {
      return getTimeOnly(date);
    }

    if (diffDays === 1) {
      return `Yesterday, ${getTimeOnly(date)}`;
    }

    if (diffDays < 7) {
      return `${date.toLocaleDateString("en-US", {
        weekday: "long",
      })}, ${getTimeOnly(date)}`;
    }

    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })}, ${getTimeOnly(date)}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return "";
  }
};

export const formatEditedTime = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = parseBackendDate(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

export const isWithinWindow = (
  createdAt: string | undefined,
  windowMs: number,
): boolean => {
  if (!createdAt) return false;
  try {
    const created = parseBackendDate(createdAt).getTime();
    if (isNaN(created)) return false;
    return Date.now() - created <= windowMs;
  } catch {
    return false;
  }
};

export const canEdit = (thread: Thread): boolean =>
  isWithinWindow(thread.createdAt, EDIT_WINDOW_MS);

export const canDelete = (thread: Thread): boolean =>
  isWithinWindow(thread.createdAt, DELETE_WINDOW_MS);

// =====================================================
// useTimeWindow HOOK
// =====================================================

export interface TimeWindowResult {
  editAllowed: boolean;
  deleteAllowed: boolean;
  hardDeleteAllowed: boolean;
  editRemaining: number;
  deleteRemaining: number;
  hardDeleteRemaining: number;
}

export const EXPIRED_RESULT: TimeWindowResult = {
  editAllowed: false,
  deleteAllowed: false,
  hardDeleteAllowed: false,
  editRemaining: 0,
  deleteRemaining: 0,
  hardDeleteRemaining: 0,
};

export const useTimeWindow = (
  createdAt: string | undefined,
): TimeWindowResult => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!createdAt) return;

    const created = parseBackendDate(createdAt).getTime();
    if (isNaN(created)) return;

    const maxWindow = Math.max(EDIT_WINDOW_MS, DELETE_WINDOW_MS);
    if (Date.now() - created >= maxWindow) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt) return EXPIRED_RESULT;

  const created = parseBackendDate(createdAt).getTime();
  if (isNaN(created)) return EXPIRED_RESULT;

  const elapsed = now - created;
  const editRemaining = Math.max(0, EDIT_WINDOW_MS - elapsed);
  const deleteRemaining = Math.max(0, DELETE_WINDOW_MS - elapsed);
  const hardDeleteRemaining = Math.max(0, HARD_DELETE_WINDOW_MS - elapsed);

  return {
    editAllowed: editRemaining > 0,
    deleteAllowed: deleteRemaining > 0,
    hardDeleteAllowed: hardDeleteRemaining > 0,
    editRemaining,
    deleteRemaining,
    hardDeleteRemaining,
  };
};

export const formatRemaining = (ms: number): string => {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
};

// =====================================================
// EMOJI WITH TOOLTIP
// =====================================================

export const EmojiWithTooltip = ({ emoji }: { emoji: string }) => {
  const [visible, setVisible] = useState(false);
  const name = getEmojiName(emoji);

  if (!name) {
    return <Text style={styles.messageEmoji}>{emoji}</Text>;
  }

  if (Platform.OS === "web") {
    return (
      <View
        style={{ position: "relative" }}
        // @ts-ignore web-only events
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <Text style={styles.messageEmoji}>{emoji}</Text>
        {visible && (
          <View style={emojiTooltipStyles.bubble} pointerEvents="none">
            <Text style={emojiTooltipStyles.text}>{name}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ position: "relative" }}>
      <Pressable
        onLongPress={() => {
          setVisible(true);
          setTimeout(() => setVisible(false), 1800);
        }}
        delayLongPress={250}
      >
        <Text style={styles.messageEmoji}>{emoji}</Text>
      </Pressable>
      {visible && (
        <View style={emojiTooltipStyles.bubble} pointerEvents="none">
          <Text style={emojiTooltipStyles.text}>{name}</Text>
        </View>
      )}
    </View>
  );
};

export const emojiTooltipStyles = StyleSheet.create({
  bubble: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    marginLeft: -60,
    marginBottom: 4,
    backgroundColor: "rgba(17,24,39,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 120,
    alignItems: "center",
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});

// =====================================================
// TOOLTIP
// =====================================================

export const Tooltip = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  const [visible, setVisible] = useState(false);

  if (Platform.OS !== "web") return <>{children}</>;

  return (
    <View
      style={{ position: "relative" }}
      // @ts-ignore — web-only events
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <View style={tooltipStyles.bubble} pointerEvents="none">
          <Text style={tooltipStyles.text}>{label}</Text>
        </View>
      )}
    </View>
  );
};

export const tooltipStyles = StyleSheet.create({
  bubble: {
    position: "absolute",
    bottom: 30,
    right: 0,
    backgroundColor: "rgba(17,24,39,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 999,
    minWidth: 80,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
  },
});

// =====================================================
// MESSAGE CONTENT (URL + EMOJI aware)
// =====================================================

export const MessageContent = ({
  content,
  onOpenLink,
}: {
  content: string;
  onOpenLink: (url: string) => void;
}) => {
  const parts = content.split(URL_REGEX);

  return (
    <Text style={styles.messageText}>
      {parts.map((part, index) => {
        const isUrl =
          /^https?:\/\//i.test(part) ||
          /^www\./i.test(part) ||
          /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(part);

        if (isUrl) {
          return (
            <Text
              key={index}
              onPress={() => onOpenLink(part)}
              style={{
                color: "#2563eb",
                textDecorationLine: "underline",
                fontWeight: "600",
              }}
            >
              {part}
            </Text>
          );
        }

        const subParts = part.split(EMOJI_REGEX);

        return (
          <Text key={index}>
            {subParts.map((sub, subIdx) => {
              if (!sub) return null;

              EMOJI_REGEX.lastIndex = 0;
              const isEmoji = EMOJI_REGEX.test(sub);
              EMOJI_REGEX.lastIndex = 0;

              if (isEmoji) {
                return <EmojiWithTooltip key={subIdx} emoji={sub} />;
              }

              return <Text key={subIdx}>{sub}</Text>;
            })}
          </Text>
        );
      })}
    </Text>
  );
};

// =====================================================
// WEB VIDEO PLAYER
// =====================================================

export const WebVideoPlayer = ({
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
      const handleLoadedData = () => {
        setIsLoading(false);
        setError(null);
      };
      const handleError = () => {
        setError("Failed to load video");
        setIsLoading(false);
      };
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
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setIsLoading(true);
                if (videoRef.current) videoRef.current.load();
              }}
              style={styles.videoRetryBtn}
            >
              <Text style={styles.videoRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
            objectFit: "contain",
            display: error ? "none" : "block",
          }}
        />
      </View>
      <View style={styles.videoModalControls}>
        <TouchableOpacity onPress={togglePlay} style={styles.videoModalPlayBtn}>
          {isPlaying ? (
            <Pause size={24} color="white" />
          ) : (
            <Play size={24} color="white" />
          )}
        </TouchableOpacity>
        <Text style={styles.videoModalStatus}>
          {isPlaying ? "Playing" : "Paused"}
        </Text>
      </View>
    </View>
  );
};

// =====================================================
// WEB AUDIO PLAYER
// =====================================================

export const WebAudioPlayer = ({
  uri,
  fileName,
}: {
  uri: string;
  fileName?: string;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      Math.floor(seconds % 60),
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !uri) return;

    setIsPlaying(false);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      console.error("Audio error");
      setError("Cannot play audio");
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
    };
  }, [uri]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || error || isLoading) return;

    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      console.error("Play/Pause error:", err);
      setError("Playback failed");
      setIsPlaying(false);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!uri)
    return (
      <View style={styles.audioContainer}>
        <Text style={styles.audioFileName}>{fileName || "Audio"}</Text>
        <Text style={styles.audioError}>No audio data</Text>
      </View>
    );

  return (
    <View style={styles.audioContainer}>
      <audio
        ref={audioRef}
        src={uri}
        preload="metadata"
        crossOrigin="anonymous"
        style={{ display: "none" }}
      />

      <View style={styles.audioRow}>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={[
            styles.audioPlayButton,
            (isLoading || !!error) && { opacity: 0.5 },
          ]}
          disabled={isLoading || !!error}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isPlaying ? (
            <Pause size={20} color="#fff" />
          ) : (
            <Play size={20} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={styles.audioInfo}>
          <Text style={styles.audioFileName} numberOfLines={1}>
            {fileName || "Audio"}
          </Text>
          <View style={styles.audioProgressContainer}>
            <View style={styles.audioProgressTrack}>
              <View
                style={[styles.audioProgressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.audioTime}>
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </Text>
          </View>
        </View>

        <Text style={styles.audioFileSize}>{formatFileSize(0)}</Text>
      </View>

      {error && <Text style={styles.audioError}>⚠️ {error}</Text>}
    </View>
  );
};

// =====================================================
// NATIVE AUDIO PLAYER
// =====================================================

export const NativeAudioPlayer = ({
  uri,
  fileName,
}: {
  uri: string;
  fileName?: string;
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn("Audio mode setup failed", err);
      }
    };
    setupAudio();

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: false,
            isLooping: false,
          },
          (status: any) => {
            if (!isMounted) return;

            if (status.isLoaded) {
              setDuration(status.durationMillis || 0);
              setPosition(status.positionMillis || 0);
              setIsPlaying(status.isPlaying);

              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            } else if (status.error) {
              setError("Cannot play audio");
              setIsLoading(false);
            }
          },
        );

        if (isMounted) {
          setSound(newSound);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Cannot load audio");
          setIsLoading(false);
        }
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
      }
    };
  }, [uri]);

  const handlePlayPause = async () => {
    if (!sound || error) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.didJustFinish) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError("Playback failed");
      setIsPlaying(false);
    }
  };

  const formatTime = (millis: number) => {
    const seconds = Math.floor(millis / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60,
    ).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.audioContainer}>
      <View style={styles.audioRow}>
        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.audioPlayButton}
          disabled={!!error || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isPlaying ? (
            <Pause size={20} color="#fff" />
          ) : (
            <Play size={20} color="#fff" />
          )}
        </TouchableOpacity>
        <View style={styles.audioInfo}>
          <Text style={styles.audioFileName} numberOfLines={1}>
            {fileName || "Audio"}
          </Text>
          <View style={styles.audioProgressContainer}>
            <View style={styles.audioProgressTrack}>
              <View
                style={[styles.audioProgressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.audioTime}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
      </View>
      {error && <Text style={styles.audioError}>{error}</Text>}
    </View>
  );
};

// =====================================================
// INLINE VIDEO PLAYER
// =====================================================

export const InlineVideoPlayer = ({ uri }: { uri: string }) => {
  const videoRef = useRef<Video>(null);
  const webVideoRef = useRef<HTMLVideoElement>(null);

  if (Platform.OS === "web") {
    return (
      <View style={styles.videoPreview}>
        <video
          ref={webVideoRef}
          src={uri}
          controls
          playsInline
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 12,
            backgroundColor: "#000",
            objectFit: "contain",
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.videoPreview}>
      <Video
        ref={videoRef}
        style={{ width: "100%", height: "100%", borderRadius: 12 }}
        source={{ uri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
      />
    </View>
  );
};

// =====================================================
// AUDIO PLAYER WRAPPER
// =====================================================

export const AudioPlayer = ({
  uri,
  fileName,
}: {
  uri: string;
  fileName?: string;
}) => {
  if (!uri)
    return (
      <View style={styles.audioContainer}>
        <Text style={styles.audioFileName}>{fileName || "Audio"}</Text>
        <Text style={styles.audioError}>No audio data</Text>
      </View>
    );
  if (Platform.OS === "web")
    return <WebAudioPlayer uri={uri} fileName={fileName} />;
  return <NativeAudioPlayer uri={uri} fileName={fileName} />;
};

// =====================================================
// PDF VIEWER MODAL
// =====================================================

export const PDFViewerModal = ({
  url,
  onClose,
  fileName,
}: {
  url: string;
  onClose: () => void;
  fileName?: string;
}) => {
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={styles.pdfHeader}>
        <Text style={styles.pdfTitle}>{fileName || "PDF Document"}</Text>
        <TouchableOpacity onPress={onClose} style={styles.pdfCloseButton}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>
      {Platform.OS === "web" ? (
        <iframe
          src={url}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#fff",
          }}
          title="PDF Viewer"
        />
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, marginBottom: 16 }}>Opening PDF...</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            style={{ backgroundColor: "#2563eb", padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>Open PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// =====================================================
// SHARED STYLES
// =====================================================

export const styles = StyleSheet.create({
  menuItemDisabled: {
    opacity: 0.55,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 14 },
  messageRow: {
    flexDirection: "row",
    marginVertical: 8,
    paddingHorizontal: 12,
    alignItems: "flex-end",
  },
  leftAlign: { justifyContent: "flex-start" },
  rightAlign: { justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  myMessage: { backgroundColor: "#dcf8c6", borderBottomRightRadius: 4 },
  otherMessage: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#eeeeee",
  },
  messageText: { fontSize: 15, color: "#222", lineHeight: 21 },
  messageEmoji: {
    fontSize: 22,
    lineHeight: 32,
  },
  deletedText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    marginLeft: 6,
  },
  tombstoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tombstoneIcon: {
    fontSize: 14,
  },
  undoBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  undoText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00529B",
    marginBottom: 4,
    textDecorationLine: "underline",
  },
  timeRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  timeLeft: { justifyContent: "flex-start" },
  timeRight: { justifyContent: "flex-end" },
  timeText: { fontSize: 10, color: "#777" },
  editedText: {
    fontSize: 10,
    color: "#9ca3af",
    fontStyle: "italic",
    marginLeft: 4,
  },
  statusIcon: {
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 16,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  avatarContainer: { marginHorizontal: 6 },
  avatar: { height: 34, width: 34, borderRadius: 17 },
  defaultAvatar: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentContainer: { marginTop: 8 },
  imagePreview: {
    width: "100%",
    maxWidth: 300,
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  fileInfo: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  fileName: { fontSize: 14, fontWeight: "600", color: "#333", flex: 1 },
  fileSize: { fontSize: 12, color: "#777", marginTop: 2 },
  videoPreview: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 12,
    height: 150,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  videoModalContainer: { flex: 1, backgroundColor: "black" },
  videoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  videoModalClose: { padding: 8 },
  videoModalTitle: { color: "white", fontSize: 16, fontWeight: "600" },
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 10,
  },
  videoLoadingText: { color: "white", marginTop: 12, fontSize: 14 },
  videoErrorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.9)",
    zIndex: 10,
    padding: 20,
  },
  videoErrorText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  videoRetryBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  videoRetryText: { color: "white", fontWeight: "600", fontSize: 14 },
  videoModalControls: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  videoModalPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  videoModalStatus: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  audioContainer: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    width: "100%",
    minHeight: 64,
    justifyContent: "center",
  },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4a90d9",
    justifyContent: "center",
    alignItems: "center",
  },
  audioInfo: { flex: 1 },
  audioFileName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  audioProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#ddd",
    borderRadius: 2,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#4a90d9",
    borderRadius: 2,
  },
  audioTime: { fontSize: 10, color: "#666", minWidth: 50 },
  audioFileSize: { fontSize: 10, color: "#999" },
  audioError: { fontSize: 11, color: "red", marginTop: 4 },
  documentContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f3f3",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 10,
  },
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.85,
  },
  closeButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  pdfHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
  },
  pdfTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  pdfCloseButton: { padding: 8 },
  profileModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileModalContent: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileModalHeaderText: { fontSize: 18, fontWeight: "700", color: "#333" },
  profileModalClose: { padding: 4 },
  profileModalBody: { maxHeight: 400 },
  profileLoadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarContainer: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    overflow: "hidden",
  },
  profileAvatarImage: { width: "100%", height: "100%" },
  profileAvatarInitials: { fontSize: 36, fontWeight: "bold", color: "#00529B" },
  profileModalName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
    textAlign: "center",
  },
  profileModalRole: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  profileDetailsContainer: { padding: 20 },
  profileDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  profileDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 12,
    width: 90,
  },
  profileDetailValue: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    fontWeight: "500",
  },
  popupBackdrop: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 50,
  },
  reactionBarContainer: {
    position: "absolute",
    top: -20,
    zIndex: 100,
    paddingHorizontal: 12,
  },
  reactionBarLeft: { left: 0 },
  reactionBarRight: { right: 0 },
  reactionBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reactionBarItem: { paddingHorizontal: 8, paddingVertical: 4 },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  reactionBadgeActive: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  reactionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginLeft: 4,
  },
  reactionCountActive: { color: "#2563eb" },
  reactionDetailPopup: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  menuPopup: {
    position: "absolute",
    top: -20,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    minWidth: 150,
    paddingVertical: 4,
  },
  menuPopupRight: { right: 10 },
  menuPopupLeft: { left: 10 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  menuSubText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: "500",
  },
  menuSubTextDanger: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 2,
    fontWeight: "600",
  },
  readByBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  readBySheet: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "75%",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      web: { boxShadow: "0 6px 24px rgba(0,0,0,0.2)" },
    }),
  },
  readByHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  readByTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  readByClose: {
    padding: 4,
  },
  readBySectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
  },
  readByEmpty: {
    fontSize: 13,
    color: "#94A3B8",
    paddingVertical: 8,
    textAlign: "center",
  },
  readByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  readByAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  readByAvatarText: {
    color: "#00529B",
    fontWeight: "700",
    fontSize: 14,
  },
  readByName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  readByEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
});
