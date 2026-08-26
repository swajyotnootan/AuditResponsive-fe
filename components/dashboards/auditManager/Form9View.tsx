import { API_BASE_URL } from "@/config/apiConfig";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

// ═════ MNC STANDARD PALETTE ═════
const T = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#000000",
  textValue: "#1F2937",
  textMuted: "#6B7280",
  accent: "#00529B",
  accentLight: "#EFF6FF",
  accentBorder: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  error: "#EF4444",
  errorLight: "#FEF2F2",
  errorBorder: "#FECACA",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  purpleBorder: "#DDD6FE",
};

const FONT_FAMILY = Platform.OS === "ios" ? "System" : "Roboto";

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

export interface NCRRow {
  srNo: string;
  ncNo: string;
  auditDate: string;
  auditDateISO: string;
  auditorName: string;
  auditeeName: string;
  observation: string;
  department: string;
  correctiveAction: string;
  audit: string;
  responsibility: string;
  targetDate: string;
  implementationStatus: string;
  status: string;
}

export interface Filters {
  search: string;
  ncNo: string;
  status: string;
  department: string;
  audit: string;
  implementationStatus: string;
  auditorName: string;
  dateFrom: string;
  dateTo: string;
}

interface RawNCR {
  ncr2CorrectiveAction?: string;
  ncr2Correction?: string;
  correctiveAction?: string;
  correction?: string;
  status?: string | number;
  ncrNumber?: string;
  createdAt?: string;
  auditorName?: string;
  auditeeName?: string;
  statementOfNonconformity?: string;
  objectiveEvidence?: string;
  department?: string;
  auditType?: string;
  dueDate?: string;
  [key: string]: any;
}

// ─────────────────────────────────────────────────────────────
// Reusable UI Components (Typed)
// ─────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className = "" }: CardProps) => (
  <View
    className={`bg-[${T.card}] border border-[${T.border}] rounded-xl shadow-sm ${className}`}
  >
    {children}
  </View>
);

interface SpinnerProps {
  size?: number;
  color?: string;
}

const Spinner = ({ size = 16, color = "#FFFFFF" }: SpinnerProps) => (
  <ActivityIndicator size="small" color={color} />
);

interface DatePickerInputProps {
  label: string;
  value: string;
  onChangeProp: (value: string) => void;
}

const DatePickerInput = React.memo(
  ({ label, value, onChangeProp }: DatePickerInputProps) => {
    const [show, setShow] = useState(false);

    const getDateValue = () => {
      if (value && typeof value === "string" && value.includes("-")) {
        const parts = value.split("-");
        if (parts.length === 3) {
          const d = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10),
          );
          if (!isNaN(d.getTime())) return d;
        }
      }
      return new Date();
    };

    const [date, setDate] = useState<Date>(getDateValue);

    const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      // On Android, the picker is a dialog. We MUST close it after any interaction (set or dismissed)
      if (Platform.OS === "android") {
        setShow(false);
      }

      if (event.type === "set" && selectedDate) {
        setDate(selectedDate);
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const year = selectedDate.getFullYear();
        onChangeProp(`${day}-${month}-${year}`);
      }
    };

    return (
      <View style={{ minWidth: 140, flex: 1 }}>
        <Text className="text-[11px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
        <Pressable
          onPress={() => setShow(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // ✅ Ensures tap is registered
          className="h-10 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] flex-row justify-between items-center"
          style={{ zIndex: 10 }}
        >
          <Text
            className={`text-sm ${value ? "text-[#1F2937]" : "text-[#94A3B8]"}`}
          >
            {value || "dd-mm-yyyy"}
          </Text>
          <Feather name="calendar" size={16} color={T.textMuted} />
        </Pressable>

        {/* ✅ Key prop forces clean re-render of the picker when opened */}
        {show && (
          <DateTimePicker
            key={show ? "open" : "closed"}
            testID="dateTimePicker"
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChange}
          />
        )}
      </View>
    );
  },
);

interface ActionButtonProps {
  onPress?: () => void;
  icon?: string;
  label: string;
  variant?: "primary" | "secondary" | "outline" | "pdf";
  disabled?: boolean;
  title?: string;
  loading?: boolean;
}

const ActionButton = React.memo(
  ({
    onPress,
    icon,
    label,
    variant = "primary",
    disabled = false,
    title,
    loading = false,
  }: ActionButtonProps) => {
    const variants = {
      primary: `bg-[${T.accent}] border-transparent`,
      secondary: `bg-[${T.card}] border-[${T.border}]`,
      outline: `bg-transparent border-[${T.accentBorder}]`,
      pdf: `bg-[${T.error}] border-transparent`,
    };

    const textColor = disabled
      ? "#94A3B8"
      : variant === "primary" || variant === "pdf"
        ? "#FFFFFF"
        : T.textValue;
    const variantStyle = variants[variant] || variants.primary;
    const bgColor = disabled
      ? "#F1F5F9"
      : variantStyle.split(" ")[0].replace("bg-[", "").replace("]", "");

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        className={`h-10 px-5 rounded-lg border ${variantStyle} flex-row items-center justify-center gap-2 active:opacity-80 ${disabled ? "opacity-50" : ""}`}
        style={{ backgroundColor: disabled ? "#F1F5F9" : bgColor }}
      >
        {loading ? (
          <Spinner size={16} color={textColor} />
        ) : (
          icon && <Feather name={icon as any} size={16} color={textColor} />
        )}
        <Text
          style={{
            color: textColor,
            fontSize: 14,
            fontWeight: "600",
            fontFamily: FONT_FAMILY,
          }}
        >
          {loading ? "Generating..." : label}
        </Text>
      </Pressable>
    );
  },
);

const isClosedNcrStatus = (
  status: string | number | undefined | null,
): boolean => {
  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();
  return ["CLOSE", "CLOSED", "NCR2_COMPLETED"].includes(normalizedStatus);
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = React.memo(({ status }: StatusBadgeProps) => {
  const isClosed = isClosedNcrStatus(status);
  return (
    <View
      className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full border ${
        isClosed
          ? `bg-[${T.successLight}] border-[${T.successBorder}]`
          : `bg-[${T.warningLight}] border-[${T.warningBorder}]`
      }`}
    >
      <Feather
        name={isClosed ? "check-circle" : "x-circle"}
        size={12}
        color={isClosed ? "#065F46" : "#92400E"}
      />
      <Text
        className={`text-xs font-bold ${isClosed ? "text-[#065F46]" : "text-[#92400E]"}`}
      >
        {status}
      </Text>
    </View>
  );
});

const getCorrectiveActionText = (ncr: RawNCR): string =>
  ncr.ncr2CorrectiveAction ||
  ncr.ncr2Correction ||
  ncr.correctiveAction ||
  ncr.correction ||
  "Pending";

// ─────────────────────────────────────────────────────────────
// Observation Modal Component
// ─────────────────────────────────────────────────────────────

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  observation: string;
  ncNo: string;
}

const ObservationModal = React.memo(
  ({ isOpen, onClose, observation, ncNo }: ObservationModalProps) => {
    return (
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable
          className="items-center justify-center flex-1 p-5 bg-black/30"
          onPress={onClose}
        >
          <Pressable
            className={`bg-[${T.card}] rounded-2xl w-full max-w-[600px] max-h-[80%] border border-[${T.border}] shadow-lg overflow-hidden`}
            onPress={() => {}}
          >
            <View
              className={`p-6 border-b border-[${T.border}] flex-row justify-between items-center`}
            >
              <View className="flex-row items-center gap-4">
                <View
                  className={`w-11 h-11 rounded-xl bg-[${T.accentLight}] border border-[${T.accentBorder}] items-center justify-center`}
                >
                  <Feather name="file-text" size={22} color={T.accent} />
                </View>
                <View>
                  <Text className="text-lg font-bold text-[#000000]">
                    Observation Details
                  </Text>
                  <Text className="text-xs text-[#6B7280] mt-1">
                    NCR: {ncNo}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                className={`w-9 h-9 rounded-lg border border-[${T.border}] bg-[${T.card}] items-center justify-center`}
              >
                <Feather name="x" size={20} color={T.textMuted} />
              </Pressable>
            </View>

            <ScrollView className="flex-1 p-6">
              <Text
                className="text-[15px] text-[#1F2937] leading-6"
                style={{ fontFamily: FONT_FAMILY }}
              >
                {observation || "No observation details available."}
              </Text>
            </ScrollView>

            <View
              className={`p-4 border-t border-[${T.border}] bg-[#F8FAFC] items-end`}
            >
              <ActionButton
                onPress={onClose}
                label="Close"
                variant="secondary"
                icon="x"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Custom Select Component
// ─────────────────────────────────────────────────────────────

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const CustomSelect = React.memo(
  ({ label, value, onChange, options }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <View style={{ minWidth: 140, flex: 1 }}>
        <Text className="text-[11px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wider">
          {label}
        </Text>
        <Pressable
          onPress={() => setIsOpen(true)}
          className="h-10 px-3.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] flex-row justify-between items-center"
        >
          <Text
            className={`text-sm ${value ? "text-[#1F2937]" : "text-[#94A3B8]"}`}
          >
            {value || "All"}
          </Text>
          <Feather name="chevron-down" size={16} color={T.textMuted} />
        </Pressable>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            className="items-center justify-center flex-1 p-5 bg-black/30"
            onPress={() => setIsOpen(false)}
          >
            <View
              className={`bg-[${T.card}] rounded-xl w-full max-w-[300px] border border-[${T.border}] shadow-lg overflow-hidden`}
            >
              <ScrollView className="max-h-[300px]">
                <Pressable
                  className="p-4 border-b border-[#E2E8F0]"
                  onPress={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                >
                  <Text className="text-sm font-semibold text-[#00529B]">
                    All
                  </Text>
                </Pressable>
                {options.map((opt) => (
                  <Pressable
                    key={opt}
                    className="p-4 border-b border-[#E2E8F0]"
                    onPress={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                  >
                    <Text className="text-sm text-[#1F2937]">{opt}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Filter Panel
// ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
  rows: NCRRow[];
  activeFilterCount: number;
}

const FilterPanel = React.memo(
  ({
    filters,
    onFilterChange,
    onReset,
    rows,
    activeFilterCount,
  }: FilterPanelProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const uniqueValues = useMemo(
      () => ({
        status: [
          ...new Set(rows.map((r) => r.status).filter(Boolean)),
        ] as string[],
        department: [
          ...new Set(rows.map((r) => r.department).filter(Boolean)),
        ] as string[],
        audit: [
          ...new Set(rows.map((r) => r.audit).filter(Boolean)),
        ] as string[],
        implementationStatus: [
          ...new Set(rows.map((r) => r.implementationStatus).filter(Boolean)),
        ] as string[],
        auditorName: [
          ...new Set(rows.map((r) => r.auditorName).filter(Boolean)),
        ] as string[],
      }),
      [rows],
    );

    return (
      <Card className="mb-6 overflow-hidden">
        <Pressable
          onPress={() => setIsOpen(!isOpen)}
          className={`p-4 flex-row justify-between items-center bg-[#F8FAFC] ${isOpen ? `border-b border-[${T.border}]` : ""}`}
        >
          <View className="flex-row items-center gap-3">
            <View
              className={`w-8 h-8 rounded-lg bg-[${T.purpleLight}] border border-[${T.purpleBorder}] items-center justify-center`}
            >
              <Feather name="sliders" size={16} color={T.purple} />
            </View>
            <Text className="text-[15px] font-bold text-[#000000]">
              Filters & Search
            </Text>
            {activeFilterCount > 0 && (
              <View className="w-6 h-6 rounded-full bg-[#8B5CF6] items-center justify-center">
                <Text className="text-[11px] font-bold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-3">
            {activeFilterCount > 0 && (
              <Pressable
                onPress={onReset}
                className="h-8 px-3 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] flex-row items-center gap-1.5"
              >
                <Feather name="rotate-cw" size={12} color={T.textValue} />
                <Text className="text-[13px] font-semibold text-[#1F2937]">
                  Clear
                </Text>
              </Pressable>
            )}
            <Feather
              name="chevron-down"
              size={18}
              color={T.textMuted}
              style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
            />
          </View>
        </Pressable>

        {isOpen && (
          <View
            style={{
              padding: 24,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "flex-end",
            }}
          >
            <View style={{ flex: 1, minWidth: 200 }}>
              <Text className="text-[11px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wider">
                Global Search
              </Text>
              <View className="relative">
                <Feather
                  name="search"
                  size={16}
                  color="#94A3B8"
                  style={{ position: "absolute", left: 12, top: 12, zIndex: 1 }}
                />
                <TextInput
                  value={filters.search}
                  onChangeText={(text) => onFilterChange("search", text)}
                  placeholder="Search any field..."
                  placeholderTextColor="#94A3B8"
                  className="h-10 pl-10 pr-3.5 text-sm rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-[#1F2937]"
                  style={{ fontFamily: FONT_FAMILY }}
                />
              </View>
            </View>

            <View style={{ minWidth: 140, flex: 1 }}>
              <Text className="text-[11px] font-bold text-[#6B7280] mb-1.5 uppercase tracking-wider">
                NCR No.
              </Text>
              <TextInput
                value={filters.ncNo}
                onChangeText={(text) => onFilterChange("ncNo", text)}
                placeholder="e.g. NCR-001"
                placeholderTextColor="#94A3B8"
                className="h-10 px-3.5 text-sm rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] text-[#1F2937]"
                style={{ fontFamily: FONT_FAMILY }}
              />
            </View>

            {/* ✅ FIXED: Clean Date Pickers */}
            <DatePickerInput
              label="Date From"
              value={filters.dateFrom}
              onChangeProp={(v) => onFilterChange("dateFrom", v)}
            />
            <DatePickerInput
              label="Date To"
              value={filters.dateTo}
              onChangeProp={(v) => onFilterChange("dateTo", v)}
            />

            <CustomSelect
              label="Status"
              value={filters.status}
              onChange={(v) => onFilterChange("status", v)}
              options={uniqueValues.status}
            />
            <CustomSelect
              label="Department"
              value={filters.department}
              onChange={(v) => onFilterChange("department", v)}
              options={uniqueValues.department}
            />
            <CustomSelect
              label="Audit Type"
              value={filters.audit}
              onChange={(v) => onFilterChange("audit", v)}
              options={uniqueValues.audit}
            />
            <CustomSelect
              label="Impl. Status"
              value={filters.implementationStatus}
              onChange={(v) => onFilterChange("implementationStatus", v)}
              options={uniqueValues.implementationStatus}
            />
            <CustomSelect
              label="Auditor"
              value={filters.auditorName}
              onChange={(v) => onFilterChange("auditorName", v)}
              options={uniqueValues.auditorName}
            />
          </View>
        )}
      </Card>
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Highlight Helper
// ─────────────────────────────────────────────────────────────

interface HighlightTextProps {
  text: string;
  query: string;
}

function HighlightText({ text, query }: HighlightTextProps) {
  if (!query || !text)
    return <Text className="text-[#1F2937]">{text || "—"}</Text>;
  const parts = String(text).split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return (
    <Text style={{ fontFamily: FONT_FAMILY }}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text
            key={i}
            className="bg-[#FEF08A] text-[#713f12] rounded-sm px-0.5"
          >
            {part}
          </Text>
        ) : (
          <Text key={i} className="text-[#1F2937]">
            {part}
          </Text>
        ),
      )}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = {
  search: "",
  ncNo: "",
  status: "",
  department: "",
  audit: "",
  implementationStatus: "",
  auditorName: "",
  dateFrom: "",
  dateTo: "",
};

export default function Form9View({ onBack }: { onBack?: () => void }) {
  const navigation = useNavigation<NavigationProp<any>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ title: string; rows: NCRRow[] }>({
    title: "Summary of Non Conformity",
    rows: [],
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedObservation, setSelectedObservation] = useState<{
    text: string;
    ncNo: string;
  }>({ text: "", ncNo: "" });

  const fetchNCRSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/ncr/all`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const ncrList: RawNCR[] = await response.json();
        const transformedRows: NCRRow[] = ncrList.map((ncr, index) => {
          const isClosed = isClosedNcrStatus(ncr.status);
          const correctiveAction = getCorrectiveActionText(ncr);
          return {
            srNo: String(index + 1),
            ncNo: ncr.ncrNumber || `NCR-${index + 1}`,
            auditDate: ncr.createdAt
              ? new Date(ncr.createdAt).toLocaleDateString("en-GB")
              : "",
            auditDateISO: ncr.createdAt
              ? new Date(ncr.createdAt).toISOString().split("T")[0]
              : "",
            auditorName: ncr.auditorName || "Not Assigned",
            auditeeName: ncr.auditeeName || "Not Assigned",
            observation:
              ncr.statementOfNonconformity || ncr.objectiveEvidence || "",
            department: ncr.department || "",
            correctiveAction,
            audit: ncr.auditType || "IATF",
            responsibility: ncr.department || "",
            targetDate: ncr.dueDate || "8/08/2025",
            implementationStatus: isClosed
              ? "Done"
              : correctiveAction !== "Pending"
                ? "In Progress"
                : "Pending",
            status: isClosed ? "Close" : "Open",
          };
        });
        setFormData({
          title: `Summary of Non Conformity (${new Date().getFullYear()})`,
          rows: transformedRows,
        });
        setSuccess(`Loaded ${transformedRows.length} NCR records`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Failed to fetch NCR data");
      }
    } catch (err: any) {
      console.error("Error fetching NCRs:", err);
      setError("Cannot connect to server. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNCRSummary();
  }, [fetchNCRSummary]);

  const filteredRows = useMemo(() => {
    const {
      search,
      ncNo,
      status,
      department,
      audit,
      implementationStatus,
      auditorName,
      dateFrom,
      dateTo,
    } = filters;
    return formData.rows.filter((row) => {
      if (search) {
        const q = search.toLowerCase();
        const haystack = [
          row.ncNo,
          row.auditDate,
          row.auditorName,
          row.auditeeName,
          row.observation,
          row.department,
          row.correctiveAction,
          row.audit,
          row.responsibility,
          row.targetDate,
          row.implementationStatus,
          row.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (ncNo && !row.ncNo.toLowerCase().includes(ncNo.toLowerCase()))
        return false;
      if (status && row.status !== status) return false;
      if (department && row.department !== department) return false;
      if (audit && row.audit !== audit) return false;
      if (
        implementationStatus &&
        row.implementationStatus !== implementationStatus
      )
        return false;
      if (auditorName && row.auditorName !== auditorName) return false;
      if (dateFrom && row.auditDateISO && row.auditDateISO < dateFrom)
        return false;
      if (dateTo && row.auditDateISO && row.auditDateISO > dateTo) return false;
      return true;
    });
  }, [formData.rows, filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "").length,
    [filters],
  );

  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const handleResetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/ncr/form9/pdf`, {
        method: "GET",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }
      Alert.alert(
        "PDF Generated",
        "PDF download initiated. (Note: Implement expo-file-system for actual file saving in RN)",
      );
      setSuccess("PDF downloaded successfully!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("PDF download error:", err);
      setError(`Failed to download PDF: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const handleSave = useCallback(() => {
    console.log("Saved Form9View data:", formData);
    setSuccess("Summary data saved!");
    setTimeout(() => setSuccess(null), 2500);
  }, [formData]);

  const handleOpenObservation = useCallback(
    (observation: string, ncNo: string) => {
      setSelectedObservation({ text: observation, ncNo });
      setModalOpen(true);
    },
    [],
  );

  const handleCloseObservation = useCallback(() => {
    setModalOpen(false);
    setSelectedObservation({ text: "", ncNo: "" });
  }, []);

  const scrollTable = useCallback((direction: "left" | "right") => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: direction === "left" ? -400 : 400,
        animated: true,
      });
    }
  }, []);

  // ✅ FIXED: Robust Back Button Handler
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      console.warn("No navigation history to go back to.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <Spinner size={40} color={T.accent} />
        <Text className="mt-4 text-[15px] font-bold text-[#000000]">
          Loading NCR Summary...
        </Text>
        <Text className="mt-1.5 text-sm text-[#6B7280]">
          Fetching data from server
        </Text>
      </View>
    );
  }

 return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#F8FAFC]"
    >
      {/* ✅ FULL-WIDTH HEADER - Outside ScrollView */}
      <View className="w-full px-4 py-4 bg-white border-b border-[#E2E8F0] shadow-sm">
        <View style={{ maxWidth: 1400, width: "100%", alignSelf: "center" }}>
          <View
            className="flex-row flex-wrap items-center justify-between"
            style={{ gap: 16 }}
          >
            {/* Left Side: Back Button & Title */}
            <View style={{ flex: 1, minWidth: 200 }}>
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => {
                    if (onBack) {
                      onBack(); // ✅ Preferred: Lets the parent component handle closing (e.g., setState)
                    } else {
                      navigation.goBack(); // ✅ Fallback: Uses React Navigation if no prop is passed
                    }
                  }}
                  className="w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center"
                >
                  {({ pressed }) => (
                    <Feather
                      name="arrow-left"
                      size={18}
                      color={pressed ? T.accent : T.textMuted}
                    />
                  )}
                </Pressable>
                <View>
                  <Text className="text-xl font-bold text-[#1E293B]">
                    Nonconformity Summary
                  </Text>
                  <Text className="mt-1 text-sm text-[#64748B]">
                    View all NCRs raised by auditors
                  </Text>
                </View>
              </View>
            </View>

            {/* Right Side: Refresh Button */}
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Pressable
                onPress={fetchNCRSummary}
                disabled={loading}
                className="flex-row items-center px-4 py-2.5 bg-white border border-[#E2E8F0] shadow-sm rounded-xl active:opacity-70"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator
                    size="small"
                    color={T.accent}
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={16}
                    color={T.textMuted}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text className="text-sm font-semibold text-[#334155]">
                  Refresh
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* ✅ SCROLLABLE CONTENT */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="max-w-[1400px] w-full mx-auto p-6">
          {/* Alerts */}
          {success && (
            <View
              className={`p-4 bg-[${T.successLight}] border border-[${T.successBorder}] rounded-xl mb-6 flex-row gap-3 items-center`}
            >
              <Feather name="check-circle" size={20} color={T.success} />
              <Text className="text-sm font-semibold text-[#065F46] flex-1">
                {success}
              </Text>
            </View>
          )}
          {error && (
            <View
              className={`p-4 bg-[${T.errorLight}] border border-[${T.errorBorder}] rounded-xl mb-6 flex-row gap-3 items-start`}
            >
              <Feather
                name="alert-circle"
                size={20}
                color={T.error}
                style={{ marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#991B1B]">
                  Error
                </Text>
                <Text className="text-sm text-[#991B1B] opacity-90 mt-1">
                  {error}
                </Text>
              </View>
            </View>
          )}

          {/* Title Card */}
          <View
            className={`bg-[${T.card}] border border-[${T.border}] rounded-xl p-6 mb-6 shadow-sm flex-row justify-between items-center flex-wrap gap-4`}
          >
            <View className="flex-row items-center gap-4">
              <View
                className={`w-12 h-12 rounded-xl bg-[${T.successLight}] border border-[${T.successBorder}] items-center justify-center`}
              >
                <Feather name="grid" size={24} color={T.success} />
              </View>
              <View>
                <Text className="text-xl font-bold text-[#000000]">
                  {formData.title}
                </Text>
                <Text className="text-sm text-[#6B7280] mt-1">
                  Total Records:{" "}
                  <Text className="font-semibold text-[#1F2937]">
                    {formData.rows.length}
                  </Text>
                  {activeFilterCount > 0 && (
                    <Text className="ml-2 text-[#8B5CF6] font-semibold">
                      · {filteredRows.length} filtered
                    </Text>
                  )}
                </Text>
              </View>
            </View>
            {formData.rows.length > 0 && (
              <View
                className={`flex-row items-center gap-2 px-4 py-2 bg-[${T.errorLight}] border border-[${T.errorBorder}] rounded-lg`}
              >
                <Feather name="file-text" size={16} color={T.error} />
                <Text className="text-xs font-semibold text-[#991B1B]">
                  Ready to export — {formData.rows.length} records
                </Text>
              </View>
            )}
          </View>

          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            rows={formData.rows}
            activeFilterCount={activeFilterCount}
          />

          {/* No Results */}
          {activeFilterCount > 0 && filteredRows.length === 0 && (
            <View
              className={`p-4 bg-[${T.warningLight}] border border-[${T.warningBorder}] rounded-xl mb-6 flex-row gap-3 items-center`}
            >
              <Feather name="filter" size={20} color={T.warning} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#92400E]">
                  No records match your filters
                </Text>
                <Text className="text-xs text-[#92400E] opacity-90 mt-1">
                  Try adjusting or clearing the active filters.
                </Text>
              </View>
              <Pressable onPress={handleResetFilters}>
                <Text className="text-sm font-semibold text-[#92400E] underline">
                  Clear all
                </Text>
              </Pressable>
            </View>
          )}

          {/* Table Card */}
          <View
            className={`bg-[${T.card}] border border-[${T.border}] rounded-xl shadow-sm overflow-hidden`}
          >
            <View
              className={`p-4 border-b border-[${T.border}] bg-[#F8FAFC] flex-row justify-between items-center`}
            >
              <View className="flex-row items-center gap-3">
                <Feather name="layers" size={18} color={T.textMuted} />
                <Text className="text-[15px] font-bold text-[#000000]">
                  NCR Summary Table
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {activeFilterCount > 0 && (
                  <View
                    className={`px-2.5 py-1 rounded-full bg-[${T.purpleLight}] border border-[${T.purpleBorder}]`}
                  >
                    <Text className="text-xs font-semibold text-[#5B21B6]">
                      {filteredRows.length} / {formData.rows.length} shown
                    </Text>
                  </View>
                )}
                <View className="px-2.5 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
                  <Text className="text-xs font-semibold text-[#6B7280]">
                    {formData.rows.length} rows
                  </Text>
                </View>
              </View>
            </View>

            {/* Scroll Controls */}
            {filteredRows.length > 0 && (
              <View
                className={`border-b border-[${T.border}] bg-[${T.card}] flex-row justify-between items-center ${isDesktop ? "p-4" : "p-3"}`}
              >
                <View className="flex-row items-center gap-2">
                  <Feather
                    name="move"
                    size={isDesktop ? 16 : 14}
                    color={T.textMuted}
                  />
                  <Text
                    className={`${isDesktop ? "text-sm" : "text-xs"} text-[#6B7280]`}
                  >
                    {isDesktop
                      ? "Drag, or hold Shift + scroll to navigate columns"
                      : "Scroll horizontally to see all columns"}
                  </Text>
                </View>

                <View
                  className={`flex-row items-center bg-[#F8FAFC] rounded-lg border border-[${T.border}] overflow-hidden`}
                >
                  <Pressable
                    onPress={() => scrollTable("left")}
                    className={`items-center justify-center border-r border-[${T.border}] active:bg-[#E2E8F0] ${isDesktop ? "w-10 h-10" : "w-9 h-9"}`}
                  >
                    <Feather
                      name="chevron-left"
                      size={isDesktop ? 18 : 16}
                      color={T.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => scrollTable("right")}
                    className={`items-center justify-center active:bg-[#E2E8F0] ${isDesktop ? "w-10 h-10" : "w-9 h-9"}`}
                  >
                    <Feather
                      name="chevron-right"
                      size={isDesktop ? 18 : 16}
                      color={T.textMuted}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={true}
              className="bg-white"
            >
              <View className="w-[1680px]">
                {/* Header */}
                <View className="flex-row bg-[#F8FAFC] border-b-2 border-[#E2E8F0]">
                  <View className="w-[60px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Sr.
                    </Text>
                  </View>
                  <View className="w-[110px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      NCR No.
                    </Text>
                  </View>
                  <View className="w-[100px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Audit Date
                    </Text>
                  </View>
                  <View className="w-[140px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Auditor Name
                    </Text>
                  </View>
                  <View className="w-[140px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Auditee Name
                    </Text>
                  </View>
                  <View className="w-[250px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Observation
                    </Text>
                    <Text className="text-[10px] font-normal text-[#6B7280] lowercase">
                      Description of non conformity
                    </Text>
                  </View>
                  <View className="w-[100px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Dept.
                    </Text>
                  </View>
                  <View className="w-[200px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Corrective Action
                    </Text>
                  </View>
                  <View className="w-[100px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Audit
                    </Text>
                  </View>
                  <View className="w-[120px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Responsibility
                    </Text>
                  </View>
                  <View className="w-[110px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Target Date
                    </Text>
                  </View>
                  <View className="w-[130px] p-3 border-r border-[#E2E8F0] shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider">
                      Impl. Status
                    </Text>
                  </View>
                  <View className="w-[120px] p-3 shrink-0">
                    <Text className="text-[11px] font-bold text-[#000000] uppercase tracking-wider text-center">
                      Status
                    </Text>
                  </View>
                </View>

                {/* Rows */}
                {filteredRows.length === 0 ? (
                  <View className="items-center w-full p-10">
                    <Text className="text-sm text-[#6B7280]">
                      {formData.rows.length === 0
                        ? "No NCR records found"
                        : "No records match the current filters"}
                    </Text>
                  </View>
                ) : (
                  filteredRows.map((row, index) => (
                    <View
                      key={`${row.ncNo}-${index}`}
                      className="flex-row border-b border-[#E2E8F0]"
                    >
                      <View className="w-[60px] p-3.5 border-r border-[#E2E8F0] bg-white shrink-0">
                        <Text
                          className="text-sm text-[#6B7280]"
                          style={{ fontFamily: "monospace" }}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <View className="w-[110px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <HighlightText
                          text={row.ncNo}
                          query={filters.search || filters.ncNo}
                        />
                      </View>
                      <View className="w-[100px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <HighlightText
                          text={row.auditDate || "—"}
                          query={filters.search}
                        />
                      </View>
                      <View className="w-[140px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <Text numberOfLines={1} ellipsizeMode="tail">
                          <HighlightText
                            text={row.auditorName}
                            query={filters.search}
                          />
                        </Text>
                      </View>
                      <View className="w-[140px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <Text numberOfLines={1} ellipsizeMode="tail">
                          <HighlightText
                            text={row.auditeeName}
                            query={filters.search}
                          />
                        </Text>
                      </View>
                      <View className="w-[250px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <View className="flex-row items-start gap-2">
                          <View className="flex-1">
                            <Text numberOfLines={2} ellipsizeMode="tail">
                              <HighlightText
                                text={row.observation || "—"}
                                query={filters.search}
                              />
                            </Text>
                          </View>
                          {row.observation && row.observation.length > 100 && (
                            <Pressable
                              onPress={() =>
                                handleOpenObservation(row.observation, row.ncNo)
                              }
                              className={`w-7 h-7 rounded-md border border-[${T.accentBorder}] bg-[${T.accentLight}] items-center justify-center shrink-0`}
                            >
                              <Feather
                                name="maximize-2"
                                size={14}
                                color={T.accent}
                              />
                            </Pressable>
                          )}
                        </View>
                      </View>
                      <View className="w-[100px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <HighlightText
                          text={row.department || "—"}
                          query={filters.search}
                        />
                      </View>
                      <View className="w-[200px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <Text numberOfLines={2} ellipsizeMode="tail">
                          <HighlightText
                            text={row.correctiveAction || "—"}
                            query={filters.search}
                          />
                        </Text>
                      </View>
                      <View className="w-[100px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <HighlightText
                          text={row.audit || "—"}
                          query={filters.search}
                        />
                      </View>
                      <View className="w-[120px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <Text numberOfLines={1} ellipsizeMode="tail">
                          <HighlightText
                            text={row.responsibility || "—"}
                            query={filters.search}
                          />
                        </Text>
                      </View>
                      <View className="w-[110px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <Text className="text-sm text-[#1F2937]">
                          {row.targetDate || "—"}
                        </Text>
                      </View>
                      <View className="w-[130px] p-3.5 justify-center border-r border-[#E2E8F0] shrink-0">
                        <HighlightText
                          text={row.implementationStatus || "—"}
                          query={filters.search}
                        />
                      </View>
                      <View className="w-[120px] p-3.5 items-center justify-center shrink-0">
                        <StatusBadge status={row.status} />
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            {filteredRows.length > 0 && (
              <View
                className={`p-3 bg-[#F8FAFC] border-t border-[${T.border}] flex-row justify-between items-center`}
              >
                <Text className="text-xs text-[#6B7280]">
                  Showing{" "}
                  <Text className="font-semibold text-[#1F2937]">
                    {filteredRows.length}
                  </Text>
                  {activeFilterCount > 0 && (
                    <>
                      {" "}
                      of{" "}
                      <Text className="font-semibold text-[#1F2937]">
                        {formData.rows.length}
                      </Text>{" "}
                      records
                    </>
                  )}
                  {activeFilterCount === 0 && <> records</>}
                </Text>
                <Text className="text-xs text-[#6B7280]">
                  Last updated:{" "}
                  <Text className="font-semibold text-[#1F2937]">
                    {new Date().toLocaleTimeString()}
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* Helper Text */}
          <View className="items-center mt-6 mb-8">
            <Text className="text-xs text-[#6B7280] text-center">
              💡 <Text className="font-semibold">Tip:</Text> Use the Filters &
              Search panel to narrow results • Click the maximize icon to view
              full observation details
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <ObservationModal
        isOpen={modalOpen}
        onClose={handleCloseObservation}
        observation={selectedObservation.text}
        ncNo={selectedObservation.ncNo}
      />
    </KeyboardAvoidingView>
  );
}
