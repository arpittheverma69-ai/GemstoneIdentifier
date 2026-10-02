-- Check actual columns in total_gemstones table
-- Run this to see what columns currently exist

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'total_gemstones' 
AND table_schema = 'public'
ORDER BY ordinal_position;
