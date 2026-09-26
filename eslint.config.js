const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/**",
                "react-native",
                "react-native/**",
                "expo*",
              ],
              message: "Domain logic must remain independent of UI and Expo.",
            },
            {
              group: [
                "@/persistence",
                "@/persistence/**",
                "@/services",
                "@/services/**",
              ],
              message:
                "Domain logic must remain independent of persistence and services.",
            },
          ],
        },
      ],
    },
  },
]);
