import { describe, expect, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { MockMarketDataProvider } from "@/data/providers/mockMarketDataProvider";
import {
  buildIdeaShareSnapshot,
  presentShareSnapshot,
} from "@/domain/share";
import { valuationInstant } from "@/domain/time";
import { ThemeProvider } from "@/design/theme";
import { ShareCard } from "@/features/share/ShareCard";

function makeBaseSnapshot() {
  const asset = ASSET_FIXTURES.find((item) => item.id === "stk_nvda")!;
  const market = new MockMarketDataProvider(
    ASSET_FIXTURES,
    "swipefolio-v1",
    () => 21,
  );
  const saved = {
    id: "saved-nvda",
    assetId: asset.id,
    savedAt: valuationInstant(0),
    savedQuoteTime: valuationInstant(0),
    savedPrice: "100",
    state: "active" as const,
    createdByActionId: "save-1",
  };
  const quote = market.getQuote(asset.id, 21);
  const history = market.getHistory(asset.id, -30, 21);
  return buildIdeaShareSnapshot({
    id: "share-preview",
    asset,
    saved,
    quote,
    history,
    createdAt: valuationInstant(21),
    theme: "lime",
    hideAmounts: false,
  });
}

describe("share card preview and capture parity", () => {
  test.each([false, true])(
    "renders identical text for preview and capture with hideAmounts=%s",
    async (hideAmounts) => {
      const snapshot = presentShareSnapshot(
        makeBaseSnapshot(),
        "lime",
        hideAmounts,
      );
      const preview = await render(
        <ThemeProvider preference="dark" systemScheme="dark">
          <ShareCard
            snapshot={snapshot}
            theme="lime"
            sampleJourney={false}
            layout="portrait"
          />
        </ThemeProvider>,
      );
      const capture = await render(
        <ThemeProvider preference="dark" systemScheme="dark">
          <ShareCard
            snapshot={snapshot}
            theme="lime"
            sampleJourney={false}
            layout="portrait"
          />
        </ThemeProvider>,
      );
      expect(preview.toJSON()).toEqual(capture.toJSON());
      expect(preview.getByText(snapshot.display.return)).toBeTruthy();
      expect(preview.getByText(snapshot.display.basis)).toBeTruthy();
      expect(preview.getByText(snapshot.display.savedAt)).toBeTruthy();
      expect(preview.getByText(snapshot.display.asOf)).toBeTruthy();
      expect(snapshot.display.basis).toBe("Since I saved");
      expect(snapshot.display.savedAt).toBe("2026-09-24");
      expect(snapshot.display.asOf).toBe("2026-10-15");
      if (hideAmounts) {
        expect(snapshot.display.savedPrice).toBe("Hidden");
        expect(snapshot.display.latestPrice).toBe("Hidden");
        expect(snapshot.display.hypothetical).toBe("Hidden");
      }
    },
  );
});
