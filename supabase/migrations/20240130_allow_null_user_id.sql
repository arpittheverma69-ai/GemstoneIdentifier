-- Allow NULL user_id in total_gemstones table for bulk data import
ALTER TABLE public.total_gemstones ALTER COLUMN user_id DROP NOT NULL;
