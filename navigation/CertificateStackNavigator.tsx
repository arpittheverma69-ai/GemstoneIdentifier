import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CertificateScreen from "@/screens/CertificateScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type CertificateStackParamList = {
  Certificate: undefined;
};

const Stack = createNativeStackNavigator<CertificateStackParamList>();

export default function CertificateStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark })}
    >
      <Stack.Screen
        name="Certificate"
        component={CertificateScreen}
        options={{
          headerTitle: "Certificate",
        }}
      />
    </Stack.Navigator>
  );
}
