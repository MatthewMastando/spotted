import { describe, expect, test } from "@jest/globals";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { NYSE_HOLIDAYS, NYSE_HOLIDAY_SET } from "@/data/fixtures/holidays";
import { generatePricePath } from "@/data/generator/prices";
import { generateSocialSnapshot } from "@/data/generator/social";
import { MockMarketDataProvider } from "@/data/providers/mockMarketDataProvider";
import { MockSocialDataProvider } from "@/data/providers/mockSocialDataProvider";
import { D, toStr } from "@/domain/decimal";
import { equalSplit, validateAllocations } from "@/domain/allocation";
import { rankDeck } from "@/domain/deck";
import { formatMoney } from "@/domain/format";
import {
  buildPortfolioHistory,
  LedgerResult,
  replayLedger,
} from "@/domain/ledger";
import { classifyFreshness, fillBasisForQuote } from "@/domain/quotes";
import { hypothetical1000, returnSinceSave } from "@/domain/returns";
import {
  buildIdeaShareSnapshot,
  buildPortfolioShareSnapshot,
} from "@/domain/share";
import {
  sentimentLabel,
  socialAttention,
  themeAttentionLabel,
} from "@/domain/social";
import { dateForDay, dayForDate, valuationInstant } from "@/domain/time";
import { Portfolio, Quote, ThemeId, Transaction } from "@/domain/types";

const portfolio: Portfolio = {
  id: "portfolio-1",
  createdAt: valuationInstant(0),
  initialCapital: "10000",
  resetGeneration: 0,
};

function transaction(input: {
  id: string;
  side: Transaction["side"];
  quantity: string;
  fillPrice: string;
  amount: string;
  assetId?: string;
}): Transaction {
  return {
    id: input.id,
    idempotencyKey: input.id,
    assetId: input.assetId ?? "stk_msft",
    side: input.side,
    quantity: input.quantity,
    fillPrice: input.fillPrice,
    amount: input.amount,
    fee: "0",
    executedAt: valuationInstant(0),
    savedIdeaId: null,
    fillBasis: "session",
  };
}

function ledger(
  transactions: Transaction[],
  price: string,
  assetId = "stk_msft",
): LedgerResult {
  return replayLedger({
    portfolio,
    transactions,
    quotes: new Map([[assetId, { price, freshness: "fresh" }]]),
    valuationTime: valuationInstant(0),
  });
}

function quote(
  freshness: Quote["freshness"],
  price: string | null = "100",
): Quote {
  return {
    assetId: "stk_msft",
    price,
    quoteTime: valuationInstant(0),
    marketState: "open",
    source: "mock",
    isMock: true,
    freshness,
  };
}

describe("domain calculations", () => {
  test("saved at $100 and valued at $120 produces a +20% return and $200 illustration", () => {
    const savedReturn = returnSinceSave("120", "100");
    expect(savedReturn).toBe("0.2");
    expect(hypothetical1000(savedReturn)).toBe("200");
  });

  test("save return remains distinct from a later paper fill", () => {
    const position = replayLedger({
      portfolio,
      transactions: [
        transaction({
          id: "buy",
          side: "buy",
          quantity: toStr(D(1000).div(110)),
          fillPrice: "110",
          amount: "1000",
        }),
      ],
      quotes: new Map([["stk_msft", { price: "120", freshness: "fresh" }]]),
      valuationTime: valuationInstant(0),
    });
    expect(returnSinceSave("120", "100")).toBe("0.2");
    expect(position.holdings[0].positionReturn).not.toBe("0.2");
    expect(D(position.holdings[0].value).toFixed(6)).toBe("1090.909091");
    expect(D(position.holdings[0].unrealized).toFixed(6)).toBe("90.909091");
    expect(D(position.totalPaperPnL).toFixed(6)).toBe("90.909091");
    expect(D(position.holdings[0].units).toFixed(8)).toBe("9.09090909");
  });

  test("a $2,000 buy at $100 valued and closed at $110 preserves the $200 gain", () => {
    const buy = transaction({
      id: "buy",
      side: "buy",
      quantity: "20",
      fillPrice: "100",
      amount: "2000",
    });
    const open = ledger([buy], "110");
    expect(open.cash).toBe("8000");
    expect(open.holdings[0].units).toBe("20");
    expect(open.equity).toBe("10200");
    expect(open.totalPaperPnL).toBe("200");
    expect(open.totalPaperReturn).toBe("0.02");

    const closed = ledger(
      [
        buy,
        transaction({
          id: "sell",
          side: "sell",
          quantity: "20",
          fillPrice: "110",
          amount: "2200",
        }),
      ],
      "110",
    );
    expect(closed.cash).toBe("10200");
    expect(closed.holdings).toHaveLength(0);
    expect(closed.realizedPnL).toBe("200");
    expect(closed.totalPaperPnL).toBe("200");
  });

  test("closing the same position at $90 preserves its $200 loss", () => {
    const buy = transaction({
      id: "buy",
      side: "buy",
      quantity: "20",
      fillPrice: "100",
      amount: "2000",
    });
    const open = ledger([buy], "90");
    expect(open.equity).toBe("9800");
    expect(open.totalPaperPnL).toBe("-200");
    expect(open.totalPaperReturn).toBe("-0.02");

    const closed = ledger(
      [
        buy,
        transaction({
          id: "sell",
          side: "sell",
          quantity: "20",
          fillPrice: "90",
          amount: "1800",
        }),
      ],
      "90",
    );
    expect(closed.cash).toBe("9800");
    expect(closed.realizedPnL).toBe("-200");
    expect(closed.totalPaperPnL).toBe("-200");
  });

  test("daily history includes cash and values each day at that day's prices", () => {
    const buy = transaction({
      id: "buy",
      side: "buy",
      quantity: "20",
      fillPrice: "100",
      amount: "2000",
    });
    const history = buildPortfolioHistory({
      portfolio,
      transactions: [buy],
      createdDay: 0,
      today: 1,
      getQuote: (_assetId, day) => ({ price: day === 0 ? "100" : "110" }),
      getLastValidPrice: (_assetId, day) => (day === 0 ? "100" : "110"),
    });
    expect(
      history.map(({ cash, equity, totalPaperPnL }) => ({
        cash,
        equity,
        totalPaperPnL,
      })),
    ).toEqual([
      { cash: "8000", equity: "10000", totalPaperPnL: "0" },
      { cash: "8000", equity: "10200", totalPaperPnL: "200" },
    ]);
  });

  test("a missing quote uses the last valid price and marks the holding stale", () => {
    const result = replayLedger({
      portfolio,
      transactions: [
        transaction({
          id: "buy",
          side: "buy",
          quantity: "10",
          fillPrice: "100",
          amount: "1000",
        }),
      ],
      quotes: new Map(),
      lastValidPrices: new Map([["stk_msft", "95"]]),
      valuationTime: valuationInstant(1),
    });
    expect(result.holdings[0].currentPrice).toBe("95");
    expect(result.holdings[0].stale).toBe(true);
    expect(result.holdings[0].value).toBe("950");
  });

  test("stores exact fractional units and never rounds holding value", () => {
    const units = toStr(D("1000").div("3"));
    const value = toStr(D(units).mul("3.01"));
    expect(units).toBe(D("1000").div("3").toString());
    expect(units.length).toBeGreaterThan(20);
    expect(value).toBe(D("1000").div("3").mul("3.01").toString());
    expect(value).not.toBe(formatMoney(value));
  });

  test("equal split distributes remainder cents to the first lines", () => {
    const split = equalSplit("10.01", 3);
    expect(split).toEqual(["3.34", "3.34", "3.33"]);
    expect(
      split.reduce((sum, amount) => sum.plus(amount), D(0)).toFixed(2),
    ).toBe("10.01");
  });

  test("allocation validation rejects zero, negatives, excess precision, duplicates, overspend, and blocked quotes", () => {
    const issuesFor = (
      lines: Array<{ assetId: string; amount: string; quote: Quote }>,
      cash = "100",
    ) => validateAllocations(lines, cash).issues;
    expect(
      issuesFor([{ assetId: "a", amount: "0", quote: quote("fresh") }]),
    ).toContain("below_minimum");
    expect(
      issuesFor([{ assetId: "a", amount: "-1", quote: quote("fresh") }]),
    ).toContain("invalid_amount");
    expect(
      issuesFor([{ assetId: "a", amount: "1.001", quote: quote("fresh") }]),
    ).toContain("invalid_amount");
    expect(
      issuesFor([
        { assetId: "a", amount: "10", quote: quote("fresh") },
        { assetId: "a", amount: "10", quote: quote("fresh") },
      ]),
    ).toContain("duplicate_asset");
    expect(
      issuesFor([{ assetId: "a", amount: "101", quote: quote("fresh") }]),
    ).toContain("over_cash");
    expect(
      issuesFor([{ assetId: "a", amount: "10", quote: quote("stale", null) }]),
    ).toContain("unfillable");
    expect(
      issuesFor([
        { assetId: "a", amount: "10", quote: quote("unavailable", null) },
      ]),
    ).toContain("unfillable");
  });

  test("last close is fillable while stale and unavailable quotes are blocked", () => {
    expect(fillBasisForQuote(quote("last_close"))).toBe("last_close");
    expect(fillBasisForQuote(quote("stale", null))).toBeNull();
    expect(fillBasisForQuote(quote("unavailable", null))).toBeNull();
    const saturday = 2;
    const friday = 1;
    expect(
      classifyFreshness({
        type: "stock",
        today: saturday,
        quoteDay: friday,
        holidays: NYSE_HOLIDAY_SET,
      }),
    ).toBe("last_close");
  });

  test("social labels handle zero and small baselines and distinguish sentiment", () => {
    const zeroBaselineAsset = ASSET_FIXTURES.find(
      (asset) => asset.social.zeroBaseline,
    )!;
    const zeroBaseline = generateSocialSnapshot(zeroBaselineAsset, "test", 0);
    expect(socialAttention(zeroBaseline).label).toBe("New activity");
    expect(
      socialAttention({ ...zeroBaseline, count: 0, baseline: "4.9" }).label,
    ).toBe("Insufficient history");
    expect(
      socialAttention({ ...zeroBaseline, count: 20, baseline: "10" }).label,
    ).toBe("Mentions 2.0x usual");
    expect(socialAttention(null).label).toBe("Social data unavailable");
    expect(sentimentLabel({ ...zeroBaseline, sentiment: null })).toBe(
      "Unavailable",
    );
    expect(
      sentimentLabel({
        ...zeroBaseline,
        sentiment: { bullishShare: "0.61", sampleSize: 29, sampled: true },
      }),
    ).toBe("Unavailable");
    expect(
      sentimentLabel({
        ...zeroBaseline,
        sentiment: { bullishShare: "0.61", sampleSize: 30, sampled: true },
      }),
    ).toBe("Sampled: 61% bullish · 30 demo posts");
    expect(themeAttentionLabel(zeroBaseline)).toBe("Theme-level attention");
  });

  test("starter cards lead a fresh deck and asset type and sector remain diverse", () => {
    const ranked = rankDeck({
      assets: ASSET_FIXTURES,
      mode: "for_you",
      seed: "swipefolio-v1",
      interests: [],
      savedThemes: [],
      activeSavedIds: [],
      passedIds: [],
      freshDeck: true,
    });
    expect(
      ranked
        .slice(0, 3)
        .map(({ asset }) => asset.type)
        .sort(),
    ).toEqual(["crypto", "etf", "stock"]);
    expect(ranked.slice(0, 3).every(({ asset }) => asset.flags.starter)).toBe(
      true,
    );
    for (let index = 2; index < ranked.length; index += 1) {
      const lastThree = ranked
        .slice(index - 2, index + 1)
        .map(({ asset }) => asset);
      expect(
        lastThree[0].type === lastThree[1].type &&
          lastThree[1].type === lastThree[2].type,
      ).toBe(false);
      expect(
        lastThree[0].sector === lastThree[1].sector &&
          lastThree[1].sector === lastThree[2].sector,
      ).toBe(false);
    }
    expect(
      rankDeck({
        assets: ASSET_FIXTURES,
        mode: "for_you",
        seed: "swipefolio-v1",
        interests: [],
        savedThemes: [],
        activeSavedIds: ASSET_FIXTURES.map((asset) => asset.id),
        passedIds: [],
      }),
    ).toHaveLength(0);
  });

  test("share snapshots reuse tracked returns and paper-ledger totals", () => {
    const asset = ASSET_FIXTURES.find(
      (candidate) => candidate.id === "stk_msft",
    )!;
    const saved = {
      id: "saved-1",
      assetId: asset.id,
      savedAt: valuationInstant(0),
      savedQuoteTime: valuationInstant(0),
      savedPrice: "100",
      state: "active" as const,
      createdByActionId: "action-1",
    };
    const currentQuote: Quote = { ...quote("fresh", "120"), assetId: asset.id };
    const ideaSnapshot = buildIdeaShareSnapshot({
      id: "share-idea",
      asset,
      saved,
      quote: currentQuote,
      history: [
        {
          assetId: asset.id,
          time: valuationInstant(0),
          price: "100",
          adjustment: "none",
        },
        {
          assetId: asset.id,
          time: valuationInstant(1),
          price: "120",
          adjustment: "none",
        },
      ],
      createdAt: valuationInstant(1),
      theme: "lime",
      hideAmounts: false,
    });
    expect(ideaSnapshot.raw.return).toBe(returnSinceSave("120", "100"));
    expect(ideaSnapshot.raw.hypothetical).toBe(hypothetical1000("0.2"));
    expect(ideaSnapshot.display.return).toBe("+20.00%");

    const portfolioLedger = ledger(
      [
        transaction({
          id: "buy",
          side: "buy",
          quantity: "20",
          fillPrice: "100",
          amount: "2000",
        }),
      ],
      "110",
    );
    const portfolioSnapshot = buildPortfolioShareSnapshot({
      id: "share-portfolio",
      ledger: portfolioLedger,
      history: [{ time: valuationInstant(0), equity: "10200" }],
      createdAt: valuationInstant(0),
      startTime: portfolio.createdAt,
      theme: "lime",
      hideAmounts: false,
    });
    expect(portfolioSnapshot.raw.pnl).toBe(portfolioLedger.totalPaperPnL);
    expect(portfolioSnapshot.raw.equity).toBe(portfolioLedger.equity);
    expect(portfolioSnapshot.display.pnl).toBe("$200.00");
  });
});

describe("fixtures and deterministic providers", () => {
  const find = (id: string) => ASSET_FIXTURES.find((asset) => asset.id === id)!;

  test("fixtures contain 30 stocks, 15 ETFs, and 15 crypto assets", () => {
    expect(
      ASSET_FIXTURES.filter((asset) => asset.type === "stock"),
    ).toHaveLength(30);
    expect(ASSET_FIXTURES.filter((asset) => asset.type === "etf")).toHaveLength(
      15,
    );
    expect(
      ASSET_FIXTURES.filter((asset) => asset.type === "crypto"),
    ).toHaveLength(15);
    expect(ASSET_FIXTURES.filter((asset) => asset.flags.starter)).toHaveLength(
      3,
    );
    expect(
      ASSET_FIXTURES.filter((asset) => asset.flags.demoWinner),
    ).toHaveLength(1);
    expect(
      ASSET_FIXTURES.filter((asset) => asset.flags.demoLoser),
    ).toHaveLength(1);
    expect(ASSET_FIXTURES.filter((asset) => asset.flags.flat)).toHaveLength(1);
    expect(
      ASSET_FIXTURES.filter((asset) => asset.flags.sharpMove),
    ).toHaveLength(1);
    expect(ASSET_FIXTURES.find((asset) => asset.flags.demoWinner)?.id).toBe(
      "stk_nvda",
    );
    expect(ASSET_FIXTURES.find((asset) => asset.flags.demoLoser)?.id).toBe(
      "cry_ada",
    );
    expect(ASSET_FIXTURES.find((asset) => asset.market.unavailable)?.id).toBe(
      "stk_intc",
    );
    expect(D(find("stk_brk_a").market.currentPrice).gte(100000)).toBe(true);
    expect(D(find("cry_shib").market.currentPrice).lt("0.0001")).toBe(true);
    expect(ASSET_FIXTURES.some((asset) => asset.social.zeroBaseline)).toBe(
      true,
    );
    expect(
      ASSET_FIXTURES.some(
        (asset) =>
          asset.type === "stock" &&
          Object.values(asset.metrics).some((value) => value === null),
      ),
    ).toBe(true);
    expect(
      ASSET_FIXTURES.every(
        (asset) => asset.description && asset.thesis && asset.risk,
      ),
    ).toBe(true);
    const requiredThemes: ThemeId[] = [
      "ai",
      "ai_infrastructure",
      "income",
      "energy",
      "nuclear_energy",
      "crypto",
      "crypto_infrastructure",
      "consumer_brands",
      "broad_market",
      "healthcare",
      "fintech",
      "semiconductors",
    ];
    for (const theme of requiredThemes) {
      expect(ASSET_FIXTURES.some((asset) => asset.themes.includes(theme))).toBe(
        true,
      );
    }
  });

  test("price paths are repeatable for the same seed and vary for a different seed", () => {
    const asset = find("stk_msft");
    const first = generatePricePath(asset, "seed-a");
    expect(generatePricePath(asset, "seed-a")).toEqual(first);
    expect(generatePricePath(asset, "seed-b")).not.toEqual(first);
  });

  test("walkthrough winner, loser, flat, and sharp-move cases meet their targets", () => {
    const winner = generatePricePath(find("stk_nvda"), "swipefolio-v1");
    const loser = generatePricePath(find("cry_ada"), "swipefolio-v1");
    const priceOn = (path: ReturnType<typeof generatePricePath>, day: number) =>
      D(path.find((point) => point.day === day)!.price);
    expect(
      priceOn(winner, 21).div(priceOn(winner, 1)).minus(1).gte("0.3"),
    ).toBe(true);
    expect(priceOn(loser, 21).div(priceOn(loser, 1)).minus(1).lte("-0.2")).toBe(
      true,
    );

    const flat = generatePricePath(find("etf_bil"), "swipefolio-v1");
    const flatReturn = priceOn(flat, 0).div(priceOn(flat, -252)).minus(1).abs();
    expect(flatReturn.lt("0.02")).toBe(true);

    const sharp = generatePricePath(find("stk_smci"), "swipefolio-v1");
    const maxFiveSessionMove = Math.max(
      ...sharp.slice(0, -4).map((point, index) =>
        D(sharp[index + 4].price)
          .div(point.price)
          .minus(1)
          .abs()
          .toNumber(),
      ),
    );
    expect(maxFiveSessionMove).toBeGreaterThanOrEqual(0.25);
  });

  test("providers share one snapshot time and never return future prices", () => {
    let today = 0;
    const provider = new MockMarketDataProvider(
      ASSET_FIXTURES,
      "swipefolio-v1",
      () => today,
    );
    const snapshot = provider.getQuotes(["stk_msft", "etf_voo"], today);
    expect(
      snapshot.quotes.every((item) => item.quoteTime === snapshot.asOf),
    ).toBe(true);
    expect(provider.getQuote("stk_msft", 1).freshness).toBe("unavailable");
    expect(provider.getHistory("stk_msft", 1, 1)).toHaveLength(0);
    expect(provider.getLastValidPrice("stk_msft", 1)).toBe(
      provider.getQuote("stk_msft", today).price,
    );
    today = 2;
    const weekendCrypto = provider.getQuote("cry_eth", today);
    expect(weekendCrypto.price).not.toBe(provider.getQuote("cry_eth", 1).price);
  });

  test("social provider supports a missing-data toggle and blocks future snapshots", () => {
    const provider = new MockSocialDataProvider(
      ASSET_FIXTURES,
      "swipefolio-v1",
      () => 0,
    );
    expect(provider.getSnapshot("stk_msft", 1)).toBeNull();
    expect(provider.getSnapshot("stk_msft", 0)).not.toBeNull();
    provider.setSocialMissing(true);
    expect(provider.getSnapshot("stk_msft", 0)).toBeNull();
  });

  test("providers model stale gaps, unavailable fixtures, and NYSE holidays", () => {
    const provider = new MockMarketDataProvider(
      ASSET_FIXTURES,
      "swipefolio-v1",
      () => 70,
    );
    expect(provider.getQuote("stk_orcl", 5).freshness).toBe("stale");
    expect(provider.getQuote("stk_orcl", 5).price).toBeNull();
    expect(provider.getQuote("stk_intc", 0).freshness).toBe("unavailable");
    expect(NYSE_HOLIDAYS).toContain("2026-11-26");
    expect(NYSE_HOLIDAYS[0]).toBe("2025-09-01");
    expect(NYSE_HOLIDAYS.at(-1)).toBe("2027-01-18");
    const thanksgiving = dayForDate("2026-11-26");
    const thanksgivingQuote = provider.getQuote("stk_msft", thanksgiving);
    expect(thanksgivingQuote.freshness).toBe("last_close");
    expect(dateForDay(thanksgiving)).toBe("2026-11-26");
  });
});
