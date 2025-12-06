import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Modal, FlatList, SafeAreaView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export interface FieldValue {
  value: string;
  source: "preset" | "custom";
}

interface SelectableFieldWithOtherProps {
  label: string;
  options: readonly string[];
  value: FieldValue | null;
  onSelect: (value: FieldValue) => void;
  placeholder?: string;
}

export function SelectableFieldWithOther({
  label,
  options,
  value,
  onSelect,
  placeholder = "Type custom value…",
}: SelectableFieldWithOtherProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  // Initialize custom value from existing value
  useEffect(() => {
    if (value?.source === "custom") {
      setCustomValue(value.value);
    }
  }, [value]);

  const allOptions = [...options, "Other"];

  const isOtherSelected = value?.source === "custom" || (value && !options.includes(value.value));
  const showCustomInput = isOtherSelected;

  const getDisplayValue = () => {
    if (!value) return null;
    if (value.source === "preset" && options.includes(value.value)) {
      return value.value;
    }
    if (value.source === "custom") {
      return "Other";
    }
    return null;
  };

  const displayValue = getDisplayValue();

  const handleSelect = (option: string) => {
    if (option === "Other") {
      // Keep "Other" selected, show input
      onSelect({ value: customValue || "", source: "custom" });
    } else {
      onSelect({ value: option, source: "preset" });
      setCustomValue(""); // Clear custom value when selecting preset
    }
    setIsOpen(false);
  };

  const handleCustomInputChange = (text: string) => {
    setCustomValue(text);
    onSelect({ value: text, source: "custom" });
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.inputBackground,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText 
          type="body" 
          style={[
            styles.triggerText,
            !displayValue && { color: theme.textSecondary }
          ]}
        >
          {displayValue || `Select ${label.toLowerCase()}...`}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>

      {showCustomInput && (
        <View style={styles.customInputContainer}>
          <Input
            placeholder={placeholder}
            value={value?.source === "custom" ? value.value : customValue}
            onChangeText={handleCustomInputChange}
            style={styles.customInput}
          />
        </View>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable 
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <ThemedView style={styles.modal}>
              <View style={styles.modalHeader}>
                <ThemedText type="h4">{label}</ThemedText>
                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
              <FlatList
                data={allOptions}
                keyExtractor={(item) => item}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item === "Other" 
                    ? isOtherSelected 
                    : displayValue === item;
                  return (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: isSelected 
                            ? theme.primary + "20" 
                            : pressed 
                              ? theme.backgroundSecondary 
                              : "transparent",
                        },
                      ]}
                    >
                      <ThemedText 
                        type="body"
                        style={isSelected ? { color: theme.primary, fontWeight: "600" } : undefined}
                      >
                        {item}
                      </ThemedText>
                      {isSelected ? (
                        <Feather name="check" size={20} color={theme.primary} />
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </ThemedView>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  trigger: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    flex: 1,
  },
  customInputContainer: {
    marginTop: Spacing.sm,
  },
  customInput: {
    marginTop: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "70%",
  },
  modal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  list: {
    maxHeight: 400,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});

