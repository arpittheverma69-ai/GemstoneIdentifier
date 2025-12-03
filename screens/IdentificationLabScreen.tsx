import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  Modal,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { ChipSelect } from "@/components/ChipSelect";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { 
  identifyGemstone, 
  Gemstone,
  CRYSTAL_SYSTEMS,
  TRANSPARENCY_OPTIONS,
  LUSTER_OPTIONS,
  COMMON_INCLUSIONS,
  COMMON_COLORS,
} from "@/constants/gemstoneData";

interface IdentificationResult {
  gemstone: Gemstone;
  confidence: number;
  reasons: string[];
}

export default function IdentificationLabScreen() {
  const { theme } = useTheme();
  
  const [image, setImage] = useState<string | null>(null);
  const [riMin, setRiMin] = useState("");
  const [riMax, setRiMax] = useState("");
  const [sg, setSg] = useState("");
  const [hardness, setHardness] = useState("");
  const [color, setColor] = useState("");
  const [transparency, setTransparency] = useState("");
  const [luster, setLuster] = useState("");
  const [crystalSystem, setCrystalSystem] = useState("");
  const [inclusions, setInclusions] = useState<string[]>([]);
  
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<IdentificationResult[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    physical: true,
    optical: false,
    structural: false,
    special: false,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      pickImage();
      return;
    }
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAnalyze = () => {
    const params = {
      riMin: riMin ? parseFloat(riMin) : undefined,
      riMax: riMax ? parseFloat(riMax) : undefined,
      sg: sg ? parseFloat(sg) : undefined,
      hardness: hardness ? parseFloat(hardness) : undefined,
      color: color || undefined,
      transparency: transparency || undefined,
      crystalSystem: crystalSystem || undefined,
    };

    const identificationResults = identifyGemstone(params);
    setResults(identificationResults);
    setShowResults(true);
  };

  const clearForm = () => {
    setImage(null);
    setRiMin("");
    setRiMax("");
    setSg("");
    setHardness("");
    setColor("");
    setTransparency("");
    setLuster("");
    setCrystalSystem("");
    setInclusions([]);
    setResults([]);
  };

  const renderSection = (
    title: string, 
    key: string, 
    icon: keyof typeof Feather.glyphMap,
    children: React.ReactNode
  ) => (
    <Card style={styles.section}>
      <Pressable
        onPress={() => toggleSection(key)}
        style={styles.sectionHeader}
      >
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name={icon} size={16} color={theme.primary} />
          </View>
          <ThemedText type="body" style={styles.sectionTitle}>{title}</ThemedText>
        </View>
        <Feather 
          name={expandedSections[key] ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.textSecondary} 
        />
      </Pressable>
      {expandedSections[key] ? (
        <View style={styles.sectionContent}>
          {children}
        </View>
      ) : null}
    </Card>
  );

  const primaryResult = results[0];

  return (
    <>
      <ScreenKeyboardAwareScrollView>
        <Pressable
          onPress={image ? undefined : pickImage}
          style={[
            styles.imageUpload,
            { 
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
            },
          ]}
        >
          {image ? (
            <>
              <Image source={{ uri: image }} style={styles.uploadedImage} />
              <View style={styles.imageActions}>
                <Pressable
                  onPress={takePhoto}
                  style={[styles.imageButton, { backgroundColor: theme.primary }]}
                >
                  <Feather name="camera" size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={pickImage}
                  style={[styles.imageButton, { backgroundColor: theme.primary }]}
                >
                  <Feather name="image" size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => setImage(null)}
                  style={[styles.imageButton, { backgroundColor: theme.danger }]}
                >
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.uploadIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="camera" size={32} color={theme.primary} />
              </View>
              <ThemedText type="body" style={styles.uploadText}>
                Upload Gemstone Photo
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tap to select from gallery or take a photo
              </ThemedText>
              <View style={styles.uploadButtons}>
                <Pressable
                  onPress={takePhoto}
                  style={({ pressed }) => [
                    styles.uploadButton,
                    { 
                      backgroundColor: theme.primary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather name="camera" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: "#FFFFFF" }}>Camera</ThemedText>
                </Pressable>
                <Pressable
                  onPress={pickImage}
                  style={({ pressed }) => [
                    styles.uploadButton,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather name="image" size={16} color={theme.text} />
                  <ThemedText type="small">Gallery</ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>

        {renderSection("Physical Properties", "physical", "box", (
          <View style={styles.inputGrid}>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Input
                  label="RI Min"
                  placeholder="1.544"
                  value={riMin}
                  onChangeText={setRiMin}
                  keyboardType="decimal-pad"
                  mono
                />
              </View>
              <View style={styles.inputHalf}>
                <Input
                  label="RI Max"
                  placeholder="1.553"
                  value={riMax}
                  onChangeText={setRiMax}
                  keyboardType="decimal-pad"
                  mono
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Input
                  label="Specific Gravity"
                  placeholder="2.65"
                  value={sg}
                  onChangeText={setSg}
                  keyboardType="decimal-pad"
                  mono
                />
              </View>
              <View style={styles.inputHalf}>
                <Input
                  label="Hardness"
                  placeholder="7"
                  value={hardness}
                  onChangeText={setHardness}
                  keyboardType="decimal-pad"
                  mono
                />
              </View>
            </View>
          </View>
        ))}

        {renderSection("Optical Properties", "optical", "eye", (
          <View style={styles.inputGrid}>
            <Dropdown
              label="Color"
              placeholder="Select color"
              value={color}
              options={[...COMMON_COLORS]}
              onSelect={setColor}
            />
            <View style={styles.spacer} />
            <Dropdown
              label="Transparency"
              placeholder="Select transparency"
              value={transparency}
              options={[...TRANSPARENCY_OPTIONS]}
              onSelect={setTransparency}
            />
            <View style={styles.spacer} />
            <Dropdown
              label="Luster"
              placeholder="Select luster"
              value={luster}
              options={[...LUSTER_OPTIONS]}
              onSelect={setLuster}
            />
          </View>
        ))}

        {renderSection("Structural Properties", "structural", "grid", (
          <View style={styles.inputGrid}>
            <Dropdown
              label="Crystal System"
              placeholder="Select crystal system"
              value={crystalSystem}
              options={[...CRYSTAL_SYSTEMS]}
              onSelect={setCrystalSystem}
            />
          </View>
        ))}

        {renderSection("Special Characteristics", "special", "star", (
          <View style={styles.inputGrid}>
            <ChipSelect
              label="Inclusions Observed"
              options={COMMON_INCLUSIONS}
              selected={inclusions}
              onSelect={setInclusions}
            />
          </View>
        ))}

        <View style={styles.bottomSpacer} />
      </ScreenKeyboardAwareScrollView>

      <FloatingActionButton
        icon="search"
        onPress={handleAnalyze}
        disabled={!riMin && !riMax && !sg && !color && !hardness}
      />

      <Modal
        visible={showResults}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResults(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="h3">Identification Results</ThemedText>
            <Pressable
              onPress={() => setShowResults(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {results.length > 0 ? (
              <>
                <View style={styles.confidenceContainer}>
                  <View 
                    style={[
                      styles.confidenceCircle,
                      { 
                        borderColor: primaryResult.confidence >= 70 
                          ? theme.success 
                          : primaryResult.confidence >= 40 
                            ? theme.warning 
                            : theme.danger,
                      }
                    ]}
                  >
                    <ThemedText type="h1" style={styles.confidenceText}>
                      {primaryResult.confidence}%
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Confidence
                    </ThemedText>
                  </View>
                </View>

                <Card style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View>
                      <ThemedText type="h3">{primaryResult.gemstone.variety}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {primaryResult.gemstone.indianName}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: theme.primary + "20" }
                    ]}>
                      <ThemedText type="caption" style={{ color: theme.primary }}>
                        {primaryResult.gemstone.category}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    MATCHING REASONS
                  </ThemedText>
                  {primaryResult.reasons.map((reason, idx) => (
                    <View key={idx} style={styles.reasonRow}>
                      <Feather name="check-circle" size={16} color={theme.success} />
                      <ThemedText type="small" style={styles.reasonText}>
                        {reason}
                      </ThemedText>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    GEMOLOGICAL DATA
                  </ThemedText>
                  <View style={styles.dataGrid}>
                    <View style={styles.dataItem}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>RI Range</ThemedText>
                      <ThemedText type="mono">{primaryResult.gemstone.riMin} - {primaryResult.gemstone.riMax}</ThemedText>
                    </View>
                    <View style={styles.dataItem}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>SG Range</ThemedText>
                      <ThemedText type="mono">{primaryResult.gemstone.sgMin} - {primaryResult.gemstone.sgMax}</ThemedText>
                    </View>
                    <View style={styles.dataItem}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>Hardness</ThemedText>
                      <ThemedText type="mono">{primaryResult.gemstone.hardness}</ThemedText>
                    </View>
                    <View style={styles.dataItem}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>Crystal</ThemedText>
                      <ThemedText type="small">{primaryResult.gemstone.crystalSystem}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    COMMON TREATMENTS
                  </ThemedText>
                  <View style={styles.treatmentChips}>
                    {primaryResult.gemstone.treatments.map((treatment, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.warning + "20" }]}>
                        <ThemedText type="caption" style={{ color: theme.warning }}>
                          {treatment}
                        </ThemedText>
                      </View>
                    ))}
                  </View>

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    POSSIBLE SIMULANTS
                  </ThemedText>
                  <View style={styles.treatmentChips}>
                    {primaryResult.gemstone.simulants.slice(0, 4).map((simulant, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: theme.danger + "20" }]}>
                        <ThemedText type="caption" style={{ color: theme.danger }}>
                          {simulant}
                        </ThemedText>
                      </View>
                    ))}
                  </View>

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    ORIGIN POSSIBILITIES
                  </ThemedText>
                  <ThemedText type="small">
                    {primaryResult.gemstone.occurrences.join(", ")}
                  </ThemedText>

                  <View style={styles.divider} />

                  <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    PRICE RANGE (INR)
                  </ThemedText>
                  <ThemedText type="body" style={{ color: theme.success }}>
                    {primaryResult.gemstone.priceRangeINR.min.toLocaleString()} - {primaryResult.gemstone.priceRangeINR.max.toLocaleString()} per carat
                  </ThemedText>
                </Card>

                {results.length > 1 ? (
                  <>
                    <ThemedText type="h4" style={styles.otherMatchesTitle}>
                      Other Possible Matches
                    </ThemedText>
                    {results.slice(1).map((result, idx) => (
                      <Card key={idx} style={styles.otherMatchCard}>
                        <View style={styles.otherMatchHeader}>
                          <ThemedText type="body" style={{ fontWeight: "600" }}>
                            {result.gemstone.variety}
                          </ThemedText>
                          <View style={[
                            styles.confidenceBadge,
                            { 
                              backgroundColor: result.confidence >= 50 
                                ? theme.success + "20" 
                                : theme.warning + "20" 
                            }
                          ]}>
                            <ThemedText 
                              type="caption" 
                              style={{ 
                                color: result.confidence >= 50 ? theme.success : theme.warning 
                              }}
                            >
                              {result.confidence}%
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          {result.gemstone.indianName}
                        </ThemedText>
                      </Card>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <View style={styles.noResults}>
                <Feather name="alert-circle" size={48} color={theme.textSecondary} />
                <ThemedText type="h4" style={styles.noResultsText}>
                  No Matches Found
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
                  Try entering more properties or adjusting the values for better results.
                </ThemedText>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => {
                setShowResults(false);
                clearForm();
              }}
              style={({ pressed }) => [
                styles.footerButton,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={18} color={theme.text} />
              <ThemedText type="body">New Search</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowResults(false)}
              style={({ pressed }) => [
                styles.footerButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="check" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF" }}>Done</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imageUpload: {
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  uploadedImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.sm - 2,
  },
  imageActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  uploadText: {
    marginBottom: Spacing.xs,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionContent: {
    marginTop: Spacing.lg,
  },
  inputGrid: {
    gap: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  spacer: {
    height: Spacing.xs,
  },
  bottomSpacer: {
    height: 100,
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
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
  },
  confidenceContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  confidenceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceText: {
    fontSize: 36,
  },
  resultCard: {
    marginBottom: Spacing.lg,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(128,128,128,0.2)",
    marginVertical: Spacing.md,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  reasonText: {
    flex: 1,
  },
  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  dataItem: {
    width: "45%",
  },
  treatmentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  otherMatchesTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  otherMatchCard: {
    marginBottom: Spacing.sm,
  },
  otherMatchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  noResultsText: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
});
