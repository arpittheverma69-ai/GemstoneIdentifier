import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { signUp } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUpScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email.trim(), password, fullName.trim());
      if (result.success && result.user) {
        Alert.alert(
          "Success",
          "Account created successfully! Please check your email to verify your account.",
          [
            {
              text: "OK",
              onPress: () => {
                setUser(result.user!);
                // Navigation will be handled by App.tsx
              },
            },
          ]
        );
      } else {
        Alert.alert("Sign Up Failed", result.error || "Failed to create account");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="hexagon" size={48} color={theme.primary} />
            </View>
            <ThemedText type="h1" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join GemAI Pro to unlock all features
            </ThemedText>
          </View>

          {/* Form Card */}
          <Card style={[styles.formCard, Shadows.lg]}>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              leftIcon={<Feather name="user" size={20} color={theme.textSecondary} />}
            />
            <View style={styles.formSpacer} />
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon={<Feather name="mail" size={20} color={theme.textSecondary} />}
            />
            <View style={styles.formSpacer} />
            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              leftIcon={<Feather name="lock" size={20} color={theme.textSecondary} />}
              rightIcon={
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            <View style={styles.formSpacer} />
            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              leftIcon={<Feather name="lock" size={20} color={theme.textSecondary} />}
              rightIcon={
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />
            <View style={styles.formSpacer} />
            <Button
              onPress={handleSignUp}
              variant="primary"
              disabled={isLoading}
              style={styles.submitButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Create Account"
              )}
            </Button>
            <View style={styles.formSpacer} />
            <View style={styles.signInContainer}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Already have an account?{" "}
              </ThemedText>
              <Button
                onPress={() => navigation.navigate("Login")}
                variant="ghost"
              >
                <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                  Sign In
                </ThemedText>
              </Button>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl * 2,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  formCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  formSpacer: {
    height: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});


