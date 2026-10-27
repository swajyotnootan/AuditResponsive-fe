// app/components/dashboards/LeadAuditor/AuditsAndResponses.tsx
"use client";

import { format } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
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

// ════ STRICT MONOCHROMATIC MNC PALETTE (Blue & Slate Only) ═════
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  stateSuccessBg: "#EFF6FF",
  stateErrorBg: "#F1F5F9",
  stateWarningBg: "#F8FAFC",
  stateErrorText: "#475569",
  stateWarningText: "#64748B",
  chipBg: "#EFF6FF",
  chipBorder: "#BFDBFE",
  chipText: "#1E40AF",
};

// ═════ REUSABLE OUTLINE BUTTON (From Form4View) ═════
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
  active = false,
  style,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

  // If `active` is passed, force the primary look (for tabs)
  const isHoveredAndEnabled = (isHovered || active) && !disabled;
  const borderColor = isHoveredAndEnabled ? COLORS.primary : COLORS.border;
  const textColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textValue;
  const iconColor = isHoveredAndEnabled ? COLORS.primary : COLORS.textMuted;
  const backgroundColor = isHoveredAndEnabled
    ? COLORS.primaryLight
    : COLORS.card;

  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: () => !disabled && setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      {...webHoverProps}
      disabled={disabled || loading}
      style={[
        {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor,
          backgroundColor,
          paddingVertical: 10,
          paddingHorizontal: 12,
          opacity: disabled ? 0.5 : 1,
        },
        style, // 👈 ADD (overrides flex:1 and paddings)
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

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
      SCHEDULED: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      IN_PROGRESS: {
        bg: COLORS.stateWarningBg,
        text: COLORS.stateWarningText,
        border: COLORS.border,
      },
      COMPLETED: {
        bg: COLORS.stateSuccessBg,
        text: COLORS.primaryDark,
        border: COLORS.primaryBorder,
      },
      APPROVED: {
        bg: COLORS.stateSuccessBg,
        text: COLORS.primaryDark,
        border: COLORS.primaryBorder,
      },
      REJECTED: {
        bg: COLORS.stateErrorBg,
        text: COLORS.stateErrorText,
        border: COLORS.border,
      },
      DRAFT: {
        bg: COLORS.borderLight,
        text: COLORS.textMuted,
        border: COLORS.border,
      },
      SUBMITTED: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      OPEN: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      CLOSED: {
        bg: COLORS.stateSuccessBg,
        text: COLORS.primaryDark,
        border: COLORS.primaryBorder,
      },
    };
    return (
      colors[status || ""] || {
        bg: COLORS.borderLight,
        text: COLORS.textMuted,
        border: COLORS.border,
      }
    );
  };

  const getSeverityBadge = (severity?: string) => {
    const colors: Record<string, any> = {
      CRITICAL: {
        bg: COLORS.primaryLight,
        text: COLORS.primaryDark,
        border: COLORS.primary,
      },
      MAJOR: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      MINOR: {
        bg: COLORS.stateWarningBg,
        text: COLORS.textMuted,
        border: COLORS.border,
      },
    };
    return (
      colors[severity || ""] || {
        bg: COLORS.borderLight,
        text: COLORS.textMuted,
        border: COLORS.border,
      }
    );
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
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.border,
                },
              ]}
            >
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
              activeOpacity={0.7}
            >
              <Icon name="eye" size={14} color={COLORS.primary} />
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
              style={[
                styles.badge,
                {
                  backgroundColor: severityColors.bg,
                  borderColor: severityColors.border,
                },
              ]}
            >
              <Icon name="alert-circle" size={8} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>
                {item.severity || "NCR"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.border,
                },
              ]}
            >
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
              activeOpacity={0.7}
            >
              <Icon name="eye" size={14} color={COLORS.primary} />
              <Text style={styles.verticalActionText}>View</Text>
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
          <View
            style={[
              styles.badge,
              {
                backgroundColor: statusColors.bg,
                borderColor: statusColors.border,
              },
            ]}
          >
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
            activeOpacity={0.7}
          >
            <Icon name="eye" size={14} color={COLORS.primary} />
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
              style={[
                styles.badge,
                {
                  backgroundColor: severityColors.bg,
                  borderColor: severityColors.border,
                },
              ]}
            >
              <Icon name="alert-circle" size={10} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>
                {item.severity || "NCR"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.border,
                },
              ]}
            >
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
            activeOpacity={0.7}
          >
            <Icon name="eye" size={14} color={COLORS.primary} />
            <Text style={styles.ncrActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ✅ NCR PREVIEW
  if (selectedNcrId) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
        {/* ✅ SUB-TAB SWITCHER (Using OutlineButton) */}
        <View style={styles.subTabContainer}>
          <OutlineButton
            title={`Check Sheets (${allResponses.length})`}
            icon={() => (
              <Icon
                name="file-text"
                size={16}
                color={
                  subTab === "checksheets" ? COLORS.primary : COLORS.textMuted
                }
              />
            )}
            active={subTab === "checksheets"}
            onPress={() => setSubTab("checksheets")}
          />
          <OutlineButton
            title={`NCRs (${allNCRs.length})`}
            icon={() => (
              <Icon
                name="alert-triangle"
                size={16}
                color={subTab === "ncrs" ? COLORS.primary : COLORS.textMuted}
              />
            )}
            active={subTab === "ncrs"}
            onPress={() => setSubTab("ncrs")}
          />
        </View>

        {/* Search & View Toggle (Using OutlineButton) */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon
              name="search"
              size={18}
              color={COLORS.textSubtle}
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
              placeholderTextColor={COLORS.textSubtle}
            />
          </View>
          <View style={styles.viewToggleContainer}>
            <View style={styles.viewToggleInner}>
              <OutlineButton
                title=""
                icon={() => (
                  <Icon
                    name="grid"
                    size={16}
                    color={
                      (subTab === "checksheets"
                        ? responseViewMode
                        : ncrViewMode) === "grid"
                        ? COLORS.primary
                        : COLORS.textMuted
                    }
                  />
                )}
                active={
                  (subTab === "checksheets"
                    ? responseViewMode
                    : ncrViewMode) === "grid"
                }
                onPress={() =>
                  subTab === "checksheets"
                    ? setResponseViewMode("grid")
                    : setNcrViewMode("grid")
                }
                style={isMobile ? styles.viewToggleButtonMobile : undefined} // 👈
              />
              <OutlineButton
                title=""
                icon={() => (
                  <Icon
                    name="list"
                    size={16}
                    color={
                      (subTab === "checksheets"
                        ? responseViewMode
                        : ncrViewMode) === "list"
                        ? COLORS.primary
                        : COLORS.textMuted
                    }
                  />
                )}
                active={
                  (subTab === "checksheets"
                    ? responseViewMode
                    : ncrViewMode) === "list"
                }
                onPress={() =>
                  subTab === "checksheets"
                    ? setResponseViewMode("list")
                    : setNcrViewMode("list")
                }
                style={isMobile ? styles.viewToggleButtonMobile : undefined} // 👈
              />
            </View>
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
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.stateSuccessBg,
                  borderColor: COLORS.primaryBorder,
                },
              ]}
            >
              <Text
                style={[styles.statCardValue, { color: COLORS.primaryDark }]}
              >
                {stats.responsesApproved}
              </Text>
              <Text
                style={[styles.statCardLabel, { color: COLORS.primaryDark }]}
              >
                APPROVED
              </Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.stateErrorBg,
                  borderColor: COLORS.border,
                },
              ]}
            >
              <Text
                style={[styles.statCardValue, { color: COLORS.stateErrorText }]}
              >
                {stats.responsesRejected}
              </Text>
              <Text
                style={[styles.statCardLabel, { color: COLORS.stateErrorText }]}
              >
                REJECTED
              </Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.statCardValue, { color: COLORS.primary }]}>
                {stats.responsesSubmitted}
              </Text>
              <Text style={[styles.statCardLabel, { color: COLORS.primary }]}>
                SUBMITTED
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCardSmall}>
              <Text style={styles.statCardValue}>{allNCRs.length}</Text>
              <Text style={styles.statCardLabel}>Total NCRs</Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primary,
                },
              ]}
            >
              <Text
                style={[styles.statCardValue, { color: COLORS.primaryDark }]}
              >
                {stats.criticalNCRs}
              </Text>
              <Text
                style={[styles.statCardLabel, { color: COLORS.primaryDark }]}
              >
                Critical
              </Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.statCardValue, { color: COLORS.primary }]}>
                {stats.majorNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: COLORS.primary }]}>
                Major
              </Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.stateWarningBg,
                  borderColor: COLORS.border,
                },
              ]}
            >
              <Text style={[styles.statCardValue, { color: COLORS.textMuted }]}>
                {stats.minorNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: COLORS.textMuted }]}>
                Minor
              </Text>
            </View>
            <View
              style={[
                styles.statCardSmall,
                {
                  backgroundColor: COLORS.primaryLight,
                  borderColor: COLORS.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.statCardValue, { color: COLORS.primary }]}>
                {stats.openNCRs}
              </Text>
              <Text style={[styles.statCardLabel, { color: COLORS.primary }]}>
                Open
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        {subTab === "checksheets" ? (
          filteredResponses.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIconWrap}>
                <Icon name="file-text" size={28} color={COLORS.primary} />
              </View>
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
                      ? styles.gridCardWrapperMobile
                      : styles.gridCardWrapperDesktop
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
            <View style={styles.emptyStateIconWrap}>
              <Icon name="alert-triangle" size={28} color={COLORS.primary} />
            </View>
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
                    ? styles.gridCardWrapperMobile
                    : styles.gridCardWrapperDesktop
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
    backgroundColor: COLORS.bg,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  // ============================================================================
  // SUB-TAB STYLES
  // ============================================================================
  subTabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  // ============================================================================
  // SEARCH STYLES
  // ============================================================================
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    minWidth: 0, // 👈 prevents flex item from overflowing
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    minWidth: 0, // 👈 important for text input to shrink
  },
  viewToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0, // 👈 never shrink the toggle group
  },
  viewToggleInner: {
    flexDirection: "row",
    gap: 8,
  },
  searchIcon: {
    marginRight: 8,
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
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ============================================================================
  // BADGE STYLES
  // ============================================================================
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    gap: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // ============================================================================
  // EMPTY STATE STYLES
  // ============================================================================
  emptyState: {
    paddingVertical: 48,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // ============================================================================
  // RESPONSE CARD STYLES
  // ============================================================================
  responseCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  responseId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "monospace",
  },
  responseDepartment: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  responseAuditee: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  responseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  responseScore: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  responseScoreValue: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  responseAuditor: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  responseActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  responseActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  responseActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ============================================================================
  // NCR CARD STYLES
  // ============================================================================
  ncrCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  ncrHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  ncrNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  ncrTitle: {
    fontSize: 12,
    color: COLORS.textValue,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  },
  ncrFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  ncrDept: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ncrDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ncrActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  ncrActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  ncrActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ============================================================================
  // GRID STYLES
  // ============================================================================
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16, // space between items
  },
  // This fixes the 3-per-row issue without overflowing
  gridCardWrapperDesktop: {
    flexGrow: 0, // Prevents the card from stretching when it's the only one on the last row
    flexShrink: 0,
    flexBasis: "31%", // Leaves enough room for the 16px gaps so 3 cards (31*3=93%) fit on 100% width
    minWidth: 280, // Prevents the card from getting too narrow on weird sizes
  },
  gridCardWrapperMobile: {
    width: "100%",
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
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    width: "100%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  verticalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
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
    gap: 4,
  },
  verticalItemActions: {
    flexDirection: "row",
    gap: 6,
    minWidth: 100,
    justifyContent: "flex-end",
  },
  verticalItemId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "monospace",
  },
  verticalItemDepartment: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  verticalItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  verticalItemAuditee: {
    fontSize: 12,
    color: COLORS.textValue,
  },
  verticalItemAuditor: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  verticalItemScore: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  verticalItemDept: {
    fontSize: 12,
    color: COLORS.textValue,
  },
  verticalItemDate: {
    fontSize: 11,
    color: COLORS.textSubtle,
    marginTop: 2,
  },
  verticalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  verticalActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  viewToggleButtonMobile: {
    flex: 0, // 👈 override flex: 1
    width: 40, // 👈 fixed compact width
    paddingHorizontal: 0, // 👈 remove horizontal padding
    minWidth: 40,
    maxWidth: 40,
  },
});

export default AuditsAndResponses;
