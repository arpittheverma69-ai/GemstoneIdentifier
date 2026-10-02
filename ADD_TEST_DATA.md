# Adding Test Gemstones to Database

This guide will help you add 1-2 test gemstones to your Supabase database so they appear in the app's gemstone list.

## Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL from `supabase/insert_test_gemstones.sql`
4. Click **Run** to execute the SQL
5. The gemstones (Ruby, Sapphire, Emerald) will be added to the `public.gemstones` table

## Option 2: Using Node.js Script

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```
3. Set your environment variables in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the script:
   ```bash
   node scripts/insert_test_data.js
   ```

## Option 3: Manual Insert via Supabase Dashboard

1. Go to **Table Editor** in Supabase dashboard
2. Select the `gemstones` table
3. Click **Insert row**
4. Fill in the following for Ruby:

```
variety: Ruby
chemical_composition: Al₂O₃ (Aluminium Oxide)
crystal_system: Trigonal
colors: ["Red", "Pinkish-red", "Purple-red", "Dark red"]
cause_of_color: Chromium
transparency: ["Transparent", "Translucent", "Opaque"]
luster: Vitreous
hardness: 9
sg_min: 3.97
sg_max: 4.05
ri_min: 1.762
ri_max: 1.778
cleavage: None (lamellar twinning, directional parting)
fracture: Conchoidal, uneven
optic_character: DR (Uniaxial negative)
pleochroism: Strong dichroic (purplish-red to orangish-red)
inclusions: ["Silk (rutile needles)", "Crystals", "Feathers", "Fingerprints", "Zoning"]
uv_response: Strong red fluorescence under LW-UV
simulants: ["Synthetic ruby", "Red spinel", "Garnet", "Glass", "Doublets", "CZ"]
treatments: ["Heat treatment", "Lead glass filling", "Fracture filling", "Beryllium diffusion"]
occurrences: ["Myanmar (Burma)", "Sri Lanka", "Mozambique", "Thailand", "Madagascar", "India"]
indian_name: Manik / Manek
category: Precious
formation: Forms in metamorphic rocks, particularly marble and gneiss. Requires aluminum-rich, silica-poor environments with trace chromium.
testing_guide: ["Check RI: Should be 1.762-1.778 with birefringence of 0.008", "Check SG: Should be 3.97-4.05 (heavier than spinel)", "Look for silk inclusions under magnification", "Test fluorescence: Strong red under LW-UV (natural) vs weak/no fluorescence (synthetic)", "Check for curved striae in synthetics vs straight growth lines in natural"]
market_demand: High
price_range_inr_min: 5000
price_range_inr_max: 500000
price_range_usd_min: 60
price_range_usd_max: 6000
is_custom: false
```

5. Click **Save** to insert the row
6. Repeat for Sapphire or Emerald if desired

## Verifying the Data

After inserting the data:

1. Open your app
2. Navigate to the **Gems** screen
3. You should see the gemstones in the list with:
   - **Optic**: DR (Uniaxial negative)
   - **Pleochroism**: Strong dichroic...
   - **RI**: 1.762-1.778
   - **SG**: 3.97-4.05
   - **Avg ₹**: Calculated average price

## Card View UI

The card view displays:
- **Stone Name** (e.g., "Ruby")
- **Indian Name** (e.g., "MANIK / MANEK")
- **Optical Properties**: Optic character and Pleochroism
- **RI** (Refractive Index): Purple text
- **SG** (Specific Gravity): Green text
- **Avg ₹** (Average Price): Orange text
- **Category Badge**: Yellow for Precious, Purple for Semi-precious

This matches the design shown in the app mockup.



