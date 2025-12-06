import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import GemDatabaseScreen from "@/screens/GemDatabaseScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type DatabaseStackParamList = {
  GemDatabase: undefined;
};

const Stack = createNativeStackNavigator<DatabaseStackParamList>();

export default function DatabaseStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark })}
    >
      <Stack.Screen
        name="GemDatabase"
        component={GemDatabaseScreen}
        options={{
          headerTitle: "Gems",
        }}
      />
    </Stack.Navigator>
  );
}
