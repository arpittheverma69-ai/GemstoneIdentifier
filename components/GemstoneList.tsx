import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Gemstone } from "@/services/gemstoneService";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import GemstoneCard from "./GemstoneCard";

interface GemstoneListProps {
  gemstones: Gemstone[];
  isLoading: boolean;
  isLoadingMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onGemPress: (gem: Gemstone) => void;
  onGemEdit: (gem: Gemstone) => void;
  onGemDelete: (gem: Gemstone) => void;
  userRole: string;
  isAnalyzingColor?: boolean;
  colorAnalysis?: any;
  hasMore?: boolean;
}

export default function GemstoneList({
  gemstones,
  isLoading,
  isLoadingMore,
  refreshing,
  onRefresh,
  onLoadMore,
  onGemPress,
  onGemEdit,
  onGemDelete,
  userRole,
  isAnalyzingColor = false,
  colorAnalysis,
  hasMore = false,
}: GemstoneListProps) {
  const { theme } = useTheme();

  const renderGemstone = ({ item }: { item: Gemstone }) => (
    <GemstoneCard
      gem={item}
      onPress={onGemPress}
      userRole={userRole}
      onEdit={onGemEdit}
      onDelete={onGemDelete}
      isAnalyzingColor={isAnalyzingColor}
      colorAnalysis={colorAnalysis}
    />
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
        >
          Loading more gemstones...
        </ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.md }}
          >
            Loading gemstones...
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <ThemedText type="h4" style={{ color: theme.text }}>
          No Gemstones Found
        </ThemedText>
        <ThemedText
          type="body"
          style={{
            color: theme.textSecondary,
            textAlign: "center",
            marginTop: Spacing.sm,
          }}
        >
          Try adjusting your search or filters to find what you're looking for.
        </ThemedText>
      </View>
    );
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <FlatList
        data={gemstones}
        renderItem={renderGemstone}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={hasMore ? onLoadMore : null}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
});
