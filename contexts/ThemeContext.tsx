import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

export const SAFE_THEME_LIGHT = {
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

export const SAFE_THEME_DARK = {
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

export function getSafeTheme(isDark: boolean) {
  const safeBase = isDark ? SAFE_THEME_DARK : SAFE_THEME_LIGHT;
  try {
    if (Colors && Colors[isDark ? 'dark' : 'light']) {
      return { ...safeBase, ...Colors[isDark ? 'dark' : 'light'] };
    }
  } catch {
    // Fall through
  }
  return safeBase;
}

export interface ThemeContextType {
  theme: typeof SAFE_THEME_LIGHT;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const DEFAULT_THEME_VALUE: ThemeContextType = {
  theme: SAFE_THEME_LIGHT,
  isDark: false,
  themeMode: 'system',
  setThemeMode: async () => {},
  toggleTheme: async () => {},
};

export const ThemeContext = createContext<ThemeContextType>(DEFAULT_THEME_VALUE);

const THEME_STORAGE_KEY = '@app_theme_mode';

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context || !context.theme || typeof context.theme !== 'object') {
    return DEFAULT_THEME_VALUE;
  }
  return context;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored as ThemeMode);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const theme = getSafeTheme(isDark);

  const toggleTheme = async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
