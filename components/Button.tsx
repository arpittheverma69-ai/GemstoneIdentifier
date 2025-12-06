import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const springConfig: WithSpringConfig = {
  damping: 20,
  mass: 0.5,
  stiffness: 200,
  overshootClamping: false,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
  size = "md",
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.96, springConfig);
      opacity.value = withSpring(0.9, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withSpring(1, springConfig);
    }
  };

  const getHeight = () => {
    if (size === "sm") return 40;
    if (size === "lg") return 56;
    return Spacing.buttonHeight;
  };

  const getTextColor = () => {
    if (variant === "primary") return theme.buttonText;
    if (variant === "outline") return theme.primary;
    if (variant === "ghost") return theme.primary;
    return theme.text;
  };

  const getBorderStyle = () => {
    if (variant === "outline") {
      return {
        borderWidth: 2,
        borderColor: theme.primary,
        backgroundColor: "transparent",
      };
    }
    if (variant === "ghost") {
      return {
        backgroundColor: "transparent",
      };
    }
    return {};
  };

  const getShadowStyle = () => {
    if (variant === "primary") return Shadows.lg;
    if (variant === "secondary") return Shadows.md;
    return {};
  };

  const buttonContent = (
    <ThemedText
      type="body"
      style={[
        styles.buttonText,
        { 
          color: getTextColor(),
          fontWeight: variant === "primary" ? "700" : "600",
        },
      ]}
    >
      {children}
    </ThemedText>
  );

  if (variant === "primary") {
    return (
      <AnimatedPressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          { height: getHeight(), opacity: disabled ? 0.6 : 1 },
          getShadowStyle(),
          style,
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.full }]}
        />
        {buttonContent}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        {
          height: getHeight(),
          backgroundColor: variant === "secondary" ? theme.backgroundSecondary : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
        getBorderStyle(),
        variant === "secondary" ? Shadows.sm : {},
        style,
        animatedStyle,
      ]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    overflow: "hidden",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
