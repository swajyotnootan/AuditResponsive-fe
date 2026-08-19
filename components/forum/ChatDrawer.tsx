// src/Components/forum/ChatDrawer.tsx
import { API_BASE_URL } from "@/config/apiConfig";
import { ArrowLeft, ChevronDown, ChevronUp, Search, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ForumThreadView from "./ForumThreadView"; // Ensure this is the React Native version

// ⚠️ UPDATE THIS URL TO MATCH YOUR ACTUAL BACKEND

// ========== API HELPERS (Replaces missing ../../api/api) ==========
const fetchUserGroups = async (email: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/forum/users/${encodeURIComponent(email)}/groups`); 
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
};

const getUsers = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/users`); 
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
};

const fetchGroupThreads = async (groupId: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/forum/groups/${groupId}/messages`); 
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
};

// ========== TYPES ==========
interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  username?: string;
}

interface Group {
  groupId: string;
  groupName: string;
  description?: string;
  members?: string[];
}

interface SearchResult {
  id: string;
  groupId: string;
  groupName: string;
  content: string;
  createdByName: string;
  createdAt: string;
  matchCount: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ✅ Calculate responsive width to match Tailwind: w-[90vw] md:w-[50vw] lg:w-[40vw]
const drawerWidth = SCREEN_WIDTH >= 1024 ? SCREEN_WIDTH * 0.4 : SCREEN_WIDTH >= 768 ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.9;
// ========== HELPER: HIGHLIGHT TEXT ==========
const escapeRegex = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HighlightedText = ({ text, query, style, numberOfLines }: any) => {
  if (!query || !text) return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  try {
    const parts: string[] = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {parts.map((part: string, i: number) => 
          part.toLowerCase() === query.toLowerCase() ? 
            <Text key={i} style={{ backgroundColor: '#fef08a', fontWeight: 'bold', color: '#000' }}>{part}</Text> : 
            <Text key={i}>{part}</Text>
        )}
      </Text>
    );
  } catch (e) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }
};

// ========== MAIN COMPONENT ==========
export default function ChatDrawer({ isOpen, onClose, user, username }: ChatDrawerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Global search state
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchResult[]>([]);
  const [globalSearchResultsCount, setGlobalSearchResultsCount] = useState(0);
  const [currentGlobalResultIndex, setCurrentGlobalResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const searchListRef = useRef<FlatList>(null);
  const selectedGroup = groups.find((g) => g.groupId === selectedGroupId);

  // Fetch data when drawer opens
  useEffect(() => {
    const userEmail = user?.email || username;
    if (isOpen && userEmail) {
      setLoading(true);
      Promise.all([fetchUserGroups(userEmail), getUsers()])
        .then(([groupsData, usersData]) => {
          setGroups(Array.isArray(groupsData) ? groupsData : []);
          setAllUsers(Array.isArray(usersData) ? usersData : []);
          const foundUser = usersData.find((u: any) => u.email === userEmail);
          setCurrentUser(foundUser || { email: userEmail });
          setError(null);
        })
        .catch(() => setError("Failed to load data."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, username]);

  // Global Search Logic
  const handleGlobalSearch = async (query: string) => {
    if (!query.trim()) {
      setGlobalSearchResults([]); setGlobalSearchResultsCount(0);
      setCurrentGlobalResultIndex(-1); setIsSearching(false);
      return;
    }
    setIsSearching(true); setError(null);
    try {
      const allPosts: SearchResult[] = [];
      let totalMatches = 0;

      for (const group of groups) {
        try {
          const posts = await fetchGroupThreads(group.groupId);
          if (Array.isArray(posts)) {
            posts.forEach((post: any) => {
              const content = post.content || post.message || '';
              const authorName = post.createdByName || post.createdBy || 'Unknown';
              const postId = post.id || post.postId;
              const createdAt = post.createdAt || post.timestamp;
              
              const contentMatches = content.toLowerCase().includes(query.toLowerCase());
              const authorMatches = authorName.toLowerCase().includes(query.toLowerCase());
              
              if (contentMatches || authorMatches) {
                const regex = new RegExp(escapeRegex(query), 'gi');
                const cCount = (content.match(regex) || []).length;
                const aCount = (authorName.match(regex) || []).length;
                totalMatches += cCount + aCount;

                allPosts.push({
                  id: postId, groupId: group.groupId, groupName: group.groupName,
                  content, createdByName: authorName, createdAt, matchCount: cCount + aCount
                });
              }
            });
          }
        } catch (e) { console.error(e); }
      }
      setGlobalSearchResults(allPosts);
      setGlobalSearchResultsCount(totalMatches);
      setCurrentGlobalResultIndex(allPosts.length > 0 ? 0 : -1);
    } catch (e) { setError("Search failed."); }
    finally { setIsSearching(false); }
  };

  // Debounce search
  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setGlobalSearchResults([]); setGlobalSearchResultsCount(0);
      setCurrentGlobalResultIndex(-1); return;
    }
    const timeoutId = setTimeout(() => handleGlobalSearch(globalSearchQuery), 500);
    return () => clearTimeout(timeoutId);
  }, [globalSearchQuery, groups]);

  const navigateGlobalSearchResults = (direction: 'next' | 'prev') => {
    if (globalSearchResults.length === 0) return;
    let newIndex = currentGlobalResultIndex;
    if (direction === 'next') newIndex = (currentGlobalResultIndex + 1) % globalSearchResults.length;
    else newIndex = currentGlobalResultIndex === 0 ? globalSearchResults.length - 1 : currentGlobalResultIndex - 1;
    
    setCurrentGlobalResultIndex(newIndex);
    searchListRef.current?.scrollToIndex({ index: newIndex, animated: true, viewPosition: 0.5 });
  };

  const clearGlobalSearch = () => {
    setGlobalSearchQuery(''); setGlobalSearchResults([]);
    setGlobalSearchResultsCount(0); setCurrentGlobalResultIndex(-1);
    setIsGlobalSearching(false); setIsSearching(false);
  };

  const toggleGlobalSearch = () => {
    if (isGlobalSearching) clearGlobalSearch();
    else setIsGlobalSearching(true);
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        {/* Drawer Container */}
        <View style={styles.drawer}>
          {/* Header */}
          {!selectedGroupId && (
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Discussion forum</Text>
              <TouchableOpacity onPress={toggleGlobalSearch} style={styles.headerBtn}>
                <Search size={20} color={isGlobalSearching ? '#bfdbfe' : 'white'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Global Search Bar */}
          {isGlobalSearching && !selectedGroupId && (
            <View style={styles.searchBar}>
              <Search size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={globalSearchQuery}
                onChangeText={setGlobalSearchQuery}
                placeholder="Search across all groups..."
                placeholderTextColor="#9ca3af"
                autoFocus
              />
              {globalSearchQuery && (
                <View style={styles.searchNav}>
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#00529B" />
                  ) : (
                    <Text style={styles.searchCount}>{currentGlobalResultIndex + 1}/{globalSearchResultsCount}</Text>
                  )}
                  <TouchableOpacity onPress={() => navigateGlobalSearchResults('prev')} disabled={globalSearchResultsCount === 0}>
                    <ChevronUp size={18} color={globalSearchResultsCount === 0 ? '#d1d5db' : '#6b7280'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigateGlobalSearchResults('next')} disabled={globalSearchResultsCount === 0}>
                    <ChevronDown size={18} color={globalSearchResultsCount === 0 ? '#d1d5db' : '#6b7280'} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={clearGlobalSearch}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Content Area */}
          {isGlobalSearching && !selectedGroupId ? (
            // Search Results View
            <FlatList
              ref={searchListRef}
              data={globalSearchResults}
              keyExtractor={(item, idx) => `${item.groupId}-${item.id}-${idx}`}
              contentContainerStyle={styles.listContent}
              onScrollToIndexFailed={() => {}} // Prevent crash if index is out of bounds
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.resultCard, index === currentGlobalResultIndex && styles.resultCardActive]}
                  onPress={() => { setSelectedGroupId(item.groupId); clearGlobalSearch(); }}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>{item.groupName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.resultContent}>
                    <View style={styles.resultHeader}>
                      <View style={styles.groupBadge}>
                        <Text style={styles.groupBadgeText}>{item.groupName}</Text>
                      </View>
                      <Text style={styles.matchCount}>{item.matchCount} match{item.matchCount !== 1 ? 'es' : ''}</Text>
                    </View>
                    <HighlightedText text={item.content} query={globalSearchQuery} style={styles.resultText} numberOfLines={2} />
                    <View style={styles.resultMeta}>
                      <Text style={styles.resultMetaText}>By </Text>
                      <HighlightedText text={item.createdByName} query={globalSearchQuery} style={styles.resultMetaText} />
                      <Text style={styles.resultMetaText}> • {new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {isSearching ? (
                    <>
                      <ActivityIndicator size="large" color="#00529B" />
                      <Text style={styles.emptyText}>Searching across all groups...</Text>
                    </>
                  ) : globalSearchQuery ? (
                    <Text style={styles.emptyText}>No results found for "{globalSearchQuery}"</Text>
                  ) : (
                    <Text style={styles.emptyText}>Enter a search term to find messages</Text>
                  )}
                </View>
              }
            />
          ) : selectedGroupId ? (
            // Thread View
            <ForumThreadView
              groupId={selectedGroupId}
              groupName={selectedGroup?.groupName}
              isInDrawer={true}
              setForumDrawerOpen={onClose}
              username={user?.email || username}
              currentUser={currentUser}
              allUsers={allUsers}
              onBack={() => setSelectedGroupId(null)}
              memberEmails={selectedGroup?.members || []}
            />
          ) : (
            // Group List View
            <FlatList
              data={groups}
              keyExtractor={(item) => item.groupId}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.groupCard} onPress={() => setSelectedGroupId(item.groupId)}>
                  <View style={styles.groupAvatar}>
                    <Text style={styles.groupAvatarText}>{item.groupName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{item.groupName}</Text>
                    <Text style={styles.groupDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {loading ? (
                    <>
                      <ActivityIndicator size="large" color="#00529B" />
                      <Text style={styles.emptyText}>Loading groups...</Text>
                    </>
                  ) : (
                    <Text style={styles.emptyText}>No groups available</Text>
                  )}
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
   drawer: { 
    width: drawerWidth, // ✅ Uses the responsive calculation instead of fixed 85%
    height: '100%', 
    backgroundColor: '#f9fafb', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: -2, height: 0 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8 
  },
  
  // Header
  header: { 
    backgroundColor: '#00529B', flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', paddingHorizontal: 16, 
    paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 48 : 12 
  },
  headerBtn: { padding: 4 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  
  // Search Bar
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, 
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' 
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 4, marginHorizontal: 8 },
  searchNav: { flexDirection: 'row', alignItems: 'center' },
  searchCount: { fontSize: 12, color: '#6b7280', marginHorizontal: 8 },
  
  // Error
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, borderBottomWidth: 1, borderBottomColor: '#fecaca' },
  errorText: { color: '#b91c1c', fontSize: 13 },
  
  // Lists
  listContent: { padding: 16, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 12, textAlign: 'center' },
  
  // Group List Items
  groupCard: { 
    flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', 
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 
  },
  groupAvatar: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', 
    alignItems: 'center', justifyContent: 'center', marginRight: 12 
  },
  groupAvatarText: { color: '#1e40af', fontWeight: 'bold', fontSize: 16 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  groupDesc: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  
  // Search Result Items
  resultCard: { 
    flexDirection: 'row', padding: 12, backgroundColor: 'white', 
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 
  },
  resultCardActive: { borderColor: '#3b82f6', borderWidth: 2, backgroundColor: '#eff6ff' },
  resultAvatar: { 
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', 
    alignItems: 'center', justifyContent: 'center', marginRight: 12 
  },
  resultAvatarText: { color: '#1e40af', fontWeight: 'bold', fontSize: 14 },
  resultContent: { flex: 1 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  groupBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  groupBadgeText: { color: '#1e40af', fontSize: 11, fontWeight: '600' },
  matchCount: { fontSize: 11, color: '#6b7280' },
  resultText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  resultMeta: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  resultMetaText: { fontSize: 12, color: '#6b7280' },
});