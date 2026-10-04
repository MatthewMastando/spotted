import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "@/design/theme";

export default function TabLayout() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.separator,
          ...(Platform.OS === "web" ? { height: 64 + insets.bottom } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          ...(Platform.OS === "web" ? { lineHeight: 16 } : {}),
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
