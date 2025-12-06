import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import IdentificationLabScreen from "@/screens/IdentificationLabScreen";
import IdentificationHistoryScreen from "@/screens/IdentificationHistoryScreen";
import IdentificationHelpScreen from "@/screens/IdentificationHelpScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type IdentificationStackParamList = {
  IdentificationLab: undefined;
  IdentificationHistory: undefined;
  IdentificationHelp: undefined;
};

const Stack = createNativeStackNavigator<IdentificationStackParamList>();

export default function IdentificationStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark })}
    >
      <Stack.Screen
        name="IdentificationLab"
        component={IdentificationLabScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="IdentificationHistory"
        component={IdentificationHistoryScreen}
        options={{
          headerTitle: () => <HeaderTitle title="History" />,
        }}
      />
      <Stack.Screen
        name="IdentificationHelp"
        component={IdentificationHelpScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Help" />,
        }}
      />
    </Stack.Navigator>
  );
}
