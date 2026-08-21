// app/components/dashboards/LeadAuditor/StakeholderManagement.tsx
"use client";

import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FiveSView from "../auditor/view/FiveSView";
import IATFInternalView from "../auditor/view/IATFInternalView";
import ManufacturingProcessView from "../auditor/view/ManufacturingProcessView";
import NCRViewManager from "../auditor/view/NCRViewManager";

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

const NAVBAR_COLORS = {
  primary: "#00529B",
  secondary: "#3b82f6",
  dark: "#1e3a8a",
  light: "#60a5fa",
  lighter: "#93c5fd",
  bg: "#eff6ff",
  white: "#ffffff",
};

// ============================================
// RESPONSIVE BADGE
// ============================================
const Badge: React.FC<{
  text: string;
  bgColor: string;
  textColor: string;
  icon?: string;
  size?: "sm" | "md";
}> = ({ text, bgColor, textColor, icon, size = "sm" }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const fontSize = size === "sm" ? (isMobile ? 8 : 9) : (isMobile ? 10 : 11);
  const paddingH = size === "sm" ? (isMobile ? 4 : 6) : (isMobile ? 6 : 8);
  const paddingV = size === "sm" ? (isMobile ? 2 : 3) : (isMobile ? 3 : 4);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: bgColor,
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        borderRadius: 4,
        gap: 2,
        alignSelf: "flex-start",
      }}
    >
      {icon && <Icon name={icon} size={fontSize + 2} color={textColor} />}
      <Text style={{ fontSize, fontWeight: "500", color: textColor }}>
        {text}
      </Text>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
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
  // ============================================
  // ✅ STEP 1: ALL HOOKS DECLARED FIRST
  // ============================================
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [showNCRsModal, setShowNCRsModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState<User | null>(
    null
  );
  const [modalType, setModalType] = useState<"responses" | "ncrs">("responses");
  const [selectedNcrId, setSelectedNcrId] = useState<string | number | null>(
    null
  );
  const [reportView, setReportView] = useState<{
    type: "5S" | "IATF" | "MANUFACTURING";
    id: string | number;
  } | null>(null);

  const safeParseAnswers = useCallback((answers: any): any => {
    if (!answers) return {};
    if (typeof answers === "object") return answers;
    try {
      return JSON.parse(answers);
    } catch {
      return {};
    }
  }, []);

  const detectReportType = useCallback(
    (r: Response): "5S" | "IATF" | "MANUFACTURING" => {
      const a = safeParseAnswers(r.answers);
      const raw = String(
        (r as any).auditType ||
          (r as any).templateType ||
          (r as any).checkSheet?.templateType ||
          (r as any).checkSheet?.name ||
          a.auditType ||
          a.templateType ||
          a.checkSheetName ||
          ""
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
    },
    [safeParseAnswers]
  );

  const getSeverityBadge = useCallback((severity?: string) => {
    const colors: Record<string, any> = {
      CRITICAL: { bg: "#FEE2E2", text: "#DC2626" },
      MAJOR: { bg: "#FFEDD5", text: "#EA580C" },
      MINOR: { bg: "#FEF3C7", text: "#D97706" },
    };
    return colors[severity || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  }, []);

  const getStatusBadge = useCallback((status?: string) => {
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
  }, []);

  const getAuditorResponses = useCallback(
    (auditorId: string | number) =>
      allResponses.filter((r) => r.auditorId === auditorId),
    [allResponses]
  );

  const getAuditorNCRs = useCallback(
    (auditorId: string | number) =>
      allNCRs.filter((n) => n.auditorId === auditorId),
    [allNCRs]
  );

  const getAuditeeResponses = useCallback(
    (auditeeId: string | number) =>
      allResponses.filter((r) => r.auditeeId === auditeeId),
    [allResponses]
  );

  const getAuditeeNCRs = useCallback(
    (auditeeId: string | number) =>
      allNCRs.filter((n) => n.auditeeId === auditeeId),
    [allNCRs]
  );

  const getResponses = useCallback(
    (id: string | number) => {
      if (activeTab === "auditors") {
        return getAuditorResponses(id);
      }
      return getAuditeeResponses(id);
    },
    [activeTab, getAuditorResponses, getAuditeeResponses]
  );

  const getNCRs = useCallback(
    (id: string | number) => {
      if (activeTab === "auditors") {
        return getAuditorNCRs(id);
      }
      return getAuditeeNCRs(id);
    },
    [activeTab, getAuditorNCRs, getAuditeeNCRs]
  );

  const getSummary = useCallback(
    (id: string | number) => {
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
    },
    [getResponses]
  );

  // ============================================
  // HANDLERS
  // ============================================
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

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderStakeholderCard = useCallback(
    (item: User) => {
      const responses = getResponses(item.id);
      const ncrs = getNCRs(item.id);
      const assignedAudits = allSchedules.filter((s) =>
        activeTab === "auditors"
          ? s.auditorId === item.id
          : s.auditeeId === item.id
      ).length;

      const approvedResponses = responses.filter(
        (r) => r.status === "APPROVED"
      ).length;
      const submittedResponses = responses.filter(
        (r) => r.status === "SUBMITTED"
      ).length;
      const openNCRs = ncrs.filter(
        (n) => n.status === "OPEN" || n.status === "IN_PROGRESS"
      ).length;
      const closedNCRs = ncrs.filter((n) => n.status === "CLOSED").length;

      return (
        <View
          key={String(item.id)}
          style={{
            width: isMobile ? "100%" : isTablet ? "48%" : "32%",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 16,
            padding: isMobile ? 12 : 16,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: NAVBAR_COLORS.primary,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "bold" }}>
                {(item.firstName?.[0] || item.username?.[0] || "A").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "600",
                  color: "#1F2937",
                }}
              >
                {item.firstName} {item.lastName}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 10 : 11,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                {item.role || "User"} • {item.email || "No email"}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: "bold",
                  color: "#1F2937",
                }}
              >
                {assignedAudits}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 9 : 10,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                Assigned Audits
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
                padding: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: "bold",
                  color: NAVBAR_COLORS.primary,
                }}
              >
                {responses.length}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 9 : 10,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                Responses
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                padding: 8,
                alignItems: "center",
                backgroundColor: "#D1FAE5",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "bold",
                  color: "#059669",
                }}
              >
                {approvedResponses}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 8 : 9,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                Approved
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                borderRadius: 8,
                padding: 8,
                alignItems: "center",
                backgroundColor: "#FEF3C7",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: "bold",
                  color: "#D97706",
                }}
              >
                {submittedResponses}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 8 : 9,
                  color: "#6B7280",
                  marginTop: 2,
                }}
              >
                Pending
              </Text>
            </View>
          </View>

          {ncrs.length > 0 && (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: "600",
                  color: "#DC2626",
                }}
              >
                {ncrs.length} Total NCRs
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 9 : 10,
                    color: "#DC2626",
                  }}
                >
                  Open: {openNCRs}
                </Text>
                <Text
                  style={{
                    fontSize: isMobile ? 9 : 10,
                    color: "#059669",
                  }}
                >
                  Closed: {closedNCRs}
                </Text>
              </View>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "#F3F4F6",
            }}
          >
            <TouchableOpacity
              style={{
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
              }}
              onPress={() => handleViewResponses(item)}
            >
              <Icon name="file-text" size={14} color="#6B7280" />
              <Text
                style={{
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: "500",
                  color: "#6B7280",
                }}
              >
                Responses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
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
              }}
              onPress={() => handleViewNCRs(item)}
            >
              <Icon name="alert-triangle" size={14} color="#6B7280" />
              <Text
                style={{
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: "500",
                  color: "#6B7280",
                }}
              >
                NCRs
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      isMobile,
      isTablet,
      getResponses,
      getNCRs,
      allSchedules,
      activeTab,
      handleViewResponses,
      handleViewNCRs,
    ]
  );

  const renderModalItem = useCallback(
    ({ item }: { item: Response | NCR }) => {
      if (modalType === "responses") {
        const r = item as Response;
        const answers = safeParseAnswers(r.answers);
        const statusColors = getStatusBadge(r.status);
        return (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 8,
              padding: isMobile ? 10 : 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 10 : 11,
                  color: "#6B7280",
                  fontFamily: "monospace",
                }}
              >
                {answers?.documentNumber || `RES-${r.id}`}
              </Text>
              <Badge
                text={r.status || "DRAFT"}
                bgColor={statusColors.bg}
                textColor={statusColors.text}
                size={isMobile ? "sm" : "md"}
              />
            </View>
            <Text
              style={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: "600",
                color: "#1F2937",
              }}
            >
              {r.department || "N/A"}
            </Text>
            <Text
              style={{
                fontSize: isMobile ? 10 : 12,
                color: "#6B7280",
                marginTop: 2,
              }}
            >
              Auditee: {answers?.auditeeName || "N/A"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 11 : 12,
                  color: "#6B7280",
                }}
              >
                Score:{" "}
                <Text
                  style={{
                    fontWeight: "600",
                    color: "#1F2937",
                  }}
                >
                  {(r.percentageScore || 0).toFixed(1)}%
                </Text>
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 4,
                }}
                onPress={() => {
                  setShowResponsesModal(false);
                  setReportView({ type: detectReportType(r), id: r.id });
                }}
              >
                <Icon name="eye" size={12} color="#6B7280" />
                <Text
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: "#6B7280",
                  }}
                >
                  View Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      } else {
        const n = item as NCR;
        const severityColors = getSeverityBadge(n.severity);
        const statusColors = getStatusBadge(n.status);
        return (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 8,
              padding: isMobile ? 10 : 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Badge
                text={n.severity || "NCR"}
                bgColor={severityColors.bg}
                textColor={severityColors.text}
                icon="alert-circle"
                size={isMobile ? "sm" : "md"}
              />
              <Badge
                text={n.status || "OPEN"}
                bgColor={statusColors.bg}
                textColor={statusColors.text}
                size={isMobile ? "sm" : "md"}
              />
            </View>
            <Text
              style={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: "600",
                color: "#1F2937",
              }}
            >
              {n.ncrNumber || `NCR-${n.id}`}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: isMobile ? 10 : 12,
                  color: "#6B7280",
                }}
              >
                Dept: {n.department || "N/A"}
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 4,
                }}
                onPress={() => {
                  setShowNCRsModal(false);
                  setSelectedNcrId(n.id);
                }}
              >
                <Icon name="eye" size={12} color="#6B7280" />
                <Text
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: "#6B7280",
                  }}
                >
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
    },
    [
      modalType,
      isMobile,
      safeParseAnswers,
      getStatusBadge,
      getSeverityBadge,
      detectReportType,
    ]
  );

  const stakeholders =
    activeTab === "auditors"
      ? allAuditors.filter(
          (a) =>
            a.role !== "LEAD_AUDITOR" &&
            !a.role?.toLowerCase().includes("lead")
        )
      : allAuditees;

  const selectedResponses = selectedStakeholder
    ? getResponses(selectedStakeholder.id)
    : [];
  const selectedNCRs = selectedStakeholder
    ? getNCRs(selectedStakeholder.id)
    : [];

  // ============================================
  // ✅ STEP 2: CONDITIONAL RETURNS (AFTER ALL HOOKS)
  // ============================================

  // NCR PREVIEW
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

  // CHECK SHEET REPORT PREVIEW
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

  // ============================================
  // STEP 3: MAIN RENDER
  // ============================================
  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: isMobile ? 8 : 12,
        }}
      >
        {stakeholders.length === 0 ? (
          <View
            style={{
              flex: 1,
              paddingVertical: 40,
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              minWidth: "100%",
            }}
          >
            <Icon
              name={activeTab === "auditors" ? "users" : "user-check"}
              size={40}
              color="#CBD5E1"
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#1F2937",
                marginTop: 12,
              }}
            >
              No {activeTab === "auditors" ? "Auditors" : "Auditees"} Found
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#6B7280",
                marginTop: 4,
                textAlign: "center",
              }}
            >
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              width: isMobile ? width * 0.95 : width * 0.85,
              maxHeight: height * 0.85,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                backgroundColor: NAVBAR_COLORS.primary,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Responses by {selectedStakeholder?.firstName}{" "}
                  {selectedStakeholder?.lastName}
                </Text>
                <Text
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    color: "#C7D2FE",
                    marginTop: 2,
                  }}
                >
                  {selectedResponses.length} total responses
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowResponsesModal(false)}
                style={{ padding: 4 }}
              >
                <Icon name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedStakeholder && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  padding: 12,
                  backgroundColor: "#F9FAFB",
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                  flexWrap: "wrap",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "30%" : "18%",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: "bold",
                      color: "#1F2937",
                    }}
                  >
                    {getSummary(selectedStakeholder.id).total}
                  </Text>
                  <Text
                    style={{
                      fontSize: isMobile ? 8 : 9,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    Total
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "30%" : "18%",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: "bold",
                      color: "#059669",
                    }}
                  >
                    {getSummary(selectedStakeholder.id).approved}
                  </Text>
                  <Text
                    style={{
                      fontSize: isMobile ? 8 : 9,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    APPROVED
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "30%" : "18%",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: "bold",
                      color: "#DC2626",
                    }}
                  >
                    {getSummary(selectedStakeholder.id).rejected}
                  </Text>
                  <Text
                    style={{
                      fontSize: isMobile ? 8 : 9,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    REJECTED
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "30%" : "18%",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: "bold",
                      color: "#D97706",
                    }}
                  >
                    {getSummary(selectedStakeholder.id).pending}
                  </Text>
                  <Text
                    style={{
                      fontSize: isMobile ? 8 : 9,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    SUBMITTED
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minWidth: isMobile ? "30%" : "18%",
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: "bold",
                      color: NAVBAR_COLORS.primary,
                    }}
                  >
                    {getSummary(selectedStakeholder.id).approvalRate.toFixed(1)}%
                  </Text>
                  <Text
                    style={{
                      fontSize: isMobile ? 8 : 9,
                      color: "#6B7280",
                      marginTop: 2,
                    }}
                  >
                    Approval Rate
                  </Text>
                </View>
              </View>
            )}

            <FlatList
              data={selectedResponses}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 12 }}
              ListEmptyComponent={
                <View
                  style={{
                    paddingVertical: 40,
                    alignItems: "center",
                  }}
                >
                  <Icon name="file-text" size={40} color="#CBD5E1" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginTop: 8,
                    }}
                  >
                    No responses found
                  </Text>
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              width: isMobile ? width * 0.95 : width * 0.85,
              maxHeight: height * 0.85,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                backgroundColor: NAVBAR_COLORS.primary,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  NCRs by {selectedStakeholder?.firstName}{" "}
                  {selectedStakeholder?.lastName}
                </Text>
                <Text
                  style={{
                    fontSize: isMobile ? 11 : 12,
                    color: "#C7D2FE",
                    marginTop: 2,
                  }}
                >
                  {selectedNCRs.length} total NCRs
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNCRsModal(false)}
                style={{ padding: 4 }}
              >
                <Icon name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedNCRs}
              renderItem={renderModalItem}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 12 }}
              ListEmptyComponent={
                <View
                  style={{
                    paddingVertical: 40,
                    alignItems: "center",
                  }}
                >
                  <Icon name="alert-triangle" size={40} color="#CBD5E1" />
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6B7280",
                      marginTop: 8,
                    }}
                  >
                    No NCRs found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default StakeholderManagement;