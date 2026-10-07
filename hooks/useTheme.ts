import { useContext } from "react";
import { ThemeContext, SAFE_THEME_LIGHT, SAFE_THEME_DARK, getSafeTheme } from "@/contexts/ThemeContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/theme";

export function useTheme() {
  const context = useContext(ThemeContext);
  const colorScheme = useColorScheme();

  // If inside ThemeProvider with valid theme, use context
  if (context && context.theme && typeof context.theme === "object" && typeof context.isDark === "boolean") {
    return {
      theme: context.theme,
      isDark: context.isDark,
      themeMode: context.themeMode,
      setThemeMode: context.setThemeMode,
      toggleTheme: context.toggleTheme,
    };
  }

  // Fallback for standalone usage
  const isDark = colorScheme === "dark";
  const theme = getSafeTheme(isDark);

  return {
    theme,
    isDark,
    themeMode: isDark ? "dark" : "light",
    setThemeMode: async () => {},
    toggleTheme: async () => {},
  };
}

export default useTheme;
