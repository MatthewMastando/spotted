import { D } from "./decimal";
import { formatMoney, formatPercent, formatPrice } from "./format";
import { LedgerResult } from "./ledger";
import { returnSinceSave, hypothetical1000 } from "./returns";
import { Asset, PricePoint, Quote, SavedIdea, ShareSnapshot } from "./types";

const finePrint = "Excludes fees, taxes, dividends. Not investment advice.";

export function presentShareSnapshot(
  snapshot: ShareSnapshot,
  theme: string,
  hideAmounts: boolean,
): ShareSnapshot {
  const display: Record<string, string> = {
    ...snapshot.display,
    return: formatPercent(snapshot.raw.return),
    basis: snapshot.display.basis,
  };

  if (snapshot.kind === "idea") {
    display.savedPrice = hideAmounts
      ? "Hidden"
      : formatPrice(snapshot.raw.savedPrice);
    display.latestPrice = hideAmounts
      ? "Hidden"
      : formatPrice(snapshot.raw.latestPrice);
    display.hypothetical = hideAmounts
      ? "Hidden"
      : formatMoney(snapshot.raw.hypothetical);
  } else if (snapshot.kind === "position") {
    display.pnl = hideAmounts ? "Hidden" : formatMoney(snapshot.raw.pnl);
    display.value = hideAmounts ? "Hidden" : formatMoney(snapshot.raw.value);
    display.latestPrice = hideAmounts
      ? "Hidden"
      : formatPrice(snapshot.raw.currentPrice);
  } else {
    display.pnl = hideAmounts ? "Hidden" : formatMoney(snapshot.raw.pnl);
    display.equity = hideAmounts ? "Hidden" : formatMoney(snapshot.raw.equity);
    display.cash = hideAmounts ? "Hidden" : formatMoney(snapshot.raw.cash);
  }

  return {
    ...snapshot,
    display,
    theme,
    hideAmounts,
  };
}

export function buildIdeaShareSnapshot(input: {
  id: string;
  asset: Asset;
  saved: SavedIdea;
  quote: Quote;
  history: PricePoint[];
  createdAt: string;
  theme: string;
  hideAmounts: boolean;
}): ShareSnapshot {
  const currentPrice = input.quote.price ?? input.history.at(-1)?.price;
  if (!currentPrice)
    throw new Error(`No shareable quote for ${input.asset.id}.`);
  const returnValue = returnSinceSave(currentPrice, input.saved.savedPrice);
  const hypothetical = hypothetical1000(returnValue);
  const startTime = input.saved.savedQuoteTime ?? input.saved.savedAt;
  const chart = input.history.filter(
    (point) => point.time >= startTime && point.time <= input.createdAt,
  );
  return {
    id: input.id,
    templateVersion: 1,
    kind: "idea",
    createdAt: input.createdAt,
    basis: "since_saved",
    assetId: input.asset.id,
    ticker: input.asset.ticker,
    assetName: input.asset.name,
    display: {
      return: formatPercent(returnValue),
      savedPrice: input.hideAmounts
        ? "Hidden"
        : formatPrice(input.saved.savedPrice),
      latestPrice: input.hideAmounts ? "Hidden" : formatPrice(currentPrice),
      hypothetical: input.hideAmounts ? "Hidden" : formatMoney(hypothetical),
      savedAt: startTime.slice(0, 10),
      asOf: (input.quote.quoteTime ?? input.createdAt).slice(0, 10),
      basis: "Since I saved",
    },
    raw: {
      return: returnValue,
      savedPrice: input.saved.savedPrice,
      latestPrice: currentPrice,
      hypothetical,
    },
    chart: chart.map((point) => ({ time: point.time, price: point.price })),
    markers: [{ time: startTime, label: "Saved" }],
    startTime,
    endTime: input.quote.quoteTime ?? input.createdAt,
    flags: { isDemo: true, isSimulated: true },
    finePrint,
    theme: input.theme,
    hideAmounts: input.hideAmounts,
  };
}

export function buildPositionShareSnapshot(input: {
  id: string;
  asset: Asset;
  holding: LedgerResult["holdings"][number];
  quote: Quote;
  history: PricePoint[];
  createdAt: string;
  startTime: string;
  theme: string;
  hideAmounts: boolean;
}): ShareSnapshot {
  const returnValue = D(input.holding.positionReturn).toString();
  const currentPrice = input.quote.price ?? input.holding.currentPrice;
  const chart = input.history.filter(
    (point) => point.time >= input.startTime && point.time <= input.createdAt,
  );
  return {
    id: input.id,
    templateVersion: 1,
    kind: "position",
    createdAt: input.createdAt,
    basis: "paper_position",
    assetId: input.asset.id,
    ticker: input.asset.ticker,
    assetName: input.asset.name,
    display: {
      return: formatPercent(returnValue),
      pnl: input.hideAmounts ? "Hidden" : formatMoney(input.holding.unrealized),
      value: input.hideAmounts ? "Hidden" : formatMoney(input.holding.value),
      latestPrice: input.hideAmounts ? "Hidden" : formatPrice(currentPrice),
      basis: "Paper position",
      asOf: (input.quote.quoteTime ?? input.createdAt).slice(0, 10),
    },
    raw: {
      return: returnValue,
      pnl: input.holding.unrealized,
      value: input.holding.value,
      currentPrice,
      units: input.holding.units,
    },
    chart: chart.map((point) => ({ time: point.time, price: point.price })),
    markers: [{ time: input.startTime, label: "Paper position" }],
    startTime: input.startTime,
    endTime: input.quote.quoteTime ?? input.createdAt,
    flags: { isDemo: true, isSimulated: true },
    finePrint,
    theme: input.theme,
    hideAmounts: input.hideAmounts,
  };
}

export function buildPortfolioShareSnapshot(input: {
  id: string;
  ledger: LedgerResult;
  history: { time: string; equity: string }[];
  createdAt: string;
  startTime: string;
  theme: string;
  hideAmounts: boolean;
}): ShareSnapshot {
  return {
    id: input.id,
    templateVersion: 1,
    kind: "portfolio",
    createdAt: input.createdAt,
    basis: "portfolio",
    assetId: null,
    ticker: null,
    assetName: null,
    display: {
      return: formatPercent(input.ledger.totalPaperReturn),
      pnl: input.hideAmounts
        ? "Hidden"
        : formatMoney(input.ledger.totalPaperPnL),
      equity: input.hideAmounts ? "Hidden" : formatMoney(input.ledger.equity),
      cash: input.hideAmounts ? "Hidden" : formatMoney(input.ledger.cash),
      basis: "Paper portfolio",
      asOf: input.ledger.valuationTime.slice(0, 10),
    },
    raw: {
      return: input.ledger.totalPaperReturn,
      pnl: input.ledger.totalPaperPnL,
      equity: input.ledger.equity,
      cash: input.ledger.cash,
    },
    chart: input.history.map((point) => ({
      time: point.time,
      price: point.equity,
    })),
    markers: [{ time: input.startTime, label: "Portfolio created" }],
    startTime: input.startTime,
    endTime: input.ledger.valuationTime,
    flags: { isDemo: true, isSimulated: true },
    finePrint,
    theme: input.theme,
    hideAmounts: input.hideAmounts,
  };
}
