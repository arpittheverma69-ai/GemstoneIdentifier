import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/services/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export default function EmailVerificationScreen({ navigation }: any) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    // Check email verification status
    const checkVerification = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (data?.user?.email_confirmed_at) {
          // Email is verified, update user state
          setUser(data.user);
        } else if (error) {
          setMessage("Error checking verification status");
        }
      } catch (err: any) {
        setMessage("Error: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkVerification();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.content}>
        <ThemedText type="h2" style={styles.title}>
          Email Verification
        </ThemedText>
        
        {message ? (
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {message}
          </Text>
        ) : (
          <Text style={[styles.message, { color: theme.text }]}>
            {isLoading ? "Checking verification status..." : "Please check your email for a verification link."}
          </Text>
        )}
        
        <Text style={[styles.instruction, { color: theme.textSecondary }]}>
          Once verified, you'll be automatically redirected to the main app.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    minHeight: 60,
  },
  instruction: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
});
