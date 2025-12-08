import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator, ActionSheetIOS, Alert, Modal, TextInput, Pressable } from 'react-native';
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
import { geminiService, IdentificationQuestion, IdentificationResult } from '@/services/geminiService';
import * as FileSystem from 'expo-file-system/legacy';

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
  
  // AI States
  const [aiQuestions, setAiQuestions] = useState<IdentificationQuestion[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAIQuestions, setShowAIQuestions] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiResult, setAiResult] = useState<IdentificationResult | null>(null);
  
  // Buying Guide States
  const [showBuyingGuide, setShowBuyingGuide] = useState(false);
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

  // Real gemstone-specific optical tests using actual database data
  const getOpticalTests = useCallback((gemstone: any) => {
    const gemstoneName = gemstone.variety.toLowerCase();
    
    if (gemstoneName.includes('ruby') || gemstoneName.includes('corundum')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Ruby is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Red to purple-red colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Ruby has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES, COLOR ZONING, SILK'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'INERT'} - Ruby shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity?.split('–')[0] || '3.99'}-${gemstone.specificGravity?.split('–')[1] || '3.99'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('emerald')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Emerald is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Green to blue-green colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Emerald has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'BLACK & BROWN MICA, RAIN LIKE INC'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'INERT'} - Emerald shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity?.split('–')[0] || '2.67'}-${gemstone.specificGravity?.split('–')[1] || '2.80'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('sapphire')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Sapphire is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'DICHROIC'} - Blue to violet-blue colors`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Sapphire has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES, COLOR ZONING, SILK'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'INERT'} - Sapphire shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity?.split('–')[0] || '3.99'}-${gemstone.specificGravity?.split('–')[1] || '3.99'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('tourmaline')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'D.R.'} - Tourmaline is doubly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'STRONG'} - Strong color variation`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'VITREOUS'} - Tourmaline has vitreous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'TRICHITES, NEEDLES, GROWTH TUBES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'INERT'} - Tourmaline shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity?.split('–')[0] || '3.05'}-${gemstone.specificGravity?.split('–')[1] || '3.15'} - Heavy liquid test`, checked: false },
      ];
    } else if (gemstoneName.includes('garnet')) {
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'S.R.'} - Garnet is singly refractive`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'NONE'} - Garnet has no pleochroism`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'RESINOUS'} - Garnet has resinous luster`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'CRYSTALS, NEEDLES'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'INERT'} - Garnet shows inert response`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity?.split('–')[0] || '3.70'}-${gemstone.specificGravity?.split('–')[1] || '4.20'} - Heavy liquid test`, checked: false },
      ];
    } else {
      // Generic for other gemstones - use actual data from database
      return [
        { id: 9, text: `Check SR/DR: ${gemstone.opticCharacter || 'Unknown'} - ${gemstone.variety} optical character`, checked: false },
        { id: 10, text: `Pleochroism: ${gemstone.pleochroism || 'Unknown'} - Check with dichroscope`, checked: false },
        { id: 11, text: `Luster: ${gemstone.luster || 'Unknown'} - ${gemstone.variety} luster type`, checked: false },
        { id: 12, text: `Inclusions: ${gemstone.typicalInclusions?.split(', ').slice(0, 2).join(', ') || 'Characteristic inclusions'}`, checked: false },
        { id: 13, text: `UV Test: ${gemstone.uvReaction || 'Check fluorescence under UV light'}`, checked: false },
        { id: 14, text: `SG Test: ${gemstone.specificGravity || 'Unknown'} - Specific gravity test`, checked: false },
      ];
    }
  }, []);

  const [opticalTests, setOpticalTests] = useState(() => result?.gemData ? getOpticalTests(result.gemData) : []);

  // Update optical tests when result changes
  useEffect(() => {
    if (result?.gemData) {
      setOpticalTests(getOpticalTests(result.gemData));
    }
  }, [result, getOpticalTests]);

  // Calculate price function
  const calculatePrice = () => {
    if (!caratWeight || parseFloat(caratWeight) <= 0 || !result?.gemData) {
      Alert.alert('Error', 'Please enter a valid carat weight');
      return;
    }

    const weight = parseFloat(caratWeight);
    // Use default pricing since priceRange properties don't exist
    const basePriceINR = customPricePerCarat ? 
      parseFloat(customPricePerCarat) : 
      10000; // Default base price
    
    const basePriceUSD = customPricePerCarat ? 
      parseFloat(customPricePerCarat) / 83 : // Approximate conversion rate
      120; // Default base price in USD

    // Apply quality multiplier
    const qualityMultiplier = qualityMultipliers[qualityGrade as keyof typeof qualityMultipliers];
    
    // Apply price adjustment
    const adjustmentMultiplier = 1 + (parseFloat(priceAdjustment) || 0) / 100;
    
    // Calculate final price
    const finalPriceINR = Math.round(weight * basePriceINR * qualityMultiplier * adjustmentMultiplier);
    const finalPriceUSD = Math.round(weight * basePriceUSD * qualityMultiplier * adjustmentMultiplier);
    
    setCalculatedPrice({ inr: finalPriceINR, usd: finalPriceUSD });
  };

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
    setIsLoading(true);
    try {
      const ri = parseFloat(riValue);
      const sg = parseFloat(sgValue);

      // Comprehensive database matching using all parameters
      const matches = GEMSTONE_DATABASE.map(gem => {
        let score = 0;
        let maxScore = 0;
        const reasons = [];

        // RI matching (weighted heavily)
        if (!isNaN(ri)) {
          maxScore += 30;
          if (ri >= gem.riMin && ri <= gem.riMax) {
            score += 30;
            reasons.push(`RI ${ri} matches ${gem.riMin}-${gem.riMax}`);
          } else {
            const riDiff = Math.min(Math.abs(ri - gem.riMin), Math.abs(ri - gem.riMax));
            if (riDiff <= 0.05) {
              score += 15;
              reasons.push(`RI ${ri} close to ${gem.riMin}-${gem.riMax}`);
            }
          }
        } else {
          maxScore += 10; // Less penalty if RI not provided
        }

        // SG matching (weighted heavily)
        if (!isNaN(sg)) {
          maxScore += 25;
          if (sg >= gem.sgMin && sg <= gem.sgMax) {
            score += 25;
            reasons.push(`SG ${sg} matches ${gem.sgMin}-${gem.sgMax}`);
          } else {
            const sgDiff = Math.min(Math.abs(sg - gem.sgMin), Math.abs(sg - gem.sgMax));
            if (sgDiff <= 0.1) {
              score += 12;
              reasons.push(`SG ${sg} close to ${gem.sgMin}-${gem.sgMax}`);
            }
          }
        } else {
          maxScore += 8;
        }

        // Color matching (very important)
        if (selectedColors.length > 0) {
          maxScore += 20;
          const gemColors = gem.colors.map(c => c.toLowerCase());
          const matchingColors = selectedColors.filter(color => 
            gemColors.some(gemColor => 
              gemColor.includes(color.toLowerCase()) || 
              color.toLowerCase().includes(gemColor)
            )
          );
          if (matchingColors.length > 0) {
            const colorScore = (matchingColors.length / selectedColors.length) * 20;
            score += colorScore;
            reasons.push(`Colors ${matchingColors.join(', ')} match`);
          }
        } else {
          maxScore += 5;
        }

        // Transparency matching
        if (transparency) {
          maxScore += 10;
          if (gem.transparency.includes(transparency)) {
            score += 10;
            reasons.push(`Transparency ${transparency} matches`);
          }
        } else {
          maxScore += 3;
        }

        // Luster matching (from advanced parameters)
        if (luster.length > 0) {
          maxScore += 10;
          if (luster.includes(gem.luster)) {
            score += 10;
            reasons.push(`Luster ${gem.luster} matches`);
          }
        } else {
          maxScore += 3;
        }

        // Crystal System matching
        if (crystalSystem.length > 0) {
          maxScore += 8;
          if (crystalSystem.includes(gem.crystalSystem)) {
            score += 8;
            reasons.push(`Crystal System ${gem.crystalSystem} matches`);
          }
        } else {
          maxScore += 2;
        }

        // Pleochroism matching
        if (pleochroism) {
          maxScore += 7;
          if (pleochroism === 'Present' && gem.pleochroism !== 'NONE') {
            score += 7;
            reasons.push(`Pleochroism ${gem.pleochroism} matches`);
          } else if (pleochroism === 'Not visible' && gem.pleochroism === 'NONE') {
            score += 7;
            reasons.push(`No pleochroism matches`);
          }
        } else {
          maxScore += 2;
        }

        // Inclusions matching
        if (inclusions.length > 0) {
          maxScore += 10;
          const gemInclusions = gem.inclusions.map(i => i.toLowerCase());
          const matchingInclusions = inclusions.filter(inc => 
            gemInclusions.some(gemInc => 
              gemInc.includes(inc.toLowerCase()) || 
              inc.toLowerCase().includes(gemInc)
            )
          );
          if (matchingInclusions.length > 0) {
            const inclusionScore = (matchingInclusions.length / inclusions.length) * 10;
            score += inclusionScore;
            reasons.push(`Inclusions ${matchingInclusions.join(', ')} match`);
          }
        } else {
          maxScore += 3;
        }

        // UV Response matching
        if (uvResponse.length > 0) {
          maxScore += 8;
          if (uvResponse.includes(gem.uvResponse)) {
            score += 8;
            reasons.push(`UV Response ${gem.uvResponse} matches`);
          }
        } else {
          maxScore += 2;
        }

        // User guess bonus
        if (stoneGuess !== 'Not sure') {
          maxScore += 5;
          if (gem.variety.toLowerCase().includes(stoneGuess.toLowerCase()) || 
              stoneGuess.toLowerCase().includes(gem.variety.toLowerCase())) {
            score += 5;
            reasons.push(`Matches user guess: ${stoneGuess}`);
          }
        } else {
          maxScore += 2;
        }

        const confidence = maxScore > 0 ? (score / maxScore) * 100 : 0;
        
        return {
          gem,
          score: confidence,
          reasons: reasons.length > 0 ? reasons : ['Basic match']
        };
      }).sort((a, b) => b.score - a.score);

      const primaryMatch = matches[0];
      const secondary = matches.slice(1, 4);

      if (!primaryMatch || primaryMatch.score < 20) {
        Alert.alert('Low Confidence', 'Unable to identify with current parameters. Please provide more details.');
        setIsLoading(false);
        return;
      }

      const breakdown = {
        stoneName: primaryMatch.gem.variety,
        confidence: `${Math.round(primaryMatch.score)}%`,
        shortReasoning: {
          matchRI: !isNaN(ri) ? `RI ${riValue} ${ri >= primaryMatch.gem.riMin && ri <= primaryMatch.gem.riMax ? 'matches' : 'close to'} ${primaryMatch.gem.riMin}–${primaryMatch.gem.riMax}` : '',
          matchSG: !isNaN(sg) ? `SG ${sgValue} ${sg >= primaryMatch.gem.sgMin && sg <= primaryMatch.gem.sgMax ? 'matches' : 'close to'} ${primaryMatch.gem.sgMin}–${primaryMatch.gem.sgMax}` : '',
          matchColor: selectedColors.length ? `${selectedColors.join(', ')} ${selectedColors.some(color => primaryMatch.gem.colors.some(gemColor => 
            gemColor.toLowerCase().includes(color.toLowerCase()) || 
            color.toLowerCase().includes(gemColor.toLowerCase())
          )) ? 'matches' : 'partially matches'} ${primaryMatch.gem.variety}` : '',
          matchClarity: transparency ? `${transparency} transparency ${primaryMatch.gem.transparency.includes(transparency) ? 'matches' : 'not typical for'} ${primaryMatch.gem.variety}` : '',
        },
        otherPossibleStones: secondary.map(s => ({
          name: s.gem.variety,
          confidence: `${Math.max(5, Math.min(100, s.score))}%`,
          reasons: s.reasons
        })),
        gemData: {
          variety: primaryMatch.gem.variety,
          chemicalComposition: primaryMatch.gem.chemicalComposition,
          crystalSystem: primaryMatch.gem.crystalSystem,
          colorRange: primaryMatch.gem.colors.join(', '),
          causeOfColor: primaryMatch.gem.causeOfColor,
          transparency: primaryMatch.gem.transparency.join(', '),
          luster: primaryMatch.gem.luster,
          hardness: primaryMatch.gem.hardness.toString(),
          specificGravity: `${primaryMatch.gem.sgMin}–${primaryMatch.gem.sgMax}`,
          refractiveIndex: `${primaryMatch.gem.riMin}–${primaryMatch.gem.riMax}`,
          cleavage: primaryMatch.gem.cleavage,
          fracture: primaryMatch.gem.fracture,
          opticCharacter: primaryMatch.gem.opticCharacter,
          pleochroism: primaryMatch.gem.pleochroism,
          typicalInclusions: primaryMatch.gem.inclusions.join(', '),
          uvReaction: primaryMatch.gem.uvResponse,
          simulants: primaryMatch.gem.simulants.join(', '),
          commonTreatments: primaryMatch.gem.treatments.join(', '),
          occurrences: primaryMatch.gem.occurrences.join(', '),
          indianTradeName: primaryMatch.gem.indianName,
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

      setShowResultModal(true);
    } catch (error) {
      console.error('Error identifying gemstone:', error);
      Alert.alert('Error', 'Failed to identify gemstone. Please try again.');
      setIsLoading(false);
    }
  };

  // AI Functions
  const analyzeImageWithAI = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsAnalyzingImage(true);
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Analyze with Gemini
      const analysis = await geminiService.analyzeGemstoneImage(base64);
      setImageAnalysis(analysis);

      // Generate questions based on analysis
      const observations = {
        imageAnalysis: analysis.initialAnalysis,
        visualProperties: analysis.suggestedProperties,
        manual: {
          colors: selectedColors,
          transparency,
          ri: riValue,
          sg: sgValue
        }
      };

      const questions = await geminiService.generateIdentificationQuestions(observations);
      setAiQuestions(questions);
      setShowAIQuestions(true);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleAIAnswer = (questionId: string, answer: any) => {
    setAiAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Move to next question
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, identify gemstone
      identifyWithAI();
    }
  };

  const identifyWithAI = async () => {
    setIsLoading(true);
    try {
      let imageBase64 = '';
      if (imageUri) {
        imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
      }

      const observations = {
        imageAnalysis: imageAnalysis?.initialAnalysis || '',
        visualProperties: imageAnalysis?.suggestedProperties || {},
        manual: {
          colors: selectedColors,
          transparency,
          ri: riValue,
          sg: sgValue,
          hardness: null, // Could add hardness input
        }
      };

      const result = await geminiService.identifyGemstone(
        imageBase64,
        observations,
        aiAnswers
      );

      setAiResult(result);
      
      // Convert to ResultCardData format
      if (result.matches.length > 0) {
        const primaryMatch = result.matches[0];
        const breakdown: ResultCardData = {
          stoneName: result.gemstone,
          confidence: `${Math.round(result.confidence * 100)}%`,
          shortReasoning: {
            matchRI: result.reasoning,
            matchSG: '',
            matchColor: '',
            matchClarity: '',
          },
          otherPossibleStones: result.matches.slice(1).map(m => ({
            name: m.gemstone.variety,
            confidence: `${Math.round(m.score * 100)}%`,
            reasons: m.reasons
          })),
          gemData: {
            variety: primaryMatch.gemstone.variety,
            chemicalComposition: primaryMatch.gemstone.chemicalComposition,
            crystalSystem: primaryMatch.gemstone.crystalSystem,
            colorRange: primaryMatch.gemstone.colors.join(', '),
            causeOfColor: primaryMatch.gemstone.causeOfColor,
            transparency: primaryMatch.gemstone.transparency.join(', '),
            luster: primaryMatch.gemstone.luster,
            hardness: primaryMatch.gemstone.hardness.toString(),
            specificGravity: `${primaryMatch.gemstone.sgMin}–${primaryMatch.gemstone.sgMax}`,
            refractiveIndex: `${primaryMatch.gemstone.riMin}–${primaryMatch.gemstone.riMax}`,
            cleavage: primaryMatch.gemstone.cleavage,
            fracture: primaryMatch.gemstone.fracture,
            opticCharacter: primaryMatch.gemstone.opticCharacter,
            pleochroism: primaryMatch.gemstone.pleochroism,
            typicalInclusions: primaryMatch.gemstone.inclusions.join(', '),
            uvReaction: primaryMatch.gemstone.uvResponse,
            simulants: primaryMatch.gemstone.simulants.join(', '),
            commonTreatments: primaryMatch.gemstone.treatments.join(', '),
            occurrences: primaryMatch.gemstone.occurrences.join(', '),
            indianTradeName: primaryMatch.gemstone.indianName,
          },
          actionButtons: {
            saveToInventory: true,
            createCertificate: true,
          },
        };
        setResult(breakdown);
        setShowResultModal(true);
      }
    } catch (error) {
      console.error('Error with AI identification:', error);
      Alert.alert('Error', 'Failed to identify with AI. Please try again.');
    } finally {
      setIsLoading(false);
      setShowAIQuestions(false);
      setCurrentQuestionIndex(0);
    }
  };

  const resetAI = () => {
    setAiQuestions([]);
    setAiAnswers({});
    setCurrentQuestionIndex(0);
    setShowAIQuestions(false);
    setImageAnalysis(null);
    setAiResult(null);
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
                  <TouchableOpacity 
                    style={[styles.photoActionButton, { backgroundColor: theme.success }]}
                    onPress={analyzeImageWithAI}
                    disabled={isAnalyzingImage}
                  >
                    {isAnalyzingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="cpu" size={16} color="#FFFFFF" />
                    )}
                    <ThemedText style={[styles.photoActionText, { color: '#FFFFFF', marginLeft: 6 }]}>
                      {isAnalyzingImage ? 'Analyzing...' : 'AI Analyze'}
                    </ThemedText>
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
                          fontWeight: isSelected ? '500' : '400',
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
          
          {/* AI Identification Button */}
          {imageUri && (
            <Button
              onPress={analyzeImageWithAI}
              disabled={isAnalyzingImage}
              size="lg"
              style={[styles.identifyButton, { backgroundColor: theme.success, marginTop: Spacing.md }]}
            >
              {isAnalyzingImage ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText style={{ color: '#FFFFFF', marginLeft: Spacing.sm }}>
                    AI Analyzing...
                  </ThemedText>
                </>
              ) : (
                <>
                  <Feather name="cpu" size={16} color="#FFFFFF" />
                  <ThemedText style={{ color: '#FFFFFF', marginLeft: Spacing.sm }}>
                    AI Identification
                  </ThemedText>
                </>
              )}
            </Button>
          )}
          
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
                
                {/* Buying Guide Button */}
                <Button
                  onPress={() => setShowBuyingGuide(true)}
                  style={[styles.buyingGuideButton, { backgroundColor: theme.success, marginTop: Spacing.md }]}
                >
                  <Feather name="shopping-cart" size={16} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '700' }}>
                    Buying Guide & Pricing
                  </ThemedText>
                </Button>
                
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

      {/* AI Questions Modal */}
      <Modal
        visible={showAIQuestions}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAIQuestions(false);
          resetAI();
        }}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              setShowAIQuestions(false);
              resetAI();
            }}>
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
            <ThemedText type="h3">AI Identification</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {imageAnalysis && (
              <Card style={{ marginBottom: Spacing.lg }}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.sm, color: theme.primary }}>
                  Image Analysis:
                </ThemedText>
                <ThemedText style={{ color: theme.textSecondary, lineHeight: 22 }}>
                  {imageAnalysis.initialAnalysis}
                </ThemedText>
                {imageAnalysis.confidence > 0 && (
                  <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
                    Confidence: {Math.round(imageAnalysis.confidence * 100)}%
                  </ThemedText>
                )}
              </Card>
            )}

            {aiQuestions.length > 0 && currentQuestionIndex < aiQuestions.length && (
              <Card style={{ marginBottom: Spacing.lg }}>
                <View style={{ marginBottom: Spacing.md }}>
                  <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                    Question {currentQuestionIndex + 1} of {aiQuestions.length}
                  </ThemedText>
                  <View style={{
                    height: 4,
                    backgroundColor: theme.backgroundSecondary,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${((currentQuestionIndex + 1) / aiQuestions.length) * 100}%`,
                      backgroundColor: theme.primary,
                    }} />
                  </View>
                </View>

                <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
                  {aiQuestions[currentQuestionIndex].question}
                </ThemedText>

                {aiQuestions[currentQuestionIndex].type === 'multiple' && aiQuestions[currentQuestionIndex].options && (
                  <View style={{ gap: Spacing.sm }}>
                    {aiQuestions[currentQuestionIndex].options.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            borderColor: theme.border,
                          }
                        ]}
                        onPress={() => handleAIAnswer(aiQuestions[currentQuestionIndex].id, option)}
                      >
                        <ThemedText>{option}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {aiQuestions[currentQuestionIndex].type === 'binary' && (
                  <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        styles.binaryButton,
                        { backgroundColor: theme.success }
                      ]}
                      onPress={() => handleAIAnswer(aiQuestions[currentQuestionIndex].id, true)}
                    >
                      <ThemedText style={{ color: '#FFFFFF' }}>Yes</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        styles.binaryButton,
                        { backgroundColor: theme.danger }
                      ]}
                      onPress={() => handleAIAnswer(aiQuestions[currentQuestionIndex].id, false)}
                    >
                      <ThemedText style={{ color: '#FFFFFF' }}>No</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                {aiQuestions[currentQuestionIndex].type === 'text' && (
                  <Input
                    placeholder="Enter your answer..."
                    onChangeText={(text) => handleAIAnswer(aiQuestions[currentQuestionIndex].id, text)}
                    multiline
                    numberOfLines={3}
                  />
                )}
              </Card>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Buying Guide Modal */}
      <Modal
        visible={showBuyingGuide}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBuyingGuide(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <ThemedText type="h3">Buying Guide & Pricing</ThemedText>
            <TouchableOpacity
              onPress={() => setShowBuyingGuide(false)}
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
            {result?.gemData && (
              <>
                {/* Quick Optical Tests Section - First */}
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
                </Card>

                {/* Buying Checklist Card - Second */}
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

                  {checklist.map((item) => (
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
                          placeholder="Enter custom price per carat"
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
    fontSize: 12,
  },
  optionButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  binaryButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
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
  buyingGuideButton: {
    marginTop: Spacing.md,
  },
  // Buying Guide Styles
  propertyCard: {
    marginBottom: Spacing.lg,
  },
  buyingGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12, // Circular
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
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
});
