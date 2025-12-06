import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Get configuration from environment variables or app.json
const extra = (Constants?.expoConfig as any)?.extra || {};
const SUPABASE_URL = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  extra?.supabaseUrl || 
  "";
const SUPABASE_ANON_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  extra?.supabaseAnonKey || 
  "";

// Create Supabase client if credentials are available
export const supabase: SupabaseClient | null = 
  SUPABASE_URL && SUPABASE_ANON_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: require("@react-native-async-storage/async-storage").default,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Log warning if Supabase is not configured
if (!supabase) {
  console.warn(
    "⚠️ Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables or app.json"
  );
}

export interface GemMeasurement {
  image_url?: string | null;
  colors?: string[];
  transparency?: string | null;
  ri?: string | null;
  sg?: string | null;
  stone_guess?: string | null;
  luster?: string[];
  crystal_system?: string[];
  pleochroism?: string | null;
  inclusions?: string[];
  uv_response?: string[];
  created_at?: string;
}

async function uploadImageToStorage(localUri: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const res = await fetch(localUri);
    const blob = await res.blob();
    const fileExt = localUri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `gem-images/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (uploadError) return null;
    const { data } = supabase.storage.from('uploads').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (_e) {
    return null;
  }
}

export async function logGemMeasurement(data: GemMeasurement) {
  if (!supabase) return { error: new Error("Supabase is not configured"), data: null };
  let imageUrl = data.image_url || null;
  if (imageUrl && imageUrl.startsWith('file://')) {
    const uploaded = await uploadImageToStorage(imageUrl);
    imageUrl = uploaded || imageUrl;
  }
  const payload = { ...data, image_url: imageUrl, created_at: new Date().toISOString() };
  const { data: inserted, error } = await supabase.from("gem_measurements").insert(payload).select().single();
  return { data: inserted, error };
}