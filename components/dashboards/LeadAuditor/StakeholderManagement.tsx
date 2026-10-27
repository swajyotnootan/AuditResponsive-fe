// app/components/dashboards/LeadAuditor/StakeholderManagement.tsx
"use client";

import React, { useCallback, useMemo, useState, useTransition } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
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
const NUM_COLUMNS = isMobile ? 1 : 3;
const GAP = 16;

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

// ═════ REUSABLE OUTLINE BUTTON ═════
const OutlineButton = ({
  title,
  icon: IconProp,
  onPress,
  disabled = false,
  loading = false,
  active = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

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
      style={{
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
      }}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : IconProp ? (
        <IconProp size={16} color={iconColor} />
      ) : null}
      {title ? (
        <Text style={{ fontSize: 13, fontWeight: "600", color: textColor }}>
          {title}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({
  children,
  style,
}) => <View style={[styles.card, style]}>{children}</View>;

// ✅ Helper: get department string from User (handles both string and object)
const getDepartmentString = (dept: any): string => {
  if (!dept) return "";
  if (typeof dept === "string") return dept;
  if (typeof dept === "object") {
    return dept.displayName || dept.name || "";
  }
  return "";
};

// ═════════════════════════════════════════════════════════════════
// StakeholderCard — fully implemented, memoized
// ═════════════════════════════════════════════════════════════════
interface StakeholderCardProps {
  item: User;
  subTab: "auditors" | "auditees";
  responses: Response[];
  ncrs: NCR[];
  assignedAudits: number;
  onViewResponses: (u: User) => void;
  onViewNCRs: (u: User) => void;
}

const StakeholderCard = React.memo<StakeholderCardProps>(
  ({
    item,
    subTab,
    responses,
    ncrs,
    assignedAudits,
    onViewResponses,
    onViewNCRs,
  }) => {
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
    const initial = (
      item.firstName?.[0] ||
      item.username?.[0] ||
      "A"
    ).toUpperCase();

    return (
      <View style={styles.stakeholderCard}>
        {/* Header */}
        <View style={styles.stakeholderHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.stakeholderInfo}>
            <Text style={styles.stakeholderName} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.stakeholderRole} numberOfLines={1}>
              {item.role || "User"}
            </Text>
            <Text style={styles.stakeholderEmail} numberOfLines={1}>
              {item.email || "No email"}
            </Text>
            {subTab === "auditees" && deptDisplay ? (
              <View style={styles.deptBadge}>
                <Icon name="briefcase" size={10} color={COLORS.chipText} />
                <Text style={styles.deptBadgeText} numberOfLines={1}>
                  {deptDisplay}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{assignedAudits}</Text>
            <Text style={styles.statBoxLabel} numberOfLines={1}>
              Assigned
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{responses.length}</Text>
            <Text style={styles.statBoxLabel} numberOfLines={1}>
              Responses
            </Text>
          </View>
        </View>

        {/* Status Row */}
        <View style={styles.statusRow}>
          <View style={styles.statusBoxSuccess}>
            <Text style={styles.statusBoxValueSuccess}>
              {approvedResponses}
            </Text>
            <Text style={styles.statusBoxLabel}>Approved</Text>
          </View>
          <View style={styles.statusBoxWarning}>
            <Text style={styles.statusBoxValueWarning}>
              {submittedResponses}
            </Text>
            <Text style={styles.statusBoxLabel}>Pending</Text>
          </View>
        </View>

        {/* NCR Summary */}
        {ncrs.length > 0 && (
          <View style={styles.ncrSummary}>
            <View style={styles.ncrSummaryHeader}>
              <Icon name="alert-triangle" size={12} color={COLORS.primary} />
              <Text style={styles.ncrSummaryText}>
                {ncrs.length} Total NCRs
              </Text>
            </View>
            <View style={styles.ncrSummaryRow}>
              <View style={styles.ncrChip}>
                <Text style={styles.ncrChipText}>Open {openNCRs}</Text>
              </View>
              <View style={[styles.ncrChip, styles.ncrChipClosed]}>
                <Text style={[styles.ncrChipText, styles.ncrChipClosedText]}>
                  Closed {closedNCRs}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onViewResponses(item)}
            activeOpacity={0.7}
          >
            <Icon name="file-text" size={14} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Responses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onViewNCRs(item)}
            activeOpacity={0.7}
          >
            <Icon name="alert-triangle" size={14} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>NCRs</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

StakeholderCard.displayName = "StakeholderCard";

// ═════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════
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
  // ── State ────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<"auditors" | "auditees">("auditors");
  const [isPending, startTransition] = useTransition();

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

  // ── Helpers ──────────────────────────────────────────────────
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

  const getStatusBadge = (status?: string) => {
    const colors: Record<string, any> = {
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
      SUBMITTED: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      DRAFT: {
        bg: COLORS.borderLight,
        text: COLORS.textMuted,
        border: COLORS.border,
      },
      OPEN: {
        bg: COLORS.primaryLight,
        text: COLORS.primary,
        border: COLORS.primaryBorder,
      },
      IN_PROGRESS: {
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

  const handleViewResponses = useCallback((stakeholder: User) => {
    setSelectedStakeholder(stakeholder);
    setModalType("responses");
    setShowResponsesModal(true);
  }, []);

  const handleViewNCRs = useCallback((stakeholder: User) => {
    setSelectedStakeholder(stakeholder);
    setModalType("ncrs");
    setShowNCRsModal(true);
  }, []);

  // ── LOOKUP MAPS ─────────────────────────────────────────────
  const responsesByAuditor = useMemo(() => {
    const m = new Map<string | number, Response[]>();
    allResponses.forEach((r) => {
      if (r.auditorId == null) return;
      const arr = m.get(r.auditorId) ?? [];
      arr.push(r);
      m.set(r.auditorId, arr);
    });
    return m;
  }, [allResponses]);

  const responsesByAuditee = useMemo(() => {
    const m = new Map<string | number, Response[]>();
    allResponses.forEach((r) => {
      if (r.auditeeId == null) return;
      const arr = m.get(r.auditeeId) ?? [];
      arr.push(r);
      m.set(r.auditeeId, arr);
    });
    return m;
  }, [allResponses]);

  const ncrsByAuditor = useMemo(() => {
    const m = new Map<string | number, NCR[]>();
    allNCRs.forEach((n) => {
      if (n.auditorId == null) return;
      const arr = m.get(n.auditorId) ?? [];
      arr.push(n);
      m.set(n.auditorId, arr);
    });
    return m;
  }, [allNCRs]);

  const ncrsByAuditee = useMemo(() => {
    const m = new Map<string | number, NCR[]>();
    allNCRs.forEach((n) => {
      if (n.auditeeId == null) return;
      const arr = m.get(n.auditeeId) ?? [];
      arr.push(n);
      m.set(n.auditeeId, arr);
    });
    return m;
  }, [allNCRs]);

  const schedulesByAuditor = useMemo(() => {
    const m = new Map<string | number, Schedule[]>();
    allSchedules.forEach((s) => {
      if (s.auditorId == null) return;
      const arr = m.get(s.auditorId) ?? [];
      arr.push(s);
      m.set(s.auditorId, arr);
    });
    return m;
  }, [allSchedules]);

  const schedulesByAuditee = useMemo(() => {
    const m = new Map<string | number, Schedule[]>();
    allSchedules.forEach((s) => {
      if (s.auditeeId == null) return;
      const arr = m.get(s.auditeeId) ?? [];
      arr.push(s);
      m.set(s.auditeeId, arr);
    });
    return m;
  }, [allSchedules]);

  // ── Shared "auditees without HOD" — computed once ───────────
  const auditeesWithoutHOD = useMemo(
    () =>
      allAuditees.filter((a) => {
        const role = (a.role || "").toUpperCase();
        return role !== "HOD" && !role.includes("HOD");
      }),
    [allAuditees],
  );

  // ── O(1) lookups ────────────────────────────────────────────
  const getResponses = useCallback(
    (id: string | number) =>
      (subTab === "auditors" ? responsesByAuditor : responsesByAuditee).get(
        id,
      ) ?? [],
    [subTab, responsesByAuditor, responsesByAuditee],
  );

  const getNCRs = useCallback(
    (id: string | number) =>
      (subTab === "auditors" ? ncrsByAuditor : ncrsByAuditee).get(id) ?? [],
    [subTab, ncrsByAuditor, ncrsByAuditee],
  );

  // ── Derived lists ───────────────────────────────────────────
  const departmentOptions = useMemo(() => {
    const map = new Map<string, number>();

    auditeesWithoutHOD.forEach((a) => {
      const dept = getDepartmentString(a.department);
      if (dept) map.set(dept, (map.get(dept) || 0) + 1);
    });

    const sorted = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([name, count]) => ({ name, count }));

    return [
      {
        name: "ALL",
        label: "All Departments",
        count: auditeesWithoutHOD.length,
      },
      ...sorted.map((d) => ({ name: d.name, label: d.name, count: d.count })),
    ];
  }, [auditeesWithoutHOD]);

  const stakeholders = useMemo(() => {
    if (subTab === "auditors") {
      return allAuditors.filter(
        (a) =>
          a.role !== "LEAD_AUDITOR" && !a.role?.toLowerCase().includes("lead"),
      );
    }
    if (selectedDepartment === "ALL") return auditeesWithoutHOD;
    return auditeesWithoutHOD.filter(
      (a) => getDepartmentString(a.department) === selectedDepartment,
    );
  }, [subTab, allAuditors, auditeesWithoutHOD, selectedDepartment]);

  const getSummary = useCallback(
    (id: string | number) => {
      const responses = getResponses(id);
      const total = responses.length;
      const approved = responses.filter((r) => r.status === "APPROVED").length;
      const rejected = responses.filter((r) => r.status === "REJECTED").length;
      const submitted = responses.filter(
        (r) => r.status === "SUBMITTED",
      ).length;
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
    },
    [getResponses],
  );

  const selectedResponses = selectedStakeholder
    ? getResponses(selectedStakeholder.id)
    : [];
  const selectedNCRs = selectedStakeholder
    ? getNCRs(selectedStakeholder.id)
    : [];

  const currentDeptLabel =
    departmentOptions.find((d) => d.name === selectedDepartment)?.label ||
    "All Departments";

  // ── Modal list item renderer ────────────────────────────────
  const renderModalItem = ({ item }: { item: Response | NCR }) => {
    if (modalType === "responses") {
      const r = item as Response;
      const answers = safeParseAnswers(r.answers);
      const statusColors = getStatusBadge(r.status);
      return (
        <View style={styles.modalItem}>
          <View style={styles.modalItemHeader}>
            <Text style={styles.modalItemId}>
              {answers?.documentNumber || `RES-${r.id}`}
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
              activeOpacity={0.7}
            >
              <Icon name="eye" size={12} color={COLORS.primary} />
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
                styles.badge,
                {
                  backgroundColor: severityColors.bg,
                  borderColor: severityColors.border,
                },
              ]}
            >
              <Icon name="alert-circle" size={8} color={severityColors.text} />
              <Text style={[styles.badgeText, { color: severityColors.text }]}>
                {n.severity || "NCR"}
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
              activeOpacity={0.7}
            >
              <Icon name="eye" size={12} color={COLORS.primary} />
              <Text style={styles.modalItemViewText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  // ── NCR preview ─────────────────────────────────────────────
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

  // ── Report preview ──────────────────────────────────────────
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

  // ── Header (sub-tabs + filter) — extracted for FlatList header
  const listHeader = (
    <View style={{ paddingBottom: 16 }}>
      {/* Sub-tab switcher */}
      <View style={styles.subTabContainer}>
        <OutlineButton
          title={`Auditors (${allAuditors.length})`}
          icon={() => (
            <Icon
              name="users"
              size={16}
              color={subTab === "auditors" ? COLORS.primary : COLORS.textMuted}
            />
          )}
          active={subTab === "auditors"}
          onPress={() => {
            startTransition(() => {
              setSubTab("auditors");
              setSelectedDepartment("ALL");
            });
          }}
        />
        <OutlineButton
          title={`Auditees (${allAuditees.length})`}
          icon={() => (
            <Icon
              name="user-check"
              size={16}
              color={subTab === "auditees" ? COLORS.primary : COLORS.textMuted}
            />
          )}
          active={subTab === "auditees"}
          onPress={() => {
            startTransition(() => {
              setSubTab("auditees");
            });
          }}
        />
      </View>

      {/* Department dropdown — only on Auditees */}
      {subTab === "auditees" && (
        <Card style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Icon name="filter" size={14} color={COLORS.primary} />
            <Text style={styles.filterLabel}>Filter by Department</Text>
            <Text style={styles.filterCount}>{stakeholders.length} shown</Text>
          </View>

          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowDeptDropdown(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownTriggerLeft}>
              <Icon name="briefcase" size={14} color={COLORS.primary} />
              <Text style={styles.dropdownTriggerText}>{currentDeptLabel}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </Card>
      )}

      {/* Pending indicator */}
      {isPending && (
        <View style={{ paddingVertical: 8, alignItems: "center" }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
    </View>
  );

  // ── Main render ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={stakeholders}
        key={`grid-${NUM_COLUMNS}`}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.containerContent}
        columnWrapperStyle={!isMobile ? styles.columnWrapper : undefined}
        initialNumToRender={isMobile ? 4 : 9}
        maxToRenderPerBatch={isMobile ? 4 : 9}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== "web"}
        renderItem={({ item }) => (
          <View
            style={[
              styles.gridItem,
              // Apply margin left to second and third items in a row for spacing
              !isMobile && {
                marginLeft: 0,
                marginRight: 0, // managed by inner card margin
              },
            ]}
          >
            <StakeholderCard
              item={item}
              subTab={subTab}
              responses={getResponses(item.id)}
              ncrs={getNCRs(item.id)}
              assignedAudits={
                (subTab === "auditors"
                  ? schedulesByAuditor.get(item.id)
                  : schedulesByAuditee.get(item.id)
                )?.length ?? 0
              }
              onViewResponses={handleViewResponses}
              onViewNCRs={handleViewNCRs}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconWrap}>
              <Icon
                name={subTab === "auditors" ? "users" : "user-check"}
                size={28}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyStateTitle}>
              No {subTab === "auditors" ? "Auditors" : "Auditees"} Found
            </Text>
            <Text style={styles.emptyStateText}>
              {subTab === "auditees" && selectedDepartment !== "ALL"
                ? `No auditees found in ${selectedDepartment} department`
                : leadAuditorDepartment
                  ? `No ${subTab === "auditors" ? "auditors" : "auditees"} found for ${leadAuditorDepartment} plant`
                  : `No ${subTab === "auditors" ? "auditors" : "auditees"} are currently registered`}
            </Text>
          </View>
        }
      />

      {/* ── Department dropdown modal ─────────────────────────── */}
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
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderTitle}>Select Department</Text>
              <TouchableOpacity
                onPress={() => setShowDeptDropdown(false)}
                style={styles.dropdownCloseButton}
              >
                <Icon name="x" size={20} color={COLORS.textMuted} />
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
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <View
                        style={[
                          styles.checkbox,
                          isActive && styles.checkboxActive,
                        ]}
                      >
                        {isActive && (
                          <Icon name="check" size={12} color={COLORS.card} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isActive && styles.dropdownItemTextActive,
                        ]}
                        numberOfLines={1}
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

      {/* ── Responses modal ───────────────────────────────────── */}
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
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
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
                <Icon name="x" size={22} color={COLORS.text} />
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
                <View style={[styles.modalStat, styles.modalStatSuccess]}>
                  <Text
                    style={[
                      styles.modalStatValue,
                      { color: COLORS.primaryDark },
                    ]}
                  >
                    {getSummary(selectedStakeholder.id).approved}
                  </Text>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: COLORS.primaryDark },
                    ]}
                  >
                    APPROVED
                  </Text>
                </View>
                <View style={[styles.modalStat, styles.modalStatError]}>
                  <Text
                    style={[
                      styles.modalStatValue,
                      { color: COLORS.stateErrorText },
                    ]}
                  >
                    {getSummary(selectedStakeholder.id).rejected}
                  </Text>
                  <Text
                    style={[
                      styles.modalStatLabel,
                      { color: COLORS.stateErrorText },
                    ]}
                  >
                    REJECTED
                  </Text>
                </View>
                <View style={[styles.modalStat, styles.modalStatPending]}>
                  <Text
                    style={[styles.modalStatValue, { color: COLORS.primary }]}
                  >
                    {getSummary(selectedStakeholder.id).pending}
                  </Text>
                  <Text
                    style={[styles.modalStatLabel, { color: COLORS.primary }]}
                  >
                    SUBMITTED
                  </Text>
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
                  <View style={styles.emptyStateIconWrap}>
                    <Icon name="file-text" size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.modalEmptyTitle}>No responses found</Text>
                  <Text style={styles.modalEmptyText}>
                    This stakeholder has no check sheet responses yet
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── NCRs modal ────────────────────────────────────────── */}
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
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
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
                <Icon name="x" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedNCRs}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.modalListContent}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <View style={styles.emptyStateIconWrap}>
                    <Icon
                      name="alert-triangle"
                      size={28}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.modalEmptyTitle}>No NCRs found</Text>
                  <Text style={styles.modalEmptyText}>
                    This stakeholder has no non-conformity reports
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  containerContent: {
    paddingBottom: 24,
    // gap: 16,  <-- REMOVED gap here to prevent side gaps on web
  },

  // ── GRID LAYOUT ─────────────────────────────────────────────
  columnWrapper: {
    alignItems: "stretch",
    justifyContent: "flex-start",
    width: "100%",
    // Remove gap here too
  },
  gridItem: {
    flex: 1,
    maxWidth: isMobile ? "100%" : "33.3333%", // Prevents last row items from stretching
    marginBottom: 16,
    // Spacing trick: pad the outer wrapper, and let inner card fill the space.
    // This ensures perfect math without exceeding 100% width.
    paddingHorizontal: isMobile ? 0 : 8,
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

  subTabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  filterSection: {
    padding: 14,
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
    fontWeight: "700",
    color: COLORS.textValue,
    flex: 1,
  },
  filterCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
  },

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
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderBottomColor: COLORS.borderLight,
  },
  dropdownHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
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
    borderBottomColor: COLORS.borderLight,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primaryLight,
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
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textValue,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  dropdownBadge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.borderLight,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dropdownBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  dropdownBadgeTextActive: {
    color: COLORS.card,
  },

  deptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    borderRadius: 8,
    marginTop: 6,
    maxWidth: "100%",
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.chipText,
    letterSpacing: 0.2,
  },

  // ── CARD ────────────────────────────────────────────────────
  stakeholderCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  stakeholderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  stakeholderInfo: {
    flex: 1,
    minWidth: 0,
  },
  stakeholderName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  stakeholderRole: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stakeholderEmail: {
    fontSize: 11,
    color: COLORS.textSubtle,
    marginTop: 1,
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusBoxSuccess: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: COLORS.stateSuccessBg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  statusBoxWarning: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  statusBoxValueSuccess: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  statusBoxValueWarning: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusBoxLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  ncrSummary: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  ncrSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  ncrSummaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  ncrSummaryRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  ncrChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  ncrChipClosed: {
    backgroundColor: COLORS.stateSuccessBg,
  },
  ncrChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },
  ncrChipClosedText: {
    color: COLORS.primaryDark,
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  emptyState: {
    width: "100%",
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.85,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalContentMobile: {
    width: width * 0.95,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalHeaderSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  modalStatsGrid: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalStatSuccess: {
    backgroundColor: COLORS.stateSuccessBg,
    borderColor: COLORS.primaryBorder,
  },
  modalStatError: {
    backgroundColor: COLORS.stateErrorBg,
    borderColor: COLORS.border,
  },
  modalStatPending: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  modalListContent: {
    padding: 12,
  },
  modalItem: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  modalItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  modalItemId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "monospace",
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalItemSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  modalItemScore: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalItemScoreValue: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  modalItemViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  modalItemViewText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },

  modalEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
  },
  modalEmptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },

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
});

export default StakeholderManagement;
