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
  Pressable,
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
import {
  signIn,
  resetPassword,
  verifyRecoveryOtpAndSetPassword,
} from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password & OTP recovery state
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify">("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Step 1: Send Reset Link & Code to Email
  const handleSendResetEmail = async () => {
    setResetFeedback(null);
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setResetStep("verify");
        setResetFeedback({
          type: "success",
          text: `Reset instructions & 6-digit code sent to ${email.trim()}. (Check your Spam/Junk folder if not in inbox)`,
        });
      } else {
        setResetFeedback({
          type: "error",
          text: result.error || "Failed to send reset email. Please try again.",
        });
      }
    } catch (error: any) {
      setResetFeedback({
        type: "error",
        text: error.message || "An error occurred while sending reset email.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP code & update password
  const handleVerifyOtpAndSetPassword = async () => {
    setResetFeedback(null);
    if (!email.trim()) {
      Alert.alert("Error", "Email address is required.");
      return;
    }
    if (!resetCode.trim()) {
      Alert.alert("Error", "Please enter the 6-digit verification code from your email.");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter your new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "Passwords do not match. Please re-type.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyRecoveryOtpAndSetPassword(
        email.trim(),
        resetCode.trim(),
        newPassword.trim()
      );

      if (res.success) {
        if (Platform.OS === "web") {
          window.alert("✅ Password reset successfully! You can now sign in with your new password.");
        } else {
          Alert.alert("Success", "Password reset successfully! You can now sign in with your new password.");
        }
        setForgotPasswordMode(false);
        setResetStep("request");
        setResetCode("");
        setPassword(newPassword);
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setResetFeedback({
          type: "error",
          text: res.error || "Invalid or expired verification code. Please check your email or click Resend.",
        });
      }
    } catch (error: any) {
      setResetFeedback({
        type: "error",
        text: error.message || "Failed to reset password.",
      });
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
              {forgotPasswordMode ? "Reset Password" : "Welcome Back"}
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {forgotPasswordMode
                ? resetStep === "request"
                  ? "Enter your email to receive a reset link & 6-digit code"
                  : "Enter the 6-digit code and your new password"
                : "Sign in to continue to GemSpy"}
            </ThemedText>
          </View>

          {/* Form Card */}
          <Card style={[styles.formCard, Shadows.lg]}>
            {forgotPasswordMode ? (
              resetStep === "request" ? (
                /* Step 1: Request Reset Email */
                <>
                  <Input
                    label="Account Email"
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon={<Feather name="mail" size={20} color={theme.textSecondary} />}
                  />

                  {resetFeedback && (
                    <View
                      style={[
                        styles.feedbackBox,
                        {
                          backgroundColor: resetFeedback.type === "success" ? "#10B98115" : "#EF444415",
                        },
                      ]}
                    >
                      <Feather
                        name={resetFeedback.type === "success" ? "check-circle" : "alert-circle"}
                        size={15}
                        color={resetFeedback.type === "success" ? "#10B981" : "#EF4444"}
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: resetFeedback.type === "success" ? "#10B981" : "#EF4444",
                          fontWeight: "600",
                          flex: 1,
                        }}
                      >
                        {resetFeedback.text}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.formSpacer} />
                  <Button
                    onPress={handleSendResetEmail}
                    variant="primary"
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? <ActivityIndicator color="#FFFFFF" /> : "Send Reset Link & Code"}
                  </Button>

                  <Pressable
                    onPress={() => setResetStep("verify")}
                    style={styles.switchStepBtn}
                  >
                    <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                      Already have a 6-digit code? Enter Code →
                    </ThemedText>
                  </Pressable>

                  <View style={styles.formSpacer} />
                  <Button
                    onPress={() => {
                      setForgotPasswordMode(false);
                      setResetFeedback(null);
                    }}
                    variant="outline"
                  >
                    Back to Login
                  </Button>
                </>
              ) : (
                /* Step 2: Verify Code & Set New Password */
                <>
                  <View style={[styles.emailBadgeRow, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="mail" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                    <ThemedText type="caption" style={{ color: theme.text, fontWeight: "600", flex: 1 }}>
                      {email}
                    </ThemedText>
                    <Pressable onPress={() => setResetStep("request")}>
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                        Change
                      </ThemedText>
                    </Pressable>
                  </View>

                  <Input
                    label="6-Digit Verification Code"
                    placeholder="e.g. 123456"
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    leftIcon={<Feather name="key" size={20} color={theme.textSecondary} />}
                  />

                  <View style={styles.formSpacer} />

                  <Input
                    label="New Password"
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    leftIcon={<Feather name="lock" size={20} color={theme.textSecondary} />}
                    rightIcon={
                      <Feather
                        name={showNewPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.textSecondary}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      />
                    }
                  />

                  <View style={styles.formSpacer} />

                  <Input
                    label="Confirm New Password"
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry={!showConfirmNewPassword}
                    autoCapitalize="none"
                    leftIcon={<Feather name="shield" size={20} color={theme.textSecondary} />}
                    rightIcon={
                      <Feather
                        name={showConfirmNewPassword ? "eye-off" : "eye"}
                        size={20}
                        color={theme.textSecondary}
                        onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      />
                    }
                  />

                  {resetFeedback && (
                    <View
                      style={[
                        styles.feedbackBox,
                        {
                          backgroundColor: resetFeedback.type === "success" ? "#10B98115" : "#EF444415",
                        },
                      ]}
                    >
                      <Feather
                        name={resetFeedback.type === "success" ? "check-circle" : "alert-circle"}
                        size={15}
                        color={resetFeedback.type === "success" ? "#10B981" : "#EF4444"}
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: resetFeedback.type === "success" ? "#10B981" : "#EF4444",
                          fontWeight: "600",
                          flex: 1,
                        }}
                      >
                        {resetFeedback.text}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.formSpacer} />
                  <Button
                    onPress={handleVerifyOtpAndSetPassword}
                    variant="primary"
                    disabled={isLoading}
                    style={styles.submitButton}
                  >
                    {isLoading ? <ActivityIndicator color="#FFFFFF" /> : "Reset Password & Sign In"}
                  </Button>

                  <Pressable
                    onPress={handleSendResetEmail}
                    disabled={isLoading}
                    style={styles.switchStepBtn}
                  >
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Didn't get code?{" "}
                      <ThemedText type="small" style={{ color: theme.primary, fontWeight: "700" }}>
                        Resend Code
                      </ThemedText>
                    </ThemedText>
                  </Pressable>

                  <View style={styles.formSpacer} />
                  <Button
                    onPress={() => {
                      setForgotPasswordMode(false);
                      setResetStep("request");
                      setResetFeedback(null);
                    }}
                    variant="outline"
                  >
                    Back to Login
                  </Button>
                </>
              )
            ) : (
              /* Normal Sign In Form */
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
                  onPress={() => {
                    setForgotPasswordMode(true);
                    setResetStep("request");
                    setResetFeedback(null);
                  }}
                  variant="ghost"
                  style={styles.forgotButton}
                >
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
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
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : "Sign In"}
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
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  switchStepBtn: {
    alignSelf: "center",
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emailBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
});
