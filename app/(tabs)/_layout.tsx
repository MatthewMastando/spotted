import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { usePalette } from "@/design/theme";

export default function TabLayout() {
  const palette = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarButtonTestID: "tab-discover",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="compass-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarButtonTestID: "tab-saved",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="bookmark-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarButtonTestID: "tab-portfolio",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-box-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
