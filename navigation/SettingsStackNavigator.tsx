import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "@/screens/SettingsScreen";
import PendingStonesScreen from "@/screens/PendingStonesScreen";
import PendingUsersScreen from "@/screens/PendingUsersScreen";
import UserManagementScreen from "@/screens/UserManagementScreen";
import { useTheme } from "@/hooks/useTheme";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  PendingStones: undefined;
  PendingUsers: undefined;
  UserManagement: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStackNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundDefault,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PendingStones"
        component={PendingStonesScreen}
        options={{
          title: "Pending Stones",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="PendingUsers"
        component={PendingUsersScreen}
        options={{
          title: "Pending Users",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{
          title: "User Management",
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}
