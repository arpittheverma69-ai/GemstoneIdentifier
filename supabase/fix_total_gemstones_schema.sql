-- Fix missing Category column in total_gemstones table
-- Run this if you're getting "Could not find the 'Category' column" error

DO $$
BEGIN
    -- Check if Category column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Category'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Category" TEXT DEFAULT 'Semi-precious';
        RAISE NOTICE 'Added Category column to total_gemstones table';
    ELSE
        RAISE NOTICE 'Category column already exists in total_gemstones table';
    END IF;
END $$;

-- Also ensure all other required columns exist
DO $$
BEGIN
    -- Check and add Dispersion if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Dispersion'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Dispersion" TEXT;
        RAISE NOTICE 'Added Dispersion column to total_gemstones table';
    END IF;

    -- Check and add Optic Character if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Optic Character'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Optic Character" TEXT;
        RAISE NOTICE 'Added Optic Character column to total_gemstones table';
    END IF;

    -- Check and add Polariscope Reaction if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Polariscope Reaction'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Polariscope Reaction" TEXT;
        RAISE NOTICE 'Added Polariscope Reaction column to total_gemstones table';
    END IF;

    -- Check and add Fluorescence if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Fluorescence'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Fluorescence" TEXT;
        RAISE NOTICE 'Added Fluorescence column to total_gemstones table';
    END IF;

    -- Check and add Pleochroism if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Pleochroism'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Pleochroism" TEXT;
        RAISE NOTICE 'Added Pleochroism column to total_gemstones table';
    END IF;

    -- Check and add Toughness if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Toughness'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Toughness" TEXT;
        RAISE NOTICE 'Added Toughness column to total_gemstones table';
    END IF;

    -- Check and add Inclusions if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Inclusions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Inclusions" TEXT;
        RAISE NOTICE 'Added Inclusions column to total_gemstones table';
    END IF;

    -- Check and add Luster if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Luster'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Luster" TEXT;
        RAISE NOTICE 'Added Luster column to total_gemstones table';
    END IF;

    -- Check and add Stability if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Stability'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Stability" TEXT;
        RAISE NOTICE 'Added Stability column to total_gemstones table';
    END IF;

    -- Check and add Chemical Name if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Chemical Name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Chemical Name" TEXT;
        RAISE NOTICE 'Added Chemical Name column to total_gemstones table';
    END IF;

    -- Check and add Chemical Formula if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Chemical Formula'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Chemical Formula" TEXT;
        RAISE NOTICE 'Added Chemical Formula column to total_gemstones table';
    END IF;

    -- Check and add Crystal System if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'total_gemstones' 
        AND column_name = 'Crystal System'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.total_gemstones 
        ADD COLUMN "Crystal System" TEXT;
        RAISE NOTICE 'Added Crystal System column to total_gemstones table';
    END IF;
END $$;
