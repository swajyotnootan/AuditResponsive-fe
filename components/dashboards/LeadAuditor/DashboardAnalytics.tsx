// app/components/dashboards/LeadAuditor/DashboardAnalytics.tsx
'use client';

import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// Types
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
}

interface Schedule {
  id: string | number;
  department?: string;
  auditeeName?: string;
  auditorId?: string | number;
  auditorName?: string;
  leadAuditorName?: string;
  scheduledDate?: string;
  status?: string;
  approvalStatus?: string;
  detailedApprovalStatus?: string;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  title?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  createdAt?: string;
}

interface Response {
  id: string | number;
  department?: string;
  status?: string;
  percentageScore?: number;
  createdAt?: string;
  submittedAt?: string;
}

interface DashboardAnalyticsProps {
  stats: Stats;
  allSchedules: Schedule[];
  allNCRs: NCR[];
  allResponses: Response[];
  carouselSpeed: number;
  setCarouselSpeed: (speed: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
  leadAuditorDepartment?: string | null;
}

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
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

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: string }> = ({ 
  title, value, subtitle, icon 
}) => (
  <View style={[styles.metricCard, isMobile && styles.metricCardMobile]}>
    <View style={styles.metricLeft}>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
    <View style={[styles.metricIcon, { backgroundColor: NAVBAR_COLORS.bg }]}>
      <Icon name={icon} size={isMobile ? 20 : 24} color={NAVBAR_COLORS.primary} />
    </View>
  </View>
);

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  stats,
  allSchedules,
  allNCRs,
  allResponses,
  carouselSpeed,
  setCarouselSpeed,
  onRefresh,
  refreshing,
  leadAuditorDepartment
}) => {
  const [selectedSpeed, setSelectedSpeed] = useState(carouselSpeed);

  const avgResponseScore = allResponses.length
    ? (allResponses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) / allResponses.length).toFixed(1)
    : 0;

  const totalAudits = allSchedules.filter(s => s.scheduledDate).length;
  const completedAudits = allSchedules.filter(s => s.status === 'COMPLETED').length;
  const approvedAudits = allSchedules.filter(s => s.status === 'APPROVED' || s.approvalStatus === 'APPROVED').length;

  const momImprovement = 8;

  const overdueAudits = allSchedules.filter(s => {
    if (!s.scheduledDate) return false;
    return new Date(s.scheduledDate) < new Date() && s.status !== 'COMPLETED' && s.status !== 'REJECTED';
  }).length;

  const alerts = [];
  if (stats.pendingApproval > 0) {
    alerts.push({ message: `${stats.pendingApproval} audit(s) pending approval`, time: 'Urgent', icon: 'clock' });
  }
  if (overdueAudits > 0) {
    alerts.push({ message: `${overdueAudits} overdue audit(s) need attention`, time: 'Overdue', icon: 'alert-triangle' });
  }
  if (stats.criticalNCRs > 0) {
    alerts.push({ message: `${stats.criticalNCRs} critical NCR(s) require immediate action`, time: 'High Priority', icon: 'alert-circle' });
  }
  if (stats.responsesSubmitted > 0) {
    alerts.push({ message: `${stats.responsesSubmitted} response(s) waiting for review`, time: 'Pending', icon: 'file-text' });
  }

  const speedOptions = [
    { label: '3 sec', value: 3000 },
    { label: '5 sec', value: 5000 },
    { label: '7 sec', value: 7000 },
    { label: '10 sec', value: 10000 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard title="Total Audits" value={totalAudits} subtitle="scheduled this year" icon="calendar" />
        <MetricCard title="Total NCRs" value={stats.totalNCRs} subtitle="non-conformities" icon="alert-triangle" />
        <MetricCard 
          title="Response Approval" 
          value={`${stats.totalResponses ? Math.round((stats.responsesApproved / stats.totalResponses) * 100) : 0}%`}
          subtitle="approved" 
          icon="thumbs-up" 
        />
        <MetricCard title="Avg Score" value={`${avgResponseScore}%`} subtitle="average score" icon="bar-chart-2" />
      </View>

      {/* Analytics Card */}
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <View>
            <Text style={styles.analyticsTitle}>Analytics Dashboard</Text>
            <Text style={styles.analyticsSubtitle}>Real-time audit performance metrics</Text>
          </View>
          <View style={styles.analyticsControls}>
            <View style={styles.speedSelector}>
              {speedOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.speedOption,
                    selectedSpeed === option.value && { backgroundColor: NAVBAR_COLORS.primary }
                  ]}
                  onPress={() => {
                    setSelectedSpeed(option.value);
                    setCarouselSpeed(option.value);
                  }}
                >
                  <Text style={[
                    styles.speedOptionText,
                    selectedSpeed === option.value && { color: '#FFFFFF' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: NAVBAR_COLORS.primary }]} 
              onPress={onRefresh}
            >
              <Icon name="refresh-cw" size={16} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chartPlaceholder}>
          <Icon name="bar-chart-2" size={60} color="#CBD5E1" />
          <Text style={styles.chartPlaceholderText}>Analytics Charts</Text>
          <Text style={styles.chartPlaceholderSubtext}>Charts would render here</Text>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomGrid}>
        {/* Key Insights */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIcon, { backgroundColor: NAVBAR_COLORS.bg }]}>
              <Icon name="target" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={styles.insightTitle}>Key Insights</Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Month-over-Month</Text>
              <Text style={[styles.insightItemValue, { color: '#22C55E' }]}>+{momImprovement}%</Text>
            </View>
            <Text style={styles.insightItemDesc}>Compared to previous month</Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Quality Score</Text>
              <Text style={[styles.insightItemValue, { color: '#22C55E' }]}>
                {Math.round((stats.responsesApproved / (stats.responsesApproved + stats.responsesRejected || 1)) * 100)}%
              </Text>
            </View>
            <Text style={styles.insightItemDesc}>Response quality rating</Text>
          </View>
          <View style={styles.insightItem}>
            <View style={styles.insightItemHeader}>
              <Text style={styles.insightItemTitle}>Audit Efficiency</Text>
              <Text style={[styles.insightItemValue, { color: '#22C55E' }]}>
                {stats.totalSchedules ? Math.round((stats.completedSchedules / stats.totalSchedules) * 100) : 0}%
              </Text>
            </View>
            <Text style={styles.insightItemDesc}>Audit completion efficiency</Text>
          </View>
        </View>

        {/* Alerts */}
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <View style={[styles.alertIcon, { backgroundColor: NAVBAR_COLORS.bg }]}>
              <Icon name="alert-circle" size={16} color={NAVBAR_COLORS.primary} />
            </View>
            <Text style={styles.alertTitle}>Alerts & Notifications</Text>
            {alerts.length > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: NAVBAR_COLORS.primary }]}>
                <Text style={styles.alertBadgeText}>{alerts.length}</Text>
              </View>
            )}
          </View>
          {alerts.length > 0 ? (
            alerts.map((alert, idx) => (
              <View key={idx} style={styles.alertItem}>
                <View style={[styles.alertItemIcon, { backgroundColor: NAVBAR_COLORS.bg }]}>
                  <Icon name={alert.icon} size={14} color={NAVBAR_COLORS.primary} />
                </View>
                <View style={styles.alertItemContent}>
                  <Text style={styles.alertItemMessage}>{alert.message}</Text>
                  <Text style={styles.alertItemTime}>{alert.time}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noAlerts}>
              <Icon name="check-circle" size={40} color="#22C55E" />
              <Text style={styles.noAlertsText}>No pending alerts</Text>
              <Text style={styles.noAlertsSubtext}>All systems running smoothly</Text>
            </View>
          )}
          <View style={styles.alertStats}>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatLabel}>Active Audits</Text>
              <Text style={[styles.alertStatValue, { color: NAVBAR_COLORS.primary }]}>{stats.inProgress || 0}</Text>
            </View>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatLabel}>Open NCRs</Text>
              <Text style={styles.alertStatValue}>{stats.openNCRs || 0}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: isMobile ? '45%' : '22%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: isMobile ? 12 : 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricCardMobile: {
    minWidth: '45%',
    padding: 10,
  },
  metricLeft: {
    flex: 1,
  },
  metricLabel: {
    fontSize: isMobile ? 11 : 14,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: isMobile ? 18 : 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  metricIcon: {
    padding: isMobile ? 8 : 12,
    borderRadius: 8,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  analyticsHeader: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: 12,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: isMobile ? 16 : 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  analyticsControls: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: 8,
    width: isMobile ? '100%' : 'auto',
  },
  speedSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  speedOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  speedOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  bottomGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 16,
    marginBottom: 20,
  },
  insightCard: {
    flex: isMobile ? 1 : 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightIcon: {
    padding: 6,
    borderRadius: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  insightItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightItemTitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  insightItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightItemDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  alertCard: {
    flex: isMobile ? 1 : 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertIcon: {
    padding: 6,
    borderRadius: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertItemIcon: {
    padding: 6,
    borderRadius: 8,
  },
  alertItemContent: {
    flex: 1,
  },
  alertItemMessage: {
    fontSize: 13,
    color: '#1F2937',
  },
  alertItemTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  noAlerts: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 8,
  },
  noAlertsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  alertStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  alertStatItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  alertStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  alertStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
});

export default DashboardAnalytics;