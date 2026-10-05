import { useMemo, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Holding } from "@/domain/ledger";
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatPrice,
  formatNumber,
  formatShare,
} from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { fillBasisForQuote } from "@/domain/quotes";
import { D } from "@/domain/decimal";
import { EquityChart } from "@/components/Chart";
import { useReducedMotion } from "@/state/accessibility";
import {
  ActionButton,
  AppText,
  IconButton,
  InlineNotice,
  ListGroup,
  ListRow,
  Page,
  Section,
  ScreenHeader,
  Stat,
} from "@/components/ui";
import { TYPE_LABELS, quoteAsOfLabel, THEME_LABELS } from "@/features/common/labels";
import { usePalette } from "@/design/theme";
import { useContainer } from "@/services/ContainerContext";
import { confirmAction } from "@/services/confirm";
import { trackEvent } from "@/services/track";
import { successHaptic } from "@/services/haptics";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSettings } from "@/state/hooks";

export function PortfolioScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const settings = useSettings() ?? container.getSettings();
  const portfolio = usePortfolioData();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [dismissedShare, setDismissedShare] = useState(false);
  const [menuAssetId, setMenuAssetId] = useState<string | null>(null);
  const day = settings.clock.dayOffset;
  const data = portfolio.data;

  const concentration = useMemo(() => {
    if (!data?.ledger.holdings.length) return { classes: [], themes: [] };
    const total = D(
      data.ledger.holdings.reduce(
        (sum, holding) => sum.plus(holding.value),
        D(0),
      ),
    );
    const classes = new Map<string, ReturnType<typeof D>>();
    const themes = new Map<string, ReturnType<typeof D>>();
    for (const holding of data.ledger.holdings) {
      const asset = container.assets.getDetails(holding.assetId);
      if (!asset) continue;
      classes.set(
        asset.type,
        (classes.get(asset.type) ?? D(0)).plus(holding.value),
      );
      const primaryTheme = asset.themes[0];
      themes.set(
        primaryTheme,
        (themes.get(primaryTheme) ?? D(0)).plus(holding.value),
      );
    }
    return {
      classes: [...classes.entries()]
        .map(([label, value]) => ({
          label: TYPE_LABELS[label as keyof typeof TYPE_LABELS] ?? label,
          share: value.div(total).toString(),
        }))
        .sort((left, right) => Number(right.share) - Number(left.share)),
      themes: [...themes.entries()]
        .map(([label, value]) => ({
          label: THEME_LABELS[label as keyof typeof THEME_LABELS] ?? label,
          share: value.div(total).toString(),
        }))
        .sort((left, right) => Number(right.share) - Number(left.share)),
    };
  }, [container, data]);

  if (portfolio.loading && !data) {
    return (
      <Page>
        <ScreenHeader title="Portfolio" subtitle="Loading your paper account…" />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <ScreenHeader
          title="Portfolio"
          subtitle="Your paper account could not be loaded."
        />
        {portfolio.error ? <InlineNotice>{portfolio.error.message}</InlineNotice> : null}
      </Page>
    );
  }

  const ledger = data.ledger;
  const menuHolding = ledger.holdings.find(
    (holding) => holding.assetId === menuAssetId,
  );
  const menuAsset = menuHolding
    ? container.assets.getDetails(menuHolding.assetId)
    : null;
  const menuQuote = menuHolding
    ? container.market.getQuote(menuHolding.assetId, day)
    : null;
  const menuCanClose = Boolean(
    menuQuote && fillBasisForQuote(menuQuote) && menuQuote.price,
  );
  const historyFirst = data.history[0];
  const historyLast = data.history.at(-1);
  const historyReturn =
    historyFirst && historyLast
      ? returnSinceSave(historyLast.equity, historyFirst.equity)
      : "0";
  const meaningfulResult =
    Math.abs(Number(ledger.totalPaperReturn)) >= 0.05 ||
    ledger.holdings.some((holding) => Math.abs(Number(holding.positionReturn)) >= 0.1);
  const closedAssets = [...new Set(
    data.transactions
      .filter((transaction) => transaction.side === "sell")
      .map((transaction) => transaction.assetId),
  )].filter(
    (assetId) => !ledger.holdings.some((holding) => holding.assetId === assetId),
  );

  async function close(assetId: string) {
    if (closingId) return;
    const asset = container.assets.getDetails(assetId);
    if (!asset) return;
    const quote = container.market.getQuote(assetId, day);
    if (!fillBasisForQuote(quote) || !quote.price) return;
    const confirmed = await confirmAction({
      title: `Close ${asset.ticker}?`,
      message: `This sells the whole paper position at ${formatPrice(quote.price)} (${quoteAsOfLabel(quote)}).`,
      confirmLabel: "Close position",
      cancelLabel: "Keep position",
      destructive: true,
    });
    if (!confirmed) return;
    setClosingId(assetId);
    try {
      await runMutation(container, () =>
        container.portfolio.closePosition(assetId),
      );
      await trackEvent(container, "position_closed", { asset_id: assetId });
      await successHaptic(container);
    } finally {
      setClosingId(null);
    }
  }

  const invested = ledger.holdings
    .reduce((total, holding) => total.plus(holding.costBasis), D(0))
    .toString();

  return (
    <>
      <Page contentStyle={styles.pageContent}>
        <ScreenHeader title="Portfolio" />
        {settings.sampleJourney ? (
          <AppText variant="caption" color={palette.textSecondary}>
            Sample journey — not your track record
          </AppText>
        ) : null}

        <View style={styles.summary}>
          <AppText variant="caption" color={palette.textMuted}>
            Paper portfolio value
          </AppText>
          <AppText variant="hero">{formatMoney(ledger.equity)}</AppText>
          <View style={styles.summaryStats}>
            <View style={styles.pnlStat}>
              <Stat
                label="Paper P&L"
                value={formatMoney(ledger.totalPaperPnL)}
                color={pnlColor(ledger.totalPaperPnL, palette)}
              />
              <AppText
                variant="caption"
                color={pnlColor(ledger.totalPaperPnL, palette)}
              >
                {formatPercent(ledger.totalPaperReturn)}
              </AppText>
            </View>
            <Stat label="Cash" value={formatMoney(ledger.cash)} />
            <Stat label="Invested" value={formatMoney(invested)} />
          </View>
        </View>

        {meaningfulResult && !dismissedShare ? (
          <View style={styles.sharePrompt}>
            <View style={styles.shareCopy}>
              <AppText variant="small">A paper result is ready to share.</AppText>
              <AppText variant="caption" color={palette.textSecondary}>
                Preview a card built from this ledger.
              </AppText>
            </View>
            <ActionButton
              variant="secondary"
              accessibilityLabel="Share portfolio result"
              onPress={() => {
                const holding = ledger.holdings[0];
                router.push({
                  pathname: "/share/[kind]",
                  params: holding
                    ? { kind: "position", id: holding.assetId }
                    : { kind: "portfolio" },
                });
              }}
              style={styles.shareButton}
            >
              Share result
            </ActionButton>
            <IconButton
              icon="close"
              accessibilityLabel="Dismiss share result prompt"
              onPress={() => setDismissedShare(true)}
            />
          </View>
        ) : null}

        <Section title="Equity history">
          <EquityChart
            values={data.history.map((point) => point.equity)}
            color={pnlColor(ledger.totalPaperPnL, palette)}
            summary={`${formatPercent(historyReturn)} since the paper account opened, including cash.`}
            baseline="10000"
            startLabel={historyFirst ? formatDate(historyFirst.time) : ""}
            endLabel={historyLast ? formatDate(historyLast.time) : ""}
          />
        </Section>

        <Section title="Holdings">
          {ledger.holdings.length ? (
            <ListGroup>
              {ledger.holdings.map((holding, index) => (
                <HoldingCard
                  key={holding.assetId}
                  holding={holding}
                  first={index === 0}
                  day={day}
                  closing={closingId === holding.assetId}
                  onMore={() => setMenuAssetId(holding.assetId)}
                  onShare={() =>
                    router.push({
                      pathname: "/share/[kind]",
                      params: { kind: "position", id: holding.assetId },
                    })
                  }
                />
              ))}
            </ListGroup>
          ) : (
            <View style={styles.empty}>
              <AppText variant="title">Your paper holdings are empty.</AppText>
              <AppText variant="body" color={palette.textSecondary}>
                Save ideas in Discover, then allocate paper cash when you are ready
                to test a thesis.
              </AppText>
              <ActionButton
                accessibilityLabel="Open saved ideas"
                onPress={() => router.push("/(tabs)/saved")}
              >
                Open Saved
              </ActionButton>
            </View>
          )}
        </Section>

        {closedAssets.length ? (
          <Section title="Closed positions">
            <ListGroup>
              {closedAssets.map((assetId, index) => {
                const asset = container.assets.getDetails(assetId);
                if (!asset) return null;
                const realized = ledger.realizedByAsset[assetId] ?? "0";
                return (
                  <ListRow
                    key={assetId}
                    first={index === 0}
                    title={asset.ticker}
                    subtitle="Closed paper position"
                    trailing={
                      <AppText
                        variant="number"
                        color={pnlColor(realized, palette)}
                      >
                        {formatMoney(realized)}
                      </AppText>
                    }
                  />
                );
              })}
            </ListGroup>
            <AppText variant="caption" color={palette.textSecondary}>
              Realized P&L remains part of the account result after a position is closed.
            </AppText>
          </Section>
        ) : null}

        {ledger.holdings.length ? (
          <Section title="Concentration">
            <AppText variant="small" color={palette.textSecondary}>
              These bars describe current paper value; they do not predict risk or returns.
            </AppText>
            <ConcentrationGroup title="Asset class" items={concentration.classes} />
            <ConcentrationGroup title="Theme" items={concentration.themes} />
          </Section>
        ) : null}

        <Section title="Activity">
          {data.transactions.length ? (
            <ListGroup>
              {data.transactions
                .slice()
                .reverse()
                .slice(0, 8)
                .map((transaction, index) => {
                  const asset = container.assets.getDetails(transaction.assetId);
                  return (
                    <ListRow
                      key={transaction.id}
                      first={index === 0}
                      title={`${transaction.side === "buy" ? "Paper buy" : "Position closed"} ${asset?.ticker ?? transaction.assetId}`}
                      subtitle={`${formatDate(transaction.executedAt)} · ${
                        transaction.fillBasis === "last_close"
                          ? "Last close"
                          : "Session fill"
                      }`}
                      trailing={
                        <AppText variant="number">
                          {formatMoney(transaction.amount)}
                        </AppText>
                      }
                    />
                  );
                })}
            </ListGroup>
          ) : (
            <AppText variant="small" color={palette.textSecondary}>
              No paper activity yet.
            </AppText>
          )}
        </Section>
      </Page>

      <Modal
        visible={menuHolding !== undefined && menuAsset !== null}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setMenuAssetId(null)}
      >
        <View style={styles.sheetScrim}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surface,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {menuHolding && menuAsset ? (
              <>
                <AppText variant="title">{menuAsset.ticker} position</AppText>
                <ListGroup>
                  <ListRow
                    first
                    title={`Add to ${menuAsset.ticker}`}
                    accessibilityLabel={`Add to ${menuAsset.ticker}`}
                    onPress={() => {
                      const assetId = menuAsset.id;
                      setMenuAssetId(null);
                      router.push({
                        pathname: "/allocate",
                        params: { assetIds: assetId },
                      });
                    }}
                  />
                  <ListRow
                    title={`Close ${menuAsset.ticker} position`}
                    accessibilityLabel={`Close ${menuAsset.ticker} position`}
                    accessibilityHint={
                      menuCanClose && menuQuote
                        ? `Close the whole position at ${quoteAsOfLabel(menuQuote)}`
                        : "Closing is blocked because this quote is stale or unavailable"
                    }
                    disabled={
                      !menuCanClose || closingId === menuAsset.id
                    }
                    onPress={() => {
                      const assetId = menuAsset.id;
                      setMenuAssetId(null);
                      void close(assetId);
                    }}
                  />
                </ListGroup>
              </>
            ) : null}
            <ActionButton
              variant="quiet"
              accessibilityLabel="Close position actions"
              onPress={() => setMenuAssetId(null)}
            >
              Done
            </ActionButton>
          </View>
        </View>
      </Modal>
    </>
  );
}

function HoldingCard({
  holding,
  first,
  day,
  closing,
  onMore,
  onShare,
}: {
  holding: Holding;
  first: boolean;
  day: number;
  closing: boolean;
  onMore: () => void;
  onShare: () => void;
}) {
  const container = useContainer();
  const palette = usePalette();
  const asset = container.assets.getDetails(holding.assetId);
  const quote = container.market.getQuote(holding.assetId, day);
  const canClose = Boolean(fillBasisForQuote(quote) && quote.price);
  if (!asset) return null;
  return (
    <ListRow
      first={first}
      title={asset.ticker}
      titleVariant="headline"
      titleNumberOfLines={1}
      titleTrailing={
        <View style={styles.holdingValues}>
          <AppText variant="number" numberOfLines={1}>
            {formatMoney(holding.value)}
          </AppText>
          <AppText
            variant="caption"
            numberOfLines={1}
            color={pnlColor(holding.unrealized, palette)}
          >
            {formatMoney(holding.unrealized)} ·{" "}
            {formatPercent(holding.positionReturn)}
          </AppText>
        </View>
      }
      subtitle={
        <View style={styles.holdingSubtitle}>
          <AppText
            variant="small"
            color={palette.textSecondary}
            numberOfLines={1}
          >
            {asset.name}
          </AppText>
          <AppText
            variant="caption"
            color={palette.textSecondary}
            numberOfLines={1}
          >
            {formatNumber(holding.units, 6)} units · Avg{" "}
            {formatPrice(holding.avgEntry)}
          </AppText>
          {holding.stale ? (
            <AppText variant="caption" color={palette.textSecondary}>
              Stale valuation
            </AppText>
          ) : null}
          {!canClose ? (
            <AppText variant="caption" color={palette.negative}>
              Close unavailable: the current quote is{" "}
              {quoteAsOfLabel(quote).toLowerCase()}.
            </AppText>
          ) : null}
        </View>
      }
      trailing={
        <View style={styles.holdingTrailing}>
          <IconButton
            icon="share-variant"
            accessibilityLabel={`Share ${asset.ticker} position`}
            onPress={onShare}
            testID="portfolio-share-position"
            variant="plain"
            size="sm"
            stopPropagation
          />
          <IconButton
            icon="dots-horizontal"
            accessibilityLabel={`More actions for ${asset.ticker} position`}
            onPress={onMore}
            disabled={closing}
            variant="plain"
            size="sm"
            stopPropagation
          />
        </View>
      }
    />
  );
}

function ConcentrationGroup({
  title,
  items,
}: {
  title: string;
  items: { label: string; share: string }[];
}) {
  const palette = usePalette();
  return (
    <View style={styles.concentrationGroup}>
      <AppText variant="headline">{title}</AppText>
      {items.length ? (
        items.map((item) => (
          <View key={item.label} style={styles.barRow}>
            <AppText variant="small" style={styles.barLabel}>
              {item.label}
            </AppText>
            <View
              style={[
                styles.barTrack,
                { backgroundColor: palette.surfaceRaised },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(100, Math.max(0, Number(item.share) * 100))}%`,
                    backgroundColor: palette.accent,
                  },
                ]}
              />
            </View>
            <AppText variant="small" numberOfLines={1} style={styles.barValue}>
              {formatShare(item.share)}
            </AppText>
          </View>
        ))
      ) : (
        <AppText variant="small" color={palette.textSecondary}>
          Not applicable
        </AppText>
      )}
    </View>
  );
}

function pnlColor(value: string, palette: ReturnType<typeof usePalette>): string {
  if (value.startsWith("-")) return palette.negative;
  if (value === "0") return palette.textSecondary;
  return palette.positive;
}

const styles = StyleSheet.create({
  pageContent: { gap: 32, paddingTop: 12 },
  summary: { gap: 8 },
  summaryStats: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pnlStat: { flex: 1, gap: 3 },
  sharePrompt: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareCopy: { flex: 1, gap: 2 },
  shareButton: { minHeight: 44, paddingHorizontal: 12 },
  holdingSubtitle: { flex: 1, gap: 3 },
  holdingTrailing: { flexDirection: "row", alignItems: "center", gap: 2 },
  holdingValues: { minWidth: 76, alignItems: "flex-end", gap: 2 },
  empty: { gap: 12 },
  concentrationGroup: { gap: 9 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 112 },
  barTrack: { flex: 1, height: 6, borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99 },
  barValue: { width: 64, flexShrink: 0, textAlign: "right" },
  sheetScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
