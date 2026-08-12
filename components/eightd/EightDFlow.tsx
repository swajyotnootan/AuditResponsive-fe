import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import { router } from "expo-router";
import { Grid, Layout } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";

import EightDStepper, { Orientation } from "./EightDStepper";
import D0PlanContain from "./steps/D0PlanContain";
import D1FormTeam from "./steps/D1FormTeam";
import D2FormProblem from "./steps/D2FormProblem";
import D3InterimContainment from "./steps/D3InterimContainment";
import D4RootCause from "./steps/D4RootCause";
import D5CorrectiveActions from "./steps/D5CorrectiveActions";
import D6Implementation from "./steps/D6Implementation";
import D7LessonsLearned from "./steps/D7LessonsLearned";
import D8TeamReward from "./steps/D8TeamReward";
import FinalPreview from "./steps/FinalPreview";

interface RouteParams {
  eventId?: string | null;
  step?: string;
  isNcrBased?: boolean;
  type?: string;
}

interface EightDFormData extends Record<string, any[]> {
  d0: any[];
  d1: any[];
  d2: any[];
  d3: any[];
  d4: any[];
  d5: any[];
  d6: any[];
  d7: any[];
  d8: any[];
}

interface ApprovalState {
  qaApproval: boolean;
  plantMdApproval: boolean;
}

const stepKeys: (keyof EightDFormData)[] = [
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
];

function getFirstUnfilledStep(formData: EightDFormData): number {
  for (let i = 0; i < stepKeys.length; i++) {
    const key = stepKeys[i];
    if (!formData[key] || formData[key].length === 0) {
      return i;
    }
  }
  return stepKeys.length;
}

export default function EightDFlow() {
  const navigation = useNavigation();
  const route = useRoute();

  const params = (route.params as RouteParams) || {};

  const eventId = params.eventId;
  const startStep = params.step;
  const isNcrBased = params.isNcrBased ?? false;
  const type = params.type;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= 768;

  // ✅ Float the toggle in the empty right margin (no overlap, no gap)
  const CONTAINER_MAX = 1080; // must match max-w-[1200px] below
  const sideMargin = Math.max(0, (width - CONTAINER_MAX) / 2);
  const toggleRight = sideMargin >= 70 ? (sideMargin - 42) / 2 : 12;

  const startedFromNcrFlow = Boolean(
    isNcrBased || type === "ncr" || String(eventId || "").startsWith("8D-"),
  );

  const steps = [
    "D0 – Plan & Contain",
    "D1 – Form the Team",
    "D2 – Describe the Problem",
    "D3 – Interim Containment Actions",
    "D4 – Root Cause Analysis",
    "D5 – Permanent Corrective Actions",
    "D6 – Implement & Validate PCAs",
    "D7 – Prevent Recurrence",
    "D8 – Close & Recognize",
    "Final Preview",
  ];

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [eventNo, setEventNo] = useState<string | null>(eventId || null);
  const [approvals, setApprovals] = useState<ApprovalState>({
    qaApproval: false,
    plantMdApproval: false,
  });
  const [documentStatus, setDocumentStatus] = useState<string>("draft");
  const [formData, setFormData] = useState<EightDFormData>({
    d0: [],
    d1: [],
    d2: [],
    d3: [],
    d4: [],
    d5: [],
    d6: [],
    d7: [],
    d8: [],
  });

  useEffect(() => {
    const loadApprovals = async () => {
      try {
        const saved = await AsyncStorage.getItem("8d_approvals");
        if (saved) {
          setApprovals(JSON.parse(saved) as ApprovalState);
        }
      } catch (e) {
        console.error("Failed to load approvals", e);
      }
    };
    loadApprovals();
  }, []);

  useEffect(() => {
    const saveApprovals = async () => {
      try {
        await AsyncStorage.setItem("8d_approvals", JSON.stringify(approvals));
      } catch (e) {
        console.error("Failed to save approvals", e);
      }
    };
    saveApprovals();
  }, [approvals]);

  useEffect(() => {
    const newEventId = params.eventId;

    if (newEventId !== eventNo) {
      setEventNo(newEventId || null);
      setDocumentStatus("draft");
      setIsSubmitted(false);
      setFormData({
        d0: [],
        d1: [],
        d2: [],
        d3: [],
        d4: [],
        d5: [],
        d6: [],
        d7: [],
        d8: [],
      });
    }
  }, [params.eventId]);

  const saveStep = async (
    currentFormData: EightDFormData,
    finalStatus?: string,
  ) => {
    try {
      if (!eventNo && currentFormData.d0 && currentFormData.d0.length > 0) {
        const d0Data = currentFormData.d0[0];
        if (!d0Data.eventNo || String(d0Data.eventNo).trim() === "") {
          Alert.alert(
            "Error",
            "❌ Please enter an Event ID in D0 before proceeding.",
          );
          return false;
        }
      }

      const payload: Record<string, any> = {};

      if (finalStatus) {
        payload.status = finalStatus;
      }

      stepKeys.forEach((key) => {
        if (currentFormData[key] && currentFormData[key].length > 0) {
          const formWithId = currentFormData[key].map((form: any) => ({
            ...form,
            ...(key === "d0"
              ? { eventNo: form.eventNo || eventNo }
              : { eventId: eventNo || currentFormData.d0?.[0]?.eventNo }),
          }));
          payload[key] = formWithId;
        }
      });

      const formDataToSend = new FormData();
      formDataToSend.append("jsonContent", JSON.stringify(payload));

      let response;
      const baseURL = "https://auditchecksheetncr-be.hub.swajyot.co.in:9443/api/eightd/data";

      if (eventNo) {
        response = await axios.put(`${baseURL}/${eventNo}`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axios.post(baseURL, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (response?.data?.success) {
        const savedEventNo =
          response.data.data?.id || response.data.data?.eventNo;
        if (savedEventNo && !eventNo) {
          setEventNo(savedEventNo);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Error saving 8D step:", err);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to save step.",
      );
      return false;
    }
  };

  const nextStep = async () => {
    const success = await saveStep(formData);
    if (!success) return;

    if (currentStep === 0 && currentStep + 1 === 1) {
      if (documentStatus === "rejected") {
        Alert.alert(
          "Rejected",
          "❌ This document was rejected and cannot be continued.",
        );
        return;
      }

      if (documentStatus !== "in progress") {
        Alert.alert(
          "Approval Required",
          "⚠️ HOD approval is required before proceeding to D1.",
        );
        return;
      }
    }

    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    if (index === 0) {
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
      return;
    }

    if (documentStatus !== "in progress") {
      Alert.alert(
        "Approval Required",
        "⚠️ You must get HOD approval before accessing steps beyond D0.",
      );
      return;
    }

    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await saveStep(formData, "Submitted");

      if (success) {
        setIsSubmitted(true);
        setDocumentStatus("Submitted");

        Alert.alert("Success", "✅ 8D Report submitted successfully!", [
          {
            text: "OK",
            onPress: () => {
              router.replace({
                pathname: "/",
                params: { refreshToken: Date.now().toString() },
              });
            },
          },
        ]);
      } else {
        Alert.alert("Error", "❌ Failed to submit. Please check your data.");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", " An error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!eventNo) return;

      try {
        const response = await axios.get(
          `https://auditchecksheetncr-be.hub.swajyot.co.in:9443/api/eightd/data/${eventNo}`,
        );
        if (response.data?.success && response.data.data?.content) {
          const content = response.data.data.content;
          const loadedData: Partial<EightDFormData> = {};
          stepKeys.forEach((key) => {
            loadedData[key] = Array.isArray(content[key]) ? content[key] : [];
          });
          setFormData(loadedData as EightDFormData);
          setDocumentStatus(response.data.data.status || "draft");

          if (startStep) {
            const stepIndex = stepKeys.indexOf(
              startStep.toLowerCase() as keyof EightDFormData,
            );
            if (stepIndex >= 0) setCurrentStep(stepIndex);
          } else {
            setCurrentStep(getFirstUnfilledStep(loadedData as EightDFormData));
          }
        }
      } catch (err) {
        console.error("Error fetching 8D ", err);
      }
    };
    fetchData();
  }, [eventNo, startStep]);

  useEffect(() => {
    const normalizedStatus = documentStatus?.toLowerCase();
    if (normalizedStatus === "submitted" || normalizedStatus === "closed") {
      setIsSubmitted(true);
    }
  }, [documentStatus]);

  useEffect(() => {
    console.log("🔍 DEBUG - Current status:", {
      documentStatus,
      d0Status: formData.d0[0]?.status,
      currentStep,
      eventNo,
    });
  }, [documentStatus, formData, currentStep, eventNo]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <D0PlanContain
            eventId={eventNo}
            initialIsNcrBased={startedFromNcrFlow}
            updateParent={(rows: any[]) => {
              setFormData((prev) => ({ ...prev, d0: rows }));
              if (rows[0]?.status) {
                setDocumentStatus(rows[0].status);
              }
            }}
          />
        );
      case 1:
        return (
          <D1FormTeam
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d1: rows }))
            }
          />
        );
      case 2:
        return (
          <D2FormProblem
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d2: rows }))
            }
          />
        );
      case 3:
        return (
          <D3InterimContainment
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d3: rows }))
            }
          />
        );
      case 4:
        return (
          <D4RootCause
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d4: rows }))
            }
          />
        );
      case 5:
        return (
          <D5CorrectiveActions
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d5: rows }))
            }
          />
        );
      case 6:
        return (
          <D6Implementation
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d6: rows }))
            }
          />
        );
      case 7:
        return (
          <D7LessonsLearned
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d7: rows }))
            }
          />
        );
      case 8:
        return (
          <D8TeamReward
            eventId={eventNo}
            updateParent={(rows: any[]) =>
              setFormData((prev) => ({ ...prev, d8: rows }))
            }
          />
        );
      case 9:
        return <FinalPreview eventId={eventNo} />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ✅ Floating toggle — absolute, zero layout space */}
      {isDesktop && (
        <Pressable
          onPress={() =>
            setOrientation(
              orientation === "horizontal" ? "vertical" : "horizontal",
            )
          }
          style={{
            position: "absolute",
            top: 8,
            right: toggleRight,
            zIndex: 50,
            width: 42,
            height: 42,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#3b82f6",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {orientation === "horizontal" ? (
            <Grid size={20} color="#ffffff" />
          ) : (
            <Layout size={20} color="#ffffff" />
          )}
        </Pressable>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 8,
          paddingTop: 4,
          paddingHorizontal: isDesktop ? 8 : 0, // ✅ no side padding on mobile
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            alignSelf: "center",
            width: "100%",
            maxWidth: isDesktop ? 1080 : "100%", // ✅ full width on mobile (like UserFormModal)
          }}
        >
          <EightDStepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
            stepData={formData}
            orientation={orientation}
          >
            <View
              style={{
                width: "100%",
                backgroundColor: "white",
                marginTop: isDesktop ? 8 : 2,
                padding: isDesktop ? 16 : 8, // ✅ tighter on mobile
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Animated.View
                key={currentStep}
                entering={
                  direction > 0
                    ? SlideInRight.duration(400)
                    : SlideInLeft.duration(400)
                }
                exiting={
                  direction > 0
                    ? SlideOutLeft.duration(400)
                    : SlideOutRight.duration(400)
                }
                className="w-full"
              >
                {renderStepContent()}
              </Animated.View>
              <View className="flex flex-col items-stretch justify-between gap-2 pt-3 mt-3 border-t border-gray-200 sm:flex-row sm:items-center">
                <TouchableOpacity
                  onPress={prevStep}
                  disabled={currentStep === 0}
                  className={`px-4 py-2.5 w-full sm:w-auto min-w-[100px] rounded-lg items-center justify-center border bg-gray-100 border-gray-300 ${currentStep === 0 ? "opacity-50" : ""}`}
                >
                  <Text className="text-sm font-medium text-gray-700">
                    ⬅ Back
                  </Text>
                </TouchableOpacity>

                {currentStep < steps.length - 1 ? (
                  <TouchableOpacity
                    onPress={nextStep}
                    disabled={isSubmitting}
                    className={`px-4 py-2.5 w-full sm:w-auto min-w-[100px] rounded-lg items-center justify-center border ${
                      isSubmitting
                        ? "bg-gray-400 border-gray-500"
                        : "bg-blue-600 border-blue-700 active:bg-blue-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-sm font-medium text-white">
                        Save & Next ➡
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : isSubmitted ? (
                  <View className="px-4 py-2.5 w-full sm:w-auto min-w-[100px] rounded-lg items-center justify-center bg-green-100 border border-green-300">
                    <Text className="text-sm font-bold text-green-700">
                      ✓ Submitted
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleFinalSubmit}
                    disabled={isSubmitting}
                    className={`px-4 py-2.5 w-full sm:w-auto min-w-[100px] rounded-lg items-center justify-center border ${
                      isSubmitting
                        ? "bg-gray-400 border-gray-500"
                        : "bg-green-600 border-green-700 active:bg-green-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-sm font-medium text-white">
                        ✅ Submit Report
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </EightDStepper>
        </View>
      </ScrollView>
    </View>
  );
}
