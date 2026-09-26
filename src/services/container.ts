import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { MockAssetRepository } from "@/data/providers/mockAssetRepository";
import { MockMarketDataProvider } from "@/data/providers/mockMarketDataProvider";
import { MockSocialDataProvider } from "@/data/providers/mockSocialDataProvider";
import { GEN_VERSION } from "@/data/generator/prices";
import { AppSettings, AppSettingsSchema } from "@/domain/types";
import { AnalyticsRepository } from "@/persistence/analyticsRepository";
import { DeckActionRepository } from "@/persistence/deckActionRepository";
import { SqlDb } from "@/persistence/db";
import { migrateDatabase } from "@/persistence/migrations";
import { PortfolioRepository } from "@/persistence/portfolioRepository";
import { SavedIdeaRepository } from "@/persistence/savedIdeaRepository";
import { SettingsRepository } from "@/persistence/settingsRepository";
import { ShareSnapshotRepository } from "@/persistence/shareSnapshotRepository";
import { TransactionRepository } from "@/persistence/transactionRepository";
import { AnalyticsSink } from "./analytics";
import { MockClock } from "./clock";
import { DeckService } from "./deckService";
import { IdFactory, createId } from "./ids";
import { PortfolioService } from "./portfolioService";
import { SavedIdeaService } from "./savedIdeaService";
import { ShareService } from "./shareService";

export const DEFAULT_SETTINGS: AppSettings = {
  interests: [],
  themePref: "dark",
  haptics: true,
  reduceMotion: "system",
  onboardingDone: false,
  scenarioId: null,
  seed: "swipefolio-v1",
  clock: { dayOffset: 0 },
  sampleJourney: false,
  socialMissing: false,
};

export type ContainerOptions = {
  idFactory?: IdFactory;
  isDevelopment?: boolean;
};

export async function createContainer(
  db: SqlDb,
  initialSettings: AppSettings = DEFAULT_SETTINGS,
  options: ContainerOptions = {},
) {
  await migrateDatabase(db);
  const idFactory = options.idFactory ?? createId;
  const settingsRepository = new SettingsRepository(db);
  const storedGeneratorVersion = await settingsRepository.getGeneratorVersion();
  if (storedGeneratorVersion !== null && storedGeneratorVersion > GEN_VERSION) {
    throw new Error(
      `Generator version ${storedGeneratorVersion} is newer than this app supports.`,
    );
  }
  if (storedGeneratorVersion !== GEN_VERSION) {
    await settingsRepository.saveGeneratorVersion(GEN_VERSION);
  }
  const persistedSettings = await settingsRepository.get();
  let settings = persistedSettings ?? AppSettingsSchema.parse(initialSettings);
  if (!persistedSettings) await settingsRepository.save(settings);

  const assets = new MockAssetRepository(ASSET_FIXTURES);
  let market: MockMarketDataProvider;
  let social: MockSocialDataProvider;
  const clock = new MockClock(settings, async (updated) => {
    const validated = AppSettingsSchema.parse(updated);
    await settingsRepository.save(validated);
    settings = validated;
    market.setSeed(settings.seed);
    social.setSeed(settings.seed);
    social.setSocialMissing(settings.socialMissing ?? false);
  });
  market = new MockMarketDataProvider(ASSET_FIXTURES, settings.seed, () =>
    clock.today(),
  );
  social = new MockSocialDataProvider(ASSET_FIXTURES, settings.seed, () =>
    clock.today(),
  );
  social.setSocialMissing(settings.socialMissing ?? false);

  const repositories = {
    settings: settingsRepository,
    portfolio: new PortfolioRepository(db),
    savedIdeas: new SavedIdeaRepository(db),
    transactions: new TransactionRepository(db),
    deckActions: new DeckActionRepository(db),
    shareSnapshots: new ShareSnapshotRepository(db),
    analytics: new AnalyticsRepository(db),
  };
  const portfolio = new PortfolioService(
    db,
    repositories.portfolio,
    repositories.transactions,
    repositories.savedIdeas,
    market,
    assets,
    clock,
    idFactory,
  );
  await repositories.portfolio.ensure(idFactory("portfolio"), clock.now());

  const savedIdeas = new SavedIdeaService(
    db,
    assets,
    market,
    repositories.savedIdeas,
    repositories.transactions,
    repositories.deckActions,
    clock,
    idFactory,
  );
  const deck = new DeckService(
    assets,
    repositories.savedIdeas,
    repositories.deckActions,
    savedIdeas,
    social,
    clock,
    () => settings.seed,
    () => settings.interests,
  );
  const shares = new ShareService(repositories.shareSnapshots);
  const analytics = new AnalyticsSink(
    repositories.analytics,
    clock,
    idFactory,
    options.isDevelopment ?? isDevelopmentBuild(),
  );

  return {
    db,
    assets,
    market,
    social,
    clock,
    portfolio,
    savedIdeas,
    deck,
    shares,
    analytics,
    repositories,
    getSettings: () => settings,
    updateSettings: async (updated: AppSettings) =>
      clock.updateSettings(updated),
  };
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

declare const __DEV__: boolean;
