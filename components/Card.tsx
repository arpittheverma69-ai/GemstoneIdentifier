import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface CardProps {
  elevation?: number;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "default" | "elevated" | "outlined";
}

const springConfig: WithSpringConfig = {
  damping: 20,
  mass: 0.5,
  stiffness: 200,
  overshootClamping: false,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ 
  elevation = 1, 
  onPress, 
  children, 
  style, 
  disabled = false,
  variant = "default",
}: CardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const cardBackgroundColor = variant === "outlined" 
    ? theme.backgroundDefault 
    : elevation === 1 
      ? theme.backgroundDefault 
      : elevation === 2 
        ? theme.backgroundDefault 
        : theme.backgroundSecondary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getShadowStyle = () => {
    if (variant === "elevated") return Shadows.lg;
    if (elevation === 2) return Shadows.md;
    if (elevation === 3) return Shadows.lg;
    return Shadows.sm;
  };

  const getBorderStyle = () => {
    if (variant === "outlined") {
      return {
        borderWidth: 1.5,
        borderColor: theme.border,
      };
    }
    return {};
  };

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
          opacity: disabled ? 0.6 : 1,
        },
        getShadowStyle(),
        getBorderStyle(),
        style,
        animatedStyle,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
});
