import React, { useState, useMemo, useRef, useEffect } from "react";
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
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, BorderRadius } from "@/constants/theme";
import { GEMSTONE_DATABASE, GEM_CATEGORIES, Gemstone } from "@/constants/gemstoneData";
import { getCustomGemstones, saveCustomGemstone, CustomGemstone } from "@/services/gemstoneService";
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

export default function GemDatabaseScreen() {
  const { theme } = useTheme();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGem, setSelectedGem] = useState<Gemstone | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "formation" | "market" | "testing">("properties");
  const [showAddStoneModal, setShowAddStoneModal] = useState(false);
  const [customStones, setCustomStones] = useState<Gemstone[]>([]);
  const [isLoadingGems, setIsLoadingGems] = useState(false);
  
  // Animation for header shrinking
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 280;
  const HEADER_MIN_HEIGHT = 100;
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });
  
  const heroImageScale = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });
  
  const heroImageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });

  // Load gemstones from Supabase (or fallback to local)
  const loadGemstones = async () => {
    setIsLoadingGems(true);
    try {
      // Try to load from Supabase
      const customGems = await getCustomGemstones();
      if (customGems.length > 0) {
        setCustomStones(customGems);
      } else {
        // Fallback to AsyncStorage for backward compatibility
        const stored = await AsyncStorage.getItem('customStones');
        if (stored) {
          setCustomStones(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Error loading gemstones:', error);
      // Fallback to AsyncStorage
      try {
        const stored = await AsyncStorage.getItem('customStones');
        if (stored) {
          setCustomStones(JSON.parse(stored));
        }
      } catch (fallbackError) {
        console.error('Error loading from AsyncStorage:', fallbackError);
      }
    } finally {
      setIsLoadingGems(false);
    }
  };

  useEffect(() => {
    loadGemstones();
  }, []);

  // Merge custom stones with database
  const allGems = useMemo(() => {
    return [...GEMSTONE_DATABASE, ...customStones];
  }, [customStones]);

  const filteredGems = useMemo(() => {
    return allGems.filter(gem => {
      const matchesSearch = 
        gem.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gem.indianName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        selectedCategory === "All" || gem.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, allGems]);

  const renderGemItem = ({ item }: { item: Gemstone }) => (
    <Pressable
      onPress={() => setSelectedGem(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <Card style={styles.gemCard}>
        <View style={styles.gemCardContent}>
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
              { backgroundColor: getGemColor(item.colors[0]) + "30" }
            ]}
          >
            <Feather 
              name="hexagon" 
              size={28} 
              color={getGemColor(item.colors[0])} 
            />
          </View>
          )}
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
            { paddingBottom: (paddingBottom || 0) + 80 }
          ]}
          scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
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
              <View style={{ width: 40 }} />
            </View>

            {/* Enhanced Hero Section with Image - Animated */}
            <Animated.View 
              style={[
                styles.heroSection,
                { 
                  backgroundColor: getGemColor(selectedGem.colors[0]) + "15",
                  borderBottomLeftRadius: BorderRadius.xl,
                  borderBottomRightRadius: BorderRadius.xl,
                  height: headerHeight,
                  overflow: 'hidden',
                }
              ]}
            >
              {selectedGem.image ? (
                <Animated.View 
                  style={[
                    styles.heroImageContainer,
                    {
                      transform: [{ scale: heroImageScale }],
                      opacity: heroImageOpacity,
                    }
                  ]}
                >
                  <ExpoImage
                    source={{ uri: selectedGem.image }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={[styles.imageOverlay, { backgroundColor: getGemColor(selectedGem.colors[0]) + "10" }]} />
                </Animated.View>
              ) : (
                <Animated.View 
                  style={[
                    styles.heroIconContainer, 
                    { 
                      backgroundColor: getGemColor(selectedGem.colors[0]) + "30",
                      transform: [{ scale: heroImageScale }],
                      opacity: heroImageOpacity,
                    }
              ]}
            >
              <Feather 
                name="hexagon" 
                    size={100} 
                color={getGemColor(selectedGem.colors[0])} 
              />
                </Animated.View>
              )}
              
              <Animated.View 
                style={[
                  styles.heroInfo,
                  {
                    transform: [{ scale: titleScale }],
                  }
                ]}
              >
                <ThemedText type="h3" style={[styles.heroTitle, { color: theme.text }]}>
                {selectedGem.variety}
              </ThemedText>
                <ThemedText type="caption" style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                {selectedGem.indianName}
              </ThemedText>
                
                <Animated.View 
                  style={[
                    styles.heroBadges,
                    { opacity: heroImageOpacity }
                  ]}
                >
              <View style={[styles.heroBadge, { backgroundColor: theme.primary }]}>
                    <Feather name="award" size={14} color="#FFFFFF" />
                    <ThemedText type="caption" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: '600' }}>
                  {selectedGem.category}
                </ThemedText>
              </View>
                  <View style={[styles.heroBadge, styles.heroBadgeSecondary, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="hard-drive" size={14} color={theme.text} />
                    <ThemedText type="caption" style={{ color: theme.text, marginLeft: 6, fontWeight: '600' }}>
                      {selectedGem.hardness} Mohs
                    </ThemedText>
            </View>
                </Animated.View>
              </Animated.View>
            </Animated.View>

            {/* Enhanced Tab Container */}
            <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
              {(["properties", "formation", "market", "testing"] as const).map(tab => (
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
                        <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                          Refractive Index
                        </ThemedText>
                        <ThemedText type="h4" style={{ color: theme.primary, fontWeight: '700' }}>
                          {selectedGem.riMin} - {selectedGem.riMax}
                        </ThemedText>
                      </View>
                      <View style={[styles.propertyItem, { backgroundColor: theme.success + "10" }]}>
                        <Feather name="activity" size={18} color={theme.success} />
                        <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                          Specific Gravity
                        </ThemedText>
                        <ThemedText type="h4" style={{ color: theme.success, fontWeight: '700' }}>
                          {selectedGem.sgMin} - {selectedGem.sgMax}
                        </ThemedText>
                      </View>
                      <View style={[styles.propertyItem, { backgroundColor: theme.secondary + "10" }]}>
                        <Feather name="hard-drive" size={18} color={theme.secondary} />
                        <ThemedText type="caption" style={[styles.propertyLabel, { color: theme.textSecondary }]}>
                          Hardness
                        </ThemedText>
                        <ThemedText type="h4" style={{ color: theme.secondary, fontWeight: '700' }}>
                          {selectedGem.hardness} Mohs
                        </ThemedText>
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
            </Animated.ScrollView>
          </ThemedView>
        ) : null}
      </Modal>

      {/* Add Custom Stone Modal */}
      <AddStoneModal
        visible={showAddStoneModal}
        onClose={() => setShowAddStoneModal(false)}
        onSave={async (stoneData) => {
          try {
            // Helper function to extract value from FieldValue
            const getValue = (field: FieldValue | null): string => {
              return field?.value || "";
            };

            // Helper function to save locally
            const saveLocally = async () => {
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
                  ? Math.min(...stoneData.pricing.table.map(p => p.pricePerCaratMin).filter(v => v > 0))
                  : 0,
                max: stoneData.pricing?.table?.length > 0
                  ? Math.max(...stoneData.pricing.table.map(p => p.pricePerCaratMax).filter(v => v > 0))
                  : 0,
              },
              priceRangeUSD: {
                min: stoneData.pricing?.table?.length > 0
                  ? Math.round(Math.min(...stoneData.pricing.table.map(p => p.pricePerCaratMin).filter(v => v > 0)) / 83)
                  : 0,
                max: stoneData.pricing?.table?.length > 0
                  ? Math.round(Math.max(...stoneData.pricing.table.map(p => p.pricePerCaratMax).filter(v => v > 0)) / 83)
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
              image: stoneData.images?.stoneImages?.[0],
              inclusionImages: stoneData.images?.inclusionImages || [],
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

            // User is authenticated - try to save to Supabase
            const result = await saveCustomGemstone(customGem);
            
            if (result.success) {
              // Reload gemstones from Supabase
              await loadGemstones();
              
              Alert.alert('Success', 'Custom stone added successfully to the cloud!');
              setShowAddStoneModal(false);
            } else {
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
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: StoneFormData) => void;
}) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<StoneFormData>({
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
  });

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
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
        table: [
          ...formData.pricing.table,
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
    if (formData.pricing.table.length > 1) {
      setFormData({
        ...formData,
        pricing: {
          ...formData.pricing,
          table: formData.pricing.table.filter((_, i) => i !== index)
        }
      });
    }
  };

  const updatePriceEntry = (index: number, field: string, value: string | number | FieldValue) => {
    const updatedTable = [...formData.pricing.table];
    updatedTable[index] = {
      ...updatedTable[index],
      [field]: value
    };
    setFormData({
      ...formData,
      pricing: {
        ...formData.pricing,
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
            Add Custom Stone
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
          {formData.pricing.table.map((priceEntry, index) => (
            <Card key={index} style={[styles.priceEntryCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.priceEntryHeader}>
                <ThemedText type="small" style={{ fontWeight: '700', color: theme.text }}>
                  Price Entry {index + 1}
                </ThemedText>
                {formData.pricing.table.length > 1 && (
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
            📷 Pick Stone Images
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
            Pick Inclusion Images
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
            Save Stone
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
  const { theme } = useTheme();
  
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
  },
  gemCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  gemCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  gemThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
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
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    position: "relative",
    overflow: "hidden",
  },
  heroImageContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  heroImage: {
    width: 240,
    height: 240,
    borderRadius: BorderRadius.xl,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroInfo: {
    alignItems: "center",
    width: "100%",
  },
  heroTitle: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  heroSubtitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  heroBadges: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  heroBadgeSecondary: {
    borderWidth: 1.5,
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
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
  },
  propertyItem: {
    flex: 1,
    minWidth: "30%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  propertyLabel: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
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
