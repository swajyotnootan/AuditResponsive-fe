// components/forum/ForumThreadView.tsx
// COMPLETE FIXED VERSION - WhatsApp-style Date Headers, Cross-Platform Sound, Reactions, Edit & Delete

import EmailNotificationModal from '@/components/comform/EmailNotificationModal';
import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio as ExpoAudio } from "expo-av";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Settings,
  User,
  Users,
  X
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSFU } from "../../hooks/useSFU";
import {
  fetchGroupThreads,
  sendCallNotification
} from "./Api/forumapi";
import ThreadCard from "./ThreadCard";
import ThreadComposer from "./ThreadComposer";

// ============================================================================
// TYPES
// ============================================================================
interface ForumThreadViewProps {
  groupId: string | number;
  groupName?: string;
  isInDrawer?: boolean;
  setForumDrawerOpen?: (open: boolean) => void;
  username?: string;
  currentUser?: any;
  allUsers?: any[];
  onBack?: () => void;
  memberEmails?: any[];
}

// ============================================================================
// SOUND EFFECTS - MP3 SUPPORT (WEB & MOBILE)
// ============================================================================
const playNotificationSound = async (type: "send" | "receive") => {
  try {
    if (Platform.OS === "web") {
      const volume = type === "send" ? 0.5 : 0.3;
      const sound = new window.Audio("/sounds/message-send.mp3");
      sound.preload = "auto";
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch((err) => {
        console.log("🔇 Autoplay blocked (needs user interaction):", err?.message);
      });
      return;
    }

    const { sound } = await ExpoAudio.Sound.createAsync(
      require("../../assets/sounds/message-send.mp3"),
      { shouldPlay: true, volume: type === "send" ? 0.5 : 0.3 }
    );
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (err) {
    console.log("🔇 Sound error:", err);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ForumThreadView({
  groupId,
  groupName,
  isInDrawer = false,
  setForumDrawerOpen,
  username,
  currentUser,
  allUsers = [],
  onBack,
  memberEmails = [],
}: ForumThreadViewProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // ---- Core State ----
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);
  
  // ✅ NEW: Edit Mode State
  const [editingPost, setEditingPost] = useState<any>(null);

  // ---- Call State ----
  const [callState, setCallState] = useState<
    "idle" | "ringing" | "calling" | "connecting" | "connected" | "ended"
  >("idle");
  const [callerName, setCallerName] = useState("");
  const [callerId, setCallerId] = useState("");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [currentCallType, setCurrentCallType] = useState<"video" | "audio">("video");
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [individualCallState, setIndividualCallState] = useState<{
    isIncoming: boolean;
    isOutgoing: boolean;
    targetUser: any;
    caller: string | null;
    callerName: string;
    callId: string | null;
    callType: "video" | "audio";
  }>({
    isIncoming: false,
    isOutgoing: false,
    targetUser: null,
    caller: null,
    callerName: "",
    callId: null,
    callType: "video",
  });

  // ---- Search State ----
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [searchResultsCount, setSearchResultsCount] = useState(0);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [highlightedMatches, setHighlightedMatches] = useState<any[]>([]);

  // ---- Members State ----
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [showParticipantsSidebar, setShowParticipantsSidebar] = useState(false);

  // ---- Email & Settings ----
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");

  // ---- Refs ----
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const flatListRef = useRef<FlatList<any>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userCacheRef = useRef<Map<string, any>>(new Map());
  const lastPostCountRef = useRef(0);
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const initializationRef = useRef(false);
  const isCallEventSetRef = useRef(false);
  
  // ✅ FIX: Prevent infinite sound loop on polling
  const lastKnownPostIdsRef = useRef<Set<string>>(new Set());

  // ---- SFU (WebRTC) ----
  const isAuditForum = useMemo(() => {
    const idStr = String(groupId);
    return idStr.startsWith("AUDIT-") || idStr.includes("_AUDIT_");
  }, [groupId]);

  const mockSFU = {
    localStream: null,
    remoteStreams: {},
    isInCall: false,
    isAdmin: false,
    mediasoupConnected: true,
    cameraError: null,
    participants: [] as string[],
    connectionAttempts: 0,
    joinCall: async () => console.log("📞 Audio/Video disabled"),
    endCall: () => console.log("📞 Audio/Video disabled"),
    sendMediasoupMessage: () => console.log("📞 Audio/Video disabled"),
    manuallyConnect: () => console.log("🔗 Audio/Video disabled"),
    manuallyDisconnect: () => console.log("🔗 Audio/Video disabled"),
    setOnCallEvent: (_callback: ((data: any) => void) | null) => {},
    callType: "video" as "video" | "audio",
    connectionHealth: { instabilityCount: 0 },
  };

  const sfuData = isAuditForum
    ? mockSFU
    : useSFU(String(groupId), username || "user");

  const {
    localStream,
    remoteStreams,
    isInCall,
    isAdmin,
    mediasoupConnected,
    cameraError,
    participants,
    joinCall,
    endCall,
    sendMediasoupMessage,
    manuallyConnect,
    manuallyDisconnect,
    setOnCallEvent,
    callType: sfuCallType,
  } = sfuData;

  // ========== USER HELPERS ==========
  const currentUserEmail =
    currentUser?.email || username || (user as any)?.email || "";

  const displayName = useMemo(() => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`.trim();
    }
    return (
      currentUser?.firstName ||
      currentUser?.lastName ||
      currentUserEmail ||
      "User"
    );
  }, [currentUser, currentUserEmail]);

  const displayGroupName = useMemo(() => {
    if (groupName) return groupName;
    const idStr = String(groupId);
    if (idStr.startsWith("AUDIT-")) return "Audit Forum";
    if (idStr.startsWith("EVT-")) return `8D Discussion ${idStr}`;
    if (isNaN(Number(idStr))) return `Group ${idStr}`;
    return `Group ${idStr}`;
  }, [groupName, groupId]);

  // ========== USER CACHE ==========
  const getUserFromCache = useCallback(
    (userId: string) => {
      if (!userId) return null;
      if (userCacheRef.current.has(userId))
        return userCacheRef.current.get(userId);
      const found = allUsers?.find(
        (u: any) =>
          u.email === userId || u.username === userId || u.id === userId,
      );
      if (found) userCacheRef.current.set(userId, found);
      return found;
    },
    [allUsers],
  );

  const getDisplayName = useCallback(
    (userId: string) => {
      if (userId === username) return "You";
      const u = getUserFromCache(userId);
      return u
        ? `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
            u.username ||
            u.email
        : userId;
    },
    [getUserFromCache, username],
  );

  // ========== MEMBER SET ==========
  const normalizedMemberSet = useMemo(() => {
    if (
      !memberEmails ||
      !Array.isArray(memberEmails) ||
      memberEmails.length === 0
    ) {
      return new Set<string>();
    }
    return new Set(
      memberEmails
        .map((m: any) => {
          if (typeof m === "string") return m.toLowerCase();
          if (m?.email) return m.email.toLowerCase();
          if (m?.username) return m.username.toLowerCase();
          return "";
        })
        .filter(Boolean),
    );
  }, [memberEmails]);

  // ========== ENSURE GROUP EXISTS ==========
  const ensureGroupExists = async (): Promise<string | number> => {
    if (!mountedRef.current || !groupId) return groupId;

    try {
      const idStr = String(groupId);

      if (idStr.startsWith("AUDIT-") || idStr.includes("_AUDIT_")) {
        return groupId;
      }

      if (!isNaN(Number(idStr))) {
        return groupId;
      }

      const userEmail = currentUserEmail || "system@jws.com";
      const safeMemberEmails = Array.isArray(memberEmails) ? memberEmails : [];
      const memberEmailList = safeMemberEmails
        .map((m: any) => (typeof m === "string" ? m : m?.email || ""))
        .filter(Boolean);

      const requestBody = {
        groupId: idStr,
        groupName: groupName || `8D Group ${idStr}`,
        description: `8D Discussion for ${idStr}`,
        createdBy: userEmail,
        members: memberEmailList,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/forum/8d/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        return groupId;
      }

      return groupId;
    } catch (error) {
      return groupId;
    }
  };

  // ========== FETCH GROUP MEMBERS ==========
  const fetchGroupMembers = useCallback(() => {
    const safeMemberEmails = Array.isArray(memberEmails) ? memberEmails : [];
    const emailList = safeMemberEmails
      .map((m: any) => (typeof m === "string" ? m : m?.email || ""))
      .filter(Boolean);

    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];

    const members = emailList
      .map((email: string) => {
        const u = safeAllUsers.find(
          (x: any) => x?.email?.toLowerCase() === email?.toLowerCase(),
        );
        if (u) {
          return {
            ...u,
            email: u.email,
            isOnline: true,
            role: u.roleName || u.role || "member",
          };
        }
        const name = (email || "").split("@")[0];
        return {
          id: email,
          email,
          username: email,
          firstName: name,
          lastName: "",
          isOnline: false,
          role: "member",
        };
      })
      .filter(Boolean);

    setGroupMembers(members);
  }, [memberEmails, allUsers]);

  // ========== DATA FETCHING (FIXED SOUND LOOP) ==========
    // ========== DATA FETCHING ==========
    // ========== DATA FETCHING (WITH REAL READ RECEIPTS) ==========
  const loadPosts = useCallback(async () => {
    if (!groupId || !mountedRef.current) return;
    try {
      const response = await fetchGroupThreads(String(groupId));
      let postsData = [];
      if (response && typeof response === "object") {
        postsData = Array.isArray(response)
          ? response
          : response?.data || response?.posts || [];
      }
      if (!Array.isArray(postsData)) postsData = [];

      const newPosts = postsData.filter((p: any) => !lastKnownPostIdsRef.current.has(p.id));
      const isFirstLoad = lastKnownPostIdsRef.current.size === 0;
      const hasNewMessages = newPosts.length > 0 && !isFirstLoad;

      const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];

      const enriched = postsData.map((post: any) => {
        const u = safeAllUsers.find(
          (x: any) =>
            x?.email === post.createdBy ||
            x?.username === post.createdBy ||
            x?.id === post.createdBy,
        );

        // ✅ Assign delivery status for own messages loaded from DB
        let deliveryStatus = post.deliveryStatus;
        if (!deliveryStatus && post.createdBy === currentUserEmail) {
          deliveryStatus = 'DELIVERED';
        }

        return {
          ...post,
          createdByProfileImage: u?.profileImage || "",
          createdByName: u
            ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email
            : post.createdBy || "Unknown",
          deliveryStatus,
        };
      });

      if (mountedRef.current) {
        lastKnownPostIdsRef.current = new Set(postsData.map((p: any) => p.id));

        setPosts(
          enriched.sort(
            (a: any, b: any) =>
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime(),
          ),
        );
        setError(null);
        setUnreadCount(0);
        setLastSeen(new Date().toISOString());

        if (hasNewMessages) {
          const latestPost = newPosts[newPosts.length - 1];
          if (latestPost?.createdBy !== currentUserEmail) {
            playNotificationSound('receive');
          }
        }

        // ✅ REAL READ RECEIPTS: Mark all unread messages from OTHERS as "Seen"
        const unreadMessages = enriched.filter((p: any) => 
          p.createdBy !== currentUserEmail && 
          p.messageType !== 'REACTION' &&
          (!p.seenBy || !p.seenBy.includes(currentUserEmail))
        );

        // Fire-and-forget API calls to mark them as seen
        unreadMessages.forEach((p: any) => {
          fetch(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${p.id}/mark-seen?requester=${currentUserEmail}`, {
            method: 'POST',
            credentials: 'include'
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.error("❌ Load posts error:", err);
      if (mountedRef.current) setError("Failed to load messages");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId, allUsers, currentUserEmail]);
    // ========== POLLING ==========
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    loadPosts();
    pollingRef.current = setInterval(loadPosts, 5000); // Fetches every 5 seconds
    setIsChatConnected(true);
  }, [loadPosts]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (mountedRef.current) {
      setIsChatConnected(false);
    }
  }, []);



  // ========== SEND MESSAGE ==========
   // ========== SEND MESSAGE (NO MORE FAKE TIMERS) ==========
    // ========== SEND MESSAGE (FIXED 500 ERROR) ==========
  const handleNewPost = async (newPostData: any) => {
    if (!mountedRef.current || !groupId) return;

    const userEmail = currentUser?.email || username || "";
    const tempId = `temp-msg-${Date.now()}-${Math.random()}`;

    // ⏱️ Step 1: Optimistic message with SENDING status (Clock icon)
    const optimisticMsg = {
      id: tempId,
      title: newPostData.content?.substring(0, 30) || "New Message", // ✅ FIX: Add title
      content: newPostData.content,
      createdBy: userEmail,
      createdByName: displayName, // ✅ FIX: Add name
      createdAt: new Date().toISOString(),
      messageType: newPostData.messageType || "TEXT",
      attachments: newPostData.attachments || [],
      deliveryStatus: 'SENDING' as const,
    };

    setPosts(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newPostData.content?.substring(0, 30) || "New Message", // ✅ FIX: Backend requires title
          content: newPostData.content,
          createdBy: userEmail,
          createdByName: displayName, // ✅ FIX: Include sender's name
          messageType: newPostData.messageType || "TEXT",
          parentId: newPostData.parentId || null,
          attachments: newPostData.attachments || [],
        })
      });

      if (res.ok) {
        const savedMsg = await res.json();

        // ✅ Step 2: Server confirmed → SENT (single gray check ✓)
        setPosts(prev => prev.map(p =>
          p.id === tempId
            ? { ...savedMsg, deliveryStatus: 'SENT', createdByName: displayName }
            : p
        ));

        playNotificationSound('send');

      } else {
        const errorText = await res.text();
        console.error("❌ Send failed:", errorText);
        // ❌ Mark as FAILED
        setPosts(prev => prev.map(p =>
          p.id === tempId ? { ...p, deliveryStatus: 'FAILED', failed: true } : p
        ));
      }
    } catch (err) {
      console.error("❌ Send failed:", err);
      setPosts(prev => prev.map(p =>
        p.id === tempId ? { ...p, deliveryStatus: 'FAILED', failed: true } : p
      ));
    }
  };


  // ========== REACTIONS (FIXED: Only removes YOUR reaction) ==========
    // ========== REACTIONS (FIXED: Safe user matching & correct endpoints) ==========
    // ========== REACTIONS (SAFE USER MATCHING) ==========
   // ========== REACTIONS (FIXED 500 ERROR & SAFE MATCHING) ==========
  // components/forum/ForumThreadView.tsx
// Replace ONLY the handleReactToPost function

// ========== REACTIONS (COMPLETELY FIXED) ==========
  // ========== REACTIONS (MINIMAL PAYLOAD TO FIX 500 ERROR) ==========
 const handleReactToPost = async (
  postId: string | number,
  emoji: string
) => {
  if (!mountedRef.current || !groupId) return;

  const userEmail = String(currentUser?.email || username || "").trim();

  if (!userEmail) {
    console.error("❌ Cannot react: user email is missing");
    return;
  }

  if (!emoji?.trim()) {
    console.error("❌ Cannot react: emoji is missing");
    return;
  }

  // Normalize the post ID.
  const normalizedPostId = String(postId).trim();

  if (!normalizedPostId) {
    console.error("❌ Cannot react: post ID is missing");
    return;
  }

  // Your backend appears to use Long/number IDs for threads.
  const numericPostId = Number(normalizedPostId);

  if (!Number.isFinite(numericPostId)) {
    console.error("❌ Cannot react: invalid numeric post ID:", postId);
    return;
  }

  const normalizedEmail = userEmail.toLowerCase();

  const normalizedUsername = currentUser?.username
    ? String(currentUser.username).toLowerCase().trim()
    : "";

  // ============================================================
  // 1. CHECK WHETHER CURRENT USER ALREADY HAS THIS REACTION
  // ============================================================

  const existingReaction = posts.find((p: any) => {
    if (p.messageType !== "REACTION") return false;

    if (String(p.parentId) !== normalizedPostId) return false;

    if (p.content !== emoji) return false;

    const creator = String(p.createdBy || "")
      .toLowerCase()
      .trim();

    if (!creator) return false;

    return (
      creator === normalizedEmail ||
      (!!normalizedUsername && creator === normalizedUsername)
    );
  });

  // ============================================================
  // 2. REMOVE EXISTING REACTION
  // ============================================================

  if (existingReaction) {
    try {
      // Optimistic remove
      setPosts((prev) =>
        prev.filter(
          (p) => String(p.id) !== String(existingReaction.id)
        )
      );

      const deleteUrl =
        `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/` +
        `${existingReaction.id}?requester=${encodeURIComponent(userEmail)}`;

      console.log("🗑️ Removing reaction:", {
        reactionId: existingReaction.id,
        postId: normalizedPostId,
        userEmail,
        url: deleteUrl,
      });

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error("❌ Reaction delete failed:", {
          status: response.status,
          body: errorText,
        });

        // Rollback
        setPosts((prev) => [...prev, existingReaction]);
      } else {
        console.log("✅ Reaction removed successfully");
      }
    } catch (error) {
      console.error("❌ Network error removing reaction:", error);

      // Rollback
      setPosts((prev) => [...prev, existingReaction]);
    }

    return;
  }

  // ============================================================
  // 3. OPTIMISTIC REACTION
  // ============================================================

  const tempId = `temp-react-${Date.now()}-${Math.random()}`;

  const optimisticReaction = {
    id: tempId,
    title: emoji,
    content: emoji,
    messageType: "REACTION",
    parentId: numericPostId,
    createdBy: userEmail,
    createdByName: displayName,
    createdAt: new Date().toISOString(),
    attachments: [],
  };

  setPosts((prev) => [...prev, optimisticReaction]);

  // ============================================================
  // 4. CREATE REACTION
  // ============================================================

  try {
    const url =
      `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads`;

    const requestBody = {
      // IMPORTANT:
      // Keep the same fields used by normal message creation.
      title: emoji,
      content: emoji,
      createdBy: userEmail,
      createdByName: displayName,
      messageType: "REACTION",
      parentId: numericPostId,
      attachments: [],
    };

    console.log("❤️ Sending reaction:", {
      url,
      requestBody,
      groupId,
      postId: numericPostId,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    console.log("❤️ Reaction response:", {
      status: response.status,
      body: responseText,
    });

    if (!response.ok) {
      console.error("❌ Reaction failed:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        requestBody,
      });

      // Rollback optimistic UI
      setPosts((prev) =>
        prev.filter((p) => p.id !== tempId)
      );

      return;
    }

    console.log("✅ Reaction created successfully");

    playNotificationSound("send");

    // Refresh from backend
    setTimeout(() => {
      if (mountedRef.current) {
        loadPosts();
      }
    }, 300);
  } catch (error) {
    console.error("❌ Network error sending reaction:", error);

    setPosts((prev) =>
      prev.filter((p) => p.id !== tempId)
    );
  }
};

    // ✅ FIXED REACTIONS (Prevents Type Mismatch)
    const getReactionsForThread = useCallback((threadId: string | number) => {
    if (!threadId) return [];
    return posts.filter(p => 
      p.messageType === 'REACTION' && 
      String(p.parentId) === String(threadId) // ✅ FORCE STRING COMPARISON
    );
  }, [posts]);

  // ✅ EDIT & DELETE
    // ✅ FIXED EDIT MESSAGE
  const handleUpdatePost = async (postData: any) => {
    try {
      // 1. Optimistic UI update (updates screen instantly)
      setPosts(prev => prev.map(p => p.id === postData.id ? { ...p, content: postData.content, isEdited: true } : p));
      
      // 2. Call the CORRECT 8D API endpoint with the requester
      const response = await fetch(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${postData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content: postData.content,
          requester: currentUserEmail // ✅ Backend requires this for security
        })
      });

      if (!response.ok) {
        console.error("❌ Edit failed on backend:", await response.text());
      }
    } catch (err) {
      console.error("Update failed", err);
    }
  };

    // ✅ FIXED DELETE MESSAGE
      const handleDeletePost = async (postId: string | number) => {
    try {
      // 1. Optimistic UI (Remove from screen instantly)
      setPosts(prev => prev.filter(p => String(p.id) !== String(postId)));
      
      // 2. DIRECT FETCH to 8D endpoint with requester
      const response = await fetch(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${postId}?requester=${currentUserEmail}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        console.error("❌ Delete failed on backend:", await response.text());
        // Optional: Rollback UI if delete fails
      } else {
        console.log("✅ Delete successful");
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleComposerSubmit = (data: any) => {
    if (data.isEdit) {
      handleUpdatePost(data);
    } else {
      handleNewPost(data);
    }
  };

  const handleRetry = (post: any) => {
    handleNewPost({
      content: post.content,
      messageType: post.messageType,
      attachments: post.attachments,
    });
  };

  const handleTypingStart = () => {
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) setIsTyping(false);
    }, 3000);
  };

  const handleTypingEnd = () => {
    setIsTyping(false);
  };

  // ========== SEARCH ==========
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredPosts([]);
        setSearchResultsCount(0);
        setCurrentResultIndex(-1);
        setHighlightedMatches([]);
        return;
      }

      const matches: any[] = [];
      const safePosts = Array.isArray(posts) ? posts : [];
      const filtered = safePosts
        .map((post: any) => {
          const content = post.content || "";
          const regex = new RegExp(
            `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
            "gi",
          );
          let match;
          let matchCount = 0;
          while ((match = regex.exec(content)) !== null) {
            matches.push({
              postId: post.id,
              index: matchCount,
              type: "content",
              text: match[0],
              position: match.index,
            });
            matchCount++;
          }
          return { ...post, matchCount };
        })
        .filter((p: any) => p.matchCount > 0);

      setFilteredPosts(filtered);
      setSearchResultsCount(matches.length);
      setCurrentResultIndex(-1);
      setHighlightedMatches(matches);
    },
    [posts],
  );

  const navigateSearch = (direction: "next" | "prev") => {
    if (highlightedMatches.length === 0) return;
    const newIndex =
      direction === "next"
        ? (currentResultIndex + 1) % highlightedMatches.length
        : currentResultIndex <= 0
          ? highlightedMatches.length - 1
          : currentResultIndex - 1;
    setCurrentResultIndex(newIndex);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFilteredPosts([]);
    setSearchResultsCount(0);
    setCurrentResultIndex(-1);
    setHighlightedMatches([]);
    setIsSearching(false);
  };

  const toggleSearch = () => {
    if (isSearching) {
      clearSearch();
    }
    setIsSearching(!isSearching);
  };

  // ========== INDIVIDUAL CALL ==========
  const handleIndividualCall = async (
    targetUser: any,
    callType: "video" | "audio" = "video",
  ) => {
    if (!mountedRef.current) return;
    try {
      const callId = `${groupId}-${username}-${targetUser?.username}-${Date.now()}`;

      setIndividualCallState({
        isIncoming: false,
        isOutgoing: true,
        targetUser: targetUser,
        caller: username || null,
        callerName:
          currentUser?.firstName + " " + currentUser?.lastName ||
          username ||
          "",
        callId: callId,
        callType: callType,
      });

      await sendCallNotification(
        String(groupId),
        "INDIVIDUAL_CALL_STARTED",
        username || "",
        currentUser?.firstName + " " + currentUser?.lastName || username || "",
        targetUser?.username || "",
      );

      sendMediasoupMessage("INDIVIDUAL_CALL_STARTED", {
        callId: callId,
        targetUser: targetUser?.username || "",
        callType: callType,
        callerName:
          currentUser?.firstName + " " + currentUser?.lastName || username,
      });
    } catch (error) {
      console.error("❌ Failed to start individual call:", error);
      Alert.alert(
        "Error",
        "Failed to start individual call. Please try again.",
      );
      setIndividualCallState({
        isIncoming: false,
        isOutgoing: false,
        targetUser: null,
        caller: null,
        callerName: "",
        callId: null,
        callType: "video",
      });
    }
  };

  // ========== CALL HANDLERS ==========
  const handleStartCall = async (
    asAdmin: boolean = true,
    callType: "video" | "audio" = "video",
  ) => {
    if (!mountedRef.current) return;
    try {
      if (!mediasoupConnected) {
        manuallyConnect();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setCallState("calling");
      setCallerName("You");
      setCallerId(username || "");
      setCurrentCallType(callType);

      sendMediasoupMessage("CALL_STARTED", {
        callerName:
          currentUser?.firstName + " " + currentUser?.lastName || username,
        callerId: username,
        callType: callType,
      });

      await joinCall(asAdmin, callType);
    } catch (error) {
      console.error("❌ Failed to start call:", error);
      if (mountedRef.current) {
        handleCallEnded();
      }
      Alert.alert(
        "Error",
        `${callType === "video" ? "Video" : "Audio"} call failed: ${(error as Error).message || "Please check your media permissions"}`,
      );
      sendMediasoupMessage("CALL_ENDED");
    }
  };

  const handleAcceptCall = async () => {
    if (!mountedRef.current) return;
    try {
      setIncomingCall(null);
      setCallState("connecting");
      await joinCall(false, currentCallType);
    } catch (error) {
      console.error("❌ Failed to join call:", error);
      let errorMessage = "Failed to join call";
      if ((error as any).name === "NotReadableError") {
        errorMessage =
          "Microphone is busy. Please close other applications using your microphone and try again.";
      } else if ((error as any).name === "NotAllowedError") {
        errorMessage =
          "Microphone permission denied. Please allow access in your browser settings.";
      }
      Alert.alert("Error", errorMessage);
      handleCallEnded();
    }
  };

  const handleDeclineCall = () => {
    handleCallEnded();
  };

  const handleEndCall = () => {
    sendMediasoupMessage("CALL_ENDED");
    endCall();
    handleCallEnded();
  };

  const handleCallEnded = () => {
    setCallState("idle");
    setCallerName("");
    setCallerId("");
    setIncomingCall(null);
    setCurrentCallType("video");
    setActiveUsers([]);
  };

  const handleJoinCall = async () => {
    if (!mountedRef.current) return;
    try {
      setCallState("connecting");
      sendMediasoupMessage("USER_JOINED_CALL", {
        callType: currentCallType,
      });
      await joinCall(false, currentCallType);
    } catch (error) {
      console.error("❌ Failed to join call:", error);
      Alert.alert(
        "Error",
        `Failed to join call: ${(error as Error).message || "Please check your media permissions"}`,
      );
      handleCallEnded();
    }
  };

  const handleManualReconnect = () => {
    manuallyConnect();
    if (!isChatConnected) {
      startPolling();
    }
  };

  // ========== LIFECYCLE ==========
  useEffect(() => {
    mountedRef.current = true;
    const instanceId = instanceIdRef.current;

    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    const initialize = async () => {
      setLoading(true);
      await ensureGroupExists().catch(() => {});
      await loadPosts();
      startPolling();
      fetchGroupMembers();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      initializationRef.current = false;
      stopPolling();
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current);
        connectionRetryRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  // ========== CALL EVENT CALLBACK - FIXED ==========
  useEffect(() => {
    if (!setOnCallEvent || !mountedRef.current) return;
    if (isCallEventSetRef.current) return;
    isCallEventSetRef.current = true;

    const handleCallEvent = (data: any) => {
      if (!mountedRef.current) return;
      const { type, sender, payload } = data;

      switch (type) {
        case "CALL_STARTED":
          if (callState === "idle" && !isInCall) {
            setCallState("ringing");
            setCallerName(payload?.callerName || sender);
            setCallerId(sender);
            setCurrentCallType(payload?.callType || "video");
            setIncomingCall({
              caller: sender,
              callerName: payload?.callerName || sender,
              groupId: groupId,
              callType: payload?.callType || "video",
            });
          }
          break;

        case "USER_JOINED_CALL":
          setActiveUsers((prev) => {
            if (!prev.includes(sender)) return [...prev, sender];
            return prev;
          });
          break;

        case "USER_LEFT_CALL":
          setActiveUsers((prev) => prev.filter((user) => user !== sender));
          break;

        case "CALL_ENDED":
          handleCallEnded();
          setActiveUsers([]);
          break;

        case "INDIVIDUAL_CALL_STARTED":
          if (
            data.targetUser === username &&
            !individualCallState.isOutgoing &&
            !isInCall
          ) {
            setIndividualCallState({
              isIncoming: true,
              isOutgoing: false,
              targetUser: null,
              caller: data.caller || sender,
              callerName: data.callerName,
              callId: data.callId,
              callType: data.callType || "video",
            });
          }
          break;

        case "INDIVIDUAL_CALL_ACCEPTED":
          if (individualCallState.isOutgoing) {
            setIndividualCallState((prev) => ({
              ...prev,
              isOutgoing: false,
            }));
            handleStartCall(
              false,
              data.callType || individualCallState.callType || "video",
            );
          }
          break;

        case "INDIVIDUAL_CALL_DECLINED":
          if (individualCallState.isOutgoing) {
            Alert.alert(
              "Call Declined",
              `${data.sender} declined your ${individualCallState.callType} call`,
            );
            setIndividualCallState({
              isIncoming: false,
              isOutgoing: false,
              targetUser: null,
              caller: null,
              callerName: "",
              callId: null,
              callType: "video",
            });
          }
          break;

        default:
          break;
      }
    };

    setOnCallEvent(handleCallEvent);

    return () => {
      isCallEventSetRef.current = false;
    };
  }, []);

  // ========== EMAIL MODAL HANDLERS ==========
  const handleOpenEmailModal = () => {
    setInspectionId(String(groupId));
    setShowEmailModal(true);
  };

  const handleProceedAfterEmail = async() => {
    setShowEmailModal(false);
  };

  // ========== RENDER HELPERS ==========
  const displayPosts = isSearching && searchQuery ? filteredPosts : posts;

 const getDateLabel = (dateStr: string) => {
  let isoString = dateStr;
  if (!isoString.includes('T')) isoString = isoString.replace(' ', 'T');
  // ✅ FIXED: ALWAYS add Z if no timezone marker
  if (!isoString.includes('Z') && !isoString.includes('+') && !isoString.includes('-')) {
    isoString += 'Z';
  }
  const date = new Date(isoString);
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return null;
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

  const SearchBar = () => (
    <View className="flex-row items-center px-3 py-2 bg-white border-b border-gray-200 gap-2">
      <Search size={16} color="#9ca3af" />
      <TextInput
        className="flex-1 text-sm"
        placeholder="Search messages..."
        value={searchQuery}
        onChangeText={handleSearch}
        autoFocus
      />
      {searchResultsCount > 0 && (
        <Text className="text-xs text-gray-500">
          {currentResultIndex + 1}/{searchResultsCount}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => navigateSearch("prev")}
        disabled={searchResultsCount === 0}
        className="p-1"
      >
        <ChevronUp size={16} color={searchResultsCount === 0 ? "#d1d5db" : "#6b7280"} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigateSearch("next")}
        disabled={searchResultsCount === 0}
        className="p-1"
      >
        <ChevronDown size={16} color={searchResultsCount === 0 ? "#d1d5db" : "#6b7280"} />
      </TouchableOpacity>
      <TouchableOpacity onPress={clearSearch} className="p-1">
        <X size={16} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );

  const MembersSidebar = () => {
    const safeGroupMembers = Array.isArray(groupMembers) ? groupMembers : [];

    return (
      <View className="w-72 bg-white border-l border-gray-200">
        <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
          <View>
            <Text className="font-semibold text-gray-800">Group Members</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {safeGroupMembers.length} members
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowMembersSidebar(false)} className="p-1">
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1">
          {safeGroupMembers.map((m, i) => (
            <View key={m.email || i} className="flex-row items-center justify-between p-3 border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <User size={16} color="#00529B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">{m.firstName} {m.lastName}</Text>
                  <Text className="text-xs text-gray-500">{m.email}</Text>
                </View>
              </View>
              {/* <View className="flex-row gap-1">
                <TouchableOpacity onPress={() => handleIndividualCall(m, "audio")} className="p-2">
                  <Phone size={16} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIndividualCall(m, "video")} className="p-2">
                  <VideoIcon size={16} color="#00529B" />
                </TouchableOpacity>
              </View> */}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const IncomingCallModal = () => {
    if (callState !== "ringing") return null;
    return (
      <Modal visible transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-8 items-center w-80">
            <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
              <User size={32} color="#00529B" />
            </View>
            <Text className="text-lg font-bold text-gray-900">{callerName} is calling...</Text>
            <Text className="text-sm text-gray-500 mt-1">{currentCallType === "video" ? "Video" : "Audio"} call</Text>
            <View className="flex-row gap-6 mt-8">
              <TouchableOpacity onPress={handleDeclineCall} className="w-16 h-16 rounded-full bg-red-500 items-center justify-center">
                <Phone size={28} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAcceptCall} className="w-16 h-16 rounded-full bg-green-500 items-center justify-center">
                <Phone size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
            {/* Header */}
            {/* Header with Safe Area Spacing */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: '#1e3a8a', 
        paddingHorizontal: 12, 
        paddingTop: insets.top + 10,  // ✅ Space for status bar / notch
        paddingBottom: 10,
      }}>
        
        {/* Left Side: Back & Title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ padding: 4, marginRight: 4 }}>
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setShowMembersSidebar(!showMembersSidebar)} 
            style={{ flex: 1 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
              {displayGroupName}
            </Text>
            <Text style={{ color: '#bfdbfe', fontSize: 11 }} numberOfLines={1}>
              {Array.isArray(groupMembers) ? groupMembers.length : 0} members • {Array.isArray(posts) ? posts.length : 0} messages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right Side: Scrollable Icons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ flex: 0.4 }}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 4, }}
        >
          <TouchableOpacity onPress={() => setShowEmailModal(true)} style={{ padding: 6 }}>
            <Mail size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMembersSidebar(!showMembersSidebar)} style={{ padding: 6 }}>
            <Users size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSearching(!isSearching)} style={{ padding: 6 }}>
            <Search size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={{ padding: 6 }}>
            <Settings size={18} color="white" />
          </TouchableOpacity>
        </ScrollView>

      </View>

      {/* Search Bar */}
      {isSearching && <SearchBar />}

      {/* Status Bar */}
      {!isSearching && (
        <View className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <View className="w-5 h-5 rounded-full bg-gray-200 items-center justify-center">
              <User size={10} color="#6b7280" />
            </View>
            <Text className="text-xs font-medium text-gray-600">{displayName}</Text>
            {isTyping && <Text className="text-xs text-blue-600">typing...</Text>}
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs">{unreadCount} new</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {activeUsers.length > 0 && <Text className="text-green-600 text-xs">{activeUsers.length} in call</Text>}
            <TouchableOpacity onPress={loadPosts}>
              <RefreshCw size={14} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content */}
      <View className="flex-1 flex-row">
        <View className="flex-1">
          {loading && posts.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#00529B" />
              <Text className="text-gray-500 mt-3">Loading messages...</Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center p-4">
              <AlertCircle size={32} color="#ef4444" />
              <Text className="text-red-500 mt-2 text-center">{error}</Text>
              <TouchableOpacity onPress={loadPosts} className="mt-3 bg-blue-900 px-4 py-2 rounded-lg">
                <Text className="text-white text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayPosts.filter(p => p.messageType !== 'REACTION')} // Filter out reactions from main list
              keyExtractor={(item, index) => item?.id || String(index)}
              renderItem={({ item, index }) => {
                let dateLabel = null;
                if (index === 0) {
                  dateLabel = getDateLabel(item.createdAt);
                } else {
                  const prevItem = displayPosts[index - 1];
                  if (prevItem) {
                    const prevDate = new Date(prevItem.createdAt).toDateString();
                    const currDate = new Date(item.createdAt).toDateString();
                    if (prevDate !== currDate) {
                      dateLabel = getDateLabel(item.createdAt);
                    }
                  }
                }

                return (
                  <>
                    {dateLabel && (
                      <View style={{ alignItems: 'center', marginVertical: 12 }}>
                        <View style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>{dateLabel}</Text>
                        </View>
                      </View>
                    )}
                    <ThreadCard
                      thread={item}
                      currentUser={currentUser}
                      currentUsername={currentUserEmail}
                      allUsers={allUsers}
                      reactions={getReactionsForThread(item.id)}
                      onReact={handleReactToPost}
                      onEdit={setEditingPost}
                      onDelete={handleDeletePost}
                      onRetry={handleRetry}
                    />
                  </>
                );
              }}
              className="flex-1 bg-gray-50"
              contentContainerStyle={{ paddingVertical: 8 }}
              ListEmptyComponent={
                <View className="items-center py-20">
                  <MessageCircle size={48} color="#d1d5db" />
                  <Text className="text-gray-400 mt-3">
                    {isSearching ? "No messages found" : "No messages yet"}
                  </Text>
                </View>
              }
              onContentSizeChange={() => {
                if (!isSearching)
                  flatListRef.current?.scrollToEnd({ animated: false });
              }}
            />
          )}

          {/* Composer */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View className="border-t border-gray-200 bg-white">
              <ThreadComposer
                groupId={groupId}
                onThreadCreated={handleComposerSubmit}
                onInputStart={handleTypingStart}
                onInputEnd={handleTypingEnd}
                username={currentUserEmail}
                editingPost={editingPost}
                onCancelEdit={() => setEditingPost(null)}
              />
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* Members Sidebar */}
        {showMembersSidebar && <MembersSidebar />}
      </View>

      {/* Modals */}
      <IncomingCallModal />
      <MediaSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedMic={selectedMic}
        selectedCamera={selectedCamera}
        selectedSpeaker={selectedSpeaker}
        setSelectedMic={setSelectedMic}
        setSelectedCamera={setSelectedCamera}
        setSelectedSpeaker={setSelectedSpeaker}
      />

      {/* Email Notification Modal */}
      {showEmailModal && (
        <EmailNotificationModal
          isOpen={true}
          onClose={() => setShowEmailModal(false)}
          inspectionId={inspectionId || String(groupId)}
          onProceed={handleProceedAfterEmail}
        />
      )}
    </View>
  );
}

// ================================================================
// ⚙️ MEDIA SETTINGS MODAL - EXTRACTED OUTSIDE
// ================================================================
const MediaSettingsModal = React.memo(({ 
  visible, 
  onClose, 
  selectedMic, 
  selectedCamera, 
  selectedSpeaker,
  setSelectedMic,
  setSelectedCamera,
  setSelectedSpeaker
}: {
  visible: boolean;
  onClose: () => void;
  selectedMic: string;
  selectedCamera: string;
  selectedSpeaker: string;
  setSelectedMic: (value: string) => void;
  setSelectedCamera: (value: string) => void;
  setSelectedSpeaker: (value: string) => void;
}) => {
  const [audioDevices, setAudioDevices] = useState<any[]>([]);
  const [videoDevices, setVideoDevices] = useState<any[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const loadDevicesCalled = useRef(false);

  useEffect(() => {
    if (visible && !loadDevicesCalled.current && Platform.OS === 'web') {
      loadDevicesCalled.current = true;
      loadDevices();
    }
    if (!visible) {
      loadDevicesCalled.current = false;
    }
  }, [visible]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
      setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      setAudioOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn("Could not enumerate devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const saveSelection = async (type: 'mic' | 'camera' | 'speaker', deviceId: string) => {
    try {
      await AsyncStorage.setItem(`selected${type}`, deviceId);
      if (type === 'mic') setSelectedMic(deviceId);
      if (type === 'camera') setSelectedCamera(deviceId);
      if (type === 'speaker') setSelectedSpeaker(deviceId);
    } catch (err) {
      console.error("Failed to save device selection:", err);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 500, backgroundColor: 'white', borderRadius: 16, padding: 20, elevation: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>Media Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {loadingDevices ? (
            <ActivityIndicator size="large" color="#00529B" />
          ) : (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#3730a3', marginBottom: 4 }}>Microphone</Text>
                {audioDevices.length === 0 ? (
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>No microphone found</Text>
                ) : (
                  audioDevices.map(device => (
                    <TouchableOpacity
                      key={device.deviceId}
                      onPress={() => saveSelection('mic', device.deviceId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: selectedMic === device.deviceId ? '#eff6ff' : 'transparent',
                        borderWidth: 1,
                        borderColor: selectedMic === device.deviceId ? '#00529B' : '#e5e7eb',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 14, color: '#1f2937' }}>{device.label || `Mic ${device.deviceId.slice(-4)}`}</Text>
                      {selectedMic === device.deviceId && <Check size={16} color="#00529B" />}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#3730a3', marginBottom: 4 }}>Camera</Text>
                {videoDevices.length === 0 ? (
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>No camera found</Text>
                ) : (
                  videoDevices.map(device => (
                    <TouchableOpacity
                      key={device.deviceId}
                      onPress={() => saveSelection('camera', device.deviceId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: selectedCamera === device.deviceId ? '#eff6ff' : 'transparent',
                        borderWidth: 1,
                        borderColor: selectedCamera === device.deviceId ? '#00529B' : '#e5e7eb',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 14, color: '#1f2937' }}>{device.label || `Camera ${device.deviceId.slice(-4)}`}</Text>
                      {selectedCamera === device.deviceId && <Check size={16} color="#00529B" />}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#3730a3', marginBottom: 4 }}>Speaker</Text>
                {audioOutputDevices.length === 0 ? (
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>No speaker found</Text>
                ) : (
                  audioOutputDevices.map(device => (
                    <TouchableOpacity
                      key={device.deviceId}
                      onPress={() => saveSelection('speaker', device.deviceId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: selectedSpeaker === device.deviceId ? '#eff6ff' : 'transparent',
                        borderWidth: 1,
                        borderColor: selectedSpeaker === device.deviceId ? '#00529B' : '#e5e7eb',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ flex: 1, fontSize: 14, color: '#1f2937' }}>{device.label || `Speaker ${device.deviceId.slice(-4)}`}</Text>
                      {selectedSpeaker === device.deviceId && <Check size={16} color="#00529B" />}
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={{ marginTop: 16, padding: 12, backgroundColor: '#00529B', borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Save & Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

MediaSettingsModal.displayName = 'MediaSettingsModal';