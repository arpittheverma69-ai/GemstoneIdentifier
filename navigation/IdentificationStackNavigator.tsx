import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import IdentificationLabScreen from "@/screens/IdentificationLabScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type IdentificationStackParamList = {
  IdentificationLab: undefined;
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
          headerTitle: () => <HeaderTitle title="GemAI Pro" />,
        }}
      />
    </Stack.Navigator>
  );
}
