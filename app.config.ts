import type { ExpoConfig, ConfigContext } from "expo/config";
import { brand } from "./src/config/brand.ts";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: brand.name,
  slug: brand.slug,
  scheme: brand.scheme,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  ios: {
    ...config.ios,
    bundleIdentifier: brand.iosBundleIdentifier,
  },
  android: {
    ...config.android,
    package: brand.androidPackage,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon-foreground.png",
      backgroundColor: "#10130D",
    },
  },
  web: {
    ...config.web,
    bundler: "metro",
    output: "single",
    name: brand.name,
    shortName: brand.name,
    themeColor: "#10130D",
    backgroundColor: "#10130D",
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        headers: {
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
      },
    ],
    "./plugins/withSceneLifecycle",
    "expo-sqlite",
    "expo-sharing",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 180,
        resizeMode: "contain",
        backgroundColor: "#10130D",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
