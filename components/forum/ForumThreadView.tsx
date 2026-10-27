// components/forum/ForumThreadView.tsx
// COMPLETE FIXED VERSION - WhatsApp-style Date Headers, Cross-Platform Sound, Reactions, Edit & Delete

import EmailNotificationModal from "@/components/comform/EmailNotificationModal";
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
  Download,
  Mail,
  MessageCircle,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Settings,
  User,
  UserPlus,
  Users, // ?? ADD
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
  Image, // ?? ADD THIS
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSFU } from "../../hooks/useSFU";
import {
  exportGroupThreads,
  fetchGroupThreads,
  sendCallNotification,
} from "./Api/forumapi";
import ManageGroupMembersModal from "./ManageGroupMembersModal";
import ThreadCard from "./ThreadCard";
import ThreadComposer from "./ThreadComposer";

const groupPostsCache = new Map<string, any[]>();

// ============================================================================
// SHARED EXPORT-MODAL STYLES
// ============================================================================
const labelStyle = {
  fontSize: 10,
  fontWeight: "700" as const,
  letterSpacing: 1,
  color: "#6b7280",
  marginBottom: 6,
};

const numberInputStyle = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  fontSize: 14,
  color: "#111827",
  minWidth: 100,
  backgroundColor: "#fff",
};

// ============================================================================
// CROSS-PLATFORM DATE FIELD
//   - Web:     native <input type="date">
//   - Mobile:  native picker via @react-native-community/datetimepicker
//              (falls back to plain YYYY-MM-DD TextInput if not installed)
// ============================================================================
function DateField({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  maxDate,
  minDate,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPlatform, setPickerPlatform] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require("@react-native-community/datetimepicker");
        setPickerPlatform(mod.default || mod);
      } catch {
        // Package not installed — fallback to TextInput
      }
    }
  }, []);

  const toYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // ---- WEB ----
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: "#fff",
        }}
      >
        {/* @ts-ignore — DOM element on web */}
        <input
          type="date"
          value={value || ""}
          min={minDate ? toYMD(minDate) : undefined} // 👈 ADD
          max={maxDate ? toYMD(maxDate) : undefined}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            fontSize: 14,
            color: "#111827",
            width: "100%",
            background: "transparent",
          }}
        />
      </View>
    );
  }

  // ---- MOBILE with native picker ----
  if (pickerPlatform) {
    const DateTimePicker = pickerPlatform;
    const currentDate = value ? new Date(value + "T00:00:00") : new Date();

    return (
      <>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 14, color: value ? "#111827" : "#9ca3af" }}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={maxDate} // 👈 ADD
            minimumDate={minDate}
            onChange={(event: any, selected?: Date) => {
              setShowPicker(Platform.OS === "ios");
              if (event?.type === "dismissed") {
                setShowPicker(false);
                return;
              }
              if (selected) {
                const yyyy = selected.getFullYear();
                const mm = String(selected.getMonth() + 1).padStart(2, "0");
                const dd = String(selected.getDate()).padStart(2, "0");
                onChange(`${yyyy}-${mm}-${dd}`);
              }
              if (Platform.OS !== "ios") setShowPicker(false);
            }}
          />
        )}
      </>
    );
  }

  // ---- MOBILE FALLBACK ----
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/[^0-9-]/g, ""))}
      placeholder={placeholder}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      style={{
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: "#111827",
        backgroundColor: "#fff",
      }}
    />
  );
}

// ============================================================================
// TYPES
// ============================================================================
interface ForumThreadViewProps {
  groupId: string | number;
  groupName?: string;
  plantId?: string | null; // ?? NEW
  plantName?: string | null; // ?? NEW
  isInDrawer?: boolean;
  setForumDrawerOpen?: (open: boolean) => void;
  username?: string;
  currentUser?: any;
  allUsers?: any[];
  onBack?: () => void;
  memberEmails?: any[];
  onSeen?: () => void;
  groupAdminEmail?: string;
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
        console.log(
          "?? Autoplay blocked (needs user interaction):",
          err?.message,
        );
      });
      return;
    }

    const { sound } = await ExpoAudio.Sound.createAsync(
      require("../../assets/sounds/message-send.mp3"),
      { shouldPlay: true, volume: type === "send" ? 0.5 : 0.3 },
    );
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (err) {
    console.log("?? Sound error:", err);
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ForumThreadView({
  groupId,
  groupName,
  plantId, // ?? NEW
  plantName, // ?? NEW
  isInDrawer = false,
  setForumDrawerOpen,
  username,
  currentUser,
  allUsers = [],
  onBack,
  memberEmails = [],
  onSeen,
  groupAdminEmail, // ?? ADD
}: ForumThreadViewProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // ---- Core State ----
  const [posts, setPosts] = useState<any[]>([]);
  // ---- Pagination State ----
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const PAGE_SIZE = 50;
  const INITIAL_DAYS = 30;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // ? NEW: Edit Mode State
  const [editingPost, setEditingPost] = useState<any>(null);

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
  const newestIdRef = useRef<number>(0); // highest thread id we've seen
  const initialLoadedRef = useRef(false); // replaces `initialLoaded` in polling
  const isPollingRef = useRef(false); // guard against overlapping polls
  const isActiveRef = useRef(true); // true when drawer is visible
  const initialScrollDoneRef = useRef(false); // ? only scroll once per mount
  const prevPostCountRef = useRef(0); // ? track post count to avoid unnecessary scrolls
  const isUserScrollingUpRef = useRef(false); // ? track scroll direction
  const prevScrollYRef = useRef(0);
  const scrollToBottomAfterSendRef = useRef(false); // ? NEW
  const pendingScrollAnchorRef = useRef<number | null>(null); // ?? ADD
  const stableScrollAttemptsRef = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ---- Export State ----
  // ---- Export State ----
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<
    "all" | "days" | "limit" | "range"
  >("days");

  // 👇 NEW: stable "today" so the picker bound doesn't shift between renders
  const todayDate = useMemo(() => new Date(), [showExportModal]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "pdf">(
    "csv",
  );

  // Manual numeric inputs
  const [exportLimitInput, setExportLimitInput] = useState("100");
  const [exportDaysInput, setExportDaysInput] = useState("30");

  // Custom date range (YYYY-MM-DD strings)
  const [exportFromDate, setExportFromDate] = useState<string>("");
  const [exportToDate, setExportToDate] = useState<string>("");
  // ?? ADD: manage members modal
  const [showManage, setShowManage] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // ?? ADD: is current user the group admin?

  // ---- Keyboard Listeners ----
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates?.height || 0);
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // ? FIX: Prevent infinite sound loop on polling
  const lastKnownPostIdsRef = useRef<Set<string>>(new Set());
  const editedPostsRef = useRef<
    Map<string, { content: string; editedAt: string }>
  >(new Map());
  const deletedPostIdsRef = useRef<Set<string>>(new Set());
  const hardDeletedIdsRef = useRef<Set<string>>(new Set()); // ?? ADD THIS

  // ---- SFU (WebRTC) ----
  const isAuditForum = useMemo(() => {
    const idStr = String(groupId);
    return (
      idStr.startsWith("AUDIT-") ||
      idStr.startsWith("GRP-") ||
      idStr.includes("_AUDIT_")
    );
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
    joinCall: async () => console.log("?? Audio/Video disabled"),
    endCall: () => console.log("?? Audio/Video disabled"),
    sendMediasoupMessage: () => console.log("?? Audio/Video disabled"),
    manuallyConnect: () => console.log("?? Audio/Video disabled"),
    manuallyDisconnect: () => console.log("?? Audio/Video disabled"),
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
  const currentUserEmail = String(
    currentUser?.email || username || (user as any)?.email || "",
  )
    .trim()
    .replace(/^"+|"+$/g, "")
    .toLowerCase();

  const isGroupAdmin = useMemo(() => {
    if (!groupAdminEmail) return false;
    return (
      String(groupAdminEmail).toLowerCase() ===
      String(currentUserEmail).toLowerCase()
    );
  }, [groupAdminEmail, currentUserEmail]);

  // ? Profile photo URL from user id
  const getProfileImageUrl = (
    userId?: string | number | null,
    existingImage?: string,
  ): string | null => {
    if (
      existingImage &&
      (existingImage.startsWith("http") || existingImage.startsWith("data:"))
    ) {
      return existingImage;
    }
    if (userId) return `${API_BASE_URL}/api/users/${userId}/profile-photo`;
    return null;
  };

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

  // ========== SHARED ENRICHMENT HELPER ==========
  const enrichPosts = useCallback(
    (rawPosts: any[]) => {
      const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
      return rawPosts.map((post: any) => {
        const u = safeAllUsers.find(
          (x: any) =>
            x?.email === post.createdBy ||
            x?.username === post.createdBy ||
            x?.id === post.createdBy,
        );

        const deliveryStatus = post.deliveryStatus;

        const isEdited = post.isEdited === true;
        const updatedAt = post.updatedAt || null;
        const locallyDeleted = deletedPostIdsRef.current.has(String(post.id));

        return {
          ...post,
          content: locallyDeleted ? "" : post.content,
          attachments: locallyDeleted ? [] : post.attachments,
          createdByProfileImage: u?.profileImage || "",
          createdByName: u
            ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email
            : post.createdBy || "Unknown",
          deliveryStatus,
          isEdited,
          updatedAt,
          isDeleted: locallyDeleted || post.isDeleted === true,
        };
      });
    },
    [allUsers, currentUserEmail],
  );

  // ========== 1. INITIAL LOAD ==========
  // ========== 1. INITIAL LOAD ==========
  const loadInitialPosts = useCallback(async () => {
    if (!groupId || !mountedRef.current) return;

    const cacheKey = String(groupId);
    const cached = groupPostsCache.get(cacheKey);

    // ? Seed from cache instantly   no spinner, no blank screen
    if (cached && cached.length > 0) {
      setPosts(cached);
      setInitialLoaded(true);
      initialLoadedRef.current = true;
      setLoading(false);

      // Seed newestIdRef so polling works immediately
      const cachedMaxId = cached.reduce(
        (m: number, p: any) => Math.max(m, Number(p.id) || 0),
        0,
      );
      newestIdRef.current = cachedMaxId;
    } else {
      setLoading(true); // only spinner if we have nothing to show
    }

    try {
      const response = await fetchGroupThreads(cacheKey, {
        limit: PAGE_SIZE,
        daysBack: INITIAL_DAYS,
        requester: currentUserEmail, // ?? ADD
      });

      let raw = Array.isArray(response)
        ? response
        : response?.data || response?.posts || [];
      if (!Array.isArray(raw)) raw = [];

      raw = raw.filter(
        (p: any) => !hardDeletedIdsRef.current.has(String(p.id)),
      );

      const enriched = enrichPosts(raw).sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );

      if (!mountedRef.current) return;

      setPosts(enriched);
      groupPostsCache.set(cacheKey, enriched); // ? save for next visit

      setInitialLoaded(true);
      initialLoadedRef.current = true;
      setHasMore(raw.length >= PAGE_SIZE);
      setError(null);
      setLoading(false);
      setUnreadCount(0);
      setLastSeen(new Date().toISOString());
      lastKnownPostIdsRef.current = new Set(raw.map((p: any) => p.id));

      const maxId = raw.reduce(
        (m: number, p: any) => Math.max(m, Number(p.id) || 0),
        0,
      );
      newestIdRef.current = maxId;

      // ? Only mark as seen if the page is visible
      // ? Only mark as seen if the page is visible
      const pageIsVisible =
        typeof document === "undefined" ||
        document.visibilityState === "visible";

      if (!pageIsVisible) {
        // Defer: mark-seen will happen when the page becomes visible
        return;
      }

      const unread = enriched.filter(
        (p: any) =>
          p.createdBy !== currentUserEmail &&
          p.messageType !== "REACTION" &&
          (!p.seenBy || !p.seenBy.includes(currentUserEmail)),
      );

      if (unread.length > 0) {
        // ? Delay by 2.5s so the sender's poll sees "delivered" first
        setTimeout(() => {
          if (!mountedRef.current) return;
          Promise.all(
            unread.map((p: any) =>
              fetch(
                `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${p.id}/mark-seen?requester=${currentUserEmail}`,
                { method: "POST" },
              ).catch(() => {}),
            ),
          ).then(() => {
            if (mountedRef.current) onSeen?.();
          });
        }, 1000);
      } else {
        onSeen?.();
      }
    } catch (err) {
      console.error("? Initial load failed:", err);
      // If we seeded from cache, don't show an error   the user already sees content
      if (mountedRef.current && (!cached || cached.length === 0)) {
        setError("Failed to load messages");
        setLoading(false);
      }
    }
  }, [groupId, enrichPosts, currentUserEmail, onSeen]);

  // ========== 2. POLLING (only NEW messages) ==========
  // ========== 2. POLLING (only NEW messages) ==========
  const pollNewMessages = useCallback(async () => {
    // ? Use refs   no stale closures, no `posts` dependency
    if (!groupId || !mountedRef.current) return;
    if (!initialLoadedRef.current) return;
    if (!isActiveRef.current) return; // ? stop polling when drawer closed
    if (isPollingRef.current) return; // ? prevent overlapping polls

    const sinceId = newestIdRef.current;
    if (!sinceId) return;

    isPollingRef.current = true;

    try {
      const response = await fetchGroupThreads(String(groupId), {
        sinceId: Number(sinceId),
        requester: currentUserEmail, // ?? ADD
      });

      let raw = Array.isArray(response)
        ? response
        : response?.data || response?.posts || [];
      if (!Array.isArray(raw) || raw.length === 0) return;

      raw = raw.filter(
        (p: any) => !hardDeletedIdsRef.current.has(String(p.id)),
      );
      const enrichedNew = enrichPosts(raw);

      if (enrichedNew.length > 0 && mountedRef.current) {
        // ? Advance the ref BEFORE setPosts, so we don't re-poll the same ids
        const newMax = enrichedNew.reduce(
          (m: number, p: any) => Math.max(m, Number(p.id) || 0),
          sinceId,
        );
        newestIdRef.current = newMax;

        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          const trulyNew = enrichedNew.filter(
            (p) => !existingIds.has(String(p.id)),
          );
          if (trulyNew.length === 0) return prev;
          return [...prev, ...trulyNew];
        });

        const latest = enrichedNew[enrichedNew.length - 1];
        if (latest?.createdBy !== currentUserEmail) {
          playNotificationSound("receive");
        }

        enrichedNew;
        // ? Only mark as seen if the page is visible
        // ? Only mark as seen if the page is visible
        const pageIsVisible =
          typeof document === "undefined" ||
          document.visibilityState === "visible";

        if (pageIsVisible) {
          setTimeout(() => {
            if (!mountedRef.current) return;
            enrichedNew
              .filter((p: any) => p.createdBy !== currentUserEmail)
              .forEach((p: any) => {
                fetch(
                  `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${p.id}/mark-seen?requester=${currentUserEmail}`,
                  { method: "POST" },
                ).catch(() => {});
              });
          }, 1000);
        }
      }
    } catch (err) {
      console.warn("Poll failed:", err);
    } finally {
      isPollingRef.current = false;
    }
  }, [groupId, enrichPosts, currentUserEmail]); // ? no `posts`, no `initialLoaded`
  // ========== 3. LOAD PREVIOUS ==========
  const loadPreviousPosts = useCallback(async () => {
    if (!groupId || loadingMore || !hasMore || !mountedRef.current) return;
    const oldest = posts.find((p) => p.messageType !== "REACTION");
    if (!oldest?.id) return;

    setLoadingMore(true);
    try {
      const response = await fetchGroupThreads(String(groupId), {
        beforeId: Number(oldest.id),
        limit: PAGE_SIZE,
        requester: currentUserEmail, // ?? ADD
      });

      let raw = Array.isArray(response)
        ? response
        : response?.data || response?.posts || [];
      if (!Array.isArray(raw)) raw = [];

      raw = raw.filter(
        (p: any) => !hardDeletedIdsRef.current.has(String(p.id)),
      );

      if (raw.length < PAGE_SIZE) setHasMore(false);

      const enrichedOlder = enrichPosts(raw).sort(
        (a: any, b: any) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );

      if (mountedRef.current) {
        // ? Tell onContentSizeChange: after the new items render,
        //    scroll so that the item that used to be at the top is still at the top.
        pendingScrollAnchorRef.current = enrichedOlder.length;

        setPosts((prev) => [...enrichedOlder, ...prev]);
      }
    } catch (err) {
      console.error("? Load previous failed:", err);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [groupId, posts, loadingMore, hasMore, enrichPosts]);

  const pollStatusUpdates = useCallback(async () => {
    if (!groupId || !mountedRef.current) return;
    if (!initialLoadedRef.current) return;
    if (!isActiveRef.current) return;

    const myEmailLower = (currentUserEmail || "").toLowerCase();
    const myRecentIds = posts
      .filter(
        (p) =>
          (p.createdBy || "").toLowerCase() === myEmailLower && p.id != null,
      )
      .slice(-30)
      .map((p) => p.id);

    if (myRecentIds.length === 0) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/status?ids=${myRecentIds.join(",")}`,
        {},
      );
      if (!res.ok) return;

      const updates: { id: number; seenBy: string[]; deliveredTo: string[] }[] =
        await res.json();
      if (
        !mountedRef.current ||
        !Array.isArray(updates) ||
        updates.length === 0
      )
        return;

      const updateMap = new Map(updates.map((u) => [String(u.id), u]));

      setPosts((prev) =>
        prev.map((p) => {
          const u = updateMap.get(String(p.id));
          if (!u) return p;

          const seenSame =
            JSON.stringify(p.seenBy || []) === JSON.stringify(u.seenBy || []);
          const deliveredSame =
            JSON.stringify(p.deliveredTo || []) ===
            JSON.stringify(u.deliveredTo || []);
          if (seenSame && deliveredSame) return p;

          return {
            ...p,
            seenBy: u.seenBy || p.seenBy,
            deliveredTo: u.deliveredTo || p.deliveredTo,
          };
        }),
      );
    } catch {
      // silent
    }
  }, [groupId, posts, currentUserEmail]);

  const pollTyping = useCallback(async () => {
    if (!groupId || !mountedRef.current) return;
    if (!initialLoadedRef.current) return;
    if (!isActiveRef.current) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forum/8d/groups/${groupId}/typing?requester=${encodeURIComponent(
          currentUserEmail,
        )}`,
        { credentials: "include" },
      );
      if (!res.ok) return;

      const users: string[] = await res.json();
      if (!mountedRef.current) return;

      setTypingUsers((prev) => {
        if (
          prev.length === users.length &&
          prev.every((u, i) => u === users[i])
        ) {
          return prev; // no change → don't re-render
        }
        return Array.isArray(users) ? users : [];
      });
    } catch {
      // silent — typing is best-effort
    }
  }, [groupId, currentUserEmail]);
  // ========== POLLING ==========
  // ========== POLLING ==========
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      pollNewMessages();
      pollStatusUpdates();
      pollTyping(); // 👈 new
    }, 2000);
    setIsChatConnected(true);
  }, [pollNewMessages, pollStatusUpdates, pollTyping]); // 👈 add pollTyping

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (mountedRef.current) {
      setIsChatConnected(false);
    }
  }, []);

  // ? NEW: Auto-load older messages when user scrolls near the top
  // ? PASSIVE: only track scroll direction   no auto-load
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    const isMovingUp = contentOffset.y < (prevScrollYRef.current || 0);
    isUserScrollingUpRef.current = isMovingUp;
    prevScrollYRef.current = contentOffset.y;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        // Re-run the seen-marking logic
        loadInitialPosts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadInitialPosts]);

  // ? NEW: restart interval when pollNewMessages changes (rare   only when groupId/enrichPosts change)
  useEffect(() => {
    if (!initialLoaded) return;
    if (!isActiveRef.current) return;
    startPolling();
    return () => {
      stopPolling();
    };
  }, [pollNewMessages, initialLoaded, startPolling, stopPolling]);

  // ========== SEND MESSAGE ==========
  // ========== SEND MESSAGE (NO MORE FAKE TIMERS) ==========
  // ========== SEND MESSAGE (FIXED 500 ERROR) ==========
  const handleNewPost = async (newPostData: any) => {
    if (!mountedRef.current || !groupId) return;

    const userEmail = currentUser?.email || username || "";
    const tempId = `temp-msg-${Date.now()}-${Math.random()}`;

    const optimisticMsg = {
      id: tempId,
      title: newPostData.content?.substring(0, 30) || "New Message",
      content: newPostData.content,
      createdBy: userEmail,
      createdByName: displayName,
      createdAt: new Date().toISOString(),
      messageType: newPostData.messageType || "TEXT",
      attachments: newPostData.attachments || [],
      deliveryStatus: "SENDING" as const,
    };

    // ? NEW: Force scroll to bottom after this send
    scrollToBottomAfterSendRef.current = true;

    setPosts((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newPostData.content?.substring(0, 30) || "New Message", // ? FIX: Backend requires title
            content: newPostData.content,
            createdBy: userEmail,
            createdByName: displayName, // ? FIX: Include sender's name
            messageType: newPostData.messageType || "TEXT",
            parentId: newPostData.parentId || null,
            attachments: newPostData.attachments || [],
          }),
        },
      );

      if (res.ok) {
        const savedMsg = await res.json();

        // ? Step 2: Server confirmed ? SENT (single gray check ?)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? {
                  ...savedMsg,
                  deliveryStatus: "SENT",
                  seenBy: savedMsg.seenBy || [userEmail],
                  deliveredTo: savedMsg.deliveredTo || [userEmail],
                  createdByName: displayName,
                }
              : p,
          ),
        );

        playNotificationSound("send");
      } else {
        const errorText = await res.text();
        console.error("? Send failed:", errorText);
        // ? Mark as FAILED
        setPosts((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { ...p, deliveryStatus: "FAILED", failed: true }
              : p,
          ),
        );
      }
    } catch (err) {
      console.error("? Send failed:", err);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, deliveryStatus: "FAILED", failed: true }
            : p,
        ),
      );
    }
  };

  // ========== REACTIONS (COMPLETELY FIXED) ==========
  // ========== REACTIONS (MINIMAL PAYLOAD TO FIX 500 ERROR) ==========
  const handleReactToPost = useCallback(
    async (postId: string | number, emoji: string) => {
      if (!mountedRef.current || !groupId) return;

      const userEmail = String(currentUser?.email || username || "").trim();

      if (!userEmail) {
        console.error("? Cannot react: user email is missing");
        return;
      }

      if (!emoji?.trim()) {
        console.error("? Cannot react: emoji is missing");
        return;
      }

      // Normalize the post ID.
      const normalizedPostId = String(postId).trim();

      if (!normalizedPostId) {
        console.error("? Cannot react: post ID is missing");
        return;
      }

      // Your backend appears to use Long/number IDs for threads.
      const numericPostId = Number(normalizedPostId);

      if (!Number.isFinite(numericPostId)) {
        console.error("? Cannot react: invalid numeric post ID:", postId);
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
            prev.filter((p) => String(p.id) !== String(existingReaction.id)),
          );

          const deleteUrl =
            `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/` +
            `${existingReaction.id}?requester=${encodeURIComponent(userEmail)}`;

          console.log("??? Removing reaction:", {
            reactionId: existingReaction.id,
            postId: normalizedPostId,
            userEmail,
            url: deleteUrl,
          });

          const response = await fetch(deleteUrl, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorText = await response.text();

            console.error("? Reaction delete failed:", {
              status: response.status,
              body: errorText,
            });

            // Rollback
            setPosts((prev) => [...prev, existingReaction]);
          } else {
            console.log("? Reaction removed successfully");
          }
        } catch (error) {
          console.error("? Network error removing reaction:", error);

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
        const url = `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads`;

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

        console.log("?? Sending reaction:", {
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
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();

        console.log("?? Reaction response:", {
          status: response.status,
          body: responseText,
        });

        if (!response.ok) {
          console.error("? Reaction failed:", {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            requestBody,
          });

          // Rollback optimistic UI
          setPosts((prev) => prev.filter((p) => p.id !== tempId));

          return;
        }

        console.log("? Reaction created successfully");

        playNotificationSound("send");

        // Refresh from backend
        setTimeout(() => {
          if (mountedRef.current) {
            loadInitialPosts();
          }
        }, 300);
      } catch (error) {
        console.error("? Network error sending reaction:", error);

        setPosts((prev) => prev.filter((p) => p.id !== tempId));
      }
    },
    [groupId, posts, currentUser?.email, username, displayName],
  );

  // ? FIXED REACTIONS (Prevents Type Mismatch)
  const getReactionsForThread = useCallback(
    (threadId: string | number) => {
      if (!threadId) return [];
      return posts.filter(
        (p) =>
          p.messageType === "REACTION" &&
          String(p.parentId) === String(threadId), // ? FORCE STRING COMPARISON
      );
    },
    [posts],
  );

  // ? EDIT & DELETE
  // ? FIXED EDIT MESSAGE
  const handleUpdatePost = useCallback(
    async (postData: any) => {
      const editedAt = new Date().toISOString();

      try {
        // 1. Optimistic UI update (server will confirm shortly)
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postData.id
              ? {
                  ...p,
                  content: postData.content,
                  isEdited: true,
                  updatedAt: editedAt,
                }
              : p,
          ),
        );

        // 2. Call the backend
        const response = await fetch(
          `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${postData.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: postData.content,
              requester: currentUserEmail,
            }),
          },
        );

        if (!response.ok) {
          console.error("? Edit failed on backend:", await response.text());
        } else {
          // ? Refresh from server so updatedAt comes from the DB
          loadInitialPosts();
        }
      } catch (err) {
        console.error("Update failed", err);
      }
    },
    [groupId, currentUserEmail, loadInitialPosts],
  );

  // ? FIXED DELETE MESSAGE
  // ForumThreadView.tsx

  const handleDeletePost = useCallback(
    async (postId: string | number) => {
      const idStr = String(postId);
      try {
        const postToDelete = posts.find((p) => String(p.id) === idStr);
        if (!postToDelete) return;

        const createdAtTime = new Date(postToDelete.createdAt).getTime();
        const isWithin5Seconds = Date.now() - createdAtTime <= 5000;

        if (isWithin5Seconds) {
          // ?? HARD DELETE   remove from UI immediately
          setPosts((prev) => prev.filter((p) => String(p.id) !== idStr));
          hardDeletedIdsRef.current.add(idStr);
        } else {
          // ?? SOFT DELETE   tombstone (keep content in memory)
          deletedPostIdsRef.current.add(idStr);
          setPosts((prev) =>
            prev.map((p) =>
              String(p.id) === idStr
                ? { ...p, isDeleted: true } // ?? content kept
                : p,
            ),
          );
        }

        const url =
          `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${postId}` +
          `?requester=${encodeURIComponent(currentUserEmail)}` +
          (isWithin5Seconds ? `&hard=true` : ``);

        const response = await fetch(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          console.error("? Delete failed:", await response.text());
          hardDeletedIdsRef.current.delete(idStr);
          deletedPostIdsRef.current.delete(idStr);
          loadInitialPosts();
        } else {
          console.log(
            isWithin5Seconds
              ? "? Hard delete successful"
              : "? Soft delete successful",
          );
        }
      } catch (err) {
        console.error("Delete failed", err);
        hardDeletedIdsRef.current.delete(idStr);
        deletedPostIdsRef.current.delete(idStr);
        loadInitialPosts();
      }
    },
    [groupId, currentUserEmail, posts, loadInitialPosts],
  );

  // ? Undo delete   restores the message
  // ? Undo delete   restores the message (WhatsApp-style)
  const handleUndoDelete = async (postId: string | number) => {
    const idStr = String(postId);
    console.log("?? Undo requested for:", idStr);

    try {
      // 1. Optimistic   flip isDeleted OFF (content is still in memory)
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === idStr ? { ...p, isDeleted: false } : p,
        ),
      );

      // 2. Clear from local-deleted ref
      deletedPostIdsRef.current.delete(idStr);

      // 3. Clear from cache
      const cacheKey = String(groupId);
      const cached = groupPostsCache.get(cacheKey);
      if (cached) {
        groupPostsCache.set(
          cacheKey,
          cached.map((p) =>
            String(p.id) === idStr ? { ...p, isDeleted: false } : p,
          ),
        );
      }

      // 4. Call backend
      const response = await fetch(
        `${API_BASE_URL}/api/forum/8d/groups/${groupId}/threads/${postId}/restore?requester=${encodeURIComponent(currentUserEmail)}`,
        { method: "POST" },
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("? Undo failed:", errText);

        // Rollback
        setPosts((prev) =>
          prev.map((p) =>
            String(p.id) === idStr ? { ...p, isDeleted: true } : p,
          ),
        );
        deletedPostIdsRef.current.add(idStr);
        return;
      }

      console.log("? Undo successful for:", idStr);
      // ? No loadInitialPosts()   content is already restored in memory
    } catch (err) {
      console.error("? Undo exception:", err);
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === idStr ? { ...p, isDeleted: true } : p,
        ),
      );
      deletedPostIdsRef.current.add(idStr);
    }
  };

  const handleComposerSubmit = (data: any) => {
    if (data.isEdit) {
      handleUpdatePost(data);
    } else {
      handleNewPost(data);
      // ? Guarantee scroll to bottom shortly after submit
      setTimeout(() => {
        if (!isSearching) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  };
  // ========== EXPORT ==========
  // ========== EXPORT ==========
  const handleExport = () => {
    resetExportDates();
    setShowExportModal(true);
  };

  const resetExportDates = useCallback(() => {
    setExportFromDate("");
    setExportToDate("");
  }, []);

  const confirmExport = async () => {
    try {
      // ---- Validate ----
      if (exportScope === "days") {
        const days = parseInt(exportDaysInput, 10);
        if (!Number.isFinite(days) || days <= 0 || days > 3650) {
          Alert.alert("Invalid days", "Enter a number between 1 and 3650.");
          return;
        }
      }
      if (exportScope === "limit") {
        const lim = parseInt(exportLimitInput, 10);
        if (!Number.isFinite(lim) || lim <= 0 || lim > 100000) {
          Alert.alert("Invalid count", "Enter a number between 1 and 100000.");
          return;
        }
      }
      if (exportScope === "range") {
        if (!exportFromDate || !exportToDate) {
          Alert.alert("Missing dates", "Please pick both From and To dates.");
          return;
        }
        const from = new Date(exportFromDate + "T00:00:00");
        const to = new Date(exportToDate + "T23:59:59");
        const now = new Date();

        if (from > to) {
          Alert.alert("Invalid range", "'From' must be before 'To'.");
          return;
        }

        // 👇 NEW: block future end dates
        if (to.getTime() > now.getTime()) {
          Alert.alert(
            "Invalid range",
            "'To' date cannot be in the future. Please pick today or earlier.",
          );
          return;
        }
      }

      setShowExportModal(false);

      const opts: {
        format: "csv" | "json" | "pdf";
        scope: "all" | "days" | "limit" | "range";
        requester?: string;
        daysBack?: number;
        limit?: number;
        fromDate?: string;
        toDate?: string;
      } = {
        format: exportFormat,
        scope: exportScope,
        requester: currentUserEmail,
      };

      if (exportScope === "days") {
        opts.daysBack = parseInt(exportDaysInput, 10);
      } else if (exportScope === "limit") {
        opts.limit = parseInt(exportLimitInput, 10);
      } else if (exportScope === "range") {
        opts.fromDate = exportFromDate;
        opts.toDate = exportToDate;
      }

      if (Platform.OS === "web") {
        await exportGroupThreads(String(groupId), opts);
      } else {
        const url = await exportGroupThreads(String(groupId), opts);
        if (typeof url !== "string") return;

        const FileSystem = require("expo-file-system");
        const Sharing = require("expo-sharing");

        const localUri =
          FileSystem.documentDirectory +
          `forum-${groupId}-${exportScope}.${exportFormat}`;
        const result = await FileSystem.downloadAsync(url, localUri);
        if (result?.uri) await Sharing.shareAsync(result.uri);
      }
    } catch (err: any) {
      console.error("Export failed", err);
      Alert.alert("Export failed", err?.message || "Unknown error");
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
      console.error("? Failed to start individual call:", error);
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
      console.error("? Failed to start call:", error);
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
      console.error("? Failed to join call:", error);
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
      console.error("? Failed to join call:", error);
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
      // ? Groups are created by the backend. No need to ensure here.
      await loadInitialPosts();
      startPolling();
      fetchGroupMembers();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      initializationRef.current = false;
      isActiveRef.current = false; // ? stop polling on unmount
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

  // ? Keep session cache in sync with whatever `posts` currently is
  useEffect(() => {
    if (!groupId) return;
    if (posts.length > 0) {
      groupPostsCache.set(String(groupId), posts);
    }
  }, [posts, groupId]);

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

  const handleProceedAfterEmail = async () => {
    setShowEmailModal(false);
  };

  // ========== RENDER HELPERS ==========
  // ========== RENDER HELPERS ==========
  const displayPosts = isSearching && searchQuery ? filteredPosts : posts;

  // ? NEW: memoized filter   only recomputes when posts / search change
  const visiblePosts = useMemo(
    () => displayPosts.filter((p) => p.messageType !== "REACTION"),
    [displayPosts],
  );

  // ? NEW: memoized reactions map   O(1) lookup per thread instead of O(n)
  const reactionsByParent = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of posts) {
      if (p.messageType === "REACTION" && p.parentId != null) {
        const key = String(p.parentId);
        const arr = map.get(key);
        if (arr) arr.push(p);
        else map.set(key, [p]);
      }
    }
    return map;
  }, [posts]);

  // ? NEW: Find the first unread message (oldest one that hasn't been seen by you)
  // Uses visiblePosts (no reactions) since that's what's on screen
  const firstUnreadIndex = useMemo(() => {
    if (!currentUserEmail) return -1;
    return visiblePosts.findIndex(
      (p: any) =>
        p.createdBy !== currentUserEmail &&
        p.messageType !== "REACTION" &&
        (!p.seenBy || !p.seenBy.includes(currentUserEmail)),
    );
  }, [visiblePosts, currentUserEmail]);

  // ? NEW: Find the index of the last seen message (for the "New messages" divider)
  // The divider goes right AFTER this index.
  const lastSeenIndex = useMemo(() => {
    if (!currentUserEmail) return -1;
    if (firstUnreadIndex === -1) return -1; // nothing unread ? no divider

    // Scan backwards from the first unread; the message right before it is the
    // last one the user has "seen"
    for (let i = firstUnreadIndex - 1; i >= 0; i--) {
      const p = visiblePosts[i];
      if (p.createdBy === currentUserEmail) {
        // own message ? doesn't count as "seen by me" boundary
        continue;
      }
      if (p.seenBy?.includes(currentUserEmail)) {
        return i;
      }
    }
    return -1; // all messages are unread   divider goes at top
  }, [visiblePosts, firstUnreadIndex, currentUserEmail]);
  // ? NEW CODE (Always treat backend as UTC)
  // ? REPLACE with consistent UTC parser
  // ? REPLACE getDateLabel - Force UTC
  const getDateLabel = (dateString?: string) => {
    if (!dateString) return "";

    try {
      let isoString = String(dateString).trim();

      // Backend format:
      // 2026-08-26 08:45:00
      if (!isoString.includes("T")) {
        isoString = isoString.replace(" ", "T");
      }

      // Backend timestamp without timezone = UTC
      if (!isoString.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(isoString)) {
        isoString += "Z";
      }

      const date = new Date(isoString);

      if (isNaN(date.getTime())) return "";

      const now = new Date();

      // Compare LOCAL calendar dates
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const messageDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

      const diffDays = Math.floor(
        (today.getTime() - messageDay.getTime()) / 86400000,
      );

      // Today
      if (diffDays === 0) {
        return "Today";
      }

      // Yesterday
      if (diffDays === 1) {
        return "Yesterday";
      }

      // Within the last 7 days
      if (diffDays > 1 && diffDays < 7) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
        });
      }

      // Older dates
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      console.error("getDateLabel error:", error);
      return "";
    }
  };

  const SearchBar = () => (
    <View className="flex-row items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
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

  // ? Member row   shows real avatar with image-error fallback
  const MemberRow = ({ m }: { m: any }) => {
    const [imgError, setImgError] = useState(false);
    const url = getProfileImageUrl(m?.id, m?.profilePhoto || m?.profileImage);

    const displayName =
      `${m?.firstName || ""} ${m?.lastName || ""}`.trim() ||
      m?.username ||
      m?.email ||
      "User";

    const initials = displayName.charAt(0).toUpperCase() || "?";

    // ?? ADD: is this row the group admin?
    const isAdminMember =
      groupAdminEmail &&
      String(m?.email || "").toLowerCase() ===
        String(groupAdminEmail).toLowerCase();

    return (
      <View className="flex-row items-center justify-between border-b border-gray-100 p-3">
        <View className="flex-1 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100">
            {url && !imgError ? (
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
                onError={() => setImgError(true)}
              />
            ) : (
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#00529B" }}
              >
                {initials}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-sm font-medium text-gray-900">
                {displayName}
              </Text>
              {/* ?? Crown next to admin */}
              {isAdminMember && (
                <Text style={{ fontSize: 12, marginLeft: 4 }}>??</Text>
              )}
            </View>
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {m.email}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const MembersSidebar = () => {
    const safeGroupMembers = Array.isArray(groupMembers) ? groupMembers : [];

    return (
      <View className="w-72 border-l border-gray-200 bg-white">
        <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
          <View>
            <Text className="font-semibold text-gray-800">Group Members</Text>
            <Text className="mt-1 text-xs text-gray-500">
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
            <MemberRow key={m.email || m.id || i} m={m} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const IncomingCallModal = () => {
    if (callState !== "ringing") return null;
    return (
      <Modal visible transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 p-4">
          <View className="w-80 items-center rounded-2xl bg-white p-8">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <User size={32} color="#00529B" />
            </View>
            <Text className="text-lg font-bold text-gray-900">
              {callerName} is calling...
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {currentCallType === "video" ? "Video" : "Audio"} call
            </Text>
            <View className="mt-8 flex-row gap-6">
              <TouchableOpacity
                onPress={handleDeclineCall}
                className="h-16 w-16 items-center justify-center rounded-full bg-red-500"
              >
                <Phone
                  size={28}
                  color="white"
                  style={{ transform: [{ rotate: "135deg" }] }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAcceptCall}
                className="h-16 w-16 items-center justify-center rounded-full bg-green-500"
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
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1e3a8a"
        translucent={false}
      />

      {/* ✅ FIXED HEADER — single ⋮ menu instead of scrollable icons */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#1e3a8a",
          paddingHorizontal: 12,
          paddingTop:
            Platform.OS === "android"
              ? (StatusBar.currentHeight || 24) + 4
              : isInDrawer
                ? 12
                : (insets.top || 44) + 4,
          paddingBottom: 10,
          gap: 8,
        }}
      >
        {/* Left: back + title */}
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={{ padding: 6, marginRight: 2 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={22} color="white" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowMembersSidebar(!showMembersSidebar)}
            style={{ flex: 1, marginLeft: 4 }}
            activeOpacity={0.7}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: 15,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {groupName || "Audit Forum"}
              </Text>
              {plantName ? (
                <View
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{
                      color: "#bfdbfe",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {plantName}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{ color: "#bfdbfe", fontSize: 11, marginTop: 2 }}
              numberOfLines={1}
            >
              {Array.isArray(groupMembers) ? groupMembers.length : 0} members ·{" "}
              {visiblePosts.length} messages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Right: single ⋮ menu */}
        <TouchableOpacity
          onPress={() => setShowHeaderMenu(true)}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MoreVertical size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {isSearching && <SearchBar />}

      {/* Status Bar */}
      {!isSearching && (
        <View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
          <View className="flex-row items-center gap-2">
            <View className="h-5 w-5 items-center justify-center rounded-full bg-gray-200">
              <User size={10} color="#6b7280" />
            </View>
            <Text className="text-xs font-medium text-gray-600">
              {displayName}
            </Text>
            {typingUsers.length > 0 && (
              <Text className="text-xs italic text-blue-600">
                {typingUsers.length === 1
                  ? `${getDisplayName(typingUsers[0])} is typing…`
                  : `${typingUsers.length} people are typing…`}
              </Text>
            )}
            {unreadCount > 0 && (
              <View className="rounded-full bg-red-500 px-2 py-0.5">
                <Text className="text-xs text-white">{unreadCount} new</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {activeUsers.length > 0 && (
              <Text className="text-xs text-green-600">
                {activeUsers.length} in call
              </Text>
            )}
            <TouchableOpacity onPress={loadInitialPosts}>
              <RefreshCw size={14} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content */}
      <View className="flex-1 flex-row">
        <View style={{ flex: 1, flexDirection: "column" }}>
          {loading && posts.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#00529B" />
              <Text className="mt-3 text-gray-500">Loading messages...</Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center p-4">
              <AlertCircle size={32} color="#ef4444" />
              <Text className="mt-2 text-center text-red-500">{error}</Text>
              <TouchableOpacity
                onPress={loadInitialPosts}
                className="mt-3 rounded-lg bg-blue-900 px-4 py-2"
              >
                <Text className="text-sm text-white">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={visiblePosts}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item, index) => item?.id || String(index)}
              ListHeaderComponent={
                <>
                  {/* ? Button   only shows when older messages exist */}
                  {hasMore && !isSearching && visiblePosts.length > 0 && (
                    <View style={{ alignItems: "center", paddingVertical: 12 }}>
                      <TouchableOpacity
                        onPress={loadPreviousPosts}
                        disabled={loadingMore}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: loadingMore ? "#E5E7EB" : "#EFF6FF",
                          borderWidth: 1,
                          borderColor: "#BFDBFE",
                        }}
                      >
                        {loadingMore ? (
                          <>
                            <ActivityIndicator size="small" color="#00529B" />
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#00529B",
                                fontWeight: "600",
                              }}
                            >
                              Loading
                            </Text>
                          </>
                        ) : (
                          <>
                            <ChevronUp size={14} color="#00529B" />
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#00529B",
                                fontWeight: "600",
                              }}
                            >
                              Load previous messages
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ? "Beginning of conversation" when no more exist */}
                  {!hasMore && visiblePosts.length > 0 && !isSearching && (
                    <View style={{ alignItems: "center", paddingVertical: 16 }}>
                      <Text
                        style={{
                          color: "#CBD5E1",
                          fontSize: 11,
                          fontWeight: "500",
                        }}
                      >
                        Beginning of conversation
                      </Text>
                    </View>
                  )}
                </>
              }
              renderItem={({ item, index }) => {
                let dateLabel = null;
                if (index === 0) {
                  dateLabel = getDateLabel(item.createdAt);
                } else {
                  const prevItem = visiblePosts[index - 1];
                  if (prevItem) {
                    const prevDate = new Date(
                      prevItem.createdAt,
                    ).toDateString();
                    const currDate = new Date(item.createdAt).toDateString();
                    if (prevDate !== currDate) {
                      dateLabel = getDateLabel(item.createdAt);
                    }
                  }
                }

                return (
                  <>
                    {dateLabel && (
                      <View
                        style={{ alignItems: "center", marginVertical: 12 }}
                      >
                        <View
                          style={{
                            backgroundColor: "#e5e7eb",
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              fontWeight: "500",
                            }}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* ? "New messages" divider   shown once, right after the last seen message */}
                    {firstUnreadIndex !== -1 &&
                      index === lastSeenIndex + 1 &&
                      !isSearching && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 12,
                            marginVertical: 12,
                          }}
                        >
                          <View
                            style={{
                              flex: 1,
                              height: 1,
                              backgroundColor: "#25D366",
                            }}
                          />
                          <Text
                            style={{
                              marginHorizontal: 12,
                              fontSize: 11,
                              fontWeight: "700",
                              color: "#25D366",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            New messages
                          </Text>
                          <View
                            style={{
                              flex: 1,
                              height: 1,
                              backgroundColor: "#25D366",
                            }}
                          />
                        </View>
                      )}

                    <ThreadCard
                      thread={item}
                      currentUser={currentUser}
                      currentUsername={currentUserEmail}
                      allUsers={allUsers}
                      memberEmails={
                        Array.isArray(memberEmails)
                          ? memberEmails
                              .map((m: any) =>
                                typeof m === "string" ? m : m?.email,
                              )
                              .filter(Boolean)
                          : []
                      }
                      reactions={reactionsByParent.get(String(item.id)) || []}
                      onReact={handleReactToPost}
                      onEdit={setEditingPost}
                      onDelete={handleDeletePost}
                      onUndoDelete={handleUndoDelete}
                      onRetry={handleRetry}
                    />
                  </>
                );
              }}
              className="flex-1"
              contentContainerStyle={{ paddingVertical: 8 }}
              ListEmptyComponent={
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 40,
                  }}
                >
                  <MessageCircle size={48} color="#d1d5db" />
                  <Text className="mt-3 text-gray-400">
                    {isSearching ? "No messages found" : "No messages yet"}
                  </Text>
                </View>
              }

              ListFooterComponent={
                typingUsers.length > 0 && !isSearching ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: "#f3f4f6",
                        borderRadius: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        {typingUsers.length === 1
                          ? `${getDisplayName(typingUsers[0])} is typing`
                          : `${typingUsers.length} people are typing`}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                        •••
                      </Text>
                    </View>
                  </View>
                ) : null
              }

              onContentSizeChange={() => {
                if (isSearching) return;

                // ? PRIORITY 0: preserve scroll position after "Load previous"
                if (pendingScrollAnchorRef.current !== null) {
                  const anchor = pendingScrollAnchorRef.current;
                  pendingScrollAnchorRef.current = null;

                  requestAnimationFrame(() => {
                    try {
                      flatListRef.current?.scrollToIndex({
                        index: anchor,
                        animated: false,
                        viewPosition: 0,
                      });
                    } catch (err) {
                      console.log("Anchor scroll failed:", err);
                    }
                  });
                  return; // ?? important   skip everything else this cycle
                }

                if (scrollToBottomAfterSendRef.current) {
                  scrollToBottomAfterSendRef.current = false;
                  requestAnimationFrame(() =>
                    flatListRef.current?.scrollToEnd({ animated: true }),
                  );
                  return;
                }

                if (keyboardVisible) return;

                // ---- Scroll-to-unread path (unchanged) ----
                if (firstUnreadIndex > 0) {
                  if (initialScrollDoneRef.current) return;
                  try {
                    flatListRef.current?.scrollToIndex({
                      index: Math.max(0, firstUnreadIndex - 1),
                      animated: false,
                      viewPosition: 0.1,
                    });
                  } catch {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }
                  initialScrollDoneRef.current = true;
                  return;
                }

                // ---- No unread: keep pinning to bottom until layout stops growing ----
                if (initialScrollDoneRef.current) return;
                if (visiblePosts.length === 0) return;

                // Pin to bottom on every content-size change until we've done it a few
                // times without the size changing further.
                flatListRef.current?.scrollToEnd({ animated: false });
                stableScrollAttemptsRef.current += 1;

                // Stop after N attempts (layout is stable by then)
                if (stableScrollAttemptsRef.current >= 4) {
                  initialScrollDoneRef.current = true;
                }
              }}
              onScrollToIndexFailed={(info) => {
                // Retry with a small delay so the item can render
                const { index } = info;
                setTimeout(() => {
                  try {
                    flatListRef.current?.scrollToIndex({
                      index,
                      animated: false,
                      viewPosition: 0.1,
                    });
                  } catch {}
                }, 100);
              }}
              onScroll={handleScroll}
              scrollEventThrottle={200}
              initialNumToRender={25}
              maxToRenderPerBatch={25}
              windowSize={21}
              removeClippedSubviews={false} // RN's clipping can re-fire onContentSizeChange late
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 0,
              }}
            />
          )}

          {/* ? FIXED: Composer with dynamic bottom padding to prevent empty space */}
          <View
            style={{
              backgroundColor: "white",
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",

              // ? DYNAMIC BOTTOM PADDING:
              // - When keyboard is visible: add keyboard height so composer sits above keyboard
              // - When keyboard is hidden: use minimal safe area bottom
              paddingBottom: keyboardVisible
                ? keyboardHeight + 50
                : Math.max(insets.bottom, 8),
            }}
          >
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

      {/* ?? Manage members modal */}
      {showManage && (
        <ManageGroupMembersModal
          isOpen={showManage}
          onClose={() => setShowManage(false)}
          group={{
            groupId,
            groupName,
            members: groupMembers.map((m) => m.email).filter(Boolean),
            adminEmail: groupAdminEmail,
          }}
          currentUser={currentUser}
          allUsers={allUsers}
          isAdmin={isGroupAdmin}
          onUpdated={() => {
            setShowManage(false);
            onSeen?.(); // tell parent to refresh group list
          }}
        />
      )}

      {/* Export Options Modal */}
      {/* Export Options Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowExportModal(false);
          resetExportDates(); // 👈 NEW
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Export Chat
              </Text>
              <Text
                style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}
              >
                Choose what to include and the file format.
              </Text>

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: "#6b7280",
                  marginBottom: 8,
                }}
              >
                WHAT TO EXPORT
              </Text>

              {[
                {
                  key: "days",
                  label: "Last N days",
                  sub: "Type any number of days",
                },
                {
                  key: "limit",
                  label: "Last N messages",
                  sub: "Type any number of messages",
                },
                {
                  key: "range",
                  label: "Custom date range",
                  sub: "Pick a From and To date",
                },
                {
                  key: "all",
                  label: "Entire conversation",
                  sub: "Every message ever sent",
                },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setExportScope(opt.key as any)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor:
                      exportScope === opt.key ? "#eff6ff" : "transparent",
                    borderWidth: 1,
                    borderColor:
                      exportScope === opt.key ? "#00529B" : "#e5e7eb",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor:
                        exportScope === opt.key ? "#00529B" : "#9ca3af",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    {exportScope === opt.key && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#00529B",
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}
                    >
                      {opt.sub}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* ============ LAST N DAYS ============ */}
              {exportScope === "days" && (
                <View style={{ marginTop: 4, marginBottom: 10 }}>
                  <Text style={labelStyle}>NUMBER OF DAYS</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={exportDaysInput}
                      onChangeText={(t) =>
                        setExportDaysInput(t.replace(/[^0-9]/g, ""))
                      }
                      keyboardType="number-pad"
                      placeholder="30"
                      style={numberInputStyle}
                    />
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>days</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                    {[7, 30, 90, 365].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setExportDaysInput(String(d))}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor:
                            exportDaysInput === String(d)
                              ? "#00529B"
                              : "#f3f4f6",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color:
                              exportDaysInput === String(d)
                                ? "white"
                                : "#374151",
                          }}
                        >
                          {d === 365 ? "1 year" : `${d}d`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ============ LAST N MESSAGES ============ */}
              {exportScope === "limit" && (
                <View style={{ marginTop: 4, marginBottom: 10 }}>
                  <Text style={labelStyle}>NUMBER OF MESSAGES</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={exportLimitInput}
                      onChangeText={(t) =>
                        setExportLimitInput(t.replace(/[^0-9]/g, ""))
                      }
                      keyboardType="number-pad"
                      placeholder="100"
                      style={numberInputStyle}
                    />
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>
                      messages
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                    {[50, 100, 500, 1000].map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => setExportLimitInput(String(n))}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor:
                            exportLimitInput === String(n)
                              ? "#00529B"
                              : "#f3f4f6",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color:
                              exportLimitInput === String(n)
                                ? "white"
                                : "#374151",
                          }}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ============ CUSTOM DATE RANGE ============ */}
              {exportScope === "range" && (
                <View style={{ marginTop: 4, marginBottom: 10 }}>
                  <Text style={labelStyle}>FROM DATE</Text>
                  <DateField
                    value={exportFromDate}
                    onChange={setExportFromDate}
                    placeholder="YYYY-MM-DD"
                    maxDate={todayDate}
                  />

                  <Text style={[labelStyle, { marginTop: 10 }]}>TO DATE</Text>
                  <DateField
                    value={exportToDate}
                    onChange={setExportToDate}
                    placeholder="YYYY-MM-DD"
                    maxDate={todayDate} // 👈 ADD — no future dates
                    minDate={
                      exportFromDate
                        ? new Date(exportFromDate + "T00:00:00")
                        : undefined
                    }
                  />

                  <Text
                    style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}
                  >
                    Exports every message sent between the two dates
                    (inclusive).
                  </Text>
                </View>
              )}

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: "#6b7280",
                  marginBottom: 8,
                  marginTop: 8,
                }}
              >
                FORMAT
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["csv", "json", "pdf"] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setExportFormat(f)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor:
                        exportFormat === f ? "#00529B" : "#f3f4f6",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: exportFormat === f ? "white" : "#374151",
                        textTransform: "uppercase",
                      }}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowExportModal(false);
                    resetExportDates(); // 👈 NEW
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: "#f3f4f6",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmExport}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: "#00529B",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "white",
                    }}
                  >
                    Export
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* ✅ Header menu modal */}
      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View
            style={{
              position: "absolute",
              top:
                Platform.OS === "android"
                  ? (StatusBar.currentHeight || 24) + 60
                  : isInDrawer
                    ? 60
                    : 100,
              right: 12,
              width: 240,
              backgroundColor: "white",
              borderRadius: 12,
              paddingVertical: 6,
              elevation: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
            }}
          >
            {[
              {
                icon: Mail,
                label: "Email Notifications",
                onPress: () => setShowEmailModal(true),
              },
              {
                icon: Users,
                label: "Group Members",
                onPress: () => setShowMembersSidebar(!showMembersSidebar),
              },
              {
                icon: Search,
                label: isSearching ? "Close Search" : "Search Messages",
                onPress: () => setIsSearching(!isSearching),
              },
              {
                icon: Settings,
                label: "Media Settings",
                onPress: () => setShowSettingsModal(true),
              },
              {
                icon: Download,
                label: "Export Chat",
                onPress: handleExport,
              },
              ...(isGroupAdmin && String(groupId).startsWith("GRP-")
                ? [
                    {
                      icon: UserPlus,
                      label: "Manage Members",
                      onPress: () => setShowManage(true),
                    },
                  ]
                : []),
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    setTimeout(item.onPress, 100);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <Icon size={18} color="#1e3a8a" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#0F172A",
                      fontWeight: "500",
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ================================================================
// ?? MEDIA SETTINGS MODAL - EXTRACTED OUTSIDE
// ================================================================
const MediaSettingsModal = React.memo(
  ({
    visible,
    onClose,
    selectedMic,
    selectedCamera,
    selectedSpeaker,
    setSelectedMic,
    setSelectedCamera,
    setSelectedSpeaker,
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
      if (visible && !loadDevicesCalled.current && Platform.OS === "web") {
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        setAudioOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Could not enumerate devices:", err);
      } finally {
        setLoadingDevices(false);
      }
    };

    const saveSelection = async (
      type: "mic" | "camera" | "speaker",
      deviceId: string,
    ) => {
      try {
        await AsyncStorage.setItem(`selected${type}`, deviceId);
        if (type === "mic") setSelectedMic(deviceId);
        if (type === "camera") setSelectedCamera(deviceId);
        if (type === "speaker") setSelectedSpeaker(deviceId);
      } catch (err) {
        console.error("Failed to save device selection:", err);
      }
    };

    if (!visible) return null;

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 500,
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#1f2937" }}
              >
                Media Settings
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loadingDevices ? (
              <ActivityIndicator size="large" color="#00529B" />
            ) : (
              <View style={{ gap: 16 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#3730a3",
                      marginBottom: 4,
                    }}
                  >
                    Microphone
                  </Text>
                  {audioDevices.length === 0 ? (
                    <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                      No microphone found
                    </Text>
                  ) : (
                    audioDevices.map((device) => (
                      <TouchableOpacity
                        key={device.deviceId}
                        onPress={() => saveSelection("mic", device.deviceId)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor:
                            selectedMic === device.deviceId
                              ? "#eff6ff"
                              : "transparent",
                          borderWidth: 1,
                          borderColor:
                            selectedMic === device.deviceId
                              ? "#00529B"
                              : "#e5e7eb",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ flex: 1, fontSize: 14, color: "#1f2937" }}
                        >
                          {device.label || `Mic ${device.deviceId.slice(-4)}`}
                        </Text>
                        {selectedMic === device.deviceId && (
                          <Check size={16} color="#00529B" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#3730a3",
                      marginBottom: 4,
                    }}
                  >
                    Camera
                  </Text>
                  {videoDevices.length === 0 ? (
                    <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                      No camera found
                    </Text>
                  ) : (
                    videoDevices.map((device) => (
                      <TouchableOpacity
                        key={device.deviceId}
                        onPress={() => saveSelection("camera", device.deviceId)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor:
                            selectedCamera === device.deviceId
                              ? "#eff6ff"
                              : "transparent",
                          borderWidth: 1,
                          borderColor:
                            selectedCamera === device.deviceId
                              ? "#00529B"
                              : "#e5e7eb",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ flex: 1, fontSize: 14, color: "#1f2937" }}
                        >
                          {device.label ||
                            `Camera ${device.deviceId.slice(-4)}`}
                        </Text>
                        {selectedCamera === device.deviceId && (
                          <Check size={16} color="#00529B" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#3730a3",
                      marginBottom: 4,
                    }}
                  >
                    Speaker
                  </Text>
                  {audioOutputDevices.length === 0 ? (
                    <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                      No speaker found
                    </Text>
                  ) : (
                    audioOutputDevices.map((device) => (
                      <TouchableOpacity
                        key={device.deviceId}
                        onPress={() =>
                          saveSelection("speaker", device.deviceId)
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor:
                            selectedSpeaker === device.deviceId
                              ? "#eff6ff"
                              : "transparent",
                          borderWidth: 1,
                          borderColor:
                            selectedSpeaker === device.deviceId
                              ? "#00529B"
                              : "#e5e7eb",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ flex: 1, fontSize: 14, color: "#1f2937" }}
                        >
                          {device.label ||
                            `Speaker ${device.deviceId.slice(-4)}`}
                        </Text>
                        {selectedSpeaker === device.deviceId && (
                          <Check size={16} color="#00529B" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: "#00529B",
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 16, fontWeight: "600" }}
                  >
                    Save & Close
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  },
);

MediaSettingsModal.displayName = "MediaSettingsModal";
