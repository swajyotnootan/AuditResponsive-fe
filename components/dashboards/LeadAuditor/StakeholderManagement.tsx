// app/components/dashboards/LeadAuditor/StakeholderManagement.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FiveSView from "../auditor/view/FiveSView";
import IATFInternalView from "../auditor/view/IATFInternalView";
import ManufacturingProcessView from "../auditor/view/ManufacturingProcessView";
import NCRViewManager from "../auditor/view/NCRViewManager";

import type { NCR, Response, Schedule, User } from "./types";

interface StakeholderManagementProps {
  activeTab: string;
  allAuditors: User[];
  allAuditees: User[];
  allSchedules: Schedule[];
  allResponses: Response[];
  allNCRs: NCR[];
  onViewResponse: (response: Response) => void;
  onViewNCR: (ncr: NCR) => void;
  onViewResponseDetail: (response: Response) => void;
  leadAuditorDepartment?: string | null;
}

const { width, height } = Dimensions.get("window");
const isMobile = width < 768;

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

// ✅ Helper: get department string from User (handles both string and object)
const getDepartmentString = (dept: any): string => {
  if (!dept) return "";
  if (typeof dept === "string") return dept;
  if (typeof dept === "object") {
    return dept.displayName || dept.name || "";
  }
  return "";
};

const StakeholderManagement: React.FC<StakeholderManagementProps> = ({
  activeTab,
  allAuditors,
  allAuditees,
  allSchedules,
  allResponses,
  allNCRs,
  onViewResponse,
  onViewNCR,
  onViewResponseDetail,
  leadAuditorDepartment,
}) => {
  // ✅ SUB-TAB STATE for Auditors / Auditees
  const [subTab, setSubTab] = useState<"auditors" | "auditees">("auditors");

  // ✅ Department filter for Auditees
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [showNCRsModal, setShowNCRsModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<User | null>(
    null,
  );
  const [modalType, setModalType] = useState<"responses" | "ncrs">("responses");

  const [selectedNcrId, setSelectedNcrId] = useState<string | number | null>(
    null,
  );

  type AuditReportType = "5S" | "IATF" | "MANUFACTURING";

  const [reportView, setReportView] = useState<{
    type: AuditReportType;
    id: string | number;
  } | null>(null);

  const safeParseAnswers = (answers: any): any => {
    if (!answers) return {};
    if (typeof answers === "object") return answers;
    try {
      return JSON.parse(answers);
    } catch {
      return {};
    }
  };

  const detectReportType = (r: Response): AuditReportType => {
    const a = safeParseAnswers(r.answers);

    const raw = String(
      (r as any).auditType ||
        (r as any).templateType ||
        (r as any).checkSheet?.templateType ||
        (r as any).checkSheet?.name ||
        a.auditType ||
        a.templateType ||
        a.checkSheetName ||
        "",
    ).toUpperCase();

    if (raw.includes("5S") || raw.includes("FIVE")) return "5S";
    if (raw.includes("MANUFACT") || raw.includes("PROCESS"))
      return "MANUFACTURING";
    if (raw.includes("IATF")) return "IATF";

    if (a.scores) return "5S";
    if (a.partNumber || a.machine || a.wefDate || a.revNo || a.issueDate)
      return "MANUFACTURING";
    if (a.processName || a.responses || a.observations) return "IATF";

    return "5S";
  };

  const getAuditorResponses = (auditorId: string | number) =>
    allResponses.filter((r) => r.auditorId === auditorId);

  const getAuditorNCRs = (auditorId: string | number) =>
    allNCRs.filter((n) => n.auditorId === auditorId);

  const getAuditeeResponses = (auditeeId: string | number) =>
    allResponses.filter((r) => r.auditeeId === auditeeId);

  const getAuditeeNCRs = (auditeeId: string | number) =>
    allNCRs.filter((n) => n.auditeeId === auditeeId);

  const getSeverityBadge = (severity?: string) => {
    const colors: Record<string, any> = {
      CRITICAL: { bg: "#FEE2E2", text: "#DC2626" },
      MAJOR: { bg: "#FFEDD5", text: "#EA580C" },
      MINOR: { bg: "#FEF3C7", text: "#D97706" },
    };
    return colors[severity || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  };

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, any> = {
      APPROVED: { bg: "#D1FAE5", text: "#059669" },
      REJECTED: { bg: "#FEE2E2", text: "#DC2626" },
      SUBMITTED: { bg: "#DBEAFE", text: "#2563EB" },
      DRAFT: { bg: "#F3F4F6", text: "#6B7280" },
      OPEN: { bg: "#DBEAFE", text: "#2563EB" },
      IN_PROGRESS: { bg: "#EDE9FE", text: "#7C3AED" },
      CLOSED: { bg: "#D1FAE5", text: "#059669" },
    };
    return colors[status || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  };

  const handleViewResponses = (stakeholder: User) => {
    setSelectedStakeholder(stakeholder);
    setModalType("responses");
    setShowResponsesModal(true);
  };

  const handleViewNCRs = (stakeholder: User) => {
    setSelectedStakeholder(stakeholder);
    setModalType("ncrs");
    setShowNCRsModal(true);
  };

  const getResponses = (id: string | number) => {
    if (subTab === "auditors") {
      return getAuditorResponses(id);
    }
    return getAuditeeResponses(id);
  };

  const getNCRs = (id: string | number) => {
    if (subTab === "auditors") {
      return getAuditorNCRs(id);
    }
    return getAuditeeNCRs(id);
  };

  const getSummary = (id: string | number) => {
    const responses = getResponses(id);
    const total = responses.length;
    const approved = responses.filter((r) => r.status === "APPROVED").length;
    const rejected = responses.filter((r) => r.status === "REJECTED").length;
    const submitted = responses.filter((r) => r.status === "SUBMITTED").length;
    const avgScore =
      total > 0
        ? responses.reduce((sum, r) => sum + (r.percentageScore || 0), 0) /
          total
        : 0;
    return {
      total,
      approved,
      rejected,
      pending: submitted,
      approvalRate: total > 0 ? (approved * 100) / total : 0,
      avgScore: avgScore.toFixed(1),
    };
  };

  const renderStakeholderCard = (item: User) => {
    const responses = getResponses(item.id);
    const ncrs = getNCRs(item.id);
    const assignedAudits = allSchedules.filter((s) =>
      subTab === "auditors" ? s.auditorId === item.id : s.auditeeId === item.id,
    ).length;

    const approvedResponses = responses.filter(
      (r) => r.status === "APPROVED",
    ).length;
    const submittedResponses = responses.filter(
      (r) => r.status === "SUBMITTED",
    ).length;
    const openNCRs = ncrs.filter(
      (n) => n.status === "OPEN" || n.status === "IN_PROGRESS",
    ).length;
    const closedNCRs = ncrs.filter((n) => n.status === "CLOSED").length;

    const deptDisplay = getDepartmentString(item.department);

    return (
      <View key={String(item.id)} style={styles.stakeholderCard}>
        <View style={styles.stakeholderHeader}>
          <View
            style={[styles.avatar, { backgroundColor: NAVBAR_COLORS.primary }]}
          >
            <Text style={styles.avatarText}>
              {(item.firstName?.[0] || item.username?.[0] || "A").toUpperCase()}
            </Text>
          </View>
          <View style={styles.stakeholderInfo}>
            <Text style={styles.stakeholderName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.stakeholderRole}>
              {item.role || "User"} • {item.email || "No email"}
            </Text>
            {subTab === "auditees" && deptDisplay ? (
              <View style={styles.deptBadge}>
                <Icon
                  name="briefcase"
                  size={10}
                  color={NAVBAR_COLORS.primary}
                />
                <Text style={styles.deptBadgeText}>{deptDisplay}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{assignedAudits}</Text>
            <Text style={styles.statBoxLabel}>Assigned Audits</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[styles.statBoxValue, { color: NAVBAR_COLORS.primary }]}
            >
              {responses.length}
            </Text>
            <Text style={styles.statBoxLabel}>Responses</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusBox, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.statusBoxValue, { color: "#059669" }]}>
              {approvedResponses}
            </Text>
            <Text style={styles.statusBoxLabel}>Approved</Text>
          </View>
          <View style={[styles.statusBox, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.statusBoxValue, { color: "#D97706" }]}>
              {submittedResponses}
            </Text>
            <Text style={styles.statusBoxLabel}>Pending</Text>
          </View>
        </View>

        {ncrs.length > 0 && (
          <View style={styles.ncrSummary}>
            <Text style={styles.ncrSummaryText}>{ncrs.length} Total NCRs</Text>
            <View style={styles.ncrSummaryRow}>
              <Text style={styles.ncrOpenText}>Open: {openNCRs}</Text>
              <Text style={styles.ncrClosedText}>Closed: {closedNCRs}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewResponses(item)}
          >
            <Icon name="file-text" size={14} color="#6B7280" />
            <Text style={styles.actionButtonText}>Responses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewNCRs(item)}
          >
            <Icon name="alert-triangle" size={14} color="#6B7280" />
            <Text style={styles.actionButtonText}>NCRs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderModalItem = ({ item }: { item: Response | NCR }) => {
    if (modalType === "responses") {
      const r = item as Response;
      const answers =
        typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
      const statusColors = getStatusBadge(r.status);
      return (
        <View style={styles.modalItem}>
          <View style={styles.modalItemHeader}>
            <Text style={styles.modalItemId}>
              {answers?.documentNumber || `RES-${r.id}`}
            </Text>
            <View
              style={[
                styles.modalItemBadge,
                { backgroundColor: statusColors.bg },
              ]}
            >
              <Text
                style={[
                  styles.modalItemBadgeText,
                  { color: statusColors.text },
                ]}
              >
                {r.status || "DRAFT"}
              </Text>
            </View>
          </View>
          <Text style={styles.modalItemTitle}>{r.department || "N/A"}</Text>
          <Text style={styles.modalItemSubtext}>
            Auditee: {answers?.auditeeName || "N/A"}
          </Text>
          <View style={styles.modalItemFooter}>
            <Text style={styles.modalItemScore}>
              Score:{" "}
              <Text style={styles.modalItemScoreValue}>
                {(r.percentageScore || 0).toFixed(1)}%
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.modalItemViewButton}
              onPress={() => {
                setShowResponsesModal(false);
                setReportView({ type: detectReportType(r), id: r.id });
              }}
            >
              <Icon name="eye" size={12} color="#6B7280" />
              <Text style={styles.modalItemViewText}>View Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      const n = item as NCR;
      const severityColors = getSeverityBadge(n.severity);
      const statusColors = getStatusBadge(n.status);
      return (
        <View style={styles.modalItem}>
          <View style={styles.modalItemHeader}>
            <View
              style={[
                styles.modalItemBadge,
                { backgroundColor: severityColors.bg },
              ]}
            >
              <Text
                style={[
                  styles.modalItemBadgeText,
                  { color: severityColors.text },
                ]}
              >
                {n.severity || "NCR"}
              </Text>
            </View>
            <View
              style={[
                styles.modalItemBadge,
                { backgroundColor: statusColors.bg },
              ]}
            >
              <Text
                style={[
                  styles.modalItemBadgeText,
                  { color: statusColors.text },
                ]}
              >
                {n.status || "OPEN"}
              </Text>
            </View>
          </View>
          <Text style={styles.modalItemTitle}>
            {n.ncrNumber || `NCR-${n.id}`}
          </Text>
          <View style={styles.modalItemFooter}>
            <Text style={styles.modalItemSubtext}>
              Dept: {n.department || "N/A"}
            </Text>
            <TouchableOpacity
              style={styles.modalItemViewButton}
              onPress={() => {
                setShowNCRsModal(false);
                setSelectedNcrId(n.id);
              }}
            >
              <Icon name="eye" size={12} color="#6B7280" />
              <Text style={styles.modalItemViewText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  // ✅ Compute available departments + counts
  const departmentOptions = useMemo(() => {
    const map = new Map<string, number>();
    allAuditees.forEach((a) => {
      const dept = getDepartmentString(a.department);
      if (dept) map.set(dept, (map.get(dept) || 0) + 1);
    });
    const sorted = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
    return [
      { name: "ALL", label: "All Departments", count: allAuditees.length },
      ...sorted.map((d) => ({
        name: d.name,
        label: d.name,
        count: d.count,
      })),
    ];
  }, [allAuditees]);

  // ✅ Filter stakeholders based on subTab + department
  const stakeholders = useMemo(() => {
    if (subTab === "auditors") {
      return allAuditors.filter(
        (a) =>
          a.role !== "LEAD_AUDITOR" && !a.role?.toLowerCase().includes("lead"),
      );
    }

    if (selectedDepartment === "ALL") {
      return allAuditees;
    }

    return allAuditees.filter(
      (a) => getDepartmentString(a.department) === selectedDepartment,
    );
  }, [subTab, allAuditors, allAuditees, selectedDepartment]);

  const selectedResponses = selectedStakeholder
    ? getResponses(selectedStakeholder.id)
    : [];
  const selectedNCRs = selectedStakeholder
    ? getNCRs(selectedStakeholder.id)
    : [];

  // Current label for the dropdown trigger
  const currentDeptLabel =
    departmentOptions.find((d) => d.name === selectedDepartment)?.label ||
    "All Departments";

  // ✅ NCR PREVIEW
  if (selectedNcrId) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
        <NCRViewManager
          initialId={String(selectedNcrId)}
          initialType="form7"
          onClose={() => setSelectedNcrId(null)}
        />
      </View>
    );
  }

  // ✅ CHECK SHEET REPORT PREVIEW
  if (reportView) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
        {reportView.type === "5S" && (
          <FiveSView
            initialId={String(reportView.id)}
            onClose={() => setReportView(null)}
          />
        )}
        {reportView.type === "IATF" && (
          <IATFInternalView
            initialId={String(reportView.id)}
            onClose={() => setReportView(null)}
          />
        )}
        {reportView.type === "MANUFACTURING" && (
          <ManufacturingProcessView
            initialId={String(reportView.id)}
            onClose={() => setReportView(null)}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ✅ SUB-TAB SWITCHER */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            subTab === "auditors" && styles.subTabActive,
          ]}
          onPress={() => {
            setSubTab("auditors");
            setSelectedDepartment("ALL");
          }}
        >
          <Icon
            name="users"
            size={16}
            color={subTab === "auditors" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.subTabText,
              subTab === "auditors" && styles.subTabTextActive,
            ]}
          >
            Auditors ({allAuditors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            subTab === "auditees" && styles.subTabActive,
          ]}
          onPress={() => setSubTab("auditees")}
        >
          <Icon
            name="user-check"
            size={16}
            color={subTab === "auditees" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.subTabText,
              subTab === "auditees" && styles.subTabTextActive,
            ]}
          >
            Auditees ({allAuditees.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ DEPARTMENT DROPDOWN — only visible on Auditees sub-tab */}
      {subTab === "auditees" && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Icon name="filter" size={14} color={NAVBAR_COLORS.primary} />
            <Text style={styles.filterLabel}>Filter by Department</Text>
            <Text style={styles.filterCount}>{stakeholders.length} shown</Text>
          </View>

          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowDeptDropdown(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownTriggerLeft}>
              <Icon name="briefcase" size={14} color={NAVBAR_COLORS.primary} />
              <Text style={styles.dropdownTriggerText}>{currentDeptLabel}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={NAVBAR_COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.grid}>
        {stakeholders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name={subTab === "auditors" ? "users" : "user-check"}
              size={40}
              color="#CBD5E1"
            />
            <Text style={styles.emptyStateTitle}>
              No {subTab === "auditors" ? "Auditors" : "Auditees"} Found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {subTab === "auditees" && selectedDepartment !== "ALL"
                ? `No auditees found in ${selectedDepartment} department`
                : leadAuditorDepartment
                  ? `No ${subTab === "auditors" ? "auditors" : "auditees"} found for ${leadAuditorDepartment} plant`
                  : `No ${subTab === "auditors" ? "auditors" : "auditees"} are currently registered`}
            </Text>
          </View>
        ) : (
          stakeholders.map((item) => renderStakeholderCard(item))
        )}
      </View>

      {/* ✅ DEPARTMENT DROPDOWN MODAL */}
      <Modal
        visible={showDeptDropdown}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeptDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDeptDropdown(false)}
        >
          <View
            style={[styles.dropdownMenu, isMobile && styles.dropdownMenuMobile]}
          >
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderTitle}>Select Department</Text>
              <TouchableOpacity
                onPress={() => setShowDeptDropdown(false)}
                style={styles.dropdownCloseButton}
              >
                <Icon name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: height * 0.5 }}
              showsVerticalScrollIndicator={false}
            >
              {departmentOptions.map((option) => {
                const isActive = selectedDepartment === option.name;
                return (
                  <TouchableOpacity
                    key={option.name}
                    style={[
                      styles.dropdownItem,
                      isActive && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedDepartment(option.name);
                      setShowDeptDropdown(false);
                    }}
                  >
                    <View style={styles.dropdownItemLeft}>
                      {/* ✅ Checkbox-style indicator */}
                      <View
                        style={[
                          styles.checkbox,
                          isActive && styles.checkboxActive,
                        ]}
                      >
                        {isActive && (
                          <Icon name="check" size={12} color="#FFFFFF" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.dropdownBadge,
                        isActive && styles.dropdownBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownBadgeText,
                          isActive && styles.dropdownBadgeTextActive,
                        ]}
                      >
                        {option.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Responses Modal */}
      <Modal
        visible={showResponsesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResponsesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, isMobile && styles.modalContentMobile]}
          >
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: NAVBAR_COLORS.primary },
              ]}
            >
              <View>
                <Text style={styles.modalHeaderTitle}>
                  Responses by {selectedStakeholder?.firstName}{" "}
                  {selectedStakeholder?.lastName}
                </Text>
                <Text style={styles.modalHeaderSubtext}>
                  {selectedResponses.length} total responses
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowResponsesModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedStakeholder && (
              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatValue}>
                    {getSummary(selectedStakeholder.id).total}
                  </Text>
                  <Text style={styles.modalStatLabel}>Total</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatValue, { color: "#059669" }]}>
                    {getSummary(selectedStakeholder.id).approved}
                  </Text>
                  <Text style={styles.modalStatLabel}>APPROVED</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatValue, { color: "#DC2626" }]}>
                    {getSummary(selectedStakeholder.id).rejected}
                  </Text>
                  <Text style={styles.modalStatLabel}>REJECTED</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={[styles.modalStatValue, { color: "#D97706" }]}>
                    {getSummary(selectedStakeholder.id).pending}
                  </Text>
                  <Text style={styles.modalStatLabel}>SUBMITTED</Text>
                </View>
              </View>
            )}

            <FlatList
              data={selectedResponses}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Icon name="file-text" size={40} color="#CBD5E1" />
                  <Text style={styles.modalEmptyText}>No responses found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* NCRs Modal */}
      <Modal
        visible={showNCRsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNCRsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, isMobile && styles.modalContentMobile]}
          >
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: NAVBAR_COLORS.primary },
              ]}
            >
              <View>
                <Text style={styles.modalHeaderTitle}>
                  NCRs by {selectedStakeholder?.firstName}{" "}
                  {selectedStakeholder?.lastName}
                </Text>
                <Text style={styles.modalHeaderSubtext}>
                  {selectedNCRs.length} total NCRs
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNCRsModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedNCRs}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Icon name="alert-triangle" size={40} color="#CBD5E1" />
                  <Text style={styles.modalEmptyText}>No NCRs found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ✅ SUB-TAB STYLES
  subTabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  subTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  subTabActive: {
    backgroundColor: NAVBAR_COLORS.primary,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  subTabTextActive: {
    color: "#FFFFFF",
  },

  // ✅ DEPARTMENT FILTER — dropdown styles
  filterSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  filterCount: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },

  // ✅ DROPDOWN MODAL
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdownMenu: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dropdownMenuMobile: {
    maxWidth: "100%",
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  dropdownCloseButton: {
    padding: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemActive: {
    backgroundColor: NAVBAR_COLORS.bg,
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxActive: {
    backgroundColor: NAVBAR_COLORS.primary,
    borderColor: NAVBAR_COLORS.primary,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
  },
  dropdownItemTextActive: {
    color: NAVBAR_COLORS.primary,
    fontWeight: "700",
  },
  dropdownBadge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  dropdownBadgeActive: {
    backgroundColor: NAVBAR_COLORS.primary,
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  dropdownBadgeTextActive: {
    color: "#FFFFFF",
  },

  // ✅ DEPARTMENT BADGE (on card)
  deptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: NAVBAR_COLORS.bg,
    borderRadius: 4,
    marginTop: 4,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: NAVBAR_COLORS.primary,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 20,
  },
  stakeholderCard: {
    width: isMobile ? "100%" : "32%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stakeholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  stakeholderInfo: {
    flex: 1,
  },
  stakeholderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  stakeholderRole: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statBoxLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusBox: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  statusBoxValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusBoxLabel: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  ncrSummary: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  ncrSummaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  ncrSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  ncrOpenText: {
    fontSize: 10,
    color: "#DC2626",
  },
  ncrClosedText: {
    fontSize: 10,
    color: "#059669",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: "100%",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.85,
    overflow: "hidden",
  },
  modalContentMobile: {
    width: width * 0.95,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalHeaderSubtext: {
    fontSize: 12,
    color: "#C7D2FE",
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalStatsGrid: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalStatLabel: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  modalListContent: {
    padding: 12,
  },
  modalItem: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalItemId: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  modalItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalItemBadgeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalItemSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalItemScore: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalItemScoreValue: {
    fontWeight: "600",
    color: "#1F2937",
  },
  modalItemViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
  },
  modalItemViewText: {
    fontSize: 11,
    color: "#6B7280",
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});

export default StakeholderManagement;
