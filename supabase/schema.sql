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

-- User roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('Admin', 'Curator', 'Student', 'Looker')) DEFAULT 'Looker',
  can_edit BOOLEAN DEFAULT false,
  can_add BOOLEAN DEFAULT true,
  can_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending gemstones table for approval workflow
CREATE TABLE IF NOT EXISTS public.pending_gemstones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "Title" TEXT,
  "Common Name" TEXT,
  "Species" TEXT,
  "Transparency" TEXT,
  "Dispersion" TEXT,
  "Refractive Index" TEXT,
  "Optic Character" TEXT,
  "Polariscope Reaction" TEXT,
  "Fluorescence" TEXT,
  "Pleochroism" TEXT,
  "Hardness" TEXT,
  "Specific Gravity" TEXT,
  "Toughness" TEXT,
  "Inclusions" TEXT,
  "Luster" TEXT,
  "Stability" TEXT,
  "Chemical Name" TEXT,
  "Chemical Formula" TEXT,
  "Crystal System" TEXT,
  "Colors" TEXT[],
  "Occurences" TEXT[],
  "Category" TEXT DEFAULT 'Semi-precious',
  "Tag" TEXT CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Organic')) DEFAULT 'Semi-precious',
  images JSONB,
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own role
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = id);

-- Allow all authenticated users to read (will filter in app logic)
CREATE POLICY "Authenticated users can read roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow updates via service role (admin operations handled in app)
CREATE POLICY "Service role can update roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- RLS Policies for pending_gemstones table
ALTER TABLE public.pending_gemstones ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending stones
CREATE POLICY "Users can view their own pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can view all pending stones (will filter in app logic)
CREATE POLICY "Authenticated users can view pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert pending stones
CREATE POLICY "Users can insert pending stones" ON public.pending_gemstones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update pending stones (admin operations)
CREATE POLICY "Service role can update pending stones" ON public.pending_gemstones
  FOR UPDATE USING (auth.role() = 'service_role');

-- Trigger to update updated_at for user_roles
CREATE OR REPLACE FUNCTION update_user_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_timestamp_trigger
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION update_user_roles_timestamp();

-- Trigger to update updated_at for pending_gemstones
CREATE OR REPLACE FUNCTION update_pending_gemstones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_gemstones_timestamp_trigger
BEFORE UPDATE ON public.pending_gemstones
FOR EACH ROW
EXECUTE FUNCTION update_pending_gemstones_timestamp();
CREATE TABLE IF NOT EXISTS public.total_gemstones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "Title" TEXT,
  "Common Name" TEXT,
  "Species" TEXT,
  "Transparency" TEXT,
  "Dispersion" TEXT,
  "Refractive Index" TEXT,
  "Optic Character" TEXT,
  "Polariscope Reaction" TEXT,
  "Fluorescence" TEXT,
  "Pleochroism" TEXT,
  "Hardness" TEXT,
  "Specific Gravity" TEXT,
  "Toughness" TEXT,
  "Inclusions" TEXT,
  "Luster" TEXT,
  "Stability" TEXT,
  "Chemical Name" TEXT,
  "Chemical Formula" TEXT,
  "Crystal System" TEXT,
  "Colors" TEXT[],
  "Occurences" TEXT[],
  "Category" TEXT DEFAULT 'Semi-precious', -- New field for categorization
  "Tag" TEXT CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Organic')) DEFAULT 'Semi-precious', -- Gemstone classification tag (legacy)
  images JSONB, -- { stoneImages: string[], inclusionImages: string[] }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing table (for detailed pricing by grade/color/clarity)
CREATE TABLE IF NOT EXISTS public.gemstone_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gemstone_id UUID REFERENCES public.gemstones(id) ON DELETE CASCADE,
  total_gemstone_id UUID REFERENCES public.total_gemstones(id) ON DELETE CASCADE,
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
  total_gemstone_id UUID REFERENCES public.total_gemstones(id) ON DELETE CASCADE,
  notes TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.total_gemstones ENABLE ROW LEVEL SECURITY;
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

-- Total gemstones policies
CREATE POLICY "Anyone can view total gemstones" ON public.total_gemstones
  FOR SELECT USING (true);

CREATE POLICY "Users can view own total gemstones" ON public.total_gemstones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own total gemstones" ON public.total_gemstones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own total gemstones" ON public.total_gemstones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Editors can update total gemstones" ON public.total_gemstones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.id = auth.uid()
        AND (ur.can_edit = true OR ur.role IN ('Admin', 'Curator'))
    )
  );

CREATE POLICY "Users can delete own total gemstones" ON public.total_gemstones
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
CREATE INDEX IF NOT EXISTS idx_total_gemstones_user_id ON public.total_gemstones(user_id);
CREATE INDEX IF NOT EXISTS idx_identification_history_user_id ON public.identification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_gemstone_id ON public.gemstone_pricing(gemstone_id);
CREATE INDEX IF NOT EXISTS idx_pricing_total_gemstone_id ON public.gemstone_pricing(total_gemstone_id);

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

CREATE TRIGGER update_total_gemstones_updated_at BEFORE UPDATE ON public.total_gemstones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

