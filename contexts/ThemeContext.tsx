import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

// Safe fallback theme - ALWAYS available
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

// Get safe theme from Colors or use fallback
function getSafeTheme(isDark: boolean) {
  try {
    if (Colors && Colors[isDark ? 'dark' : 'light']) {
      return { ...SAFE_THEME, ...Colors[isDark ? 'dark' : 'light'] };
    }
    if (Colors && Colors.light) {
      return { ...SAFE_THEME, ...Colors.light };
    }
  } catch {
    // Fall through to SAFE_THEME
  }
  return SAFE_THEME;
}

// GUARANTEED valid default value
const DEFAULT_THEME_VALUE = {
  theme: SAFE_THEME,
  isDark: false,
};

const ThemeContext = createContext(DEFAULT_THEME_VALUE);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  // Safety check - ensure context has theme property
  if (!context || !context.theme || typeof context.theme !== 'object') {
    return DEFAULT_THEME_VALUE;
  }
  return context;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getSafeTheme(isDark);

  // GUARANTEED to provide valid value
  const value = {
    theme: { ...SAFE_THEME, ...theme },
    isDark: isDark || false,
  };

  // Final safety check
  if (!value.theme || typeof value.theme !== 'object') {
    return (
      <ThemeContext.Provider value={DEFAULT_THEME_VALUE}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
