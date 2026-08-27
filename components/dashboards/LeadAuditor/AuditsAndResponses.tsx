// app/components/dashboards/LeadAuditor/AuditsAndResponses.tsx
"use client";

import { format } from "date-fns";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FiveSView from "../auditor/view/FiveSView";
import IATFInternalView from "../auditor/view/IATFInternalView";
import ManufacturingProcessView from "../auditor/view/ManufacturingProcessView";
import NCRViewManager from "../auditor/view/NCRViewManager";

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
  leadAuditorDepartment,
}) => {
  // ✅ PREVIEW STATE (Same pattern as StakeholderManagement)
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

  // ✅ Decides which check sheet report view to open
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

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, any> = {
      SCHEDULED: { bg: "#DBEAFE", text: "#2563EB" },
      IN_PROGRESS: { bg: "#FEF3C7", text: "#D97706" },
      COMPLETED: { bg: "#D1FAE5", text: "#059669" },
      APPROVED: { bg: "#D1FAE5", text: "#059669" },
      REJECTED: { bg: "#FEE2E2", text: "#DC2626" },
      DRAFT: { bg: "#F3F4F6", text: "#6B7280" },
      SUBMITTED: { bg: "#DBEAFE", text: "#2563EB" },
      OPEN: { bg: "#DBEAFE", text: "#2563EB" },
      CLOSED: { bg: "#D1FAE5", text: "#059669" },
    };
    return colors[status || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  };

  const getSeverityBadge = (severity?: string) => {
    const colors: Record<string, any> = {
      CRITICAL: { bg: "#FEE2E2", text: "#DC2626" },
      MAJOR: { bg: "#FFEDD5", text: "#EA580C" },
      MINOR: { bg: "#FEF3C7", text: "#D97706" },
    };
    return colors[severity || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  };

  const getAuditorName = (auditorId?: string | number) => {
    if (!auditorId) return "N/A";
    const auditor = allAuditors.find((a) => a.id === auditorId);
    if (auditor) {
      return (
        `${auditor.firstName || ""} ${auditor.lastName || ""}`.trim() ||
        auditor.username ||
        "N/A"
      );
    }
    return "N/A";
  };

  const getFilteredSchedules = () => {
    let schedules = allSchedules;
    if (searchTerm) {
      schedules = schedules.filter(
        (s) =>
          s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    return schedules.filter((s) => {
      if (!s.scheduledDate) return false;
      const scheduledStatuses = [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "APPROVED",
        "REJECTED",
      ];
      return scheduledStatuses.includes(s.status || "");
    });
  };

  // ✅ VERTICAL LIST ROW COMPONENT - Responses (One Per Row)
  const renderResponseVerticalItem = (item: Response) => {
    const answers =
      typeof item.answers === "string"
        ? JSON.parse(item.answers)
        : item.answers;
    const statusColors = getStatusBadge(item.status);
    const auditorName = getAuditorName(item.auditorId);

    return (
      <View style={styles.verticalItemContainer}>
        <View style={styles.verticalItemRow}>
          <View style={styles.verticalItemLeft}>
            <Text style={styles.verticalItemId}>
              {answers?.documentNumber || `RES-${item.id}`}
            </Text>
            <Text style={styles.verticalItemDepartment} numberOfLines={1}>
              {item.department || "N/A"}
            </Text>
          </View>
          <View style={styles.verticalItemCenter}>
            <Text style={styles.verticalItemAuditee} numberOfLines={1}>
              {answers?.auditeeName || item.auditeeName || "N/A"}
            </Text>
            <Text style={styles.verticalItemAuditor} numberOfLines={1}>
              {auditorName}
            </Text>
          </View>
          <View style={styles.verticalItemRight}>
            <Text style={styles.verticalItemScore}>
              {(item.percentageScore || 0).toFixed(1)}%
            </Text>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {item.status || "DRAFT"}
              </Text>
            </View>
          </View>
          <View style={styles.verticalItemActions}>
            <TouchableOpacity
              style={styles.verticalActionButton}
              onPress={() => {
                onViewResponse(item);
                setReportView({ type: detectReportType(item), id: item.id });
              }}
            >
              <Icon name="eye" size={16} color="#6B7280" />
              <Text style={styles.verticalActionText}>View</Text>
            </TouchableOpacity>
            {/* {item.status === "SUBMITTED" && (
              <TouchableOpacity
                style={[
                  styles.verticalActionButton,
                  styles.verticalReviewButton,
                ]}
                onPress={() => onReviewResponse(item)}
              >
                <Icon name="check" size={16} color="#FFFFFF" />
                <Text style={[styles.verticalActionText, { color: "#FFFFFF" }]}>
                  Review
                </Text>
              </TouchableOpacity>
            )} */}
          </View>
        </View>
      </View>
    );
  };

  // ✅ VERTICAL LIST ROW COMPONENT - NCRs (One Per Row)
  const renderNCRVerticalItem = (item: NCR) => {
    const severityColors = getSeverityBadge(item.severity);
    const statusColors = getStatusBadge(item.status);

    return (
      <TouchableOpacity
        style={styles.verticalItemContainer}
        onPress={() => {
          onViewNCR(item);
          setSelectedNcrId(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.verticalItemRow}>
          <View style={styles.verticalItemLeft}>
            <Text style={styles.verticalItemId}>
              {item.ncrNumber || `NCR-${item.id}`}
            </Text>
            <Text style={styles.verticalItemTitle} numberOfLines={1}>
              {item.title || "Non-Conformity Report"}
            </Text>
          </View>
          <View style={styles.verticalItemCenter}>
            <Text style={styles.verticalItemDept} numberOfLines={1}>
              {item.department || "N/A"}
            </Text>
            <Text style={styles.verticalItemDate}>
              {item.createdAt
                ? format(new Date(item.createdAt), "dd-MM-yyyy")
                : "N/A"}
            </Text>
          </View>
          <View style={styles.verticalItemRight}>
            <View
              style={[styles.badge, { backgroundColor: severityColors.bg }]}
            >
              <Icon name="alert-circle" size={8} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>
                {item.severity || "NCR"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {item.status || "OPEN"}
              </Text>
            </View>
          </View>
          <View style={styles.verticalItemActions}>
            <TouchableOpacity
              style={styles.verticalActionButton}
              onPress={() => {
                onViewNCR(item);
                setSelectedNcrId(item.id); // ✅ Triggers the NCRViewManager
              }}
            >
              <Icon name="eye" size={16} color="#1D4ED8" />
              <Text style={[styles.verticalActionText, { color: "#1D4ED8" }]}>
                View
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ GRID CARD COMPONENT - Responses
  const renderResponseCard = (item: Response) => {
    const answers =
      typeof item.answers === "string"
        ? JSON.parse(item.answers)
        : item.answers;
    const statusColors = getStatusBadge(item.status);
    const auditorName = getAuditorName(item.auditorId);

    return (
      <View style={styles.responseCard}>
        <View style={styles.responseHeader}>
          <Text style={styles.responseId}>
            {answers?.documentNumber || `RES-${item.id}`}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.badgeText, { color: statusColors.text }]}>
              {item.status || "DRAFT"}
            </Text>
          </View>
        </View>
        <Text style={styles.responseDepartment}>
          {item.department || "N/A"}
        </Text>
        <Text style={styles.responseAuditee}>
          Auditee: {answers?.auditeeName || item.auditeeName || "N/A"}
        </Text>
        <View style={styles.responseFooter}>
          <Text style={styles.responseScore}>
            Score:{" "}
            <Text style={styles.responseScoreValue}>
              {(item.percentageScore || 0).toFixed(2)}%
            </Text>
          </Text>
          <Text style={styles.responseAuditor}>Auditor: {auditorName}</Text>
        </View>
        <View style={styles.responseActions}>
          <TouchableOpacity
            style={styles.responseActionButton}
            onPress={() => {
              onViewResponse(item);
              setReportView({ type: detectReportType(item), id: item.id });
            }}
          >
            <Icon name="eye" size={14} color="#6B7280" />
            <Text style={styles.responseActionText}>View</Text>
          </TouchableOpacity>
          {/* {item.status === "SUBMITTED" && (
            <TouchableOpacity
              style={[styles.responseActionButton, styles.reviewButton]}
              onPress={() => onReviewResponse(item)}
            >
              <Icon name="check" size={14} color="#FFFFFF" />
              <Text
                style={[styles.responseActionText, styles.reviewButtonText]}
              >
                Review
              </Text>
            </TouchableOpacity>
          )} */}
        </View>
      </View>
    );
  };

  // ✅ GRID CARD COMPONENT - NCRs
  const renderNCRCard = (item: NCR) => {
    const severityColors = getSeverityBadge(item.severity);
    const statusColors = getStatusBadge(item.status);

    return (
      <View style={styles.ncrCard}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            onViewNCR(item);
            setSelectedNcrId(item.id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.ncrHeader}>
            <View
              style={[styles.badge, { backgroundColor: severityColors.bg }]}
            >
              <Icon name="alert-circle" size={10} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>
                {item.severity || "NCR"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {item.status || "OPEN"}
              </Text>
            </View>
          </View>
          <Text style={styles.ncrNumber}>
            {item.ncrNumber || `NCR-${item.id}`}
          </Text>
          <Text style={styles.ncrTitle} numberOfLines={2}>
            {item.title || "Non-Conformity Report"}
          </Text>
          <View style={styles.ncrFooter}>
            <Text style={styles.ncrDept}>Dept: {item.department || "N/A"}</Text>
            <Text style={styles.ncrDate}>
              {item.createdAt
                ? format(new Date(item.createdAt), "dd-MM-yyyy")
                : "N/A"}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.ncrActions}>
          <TouchableOpacity
            style={styles.ncrActionButton}
            onPress={() => {
              onViewNCR(item);
              setSelectedNcrId(item.id); // ✅ Triggers the NCRViewManager
            }}
          >
            <Icon name="eye" size={14} color="#1D4ED8" />
            <Text style={styles.ncrActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ NCR PREVIEW (Form7 / Form8 / NCR2 via the common manager)
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

  // ✅ CHECK SHEET REPORT PREVIEW (5S / IATF / Manufacturing)
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

  // ============================================================
  // AUDITS TAB
  // ============================================================
  if (activeTab === "audits") {
    const scheduledAudits = getFilteredSchedules();

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
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
              {searchTerm
                ? `No scheduled audits match "${searchTerm}"`
                : "No audits have been scheduled"}
            </Text>
          </View>
        ) : (
          <Card>
            {isMobile ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.deptCell]}>
                      Department
                    </Text>
                    <Text style={[styles.headerCell, styles.auditorCell]}>
                      Auditor(s)
                    </Text>
                    <Text style={[styles.headerCell, styles.auditeeCell]}>
                      Auditee
                    </Text>
                    <Text style={[styles.headerCell, styles.dateCell]}>
                      Date & Time
                    </Text>
                    <Text style={[styles.headerCell, styles.statusCell]}>
                      Status
                    </Text>
                    <Text style={[styles.headerCell, styles.overdueCell]}>
                      Overdue
                    </Text>
                  </View>
                  {scheduledAudits.map((s) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    let isOverdue = false;
                    if (
                      s.scheduledDate &&
                      s.status !== "COMPLETED" &&
                      s.status !== "APPROVED" &&
                      s.status !== "REJECTED"
                    ) {
                      const scheduledDate = new Date(s.scheduledDate);
                      scheduledDate.setHours(0, 0, 0, 0);
                      isOverdue = scheduledDate < today;
                    }
                    const statusColors = getStatusBadge(s.status);
                    const primaryAuditorName = getAuditorName(s.auditorId);
                    const leadAuditorName = s.leadAuditorName;
                    let auditorDisplay = primaryAuditorName;
                    if (
                      leadAuditorName &&
                      leadAuditorName !== primaryAuditorName
                    ) {
                      auditorDisplay += ` (Lead: ${leadAuditorName})`;
                    }
                    const formatDateTime = () => {
                      if (!s.scheduledDate) return "Not Scheduled";
                      const date = format(
                        new Date(s.scheduledDate),
                        "dd MMM yyyy",
                      );
                      if (s.startTime && s.endTime)
                        return `${date} • ${s.startTime} - ${s.endTime}`;
                      return date;
                    };

                    return (
                      <View key={String(s.id)} style={styles.tableRow}>
                        <Text
                          style={[styles.tableCell, styles.deptCell]}
                          numberOfLines={1}
                        >
                          {s.department || "N/A"}
                        </Text>
                        <Text
                          style={[styles.tableCell, styles.auditorCell]}
                          numberOfLines={1}
                        >
                          {auditorDisplay}
                        </Text>
                        <Text
                          style={[styles.tableCell, styles.auditeeCell]}
                          numberOfLines={1}
                        >
                          {s.auditeeName || "N/A"}
                        </Text>
                        <Text
                          style={[styles.tableCell, styles.dateCell]}
                          numberOfLines={1}
                        >
                          {formatDateTime()}
                        </Text>
                        <View style={[styles.tableCell, styles.statusCell]}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: statusColors.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: statusColors.text },
                              ]}
                            >
                              {s.status || "DRAFT"}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.overdueCell]}>
                          {isOverdue ? (
                            <View style={[styles.badge, styles.overdueBadge]}>
                              <Icon
                                name="alert-circle"
                                size={10}
                                color="#FFFFFF"
                              />
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
            ) : (
              <View>
                <View style={styles.tableHeaderDesktop}>
                  <Text
                    style={[styles.headerCellDesktop, styles.deptCellDesktop]}
                  >
                    Department
                  </Text>
                  <Text
                    style={[
                      styles.headerCellDesktop,
                      styles.auditorCellDesktop,
                    ]}
                  >
                    Auditor(s)
                  </Text>
                  <Text
                    style={[
                      styles.headerCellDesktop,
                      styles.auditeeCellDesktop,
                    ]}
                  >
                    Auditee
                  </Text>
                  <Text
                    style={[styles.headerCellDesktop, styles.dateCellDesktop]}
                  >
                    Date & Time
                  </Text>
                  <Text
                    style={[styles.headerCellDesktop, styles.statusCellDesktop]}
                  >
                    Status
                  </Text>
                  <Text
                    style={[
                      styles.headerCellDesktop,
                      styles.overdueCellDesktop,
                    ]}
                  >
                    Overdue
                  </Text>
                </View>

                {scheduledAudits.map((s) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  let isOverdue = false;
                  if (
                    s.scheduledDate &&
                    s.status !== "COMPLETED" &&
                    s.status !== "APPROVED" &&
                    s.status !== "REJECTED"
                  ) {
                    const scheduledDate = new Date(s.scheduledDate);
                    scheduledDate.setHours(0, 0, 0, 0);
                    isOverdue = scheduledDate < today;
                  }
                  const statusColors = getStatusBadge(s.status);
                  const primaryAuditorName = getAuditorName(s.auditorId);
                  const leadAuditorName = s.leadAuditorName;
                  let auditorDisplay = primaryAuditorName;
                  if (
                    leadAuditorName &&
                    leadAuditorName !== primaryAuditorName
                  ) {
                    auditorDisplay += ` (Lead: ${leadAuditorName})`;
                  }
                  const formatDateTime = () => {
                    if (!s.scheduledDate) return "Not Scheduled";
                    const date = format(
                      new Date(s.scheduledDate),
                      "dd MMM yyyy",
                    );
                    if (s.startTime && s.endTime)
                      return `${date}  •  ${s.startTime} - ${s.endTime}`;
                    return date;
                  };

                  return (
                    <View key={String(s.id)} style={styles.tableRowDesktop}>
                      <Text
                        style={[
                          styles.tableCellDesktop,
                          styles.deptCellDesktop,
                        ]}
                        numberOfLines={1}
                      >
                        {s.department || "N/A"}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellDesktop,
                          styles.auditorCellDesktop,
                        ]}
                        numberOfLines={2}
                      >
                        {auditorDisplay}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellDesktop,
                          styles.auditeeCellDesktop,
                        ]}
                        numberOfLines={1}
                      >
                        {s.auditeeName || "N/A"}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellDesktop,
                          styles.dateCellDesktop,
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateTime()}
                      </Text>
                      <View style={[styles.statusCellDesktop]}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: statusColors.bg,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: statusColors.text,
                                fontSize: 11,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {s.status || "DRAFT"}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.overdueCellDesktop]}>
                        {isOverdue ? (
                          <View
                            style={[
                              styles.badge,
                              styles.overdueBadge,
                              {
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                              },
                            ]}
                          >
                            <Icon
                              name="alert-circle"
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text
                              style={[styles.overdueText, { fontSize: 11 }]}
                            >
                              Overdue
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.dashText,
                              { fontSize: 16, color: "#CBD5E1" },
                            ]}
                          >
                            —
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        )}
      </View>
    );
  }

  // ============================================================
  // RESPONSES TAB
  // ============================================================
  if (activeTab === "responses") {
    const filteredResponses = allResponses.filter((r) => {
      if (!searchTerm) return true;
      const answers =
        typeof r.answers === "string" ? JSON.parse(r.answers) : r.answers;
      return (
        r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        answers?.documentNumber
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    });

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search responses..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                responseViewMode === "grid" && styles.toggleActive,
              ]}
              onPress={() => setResponseViewMode("grid")}
            >
              <Icon
                name="grid"
                size={16}
                color={responseViewMode === "grid" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                responseViewMode === "list" && styles.toggleActive,
              ]}
              onPress={() => setResponseViewMode("list")}
            >
              <Icon
                name="list"
                size={16}
                color={responseViewMode === "list" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCardSmall}>
            <Text style={styles.statCardValue}>{allResponses.length}</Text>
            <Text style={styles.statCardLabel}>Total</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.statCardValue, { color: "#059669" }]}>
              {stats.responsesApproved}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#059669" }]}>
              APPROVED
            </Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.statCardValue, { color: "#DC2626" }]}>
              {stats.responsesRejected}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#DC2626" }]}>
              REJECTED
            </Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.statCardValue, { color: "#D97706" }]}>
              {stats.responsesSubmitted}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#D97706" }]}>
              SUBMITTED
            </Text>
          </View>
        </View>

        {filteredResponses.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No responses found</Text>
            <Text style={styles.emptyStateText}>
              No check sheet responses match your search
            </Text>
          </View>
        ) : responseViewMode === "grid" ? (
          <View style={styles.gridContainer}>
            {filteredResponses.map((item) => (
              <View
                key={String(item.id)}
                style={
                  isMobile
                    ? { width: "100%" }
                    : { flexBasis: "31%", maxWidth: "32%", flexGrow: 0 }
                }
              >
                {renderResponseCard(item)}
              </View>
            ))}
          </View>
        ) : (
          /* ✅ LIST VIEW - VERTICAL SCROLL (One Item Per Row) */
          <ScrollView
            style={styles.verticalListContainer}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.verticalListContent}
          >
            {filteredResponses.map((item) => (
              <View key={String(item.id)} style={styles.verticalItemWrapper}>
                {renderResponseVerticalItem(item)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ============================================================
  // NCRS TAB
  // ============================================================
  if (activeTab === "ncrs") {
    const filteredNCRs = allNCRs.filter((n) => {
      if (!searchTerm) return true;
      return (
        n.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const criticalCount = allNCRs.filter(
      (n) => n.severity === "CRITICAL",
    ).length;
    const majorCount = allNCRs.filter((n) => n.severity === "MAJOR").length;
    const minorCount = allNCRs.filter((n) => n.severity === "MINOR").length;
    const openCount = allNCRs.filter(
      (n) => n.status === "OPEN" || n.status === "IN_PROGRESS",
    ).length;
    const closedCount = allNCRs.filter((n) => n.status === "CLOSED").length;

    return (
      <View style={styles.tabContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search NCRs..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                ncrViewMode === "grid" && styles.toggleActive,
              ]}
              onPress={() => setNcrViewMode("grid")}
            >
              <Icon
                name="grid"
                size={16}
                color={ncrViewMode === "grid" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                ncrViewMode === "list" && styles.toggleActive,
              ]}
              onPress={() => setNcrViewMode("list")}
            >
              <Icon
                name="list"
                size={16}
                color={ncrViewMode === "list" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCardSmall, { backgroundColor: "#FFFFFF" }]}>
            <Text style={styles.statCardValue}>{allNCRs.length}</Text>
            <Text style={styles.statCardLabel}>Total NCRs</Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.statCardValue, { color: "#DC2626" }]}>
              {criticalCount}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#DC2626" }]}>
              Critical
            </Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#FFEDD5" }]}>
            <Text style={[styles.statCardValue, { color: "#EA580C" }]}>
              {majorCount}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#EA580C" }]}>
              Major
            </Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.statCardValue, { color: "#D97706" }]}>
              {minorCount}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#D97706" }]}>
              Minor
            </Text>
          </View>
          <View style={[styles.statCardSmall, { backgroundColor: "#EDE9FE" }]}>
            <Text style={[styles.statCardValue, { color: "#7C3AED" }]}>
              {openCount}
            </Text>
            <Text style={[styles.statCardLabel, { color: "#7C3AED" }]}>
              Open / In Progress
            </Text>
          </View>
        </View>

        {allNCRs.length > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Closure Progress</Text>
              <Text style={styles.progressPercent}>
                {Math.round((closedCount / allNCRs.length) * 100)}% Closed
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(closedCount / allNCRs.length) * 100}%` },
                ]}
              />
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
                : "No non-conformity reports match your search"}
            </Text>
          </View>
        ) : ncrViewMode === "grid" ? (
          <View style={styles.gridContainer}>
            {filteredNCRs.map((item) => (
              <View
                key={String(item.id)}
                style={
                  isMobile
                    ? { width: "100%" }
                    : { flexBasis: "31%", maxWidth: "32%", flexGrow: 0 }
                }
              >
                {renderNCRCard(item)}
              </View>
            ))}
          </View>
        ) : (
          /* ✅ LIST VIEW - VERTICAL SCROLL (One Item Per Row) */
          <ScrollView
            style={styles.verticalListContainer}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.verticalListContent}
          >
            {filteredNCRs.map((item) => (
              <View key={String(item.id)} style={styles.verticalItemWrapper}>
                {renderNCRVerticalItem(item)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // ============================================================================
  // LAYOUT & CONTAINER STYLES
  // ============================================================================
  tabContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
  },

  // ============================================================================
  // SEARCH STYLES
  // ============================================================================
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
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

  // ============================================================================
  // STATS STYLES
  // ============================================================================
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  statCardSmall: {
    flex: 1,
    minWidth: "18%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statCardLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },

  // ============================================================================
  // TABLE STYLES (Mobile)
  // ============================================================================
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 11,
    color: "#1F2937",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deptCell: { width: isMobile ? 60 : 80 },
  auditorCell: { width: isMobile ? 80 : 100 },
  auditeeCell: { width: isMobile ? 60 : 80 },
  dateCell: { width: isMobile ? 80 : 120 },
  statusCell: { width: isMobile ? 60 : 80 },
  overdueCell: { width: isMobile ? 50 : 60 },

  // ============================================================================
  // TABLE STYLES (Desktop)
  // ============================================================================
  tableHeaderDesktop: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  headerCellDesktop: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRowDesktop: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  tableCellDesktop: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  deptCellDesktop: { flex: 2 },
  auditorCellDesktop: { flex: 2.5 },
  auditeeCellDesktop: { flex: 2 },
  dateCellDesktop: { flex: 2.5 },
  statusCellDesktop: { flex: 1.5, alignItems: "flex-start" },
  overdueCellDesktop: { flex: 1.2, alignItems: "center" },

  // ============================================================================
  // BADGE STYLES
  // ============================================================================
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    gap: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "500",
  },
  overdueBadge: {
    backgroundColor: "#EF4444",
  },
  overdueText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  dashText: {
    color: "#9CA3AF",
  },

  // ============================================================================
  // EMPTY STATE STYLES
  // ============================================================================
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },

  // ============================================================================
  // RESPONSE CARD STYLES
  // ============================================================================
  responseCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  responseId: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  responseDepartment: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  responseAuditee: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  responseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  responseScore: {
    fontSize: 12,
    color: "#6B7280",
  },
  responseScoreValue: {
    fontWeight: "600",
    color: "#1F2937",
  },
  responseAuditor: {
    fontSize: 12,
    color: "#6B7280",
  },
  responseActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  responseActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  responseActionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  reviewButton: {
    backgroundColor: NAVBAR_COLORS.primary,
    borderColor: NAVBAR_COLORS.primary,
  },
  reviewButtonText: {
    color: "#FFFFFF",
  },

  // ============================================================================
  // NCR CARD STYLES
  // ============================================================================
  ncrCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  ncrHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  ncrNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  ncrTitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 16,
  },
  ncrFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  ncrDept: {
    fontSize: 12,
    color: "#6B7280",
  },
  ncrDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  ncrActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  ncrActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  ncrActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },

  // ============================================================================
  // PROGRESS STYLES
  // ============================================================================
  progressContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },

  // ============================================================================
  // GRID STYLES
  // ============================================================================
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  // ============================================================================
  // VERTICAL LIST STYLES (One Item Per Row)
  // ============================================================================
  verticalListContainer: {
    flex: 1,
    marginTop: 4,
  },
  verticalListContent: {
    paddingBottom: 16,
    gap: 8,
  },
  verticalItemWrapper: {
    width: "100%",
  },
  verticalItemContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    width: "100%",
  },
  verticalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  verticalItemLeft: {
    flex: 2,
    minWidth: 120,
  },
  verticalItemCenter: {
    flex: 1.5,
    minWidth: 100,
  },
  verticalItemRight: {
    flex: 1,
    minWidth: 80,
    alignItems: "flex-end",
  },
  verticalItemActions: {
    flexDirection: "row",
    gap: 6,
    minWidth: 100,
    justifyContent: "flex-end",
  },
  verticalItemId: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  verticalItemDepartment: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  verticalItemTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1F2937",
  },
  verticalItemAuditee: {
    fontSize: 12,
    color: "#6B7280",
  },
  verticalItemAuditor: {
    fontSize: 11,
    color: "#6B7280",
  },
  verticalItemScore: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  verticalItemDept: {
    fontSize: 12,
    color: "#6B7280",
  },
  verticalItemDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  verticalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  verticalReviewButton: {
    backgroundColor: NAVBAR_COLORS.primary,
    borderColor: NAVBAR_COLORS.primary,
  },
  verticalActionText: {
    fontSize: 11,
    color: "#6B7280",
  },
});

export default AuditsAndResponses;
