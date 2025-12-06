-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable storage
INSERT INTO storage.buckets (id, name, public) VALUES ('gemstone-images', 'gemstone-images', true) ON CONFLICT DO NOTHING;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gemstones table (public database)
CREATE TABLE IF NOT EXISTS public.gemstones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  variety TEXT NOT NULL,
  chemical_composition TEXT,
  crystal_system TEXT,
  colors TEXT[],
  cause_of_color TEXT,
  transparency TEXT[],
  luster TEXT,
  hardness NUMERIC,
  sg_min NUMERIC,
  sg_max NUMERIC,
  ri_min NUMERIC,
  ri_max NUMERIC,
  cleavage TEXT,
  fracture TEXT,
  optic_character TEXT,
  pleochroism TEXT,
  inclusions TEXT[],
  uv_response TEXT,
  simulants TEXT[],
  treatments TEXT[],
  occurrences TEXT[],
  indian_name TEXT,
  category TEXT CHECK (category IN ('Precious', 'Semi-precious', 'Organic')),
  formation TEXT,
  testing_guide TEXT[],
  market_demand TEXT CHECK (market_demand IN ('High', 'Medium', 'Low')),
  price_range_inr_min NUMERIC DEFAULT 0,
  price_range_inr_max NUMERIC DEFAULT 0,
  price_range_usd_min NUMERIC DEFAULT 0,
  price_range_usd_max NUMERIC DEFAULT 0,
  image TEXT,
  inclusion_images TEXT[],
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom gemstones table (user-specific)
CREATE TABLE IF NOT EXISTS public.custom_gemstones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stone_name TEXT,
  variety JSONB, -- { value: string, source: "preset" | "custom" }
  chemical_composition TEXT,
  crystal_system JSONB,
  color_range TEXT,
  cause_of_color TEXT,
  transparency JSONB,
  luster JSONB,
  hardness JSONB,
  specific_gravity TEXT,
  refractive_index TEXT,
  cleavage JSONB,
  fracture JSONB,
  optic_character JSONB,
  pleochroism JSONB,
  typical_inclusions TEXT,
  uv_reaction TEXT,
  simulants TEXT,
  common_treatments TEXT,
  occurrences TEXT,
  indian_trade_name TEXT,
  category TEXT CHECK (category IN ('Precious', 'Semi-precious', 'Organic')),
  formation TEXT,
  images JSONB, -- { stoneImages: string[], inclusionImages: string[] }
  pricing JSONB, -- { currency: string, table: array }
  quick_facts JSONB,
  id_rules JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing table (for detailed pricing by grade/color/clarity)
CREATE TABLE IF NOT EXISTS public.gemstone_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gemstone_id UUID REFERENCES public.gemstones(id) ON DELETE CASCADE,
  custom_gemstone_id UUID REFERENCES public.custom_gemstones(id) ON DELETE CASCADE,
  grade TEXT,
  color TEXT,
  clarity JSONB,
  treatment JSONB,
  price_per_carat_min NUMERIC,
  price_per_carat_max NUMERIC,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Identification history
CREATE TABLE IF NOT EXISTS public.identification_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stone_name TEXT,
  confidence TEXT,
  short_reasoning JSONB,
  other_possible_stones JSONB,
  gem_data JSONB,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory (user's saved gemstones)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gemstone_id UUID REFERENCES public.gemstones(id) ON DELETE CASCADE,
  custom_gemstone_id UUID REFERENCES public.custom_gemstones(id) ON DELETE CASCADE,
  notes TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_gemstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstone_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Gemstones policies (public read, admin write)
CREATE POLICY "Anyone can view gemstones" ON public.gemstones
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert custom gemstones" ON public.gemstones
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND is_custom = true AND created_by = auth.uid());

CREATE POLICY "Users can update own custom gemstones" ON public.gemstones
  FOR UPDATE USING (created_by = auth.uid() AND is_custom = true);

CREATE POLICY "Users can delete own custom gemstones" ON public.gemstones
  FOR DELETE USING (created_by = auth.uid() AND is_custom = true);

-- Custom gemstones policies
CREATE POLICY "Users can view own custom gemstones" ON public.custom_gemstones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom gemstones" ON public.custom_gemstones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom gemstones" ON public.custom_gemstones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom gemstones" ON public.custom_gemstones
  FOR DELETE USING (auth.uid() = user_id);

-- Pricing policies
CREATE POLICY "Anyone can view pricing" ON public.gemstone_pricing
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert pricing" ON public.gemstone_pricing
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Identification history policies
CREATE POLICY "Users can view own identification history" ON public.identification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identification history" ON public.identification_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own identification history" ON public.identification_history
  FOR DELETE USING (auth.uid() = user_id);

-- Inventory policies
CREATE POLICY "Users can view own inventory" ON public.inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON public.inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON public.inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON public.inventory
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for gemstone-images bucket
CREATE POLICY "Anyone can view images" ON storage.objects
  FOR SELECT USING (bucket_id = 'gemstone-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gemstone-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'gemstone-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (bucket_id = 'gemstone-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gemstones_category ON public.gemstones(category);
CREATE INDEX IF NOT EXISTS idx_gemstones_variety ON public.gemstones(variety);
CREATE INDEX IF NOT EXISTS idx_custom_gemstones_user_id ON public.custom_gemstones(user_id);
CREATE INDEX IF NOT EXISTS idx_identification_history_user_id ON public.identification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_gemstone_id ON public.gemstone_pricing(gemstone_id);
CREATE INDEX IF NOT EXISTS idx_pricing_custom_gemstone_id ON public.gemstone_pricing(custom_gemstone_id);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_gemstones_updated_at BEFORE UPDATE ON public.gemstones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_gemstones_updated_at BEFORE UPDATE ON public.custom_gemstones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

