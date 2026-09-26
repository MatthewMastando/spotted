import { z } from "zod";

export const ThemeIdSchema = z.enum([
  "ai",
  "ai_infrastructure",
  "income",
  "energy",
  "nuclear_energy",
  "crypto",
  "crypto_infrastructure",
  "consumer_brands",
  "broad_market",
  "healthcare",
  "fintech",
  "semiconductors",
  "software",
  "industrial",
  "fixed_income",
  "defense",
]);

export const StockMetricsSchema = z.object({
  kind: z.literal("stock"),
  revenueGrowthYoY: z.string().nullable(),
  epsTtm: z.string().nullable(),
  grossMargin: z.string().nullable(),
  operatingMargin: z.string().nullable(),
  revenueTtm: z.string().nullable(),
  netIncomeTtm: z.string().nullable(),
  cash: z.string().nullable(),
  totalDebt: z.string().nullable(),
  freeCashFlowTtm: z.string().nullable(),
  sharesOutstanding: z.string().nullable(),
  peers: z.array(z.string()),
});

export const EtfMetricsSchema = z.object({
  kind: z.literal("etf"),
  expenseRatio: z.string().nullable(),
  distributionYield: z.string().nullable(),
  top10Concentration: z.string().nullable(),
  aum: z.string().nullable(),
  objective: z.string(),
  holdings: z.array(z.object({ name: z.string(), weight: z.string() })),
  exposures: z.array(z.object({ label: z.string(), weight: z.string() })),
  distributionNotes: z.string(),
});

export const CryptoMetricsSchema = z.object({
  kind: z.literal("crypto"),
  circulatingSupply: z.string().nullable(),
  maxSupply: z.string().nullable(),
  volume24h: z.string().nullable(),
  networkPurpose: z.string(),
  supplyStructure: z.string(),
  tokenRisks: z.string(),
});

export const AssetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["stock", "etf", "crypto"]),
  ticker: z.string().min(1),
  name: z.string().min(1),
  currency: z.literal("USD"),
  themes: z.array(ThemeIdSchema),
  sector: z.string().min(1),
  description: z.string().min(1),
  thesis: z.string().min(1),
  risk: z.string().min(1),
  iconInitials: z.string().min(1),
  iconColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  metrics: z.discriminatedUnion("kind", [
    StockMetricsSchema,
    EtfMetricsSchema,
    CryptoMetricsSchema,
  ]),
});

export const MarketParametersSchema = z.object({
  currentPrice: z.string(),
  annualDrift: z.number(),
  annualVol: z.number().nonnegative(),
  events: z.array(
    z.object({
      day: z.number().int(),
      movePct: z.number().gt(-1),
      spreadDays: z.number().int().positive(),
    }),
  ),
  pricePrecision: z.number().int().min(0).max(8),
  quoteGaps: z
    .array(z.object({ fromDay: z.number().int(), toDay: z.number().int() }))
    .optional(),
  unavailable: z.boolean().optional(),
});

export const AssetFixtureSchema = AssetSchema.extend({
  market: MarketParametersSchema,
  flags: z
    .object({
      starter: z.boolean().optional(),
      demoWinner: z.boolean().optional(),
      demoLoser: z.boolean().optional(),
      flat: z.boolean().optional(),
      sharpMove: z.boolean().optional(),
    })
    .default({}),
  social: z
    .object({
      zeroBaseline: z.boolean().optional(),
      sampleSize: z.number().int().nonnegative().optional(),
    })
    .default({}),
});

export const QuoteSchema = z.object({
  assetId: z.string(),
  price: z.string().nullable(),
  quoteTime: z.string().datetime().nullable(),
  marketState: z.enum(["open", "closed", "24_7"]),
  source: z.literal("mock"),
  isMock: z.literal(true),
  freshness: z.enum(["fresh", "last_close", "stale", "unavailable"]),
});

export const PricePointSchema = z.object({
  assetId: z.string(),
  time: z.string().datetime(),
  price: z.string(),
  adjustment: z.literal("none"),
});

export const SavedIdeaSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  savedAt: z.string().datetime(),
  savedQuoteTime: z.string().datetime().nullable(),
  savedPrice: z.string(),
  state: z.enum(["active", "archived"]),
  createdByActionId: z.string(),
});

export const TransactionSchema = z.object({
  id: z.string(),
  idempotencyKey: z.string(),
  assetId: z.string(),
  side: z.enum(["buy", "sell"]),
  quantity: z.string(),
  fillPrice: z.string(),
  amount: z.string(),
  fee: z.literal("0"),
  executedAt: z.string().datetime(),
  savedIdeaId: z.string().nullable(),
  fillBasis: z.enum(["session", "last_close"]),
});

export const PortfolioSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  initialCapital: z.literal("10000"),
  resetGeneration: z.number().int().nonnegative(),
});

export const SocialSnapshotSchema = z.object({
  subjectId: z.string(),
  period: z.literal("24h_vs_7d"),
  count: z.number().int().nonnegative(),
  baseline: z.string(),
  history: z.array(
    z.object({ day: z.number().int(), count: z.number().int().nonnegative() }),
  ),
  sentiment: z
    .object({
      bullishShare: z.string(),
      sampleSize: z.number().int().positive(),
      sampled: z.literal(true),
    })
    .nullable(),
  discussionThemes: z.array(z.string()),
  source: z.literal("mock"),
  asOf: z.string().datetime(),
});

export const ShareSnapshotSchema = z.object({
  id: z.string(),
  templateVersion: z.literal(1),
  kind: z.enum(["idea", "position", "portfolio"]),
  createdAt: z.string().datetime(),
  basis: z.enum(["since_saved", "paper_position", "portfolio", "single_asset"]),
  assetId: z.string().nullable(),
  ticker: z.string().nullable(),
  assetName: z.string().nullable(),
  display: z.record(z.string(), z.string()),
  raw: z.record(z.string(), z.string()),
  chart: z.array(z.object({ time: z.string().datetime(), price: z.string() })),
  markers: z.array(
    z.object({ time: z.string().datetime(), label: z.string() }),
  ),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  flags: z.object({ isDemo: z.literal(true), isSimulated: z.literal(true) }),
  finePrint: z.string(),
  theme: z.string(),
  hideAmounts: z.boolean(),
});

export const AppSettingsSchema = z.object({
  interests: z.array(ThemeIdSchema),
  themePref: z.enum(["system", "dark", "light"]),
  haptics: z.boolean(),
  reduceMotion: z.enum(["system", "always"]),
  onboardingDone: z.boolean(),
  scenarioId: z.string().nullable(),
  seed: z.string(),
  clock: z.object({ dayOffset: z.number().int().min(0).max(120) }),
  sampleJourney: z.boolean(),
  socialMissing: z.boolean().optional(),
});

export type ThemeId = z.infer<typeof ThemeIdSchema>;
export type StockMetrics = z.infer<typeof StockMetricsSchema>;
export type EtfMetrics = z.infer<typeof EtfMetricsSchema>;
export type CryptoMetrics = z.infer<typeof CryptoMetricsSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type AssetFixture = z.infer<typeof AssetFixtureSchema>;
export type MarketParameters = z.infer<typeof MarketParametersSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type PricePoint = z.infer<typeof PricePointSchema>;
export type SavedIdea = z.infer<typeof SavedIdeaSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Portfolio = z.infer<typeof PortfolioSchema>;
export type SocialSnapshot = z.infer<typeof SocialSnapshotSchema>;
export type ShareSnapshot = z.infer<typeof ShareSnapshotSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
