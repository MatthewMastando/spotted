import type { AssetFixture, Quote, ThemeId } from "@/domain/types";
import { formatDate } from "@/domain/format";

export const THEME_LABELS: Record<ThemeId, string> = {
  ai: "AI",
  ai_infrastructure: "AI infrastructure",
  income: "Income",
  energy: "Energy",
  nuclear_energy: "Nuclear energy",
  crypto: "Crypto",
  crypto_infrastructure: "Crypto infrastructure",
  consumer_brands: "Consumer brands",
  broad_market: "Broad markets",
  healthcare: "Healthcare",
  fintech: "Fintech",
  semiconductors: "Semiconductors",
  software: "Software",
  industrial: "Industrials",
  fixed_income: "Fixed income",
  defense: "Defense",
};

export const TYPE_LABELS: Record<AssetFixture["type"], string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
};

export function quoteAsOfLabel(quote: Quote): string {
  if (quote.freshness === "unavailable") return "Unavailable";
  if (quote.freshness === "stale") return "Stale";
  if (quote.freshness === "last_close") return "Last close · market closed";
  if (quote.marketState === "24_7") return "24/7";
  return `Close ${formatDate(quote.quoteTime)}`;
}
