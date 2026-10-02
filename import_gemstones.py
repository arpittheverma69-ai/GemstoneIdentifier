import csv
import sys
import os
import psycopg2
from psycopg2.extras import execute_values

# Database connection
DB_URL = os.environ.get('SUPABASE_DB_URL') or "postgresql://postgres.tgwxpyfespesfnqadnpn:your_password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def parse_array_field(value):
    """Parse semicolon-separated values into array"""
    if not value or value == 'NA':
        return []
    return [item.strip() for item in value.split(';') if item.strip()]

def import_gemstones(csv_file):
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            rows = []
            for row in reader:
                # Parse array fields
                colors = parse_array_field(row.get('Colors', ''))
                occurrences = parse_array_field(row.get('Occurences', ''))
                
                # Prepare the row data
                rows.append((
                    None,  # user_id (NULL for system records)
                    row.get('Title'),
                    row.get('Common Name'),
                    row.get('Species'),
                    row.get('Transparency'),
                    row.get('Dispersion'),
                    row.get('Refractive Index'),
                    row.get('Optic Character'),
                    row.get('Polariscope Reaction'),
                    row.get('Fluorescence'),
                    row.get('Pleochroism'),
                    row.get('Hardness'),
                    row.get('Specific Gravity'),
                    row.get('Toughness'),
                    row.get('Inclusions'),
                    row.get('Luster'),
                    row.get('Stability'),
                    row.get('Chemical Name'),
                    row.get('Chemical Formula'),
                    row.get('Crystal System'),
                    colors,  # Colors as array
                    occurrences,  # Occurences as array
                    'Semi-precious',  # Category default
                    'Semi-precious',  # Tag default
                    None,  # images JSONB
                ))
            
            # Insert data
            query = """
                INSERT INTO public.total_gemstones (
                    user_id, "Title", "Common Name", "Species", "Transparency", 
                    "Dispersion", "Refractive Index", "Optic Character", 
                    "Polariscope Reaction", "Fluorescence", "Pleochroism", 
                    "Hardness", "Specific Gravity", "Toughness", "Inclusions", 
                    "Luster", "Stability", "Chemical Name", "Chemical Formula", 
                    "Crystal System", "Colors", "Occurences", "Category", "Tag", images
                ) VALUES %s
            """
            
            execute_values(cursor, query, rows)
            conn.commit()
            
            print(f"Successfully imported {len(rows)} gemstones")
            
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    csv_file = "/Users/arpitverma/Downloads/GemstoneIdentifier/Gem SPY FINAL DATA new edits.xlsx - Sheet1.csv"
    import_gemstones(csv_file)
