import type { ExpoConfig, ConfigContext } from "expo/config";
import { brand } from "./src/config/brand.ts";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/images/icon.png",
  ios: {
    ...config.ios,
    bundleIdentifier: brand.iosBundleIdentifier,
  },
  android: {
    ...config.android,
    package: brand.androidPackage,
  },
  plugins: ["expo-router", "expo-sqlite", "expo-sharing", "expo-font"],
  experiments: {
    typedRoutes: true,
  },
});
