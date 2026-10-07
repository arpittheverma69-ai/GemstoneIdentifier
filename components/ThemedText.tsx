import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography, Fonts, Colors } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body"
    | "small"
    | "caption"
    | "link"
    | "mono";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const themeResult = useTheme();
  const isDark = themeResult?.isDark || false;
  const theme = themeResult?.theme || (isDark ? Colors?.dark : Colors?.light);

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme?.link || (isDark ? "#A78BFA" : "#8B5CF6");
    }

    return isDark ? (theme?.text || "#FFFFFF") : (theme?.text || "#0F172A");
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.link;
      case "mono":
        return { ...Typography.mono, fontFamily: Fonts?.mono };
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
