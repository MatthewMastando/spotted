import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  PixelRatio,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { AssetFixture, ThemeId } from "@/domain/types";
import type { DeckFilters, DeckMode } from "@/domain/deck";
import { MIN_HISTORY_DAY } from "@/domain/time";
import { getFilterKey } from "@/services/deckService";
import { createId } from "@/services/ids";
import { formatPrice } from "@/domain/format";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  Chip,
  Field,
  InlineNotice,
  Page,
  Panel,
  ScreenHeader,
} from "@/components/ui";
import type { AssetCardData } from "./AssetCard";
import { THEME_LABELS } from "@/domain/themeLabels";
import { TYPE_LABELS } from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { lightHaptic, successHaptic } from "@/services/haptics";
import { runMutation, useAppStore } from "@/state/appStore";
import { useDeck, useSavedIdeas, useSettings } from "@/state/hooks";
import { useReducedMotion } from "@/state/accessibility";
import { trackEvent } from "@/services/track";
import { DeckGestureStack } from "./DeckGestureStack";

const MODES: { value: DeckMode; label: string }[] = [
  { value: "for_you", label: "For you" },
  { value: "trending", label: "Trending" },
  { value: "explore", label: "Explore" },
];
const TYPES: { value: AssetFixture["type"] | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];
const THEMES = Object.keys(THEME_LABELS) as ThemeId[];

export function DiscoverScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<DeckMode>("for_you");
  const [typeFilter, setTypeFilter] = useState<AssetFixture["type"] | null>(
    null,
  );
  const [themeFilter, setThemeFilter] = useState<ThemeId | null>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [ctaDismissed, setCtaDismissed] = useState(false);
  const [deckHeight, setDeckHeight] = useState(0);
  const [passedIds, setPassedIds] = useState<string[]>([]);
  const pendingRef = useRef(false);
  const gestureCommitRef = useRef(false);
  const dataVersion = useAppStore((state) => state.dataVersion);
  const filters: DeckFilters = useMemo(
    () => ({
      type: typeFilter ?? undefined,
      theme: themeFilter ?? undefined,
    }),
    [themeFilter, typeFilter],
  );
  const deck = useDeck(mode, filters);
  const activeIdeas = useSavedIdeas("active");
  const current = deck.data?.[0] ?? null;
  const next = deck.data?.[1] ?? null;
  const day = settings.clock.dayOffset;
  const largeText = PixelRatio.getFontScale() > 1.35;
  const showSparkline = largeText || deckHeight >= 430;
  const showThesis = largeText || deckHeight >= 350;

  const currentData = useMemo<AssetCardData | null>(() => {
    if (!current) return null;
    const assetId = current.asset.id;
    const quote = container.market.getQuote(assetId, day);
    return {
      quote,
      displayPrice:
        quote.price ?? container.market.getLastValidPrice(assetId, day),
      history: container.market.getHistory(
        assetId,
        Math.max(MIN_HISTORY_DAY, day - 30),
        day,
      ),
      social: container.social.getSnapshot(assetId, day),
    };
  }, [container, current, day]);

  const searchResults = search.trim()
    ? container.assets.search(search.trim())
    : [];
  const visibleSearchResults = searchResults.filter(
    (asset) =>
      (!typeFilter || asset.type === typeFilter) &&
      (!themeFilter || asset.themes.includes(themeFilter)),
  );
  const savedIds = new Set(
    activeIdeas.data?.map((idea) => idea.assetId) ?? [],
  );

  useEffect(() => {
    void trackEvent(container, "deck_viewed", {
      mode,
      asset_type: typeFilter ?? "all",
      theme: themeFilter,
    });
  }, [container, mode, themeFilter, typeFilter]);

  useEffect(() => {
    let active = true;
    void container.savedIdeas.passedIds(getFilterKey(filters)).then(
      (ids) => {
        if (active) setPassedIds(ids);
      },
      () => {
        if (active) setPassedIds([]);
      },
    );
    return () => {
      active = false;
    };
  }, [container, dataVersion, filters]);

  useEffect(() => {
    let active = true;
    void container.savedIdeas.hasUndoableAction().then((available) => {
      if (active) setUndoAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [container, dataVersion]);

  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast);
    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const openDetails = useCallback(
    async (assetId: string) => {
      router.push({ pathname: "/asset/[id]", params: { id: assetId } });
    },
    [router],
  );

  const performAction = useCallback(
    async (
      direction: "save" | "pass",
      assetId = current?.asset.id,
      fromGesture = false,
    ) => {
      if (!assetId) return;
      if (fromGesture) {
        if (!pendingRef.current || gestureCommitRef.current) return;
        gestureCommitRef.current = true;
      } else if (pendingRef.current) {
        return;
      } else {
        pendingRef.current = true;
        setPending(true);
      }
      setToast(null);
      const actionId = createId("deck");
      const quote = container.market.getQuote(assetId, container.clock.today());
      const capturedPrice =
        quote.price ??
        container.market.getLastValidPrice(assetId, container.clock.today());

      try {
        if (direction === "save" && capturedPrice === null) {
          throw new Error("This idea has no available price to track yet.");
        }
        await runMutation(container, async () => {
          if (direction === "save") {
            await container.savedIdeas.save(
              assetId,
              actionId,
              getFilterKey(filters),
            );
          } else {
            await container.deck.pass(assetId, actionId, filters);
          }
        });
        setUndoAvailable(true);
        await trackEvent(container, direction === "save" ? "idea_saved" : "idea_passed", {
          asset_id: assetId,
          filter_key: getFilterKey(filters),
        });
        if (direction === "save") {
          await successHaptic(container);
          setToast(`Price tracked from here · ${formatPrice(capturedPrice)}`);
        } else {
          await lightHaptic(container);
          setToast(`Passed ${container.assets.getDetails(assetId)?.ticker ?? "idea"}.`);
        }
      } catch (reason) {
        setToast(
          reason instanceof Error ? reason.message : "That action could not be saved.",
        );
      } finally {
        pendingRef.current = false;
        gestureCommitRef.current = false;
        setPending(false);
      }
    },
    [container, current?.asset.id, filters],
  );

  const beginGestureAction = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    gestureCommitRef.current = false;
    setPending(true);
  }, []);

  const undoLatest = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const result = await runMutation(container, () =>
        container.savedIdeas.undoLatest(),
      );
      setUndoAvailable(await container.savedIdeas.hasUndoableAction());
      if (result.undone) {
        await trackEvent(container, "undo");
        await lightHaptic(container);
        setToast("Last action undone.");
      } else {
        setToast(result.reason ?? "There is no recent action to undo.");
      }
    } catch (reason) {
      setToast(
        reason instanceof Error ? reason.message : "Unable to undo the last action.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [container]);

  async function reviewPassed() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await runMutation(container, () =>
        container.deck.reviewPassedIdeas(filters),
      );
      await trackEvent(container, "passed_ideas_reviewed", {
        filter_key: getFilterKey(filters),
      });
      setToast("Passed ideas are back in this deck.");
    } catch (reason) {
      setToast(
        reason instanceof Error ? reason.message : "Unable to review passed ideas.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function closeSearch() {
    setSearch("");
    setSearchOpen(false);
  }

  return (
    <Page
      scrollable={largeText || Boolean(search.trim())}
      contentStyle={largeText || search.trim() ? styles.scrollContent : styles.screenContent}
    >
      <ScreenHeader
        title="Discover"
        demoInline
        right={
          <View style={styles.headerActions}>
            <ActionButton
              variant="secondary"
              accessibilityLabel="Search ideas"
              accessibilityHint="Show search for all ideas, including passed ideas"
              onPress={() => {
                if (searchOpen) closeSearch();
                else setSearchOpen(true);
              }}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name={searchOpen ? "close" : "magnify"}
                size={22}
                color={palette.text}
                accessible={false}
              />
            </ActionButton>
            <ActionButton
              variant="secondary"
              accessibilityLabel="Open Settings"
              accessibilityHint="Change app preferences and demo controls"
              onPress={() => router.push("/settings")}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={palette.text}
                accessible={false}
              />
            </ActionButton>
          </View>
        }
      />

      {searchOpen ? (
        <View style={styles.searchInputRow}>
          <Field
            label="Search by name, ticker, or theme"
            accessibilityHint="Search all demo assets, including ideas you have passed"
            placeholder="Try NVDA, broad market, or crypto"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            style={styles.searchField}
          />
          {search.length ? (
            <ActionButton
              variant="quiet"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              style={styles.clearButton}
            >
              Clear
            </ActionButton>
          ) : null}
        </View>
      ) : null}

      {search.trim() ? (
        <SearchResults
          assets={visibleSearchResults}
          savedIds={savedIds}
          passedIds={passedIds}
          onPress={(asset) => void openDetails(asset.id)}
        />
      ) : (
        <>
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Deck mode"
            style={[styles.modeGroup, { backgroundColor: palette.surfaceRaised }]}
          >
            {MODES.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} deck`}
                accessibilityState={{ selected: mode === item.value }}
                onPress={() => setMode(item.value)}
                style={[
                  styles.modeButton,
                  mode === item.value && { backgroundColor: palette.accent },
                ]}
              >
                <AppText
                  variant="label"
                  color={mode === item.value ? palette.background : palette.text}
                >
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          <ScrollView
            horizontal
            style={styles.chipScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {TYPES.map((filter) => (
              <Chip
                key={filter.label}
                label={filter.label}
                selected={typeFilter === filter.value}
                accessibilityHint={`Filter the discovery deck by ${filter.label.toLowerCase()}`}
                onPress={() => setTypeFilter(filter.value)}
              />
            ))}
            <View style={[styles.filterDivider, { backgroundColor: palette.border }]} />
            {THEMES.map((theme) => (
              <Chip
                key={theme}
                label={THEME_LABELS[theme]}
                selected={themeFilter === theme}
                accessibilityHint={`Filter ideas by ${THEME_LABELS[theme]}`}
                onPress={() =>
                  setThemeFilter((selected) => selected === theme ? null : theme)
                }
              />
            ))}
          </ScrollView>

          {activeIdeas.data && activeIdeas.data.length >= 3 && !ctaDismissed ? (
            <View style={[styles.allocationCta, { borderColor: palette.border }]}>
              <AppText
                variant="small"
                numberOfLines={1}
                style={styles.ctaText}
              >
                Build my paper portfolio
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Build my paper portfolio"
                onPress={() =>
                  router.push({
                    pathname: "/allocate",
                    params: {
                      assetIds: (activeIdeas.data ?? [])
                        .map((idea) => idea.assetId)
                        .join(","),
                    },
                  })
                }
                style={styles.ctaButton}
              >
                <AppText variant="small" color={palette.accent}>
                  Build
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Not now"
                onPress={() => setCtaDismissed(true)}
                style={styles.ctaButton}
              >
                <AppText variant="small" color={palette.textSecondary}>
                  Not now
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View
            onLayout={(event) =>
              setDeckHeight(event.nativeEvent.layout.height)
            }
            style={[
              styles.deckArea,
              largeText ? styles.deckAreaLarge : styles.deckAreaFill,
              { overflow: largeText ? "visible" : "hidden" },
            ]}
          >
            {deck.error ? (
              <InlineNotice>{deck.error.message}</InlineNotice>
            ) : null}
            {deck.loading && !current ? (
              <Panel>
                <AppText variant="body" color={palette.textSecondary}>
                  Finding ideas for your deck…
                </AppText>
              </Panel>
            ) : current && currentData ? (
              <DeckGestureStack
                current={current}
                next={next}
                data={currentData}
                reason={current.reason}
                locked={pending}
                reducedMotion={reducedMotion}
                canSave={currentData.displayPrice !== null}
                showSparkline={showSparkline}
                showThesis={showThesis}
                clipContent={!largeText}
                onSwipeStart={beginGestureAction}
                onSwipeAction={(assetId, direction) =>
                  void performAction(direction, assetId, true)
                }
                onDetails={() => void openDetails(current.asset.id)}
              />
            ) : (
              <Panel style={styles.emptyPanel}>
                <AppText variant="title">You’re all caught up.</AppText>
                <AppText variant="body" color={palette.textSecondary}>
                  Try another class or theme, or bring passed ideas back into this
                  deck.
                </AppText>
                <View style={styles.emptyActions}>
                  <ActionButton
                    variant="secondary"
                    accessibilityLabel="Review passed ideas"
                    accessibilityHint="Restore passed ideas to this filtered deck"
                    disabled={pending}
                    onPress={() => void reviewPassed()}
                  >
                    Review passed ideas
                  </ActionButton>
                  <ActionButton
                    variant="quiet"
                    accessibilityLabel="Clear discovery filters"
                    onPress={() => {
                      setTypeFilter(null);
                      setThemeFilter(null);
                      setMode("for_you");
                    }}
                  >
                    Change filters
                  </ActionButton>
                </View>
              </Panel>
            )}
          </View>

          <View style={styles.actionRow}>
            <ActionButton
              variant="secondary"
              testID="discover-pass"
              accessibilityLabel={`Pass on ${current?.asset.ticker ?? "idea"}`}
              accessibilityHint="Remove this idea from your current deck"
              disabled={pending || !current}
              onPress={() => void performAction("pass")}
              style={styles.actionButton}
            >
              Pass · ✕
            </ActionButton>
            <ActionButton
              variant="secondary"
              testID="discover-undo"
              accessibilityLabel="Undo last deck action"
              accessibilityHint="Undo the most recent save or pass if it is still eligible"
              disabled={pending || !undoAvailable}
              onPress={() => void undoLatest()}
              style={styles.undoButton}
            >
              <MaterialCommunityIcons
                name="undo-variant"
                size={21}
                color={palette.text}
                accessible={false}
              />
            </ActionButton>
            <ActionButton
              testID="discover-save"
              accessibilityLabel={`Save ${current?.asset.ticker ?? "idea"}`}
              accessibilityHint={
                currentData?.displayPrice
                  ? `Track the current demo price of ${formatPrice(currentData.displayPrice)}`
                  : "Saving is disabled because no price is available"
              }
              disabled={pending || !current || currentData?.displayPrice === null}
              onPress={() => void performAction("save")}
              style={styles.actionButton}
            >
              Save · ♥
            </ActionButton>
          </View>
          {currentData?.displayPrice === null ? (
            <AppText variant="small" color={palette.textSecondary}>
              This idea cannot be saved until a price becomes available.
            </AppText>
          ) : null}
        </>
      )}
      {toast ? (
        <InlineNotice pointerEvents="none" style={styles.toast}>
          <AppText
            variant="small"
            accessibilityLiveRegion="polite"
            testID="discover-action-toast"
          >
            {toast}
          </AppText>
        </InlineNotice>
      ) : null}
      {activeIdeas.error ? (
        <InlineNotice>{activeIdeas.error.message}</InlineNotice>
      ) : null}
    </Page>
  );
}

function SearchResults({
  assets,
  savedIds,
  passedIds,
  onPress,
}: {
  assets: AssetFixture[];
  savedIds: Set<string>;
  passedIds: string[];
  onPress: (asset: AssetFixture) => void;
}) {
  const palette = usePalette();
  return (
    <Panel style={styles.searchPanel}>
      <AppText variant="label" color={palette.textSecondary}>
        {assets.length} SEARCH RESULT{assets.length === 1 ? "" : "S"} · PASSED
        IDEAS INCLUDED
      </AppText>
      {assets.length ? (
        assets.map((asset) => (
          <Pressable
            key={asset.id}
            accessibilityRole="button"
            accessibilityLabel={`${asset.name}, ${asset.ticker}, ${TYPE_LABELS[asset.type]}${passedIds.includes(asset.id) ? ", previously passed" : ""}`}
            accessibilityHint="Open asset details"
            onPress={() => onPress(asset)}
            style={[styles.searchResult, { borderTopColor: palette.border }]}
          >
            <View
              style={[
                styles.searchIcon,
                { backgroundColor: asset.iconColor },
              ]}
            >
              <AppText variant="label" color="#10130D">
                {asset.iconInitials}
              </AppText>
            </View>
            <View style={styles.searchCopy}>
              <AppText variant="label">{asset.name}</AppText>
              <AppText variant="small" color={palette.textSecondary}>
                {asset.ticker} · {TYPE_LABELS[asset.type]} ·{" "}
                {THEME_LABELS[asset.themes[0]]}
              </AppText>
            </View>
            {savedIds.has(asset.id) ? <Chip label="Saved" /> : null}
            {passedIds.includes(asset.id) ? <Chip label="Passed" /> : null}
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={palette.textMuted}
              accessible={false}
            />
          </Pressable>
        ))
      ) : (
        <AppText variant="body" color={palette.textSecondary}>
          No matches. Try another company, ticker, or theme.
        </AppText>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  scrollContent: { gap: 12, paddingTop: 10, paddingBottom: 32 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 48, minHeight: 48, paddingHorizontal: 0 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchField: { flex: 1 },
  clearButton: { minWidth: 48, paddingHorizontal: 8 },
  modeGroup: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 8, alignItems: "center", paddingVertical: 2 },
  filterDivider: { width: 1, height: 24, marginHorizontal: 3 },
  allocationCta: {
    minHeight: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: { flex: 1 },
  ctaButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  deckArea: { minHeight: 280 },
  deckAreaFill: { flex: 1, minHeight: 0 },
  deckAreaLarge: { minHeight: 640 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionButton: { flex: 1, minHeight: 52 },
  undoButton: {
    width: 52,
    height: 52,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 0,
  },
  emptyPanel: { gap: 12, marginTop: 10 },
  emptyActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 70,
    zIndex: 10,
    borderRadius: 14,
  },
  searchPanel: { gap: 12 },
  searchResult: {
    minHeight: 62,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchIcon: {
    width: 40,
    minHeight: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  searchCopy: { flex: 1, gap: 3 },
});
