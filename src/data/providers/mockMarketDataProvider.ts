import { dayForInstant, isTradingDay, valuationInstant } from "@/domain/time";
import { AssetFixture, PricePoint, Quote } from "@/domain/types";
import { classifyFreshness } from "@/domain/quotes";
import { NYSE_HOLIDAY_SET } from "@/data/fixtures/holidays";
import {
  generatePricePath,
  GeneratedPricePoint,
} from "@/data/generator/prices";
import { MarketDataProvider, MarketSnapshot } from "./types";

export class MockMarketDataProvider implements MarketDataProvider {
  private readonly paths = new Map<string, GeneratedPricePoint[]>();

  constructor(
    private readonly assets: AssetFixture[],
    private seed: string,
    private readonly today: () => number,
    private readonly holidays: ReadonlySet<string> = NYSE_HOLIDAY_SET,
  ) {}

  setSeed(seed: string): void {
    if (seed === this.seed) return;
    this.seed = seed;
    this.paths.clear();
  }

  getQuotes(assetIds: string[], day: number): MarketSnapshot {
    const cappedDay = day <= this.today() ? day : this.today();
    return {
      asOf: valuationInstant(cappedDay),
      quotes: assetIds.map((assetId) => this.getQuote(assetId, day)),
    };
  }

  getQuote(assetId: string, day: number): Quote {
    const asset = this.assets.find((item) => item.id === assetId);
    if (!asset) return unavailableQuote(assetId, "closed");
    if (day > this.today() || asset.market.unavailable) {
      return unavailableQuote(
        assetId,
        asset.type === "crypto" ? "24_7" : "closed",
      );
    }

    const marketState =
      asset.type === "crypto"
        ? "24_7"
        : isTradingDay(day, this.holidays)
          ? "open"
          : "closed";
    const path = this.getPath(asset);
    const gap = asset.market.quoteGaps?.find(
      (candidate) => day >= candidate.fromDay && day <= candidate.toDay,
    );
    if (gap) {
      const lastBeforeGap = path
        .filter((point) => point.day < gap.fromDay)
        .at(-1);
      return {
        assetId,
        price: null,
        quoteTime: lastBeforeGap?.time ?? null,
        marketState,
        source: "mock",
        isMock: true,
        freshness: "stale",
      };
    }

    const point = path.filter((candidate) => candidate.day <= day).at(-1);
    if (!point) return unavailableQuote(assetId, marketState);
    const freshness = classifyFreshness({
      type: asset.type,
      today: day,
      quoteDay: point.day,
      holidays: this.holidays,
    });
    return {
      assetId,
      price: point.price,
      quoteTime: point.time,
      marketState,
      source: "mock",
      isMock: true,
      freshness,
    };
  }

  getHistory(assetId: string, fromDay: number, toDay: number): PricePoint[] {
    const asset = this.assets.find((item) => item.id === assetId);
    if (!asset || asset.market.unavailable) return [];
    const lastDay = Math.min(toDay, this.today());
    return this.getPath(asset)
      .filter(
        (point) =>
          point.day >= fromDay &&
          point.day <= lastDay &&
          !asset.market.quoteGaps?.some(
            (gap) => point.day >= gap.fromDay && point.day <= gap.toDay,
          ),
      )
      .map(({ assetId: id, time, price, adjustment }) => ({
        assetId: id,
        time,
        price,
        adjustment,
      }));
  }

  getLastValidPrice(assetId: string, day: number): string | null {
    const asset = this.assets.find((item) => item.id === assetId);
    if (!asset || asset.market.unavailable) return null;
    return (
      this.getPath(asset)
        .filter(
          (point) =>
            point.day <= Math.min(day, this.today()) &&
            !asset.market.quoteGaps?.some(
              (gap) => point.day >= gap.fromDay && point.day <= gap.toDay,
            ),
        )
        .at(-1)?.price ?? null
    );
  }

  private getPath(asset: AssetFixture): GeneratedPricePoint[] {
    let path = this.paths.get(asset.id);
    if (!path) {
      path = generatePricePath(asset, this.seed, this.holidays);
      this.paths.set(asset.id, path);
    }
    return path;
  }
}

function unavailableQuote(
  assetId: string,
  marketState: Quote["marketState"],
): Quote {
  return {
    assetId,
    price: null,
    quoteTime: null,
    marketState,
    source: "mock",
    isMock: true,
    freshness: "unavailable",
  };
}

export function quoteDay(quote: Quote): number | null {
  return quote.quoteTime ? dayForInstant(quote.quoteTime) : null;
}
