import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
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
import { formatDate, formatPrice } from "@/domain/format";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  Chip,
  Field,
  IconButton,
  InlineNotice,
  Page,
  Panel,
  ScreenHeader,
  Segmented,
  useLargeText,
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
  const [themesOpen, setThemesOpen] = useState(false);
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
  const largeText = useLargeText();
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
        const actionResult = await runMutation(container, async () => {
          if (direction === "save") {
            return {
              direction,
              saved: await container.savedIdeas.save(
                assetId,
                actionId,
                getFilterKey(filters),
              ),
            } as const;
          }
          await container.deck.pass(assetId, actionId, filters);
          return { direction } as const;
        });
        setUndoAvailable(true);
        await trackEvent(container, direction === "save" ? "idea_saved" : "idea_passed", {
          asset_id: assetId,
          filter_key: getFilterKey(filters),
        });
        if (actionResult.direction === "save") {
          await successHaptic(container);
          const { savedIdea, disposition } = actionResult.saved;
          setToast(
            disposition === "restored"
              ? `Back in Saved · tracking from ${formatPrice(savedIdea.savedPrice)} since ${formatDate(savedIdea.savedAt)}`
              : `Price tracked from here · ${formatPrice(savedIdea.savedPrice)}`,
          );
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

  const filterChips = (
    <>
      {TYPES.map((filter) => (
        <Chip
          key={filter.label}
          label={filter.label}
          selected={typeFilter === filter.value}
          accessibilityHint={`Filter the discovery deck by ${filter.label.toLowerCase()}`}
          onPress={() => setTypeFilter(filter.value)}
        />
      ))}
      <Chip
        label={themeFilter ? THEME_LABELS[themeFilter] : "Themes"}
        accessibilityLabel={
          themeFilter
            ? `Theme filter: ${THEME_LABELS[themeFilter]}`
            : "Choose a theme"
        }
        accessibilityHint="Open theme filters"
        selected={themeFilter !== null}
        onPress={() => setThemesOpen(true)}
      />
    </>
  );

  return (
    <Page
      scrollable={largeText || Boolean(search.trim())}
      contentStyle={largeText || search.trim() ? styles.scrollContent : styles.screenContent}
    >
      <ScreenHeader
        title="Discover"
        right={
          <View style={styles.headerActions}>
            <IconButton
              icon={searchOpen ? "close" : "magnify"}
              accessibilityLabel="Search ideas"
              accessibilityHint="Show search for all ideas, including passed ideas"
              onPress={() => {
                if (searchOpen) closeSearch();
                else setSearchOpen(true);
              }}
            />
            <IconButton
              icon="cog-outline"
              accessibilityLabel="Open Settings"
              accessibilityHint="Change app preferences and demo controls"
              onPress={() => router.push("/settings")}
            />
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
          <Segmented
            accessibilityLabel="Deck mode"
            options={MODES.map((item) => ({
              value: item.value,
              label: item.label,
              accessibilityLabel: `${item.label} deck`,
            }))}
            value={mode}
            onChange={setMode}
          />

          {largeText ? (
            <View style={styles.filterWrap}>{filterChips}</View>
          ) : (
            <ScrollView
              horizontal
              style={styles.chipScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {filterChips}
            </ScrollView>
          )}

          {activeIdeas.data && activeIdeas.data.length >= 3 && !ctaDismissed ? (
            <View
              style={[
                styles.allocationCta,
                largeText && styles.allocationCtaLarge,
                { backgroundColor: palette.surface },
              ]}
            >
              <AppText
                variant="small"
                numberOfLines={largeText ? 2 : 1}
                style={[styles.ctaText, largeText && styles.ctaTextLarge]}
              >
                Build my paper portfolio
              </AppText>
              <View style={largeText ? styles.ctaActionsLarge : styles.ctaActions}>
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
            <Pressable
              testID="discover-pass"
              accessibilityRole="button"
              accessibilityLabel={`Pass on ${current?.asset.ticker ?? "idea"}`}
              accessibilityHint="Remove this idea from your current deck"
              accessibilityState={{ disabled: pending || !current }}
              disabled={pending || !current}
              onPress={() => void performAction("pass")}
              style={({ pressed }) => [
                styles.roundAction,
                {
                  backgroundColor: palette.surfaceRaised,
                  opacity: pending || !current ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={palette.negative}
                accessible={false}
              />
            </Pressable>
            <Pressable
              testID="discover-undo"
              accessibilityRole="button"
              accessibilityLabel="Undo last deck action"
              accessibilityHint="Undo the most recent save or pass if it is still eligible"
              accessibilityState={{ disabled: pending || !undoAvailable }}
              disabled={pending || !undoAvailable}
              onPress={() => void undoLatest()}
              style={({ pressed }) => [
                styles.undoAction,
                {
                  backgroundColor: palette.surface,
                  opacity: pending || !undoAvailable ? 0.35 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="undo-variant"
                size={20}
                color={palette.textSecondary}
                accessible={false}
              />
            </Pressable>
            <Pressable
              testID="discover-save"
              accessibilityRole="button"
              accessibilityLabel={`Save ${current?.asset.ticker ?? "idea"}`}
              accessibilityHint={
                currentData?.displayPrice
                  ? `Track the current demo price of ${formatPrice(currentData.displayPrice)}`
                  : "Saving is disabled because no price is available"
              }
              accessibilityState={{
                disabled: pending || !current || currentData?.displayPrice === null,
              }}
              disabled={pending || !current || currentData?.displayPrice === null}
              onPress={() => void performAction("save")}
              style={({ pressed }) => [
                styles.roundAction,
                {
                  backgroundColor: palette.accent,
                  opacity:
                    pending || !current || currentData?.displayPrice === null
                      ? 0.4
                      : pressed
                        ? 0.8
                        : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="heart"
                size={26}
                color="#10130D"
                accessible={false}
              />
            </Pressable>
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
      <Modal
        visible={themesOpen}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setThemesOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close theme filters"
          onPress={() => setThemesOpen(false)}
          style={styles.sheetScrim}
        />
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={styles.sheetHeader}>
            <AppText variant="headline">Themes</AppText>
            <ActionButton
              variant="quiet"
              accessibilityLabel="Done choosing themes"
              onPress={() => setThemesOpen(false)}
              style={styles.sheetDone}
            >
              Done
            </ActionButton>
          </View>
          <View style={styles.themeGrid}>
            <Chip
              label="All themes"
              selected={themeFilter === null}
              onPress={() => {
                setThemeFilter(null);
                setThemesOpen(false);
              }}
            />
            {THEMES.map((theme) => (
              <Chip
                key={theme}
                label={THEME_LABELS[theme]}
                selected={themeFilter === theme}
                accessibilityHint={`Filter ideas by ${THEME_LABELS[theme]}`}
                onPress={() => {
                  setThemeFilter((selected) => (selected === theme ? null : theme));
                  setThemesOpen(false);
                }}
              />
            ))}
          </View>
        </View>
      </Modal>
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
              <AppText
                variant="label"
                color="#10130D"
                maxFontSizeMultiplier={1}
              >
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
    gap: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  scrollContent: { gap: 20, paddingTop: 8, paddingBottom: 40 },
  headerActions: { flexDirection: "row", gap: 8 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchField: { flex: 1 },
  clearButton: { minWidth: 48, paddingHorizontal: 8 },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
    gap: 7,
    alignItems: "center",
    paddingVertical: 2,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  allocationCta: {
    minHeight: 44,
    borderRadius: 14,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ctaText: { flex: 1 },
  allocationCtaLarge: {
    minHeight: 0,
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  ctaTextLarge: { flex: 0 },
  ctaActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  ctaActionsLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  ctaButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  deckArea: { minHeight: 280 },
  deckAreaFill: { flex: 1, minHeight: 0 },
  deckAreaLarge: { minHeight: 640 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  roundAction: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  undoAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetDone: { minHeight: 44, paddingHorizontal: 8 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
