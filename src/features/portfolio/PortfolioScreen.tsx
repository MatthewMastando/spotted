import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { Holding } from "@/domain/ledger";
import { formatDate, formatMoney, formatPercent, formatPrice, formatNumber } from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { fillBasisForQuote } from "@/domain/quotes";
import { D } from "@/domain/decimal";
import { EquityChart } from "@/components/Chart";
import {
  ActionButton,
  AppText,
  Chip,
  InlineNotice,
  Page,
  PageTitle,
  Panel,
  SectionTitle,
} from "@/components/ui";
import { TYPE_LABELS, quoteAsOfLabel, THEME_LABELS } from "@/features/common/labels";
import { usePalette } from "@/design/theme";
import { useContainer } from "@/services/ContainerContext";
import { trackEvent } from "@/services/track";
import { successHaptic } from "@/services/haptics";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSettings } from "@/state/hooks";

export function PortfolioScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const portfolio = usePortfolioData();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [dismissedShare, setDismissedShare] = useState(false);
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
      for (const theme of asset.themes) {
        themes.set(
          theme,
          (themes.get(theme) ?? D(0)).plus(holding.value),
        );
      }
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
        .sort((left, right) => Number(right.share) - Number(left.share))
        .slice(0, 5),
    };
  }, [container, data]);

  if (portfolio.loading && !data) {
    return (
      <Page>
        <PageTitle title="Portfolio" subtitle="Loading your paper account…" />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <PageTitle title="Portfolio" subtitle="Your paper account could not be loaded." />
        {portfolio.error ? <InlineNotice>{portfolio.error.message}</InlineNotice> : null}
      </Page>
    );
  }

  const ledger = data.ledger;
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
    Alert.alert(
      `Close ${asset.ticker}?`,
      `This sells the whole paper position at ${formatPrice(quote.price)} (${quoteAsOfLabel(quote)}).`,
      [
        { text: "Keep position", style: "cancel" },
        {
          text: "Close position",
          style: "destructive",
          onPress: () => {
            void (async () => {
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
            })();
          },
        },
      ],
    );
  }

  return (
    <Page>
      <PageTitle
        eyebrow="PAPER ACCOUNT"
        title="Portfolio"
        subtitle="A simulated ledger with a $10,000 starting balance."
      />
      {settings.sampleJourney ? (
        <InlineNotice>
          <AppText variant="small" color={palette.accent}>
            Sample journey — not your track record
          </AppText>
        </InlineNotice>
      ) : null}
      <Panel style={styles.summaryPanel}>
        <AppText variant="label" color={palette.textSecondary}>
          PAPER PORTFOLIO VALUE
        </AppText>
        <AppText variant="display">{formatMoney(ledger.equity)}</AppText>
        <View style={styles.summaryGrid}>
          <SummaryStat
            label="Paper P&L"
            value={formatMoney(ledger.totalPaperPnL)}
            detail={formatPercent(ledger.totalPaperReturn)}
            color={pnlColor(ledger.totalPaperPnL, palette)}
          />
          <SummaryStat label="Cash" value={formatMoney(ledger.cash)} />
        </View>
      </Panel>

      {meaningfulResult && !dismissedShare ? (
        <Panel style={styles.shareCta}>
          <View style={styles.shareCopy}>
            <AppText variant="title">You have a result worth seeing.</AppText>
            <AppText variant="small" color={palette.textSecondary}>
              Preview a demo card built from this exact ledger.
            </AppText>
          </View>
          <ActionButton
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
          >
            Share result
          </ActionButton>
          <ActionButton
            variant="quiet"
            accessibilityLabel="Dismiss share result prompt"
            onPress={() => setDismissedShare(true)}
          >
            Dismiss
          </ActionButton>
        </Panel>
      ) : null}

      <Panel style={styles.chartPanel}>
        <SectionTitle title="Equity history" />
        <EquityChart
          values={data.history.map((point) => point.equity)}
          color={pnlColor(ledger.totalPaperPnL, palette)}
          summary={`${formatPercent(historyReturn)} since the paper account opened, including cash.`}
        />
      </Panel>

      <SectionTitle title="Holdings" />
      {ledger.holdings.length ? (
        ledger.holdings.map((holding) => (
          <HoldingCard
            key={holding.assetId}
            holding={holding}
            day={day}
            closing={closingId === holding.assetId}
            onAdd={() =>
              router.push({
                pathname: "/allocate",
                params: { assetIds: holding.assetId },
              })
            }
            onClose={() => void close(holding.assetId)}
            onShare={() =>
              router.push({
                pathname: "/share/[kind]",
                params: { kind: "position", id: holding.assetId },
              })
            }
          />
        ))
      ) : (
        <Panel style={styles.empty}>
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
        </Panel>
      )}

      {closedAssets.length ? (
        <>
          <SectionTitle title="Closed positions" />
          <Panel style={styles.closedPanel}>
            {closedAssets.map((assetId) => {
              const asset = container.assets.getDetails(assetId);
              if (!asset) return null;
              const realized = ledger.realizedByAsset[assetId] ?? "0";
              return (
                <View key={assetId} style={styles.closedRow}>
                  <View style={styles.closedCopy}>
                    <AppText variant="label">{asset.ticker}</AppText>
                    <AppText variant="small" color={palette.textSecondary}>
                      Closed paper position
                    </AppText>
                  </View>
                  <AppText
                    variant="number"
                    color={pnlColor(realized, palette)}
                  >
                    {formatMoney(realized)}
                  </AppText>
                </View>
              );
            })}
            <AppText variant="small" color={palette.textSecondary}>
              Realized P&L remains part of the account result after a position is closed.
            </AppText>
          </Panel>
        </>
      ) : null}

      {ledger.holdings.length ? (
        <>
          <SectionTitle title="Concentration" />
          <Panel style={styles.concentrationPanel}>
            <AppText variant="small" color={palette.textSecondary}>
              These bars describe current paper value; they do not predict risk or returns.
            </AppText>
            <ConcentrationGroup title="Asset class" items={concentration.classes} />
            <ConcentrationGroup title="Theme" items={concentration.themes} />
          </Panel>
        </>
      ) : null}

      <SectionTitle title="Activity" />
      {data.transactions.length ? (
        <Panel style={styles.activityPanel}>
          {data.transactions
            .slice()
            .reverse()
            .slice(0, 8)
            .map((transaction) => {
              const asset = container.assets.getDetails(transaction.assetId);
              return (
                <View key={transaction.id} style={styles.activityRow}>
                  <View style={styles.activityCopy}>
                    <AppText variant="label">
                      {transaction.side === "buy" ? "Paper buy" : "Position closed"}{" "}
                      {asset?.ticker ?? transaction.assetId}
                    </AppText>
                    <AppText variant="small" color={palette.textSecondary}>
                      {formatDate(transaction.executedAt)} ·{" "}
                      {transaction.fillBasis === "last_close"
                        ? "Last close"
                        : "Session fill"}
                    </AppText>
                  </View>
                  <AppText variant="number">{formatMoney(transaction.amount)}</AppText>
                </View>
              );
            })}
        </Panel>
      ) : (
        <Panel>
          <AppText variant="small" color={palette.textSecondary}>
            No paper activity yet.
          </AppText>
        </Panel>
      )}
    </Page>
  );
}

function HoldingCard({
  holding,
  day,
  closing,
  onAdd,
  onClose,
  onShare,
}: {
  holding: Holding;
  day: number;
  closing: boolean;
  onAdd: () => void;
  onClose: () => void;
  onShare: () => void;
}) {
  const container = useContainer();
  const palette = usePalette();
  const asset = container.assets.getDetails(holding.assetId);
  const quote = container.market.getQuote(holding.assetId, day);
  const canClose = Boolean(fillBasisForQuote(quote) && quote.price);
  if (!asset) return null;
  return (
    <Panel style={styles.holdingPanel}>
      <View style={styles.holdingHeader}>
        <View style={styles.holdingCopy}>
          <AppText variant="title">{asset.ticker}</AppText>
          <AppText variant="small" color={palette.textSecondary}>
            {asset.name} · {TYPE_LABELS[asset.type]}
          </AppText>
        </View>
        {holding.stale ? <Chip label="Stale valuation" /> : null}
      </View>
      <View style={styles.holdingGrid}>
        <PortfolioData label="Invested" value={formatMoney(holding.costBasis)} />
        <PortfolioData label="Units" value={formatNumber(holding.units, 6)} />
        <PortfolioData label="Average entry" value={formatPrice(holding.avgEntry)} />
        <PortfolioData label="Current value" value={formatMoney(holding.value)} />
        <PortfolioData
          label="Paper P&L"
          value={`${formatMoney(holding.unrealized)} · ${formatPercent(holding.positionReturn)}`}
          color={pnlColor(holding.unrealized, palette)}
        />
      </View>
      <View style={styles.actions}>
        <ActionButton
          variant="secondary"
          accessibilityLabel={`Add to ${asset.ticker}`}
          onPress={onAdd}
          style={styles.smallAction}
        >
          Add
        </ActionButton>
        <ActionButton
          variant="danger"
          loading={closing}
          disabled={!canClose || closing}
          accessibilityLabel={`Close ${asset.ticker} position`}
          accessibilityHint={
            canClose
              ? `Close the whole position at ${quoteAsOfLabel(quote)}`
              : "Closing is blocked because this quote is stale or unavailable"
          }
          onPress={onClose}
          style={styles.smallAction}
        >
          Close position
        </ActionButton>
        <ActionButton
          variant="quiet"
          accessibilityLabel={`Share ${asset.ticker} position`}
          onPress={onShare}
          style={styles.smallAction}
        >
          Share
        </ActionButton>
      </View>
      {!canClose ? (
        <AppText variant="small" color={palette.negative}>
          Close unavailable: the current quote is {quoteAsOfLabel(quote).toLowerCase()}.
        </AppText>
      ) : null}
    </Panel>
  );
}

function SummaryStat({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail?: string;
  color?: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.summaryStat}>
      <AppText variant="label" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="number" color={color}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="small" color={color}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

function PortfolioData({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.portfolioData}>
      <AppText variant="label" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="small" color={color ?? palette.text}>
        {value}
      </AppText>
    </View>
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
      <AppText variant="label">{title}</AppText>
      {items.length ? (
        items.map((item) => (
          <View key={item.label} style={styles.barRow}>
            <AppText variant="small" style={styles.barLabel}>
              {item.label}
            </AppText>
            <View style={[styles.barTrack, { backgroundColor: palette.surfaceRaised }]}>
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
            <AppText variant="small" style={styles.barValue}>
              {formatPercent(item.share)}
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
  summaryPanel: { gap: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  summaryStat: { flexGrow: 1, flexBasis: "40%", gap: 3 },
  shareCta: { gap: 12 },
  shareCopy: { gap: 6 },
  chartPanel: { gap: 12 },
  holdingPanel: { gap: 14 },
  holdingHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  holdingCopy: { flex: 1, gap: 3 },
  holdingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  portfolioData: { flexGrow: 1, flexBasis: "42%", gap: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  smallAction: { flexGrow: 1, flexBasis: "28%", minHeight: 44 },
  empty: { gap: 12 },
  closedPanel: { gap: 12 },
  closedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closedCopy: { flex: 1, gap: 3 },
  concentrationPanel: { gap: 16 },
  concentrationGroup: { gap: 9 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 112 },
  barTrack: { flex: 1, height: 9, borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99 },
  barValue: { width: 56, textAlign: "right" },
  activityPanel: { gap: 12 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  activityCopy: { flex: 1, gap: 3 },
});
