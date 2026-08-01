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
    return await AsyncStorage.getItem("token");
  } catch (error) {
    console.error("Error getting token from AsyncStorage:", error);
    return null;
  }
};

// ✅ Centralized Fetch Helper (Replaces Axios Interceptor)
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  // Safely parse JSON, fallback to text if response is not JSON
  let data;
  try {
    data = await response.json();
  } catch (e) {
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

  getAllNCRs: async () => {
    try {
      const data = await fetchWithAuth("/ncr/all");
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch all NCRs error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Failed to fetch NCRs."),
      };
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
      const data = await fetchWithAuth(`/ncr/audit/${auditId}`);
      return { success: true, data };
    } catch (error: any) {
      console.error("Fetch NCRs by audit error:", error);
      return {
        success: false,
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

  getPendingManagerReview: async () => {
    try {
      const data = await fetchWithAuth("/ncr/pending-review");
      return { success: true, data };
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
