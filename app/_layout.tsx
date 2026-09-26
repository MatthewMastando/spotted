import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as SQLite from "expo-sqlite";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { palettes } from "@/design/tokens";
import { ThemeProvider, usePalette } from "@/design/theme";
import { ExpoSqlDb } from "@/persistence/expoDb";
import { AppContainer, ContainerProvider } from "@/services/ContainerContext";
import { createContainer } from "@/services/container";
import { publishSettings, useAppStore } from "@/state/appStore";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedScheme = useColorScheme();
  const systemScheme =
    detectedScheme === "light" || detectedScheme === "dark" ? detectedScheme : null;
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const settings = useAppStore((state) => state.settings);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const database = await SQLite.openDatabaseAsync("swipefolio.db");
      const appContainer = await createContainer(new ExpoSqlDb(database));
      if (mounted) {
        publishSettings(appContainer.getSettings());
        setContainer(appContainer);
      }
    })().catch((reason: unknown) => {
      if (mounted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to open local data.",
        );
    });
    return () => {
      mounted = false;
    };
  }, []);

  const ready = Boolean(container && (fontsLoaded || fontError));
  useEffect(() => {
    if (ready || error) void SplashScreen.hideAsync();
  }, [ready, error]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: palettes.dark.background,
        }}
      >
        <Text style={{ color: palettes.dark.text }}>
          Local demo data could not be opened.
        </Text>
      </View>
    );
  }
  if (!container || (!fontsLoaded && !fontError)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palettes.dark.background,
        }}
      >
        <ActivityIndicator color={palettes.dark.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider
      preference={(settings ?? container.getSettings()).themePref}
      systemScheme={systemScheme}
    >
      <AppShell
        container={container}
        settings={settings ?? container.getSettings()}
      />
    </ThemeProvider>
  );
}

function AppShell({
  container,
  settings,
}: {
  container: AppContainer;
  settings: ReturnType<AppContainer["getSettings"]>;
}) {
  const palette = usePalette();
  return (
      <SafeAreaProvider>
        <GestureHandlerRootView
          style={{ flex: 1, backgroundColor: palette.background }}
        >
          <ContainerProvider value={container}>
            <StatusBar style={palette === palettes.light ? "dark" : "light"} />
            <RouteTree settings={settings} />
          </ContainerProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
  );
}

function RouteTree({
  settings,
}: {
  settings: ReturnType<AppContainer["getSettings"]>;
}) {
  const pathname = usePathname();
  const palette = usePalette();
  if (!settings.onboardingDone && pathname !== "/onboarding")
    return <Redirect href="/onboarding" />;
  if (settings.onboardingDone && pathname === "/onboarding")
    return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="asset/[id]" />
      <Stack.Screen name="allocate" options={{ presentation: "modal" }} />
      <Stack.Screen name="share/[kind]" options={{ presentation: "modal" }} />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/methodology" />
      <Stack.Screen name="settings/demo" />
      <Stack.Screen name="r/[assetId]" />
    </Stack>
  );
}
