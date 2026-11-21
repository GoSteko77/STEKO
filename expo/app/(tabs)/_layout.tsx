import { Redirect, Tabs } from "expo-router";
import { ListChecks, Mountain, Home as HomeIcon } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

import { MONO } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";

export default function TabLayout() {
  const { theme, hasOnboarded, hydrated } = useApp();

  if (hydrated && !hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textFaint,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.hairline,
          borderTopWidth: Platform.OS === "web" ? 1 : 0.5,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: 1,
        },
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "HOME",
          tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="summits"
        options={{
          title: "SUMMITS",
          tabBarIcon: ({ color }) => <Mountain size={22} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="objectives"
        options={{
          title: "HABITS",
          tabBarIcon: ({ color }) => <ListChecks size={22} color={color} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
