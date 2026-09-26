import { D } from "./decimal";
import DecimalJs from "decimal.js";
import { Quote } from "./types";
import { fillBasisForQuote } from "./quotes";

export type AllocationLine = {
  assetId: string;
  amount: string;
  quote: Quote;
};

export type AllocationIssue =
  | "no_lines"
  | "invalid_amount"
  | "below_minimum"
  | "duplicate_asset"
  | "over_cash"
  | "unfillable";

export type AllocationValidation = {
  valid: boolean;
  issues: AllocationIssue[];
  total: string;
};

export function validateAllocations(
  lines: AllocationLine[],
  cash: string,
): AllocationValidation {
  const issues: AllocationIssue[] = [];
  if (lines.length === 0) issues.push("no_lines");
  const ids = new Set<string>();
  let total = D(0);
  for (const line of lines) {
    if (ids.has(line.assetId)) issues.push("duplicate_asset");
    ids.add(line.assetId);
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(line.amount)) {
      issues.push("invalid_amount");
      continue;
    }
    const amount = D(line.amount);
    if (!amount.isFinite() || amount.lt(0)) {
      issues.push("invalid_amount");
      continue;
    }
    if (amount.lt(1)) issues.push("below_minimum");
    total = total.plus(amount);
    if (
      !fillBasisForQuote(line.quote) ||
      !line.quote.price ||
      D(line.quote.price).lte(0)
    ) {
      issues.push("unfillable");
    }
  }
  if (total.gt(cash)) issues.push("over_cash");
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)],
    total: total.toString(),
  };
}

export function equalSplit(total: string, count: number): string[] {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    !D(total).isFinite() ||
    D(total).lt(0) ||
    D(total).decimalPlaces() > 2
  ) {
    throw new RangeError(
      "A non-negative total and positive line count are required.",
    );
  }
  const totalCents = BigInt(
    D(total).mul(100).toDecimalPlaces(0, DecimalJs.ROUND_FLOOR).toFixed(0),
  );
  const divisor = BigInt(count);
  const base = totalCents / divisor;
  const remainder = totalCents % divisor;
  return Array.from({ length: count }, (_, index) => {
    const cents = base + (BigInt(index) < remainder ? 1n : 0n);
    return D(cents.toString()).div(100).toFixed(2);
  });
}

export function suggestedAllocationTotal(cash: string, count: number): string {
  if (!Number.isInteger(count) || count < 1) return "0.00";
  const cap = D(1000).mul(count);
  return D(cash).lt(cap)
    ? D(cash).toDecimalPlaces(2).toFixed(2)
    : cap.toFixed(2);
}
