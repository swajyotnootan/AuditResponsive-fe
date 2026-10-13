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
        <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-1">
          <CheckCircle size={12} color="#15803d" />
          <Text className="text-xs text-green-700">Approved</Text>
        </View>
      );
    }
    if (status === "PENDING_APPROVAL") {
      return (
        <View className="flex-row items-center gap-1 rounded-full bg-yellow-100 px-2 py-1">
          <Clock size={12} color="#b45309" />
          <Text className="text-xs text-yellow-700">Pending</Text>
        </View>
      );
    }
    if (status === "REJECTED") {
      return (
        <View className="flex-row items-center gap-1 rounded-full bg-red-100 px-2 py-1">
          <X size={12} color="#b91c1c" />
          <Text className="text-xs text-red-700">Rejected</Text>
        </View>
      );
    }
    return (
      <View className="rounded-full bg-gray-100 px-2 py-1">
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
      <View className="flex-1 items-center justify-center bg-black/50 p-2">
        <View
          className="w-full overflow-hidden rounded-2xl bg-white"
          style={{
            maxWidth: modalMaxWidth,
            height: modalHeight,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <View className="flex-1 pr-2">
              <Text
                className="text-base font-bold text-gray-900 md:text-lg"
                numberOfLines={1}
              >
                Annual Audit Plan {selectedPlan.year}
              </Text>
              <View className="mt-1 flex-row flex-wrap items-center gap-1">
                {getStatusBadge(selectedPlan.approvalStatus)}
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  Prepared by: {selectedPlan.preparedBy || "N/A"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full bg-gray-100 p-2"
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
            <View className="mb-4 flex-row flex-wrap gap-2">
              <View
                className="items-center rounded-lg bg-blue-50 p-2"
                style={{ width: isDesktop ? "32%" : "48%" }}
              >
                <Text className="mb-1 text-[10px] font-semibold text-blue-600">
                  Total Planned
                </Text>
                <Text className="text-lg font-bold text-blue-700">
                  {totalPlanned}
                </Text>
              </View>
              <View
                className="items-center rounded-lg bg-green-50 p-2"
                style={{ width: isDesktop ? "32%" : "48%" }}
              >
                <Text className="mb-1 text-[10px] font-semibold text-green-600">
                  Completed
                </Text>
                <Text className="text-lg font-bold text-green-700">
                  {totalCompleted}
                </Text>
              </View>
              <View
                className="items-center rounded-lg bg-purple-50 p-2"
                style={{ width: isDesktop ? "32%" : "100%" }}
              >
                <Text className="mb-1 text-[10px] font-semibold text-purple-600">
                  Completion Rate
                </Text>
                <Text className="text-lg font-bold text-purple-700">
                  {completionRate}%
                </Text>
              </View>
            </View>

            {/* Audit Matrix Table */}
            <View
              className="mb-4 overflow-hidden rounded-lg border border-gray-200"
              style={{ width: "100%" }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View style={{ width: "100%", minWidth: "100%" }}>
                  {/* Table Header */}
                  <View className="flex-row border-b-2 border-gray-300 bg-gray-100">
                    <View
                      className="items-center justify-center border-r border-gray-200 px-3 py-3"
                      style={{
                        minWidth: isDesktop ? 170 : 140,
                        maxWidth: isDesktop ? 180 : 140,
                      }}
                    >
                      <Text className="text-center text-xs font-bold text-gray-800">
                        Audit Element
                      </Text>
                    </View>
                    {months.map((month) => (
                      <View
                        key={month}
                        className="items-center justify-center border-r border-gray-200 px-2 py-3"
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
                        className="justify-center border-r border-gray-200 px-3 py-3"
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
                          className="items-center justify-center border-r border-gray-200 px-2 py-3"
                          style={{
                            minWidth: isDesktop ? 70 : 50,
                            flex: isDesktop ? 1 : 0,
                          }}
                        >
                          {month?.status === "COMPLETED" && (
                            <View className="h-6 w-6 items-center justify-center rounded bg-green-100">
                              <Text className="text-xs font-bold text-green-700">
                                C
                              </Text>
                            </View>
                          )}
                          {month?.status === "PLANNED" && (
                            <View className="h-6 w-6 items-center justify-center rounded bg-blue-100">
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
              <View className="border-t border-gray-200 pt-3">
                <Text className="mb-2 text-sm font-bold text-gray-800">
                  Review Decision
                </Text>
                <View className="gap-2">
                  <TextInput
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"
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
                      className={`${isDesktop ? "px-6" : "flex-1 px-2"} flex-row items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 active:bg-red-700`}
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
                      className={`${isDesktop ? "px-6" : "flex-1 px-2"} flex-row items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 active:bg-green-700 disabled:opacity-50`}
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
                className="mt-4 rounded-xl border p-4"
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
                <View className="mb-2 flex-row items-center gap-2">
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
                <View className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <View className="mb-2 flex-row items-center gap-2">
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
