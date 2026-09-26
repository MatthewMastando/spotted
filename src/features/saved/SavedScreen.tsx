import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AssetFixture, SavedIdea } from "@/domain/types";
import { formatDate, formatMoney, formatPercent, formatPrice } from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { socialAttention } from "@/domain/social";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  Chip,
  InlineNotice,
  Page,
  Panel,
  ScreenHeader,
} from "@/components/ui";
import { THEME_LABELS, TYPE_LABELS } from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { trackEvent } from "@/services/track";
import { lightHaptic, successHaptic } from "@/services/haptics";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSavedIdeas, useSettings } from "@/state/hooks";

type SortMode = "newest" | "best" | "worst" | "social";
const SORTS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "best", label: "Best return" },
  { value: "worst", label: "Worst return" },
  { value: "social", label: "Social attention" },
];
const TYPES: { value: AssetFixture["type"] | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

type SavedRow = {
  saved: SavedIdea;
  asset: AssetFixture;
  currentPrice: string | null;
  returnValue: string | null;
  attentionRatio: number;
  fundedAmount: string | null;
  funded: boolean;
  stale: boolean;
};

export function sortSavedRows(rows: SavedRow[], sort: SortMode): SavedRow[] {
  return rows.slice().sort((left, right) => {
    if (sort === "best")
      return Number(right.returnValue ?? -Infinity) - Number(left.returnValue ?? -Infinity);
    if (sort === "worst")
      return Number(left.returnValue ?? Infinity) - Number(right.returnValue ?? Infinity);
    if (sort === "social")
      return right.attentionRatio - left.attentionRatio;
    return right.saved.savedAt.localeCompare(left.saved.savedAt);
  });
}

export function SavedScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const settings = useSettings() ?? container.getSettings();
  const [state, setState] = useState<"active" | "archived">("active");
  const [sort, setSort] = useState<SortMode>("newest");
  const [typeFilter, setTypeFilter] = useState<AssetFixture["type"] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const saved = useSavedIdeas(state);
  const portfolio = usePortfolioData();
  const day = settings.clock.dayOffset;

  const rows = useMemo(() => {
    if (!saved.data) return [];
    const items = saved.data
      .map((idea): SavedRow | null => {
        const asset = container.assets.getDetails(idea.assetId);
        if (!asset || (typeFilter && asset.type !== typeFilter)) return null;
        const quote = container.market.getQuote(asset.id, day);
        const currentPrice =
          quote.price ?? container.market.getLastValidPrice(asset.id, day);
        const social = container.social.getSnapshot(asset.id, day);
        const returnValue = currentPrice
          ? returnSinceSave(currentPrice, idea.savedPrice)
          : null;
        const holding = portfolio.data?.ledger.holdings.find(
          (item) => item.assetId === asset.id,
        );
        const funded = Boolean(
          holding ||
            portfolio.data?.transactions.some(
              (transaction) =>
                transaction.assetId === asset.id && transaction.side === "buy",
            ),
        );
        return {
          saved: idea,
          asset,
          currentPrice,
          returnValue,
          attentionRatio: Number(socialAttention(social).ratio ?? -1),
          fundedAmount: holding?.costBasis ?? null,
          funded,
          stale: Boolean(holding?.stale),
        };
      })
      .filter((row): row is SavedRow => row !== null)
    return sortSavedRows(items, sort);
  }, [container, day, portfolio.data, saved.data, sort, typeFilter]);

  function toggleSelected(assetId: string) {
    setSelected((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  }

  async function archive(row: SavedRow) {
    if (pendingId) return;
    setPendingId(row.asset.id);
    try {
      await runMutation(container, () => container.savedIdeas.archive(row.asset.id));
      await trackEvent(container, "saved_idea_archived", { asset_id: row.asset.id });
      await lightHaptic(container);
      setSelected((current) => current.filter((id) => id !== row.asset.id));
    } finally {
      setPendingId(null);
    }
  }

  async function restore(row: SavedRow) {
    if (pendingId || !row.currentPrice) return;
    setPendingId(row.asset.id);
    try {
      await runMutation(container, () =>
        container.savedIdeas.save(row.asset.id, createId("restore")),
      );
      await trackEvent(container, "saved_idea_restored", { asset_id: row.asset.id });
      await successHaptic(container);
    } finally {
      setPendingId(null);
    }
  }

  function allocate(ids: string[]) {
    if (!ids.length) return;
    router.push({
      pathname: "/allocate",
      params: { assetIds: ids.join(",") },
    });
  }

  function share(row: SavedRow) {
    if (!row.funded && state === "archived") return;
    router.push({
      pathname: "/share/[kind]",
      params: { kind: row.funded ? "position" : "idea", id: row.asset.id },
    });
  }

  return (
    <Page
      contentStyle={[
        styles.pageContent,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <ScreenHeader
        title="Saved"
      />
      {settings.sampleJourney ? (
        <InlineNotice>
          <AppText variant="small" color={palette.accent}>
            Sample journey — not your track record
          </AppText>
        </InlineNotice>
      ) : null}
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Saved idea status"
        style={[styles.segmented, { backgroundColor: palette.surfaceRaised }]}
      >
        {(["active", "archived"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={value === "active" ? "Active" : "Archived"}
            accessibilityState={{ selected: state === value }}
            accessibilityHint={
              value === "active"
                ? "Show saved ideas you are currently tracking"
                : "Show saved ideas you archived"
            }
            onPress={() => {
              setState(value);
              setSelected([]);
            }}
            style={[
              styles.segmentButton,
              state === value && { backgroundColor: palette.accent },
            ]}
          >
            <AppText
              variant="label"
              color={state === value ? palette.background : palette.text}
            >
              {value === "active" ? "Active" : "Archived"}
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterRow}>
        <AppText variant="small" color={palette.textMuted}>
          Sort
        </AppText>
        <ScrollView
          horizontal
          style={styles.chipScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SORTS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              accessibilityLabel={`Sort by ${item.label}`}
              selected={sort === item.value}
              accessibilityHint={`Sort saved ideas by ${item.label.toLowerCase()}`}
              onPress={() => setSort(item.value)}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        horizontal
        style={styles.chipScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TYPES.map((item) => (
          <Chip
            key={item.label}
            label={item.label}
            selected={typeFilter === item.value}
            accessibilityHint={`Filter saved ideas by ${item.label.toLowerCase()}`}
            onPress={() => setTypeFilter(item.value)}
          />
        ))}
      </ScrollView>

      {state === "active" && selected.length ? (
        <Panel style={styles.multiSelectBar}>
          <AppText variant="small">
            {selected.length} idea{selected.length === 1 ? "" : "s"} selected
          </AppText>
          <ActionButton
            accessibilityLabel="Allocate selected ideas"
            accessibilityHint="Choose paper amounts for the selected ideas"
            onPress={() => allocate(selected)}
          >
            Allocate selected
          </ActionButton>
        </Panel>
      ) : null}

      {saved.loading && !saved.data ? (
        <Panel>
          <AppText variant="body" color={palette.textSecondary}>
            Loading saved ideas…
          </AppText>
        </Panel>
      ) : rows.length ? (
        rows.map((row) => (
          <SavedRowCard
            key={row.saved.id}
            row={row}
            selected={selected.includes(row.asset.id)}
            canSelect={state === "active"}
            pending={pendingId === row.asset.id}
            onSelect={() => toggleSelected(row.asset.id)}
            onDetails={() =>
              router.push({
                pathname: "/asset/[id]",
                params: { id: row.asset.id },
              })
            }
            onAllocate={() => allocate([row.asset.id])}
            onShare={() => share(row)}
            onArchive={() =>
              state === "active" ? void archive(row) : void restore(row)
            }
          />
        ))
      ) : (
        <Panel style={styles.empty}>
          <AppText variant="title">
            {state === "active" ? "Nothing saved yet." : "No archived ideas."}
          </AppText>
          <AppText variant="body" color={palette.textSecondary}>
            {state === "active"
              ? "Swipe right on an idea in Discover to keep its price and watch the result unfold."
              : "Archived ideas keep their history. Restore one when you want to track it again."}
          </AppText>
          {state === "active" ? (
            <ActionButton
              accessibilityLabel="Go discover ideas"
              onPress={() => router.replace("/(tabs)")}
            >
              Discover ideas
            </ActionButton>
          ) : null}
        </Panel>
      )}
      {saved.error ? <InlineNotice>{saved.error.message}</InlineNotice> : null}
    </Page>
  );
}

function SavedRowCard({
  row,
  selected,
  canSelect,
  pending,
  onSelect,
  onDetails,
  onAllocate,
  onShare,
  onArchive,
}: {
  row: SavedRow;
  selected: boolean;
  canSelect: boolean;
  pending: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onAllocate: () => void;
  onShare: () => void;
  onArchive: () => void;
}) {
  const palette = usePalette();
  const typeLabel = TYPE_LABELS[row.asset.type];
  const themeLabel = THEME_LABELS[row.asset.themes[0]];
  const returnColor =
    row.returnValue === null
      ? palette.textSecondary
      : row.returnValue.startsWith("-")
        ? palette.negative
        : row.returnValue === "0"
          ? palette.textSecondary
          : palette.positive;
  return (
    <Panel style={styles.rowCard}>
      <View style={styles.rowHeader}>
        {canSelect ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Select ${row.asset.ticker} for allocation`}
            accessibilityState={{ checked: selected }}
            onPress={onSelect}
            style={styles.checkbox}
          >
            <AppText variant="title" color={selected ? palette.accent : palette.textMuted}>
              {selected ? "☑" : "□"}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${row.asset.name} details`}
          testID={`saved-idea-${row.asset.id}`}
          onPress={onDetails}
          style={styles.identity}
        >
          <View style={[styles.icon, { backgroundColor: row.asset.iconColor }]}>
            <AppText variant="label" color="#10130D">
              {row.asset.iconInitials}
            </AppText>
          </View>
          <View style={styles.identityCopy}>
            <AppText variant="label">{row.asset.name}</AppText>
            <AppText variant="small" color={palette.textSecondary}>
              {row.asset.ticker} · {typeLabel}
              {themeLabel === typeLabel ? "" : ` · ${themeLabel}`}
            </AppText>
          </View>
        </Pressable>
      </View>
      <View style={styles.dataGrid}>
        <SavedData label="Saved" value={`${formatDate(row.saved.savedAt)} · ${formatPrice(row.saved.savedPrice)}`} />
        <SavedData
          label="Current"
          value={row.currentPrice ? formatPrice(row.currentPrice) : "Unavailable"}
        />
        <SavedData
          label="Since save"
          value={row.returnValue ? formatPercent(row.returnValue) : "Unavailable"}
          color={returnColor}
        />
        <SavedData
          label="Allocation"
          value={
            row.funded
              ? row.fundedAmount
                ? `Funded ${formatMoney(row.fundedAmount)}`
                : "Funded"
              : "Not funded"
          }
          color={row.funded ? palette.accent : palette.textSecondary}
        />
      </View>
      {row.stale ? <Chip label="Stale valuation" /> : null}
      <View style={styles.actions}>
        <ActionButton
          variant="quiet"
          disabled={pending}
          accessibilityLabel={`View ${row.asset.ticker} details`}
          onPress={onDetails}
          style={styles.smallAction}
        >
          Details
        </ActionButton>
        {!row.funded ? (
          <ActionButton
            variant="secondary"
            disabled={pending}
            accessibilityLabel={`Allocate ${row.asset.ticker}`}
            onPress={onAllocate}
            style={styles.smallAction}
          >
            Allocate
          </ActionButton>
        ) : null}
        <ActionButton
          variant="quiet"
          disabled={pending || (!row.funded && row.saved.state === "archived")}
          accessibilityLabel={`Share ${row.asset.ticker} result`}
          onPress={onShare}
          style={styles.smallAction}
        >
          Share
        </ActionButton>
        <ActionButton
          variant="quiet"
          loading={pending}
          accessibilityLabel={
            row.saved.state === "active"
              ? `Archive ${row.asset.ticker}`
              : `Restore ${row.asset.ticker}`
          }
          onPress={onArchive}
          style={styles.smallAction}
        >
          {row.saved.state === "active" ? "Archive" : "Restore"}
        </ActionButton>
      </View>
    </Panel>
  );
}

function SavedData({
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
    <View style={styles.savedData}>
      <AppText variant="label" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="small" color={color ?? palette.text}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: { gap: 12, paddingTop: 12 },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 15,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  multiSelectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowCard: { gap: 14 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    width: 42,
    minHeight: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: { flex: 1, gap: 3 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  savedData: { flexGrow: 1, flexBasis: "42%", gap: 3 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  smallAction: { flexGrow: 1, flexBasis: "22%", minHeight: 44, paddingHorizontal: 9 },
  empty: { gap: 12 },
});
