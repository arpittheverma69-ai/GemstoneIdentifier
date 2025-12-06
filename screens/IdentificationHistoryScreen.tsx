import React, { useState, useEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getIdentificationHistory, deleteIdentificationHistory, IdentificationResult } from "@/services/identificationService";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { ResultCard } from "@/components/ResultCard";
import { Alert } from "react-native";

export default function IdentificationHistoryScreen() {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();
  const [history, setHistory] = useState<IdentificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await getIdentificationHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error loading identification history:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Identification",
      "Are you sure you want to delete this identification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteIdentificationHistory(id);
            if (result.success) {
              setHistory(history.filter((item) => item.id !== id));
            } else {
              Alert.alert("Error", result.error || "Failed to delete identification");
            }
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: IdentificationResult }) => {
    const breakdown = {
      stoneName: item.stone_name,
      confidence: item.confidence,
      shortReasoning: item.short_reasoning,
      otherPossibleStones: item.other_possible_stones,
      gemData: item.gem_data,
      actionButtons: {
        saveToInventory: false,
        createCertificate: false,
      },
    };

    return (
      <Card style={[styles.historyCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.historyHeader}>
          {item.image_url && (
            <ExpoImage
              source={{ uri: item.image_url }}
              style={styles.historyImage}
              contentFit="cover"
            />
          )}
          <View style={styles.historyInfo}>
            <ThemedText type="h4" style={{ fontWeight: "700" }}>
              {item.stone_name}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              {item.confidence} confidence
            </ThemedText>
          </View>
          <Pressable
            onPress={() => item.id && handleDelete(item.id)}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="trash-2" size={20} color={theme.danger} />
          </Pressable>
        </View>
        <View style={styles.historyContent}>
          <ResultCard
            breakdown={breakdown}
            onSaveToInventory={() => {}}
            onCreateCertificate={() => {}}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            Loading history...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderHistoryItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop, paddingBottom: (paddingBottom || 0) + 20 },
          ]}
          scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadHistory();
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="clock" size={48} color={theme.textSecondary} />
              <ThemedText type="h4" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No History Yet
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                Your past identifications will appear here once you start identifying gemstones.
              </ThemedText>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.lg,
  },
  historyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  historyImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  historyContent: {
    marginTop: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
});