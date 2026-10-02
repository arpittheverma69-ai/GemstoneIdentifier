import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function IdentificationHelpScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }] }>
      <Card elevation={2} style={styles.card}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>Help</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Tips: Use good lighting, focus on the stone, and include multiple angles. Provide RI/SG if available for higher confidence.
        </ThemedText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  card: { borderRadius: BorderRadius.lg },
});