import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  ArrowRightCircle,
  BarChart2,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Grid,
  Layers,
  Lock,
  MessageSquare,
  MoreVertical,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import YearFilter from "../common/YearFilter";

import Form3View from "@/components/dashboards/auditManager/Form3View";
import Form4View from "@/components/dashboards/auditManager/Form4View";
import Form5Dashboard from "@/components/dashboards/auditManager/Form5Dashboard";
import Form5DetailedView from "@/components/dashboards/auditManager/Form5DetailedView";
import Form5View from "@/components/dashboards/auditManager/Form5View";
import Form9View from "@/components/dashboards/auditManager/Form9View";
import NCRDashboard from "@/components/dashboards/auditManager/NCRDashboard";
import WeekSelectionView from "@/components/dashboards/auditManager/WeekSelectionView";
import AuditCheckSheetNCRForumModal from "../modals/AuditCheckSheetNCRForumModal";
import NCRPendingDashboard from "./auditManager/NCRPendingDashboard";
import NCRViewManager from "./auditor/view/NCRViewManager";

import {
  KpiCard,
  NcrCard,
  RequestCard,
} from "./auditManager/AuditManagerCards";
import {
  ActivityFeed,
  AnimatedGlassCard,
  CustomBarChart,
  CustomPieChart,
  DepartmentLineChart,
  NcrPriorityChart,
  NcrTrendChart,
} from "./auditManager/AuditManagerCharts";
import {
  ApproveModal,
  RejectModal,
  ViewRequestModal,
} from "./auditManager/AuditManagerModals";
import { COLORS, styles } from "./auditManager/AuditManagerStyles";
import { useAuditManagerData } from "./auditManager/useAuditManagerData";

// ============================================================
// Holographic Workflow Step Card
// ============================================================
// Replace ONLY the WorkflowStepCard component in your AuditManagerDashboard.tsx

// Replace the WorkflowStepCard component in AuditManagerDashboard.tsx

const WorkflowStepCard = ({ step, isDesktop, isTablet }: any) => {
  const [hovered, setHovered] = useState(false);
  const isLocked = step.isLocked;
  const isApproved = step.status === "approved";
  const isPending = step.status === "pending";

  let statusColor = COLORS.textMuted;
  let statusBg = "#F8FAFC";
  let statusLabel = "Not Started";
  let StatusIcon = Clock;
  let iconColor = COLORS.textMuted;

  if (isLocked) {
    statusLabel = "Locked";
    StatusIcon = Lock;
  } else if (isApproved) {
    statusColor = "#059669"; // Darker green for text contrast
    statusBg = "#ECFDF5";
    statusLabel = "Approved";
    StatusIcon = CheckCircle;
    iconColor = COLORS.success;
  } else if (isPending) {
    statusColor = "#D97706"; // Darker orange for text contrast
    statusBg = "#FFFBEB";
    statusLabel = "Pending";
    StatusIcon = Clock;
    iconColor = COLORS.warning;
  } else {
    statusColor = COLORS.primary;
    statusBg = "#EFF6FF";
    statusLabel = "Ready";
    StatusIcon = ArrowRightCircle;
    iconColor = COLORS.primary;
  }

  const IconComponent = step.icon;

  return (
    <Pressable
      disabled={isLocked}
      onPress={step.action}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.workflowCard,
        isLocked && styles.workflowCardLocked,
        isApproved && styles.workflowCardApproved,
        hovered && !isLocked && styles.workflowCardHover,
        { width: isDesktop ? "23.5%" : isTablet ? "48%" : "100%" },
      ]}
    >
      {/* Top Row: Status Badge (No heavy accent bar anymore) */}
      <View style={styles.cardTopRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <StatusIcon size={12} color={statusColor} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Clean Icon (No vibrant background) */}
      <View style={styles.cardIconWrapper}>
        <IconComponent
          size={24}
          color={isLocked ? COLORS.gray[300] : iconColor}
        />
      </View>

      {/* Content */}
      <Text
        style={[
          styles.workflowCardTitle,
          isLocked && { color: COLORS.gray[400] },
        ]}
        numberOfLines={1}
      >
        {step.title}
      </Text>
      <Text
        style={[styles.cardDesc, isLocked && { color: COLORS.gray[400] }]}
        numberOfLines={2}
      >
        {step.desc}
      </Text>

      {/* Action */}
      {!isLocked && (
        <View style={styles.cardAction}>
          <Text style={[styles.cardActionText, { color: statusColor }]}>
            {isApproved ? "View Details" : "Start Workflow"}
          </Text>
          <ChevronRight size={16} color={statusColor} />
        </View>
      )}
    </Pressable>
  );
};

// ============================================================
// Main Dashboard
// ============================================================
export default function AuditManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isSmallMobile = width < 375;
  const isCompactHeader = width < 900;

  const {
    user,
    loading,
    refreshing,
    activeSection,
    setActiveSection,
    selectedYear,
    setSelectedYear,
    availableYears,
    stats,
    allNcrs,
    pendingRequests,
    form3Status,
    form4Status,
    hasApprovedForm5,
    allUsersList,
    monthlyTrendData,
    ncrDistributionData,
    ncrByDepartmentData,
    ncrPriorityData,
    recentActivities,
    refresh,
    departmentTeamMembers,
    loadingTeamMembers,
    handleViewRequest,
    showForumModal,
    setShowForumModal,
    selectedAuditForForum,
    setSelectedAuditForForum,
    selectedRequest,
    setSelectedRequest,
  } = useAuditManagerData();

  const [selectedForm5Month, setSelectedForm5Month] = useState<string | null>(
    null,
  );
  const [form5DetailedParams, setForm5DetailedParams] = useState<any>({});
  const [activeNcrViewId, setActiveNcrViewId] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const displayName = user?.firstName || user?.name?.split(" ")[0] || "User";
  const fullDisplayName =
    `${user?.salutation || "Mr."} ${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  const getWorkflowSteps = () => {
    const isForm3Approved = form3Status.status === "APPROVED";
    const isForm4Approved = form4Status.status === "APPROVED";
    const isForm5Approved = hasApprovedForm5;
    return [
      {
        id: 1,
        title: "Annual Audit Plan",
        desc: "Form 3 - Define yearly audit elements",
        icon: FileText,
        status:
          form3Status.status === "APPROVED"
            ? "approved"
            : form3Status.status === "PENDING_APPROVAL"
              ? "pending"
              : "ready",
        isLocked: false,
        action: () => setActiveSection("form3"),
      },
      {
        id: 2,
        title: "Department Audit Plan",
        desc: "Form 4 - Assign audits to departments",
        icon: Layers,
        status: isForm3Approved
          ? form4Status.status === "APPROVED"
            ? "approved"
            : form4Status.status === "PENDING_APPROVAL"
              ? "pending"
              : "ready"
          : "locked",
        isLocked: !isForm3Approved,
        action: () => setActiveSection("form4"),
      },
      {
        id: 3,
        title: "Schedule Dashboard",
        desc: "Form 5 - Month-wise audit schedule",
        icon: Grid,
        status: isForm4Approved
          ? isForm5Approved
            ? "approved"
            : "ready"
          : "locked",
        isLocked: !isForm4Approved,
        action: () => setActiveSection("form5"),
      },
      {
        id: 4,
        title: "Schedule Calendar",
        desc: "Daily schedules with time slots",
        icon: Calendar,
        status: isForm5Approved ? "ready" : "locked",
        isLocked: !isForm5Approved,
        action: () => setActiveSection("week-selection"),
      },
    ];
  };

  // --- ROUTING GUARDS ---
  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );

  if (activeSection === "form3")
    return (
      <Form3View
        year={selectedYear}
        onBack={() => setActiveSection("schedules")}
      />
    );
  if (activeSection === "form4")
    return (
      <Form4View
        year={selectedYear}
        onBack={() => setActiveSection("schedules")}
      />
    );
  if (activeSection === "form5")
    return (
      <Form5Dashboard
        year={selectedYear}
        onBack={() => setActiveSection("schedules")}
        onMonthSelect={(m: any) => {
          setSelectedForm5Month(m);
          setActiveSection("form5-view");
        }}
      />
    );
  if (activeSection === "form5-view" && selectedForm5Month)
    return (
      <Form5View
        preselectedYear={selectedYear}
        preselectedMonth={selectedForm5Month}
        onBack={() => setActiveSection("form5")}
        onOpenForum={() => {}}
        allUsers={allUsersList}
      />
    );
  if (activeSection === "week-selection")
    return (
      <WeekSelectionView
        year={selectedYear}
        onBack={() => setActiveSection("schedules")}
        onWeekSelect={(d: any) => {
          setForm5DetailedParams({ year: selectedYear, ...d });
          setActiveSection("form5-detailed");
        }}
      />
    );
  if (activeSection === "form5-detailed")
    return (
      <Form5DetailedView
        year={form5DetailedParams.year || selectedYear}
        month={form5DetailedParams.month || ""}
        startDate={form5DetailedParams.startDate}
        endDate={form5DetailedParams.endDate}
        onBack={() => setActiveSection("week-selection")}
      />
    );
  if (activeSection === "ncr-pending")
    return (
      <NCRPendingDashboard
        onBack={() => setActiveSection("ncr")}
        selectedYear={selectedYear}
      />
    );
  if (activeSection === "ncr-dashboard")
    return (
      <NCRDashboard
        onBack={() => setActiveSection("ncr")}
        onViewNcr={setActiveNcrViewId}
        selectedYear={selectedYear}
      />
    );
  if (activeSection === "form9")
    return (
      <Form9View
        onBack={() => setActiveSection("ncr")}
        selectedYear={selectedYear}
      />
    );
  if (activeNcrViewId)
    return (
      <NCRViewManager
        initialId={activeNcrViewId}
        initialType="form7"
        onClose={() => setActiveNcrViewId(null)}
      />
    );

  // --- COMPONENTS ---
  const renderWorkflowSection = () => {
    const steps = getWorkflowSteps();
    const completed = steps.filter((s: any) => s.status === "approved").length;
    const progress = Math.round((completed / steps.length) * 100);

    return (
      <AnimatedGlassCard
        delay={100}
        style={[styles.workflowSection, isSmallMobile && { padding: 16 }]}
      >
        <View style={styles.workflowHeader}>
          <View>
            <Text style={styles.workflowTitle}>Audit Workflow</Text>
            <Text style={styles.workflowSubtitle}>
              Follow the sequence to complete setup
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>
              {completed}/{steps.length}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.workflowProgressTrack}>
            <LinearGradient
              colors={[COLORS.primary, "#3B82F6"]}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressLabel}>{progress}% Complete</Text>
        </View>
        <View
          style={[
            styles.workflowGrid,
            isSmallMobile && styles.workflowGridMobile,
          ]}
        >
          {steps.map((step: any) => (
            <WorkflowStepCard
              key={step.id}
              step={step}
              isDesktop={isDesktop}
              isTablet={isTablet}
            />
          ))}
        </View>
      </AnimatedGlassCard>
    );
  };

  const renderNcrList = () => {
    if (!allNcrs || allNcrs.length === 0) return null;
    const recentNcrs = allNcrs.slice(0, 4);
    return (
      <AnimatedGlassCard style={styles.ncrTableCard} delay={200}>
        <View style={styles.ncrTableHeader}>
          <View>
            <Text style={styles.workflowTitle}>Recent NCRs</Text>
            <Text style={styles.workflowSubtitle}>
              {allNcrs.length} total issues raised
            </Text>
          </View>
          <Pressable
            onPress={() => setActiveSection("ncr")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "#F1F5F9",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: COLORS.textMain,
              }}
            >
              See all
            </Text>
            <ChevronRight size={14} color={COLORS.textMain} />
          </Pressable>
        </View>
        {recentNcrs.map((ncr: any, i: number) => {
          const isClosed =
            ncr.status === "CLOSED" || ncr.status === "NCR2_COMPLETED";
          const isInProgress =
            ncr.status === "IN_PROGRESS" || ncr.status === "NCR2_IN_PROGRESS";
          const pillBg = isClosed
            ? "#ECFDF5"
            : isInProgress
              ? "#FFFBEB"
              : "#EFF6FF";
          const pillText = isClosed
            ? "#10B981"
            : isInProgress
              ? "#B45309"
              : "#2563EB";
          return (
            <Pressable
              key={i}
              style={[
                styles.ncrTableRow,
                i === recentNcrs.length - 1 && styles.ncrTableRowLast,
              ]}
              onPress={() => setActiveSection("ncr")}
            >
              <View style={styles.ncrTableCell}>
                <Text style={styles.ncrTableText} numberOfLines={1}>
                  {ncr.auditType || "Internal Audit"} -{" "}
                  {ncr.department || "Unknown"}
                </Text>
                <Text style={styles.ncrTableSubText} numberOfLines={1}>
                  {ncr.title || ncr.description || "No description"}
                </Text>
              </View>
              <View
                style={[
                  styles.ncrStatusPill,
                  { backgroundColor: pillBg, marginRight: 12 },
                ]}
              >
                <Text style={[styles.ncrStatusText, { color: pillText }]}>
                  {ncr.status?.replace(/_/g, " ") || "OPEN"}
                </Text>
              </View>
              <MoreVertical size={16} color={COLORS.textMuted} />
            </Pressable>
          );
        })}
      </AnimatedGlassCard>
    );
  };

  // --- DASHBOARD LAYOUT ---
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <View style={{ gap: 16 }}>
            {isDesktop ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <KpiCard
                  title="Total Audits"
                  value={stats.totalAudits}
                  icon={<Calendar size={20} color={COLORS.primary} />}
                  isDesktop
                />
                <KpiCard
                  title="Completed"
                  value={stats.completedAudits}
                  icon={<CheckCircle size={20} color={COLORS.success} />}
                  isDesktop
                />
                <KpiCard
                  title="Open NCRs"
                  value={stats.openNCRs}
                  icon={<AlertCircle size={20} color={COLORS.danger} />}
                  isDesktop
                />
                <KpiCard
                  title="Pending Req"
                  value={stats.pendingRequests}
                  icon={<MessageSquare size={20} color={COLORS.warning} />}
                  isDesktop
                />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                <View style={{ width: 150, marginRight: 12 }}>
                  <KpiCard
                    title="Total Audits"
                    value={stats.totalAudits}
                    icon={<Calendar size={20} color={COLORS.primary} />}
                    isDesktop={false}
                  />
                </View>
                <View style={{ width: 150, marginRight: 12 }}>
                  <KpiCard
                    title="Completed"
                    value={stats.completedAudits}
                    icon={<CheckCircle size={20} color={COLORS.success} />}
                    isDesktop={false}
                  />
                </View>
                <View style={{ width: 150, marginRight: 12 }}>
                  <KpiCard
                    title="Open NCRs"
                    value={stats.openNCRs}
                    icon={<AlertCircle size={20} color={COLORS.danger} />}
                    isDesktop={false}
                  />
                </View>
                <View style={{ width: 150, marginRight: 12 }}>
                  <KpiCard
                    title="Pending Req"
                    value={stats.pendingRequests}
                    icon={<MessageSquare size={20} color={COLORS.warning} />}
                    isDesktop={false}
                  />
                </View>
              </ScrollView>
            )}

            <View
              style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}
            >
              <View style={{ flex: isDesktop ? 2 : 1 }}>
                <CustomBarChart
                  data={monthlyTrendData}
                  title="Monthly Audit Trend"
                  subtitle={`Scheduled in ${selectedYear}`}
                  isDesktop={isDesktop}
                />
              </View>
              <View style={{ flex: isDesktop ? 1 : 1 }}>
                <CustomPieChart
                  data={ncrDistributionData}
                  title="NCR Distribution"
                  subtitle="Status breakdown"
                  total={allNcrs.length}
                  isDesktop={isDesktop}
                />
              </View>
            </View>

            <View
              style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}
            >
              <View style={{ flex: isDesktop ? 2 : 1 }}>
                <DepartmentLineChart
                  data={ncrByDepartmentData}
                  isDesktop={isDesktop}
                />
              </View>
              <View style={{ flex: isDesktop ? 1 : 1 }}>
                <ActivityFeed
                  activities={recentActivities}
                  isDesktop={isDesktop}
                />
              </View>
            </View>

            {renderNcrList()}
            {renderWorkflowSection()}
          </View>
        );
      case "schedules":
        return renderWorkflowSection();
      case "ncr":
        return (
          <View style={{ gap: 16 }}>
            <AnimatedGlassCard style={styles.workflowSection}>
              <Text style={styles.cardTitle}>NCR Management</Text>
              <Text style={styles.cardSubtitle}>
                Manage Non-Conformance Reports and corrective actions
              </Text>
              <View
                style={{
                  flexDirection: isDesktop ? "row" : "column",
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <NcrCard
                  title="CA Verification"
                  description="Verify corrective actions"
                  icon={<CheckCircle size={22} />}
                  onPress={() => setActiveSection("ncr-pending")}
                  badgeText={`${stats.pendingCaVerification} Pending`}
                  isDesktop={isDesktop}
                />
                <NcrCard
                  title="NCR Report"
                  description="View all Non-Conformance Reports"
                  icon={<AlertCircle size={22} />}
                  onPress={() => setActiveSection("ncr-dashboard")}
                  badgeText={`${stats.openNCRs} Open`}
                  isDesktop={isDesktop}
                />
                <NcrCard
                  title="NC Summary"
                  description="All NCRs at a glance"
                  icon={<BarChart2 size={22} />}
                  onPress={() => setActiveSection("form9")}
                  badgeText={`${allNcrs.length} Total`}
                  isDesktop={isDesktop}
                />
              </View>
            </AnimatedGlassCard>
            <View
              style={{ flexDirection: isDesktop ? "row" : "column", gap: 16 }}
            >
              <View style={{ flex: isDesktop ? 2 : 1 }}>
                <NcrTrendChart data={monthlyTrendData} isDesktop={isDesktop} />
              </View>
              <View style={{ flex: isDesktop ? 1 : 1 }}>
                <NcrPriorityChart
                  data={ncrPriorityData}
                  isDesktop={isDesktop}
                />
              </View>
            </View>
          </View>
        );
      case "requests":
        return (
          <AnimatedGlassCard style={styles.workflowSection}>
            <Text style={styles.cardTitle}>Pending Auditor Requests</Text>
            {pendingRequests.length > 0 ? (
              <View style={{ gap: 12, marginTop: 16 }}>
                {pendingRequests.map((req: any, i: number) => (
                  <RequestCard
                    key={i}
                    request={req}
                    onView={(r: any) => {
                      setSelectedRequest(r);
                      handleViewRequest(r);
                      setShowRequestModal(true);
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={{ alignItems: "center", padding: 24 }}>
                <MessageSquare size={32} color={COLORS.textMuted} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: COLORS.textMain,
                    marginTop: 12,
                  }}
                >
                  No pending requests
                </Text>
              </View>
            )}
          </AnimatedGlassCard>
        );
      default:
        return (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: COLORS.textSub }}>Select a section</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8FAFC", "#F1F5F9", "#F8FAFC"]}
        style={styles.background}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {["dashboard", "schedules", "ncr", "requests"].includes(
            activeSection,
          ) && (
            <AnimatedGlassCard
              style={[styles.header, styles.headerOverflowVisible]}
            >
              <View
                style={[
                  styles.headerInner,
                  isCompactHeader && styles.headerInnerCompact,
                ]}
              >
                <View style={styles.headerGreetingSection}>
                  <View style={styles.greetingRow}>
                    <Text style={styles.greetingText}>{getGreeting()},</Text>
                    <Text style={styles.greetingName} numberOfLines={1}>
                      {displayName}
                    </Text>
                  </View>
                  <Text style={styles.subGreetingText}>
                    Here is your team's activity overview.
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <View style={styles.yearFilterWrapper}>
                    <YearFilter
                      selectedYear={selectedYear}
                      onYearChange={setSelectedYear}
                      availableYears={availableYears}
                    />
                  </View>
                </View>
              </View>
            </AnimatedGlassCard>
          )}

          {renderContent()}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      <ViewRequestModal
        visible={showRequestModal}
        request={selectedRequest}
        onClose={() => setShowRequestModal(false)}
        onApprove={() => {
          setShowRequestModal(false);
          setShowApproveModal(true);
        }}
        onReject={() => {
          setShowRequestModal(false);
          setShowRejectModal(true);
        }}
      />
      <ApproveModal
        visible={showApproveModal}
        request={selectedRequest}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => {
          setShowApproveModal(false);
          setSelectedRequest(null);
          refresh();
        }}
        allUsersList={allUsersList}
        departmentTeamMembers={departmentTeamMembers}
        loadingTeamMembers={loadingTeamMembers}
      />
      <RejectModal
        visible={showRejectModal}
        request={selectedRequest}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => {
          setShowRejectModal(false);
          setSelectedRequest(null);
          refresh();
        }}
      />

      {showForumModal && selectedAuditForForum && (
        <AuditCheckSheetNCRForumModal
          isOpen={showForumModal}
          onClose={() => {
            setShowForumModal(false);
            setSelectedAuditForForum(null);
          }}
          auditId={selectedAuditForForum.id}
          auditNumber={selectedAuditForForum.auditNumber}
          auditTitle={selectedAuditForForum.auditType}
          auditStatus="IN_PROGRESS"
          auditType={selectedAuditForForum.auditType}
          department={selectedAuditForForum.department}
          auditorId={selectedAuditForForum.auditorId}
          auditorName={selectedAuditForForum.auditorName}
          auditeeId={selectedAuditForForum.auditeeId}
          auditeeName={selectedAuditForForum.auditeeName}
          hodEmail={selectedAuditForForum.hodEmail}
          hodName={selectedAuditForForum.hodName}
          memberEmails={selectedAuditForForum.memberEmails || []}
          currentUser={user}
          allUsers={allUsersList}
          plantId={selectedAuditForForum.plantId ?? null}
          plantName={selectedAuditForForum.plantName ?? null}
        />
      )}
    </SafeAreaView>
  );
}
