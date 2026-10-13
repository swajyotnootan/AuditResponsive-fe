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
    <View className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <View className="flex-row flex-wrap gap-6">
        {/* Document Control */}
        <View className="min-w-[300px] flex-1">
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
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
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
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
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
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
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
                  className="flex-1 flex-row items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1"
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
        <View className="min-w-[300px] flex-1">
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
      <View className="mt-4 border-t border-gray-200 pt-3">
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
      <View className="mt-6 flex-row flex-wrap justify-end gap-3">
        {canEdit && (
          <TouchableOpacity
            onPress={onSaveDocument}
            disabled={saving}
            className="flex-row items-center gap-2 rounded-lg bg-gray-600 px-4 py-2"
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
            className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2"
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
                  className="flex-row items-center gap-2 rounded-lg bg-red-600 px-4 py-2"
                >
                  <X size={16} color="#FFF" />
                  <Text className="font-medium text-white">Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowApproveComment(true)}
                  className="flex-row items-center gap-2 rounded-lg bg-green-600 px-4 py-2"
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
                  className="w-64 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
                  multiline
                />
                <TouchableOpacity
                  onPress={onApprove}
                  disabled={submitting}
                  className="rounded-lg bg-green-600 px-4 py-2"
                >
                  <Text className="font-medium text-white">Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowApproveComment(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2"
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
          className="flex-1 items-center justify-center bg-black/30 p-5"
          activeOpacity={1}
          onPress={() => setShowFrequencyModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-xs overflow-hidden rounded-xl bg-white"
          >
            <View className="border-b border-gray-200 p-4">
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
                    className={`text-sm ${documentInfo.auditFrequency === freq ? "font-bold text-blue-600" : "text-gray-800"}`}
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
