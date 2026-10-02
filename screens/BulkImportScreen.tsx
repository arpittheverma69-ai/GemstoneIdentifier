import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { bulkImportGemstones, parseCSVData, BulkGemstoneData } from '@/utils/bulkImport';

export default function BulkImportScreen() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setImportResults(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const parseFile = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(selectedFile.uri);
      const text = await response.text();
      
      let data: BulkGemstoneData[];
      
      if (selectedFile.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (selectedFile.name.endsWith('.csv')) {
        data = parseCSVData(text);
      } else {
        throw new Error('Unsupported file format');
      }

      // Start bulk import
      const results = await bulkImportGemstones(
        data,
        (current, total) => {
          setImportProgress({ current, total });
        }
      );

      setImportResults(results);
      
      Alert.alert(
        'Import Complete',
        `Successfully imported ${results.success} gemstones. ${results.failed} failed.`
      );
    } catch (error) {
      Alert.alert('Error', `Failed to import: ${error}`);
    } finally {
      setIsLoading(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const downloadTemplate = () => {
    // You could implement this to download a template file
    Alert.alert(
      'Template',
      'Download the bulk-import-template.json file from your project folder to see the required format.'
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
          Bulk Import Gemstones
        </ThemedText>

        {/* Instructions */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md, color: theme.primary }}>
            How to Import:
          </ThemedText>
          <View style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText style={{ flex: 1 }}>
                1. Prepare your data in JSON or CSV format
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText style={{ flex: 1 }}>
                2. Use the template for correct field mapping
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Feather name="check-circle" size={16} color={theme.success} />
              <ThemedText style={{ flex: 1 }}>
                3. Select and import your file
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Template Download */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Get Template:
          </ThemedText>
          <Button onPress={downloadTemplate} variant="outline">
            <Feather name="download" size={16} color={theme.primary} />
            <ThemedText style={{ marginLeft: Spacing.sm, color: theme.primary }}>
              Download JSON Template
            </ThemedText>
          </Button>
        </Card>

        {/* File Selection */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Select File:
          </ThemedText>
          
          {selectedFile ? (
            <View style={{
              backgroundColor: theme.backgroundSecondary,
              padding: Spacing.md,
              borderRadius: BorderRadius.md,
              marginBottom: Spacing.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Feather name="file" size={20} color={theme.primary} />
                <ThemedText style={{ flex: 1 }}>{selectedFile.name}</ThemedText>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Feather name="x" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Button onPress={pickDocument} variant="outline">
              <Feather name="upload" size={16} color={theme.primary} />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.primary }}>
                Choose File (JSON/CSV)
              </ThemedText>
            </Button>
          )}
        </Card>

        {/* Import Button */}
        {selectedFile && (
          <Button 
            onPress={parseFile} 
            disabled={isLoading}
            style={{ marginBottom: Spacing.lg }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Feather name="database" size={16} color="#FFFFFF" />
            )}
            <ThemedText style={{ marginLeft: Spacing.sm, color: '#FFFFFF' }}>
              {isLoading ? 'Importing...' : 'Import Data'}
            </ThemedText>
          </Button>
        )}

        {/* Progress */}
        {isLoading && importProgress.total > 0 && (
          <Card style={{ marginBottom: Spacing.lg }}>
            <ThemedText style={{ marginBottom: Spacing.sm }}>
              Progress: {importProgress.current} / {importProgress.total}
            </ThemedText>
            <View style={{
              height: 8,
              backgroundColor: theme.backgroundSecondary,
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <View style={{
                height: '100%',
                width: `${(importProgress.current / importProgress.total) * 100}%`,
                backgroundColor: theme.primary,
                borderRadius: 4,
              }} />
            </View>
          </Card>
        )}

        {/* Results */}
        {importResults && (
          <Card>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Import Results:
            </ThemedText>
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Feather name="check-circle" size={16} color={theme.success} />
                <ThemedText>Success: {importResults.success}</ThemedText>
              </View>
              {importResults.failed > 0 && (
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Feather name="x-circle" size={16} color={theme.danger} />
                  <ThemedText>Failed: {importResults.failed}</ThemedText>
                </View>
              )}
            </View>
            
            {importResults.errors.length > 0 && (
              <View>
                <ThemedText style={{ marginBottom: Spacing.sm, color: theme.danger }}>
                  Errors:
                </ThemedText>
                {importResults.errors.slice(0, 5).map((error, index) => (
                  <ThemedText key={index} style={{ fontSize: 12, color: theme.textSecondary }}>
                    • {error}
                  </ThemedText>
                ))}
                {importResults.errors.length > 5 && (
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                    ...and {importResults.errors.length - 5} more errors
                  </ThemedText>
                )}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}
