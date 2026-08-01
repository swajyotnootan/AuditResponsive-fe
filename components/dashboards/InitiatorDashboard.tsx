// src/Components/eightd/InitiatorDashboard.tsx
import { API_BASE_URL } from '@/config/apiConfig';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronRight, FileText, Search, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useAuth } from '../../components/context/AuthContext';
import { useToast } from '../../components/context/ToastContext';

// ========== BRIGHT MNC ENTERPRISE THEME (Atlassian/Jira Style) ==========
const COLORS = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  primary: '#0052CC',
  primaryLight: '#DEEBFF',
  textDark: '#172B4D',
  textMedium: '#5E6C84',
  textLight: '#7A869A',
  border: '#DFE1E6',
  success: '#00875A',
  successLight: '#E3FCEF',
  warning: '#FF991F',
  warningLight: '#FFFAE6',
  danger: '#DE350B',
  dangerLight: '#FFEBE6',
  purple: '#6554C0',
  purpleLight: '#EAE6FF',
};

// ========== TYPES ==========
interface Report {
  id: string;
  eventNo: string;
  title: string;
  owner: string;
  status: string;
  created: string;
  createdAt: string;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  priority: string;
  department: string;
  problem?: string;
  description?: string;
  initiatorEmail: string;
  rejectionReason?: string;
  d0_id?: string;
  d1_id?: string;
  d2_id?: string;
  d3_id?: string;
  d4_id?: string;
  d5_id?: string;
  d6_id?: string;
  d7_id?: string;
  d8_id?: string;
  isNcrBased?: boolean;
}

// ========== UI COMPONENTS ==========

// 1. Status Badge (Soft Pastel Backgrounds)
const StatusBadge = ({ status }: { status: string }) => {
  const getConfig = (s: string) => {
    switch (s) {
      case 'COMPLETED': case 'CLOSED': return { text: 'Completed', bg: COLORS.successLight, color: COLORS.success };
      case 'IN_PROGRESS': return { text: 'In Progress', bg: COLORS.primaryLight, color: COLORS.primary };
      case 'UNDER_REVIEW': return { text: 'Under Review', bg: COLORS.warningLight, color: COLORS.warning };
      case 'REJECTED': return { text: 'Rejected', bg: COLORS.dangerLight, color: COLORS.danger };
      default: return { text: 'Draft', bg: '#F4F5F7', color: COLORS.textMedium };
    }
  };
  const config = getConfig(status);
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

// 2. 8D Step Progress Bar
const StepProgress = ({ current, total }: { current: number, total: number }) => {
  const percent = (current / total) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.progressText}>{current}/{total} Steps</Text>
    </View>
  );
};

// 3. Action Card
const ActionCard = ({ title, desc, icon: Icon, theme, onPress, isDesktop }: any) => (
  <TouchableOpacity 
    style={[styles.actionCard, isDesktop && styles.actionCardDesktop, { borderLeftColor: theme.accent }]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.actionIconBox, { backgroundColor: theme.bg }]}>
      <Icon size={24} color={theme.accent} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDesc} numberOfLines={2}>{desc}</Text>
    </View>
    <View style={[styles.actionBtn, { backgroundColor: theme.bg }]}>
      <Text style={[styles.actionBtnText, { color: theme.accent }]}>Start</Text>
      <ChevronRight size={16} color={theme.accent} />
    </View>
  </TouchableOpacity>
);

// 4. Report Card (Jira Ticket Style)
const ReportCard = ({ report, onPress, isDesktop }: { report: Report, onPress: () => void, isDesktop: boolean }) => {
  const priorityConfig = report.priority === 'HIGH' || report.priority === 'CRITICAL' 
    ? { color: COLORS.danger, bg: COLORS.dangerLight } 
    : report.priority === 'MEDIUM' 
    ? { color: COLORS.warning, bg: COLORS.warningLight }
    : { color: COLORS.success, bg: COLORS.successLight };

  // Show NCR badge if it's NCR-based
  const isNcrBased = report.isNcrBased || report.d0_id;

  return (
    <TouchableOpacity 
      style={[styles.reportCard, isDesktop && styles.reportCardDesktop]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardIconBox}>
          <FileText size={20} color={COLORS.primary} />
          {isNcrBased && (
            <View style={styles.ncrBadge}>
              <Text style={styles.ncrBadgeText}>NCR</Text>
            </View>
          )}
        </View>
        <StatusBadge status={report.status} />
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>{report.title || '8D Quality Report'}</Text>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMeta}>ID: {report.eventNo}</Text>
        <Text style={styles.cardMetaDot}>•</Text>
        <Text style={styles.cardMeta}>{report.department || 'Quality'}</Text>
        {isNcrBased && (
          <>
            <Text style={styles.cardMetaDot}>•</Text>
            <Text style={[styles.cardMeta, { color: COLORS.purple }]}>NCR Based</Text>
          </>
        )}
      </View>

      <StepProgress current={report.completedSteps} total={report.totalSteps} />

      <View style={styles.cardBottomRow}>
        <View style={[styles.priorityTag, { backgroundColor: priorityConfig.bg }]}>
          <Text style={[styles.priorityText, { color: priorityConfig.color }]}>{report.priority}</Text>
        </View>
        
        <TouchableOpacity style={styles.continueBtn} onPress={onPress}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <ChevronRight size={14} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ========== MAIN DASHBOARD ==========
export default function InitiatorDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  // Helper to get current step
  const getCurrentStep = (item: any): string => {
    const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];
    for (let i = 0; i < steps.length; i++) {
      if (!item[`d${i}_id`]) {
        return steps[i];
      }
    }
    return "D8";
  };

  // Helper to check if event is NCR based
  const isNcrBasedEvent = (item: any): boolean => {
    const d0Data = Array.isArray(item?.content?.d0) ? item.content.d0[0] : null;
    return Boolean(
      d0Data?.sourceNcrId ||
      d0Data?.sourceNcrNumber ||
      d0Data?.isNcrBased ||
      d0Data?.sourceType === "ncr" ||
      item?.isNcrBased ||
      item?.sourceType === "ncr" ||
      String(item?.eventNo || "").startsWith("8D-")
    );
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/eightd/data?t=${Date.now()}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      
      if (result?.success && Array.isArray(result.data)) {
        const parsedEvents: Report[] = result.data.map((item: any) => {
          const steps = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"];
          let completedCount = 0;
          steps.forEach((_, index) => { if (item[`d${index}_id`]) completedCount++; });

          const currentStep = getCurrentStep(item);
          const isNcrBased = isNcrBasedEvent(item);

          const statusMap: Record<string, string> = {
            "IN_PROGRESS": "IN_PROGRESS",
            "APPROVAL_PENDING": "UNDER_REVIEW",
            "REJECTED": "REJECTED",
            "D0_APPROVED": "IN_PROGRESS",
            "CLOSED": "COMPLETED",
            "COMPLETED": "COMPLETED",
            "DRAFT": "DRAFT",
            "OPEN": "DRAFT"
          };

          return {
            id: item.eventNo || item.id,
            eventNo: item.eventNo,
            title: item.eventNo || '8D Report',
            owner: item.initiatorEmail || user?.name || "Unassigned",
            status: statusMap[item.status] || item.status?.toUpperCase() || "DRAFT",
            created: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : "N/A",
            createdAt: item.createdAt,
            currentStep,
            completedSteps: completedCount,
            totalSteps: steps.length,
            priority: item.priority || "MEDIUM",
            department: item.department || 'Quality',
            problem: item.problem,
            initiatorEmail: item.initiatorEmail,
            rejectionReason: item.rejectionComment,
            d0_id: item.d0_id,
            d1_id: item.d1_id,
            d2_id: item.d2_id,
            d3_id: item.d3_id,
            d4_id: item.d4_id,
            d5_id: item.d5_id,
            d6_id: item.d6_id,
            d7_id: item.d7_id,
            d8_id: item.d8_id,
            isNcrBased
          };
        });
        parsedEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReports(parsedEvents);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to load reports.');
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchReports(); }, []);

  const filteredReports = reports.filter(r => 
    r.eventNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Navigation handlers - Both create options go to the same LandingPage with different type
  const handleNavigate = (params: any) => {
    if (params.createNew) {
      // Navigate to LandingPage with type parameter
      const type = params.type || 'all';
      router.push({
        pathname: '../landing-page',
        params: {
          type: type,
          tab: type === 'fresh' ? 'Fresh 8D' : type === 'ncr' ? 'NCR 8D' : 'All 8D'
        }
      });
    } else if (params.selectedEventId) {
      // Continue with existing event - go to eightdflow
      const event = reports.find(r => r.eventNo === params.selectedEventId);
      if (event) {
        const nextStep = getCurrentStep(event);
        router.push({
          pathname: '../eightdflow',
          params: {
            eventId: params.selectedEventId,
            step: nextStep,
            type: event.isNcrBased ? 'ncr' : 'fresh',
            isNcrBased: event.isNcrBased ? 'true' : 'false'
          }
        });
      } else {
        Alert.alert('Error', 'Event not found');
      }
    }
  };

  if (loading && reports.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.pageTitle}>8D Management</Text>
          <Text style={styles.pageSubtitle}>{filteredReports.length} Active Reports</Text>
        </View>
        <View style={styles.searchBox}>
          <Search size={18} color={COLORS.textLight} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search ID, Dept, or Status..." 
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.body} 
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Action Cards - Both go to LandingPage with different type */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={[styles.actionGrid, isDesktop && styles.actionGridDesktop]}>
          <ActionCard 
            title="Create Fresh 8D"
            desc="Start a new 8D report from scratch for general quality issues."
            icon={Zap}
            theme={{ accent: COLORS.primary, bg: COLORS.primaryLight }}
            onPress={() => handleNavigate({ createNew: true, type: 'fresh' })}
            isDesktop={isDesktop}
          />
          <ActionCard 
            title="NCR Based 8D"
            desc="Convert an existing Non-Conformance Report into an 8D workflow."
            icon={AlertTriangle}
            theme={{ accent: COLORS.purple, bg: COLORS.purpleLight }}
            onPress={() => handleNavigate({ createNew: true, type: 'ncr' })}
            isDesktop={isDesktop}
          />
        </View>

        {/* Reports List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
        </View>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySub}>Try a different search or create a new 8D report.</Text>
          </View>
        ) : (
          <View style={[styles.reportsGrid, isDesktop && styles.reportsGridDesktop]}>
            {filteredReports.map((report) => (
              <ReportCard 
                key={report.id} 
                report={report} 
                onPress={() => handleNavigate({ selectedEventId: report.eventNo })} 
                isDesktop={isDesktop}
              />
            ))}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loaderText: { marginTop: 12, color: COLORS.textMedium, fontSize: 16 },
  
  pageHeader: { 
    backgroundColor: COLORS.card, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2
  },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textDark },
  pageSubtitle: { fontSize: 13, color: COLORS.textMedium, marginTop: 2 },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.bg, 
    borderRadius: 6, 
    paddingHorizontal: 12, 
    height: 40, 
    width: 280, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, marginLeft: 8, padding: 0 },

  body: { flex: 1 },
  bodyContent: { padding: 20, maxWidth: 1200, width: '100%', alignSelf: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },

  actionGrid: { gap: 12, marginBottom: 12 },
  actionGridDesktop: { flexDirection: 'row' },
  
  actionCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: 8, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.border,
    borderLeftWidth: 4, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2
  },
  actionCardDesktop: { flex: 1, marginRight: 12 },
  actionIconBox: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionContent: { flex: 1, marginRight: 16 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
  actionDesc: { fontSize: 13, color: COLORS.textMedium, lineHeight: 18 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  reportsGrid: { gap: 12 },
  reportsGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },

  reportCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: 8, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2
  },
  reportCardDesktop: { width: '48.5%' },
  
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardIconBox: { 
    width: 36, 
    height: 36, 
    borderRadius: 8, 
    backgroundColor: COLORS.primaryLight, 
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative'
  },
  ncrBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.purple,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ncrBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  cardMeta: { fontSize: 13, color: COLORS.textMedium },
  cardMetaDot: { fontSize: 13, color: COLORS.textLight, marginHorizontal: 6 },

  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressBg: { flex: 1, height: 6, backgroundColor: COLORS.bg, borderRadius: 3, marginRight: 12, maxWidth: 150 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  progressText: { fontSize: 12, fontWeight: '600', color: COLORS.textMedium },

  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.bg, paddingTop: 12 },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priorityText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  
  continueBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  continueBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  emptyState: { alignItems: 'center', paddingVertical: 60, backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginTop: 16 },
  emptySub: { fontSize: 14, color: COLORS.textMedium, marginTop: 8 },
});