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

export function annualizedVolatility(prices: string[]): string | null {
  if (prices.length < 3) return null;
  const returns = prices
    .slice(1)
    .map((price, index) => D(price).div(prices[index]).minus(1).toNumber());
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return toStr(D(Math.sqrt(Math.max(0, variance * 365))));
}
