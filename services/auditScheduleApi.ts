// app/services/auditScheduleApi.ts

import { API_BASE_URL as APP_BASE_URL } from "@/config/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosResponse } from "axios";
import { Platform } from "react-native";

const API_BASE_URL = `${APP_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore — no token available
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================================
// TYPES
// ============================================================================
export interface User {
  id: number | string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  roleName?: string;
  department?: string;
  profileImage?: string;
}

export interface AuditSchedule {
  id: number | string;
  auditNumber: string;
  auditType: string;
  department: string;
  status: string;
  approvalStatus: string;
  auditDate: string;
  scheduledDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  auditorId?: number | string;
  auditorName?: string;
  auditorEmail?: string;
  auditeeId?: number | string;
  auditeeName?: string;
  auditeeEmail?: string;
  hodEmail?: string;
  hodName?: string;
  memberEmails?: string[];
  teamAuditorIds?: number[] | string;
  teamAuditorNames?: string[] | string;
  progress?: number;
}

export interface PendingRequest {
  requestId: string;
  scheduleId: string | number;
  type: "RESCHEDULE" | "EXTENSION";
  auditType: string;
  department: string;
  auditorId: number | string;
  auditorName: string;
  auditeeId: number | string;
  auditeeName: string;
  currentDate: string;
  currentStartTime?: string;
  currentEndTime?: string;
  currentFromDate?: string;
  requestedNewDate?: string;
  requestedNewStartTime?: string;
  requestedNewEndTime?: string;
  requestedNewToDate?: string;
  reason: string;
  status: string;
  requestedAt: string;
}

export interface NCR {
  id: string;
  ncrNumber: string;
  title: string;
  description: string;
  status: string;
  department: string;
  auditDepartment?: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForumMessage {
  id: string;
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictCheckParams {
  auditorId: string | number;
  auditeeId: string | number;
  scheduledDate: string;
  timeSlot: string;
  planYear: number;
  excludeScheduleId?: string | number | null;
}

export interface AuditResponse {
  id?: string | number;
  checkSheet?: { id: string | number; processName?: string } | null;
  checkSheetId?: string | number;
  auditScheduleId?: string | number | null;
  department?: string;
  shift?: string;
  auditDate?: string;
  auditorName?: string;
  auditorId?: number | null;
  auditeeId?: number | null;
  auditeeName?: string;
  auditeeIds?: any[];
  auditeeAcknowledged?: boolean;
  answers: string | Record<string, any>;
  totalScore?: number | null;
  maxPossibleScore?: number | null;
  percentageScore?: number | null;
  summary?: string | null;
  recommendations?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerComments?: string;
  approved?: boolean;

  // ✅ ADD THESE NEW FIELDS FOR EVIDENCE
  evidences?: EvidenceFile[]; // Array of evidence files
}

// Add near the top of the file (after api client)
// Robust unwrap: handles raw arrays, Spring Page ({content}), and common envelopes
const ensureArray = <T>(v: any): T[] => {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.content)) return v.content;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.results)) return v.results;
  if (Array.isArray(v.ncrs)) return v.ncrs;
  if (Array.isArray(v.responses)) return v.responses;
  if (Array.isArray(v.schedules)) return v.schedules;
  return [];
};

// ✅ ADD THIS INTERFACE - Evidence Upload Request
export interface EvidenceUploadRequest {
  questionSlNo: number;
  type: "image" | "video" | "audio" | "report";
  uri: string;
  name: string;
  quality?: string;
  capturedAt: string;
}

// ✅ ADD THIS INTERFACE - Evidence File Response
export interface EvidenceFile {
  id?: string | number;
  questionSlNo: number;
  evidenceType: "image" | "video" | "audio" | "report";
  fileName: string;
  filePath?: string;
  quality?: string;
  capturedAt: string;
  uploadedAt?: string;
  fileSize?: number;
  mimeType?: string;
  uri?: string;
}

// ============================================================================
// EVIDENCE HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a file URI to Base64 data URI
 * This is useful for React Native when you need to upload files
 */
export const fileToBase64 = async (uri: string): Promise<string> => {
  // This function would need to be implemented differently for React Native vs Web
  // For React Native, you might use react-native-fs or expo-file-system
  // For Web, you can use fetch or FileReader

  if (Platform.OS === "web") {
    // Web implementation
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // React Native implementation - you'll need to import a library
    // For expo: import * as FileSystem from 'expo-file-system';
    // const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    // return `data:image/jpeg;base64,${base64}`;
    throw new Error("Platform not supported");
  }
};

/**
 * Extract evidence from answers object
 */
export const extractEvidences = (
  answers: Record<string, any>,
): EvidenceFile[] => {
  const evidences: EvidenceFile[] = [];

  if (answers.evidences) {
    for (const questionKey in answers.evidences) {
      const evidenceData = answers.evidences[questionKey];
      evidences.push({
        questionSlNo: parseInt(questionKey, 10),
        evidenceType: evidenceData.type,
        fileName:
          evidenceData.name ||
          `evidence_${Date.now()}.${getFileExtension(evidenceData.type)}`,
        quality: evidenceData.quality,
        capturedAt: evidenceData.capturedAt || new Date().toISOString(),
        uri: evidenceData.uri,
        // Add other fields as needed
      });
    }
  }

  return evidences;
};

/**
 * Get file extension based on evidence type
 */
const getFileExtension = (type: string): string => {
  switch (type) {
    case "image":
      return "jpg";
    case "video":
      return "mp4";
    case "audio":
      return "m4a";
    default:
      return "bin";
  }
};

/**
 * Validate evidence data before upload
 */
export const validateEvidence = (evidence: {
  type: string;
  uri: string;
  name?: string;
  capturedAt?: string;
}): boolean => {
  // Check if required fields are present
  if (!evidence.type || !evidence.uri) {
    console.error("Evidence missing required fields:", evidence);
    return false;
  }

  // Check if type is valid
  if (!["image", "video", "audio"].includes(evidence.type)) {
    console.error("Invalid evidence type:", evidence.type);
    return false;
  }

  // Check if URI is valid (not empty)
  if (evidence.uri.trim().length === 0) {
    console.error("Evidence URI is empty");
    return false;
  }

  return true;
};

/**
 * Prepare evidence for API submission
 */
// In app/services/auditScheduleApi.ts

/**
 * Prepare evidence for API submission with blob URL conversion
 */
export const prepareEvidenceForApi = async (
  questionSlNo: number,
  evidence: {
    type: "image" | "video" | "audio";
    uri: string;
    name: string;
    quality?: string;
    capturedAt: string;
  },
): Promise<any> => {
  if (!validateEvidence(evidence)) {
    throw new Error(`Invalid evidence for question ${questionSlNo}`);
  }

  let processedUri = evidence.uri;

  // ✅ 1. Convert Web blob URLs to Base64
  if (Platform.OS === "web" && evidence.uri.startsWith("blob:")) {
    try {
      const response = await fetch(evidence.uri);
      const blob = await response.blob();
      processedUri = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      console.log(`✅ Converted web blob to base64 for ${evidence.name}`);
    } catch (error) {
      console.error("Failed to convert web blob to base64:", error);
    }
  }
  // ✅ 2. Convert Native local URIs (file://, content://, etc.) to Base64
  else if (
    Platform.OS !== "web" &&
    !evidence.uri.startsWith("data:") &&
    !evidence.uri.startsWith("http")
  ) {
    try {
      const FileSystem = require("expo-file-system/legacy");

      // ✅ CRITICAL FIX: Check file size BEFORE Base64 conversion to prevent Android OOM crashes
      const fileInfo = await FileSystem.getInfoAsync(evidence.uri);
      if (fileInfo.exists && fileInfo.size) {
        const sizeInMB = fileInfo.size / (1024 * 1024);
        // Base64 adds ~33% overhead. A 20MB file becomes a ~26MB string.
        // Limit to 20MB to prevent JS Heap OOM crashes on Android.
        if (sizeInMB > 20) {
          throw new Error(
            `Video is too large (${sizeInMB.toFixed(1)}MB). Please record a shorter video (max 30s).`,
          );
        }
      }

      const base64 = await FileSystem.readAsStringAsync(evidence.uri, {
        encoding: "base64", // Must be exact string literal
      });

      const mimeType =
        evidence.type === "image"
          ? "image/jpeg"
          : evidence.type === "video"
            ? "video/mp4"
            : "audio/m4a";

      processedUri = `data:${mimeType};base64,${base64}`;
      console.log(`✅ Converted native file to base64 for ${evidence.name}`);
    } catch (error: any) {
      console.error("Failed to convert native file to base64:", error);
      // ✅ Throw error so UI can catch it and show a Toast instead of failing silently
      throw new Error(
        `Failed to process ${evidence.type}: ${error.message || "File may be too large or invalid URI"}`,
      );
    }
  }

  return {
    questionSlNo,
    type: evidence.type,
    uri: processedUri, // This will now be a valid Base64 string
    name: evidence.name,
    quality: evidence.quality || "480p",
    capturedAt: evidence.capturedAt || new Date().toISOString(),
  };
};

// ============================================================================
// HELPER TYPE FOR API RESPONSE
// ============================================================================
type ApiResponse<T = any> = Promise<AxiosResponse<T>>;

// ============================================================================
// AUDIT SCHEDULE API
// ============================================================================

export const auditScheduleApi = {
  // ========== USER MANAGEMENT ==========
  getUsers: (): ApiResponse<User[]> => api.get("/users"),

  // Get ALL auditors (both AUDITOR and LEAD_AUDITOR)
  getAuditors: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter(
      (u: User) => u.role === "AUDITOR" || u.role === "LEAD_AUDITOR",
    );
  },

  // Get ONLY AUDITEE role (NOT HOD)
  getAuditees: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter((u: User) => u.role === "AUDITEE");
  },

  // Get LEAD AUDITORS only
  getLeadAuditors: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter((u: User) => u.role === "LEAD_AUDITOR");
  },

  // Get REGULAR AUDITORS only
  getRegularAuditors: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter((u: User) => u.role === "AUDITOR");
  },

  // Get all auditors (both LEAD and REGULAR)
  getAllAuditors: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter(
      (u: User) => u.role === "AUDITOR" || u.role === "LEAD_AUDITOR",
    );
  },

  // Get auditees list (only AUDITEE role)
  getAuditeesList: async (): Promise<User[]> => {
    const response: AxiosResponse<User[]> = await api.get("/users");
    return response.data.filter((u: User) => u.role === "AUDITEE");
  },

  // ========== FORUM APIs ==========
  createOrGetForum: (
    auditId: string | number,
    data: { groupName: string; members: string[] },
  ): ApiResponse<any> => api.post(`/forum/audit/${auditId}/init`, data),

  addForumMembers: (
    groupId: string,
    memberEmails: string[],
  ): ApiResponse<any> =>
    api.post(`/forum/groups/${groupId}/members`, { members: memberEmails }),

  getForumDetails: (groupId: string): ApiResponse<any> =>
    api.get(`/forum/groups/${groupId}`),

  updateForumSettings: (
    groupId: string,
    settings: { notificationsEnabled?: boolean; isLocked?: boolean },
  ): ApiResponse<any> => api.put(`/forum/groups/${groupId}/settings`, settings),

  removeForumMember: (groupId: string, memberEmail: string): ApiResponse<any> =>
    api.delete(
      `/forum/groups/${groupId}/members/${encodeURIComponent(memberEmail)}`,
    ),

  getForumMessages: (
    groupId: string,
    page: number = 1,
    limit: number = 50,
  ): ApiResponse<ForumMessage[]> =>
    api.get(`/forum/groups/${groupId}/messages`, { params: { page, limit } }),

  getNCRForumDetails: (groupId: string): Promise<any> =>
    api.get(`/forum/groups/${groupId}`).then((r: AxiosResponse) => r.data),

  sendForumMessage: (
    groupId: string,
    content: string,
    authorEmail: string,
    authorName: string,
  ): ApiResponse<any> =>
    api.post(`/forum/groups/${groupId}/messages`, {
      content,
      authorEmail,
      authorName,
    }),

  // ========== CONFLICT DETECTION APIs ==========
  checkConflict: (params: ConflictCheckParams): ApiResponse<any> =>
    api.get("/audit-schedule/check-conflict", { params }),

  // ========== INDIVIDUAL SCHEDULE APPROVAL METHODS ==========
  submitScheduleForApproval: (
    scheduleId: string | number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/schedule/${scheduleId}/submit?userId=${userId}`,
      {},
    ),

  approveSchedule: (
    scheduleId: string | number,
    userId: string | number,
    comments?: string,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/schedule/${scheduleId}/approve?userId=${userId}`,
      { comments },
    ),

  rejectSchedule: (
    scheduleId: string | number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/schedule/${scheduleId}/reject?userId=${userId}`, {
      reason,
    }),

  requestChanges: async (
    scheduleId: string | number,
    userId: string | number,
    reason: string,
  ) => {
    const response = await axios.post(
      `/audit-schedule/${scheduleId}/request-changes`,
      { reason },
      { params: { userId } },
    );
    return response.data;
  },

  // ========== DATE-WISE APPROVAL METHODS ==========
  submitDateForApproval: (
    year: number,
    month: number,
    date: number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/date/${year}/${month}/${date}/submit?userId=${userId}`,
      {},
    ),

  approveDateSchedule: (
    year: number,
    month: number,
    date: number,
    userId: string | number,
    comments?: string,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/date/${year}/${month}/${date}/approve?userId=${userId}`,
      { comments },
    ),

  rejectDateSchedule: (
    year: number,
    month: number,
    date: number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/date/${year}/${month}/${date}/reject?userId=${userId}`,
      { reason },
    ),

  // ✅ NEW: Auditor's own checksheets for a year (array — for dashboard)
  getAuditorResponsesByYear: async (
    auditorId: string | number,
    year: number,
  ): Promise<AuditResponse[]> => {
    const response = await api.get(
      `/templates/responses/auditor/${auditorId}/year/${year}`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  // ✅ NEW: Auditee's own checksheets for a year (array — for dashboard)
  getAuditeeResponsesByYear: async (
    auditeeId: string | number,
    year: number,
  ): Promise<AuditResponse[]> => {
    const response = await api.get(
      `/templates/responses/auditee/${auditeeId}/year/${year}`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  // ✅ NEW: Paginated version — for admin tables later
  getAuditorResponsesByYearPaginated: async (
    auditorId: string | number,
    year: number,
    page: number = 0,
    size: number = 20,
  ): Promise<{
    content: AuditResponse[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await api.get(
      `/templates/responses/auditor/${auditorId}/year/${year}/paginated`,
      { params: { page, size } },
    );
    return response.data;
  },

  getAuditeeResponsesByYearPaginated: async (
    auditeeId: string | number,
    year: number,
    page: number = 0,
    size: number = 20,
  ): Promise<{
    content: AuditResponse[];
    totalElements: number;
    totalPages: number;
  }> => {
    const response = await api.get(
      `/templates/responses/auditee/${auditeeId}/year/${year}/paginated`,
      { params: { page, size } },
    );
    return response.data;
  },

  // ========== DATE-BASED SCHEDULES ==========
  getDateSchedulesByMonth: (
    year: number,
    month: string | number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.get(`/audit-schedule/date-schedules/${year}/${month}`, {
      params: { userId },
    }),

  submitDetailedSchedule: (
    year: number,
    month: number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(
      `/audit-schedule/detailed/${year}/${month}/submit?userId=${userId}`,
      {},
    ),

  saveDetailedSchedule: (
    data: any,
    userId: string | number,
  ): ApiResponse<any> => {
    console.log("Sending to backend:", data);
    return api.post(`/audit-schedule/save-detailed?userId=${userId}`, data);
  },

  updateDetailedSchedule: (
    id: string | number,
    data: any,
    userId: string | number,
  ): ApiResponse<any> => {
    console.log("Updating detailed schedule:", id, data);
    return api.put(`/audit-schedule/detailed/${id}?userId=${userId}`, data);
  },

  getAvailableTimeSlots: (date: string): ApiResponse<any> =>
    api.get(`/audit-schedule/available-time-slots/${date}`),

  // ========== DETAILED SCHEDULE APIs ==========
  getDetailedSchedules: (year: number): ApiResponse<any> =>
    api.get(`/audit-schedule/detailed/${year}`),

  getDetailedSchedulesByMonth: (
    year: number,
    month: number,
  ): ApiResponse<any> => api.get(`/audit-schedule/detailed/${year}/${month}`),

  downloadDetailedViewPdf: (
    year: number,
    month: number,
    params: any = {},
  ): Promise<AxiosResponse<Blob>> =>
    api.get(`/audit-detailed-view/${year}/${month}/download`, {
      params,
      responseType: "blob",
    }),

  getPendingRequests: (): ApiResponse<PendingRequest[]> =>
    api.get("/audit-schedule/pending-requests"),
  // ========== SCHEDULE CRUD ==========
  getByYear: (
    year: number,
    userId?: string | number,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(`/audit-schedule/year/${year}`, {
      params: userId ? { userId } : undefined,
    }),

  getByYearAndMonth: (
    year: number,
    month: string | number,
    userId?: string | number,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(`/audit-schedule/year/${year}/month/${month}`, {
      params: userId ? { userId } : undefined,
    }),
  getByYearMonthAndDepartment: (
    year: number,
    month: string | number,
    department: string,
    userId?: string | number,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(
      `/audit-schedule/year/${year}/month/${month}/department/${encodeURIComponent(department)}`,
      { params: userId ? { userId } : undefined },
    ),
  getSchedulesWithStatus: (
    userId: string | number,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(`/audit-schedule/auditor/${userId}/schedules-with-status`),

  create: (
    data: Partial<AuditSchedule>,
    userId: string | number,
  ): ApiResponse<AuditSchedule> =>
    api.post(`/audit-schedule/create?userId=${userId}`, data),

  update: (
    id: string | number,
    data: Partial<AuditSchedule>,
  ): ApiResponse<AuditSchedule> => api.put(`/audit-schedule/${id}`, data),

  delete: (id: string | number): ApiResponse<any> =>
    api.delete(`/audit-schedule/${id}`),

  updateStatus: (id: string | number, status: string): ApiResponse<any> =>
    api.put(`/audit-schedule/${id}/status?status=${status}`, {}),

  // ========== AVAILABLE DATA APIs ==========
  // ========== AVAILABLE DATA APIs ==========
  getAvailableMonths: (
    year: number,
    userId: string | number,
  ): ApiResponse<any[]> =>
    api.get(`/audit-schedule/available-months/${year}`, {
      params: { userId },
    }),
  getAvailableDepartments: (
    year: number,
    month: string | number,
    userId: string | number,
  ): ApiResponse<string[]> =>
    api.get(`/audit-schedule/available-departments/${year}/${month}`, {
      params: { userId },
    }),

  getAuditElements: (
    year: number,
    month: string | number,
    department: string,
    userId: string | number,
  ): ApiResponse<any[]> =>
    api.get(
      `/audit-schedule/audit-elements/${year}/${month}/${encodeURIComponent(department)}`,
      { params: { userId } },
    ),

  getSummary: (
    year: number,
    month: string | number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.get(`/audit-schedule/summary/${year}/${month}`, {
      params: { userId },
    }),
  // ========== DEPARTMENT & COMPETENCY APIs ==========
  getAuditorCompetencyStatus: async (
    auditorId: string | number,
    department: string,
    auditElements: string[],
    auditType?: string, // ✅ ADD
  ): Promise<any> => {
    const response = await api.get(
      `/audit-schedule/auditor-competency-status/${auditorId}`,
      {
        params: {
          department,
          auditElements: JSON.stringify(auditElements),
          ...(auditType ? { auditType } : {}),
        },
      },
    );
    return response.data;
  },

  getCompetentAuditeesByDepartment: async (
    department: string,
    plantId: string | number,
    auditElements: string[] = [],
    auditType?: string,
  ): Promise<User[]> => {
    if (!auditElements || auditElements.length === 0) {
      console.log(
        "⚠️ getCompetentAuditeesByDepartment: no elements → returning []",
      );
      return [];
    }

    // ✅ Department as QUERY param — avoids %2F routing problems for "QA/QC", "IMS (BE)", etc.
    const response = await api.get(
      "/audit-schedule/competent-auditees/by-department",
      {
        params: {
          department,
          plantId,
          auditElementsJson: JSON.stringify(auditElements),
          ...(auditType ? { auditType } : {}),
        },
      },
    );

    return Array.isArray(response.data) ? response.data : [];
  },
  getLeadAuditorsByDepartment: async (department: string): Promise<User[]> => {
    const response = await api.get(
      `/audit-schedule/lead-auditors/by-department/${encodeURIComponent(department)}`,
    );
    return response.data;
  },

  /** ✅ NEW: Get both lead + regular auditors for a department */
  getAuditorsByDepartment: async (department: string): Promise<User[]> => {
    const response = await api.get(
      `/audit-schedule/auditors/by-department/${encodeURIComponent(department)}`,
    );
    return response.data;
  },

  getRegularAuditorsByDepartment: async (
    department: string,
  ): Promise<User[]> => {
    const response = await api.get(
      `/audit-schedule/regular-auditors/by-department/${encodeURIComponent(department)}`,
    );
    return response.data;
  },
  getUsersByIds: async (ids: number[]): Promise<User[]> => {
    if (!ids || ids.length === 0) return [];
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", String(id)));
    const res = await api.get(
      `/api/audit-schedule/users/by-ids?${params.toString()}`,
    );
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },

  getAuditeesByDepartment: async (
    department: string,
    plantId: string | number,
  ): Promise<User[]> => {
    console.warn(
      "⚠️ getAuditeesByDepartment is DEPRECATED — returns UNFILTERED auditees. " +
        "Use getCompetentAuditeesByDepartment instead.",
    );
    const response = await api.get(
      `/audit-schedule/auditees/by-department/${encodeURIComponent(department)}`,
      { params: { plantId } },
    );
    return ensureArray<User>(response.data);
  },

  getFullyCompetentAuditors: async (
    auditElements: string[],
    planYear: number,
    month: string,
    plantId: string | number,
    excludeAuditorId?: string | number,
    auditType?: string, // ✅ ADD
  ): Promise<User[]> => {
    const response = await api.get(
      "/audit-schedule/fully-competent-auditors/for-schedule",
      {
        params: {
          auditElements: JSON.stringify(auditElements),
          planYear,
          month,
          plantId,
          ...(excludeAuditorId ? { excludeAuditorId } : {}),
          ...(auditType ? { auditType } : {}), // ✅ ADD
        },
      },
    );

    // ✅ SAFETY: Backend MUST return only competent auditors.
    // If backend is buggy and returns everyone, filter defensively? NO —
    // trust backend. But ensure we always return an array.
    return Array.isArray(response.data) ? response.data : [];
  },

  getDepartmentMapping: async (department: string): Promise<any> => {
    const response = await api.get(
      `/audit-schedule/department-mapping/${encodeURIComponent(department)}`,
    );
    return response.data;
  },

  // ========== APPROVAL WORKFLOW ==========
  submitForApproval: (
    year: number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/submit?userId=${userId}`, {}),

  submitMonth: (
    year: number,
    month: string | number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/${month}/submit?userId=${userId}`, {}),

  approvePlan: (
    year: number,
    userId: string | number,
    comments?: string,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/approve?userId=${userId}`, { comments }),

  approveMonth: (
    year: number,
    month: number,
    userId: string | number,
    comments?: string,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/${month}/approve?userId=${userId}`, {
      comments,
    }),

  rejectPlan: (
    year: number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/reject?userId=${userId}`, { reason }),

  rejectMonth: (
    year: number,
    month: number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(`/audit-schedule/${year}/${month}/reject?userId=${userId}`, {
      reason,
    }),

  // ========== DOCUMENT OPERATIONS ==========
  saveDocument: (data: any, userId: string | number): ApiResponse<any> =>
    api.post(`/audit-schedule/save-document?userId=${userId}`, data),

  saveMonthDocument: (data: any, userId: string | number): ApiResponse<any> =>
    api.post(`/audit-schedule/save-month-document?userId=${userId}`, data),

  // ========== AUDIT RESPONSE APIs (Check Sheet Forms) ==========

  saveAuditResponse: (
    responseData: AuditResponse,
  ): ApiResponse<AuditResponse> => {
    console.log(
      "Saving audit response to:",
      `${API_BASE_URL}/templates/responses`,
    );
    return api.post("/templates/responses", responseData);
  },

  updateAuditResponse: (
    responseId: string | number,
    responseData: Partial<AuditResponse>,
  ): ApiResponse<AuditResponse> => {
    console.log("Updating audit response:", responseId);
    const updateData = {
      answers:
        typeof responseData.answers === "string"
          ? responseData.answers
          : JSON.stringify(responseData.answers),
    };
    return api.put(`/templates/responses/${responseId}`, updateData);
  },

  submitAuditResponse: (
    responseId: string | number,
  ): ApiResponse<AuditResponse> => {
    console.log("Submitting audit response:", responseId);
    return api.put(`/templates/responses/${responseId}/submit`, {});
  },

  getAuditResponse: (
    responseId: string | number,
  ): ApiResponse<AuditResponse> => {
    console.log("Getting audit response:", responseId);
    return api.get(`/templates/responses/${responseId}`);
  },

  getAuditResponsesByCheckSheet: (
    checkSheetId: string | number,
  ): ApiResponse<AuditResponse[]> => {
    console.log("Fetching audit responses by check sheet:", checkSheetId);
    return api.get(`/templates/responses/check-sheet/${checkSheetId}`);
  },

  getAuditResponsesBySchedule: (
    auditScheduleId: string | number,
  ): ApiResponse<AuditResponse[]> => {
    console.log("Fetching audit responses by schedule:", auditScheduleId);
    return api.get(`/templates/responses/schedule/${auditScheduleId}`);
  },

  getAllAuditResponses: async (): Promise<AxiosResponse<AuditResponse[]>> => {
    console.log("Fetching all audit responses");
    try {
      const response = await api.get("/templates/responses");
      return {
        ...response,
        data: ensureArray<AuditResponse>(response.data),
      } as AxiosResponse<AuditResponse[]>;
    } catch (error) {
      console.error("Error fetching all responses:", error);
      try {
        const fallbackResponse = await api.get(
          "/templates/responses/check-sheet/1",
        );
        return {
          ...fallbackResponse,
          data: ensureArray<AuditResponse>(fallbackResponse.data),
        } as AxiosResponse<AuditResponse[]>;
      } catch {
        throw error;
      }
    }
  },

  reviewAuditResponse: (
    responseId: string | number,
    comments: string,
    approved: boolean,
  ): ApiResponse<AuditResponse> => {
    return api.put(`/templates/responses/${responseId}/review`, {
      comments,
      approved,
    });
  },
  // ========== EVIDENCE APIs ==========

  // Upload evidence for a response
  uploadEvidence: async (
    responseId: string | number,
    questionSlNo: number,
    evidenceData: {
      type: "image" | "video" | "audio";
      uri: string;
      name: string;
      quality?: string;
      capturedAt: string;
    },
  ): Promise<any> => {
    console.log(
      `📤 Uploading evidence (JSON) for response ${responseId}, question ${questionSlNo}, file: ${evidenceData.name}`,
    );

    return api.post(
      `/templates/responses/${responseId}/evidence/single`,
      {
        questionSlNo,
        type: evidenceData.type,
        uri: evidenceData.uri, // This is now the Base64 string
        name: evidenceData.name,
        quality: evidenceData.quality || "480p",
        capturedAt: evidenceData.capturedAt,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 120000, // 2 minutes for large videos
      },
    );
  },

  // Get all evidence for a response
  getEvidenceForResponse: (
    responseId: string | number,
  ): ApiResponse<EvidenceFile[]> => {
    console.log(`Getting evidence for response ${responseId}`);
    return api.get(`/templates/responses/${responseId}/evidence`);
  },

  // Get evidence for a specific question
  getEvidenceForQuestion: (
    responseId: string | number,
    questionSlNo: number,
  ): ApiResponse<EvidenceFile[]> => {
    console.log(
      `Getting evidence for response ${responseId}, question ${questionSlNo}`,
    );
    return api.get(
      `/templates/responses/${responseId}/evidence/question/${questionSlNo}`,
    );
  },

  // Delete evidence for a specific question
  deleteEvidenceForQuestion: (
    responseId: string | number,
    questionSlNo: number,
  ): ApiResponse<void> => {
    console.log(
      `Deleting evidence for response ${responseId}, question ${questionSlNo}`,
    );
    return api.delete(
      `/templates/responses/${responseId}/evidence/question/${questionSlNo}`,
    );
  },

  // Delete specific evidence by ID
  deleteEvidenceById: (evidenceId: string | number): ApiResponse<void> => {
    console.log(`Deleting evidence ${evidenceId}`);
    return api.delete(`/templates/responses/evidence/${evidenceId}`);
  },

  // In auditScheduleAPI.ts - bulkUploadEvidence
  bulkUploadEvidence: (
    responseId: string | number,
    evidences: {
      questionSlNo: number;
      type: "image" | "video" | "audio";
      uri: string;
      name: string;
      quality?: string;
      capturedAt: string;
    }[],
  ): ApiResponse<EvidenceFile[]> => {
    console.log(
      `Bulk uploading ${evidences.length} evidence files for response ${responseId}`,
    );

    // ✅ Wrap in the expected format
    return api.post(`/templates/responses/${responseId}/evidence/bulk`, {
      evidences: evidences, // This matches BulkEvidenceUploadRequest
    });
  },

  // Inside your auditScheduleApi object/class

  // ========== LEAD AUDITOR FEASIBILITY METHODS ==========
  // ========== LEAD AUDITOR FEASIBILITY METHODS ==========

  confirmFeasibility: async (
    year: number,
    month: string,
    userId: string | number,
    comments?: string,
  ) => {
    const response = await api.post(
      `/audit-schedule/${year}/${month}/confirm-feasibility`,
      { comments: comments || "" },
      { params: { userId } },
    );
    return response.data;
  },

  rejectFeasibility: async (
    year: number,
    month: string,
    userId: string | number,
    reason: string,
  ) => {
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required");
    }
    const response = await api.post(
      `/audit-schedule/${year}/${month}/reject-feasibility`,
      { reason },
      { params: { userId } },
    );
    return response.data;
  },

  getPendingLaConfirmations: async (year: number, userId: string | number) => {
    const response = await api.get(
      `/audit-schedule/pending-la-confirmations/${year}`,
      { params: { userId } },
    );
    return response.data;
  },

  // ========== DAILY SCHEDULE — LA FEASIBILITY ==========

  /** LA: Get daily schedules pending feasibility (summary, grouped by month) */
  getPendingDailyLaConfirmations: async (
    year: number,
    userId: string | number,
  ) => {
    const response = await api.get(
      `/audit-schedule/pending-daily-la-confirmations/${year}`,
      { params: { userId } },
    );
    return response.data;
  },

  /** LA: Get daily schedules pending feasibility (full DTOs) */
  getPendingDailyLaConfirmationsDetailed: async (
    year: number,
    userId: string | number,
  ) => {
    const response = await api.get(
      `/audit-schedule/pending-daily-la-confirmations/${year}/detailed`,
      { params: { userId } },
    );
    return response.data;
  },

  /** LA: Confirm ALL daily schedules in a month */
  confirmDailyFeasibilityMonth: async (
    year: number,
    month: string,
    userId: string | number,
    comments?: string,
  ) => {
    const response = await api.post(
      `/audit-schedule/detailed/${year}/${month}/confirm-feasibility`,
      { comments: comments || "" },
      { params: { userId } },
    );
    return response.data;
  },

  /** LA: Reject ALL daily schedules in a month */
  rejectDailyFeasibilityMonth: async (
    year: number,
    month: string,
    userId: string | number,
    reason: string,
  ) => {
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required");
    }
    const response = await api.post(
      `/audit-schedule/detailed/${year}/${month}/reject-feasibility`,
      { reason },
      { params: { userId } },
    );
    return response.data;
  },

  /** LA: Confirm a SINGLE daily schedule */
  confirmSingleDailyFeasibility: async (
    scheduleId: string | number,
    userId: string | number,
    comments?: string,
  ) => {
    const response = await api.post(
      `/audit-schedule/daily-schedule/${scheduleId}/confirm-feasibility`,
      { comments: comments || "" },
      { params: { userId } },
    );
    return response.data;
  },

  /** LA: Reject a SINGLE daily schedule */
  rejectSingleDailyFeasibility: async (
    scheduleId: string | number,
    userId: string | number,
    reason: string,
  ) => {
    if (!reason || !reason.trim()) {
      throw new Error("Rejection reason is required");
    }
    const response = await api.post(
      `/audit-schedule/daily-schedule/${scheduleId}/reject-feasibility`,
      { reason },
      { params: { userId } },
    );
    return response.data;
  },

  /** TM: Get all pending date approvals (daily schedules awaiting TM approval) */
  getPendingDateApprovals: async (year: number, userId: string | number) => {
    const response = await api.get(
      `/audit-schedule/pending-date-approvals/${year}`,
      { params: { userId } },
    );
    return response.data;
  },

  // ========== PLANTS API ==========
  getPlants: async (): Promise<any[]> => {
    try {
      const response = await api.get("/plants");
      return response.data;
    } catch (error: any) {
      console.warn("⚠️ /api/plants not found, using fallback plants list");
      // Fallback: return hardcoded plants so UI still works
      return [
        { id: 1, name: "Bangalore Plant", code: "PLT_BLR" },
        { id: 2, name: "Chennai Plant", code: "PLT_CHN" },
        { id: 3, name: "Pune Plant", code: "PLT_PUN" },
      ];
    }
  },
};

// ============================================================================
// AUDIT PLAN API (Form 3)
// ============================================================================

export const auditPlanApi = {
  // ✅ GET — userId required
  getPlanByYear: (year: number, userId: string | number): ApiResponse<any> =>
    api.get(`/audit-plan/${year}`, { params: { userId } }),

  // ✅ SAVE — userId required
  savePlan: (data: any, userId: string | number): ApiResponse<any> =>
    api.post(`/audit-plan/save`, data, { params: { userId } }),

  // ✅ MONTH STATUS — userId required
  updateMonthStatus: (data: any, userId: string | number): ApiResponse<any> =>
    api.put(`/audit-plan/status`, data, { params: { userId } }),

  // ✅ PLANNED MONTHS LOOKUP — userId required
  getPlannedMonths: (year: number, userId: string | number): ApiResponse<any> =>
    api.get(`/audit-plan/${year}/planned-months`, { params: { userId } }),

  // ✅ PLANNED AUDIT ELEMENTS LOOKUP — userId required
  getAuditElements: (year: number, userId: string | number): ApiResponse<any> =>
    api.get(`/audit-plan/${year}/audit-elements`, { params: { userId } }),

  // ✅ SUBMIT — userId required
  submitForApproval: (
    year: number,
    userId: string | number,
  ): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/submit`, {}, { params: { userId } }),

  // ✅ APPROVE — userId required
  approvePlan: (
    year: number,
    userId: string | number,
    comments?: string,
  ): ApiResponse<any> =>
    api.post(
      `/audit-plan/${year}/approve`,
      { comments },
      { params: { userId } },
    ),

  // ✅ REJECT — userId required
  rejectPlan: (
    year: number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/reject`, { reason }, { params: { userId } }),

  // ✅ REQUEST CHANGES — userId required
  requestChanges: (
    year: number,
    userId: string | number,
    reason: string,
  ): ApiResponse<any> =>
    api.post(
      `/audit-plan/${year}/request-changes`,
      { reason },
      { params: { userId } },
    ),

  // ✅ RESUBMIT — userId required
  resubmitPlan: (year: number, userId: string | number): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/resubmit`, {}, { params: { userId } }),

  // ✅ PDF EXPORT URL — now includes userId
  getPdfUrl: (year: number, userId: string | number): string =>
    `${API_BASE_URL}/audit-plan/${year}/export-pdf?userId=${userId}`,
};

// ============================================================================
// DEPARTMENT PLAN API (Form 4)
// ============================================================================

export const departmentPlanApi = {
  getPlanByYear: (year: number): ApiResponse<any> =>
    api.get(`/department-plan/${year}`),

  savePlan: (data: any): ApiResponse<any> => api.post("/department-plan", data),

  updatePlan: (id: string | number, data: any): ApiResponse<any> =>
    api.put(`/department-plan/${id}`, data),

  submitForApproval: (year: number): ApiResponse<any> =>
    api.post(`/department-plan/${year}/submit`, {}),

  approvePlan: (year: number, comments?: string): ApiResponse<any> =>
    api.post(`/department-plan/${year}/approve`, { comments }),

  rejectPlan: (year: number, reason: string): ApiResponse<any> =>
    api.post(`/department-plan/${year}/reject`, { reason }),
};

// ============================================================================
// NCR API
// ============================================================================

export const ncrApi = {
  getAllNCRs: async (): Promise<AxiosResponse<NCR[]>> => {
    const res = await api.get("/ncr/all");
    return {
      ...res,
      data: ensureArray<NCR>(res.data),
    } as AxiosResponse<NCR[]>;
  },

  getNCRById: (id: string): ApiResponse<NCR> => api.get(`/ncr/${id}`),

  getNCRByAuditId: (auditId: string): ApiResponse<NCR[]> =>
    api.get(`/ncr/audit/${auditId}`),

  createNCR: (data: Partial<NCR>): ApiResponse<NCR> => api.post("/ncr", data),

  updateNCR: (id: string, data: Partial<NCR>): ApiResponse<NCR> =>
    api.put(`/ncr/${id}`, data),

  deleteNCR: (id: string): ApiResponse<any> => api.delete(`/ncr/${id}`),

  submitForVerification: (id: string): ApiResponse<NCR> =>
    api.post(`/ncr/${id}/submit`, {}),

  verifyNCR: (
    id: string,
    data: { comments: string; approved: boolean },
  ): ApiResponse<NCR> => api.post(`/ncr/${id}/verify`, data),

  closeNCR: (id: string): ApiResponse<NCR> => api.post(`/ncr/${id}/close`, {}),
};

// ============================================================================
// EXPORT ALL
// ============================================================================

// ============================================================================
// FORUM API - Separate Export
// ============================================================================

export const forumApi = {
  create8DGroup: (data: {
    groupId: string;
    groupName: string;
    description: string;
    createdBy: string;
    members: string[];
    plantId?: string | null; // 👈 ADD
    plantName?: string | null; // 👈 ADD
  }) => api.post("/forum/8d/groups", data),

  get8DGroup: (groupId: string) => api.get(`/forum/8d/groups/${groupId}`),

  addMembers: (groupId: string, members: string[]) =>
    api.post(`/forum/8d/groups/${groupId}/members`, { members }),

  removeMember: (groupId: string, email: string) =>
    api.delete(
      `/forum/8d/groups/${groupId}/members/${encodeURIComponent(email)}`,
    ),

  getMessages: (groupId: string, page: number = 1, limit: number = 50) =>
    api.get(`/forum/8d/groups/${groupId}/messages`, {
      params: { page, limit },
    }),

  sendMessage: (
    groupId: string,
    data: { content: string; authorEmail: string; authorName: string },
  ) => api.post(`/forum/8d/groups/${groupId}/messages`, data),
};

// ============================================================================
// USER API - Separate Export
// ============================================================================

export const userApi = {
  getAll: () => api.get("/users"),
  getById: (id: string | number) => api.get(`/users/${id}`),
  getByRole: (role: string) =>
    api.get(`/users/role/${encodeURIComponent(role)}`),
  create: (data: any) => api.post("/users", data),
  update: (id: string | number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string | number) => api.delete(`/users/${id}`),
};

// ============================================================
// CHUNKED / SINGLE EVIDENCE UPLOAD (One file at a time)
// ADD THIS ENTIRE BLOCK
// ============================================================

/**
 * Upload a SINGLE evidence file (chunked upload)
 * This prevents timeout issues with large bulk uploads
 */
export const uploadSingleEvidence = async (
  responseId: string | number,
  evidence: EvidenceUploadRequest,
): Promise<{ data: any }> => {
  try {
    const url = `${API_BASE_URL}/templates/responses/${responseId}/evidence/single`;

    // For Web: use fetch directly for better progress tracking
    if (Platform.OS === "web") {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evidence),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Upload failed");
      }

      const data = await response.json();
      return { data };
    }

    // Native: use axios
    const response = await axios.post(url, evidence, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout per file
    });

    return response;
  } catch (error: any) {
    console.error("❌ Single evidence upload failed:", error);
    throw error;
  }
};

/**
 * Upload multiple evidence files ONE AT A TIME (Chunked)
 * This prevents network timeouts and memory issues
 */
export const uploadEvidenceChunked = async (
  responseId: string | number,
  evidences: EvidenceUploadRequest[],
  onProgress?: (
    completed: number,
    total: number,
    current: EvidenceUploadRequest,
  ) => void,
): Promise<{ success: boolean; failed: any[]; uploaded: number }> => {
  const failed: any[] = [];
  let uploaded = 0;
  const total = evidences.length;

  console.log(`📤 Starting chunked upload: ${total} files`);

  // Upload ONE AT A TIME
  for (let i = 0; i < evidences.length; i++) {
    const evidence = evidences[i];

    try {
      console.log(
        `📤 Uploading ${i + 1}/${total}: ${evidence.type} - ${evidence.name}`,
      );

      await uploadSingleEvidence(responseId, evidence);
      uploaded++;

      // Call progress callback
      if (onProgress) {
        onProgress(uploaded, total, evidence);
      }
    } catch (error) {
      console.error(
        `❌ Failed to upload ${evidence.type} for question ${evidence.questionSlNo}:`,
        error,
      );
      failed.push({
        ...evidence,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Continue with next file - don't stop on failure
    }
  }

  console.log(
    `✅ Chunked upload complete: ${uploaded}/${total} files uploaded`,
  );

  return {
    success: failed.length === 0,
    failed,
    uploaded,
  };
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  auditScheduleApi,
  auditPlanApi,
  departmentPlanApi,
  ncrApi,
  forumApi,
  userApi,
  uploadSingleEvidence,
  uploadEvidenceChunked,
  prepareEvidenceForApi,
};
