import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createContainer, DEFAULT_SETTINGS } from "@/services/container";
import { runScenario, SCENARIO_IDS } from "@/services/scenarios";
import { NodeSqlDb } from "../test/sqliteNode";

let sequence = 0;
const idFactory = (prefix: string) => `${prefix}-${++sequence}`;

describe("persisted services", () => {
  let db: NodeSqlDb;
  let container: Awaited<ReturnType<typeof createContainer>>;

  beforeEach(async () => {
    sequence = 0;
    db = new NodeSqlDb();
    container = await createContainer(db, DEFAULT_SETTINGS, {
      idFactory,
      isDevelopment: false,
    });
  });

  afterEach(() => {
    db.close();
  });

  test("allocation confirmation is idempotent and preserves exact fractional units", async () => {
    const first = await container.portfolio.confirmAllocation("review-1", [
      { assetId: "stk_msft", amount: "1000.00" },
    ]);
    const retry = await container.portfolio.confirmAllocation("review-1", [
      { assetId: "stk_msft", amount: "1000.00" },
    ]);
    expect(retry).toEqual(first);
    expect(
      (await container.repositories.transactions.list()).filter(
        (item) => item.side === "buy",
      ),
    ).toHaveLength(1);
    expect(Number(first[0].quantity)).toBeGreaterThan(0);
    expect(first[0].quantity.length).toBeGreaterThan(10);
    expect(first[0].fillPrice).toBe(
      container.market.getQuote("stk_msft", 0).price,
    );
  });

  test("allocation rejects overspend, invalid amounts, duplicates, and stale fills", async () => {
    await expect(
      container.portfolio.confirmAllocation("overspend", [
        { assetId: "stk_msft", amount: "10000.01" },
      ]),
    ).rejects.toMatchObject({ issues: expect.arrayContaining(["over_cash"]) });

    await expect(
      container.portfolio.confirmAllocation("invalid", [
        { assetId: "stk_msft", amount: "-10" },
      ]),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining(["invalid_amount"]),
    });

    await expect(
      container.portfolio.confirmAllocation("duplicate", [
        { assetId: "stk_msft", amount: "10" },
        { assetId: "stk_msft", amount: "10" },
      ]),
    ).rejects.toMatchObject({
      issues: expect.arrayContaining(["duplicate_asset"]),
    });

    await container.clock.advance(7);
    await expect(
      container.portfolio.confirmAllocation("stale", [
        { assetId: "stk_orcl", amount: "10" },
      ]),
    ).rejects.toMatchObject({ issues: expect.arrayContaining(["unfillable"]) });
    expect(await container.repositories.transactions.list()).toHaveLength(0);
  });

  test("saving, archiving, restoring, and undo preserve the original baseline", async () => {
    const original = await container.savedIdeas.save(
      "stk_msft",
      "save-original",
    );
    expect(original.disposition).toBe("created");
    expect(original.savedIdea.savedPrice).toBe(
      container.market.getQuote("stk_msft", container.clock.today()).price,
    );
    await container.clock.advance(7);
    const duplicate = await container.savedIdeas.save(
      "stk_msft",
      "save-duplicate",
    );
    expect(duplicate.disposition).toBe("already_active");
    expect(duplicate.savedIdea.savedPrice).toBe(original.savedIdea.savedPrice);
    expect(duplicate.savedIdea.savedAt).toBe(original.savedIdea.savedAt);
    await container.savedIdeas.archive("stk_msft");
    await container.clock.advance(7);
    const restored = await container.savedIdeas.save(
      "stk_msft",
      "save-restore",
    );
    expect(restored.disposition).toBe("restored");
    expect(restored.savedIdea.id).toBe(original.savedIdea.id);
    expect(restored.savedIdea.savedPrice).toBe(original.savedIdea.savedPrice);
    expect(await container.savedIdeas.undoLatest()).toEqual({ undone: true });
    const archived = await container.savedIdeas.list("archived");
    expect(archived).toHaveLength(1);
    expect(archived[0].savedPrice).toBe(original.savedIdea.savedPrice);
  });

  test("undo deletes a new unallocated save but blocks after the idea is funded", async () => {
    await container.savedIdeas.save("stk_msft", "save-undo");
    expect(await container.savedIdeas.undoLatest()).toEqual({ undone: true });
    expect(await container.savedIdeas.list()).toHaveLength(0);

    await container.savedIdeas.save("stk_msft", "save-funded");
    await container.portfolio.confirmAllocation("funded-review", [
      { assetId: "stk_msft", amount: "1000.00" },
    ]);
    expect(await container.savedIdeas.undoLatest()).toEqual({
      undone: false,
      reason: "funded_idea",
    });
    expect(await container.savedIdeas.list("active")).toHaveLength(1);
  });

  test("deck passes can be undone or reviewed and undo is blocked during an action", async () => {
    const firstCard = (await container.deck.getItems("for_you"))[0].asset.id;
    await container.deck.pass(firstCard, "pass-one");
    expect(
      (await container.deck.getItems("for_you")).some(
        ({ asset }) => asset.id === firstCard,
      ),
    ).toBe(false);
    expect(await container.savedIdeas.undoLatest()).toEqual({ undone: true });
    expect(
      (await container.deck.getItems("for_you")).some(
        ({ asset }) => asset.id === firstCard,
      ),
    ).toBe(true);

    await container.deck.pass(firstCard, "pass-two");
    await container.deck.reviewPassedIdeas();
    expect(
      (await container.deck.getItems("for_you")).some(
        ({ asset }) => asset.id === firstCard,
      ),
    ).toBe(true);

    let finishAction: () => void = () => {};
    const action = container.savedIdeas.runDeckAction(
      "swipe-animation",
      () =>
        new Promise<void>((resolve) => {
          finishAction = resolve;
        }),
    );
    expect(await container.savedIdeas.undoLatest()).toEqual({
      undone: false,
      reason: "action_in_flight",
    });
    await expect(
      container.savedIdeas.runDeckAction(
        "concurrent-swipe",
        async () => undefined,
      ),
    ).rejects.toThrow("A deck action is already in progress.");
    finishAction();
    await action;
  });

  test("undoing the first deck pass preserves starter ordering", async () => {
    const before = await container.deck.getItems();
    await container.deck.pass(before[0].asset.id, "a1");

    expect(await container.savedIdeas.undoLatest()).toEqual({ undone: true });

    const after = await container.deck.getItems();
    expect(after.map((item) => item.asset.id).slice(0, 3)).toEqual(
      before.map((item) => item.asset.id).slice(0, 3),
    );
  });

  test("a losing position remains negative after a full close and close retries are idempotent", async () => {
    await container.portfolio.confirmAllocation("ada-review", [
      { assetId: "cry_ada", amount: "1000.00" },
    ]);
    await container.clock.advance(7);
    await container.clock.advance(7);
    await container.clock.advance(7);
    const close = await container.portfolio.closePosition("cry_ada");
    expect(close.side).toBe("sell");
    const afterClose = await container.portfolio.valuation();
    expect(afterClose.holdings).toHaveLength(0);
    expect(Number(afterClose.realizedPnL)).toBeLessThan(0);
    expect(Number(afterClose.totalPaperPnL)).toBeLessThan(0);
    expect(await container.portfolio.closePosition("cry_ada")).toEqual(close);
    expect(await container.repositories.transactions.list()).toHaveLength(2);
  });

  test("clock advances persist and stop at the forward-window limit", async () => {
    for (let index = 0; index < 18; index += 1)
      await container.clock.advance(7);
    expect(container.clock.today()).toBe(120);
    expect(container.getSettings().clock.dayOffset).toBe(120);
    await container.clock.reset();
    expect(container.getSettings().clock.dayOffset).toBe(0);
  });

  test("analytics events and share snapshots are saved to local storage", async () => {
    await container.analytics.track("save_completed", { assetId: "stk_msft" });
    expect(await container.repositories.analytics.list()).toMatchObject([
      { name: "save_completed", properties: { assetId: "stk_msft" } },
    ]);

    const saved = await container.savedIdeas.save("stk_msft", "share-save");
    const asset = container.assets.getDetails("stk_msft")!;
    const quote = container.market.getQuote(
      "stk_msft",
      container.clock.today(),
    );
    const snapshot = await container.shares.createIdeaSnapshot({
      id: "share-idea-1",
      asset,
      saved: saved.savedIdea,
      quote,
      history: container.market.getHistory("stk_msft", 0, 0),
      createdAt: container.clock.now(),
      theme: "lime",
      hideAmounts: false,
    });
    expect(await container.shares.get(snapshot.id)).toEqual(snapshot);
  });

  test("all scripted demo scenarios complete with the expected outcomes", async () => {
    const outcomes = new Map();
    for (const scenarioId of SCENARIO_IDS) {
      outcomes.set(
        scenarioId,
        await runScenario(container, scenarioId, { sampleJourney: true }),
      );
      if (scenarioId === "mixedPortfolio") {
        expect(container.getSettings().sampleJourney).toBe(true);
      }
    }

    expect(outcomes.get("fresh").savedIdeas).toHaveLength(0);
    expect(outcomes.get("firstThreeSaves").savedIdeas).toHaveLength(3);
    expect(outcomes.get("mixedPortfolio").portfolio.holdings).toHaveLength(2);
    expect(
      outcomes.get("mixedPortfolio").portfolio.totalPaperPnL,
    ).toBeDefined();
    expect(
      Number(outcomes.get("winningPick").portfolio.totalPaperPnL),
    ).toBeGreaterThan(0);
    expect(
      Number(outcomes.get("losingPick").portfolio.totalPaperPnL),
    ).toBeLessThan(0);
    expect(outcomes.get("unavailableQuote").quote.freshness).toBe("stale");
    expect(outcomes.get("unavailableQuote").portfolio.holdings[0].stale).toBe(
      true,
    );
    expect(outcomes.get("emptyFilteredDeck").deck).toHaveLength(0);
    expect(outcomes.get("socialMissing").socialMissing).toBe(true);
    expect(container.getSettings().sampleJourney).toBe(false);
  });
});

test("SQLite data and mock-clock settings survive reopening the database file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "swipefolio-sqlite-"));
  const filename = join(directory, "restart.db");
  let openDb: NodeSqlDb | undefined;
  try {
    openDb = new NodeSqlDb(filename);
    const firstContainer = await createContainer(openDb, DEFAULT_SETTINGS, {
      idFactory,
      isDevelopment: false,
    });
    expect(
      await firstContainer.repositories.settings.getGeneratorVersion(),
    ).toBe(1);
    const saved = await firstContainer.savedIdeas.save(
      "stk_msft",
      "persisted-save",
    );
    await firstContainer.clock.advance(7);
    openDb.close();
    openDb = undefined;

    openDb = new NodeSqlDb(filename);
    const restarted = await createContainer(openDb, DEFAULT_SETTINGS, {
      idFactory,
      isDevelopment: false,
    });
    expect(restarted.getSettings().clock.dayOffset).toBe(7);
    expect(await restarted.savedIdeas.list("active")).toEqual([
      saved.savedIdea,
    ]);
  } finally {
    openDb?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
