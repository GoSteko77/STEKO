import { Stack } from "expo-router";
import React from "react";

import { useApp } from "@/providers/AppProvider";

export default function OnboardingLayout() {
  const { theme } = useApp();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
