"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import Icon from "react-native-vector-icons/Feather";

interface ResponseDetailModalProps {
  response: any;
  onClose: () => void;
  visible: boolean;
}

const ResponseDetailModal: React.FC<ResponseDetailModalProps> = ({
  response,
  onClose,
  visible,
}) => {
  // ============================================
  // ✅ STEP 1: ALL HOOKS DECLARED FIRST
  // ============================================
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [answers, setAnswers] = useState<any>(null);

  useEffect(() => {
    if (response?.answers) {
      const parsed =
        typeof response.answers === "string"
          ? JSON.parse(response.answers)
          : response.answers;
      setAnswers(parsed);
    }
  }, [response]);

  // ✅ Move useMemo hooks BEFORE the early return
  const modalWidth = useMemo(() => {
    if (isMobile) return width * 0.95;
    if (isTablet) return width * 0.85;
    return width * 0.7;
  }, [width, isMobile, isTablet]);

  const modalHeight = useMemo(() => {
    return height * 0.9;
  }, [height]);

  // ============================================
  // ✅ STEP 2: CONDITIONAL RETURNS (AFTER ALL HOOKS)
  // ============================================
  if (!answers) return null;

  const responsesObj = answers.responses || {};
  const compliantCount = Object.values(responsesObj).filter(
    (v: any) => v === "COMPLIANT"
  ).length;
  const minorCount = Object.values(responsesObj).filter(
    (v: any) => v === "MINOR_NC"
  ).length;
  const majorCount = Object.values(responsesObj).filter(
    (v: any) => v === "MAJOR_NC"
  ).length;

  const getResponseColor = (resp: string) => {
    switch (resp) {
      case "COMPLIANT":
        return "#10B981";
      case "MINOR_NC":
        return "#F59E0B";
      case "MAJOR_NC":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getResponseLabel = (resp: string) => {
    switch (resp) {
      case "COMPLIANT":
        return "✓ Compliant";
      case "MINOR_NC":
        return "! Minor NC";
      case "MAJOR_NC":
        return "✗ Major NC";
      default:
        return resp;
    }
  };

  // ============================================
  // STEP 3: RENDER
  // ============================================
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            width: modalWidth,
            maxHeight: modalHeight,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              backgroundColor: "#4F46E5",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Response Details
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 12 : 14,
                  color: "#C7D2FE",
                  marginTop: 2,
                }}
              >
                {answers?.documentNumber || "N/A"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 16 }}>
            {/* Summary Stats */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: isMobile ? "45%" : "23%",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: "#D1FAE5",
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: "bold",
                    color: "#059669",
                  }}
                >
                  {compliantCount}
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                  Compliant
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: isMobile ? "45%" : "23%",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: "#FEF3C7",
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: "bold",
                    color: "#D97706",
                  }}
                >
                  {minorCount}
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                  Minor NC
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: isMobile ? "45%" : "23%",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: "#FEE2E2",
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: "bold",
                    color: "#DC2626",
                  }}
                >
                  {majorCount}
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                  Major NC
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  minWidth: isMobile ? "45%" : "23%",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: "#DBEAFE",
                }}
              >
                <Text
                  style={{
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: "bold",
                    color: "#2563EB",
                  }}
                >
                  {response.percentageScore || 0}%
                </Text>
                <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                  Score
                </Text>
              </View>
            </View>

            {/* Info Grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                padding: 12,
                backgroundColor: "#F9FAFB",
                borderRadius: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: "45%" }}>
                <Text style={{ fontSize: 11, color: "#6B7280" }}>
                  Department
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#1F2937",
                    marginTop: 2,
                  }}
                >
                  {answers?.department || response.department || "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: "45%" }}>
                <Text style={{ fontSize: 11, color: "#6B7280" }}>Process</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#1F2937",
                    marginTop: 2,
                  }}
                >
                  {answers?.processName || "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: "45%" }}>
                <Text style={{ fontSize: 11, color: "#6B7280" }}>Auditee</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#1F2937",
                    marginTop: 2,
                  }}
                >
                  {answers?.auditeeName || response.auditeeName || "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: "45%" }}>
                <Text style={{ fontSize: 11, color: "#6B7280" }}>Date</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: "#1F2937",
                    marginTop: 2,
                  }}
                >
                  {answers?.date || "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: "45%" }}>
                <Text style={{ fontSize: 11, color: "#6B7280" }}>Status</Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    alignSelf: "flex-start",
                    marginTop: 2,
                    backgroundColor:
                      response.status === "APPROVED"
                        ? "#D1FAE5"
                        : response.status === "REJECTED"
                        ? "#FEE2E2"
                        : "#DBEAFE",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: "#1F2937",
                    }}
                  >
                    {response.status || "DRAFT"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Question Responses */}
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: "600",
                  color: "#1F2937",
                  marginBottom: 12,
                }}
              >
                Question Responses
              </Text>
              {Object.entries(responsesObj).map(([qId, resp]: [string, any]) => (
                <View
                  key={qId}
                  style={{
                    padding: isMobile ? 10 : 12,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: getResponseColor(resp),
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontFamily: "monospace",
                      }}
                    >
                      Q{qId}
                    </Text>
                    <Text
                      style={{
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: "500",
                        color: getResponseColor(resp),
                      }}
                    >
                      {getResponseLabel(resp)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: isMobile ? 12 : 13,
                      color: "#1F2937",
                    }}
                  >
                    {answers?.observations?.[qId] || `Question ${qId}`}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ResponseDetailModal;