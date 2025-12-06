import { supabase } from "./supabaseClient";
import { Gemstone, FieldValue } from "@/constants/gemstoneData";

export interface CustomGemstone {
  id?: string;
  user_id?: string;
  stone_name: string;
  variety: FieldValue | null;
  chemical_composition: string;
  crystal_system: FieldValue | null;
  color_range: string;
  cause_of_color: string;
  transparency: FieldValue | null;
  luster: FieldValue | null;
  hardness: FieldValue | null;
  specific_gravity: string;
  refractive_index: string;
  cleavage: FieldValue | null;
  fracture: FieldValue | null;
  optic_character: FieldValue | null;
  pleochroism: FieldValue | null;
  typical_inclusions: string;
  uv_reaction: string;
  simulants: string;
  common_treatments: string;
  occurrences: string;
  indian_trade_name: string;
  category: "Precious" | "Semi-precious" | "Organic";
  formation: string;
  images: {
    stoneImages: string[];
    inclusionImages: string[];
  };
  pricing: {
    currency: string;
    table: Array<{
      grade: string;
      color: string;
      clarity: FieldValue | null;
      treatment: FieldValue | null;
      pricePerCaratMin: number;
      pricePerCaratMax: number;
    }>;
  };
  quick_facts: {
    bestIdentifier: string;
    easyConfusion: string;
    marketDemand: string;
  };
  id_rules: {
    riRange: string;
    sgRange: string;
    colorClues: string;
    inclusionClues: string;
    treatmentClues: string;
  };
}

// Helper to extract value from FieldValue
const getValue = (field: FieldValue | null): string => {
  return field?.value || "";
};

// Convert custom gemstone to database format
function convertCustomGemstoneToDB(customGem: CustomGemstone): any {
  return {
    stone_name: customGem.stone_name,
    variety: customGem.variety,
    chemical_composition: customGem.chemical_composition,
    crystal_system: customGem.crystal_system,
    color_range: customGem.color_range,
    cause_of_color: customGem.cause_of_color,
    transparency: customGem.transparency,
    luster: customGem.luster,
    hardness: customGem.hardness,
    specific_gravity: customGem.specific_gravity,
    refractive_index: customGem.refractive_index,
    cleavage: customGem.cleavage,
    fracture: customGem.fracture,
    optic_character: customGem.optic_character,
    pleochroism: customGem.pleochroism,
    typical_inclusions: customGem.typical_inclusions,
    uv_reaction: customGem.uv_reaction,
    simulants: customGem.simulants,
    common_treatments: customGem.common_treatments,
    occurrences: customGem.occurrences,
    indian_trade_name: customGem.indian_trade_name,
    category: customGem.category,
    formation: customGem.formation,
    images: customGem.images,
    pricing: customGem.pricing,
    quick_facts: customGem.quick_facts,
    id_rules: customGem.id_rules,
  };
}

// Convert database gemstone to app format
function convertDBGemstoneToApp(dbGem: any): Gemstone {
  return {
    id: dbGem.id,
    variety: dbGem.variety,
    chemicalComposition: dbGem.chemical_composition || "",
    crystalSystem: dbGem.crystal_system || "",
    colors: dbGem.colors || [],
    causeOfColor: dbGem.cause_of_color || "",
    transparency: dbGem.transparency || [],
    luster: dbGem.luster || "",
    hardness: dbGem.hardness || 0,
    sgMin: dbGem.sg_min || 0,
    sgMax: dbGem.sg_max || 0,
    riMin: dbGem.ri_min || 0,
    riMax: dbGem.ri_max || 0,
    cleavage: dbGem.cleavage || "",
    fracture: dbGem.fracture || "",
    opticCharacter: dbGem.optic_character || "",
    pleochroism: dbGem.pleochroism || "",
    inclusions: dbGem.inclusions || [],
    uvResponse: dbGem.uv_response || "",
    simulants: dbGem.simulants || [],
    treatments: dbGem.treatments || [],
    occurrences: dbGem.occurrences || [],
    indianName: dbGem.indian_name || "",
    category: dbGem.category || "Semi-precious",
    priceRangeINR: {
      min: dbGem.price_range_inr_min || 0,
      max: dbGem.price_range_inr_max || 0,
    },
    priceRangeUSD: {
      min: dbGem.price_range_usd_min || 0,
      max: dbGem.price_range_usd_max || 0,
    },
    formation: dbGem.formation || "",
    testingGuide: dbGem.testing_guide || [],
    marketDemand: dbGem.market_demand || "Medium",
    image: dbGem.image || null,
    inclusionImages: dbGem.inclusion_images || [],
  };
}

// Upload image to Supabase Storage
export async function uploadGemstoneImage(
  localUri: string,
  folder: "stone" | "inclusion" = "stone"
): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return null;
  }

  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const fileExt = localUri.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("gemstone-images")
      .upload(filePath, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("gemstone-images").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadGemstoneImage:", error);
    return null;
  }
}

// Upload multiple images
export async function uploadGemstoneImages(
  localUris: string[],
  folder: "stone" | "inclusion" = "stone"
): Promise<string[]> {
  const uploadPromises = localUris.map((uri) => uploadGemstoneImage(uri, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

// Get user's custom gemstones from Supabase
export async function getCustomGemstones(): Promise<Gemstone[]> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }

  try {
    // Get user's custom gemstones
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      // Not authenticated, return empty array
      return [];
    }

    const { data: userCustomGems, error: customError } = await supabase
      .from("custom_gemstones")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (customError) {
      console.error("Error fetching custom gemstones:", customError);
      return [];
    }

    if (!userCustomGems || userCustomGems.length === 0) {
      return [];
    }

    // Convert custom gemstones to app format
    const convertedCustomGems = userCustomGems.map((customGem) => {
      const variety = getValue(customGem.variety);
      const hardness = parseFloat(getValue(customGem.hardness)) || 0;
      const sgParts = customGem.specific_gravity?.split("-") || [];
      const riParts = customGem.refractive_index?.split("-") || [];

      return {
        id: customGem.id,
        variety: customGem.stone_name || variety,
        chemicalComposition: customGem.chemical_composition || "",
        crystalSystem: getValue(customGem.crystal_system),
        colors: customGem.color_range
          ? customGem.color_range.split(",").map((c: string) => c.trim())
          : [],
        causeOfColor: customGem.cause_of_color || "",
        transparency: getValue(customGem.transparency)
          ? [getValue(customGem.transparency)]
          : [],
        luster: getValue(customGem.luster),
        hardness,
        sgMin: parseFloat(sgParts[0]?.trim()) || 0,
        sgMax: parseFloat(sgParts[1]?.trim()) || 0,
        riMin: parseFloat(riParts[0]?.trim()) || 0,
        riMax: parseFloat(riParts[1]?.trim()) || 0,
        cleavage: getValue(customGem.cleavage),
        fracture: getValue(customGem.fracture),
        opticCharacter: getValue(customGem.optic_character),
        pleochroism: getValue(customGem.pleochroism),
        inclusions: customGem.typical_inclusions
          ? customGem.typical_inclusions.split(",").map((i: string) => i.trim())
          : [],
        uvResponse: customGem.uv_reaction || "",
        simulants: customGem.simulants
          ? customGem.simulants.split(",").map((s: string) => s.trim())
          : [],
        treatments: customGem.common_treatments
          ? customGem.common_treatments.split(",").map((t: string) => t.trim())
          : [],
        occurrences: customGem.occurrences
          ? customGem.occurrences.split(",").map((o: string) => o.trim())
          : [],
        indianName: customGem.indian_trade_name || "",
        category: customGem.category || "Semi-precious",
        priceRangeINR: {
          min:
            customGem.pricing?.table?.length > 0
              ? Math.min(
                  ...customGem.pricing.table
                    .map((p: any) => p.pricePerCaratMin)
                    .filter((v: number) => v > 0)
                )
              : 0,
          max:
            customGem.pricing?.table?.length > 0
              ? Math.max(
                  ...customGem.pricing.table
                    .map((p: any) => p.pricePerCaratMax)
                    .filter((v: number) => v > 0)
                )
              : 0,
        },
        priceRangeUSD: {
          min:
            customGem.pricing?.table?.length > 0
              ? Math.round(
                  Math.min(
                    ...customGem.pricing.table
                      .map((p: any) => p.pricePerCaratMin)
                      .filter((v: number) => v > 0)
                  ) / 83
                )
              : 0,
          max:
            customGem.pricing?.table?.length > 0
              ? Math.round(
                  Math.max(
                    ...customGem.pricing.table
                      .map((p: any) => p.pricePerCaratMax)
                      .filter((v: number) => v > 0)
                  ) / 83
                )
              : 0,
        },
        formation: customGem.formation || "",
        testingGuide: customGem.id_rules
          ? [
              `RI Range: ${customGem.id_rules.riRange || ""}`,
              `SG Range: ${customGem.id_rules.sgRange || ""}`,
              `Color Clues: ${customGem.id_rules.colorClues || ""}`,
              `Inclusion Clues: ${customGem.id_rules.inclusionClues || ""}`,
              `Treatment Clues: ${customGem.id_rules.treatmentClues || ""}`,
            ]
          : [],
        marketDemand: customGem.quick_facts?.marketDemand?.includes("high")
          ? "High"
          : customGem.quick_facts?.marketDemand?.includes("medium")
          ? "Medium"
          : "Low",
        image: customGem.images?.stoneImages?.[0] || null,
        inclusionImages: customGem.images?.inclusionImages || [],
      };
    });

    return convertedCustomGems;
  } catch (error) {
    console.error("Error in getCustomGemstones:", error);
    return [];
  }
}

// Get all gemstones (public + user's custom) - for backward compatibility
export async function getAllGemstones(): Promise<Gemstone[]> {
  return getCustomGemstones();
}

// Save custom gemstone
export async function saveCustomGemstone(
  customGem: CustomGemstone
): Promise<{ success: boolean; error?: string; data?: any }> {
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

    // Upload images if they're local URIs
    const stoneImageUris = customGem.images.stoneImages || [];
    const inclusionImageUris = customGem.images.inclusionImages || [];

    const uploadedStoneImages = await uploadGemstoneImages(
      stoneImageUris.filter((uri) => uri.startsWith("file://")),
      "stone"
    );
    const uploadedInclusionImages = await uploadGemstoneImages(
      inclusionImageUris.filter((uri) => uri.startsWith("file://")),
      "inclusion"
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

    const gemData = convertCustomGemstoneToDB(customGem);
    gemData.images = {
      stoneImages: finalStoneImages,
      inclusionImages: finalInclusionImages,
    };

    const { data, error } = await supabase
      .from("custom_gemstones")
      .insert({
        ...gemData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving custom gemstone:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in saveCustomGemstone:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Update custom gemstone
export async function updateCustomGemstone(
  id: string,
  customGem: CustomGemstone
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const gemData = convertCustomGemstoneToDB(customGem);

    const { error } = await supabase
      .from("custom_gemstones")
      .update(gemData)
      .eq("id", id);

    if (error) {
      console.error("Error updating custom gemstone:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in updateCustomGemstone:", error);
    return { success: false, error: error.message || "Unknown error" };
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
    const { error } = await supabase
      .from("custom_gemstones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting custom gemstone:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCustomGemstone:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

