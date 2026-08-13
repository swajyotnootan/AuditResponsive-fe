// services/api.ts

import { API_BASE_URL } from '@/config/apiConfig';
import { LoginResponse, User } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ============================================
// ✅ ROLE DEFINITIONS
// ============================================

export const ROLES = {
  MASTER: 'MASTER',
  AUDIT_MANAGER: 'AUDIT_MANAGER',
  LEAD_AUDITOR: 'LEAD_AUDITOR',
  AUDITOR: 'AUDITOR',
  HOD: 'HOD',
  AUDITEE: 'AUDITEE',
  INITIATOR: 'INITIATOR',
  HR_ADMIN: 'HR_ADMIN',
  TOP_MANAGEMENT: 'TOP_MANAGEMENT',
  QMS_ADMIN: 'QMS_ADMIN',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// ============================================
// ✅ ROLE-TO-NAVIGATION MAPPING
// ============================================

export const roleNavigationMap: Record<RoleType, string> = {
  MASTER: '/master-dashboard',
  AUDIT_MANAGER: '/audit-manager',
  LEAD_AUDITOR: '/lead-auditor',
  AUDITOR: '/auditor',
  HOD: '/hod',
  AUDITEE: '/auditee',
  INITIATOR: '/initiator',
  HR_ADMIN: '/hr-admin',
  TOP_MANAGEMENT: '/top-management',
  QMS_ADMIN: '/qms-admin',
};

// ============================================
// ✅ ROLE-TO-LOCATION MAPPING
// ============================================

export const roleLocationMap: Record<RoleType, string> = {
  MASTER: 'Master Dashboard',
  AUDIT_MANAGER: 'Audit Manager Dashboard',
  LEAD_AUDITOR: 'Lead Auditor Dashboard',
  AUDITOR: 'Auditor Dashboard',
  HOD: 'HOD Dashboard',
  AUDITEE: 'Auditee Dashboard',
  INITIATOR: 'Initiator Dashboard',
  HR_ADMIN: 'HR Admin Dashboard',
  TOP_MANAGEMENT: 'Top Management Dashboard',
  QMS_ADMIN: 'QMS Admin Dashboard',
};

// ============================================
// ✅ ROLE-RELATED KEYWORDS FOR SMART FILTERING
// ============================================

export const roleKeywords: Record<RoleType, string[]> = {
  MASTER: ['master', 'admin', 'system'],
  AUDIT_MANAGER: ['manager', 'approval', 'audit manager'],
  LEAD_AUDITOR: ['lead auditor', 'lead', 'auditor'],
  AUDITOR: ['auditor', 'audit'],
  HOD: ['hod', 'head of department', 'department head'],
  AUDITEE: ['auditee', 'audit schedule'],
  INITIATOR: ['initiator', 'form submission'],
  HR_ADMIN: ['hr', 'human resources', 'admin'],
  TOP_MANAGEMENT: ['top management', 'director', 'vp'],
  QMS_ADMIN: ['qms', 'quality'],
};

// ============================================
// ✅ SMART ROLE DETECTION FROM NOTIFICATION
// ============================================

export const detectTargetRole = (notification: any): RoleType | null => {
  // 1. Check if role is explicitly stored
  if (notification.role) {
    const role = notification.role.toUpperCase().trim();
    if (Object.values(ROLES).includes(role as RoleType)) {
      return role as RoleType;
    }
  }

  // 2. Check targetRoles array
  if (notification.targetRoles && Array.isArray(notification.targetRoles)) {
    for (const r of notification.targetRoles) {
      const role = r.toUpperCase().trim();
      if (Object.values(ROLES).includes(role as RoleType)) {
        return role as RoleType;
      }
    }
  }

  // 3. Detect from title
  const title = notification.title?.toLowerCase() || '';
  const message = notification.message?.toLowerCase() || '';
  const combined = `${title} ${message}`;

  for (const [role, keywords] of Object.entries(roleKeywords)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return role as RoleType;
    }
  }

  // 4. Detect from navigation path
  if (notification.navigateTo) {
    const path = notification.navigateTo.toLowerCase();
    for (const [role, navPath] of Object.entries(roleNavigationMap)) {
      if (path.includes(navPath.toLowerCase())) {
        return role as RoleType;
      }
    }
  }

  // 5. Default: return null (public notification)
  return null;
};

// ============================================
// ✅ NOTIFICATION FILTERING SERVICE
// ============================================

export const notificationFilter = {
  /**
   * Check if a notification is meant for this user's role
   */
  isForRole: (notification: any, userRole: string | null): boolean => {
    if (!userRole) return false;

    const normalizedUserRole = userRole.toUpperCase().trim();

    // ✅ If notification has explicit role targeting
    if (notification.role) {
      const notificationRole = notification.role.toUpperCase().trim();
      return notificationRole === normalizedUserRole;
    }

    // ✅ If notification has multiple target roles
    if (notification.targetRoles && Array.isArray(notification.targetRoles)) {
      return notification.targetRoles.some(
        (r: string) => r.toUpperCase().trim() === normalizedUserRole
      );
    }

    // ✅ Smart detection from content
    const detectedRole = detectTargetRole(notification);
    if (detectedRole) {
      return detectedRole === normalizedUserRole;
    }

    // ✅ If no role targeting, it's a public notification (show to all)
    return true;
  },

  /**
   * Filter notifications by user role
   */
  filterByRole: (notifications: any[], userRole: string | null): any[] => {
    if (!userRole || !notifications.length) return [];

    return notifications.filter(notification => 
      notificationFilter.isForRole(notification, userRole)
    );
  },

  /**
   * Get unread count for user role
   */
  getUnreadCount: (notifications: any[], userRole: string | null): number => {
    if (!userRole || !notifications.length) return 0;

    return notifications.filter(n => 
      !n.read && notificationFilter.isForRole(n, userRole)
    ).length;
  },

  /**
   * Group notifications by role
   */
  groupByRole: (notifications: any[]): Map<string, any[]> => {
    const grouped = new Map<string, any[]>();

    notifications.forEach(notification => {
      const role = notification.role || detectTargetRole(notification) || 'PUBLIC';
      if (!grouped.has(role)) {
        grouped.set(role, []);
      }
      grouped.get(role)!.push(notification);
    });

    return grouped;
  },

  /**
   * Get notifications that are specifically for this role (not public)
   */
  getSpecificForRole: (notifications: any[], userRole: string | null): any[] => {
    if (!userRole || !notifications.length) return [];

    const normalizedRole = userRole.toUpperCase().trim();

    return notifications.filter(n => {
      if (n.role) {
        return n.role.toUpperCase().trim() === normalizedRole;
      }
      if (n.targetRoles) {
        return n.targetRoles.some((r: string) => r.toUpperCase().trim() === normalizedRole);
      }
      return false;
    });
  },

  /**
   * Get public notifications (no role targeting)
   */
  getPublicNotifications: (notifications: any[]): any[] => {
    return notifications.filter(n => !n.role && !n.targetRoles);
  },
};

// ─── API CLIENT ──────────────────────────────────────────────────────────────

export const apiClient = {
  get: async <T = any>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  post: async <T = any>(endpoint: string, data?: any, params?: Record<string, any>): Promise<T> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  postFormData: async <T = any>(endpoint: string, formData: any): Promise<T> => {
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  put: async <T = any>(endpoint: string, data?: any, params?: Record<string, any>): Promise<T> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  delete: async <T = any>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  },

  downloadBlob: async (endpoint: string, params?: Record<string, any>): Promise<Blob> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.blob();
  },
};

// ─── PDF HELPERS ─────────────────────────────────────────────────────────────

const getFileUri = (fileName: string): string => {
  // @ts-ignore
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!dir) throw new Error('No storage directory available');
  const safeDir = dir.endsWith('/') ? dir : `${dir}/`;
  return `${safeDir}${fileName}`;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const downloadAndSharePDF = async (blob: Blob, fileName: string) => {
  try {
    const fileUri = getFileUri(fileName);
    const base64Data = await blobToBase64(blob);
    // @ts-ignore
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      // @ts-ignore
      encoding: FileSystem.EncodingType.Base64,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF',
        UTI: 'com.adobe.pdf',
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return { success: false, error: String(error) };
  }
};

// ─── Helper to normalize user data ──────────────────────────────────────────

const normalizeUser = (data: any): User => {
  return {
    id: data.id || data.userId || '',
    email: data.email || '',
    firstName: data.firstName || data.first_name || data.name?.split(' ')[0] || 'User',
    lastName: data.lastName || data.last_name || data.name?.split(' ')[1] || '',
    name: data.name || `${data.firstName || 'User'} ${data.lastName || ''}`.trim(),
    role: data.role || data.userRole || 'USER',
    username: data.username || data.userName || data.email?.split('@')[0] || '',
    phone: data.phone || data.mobile || '',
    department: data.department || data.dept || '',
    active: data.active ?? data.isActive ?? true,
    createdAt: data.createdAt || data.created_at || data.createdDate,
    updatedAt: data.updatedAt || data.updated_at || data.updatedDate,
    token: data.token || data.accessToken,
    ...data,
  };
};

// ─── AUTH API ────────────────────────────────────────────────────────────────

export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);

      let response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      }

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json();
      
      const user = data.user ? normalizeUser(data.user) : normalizeUser(data);
      
      return {
        success: true,
        token: data.token || data.accessToken,
        user,
        ...data,
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const data = await apiClient.get('/api/users/me');
      if (!data) return null;
      return normalizeUser(data);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};

// ─── USER API ────────────────────────────────────────────────────────────────

export const userAPI = {
  create: async (userData: any): Promise<User> => {
    const data = await apiClient.post('/api/users', userData);
    return normalizeUser(data);
  },

  update: async (id: string, userData: any): Promise<User> => {
    const data = await apiClient.put(`/api/users/${id}`, userData);
    return normalizeUser(data);
  },

  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/users');
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getAllUsers: async (): Promise<User[]> => {
    return userAPI.getAll();
  },

  getHODs: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/users/hods');
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getAllAuditors: async (): Promise<User[]> => {
    const response = await apiClient.get('/api/users/all-auditors');
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getUsersByRole: async (role: string): Promise<User[]> => {
    const response = await apiClient.get(`/api/users/role/${role}`);
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getUserById: async (id: string): Promise<User> => {
    const data = await apiClient.get(`/api/users/${id}`);
    return normalizeUser(data);
  },

  getUserByEmail: async (email: string): Promise<User> => {
    const data = await apiClient.get(`/api/users/email/${email}`);
    return normalizeUser(data);
  },

  getAuditorsForHod: async (hodId: string): Promise<User[]> => {
    const response = await apiClient.get(`/api/users/hod/${hodId}/auditors`);
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getAuditeesForHod: async (hodId: string): Promise<User[]> => {
    const response = await apiClient.get(`/api/users/hod/${hodId}/auditees`);
    const users = Array.isArray(response) ? response : response?.data || [];
    return users.map((user: any) => normalizeUser(user));
  },

  getDefaultsForHod: async (hodId: string): Promise<any> => {
    return await apiClient.get(`/api/users/hod/${hodId}/defaults`);
  },

  updateDefaults: async (hodId: string, defaults: any): Promise<any> => {
    return await apiClient.put(`/api/users/hod/${hodId}/defaults`, defaults);
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },

  toggleActive: async (id: string): Promise<User> => {
    const data = await apiClient.put(`/api/users/${id}/toggle-active`, {});
    return normalizeUser(data);
  },
};

// ─── INSPECTION FORMS API ──────────────────────────────────────────────────

export const inspectionFormAPI = {
  getAllForms: async () => {
    return await apiClient.get('/api/inspection-forms');
  },

  getFormById: async (id: string) => {
    return await apiClient.get(`/api/inspection-forms/${id}`);
  },

  getFormsByStatus: async (status: string) => {
    return await apiClient.get(`/api/inspection-forms/status/${status}`);
  },

  getFormsBySubmitter: async (submitter: string) => {
    return await apiClient.get(`/api/inspection-forms/submitter/${submitter}`);
  },

  createForm: async (formData: any) => {
    return await apiClient.post('/api/inspection-forms', formData);
  },

  updateForm: async (id: string, formData: any) => {
    return await apiClient.put(`/api/inspection-forms/${id}`, formData);
  },

  submitForm: async (id: string, submittedBy: string) => {
    return await apiClient.post(`/api/inspection-forms/${id}/submit`, null, { submittedBy });
  },

  approveForm: async (id: string, reviewedBy: string, comments: string = '') => {
    return await apiClient.post(`/api/inspection-forms/${id}/approve`, null, { reviewedBy, comments });
  },

  rejectForm: async (id: string, reviewedBy: string, comments: string) => {
    return await apiClient.post(`/api/inspection-forms/${id}/reject`, null, { reviewedBy, comments });
  },

  downloadPdf: async (id: string, username: string) => {
    try {
      const blob = await apiClient.downloadBlob(`/api/inspection-forms/${id}/pdf/${username}`);
      return await downloadAndSharePDF(blob, `inspection_form_${id}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  sendEmailWithPdf: async (id: string, emailData: any) => {
    return await apiClient.post(`/api/inspection-forms/${id}/email-pdf`, emailData);
  },
};

// ─── PRINTING INSPECTION API ──────────────────────────────────────────────

export const printingInspectionAPI = {
  getAllReports: async () => {
    return await apiClient.get('/api/printing-inspection');
  },

  getReportById: async (id: string) => {
    return await apiClient.get(`/api/printing-inspection/${id}`);
  },

  getReportsByStatus: async (status: string) => {
    return await apiClient.get('/api/printing-inspection/status', { status });
  },

  createReport: async (reportData: any) => {
    return await apiClient.post('/api/printing-inspection', reportData);
  },

  updateReport: async (id: string, reportData: any) => {
    return await apiClient.put(`/api/printing-inspection/${id}`, reportData);
  },

  submitReport: async (id: string) => {
    return await apiClient.put(`/api/printing-inspection/submit/${id}`);
  },

  approveReport: async (id: string, comments: string = '') => {
    return await apiClient.put(`/api/printing-inspection/approve/${id}`, null, { comments });
  },

  rejectReport: async (id: string, comments: string) => {
    return await apiClient.put(`/api/printing-inspection/reject/${id}`, null, { comments });
  },

  deleteReport: async (id: string) => {
    await apiClient.delete(`/api/printing-inspection/${id}`);
    return true;
  },

  downloadPdf: async (id: string) => {
    try {
      const blob = await apiClient.downloadBlob(`/api/printing-inspection/pdf/${id}`);
      return await downloadAndSharePDF(blob, `inspection-report-${id}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  getReportSummary: async () => {
    return await apiClient.get('/api/printing-inspection/summary');
  },
};

// ─── LINE CLEARANCE API ────────────────────────────────────────────────────

export const lineClearanceAPI = {
  getAllForms: async () => {
    return await apiClient.get('/api/line-clearance');
  },

  getFormById: async (id: string) => {
    return await apiClient.get(`/api/line-clearance/${id}`);
  },

  getFormsByStatus: async (status: string) => {
    return await apiClient.get(`/api/line-clearance/status/${status}`);
  },

  getFormsBySubmitter: async (submitter: string) => {
    return await apiClient.get(`/api/line-clearance/submitter/${submitter}`);
  },

  createForm: async (formData: any) => {
    return await apiClient.post('/api/line-clearance', formData);
  },

  updateForm: async (id: string, formData: any) => {
    return await apiClient.put(`/api/line-clearance/${id}`, formData);
  },

  submitForm: async (id: string, submittedBy: string) => {
    return await apiClient.post(`/api/line-clearance/${id}/submit`, null, { submittedBy });
  },

  approveForm: async (id: string, reviewedBy: string, comments: string = '') => {
    return await apiClient.post(`/api/line-clearance/${id}/approve`, null, { reviewedBy, comments });
  },

  rejectForm: async (id: string, reviewedBy: string, comments: string) => {
    return await apiClient.post(`/api/line-clearance/${id}/reject`, null, { reviewedBy, comments });
  },

  downloadPdf: async (id: string, username: string) => {
    try {
      const blob = await apiClient.downloadBlob(`/api/line-clearance/${id}/pdf/${username}`);
      return await downloadAndSharePDF(blob, `line_clearance_${id}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  sendEmailWithPdf: async (id: string, emailData: any) => {
    return await apiClient.post(`/api/line-clearance/${id}/email-pdf`, emailData);
  },
};

// ─── SCHEDULE API ──────────────────────────────────────────────────────────

export const scheduleAPI = {
  getAll: async () => {
    return await apiClient.get('/api/schedules/all');
  },

  getById: async (id: string) => {
    return await apiClient.get(`/api/schedules/${id}`);
  },

  createSimple: async (scheduleData: any) => {
    return await apiClient.post('/api/schedules', scheduleData);
  },

  create: async (schedule: any, hodIds: string[], cftIds: string[], shifts: any, forms: any, locations: any) => {
    try {
      const params = new URLSearchParams();
      if (hodIds && hodIds.length > 0) {
        hodIds.forEach(id => params.append('hodIds', id.toString()));
      }
      if (cftIds && cftIds.length > 0) {
        cftIds.forEach(id => params.append('cftIds', id.toString()));
      }
      if (shifts && typeof shifts === 'object') {
        Object.entries(shifts).forEach(([hodId, shift]) => {
          const shiftValue = typeof shift === 'string' ? shift : String(shift || '');
          if (shiftValue && shiftValue.trim()) {
            params.append(`shifts[${hodId}]`, shiftValue);
          }
        });
      }
      if (forms && typeof forms === 'object') {
        Object.entries(forms).forEach(([hodId, formId]) => {
          const formValue = typeof formId === 'string' ? formId : String(formId || '');
          if (formValue && formValue.trim()) {
            params.append(`forms[${hodId}]`, formValue);
          }
        });
      }

      const scheduleData = {
        scheduleName: schedule.scheduleName || `Schedule ${new Date().toLocaleDateString()}`,
        location: schedule.location || 'Not specified',
        startDate: schedule.startDate,
        endDate: schedule.endDate,
      };

      return await apiClient.post('/api/schedules', scheduleData, params);
    } catch (error) {
      console.error('Schedule creation error:', error);
      throw error;
    }
  },

  submitToDgm: async (id: string, deputyEmail: string) => {
    return await apiClient.post(`/api/schedules/${id}/submit-to-dgm`, null, { deputyEmail });
  },

  approve: async (id: string, dgmEmail: string) => {
    return await apiClient.post(`/api/schedules/${id}/approve`, null, { dgmEmail });
  },

  release: async (id: string, dgmEmail: string, externalEmails: string) => {
    return await apiClient.post(`/api/schedules/${id}/release`, null, { dgmEmail, externalEmails });
  },

  getPendingForDgm: async () => {
    return await apiClient.get('/api/schedules/pending-dgm');
  },

  getApproved: async () => {
    return await apiClient.get('/api/schedules/approved');
  },
};

// ─── AUDIT API ──────────────────────────────────────────────────────────────

export const auditAPI = {
  getForAuditor: async (auditorId: string) => {
    return await apiClient.get(`/api/audits/auditor/${auditorId}`);
  },

  getForAuditee: async (auditeeId: string) => {
    return await apiClient.get(`/api/audits/auditee/${auditeeId}`);
  },

  save: async (auditorId: any, auditData?: any) => {
    if (typeof auditorId === 'object' && !auditData) {
      return await apiClient.post('/api/audits/save', auditorId);
    }
    if (typeof auditorId === 'string' || typeof auditorId === 'number') {
      return await apiClient.put(`/api/audits/${auditorId}/save`, auditData);
    }
    throw new Error('Invalid parameters for auditAPI.save');
  },

  start: async (id: string) => {
    return await apiClient.post(`/api/audits/${id}/start`);
  },

  submit: async (id: string, findings: any = null) => {
    const payload = findings ? findings : {};
    return await apiClient.post(`/api/audits/${id}/submit`, payload);
  },

  approve: async (id: string, comments: string = '') => {
    return await apiClient.post(`/api/audits/${id}/approve`, null, { comments });
  },

  reject: async (id: string, comments: string) => {
    return await apiClient.post(`/api/audits/${id}/reject`, null, { comments });
  },

  getAll: async () => {
    const response = await apiClient.get('/api/audits/all');
    return Array.isArray(response) ? response : (response?.data || []);
  },

  getForDeputy: async (deputyEmail: string) => {
    const response = await apiClient.get(`/api/audits/deputy/${deputyEmail}`);
    return Array.isArray(response) ? response : (response?.data || []);
  },

  getForHod: async (hodEmail: string) => {
    const response = await apiClient.get(`/api/audits/hod/${hodEmail}`);
    return Array.isArray(response) ? response : (response?.data || []);
  },

  getCompleted: async () => {
    return await apiClient.get('/api/audits/completed');
  },

  close: async (id: string) => {
    return await apiClient.post(`/api/audits/${id}/close`);
  },

  getById: async (id: string) => {
    return await apiClient.get(`/api/audits/${id}`);
  },

  reassignAudit: async (auditId: string, data: any, hodEmail: string) => {
    return await apiClient.post(`/api/audits/${auditId}/reassign`, data, { hodEmail });
  },

  signOff: async (id: string, data: any) => {
    return await apiClient.post(`/api/audits/${id}/sign-off`, data);
  },

  downloadPdf: async (id: string, userName: string = '') => {
    try {
      const blob = await apiClient.downloadBlob(`/api/audits/${id}/pdf`, userName ? { userName } : {});
      return await downloadAndSharePDF(blob, `audit_report_${id}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  downloadPdfWithSignatures: async (id: string, signatureData: any) => {
    try {
      const blob = await apiClient.downloadBlob(`/api/audits/${id}/pdf-with-signatures`);
      return await downloadAndSharePDF(blob, `audit_report_${id}_signed.pdf`);
    } catch (error) {
      console.error('Error downloading PDF with signatures:', error);
      throw error;
    }
  },

  fetchSignatureByName: async (firstName: string, lastName: string) => {
    try {
      const blob = await apiClient.downloadBlob('/api/users/signature', { firstName, lastName });
      return await blobToBase64(blob);
    } catch (error) {
      console.error('Error fetching signature:', error);
      return null;
    }
  },

  fetchUserByName: async (firstName: string, lastName: string) => {
    try {
      return await apiClient.get('/api/users/by-name', { firstName, lastName });
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  fetchSignatureById: async (userId: string) => {
    try {
      const blob = await apiClient.downloadBlob(`/api/users/${userId}/signature`);
      return await blobToBase64(blob);
    } catch (error) {
      console.error('Error fetching signature by ID:', error);
      return null;
    }
  },
};

export const signatureAPI = {
  fetchByName: auditAPI.fetchSignatureByName,
  fetchById: auditAPI.fetchSignatureById,
  fetchUserByName: auditAPI.fetchUserByName,
};

// ─── NCR API ────────────────────────────────────────────────────────────────

export const ncrAPI = {
  getAll: async () => {
    return await apiClient.get('/api/ncr/all');
  },

  getByAuditId: async (auditId: string) => {
    return await apiClient.get(`/api/ncr/audit/${auditId}`);
  },

  getByAssignee: async (assigneeId: string) => {
    return await apiClient.get(`/api/ncr/auditee/${assigneeId}`);
  },

  getByAuditor: async (auditorId: string) => {
    return await apiClient.get(`/api/ncr/auditor/${auditorId}`);
  },

  getPendingReview: async () => {
    return await apiClient.get('/api/ncr/pending-review');
  },

  getPendingVerification: async () => {
    return await apiClient.get('/api/ncr/pending-verification');
  },

  create: async (ncrData: any) => {
    return await apiClient.post('/api/ncr/create', ncrData);
  },

  submitCorrectiveAction: async (id: string, actionData: any) => {
    return await apiClient.put(`/api/ncr/${id}/corrective-action`, actionData);
  },

  verifyAndClose: async (id: string, verificationData: any) => {
    return await apiClient.put(`/api/ncr/${id}/verify`, verificationData);
  },

  sendTo8D: async (ncrId: string, comment: string, auditManagerId: string) => {
    try {
      return await apiClient.post(`/api/ncr/${ncrId}/send-to-8d`, { comment, auditManagerId });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send to 8D' };
    }
  },
};

// ─── NOTIFICATION API (UPDATED WITH ROLE FILTERING) ─────────────────────

export const notificationAPI = {
  /**
   * Get notifications for a specific user with role-based filtering (client-side)
   */
  getForUser: async (userId: string, userRole?: string): Promise<any[]> => {
    try {
      // Fetch ALL notifications from backend (no role filtering on backend)
      const data = await apiClient.get(`/api/notifications/user/${userId}`);
      const notifications = Array.isArray(data) ? data : [];
      
      // If no role provided, return all notifications
      if (!userRole) {
        return notifications;
      }

      // Filter client-side by role
      const filtered = notificationFilter.filterByRole(notifications, userRole);
      
      console.log(`📬 Found ${filtered.length} notifications for role: ${userRole}`);
      console.log(`   (${notifications.length} total, ${notifications.length - filtered.length} filtered out)`);
      
      return filtered;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Get unread count with role-based filtering (client-side)
   */
  getUnreadCount: async (userId: string, userRole?: string): Promise<number> => {
    try {
      // First get all notifications
      const notifications = await notificationAPI.getForUser(userId, userRole);
      // Count unread among filtered notifications
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (notificationId: string, userId: string) => {
    return await apiClient.put(`/api/notifications/${notificationId}/read`, null, { userId });
  },

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: async (userId: string) => {
    return await apiClient.put(`/api/notifications/user/${userId}/read-all`);
  },

  /**
   * Clear all notifications for a user
   */
  clearAll: async (userId: string) => {
    return await apiClient.delete(`/api/notifications/user/${userId}`);
  },

  /**
   * Send notification to a specific user
   */
  sendToUser: async (userId: string, title: string, message: string, type: string, navigateTo: string, location: string) => {
    return await apiClient.post('/api/notifications/send-to-user', {
      userId,
      title,
      message,
      type,
      navigateTo,
      location,
    });
  },

  /**
   * Send notification to all users with a specific role
   */
  sendToRole: async (role: string, title: string, message: string, type: string, navigateTo: string, location: string) => {
    return await apiClient.post('/api/notifications/send-to-role', {
      role,
      title,
      message,
      type,
      navigateTo,
      location,
    });
  },

  /**
   * Send notification to multiple roles
   */
  sendToRoles: async (roles: string[], title: string, message: string, type: string, navigateTo: string, location: string) => {
    return await apiClient.post('/api/notifications/send-to-roles', {
      roles,
      title,
      message,
      type,
      navigateTo,
      location,
    });
  },

  /**
   * Send workflow notification with role targeting
   */
  sendWorkflowNotification: async (data: {
    workflowType: string;
    action: string;
    targetRoles?: string[];
    targetRole?: string;
    title: string;
    message: string;
    navigateTo?: string;
    location?: string;
    metadata?: any;
  }) => {
    return await apiClient.post('/api/notifications/workflow', data);
  },
};

// ─── DEPARTMENT API ────────────────────────────────────────────────────────

export const departmentAPI = {
  getActive: async () => {
    return await apiClient.get('/api/superadmin/departments/active');
  },

  getAll: async () => {
    return await apiClient.get('/api/superadmin/departments/active');
  },

  create: async (payload: any) => {
    return await apiClient.post('/api/superadmin/departments', payload);
  },

  update: async (id: string, payload: any) => {
    return await apiClient.put(`/api/superadmin/departments/${id}`, payload);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/api/superadmin/departments/${id}`);
  },
};

// ─── ROLE API ──────────────────────────────────────────────────────────────

export const roleAPI = {
  getActive: async () => {
    return await apiClient.get('/api/superadmin/roles/active');
  },

  getAll: async () => {
    return await apiClient.get('/api/superadmin/roles/active');
  },

  create: async (payload: any) => {
    return await apiClient.post('/api/superadmin/roles', payload);
  },

  update: async (id: string, payload: any) => {
    return await apiClient.put(`/api/superadmin/roles/${id}`, payload);
  },

  delete: async (id: string) => {
    return await apiClient.delete(`/api/superadmin/roles/${id}`);
  },
};

// ─── DASHBOARD STATS API ──────────────────────────────────────────────────

export const dashboardAPI = {
  getStats: async (year?: number) => {
    return await apiClient.get('/api/dashboard/stats', year ? { year } : {});
  },

  getMonthlyTrend: async (year?: number) => {
    return await apiClient.get('/api/dashboard/monthly-trend', year ? { year } : {});
  },
};

// ─── LOGO API ──────────────────────────────────────────────────────────────

export const logoAPI = {
  getUrl: () => `${API_BASE_URL}/api/logo`,
};

// ─── MASTER DATA API ──────────────────────────────────────────────────────

export const masterDataAPI = {
  getRoles: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/roles');
      return response?.data || response || [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      return ['MASTER', 'AUDIT_MANAGER', 'LEAD_AUDITOR', 'AUDITOR', 'HOD', 'AUDITEE', 'HR_ADMIN', 'TOP_MANAGEMENT', 'INITIATOR'];
    }
  },

  getDepartments: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/departments');
      return response?.data || response || [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return ['MR', 'ENGG', 'PLANT_MAINTENANCE', 'STORES_DESPATCH', 'PURCHASE', 'PPC', 'PRODUCTION', 'HR', 'UNIT_HEAD', 'TOOL_MAINTENANCE', 'QA', 'MARKETING'];
    }
  },

  getCoreTools: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/core-tools');
      return response?.data || response || [];
    } catch (error) {
      console.error('Error fetching core tools:', error);
      return ['APQP', 'FMEA', 'PPAP', 'SPC', 'MSA'];
    }
  },

  getProblemSolvingTools: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/problem-solving-tools');
      return response?.data || response || [];
    } catch (error) {
      console.error('Error fetching problem solving tools:', error);
      return ['8D', 'Why-Why', 'Fishbone', 'Pareto', '5W1H'];
    }
  },

  getProcesses: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/api/processes');
      return response?.data || response || [];
    } catch (error) {
      console.error('Error fetching processes:', error);
      return ['Machining', 'Assembly', 'Welding', 'Painting', 'Heat Treatment', 'Surface Finishing', 'Quality Control', 'Warehouse', 'Maintenance', 'Procurement', 'Sales', 'Engineering', 'HR', 'IT', 'Logistics'];
    }
  },
};

// ─── 8D API ────────────────────────────────────────────────────────────────

export const eightDAPI = {
  getAll: async (params?: { year?: number; type?: string }): Promise<any> => {
    const queryParams: Record<string, any> = {};
    if (params?.year) queryParams.year = params.year;
    if (params?.type) queryParams.type = params.type;
    return await apiClient.get('/api/eightd/data', Object.keys(queryParams).length ? queryParams : undefined);
  },

  getById: async (id: string): Promise<any> => {
    return await apiClient.get(`/api/eightd/data/${id}`);
  },

  create: async (formData: FormData): Promise<any> => {
    return await apiClient.postFormData('/api/eightd/data', formData);
  },

  update: async (id: string, formData: FormData): Promise<any> => {
    const token = await AsyncStorage.getItem('authToken');
    const url = new URL(`${API_BASE_URL}/api/eightd/data/${id}`);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  delete: async (id: string): Promise<any> => {
    return await apiClient.delete(`/api/eightd/data/${id}`);
  },

  approve: async (id: string, data: { userEmail: string; comment?: string }): Promise<any> => {
    return await apiClient.post(`/api/eightd/approve/${id}`, data);
  },

  reject: async (id: string, data: { userEmail: string; comment?: string }): Promise<any> => {
    return await apiClient.post(`/api/eightd/reject/${id}`, data);
  },

  getFiles: async (id: string): Promise<any> => {
    return await apiClient.get(`/api/eightd/data/${id}/files`);
  },

  downloadFile: async (fileId: string): Promise<Blob> => {
    return await apiClient.downloadBlob(`/api/eightd/files/${fileId}`);
  },

  getByYear: async (year: number): Promise<any> => {
    return await apiClient.get('/api/eightd/data', { year });
  },

  getByStatus: async (status: string): Promise<any> => {
    return await apiClient.get('/api/eightd/data', { status });
  },

  getNcrBased: async (): Promise<any> => {
    return await apiClient.get('/api/eightd/data', { type: 'ncr' });
  },

  getFresh: async (): Promise<any> => {
    return await apiClient.get('/api/eightd/data', { type: 'fresh' });
  },

  submitForApproval: async (id: string, data: { userEmail: string }): Promise<any> => {
    return await apiClient.post(`/api/eightd/submit/${id}`, data);
  },

  getStepData: async (id: string, step: string): Promise<any> => {
    return await apiClient.get(`/api/eightd/data/${id}/step/${step}`);
  },

  updateStep: async (id: string, step: string, data: any): Promise<any> => {
    return await apiClient.put(`/api/eightd/data/${id}/step/${step}`, data);
  },

  getSummary: async (id: string): Promise<any> => {
    return await apiClient.get(`/api/eightd/data/${id}/summary`);
  },

  getTimeline: async (id: string): Promise<any> => {
    return await apiClient.get(`/api/eightd/data/${id}/timeline`);
  },

  getStats: async (year?: number): Promise<any> => {
    return await apiClient.get('/api/eightd/stats', year ? { year } : {});
  },
};

// ─── FORUM API ──────────────────────────────────────────────────────────────

export const forumAPI = {
  create8DGroup: async (data: {
    groupId: string;
    groupName: string;
    description: string;
    createdBy: string;
    members: string[];
  }): Promise<any> => {
    return await apiClient.post('/api/forum/8d/groups', data);
  },

  getGroupByEventId: async (eventId: string): Promise<any> => {
    return await apiClient.get(`/api/forum/8d/groups/event/${eventId}`);
  },

  getThreads: async (groupId: string): Promise<any> => {
    return await apiClient.get(`/api/forum/groups/${groupId}/threads`);
  },

  createThread: async (groupId: string, data: any): Promise<any> => {
    return await apiClient.post(`/api/forum/groups/${groupId}/threads`, data);
  },

  getMessages: async (threadId: string): Promise<any> => {
    return await apiClient.get(`/api/forum/threads/${threadId}/messages`);
  },

  postMessage: async (threadId: string, data: any): Promise<any> => {
    return await apiClient.post(`/api/forum/threads/${threadId}/messages`, data);
  },

  addMembers: async (groupId: string, members: string[]): Promise<any> => {
    return await apiClient.post(`/api/forum/groups/${groupId}/members`, { members });
  },

  removeMember: async (groupId: string, memberId: string): Promise<any> => {
    return await apiClient.delete(`/api/forum/groups/${groupId}/members/${memberId}`);
  },

  getMembers: async (groupId: string): Promise<any> => {
    return await apiClient.get(`/api/forum/groups/${groupId}/members`);
  },
};

// ─── 8D PDF GENERATION ──────────────────────────────────────────────────────

export const eightDPdfAPI = {
  generatePdf: async (id: string, includeAttachments: boolean = true): Promise<Blob> => {
    return await apiClient.downloadBlob(`/api/eightd/data/${id}/pdf`, { includeAttachments });
  },

  generateWord: async (id: string, includeAttachments: boolean = true): Promise<Blob> => {
    return await apiClient.downloadBlob(`/api/eightd/data/${id}/word`, { includeAttachments });
  },

  generateExcel: async (ids: string[]): Promise<Blob> => {
    return await apiClient.downloadBlob('/api/eightd/export/excel', { ids: ids.join(',') });
  },

  downloadAndSharePDF: async (id: string, fileName?: string): Promise<any> => {
    try {
      const blob = await eightDPdfAPI.generatePdf(id);
      const finalFileName = fileName || `8D_Report_${id}.pdf`;
      return await downloadAndSharePDF(blob, finalFileName);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  downloadAndShareWord: async (id: string, fileName?: string): Promise<any> => {
    try {
      const blob = await eightDPdfAPI.generateWord(id);
      const finalFileName = fileName || `8D_Report_${id}.docx`;
      return await downloadAndSharePDF(blob, finalFileName);
    } catch (error) {
      console.error('Error downloading Word document:', error);
      throw error;
    }
  },
};

// ─── EXPORTS ────────────────────────────────────────────────────────────────

export default {
  auth: authAPI,
  inspectionForms: inspectionFormAPI,
  printingForms: printingInspectionAPI,
  lineClearance: lineClearanceAPI,
  users: userAPI,
  schedule: scheduleAPI,
  audit: auditAPI,
  ncr: ncrAPI,
  notifications: notificationAPI,
  departments: departmentAPI,
  roles: roleAPI,
  dashboard: dashboardAPI,
  signature: signatureAPI,
  logo: logoAPI,
  masterData: masterDataAPI,
  eightD: eightDAPI,
  forum: forumAPI,
  eightDPdf: eightDPdfAPI,
};