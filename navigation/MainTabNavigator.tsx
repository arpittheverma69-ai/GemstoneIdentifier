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
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Shadows } from "@/constants/theme";

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
            android: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 70,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 12,
          ...Shadows.xl,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={95}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
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
