import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import IdentificationStackNavigator from "@/navigation/IdentificationStackNavigator";
import DatabaseStackNavigator from "@/navigation/DatabaseStackNavigator";
import BusinessStackNavigator from "@/navigation/BusinessStackNavigator";
import CertificateStackNavigator from "@/navigation/CertificateStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  IdentificationTab: undefined;
  DatabaseTab: undefined;
  BusinessTab: undefined;
  CertificateTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="IdentificationTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="IdentificationTab"
        component={IdentificationStackNavigator}
        options={{
          title: "Identify",
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DatabaseTab"
        component={DatabaseStackNavigator}
        options={{
          title: "Database",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessTab"
        component={BusinessStackNavigator}
        options={{
          title: "Business",
          tabBarIcon: ({ color, size }) => (
            <Feather name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CertificateTab"
        component={CertificateStackNavigator}
        options={{
          title: "Certificate",
          tabBarIcon: ({ color, size }) => (
            <Feather name="award" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
