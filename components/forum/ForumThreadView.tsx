// components/forum/ForumThreadView.tsx
// COMPLETE FIXED VERSION - Includes WhatsApp-style Date Headers, Email Modal, and Cross-Platform Sound

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
  Video as VideoIcon,
  X,
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

// Import components
import { useSFU } from "../../hooks/useSFU";
import {
  createForumPost,
  fetchGroupThreads,
  sendCallNotification,
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
// ============================================================================
// SOUND EFFECTS - MP3 SUPPORT (WEB & MOBILE)
// ============================================================================
let webSendAudio: HTMLAudioElement | null = null;
let webReceiveAudio: HTMLAudioElement | null = null;

const playNotificationSound = async (type: "send" | "receive") => {
  try {
    // ✅ WEB: use the browser's native Audio (window.Audio), NOT expo-av
    if (Platform.OS === "web") {
      const volume = type === "send" ? 0.5 : 0.3;

      // ✅ 'window.Audio' guarantees we use the HTML5 constructor (no collision)
      const sound = new window.Audio("/sounds/message-send.mp3");
      sound.preload = "auto";
      sound.volume = volume;
      sound.currentTime = 0;

      sound.play().catch((err) => {
        console.log("🔇 Autoplay blocked (needs user interaction):", err?.message);
      });
      return;
    }

    // ✅ MOBILE: use expo-av via the renamed 'ExpoAudio'
    const { sound } = await ExpoAudio.Sound.createAsync(
      require("../../assets/sounds/message-send.mp3"),
      { shouldPlay: true, volume: type === "send" ? 0.5 : 0.3 }
    );

    // Unload after it finishes so we don't leak memory
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

  // ---- Core State ----
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);

  // ---- Call State ----
  const [callState, setCallState] = useState<
    "idle" | "ringing" | "calling" | "connecting" | "connected" | "ended"
  >("idle");
  const [callerName, setCallerName] = useState("");
  const [callerId, setCallerId] = useState("");
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [currentCallType, setCurrentCallType] = useState<"video" | "audio">(
    "video",
  );
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

  // ========== DATA FETCHING ==========
    // ========== DATA FETCHING ==========
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
      if (!Array.isArray(postsData)) {
        postsData = [];
      }

      // ✅ FIX 1: Use the Ref instead of the stale `posts` state array
      const newPosts = postsData.filter((p: any) => !lastKnownPostIdsRef.current.has(p.id));
      
      // ✅ FIX 2: Prevent sound from playing on the very first load when opening the chat
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
        return {
          ...post,
          createdByProfileImage: u?.profileImage || "",
          createdByName: u
            ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email
            : post.createdBy || "Unknown",
        };
      });

      if (mountedRef.current) {
        // ✅ FIX 3: Update the Ref with current IDs BEFORE setting state
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

        // ✅ Play sound only for genuinely new messages from others
        if (hasNewMessages) {
          const latestPost = newPosts[newPosts.length - 1];
          if (latestPost?.createdBy !== currentUserEmail) {
            playNotificationSound('receive');
          }
        }
      }
    } catch (err) {
      console.error("❌ Load posts error:", err);
      if (mountedRef.current) setError("Failed to load messages");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId, allUsers, currentUserEmail]); // ✅ CRITICAL: Removed `posts` from dependencies!
  // ========== POLLING ==========
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    loadPosts();
    pollingRef.current = setInterval(loadPosts, 5000);
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

  // ========== MESSAGE HANDLING WITH DYNAMIC SOUND ==========
  const handleNewPost = async (newPostData: any) => {
    if (!mountedRef.current || !groupId) return;

    const userEmail = currentUser?.email || username || "";

    try {
      const res = await createForumPost(String(groupId), {
        content: newPostData.content,
        createdBy: userEmail,
        messageType: newPostData.messageType || "TEXT",
        attachments: newPostData.attachments || [],
      });

      const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
      const user = safeAllUsers.find(
        (x: any) =>
          x?.email === userEmail ||
          x?.username === userEmail ||
          x?.id === userEmail,
      );
      const name =
        user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user?.firstName || user?.lastName || userEmail;

      if (mountedRef.current) {
        setPosts((prev) => [
          ...prev,
          {
            ...res,
            createdByProfileImage: user?.profileImage || "",
            createdByName: name,
            optimistic: true,
          },
        ]);
      }

      // ✅ Play sound AFTER message is successfully sent
      setTimeout(() => {
        playNotificationSound('send');
      }, 100);

      console.log("✅ Message sent via HTTP");
    } catch (httpErr) {
      console.error("❌ HTTP send failed:", httpErr);
      if ((httpErr as any)?.response?.status >= 500) {
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
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
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return null;
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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
              <View className="flex-row gap-1">
                <TouchableOpacity onPress={() => handleIndividualCall(m, "audio")} className="p-2">
                  <Phone size={16} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIndividualCall(m, "video")} className="p-2">
                  <VideoIcon size={16} color="#00529B" />
                </TouchableOpacity>
              </View>
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
      <View className="bg-blue-900 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          {onBack && (
            <TouchableOpacity onPress={onBack} className="p-1">
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowMembersSidebar(!showMembersSidebar)} className="flex-1">
            <Text className="text-white font-semibold text-base">{displayGroupName}</Text>
            <Text className="text-blue-200 text-xs">
              {Array.isArray(groupMembers) ? groupMembers.length : 0} members • {Array.isArray(posts) ? posts.length : 0} messages
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={() => setShowEmailModal(true)} className="p-2">
            <Mail size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMembersSidebar(!showMembersSidebar)} className="p-2">
            <Users size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSearching(!isSearching)} className="p-2">
            <Search size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} className="p-2">
            <Settings size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStartCall(true, "audio")} className="p-2">
            <Phone size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStartCall(true, "video")} className="p-2">
            <VideoIcon size={18} color="white" />
          </TouchableOpacity>
        </View>
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
              data={displayPosts}
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
                onThreadCreated={handleNewPost}
                onInputStart={handleTypingStart}
                onInputEnd={handleTypingEnd}
                username={currentUserEmail}
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