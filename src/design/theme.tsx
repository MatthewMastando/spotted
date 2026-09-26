import { createContext, ReactNode, useContext, useMemo } from "react";
import type { Palette } from "./tokens";
import { palettes } from "./tokens";

type ColorScheme = "light" | "dark" | null | undefined;
type ThemePreference = "system" | "dark" | "light";

const ThemeContext = createContext<Palette>(palettes.dark);

export function ThemeProvider({
  preference,
  systemScheme,
  children,
}: {
  preference: ThemePreference;
  systemScheme: ColorScheme;
  children: ReactNode;
}) {
  const palette = useMemo(() => {
    const resolved =
      preference === "system" ? systemScheme ?? "dark" : preference;
    return resolved === "light" ? palettes.light : palettes.dark;
  }, [preference, systemScheme]);

  return (
    <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
  );
}

export function usePalette(): Palette {
  return useContext(ThemeContext);
}
