// components/dashboards/admin/CompetencyManagement.tsx

import {
  AlertCircle,
  Award,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react-native";

import { API_BASE_URL } from "@/config/apiConfig";
import React, { useEffect, useState } from "react";

import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

const DatePickerField = ({ label, value, onChange }: DatePickerFieldProps) => {
  const [showPicker, setShowPicker] = useState(false);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr + "T00:00:00");
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  useEffect(() => {
    setTempDate(parseDate(value));
  }, [value]);

  const handlePress = () => setShowPicker(true);

  const handleChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate.toISOString().split("T")[0]);
      }
    }
  };

  const handleDone = () => {
    onChange(tempDate.toISOString().split("T")[0]);
    setShowPicker(false);
  };

  const inputClasses =
    "border border-gray-300 rounded-lg px-3 bg-white justify-center";

  return (
    // ✅ flex: 1 via inline style = guaranteed to stretch on web AND native
    <View style={{ flex: 1 }}>
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>

      {Platform.OS === "web" ? (
        <input
          type="date"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          className={inputClasses}
          style={{
            outline: "none",
            width: "100%",
            display: "block",
            boxSizing: "border-box",
            height: 44,
            fontSize: 14,
            padding: "0 12px",
          }}
        />
      ) : (
        <>
          <TouchableOpacity
            onPress={handlePress}
            className={inputClasses}
            style={{ height: 44 }}
          >
            <Text
              className={`text-sm ${value ? "text-black" : "text-gray-400"}`}
            >
              {value || "YYYY-MM-DD"}
            </Text>
          </TouchableOpacity>

          {Platform.OS === "ios" ? (
            <Modal
              transparent={true}
              animationType="slide"
              visible={showPicker}
            >
              <View className="flex-1 justify-end bg-black/30">
                <View className="bg-white p-4 rounded-t-2xl">
                  <View className="flex-row justify-between mb-3">
                    <TouchableOpacity onPress={() => setShowPicker(false)}>
                      <Text className="text-red-500 text-base">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDone}>
                      <Text className="text-blue-900 text-base font-bold">
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleChange}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            showPicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                onChange={handleChange}
              />
            )
          )}
        </>
      )}
    </View>
  );
};

export default function CompetencyManagement() {
  const { width: screenWidth } = useWindowDimensions();

  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState(false);

  const [auditors, setAuditors] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [selectedAuditor, setSelectedAuditor] = useState<any>(null);

  const [editingCompetency, setEditingCompetency] = useState<any>(null);

  const [auditTypes, setAuditTypes] = useState<any[]>([]);

  const [expandedAuditor, setExpandedAuditor] = useState<number | null>(null);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
    auditorName: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    auditTypeId: "",
    elementIds: [] as number[],
    certifiedProcesses: [] as string[],

    certifiedProducts: [] as string[],
    certificationDate: "",
    expiryDate: "",

    certificationBody: "",
    certificationNumber: "",
  });

  useEffect(() => {
    fetchAuditors();
    fetchAuditTypes();
  }, []);

  const fetchAuditors = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/auditors`);

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();

      setAuditors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load auditors");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/audit-types`);

      const data = await res.json();

      setAuditTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      /* use defaults */
    }
  };

  const handleAddCompetency = (auditor: any) => {
    setSelectedAuditor(auditor);
    setEditingCompetency(null);

    setFormData({
      auditTypeId: "",
      elementIds: [],
      certifiedProcesses: [],
      certifiedProducts: [],
      certificationDate: "",
      expiryDate: "",
      certificationBody: "",
      certificationNumber: "",
    });

    setShowModal(true);
  };

  const handleEditCompetency = (auditor: any, competency: any) => {
    setSelectedAuditor(auditor);
    setEditingCompetency(competency);

    setFormData({
      auditTypeId:
        competency.auditTypeId || String(competency.auditType?.id || ""),

      elementIds: competency.certifiedElements?.map((e: any) => e.id) || [],

      certifiedProcesses: competency.certifiedProcesses || [],
      certifiedProducts: competency.certifiedProducts || [],

      certificationDate: competency.certificationDate || "",
      expiryDate: competency.expiryDate || "",

      certificationBody: competency.certificationBody || "",
      certificationNumber: competency.certificationNumber || "",
    });

    setShowModal(true);
  };

  const handleAutoFillAll = async () => {
    if (auditors.length === 0) {
      setError("No auditors available to fill");
      return;
    }

    if (auditTypes.length === 0) {
      setError("Audit types not loaded yet. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const today = new Date();
      const certificationDate = today.toISOString().split("T")[0];

      const expiryDateObj = new Date(today);
      expiryDateObj.setFullYear(today.getFullYear() + 3);
      const expiryDate = expiryDateObj.toISOString().split("T")[0];

      // 1. Define the core competencies we want EVERYONE to have
      const requiredKeywords = ["Process", "System", "5S"];

      // 2. Find matching audit types from your loaded list (case-insensitive)
      const coreAuditTypes = requiredKeywords
        .map((keyword) => {
          return auditTypes.find((t) =>
            t.name?.toLowerCase().includes(keyword.toLowerCase()),
          );
        })
        .filter(Boolean) as any[]; // Filter out undefined if a keyword wasn't found

      if (coreAuditTypes.length === 0) {
        setError(
          "Could not find Process, System, or 5S in your audit types list.",
        );
        setLoading(false);
        return;
      }

      let totalAssignments = 0;

      // 3. Loop through EVERY auditor
      for (let i = 0; i < auditors.length; i++) {
        const auditor = auditors[i];

        // 4. Ensure they get all 3 core competencies
        for (let j = 0; j < coreAuditTypes.length; j++) {
          const auditType = coreAuditTypes[j];

          // Check if auditor already has this specific core competency to prevent duplicates
          const alreadyHas = auditor.auditCompetencies?.some(
            (c: any) =>
              c.auditTypeId === auditType.id ||
              c.auditType?.id === auditType.id,
          );

          if (alreadyHas) continue;

          const params = new URLSearchParams({
            auditorId: String(auditor.id),
            auditTypeId: String(auditType.id),
            certificationDate,
            expiryDate,
            certificationBody: "Internal Audit Team",
            certificationNumber: `CORE-${today.getFullYear()}-${String(totalAssignments + 1).padStart(4, "0")}`,
          });

          // Add specific relevant processes based on the competency type
          if (auditType.name?.toLowerCase().includes("process")) {
            params.append("certifiedProcesses", "Manufacturing");
            params.append("certifiedProcesses", "Assembly Line");
          } else if (auditType.name?.toLowerCase().includes("system")) {
            params.append("certifiedProcesses", "QMS (ISO 9001)");
            params.append("certifiedProcesses", "EMS (ISO 14001)");
          } else if (auditType.name?.toLowerCase().includes("5s")) {
            params.append("certifiedProcesses", "Sort & Set in Order");
            params.append("certifiedProcesses", "Shine & Standardize");
          }

          const res = await fetch(
            `${API_BASE_URL}/api/competency/assign?${params}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (res.ok) totalAssignments++;
        }
      }

      if (totalAssignments > 0) {
        setSuccess(
          `Successfully assigned Process, System, and 5S competencies to all auditors!`,
        );
        await fetchAuditors();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setSuccess(
          `All auditors already have the core Process, System, and 5S competencies.`,
        );
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to auto-fill core competencies");
    } finally {
      setLoading(false);
    }
  };
  const handleSaveCompetency = async () => {
    if (!selectedAuditor) {
      setError("Please select an auditor");
      return;
    }

    if (!formData.auditTypeId) {
      setError("Please select an audit type");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        auditorId: String(selectedAuditor.id),
        auditTypeId: formData.auditTypeId,
      });

      if (formData.certificationDate)
        params.append("certificationDate", formData.certificationDate);

      if (formData.expiryDate) params.append("expiryDate", formData.expiryDate);

      if (formData.certificationBody)
        params.append("certificationBody", formData.certificationBody);

      if (formData.certificationNumber)
        params.append("certificationNumber", formData.certificationNumber);

      formData.certifiedProcesses.forEach((p) =>
        params.append("certifiedProcesses", p),
      );

      formData.certifiedProducts.forEach((p) =>
        params.append("certifiedProducts", p),
      );

      const isUpdate = editingCompetency !== null;

      const url = isUpdate
        ? `${API_BASE_URL}/api/competency/${editingCompetency.id}?${params}`
        : `${API_BASE_URL}/api/competency/assign?${params}`;

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to save");

      setSuccess(isUpdate ? "Competency updated!" : "Competency assigned!");

      setShowModal(false);
      fetchAuditors();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;

    const { id, name, auditorName } = deleteConfirm;

    setDeleteConfirm(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/competency/${id}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        setAuditors((prev) =>
          prev.map((a) => ({
            ...a,
            auditCompetencies: (a.auditCompetencies || []).filter(
              (c: any) => String(c.id) !== id,
            ),
          })),
        );

        setSuccess(`"${name}" removed from ${auditorName}!`);

        fetchAuditors();
      } else {
        setError(`Delete failed (${res.status})`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const getOverallStatus = (auditor: any) => {
    if (!auditor.auditCompetencies?.length)
      return { label: "PENDING", color: "bg-blue-100", text: "text-blue-700" };

    const hasExpiring = auditor.auditCompetencies.some(
      (c: any) => c.isExpiringSoon,
    );

    if (hasExpiring)
      return {
        label: "EXPIRING",
        color: "bg-yellow-100",
        text: "text-yellow-700",
      };

    const hasValid = auditor.auditCompetencies.some(
      (c: any) => c.expiryDate > new Date().toISOString().split("T")[0],
    );

    return hasValid
      ? { label: "ACTIVE", color: "bg-green-100", text: "text-green-700" }
      : { label: "EXPIRED", color: "bg-red-100", text: "text-red-700" };
  };

  const filteredAuditors = auditors.filter(
    (a: any) =>
      a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalCompetencies = auditors.reduce(
    (sum, a) => sum + (a.auditCompetencies?.length || 0),
    0,
  );

  const activeCount = auditors.filter(
    (a) => getOverallStatus(a).label === "ACTIVE",
  ).length;

  const expiringCount = auditors.filter(
    (a) => getOverallStatus(a).label === "EXPIRING",
  ).length;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header - Same as EnterpriseManagement */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-200">
        <View
          className="flex-row items-center justify-between"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <Award size={22} color="#00529B" />
            <View className="ml-2">
              <Text className="text-lg font-bold text-gray-900">
                Competency Management
              </Text>
              <Text className="text-xs text-gray-500">
                {auditors.length} auditors • {totalCompetencies} competencies
              </Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleAutoFillAll}
              disabled={loading}
              className="flex-row items-center px-2 py-2 bg-purple-600 rounded-lg"
            >
              <Sparkles size={14} color="white" />
              <Text className="ml-1 text-xs font-semibold text-white">
                Auto Fill
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={fetchAuditors}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <RefreshCw size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages - Same as EnterpriseManagement */}

      {success ? (
        <View
          className="px-4 py-3 mx-4 mt-3 border border-green-200 rounded-lg bg-green-50"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <CheckCircle size={16} color="#16a34a" />
            <Text className="ml-2 text-sm text-green-700">{success}</Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View
          className="px-4 py-3 mx-4 mt-3 border border-red-200 rounded-lg bg-red-50"
          style={
            isDesktop
              ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
              : undefined
          }
        >
          <View className="flex-row items-center">
            <AlertCircle size={16} color="#dc2626" />
            <Text className="ml-2 text-sm text-red-700">{error}</Text>
          </View>
        </View>
      ) : null}

      {/* Search & Add - Same as EnterpriseManagement */}
      <View
        className="px-4 py-3"
        style={
          isDesktop
            ? { maxWidth: 1200, alignSelf: "center", width: "100%" }
            : undefined
        }
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center flex-1 px-3 py-2 bg-gray-100 rounded-lg">
            <Search size={14} color="#9ca3af" />
            <TextInput
              className="flex-1 py-1 ml-2 text-sm"
              placeholder="Search auditors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedAuditor(null);
              setEditingCompetency(null);
              setFormData({
                auditTypeId: "",
                elementIds: [],
                certifiedProcesses: [],
                certifiedProducts: [],
                certificationDate: "",
                expiryDate: "",
                certificationBody: "",
                certificationNumber: "",
              });
              setShowModal(true);
            }}
            className="flex-row items-center px-3 py-2 bg-blue-900 rounded-lg"
          >
            <Plus size={14} color="white" />
            <Text className="ml-1 text-sm font-medium text-white">Assign</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}

      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#00529B" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={
            isDesktop
              ? {
                  maxWidth: 1200,
                  alignSelf: "center",
                  width: "100%",
                  paddingHorizontal: 16,
                  paddingTop: 8,
                }
              : { paddingHorizontal: 16, paddingTop: 8 }
          }
        >
          {filteredAuditors.length === 0 ? (
            <View className="items-center py-16">
              <Users size={56} color="#d1d5db" />
              <Text className="mt-3 text-base text-gray-400">
                {searchQuery ? "No auditors match" : "No auditors found"}
              </Text>
            </View>
          ) : (
            <>
              {/* Mobile: Card Layout */}

              {!isDesktop &&
                filteredAuditors.map((a: any) => {
                  const status = getOverallStatus(a);

                  const isExpanded = expandedAuditor === a.id;

                  const compCount = a.auditCompetencies?.length || 0;

                  return (
                    <View
                      key={a.id}
                      className="mb-3 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl"
                    >
                      <View className="px-4 py-3">
                        <View className="flex-row items-center">
                          <View className="items-center justify-center w-10 h-10 mr-3 rounded-lg bg-blue-50">
                            <Text className="text-sm font-bold text-blue-900">
                              {(a.name?.charAt(0) || "A").toUpperCase()}
                            </Text>
                          </View>
                          <TouchableOpacity
                            className="flex-1"
                            onPress={() =>
                              compCount > 0 &&
                              setExpandedAuditor(isExpanded ? null : a.id)
                            }
                            activeOpacity={0.7}
                          >
                            <Text className="text-sm font-semibold text-gray-900">
                              {a.name}
                            </Text>
                            <View className="flex-row items-center mt-0.5 gap-2">
                              <Text className="text-xs text-gray-500">
                                {a.role === "LEAD_AUDITOR"
                                  ? "Lead Auditor"
                                  : "Auditor"}
                              </Text>

                              {a.department && (
                                <Text className="text-xs text-gray-400">
                                  • {a.department}
                                </Text>
                              )}
                            </View>
                            <View className="flex-row items-center gap-2 mt-1">
                              <View
                                className={`px-2 py-0.5 rounded-full ${status.color}`}
                              >
                                <Text
                                  className={`text-xs font-medium ${status.text}`}
                                >
                                  {status.label}
                                </Text>
                              </View>
                              <Text className="text-xs font-bold text-blue-600">
                                {compCount} competencies
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View className="flex-row">
                            <TouchableOpacity
                              onPress={() => handleAddCompetency(a)}
                              className="p-2 mr-1 rounded-lg bg-blue-50"
                            >
                              <Plus size={15} color="#00529B" />
                            </TouchableOpacity>

                            {compCount > 0 && (
                              <TouchableOpacity
                                onPress={() =>
                                  setExpandedAuditor(isExpanded ? null : a.id)
                                }
                                className="p-2"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={15} color="#6b7280" />
                                ) : (
                                  <ChevronDown size={15} color="#6b7280" />
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {isExpanded &&
                          a.auditCompetencies?.map((comp: any, idx: number) => (
                            <View
                              key={idx}
                              className="pt-3 mt-3 ml-10 border-t border-gray-100 bg-blue-50/30"
                            >
                              <View className="flex-row items-center">
                                <View className="flex-1">
                                  <Text className="text-xs font-semibold text-blue-900">
                                    {comp.auditType ||
                                      comp.auditType?.name ||
                                      `#${idx + 1}`}
                                  </Text>
                                  <View className="flex-row flex-wrap gap-1 mt-1">
                                    {comp.certifiedProcesses
                                      ?.slice(0, 3)
                                      .map((p: string, i: number) => (
                                        <View
                                          key={i}
                                          className="bg-white px-1.5 py-0.5 rounded border border-blue-200"
                                        >
                                          <Text className="text-xs text-blue-700">
                                            {p}
                                          </Text>
                                        </View>
                                      ))}
                                    {comp.certifiedProcesses?.length > 3 && (
                                      <Text className="text-xs text-blue-400">
                                        +{comp.certifiedProcesses.length - 3}
                                      </Text>
                                    )}
                                  </View>
                                  <Text className="mt-1 text-xs text-gray-400">
                                    Expires: {comp.expiryDate || "N/A"}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleEditCompetency(a, comp)}
                                  className="p-2 mr-1 rounded-lg bg-blue-50"
                                >
                                  <Edit size={14} color="#00529B" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() =>
                                    setDeleteConfirm({
                                      id: String(comp.id),
                                      name:
                                        comp.auditType ||
                                        comp.auditType?.name ||
                                        "Competency",
                                      auditorName: a.name,
                                    })
                                  }
                                  className="p-2 rounded-lg bg-red-50"
                                >
                                  <Trash2 size={14} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                      </View>
                    </View>
                  );
                })}

              {/* Desktop: Table Layout */}

              {isDesktop && (
                <View className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
                  <View className="flex-row bg-gray-50 py-2.5 px-4 border-b border-gray-200">
                    <Text className="flex-1 text-xs font-semibold text-gray-500 uppercase">
                      Auditor
                    </Text>
                    <Text className="w-24 text-xs font-semibold text-center text-gray-500 uppercase">
                      Status
                    </Text>
                    <Text className="w-24 text-xs font-semibold text-center text-gray-500 uppercase">
                      Competencies
                    </Text>
                    <Text className="w-24 text-xs font-semibold text-center text-gray-500 uppercase">
                      Actions
                    </Text>
                  </View>

                  {filteredAuditors.map((a: any) => {
                    const status = getOverallStatus(a);

                    const isExpanded = expandedAuditor === a.id;

                    const compCount = a.auditCompetencies?.length || 0;

                    return (
                      <View key={a.id}>
                        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
                          <TouchableOpacity
                            className="flex-row items-center flex-1"
                            onPress={() =>
                              compCount > 0 &&
                              setExpandedAuditor(isExpanded ? null : a.id)
                            }
                          >
                            <View className="items-center justify-center w-8 h-8 mr-3 bg-blue-100 rounded-lg">
                              <Text className="text-xs font-bold text-blue-900">
                                {(a.name?.charAt(0) || "A").toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-sm font-semibold text-gray-900">
                                {a.name}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {a.role === "LEAD_AUDITOR"
                                  ? "Lead Auditor"
                                  : "Auditor"}
                                {a.department ? ` • ${a.department}` : ""}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <View className="items-center w-24">
                            <View
                              className={`px-2 py-0.5 rounded-full ${status.color}`}
                            >
                              <Text
                                className={`text-xs font-medium ${status.text}`}
                              >
                                {status.label}
                              </Text>
                            </View>
                          </View>
                          <Text className="w-24 text-sm font-bold text-center text-blue-600">
                            {compCount}
                          </Text>
                          <View className="flex-row justify-center w-24 gap-1">
                            <TouchableOpacity
                              onPress={() => handleAddCompetency(a)}
                              className="p-1.5 bg-blue-50 rounded-lg"
                            >
                              <Plus size={14} color="#00529B" />
                            </TouchableOpacity>

                            {compCount > 0 && (
                              <TouchableOpacity
                                onPress={() =>
                                  setExpandedAuditor(isExpanded ? null : a.id)
                                }
                                className="p-1.5 bg-gray-100 rounded-lg"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={14} color="#6b7280" />
                                ) : (
                                  <ChevronDown size={14} color="#6b7280" />
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {isExpanded &&
                          a.auditCompetencies?.map((comp: any, idx: number) => (
                            <View
                              key={idx}
                              className="flex-row items-center px-4 py-2 pl-16 border-b border-gray-100 bg-blue-50/30"
                            >
                              <View className="flex-1">
                                <Text className="text-xs font-semibold text-blue-900">
                                  {comp.auditType ||
                                    comp.auditType?.name ||
                                    `#${idx + 1}`}
                                </Text>
                                <View className="flex-row flex-wrap gap-1 mt-1">
                                  {comp.certifiedProcesses
                                    ?.slice(0, 3)
                                    .map((p: string, i: number) => (
                                      <View
                                        key={i}
                                        className="bg-white px-1.5 py-0.5 rounded border border-blue-200"
                                      >
                                        <Text className="text-xs text-blue-700">
                                          {p}
                                        </Text>
                                      </View>
                                    ))}
                                </View>
                                <Text className="text-xs text-gray-400 mt-0.5">
                                  Expires: {comp.expiryDate || "N/A"}
                                </Text>
                              </View>
                              <View className="flex-row">
                                <TouchableOpacity
                                  onPress={() => handleEditCompetency(a, comp)}
                                  className="p-1.5 bg-blue-50 rounded-lg mr-1"
                                >
                                  <Edit size={14} color="#00529B" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() =>
                                    setDeleteConfirm({
                                      id: String(comp.id),
                                      name:
                                        comp.auditType ||
                                        comp.auditType?.name ||
                                        "Competency",
                                      auditorName: a.name,
                                    })
                                  }
                                  className="p-1.5 bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={14} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
          <Text className="mt-3 mb-6 text-sm text-gray-500">
            Showing {filteredAuditors.length} of {auditors.length} auditors
          </Text>
        </ScrollView>
      )}

      {/* Assign/Edit Modal - Same as EnterpriseManagement */}
      <Modal visible={showModal} transparent animationType="slide">
        <View
          className="flex-1 bg-black/50"
          style={
            isDesktop
              ? { justifyContent: "center", alignItems: "center" }
              : { justifyContent: "flex-end" }
          }
        >
          <View
            style={
              isDesktop
                ? {
                    backgroundColor: "white",
                    borderRadius: 16,
                    width: 500,
                    maxHeight: "80%",
                  }
                : {
                    backgroundColor: "white",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: "80%",
                  }
            }
          >
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-base font-bold text-gray-900">
                {editingCompetency ? "Edit" : "Assign"} Competency
              </Text>
              <TouchableOpacity
                onPress={handleSaveCompetency}
                disabled={loading}
              >
                <Text className="text-sm font-semibold text-blue-600">
                  {loading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedAuditor && (
              <View className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <Text className="text-sm font-medium text-gray-700">
                  {selectedAuditor.name}
                </Text>
                <Text className="text-xs text-gray-500">
                  {selectedAuditor.role} •{" "}
                  {selectedAuditor.department || "No dept"}
                </Text>
              </View>
            )}
            <ScrollView
              className="px-5 py-4"
              showsVerticalScrollIndicator={false}
            >
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Audit Type *
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {auditTypes.map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() =>
                      setFormData({ ...formData, auditTypeId: String(t.id) })
                    }
                    className={`px-4 py-2 rounded-full border ${formData.auditTypeId === String(t.id) ? "bg-blue-900 border-blue-900" : "bg-white border-gray-300"}`}
                  >
                    <Text
                      className={`text-xs font-medium ${formData.auditTypeId === String(t.id) ? "text-white" : "text-gray-600"}`}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View
                className={`${isDesktop ? "flex-row" : "flex-col"} gap-3 mb-3`}
              >
                <DatePickerField
                  label="Certification Date"
                  value={formData.certificationDate}
                  onChange={(date: string) =>
                    setFormData({ ...formData, certificationDate: date })
                  }
                />
                <DatePickerField
                  label="Expiry Date"
                  value={formData.expiryDate}
                  onChange={(date: string) =>
                    setFormData({ ...formData, expiryDate: date })
                  }
                />
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Certified Processes
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.certifiedProcesses.join(", ")}
                onChangeText={(t) =>
                  setFormData({
                    ...formData,
                    certifiedProcesses: t
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Machining, Assembly..."
              />
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Certified Products
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.certifiedProducts.join(", ")}
                onChangeText={(t) =>
                  setFormData({
                    ...formData,
                    certifiedProducts: t
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="24611, 2452..."
              />
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Certification Body
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.certificationBody}
                onChangeText={(t) =>
                  setFormData({ ...formData, certificationBody: t })
                }
                placeholder="e.g., IRCA"
              />
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Certification Number
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-sm mb-3"
                value={formData.certificationNumber}
                onChangeText={(t) =>
                  setFormData({ ...formData, certificationNumber: t })
                }
                placeholder="e.g., IRCA-2024-001"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal - Same as EnterpriseManagement */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade">
        <View className="items-center justify-center flex-1 p-4 bg-black/50">
          <View className="p-6 bg-white shadow-lg rounded-xl w-80">
            <Text className="mb-2 text-lg font-bold text-gray-900">Delete</Text>
            <Text className="mb-6 text-sm text-gray-600">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-300"
              >
                <Text className="text-sm font-medium text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={executeDelete}
                className="px-4 py-2.5 rounded-lg bg-red-600"
              >
                <Text className="text-sm font-semibold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
