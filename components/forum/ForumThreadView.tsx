// components/forum/ForumThreadView.tsx
// COMPLETE FIXED VERSION - All null/undefined checks added

import { useAuth } from "@/components/context/AuthContext";
import { API_BASE_URL } from "@/config/apiConfig";
import {
  AlertCircle,
  ArrowLeft,
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
    joinCall: async (
      _asAdmin: boolean = false,
      _callType: "video" | "audio" = "video",
    ) => console.log("📞 Audio/Video disabled for audit forum"),
    endCall: () => console.log("📞 Audio/Video disabled for audit forum"),
    sendMediasoupMessage: (_type: string, _payload?: any) =>
      console.log("📞 Audio/Video disabled for audit forum"),
    manuallyConnect: () =>
      console.log("🔗 Audio/Video disabled for audit forum"),
    manuallyDisconnect: () =>
      console.log("🔗 Audio/Video disabled for audit forum"),
    setOnCallEvent: (_callback: ((data: any) => void) | null) =>
      console.log("📞 Audio/Video disabled for audit forum"),
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
   // ========== ENSURE GROUP 1 EXISTS IN NEW DB ==========
  const ensureGroupExists = useCallback(async () => {
    if (!groupId) return;
    
    try {
      // We only do this for AUDIT groups in PRODUCTION
      const idStr = String(groupId);
      if (!idStr.startsWith("AUDIT-") || __DEV__) return;

      console.log("🛠️ Checking if group 1 exists in the new database...");
      
      // 1. Try to create the group (If it exists, the backend just returns it)
      const createResponse = await fetch(
        `${API_BASE_URL}/api/forum/groups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupName: 'Internal Audit Forum',
            description: 'General Audit Discussions',
            createdBy: 'system@jws.com',
            members: [],
            groupType: 'GENERAL'
          })
        }
      );
      
      if (!createResponse.ok) {
        // If it's a 409 Conflict (already exists), that's fine!
        if (createResponse.status === 409) {
          console.log("✅ Group 1 already exists in the new database!");
          return;
        }
        throw new Error(`Failed to create group: ${createResponse.status}`);
      }
      
      console.log("✅ Successfully created group 1 in the new database!");
      
    } catch (error) {
      console.error("❌ Error ensuring group exists:", error);
    }
  }, [groupId]);
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
    const loadPosts = useCallback(async () => {
    if (!groupId || !mountedRef.current) return;
    try {
      console.log("📥 Loading posts for group:", groupId);
      
      // ✅ CRITICAL FIX: Smart ID detection based on environment
      let apiGroupId = String(groupId);
      
      // Only perform the swap if we are in PRODUCTION and it's an AUDIT group
      if (!__DEV__ && apiGroupId.startsWith("AUDIT-")) {
        apiGroupId = "1";
        console.log("🔁 PRODUCTION: Swapped AUDIT group ID to numeric 1 for API call");
      } else {
        console.log(`🔁 ${__DEV__ ? "LOCAL" : "PRODUCTION"}: Using original group ID: ${apiGroupId}`);
      }
      
      const response = await fetchGroupThreads(apiGroupId);
      // ... rest of your code ...
      console.log("📥 Loading posts for group:", groupId);
      let postsData = [];
      if (response && typeof response === "object") {
        postsData = Array.isArray(response)
          ? response
          : response?.data || response?.posts || [];
      }
      if (!Array.isArray(postsData)) {
        postsData = [];
      }

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
      }
    } catch (err) {
      console.error("❌ Load posts error:", err);
      if (mountedRef.current) setError("Failed to load messages");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [groupId, allUsers]);

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
      console.log("🛑 Polling stopped");
    }
    if (mountedRef.current) {
      setIsChatConnected(false);
    }
  }, []);

  // ========== MESSAGE HANDLING ==========
   const handleNewPost = async (newPostData: any) => {
    if (!mountedRef.current || !groupId) return;

    const userEmail = currentUser?.email || username || "";

    console.log("🔍 handleNewPost debug:", {
      userEmail,
      groupId,
      content: newPostData.content,
      attachmentsCount: newPostData.attachments?.length || 0,
    });

    try {
      // ✅ CRITICAL FIX: Smart ID detection based on environment
      let apiGroupId = String(groupId);
      
      // Only perform the swap if we are in PRODUCTION and it's an AUDIT group
      if (!__DEV__ && apiGroupId.startsWith("AUDIT-")) {
        apiGroupId = "1";
        console.log("🔁 PRODUCTION: Swapped AUDIT group ID to numeric 1 for API call");
      } else {
        console.log(`🔁 ${__DEV__ ? "LOCAL" : "PRODUCTION"}: Using original group ID: ${apiGroupId}`);
      }

      const res = await createForumPost(apiGroupId, {
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
          let highlightedContent = content;
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
      console.log(
        "📞 Starting individual call to:",
        targetUser?.username,
        "Type:",
        callType,
      );

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

      console.log("✅ Individual call notification sent");
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
      console.log("🎥 Starting call...", { asAdmin, callType });

      if (!mediasoupConnected) {
        console.log("🔄 Connecting to Mediasoup first...");
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
      console.log("✅ Call started successfully:", callType);
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
      console.log(
        "🎥 Accepting call from:",
        callerName,
        "Type:",
        currentCallType,
      );
      setIncomingCall(null);
      setCallState("connecting");
      await joinCall(false, currentCallType);
      console.log("✅ Joined call successfully:", currentCallType);
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
    console.log("📞 Declining call from:", callerName);
    handleCallEnded();
  };

  const handleEndCall = () => {
    console.log("📞 Ending call...");
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
      console.log("🎥 Joining existing call...");
      setCallState("connecting");
      sendMediasoupMessage("USER_JOINED_CALL", {
        callType: currentCallType,
      });
      await joinCall(false, currentCallType);
      console.log("✅ Joined existing call successfully");
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
    console.log("🔄 Manual reconnect triggered");
    manuallyConnect();
    if (!isChatConnected) {
      startPolling();
    }
  };

  // ========== LIFECYCLE ==========
  useEffect(() => {
    mountedRef.current = true;
    const instanceId = instanceIdRef.current;

    console.log("🔍 Component mounted:", { instanceId, groupId, username });

    if (initializationRef.current) {
      console.log("⏸️ Skipping duplicate initialization");
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
      console.log("🔍 Component unmounted:", instanceId);
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
  }, [groupId]);

  // ========== CALL EVENT CALLBACK ==========
  useEffect(() => {
    if (!setOnCallEvent || !mountedRef.current) return;

    console.log("✅ Setting up enhanced call event callback");

    const handleCallEvent = (data: any) => {
      if (!mountedRef.current) return;
      console.log("🎯 Call event received:", data.type, "from:", data.sender);

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
          console.log("📞 Unknown event:", type);
      }
    };

    setOnCallEvent(handleCallEvent);

    return () => {
      if (mountedRef.current && setOnCallEvent) {
        console.log("🧹 Cleaning up call callback");
        setOnCallEvent(() => {});
      }
    };
  }, [
    setOnCallEvent,
    groupId,
    callState,
    isInCall,
    individualCallState,
    username,
    handleCallEnded,
  ]);

  // ========== RENDER HELPERS ==========
  const displayPosts = isSearching && searchQuery ? filteredPosts : posts;

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
        <ChevronUp
          size={16}
          color={searchResultsCount === 0 ? "#d1d5db" : "#6b7280"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigateSearch("next")}
        disabled={searchResultsCount === 0}
        className="p-1"
      >
        <ChevronDown
          size={16}
          color={searchResultsCount === 0 ? "#d1d5db" : "#6b7280"}
        />
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
          <TouchableOpacity
            onPress={() => setShowMembersSidebar(false)}
            className="p-1"
          >
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1">
          {safeGroupMembers.map((m, i) => (
            <View
              key={m.email || i}
              className="flex-row items-center justify-between p-3 border-b border-gray-100"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <User size={16} color="#00529B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900">
                    {m.firstName} {m.lastName}
                  </Text>
                  <Text className="text-xs text-gray-500">{m.email}</Text>
                </View>
              </View>
              <View className="flex-row gap-1">
                <TouchableOpacity
                  onPress={() => handleIndividualCall(m, "audio")}
                  className="p-2"
                >
                  <Phone size={16} color="#16a34a" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleIndividualCall(m, "video")}
                  className="p-2"
                >
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
            <Text className="text-lg font-bold text-gray-900">
              {callerName} is calling...
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {currentCallType === "video" ? "Video" : "Audio"} call
            </Text>
            <View className="flex-row gap-6 mt-8">
              <TouchableOpacity
                onPress={handleDeclineCall}
                className="w-16 h-16 rounded-full bg-red-500 items-center justify-center"
              >
                <Phone
                  size={28}
                  color="white"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAcceptCall}
                className="w-16 h-16 rounded-full bg-green-500 items-center justify-center"
              >
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
          <TouchableOpacity
            onPress={() => setShowMembersSidebar(!showMembersSidebar)}
            className="flex-1"
          >
            <Text className="text-white font-semibold text-base">
              {displayGroupName}
            </Text>
            <Text className="text-blue-200 text-xs">
              {Array.isArray(groupMembers) ? groupMembers.length : 0} members •{" "}
              {Array.isArray(posts) ? posts.length : 0} messages
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => setShowEmailModal(true)}
            className="p-2"
          >
            <Mail size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMembersSidebar(!showMembersSidebar)}
            className="p-2"
          >
            <Users size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsSearching(!isSearching)}
            className="p-2"
          >
            <Search size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSettingsModal(true)}
            className="p-2"
          >
            <Settings size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStartCall(true, "audio")}
            className="p-2"
          >
            <Phone size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStartCall(true, "video")}
            className="p-2"
          >
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
            <Text className="text-xs font-medium text-gray-600">
              {displayName}
            </Text>
            {isTyping && (
              <Text className="text-xs text-blue-600">typing...</Text>
            )}
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs">{unreadCount} new</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {activeUsers.length > 0 && (
              <Text className="text-green-600 text-xs">
                {activeUsers.length} in call
              </Text>
            )}
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
              <TouchableOpacity
                onPress={loadPosts}
                className="mt-3 bg-blue-900 px-4 py-2 rounded-lg"
              >
                <Text className="text-white text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayPosts}
              keyExtractor={(item, index) => item?.id || String(index)}
              renderItem={({ item }) => (
                <ThreadCard
                  thread={item}
                  currentUser={currentUser}
                  currentUsername={currentUserEmail}
                  onRetry={handleRetry}
                  // groupId={String(groupId)}
                />
              )}
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
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
    </View>
  );
}
