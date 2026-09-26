import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as SQLite from "expo-sqlite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { palettes } from "@/design/tokens";
import { ExpoSqlDb } from "@/persistence/expoDb";
import { AppContainer, ContainerProvider } from "@/services/ContainerContext";
import { createContainer } from "@/services/container";

export default function RootLayout() {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const database = await SQLite.openDatabaseAsync("swipefolio.db");
      const appContainer = await createContainer(new ExpoSqlDb(database));
      if (mounted) setContainer(appContainer);
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
  if (!container) {
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
    <ContainerProvider value={container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palettes.dark.background },
        }}
      />
    </ContainerProvider>
  );
}
