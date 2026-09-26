import DecimalJs from "decimal.js";

DecimalJs.set({ precision: 40, rounding: DecimalJs.ROUND_HALF_EVEN });

export const D = (value: DecimalJs.Value): DecimalJs => new DecimalJs(value);

export const toStr = (value: DecimalJs.Value): string => D(value).toString();

export function parseMoneyInput(value: string): DecimalJs | null {
  const normalized = value.trim().replace(/^\$/, "");
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  return D(normalized);
}
