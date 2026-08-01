// src/components/modals/PlanDetailsModal.tsx
import { AlertCircle, Check, CheckCircle, Clock, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PlanDetailsModalProps {
  selectedPlan: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approvalComment: string;
  setApprovalComment: (text: string) => void;
  submitting: boolean;
}

const PlanDetailsModal = ({
  selectedPlan,
  onClose,
  onApprove,
  onReject,
  approvalComment,
  setApprovalComment,
  submitting,
}: PlanDetailsModalProps) => {
  if (!selectedPlan) return null;

  const windowWidth = Dimensions.get("window").width;
  const windowHeight = Dimensions.get("window").height;
  const isDesktop = windowWidth >= 768;

  const auditElements = selectedPlan.planItems || [];
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

  let totalPlanned = 0;
  let totalCompleted = 0;
  auditElements.forEach((element: any) => {
    element?.months?.forEach((month: any) => {
      if (month?.status === "PLANNED") totalPlanned++;
      if (month?.status === "COMPLETED") totalCompleted++;
    });
  });

  const completionRate =
    totalPlanned > 0 ? ((totalCompleted / totalPlanned) * 100).toFixed(1) : "0";

  const getStatusBadge = (status: string) => {
    if (status === "APPROVED") {
      return (
        <View className="flex-row items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
          <CheckCircle size={12} color="#15803d" />
          <Text className="text-xs text-green-700">Approved</Text>
        </View>
      );
    }
    if (status === "PENDING_APPROVAL") {
      return (
        <View className="flex-row items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
          <Clock size={12} color="#b45309" />
          <Text className="text-xs text-yellow-700">Pending</Text>
        </View>
      );
    }
    if (status === "REJECTED") {
      return (
        <View className="flex-row items-center gap-1 px-2 py-1 bg-red-100 rounded-full">
          <X size={12} color="#b91c1c" />
          <Text className="text-xs text-red-700">Rejected</Text>
        </View>
      );
    }
    return (
      <View className="px-2 py-1 bg-gray-100 rounded-full">
        <Text className="text-xs text-gray-700">Draft</Text>
      </View>
    );
  };

  // Dynamic width: Wider for pending (needs button space), narrower for approved/rejected
  const modalMaxWidth = isDesktop
    ? selectedPlan.approvalStatus === "PENDING_APPROVAL"
      ? 896
      : 700
    : "100%";

  const modalHeight = isDesktop ? windowHeight * 0.9 : windowHeight * 0.85;
  const headerHeight = 70;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="items-center justify-center flex-1 p-2 bg-black/50">
        <View
          className="w-full overflow-hidden bg-white rounded-2xl"
          style={{
            maxWidth: modalMaxWidth,
            height: modalHeight,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <View className="flex-1 pr-2">
              <Text
                className="text-base font-bold text-gray-900 md:text-lg"
                numberOfLines={1}
              >
                Annual Audit Plan {selectedPlan.year}
              </Text>
              <View className="flex-row flex-wrap items-center gap-1 mt-1">
                {getStatusBadge(selectedPlan.approvalStatus)}
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  Prepared by: {selectedPlan.preparedBy || "N/A"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-gray-100 rounded-full"
            >
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={true}
            style={{ height: modalHeight - headerHeight }}
            contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          >
            {/* Stats Cards */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              <View
                className="items-center p-2 rounded-lg bg-blue-50"
                style={{ width: isDesktop ? "32%" : "48%" }}
              >
                <Text className="text-[10px] font-semibold text-blue-600 mb-1">
                  Total Planned
                </Text>
                <Text className="text-lg font-bold text-blue-700">
                  {totalPlanned}
                </Text>
              </View>
              <View
                className="items-center p-2 rounded-lg bg-green-50"
                style={{ width: isDesktop ? "32%" : "48%" }}
              >
                <Text className="text-[10px] font-semibold text-green-600 mb-1">
                  Completed
                </Text>
                <Text className="text-lg font-bold text-green-700">
                  {totalCompleted}
                </Text>
              </View>
              <View
                className="items-center p-2 rounded-lg bg-purple-50"
                style={{ width: isDesktop ? "32%" : "100%" }}
              >
                <Text className="text-[10px] font-semibold text-purple-600 mb-1">
                  Completion Rate
                </Text>
                <Text className="text-lg font-bold text-purple-700">
                  {completionRate}%
                </Text>
              </View>
            </View>

            {/* Audit Matrix Table */}
            <View
              className="mb-4 overflow-hidden border border-gray-200 rounded-lg"
              style={{ width: "100%" }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View style={{ width: "100%", minWidth: "100%" }}>
                  {/* Table Header */}
                  <View className="flex-row bg-gray-100 border-b-2 border-gray-300">
                    <View
                      className="items-center justify-center px-3 py-3 border-r border-gray-200"
                      style={{
                        minWidth: isDesktop ? 170 : 140,
                        maxWidth: isDesktop ? 180 : 140,
                      }}
                    >
                      <Text className="text-xs font-bold text-center text-gray-800">
                        Audit Element
                      </Text>
                    </View>
                    {months.map((month) => (
                      <View
                        key={month}
                        className="items-center justify-center px-2 py-3 border-r border-gray-200"
                        style={{
                          minWidth: isDesktop ? 70 : 50,
                          flex: isDesktop ? 1 : 0,
                        }}
                      >
                        <Text className="text-[10px] font-bold text-gray-700">
                          {month}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Table Body */}
                  {auditElements.map((element: any, idx: number) => (
                    <View
                      key={idx}
                      className={`flex-row border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      style={{ width: "100%" }}
                    >
                      <View
                        className="justify-center px-3 py-3 border-r border-gray-200"
                        style={{
                          minWidth: isDesktop ? 170 : 140,
                          maxWidth: isDesktop ? 180 : 140,
                        }}
                      >
                        <Text
                          className="text-xs font-medium text-gray-800"
                          numberOfLines={2}
                        >
                          {element?.auditElement || "Unknown"}
                        </Text>
                      </View>
                      {element?.months?.map((month: any, monthIdx: number) => (
                        <View
                          key={monthIdx}
                          className="items-center justify-center px-2 py-3 border-r border-gray-200"
                          style={{
                            minWidth: isDesktop ? 70 : 50,
                            flex: isDesktop ? 1 : 0,
                          }}
                        >
                          {month?.status === "COMPLETED" && (
                            <View className="items-center justify-center w-6 h-6 bg-green-100 rounded">
                              <Text className="text-xs font-bold text-green-700">
                                C
                              </Text>
                            </View>
                          )}
                          {month?.status === "PLANNED" && (
                            <View className="items-center justify-center w-6 h-6 bg-blue-100 rounded">
                              <Text className="text-xs font-bold text-blue-700">
                                P
                              </Text>
                            </View>
                          )}
                          {!month?.status && (
                            <Text className="text-lg text-gray-300">—</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Review Decision Section (Only for Pending) */}
            {selectedPlan.approvalStatus === "PENDING_APPROVAL" && (
              <View className="pt-3 border-t border-gray-200">
                <Text className="mb-2 text-sm font-bold text-gray-800">
                  Review Decision
                </Text>
                <View className="gap-2">
                  <TextInput
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
                    style={{ minHeight: 60, textAlignVertical: "top" }}
                    multiline
                    numberOfLines={3}
                    value={approvalComment}
                    onChangeText={setApprovalComment}
                    placeholder="Add any comments about this plan..."
                    placeholderTextColor="#94a3b8"
                  />

                  {/* Buttons: Natural width on desktop, full width (flex-1) on mobile */}
                  <View
                    className={`${isDesktop ? "flex-row justify-end gap-3" : "flex-row gap-2"}`}
                  >
                    <TouchableOpacity
                      onPress={onReject}
                      className={`${isDesktop ? "px-6" : "flex-1 px-2"} flex-row items-center justify-center gap-2 py-2.5 bg-red-600 rounded-lg active:bg-red-700`}
                    >
                      <X size={16} color="#ffffff" />
                      <Text
                        className="text-sm font-semibold text-white"
                        numberOfLines={1}
                      >
                        Reject Plan
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={onApprove}
                      disabled={submitting}
                      className={`${isDesktop ? "px-6" : "flex-1 px-2"} flex-row items-center justify-center gap-2 py-2.5 bg-green-600 rounded-lg active:bg-green-700 disabled:opacity-50`}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Check size={16} color="#ffffff" />
                      )}
                      <Text
                        className="text-sm font-semibold text-white"
                        numberOfLines={1}
                      >
                        Approve Plan
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Status Summary for Approved / Rejected (Fills empty space nicely) */}
            {selectedPlan.approvalStatus !== "PENDING_APPROVAL" && (
              <View
                className="p-4 mt-4 border rounded-xl"
                style={{
                  borderColor:
                    selectedPlan.approvalStatus === "APPROVED"
                      ? "#bbf7d0"
                      : "#fecaca",
                  backgroundColor:
                    selectedPlan.approvalStatus === "APPROVED"
                      ? "#f0fdf4"
                      : "#fef2f2",
                }}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  {selectedPlan.approvalStatus === "APPROVED" ? (
                    <CheckCircle size={20} color="#166534" />
                  ) : (
                    <AlertCircle size={20} color="#991b1b" />
                  )}
                  <Text className="text-base font-bold text-slate-800">
                    Plan{" "}
                    {selectedPlan.approvalStatus === "APPROVED"
                      ? "Approved"
                      : "Rejected"}
                  </Text>
                </View>
                <Text className="text-sm leading-5 text-slate-700">
                  {selectedPlan.approvalStatus === "APPROVED"
                    ? "This audit plan has been fully approved and is ready for execution."
                    : "This audit plan was rejected. Please review the rejection reason provided below."}
                </Text>
                {selectedPlan.approvalStatus === "APPROVED" &&
                  selectedPlan.approvedBy && (
                    <Text className="mt-3 text-xs font-medium text-slate-500">
                      Approved by: {selectedPlan.approvedBy}
                      {selectedPlan.approvedAt
                        ? ` • ${new Date(selectedPlan.approvedAt).toLocaleDateString()}`
                        : ""}
                    </Text>
                  )}
              </View>
            )}

            {/* Rejection Reason Section (Only for Rejected) */}
            {selectedPlan.approvalStatus === "REJECTED" &&
              selectedPlan.rejectionReason && (
                <View className="p-4 mt-3 border border-red-200 rounded-xl bg-red-50">
                  <View className="flex-row items-center gap-2 mb-2">
                    <AlertCircle size={18} color="#991b1b" />
                    <Text className="text-sm font-bold text-red-800">
                      Rejection Reason
                    </Text>
                  </View>
                  <Text className="text-sm leading-5 text-red-700">
                    {selectedPlan.rejectionReason}
                  </Text>
                </View>
              )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default PlanDetailsModal;
