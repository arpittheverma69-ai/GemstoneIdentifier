-- Simple fix for Tag constraint - run this in Supabase SQL Editor

-- Drop the constraint
ALTER TABLE public.pending_gemstones DROP CONSTRAINT IF EXISTS pending_gemstones_Tag_check;

-- Add the corrected constraint that matches the app
ALTER TABLE public.pending_gemstones 
ADD CONSTRAINT pending_gemstones_Tag_check 
CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Others'));

-- Also fix total_gemstones table
ALTER TABLE public.total_gemstones DROP CONSTRAINT IF EXISTS total_gemstones_Tag_check;

ALTER TABLE public.total_gemstones 
ADD CONSTRAINT total_gemstones_Tag_check 
CHECK ("Tag" IN ('Precious', 'Semi-precious', 'Others'));
