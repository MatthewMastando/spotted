import { StyleSheet, View } from "react-native";
import type { ShareSnapshot } from "@/domain/types";
import { AppText } from "@/components/ui";

export type ShareTheme = "lime" | "violet" | "sunset";

const THEMES: Record<
  ShareTheme,
  { background: string; surface: string; accent: string; positive: string }
> = {
  lime: {
    background: "#10130D",
    surface: "#1D2418",
    accent: "#C7F36A",
    positive: "#C7F36A",
  },
  violet: {
    background: "#151021",
    surface: "#29203B",
    accent: "#D4B8FF",
    positive: "#D4B8FF",
  },
  sunset: {
    background: "#21140F",
    surface: "#382219",
    accent: "#FFB870",
    positive: "#FFB870",
  },
};

export function ShareCard({
  snapshot,
  theme,
  sampleJourney,
}: {
  snapshot: ShareSnapshot;
  theme: ShareTheme;
  sampleJourney: boolean;
}) {
  const colors = THEMES[theme];
  const returnIsNegative = snapshot.raw.return.startsWith("-");
  const resultColor = returnIsNegative ? "#FF8B8B" : colors.positive;
  const title =
    snapshot.kind === "portfolio"
      ? "My paper portfolio"
      : snapshot.kind === "position"
        ? `${snapshot.ticker} paper result`
        : "I spotted this";
  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <AppText variant="label" color={colors.accent}>
          SWIPEFOLIO
        </AppText>
        <View style={[styles.demoPill, { borderColor: colors.accent }]}>
          <AppText variant="label" color={colors.accent}>
            DEMO DATA
          </AppText>
        </View>
      </View>
      <View style={[styles.hero, { backgroundColor: colors.surface }]}>
        <AppText variant="title" color="#FFFFFF">
          {title}
        </AppText>
        {snapshot.assetName ? (
          <AppText variant="body" color="#E8EDE1">
            {snapshot.assetName} · {snapshot.ticker}
          </AppText>
        ) : (
          <AppText variant="body" color="#E8EDE1">
            Simulated investing, made tangible
          </AppText>
        )}
        <AppText variant="title" color={resultColor} style={styles.result}>
          {snapshot.display.return}
        </AppText>
        <AppText variant="label" color="#E8EDE1">
          {snapshot.display.basis}
        </AppText>
      </View>
      <View style={styles.chart}>
        {snapshot.chart.length > 1 ? (
          snapshot.chart.map((point, index) => (
            <View
              key={`${point.time}-${index}`}
              style={[
                styles.chartBar,
                {
                  height: `${Math.max(
                    10,
                    Math.min(100, Number(point.price) / Math.max(Number(point.price), 1) * 72),
                  )}%`,
                  backgroundColor: resultColor,
                },
              ]}
            />
          ))
        ) : (
          <AppText variant="small" color="#B9C0B2">
            Chart data is unavailable.
          </AppText>
        )}
      </View>
      <View style={styles.facts}>
        {Object.entries(snapshot.display)
          .filter(([key]) => !["return", "basis"].includes(key))
          .slice(0, 4)
          .map(([key, value]) => (
            <View key={key} style={styles.fact}>
              <AppText variant="label" color="#B9C0B2">
                {key.replace(/([A-Z])/g, " $1").toUpperCase()}
              </AppText>
              <AppText variant="body" color="#FFFFFF">
                {value}
              </AppText>
            </View>
          ))}
      </View>
      <View style={styles.footer}>
        <AppText variant="small" color="#B9C0B2">
          {sampleJourney
            ? "Sample journey · Simulated · not your track record"
            : "Simulated"}
        </AppText>
        <AppText variant="small" color="#B9C0B2">
          Find your next pick
        </AppText>
        <AppText variant="small" color="#7E887A">
          {snapshot.finePrint}
        </AppText>
      </View>
    </View>
  );
}

export function shareThemeColors(theme: ShareTheme) {
  return THEMES[theme];
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 92,
    gap: 42,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  demoPill: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  hero: {
    borderRadius: 42,
    padding: 58,
    gap: 22,
  },
  result: {
    fontFamily: "Inter_700Bold",
    fontSize: 150,
    lineHeight: 170,
    fontVariant: ["tabular-nums"],
  },
  chart: {
    height: 210,
    borderBottomWidth: 2,
    borderBottomColor: "#65705C",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    paddingHorizontal: 8,
  },
  chartBar: { flex: 1, minWidth: 3, borderRadius: 3 },
  facts: { gap: 18 },
  fact: { gap: 5 },
  footer: { marginTop: "auto", gap: 9 },
});
