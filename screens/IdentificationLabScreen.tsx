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
import { GEMSTONE_DATABASE, Gemstone } from '@/constants/gemstoneData';
import { getAllGemstones } from '@/services/gemstoneService';
import { logGemMeasurement } from '@/services/supabaseClient';
import { saveIdentificationHistory } from '@/services/identificationService';
import { geminiService, IdentificationQuestion, IdentificationResult } from '@/services/geminiService';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import IdentificationResultSheet, { AlternativeMatch } from '@/components/IdentificationResultSheet';

type ColorOption = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'Pink' | 'Purple' | 'Brown' | 'Black' | 'Colorless' | 'Multicolor';
type StoneType = 'Ruby' | 'Sapphire' | 'Emerald' | 'Topaz' | 'Garnet' | 'Zircon' | 'Other' | 'Not sure';

export default function IdentificationLabScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([]);
  const [stoneGuess, setStoneGuess] = useState<StoneType>('Not sure');
  const [riValue, setRiValue] = useState('');
  const [sgValue, setSgValue] = useState('');
  const [hardnessMin, setHardnessMin] = useState('');
  const [hardnessMax, setHardnessMax] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultCardData | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [otherMatches, setOtherMatches] = useState<AlternativeMatch[]>([]);
  
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

  const buildBreakdownFromGem = (gem: any, score: number): ResultCardData => {
    const ri = parseFloat(riValue);
    const sg = parseFloat(sgValue);

    const normalizePolariscopeReaction = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      // Extract tokens from within parentheses first (e.g., "(SR)" -> " sr ")
      const withParenthesesKept = str.replace(/\(([^)]*)\)/g, ' $1 ');
      return withParenthesesKept
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const reaction = normalizePolariscopeReaction((gem as any).polariscopeReaction);
    const optic = normalizePolariscopeReaction(gem.opticCharacter);
    const hasToken = (haystack: string, token: string) => {
      if (!haystack) return false;
      return (` ${haystack} `).includes(` ${token} `) || haystack.includes(token);
    };

    const hardnessMinValue = parseFloat(hardnessMin);
    const hardnessMaxValue = parseFloat(hardnessMax);
    const gemHardness = typeof gem.hardness === "string" ? parseFloat(gem.hardness) : gem.hardness;

    const matchesHardnessRange =
      !Number.isNaN(gemHardness) &&
      !Number.isNaN(hardnessMinValue) &&
      !Number.isNaN(hardnessMaxValue) &&
      hardnessMinValue <= gemHardness &&
      hardnessMaxValue >= gemHardness;

    const userHardnessSingle = !Number.isNaN(hardnessMinValue) ? hardnessMinValue : !Number.isNaN(hardnessMaxValue) ? hardnessMaxValue : NaN;
    const matchesHardnessSingle =
      !Number.isNaN(gemHardness) &&
      !Number.isNaN(userHardnessSingle) &&
      Math.abs(userHardnessSingle - gemHardness) <= 0.3;

    const userPolariscope = polariscope && polariscope !== "All" ? polariscope : null;
    const matchesPolariscope =
      userPolariscope === "SR"
        ? hasToken(reaction, "sr") || hasToken(reaction, "single") || hasToken(optic, "single") ||
          // Treat NA/empty optic + NONE pleochroism as likely singly refractive (e.g., Garnet)
          ((reaction === '' || reaction === 'na' || reaction === 'n a') && 
           (optic === '' || optic === 'na' || optic === 'n a') &&
           String(gem.pleochroism || '').toUpperCase() === 'NONE')
        : userPolariscope === "DR"
          ? hasToken(reaction, "dr") || hasToken(reaction, "double") || hasToken(optic, "double")
          : userPolariscope === "ADR"
            ? hasToken(reaction, "adr") || hasToken(reaction, "anisotropic") || hasToken(optic, "anisotropic")
            : userPolariscope === "AGG"
              ? hasToken(reaction, "agg") || hasToken(reaction, "aggregate") || hasToken(optic, "aggregate")
              : false;

    const rawPolariscopeValue = String((gem as any).polariscopeReaction || '').trim();
    const rawOpticValue = String(gem.opticCharacter || '').trim();
    const normalizedRawPolariscope = normalizePolariscopeReaction(rawPolariscopeValue);
    const normalizedRawOptic = normalizePolariscopeReaction(rawOpticValue);
    const hasMeaningfulPolariscopeData =
      (normalizedRawPolariscope.length > 0 && normalizedRawPolariscope !== 'na' && normalizedRawPolariscope !== 'n a') ||
      (normalizedRawOptic.length > 0 && normalizedRawOptic !== 'na' && normalizedRawOptic !== 'n a');

    return {
      stoneName: gem.variety,
      confidence: `${Math.round(score)}%`,
      shortReasoning: {
        matchRI: !isNaN(ri) ? `RI ${riValue} ${ri >= gem.riMin && ri <= gem.riMax ? 'matches' : 'close to'} ${gem.riMin}–${gem.riMax}` : '',
        matchSG: !isNaN(sg) ? `SG ${sgValue} ${sg >= gem.sgMin && sg <= gem.sgMax ? 'matches' : 'close to'} ${gem.sgMin}–${gem.sgMax}` : '',
        matchColor: selectedColors.length ? `${selectedColors.join(', ')} ${selectedColors.some(color => (gem.colors||[]).some((gc: string) => gc.toLowerCase().includes(color.toLowerCase()) || color.toLowerCase().includes(gc.toLowerCase()))) ? 'matches' : 'partially matches'} ${gem.variety}` : '',
        matchClarity: '',
        matchPolariscope: (userPolariscope && hasMeaningfulPolariscopeData)
          ? `Polariscope ${userPolariscope} ${matchesPolariscope ? 'matches' : 'does not match'} ${rawPolariscopeValue || rawOpticValue}`
          : '',
        matchHardness: (!Number.isNaN(hardnessMinValue) || !Number.isNaN(hardnessMaxValue))
          ? (!Number.isNaN(hardnessMinValue) && !Number.isNaN(hardnessMaxValue)
            ? `Hardness ${hardnessMinValue}–${hardnessMaxValue} ${matchesHardnessRange ? 'matches' : 'does not match'} ${gem.hardness}`
            : `Hardness ${userHardnessSingle} ${matchesHardnessSingle ? 'matches' : 'close to'} ${gem.hardness}`)
          : '',
        matchPleochroism: pleochroism ? `Pleochroism ${pleochroism} ${pleochroism === 'Present' ? (gem.pleochroism !== 'NONE' ? 'matches' : 'does not match') : (gem.pleochroism === 'NONE' ? 'matches' : 'does not match')} ${gem.pleochroism}` : '',
        matchInclusions: inclusions.length > 0 ? `Inclusions ${inclusions.join(', ')} ${(gem.inclusions || []).some((gInc: string) => inclusions.some((inc) => gInc.toLowerCase().includes(inc.toLowerCase()) || inc.toLowerCase().includes(gInc.toLowerCase()))) ? 'match' : 'do not match'}` : '',
        matchOpticalCharacter: (opticalCharacter && opticalCharacter !== 'All') ? `Optical Character ${opticalCharacter} ${(gem.opticCharacter || '').toLowerCase().includes(opticalCharacter.toLowerCase()) ? 'matches' : 'does not match'} ${gem.opticCharacter}` : '',
      },
      otherPossibleStones: [],
      gemData: {
        variety: gem.variety,
        chemicalComposition: gem.chemicalComposition || '',
        crystalSystem: gem.crystalSystem || '',
        colorRange: (gem.colors || []).join(', '),
        causeOfColor: gem.causeOfColor || '',
        transparency: Array.isArray(gem.transparency) ? gem.transparency.join(', ') : (gem.transparency || ''),
        luster: gem.luster || '',
        hardness: (gem.hardness ?? '').toString(),
        specificGravity: `${gem.sgMin}–${gem.sgMax}`,
        refractiveIndex: `${gem.riMin}–${gem.riMax}`,
        cleavage: gem.cleavage || '',
        fracture: gem.fracture || '',
        opticCharacter: gem.opticCharacter || '',
        pleochroism: gem.pleochroism || '',
        typicalInclusions: (gem.inclusions || []).join(', '),
        uvReaction: gem.uvResponse || '',
        simulants: (gem.simulants || []).join(', '),
        commonTreatments: (gem.treatments || []).join(', '),
        occurrences: (gem.occurrences || []).join(', '),
        indianTradeName: gem.indianName || '',
        imageUrl: gem.image || null,
        inclusionImages: gem.inclusionImages || []
      },
      actionButtons: {
        saveToInventory: true,
        createCertificate: true
      }
    };
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
  const [hasInclusions, setHasInclusions] = useState<boolean | null>(null);

  // Advanced parameters state
  const [pleochroism, setPleochroism] = useState<'Present' | 'Not visible' | 'Not checked' | null>(null);
  const [inclusions, setInclusions] = useState<string[]>([]);
  
  const [polariscope, setPolariscope] = useState<'All' | 'ADR' | 'AGG' | 'DR' | 'SR'>('All');
  const [opticalCharacter, setOpticalCharacter] = useState<'All' | 'Biaxial' | 'Uniaxial'>('All');

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
    console.log('pickFromGallery called');
    try {
      console.log('Starting gallery pick...');
      
      // Handle web platform
      if (Platform.OS === 'web') {
        console.log('Web platform: using file input');
        // On web, ImagePicker will automatically use file input
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });
        console.log('Web gallery result:', result);
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          console.log('Selected image URI:', uri);
          setImageUri(uri);
        } else {
          console.log('User cancelled or no image selected');
        }
        return;
      }
      
      // For mobile platforms
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      
      console.log('Gallery result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Selected image URI:', uri);
        setImageUri(uri);
      } else {
        console.log('User cancelled or no image selected');
      }
    } catch (error) {
      console.error('Gallery error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Could not open gallery: ' + errorMessage);
    }
  };

  const openCamera = async () => {
    console.log('openCamera called');
    try {
      console.log('Starting camera...');
      
      // Try the most basic approach first
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });
      
      console.log('Camera result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Taken photo URI:', uri);
        setImageUri(uri);
      } else {
        console.log('User cancelled or no photo taken');
      }
    } catch (error) {
      console.error('Camera error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Could not open camera: ' + errorMessage);
    }
  };

  const handleTakePhoto = async () => {
    console.log('handleTakePhoto called');
    try {
      // First, let's test if ImagePicker is available and working
      console.log('Testing ImagePicker availability...');
      const pickerStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('Current media library permission status:', pickerStatus);
      
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      console.log('Current camera permission status:', cameraStatus);
      
      // Handle web platform differently
      if (Platform.OS === 'web') {
        console.log('Running on web platform, using file input...');
        // On web, ImagePicker uses file input, so we can directly launch gallery
        await pickFromGallery();
        return;
      }
      
      // For mobile platforms, show alert dialog
      Alert.alert(
        'Add Photo',
        'Choose a source',
        [
          { 
            text: 'Open Camera', 
            onPress: async () => {
              console.log('Camera option selected');
              await openCamera();
            }
          },
          { 
            text: 'Open Gallery', 
            onPress: async () => {
              console.log('Gallery option selected');
              await pickFromGallery();
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error in handleTakePhoto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Failed to open photo options: ' + errorMessage);
    }
  };

  const handleIdentify = async () => {
    // Reset optical properties states
    setIsDR(null);
    setHasPleochroism(null);
    setHasInclusions(null);
    setResult(null);
    // Show loading state
    setIsLoading(true);
    // Directly perform identification
    await handleFinalIdentify();
  };

  const handleFinalIdentify = async () => {
    setIsLoading(true);
    try {
      const ri = parseFloat(riValue);
      const sg = parseFloat(sgValue);
      const hardnessMinValue = parseFloat(hardnessMin);
      const hardnessMaxValue = parseFloat(hardnessMax);

      // Load gemstones from database (public + custom) with fallback to local constants
      const dbGemstones = await getAllGemstones();
      const GEM_LIST = (dbGemstones && dbGemstones.length > 0) ? dbGemstones : GEMSTONE_DATABASE;

      // DEBUG: Check if Garnet is in the list
      const garnetInList = GEM_LIST.find(gem => gem.variety?.toLowerCase().includes('garnet'));
      console.log('🔍 DEBUG: Garnet in list?', !!garnetInList, 'Total gems:', GEM_LIST.length);
      if (garnetInList) {
        console.log('🔍 DEBUG: Garnet data:', {
          variety: garnetInList.variety,
          polariscopeReaction: (garnetInList as any).polariscopeReaction,
          opticCharacter: garnetInList.opticCharacter,
          pleochroism: garnetInList.pleochroism,
          riMin: garnetInList.riMin,
          riMax: garnetInList.riMax
        });
      }

      // Comprehensive database matching using all parameters
      const matches = GEM_LIST.map(gem => {
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

        // Hardness matching (weighted moderately)
        if (!isNaN(hardnessMinValue) && !isNaN(hardnessMaxValue)) {
          maxScore += 15;
          // Check if user's hardness range overlaps with gem's hardness range
          const gemHardness = typeof gem.hardness === 'string' ? parseFloat(gem.hardness) : gem.hardness;
          if (!isNaN(gemHardness)) {
            // Check if ranges overlap
            if (hardnessMinValue <= gemHardness && hardnessMaxValue >= gemHardness) {
              score += 15;
              reasons.push(`Hardness ${hardnessMinValue}-${hardnessMaxValue} matches ${gem.hardness}`);
            } else {
              // Check if close
              const minDiff = Math.abs(hardnessMinValue - gemHardness);
              const maxDiff = Math.abs(hardnessMaxValue - gemHardness);
              const closestDiff = Math.min(minDiff, maxDiff);
              if (closestDiff <= 0.5) {
                score += 8;
                reasons.push(`Hardness ${hardnessMinValue}-${hardnessMaxValue} close to ${gem.hardness}`);
              }
            }
          }
        } else if (!isNaN(hardnessMinValue) || !isNaN(hardnessMaxValue)) {
          // Single hardness value provided
          const hardnessValue = !isNaN(hardnessMinValue) ? hardnessMinValue : hardnessMaxValue;
          maxScore += 12;
          const gemHardness = typeof gem.hardness === 'string' ? parseFloat(gem.hardness) : gem.hardness;
          if (!isNaN(gemHardness)) {
            const diff = Math.abs(hardnessValue - gemHardness);
            if (diff <= 0.3) {
              score += 12;
              reasons.push(`Hardness ${hardnessValue} matches ${gem.hardness}`);
            } else if (diff <= 0.7) {
              score += 6;
              reasons.push(`Hardness ${hardnessValue} close to ${gem.hardness}`);
            }
          }
        } else {
          maxScore += 5;
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


        // Polariscope matching
        if (polariscope && polariscope !== 'All') {
          maxScore += 10;
          const normalizePolariscopeReaction = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // Extract tokens from within parentheses first (e.g., "(SR)" -> " sr ")
            const withParenthesesKept = str.replace(/\(([^)]*)\)/g, ' $1 ');
            return withParenthesesKept
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          };

          const reaction = normalizePolariscopeReaction((gem as any).polariscopeReaction);
          const optic = normalizePolariscopeReaction(gem.opticCharacter);

          const hasToken = (haystack: string, token: string) => {
            if (!haystack) return false;
            return (` ${haystack} `).includes(` ${token} `) || haystack.includes(token);
          };

          const matchesPolariscope =
            (polariscope === 'SR' && (hasToken(reaction, 'sr') || hasToken(reaction, 'single') || hasToken(optic, 'single') || 
              // Treat NA/empty optic + NONE pleochroism as likely singly refractive (e.g., Garnet)
              ((reaction === '' || reaction === 'na' || reaction === 'n a') && 
               (optic === '' || optic === 'na' || optic === 'n a') &&
               String(gem.pleochroism || '').toUpperCase() === 'NONE'))) ||
            (polariscope === 'DR' && (hasToken(reaction, 'dr') || hasToken(reaction, 'double') || hasToken(optic, 'double'))) ||
            (polariscope === 'ADR' && (hasToken(reaction, 'adr') || hasToken(reaction, 'anisotropic') || hasToken(optic, 'anisotropic'))) ||
            (polariscope === 'AGG' && (hasToken(reaction, 'agg') || hasToken(reaction, 'aggregate') || hasToken(optic, 'aggregate')));

          // Debug logging for Garnet
          if (gem.variety?.toLowerCase().includes('garnet')) {
            console.log('Garnet debug:', {
              variety: gem.variety,
              polariscopeReaction: (gem as any).polariscopeReaction,
              opticCharacter: gem.opticCharacter,
              pleochroism: gem.pleochroism,
              normalizedReaction: reaction,
              normalizedOptic: optic,
              pleochroismUpper: String(gem.pleochroism || '').toUpperCase(),
              isNone: String(gem.pleochroism || '').toUpperCase() === 'NONE',
              reactionEmpty: reaction === '' || reaction === 'na' || reaction === 'n a',
              opticEmpty: optic === '' || optic === 'na' || optic === 'n a',
              matchesPolariscope
            });
          }

          if (matchesPolariscope) {
            score += 10;
            reasons.push(`Polariscope ${polariscope} matches`);
          }
        } else {
          maxScore += 3;
        }

        // Optical Character matching
        if (opticalCharacter && opticalCharacter !== 'All') {
          maxScore += 8;
          const gemOpticalChar = gem.opticCharacter.toLowerCase();
          if ((opticalCharacter === 'Biaxial' && gemOpticalChar.includes('biaxial')) ||
              (opticalCharacter === 'Uniaxial' && gemOpticalChar.includes('uniaxial'))) {
            score += 8;
            reasons.push(`Optical Character ${opticalCharacter} matches`);
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

      setOtherMatches(matches);
      const primaryMatch = matches[0];
      const getPriorityRank = (gem: any): number => {
        const variety = String(gem?.variety || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

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

      const secondary = matches
        .slice(1)
        .sort((a, b) => {
          const rankDiff = getPriorityRank(a.gem) - getPriorityRank(b.gem);
          if (rankDiff !== 0) return rankDiff;
          return b.score - a.score;
        })
        .slice(0, 10);

      if (!primaryMatch || primaryMatch.score < 20) {
        Alert.alert('Low Confidence', 'Unable to identify with current parameters. Please provide more details.');
        setIsLoading(false);
        return;
      }

      const breakdown = buildBreakdownFromGem(primaryMatch.gem, primaryMatch.score);

      breakdown.otherPossibleStones = secondary.map(s => ({
        name: s.gem.variety,
        confidence: `${Math.max(5, Math.min(100, s.score))}%`
      }));

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
          ri: riValue || null,
          sg: sgValue || null,
          stone_guess: stoneGuess,
          pleochroism: pleochroism || null,
          inclusions: inclusions,
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
      let base64: string;
      
      // Handle web platform differently
      if (Platform.OS === 'web') {
        console.log('Web platform: using fetch to read image');
        // On web, use fetch to read the image as base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        console.log('Mobile platform: using FileSystem');
        // On mobile, use FileSystem
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
      }

      console.log('Image converted to base64, length:', base64.length);

      // Analyze with Gemini
      const analysis = await geminiService.analyzeGemstoneImage(base64);
      setImageAnalysis(analysis);

      // Generate questions based on analysis
      const observations = {
        imageAnalysis: analysis.initialAnalysis,
        visualProperties: analysis.suggestedProperties,
        manual: {
          colors: selectedColors,
          ri: riValue,
          sg: sgValue,
          hardness: hardnessMin || hardnessMax ? `${hardnessMin || ''}-${hardnessMax || ''}` : null
        }
      };

      const questions = await geminiService.generateIdentificationQuestions(observations);
      setAiQuestions(questions);
      setShowAIQuestions(true);
    } catch (error) {
      console.error('Error analyzing image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Failed to analyze image: ' + errorMessage);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

// ...
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
        // Handle web platform differently
        if (Platform.OS === 'web') {
          console.log('Web platform: using fetch to read image in identifyWithAI');
          // On web, use fetch to read the image as base64
          const response = await fetch(imageUri);
          const blob = await response.blob();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove data URL prefix to get just the base64
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          console.log('Mobile platform: using FileSystem in identifyWithAI');
          // On mobile, use FileSystem
          imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });
        }
      }

      const observations = {
        imageAnalysis: imageAnalysis?.initialAnalysis || '',
        visualProperties: imageAnalysis?.suggestedProperties || {},
        manual: {
          colors: selectedColors,
          ri: riValue,
          sg: sgValue,
          hardness: hardnessMin || hardnessMax ? `${hardnessMin || ''}-${hardnessMax || ''}` : null
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

  // Handler functions for IdentificationResultSheet
  const handleCloseResultSheet = () => {
    setShowResultModal(false);
  };

  const handleSelectAlternative = (match: AlternativeMatch) => {
    const breakdown = buildBreakdownFromGem(match.gem, match.score);
    setResult(breakdown);
    // Update otherMatches to show the selected as primary and others as alternatives
    const newOtherMatches = otherMatches.filter(m => m !== match);
    setOtherMatches([match, ...newOtherMatches]);
  };

  const handleResetIdentification = () => {
    setShowResultModal(false);
    setResult(null);
    setOtherMatches([]);
    setSelectedColors([]);
    setStoneGuess('Not sure');
    setRiValue('');
    setSgValue('');
    setHardnessMin('');
    setHardnessMax('');
    setImageUri(null);
    setIsDR(null);
    setHasPleochroism(null);
    setHasInclusions(null);
    resetAI();
  };

  const handleSaveToInventory = () => {
    Alert.alert('Saved to Inventory', 'Your identification has been saved.');
    setShowResultModal(false);
  };

  const handleCreateCertificate = () => {
    navigation.getParent()?.navigate('CertificateTab');
    setShowResultModal(false);
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

        {/* Identification Card */}
        <Card elevation={2} variant="elevated" style={styles.card}>
          <View style={styles.cardHeader}>
          <ThemedText type="h3" style={styles.cardTitle}>Gemstone Identification</ThemedText>
            <ThemedText type="body" style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Add photo and select properties for accurate identification
          </ThemedText>
          </View>

          {/* Photo Input */}
          <Pressable 
            style={[
              styles.photoInput, 
              !imageUri && styles.photoInputEmpty,
              { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }
            ]}
            onPress={() => {
              console.log('Photo input Pressable pressed');
              handleTakePhoto();
            }}
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
              </View>
            )}
          </Pressable>

          {/* Colors */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>COLORS</ThemedText>
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
            
            {/* Hardness Row */}
            <View style={styles.measurementRow}>
              <View style={styles.measurementInputContainer}>
                <ThemedText style={styles.measurementLabel}>Hardness Min</ThemedText>
                <Input
                  placeholder="e.g. 7.0"
                  value={hardnessMin}
                  onChangeText={setHardnessMin}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.measurementInputContainer}>
                <ThemedText style={styles.measurementLabel}>Hardness Max</ThemedText>
                <Input
                  placeholder="e.g. 7.5"
                  value={hardnessMax}
                  onChangeText={setHardnessMax}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <ThemedText style={styles.hintText}>
              Skip if you don\u2019t know.
            </ThemedText>
          </View>

          {/* Optical Properties */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>OPTICAL PROPERTIES</ThemedText>
            
            
            <View style={{ height: Spacing.sm }}></View>
            
            {/* Polariscope */}
            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Polariscope</ThemedText>
              <View style={styles.row}>
                {(['All', 'ADR', 'AGG', 'DR', 'SR'] as const).map(option => {
                  const isSelected = polariscope === option;
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
                      onPress={() => setPolariscope(option)}
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
            </View>
            
            <View style={{ height: Spacing.sm }}></View>
            
            {/* Optical Character */}
            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Optical Character</ThemedText>
              <View style={styles.row}>
                {(['All', 'Biaxial', 'Uniaxial'] as const).map(option => {
                  const isSelected = opticalCharacter === option;
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
                      onPress={() => setOpticalCharacter(option)}
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
            </View>
          </View>

          {/* Additional Properties */}
          <View style={styles.section}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>ADDITIONAL PROPERTIES</ThemedText>
            
            {/* Pleochroism */}
            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Pleochroism</ThemedText>
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
            </View>
            
            <View style={{ height: Spacing.sm }}></View>
            
            {/* Inclusions */}
            <ChipSelect 
              label="Inclusions"
              options={["Needles","Silk","Fingerprints","Crystals","Feathers","Color zoning","Bubbles","None visible"]}
              selected={inclusions}
              onSelect={(vals) => setInclusions(vals)}
              multi
            />
            
            <View style={{ height: Spacing.lg }}></View>
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

      </ScrollView>

      <IdentificationResultSheet
        visible={showResultModal}
        isLoading={isLoading}
        result={result}
        otherMatches={otherMatches.filter((_, index) => index !== 0)}
        onClose={handleCloseResultSheet}
        onSelectAlternative={handleSelectAlternative}
        onReset={handleResetIdentification}
        onSaveToInventory={handleSaveToInventory}
        onCreateCertificate={handleCreateCertificate}
        onOpenBuyingGuide={() => setShowBuyingGuide(true)}
      />

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
            <View style={{ width: 24 }}></View>
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
                      <View key={index}>
                        <TouchableOpacity
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
                      </View>
                    ))}
                  </View>
                )}

                {aiQuestions[currentQuestionIndex].type === 'binary' && (
                  <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                    <View>
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
                    </View>
                    <View>
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
                    <View>
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
                  </View>
                  
                  {/* Quick Optical Tests with Checkboxes */}
                  {opticalTests.map((item) => (
                    <View key={item.id}>
                      <Pressable
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
                    </View>
                  ))}
                </Card>

                {/* Buying Checklist Card - Second */}
                <Card style={[styles.propertyCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.buyingGuideHeader}>
                    <ThemedText type="caption" style={[styles.cardSectionTitle, { color: theme.textSecondary }]}>
                      BUYING CHECKLIST & PRICING
                    </ThemedText>
                    <View>
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
                  </View>

                  {checklist.map((item) => (
                    <View key={item.id}>
                      <Pressable
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
                    </View>
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
                            <View key={grade}>
                              <Pressable
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
                            </View>
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
                      <View>
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
                      </View>

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
  fieldLabel: {
    marginBottom: Spacing.sm,
    fontWeight: '500',
    fontSize: 14,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
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
  resultHeader: {
    alignItems: 'center',
  },
  confidenceBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    marginTop: Spacing.lg,
  },
  buyingGuideButton: {
    marginTop: Spacing.md,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#9333EA',
  },
  otherCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  otherCardImageWrapper: {
    width: '100%',
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  otherCardImage: {
    width: '100%',
    height: '100%',
  },
  otherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  otherCardBody: {
    marginTop: Spacing.xs,
  },
  actionButtons: {
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
