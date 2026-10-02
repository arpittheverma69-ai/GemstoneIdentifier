# Insert 2 Test Stones into Database

Follow these steps to insert 2 test gemstones (Ruby and Sapphire) into your Supabase database:

## Method 1: Using Node.js Script (Recommended)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

2. **Set up environment variables** in `.env` file:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the script**:
   ```bash
   node scripts/insert_2_test_stones.js
   ```

4. **Verify** - The script will:
   - Check if stones already exist
   - Insert Ruby and Sapphire if they don't exist
   - Show verification of inserted stones

## Method 2: Using Supabase Dashboard SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Insert Ruby (if not exists)
INSERT INTO public.gemstones (
  variety, chemical_composition, crystal_system, colors, cause_of_color,
  transparency, luster, hardness, sg_min, sg_max, ri_min, ri_max,
  cleavage, fracture, optic_character, pleochroism, inclusions,
  uv_response, simulants, treatments, occurrences, indian_name,
  category, formation, testing_guide, market_demand,
  price_range_inr_min, price_range_inr_max, price_range_usd_min, price_range_usd_max,
  is_custom
)
SELECT 
  'Ruby', 'Al₂O₃ (Aluminium Oxide)', 'Trigonal',
  ARRAY['Red', 'Pinkish-red', 'Purple-red', 'Dark red'],
  'Chromium', ARRAY['Transparent', 'Translucent', 'Opaque'],
  'Vitreous', 9, 3.97, 4.05, 1.762, 1.778,
  'None (lamellar twinning, directional parting)', 'Conchoidal, uneven',
  'DR (Uniaxial negative)', 'Strong dichroic (purplish-red to orangish-red)',
  ARRAY['Silk (rutile needles)', 'Crystals', 'Feathers', 'Fingerprints', 'Zoning'],
  'Strong red fluorescence under LW-UV',
  ARRAY['Synthetic ruby', 'Red spinel', 'Garnet', 'Glass', 'Doublets', 'CZ'],
  ARRAY['Heat treatment', 'Lead glass filling', 'Fracture filling', 'Beryllium diffusion'],
  ARRAY['Myanmar (Burma)', 'Sri Lanka', 'Mozambique', 'Thailand', 'Madagascar', 'India'],
  'Manik / Manek', 'Precious',
  'Forms in metamorphic rocks, particularly marble and gneiss.',
  ARRAY['Check RI: Should be 1.762-1.778', 'Check SG: Should be 3.97-4.05'],
  'High', 5000, 500000, 60, 6000, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.gemstones 
  WHERE variety = 'Ruby' AND is_custom = false
);

-- Insert Sapphire (if not exists)
INSERT INTO public.gemstones (
  variety, chemical_composition, crystal_system, colors, cause_of_color,
  transparency, luster, hardness, sg_min, sg_max, ri_min, ri_max,
  cleavage, fracture, optic_character, pleochroism, inclusions,
  uv_response, simulants, treatments, occurrences, indian_name,
  category, formation, testing_guide, market_demand,
  price_range_inr_min, price_range_inr_max, price_range_usd_min, price_range_usd_max,
  is_custom
)
SELECT 
  'Sapphire', 'Al₂O₃ (Aluminium Oxide)', 'Trigonal',
  ARRAY['Blue', 'Pink', 'Yellow', 'Orange', 'Green', 'Purple', 'Colorless'],
  'Iron and Titanium (blue), Chromium (pink), Iron (yellow/green)',
  ARRAY['Transparent', 'Translucent'], 'Vitreous', 9, 3.98, 4.06, 1.762, 1.778,
  'None (lamellar twinning, directional parting)', 'Conchoidal, uneven',
  'DR (Uniaxial negative)', 'Moderate to strong (blue to greenish-blue)',
  ARRAY['Silk (rutile needles)', 'Zoning', 'Crystals', 'Fingerprints', 'Feathers'],
  'Inert to weak fluorescence',
  ARRAY['Synthetic sapphire', 'Blue spinel', 'Tanzanite', 'Iolite', 'Glass', 'CZ'],
  ARRAY['Heat treatment', 'Diffusion treatment', 'Beryllium diffusion', 'Lattice diffusion'],
  ARRAY['Sri Lanka', 'Myanmar (Burma)', 'Kashmir (India)', 'Thailand', 'Madagascar', 'Australia', 'Montana (USA)'],
  'Neelam (Blue) / Pukhraj (Yellow)', 'Precious',
  'Forms in metamorphic and igneous rocks.',
  ARRAY['Check RI: Should be 1.762-1.778', 'Check SG: Should be 3.98-4.06'],
  'High', 3000, 300000, 36, 3600, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.gemstones 
  WHERE variety = 'Sapphire' AND is_custom = false
);
```

4. Click **Run** to execute

## Verify in App

After inserting the stones:

1. **Open your app**
2. **Navigate to Gems screen**
3. **You should see**:
   - Ruby with all properties (RI: 1.762-1.778, SG: 3.97-4.05, etc.)
   - Sapphire with all properties (RI: 1.762-1.778, SG: 3.98-4.06, etc.)

## Test Add Stone Feature

1. **Click the + button** (Floating Action Button)
2. **Fill in the form** with stone details
3. **Click Save**
4. **Verify**:
   - Success message appears
   - New stone appears in the list
   - Stone is saved to `total_gemstones` table in Supabase

## Troubleshooting

- **No stones showing?** Check console logs for database connection errors
- **Add stone not working?** Verify you're logged in (custom stones require authentication)
- **Database connection issues?** Check your Supabase URL and API key in `app.json` or `.env`



