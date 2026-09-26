import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type {
  AssetFixture,
  PricePoint,
  Quote,
  SocialSnapshot,
} from "@/domain/types";
import {
  deriveCryptoMarketCap,
  deriveStockMetrics,
} from "@/domain/metrics";
import {
  formatCompactMoney,
  formatMultiple,
  formatNumber,
  formatPercent,
  formatPrice,
} from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { socialAttention } from "@/domain/social";
import { usePalette } from "@/design/theme";
import { useReducedMotion } from "@/state/accessibility";
import { TYPE_LABELS, THEME_LABELS, quoteAsOfLabel } from "@/features/common/labels";
import { Sparkline } from "@/components/Chart";
import {
  ActionButton,
  AppText,
  Chip,
  Panel,
  SectionTitle,
} from "@/components/ui";

type Metric = {
  label: string;
  value: string;
  definition: string;
};

export type AssetCardData = {
  quote: Quote;
  displayPrice: string | null;
  history: PricePoint[];
  social: SocialSnapshot | null;
};

export function AssetCard({
  asset,
  data,
  interactive = true,
  onDetails,
  accessibilityActions,
  onAccessibilityAction,
}: {
  asset: AssetFixture;
  data: AssetCardData;
  interactive?: boolean;
  onDetails: () => void;
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (name: string) => void;
}) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const attention = socialAttention(data.social);
  const metrics = getMetrics(asset, data.displayPrice);
  const previousPrice = data.history.at(-2)?.price;
  const dailyReturn =
    data.displayPrice && previousPrice
      ? returnSinceSave(data.displayPrice, previousPrice)
      : null;
  const dayColor =
    dailyReturn === null
      ? palette.textSecondary
      : dailyReturn.startsWith("-")
        ? palette.negative
        : dailyReturn === "0"
          ? palette.textSecondary
          : palette.positive;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${asset.name}, ${asset.ticker}, ${TYPE_LABELS[asset.type]}. ${data.displayPrice ? formatPrice(data.displayPrice) : "Price unavailable"}.`}
        accessibilityHint="Open asset details. Use the Save and Pass controls below to track or pass this idea."
        accessibilityActions={accessibilityActions}
        accessibilityState={{ disabled: !interactive }}
        onAccessibilityAction={(event) =>
          onAccessibilityAction?.(event.nativeEvent.actionName)
        }
        onPress={onDetails}
        disabled={!interactive}
      >
        <Panel style={styles.card}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.assetIcon,
                { backgroundColor: asset.iconColor },
              ]}
            >
              <AppText variant="label" color="#10130D">
                {asset.iconInitials}
              </AppText>
            </View>
            <View style={styles.assetIdentity}>
              <AppText variant="title">{asset.name}</AppText>
              <AppText variant="small" color={palette.textSecondary}>
                {asset.ticker} · {TYPE_LABELS[asset.type]}
              </AppText>
            </View>
            <Chip label={THEME_LABELS[asset.themes[0]]} />
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceCopy}>
              <AppText variant="display" style={styles.price}>
                {data.displayPrice
                  ? formatPrice(data.displayPrice)
                  : "Price unavailable"}
              </AppText>
              <AppText variant="small" color={palette.textSecondary}>
                USD · {quoteAsOfLabel(data.quote)}
              </AppText>
            </View>
            <View style={styles.dailyChange}>
              <AppText variant="label" color={palette.textMuted}>
                DAILY
              </AppText>
              <AppText variant="number" color={dayColor}>
                {dailyReturn === null ? "Unavailable" : formatPercent(dailyReturn)}
              </AppText>
            </View>
          </View>

          <View style={styles.copyBlock}>
            <AppText variant="body">{asset.description}</AppText>
            <AppText variant="small" color={palette.accent}>
              {asset.thesis}
            </AppText>
          </View>

          <View style={styles.metrics}>
            {metrics.map((metric) => (
              <Pressable
                key={metric.label}
                accessibilityRole="button"
                accessibilityLabel={`${metric.label}: ${metric.value}`}
                accessibilityHint="Explain this metric"
                onPress={() => setSelectedMetric(metric)}
                disabled={!interactive}
                style={[
                  styles.metric,
                  { backgroundColor: palette.surfaceRaised },
                ]}
              >
                <AppText variant="label" color={palette.textMuted}>
                  {metric.label}
                </AppText>
                <AppText variant="number">{metric.value}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.socialRow}>
            <View style={styles.socialCopy}>
              <AppText variant="label">SOCIAL ATTENTION</AppText>
              <AppText variant="small" color={palette.textSecondary}>
                {attention.label}
              </AppText>
            </View>
            {data.social ? (
              <Sparkline
                values={data.social.history.map((point) => String(point.count))}
                color={palette.accent}
                label={`30-day social attention history for ${asset.ticker}`}
              />
            ) : (
              <AppText variant="small" color={palette.textMuted}>
                No history
              </AppText>
            )}
          </View>

          <View style={[styles.risk, { borderTopColor: palette.border }]}>
            <AppText variant="label" color={palette.warning}>
              RISK
            </AppText>
            <AppText variant="small" color={palette.textSecondary}>
              {asset.risk}
            </AppText>
          </View>
        </Panel>
      </Pressable>

      <Modal
        visible={selectedMetric !== null}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setSelectedMetric(null)}
      >
        <View style={styles.modalScrim}>
          <Panel style={styles.modalPanel}>
            <SectionTitle
              title={selectedMetric?.label ?? "Metric"}
              trailing={
                <ActionButton
                  variant="quiet"
                  accessibilityLabel="Close metric explanation"
                  onPress={() => setSelectedMetric(null)}
                >
                  Done
                </ActionButton>
              }
            />
            <AppText variant="body" color={palette.textSecondary}>
              {selectedMetric?.definition}
            </AppText>
            <AppText variant="small" color={palette.textMuted}>
              Synthetic demo data · Not an investment recommendation.
            </AppText>
          </Panel>
        </View>
      </Modal>
    </>
  );
}

function getMetrics(
  asset: AssetFixture,
  price: string | null,
): Metric[] {
  if (asset.metrics.kind === "stock") {
    const derived = price
      ? deriveStockMetrics(price, asset.metrics)
      : { marketCap: null, priceToEarnings: null };
    return [
      {
        label: "Revenue growth",
        value: formatPercent(asset.metrics.revenueGrowthYoY),
        definition:
          "Year-over-year change in synthetic trailing revenue. It does not predict future growth.",
      },
      {
        label: "P/E ratio",
        value: formatMultiple(derived.priceToEarnings),
        definition:
          "Current synthetic share price divided by trailing earnings per share. Not meaningful when earnings are unavailable or nonpositive.",
      },
      {
        label: "Market cap",
        value: formatCompactMoney(derived.marketCap),
        definition:
          "Synthetic share price multiplied by fixture shares outstanding. This estimate is illustrative only.",
      },
    ];
  }
  if (asset.metrics.kind === "etf") {
    return [
      {
        label: "Expense ratio",
        value: formatPercent(asset.metrics.expenseRatio),
        definition:
          "Synthetic annual fund operating expenses as a percentage of assets.",
      },
      {
        label: "Distribution yield",
        value: formatPercent(asset.metrics.distributionYield),
        definition:
          "Synthetic trailing distribution rate. Distributions are not included in simulated returns.",
      },
      {
        label: "Top 10",
        value: formatPercent(asset.metrics.top10Concentration),
        definition:
          "Synthetic share of the fund represented by its ten largest holdings.",
      },
    ];
  }
  const marketCap = price
    ? deriveCryptoMarketCap(price, asset.metrics)
    : null;
  return [
    {
      label: "Market cap",
      value: formatCompactMoney(marketCap),
      definition:
        "Synthetic token price multiplied by circulating supply, when available.",
    },
    {
      label: "Circulating supply",
      value: formatNumber(asset.metrics.circulatingSupply, 0),
      definition:
        "Approximate number of tokens in circulation. It is not the same as maximum supply.",
    },
    {
      label: "24h volume",
      value: formatCompactMoney(asset.metrics.volume24h),
      definition:
        "Synthetic reported trading volume over a rolling 24-hour window.",
    },
  ];
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 18 },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  assetIcon: {
    width: 48,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  assetIdentity: { flex: 1, gap: 3 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  priceCopy: { flex: 1, gap: 4 },
  price: { fontSize: 30 },
  dailyChange: { alignItems: "flex-end", gap: 4 },
  copyBlock: { gap: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 92,
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: "space-between",
    gap: 4,
  },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  socialCopy: { flex: 1, gap: 4 },
  risk: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 5,
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalPanel: { padding: 22, gap: 16 },
});
