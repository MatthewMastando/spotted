import { D, toStr } from "./decimal";
import { dayForInstant, valuationInstant } from "./time";
import { Portfolio, Transaction } from "./types";

export type LedgerQuote = {
  price: string | null;
  freshness?: "fresh" | "last_close" | "stale" | "unavailable";
};

export type Holding = {
  assetId: string;
  units: string;
  costBasis: string;
  avgEntry: string;
  currentPrice: string;
  value: string;
  unrealized: string;
  positionReturn: string;
  stale: boolean;
  firstTransactionId: string;
};

export type LedgerResult = {
  cash: string;
  holdings: Holding[];
  realizedPnL: string;
  equity: string;
  totalPaperPnL: string;
  totalPaperReturn: string;
  valuationTime: string;
};

export function replayLedger(input: {
  portfolio: Portfolio;
  transactions: Transaction[];
  quotes: ReadonlyMap<string, LedgerQuote>;
  lastValidPrices?: ReadonlyMap<string, string>;
  valuationTime: string;
}): LedgerResult {
  const unitsByAsset = new Map<string, ReturnType<typeof D>>();
  const basisByAsset = new Map<string, ReturnType<typeof D>>();
  const firstBuyByAsset = new Map<string, string>();
  let realizedPnL = D(0);
  let cash = D(input.portfolio.initialCapital);

  for (const transaction of input.transactions) {
    const amount = D(transaction.amount);
    const quantity = D(transaction.quantity);
    if (transaction.side === "buy") {
      cash = cash.minus(amount);
      unitsByAsset.set(
        transaction.assetId,
        (unitsByAsset.get(transaction.assetId) ?? D(0)).plus(quantity),
      );
      basisByAsset.set(
        transaction.assetId,
        (basisByAsset.get(transaction.assetId) ?? D(0)).plus(amount),
      );
      if (!firstBuyByAsset.has(transaction.assetId)) {
        firstBuyByAsset.set(transaction.assetId, transaction.id);
      }
      continue;
    }

    cash = cash.plus(amount);
    const currentUnits = unitsByAsset.get(transaction.assetId) ?? D(0);
    const currentBasis = basisByAsset.get(transaction.assetId) ?? D(0);
    if (currentUnits.isZero()) continue;
    const closedUnits = DecimalMin(quantity, currentUnits);
    const closedBasis = currentBasis.mul(closedUnits).div(currentUnits);
    realizedPnL = realizedPnL.plus(amount.minus(closedBasis));
    const remainingUnits = currentUnits.minus(closedUnits);
    const remainingBasis = currentBasis.minus(closedBasis);
    unitsByAsset.set(transaction.assetId, remainingUnits);
    basisByAsset.set(transaction.assetId, remainingBasis);
    if (remainingUnits.isZero()) firstBuyByAsset.delete(transaction.assetId);
  }

  const holdings: Holding[] = [];
  let holdingsValue = D(0);
  for (const [assetId, units] of unitsByAsset) {
    if (units.lte(0)) continue;
    const basis = basisByAsset.get(assetId) ?? D(0);
    const quote = input.quotes.get(assetId);
    const currentPrice = quote?.price ?? input.lastValidPrices?.get(assetId);
    if (!currentPrice)
      throw new Error(`No valid valuation price for held asset ${assetId}.`);
    const value = units.mul(currentPrice);
    const unrealized = value.minus(basis);
    const stale =
      !quote ||
      quote.price === null ||
      quote.freshness === "stale" ||
      quote.freshness === "unavailable";
    holdingsValue = holdingsValue.plus(value);
    holdings.push({
      assetId,
      units: toStr(units),
      costBasis: toStr(basis),
      avgEntry: toStr(basis.div(units)),
      currentPrice,
      value: toStr(value),
      unrealized: toStr(unrealized),
      positionReturn: toStr(unrealized.div(basis)),
      stale,
      firstTransactionId: firstBuyByAsset.get(assetId) ?? "",
    });
  }

  const equity = cash.plus(holdingsValue);
  const totalPaperPnL = equity.minus(input.portfolio.initialCapital);
  return {
    cash: toStr(cash),
    holdings,
    realizedPnL: toStr(realizedPnL),
    equity: toStr(equity),
    totalPaperPnL: toStr(totalPaperPnL),
    totalPaperReturn: toStr(totalPaperPnL.div(input.portfolio.initialCapital)),
    valuationTime: input.valuationTime,
  };
}

export function buildPortfolioHistory(input: {
  portfolio: Portfolio;
  transactions: Transaction[];
  createdDay: number;
  today: number;
  getQuote: (assetId: string, day: number) => LedgerQuote;
  getLastValidPrice: (assetId: string, day: number) => string | null;
}): {
  day: number;
  time: string;
  cash: string;
  equity: string;
  totalPaperPnL: string;
}[] {
  const assetIds = [
    ...new Set(input.transactions.map((transaction) => transaction.assetId)),
  ];
  const history = [];
  for (let day = input.createdDay; day <= input.today; day += 1) {
    const transactions = input.transactions.filter(
      (transaction) => dayForInstant(transaction.executedAt) <= day,
    );
    const quotes = new Map(
      assetIds.map((assetId) => [assetId, input.getQuote(assetId, day)]),
    );
    const lastValidPrices = new Map<string, string>();
    for (const assetId of assetIds) {
      const price = input.getLastValidPrice(assetId, day);
      if (price !== null) lastValidPrices.set(assetId, price);
    }
    const value = replayLedger({
      portfolio: input.portfolio,
      transactions,
      quotes,
      lastValidPrices,
      valuationTime: valuationInstant(day),
    });
    history.push({
      day,
      time: value.valuationTime,
      cash: value.cash,
      equity: value.equity,
      totalPaperPnL: value.totalPaperPnL,
    });
  }
  return history;
}

function DecimalMin(left: ReturnType<typeof D>, right: ReturnType<typeof D>) {
  return left.lte(right) ? left : right;
}
