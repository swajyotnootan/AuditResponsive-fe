// app/components/dashboards/LeadAuditor/AuditsAndResponses.tsx
"use client";

import { format } from "date-fns";
import React, { useState, useMemo, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
  FlatList,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import FiveSView from "../auditor/view/FiveSView";
import IATFInternalView from "../auditor/view/IATFInternalView";
import ManufacturingProcessView from "../auditor/view/ManufacturingProcessView";
import NCRViewManager from "../auditor/view/NCRViewManager";

// ============================================
// TYPES
// ============================================
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  
  const [selectedNcrId, setSelectedNcrId] = useState<string | number | null>(null);
  const [reportView, setReportView] = useState<{
    type: "5S" | "IATF" | "MANUFACTURING";
    id: string | number;
  } | null>(null);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const safeParseAnswers = useCallback((answers: any): any => {
    if (!answers) return {};
    if (typeof answers === "object") return answers;
    try {
      return JSON.parse(answers);
    } catch {
      return {};
    }
  }, []);

  const detectReportType = useCallback((r: Response): "5S" | "IATF" | "MANUFACTURING" => {
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
    if (raw.includes("MANUFACT") || raw.includes("PROCESS")) return "MANUFACTURING";
    if (raw.includes("IATF")) return "IATF";

    if (a.scores) return "5S";
    if (a.partNumber || a.machine || a.wefDate || a.revNo || a.issueDate)
      return "MANUFACTURING";
    if (a.processName || a.responses || a.observations) return "IATF";

    return "5S";
  }, [safeParseAnswers]);

  const getStatusBadge = useCallback((status?: string) => {
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
  }, []);

  const getSeverityBadge = useCallback((severity?: string) => {
    const colors: Record<string, any> = {
      CRITICAL: { bg: "#FEE2E2", text: "#DC2626" },
      MAJOR: { bg: "#FFEDD5", text: "#EA580C" },
      MINOR: { bg: "#FEF3C7", text: "#D97706" },
    };
    return colors[severity || ""] || { bg: "#F3F4F6", text: "#6B7280" };
  }, []);

  const getAuditorName = useCallback((auditorId?: string | number) => {
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
  }, [allAuditors]);

  const getFilteredSchedules = useCallback(() => {
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
  }, [allSchedules, searchTerm]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderResponseVerticalItem = useCallback((item: Response) => {
    const answers = safeParseAnswers(item.answers);
    const statusColors = getStatusBadge(item.status);
    const auditorName = getAuditorName(item.auditorId);

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: isMobile ? 10 : 12,
          marginBottom: 8,
          width: "100%",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <View style={{ flex: 2, minWidth: isMobile ? 80 : 120 }}>
            <Text style={{ fontSize: isMobile ? 10 : 11, color: "#6B7280", fontFamily: "monospace" }}>
              {answers?.documentNumber || `RES-${item.id}`}
            </Text>
            <Text style={{ fontSize: isMobile ? 12 : 14, fontWeight: "600", color: "#1F2937" }}>
              {item.department || "N/A"}
            </Text>
          </View>
          <View style={{ flex: 1.5, minWidth: isMobile ? 60 : 100 }}>
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }} numberOfLines={1}>
              {answers?.auditeeName || item.auditeeName || "N/A"}
            </Text>
            <Text style={{ fontSize: isMobile ? 9 : 11, color: "#6B7280" }} numberOfLines={1}>
              {auditorName}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? 60 : 80, alignItems: "flex-end" }}>
            <Text style={{ fontSize: isMobile ? 12 : 14, fontWeight: "600", color: "#1F2937" }}>
              {(item.percentageScore || 0).toFixed(1)}%
            </Text>
            <Badge
              text={item.status || "DRAFT"}
              bgColor={statusColors.bg}
              textColor={statusColors.text}
              size={isMobile ? "sm" : "md"}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 6, minWidth: isMobile ? 80 : 100, justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: isMobile ? 6 : 10,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 6,
                backgroundColor: "#FFFFFF",
              }}
              onPress={() => {
                onViewResponse(item);
                setReportView({ type: detectReportType(item), id: item.id });
              }}
            >
              <Icon name="eye" size={isMobile ? 12 : 14} color="#6B7280" />
              <Text style={{ fontSize: isMobile ? 9 : 11, color: "#6B7280" }}>View</Text>
            </TouchableOpacity>
            {item.status === "SUBMITTED" && (
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 4,
                  paddingHorizontal: isMobile ? 6 : 10,
                  borderWidth: 1,
                  borderColor: NAVBAR_COLORS.primary,
                  borderRadius: 6,
                  backgroundColor: NAVBAR_COLORS.primary,
                }}
                onPress={() => onReviewResponse(item)}
              >
                <Icon name="check" size={isMobile ? 12 : 14} color="#FFFFFF" />
                <Text style={{ fontSize: isMobile ? 9 : 11, color: "#FFFFFF" }}>Review</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [isMobile, safeParseAnswers, getStatusBadge, getAuditorName, onViewResponse, onReviewResponse, detectReportType]);

  const renderNCRVerticalItem = useCallback((item: NCR) => {
    const severityColors = getSeverityBadge(item.severity);
    const statusColors = getStatusBadge(item.status);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          padding: isMobile ? 10 : 12,
          marginBottom: 8,
          width: "100%",
        }}
        onPress={() => {
          onViewNCR(item);
          setSelectedNcrId(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <View style={{ flex: 2, minWidth: isMobile ? 80 : 120 }}>
            <Text style={{ fontSize: isMobile ? 10 : 11, color: "#6B7280", fontFamily: "monospace" }}>
              {item.ncrNumber || `NCR-${item.id}`}
            </Text>
            <Text style={{ fontSize: isMobile ? 12 : 14, fontWeight: "600", color: "#1F2937" }} numberOfLines={1}>
              {item.title || "Non-Conformity Report"}
            </Text>
          </View>
          <View style={{ flex: 1.5, minWidth: isMobile ? 60 : 100 }}>
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }} numberOfLines={1}>
              {item.department || "N/A"}
            </Text>
            <Text style={{ fontSize: isMobile ? 9 : 11, color: "#6B7280" }}>
              {item.createdAt
                ? format(new Date(item.createdAt), "dd-MM-yyyy")
                : "N/A"}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? 60 : 80, alignItems: "flex-end", gap: 4 }}>
            <Badge
              text={item.severity || "NCR"}
              bgColor={severityColors.bg}
              textColor={severityColors.text}
              icon="alert-circle"
              size={isMobile ? "sm" : "md"}
            />
            <Badge
              text={item.status || "OPEN"}
              bgColor={statusColors.bg}
              textColor={statusColors.text}
              size={isMobile ? "sm" : "md"}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 6, minWidth: isMobile ? 80 : 100, justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingHorizontal: isMobile ? 6 : 10,
                borderWidth: 1,
                borderColor: "#BFDBFE",
                borderRadius: 6,
                backgroundColor: "#EFF6FF",
              }}
              onPress={() => {
                onViewNCR(item);
                setSelectedNcrId(item.id);
              }}
            >
              <Icon name="eye" size={isMobile ? 12 : 14} color="#1D4ED8" />
              <Text style={{ fontSize: isMobile ? 9 : 11, color: "#1D4ED8" }}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [isMobile, getSeverityBadge, getStatusBadge, onViewNCR]);

  const renderResponseCard = useCallback((item: Response) => {
    const answers = safeParseAnswers(item.answers);
    const statusColors = getStatusBadge(item.status);
    const auditorName = getAuditorName(item.auditorId);

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          padding: isMobile ? 12 : 16,
          marginBottom: 8,
          flex: 1,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ fontSize: isMobile ? 10 : 11, color: "#6B7280", fontFamily: "monospace" }}>
            {answers?.documentNumber || `RES-${item.id}`}
          </Text>
          <Badge
            text={item.status || "DRAFT"}
            bgColor={statusColors.bg}
            textColor={statusColors.text}
            size={isMobile ? "sm" : "md"}
          />
        </View>
        <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "600", color: "#1F2937" }}>
          {item.department || "N/A"}
        </Text>
        <Text style={{ fontSize: isMobile ? 11 : 12, color: "#6B7280", marginTop: 2 }}>
          Auditee: {answers?.auditeeName || item.auditeeName || "N/A"}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          <Text style={{ fontSize: isMobile ? 11 : 12, color: "#6B7280" }}>
            Score: <Text style={{ fontWeight: "600", color: "#1F2937" }}>{(item.percentageScore || 0).toFixed(1)}%</Text>
          </Text>
          <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }}>Auditor: {auditorName}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          <TouchableOpacity
            style={{
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
            }}
            onPress={() => {
              onViewResponse(item);
              setReportView({ type: detectReportType(item), id: item.id });
            }}
          >
            <Icon name="eye" size={isMobile ? 12 : 14} color="#6B7280" />
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }}>View</Text>
          </TouchableOpacity>
          {item.status === "SUBMITTED" && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: NAVBAR_COLORS.primary,
                borderRadius: 6,
                backgroundColor: NAVBAR_COLORS.primary,
              }}
              onPress={() => onReviewResponse(item)}
            >
              <Icon name="check" size={isMobile ? 12 : 14} color="#FFFFFF" />
              <Text style={{ fontSize: isMobile ? 10 : 12, color: "#FFFFFF" }}>Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [isMobile, safeParseAnswers, getStatusBadge, getAuditorName, onViewResponse, onReviewResponse, detectReportType]);

  const renderNCRCard = useCallback((item: NCR) => {
    const severityColors = getSeverityBadge(item.severity);
    const statusColors = getStatusBadge(item.status);

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          padding: isMobile ? 12 : 16,
          marginBottom: 8,
          flex: 1,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            onViewNCR(item);
            setSelectedNcrId(item.id);
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
            <Badge
              text={item.severity || "NCR"}
              bgColor={severityColors.bg}
              textColor={severityColors.text}
              icon="alert-circle"
              size={isMobile ? "sm" : "md"}
            />
            <Badge
              text={item.status || "OPEN"}
              bgColor={statusColors.bg}
              textColor={statusColors.text}
              size={isMobile ? "sm" : "md"}
            />
          </View>
          <Text style={{ fontSize: isMobile ? 13 : 14, fontWeight: "600", color: "#1F2937" }}>
            {item.ncrNumber || `NCR-${item.id}`}
          </Text>
          <Text style={{ fontSize: isMobile ? 11 : 12, color: "#4B5563", marginTop: 4, marginBottom: 8, lineHeight: 16 }} numberOfLines={2}>
            {item.title || "Non-Conformity Report"}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }}>Dept: {item.department || "N/A"}</Text>
            <Text style={{ fontSize: isMobile ? 10 : 12, color: "#6B7280" }}>
              {item.createdAt
                ? format(new Date(item.createdAt), "dd-MM-yyyy")
                : "N/A"}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
          <TouchableOpacity
            style={{
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
            }}
            onPress={() => {
              onViewNCR(item);
              setSelectedNcrId(item.id);
            }}
          >
            <Icon name="eye" size={isMobile ? 12 : 14} color="#1D4ED8" />
            <Text style={{ fontSize: isMobile ? 10 : 12, fontWeight: "600", color: "#1D4ED8" }}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [isMobile, getSeverityBadge, getStatusBadge, onViewNCR]);

  // ============================================
  // NCR PREVIEW
  // ============================================
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

  // ============================================
  // CHECK SHEET REPORT PREVIEW
  // ============================================
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
  // AUDITS TAB
  // ============================================
  if (activeTab === "audits") {
    const scheduledAudits = getFilteredSchedules();

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 }}>
            <Icon name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: "#1F2937" }}
              placeholder="Search audits by department or auditee..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {scheduledAudits.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Icon name="calendar" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginTop: 12 }}>No Scheduled Audits</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
              {searchTerm
                ? `No scheduled audits match "${searchTerm}"`
                : "No audits have been scheduled"}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, overflow: "hidden", padding: isMobile ? 12 : 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: isMobile ? 600 : 800 }}>
                <View style={{ flexDirection: "row", backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 8 }}>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 60 : 80 }}>Department</Text>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 80 : 100 }}>Auditor(s)</Text>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 60 : 80 }}>Auditee</Text>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 80 : 120 }}>Date & Time</Text>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 60 : 80 }}>Status</Text>
                  <Text style={{ fontSize: isMobile ? 10 : 11, fontWeight: "600", color: "#6B7280", paddingHorizontal: 4, width: isMobile ? 50 : 60 }}>Overdue</Text>
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
                    <View key={String(s.id)} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: "#1F2937", paddingHorizontal: 4, width: isMobile ? 60 : 80 }} numberOfLines={1}>{s.department || "N/A"}</Text>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: "#1F2937", paddingHorizontal: 4, width: isMobile ? 80 : 100 }} numberOfLines={1}>{auditorDisplay}</Text>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: "#1F2937", paddingHorizontal: 4, width: isMobile ? 60 : 80 }} numberOfLines={1}>{s.auditeeName || "N/A"}</Text>
                      <Text style={{ fontSize: isMobile ? 10 : 11, color: "#1F2937", paddingHorizontal: 4, width: isMobile ? 80 : 120 }} numberOfLines={1}>{formatDateTime()}</Text>
                      <View style={{ paddingHorizontal: 4, width: isMobile ? 60 : 80 }}>
                        <Badge
                          text={s.status || "DRAFT"}
                          bgColor={statusColors.bg}
                          textColor={statusColors.text}
                          size="sm"
                        />
                      </View>
                      <View style={{ paddingHorizontal: 4, width: isMobile ? 50 : 60 }}>
                        {isOverdue ? (
                          <Badge
                            text="Overdue"
                            bgColor="#EF4444"
                            textColor="#FFFFFF"
                            icon="alert-circle"
                            size="sm"
                          />
                        ) : (
                          <Text style={{ color: "#9CA3AF" }}>—</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  // ============================================
  // RESPONSES TAB
  // ============================================
  if (activeTab === "responses") {
    const filteredResponses = allResponses.filter((r) => {
      if (!searchTerm) return true;
      const answers = safeParseAnswers(r.answers);
      return (
        r.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.auditeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        answers?.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 }}>
            <Icon name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: "#1F2937" }}
              placeholder="Search responses..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 2 }}>
            <TouchableOpacity
              style={{ padding: 8, borderRadius: 6, backgroundColor: responseViewMode === "grid" ? NAVBAR_COLORS.primary : "transparent" }}
              onPress={() => setResponseViewMode("grid")}
            >
              <Icon name="grid" size={16} color={responseViewMode === "grid" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, borderRadius: 6, backgroundColor: responseViewMode === "list" ? NAVBAR_COLORS.primary : "transparent" }}
              onPress={() => setResponseViewMode("list")}
            >
              <Icon name="list" size={16} color={responseViewMode === "list" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FFFFFF", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#1F2937" }}>{allResponses.length}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#6B7280", marginTop: 2 }}>Total</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#D1FAE5", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#059669" }}>{stats.responsesApproved}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#059669", marginTop: 2 }}>APPROVED</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FEE2E2", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#DC2626" }}>{stats.responsesRejected}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#DC2626", marginTop: 2 }}>REJECTED</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FEF3C7", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#D97706" }}>{stats.responsesSubmitted}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#D97706", marginTop: 2 }}>SUBMITTED</Text>
          </View>
        </View>

        {filteredResponses.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Icon name="file-text" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginTop: 12 }}>No responses found</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
              No check sheet responses match your search
            </Text>
          </View>
        ) : responseViewMode === "grid" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {filteredResponses.map((item) => (
              <View
                key={String(item.id)}
                style={isMobile ? { width: "100%" } : isTablet ? { width: "47%" } : { width: "31%" }}
              >
                {renderResponseCard(item)}
              </View>
            ))}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 16 }}>
            {filteredResponses.map((item) => (
              <View key={String(item.id)} style={{ width: "100%", marginBottom: 4 }}>
                {renderResponseVerticalItem(item)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ============================================
  // NCRS TAB
  // ============================================
  if (activeTab === "ncrs") {
    const filteredNCRs = allNCRs.filter((n) => {
      if (!searchTerm) return true;
      return (
        n.ncrNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const criticalCount = allNCRs.filter((n) => n.severity === "CRITICAL").length;
    const majorCount = allNCRs.filter((n) => n.severity === "MAJOR").length;
    const minorCount = allNCRs.filter((n) => n.severity === "MINOR").length;
    const openCount = allNCRs.filter((n) => n.status === "OPEN" || n.status === "IN_PROGRESS").length;
    const closedCount = allNCRs.filter((n) => n.status === "CLOSED").length;

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12 }}>
            <Icon name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: "#1F2937" }}
              placeholder="Search NCRs..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 2 }}>
            <TouchableOpacity
              style={{ padding: 8, borderRadius: 6, backgroundColor: ncrViewMode === "grid" ? NAVBAR_COLORS.primary : "transparent" }}
              onPress={() => setNcrViewMode("grid")}
            >
              <Icon name="grid" size={16} color={ncrViewMode === "grid" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, borderRadius: 6, backgroundColor: ncrViewMode === "list" ? NAVBAR_COLORS.primary : "transparent" }}
              onPress={() => setNcrViewMode("list")}
            >
              <Icon name="list" size={16} color={ncrViewMode === "list" ? "#FFFFFF" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FFFFFF", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#1F2937" }}>{allNCRs.length}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#6B7280", marginTop: 2 }}>Total NCRs</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FEE2E2", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#DC2626" }}>{criticalCount}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#DC2626", marginTop: 2 }}>Critical</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FFEDD5", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#EA580C" }}>{majorCount}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#EA580C", marginTop: 2 }}>Major</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#FEF3C7", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#D97706" }}>{minorCount}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#D97706", marginTop: 2 }}>Minor</Text>
          </View>
          <View style={{ flex: 1, minWidth: isMobile ? "30%" : "18%", backgroundColor: "#EDE9FE", borderRadius: 8, padding: isMobile ? 8 : 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: "bold", color: "#7C3AED" }}>{openCount}</Text>
            <Text style={{ fontSize: isMobile ? 8 : 10, color: "#7C3AED", marginTop: 2 }}>Open / In Progress</Text>
          </View>
        </View>

        {allNCRs.length > 0 && (
          <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: isMobile ? 12 : 16, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: isMobile ? 11 : 12, fontWeight: "500", color: "#6B7280" }}>Closure Progress</Text>
              <Text style={{ fontSize: isMobile ? 11 : 12, fontWeight: "500", color: "#6B7280" }}>
                {Math.round((closedCount / allNCRs.length) * 100)}% Closed
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${(closedCount / allNCRs.length) * 100}%`, backgroundColor: "#10B981", borderRadius: 4 }} />
            </View>
          </View>
        )}

        {filteredNCRs.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB" }}>
            <Icon name="alert-triangle" size={40} color="#CBD5E1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginTop: 12 }}>No NCRs found</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
              {leadAuditorDepartment
                ? `No non-conformity reports found for ${leadAuditorDepartment} department`
                : "No non-conformity reports match your search"}
            </Text>
          </View>
        ) : ncrViewMode === "grid" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {filteredNCRs.map((item) => (
              <View
                key={String(item.id)}
                style={isMobile ? { width: "100%" } : isTablet ? { width: "47%" } : { width: "31%" }}
              >
                {renderNCRCard(item)}
              </View>
            ))}
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 16 }}>
            {filteredNCRs.map((item) => (
              <View key={String(item.id)} style={{ width: "100%", marginBottom: 4 }}>
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

export default AuditsAndResponses;