import { Check, Grid, Layout } from "lucide-react-native";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
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
type Orientation = "horizontal" | "vertical";

interface EightDStepperProps {
  steps: any[];
  currentStep: number;
  onStepClick: (index: number) => void;
  stepData?: StepData;
  children?: ReactNode;
}

interface StepNodeProps {
  index: number;
  status: StepStatus;
  label: string;
  onPress: () => void;
  isVertical?: boolean;
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

// --- Animated Pulse Component ---
function Pulse({ colorClass }: { colorClass: string }) {
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
      className={`absolute inset-0 rounded-full ${colorClass}`}
      style={animatedStyle}
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
}: StepNodeProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(status === "current" ? 1.1 : 1, {
      damping: 20,
      stiffness: 300,
    });
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  const bgClass = isCompleted
    ? "bg-green-500"
    : isCurrent
      ? "bg-blue-500"
      : "bg-gray-100";
  const borderClass = isCurrent
    ? "border-2 border-blue-500"
    : isCompleted
      ? "border-2 border-transparent"
      : "border-2 border-gray-300";
  const textClass = isCompleted || isCurrent ? "text-white" : "text-gray-500";
  const labelClass = isCurrent
    ? "text-blue-600 font-bold"
    : isCompleted
      ? "text-green-600 font-semibold"
      : "text-gray-500";

  const size = isVertical ? "w-8 h-8" : "w-9 h-9";
  const textSize = isVertical ? "text-[10px]" : "text-xs";

  return (
    <View className={`items-center ${isVertical ? "flex-row" : ""}`}>
      <Pressable
        onPressIn={() =>
          (scale.value = withSpring(0.9, { damping: 20, stiffness: 300 }))
        }
        onPressOut={() =>
          (scale.value = withSpring(status === "current" ? 1.1 : 1, {
            damping: 20,
            stiffness: 300,
          }))
        }
        onPress={onPress}
      >
        <Animated.View
          style={animatedStyle}
          className={`${size} rounded-full ${bgClass} ${borderClass} items-center justify-center shadow-sm relative`}
        >
          {isCurrent && <Pulse colorClass="bg-blue-400/40" />}
          {isCompleted ? (
            <Check size={isVertical ? 14 : 16} color="white" strokeWidth={3} />
          ) : (
            <Text
              className={`${textSize} font-bold ${textClass}`}
            >{`D${index}`}</Text>
          )}
        </Animated.View>
      </Pressable>

      {!isVertical && (
        <Text
          numberOfLines={2}
          className={`text-[10px] text-center leading-tight mt-1.5 w-16 ${labelClass}`}
        >
          {label}
        </Text>
      )}
      {isVertical && (
        <Text
          numberOfLines={2}
          className={`flex-1 ml-3 text-sm leading-tight ${labelClass}`}
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
  children,
}: EightDStepperProps) {
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const prevStep = useRef<number>(currentStep);

  const handleStepClick = (index: number) => {
    prevStep.current = currentStep;
    onStepClick(index);
  };

  return (
    <View className="flex-1 w-full bg-gray-50">
      {/* Toggle Buttons */}
      <View className="w-full px-3 pt-2 pb-2">
        <View className="flex-row p-1 bg-gray-200 rounded-xl">
          <Pressable
            onPress={() => setOrientation("horizontal")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
              orientation === "horizontal"
                ? "bg-white shadow-sm"
                : "bg-transparent"
            }`}
          >
            <Layout
              size={18}
              color={orientation === "horizontal" ? "#3B82F6" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm font-bold ${orientation === "horizontal" ? "text-blue-600" : "text-gray-500"}`}
            >
              Horizontal
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setOrientation("vertical")}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
              orientation === "vertical"
                ? "bg-white shadow-sm"
                : "bg-transparent"
            }`}
          >
            <Grid
              size={18}
              color={orientation === "vertical" ? "#3B82F6" : "#6B7280"}
            />
            <Text
              className={`ml-2 text-sm font-bold ${orientation === "vertical" ? "text-blue-600" : "text-gray-500"}`}
            >
              Vertical
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Layout */}
      <View
        className={`flex-1 ${orientation === "vertical" && isDesktop ? "flex-row" : "flex-col"}`}
      >
        {/* Stepper Section */}
        {orientation === "horizontal" ? (
          <View className="w-full px-3 mb-3">
            <View className="p-3 bg-white border border-gray-200 shadow-sm rounded-2xl">
              {isDesktop ? (
                <View className="flex-row items-center justify-between w-full">
                  {steps.map((_, index: number) => {
                    const status = getStepStatus(index, currentStep, stepData);
                    const isCompleted =
                      status === "completed" || index < currentStep;
                    return (
                      <React.Fragment key={index}>
                        <View className="z-10 items-center flex-1">
                          <StepNode
                            index={index}
                            status={status}
                            label={defaultStepNames[index] || `D${index}`}
                            onPress={() => handleStepClick(index)}
                          />
                        </View>
                        {index < steps.length - 1 && (
                          <View className="z-0 flex-1 h-1 mx-1 overflow-hidden bg-gray-200 rounded-full">
                            {isCompleted && (
                              <View className="w-full h-full bg-green-500" />
                            )}
                          </View>
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="items-center px-1"
                >
                  {steps.map((_, index: number) => {
                    const status = getStepStatus(index, currentStep, stepData);
                    const isCompleted =
                      status === "completed" || index < currentStep;
                    return (
                      <View key={index} className="flex-row items-center">
                        <StepNode
                          index={index}
                          status={status}
                          label={defaultStepNames[index] || `D${index}`}
                          onPress={() => handleStepClick(index)}
                        />
                        {index < steps.length - 1 && (
                          <View className="w-6 h-1 mx-1 overflow-hidden bg-gray-200 rounded-full">
                            {isCompleted && (
                              <View className="w-full h-full bg-green-500" />
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        ) : (
          // Vertical Layout
          <View
            className={
              isDesktop
                ? "w-[280px] flex-shrink-0 pl-3 pb-3"
                : "w-full px-3 mb-3"
            }
          >
            {/* ✅ FIX: Removed 'h-full' from mobile view. React Native cannot calculate 100% height 
                inside an unbounded flex column. This was causing NativeWind CSS interop to crash 
                and falsely report a Navigation Context error. */}
            <View className="p-4 bg-white border border-gray-200 shadow-sm rounded-2xl">
              <ScrollView showsVerticalScrollIndicator={false}>
                {steps.map((_, index: number) => {
                  const status = getStepStatus(index, currentStep, stepData);
                  const isCompleted =
                    status === "completed" || index < currentStep;
                  return (
                    <View key={index} className="flex-row mb-1">
                      <View className="items-center mr-3">
                        <StepNode
                          index={index}
                          status={status}
                          label=""
                          onPress={() => handleStepClick(index)}
                          isVertical
                        />
                        {index < steps.length - 1 && (
                          <View className="w-0.5 flex-1 my-1 rounded-full bg-gray-200 overflow-hidden">
                            {isCompleted && (
                              <View className="w-full h-full bg-green-500" />
                            )}
                          </View>
                        )}
                      </View>
                      <View className="justify-center flex-1 pb-4">
                        <Text
                          className={`text-sm font-semibold ${status === "current" ? "text-blue-600" : status === "completed" ? "text-green-600" : "text-gray-700"}`}
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

        {/* Form Content Section */}
        <View
          className={`flex-1 ${orientation === "vertical" && isDesktop ? "pr-3 pb-3" : "px-3 pb-3"}`}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
