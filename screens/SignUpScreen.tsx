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
import EmailConfirmationSheet from "@/components/EmailConfirmationSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { signUp } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { submitAccessRequest } from "@/services/accessRequestService";

export default function SignUpScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<"Student" | "Curator">("Student");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

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
        // Automatically register initial pending request with selected role
        try {
          await submitAccessRequest(
            result.user.id,
            result.user.email || email.trim(),
            requestedRole,
            "Signed up requesting " + requestedRole + " role",
            fullName.trim()
          );
        } catch (err) {
          console.warn("Error auto-submitting access request during sign up:", err);
        }

        // Set user immediately - App.tsx automatically switches to MainTabNavigator
        setUser(result.user);
      } else {
        const message = result.error || "Failed to create account";
        switch (result.errorCode) {
          case "email_taken":
            Alert.alert("Email Already Registered", "That email is already in use. Try signing in or use a different email.");
            break;
          case "network_error":
            Alert.alert("Network Error", "We couldn't reach the server. Please check your internet connection and try again.");
            break;
          default:
            Alert.alert("Sign Up Failed", message);
            break;
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailConfirmation = () => {
    setShowEmailConfirmation(false);
    // Set user to go to main app
    setUser({
      id: "temp", // Will be updated by auth context
      email: email,
      full_name: fullName,
    });
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
              Create Account
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join GemSpy to unlock all features
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
            
            {/* Role Preference */}
            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
                Request Initial Access Role:
              </ThemedText>
              <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                <Pressable
                  onPress={() => setRequestedRole("Student")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1.5,
                    borderColor: requestedRole === "Student" ? theme.primary : theme.border,
                    backgroundColor: requestedRole === "Student" ? theme.primary + "15" : theme.backgroundSecondary,
                    alignItems: "center",
                  }}
                >
                  <ThemedText type="small" style={{ fontWeight: "700", color: requestedRole === "Student" ? theme.primary : theme.text }}>
                    🎓 Student
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setRequestedRole("Curator")}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1.5,
                    borderColor: requestedRole === "Curator" ? theme.primary : theme.border,
                    backgroundColor: requestedRole === "Curator" ? theme.primary + "15" : theme.backgroundSecondary,
                    alignItems: "center",
                  }}
                >
                  <ThemedText type="small" style={{ fontWeight: "700", color: requestedRole === "Curator" ? theme.primary : theme.text }}>
                    🔬 Curator
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            <Button
              onPress={handleSignUp}
              variant="primary"
              disabled={isLoading}
              style={styles.submitButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                "Create Account & Request Role"
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
      
      <EmailConfirmationSheet
        visible={showEmailConfirmation}
        email={email}
        onConfirm={handleEmailConfirmation}
      />
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
  signInContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
});






