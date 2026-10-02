import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Gemstone } from "@/services/gemstoneService";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface GemstoneCardProps {
  gem: Gemstone;
  onPress: (gem: Gemstone) => void;
  userRole: string;
  onEdit: (gem: Gemstone) => void;
  onDelete: (gem: Gemstone) => void;
  isAnalyzingColor?: boolean;
  colorAnalysis?: any;
}

export default function GemstoneCard({
  gem,
  onPress,
  userRole,
  onEdit,
  onDelete,
  isAnalyzingColor = false,
  colorAnalysis,
}: GemstoneCardProps) {
  const { theme } = useTheme();

  const canEdit = userRole === "Admin" || userRole === "Curator";
  const canDelete = userRole === "Admin";

  return (
    <Pressable onPress={() => onPress(gem)}>
      <ThemedView
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            {gem.image ? (
              <Image source={{ uri: gem.image }} style={styles.gemImage} />
            ) : (
              <View
                style={[
                  styles.noImage,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="image" size={24} color={theme.textSecondary} />
              </View>
            )}
            {isAnalyzingColor && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </View>

          <View style={styles.gemInfo}>
            <ThemedText
              type="h4"
              style={{ color: theme.text }}
              numberOfLines={1}
            >
              {gem.variety}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
              numberOfLines={1}
            >
              {gem.indianName}
            </ThemedText>
            <View style={styles.properties}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                RI: {gem.riMin}-{gem.riMax} | SG: {gem.sgMin}-{gem.sgMax}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Hardness: {gem.hardness}
              </ThemedText>
            </View>
            <View style={styles.colorsContainer}>
              {(gem.colors || [])
                .slice(0, 3)
                .map((color: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: color.toLowerCase().includes("red")
                          ? "#DC2626"
                          : color.toLowerCase().includes("blue")
                            ? "#2563EB"
                            : color.toLowerCase().includes("green")
                              ? "#16A34A"
                              : color.toLowerCase().includes("yellow")
                                ? "#F59E0B"
                                : color.toLowerCase().includes("purple")
                                  ? "#7C3AED"
                                  : color.toLowerCase().includes("black")
                                    ? "#000000"
                                    : color.toLowerCase().includes("white")
                                      ? "#FFFFFF"
                                      : color.toLowerCase().includes("orange")
                                        ? "#FB923C"
                                        : color.toLowerCase().includes("pink")
                                          ? "#EC4899"
                                          : color
                                                .toLowerCase()
                                                .includes("brown")
                                            ? "#92400E"
                                            : color
                                                  .toLowerCase()
                                                  .includes("gray")
                                              ? "#6B7280"
                                              : color
                                                    .toLowerCase()
                                                    .includes("colorless")
                                                ? "#E5E7EB"
                                                : "#6B7280",
                      },
                    ]}
                  />
                ))}
              {(gem.colors || []).length > 3 && (
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary }}
                >
                  +{(gem.colors || []).length - 3}
                </ThemedText>
              )}
            </View>
          </View>

          <View style={styles.cardActions}>
            {canEdit ? (
              <Pressable
                onPress={() => onEdit(gem)}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Feather name="edit-2" size={16} color="#FFFFFF" />
              </Pressable>
            ) : (
              <View
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="eye" size={16} color={theme.textSecondary} />
              </View>
            )}

            {canDelete && (
              <Pressable
                onPress={() => onDelete(gem)}
                style={[styles.actionButton, { backgroundColor: theme.danger }]}
              >
                <Feather name="trash-2" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardContent: {
    flexDirection: "row",
    padding: Spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
    position: "relative",
  },
  gemImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
  },
  noImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  gemInfo: {
    flex: 1,
  },
  properties: {
    marginVertical: Spacing.xs,
  },
  colorsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.xs,
  },
  cardActions: {
    flexDirection: "column",
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
