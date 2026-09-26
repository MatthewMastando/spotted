import { D } from "./decimal";
import { dateForDay } from "./time";

export const UNAVAILABLE = "Unavailable";
export const NOT_APPLICABLE = "Not applicable";

export function formatMoney(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const amount = D(value);
  return amount.lt(0)
    ? `-$${amount.abs().toFixed(2)}`
    : `$${amount.toFixed(2)}`;
}

export function formatCompactMoney(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const amount = D(value);
  const absolute = amount.abs();
  const scales = [
    { threshold: D("1000000000"), suffix: "B" },
    { threshold: D("1000000"), suffix: "M" },
    { threshold: D("1000"), suffix: "K" },
  ];
  const scale = scales.find(({ threshold }) => absolute.gte(threshold));
  if (!scale) return formatMoney(value);
  const rounded = absolute.div(scale.threshold).toDecimalPlaces(1).toFixed(1);
  return `${amount.lt(0) ? "-$" : "$"}${rounded}${scale.suffix}`;
}

export function formatPrice(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const price = D(value);
  if (price.gte(1)) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
}

export function formatNumber(
  value: string | null,
  decimalPlaces = 2,
): string {
  if (value === null) return UNAVAILABLE;
  const formatted = D(value).toDecimalPlaces(decimalPlaces).toFixed();
  const [integer, fraction] = formatted.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatMultiple(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  return `${D(value).toDecimalPlaces(1).toFixed(1)}x`;
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

export function formatDate(value: string | null): string {
  if (value === null) return UNAVAILABLE;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return UNAVAILABLE;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDemoDay(day: number): string {
  return `Demo · Day ${day} · ${formatDate(dateForDay(day))}`;
}
