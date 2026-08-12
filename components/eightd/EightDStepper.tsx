import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import React, { ReactNode, useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// --- Types ---
type StepData = Record<string, any> | null | undefined;
type StepStatus = "current" | "completed" | "pending";
export type Orientation = "horizontal" | "vertical";

interface EightDStepperProps {
  steps: any[];
  currentStep: number;
  onStepClick: (index: number) => void;
  stepData?: StepData;
  orientation?: Orientation;
  children?: ReactNode;
}

interface StepNodeProps {
  index: number;
  status: StepStatus;
  label: string;
  onPress: () => void;
  isVertical?: boolean;
  circleSize?: number;
}

// --- Helpers ---
const isStepCompleted = (index: number, stepData?: StepData): boolean => {
  if (!stepData) return false;
  const content = stepData[`d${index}`];
  return Array.isArray(content) ? content.length > 0 : false;
};

const getStepStatus = (
  index: number,
  currentStep: number,
  stepData?: StepData,
): StepStatus => {
  if (index === currentStep) return "current";
  if (isStepCompleted(index, stepData)) return "completed";
  return "pending";
};

const defaultStepNames = [
  "Plan & Contain",
  "Form Team",
  "Problem",
  "Interim Contain",
  "Root Cause",
  "Corrective Action",
  "Implement",
  "Prevent",
  "Close & Recognize",
  "Preview",
];

// --- Image-matched color coding ---
const STEP_COLORS = {
  currentGradient: ["#5b9bf8", "#2262e4"] as [string, string],
  currentBorder: "#2563eb",
  currentLabel: "#2563eb",
  completedGradient: ["#4ade80", "#16a34a"] as [string, string],
  completedBorder: "#16a34a",
  completedLabel: "#16a34a",
  pendingGradient: ["#f3f4f6", "#d8dbe0"] as [string, string],
  pendingBorder: "#c9ced6",
  pendingText: "#374151",
  pendingLabel: "#6b7280",
  connector: "#d1d5db",
  connectorDone: "#22c55e",
};

// --- Animated Pulse ---
function Pulse({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const duration = 1000;
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration }), withTiming(1, { duration })),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration }), withTiming(0.4, { duration })),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 9999,
          backgroundColor: color,
        },
      ]}
    />
  );
}

// --- Reusable Step Node ---
function StepNode({
  index,
  status,
  label,
  onPress,
  isVertical = false,
  circleSize = 44,
}: StepNodeProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(status === "current" ? 1.08 : 1, {
      damping: 20,
      stiffness: 300,
    });
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  const gradient = isCurrent
    ? STEP_COLORS.currentGradient
    : isCompleted
      ? STEP_COLORS.completedGradient
      : STEP_COLORS.pendingGradient;
  const borderColor = isCurrent
    ? STEP_COLORS.currentBorder
    : isCompleted
      ? STEP_COLORS.completedBorder
      : STEP_COLORS.pendingBorder;
  const textColor =
    isCurrent || isCompleted ? "#ffffff" : STEP_COLORS.pendingText;
  const labelColor = isCurrent
    ? STEP_COLORS.currentLabel
    : isCompleted
      ? STEP_COLORS.completedLabel
      : STEP_COLORS.pendingLabel;

  return (
    <View
      style={
        isVertical
          ? { flexDirection: "row", alignItems: "center" }
          : { alignItems: "center", alignSelf: "stretch" }
      }
    >
      <Pressable
        onPressIn={() =>
          (scale.value = withSpring(0.9, { damping: 20, stiffness: 300 }))
        }
        onPressOut={() =>
          (scale.value = withSpring(status === "current" ? 1.08 : 1, {
            damping: 20,
            stiffness: 300,
          }))
        }
        onPress={onPress}
      >
        <Animated.View style={animatedStyle}>
          <View
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth: 1,
              borderColor,
              overflow: "hidden",
              shadowColor: isCurrent ? "#2563eb" : "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isCurrent ? 0.35 : 0.08,
              shadowRadius: 4,
              elevation: isCurrent ? 4 : 1,
            }}
          >
            <LinearGradient
              colors={gradient}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isCurrent && <Pulse color="rgba(96,165,250,0.45)" />}
              {isCompleted ? (
                <Check
                  size={circleSize * 0.42}
                  color="#ffffff"
                  strokeWidth={3}
                />
              ) : (
                <Text
                  style={{
                    color: textColor,
                    fontWeight: "700",
                    fontSize: circleSize * 0.32,
                  }}
                >
                  {`D${index}`}
                </Text>
              )}
            </LinearGradient>
          </View>
        </Animated.View>
      </Pressable>

      {!isVertical && (
        <Text
          numberOfLines={2}
          style={{
            marginTop: 6,
            width: "100%",
            textAlign: "center",
            fontSize: 11,
            lineHeight: 14,
            fontWeight: isCurrent ? "700" : isCompleted ? "600" : "400",
            color: labelColor,
          }}
        >
          {label}
        </Text>
      )}
      {isVertical && (
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            marginLeft: 12,
            fontSize: 13,
            lineHeight: 16,
            fontWeight: isCurrent ? "700" : isCompleted ? "600" : "500",
            color: labelColor,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

// --- Main Component ---
export default function EightDStepper({
  steps,
  currentStep,
  onStepClick,
  stepData,
  orientation = "horizontal",
  children,
}: EightDStepperProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktop = isWeb && width >= 768;

  const effectiveOrientation: Orientation = isDesktop
    ? orientation
    : "horizontal";

  const useScrollStepper = !isDesktop || width < 1100;

  const circleSize = isDesktop ? 46 : 40;
  const lineMarginTop = circleSize / 2 - 1;

  const handleStepClick = (index: number) => {
    onStepClick(index);
  };

  const renderScrollStepper = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        alignItems: "flex-start",
        paddingHorizontal: 4,
        paddingBottom: 4,
      }}
    >
      {steps.map((_, index: number) => {
        const status = getStepStatus(index, currentStep, stepData);
        const lineDone = status === "completed" || index < currentStep;
        return (
          <View
            key={index}
            style={{ flexDirection: "row", alignItems: "flex-start" }}
          >
            <View style={{ alignItems: "center", width: 76 }}>
              <StepNode
                index={index}
                status={status}
                label={defaultStepNames[index] || `D${index}`}
                onPress={() => handleStepClick(index)}
                circleSize={circleSize}
              />
            </View>
            {index < steps.length - 1 && (
              <View
                style={{
                  width: 20,
                  height: 2,
                  marginTop: lineMarginTop,
                  marginHorizontal: 2,
                  borderRadius: 1,
                  backgroundColor: lineDone
                    ? STEP_COLORS.connectorDone
                    : STEP_COLORS.connector,
                }}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderFlexStepper = () => (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start", width: "100%" }}
    >
      {steps.map((_, index: number) => {
        const status = getStepStatus(index, currentStep, stepData);
        const lineDone = status === "completed" || index < currentStep;
        return (
          <React.Fragment key={index}>
            <View style={{ flex: 1.35, minWidth: 0, alignItems: "center" }}>
              <StepNode
                index={index}
                status={status}
                label={defaultStepNames[index] || `D${index}`}
                onPress={() => handleStepClick(index)}
                circleSize={circleSize}
              />
            </View>
            {index < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  minWidth: 10,
                  height: 2,
                  marginTop: lineMarginTop,
                  marginHorizontal: 2,
                  borderRadius: 1,
                  backgroundColor: STEP_COLORS.connector,
                  overflow: "hidden",
                }}
              >
                {lineDone && (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: STEP_COLORS.connectorDone,
                    }}
                  />
                )}
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    // ✅ REMOVED: backgroundColor: "#f4f5f7" - now transparent
    <View style={{ flex: 1, width: "100%" }}>
      <View
        style={{
          flex: 1,
          flexDirection: effectiveOrientation === "vertical" ? "row" : "column",
        }}
      >
        {effectiveOrientation === "horizontal" ? (
          <View
            style={{
              width: "100%",
              paddingHorizontal: isDesktop ? 12 : 4, // ✅ near edge-to-edge on mobile
              marginBottom: isDesktop ? 8 : 8,
            }}
          >
            <View
              style={{
                paddingVertical: 16,
                paddingHorizontal: 12,
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
                overflow: "hidden",
              }}
            >
              {useScrollStepper ? renderScrollStepper() : renderFlexStepper()}
            </View>
          </View>
        ) : (
          <View
            style={{
              width: 260,
              flexGrow: 0,
              flexShrink: 0,
              paddingLeft: 12,
              paddingRight: 8,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                padding: 16,
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {steps.map((_, index: number) => {
                  const status = getStepStatus(index, currentStep, stepData);
                  const lineDone =
                    status === "completed" || index < currentStep;
                  return (
                    <View
                      key={index}
                      style={{ flexDirection: "row", marginBottom: 4 }}
                    >
                      <View style={{ alignItems: "center", marginRight: 12 }}>
                        <StepNode
                          index={index}
                          status={status}
                          label=""
                          onPress={() => handleStepClick(index)}
                          isVertical
                          circleSize={36}
                        />
                        {index < steps.length - 1 && (
                          <View
                            style={{
                              width: 2,
                              flex: 1,
                              minHeight: 24,
                              marginVertical: 4,
                              borderRadius: 1,
                              backgroundColor: STEP_COLORS.connector,
                              overflow: "hidden",
                            }}
                          >
                            {lineDone && (
                              <View
                                style={{
                                  flex: 1,
                                  backgroundColor: STEP_COLORS.connectorDone,
                                }}
                              />
                            )}
                          </View>
                        )}
                      </View>
                      <View
                        style={{
                          flex: 1,
                          justifyContent: "center",
                          paddingBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight:
                              status === "current"
                                ? "700"
                                : status === "completed"
                                  ? "600"
                                  : "500",
                            color:
                              status === "current"
                                ? STEP_COLORS.currentLabel
                                : status === "completed"
                                  ? STEP_COLORS.completedLabel
                                  : "#374151",
                          }}
                        >
                          {defaultStepNames[index] || `D${index}`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        <View
          style={{
            flex: 1,
            minWidth: 0,
            ...(effectiveOrientation === "vertical"
              ? {
                  paddingLeft: 8,
                  paddingRight: 12,
                  paddingBottom: 12,
                }
              : {
                  paddingHorizontal: isDesktop ? 12 : 4, // ✅ near edge-to-edge on mobile
                  paddingBottom: isDesktop ? 12 : 4,
                }),
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
