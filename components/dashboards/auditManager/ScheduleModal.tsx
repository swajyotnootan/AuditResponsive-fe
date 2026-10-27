import { auditScheduleApi } from "@/services/auditScheduleApi";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  List,
  Save,
  Search,
  Shield,
  User,
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
  ViewStyle,
} from "react-native";

const weeksList = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];

// ═════ STRICT MONOCHROMATIC MNC PALETTE ════
const COLORS = {
  primary: "#2563EB",
  primaryLight: "#EFF6FF",
  primaryBorder: "#DBEAFE",
  primaryDark: "#1E3A8A",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textValue: "#334155",
  textMuted: "#64748B",
};

// ✅ Helper to unwrap API responses
const extractData = (response: any) => {
  if (Array.isArray(response)) return response;
  return response?.data !== undefined ? response.data : response;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE USER SELECT MODAL
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
          className="flex-1 items-center justify-center bg-black/40 p-4"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-200 p-4">
              <Text className="text-base font-bold text-slate-900">
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 border-b border-slate-200 bg-slate-50 p-3">
              <Search size={16} color="#94A3B8" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-slate-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-slate-500">
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
                      className={`mb-1 flex-row items-center gap-3 rounded-lg p-3 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}
                      >
                        {isSelected && (
                          <View className="h-2.5 w-2.5 rounded-full bg-white" />
                        )}
                      </View>
                      <Text
                        className={`flex-1 text-[13px] ${isSelected ? "font-semibold text-blue-600" : "text-slate-900"}`}
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
// MULTI-SELECT MODAL
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
          className="flex-1 items-center justify-center bg-black/40 p-4"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-200 p-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">
                  {title}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {selectedIds.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 border-b border-slate-200 bg-slate-50 p-3">
              <Search size={16} color="#94A3B8" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-slate-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>
            <View className="flex-row gap-2 border-b border-slate-200 p-2">
              <TouchableOpacity
                onPress={onSelectAll}
                className="flex-1 items-center rounded-md bg-blue-50 py-2"
              >
                <Text className="text-xs font-semibold text-blue-600">
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClearAll}
                className="flex-1 items-center rounded-md bg-blue-50 py-2"
              >
                <Text className="text-xs font-semibold text-blue-600">
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-slate-500">{emptyMsg}</Text>
                </View>
              ) : (
                filteredOptions.map((item: any) => {
                  const id = item.id.toString();
                  const checked = selectedIds.includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => onToggle(item)}
                      className={`mb-1 flex-row items-center gap-3 rounded-lg p-3 ${checked ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}
                      >
                        {checked && <Check size={14} color="#FFF" />}
                      </View>
                      <Text
                        className={`flex-1 text-[13px] ${checked ? "font-semibold text-blue-600" : "text-slate-900"}`}
                        numberOfLines={1}
                      >
                        {item.firstName} {item.lastName}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View className="flex-row justify-end border-t border-slate-200 bg-slate-50 p-4">
              <TouchableOpacity
                onPress={onClose}
                className="rounded-lg border border-slate-200 bg-white px-6 py-2.5"
              >
                <Text className="text-sm font-semibold text-slate-900">
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
// AUDIT ELEMENTS DROPDOWN
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
          className="flex-1 items-center justify-center bg-black/40 p-4"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: "85%" }}
          >
            <View className="flex-row items-center justify-between border-b border-slate-200 p-4">
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">
                  {title}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  Select one option
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 border-b border-slate-200 bg-slate-50 p-3">
              <Search size={16} color="#94A3B8" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-slate-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
            </View>
            <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View className="items-center p-6">
                  <Text className="text-[13px] text-slate-500">
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
                      className={`mb-1 flex-row items-center justify-between rounded-lg p-3 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <Text
                        className={`flex-1 text-[13px] ${isSelected ? "font-semibold text-blue-600" : "text-slate-900"}`}
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
// MAIN SCHEDULE MODAL - POPUP STYLE
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
  currentUserPlantId,
  currentUserPlantName,
}: any) => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [departmentAuditees, setDepartmentAuditees] = useState<any[]>([]);
  const [loadingDepartmentUsers, setLoadingDepartmentUsers] = useState(false);
  const [departmentInfo, setDepartmentInfo] = useState<any>(null);
  const [fullyCompetentTeamAuditors, setFullyCompetentTeamAuditors] = useState<
    any[]
  >([]);
  const [loadingCompetent, setLoadingCompetent] = useState(false);

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

  // ✅ Auto-fill plant
  useEffect(() => {
    if (!isOpen) return;
    if (
      editingSchedule?.plantId &&
      formData.plantId !== editingSchedule.plantId
    ) {
      setFormData((prev: any) => ({
        ...prev,
        plantId: editingSchedule.plantId,
        plantName:
          editingSchedule.plantName || `Plant ${editingSchedule.plantId}`,
      }));
      return;
    }
    if (currentUserPlantId && formData.plantId !== currentUserPlantId) {
      setFormData((prev: any) => ({
        ...prev,
        plantId: currentUserPlantId,
        plantName: currentUserPlantName || `Plant ${currentUserPlantId}`,
      }));
    }
  }, [
    isOpen,
    currentUserPlantId,
    currentUserPlantName,
    editingSchedule,
    formData.plantId,
    setFormData,
  ]);

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
              s.auditElements?.length > 0 &&
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

  const fetchFullyCompetentAuditors = useCallback(
    async (auditElements: string[], plantId: string | number) => {
      if (!plantId || !auditElements || auditElements.length === 0) {
        setFullyCompetentTeamAuditors([]);
        return;
      }
      try {
        setLoadingCompetent(true);
        const response = await auditScheduleApi.getFullyCompetentAuditors(
          auditElements,
          selectedYear,
          selectedMonth,
          plantId,
          formData.auditType,
        );
        const fullyCompetentAuditors = extractData(response);
        setFullyCompetentTeamAuditors(
          Array.isArray(fullyCompetentAuditors) ? fullyCompetentAuditors : [],
        );
      } catch (error: any) {
        setFullyCompetentTeamAuditors([]);
      } finally {
        setLoadingCompetent(false);
      }
    },
    [selectedYear, selectedMonth, formData.auditType],
  );

  useEffect(() => {
    if (formData.plantId && formData.auditElements?.length > 0) {
      fetchFullyCompetentAuditors(formData.auditElements, formData.plantId);
    } else {
      setFullyCompetentTeamAuditors([]);
    }
  }, [formData.plantId, formData.auditElements, fetchFullyCompetentAuditors]);

  const fetchDepartmentUsers = useCallback(
    async (
      department: string,
      plantId: string | number,
      auditElements: string[] = [],
    ) => {
      if (!department || !plantId) {
        setDepartmentAuditees([]);
        return;
      }
      if (!auditElements || auditElements.length === 0) {
        setDepartmentAuditees([]);
        setLoadingDepartmentUsers(false);
        return;
      }

      setLoadingDepartmentUsers(true);
      try {
        const auditeesRes =
          await auditScheduleApi.getCompetentAuditeesByDepartment(
            department,
            plantId,
            auditElements,
            formData.auditType,
          );
        const extracted = extractData(auditeesRes);
        setDepartmentAuditees(Array.isArray(extracted) ? extracted : []);
      } catch (err: any) {
        setDepartmentAuditees([]);
      } finally {
        setLoadingDepartmentUsers(false);
      }
    },
    [formData.auditType],
  );

  const fetchDepartmentMapping = useCallback(async (department: string) => {
    if (!department) return;
    try {
      const res = await auditScheduleApi.getDepartmentMapping(department);
      setDepartmentInfo(extractData(res));
    } catch {
      const localMapping: Record<string, string[]> = {
        HR: ["HR"],
        "R&D": ["RND"],
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
    setSelectedTeamAuditors([]);
    setTeamAuditorNames([]);
    setSelectedCoAuditors([]);
    setSelectedCoAuditorNames([]);
    setSelectedAuditees([]);
    setSelectedAuditeeNames([]);
    setFullyCompetentTeamAuditors([]);
    setErrors({});
  }, []);

  const handleDepartmentChange = async (dept: string) => {
    if (!dept || !formData.plantId) {
      Alert.alert("Please select a plant first");
      return;
    }
    resetSelections();
    setFormData({
      ...formData,
      department: dept,
      month: selectedMonth,
      auditElements: [],
      week: "",
      status: "SCHEDULED",
      auditType: "",
    });
    await fetchDepartmentUsers(dept, formData.plantId, []);
    await fetchDepartmentMapping(dept);
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
    if (!formData.plantId) newErrors.plant = "Select a plant";
    if (!formData.department) newErrors.department = "Select a department";
    if (!formData.week) newErrors.week = "Choose an audit week";
    if (selectedAuditees.length === 0)
      newErrors.auditees = "Add at least one auditee";
    if (selectedTeamAuditors.length === 0)
      newErrors.team = "Assign at least one team auditor";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const firstTeamMemberId = selectedTeamAuditors[0] || null;
    const firstTeamMemberName = teamAuditorNames[0] || "";
    onSave({
      ...formData,
      auditorId: firstTeamMemberId,
      leadAuditorId: firstTeamMemberId,
      leadAuditorName: firstTeamMemberName,
      plantId: formData.plantId,
      plantName: formData.plantName,
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

  // ✅ Restore editing schedule state
  useEffect(() => {
    if (!editingSchedule || !isOpen) return;
    const resolvedPlantId = editingSchedule.plantId || currentUserPlantId || "";
    const resolvedPlantName =
      editingSchedule.plantName ||
      currentUserPlantName ||
      (resolvedPlantId ? `Plant ${resolvedPlantId}` : "");
    setFormData((prev: any) => ({
      ...prev,
      plantId: resolvedPlantId,
      plantName: resolvedPlantName,
    }));

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

    if (editingSchedule.department && resolvedPlantId) {
      fetchDepartmentUsers(
        editingSchedule.department,
        resolvedPlantId,
        editingSchedule.auditElements || [],
      );
      fetchDepartmentMapping(editingSchedule.department);
    }
  }, [
    editingSchedule,
    isOpen,
    currentUserPlantId,
    currentUserPlantName,
    fetchDepartmentUsers,
    fetchDepartmentMapping,
    setFormData,
  ]);

  useEffect(() => {
    if (
      isOpen &&
      formData.department &&
      formData.plantId &&
      formData.auditElements?.length > 0
    ) {
      fetchDepartmentUsers(
        formData.department,
        formData.plantId,
        formData.auditElements,
      );
    }
  }, [
    isOpen,
    formData.department,
    formData.plantId,
    formData.auditElements,
    fetchDepartmentUsers,
  ]);

  useEffect(() => {
    if (isOpen && formData.department && !editingSchedule)
      fetchDepartmentMapping(formData.department);
  }, [isOpen, formData.department, editingSchedule, fetchDepartmentMapping]);

  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDepartmentInfo(null);
    }
  }, [isOpen, resetSelections]);

  useEffect(() => {
    if (isOpen && !editingSchedule && formData.auditElements?.length > 0) {
      setFormData((prev: any) => ({ ...prev, auditElements: [] }));
    }
  }, [isOpen, editingSchedule, setFormData]);

  if (!isOpen) return null;

  const step0Done = !!formData.plantId;
  const step1Done = !!formData.department;
  const step2Done = !!formData.auditElements?.[0];
  const step3Done = !!formData.week;
  const step4Done = selectedTeamAuditors.length > 0;
  const step5Done = selectedAuditees.length > 0;
  const isReady =
    step0Done && step1Done && step2Done && step3Done && step4Done && step5Done;
  const completedSteps = [
    step0Done,
    step1Done,
    step2Done,
    step3Done,
    step4Done,
    step5Done,
  ].filter(Boolean).length;

  const hasAuditElements =
    formData.auditElements && formData.auditElements.length > 0;
  const hasFullyCompetentTeams = fullyCompetentTeamAuditors.length > 0;

  // ✅ Layout helpers for 2-column desktop / 1-column mobile
  const halfWidth: ViewStyle = {
    width: isDesktop ? "49%" : "100%",
    marginBottom: 16,
  };
  const fullWidth: ViewStyle = { width: "100%", marginBottom: 16 };
  const verticalMargin = isDesktop ? 16 : 48; // ⬅️ larger margin = shorter popup on mobile
  const maxCardHeight = isDesktop
    ? Math.min(height * 0.9, 720)
    : height - verticalMargin * 2; // ⬅️ ~85% of screen height on mobile
  const cardHeight = maxCardHeight;
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Dimmed backdrop - tappable to close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: verticalMargin,
          }}
        >
          {/* Card - stops propagation so tapping inside doesn't close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 15,
              elevation: 10,
              width: isDesktop ? "90%" : "100%",
              maxWidth: 840,
              // ✅ explicit pixel height so ScrollView flex:1 can resolve on mobile
              height: cardHeight,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "#E2E8F0",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 16,
                paddingVertical: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                    flex: 1,
                  }}
                >
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      height: 40,
                      width: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      backgroundColor: "#F1F5F9",
                    }}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={20} color="#475569" />
                  </TouchableOpacity>
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#DBEAFE",
                      backgroundColor: "#EFF6FF",
                    }}
                  >
                    <Calendar size={20} color={COLORS.primary} />
                  </View>

                  <View style={{ flex: 1, overflow: "hidden" }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                      numberOfLines={1}
                    >
                      {editingSchedule
                        ? "Edit Audit Schedule"
                        : "New Audit Schedule"}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 14,
                        fontWeight: "500",
                        color: "#64748B",
                      }}
                      numberOfLines={1}
                    >
                      {editingSchedule
                        ? "Update details"
                        : "Fill in the required fields"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View
              style={{ height: 3, width: "100%", backgroundColor: "#F1F5F9" }}
            >
              <View
                style={{
                  height: "100%",
                  backgroundColor: "#2563EB",
                  width: `${(completedSteps / 6) * 100}%`,
                }}
              />
            </View>

            {/* ✅ ScrollView gets flex:1 AND the parent card has a concrete pixel height,
                   so it will correctly fill the available space and scroll on mobile */}
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              style={{ backgroundColor: "#F8FAFC", flex: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Competency Alert */}
              {hasAuditElements && (
                <View
                  style={{
                    marginBottom: 24,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    padding: 16,
                    borderColor: hasFullyCompetentTeams ? "#DBEAFE" : "#FDE68A",
                    backgroundColor: hasFullyCompetentTeams
                      ? "#EFF6FF"
                      : "#FFFBEB",
                  }}
                >
                  <Shield
                    size={18}
                    color={hasFullyCompetentTeams ? COLORS.primary : "#92400E"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        marginBottom: 4,
                        fontSize: 14,
                        fontWeight: "bold",
                        color: hasFullyCompetentTeams ? "#1E3A8A" : "#92400E",
                      }}
                    >
                      {hasFullyCompetentTeams
                        ? "✅ Fully Competent Auditors Available"
                        : "⚠️ No Fully Competent Auditors"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        opacity: 0.9,
                        color: hasFullyCompetentTeams ? "#1E40AF" : "#92400E",
                      }}
                    >
                      {hasFullyCompetentTeams ? (
                        <Text>
                          Team:{" "}
                          <Text style={{ fontWeight: "bold" }}>
                            {fullyCompetentTeamAuditors.length}
                          </Text>{" "}
                          auditor(s) can perform this audit
                        </Text>
                      ) : (
                        <Text>
                          No auditors are competent for all{" "}
                          {formData.auditElements.length} element(s).
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* Form Fields - 2 Column on Desktop, 1 Column on Mobile */}
              <View
                style={{
                  flexDirection: isDesktop ? "row" : "column",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {/* 0. Plant - READ ONLY */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Building size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Plant
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 48,
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      backgroundColor: "#F1F5F9",
                      paddingHorizontal: 16,
                    }}
                  >
                    <Building size={16} color="#475569" />
                    <Text
                      style={{ flex: 1, fontSize: 14, color: "#0F172A" }}
                      numberOfLines={1}
                    >
                      {formData.plantName ||
                        currentUserPlantName ||
                        "Loading..."}
                    </Text>
                  </View>
                </View>

                {/* 1. Department */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Briefcase size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Department
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#DC2626",
                      }}
                    >
                      *
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      height: 48,
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      paddingHorizontal: 16,
                      backgroundColor: "#FFFFFF",
                      borderColor: errors.department ? "#FCA5A5" : "#E2E8F0",
                      opacity: editingSchedule ? 0.7 : 1,
                    }}
                    disabled={!!editingSchedule}
                    onPress={() => setShowDepartmentModal(true)}
                  >
                    <Briefcase
                      size={16}
                      color={errors.department ? "#DC2626" : "#475569"}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        lineHeight: 20,
                        color: !formData.department ? "#64748B" : "#0F172A",
                      }}
                      numberOfLines={2}
                    >
                      {formData.department || "Select department..."}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* 2. Audit Element */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <List size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Element
                    </Text>
                  </View>
                  {!formData.department ? (
                    <View
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        backgroundColor: "#F8FAFC",
                        paddingHorizontal: 16,
                      }}
                    >
                      <List size={16} color="#64748B" />
                      <Text style={{ flex: 1, fontSize: 12, color: "#64748B" }}>
                        Select department first
                      </Text>
                    </View>
                  ) : availableAuditElements.length === 0 ? (
                    <View
                      style={{
                        height: 48,
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 16,
                      }}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          fontSize: 12,
                          color: "#64748B",
                        }}
                      >
                        No elements available
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        backgroundColor: "#FFFFFF",
                        paddingHorizontal: 16,
                      }}
                      onPress={() => setShowElementsModal(true)}
                    >
                      <List size={16} color="#475569" />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: !formData.auditElements?.[0]
                            ? "#64748B"
                            : "#0F172A",
                        }}
                        numberOfLines={1}
                      >
                        {formData.auditElements?.[0] || "Select element..."}
                      </Text>
                      <ChevronDown size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 3. Audit Week */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Calendar size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Week
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#DC2626",
                      }}
                    >
                      *
                    </Text>
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {weeksList.map((w) => {
                      const active = formData.week === w;
                      return (
                        <TouchableOpacity
                          key={w}
                          onPress={() => {
                            setFormData({ ...formData, week: w });
                            setErrors((e: any) => ({ ...e, week: "" }));
                          }}
                          style={{
                            flex: 1,
                            minWidth: 40,
                            height: 48,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: active ? "#2563EB" : "#E2E8F0",
                            backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: active ? "#2563EB" : "#0F172A",
                            }}
                          >
                            {w}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Team Auditors */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Users size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Team
                    </Text>
                  </View>
                  {!formData.department || !hasAuditElements ? (
                    <View
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        backgroundColor: "#F8FAFC",
                        paddingHorizontal: 16,
                      }}
                    >
                      <Users size={16} color="#64748B" />
                      <Text style={{ flex: 1, fontSize: 12, color: "#64748B" }}>
                        Select dept/element first
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        backgroundColor: "#FFFFFF",
                        borderColor: errors.team ? "#FCA5A5" : "#E2E8F0",
                        opacity: !hasFullyCompetentTeams ? 0.6 : 1,
                      }}
                      onPress={() => setShowTeamModal(true)}
                      disabled={!hasFullyCompetentTeams}
                    >
                      <Users
                        size={16}
                        color={errors.team ? "#DC2626" : "#475569"}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color:
                            selectedTeamAuditors.length === 0
                              ? "#64748B"
                              : "#0F172A",
                        }}
                        numberOfLines={1}
                      >
                        {selectedTeamAuditors.length === 0
                          ? "Select team..."
                          : `${selectedTeamAuditors.length} selected`}
                      </Text>
                      <ChevronDown size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 5. Auditees */}
                <View style={halfWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <User size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Auditees
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#DC2626",
                      }}
                    >
                      *
                    </Text>
                  </View>
                  {!formData.department ? (
                    <View
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        backgroundColor: "#F8FAFC",
                        paddingHorizontal: 16,
                      }}
                    >
                      <User size={16} color="#64748B" />
                      <Text style={{ flex: 1, fontSize: 12, color: "#64748B" }}>
                        Select department first
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        height: 48,
                        width: "100%",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        backgroundColor: "#FFFFFF",
                        borderColor: errors.auditees ? "#FCA5A5" : "#E2E8F0",
                        opacity:
                          !formData.department ||
                          !hasAuditElements ||
                          departmentAuditees.length === 0
                            ? 0.6
                            : 1,
                      }}
                      onPress={() => setShowAuditeeModal(true)}
                      disabled={
                        !formData.department ||
                        !hasAuditElements ||
                        departmentAuditees.length === 0
                      }
                    >
                      <User
                        size={16}
                        color={errors.auditees ? "#DC2626" : "#475569"}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color:
                            selectedAuditees.length === 0
                              ? "#64748B"
                              : "#0F172A",
                        }}
                        numberOfLines={1}
                      >
                        {selectedAuditees.length === 0
                          ? "Select auditees..."
                          : `${selectedAuditees.length} selected`}
                      </Text>
                      <ChevronDown size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 6. Status */}
                <View style={fullWidth}>
                  <View
                    style={{
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Clock size={16} color="#475569" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "#0F172A",
                      }}
                    >
                      Status
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      height: 48,
                      width: "100%",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      backgroundColor: "#FFFFFF",
                      paddingHorizontal: 16,
                    }}
                    onPress={() => setShowStatusModal(true)}
                  >
                    <Clock size={16} color="#475569" />
                    <Text style={{ flex: 1, fontSize: 14, color: "#0F172A" }}>
                      {formData.status || "SCHEDULED"}
                    </Text>
                    <ChevronDown size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#E2E8F0",
                backgroundColor: "#FFFFFF",
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 24,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!isReady || saving}
                  style={{
                    height: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 12,
                    paddingHorizontal: 24,
                    backgroundColor: !isReady || saving ? "#F1F5F9" : "#2563EB",
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Save
                      size={16}
                      color={!isReady || saving ? "#9CA3AF" : "#FFF"}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: !isReady || saving ? "#94A3B8" : "#FFFFFF",
                    }}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Modals */}
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
        emptyMsg={
          !hasAuditElements
            ? "Select an audit element first"
            : "No competent auditors for the selected element(s)"
        }
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
        emptyMsg={
          !hasAuditElements
            ? "Select an audit element first"
            : "No competent auditees for the selected element(s)"
        }
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
          setSelectedTeamAuditors([]);
          setTeamAuditorNames([]);
          setSelectedCoAuditors([]);
          setSelectedCoAuditorNames([]);
          setSelectedAuditees([]);
          setSelectedAuditeeNames([]);
          setFullyCompetentTeamAuditors([]);
          setFormData({ ...formData, auditElements: element ? [element] : [] });
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
          className="flex-1 items-center justify-center bg-black/30 p-5"
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="max-h-[60%] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <View className="flex-row items-center justify-between border-b border-slate-200 p-5">
              <Text className="text-base font-bold text-slate-900">
                Select Status
              </Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <X size={20} color="#64748B" />
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
                    className={`mb-1 flex-row items-center justify-between rounded-lg p-3 ${formData.status === status ? "bg-blue-50" : ""}`}
                  >
                    <Text
                      className={`text-sm ${formData.status === status ? "font-semibold text-blue-600" : "text-slate-900"}`}
                    >
                      {status.replace("_", " ")}
                    </Text>
                    {formData.status === status && (
                      <Check size={16} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

export default ScheduleModal;
