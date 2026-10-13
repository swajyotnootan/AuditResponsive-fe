import { auditScheduleApi } from "@/services/auditScheduleApi";
import {
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
  Sparkles,
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
} from "react-native";

const weeksList = ["W-1", "W-2", "W-3", "W-4", "W-5", "W-6"];
const ENABLE_DEMO_AUTO_FILL = true;

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
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
              <Text className="text-base font-bold text-gray-900">{title}</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-gray-900"
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
                      className={`mb-1 flex-row items-center gap-3 rounded-lg p-3 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}`}
                      >
                        {isSelected && (
                          <View className="h-2.5 w-2.5 rounded-full bg-white" />
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
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
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
            <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-gray-900"
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
            </View>
            <View className="flex-row gap-2 border-b border-gray-200 p-2">
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
                      className={`mb-1 flex-row items-center gap-3 rounded-lg p-3 ${checked ? "bg-blue-50" : ""}`}
                    >
                      <View
                        className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${checked ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}`}
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
            <View className="flex-row justify-end border-t border-gray-200 bg-gray-50 p-4">
              <TouchableOpacity
                onPress={onClose}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5"
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
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4">
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
            <View className="flex-row items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="h-10 flex-1 text-[13px] text-gray-900"
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
                      className={`mb-1 flex-row items-center justify-between rounded-lg p-3 ${isSelected ? "bg-blue-50" : ""}`}
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
// MAIN SCHEDULE MODAL
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const colClass = isDesktop ? "w-1/2" : "w-full";
  const inputHeight = isDesktop ? "h-[40px]" : "h-[48px]";
  const textSize = isDesktop ? "text-[12px]" : "text-[14px]";
  const iconSize = isDesktop ? 14 : 18;

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
  const [demoPending, setDemoPending] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAuditeeModal, setShowAuditeeModal] = useState(false);
  const [showElementsModal, setShowElementsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // ✅ Auto-fill plant — runs whenever modal opens OR plant prop changes
  useEffect(() => {
    console.log("🟠 [Plant Auto-Fill Effect]");
    console.log("   isOpen:", isOpen);
    console.log("   currentUserPlantId:", currentUserPlantId);
    console.log("   currentUserPlantName:", currentUserPlantName);
    console.log("   editingSchedule?.plantId:", editingSchedule?.plantId);
    console.log("   current formData.plantId:", formData.plantId);

    if (!isOpen) return;

    // Priority 1: editing schedule's plant
    if (editingSchedule?.plantId) {
      if (formData.plantId !== editingSchedule.plantId) {
        console.log("   ✅ Setting plant from editingSchedule");
        setFormData((prev: any) => ({
          ...prev,
          plantId: editingSchedule.plantId,
          plantName:
            editingSchedule.plantName || `Plant ${editingSchedule.plantId}`,
        }));
      }
      return;
    }

    // Priority 2: current user's plant
    if (currentUserPlantId) {
      if (formData.plantId !== currentUserPlantId) {
        console.log("   ✅ Setting plant from currentUserPlantId");
        setFormData((prev: any) => ({
          ...prev,
          plantId: currentUserPlantId,
          plantName: currentUserPlantName || `Plant ${currentUserPlantId}`,
        }));
      }
      return;
    }

    console.warn("   ❌ NO PLANT available from any source!");
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

  const fetchFullyCompetentAuditors = useCallback(
    async (auditElements: string[], plantId: string | number) => {
      console.log("\n🟡 [fetchFullyCompetentAuditors] ENTER");
      console.log("   auditElements:", auditElements);
      console.log("   plantId:", plantId);
      console.log("   selectedYear:", selectedYear);
      console.log("   selectedMonth:", selectedMonth);

      if (!plantId || !auditElements || auditElements.length === 0) {
        console.log("   ❌ Missing plantId or auditElements — clearing");
        setFullyCompetentTeamAuditors([]);
        return;
      }

      try {
        setLoadingCompetent(true);

        console.log("   📡 Calling getFullyCompetentAuditors API...");
        const response = await auditScheduleApi.getFullyCompetentAuditors(
          auditElements,
          selectedYear,
          selectedMonth,
          plantId,
          formData.auditType, // ✅ pass audit type for competency filter
        );

        const fullyCompetentAuditors = extractData(response);

        if (!Array.isArray(fullyCompetentAuditors)) {
          console.log(
            "   ⚠️ Extracted is NOT an array — check backend response shape!",
          );
          setFullyCompetentTeamAuditors([]);
          return;
        }

        // ✅ Trust the backend — it returns ONLY competent auditors.
        // Do NOT filter by role here (may remove valid competent HODs etc.)
        console.log(
          "   ✅ Competent auditors count:",
          fullyCompetentAuditors.length,
        );
        console.log(
          "   📋 Final auditors:",
          JSON.stringify(fullyCompetentAuditors, null, 2),
        );

        setFullyCompetentTeamAuditors(fullyCompetentAuditors);
      } catch (error: any) {
        console.error("   ❌ API ERROR:", error);
        console.error("   ❌ Error message:", error.message);
        console.error("   ❌ Error response:", error.response?.data);
        console.error("   ❌ Error status:", error.response?.status);
        setFullyCompetentTeamAuditors([]);
      } finally {
        setLoadingCompetent(false);
        console.log("🟡 [fetchFullyCompetentAuditors] EXIT\n");
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
      console.log("\n🟢 [fetchDepartmentUsers] ENTER");
      console.log("   department:", department);
      console.log("   plantId:", plantId);
      console.log("   auditElements:", auditElements);

      if (!department || !plantId) {
        console.log("   ❌ Missing department or plantId — clearing");
        setDepartmentAuditees([]);
        return;
      }

      const enumValue = department;

      console.log("   📤 Sending department to backend:", enumValue);

      setLoadingDepartmentUsers(true);

      // ✅ If no element selected → blank dropdown (no competency check possible)
      if (!auditElements || auditElements.length === 0) {
        console.log("   ⚠️ No auditElements selected — blank dropdown");
        setDepartmentAuditees([]);
        setLoadingDepartmentUsers(false);
        console.log("🟢 [fetchDepartmentUsers] EXIT (no elements)\n");
        return;
      }

      try {
        console.log("   🎯 Calling getCompetentAuditeesByDepartment");

        const auditeesRes =
          await auditScheduleApi.getCompetentAuditeesByDepartment(
            enumValue,
            plantId,
            auditElements,
            formData.auditType, // ✅ pass audit type
          );

        const extracted = extractData(auditeesRes);

        if (!Array.isArray(extracted)) {
          console.log("   ⚠️ Not an array — clearing");
          setDepartmentAuditees([]);
          return;
        }

        // ✅ API already returns ONLY competent auditees — no extra filter needed
        console.log("   ✅ Competent auditees count:", extracted.length);
        console.log(
          "   📋 Names:",
          extracted
            .map((u: any) => `${u.firstName} ${u.lastName} (${u.role})`)
            .join(", "),
        );

        setDepartmentAuditees(extracted);
      } catch (err: any) {
        console.error("   ❌ API ERROR:", err);
        console.error("   ❌ Response:", err.response?.data);
        setDepartmentAuditees([]);
      } finally {
        setLoadingDepartmentUsers(false);
        console.log("🟢 [fetchDepartmentUsers] EXIT\n");
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
    console.log("\n🔵 [handleDepartmentChange] ENTER");
    console.log("   Raw department value:", JSON.stringify(dept));
    console.log("   formData.plantId:", formData.plantId);
    console.log("   selectedMonth:", selectedMonth);

    if (!dept) {
      console.log("   ❌ Empty dept — returning");
      return;
    }
    if (!formData.plantId) {
      console.log("   ❌ No plantId — alerting");
      Alert.alert("Please select a plant first");
      return;
    }

    console.log("   ✅ Validation passed — resetting selections");
    resetSelections();
    setFormData({
      ...formData,
      department: dept,
      month: selectedMonth,
      auditElements: [],
      week: "",
      status: "SCHEDULED",
      auditType: "", // ✅ reset audit type if you have it
    });

    // ✅ No element yet → will result in blank auditee dropdown
    await fetchDepartmentUsers(dept, formData.plantId, []);

    console.log("   📞 Calling fetchDepartmentMapping...");
    await fetchDepartmentMapping(dept);

    console.log("🔵 [handleDepartmentChange] EXIT\n");
  };

  const getDemoWeekForDepartment = (department: string) => {
    const plannedElements =
      deptPlanData?.[department]?.find((m: any) => m.month === selectedMonth)
        ?.elements || [];

    const availableWeek = weeksList.find((week) => {
      const alreadyScheduledElements = allSchedules
        .filter(
          (s: any) =>
            s.department === department &&
            s.week === week &&
            s.month === selectedMonth,
        )
        .flatMap((s: any) => s.auditElements || []);

      return plannedElements.some(
        (el: string) => !alreadyScheduledElements.includes(el),
      );
    });

    return availableWeek || weeksList[0];
  };

  const startDemoAutoFill = async () => {
    if (!canAutoFill) {
      Alert.alert(
        "Demo Auto Fill",
        "No audit elements available to auto fill.",
      );
      return;
    }

    if (editingSchedule) {
      Alert.alert(
        "Demo Auto Fill",
        "Auto fill is enabled only for new schedules.",
      );
      return;
    }

    if (!selectedMonth) {
      Alert.alert("Demo Auto Fill", "Please select a month first.");
      return;
    }

    const department = formData.department || departments?.[0];

    if (!department) {
      Alert.alert("Demo Auto Fill", "No departments available.");
      return;
    }

    setDemoPending(true);
    setErrors({});

    try {
      if (!formData.department) {
        await handleDepartmentChange(department);

        const week = getDemoWeekForDepartment(department);

        setFormData((prev: any) => ({
          ...prev,
          department,
          month: selectedMonth,
          week,
          status: "SCHEDULED",
        }));
      } else {
        await Promise.all([fetchDepartmentMapping(department)]);

        if (!formData.week) {
          const week = getDemoWeekForDepartment(department);

          setFormData((prev: any) => ({
            ...prev,
            week,
          }));
        }
      }
    } catch (error) {
      console.error("Demo auto fill error:", error);
      Alert.alert("Demo Auto Fill", "Something went wrong while auto filling.");
      setDemoPending(false);
    }
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

    performSave();
  };

  const performSave = () => {
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

    // ✅ Plant info - use editing schedule's plant info, or fallback to current user's plant
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

    // Team
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

  // ✅ NEW: Re-fetch auditees when audit elements change (competency filtering)
  useEffect(() => {
    console.log("\n🟣 [useEffect: auditElements changed]");
    console.log("   isOpen:", isOpen);
    console.log("   formData.department:", formData.department);
    console.log("   formData.plantId:", formData.plantId);
    console.log("   formData.auditElements:", formData.auditElements);

    if (
      isOpen &&
      formData.department &&
      formData.plantId &&
      formData.auditElements?.length > 0
    ) {
      console.log("   ✅ Re-fetching auditees with competency filter...");
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

  // ✅ Demo auto-fill effect
  useEffect(() => {
    if (!ENABLE_DEMO_AUTO_FILL) return;
    if (!demoPending) return;
    if (!isOpen) return;
    if (editingSchedule) return;

    if (loadingDepartmentUsers || loadingCompetent) return;
    if (!formData.department) return;

    const currentElements = formData.auditElements || [];

    if (currentElements.length === 0) {
      const element =
        availableAuditElements[0] ||
        deptPlanData?.[formData.department]?.find(
          (m: any) => m.month === selectedMonth,
        )?.elements?.[0];

      if (!element) {
        setDemoPending(false);
        Alert.alert(
          "Demo Auto Fill",
          "No audit elements available for this department/month.",
        );
        return;
      }

      setFormData((prev: any) => ({
        ...prev,
        auditElements: [element],
      }));

      return;
    }

    const team = fullyCompetentTeamAuditors[0];

    const auditee = departmentAuditees[0];

    if (team) {
      const teamId = String(team.id);
      const teamName = `${team.firstName} ${team.lastName}`;

      setSelectedTeamAuditors([teamId]);
      setTeamAuditorNames([teamName]);

      setSelectedCoAuditors([teamId]);
      setSelectedCoAuditorNames([teamName]);

      setErrors((prev: any) => ({
        ...prev,
        team: "",
      }));
    }

    if (auditee) {
      const auditeeId = String(auditee.id);
      const auditeeName = `${auditee.firstName} ${auditee.lastName}`;

      setSelectedAuditees([auditeeId]);
      setSelectedAuditeeNames([auditeeName]);

      setErrors((prev: any) => ({
        ...prev,
        auditees: "",
      }));
    }

    setDemoPending(false);

    if (!team || !auditee) {
      Alert.alert(
        "Demo Auto Fill",
        "Filled available fields, but some team/auditee data is missing.",
      );
    }
  }, [
    demoPending,
    isOpen,
    editingSchedule,
    loadingDepartmentUsers,
    loadingCompetent,
    formData.department,
    formData.auditElements,
    availableAuditElements,
    deptPlanData,
    selectedMonth,
    fullyCompetentTeamAuditors,
    departmentAuditees,
    setFormData,
  ]);

  // ✅ Fetch department mapping when department changes
  useEffect(() => {
    if (isOpen && formData.department && !editingSchedule) {
      fetchDepartmentMapping(formData.department);
    }
  }, [isOpen, formData.department, editingSchedule, fetchDepartmentMapping]);

  // ✅ Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDepartmentInfo(null);
    }
  }, [isOpen, resetSelections]);

  // ✅ Clear audit elements when opening a fresh schedule
  useEffect(() => {
    if (isOpen && !editingSchedule) {
      if (formData.auditElements && formData.auditElements.length > 0) {
        setFormData((prev: any) => ({ ...prev, auditElements: [] }));
      }
    }
  }, [isOpen, editingSchedule, setFormData]);

  const canAutoFill = useMemo(() => {
    if (!ENABLE_DEMO_AUTO_FILL) return false;
    if (editingSchedule || saving || demoPending) return false;

    if (formData.department) {
      return availableAuditElements.length > 0;
    }

    if (!departments || departments.length === 0) return false;

    return departments.some((dept: string) => {
      const elements =
        deptPlanData?.[dept]?.find((m: any) => m.month === selectedMonth)
          ?.elements || [];
      return elements.length > 0;
    });
  }, [
    editingSchedule,
    saving,
    demoPending,
    formData.department,
    availableAuditElements,
    departments,
    deptPlanData,
    selectedMonth,
  ]);

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

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/30 p-4">
        <View
          className={`flex-1 overflow-hidden rounded-2xl bg-white shadow-xl ${isDesktop ? "w-[95%] max-w-[840px]" : "w-[95%]"}`}
          style={{ maxHeight: "82%" }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 bg-white p-4">
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                <Calendar size={20} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-black">
                  {editingSchedule
                    ? "Edit Audit Schedule"
                    : "New Audit Schedule"}
                </Text>
                <Text className="mt-0.5 text-[12px] text-gray-500">
                  {editingSchedule
                    ? "Update details."
                    : "Fill in the required fields."}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {ENABLE_DEMO_AUTO_FILL && (
                <TouchableOpacity
                  onPress={startDemoAutoFill}
                  disabled={!canAutoFill}
                  className={`flex-row items-center gap-2 rounded-lg border px-3 py-2 ${
                    !canAutoFill
                      ? "border-gray-200 bg-gray-100 opacity-60"
                      : "border-blue-100 bg-blue-50"
                  }`}
                >
                  {demoPending ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Sparkles
                      size={16}
                      color={!canAutoFill ? "#9CA3AF" : "#2563EB"}
                    />
                  )}

                  <Text
                    className={`text-xs font-semibold ${
                      !canAutoFill ? "text-gray-400" : "text-blue-600"
                    }`}
                  >
                    Demo Fill
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                className="rounded-lg border border-gray-200 bg-gray-50 p-2"
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="h-[3px] w-full bg-gray-100">
            <View
              className="h-full bg-blue-500"
              style={{ width: `${(completedSteps / 6) * 100}%` }}
            />
          </View>

          <ScrollView
            className="flex-1 bg-gray-50"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ padding: 16 }}
            style={{ flex: 1 }}
          >
            {hasAuditElements && (
              <View
                className={`mb-4 flex-row items-start gap-3 rounded-lg border p-3 ${
                  hasFullyCompetentTeams
                    ? "border-blue-100 bg-blue-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <Shield
                  size={16}
                  color={hasFullyCompetentTeams ? "#3B82F6" : "#92400E"}
                />
                <View className="flex-1">
                  <Text
                    className={`mb-1 text-[12px] font-semibold ${
                      hasFullyCompetentTeams
                        ? "text-blue-600"
                        : "text-yellow-800"
                    }`}
                  >
                    {hasFullyCompetentTeams
                      ? "✅ Fully Competent Auditors Available"
                      : "⚠️ No Fully Competent Auditors"}
                  </Text>
                  <Text
                    className={`text-[11px] opacity-90 ${
                      hasFullyCompetentTeams
                        ? "text-blue-600"
                        : "text-yellow-800"
                    }`}
                  >
                    {hasFullyCompetentTeams ? (
                      <Text>
                        Team:{" "}
                        <Text className="font-bold">
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

            {/* ✅ 2-COLUMN GRID LAYOUT */}
            <View className="-mx-2 flex-row flex-wrap">
              {/* 0. Plant - READ ONLY */}
              <View className={`${colClass} mb-4 px-2`}>
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Building size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Plant
                  </Text>
                </View>
                <View className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2">
                  <Building size={14} color="#475569" />
                  <Text
                    className="flex-1 text-[12px] text-gray-900"
                    numberOfLines={1}
                  >
                    {formData.plantName || currentUserPlantName || "Loading..."}
                  </Text>
                </View>
              </View>

              {/* 1. Department */}
              <View className={`${colClass} mb-4 px-2`}>
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Briefcase size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Department
                  </Text>
                  <Text className="text-[13px] font-bold text-red-600">*</Text>
                </View>
                <TouchableOpacity
                  className={`h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border bg-white px-2 ${errors.department ? "border-red-200" : "border-gray-200"} ${editingSchedule ? "opacity-70" : ""}`}
                  disabled={!!editingSchedule}
                  onPress={() => setShowDepartmentModal(true)}
                >
                  <Briefcase
                    size={14}
                    color={errors.department ? "#DC2626" : "#475569"}
                  />
                  <Text
                    className={`flex-1 ${textSize} leading-5 ${!formData.department ? "text-gray-500" : "text-gray-900"}`}
                    numberOfLines={2}
                  >
                    {formData.department || "Select dept..."}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* 2. Audit Element */}
              <View className="mb-4 w-1/2 px-2">
                <View className="mb-1.5 flex-row items-center gap-1">
                  <List size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Element
                  </Text>
                </View>
                {!formData.department ? (
                  <View className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2">
                    <List size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept first
                    </Text>
                  </View>
                ) : availableAuditElements.length === 0 ? (
                  <View className="h-[40px] w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-2">
                    <Text className="text-center text-[10px] text-gray-500">
                      No elements
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2"
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

              {/* 4. Audit Week */}
              <View className={`${colClass} mb-4 px-1`}>
                <View className="mb-1.5 flex-row items-center gap-1.5">
                  <Calendar size={iconSize} color="#475569" />
                  <Text className={`${textSize} font-bold text-black`}>
                    Week
                  </Text>
                  <Text className={`${textSize} font-bold text-red-600`}>
                    *
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {weeksList.map((w) => {
                    const active = formData.week === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        onPress={() => {
                          setFormData({ ...formData, week: w });
                          setErrors((e: any) => ({ ...e, week: "" }));
                        }}
                        className={`min-w-[40px] flex-1 ${inputHeight} flex-row items-center justify-center rounded-xl border ${active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
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
              <View className="mb-4 w-1/2 px-2">
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Users size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">Team</Text>
                </View>
                {!formData.department || !hasAuditElements ? (
                  <View className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2">
                    <Users size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept/element
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border px-2 ${
                      !hasFullyCompetentTeams
                        ? "bg-gray-50 opacity-60"
                        : "bg-white"
                    } ${errors.team ? "border-red-200" : "border-gray-200"}`}
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
              <View className="mb-4 w-1/2 px-2">
                <View className="mb-1.5 flex-row items-center gap-1">
                  <User size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Auditees
                  </Text>
                  <Text className="text-[13px] font-bold text-red-600">*</Text>
                </View>
                {!formData.department ? (
                  <View className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2">
                    <User size={14} color="#6B7280" />
                    <Text className="flex-1 text-[11px] text-gray-500">
                      Select dept first
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    className={`h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border px-2 ${
                      !formData.department ||
                      !hasAuditElements ||
                      departmentAuditees.length === 0
                        ? "bg-gray-50 opacity-60"
                        : "bg-white"
                    } ${errors.auditees ? "border-red-200" : "border-gray-200"}`}
                    onPress={() => setShowAuditeeModal(true)}
                    disabled={
                      !formData.department ||
                      !hasAuditElements ||
                      departmentAuditees.length === 0
                    }
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

              {/* 7. Status */}
              <View className="mb-4 w-full px-2">
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Clock size={14} color="#475569" />
                  <Text className="text-[12px] font-bold text-black">
                    Status
                  </Text>
                </View>
                <TouchableOpacity
                  className="h-[40px] w-full flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2"
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

          {/* Footer */}
          <View
            className="flex-row items-center justify-between border-t border-gray-200 bg-white p-4"
            style={{ flexShrink: 0 }}
          >
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-5"
              >
                <Text className="text-sm font-semibold text-gray-900">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isReady || saving}
                className={`h-10 flex-row items-center justify-center gap-2 rounded-lg px-4 ${!isReady || saving ? "bg-gray-100" : "bg-blue-500"}`}
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
            // ✅ 1. Clear previous selections — they may no longer be competent
            setSelectedTeamAuditors([]);
            setTeamAuditorNames([]);
            setSelectedCoAuditors([]);
            setSelectedCoAuditorNames([]);
            setSelectedAuditees([]);
            setSelectedAuditeeNames([]);
            setFullyCompetentTeamAuditors([]);

            // ✅ 2. Save the new element
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
            className="flex-1 items-center justify-center bg-black/30 p-5"
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="max-h-[60%] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <View className="flex-row items-center justify-between border-b border-gray-200 p-5">
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
                      className={`mb-1 flex-row items-center justify-between rounded-lg p-3 ${formData.status === status ? "bg-blue-50" : ""}`}
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
