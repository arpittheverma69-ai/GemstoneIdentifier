import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AddGemstoneButtonProps {
  onPress: () => void;
  userRole: string;
  isVisible?: boolean;
}

export default function AddGemstoneButton({
  onPress,
  userRole,
  isVisible = true,
}: AddGemstoneButtonProps) {
  const { theme } = useTheme();

  const canAdd =
    userRole === "Admin" || userRole === "Curator" || userRole === "Student";
  // Looker role users cannot add stones

  if (!canAdd || !isVisible) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Spacing.lg,
    right: Spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
