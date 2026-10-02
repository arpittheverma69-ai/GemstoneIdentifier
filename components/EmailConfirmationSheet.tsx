import React from "react";
import { View, Text, StyleSheet, Modal, Dimensions } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface EmailConfirmationSheetProps {
  visible: boolean;
  email: string;
  onConfirm: () => void;
}

export default function EmailConfirmationSheet({
  visible,
  email,
  onConfirm,
}: EmailConfirmationSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onConfirm}
    >
      <ThemedView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        {/* Success Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Feather name="mail" size={48} color={theme.primary} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText type="h2" style={styles.title}>
            Check Your Email
          </ThemedText>

          <Text style={[styles.message, { color: theme.text }]}>
            We've sent a confirmation email to:
          </Text>

          <View style={[styles.emailBox, { borderColor: theme.border }]}>
            <Text style={[styles.email, { color: theme.primary }]}>
              {email}
            </Text>
          </View>

          <View style={styles.instructionContainer}>
            <Feather name="info" size={16} color={theme.textSecondary} />
            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              Open your email app and click the confirmation link to activate
              your account
            </Text>
          </View>

          <View style={styles.instructionContainer}>
            <Feather name="check-circle" size={16} color={theme.success} />
            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              After confirming, you'll have full access to all features
            </Text>
          </View>

          <Button onPress={onConfirm} style={styles.button} variant="primary">
            <ThemedText style={{ color: theme.buttonText, fontWeight: "600" }}>
              I've Confirmed My Email
            </ThemedText>
          </Button>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    alignItems: "center",
    maxWidth: width * 0.85,
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 22,
  },
  emailBox: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 15,
    marginVertical: 20,
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    width: "100%",
    alignItems: "center",
  },
  email: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  instructionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    width: "100%",
  },
  instruction: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  button: {
    width: "100%",
    marginTop: 20,
    height: 56,
    borderRadius: 12,
  },
});
