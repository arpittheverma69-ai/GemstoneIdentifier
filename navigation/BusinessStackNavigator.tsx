import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BusinessHubScreen from "@/screens/BusinessHubScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type BusinessStackParamList = {
  BusinessHub: undefined;
};

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export default function BusinessStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark })}
    >
      <Stack.Screen
        name="BusinessHub"
        component={BusinessHubScreen}
        options={{
          headerTitle: "Business Hub",
        }}
      />
    </Stack.Navigator>
  );
}
