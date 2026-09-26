import { describe, expect, test } from "@jest/globals";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { sortSavedRows } from "@/features/saved/SavedScreen";

const asset = ASSET_FIXTURES[0];
const row = (id: string, savedAt: string, returnValue: string, attentionRatio: number) => ({
  saved: {
    id,
    assetId: asset.id,
    savedAt,
    savedQuoteTime: savedAt,
    savedPrice: "100",
    state: "active" as const,
    createdByActionId: `action-${id}`,
  },
  asset,
  currentPrice: "100",
  returnValue,
  attentionRatio,
  fundedAmount: null,
  funded: false,
  stale: false,
});

describe("saved sorting", () => {
  test("sorts newest, best, worst, and social attention", () => {
    const rows = [
      row("old", "2026-09-24T20:00:00.000Z", "0.2", 1),
      row("new", "2026-09-26T20:00:00.000Z", "-0.1", 3),
      row("middle", "2026-09-25T20:00:00.000Z", "0.4", 2),
    ];
    expect(sortSavedRows(rows, "newest").map((item) => item.saved.id)).toEqual([
      "new",
      "middle",
      "old",
    ]);
    expect(sortSavedRows(rows, "best").map((item) => item.saved.id)).toEqual([
      "middle",
      "old",
      "new",
    ]);
    expect(sortSavedRows(rows, "worst").map((item) => item.saved.id)).toEqual([
      "new",
      "old",
      "middle",
    ]);
    expect(sortSavedRows(rows, "social").map((item) => item.saved.id)).toEqual([
      "new",
      "middle",
      "old",
    ]);
  });
});
