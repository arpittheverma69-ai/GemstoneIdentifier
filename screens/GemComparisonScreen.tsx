import React, { useState, useMemo } from "react";
import { 
  StyleSheet, 
  View, 
  FlatList,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  TextInput,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEMSTONE_DATABASE, GEM_CATEGORIES, Gemstone, classifyGemCategory, sortGemstonesByDefault, getOptimizedThumbnailUrl } from "@/constants/gemstoneData";
import { getAllGemstonesForComparison, getCustomGemstones } from "@/services/gemstoneService";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";

const { width: screenWidth } = Dimensions.get("window");

const FILTER_CATEGORIES = GEM_CATEGORIES;

const FILTER_COLORS = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Pink",
  "Purple",
  "Brown",
  "Black",
  "Colorless",
  "Multicolor",
];

interface ComparisonItem {
  gemstone: Gemstone;
  id: string;
  gemstoneId: string; // Original gemstone ID for selection tracking
}

export default function GemComparisonScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [allGems, setAllGems] = useState<Gemstone[]>([]);
  const [selectedGems, setSelectedGems] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonMode, setComparisonMode] = useState<'select' | 'compare'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  React.useEffect(() => {
    loadGemstones();
  }, []);

  // Filter gems based on search query
  const filteredGems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = allGems.filter((gem) => {
      if (query) {
        const matchesQuery =
          gem.variety?.toLowerCase().includes(query) ||
          gem.indianName?.toLowerCase().includes(query) ||
          gem.chemicalComposition?.toLowerCase().includes(query);
        if (!matchesQuery) {
          return false;
        }
      }

      const gemCategory = classifyGemCategory(gem);
      if (selectedCategory !== "All" && gemCategory !== selectedCategory) {
        return false;
      }

      if (selectedColors.length > 0) {
        const gemColors = (gem.colors || []).map((color) => color.toLowerCase());
        const matchesColor = selectedColors.some((color) =>
          gemColors.some((gemColor) =>
            gemColor.includes(color.toLowerCase()) || color.toLowerCase().includes(gemColor)
          )
        );
        if (!matchesColor) {
          return false;
        }
      }

      return true;
    });

    return sortGemstonesByDefault(filtered);
  }, [allGems, searchQuery, selectedCategory, selectedColors]);

  const toggleColorFilter = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((item) => item !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedColors([]);
  };

  const clearSelections = () => {
    setSelectedGems([]);
    if (comparisonMode === "compare") {
      setComparisonMode('select');
    }
  };

  const loadGemstones = async () => {
    try {
      setIsLoading(true);
      // Load all stones without pagination for comparison screen
      const [standardGems, customGemsResult] = await Promise.all([
        getAllGemstonesForComparison(),
        getCustomGemstones()
      ]);
      
      // Combine and remove duplicates by ID, then classify and sort
      const allGems = [...standardGems, ...customGemsResult.gemstones];
      const uniqueGems = allGems.filter((gem, index, self) => 
        index === self.findIndex((g) => g.id === gem.id)
      ).map(gem => ({
        ...gem,
        category: classifyGemCategory(gem)
      }));
      
      setAllGems(sortGemstonesByDefault(uniqueGems));
    } catch (error) {
      console.error('Error loading gemstones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGemstoneSelection = (gemstone: Gemstone) => {
    const isSelected = selectedGems.some(item => item.gemstoneId === gemstone.id);
    
    if (isSelected) {
      setSelectedGems(prev => prev.filter(item => item.gemstoneId !== gemstone.id));
    } else if (selectedGems.length < 3) {
      // Generate a unique ID for the selection item but track original gemstone ID
      const uniqueSelectionId = `selected-${gemstone.id}-${Date.now()}`;
      setSelectedGems(prev => [...prev, { gemstone, id: uniqueSelectionId, gemstoneId: gemstone.id }]);
    }
  };

  const removeSelectedGemstone = (id: string) => {
    setSelectedGems(prev => prev.filter(item => item.id !== id));
  };

  const startComparison = () => {
    if (selectedGems.length >= 2) {
      setComparisonMode('compare');
    }
  };

  const renderGemstoneItem = ({ item }: { item: Gemstone }) => {
    const isSelected = selectedGems.some(selected => selected.gemstoneId === item.id);
    const isDisabled = !isSelected && selectedGems.length >= 3;

    return (
      <Pressable
        onPress={() => !isDisabled && toggleGemstoneSelection(item)}
        style={({ pressed }) => [
          { opacity: pressed || isDisabled ? 0.6 : 1 },
          styles.gemstoneItem,
          isSelected && [styles.selectedGemstoneItem, { borderColor: theme.primary }],
          isDisabled && styles.disabledGemstoneItem
        ]}
      >
        <Card style={styles.gemstoneCard}>
          <View style={styles.gemstoneContent}>
            {/* Gemstone Image */}
            <View style={styles.imageContainer}>
              {item.image ? (
                <ExpoImage
                  source={{ uri: getOptimizedThumbnailUrl(item.image, 200) }}
                  style={styles.gemstoneImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: theme.primary + "20" }]}
                >
                  <Feather name="hexagon" size={24} color={theme.primary} />
                </View>
              )}
              
              {/* Selection Indicator */}
              {isSelected && (
                <View
                  style={[
                    styles.selectionIndicator,
                    {
                      backgroundColor: theme.primary,
                      borderColor: theme.backgroundDefault,
                    },
                  ]}
                >
                  <Feather name="check" size={12} color={theme.buttonText} />
                </View>
              )}
              
              {/* Max Selection Warning */}
              {isDisabled && (
                <View style={[styles.maxSelectionOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
                  <Feather name="x" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Gemstone Info */}
            <View style={styles.gemstoneInfo}>
              <ThemedText type="body" style={styles.gemstoneName}>
                {item.variety}
              </ThemedText>
              <ThemedText type="caption" style={[styles.gemstoneSubtitle, { color: theme.primary }]}>
                {item.indianName}
              </ThemedText>
              
              {/* Key Properties */}
              <View style={styles.propertyRow}>
                <View style={styles.propertyItem}>
                  <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>RI</ThemedText>
                  <ThemedText type="caption" style={[styles.propertyValue, { color: theme.text }]}>
                    {item.riMin && item.riMax ? `${item.riMin.toFixed(2)}-${item.riMax.toFixed(2)}` : "N/A"}
                  </ThemedText>
                </View>
                <View style={styles.propertyItem}>
                  <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>SG</ThemedText>
                  <ThemedText type="caption" style={[styles.propertyValue, { color: theme.text }]}>
                    {item.sgMin && item.sgMax ? `${item.sgMin.toFixed(2)}-${item.sgMax.toFixed(2)}` : "N/A"}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  const ComparisonView = () => {
    if (selectedGems.length < 2) return null;

    const comparisonData = [
      { label: "Variety", key: "variety" },
      { label: "Indian Name", key: "indianName" },
      { label: "Category", key: "category" },
      { label: "Market Demand", key: "marketDemand" },
      { label: "Chemical Composition", key: "chemicalComposition" },
      { label: "Cause of Color", key: "causeOfColor" },
      { label: "Crystal System", key: "crystalSystem" },
      { label: "Hardness", key: "hardness" },
      { label: "Toughness", key: "toughness" },
      { label: "RI Range", key: "ri" },
      { label: "SG Range", key: "sg" },
      { label: "Dispersion", key: "dispersion" },
      { label: "Polariscope Reaction", key: "polariscopeReaction" },
      { label: "Optic Character", key: "opticCharacter" },
      { label: "Luster", key: "luster" },
      { label: "Transparency", key: "transparency" },
      { label: "Pleochroism", key: "pleochroism" },
      { label: "UV Response", key: "uvResponse" },
      { label: "Cleavage", key: "cleavage" },
      { label: "Fracture", key: "fracture" },
      { label: "Stability", key: "stability" },
      { label: "Colors", key: "colors" },
      { label: "Typical Inclusions", key: "inclusions" },
      { label: "Simulants", key: "simulants" },
      { label: "Common Treatments", key: "treatments" },
      { label: "Occurrences", key: "occurrences" },
      { label: "Formation", key: "formation" },
      { label: "Testing Guide", key: "testingGuide" },
      { label: "Price Range (INR)", key: "priceRangeINR" },
      { label: "Price Range (USD)", key: "priceRangeUSD" },
    ];

    const formatArray = (value?: string[] | null) => {
      if (!value || value.length === 0) {
        return "N/A";
      }
      return value.join(", ");
    };

    const formatList = (value?: string[] | null) => {
      if (!value || value.length === 0) {
        return "N/A";
      }
      return value.map((item) => `• ${item}`).join("\n");
    };

    const formatPriceRange = (
      range: { min: number; max: number } | undefined,
      currency: "INR" | "USD"
    ) => {
      if (!range || (range.min == null && range.max == null)) {
        return "N/A";
      }
      const formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      });
      const minFormatted = range.min != null ? formatter.format(range.min) : "?";
      const maxFormatted = range.max != null ? formatter.format(range.max) : "?";
      const bothZero = (range.min ?? 0) === 0 && (range.max ?? 0) === 0;
      if (bothZero) {
        return "N/A";
      }
      return `${minFormatted} – ${maxFormatted}`;
    };

    const renderComparisonRow = (item: { label: string; key: string }) => {
      const getValue = (gemstone: Gemstone, key: string) => {
        switch (key) {
          case "ri":
            return gemstone.riMin && gemstone.riMax 
              ? `${gemstone.riMin.toFixed(3)}-${gemstone.riMax.toFixed(3)}`
              : "N/A";
          case "sg":
            return gemstone.sgMin && gemstone.sgMax 
              ? `${gemstone.sgMin.toFixed(2)}-${gemstone.sgMax.toFixed(2)}`
              : "N/A";
          case "hardness":
            const hardness = gemstone[key as keyof Gemstone];
            if (typeof hardness === 'object' && hardness !== null && 'min' in hardness && 'max' in hardness) {
              return `${hardness.min}-${hardness.max}`;
            }
            return String(hardness || "N/A");
          case "colors":
            return formatArray(gemstone.colors);
          case "transparency":
            return formatArray(gemstone.transparency);
          case "inclusions":
            return formatArray(gemstone.inclusions);
          case "simulants":
            return formatArray(gemstone.simulants);
          case "treatments":
            return formatArray(gemstone.treatments);
          case "occurrences":
            return formatArray(gemstone.occurrences);
          case "testingGuide":
            return formatList(gemstone.testingGuide);
          case "priceRangeINR":
            return formatPriceRange(gemstone.priceRangeINR, "INR");
          case "priceRangeUSD":
            return formatPriceRange(gemstone.priceRangeUSD, "USD");
          case "uvResponse":
            return gemstone.uvResponse || "N/A";
          case "polariscopeReaction":
            return gemstone.polariscopeReaction || "N/A";
          case "stability":
            return gemstone.stability || "N/A";
          case "dispersion":
            return gemstone.dispersion || "N/A";
          default:
            const value = gemstone[key as keyof Gemstone];
            if (typeof value === 'object' && value !== null) {
              return String(value);
            }
            return String(value || "N/A");
        }
      };

      const rowValues = selectedGems.map((selectedGem) => getValue(selectedGem.gemstone, item.key));
      const hasMeaningfulValue = rowValues.some((val) => {
        if (!val) return false;
        const trimmed = val.trim();
        return trimmed.length > 0 && trimmed !== "N/A" && trimmed !== "₹0 – ₹0" && trimmed !== "$0 – $0";
      });

      if (!hasMeaningfulValue) {
        return null;
      }

      return (
        <View style={[styles.comparisonRow, { borderBottomColor: theme.border }]}>
          <View
            style={[
              styles.comparisonLabel,
              { borderRightColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText type="caption" style={styles.comparisonLabelText}>
              {item.label}
            </ThemedText>
          </View>
          {rowValues.map((value, index) => (
            <View
              key={`comparison-value-${selectedGems[index].id}`}
              style={[
                styles.comparisonValue,
                { borderRightColor: theme.border, backgroundColor: theme.backgroundDefault },
              ]}
            >
              <ThemedText 
                type="caption" 
                style={[
                  styles.comparisonValueText,
                  { color: theme.text }
                ]}
              >
                {value}
              </ThemedText>
            </View>
          ))}
        </View>
      );
    };

    return (
      <ScrollView 
        style={styles.comparisonContainer} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.comparisonContentContainer}
      >
        {/* Header with Gemstone Cards */}
        <View style={styles.comparisonHeader}>
          {selectedGems.map((selectedGem, index) => (
            <View
              key={`header-card-${selectedGem.id}`}
              style={[
                styles.comparisonGemCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  shadowColor: isDark ? "#000000" : "#000000",
                },
              ]}
            >
              <View style={styles.comparisonGemImageContainer}>
                {selectedGem.gemstone.image ? (
                  <ExpoImage
                    source={{ uri: selectedGem.gemstone.image }}
                    style={[styles.comparisonGemImage, { borderColor: theme.border }]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.comparisonPlaceholderImage,
                      {
                        backgroundColor: theme.primary + "20",
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="hexagon" size={24} color={theme.primary} />
                  </View>
                )}
              </View>
              <ThemedText type="body" style={styles.comparisonGemName}>
                {selectedGem.gemstone.variety}
              </ThemedText>
              <ThemedText type="caption" style={[styles.comparisonGemSubtitle, { color: theme.primary }]}>
                {selectedGem.gemstone.indianName}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Comparison Table */}
        <Card
          style={[
            styles.comparisonTable,
            { borderColor: theme.border, backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View
            style={[
              styles.comparisonTableHeader,
              { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border },
            ]}
          >
            <View style={[styles.comparisonTableLabel, { borderRightColor: theme.border }]}
            >
              <ThemedText type="caption" style={styles.comparisonTableHeaderText}>
                Property
              </ThemedText>
            </View>
            {selectedGems.map((selectedGem, index) => (
              <View
                key={`table-column-${selectedGem.id}`}
                style={[
                  styles.comparisonTableColumn,
                  { borderRightColor: theme.border },
                ]}
              >
                <ThemedText type="caption" style={styles.comparisonTableHeaderText}>
                  {selectedGem.gemstone.variety}
                </ThemedText>
              </View>
            ))}
          </View>
          
          {comparisonData.map(renderComparisonRow)}
        </Card>
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading gemstones...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: 15 }]}>
        <Pressable 
          onPress={() => comparisonMode === 'compare' ? setComparisonMode('select') : navigation.goBack()} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">
          {comparisonMode === 'compare' ? 'Back to Selection' : 'Compare Gemstones'}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      {comparisonMode === 'select' && (
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="Search gemstones..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowFilters((prev) => !prev)}
            style={[styles.filterToggle, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="sliders" size={16} color={theme.text} />
          </Pressable>
        </View>
      )}

      {comparisonMode === 'select' && showFilters && (
        <View style={[styles.filterContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}> 
          <View style={styles.filterHeader}>
            <ThemedText type="caption" style={{ color: theme.text }}>
              Filters
            </ThemedText>
            <Pressable onPress={clearFilters}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                Clear
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.filterSectionGroup}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Category
            </ThemedText>
            <View style={styles.filterChipsRow}>
              {FILTER_CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        selectedCategory === category ? theme.primary : theme.backgroundDefault,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: selectedCategory === category ? theme.buttonText : theme.text,
                      fontWeight: selectedCategory === category ? '600' : '500',
                    }}
                  >
                    {category}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterSectionGroup}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Dominant Colors
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChipsRow}>
                {FILTER_COLORS.map((color) => {
                  const isSelected = selectedColors.includes(color);
                  return (
                    <Pressable
                      key={color}
                      onPress={() => toggleColorFilter(color)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={{
                          color: isSelected ? theme.buttonText : theme.text,
                          fontWeight: isSelected ? '600' : '500',
                        }}
                      >
                        {color}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {comparisonMode === 'select' ? (
        <>
          {/* Selected Gems Bar */}
          {selectedGems.length > 0 && (
            <View key="selected-gems-bar" style={[styles.selectedGemsBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectedGemsList}>
                  {selectedGems.map((item, index) => (
                    <View
                      key={`mini-badge-${item.id}`} style={[styles.selectedGemMini, { backgroundColor: theme.primary + "20" }]}
                    >
                      <ThemedText type="caption" style={[styles.selectedGemMiniNumber, { color: theme.primary }]}>
                        {index + 1}
                      </ThemedText>
                      <ThemedText type="caption" style={styles.selectedGemMiniName}>
                        {item.gemstone.variety}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>
              
              {selectedGems.length >= 2 && (
                <Button
                  key="compare-now-button"
                  onPress={startComparison}
                  variant="primary"
                  style={styles.compareNowButton}
                >
                  Compare Now ({selectedGems.length})
                </Button>
              )}
              <Button
                key="clear-selected-button"
                variant="secondary"
                onPress={clearSelections}
                style={styles.clearSelectedButton}
              >
                Clear Selected
              </Button>
            </View>
          )}

          {/* Selection Info */}
          <View key="selection-info" style={[styles.selectionInfo, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={styles.selectionInfoText}>
              Select 2-3 gemstones to compare ({selectedGems.length}/3 selected)
            </ThemedText>
          </View>

          {/* Gemstones List */}
          <FlatList
            key="gemstones-list"
            data={filteredGems}
            renderItem={renderGemstoneItem}
            keyExtractor={(item) => `gemstone-${item.id}`}
            contentContainerStyle={styles.gemstoneList}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.comparisonWrapper}>
          <ComparisonView />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerSpacer: {
    width: 32,
  },
  selectedGemsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  selectedGemsList: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectedGemMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  selectedGemMiniNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedGemMiniName: {
    fontSize: 11,
    fontWeight: '600',
  },
  compareNowButton: {
    paddingHorizontal: Spacing.md,
  },
  selectionInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  selectionInfoText: {
    textAlign: 'center',
  },
  gemstoneList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  gemstoneItem: {
    marginBottom: Spacing.md,
  },
  selectedGemstoneItem: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
  },
  disabledGemstoneItem: {
    opacity: 0.6,
  },
  gemstoneCard: {
    padding: 0,
    overflow: 'hidden',
  },
  gemstoneContent: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  imageContainer: {
    position: 'relative',
  },
  gemstoneImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxSelectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemstoneInfo: {
    flex: 1,
  },
  gemstoneName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  gemstoneSubtitle: {
    marginBottom: Spacing.xs,
  },
  propertyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  propertyItem: {
    alignItems: 'center',
  },
  propertyLabel: {
    fontSize: 9,
    marginBottom: 1,
  },
  propertyValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  comparisonWrapper: {
    flex: 1,
  },
  comparisonModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  backToSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backToSelectText: {
    fontSize: 12,
  },
  comparisonModeTitle: {
    fontWeight: '600',
  },
  comparisonContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  comparisonContentContainer: {
    paddingBottom: 100,
  },
  comparisonHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  comparisonGemCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: Spacing.xs,
  },
  comparisonGemImageContainer: {
    marginBottom: Spacing.sm,
  },
  comparisonGemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  comparisonPlaceholderImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  comparisonGemName: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  comparisonGemSubtitle: {
    textAlign: 'center',
    fontSize: 11,
  },
  comparisonTable: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  comparisonTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  comparisonTableLabel: {
    flex: 1.5,
    padding: Spacing.md,
    borderRightWidth: 1,
  },
  comparisonTableColumn: {
    flex: 1,
    padding: Spacing.md,
    borderRightWidth: 1,
  },
  comparisonTableHeaderText: {
    fontWeight: '700',
    fontSize: 11,
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  comparisonLabel: {
    flex: 1.5,
    padding: Spacing.md,
    borderRightWidth: 1,
    borderTopLeftRadius: BorderRadius.lg,
  },
  comparisonValue: {
    flex: 1,
    padding: Spacing.md,
    borderRightWidth: 1,
    borderTopRightRadius: BorderRadius.lg,
  },
  comparisonLabelText: {
    fontWeight: '600',
    fontSize: 11,
  },
  comparisonValueText: {
    fontSize: 11,
  },
  selectedGemCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  selectedGemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  selectedGemNumber: {
    fontWeight: '700',
  },
  removeButton: {
    padding: 2,
  },
  selectedGemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedGemImageContainer: {
    // Add styles if needed
  },
  selectedGemImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
  },
  selectedPlaceholderImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedGemInfo: {
    flex: 1,
  },
  selectedGemName: {
    fontWeight: '600',
    fontSize: 12,
  },
  selectedGemSubtitle: {
    fontSize: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  filterToggle: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterContainer: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSectionGroup: {
    gap: Spacing.sm,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  clearSelectedButton: {
    paddingHorizontal: Spacing.md,
  },
});
