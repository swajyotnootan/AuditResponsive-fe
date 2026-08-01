import { auditScheduleApi } from "@/services/auditScheduleApi";
import {
    AlertCircle,
    Briefcase,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    List,
    Save,
    Search,
    Shield,
    User,
    UserCheck,
    Users,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

const departmentDisplayToEnum: Record<string, string> = {
  HR: "HR",
  "R&D": "ENGG",
  Purchase: "PURCHASE",
  RMS: "STORES_DESPATCH",
  SQA: "QA",
  PPC: "PPC",
  Production: "PRODUCTION",
  "QA/QC": "QA",
  FGS: "STORES_DESPATCH",
  Marketing: "MARKETING",
  "IMS (BE)": "MR",
  Maintenance: "PLANT_MAINTENANCE",
  Management: "UNIT_HEAD",
  "Plant Maintenance": "PLANT_MAINTENANCE",
  "Tool Maintenance": "TOOL_MAINTENANCE",
  "Stores & Despatch": "STORES_DESPATCH",
};
const weeksList = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE USER SELECT MODAL (Optimized for Mobile)
// ═══════════════════════════════════════════════════════════════════════════════
const SingleUserSelectModal = ({
  isOpen,
  onClose,
  options,
  selectedId,
  onSelect,
  title,
  emptyMsg,
}: any) => {
  const [search, setSearch] = useState("");
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((opt: any) =>
    `${opt.firstName} ${opt.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 p-4 bg-black/40"
          activeOpacity={1}
          onPress={onClose}
        >
          {/* ✅ CRITICAL FIX: Added 'flex-1' so the inner ScrollView doesn't collapse to 0 height */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-base font-bold text-gray-900">{title}</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-10 text-[13px] text-gray-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-gray-500">
                    {emptyMsg || "No options available"}
                  </Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = String(item.id);
                  const isSelected = selectedId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className={`flex-row items-center gap-3 p-3 rounded-lg mb-1 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-[1.5px] justify-center items-center ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                      >
                        {isSelected && (
                          <View className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </View>
                      <Text
                        className={`flex-1 text-[13px] ${isSelected ? "font-semibold text-blue-600" : "text-gray-900"}`}
                        numberOfLines={1}
                      >
                        ✅ {item.firstName} {item.lastName}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-SELECT MODAL (Optimized for Mobile)
// ═══════════════════════════════════════════════════════════════════════════════
const MultiSelectModal = ({
  isOpen,
  onClose,
  options,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  emptyMsg,
  title,
}: any) => {
  const [search, setSearch] = useState("");
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((opt: any) =>
    `${opt.firstName} ${opt.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 p-4 bg-black/40"
          activeOpacity={1}
          onPress={onClose}
        >
          {/* ✅ CRITICAL FIX: Added 'flex-1' so the inner ScrollView doesn't collapse to 0 height */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {selectedIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-10 text-[13px] text-gray-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
            <View className="flex-row gap-2 p-2 border-b border-gray-200">
              <TouchableOpacity
                onPress={onSelectAll}
                className="items-center flex-1 py-2 rounded-md bg-blue-50"
              >
                <Text className="text-xs font-semibold text-blue-600">
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClearAll}
                className="items-center flex-1 py-2 rounded-md bg-blue-50"
              >
                <Text className="text-xs font-semibold text-blue-600">
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-gray-500">{emptyMsg}</Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = item.id.toString();
                  const checked = selectedIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => onToggle(item)}
                      className={`flex-row items-center gap-3 p-3 rounded-lg mb-1 ${checked ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`w-5 h-5 rounded border-[1.5px] justify-center items-center ${checked ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}
                      >
                        {checked && <Check size={14} color="#FFF" />}
                      </View>
                      <Text
                        className={`flex-1 text-[13px] ${checked ? "font-semibold text-blue-600" : "text-gray-900"}`}
                        numberOfLines={1}
                      >
                        {item.firstName} {item.lastName}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View className="flex-row justify-end p-4 border-t border-gray-200 bg-gray-50">
              <TouchableOpacity
                onPress={onClose}
                className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg"
              >
                <Text className="text-sm font-semibold text-gray-900">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT ELEMENTS DROPDOWN (Optimized for Mobile)
// ═══════════════════════════════════════════════════════════════════════════════
const AuditElementsDropdown = ({
  isOpen,
  onClose,
  options,
  selected,
  onChange,
  title,
}: any) => {
  const [search, setSearch] = useState("");
  const safeOptions = options || [];
  const filteredOptions = safeOptions.filter((opt: string) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 p-4 bg-black/40"
          activeOpacity={1}
          onPress={onClose}
        >
          {/* ✅ CRITICAL FIX: Added 'flex-1' so the inner ScrollView doesn't collapse to 0 height */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Select one option
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-10 text-[13px] text-gray-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-gray-500">
                    No options available
                  </Text>
                </View>
              ) : (
                filteredOptions.map((item: string, idx: number) => {
                  const isSelected = selected === item;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        onChange(item);
                        onClose();
                      }}
                      className={`flex-row items-center justify-between p-3 rounded-lg mb-1 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <Text
                        className={`flex-1 text-[13px] ${isSelected ? "font-semibold text-blue-600" : "text-gray-900"}`}
                        numberOfLines={1}
                      >
                        {item}
                      </Text>
                      {isSelected && <Check size={16} color="#3B82F6" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCHEDULE MODAL (Balanced 2-Column Layout)
// ═══════════════════════════════════════════════════════════════════════════════
const ScheduleModal = ({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  departments,
  deptPlanData,
  selectedMonth,
  editingSchedule,
  saving,
  selectedYear,
  allSchedules = [],
}: any) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const colClass = isDesktop ? "w-1/2" : "w-full"; // Full width on mobile, half on desktop
  const inputHeight = isDesktop ? "h-[40px]" : "h-[48px]"; // Taller inputs for mobile touch
  const textSize = isDesktop ? "text-[12px]" : "text-[14px]"; // Slightly larger text on mobile
  const iconSize = isDesktop ? 14 : 18;
  const [departmentLeadAuditors, setDepartmentLeadAuditors] = useState<any[]>(
    [],
  );
  const [departmentTeamAuditors, setDepartmentTeamAuditors] = useState<any[]>(
    [],
  );
  const [departmentAuditees, setDepartmentAuditees] = useState<any[]>([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);

  const [fullyCompetentLeadAuditors, setFullyCompetentLeadAuditors] = useState<
    any[]
  >([]);
  const [fullyCompetentTeamAuditors, setFullyCompetentTeamAuditors] = useState<
    any[]
  >([]);
  const [loadingCompetent, setLoadingCompetent] = useState(false);
  const [competencyStatus, setCompetencyStatus] = useState<any>(null);

  const [selectedLeadAuditor, setSelectedLeadAuditor] = useState("");
  const [selectedTeamAuditors, setSelectedTeamAuditors] = useState<string[]>(
    [],
  );
  const [teamAuditorNames, setTeamAuditorNames] = useState<string[]>([]);
  const [selectedCoAuditors, setSelectedCoAuditors] = useState<string[]>([]);
  const [selectedCoAuditorNames, setSelectedCoAuditorNames] = useState<
    string[]
  >([]);
  const [selectedAuditees, setSelectedAuditees] = useState<string[]>([]);
  const [selectedAuditeeNames, setSelectedAuditeeNames] = useState<string[]>(
    [],
  );
  const [errors, setErrors] = useState<any>({});

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAuditeeModal, setShowAuditeeModal] = useState(false);
  const [showElementsModal, setShowElementsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showLeadAuditorModal, setShowLeadAuditorModal] = useState(false);

  const extractData = (response: any) => {
    if (Array.isArray(response)) return response;
    return response?.data !== undefined ? response.data : response;
  };

  const availableAuditElements = useMemo(() => {
    if (!formData.department) return [];
    const departmentData = deptPlanData[formData.department];
    if (departmentData && Array.isArray(departmentData)) {
      const monthData = departmentData.find(
        (m: any) => m.month === selectedMonth,
      );
      const allElements = monthData?.elements || [];
      if (formData.week && allSchedules.length > 0) {
        const scheduledElementsInWeek = allSchedules
          .filter(
            (s: any) =>
              s.department === formData.department &&
              s.week === formData.week &&
              s.month === selectedMonth &&
              s.auditElements &&
              s.auditElements.length > 0 &&
              s.id !== editingSchedule?.id,
          )
          .flatMap((s: any) => s.auditElements);
        return allElements.filter(
          (el: string) => !scheduledElementsInWeek.includes(el),
        );
      }
      return allElements;
    }
    return [];
  }, [
    formData.department,
    formData.week,
    deptPlanData,
    selectedMonth,
    allSchedules,
    editingSchedule,
  ]);

  const fetchFullyCompetentAuditors = useCallback(async () => {
    if (
      !formData.department ||
      !formData.auditElements ||
      formData.auditElements.length === 0
    ) {
      setFullyCompetentLeadAuditors([]);
      setFullyCompetentTeamAuditors([]);
      return;
    }
    try {
      setLoadingCompetent(true);
      const enumValue = String(
        departmentDisplayToEnum[formData.department] ||
          formData.department.toUpperCase().replace(/[&\s/]+/g, "_"),
      );
      const response = await auditScheduleApi.getFullyCompetentAuditors(
        enumValue,
        formData.auditElements,
        selectedYear,
        selectedMonth,
      );
      const fullyCompetentAuditors = extractData(response);

      const leads = fullyCompetentAuditors.filter(
        (a: any) => a.role === "LEAD_AUDITOR",
      );
      const teams = fullyCompetentAuditors.filter(
        (a: any) => a.role === "AUDITOR",
      );

      setFullyCompetentLeadAuditors(leads);
      setFullyCompetentTeamAuditors(teams);

      if (
        selectedLeadAuditor &&
        !fullyCompetentAuditors.some(
          (a: any) => String(a.id) === String(selectedLeadAuditor),
        )
      ) {
        setSelectedLeadAuditor("");
        setCompetencyStatus(null);
      }
    } catch (error: any) {
      console.error(
        "❌ ERROR fetching fully competent auditors:",
        error.message || error,
      );
      setFullyCompetentLeadAuditors([]);
      setFullyCompetentTeamAuditors([]);
    } finally {
      setLoadingCompetent(false);
    }
  }, [
    formData.department,
    formData.auditElements,
    selectedYear,
    selectedMonth,
    selectedLeadAuditor,
  ]);

  const checkAuditorCompetency = useCallback(
    async (auditorId: string) => {
      if (
        !auditorId ||
        !formData.department ||
        !formData.auditElements ||
        formData.auditElements.length === 0
      ) {
        setCompetencyStatus(null);
        return;
      }
      try {
        const enumValue =
          departmentDisplayToEnum[formData.department] ||
          formData.department.toUpperCase().replace(/[&\s/]+/g, "_");
        const response = await auditScheduleApi.getAuditorCompetencyStatus(
          auditorId,
          enumValue,
          formData.auditElements,
        );
        setCompetencyStatus(extractData(response));
      } catch (error: any) {
        console.error("❌ Error checking competency:", error.message || error);
        setCompetencyStatus(null);
      }
    },
    [formData.department, formData.auditElements],
  );

  useEffect(() => {
    if (
      formData.department &&
      formData.auditElements &&
      formData.auditElements.length > 0
    ) {
      fetchFullyCompetentAuditors();
    } else {
      setFullyCompetentLeadAuditors([]);
      setFullyCompetentTeamAuditors([]);
    }
  }, [
    formData.department,
    formData.auditElements,
    fetchFullyCompetentAuditors,
  ]);

  const fetchDepartmentUsers = useCallback(async (department: string) => {
    if (!department) {
      setDepartmentLeadAuditors([]);
      setDepartmentTeamAuditors([]);
      setDepartmentAuditees([]);
      return;
    }
    const enumValue = String(
      departmentDisplayToEnum[department] ||
        department.toUpperCase().replace(/[&\s/]+/g, "_"),
    );
    setLoadingDepartmentUsers(true);
    try {
      const [leadRes, regularRes, auditeesRes] = await Promise.all([
        auditScheduleApi.getLeadAuditorsByDepartment(enumValue),
        auditScheduleApi.getRegularAuditorsByDepartment(enumValue),
        auditScheduleApi.getAuditeesByDepartment(enumValue),
      ]);
      setDepartmentLeadAuditors(extractData(leadRes));
      setDepartmentTeamAuditors(extractData(regularRes));
      setDepartmentAuditees(
        extractData(auditeesRes).filter((u: any) => u.role !== "HOD"),
      );
    } catch (err: any) {
      console.error("❌ Error fetching department users:", err.message || err);
    } finally {
      setLoadingDepartmentUsers(false);
    }
  }, []);

  const fetchDepartmentMapping = useCallback(async (department: string) => {
    if (!department) return;
    try {
      const res = await auditScheduleApi.getDepartmentMapping(department);
      setDepartmentInfo(extractData(res));
    } catch {
      const localMapping: Record<string, string[]> = {
        HR: ["HR"],
        "R&D": ["R&D"],
        Purchase: ["Purchase"],
        RMS: ["RMS"],
        SQA: ["Quality", "Purchase"],
        PPC: ["PPC"],
        Production: ["Production"],
        "QA/QC": ["Quality", "Lab & Calibration"],
        FGS: ["FGS"],
        Marketing: ["Sales & Marketing"],
        "IMS (BE)": ["MR", "QMs/IMS/MR office", "Top Management", "Quality"],
        Maintenance: ["Maintenance"],
        Management: ["MR", "QMs/IMS/MR office", "Top Management"],
        "Plant Maintenance": ["Maintenance"],
        "Tool Maintenance": ["Maintenance"],
        "Stores & Despatch": ["Store", "RMS", "FGS"],
      };
      setDepartmentInfo({
        department,
        iatfProcesses: localMapping[department] || [],
        hasForms: !!localMapping[department],
      });
    }
  }, []);

  const resetSelections = useCallback(() => {
    setSelectedLeadAuditor("");
    setSelectedTeamAuditors([]);
    setTeamAuditorNames([]);
    setSelectedCoAuditors([]);
    setSelectedCoAuditorNames([]);
    setSelectedAuditees([]);
    setSelectedAuditeeNames([]);
    setCompetencyStatus(null);
    setFullyCompetentLeadAuditors([]);
    setFullyCompetentTeamAuditors([]);
    setErrors({});
  }, []);

  const handleDepartmentChange = async (dept: string) => {
    if (!dept) return;
    resetSelections();
    setFormData({
      ...formData,
      department: dept,
      month: selectedMonth,
      auditElements: [],
      week: "",
      status: "SCHEDULED",
    });
    await Promise.all([
      fetchDepartmentUsers(dept),
      fetchDepartmentMapping(dept),
    ]);
  };

  const handleTeamAuditorToggle = (auditor: any) => {
    const id = auditor.id.toString();
    const name = `${auditor.firstName} ${auditor.lastName}`;
    const inList = selectedTeamAuditors.includes(id);
    const nextIds = inList
      ? selectedTeamAuditors.filter((x) => x !== id)
      : [...selectedTeamAuditors, id];
    const nextNames = inList
      ? teamAuditorNames.filter((n) => n !== name)
      : [...teamAuditorNames, name];
    setSelectedTeamAuditors(nextIds);
    setTeamAuditorNames(nextNames);
    setSelectedCoAuditors(nextIds);
    setSelectedCoAuditorNames(nextNames);
    if (errors.team) setErrors((e: any) => ({ ...e, team: "" }));
  };

  const handleSelectAllTeam = () => {
    setSelectedTeamAuditors(
      fullyCompetentTeamAuditors.map((a) => a.id.toString()),
    );
    setTeamAuditorNames(
      fullyCompetentTeamAuditors.map((a) => `${a.firstName} ${a.lastName}`),
    );
    setSelectedCoAuditors(
      fullyCompetentTeamAuditors.map((a) => a.id.toString()),
    );
    setSelectedCoAuditorNames(
      fullyCompetentTeamAuditors.map((a) => `${a.firstName} ${a.lastName}`),
    );
    if (errors.team) setErrors((e: any) => ({ ...e, team: "" }));
  };

  const handleAuditeeToggle = (auditee: any) => {
    const id = auditee.id.toString();
    const name = `${auditee.firstName} ${auditee.lastName}`;
    const inList = selectedAuditees.includes(id);
    setSelectedAuditees((prev) =>
      inList ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setSelectedAuditeeNames((prev) =>
      inList ? prev.filter((n) => n !== name) : [...prev, name],
    );
    if (errors.auditees) setErrors((e: any) => ({ ...e, auditees: "" }));
  };

  const handleSelectAllAuditees = () => {
    setSelectedAuditees(departmentAuditees.map((a) => a.id.toString()));
    setSelectedAuditeeNames(
      departmentAuditees.map((a) => `${a.firstName} ${a.lastName}`),
    );
    setErrors((e: any) => ({ ...e, auditees: "" }));
  };

  const handleSubmit = () => {
    const newErrors: any = {};
    if (!formData.department) newErrors.department = "Select a department";
    if (!formData.week) newErrors.week = "Choose an audit week";
    if (!selectedLeadAuditor) newErrors.lead = "Assign a lead auditor";
    if (selectedAuditees.length === 0)
      newErrors.auditees = "Add at least one auditee";
    if (selectedTeamAuditors.length === 0)
      newErrors.team = "Assign at least one team auditor";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const isFullyCompetent = fullyCompetentLeadAuditors.some(
      (a) => String(a.id) === String(selectedLeadAuditor),
    );
    if (
      !isFullyCompetent &&
      formData.auditElements &&
      formData.auditElements.length > 0
    ) {
      Alert.alert(
        "Warning",
        "Selected lead auditor is NOT fully competent for all audit elements. Do you want to proceed anyway?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Proceed", onPress: performSave },
        ],
      );
      return;
    }
    performSave();
  };

  const performSave = () => {
    const lead = departmentLeadAuditors.find(
      (a) => String(a.id) === String(selectedLeadAuditor),
    );
    onSave({
      ...formData,
      auditorId: selectedLeadAuditor,
      leadAuditorId: selectedLeadAuditor,
      leadAuditorName: lead ? `${lead.firstName} ${lead.lastName}` : "",
      teamAuditorIds: selectedTeamAuditors.map(Number),
      teamAuditorNames,
      coAuditorIdList: selectedCoAuditors.map(Number),
      coAuditorNames: selectedCoAuditorNames,
      auditeeId:
        selectedAuditees.length === 1 ? Number(selectedAuditees[0]) : null,
      auditeeIdList: selectedAuditees.map(Number),
      auditeeNames: selectedAuditeeNames,
      status: formData.status || "SCHEDULED",
    });
  };

  useEffect(() => {
    if (!editingSchedule || !isOpen || !formData.department) return;
    setSelectedLeadAuditor(
      editingSchedule.leadAuditorId?.toString() ||
        editingSchedule.auditorId?.toString() ||
        "",
    );

    let teamIds =
      editingSchedule.coAuditorIdList || editingSchedule.teamAuditorIds || [];
    let teamNames =
      editingSchedule.coAuditorNames || editingSchedule.teamAuditorNames || [];
    if (typeof teamIds === "string") {
      try {
        teamIds = JSON.parse(teamIds);
      } catch {
        teamIds = [];
      }
    }
    if (typeof teamNames === "string") {
      try {
        teamNames = JSON.parse(teamNames);
      } catch {
        teamNames = [];
      }
    }

    setSelectedTeamAuditors(Array.isArray(teamIds) ? teamIds.map(String) : []);
    setTeamAuditorNames(Array.isArray(teamNames) ? teamNames : []);
    setSelectedCoAuditors(Array.isArray(teamIds) ? teamIds.map(String) : []);
    setSelectedCoAuditorNames(Array.isArray(teamNames) ? teamNames : []);

    let auditeeIds: any[] = [],
      auditeeNamesList: any[] = [];
    if (editingSchedule.auditeeIdList?.length) {
      auditeeIds = editingSchedule.auditeeIdList;
      auditeeNamesList = editingSchedule.auditeeNames || [];
    } else if (editingSchedule.auditeeId) {
      auditeeIds = [editingSchedule.auditeeId];
      auditeeNamesList = editingSchedule.auditeeName
        ? [editingSchedule.auditeeName]
        : [];
    }
    setSelectedAuditees(
      Array.isArray(auditeeIds) ? auditeeIds.map(String) : [],
    );
    setSelectedAuditeeNames(
      Array.isArray(auditeeNamesList) ? auditeeNamesList : [],
    );

    fetchDepartmentUsers(formData.department);
    fetchDepartmentMapping(formData.department);
  }, [editingSchedule, isOpen, formData.department]);

  useEffect(() => {
    if (isOpen && formData.department && !editingSchedule) {
      fetchDepartmentUsers(formData.department);
      fetchDepartmentMapping(formData.department);
    }
  }, [isOpen, formData.department, editingSchedule]);

  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDepartmentInfo(null);
    }
  }, [isOpen, resetSelections]);

  useEffect(() => {
    if (isOpen && !editingSchedule) {
      if (formData.auditElements && formData.auditElements.length > 0) {
        setFormData((prev: any) => ({ ...prev, auditElements: [] }));
      }
    }
  }, [isOpen, editingSchedule]);

  useEffect(() => {
    if (selectedLeadAuditor) checkAuditorCompetency(selectedLeadAuditor);
    else setCompetencyStatus(null);
  }, [selectedLeadAuditor, checkAuditorCompetency]);

  if (!isOpen) return null;

  const step1Done = !!formData.department;
  const step2Done = !!selectedLeadAuditor;
  const step3Done = selectedAuditees.length > 0;
  const step4Done = !!formData.week;
  const step5Done = selectedTeamAuditors.length > 0;
  const isReady = step1Done && step2Done && step3Done && step4Done && step5Done;
  const completedSteps = [
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    step5Done,
  ].filter(Boolean).length;
  const hasAuditElements =
    formData.auditElements && formData.auditElements.length > 0;
  const hasFullyCompetentLeads = fullyCompetentLeadAuditors.length > 0;
  const hasFullyCompetentTeams = fullyCompetentTeamAuditors.length > 0;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="items-center justify-center flex-1 p-4 bg-black/30">
        <View
          className={`bg-white rounded-2xl shadow-xl overflow-hidden flex-1 ${isDesktop ? "max-w-[840px] w-[95%]" : "w-[95%]"}`}
          style={{ maxHeight: "82%" }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 bg-white border-b border-gray-200">
            <View className="flex-row items-center flex-1 gap-3">
              <View className="items-center justify-center w-10 h-10 border border-blue-100 rounded-xl bg-blue-50">
                <Calendar size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-black">
                  {editingSchedule
                    ? "Edit Audit Schedule"
                    : "New Audit Schedule"}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">
                  {editingSchedule
                    ? "Update details."
                    : "Fill in the required fields."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 border border-gray-200 rounded-lg bg-gray-50"
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View className="h-[3px] bg-gray-100 w-full">
            <View
              className="h-full bg-blue-500"
              style={{ width: `${(completedSteps / 5) * 100}%` }}
            />
          </View>

          {/* ✅ CRITICAL FIX: flex-1 ScrollView with proper contentContainerStyle */}
          <ScrollView
            className="flex-1 bg-gray-50"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ padding: 16 }}
            style={{ flex: 1 }}
          >
            {hasAuditElements && (
              <View
                className={`mb-4 p-3 border rounded-lg flex-row items-start gap-3 ${hasFullyCompetentLeads || hasFullyCompetentTeams ? "bg-blue-50 border-blue-100" : "bg-yellow-50 border-yellow-200"}`}
              >
                <Shield
                  size={16}
                  color={
                    hasFullyCompetentLeads || hasFullyCompetentTeams
                      ? "#3B82F6"
                      : "#92400E"
                  }
                />
                <View className="flex-1">
                  <Text
                    className={`font-semibold mb-1 text-[12px] ${hasFullyCompetentLeads || hasFullyCompetentTeams ? "text-blue-600" : "text-yellow-800"}`}
                  >
                    {hasFullyCompetentLeads || hasFullyCompetentTeams
                      ? "✅ Fully Competent Auditors Available"
                      : "⚠️ No Fully Competent Auditors"}
                  </Text>
                  <Text
                    className={`text-[11px] opacity-90 ${hasFullyCompetentLeads || hasFullyCompetentTeams ? "text-blue-600" : "text-yellow-800"}`}
                  >
                    {hasFullyCompetentLeads && (
                      <Text>
                        Lead:{" "}
                        <Text className="font-bold">
                          {fullyCompetentLeadAuditors.length}
                        </Text>{" "}
                      </Text>
                    )}
                    {hasFullyCompetentTeams && (
                      <Text>
                        Team:{" "}
                        <Text className="font-bold">
                          {fullyCompetentTeamAuditors.length}
                        </Text>{" "}
                      </Text>
                    )}
                    {!hasFullyCompetentLeads && !hasFullyCompetentTeams && (
                      <Text>
                        No auditors are competent for all{" "}
                        {formData.auditElements.length} element(s).
                      </Text>
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* ✅ 2-COLUMN GRID LAYOUT */}
            <View className="flex-row flex-wrap -mx-2">
              {/* 1. Department */}
              <View className={`${colClass} px-2 mb-4`}>
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Briefcase size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Department
                  </Text>
                  <Text className="text-[13px] font-bold text-red-600">*</Text>
                </View>
                <TouchableOpacity
                  className={`w-full h-[40px] px-2 flex-row items-center gap-1.5 border rounded-lg bg-white ${errors.department ? "border-red-200" : "border-gray-200"} ${editingSchedule ? "opacity-70" : ""}`}
                  disabled={!!editingSchedule}
                  onPress={() => setShowDepartmentModal(true)}
                >
                  <Briefcase
                    size={14}
                    color={errors.department ? "#DC2626" : "#475569"}
                  />
                  <Text
                    className={`flex-1 ${textSize} leading-5 ${!formData.department ? "text-gray-500" : "text-gray-900"}`}
                    numberOfLines={2} // ✅ CRITICAL FIX: Allows text to wrap to a second line instead of hiding
                  >
                    {formData.department || "Select dept..."}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* 2. Audit Element */}
              <View className="w-1/2 px-2 mb-4">
                <View className="flex-row items-center gap-1 mb-1.5">
                  <List size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Element
                  </Text>
                </View>
                {!formData.department ? (
                  <View className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-gray-50">
                    <List size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept first
                    </Text>
                  </View>
                ) : availableAuditElements.length === 0 ? (
                  <View className="w-full h-[40px] items-center justify-center bg-white border border-gray-200 rounded-lg px-2">
                    <Text className="text-[10px] text-gray-500 text-center">
                      No elements
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-white"
                    onPress={() => setShowElementsModal(true)}
                  >
                    <List size={14} color="#475569" />
                    <Text
                      className={`flex-1 text-[12px] ${!formData.auditElements?.[0] ? "text-gray-500" : "text-gray-900"}`}
                      numberOfLines={1}
                    >
                      {formData.auditElements?.[0] || "Select..."}
                    </Text>
                    <ChevronDown size={14} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 3. Lead Auditor */}
              <View className="w-1/2 px-2 mb-4">
                <View className="flex-row items-center gap-1 mb-1.5">
                  <UserCheck size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">Lead</Text>
                  <Text className="text-[13px] font-bold text-red-600">*</Text>
                </View>
                {!formData.department || !hasAuditElements ? (
                  <View className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-gray-50">
                    <UserCheck size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept/element
                    </Text>
                  </View>
                ) : loadingDepartmentUsers || loadingCompetent ? (
                  <View className="w-full h-[40px] flex-row items-center justify-center gap-1.5 bg-white border border-gray-200 rounded-lg">
                    <ActivityIndicator size="small" color="#6B7280" />
                    <Text className="text-[11px] text-gray-500">
                      Checking...
                    </Text>
                  </View>
                ) : !hasFullyCompetentLeads && hasAuditElements ? (
                  <View className="w-full h-[40px] flex-row items-center gap-1.5 px-2 border border-red-100 rounded-lg bg-red-50">
                    <AlertCircle size={14} color="#DC2626" />
                    <Text className="flex-1 text-[11px] text-red-600">
                      No competent lead
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`w-full h-[40px] px-2 flex-row items-center gap-1.5 border rounded-lg bg-white ${errors.lead ? "border-red-200" : "border-gray-200"}`}
                    onPress={() => setShowLeadAuditorModal(true)}
                  >
                    <UserCheck
                      size={14}
                      color={errors.lead ? "#DC2626" : "#475569"}
                    />
                    <Text
                      className={`flex-1 text-[12px] ${!selectedLeadAuditor ? "text-gray-500" : "text-gray-900"}`}
                      numberOfLines={1}
                    >
                      {selectedLeadAuditor
                        ? `✅ ${fullyCompetentLeadAuditors.find((a) => String(a.id) === String(selectedLeadAuditor))?.firstName}`
                        : "Select lead..."}
                    </Text>
                    <ChevronDown size={14} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 4. Audit Week */}
              {/* 4. Audit Week */}
              <View className={`${colClass} px-1 mb-4`}>
                {" "}
                {/* ✅ Changed w-1/2 to colClass */}
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <Calendar size={iconSize} color="#475569" />
                  <Text className={`${textSize} font-bold text-black`}>
                    Week
                  </Text>
                  <Text className={`${textSize} font-bold text-red-600`}>
                    *
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {" "}
                  {/* ✅ Increased gap for mobile */}
                  {weeksList.map((w) => {
                    const active = formData.week === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        onPress={() => {
                          setFormData({ ...formData, week: w });
                          setErrors((e: any) => ({ ...e, week: "" }));
                        }}
                        className={`flex-1 min-w-[40px] ${inputHeight} rounded-xl border flex-row items-center justify-center ${active ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"}`}
                      >
                        <Text
                          className={`text-[13px] font-semibold ${active ? "text-blue-600" : "text-gray-900"}`}
                        >
                          {w}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Team Auditors */}
              <View className="w-1/2 px-2 mb-4">
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Users size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">Team</Text>
                </View>
                {!formData.department || !hasAuditElements ? (
                  <View className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-gray-50">
                    <Users size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept/element
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`w-full h-[40px] px-2 flex-row items-center gap-1.5 border rounded-lg bg-white ${errors.team ? "border-red-200" : "border-gray-200"}`}
                    onPress={() => setShowTeamModal(true)}
                    disabled={!hasFullyCompetentTeams}
                  >
                    <Users
                      size={14}
                      color={errors.team ? "#DC2626" : "#475569"}
                    />
                    <Text
                      className={`flex-1 text-[12px] ${selectedTeamAuditors.length === 0 ? "text-gray-500" : "text-gray-900"}`}
                      numberOfLines={1}
                    >
                      {selectedTeamAuditors.length === 0
                        ? "Select team..."
                        : `${selectedTeamAuditors.length} selected`}
                    </Text>
                    <ChevronDown size={14} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 6. Auditees */}
              <View className="w-1/2 px-2 mb-4">
                <View className="flex-row items-center gap-1 mb-1.5">
                  <User size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Auditees
                  </Text>
                  <Text className="text-[13px] font-bold text-red-600">*</Text>
                </View>
                {!formData.department ? (
                  <View className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-gray-50">
                    <User size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept first
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`w-full h-[40px] px-2 flex-row items-center gap-1.5 border rounded-lg bg-white ${errors.auditees ? "border-red-200" : "border-gray-200"}`}
                    onPress={() => setShowAuditeeModal(true)}
                  >
                    <User
                      size={14}
                      color={errors.auditees ? "#DC2626" : "#475569"}
                    />
                    <Text
                      className={`flex-1 text-[12px] ${selectedAuditees.length === 0 ? "text-gray-500" : "text-gray-900"}`}
                      numberOfLines={1}
                    >
                      {selectedAuditees.length === 0
                        ? "Select auditees..."
                        : `${selectedAuditees.length} selected`}
                    </Text>
                    <ChevronDown size={14} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 7. Status - ✅ Changed to w-full to fill the row and avoid empty space */}
              <View className="w-full px-2 mb-4">
                <View className="flex-row items-center gap-1 mb-1.5">
                  <Clock size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Status
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-full h-[40px] px-2 flex-row items-center gap-1.5 border border-gray-200 rounded-lg bg-white"
                  onPress={() => setShowStatusModal(true)}
                >
                  <Clock size={14} color="#475569" />
                  <Text className="flex-1 text-[12px] text-gray-900">
                    {formData.status || "SCHEDULED"}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer - Fixed at bottom */}
          <View
            className="flex-row items-center justify-between p-4 bg-white border-t border-gray-200"
            style={{ flexShrink: 0 }}
          >
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="items-center justify-center h-10 px-5 bg-white border border-gray-200 rounded-lg"
              >
                <Text className="text-sm font-semibold text-gray-900">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isReady || saving}
                className={`h-10 px-2 rounded-lg flex-row items-center gap-2 justify-center ${!isReady || saving ? "bg-gray-100" : "bg-blue-500"}`}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Save size={16} color="#000000" />
                )}
                <Text
                  className={`text-sm font-semibold ${!isReady || saving ? "text-gray-400" : "text-white"}`}
                >
                  {saving
                    ? "Saving..."
                    : editingSchedule
                      ? "Update Schedule"
                      : "Create Schedule"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sub-Modals (Keep your existing sub-modals exactly as they were here) */}
        <SingleUserSelectModal
          isOpen={showLeadAuditorModal}
          onClose={() => setShowLeadAuditorModal(false)}
          options={fullyCompetentLeadAuditors}
          selectedId={selectedLeadAuditor}
          onSelect={(user: any) => {
            setSelectedLeadAuditor(String(user.id));
            setErrors((v: any) => ({ ...v, lead: "" }));
          }}
          title="Select Lead Auditor"
          emptyMsg="No fully competent lead auditors available"
        />
        <MultiSelectModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          options={fullyCompetentTeamAuditors}
          selectedIds={selectedTeamAuditors}
          onToggle={handleTeamAuditorToggle}
          onSelectAll={handleSelectAllTeam}
          onClearAll={() => {
            setSelectedTeamAuditors([]);
            setTeamAuditorNames([]);
            setSelectedCoAuditors([]);
            setSelectedCoAuditorNames([]);
          }}
          emptyMsg="No matching auditors"
          title="Select Team Auditors"
        />
        <MultiSelectModal
          isOpen={showAuditeeModal}
          onClose={() => setShowAuditeeModal(false)}
          options={departmentAuditees}
          selectedIds={selectedAuditees}
          onToggle={handleAuditeeToggle}
          onSelectAll={handleSelectAllAuditees}
          onClearAll={() => {
            setSelectedAuditees([]);
            setSelectedAuditeeNames([]);
          }}
          emptyMsg="No matching auditees"
          title="Select Auditees"
        />
        <AuditElementsDropdown
          isOpen={showDepartmentModal}
          onClose={() => setShowDepartmentModal(false)}
          options={departments}
          selected={formData.department || ""}
          onChange={(dept: string) => {
            handleDepartmentChange(dept);
            setShowDepartmentModal(false);
          }}
          title="Select Department"
        />
        <AuditElementsDropdown
          isOpen={showElementsModal}
          onClose={() => setShowElementsModal(false)}
          options={availableAuditElements}
          selected={formData.auditElements?.[0] || ""}
          onChange={(element: string) => {
            setFormData({
              ...formData,
              auditElements: element ? [element] : [],
            });
            setShowElementsModal(false);
          }}
          title="Select Audit Element"
        />

        <Modal
          visible={showStatusModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStatusModal(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 p-5 bg-black/30"
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="bg-white rounded-2xl w-full max-w-sm max-h-[60%] shadow-xl overflow-hidden"
            >
              <View className="flex-row items-center justify-between p-5 border-b border-gray-200">
                <Text className="text-base font-bold text-gray-900">
                  Select Status
                </Text>
                <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <ScrollView className="p-1.5">
                {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                  (status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => {
                        setFormData({ ...formData, status });
                        setShowStatusModal(false);
                      }}
                      className={`flex-row items-center justify-between p-3 rounded-lg mb-1 ${formData.status === status ? "bg-blue-50" : ""}`}
                    >
                      <Text
                        className={`text-[13px] ${formData.status === status ? "font-semibold text-blue-600" : "text-gray-900"}`}
                      >
                        {status.replace("_", " ")}
                      </Text>
                      {formData.status === status && (
                        <Check size={16} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
};

export default ScheduleModal;
