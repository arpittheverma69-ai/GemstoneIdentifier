-- Fix pending_users and pending_gemstones tables
-- Run this script in Supabase SQL Editor

-- Create pending_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pending_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_role TEXT DEFAULT 'Looker',
  status TEXT CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on pending_users
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins and Curators can view all pending requests" ON public.pending_users;
DROP POLICY IF EXISTS "Users can insert their own pending request" ON public.pending_users;
DROP POLICY IF EXISTS "Admins can update pending requests" ON public.pending_users;

-- Create new policies for pending_users
CREATE POLICY "Users can view their own pending request" ON public.pending_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and Curators can view all pending requests" ON public.pending_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own pending request" ON public.pending_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update pending requests" ON public.pending_users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create trigger for pending_users
DROP TRIGGER IF EXISTS pending_users_updated_at ON public.pending_users;
DROP FUNCTION IF EXISTS update_pending_users_timestamp();

CREATE OR REPLACE FUNCTION update_pending_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pending_users_updated_at
  BEFORE UPDATE ON public.pending_users
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_users_timestamp();

-- Fix pending_gemstones by ensuring it exists and has proper policies
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

-- Enable RLS on pending_gemstones
ALTER TABLE public.pending_gemstones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Authenticated users can view pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Users can insert pending stones" ON public.pending_gemstones;
DROP POLICY IF EXISTS "Service role can update pending stones" ON public.pending_gemstones;

-- Create new policies for pending_gemstones
CREATE POLICY "Users can view their own pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view pending stones" ON public.pending_gemstones
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert pending stones" ON public.pending_gemstones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update pending stones" ON public.pending_gemstones
  FOR UPDATE USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.pending_users TO authenticated;
GRANT ALL ON public.pending_users TO service_role;
GRANT ALL ON public.pending_gemstones TO authenticated;
GRANT ALL ON public.pending_gemstones TO service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
