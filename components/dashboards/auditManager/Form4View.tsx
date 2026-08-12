import YearFilter from "@/components/common/YearFilter"; // Add this line
import { apiClient } from "@/services/api"; // Adjust path if needed
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Filter,
  MessageSquare,
  Plus,
  RefreshCw,
  Repeat,
  Save,
  Send,
  Star,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext"; // Adjust path if needed

import { API_BASE_URL } from "@/config/apiConfig";
import * as FileSystem from "expo-file-system/legacy"; // Required for mobile file saving
import * as Sharing from "expo-sharing"; // Required for mobile share sheet


// ══════ MNC STANDARD PALETTE ══════
const COLORS = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textValue: "#1E293B",
  textSub: "#64748B",
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",
  dangerBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

// ══════ GLOBAL CONSTANTS & HELPERS ══════
const departments = [
  "HR",
  "R&D",
  "Purchase",
  "RMS",
  "SQA",
  "PPC",
  "Production",
  "QA/QC",
  "FGS",
  "Marketing",
  "IMS (BE)",
  "Maintenance",
  "Management",
];
const months = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];
const monthDisplay: Record<string, string> = {
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
  Jan: "January",
  Feb: "February",
  Mar: "March",
};

const getQuarter = (month: string) => {
  const quarters: Record<string, string> = {
    Apr: "Q1",
    May: "Q1",
    Jun: "Q1",
    Jul: "Q2",
    Aug: "Q2",
    Sep: "Q2",
    Oct: "Q3",
    Nov: "Q3",
    Dec: "Q3",
    Jan: "Q4",
    Feb: "Q4",
    Mar: "Q4",
  };
  return quarters[month] || "";
};

const getAuditElementsForMonth = (month: string) => {
  const elementMapping: Record<string, string[]> = {
    Apr: ["5S Audit", "System Audit (ISO9001)"],
    May: ["System Audit (IATF16949)", "Process Audit"],
    Jun: ["System Audit (IATF16949)", "5S Audit", "Product Audit"],
    Jul: ["5S Audit", "System Audit (IATF16949)"],
    Aug: ["Process Audit", "Product Audit"],
    Sep: ["System Audit (ISO9001)", "5S Audit"],
    Oct: ["System Audit (IATF16949)", "Process Audit"],
    Nov: ["Product Audit", "System Audit (ISO9001)"],
    Dec: ["5S Audit", "System Audit (IATF16949)"],
    Jan: ["Process Audit", "Product Audit"],
    Feb: ["System Audit (ISO9001)", "5S Audit"],
    Mar: ["System Audit (IATF16949)", "Process Audit", "Product Audit"],
  };
  return elementMapping[month] || [];
};

const isRelevantForDemo = (auditElement: string) =>
  auditElement.includes("IATF16949") || auditElement.includes("5S Audit");

const formatLocalDateTime = (utcDateStr: string | null) => {
  if (!utcDateStr) return "-";
  const date = new Date(utcDateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ══════ TYPES ══════
interface MonthData {
  month: string;
  status: string;
  selectedElements: string[];
}
interface DeptData {
  department: string;
  months: MonthData[];
}
interface PlanInfo {
  preparedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  preparedByPosition: string;
  approvedByPosition: string;
  approvalComments: string;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string;
}
interface Form4ViewProps {
  year?: number;
  onBack?: () => void;
}

// ══════ REUSABLE COMPONENTS ══════
const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>{children}</View>
);

const ActionButton = ({
  onPress,
  disabled,
  loading,
  color,
  bgColor,
  borderColor,
  icon: Icon,
  children,
}: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      styles.actionButton,
      {
        backgroundColor: disabled || loading ? "#F1F5F9" : bgColor,
        borderColor:
          disabled || loading ? "#E2E8F0" : borderColor || "transparent",
      },
    ]}
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} />
    ) : Icon ? (
      <Icon size={16} color={disabled || loading ? "#94A3B8" : color} />
    ) : null}
    <Text
      style={[
        styles.actionButtonText,
        { color: disabled || loading ? "#94A3B8" : color },
      ]}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

const AlertBanner = ({ type, title, message, footer, icon: Icon }: any) => {
  const stylesMap: any = {
    error: {
      bg: COLORS.dangerLight,
      border: COLORS.dangerBorder,
      color: "#991B1B",
      iconColor: "#DC2626",
    },
    warning: {
      bg: COLORS.warningLight,
      border: COLORS.warningBorder,
      color: "#92400E",
      iconColor: "#D97706",
    },
    success: {
      bg: COLORS.successLight,
      border: COLORS.successBorder,
      color: "#065F46",
      iconColor: "#059669",
    },
  };
  const s = stylesMap[type] || stylesMap.error;
  return (
    <View
      style={[
        styles.alertBanner,
        { backgroundColor: s.bg, borderColor: s.border },
      ]}
    >
      <Icon size={20} color={s.iconColor} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.alertTitle, { color: s.color }]}>{title}</Text>
        <Text style={[styles.alertMessage, { color: s.color }]}>{message}</Text>
        {footer && (
          <Text style={[styles.alertFooter, { color: s.color }]}>{footer}</Text>
        )}
      </View>
    </View>
  );
};

const ActionModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  iconBorder,
  value,
  setValue,
  placeholder,
  onSubmit,
  submitLabel,
  submitBg,
  submitting,
}: any) => {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIconBox,
                { backgroundColor: iconBg, borderColor: iconBorder },
              ]}
            >
              <Icon size={22} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalDesc}>{description}</Text>
            </View>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={styles.modalInput}
              value={value}
              onChangeText={setValue}
              multiline
              numberOfLines={5}
              placeholder={placeholder}
              textAlignVertical="top"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.modalFooter}>
            <ActionButton
              onPress={onClose}
              color={COLORS.textValue}
              bgColor={COLORS.card}
              borderColor={COLORS.border}
            >
              Cancel
            </ActionButton>
            <ActionButton
              onPress={onSubmit}
              disabled={!value.trim()}
              loading={submitting}
              color="#FFF"
              bgColor={submitBg}
              icon={Icon}
            >
              {submitLabel}
            </ActionButton>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const ElementSelectionModal = ({
  isOpen,
  onClose,
  month,
  availableElements,
  selectedElements,
  onSave,
}: any) => {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    setTempSelected([...(selectedElements || [])]);
  }, [selectedElements, isOpen]);
  if (!isOpen) return null;

  const availableNotSelected = availableElements.filter(
    (el: string) => !tempSelected.includes(el),
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: "85%" }]}>
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIconBox,
                {
                  backgroundColor: COLORS.purpleLight,
                  borderColor: COLORS.purpleBorder,
                },
              ]}
            >
              <CheckSquare size={22} color={COLORS.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Select Audit Elements</Text>
              <Text style={styles.modalDesc}>For {monthDisplay[month]}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {tempSelected.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.label}>
                  Selected Elements ({tempSelected.length})
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {tempSelected.map((el: string) => (
                    <View
                      key={el}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: COLORS.successLight,
                          borderColor: COLORS.successBorder,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#065F46",
                          fontWeight: "600",
                        }}
                      >
                        {el}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setTempSelected(tempSelected.filter((e) => e !== el))
                        }
                      >
                        <X
                          size={12}
                          color="#065F46"
                          style={{ marginLeft: 4 }}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {availableNotSelected.length > 0 && (
              <View>
                <Text style={styles.label}>Add More Elements</Text>
                {availableNotSelected.map((el: string) => (
                  <TouchableOpacity
                    key={el}
                    onPress={() => setTempSelected([...tempSelected, el])}
                    style={styles.selectItem}
                  >
                    <Text style={styles.selectItemText}>{el}</Text>
                    <Plus size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {availableElements.length === 0 && (
              <View style={{ padding: 24, alignItems: "center" }}>
                <AlertCircle
                  size={32}
                  color={COLORS.textSub}
                  style={{ opacity: 0.5, marginBottom: 8 }}
                />
                <Text style={{ fontSize: 14, color: COLORS.textSub }}>
                  No audit elements planned for this month
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <ActionButton
              onPress={onClose}
              color={COLORS.textValue}
              bgColor={COLORS.card}
              borderColor={COLORS.border}
            >
              Cancel
            </ActionButton>
            <ActionButton
              onPress={() => {
                onSave(tempSelected);
                onClose();
              }}
              color="#FFF"
              bgColor={COLORS.purple}
              icon={CheckSquare}
            >
              Save Elements
            </ActionButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ══════ MAIN COMPONENT ══════
export default function Form4View({ year: propYear, onBack }: Form4ViewProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuditManager, isTopManagement } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const [planData, setPlanData] = useState<DeptData[]>([]);
  const [planStatus, setPlanStatus] = useState("DRAFT");
  const [rejectionReason, setRejectionReason] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);

  const [tempApprovalComment, setTempApprovalComment] = useState("");
  const [tempRejectionReason, setTempRejectionReason] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [auditFrequency, setAuditFrequency] = useState("Half yearly");
  const [documentRevision, setDocumentRevision] = useState("1.0");
  const [revisionDate, setRevisionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [revisionDetails, setRevisionDetails] = useState(
    "First Approved copy (IATF16949)",
  );

  const [auditElementsFromForm3, setAuditElementsFromForm3] = useState<
    Record<string, string[]>
  >({});
  const [expandedDept, setExpandedDept] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm3Details, setShowForm3Details] = useState(true);
  const [selectedMonthForElements, setSelectedMonthForElements] = useState<{
    deptIndex: number;
    month: string;
  } | null>(null);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  }, []);

  const urlYear = params?.year ? parseInt(params.year as string) : null;
  const [selectedYear, setSelectedYear] = useState<number>(
    Number(propYear) || Number(urlYear) || new Date().getFullYear(),
  );

  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    preparedBy: "",
    approvedBy: "",
    approvedAt: null,
    preparedByPosition: "Audit Manager",
    approvedByPosition: "Top Management",
    approvalComments: "",
    rejectedBy: "",
    rejectedAt: null,
    rejectionReason: "",
  });

  // ─── HANDLERS ──────────────────────────────────────────────────────────────

  const handleQuickPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan in its current status", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      let totalPlannedCount = 0,
        totalElementsAdded = 0;
      const firstQuarterMonths = ["Apr", "May", "Jun"];

      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          if (firstQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth =
              auditElementsFromForm3[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter((el) =>
              isRelevantForDemo(el),
            );
            if (relevantElements.length > 0) {
              if (month.status !== "PLANNED") {
                month.status = "PLANNED";
                totalPlannedCount++;
              }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(
                (el) => !currentElements.includes(el),
              );
              if (newElements.length > 0) {
                month.selectedElements = [...currentElements, ...newElements];
                totalElementsAdded += newElements.length;
              }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(
        `✅ Quick plan: Updated ${totalPlannedCount} Q1 months with ${totalElementsAdded} elements`,
      );
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync with Form3 data", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const handlePlanCurrentQuarter = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      const currentMonth = new Date().toLocaleString("default", {
        month: "short",
      });
      let currentQuarterMonths = [];
      if (["Apr", "May", "Jun"].includes(currentMonth))
        currentQuarterMonths = ["Apr", "May", "Jun"];
      else if (["Jul", "Aug", "Sep"].includes(currentMonth))
        currentQuarterMonths = ["Jul", "Aug", "Sep"];
      else if (["Oct", "Nov", "Dec"].includes(currentMonth))
        currentQuarterMonths = ["Oct", "Nov", "Dec"];
      else currentQuarterMonths = ["Jan", "Feb", "Mar"];

      let totalPlannedCount = 0,
        totalElementsAdded = 0;

      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          if (currentQuarterMonths.includes(month.month)) {
            const form3ElementsForMonth =
              auditElementsFromForm3[month.month] || [];
            const relevantElements = form3ElementsForMonth.filter((el) =>
              isRelevantForDemo(el),
            );
            if (relevantElements.length > 0) {
              if (month.status !== "PLANNED") {
                month.status = "PLANNED";
                totalPlannedCount++;
              }
              const currentElements = month.selectedElements || [];
              const newElements = relevantElements.filter(
                (el) => !currentElements.includes(el),
              );
              if (newElements.length > 0) {
                month.selectedElements = [...currentElements, ...newElements];
                totalElementsAdded += newElements.length;
              }
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(`✅ Current quarter sync: Updated ${totalPlannedCount} months`);
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDemoPlanned = async () => {
    if (!canEdit) {
      addToast("You cannot modify this plan", "warning");
      return;
    }
    setDemoLoading(true);
    try {
      const newPlanData = JSON.parse(JSON.stringify(planData));
      let totalPlannedCount = 0,
        totalElementsAdded = 0;

      newPlanData.forEach((dept: DeptData) => {
        dept.months.forEach((month: MonthData) => {
          const form3ElementsForMonth =
            auditElementsFromForm3[month.month] || [];
          const relevantElements = form3ElementsForMonth.filter((el) =>
            isRelevantForDemo(el),
          );
          if (relevantElements.length > 0) {
            if (month.status !== "PLANNED") {
              month.status = "PLANNED";
              totalPlannedCount++;
            }
            const currentElements = month.selectedElements || [];
            const newElements = relevantElements.filter(
              (el) => !currentElements.includes(el),
            );
            if (newElements.length > 0) {
              month.selectedElements = [...currentElements, ...newElements];
              totalElementsAdded += newElements.length;
            }
          }
        });
      });
      setPlanData(newPlanData);
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: newPlanData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast(
        `✅ Synced ${totalPlannedCount} months with ${totalElementsAdded} elements from Form3`,
      );
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to sync with Form3 data", "error");
    } finally {
      setDemoLoading(false);
    }
  };

  const fetchForm3Data = async () => {
    try {
      const response = await apiClient.get(`/api/audit-plan/${selectedYear}`);
      const data = response.data || response;
      const elementsByMonth: Record<string, string[]> = {};
      months.forEach((month) => {
        elementsByMonth[month] = [];
      });
      if (data?.planItems) {
        data.planItems.forEach((element: any) => {
          if (element?.months) {
            element.months.forEach((monthData: any) => {
              if (monthData?.status === "PLANNED" && monthData?.month) {
                if (
                  !elementsByMonth[monthData.month].includes(
                    element.auditElement,
                  )
                ) {
                  elementsByMonth[monthData.month].push(element.auditElement);
                }
              }
            });
          }
        });
      }
      setAuditElementsFromForm3(elementsByMonth);
    } catch (error) {
      const emptyElements: Record<string, string[]> = {};
      months.forEach((month) => {
        emptyElements[month] = [];
      });
      setAuditElementsFromForm3(emptyElements);
    }
  };

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/api/department-plan/${selectedYear}`,
      );
      const data = response.data || response;
      if (data?.planItems?.length > 0) {
        setPlanData(data.planItems);
        setPlanStatus(data.approvalStatus || "DRAFT");
        setPlanInfo({
          preparedBy: data.preparedBy || user?.name || user?.username || "",
          approvedBy: data.approvedBy || "",
          approvedAt: data.approvedAt || null,
          preparedByPosition: "Audit Manager",
          approvedByPosition: "Top Management",
          approvalComments: data.approvalComments || "",
          rejectedBy: data.rejectedBy || "",
          rejectedAt: data.rejectedAt || null,
          rejectionReason: data.rejectionReason || "",
        });
        setRejectionReason(data.rejectionReason || "");
        setAuditFrequency(data.auditFrequency || "Half yearly");
        setDocumentRevision(data.documentRevision || "1.0");
        setRevisionDate(
          data.revisionDate || new Date().toISOString().split("T")[0],
        );
        setRevisionDetails(
          data.revisionDetails || "First Approved copy (IATF16949)",
        );
      } else {
        const emptyPlanData = departments.map((dept) => ({
          department: dept,
          months: months.map((month) => ({
            month,
            status: "",
            selectedElements: [],
          })),
        }));
        setPlanData(emptyPlanData);
        setPlanStatus("DRAFT");
        setPlanInfo({
          preparedBy: user?.name || user?.username || "",
          approvedBy: "",
          approvedAt: null,
          preparedByPosition: "Audit Manager",
          approvedByPosition: "Top Management",
          approvalComments: "",
          rejectedBy: "",
          rejectedAt: null,
          rejectionReason: "",
        });
      }
    } catch (error) {
      addToast("Failed to load department plan data", "error");
      const emptyPlanData = departments.map((dept) => ({
        department: dept,
        months: months.map((month) => ({
          month,
          status: "",
          selectedElements: [],
        })),
      }));
      setPlanData(emptyPlanData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchForm3Data();
      await fetchPlanData();
    };
    loadData();
  }, [selectedYear]);

  const handleAddElementsToMonth = (
    deptIndex: number,
    month: string,
    elements: string[],
  ) => {
    if (!canEdit) {
      addToast("Only draft or rejected plans can be modified", "warning");
      return;
    }
    const newPlanData = JSON.parse(JSON.stringify(planData));
    const monthIndex = newPlanData[deptIndex].months.findIndex(
      (m: MonthData) => m.month === month,
    );
    if (monthIndex !== -1) {
      const updatedSelected = [
        ...new Set([
          ...(newPlanData[deptIndex].months[monthIndex].selectedElements || []),
          ...elements,
        ]),
      ];
      newPlanData[deptIndex].months[monthIndex].selectedElements =
        updatedSelected;
      if (
        updatedSelected.length > 0 &&
        newPlanData[deptIndex].months[monthIndex].status === ""
      )
        newPlanData[deptIndex].months[monthIndex].status = "PLANNED";
      setPlanData(newPlanData);
      setSelectedMonthForElements(null);
      addToast(`Added ${elements.length} element(s) to ${monthDisplay[month]}`);
    }
  };

  const handleMonthStatusChange = (deptIndex: number, month: string) => {
    if (!canEdit) {
      addToast("Only draft or rejected plans can be modified", "warning");
      return;
    }
    const newPlanData = JSON.parse(JSON.stringify(planData));
    const monthIndex = newPlanData[deptIndex].months.findIndex(
      (m: MonthData) => m.month === month,
    );
    if (monthIndex !== -1) {
      const currentStatus =
        newPlanData[deptIndex].months[monthIndex].status || "";
      const hasElements =
        newPlanData[deptIndex].months[monthIndex].selectedElements?.length > 0;
      if (!hasElements && currentStatus === "") {
        addToast("Please select audit elements first", "warning");
        return;
      }
      let newStatus =
        currentStatus === ""
          ? "PLANNED"
          : currentStatus === "PLANNED"
            ? "COMPLETED"
            : currentStatus === "COMPLETED"
              ? "RESCHEDULED"
              : "";
      newPlanData[deptIndex].months[monthIndex].status = newStatus;
      setPlanData(newPlanData);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      addToast(
        "Only draft, rejected, or change requested plans can be saved",
        "warning",
      );
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: "DRAFT",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      addToast("Department audit plan saved as DRAFT!");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    let hasPlanned = false;
    planData.forEach((dept) =>
      dept.months.forEach((month) => {
        if (month.status === "PLANNED") hasPlanned = true;
      }),
    );
    if (!hasPlanned) {
      addToast(
        "Please mark at least one department-month as PLANNED",
        "warning",
      );
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/api/department-plan/save?userId=${user?.id}`, {
        planYear: selectedYear,
        planItems: planData,
        approvalStatus: "PENDING_APPROVAL",
        auditFrequency,
        documentRevision,
        revisionDate,
        revisionDetails,
        preparedBy: planInfo.preparedBy,
      });
      await apiClient.post(
        `/api/department-plan/${selectedYear}/submit?userId=${user?.id}`,
        {},
      );
      addToast("Plan submitted for approval successfully!");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to submit plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!tempApprovalComment.trim()) {
      addToast("Please provide approval comments", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/department-plan/${selectedYear}/approve?userId=${user?.id}`,
        { comments: tempApprovalComment },
      );
      setPlanStatus("APPROVED");
      setPlanInfo((prev) => ({
        ...prev,
        approvalComments: tempApprovalComment,
        approvedBy: user?.name || user?.username || "",
        approvedAt: new Date().toISOString(),
      }));
      setShowApproveModal(false);
      setTempApprovalComment("");
      addToast("Plan approved successfully!");
      fetchPlanData();
    } catch (error) {
      addToast("Failed to approve plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!tempRejectionReason.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/department-plan/${selectedYear}/reject?userId=${user?.id}`,
        { reason: tempRejectionReason },
      );
      setPlanStatus("REJECTED");
      setRejectionReason(tempRejectionReason);
      setPlanInfo((prev) => ({
        ...prev,
        rejectionReason: tempRejectionReason,
        rejectedBy: user?.name || user?.username || "",
        rejectedAt: new Date().toISOString(),
      }));
      setShowRejectModal(false);
      setTempRejectionReason("");
      addToast("Plan rejected", "warning");
      fetchPlanData();
    } catch (error) {
      addToast("Failed to reject plan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequestReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/department-plan/${selectedYear}/request-changes?userId=${user?.id}`,
        { reason: changeRequestReason },
      );
      addToast(`Change request submitted for ${selectedYear}`, "warning");
      setShowChangeRequestModal(false);
      setChangeRequestReason("");
      await fetchPlanData();
    } catch (error) {
      addToast("Failed to submit change request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const fileName = `Form4_Internal_Quality_Audit_Plan_${selectedYear}.pdf`;
      const endpoint = `${API_BASE_URL}/api/department-plan/${selectedYear}/download`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }

      const blob = await response.blob();

      // WEB BROWSER
      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addToast("PDF downloaded successfully!", "success");
      }
      // NATIVE MOBILE (iOS / Android)
      else {
        const directory =
          FileSystem.documentDirectory || FileSystem.cacheDirectory;
        const fileUri = `${directory}${fileName}`;

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64data = reader.result as string;
            const base64Content = base64data.split(",")[1];

            await FileSystem.writeAsStringAsync(fileUri, base64Content, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(fileUri, {
                mimeType: "application/pdf",
                dialogTitle: "Form 4 Internal Quality Audit Plan",
              });
              addToast("PDF ready to view/share!", "success");
            } else {
              addToast("PDF saved to device storage.", "success");
            }
          } catch (saveError: any) {
            console.error("Error saving PDF:", saveError);
            addToast(`Failed to save PDF: ${saveError.message}`, "error");
          } finally {
            setDownloadingPdf(false);
          }
        };
        reader.onerror = () => {
          addToast("Failed to read PDF data", "error");
          setDownloadingPdf(false);
        };
        reader.readAsDataURL(blob);
        return; // Exit early, the reader.onloadend handles the rest
      }
    } catch (error: any) {
      console.error("PDF Download Error:", error);
      addToast(error?.message || "Failed to download PDF", "error");
    } finally {
      if (Platform.OS === "web") {
        setDownloadingPdf(false);
      }
    }
  };

  // Helper function to trigger the native share sheet
  const shareFileOnMobile = async (uri: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Form 4 Internal Quality Audit Plan",
        UTI: "com.adobe.pdf", // Helps iOS recognize the file type
      });
      addToast("PDF ready to view/share!", "success");
    } else {
      addToast("PDF saved to device storage.", "success");
    }
  };

  const getMonthStatusBadge = (status: string, hasElements: boolean) => {
    const baseStyle: ViewStyle = {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
    };

    if (status === "COMPLETED")
      return (
        <View
          style={[
            baseStyle,
            {
              backgroundColor: COLORS.successLight,
              borderColor: COLORS.successBorder,
            },
          ]}
        >
          <Check size={14} color={COLORS.success} />
        </View>
      );
    if (status === "PLANNED")
      return (
        <View
          style={[
            baseStyle,
            {
              backgroundColor: COLORS.primaryLight,
              borderColor: COLORS.primaryBorder,
            },
          ]}
        >
          <Clock size={14} color={COLORS.primary} />
        </View>
      );
    if (status === "RESCHEDULED")
      return (
        <View
          style={[
            baseStyle,
            {
              backgroundColor: COLORS.warningLight,
              borderColor: COLORS.warningBorder,
            },
          ]}
        >
          <Repeat size={14} color={COLORS.warning} />
        </View>
      );

    return (
      <View
        style={[
          baseStyle,
          {
            backgroundColor: "#F1F5F9",
            borderColor: hasElements ? COLORS.warning : COLORS.border,
            borderStyle: hasElements ? "dashed" : "solid",
          },
        ]}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#94A3B8" }}>
          —
        </Text>
      </View>
    );
  };

  const getPlanStatusBadge = () => {
    const stylesMap: any = {
      APPROVED: {
        bg: COLORS.successLight,
        color: "#065F46",
        border: COLORS.successBorder,
        text: "Approved",
        icon: CheckCircle,
      },
      PENDING_APPROVAL: {
        bg: COLORS.warningLight,
        color: "#92400E",
        border: COLORS.warningBorder,
        text: "Pending",
        icon: Clock,
      },
      REJECTED: {
        bg: COLORS.dangerLight,
        color: "#991B1B",
        border: COLORS.dangerBorder,
        text: "Rejected",
        icon: X,
      },
      CHANGE_REQUESTED: {
        bg: "#FFF7ED",
        color: "#9A3412",
        border: "#FED7AA",
        text: "Changes Req.",
        icon: MessageSquare,
      },
    };
    const s = stylesMap[planStatus] || {
      bg: "#F1F5F9",
      color: "#475569",
      border: "#E2E8F0",
      text: "Draft",
      icon: FileText,
    };
    const Icon = s.icon;
    return (
      <View
        style={[
          styles.planStatusBadge,
          { backgroundColor: s.bg, borderColor: s.border },
        ]}
      >
        <Icon size={12} color={s.color} />
        <Text style={[styles.planStatusText, { color: s.color }]}>
          {s.text}
        </Text>
      </View>
    );
  };

  const getAvailableElementsForMonth = (month: string) =>
    auditElementsFromForm3[month] || getAuditElementsForMonth(month);

  let totalPlanned = 0,
    totalCompleted = 0,
    totalRescheduled = 0;
  if (planData && planData.length > 0) {
    planData.forEach((dept) => {
      if (dept?.months) {
        dept.months.forEach((month) => {
          if (month.status === "PLANNED") totalPlanned++;
          if (month.status === "COMPLETED") totalCompleted++;
          if (month.status === "RESCHEDULED") totalRescheduled++;
        });
      }
    });
  }

  const canEdit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED");
  const canSubmit =
    isAuditManager &&
    (planStatus === "DRAFT" ||
      planStatus === "REJECTED" ||
      planStatus === "CHANGE_REQUESTED") &&
    totalPlanned > 0;
  const canApprove = isTopManagement && planStatus === "PENDING_APPROVAL";

  const filteredDepartments = planData.filter((dept) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "planned")
      return dept.months.some((m) => m.status === "PLANNED");
    if (filterStatus === "completed")
      return dept.months.some((m) => m.status === "COMPLETED");
    if (filterStatus === "rescheduled")
      return dept.months.some((m) => m.status === "RESCHEDULED");
    if (filterStatus === "pending")
      return dept.months.some((m) => m.status === "");
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading department plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ FIXED HEADER - Matches Form3View & UserManagement Look */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-200">
        <View
          style={
            isDesktop
              ? { maxWidth: 1400, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          {/* Top Row: Back, Icon, Title */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-4">
              {/* Back Button */}
              <TouchableOpacity
                onPress={onBack || (() => router.back())}
                className="items-center justify-center w-10 h-10 mr-2 bg-gray-100 rounded-xl"
              >
                <ArrowLeft size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Icon Box */}
              <View
                className="items-center justify-center w-10 h-10 rounded-xl"
                style={{
                  backgroundColor: COLORS.primaryLight,
                  borderWidth: 1,
                  borderColor: COLORS.primaryBorder,
                }}
              >
                <Calendar size={22} color={COLORS.primary} />
              </View>

              {/* Title & Subtitle */}
              <View className="flex-1 ml-3">
                <Text
                  className="text-lg font-bold text-gray-900"
                  numberOfLines={1}
                >
                  Department Audit Plan
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  Dept-wise Planning ({selectedYear}-{selectedYear + 1})
                </Text>
              </View>
            </View>

            {/* Desktop Only: Right side controls in same row */}
            {isDesktop && (
              <View className="flex-row items-center gap-2">
                {getPlanStatusBadge()}
                <YearFilter
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  availableYears={availableYears}
                />
                <TouchableOpacity
                  onPress={() => {
                    fetchForm3Data();
                    fetchPlanData();
                  }}
                  className="p-2 bg-gray-100 rounded-lg"
                >
                  <RefreshCw size={16} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className="p-2 bg-gray-100 rounded-lg"
                >
                  {downloadingPdf ? (
                    <ActivityIndicator size="small" color={COLORS.success} />
                  ) : (
                    <Download size={16} color={COLORS.success} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Mobile Only: Controls drop to second row */}
          {!isDesktop && (
            <View className="flex-row flex-wrap items-center justify-end gap-2 mt-3">
              {getPlanStatusBadge()}
              <YearFilter
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                availableYears={availableYears}
              />
              <TouchableOpacity
                onPress={() => {
                  fetchForm3Data();
                  fetchPlanData();
                }}
                className="p-2 bg-gray-100 rounded-lg"
              >
                <RefreshCw size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDownloadPDF}
                className="p-2 bg-gray-100 rounded-lg"
              >
                <Download size={16} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ✅ SCROLLABLE CONTENT STARTS BELOW HEADER */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && {
            maxWidth: 1400,
            alignSelf: "center",
            width: "100%",
            paddingHorizontal: 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo Banner */}
        {canEdit && (
          <Card
            style={[
              styles.demoCard,
              {
                backgroundColor: COLORS.purpleLight,
                borderColor: COLORS.purpleBorder,
              },
            ]}
          >
            <View style={styles.demoContent}>
              <View style={styles.demoLeft}>
                <View style={styles.demoIconBox}>
                  <Star size={20} color={COLORS.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoTitle}>Sync with Form3 Data</Text>
                  <Text style={styles.demoSubtitle}>
                    Auto-populate departments (IATF16949 & 5S only)
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <ActionButton
                  onPress={handlePlanCurrentQuarter}
                  loading={demoLoading}
                  color="#FFF"
                  bgColor={COLORS.success}
                  icon={Calendar}
                >
                  Sync Q
                </ActionButton>
                <ActionButton
                  onPress={handleQuickPlanned}
                  loading={demoLoading}
                  color="#FFF"
                  bgColor={COLORS.primary}
                  icon={Clock}
                >
                  Sync Q1
                </ActionButton>
                <ActionButton
                  onPress={handleDemoPlanned}
                  loading={demoLoading}
                  color="#FFF"
                  bgColor={COLORS.purple}
                  icon={Star}
                >
                  Sync All
                </ActionButton>
              </View>
            </View>
          </Card>
        )}

        {/* Alerts */}
        {planStatus === "APPROVED" && planInfo.approvalComments && (
          <AlertBanner
            type="success"
            icon={CheckCircle}
            title="Approval Comments"
            message={planInfo.approvalComments}
            footer={`Approved by: ${planInfo.approvedBy} | Date: ${formatLocalDateTime(planInfo.approvedAt)}`}
          />
        )}
        {planStatus === "CHANGE_REQUESTED" && planInfo.rejectionReason && (
          <AlertBanner
            type="warning"
            icon={MessageSquare}
            title="Change Request Comments"
            message={planInfo.rejectionReason}
            footer={`Requested by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
          />
        )}
        {planStatus === "REJECTED" && planInfo.rejectionReason && (
          <AlertBanner
            type="error"
            icon={X}
            title="Rejection Reason"
            message={planInfo.rejectionReason}
            footer={`Rejected by: ${planInfo.rejectedBy} | Date: ${formatLocalDateTime(planInfo.rejectedAt)}`}
          />
        )}

        {/* Form 3 Summary */}
        <Card style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <TouchableOpacity
            onPress={() => setShowForm3Details(!showForm3Details)}
            style={[
              styles.form3Header,
              { backgroundColor: showForm3Details ? "#F8FAFC" : COLORS.card },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <View
                style={[
                  styles.demoIconBox,
                  {
                    backgroundColor: COLORS.primaryLight,
                    borderColor: COLORS.primaryBorder,
                  },
                ]}
              >
                <FileText size={16} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: COLORS.textMain,
                }}
              >
                Planned Types
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={COLORS.textSub}
              style={{
                transform: [{ rotate: showForm3Details ? "180deg" : "0deg" }],
              }}
            />
          </TouchableOpacity>

          {showForm3Details && (
            <View
              style={{
                padding: 16,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {months.map((month) => {
                const elements = getAvailableElementsForMonth(month);
                return (
                  <View key={month} style={styles.monthCard}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: COLORS.textValue,
                        }}
                      >
                        {monthDisplay[month]}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: COLORS.primary,
                          fontWeight: "700",
                          backgroundColor: COLORS.primaryLight,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        {getQuarter(month)}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
                    >
                      {elements.length > 0 ? (
                        elements.map((el) => (
                          <View
                            key={el}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: COLORS.successLight,
                                borderColor: COLORS.successBorder,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color: "#065F46",
                                fontWeight: "600",
                              }}
                            >
                              {el.split("(")[0].trim()}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text
                          style={{
                            fontSize: 11,
                            color: COLORS.textSub,
                            fontStyle: "italic",
                          }}
                        >
                          No audits
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* Filter Bar */}
        <Card
          style={{
            padding: 16,
            marginBottom: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Filter size={16} color={COLORS.textSub} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: COLORS.textValue,
              }}
            >
              Filter:
            </Text>
            {[
              { id: "all", label: "All", color: COLORS.purple },
              { id: "planned", label: "P", color: COLORS.primary },
              { id: "completed", label: "C", color: COLORS.success },
              { id: "rescheduled", label: "R", color: COLORS.warning },
              { id: "pending", label: "Pending", color: "#D97706" },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilterStatus(f.id)}
                style={[
                  styles.filterBtn,
                  {
                    borderColor:
                      filterStatus === f.id ? f.color : COLORS.border,
                    backgroundColor:
                      filterStatus === f.id ? f.color : COLORS.card,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: filterStatus === f.id ? "#FFF" : COLORS.textValue,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 12, color: COLORS.textSub }}>
            Showing {filteredDepartments.length} depts
          </Text>
        </Card>

        {/* Main Table */}
        <Card style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ minWidth: 1200 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#F8FAFC",
                  borderBottomWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 200,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRightWidth: 1,
                    borderColor: COLORS.border,
                    padding: 12,
                  }}
                >
                  <Text style={styles.tableHeaderText}>Audit Area</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 12,
                      borderBottomWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={styles.tableHeaderText}>
                      Months (Financial Year)
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row" }}>
                    {months.map((month) => (
                      <View
                        key={month}
                        style={{
                          width: 94.5,
                          padding: 12,
                          justifyContent: "center",
                          alignItems: "center",
                          borderRightWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text style={styles.tableHeaderText}>
                          {monthDisplay[month]}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#94A3B8",
                            fontWeight: "500",
                            marginTop: 2,
                          }}
                        >
                          {getQuarter(month)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Body - table rows with expanded content below each */}
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept, idx) => {
                  const originalIndex = planData.findIndex(
                    (d) => d.department === dept.department,
                  );
                  const hasAnySelected = dept.months?.some(
                    (m) => m.selectedElements && m.selectedElements.length > 0,
                  );
                  const isExpanded = expandedDept === originalIndex;

                  return (
                    <View key={dept.department}>
                      {/* Department Row */}
                      <View style={styles.tableRow}>
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedDept(isExpanded ? null : originalIndex)
                          }
                          style={[
                            styles.tableCell,
                            {
                              width: 200,
                              flexDirection: "row",
                              justifyContent: "flex-start",
                              gap: 10,
                            },
                          ]}
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} color={COLORS.textSub} />
                          ) : (
                            <ChevronDown size={16} color={COLORS.textSub} />
                          )}
                          <Text
                            style={[
                              styles.tableCellText,
                              { fontWeight: "600" },
                            ]}
                            numberOfLines={1}
                          >
                            {dept.department}
                          </Text>
                          {hasAnySelected && (
                            <View
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: COLORS.successLight,
                                  borderColor: COLORS.successBorder,
                                  paddingHorizontal: 4,
                                  paddingVertical: 1,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: "#065F46",
                                  fontWeight: "700",
                                }}
                              >
                                ✓
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

                        {dept.months &&
                          dept.months.map((month, monthIdx) => {
                            const selectedElementsCount =
                              month.selectedElements?.length || 0;
                            const availableElements =
                              getAvailableElementsForMonth(month.month);
                            const hasElements = selectedElementsCount > 0;

                            return (
                              <View
                                key={monthIdx}
                                style={[styles.tableCell, { width: 94.5 }]}
                              >
                                <TouchableOpacity
                                  onPress={() =>
                                    canEdit &&
                                    handleMonthStatusChange(
                                      originalIndex,
                                      month.month,
                                    )
                                  }
                                  disabled={!canEdit}
                                  style={{ marginBottom: 8 }}
                                >
                                  {getMonthStatusBadge(
                                    month.status,
                                    hasElements,
                                  )}
                                </TouchableOpacity>

                                {hasElements ? (
                                  <TouchableOpacity
                                    onPress={() =>
                                      canEdit &&
                                      setSelectedMonthForElements({
                                        deptIndex: originalIndex,
                                        month: month.month,
                                      })
                                    }
                                    disabled={!canEdit}
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 2,
                                    }}
                                  >
                                    <CheckSquare
                                      size={10}
                                      color={COLORS.purple}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        fontWeight: "600",
                                        color: COLORS.purple,
                                      }}
                                    >
                                      {selectedElementsCount}
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  canEdit &&
                                  availableElements.length > 0 && (
                                    <TouchableOpacity
                                      onPress={() =>
                                        setSelectedMonthForElements({
                                          deptIndex: originalIndex,
                                          month: month.month,
                                        })
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 2,
                                      }}
                                    >
                                      <Plus size={10} color={COLORS.textSub} />
                                      <Text
                                        style={{
                                          fontSize: 10,
                                          fontWeight: "600",
                                          color: COLORS.textSub,
                                        }}
                                      >
                                        Add
                                      </Text>
                                    </TouchableOpacity>
                                  )
                                )}
                                {!hasElements &&
                                  availableElements.length === 0 && (
                                    <Text
                                      style={{ fontSize: 10, color: "#CBD5E1" }}
                                    >
                                      —
                                    </Text>
                                  )}
                              </View>
                            );
                          })}
                      </View>

                      {/* EXPANDED CONTENT */}
                      {isExpanded && (
                        <View
                          style={[
                            styles.expandedRow,
                            {
                              width: 1332,
                              borderTopWidth: 1,
                              borderTopColor: COLORS.border,
                            },
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 12,
                              padding: 12,
                            }}
                          >
                            {dept.months.map((month, monthIdx) => {
                              const selectedElements =
                                month.selectedElements || [];
                              if (selectedElements.length === 0) return null;
                              return (
                                <View
                                  key={monthIdx}
                                  style={[
                                    styles.expandedMonthCard,
                                    { width: isDesktop ? "23%" : "23%" },
                                  ]}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 13,
                                        fontWeight: "700",
                                        color: COLORS.textValue,
                                      }}
                                    >
                                      {monthDisplay[month.month]}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: COLORS.primary,
                                        fontWeight: "700",
                                        backgroundColor: COLORS.primaryLight,
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 8,
                                      }}
                                    >
                                      {getQuarter(month.month)}
                                    </Text>
                                  </View>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      flexWrap: "wrap",
                                      gap: 6,
                                    }}
                                  >
                                    {selectedElements.map(
                                      (el: string, idx: number) => (
                                        <View
                                          key={idx}
                                          style={[
                                            styles.chip,
                                            {
                                              backgroundColor:
                                                COLORS.purpleLight,
                                              borderColor: COLORS.purpleBorder,
                                              paddingHorizontal: 10,
                                              paddingVertical: 6,
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 11,
                                              color: "#5B21B6",
                                              fontWeight: "600",
                                            }}
                                            numberOfLines={1}
                                          >
                                            {el}
                                          </Text>
                                        </View>
                                      ),
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <FileText
                    size={32}
                    color={COLORS.textSub}
                    style={{ opacity: 0.5, marginBottom: 8 }}
                  />
                  <Text style={{ fontSize: 14, color: COLORS.textSub }}>
                    No departments match the selected filter
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Card>

        {/* Legend & Document Control */}
        <Card style={{ padding: 20, marginBottom: 24 }}>
          <View
            style={{ flexDirection: isDesktop ? "row" : "column", gap: 32 }}
          >
            {/* Left Column: Legend */}
            <View style={{ flex: 1, marginBottom: !isDesktop ? 24 : 0 }}>
              <Text style={styles.legendTitle}>Legend</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.textValue,
                  marginBottom: 8,
                }}
              >
                Audit Elements:
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                  A - System (ISO)
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                  B - System (IATF)
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                  C - 5S
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                  D - Process
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                  E - Product
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.textValue,
                  marginBottom: 8,
                }}
              >
                Status Codes:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: COLORS.primaryLight,
                      borderWidth: 1,
                      borderColor: COLORS.primaryBorder,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Clock size={8} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                    P - Planned
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: COLORS.successLight,
                      borderWidth: 1,
                      borderColor: COLORS.successBorder,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Check size={8} color={COLORS.success} />
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                    C - Completed
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: COLORS.warningLight,
                      borderWidth: 1,
                      borderColor: COLORS.warningBorder,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Repeat size={8} color={COLORS.warning} />
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.textSub }}>
                    R - Rescheduled
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Column: Document Control */}
            <View style={{ flex: 1 }}>
              <Text style={styles.legendTitle}>Document Control</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{ width: 120, fontSize: 12, color: COLORS.textSub }}
                  >
                    Document Title:
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: COLORS.textValue,
                      fontWeight: "500",
                    }}
                  >
                    Internal Quality Audit Schedule
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{ width: 120, fontSize: 12, color: COLORS.textSub }}
                  >
                    Document No.:
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: COLORS.textValue,
                      fontWeight: "500",
                    }}
                  >
                    IQA/F/04
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{ width: 120, fontSize: 12, color: COLORS.textSub }}
                  >
                    Revision:
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: COLORS.textValue,
                      fontWeight: "500",
                    }}
                  >
                    {documentRevision}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{ width: 120, fontSize: 12, color: COLORS.textSub }}
                  >
                    Revision Date:
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: COLORS.textValue,
                      fontWeight: "500",
                    }}
                  >
                    {revisionDate}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{ width: 120, fontSize: 12, color: COLORS.textSub }}
                  >
                    Frequency:
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: COLORS.textValue,
                      fontWeight: "500",
                    }}
                  >
                    {auditFrequency}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: "#F8FAFC",
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
            }}
          >
            <Text
              style={{ fontSize: 12, color: COLORS.textSub, lineHeight: 20 }}
            >
              <Text style={{ fontWeight: "700", color: COLORS.textValue }}>
                Audit Criteria:
              </Text>{" "}
              ISO9001:2015, IATF16949 Standard, QMS Manual, Procedures, WI, etc.
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textSub,
                lineHeight: 20,
                marginTop: 4,
              }}
            >
              <Text style={{ fontWeight: "700", color: COLORS.textValue }}>
                Audit Scope:
              </Text>{" "}
              Applicable process within department/function and clause No. 4, 5,
              6, 7, 8, 9 & 10.
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: COLORS.textSub,
                lineHeight: 20,
                marginTop: 4,
              }}
            >
              <Text style={{ fontWeight: "700", color: COLORS.textValue }}>
                Audit Method:
              </Text>{" "}
              Interview with Auditee, Observation and verification to check
              compliance.
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <Card style={{ padding: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {canSubmit ? (
                <CheckCircle color={COLORS.success} size={16} />
              ) : (
                <AlertCircle color={COLORS.textSub} size={16} />
              )}
              <Text style={{ fontSize: 13, color: COLORS.textSub }}>
                {canSubmit ? "Ready to submit" : "Complete planning to submit"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {canEdit && (
                <ActionButton
                  onPress={handleSave}
                  loading={saving}
                  color={COLORS.textValue}
                  bgColor={COLORS.card}
                  borderColor={COLORS.border}
                  icon={Save}
                >
                  Save Draft
                </ActionButton>
              )}
              {canSubmit && (
                <ActionButton
                  onPress={handleSubmitForApproval}
                  loading={submitting}
                  color="#FFF"
                  bgColor={COLORS.primary}
                  icon={Send}
                >
                  {planStatus === "REJECTED" ? "Resubmit" : "Submit"}
                </ActionButton>
              )}
              {canApprove && (
                <>
                  <ActionButton
                    onPress={() => setShowRejectModal(true)}
                    color="#FFF"
                    bgColor={COLORS.danger}
                    icon={X}
                  >
                    Reject
                  </ActionButton>
                  <ActionButton
                    onPress={() => setShowApproveModal(true)}
                    color="#FFF"
                    bgColor={COLORS.success}
                    icon={Check}
                  >
                    Approve
                  </ActionButton>
                </>
              )}
              {isTopManagement && planStatus === "APPROVED" && (
                <ActionButton
                  onPress={() => setShowChangeRequestModal(true)}
                  color="#FFF"
                  bgColor={COLORS.warning}
                  icon={MessageSquare}
                >
                  Request Changes
                </ActionButton>
              )}
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Modals */}
      <ActionModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setTempApprovalComment("");
        }}
        title="Approve Plan"
        description="Please provide approval comments:"
        icon={Check}
        iconColor={COLORS.success}
        iconBg={COLORS.successLight}
        iconBorder={COLORS.successBorder}
        value={tempApprovalComment}
        setValue={setTempApprovalComment}
        placeholder="Enter approval comments..."
        onSubmit={handleApprove}
        submitLabel="Confirm Approve"
        submitBg={COLORS.success}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setTempRejectionReason("");
        }}
        title="Reject Plan"
        description="Please provide a reason for rejection:"
        icon={X}
        iconColor={COLORS.danger}
        iconBg={COLORS.dangerLight}
        iconBorder={COLORS.dangerBorder}
        value={tempRejectionReason}
        setValue={setTempRejectionReason}
        placeholder="Enter rejection reason..."
        onSubmit={handleReject}
        submitLabel="Confirm Reject"
        submitBg={COLORS.danger}
        submitting={submitting}
      />
      <ActionModal
        isOpen={showChangeRequestModal}
        onClose={() => {
          setShowChangeRequestModal(false);
          setChangeRequestReason("");
        }}
        title={`Request Changes - ${selectedYear}`}
        description="Please provide details about what changes are needed:"
        icon={MessageSquare}
        iconColor={COLORS.warning}
        iconBg={COLORS.warningLight}
        iconBorder={COLORS.warningBorder}
        value={changeRequestReason}
        setValue={setChangeRequestReason}
        placeholder="Describe the changes required..."
        onSubmit={handleRequestChanges}
        submitLabel="Submit Request"
        submitBg={COLORS.warning}
        submitting={submitting}
      />

      <ElementSelectionModal
        isOpen={!!selectedMonthForElements}
        onClose={() => setSelectedMonthForElements(null)}
        month={selectedMonthForElements?.month}
        availableElements={
          selectedMonthForElements
            ? getAvailableElementsForMonth(selectedMonthForElements.month)
            : []
        }
        selectedElements={
          selectedMonthForElements
            ? planData[selectedMonthForElements.deptIndex]?.months.find(
                (m) => m.month === selectedMonthForElements.month,
              )?.selectedElements || []
            : []
        }
        onSave={(elements: string[]) =>
          handleAddElementsToMonth(
            selectedMonthForElements!.deptIndex,
            selectedMonthForElements!.month,
            elements,
          )
        }
      />
    </View>
  );
}

// ══════ STYLES ══════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loadingText: { marginTop: 12, color: COLORS.textSub, fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 24,
  },

  planStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  planStatusText: { fontSize: 10, fontWeight: "600" },

  alertBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  alertTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  alertMessage: { fontSize: 13, opacity: 0.9, flexWrap: "wrap" },
  alertFooter: { fontSize: 12, opacity: 0.7, marginTop: 8 },

  demoCard: { padding: 20, borderColor: COLORS.purpleBorder },
  demoContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  demoLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  demoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.purpleBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  demoTitle: { fontSize: 14, fontWeight: "700", color: "#4C1D95" },
  demoSubtitle: { fontSize: 12, color: "#6D28D9", marginTop: 2 },

  form3Header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  monthCard: {
    flex: 1,
    minWidth: 140,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  tableHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tableCell: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  tableCellText: { fontSize: 13, color: COLORS.textValue },

  expandedRow: {
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  expandedMonthCard: {
    minWidth: 150,
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },

  legendTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  actionButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: { fontSize: 13, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMain,
    flex: 1,
  },
  modalDesc: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
  modalBody: { padding: 20 },
  modalInput: {
    width: "100%",
    minHeight: 100,
    padding: 12,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    color: COLORS.textValue,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMain,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectItemText: { fontSize: 13, color: COLORS.textMain },
});
