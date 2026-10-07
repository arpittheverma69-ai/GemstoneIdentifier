import { useEffect, useState } from "react";
import { Appearance } from "react-native";

/**
 * Accurately detect system color scheme on web using window.matchMedia
 */
export function useColorScheme(): "light" | "dark" {
  const getSystemScheme = (): "light" | "dark" => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    const rnScheme = Appearance.getColorScheme();
    return rnScheme === "dark" ? "dark" : "light";
  };

  const [colorScheme, setColorScheme] = useState<"light" | "dark">(getSystemScheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    // Set initial sync
    setColorScheme(mediaQuery.matches ? "dark" : "light");

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handler);
      return () => (mediaQuery as any).removeListener(handler);
    }
  }, []);

  return colorScheme;
}

