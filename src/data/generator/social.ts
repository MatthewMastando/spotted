import { dateForDay, valuationInstant } from "@/domain/time";
import { AssetFixture, SocialSnapshot } from "@/domain/types";
import { hash32, mulberry32 } from "./rng";

export function generateSocialSnapshot(
  asset: AssetFixture,
  seed: string,
  day: number,
): SocialSnapshot {
  const random = mulberry32(hash32(`${seed}:social:${asset.id}`));
  const history = Array.from({ length: 30 }, (_, index) => {
    const historyDay = day - 29 + index;
    const count =
      asset.social.zeroBaseline && index >= 22 && index < 29
        ? 0
        : Math.floor(random() * 36) + 6;
    return { day: historyDay, count };
  });
  const count = asset.social.zeroBaseline
    ? 18
    : history[history.length - 1].count;
  const priorSeven = history.slice(-8, -1);
  const baseline =
    priorSeven.reduce((sum, point) => sum + point.count, 0) /
    Math.max(priorSeven.length, 1);
  history[history.length - 1] = { day, count };
  const sampleSize = asset.social.sampleSize ?? 0;
  return {
    subjectId: asset.id,
    period: "24h_vs_7d",
    count,
    baseline: String(baseline),
    history,
    sentiment:
      sampleSize >= 30
        ? {
            bullishShare: (0.35 + random() * 0.3).toFixed(4),
            sampleSize,
            sampled: true,
          }
        : null,
    discussionThemes: [
      `Fictional ${asset.themes[0].replaceAll("_", " ")} discussion`,
      "Marked demo conversation themes",
    ],
    source: "mock",
    asOf: valuationInstant(day),
  };
}

export function socialDate(day: number): string {
  return dateForDay(day);
}
