import { useColorScheme as useRNColorScheme, Appearance } from "react-native";

export function useColorScheme(): "light" | "dark" {
  const scheme = useRNColorScheme() ?? Appearance.getColorScheme();
  return scheme === "dark" ? "dark" : "light";
}

