import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AssetFixture, SavedIdea } from "@/domain/types";
import { formatDate, formatMoney, formatPercent, formatPrice } from "@/domain/format";
import { returnSinceSave } from "@/domain/returns";
import { socialAttention } from "@/domain/social";
import { usePalette } from "@/design/theme";
import { useReducedMotion } from "@/state/accessibility";
import {
  ActionButton,
  AppText,
  Chip,
  IconButton,
  InlineNotice,
  ListGroup,
  ListRow,
  Page,
  Segmented,
  ScreenHeader,
} from "@/components/ui";
import { TYPE_LABELS } from "@/features/common/labels";
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
  const reducedMotion = useReducedMotion();
  const settings = useSettings() ?? container.getSettings();
  const [state, setState] = useState<"active" | "archived">("active");
  const [sort, setSort] = useState<SortMode>("newest");
  const [typeFilter, setTypeFilter] = useState<AssetFixture["type"] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [menuRow, setMenuRow] = useState<SavedRow | null>(null);
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

  const sortLabel = SORTS.find((item) => item.value === sort)?.label ?? "Newest";

  return (
    <>
      <Page
        contentStyle={styles.pageContent}
        footer={
          state === "active" && selected.length ? (
            <View style={styles.selectionFooter}>
              <AppText variant="small" color={palette.textSecondary}>
                {selected.length} idea{selected.length === 1 ? "" : "s"} selected
              </AppText>
              <ActionButton
                accessibilityLabel="Allocate selected ideas"
                accessibilityHint="Choose paper amounts for the selected ideas"
                onPress={() => allocate(selected)}
                style={styles.selectionAction}
              >
                Allocate selected
              </ActionButton>
            </View>
          ) : undefined
        }
      >
        <ScreenHeader title="Saved" />
        {settings.sampleJourney ? (
          <AppText variant="caption" color={palette.textSecondary}>
            Sample journey — not your track record
          </AppText>
        ) : null}
        <Segmented
          accessibilityLabel="Saved idea status"
          value={state}
          onChange={(value) => {
            setState(value);
            setSelected([]);
          }}
          options={[
            {
              value: "active",
              label: "Active",
              accessibilityLabel: "Active",
              accessibilityHint: "Show saved ideas you are currently tracking",
            },
            {
              value: "archived",
              label: "Archived",
              accessibilityLabel: "Archived",
              accessibilityHint: "Show saved ideas you archived",
            },
          ]}
        />
        <View style={styles.sortRow}>
          <Chip
            label={`Sort: ${sortLabel}`}
            accessibilityLabel={`Sort by ${sortLabel}`}
            accessibilityHint="Choose how saved ideas are sorted"
            onPress={() => setSortOpen(true)}
          />
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

        {saved.loading && !saved.data ? (
          <AppText variant="small" color={palette.textSecondary}>
            Loading saved ideas…
          </AppText>
        ) : rows.length ? (
          <ListGroup>
            {rows.map((row, index) => (
              <SavedRowCard
                key={row.saved.id}
                row={row}
                first={index === 0}
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
                onMenu={() => setMenuRow(row)}
              />
            ))}
          </ListGroup>
        ) : (
          <View style={styles.empty}>
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
          </View>
        )}
        {saved.error ? <InlineNotice>{saved.error.message}</InlineNotice> : null}
      </Page>

      <Modal
        visible={sortOpen || menuRow !== null}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => {
          setSortOpen(false);
          setMenuRow(null);
        }}
      >
        <View style={styles.sheetScrim}>
          <Pressable
            accessible={false}
            onPress={() => {
              setSortOpen(false);
              setMenuRow(null);
            }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surface,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {sortOpen ? (
              <>
                <AppText variant="title">Sort saved ideas</AppText>
                <ListGroup>
                  {SORTS.map((item, index) => (
                    <ListRow
                      key={item.value}
                      first={index === 0}
                      title={item.label}
                      accessibilityLabel={`Sort by ${item.label}`}
                      accessibilityHint={`Sort saved ideas by ${item.label.toLowerCase()}`}
                      onPress={() => {
                        setSort(item.value);
                        setSortOpen(false);
                      }}
                      trailing={
                        sort === item.value ? (
                          <MaterialCommunityIcons
                            name="check"
                            size={20}
                            color={palette.text}
                            accessible={false}
                          />
                        ) : null
                      }
                    />
                  ))}
                </ListGroup>
              </>
            ) : menuRow ? (
              <>
                <AppText variant="title">
                  {menuRow.asset.ticker} actions
                </AppText>
                <ListGroup>
                  {!menuRow.funded ? (
                    <ListRow
                      first
                      title={`Allocate ${menuRow.asset.ticker}`}
                      accessibilityLabel={`Allocate ${menuRow.asset.ticker}`}
                      onPress={() => {
                        const row = menuRow;
                        setMenuRow(null);
                        allocate([row.asset.id]);
                      }}
                      disabled={pendingId === menuRow.asset.id}
                    />
                  ) : null}
                  <ListRow
                    first={menuRow.funded}
                    title={`Share ${menuRow.asset.ticker} result`}
                    accessibilityLabel={`Share ${menuRow.asset.ticker} result`}
                    onPress={() => {
                      const row = menuRow;
                      setMenuRow(null);
                      share(row);
                    }}
                    disabled={
                      pendingId === menuRow.asset.id ||
                      (!menuRow.funded && state === "archived")
                    }
                  />
                  <ListRow
                    first={false}
                    title={
                      menuRow.saved.state === "active"
                        ? `Archive ${menuRow.asset.ticker}`
                        : `Restore ${menuRow.asset.ticker}`
                    }
                    accessibilityLabel={
                      menuRow.saved.state === "active"
                        ? `Archive ${menuRow.asset.ticker}`
                        : `Restore ${menuRow.asset.ticker}`
                    }
                    onPress={() => {
                      const row = menuRow;
                      setMenuRow(null);
                      if (state === "active") {
                        void archive(row);
                      } else {
                        void restore(row);
                      }
                    }}
                    disabled={pendingId === menuRow.asset.id}
                  />
                </ListGroup>
              </>
            ) : null}
            <ActionButton
              variant="quiet"
              accessibilityLabel="Close saved idea menu"
              onPress={() => {
                setSortOpen(false);
                setMenuRow(null);
              }}
            >
              Done
            </ActionButton>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SavedRowCard({
  row,
  first,
  selected,
  canSelect,
  pending,
  onSelect,
  onDetails,
  onMenu,
}: {
  row: SavedRow;
  first: boolean;
  selected: boolean;
  canSelect: boolean;
  pending: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onMenu: () => void;
}) {
  const palette = usePalette();
  const typeLabel = TYPE_LABELS[row.asset.type];
  const returnColor =
    row.returnValue === null
      ? palette.textSecondary
      : row.returnValue.startsWith("-")
        ? palette.negative
        : row.returnValue === "0"
        ? palette.textSecondary
        : palette.positive;
  const savedCaption = [
    `Saved ${formatDate(row.saved.savedAt)} at ${formatPrice(row.saved.savedPrice)}`,
    row.funded
      ? `Funded${row.fundedAmount ? ` ${formatMoney(row.fundedAmount)}` : ""}`
      : "Not funded",
    row.stale ? "Stale valuation" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ListRow
      first={first}
      title={row.asset.name}
      subtitle={
        <View style={styles.rowSubtitle}>
          <AppText variant="small" color={palette.textSecondary}>
            {row.asset.ticker} · {typeLabel}
          </AppText>
          <AppText variant="caption" color={palette.textSecondary}>
            {savedCaption}
          </AppText>
        </View>
      }
      leading={
        <View style={styles.rowLeading}>
          {canSelect ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Select ${row.asset.ticker} for allocation`}
              accessibilityState={{ checked: selected }}
              onPress={(event) => {
                event.stopPropagation();
                onSelect();
              }}
              hitSlop={4}
              style={styles.checkbox}
            >
              <MaterialCommunityIcons
                name={selected ? "checkbox-marked" : "checkbox-blank-outline"}
                size={22}
                color={selected ? palette.text : palette.textMuted}
                accessible={false}
              />
            </Pressable>
          ) : null}
          <View style={[styles.icon, { backgroundColor: row.asset.iconColor }]}>
            <AppText variant="label" color="#10130D">
              {row.asset.iconInitials}
            </AppText>
          </View>
        </View>
      }
      trailing={
        <View style={styles.trailing}>
          <View style={styles.trailingValues}>
            <AppText variant="number" numberOfLines={1}>
              {row.currentPrice ? formatPrice(row.currentPrice) : "Unavailable"}
            </AppText>
            <AppText
              variant="caption"
              color={returnColor}
              numberOfLines={1}
            >
              {row.returnValue === null
                ? "Unavailable"
                : formatPercent(row.returnValue)}
            </AppText>
          </View>
          <IconButton
            icon="dots-horizontal"
            accessibilityLabel={`More actions for ${row.asset.ticker}`}
            disabled={pending}
            onPress={onMenu}
            stopPropagation
          />
        </View>
      }
      onPress={onDetails}
      accessibilityLabel={`Open ${row.asset.name} details`}
      accessibilityHint="Open asset details"
      testID={`saved-idea-${row.asset.id}`}
    />
  );
}

const styles = StyleSheet.create({
  pageContent: { gap: 16, paddingTop: 12 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectionFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectionAction: { flex: 1 },
  rowSubtitle: { gap: 3, flex: 1 },
  rowLeading: { flexDirection: "row", alignItems: "center", gap: 6 },
  checkbox: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trailingValues: {
    minWidth: 66,
    alignItems: "flex-end",
    gap: 2,
  },
  empty: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 12,
    paddingVertical: 56,
  },
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
