// app/components/dashboards/LeadAuditor/StakeholderManagement.tsx
"use client";

import React, { useState } from "react";
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
import Form7DetailView from "../auditor/view/Form7DetailView";
import IATFInternalView from "../auditor/view/IATFInternalView";
import ManufacturingProcessView from "../auditor/view/ManufacturingProcessView";

interface User {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  username?: string;
}

interface Schedule {
  id: string | number;
  department?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
}

interface Response {
  id: string | number;
  department?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
  status?: string;
  percentageScore?: number;
  answers?: any;
}

interface NCR {
  id: string | number;
  ncrNumber?: string;
  department?: string;
  severity?: string;
  status?: string;
  auditorId?: string | number;
  auditeeId?: string | number;
}

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

  // ✅ Decides which report view to open for a given audit/response no.
  const detectReportType = (r: Response): AuditReportType => {
    const a = safeParseAnswers(r.answers);

    // 1) If backend sends a type field, use it
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

    // 2) Fallback: detect from the answers payload shape
    if (a.scores) return "5S"; // 5S stores numeric scores per question
    if (a.partNumber || a.machine || a.wefDate || a.revNo || a.issueDate)
      return "MANUFACTURING"; // manufacturing doc-control fields
    if (a.processName || a.responses || a.observations) return "IATF";

    return "5S"; // default – change to your most common audit type
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
    if (activeTab === "auditors") {
      return getAuditorResponses(id);
    }
    return getAuditeeResponses(id);
  };

  const getNCRs = (id: string | number) => {
    if (activeTab === "auditors") {
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
      activeTab === "auditors"
        ? s.auditorId === item.id
        : s.auditeeId === item.id,
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
                // ✅ Open the correct report for this audit no.
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
                setShowNCRsModal(false); // 1. Close the NCR list modal
                setSelectedNcrId(n.id); // 2. Open the detail view for this specific NCR ID
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

  const stakeholders =
    activeTab === "auditors"
      ? allAuditors.filter(
          (a) =>
            a.role !== "LEAD_AUDITOR" &&
            !a.role?.toLowerCase().includes("lead"),
        )
      : allAuditees;

  const selectedResponses = selectedStakeholder
    ? getResponses(selectedStakeholder.id)
    : [];
  const selectedNCRs = selectedStakeholder
    ? getNCRs(selectedStakeholder.id)
    : [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {stakeholders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              name={activeTab === "auditors" ? "users" : "user-check"}
              size={40}
              color="#CBD5E1"
            />
            <Text style={styles.emptyStateTitle}>
              No {activeTab === "auditors" ? "Auditors" : "Auditees"} Found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {leadAuditorDepartment
                ? `No ${activeTab === "auditors" ? "auditors" : "auditees"} found for ${leadAuditorDepartment} department`
                : `No ${activeTab === "auditors" ? "auditors" : "auditees"} are currently registered`}
            </Text>
          </View>
        ) : (
          stakeholders.map((item) => renderStakeholderCard(item))
        )}
      </View>

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
                <View style={styles.modalStat}>
                  <Text
                    style={[
                      styles.modalStatValue,
                      { color: NAVBAR_COLORS.primary },
                    ]}
                  >
                    {getSummary(selectedStakeholder.id).approvalRate.toFixed(1)}
                    %
                  </Text>
                  <Text style={styles.modalStatLabel}>Approval Rate</Text>
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

      <Modal
        visible={!!selectedNcrId}
        animationType="slide"
        onRequestClose={() => setSelectedNcrId(null)}
      >
        <View style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
          {selectedNcrId && (
            <Form7DetailView
              initialParams={{ id: String(selectedNcrId) }}
              onClose={() => setSelectedNcrId(null)}
            />
          )}
        </View>
      </Modal>

      {/* ✅ AUDIT REPORT DETAIL VIEW — opens per audit no / NCR no */}
      <Modal
        visible={!!reportView}
        animationType="slide"
        onRequestClose={() => setReportView(null)}
      >
        <View style={{ flex: 1, backgroundColor: NAVBAR_COLORS.bg }}>
          {reportView?.type === "5S" && (
            <FiveSView
              initialId={String(reportView.id)}
              onClose={() => setReportView(null)}
            />
          )}
          {reportView?.type === "IATF" && (
            <IATFInternalView
              initialId={String(reportView.id)}
              onClose={() => setReportView(null)}
            />
          )}
          {reportView?.type === "MANUFACTURING" && (
            <ManufacturingProcessView
              initialId={String(reportView.id)}
              onClose={() => setReportView(null)}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    // Changed from flex: 1 & minWidth to width to enforce strict 3 columns on desktop
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
