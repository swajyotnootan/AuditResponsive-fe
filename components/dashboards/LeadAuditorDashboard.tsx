// app/components/dashboards/LeadAuditorDashboard.tsx
import axios from 'axios';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../context/AuthContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import AuditsAndResponses from './LeadAuditor/AuditsAndResponses';
import DashboardAnalytics from './LeadAuditor/DashboardAnalytics';
import ResponseDetailModal from './LeadAuditor/ResponseDetailModal';
import StakeholderManagement from './LeadAuditor/StakeholderManagement';

// Types
interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string | { displayName?: string; name?: string };
  username?: string;
  name?: string;
}

interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  coAuditorIds?: string[] | string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
  createdAt?: string;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  createdAt?: string;
  raisedDate?: string;
  dueDate?: string;
}

interface Response {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  auditeeId?: string | number;
  status?: string;
  approvalStatus?: string;
  answers?: any;
  percentageScore?: number;
  totalScore?: number;
  maxPossibleScore?: number;
  createdAt?: string;
  submittedAt?: string;
  checkSheet?: { name: string };
}

interface Stats {
  totalSchedules: number;
  completedSchedules: number;
  approved: number;
  rejected: number;
  pendingApproval: number;
  inProgress: number;
  scheduled: number;
  overdue: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  majorNCRs: number;
  minorNCRs: number;
  totalResponses: number;
  responsesApproved: number;
  responsesRejected: number;
  responsesSubmitted: number;
  ncrApproved: number;
  ncrInProgress: number;
  ncrOpen: number;
}

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;
const isWeb = Platform.OS === 'web';

const API_BASE_URL = 'http://localhost:8080/api';

const NAVBAR_COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
};

const LeadAuditorDashboardContent: React.FC = () => {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [carouselSpeed, setCarouselSpeed] = useState(5000);
  const [responseViewMode, setResponseViewMode] = useState('grid');
  const [ncrViewMode, setNcrViewMode] = useState('grid');
  const [leadAuditorDepartment, setLeadAuditorDepartment] = useState<string | null>(null);

  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [allNCRs, setAllNCRs] = useState<NCR[]>([]);
  const [allAuditors, setAllAuditors] = useState<User[]>([]);
  const [allAuditees, setAllAuditees] = useState<User[]>([]);
  const [allResponses, setAllResponses] = useState<Response[]>([]);

  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [filteredNCRs, setFilteredNCRs] = useState<NCR[]>([]);
  const [filteredAuditors, setFilteredAuditors] = useState<User[]>([]);
  const [filteredAuditees, setFilteredAuditees] = useState<User[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);

  const [reviewingResponse, setReviewingResponse] = useState<Response | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewApproved, setReviewApproved] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedResponseForDetail, setSelectedResponseForDetail] = useState<Response | null>(null);
  const [showResponseDetailModal, setShowResponseDetailModal] = useState(false);

  const [stats, setStats] = useState<Stats>({
    totalSchedules: 0,
    completedSchedules: 0,
    approved: 0,
    rejected: 0,
    pendingApproval: 0,
    inProgress: 0,
    scheduled: 0,
    overdue: 0,
    totalNCRs: 0,
    openNCRs: 0,
    closedNCRs: 0,
    criticalNCRs: 0,
    majorNCRs: 0,
    minorNCRs: 0,
    totalResponses: 0,
    responsesApproved: 0,
    responsesRejected: 0,
    responsesSubmitted: 0,
    ncrApproved: 0,
    ncrInProgress: 0,
    ncrOpen: 0,
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear();
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Listen for tab param from drawer clicks
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as string);
    }
  }, [params?.tab]);

  // Helper to get department string
  const getDepartmentString = (dept: any): string => {
    if (!dept) return '';
    if (typeof dept === 'string') return dept;
    if (typeof dept === 'object') {
      return dept.displayName || dept.name || '';
    }
    return '';
  };

  const fetchLeadAuditorDepartment = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${user?.id}`, { withCredentials: true });
      const userData = response.data;
      let department = null;
      if (userData.department) {
        department = getDepartmentString(userData.department);
      } else if (userData.departmentName) {
        department = userData.departmentName;
      } else if (userData.departmentCode) {
        department = userData.departmentCode;
      }
      setLeadAuditorDepartment(department);
      return department;
    } catch (error) {
      if (user?.department) {
        const dept = getDepartmentString(user.department);
        setLeadAuditorDepartment(dept);
        return dept;
      }
      return null;
    }
  };

  const normalizeDepartment = (dept: any): string => {
    const deptStr = getDepartmentString(dept).toUpperCase().trim();
    if (!deptStr) return '';
    const deptMap: Record<string, string> = {
      'HR': 'HR',
      'R&D': 'ENGG',
      'ENGINEERING': 'ENGG',
      'R AND D': 'ENGG',
      'PURCHASE': 'PURCHASE',
      'RMS': 'STORES_DESPATCH',
      'SQA': 'QA',
      'PPC': 'PPC',
      'PRODUCTION': 'PRODUCTION',
      'QA/QC': 'QA',
      'QA': 'QA',
      'QC': 'QA',
      'FGS': 'STORES_DESPATCH',
      'MARKETING': 'MARKETING',
      'IMS (BE)': 'MR',
      'IMS(BE)': 'MR',
      'IMS': 'MR',
      'MAINTENANCE': 'PLANT_MAINTENANCE',
      'MANAGEMENT': 'UNIT_HEAD',
      'PLANT MAINTENANCE': 'PLANT_MAINTENANCE',
      'TOOL MAINTENANCE': 'TOOL_MAINTENANCE',
      'TOOL MANAGEMENT': 'TOOL_MAINTENANCE',
      'STORES & DESPATCH': 'STORES_DESPATCH',
      'STORES': 'STORES_DESPATCH',
      'DESPATCH': 'STORES_DESPATCH',
      'UNIT HEAD': 'UNIT_HEAD',
      'MR': 'MR'
    };
    return deptMap[deptStr] || deptStr;
  };

  const filterDataByDepartment = (
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[]
  ) => {
    if (!department) return { schedules, ncrs, auditors, auditees, responses };
    const normalizedTarget = normalizeDepartment(department);
    return {
      schedules: schedules.filter(s => normalizeDepartment(s.department) === normalizedTarget),
      ncrs: ncrs.filter(n => normalizeDepartment(n.department) === normalizedTarget),
      auditors: auditors.filter(a => normalizeDepartment(a.department) === normalizedTarget),
      auditees: auditees.filter(a => normalizeDepartment(a.department) === normalizedTarget),
      responses: responses.filter(r => normalizeDepartment(r.department) === normalizedTarget)
    };
  };

  const updateFilteredData = (
    department: string | null,
    schedules: Schedule[],
    ncrs: NCR[],
    auditors: User[],
    auditees: User[],
    responses: Response[]
  ) => {
    const filtered = filterDataByDepartment(department, schedules, ncrs, auditors, auditees, responses);
    setFilteredSchedules(filtered.schedules);
    setFilteredNCRs(filtered.ncrs);
    setFilteredAuditors(filtered.auditors);
    setFilteredAuditees(filtered.auditees);
    setFilteredResponses(filtered.responses);

    const today = new Date();
    const responsesApproved = filtered.responses.filter(r => r.status === 'APPROVED').length;
    const responsesRejected = filtered.responses.filter(r => r.status === 'REJECTED').length;
    const responsesSubmitted = filtered.responses.filter(r => r.status === 'SUBMITTED').length;
    const overdue = filtered.schedules.filter(s => {
      if (!s.scheduledDate) return false;
      return new Date(s.scheduledDate) < today && 
        s.status !== 'COMPLETED' && 
        s.status !== 'REJECTED' && 
        s.status !== 'APPROVED';
    }).length;

    setStats({
      totalSchedules: filtered.schedules.length,
      completedSchedules: filtered.schedules.filter(s => s.status === 'COMPLETED').length,
      approved: filtered.schedules.filter(s => s.status === 'APPROVED' || s.detailedApprovalStatus === 'APPROVED').length,
      rejected: filtered.schedules.filter(s => s.status === 'REJECTED').length,
      pendingApproval: filtered.schedules.filter(s => s.status === 'COMPLETED' && s.detailedApprovalStatus !== 'APPROVED').length,
      inProgress: filtered.schedules.filter(s => s.status === 'IN_PROGRESS').length,
      scheduled: filtered.schedules.filter(s => s.status === 'SCHEDULED').length,
      overdue,
      totalNCRs: filtered.ncrs.length,
      openNCRs: filtered.ncrs.filter(n => n.status !== 'CLOSED').length,
      closedNCRs: filtered.ncrs.filter(n => n.status === 'CLOSED').length,
      criticalNCRs: filtered.ncrs.filter(n => n.severity === 'CRITICAL').length,
      majorNCRs: filtered.ncrs.filter(n => n.severity === 'MAJOR').length,
      minorNCRs: filtered.ncrs.filter(n => n.severity === 'MINOR').length,
      totalResponses: filtered.responses.length,
      responsesApproved,
      responsesRejected,
      responsesSubmitted,
      ncrApproved: filtered.ncrs.filter(n => n.status === 'APPROVED').length,
      ncrInProgress: filtered.ncrs.filter(n => n.status === 'IN_PROGRESS').length,
      ncrOpen: filtered.ncrs.filter(n => n.status === 'OPEN').length
    });
  };

  const fetchAllData = async (year: number = selectedYear) => {
    try {
      setLoading(true);
      const department = await fetchLeadAuditorDepartment();
      const [schedulesRes, ncrRes, auditorsRes, auditeesRes, responsesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/audit-schedule/year/${year}`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/ncr/all`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/audit-schedule/auditors`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/audit-schedule/auditees`, { withCredentials: true }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/templates/responses/all`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);

      let schedules = schedulesRes.data || [];
      let ncrs = ncrRes.data || [];
      const auditors = auditorsRes.data || [];
      const auditees = auditeesRes.data || [];
      let responses = responsesRes.data || [];

      ncrs = ncrs.filter((ncr: NCR) => {
        const ncrDate = ncr.createdAt || ncr.raisedDate || ncr.dueDate;
        if (ncrDate) return new Date(ncrDate).getFullYear() === year;
        return false;
      });

      responses = responses.filter((response: Response) => {
        const responseYear = response.createdAt ? new Date(response.createdAt).getFullYear() : null;
        return responseYear === year;
      });

      setAllSchedules(schedules);
      setAllNCRs(ncrs);
      setAllAuditors(auditors);
      setAllAuditees(auditees);
      setAllResponses(responses);
      updateFilteredData(department, schedules, ncrs, auditors, auditees, responses);
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData(selectedYear);
  };

  const handleViewResponse = (response: Response) => {
    console.log('View Response:', response.id);
  };

  const handleViewNCR = (ncr: NCR) => {
    console.log('View NCR:', ncr.id);
  };

  const handleReviewResponseClick = (response: Response) => {
    setReviewingResponse(response);
    setReviewApproved(true);
    setReviewComment('');
  };

  const handleViewResponseDetail = (response: Response) => {
    setSelectedResponseForDetail(response);
    setShowResponseDetailModal(true);
  };

  const handleReviewResponse = async () => {
    if (!reviewingResponse) return;
    if (!reviewApproved && !reviewComment.trim()) {
      addToast('Please provide a reason for rejection', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = reviewApproved ? 'lead-auditor/approve' : 'lead-auditor/reject';
      await axios.put(
        `${API_BASE_URL}/templates/responses/${reviewingResponse.id}/${endpoint}`,
        { comment: reviewComment, signature: 'Lead Auditor' },
        { withCredentials: true }
      );
      addToast(`Response ${reviewApproved ? 'approved' : 'rejected'} successfully!`, reviewApproved ? 'success' : 'error');
      setReviewingResponse(null);
      setReviewComment('');
      fetchAllData();
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Effects
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 2020; i <= currentYear + 5; i++) years.push(i);
    setAvailableYears(years.sort((a, b) => b - a));
  }, []);

  useEffect(() => {
    fetchAllData(selectedYear);
  }, [selectedYear]);

  const getResponseStatusBadge = (status?: string) => {
    const badges: Record<string, any> = {
      'APPROVED': { bg: '#D1FAE5', text: '#059669' },
      'REJECTED': { bg: '#FEE2E2', text: '#DC2626' },
      'SUBMITTED': { bg: '#DBEAFE', text: '#2563EB' },
      'DRAFT': { bg: '#F3F4F6', text: '#6B7280' }
    };
    return badges[status || ''] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const departmentDisplayName = leadAuditorDepartment || 'All Departments';

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVBAR_COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <DashboardAnalytics
            stats={stats}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            carouselSpeed={carouselSpeed}
            setCarouselSpeed={setCarouselSpeed}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      case 'audits':
      case 'responses':
      case 'ncrs':
        return (
          <AuditsAndResponses
            activeTab={activeTab}
            allSchedules={filteredSchedules}
            allNCRs={filteredNCRs}
            allResponses={filteredResponses}
            allAuditors={filteredAuditors}
            stats={stats}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            responseViewMode={responseViewMode}
            setResponseViewMode={setResponseViewMode}
            ncrViewMode={ncrViewMode}
            setNcrViewMode={setNcrViewMode}
            onViewResponse={handleViewResponse}
            onReviewResponse={handleReviewResponseClick}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      case 'auditors':
      case 'auditees':
        return (
          <StakeholderManagement
            activeTab={activeTab}
            allAuditors={filteredAuditors}
            allAuditees={filteredAuditees}
            allSchedules={filteredSchedules}
            allResponses={filteredResponses}
            allNCRs={filteredNCRs}
            onViewResponse={handleViewResponse}
            onViewNCR={handleViewNCR}
            onViewResponseDetail={handleViewResponseDetail}
            leadAuditorDepartment={leadAuditorDepartment}
          />
        );
      default:
        return (
          <View style={styles.defaultContainer}>
            <Text style={styles.defaultText}>Select a section from the navigation</Text>
          </View>
        );
    }
  };

  // Responsive padding based on screen size
  const getContentPadding = () => {
    if (isWeb) {
      return isDesktop ? 24 : 16;
    }
    return isMobile ? 12 : 16;
  };

  // Responsive header font size
  const getHeaderFontSize = () => {
    if (isWeb) {
      return isDesktop ? 32 : 24;
    }
    return isMobile ? 20 : 28;
  };

  return (
    <SafeAreaView style={[styles.container, { padding: getContentPadding() }]}>
      <ScrollView 
        style={styles.contentScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Header */}
        <View style={[styles.header, isWeb && styles.headerWeb]}>
          <View style={styles.headerLeft}>
            <View>
              <Text style={[styles.headerTitle, { fontSize: getHeaderFontSize() }]}>
                Lead Auditor Dashboard
              </Text>
              <Text style={[styles.headerSubtitle, isMobile && styles.headerSubtitleMobile]}>
                Welcome back, <Text style={styles.headerUser}>{user?.name || user?.username || 'User'}</Text>
                <Text style={styles.headerSeparator}> | </Text>
                <Text style={styles.headerDept}>Dept: {departmentDisplayName}</Text>
              </Text>
            </View>
          </View>
          <View style={[styles.headerRight, isMobile && styles.headerRightMobile]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={[styles.yearSelectorScroll, isMobile && styles.yearSelectorScrollMobile]}
              contentContainerStyle={styles.yearSelectorContent}
            >
              {availableYears.slice(0, 5).map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    selectedYear === year && { backgroundColor: NAVBAR_COLORS.primary },
                    isMobile && styles.yearOptionMobile
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.yearOptionText,
                    selectedYear === year && { color: '#FFFFFF' },
                    isMobile && styles.yearOptionTextMobile
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.refreshButton, isMobile && styles.refreshButtonMobile]}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              <Icon name="refresh-cw" size={isMobile ? 16 : 18} color="#6B7280" />
              {!isMobile && <Text style={styles.refreshButtonText}>Refresh</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {renderContent()}
        </View>
      </ScrollView>

      {/* Response Detail Modal */}
      {showResponseDetailModal && selectedResponseForDetail && (
        <ResponseDetailModal
          response={selectedResponseForDetail}
          visible={showResponseDetailModal}
          onClose={() => {
            setShowResponseDetailModal(false);
            setSelectedResponseForDetail(null);
          }}
        />
      )}

      {/* Review Response Modal */}
      {reviewingResponse && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReviewingResponse(null)}
        >
          <View style={styles.reviewModalOverlay}>
            <View style={[styles.reviewModalContent, isMobile && styles.reviewModalContentMobile]}>
              <View style={styles.reviewModalHeader}>
                <View style={styles.reviewModalHeaderLeft}>
                  <View style={styles.reviewModalIcon}>
                    <Icon name="file-text" size={isMobile ? 16 : 20} color={NAVBAR_COLORS.primary} />
                  </View>
                  <Text style={[styles.reviewModalTitle, isMobile && styles.reviewModalTitleMobile]}>
                    Review Response
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReviewingResponse(null)}>
                  <Icon name="x" size={isMobile ? 20 : 24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.reviewModalBody}>
                <View style={styles.reviewInfo}>
                  <Text style={[styles.reviewInfoTitle, isMobile && styles.reviewInfoTitleMobile]}>
                    {reviewingResponse.department}
                  </Text>
                  <View style={[styles.reviewInfoRow, isMobile && styles.reviewInfoRowMobile]}>
                    <Text style={[styles.reviewInfoText, isMobile && styles.reviewInfoTextMobile]}>
                      Score:{' '}
                      <Text style={styles.reviewInfoStrong}>
                        {reviewingResponse.totalScore}/{reviewingResponse.maxPossibleScore}
                      </Text>
                    </Text>
                    <Text style={[styles.reviewInfoText, isMobile && styles.reviewInfoTextMobile]}>
                      Auditee:{' '}
                      <Text style={styles.reviewInfoStrong}>{reviewingResponse.auditeeName}</Text>
                    </Text>
                  </View>
                  <View style={styles.reviewStatus}>
                    <View style={[styles.reviewStatusBadge, { backgroundColor: getResponseStatusBadge(reviewingResponse.status).bg }]}>
                      <Text style={[styles.reviewStatusText, { color: getResponseStatusBadge(reviewingResponse.status).text }]}>
                        {reviewingResponse.status || 'DRAFT'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.reviewActions, isMobile && styles.reviewActionsMobile]}>
                  <TouchableOpacity
                    style={[styles.reviewAction, reviewApproved && styles.reviewActionActive]}
                    onPress={() => setReviewApproved(true)}
                  >
                    <View style={[styles.reviewRadio, reviewApproved && styles.reviewRadioActive]}>
                      {reviewApproved && <View style={styles.reviewRadioInner} />}
                    </View>
                    <Text style={[styles.reviewActionText, isMobile && styles.reviewActionTextMobile]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewAction, !reviewApproved && styles.reviewActionActive]}
                    onPress={() => setReviewApproved(false)}
                  >
                    <View style={[styles.reviewRadio, !reviewApproved && styles.reviewRadioActive]}>
                      {!reviewApproved && <View style={styles.reviewRadioInner} />}
                    </View>
                    <Text style={[styles.reviewActionText, isMobile && styles.reviewActionTextMobile]}>Reject</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.reviewCommentInput, isMobile && styles.reviewCommentInputMobile]}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder={reviewApproved ? "Add approval comments (optional)..." : "Please provide reason for rejection..."}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={isMobile ? 2 : 3}
                  textAlignVertical="top"
                />

                <View style={[styles.reviewModalFooter, isMobile && styles.reviewModalFooterMobile]}>
                  <TouchableOpacity style={[styles.reviewCancelButton, isMobile && styles.reviewCancelButtonMobile]} onPress={() => setReviewingResponse(null)}>
                    <Text style={[styles.reviewCancelText, isMobile && styles.reviewCancelTextMobile]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.reviewSubmitButton,
                      reviewApproved ? styles.reviewApproveButton : styles.reviewRejectButton,
                      isMobile && styles.reviewSubmitButtonMobile
                    ]}
                    onPress={handleReviewResponse}
                    disabled={submitting}
                  >
                    <Text style={[styles.reviewSubmitText, isMobile && styles.reviewSubmitTextMobile]}>
                      {submitting ? 'Processing...' : (reviewApproved ? 'Approve' : 'Reject')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    ...(isWeb && {
      maxWidth: isDesktop ? 1400 : '100%',
      marginHorizontal: 'auto',
    }),
  },
  contentScroll: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: isMobile ? 12 : 16,
    gap: isMobile ? 8 : 12,
    backgroundColor: '#FFFFFF',
    padding: isMobile ? 12 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(isWeb && {
      padding: isDesktop ? 20 : 16,
    }),
  },
  headerWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: isMobile ? 20 : 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: isMobile ? 11 : 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerSubtitleMobile: {
    fontSize: 11,
  },
  headerUser: {
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSeparator: {
    color: '#D1D5DB',
  },
  headerDept: {
    fontWeight: '500',
    color: NAVBAR_COLORS.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: isMobile ? '100%' : 'auto',
  },
  headerRightMobile: {
    flexWrap: 'wrap',
  },
  yearSelectorScroll: {
    flexDirection: 'row',
    maxWidth: isMobile ? '100%' : 300,
  },
  yearSelectorScrollMobile: {
    maxWidth: '100%',
    marginBottom: 4,
  },
  yearSelectorContent: {
    alignItems: 'center',
  },
  yearOption: {
    paddingHorizontal: isMobile ? 10 : 12,
    paddingVertical: isMobile ? 3 : 4,
    borderRadius: 6,
    marginRight: 4,
    backgroundColor: '#F3F4F6',
  },
  yearOptionMobile: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  yearOptionText: {
    fontSize: isMobile ? 11 : 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  yearOptionTextMobile: {
    fontSize: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: isMobile ? 10 : 12,
    paddingVertical: isMobile ? 5 : 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refreshButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  defaultContainer: {
    padding: 40,
    alignItems: 'center',
  },
  defaultText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Review Modal Styles
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? 8 : 16,
  },
  reviewModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: isMobile ? '95%' : 420,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  reviewModalContentMobile: {
    width: '95%',
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? 12 : 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reviewModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewModalIcon: {
    padding: 6,
    backgroundColor: NAVBAR_COLORS.bg,
    borderRadius: 8,
  },
  reviewModalTitle: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewModalTitleMobile: {
    fontSize: 14,
  },
  reviewModalBody: {
    padding: isMobile ? 12 : 16,
  },
  reviewInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: isMobile ? 10 : 12,
    marginBottom: isMobile ? 12 : 16,
  },
  reviewInfoTitle: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewInfoTitleMobile: {
    fontSize: 13,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  reviewInfoRowMobile: {
    flexDirection: 'column',
    gap: 2,
  },
  reviewInfoText: {
    fontSize: isMobile ? 11 : 12,
    color: '#6B7280',
  },
  reviewInfoTextMobile: {
    fontSize: 11,
  },
  reviewInfoStrong: {
    fontWeight: '600',
    color: NAVBAR_COLORS.primary,
  },
  reviewStatus: {
    marginTop: 8,
  },
  reviewStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  reviewStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: isMobile ? 12 : 16,
  },
  reviewActionsMobile: {
    gap: 12,
  },
  reviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewActionActive: {
    opacity: 1,
  },
  reviewRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewRadioActive: {
    borderColor: NAVBAR_COLORS.primary,
  },
  reviewRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVBAR_COLORS.primary,
  },
  reviewActionText: {
    fontSize: isMobile ? 12 : 13,
    color: '#6B7280',
  },
  reviewActionTextMobile: {
    fontSize: 12,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: isMobile ? 8 : 10,
    fontSize: isMobile ? 12 : 13,
    color: '#1F2937',
    minHeight: isMobile ? 60 : 80,
    marginBottom: isMobile ? 12 : 16,
    textAlignVertical: 'top',
  },
  reviewCommentInputMobile: {
    minHeight: 60,
    fontSize: 12,
  },
  reviewModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  reviewModalFooterMobile: {
    gap: 6,
  },
  reviewCancelButton: {
    paddingHorizontal: isMobile ? 12 : 16,
    paddingVertical: isMobile ? 6 : 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewCancelButtonMobile: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewCancelText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: isMobile ? 12 : 14,
  },
  reviewCancelTextMobile: {
    fontSize: 12,
  },
  reviewSubmitButton: {
    paddingHorizontal: isMobile ? 12 : 16,
    paddingVertical: isMobile ? 6 : 8,
    borderRadius: 8,
  },
  reviewSubmitButtonMobile: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewApproveButton: {
    backgroundColor: '#059669',
  },
  reviewRejectButton: {
    backgroundColor: '#DC2626',
  },
  reviewSubmitText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: isMobile ? 12 : 14,
  },
  reviewSubmitTextMobile: {
    fontSize: 12,
  },
});

// Export wrapped with ToastProvider
export default function LeadAuditorDashboard() {
  return (
    <ToastProvider>
      <LeadAuditorDashboardContent />
    </ToastProvider>
  );
}