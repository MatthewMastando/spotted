const shared = {
  accent: "#C7F36B",
  positive: "#57D7A1",
  negative: "#FF7185",
  warning: "#F4C96B",
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    gutter: 24,
    section: 40,
  },
  radii: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  type: {
    caption: 12,
    body: 16,
    title: 22,
    display: 34,
    numeric: {
      fontVariant: ["tabular-nums"] as const,
    },
  },
};

export const palettes = {
  dark: {
    background: "#090A0D",
    surface: "#121419",
    surfaceRaised: "#1B1E25",
    surfaceMuted: "#252933",
    text: "#F5F6F8",
    textSecondary: "#A5A9B3",
    textMuted: "#737985",
    border: "#2C3039",
    separator: "#1F2229",
    ...shared,
  },
  light: {
    background: "#F5F6F3",
    surface: "#FFFFFF",
    surfaceRaised: "#EAEBE7",
    surfaceMuted: "#DFE1DA",
    text: "#151813",
    textSecondary: "#555B51",
    textMuted: "#747B6F",
    border: "#D5D8D0",
    separator: "#E3E5DF",
    ...shared,
  },
} as const;

export type Palette = (typeof palettes)[keyof typeof palettes];
