import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";

// Complete fallback theme - ALWAYS available, never changes
const SAFE_THEME = {
  text: "#0F172A",
  textSecondary: "#64748B",
  buttonText: "#FFFFFF",
  tabIconDefault: "#94A3B8",
  tabIconSelected: "#8B5CF6",
  link: "#8B5CF6",
  backgroundRoot: "#F8FAFC",
  backgroundDefault: "#FFFFFF",
  backgroundSecondary: "#F1F5F9",
  backgroundTertiary: "#E2E8F0",
  primary: "#8B5CF6",
  primaryLight: "#A78BFA",
  primaryDark: "#7C3AED",
  secondary: "#F59E0B",
  secondaryLight: "#FBBF24",
  success: "#10B981",
  successLight: "#34D399",
  warning: "#F59E0B",
  warningLight: "#FBBF24",
  danger: "#EF4444",
  dangerLight: "#F87171",
  border: "#E2E8F0",
  inputBackground: "#FFFFFF",
  gradientStart: "#8B5CF6",
  gradientEnd: "#EC4899",
};

// GUARANTEED return value - always available
const ALWAYS_VALID_RESULT = {
  theme: SAFE_THEME,
  isDark: false,
};

// This function CANNOT fail - it always returns a valid object
export function useTheme() {
  // Hooks MUST be called unconditionally - no try-catch around hooks!
  const colorScheme = useColorScheme();
  
  // Get color scheme - default to light if null/undefined
  const scheme: "light" | "dark" = colorScheme === "dark" ? "dark" : "light";
  const isDark = colorScheme === "dark";

  // Get theme from Colors - if anything fails, use SAFE_THEME
  let theme = SAFE_THEME;
  
  try {
    if (Colors && typeof Colors === "object" && !Array.isArray(Colors)) {
      const colorTheme = Colors[scheme];
      if (colorTheme && typeof colorTheme === "object" && !Array.isArray(colorTheme)) {
        theme = { ...SAFE_THEME, ...colorTheme };
      }
    }
  } catch {
    // Use safe theme if anything fails
    theme = SAFE_THEME;
  }

  // GUARANTEED return - merge to ensure all properties exist
  const finalTheme = { ...SAFE_THEME, ...theme };
  
  // Create result object
  const result = {
    theme: finalTheme,
    isDark: isDark,
  };

  // Final validation - return ALWAYS_VALID_RESULT if anything is wrong
  if (!result || typeof result !== "object" || !result.theme || typeof result.theme !== "object") {
    return ALWAYS_VALID_RESULT;
  }

  // Ensure theme property exists
  if (!("theme" in result)) {
    return ALWAYS_VALID_RESULT;
  }

  return result;
}

export default useTheme;
