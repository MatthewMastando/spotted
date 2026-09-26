# Swipefolio — Implementation Plan & Contracts (phase one, mock data)

Source of truth for product requirements: `docs/SPEC.md`. This file fixes the architecture,
data contracts, and calculation rules. Deviations must be recorded in `PRODUCT_DECISIONS.md`.

## 0. Stack (pinned to Expo SDK 57, the current stable at implementation time)

Expo SDK 57 + React Native (version bundled by SDK 57) + TypeScript strict, Expo Router (typed routes),
react-native-gesture-handler, react-native-reanimated, react-native-svg, expo-sqlite, zustand, zod,
decimal.js, react-native-view-shot, expo-sharing, expo-file-system, expo-media-library, expo-haptics,
expo-clipboard, expo-font + @expo-google-fonts/inter (OFL, bundled), @expo/vector-icons (MIT).
All Expo/native deps installed with `npx expo install`. `npx expo install --check` must pass.
Tests: jest-expo + @testing-library/react-native; better-sqlite3 (dev only) for persistence tests; Maestro for native E2E.
Lint: ESLint via `npx expo lint` (eslint-config-expo) + Prettier. Typecheck: `tsc --noEmit`.
Package manager: npm (commit `package-lock.json`).

## 1. Repository layout

```
app/                       Expo Router routes (thin: compose features, no business logic)
  _layout.tsx              providers, fonts, theme, DB init, DemoBadge overlay, deep-link handling
  onboarding.tsx           intro + interests (Skip equally prominent) + "Try a sample journey"
  (tabs)/_layout.tsx       Discover | Saved | Portfolio, settings header button
  (tabs)/index.tsx         Discover
  (tabs)/saved.tsx
  (tabs)/portfolio.tsx
  asset/[id].tsx           details (pushed)
  allocate.tsx             allocation workflow (sheet/modal), params: assetIds
  share/[kind].tsx         share composer (modal): kind = idea|position|portfolio, params: id
  settings/index.tsx, settings/methodology.tsx, settings/demo.tsx
  r/[assetId].tsx          inbound link target: sample recipient journey
src/
  config/brand.ts          ONLY place for name "Swipefolio", URL scheme "swipefolio", tagline, accent
  design/                  tokens (colors dark+light, spacing, radii, type scale w/ tabular nums), theme hook
  domain/                  PURE TS. No react/react-native/expo imports. Enforced by an ESLint no-restricted-imports rule.
    types.ts               records below (zod schemas + inferred types)
    decimal.ts             Decimal config + helpers (D(), toStr, parseMoneyInput)
    time.ts                demo calendar, trading-day rules, valuation instants
    quotes.ts              freshness + fill eligibility
    returns.ts             returnSinceSave, hypothetical1000
    ledger.ts              holdings/cash/realized/equity from ledger + prices
    allocation.ts          validation + equal split
    social.ts              attention ratio + label rules
    deck.ts                deck ranking/diversity/reasons (pure, deterministic)
    share.ts               ShareSnapshot builders + caption text
    format.ts              display rounding (the ONLY place rounding happens)
  data/
    fixtures/assets.ts     60 assets: 30 stock, 15 ETF, 15 crypto (static metadata + generator params)
    fixtures/holidays.ts   NYSE holidays covering the history + forward window
    generator/rng.ts       mulberry32 + hash(seed, assetId) + Box-Muller
    generator/prices.ts    deterministic price paths
    generator/social.ts    deterministic mention counts, sentiment samples
    providers/types.ts     AssetRepository, MarketDataProvider, SocialDataProvider interfaces
    providers/mock*.ts     mock implementations
  persistence/
    db.ts                  SqlDb interface (runAsync/getAllAsync/getFirstAsync/withTransactionAsync)
    expoDb.ts              expo-sqlite adapter
    migrations.ts          versioned migrations (PRAGMA user_version)
    savedIdeaRepository.ts, transactionRepository.ts, settingsRepository.ts, deckActionRepository.ts,
    shareSnapshotRepository.ts, analyticsRepository.ts
  services/
    clock.ts               MockClock (persisted offset), the only source of "now" for outcomes
    portfolioService.ts, shareService.ts, analytics.ts, scenarios.ts, container.ts (DI)
  state/                   zustand stores (deck UI, composer UI, settings mirror)
  features/                discover/, saved/, portfolio/, details/, share/, onboarding/, settings/
  components/              shared UI (Button, Chip, Sheet, Sparkline, LineChart, MetricRow, Delta, DemoBadge...)
__tests__/ or colocated *.test.ts
test/sqliteNode.ts         better-sqlite3 adapter implementing SqlDb (tests only)
.maestro/                  native E2E flows
```

## 2. Mock time model

- `DEMO_ANCHOR_DATE = 2026-09-24` (a Thursday). Day index `d` is an integer; `d = 0` is the anchor.
- History covers `d ∈ [-365, 0]`; forward demo window `d ∈ [1, 120]`.
- Valuation instant for day d = `anchor + d days` at `20:00:00Z` (≈ US close; DST ignored, documented).
- `Clock` state persisted in settings: `{ dayOffset: number }` (0 on fresh demo). `clock.today()` returns d,
  `clock.now()` returns the valuation instant ISO string of d. Advance by 1 day / 7 days, capped at 120.
  UI never calls `Date.now()` for market outcomes. Record ordering uses insertion order (rowid), not time.
- Stock/ETF sessions: Mon–Fri except fixture NYSE holidays. Crypto: every day.
- Future prices (d > clock.today()) are never returned by providers.

## 3. Deterministic generation

- `seed: string` persisted in settings (default `"swipefolio-v1"`). Generator version constant `GEN_VERSION = 1`.
- Per asset: `rng = mulberry32(hash32(seed + ":" + assetId))`.
- Fixture params: `currentPrice` (price at d=0, decimal string), `annualDrift`, `annualVol`,
  `events: {day, movePct, spreadDays}[]` (scripted moves, used for guaranteed winners/losers/sharp moves),
  `pricePrecision` (decimals; 2 for normal, up to 8 for micro-price crypto), optional `quoteGaps: {fromDay,toDay}[]`,
  optional `unavailable: true` (no quotes at all).
- Path: log-return random walk on the asset's session days from d=-365 to d=120 (daily vol = annualVol/√252 for
  stock/ETF, /√365 for crypto), events add `ln(1+movePct)` spread evenly over `spreadDays`. Then rescale the whole
  path so `price(0) = currentPrice` (preserves every return). Round each point to `pricePrecision` with Decimal
  ROUND_HALF_EVEN, floor at one unit of the last decimal. Result is a pure function of (seed, fixtures).
- Paths are regenerated in memory at launch from the persisted seed (cheap, identical output). Persisted state =
  seed + GEN_VERSION + clock + user data. Reset offers "standard seed" (walkthrough) or "new market history" (new seed).
- Derived-not-authored: daily change, since-save return, market cap (= price × sharesOutstanding or circulatingSupply),
  P/E (= price / epsTtm), all come from the path. Never hand-author a percentage.
- Required fixture coverage (unit-tested): gains, losses, flat (|1y return| < 2%), sharp move (≥ 25% within 5 days),
  weekend crypto movement, holiday closure in forward window (2026-11-26), missing metrics (nulls), zero social baseline,
  extreme decimals (price ≥ $100,000 and a crypto < $0.0001), a stale-quote asset (gap in forward window),
  an unavailable-quote asset. No splits/distributions.
- Designated walkthrough assets (fixture flags): `demoWinner` (scripted +≥30% over d 1..21), `demoLoser`
  (scripted ≤ -20% over d 1..21).

## 4. Records (zod schemas in `domain/types.ts`; decimals are strings; times are ISO strings)

- Asset: `id` (stable, e.g. "stk_nvda"), `type: "stock"|"etf"|"crypto"`, `ticker`, `name`, `currency: "USD"`,
  `themes: ThemeId[]`, `sector`, `description` (what it is, 1 line), `thesis` (opportunity, 1 line), `risk` (1 line),
  `iconInitials`, `iconColor`, `metrics: StockMetrics | EtfMetrics | CryptoMetrics` discriminated by `kind`.
  - StockMetrics: revenueGrowthYoY, epsTtm, grossMargin, operatingMargin, revenueTtm, netIncomeTtm, cash, totalDebt,
    freeCashFlowTtm, sharesOutstanding, peers: string[]  (each number field `string | null`; null = Unavailable)
  - EtfMetrics: expenseRatio, distributionYield, top10Concentration, aum, objective, holdings: {name, weight}[],
    exposures: {label, weight}[], distributionNotes
  - CryptoMetrics: circulatingSupply, maxSupply (null = uncapped → "Not applicable"), volume24h, networkPurpose,
    supplyStructure, tokenRisks, volatility30d is DERIVED from the path, not stored.
  - "Not applicable" vs "Unavailable": inapplicable fields are simply absent from that kind's schema; null = unavailable.
- Quote: `assetId, price: string|null, quoteTime: string|null, marketState: "open"|"closed"|"24_7",
  source: "mock", isMock: true, freshness: "fresh"|"last_close"|"stale"|"unavailable"`.
- PricePoint: `assetId, time, price: string, adjustment: "none"`.
- SavedIdea: `id, assetId, savedAt (action time, mock), savedQuoteTime, savedPrice, state: "active"|"archived",
  createdByActionId`. One row per asset ever (UNIQUE asset_id); re-save restores and keeps baseline.
- Transaction: `id, idempotencyKey (UNIQUE), assetId, side: "buy"|"sell", quantity, fillPrice, amount, fee: "0",
  executedAt, savedIdeaId|null, fillBasis: "session"|"last_close"`. Append-only.
- Portfolio: `id, createdAt, initialCapital: "10000", resetGeneration`.
- SocialSnapshot: `subjectId (asset or theme), period: "24h_vs_7d", count, baseline, history: {day, count}[] (30d),
  sentiment: {bullishShare, sampleSize, sampled: true} | null, discussionThemes: string[] (fictional, marked demo),
  source: "mock", asOf`.
- ShareSnapshot: `id, templateVersion: 1, kind: "idea"|"position"|"portfolio", createdAt, basis:
  "since_saved"|"paper_position"|"portfolio"|"single_asset", display values (all pre-formatted strings AND raw
  decimals), chart: {time, price}[], markers, startTime/endTime, flags {isDemo: true, isSimulated: true},
  finePrint, theme, hideAmounts`.
- AppSettings: `interests, themePref: "system"|"dark"|"light", haptics: boolean, reduceMotion: "system"|"always",
  onboardingDone, scenarioId, seed, clock: {dayOffset}, sampleJourney: boolean`.

## 5. Calculation rules (authoritative; mirror into CALCULATIONS.md with examples as tests)

Decimal.js configured once: `precision: 40, rounding: ROUND_HALF_EVEN`. Store `toString()`; round only in `format.ts`.

- `returnSinceSave = currentPrice / savedPrice − 1`; `hypothetical1000 = 1000 × returnSinceSave` (never enters account).
- Buy with allocation A (dollars, ≤ 2 dp, ≥ 1.00) at fill P: `units = A / P` (unrounded), cash −= A.
- Holding (per asset, transactions since that asset's last sell): `units = Σ units`, `costBasis = Σ amount`,
  `avgEntry = costBasis / units`, `value = units × currentPrice`, `unrealized = value − costBasis`,
  `positionReturn = unrealized / costBasis`.
- Full close at P: `proceeds = units × P` (unrounded), cash += proceeds, `realized = proceeds − costBasis`.
- `cash = initialCapital − Σ buy.amount + Σ sell.amount`.
- `equity = cash + Σ open holding values` using one valuation instant (clock.now()) across holdings.
- `totalPaperPnL = equity − 10000`; `totalPaperReturn = totalPaperPnL / 10000`. Realized automatically included.
- Missing current price: value with last valid price and mark holding `stale`. Never zero.
- Fill eligibility: freshness `fresh` → fill (basis "session"); `last_close` → fill labeled "Paper fill at last close";
  `stale` or `unavailable` → blocked (buy and close). Stale = stock/ETF quote older than the most recent completed
  session; crypto quote older than today.
- Allocation validation: every line > 0 and ≥ $1.00, ≤ 2 dp, Σ ≤ cash exactly, no duplicate assets in a batch,
  every asset fillable. Equal split of total T over n: each = floor(T/n to cents); remainder cents added one cent at a
  time to the first lines, so Σ = T exactly.
- Idempotency: the allocation review creates `reviewId` (uuid) once; key = `${reviewId}:${assetId}`. Confirm runs in one
  DB transaction; if any key already exists, return the existing transactions and insert nothing. Confirm button
  disabled while pending. Close uses key `close:${assetId}:${openLotFirstTxId}`.
- Portfolio history: for each day from portfolio creation to today, replay ledger up to that day and value at that day's
  prices (last valid ≤ day). Includes cash.
- Spec examples (must be tests): saved 100→120: +20%, hypothetical +$200. Saved 100, buy $1000 @110, now 120: units
  9.0909…, P&L +90.909…, since-save still +20%. $2000 @100 → cash 8000, 20 units; @110 equity 10200, P&L +200 (+2%);
  close → cash 10200, realized +200. @90 instead → equity 9800, P&L −200 (−2%).

## 6. Social rules

- `count` = mentions on the current day; `baseline` = mean daily count over the preceding 7 days.
- baseline < 5 and count > 0 with baseline == 0 → "New activity"; baseline < 5 otherwise → "Insufficient history";
  else ratio label "Mentions {ratio}x usual" (1 dp). Comparison window text: "Last 24h vs 7-day daily average".
- Attention ≠ sentiment: sentiment only if fixture provides a sample (sampleSize ≥ 30), labeled
  "Sampled: {x}% bullish · {n} demo posts". Theme attention is labeled as theme-level, not asset-level.
- `socialMissing` scenario makes the provider return null → "Social data unavailable".

## 7. Deck rules (pure, deterministic)

- Candidate set = assets matching class/theme filters, excluding active saves and passes (passes persisted in
  deck_actions; "Review passed ideas" clears passes for the current filter).
- First three cards of a fresh deck (no filters, For you) are curated: one stock, one ETF, one crypto (fixture flag `starter`).
- For you: score = 2×(interest theme matches) + 1×(themes shared with saved ideas) + small stable tiebreak (hash).
  Trending: attention ratio desc (insufficient baselines last). Explore: themes/sectors NOT in interests or saves first.
- Diversity: never more than 2 consecutive cards of the same asset type or 2 consecutive of the same sector.
- Reason string per card: "Matches your {theme} interest", "Social mentions accelerating", "Explore a different sector",
  "Popular starting point" (starter).
- Exhaustion: empty state with "Change filters" and "Review passed ideas"; never loop silently.
- Undo: only the most recent deck action; blocked while a swipe animation is in flight (single in-flight action lock).
  Undo save deletes the row only if it was created by that action and has no linked transaction; if the action restored
  an archived idea, undo re-archives it; if linked to a transaction, undo is unavailable with an explanation.

## 8. Sharing

- ShareSnapshot built by pure `domain/share.ts` from state, persisted when an export happens. The card component renders
  ONLY from a snapshot; preview and export use the same component → exported numbers equal preview.
- Layouts: portrait 1080×1920, square 1080×1080; rendered off-screen at those logical sizes and captured with
  view-shot (`width/height` set so the PNG is exactly that size). Safe margins: 120px top/bottom in portrait.
- Templates: positive / negative / flat (|r| < 0.5%) × themes (at least 3). Hide-amounts toggle hides $ values only.
- Labels always: "Demo data", "Simulated", basis ("Since I saved" / "Paper position" / "Paper portfolio"),
  fine print "Excludes fees, taxes, dividends. Not investment advice.", brand + "Find your next pick". No URLs/QR codes.
- Actions: Share (expo-sharing; record `share_sheet_opened`, never "shared"), Save image (MediaLibrary, permission
  requested on tap, denial handled), Copy caption (expo-clipboard). Sharing unavailable → inline message + save option.
- Inbound: `swipefolio://asset/{id}` → details; `swipefolio://r/{assetId}` → sample recipient journey
  ("A friend spotted {ticker}" preview card marked sample → asset context → first save).

## 9. Demo scenarios (`services/scenarios.ts`, all built through real services)

Each scenario: reset DB (keep settings prefs), set seed to standard, then run scripted actions with the clock:
fresh (d=0, onboarding shown), firstThreeSaves (3 starter saves at d=0), mixedPortfolio (saves d=0, buys d=2,
advance to d=21, one closed position), winningPick (save+buy demoWinner, advance to d=21), losingPick (same with demoLoser),
unavailableQuote (held asset inside its quote gap), emptyFilteredDeck (filter with zero candidates), socialMissing.
"Try a sample journey" = mixedPortfolio with `sampleJourney = true` → persistent banner "Sample journey — not your
track record" on Saved/Portfolio and on exported cards.

## 10. Accessibility & motion

Every gesture has a button. Min 44pt targets. accessibilityLabel/role on all controls; charts have a text summary.
Honor `AccessibilityInfo.isReduceMotionEnabled` (+ settings override): swipe card uses fade/instant transitions and no
rotation. Dynamic type: no fixed-height text containers; test at 200% font scale. Tabular numbers for all figures.
Haptics on save, allocation confirm, share card creation, respecting the toggle; failures ignored.

## 11. Milestones → handoffs

1. Foundation: scaffold, tooling, domain + tests, fixtures + generator + providers, persistence + services + tests.
2. UI: all routes/features above, onboarding → deck → saved → allocate → portfolio → share → settings/demo.
3. Native verification: iOS dev build in simulator, Maestro flows, Android release compile, EAS profiles, docs, screenshots.
