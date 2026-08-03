// app/services/auditScheduleApi.ts

import { API_BASE_URL } from "@/config/apiConfig";
import axios, { AxiosResponse } from "axios";

// ============================================================================
// BASE URL CONFIGURATION
// ============================================================================
// const getBaseURL = (): string => {
//   if (__DEV__) {
//     return (
//       Platform.select({
//         ios: "http://10.2.0.95:8080/api",
//         android: "http://10.2.0.95:8080/api",
//         default: "http://10.2.0.73:8080/api",
//       }) || "http://10.2.0.73:8080/api"
//     );
//   }
//   return "https://your-production-api.com/api";
// };

// const API_BASE_URL = getBaseURL();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

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
  createdAt?: string; // ✅ ADDED: Fixes the "Property 'createdAt' does not exist" error
  updatedAt?: string; // ✅ ADDED: Good practice for tracking record updates
  submittedAt?: string;
  reviewedAt?: string;
  reviewerComments?: string;
  approved?: boolean;
}

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

  // ========== DATE-BASED SCHEDULES ==========
  getDateSchedulesByMonth: (year: number, month: number): ApiResponse<any> =>
    api.get(`/audit-schedule/date-schedules/${year}/${month}`),

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
  getByYear: (year: number): ApiResponse<AuditSchedule[]> =>
    api.get(`/audit-schedule/year/${year}`),

  getByYearAndMonth: (
    year: number,
    month: number,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(`/audit-schedule/year/${year}/month/${month}`),

  getByYearMonthAndDepartment: (
    year: number,
    month: number,
    department: string,
  ): ApiResponse<AuditSchedule[]> =>
    api.get(
      `/audit-schedule/year/${year}/month/${month}/department/${department}`,
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
  getAvailableMonths: (year: number): ApiResponse<any[]> =>
    api.get(`/audit-schedule/available-months/${year}`),

  getAvailableDepartments: (
    year: number,
    month: number,
  ): ApiResponse<string[]> =>
    api.get(`/audit-schedule/available-departments/${year}/${month}`),

  getAuditElements: (
    year: number,
    month: number,
    department: string,
  ): ApiResponse<any[]> =>
    api.get(`/audit-schedule/audit-elements/${year}/${month}/${department}`),

  getSummary: (year: number, month: number): ApiResponse<any> =>
    api.get(`/audit-schedule/summary/${year}/${month}`),

  // ========== DEPARTMENT & COMPETENCY APIs ==========

  getFullyCompetentAuditors: async (
    department: string,
    auditElements: string[],
    planYear: number,
    month: string,
  ): Promise<User[]> => {
    const response = await api.get(
      "/audit-schedule/fully-competent-auditors/for-schedule",
      {
        params: {
          department,
          auditElements: JSON.stringify(auditElements),
          planYear,
          month,
        },
      },
    );
    return response.data;
  },

  getAuditorCompetencyStatus: async (
    auditorId: string | number,
    department: string,
    auditElements: string[],
  ): Promise<any> => {
    const response = await api.get(
      `/audit-schedule/auditor-competency-status/${auditorId}`,
      {
        params: {
          department,
          auditElements: JSON.stringify(auditElements),
        },
      },
    );
    return response.data;
  },

  getLeadAuditorsByDepartment: async (department: string): Promise<User[]> => {
    const response = await api.get(
      `/audit-schedule/lead-auditors/by-department/${encodeURIComponent(department)}`,
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

  getAuditeesByDepartment: async (department: string): Promise<User[]> => {
    const response = await api.get(
      `/audit-schedule/auditees/by-department/${encodeURIComponent(department)}`,
    );
    return response.data;
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
    month: number,
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
    console.log("Saving audit response to:", `${API_BASE_URL}/templates/responses`);
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
      const response: AxiosResponse<AuditResponse[]> = await api.get(
        "/templates/responses",
      );
      return response;
    } catch (error) {
      console.error("Error fetching all responses:", error);
      // Fallback: try to get by check sheet ID 1
      try {
        const fallbackResponse: AxiosResponse<AuditResponse[]> = await api.get(
          "/templates/responses/check-sheet/1",
        );
        return fallbackResponse;
      } catch (fallbackError) {
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
};

// ============================================================================
// AUDIT PLAN API (Form 3)
// ============================================================================

export const auditPlanApi = {
  getPlanByYear: (year: number): ApiResponse<any> =>
    api.get(`/audit-plan/${year}`),

  savePlan: (data: any): ApiResponse<any> => api.post("/audit-plan", data),

  updatePlan: (id: string | number, data: any): ApiResponse<any> =>
    api.put(`/audit-plan/${id}`, data),

  submitForApproval: (year: number): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/submit`, {}),

  approvePlan: (year: number, comments?: string): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/approve`, { comments }),

  rejectPlan: (year: number, reason: string): ApiResponse<any> =>
    api.post(`/audit-plan/${year}/reject`, { reason }),
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
  getAllNCRs: (): ApiResponse<NCR[]> => api.get("/ncr/all"),

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
};
