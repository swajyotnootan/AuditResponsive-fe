// components/forum/Api/forumapi.ts

import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";


// Helper for authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("authToken");
  const headers: any = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, {
    ...options,
    headers,
  });
};

// ===== SMART API DETECTION =====
// ===== SMART API DETECTION =====
const getApiBase = (groupId: string): string => {
  const groupIdStr = String(groupId);
  
  // 1. If it's purely numeric, use Main Forum
  if (!isNaN(Number(groupIdStr)) && groupIdStr !== "") {
    return "/forum";
  }
  
  // 2. If it's ANY string (like "AUDIT-...", "EVT-...", etc.), use 8D Forum
  // This exactly matches your working Web app logic!
  return "/forum/8d";
};

// ===== GROUP APIS =====

export const createForumGroup = (groupData: any) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/groups`, {
    method: "POST",
    body: JSON.stringify(groupData),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Failed to create group");
    return data;
  });

export const deleteForumGroup = (groupId: string, requestedBy: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/groups/${groupId}?requestedBy=${encodeURIComponent(requestedBy)}`,
    {
      method: "DELETE",
    },
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to delete group");
    return r.json();
  });

export const updateForumGroup = (groupId: string, updates: any) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/groups/${groupId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "Failed to update group");
    return data;
  });

export const fetchAllGroups = () =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/groups/all`).then(async (r) => {
    if (!r.ok) throw new Error("Failed to fetch groups");
    return r.json();
  });

export const fetchUserGroups = (email: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/groups?email=${encodeURIComponent(email)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to fetch user groups");
    return r.json();
  });

export const fetchLineGroups = () =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/groups/lines`).then(async (r) => {
    if (!r.ok) throw new Error("Failed to fetch line groups");
    return r.json();
  });

export const fetchLineGroupByCode = (lineCode: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/groups/line/${encodeURIComponent(lineCode)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to fetch line group");
    return r.json();
  });

// ===== THREADS/POSTS =====

export const fetchGroupThreads = (groupId: string) => {
  const base = getApiBase(groupId);
  const endpoint = base === "/forum" ? "posts" : "threads";
  const url = `${API_BASE_URL}/api${base}/groups/${encodeURIComponent(groupId)}/${endpoint}`;
  console.log("📥 Fetching threads from:", url);

  return fetchWithAuth(url).then(async (r) => {
    if (!r.ok) {
      const errorText = await r.text();
      console.error("❌ Fetch threads error:", errorText);
      throw new Error(`Failed to fetch threads: ${r.status}`);
    }
    const data = await r.json();
    console.log(
      "✅ Threads fetched:",
      Array.isArray(data) ? data.length : "not array",
    );
    return data;
  });
};

// ✅ FIXED: createForumPost with proper error handling
export const createForumPost = async (groupId: string, postData: any) => {
  const base = getApiBase(groupId);
  const endpoint = base === "/forum" ? "posts" : "threads";
  const url = `${API_BASE_URL}/api${base}/groups/${groupId}/${endpoint}`;

  // ✅ Ensure postData has the correct structure
  const payload = {
    content: postData.content || "",
    createdBy: postData.createdBy || "anonymous",
    messageType: postData.messageType || "TEXT",
    attachments: postData.attachments || [],
  };

  console.log("📤 Creating forum post:", {
    url,
    payload: {
      content: payload.content.substring(0, 50),
      messageType: payload.messageType,
      attachmentsCount: payload.attachments.length,
      attachments: payload.attachments.map((a: any) => ({
        type: a.attachmentType,
        fileName: a.fileName,
        fileDataLength: a.fileData?.length || 0,
      })),
    },
  });

  try {
    const response = await fetchWithAuth(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("📥 Response status:", response.status);
    console.log("📥 Response body:", responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error(`Server error ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse response:", parseError);
      throw new Error("Invalid response from server");
    }

    console.log("✅ Post created successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ Create post error:", error);
    throw error;
  }
};

// ===== ATTACHMENTS =====

export const uploadForumAttachment = async (groupId: string, file: any) => {
  const base = getApiBase(groupId);
  const endpoint = base === "/forum" ? "posts/upload" : "threads/upload";

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type || "image/jpeg",
    name: file.name || "attachment.jpg",
  } as any);

  const token = await AsyncStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/api${base}/groups/${groupId}/${endpoint}`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return response.json();
};

export const downloadForumAttachment = async (attachmentId: string) => {
  const token = await AsyncStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/api/forum/attachments/${attachmentId}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  return response.blob();
};

// ===== CALL NOTIFICATIONS =====

export const sendCallNotification = async (
  groupId: string,
  action: string,
  caller: string,
  callerName: string,
  targetUser: string | null = null,
) => {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/call-notification`,
    {
      method: "POST",
      body: JSON.stringify({
        groupId,
        action,
        caller,
        callerName,
        targetUser,
        timestamp: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to send call notification");
  }
  return response.json();
};

export const checkActiveCalls = (groupId: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/active-calls?groupId=${encodeURIComponent(groupId)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to check active calls");
    return r.json();
  });

// ===== MEMBER MANAGEMENT =====

export const addGroupMembers = (groupId: string, newMembers: string[]) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ newMembers }),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Failed to add members");
    return r.json();
  });

export const removeGroupMembers = (
  groupId: string,
  membersToRemove: string[],
) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/members`, {
    method: "DELETE",
    body: JSON.stringify({ membersToRemove }),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Failed to remove members");
    return r.json();
  });

export const getGroupMembers = (groupId: string) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/8d/groups/${groupId}/members`).then(
    async (r) => {
      if (!r.ok) throw new Error("Failed to get group members");
      return r.json();
    },
  );

export const getGroupMembersWithDetails = (
  groupId: string,
  currentUser: string,
) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/members/details?currentUser=${encodeURIComponent(currentUser)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to get group members details");
    return r.json();
  });

export const checkGroupMembership = (groupId: string, userEmail: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/members/check?userEmail=${encodeURIComponent(userEmail)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to check group membership");
    return r.json();
  });

// ===== NCR FORUM APIS =====

export const createOrGetNCRForum = (formId: string, forumData: any) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/ncr/forms/${formId}/forum`, {
    method: "POST",
    body: JSON.stringify(forumData),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Failed to create/get NCR forum");
    return r.json();
  });

export const getNCRForumThreads = (formId: string) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/ncr/forms/${formId}/threads`).then(
    async (r) => {
      if (!r.ok) throw new Error("Failed to get NCR forum threads");
      return r.json();
    },
  );

export const createNCRForumThread = (formId: string, threadData: any) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/ncr/forms/${formId}/threads`, {
    method: "POST",
    body: JSON.stringify(threadData),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Failed to create NCR forum thread");
    return r.json();
  });

export const uploadNCRForumAttachment = async (formId: string, file: any) => {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type || "image/jpeg",
    name: file.name || "attachment.jpg",
  } as any);

  const token = await AsyncStorage.getItem("authToken");
  const response = await fetch(
    `${API_BASE_URL}/api/forum/ncr/forms/${formId}/threads/upload`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return response.json();
};

export const downloadNCRForumAttachment = (
  formId: string,
  attachmentId: string,
) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/ncr/forms/${formId}/attachments/${attachmentId}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to download NCR attachment");
    return r.blob();
  });

export const addNCRForumMembers = (formId: string, members: string[]) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/ncr/forms/${formId}/members`, {
    method: "POST",
    body: JSON.stringify({ members }),
  }).then(async (r) => {
    if (!r.ok) throw new Error("Failed to add NCR forum members");
    return r.json();
  });

export const getNCRForumMembers = (formId: string) =>
  fetchWithAuth(`${API_BASE_URL}/api/forum/ncr/forms/${formId}/members`).then(
    async (r) => {
      if (!r.ok) throw new Error("Failed to get NCR forum members");
      return r.json();
    },
  );

export const checkNCRForumMembership = (formId: string, userEmail: string) =>
  fetchWithAuth(
    `${API_BASE_URL}/api/forum/ncr/forms/${formId}/members/check?userEmail=${encodeURIComponent(userEmail)}`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Failed to check NCR forum membership");
    return r.json();
  });
