// app/hooks/useAuditData.ts

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AuditSchedule,
    ChartData,
    DepartmentNCRData,
    FormStatus,
    NCR,
    PendingRequest,
    Stats,
    User
} from '../components/types/audit.types';
import {
    auditPlanApi,
    auditScheduleApi,
    departmentPlanApi,
    ncrApi,
    userApi
} from '../services/auditScheduleApi';

interface UseAuditDataProps {
  selectedYear: number;
  userId?: string | number;
}

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending' | 'locked';
  icon: string;
  time?: string;
}

export const useAuditData = ({ selectedYear, userId }: UseAuditDataProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [allNCRs, setAllNCRs] = useState<NCR[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAudits: 0,
    completedAudits: 0,
    pendingSchedules: 0,
    openNCRs: 0,
    pendingRequests: 0,
    pendingCaVerification: 0,
  });
  const [form3Status, setForm3Status] = useState<FormStatus>({ status: 'NOT_STARTED', year: selectedYear });
  const [form4Status, setForm4Status] = useState<FormStatus>({ status: 'NOT_STARTED', year: selectedYear });
  const [hasApprovedForm5, setHasApprovedForm5] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        form3Response,
        form4Response,
        form5Response,
        requestsResponse,
        ncrResponse,
        userResponse,
        scheduleResponse,
      ] = await Promise.all([
        auditPlanApi.getPlanByYear(selectedYear).catch(() => ({ data: { approvalStatus: 'NOT_STARTED' } })),
        departmentPlanApi.getPlanByYear(selectedYear).catch(() => ({ data: { approvalStatus: 'NOT_STARTED' } })),
        auditScheduleApi.getAvailableMonths(selectedYear).catch(() => ({ data: [] })),
        auditScheduleApi.getPendingRequests().catch(() => ({ data: [] })),
        ncrApi.getAllNCRs().catch(() => ({ data: [] })),
        userApi.getAll().catch(() => ({ data: [] })),
        userId 
          ? auditScheduleApi.getSchedulesWithStatus(userId).catch(() => ({ data: [] })) 
          : Promise.resolve({ data: [] }),
      ]);

      // Extract data from axios responses
      const form3 = form3Response?.data || { approvalStatus: 'NOT_STARTED' };
      const form4 = form4Response?.data || { approvalStatus: 'NOT_STARTED' };
      const form5 = form5Response?.data || [];
      const requests = requestsResponse?.data || [];
      const ncrData = ncrResponse?.data || [];
      const userData = userResponse?.data || [];
      const scheduleData = scheduleResponse?.data || [];

      setForm3Status({ 
        status: form3?.approvalStatus || 'NOT_STARTED', 
        year: selectedYear 
      });
      setForm4Status({ 
        status: form4?.approvalStatus || 'NOT_STARTED', 
        year: selectedYear 
      });
      setHasApprovedForm5(form5.some((m: any) => m.approvalStatus === 'APPROVED'));
      setPendingRequests(requests);
      setAllNCRs(ncrData);
      setAllUsers(userData);
      setSchedules(scheduleData);

      // Calculate stats
      const totalAudits = scheduleData.length;
      const completedAudits = scheduleData.filter(
        (s: AuditSchedule) => s.status === 'COMPLETED' || s.status === 'CLOSED'
      ).length;
      const pendingSchedules = scheduleData.filter(
        (s: AuditSchedule) =>
          s.approvalStatus === 'PENDING_APPROVAL' ||
          (s.approvalStatus === 'APPROVED' && s.status === 'SCHEDULED')
      ).length;
      const openNCRs = ncrData.filter(
        (n: NCR) => n.status !== 'CLOSED' && n.status !== 'NCR2_COMPLETED'
      ).length;
      const pendingCaVerification = ncrData.filter(
        (n: NCR) => n.status === 'IN_PROGRESS' || n.status === 'NCR2_IN_PROGRESS'
      ).length;

      setStats({
        totalAudits,
        completedAudits,
        pendingSchedules,
        openNCRs,
        pendingRequests: requests.length,
        pendingCaVerification,
      });

    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, userId]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
  }, [fetchAllData]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [selectedYear]);

  // Get available years
  useEffect(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) years.add(i);
    if (form3Status.year) years.add(form3Status.year);
    if (form4Status.year) years.add(form4Status.year);
    setAvailableYears(Array.from(years).sort((a, b) => b - a));
  }, [form3Status, form4Status]);

  // Monthly trend data
  const monthlyTrendData = useMemo((): ChartData[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);

    schedules.forEach(schedule => {
      const dateStr = schedule.auditDate || schedule.scheduledDate || schedule.date;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() === selectedYear) {
          const month = date.getMonth();
          monthCounts[month]++;
        }
      }
    });

    return monthNames.map((name, idx) => ({
      label: name,
      value: monthCounts[idx],
    }));
  }, [schedules, selectedYear]);

  // NCR distribution data - ✅ FIXED: uses 'label' instead of 'name'
  const ncrDistributionData = useMemo((): ChartData[] => {
    if (allNCRs.length === 0) return [];

    const statusGroups: Record<string, number> = {
      'Open': 0,
      'In Progress': 0,
      'Pending Verification': 0,
      'Closed': 0,
      'Completed': 0,
    };

    allNCRs.forEach(ncr => {
      const status = (ncr.status || '').toUpperCase();
      if (status === 'CLOSED') statusGroups['Closed']++;
      else if (status === 'NCR2_COMPLETED' || status === 'COMPLETED') statusGroups['Completed']++;
      else if (status === 'IN_PROGRESS' || status === 'NCR2_IN_PROGRESS') statusGroups['Pending Verification']++;
      else if (status === 'OPEN' || status === 'NEW' || status === 'DRAFT') statusGroups['Open']++;
      else statusGroups['In Progress']++;
    });

    const colors = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'];
    
    // ✅ FIXED: Use 'label' instead of 'name'
    return Object.entries(statusGroups)
      .filter(([_, value]) => value > 0)
      .map(([label, value], index) => ({
        label,  // ✅ Changed from 'name' to 'label'
        value,
        color: colors[index % colors.length],
      }));
  }, [allNCRs]);

  // NCR by department
  const ncrByDepartmentData = useMemo((): DepartmentNCRData[] => {
    if (allNCRs.length === 0) return [];

    const deptCounts: Record<string, number> = {};
    allNCRs.forEach(ncr => {
      const dept = ncr.department || ncr.auditDepartment || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    return Object.entries(deptCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [allNCRs]);

  // Recent activities
  const recentActivities = useMemo(() => {
    const activities: any[] = [];

    pendingRequests.slice(0, 3).forEach(req => {
      activities.push({
        title: `${req.type === 'RESCHEDULE' ? 'Reschedule' : 'Extension'} Request`,
        description: `${req.auditType} - ${req.department}`,
        time: new Date(req.requestedAt).toLocaleDateString(),
        icon: 'message-square',
      });
    });

    if (stats.openNCRs > 0) {
      activities.push({
        title: 'Open NCRs',
        description: `${stats.openNCRs} non-conformance reports require attention`,
        time: 'Active',
        icon: 'alert-circle',
      });
    }

    if (form3Status.status === 'APPROVED') {
      activities.push({
        title: 'Annual Audit Plan Approved',
        description: `Form 3 for ${selectedYear} has been approved`,
        time: 'Recent',
        icon: 'check-circle',
      });
    }

    if (form4Status.status === 'APPROVED') {
      activities.push({
        title: 'Department Plan Approved',
        description: `Form 4 for ${selectedYear} has been approved`,
        time: 'Recent',
        icon: 'file-text',
      });
    }

    return activities.slice(0, 5);
  }, [pendingRequests, stats, form3Status, form4Status, selectedYear]);

  // Workflow steps
  const workflowSteps = useMemo((): WorkflowStep[] => {
    const isForm3Approved = form3Status.status === 'APPROVED';
    const isForm4Approved = form4Status.status === 'APPROVED';
    const isForm5Approved = hasApprovedForm5;

    return [
      {
        id: 1,
        title: 'Annual Audit Plan',
        description: 'Form 3 - Define yearly audit elements',
        status: isForm3Approved ? 'completed' : form3Status.status === 'PENDING_APPROVAL' ? 'pending' : 'locked',
        icon: 'file-text',
        time: isForm3Approved ? 'Approved' : form3Status.status === 'PENDING_APPROVAL' ? 'Pending' : 'Locked',
      },
      {
        id: 2,
        title: 'Department Audit Plan',
        description: 'Form 4 - Assign audits to departments',
        status: !isForm3Approved ? 'locked' : isForm4Approved ? 'completed' : form4Status.status === 'PENDING_APPROVAL' ? 'pending' : 'in-progress',
        icon: 'users',
        time: isForm4Approved ? 'Approved' : isForm3Approved ? 'In Progress' : 'Locked',
      },
      {
        id: 3,
        title: 'Schedule Dashboard',
        description: 'Form 5 - Month-wise audit schedule',
        status: !isForm4Approved ? 'locked' : isForm5Approved ? 'completed' : 'in-progress',
        icon: 'grid',
        time: isForm5Approved ? 'Approved' : isForm4Approved ? 'In Progress' : 'Locked',
      },
      {
        id: 4,
        title: 'Schedule Calendar',
        description: 'Daily schedules with time slots',
        status: !isForm5Approved ? 'locked' : 'pending',
        icon: 'calendar',
        time: !isForm5Approved ? 'Locked' : 'Ready',
      },
    ];
  }, [form3Status, form4Status, hasApprovedForm5]);

  return {
    loading,
    refreshing,
    schedules,
    pendingRequests,
    allNCRs,
    allUsers,
    stats,
    form3Status,
    form4Status,
    hasApprovedForm5,
    availableYears,
    monthlyTrendData,
    ncrDistributionData,
    ncrByDepartmentData,
    recentActivities,
    workflowSteps,
    refreshData,
    fetchAllData,
  };
};

export default useAuditData;