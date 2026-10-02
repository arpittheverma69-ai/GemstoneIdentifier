import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEM_CATEGORIES } from "@/constants/gemstoneData";

interface GemstoneFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  showSemiPreciousFilters: boolean;
  setShowSemiPreciousFilters: (show: boolean) => void;
  selectedSemiPreciousColors: string[];
  setSelectedSemiPreciousColors: (colors: string[]) => void;
  selectedSemiPreciousHardness: string;
  setSelectedSemiPreciousHardness: (hardness: string) => void;
  selectedSemiPreciousTransparency: string;
  setSelectedSemiPreciousTransparency: (transparency: string) => void;
  sortAlphabetical: "asc" | "desc" | "none";
  setSortAlphabetical: (sort: "asc" | "desc" | "none") => void;
  sortRI: "high" | "low" | "none";
  setSortRI: (sort: "high" | "low" | "none") => void;
  sortSG: "high" | "low" | "none";
  setSortSG: (sort: "high" | "low" | "none") => void;
  sortHardness: "high" | "low" | "none";
  setSortHardness: (sort: "high" | "low" | "none") => void;
}

const categories = GEM_CATEGORIES;
const hardnessOptions = ["All", "Soft", "Medium", "Hard"];
const transparencyOptions = ["All", "Transparent", "Translucent", "Opaque"];
const colorOptions = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Purple",
  "Black",
  "White",
  "Orange",
  "Pink",
  "Brown",
  "Gray",
  "Colorless",
];

export default function GemstoneFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  showSemiPreciousFilters,
  setShowSemiPreciousFilters,
  selectedSemiPreciousColors,
  setSelectedSemiPreciousColors,
  selectedSemiPreciousHardness,
  setSelectedSemiPreciousHardness,
  selectedSemiPreciousTransparency,
  setSelectedSemiPreciousTransparency,
  sortAlphabetical,
  setSortAlphabetical,
  sortRI,
  setSortRI,
  sortSG,
  setSortSG,
  sortHardness,
  setSortHardness,
}: GemstoneFiltersProps) {
  const { theme } = useTheme();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filtersRow}>
          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="search" size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search gemstones..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories */}
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[
                styles.categoryButton,
                {
                  backgroundColor:
                    selectedCategory === category
                      ? theme.primary
                      : theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: selectedCategory === category ? "#FFFFFF" : theme.text,
                }}
              >
                {category}
              </ThemedText>
            </Pressable>
          ))}

          {/* Semi-precious Filters Toggle */}
          {selectedCategory === "Semi-precious" && (
            <Pressable
              onPress={() =>
                setShowSemiPreciousFilters(!showSemiPreciousFilters)
              }
              style={[
                styles.filterToggle,
                {
                  backgroundColor: showSemiPreciousFilters
                    ? theme.primary
                    : theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather
                name="filter"
                size={14}
                color={showSemiPreciousFilters ? "#FFFFFF" : theme.text}
              />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Semi-precious Detailed Filters */}
      {selectedCategory === "Semi-precious" && showSemiPreciousFilters && (
        <View
          style={[
            styles.detailedFilters,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {/* Color Filters */}
          <View style={styles.filterSection}>
            <ThemedText
              type="small"
              style={{ color: theme.text, marginBottom: Spacing.xs }}
            >
              Colors
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.colorFilters}>
                {colorOptions.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => {
                      if (selectedSemiPreciousColors.includes(color)) {
                        setSelectedSemiPreciousColors(
                          selectedSemiPreciousColors.filter((c) => c !== color),
                        );
                      } else {
                        setSelectedSemiPreciousColors([
                          ...selectedSemiPreciousColors,
                          color,
                        ]);
                      }
                    }}
                    style={[
                      styles.colorChip,
                      {
                        backgroundColor: selectedSemiPreciousColors.includes(
                          color,
                        )
                          ? theme.primary
                          : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color: selectedSemiPreciousColors.includes(color)
                          ? "#FFFFFF"
                          : theme.text,
                      }}
                    >
                      {color}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Hardness & Transparency */}
          <View style={styles.rowFilters}>
            <View style={styles.filterSection}>
              <ThemedText
                type="small"
                style={{ color: theme.text, marginBottom: Spacing.xs }}
              >
                Hardness
              </ThemedText>
              <View style={styles.optionButtons}>
                {hardnessOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedSemiPreciousHardness(option)}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          selectedSemiPreciousHardness === option
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          selectedSemiPreciousHardness === option
                            ? "#FFFFFF"
                            : theme.text,
                      }}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <ThemedText
                type="small"
                style={{ color: theme.text, marginBottom: Spacing.xs }}
              >
                Transparency
              </ThemedText>
              <View style={styles.optionButtons}>
                {transparencyOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedSemiPreciousTransparency(option)}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          selectedSemiPreciousTransparency === option
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{
                        color:
                          selectedSemiPreciousTransparency === option
                            ? "#FFFFFF"
                            : theme.text,
                      }}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.sortSection}>
            <ThemedText
              type="small"
              style={{ color: theme.text, marginBottom: Spacing.xs }}
            >
              Sort By
            </ThemedText>
            <View style={styles.sortOptions}>
              <View style={styles.sortGroup}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Name
                </ThemedText>
                <View style={styles.sortButtons}>
                  <Pressable
                    onPress={() =>
                      setSortAlphabetical(
                        sortAlphabetical === "asc" ? "desc" : "asc",
                      )
                    }
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor:
                          sortAlphabetical !== "none"
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        sortAlphabetical === "asc"
                          ? "arrow-up"
                          : sortAlphabetical === "desc"
                            ? "arrow-down"
                            : "minus"
                      }
                      size={12}
                      color={
                        sortAlphabetical !== "none" ? "#FFFFFF" : theme.text
                      }
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.sortGroup}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  RI
                </ThemedText>
                <View style={styles.sortButtons}>
                  <Pressable
                    onPress={() =>
                      setSortRI(
                        sortRI === "high"
                          ? "low"
                          : sortRI === "low"
                            ? "none"
                            : "high",
                      )
                    }
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor:
                          sortRI !== "none"
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        sortRI === "high"
                          ? "arrow-down"
                          : sortRI === "low"
                            ? "arrow-up"
                            : "minus"
                      }
                      size={12}
                      color={sortRI !== "none" ? "#FFFFFF" : theme.text}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.sortGroup}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  SG
                </ThemedText>
                <View style={styles.sortButtons}>
                  <Pressable
                    onPress={() =>
                      setSortSG(
                        sortSG === "high"
                          ? "low"
                          : sortSG === "low"
                            ? "none"
                            : "high",
                      )
                    }
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor:
                          sortSG !== "none"
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        sortSG === "high"
                          ? "arrow-down"
                          : sortSG === "low"
                            ? "arrow-up"
                            : "minus"
                      }
                      size={12}
                      color={sortSG !== "none" ? "#FFFFFF" : theme.text}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.sortGroup}>
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Hardness
                </ThemedText>
                <View style={styles.sortButtons}>
                  <Pressable
                    onPress={() =>
                      setSortHardness(
                        sortHardness === "high"
                          ? "low"
                          : sortHardness === "low"
                            ? "none"
                            : "high",
                      )
                    }
                    style={[
                      styles.sortButton,
                      {
                        backgroundColor:
                          sortHardness !== "none"
                            ? theme.primary
                            : theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        sortHardness === "high"
                          ? "arrow-down"
                          : sortHardness === "low"
                            ? "arrow-up"
                            : "minus"
                      }
                      size={12}
                      color={sortHardness !== "none" ? "#FFFFFF" : theme.text}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 150,
  },
  searchInput: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  categoryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  filterToggle: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  detailedFilters: {
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  colorFilters: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  colorChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  rowFilters: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  optionButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  optionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  sortSection: {
    marginTop: Spacing.md,
  },
  sortOptions: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  sortGroup: {
    alignItems: "center",
  },
  sortButtons: {
    flexDirection: "row",
  },
  sortButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
