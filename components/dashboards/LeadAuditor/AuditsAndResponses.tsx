// app/components/dashboards/LeadAuditor/AuditsAndResponses.tsx
'use client';

import { format } from 'date-fns';
import React from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// Types
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
}

interface Response {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  status?: string;
  answers?: any;
  percentageScore?: number;
  totalScore?: number;
  maxPossibleScore?: number;
}

interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  username?: string;
}

interface AuditsAndResponsesProps {
  activeTab: string;
  allSchedules: Schedule[];
  allNCRs: NCR[];
  allResponses: Response[];
  allAuditors: User[];
  stats: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  responseViewMode: string;
  setResponseViewMode: (mode: string) => void;
  ncrViewMode: string;
  setNcrViewMode: (mode: string) => void;
  onViewResponse: (response: Response) => void;
  onReviewResponse: (response: Response) => void;
  onViewNCR: (ncr: NCR) => void;
  onViewResponseDetail: (response: Response) => void;
  leadAuditorDepartment?: string | null;
}

const { width, height } = Dimensions.get('window');
const isMobile = width < 768;

const NAVBAR_COLORS = {
  primary: '#00529B',
  secondary: '#3b82f6',
  dark: '#1e3a8a',
  light: '#60a5fa',
  lighter: '#93c5fd',
  bg: '#eff6ff',
  white: '#ffffff',
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

const AuditsAndResponses: React.FC<AuditsAndResponsesProps> = ({
  activeTab,
  allSchedules,
  allNCRs,
  allResponses,
  allAuditors,
  stats,
  searchTerm,
  setSearchTerm,
  responseViewMode,
  setResponseViewMode,
  ncrViewMode,
  setNcrViewMode,
  onViewResponse,
  onReviewResponse,
  onViewNCR,
  onViewResponseDetail,
  leadAuditorDepartment
}) => {
  const getStatusBadge = (status?: string) => {
    const colors: Record<string, any> = {
      'SCHEDULED': { bg: '#DBEAFE', text: '#2563EB' },
      'IN_PROGRESS': { bg: '#FEF3C7', text: '#D97706' },
      'COMPLETED': { bg: '#D1FAE5', text: '#059669' },
      'APPROVED': { bg: '#D1FAE5', text: '#059669' },
      'REJECTED': { bg: '#FEE2E2', text: '#DC2626' },
      'DRAFT': { bg: '#F3F4F6', text: '#6B7280' },
      'SUBMITTED': { bg: '#DBEAFE', text: '#2563EB' },
      'OPEN': { bg: '#DBEAFE', text: '#2563EB' },
      'CLOSED': { bg: '#D1FAE5', text: '#059669' },
    };
    return colors[status || ''] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const getSeverityBadge = (severity?: string) => {
    const colors: Record<string, any> = {
      'CRITICAL': { bg: '#FEE2E2', text: '#DC2626' },
      'MAJOR': { bg: '#FFEDD5', text: '#EA580C' },
      'MINOR': { bg: '#FEF3C7', text: '#D97706' }
    };
    return colors[severity || ''] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const getAuditorName = (auditorId?: string | number) => {
    if (!auditorId) return 'N/A';
    const auditor = allAuditors.find(a => a.id === auditorId);
    if (auditor) {
      return `${auditor.firstName || ''} ${auditor.lastName || ''}`.trim() || auditor.username || 'N/A';
    }
    return 'N/A';
  };

  const getFilteredSchedules = () => {
    let schedules = allSchedules;
    if (searchTerm) {
      schedules = schedules.filter(s => 
        s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return schedules.filter(s => {
      if (!s.scheduledDate) return false;
      const scheduledStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED'];
      return scheduledStatuses.includes(s.status || '');
    });
  };

  // Render Audits Tab
  if (activeTab === 'audits') {
    const scheduledAudits = getFilteredSchedules();

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search audits by department or auditee..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {scheduledAudits.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No Scheduled Audits</Text>
            <Text style={styles.emptyStateText}>
              {searchTerm ? `No scheduled audits match "${searchTerm}"` : 'No audits have been scheduled'}
            </Text>
          </View>
        ) : (
          <Card>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.deptCell]}>Department</Text>
                  <Text style={[styles.headerCell, styles.auditorCell]}>Auditor(s)</Text>
                  <Text style={[styles.headerCell, styles.auditeeCell]}>Auditee</Text>
                  <Text style={[styles.headerCell, styles.dateCell]}>Date & Time</Text>
                  <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
                  <Text style={[styles.headerCell, styles.overdueCell]}>Overdue</Text>
                </View>

                {scheduledAudits.map((s) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  let isOverdue = false;
                  if (s.scheduledDate && s.status !== 'COMPLETED' && s.status !== 'APPROVED' && s.status !== 'REJECTED') {
                    const scheduledDate = new Date(s.scheduledDate);
                    scheduledDate.setHours(0, 0, 0, 0);
                    isOverdue = scheduledDate < today;
                  }

                  const statusColors = getStatusBadge(s.status);
                  const primaryAuditorName = getAuditorName(s.auditorId);
                  const leadAuditorName = s.leadAuditorName;

                  let auditorDisplay = primaryAuditorName;
                  if (leadAuditorName && leadAuditorName !== primaryAuditorName) {
                    auditorDisplay += ` (Lead: ${leadAuditorName})`;
                  }

                  const formatDateTime = () => {
                    if (!s.scheduledDate) return 'Not Scheduled';
                    const date = format(new Date(s.scheduledDate), 'dd MMM yyyy');
                    if (s.startTime && s.endTime) {
                      return `${date} • ${s.startTime} - ${s.endTime}`;
                    }
                    return date;
                  };

                  return (
                    <View key={String(s.id)} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.deptCell]} numberOfLines={1}>{s.department || 'N/A'}</Text>
                      <Text style={[styles.tableCell, styles.auditorCell]} numberOfLines={1}>{auditorDisplay}</Text>
                      <Text style={[styles.tableCell, styles.auditeeCell]} numberOfLines={1}>{s.auditeeName || 'N/A'}</Text>
                      <Text style={[styles.tableCell, styles.dateCell]} numberOfLines={1}>{formatDateTime()}</Text>
                      <View style={[styles.tableCell, styles.statusCell]}>
                        <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                          <Text style={[styles.badgeText, { color: statusColors.text }]}>{s.status || 'DRAFT'}</Text>
                        </View>
                      </View>
                      <View style={[styles.tableCell, styles.overdueCell]}>
                        {isOverdue ? (
                          <View style={[styles.badge, styles.overdueBadge]}>
                            <Icon name="alert-circle" size={10} color="#FFFFFF" />
                            <Text style={styles.overdueText}>Overdue</Text>
                          </View>
                        ) : (
                          <Text style={styles.dashText}>—</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        )}
      </View>
    );
  }

  // Render Responses Tab
  if (activeTab === 'responses') {
    const filteredResponses = allResponses.filter(r => {
      if (!searchTerm) return true;
      const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
      return r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             r.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             answers?.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const renderResponseItem = ({ item }: { item: Response }) => {
      const answers = typeof item.answers === 'string' ? JSON.parse(item.answers) : item.answers;
      const statusColors = getStatusBadge(item.status);
      const auditorName = getAuditorName(item.auditorId);

      return (
        <View style={styles.responseCard}>
          <View style={styles.responseHeader}>
            <Text style={styles.responseId}>{answers?.documentNumber || `RES-${item.id}`}</Text>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>{item.status || 'DRAFT'}</Text>
            </View>
          </View>
          <Text style={styles.responseDepartment}>{item.department || 'N/A'}</Text>
          <Text style={styles.responseAuditee}>Auditee: {answers?.auditeeName || item.auditeeName || 'N/A'}</Text>
          <View style={styles.responseFooter}>
            <Text style={styles.responseScore}>
              Score: <Text style={styles.responseScoreValue}>{(item.percentageScore || 0).toFixed(2)}%</Text>
            </Text>
            <Text style={styles.responseAuditor}>Auditor: {auditorName}</Text>
          </View>
          <View style={styles.responseActions}>
            <TouchableOpacity style={styles.responseActionButton} onPress={() => onViewResponse(item)}>
              <Icon name="eye" size={14} color="#6B7280" />
              <Text style={styles.responseActionText}>View</Text>
            </TouchableOpacity>
            {item.status === 'SUBMITTED' && (
              <TouchableOpacity style={[styles.responseActionButton, styles.reviewButton]} onPress={() => onReviewResponse(item)}>
                <Icon name="check" size={14} color="#FFFFFF" />
                <Text style={[styles.responseActionText, styles.reviewButtonText]}>Review</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    };

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search responses by document, department, auditee..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, responseViewMode === 'grid' && styles.toggleActive]} 
              onPress={() => setResponseViewMode('grid')}
            >
              <Icon name="grid" size={16} color={responseViewMode === 'grid' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, responseViewMode === 'list' && styles.toggleActive]} 
              onPress={() => setResponseViewMode('list')}
            >
              <Icon name="list" size={16} color={responseViewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCardSmall}>
            <Text style={styles.statCardValue}>{allResponses.length}</Text>
            <Text style={styles.statCardLabel}>Total</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statCardValue, { color: '#059669' }]}>{stats.responsesApproved}</Text>
            <Text style={[styles.statCardLabel, { color: '#059669' }]}>APPROVED</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statCardValue, { color: '#DC2626' }]}>{stats.responsesRejected}</Text>
            <Text style={[styles.statCardLabel, { color: '#DC2626' }]}>REJECTED</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statCardValue, { color: '#D97706' }]}>{stats.responsesSubmitted}</Text>
            <Text style={[styles.statCardLabel, { color: '#D97706' }]}>SUBMITTED</Text>
          </View>
        </View>

        {filteredResponses.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No responses found</Text>
            <Text style={styles.emptyStateText}>No check sheet responses match your search</Text>
          </View>
        ) : (
          <FlatList
            data={filteredResponses}
            renderItem={renderResponseItem}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={styles.responsesList}
          />
        )}
      </View>
    );
  }

  // Render NCRs Tab
  if (activeTab === 'ncrs') {
    const filteredNCRs = allNCRs.filter(n => {
      if (!searchTerm) return true;
      return n.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             n.department?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const criticalCount = allNCRs.filter(n => n.severity === 'CRITICAL').length;
    const majorCount = allNCRs.filter(n => n.severity === 'MAJOR').length;
    const minorCount = allNCRs.filter(n => n.severity === 'MINOR').length;
    const openCount = allNCRs.filter(n => n.status === 'OPEN' || n.status === 'IN_PROGRESS').length;
    const closedCount = allNCRs.filter(n => n.status === 'CLOSED').length;

    const renderNCRItem = ({ item }: { item: NCR }) => {
      const severityColors = getSeverityBadge(item.severity);
      const statusColors = getStatusBadge(item.status);

      return (
        <TouchableOpacity style={styles.ncrCard} onPress={() => onViewNCR(item)}>
          <View style={styles.ncrHeader}>
            <View style={[styles.badge, { backgroundColor: severityColors.bg }]}>
              <Icon name="alert-circle" size={10} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>{item.severity || 'NCR'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>{item.status || 'OPEN'}</Text>
            </View>
          </View>
          <Text style={styles.ncrNumber}>{item.ncrNumber || `NCR-${item.id}`}</Text>
          <View style={styles.ncrFooter}>
            <Text style={styles.ncrDept}>Dept: {item.department || 'N/A'}</Text>
            <Text style={styles.ncrDate}>
              {item.createdAt ? format(new Date(item.createdAt), 'dd-MM-yyyy') : 'N/A'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search NCRs by number, title, department..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, ncrViewMode === 'grid' && styles.toggleActive]} 
              onPress={() => setNcrViewMode('grid')}
            >
              <Icon name="grid" size={16} color={ncrViewMode === 'grid' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, ncrViewMode === 'list' && styles.toggleActive]} 
              onPress={() => setNcrViewMode('list')}
            >
              <Icon name="list" size={16} color={ncrViewMode === 'list' ? '#FFFFFF' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* NCR Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCardSmall, { backgroundColor: '#FFFFFF' }]}>
            <Text style={styles.statCardValue}>{allNCRs.length}</Text>
            <Text style={styles.statCardLabel}>Total NCRs</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statCardValue, { color: '#DC2626' }]}>{criticalCount}</Text>
            <Text style={[styles.statCardLabel, { color: '#DC2626' }]}>Critical</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#FFEDD5' }]}>
            <Text style={[styles.statCardValue, { color: '#EA580C' }]}>{majorCount}</Text>
            <Text style={[styles.statCardLabel, { color: '#EA580C' }]}>Major</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statCardValue, { color: '#D97706' }]}>{minorCount}</Text>
            <Text style={[styles.statCardLabel, { color: '#D97706' }]}>Minor</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: '#EDE9FE' }]}>
            <Text style={[styles.statCardValue, { color: '#7C3AED' }]}>{openCount}</Text>
            <Text style={[styles.statCardLabel, { color: '#7C3AED' }]}>Open / In Progress</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {allNCRs.length > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Closure Progress</Text>
              <Text style={styles.progressPercent}>{Math.round((closedCount / allNCRs.length) * 100)}% Closed</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(closedCount / allNCRs.length) * 100}%` }]} />
            </View>
          </View>
        )}

        {filteredNCRs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="alert-triangle" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No NCRs found</Text>
            <Text style={styles.emptyStateText}>
              {leadAuditorDepartment 
                ? `No non-conformity reports found for ${leadAuditorDepartment} department`
                : 'No non-conformity reports match your search'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNCRs}
            renderItem={renderNCRItem}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={styles.ncrsList}
          />
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: NAVBAR_COLORS.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statCardSmall: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statCardLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 11,
    color: '#1F2937',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deptCell: { width: isMobile ? 60 : 80 },
  auditorCell: { width: isMobile ? 80 : 100 },
  auditeeCell: { width: isMobile ? 60 : 80 },
  dateCell: { width: isMobile ? 80 : 120 },
  statusCell: { width: isMobile ? 60 : 80 },
  overdueCell: { width: isMobile ? 50 : 60 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '500',
  },
  overdueBadge: {
    backgroundColor: '#EF4444',
  },
  overdueText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dashText: {
    color: '#9CA3AF',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  responsesList: {
    gap: 8,
  },
  responseCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  responseId: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  responseDepartment: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  responseAuditee: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  responseScore: {
    fontSize: 12,
    color: '#6B7280',
  },
  responseScoreValue: {
    fontWeight: '600',
    color: '#1F2937',
  },
  responseAuditor: {
    fontSize: 12,
    color: '#6B7280',
  },
  responseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  responseActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  responseActionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewButton: {
    backgroundColor: NAVBAR_COLORS.primary,
    borderColor: NAVBAR_COLORS.primary,
  },
  reviewButtonText: {
    color: '#FFFFFF',
  },
  ncrsList: {
    gap: 8,
  },
  ncrCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  ncrHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  ncrNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  ncrFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ncrDept: {
    fontSize: 12,
    color: '#6B7280',
  },
  ncrDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
});

export default AuditsAndResponses;