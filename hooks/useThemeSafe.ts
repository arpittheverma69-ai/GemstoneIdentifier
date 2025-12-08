import { useTheme } from "./useTheme";
import { Colors } from "@/constants/theme";

// Safe fallback theme
const FALLBACK = {
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

// Safe wrapper that ALWAYS returns valid theme
export function useThemeSafe() {
  try {
    const result = useTheme();
    if (result && result.theme && typeof result.theme === "object") {
      return {
        theme: { ...FALLBACK, ...result.theme },
        isDark: result.isDark || false,
      };
    }
  } catch (e) {
    // If anything fails, return fallback
  }
  
  // Ultimate fallback
  return {
    theme: Colors?.light || FALLBACK,
    isDark: false,
  };
}


