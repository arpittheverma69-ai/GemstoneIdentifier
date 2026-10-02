import { supabase } from "./supabaseClient";
import * as FileSystem from 'expo-file-system/legacy';
import { Gemstone, GemCategory, classifyGemCategory, sortGemstonesByDefault } from "@/constants/gemstoneData";

// Re-export Gemstone and GemCategory for components
export { Gemstone, GemCategory };

// Polyfills for React Native
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}
if (typeof global.Blob === 'undefined') {
  global.Blob = require('blob-polyfill').Blob;
}

export interface CustomGemstone {
  id?: string;
  user_id?: string;
  "Title": string;
  "Common Name": string;
  "Species": string;
  "Transparency": string;
  "Dispersion": string;
  "Refractive Index": string;
  "Optic Character": string;
  "Polariscope Reaction": string;
  "Fluorescence": string;
  "Pleochroism": string;
  "Hardness": string;
  "Specific Gravity": string;
  "Toughness": string;
  "Inclusions": string;
  "Luster": string;
  "Stability": string;
  "Chemical Name": string;
  "Chemical Formula": string;
  "Crystal System": string;
  "Colors": string[];
  "Occurences": string[];
  "Tag": string;
  images: {
    stoneImages: string[];
    inclusionImages: string[];
    spectroscopeImages?: string[];
  };
}

const normalizeTextArray = (value: any): string[] => {
  if (!value) return [];
  
  // Handle array case first (most common after normalization)
  if (Array.isArray(value)) {
    try {
      return value.filter((item): item is string => 
        typeof item === "string" && item.trim().length > 0
      ).map((item) => item.trim());
    } catch (error) {
      console.warn("Error processing array:", error);
      return [];
    }
  }
  
  // Handle string case
  if (typeof value === "string") {
    try {
      let current = value;
      // Keep unwrapping JSON strings until we get to the actual array
      while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
        try {
          const parsed = JSON.parse(current);
          if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => 
              typeof item === "string" && item.trim().length > 0
            ).map((item) => item.trim());
          }
          current = parsed;
        } catch {
          break;
        }
      }
      
      // Fall back to splitting by comma/semicolon for plain strings
      return value
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    } catch (error) {
      console.warn("Error processing string:", error);
      return [];
    }
  }
  
  return [];
};

const normalizeMarketDemand = (value: any): "High" | "Medium" | "Low" => {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.includes("high")) return "High";
    if (lower.includes("low")) return "Low";
  }
  return "Medium";
};

const normalizeImages = (value: any): {
  stoneImages: string[];
  inclusionImages: string[];
  spectroscopeImages: string[];
} => {
  let parsed = value;

  if (!parsed) {
    return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
  }

  // Handle JSON string case (common when stored as text)
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      console.warn("Unable to parse images payload", error);
      return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
  }

  const coerceArray = (input: any): string[] => {
    try {
      if (Array.isArray(input)) {
        return input.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
      if (typeof input === "string" && input.trim().length > 0) {
        return [input.trim()];
      }
    } catch (error) {
      console.warn("Error in coerceArray:", error);
    }
    return [];
  };

  const result = {
    stoneImages: coerceArray(parsed.stoneImages ?? parsed.stoneimages ?? parsed.stone_image ?? parsed.stone_image_urls),
    inclusionImages: coerceArray(parsed.inclusionImages ?? parsed.inclusion_images ?? parsed.inclusion_image_urls),
    spectroscopeImages: coerceArray(parsed.spectroscopeImages ?? parsed.spectroscope_images ?? parsed.spectroscope_image_urls),
  };
  console.log("Coerced images result:", result);
  return result;
};

// Convert custom gemstone to database format
function convertCustomGemstoneToDB(
  customGem: Partial<CustomGemstone>,
  options: { includeDefaults?: boolean } = {}
): any {
  const { includeDefaults = true } = options;
  const dbData: Record<string, any> = {};

  const assignIfDefined = (key: string, value: any, fallback?: any) => {
    if (value !== undefined) {
      dbData[key] = value;
    } else if (includeDefaults && fallback !== undefined) {
      dbData[key] = fallback;
    }
  };

  // Helper function to handle arrays properly - prevent nested stringification
  const assignArray = (key: string, value: any, fallback: any = []) => {
    if (value !== undefined && value !== null) {
      // If it's already an array, use it directly (don't stringify)
      if (Array.isArray(value)) {
        dbData[key] = value;
      } 
      // If it's a string, unwrap nested JSON and extract the actual array
      else if (typeof value === 'string' && value.trim()) {
        let current = value;
        let unwrapped = false;
        
        // Keep unwrapping JSON strings until we get to the actual array
        while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
          try {
            const parsed = JSON.parse(current);
            if (Array.isArray(parsed)) {
              dbData[key] = parsed.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
              unwrapped = true;
              break;
            }
            current = parsed;
          } catch {
            break;
          }
        }
        
        // If we couldn't unwrap JSON, split by comma
        if (!unwrapped) {
          const items = value.split(',').map(item => item.trim()).filter(item => item);
          dbData[key] = items.length > 0 ? items : fallback;
        }
      }
      else if (includeDefaults) {
        dbData[key] = fallback;
      }
    } else if (includeDefaults) {
      dbData[key] = fallback;
    }
  };

  assignIfDefined("Title", customGem["Title"]);
  assignIfDefined("Common Name", customGem["Common Name"]);
  assignIfDefined("Species", customGem["Species"]);
  assignIfDefined("Transparency", customGem["Transparency"]);
  assignIfDefined("Dispersion", customGem["Dispersion"]);
  assignIfDefined("Refractive Index", customGem["Refractive Index"]);
  assignIfDefined("Optic Character", customGem["Optic Character"]);
  assignIfDefined("Polariscope Reaction", customGem["Polariscope Reaction"]);
  assignIfDefined("Fluorescence", customGem["Fluorescence"]);
  assignIfDefined("Pleochroism", customGem["Pleochroism"]);
  assignIfDefined("Hardness", customGem["Hardness"]);
  assignIfDefined("Specific Gravity", customGem["Specific Gravity"]);
  assignIfDefined("Toughness", customGem["Toughness"]);
  assignIfDefined("Inclusions", customGem["Inclusions"]);
  assignIfDefined("Luster", customGem["Luster"]);
  assignIfDefined("Stability", customGem["Stability"]);
  assignIfDefined("Chemical Name", customGem["Chemical Name"]);
  assignIfDefined("Chemical Formula", customGem["Chemical Formula"]);
  assignIfDefined("Crystal System", customGem["Crystal System"]);
  
  // Handle array fields properly to prevent nested stringification
  // IMPORTANT: Store as array, not as JSON string
  assignArray("Colors", customGem["Colors"], []);
  assignArray("Occurences", customGem["Occurences"], []);
  
  assignIfDefined("Tag", customGem["Tag"], "Semi-precious");

  if (customGem.images !== undefined) {
    dbData.images = {
      stoneImages: customGem.images?.stoneImages ?? [],
      inclusionImages: customGem.images?.inclusionImages ?? [],
      spectroscopeImages: customGem.images?.spectroscopeImages ?? [],
    };
  } else if (includeDefaults) {
    dbData.images = { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
  }

  return dbData;
}

// Merge existing gemstone data with updates to preserve all fields
function mergeGemstoneUpdate(
  existingData: any,
  updateData: Partial<CustomGemstone>
): any {
  const merged: Record<string, any> = { ...existingData };

  // Helper to resolve FieldValue objects and only update if NOT empty
  const updateIfNotEmpty = (key: string, value: any) => {
    if (value === undefined || value === null) {
      // Don't update - keep existing value
      return;
    }
    
    // Resolve FieldValue objects
    let resolvedValue = value;
    if (value && typeof value === 'object' && 'value' in value) {
      resolvedValue = value.value;
    }
    
    // Only update if the resolved value is not empty
    if (resolvedValue !== "" && resolvedValue !== null && resolvedValue !== undefined) {
      merged[key] = resolvedValue;
    }
    // If empty string, keep existing value
  };

  // Update each field ONLY if it has a non-empty value (preserve existing if empty)
  updateIfNotEmpty("Title", updateData["Title"]);
  updateIfNotEmpty("Common Name", updateData["Common Name"]);
  updateIfNotEmpty("Species", updateData["Species"]);
  updateIfNotEmpty("Transparency", updateData["Transparency"]);
  updateIfNotEmpty("Dispersion", updateData["Dispersion"]);
  updateIfNotEmpty("Refractive Index", updateData["Refractive Index"]);
  updateIfNotEmpty("Optic Character", updateData["Optic Character"]);
  updateIfNotEmpty("Polariscope Reaction", updateData["Polariscope Reaction"]);
  updateIfNotEmpty("Fluorescence", updateData["Fluorescence"]);
  updateIfNotEmpty("Pleochroism", updateData["Pleochroism"]);
  updateIfNotEmpty("Hardness", updateData["Hardness"]);
  updateIfNotEmpty("Specific Gravity", updateData["Specific Gravity"]);
  updateIfNotEmpty("Toughness", updateData["Toughness"]);
  updateIfNotEmpty("Inclusions", updateData["Inclusions"]);
  updateIfNotEmpty("Luster", updateData["Luster"]);
  updateIfNotEmpty("Stability", updateData["Stability"]);
  updateIfNotEmpty("Chemical Name", updateData["Chemical Name"]);
  updateIfNotEmpty("Chemical Formula", updateData["Chemical Formula"]);
  updateIfNotEmpty("Crystal System", updateData["Crystal System"]);
  
  // Handle array fields - only update if array has items
  if (updateData["Colors"] !== undefined && Array.isArray(updateData["Colors"]) && updateData["Colors"].length > 0) {
    // Ensure it's a clean array, not a stringified array
    merged["Colors"] = updateData["Colors"].map(c => typeof c === 'string' ? c : String(c));
  }
  if (updateData["Occurences"] !== undefined && Array.isArray(updateData["Occurences"]) && updateData["Occurences"].length > 0) {
    // Ensure it's a clean array, not a stringified array
    const cleanOccurrences = updateData["Occurences"].map(o => typeof o === 'string' ? o : String(o));
    merged["Occurences"] = cleanOccurrences;
  }
  
  updateIfNotEmpty("Tag", updateData["Tag"]);

  // Preserve existing images if no new images provided
  if (updateData.images !== undefined) {
    merged.images = {
      stoneImages: updateData.images?.stoneImages ?? existingData.images?.stoneImages ?? [],
      inclusionImages: updateData.images?.inclusionImages ?? existingData.images?.inclusionImages ?? [],
      spectroscopeImages: updateData.images?.spectroscopeImages ?? existingData.images?.spectroscopeImages ?? [],
    };
  }

  console.log("📝 Merged data:", merged);
  return merged;
}

// Convert database gemstone to app format
function convertDBGemstoneToApp(dbGem: any): Gemstone {
  // Helper function to parse stringified arrays
  const parseArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseMinMaxFromString = (value: any): { min: number; max: number } => {
    if (typeof value !== "string" || !value.trim()) {
      return { min: 0, max: 0 };
    }

    const cleaned = value
      .replace(/–/g, "-")
      .replace(/to/gi, "-")
      .replace(/[^0-9.\-]/g, " ")
      .trim();

    const parts = cleaned
      .split(/\s*-\s*/)
      .map((v) => parseFloat(v.trim()))
      .filter((n) => !Number.isNaN(n));

    if (parts.length === 0) {
      return { min: 0, max: 0 };
    }

    if (parts.length === 1) {
      return { min: parts[0], max: parts[0] };
    }

    const min = Math.min(parts[0], parts[1]);
    const max = Math.max(parts[0], parts[1]);
    return { min, max };
  };

  // Helper function to parse stringified inclusions
  const parseInclusions = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map(item => item.trim()).filter(item => item);
    }
    return [];
  };

  // Helper function to parse transparency
  const parseTransparency = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return [value];
    }
    return [];
  };

  // Helper function to parse images JSON string
  const parseImages = (value: any): { stoneImages: string[]; inclusionImages: string[]; spectroscopeImages: string[] } => {
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return {
          stoneImages: Array.isArray(parsed.stoneImages) ? parsed.stoneImages : [],
          inclusionImages: Array.isArray(parsed.inclusionImages) ? parsed.inclusionImages : [],
          spectroscopeImages: Array.isArray(parsed.spectroscopeImages) ? parsed.spectroscopeImages : [],
        };
      } catch {
        return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
      }
    } else if (typeof value === 'object' && value !== null) {
      return {
        stoneImages: Array.isArray(value.stoneImages) ? value.stoneImages : [],
        inclusionImages: Array.isArray(value.inclusionImages) ? value.inclusionImages : [],
        spectroscopeImages: Array.isArray(value.spectroscopeImages) ? value.spectroscopeImages : [],
      };
    }
    return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
  };

  const result: any = {
    id: dbGem.id,
    variety: dbGem.variety || "",
    chemicalComposition: dbGem.chemical_composition || dbGem["Chemical Formula"] || dbGem["Chemical Name"] || "",
    crystalSystem: dbGem.crystal_system || dbGem["Crystal System"] || "",
    colors: parseArray(dbGem.colors),
    causeOfColor: dbGem.cause_of_color || dbGem.Species || "",
    transparency: parseTransparency(dbGem.transparency),
    luster: dbGem.luster || dbGem.Luster || "",
    hardness: dbGem.hardness || parseFloat(dbGem.Hardness) || 0,
    // Handle Specific Gravity - if we have the string value, try to parse min/max
    sgMin: dbGem.sg_min || parseMinMaxFromString(dbGem["Specific Gravity"] ?? dbGem.specific_gravity ?? dbGem.sg).min || 0,
    sgMax: dbGem.sg_max || parseMinMaxFromString(dbGem["Specific Gravity"] ?? dbGem.specific_gravity ?? dbGem.sg).max || 0,
    // Handle Refractive Index - if we have the string value, try to parse min/max  
    riMin: dbGem.ri_min || parseMinMaxFromString(dbGem["Refractive Index"] ?? dbGem.refractive_index ?? dbGem.ri).min || 0,
    riMax: dbGem.ri_max || parseMinMaxFromString(dbGem["Refractive Index"] ?? dbGem.refractive_index ?? dbGem.ri).max || 0,
    cleavage: dbGem.cleavage || "",
    fracture: dbGem.fracture || "",
    opticCharacter: dbGem.optic_character || dbGem["Optic Character"] || "",
    polariscopeReaction: dbGem.polariscope_reaction || dbGem["Polariscope Reaction"] || "",
    pleochroism: dbGem.pleochroism || dbGem.Pleochroism || "",
    inclusions: parseInclusions(dbGem.inclusions),
    uvResponse: dbGem.uv_response || dbGem.Fluorescence || "",
    simulants: parseArray(dbGem.simulants),
    treatments: parseArray(dbGem.treatments),
    occurrences: parseArray(dbGem.occurrences),
    indianName: dbGem.indian_name || dbGem["Common Name"] || "",
    category: classifyGemCategory(dbGem),
    priceRangeINR: {
      min: dbGem.price_range_inr_min || 0,
      max: dbGem.price_range_inr_max || 0,
    },
    priceRangeUSD: {
      min: dbGem.price_range_usd_min || 0,
      max: dbGem.price_range_usd_max || 0,
    },
    formation: dbGem.formation || "",
    testingGuide: parseArray(dbGem.testing_guide),
    marketDemand: dbGem.market_demand || "Medium",
    image: dbGem.image || null,
    inclusionImages: parseImages(dbGem.images).inclusionImages,
    spectroscopeImages: parseImages(dbGem.images).spectroscopeImages,
    user_id: dbGem.user_id, // Include user_id for edit permissions
    // Handle fields that are stored with original names from CustomGemstone
    toughness: dbGem.toughness || dbGem.Toughness || "",
  };

  // Preserve all original database fields for UI access
  // This ensures fields like "Chemical Name", "Stability", etc. are accessible via (gem as any)["FieldName"]
  const originalFields = [
    "Title", "Common Name", "Species", "Transparency", "Dispersion", 
    "Refractive Index", "Optic Character", "Polariscope Reaction", 
    "Fluorescence", "Pleochroism", "Hardness", "Specific Gravity", 
    "Toughness", "Inclusions", "Luster", "Stability", 
    "Chemical Name", "Chemical Formula", "Crystal System", 
    "Colors", "Occurences", "Tag"
  ];

  originalFields.forEach(field => {
    if (dbGem[field] !== undefined) {
      result[field] = dbGem[field];
    }
  });

  return result;
}

// Upload image to Supabase Storage
export async function uploadGemstoneImage(
  localUri: string,
  folder: "stone" | "inclusion" | "spectroscope" = "stone"
): Promise<string | null> {
  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return null;
  }

  try {
    console.log("🔄 Starting image upload for:", localUri);
    
    if (!localUri) {
      console.error("❌ No URI provided");
      return null;
    }

    // Extract file extension - handle blob: URLs properly
    let fileExt = 'jpg'; // default
    if (localUri.startsWith('blob:')) {
      // For blob URLs, default to jpg since we can't determine extension
      fileExt = 'jpg';
      console.log("📝 Blob URL detected, using default extension: jpg");
    } else if (localUri.startsWith('file://') || localUri.startsWith('http')) {
      // For file:// and http URLs, extract extension from the path
      const urlPath = localUri.split('?')[0]; // Remove query params
      const parts = urlPath.split('.');
      if (parts.length > 1) {
        const ext = parts[parts.length - 1].toLowerCase();
        // Validate it's a real extension (not too long, no slashes)
        if (ext.length <= 5 && !ext.includes('/')) {
          fileExt = ext;
        }
      }
    }
    
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    console.log("📝 File path:", filePath, "Extension:", fileExt);

    let fileData: Blob | Uint8Array;

    // For web/blob URLs, use fetch with timeout
    if (localUri.startsWith('blob:') || localUri.startsWith('http')) {
      console.log("🌐 Using fetch method for blob/http URL");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(localUri, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Fetch failed with status ${response.status}`);
        }
        fileData = await response.blob();
        console.log("✅ File fetched successfully, size:", fileData.size);
      } catch (fetchError) {
        console.error("❌ Fetch failed:", fetchError);
        return null;
      }
    } else {
      // Try native file system for file:// URIs
      try {
        console.log("📱 Using native FileSystem");
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: 'base64',
        });
        if (!base64) {
          throw new Error("Failed to read file as base64");
        }
        const buffer = Buffer.from(base64, 'base64');
        fileData = new Uint8Array(buffer);
        console.log("✅ File read successfully, size:", fileData.byteLength);
      } catch (fsError) {
        console.error("❌ FileSystem read failed:", fsError);
        return null;
      }
    }

    if (!fileData) {
      throw new Error("No file data available");
    }

    console.log("📤 Uploading to Supabase:", filePath, "Size:", fileData instanceof Blob ? fileData.size : fileData.byteLength);

    const { data, error: uploadError } = await supabase.storage
      .from("gemstone-images")
      .upload(filePath, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError);
      return null;
    }

    if (!data) {
      console.error("❌ No data returned from upload");
      return null;
    }

    const { data: urlData } = supabase.storage.from("gemstone-images").getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      console.error("❌ Failed to get public URL");
      return null;
    }

    console.log("✅ Image uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("❌ Error in uploadGemstoneImage:", error);
    return null;
  }
}

// Upload multiple images
export async function uploadGemstoneImages(
  localUris: string[],
  folder: "stone" | "inclusion" | "spectroscope" = "stone"
): Promise<string[]> {
  const uploadPromises = localUris.map((uri) => uploadGemstoneImage(uri, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

// Get user's custom gemstones from Supabase with pagination
export async function getCustomGemstones(
  page: number = 1,
  pageSize: number = 25
): Promise<{ gemstones: Gemstone[]; hasMore: boolean; totalCount: number }> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return { gemstones: [], hasMore: false, totalCount: 0 };
  }

  try {
    // Get current user (optional - for filtering own gemstones)
    const { data: { user } } = await supabase.auth.getUser();

    console.log("Fetching gemstones - logged in user:", user?.id || "anonymous");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    // Get total count of all gemstones
    const { count: totalCount } = await supabase
      .from("total_gemstones")
      .select("*", { count: "exact", head: true });
    
    // Get all total gemstones (no authentication required for viewing)
    console.log("Fetching all total gemstones...");
    const { data: userTotalGems, error: totalError, count } = await supabase
      .from("total_gemstones")
      .select("*", { count: "exact" })
      .range(from, to);

    console.log("Total gems query result:", { 
      count, 
      dataLength: Array.isArray(userTotalGems) ? userTotalGems.length : "not an array",
      error: totalError,
      firstStone: Array.isArray(userTotalGems) ? userTotalGems?.[0]?.["Title"] : "N/A",
      allTitles: Array.isArray(userTotalGems) ? userTotalGems.map(g => g["Title"]).join(", ") : "N/A"
    });

    if (totalError) {
      console.error("Error fetching total gemstones:", totalError);
      return { gemstones: [], hasMore: false, totalCount: totalCount ?? 0 };
    }

    if (!Array.isArray(userTotalGems) || userTotalGems.length === 0) {
      console.warn("No gemstones found or data is not an array");
      return { gemstones: [], hasMore: false, totalCount: totalCount ?? 0 };
    }

    // Check if there are more records by trying to fetch one more
    const { data: nextPageCheck } = await supabase
      .from("total_gemstones")
      .select("id")
      .range(from + pageSize, from + pageSize);
    
    const hasMore = Array.isArray(nextPageCheck) && (nextPageCheck?.length ?? 0) > 0;

    // Convert total gemstones to app format with defensive checks
    const convertedTotalGems = (Array.isArray(userTotalGems) ? userTotalGems : []).map((totalGem) => {
      try {
        const colors = normalizeTextArray(totalGem["Colors"]);
        const occurrences = normalizeTextArray(totalGem["Occurences"]);
        const inclusions = normalizeTextArray(totalGem["Inclusions"]);
        console.log("Raw images payload for", totalGem["Title"], ":", totalGem.images);
        const images = normalizeImages(totalGem.images);
        console.log("Normalized images for", totalGem["Title"], ":", images);
      
      const category = classifyGemCategory(totalGem);
      console.log(`📌 ${totalGem["Title"]} category: ${category} (Category: ${totalGem["Category"]}, Tag: ${totalGem["Tag"]})`);

      const stoneImageUrl = images.stoneImages && images.stoneImages.length > 0 ? images.stoneImages[0] : undefined;
      
      const result: any = {
        id: totalGem.id,
        variety: totalGem["Title"] || totalGem["Common Name"] || "Unknown",
        chemicalComposition: totalGem["Chemical Formula"] || "",
        crystalSystem: totalGem["Crystal System"] || "",
        colors,
        causeOfColor: totalGem["Species"] || "",
        transparency: totalGem["Transparency"] ? [totalGem["Transparency"]] : [],
        luster: totalGem["Luster"] || "",
        hardness: parseFloat(totalGem["Hardness"]) || 0,
        sgMin: parseFloat(totalGem["Specific Gravity"]?.split("-")[0]?.trim()) || 0,
        sgMax: parseFloat(totalGem["Specific Gravity"]?.split("-")[1]?.trim()) || parseFloat(totalGem["Specific Gravity"]) || 0,
        riMin: parseFloat(totalGem["Refractive Index"]?.split("-")[0]?.trim()) || 0,
        riMax: parseFloat(totalGem["Refractive Index"]?.split("-")[1]?.trim()) || parseFloat(totalGem["Refractive Index"]) || 0,
        cleavage: "",
        fracture: "",
        opticCharacter: totalGem["Optic Character"] || "",
        polariscopeReaction: totalGem["Polariscope Reaction"] || "",
        pleochroism: totalGem["Pleochroism"] || "",
        inclusions,
        uvResponse: totalGem["Fluorescence"] || "",
        simulants: [],
        treatments: [],
        occurrences,
        indianName: "",
        category: category,
        priceRangeINR: { min: 0, max: 0 },
        priceRangeUSD: { min: 0, max: 0 },
        formation: totalGem["formation"] || "",
        testingGuide: [],
        marketDemand: normalizeMarketDemand(totalGem["Market Demand"]),
        image: stoneImageUrl,
        inclusionImages: images.inclusionImages,
        spectroscopeImages: images.spectroscopeImages,
      };
      
      // DEBUG: Log Garnet specifically
      if (result.variety?.toLowerCase().includes('garnet')) {
        console.log('🔴 GARNET DEBUG from DB:', {
          variety: result.variety,
          polariscopeReaction: result.polariscopeReaction,
          opticCharacter: result.opticCharacter,
          pleochroism: result.pleochroism,
          rawPolariscopeReaction: totalGem["Polariscope Reaction"],
          rawOpticCharacter: totalGem["Optic Character"],
          rawPleochroism: totalGem["Pleochroism"]
        });
      }
      
      console.log(`🖼️ ${totalGem["Title"]} - Image URL:`, stoneImageUrl, "All stone images:", images.stoneImages);
      console.log(`📍 ${totalGem["Title"]} - Occurences from DB:`, totalGem["Occurences"], "Normalized:", occurrences);

      // Preserve ALL original database fields for complete data access
      const allFields = [
        "Title", "Common Name", "Species", "Transparency", "Dispersion", 
        "Refractive Index", "Optic Character", "Polariscope Reaction", 
        "Fluorescence", "Pleochroism", "Hardness", "Specific Gravity", 
        "Toughness", "Inclusions", "Luster", "Stability", 
        "Chemical Name", "Chemical Formula", "Crystal System", 
        "Colors", "Occurences", "Tag", "Category", "Market Demand"
      ];

      allFields.forEach(field => {
        if (totalGem[field] !== undefined && totalGem[field] !== null) {
          result[field] = totalGem[field];
        }
      });

      return result;
      } catch (error) {
        console.error("Error processing gemstone:", totalGem["Title"], error);
        // Return a safe fallback gemstone
        return {
          id: totalGem.id || "unknown",
          variety: totalGem["Title"] || totalGem["Common Name"] || "Unknown",
          chemicalComposition: "",
          crystalSystem: "",
          colors: [],
          causeOfColor: "",
          transparency: [],
          luster: "",
          hardness: 0,
          sgMin: 0,
          sgMax: 0,
          riMin: 0,
          riMax: 0,
          cleavage: "",
          fracture: "",
          opticCharacter: "",
          pleochroism: "",
          inclusions: [],
          uvResponse: "",
          simulants: [],
          treatments: [],
          occurrences: [],
          indianName: "",
          category: "Semi-precious" as const,
          priceRangeINR: { min: 0, max: 0 },
          priceRangeUSD: { min: 0, max: 0 },
          formation: "",
          testingGuide: [],
          marketDemand: "Medium" as const,
          image: undefined,
          inclusionImages: [],
        };
      }
    });

    const sortedTotalGems = sortGemstonesByDefault(convertedTotalGems);

    return { gemstones: sortedTotalGems, hasMore, totalCount: totalCount ?? 0 };
  } catch (error) {
    console.error("Error in getCustomGemstones:", error);
    return { gemstones: [], hasMore: false, totalCount: 0 };
  }
}

// Legacy function for backward compatibility
export async function getAllCustomGemstones(): Promise<Gemstone[]> {
  const { gemstones } = await getCustomGemstones(1, 1000); // Get all for now
  return gemstones;
}

// Get public gemstones from database
export async function getPublicGemstones(): Promise<Gemstone[]> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }

  try {
    const { data: publicGems, error } = await supabase
      .from("total_gemstones")
      .select("*")
      .eq("is_custom", false)
      .order("variety", { ascending: true });

    if (error) {
      console.error("Error fetching public gemstones:", error);
      return [];
    }

    if (!publicGems || publicGems.length === 0) {
      return [];
    }

    // Convert database gemstones to app format
    return publicGems.map((dbGem) => convertDBGemstoneToApp(dbGem));
  } catch (error) {
    console.error("Error in getPublicGemstones:", error);
    return [];
  }
}

// Get all gemstones without pagination for comparison screen
export async function getAllGemstonesForComparison(): Promise<Gemstone[]> {
  try {
    const [publicGems, customGemsResult] = await Promise.all([
      getPublicGemstones(),
      getCustomGemstones(1, 1000) // Get all custom gems
    ]);
    
    // Combine public gems with all custom gems and sort in default order (Precious -> Semi-precious -> Organic -> Others)
    const allGems = sortGemstonesByDefault([...publicGems, ...customGemsResult.gemstones]);
    return allGems;
  } catch (error) {
    console.error("Error in getAllGemstonesForComparison:", error);
    return [];
  }
}

// Get all gemstones (public + user's custom) - Legacy version for backward compatibility
export async function getAllGemstones(
  page: number = 1,
  pageSize: number = 25
): Promise<Gemstone[]> {
  try {
    const [publicGems, customGemsResult] = await Promise.all([
      getPublicGemstones(),
      getCustomGemstones(1, 1000) // Get ALL custom gems, not paginated
    ]);
    
    // Combine public gems with all custom gems
    const allGems = sortGemstonesByDefault([...publicGems, ...customGemsResult.gemstones]);
    return allGems;
  } catch (error) {
    console.error("Error in getAllGemstones:", error);
    return [];
  }
}

// New paginated version - only paginate custom gemstones from database
export async function getAllGemstonesPaginated(
  page: number = 1,
  pageSize: number = 25
): Promise<{ gemstones: Gemstone[]; hasMore: boolean; totalCount: number }> {
  try {
    // Only fetch custom gemstones with pagination
    const customGemsResult = await getCustomGemstones(page, pageSize);
    
    console.log(`📄 getAllGemstonesPaginated page ${page}: ${customGemsResult.gemstones.length} gems, hasMore: ${customGemsResult.hasMore}, totalCount: ${customGemsResult.totalCount}`);
    
    return customGemsResult;
  } catch (error) {
    console.error("Error in getAllGemstonesPaginated:", error);
    return { gemstones: [], hasMore: false, totalCount: 0 };
  }
}

// Save custom gemstone
export async function saveCustomGemstone(
  customGem: CustomGemstone
): Promise<{ success: boolean; error?: string; data?: any; needsReview?: boolean }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get user role to determine workflow
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = roleData?.role || "Looker";
    console.log("User role:", userRole);

    // Upload images if they're local URIs (defensive optional chaining)
    const stoneImageUris = customGem.images?.stoneImages || [];
    const inclusionImageUris = customGem.images?.inclusionImages || [];
    const spectroscopeImageUris = customGem.images?.spectroscopeImages || [];

    const uploadedStoneImages = await uploadGemstoneImages(
      stoneImageUris.filter((uri) => uri.startsWith("file://")),
      "stone"
    );
    const uploadedInclusionImages = await uploadGemstoneImages(
      inclusionImageUris.filter((uri) => uri.startsWith("file://")),
      "inclusion"
    );
    const uploadedSpectroscopeImages = await uploadGemstoneImages(
      spectroscopeImageUris.filter((uri) => uri.startsWith("file://")),
      "spectroscope"
    );

    // Combine uploaded URLs with existing URLs
    const finalStoneImages = [
      ...stoneImageUris.filter((uri) => !uri.startsWith("file://")),
      ...uploadedStoneImages,
    ];
    const finalInclusionImages = [
      ...inclusionImageUris.filter((uri) => !uri.startsWith("file://")),
      ...uploadedInclusionImages,
    ];
    const finalSpectroscopeImages = [
      ...spectroscopeImageUris.filter((uri) => !uri.startsWith("file://")),
      ...uploadedSpectroscopeImages,
    ];

    const gemData = convertCustomGemstoneToDB({
      ...customGem,
      images: {
        stoneImages: finalStoneImages,
        inclusionImages: finalInclusionImages,
        spectroscopeImages: finalSpectroscopeImages,
      },
    });

    console.log("Saving gemstone with images:", gemData.images);
    console.log("Final stone images:", finalStoneImages);
    console.log("Final inclusion images:", finalInclusionImages);
    console.log("GemData Tag value:", gemData.Tag);
    console.log("GemData full object:", gemData);

    // Route based on user role
    if (userRole === "Student") {
      // Students submit to pending_gemstones for review
      // Ensure Tag has a valid value to satisfy constraint
      const submissionData = {
        ...gemData,
        user_id: user.id,
        status: "Pending",
        Tag: gemData.Tag || "Semi-precious", // Default to Semi-precious if empty
      };
      
      console.log("Submitting with Tag:", submissionData.Tag);
      
      const { data, error } = await supabase
        .from("pending_gemstones")
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error("Error saving pending gemstone:", error);
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        data, 
        needsReview: true
      };
    } else {
      // Admins and Curators can directly publish to total_gemstones
      const { data, error } = await supabase
        .from("total_gemstones")
        .insert({
          ...gemData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving total gemstone:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    }
  } catch (error: any) {
    console.error("Error in saveCustomGemstone:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Update custom gemstone - SIMPLE VERSION that only updates changed fields
export async function updateCustomGemstone(
  id: string,
  customGem: CustomGemstone
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  const toArray = (value: any): string[] => {
    if (!value) return [];
    
    // If already an array, clean it up
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
        .filter(Boolean);
    }
    
    // If it's a string, try to parse it as JSON first (handles nested stringification)
    if (typeof value === "string") {
      let current = value;
      // Keep unwrapping JSON strings until we get to the actual array
      while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
        try {
          const parsed = JSON.parse(current);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
              .filter(Boolean);
          }
          current = parsed;
        } catch {
          break;
        }
      }
      
      // If not JSON, split by comma/semicolon
      return value
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    
    return [];
  };

  const parseImagesField = (
    value: any
  ): { stoneImages: string[]; inclusionImages: string[]; spectroscopeImages: string[] } => {
    if (!value) {
      return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return {
          stoneImages: Array.isArray(parsed?.stoneImages) ? parsed.stoneImages : [],
          inclusionImages: Array.isArray(parsed?.inclusionImages)
            ? parsed.inclusionImages
            : [],
          spectroscopeImages: Array.isArray(parsed?.spectroscopeImages)
            ? parsed.spectroscopeImages
            : [],
        };
      } catch {
        return { stoneImages: [], inclusionImages: [], spectroscopeImages: [] };
      }
    }
    return {
      stoneImages: Array.isArray(value.stoneImages) ? value.stoneImages : [],
      inclusionImages: Array.isArray(value.inclusionImages) ? value.inclusionImages : [],
      spectroscopeImages: Array.isArray(value.spectroscopeImages) ? value.spectroscopeImages : [],
    };
  };

  const splitLocalAndRemote = (items: string[] = []) => {
    const local: string[] = [];
    const remote: string[] = [];
    items.forEach((uri) => {
      if (!uri) return;
      if (uri.startsWith("file://") || uri.startsWith("blob:")) {
        local.push(uri);
      } else {
        remote.push(uri);
      }
    });
    return { local, remote };
  };

  const uploadLocalImages = async (uris: string[], folder: "stone" | "inclusion" | "spectroscope") => {
    const uploaded: string[] = [];
    for (const uri of uris) {
      try {
        const url = await uploadGemstoneImage(uri, folder);
        if (url) {
          uploaded.push(url);
        }
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    }
    return uploaded;
  };

  try {
    console.log("🔄 Updating gemstone:", id);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: existingData, error: fetchError } = await supabase
      .from("total_gemstones")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingData) {
      return { success: false, error: "Gemstone not found" };
    }

    const isOwner = existingData.user_id === user.id;
    let isAdmin = false;
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();
      isAdmin = roleData?.role === "Admin";
    } catch {
      isAdmin = false;
    }

    if (!isOwner && !isAdmin) {
      return { success: false, error: "Permission denied" };
    }

    const updatePayload: Record<string, any> = {};
    const assignIfChanged = (key: string, builder: () => any) => {
      try {
        const value = builder();
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          return;
        }
        updatePayload[key] = value;
      } catch (error) {
        console.warn(`Skipped field ${key}:`, error);
      }
    };

    const textFields = [
      "Title",
      "Common Name",
      "Species",
      "Transparency",
      "Dispersion",
      "Refractive Index",
      "Optic Character",
      "Polariscope Reaction",
      "Fluorescence",
      "Pleochroism",
      "Hardness",
      "Specific Gravity",
      "Toughness",
      "Inclusions",
      "Luster",
      "Stability",
      "Chemical Name",
      "Chemical Formula",
      "Crystal System",
      "Tag",
    ] as const;

    textFields.forEach((field) => {
      assignIfChanged(field, () => customGem[field]);
    });

    assignIfChanged("Colors", () => toArray(customGem["Colors"]));
    assignIfChanged("Occurences", () => toArray(customGem["Occurences"]));

    const existingImages = parseImagesField(existingData.images);
    const { local: localStone, remote: remoteStone } = splitLocalAndRemote(
      customGem.images?.stoneImages || []
    );
    const { local: localInclusion, remote: remoteInclusion } = splitLocalAndRemote(
      customGem.images?.inclusionImages || []
    );
    const { local: localSpectroscope, remote: remoteSpectroscope } = splitLocalAndRemote(
      customGem.images?.spectroscopeImages || []
    );

    const uploadedStone = await uploadLocalImages(localStone, "stone");
    const uploadedInclusion = await uploadLocalImages(localInclusion, "inclusion");
    const uploadedSpectroscope = await uploadLocalImages(localSpectroscope, "spectroscope");

    const finalStoneImages =
      remoteStone.length || uploadedStone.length
        ? [...remoteStone, ...uploadedStone]
        : existingImages.stoneImages;
    const finalInclusionImages =
      remoteInclusion.length || uploadedInclusion.length
        ? [...remoteInclusion, ...uploadedInclusion]
        : existingImages.inclusionImages;
    const finalSpectroscopeImages =
      remoteSpectroscope.length || uploadedSpectroscope.length
        ? [...remoteSpectroscope, ...uploadedSpectroscope]
        : existingImages.spectroscopeImages;

    updatePayload.images = {
      stoneImages: finalStoneImages,
      inclusionImages: finalInclusionImages,
      spectroscopeImages: finalSpectroscopeImages,
    };

    if (Object.keys(updatePayload).length === 0) {
      console.log("ℹ️ Nothing to update");
      return { success: true };
    }

    let query = supabase.from("total_gemstones").update(updatePayload).eq("id", id);
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { error: updateError } = await query;
    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log("✅ Gemstone updated successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating gemstone:", error);
    return { success: false, error: error.message || "Update failed" };
  }
}

// Delete custom gemstone
export async function deleteCustomGemstone(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Determine user role so admins/curators can delete any stone
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = roleData?.role || "Looker";
    const isPrivileged = userRole === "Admin" || userRole === "Curator";

    // Attempt to delete from total_gemstones
    let totalQuery = supabase
      .from("total_gemstones")
      .delete({ count: "exact" })
      .eq("id", id);

    if (!isPrivileged) {
      totalQuery = totalQuery.eq("user_id", user.id);
    }

    const { count: totalCount, error: totalError } = await totalQuery;
    if (totalError) {
      console.error("Error deleting total gemstone:", totalError);
      return { success: false, error: totalError.message };
    }

    if (typeof totalCount === "number" && totalCount > 0) {
      return { success: true };
    }

    // If not in total_gemstones, attempt pending_gemstones
    let pendingQuery = supabase
      .from("pending_gemstones")
      .delete({ count: "exact" })
      .eq("id", id);

    if (!isPrivileged) {
      pendingQuery = pendingQuery.eq("user_id", user.id);
    }

    const { count: pendingCount, error: pendingError } = await pendingQuery;
    if (pendingError) {
      console.error("Error deleting pending gemstone:", pendingError);
      return { success: false, error: pendingError.message };
    }

    if (typeof pendingCount === "number" && pendingCount > 0) {
      return { success: true };
    }

    return {
      success: false,
      error: "Gemstone not found or you do not have permission to delete it.",
    };
  } catch (error: any) {
    console.error("Error in deleteCustomGemstone:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Convert database record to Gemstone interface
function convertDBToGemstone(dbRecord: any): Gemstone {
  // Parse RI from "min-max" format if it's a string
  let riMin = 0, riMax = 0;
  if (dbRecord["Refractive Index"]) {
    const riParts = dbRecord["Refractive Index"].split("-").map((v: string) => parseFloat(v.trim()));
    riMin = riParts[0] || 0;
    riMax = riParts[1] || riParts[0] || 0;
  }

  // Parse SG from "min-max" format if it's a string
  let sgMin = 0, sgMax = 0;
  if (dbRecord["Specific Gravity"]) {
    const sgParts = dbRecord["Specific Gravity"].split("-").map((v: string) => parseFloat(v.trim()));
    sgMin = sgParts[0] || 0;
    sgMax = sgParts[1] || sgParts[0] || 0;
  }

  // Parse hardness as number
  const hardness = dbRecord.Hardness ? parseFloat(dbRecord.Hardness.toString()) : 0;

  // Parse colors - handle nested JSON stringification
  let colors: string[] = [];
  if (dbRecord.Colors) {
    if (Array.isArray(dbRecord.Colors)) {
      colors = dbRecord.Colors;
    } else if (typeof dbRecord.Colors === "string") {
      let current = dbRecord.Colors;
      let unwrapped = false;
      
      // Keep unwrapping JSON strings until we get to the actual array
      while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
        try {
          const parsed = JSON.parse(current);
          if (Array.isArray(parsed)) {
            colors = parsed.filter((c: any) => typeof c === 'string' && c.trim()).map((c: any) => c.trim());
            unwrapped = true;
            break;
          }
          current = parsed;
        } catch {
          break;
        }
      }
      
      // If we couldn't unwrap JSON, split by semicolon
      if (!unwrapped) {
        colors = dbRecord.Colors.split(";").map((c: string) => c.trim()).filter((c: string) => c);
      }
    }
  }

  // Parse occurrences - handle nested JSON stringification
  let occurrences: string[] = [];
  if (dbRecord.Occurences) {
    if (Array.isArray(dbRecord.Occurences)) {
      occurrences = dbRecord.Occurences;
    } else if (typeof dbRecord.Occurences === "string") {
      let current = dbRecord.Occurences;
      let unwrapped = false;
      
      // Keep unwrapping JSON strings until we get to the actual array
      while (typeof current === "string" && (current.startsWith('"') || current.startsWith('['))) {
        try {
          const parsed = JSON.parse(current);
          if (Array.isArray(parsed)) {
            occurrences = parsed.filter((o: any) => typeof o === 'string' && o.trim()).map((o: any) => o.trim());
            unwrapped = true;
            break;
          }
          current = parsed;
        } catch {
          break;
        }
      }
      
      // If we couldn't unwrap JSON, split by semicolon
      if (!unwrapped) {
        occurrences = dbRecord.Occurences.split(";").map((o: string) => o.trim()).filter((o: string) => o);
      }
    }
  }

  const parsedImages = normalizeImages(dbRecord.images);
  const stoneImage = parsedImages.stoneImages?.[0] || (typeof dbRecord.image === "string" ? dbRecord.image : undefined);

  return {
    id: dbRecord.id || "",
    variety: dbRecord.Title || dbRecord.variety || "",
    chemicalComposition: dbRecord["Chemical Formula"] || dbRecord["Chemical Name"] || dbRecord.chemicalComposition || "",
    crystalSystem: dbRecord["Crystal System"] || dbRecord.crystalSystem || "",
    colors: colors,
    causeOfColor: dbRecord.causeOfColor || "",
    transparency: Array.isArray(dbRecord.Transparency) ? dbRecord.Transparency : [dbRecord.Transparency || ""],
    luster: dbRecord.Luster || dbRecord.luster || "",
    hardness: hardness,
    sgMin: sgMin,
    sgMax: sgMax,
    riMin: riMin,
    riMax: riMax,
    cleavage: dbRecord.cleavage || "",
    fracture: dbRecord.fracture || "",
    opticCharacter: dbRecord["Optic Character"] || dbRecord.opticCharacter || "",
    toughness: dbRecord.Toughness || dbRecord.toughness,
    pleochroism: dbRecord.Pleochroism || dbRecord.pleochroism || "",
    inclusions: Array.isArray(dbRecord.Inclusions) ? dbRecord.Inclusions : [dbRecord.Inclusions || ""],
    uvResponse: dbRecord.Fluorescence || dbRecord.uvResponse || "",
    simulants: dbRecord.simulants || [],
    treatments: dbRecord.treatments || [],
    occurrences: occurrences,
    indianName: dbRecord["Common Name"] || dbRecord.indianName || "",
    category: classifyGemCategory(dbRecord),
    priceRangeINR: { min: 0, max: 0 },
    priceRangeUSD: { min: 0, max: 0 },
    formation: dbRecord.formation || "",
    testingGuide: dbRecord.testingGuide || [],
    marketDemand: "Medium" as const,
    image: stoneImage,
    inclusionImages: parsedImages.inclusionImages.length > 0 ? parsedImages.inclusionImages : Array.isArray(dbRecord.inclusionImages) ? dbRecord.inclusionImages : [],
  };
}

// Search all gemstones in the database by query string
export async function searchGemstones(
  searchQuery: string
): Promise<{ success: boolean; data?: Gemstone[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    // Fetch all gemstones and filter client-side
    const { data, error } = await supabase
      .from("total_gemstones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching gemstones from DB:", error.message, error.details);
      return { success: false, error: error.message || "Failed to fetch gemstones" };
    }

    if (!data || data.length === 0) {
      console.log("No gemstones found in database");
      return { success: true, data: [] };
    }

    // If no search query, return all in default sorted order
    if (!searchQuery.trim()) {
      const converted = sortGemstonesByDefault(data.map(convertDBToGemstone));
      return { success: true, data: converted };
    }

    const searchLower = searchQuery.toLowerCase();

    // Filter results client-side to search all fields
    const filtered = data.filter((gem: any) => {
      const searchableText = [
        gem.Title || '',
        gem["Common Name"] || '',
        gem.Species || '',
        gem.Transparency || '',
        gem.Dispersion || '',
        gem["Refractive Index"] || '',
        gem["Optic Character"] || '',
        gem["Polariscope Reaction"] || '',
        gem.Fluorescence || '',
        gem.Pleochroism || '',
        gem.Hardness?.toString() || '',
        gem["Specific Gravity"] || '',
        gem.Toughness || '',
        gem.Inclusions || '',
        gem.Luster || '',
        gem.Stability || '',
        gem["Chemical Name"] || '',
        gem["Chemical Formula"] || '',
        gem["Crystal System"] || '',
        JSON.stringify(gem.Colors || []),
        JSON.stringify(gem.Occurences || []),
        gem.Tag || '',
        gem.category || ''
      ].join(' ').toLowerCase();

      return searchableText.includes(searchLower);
    });

    const converted = filtered.map(convertDBToGemstone);
    return { success: true, data: converted };
  } catch (error: any) {
    console.error("Error in searchGemstones:", error.message || error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}


