import { Gemstone } from '@/constants/gemstoneData';
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
  category: "Precious" | "Semi-precious" | "Organic";
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
    if (!["Precious", "Semi-precious", "Organic"].includes(item.category)) {
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
    stone_name: bulkData.variety,
    variety: { value: bulkData.variety, label: bulkData.variety },
    chemical_composition: bulkData.chemicalComposition,
    crystal_system: { value: bulkData.crystalSystem, label: bulkData.crystalSystem },
    color_range: bulkData.colors.join(", "),
    cause_of_color: bulkData.causeOfColor,
    transparency: { value: bulkData.transparency[0], label: bulkData.transparency[0] },
    luster: { value: bulkData.luster, label: bulkData.luster },
    hardness: bulkData.hardness.toString(),
    specific_gravity: `${bulkData.sgMin}-${bulkData.sgMax}`,
    refractive_index: `${bulkData.riMin}-${bulkData.riMax}`,
    cleavage: bulkData.cleavage,
    fracture: bulkData.fracture,
    optic_character: { value: bulkData.opticCharacter, label: bulkData.opticCharacter },
    pleochroism: { value: bulkData.pleochroism, label: bulkData.pleochroism },
    typical_inclusions: bulkData.inclusions.join(", "),
    uv_reaction: bulkData.uvResponse,
    simulants: bulkData.simulants.join(", "),
    common_treatments: bulkData.treatments.join(", "),
    occurrences: bulkData.occurrences.join(", "),
    indian_trade_name: bulkData.indianName,
    category: bulkData.category,
    formation: bulkData.formation,
    images: {
      stoneImages: bulkData.image ? [bulkData.image] : [],
      inclusionImages: bulkData.inclusionImages || []
    },
    pricing: {
      currency: "INR",
      table: [{
        grade: "AAA",
        color: "",
        clarity: null,
        treatment: null,
        pricePerCaratMin: bulkData.priceRangeINR.min,
        pricePerCaratMax: bulkData.priceRangeINR.max,
      }]
    },
    quick_facts: {
      bestIdentifier: "",
      easyConfusion: "",
      marketDemand: bulkData.marketDemand.toLowerCase(),
    },
    id_rules: {
      riRange: `${bulkData.riMin} - ${bulkData.riMax}`,
      sgRange: `${bulkData.sgMin} - ${bulkData.sgMax}`,
      colorClues: bulkData.colors.join(", "),
      inclusionClues: bulkData.inclusions.join(", "),
      treatmentClues: bulkData.treatments.join(", "),
    }
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
