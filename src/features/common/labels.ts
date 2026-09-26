import type { AssetFixture, Quote, ThemeId } from "@/domain/types";
import { formatDate } from "@/domain/format";

export { THEME_LABELS } from "@/domain/themeLabels";
export type { ThemeId };

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
