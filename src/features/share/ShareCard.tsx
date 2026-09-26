import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ShareSnapshot } from "@/domain/types";
import { D } from "@/domain/decimal";
import { AppText } from "@/components/ui";
import { makePath } from "@/components/Chart";

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
  const resultReturn = D(snapshot.raw.return);
  const resultColor = resultReturn.isNegative()
    ? "#FF8B8B"
    : resultReturn.isZero()
      ? "#B9C0B2"
      : colors.positive;
  const [chartWidth, setChartWidth] = useState(0);
  const chartHeight = square ? 44 : 74;
  const chartValues = snapshot.chart.map((point) => point.price);
  const chartPath = makePath(chartValues, chartWidth, chartHeight);
  const areaPath = chartPath
    ? `${chartPath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
    : "";
  const markerTime = snapshot.markers[0]?.time;
  const markerIndex = markerTime
    ? snapshot.chart.findIndex((point) => point.time >= markerTime)
    : -1;
  const markerX =
    markerIndex >= 0 && snapshot.chart.length > 1
      ? (markerIndex / (snapshot.chart.length - 1)) * chartWidth
      : null;
  const factLabels: Record<string, string> = {
    pnl: "Paper P&L",
    value: "Position value",
    latestPrice: "Latest price",
    savedPrice: "Saved price",
    hypothetical: "$1,000 would be",
    equity: "Paper equity",
    cash: "Cash",
    savedAt: "Saved",
    asOf: "As of",
  };
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
      <View
        accessibilityRole="image"
        accessibilityLabel={`Result price chart for ${snapshot.ticker ?? "the portfolio"}`}
        style={[styles.chart, { height: chartHeight }]}
        onLayout={(event: LayoutChangeEvent) =>
          setChartWidth(event.nativeEvent.layout.width)
        }
      >
        {chartPath ? (
          <Svg width={chartWidth} height={chartHeight}>
            <Path d={areaPath} fill={resultColor} opacity={0.14} />
            {markerX !== null ? (
              <Path
                d={`M ${markerX} 0 L ${markerX} ${chartHeight}`}
                fill="none"
                stroke="#FFFFFF"
                strokeDasharray="3 3"
                strokeWidth={1}
                opacity={0.62}
              />
            ) : null}
            <Path
              d={chartPath}
              fill="none"
              stroke={resultColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
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
                variant="small"
                color="#B9C0B2"
              >
                {factLabels[key] ?? key}
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
      <View style={styles.footer}>
        <AppText
          variant="small"
          color="#B9C0B2"
          style={square ? styles.footerTextSquare : null}
        >
          {sampleJourney
            ? "Sample journey · Simulated"
            : "Simulated"}{" "}
          · Find your next pick
        </AppText>
        <AppText
          variant="small"
          color="#7E887A"
          style={square ? styles.footerTextSquare : null}
        >
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
    padding: 14,
    gap: 8,
  },
  cardSquare: {
    padding: 12,
    gap: 6,
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
  heroTitleSquare: { fontSize: 15, lineHeight: 18 },
  heroBodySquare: { fontSize: 11, lineHeight: 14 },
  heroBasisSquare: { fontSize: 9, lineHeight: 12 },
  chart: {
    borderBottomWidth: 1,
    borderBottomColor: "#65705C",
    justifyContent: "center",
  },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 8 },
  factsSquare: { rowGap: 5 },
  fact: { width: "47%", gap: 2 },
  factSquare: { width: "48%", gap: 1 },
  factValueSquare: { fontSize: 10, lineHeight: 13 },
  footer: { marginTop: "auto", gap: 3 },
  footerTextSquare: { fontSize: 9, lineHeight: 12 },
});
