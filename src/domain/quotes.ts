import { AssetFixture, Quote } from "./types";
import { dateForDay, isTradingDay, mostRecentSessionDay } from "./time";

export type FillBasis = "session" | "last_close";

export function classifyFreshness(input: {
  type: AssetFixture["type"];
  today: number;
  quoteDay: number | null;
  holidays: ReadonlySet<string>;
}): Quote["freshness"] {
  const { type, today, quoteDay, holidays } = input;
  if (quoteDay === null || quoteDay > today) return "unavailable";
  if (type === "crypto") return quoteDay === today ? "fresh" : "stale";
  if (quoteDay === today && isTradingDay(today, holidays)) return "fresh";
  const lastSession = mostRecentSessionDay(today, holidays, false);
  if (!isTradingDay(today, holidays) && quoteDay === lastSession)
    return "last_close";
  return "stale";
}

export function fillBasisForQuote(quote: Quote): FillBasis | null {
  if (quote.freshness === "fresh") return "session";
  if (quote.freshness === "last_close") return "last_close";
  return null;
}

export function quoteDate(quote: Quote): string | null {
  return quote.quoteTime ? quote.quoteTime.slice(0, 10) : null;
}

export function isQuoteFromDay(quote: Quote, day: number): boolean {
  return quote.quoteTime?.slice(0, 10) === dateForDay(day);
}
