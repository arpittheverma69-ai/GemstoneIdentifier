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

// Function to create import-ready CSV (excluding auto-generated columns)
async function createImportReadyCsv() {
  try {
    const inputCsvPath = '/Users/arpitverma/Downloads/Gem SPY FINAL DATA new edits.xlsx - Sheet1 (3).csv';
    const outputCsvPath = '/Users/arpitverma/Downloads/GemstoneIdentifier/import_ready_gemstone_data.csv';
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
        
        // Process each record - only include columns that should be imported
        const importRecords = results.map((record, index) => {
          // Generate UUID for empty id field
          const id = record.id && record.id.trim() !== '' ? record.id : uuidv4();
          
          // Ensure user_id is valid
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
            "Colors": JSON.stringify(parseArrayField(record.Colors)), // Convert array to JSON string
            "Occurences": JSON.stringify(parseArrayField(record.Occurences)), // Convert array to JSON string
            "Category": record.Category || "Semi-precious",
            "Tag": record.Tag || "Semi-precious",
            "images": record.images || '{"stoneImages": [], "inclusionImages": [], "spectroscopeImages": []}'
          };
        });
        
        // Write import-ready CSV (excluding created_at and updated_at as they're auto-generated)
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
            { id: 'images', title: 'images' }
          ]
        });
        
        await csvWriter.writeRecords(importRecords);
        
        console.log(`✅ Import-ready CSV saved to: ${outputCsvPath}`);
        console.log(`Generated UUIDs for ${importRecords.filter(r => !results[importRecords.indexOf(r)].id).length} records with empty IDs`);
        console.log('This CSV excludes created_at and updated_at (auto-generated by database)');
        console.log('Colors and Occurences are converted to JSON strings for proper array storage');
      });
    
  } catch (error) {
    console.error('Error creating import-ready CSV:', error);
  }
}

// Run the script
createImportReadyCsv();
