import { Gemstone, GemCategory, classifyGemCategory } from '@/constants/gemstoneData';
import { saveCustomGemstone } from '@/services/gemstoneService';

export interface BulkGemstoneData {
  id: string;
  variety: string;
  chemicalComposition: string;
  crystalSystem: string;
  colors: string[];
  causeOfColor: string;
  transparency: string[];
  luster: string;
  hardness: number;
  sgMin: number;
  sgMax: number;
  riMin: number;
  riMax: number;
  cleavage: string;
  fracture: string;
  opticCharacter: string;
  pleochroism: string;
  inclusions: string[];
  uvResponse: string;
  simulants: string[];
  treatments: string[];
  occurrences: string[];
  indianName: string;
  category: GemCategory;
  priceRangeINR: { min: number; max: number };
  priceRangeUSD: { min: number; max: number };
  formation: string;
  testingGuide: string[];
  marketDemand: "High" | "Medium" | "Low";
  image?: string;
  inclusionImages?: string[];
}

/**
 * Validate bulk import data
 */
export function validateBulkData(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  data.forEach((item, index) => {
    if (!item.variety) errors.push(`Item ${index + 1}: Missing variety`);
    if (!item.chemicalComposition) errors.push(`Item ${index + 1}: Missing chemical composition`);
    if (!Array.isArray(item.colors)) errors.push(`Item ${index + 1}: Colors must be an array`);
    if (!item.hardness || item.hardness < 1 || item.hardness > 10) {
      errors.push(`Item ${index + 1}: Invalid hardness (must be 1-10)`);
    }
    if (!["Precious", "Semi-precious", "Organic", "Others"].includes(item.category)) {
      errors.push(`Item ${index + 1}: Invalid category`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convert bulk data to CustomGemstone format for Supabase
 */
export function convertToCustomGemstone(bulkData: BulkGemstoneData) {
  return {
    "Title": bulkData.variety,
    "Common Name": bulkData.variety,
    "Species": bulkData.causeOfColor,
    "Transparency": bulkData.transparency[0] || "",
    "Dispersion": "",
    "Refractive Index": `${bulkData.riMin}-${bulkData.riMax}`,
    "Optic Character": bulkData.opticCharacter,
    "Polariscope Reaction": "",
    "Fluorescence": bulkData.uvResponse,
    "Pleochroism": bulkData.pleochroism,
    "Hardness": bulkData.hardness.toString(),
    "Specific Gravity": `${bulkData.sgMin}-${bulkData.sgMax}`,
    "Toughness": "",
    "Inclusions": bulkData.inclusions.join(", "),
    "Luster": bulkData.luster,
    "Stability": "",
    "Chemical Name": "",
    "Chemical Formula": bulkData.chemicalComposition,
    "Crystal System": bulkData.crystalSystem,
    "Colors": bulkData.colors,
    "Occurences": bulkData.occurrences,
    "Tag": bulkData.category || "Precious",
    images: {
      stoneImages: bulkData.image ? [bulkData.image] : [],
      inclusionImages: bulkData.inclusionImages || []
    },
  };
}

/**
 * Bulk import gemstones to Supabase
 */
export async function bulkImportGemstones(
  bulkData: BulkGemstoneData[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  // Validate first
  const validation = validateBulkData(bulkData);
  if (!validation.isValid) {
    return { success: 0, failed: bulkData.length, errors: validation.errors };
  }

  // Import one by one
  for (let i = 0; i < bulkData.length; i++) {
    try {
      const customGem = convertToCustomGemstone(bulkData[i]);
      const result = await saveCustomGemstone(customGem);
      
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to import ${bulkData[i].variety}: ${result.error}`);
      }
    } catch (error) {
      failed++;
      errors.push(`Error importing ${bulkData[i].variety}: ${error}`);
    }
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, bulkData.length);
    }
  }

  return { success, failed, errors };
}

/**
 * Parse CSV data (if you want to import from CSV)
 */
export function parseCSVData(csvText: string): BulkGemstoneData[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data: BulkGemstoneData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) continue;

    const item: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      
      // Handle arrays
      if (header === 'colors' || header === 'transparency' || header === 'inclusions' || 
          header === 'simulants' || header === 'treatments' || header === 'occurrences' || 
          header === 'testingGuide' || header === 'inclusionImages') {
        item[header] = value ? value.split(';').map(v => v.trim()) : [];
      }
      // Handle nested objects
      else if (header === 'priceRangeINR' || header === 'priceRangeUSD') {
        const [min, max] = value ? value.split('-').map(v => parseFloat(v.trim())) : [0, 0];
        item[header] = { min, max };
      }
      // Handle numbers
      else if (header === 'hardness' || header === 'sgMin' || header === 'sgMax' || 
               header === 'riMin' || header === 'riMax') {
        item[header] = parseFloat(value) || 0;
      }
      // Handle strings
      else {
        item[header] = value || '';
      }
    });

    data.push(item);
  }

  return data;
}
