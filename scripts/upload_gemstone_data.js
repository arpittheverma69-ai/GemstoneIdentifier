const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to parse arrays from CSV (Colors and Occurences)
function parseArrayField(field) {
  if (!field || field.trim() === '') return [];
  return field.split(';').map(item => item.trim()).filter(item => item !== '');
}

// Function to get or create a default user for bulk imports
async function getOrCreateDefaultUser() {
  // Use a fixed UUID for bulk imports, or create one if needed
  const bulkImportUserId = '00000000-0000-0000-0000-000000000001';
  
  // Check if user exists in profiles table
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', bulkImportUserId)
    .single();
  
  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create it
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: bulkImportUserId,
        email: 'bulk-import@gemspy.com',
        full_name: 'Bulk Import User'
      });
    
    if (insertError) {
      console.error('Error creating bulk import user:', insertError);
      throw insertError;
    }
  }
  
  return bulkImportUserId;
}

// Main upload function
async function uploadGemstoneData() {
  try {
    const csvFilePath = path.join(__dirname, 'Gem SPY FINAL DATA new edits.xlsx - Sheet1.csv');
    const results = [];
    
    // Get default user ID for bulk imports
    const defaultUserId = await getOrCreateDefaultUser();
    console.log('Using default user ID:', defaultUserId);
    
    // Read CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Read ${results.length} records from CSV`);
        
        // Process each record
        for (let i = 0; i < results.length; i++) {
          const record = results[i];
          
          // Map CSV fields to database fields
          const gemstoneData = {
            id: uuidv4(), // Generate new UUID for each record
            user_id: defaultUserId,
            "Title": record.Title || '',
            "Common Name": record["Common Name"] || '',
            "Species": record.Species || '',
            "Transparency": record.Transparency || '',
            "Dispersion": record.Dispersion || '',
            "Refractive Index": record["Refractive Index"] || '',
            "Optic Character": record["Optic Character"] || '',
            "Polariscope Reaction": record["Polariscope Reaction"] || '',
            "Fluorescence": record.Fluorescence || '',
            "Pleochroism": record.Pleochroism || '',
            "Hardness": record.Hardness || '',
            "Specific Gravity": record["Specific Gravity"] || '',
            "Toughness": record.Toughness || '',
            "Inclusions": record.Inclusions || '',
            "Luster": record.Luster || '',
            "Stability": record.Stability || '',
            "Chemical Name": record["Chemical Name"] || '',
            "Chemical Formula": record["Chemical Formula"] || '',
            "Crystal System": record["Crystal System"] || '',
            "Colors": parseArrayField(record.Colors),
            "Occurences": parseArrayField(record.Occurences),
            "Category": "Semi-precious", // Default category
            "Tag": "Semi-precious", // Default tag
            images: { stoneImages: [], inclusionImages: [] } // Empty images object
          };
          
          try {
            // Insert into total_gemstones table
            const { data, error } = await supabase
              .from('total_gemstones')
              .insert(gemstoneData);
            
            if (error) {
              console.error(`Error inserting record ${i + 1} (${record.Title}):`, error);
            } else {
              console.log(`✅ Successfully inserted: ${record.Title} (${i + 1}/${results.length})`);
            }
          } catch (err) {
            console.error(`Unexpected error for record ${i + 1}:`, err);
          }
          
          // Add a small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('Upload completed!');
      });
    
  } catch (error) {
    console.error('Error in upload process:', error);
  }
}

// Run the upload
uploadGemstoneData();
