import { Check, ChevronDown, Save, Send, X } from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ✅ FIX: Define TypeScript interfaces to resolve the prop type errors
interface DocumentInfo {
  documentRevision: string;
  revisionDate: string;
  revisionDetails: string;
  auditFrequency: string;
  preparedBy: string;
  approvedBy: string;
  [key: string]: any; // Allows any other extra properties
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

// ✅ Apply the interface to the component props
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
    <View className="p-4 mt-6 bg-white border border-gray-200 rounded-xl">
      <View className="flex-row flex-wrap gap-6">
        {/* Document Control */}
        <View className="flex-1 min-w-[300px]">
          <Text className="mb-3 text-sm font-semibold text-gray-700">
            Document Control
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">
                Document Title:
              </Text>
              <Text className="flex-1 text-sm font-medium text-gray-800">
                Internal Quality audit Schedule sheet
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Document No.:</Text>
              <Text className="text-sm text-gray-800">IQA/F/05</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Revision:</Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.documentRevision}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, documentRevision: val })
                  }
                  className="flex-1 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg"
                />
              ) : (
                <Text className="text-sm text-gray-800">
                  {documentInfo.documentRevision}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Revision Date:</Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.revisionDate}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, revisionDate: val })
                  }
                  className="flex-1 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg"
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Text className="text-sm text-gray-800">
                  {documentInfo.revisionDate}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">
                Revision Details:
              </Text>
              {canEdit ? (
                <TextInput
                  value={documentInfo.revisionDetails}
                  onChangeText={(val) =>
                    setDocumentInfo({ ...documentInfo, revisionDetails: val })
                  }
                  className="flex-1 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg"
                />
              ) : (
                <Text className="text-sm text-gray-800">
                  {documentInfo.revisionDetails}
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">
                Audit Frequency:
              </Text>
              {canEdit ? (
                <TouchableOpacity
                  onPress={() => setShowFrequencyModal(true)}
                  className="flex-row items-center justify-between flex-1 px-2 py-1 bg-white border border-gray-200 rounded-lg"
                >
                  <Text className="text-sm text-gray-800">
                    {documentInfo.auditFrequency}
                  </Text>
                  <ChevronDown size={14} color="#6B7280" />
                </TouchableOpacity>
              ) : (
                <Text className="text-sm text-gray-800">
                  {documentInfo.auditFrequency}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Approval */}
        <View className="flex-1 min-w-[300px]">
          <Text className="mb-3 text-sm font-semibold text-gray-700">
            Approval
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Prepared By:</Text>
              <Text className="flex-1 text-sm font-medium text-gray-800">
                {documentInfo.preparedBy &&
                documentInfo.preparedBy !== "Audit Manager"
                  ? documentInfo.preparedBy
                  : documentInfo.preparedBy || "Not assigned"}
              </Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Approved By:</Text>
              {planStatus === "APPROVED" ? (
                <Text className="text-sm font-medium text-green-700">
                  {documentInfo.approvedBy || "Top Management"}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400">Not approved yet</Text>
              )}
            </View>
            <View className="flex-row items-center gap-4">
              <Text className="w-32 text-sm text-gray-500">Date:</Text>
              <Text className="text-sm text-gray-800">
                {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View className="pt-3 mt-4 border-t border-gray-200">
        <Text className="mb-2 text-sm font-semibold text-gray-700">
          Legend - Audit Elements codes
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <Text className="text-xs text-gray-600">
            A - System Audit (ISO9001)
          </Text>
          <Text className="text-xs text-gray-600">
            B - System Audit (IATF16949)
          </Text>
          <Text className="text-xs text-gray-600">C - 5S Audit</Text>
          <Text className="text-xs text-gray-600">D - Process Audit</Text>
          <Text className="text-xs text-gray-600">E - Product Audit</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row flex-wrap justify-end gap-3 mt-6">
        {canEdit && (
          <TouchableOpacity
            onPress={onSaveDocument}
            disabled={saving}
            className="flex-row items-center gap-2 px-4 py-2 bg-gray-600 rounded-lg"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Save size={16} color="#FFF" />
            )}
            <Text className="font-medium text-white">Save Draft</Text>
          </TouchableOpacity>
        )}

        {canSubmit && stats.totalSchedules > 0 && (
          <TouchableOpacity
            onPress={onSubmitForApproval}
            disabled={submitting}
            className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Send size={16} color="#FFF" />
            )}
            <Text className="font-medium text-white">
              Submit {monthDisplay} for Approval
            </Text>
          </TouchableOpacity>
        )}

        {canApprove && (
          <View className="flex-row gap-2">
            {!showApproveComment ? (
              <>
                <TouchableOpacity
                  onPress={onReject}
                  className="flex-row items-center gap-2 px-4 py-2 bg-red-600 rounded-lg"
                >
                  <X size={16} color="#FFF" />
                  <Text className="font-medium text-white">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowApproveComment(true)}
                  className="flex-row items-center gap-2 px-4 py-2 bg-green-600 rounded-lg"
                >
                  <Check size={16} color="#FFF" />
                  <Text className="font-medium text-white">Approve</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  placeholder="Add approval comments..."
                  className="w-64 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg"
                  multiline
                />
                <TouchableOpacity
                  onPress={onApprove}
                  disabled={submitting}
                  className="px-4 py-2 bg-green-600 rounded-lg"
                >
                  <Text className="font-medium text-white">Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowApproveComment(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <Text className="font-medium text-gray-700">Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Frequency Modal */}
      <Modal visible={showFrequencyModal} transparent animationType="fade">
        <TouchableOpacity
          className="items-center justify-center flex-1 p-5 bg-black/30"
          activeOpacity={1}
          onPress={() => setShowFrequencyModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-xs overflow-hidden bg-white rounded-xl"
          >
            <View className="p-4 border-b border-gray-200">
              <Text className="text-base font-bold text-gray-900">
                Select Frequency
              </Text>
            </View>
            <View className="p-2">
              {["Half yearly", "Quarterly"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => handleFrequencyChange(freq)}
                  className={`p-3 rounded-lg mb-1 ${documentInfo.auditFrequency === freq ? "bg-blue-50" : ""}`}
                >
                  <Text
                    className={`text-sm ${documentInfo.auditFrequency === freq ? "text-blue-600 font-bold" : "text-gray-800"}`}
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
