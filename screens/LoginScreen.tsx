import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { signIn, resetPassword } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.success && result.user) {
        setUser(result.user);
        // Navigation will be handled by App.tsx based on auth state
      } else {
        const message = result.error || "Invalid email or password";
        switch (result.errorCode) {
          case "invalid_credentials":
            Alert.alert("Login Failed", "Incorrect email or password. Please try again.");
            break;
          case "email_not_confirmed":
            Alert.alert(
              "Email Not Verified",
              "Please verify your email address before signing in. Check your inbox for the confirmation link."
            );
            break;
          case "user_not_found":
            Alert.alert("Account Not Found", "We couldn't find an account with that email. Please check for typos or sign up.");
            break;
          case "network_error":
            Alert.alert("Network Error", "We couldn't reach the server. Please check your internet connection and try again.");
            break;
          default:
            Alert.alert("Login Failed", message);
            break;
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An unexpected error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        Alert.alert(
          "Password Reset",
          "Check your email for password reset instructions",
          [
            {
              text: "OK",
              onPress: () => setForgotPasswordMode(false),
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to send reset email");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred");
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
            <Card
              style={[
                styles.logoCard,
                Shadows.lg,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.logoInnerWrapper}>
                <Image
                  source={require("../assets/images/gemspyLogo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Card>
            <ThemedText type="h1" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {forgotPasswordMode
                ? "Enter your email to reset your password"
                : "Sign in to continue to GemSpy"}
            </ThemedText>
          </View>

          {/* Form Card */}
          <Card style={[styles.formCard, Shadows.lg]}>
            {forgotPasswordMode ? (
              <>
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <View style={styles.formSpacer} />
                <Button
                  onPress={handleForgotPassword}
                  variant="primary"
                  disabled={isLoading}
                  style={styles.submitButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <View style={styles.formSpacer} />
                <Button
                  onPress={() => setForgotPasswordMode(false)}
                  variant="outline"
                >
                  Back to Login
                </Button>
              </>
            ) : (
              <>
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
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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
                <Button
                  onPress={() => setForgotPasswordMode(true)}
                  variant="ghost"
                  style={styles.forgotButton}
                >
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    Forgot Password?
                  </ThemedText>
                </Button>
                <View style={styles.formSpacer} />
                <Button
                  onPress={handleLogin}
                  variant="primary"
                  disabled={isLoading}
                  style={styles.submitButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <View style={styles.formSpacer} />
                <View style={styles.signUpContainer}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>
                    Don't have an account?{" "}
                  </ThemedText>
                  <Button
                    onPress={() => navigation.navigate("SignUp")}
                    variant="ghost"
                  >
                    <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                      Sign Up
                    </ThemedText>
                  </Button>
                </View>
              </>
            )}
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
  logoCard: {
    width: 148,
    height: 148,
    borderRadius: BorderRadius.full,
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  logoInnerWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  logoImage: {
    width: "100%",
    height: "100%",
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
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: Spacing.xs,
  },
  signUpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});






