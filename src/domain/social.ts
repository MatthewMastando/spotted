import { D } from "./decimal";
import { SocialSnapshot } from "./types";

export type SocialAttention = {
  label: string;
  comparison: "Last 24h vs 7-day daily average";
  ratio: string | null;
};

export function socialAttention(
  snapshot: SocialSnapshot | null,
): SocialAttention {
  if (!snapshot) {
    return {
      label: "Social data unavailable",
      comparison: "Last 24h vs 7-day daily average",
      ratio: null,
    };
  }
  const baseline = D(snapshot.baseline);
  if (baseline.lt(5)) {
    return {
      label:
        baseline.isZero() && snapshot.count > 0
          ? "New activity"
          : "Insufficient history",
      comparison: "Last 24h vs 7-day daily average",
      ratio: null,
    };
  }
  const ratio = D(snapshot.count).div(baseline).toDecimalPlaces(1).toFixed(1);
  return {
    label: `Mentions ${ratio}x usual`,
    comparison: "Last 24h vs 7-day daily average",
    ratio,
  };
}

export function sentimentLabel(snapshot: SocialSnapshot | null): string {
  if (!snapshot?.sentiment || snapshot.sentiment.sampleSize < 30)
    return "Unavailable";
  const bullishShare = D(snapshot.sentiment.bullishShare)
    .mul(100)
    .toDecimalPlaces(0)
    .toFixed(0);
  return `Sampled: ${bullishShare}% bullish · ${snapshot.sentiment.sampleSize} demo posts`;
}

export function themeAttentionLabel(snapshot: SocialSnapshot | null): string {
  return snapshot ? "Theme-level attention" : "Social data unavailable";
}
