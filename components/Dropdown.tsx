import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  Modal, 
  FlatList,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DropdownProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: string[];
  onSelect: (value: string) => void;
}

export function Dropdown({ 
  label, 
  placeholder = "Select...", 
  value, 
  options, 
  onSelect 
}: DropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
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
            !value && { color: theme.textSecondary }
          ]}
        >
          {value || placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>

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
                <ThemedText type="h4">{label || "Select Option"}</ThemedText>
                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                style={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: value === item 
                          ? theme.primary + "20" 
                          : pressed 
                            ? theme.backgroundSecondary 
                            : "transparent",
                      },
                    ]}
                  >
                    <ThemedText 
                      type="body"
                      style={value === item ? { color: theme.primary } : undefined}
                    >
                      {item}
                    </ThemedText>
                    {value === item ? (
                      <Feather name="check" size={20} color={theme.primary} />
                    ) : null}
                  </Pressable>
                )}
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
  },
  label: {
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
