import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { AssetFixture, PricePoint, SocialSnapshot } from "@/domain/types";
import { MIN_HISTORY_DAY } from "@/domain/time";
import {
  annualizedVolatility,
  deriveStockMetrics,
} from "@/domain/metrics";
import {
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatMultiple,
  formatNumber,
  formatPercent,
  formatRate,
  formatPrice,
} from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { socialAttention, sentimentLabel } from "@/domain/social";
import { usePalette } from "@/design/theme";
import { EquityChart, Sparkline } from "@/components/Chart";
import {
  ActionButton,
  AppText,
  Chip,
  IconButton,
  InlineNotice,
  Page,
  Panel,
  ScreenHeader,
  Section,
  SectionTitle,
  Segmented,
} from "@/components/ui";
import { TYPE_LABELS, THEME_LABELS, quoteAsOfLabel } from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { trackEvent } from "@/services/track";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSavedIdeas, useSettings } from "@/state/hooks";
import { successHaptic } from "@/services/haptics";

const RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
] as const;
type RangeLabel = (typeof RANGES)[number]["label"];

export function AssetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const container = useContainer();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const activeSaved = useSavedIdeas("active");
  const archivedSaved = useSavedIdeas("archived");
  const portfolio = usePortfolioData();
  const [selectedRange, setSelectedRange] = useState<RangeLabel>("1M");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const asset = id ? container.assets.getDetails(id) : null;
  const day = settings.clock.dayOffset;

  const quote = useMemo(
    () => (asset ? container.market.getQuote(asset.id, day) : null),
    [asset, container, day],
  );
  const currentPrice = asset && quote
    ? quote.price ?? container.market.getLastValidPrice(asset.id, day)
    : null;
  const historyByRange = useMemo<Record<RangeLabel, PricePoint[]>>(() => {
    if (!asset)
      return { "1W": [], "1M": [], "3M": [], "1Y": [] };
    return Object.fromEntries(
      RANGES.map((range) => [
        range.label,
        container.market.getHistory(
          asset.id,
          Math.max(MIN_HISTORY_DAY, day - range.days),
          day,
        ),
      ]),
    ) as Record<RangeLabel, PricePoint[]>;
  }, [asset, container, day]);
  const availability = useMemo(
    () =>
      Object.fromEntries(
        RANGES.map((range) => [
          range.label,
          (historyByRange[range.label]?.length ?? 0) >= 2,
        ]),
      ) as Record<RangeLabel, boolean>,
    [historyByRange],
  );
  const selectedHistory = historyByRange[selectedRange] ?? [];
  const activeIdea = activeSaved.data?.find((item) => item.assetId === id);
  const archivedIdea = archivedSaved.data?.find((item) => item.assetId === id);
  const holding = portfolio.data?.ledger.holdings.find(
    (item) => item.assetId === id,
  );
  const social = asset ? container.social.getSnapshot(asset.id, day) : null;

  useEffect(() => {
    const firstAvailable = RANGES.find((range) => availability[range.label]);
    if (firstAvailable && !availability[selectedRange]) {
      queueMicrotask(() => setSelectedRange(firstAvailable.label));
    }
  }, [availability, selectedRange]);

  useEffect(() => {
    if (asset) void trackEvent(container, "card_details_opened", { asset_id: asset.id });
  }, [asset, container]);

  if (!asset || !quote) {
    return (
      <Page>
        <ScreenHeader
          title={asset?.ticker ?? "Asset"}
          onBack={() => router.back()}
        />
        <Panel>
          <AppText variant="title">Asset not found</AppText>
          <AppText variant="body" color={palette.textSecondary}>
            This demo asset is no longer available in the current market history.
          </AppText>
          <ActionButton
            variant="secondary"
            onPress={() => router.replace("/(tabs)")}
          >
            Back to Discover
          </ActionButton>
        </Panel>
      </Page>
    );
  }

  const selectedAsset = asset;
  const chartSummary = makeChartSummary(selectedHistory, selectedRange);
  const hasShareableResult = Boolean(activeIdea || holding);
  const canSave = currentPrice !== null;

  async function saveIdea() {
    if (pending || activeIdea || !canSave) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await runMutation(container, () =>
        container.savedIdeas.save(selectedAsset.id, createId("details-save")),
      );
      await trackEvent(container, "idea_saved", { asset_id: selectedAsset.id });
      await successHaptic(container);
      const { savedIdea } = result;
      setMessage(
        result.disposition === "restored"
          ? `${selectedAsset.ticker} is back in Saved, still tracking from ${formatPrice(savedIdea.savedPrice)} since ${formatDate(savedIdea.savedAt)}.`
          : `${selectedAsset.ticker} is now tracking from ${formatPrice(savedIdea.savedPrice)}.`,
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to save this idea.",
      );
    } finally {
      setPending(false);
    }
  }

  async function allocate() {
    if (pending || !canSave) return;
    setPending(true);
    setMessage(null);
    try {
      if (!activeIdea) {
        await runMutation(container, () =>
          container.savedIdeas.save(selectedAsset.id, createId("allocate-save")),
        );
        await trackEvent(container, "idea_saved", {
          asset_id: selectedAsset.id,
          reason: "allocate",
        });
      }
      router.push({ pathname: "/allocate", params: { assetIds: selectedAsset.id } });
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to prepare this idea.",
      );
    } finally {
      setPending(false);
    }
  }

  function share() {
    if (!hasShareableResult) return;
    const kind = holding ? "position" : "idea";
    router.push({
      pathname: "/share/[kind]",
      params: { kind, id: selectedAsset.id },
    });
  }

  return (
    <Page
      footer={
        <>
          <View style={styles.actions}>
            <ActionButton
              variant={activeIdea ? "secondary" : "primary"}
              loading={pending}
              disabled={pending || Boolean(activeIdea) || !canSave}
              accessibilityLabel={activeIdea ? `${asset.ticker} is saved` : `Save ${asset.ticker}`}
              accessibilityHint={
                canSave
                  ? "Track the current mock price as the idea baseline"
                  : "Saving is unavailable because this asset has no price"
              }
              onPress={() => void saveIdea()}
              style={styles.action}
            >
              {activeIdea ? "Saved" : "Save idea"}
            </ActionButton>
            <ActionButton
              variant={activeIdea ? "primary" : "secondary"}
              disabled={pending || !canSave}
              accessibilityLabel={`Allocate ${asset.ticker}`}
              accessibilityHint={
                activeIdea
                  ? "Choose a paper allocation"
                  : "Save this idea first, then choose a paper allocation"
              }
              onPress={() => void allocate()}
              style={styles.action}
            >
              Allocate
            </ActionButton>
          </View>
          {message ? (
            <AppText variant="small" color={palette.textSecondary}>
              {message}
            </AppText>
          ) : null}
        </>
      }
    >
      <ScreenHeader
        title={asset.ticker}
        onBack={() => router.back()}
        right={
          <IconButton
            icon="export-variant"
            disabled={pending || !hasShareableResult}
            accessibilityLabel={`Share ${asset.ticker} result`}
            accessibilityHint={
              hasShareableResult
                ? "Open the snapshot-backed share composer"
                : "Save or allocate this idea before sharing a result"
            }
            onPress={share}
          />
        }
      />

      <View style={styles.hero}>
        <View style={styles.identity}>
          <View style={[styles.icon, { backgroundColor: asset.iconColor }]}>
            <AppText
              variant="headline"
              color="#10130D"
              maxFontSizeMultiplier={1}
            >
              {asset.iconInitials}
            </AppText>
          </View>
          <View style={styles.identityCopy}>
            <AppText variant="title">{asset.name}</AppText>
            <AppText variant="small" color={palette.textSecondary}>
              {asset.ticker} · {TYPE_LABELS[asset.type]} · {asset.sector}
            </AppText>
          </View>
        </View>
        <View style={styles.priceCopy}>
          <AppText variant="hero">
            {currentPrice ? formatPrice(currentPrice) : "Price unavailable"}
          </AppText>
          <AppText variant="caption" color={palette.textMuted}>
            USD · {quoteAsOfLabel(quote)} · Mock data
          </AppText>
        </View>
        {activeIdea || holding ? (
          <View style={styles.themeRow}>
            {activeIdea ? <Chip label="Saved" /> : null}
            {holding ? <Chip label="Paper position" /> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.chartBlock}>
        {selectedHistory.length >= 2 ? (
          <EquityChart
            values={selectedHistory.map((point) => point.price)}
            color={palette.accent}
            summary={chartSummary}
          />
        ) : (
          <AppText variant="body" color={palette.textSecondary}>
            Price history is unavailable for this range.
          </AppText>
        )}
        <Segmented
          accessibilityLabel="Price chart range"
          options={RANGES.map((range) => ({
            value: range.label,
            label: range.label,
            accessibilityLabel: `${range.label} chart range`,
            disabled: !availability[range.label],
          }))}
          value={selectedRange}
          onChange={setSelectedRange}
        />
      </View>

      <Section title="About">
        <AppText variant="body" color={palette.textSecondary}>
          {asset.description}
        </AppText>
        <AppText variant="body">{asset.thesis}</AppText>
      </Section>

      <Section title="Risk">
        <AppText variant="body" color={palette.textSecondary}>
          {asset.risk}
        </AppText>
      </Section>

      <DetailsFacts
        asset={asset}
        currentPrice={currentPrice}
        history={selectedHistory}
      />
      <SocialDetails social={social} asset={asset} />
      <RelatedAssets
        asset={asset}
        onPress={(related) =>
          router.push({
            pathname: "/asset/[id]",
            params: { id: related.id },
          })
        }
      />

      {!canSave ? (
        <InlineNotice>
          Price unavailable. Save and new paper fills will unlock when a quote exists.
        </InlineNotice>
      ) : null}
      {archivedIdea && !activeIdea ? (
        <InlineNotice>
          This idea is archived. Saving it again restores the original tracking baseline.
        </InlineNotice>
      ) : null}
      <AppText variant="caption" color={palette.textMuted}>
        Mock data · as of {formatDate(quote.quoteTime)} · Not investment advice.
      </AppText>
    </Page>
  );
}

function DetailsFacts({
  asset,
  currentPrice,
  history,
}: {
  asset: AssetFixture;
  currentPrice: string | null;
  history: PricePoint[];
}) {
  const palette = usePalette();
  const metrics = asset.metrics;
  if (metrics.kind === "stock") {
    const derived = currentPrice
      ? deriveStockMetrics(currentPrice, metrics)
      : { marketCap: null, priceToEarnings: null };
    return (
      <Section>
        <SectionTitle title="Financials" />
        <FactRow label="Revenue" value={formatMoney(metrics.revenueTtm)} />
        <FactRow label="Earnings" value={formatMoney(metrics.netIncomeTtm)} />
        <FactRow label="Gross margin" value={formatRate(metrics.grossMargin)} />
        <FactRow
          label="Operating margin"
          value={formatRate(metrics.operatingMargin)}
        />
        <FactRow label="Cash" value={formatMoney(metrics.cash)} />
        <FactRow label="Debt" value={formatMoney(metrics.totalDebt)} />
        <FactRow label="Free cash flow" value={formatMoney(metrics.freeCashFlowTtm)} />
        <FactRow label="Market cap" value={formatMoney(derived.marketCap)} />
        <FactRow label="P/E ratio" value={formatMultiple(derived.priceToEarnings)} />
        <FactRow
          label="Industry peers"
          value={metrics.peers.length ? metrics.peers.join(", ") : "Unavailable"}
        />
      </Section>
    );
  }
  if (metrics.kind === "etf") {
    return (
      <Section>
        <SectionTitle title="Fund" />
        <FactRow label="Objective" value={metrics.objective} />
        <FactRow label="Assets under management" value={formatMoney(metrics.aum)} />
        <FactRow label="Expense ratio" value={formatRate(metrics.expenseRatio)} />
        <FactRow
          label="Distribution yield"
          value={formatRate(metrics.distributionYield)}
        />
        <FactRow
          label="Top 10 concentration"
          value={formatRate(metrics.top10Concentration)}
        />
        <View style={styles.subsection}>
          <AppText variant="caption" color={palette.textMuted}>Top holdings</AppText>
          {metrics.holdings.length ? (
            metrics.holdings.map((holding) => (
              <FactRow
                key={holding.name}
                label={holding.name}
                value={formatRate(holding.weight)}
              />
            ))
          ) : (
            <AppText variant="small">Unavailable</AppText>
          )}
        </View>
        <View style={styles.subsection}>
          <AppText variant="caption" color={palette.textMuted}>Exposures</AppText>
          {metrics.exposures.length ? (
            metrics.exposures.map((exposure) => (
              <FactRow
                key={exposure.label}
                label={exposure.label}
                value={formatRate(exposure.weight)}
              />
            ))
          ) : (
            <AppText variant="small">Unavailable</AppText>
          )}
        </View>
        <FactRow label="Distribution notes" value={metrics.distributionNotes} />
      </Section>
    );
  }
  return (
    <Section>
      <SectionTitle title="Network" />
      <FactRow label="Network purpose" value={metrics.networkPurpose} />
      <FactRow label="Supply structure" value={metrics.supplyStructure} />
      <FactRow label="Token risks" value={metrics.tokenRisks} />
      <FactRow label="Circulating supply" value={formatNumber(metrics.circulatingSupply, 0)} />
      <FactRow label="Maximum supply" value={formatNumber(metrics.maxSupply, 0)} />
      <FactRow
        label="Volatility (annualized demo estimate)"
        value={formatRate(annualizedVolatility(history.map((point) => point.price)))}
      />
      <FactRow
        label="24h volume / liquidity proxy"
        value={formatCompactMoney(metrics.volume24h)}
      />
    </Section>
  );
}

function SocialDetails({
  social,
  asset,
}: {
  social: SocialSnapshot | null;
  asset: AssetFixture;
}) {
  const palette = usePalette();
  const attention = socialAttention(social);
  return (
    <Section>
      <SectionTitle title="Social attention" />
      <AppText variant="small" color={palette.textSecondary}>
        Attention compares the last 24 hours with the daily average over the
        preceding seven days. It is not sentiment and is not a buy signal.
      </AppText>
      <View style={styles.socialSummary}>
        <View style={styles.socialCopy}>
          <AppText variant="caption" color={palette.textMuted}>Attention</AppText>
          <AppText variant="body">{attention.label}</AppText>
        </View>
        {social ? (
          <Sparkline
            values={social.history.map((point) => String(point.count))}
            color={palette.accent}
            label={`30-day attention history for ${asset.ticker}`}
          />
        ) : null}
      </View>
      <FactRow label="Comparison window" value={attention.comparison} />
      <FactRow
        label="Sampled sentiment"
        value={social ? sentimentLabel(social) : "Unavailable"}
      />
      <View style={styles.subsection}>
        <AppText variant="caption" color={palette.textMuted}>Demo discussion summary</AppText>
        {social?.discussionThemes.length ? (
          social.discussionThemes.map((theme) => (
            <AppText key={theme} variant="small" color={palette.textSecondary}>
              • {theme}
            </AppText>
          ))
        ) : (
          <AppText variant="small" color={palette.textSecondary}>
            Unavailable
          </AppText>
        )}
      </View>
      <AppText variant="small" color={palette.textMuted}>
        Mock social data · as of {formatDate(social?.asOf ?? null)}
      </AppText>
    </Section>
  );
}

function RelatedAssets({
  asset,
  onPress,
}: {
  asset: AssetFixture;
  onPress: (asset: AssetFixture) => void;
}) {
  const container = useContainer();
  const palette = usePalette();
  const related = container.assets.related(asset.id, 4);
  return (
    <Section>
      <SectionTitle title="Related" />
      <View style={styles.themeRow}>
        {asset.themes.map((theme) => (
          <Chip key={theme} label={THEME_LABELS[theme]} />
        ))}
      </View>
      {related.length ? (
        related.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Open related asset ${item.name}, ${item.ticker}`}
            accessibilityHint="Open details for this related asset"
            onPress={() => onPress(item)}
            style={[styles.relatedRow, { borderTopColor: palette.separator }]}
          >
            <View style={[styles.relatedIcon, { backgroundColor: item.iconColor }]}>
              <AppText
                variant="label"
                color="#10130D"
                maxFontSizeMultiplier={1}
              >
                {item.iconInitials}
              </AppText>
            </View>
            <View style={styles.relatedCopy}>
              <AppText variant="label">{item.name}</AppText>
              <AppText variant="small" color={palette.textSecondary}>
                {item.ticker} · {TYPE_LABELS[item.type]}
              </AppText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={palette.textMuted}
              accessible={false}
            />
          </Pressable>
        ))
      ) : (
        <AppText variant="small" color={palette.textSecondary}>
          No related fixtures found.
        </AppText>
      )}
    </Section>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.factRow, { borderTopColor: palette.separator }]}>
      <AppText variant="small" color={palette.textSecondary}>
        {label}
      </AppText>
      <AppText variant="small" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

function makeChartSummary(history: PricePoint[], range: RangeLabel): string {
  const first = history[0];
  const last = history.at(-1);
  if (!first || !last) return "No chart data is available.";
  const change = returnSinceSave(last.price, first.price);
  const rangeStart = formatPrice(first.price);
  const rangeEnd = formatPrice(last.price);
  const formatted = formatPercent(change).replace("+", "");
  const direction =
    change === "0" ? "Flat" : change.startsWith("-") ? "Down" : "Up";
  return `${direction} ${formatted} over ${range}, from ${rangeStart} to ${rangeEnd}.`;
}

const styles = StyleSheet.create({
  hero: { gap: 20 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: {
    width: 52,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: { flex: 1, gap: 2 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceCopy: { gap: 4 },
  chartBlock: { gap: 16 },
  subsection: { gap: 8, paddingTop: 8 },
  factRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  factValue: { flex: 1, textAlign: "right" },
  socialSummary: { flexDirection: "row", alignItems: "center", gap: 14 },
  socialCopy: { flex: 1, gap: 4 },
  relatedRow: {
    minHeight: 60,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  relatedIcon: {
    width: 38,
    minHeight: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  relatedCopy: { flex: 1, gap: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { flexGrow: 1, flexBasis: "40%" },
});
