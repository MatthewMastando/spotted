import { describe, expect, test } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { MockMarketDataProvider } from "@/data/providers/mockMarketDataProvider";
import { buildIdeaShareSnapshot } from "@/domain/share";
import { valuationInstant } from "@/domain/time";
import { ThemeProvider } from "@/design/theme";
import { ShareCard } from "@/features/share/ShareCard";

function makeSnapshot(price: string) {
  const asset = ASSET_FIXTURES.find((item) => item.id === "stk_nvda")!;
  const market = new MockMarketDataProvider(ASSET_FIXTURES, "swipefolio-v1", () => 21);
  const saved = {
    id: "saved-nvda",
    assetId: asset.id,
    savedAt: valuationInstant(0),
    savedQuoteTime: valuationInstant(0),
    savedPrice: price,
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

describe("share card snapshots", () => {
  test("renders the same positive return numbers as the snapshot", async () => {
    const snapshot = makeSnapshot("100");
    const result = await render(
      <ThemeProvider preference="dark" systemScheme="dark">
        <ShareCard snapshot={snapshot} theme="lime" sampleJourney={false} />
      </ThemeProvider>,
    );
    expect(result.getByText(snapshot.display.return)).toBeTruthy();
    expect(result.getByText(snapshot.display.savedPrice)).toBeTruthy();
    expect(result.getByText(/Simulated · Find your next pick/)).toBeTruthy();
  });

  test("renders negative return snapshots without changing their basis", async () => {
    const snapshot = makeSnapshot("1000000");
    const result = await render(
      <ThemeProvider preference="dark" systemScheme="dark">
        <ShareCard snapshot={snapshot} theme="violet" sampleJourney={true} />
      </ThemeProvider>,
    );
    expect(snapshot.raw.return.startsWith("-")).toBe(true);
    expect(result.getByText(snapshot.display.return)).toBeTruthy();
    expect(result.getByText(/Sample journey · Simulated/)).toBeTruthy();
  });
});
