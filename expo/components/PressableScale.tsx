import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, ViewStyle } from "react-native";

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
}

/** Card press wrapper with a restrained scale-down micro-interaction. */
export default function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  testID,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animateTo(0.98)}
      onPressOut={() => animateTo(1)}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
