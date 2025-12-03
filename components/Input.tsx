import React from "react";
import { StyleSheet, TextInput, View, TextInputProps, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  mono?: boolean;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
}

export function Input({ 
  label, 
  error, 
  mono = false,
  style, 
  rightIcon,
  onRightIconPress,
  ...props 
}: InputProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontFamily: mono ? Fonts?.mono : undefined,
              borderColor: error ? theme.danger : "transparent",
              borderWidth: error ? 1 : 0,
              paddingRight: rightIcon ? 44 : Spacing.lg,
            },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          {...props}
        />
        {rightIcon ? (
          <Pressable 
            onPress={onRightIconPress}
            style={({ pressed }) => [
              styles.rightIcon,
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Feather name={rightIcon} size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
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
  },
});
