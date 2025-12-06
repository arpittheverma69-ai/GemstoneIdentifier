import React, { useState } from "react";
import { StyleSheet, TextInput, View, TextInputProps, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts, Shadows } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  mono?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function Input({ 
  label, 
  error, 
  mono = false,
  style, 
  leftIcon,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  ...props 
}: InputProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    scale.value = withSpring(1.02);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    scale.value = withSpring(1);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      <AnimatedView style={[styles.inputWrapper, animatedStyle]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontFamily: mono ? Fonts?.mono : undefined,
              borderColor: error 
                ? theme.danger 
                : isFocused 
                  ? theme.primary 
                  : theme.border,
              borderWidth: 2,
              paddingLeft: leftIcon ? 44 : Spacing.lg,
              paddingRight: rightIcon ? 44 : Spacing.lg,
            },
            isFocused && !error && Shadows.sm,
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {leftIcon ? (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        ) : null}
        {rightIcon ? (
          <Pressable 
            onPress={onRightIconPress}
            style={({ pressed }) => [
              styles.rightIcon,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            {typeof rightIcon === 'string' ? (
              <Feather name={rightIcon as keyof typeof Feather.glyphMap} size={20} color={isFocused ? theme.primary : theme.textSecondary} />
            ) : (
              rightIcon
            )}
          </Pressable>
        ) : null}
      </AnimatedView>
      {error ? (
        <ThemedText type="caption" style={[styles.error, { color: theme.danger }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontWeight: "500",
  },
  leftIcon: {
    position: "absolute",
    left: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  rightIcon: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  error: {
    marginTop: Spacing.xs,
    fontWeight: "500",
  },
});
