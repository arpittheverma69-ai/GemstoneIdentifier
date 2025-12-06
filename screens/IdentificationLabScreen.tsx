import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator, ActionSheetIOS, Alert, Modal } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/Input';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ChipSelect } from '@/components/ChipSelect';
import { ResultCard, ResultCardData } from '@/components/ResultCard';
import { GEMSTONE_DATABASE } from '@/constants/gemstoneData';
import { logGemMeasurement } from '@/services/supabaseClient';
import { saveIdentificationHistory } from '@/services/identificationService';

type ColorOption = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'Pink' | 'Purple' | 'Brown' | 'Black' | 'Colorless' | 'Multicolor';
type Transparency = 'Transparent' | 'Translucent' | 'Opaque';
type StoneType = 'Ruby' | 'Sapphire' | 'Emerald' | 'Topaz' | 'Garnet' | 'Zircon' | 'Other' | 'Not sure';

export default function IdentificationLabScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([]);
  const [transparency, setTransparency] = useState<Transparency>('Transparent');
  const [stoneGuess, setStoneGuess] = useState<StoneType>('Not sure');
  const [riValue, setRiValue] = useState('');
  const [sgValue, setSgValue] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultCardData | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // Optical properties for quick identification modal
  const [isDR, setIsDR] = useState<boolean | null>(null); // Double Refractive
  const [hasPleochroism, setHasPleochroism] = useState<boolean | null>(null);
  const [hasUVResponse, setHasUVResponse] = useState<boolean | null>(null);
  const [hasInclusions, setHasInclusions] = useState<boolean | null>(null);

  // Advanced parameters state
  const [luster, setLuster] = useState<string[]>([]);
  const [crystalSystem, setCrystalSystem] = useState<string[]>([]);
  const [pleochroism, setPleochroism] = useState<'Present' | 'Not visible' | 'Not checked' | null>(null);
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [uvResponse, setUvResponse] = useState<string[]>([]);

  const toggleColor = (color: ColorOption) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) {
        return prev.filter(c => c !== color);
      }
      if (prev.length >= 2) {
        return prev; // limit to max 2 colors
      }
      return [...prev, color];
    });
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  const handleTakePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Open Camera', 'Open Gallery'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) openCamera();
          else if (buttonIndex === 2) pickFromGallery();
        }
      );
    } else {
      Alert.alert(
        'Add Photo',
        'Choose a source',
        [
          { text: 'Open Camera', onPress: openCamera },
          { text: 'Open Gallery', onPress: pickFromGallery },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  const handleIdentify = async () => {
    console.log('Identify button pressed');
    // Reset optical properties
    setIsDR(null);
    setHasPleochroism(null);
    setHasUVResponse(null);
    setHasInclusions(null);
    setResult(null);
    // Open modal to ask optical properties
    setShowResultModal(true);
  };

  const handleFinalIdentify = async () => {
    try {
    setIsLoading(true);
      const ri = parseFloat((riValue || '').split('-')[0]);
      const riMax = riValue.includes('-') ? parseFloat(riValue.split('-')[1]) : ri;
      const sg = parseFloat(sgValue || '');

    const scores = GEMSTONE_DATABASE.map(gem => {
      let score = 0;
        let matchRI = false;
        let matchSG = false;
        let matchColor = false;
        let matchClarity = false;

      if (selectedColors.length) {
        const colorMatch = selectedColors.some(c => gem.colors.map(x => x.toLowerCase()).includes(c.toLowerCase()));
          if (colorMatch) {
            score += 30;
            matchColor = true;
          }
      }
      if (transparency) {
        const tMatch = gem.transparency.map(x => x.toLowerCase()).includes(transparency.toLowerCase());
          if (tMatch) {
            score += 15;
            matchClarity = true;
      }
        }
      if (!isNaN(ri)) {
          if (ri >= gem.riMin && ri <= gem.riMax) {
            score += 25;
            matchRI = true;
      }
        }
      if (!isNaN(sg)) {
          if (sg >= gem.sgMin && sg <= gem.sgMax) {
            score += 20;
            matchSG = true;
          }
      }
      if (stoneGuess !== 'Not sure' && stoneGuess.toLowerCase() === gem.variety.toLowerCase()) score += 10;
        
        // Add optical properties scoring
        if (isDR !== null) {
          const isGemDR = gem.opticCharacter.toLowerCase().includes('dr') || gem.opticCharacter.toLowerCase().includes('double');
          if (isDR === isGemDR) {
            score += 15;
          }
        }
        if (hasPleochroism !== null) {
          const gemHasPleochroism = !gem.pleochroism.toLowerCase().includes('none') && !gem.pleochroism.toLowerCase().includes('not');
          if (hasPleochroism === gemHasPleochroism) {
            score += 10;
          }
        }
        if (hasUVResponse !== null) {
          const gemHasUV = !gem.uvResponse.toLowerCase().includes('inert') && !gem.uvResponse.toLowerCase().includes('none');
          if (hasUVResponse === gemHasUV) {
            score += 8;
          }
        }
        if (hasInclusions !== null) {
          const gemHasInclusions = gem.inclusions.length > 0 && !gem.inclusions.some(inc => inc.toLowerCase().includes('none'));
          if (hasInclusions === gemHasInclusions) {
            score += 7;
          }
        }
        
        return { gem, score, matchRI, matchSG, matchColor, matchClarity };
    }).sort((a, b) => b.score - a.score);

    const primary = scores[0];
      const secondary = scores.slice(1, 4).filter(s => s.score > 0);
      
      // Always show a result, even if score is 0 (use first gem as default)
      if (!primary || primary.score === 0) {
        // Use the first gem from database or user's guess if available
        const defaultGem = stoneGuess !== 'Not sure' 
          ? GEMSTONE_DATABASE.find(g => g.variety.toLowerCase() === stoneGuess.toLowerCase()) || GEMSTONE_DATABASE[0]
          : GEMSTONE_DATABASE[0];
        
        if (!defaultGem) {
          Alert.alert('Error', 'Unable to identify gemstone. Please provide more details.');
          setIsLoading(false);
          return;
        }

    const breakdown = {
          stoneName: defaultGem.variety,
          confidence: '10%',
          shortReasoning: {
            matchRI: !isNaN(ri) ? `RI ${riValue} provided but needs verification` : '',
            matchSG: !isNaN(sg) ? `SG ${sgValue} provided but needs verification` : '',
            matchColor: selectedColors.length ? `${selectedColors.join(', ')} color noted` : '',
            matchClarity: transparency ? `${transparency} transparency noted` : '',
          },
          otherPossibleStones: [],
          gemData: {
            variety: defaultGem.variety,
            chemicalComposition: defaultGem.chemicalComposition,
            crystalSystem: defaultGem.crystalSystem,
            colorRange: defaultGem.colors.join(', '),
            causeOfColor: defaultGem.causeOfColor,
            transparency: defaultGem.transparency.join(', '),
            luster: defaultGem.luster,
            hardness: defaultGem.hardness.toString(),
            specificGravity: `${defaultGem.sgMin}–${defaultGem.sgMax}`,
            refractiveIndex: `${defaultGem.riMin}–${defaultGem.riMax}`,
            cleavage: defaultGem.cleavage,
            fracture: defaultGem.fracture,
            opticCharacter: defaultGem.opticCharacter,
            pleochroism: defaultGem.pleochroism,
            typicalInclusions: defaultGem.inclusions.join(', '),
            uvReaction: defaultGem.uvResponse,
            simulants: defaultGem.simulants.join(', '),
            commonTreatments: defaultGem.treatments.join(', '),
            occurrences: defaultGem.occurrences.join(', '),
            indianTradeName: defaultGem.indianName,
          },
          actionButtons: {
            saveToInventory: true,
            createCertificate: true,
          },
    };

    setResult(breakdown);
        setIsLoading(false);
        return;
      }

      const primaryGem = primary.gem;
      const confidence = Math.min(100, Math.max(10, primary.score));

      // Generate short reasoning
      const shortReasoning = {
        matchRI: !isNaN(ri) && primary.matchRI 
          ? `RI ${riValue} matches ${primaryGem.variety} range ${primaryGem.riMin}–${primaryGem.riMax}`
          : !isNaN(ri) 
            ? `RI ${riValue} is outside ${primaryGem.variety} range ${primaryGem.riMin}–${primaryGem.riMax}`
            : '',
        matchSG: !isNaN(sg) && primary.matchSG
          ? `SG ${sgValue} fits ${primaryGem.variety} SG ${primaryGem.sgMin}–${primaryGem.sgMax}`
          : !isNaN(sg)
            ? `SG ${sgValue} is outside ${primaryGem.variety} range ${primaryGem.sgMin}–${primaryGem.sgMax}`
            : '',
        matchColor: selectedColors.length && primary.matchColor
          ? `${selectedColors.join(', ')} is common for ${primaryGem.variety}`
          : selectedColors.length
            ? `${selectedColors.join(', ')} is uncommon for ${primaryGem.variety}`
            : '',
        matchClarity: transparency && primary.matchClarity
          ? `${transparency} transparency matches ${primaryGem.variety}`
          : transparency
            ? `${transparency} transparency may not match ${primaryGem.variety}`
            : '',
      };

      const breakdown = {
        stoneName: primaryGem.variety,
        confidence: `${confidence}%`,
        shortReasoning,
        otherPossibleStones: secondary.map(s => ({
          name: s.gem.variety,
          confidence: `${Math.max(5, Math.min(100, s.score))}%`
        })),
        gemData: {
          variety: primaryGem.variety,
          chemicalComposition: primaryGem.chemicalComposition,
          crystalSystem: primaryGem.crystalSystem,
          colorRange: primaryGem.colors.join(', '),
          causeOfColor: primaryGem.causeOfColor,
          transparency: primaryGem.transparency.join(', '),
          luster: primaryGem.luster,
          hardness: primaryGem.hardness.toString(),
          specificGravity: `${primaryGem.sgMin}–${primaryGem.sgMax}`,
          refractiveIndex: `${primaryGem.riMin}–${primaryGem.riMax}`,
          cleavage: primaryGem.cleavage,
          fracture: primaryGem.fracture,
          opticCharacter: primaryGem.opticCharacter,
          pleochroism: primaryGem.pleochroism,
          typicalInclusions: primaryGem.inclusions.join(', '),
          uvReaction: primaryGem.uvResponse,
          simulants: primaryGem.simulants.join(', '),
          commonTreatments: primaryGem.treatments.join(', '),
          occurrences: primaryGem.occurrences.join(', '),
          indianTradeName: primaryGem.indianName,
        },
        actionButtons: {
          saveToInventory: true,
          createCertificate: true,
        },
      };

      console.log('Setting result:', JSON.stringify(breakdown, null, 2));
      setResult(breakdown);
      setIsLoading(false);

      // Save to identification history in Supabase
      try {
        await saveIdentificationHistory({
          stone_name: breakdown.stoneName,
          confidence: breakdown.confidence,
          short_reasoning: breakdown.shortReasoning,
          other_possible_stones: breakdown.otherPossibleStones,
          gem_data: breakdown.gemData,
          image_url: imageUri || undefined,
        });
      } catch (error) {
        console.log('Error saving identification history:', error);
      }

      // Also log measurement (legacy)
      try {
        await logGemMeasurement({
          image_url: imageUri,
          colors: selectedColors,
          transparency,
          ri: riValue || null,
          sg: sgValue || null,
          stone_guess: stoneGuess,
          luster,
          crystal_system: crystalSystem,
          pleochroism,
          inclusions,
          uv_response: uvResponse,
        });
      } catch (error) {
        console.log('Error logging measurement:', error);
      }
    } catch (error) {
      console.error('Error identifying gemstone:', error);
      Alert.alert('Error', 'An error occurred while identifying the gemstone. Please try again.');
    setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h1" style={styles.headerTitle}>Identification Lab</ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Add a photo or a few details to identify the stone.
            </ThemedText>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]} 
              onPress={() => navigation.navigate('IdentificationHistory')}
            >
              <Feather name="clock" size={20} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]} 
              onPress={() => navigation.navigate('IdentificationHelp')}
            >
              <Feather name="help-circle" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Identification Card */}
        <Card elevation={2} variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
          <ThemedText type="h3" style={styles.cardTitle}>Quick Identification</ThemedText>
            <ThemedText type="body" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Just add a photo and a couple of details. The rest is automatic.
          </ThemedText>
          </View>

          {/* Photo Input */}
          <TouchableOpacity 
            style={[
              styles.photoInput, 
              !imageUri && styles.photoInputEmpty,
              { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }
            ]}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <>
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.imagePreview} 
                  resizeMode="cover"
                />
                <View style={[styles.photoActions, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <TouchableOpacity 
                    style={[styles.photoActionButton, { backgroundColor: theme.primary }]} 
                    onPress={handleTakePhoto}
                  >
                    <Feather name="edit-2" size={16} color="#FFFFFF" />
                    <ThemedText style={[styles.photoActionText, { color: '#FFFFFF', marginLeft: 6 }]}>Change</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoActionButton, { backgroundColor: theme.danger }]}
                    onPress={() => setImageUri(null)}
                  >
                    <Feather name="trash-2" size={16} color="#FFFFFF" />
                    <ThemedText style={[styles.photoActionText, { color: '#FFFFFF', marginLeft: 6 }]}>Remove</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={[styles.cameraIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <Feather name="camera" size={40} color={theme.primary} />
                </View>
                <ThemedText style={[styles.photoPlaceholderText, { color: theme.text, fontWeight: '600' }]}>Add Stone Photo</ThemedText>
                <ThemedText style={[styles.photoPlaceholderSubtext, { color: theme.textSecondary }]}>Tap to take photo or choose from gallery</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Stone Type Guess */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>DO YOU HAVE A GUESS?</ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Garnet', 'Zircon', 'Other', 'Not sure'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: stoneGuess === type ? theme.primary : theme.backgroundSecondary,
                      borderColor: stoneGuess === type ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setStoneGuess(type as StoneType)}
                  activeOpacity={0.7}
                >
                  <ThemedText 
                    style={[
                      styles.chipText,
                      { 
                        color: stoneGuess === type ? theme.buttonText : theme.text,
                        fontWeight: stoneGuess === type ? '600' : '500',
                      }
                    ]}
                  >
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Color Selector */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>COLOR</ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContainer}
            >
              {['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Brown', 'Black', 'Colorless', 'Multicolor'].map(color => {
                const isSelected = selectedColors.includes(color as ColorOption);
                return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.chip,
                      { 
                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }
                  ]}
                  onPress={() => toggleColor(color as ColorOption)}
                    activeOpacity={0.7}
                >
                  <View 
                    style={[
                      styles.colorDot, 
                        { 
                          backgroundColor: color.toLowerCase() === 'colorless' ? '#E2E8F0' : color.toLowerCase(),
                          borderWidth: isSelected ? 2 : 0,
                          borderColor: '#FFFFFF',
                        }
                    ]} 
                  />
                  <ThemedText 
                    style={[
                      styles.chipText,
                        { 
                          color: isSelected ? theme.buttonText : theme.text,
                          fontWeight: isSelected ? '600' : '500',
                        }
                    ]}
                  >
                    {color}
                  </ThemedText>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Transparency */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>TRANSPARENCY</ThemedText>
            <View style={styles.row}>
              {(['Transparent', 'Translucent', 'Opaque'] as const).map(option => {
                const isSelected = transparency === option;
                return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentedButton,
                      { 
                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }
                  ]}
                  onPress={() => setTransparency(option)}
                    activeOpacity={0.7}
                >
                  <ThemedText 
                    style={[
                      styles.segmentedButtonText,
                        { 
                          color: isSelected ? theme.buttonText : theme.text,
                          fontWeight: isSelected ? '600' : '500',
                        }
                    ]}
                  >
                    {option}
                  </ThemedText>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* RI & SG Inputs */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Measurements (optional)</ThemedText>
            <View style={styles.measurementRow}>
              <View style={styles.measurementInputContainer}>
                <ThemedText style={styles.measurementLabel}>RI</ThemedText>
                <Input
                  placeholder="e.g. 1.61 or 1.76-1.78"
                  value={riValue}
                  onChangeText={setRiValue}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.measurementInputContainer}>
                <ThemedText style={styles.measurementLabel}>SG</ThemedText>
                <Input
                  placeholder="e.g. 3.99"
                  value={sgValue}
                  onChangeText={setSgValue}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <ThemedText style={styles.hintText}>
              Skip if you don\u2019t know.
            </ThemedText>
          </View>

          {/* Identify Button */}
          <Button 
            onPress={() => {
              console.log('Button onPress called');
              handleIdentify();
            }}
            style={styles.identifyButton}
            variant="primary"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Identifying…' : 'Identify Stone'}
          </Button>
          {isLoading ? (
            <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null}
          <ThemedText style={[styles.helperText, { color: theme.textSecondary }]}>
            I'll match RI, SG, color, inclusions and more against the gem database.
          </ThemedText>
        </Card>

        {/* Advanced Parameters Card */}
        <Card elevation={2} variant="elevated" style={styles.card}>
          <TouchableOpacity 
            style={styles.advancedHeader}
            onPress={() => setIsAdvancedOpen(!isAdvancedOpen)}
            activeOpacity={0.7}
          >
            <ThemedText type="h3">Advanced Parameters</ThemedText>
            <Feather 
              name={isAdvancedOpen ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>

          {isAdvancedOpen && (
            <View style={[styles.advancedContent, { borderTopColor: theme.border }]}>
              <ChipSelect 
                label="Luster"
                options={["Vitreous","Resinous","Greasy","Adamantine","Waxy","Dull"]}
                selected={luster}
                onSelect={(vals) => setLuster(vals)}
                multi
              />
              <View style={{ height: Spacing.lg }} />
              <ChipSelect 
                label="Crystal System"
                options={["Cubic","Trigonal","Hexagonal","Orthorhombic","Monoclinic","Triclinic","Amorphous"]}
                selected={crystalSystem}
                onSelect={(vals) => setCrystalSystem(vals)}
                multi
              />
              <View style={{ height: Spacing.lg }} />
              <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>PLEOCHROISM</ThemedText>
              <View style={styles.row}>
                {(['Present','Not visible','Not checked'] as const).map(option => {
                  const isSelected = pleochroism === option;
                  return (
                  <TouchableOpacity
                    key={option}
                      style={[
                        styles.segmentedButton, 
                        { 
                          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        }
                      ]}
                    onPress={() => setPleochroism(option)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[
                        styles.segmentedButtonText, 
                        { 
                          color: isSelected ? theme.buttonText : theme.text,
                          fontWeight: isSelected ? '600' : '500',
                        }
                      ]}>
                        {option}
                      </ThemedText>
                  </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: Spacing.lg }} />
              <ChipSelect 
                label="Inclusions"
                options={["Needles","Silk","Fingerprints","Crystals","Feathers","Color zoning","Bubbles","None visible"]}
                selected={inclusions}
                onSelect={(vals) => setInclusions(vals)}
                multi
              />
              <View style={{ height: Spacing.lg }} />
              <ChipSelect 
                label="UV Reaction"
                options={["Inert","Weak","Strong","Red glow","Blue glow","Yellow/Orange","Not tested"]}
                selected={uvResponse}
                onSelect={(vals) => setUvResponse(vals)}
                multi
              />
            </View>
          )}
        </Card>

      </ScrollView>

      {/* Result Modal with Optical Properties */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResultModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Quick Optical Properties</ThemedText>
            <TouchableOpacity
              onPress={() => setShowResultModal(false)}
              style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {!result ? (
              <>
                <ThemedText type="body" style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Answer a few quick questions to refine the identification
                </ThemedText>

                {/* Optical Properties Questions */}
                <View style={styles.questionsContainer}>
                  {/* DR Question */}
                  <Card style={styles.questionCard}>
                    <ThemedText type="h4" style={styles.questionTitle}>Is it Double Refractive (DR)?</ThemedText>
                    <ThemedText type="small" style={[styles.questionHint, { color: theme.textSecondary }]}>
                      Check if you see doubling of facet edges
                    </ThemedText>
                    <View style={styles.trueFalseRow}>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: isDR === true ? theme.success : theme.backgroundSecondary,
                            borderColor: isDR === true ? theme.success : theme.border,
                          }
                        ]}
                        onPress={() => setIsDR(true)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: isDR === true ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Yes
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: isDR === false ? theme.danger : theme.backgroundSecondary,
                            borderColor: isDR === false ? theme.danger : theme.border,
                          }
                        ]}
                        onPress={() => setIsDR(false)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: isDR === false ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          No
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: isDR === null ? theme.primary : theme.backgroundSecondary,
                            borderColor: isDR === null ? theme.primary : theme.border,
                          }
                        ]}
                        onPress={() => setIsDR(null)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: isDR === null ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Skip
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  {/* Pleochroism Question */}
                  <Card style={styles.questionCard}>
                    <ThemedText type="h4" style={styles.questionTitle}>Does it show Pleochroism?</ThemedText>
                    <ThemedText type="small" style={[styles.questionHint, { color: theme.textSecondary }]}>
                      Different colors when viewed from different angles
                    </ThemedText>
                    <View style={styles.trueFalseRow}>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasPleochroism === true ? theme.success : theme.backgroundSecondary,
                            borderColor: hasPleochroism === true ? theme.success : theme.border,
                          }
                        ]}
                        onPress={() => setHasPleochroism(true)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasPleochroism === true ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Yes
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasPleochroism === false ? theme.danger : theme.backgroundSecondary,
                            borderColor: hasPleochroism === false ? theme.danger : theme.border,
                          }
                        ]}
                        onPress={() => setHasPleochroism(false)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasPleochroism === false ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          No
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasPleochroism === null ? theme.primary : theme.backgroundSecondary,
                            borderColor: hasPleochroism === null ? theme.primary : theme.border,
                          }
                        ]}
                        onPress={() => setHasPleochroism(null)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasPleochroism === null ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Skip
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  {/* UV Response Question */}
                  <Card style={styles.questionCard}>
                    <ThemedText type="h4" style={styles.questionTitle}>Does it react to UV light?</ThemedText>
                    <ThemedText type="small" style={[styles.questionHint, { color: theme.textSecondary }]}>
                      Shows fluorescence or glow under UV
                    </ThemedText>
                    <View style={styles.trueFalseRow}>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasUVResponse === true ? theme.success : theme.backgroundSecondary,
                            borderColor: hasUVResponse === true ? theme.success : theme.border,
                          }
                        ]}
                        onPress={() => setHasUVResponse(true)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasUVResponse === true ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Yes
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasUVResponse === false ? theme.danger : theme.backgroundSecondary,
                            borderColor: hasUVResponse === false ? theme.danger : theme.border,
                          }
                        ]}
                        onPress={() => setHasUVResponse(false)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasUVResponse === false ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          No
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasUVResponse === null ? theme.primary : theme.backgroundSecondary,
                            borderColor: hasUVResponse === null ? theme.primary : theme.border,
                          }
                        ]}
                        onPress={() => setHasUVResponse(null)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasUVResponse === null ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Skip
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  {/* Inclusions Question */}
                  <Card style={styles.questionCard}>
                    <ThemedText type="h4" style={styles.questionTitle}>Does it have visible inclusions?</ThemedText>
                    <ThemedText type="small" style={[styles.questionHint, { color: theme.textSecondary }]}>
                      Internal features visible under magnification
                    </ThemedText>
                    <View style={styles.trueFalseRow}>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasInclusions === true ? theme.success : theme.backgroundSecondary,
                            borderColor: hasInclusions === true ? theme.success : theme.border,
                          }
                        ]}
                        onPress={() => setHasInclusions(true)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasInclusions === true ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Yes
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasInclusions === false ? theme.danger : theme.backgroundSecondary,
                            borderColor: hasInclusions === false ? theme.danger : theme.border,
                          }
                        ]}
                        onPress={() => setHasInclusions(false)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasInclusions === false ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          No
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.trueFalseButton,
                          { 
                            backgroundColor: hasInclusions === null ? theme.primary : theme.backgroundSecondary,
                            borderColor: hasInclusions === null ? theme.primary : theme.border,
                          }
                        ]}
                        onPress={() => setHasInclusions(null)}
                      >
                        <ThemedText style={[
                          styles.trueFalseText,
                          { color: hasInclusions === null ? '#FFFFFF' : theme.text, fontWeight: '600' }
                        ]}>
                          Skip
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </View>

                {/* Identify Button */}
                <Button
                  onPress={handleFinalIdentify}
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  style={styles.modalIdentifyButton}
                >
                  {isLoading ? 'Identifying…' : 'Get Result'}
                </Button>
                {isLoading && (
                  <View style={{ alignItems: 'center', marginTop: Spacing.md }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.resultContainer}>
          <ResultCard
            breakdown={result}
                  onSaveToInventory={() => {
                    Alert.alert('Saved to Inventory', 'Your identification has been saved.');
                    setShowResultModal(false);
                  }}
                  onCreateCertificate={() => {
                    navigation.getParent()?.navigate('CertificateTab');
                    setShowResultModal(false);
                  }}
                />
                <Button
                  onPress={() => {
                    setResult(null);
                    setIsDR(null);
                    setHasPleochroism(null);
                    setHasUVResponse(null);
                    setHasInclusions(null);
                  }}
                  variant="outline"
                  style={styles.resetButton}
                >
                  Identify Another Stone
                </Button>
              </View>
            )}
      </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing["2xl"],
  },
  headerTitle: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: Spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    padding: Spacing.xl,
  },
  cardHeader: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    marginBottom: 0,
    lineHeight: 22,
  },
  photoInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  photoInputEmpty: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  cameraIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoPlaceholderText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  photoPlaceholderSubtext: {
    fontSize: 13,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 220,
  },
  photoActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segmentedButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  segmentedButtonText: {
    fontSize: 14,
  },
  measurementRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  measurementInputContainer: {
    flex: 1,
  },
  measurementLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  identifyButton: {
    marginTop: Spacing.lg,
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advancedContent: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1.5,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing["5xl"],
  },
  modalSubtitle: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  questionsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  questionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  questionTitle: {
    marginBottom: Spacing.xs,
  },
  questionHint: {
    marginBottom: Spacing.md,
    fontSize: 13,
  },
  trueFalseRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  trueFalseButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trueFalseText: {
    fontSize: 14,
  },
  modalIdentifyButton: {
    marginTop: Spacing.lg,
  },
  resultContainer: {
    gap: Spacing.lg,
  },
  resetButton: {
    marginTop: Spacing.lg,
  },
});
