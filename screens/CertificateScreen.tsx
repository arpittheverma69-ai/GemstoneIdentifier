import React, { useState, useEffect, useRef } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  Modal,
  ScrollView,
  Share,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import SignaturePad, { SignaturePadHandle } from "@/components/SignaturePad";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Platform-specific imports
import { captureRef } from "react-native-view-shot";
let html2canvas: any = null;
if (Platform.OS === 'web') {
  html2canvas = require('html2canvas');
}

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Dropdown } from "@/components/Dropdown";
import { ChipSelect } from "@/components/ChipSelect";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { 
  GEMSTONE_DATABASE, 
  TREATMENT_OPTIONS,
  COMMON_INCLUSIONS,
} from "@/constants/gemstoneData";
import { getAllGemstones } from "@/services/gemstoneService";
import { Gemstone } from "@/constants/gemstoneData";

export default function CertificateScreen() {
  const { theme } = useTheme();
  
  const [showPreview, setShowPreview] = useState(false);
  const [gemstones, setGemstones] = useState<Gemstone[]>([]);
  const [selectedGemstone, setSelectedGemstone] = useState<Gemstone | null>(null);
  const [barcodeData, setBarcodeData] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureImage, setSignatureImage] = useState("");
  
  const certificateRef = useRef<View>(null);
  const signatureRef = useRef<SignaturePadHandle | null>(null);

  const SIGNATURE_STORAGE_KEY = "certificate.signature.cached";
  
  const [formData, setFormData] = useState({
    stoneName: "",
    weight: "",
    dimensions: { length: "", width: "", depth: "" },
    color: "",
    riMin: "",
    riMax: "",
    sg: "",
    inclusions: [] as string[],
    treatment: "",
    origin: "",
    comments: "",
    certNumber: `GEM-${Date.now().toString(36).toUpperCase()}`,
  });

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateDimension = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [key]: value },
    }));
  };

  // Load gemstones from database
  useEffect(() => {
    loadGemstones();
  }, []);

  useEffect(() => {
    const loadCachedSignature = async () => {
      try {
        const cached = await AsyncStorage.getItem(SIGNATURE_STORAGE_KEY);
        if (cached) {
          setSignatureImage(cached);
        }
      } catch (error) {
        console.warn("Failed to load cached signature", error);
      }
    };

    loadCachedSignature();
  }, []);

  const loadGemstones = async () => {
    try {
      const allGems = await getAllGemstones(1, 200);
      const uniqueGems = allGems.filter((gem, index, self) =>
        index === self.findIndex((g) => g.id === gem.id)
      );
      setGemstones(uniqueGems);
    } catch (error) {
      console.error('Error loading gemstones:', error);
    }
  };

  // Generate barcode and QR code data
  const generateBarcode = () => {
    const barcodeContent = `${formData.certNumber}|${formData.stoneName}|${formData.weight}|${Date.now()}`;
    setBarcodeData(barcodeContent);
    
    // Generate QR code data with more comprehensive info
    const qrContent = JSON.stringify({
      certNumber: formData.certNumber,
      stoneName: formData.stoneName || "Not specified",
      weight: formData.weight || "Not specified",
      color: formData.color || "Not specified",
      riMin: formData.riMin || "Not specified",
      riMax: formData.riMax || "Not specified",
      sg: formData.sg || "Not specified",
      origin: formData.origin || "Not specified",
      timestamp: Date.now()
    });
    setQrCodeData(qrContent);
  };

  // Generate QR code when form data changes
  useEffect(() => {
    if (formData.stoneName || formData.weight || formData.color) {
      generateBarcode();
    }
  }, [formData.stoneName, formData.weight, formData.color, formData.riMin, formData.riMax, formData.sg, formData.origin]);

  // Signature handling
  const handleOK = (signature: string) => {
    setSignatureImage(signature);
    setShowSignaturePad(false);
    AsyncStorage.setItem(SIGNATURE_STORAGE_KEY, signature).catch((error) =>
      console.warn("Failed to cache signature", error)
    );
  };

  const handleEmpty = () => {
    console.log("Signature is empty");
  };

  const clearSignaturePad = () => {
    signatureRef.current?.clearSignature();
  };

  const handleSignatureCleared = () => {
    setSignatureImage("");
    AsyncStorage.removeItem(SIGNATURE_STORAGE_KEY).catch((error) =>
      console.warn("Failed to remove cached signature", error)
    );
  };

  // Handle gemstone selection
  const handleGemstoneSelect = (gemstone: Gemstone) => {
    setSelectedGemstone(gemstone);
    setFormData(prev => ({
      ...prev,
      stoneName: gemstone.variety || "",
      color: Array.isArray(gemstone.colors) ? gemstone.colors.join(", ") : gemstone.colors || "",
      riMin: gemstone.riMin?.toString() || "",
      riMax: gemstone.riMax?.toString() || "",
      sg: gemstone.sgMin && gemstone.sgMax ? `${gemstone.sgMin}-${gemstone.sgMax}` : "",
      origin: Array.isArray(gemstone.occurrences) ? gemstone.occurrences.join(", ") : gemstone.occurrences || "",
      inclusions: gemstone.inclusions && Array.isArray(gemstone.inclusions) ? gemstone.inclusions.slice(0, 3) : [],
    }));
    generateBarcode();
  };

  const handleShare = async () => {
    try {
      let uri: string;
      
      if (Platform.OS === 'web') {
        // Use html2canvas for web
        if (certificateRef.current && html2canvas) {
          const canvas = await html2canvas(certificateRef.current as any, {
            backgroundColor: '#ffffff',
            scale: 2,
          });
          uri = canvas.toDataURL('image/png');
        } else {
          throw new Error('html2canvas not available');
        }
      } else {
        // Use react-native-view-shot for native
        if (certificateRef.current) {
          uri = await captureRef(certificateRef, {
            format: 'png',
            quality: 0.8,
          });
        } else {
          throw new Error('Certificate ref not available');
        }
      }
      
      // Share the image
      if (Platform.OS === 'web') {
        // For web, download the image
        const link = document.createElement('a');
        link.download = `certificate-${formData.certNumber}.png`;
        link.href = uri;
        link.click();
      } else {
        // For native, use Share API
        await Share.share({
          url: Platform.OS === 'ios' ? uri : `file://${uri}`,
          title: "Gemstone Certificate",
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      stoneName: "",
      weight: "",
      dimensions: { length: "", width: "", depth: "" },
      color: "",
      riMin: "",
      riMax: "",
      sg: "",
      inclusions: [],
      treatment: "",
      origin: "",
      comments: "",
      certNumber: `GEM-${Date.now().toString(36).toUpperCase()}`,
    });
  };

  const isFormValid = formData.stoneName && formData.weight && formData.color;

  return (
    <>
      <ScreenKeyboardAwareScrollView>
        <Card style={styles.certNumberCard}>
          <View style={styles.certNumberRow}>
            <View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                CERTIFICATE NUMBER
              </ThemedText>
              <ThemedText type="mono" style={styles.certNumber}>
                {formData.certNumber}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => updateForm("certNumber", `GEM-${Date.now().toString(36).toUpperCase()}`)}
              style={({ pressed }) => [
                styles.refreshButton,
                { backgroundColor: theme.primary + "20", opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Feather name="refresh-cw" size={16} color={theme.primary} />
            </Pressable>
          </View>
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          STONE INFORMATION
        </ThemedText>
        
        <Card style={styles.formCard}>
          <Dropdown
            label="Stone Name"
            placeholder="Select gemstone from database"
            value={formData.stoneName}
            options={gemstones.map(g => g.variety)}
            onSelect={(variety) => {
              const gemstone = gemstones.find(g => g.variety === variety);
              if (gemstone) handleGemstoneSelect(gemstone);
            }}
          />
          <View style={styles.formSpacer} />
          
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Weight (ct)"
                placeholder="2.50"
                value={formData.weight}
                onChangeText={(val) => updateForm("weight", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Color"
                placeholder="Vivid Red"
                value={formData.color}
                onChangeText={(val) => updateForm("color", val)}
              />
            </View>
          </View>
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          DIMENSIONS (MM)
        </ThemedText>
        
        <Card style={styles.formCard}>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Length"
                placeholder="8.5"
                value={formData.dimensions.length}
                onChangeText={(val) => updateDimension("length", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Width"
                placeholder="6.5"
                value={formData.dimensions.width}
                onChangeText={(val) => updateDimension("width", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Depth"
                placeholder="4.2"
                value={formData.dimensions.depth}
                onChangeText={(val) => updateDimension("depth", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
          </View>
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          GEMOLOGICAL DATA
        </ThemedText>
        
        <Card style={styles.formCard}>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="RI Min"
                placeholder="1.762"
                value={formData.riMin}
                onChangeText={(val) => updateForm("riMin", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="RI Max"
                placeholder="1.778"
                value={formData.riMax}
                onChangeText={(val) => updateForm("riMax", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="SG"
                placeholder="3.99"
                value={formData.sg}
                onChangeText={(val) => updateForm("sg", val)}
                keyboardType="decimal-pad"
                mono
              />
            </View>
          </View>
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          CHARACTERISTICS
        </ThemedText>
        
        <Card style={styles.formCard}>
          <ChipSelect
            label="Inclusions Observed"
            options={COMMON_INCLUSIONS}
            selected={formData.inclusions}
            onSelect={(val) => updateForm("inclusions", val)}
          />
          <View style={styles.formSpacer} />
          
          <Dropdown
            label="Treatment"
            placeholder="Select treatment"
            value={formData.treatment}
            options={[...TREATMENT_OPTIONS]}
            onSelect={(val) => updateForm("treatment", val)}
          />
          <View style={styles.formSpacer} />
          
          <Input
            label="Origin"
            placeholder="Myanmar, Sri Lanka, etc."
            value={formData.origin}
            onChangeText={(val) => updateForm("origin", val)}
          />
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          ADDITIONAL COMMENTS
        </ThemedText>
        
        <Card style={styles.formCard}>
          <Input
            placeholder="Any additional notes or observations..."
            value={formData.comments}
            onChangeText={(val) => updateForm("comments", val)}
            multiline
            style={styles.commentsInput}
          />
        </Card>

        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          CERTIFICATION DETAILS
        </ThemedText>
        
        <Card style={styles.formCard}>
          <View style={styles.signatureInputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Authorized Signature
            </ThemedText>
            {signatureImage ? (
              <View style={styles.signaturePreviewContainer}>
                <Image source={{ uri: signatureImage }} style={styles.signaturePreview} />
                <Pressable
                  onPress={() => {
                    setSignatureImage("");
                    setShowSignaturePad(true);
                  }}
                  style={styles.changeSignatureButton}
                >
                  <Feather name="edit-2" size={16} color={theme.primary} />
                  <ThemedText type="caption" style={[styles.changeSignatureText, { color: theme.primary }]}>
                    Change Signature
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowSignaturePad(true)}
                style={[styles.signaturePadButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="edit-3" size={24} color={theme.textSecondary} />
                <ThemedText type="caption" style={styles.signaturePadButtonText}>
                  Tap to add signature
                </ThemedText>
              </Pressable>
            )}
          </View>
        </Card>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={resetForm}
            style={({ pressed }) => [
              styles.secondaryButton,
              { 
                backgroundColor: theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              }
            ]}
          >
            <Feather name="refresh-cw" size={18} color={theme.text} />
            <ThemedText type="body">Reset</ThemedText>
          </Pressable>
          
          <Pressable
            onPress={() => setShowPreview(true)}
            disabled={!isFormValid}
            style={({ pressed }) => [
              styles.primaryButton,
              { 
                backgroundColor: theme.primary,
                opacity: !isFormValid ? 0.5 : pressed ? 0.8 : 1,
              }
            ]}
          >
            <Feather name="eye" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF" }}>Preview</ThemedText>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScreenKeyboardAwareScrollView>

      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Certificate Preview</ThemedText>
            <Pressable
              onPress={() => setShowPreview(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.previewScroll}>
            <View ref={certificateRef} style={[styles.certificate, { backgroundColor: "#FFFFFF" }]}>
              <View style={styles.certHeader}>
                <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary }]}>
                  <Feather name="hexagon" size={32} color="#FFFFFF" />
                </View>
                <ThemedText type="h3" lightColor="#1F2937" darkColor="#1F2937">
                  Gem-Spy
                </ThemedText>
                <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                  GEMOLOGICAL ANALYSIS CERTIFICATE
                </ThemedText>
              </View>

              <View style={[styles.certDivider, { backgroundColor: theme.primary }]} />

              <View style={styles.certBody}>
                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    CERTIFICATE NO.
                  </ThemedText>
                  <ThemedText type="mono" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.certNumber}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    STONE IDENTIFICATION
                  </ThemedText>
                  <ThemedText type="body" lightColor="#1F2937" darkColor="#1F2937" style={{ fontWeight: "600" }}>
                    {formData.stoneName || "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    WEIGHT
                  </ThemedText>
                  <ThemedText type="mono" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.weight ? `${formData.weight} ct` : "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    DIMENSIONS
                  </ThemedText>
                  <ThemedText type="mono" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.dimensions.length && formData.dimensions.width && formData.dimensions.depth
                      ? `${formData.dimensions.length} x ${formData.dimensions.width} x ${formData.dimensions.depth} mm`
                      : "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    COLOR
                  </ThemedText>
                  <ThemedText type="body" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.color || "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    REFRACTIVE INDEX
                  </ThemedText>
                  <ThemedText type="mono" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.riMin && formData.riMax 
                      ? `${formData.riMin} - ${formData.riMax}` 
                      : "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    SPECIFIC GRAVITY
                  </ThemedText>
                  <ThemedText type="mono" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.sg || "—"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    INCLUSIONS
                  </ThemedText>
                  <ThemedText type="body" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.inclusions.length > 0 
                      ? formData.inclusions.join(", ") 
                      : "None observed"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    TREATMENT
                  </ThemedText>
                  <ThemedText type="body" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.treatment || "None"}
                  </ThemedText>
                </View>

                <View style={styles.certRow}>
                  <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                    ORIGIN
                  </ThemedText>
                  <ThemedText type="body" lightColor="#1F2937" darkColor="#1F2937">
                    {formData.origin || "Not specified"}
                  </ThemedText>
                </View>

                {formData.comments ? (
                  <View style={styles.commentsSection}>
                    <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                      COMMENTS
                    </ThemedText>
                    <ThemedText type="small" lightColor="#1F2937" darkColor="#1F2937">
                      {formData.comments}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={styles.certFooter}>
                <View style={styles.qrContainer}>
                  {qrCodeData ? (
                    <View style={styles.qrPlaceholder}>
                      <QRCode
                        value={qrCodeData}
                        size={85}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                      />
                    </View>
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Feather name="grid" size={40} color="#9CA3AF" />
                      <ThemedText type="caption" lightColor="#9CA3AF" darkColor="#9CA3AF">
                        QR Code
                      </ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.signaturePlaceholder}>
                  {signatureImage ? (
                    <View style={styles.customSignature}>
                      <Image source={{ uri: signatureImage }} style={styles.signatureImage} />
                    </View>
                  ) : (
                    <View>
                      <View style={[styles.signatureLine, { borderBottomColor: "#9CA3AF" }]} />
                      <ThemedText type="caption" lightColor="#6B7280" darkColor="#6B7280">
                        Authorized Signature
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.footerButton,
                { 
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="share-2" size={18} color={theme.text} />
              <ThemedText type="body">Share</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowPreview(false)}
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

      {/* Signature Pad Modal */}
      <Modal
        visible={showSignaturePad}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignaturePad(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Add Signature</ThemedText>
            <Pressable
              onPress={() => setShowSignaturePad(false)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.signaturePadContainer}>
            <View style={styles.signaturePadHeader}>
              <ThemedText type="caption">Draw your signature below</ThemedText>
              <Pressable onPress={clearSignaturePad} style={styles.clearButton}>
                <Feather name="trash-2" size={16} color={theme.primary} />
                <ThemedText type="caption" style={[styles.clearButtonText, { color: theme.primary }]}> 
                  Clear
                </ThemedText>
              </Pressable>
            </View>
            
            <View style={styles.signaturePadWrapper}>
              <SignaturePad
                ref={signatureRef}
                style={styles.signatureCanvas}
                onOK={handleOK}
                onEmpty={handleEmpty}
                onClear={handleSignatureCleared}
                backgroundColor="#FFFFFF"
                exportBackgroundColor="transparent"
                strokeColor="#1F2937"
                strokeWidth={3}
              />
            </View>
            
            <View style={styles.signaturePadButtons}>
              <Pressable
                onPress={() => {
                  setShowSignaturePad(false);
                }}
                style={[styles.signaturePadButton, styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="body" style={[styles.buttonText, { color: theme.text }]}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (signatureRef.current) {
                    signatureRef.current.readSignature();
                  }
                }}
                style={[styles.signaturePadButton, styles.saveButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText type="body" style={[styles.buttonText, { color: "#FFFFFF" }]}>
                  Save Signature
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  certNumberCard: {
    marginBottom: Spacing.lg,
  },
  certNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  certNumber: {
    fontSize: 18,
    marginTop: Spacing.xs,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  formCard: {
    marginBottom: Spacing.sm,
  },
  formSpacer: {
    height: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  commentsInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  bottomSpacer: {
    height: Spacing["4xl"],
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
  previewScroll: {
    flex: 1,
    padding: Spacing.lg,
  },
  certificate: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    ...Shadows.lg,
  },
  certHeader: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  certDivider: {
    height: 3,
  },
  certBody: {
    padding: Spacing.lg,
  },
  certRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  commentsSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  certFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  qrContainer: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: {
    fontSize: 8,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  signatureImage: {
    width: 200,
    height: 100,
    resizeMode: "contain",
  },
  signaturePlaceholder: {
    alignItems: "center",
    flex: 1,
  },
  customSignature: {
    alignItems: "center",
  },
  signatureInputContainer: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  signaturePreviewContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  signaturePreview: {
    width: 120,
    height: 60,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BorderRadius.xs,
    resizeMode: "contain",
  },
  changeSignatureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  changeSignatureText: {
    fontSize: 12,
  },
  signaturePadButton: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    gap: Spacing.sm,
  },
  signaturePadButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  signaturePadContainer: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  signaturePadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  clearButtonText: {
    fontSize: 12,
  },
  signaturePadWrapper: {
    height: 300,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  signatureCanvas: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  signaturePadButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "500",
  },
  signatureLine: {
    width: 120,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
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
