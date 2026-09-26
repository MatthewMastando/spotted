import { AssetFixture, ThemeId } from "./types";

export type DeckMode = "for_you" | "trending" | "explore";

export type DeckFilters = {
  type?: AssetFixture["type"];
  theme?: ThemeId;
};

export type RankedDeckItem = {
  asset: AssetFixture;
  reason: string;
  score: number;
};

export function rankDeck(input: {
  assets: AssetFixture[];
  mode: DeckMode;
  seed: string;
  interests: ThemeId[];
  savedThemes: ThemeId[];
  activeSavedIds: string[];
  passedIds: string[];
  filters?: DeckFilters;
  freshDeck?: boolean;
  attentionRatios?: ReadonlyMap<string, number | null>;
}): RankedDeckItem[] {
  const filters = input.filters ?? {};
  const noFilters = !filters.type && !filters.theme;
  const candidates = input.assets.filter(
    (asset) =>
      (!filters.type || asset.type === filters.type) &&
      (!filters.theme || asset.themes.includes(filters.theme)) &&
      !input.activeSavedIds.includes(asset.id) &&
      !input.passedIds.includes(asset.id),
  );

  const ordered: AssetFixture[] = [];
  const firstThree = input.freshDeck && noFilters && input.mode === "for_you";
  if (firstThree) {
    for (const type of ["stock", "etf", "crypto"] as const) {
      const starter = candidates.find(
        (asset) => asset.type === type && asset.flags.starter,
      );
      if (starter) ordered.push(starter);
    }
  }

  const remaining = candidates.filter(
    (candidate) => !ordered.some((asset) => asset.id === candidate.id),
  );
  const scored = remaining.map((asset) => ({
    asset,
    score: scoreAsset(asset, input),
    stableTie: hashValue(`${input.seed}:${asset.id}`) / 0xffffffff,
    attention: input.attentionRatios?.get(asset.id) ?? null,
  }));
  scored.sort((left, right) => {
    if (input.mode === "trending") {
      const attentionOrder = (right.attention ?? -1) - (left.attention ?? -1);
      if (attentionOrder !== 0) return attentionOrder;
    }
    if (input.mode === "explore") {
      const exploreOrder = left.score - right.score;
      if (exploreOrder !== 0) return exploreOrder;
    } else {
      const scoreOrder = right.score - left.score;
      if (scoreOrder !== 0) return scoreOrder;
    }
    return left.stableTie - right.stableTie;
  });

  const ranked = [...ordered];
  const pool = scored.map(({ asset }) => asset);
  while (pool.length > 0) {
    const acceptableIndex = pool.findIndex((candidate) =>
      preservesDiversity(ranked, candidate),
    );
    const nextIndex = acceptableIndex === -1 ? 0 : acceptableIndex;
    ranked.push(pool.splice(nextIndex, 1)[0]);
  }

  return ranked.map((asset) => ({
    asset,
    score: scoreAsset(asset, input),
    reason: reasonFor(asset, input),
  }));
}

function scoreAsset(
  asset: AssetFixture,
  input: { interests: ThemeId[]; savedThemes: ThemeId[]; seed: string },
): number {
  const interestMatches = asset.themes.filter((theme) =>
    input.interests.includes(theme),
  ).length;
  const savedMatches = asset.themes.filter((theme) =>
    input.savedThemes.includes(theme),
  ).length;
  return (
    2 * interestMatches +
    savedMatches +
    hashValue(`${input.seed}:${asset.id}`) / 0xffffffff / 100
  );
}

function preservesDiversity(
  ranked: AssetFixture[],
  candidate: AssetFixture,
): boolean {
  if (ranked.length < 2) return true;
  const last = ranked[ranked.length - 1];
  const previous = ranked[ranked.length - 2];
  return (
    !(last.type === candidate.type && previous.type === candidate.type) &&
    !(last.sector === candidate.sector && previous.sector === candidate.sector)
  );
}

function reasonFor(
  asset: AssetFixture,
  input: {
    interests: ThemeId[];
    mode: DeckMode;
  },
): string {
  if (asset.flags.starter) return "Popular starting point";
  const matchingTheme = asset.themes.find((theme) =>
    input.interests.includes(theme),
  );
  if (matchingTheme)
    return `Matches your ${matchingTheme.replaceAll("_", " ")} interest`;
  if (input.mode === "trending") return "Social mentions accelerating";
  return "Explore a different sector";
}

function hashValue(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}
