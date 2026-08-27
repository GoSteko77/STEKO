import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet } from "react-native";

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  accent: string;
  borderColor: string;
  checkColor: string;
  size?: number;
  testID?: string;
}

/** Checkbox with a restrained spring pop on completion. */
export default function AnimatedCheckbox({
  checked,
  onToggle,
  accent,
  borderColor,
  checkColor,
  size = 26,
  testID,
}: AnimatedCheckboxProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (checked) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 0.85,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 10,
          }),
        ]),
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 24,
          bounciness: 8,
        }),
      ]).start();
    } else {
      Animated.timing(checkScale, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [checked, scale, checkScale]);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onToggle();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={10} testID={testID}>
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: size * 0.32,
            borderColor: checked ? accent : borderColor,
            backgroundColor: checked ? accent : "transparent",
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <Check size={size * 0.62} color={checkColor} strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
