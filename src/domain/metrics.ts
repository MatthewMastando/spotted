import { D, toStr } from "./decimal";
import { CryptoMetrics, StockMetrics } from "./types";

export function deriveStockMetrics(
  price: string,
  metrics: StockMetrics,
): { marketCap: string | null; priceToEarnings: string | null } {
  const marketCap =
    metrics.sharesOutstanding === null
      ? null
      : toStr(D(price).mul(metrics.sharesOutstanding));
  const priceToEarnings =
    metrics.epsTtm === null || D(metrics.epsTtm).isZero()
      ? null
      : toStr(D(price).div(metrics.epsTtm));
  return { marketCap, priceToEarnings };
}

export function deriveCryptoMarketCap(
  price: string,
  metrics: CryptoMetrics,
): string | null {
  return metrics.circulatingSupply === null
    ? null
    : toStr(D(price).mul(metrics.circulatingSupply));
}
