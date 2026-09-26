import { D, toStr } from "./decimal";

export type SavedReturn = {
  returnValue: string;
  hypothetical1000: string;
};

export function returnSinceSave(
  currentPrice: string,
  savedPrice: string,
): string {
  return toStr(D(currentPrice).div(savedPrice).minus(1));
}

export function hypothetical1000(returnValue: string): string {
  return toStr(D(1000).mul(returnValue));
}

export function savedReturn(
  currentPrice: string,
  savedPrice: string,
): SavedReturn {
  const returnValue = returnSinceSave(currentPrice, savedPrice);
  return { returnValue, hypothetical1000: hypothetical1000(returnValue) };
}
