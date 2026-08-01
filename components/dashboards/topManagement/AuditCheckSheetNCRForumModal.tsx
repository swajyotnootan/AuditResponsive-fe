// src/components/modals/AuditCheckSheetNCRForumModal.tsx
import {
    AlertCircle,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Lock,
    MessageCircle,
    Search,
    Settings,
    Unlock,
    UserPlus,
    Users,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// import axios from 'axios';

// ============================================================
// Constants & Configuration
// ============================================================

const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:8080/api"
    : "http://localhost:8080/api"
  : "https://your-production-api.com/api";

// ============================================================
// Helper Functions
// ============================================================

const normalizeRole = (role: string): string => {
  if (!role) return "PARTICIPANT";
  const upper = role.toUpperCase();
  if (upper.includes("MASTER")) return "MASTER";
  if (upper.includes("AUDIT_MANAGER") || upper.includes("AUDIT MANAGER"))
    return "AUDIT_MANAGER";
  if (upper.includes("LEAD_AUDITOR") || upper.includes("LEAD AUDITOR"))
    return "LEAD_AUDITOR";
  if (upper.includes("TOP_MANAGEMENT") || upper.includes("TOP MANAGEMENT"))
    return "TOP_MANAGEMENT";
  if (upper.includes("AUDITOR")) return "AUDITOR";
  if (upper.includes("HOD")) return "HOD";
  if (upper.includes("AUDITEE")) return "AUDITEE";
  return "PARTICIPANT";
};

const getRoleDisplayName = (role: string): string => {
  const normalized = normalizeRole(role);
  const displayNames: Record<string, string> = {
    MASTER: "Master",
    AUDIT_MANAGER: "Audit Manager",
    LEAD_AUDITOR: "Lead Auditor",
    TOP_MANAGEMENT: "Top Management",
    AUDITOR: "Auditor",
    HOD: "HOD",
    AUDITEE: "Auditee",
    PARTICIPANT: "Participant",
  };
  return displayNames[normalized] || role || "Participant";
};

const getRolePermissions = (role: string) => {
  const normalized = normalizeRole(role);
  return {
    canModerate: ["MASTER", "AUDIT_MANAGER", "LEAD_AUDITOR"].includes(
      normalized,
    ),
    canAddMembers: ["MASTER", "AUDIT_MANAGER", "LEAD_AUDITOR"].includes(
      normalized,
    ),
    canRemoveMembers: ["MASTER", "AUDIT_MANAGER"].includes(normalized),
    canCreateNCR: ["AUDITOR", "LEAD_AUDITOR"].includes(normalized),
    canApproveNCR: ["MASTER", "AUDIT_MANAGER", "LEAD_AUDITOR"].includes(
      normalized,
    ),
    canRejectNCR: ["MASTER", "AUDIT_MANAGER", "LEAD_AUDITOR"].includes(
      normalized,
    ),
  };
};

const getParticipantRolePriority = (role: string): number => {
  const order: Record<string, number> = {
    MASTER: 10,
    AUDIT_MANAGER: 9,
    LEAD_AUDITOR: 8,
    TOP_MANAGEMENT: 7,
    AUDITOR: 6,
    HOD: 5,
    AUDITEE: 2,
    PARTICIPANT: 1,
  };
  return order[normalizeRole(role)] || 1;
};

// ============================================================
// Sub-Components
// ============================================================

const RoleBadge = ({ role }: { role: string }) => {
  const normalized = normalizeRole(role);
  const colorConfig: Record<string, string> = {
    MASTER: "bg-purple-100 text-purple-700",
    AUDIT_MANAGER: "bg-blue-100 text-blue-700",
    LEAD_AUDITOR: "bg-indigo-100 text-indigo-700",
    AUDITOR: "bg-cyan-100 text-cyan-700",
    HOD: "bg-orange-100 text-orange-700",
    AUDITEE: "bg-green-100 text-green-700",
    TOP_MANAGEMENT: "bg-amber-100 text-amber-700",
    PARTICIPANT: "bg-gray-100 text-gray-600",
  };
  const colorClass = colorConfig[normalized] || colorConfig.PARTICIPANT;

  return (
    <View className={`px-2 py-0.5 rounded-full ${colorClass}`}>
      <Text className="text-xs font-medium">{getRoleDisplayName(role)}</Text>
    </View>
  );
};

const MemberList = ({
  members,
  onAddMember,
  onRemoveMember,
  canAdd,
  canRemove,
  currentUser,
}: {
  members: any[];
  onAddMember: () => void;
  onRemoveMember: (member: any) => void;
  canAdd: boolean;
  canRemove: boolean;
  currentUser: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  const displayMembers = expanded ? members : members.slice(0, 5);

  if (members.length === 0) return null;

  return (
    <View className="px-4 pt-3 mt-3 border-t border-gray-100">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between w-full"
      >
        <View className="flex-row items-center gap-1">
          <Users size={12} color="#6b7280" />
          <Text className="text-xs text-gray-500">
            Participants ({members.length})
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={12} color="#6b7280" />
        ) : (
          <ChevronDown size={12} color="#6b7280" />
        )}
      </TouchableOpacity>

      {expanded && (
        <ScrollView
          className="mt-2 max-h-48"
          showsVerticalScrollIndicator={true}
        >
          {displayMembers.map((member, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-1"
            >
              <View className="flex-row items-center flex-1 gap-2">
                <View className="items-center justify-center w-6 h-6 bg-gray-200 rounded-full">
                  <Text className="text-xs font-medium text-gray-600">
                    {member.name?.charAt(0) || member.email?.charAt(0) || "?"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-700" numberOfLines={1}>
                    {member.name || member.email}
                  </Text>
                  <Text className="text-[10px] text-gray-400" numberOfLines={1}>
                    {member.email}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <RoleBadge role={member.role} />
                {canRemove &&
                  member.role !== "MASTER" &&
                  member.email !== currentUser?.email && (
                    <TouchableOpacity
                      onPress={() => onRemoveMember(member)}
                      className="p-1"
                    >
                      <X size={12} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {canAdd && (
        <TouchableOpacity
          onPress={onAddMember}
          className="mt-2 py-1.5 border border-blue-200 rounded-lg bg-transparent flex-row items-center justify-center gap-1"
        >
          <UserPlus size={12} color="#2563eb" />
          <Text className="text-xs text-blue-600">Add Participant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const AddMemberModal = ({
  isOpen,
  onClose,
  onAdd,
  existingMembers,
  allUsers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (users: string[]) => void;
  existingMembers: any[];
  allUsers: any[];
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const availableUsers = allUsers.filter(
    (user) =>
      !existingMembers.some((m) => m.email === user.email) &&
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      await onAdd(selectedUsers.map((u) => u.email));
      onClose();
      setSelectedUsers([]);
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="items-center justify-center flex-1 p-4 bg-black/50">
        <View className="bg-white rounded-xl w-full max-w-md max-h-[80vh]">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="font-semibold text-gray-800">
              Add Participants
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="p-4">
            <View className="flex-row items-center px-3 mb-4 border border-gray-200 rounded-lg bg-gray-50">
              <Search size={16} color="#9ca3af" />
              <TextInput
                className="flex-1 py-2 pl-2 text-sm text-gray-800"
                placeholder="Search users..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <ScrollView
              className="max-h-64"
              showsVerticalScrollIndicator={true}
            >
              {availableUsers.length === 0 ? (
                <Text className="py-4 text-sm text-center text-gray-400">
                  No users available to add
                </Text>
              ) : (
                availableUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id || user.email}
                    onPress={() => {
                      if (selectedUsers.some((u) => u.email === user.email)) {
                        setSelectedUsers(
                          selectedUsers.filter((u) => u.email !== user.email),
                        );
                      } else {
                        setSelectedUsers([...selectedUsers, user]);
                      }
                    }}
                    className="flex-row items-center gap-3 p-2 rounded-lg"
                  >
                    <View
                      className={`w-5 h-5 rounded border-2 items-center justify-center ${
                        selectedUsers.some((u) => u.email === user.email)
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedUsers.some((u) => u.email === user.email) && (
                        <Text className="text-xs text-white">✓</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-700">
                        {user.name || user.email}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {user.email}
                      </Text>
                    </View>
                    {user.role && <RoleBadge role={user.role} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View className="flex-row justify-end gap-2 p-4 border-t border-gray-200">
            <TouchableOpacity onPress={onClose} className="px-4 py-2">
              <Text className="text-sm text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedUsers.length === 0 || loading}
              className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg disabled:opacity-50"
            >
              {loading && <ActivityIndicator size="small" color="#ffffff" />}
              <Text className="text-sm text-white">
                Add ({selectedUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Placeholder ForumThreadView - You'll need to implement this or import from your forum module
const ForumThreadView = ({
  groupId,
  groupName,
  isInDrawer,
  setForumDrawerOpen,
  username,
  groupDescription,
  currentUser,
  allUsers,
  onBack,
  memberEmails,
}: any) => {
  return (
    <View className="flex-1 p-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <MessageCircle size={20} color="#3b82f6" />
          <Text className="font-semibold text-gray-900">Forum Thread</Text>
        </View>
        <Text className="text-xs text-gray-500">{groupId}</Text>
      </View>
      <View className="p-3 mb-4 rounded-lg bg-blue-50">
        <Text className="text-sm text-gray-700">{groupDescription}</Text>
      </View>
      <View className="items-center justify-center flex-1">
        <Text className="text-sm text-gray-500">
          Forum content would render here
        </Text>
        <Text className="mt-2 text-xs text-gray-400">Group: {groupId}</Text>
        <Text className="text-xs text-gray-400">
          Members: {memberEmails?.length || 0}
        </Text>
      </View>
    </View>
  );
};

// ============================================================
// Main Component
// ============================================================

interface AuditCheckSheetNCRForumModalProps {
  auditId: string | number;
  auditNumber: string;
  auditTitle?: string;
  auditStatus?: string;
  auditType?: string;
  department?: string;
  auditorId?: string | number;
  auditorName?: string;
  auditeeId?: string | number;
  auditeeName?: string;
  hodEmail?: string;
  hodName?: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  allUsers?: any[];
  memberEmails?: string[];
  onNCRCreated?: () => void;
  onNCRUpdated?: () => void;
}

const AuditCheckSheetNCRForumModal = ({
  auditId,
  auditNumber,
  auditTitle,
  auditStatus,
  auditType,
  department,
  auditorId,
  auditorName,
  auditeeId,
  auditeeName,
  hodEmail,
  hodName,
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  memberEmails = [],
  onNCRCreated,
  onNCRUpdated,
}: AuditCheckSheetNCRForumModalProps) => {
  const [loading, setLoading] = useState(false);
  const [forumReady, setForumReady] = useState(false);
  const [forumGroupId, setForumGroupId] = useState<string | null>(null);
  const [forumMembers, setForumMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [forumSettings, setForumSettings] = useState({
    notificationsEnabled: true,
    isLocked: false,
  });

  const user = currentUser || {
    email: "user@example.com",
    name: "Unknown",
    id: null,
    role: "AUDITEE",
  };
  const userRole = user.role || "PARTICIPANT";
  const permissions = getRolePermissions(userRole);

  // Get participants list
  const getParticipantsList = useCallback(() => {
    const participants: any[] = [];
    const addedEmails = new Set<string>();

    const addParticipant = (
      userId: any,
      email: string,
      name: string,
      role: string,
    ) => {
      if (!email || addedEmails.has(email)) return;
      addedEmails.add(email);
      participants.push({
        id: userId,
        email: email,
        name: name || email.split("@")[0],
        role: role || "PARTICIPANT",
      });
    };

    // Add HOD
    if (hodEmail) {
      const hod = allUsers.find((u) => u.email === hodEmail);
      addParticipant(hod?.id, hodEmail, hod?.name || hodName, "HOD");
    }

    // Add Auditor
    if (auditorId) {
      let auditorUser = allUsers.find(
        (u) => Number(u.id) === Number(auditorId),
      );
      if (!auditorUser) {
        auditorUser = allUsers.find((u) => String(u.id) === String(auditorId));
      }
      if (auditorUser?.email) {
        addParticipant(
          auditorUser.id,
          auditorUser.email,
          auditorUser.name,
          "AUDITOR",
        );
      } else if (auditorName) {
        addParticipant(
          auditorId,
          auditorName.includes("@")
            ? auditorName
            : `${auditorName}@example.com`,
          auditorName,
          "AUDITOR",
        );
      }
    }

    // Add Auditee
    if (auditeeId) {
      let auditeeUser = allUsers.find(
        (u) => Number(u.id) === Number(auditeeId),
      );
      if (!auditeeUser) {
        auditeeUser = allUsers.find((u) => String(u.id) === String(auditeeId));
      }
      if (auditeeUser?.email) {
        addParticipant(
          auditeeUser.id,
          auditeeUser.email,
          auditeeUser.name,
          "AUDITEE",
        );
      } else if (auditeeName) {
        addParticipant(
          auditeeId,
          auditeeName.includes("@")
            ? auditeeName
            : `${auditeeName}@example.com`,
          auditeeName,
          "AUDITEE",
        );
      }
    }

    // Add current user if not already added
    if (user?.email && !addedEmails.has(user.email)) {
      addParticipant(user.id, user.email, user.name, user.role);
    }

    return participants.sort(
      (a, b) =>
        getParticipantRolePriority(b.role) - getParticipantRolePriority(a.role),
    );
  }, [
    auditorId,
    auditorName,
    auditeeId,
    auditeeName,
    hodEmail,
    hodName,
    allUsers,
    user,
  ]);

  // Get participant emails for forum creation
  const getParticipantEmails = useCallback(() => {
    const emails = new Set<string>();

    console.log("📧 [FORUM] === START getParticipantEmails ===");
    console.log("📧 [FORUM] Input data:", {
      auditorId,
      auditorName,
      auditeeId,
      auditeeName,
      hodEmail,
      userEmail: user?.email,
      allUsersCount: allUsers.length,
    });

    // Add current user
    if (user?.email) {
      emails.add(user.email);
      console.log("✅ Added current user:", user.email);
    }

    // Add AUDITOR
    if (auditorId) {
      let auditorUser = allUsers.find(
        (u) => Number(u.id) === Number(auditorId),
      );
      if (!auditorUser) {
        auditorUser = allUsers.find((u) => String(u.id) === String(auditorId));
      }
      if (auditorUser?.email) {
        emails.add(auditorUser.email);
        console.log("✅ Added Auditor by ID:", auditorUser.email);
      } else {
        console.log("⚠️ Auditor not found for ID:", auditorId);
      }
    }

    if (
      auditorName &&
      auditorName !== "undefined" &&
      !emails.has(auditorName)
    ) {
      const auditorByName = allUsers.find(
        (u) =>
          u.name?.toLowerCase().includes(auditorName.toLowerCase()) ||
          u.email?.toLowerCase().includes(auditorName.toLowerCase()),
      );
      if (auditorByName?.email) {
        emails.add(auditorByName.email);
        console.log("✅ Added Auditor by name:", auditorByName.email);
      } else if (auditorName.includes("@")) {
        emails.add(auditorName);
        console.log("✅ Added Auditor email from string:", auditorName);
      }
    }

    // Add AUDITEE
    if (auditeeId) {
      let auditeeUser = allUsers.find(
        (u) => Number(u.id) === Number(auditeeId),
      );
      if (!auditeeUser) {
        auditeeUser = allUsers.find((u) => String(u.id) === String(auditeeId));
      }
      if (auditeeUser?.email) {
        emails.add(auditeeUser.email);
        console.log("✅ Added Auditee by ID:", auditeeUser.email);
      } else {
        console.log("⚠️ Auditee not found for ID:", auditeeId);
      }
    }

    if (
      auditeeName &&
      auditeeName !== "undefined" &&
      !emails.has(auditeeName)
    ) {
      const auditeeByName = allUsers.find(
        (u) =>
          u.name?.toLowerCase().includes(auditeeName.toLowerCase()) ||
          u.email?.toLowerCase().includes(auditeeName.toLowerCase()),
      );
      if (auditeeByName?.email) {
        emails.add(auditeeByName.email);
        console.log("✅ Added Auditee by name:", auditeeByName.email);
      } else if (auditeeName.includes("@")) {
        emails.add(auditeeName);
        console.log("✅ Added Auditee email from string:", auditeeName);
      }
    }

    // Add HOD
    if (hodEmail && hodEmail !== "undefined" && hodEmail !== "null") {
      emails.add(hodEmail);
      console.log("✅ Added HOD email:", hodEmail);
    }

    // Add memberEmails
    if (memberEmails && Array.isArray(memberEmails)) {
      memberEmails.forEach((email) => {
        if (email && email !== "undefined" && email !== "null") {
          emails.add(email);
          console.log("✅ Added from memberEmails:", email);
        }
      });
    }

    const result = Array.from(emails);
    console.log("📧 [FORUM] Final participant emails:", result);
    return result;
  }, [
    auditorId,
    auditorName,
    auditeeId,
    auditeeName,
    hodEmail,
    allUsers,
    user,
    memberEmails,
  ]);

  // Initialize forum
  const initializeAuditForum = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const participants = getParticipantsList();
      setParticipantsList(participants);

      const groupId = `AUDIT-${auditId}`;
      console.log("🔑 Forum Group ID:", groupId);
      setForumGroupId(groupId);

      const participantEmails = getParticipantEmails();

      try {
        // await axios.post(
        //   `${API_BASE_URL}/forum/8d/groups`,
        //   {
        //     groupId: groupId,
        //     groupName: `Audit #${auditNumber} Discussion`,
        //     description: `Discussion forum for Audit ${auditNumber}`,
        //     createdBy: user?.email,
        //     members: participantEmails,
        //   },
        //   { withCredentials: true }
        // );
        console.log("✅ 8D group created");
      } catch (groupError: any) {
        console.log("Group may already exist:", groupError?.message);
      }

      setForumMembers(participantEmails);
      setForumReady(true);
    } catch (error: any) {
      console.error("Error initializing audit forum:", error);
      setError(error?.message || "Failed to initialize forum");
      setForumReady(true);
    } finally {
      setLoading(false);
    }
  }, [auditId, auditNumber, getParticipantsList, getParticipantEmails, user]);

  // Handle adding members
  const handleAddMembers = async (newMemberEmails: string[]) => {
    setForumMembers((prev) => [...new Set([...prev, ...newMemberEmails])]);
    const updatedParticipants = getParticipantsList();
    setParticipantsList(updatedParticipants);
    Alert.alert("Success", `${newMemberEmails.length} participant(s) added`);
    setShowAddMembers(false);
  };

  // Handle removing member
  const handleRemoveMember = (member: any) => {
    if (!permissions.canRemoveMembers) return;

    Alert.alert(
      "Remove Member",
      `Remove ${member.name || member.email} from the forum?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setForumMembers((prev) => prev.filter((m) => m !== member.email));
            setParticipantsList((prev) =>
              prev.filter((p) => p.email !== member.email),
            );
            Alert.alert("Info", `${member.name || member.email} removed`);
          },
        },
      ],
    );
  };

  // Toggle forum lock
  const toggleForumLock = () => {
    setForumSettings((prev) => ({ ...prev, isLocked: !prev.isLocked }));
    Alert.alert(
      "Info",
      forumSettings.isLocked ? "Forum unlocked" : "Forum locked",
    );
  };

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 [MODAL DEBUG] Forum Modal Opened:", {
        auditId,
        auditNumber,
        auditorId,
        auditorName,
        auditeeId,
        auditeeName,
        hodEmail,
        hodName,
        memberEmails,
        userEmail: user?.email,
        allUsersCount: allUsers.length,
      });
    }
  }, [isOpen]);

  // Initialize on mount
  useEffect(() => {
    if (isOpen && auditId) {
      initializeAuditForum();
    }
  }, [isOpen, auditId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50" />

        {/* Drawer - Right Side */}
        <SafeAreaView className="absolute top-0 right-0 h-full w-[90%] md:w-[60%] bg-white shadow-2xl">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <View className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <View className="flex-row items-center flex-1 gap-2">
                  <TouchableOpacity onPress={onClose} className="p-1.5">
                    <ArrowLeft size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <MessageCircle size={16} color="#3b82f6" />
                      <Text
                        className="text-sm font-semibold text-gray-900"
                        numberOfLines={1}
                      >
                        Audit Discussion
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className="text-[10px] font-mono text-gray-500">
                        {auditNumber}
                      </Text>
                      {auditStatus && (
                        <View
                          className={`px-1.5 py-0.5 rounded-full ${
                            auditStatus === "APPROVED"
                              ? "bg-green-100"
                              : auditStatus === "REJECTED"
                                ? "bg-red-100"
                                : auditStatus === "IN_PROGRESS"
                                  ? "bg-blue-100"
                                  : "bg-yellow-100"
                          }`}
                        >
                          <Text
                            className={`text-[10px] ${
                              auditStatus === "APPROVED"
                                ? "text-green-700"
                                : auditStatus === "REJECTED"
                                  ? "text-red-700"
                                  : auditStatus === "IN_PROGRESS"
                                    ? "text-blue-700"
                                    : "text-yellow-700"
                            }`}
                          >
                            {auditStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center gap-1">
                  {permissions.canAddMembers && (
                    <TouchableOpacity
                      onPress={() => setShowAddMembers(true)}
                      className="p-1.5"
                    >
                      <UserPlus size={16} color="#6b7280" />
                    </TouchableOpacity>
                  )}

                  {permissions.canModerate && (
                    <>
                      <TouchableOpacity
                        onPress={toggleForumLock}
                        className="p-1.5"
                      >
                        {forumSettings.isLocked ? (
                          <Lock size={16} color="#6b7280" />
                        ) : (
                          <Unlock size={16} color="#6b7280" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity className="p-1.5">
                        <Settings size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity onPress={onClose} className="p-1.5">
                    <X size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Participants List */}
              <MemberList
                members={participantsList}
                onAddMember={() => setShowAddMembers(true)}
                onRemoveMember={handleRemoveMember}
                canAdd={permissions.canAddMembers}
                canRemove={permissions.canRemoveMembers}
                currentUser={user}
              />

              {/* Loading State */}
              {loading && (
                <View className="items-center justify-center flex-1">
                  <View className="items-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="mt-3 text-xs text-gray-500">
                      Loading discussions...
                    </Text>
                  </View>
                </View>
              )}

              {/* Error State */}
              {error && (
                <View className="items-center justify-center flex-1 p-4">
                  <View className="items-center max-w-xs">
                    <AlertCircle size={32} color="#ef4444" />
                    <Text className="mt-3 mb-1 text-sm font-medium text-gray-800">
                      Failed to load forum
                    </Text>
                    <Text className="mb-3 text-xs text-center text-gray-500">
                      {error}
                    </Text>
                    <TouchableOpacity
                      onPress={initializeAuditForum}
                      className="px-3 py-1.5 bg-blue-600 rounded-lg"
                    >
                      <Text className="text-xs text-white">Try Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Forum Content */}
              {!loading && !error && forumReady && forumGroupId && (
                <View className="flex-1">
                  <ForumThreadView
                    groupId={forumGroupId}
                    groupName={`${auditNumber}`}
                    isInDrawer={true}
                    setForumDrawerOpen={onClose}
                    username={user?.email}
                    groupDescription={`Discussion forum for Audit ${auditNumber}\n\nAudit Type: ${auditType || "Internal Audit"}\nDepartment: ${department || "General"}`}
                    currentUser={user}
                    allUsers={allUsers}
                    onBack={onClose}
                    memberEmails={forumMembers}
                  />
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        onAdd={handleAddMembers}
        existingMembers={participantsList}
        allUsers={allUsers}
      />
    </>
  );
};

export default AuditCheckSheetNCRForumModal;
