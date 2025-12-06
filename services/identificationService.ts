import { supabase } from "./supabaseClient";

export interface IdentificationResult {
  id?: string;
  stone_name: string;
  confidence: string;
  short_reasoning: {
    matchRI?: string;
    matchSG?: string;
    matchColor?: string;
    matchClarity?: string;
  };
  other_possible_stones: Array<{
    name: string;
    confidence: string;
  }>;
  gem_data: any;
  image_url?: string;
}

// Save identification history
export async function saveIdentificationHistory(
  result: IdentificationResult
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

    // Upload image if it's a local URI
    let imageUrl = result.image_url;
    if (imageUrl && imageUrl.startsWith("file://")) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const fileExt = imageUrl.split(".").pop() || "jpg";
      const fileName = `identifications/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("gemstone-images")
        .upload(fileName, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("gemstone-images").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("identification_history")
      .insert({
        user_id: user.id,
        stone_name: result.stone_name,
        confidence: result.confidence,
        short_reasoning: result.short_reasoning,
        other_possible_stones: result.other_possible_stones,
        gem_data: result.gem_data,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving identification history:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Error in saveIdentificationHistory:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

// Get user's identification history
export async function getIdentificationHistory(): Promise<IdentificationResult[]> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("identification_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching identification history:", error);
      return [];
    }

    return (
      data?.map((item) => ({
        id: item.id,
        stone_name: item.stone_name,
        confidence: item.confidence,
        short_reasoning: item.short_reasoning || {},
        other_possible_stones: item.other_possible_stones || [],
        gem_data: item.gem_data || {},
        image_url: item.image_url,
      })) || []
    );
  } catch (error) {
    console.error("Error in getIdentificationHistory:", error);
    return [];
  }
}

// Delete identification history item
export async function deleteIdentificationHistory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { error } = await supabase
      .from("identification_history")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting identification history:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteIdentificationHistory:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}


