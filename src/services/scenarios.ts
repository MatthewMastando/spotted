import type { createContainer } from "./container";

export const SCENARIO_IDS = [
  "fresh",
  "firstThreeSaves",
  "mixedPortfolio",
  "winningPick",
  "losingPick",
  "unavailableQuote",
  "emptyFilteredDeck",
  "socialMissing",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

type ScenarioContainer = Awaited<ReturnType<typeof createContainer>>;

export type ScenarioResult = {
  id: ScenarioId;
  savedIdeas: { assetId: string }[];
  portfolio?: Awaited<ReturnType<ScenarioContainer["portfolio"]["valuation"]>>;
  quote?: { freshness: string };
  deck?: unknown[];
  socialMissing?: boolean;
};

export async function runScenario(
  container: ScenarioContainer,
  id: ScenarioId,
  options: { sampleJourney?: boolean } = {},
): Promise<ScenarioResult> {
  await container.clock.reset();
  await container.portfolio.resetPortfolio();
  const existingSettings = container.getSettings();
  await container.updateSettings({
    ...existingSettings,
    onboardingDone: id !== "fresh",
    scenarioId: id,
    seed: "swipefolio-v1",
    clock: { dayOffset: 0 },
    sampleJourney: id === "mixedPortfolio" && options.sampleJourney === true,
    socialMissing: id === "socialMissing",
  });

  const savedIdeas: ScenarioResult["savedIdeas"] = [];
  const starters = container.assets
    .list()
    .filter((asset) => asset.flags.starter);
  if (id === "firstThreeSaves") {
    for (const [index, asset] of starters.entries()) {
      await container.savedIdeas.save(asset.id, `${id}:save:${index}`);
    }
    return { id, savedIdeas: await container.savedIdeas.list("active") };
  }

  if (id === "mixedPortfolio") {
    const assets = ["stk_msft", "etf_voo", "cry_eth"];
    for (const [index, assetId] of assets.entries()) {
      await container.savedIdeas.save(assetId, `${id}:save:${index}`);
    }
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.portfolio.confirmAllocation(
      `${id}:review`,
      assets.map((assetId) => ({ assetId, amount: "1500.00" })),
    );
    await container.clock.advance(7);
    await container.clock.advance(7);
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.portfolio.closePosition("cry_eth");
    const portfolio = await container.portfolio.valuation();
    return {
      id,
      savedIdeas: await container.savedIdeas.list("active"),
      portfolio,
    };
  }

  if (id === "winningPick" || id === "losingPick") {
    const fixture = container.assets
      .list()
      .find((asset) =>
        id === "winningPick" ? asset.flags.demoWinner : asset.flags.demoLoser,
      );
    if (!fixture) throw new Error(`Missing fixture for ${id}.`);
    await container.savedIdeas.save(fixture.id, `${id}:save`);
    await container.portfolio.confirmAllocation(`${id}:review`, [
      { assetId: fixture.id, amount: "1000.00" },
    ]);
    await container.clock.advance(7);
    await container.clock.advance(7);
    await container.clock.advance(7);
    const portfolio = await container.portfolio.valuation();
    return {
      id,
      savedIdeas: await container.savedIdeas.list("active"),
      portfolio,
    };
  }

  if (id === "unavailableQuote") {
    await container.savedIdeas.save("stk_orcl", `${id}:save`);
    await container.portfolio.confirmAllocation(`${id}:review`, [
      { assetId: "stk_orcl", amount: "1000.00" },
    ]);
    await container.clock.advance(7);
    await container.clock.advance(1);
    await container.clock.advance(1);
    await container.clock.advance(1);
    const quote = container.market.getQuote(
      "stk_orcl",
      container.clock.today(),
    );
    const portfolio = await container.portfolio.valuation();
    return {
      id,
      savedIdeas: await container.savedIdeas.list("active"),
      portfolio,
      quote,
    };
  }

  if (id === "emptyFilteredDeck") {
    const deck = await container.deck.getItems("for_you", {
      theme: "industrial",
    });
    return { id, savedIdeas, deck };
  }

  if (id === "socialMissing") {
    return {
      id,
      savedIdeas,
      socialMissing:
        container.social.getSnapshot("stk_nvda", container.clock.today()) ===
        null,
    };
  }

  await container.deck.getItems("for_you");
  return {
    id,
    savedIdeas: await container.savedIdeas.list("active"),
    portfolio: await container.portfolio.valuation(),
  };
}
