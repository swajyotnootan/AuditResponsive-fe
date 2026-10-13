// components/forum/Api/forumapi.ts

import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ✅ Single source of truth for authenticated requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem("authToken");
  const userId = await AsyncStorage.getItem("userId");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "X-User-Id": userId } : {}),
    "X-Timezone":
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers });
};

// ===== SMART API DETECTION =====
const getApiBase = (groupId: string): string => {
  const groupIdStr = String(groupId);
  if (!isNaN(Number(groupIdStr)) && groupIdStr !== "") {
    return "/forum";
  }
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
    { method: "DELETE" },
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

// ✅ Admin-aware member management
export const addGroupMembersSecure = async (
  groupId: string,
  newMembers: string[],
  requester: string,
) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ requester, newMembers }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to add members");
  }
  return data;
};

export const removeGroupMembersSecure = async (
  groupId: string,
  membersToRemove: string[],
  requester: string,
) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/members`,
    {
      method: "DELETE",
      body: JSON.stringify({ requester, membersToRemove }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to remove members");
  }
  return data;
};

export const changeGroupAdmin = async (
  groupId: string,
  newAdminEmail: string,
  requester: string,
) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/admin`,
    {
      method: "PATCH",
      body: JSON.stringify({ requester, newAdminEmail }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to change admin");
  }
  return data;
};

// ===== THREADS/POSTS =====

export const fetchGroupThreads = (
  groupId: string,
  options?: {
    beforeId?: number;
    sinceId?: number;
    limit?: number;
    daysBack?: number;
    requester?: string;
  },
) => {
  const base = getApiBase(groupId);
  const endpoint = base === "/forum" ? "posts" : "threads";

  const params = new URLSearchParams();
  if (base !== "/forum" && options) {
    if (options.beforeId != null)
      params.append("beforeId", String(options.beforeId));
    if (options.sinceId != null)
      params.append("sinceId", String(options.sinceId));
    if (options.limit != null) params.append("limit", String(options.limit));
    if (options.daysBack != null)
      params.append("daysBack", String(options.daysBack));
    if (options.requester) params.append("requester", options.requester);
  }

  const qs = params.toString();
  const url = `${API_BASE_URL}/api${base}/groups/${encodeURIComponent(groupId)}/${endpoint}${qs ? "?" + qs : ""}`;
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

export async function exportGroupThreads(
  groupId: string,
  opts: {
    format: "csv" | "json" | "pdf";
    scope: "all" | "days" | "limit";
    requester?: string;
    daysBack?: number;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  params.append("scope", opts.scope);

  if (opts.scope === "days" && opts.daysBack) {
    params.append("daysBack", String(opts.daysBack));
  }
  if (opts.scope === "limit" && opts.limit) {
    params.append("limit", String(opts.limit));
  }

  let path: string;
  if (opts.format === "pdf") {
    if (opts.requester) {
      params.append("requester", opts.requester);
    }
    path = `/api/forum/8d/groups/${groupId}/threads/export/pdf`;
  } else {
    path = `/api/forum/8d/groups/${groupId}/threads/export`;
    params.append("format", opts.format);
  }

  const url = `${API_BASE_URL}${path}?${params.toString()}`;

  if (Platform.OS === "web") {
    // ✅ Fetch with auth, then trigger browser download from blob
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      throw new Error(`Export failed: ${res.status}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `forum-${groupId}-${opts.scope}.${opts.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return url;
  }

  return url;
}

export const createForumPost = async (groupId: string, postData: any) => {
  const base = getApiBase(groupId);
  const endpoint = base === "/forum" ? "posts" : "threads";
  const url = `${API_BASE_URL}/api${base}/groups/${groupId}/${endpoint}`;

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
  const response = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/attachments/${attachmentId}`,
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

// =====================================================
// GROUP ADMIN ACTIONS
// =====================================================

export const leaveGroup = async (groupId: string, userEmail: string) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/leave?userEmail=${encodeURIComponent(userEmail)}`,
    { method: "DELETE" },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to leave group");
  }
  return data;
};

export const renameGroup = async (
  groupId: string,
  newName: string,
  requester: string,
) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}/name`,
    {
      method: "PATCH",
      body: JSON.stringify({ newName, requester }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to rename group");
  }
  return data;
};

export const deleteGroup = async (groupId: string, requester: string) => {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${groupId}?requester=${encodeURIComponent(requester)}`,
    { method: "DELETE" },
  );
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || "Failed to delete group");
  }
  return data;
};

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

// ───────────────────────────────────────────────────────────
// FORUM HOME — WhatsApp-style group management
// ───────────────────────────────────────────────────────────

export async function fetchUser8DGroups(
  userEmail: string,
  plantId?: string | number | null,
) {
  if (!userEmail) return [];
  const params = new URLSearchParams({ userEmail });
  if (plantId != null && plantId !== "") {
    params.append("plantId", String(plantId));
  }
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups?${params.toString()}`,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load groups (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createCustomGroup(payload: {
  groupId: string;
  groupName: string;
  description?: string;
  createdBy: string;
  members: string[];
  adminEmail?: string;
  plantId?: string | null;
  plantName?: string | null;
  companyId?: string | null;
}) {
  const res = await fetchWithAuth(`${API_BASE_URL}/api/forum/8d/groups`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to create group (${res.status})`);
  }
  return await res.json();
}

// ───────────────────────────────────────────────────────────
// GROUP APPEARANCE (photo / emoji / description) — admin only
// ───────────────────────────────────────────────────────────

export async function updateGroupAppearance(
  groupId: string,
  payload: {
    requester: string;
    photoUrl?: string | null;
    emoji?: string | null;
    description?: string | null;
  },
) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/forum/8d/groups/${encodeURIComponent(groupId)}/appearance`,
    {
      method: "PATCH",
      body: JSON.stringify({
        requester: payload.requester,
        photoUrl: payload.photoUrl ?? null,
        emoji: payload.emoji ?? null,
        description: payload.description ?? null,
      }),
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || "Failed to update group appearance");
  }
  return data;
}
