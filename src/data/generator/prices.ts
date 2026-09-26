import DecimalJs from "decimal.js";
import { D } from "@/domain/decimal";
import { dateForDay, isTradingDay } from "@/domain/time";
import { AssetFixture } from "@/domain/types";
import { NYSE_HOLIDAY_SET } from "@/data/fixtures/holidays";
import { hash32, mulberry32, normalRandom } from "./rng";

export const GEN_VERSION = 1;

export type GeneratedPricePoint = {
  assetId: string;
  day: number;
  time: string;
  price: string;
  adjustment: "none";
};

export function generatePricePath(
  asset: AssetFixture,
  seed: string,
  holidays: ReadonlySet<string> = NYSE_HOLIDAY_SET,
): GeneratedPricePoint[] {
  if (asset.market.unavailable) return [];

  const sessions = Array.from(
    { length: 486 },
    (_, index) => index - 365,
  ).filter((day) => asset.type === "crypto" || isTradingDay(day, holidays));
  const eventMoves = new Map<number, number>();
  for (const event of asset.market.events) {
    const startIndex = sessions.findIndex((day) => day >= event.day);
    if (startIndex === -1) continue;
    const logMove = Math.log1p(event.movePct) / event.spreadDays;
    for (
      let index = startIndex;
      index < Math.min(sessions.length, startIndex + event.spreadDays);
      index += 1
    ) {
      eventMoves.set(
        sessions[index],
        (eventMoves.get(sessions[index]) ?? 0) + logMove,
      );
    }
  }

  const random = mulberry32(hash32(`${seed}:${asset.id}`));
  const yearDays = asset.type === "crypto" ? 365 : 252;
  const dailyVol = asset.market.annualVol / Math.sqrt(yearDays);
  let cumulativeLogReturn = 0;
  const rawPath = new Map<number, number>();
  for (const day of sessions) {
    const dailyDrift = asset.market.annualDrift / yearDays;
    cumulativeLogReturn +=
      dailyDrift + dailyVol * normalRandom(random) + (eventMoves.get(day) ?? 0);
    rawPath.set(day, Math.exp(cumulativeLogReturn));
  }

  const anchorValue = rawPath.get(0);
  if (anchorValue === undefined)
    throw new Error(`Price path has no anchor session for ${asset.id}.`);
  const currentPrice = D(asset.market.currentPrice);
  const scale = currentPrice.div(anchorValue);
  const precision = asset.market.pricePrecision;
  const minimum = D(1).div(D(10).pow(precision));
  return sessions.map((day) => {
    const rounded = scale
      .mul(rawPath.get(day) ?? anchorValue)
      .toDecimalPlaces(precision, DecimalJs.ROUND_HALF_EVEN);
    const price = rounded.lt(minimum) ? minimum : rounded;
    return {
      assetId: asset.id,
      day,
      time: `${dateForDay(day)}T20:00:00.000Z`,
      price: price.toString(),
      adjustment: "none",
    };
  });
}
