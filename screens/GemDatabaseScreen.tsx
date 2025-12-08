import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { 
  StyleSheet, 
  View, 
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Alert,
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
import { SelectableFieldWithOther, FieldValue } from "@/components/SelectableFieldWithOther";
import { useTheme } from "@/hooks/useTheme";

// Safety wrapper to ensure theme is always available
function getThemeSafe() {
  try {
    const result = useTheme();
    if (result && result.theme) {
      return result;
    }
  } catch (e) {
    // Fall through to default
  }
  return {
    theme: {
      text: "#0F172A",
      textSecondary: "#64748B",
      primary: "#8B5CF6",
      secondary: "#F59E0B",
      success: "#10B981",
      backgroundRoot: "#F8FAFC",
      backgroundDefault: "#FFFFFF",
      backgroundSecondary: "#F1F5F9",
      border: "#E2E8F0",
      inputBackground: "#FFFFFF",
    },
    isDark: false,
  };
}
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEMSTONE_DATABASE, GEM_CATEGORIES, Gemstone } from "@/constants/gemstoneData";
import { getCustomGemstones, getAllGemstones, saveCustomGemstone, updateCustomGemstone, deleteCustomGemstone, uploadGemstoneImage } from "@/services/gemstoneService";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

// Option lists for selectable fields
const VARIETY_OPTIONS = ["Ruby", "Sapphire", "Emerald", "Topaz", "Garnet", "Quartz", "Tourmaline", "Zircon"] as const;
const CRYSTAL_SYSTEM_OPTIONS = ["Cubic", "Trigonal", "Hexagonal", "Orthorhombic", "Monoclinic", "Triclinic", "Amorphous"] as const;
const TRANSPARENCY_OPTIONS = ["Transparent", "Translucent", "Opaque"] as const;
const LUSTER_OPTIONS = ["Vitreous", "Resinous", "Greasy", "Adamantine", "Waxy", "Dull"] as const;
const PLEOCHROISM_OPTIONS = ["None", "Weak", "Medium", "Strong"] as const;
const OPTIC_CHARACTER_OPTIONS = ["SR", "DR", "AGG"] as const;
const HARDNESS_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
const CLEAVAGE_OPTIONS = ["None", "Poor", "Good", "Perfect"] as const;
const FRACTURE_OPTIONS = ["Conchoidal", "Uneven", "Fibrous", "Hackly"] as const;
const CLARITY_OPTIONS = ["IF", "VVS", "VS", "SI", "I"] as const;
const TREATMENT_OPTIONS = ["Untreated", "Heated", "Irradiated", "Glass-filled", "Oiled", "Diffused"] as const;

// Buying Guide Content Component
const BuyingGuideContent = React.memo(function BuyingGuideContent({ gemstone, theme }: { gemstone: Gemstone; theme: any }) {
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
    const gemstoneName = gemstone.variety.toLowerCase();
    
    if (gemstoneName.includes('ruby') || gemstoneName.includes('corundum')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Ruby is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Red to purple-red colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Ruby has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES, COLOR ZONING, SILK'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Ruby shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.99'}-${gemstone.sgMax || '3.99'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('emerald')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Emerald is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Green to blue-green colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Emerald has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'BLACK & BROWN MICA, RAIN LIKE INC'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Emerald shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '2.67'}-${gemstone.sgMax || '2.80'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('sapphire')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Sapphire is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Blue to violet-blue colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Sapphire has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES, COLOR ZONING, SILK'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Sapphire shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.99'}-${gemstone.sgMax || '3.99'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('diamond')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'S.R.'} - Diamond is singly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'NONE'} - Diamond has no pleochroism`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'ADAMANTINE'} - Diamond has adamantine luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'CHARACTERISTIC INCLUSIONS'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Diamond shows variable fluorescence`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.52'}-${gemstone.sgMax || '3.52'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('tourmaline')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Tourmaline is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'STRONG'} - Strong color variation`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Tourmaline has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'TRICHITES, NEEDLES, GROWTH TUBES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Tourmaline shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.05'}-${gemstone.sgMax || '3.15'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('garnet')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'S.R.'} - Garnet is singly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'NONE'} - Garnet has no pleochroism`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'RESINOUS'} - Garnet has resinous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Garnet shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.70'}-${gemstone.sgMax || '4.20'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('spinel')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'S.R.'} - Spinel is singly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'NONE'} - Spinel has no pleochroism`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Spinel has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'RUTILE NEEDLE, ZIRCON HALOES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'STRONG IN FEW'} - Spinel shows strong fluorescence`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.60'}-${gemstone.sgMax || '3.60'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('emerald') || gemstoneName.includes('beryl')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Beryl is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Green to blue-green colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Beryl has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'BLACK & BROWN MICA, RAIN LIKE INC'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Beryl shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '2.67'}-${gemstone.sgMax || '2.80'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('zircon')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Zircon is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'STRONG'} - Strong color variation`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'SUB-ADAMANTINE'} - Zircon has sub-adamantine luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'DOUBLING OF BACK FACETS, LONG TUBES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Zircon shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '4.25'}-${gemstone.sgMax || '4.25'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('topaz')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Topaz is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'STRONG'} - Strong color variation`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'OILY'} - Topaz has oily luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'TWO IMMISCIBLE LIQUIDS'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Topaz shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.49'}-${gemstone.sgMax || '3.57'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('peridot')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Peridot is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'STRONG'} - Strong color variation`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'OILY'} - Peridot has oily luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'LILYPAD, DOUBLING OF BACK FACETS'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'INERT'} - Peridot shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || '3.34'}-${gemstone.sgMax || '3.34'} - Heavy liquid test`, checked: false },
      ];
    } else {
      // Generic for other gemstones - use actual data from database
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'Unknown'} - ${gemstone.variety} optical character`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'Unknown'} - Check with dichroscope`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'Unknown'} - ${gemstone.variety} luster type`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.inclusions.slice(0, 2).join(', ') || 'Characteristic inclusions'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvResponse || 'Check fluorescence under UV light'}`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.sgMin || 'Unknown'}-${gemstone.sgMax || 'Unknown'} - Specific gravity test`, checked: false },
      ];
    }
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
                {gemstone.inclusionImages.map((imgUrl, idx) => (
                  <View key={idx} style={[styles.inclusionImageWrapper, { borderColor: theme.border }]}>
                    <ExpoImage
                      source={{ uri: imgUrl }}
                      style={styles.inclusionImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={[styles.imageLabel, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
                        Inclusion #{idx + 1}
                      </ThemedText>
                    </View>
                  </View>
                ))}
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

export default function GemDatabaseScreen() {
  const { theme } = getThemeSafe();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGem, setSelectedGem] = useState<Gemstone | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "formation" | "market" | "testing" | "buying">("properties");
  const [showAddStoneModal, setShowAddStoneModal] = useState(false);
  const [editingGemstone, setEditingGemstone] = useState<Gemstone | null>(null);
  const [customStones, setCustomStones] = useState<Gemstone[]>([]);
  const [isLoadingGems, setIsLoadingGems] = useState(false);
  
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

  // Load gemstones from Supabase (or fallback to local)
  const loadGemstones = async () => {
    setIsLoadingGems(true);
    try {
      console.log('🔄 Loading gemstones from database...');
      // Load from Supabase (both public and custom)
      const allGemsFromDB = await getAllGemstones();
      console.log(`✅ Loaded ${allGemsFromDB.length} gemstone(s) from database`);
      
      if (allGemsFromDB.length > 0) {
        setCustomStones(allGemsFromDB);
        console.log('📊 Database gemstones:', allGemsFromDB.map(g => g.variety).join(', '));
      } else {
        console.log('⚠️  No gemstones found in database, using local fallback');
        // Fallback to local database
        setCustomStones([]);
      }
    } catch (error) {
      console.error('❌ Error loading gemstones from database:', error);
      // Fallback to empty array (will use local GEMSTONE_DATABASE)
      setCustomStones([]);
    } finally {
      setIsLoadingGems(false);
    }
  };

  useEffect(() => {
    loadGemstones();
  }, []);

  // Merge database stones (prioritize database over local)
  const allGems = useMemo(() => {
    // Database stones first, then local fallback
    if (customStones.length > 0) {
      console.log('🔍 Using custom stones:', customStones.map(g => `${g.variety} (${g.id})`).join(', '));
      return customStones;
    }
    console.log('🔍 Using fallback GEMSTONE_DATABASE');
    return GEMSTONE_DATABASE;
  }, [customStones]);

  const filteredGems = useMemo(() => {
    const filtered = allGems.filter(gem => {
      const matchesSearch = 
        gem.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gem.indianName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        selectedCategory === "All" || gem.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    console.log('🔍 Filtered gems:', filtered.map(g => g.variety).join(', '));
    return filtered;
  }, [searchQuery, selectedCategory, allGems]);

  const renderGemItem = ({ item }: { item: Gemstone }) => {
    // Calculate average price
    const avgPriceINR = item.priceRangeINR.min > 0 && item.priceRangeINR.max > 0
      ? Math.round((item.priceRangeINR.min + item.priceRangeINR.max) / 2)
      : 0;
    
    return (
    <Pressable
      onPress={() => setSelectedGem(item)}
        style={({ pressed }) => [
          styles.gemCardWrapper,
          { opacity: pressed ? 0.8 : 1 }
        ]}
    >
        <Card style={styles.gemCard} elevation={2}>
        <View style={styles.gemCardContent}>
            {/* Thumbnail Section */}
            <View style={styles.thumbnailContainer}>
          {item.image ? (
            <ExpoImage
              source={{ uri: item.image }}
              style={styles.gemThumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
          <View 
            style={[
              styles.gemThumbnail,
                    styles.gemThumbnailPlaceholder,
                    { backgroundColor: getGemColor(item.colors?.[0]) + "20" }
            ]}
          >
            <Feather 
              name="hexagon" 
                    size={32} 
              color={getGemColor(item.colors?.[0])} 
            />
          </View>
          )}
              {/* Category Badge on Thumbnail */}
            <View style={[
                styles.categoryBadgeAbsolute,
              { 
                backgroundColor: item.category === "Precious" 
                    ? theme.secondary 
                    : item.category === "Semi-precious"
                      ? theme.primary
                      : theme.success
              }
            ]}>
              <ThemedText 
                type="caption" 
                style={{ 
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.5
                  }}
                >
                  {item.category.toUpperCase()}
                </ThemedText>
              </View>
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
                {avgPriceINR > 0 && (
                  <View style={[styles.propertyBadge, { backgroundColor: theme.secondary + "15" }]}>
                    <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                      AVG ₹
                    </ThemedText>
                    <ThemedText type="caption" style={[styles.propertyValue, { color: theme.secondary }]}>
                      {avgPriceINR.toLocaleString()}
                    </ThemedText>
                  </View>
                )}
              </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
  };

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
            { paddingBottom: (paddingBottom || 0) + 80 }
          ]}
          scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          refreshing={isLoadingGems}
          onRefresh={loadGemstones}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              {isLoadingGems ? (
                <>
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                    Loading gemstones...
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
        />

        {/* Floating Action Button */}
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
      </View>

      <Modal
        visible={selectedGem !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGem(null)}
      >
        {selectedGem ? (
          <ThemedView style={styles.modalContainer}>
            {/* Enhanced Header with Gradient */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => setSelectedGem(null)}
                style={({ pressed }) => [
                  styles.backButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.6 : 1 }
                ]}
              >
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <ThemedText type="h4" style={{ fontWeight: '700' }}>
                  {selectedGem.variety}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {selectedGem.indianName}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {/* Check if this is a custom gemstone - check if it exists in customStones array */}
                {selectedGem.id && customStones.some(stone => stone.id === selectedGem.id) && (
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
                        Alert.alert(
                          "Delete Gemstone",
                          `Are you sure you want to delete ${selectedGem.variety}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: async () => {
                                if (!selectedGem.id) return;
                                
                                // Delete from database
                                const result = await deleteCustomGemstone(selectedGem.id);
                                
                                if (result.success) {
                                  // Also remove from AsyncStorage local storage
                                  try {
                                    const storedStones = await AsyncStorage.getItem('customStones');
                                    if (storedStones) {
                                      const stones = JSON.parse(storedStones);
                                      const updatedStones = stones.filter((stone: any) => stone.id !== selectedGem.id);
                                      await AsyncStorage.setItem('customStones', JSON.stringify(updatedStones));
                                      
                                      // Update local state immediately
                                      setCustomStones(prevStones => prevStones.filter(stone => stone.id !== selectedGem.id));
                                    }
                                  } catch (storageError) {
                                    console.log('Error removing from AsyncStorage:', storageError);
                                  }
                                  
                                  // Reload from database to ensure sync
                                  await loadGemstones();
                                  setSelectedGem(null);
                                  Alert.alert("Success", "Gemstone deleted successfully from database and local storage");
                                } else {
                                  Alert.alert("Error", result.error || "Failed to delete gemstone");
                                }
                              },
                            },
                          ]
                        );
                      }}
                      style={({ pressed }) => [
                        styles.backButton,
                        { backgroundColor: theme.danger + "20", opacity: pressed ? 0.6 : 1 }
                      ]}
                    >
                      <Feather name="trash-2" size={18} color={theme.danger} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Enhanced Hero Section with Image - Modern Design */}
            <Animated.View 
              style={[
                styles.heroSection,
                { 
                  height: headerHeight,
                  overflow: 'hidden',
                  backgroundColor: selectedGem.image ? 'transparent' : theme.backgroundSecondary,
                  opacity: heroSectionOpacity,
                }
              ]}
            >
              {selectedGem.image ? (
                <Animated.View 
                  style={[
                    styles.heroImageContainer,
                    {
                      transform: [
                        { scale: heroImageScale },
                        { translateX: heroImageTranslateX },
                        { translateY: heroImageTranslateY }
                      ],
                      opacity: heroImageOpacity,
                    }
                  ]}
                >
                  <ExpoImage
                    source={{ uri: selectedGem.image }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={500}
                  />
                  <Animated.View 
                    style={[
                      styles.imageOverlay, 
                      { 
                        backgroundColor: getGemColor(selectedGem.colors?.[0]) + "15",
                        opacity: scrollY.interpolate({
                          inputRange: [0, 150],
                          outputRange: [0.2, 0.5],
                          extrapolate: 'clamp',
                        })
                      }
                    ]} 
                  />
                </Animated.View>
              ) : (
                <Animated.View 
                  style={[
                    styles.heroIconContainer, 
                    { 
                      backgroundColor: getGemColor(selectedGem.colors?.[0]) + "15",
                      transform: [
                        { scale: heroImageScale },
                        { translateX: heroImageTranslateX },
                        { translateY: heroImageTranslateY }
                      ],
                      opacity: heroImageOpacity,
                    }
                  ]}
                >
                  <Feather 
                    name="hexagon" 
                    size={120} 
                    color={getGemColor(selectedGem.colors?.[0])} 
                  />
                </Animated.View>
              )}
              
              {/* Enhanced Floating Info Card with Better Stability */}
              <Animated.View 
                style={[
                  styles.modernHeroInfo,
                  {
                    transform: [
                      { scale: titleScale },
                      { translateY: titleTranslateY },
                      { translateX: titleTranslateX }
                    ],
                    opacity: titleOpacity,
                    backgroundColor: selectedGem.image 
                      ? 'rgba(0,0,0,0.6)' 
                      : theme.backgroundDefault,
                    // backdropFilter: selectedGem.image ? 'blur(10px)' : 'none', // Commented out due to TS error
                  }
                ]}
              >
                <View style={styles.heroInfoContent}>
                  <View style={styles.titleRow}>
                    <ThemedText 
                      type="h2" 
                      style={[
                        styles.heroTitle, 
                        { 
                          color: selectedGem.image ? "#FFFFFF" : theme.text,
                          // textShadow: selectedGem.image ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' // Commented out due to TS error
                        }
                      ]}
                    >
                      {selectedGem.variety}
                    </ThemedText>
                    {selectedGem.indianName && (
                      <ThemedText 
                        type="body" 
                        style={[
                          styles.heroSubtitle, 
                          { 
                            color: selectedGem.image ? "#FFFFFF" : theme.textSecondary,
                            opacity: selectedGem.image ? 0.9 : 0.8
                          }
                        ]}
                      >
                        {" ("}{selectedGem.indianName}{")"}
                      </ThemedText>
                    )}
                  </View>
                  
                  <View style={styles.heroBadges}>
                    <View 
                      style={[
                        styles.heroBadge, 
                        { 
                          backgroundColor: selectedGem.category === "Precious" 
                            ? theme.secondary 
                            : selectedGem.category === "Semi-precious"
                              ? theme.primary
                              : theme.success
                        }
                      ]}
                    >
                      <Feather name="award" size={14} color="#FFFFFF" />
                      <ThemedText type="caption" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: '600' }}>
                        {selectedGem.category}
                      </ThemedText>
                    </View>
                    {selectedGem.hardness > 0 && (
                      <View 
                        style={[
                          styles.heroBadge, 
                          styles.heroBadgeSecondary, 
                          { 
                            backgroundColor: selectedGem.image 
                              ? 'rgba(255,255,255,0.25)' 
                              : theme.backgroundSecondary,
                            borderColor: selectedGem.image 
                              ? 'rgba(255,255,255,0.3)' 
                              : theme.border
                          }
                        ]}
                      >
                        <Feather 
                          name="shield" 
                          size={14} 
                          color={selectedGem.image ? "#FFFFFF" : theme.text} 
                        />
                        <ThemedText 
                          type="caption" 
                          style={{ 
                            color: selectedGem.image ? "#FFFFFF" : theme.text, 
                            marginLeft: 6, 
                            fontWeight: '600' 
                          }}
                        >
                          {selectedGem.hardness} Mohs
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Compact Header - 50x50 image with horizontal layout */}
            <Animated.View 
              style={[
                styles.compactHeader,
                {
                  opacity: compactHeaderOpacity,
                  transform: [{ translateY: compactHeaderTranslateY }],
                  backgroundColor: theme.backgroundDefault,
                  borderBottomColor: theme.border,
                }
              ]}
            >
              <View style={styles.compactHeaderContent}>
                {/* 50x50 Stone Image */}
                <View style={styles.compactImageContainer}>
                  {selectedGem.image ? (
                    <ExpoImage
                      source={{ uri: selectedGem.image }}
                      style={styles.compactImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View 
                      style={[
                        styles.compactImagePlaceholder,
                        { backgroundColor: getGemColor(selectedGem.colors?.[0]) + "20" }
                      ]}
                    >
                      <Feather 
                        name="hexagon" 
                        size={24} 
                        color={getGemColor(selectedGem.colors?.[0])} 
                      />
                    </View>
                  )}
                </View>

                {/* Stone Name and Info in Horizontal Stack */}
                <View style={styles.compactInfo}>
                  <View style={styles.compactTitleRow}>
                    <ThemedText type="h4" style={[styles.compactTitle, { color: theme.text }]}>
                      {selectedGem.variety}
                    </ThemedText>
                    {selectedGem.indianName && (
                      <ThemedText type="caption" style={[styles.compactSubtitle, { color: theme.textSecondary }]}>
                        {selectedGem.indianName}
                      </ThemedText>
                    )}
                  </View>
                  
                  <View style={styles.compactBadges}>
                    <View 
                      style={[
                        styles.compactBadge, 
                        { 
                          backgroundColor: selectedGem.category === "Precious" 
                            ? theme.secondary 
                            : selectedGem.category === "Semi-precious"
                              ? theme.primary
                              : theme.success
                        }
                      ]}
                    >
                      <ThemedText type="caption" style={{ color: "#FFFFFF", fontSize: 10, fontWeight: '600' }}>
                        {selectedGem.category}
                      </ThemedText>
                    </View>
                    {selectedGem.hardness > 0 && (
                      <View 
                        style={[
                          styles.compactBadge, 
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }
                        ]}
                      >
                        <ThemedText type="caption" style={{ color: theme.text, fontSize: 10, fontWeight: '600' }}>
                          {selectedGem.hardness} Mohs
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Enhanced Tab Container */}
            <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
              {(["properties", "formation", "market", "testing", "buying"] as const).map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tab,
                    activeTab === tab && { 
                      borderBottomColor: theme.primary, 
                      borderBottomWidth: 3,
                      backgroundColor: theme.primary + "05"
                    }
                  ]}
                >
                  <ThemedText 
                    type="small"
                    style={{ 
                      color: activeTab === tab ? theme.primary : theme.textSecondary,
                      fontWeight: activeTab === tab ? "700" : "500",
                      fontSize: activeTab === tab ? 14 : 13,
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <Animated.ScrollView 
              style={styles.tabContent} 
              contentContainerStyle={styles.tabContentInner}
              showsVerticalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            >
              {activeTab === "properties" && (
                <>
                  {/* Key Properties Card */}
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      KEY PROPERTIES
                    </ThemedText>
                    <View style={styles.propertyGrid}>
                      <View style={[styles.propertyItem, { backgroundColor: theme.primary + "10" }]}>
                        <Feather name="eye" size={18} color={theme.primary} />
                        <View style={styles.propertyContent}>
                          <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                            Refractive Index (RI)
                          </ThemedText>
                          <ThemedText type="h4" style={{ color: theme.primary, fontWeight: '700' }}>
                            {selectedGem.riMin} - {selectedGem.riMax}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[styles.propertyItem, { backgroundColor: theme.success + "10" }]}>
                        <Feather name="activity" size={18} color={theme.success} />
                        <View style={styles.propertyContent}>
                          <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                            Specific Gravity (SG)
                          </ThemedText>
                          <ThemedText type="h4" style={{ color: theme.success, fontWeight: '700' }}>
                            {selectedGem.sgMin} - {selectedGem.sgMax}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[styles.propertyItem, { backgroundColor: theme.secondary + "10" }]}>
                        <Feather name="hard-drive" size={18} color={theme.secondary} />
                        <View style={styles.propertyContent}>
                          <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                            Hardness
                          </ThemedText>
                          <ThemedText type="h4" style={{ color: theme.secondary, fontWeight: '700' }}>
                            {selectedGem.hardness} Mohs
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </Card>

                  {/* Detailed Properties */}
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      DETAILED PROPERTIES
                    </ThemedText>
                  <DataRow label="Chemical Composition" value={selectedGem.chemicalComposition} />
                  <DataRow label="Crystal System" value={selectedGem.crystalSystem} />
                  <DataRow label="Luster" value={selectedGem.luster} />
                  <DataRow label="Cleavage" value={selectedGem.cleavage} />
                  <DataRow label="Fracture" value={selectedGem.fracture} />
                  <DataRow label="Optic Character" value={selectedGem.opticCharacter} />
                  <DataRow label="Pleochroism" value={selectedGem.pleochroism} />
                  <DataRow label="UV Response" value={selectedGem.uvResponse} />
                  </Card>
                  
                  {/* Colors Card */}
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    COLORS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.colors.map((color, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.chip, 
                            { 
                              backgroundColor: theme.backgroundSecondary,
                              borderWidth: 1.5,
                              borderColor: theme.border,
                            }
                          ]}
                        >
                          <View 
                            style={[
                              styles.colorIndicator, 
                              { backgroundColor: getGemColor(color) }
                            ]} 
                          />
                          <ThemedText type="caption" style={{ fontWeight: '600' }}>{color}</ThemedText>
                      </View>
                    ))}
                  </View>
                  </Card>

                  {/* Inclusions Card */}
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    TYPICAL INCLUSIONS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.inclusions.map((inclusion, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.chip, 
                            { 
                              backgroundColor: theme.backgroundSecondary,
                              borderWidth: 1.5,
                              borderColor: theme.border,
                            }
                          ]}
                        >
                          <Feather name="circle" size={8} color={theme.primary} style={{ marginRight: 6 }} />
                          <ThemedText type="caption" style={{ fontWeight: '600' }}>{inclusion}</ThemedText>
                      </View>
                    ))}
                  </View>
                  </Card>

                  {/* Inclusion Images Card */}
                  {selectedGem.inclusionImages && selectedGem.inclusionImages.length > 0 && (
                    <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                      <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                        INCLUSION IMAGES
                      </ThemedText>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.inclusionImagesContainer}
                      >
                        {selectedGem.inclusionImages.map((imgUrl, idx) => (
                          <View key={idx} style={[styles.inclusionImageWrapper, { borderColor: theme.border }]}>
                            <ExpoImage
                              source={{ uri: imgUrl }}
                              style={styles.inclusionImage}
                              contentFit="cover"
                              transition={200}
                            />
                            <View style={[styles.imageLabel, { backgroundColor: theme.backgroundSecondary }]}>
                              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 11 }}>
                                Inclusion {idx + 1}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </Card>
                  )}
                </>
              )}

              {activeTab === "formation" && (
                <>
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      GEOLOGICAL FORMATION
                    </ThemedText>
                    <ThemedText type="body" style={{ lineHeight: 24, color: theme.text }}>
                      {selectedGem.formation}
                    </ThemedText>
                  </Card>

                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    OCCURRENCES
                  </ThemedText>
                    <View style={styles.locationsContainer}>
                  {selectedGem.occurrences.map((location, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.locationRow, 
                            { 
                              backgroundColor: theme.backgroundSecondary,
                              borderLeftWidth: 3,
                              borderLeftColor: theme.primary,
                            }
                          ]}
                        >
                          <Feather name="map-pin" size={18} color={theme.primary} />
                          <ThemedText type="body" style={{ fontWeight: '500', flex: 1 }}>
                            {location}
                          </ThemedText>
                    </View>
                  ))}
                    </View>
                  </Card>
                </>
              )}

              {activeTab === "market" && (
                <>
                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      PRICE RANGE (PER CARAT)
                    </ThemedText>
                    <View style={styles.priceRow}>
                      <View style={[styles.priceItem, { backgroundColor: theme.success + "15" }]}>
                        <View style={styles.priceHeader}>
                          <Feather name="dollar-sign" size={18} color={theme.success} />
                          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: '700', marginLeft: 6 }}>
                            INR
                        </ThemedText>
                      </View>
                        <ThemedText type="h3" style={{ color: theme.success, fontWeight: '800', marginTop: Spacing.xs }}>
                          ₹{selectedGem.priceRangeINR.min.toLocaleString()} - ₹{selectedGem.priceRangeINR.max.toLocaleString()}
                        </ThemedText>
                      </View>
                      <View style={[styles.priceItem, { backgroundColor: theme.primary + "15" }]}>
                        <View style={styles.priceHeader}>
                          <Feather name="dollar-sign" size={18} color={theme.primary} />
                          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: '700', marginLeft: 6 }}>
                            USD
                          </ThemedText>
                        </View>
                        <ThemedText type="h3" style={{ color: theme.primary, fontWeight: '800', marginTop: Spacing.xs }}>
                          ${selectedGem.priceRangeUSD.min} - ${selectedGem.priceRangeUSD.max}
                        </ThemedText>
                      </View>
                    </View>
                  </Card>

                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      MARKET DEMAND
                    </ThemedText>
                    <View style={[
                      styles.demandBadge,
                      { 
                        backgroundColor: selectedGem.marketDemand === "High" ? theme.success + "20" :
                          selectedGem.marketDemand === "Medium" ? theme.warning + "20" : theme.textSecondary + "20"
                      }
                    ]}>
                      <Feather 
                        name={selectedGem.marketDemand === "High" ? "trending-up" : selectedGem.marketDemand === "Medium" ? "minus" : "trending-down"} 
                        size={20} 
                        color={
                      selectedGem.marketDemand === "High" ? theme.success :
                      selectedGem.marketDemand === "Medium" ? theme.warning : theme.textSecondary
                    }
                  />
                      <ThemedText 
                        type="h4" 
                        style={{ 
                          color: selectedGem.marketDemand === "High" ? theme.success :
                            selectedGem.marketDemand === "Medium" ? theme.warning : theme.textSecondary,
                          fontWeight: '700',
                          marginLeft: Spacing.sm
                        }}
                      >
                        {selectedGem.marketDemand}
                      </ThemedText>
                    </View>
                  </Card>

                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    COMMON TREATMENTS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.treatments.map((treatment, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.chip, 
                            { 
                              backgroundColor: theme.warning + "15",
                              borderWidth: 1.5,
                              borderColor: theme.warning + "40",
                            }
                          ]}
                        >
                          <Feather name="alert-triangle" size={12} color={theme.warning} style={{ marginRight: 6 }} />
                          <ThemedText type="caption" style={{ color: theme.warning, fontWeight: '600' }}>
                            {treatment}
                          </ThemedText>
                      </View>
                    ))}
                  </View>
                  </Card>

                  <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    KNOWN SIMULANTS
                  </ThemedText>
                  <View style={styles.chipContainer}>
                    {selectedGem.simulants.map((simulant, idx) => (
                        <View 
                          key={idx} 
                          style={[
                            styles.chip, 
                            { 
                              backgroundColor: theme.danger + "15",
                              borderWidth: 1.5,
                              borderColor: theme.danger + "40",
                            }
                          ]}
                        >
                          <Feather name="alert-circle" size={12} color={theme.danger} style={{ marginRight: 6 }} />
                          <ThemedText type="caption" style={{ color: theme.danger, fontWeight: '600' }}>
                            {simulant}
                          </ThemedText>
                      </View>
                    ))}
                  </View>
                  </Card>
                </>
              )}

              {activeTab === "testing" && (
                <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                  <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                    TESTING GUIDE
                  </ThemedText>
                  <ThemedText type="body" style={{ marginBottom: Spacing.xl, color: theme.textSecondary, lineHeight: 22 }}>
                    Follow these steps to manually identify this gemstone:
                  </ThemedText>
                  {selectedGem.testingGuide.map((step, idx) => (
                    <View key={idx} style={styles.testStep}>
                      <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                        <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
                          {idx + 1}
                        </ThemedText>
                      </View>
                      <View style={[styles.stepContent, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText type="body" style={[styles.stepText, { color: theme.text }]}>
                          {step}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </Card>
              )}

              {activeTab === "buying" && (
                <BuyingGuideContent gemstone={selectedGem!} theme={theme} />
              )}
            </Animated.ScrollView>
          </ThemedView>
        ) : null}
      </Modal>

      {/* Add Custom Stone Modal */}
      <AddStoneModal
        visible={showAddStoneModal}
        editingGemstone={editingGemstone}
        onClose={() => {
          setShowAddStoneModal(false);
          setEditingGemstone(null);
        }}
        onSave={async (stoneData) => {
          try {
            // Helper function to extract value from FieldValue
            const getValue = (field: FieldValue | null): string => {
              return field?.value || "";
            };

            // Helper function to save locally
            const saveLocally = async () => {
              // Upload images to Supabase Storage first
              let stoneImageUrl = stoneData.images?.stoneImages?.[0];
              let inclusionImageUrls = stoneData.images?.inclusionImages || [];
              
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
              // Convert the form data to Gemstone format
              const newStone: Gemstone = {
              id: `custom-${Date.now()}`,
              variety: stoneData.stoneName || getValue(stoneData.variety),
              chemicalComposition: stoneData.chemicalComposition,
              crystalSystem: getValue(stoneData.crystalSystem),
              colors: stoneData.colorRange ? stoneData.colorRange.split(',').map(c => c.trim()) : [],
              causeOfColor: stoneData.causeOfColor,
              transparency: getValue(stoneData.transparency) ? [getValue(stoneData.transparency)] : [],
              luster: getValue(stoneData.luster),
              hardness: parseFloat(getValue(stoneData.hardness)) || 0,
              sgMin: parseFloat(stoneData.specificGravity?.split('-')[0]?.trim()) || 0,
              sgMax: parseFloat(stoneData.specificGravity?.split('-')[1]?.trim()) || 0,
              riMin: parseFloat(stoneData.refractiveIndex?.split('-')[0]?.trim()) || 0,
              riMax: parseFloat(stoneData.refractiveIndex?.split('-')[1]?.trim()) || 0,
              cleavage: getValue(stoneData.cleavage),
              fracture: getValue(stoneData.fracture),
              opticCharacter: getValue(stoneData.opticCharacter),
              pleochroism: getValue(stoneData.pleochroism),
              inclusions: stoneData.typicalInclusions ? stoneData.typicalInclusions.split(',').map(i => i.trim()) : [],
              uvResponse: stoneData.uvReaction,
              simulants: stoneData.simulants ? stoneData.simulants.split(',').map(s => s.trim()) : [],
              treatments: stoneData.commonTreatments ? stoneData.commonTreatments.split(',').map(t => t.trim()) : [],
              occurrences: stoneData.occurrences ? stoneData.occurrences.split(',').map(o => o.trim()) : [],
              indianName: stoneData.indianTradeName,
              category: stoneData.category as "Precious" | "Semi-precious" | "Organic" || "Semi-precious",
              priceRangeINR: {
                min: stoneData.pricing?.table?.length > 0 
                  ? Math.min(...(stoneData.pricing?.table || []).map(p => p.pricePerCaratMin).filter(v => v > 0))
                  : 0,
                max: stoneData.pricing?.table?.length > 0
                  ? Math.max(...(stoneData.pricing?.table || []).map(p => p.pricePerCaratMax).filter(v => v > 0))
                  : 0,
              },
              priceRangeUSD: {
                min: stoneData.pricing?.table?.length > 0
                  ? Math.round(Math.min(...(stoneData.pricing?.table || []).map(p => p.pricePerCaratMin).filter(v => v > 0)) / 83)
                  : 0,
                max: stoneData.pricing?.table?.length > 0
                  ? Math.round(Math.max(...(stoneData.pricing?.table || []).map(p => p.pricePerCaratMax).filter(v => v > 0)) / 83)
                  : 0,
              },
              formation: stoneData.formation || "",
              testingGuide: stoneData.idRules ? [
                `RI Range: ${stoneData.idRules.riRange}`,
                `SG Range: ${stoneData.idRules.sgRange}`,
                `Color Clues: ${stoneData.idRules.colorClues}`,
                `Inclusion Clues: ${stoneData.idRules.inclusionClues}`,
                `Treatment Clues: ${stoneData.idRules.treatmentClues}`,
              ] : [],
              marketDemand: stoneData.quickFacts?.marketDemand?.includes("high") ? "High" : 
                           stoneData.quickFacts?.marketDemand?.includes("medium") ? "Medium" : "Low",
              image: stoneImageUrl,
              inclusionImages: uploadedInclusionUrls,
            };

              const updatedStones = [...customStones, newStone];
              setCustomStones(updatedStones);
              await AsyncStorage.setItem('customStones', JSON.stringify(updatedStones));
              setShowAddStoneModal(false);
            };

            // Convert to CustomGemstone format
            const customGem: CustomGemstone = {
              stone_name: stoneData.stoneName,
              variety: stoneData.variety,
              chemical_composition: stoneData.chemicalComposition,
              crystal_system: stoneData.crystalSystem,
              color_range: stoneData.colorRange,
              cause_of_color: stoneData.causeOfColor,
              transparency: stoneData.transparency,
              luster: stoneData.luster,
              hardness: stoneData.hardness,
              specific_gravity: stoneData.specificGravity,
              refractive_index: stoneData.refractiveIndex,
              cleavage: stoneData.cleavage,
              fracture: stoneData.fracture,
              optic_character: stoneData.opticCharacter,
              pleochroism: stoneData.pleochroism,
              typical_inclusions: stoneData.typicalInclusions,
              uv_reaction: stoneData.uvReaction,
              simulants: stoneData.simulants,
              common_treatments: stoneData.commonTreatments,
              occurrences: stoneData.occurrences,
              indian_trade_name: stoneData.indianTradeName,
              category: stoneData.category as "Precious" | "Semi-precious" | "Organic",
              formation: stoneData.formation,
              images: stoneData.images,
              pricing: stoneData.pricing,
              quick_facts: stoneData.quickFacts,
              id_rules: stoneData.idRules,
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
              // Update existing gemstone
              result = await updateCustomGemstone(editingGemstone.id, customGem);
              if (result.success) {
                await loadGemstones();
                Alert.alert('Success', 'Gemstone updated successfully!');
                setShowAddStoneModal(false);
                setEditingGemstone(null);
                if (selectedGem?.id === editingGemstone.id) {
                  setSelectedGem(null);
                }
                return;
              }
            } else {
              // Create new gemstone
              result = await saveCustomGemstone(customGem);
            if (result.success) {
              // Reload gemstones from Supabase
              await loadGemstones();
              
              Alert.alert('Success', 'Custom stone added successfully to the cloud!');
              setShowAddStoneModal(false);
                setEditingGemstone(null);
                return;
              }
            }
            
            if (!result.success) {
              // Supabase save failed - offer to save locally
              Alert.alert(
                'Cloud Save Failed',
                result.error || 'Failed to save to cloud. Would you like to save locally instead?',
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
  stoneName: string;
  variety: FieldValue | null;
  chemicalComposition: string;
  crystalSystem: FieldValue | null;
  colorRange: string;
  causeOfColor: string;
  transparency: FieldValue | null;
  luster: FieldValue | null;
  hardness: FieldValue | null;
  specificGravity: string;
  refractiveIndex: string;
  cleavage: FieldValue | null;
  fracture: FieldValue | null;
  opticCharacter: FieldValue | null;
  pleochroism: FieldValue | null;
  typicalInclusions: string;
  uvReaction: string;
  simulants: string;
  commonTreatments: string;
  occurrences: string;
  indianTradeName: string;
  category: string;
  formation: string;
  images: {
    stoneImages: string[];
    inclusionImages: string[];
  };
  pricing: {
    currency: string;
    table: Array<{
      grade: string;
      color: string;
      clarity: FieldValue | null;
      treatment: FieldValue | null;
      pricePerCaratMin: number;
      pricePerCaratMax: number;
    }>;
  };
  quickFacts: {
    bestIdentifier: string;
    easyConfusion: string;
    marketDemand: string;
  };
  idRules: {
    riRange: string;
    sgRange: string;
    colorClues: string;
    inclusionClues: string;
    treatmentClues: string;
  };
}

function AddStoneModal({
  visible,
  editingGemstone,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingGemstone?: Gemstone | null;
  onClose: () => void;
  onSave: (data: StoneFormData) => void;
}) {
  const { theme } = getThemeSafe();
  
  // Initialize form data from editingGemstone if provided
  const getInitialFormData = (): StoneFormData => {
    if (editingGemstone) {
      // Convert Gemstone to StoneFormData
      return {
        stoneName: editingGemstone.variety,
        variety: { value: editingGemstone.variety, source: "preset" as const },
        chemicalComposition: editingGemstone.chemicalComposition,
        crystalSystem: { value: editingGemstone.crystalSystem, source: "preset" as const },
        colorRange: editingGemstone.colors.join(", "),
        causeOfColor: editingGemstone.causeOfColor,
        transparency: editingGemstone.transparency[0] ? { value: editingGemstone.transparency[0], source: "preset" as const } : null,
        luster: { value: editingGemstone.luster, source: "preset" as const },
        hardness: { value: editingGemstone.hardness.toString(), source: "preset" as const },
        specificGravity: `${editingGemstone.sgMin} - ${editingGemstone.sgMax}`,
        refractiveIndex: `${editingGemstone.riMin} - ${editingGemstone.riMax}`,
        cleavage: { value: editingGemstone.cleavage, source: "preset" as const },
        fracture: { value: editingGemstone.fracture, source: "preset" as const },
        opticCharacter: { value: editingGemstone.opticCharacter, source: "preset" as const },
        pleochroism: { value: editingGemstone.pleochroism, source: "preset" as const },
        typicalInclusions: editingGemstone.inclusions.join(", "),
        uvReaction: editingGemstone.uvResponse,
        simulants: editingGemstone.simulants.join(", "),
        commonTreatments: editingGemstone.treatments.join(", "),
        occurrences: editingGemstone.occurrences.join(", "),
        indianTradeName: editingGemstone.indianName,
        category: editingGemstone.category,
        formation: editingGemstone.formation,
        images: {
          stoneImages: editingGemstone.image ? [editingGemstone.image] : [],
          inclusionImages: editingGemstone.inclusionImages || [],
        },
        pricing: {
          currency: "INR",
          table: [{
            grade: "AAA",
            color: "",
            clarity: null,
            treatment: null,
            pricePerCaratMin: editingGemstone.priceRangeINR.min,
            pricePerCaratMax: editingGemstone.priceRangeINR.max,
          }],
        },
        quickFacts: {
          bestIdentifier: "",
          easyConfusion: "",
          marketDemand: editingGemstone.marketDemand,
        },
        idRules: {
          riRange: `${editingGemstone.riMin} - ${editingGemstone.riMax}`,
          sgRange: `${editingGemstone.sgMin} - ${editingGemstone.sgMax}`,
          colorClues: "",
          inclusionClues: "",
          treatmentClues: "",
        },
      };
    }
    // Default empty form
    return {
    stoneName: "",
    variety: null,
    chemicalComposition: "",
    crystalSystem: null,
    colorRange: "",
    causeOfColor: "",
    transparency: null,
    luster: null,
    hardness: null,
    specificGravity: "",
    refractiveIndex: "",
    cleavage: null,
    fracture: null,
    opticCharacter: null,
    pleochroism: null,
    typicalInclusions: "",
    uvReaction: "",
    simulants: "",
    commonTreatments: "",
    occurrences: "",
    indianTradeName: "",
    category: "Semi-precious",
    formation: "",
    images: {
      stoneImages: [],
      inclusionImages: [],
    },
    pricing: {
      currency: "INR",
      table: [{
        grade: "AAA",
        color: "",
        clarity: null,
        treatment: null,
        pricePerCaratMin: 0,
        pricePerCaratMax: 0,
      }],
    },
    quickFacts: {
      bestIdentifier: "",
      easyConfusion: "",
      marketDemand: "",
    },
    idRules: {
      riRange: "",
      sgRange: "",
      colorClues: "",
      inclusionClues: "",
      treatmentClues: "",
    },
    };
  };

  // Initialize form data - use function to avoid calling on every render
  const [formData, setFormData] = useState<StoneFormData>(() => getInitialFormData());
  
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
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!res.canceled && res.assets?.length) {
      const uris = res.assets.map(asset => asset.uri);
      setFormData({
        ...formData,
        images: {
          ...formData.images,
          stoneImages: [...formData.images.stoneImages, ...uris]
        }
      });
    }
  };

  const pickInclusionImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add images');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!res.canceled && res.assets?.length) {
      const uris = res.assets.map(asset => asset.uri);
      setFormData({
        ...formData,
        images: {
          ...formData.images,
          inclusionImages: [...formData.images.inclusionImages, ...uris]
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

  const addPriceEntry = () => {
    const currentTable = formData.pricing?.table || [];
    setFormData({
      ...formData,
      pricing: {
        currency: formData.pricing?.currency || "INR",
        table: [
          ...currentTable,
          {
            grade: "",
            color: "",
            clarity: null,
            treatment: null,
            pricePerCaratMin: 0,
            pricePerCaratMax: 0,
          }
        ]
      }
    });
  };

  const removePriceEntry = (index: number) => {
    const currentTable = formData.pricing?.table || [];
    if (currentTable.length > 1) {
      setFormData({
        ...formData,
        pricing: {
          currency: formData.pricing?.currency || "INR",
          table: currentTable.filter((_, i) => i !== index)
        }
      });
    }
  };

  const updatePriceEntry = (index: number, field: string, value: string | number | FieldValue) => {
    const currentTable = formData.pricing?.table || [];
    const updatedTable = [...currentTable];
    updatedTable[index] = {
      ...updatedTable[index],
      [field]: value
    };
    setFormData({
      ...formData,
      pricing: {
        currency: formData.pricing?.currency || "INR",
        table: updatedTable
      }
    });
  };

  const handleSave = () => {
    if (!formData.stoneName && !formData.variety) {
      Alert.alert('Error', 'Please enter at least a stone name or variety');
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
            label="Stone Name"
            placeholder="e.g., Ruby"
            value={formData.stoneName}
            onChangeText={(val) => setFormData({ ...formData, stoneName: val })}
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Variety"
            options={VARIETY_OPTIONS}
            value={formData.variety}
            onSelect={(val) => setFormData({ ...formData, variety: val })}
            placeholder="Type custom variety…"
          />
          <View style={styles.formSpacer} />
          <Input
            label="Indian Trade Name"
            placeholder="e.g., Manik"
            value={formData.indianTradeName}
            onChangeText={(val) => setFormData({ ...formData, indianTradeName: val })}
          />
          <View style={styles.formSpacer} />
          <View style={styles.categorySelector}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: '600' }}>
              Category
            </ThemedText>
            <View style={styles.categoryButtons}>
              {(["Precious", "Semi-precious", "Organic"] as const).map(cat => (
                <Pressable
                  key={cat}
                  onPress={() => setFormData({ ...formData, category: cat })}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: formData.category === cat ? theme.primary : theme.inputBackground,
                    }
                  ]}
                >
                  <ThemedText 
                    type="small"
                    style={{ 
                      color: formData.category === cat ? "#FFFFFF" : theme.text,
                      fontWeight: formData.category === cat ? '700' : '500'
                    }}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            CHEMICAL & PHYSICAL PROPERTIES
          </ThemedText>
          <Input
            label="Chemical Composition"
            placeholder="e.g., Al2O3"
            value={formData.chemicalComposition}
            onChangeText={(val) => setFormData({ ...formData, chemicalComposition: val })}
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Crystal System"
            options={CRYSTAL_SYSTEM_OPTIONS}
            value={formData.crystalSystem}
            onSelect={(val) => setFormData({ ...formData, crystalSystem: val })}
            placeholder="Type custom crystal system…"
          />
          <View style={styles.formSpacer} />
          <Input
            label="Color Range"
            placeholder="e.g., Light red to deep blood red"
            value={formData.colorRange}
            onChangeText={(val) => setFormData({ ...formData, colorRange: val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Cause of Color"
            placeholder="e.g., Chromium"
            value={formData.causeOfColor}
            onChangeText={(val) => setFormData({ ...formData, causeOfColor: val })}
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Transparency"
            options={TRANSPARENCY_OPTIONS}
            value={formData.transparency}
            onSelect={(val) => setFormData({ ...formData, transparency: val })}
            placeholder="Type custom transparency…"
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Luster"
            options={LUSTER_OPTIONS}
            value={formData.luster}
            onSelect={(val) => setFormData({ ...formData, luster: val })}
            placeholder="Type custom luster…"
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Hardness (Mohs)"
            options={HARDNESS_OPTIONS}
            value={formData.hardness}
            onSelect={(val) => setFormData({ ...formData, hardness: val })}
            placeholder="Type custom hardness…"
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            OPTICAL PROPERTIES
          </ThemedText>
          <Input
            label="Specific Gravity (min - max)"
            placeholder="e.g., 3.97 - 4.05"
            value={formData.specificGravity}
            onChangeText={(val) => setFormData({ ...formData, specificGravity: val })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Refractive Index (min - max)"
            placeholder="e.g., 1.76 - 1.78"
            value={formData.refractiveIndex}
            onChangeText={(val) => setFormData({ ...formData, refractiveIndex: val })}
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Cleavage"
            options={CLEAVAGE_OPTIONS}
            value={formData.cleavage}
            onSelect={(val) => setFormData({ ...formData, cleavage: val })}
            placeholder="Type custom cleavage…"
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Fracture"
            options={FRACTURE_OPTIONS}
            value={formData.fracture}
            onSelect={(val) => setFormData({ ...formData, fracture: val })}
            placeholder="Type custom fracture…"
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Optic Character"
            options={OPTIC_CHARACTER_OPTIONS}
            value={formData.opticCharacter}
            onSelect={(val) => setFormData({ ...formData, opticCharacter: val })}
            placeholder="Type custom optic character…"
          />
          <View style={styles.formSpacer} />
          <SelectableFieldWithOther
            label="Pleochroism"
            options={PLEOCHROISM_OPTIONS}
            value={formData.pleochroism}
            onSelect={(val) => setFormData({ ...formData, pleochroism: val })}
            placeholder="Type custom pleochroism…"
          />
          <View style={styles.formSpacer} />
          <Input
            label="UV Reaction"
            placeholder="e.g., Strong red fluorescence"
            value={formData.uvReaction}
            onChangeText={(val) => setFormData({ ...formData, uvReaction: val })}
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            INCLUSIONS & CHARACTERISTICS
          </ThemedText>
          <Input
            label="Typical Inclusions (comma-separated)"
            placeholder="e.g., Silk, needles, fingerprints"
            value={formData.typicalInclusions}
            onChangeText={(val) => setFormData({ ...formData, typicalInclusions: val })}
            multiline
          />
          <View style={styles.formSpacer} />
          <Input
            label="Simulants (comma-separated)"
            placeholder="e.g., Spinel, garnet, synthetic ruby"
            value={formData.simulants}
            onChangeText={(val) => setFormData({ ...formData, simulants: val })}
            multiline
          />
          <View style={styles.formSpacer} />
          <Input
            label="Common Treatments (comma-separated)"
            placeholder="e.g., Heat, glass-filled, diffusion"
            value={formData.commonTreatments}
            onChangeText={(val) => setFormData({ ...formData, commonTreatments: val })}
            multiline
          />
          <View style={styles.formSpacer} />
          <Input
            label="Occurrences (comma-separated)"
            placeholder="e.g., Myanmar, Sri Lanka, Mozambique"
            value={formData.occurrences}
            onChangeText={(val) => setFormData({ ...formData, occurrences: val })}
            multiline
          />
          <View style={styles.formSpacer} />
          <Input
            label="Formation"
            placeholder="Geological formation description"
            value={formData.formation}
            onChangeText={(val) => setFormData({ ...formData, formation: val })}
            multiline
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            PRICING (By Color & Clarity)
          </ThemedText>
          {(formData.pricing?.table || []).map((priceEntry, index) => (
            <Card key={index} style={[styles.priceEntryCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.priceEntryHeader}>
                <ThemedText type="small" style={{ fontWeight: '700', color: theme.text }}>
                  Price Entry {index + 1}
                </ThemedText>
                {(formData.pricing?.table || []).length > 1 && (
                  <Pressable
                    onPress={() => removePriceEntry(index)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      { opacity: pressed ? 0.6 : 1 }
                    ]}
                  >
                    <Feather name="trash-2" size={18} color={theme.danger} />
                  </Pressable>
                )}
              </View>
              <View style={styles.formSpacer} />
              <Input
                label="Grade"
                placeholder="e.g., AAA"
                value={priceEntry.grade}
                onChangeText={(val) => updatePriceEntry(index, 'grade', val)}
              />
              <View style={styles.formSpacer} />
              <Input
                label="Color"
                placeholder="e.g., Vivid Red (Pigeon Blood)"
                value={priceEntry.color}
                onChangeText={(val) => updatePriceEntry(index, 'color', val)}
              />
              <View style={styles.formSpacer} />
              <SelectableFieldWithOther
                label="Clarity"
                options={CLARITY_OPTIONS}
                value={priceEntry.clarity}
                onSelect={(val) => updatePriceEntry(index, 'clarity', val)}
                placeholder="Type custom clarity…"
              />
              <View style={styles.formSpacer} />
              <SelectableFieldWithOther
                label="Treatment"
                options={TREATMENT_OPTIONS}
                value={priceEntry.treatment}
                onSelect={(val) => updatePriceEntry(index, 'treatment', val)}
                placeholder="Type custom treatment…"
              />
              <View style={styles.formSpacer} />
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Price Per Carat Min (INR)"
                    placeholder="0"
                    value={priceEntry.pricePerCaratMin.toString()}
                    onChangeText={(val) => updatePriceEntry(index, 'pricePerCaratMin', parseFloat(val) || 0)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Input
                    label="Price Per Carat Max (INR)"
                    placeholder="0"
                    value={priceEntry.pricePerCaratMax.toString()}
                    onChangeText={(val) => updatePriceEntry(index, 'pricePerCaratMax', parseFloat(val) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Card>
          ))}
          <View style={styles.formSpacer} />
          <Button
            onPress={addPriceEntry}
            variant="outline"
            style={{ marginBottom: Spacing.md }}
          >
            Add Another Price Entry
          </Button>

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            QUICK FACTS
          </ThemedText>
          <Input
            label="Best Identifier"
            placeholder="e.g., Silk + RI 1.76–1.78"
            value={formData.quickFacts.bestIdentifier}
            onChangeText={(val) => setFormData({
              ...formData,
              quickFacts: { ...formData.quickFacts, bestIdentifier: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Easy Confusion"
            placeholder="e.g., Red spinel, garnet"
            value={formData.quickFacts.easyConfusion}
            onChangeText={(val) => setFormData({
              ...formData,
              quickFacts: { ...formData.quickFacts, easyConfusion: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Market Demand"
            placeholder="e.g., Very high astrology demand"
            value={formData.quickFacts.marketDemand}
            onChangeText={(val) => setFormData({
              ...formData,
              quickFacts: { ...formData.quickFacts, marketDemand: val }
            })}
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            IDENTIFICATION RULES
          </ThemedText>
          <Input
            label="RI Range"
            placeholder="e.g., 1.76 - 1.78"
            value={formData.idRules.riRange}
            onChangeText={(val) => setFormData({
              ...formData,
              idRules: { ...formData.idRules, riRange: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="SG Range"
            placeholder="e.g., 3.97 - 4.05"
            value={formData.idRules.sgRange}
            onChangeText={(val) => setFormData({
              ...formData,
              idRules: { ...formData.idRules, sgRange: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Color Clues"
            placeholder="e.g., Pure red = chromium rich"
            value={formData.idRules.colorClues}
            onChangeText={(val) => setFormData({
              ...formData,
              idRules: { ...formData.idRules, colorClues: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Inclusion Clues"
            placeholder="e.g., Silk needles indicate natural ruby"
            value={formData.idRules.inclusionClues}
            onChangeText={(val) => setFormData({
              ...formData,
              idRules: { ...formData.idRules, inclusionClues: val }
            })}
          />
          <View style={styles.formSpacer} />
          <Input
            label="Treatment Clues"
            placeholder="e.g., Glass-filled shows bubbles"
            value={formData.idRules.treatmentClues}
            onChangeText={(val) => setFormData({
              ...formData,
              idRules: { ...formData.idRules, treatmentClues: val }
            })}
          />

          <ThemedText type="caption" style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: Spacing.xl }]}>
            IMAGES
          </ThemedText>
          
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, fontWeight: '600' }}>
            Stone Images
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
                <View key={index} style={styles.imagePreviewContainer}>
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
                <View key={index} style={styles.imagePreviewContainer}>
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

          <View style={styles.formSpacer} />
          <View style={styles.formSpacer} />
          
          <Button
            onPress={handleSave}
            variant="primary"
            style={{ marginBottom: Spacing.xl }}
          >
            {editingGemstone ? 'Update Stone' : 'Save Stone'}
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
  value: string; 
  mono?: boolean;
  valueColor?: string;
}) {
  const { theme } = getThemeSafe();
  
  return (
    <View style={styles.dataRow}>
      <ThemedText 
        type="small" 
        style={{ 
          color: theme.textSecondary, 
          flex: 1,
          fontWeight: '600',
        }}
      >
        {label}
      </ThemedText>
      <ThemedText 
        type={mono ? "mono" : "body"}
        style={[
          valueColor ? { color: valueColor } : { color: theme.text },
          { flex: 1.5, textAlign: 'right' }
        ]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function getGemColor(color?: string): string {
  if (!color || color === 'undefined' || color === 'null') {
    return "#6B46C1"; // Default color
  }
  
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
  
  try {
    for (const [key, val] of Object.entries(colorMap)) {
      if (color.toLowerCase().includes(key.toLowerCase())) {
        return val;
      }
    }
  } catch (error) {
    // If any error occurs during string processing, return default color
    console.warn('Error processing color:', color, error);
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
    paddingHorizontal: Spacing.lg,
    height: 52,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 2,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
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
  gemInfo: {
    flex: 1,
    justifyContent: "space-between",
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
    borderBottomWidth: 1.5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    position: 'relative',
  },
  heroImageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -140,
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -120,
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  modernHeroInfo: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    minHeight: 120,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  heroInfoContent: {
    gap: Spacing.sm,
  },
  titleRow: {
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    marginBottom: Spacing.xs,
    textAlign: "left",
    fontWeight: '700',
    lineHeight: 32,
  },
  heroSubtitle: {
    marginBottom: Spacing.sm,
    textAlign: "left",
    opacity: 0.9,
    lineHeight: 20,
  },
  heroBadges: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  heroBadgeSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Compact Header Styles
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120, // Further reduced height to remove extra space
    borderBottomWidth: 1,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, // 20px spacing from left side
    paddingVertical: Spacing.md,
    height: '100%',
    gap: 20, // 20px spacing between elements
  },
  compactImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9', // Static color instead of theme reference
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  compactInfo: {
    width: '70%', // 70% width for text section (30:70 ratio)
    justifyContent: 'center',
    maxWidth: 200, // Max width constraint for text card view
  },
  compactTitleRow: {
    marginBottom: 4,
  },
  compactTitle: {
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
  },
  compactSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  compactBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 6,
  },
  compactBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
  testStep: {
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
  imageLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    backgroundColor: "transparent",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginHorizontal: 2,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  propertyCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  cardSectionTitle: {
    marginBottom: Spacing.lg,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  propertyGrid: {
    flexDirection: "column",
    gap: Spacing.md,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  propertyLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  propertyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
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
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    gap: Spacing.md,
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
  testStep: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
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
  modalScrollView: {
    flex: 1,
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
});
