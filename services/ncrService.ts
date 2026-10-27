import { API_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ✅ Dynamic API Base (Update the mobile IP to your machine's local IP if testing on a physical device)

// ✅ Cross-platform token retrieval
const getToken = async () => {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error getting token from AsyncStorage:", error);
    return null;
  }
};

// ✅ Cross-platform user-id retrieval (mirrors getToken)
const getCurrentUserId = async (): Promise<string | null> => {
  // 1. Try the flat "userId" key first (fast path)
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        const v = localStorage.getItem("userId");
        if (v) return v;
      }
    } else {
      const v = await AsyncStorage.getItem("userId");
      if (v) return v;
    }
  } catch {}

  // 2. Fall back to parsing the stored "user" object
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    } else {
      raw = await AsyncStorage.getItem("user");
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id != null) return String(parsed.id);
    }
  } catch (err) {
    console.warn("⚠️ getCurrentUserId: could not parse stored user", err);
  }

  return null;
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const [token, userId] = await Promise.all([getToken(), getCurrentUserId()]);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // ✅ Plant-scoping: backend resolves this user's plant/company
    ...(userId ? { "X-User-Id": userId } : {}),
    // ✅ Consistent timezone for date handling
    "X-Timezone":
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "message" in data
        ? (data as any).message
        : `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
};

const getErrorMessage = (error: any, fallback: string) =>
  error.message || fallback;

export const ncrService = {
  createNCR: async (ncrData: any) => {
    try {
      const data = await fetchWithAuth("/ncr/create", {
        method: "POST",
        body: JSON.stringify(ncrData),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Create NCR error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to create NCR."),
      };
    }
  },

  /**
   * Get all NCRs visible to the current user.
   * The backend filters by the user's plant/company automatically
   * when the X-User-Id header is present.
   */
  getAllNCRs: async (
    userId?: string | number,
    page: number = 0,
    size: number = 100,
  ) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Timezone":
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      };

      // ✅ Only send header if we have a user id
      if (userId != null && String(userId).trim() !== "") {
        headers["X-User-Id"] = String(userId);
      }

      // ✅ Added pagination query parameters
      const response = await fetch(
        `${API_BASE_URL}/api/ncr/all?page=${page}&size=${size}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      // ✅ We extract the "content" array from the Spring Page object
      return { success: true, data: data.content || [] };
    } catch (error: any) {
      console.error("❌ [ncrService.getAllNCRs]", error);
      return { success: false, error: error.message || "Network error" };
    }
  },

  getNCRById: async (ncrId: string | number) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch NCR error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to fetch NCR."),
      };
    }
  },

  sendTo8D: async (
    id: string | number,
    comment: string,
    userId: string | number,
  ) => {
    try {
      const data = await fetchWithAuth(`/ncr/${id}/send-to-8d`, {
        method: "POST",
        body: JSON.stringify({ comment, userId }),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Send to 8D API Error:", error);
      return { success: false, error: error.message };
    }
  },

  submitNCR2: async (ncrId: string | number, actionData: any) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/submit-ncr2`, {
        method: "POST",
        body: JSON.stringify(actionData),
      });
      return { success: true, data }; // Standardized to match other methods
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getPendingNCR2: async () => {
    try {
      const data = await fetchWithAuth("/ncr/ncr2-pending");
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  verifyNCR2: async (
    ncrId: string | number,
    accepted: boolean,
    comment: string,
  ) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/verify-ncr2`, {
        method: "POST",
        body: JSON.stringify({ accepted, comment }),
      });
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  getNCRsByAuditId: async (auditId: string | number) => {
    try {
      const raw = await fetchWithAuth(`/ncr/audit/${auditId}`);
      // ✅ Normalize: always return a plain array
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.content)
          ? raw.content
          : Array.isArray(raw?.data)
            ? raw.data
            : [];
      return { success: true, data: list };
    } catch (error: any) {
      console.error("Fetch NCRs by audit error:", error);
      return {
        success: false,
        data: [],
        error: getErrorMessage(error, "Failed to fetch NCRs."),
      };
    }
  },

  getNCRsForAuditor: async (auditorId: string | number) => {
    try {
      const data = await fetchWithAuth(`/ncr/auditor/${auditorId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch auditor NCRs error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to fetch NCRs."),
      };
    }
  },

  getNCRsForAuditee: async (auditeeId: string | number) => {
    try {
      const data = await fetchWithAuth(`/ncr/auditee/${auditeeId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch auditee NCRs error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to fetch NCRs."),
      };
    }
  },

  getPendingManagerReview: async (page: number = 0, size: number = 100) => {
    try {
      // ✅ Extracts the list from the Page object since backend now returns Page
      const data = await fetchWithAuth(
        `/ncr/pending-review?page=${page}&size=${size}`,
      );
      return { success: true, data: data.content || [] };
    } catch (error: any) {
      console.error("Fetch pending manager review NCRs error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to fetch pending review NCRs."),
      };
    }
  },

  getPendingVerification: async () => {
    try {
      const data = await fetchWithAuth("/ncr/pending-verification");
      // Note: The backend still returns a List for this specific endpoint, so no .content extraction needed.
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch pending verification NCRs error:", error);
      return {
        success: false,
        error: getErrorMessage(
          error,
          "Failed to fetch pending verification NCRs.",
        ),
      };
    }
  },

  reviewNCR: async (
    ncrId: string | number,
    comment: string,
    approved: boolean,
  ) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/review`, {
        method: "PUT",
        body: JSON.stringify({ approved, comment }),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Manager review NCR error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to review NCR."),
      };
    }
  },

  auditeeReviewNCR: async (
    ncrId: string | number,
    approved: boolean,
    comment: string,
    signature: string,
  ) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/auditee-review`, {
        method: "PUT",
        body: JSON.stringify({ approved, comment, signature }),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Auditee review NCR error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to submit review."),
      };
    }
  },

  submitCorrectiveAction: async (ncrId: string | number, actionData: any) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/corrective-action`, {
        method: "PUT",
        body: JSON.stringify(actionData),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Submit corrective action error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to submit corrective action."),
      };
    }
  },

  verifyAndClose: async (
    ncrId: string | number,
    accepted: boolean,
    comment: string,
  ) => {
    try {
      const data = await fetchWithAuth(`/ncr/${ncrId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ accepted, comment }),
      });
      return { success: true, data };
    } catch (error: any) {
      console.error("Verify NCR error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to verify NCR."),
      };
    }
  },
};
