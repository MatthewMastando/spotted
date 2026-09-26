import { StyleSheet, View } from "react-native";
import type { ShareSnapshot } from "@/domain/types";
import { AppText } from "@/components/ui";

export type ShareTheme = "lime" | "violet" | "sunset";
export type ShareCardLayout = "portrait" | "square";

export const SHARE_CARD_DESIGN_SIZES: Record<
  ShareCardLayout,
  { width: number; height: number }
> = {
  portrait: { width: 360, height: 640 },
  square: { width: 360, height: 360 },
};

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
  layout = "portrait",
}: {
  snapshot: ShareSnapshot;
  theme: ShareTheme;
  sampleJourney: boolean;
  layout?: ShareCardLayout;
}) {
  const colors = THEMES[theme];
  const square = layout === "square";
  const returnIsNegative = snapshot.raw.return.startsWith("-");
  const resultColor = returnIsNegative ? "#FF8B8B" : colors.positive;
  const title =
    snapshot.kind === "portfolio"
      ? "My paper portfolio"
      : snapshot.kind === "position"
        ? `${snapshot.ticker} paper result`
        : "I spotted this";
  return (
    <View
      style={[
        styles.card,
        square ? styles.cardSquare : null,
        {
          width: SHARE_CARD_DESIGN_SIZES[layout].width,
          height: SHARE_CARD_DESIGN_SIZES[layout].height,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.topRow}>
        <AppText variant="label" color={colors.accent}>
          SWIPEFOLIO
        </AppText>
        <View
          style={[
            styles.demoPill,
            square ? styles.demoPillSquare : null,
            { borderColor: colors.accent },
          ]}
        >
          <AppText variant="label" color={colors.accent}>
            DEMO DATA
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.hero,
          square ? styles.heroSquare : null,
          { backgroundColor: colors.surface },
        ]}
      >
        <AppText
          variant="title"
          color="#FFFFFF"
          style={square ? styles.heroTitleSquare : null}
        >
          {title}
        </AppText>
        {snapshot.assetName ? (
          <AppText
            variant="body"
            color="#E8EDE1"
            style={square ? styles.heroBodySquare : null}
          >
            {snapshot.assetName} · {snapshot.ticker}
          </AppText>
        ) : (
          <AppText
            variant="body"
            color="#E8EDE1"
            style={square ? styles.heroBodySquare : null}
          >
            Simulated investing, made tangible
          </AppText>
        )}
        <AppText
          variant="title"
          color={resultColor}
          style={[styles.result, square ? styles.resultSquare : null]}
        >
          {snapshot.display.return}
        </AppText>
        <AppText
          variant="label"
          color="#E8EDE1"
          style={square ? styles.heroBasisSquare : null}
        >
          {snapshot.display.basis}
        </AppText>
      </View>
      <View style={[styles.chart, square ? styles.chartSquare : null]}>
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
      <View style={[styles.facts, square ? styles.factsSquare : null]}>
        {Object.entries(snapshot.display)
          .filter(([key]) => !["return", "basis"].includes(key))
          .map(([key, value]) => (
            <View key={key} style={[styles.fact, square ? styles.factSquare : null]}>
              <AppText
                variant="label"
                color="#B9C0B2"
                style={square ? styles.factLabelSquare : null}
              >
                {key.replace(/([A-Z])/g, " $1").toUpperCase()}
              </AppText>
              <AppText
                variant={square ? "small" : "body"}
                color="#FFFFFF"
                style={square ? styles.factValueSquare : null}
              >
                {value}
              </AppText>
            </View>
          ))}
      </View>
      <View style={[styles.footer, square ? styles.footerSquare : null]}>
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
    padding: 16,
    gap: 10,
  },
  cardSquare: {
    padding: 10,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  demoPill: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoPillSquare: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  hero: {
    borderRadius: 16,
    padding: 14,
    gap: 5,
  },
  heroSquare: {
    borderRadius: 12,
    padding: 8,
    gap: 3,
  },
  result: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    lineHeight: 50,
    fontVariant: ["tabular-nums"],
  },
  resultSquare: {
    fontSize: 30,
    lineHeight: 34,
  },
  heroTitleSquare: { fontSize: 16, lineHeight: 20 },
  heroBodySquare: { fontSize: 12, lineHeight: 16 },
  heroBasisSquare: { fontSize: 10, lineHeight: 14 },
  chart: {
    height: 84,
    borderBottomWidth: 1,
    borderBottomColor: "#65705C",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    paddingHorizontal: 4,
  },
  chartSquare: {
    height: 24,
  },
  chartBar: { flex: 1, minWidth: 2, borderRadius: 2 },
  facts: { gap: 10 },
  factsSquare: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fact: { gap: 3 },
  factSquare: { width: "48%", gap: 1 },
  factLabelSquare: { fontSize: 9, lineHeight: 12 },
  factValueSquare: { fontSize: 12, lineHeight: 16 },
  footer: { marginTop: "auto", gap: 5 },
  footerSquare: { gap: 2 },
});
