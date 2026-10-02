-- Fix Tag constraint in pending_gemstones table to match app options
-- Run this script in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE public.pending_gemstones DROP CONSTRAINT IF EXISTS pending_gemstones_Tag_check;

-- Add new constraint that matches the app's TAG_OPTIONS
ALTER TABLE public.pending_gemstones 
ADD CONSTRAINT pending_gemstones_Tag_check 
CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Others'));

-- Also fix the same issue in total_gemstones table
ALTER TABLE public.total_gemstones DROP CONSTRAINT IF EXISTS total_gemstones_Tag_check;

ALTER TABLE public.total_gemstones 
ADD CONSTRAINT total_gemstones_Tag_check 
CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Others'));

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
