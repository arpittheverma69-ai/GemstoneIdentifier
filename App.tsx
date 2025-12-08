import React from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthNavigator from "@/navigation/AuthNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemedView } from "@/components/ThemedView";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useAppTheme } from "@/contexts/ThemeContext";

function AppContent() {
  const { user, loading } = useAuth();
  const themeResult = useAppTheme();
  // Safety check - ensure theme exists
  const theme = themeResult?.theme || {
    primary: "#8B5CF6",
    text: "#0F172A",
    backgroundRoot: "#F8FAFC",
  };

  if (loading) {
    return (
      <ThemedView style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme?.primary || "#8B5CF6"} />
      </ThemedView>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedView style={styles.root}>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                <AuthProvider>
                  <AppContent />
                  <StatusBar style="auto" />
                </AuthProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </ThemedView>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
