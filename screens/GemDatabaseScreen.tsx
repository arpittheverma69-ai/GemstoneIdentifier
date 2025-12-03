import React, { useState, useMemo } from "react";
import { 
  StyleSheet, 
  View, 
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEMSTONE_DATABASE, GEM_CATEGORIES, Gemstone } from "@/constants/gemstoneData";

export default function GemDatabaseScreen() {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGem, setSelectedGem] = useState<Gemstone | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "formation" | "market" | "testing">("properties");

  const filteredGems = useMemo(() => {
    return GEMSTONE_DATABASE.filter(gem => {
      const matchesSearch = 
        gem.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gem.indianName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        selectedCategory === "All" || gem.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const renderGemItem = ({ item }: { item: Gemstone }) => (
    <Pressable
      onPress={() => setSelectedGem(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.gemCard}>
        <View style={styles.gemCardContent}>
          <View 
            style={[
              styles.gemThumbnail,
              { backgroundColor: getGemColor(item.colors[0]) + "30" }
            ]}
          >
            <Feather 
              name="hexagon" 
              size={28} 
              color={getGemColor(item.colors[0])} 
            />
          </View>
          <View style={styles.gemInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {item.variety}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.chemicalComposition}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              {item.indianName}
            </ThemedText>
          </View>
          <View style={styles.gemMeta}>
            <View style={[
              styles.categoryBadge,
              { 
                backgroundColor: item.category === "Precious" 
                  ? theme.secondary + "20" 
                  : theme.primary + "20"
              }
            ]}>
              <ThemedText 
                type="caption" 
                style={{ 
                  color: item.category === "Precious" ? theme.secondary : theme.primary 
                }}
              >
                {item.category}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.searchContainer, { paddingTop, backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.inputBackground }]}>
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search gemstones..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {GEM_CATEGORIES.map(category => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === category 
                      ? theme.primary 
                      : theme.inputBackground,
                  }
                ]}
              >
                <ThemedText 
                  type="small"
                  style={{ 
                    color: selectedCategory === category ? "#FFFFFF" : theme.text 
                  }}
                >
                  {category}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredGems}
          keyExtractor={item => item.id}
          renderItem={renderGemItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom }
          ]}
          scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                No gemstones found
              </ThemedText>
            </View>
          )}
        />
      </View>

      <Modal
        visible={selectedGem !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGem(null)}
      >
        {selectedGem ? (
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setSelectedGem(null)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather name="arrow-left" size={24} color={theme.text} />
              </Pressable>
              <ThemedText type="h4">{selectedGem.variety}</ThemedText>
              <View style={{ width: 24 }} />
            </View>

            <View 
              style={[
                styles.heroSection,
                { backgroundColor: getGemColor(selectedGem.colors[0]) + "20" }
              ]}
            >
              <Feather 
                name="hexagon" 
                size={80} 
                color={getGemColor(selectedGem.colors[0])} 
              />
              <ThemedText type="h2" style={styles.heroTitle}>
                {selectedGem.variety}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {selectedGem.indianName}
              </ThemedText>
              <View style={[styles.heroBadge, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF" }}>
                  {selectedGem.category}
                </ThemedText>
              </View>
            </View>

            <View style={styles.tabContainer}>
              {(["properties", "formation", "market", "testing"] as const).map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tab,
                    activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
                  ]}
                >
                  <ThemedText 
                    type="small"
                    style={{ 
                      color: activeTab === tab ? theme.primary : theme.textSecondary,
                      fontWeight: activeTab === tab ? "600" : "400",
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
              {activeTab === "properties" && (
                <>
                  <DataRow label="Chemical Composition" value={selectedGem.chemicalComposition} />
                  <DataRow label="Crystal System" value={selectedGem.crystalSystem} />
                  <DataRow label="Refractive Index" value={`${selectedGem.riMin} - ${selectedGem.riMax}`} mono />
                  <DataRow label="Specific Gravity" value={`${selectedGem.sgMin} - ${selectedGem.sgMax}`} mono />
                  <DataRow label="Hardness (Mohs)" value={selectedGem.hardness.toString()} mono />
                  <DataRow label="Luster" value={selectedGem.luster} />
                  <DataRow label="Cleavage" value={selectedGem.cleavage} />
                  <DataRow label="Fracture" value={selectedGem.fracture} />
                  <DataRow label="Optic Character" value={selectedGem.opticCharacter} />
                  <DataRow label="Pleochroism" value={selectedGem.pleochroism} />
                  <DataRow label="UV Response" value={selectedGem.uvResponse} />
                  
                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    COLORS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.colors.map((color, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText type="caption">{color}</ThemedText>
                      </View>
                    ))}
                  </View>

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    TYPICAL INCLUSIONS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.inclusions.map((inclusion, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText type="caption">{inclusion}</ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {activeTab === "formation" && (
                <>
                  <Card style={styles.infoCard}>
                    <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      GEOLOGICAL FORMATION
                    </ThemedText>
                    <ThemedText type="body">{selectedGem.formation}</ThemedText>
                  </Card>

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    OCCURRENCES
                  </ThemedText>
                  {selectedGem.occurrences.map((location, idx) => (
                    <View key={idx} style={styles.locationRow}>
                      <Feather name="map-pin" size={16} color={theme.primary} />
                      <ThemedText type="body">{location}</ThemedText>
                    </View>
                  ))}
                </>
              )}

              {activeTab === "market" && (
                <>
                  <Card style={styles.priceCard}>
                    <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      PRICE RANGE (PER CARAT)
                    </ThemedText>
                    <View style={styles.priceRow}>
                      <View style={styles.priceItem}>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>INR</ThemedText>
                        <ThemedText type="h4" style={{ color: theme.success }}>
                          {selectedGem.priceRangeINR.min.toLocaleString()} - {selectedGem.priceRangeINR.max.toLocaleString()}
                        </ThemedText>
                      </View>
                      <View style={styles.priceItem}>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>USD</ThemedText>
                        <ThemedText type="h4" style={{ color: theme.success }}>
                          ${selectedGem.priceRangeUSD.min} - ${selectedGem.priceRangeUSD.max}
                        </ThemedText>
                      </View>
                    </View>
                  </Card>

                  <DataRow 
                    label="Market Demand" 
                    value={selectedGem.marketDemand}
                    valueColor={
                      selectedGem.marketDemand === "High" ? theme.success :
                      selectedGem.marketDemand === "Medium" ? theme.warning : theme.textSecondary
                    }
                  />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    COMMON TREATMENTS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.treatments.map((treatment, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.warning + "20" }]}>
                        <ThemedText type="caption" style={{ color: theme.warning }}>{treatment}</ThemedText>
                      </View>
                    ))}
                  </View>

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    KNOWN SIMULANTS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.simulants.map((simulant, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.danger + "20" }]}>
                        <ThemedText type="caption" style={{ color: theme.danger }}>{simulant}</ThemedText>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {activeTab === "testing" && (
                <>
                  <ThemedText type="body" style={{ marginBottom: Spacing.lg }}>
                    Follow these steps to manually identify this gemstone:
                  </ThemedText>
                  {selectedGem.testingGuide.map((step, idx) => (
                    <View key={idx} style={styles.testStep}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                          {idx + 1}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={styles.stepText}>{step}</ThemedText>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </ThemedView>
        ) : null}
      </Modal>
    </>
  );
}

function DataRow({ 
  label, 
  value, 
  mono = false,
  valueColor,
}: { 
  label: string; 
  value: string; 
  mono?: boolean;
  valueColor?: string;
}) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.dataRow}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText 
        type={mono ? "mono" : "body"}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function getGemColor(color: string): string {
  const colorMap: Record<string, string> = {
    "Red": "#EF4444",
    "Pink": "#EC4899",
    "Orange": "#F97316",
    "Yellow": "#EAB308",
    "Green": "#22C55E",
    "Blue": "#3B82F6",
    "Purple": "#8B5CF6",
    "Violet": "#8B5CF6",
    "Brown": "#A16207",
    "Black": "#1F2937",
    "White": "#9CA3AF",
    "Colorless": "#9CA3AF",
    "Gray": "#6B7280",
  };
  
  for (const [key, val] of Object.entries(colorMap)) {
    if (color.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return "#6B46C1";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  gemCard: {
    padding: Spacing.md,
  },
  gemCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  gemThumbnail: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  gemInfo: {
    flex: 1,
  },
  gemMeta: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  heroTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  heroBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: Spacing.lg,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  priceCard: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  priceItem: {
    flex: 1,
  },
  testStep: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
  },
});
