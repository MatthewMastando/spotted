import { D } from "./decimal";

export const UNAVAILABLE = "Unavailable";
export const NOT_APPLICABLE = "Not applicable";

export function formatMoney(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const amount = D(value);
  return amount.lt(0)
    ? `-$${amount.abs().toFixed(2)}`
    : `$${amount.toFixed(2)}`;
}

export function formatPrice(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const price = D(value);
  if (price.gte(1)) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export function formatPercent(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const percent = D(value).mul(100).toFixed(2);
  return `${D(percent).gte(0) ? "+" : ""}${percent}%`;
}

export function formatApplicable(
  value: string | null,
  applicable: boolean,
): string {
  if (!applicable) return NOT_APPLICABLE;
  return value === null ? UNAVAILABLE : value;
}
