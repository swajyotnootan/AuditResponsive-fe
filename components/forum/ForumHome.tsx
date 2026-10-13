// components/forum/ForumHome.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { useEnterpriseContext } from "@/hooks/useEnterpriseContext";
import { Ionicons } from "@expo/vector-icons";
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
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteGroup as deleteGroupAPI,
  fetchUser8DGroups,
  leaveGroup,
  renameGroup as renameGroupAPI,
} from "./Api/forumapi";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import CreateGroupModal from "./CreateGroupModal";
import EditGroupAppearanceModal from "./EditGroupAppearanceModal";
import ForumThreadView from "./ForumThreadView";
import GroupRowMenu, { MenuItem } from "./GroupRowMenu";
import ManageGroupMembersModal from "./ManageGroupMembersModal";
import RenameGroupModal from "./RenameGroupModal";

/* ─── Lighter tokens ───────────────────────────────────────── */
const C = {
  brand: "#00529B",
  bg: "#FAFBFD", // even lighter than before
  surface: "#FFFFFF",
  surfaceMuted: "#F4F7FB",
  border: "#EFF3F8", // very soft
  borderSoft: "#F5F8FC",
  text: "#1E293B",
  textSub: "#64748B",
  textFaint: "#9AA7B8",
  success: "#22C55E",
  online: "#22C55E",
  warn: "#B45309",
  warnTint: "#FEF3C7",
  danger: "#DC2626",
  plantTint: "#EEF2FF",
  plantText: "#4338CA",
  companyTint: "#EFF6FF",
  companyText: "#1E40AF",
  accentTint: "#EAF2FB",
};

/* ─── User helpers (same as before) ─────────────────────────── */
function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "?";
  const s = String(nameOrEmail).trim();
  if (!s) return "?";
  if (s.includes("@")) return s[0].toUpperCase();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function getDisplayName(user: any): string {
  if (!user) return "You";
  return (
    user.name ||
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    user.email?.split("@")[0] ||
    "You"
  );
}
function getAvatarUrl(user: any): string | null {
  if (!user) return null;
  return (
    user.profilePhoto ||
    user.avatar ||
    user.avatarUrl ||
    user.photoUrl ||
    user.imageUrl ||
    null
  );
}

/* ─── Row entrance ──────────────────────────────────────────── */
function AnimatedRow({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    const delay = Math.min(index * 35, 400);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/* ─── Group icon (photo → emoji pulse → ionicon) ────────────── */
function AnimatedGroupIcon({
  group,
  fallbackIcon,
  fallbackTint,
  fallbackColor,
}: {
  group: any;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  fallbackTint: string;
  fallbackColor: string;
}) {
  const photoUrl = group?.photoUrl || group?.avatarUrl || null;
  const emoji = group?.emoji || null;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!emoji || photoUrl) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [emoji, photoUrl]);

  if (photoUrl) {
    return (
      <View style={[styles.rowIcon, styles.rowIconPhoto]}>
        <Image source={{ uri: photoUrl }} style={styles.rowIconImg} />
      </View>
    );
  }
  if (emoji) {
    return (
      <View style={[styles.rowIcon, { backgroundColor: fallbackTint }]}>
        <Animated.Text style={{ fontSize: 22, transform: [{ scale }] }}>
          {emoji}
        </Animated.Text>
      </View>
    );
  }
  return (
    <View style={[styles.rowIcon, { backgroundColor: fallbackTint }]}>
      <Ionicons name={fallbackIcon} size={20} color={fallbackColor} />
    </View>
  );
}

/* ─── Online avatar stack ───────────────────────────────────── */
function OnlineStack({ members }: { members: any[] }) {
  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;

  if (shown.length === 0) return null;

  return (
    <View style={styles.onlineStack}>
      {shown.map((m, i) => {
        const url = getAvatarUrl(m);
        const initials = getInitials(getDisplayName(m));
        return (
          <View
            key={m.email || m.id || i}
            style={[
              styles.onlineStackItem,
              { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i },
            ]}
          >
            {url ? (
              <Image source={{ uri: url }} style={styles.onlineStackImg} />
            ) : (
              <View style={styles.onlineStackInitials}>
                <Text style={styles.onlineStackInitialsText}>{initials}</Text>
              </View>
            )}
            <View style={styles.onlineStackDot} />
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[styles.onlineStackItem, styles.onlineStackMore]}>
          <Text style={styles.onlineStackMoreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface ForumHomeProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  allUsers: any[];
  plantId?: string | number | null;
  plantName?: string | null;
  companyId?: string | number | null;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function ForumHome({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  plantId,
  plantName,
  companyId,
}: ForumHomeProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [overrideCompanyId, setOverrideCompanyId] = useState<string | null>(
    null,
  );

  const {
    companyId: resolvedCompanyId,
    companyName,
    companies: availableCompanies,
    plants: availablePlants,
  } = useEnterpriseContext(
    overrideCompanyId ?? companyId ?? currentUser?.companyId ?? null,
  );

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [manageGroup, setManageGroup] = useState<any>(null);
  const [menuGroup, setMenuGroup] = useState<any>(null);
  const [appearanceGroup, setAppearanceGroup] = useState<any>(null);

  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const userEmail = currentUser?.email || "";
  const displayName = getDisplayName(currentUser);
  const initials = getInitials(displayName);
  const avatarUrl = getAvatarUrl(currentUser);

  const loadGroups = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const data = await fetchUser8DGroups(userEmail, plantId);
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load groups:", e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail, plantId]);

  useEffect(() => {
    if (isOpen) loadGroups();
  }, [isOpen, loadGroups]);

  useEffect(() => {
    if (!isOpen || !userEmail) return;

    const runSync = async () => {
      try {
        const url = `${API_BASE_URL}/api/forum/8d/sync-delivered?requester=${encodeURIComponent(userEmail)}`;
        const res = await fetch(url, {});
        if (!res.ok) return;
        const data = await res.json();
        if (data?.marked > 0) loadGroups();
      } catch {
        /* silent */
      }
    };

    runSync();
    const interval = setInterval(runSync, 10000);
    return () => clearInterval(interval);
  }, [isOpen, userEmail, loadGroups]);

  const { generalGroups, schedulePlanGroups, auditGroups, customGroups } =
    useMemo(() => {
      const general: any[] = [];
      const schedule: any[] = [];
      const audit: any[] = [];
      const cust: any[] = [];
      for (const g of groups) {
        const id = String(g.groupId || "");
        if (id.startsWith("AUDIT-general-forum-")) general.push(g);
        else if (id.startsWith("AUDIT-schedule-plan-")) schedule.push(g);
        else if (id.startsWith("AUDIT-")) audit.push(g);
        else if (id.startsWith("GRP-")) cust.push(g);
        else audit.push(g);
      }
      return {
        generalGroups: general,
        schedulePlanGroups: schedule,
        auditGroups: audit,
        customGroups: cust,
      };
    }, [groups]);

  const matches = (g: any) =>
    !search.trim() ||
    g.groupName?.toLowerCase().includes(search.toLowerCase()) ||
    g.groupId?.toLowerCase().includes(search.toLowerCase());

  /* ─── ACTIONS ───────────────────────────────────────────── */
  const handleLeaveGroup = (g: any) => {
    const doLeave = async () => {
      try {
        setGroups((prev) => prev.filter((x) => x.groupId !== g.groupId));
        setMenuGroup(null);
        const res = await leaveGroup(g.groupId, userEmail);
        console.log("✅ Leave API success:", res);
        await loadGroups();
      } catch (e: any) {
        await loadGroups();
        Alert.alert("Couldn't leave group", e?.message || "Please try again.");
      }
    };

    if (Platform.OS === "web") {
      const ok = window.confirm(
        `Leave "${g.groupName || g.groupId}"?\n\nYou will no longer see messages from this group.`,
      );
      if (ok) doLeave();
    } else {
      Alert.alert(
        "Leave group?",
        `You will no longer see messages from "${g.groupName || g.groupId}".`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: doLeave },
        ],
      );
    }
  };

  const handleRenameGroup = (g: any) => setRenameTarget(g);
  const handleDeleteGroup = (g: any) => setDeleteTarget(g);

  const buildMenuItems = (g: any): MenuItem[] => {
    const id = String(g.groupId || "");
    const isSystem =
      id === "general-forum" ||
      id.startsWith("general-forum-") ||
      id.startsWith("schedule-plan-") ||
      id.startsWith("AUDIT-") ||
      id.startsWith("8D-");

    if (isSystem) {
      return [
        {
          icon: "people-outline",
          label: "View Members",
          sublabel: "Managed automatically by the system",
          onPress: () => setActiveGroup(g),
        },
      ];
    }

    const isAdmin = g.isAdmin === true;
    const items: MenuItem[] = [];

    if (isAdmin) {
      items.push({
        icon: "color-palette-outline",
        label: "Edit Group Profile",
        sublabel: "Change photo, emoji or description",
        onPress: () => setAppearanceGroup(g),
      });
      items.push({
        icon: "people-outline",
        label: "Manage Members",
        sublabel: "Add, remove, or promote members",
        onPress: () => setManageGroup(g),
      });
      items.push({
        icon: "create-outline",
        label: "Rename Group",
        sublabel: "Change the group name",
        onPress: () => handleRenameGroup(g),
      });
      items.push({
        icon: "trash-outline",
        label: "Delete Group",
        sublabel: "Permanently delete for everyone",
        danger: true,
        onPress: () => handleDeleteGroup(g),
      });
    } else {
      items.push({
        icon: "people-outline",
        label: "View Members",
        sublabel: "See who's in this group",
        onPress: () => setManageGroup(g),
      });
      items.push({
        icon: "exit-outline",
        label: "Leave Group",
        sublabel: "You will stop receiving messages",
        danger: true,
        onPress: () => handleLeaveGroup(g),
      });
    }

    return items;
  };

  /* ─── Chat inside drawer ────────────────────────────────── */
  if (activeGroup) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity
            style={styles.drawerOutside}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.drawer}>
            <ForumThreadView
              key={activeGroup.groupId}
              groupId={activeGroup.groupId}
              groupName={activeGroup.groupName}
              groupAdminEmail={activeGroup.adminEmail}
              currentUser={currentUser}
              allUsers={allUsers}
              username={userEmail}
              memberEmails={activeGroup.members || []}
              plantId={activeGroup.plantId ?? null}
              plantName={activeGroup.plantName ?? null}
              onBack={async () => {
                setActiveGroup(null);
                await loadGroups();
              }}
              onSeen={async () => {
                await loadGroups();
              }}
              isInDrawer={true}
            />
          </View>
        </View>
      </Modal>
    );
  }

  const totalUnread = groups.reduce(
    (sum, g) => sum + (typeof g.unreadCount === "number" ? g.unreadCount : 0),
    0,
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.drawerBackdrop}>
        <TouchableOpacity
          style={styles.drawerOutside}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.drawer}>
          {/* Header — user identity */}
          <View
            style={[
              styles.header,
              {
                paddingTop:
                  Platform.OS === "android"
                    ? (StatusBar.currentHeight || 24) + 8
                    : 16,
              },
            ]}
          >
            <View style={styles.headerBrand}>
              <View style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {companyName ? companyName : "Signed in"}
                  {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowHeaderMenu(true)}
                style={styles.headerIconBtn}
                hitSlop={10}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipsis-vertical" size={19} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={styles.headerIconBtn}
                hitSlop={10}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={C.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search groups"
                placeholderTextColor={C.textFaint}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  style={styles.searchClear}
                >
                  <Ionicons name="close-circle" size={16} color={C.textFaint} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={C.brand} />
                <Text style={styles.loadingText}>Loading groups…</Text>
              </View>
            ) : (
              <>
                {generalGroups.filter(matches).length > 0 && (
                  <>
                    <SectionHeader
                      label="General"
                      hint={plantName || undefined}
                      count={generalGroups.filter(matches).length}
                    />
                    <View style={styles.card}>
                      {generalGroups.filter(matches).map((g, i, arr) => (
                        <AnimatedRow key={g.groupId} index={i}>
                          <GroupRow
                            group={g}
                            companyName={companyName}
                            isLast={i === arr.length - 1}
                            onPress={() => setActiveGroup(g)}
                            onMenuPress={() => setMenuGroup(g)}
                          />
                        </AnimatedRow>
                      ))}
                    </View>
                  </>
                )}

                {schedulePlanGroups.filter(matches).length > 0 && (
                  <>
                    <SectionHeader
                      label="Schedule Plan"
                      count={schedulePlanGroups.filter(matches).length}
                    />
                    <View style={styles.card}>
                      {schedulePlanGroups.filter(matches).map((g, i, arr) => (
                        <AnimatedRow key={g.groupId} index={i}>
                          <GroupRow
                            group={g}
                            companyName={companyName}
                            isLast={i === arr.length - 1}
                            onPress={() => setActiveGroup(g)}
                            onMenuPress={() => setMenuGroup(g)}
                          />
                        </AnimatedRow>
                      ))}
                    </View>
                  </>
                )}

                {auditGroups.filter(matches).length > 0 && (
                  <>
                    <SectionHeader
                      label="Audits & NCRs"
                      count={auditGroups.filter(matches).length}
                    />
                    <View style={styles.card}>
                      {auditGroups.filter(matches).map((g, i, arr) => (
                        <AnimatedRow key={g.groupId} index={i}>
                          <GroupRow
                            group={g}
                            companyName={companyName}
                            isLast={i === arr.length - 1}
                            onPress={() => setActiveGroup(g)}
                            onMenuPress={() => setMenuGroup(g)}
                          />
                        </AnimatedRow>
                      ))}
                    </View>
                  </>
                )}

                <SectionHeader
                  label="My Groups"
                  count={customGroups.filter(matches).length}
                />
                {customGroups.filter(matches).length === 0 ? (
                  <TouchableOpacity
                    onPress={() => setShowCreate(true)}
                    style={styles.emptyCard}
                    activeOpacity={0.75}
                  >
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="people" size={22} color={C.brand} />
                    </View>
                    <Text style={styles.emptyTitle}>
                      Create your first group
                    </Text>
                    <Text style={styles.emptySub}>
                      Chat with teammates outside audits
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.card}>
                    {customGroups.filter(matches).map((g, i, arr) => (
                      <AnimatedRow key={g.groupId} index={i}>
                        <GroupRow
                          group={g}
                          companyName={companyName}
                          isLast={i === arr.length - 1}
                          onPress={() => setActiveGroup(g)}
                          onMenuPress={() => setMenuGroup(g)}
                        />
                      </AnimatedRow>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Modals */}
          <CreateGroupModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            currentUser={currentUser}
            allUsers={allUsers}
            plantId={plantId}
            plantName={plantName}
            companyId={resolvedCompanyId}
            companyName={companyName}
            availableCompanies={availableCompanies}
            availablePlants={availablePlants}
            onCompanyChange={(id) => setOverrideCompanyId(id)}
            onCreated={async (newGroup) => {
              setShowCreate(false);
              await loadGroups();
              setActiveGroup(newGroup);
            }}
          />

          <ManageGroupMembersModal
            isOpen={!!manageGroup}
            onClose={() => setManageGroup(null)}
            group={manageGroup}
            currentUser={currentUser}
            allUsers={allUsers}
            isAdmin={manageGroup?.isAdmin === true}
            onUpdated={async () => {
              setManageGroup(null);
              await loadGroups();
            }}
          />

          {/* NEW — Edit group appearance (admin only) */}
          <EditGroupAppearanceModal
            visible={!!appearanceGroup}
            onClose={() => setAppearanceGroup(null)}
            group={appearanceGroup}
            currentUser={currentUser}
            onSaved={async () => {
              setAppearanceGroup(null);
              await loadGroups();
            }}
          />

          {renameTarget && (
            <RenameGroupModal
              visible={!!renameTarget}
              onClose={() => setRenameTarget(null)}
              currentName={renameTarget.groupName || renameTarget.groupId}
              onSubmit={async (newName) => {
                await renameGroupAPI(renameTarget.groupId, newName, userEmail);
                await loadGroups();
              }}
            />
          )}

          {deleteTarget && (
            <ConfirmDeleteModal
              visible={!!deleteTarget}
              onClose={() => setDeleteTarget(null)}
              groupName={deleteTarget.groupName || deleteTarget.groupId}
              confirmWord="DELETE"
              onConfirm={async () => {
                await deleteGroupAPI(deleteTarget.groupId, userEmail);
                setGroups((prev) =>
                  prev.filter((x) => x.groupId !== deleteTarget.groupId),
                );
                await loadGroups();
              }}
            />
          )}

          {menuGroup && (
            <GroupRowMenu
              visible={!!menuGroup}
              onClose={() => setMenuGroup(null)}
              title={menuGroup.groupName || menuGroup.groupId}
              items={buildMenuItems(menuGroup)}
            />
          )}

          {showHeaderMenu && (
            <Modal
              visible={showHeaderMenu}
              transparent
              animationType="fade"
              onRequestClose={() => setShowHeaderMenu(false)}
            >
              <Pressable
                style={styles.headerMenuBackdrop}
                onPress={() => setShowHeaderMenu(false)}
              >
                <View style={styles.headerMenuSheet}>
                  <TouchableOpacity
                    style={styles.headerMenuRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowHeaderMenu(false);
                      setTimeout(() => setShowCreate(true), 100);
                    }}
                  >
                    <View style={styles.headerMenuIcon}>
                      <Ionicons name="add" size={20} color={C.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.headerMenuLabel}>Create Group</Text>
                      <Text style={styles.headerMenuSub}>
                        Start a new conversation
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={C.textFaint}
                    />
                  </TouchableOpacity>

                  <View style={styles.headerMenuDivider} />

                  <TouchableOpacity
                    style={styles.headerMenuRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowHeaderMenu(false);
                      loadGroups();
                    }}
                  >
                    <View style={styles.headerMenuIcon}>
                      <Ionicons name="refresh" size={18} color={C.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.headerMenuLabel}>Refresh</Text>
                      <Text style={styles.headerMenuSub}>
                        Reload groups and unread counts
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={C.textFaint}
                    />
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ─── Section header ────────────────────────────────────────── */
function SectionHeader({
  label,
  hint,
  count,
}: {
  label: string;
  hint?: string;
  count: number;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionText}>{label.toUpperCase()}</Text>
      {!!hint && (
        <View style={styles.sectionHintChip}>
          <Text style={styles.sectionHintText} numberOfLines={1}>
            {hint}
          </Text>
        </View>
      )}
      <View style={styles.sectionCountChip}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

/* ─── Group row with online avatars ─────────────────────────── */
function GroupRow({
  group,
  companyName,
  isLast,
  onPress,
  onMenuPress,
}: {
  group: any;
  companyName?: string | null;
  isLast?: boolean;
  onPress: () => void;
  onMenuPress?: () => void;
}) {
  const memberCount = (group.members || []).length;
  const messageCount =
    typeof group.messageCount === "number" ? group.messageCount : null;
  const unreadCount =
    typeof group.unreadCount === "number" ? group.unreadCount : 0;
  const id = String(group.groupId || "");
  const isAdmin = group.isAdmin === true;

  // Online members — backend should provide `group.onlineUsers: [{email, name, profilePhoto}]`
  const onlineUsers: any[] = Array.isArray(group.onlineUsers)
    ? group.onlineUsers
    : [];

  let iconName: keyof typeof Ionicons.glyphMap = "chatbubble-ellipses";
  let iconTint = C.accentTint;
  let iconColor = C.brand;

  if (id === "general-forum" || id.startsWith("AUDIT-general-forum-")) {
    iconName = "business";
    iconTint = "#EAF2FB";
    iconColor = "#00529B";
  } else if (id.startsWith("AUDIT-schedule-plan-")) {
    iconName = "calendar";
    iconTint = "#FEF7E6";
    iconColor = "#B45309";
  } else if (id.startsWith("AUDIT-")) {
    iconName = "clipboard";
    iconTint = "#EEF2FF";
    iconColor = "#4338CA";
  } else if (id.startsWith("8D-")) {
    iconName = "construct";
    iconTint = "#ECFDF5";
    iconColor = "#15803D";
  } else if (id.startsWith("GRP-")) {
    iconName = "chatbubbles";
    iconTint = "#EAF2FB";
    iconColor = "#00529B";
  }

  const displayName = group.groupName || group.groupId;

  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <AnimatedGroupIcon
        group={group}
        fallbackIcon={iconName}
        fallbackTint={iconTint}
        fallbackColor={iconColor}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {displayName}
          </Text>
          {isAdmin && (
            <View style={styles.adminPill}>
              <Ionicons name="star" size={9} color="#B45309" />
              <Text style={styles.adminPillText}>Admin</Text>
            </View>
          )}
        </View>

        <View style={styles.rowMetaLine}>
          <Text style={styles.rowSub} numberOfLines={1}>
            {memberCount} member{memberCount === 1 ? "" : "s"}
            {messageCount != null
              ? ` · ${messageCount} message${messageCount === 1 ? "" : "s"}`
              : ""}
          </Text>

          {!group.plantId ? (
            <View style={[styles.badge, { backgroundColor: C.companyTint }]}>
              <Text
                style={[styles.badgeText, { color: C.companyText }]}
                numberOfLines={1}
              >
                {companyName || "Company-Wide"}
              </Text>
            </View>
          ) : group.plantName ? (
            <View style={[styles.badge, { backgroundColor: C.plantTint }]}>
              <Text
                style={[styles.badgeText, { color: C.plantText }]}
                numberOfLines={1}
              >
                {group.plantName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Online row (only if any) */}
        {onlineUsers.length > 0 && (
          <View style={styles.onlineRowWrap}>
            <OnlineStack members={onlineUsers} />
            <Text style={styles.onlineLabel} numberOfLines={1}>
              {onlineUsers.length === 1
                ? `${getDisplayName(onlineUsers[0])} is online`
                : `${onlineUsers.length} online`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rowRight}>
        {unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}

        {onMenuPress && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuBtn}
            hitSlop={10}
            activeOpacity={0.6}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={C.textFaint} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */
const styles = StyleSheet.create({
  /* Drawer */
  drawerBackdrop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.42)",
  },
  drawerOutside: { flex: Platform.OS === "android" ? 0 : 1 },
  drawer: {
    width: Platform.OS === "android" ? "100%" : "92%",
    maxWidth: Platform.OS === "web" ? 640 : undefined,
    backgroundColor: C.bg,
    borderTopLeftRadius: Platform.OS === "android" ? 0 : 18,
    borderBottomLeftRadius: Platform.OS === "android" ? 0 : 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: -6, height: 0 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: { elevation: 14 },
      web: { boxShadow: "-10px 0 40px rgba(15,23,42,0.16)" },
    }),
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.brand,
    gap: 12,
  },
  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarInitials: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.online,
    borderWidth: 2,
    borderColor: C.brand,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: C.bg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },
  searchClear: { padding: 4 },

  /* Section */
  sectionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 1.1,
  },
  sectionHintChip: {
    backgroundColor: C.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 140,
  },
  sectionHintText: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  sectionCountChip: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCountText: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: "700",
  },

  /* Card + Row */
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 1px 3px rgba(15,23,42,0.03)" },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 74,
    backgroundColor: C.surface,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  rowIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowIconPhoto: {
    backgroundColor: "#EAF2FB",
    overflow: "hidden",
    padding: 0,
  },
  rowIconImg: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    flexShrink: 1,
  },
  rowMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  rowSub: { fontSize: 12, color: C.textSub, flexShrink: 1 },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 6,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Online */
  onlineRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  onlineStack: { flexDirection: "row", alignItems: "center" },
  onlineStackItem: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.surface,
    position: "relative",
    overflow: "visible",
  },
  onlineStackImg: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  onlineStackInitials: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineStackInitialsText: {
    fontSize: 8,
    fontWeight: "700",
    color: C.brand,
  },
  onlineStackDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.online,
    borderWidth: 1.5,
    borderColor: C.surface,
  },
  onlineStackMore: {
    backgroundColor: C.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderColor: C.surface,
  },
  onlineStackMoreText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: C.textSub,
  },
  onlineLabel: {
    fontSize: 11,
    color: C.textFaint,
    fontWeight: "500",
    flexShrink: 1,
  },

  /* Badges */
  adminPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.warnTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminPillText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: C.warn,
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.success,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  /* Empty */
  emptyCard: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 26,
    alignItems: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surface,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.accentTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: C.text, fontWeight: "600", fontSize: 14.5 },
  emptySub: { marginTop: 3, color: C.textFaint, fontSize: 12.5 },

  /* Loading */
  loadingWrap: { padding: 60, alignItems: "center" },
  loadingText: {
    marginTop: 12,
    fontSize: 12.5,
    color: C.textSub,
    fontWeight: "500",
  },

  /* Header ⋮ */
  headerMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.38)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingRight: 16,
  },
  headerMenuSheet: {
    width: 280,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 28,
      },
      android: { elevation: 14 },
      web: { boxShadow: "0 16px 40px rgba(15,23,42,0.2)" },
    }),
  },
  headerMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 10,
  },
  headerMenuDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 10,
    marginVertical: 2,
  },
  headerMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMenuLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  headerMenuSub: { fontSize: 11.5, color: C.textSub, marginTop: 2 },
});
