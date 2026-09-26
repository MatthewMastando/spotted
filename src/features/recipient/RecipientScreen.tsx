import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatDate, formatPrice } from "@/domain/format";
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
import { Sparkline } from "@/components/Chart";
import {
  TYPE_LABELS,
  THEME_LABELS,
  quoteAsOfLabel,
} from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { trackEvent } from "@/services/track";
import { runMutation } from "@/state/appStore";
import { useSavedIdeas, useSettings } from "@/state/hooks";
import { successHaptic } from "@/services/haptics";

export function RecipientScreen() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const router = useRouter();
  const container = useContainer();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const activeIdeas = useSavedIdeas("active");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const asset = assetId ? container.assets.getDetails(assetId) : null;
  const day = settings.clock.dayOffset;
  const quote = useMemo(
    () => (asset ? container.market.getQuote(asset.id, day) : null),
    [asset, container, day],
  );
  const price = asset && quote
    ? quote.price ?? container.market.getLastValidPrice(asset.id, day)
    : null;
  const social = asset ? container.social.getSnapshot(asset.id, day) : null;
  const alreadySaved = Boolean(
    asset && activeIdeas.data?.some((idea) => idea.assetId === asset.id),
  );

  useEffect(() => {
    void trackEvent(container, "inbound_link_opened", {
      asset_id: assetId ?? null,
    });
  }, [assetId, container]);

  if (!asset || !quote) {
    return (
      <Page>
        <ScreenHeader
          title="Recipient"
          onBack={() => router.back()}
        />
        <View style={styles.unavailable}>
          <AppText variant="title">That idea is unavailable</AppText>
          <AppText variant="body" color={palette.textSecondary}>
            This sample link does not point to an asset in the demo universe.
          </AppText>
          <ActionButton
            variant="secondary"
            accessibilityLabel="Open Discover"
            onPress={() => router.replace("/(tabs)")}
          >
            Open Discover
          </ActionButton>
        </View>
      </Page>
    );
  }

  const selectedAsset = asset;

  async function saveFromLink() {
    if (pending || alreadySaved || price === null) return;
    setPending(true);
    setMessage(null);
    try {
      await runMutation(container, () =>
        container.savedIdeas.save(selectedAsset.id, createId("inbound-save")),
      );
      await trackEvent(container, "idea_saved", {
        asset_id: selectedAsset.id,
        source: "inbound_link",
      });
      await successHaptic(container);
      setMessage(`Saved ${selectedAsset.ticker}. Its demo price is now being tracked.`);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to save this idea.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <ScreenHeader
        title={asset.ticker}
        onBack={() => router.back()}
      />
      <View style={styles.friendLabel}>
        <AppText variant="caption" color={palette.textSecondary}>
          A friend spotted {asset.ticker}
        </AppText>
        <AppText variant="display">A sample idea worth a closer look.</AppText>
        <AppText variant="body" color={palette.textSecondary}>
          This is a clearly labeled demo preview. Explore the context before
          deciding whether you want to save it to your own track record.
        </AppText>
      </View>

      <Panel style={styles.preview}>
        <View style={styles.previewHeader}>
          <View style={[styles.icon, { backgroundColor: asset.iconColor }]}>
            <AppText variant="label" color="#10130D">
              {asset.iconInitials}
            </AppText>
          </View>
          <View style={styles.previewCopy}>
            <AppText variant="title">{asset.name}</AppText>
            <AppText
              variant="small"
              color={palette.textSecondary}
              numberOfLines={1}
            >
              {asset.ticker} · {TYPE_LABELS[asset.type]}
              {asset.themes[0] ? ` · ${THEME_LABELS[asset.themes[0]]}` : ""}
            </AppText>
          </View>
          <Chip label="Sample" selected={false} />
        </View>
        <AppText variant="body">{asset.description}</AppText>
        <AppText variant="body">
          {asset.thesis}
        </AppText>
        <View style={styles.priceBlock}>
          <AppText variant="display">
            {price ? formatPrice(price) : "Price unavailable"}
          </AppText>
          <AppText variant="small" color={palette.textSecondary}>
            USD · {quoteAsOfLabel(quote)}
          </AppText>
        </View>
        {social ? (
          <View style={styles.sparklineContainer}>
            <Sparkline
              values={social.history.map((point) => String(point.count))}
              color={palette.accent}
              label={`Sample attention history for ${asset.ticker}`}
              height={28}
            />
          </View>
        ) : null}
        <AppText variant="small" color={palette.textMuted}>
          Mock data · as of {formatDate(quote.quoteTime)} · Simulated
        </AppText>
      </Panel>

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel={`See ${asset.ticker}`}
          accessibilityHint="Open the full details screen for this asset"
          onPress={() =>
            router.push({ pathname: "/asset/[id]", params: { id: asset.id } })
          }
          style={styles.action}
        >
          See {asset.ticker}
        </ActionButton>
        <ActionButton
          variant="secondary"
          loading={pending}
          disabled={pending || alreadySaved || price === null}
          accessibilityLabel={
            alreadySaved ? `${asset.ticker} is already saved` : `Save ${asset.ticker}`
          }
          accessibilityHint="Create your first saved idea from this sample link"
          onPress={() => void saveFromLink()}
          style={styles.action}
        >
          {alreadySaved ? "Saved" : "Save idea"}
        </ActionButton>
      </View>
      {price === null || quote.freshness === "stale" || quote.freshness === "unavailable" ? (
        <InlineNotice>
          <View style={styles.recoveryNotice}>
            <AppText variant="small" color={palette.textSecondary}>
              {price === null
                ? "This sample cannot be saved while its price is unavailable."
                : "This sample quote is stale or unavailable."}
            </AppText>
            <ActionButton
              variant="quiet"
              accessibilityLabel="Open Discover"
              onPress={() => router.replace("/(tabs)")}
            >
              Open Discover
            </ActionButton>
          </View>
        </InlineNotice>
      ) : null}
      {message ? <InlineNotice>{message}</InlineNotice> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  unavailable: { gap: 12, paddingVertical: 24 },
  friendLabel: { gap: 8 },
  preview: { gap: 16, padding: 20 },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 50,
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: { flex: 1, gap: 3 },
  priceBlock: { gap: 3 },
  sparklineContainer: { width: "100%", minWidth: 0, overflow: "hidden" },
  recoveryNotice: { gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { flexGrow: 1, flexBasis: "40%" },
});
