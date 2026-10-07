import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  ViewToken,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SelectableFieldWithOther } from "@/components/SelectableFieldWithOther";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/services/supabaseClient";
import { searchGemstones } from "@/services/gemstoneService";
import {
  getUserRoleAndAccessInfo,
  submitAccessRequest,
  PendingUserRequest,
  UserRole,
} from "@/services/accessRequestService";

const DANGER_COLOR = "#ef4444";
const WARNING_COLOR = "#f59e0b";

const TAG_OPTIONS = ["Precious", "Semi-precious", "Organic", "Others"] as const;
const TRANSPARENCY_OPTIONS = [
  "Transparent",
  "Translucent",
  "Opaque",
  "Translucent - Opaque",
  "Translucent - Transparent",
] as const;
const OPTIC_CHARACTER_OPTIONS = ["Biaxial", "Uniaxial"] as const;
const POLARISCOPE_REACTION_OPTIONS = ["SR", "DR", "AGG", "ADR", "NA"] as const;

type SortOption =
  | "none"
  | "az"
  | "za"
  | "colorAz"
  | "colorZa"
  | "riHigh"
  | "riLow"
  | "sgHigh"
  | "sgLow"
  | "hardnessHigh"
  | "hardnessLow";

const SORT_OPTIONS: { key: SortOption; label: string; icon: keyof typeof Feather.glyphMap; hint: string }[] = [
  {
    key: "none",
    label: "Default (Precious First)",
    icon: "award",
    hint: "Precious → Semi-precious → Organic",
  },
  {
    key: "az",
    label: "Name (A → Z)",
    icon: "arrow-up",
    hint: "Alphabetical ascending",
  },
  {
    key: "za",
    label: "Name (Z → A)",
    icon: "arrow-down",
    hint: "Alphabetical descending",
  },
  {
    key: "hardnessHigh",
    label: "Hardness (High → Low)",
    icon: "shield",
    hint: "Diamond & Corundum first",
  },
  {
    key: "hardnessLow",
    label: "Hardness (Low → High)",
    icon: "shield",
    hint: "Soft & fragile gems first",
  },
  {
    key: "riHigh",
    label: "Refractive Index (High → Low)",
    icon: "eye",
    hint: "High brilliance first",
  },
  {
    key: "riLow",
    label: "Refractive Index (Low → High)",
    icon: "eye",
    hint: "Low RI first",
  },
  {
    key: "sgHigh",
    label: "Specific Gravity (High → Low)",
    icon: "activity",
    hint: "Dense & heavy stones first",
  },
  {
    key: "sgLow",
    label: "Specific Gravity (Low → High)",
    icon: "activity",
    hint: "Lightweight stones first",
  },
  {
    key: "colorAz",
    label: "Color (A → Z)",
    icon: "droplet",
    hint: "Sort by primary color",
  },
];

const HARDNESS_FILTER_OPTIONS = [
  { key: "All", label: "All Hardness", hint: "Any hardness" },
  { key: "< 6", label: "Soft (< 6)", hint: "Amber, Pearl, Fluorite, Calcite" },
  { key: "6 – 7", label: "Medium (6 – 7)", hint: "Opal, Turquoise, Tanzanite" },
  { key: "7 – 8", label: "Hard (7 – 8)", hint: "Quartz, Tourmaline, Beryl, Topaz" },
  { key: "8+", label: "Very Hard (8+)", hint: "Alexandrite, Sapphire, Ruby, Diamond" },
] as const;

const PAGE_SIZE = 25;
const LOAD_TRIGGER_OFFSET = 5;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PREVIEW_MAX_WIDTH = SCREEN_WIDTH * 0.9;
const PREVIEW_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;

const normalizeToArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (item != null ? String(item).trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (item != null ? String(item).trim() : ""))
          .filter(Boolean);
      }
    } catch (error) {
      // not JSON, fallback to delimiter split
    }

    return trimmed
      .split(/[;,/|]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  if (value != null) {
    return [String(value).trim()].filter(Boolean);
  }

  return [];
};

const matchesFilter = (source: string[], filters: string[], options?: { partial?: boolean }) => {
  if (!filters.length) {
    return true;
  }
  if (!source.length) {
    return false;
  }

  const { partial = false } = options || {};
  const normalizedSource = source.map((item) => item.toLowerCase());

  return filters.some((filter) => {
    const needle = filter.toLowerCase();
    return normalizedSource.some((item) => (partial ? item.includes(needle) : item === needle));
  });
};

const mergeNormalized = (...inputs: unknown[]): string[] => {
  const merged: string[] = [];
  inputs.forEach((input) => {
    merged.push(...normalizeToArray(input));
  });
  return merged.filter(Boolean);
};

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const categorizeHardness = (hardness: number | null): string | null => {
  if (hardness == null) {
    return null;
  }
  // Return the actual hardness value as a string for proper range filtering
  return hardness.toFixed(1);
};

const ensureUniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const normalizeGemCategory = (gem: Gemstone): GemCategory => {
  return classifyGemCategory(gem);
};

const getCategoryBadgeColor = (category: string, theme: any) => {
  const norm = (category || "").toLowerCase().trim();
  if (norm === "precious") return theme.secondary; // #F59E0B / Gold
  if (norm === "semi-precious" || norm === "semiprecious" || norm === "semi precious") return theme.primary; // #8B5CF6 / Purple
  if (norm === "organic") return theme.success; // #10B981 / Emerald
  return "#64748B"; // Slate for Others
};

const normalizeSearchText = (value?: string): string => {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

type FilterChip = { key: string; label: string; onRemove: () => void };

function getThemeSafe() {
  return useTheme();
}
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEMSTONE_DATABASE, GEM_CATEGORIES, Gemstone, GemCategory, classifyGemCategory, getCategoryRank, sortGemstonesByDefault, getOptimizedThumbnailUrl } from "@/constants/gemstoneData";
import { getCustomGemstones, getAllGemstonesPaginated, getAllGemstonesForComparison, saveCustomGemstone, updateCustomGemstone, deleteCustomGemstone, uploadGemstoneImage, CustomGemstone } from "@/services/gemstoneService";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

// Option lists for selectable fields
const VARIETY_OPTIONS = ["Ruby", "Sapphire", "Emerald", "Topaz", "Garnet", "Quartz", "Tourmaline", "Zircon"] as const;
const CRYSTAL_SYSTEM_OPTIONS = ["Cubic", "Trigonal", "Hexagonal", "Orthorhombic", "Monoclinic", "Triclinic", "Amorphous"] as const;
const LUSTER_OPTIONS = ["Vitreous", "Resinous", "Greasy", "Adamantine", "Waxy", "Dull"] as const;
const PLEOCHROISM_OPTIONS = ["None", "Weak", "Medium", "Strong"] as const;
const HARDNESS_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
const CLEAVAGE_OPTIONS = ["None", "Poor", "Good", "Perfect"] as const;
const FRACTURE_OPTIONS = ["Conchoidal", "Uneven", "Fibrous", "Hackly"] as const;
const CLARITY_OPTIONS = ["IF", "VVS", "VS", "SI", "I"] as const;
const TREATMENT_OPTIONS = ["Untreated", "Heated", "Irradiated", "Glass-filled", "Oiled", "Diffused"] as const;

// Buying Guide Content Component
const BuyingGuideContent = React.memo(function BuyingGuideContent({
  gemstone,
  theme,
  onPreviewImage,
  onImageLoadStart,
  onImageLoadEnd,
  loadStates,
}: {
  gemstone: Gemstone;
  theme: any;
  onPreviewImage?: (uri: string, label: string) => void;
  onImageLoadStart?: (uri: string) => void;
  onImageLoadEnd?: (uri: string) => void;
  loadStates?: Record<string, boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Check for color consistency and saturation", checked: false },
    { id: 2, text: "Verify clarity and inclusion patterns", checked: false },
    { id: 3, text: "Test refractive index with refractometer", checked: false },
    { id: 4, text: "Check specific gravity with hydrostatic weighing", checked: false },
    { id: 5, text: "Examine cut quality and proportions", checked: false },
    { id: 6, text: "Look for treatments and enhancements", checked: false },
    { id: 7, text: "Verify origin and certification", checked: false },
    { id: 8, text: "Compare market price per carat", checked: false },
  ]);

  // Pricing calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [caratWeight, setCaratWeight] = useState('');
  const [qualityGrade, setQualityGrade] = useState('A'); // A, B, C, D grades
  const [customPricePerCarat, setCustomPricePerCarat] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState('0'); // percentage adjustment
  const [calculatedPrice, setCalculatedPrice] = useState<{ inr: number; usd: number } | null>(null);

  // Custom price multipliers for quality grades
  const qualityMultipliers = {
    'A': 1.0, // Base price
    'B': 0.8, // 20% less
    'C': 0.6, // 40% less
    'D': 0.4, // 60% less
  };

  // Calculate price function
  const calculatePrice = () => {
    if (!caratWeight || parseFloat(caratWeight) <= 0) {
      alert('Please enter a valid carat weight');
      return;
    }

    const weight = parseFloat(caratWeight);
    const basePriceINR = customPricePerCarat ?
      parseFloat(customPricePerCarat) :
      (gemstone.priceRangeINR.min + gemstone.priceRangeINR.max) / 2;

    const basePriceUSD = customPricePerCarat ?
      parseFloat(customPricePerCarat) / 83 : // Approximate conversion rate
      (gemstone.priceRangeUSD.min + gemstone.priceRangeUSD.max) / 2;

    // Apply quality multiplier
    const qualityMultiplier = qualityMultipliers[qualityGrade as keyof typeof qualityMultipliers];

    // Apply price adjustment
    const adjustmentMultiplier = 1 + (parseFloat(priceAdjustment) || 0) / 100;

    // Calculate final price
    const finalPriceINR = Math.round(weight * basePriceINR * qualityMultiplier * adjustmentMultiplier);
    const finalPriceUSD = Math.round(weight * basePriceUSD * qualityMultiplier * adjustmentMultiplier);

    setCalculatedPrice({ inr: finalPriceINR, usd: finalPriceUSD });
  };

  // Real gemstone-specific optical tests using actual database data
  const getOpticalTests = useCallback((gemstone: Gemstone) => {
    // Dynamic optical tests based on actual gemstone data
    return [
      { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'Unknown'} - ${gemstone.variety} optical character`, checked: false },
      { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'Unknown'} - Check with dichroscope`, checked: false },
      { id: 11, text: `Luster: ${gemstone.luster || 'Unknown'} - ${gemstone.variety} luster type`, checked: false },
      { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'Characteristic inclusions'}`, checked: false },
      { id: 13, text: `UV Test: ${gemstone.uvResponse || 'Check fluorescence under UV light'}`, checked: false },
      { id: 14, text: `SG Test: ${gemstone.sgMin || 'Unknown'}-${gemstone.sgMax || 'Unknown'} - Specific gravity test`, checked: false },
    ];
  }, []);

  const [opticalTests, setOpticalTests] = useState(() => getOpticalTests(gemstone));

  // Update optical tests when gemstone changes
  useEffect(() => {
    setOpticalTests(getOpticalTests(gemstone));
  }, [gemstone, getOpticalTests]);

  const toggleCheck = (id: number) => {
    // Update main checklist
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
    // Update optical tests
    setOpticalTests(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const addCheckItem = (text: string) => {
    const newItem = {
      id: Date.now(),
      text,
      checked: false
    };
    setChecklist(prev => [...prev, newItem]);
  };

  return (
    <>
      {/* Quick Optical Tests Section - Now First */}
      <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.buyingGuideHeader}>
          <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
            QUICK OPTICAL TESTS
          </ThemedText>
          <Pressable
            onPress={() => setIsEditing(!isEditing)}
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: theme.primary + "20", opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Feather name="edit-2" size={16} color={theme.primary} />
          </Pressable>
        </View>

        {/* Quick Optical Tests with Checkboxes */}
        {opticalTests.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => toggleCheck(item.id)}
            style={({ pressed }) => [
              styles.checklistItem,
              {
                backgroundColor: item.checked ? theme.success + "10" : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <View style={[styles.checkbox, {
              borderColor: item.checked ? theme.success : theme.border,
              backgroundColor: item.checked ? theme.success : 'transparent'
            }]}>
              {item.checked && (
                <Feather name="check" size={14} color="#FFFFFF" />
              )}
            </View>
            <ThemedText type="body" style={[
              styles.checklistText,
              {
                color: item.checked ? theme.success : theme.text,
                textDecorationLine: item.checked ? 'line-through' : 'none'
              }
            ]}>
              {item.text}
            </ThemedText>
          </Pressable>
        ))}

        {/* Detailed Quick Optical Tests */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="eye" size={20} color={theme.primary} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Refractive Index Test (SR/DR)
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {gemstone.opticCharacter === "DR" ? "Doubly Refractive (DR)" : "Singly Refractive (SR)"}
          </ThemedText>
          <View style={styles.testSteps}>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>1</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Place gemstone on refractometer
              </ThemedText>
            </View>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>2</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Observe shadow line: {gemstone.riMin} - {gemstone.riMax}
              </ThemedText>
            </View>
            {gemstone.opticCharacter === "DR" && (
              <View style={styles.testStep}>
                <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>3</ThemedText>
                </View>
                <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                  Look for double shadow lines (DR indication)
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Pleochroism Test */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="droplet" size={20} color={theme.secondary} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Pleochroism Test
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {gemstone.pleochroism || "None"}
          </ThemedText>
          <View style={styles.testSteps}>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.secondary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>1</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Use dichroscope to view color changes
              </ThemedText>
            </View>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.secondary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>2</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Rotate stone to observe different colors
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Luster Test */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="sun" size={20} color={theme.warning} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Luster Test
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {gemstone.luster}
          </ThemedText>
          <View style={styles.testSteps}>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.warning }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>1</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Observe surface reflection under direct light
              </ThemedText>
            </View>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.warning }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>2</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Compare to reference chart for luster type
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Inclusion Identification */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="search" size={20} color={theme.success} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Inclusion Identification
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Look for these characteristic inclusions:
          </ThemedText>

          {/* Inclusion chips with indicators */}
          <View style={styles.inclusionGuide}>
            {gemstone.inclusions.map((inclusion, idx) => (
              <View key={idx} style={styles.inclusionItem}>
                <View style={[styles.inclusionIcon, { backgroundColor: theme.success + "20" }]}>
                  <Feather name="eye" size={16} color={theme.success} />
                </View>
                <View style={styles.inclusionInfo}>
                  <ThemedText type="body" style={{ color: theme.text, fontWeight: '600' }}>
                    {inclusion}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Use 10x loupe for best visibility
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>

          {/* Inclusion Images if available */}
          {gemstone.inclusionImages && gemstone.inclusionImages.length > 0 && (
            <View style={styles.inclusionImageSection}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                Reference Inclusion Photos:
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.inclusionImagesContainer}
              >
                {gemstone.inclusionImages.map((imgUrl, idx) => {
                  const label = `Inclusion #${idx + 1}`;
                  const isLoading = loadStates?.[imgUrl];
                  return (
                    <Pressable
                      key={`${imgUrl}-${idx}`}
                      onPress={() => onPreviewImage && onPreviewImage(imgUrl, label)}
                      style={({ pressed }) => [
                        styles.inclusionImageWrapper,
                        {
                          borderColor: theme.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <ExpoImage
                        source={{ uri: imgUrl }}
                        style={styles.inclusionImage}
                        contentFit="cover"
                        transition={200}
                        onLoadStart={() => onImageLoadStart && onImageLoadStart(imgUrl)}
                        onLoadEnd={() => onImageLoadEnd && onImageLoadEnd(imgUrl)}
                      />
                      {isLoading && (
                        <View style={styles.inclusionImageLoader}>
                          <ActivityIndicator color={theme.primary} size="small" />
                        </View>
                      )}
                      <View style={[styles.imageLabel, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
                          {label}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* UV Light Test */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              UV Light Test
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {gemstone.uvResponse || "No fluorescence"}
          </ThemedText>
          <View style={styles.testSteps}>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>1</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Test under long-wave UV (365nm)
              </ThemedText>
            </View>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.primary }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>2</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Test under short-wave UV (254nm)
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Specific Gravity Test */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Feather name="activity" size={20} color={theme.success} />
            <ThemedText type="h4" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Specific Gravity Test
            </ThemedText>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Expected range: {gemstone.sgMin} - {gemstone.sgMax}
          </ThemedText>
          <View style={styles.testSteps}>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.success }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>1</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Use hydrostatic weighing method
              </ThemedText>
            </View>
            <View style={styles.testStep}>
              <View style={[styles.stepBullet, { backgroundColor: theme.success }]}>
                <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>2</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
                Compare to heavy liquids for quick estimate
              </ThemedText>
            </View>
          </View>
        </View>

        {isEditing && (
          <View style={styles.addCheckSection}>
            <TextInput
              style={[styles.addCheckInput, {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="Add new checklist item..."
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={(e) => {
                if (e.nativeEvent.text.trim()) {
                  addCheckItem(e.nativeEvent.text.trim());
                  e.nativeEvent.text = '';
                }
              }}
            />
          </View>
        )}
      </Card>

      {/* Buying Checklist Card - Now Second */}
      <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.buyingGuideHeader}>
          <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
            BUYING CHECKLIST & PRICING
          </ThemedText>
          <Pressable
            onPress={() => setShowCalculator(!showCalculator)}
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: theme.primary + "20", opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Feather name="dollar-sign" size={16} color={theme.primary} />
          </Pressable>
        </View>

        {checklist.filter(item => item.id < 9).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => toggleCheck(item.id)}
            style={({ pressed }) => [
              styles.checklistItem,
              {
                backgroundColor: item.checked ? theme.success + "10" : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1
              }
            ]}
          >
            <View style={[styles.checkbox, {
              borderColor: item.checked ? theme.success : theme.border,
              backgroundColor: item.checked ? theme.success : 'transparent'
            }]}>
              {item.checked && (
                <Feather name="check" size={14} color="#FFFFFF" />
              )}
            </View>
            <ThemedText type="body" style={[
              styles.checklistText,
              {
                color: item.checked ? theme.success : theme.text,
                textDecorationLine: item.checked ? 'line-through' : 'none'
              }
            ]}>
              {item.text}
            </ThemedText>
          </Pressable>
        ))}

        {/* Pricing Calculator Section */}
        {showCalculator && (
          <View style={[styles.calculatorSection, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.md }}>
              Quick Pricing Calculator
            </ThemedText>

            {/* Carat Weight Input */}
            <View style={styles.inputRow}>
              <ThemedText type="body" style={{ color: theme.text, width: 100 }}>
                Carat Weight:
              </ThemedText>
              <TextInput
                style={[styles.calculatorInput, {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="Enter carats"
                placeholderTextColor={theme.textSecondary}
                value={caratWeight}
                onChangeText={setCaratWeight}
                keyboardType="numeric"
              />
            </View>

            {/* Quality Grade Selector */}
            <View style={styles.inputRow}>
              <ThemedText type="body" style={{ color: theme.text, width: 100 }}>
                Quality Grade:
              </ThemedText>
              <View style={styles.gradeSelector}>
                {(['A', 'B', 'C', 'D'] as const).map(grade => (
                  <Pressable
                    key={grade}
                    onPress={() => setQualityGrade(grade)}
                    style={[
                      styles.gradeButton,
                      {
                        backgroundColor: qualityGrade === grade ? theme.primary : theme.inputBackground,
                        borderColor: theme.border
                      }
                    ]}
                  >
                    <ThemedText type="caption" style={{
                      color: qualityGrade === grade ? '#FFFFFF' : theme.text,
                      fontWeight: qualityGrade === grade ? '700' : '500'
                    }}>
                      {grade}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Price Per Carat */}
            <View style={styles.inputRow}>
              <ThemedText type="body" style={{ color: theme.text, width: 100 }}>
                Custom Price/ct:
              </ThemedText>
              <TextInput
                style={[styles.calculatorInput, {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder={`Default: ₹${Math.round((gemstone.priceRangeINR.min + gemstone.priceRangeINR.max) / 2)}`}
                placeholderTextColor={theme.textSecondary}
                value={customPricePerCarat}
                onChangeText={setCustomPricePerCarat}
                keyboardType="numeric"
              />
            </View>

            {/* Price Adjustment */}
            <View style={styles.inputRow}>
              <ThemedText type="body" style={{ color: theme.text, width: 100 }}>
                Adjustment %:
              </ThemedText>
              <TextInput
                style={[styles.calculatorInput, {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="+/- %"
                placeholderTextColor={theme.textSecondary}
                value={priceAdjustment}
                onChangeText={setPriceAdjustment}
                keyboardType="numeric"
              />
            </View>

            {/* Calculate Button */}
            <Pressable
              onPress={calculatePrice}
              style={({ pressed }) => [
                styles.calculateButton,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.8 : 1
                }
              ]}
            >
              <Feather name="dollar-sign" size={16} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: '700' }}>
                Calculate Price
              </ThemedText>
            </Pressable>

            {/* Calculated Price Display */}
            {calculatedPrice && (
              <View style={[styles.priceResult, { backgroundColor: theme.success + "15" }]}>
                <ThemedText type="h4" style={{ color: theme.success, fontWeight: '800', textAlign: 'center' }}>
                  Estimated Price
                </ThemedText>
                <View style={styles.priceRow}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    INR:
                  </ThemedText>
                  <ThemedText type="h4" style={{ color: theme.success, fontWeight: '800' }}>
                    ₹{calculatedPrice.inr.toLocaleString()}
                  </ThemedText>
                </View>
                <View style={styles.priceRow}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    USD:
                  </ThemedText>
                  <ThemedText type="h4" style={{ color: theme.primary, fontWeight: '800' }}>
                    ${calculatedPrice.usd.toLocaleString()}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        )}
      </Card>
    </>
  );
});

// Helper to format uppercase inclusion strings into clean, readable sentence case while keeping scientific acronyms
function formatInclusionSentence(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();

  // If text is all or mostly uppercase (e.g. > 55% uppercase letters)
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, "");
  const upperLetters = (trimmed.match(/[A-Z]/g) || []).length;

  if (lettersOnly.length > 6 && upperLetters / lettersOnly.length > 0.55) {
    // Convert to readable sentence case
    const sentences = trimmed.toLowerCase().split(/(\. |\.\n|\n)/);
    let result = sentences.map((part) => {
      if (part.startsWith(".") || part === "\n" || !part.trim()) return part;
      const s = part.trim();
      return s.charAt(0).toUpperCase() + s.slice(1);
    }).join("");

    // Capitalize important acronyms & types
    const acronyms = [
      "UV", "RI", "SG", "IIa", "IIb", "Ia", "Ib", "IIA", "IIB", "IA", "IB",
      "HPHT", "CVD", "SR", "DR", "ADR", "AGG", "LWUV", "SWUV", "NIR", "FTIR", "LED"
    ];
    acronyms.forEach((acronym) => {
      const regex = new RegExp(`\\b${acronym}\\b`, "gi");
      result = result.replace(regex, acronym.toUpperCase());
    });
    return result;
  }

  return trimmed;
}

export default function GemDatabaseScreen() {
  const { theme, isDark } = getThemeSafe();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();
  const { user } = useAuth();
  const navigation = useNavigation();

  // User role and pending access request state
  const [userRole, setUserRole] = useState<UserRole>("Looker");
  const [pendingRequest, setPendingRequest] = useState<PendingUserRequest | null>(null);
  const [isSubmittingAccessRequest, setIsSubmittingAccessRequest] = useState(false);
  const [requestedRoleSelection, setRequestedRoleSelection] = useState<"Student" | "Curator">("Student");
  const [accessRequestReason, setAccessRequestReason] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Gemstone[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGem, setSelectedGem] = useState<Gemstone | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "formation" | "testing">("properties");
  const [showAddStoneModal, setShowAddStoneModal] = useState(false);
  const [editingGemstone, setEditingGemstone] = useState<Gemstone | null>(null);
  const [customStones, setCustomStones] = useState<Gemstone[]>([]);
  const [isLoadingGems, setIsLoadingGems] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isUpdatingGemstone, setIsUpdatingGemstone] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("none");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [modalTab, setModalTab] = useState<"sort" | "filters">("sort");
  const [totalDatabaseCount, setTotalDatabaseCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(false);
  const isLoadingMoreRef = useRef(false);

  // Gemstone filters
  const [selectedColorFilters, setSelectedColorFilters] = useState<string[]>([]);
  const [selectedHardnessFilter, setSelectedHardnessFilter] = useState<string>("All");
  const [selectedTransparencyFilters, setSelectedTransparencyFilters] = useState<string[]>([]);
  const [selectedOpticCharacters, setSelectedOpticCharacters] = useState<string[]>([]);
  const [selectedPleochroismFilters, setSelectedPleochroismFilters] = useState<string[]>([]);
  const [selectedOriginFilters, setSelectedOriginFilters] = useState<string[]>([]);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ uri: string; label: string } | null>(null);

  const toggleColorFilter = useCallback((value: string) => {
    setSelectedColorFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);

  const toggleTransparencyFilter = useCallback((value: string) => {
    setSelectedTransparencyFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);


  const toggleOpticCharacter = useCallback((value: string) => {
    setSelectedOpticCharacters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);

  const togglePleochroism = useCallback((value: string) => {
    setSelectedPleochroismFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);

  const toggleOrigin = useCallback((value: string) => {
    setSelectedOriginFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  }, []);

  const handleSelectHardness = useCallback((value: string) => {
    setSelectedHardnessFilter((prev) => (prev === value ? 'All' : value));
  }, []);

  const removeColorFilter = useCallback((value: string) => {
    setSelectedColorFilters((prev) => prev.filter((item) => item !== value));
  }, []);

  const removeTransparencyFilter = useCallback((value: string) => {
    setSelectedTransparencyFilters((prev) => prev.filter((item) => item !== value));
  }, []);


  const removeOpticCharacter = useCallback((value: string) => {
    setSelectedOpticCharacters((prev) => prev.filter((item) => item !== value));
  }, []);

  const removePleochroism = useCallback((value: string) => {
    setSelectedPleochroismFilters((prev) => prev.filter((item) => item !== value));
  }, []);

  const removeOrigin = useCallback((value: string) => {
    setSelectedOriginFilters((prev) => prev.filter((item) => item !== value));
  }, []);
  const handleImageLoadStart = useCallback((uri: string) => {
    setImageLoadStates((prev) => ({ ...prev, [uri]: true }));
  }, []);
  const handleImageLoadEnd = useCallback((uri: string) => {
    setImageLoadStates((prev) => ({ ...prev, [uri]: false }));
  }, []);
  const openPreview = useCallback((uri: string, label: string) => {
    setPreviewImage({ uri, label });
  }, []);
  const closePreview = useCallback(() => setPreviewImage(null), []);

  // Animation for header shrinking - Enhanced smooth scrolling with compact header
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 280;
  const HEADER_MIN_HEIGHT = 120;
  const COMPACT_HEADER_THRESHOLD = 180; // When to start showing compact header

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  // Compact header animations
  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [COMPACT_HEADER_THRESHOLD - 20, COMPACT_HEADER_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [COMPACT_HEADER_THRESHOLD - 20, COMPACT_HEADER_THRESHOLD],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  // Hero section fade out
  const heroSectionOpacity = scrollY.interpolate({
    inputRange: [COMPACT_HEADER_THRESHOLD - 30, COMPACT_HEADER_THRESHOLD],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Smoother image animations with reduced movement
  const heroImageScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.6],
    extrapolate: 'clamp',
  });

  const heroImageOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const heroImageTranslateX = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -80],
    extrapolate: 'clamp',
  });

  const heroImageTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 20],
    extrapolate: 'clamp',
  });

  // Enhanced title animations with better stability
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const titleTranslateX = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const titleScale = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const fetchGemstones = useCallback(
    async (_pageToLoad: number = 1, options: { reset?: boolean } = {}) => {
      const { reset = false } = options;
      if (reset) {
        setIsLoadingGems(true);
        setCurrentPage(1);
        setHasMorePages(false);
      }

      try {
        const gemstones = await getAllGemstonesForComparison();
        const newCount = gemstones.length;

        setCustomStones(gemstones);
        setTotalDatabaseCount(newCount);
        setHasMorePages(false);
        setCurrentPage(1);
        if (reset) {
          setVisibleCount(newCount);
        }

        return newCount;
      } catch (error) {
        console.error('❌ Error loading gemstones from database:', error);
        if (reset) {
          setCustomStones([]);
          setCurrentPage(1);
          setTotalDatabaseCount(GEMSTONE_DATABASE.length);
          setVisibleCount(GEMSTONE_DATABASE.length);
        }
        return 0;
      } finally {
        if (reset) {
          setIsLoadingGems(false);
        }
      }
    },
    []
  );

  const loadGemstones = useCallback(() => {
    fetchGemstones(1, { reset: true });
  }, [fetchGemstones]);

  useEffect(() => {
    loadGemstones();
  }, [loadGemstones]);

  const showInfoAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      Alert.alert(title, message);
    }
  }, []);

  const confirmDeleteGem = useCallback(async (gemName: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        return window.confirm(`Are you sure you want to delete ${gemName}?`);
      }
      return false;
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete Gemstone",
        `Are you sure you want to delete ${gemName}?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }, []);

  // Load user role and access request status
  const loadUserRoleAndAccess = useCallback(async () => {
    if (!user) {
      setUserRole("Looker");
      setPendingRequest(null);
      return;
    }

    try {
      const info = await getUserRoleAndAccessInfo(user.id, user.email);
      setUserRole(info.role);
      setPendingRequest(info.pendingRequest);
    } catch (error) {
      console.error("Error loading user role and access info:", error);
    }
  }, [user]);

  useEffect(() => {
    loadUserRoleAndAccess();
  }, [loadUserRoleAndAccess]);

  const isRestrictedUser =
    !user ||
    userRole === "Looker" ||
    userRole === "Pending" ||
    (pendingRequest?.status === "Pending" &&
      userRole !== "Admin" &&
      userRole !== "Curator" &&
      userRole !== "Student");

  const handleSendAccessRequest = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in or sign up before requesting access.");
      return;
    }

    try {
      setIsSubmittingAccessRequest(true);
      const result = await submitAccessRequest(
        user.id,
        user.email || "",
        requestedRoleSelection,
        accessRequestReason,
        user.full_name
      );

      if (result.success && result.request) {
        setPendingRequest(result.request);
        setShowRequestForm(false);
        setAccessRequestReason("");
        if (Platform.OS === "web") {
          window.alert(
            `🚀 Access request for "${requestedRoleSelection}" sent to Admin!\nYour request is now in Settings -> Pending Users for approval.`
          );
        } else {
          Alert.alert(
            "Access Request Sent 🚀",
            `Your request for "${requestedRoleSelection}" has been submitted to the Administrator. You will be approved in Settings -> Pending Users.`
          );
        }
      } else {
        Alert.alert("Error", result.error || "Failed to send request");
      }
    } catch (e: any) {
      console.error("Error submitting access request:", e);
      Alert.alert("Error", e.message || "Failed to send access request");
    } finally {
      setIsSubmittingAccessRequest(false);
    }
  };

  // Refresh selectedGem data from database when detail modal opens
  useEffect(() => {
    const refreshSelectedGemData = async () => {
      if (!selectedGem?.id) return;

      const currentId = selectedGem.id;

      try {
        console.log(`🔄 Refreshing data for ${selectedGem.variety}...`);
        const { gemstones } = await getAllGemstonesPaginated(1, 1000);
        const updatedGem = gemstones.find((g) => g.id === currentId);

        if (updatedGem) {
          console.log(`✅ Updated ${selectedGem.variety} with fresh data from database`);
          setSelectedGem((prev) => {
            if (prev && prev.id === currentId) {
              return updatedGem;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error refreshing gem data:', error);
      }
    };

    refreshSelectedGemData();
  }, [selectedGem?.id]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 220);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Database search effect - only hit Supabase when local cache hasn't loaded yet
  useEffect(() => {
    const query = debouncedQuery;

    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // If we already have the full gemstone list locally, rely on local filtering
    if (customStones.length > 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const performSearch = async () => {
      setIsSearching(true);
      try {
        const result = await searchGemstones(query);
        if (isCancelled) return;
        if (result.success && result.data) {
          setSearchResults(result.data as Gemstone[]);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error searching gemstones:', error);
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, customStones.length]);

  // Use only real database stones (no fallback)
  const allGems = useMemo(() => {
    if (customStones.length > 0) {
      console.log('🔍 Using custom stones:', customStones.map(g => `${g.variety} (${g.id})`).join(', '));
      return customStones.map((g) => ({
        ...g,
        category: classifyGemCategory(g),
      }));
    }
    // Return empty array while loading - no fallback
    console.log('🔍 Waiting for gemstones to load...');
    return [];
  }, [customStones]);

  const effectiveGems = useMemo(() => {
    // Always use the local gemstone list; search is handled by filtering
    return allGems;
  }, [allGems]);

  const availableColorOptions = useMemo(() => {
    const merged = allGems.flatMap((gem) =>
      mergeNormalized(gem.colors, (gem as any).Colors)
    );
    return ensureUniqueSorted(merged);
  }, [allGems]);

  const availableTransparencyOptions = useMemo(() => {
    const merged = allGems.flatMap((gem) =>
      mergeNormalized(gem.transparency, (gem as any).Transparency)
    );
    return ensureUniqueSorted(merged);
  }, [allGems]);


  const availableOpticCharacterOptions = useMemo(() => {
    const merged = allGems.flatMap((gem) =>
      mergeNormalized(gem.opticCharacter, (gem as any)["Optic Character"])
    );
    return ensureUniqueSorted(merged);
  }, [allGems]);

  const availablePleochroismOptions = useMemo(() => {
    const merged = allGems.flatMap((gem) =>
      mergeNormalized(gem.pleochroism, (gem as any).Pleochroism)
    );
    return ensureUniqueSorted(merged);
  }, [allGems]);

  const availableOriginOptions = useMemo(() => {
    const raw = allGems.flatMap((gem) =>
      mergeNormalized(gem.occurrences, (gem as any).Occurences)
    );
    const countryMap = new Map<string, number>();
    for (const item of raw) {
      const parts = String(item).split(/[;,]/).map((p) => p.trim());
      for (const part of parts) {
        if (
          part.length > 1 &&
          part.length <= 32 &&
          !/\b(ago|century|mined|paint|fresco|pigment|ancient|material|sculptural|deposit|history|years|stone|color|found|known|specimens|popular|originally|named|discovered|legend)\b/i.test(part) &&
          !part.includes(".")
        ) {
          let clean = part;
          if (clean.includes("United States")) clean = "USA";
          else if (clean.includes("United Kingdom")) clean = "UK";
          else if (clean.includes("Tanzania")) clean = "Tanzania";
          else if (clean.includes("Russian")) clean = "Russia";
          else if (clean.includes("Korea")) clean = "Korea";
          else if (clean.includes("Bolivia")) clean = "Bolivia";
          else if (clean.includes("Congo")) clean = "Congo";
          else if (clean.includes("Iran")) clean = "Iran";
          else if (clean.includes("Viet Nam")) clean = "Vietnam";
          
          if (clean.toLowerCase() !== "unknown" && clean.toLowerCase() !== "na") {
            countryMap.set(clean, (countryMap.get(clean) || 0) + 1);
          }
        }
      }
    }
    return Array.from(countryMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allGems]);

  // Pre-fetch thumbnail images into memory-disk cache for instantaneous rendering
  useEffect(() => {
    if (allGems.length > 0) {
      const urlsToPrefetch = allGems
        .map((g) => getOptimizedThumbnailUrl(g.image, 240))
        .filter((img): img is string => typeof img === "string" && img.startsWith("http"))
        .slice(0, 40);

      if (urlsToPrefetch.length > 0) {
        ExpoImage.prefetch(urlsToPrefetch);
      }
    }
  }, [allGems]);

  const activeFiltersCount = useMemo(() => {
    return (
      selectedColorFilters.length +
      (selectedHardnessFilter !== 'All' ? 1 : 0) +
      selectedTransparencyFilters.length +
      selectedOpticCharacters.length +
      selectedPleochroismFilters.length +
      selectedOriginFilters.length
    );
  }, [
    selectedColorFilters,
    selectedHardnessFilter,
    selectedTransparencyFilters,
    selectedOpticCharacters,
    selectedPleochroismFilters,
    selectedOriginFilters,
  ]);

  const activeFilterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    selectedColorFilters.forEach((color) => {
      chips.push({
        key: `color-${color}`,
        label: `Color: ${color}`,
        onRemove: () => removeColorFilter(color),
      });
    });
    if (selectedHardnessFilter !== 'All') {
      const hardness = selectedHardnessFilter;
      chips.push({
        key: `hardness-${hardness}`,
        label: `Hardness: ${hardness}`,
        onRemove: () => setSelectedHardnessFilter('All'),
      });
    }
    selectedTransparencyFilters.forEach((value) => {
      chips.push({
        key: `trans-${value}`,
        label: `Transparency: ${value}`,
        onRemove: () => removeTransparencyFilter(value),
      });
    });
    selectedOpticCharacters.forEach((value) => {
      chips.push({
        key: `optic-${value}`,
        label: `Optic: ${value}`,
        onRemove: () => removeOpticCharacter(value),
      });
    });
    selectedPleochroismFilters.forEach((value) => {
      chips.push({
        key: `pleochroism-${value}`,
        label: `Pleochroism: ${value}`,
        onRemove: () => removePleochroism(value),
      });
    });
    selectedOriginFilters.forEach((value) => {
      chips.push({
        key: `origin-${value}`,
        label: `Origin: ${value}`,
        onRemove: () => removeOrigin(value),
      });
    });
    return chips;
  }, [
    selectedColorFilters,
    selectedHardnessFilter,
    selectedTransparencyFilters,
    selectedOpticCharacters,
    selectedPleochroismFilters,
    selectedOriginFilters,
    removeColorFilter,
    removeTransparencyFilter,
    removeOpticCharacter,
    removePleochroism,
    removeOrigin,
  ]);

  const clearAllFilters = useCallback(() => {
    setSelectedColorFilters([]);
    setSelectedHardnessFilter('All');
    setSelectedTransparencyFilters([]);
    setSelectedOpticCharacters([]);
    setSelectedPleochroismFilters([]);
    setSelectedOriginFilters([]);
  }, []);

  const resetSortAndFilters = useCallback(() => {
    setSortOption('none');
    clearAllFilters();
  }, [clearAllFilters]);

  const hasActiveFilters = activeFiltersCount > 0;

  const filteredGems = useMemo(() => {
    const trimmedQuery = normalizeSearchText(searchQuery);
    const hasSearchQuery = trimmedQuery.length > 0;

    const computeRelevanceScore = (gem: Gemstone) => {
      if (!hasSearchQuery) {
        return 0;
      }

      const query = trimmedQuery;
      let score = 0;

      const normalized = (value?: string) => normalizeSearchText(value);
      const checkField = (value: string | undefined, weights: { exact?: number; startsWith?: number; includes?: number } = {}) => {
        const target = normalized(value);
        if (!target) return;
        if (target === query) {
          score += weights.exact ?? 0;
        } else if (target.startsWith(query)) {
          score += weights.startsWith ?? 0;
        } else if (target.includes(query)) {
          score += weights.includes ?? 0;
        }
      };

      checkField(gem.variety, { exact: 1000, startsWith: 600, includes: 400 });
      checkField(gem.indianName, { exact: 400, startsWith: 250, includes: 150 });
      checkField((gem as any)["Common Name"], { exact: 400, startsWith: 250, includes: 150 });
      checkField((gem as any).Species, { exact: 250, startsWith: 150, includes: 80 });

      const riString = `${gem.riMin || ""}-${gem.riMax || ""}`.toLowerCase();
      if (riString === query) score += 200;
      else if (riString.startsWith(query)) score += 120;
      else if (riString.includes(query)) score += 60;

      const sgString = `${gem.sgMin || ""}-${gem.sgMax || ""}`.toLowerCase();
      if (sgString === query) score += 150;
      else if (sgString.startsWith(query)) score += 90;
      else if (sgString.includes(query)) score += 45;

      (gem.colors || []).forEach((color) => {
        const lower = color.toLowerCase();
        if (lower === query) score += 120;
        else if (lower.startsWith(query)) score += 80;
        else if (lower.includes(query)) score += 40;
      });

      (gem.inclusions || []).forEach((incl) => {
        const lower = incl.toLowerCase();
        if (lower.includes(query)) score += 30;
      });

      checkField(gem.opticCharacter, { exact: 80, startsWith: 50, includes: 25 });
      checkField(gem.pleochroism, { exact: 80, startsWith: 50, includes: 25 });
      checkField(gem.luster, { exact: 60, startsWith: 35, includes: 20 });
      checkField(gem.chemicalComposition, { exact: 60, startsWith: 35, includes: 20 });

      (gem.transparency || []).forEach((trans) => {
        const lower = trans.toLowerCase();
        if (lower === query) score += 45;
        else if (lower.startsWith(query)) score += 25;
        else if (lower.includes(query)) score += 15;
      });

      return score;
    };

    const applySearchAndFilters = (gem: Gemstone) => {
      let matchesSearch = true;
      if (hasSearchQuery) {
        const searchableText = [
          gem.variety,
          gem.indianName,
          `${gem.riMin || 0}-${gem.riMax || 0}`,
          `${gem.sgMin || 0}-${gem.sgMax || 0}`,
          gem.pleochroism,
          gem.opticCharacter,
          gem.crystalSystem,
          gem.hardness?.toString(),
          gem.cleavage,
          gem.fracture,
          gem.luster,
          ...(gem.transparency || []),
          ...(gem.inclusions || []),
          gem.uvResponse,
          gem.causeOfColor,
          gem.chemicalComposition,
          ...(gem.colors || []),
          ...(gem.treatments || []),
          ...(gem.simulants || []),
          ...(gem.occurrences || []),
          gem.category,
          (gem as any).Title,
          (gem as any)["Common Name"],
          (gem as any).Species,
          (gem as any).Transparency,
          (gem as any).Dispersion,
          (gem as any)["Refractive Index"],
          (gem as any)["Optic Character"],
          (gem as any)["Polariscope Reaction"],
          (gem as any).Fluorescence,
          (gem as any).Pleochroism,
          (gem as any)["Specific Gravity"],
          (gem as any).Toughness,
          (gem as any).Luster,
          (gem as any).Stability,
          (gem as any)["Chemical Name"],
          (gem as any)["Chemical Formula"],
          (gem as any)["Crystal System"],
          (gem as any).Tag,
          JSON.stringify((gem as any).Colors || []),
          JSON.stringify((gem as any).Occurences || [])
        ]
          .map(normalizeSearchText)
          .filter(Boolean)
          .join(" ");

        matchesSearch = searchableText.includes(trimmedQuery);
      }

      const gemCategory = classifyGemCategory(gem);
      if (selectedCategory !== "All" && gemCategory !== selectedCategory) {
        return false;
      }

      if (selectedColorFilters.length > 0) {
        const gemColors = mergeNormalized(gem.colors, (gem as any).Colors);
        if (!matchesFilter(gemColors, selectedColorFilters, { partial: true })) {
          return false;
        }
      }

      if (selectedHardnessFilter !== 'All') {
        const numericHardness =
          parseNumericValue(gem.hardness) ??
          parseNumericValue((gem as any).Hardness);
        if (numericHardness == null) {
          return false;
        }
        if (selectedHardnessFilter === "< 6") {
          if (numericHardness >= 6) return false;
        } else if (selectedHardnessFilter === "6 – 7") {
          if (numericHardness < 6 || numericHardness >= 7) return false;
        } else if (selectedHardnessFilter === "7 – 8") {
          if (numericHardness < 7 || numericHardness >= 8) return false;
        } else if (selectedHardnessFilter === "8+") {
          if (numericHardness < 8) return false;
        } else {
          const parsed = parseFloat(selectedHardnessFilter);
          if (!isNaN(parsed) && Math.abs(numericHardness - parsed) > 0.5) return false;
        }
      }

      if (selectedTransparencyFilters.length > 0) {
        const transparencyValues = mergeNormalized(
          gem.transparency,
          (gem as any).Transparency
        );
        if (!matchesFilter(transparencyValues, selectedTransparencyFilters, { partial: true })) {
          return false;
        }
      }

      if (selectedOpticCharacters.length > 0) {
        const opticValues = mergeNormalized(
          gem.opticCharacter,
          (gem as any)["Optic Character"]
        );
        if (!matchesFilter(opticValues, selectedOpticCharacters)) {
          return false;
        }
      }

      if (selectedPleochroismFilters.length > 0) {
        const pleoValues = mergeNormalized(
          gem.pleochroism,
          (gem as any).Pleochroism
        );
        if (!matchesFilter(pleoValues, selectedPleochroismFilters, { partial: true })) {
          return false;
        }
      }

      if (selectedOriginFilters.length > 0) {
        const originValues = mergeNormalized(
          gem.occurrences,
          (gem as any).Occurences
        );
        if (!matchesFilter(originValues, selectedOriginFilters, { partial: true })) {
          return false;
        }
      }

      return matchesSearch;
    };

    const baseList = effectiveGems.filter(applySearchAndFilters);

    const normalizeName = (value?: string) => normalizeSearchText(value);

    const getAverage = (min?: number, max?: number) => {
      const safeMin = typeof min === 'number' ? min : 0;
      const safeMax = typeof max === 'number' ? max : safeMin;
      return (safeMin + safeMax) / 2;
    };

    const getPrimaryColor = (gem: Gemstone) =>
      gem.colors && gem.colors.length > 0 ? gem.colors[0].toLowerCase() : '';

    const compareBySelectedSort = (a: Gemstone, b: Gemstone) => {
      switch (sortOption) {
        case 'az':
          return (a.variety || '').localeCompare(b.variety || '', undefined, { sensitivity: 'base' });
        case 'za':
          return (b.variety || '').localeCompare(a.variety || '', undefined, { sensitivity: 'base' });
        case 'colorAz':
          return getPrimaryColor(a).localeCompare(getPrimaryColor(b));
        case 'colorZa':
          return getPrimaryColor(b).localeCompare(getPrimaryColor(a));
        case 'riHigh':
          return getAverage(b.riMin, b.riMax) - getAverage(a.riMin, a.riMax);
        case 'riLow':
          return getAverage(a.riMin, a.riMax) - getAverage(b.riMin, b.riMax);
        case 'hardnessHigh':
          return (b.hardness || 0) - (a.hardness || 0);
        case 'hardnessLow':
          return (a.hardness || 0) - (b.hardness || 0);
        case 'sgHigh':
          return getAverage(b.sgMin, b.sgMax) - getAverage(a.sgMin, a.sgMax);
        case 'sgLow':
          return getAverage(a.sgMin, a.sgMax) - getAverage(b.sgMin, b.sgMax);
        default:
          return 0;
      }
    };

    const categoryRank = (category: GemCategory) => {
      return getCategoryRank(category);
    };

    type GemMeta = {
      gem: Gemstone;
      index: number;
      category: ReturnType<typeof normalizeGemCategory>;
      categoryRank: number;
      nameExact: boolean;
      nameStartsWith: boolean;
      nameIncludes: boolean;
      relevance: number;
    };

    const metaList: GemMeta[] = baseList.map((gem, index) => {
      const category = normalizeGemCategory(gem);
      const names = [
        gem.variety,
        gem.indianName,
        (gem as any).Title,
        (gem as any)["Common Name"],
        (gem as any).name,
      ].map(normalizeName);

      const nameExact = hasSearchQuery && names.includes(trimmedQuery);
      const nameStartsWith =
        hasSearchQuery &&
        !nameExact &&
        names.some((name) => name.startsWith(trimmedQuery));
      const nameIncludes =
        hasSearchQuery &&
        !nameExact &&
        names.some((name) => name.includes(trimmedQuery));

      return {
        gem,
        index,
        category,
        categoryRank: categoryRank(category),
        nameExact,
        nameStartsWith,
        nameIncludes,
        relevance: hasSearchQuery ? computeRelevanceScore(gem) : 0,
      };
    });

    metaList.sort((a, b) => {
      // 1. If user selected a specific sort option, apply it first
      if (sortOption !== 'none') {
        const cmp = compareBySelectedSort(a.gem, b.gem);
        if (cmp !== 0) {
          return cmp;
        }
      }

      // 2. Exact match on search query
      if (hasSearchQuery) {
        if (a.nameExact !== b.nameExact) {
          return a.nameExact ? -1 : 1;
        }
      }

      // 3. Default ordering: Category Rank (Precious [0] -> Semi-precious [1] -> Organic [2] -> Others [3])
      if (a.categoryRank !== b.categoryRank) {
        return a.categoryRank - b.categoryRank;
      }

      // 4. Search query relevance
      if (hasSearchQuery) {
        if (a.relevance !== b.relevance) {
          return b.relevance - a.relevance;
        }

        if (a.nameStartsWith !== b.nameStartsWith) {
          return a.nameStartsWith ? -1 : 1;
        }

        if (a.nameIncludes !== b.nameIncludes) {
          return a.nameIncludes ? -1 : 1;
        }
      }

      // 5. Default within the same category: Alphabetical (A → Z)
      const nameA = (a.gem.variety || (a.gem as any).Title || "").toString();
      const nameB = (b.gem.variety || (b.gem as any).Title || "").toString();
      const nameCmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      if (nameCmp !== 0) {
        return nameCmp;
      }

      return a.index - b.index;
    });

    if (__DEV__ && hasSearchQuery) {
      // eslint-disable-next-line no-console
      console.log('[GemDatabase] sorted search results:', metaList.slice(0, 10).map((item) => ({
        variety: item.gem.variety,
        category: item.category,
        nameExact: item.nameExact,
        nameStartsWith: item.nameStartsWith,
        relevance: item.relevance,
      })));
    }

    return metaList.map((item) => item.gem);
  }, [
    effectiveGems,
    searchQuery,
    selectedCategory,
    selectedColorFilters,
    selectedHardnessFilter,
    selectedTransparencyFilters,
    selectedOpticCharacters,
    selectedPleochroismFilters,
    selectedOriginFilters,
    sortOption,
  ]);

  const paginatedGems = useMemo(
    () => filteredGems.slice(0, Math.max(visibleCount, filteredGems.length)),
    [filteredGems, visibleCount]
  );

  const hasMoreToShow = false;
  const totalAvailableCount = totalDatabaseCount > 0 ? totalDatabaseCount : allGems.length;
  const filteredGemCount = filteredGems.length;

  const filterSignature = useMemo(
    () =>
      [
        searchQuery,
        selectedCategory,
        sortOption,
        selectedColorFilters.join(","),
        selectedHardnessFilter,
        selectedTransparencyFilters.join(","),
        selectedOpticCharacters.join(","),
        selectedPleochroismFilters.join(","),
        selectedOriginFilters.join(","),
      ].join("|"),
    [
      searchQuery,
      selectedCategory,
      sortOption,
      selectedColorFilters,
      selectedHardnessFilter,
      selectedTransparencyFilters,
      selectedOpticCharacters,
      selectedPleochroismFilters,
      selectedOriginFilters,
    ]
  );

  const previousFilterSignatureRef = useRef(filterSignature);

  useEffect(() => {
    if (previousFilterSignatureRef.current === filterSignature) {
      return;
    }
    previousFilterSignatureRef.current = filterSignature;
    setVisibleCount(filteredGems.length);
  }, [filterSignature, filteredGems.length]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current || !hasMoreToShow) {
      console.log("⏳ Already loading more, skipping...");
      return;
    }

    const hasLocalMore = hasMoreToShow;
    const nearListEnd = paginatedGems.length >= Math.max(0, filteredGems.length - LOAD_TRIGGER_OFFSET);
    const shouldFetchNextPage = hasMorePages && nearListEnd;

    console.log("📊 Load more check:", {
      hasLocalMore,
      nearListEnd,
      shouldFetchNextPage,
      currentPage,
      hasMorePages,
      paginatedGemsLength: paginatedGems.length,
      filteredGemsLength: filteredGems.length,
      visibleCount
    });

    if (!hasLocalMore && !shouldFetchNextPage) {
      console.log("❌ No more to load");
      return;
    }

    isLoadingMoreRef.current = true;
    setIsFetchingMore(true);

    const loadMore = async () => {
      try {
        if (shouldFetchNextPage) {
          console.log("⬆️ Fetching page:", currentPage + 1);
          const newCount = await fetchGemstones(currentPage + 1);
          console.log("✅ Fetched", newCount, "new gemstones");
        }

        // Always increment visible count to show more items
        setVisibleCount((prev) => {
          const newCount = Math.min(filteredGems.length, prev + PAGE_SIZE);
          console.log("📈 Updating visible count from", prev, "to", newCount);
          return newCount;
        });
      } catch (error) {
        console.error("❌ Error in handleLoadMore:", error);
      } finally {
        setIsFetchingMore(false);
        isLoadingMoreRef.current = false;
      }
    };

    loadMore();
  }, [
    fetchGemstones,
    currentPage,
    filteredGems.length,
    hasMorePages,
    hasMoreToShow,
    paginatedGems.length,
    visibleCount,
  ]);

  // Store refs to access latest values without recreating callback
  const paginatedGemsRef = useRef(paginatedGems);
  const handleLoadMoreRef = useRef(handleLoadMore);

  useEffect(() => {
    paginatedGemsRef.current = paginatedGems;
  }, [paginatedGems]);

  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  // Keep callback stable to avoid "Changing onViewableItemsChanged on the fly" error
  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (paginatedGemsRef.current.length === 0 || isLoadingMoreRef.current) {
        return;
      }
      const triggerIndex = Math.max(0, paginatedGemsRef.current.length - LOAD_TRIGGER_OFFSET);
      const reachedTrigger = viewableItems.some(
        (item) => typeof item.index === "number" && item.index >= triggerIndex
      );
      if (reachedTrigger) {
        handleLoadMoreRef.current();
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;


  const renderGemItem = ({ item, index }: { item: Gemstone; index: number }) => {
    // Calculate average price
    const avgPriceINR = item.priceRangeINR.min > 0 && item.priceRangeINR.max > 0
      ? Math.round((item.priceRangeINR.min + item.priceRangeINR.max) / 2)
      : 0;

    const handleItemPress = () => {
      if (isRestrictedUser) {
        if (pendingRequest?.status === "Pending") {
          if (Platform.OS === "web") {
            window.alert("Your request is currently in review. Admins can approve your role in Settings -> Pending Users.");
          } else {
            Alert.alert(
              "Access Pending Approval",
              "Your request is currently in review. Admins can approve your role in Settings -> Pending Users."
            );
          }
        } else {
          setShowRequestForm(true);
        }
        return;
      }
      setSelectedGem(item);
    };

    if (viewMode === 'list') {
      return (
        <Pressable
          onPress={handleItemPress}
          style={({ pressed }) => [
            styles.listItemWrapper,
            { opacity: isRestrictedUser ? 0.9 : pressed ? 0.8 : 1 }
          ]}
        >
          <View style={[styles.listItem, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
            {/* Left side - Image */}
            <View style={styles.listItemImageContainer}>
              {item.image ? (
                <ExpoImage
                  source={{ uri: getOptimizedThumbnailUrl(item.image, 160) }}
                  style={styles.listItemImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  priority={index < 8 ? "high" : "normal"}
                  recyclingKey={item.id}
                />
              ) : (
                <View
                  style={[
                    styles.listItemImagePlaceholder,
                    { backgroundColor: getGemColor(item.colors?.[0]) + "20" }
                  ]}
                />
              )}
            </View>

            {/* Middle - Gem Info */}
            <View style={styles.listItemInfo}>
              <View style={styles.listItemHeader}>
                <ThemedText type="h4" style={styles.listItemName}>{item.variety}</ThemedText>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: getCategoryBadgeColor(item.category, theme)
                    }
                  ]}
                >
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: '600' }}>
                    {item.category}
                  </ThemedText>
                </View>
              </View>
              {item.indianName && (
                <ThemedText type="caption" style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
                  {item.indianName}
                </ThemedText>
              )}
            </View>
          </View>
        </Pressable>
      );
    }

    // Current card view - exactly as it is now (unchanged)

    return (
      <Pressable
        key={`${item.id}-${item.image}`}
        onPress={handleItemPress}
        style={({ pressed }) => [
          styles.gemCardWrapper,
          { opacity: isRestrictedUser ? 0.9 : pressed ? 0.8 : 1 }
        ]}
      >
        <Card style={styles.gemCard} elevation={2}>
          <View style={styles.gemCardContent}>
            {/* Thumbnail Section */}
            <View style={styles.thumbnailContainer}>
              {item.image && item.image.trim() ? (
                <ExpoImage
                  source={{ uri: getOptimizedThumbnailUrl(item.image, 240) }}
                  style={styles.gemThumbnail}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                  priority={index < 8 ? "high" : "normal"}
                  recyclingKey={item.id}
                  placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
                  placeholderContentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.gemThumbnail,
                    styles.gemThumbnailPlaceholder,
                    { backgroundColor: theme.backgroundSecondary }
                  ]}
                >
                  <Feather name="image" size={32} color={theme.textSecondary} />
                </View>
              )}
            </View>

            {/* Content Section */}
            <View style={styles.gemInfo}>
              {/* Header */}
              <View style={styles.gemHeader}>
                <View style={styles.gemTitleContainer}>
                  <ThemedText type="h4" style={styles.gemTitle}>
                    {item.variety}
                  </ThemedText>
                  <ThemedText type="caption" style={[styles.gemSubtitle, { color: theme.primary }]}>
                    {item.indianName}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </View>

              {/* Optical Properties */}
              <View style={styles.opticalSection}>
                <View style={styles.opticalRow}>
                  <View style={styles.opticalItem}>
                    <ThemedText type="caption" style={styles.opticalLabel}>
                      OPTIC:
                    </ThemedText>
                    <ThemedText type="caption" style={styles.opticalValue}>
                      {item.opticCharacter || "N/A"}
                    </ThemedText>
                  </View>
                  <View style={styles.opticalDivider} />
                  <View style={styles.opticalItem}>
                    <ThemedText type="caption" style={styles.opticalLabel}>
                      PLEO:
                    </ThemedText>
                    <ThemedText type="caption" style={styles.opticalValue} numberOfLines={1}>
                      {item.pleochroism ? item.pleochroism.toUpperCase().substring(0, 12) + (item.pleochroism.length > 12 ? "..." : "") : "NONE"}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Properties Row */}
              <View style={styles.propertiesRow}>
                <View style={[styles.propertyBadge, { backgroundColor: theme.primary + "15" }]}>
                  <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                    RI
                  </ThemedText>
                  <ThemedText type="caption" style={[styles.propertyValue, { color: theme.primary }]}>
                    {item.riMin > 0 && item.riMax > 0
                      ? `${item.riMin.toFixed(3)}-${item.riMax.toFixed(3)}`
                      : "N/A"}
                  </ThemedText>
                </View>
                <View style={[styles.propertyBadge, { backgroundColor: theme.success + "15" }]}>
                  <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                    SG
                  </ThemedText>
                  <ThemedText type="caption" style={[styles.propertyValue, { color: theme.success }]}>
                    {item.sgMin > 0 && item.sgMax > 0
                      ? `${item.sgMin.toFixed(2)}-${item.sgMax.toFixed(2)}`
                      : "N/A"}
                  </ThemedText>
                </View>
              </View>

              {/* Search Filter Capsules - Only show when search is active */}
              {searchQuery.trim() && (
                <View style={styles.searchFilterCapsules}>
                  {item.colors && item.colors.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase())) ? (
                    <View style={[styles.filterCapsule, { backgroundColor: theme.primary + "20" }]}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: getGemColor(item.colors.find((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase()))) }
                        ]}
                      />
                      <ThemedText type="caption" style={[styles.filterCapsuleText, { color: theme.primary, marginLeft: 4 }]}>
                        Color
                      </ThemedText>
                    </View>
                  ) : null}
                  {((item as any).Fluorescence || item.uvResponse) &&
                    ((item as any).Fluorescence || item.uvResponse).toLowerCase().includes(searchQuery.toLowerCase()) ? (
                    <View style={[styles.filterCapsule, { backgroundColor: "#F59E0B20" }]}>
                      <Feather name="zap" size={14} color="#F59E0B" />
                      <ThemedText type="caption" style={[styles.filterCapsuleText, { color: "#F59E0B", marginLeft: 4 }]}>
                        UV
                      </ThemedText>
                    </View>
                  ) : null}
                  {item.hardness && item.hardness.toString().includes(searchQuery) ? (
                    <View style={[styles.filterCapsule, { backgroundColor: theme.secondary + "20" }]}>
                      <ThemedText type="caption" style={[styles.filterCapsuleText, { color: theme.secondary }]}>
                        {item.hardness.toString()}
                      </ThemedText>
                    </View>
                  ) : null}
                  {(item as any).Tag && (item as any).Tag.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                    <View style={[styles.filterCapsule, { backgroundColor: theme.success + "20" }]}>
                      <ThemedText type="caption" style={[styles.filterCapsuleText, { color: theme.success }]}>
                        {(item as any).Tag}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Category Badge Overlay - Bottom Left */}
          <View style={[
            styles.categoryBadgeOverlay,
            {
              backgroundColor: getCategoryBadgeColor(item.category, theme)
            }
          ]}>
            <ThemedText
              type="caption"
              style={{
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.5
              }}
            >
              {item.category.toUpperCase()}
            </ThemedText>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.searchContainer, { paddingTop: Platform.OS === 'web' ? Spacing.sm : 50 + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
          {/* Header with title and view toggle */}
          <View style={styles.headerContainer}>
            <ThemedText type="h1" style={styles.headerTitle}>Gems</ThemedText>
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => navigation.navigate('GemComparison' as never)}
                style={[styles.compareButton, { backgroundColor: theme.secondary }]}
              >
                <Feather
                  name="git-branch"
                  size={16}
                  color="#FFFFFF"
                />
                <ThemedText
                  type="caption"
                  style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600", marginLeft: 4 }}
                >
                  Compare
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                style={[styles.viewToggleButton, { backgroundColor: '#c484ffff' }]}
              >
                <Feather
                  name={viewMode === 'card' ? 'list' : 'grid'}
                  size={18}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>

          <View style={[styles.searchBar, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
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
                onPress={() => {
                  setSelectedCategory(category);
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selectedCategory === category
                      ? theme.primary
                      : theme.backgroundSecondary,
                    borderColor: selectedCategory === category
                      ? theme.primary
                      : theme.border,
                  }
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedCategory === category ? "#FFFFFF" : theme.text,
                    fontWeight: selectedCategory === category ? "700" : "500"
                  }}
                >
                  {category}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.statsRow}>
            {/* <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}> */}
            <ThemedText type="small" style={[styles.statLabel, { color: theme.textSecondary }]}>
              Total Stones:
            </ThemedText>
            <ThemedText type="small" style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>
              {totalAvailableCount}
            </ThemedText>
            {/* </View> */}
            {/* <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}> */}
            <ThemedText type="small" style={[styles.statLabel, { color: theme.textSecondary }]}>
              Showing:
            </ThemedText>
            <ThemedText type="small" style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>
              {filteredGemCount}
            </ThemedText>
            {/* </View> */}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => setShowSortOptions(true)}
              style={({ pressed }) => [
                styles.sortButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              <Feather name="sliders" size={16} color="#FFFFFF" />
              <ThemedText type="caption" style={styles.sortButtonText}>
                Sort{hasActiveFilters ? ` (${activeFiltersCount})` : ""}
              </ThemedText>
            </Pressable>
          </View>

        </View>

        <View style={styles.listSectionWrapper}>
          <FlatList
            data={paginatedGems}
            keyExtractor={item => item.id}
            renderItem={renderGemItem}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS !== "web"}
            scrollEnabled={!isRestrictedUser}
            style={[
              styles.flatListStyle,
              isRestrictedUser && styles.blurredFlatListStyle,
            ]}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: (paddingBottom || 0) + 80 },
              isRestrictedUser && styles.blurredListContent,
            ]}
            scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
            refreshing={isLoadingGems || isSearching}
            onRefresh={loadGemstones}
            onEndReachedThreshold={0.1}
            onEndReached={searchQuery.trim() || isRestrictedUser ? undefined : handleLoadMore}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={handleViewableItemsChanged}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                {isLoadingGems ? (
                  <>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                      Loading gemstones...
                    </ThemedText>
                  </>
                ) : isSearching ? (
                  <>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                      Searching gemstones...
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <Feather name="search" size={48} color={theme.textSecondary} />
                    <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                      No gemstones found
                    </ThemedText>
                  </>
                )}
              </View>
            )}
            ListFooterComponent={
              isFetchingMore && !isLoadingGems ? (
                <View style={styles.paginationLoader}>
                  <ActivityIndicator color={theme.primary} />
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    Loading more gemstones...
                  </ThemedText>
                </View>
              ) : null
            }
          />

          {/* Floating Glassmorphic Access Request Overlay for Restricted Users */}
          {isRestrictedUser && (
            <View style={styles.accessOverlayWrapper} pointerEvents="box-none">
              <View
                style={[
                  styles.accessOverlayCard,
                  {
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.94)" : "rgba(255, 255, 255, 0.96)",
                    borderColor: isDark ? "rgba(139, 92, 246, 0.45)" : "rgba(139, 92, 246, 0.35)",
                  },
                ]}
              >
                {pendingRequest?.status === "Pending" && !showRequestForm ? (
                  // STATE 1: PENDING APPROVAL
                  <View style={styles.overlayStateContent}>
                    <View style={[styles.overlayIconCircle, { backgroundColor: "#F59E0B22" }]}>
                      <Feather name="clock" size={30} color="#F59E0B" />
                    </View>

                    <View style={[styles.pendingBadgeHeader, { backgroundColor: "#F59E0B20" }]}>
                      <ThemedText type="caption" style={[styles.pendingBadgeHeaderText, { color: "#F59E0B" }]}>
                        ⏳ REQUEST UNDER REVIEW
                      </ThemedText>
                    </View>

                    <ThemedText type="h3" style={[styles.overlayTitle, { color: theme.text }]}>
                      Access Pending Approval
                    </ThemedText>

                    <ThemedText type="small" style={[styles.overlaySubtitle, { color: theme.textSecondary }]}>
                      Your request to unlock the gemstone database as a{" "}
                      <ThemedText type="small" style={{ color: theme.primary, fontWeight: "700" }}>
                        {pendingRequest.requested_role}
                      </ThemedText>{" "}
                      has been sent to the Administrator.
                    </ThemedText>

                    <View style={[styles.pendingDetailsBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <View style={styles.detailItemRow}>
                        <Feather name="mail" size={13} color={theme.textSecondary} />
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                          Account: <ThemedText type="caption" style={{ color: theme.text, fontWeight: "600" }}>{user?.email}</ThemedText>
                        </ThemedText>
                      </View>

                      <View style={[styles.detailItemRow, { marginTop: 6 }]}>
                        <Feather name="award" size={13} color={theme.textSecondary} />
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                          Requested Role: <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>{pendingRequest.requested_role}</ThemedText>
                        </ThemedText>
                      </View>

                      <View style={[styles.detailItemRow, { marginTop: 6 }]}>
                        <Feather name="shield" size={13} color={theme.textSecondary} />
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                          Approval Location: <ThemedText type="caption" style={{ color: theme.text, fontWeight: "600" }}>Settings → Pending Users</ThemedText>
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.overlayActionRow}>
                      <Pressable
                        onPress={async () => {
                          await loadUserRoleAndAccess();
                          if (Platform.OS === "web") {
                            window.alert("Checked status. Once approved by the administrator, database will unlock immediately.");
                          } else {
                            Alert.alert("Status Checked", "Once approved by the administrator, the database will unlock immediately.");
                          }
                        }}
                        style={({ pressed }) => [
                          styles.primaryActionButton,
                          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Feather name="rotate-cw" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <ThemedText type="small" style={styles.primaryActionButtonText}>
                          Check Status / Refresh
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => setShowRequestForm(true)}
                        style={({ pressed }) => [
                          styles.secondaryActionButton,
                          { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                          Change Role Request
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  // STATE 2: REQUEST ACCESS FORM
                  <View style={styles.overlayStateContent}>
                    <View style={[styles.overlayIconCircle, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="lock" size={28} color={theme.primary} />
                    </View>

                    <View style={[styles.pendingBadgeHeader, { backgroundColor: theme.primary + "15" }]}>
                      <ThemedText type="caption" style={[styles.pendingBadgeHeaderText, { color: theme.primary }]}>
                        🔒 RESTRICTED PREVIEW
                      </ThemedText>
                    </View>

                    <ThemedText type="h3" style={[styles.overlayTitle, { color: theme.text }]}>
                      Request Database Access
                    </ThemedText>

                    <ThemedText type="small" style={[styles.overlaySubtitle, { color: theme.textSecondary }]}>
                      Select your desired role to send an access request to the Administrator for approval.
                    </ThemedText>

                    {/* Role Selection Cards */}
                    <View style={styles.roleSelectionContainer}>
                      <Pressable
                        onPress={() => setRequestedRoleSelection("Student")}
                        style={[
                          styles.roleSelectCard,
                          {
                            backgroundColor: requestedRoleSelection === "Student" ? theme.primary + "15" : theme.backgroundSecondary,
                            borderColor: requestedRoleSelection === "Student" ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <View style={styles.roleSelectCardHeader}>
                          <ThemedText type="body" style={{ fontWeight: "700", color: requestedRoleSelection === "Student" ? theme.primary : theme.text }}>
                            🎓 Student / Gemologist
                          </ThemedText>
                          {requestedRoleSelection === "Student" && (
                            <Feather name="check-circle" size={15} color={theme.primary} />
                          )}
                        </View>
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 3 }}>
                          View 500+ gemstones, optical data, test workflows & custom specimens.
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => setRequestedRoleSelection("Curator")}
                        style={[
                          styles.roleSelectCard,
                          {
                            backgroundColor: requestedRoleSelection === "Curator" ? theme.primary + "15" : theme.backgroundSecondary,
                            borderColor: requestedRoleSelection === "Curator" ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <View style={styles.roleSelectCardHeader}>
                          <ThemedText type="body" style={{ fontWeight: "700", color: requestedRoleSelection === "Curator" ? theme.primary : theme.text }}>
                            🔬 Curator / Professional
                          </ThemedText>
                          {requestedRoleSelection === "Curator" && (
                            <Feather name="check-circle" size={15} color={theme.primary} />
                          )}
                        </View>
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 3 }}>
                          Full access + edit verified gemstone specs & approve student submissions.
                        </ThemedText>
                      </Pressable>
                    </View>

                    {/* Note Input */}
                    <TextInput
                      style={[
                        styles.accessReasonInput,
                        {
                          backgroundColor: theme.inputBackground,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Optional note for Admin (e.g., student, researcher)..."
                      placeholderTextColor={theme.textSecondary}
                      value={accessRequestReason}
                      onChangeText={setAccessRequestReason}
                      maxLength={120}
                    />

                    <View style={styles.overlayActionRow}>
                      <Pressable
                        onPress={handleSendAccessRequest}
                        disabled={isSubmittingAccessRequest}
                        style={({ pressed }) => [
                          styles.primaryActionButton,
                          { backgroundColor: theme.primary, opacity: pressed || isSubmittingAccessRequest ? 0.85 : 1 },
                        ]}
                      >
                        {isSubmittingAccessRequest ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Feather name="send" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <ThemedText type="small" style={styles.primaryActionButtonText}>
                              Send Access Request 🚀
                            </ThemedText>
                          </>
                        )}
                      </Pressable>

                      {pendingRequest?.status === "Pending" && (
                        <Pressable
                          onPress={() => setShowRequestForm(false)}
                          style={({ pressed }) => [
                            styles.secondaryActionButton,
                            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                            Cancel
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        <Modal
          visible={showSortOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSortOptions(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowSortOptions(false)}>
            <View style={styles.sortModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.sortSheet, { backgroundColor: theme.backgroundDefault }]}>
                  {/* Modal Header */}
                  <View style={styles.sortSheetHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                      <ThemedText type="h3" style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>
                        Sort & Filter
                      </ThemedText>
                      {(hasActiveFilters || sortOption !== "none") && (
                        <View style={[styles.filterActiveBadge, { backgroundColor: theme.primary }]}>
                          <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 11 }}>
                            {activeFiltersCount + (sortOption !== "none" ? 1 : 0)} active
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <Pressable onPress={() => setShowSortOptions(false)} style={styles.sortCloseButton}>
                      <Feather name="x" size={18} color={theme.text} />
                    </Pressable>
                  </View>

                  {/* Segmented Tab Switcher */}
                  <View style={[styles.modalTabContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <Pressable
                      onPress={() => setModalTab("sort")}
                      style={[
                        styles.modalTabButton,
                        modalTab === "sort" && { backgroundColor: theme.primary }
                      ]}
                    >
                      <Feather name="sliders" size={14} color={modalTab === "sort" ? "#FFFFFF" : theme.textSecondary} />
                      <ThemedText
                        type="small"
                        style={{
                          color: modalTab === "sort" ? "#FFFFFF" : theme.textSecondary,
                          fontWeight: modalTab === "sort" ? "700" : "500",
                          marginLeft: 6
                        }}
                      >
                        Sort Options
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => setModalTab("filters")}
                      style={[
                        styles.modalTabButton,
                        modalTab === "filters" && { backgroundColor: theme.primary }
                      ]}
                    >
                      <Feather name="filter" size={14} color={modalTab === "filters" ? "#FFFFFF" : theme.textSecondary} />
                      <ThemedText
                        type="small"
                        style={{
                          color: modalTab === "filters" ? "#FFFFFF" : theme.textSecondary,
                          fontWeight: modalTab === "filters" ? "700" : "500",
                          marginLeft: 6
                        }}
                      >
                        Filter Options {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* Tab Contents */}
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScrollArea}>
                    {modalTab === "sort" ? (
                      /* Sort Tab Content */
                      <View style={styles.sortGridContainer}>
                        {SORT_OPTIONS.map((option) => {
                          const isActive = sortOption === option.key;
                          return (
                            <Pressable
                              key={option.key}
                              onPress={() => setSortOption(option.key)}
                              style={({ pressed }) => [
                                styles.sortGridCard,
                                {
                                  backgroundColor: isActive ? theme.primary + "15" : theme.backgroundSecondary,
                                  borderColor: isActive ? theme.primary : theme.border,
                                  borderWidth: isActive ? 1.5 : 1,
                                  opacity: pressed ? 0.85 : 1,
                                }
                              ]}
                            >
                              <View style={[styles.sortIconCircle, { backgroundColor: isActive ? theme.primary : theme.primary + "18" }]}>
                                <Feather name={option.icon} size={15} color={isActive ? "#FFFFFF" : theme.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <ThemedText
                                  type="body"
                                  style={{
                                    color: isActive ? theme.primary : theme.text,
                                    fontWeight: isActive ? "700" : "600",
                                    fontSize: 13.5
                                  }}
                                >
                                  {option.label}
                                </ThemedText>
                                <ThemedText
                                  type="caption"
                                  style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}
                                  numberOfLines={1}
                                >
                                  {option.hint}
                                </ThemedText>
                              </View>
                              {isActive && (
                                <View style={[styles.sortCheckBadge, { backgroundColor: theme.primary }]}>
                                  <Feather name="check" size={12} color="#FFFFFF" />
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      /* Filter Tab Content */
                      <View style={{ gap: Spacing.lg, paddingBottom: Spacing.md }}>
                        {/* Colors Filter */}
                        <View style={styles.filterBlock}>
                          <View style={styles.filterBlockHeader}>
                            <Feather name="droplet" size={14} color={theme.primary} />
                            <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                              Colors {selectedColorFilters.length > 0 ? `(${selectedColorFilters.length})` : ""}
                            </ThemedText>
                          </View>
                          <View style={styles.filterPillsWrap}>
                            {availableColorOptions.map((color) => {
                              const isSelected = selectedColorFilters.includes(color);
                              const colorDot = getGemColor(color);
                              return (
                                <Pressable
                                  key={color}
                                  onPress={() => toggleColorFilter(color)}
                                  style={[
                                    styles.filterColorPill,
                                    {
                                      backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundSecondary,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 1.5 : 1,
                                    }
                                  ]}
                                >
                                  <View style={[styles.filterColorDot, { backgroundColor: colorDot }]} />
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: isSelected ? theme.primary : theme.text,
                                      fontWeight: isSelected ? "700" : "500",
                                      fontSize: 12
                                    }}
                                  >
                                    {color}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Hardness Filter */}
                        <View style={styles.filterBlock}>
                          <View style={styles.filterBlockHeader}>
                            <Feather name="shield" size={14} color={theme.primary} />
                            <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                              Hardness (Mohs Scale)
                            </ThemedText>
                          </View>
                          <View style={styles.filterPillsWrap}>
                            {HARDNESS_FILTER_OPTIONS.map((option) => {
                              const isSelected = selectedHardnessFilter === option.key;
                              return (
                                <Pressable
                                  key={option.key}
                                  onPress={() => setSelectedHardnessFilter(option.key)}
                                  style={[
                                    styles.filterChipPill,
                                    {
                                      backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 1.5 : 1,
                                    }
                                  ]}
                                >
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: isSelected ? "#FFFFFF" : theme.text,
                                      fontWeight: isSelected ? "700" : "500",
                                      fontSize: 12.5
                                    }}
                                  >
                                    {option.label}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Transparency Filter */}
                        <View style={styles.filterBlock}>
                          <View style={styles.filterBlockHeader}>
                            <Feather name="sun" size={14} color={theme.primary} />
                            <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                              Transparency
                            </ThemedText>
                          </View>
                          <View style={styles.filterPillsWrap}>
                            {availableTransparencyOptions.map((transparency) => {
                              const isSelected = selectedTransparencyFilters.includes(transparency);
                              return (
                                <Pressable
                                  key={transparency}
                                  onPress={() => toggleTransparencyFilter(transparency)}
                                  style={[
                                    styles.filterChipPill,
                                    {
                                      backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 1.5 : 1,
                                    }
                                  ]}
                                >
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: isSelected ? "#FFFFFF" : theme.text,
                                      fontWeight: isSelected ? "700" : "500",
                                      fontSize: 12
                                    }}
                                  >
                                    {transparency}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Optic Character */}
                        <View style={styles.filterBlock}>
                          <View style={styles.filterBlockHeader}>
                            <Feather name="disc" size={14} color={theme.primary} />
                            <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                              Optic Character
                            </ThemedText>
                          </View>
                          <View style={styles.filterPillsWrap}>
                            {availableOpticCharacterOptions.map((opticChar) => {
                              const isSelected = selectedOpticCharacters.includes(opticChar);
                              return (
                                <Pressable
                                  key={opticChar}
                                  onPress={() => toggleOpticCharacter(opticChar)}
                                  style={[
                                    styles.filterChipPill,
                                    {
                                      backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 1.5 : 1,
                                    }
                                  ]}
                                >
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: isSelected ? "#FFFFFF" : theme.text,
                                      fontWeight: isSelected ? "700" : "500",
                                      fontSize: 12
                                    }}
                                  >
                                    {opticChar}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Pleochroism */}
                        <View style={styles.filterBlock}>
                          <View style={styles.filterBlockHeader}>
                            <Feather name="eye" size={14} color={theme.primary} />
                            <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                              Pleochroism
                            </ThemedText>
                          </View>
                          <View style={styles.filterPillsWrap}>
                            {availablePleochroismOptions.map((pleo) => {
                              const isSelected = selectedPleochroismFilters.includes(pleo);
                              return (
                                <Pressable
                                  key={pleo}
                                  onPress={() => togglePleochroism(pleo)}
                                  style={[
                                    styles.filterChipPill,
                                    {
                                      backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                      borderColor: isSelected ? theme.primary : theme.border,
                                      borderWidth: isSelected ? 1.5 : 1,
                                    }
                                  ]}
                                >
                                  <ThemedText
                                    type="caption"
                                    style={{
                                      color: isSelected ? "#FFFFFF" : theme.text,
                                      fontWeight: isSelected ? "700" : "500",
                                      fontSize: 12
                                    }}
                                  >
                                    {pleo}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Origin / Location */}
                        {availableOriginOptions.length > 0 && (
                          <View style={styles.filterBlock}>
                            <View style={styles.filterBlockHeader}>
                              <Feather name="map-pin" size={14} color={theme.primary} />
                              <ThemedText type="small" style={[styles.filterBlockTitle, { color: theme.text }]}>
                                Mining Origin / Countries
                              </ThemedText>
                            </View>
                            <View style={styles.filterPillsWrap}>
                              {availableOriginOptions.slice(0, 30).map((origin) => {
                                const isSelected = selectedOriginFilters.includes(origin);
                                return (
                                  <Pressable
                                    key={origin}
                                    onPress={() => toggleOrigin(origin)}
                                    style={[
                                      styles.filterChipPill,
                                      {
                                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                        borderColor: isSelected ? theme.primary : theme.border,
                                        borderWidth: isSelected ? 1.5 : 1,
                                      }
                                    ]}
                                  >
                                    <ThemedText
                                      type="caption"
                                      style={{
                                        color: isSelected ? "#FFFFFF" : theme.text,
                                        fontWeight: isSelected ? "700" : "500",
                                        fontSize: 12
                                      }}
                                    >
                                      {origin}
                                    </ThemedText>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>

                  {/* Sticky Footer */}
                  <View style={[styles.sortModalFooter, { borderTopColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
                    <Pressable
                      onPress={resetSortAndFilters}
                      style={({ pressed }) => [
                        styles.modalResetButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.backgroundSecondary,
                          opacity: (hasActiveFilters || sortOption !== "none") ? (pressed ? 0.7 : 1) : 0.4
                        }
                      ]}
                      disabled={!hasActiveFilters && sortOption === "none"}
                    >
                      <Feather name="rotate-ccw" size={14} color={theme.textSecondary} />
                      <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: 6 }}>
                        Reset
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowSortOptions(false)}
                      style={({ pressed }) => [
                        styles.modalApplyButton,
                        {
                          backgroundColor: theme.primary,
                          opacity: pressed ? 0.85 : 1
                        }
                      ]}
                    >
                      <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                        Apply ({filteredGemCount} Gems)
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Floating Action Button - Only show for authorized non-restricted users */}
        {!isRestrictedUser && (
          <Pressable
            onPress={() => setShowAddStoneModal(true)}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              }
            ]}
          >
            <Feather name="plus" size={28} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <Modal
        visible={selectedGem !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGem(null)}
      >
        {selectedGem ? (
          <ThemedView style={[styles.modalContainer, { backgroundColor: isDark ? '#0B0F19' : theme.backgroundDefault }]}>
            {/* Enhanced Header with Frosted Glassmorphism */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border, backgroundColor: isDark ? '#0F172A' : theme.backgroundDefault }]}>
              <Pressable
                onPress={() => setSelectedGem(null)}
                style={({ pressed }) => [
                  styles.backButton,
                  { backgroundColor: isDark ? '#1E293B' : theme.backgroundSecondary, opacity: pressed ? 0.6 : 1 }
                ]}
              >
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center', marginHorizontal: Spacing.sm }}>
                <ThemedText type="h4" style={{ fontWeight: '800', letterSpacing: -0.3 }}>
                  {selectedGem.variety}
                </ThemedText>
                {selectedGem.indianName ? (
                  <ThemedText type="caption" style={{ color: theme.primary, marginTop: 1, fontWeight: '700', fontSize: 12 }}>
                    {selectedGem.indianName}
                  </ThemedText>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {/* Check if this is an editable gemstone */}
                {(() => {
                  const canManage =
                    userRole === "Admin" ||
                    userRole === "Curator" ||
                    (userRole === "Student" && selectedGem.user_id === user?.id);

                  const hasDatabaseBacking =
                    customStones.some(stone => stone.id === selectedGem.id) ||
                    selectedGem.id.startsWith('custom-') ||
                    Boolean(selectedGem.user_id);

                  return selectedGem.id && canManage && hasDatabaseBacking;
                })() && (
                    <>
                      <Pressable
                        onPress={() => {
                          setSelectedGem(null);
                          setEditingGemstone(selectedGem);
                          setShowAddStoneModal(true);
                        }}
                        style={({ pressed }) => [
                          styles.backButton,
                          { backgroundColor: theme.primary + "20", opacity: pressed ? 0.6 : 1 }
                        ]}
                      >
                        <Feather name="edit-2" size={18} color={theme.primary} />
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          if (!selectedGem.id) return;

                          const confirmed = await confirmDeleteGem(selectedGem.variety);
                          if (!confirmed) return;

                          const deletion = await deleteCustomGemstone(selectedGem.id);

                          if (!deletion.success) {
                            showInfoAlert("Error", deletion.error || "Failed to delete gemstone");
                            return;
                          }

                          try {
                            const storedStones = await AsyncStorage.getItem("customStones");
                            if (storedStones) {
                              const stones = JSON.parse(storedStones);
                              const updated = stones.filter((stone: any) => stone.id !== selectedGem.id);
                              await AsyncStorage.setItem("customStones", JSON.stringify(updated));
                              setCustomStones(prev => prev.filter(stone => stone.id !== selectedGem.id));
                            }
                          } catch (storageError) {
                            console.log("Error removing from AsyncStorage:", storageError);
                          }

                          await loadGemstones();
                          setSelectedGem(null);
                          showInfoAlert("Success", "Gemstone deleted successfully.");
                        }}
                        style={({ pressed }) => [
                          styles.backButton,
                          { backgroundColor: DANGER_COLOR + "20", opacity: pressed ? 0.6 : 1 }
                        ]}
                      >
                        <Feather name="trash-2" size={18} color={DANGER_COLOR} />
                      </Pressable>
                    </>
                  )}
              </View>
            </View>

            {/* Segmented Pill Tab Switcher */}
            <View style={[styles.tabContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : theme.border, backgroundColor: isDark ? '#0B0F19' : theme.backgroundDefault }]}>
              <View style={[styles.tabPillWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                {(["properties", "formation", "testing"] as const).map(tab => {
                  const isCurrent = activeTab === tab;
                  const tabTitles: Record<string, string> = {
                    properties: "Properties",
                    formation: "Formation",
                    testing: "Testing",
                  };
                  const tabIcons: Record<string, any> = {
                    properties: "sliders",
                    formation: "globe",
                    testing: "check-circle",
                  };
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.tabPill,
                        isCurrent && [
                          styles.tabPillActive,
                          { backgroundColor: isDark ? '#334155' : '#FFFFFF' }
                        ]
                      ]}
                    >
                      <Feather
                        name={tabIcons[tab]}
                        size={13}
                        color={isCurrent ? theme.primary : theme.textSecondary}
                        style={{ marginRight: 5 }}
                      />
                      <ThemedText
                        type="small"
                        style={[
                          styles.tabPillText,
                          {
                            color: isCurrent ? (isDark ? '#FFFFFF' : theme.primary) : theme.textSecondary,
                            fontWeight: isCurrent ? "700" : "500",
                          }
                        ]}
                      >
                        {tabTitles[tab]}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ScrollView
              style={styles.tabContent}
              contentContainerStyle={styles.tabContentInner}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === "properties" && (
                <>
                  {/* Hero Gemstone Luxury Showcase Card */}
                  <Card style={[styles.heroCardContainer, { backgroundColor: isDark ? '#111827' : theme.backgroundDefault, borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : theme.border }]}>
                    <View style={styles.heroCardContent}>
                      {selectedGem.image ? (
                        <Pressable
                          onPress={() => openPreview(selectedGem.image!, selectedGem.variety)}
                          style={({ pressed }) => [
                            styles.heroImageWrapper,
                            { opacity: pressed ? 0.92 : 1 }
                          ]}
                        >
                          <View style={styles.heroImageStage}>
                            <ExpoImage
                              source={{ uri: selectedGem.image }}
                              style={styles.heroMainImage}
                              contentFit="contain"
                              transition={300}
                            />
                          </View>

                          {/* Floating Category Pill on top-left */}
                          <View
                            style={[
                              styles.heroFloatingCategory,
                              {
                                backgroundColor: getCategoryBadgeColor(selectedGem.category, theme),
                                shadowColor: getCategoryBadgeColor(selectedGem.category, theme),
                              }
                            ]}
                          >
                            <Feather name="award" size={12} color="#FFFFFF" />
                            <Text style={styles.heroFloatingCategoryText}>
                              {selectedGem.category.toUpperCase()}
                            </Text>
                          </View>

                          {/* Floating Hardness on top-right */}
                          {selectedGem.hardness > 0 && (
                            <View style={styles.heroFloatingHardness}>
                              <Feather name="shield" size={12} color="#F59E0B" />
                              <Text style={styles.heroFloatingHardnessText}>
                                {selectedGem.hardness} Mohs
                              </Text>
                            </View>
                          )}

                          {/* Floating Zoom Button on bottom-right */}
                          <View style={styles.heroZoomBadge}>
                            <Feather name="maximize-2" size={11} color="#FFFFFF" />
                            <Text style={styles.heroZoomText}>Zoom</Text>
                          </View>
                        </Pressable>
                      ) : null}

                      {/* Title & Identity Information */}
                      <View style={styles.heroCardInfo}>
                        <View style={styles.heroTitleRow}>
                          <Text style={[styles.heroCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                            {selectedGem.variety}
                          </Text>
                          {selectedGem.indianName ? (
                            <View style={[styles.indianNameBadge, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)', borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.25)' }]}>
                              <Feather name="bookmark" size={12} color={isDark ? "#818CF8" : theme.primary} />
                              <Text style={[styles.indianNameText, { color: isDark ? '#818CF8' : theme.primary }]}>
                                {selectedGem.indianName}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Subtitle with Species and Formula */}
                        <Text style={[styles.heroSubtitle, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>
                          {((selectedGem as any).Species || (selectedGem.variety === "Alexandrite" ? "Chrysoberyl" : "")) + " Species"}
                          {(selectedGem.chemicalComposition || (selectedGem as any)["Chemical Formula"]) ? ` • ${selectedGem.chemicalComposition || (selectedGem as any)["Chemical Formula"]}` : ""}
                        </Text>

                        {/* Luxury Attribute Micro-Pills */}
                        <View style={styles.heroAttributeGrid}>
                          {/* Species Pill */}
                          <View style={[styles.heroAttributePill, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                            <View style={[styles.heroAttrIconPod, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                              <Feather name="layers" size={12} color="#818CF8" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.heroAttrLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>SPECIES</Text>
                              <Text numberOfLines={1} style={[styles.heroAttrVal, { color: isDark ? '#FFFFFF' : theme.text }]}>
                                {(selectedGem as any).Species || (selectedGem.variety === "Alexandrite" ? "Chrysoberyl" : "Gemstone")}
                              </Text>
                            </View>
                          </View>

                          {/* Crystal System */}
                          <View style={[styles.heroAttributePill, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                            <View style={[styles.heroAttrIconPod, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                              <Feather name="disc" size={12} color="#34D399" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.heroAttrLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>CRYSTAL</Text>
                              <Text numberOfLines={1} style={[styles.heroAttrVal, { color: isDark ? '#FFFFFF' : theme.text }]}>
                                {(selectedGem as any)["Crystal System"] || selectedGem.crystalSystem || "Orthorhombic"}
                              </Text>
                            </View>
                          </View>

                          {/* Optic Character */}
                          <View style={[styles.heroAttributePill, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                            <View style={[styles.heroAttrIconPod, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                              <Feather name="eye" size={12} color="#FBBF24" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.heroAttrLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>OPTICS</Text>
                              <Text numberOfLines={1} style={[styles.heroAttrVal, { color: isDark ? '#FFFFFF' : theme.text }]}>
                                {selectedGem.opticCharacter?.includes("DR") ? "DR (Biaxial)" : (selectedGem.opticCharacter || "Biaxial")}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </Card>

                  {/* Key Properties 3-Metric Matrix */}
                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="zap" size={14} color={theme.primary} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        KEY PROPERTIES
                      </ThemedText>
                    </View>
                    <View style={styles.propertyGrid3}>
                      {/* Refractive Index */}
                      <View style={[styles.propertyCardItem, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF', borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE' }]}>
                        <View style={[styles.propertyIconBadgeCircle, { backgroundColor: '#6366F1' }]}>
                          <Feather name="eye" size={14} color="#FFFFFF" />
                        </View>
                        <ThemedText type="caption" style={[styles.propertyMetricLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>
                          Refractive Index (RI)
                        </ThemedText>
                        <ThemedText type="h4" style={[styles.propertyMetricValue, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                          {selectedGem.riMin && selectedGem.riMax ? `${selectedGem.riMin} - ${selectedGem.riMax}` : (selectedGem.riMin || (selectedGem as any)["Refractive Index"] || "1.746 - 1.755")}
                        </ThemedText>
                      </View>

                      {/* Specific Gravity */}
                      <View style={[styles.propertyCardItem, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0' }]}>
                        <View style={[styles.propertyIconBadgeCircle, { backgroundColor: '#10B981' }]}>
                          <Feather name="activity" size={14} color="#FFFFFF" />
                        </View>
                        <ThemedText type="caption" style={[styles.propertyMetricLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>
                          Specific Gravity (SG)
                        </ThemedText>
                        <ThemedText type="h4" style={[styles.propertyMetricValue, { color: isDark ? '#6EE7B7' : '#059669' }]}>
                          {selectedGem.sgMin && selectedGem.sgMax ? `${selectedGem.sgMin} - ${selectedGem.sgMax}` : (selectedGem.sgMin || (selectedGem as any)["Specific Gravity"] || "3.71 - 3.75")}
                        </ThemedText>
                      </View>

                      {/* Hardness */}
                      <View style={[styles.propertyCardItem, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A' }]}>
                        <View style={[styles.propertyIconBadgeCircle, { backgroundColor: '#F59E0B' }]}>
                          <Feather name="shield" size={14} color="#FFFFFF" />
                        </View>
                        <ThemedText type="caption" style={[styles.propertyMetricLabel, { color: isDark ? '#94A3B8' : theme.textSecondary }]}>
                          Hardness
                        </ThemedText>
                        <ThemedText type="h4" style={[styles.propertyMetricValue, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                          {selectedGem.hardness ? `${selectedGem.hardness} Mohs` : "8.5 Mohs"}
                        </ThemedText>
                      </View>
                    </View>
                  </Card>

                  {/* Typical Inclusions & Characteristics */}
                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="search" size={14} color={theme.primary} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        TYPICAL INCLUSIONS & CHARACTERISTICS
                      </ThemedText>
                    </View>

                    {(() => {
                      const rawInclusions = selectedGem.inclusions || [];
                      if (rawInclusions.length === 0) {
                        return (
                          <ThemedText type="body" style={{ color: theme.textSecondary, fontStyle: "italic", padding: Spacing.xs }}>
                            No typical inclusions recorded
                          </ThemedText>
                        );
                      }

                      // Split lines or items
                      const allLines: string[] = [];
                      rawInclusions.forEach(item => {
                        if (!item) return;
                        const parts = item.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
                        parts.forEach(p => allLines.push(p));
                      });

                      // Check if any line mentions clarity type
                      const clarityNote = allLines.find(l => /type\s+[iIvVxX]+\s+clarity/i.test(l) || /clarity stone/i.test(l));

                      return (
                        <View style={styles.inclusionsListContainer}>
                          {clarityNote ? (
                            <View style={[styles.clarityCallout, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)', borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)' }]}>
                              <Feather name="info" size={15} color={theme.primary} style={{ marginTop: 2, marginRight: 8 }} />
                              <ThemedText type="body" style={[styles.clarityCalloutText, { color: isDark ? '#E2E8F0' : theme.text }]}>
                                {formatInclusionSentence(clarityNote)}
                              </ThemedText>
                            </View>
                          ) : null}

                          <View style={styles.inclusionsPillsWrapper}>
                            {allLines.filter(l => l !== clarityNote).map((line, idx) => {
                              const cleanText = formatInclusionSentence(line);
                              return (
                                <View
                                  key={idx}
                                  style={[
                                    styles.inclusionItemCard,
                                    {
                                      backgroundColor: isDark ? '#334155' : '#F8FAFC',
                                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border,
                                    },
                                  ]}
                                >
                                  <View style={[styles.inclusionBulletWrapper, { backgroundColor: theme.primary + "20" }]}>
                                    <Feather name="disc" size={9} color={theme.primary} />
                                  </View>
                                  <ThemedText
                                    type="body"
                                    style={[
                                      styles.inclusionTextClean,
                                      { color: isDark ? '#FFFFFF' : theme.text },
                                    ]}
                                  >
                                    {cleanText}
                                  </ThemedText>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })()}
                  </Card>

                  {/* Inclusion Images Card */}
                  {selectedGem.inclusionImages && selectedGem.inclusionImages.length > 0 && (
                    <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                          <Feather name="image" size={14} color={theme.primary} />
                        </View>
                        <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                          INCLUSION REFERENCE PHOTOS
                        </ThemedText>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.inclusionImagesContainer}
                      >
                        {selectedGem.inclusionImages.map((imgUrl, idx) => {
                          const label = `Inclusion ${idx + 1}`;
                          const isLoading = imageLoadStates[imgUrl];
                          return (
                            <Pressable
                              key={`${imgUrl}-${idx}`}
                              onPress={() => openPreview(imgUrl, label)}
                              style={({ pressed }) => [
                                styles.inclusionImageWrapper,
                                {
                                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.border,
                                  opacity: pressed ? 0.85 : 1,
                                },
                              ]}
                            >
                              <ExpoImage
                                source={{ uri: imgUrl }}
                                style={styles.inclusionImage}
                                contentFit="cover"
                                transition={200}
                                onLoadStart={() => handleImageLoadStart(imgUrl)}
                                onLoadEnd={() => handleImageLoadEnd(imgUrl)}
                              />
                              {isLoading && (
                                <View style={styles.inclusionImageLoader}>
                                  <ActivityIndicator color={theme.primary} size="small" />
                                </View>
                              )}
                              <View style={[styles.imageLabel, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : theme.backgroundSecondary }]}>
                                <ThemedText type="caption" style={{ color: isDark ? '#FFFFFF' : theme.textSecondary, fontSize: 11, fontWeight: '700' }}>
                                  {label}
                                </ThemedText>
                              </View>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </Card>
                  )}

                  {/* Colors Palette Card */}
                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.secondary + "20" }]}>
                        <Feather name="droplet" size={14} color={theme.secondary} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        COLORS
                      </ThemedText>
                    </View>
                    <View style={styles.colorChipContainer}>
                      {(() => {
                        const rawColors = selectedGem.colors || [];
                        const splitColors: string[] = [];
                        rawColors.forEach(c => {
                          if (!c) return;
                          c.split(/[,;\n]/).forEach(part => {
                            const trimmed = part.trim();
                            if (trimmed) splitColors.push(trimmed);
                          });
                        });
                        const uniqueColors = Array.from(new Set(splitColors));

                        return uniqueColors.length > 0 ? (
                          uniqueColors.map((color, idx) => {
                            const swatchColor = getGemColor(color);
                            return (
                              <View
                                key={`${color}-${idx}`}
                                style={[
                                  styles.colorChip,
                                  {
                                    backgroundColor: isDark ? '#334155' : theme.backgroundSecondary,
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                                  }
                                ]}
                              >
                                <View
                                  style={[
                                    styles.colorIndicator,
                                    {
                                      backgroundColor: swatchColor,
                                      shadowColor: swatchColor,
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.5,
                                      shadowRadius: 3,
                                    }
                                  ]}
                                />
                                <ThemedText type="small" style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text, fontSize: 13.5 }}>
                                  {color}
                                </ThemedText>
                              </View>
                            );
                          })
                        ) : (
                          <ThemedText type="body" style={{ color: theme.textSecondary, fontStyle: "italic" }}>
                            No colors specified
                          </ThemedText>
                        );
                      })()}
                    </View>
                  </Card>

                  {/* Spectroscope Image Card */}
                  {selectedGem.spectroscopeImages && selectedGem.spectroscopeImages.length > 0 && (
                    <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                          <Feather name="activity" size={14} color={theme.primary} />
                        </View>
                        <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                          SPECTROSCOPE IMAGE
                        </ThemedText>
                      </View>
                      {(() => {
                        const imgUrl = selectedGem.spectroscopeImages?.[0];
                        if (!imgUrl) {
                          return null;
                        }
                        const isLoading = imageLoadStates[imgUrl];
                        return (
                          <Pressable
                            onPress={() => openPreview(imgUrl, "Spectroscope Image")}
                            style={({ pressed }) => [
                              styles.spectroscopeImageWrapper,
                              {
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : theme.border,
                                backgroundColor: isDark ? '#0F172A' : theme.backgroundSecondary,
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <ExpoImage
                              source={{ uri: imgUrl }}
                              style={styles.spectroscopeImage}
                              contentFit="contain"
                              transition={200}
                              onLoadStart={() => handleImageLoadStart(imgUrl)}
                              onLoadEnd={() => handleImageLoadEnd(imgUrl)}
                            />
                            {isLoading && (
                              <View style={styles.inclusionImageLoader}>
                                <ActivityIndicator color={theme.primary} size="small" />
                              </View>
                            )}
                          </Pressable>
                        );
                      })()}
                    </Card>
                  )}

                  {/* Detailed Properties Table */}
                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="sliders" size={14} color={theme.primary} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        DETAILED PROPERTIES
                      </ThemedText>
                    </View>
                    <View style={styles.detailedPropertiesTable}>
                      <DataRow label="Title" value={(selectedGem as any).Title || selectedGem.variety} />
                      <DataRow label="Common Name" value={(selectedGem as any)["Common Name"] || selectedGem.indianName || selectedGem.variety} />
                      <DataRow label="Species" value={(selectedGem as any).Species || (selectedGem.variety === "Alexandrite" ? "Chrysoberyl" : undefined)} />
                      <DataRow label="Transparency" value={Array.isArray(selectedGem.transparency) ? selectedGem.transparency.join(", ") : ((selectedGem as any).Transparency || (selectedGem.transparency as any))} />
                      <DataRow label="Dispersion" value={(selectedGem as any).Dispersion || (selectedGem.variety === "Alexandrite" ? "Weak Fire Value: 0.015" : undefined)} />
                      <DataRow label="Optic Character" value={(selectedGem as any)["Optic Character"] || selectedGem.opticCharacter} />
                      <DataRow label="Polariscope Reaction" value={(selectedGem as any)["Polariscope Reaction"] || (selectedGem.opticCharacter?.includes("DR") ? "Doubly Refractive (DR)" : undefined)} />
                      <DataRow label="Fluorescence" value={(selectedGem as any).Fluorescence || selectedGem.uvResponse} />
                      <DataRow label="Pleochroism" value={(selectedGem as any).Pleochroism || selectedGem.pleochroism} />
                      <DataRow label="Toughness" value={(selectedGem as any).Toughness || (selectedGem.variety === "Alexandrite" ? "Varies" : undefined)} />
                      <DataRow label="Luster" value={(selectedGem as any).Luster || selectedGem.luster} />
                      <DataRow label="Stability" value={(selectedGem as any).Stability || (selectedGem.variety === "Alexandrite" ? "Very Good" : undefined)} />
                      <DataRow label="Chemical Name" value={(selectedGem as any)["Chemical Name"] || (selectedGem.variety === "Alexandrite" ? "beryllium aluminum oxide" : undefined)} />
                      <DataRow label="Chemical Formula" value={(selectedGem as any)["Chemical Formula"] || selectedGem.chemicalComposition} />
                      <DataRow label="Crystal System" value={(selectedGem as any)["Crystal System"] || selectedGem.crystalSystem} />
                      <DataRow label="Tag" value={(selectedGem as any).Tag || selectedGem.category} />
                    </View>
                  </Card>
                </>
              )}

              {activeTab === "formation" && (
                <>
                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                        <Feather name="layers" size={14} color={theme.primary} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        GEOLOGICAL FORMATION
                      </ThemedText>
                    </View>
                    <View style={[styles.formationTextContainer, { borderLeftColor: theme.primary, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#F8FAFC' }]}>
                      <ThemedText type="body" style={{ lineHeight: 24, color: isDark ? '#F1F5F9' : theme.text, fontSize: 14.5 }}>
                        {selectedGem.formation || (selectedGem.variety === "Alexandrite" ? "Forms in pegmatites and mica schists where beryllium and chromium occur together (rare geological conditions)." : "No geological formation details recorded for this gemstone.")}
                      </ThemedText>
                    </View>
                  </Card>

                  <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.success + "20" }]}>
                        <Feather name="map-pin" size={14} color={theme.success} />
                      </View>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                        GLOBAL OCCURRENCES
                      </ThemedText>
                    </View>
                    {selectedGem.occurrences && selectedGem.occurrences.length > 0 ? (
                      <View style={styles.locationsContainer}>
                        {selectedGem.occurrences.map((occurrence: string, idx: number) => (
                          <View
                            key={idx}
                            style={[
                              styles.locationRow,
                              { backgroundColor: isDark ? '#334155' : theme.backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border, borderWidth: 1 }
                            ]}
                          >
                            <View style={[styles.locationPinBadge, { backgroundColor: theme.success + "25" }]}>
                              <Feather name="map-pin" size={13} color={theme.success} />
                            </View>
                            <ThemedText type="body" style={{ color: isDark ? '#FFFFFF' : theme.text, flex: 1, fontWeight: '600', fontSize: 14 }}>
                              {occurrence}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ThemedText type="body" style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                        No occurrences recorded
                      </ThemedText>
                    )}
                  </Card>
                </>
              )}

              {activeTab === "testing" && (
                <Card style={[styles.propertyCard, { backgroundColor: isDark ? '#1E293B' : theme.backgroundDefault, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.cardHeaderIconBadge, { backgroundColor: theme.primary + "20" }]}>
                      <Feather name="check-circle" size={14} color={theme.primary} />
                    </View>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                      IDENTIFICATION & TESTING GUIDE
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ marginBottom: Spacing.lg, color: theme.textSecondary, lineHeight: 22, fontSize: 13.5 }}>
                    Follow these systematic testing steps to accurately identify and verify this gemstone:
                  </ThemedText>
                  {selectedGem.testingGuide && selectedGem.testingGuide.length > 0 ? (
                    selectedGem.testingGuide.map((step, idx) => (
                      <View key={idx} style={styles.testStep}>
                        <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                          <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
                            {String(idx + 1).padStart(2, '0')}
                          </ThemedText>
                        </View>
                        <View style={[styles.stepContent, { backgroundColor: isDark ? '#334155' : theme.backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.08)' : theme.border, borderWidth: 1 }]}>
                          <ThemedText type="body" style={[styles.stepText, { color: isDark ? '#FFFFFF' : theme.text, lineHeight: 22, fontWeight: '500' }]}>
                            {step}
                          </ThemedText>
                        </View>
                      </View>
                    ))
                  ) : (
                    <ThemedText type="body" style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                      No testing guide steps recorded.
                    </ThemedText>
                  )}
                </Card>
              )}
            </ScrollView>
          </ThemedView>
        ) : null}
      </Modal>

      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={closePreview}
      >
        <TouchableWithoutFeedback onPress={closePreview}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.previewCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <Pressable
                  onPress={closePreview}
                  style={({ pressed }) => [
                    styles.previewClose,
                    {
                      backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Feather name="x" size={20} color={theme.text} />
                </Pressable>
                {previewImage && (
                  <ScrollView
                    style={styles.previewScroll}
                    contentContainerStyle={styles.previewScrollContent}
                    minimumZoomScale={1}
                    maximumZoomScale={3}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  >
                    <View style={styles.previewImageContainer}>
                      <ExpoImage
                        source={{ uri: previewImage.uri }}
                        style={styles.previewImage}
                        contentFit="contain"
                        transition={200}
                        onLoadStart={() => handleImageLoadStart(previewImage.uri)}
                        onLoadEnd={() => handleImageLoadEnd(previewImage.uri)}
                      />
                      {imageLoadStates[previewImage.uri] && (
                        <View style={styles.previewLoader}>
                          <ActivityIndicator color={theme.primary} size="large" />
                        </View>
                      )}
                    </View>
                    <ThemedText type="caption" style={[styles.previewLabel, { color: theme.textSecondary }]}>
                      {previewImage.label}
                    </ThemedText>
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



      <AddStoneModal
        visible={showAddStoneModal}
        editingGemstone={editingGemstone}
        isUpdatingGemstone={isUpdatingGemstone}
        onClose={() => {
          setShowAddStoneModal(false);
          setEditingGemstone(null);
        }}
        onSave={async (stoneData) => {
          try {
            // Helper function to save locally with progress
            const saveLocally = async () => {
              // Upload images with progress tracking
              let stoneImageUrl = stoneData.images?.stoneImages?.[0];
              let inclusionImageUrls = stoneData.images?.inclusionImages || [];
              let spectroscopeImageUrls = (stoneData.images?.spectroscopeImages || []).slice(0, 1);

              // Upload stone image if it's a local URI
              if (stoneImageUrl && stoneImageUrl.startsWith("file://")) {
                try {
                  stoneImageUrl = await uploadGemstoneImage(stoneImageUrl, "stone");
                } catch (error) {
                  console.error("Failed to upload stone image:", error);
                  stoneImageUrl = null;
                }
              }

              // Upload inclusion images if they are local URIs
              const uploadedInclusionUrls: string[] = [];
              for (const uri of inclusionImageUrls) {
                if (uri.startsWith("file://")) {
                  try {
                    const uploadedUrl = await uploadGemstoneImage(uri, "inclusion");
                    if (uploadedUrl) {
                      uploadedInclusionUrls.push(uploadedUrl);
                    }
                  } catch (error) {
                    console.error("Failed to upload inclusion image:", error);
                  }
                } else {
                  uploadedInclusionUrls.push(uri);
                }
              }

              const uploadedSpectroscopeUrls: string[] = [];
              for (const uri of spectroscopeImageUrls) {
                if (uri.startsWith("file://")) {
                  try {
                    const uploadedUrl = await uploadGemstoneImage(uri, "spectroscope");
                    if (uploadedUrl) {
                      uploadedSpectroscopeUrls.push(uploadedUrl);
                    }
                  } catch (error) {
                    console.error("Failed to upload spectroscope image:", error);
                  }
                } else {
                  uploadedSpectroscopeUrls.push(uri);
                }
              }

              // Convert the form data to Gemstone format
              const newStone: Gemstone = {
                id: `custom-${Date.now()}`,
                variety: stoneData["Title"] || stoneData["Common Name"] || "Unknown",
                chemicalComposition: stoneData["Chemical Formula"],
                crystalSystem: stoneData["Crystal System"],
                colors: stoneData["Colors"],
                causeOfColor: stoneData["Species"],
                transparency: stoneData["Transparency"] ? [stoneData["Transparency"]] : [],
                luster: stoneData["Luster"],
                hardness: parseFloat(stoneData["Hardness"]) || 0,
                sgMin: parseFloat(stoneData["Specific Gravity"]?.split('-')[0]?.trim()) || parseFloat(stoneData["Specific Gravity"]) || 0,
                sgMax: parseFloat(stoneData["Specific Gravity"]?.split('-')[1]?.trim()) || parseFloat(stoneData["Specific Gravity"]) || 0,
                riMin: parseFloat(stoneData["Refractive Index"]?.split('-')[0]?.trim()) || parseFloat(stoneData["Refractive Index"]) || 0,
                riMax: parseFloat(stoneData["Refractive Index"]?.split('-')[1]?.trim()) || parseFloat(stoneData["Refractive Index"]) || 0,
                cleavage: "",
                fracture: "",
                opticCharacter: stoneData["Optic Character"],
                pleochroism: stoneData["Pleochroism"],
                inclusions: stoneData["Inclusions"] ? [stoneData["Inclusions"]] : [],
                uvResponse: stoneData["Fluorescence"],
                simulants: [],
                treatments: [],
                occurrences: stoneData["Occurences"],
                indianName: "",
                category: stoneData["Tag"] || "Semi-precious",
                priceRangeINR: { min: 0, max: 0 },
                priceRangeUSD: { min: 0, max: 0 },
                formation: "",
                testingGuide: [],
                marketDemand: "Medium",
                image: stoneImageUrl,
                inclusionImages: uploadedInclusionUrls,
                spectroscopeImages: uploadedSpectroscopeUrls.slice(0, 1),
              };

              const updatedStones = [...customStones, newStone];
              setCustomStones(updatedStones);
              await AsyncStorage.setItem('customStones', JSON.stringify(updatedStones));
              setShowAddStoneModal(false);
            };

            // Convert to CustomGemstone format with all fields
            const customGem: CustomGemstone = {
              "Title": stoneData["Title"],
              "Common Name": stoneData["Common Name"],
              "Species": stoneData["Species"],
              "Transparency": stoneData["Transparency"],
              "Dispersion": stoneData["Dispersion"],
              "Refractive Index": stoneData["Refractive Index"],
              "Optic Character": stoneData["Optic Character"],
              "Polariscope Reaction": stoneData["Polariscope Reaction"],
              "Fluorescence": stoneData["Fluorescence"],
              "Pleochroism": stoneData["Pleochroism"],
              "Hardness": stoneData["Hardness"],
              "Specific Gravity": stoneData["Specific Gravity"],
              "Toughness": stoneData["Toughness"],
              "Inclusions": stoneData["Inclusions"],
              "Luster": stoneData["Luster"],
              "Stability": stoneData["Stability"],
              "Chemical Name": stoneData["Chemical Name"],
              "Chemical Formula": stoneData["Chemical Formula"],
              "Crystal System": stoneData["Crystal System"],
              "Colors": stoneData["Colors"],
              "Occurences": stoneData["Occurences"],
              "Tag": stoneData["Tag"],
              images: {
                stoneImages: stoneData.images?.stoneImages || [],
                inclusionImages: stoneData.images?.inclusionImages || [],
                spectroscopeImages: (stoneData.images?.spectroscopeImages || []).slice(0, 1),
              },
            };

            // Check if user is authenticated
            if (!user) {
              // User not authenticated - save locally and inform them
              await saveLocally();
              Alert.alert(
                'Saved Locally',
                'This gemstone has been saved locally on your device. Sign in from the Business Hub to enable cloud sync and access your gemstones across devices.',
                [{ text: 'OK' }]
              );
              return;
            }

            // User is authenticated - try to save/update to Supabase
            let result;
            if (editingGemstone && editingGemstone.id) {
              setIsUpdatingGemstone(true);
              try {
                const result = await updateCustomGemstone(editingGemstone.id, customGem);

                if (result?.success) {
                  await loadGemstones();
                  Alert.alert('Success', 'Gemstone updated successfully!');
                  setShowAddStoneModal(false);
                  setEditingGemstone(null);
                  if (selectedGem?.id === editingGemstone.id) {
                    setSelectedGem(null);
                  }
                  return;
                } else {
                  Alert.alert('Error', result?.error || 'Failed to update gemstone. Please try again.');
                }
              } catch (error) {
                console.error('Update error:', error);
                Alert.alert('Error', 'Failed to update gemstone. Please try again.');
              } finally {
                setIsUpdatingGemstone(false);
              }
            } else {
              // Create new gemstone
              result = await saveCustomGemstone(customGem);
              if (result?.success) {
                // Reload gemstones from Supabase only if not pending review
                if (!result.needsReview) {
                  await loadGemstones();
                }

                Alert.alert('Success', (result as any).message || 'Custom stone added successfully to the cloud!');
                setShowAddStoneModal(false);
                setEditingGemstone(null);
                return;
              }
            }

            if (!result?.success) {
              // Supabase save failed - offer to save locally
              Alert.alert(
                'Cloud Save Failed',
                result?.error || 'Failed to save to cloud. Would you like to save locally instead?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Save Locally',
                    onPress: async () => {
                      await saveLocally();
                    },
                  },
                ]
              );
            }
          } catch (error) {
            console.error('Error saving custom stone:', error);
            Alert.alert('Error', 'Failed to save custom stone. Please try again.');
          }
        }}
      />
    </>
  );
}

// Add Stone Modal Component
interface StoneFormData {
  "Title": string;
  "Common Name": string;
  "Species": string;
  "Transparency": string;
  "Dispersion": string;
  "Refractive Index": string;
  "Optic Character": string;
  "Polariscope Reaction": string;
  "Fluorescence": string;
  "Pleochroism": string;
  "Hardness": string;
  "Specific Gravity": string;
  "Toughness": string;
  "Inclusions": string;
  "Luster": string;
  "Stability": string;
  "Chemical Name": string;
  "Chemical Formula": string;
  "Crystal System": string;
  "Colors": string[];
  "Occurences": string[];
  "Tag": string;
  images: {
    stoneImages: string[];
    inclusionImages: string[];
    spectroscopeImages: string[];
  };
}

function AddStoneModal({
  visible,
  editingGemstone,
  onClose,
  onSave,
  isUpdatingGemstone,
}: {
  visible: boolean;
  editingGemstone?: Gemstone | null;
  onClose: () => void;
  onSave: (stoneData: any) => Promise<void>;
  isUpdatingGemstone?: boolean;
}) {
  const { theme } = getThemeSafe();

  // Initialize form data from editingGemstone if provided
  const ensureArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val
        .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
        .filter(Boolean);
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return [];

      let current = trimmed;
      // Keep unwrapping JSON strings until we get to the actual array
      while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
        try {
          const parsed = JSON.parse(current);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) =>
                typeof item === "string" ? item.trim() : String(item).trim()
              )
              .filter(Boolean);
          }
          current = parsed;
        } catch {
          break;
        }
      }

      // If not JSON, split by comma/semicolon
      return trimmed
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getStringValue = (...values: any[]): string => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };

  const parseImagesField = (
    value: any
  ): { stoneImages: string[]; inclusionImages: string[]; spectroscopeImages: string[] } => {
    if (!value) {
      return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return {
          stoneImages: Array.isArray(parsed?.stoneImages) ? parsed.stoneImages : [],
          inclusionImages: Array.isArray(parsed?.inclusionImages)
            ? parsed.inclusionImages
            : [],
          spectroscopeImages: Array.isArray(parsed?.spectroscopeImages)
            ? parsed.spectroscopeImages
            : [],
        };
      } catch {
        return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
      }
    }
    return {
      stoneImages: Array.isArray(value.stoneImages) ? value.stoneImages : [],
      inclusionImages: Array.isArray(value.inclusionImages) ? value.inclusionImages : [],
      spectroscopeImages: Array.isArray(value.spectroscopeImages) ? value.spectroscopeImages : [],
    };
  };

  const getInitialFormData = (): StoneFormData => {
    if (editingGemstone) {
      const gem = editingGemstone as any;
      const parsedImages = parseImagesField(gem.images ?? (editingGemstone as any).images);
      const stoneImages = parsedImages.stoneImages.length
        ? parsedImages.stoneImages
        : editingGemstone.image
          ? [editingGemstone.image]
          : [];
      const inclusionImages = parsedImages.inclusionImages.length
        ? parsedImages.inclusionImages
        : editingGemstone.inclusionImages || [];
      const originalSpectroscopeImages = parsedImages.spectroscopeImages.length
        ? parsedImages.spectroscopeImages
        : (editingGemstone as any).spectroscopeImages || [];
      const spectroscopeImages = Array.isArray(originalSpectroscopeImages)
        ? originalSpectroscopeImages.filter(Boolean).slice(0, 1)
        : [];

      return {
        "Title": gem["Title"] || editingGemstone.variety || "",
        "Common Name": gem["Common Name"] || editingGemstone.variety || "",
        "Species": gem["Species"] || editingGemstone.causeOfColor || "",
        "Transparency": getStringValue(gem["Transparency"], editingGemstone.transparency?.[0]),
        "Dispersion": getStringValue(gem["Dispersion"], gem["dispersion"]),
        "Refractive Index": gem["Refractive Index"] || (editingGemstone.riMin && editingGemstone.riMax ? `${editingGemstone.riMin}-${editingGemstone.riMax}` : ""),
        "Optic Character": getStringValue(gem["Optic Character"], editingGemstone.opticCharacter),
        "Polariscope Reaction": getStringValue(gem["Polariscope Reaction"], editingGemstone.opticCharacter),
        "Fluorescence": gem["Fluorescence"] || editingGemstone.uvResponse || "",
        "Pleochroism": gem["Pleochroism"] || editingGemstone.pleochroism || "",
        "Hardness": getStringValue(gem["Hardness"], String(editingGemstone.hardness || "")),
        "Specific Gravity": getStringValue(
          gem["Specific Gravity"],
          gem["specific gravity"],
          editingGemstone.sgMin && editingGemstone.sgMax
            ? `${editingGemstone.sgMin}-${editingGemstone.sgMax}`
            : undefined
        ),
        "Toughness": getStringValue(gem["Toughness"], gem["toughness"], editingGemstone.toughness),
        "Inclusions": gem["Inclusions"] || editingGemstone.inclusions?.join(", ") || "",
        "Luster": gem["Luster"] || editingGemstone.luster || "",
        "Stability": gem["Stability"] || "",
        "Chemical Name": gem["Chemical Name"] || "",
        "Chemical Formula": gem["Chemical Formula"] || editingGemstone.chemicalComposition || "",
        "Crystal System": gem["Crystal System"] || editingGemstone.crystalSystem || "",
        "Colors": ensureArray(gem["Colors"] || editingGemstone.colors),
        "Occurences": ensureArray(gem["Occurences"] || editingGemstone.occurrences),
        "Tag": gem["Tag"] || editingGemstone.category || "Semi-precious",
        images: {
          stoneImages,
          inclusionImages,
          spectroscopeImages,
        },
      };
    }
    // Default empty form
    return {
      "Title": "",
      "Common Name": "",
      "Species": "",
      "Transparency": "",
      "Dispersion": "",
      "Refractive Index": "",
      "Optic Character": "",
      "Polariscope Reaction": "",
      "Fluorescence": "",
      "Pleochroism": "",
      "Hardness": "",
      "Specific Gravity": "",
      "Toughness": "",
      "Inclusions": "",
      "Luster": "",
      "Stability": "",
      "Chemical Name": "",
      "Chemical Formula": "",
      "Crystal System": "",
      "Colors": [],
      "Occurences": [],
      "Tag": "",
      images: {
        stoneImages: [],
        inclusionImages: [],
        spectroscopeImages: [],
      },
    };
  };

  // Initialize form data - use function to avoid calling on every render
  const [formData, setFormData] = useState<StoneFormData>(() => getInitialFormData());
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Reset form when editingGemstone or visible changes
  useEffect(() => {
    if (visible) {
      setFormData(getInitialFormData());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editingGemstone?.id, editingGemstone?.variety]);

  const pickStoneImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add images');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.3, // Compress to 0.3 quality
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!res.canceled && res.assets?.length) {
      const uri = res.assets[0].uri;
      console.log("🖼️ Stone image selected:", uri);
      setFormData({
        ...formData,
        images: {
          ...formData.images,
          stoneImages: [uri]
        }
      });
    }
  };

  const removeStoneImage = (index: number) => {
    setFormData({
      ...formData,
      images: {
        ...formData.images,
        stoneImages: formData.images.stoneImages.filter((_, i) => i !== index)
      }
    });
  };

  const removeInclusionImage = (index: number) => {
    setFormData({
      ...formData,
      images: {
        ...formData.images,
        inclusionImages: formData.images.inclusionImages.filter((_, i) => i !== index)
      }
    });
  };

  const removeSpectroscopeImage = () => {
    setFormData({
      ...formData,
      images: {
        ...formData.images,
        spectroscopeImages: [],
      },
    });
  };

  const pickInclusionImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add images');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.3, // Compress to 0.3 quality
      allowsMultipleSelection: true,
    });
    if (!res.canceled && res.assets?.length) {
      const uris = res.assets.map(asset => asset.uri);
      console.log("🖼️ Inclusion images selected:", uris);
      setFormData({
        ...formData,
        images: {
          ...formData.images,
          inclusionImages: [...formData.images.inclusionImages, ...uris]
        }
      });
    }
  };

  const pickSpectroscopeImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add images');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsMultipleSelection: false,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      const uri = res.assets[0].uri;
      console.log("🖼️ Spectroscope image selected:", uri);
      setFormData({
        ...formData,
        images: {
          ...formData.images,
          spectroscopeImages: [uri],
        },
      });
    }
  };

  // Progress-aware upload wrapper
  async function uploadWithProgress(localUri: string, folder: 'stone' | 'inclusion' | 'spectroscope'): Promise<string | null> {
    const uploadKey = `${folder}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
    setIsUploading(true);

    try {
      // For now, use existing upload function (we could enhance it with progress callbacks)
      const result = await uploadGemstoneImage(localUri, folder);
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 100 }));
      return result;
    } catch (error) {
      console.error('Upload failed:', error);
      return null;
    } finally {
      // Clean up progress entry after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadKey];
          return newProgress;
        });
        setIsUploading(false);
      }, 1000);
    }
  }

  const handleSave = () => {
    if (!formData["Title"]) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    onSave(formData);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.modalContainer}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <ThemedText type="h4" style={{ fontWeight: '700' }}>
            {editingGemstone ? 'Edit Gemstone' : 'Add Custom Stone'}
          </ThemedText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <Feather name="x" size={20} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            BASIC INFORMATION
          </ThemedText>
          <Input
            label="Title"
            placeholder="e.g., Ruby"
            value={formData["Title"]}
            onChangeText={(val) => setFormData({ ...formData, "Title": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Common Name"
            placeholder="e.g., Manik"
            value={formData["Common Name"]}
            onChangeText={(val) => setFormData({ ...formData, "Common Name": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Species"
            placeholder="e.g., Corundum"
            value={formData["Species"]}
            onChangeText={(val) => setFormData({ ...formData, "Species": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Tag"
            placeholder="e.g., Semi-precious, Precious, Organic"
            value={formData["Tag"]}
            onChangeText={(val) => setFormData({ ...formData, "Tag": val })}
          />
          <View style={styles.formSpacer} />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            PHYSICAL PROPERTIES
          </ThemedText>
          <Input
            label="Transparency"
            placeholder="e.g., Transparent, Translucent, Opaque"
            value={formData["Transparency"]}
            onChangeText={(val) => setFormData({ ...formData, "Transparency": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Dispersion"
            placeholder="e.g., 0.018"
            value={formData["Dispersion"]}
            onChangeText={(val) => setFormData({ ...formData, "Dispersion": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Refractive Index"
            placeholder="e.g., 1.76 - 1.78"
            value={formData["Refractive Index"]}
            onChangeText={(val) => setFormData({ ...formData, "Refractive Index": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Optic Character"
            placeholder="e.g., Uniaxial, Biaxial"
            value={formData["Optic Character"]}
            onChangeText={(val) => setFormData({ ...formData, "Optic Character": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Polariscope Reaction"
            placeholder="e.g., SR, DR, AGG, ADR, NA"
            value={formData["Polariscope Reaction"]}
            onChangeText={(val) => setFormData({ ...formData, "Polariscope Reaction": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Fluorescence"
            placeholder="e.g., Strong red fluorescence"
            value={formData["Fluorescence"]}
            onChangeText={(val) => setFormData({ ...formData, "Fluorescence": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Pleochroism"
            placeholder="e.g., Strong"
            value={formData["Pleochroism"]}
            onChangeText={(val) => setFormData({ ...formData, "Pleochroism": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Hardness"
            placeholder="e.g., 7, 8, 9, 10"
            value={formData["Hardness"]}
            onChangeText={(val) => setFormData({ ...formData, "Hardness": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Specific Gravity"
            placeholder="e.g., 3.97 - 4.05"
            value={formData["Specific Gravity"]}
            onChangeText={(val) => setFormData({ ...formData, "Specific Gravity": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Toughness"
            placeholder="e.g., Good"
            value={formData["Toughness"]}
            onChangeText={(val) => setFormData({ ...formData, "Toughness": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Inclusions"
            placeholder="e.g., Silk, rutile"
            value={formData["Inclusions"]}
            onChangeText={(val) => setFormData({ ...formData, "Inclusions": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Luster"
            placeholder="e.g., Vitreous"
            value={formData["Luster"]}
            onChangeText={(val) => setFormData({ ...formData, "Luster": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Stability"
            placeholder="e.g., Stable"
            value={formData["Stability"]}
            onChangeText={(val) => setFormData({ ...formData, "Stability": val })}
          />
          <View style={styles.formSpacer} />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            CHEMICAL PROPERTIES
          </ThemedText>
          <Input
            label="Chemical Name"
            placeholder="e.g., Aluminum Oxide"
            value={formData["Chemical Name"]}
            onChangeText={(val) => setFormData({ ...formData, "Chemical Name": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Chemical Formula"
            placeholder="e.g., Al2O3"
            value={formData["Chemical Formula"]}
            onChangeText={(val) => setFormData({ ...formData, "Chemical Formula": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Crystal System"
            placeholder="e.g., Trigonal"
            value={formData["Crystal System"]}
            onChangeText={(val) => setFormData({ ...formData, "Crystal System": val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Colors (comma-separated)"
            placeholder="e.g., Red, Pink, Orange"
            value={Array.isArray(formData["Colors"]) ? formData["Colors"].join(", ") : ""}
            onChangeText={(val) =>
              setFormData({
                ...formData,
                "Colors": val.split(/[,;]+/).map((c) => c.trim()).filter(Boolean),
              })
            }
          />
          <View style={styles.formSpacer} />
          <Input
            label="Occurences (comma-separated)"
            placeholder="e.g., Myanmar, Sri Lanka, Thailand"
            value={Array.isArray(formData["Occurences"]) ? formData["Occurences"].join(", ") : ""}
            onChangeText={(val) =>
              setFormData({
                ...formData,
                "Occurences": val.split(/[,;]+/).map((c) => c.trim()).filter(Boolean),
              })
            }
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            IMAGES
          </ThemedText>
          <Button
            onPress={pickStoneImage}
            variant="outline"
            style={{ marginBottom: Spacing.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <Feather name="image" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                Add Stone Images
              </ThemedText>
            </View>
          </Button>
          {formData.images.stoneImages.length > 0 ? (
            <View style={styles.imageGrid}>
              {formData.images.stoneImages.map((uri, index) => (
                <View key={`stone-image-${Date.now()}-${index}`} style={styles.imagePreviewContainer}>
                  <ExpoImage
                    source={{ uri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => removeStoneImage(index)}
                    style={styles.removeImageButton}
                  >
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Card style={[styles.emptyImagePlaceholder, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Feather name="image" size={40} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                No Stone Images Added Yet
              </ThemedText>
            </Card>
          )}

          <View style={styles.formSpacer} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, fontWeight: '600' }}>
            Spectroscope Image
          </ThemedText>
          <Button
            onPress={pickSpectroscopeImage}
            variant="outline"
            style={{ marginBottom: Spacing.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <Feather name="image" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                {formData.images.spectroscopeImages.length ? 'Replace Spectroscope Image' : 'Add Spectroscope Image'}
              </ThemedText>
            </View>
          </Button>
          {formData.images.spectroscopeImages.length > 0 ? (
            <View style={styles.spectroscopeImageWrapper}>
              <ExpoImage
                source={{ uri: formData.images.spectroscopeImages[0] }}
                style={styles.spectroscopeImage}
                contentFit="contain"
              />
              <Pressable
                onPress={removeSpectroscopeImage}
                style={[styles.removeImageButton, { top: Spacing.sm, right: Spacing.sm }]}
              >
                <Feather name="x" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Card style={[styles.emptyImagePlaceholder, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Feather name="image" size={40} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                No Spectroscope Images Added Yet
              </ThemedText>
            </Card>
          )}

          <View style={styles.formSpacer} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, fontWeight: '600' }}>
            Inclusion Images
          </ThemedText>
          <Button
            onPress={pickInclusionImage}
            variant="outline"
            style={{ marginBottom: Spacing.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <Feather name="image" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: '600' }}>
                Add Inclusion Images
              </ThemedText>
            </View>
          </Button>
          {formData.images.inclusionImages.length > 0 ? (
            <View style={styles.imageGrid}>
              {formData.images.inclusionImages.map((uri, index) => (
                <View key={`inclusion-image-${Date.now()}-${index}`} style={styles.imagePreviewContainer}>
                  <ExpoImage
                    source={{ uri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => removeInclusionImage(index)}
                    style={styles.removeImageButton}
                  >
                    <Feather name="x" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Card style={[styles.emptyImagePlaceholder, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <Feather name="image" size={40} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                No Inclusion Images Added Yet
              </ThemedText>
            </Card>
          )}

          {isUploading && (
            <View style={[styles.uploadProgressContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
                Uploading images...
              </ThemedText>
              {Object.values(uploadProgress).map((progress, index) => (
                <View key={index} style={[styles.progressBar, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: theme.primary, width: `${progress}%` }
                    ]}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={styles.formSpacer} />
          <View style={styles.formSpacer} />
          <Button
            onPress={handleSave}
            variant="primary"
            style={{ marginBottom: Spacing.xl }}
            disabled={isUpdatingGemstone || isUploading}
          >
            {(isUpdatingGemstone || isUploading) ? 'Processing...' : (editingGemstone ? 'Update Stone' : 'Save Stone')}
          </Button>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

function DataRow({
  label,
  value,
  mono = false,
  valueColor,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  valueColor?: string;
}) {
  const { theme, isDark } = useTheme();

  if (!value || value === "undefined" || value === "null" || (value === "NA" && label === "Title")) return null;

  let stringVal = String(value).trim();
  if (!stringVal) return null;

  // Format UV response cleanly with line break between SWUV and LWUV for neat stacked display
  if (label.toLowerCase() === "fluorescence" || label.toLowerCase().includes("uv")) {
    stringVal = stringVal.replace(/\s*(LWUV:)/i, "\n$1");
  }

  const textColor = valueColor ? valueColor : (isDark ? "#FFFFFF" : "#0F172A");
  const labelColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <View style={[styles.dataRow, { borderBottomColor: isDark ? "rgba(148, 163, 184, 0.1)" : theme.border }]}>
      <ThemedText
        type="small"
        lightColor="#64748B"
        darkColor="#94A3B8"
        style={{
          flex: 1,
          color: labelColor,
          fontWeight: '600',
          fontSize: 13.5,
          paddingTop: 1,
        }}
      >
        {label}
      </ThemedText>
      <ThemedText
        type="body"
        lightColor={valueColor || "#0F172A"}
        darkColor={valueColor || "#FFFFFF"}
        style={{
          flex: 1.6,
          textAlign: 'right',
          color: textColor,
          fontWeight: '700',
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {stringVal}
      </ThemedText>
    </View>
  );
}

function getGemColor(color?: string): string {
  if (!color || color === 'undefined' || color === 'null') {
    return "#8B5CF6"; // Default color
  }

  const colorMap: Record<string, string> = {
    "Red": "#EF4444",
    "Pink": "#EC4899",
    "Rose": "#F43F5E",
    "Orange": "#F97316",
    "Yellow": "#F59E0B",
    "Gold": "#EAB308",
    "Green": "#10B981",
    "Emerald": "#059669",
    "Blue": "#3B82F6",
    "Navy": "#1E3A8A",
    "Teal": "#14B8A6",
    "Cyan": "#06B6D4",
    "Purple": "#8B5CF6",
    "Violet": "#7C3AED",
    "Brown": "#A16207",
    "Black": "#1E293B",
    "White": "#E2E8F0",
    "Colorless": "#CBD5E1",
    "Gray": "#64748B",
    "Grey": "#64748B",
    "Multi-color": "#06B6D4",
    "Bi-color": "#8B5CF6",
  };

  try {
    for (const [key, val] of Object.entries(colorMap)) {
      if (color.toLowerCase().includes(key.toLowerCase())) {
        return val;
      }
    }
  } catch (error) {
    console.warn('Error processing color:', color, error);
  }
  return "#8B5CF6";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listSectionWrapper: {
    flex: 1,
    position: "relative",
  },
  flatListStyle: {
    flex: 1,
  },
  blurredFlatListStyle: {
    opacity: 0.35,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(10px)",
          WebkitFilter: "blur(10px)",
          userSelect: "none" as any,
          pointerEvents: "none" as any,
        }
      : {}),
  },
  blurredListContent: {
    pointerEvents: "none" as any,
  },
  accessOverlayWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    zIndex: 999,
  },
  accessOverlayCard: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 12,
    ...(Platform.OS === "web"
      ? {
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }
      : {}),
  },
  overlayStateContent: {
    alignItems: "center",
    width: "100%",
  },
  overlayIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  pendingBadgeHeader: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  pendingBadgeHeaderText: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  overlayTitle: {
    textAlign: "center",
    fontWeight: "800",
    marginTop: 4,
    fontSize: 20,
  },
  overlaySubtitle: {
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  pendingDetailsBox: {
    width: "100%",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleSelectionContainer: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleSelectCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
  },
  roleSelectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accessReasonInput: {
    width: "100%",
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  overlayActionRow: {
    width: "100%",
    gap: Spacing.sm,
  },
  primaryActionButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryActionButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  compareButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  headerTitle: {
    flex: 1,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    // marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  // statCard: {
  //   paddingVertical: Spacing.xs,
  //   paddingHorizontal: Spacing.sm,
  //   borderRadius: BorderRadius.md,
  //   minWidth: 70,
  // },
  statLabel: {
    textTransform: 'uppercase',
    fontWeight: '500',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  statValue: {
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sortButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterToolbar: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  filterSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterSummaryText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  filterClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  activeFiltersScroll: {
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["4xl"],
  },
  gemCardWrapper: {
    marginBottom: Spacing.md,
  },
  gemCard: {
    padding: 0,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  gemCardContent: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    position: 'relative',
  },
  thumbnailContainer: {
    position: "relative",
  },
  gemThumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: "transparent",
  },
  gemThumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  categoryBadgeAbsolute: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryBadgeOverlay: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  gemInfo: {
    flex: 1,
    justifyContent: "space-between",
    marginLeft: Spacing.md,
  },
  gemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  gemTitleContainer: {
    flex: 1,
  },
  gemTitle: {
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  gemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  opticalSection: {
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  opticalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  opticalItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  opticalDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  opticalLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(128,128,128,0.8)",
    letterSpacing: 0.5,
  },
  opticalValue: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  propertiesRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  propertyBadge: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  propertyLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  propertyValue: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  searchFilterCapsules: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: "center",
  },
  filterCapsule: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 32,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  filterCapsuleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 450 : undefined,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardContainer: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius["2xl"] || 22,
    borderWidth: 1.5,
  },
  heroCardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  heroImageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImageStage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  heroMainImage: {
    width: '100%',
    height: '100%',
  },
  heroFloatingCategory: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  heroFloatingCategoryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heroFloatingHardness: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroFloatingHardnessText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
  heroZoomBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroZoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCardInfo: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  heroTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroCardTitle: {
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  indianNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  indianNameText: {
    color: '#818CF8',
    fontWeight: '700',
    fontSize: 12.5,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  heroAttributeGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.xs,
  },
  heroAttributePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  heroAttrIconPod: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAttrLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  heroAttrVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroCardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  paginationLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 450 : undefined,
    alignSelf: 'center',
    maxHeight: '85%',
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  sortSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filterActiveBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  sortCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalTabContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  modalTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalScrollArea: {
    maxHeight: 380,
    marginBottom: Spacing.sm,
  },
  sortGridContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sortGridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  sortIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBlock: {
    gap: Spacing.sm,
  },
  filterBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBlockTitle: {
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterColorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  filterColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterChipPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: BorderRadius.full,
  },
  sortModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  modalResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  modalApplyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  // Buying Guide Styles
  buyingGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  editButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12, // Changed to circular
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checklistText: {
    flex: 1,
    lineHeight: 20,
  },
  addCheckSection: {
    marginTop: Spacing.md,
  },
  addCheckInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  guideSection: {
    marginBottom: Spacing.xl,
  },
  identificationList: {
    gap: Spacing.sm,
  },
  idPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  priceGuide: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  // Quick Optical Tests Styles
  testSection: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  testSteps: {
    gap: Spacing.sm,
  },
  quickTestStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  inclusionGuide: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  inclusionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inclusionInfo: {
    flex: 1,
  },
  inclusionImageSection: {
    marginTop: Spacing.lg,
  },
  // Pricing Calculator Styles
  calculatorSection: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  calculatorInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 16,
  },
  gradeSelector: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  gradeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  priceResult: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  inclusionImagesContainer: {
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inclusionImageWrapper: {
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 2,
    position: "relative",
  },
  inclusionImage: {
    width: 220,
    height: 220,
  },
  inclusionImageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  imageLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    alignItems: "center",
  },
  previewOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    padding: Spacing.lg,
  },
  previewCard: {
    width: PREVIEW_MAX_WIDTH,
    maxHeight: PREVIEW_MAX_HEIGHT,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  previewClose: {
    alignSelf: "flex-end",
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  previewScroll: {
    flexGrow: 0,
    width: "100%",
  },
  previewScrollContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewImageContainer: {
    width: PREVIEW_MAX_WIDTH - Spacing.lg * 2,
    height: PREVIEW_MAX_HEIGHT - Spacing.lg * 4,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
  previewLabel: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  tabPillWrapper: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 3,
    borderWidth: 1,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  tabPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 13,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing["5xl"],
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardHeaderIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  propertyCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  cardSectionTitle: {
    fontWeight: "800",
    letterSpacing: 0.5,
    fontSize: 12.5,
    textTransform: "uppercase",
  },
  propertyGrid3: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  propertyCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  propertyIconBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyMetricLabel: {
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
    color: '#94A3B8',
  },
  propertyMetricValue: {
    fontWeight: '800',
    fontSize: 15.5,
  },
  propertyGrid: {
    flexDirection: "column",
    gap: Spacing.md,
  },
  propertyItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  propertyIconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.xs,
  },
  propertyCardLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  modalScrollView: {
    flex: 1,
  },
  propertyContent: {
    flex: 1,
    justifyContent: "center",
  },
  detailedPropertiesTable: {
    marginTop: Spacing.xs,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    gap: Spacing.md,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inclusionsListContainer: {
    flexDirection: "column",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  clarityCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  clarityCalloutText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  inclusionsPillsWrapper: {
    flexDirection: 'column',
    gap: Spacing.xs,
  },
  inclusionItemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  inclusionBulletWrapper: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  inclusionTextClean: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  inclusionShortText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  inclusionLongText: {
    fontSize: 13.5,
    lineHeight: 21,
    fontWeight: "400",
  },
  colorChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 7,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  priceItem: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  demandBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
  },
  formationTextContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
  },
  locationsContainer: {
    gap: Spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  locationPinBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  stepText: {
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl + 60,
    right: Spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalScrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  formSpacer: {
    height: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  categorySelector: {
    marginBottom: Spacing.md,
  },
  colorAnalysisLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  colorAnalysisText: {
    color: '#6B7280',
  },
  colorAnalysisResults: {
    gap: Spacing.sm,
  },
  colorAnalysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  colorAnalysisLabel: {
    fontWeight: '600',
    flex: 1,
  },
  colorAnalysisValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 2,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorAnalysisEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  categoryButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  priceEntryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  priceEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  imagePreviewContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  spectroscopeImageWrapper: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  spectroscopeImage: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImagePlaceholder: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderWidth: 2,
    borderColor: "rgba(128,128,128,0.3)",
  },
  uploadProgressContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // List view styles
  listItemWrapper: {
    marginBottom: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderBottomWidth: 1,
  },
  listItemImageContainer: {
    width: 50,
    height: 50,
    marginRight: Spacing.md,
  },
  listItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  listItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  listItemName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  listItemSubtitle: {
    marginBottom: Spacing.xs,
  },
  semiPreciousFiltersContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterSection: {
    gap: Spacing.sm,
  },
  filterTitle: {
    fontWeight: '600',
    color: '#374151',
  },
  filterList: {
    maxHeight: 120,
  },
  filterListItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  filterListContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  filterChipActive: {
    borderWidth: 2,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  clearFiltersText: {
    fontWeight: '500',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flex: 1,
    minHeight: 32,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  filterSectionHeader: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  filterDropdown: {
    marginBottom: Spacing.lg,
  },
  dropdownScroll: {
    flexDirection: 'row',
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  applyButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});
