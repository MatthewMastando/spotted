import {
  AssetFixture,
  PricePoint,
  Quote,
  SocialSnapshot,
} from "@/domain/types";

export interface AssetRepository {
  list(): AssetFixture[];
  search(query: string): AssetFixture[];
  filter(filters: {
    type?: AssetFixture["type"];
    theme?: string;
  }): AssetFixture[];
  getDetails(assetId: string): AssetFixture | null;
  related(assetId: string, limit?: number): AssetFixture[];
}

export interface MarketSnapshot {
  asOf: string;
  quotes: Quote[];
}

export interface MarketDataProvider {
  getQuotes(assetIds: string[], day: number): MarketSnapshot;
  getQuote(assetId: string, day: number): Quote;
  getHistory(assetId: string, fromDay: number, toDay: number): PricePoint[];
  getLastValidPrice(assetId: string, day: number): string | null;
}

export interface SocialDataProvider {
  getSnapshot(subjectId: string, day: number): SocialSnapshot | null;
  setSocialMissing(missing: boolean): void;
}
