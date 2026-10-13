// components/auth/FallingParticles.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";

/* ============================================================
   SNOW LAYERS — 3 depth tiers, randomized for natural feel
   ============================================================ */

type Flake = {
  key: string;
  x: number; // 0..1 fraction of width
  size: number; // px
  duration: number; // ms to fall the screen
  delay: number; // ms before first fall
  sway: number; // px side-to-side amplitude
  wander: number; // px additional wander
  opacity: number;
  blur: number; // shadowRadius for softness (near flakes only)
};

/* generates N random flakes for one depth tier */
function makeTier(opts: {
  count: number;
  minSize: number;
  maxSize: number;
  minDuration: number;
  maxDuration: number;
  minOpacity: number;
  maxOpacity: number;
  minSway: number;
  maxSway: number;
  blur: number;
  prefix: string;
}): Flake[] {
  const {
    count,
    minSize,
    maxSize,
    minDuration,
    maxDuration,
    minOpacity,
    maxOpacity,
    minSway,
    maxSway,
    blur,
    prefix,
  } = opts;

  return Array.from({ length: count }).map((_, i) => {
    const size = minSize + Math.random() * (maxSize - minSize);
    return {
      key: `${prefix}-${i}`,
      x: Math.random(),
      size,
      duration: minDuration + Math.random() * (maxDuration - minDuration),
      delay: Math.random() * 6000,
      sway: minSway + Math.random() * (maxSway - minSway),
      wander: 4 + Math.random() * 12,
      opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
      blur,
    };
  });
}

/* ============================================================
   ONE FLAKE
   ============================================================ */
function Snowflake({ flake, height }: { flake: Flake; height: number }) {
  const fallY = useRef(new Animated.Value(-30)).current;
  const swayX = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fall — linear, loops forever
    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(flake.delay),
        Animated.timing(fallY, {
          toValue: height + 30,
          duration: flake.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(fallY, {
          toValue: -30,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    fall.start();

    // Sway — smooth back & forth
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swayX, {
          toValue: flake.sway,
          duration: 1600 + Math.random() * 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swayX, {
          toValue: -flake.sway,
          duration: 1600 + Math.random() * 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    swayLoop.start();

    // Slight rotation for texture (optional)
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000 + Math.random() * 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.start();

    return () => {
      fall.stop();
      swayLoop.stop();
      spinLoop.stop();
    };
  }, [height]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${flake.x * 100}%`,
        width: flake.size,
        height: flake.size,
        borderRadius: flake.size / 2,
        backgroundColor: "#FFFFFF",
        opacity: flake.opacity,
        // soft glow for depth (only visible on larger flakes)
        shadowColor: "#DBEAFE",
        shadowOpacity: flake.blur > 0 ? 0.9 : 0,
        shadowRadius: flake.blur,
        shadowOffset: { width: 0, height: 0 },
        transform: [{ translateY: fallY }, { translateX: swayX }, { rotate }],
      }}
    />
  );
}

/* ============================================================
   PUBLIC COMPONENT
   ============================================================ */
export default function FallingParticles() {
  const { height } = useWindowDimensions();

  // 3 depth tiers, generated once
  const far = useMemo(
    () =>
      makeTier({
        count: 45,
        minSize: 1.5,
        maxSize: 2.5,
        minDuration: 7000,
        maxDuration: 11000,
        minOpacity: 0.35,
        maxOpacity: 0.55,
        minSway: 4,
        maxSway: 10,
        blur: 0,
        prefix: "far",
      }),
    [],
  );

  const mid = useMemo(
    () =>
      makeTier({
        count: 30,
        minSize: 3,
        maxSize: 4.5,
        minDuration: 5500,
        maxDuration: 8500,
        minOpacity: 0.6,
        maxOpacity: 0.8,
        minSway: 8,
        maxSway: 16,
        blur: 2,
        prefix: "mid",
      }),
    [],
  );

  const near = useMemo(
    () =>
      makeTier({
        count: 15,
        minSize: 5,
        maxSize: 7.5,
        minDuration: 4200,
        maxDuration: 6500,
        minOpacity: 0.85,
        maxOpacity: 1,
        minSway: 12,
        maxSway: 22,
        blur: 6,
        prefix: "near",
      }),
    [],
  );

  const allFlakes = [...far, ...mid, ...near];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {allFlakes.map((flake) => (
        <Snowflake key={flake.key} flake={flake} height={height} />
      ))}
    </View>
  );
}
