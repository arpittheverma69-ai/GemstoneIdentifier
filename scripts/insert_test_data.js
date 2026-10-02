/**
 * Script to insert test gemstones into Supabase database
 * Run this with: node scripts/insert_test_data.js
 * 
 * Make sure you have SUPABASE_URL and SUPABASE_ANON_KEY in your environment
 * or update the script with your credentials
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testGemstones = [
  {
    variety: 'Ruby',
    chemical_composition: 'Al₂O₃ (Aluminium Oxide)',
    crystal_system: 'Trigonal',
    colors: ['Red', 'Pinkish-red', 'Purple-red', 'Dark red'],
    cause_of_color: 'Chromium',
    transparency: ['Transparent', 'Translucent', 'Opaque'],
    luster: 'Vitreous',
    hardness: 9,
    sg_min: 3.97,
    sg_max: 4.05,
    ri_min: 1.762,
    ri_max: 1.778,
    cleavage: 'None (lamellar twinning, directional parting)',
    fracture: 'Conchoidal, uneven',
    optic_character: 'DR (Uniaxial negative)',
    pleochroism: 'Strong dichroic (purplish-red to orangish-red)',
    inclusions: ['Silk (rutile needles)', 'Crystals', 'Feathers', 'Fingerprints', 'Zoning'],
    uv_response: 'Strong red fluorescence under LW-UV',
    simulants: ['Synthetic ruby', 'Red spinel', 'Garnet', 'Glass', 'Doublets', 'CZ'],
    treatments: ['Heat treatment', 'Lead glass filling', 'Fracture filling', 'Beryllium diffusion'],
    occurrences: ['Myanmar (Burma)', 'Sri Lanka', 'Mozambique', 'Thailand', 'Madagascar', 'India'],
    indian_name: 'Manik / Manek',
    category: 'Precious',
    formation: 'Forms in metamorphic rocks, particularly marble and gneiss. Requires aluminum-rich, silica-poor environments with trace chromium.',
    testing_guide: [
      'Check RI: Should be 1.762-1.778 with birefringence of 0.008',
      'Check SG: Should be 3.97-4.05 (heavier than spinel)',
      'Look for silk inclusions under magnification',
      'Test fluorescence: Strong red under LW-UV (natural) vs weak/no fluorescence (synthetic)',
      'Check for curved striae in synthetics vs straight growth lines in natural'
    ],
    market_demand: 'High',
    price_range_inr_min: 5000,
    price_range_inr_max: 500000,
    price_range_usd_min: 60,
    price_range_usd_max: 6000,
    is_custom: false
  },
  {
    variety: 'Sapphire',
    chemical_composition: 'Al₂O₃ (Aluminium Oxide)',
    crystal_system: 'Trigonal',
    colors: ['Blue', 'Pink', 'Yellow', 'Orange', 'Green', 'Purple', 'Colorless'],
    cause_of_color: 'Iron and Titanium (blue), Chromium (pink), Iron (yellow/green)',
    transparency: ['Transparent', 'Translucent'],
    luster: 'Vitreous',
    hardness: 9,
    sg_min: 3.98,
    sg_max: 4.06,
    ri_min: 1.762,
    ri_max: 1.778,
    cleavage: 'None (lamellar twinning, directional parting)',
    fracture: 'Conchoidal, uneven',
    optic_character: 'DR (Uniaxial negative)',
    pleochroism: 'Moderate to strong (blue to greenish-blue)',
    inclusions: ['Silk (rutile needles)', 'Zoning', 'Crystals', 'Fingerprints', 'Feathers'],
    uv_response: 'Inert to weak fluorescence',
    simulants: ['Synthetic sapphire', 'Blue spinel', 'Tanzanite', 'Iolite', 'Glass', 'CZ'],
    treatments: ['Heat treatment', 'Diffusion treatment', 'Beryllium diffusion', 'Lattice diffusion'],
    occurrences: ['Sri Lanka', 'Myanmar (Burma)', 'Kashmir (India)', 'Thailand', 'Madagascar', 'Australia', 'Montana (USA)'],
    indian_name: 'Neelam (Blue) / Pukhraj (Yellow)',
    category: 'Precious',
    formation: 'Forms in metamorphic and igneous rocks. Blue sapphires typically form in aluminum-rich, silica-poor environments with iron and titanium.',
    testing_guide: [
      'Check RI: Should be 1.762-1.778',
      'Check SG: Should be 3.98-4.06',
      'Look for silk inclusions and zoning',
      'Test for asterism (star sapphires)',
      'Check for color zoning and growth patterns'
    ],
    market_demand: 'High',
    price_range_inr_min: 3000,
    price_range_inr_max: 300000,
    price_range_usd_min: 36,
    price_range_usd_max: 3600,
    is_custom: false
  }
];

async function insertTestGemstones() {
  console.log('🚀 Starting to insert test gemstones...\n');

  for (const gemstone of testGemstones) {
    try {
      // Check if gemstone already exists
      const { data: existing } = await supabase
        .from('gemstones')
        .select('id, variety')
        .eq('variety', gemstone.variety)
        .eq('is_custom', false)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️  ${gemstone.variety} already exists, skipping...`);
        continue;
      }

      const { data, error } = await supabase
        .from('gemstones')
        .insert(gemstone)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error inserting ${gemstone.variety}:`, error.message);
      } else {
        console.log(`✅ Successfully inserted ${gemstone.variety}`);
        console.log(`   - RI: ${gemstone.ri_min}-${gemstone.ri_max}`);
        console.log(`   - SG: ${gemstone.sg_min}-${gemstone.sg_max}`);
        console.log(`   - Price: ₹${gemstone.price_range_inr_min.toLocaleString()} - ₹${gemstone.price_range_inr_max.toLocaleString()}`);
        console.log(`   - Optic: ${gemstone.optic_character}`);
        console.log(`   - Pleochroism: ${gemstone.pleochroism}\n`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error with ${gemstone.variety}:`, err.message);
    }
  }

  console.log('✨ Done! Check your app to see the gemstones in the list.');
}

insertTestGemstones();



