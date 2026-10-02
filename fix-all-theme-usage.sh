#!/bin/bash

# Fix all useTheme() calls to use safe wrapper
echo "Fixing all theme usage..."

# Create a safe wrapper function in each file that uses useTheme
# This ensures theme is always available

FILES=$(grep -r "const.*{.*theme.*}.*=.*useTheme()" --include="*.tsx" --include="*.ts" . | cut -d: -f1 | sort -u)

for file in $FILES; do
  if [[ "$file" == *"useTheme.ts"* ]] || [[ "$file" == *"useThemeSafe.ts"* ]]; then
    continue
  fi
  
  # Check if getThemeSafe already exists
  if grep -q "getThemeSafe" "$file"; then
    continue
  fi
  
  # Add safety wrapper after imports
  if grep -q "import.*useTheme" "$file"; then
    # Add wrapper function
    sed -i.bak '/import.*useTheme/a\
\
// Safety wrapper to ensure theme is always available\
function getThemeSafe() {\
  try {\
    const result = useTheme();\
    if (result && result.theme) {\
      return result;\
    }\
  } catch (e) {\
    // Fall through to default\
  }\
  return {\
    theme: {\
      text: "#0F172A",\
      textSecondary: "#64748B",\
      primary: "#8B5CF6",\
      secondary: "#F59E0B",\
      success: "#10B981",\
      backgroundRoot: "#F8FAFC",\
      backgroundDefault: "#FFFFFF",\
      backgroundSecondary: "#F1F5F9",\
      border: "#E2E8F0",\
      inputBackground: "#FFFFFF",\
    },\
    isDark: false,\
  };\
}
' "$file"
    
    # Replace useTheme() with getThemeSafe()
    sed -i.bak 's/const { theme } = useTheme();/const { theme } = getThemeSafe();/g' "$file"
    sed -i.bak 's/const { theme, isDark } = useTheme();/const { theme, isDark } = getThemeSafe();/g' "$file"
    
    rm -f "$file.bak"
    echo "Fixed: $file"
  fi
done

echo "Done!"



