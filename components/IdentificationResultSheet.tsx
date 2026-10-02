import React from "react";
import {
  Modal,
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ResultCard, ResultCardData } from "@/components/ResultCard";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { Gemstone } from "@/constants/gemstoneData";

export interface AlternativeMatch {
  gem: Gemstone;
  score: number;
  reasons?: string[];
}

interface IdentificationResultSheetProps {
  visible: boolean;
  isLoading: boolean;
  result: ResultCardData | null;
  otherMatches: AlternativeMatch[];
  onClose: () => void;
  onSelectAlternative: (match: AlternativeMatch) => void;
  onReset: () => void;
  onSaveToInventory: () => void;
  onCreateCertificate: () => void;
  onOpenBuyingGuide?: () => void;
}

const IdentificationResultSheet: React.FC<IdentificationResultSheetProps> = ({
  visible,
  isLoading,
  result,
  otherMatches,
  onClose,
  onSelectAlternative,
  onReset,
  onSaveToInventory,
  onCreateCertificate,
  onOpenBuyingGuide,
}) => {
  const { theme } = useTheme();

  const normalizeValue = (value: any) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getPriorityRank = (gem: Gemstone): number => {
    const variety = normalizeValue(gem?.variety);

    const precious = ["diamond", "ruby", "sapphire", "emerald"];
    if (precious.some((p) => variety.includes(p))) return 0;

    const popular = [
      "spinel",
      "garnet",
      "tourmaline",
      "tourmalin",
      "topaz",
      "zircon",
      "opal",
      "amethyst",
      "aquamarine",
      "peridot",
    ];

    if (popular.some((p) => variety.includes(p))) return 1;

    return 2;
  };

  const sortedOtherMatches = [...otherMatches].sort((a, b) => {
    const rankDiff = getPriorityRank(a.gem) - getPriorityRank(b.gem);
    if (rankDiff !== 0) return rankDiff;
    return b.score - a.score;
  });

  console.log(
    "[IdentificationResultSheet] sortedOtherMatches top JSON:",
    JSON.stringify(
      sortedOtherMatches.slice(0, 10).map((m) => ({
        variety: m.gem?.variety,
        score: Math.round(m.score),
        rank: getPriorityRank(m.gem),
      }))
    )
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText type="h3" style={{ flex: 1 }}>
            Identification Result
          </ThemedText>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="x" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                Identifying your gemstone...
              </ThemedText>
            </View>
          ) : result ? (
            <View style={styles.contentContainer}>
              <View
                style={[
                  styles.primaryHeader,
                  { backgroundColor: theme.primary + "10", borderRadius: BorderRadius.lg },
                ]}
              >
                <ThemedText type="h3" style={{ color: theme.primary }}>
                  This looks like:
                </ThemedText>
                <ThemedText
                  type="h2"
                  style={{ color: theme.primary, marginTop: Spacing.xs, fontWeight: "700" }}
                >
                  {result.stoneName}
                </ThemedText>
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor: theme.primary,
                      borderRadius: BorderRadius.lg,
                    },
                  ]}
                >
                  <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {result.confidence} match confidence
                  </ThemedText>
                </View>
              </View>

              <ResultCard
                breakdown={result}
                onSaveToInventory={onSaveToInventory}
                onCreateCertificate={onCreateCertificate}
              />

              {otherMatches.length > 0 ? (
                <View style={{ marginTop: Spacing.lg }}>
                  <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
                    Other possibilities
                  </ThemedText>
                  {sortedOtherMatches.map((match, index) => (
                    <Pressable
                      key={`${match.gem.id}-${index}`}
                      onPress={() => onSelectAlternative(match)}
                      style={({ pressed }) => [
                        styles.otherCard,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: theme.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View style={styles.otherCardHeader}>
                        <ThemedText type="h4">{match.gem.variety}</ThemedText>
                        <View
                          style={[
                            styles.altConfidence,
                            { backgroundColor: theme.primary + "15", borderRadius: BorderRadius.md },
                          ]}
                        >
                          <ThemedText style={{ color: theme.primary, fontWeight: "700" }}>
                            {`${Math.round(match.score)}%`}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        RI {match.gem.riMin.toFixed(2)} - {match.gem.riMax.toFixed(2)} | SG {match.gem.sgMin.toFixed(2)} - {match.gem.sgMax.toFixed(2)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  No additional close matches detected.
                </ThemedText>
              )}

              {onOpenBuyingGuide ? (
                <Button
                  onPress={onOpenBuyingGuide}
                  style={[styles.buyingGuideButton, { backgroundColor: theme.success }]}
                >
                  <Feather name="shopping-cart" size={16} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Buying Guide & Pricing
                  </ThemedText>
                </Button>
              ) : null}

              <Button
                onPress={onReset}
                variant="outline"
                style={{ marginTop: Spacing.lg }}
              >
                Identify another stone
              </Button>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                No gemstones matched the provided details. Try adjusting your observations and run the
                identification again.
              </ThemedText>
              <Button
                onPress={onReset}
                variant="outline"
                style={{ marginTop: Spacing.md }}
              >
                Close
              </Button>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing['2xl'],
  },
  contentContainer: {
    gap: Spacing.lg,
  },
  primaryHeader: {
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  otherCard: {
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
  },
  otherCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  altConfidence: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  emptyState: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  buyingGuideButton: {
    marginTop: Spacing.lg,
  },
});

export default IdentificationResultSheet;
