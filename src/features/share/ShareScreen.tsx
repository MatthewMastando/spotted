import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image as NativeImage,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { ShareSnapshot } from "@/domain/types";
import {
  buildIdeaShareSnapshot,
  buildPortfolioShareSnapshot,
  buildPositionShareSnapshot,
  presentShareSnapshot,
} from "@/domain/share";
import { MIN_HISTORY_DAY } from "@/domain/time";
import { formatDate } from "@/domain/format";
import { usePalette } from "@/design/theme";
import { ActionButton, AppText, Chip, InlineNotice, Page, Panel, SectionTitle } from "@/components/ui";
import {
  SHARE_CARD_DESIGN_SIZES,
  ShareCard,
  ShareCardLayout,
  ShareTheme,
  shareThemeColors,
} from "./ShareCard";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { trackEvent } from "@/services/track";
import { successHaptic } from "@/services/haptics";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSavedIdeas, useSettings } from "@/state/hooks";

type Layout = "portrait" | "square";
const SIZES: Record<Layout, { width: number; height: number; label: string }> = {
  portrait: { width: 1080, height: 1920, label: "Portrait · 1080×1920" },
  square: { width: 1080, height: 1080, label: "Square · 1080×1080" },
};

export function ShareScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id?: string }>();
  const router = useRouter();
  const container = useContainer();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const activeIdeas = useSavedIdeas("active");
  const portfolio = usePortfolioData();
  const [layout, setLayout] = useState<Layout>("portrait");
  const [theme, setTheme] = useState<ShareTheme>("lime");
  const [hideAmounts, setHideAmounts] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const captureTarget = useRef<View>(null);
  const [previewFrameWidth, setPreviewFrameWidth] = useState(0);
  const hapticFired = useRef(false);
  const size = SIZES[layout];
  const designSize = SHARE_CARD_DESIGN_SIZES[layout];
  const day = settings.clock.dayOffset;

  const candidateSnapshot = useMemo<ShareSnapshot | null>(() => {
    const createdAt = container.clock.now();
    if (kind === "idea" || kind === "position") {
      if (!id) return null;
      const asset = container.assets.getDetails(id);
      const saved = activeIdeas.data?.find((item) => item.assetId === id);
      const holding = portfolio.data?.ledger.holdings.find((item) => item.assetId === id);
      const quote = container.market.getQuote(id, day);
      const history = container.market.getHistory(
        id,
        Math.max(MIN_HISTORY_DAY, day - 365),
        day,
      );
      if (!asset || !saved || !quote || !history.length) return null;
      if (kind === "position" && !holding) return null;
      if (kind === "position" && holding) {
        const firstTransaction = portfolio.data?.transactions.find(
          (transaction) => transaction.id === holding.firstTransactionId,
        );
        return buildPositionShareSnapshot({
          id: "preview",
          asset,
          holding,
          quote,
          history,
          createdAt,
          startTime: firstTransaction?.executedAt ?? saved.savedAt,
          theme: "lime",
          hideAmounts: false,
        });
      }
      if (kind !== "idea") return null;
      return buildIdeaShareSnapshot({
        id: "preview",
        asset,
        saved,
        quote,
        history,
        createdAt,
        theme: "lime",
        hideAmounts: false,
      });
    }
    if (kind === "portfolio" && portfolio.data) {
      const startTime = portfolio.data.history[0]?.time ?? createdAt;
      return buildPortfolioShareSnapshot({
        id: "preview",
        ledger: portfolio.data.ledger,
        history: portfolio.data.history,
        createdAt,
        startTime,
        theme: "lime",
        hideAmounts: false,
      });
    }
    return null;
  }, [
    activeIdeas.data,
    container,
    day,
    id,
    kind,
    portfolio.data,
  ]);

  const [frozenSnapshot, setFrozenSnapshot] =
    useState<ShareSnapshot | null>(null);
  useEffect(() => {
    if (!frozenSnapshot && candidateSnapshot) {
      queueMicrotask(() => setFrozenSnapshot(candidateSnapshot));
    }
  }, [candidateSnapshot, frozenSnapshot]);
  const baseSnapshot = frozenSnapshot ?? candidateSnapshot;
  const snapshot = useMemo(
    () =>
      baseSnapshot
        ? presentShareSnapshot(baseSnapshot, theme, hideAmounts)
        : null,
    [baseSnapshot, hideAmounts, theme],
  );

  useEffect(() => {
    if (baseSnapshot && !hapticFired.current) {
      hapticFired.current = true;
      void successHaptic(container);
    }
  }, [baseSnapshot, container]);

  if (!snapshot) {
    return (
      <Page>
        <ActionButton variant="quiet" accessibilityLabel="Close share composer" onPress={() => router.back()}>
          ← Back
        </ActionButton>
        <Panel>
          <AppText variant="title">This result is not ready to share.</AppText>
          <AppText variant="body" color={palette.textSecondary}>
            Save an idea or create a paper position before opening its result card.
          </AppText>
        </Panel>
      </Page>
    );
  }

  async function persistSnapshot(): Promise<ShareSnapshot> {
    if (!snapshot) throw new Error("The share preview is not ready.");
    return container.shares.saveSnapshot({
      ...snapshot,
      id: createId("share"),
    });
  }

  async function exportCard(mode: "share" | "save") {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const persisted = await runMutation(container, persistSnapshot);
      const uri = await captureImage();
      if (mode === "share") {
        if (!(await Sharing.isAvailableAsync())) {
          setMessage("Sharing isn't available on this device. Use Save image instead.");
        } else {
          await trackEvent(container, "share_sheet_opened", {
            kind: persisted.kind,
            layout,
          });
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            UTI: "public.png",
            dialogTitle: "Share your Swipefolio result",
          });
          setMessage("Share sheet opened.");
        }
      } else {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) {
          setMessage("Photo access was denied. Enable it in Settings to save the image.");
          return;
        }
        await MediaLibrary.createAssetAsync(uri);
        setMessage("Saved image to your photo library.");
      }
      await trackEvent(container, "export_generated", {
        kind: persisted.kind,
        layout,
      });
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to export this card.",
      );
    } finally {
      setPending(false);
    }
  }

  async function captureImage(): Promise<string> {
    if (!captureTarget.current) throw new Error("Card preview is not ready.");
    const uri = await captureRef(captureTarget, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: size.width,
      height: size.height,
    });
    const dimensions = await NativeImage.getSize(uri);
    if (dimensions.width !== size.width || dimensions.height !== size.height) {
      throw new Error(
        `Export dimensions were ${dimensions.width}×${dimensions.height}; expected ${size.width}×${size.height}.`,
      );
    }
    return uri;
  }

  async function copyCaption() {
    if (!snapshot) return;
    await Clipboard.setStringAsync(makeCaption(snapshot));
    setMessage("Caption copied.");
  }

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.header}>
        <ActionButton
          variant="quiet"
          accessibilityLabel="Close share composer"
          onPress={() => router.back()}
        >
          ← Back
        </ActionButton>
        <AppText variant="label" color={palette.textMuted}>
          SHARE PREVIEW
        </AppText>
      </View>
      <Panel style={styles.previewPanel}>
        <View
          style={[
            styles.previewFrame,
            {
              backgroundColor: shareThemeColors(theme).background,
              aspectRatio: designSize.width / designSize.height,
            },
          ]}
        >
          <View
            onLayout={(event) =>
              setPreviewFrameWidth(event.nativeEvent.layout.width)
            }
            style={[
              styles.previewCard,
              {
                width: designSize.width,
                height: designSize.height,
                transform: [
                  {
                    scale: previewFrameWidth
                      ? previewFrameWidth / designSize.width
                      : 1,
                  },
                ],
              },
            ]}
          >
            <ShareCard
              snapshot={snapshot}
              theme={theme}
              sampleJourney={settings.sampleJourney}
              layout={layout as ShareCardLayout}
            />
          </View>
        </View>
        <AppText variant="small" color={palette.textSecondary}>
          Preview matches the exported {SIZES[layout].label.toLowerCase()} PNG.
        </AppText>
      </Panel>
      <SectionTitle title="Format" />
      <View style={styles.chips}>
        {Object.entries(SIZES).map(([value, option]) => (
          <Chip
            key={value}
            label={option.label}
            selected={layout === value}
            onPress={() => setLayout(value as Layout)}
          />
        ))}
      </View>
      <SectionTitle title="Theme" />
      <View style={styles.chips}>
        {(["lime", "violet", "sunset"] as ShareTheme[]).map((value) => (
          <Chip
            key={value}
            label={value[0].toUpperCase() + value.slice(1)}
            selected={theme === value}
            onPress={() => setTheme(value)}
          />
        ))}
      </View>
      <Chip
        label={hideAmounts ? "Amounts hidden" : "Hide dollar amounts"}
        selected={hideAmounts}
        onPress={() => setHideAmounts((current) => !current)}
        accessibilityHint="Keep the return basis and percentages visible while hiding dollar values"
      />
      <View style={styles.actions}>
        <ActionButton
          loading={pending}
          accessibilityLabel="Share result"
          accessibilityHint="Open the native share sheet for the exported PNG"
          onPress={() => void exportCard("share")}
          style={styles.action}
        >
          Share
        </ActionButton>
        <ActionButton
          variant="secondary"
          loading={pending}
          accessibilityLabel="Save image"
          onPress={() => void exportCard("save")}
          style={styles.action}
        >
          Save image
        </ActionButton>
        <ActionButton
          variant="quiet"
          accessibilityLabel="Copy share caption"
          onPress={() => void copyCaption()}
          style={styles.action}
        >
          Copy caption
        </ActionButton>
      </View>
      {message ? <InlineNotice>{message}</InlineNotice> : null}
      <View
        ref={captureTarget}
        collapsable={false}
        pointerEvents="none"
        style={[
          styles.captureTarget,
          { width: designSize.width, height: designSize.height },
        ]}
      >
        <ShareCard
          snapshot={snapshot}
          theme={theme}
          sampleJourney={settings.sampleJourney}
          layout={layout as ShareCardLayout}
        />
      </View>
    </Page>
  );
}

function makeCaption(snapshot: ShareSnapshot): string {
  if (snapshot.kind === "portfolio")
    return `My paper portfolio is ${snapshot.display.return} in this demo. Find your next pick on Swipefolio.`;
  return `I spotted ${snapshot.ticker} on ${formatDate(snapshot.startTime)} — ${snapshot.display.return} since I saved (demo, simulated). Find your next pick on Swipefolio.`;
}

const styles = StyleSheet.create({
  page: { paddingBottom: 130 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewPanel: { gap: 10 },
  previewFrame: { width: "100%", overflow: "hidden", borderRadius: 20 },
  previewCard: { alignSelf: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { flexGrow: 1, flexBasis: "30%" },
  captureTarget: {
    position: "absolute",
    left: -2000,
    top: 0,
  },
});
