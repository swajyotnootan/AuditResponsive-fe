// src/Components/forum/GroupManagementModal.tsx
import { ArrowLeft, Check, ChevronDown, Edit3, Plus, Trash2, Users, X } from "lucide-react-native";
import React, { FC, useEffect, useMemo, useState } from "react";
import {
  Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions
} from "react-native";

// ========== TYPES & INTERFACES ==========
interface User {
  userId?: string;
  username?: string;
  email?: string;
  name?: string;
  profileImage?: string;
  profileIcon?: string;
  department?: string;
  role?: string;
  function?: string;
  operation?: string;
}

interface GroupMember {
  username?: string;
  email?: string;
  memberEmail?: string;
}

interface Group {
  groupId: string;
  groupName: string;
  description?: string;
  members?: (string | GroupMember)[];
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
}

interface UserInitialsProps {
  user: User | null | undefined;
  size?: number;
}

interface EditableMemberManagerProps {
  group: { members: string[] };
  selectedUsernames: string[];
  onSelectionChange: (selection: string[]) => void;
  users: User[];
}

interface GroupFormProps {
  onSubmit: (data: { groupName: string; description: string; members: string[] }) => void;
  onCancel: () => void;
  users: User[];
  initialData: Group | null;
}

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  users: User[];
  onCreateGroup: (data: any) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onUpdateGroup: (groupId: string, data: any) => Promise<void>;
}

// ====== Custom Dropdown ======
const CustomDropdown: FC<CustomDropdownProps> = ({ label, value, options, onSelect }) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.dropdownButton}>
        <Text style={styles.dropdownText} numberOfLines={1}>{value || label}</Text>
        <ChevronDown size={16} color="#6b7280" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownModalTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity onPress={() => { onSelect(""); setVisible(false); }} style={styles.dropdownOption}>
                <Text style={styles.dropdownOptionText}>All</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt} onPress={() => { onSelect(opt); setVisible(false); }} style={styles.dropdownOption}>
                  <Text style={styles.dropdownOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ====== User Initials ======
const UserInitials: FC<UserInitialsProps> = ({ user, size = 32 }) => {
  const [imgError, setImgError] = useState(false);
  const identifier = user?.username || user?.email || "unknown";
  const name = user?.name || identifier;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const colors = ['#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#6366f1', '#ec4899', '#14b8a6'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex] || '#6b7280'; // Fallback color

  const imgSrc = user?.profileImage || user?.profileIcon;

  return (
    <View style={[styles.initialsContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      {imgSrc && !imgError ? (
        <Image 
          source={{ uri: imgSrc }} 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
          onError={() => setImgError(true)} 
        />
      ) : (
        <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
      )}
    </View>
  );
};

// ====== Editable Member Manager ======
const EditableMemberManager: FC<EditableMemberManagerProps> = ({ group, selectedUsernames, onSelectionChange, users = [] }) => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ department: "", role: "", function: "", operation: "" });
  const [selectAll, setSelectAll] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (!user.username && !user.email) return false;
      const matchesSearch =
        (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(search.toLowerCase());

      const matchesDept = !filters.department || (user.department || "").toLowerCase().includes(filters.department.toLowerCase());
      const matchesRole = !filters.role || (user.role || "").toLowerCase().includes(filters.role.toLowerCase());
      const matchesFunc = !filters.function || (user.function || "").toLowerCase().includes(filters.function.toLowerCase());
      const matchesOp = !filters.operation || (user.operation || "").toLowerCase().includes(filters.operation.toLowerCase());

      return matchesSearch && matchesDept && matchesRole && matchesFunc && matchesOp;
    });
  }, [users, search, filters]);

  useEffect(() => {
    if (selectAll) {
      const allEmails = filteredUsers.map(u => u.email || u.username || "").filter(Boolean);
      const union = [...new Set([...selectedUsernames, ...allEmails])];
      onSelectionChange(union);
    }
  }, [selectAll, filteredUsers, selectedUsernames, onSelectionChange]);

  const toggleUser = (userEmail: string) => {
    const newSelection = selectedUsernames.includes(userEmail)
      ? selectedUsernames.filter(u => u !== userEmail)
      : [...selectedUsernames, userEmail];
    onSelectionChange(newSelection);
    if (selectedUsernames.includes(userEmail)) setSelectAll(false);
  };

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))] as string[];
  const roles = [...new Set(users.map(u => u.role).filter(Boolean))] as string[];
  const functions = [...new Set(users.map(u => u.function).filter(Boolean))] as string[];
  const operations = [...new Set(users.map(u => u.operation).filter(Boolean))] as string[];

  return (
    <View style={styles.managerContainer}>
      <View style={styles.filtersContainer}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search by name, username, or email..." 
          value={search} 
          onChangeText={setSearch} 
          placeholderTextColor="#9ca3af"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          <CustomDropdown label="All Departments" value={filters.department} options={departments} onSelect={(v) => setFilters(f => ({...f, department: v}))} />
          <CustomDropdown label="All Roles" value={filters.role} options={roles} onSelect={(v) => setFilters(f => ({...f, role: v}))} />
          <CustomDropdown label="All Functions" value={filters.function} options={functions} onSelect={(v) => setFilters(f => ({...f, function: v}))} />
          <CustomDropdown label="All Operations" value={filters.operation} options={operations} onSelect={(v) => setFilters(f => ({...f, operation: v}))} />
        </ScrollView>
        <TouchableOpacity onPress={() => setSelectAll(!selectAll)} style={styles.checkboxRow}>
          <View style={[styles.checkbox, selectAll && styles.checkboxChecked]}>
            {selectAll && <Check size={12} color="white" />}
          </View>
          <Text style={styles.checkboxLabel}>Select all {filteredUsers.length} filtered users</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userListContainer}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.userId || item.email || item.username || Math.random().toString()}
          renderItem={({ item }) => {
            const userEmail = item.email || item.username || "";
            const isChecked = selectedUsernames.includes(userEmail);
            return (
              <TouchableOpacity onPress={() => toggleUser(userEmail)} style={[styles.userRow, isChecked && styles.userRowSelected]}>
                <UserInitials user={item} size={40} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{item.name || item.username}</Text>
                  <View style={styles.userBadges}>
                    {item.department && <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeTextBlue}>{item.department}</Text></View>}
                    {item.role && <View style={[styles.badge, styles.badgeGreen]}><Text style={styles.badgeTextGreen}>{item.role}</Text></View>}
                  </View>
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email || item.username}</Text>
                </View>
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <Check size={12} color="white" />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Users size={48} color="#d1d5db" />
              <Text style={styles.emptyListText}>No users match your filters.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

// ====== Group Form ======
const GroupForm: FC<GroupFormProps> = ({ onSubmit, onCancel, users = [], initialData = null }) => {
  const [formData, setFormData] = useState({
    groupName: initialData?.groupName || "",
    description: initialData?.description || "",
  });

  const [selectedUsernames, setSelectedUsernames] = useState<string[]>(
    initialData?.members?.map(m => typeof m === 'string' ? m : (m.email || m.memberEmail || m.username || "")).filter(Boolean) || []
  );

  const handleSubmit = () => {
    if (!formData.groupName.trim()) {
      Alert.alert("Error", "Group name is required");
      return;
    }
    const payload = {
      groupName: formData.groupName,
      description: formData.description,
      members: selectedUsernames,
    };
    onSubmit(payload);
  };

  return (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.label}>Group Name *</Text>
      <TextInput 
        style={styles.input} 
        value={formData.groupName} 
        onChangeText={(t) => setFormData({ ...formData, groupName: t })} 
        placeholder="Enter group name..." 
        placeholderTextColor="#9ca3af"
      />
      
      <Text style={styles.label}>Description</Text>
      <TextInput 
        style={[styles.input, styles.textArea]} 
        value={formData.description} 
        onChangeText={(t) => setFormData({ ...formData, description: t })} 
        multiline 
        numberOfLines={3} 
        placeholder="Enter group description..." 
        placeholderTextColor="#9ca3af"
      />
      
      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.label}>Group Members</Text>
          <Text style={styles.membersCount}>{selectedUsernames.length} members selected</Text>
        </View>
        <EditableMemberManager
          group={{ members: selectedUsernames }}
          selectedUsernames={selectedUsernames}
          onSelectionChange={setSelectedUsernames}
          users={users}
        />
      </View>
      
      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>{initialData ? "Update Group" : "Create Group"}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ====== Main Modal ======
export default function GroupManagementModal({
  isOpen,
  onClose,
  groups = [],
  users = [],
  onCreateGroup,
  onDeleteGroup,
  onUpdateGroup,
}: GroupManagementModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setSelectedGroup(null);
      setEditingGroup(null);
    }
  }, [isOpen]);

  const handleCreateGroup = async (groupData: any) => {
    try {
      await onCreateGroup(groupData);
      setShowForm(false);
    } catch (err: any) {
      console.error("Create group error:", err);
      Alert.alert("Error", `Failed to create group: ${err.message}`);
    }
  };

  const handleUpdateGroup = async (updates: any) => {
    if (!editingGroup) return;
    try {
      await onUpdateGroup(editingGroup.groupId, updates);
      setEditingGroup(null);
      setShowForm(false);
      if (selectedGroup?.groupId === editingGroup.groupId) {
        setSelectedGroup(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err: any) {
      console.error("Update group error:", err);
      Alert.alert("Error", "Failed to update group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await onDeleteGroup(groupId);
              if (selectedGroup?.groupId === groupId) setSelectedGroup(null);
            } catch (err: any) {
              console.error("Delete group error:", err);
              Alert.alert("Error", "Failed to delete group");
            }
          }
        }
      ]
    );
  };

  if (!isOpen) return null;

  const renderGroupList = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>All Groups</Text>
        <TouchableOpacity onPress={() => { setShowForm(true); setEditingGroup(null); setSelectedGroup(null); }} style={styles.createBtn}>
          <Plus size={16} color="white" />
          <Text style={styles.createBtnText}>New Group</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.sidebarList}>
        {groups.length === 0 ? (
          <View style={styles.emptyList}>
            <Users size={48} color="#d1d5db" />
            <Text style={styles.emptyListText}>No groups found</Text>
            <Text style={styles.emptyListSubtext}>Create your first group to get started</Text>
          </View>
        ) : (
          groups.map(group => (
            <TouchableOpacity
              key={group.groupId}
              onPress={() => { setSelectedGroup(group); setShowForm(false); setEditingGroup(null); }}
              style={[styles.groupItem, selectedGroup?.groupId === group.groupId && styles.groupItemSelected]}
            >
              <Text style={styles.groupItemTitle} numberOfLines={1}>{group.groupName}</Text>
              <Text style={styles.groupItemDesc} numberOfLines={2}>{group.description || "No description"}</Text>
              <View style={styles.groupItemMeta}>
                <Users size={14} color="#9ca3af" />
                <Text style={styles.groupItemMetaText}>{group.members?.length || 0} members</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderMainContent = () => (
    <View style={styles.mainContent}>
      {showForm ? (
        <GroupForm
          users={users}
          initialData={editingGroup}
          onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
          onCancel={() => { setShowForm(false); setEditingGroup(null); if (!editingGroup) setSelectedGroup(null); }}
        />
      ) : selectedGroup ? (
        <ScrollView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{selectedGroup.groupName}</Text>
              <Text style={styles.detailDescription}>{selectedGroup.description || "No description provided"}</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingGroup(selectedGroup); setShowForm(true); }} style={styles.editBtn}>
              <Edit3 size={16} color="white" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.membersSection}>
            <Text style={styles.membersTitle}>Group Members ({selectedGroup.members?.length || 0})</Text>
            {selectedGroup.members && selectedGroup.members.length > 0 ? (
              <View style={styles.membersGrid}>
                {selectedGroup.members.map((member, idx) => {
                  const identifier = typeof member === 'string' ? member : (member.username || member.memberEmail || member.email || "");
                  const user = users.find(u => u.username === identifier || u.email === identifier);
                  return (
                    <View key={identifier || idx} style={[styles.memberCard, { width: isDesktop ? '48%' : '100%' }]}>
                      <UserInitials user={user || { username: identifier }} size={48} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName} numberOfLines={1}>{user ? user.name || user.username : identifier}</Text>
                        <View style={styles.userBadges}>
                          {user?.department && <View style={[styles.badge, styles.badgeBlue]}><Text style={styles.badgeTextBlue}>{user.department}</Text></View>}
                          {user?.role && <View style={[styles.badge, styles.badgeGreen]}><Text style={styles.badgeTextGreen}>{user.role}</Text></View>}
                        </View>
                        <Text style={styles.memberEmail} numberOfLines={1}>{identifier}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyList}>
                <Users size={48} color="#d1d5db" />
                <Text style={styles.emptyListText}>No members in this group</Text>
              </View>
            )}
          </View>

          <View style={styles.deleteSection}>
            <TouchableOpacity onPress={() => handleDeleteGroup(selectedGroup.groupId)} style={styles.deleteBtn}>
              <Trash2 size={16} color="#dc2626" />
              <Text style={styles.deleteBtnText}>Delete Group</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Users size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>{groups.length > 0 ? "Select a group" : "Create your first group"}</Text>
          <Text style={styles.emptyStateText}>{groups.length > 0 ? "Choose a group from the list" : "Click 'New Group' to start"}</Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isDesktop ? styles.modalDesktop : styles.modalMobile]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {showForm ? (editingGroup ? "Edit Group" : "Create New Group") : "Manage Chat Groups"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {showForm ? (editingGroup ? "Update group details" : "Create a new group chat") : "View and manage all groups"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {isDesktop ? (
              <View style={styles.desktopLayout}>
                {renderGroupList()}
                {renderMainContent()}
              </View>
            ) : (
              <View style={styles.mobileLayout}>
                {selectedGroup || showForm ? (
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => { setSelectedGroup(null); setShowForm(false); }} style={styles.backBtn}>
                      <ArrowLeft size={20} color="#00529B" />
                      <Text style={styles.backBtnText}>Back to Groups</Text>
                    </TouchableOpacity>
                    {renderMainContent()}
                  </View>
                ) : (
                  renderGroupList()
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, width: '100%', overflow: 'hidden' },
  modalDesktop: { maxWidth: 1200, height: '85%' },
  modalMobile: { height: '95%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  closeBtn: { padding: 8 },
  contentContainer: { flex: 1, overflow: 'hidden' },
  desktopLayout: { flex: 1, flexDirection: 'row' },
  mobileLayout: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  backBtnText: { color: '#00529B', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  // Sidebar
  sidebar: { width: '33%', borderRightWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white' },
  sidebarTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#00529B', borderRadius: 6 },
  createBtnText: { color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 6 },
  sidebarList: { flex: 1, padding: 16 },
  groupItem: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', marginBottom: 8 },
  groupItemSelected: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  groupItemTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  groupItemDesc: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  groupItemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  groupItemMetaText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  
  // Main Content
  mainContent: { flex: 1, backgroundColor: 'white' },
  detailContainer: { flex: 1, padding: 24 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 24, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  detailDescription: { fontSize: 16, color: '#4b5563', marginTop: 8, lineHeight: 24 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#00529B', borderRadius: 6 },
  editBtnText: { color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 8 },
  
  // Members
  membersSection: { marginTop: 24 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  membersTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  membersCount: { fontSize: 14, color: '#6b7280' },
  membersGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 12, marginBottom: 12 },
  memberInfo: { flex: 1, marginLeft: 16 },
  memberName: { fontSize: 16, fontWeight: '500', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  
  // Form
  formContainer: { flex: 1, padding: 24 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 12, fontSize: 14, color: '#111827', marginBottom: 16, backgroundColor: 'white' },
  textArea: { height: 100, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderColor: '#e5e7eb' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6 },
  cancelBtnText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#00529B', borderRadius: 6, marginLeft: 12 },
  submitBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
  
  // Manager
  managerContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  filtersContainer: { padding: 16, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 10, fontSize: 14, color: '#111827', marginBottom: 12, backgroundColor: 'white' },
  filtersRow: { marginBottom: 12 },
  dropdownContainer: { marginRight: 8, minWidth: 150 },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 10, backgroundColor: 'white' },
  dropdownText: { fontSize: 14, color: '#374151', flex: 1 },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  dropdownModal: { backgroundColor: 'white', borderRadius: 8, width: 300, maxHeight: 400, padding: 16 },
  dropdownModalTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  dropdownOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownOptionText: { fontSize: 14, color: '#374151' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxChecked: { backgroundColor: '#00529B', borderColor: '#00529B' },
  checkboxLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  userListContainer: { maxHeight: 320 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  userRowSelected: { backgroundColor: '#eff6ff' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  userBadges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 4 },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeTextBlue: { color: '#1e40af', fontSize: 12, fontWeight: '500' },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeTextGreen: { color: '#166534', fontSize: 12, fontWeight: '500' },
  userEmail: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  
  // Empty States
  emptyList: { alignItems: 'center', padding: 32 },
  emptyListText: { fontSize: 14, fontWeight: '500', color: '#6b7280', marginTop: 8 },
  emptyListSubtext: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyStateTitle: { fontSize: 18, fontWeight: '500', color: '#6b7280', marginTop: 16 },
  emptyStateText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  
  // Delete
  deleteSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderColor: '#e5e7eb' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center' },
  deleteBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '500', marginLeft: 8 },

  // Initials
  initialsContainer: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  initialsText: { color: 'white', fontWeight: '600' },
});