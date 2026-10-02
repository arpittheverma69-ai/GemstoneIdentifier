-- Import gemstone data from CSV
-- Note: Colors and Occurences are arrays, so we need to split them by '; '

COPY public.total_gemstones (
  "Title", 
  "Common Name", 
  "Species", 
  "Transparency", 
  "Dispersion", 
  "Refractive Index", 
  "Optic Character", 
  "Polariscope Reaction", 
  "Fluorescence", 
  "Pleochroism", 
  "Hardness", 
  "Specific Gravity", 
  "Toughness", 
  "Inclusions", 
  "Luster", 
  "Stability", 
  "Chemical Name", 
  "Chemical Formula", 
  "Crystal System", 
  "Colors", 
  "Occurences"
) FROM '/Users/arpitverma/Downloads/GemstoneIdentifier/Gem SPY FINAL DATA new edits.xlsx - Sheet1.csv' 
WITH (FORMAT csv, HEADER true);
