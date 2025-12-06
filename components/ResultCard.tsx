import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export interface ResultCardData {
  stoneName: string;
  confidence: string;
  shortReasoning: {
    matchRI: string;
    matchSG: string;
    matchColor: string;
    matchClarity: string;
  };
  otherPossibleStones: Array<{ name: string; confidence: string }>;
  gemData: {
    variety: string;
    chemicalComposition: string;
    crystalSystem: string;
    colorRange: string;
    causeOfColor: string;
    transparency: string;
    luster: string;
    hardness: string;
    specificGravity: string;
    refractiveIndex: string;
    cleavage: string;
    fracture: string;
    opticCharacter: string;
    pleochroism: string;
    typicalInclusions: string;
    uvReaction: string;
    simulants: string;
    commonTreatments: string;
    occurrences: string;
    indianTradeName: string;
  };
  actionButtons: {
    saveToInventory: boolean;
    createCertificate: boolean;
  };
}

interface ResultCardProps {
  title?: string;
  breakdown: ResultCardData;
  onSaveToInventory?: () => void;
  onCreateCertificate?: () => void;
}

function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultExpanded?: boolean;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.collapsibleHeader}
        activeOpacity={0.7}
      >
        <ThemedText type="caption" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
        <Feather 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.textSecondary} 
        />
      </Pressable>
      {expanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  
  if (!value) return null;
  
  return (
    <View style={[styles.dataRow, { borderBottomColor: theme.border }]}>
      <ThemedText type="small" style={[styles.dataLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={[styles.dataValue, { color: theme.text }]}>
        {value}
      </ThemedText>
    </View>
  );
}

export function ResultCard({ 
  title = "Identification Result", 
  breakdown, 
  onSaveToInventory, 
  onCreateCertificate 
}: ResultCardProps) {
  const { theme } = useTheme();
  
  // Debug logging
  console.log('ResultCard received breakdown:', breakdown);
  
  if (!breakdown) {
    console.log('ResultCard: breakdown is null/undefined');
    return null;
  }
  
  if (!breakdown.stoneName) {
    console.log('ResultCard: stoneName is missing');
    return null;
  }
  
  const confidenceNum = breakdown.confidence ? parseInt(breakdown.confidence.replace('%', '')) : 0;
  
  return (
    <Card elevation={3} variant="elevated" style={styles.card}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
      <ThemedText type="h3" style={styles.title}>{title}</ThemedText>
          <View style={[styles.confidenceBadge, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
              {breakdown.confidence}
            </ThemedText>
      </View>
        </View>
        
        {/* Primary Result */}
        <View style={[styles.resultSection, { backgroundColor: theme.primary + "10" }]}>
          <ThemedText type="h2" style={[styles.resultName, { color: theme.primary }]}>
            {breakdown.stoneName ? breakdown.stoneName.toUpperCase() : 'UNKNOWN'}
          </ThemedText>
          <ThemedText type="body" style={[styles.confidenceText, { color: theme.textSecondary }]}>
            Confidence: {breakdown.confidence || '0%'}
          </ThemedText>
        </View>
        
        {/* Short Reasoning */}
        <CollapsibleSection title="MATCHING FACTORS" defaultExpanded={true}>
          {breakdown.shortReasoning.matchRI ? (
            <View style={styles.reasonRow}>
              <View style={[styles.bullet, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={styles.reason}>{breakdown.shortReasoning.matchRI}</ThemedText>
            </View>
          ) : null}
          {breakdown.shortReasoning.matchSG ? (
            <View style={styles.reasonRow}>
              <View style={[styles.bullet, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={styles.reason}>{breakdown.shortReasoning.matchSG}</ThemedText>
            </View>
          ) : null}
          {breakdown.shortReasoning.matchColor ? (
            <View style={styles.reasonRow}>
              <View style={[styles.bullet, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={styles.reason}>{breakdown.shortReasoning.matchColor}</ThemedText>
            </View>
          ) : null}
          {breakdown.shortReasoning.matchClarity ? (
            <View style={styles.reasonRow}>
              <View style={[styles.bullet, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={styles.reason}>{breakdown.shortReasoning.matchClarity}</ThemedText>
            </View>
          ) : null}
        </CollapsibleSection>
        
        {/* Other Possible Stones */}
        {breakdown.otherPossibleStones && breakdown.otherPossibleStones.length > 0 ? (
          <CollapsibleSection title="OTHER POSSIBILITIES">
            {breakdown.otherPossibleStones.map((stone, idx) => (
              <View key={idx} style={[styles.otherStoneRow, { borderBottomColor: theme.border }]}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{stone.name}</ThemedText>
                <View style={[styles.confidenceBadgeSmall, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                    {stone.confidence}
                  </ThemedText>
                </View>
              </View>
            ))}
          </CollapsibleSection>
      ) : null}
        
        {/* Gem Data */}
        <CollapsibleSection title="GEMOLOGICAL PROPERTIES">
          <View style={[styles.gemDataContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <DataRow label="Chemical Composition" value={breakdown.gemData.chemicalComposition} />
            <DataRow label="Crystal System" value={breakdown.gemData.crystalSystem} />
            <DataRow label="Color Range" value={breakdown.gemData.colorRange} />
            <DataRow label="Cause of Color" value={breakdown.gemData.causeOfColor} />
            <DataRow label="Transparency" value={breakdown.gemData.transparency} />
            <DataRow label="Luster" value={breakdown.gemData.luster} />
            <DataRow label="Hardness (Mohs)" value={breakdown.gemData.hardness} />
            <DataRow label="Specific Gravity" value={breakdown.gemData.specificGravity} />
            <DataRow label="Refractive Index" value={breakdown.gemData.refractiveIndex} />
            <DataRow label="Cleavage" value={breakdown.gemData.cleavage} />
            <DataRow label="Fracture" value={breakdown.gemData.fracture} />
            <DataRow label="Optic Character" value={breakdown.gemData.opticCharacter} />
            <DataRow label="Pleochroism" value={breakdown.gemData.pleochroism} />
            <DataRow label="Typical Inclusions" value={breakdown.gemData.typicalInclusions} />
            <DataRow label="UV Reaction" value={breakdown.gemData.uvReaction} />
            <DataRow label="Simulants" value={breakdown.gemData.simulants} />
            <DataRow label="Common Treatments" value={breakdown.gemData.commonTreatments} />
            <DataRow label="Occurrences" value={breakdown.gemData.occurrences} />
            <DataRow label="Indian Trade Name" value={breakdown.gemData.indianTradeName} />
          </View>
        </CollapsibleSection>
        
        {/* Action Buttons */}
        {breakdown.actionButtons.saveToInventory || breakdown.actionButtons.createCertificate ? (
      <View style={styles.actionsRow}>
            {breakdown.actionButtons.saveToInventory && (
              <Pressable 
                style={[
                  styles.actionButton, 
                  { 
                    borderColor: theme.border, 
                    backgroundColor: theme.backgroundSecondary 
                  }
                ]} 
                onPress={onSaveToInventory}
              >
                <Feather name="save" size={18} color={theme.text} />
                <ThemedText type="small" style={[styles.actionButtonText, { color: theme.text }]}>
                  Save to Inventory
                </ThemedText>
        </Pressable>
            )}
            {breakdown.actionButtons.createCertificate && (
              <Pressable 
                style={[
                  styles.actionButton, 
                  styles.actionButtonPrimary, 
                  { 
                    backgroundColor: theme.primary, 
                    borderColor: theme.primary 
                  }
                ]} 
                onPress={onCreateCertificate}
              >
                <LinearGradient
                  colors={[theme.gradientStart, theme.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.md }]}
                />
                <Feather name="award" size={18} color="#FFFFFF" />
                <ThemedText type="small" style={[styles.actionButtonText, { color: "#FFFFFF" }]}>
                  Create Certificate
                </ThemedText>
        </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: { 
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  confidenceBadgeSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  resultSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  resultName: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  confidenceText: {
    fontSize: 14,
  },
  collapsibleSection: {
    marginTop: Spacing.lg,
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  collapsibleContent: {
    marginTop: Spacing.md,
  },
  sectionLabel: {
    fontWeight: "700",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
    marginTop: 6,
  },
  reason: { 
    flex: 1,
    lineHeight: 20,
  },
  otherStoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  gemDataContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    overflow: "hidden",
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  dataLabel: {
    flex: 1,
    fontWeight: "600",
    marginRight: Spacing.md,
  },
  dataValue: {
    flex: 1.5,
    textAlign: "right",
  },
  actionsRow: { 
    flexDirection: "row", 
    gap: Spacing.md, 
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  actionButton: { 
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md, 
    paddingVertical: Spacing.md, 
    borderRadius: BorderRadius.md, 
    borderWidth: 2,
    overflow: "hidden",
  },
  actionButtonText: { 
    fontWeight: "600",
    fontSize: 14,
  },
  actionButtonPrimary: {
    borderWidth: 0,
  },
});
