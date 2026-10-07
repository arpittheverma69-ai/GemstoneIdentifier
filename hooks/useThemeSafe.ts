import { useTheme } from "./useTheme";
import { Colors } from "@/constants/theme";

// Safe fallback themes
const FALLBACK_LIGHT = {
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

const FALLBACK_DARK = {
  text: "#FFFFFF",
  textSecondary: "#94A3B8",
  buttonText: "#FFFFFF",
  tabIconDefault: "#64748B",
  tabIconSelected: "#A78BFA",
  link: "#A78BFA",
  backgroundRoot: "#0F172A",
  backgroundDefault: "#1E293B",
  backgroundSecondary: "#334155",
  backgroundTertiary: "#475569",
  primary: "#A78BFA",
  primaryLight: "#C4B5FD",
  primaryDark: "#8B5CF6",
  secondary: "#FBBF24",
  secondaryLight: "#FCD34D",
  success: "#34D399",
  successLight: "#6EE7B7",
  warning: "#FBBF24",
  warningLight: "#FCD34D",
  danger: "#F87171",
  dangerLight: "#FCA5A5",
  border: "#334155",
  inputBackground: "#1E293B",
  gradientStart: "#A78BFA",
  gradientEnd: "#F472B6",
};

// Safe wrapper that ALWAYS returns valid theme
export function useThemeSafe() {
  try {
    const result = useTheme();
    if (result && result.theme && typeof result.theme === "object") {
      const isDark = result.isDark || false;
      const fallback = isDark ? FALLBACK_DARK : FALLBACK_LIGHT;
      return {
        theme: { ...fallback, ...result.theme },
        isDark,
      };
    }
  } catch (e) {
    // If anything fails, return fallback
  }
  
  return {
    theme: Colors?.dark || FALLBACK_DARK,
    isDark: true,
  };
}



