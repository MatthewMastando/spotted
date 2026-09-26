import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { formatPrice } from "@/domain/format";
import { usePalette } from "@/design/theme";
import { ActionButton, AppText, Chip, Field, InlineNotice, Page, PageTitle, Panel } from "@/components/ui";
import type { AssetCardData } from "./AssetCard";
import { THEME_LABELS, TYPE_LABELS } from "@/features/common/labels";
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
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  function openSettings() {
    router.push("/settings");
  }

  const closeSearch = () => setSearch("");

  return (
    <Page>
      <PageTitle
        eyebrow="DISCOVER"
        title="Find your next idea"
        subtitle="Explore a synthetic market, one thoughtful swipe at a time."
        trailing={
          <ActionButton
            variant="secondary"
            accessibilityLabel="Open Settings"
            accessibilityHint="Change app preferences and demo controls"
            onPress={openSettings}
            style={styles.gearButton}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={22}
              color={palette.text}
              accessible={false}
            />
          </ActionButton>
        }
      />

      <View style={styles.searchHeading}>
        <AppText variant="label" color={palette.textSecondary}>
          SEARCH THE DEMO UNIVERSE
        </AppText>
        {search.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={closeSearch}
            style={styles.clearButton}
          >
            <AppText variant="small" color={palette.accent}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <Field
        label="Search by name, ticker, or theme"
        accessibilityHint="Search all demo assets, including ideas you have passed"
        placeholder="Try NVDA, broad market, or crypto"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {search.trim() ? (
        <SearchResults
          assets={visibleSearchResults}
          savedIds={savedIds}
          passedIds={passedIds}
          onPress={(asset) => void openDetails(asset.id)}
        />
      ) : (
        <>
          <View style={styles.filterHeading}>
            <AppText variant="label" color={palette.textSecondary}>
              ASSET CLASS
            </AppText>
            <AppText variant="small" color={palette.textMuted}>
              {deck.data?.length ?? 0} ideas
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
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
          </ScrollView>
          <AppText variant="label" color={palette.textSecondary}>
            THEMES
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip
              label="All themes"
              selected={themeFilter === null}
              accessibilityHint="Show every theme"
              onPress={() => setThemeFilter(null)}
            />
            {THEMES.map((theme) => (
              <Chip
                key={theme}
                label={THEME_LABELS[theme]}
                selected={themeFilter === theme}
                accessibilityHint={`Filter ideas by ${THEME_LABELS[theme]}`}
                onPress={() => setThemeFilter(theme)}
              />
            ))}
          </ScrollView>

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
            <>
              <View style={styles.cardStack}>
                <DeckGestureStack
                  current={current}
                  next={next}
                  data={currentData}
                  locked={pending}
                  reducedMotion={reducedMotion}
                  canSave={currentData.displayPrice !== null}
                  onSwipeStart={beginGestureAction}
                  onSwipeAction={(assetId, direction) =>
                    void performAction(direction, assetId, true)
                  }
                  onDetails={() => void openDetails(current.asset.id)}
                />
              </View>
              <Chip label={current.reason} />
              <View style={styles.actionRow}>
                <ActionButton
                  variant="secondary"
                  accessibilityLabel={`Pass on ${current.asset.ticker}`}
                  accessibilityHint="Remove this idea from your current deck"
                  disabled={pending}
                  onPress={() => void performAction("pass")}
                  style={styles.actionButton}
                >
                  Pass · ✕
                </ActionButton>
                <ActionButton
                  accessibilityLabel={`Save ${current.asset.ticker}`}
                  accessibilityHint={
                    currentData.displayPrice
                      ? `Track the current demo price of ${formatPrice(currentData.displayPrice)}`
                      : "Saving is disabled because no price is available"
                  }
                  disabled={pending || currentData.displayPrice === null}
                  onPress={() => void performAction("save")}
                  style={styles.actionButton}
                >
                  Save · ♥
                </ActionButton>
              </View>
              {currentData.displayPrice === null ? (
                <InlineNotice>
                  This idea cannot be saved until a price becomes available.
                </InlineNotice>
              ) : null}
              {activeIdeas.data && activeIdeas.data.length >= 3 ? (
                <Panel style={styles.allocationCta}>
                  <View style={styles.ctaCopy}>
                    <AppText variant="label">READY TO TRY A PAPER PORTFOLIO?</AppText>
                    <AppText variant="small" color={palette.textSecondary}>
                      Put your saved ideas to work in a $10,000 simulated account.
                    </AppText>
                  </View>
                  <ActionButton
                    accessibilityLabel="Build a $10,000 paper portfolio"
                    accessibilityHint="Choose amounts to allocate to your saved ideas"
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
                  >
                    Build my paper portfolio
                  </ActionButton>
                </Panel>
              ) : null}
            </>
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

          <View style={styles.undoRow}>
            <ActionButton
              variant="quiet"
              accessibilityLabel="Undo last deck action"
              accessibilityHint="Undo the most recent save or pass if it is still eligible"
              disabled={pending}
              onPress={() => void undoLatest()}
            >
              ↶ Undo
            </ActionButton>
          </View>
        </>
      )}
      {toast ? (
        <InlineNotice style={styles.toast}>
          <AppText variant="small" accessibilityLiveRegion="polite">
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
  gearButton: { width: 48, minHeight: 48, paddingHorizontal: 0 },
  searchHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  filterHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipRow: { gap: 8, paddingVertical: 2 },
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
  cardStack: { paddingTop: 12 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1, minHeight: 56 },
  allocationCta: { gap: 14 },
  ctaCopy: { gap: 4 },
  emptyPanel: { gap: 12, marginTop: 10 },
  emptyActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  undoRow: { flexDirection: "row", justifyContent: "center" },
  toast: { marginBottom: 4 },
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
