const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Function to parse arrays from CSV (Colors and Occurences)
function parseArrayField(field) {
  if (!field || field.trim() === '') return [];
  return field.split(';').map(item => item.trim()).filter(item => item !== '');
}

// Function to fix CSV by generating UUIDs for empty id fields
async function fixCsvWithUuids() {
  try {
    const inputCsvPath = '/Users/arpitverma/Downloads/Gem SPY FINAL DATA new edits.xlsx - Sheet1 (3).csv';
    const outputCsvPath = '/Users/arpitverma/Downloads/GemstoneIdentifier/fixed_gemstone_data.csv';
    const results = [];
    
    console.log('Reading CSV file...');
    
    // Read CSV file
    fs.createReadStream(inputCsvPath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        console.log(`Read ${results.length} records from CSV`);
        
        // Process each record
        const fixedRecords = results.map((record, index) => {
          // Generate UUID for empty id field
          const id = record.id && record.id.trim() !== '' ? record.id : uuidv4();
          
          // Ensure user_id is valid (use the existing one or generate a new one)
          const userId = record.user_id && record.user_id.trim() !== '' ? record.user_id : '00000000-0000-0000-0000-000000000001';
          
          return {
            id: id,
            user_id: userId,
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
            "Category": record.Category || "Semi-precious",
            "Tag": record.Tag || "Semi-precious",
            "images": record.images || '{"stoneImages": [], "inclusionImages": [], "spectroscopeImages": []}',
            "created_at": record.created_at || new Date().toISOString(),
            "updated_at": record.updated_at || new Date().toISOString()
          };
        });
        
        // Write fixed CSV
        const csvWriter = createObjectCsvWriter({
          path: outputCsvPath,
          header: [
            { id: 'id', title: 'id' },
            { id: 'user_id', title: 'user_id' },
            { id: 'Title', title: 'Title' },
            { id: 'Common Name', title: 'Common Name' },
            { id: 'Species', title: 'Species' },
            { id: 'Transparency', title: 'Transparency' },
            { id: 'Dispersion', title: 'Dispersion' },
            { id: 'Refractive Index', title: 'Refractive Index' },
            { id: 'Optic Character', title: 'Optic Character' },
            { id: 'Polariscope Reaction', title: 'Polariscope Reaction' },
            { id: 'Fluorescence', title: 'Fluorescence' },
            { id: 'Pleochroism', title: 'Pleochroism' },
            { id: 'Hardness', title: 'Hardness' },
            { id: 'Specific Gravity', title: 'Specific Gravity' },
            { id: 'Toughness', title: 'Toughness' },
            { id: 'Inclusions', title: 'Inclusions' },
            { id: 'Luster', title: 'Luster' },
            { id: 'Stability', title: 'Stability' },
            { id: 'Chemical Name', title: 'Chemical Name' },
            { id: 'Chemical Formula', title: 'Chemical Formula' },
            { id: 'Crystal System', title: 'Crystal System' },
            { id: 'Colors', title: 'Colors' },
            { id: 'Occurences', title: 'Occurences' },
            { id: 'Category', title: 'Category' },
            { id: 'Tag', title: 'Tag' },
            { id: 'images', title: 'images' },
            { id: 'created_at', title: 'created_at' },
            { id: 'updated_at', title: 'updated_at' }
          ]
        });
        
        await csvWriter.writeRecords(fixedRecords);
        
        console.log(`✅ Fixed CSV saved to: ${outputCsvPath}`);
        console.log(`Generated UUIDs for ${fixedRecords.filter(r => !results[fixedRecords.indexOf(r)].id).length} records with empty IDs`);
        console.log('You can now import this fixed CSV file into your database.');
      });
    
  } catch (error) {
    console.error('Error fixing CSV:', error);
  }
}

// Run the fix
fixCsvWithUuids();
