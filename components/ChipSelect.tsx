import React from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ChipSelectProps {
  label?: string;
  options: readonly string[];
  selected: string[];
  onSelect: (values: string[]) => void;
  multi?: boolean;
}

export function ChipSelect({ 
  label, 
  options, 
  selected, 
  onSelect,
  multi = true,
}: ChipSelectProps) {
  const { theme } = useTheme();

  const handlePress = (option: string) => {
    if (multi) {
      if (selected.includes(option)) {
        onSelect(selected.filter(s => s !== option));
      } else {
        onSelect([...selected, option]);
      }
    } else {
      onSelect([option]);
    }
  };

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => handlePress(option)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected 
                    ? theme.primary 
                    : theme.inputBackground,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText 
                type="small"
                style={{ color: isSelected ? "#FFFFFF" : theme.text }}
              >
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
