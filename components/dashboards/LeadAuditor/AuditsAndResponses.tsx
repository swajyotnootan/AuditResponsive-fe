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
import type { NCR, Response, Schedule, User } from "./types";

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
  // ✅ SUB-TAB STATE for CheckSheets / NCRs
  const [subTab, setSubTab] = useState<"checksheets" | "ncrs">("checksheets");

  // ✅ PREVIEW STATE
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

  // ✅ VERTICAL LIST ROW COMPONENT - Responses
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
          </View>
        </View>
      </View>
    );
  };

  // ✅ VERTICAL LIST ROW COMPONENT - NCRs
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
                setSelectedNcrId(item.id);
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
              setSelectedNcrId(item.id);
            }}
          >
            <Icon name="eye" size={14} color="#1D4ED8" />
            <Text style={styles.ncrActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

  // ============================================================
  // ✅ MERGED TAB: CheckSheets + NCRs
  // ============================================================
  if (activeTab === "checksheets-ncrs") {
    // Filter responses
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

    // Filter NCRs
    const filteredNCRs = allNCRs.filter((n) => {
      if (!searchTerm) return true;
      return (
        n.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    return (
      <View style={styles.tabContainer}>
        {/* ✅ SUB-TAB SWITCHER */}
        <View style={styles.subTabContainer}>
          <TouchableOpacity
            style={[
              styles.subTabButton,
              subTab === "checksheets" && styles.subTabActive,
            ]}
            onPress={() => setSubTab("checksheets")}
          >
            <Icon
              name="file-text"
              size={16}
              color={subTab === "checksheets" ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[
                styles.subTabText,
                subTab === "checksheets" && styles.subTabTextActive,
              ]}
            >
              Check Sheets ({allResponses.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTabButton,
              subTab === "ncrs" && styles.subTabActive,
            ]}
            onPress={() => setSubTab("ncrs")}
          >
            <Icon
              name="alert-triangle"
              size={16}
              color={subTab === "ncrs" ? "#FFFFFF" : "#6B7280"}
            />
            <Text
              style={[
                styles.subTabText,
                subTab === "ncrs" && styles.subTabTextActive,
              ]}
            >
              NCRs ({allNCRs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & View Toggle */}
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
              placeholder={
                subTab === "checksheets"
                  ? "Search check sheets..."
                  : "Search NCRs..."
              }
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                (subTab === "checksheets" ? responseViewMode : ncrViewMode) ===
                  "grid" && styles.toggleActive,
              ]}
              onPress={() =>
                subTab === "checksheets"
                  ? setResponseViewMode("grid")
                  : setNcrViewMode("grid")
              }
            >
              <Icon
                name="grid"
                size={16}
                color={
                  (subTab === "checksheets"
                    ? responseViewMode
                    : ncrViewMode) === "grid"
                    ? "#FFFFFF"
                    : "#6B7280"
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                (subTab === "checksheets" ? responseViewMode : ncrViewMode) ===
                  "list" && styles.toggleActive,
              ]}
              onPress={() =>
                subTab === "checksheets"
                  ? setResponseViewMode("list")
                  : setNcrViewMode("list")
              }
            >
              <Icon
                name="list"
                size={16}
                color={
                  (subTab === "checksheets"
                    ? responseViewMode
                    : ncrViewMode) === "list"
                    ? "#FFFFFF"
                    : "#6B7280"
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        {subTab === "checksheets" ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCardSmall}>
              <Text style={styles.statCardValue}>{allResponses.length}</Text>
              <Text style={styles.statCardLabel}>Total</Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#D1FAE5" }]}
            >
              <Text style={[styles.statCardValue, { color: "#059669" }]}>
                {stats.responsesApproved}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#059669" }]}>
                APPROVED
              </Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FEE2E2" }]}
            >
              <Text style={[styles.statCardValue, { color: "#DC2626" }]}>
                {stats.responsesRejected}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#DC2626" }]}>
                REJECTED
              </Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FEF3C7" }]}
            >
              <Text style={[styles.statCardValue, { color: "#D97706" }]}>
                {stats.responsesSubmitted}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#D97706" }]}>
                SUBMITTED
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FFFFFF" }]}
            >
              <Text style={styles.statCardValue}>{allNCRs.length}</Text>
              <Text style={styles.statCardLabel}>Total NCRs</Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FEE2E2" }]}
            >
              <Text style={[styles.statCardValue, { color: "#DC2626" }]}>
                {stats.criticalNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#DC2626" }]}>
                Critical
              </Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FFEDD5" }]}
            >
              <Text style={[styles.statCardValue, { color: "#EA580C" }]}>
                {stats.majorNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#EA580C" }]}>
                Major
              </Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#FEF3C7" }]}
            >
              <Text style={[styles.statCardValue, { color: "#D97706" }]}>
                {stats.minorNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#D97706" }]}>
                Minor
              </Text>
            </View>
            <View
              style={[styles.statCardSmall, { backgroundColor: "#EDE9FE" }]}
            >
              <Text style={[styles.statCardValue, { color: "#7C3AED" }]}>
                {stats.openNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: "#7C3AED" }]}>
                Open
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        {subTab === "checksheets" ? (
          filteredResponses.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="file-text" size={40} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No check sheets found</Text>
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
          )
        ) : filteredNCRs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="alert-triangle" size={40} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No NCRs found</Text>
            <Text style={styles.emptyStateText}>
              {leadAuditorDepartment
                ? `No non-conformity reports found for ${leadAuditorDepartment} plant`
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
  // SUB-TAB STYLES
  // ============================================================================
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
  // GRID STYLES
  // ============================================================================
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  // ============================================================================
  // VERTICAL LIST STYLES
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
  verticalActionText: {
    fontSize: 11,
    color: "#6B7280",
  },
});

export default AuditsAndResponses;
