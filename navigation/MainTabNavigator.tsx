import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";

import IdentificationStackNavigator from "@/navigation/IdentificationStackNavigator";
import DatabaseStackNavigator from "@/navigation/DatabaseStackNavigator";
import BusinessStackNavigator from "@/navigation/BusinessStackNavigator";
import CertificateStackNavigator from "@/navigation/CertificateStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows } from "@/constants/theme";

export type MainTabParamList = {
  IdentificationTab: undefined;
  DatabaseTab: undefined;
  BusinessTab: undefined;
  CertificateTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="DatabaseTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
          }),
          borderTopWidth: 0,
          height: Platform.OS === 'web' ? 50 : (Platform.OS === "ios" ? 88 : 70), // Reduced height for web
          paddingBottom: Platform.OS === 'web' ? 8 : (Platform.OS === "ios" ? 28 : 12), // Reduced padding for web
          paddingTop: Platform.OS === 'web' ? 8 : 12, // Reduced padding for web
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          ...Shadows.xl,
        },
        tabBarBackground: () =>
          Platform.OS === 'web' ? (
            <div style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }} />
          ) : Platform.OS === "ios" ? (
            <BlurView
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'web' ? 10 : 12, // Smaller font for web
          fontWeight: "600",
          marginTop: Platform.OS === 'web' ? 2 : 4, // Reduced margin for web
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'web' ? 2 : 4, // Reduced margin for web
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="DatabaseTab"
        component={DatabaseStackNavigator}
        options={{
          title: "Gems",
          tabBarIcon: ({ color, size, focused }) => (
            <DiamondIcon
              size={focused ? size + 2 : size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="IdentificationTab"
        component={IdentificationStackNavigator}
        options={{
          title: "Identify",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedIcon
              name="search"
              size={focused ? size + 2 : size}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="BusinessTab"
        component={BusinessStackNavigator}
        options={{
          title: "Business",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedIcon 
              name="briefcase" 
              size={focused ? size + 2 : size} 
              color={color} 
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CertificateTab"
        component={CertificateStackNavigator}
        options={{
          title: "Certificate",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedIcon 
              name="award" 
              size={focused ? size + 2 : size} 
              color={color} 
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedIcon 
              name="settings" 
              size={focused ? size + 2 : size} 
              color={color} 
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AnimatedIcon({ 
  name, 
  size, 
  color, 
  focused 
}: { 
  name: keyof typeof Feather.glyphMap; 
  size: number; 
  color: string; 
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  
  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 15,
      stiffness: 200,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );
}

function DiamondIcon({ 
  size, 
  color, 
  focused 
}: { 
  size: number; 
  color: string; 
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1.15 : 1);
  
  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, {
      damping: 15,
      stiffness: 200,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Use hexagon which looks like a gemstone/diamond
  return (
    <Animated.View style={animatedStyle}>
      <Feather name="hexagon" size={size} color={color} fill={focused ? color : "none"} />
    </Animated.View>
  );
}
