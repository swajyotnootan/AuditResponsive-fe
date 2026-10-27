import { Check, ChevronDown, Save, Send, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface DocumentInfo {
  documentRevision: string;
  revisionDate: string;
  revisionDetails: string;
  auditFrequency: string;
  preparedBy: string;
  approvedBy: string;
  [key: string]: any;
}

interface Stats {
  totalSchedules: number;
  [key: string]: any;
}

interface DocumentControlSectionProps {
  documentInfo: any;
  setDocumentInfo: React.Dispatch<React.SetStateAction<DocumentInfo>>;
  planStatus: string;
  selectedMonth: string;
  monthDisplay: string;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  stats: Stats;
  onSaveDocument: () => void;
  onSubmitForApproval: () => void;
  onApprove: () => void;
  onReject: () => void;
  saving: boolean;
  submitting: boolean;
  approvalComment: string;
  setApprovalComment: React.Dispatch<React.SetStateAction<string>>;
}

// ✅ FIXED: Outline Button with Guaranteed Hover Effect & NO TypeScript Errors
// ✅ UPDATED: Outline Button with Light Blue Background on Hover/Press
const OutlineButton = ({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  loading = false,
}: any) => {
  const [isHovered, setIsHovered] = useState(false);

  // Determine colors based on hover state
  const isHoveredAndEnabled = isHovered && !disabled;

  const borderColor = isHoveredAndEnabled ? "#2563EB" : "#D1D5DB"; // Blue : Light Gray
  const textColor = isHoveredAndEnabled ? "#2563EB" : "#111827"; // Blue : Black
  const iconColor = isHoveredAndEnabled ? "#2563EB" : "#6B7280"; // Blue : Gray
  const backgroundColor = isHoveredAndEnabled ? "#EFF6FF" : "#FFFFFF"; // Light Blue : White

  // Safely add web-only hover events without TypeScript errors
  const webHoverProps =
    Platform.OS === "web"
      ? {
          // @ts-ignore
          onMouseEnter: () => !disabled && setIsHovered(true),
          // @ts-ignore
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      // 📱 Mobile Touch Events
      onPressIn={() => !disabled && setIsHovered(true)}
      onPressOut={() => !disabled && setIsHovered(false)}
      // 💻 Web Hover Events (Applied safely)
      {...webHoverProps}
      disabled={disabled || loading}
      className="flex-row items-center gap-2 rounded-lg px-4 py-2"
      style={{
        borderWidth: 1,
        borderColor,
        backgroundColor, // ✅ Added light blue background on hover
        opacity: disabled ? 0.5 : 1,
        transitionProperty: "all", // Smooth transition on web
        transitionDuration: "150ms",
      }}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}

      <Text className="font-semibold" style={{ color: textColor }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
const DocumentControlSection = ({
  documentInfo,
  setDocumentInfo,
  planStatus,
  selectedMonth,
  monthDisplay,
  canEdit,
  canSubmit,
  canApprove,
  stats,
  onSaveDocument,
  onSubmitForApproval,
  onApprove,
  onReject,
  saving,
  submitting,
  approvalComment,
  setApprovalComment,
}: DocumentControlSectionProps) => {
  const [showApproveComment, setShowApproveComment] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  const handleFrequencyChange = (freq: string) => {
    setDocumentInfo({ ...documentInfo, auditFrequency: freq });
    setShowFrequencyModal(false);
  };

  return (
    <View className="rounded-xl border border-gray-200 bg-white p-5">
      <View className="flex-row flex-wrap gap-8">
        {/* Document Control */}
        <View className="min-w-[300px] flex-1">
          <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            Document Control
          </Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Document Title:
              </Text>
              <Text className="flex-1 text-sm text-gray-900">
                Internal Quality Audit Schedule Sheet
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Document No.:
              </Text>
              <Text className="text-sm text-gray-900">IQA/F/05</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Revision:
              </Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.documentRevision}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, documentRevision: val })
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                />
              ) : (
                <Text className="text-sm text-gray-900">
                  {documentInfo.documentRevision}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Revision Date:
              </Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.revisionDate}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, revisionDate: val })
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Text className="text-sm text-gray-900">
                  {documentInfo.revisionDate}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Revision Details:
              </Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.revisionDetails}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, revisionDetails: val })
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900"
                />
              ) : (
                <Text className="text-sm text-gray-900">
                  {documentInfo.revisionDetails}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Audit Frequency:
              </Text>
              {canEdit ? (
                <TouchableOpacity
                  onPress={() => setShowFrequencyModal(true)}
                  className="flex-1 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5"
                >
                  <Text className="text-sm text-gray-900">
                    {documentInfo.auditFrequency}
                  </Text>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
              ) : (
                <Text className="text-sm text-gray-900">
                  {documentInfo.auditFrequency}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Approval */}
        <View className="min-w-[300px] flex-1">
          <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            Approval
          </Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Prepared By:
              </Text>
              <Text className="flex-1 text-sm text-gray-900">
                {documentInfo.preparedBy &&
                documentInfo.preparedBy !== "Audit Manager"
                  ? documentInfo.preparedBy
                  : documentInfo.preparedBy || "Not assigned"}
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Approved By:
              </Text>
              {planStatus === "APPROVED" ? (
                <Text className="text-sm font-semibold text-gray-900">
                  {documentInfo.approvedBy || "Top Management"}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400">Not approved yet</Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm font-medium text-gray-500">
                Date:
              </Text>
              <Text className="text-sm text-gray-900">
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View className="mt-6 border-t border-gray-100 pt-4">
        <Text className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
          Legend - Audit Elements Codes
        </Text>
        <View className="flex-row flex-wrap gap-4">
          <Text className="text-xs font-medium text-gray-600">
            A - System Audit (ISO9001)
          </Text>
          <Text className="text-xs font-medium text-gray-600">
            B - System Audit (IATF16949)
          </Text>
          <Text className="text-xs font-medium text-gray-600">
            C - 5S Audit
          </Text>
          <Text className="text-xs font-medium text-gray-600">
            D - Process Audit
          </Text>
          <Text className="text-xs font-medium text-gray-600">
            E - Product Audit
          </Text>
        </View>
      </View>

      {/* ✅ Action Buttons with Hover/Press Effect */}
      <View className="mt-6 flex-row flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
        {canEdit && (
          <OutlineButton
            title="Save Draft"
            icon={Save}
            onPress={onSaveDocument}
            loading={saving}
          />
        )}

        {canSubmit && stats.totalSchedules > 0 && (
          <OutlineButton
            title={`Submit`}
            icon={Send}
            onPress={onSubmitForApproval}
            loading={submitting}
          />
        )}

        {canApprove && (
          <View className="flex-row gap-3">
            {!showApproveComment ? (
              <>
                <OutlineButton title="Reject" icon={X} onPress={onReject} />
                <OutlineButton
                  title="Approve"
                  icon={Check}
                  onPress={() => setShowApproveComment(true)}
                />
              </>
            ) : (
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  placeholder="Add approval comments..."
                  className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  multiline
                />
                <OutlineButton
                  title={submitting ? "Confirming..." : "Confirm"}
                  onPress={onApprove}
                  loading={submitting}
                />
                <OutlineButton
                  title="Cancel"
                  onPress={() => setShowApproveComment(false)}
                />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Frequency Modal */}
      <Modal visible={showFrequencyModal} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/30 p-5"
          activeOpacity={1}
          onPress={() => setShowFrequencyModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-xs overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <View className="border-b border-gray-100 p-4">
              <Text className="text-base font-bold text-gray-900">
                Select Frequency
              </Text>
            </View>
            <View className="p-2">
              {["Half yearly", "Quarterly"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => handleFrequencyChange(freq)}
                  className={`mb-1 rounded-lg p-3 ${documentInfo.auditFrequency === freq ? "bg-blue-50" : ""}`}
                >
                  <Text
                    className={`text-sm ${documentInfo.auditFrequency === freq ? "font-bold text-blue-600" : "text-gray-700"}`}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default DocumentControlSection;
