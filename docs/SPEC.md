# Swipe Investing Mobile App Build Specification

Version 1.0 | September 26, 2026 | Prepared for Devin AI

## 1 Build assignment

Build a polished iOS and Android app that makes discovering investments feel effortless and fun. Users swipe through stocks, ETFs, and crypto, understand the opportunity through concise financial and social scorecards, save promising ideas, allocate a simulated $10,000 portfolio, and share striking performance cards showing what happened after they spotted an asset.

The first deliverable is a complete, usable mobile app powered entirely by mock data. Navigation, gestures, saving, allocations, performance calculations, persistence, animations, image export, and native sharing must actually work. Use mock information behind functional product flows, rather than disconnected screen mockups.

Deliver this implementation in a Git repository with a clear README, test evidence, screenshots, and a walkthrough. Start by documenting an implementation plan and assumptions, then execute the complete mock-data build. Resolve routine implementation choices independently. Ask only when a decision would materially change the product scope or when external credentials block a release step. Complete all independent implementation work before reporting a credential blocker.

## 2 Product intent and audience

### Audience

Casual people exploring investing through active retail investors. The default experience must be understandable without knowing financial jargon. More experienced users can expand financials, charts, and methodology.

### Core promise

Discover an interesting investment, understand why it matters, save the moment you found it, and see whether your judgment paid off.

The aspirational language is building a “10x portfolio.” Treat this as ambition and discovery, never as a promised return or a model-generated probability of a tenfold gain. Final naming is undecided; keep a configurable working name, “Swipefolio,” in one brand configuration file.

### The two value moments

1. Discovery: “I understand this opportunity in seconds, and I want to keep track of it.”
2. Payoff: “I spotted this before it moved. Here is my result.”

Sharing grows out of the second moment. Individual asset performance cards are the lead viral artifact. Portfolio P&L cards are the second format. A portfolio personality reveal is not the main payoff.

### Experience direction

Use Kalshi as an interaction reference for accessible market participation: concise cards, obvious actions, strong numbers, and a sense of momentum. Create an original visual identity. The product should feel polished and slightly gamified, with clean, impactful motion.

This is an investment discovery and paper portfolio app. Phase one excludes feeds of user posts, followers, comments, DMs, public profiles, leaderboards, real-money orders, brokerage connections, betting, and prediction markets. Engagement should reward discovery and understanding; do not introduce purchase pressure, loss chasing, or streak penalties.

## 3 Scope and defaults

| Decision | Implementation requirement |
| --- | --- |
| Platforms | Native iOS and Android from one shared codebase |
| Asset coverage | Stocks, ETFs, and crypto all appear in the first build; this is the meaning of “all assets” for this spec |
| Currency and region | USD display and simulated cash; US-listed stock and ETF fixtures, major crypto fixtures |
| Trading model | Long-only fractional paper positions; no leverage or shorting |
| Starting balance | $10,000 simulated cash |
| Swipe right | Save an idea and immutably record its price and timestamp |
| Swipe left | Pass for now; permit undo and later discovery through search |
| Portfolio funding | User explicitly allocates simulated dollars from the saved list or asset details |
| Data | Bundled fixtures and a deterministic mock market provider only |
| Identity | Local guest profile; no sign-up wall or account dependency |
| Persistence | Local database survives app restarts |
| Network | Core flow works offline; no market APIs, social APIs, or LLM calls in phase one |
| Monetization | No paywall, ads, subscription, or referral payout in the first build |
| Store destination | Build for eventual Apple App Store and Google Play distribution; first mock build is for review/testing |

Do not expand “all assets” into derivatives, futures, forex pairs, individual bonds, or every global exchange. Keep the asset schema extensible so additional types can be designed later. Coverage means all three asset classes, not an exhaustive real market catalogue.

## 4 Core journey

1. Open the app and get a one-screen introduction: discover ideas, track your picks, build a paper portfolio.
2. Optionally select interests such as AI, income, energy, crypto, consumer brands, or broad markets. Skip is equally prominent.
3. Reach a mixed asset deck immediately. The first few cards should be particularly clear and visually varied.
4. Read the one-line thesis and scan price, recent performance, key fundamentals, and social interest.
5. Swipe right to save. A brief confirmation says “Price tracked from here,” with the captured price. Swiping does not spend paper cash.
6. After three saves, offer a non-blocking “Build your $10,000 paper portfolio” action. Users can keep swiping.
7. Choose amounts or split equally among selected ideas; preview the allocation and confirm.
8. Return later to see changes since saving and actual simulated portfolio P&L.
9. Tap a result to create a share card, preview it, and open the native share sheet.

For immediate prototype review, provide a clearly labeled “Try a sample journey” option and demo time controls. This reveals the payoff without waiting days. Never present sample history as the current user's real track record.

## 5 Navigation and screens

Use three bottom tabs: Discover, Saved, Portfolio. Asset details and the share composer are pushed screens or sheets. Settings is accessible from a simple header control.

### Discover

- Large swipe card with the next card visible behind it.
- Search and filters: All, Stocks, ETFs, Crypto, plus optional themes.
- Sort or deck modes: For you, Trending, Explore. “For you” initially uses stated interests and saved themes with deterministic local rules.
- Keep diversity across asset types and sectors. Do not let a few popular assets dominate the entire deck.
- Show a brief reason for a card: “Matches your AI interest,” “Social mentions accelerating,” or “Explore a different sector.”
- Include visible Pass and Save buttons with equivalent behavior to gestures.
- Undo the latest deck action. No duplicate saves or accidental double actions during animations.
- Deck exhaustion offers changing filters or reviewing passed ideas; never loops the identical card silently.

### Asset card and details

Front of card, in order:

1. Name, ticker, asset class, theme, and recognizable local icon or initials.
2. Price, currency, as-of state, and daily price change.
3. One-line explanation of what the asset is and a separate short opportunity thesis.
4. Three relevant metrics with plain-language labels and tap-to-explain definitions.
5. Social attention indicator such as “Mentions 2.4x usual,” with a small trend chart.
6. One concise risk or counterpoint.
7. Save and Pass controls.

Do not overload the front with every metric. Details provide the full chart, financials, growth and risk context, source timestamps, related themes, and sample discussion summaries. Charts need an accessible textual summary and defined time windows. Support 1W, 1M, 3M, and 1Y where fixtures exist; disable unavailable ranges.

Use asset-specific data:

| Type | Front-card examples | Expanded details |
| --- | --- | --- |
| Stock | Revenue growth, P/E or profitability, market cap | Revenue, earnings, margins, cash, debt, cash flow, industry peers |
| ETF | Expense ratio, distribution yield, concentration | Objective, holdings, exposures, assets under management, distribution notes |
| Crypto | Market cap, circulating supply, volume | Network purpose, supply structure, token risks, volatility and liquidity |

Do not assign stock earnings metrics to crypto or judge an ETF as though it were an operating company. Missing or inapplicable values display “Unavailable” or “Not applicable,” never zero.

The scorecard is a structured overview, not a universal buy score. If category badges are included, use transparent, documented rules, asset-appropriate comparisons, and an explanation of the contributing facts. High attention must not automatically mean attractive valuation or a good investment.

### Saved

- List and optional card view with saved date, saved price, current mock price, return since saving, and portfolio allocation status.
- Sort by newest saved, best return, worst return, or social attention; filter by asset class.
- Primary actions: view details, allocate paper money, share result, archive.
- Preserve both positive and negative results. Archiving removes an idea from the active list without deleting its history or any associated position.
- Saving the same asset again restores its active entry and keeps its original tracking baseline.
- Undo of a just-completed save may delete that new record only if it has not been used by an allocation. Later position changes use explicit portfolio actions.

### Portfolio

- Header: paper portfolio value, total paper P&L in dollars and percent, and available cash.
- Value chart includes cash; use a consistent valuation timestamp across holdings.
- Holdings show amount invested, average entry price, units, current value, and paper gain/loss.
- Allocation workflow accepts dollar amounts and an equal-split shortcut. Review summary shows selected assets, total allocation, remaining cash, and a confirmation action.
- Allow adding to a holding and closing a whole position. Partial sales and full rebalance tools can wait.
- Closed positions and realized P&L remain in history. Selling must not erase losses from portfolio results.
- No negative cash, overspending, nonpositive allocation, duplicate confirmation, or creation of fractional quantities from rounded display prices.
- Include a brief concentration summary by asset class and theme. Avoid suggesting that diversification or a portfolio score guarantees returns.
- Empty state explains how to move saved ideas into the paper portfolio.

### Settings and demo controls

- Theme preference, haptics toggle, reduced-motion behavior, methodology, and concise simulation information.
- Reset app data with explicit confirmation; reset creates a new simulated history.
- Demo scenarios: fresh account, first three saves, mixed portfolio, winning pick, losing pick, unavailable quote, empty filtered deck, and social data missing.
- Advance mock time by one day or one week and restart a scenario. Show mock/demo state clearly in both the app and exported images.

## 6 Performance rules

There are two distinct baselines. Implement both deliberately because they support different user actions.

### Return since saving

A save records the exact mock quote and quote timestamp shown when the action commits, plus the action time. Preserve the entry permanently unless that immediate action is undone or the whole demo is reset.

`returnSinceSave = currentPrice / savedPrice - 1`

This is a price return on a tracked idea. It is not the user's realized profit. A save-only share card can show the percentage plus an optional fixed illustration:

`hypotheticalPnL = 1000 * returnSinceSave`

Label this “If I had put $1,000 in” or “$1,000 hypothetical.” It does not debit the paper account or count toward portfolio P&L. Do not aggregate these illustrations into account performance.

### Paper portfolio performance

A paper purchase occurs at the current eligible mock price when the user confirms an allocation, which may be later than the save. Never backdate a purchase to the saved price.

For a purchase with allocation `A` and fill price `P`:

`units = A / P`

`holdingValue = units * currentPrice`

`unrealizedPnL = holdingValue - remainingCostBasis`

For additional buys, use weighted average cost. On a full close, return the proceeds to cash and record realized P&L. Preserve all buy and sell transactions in an append-only ledger. Use an idempotency key so retries cannot duplicate a transaction.

`portfolioEquity = cash + sum(openHoldingValues)`

`totalPaperPnL = portfolioEquity - 10000`

`totalPaperReturn = totalPaperPnL / 10000`

Phase one has one initial deposit, no later deposits/withdrawals, and zero simulated fees, taxes, distributions, interest, and slippage. Label the result “Paper P&L”; do not call it after-tax or real net profit. These assumptions must be visible in methodology and share-card fine print.

Use decimal arithmetic for balances, quantities, and cost basis. Store decimal values as strings and round only for display. Quote currency is USD throughout phase one. Never hide a missing price by inserting zero; use the last valid valuation with a stale indicator, and block new fills when the quote is unavailable or too old for the configured market policy.

Stock/ETF fixtures follow market sessions; crypto fixtures operate continuously. Outside a stock/ETF session, price returns use the last close. Phase one may fill paper allocations at that last close only when explicitly labeled “Paper fill at last close”; do not invent a live off-hours trade.

### Required arithmetic examples

- Saved at $100, current $120: since-save return is +20%; $1,000 hypothetical gain is +$200.
- Saved at $100, actually allocated $1,000 at $110, current $120: paper position is approximately 9.090909 units and its P&L is approximately +$90.91. Its since-save return remains +20%.
- $10,000 account buys $2,000 at $100: cash $8,000, units 20. Price rises to $110: equity $10,200 and total paper P&L +$200 (+2%). Closing preserves $10,200 cash and +$200 realized P&L.
- Price decline to $90 before closing instead gives equity $9,800 and total paper P&L -$200 (-2%).

## 7 Sharing and growth loop

### Primary share card

Make “I spotted this” compelling enough to share without a reward or forced prompt. The card should be understandable in a social feed at thumbnail size.

Required content:

- Asset name and ticker.
- Prominent signed percentage return since saving.
- Saved price/date and latest price/as-of date.
- Short chart covering that exact period with the saved point marked.
- Clear basis: “Since I saved” for a tracked idea, or “Paper position” for allocated capital.
- Optional hypothetical $1,000 gain/loss for save-only cards; actual paper amount and P&L for positions.
- Discreet app identity and “Find your next pick.”
- Persistent readable “Demo data” and “Simulated” labels in phase one, plus relevant fee/dividend exclusions.

Provide equally polished positive, negative, and flat templates. Do not allow editing the entry price, dates, chart, or result through the composer. Let users choose a visual theme and hide dollar amounts, while keeping the return basis and timestamps visible.

### Portfolio card

Show total paper P&L, total return since portfolio creation, date range, and holdings or top contributors. The account number must include all open and closed activity. If the user chooses only one asset, label it as that asset's result rather than total account performance.

### Export and distribution

- Generate PNG images in 1080 x 1920 portrait and 1080 x 1080 square layouts from real app state.
- Preview the exact exported layout before sharing, with safe margins for social interface overlays.
- Export should be crisp, contain no clipped labels, and use locally available fonts and icons.
- Use the native iOS/Android share sheet for available messaging and social destinations. Provide copy caption and save-image functionality, requesting permission only when needed.
- Do not require X API posting, Instagram login, contacts access, or an account in this app to share.
- Only claim successful sharing when the platform supplies reliable completion evidence. Otherwise record share-sheet opening; cancellation is not success.

The intended production loop is: result card -> recipient curiosity -> asset context -> recipient's first save -> future result card. Phase one implements image sharing, navigation for inbound app links, and a sample recipient journey using fixtures. Support a configurable custom URL scheme for installed test builds. Public HTTPS links, universal/app links, store fallbacks, referral attribution, and hosted previews are phase-two services. Do not export fake working URLs or QR codes before a real domain and route exist.

Prompt sharing when a user opens a meaningful result or portfolio milestone, with a dismissible inline CTA. Avoid modal interruptions after each swipe. Do not claim guaranteed virality or invent social proof such as user counts.

## 8 Social interest and themes

Each applicable asset can show mock mention volume, change against its own baseline, an attention history, sample discussion themes, and sentiment where fixtures include sufficient evidence.

- Clearly distinguish attention from bullish/bearish sentiment.
- Explain comparison windows, for example last 24 hours versus the daily average over the preceding seven days.
- If the baseline is zero or too small, show “New activity” or “Insufficient history” rather than infinity or an enormous multiplier.
- Count queries alone cannot measure unique authors, remove bots comprehensively, or infer sentiment. Those fields must have separate inputs and availability flags.
- Label sampled sentiment as sampled and show sample size. Never call it the opinion of all investors.
- Use fictional discussion summaries or clearly marked demo posts; do not invent attributed quotations from real people.
- Themes such as AI infrastructure, nuclear energy, consumer brands, and crypto infrastructure connect assets across the deck. Use explicit fixture mappings in phase one.

For future data, company names, tickers, cashtags, and theme keywords need alias mapping and ambiguity filtering. A theme getting attention does not imply that every mapped asset is trending individually. Preserve that distinction in labels.

## 9 Visual and interaction requirements

### Design system

- Start with a refined dark default: near-black background, layered graphite cards, high-contrast text, and a restrained distinctive accent.
- Reserve positive/negative colors for meaning; combine color with signs, labels, and accessible contrast.
- Use a strong type hierarchy, tabular numbers, generous spacing, and consistent corner radii. Avoid a dense trading terminal layout.
- Use native-quality bottom sheets and controls. Charts and motion should feel purposeful rather than decorative.
- Bundle fonts and assets so offline use is complete. Use original assets or properly licensed icons.

### Motion

- Swipe follows the finger with restrained rotation, directional save/pass feedback, and a natural spring release.
- Incomplete swipes return smoothly; successful actions settle cleanly and load the next card.
- Lightweight haptics reinforce save, allocation confirmation, and share-card creation.
- Value changes animate briefly without causing layout jumps. Never animate fabricated gains.
- Aim for 60 fps swipe interaction on a representative midrange phone; keep gesture work off the JS thread where supported.
- Honor system reduced motion and screen reader settings. Every gesture has a button equivalent.
- Minimum 44-point interactive targets, support larger text, safe areas, keyboard avoidance, and accessible labels.

### Review surfaces

Verify compact and large iPhones plus a representative Android phone. Cover long asset names, large negative values, small crypto prices, missing metrics, text enlargement, share previews, and long lists. The web preview may assist review but cannot substitute for native verification.

## 10 Chosen technology stack

| Layer | Choice | Reason |
| --- | --- | --- |
| App | React Native, Expo, TypeScript | Shared native mobile app for both stores |
| Navigation | Expo Router | Typed routes and inbound-link handling |
| Builds and signing | Expo EAS Build | Hosted iOS/Android builds |
| Store upload path | EAS Submit | Cloud/CLI path to App Store Connect and Google Play |
| Gestures and animation | React Native Gesture Handler and Reanimated | Fluid native interactions |
| Haptics | expo-haptics | Device feedback with graceful fallback |
| Charts | react-native-svg with focused reusable chart components | Lightweight charts and controlled styling |
| Local persistence | expo-sqlite | Durable saved ideas, transactions, settings and migrations |
| Transient UI state | Zustand | Small, explicit stores for deck/composer state |
| Input and fixture validation | Zod | Runtime boundary checks |
| Financial calculations | decimal.js | Predictable decimal arithmetic |
| Share rendering | react-native-view-shot plus expo-sharing | Native image export and OS sharing |
| Files and optional gallery save | Expo FileSystem and MediaLibrary | Export lifecycle and permission-aware image saving |
| Tests | Jest, React Native Testing Library, Maestro | Domain correctness and native user flows |
| CI | GitHub Actions | Typecheck, lint, unit/integration checks |

Use the current stable Expo SDK and its compatible React Native/native module versions at implementation time. Install Expo packages through `npx expo install`, commit a lockfile, run Expo dependency checks, and document versions. Do not mix arbitrary latest native dependencies. Use Expo development builds as the reference runtime; Expo Go can be an optional convenience if compatible.

The owner must not need to install or operate Xcode. EAS builds iOS remotely and EAS Submit uploads from Linux, Windows, or macOS. Apple tooling still exists inside the managed build infrastructure; this is not an attempt to bypass Apple's toolchain. Physical iPhone testing can use cloud-built development/preview builds or TestFlight. Required Expo, Apple, and Google accounts/signing credentials are owner-provided when build distribution is requested.

No backend is required for the first build. Do not provision paid services or add authentication merely to hold mock data. Keep interfaces ready for future hosted persistence and server-side provider calls. Secrets must never be bundled in the mobile app when live integrations are added.

## 11 Architecture and data contracts

Organize the repository into routes, features, shared components, domain calculations, data providers, persistence, design tokens, fixtures, and tests. Business rules must be independent of rendering and mock services.

Core records:

| Record | Required fields |
| --- | --- |
| Asset | Stable ID, type, ticker, display name, USD currency, themes, description, discriminated stock/ETF/crypto metrics |
| Quote | Asset ID, decimal price, quote time, market state, source, mock flag, freshness status |
| PricePoint | Asset ID, timestamp, decimal price, adjustment convention |
| SavedIdea | ID, asset ID, saved action time, saved quote time, immutable saved price, active/archive state |
| Transaction | ID, idempotency key, asset ID, buy/sell, decimal quantity, fill price, amount, fee, execution time, linked saved idea |
| Portfolio | ID, creation time, initial capital, ledger, reset generation; computed equity is derived |
| SocialSnapshot | Asset/theme ID, period, count, baseline, attention history, optional sentiment/sample size, source and as-of time |
| ShareSnapshot | Template version, immutable display values, return basis, prices/times, mock/simulation flags |
| AppSettings | Interests, visual settings, haptics, demo scenario and clock state |

Use a discriminated union for asset metrics. A null value is distinct from zero. Add database constraints or transactions for one active saved idea per asset and atomic buy/sell operations.

Provider boundaries:

- `AssetRepository`: list, search, filter, details, related assets.
- `MarketDataProvider`: quotes and historical prices with one coherent snapshot time.
- `SocialDataProvider`: attention and optional sentiment snapshots.
- `SavedIdeaRepository`: atomic saves, archives, restoration and immediate undo.
- `PortfolioService`: validated allocations, full closes, valuations and history.
- `ShareService`: snapshot creation, render, export and native share integration.
- `Clock`: controllable mock time; UI never calls the system clock directly for market outcomes.
- `AnalyticsSink`: local debug sink for phase one; replaceable later.

Inject providers at app initialization. Keep provider-specific response shapes out of components. Future providers should be replaceable without rewriting screens or performance math. Avoid unnecessary microservices or a generic agent framework.

## 12 Mock data specification

Create at least 60 assets: 30 stocks, 15 ETFs, and 15 crypto assets. Include familiar examples and varied sectors, themes, prices, sizes, and risk profiles. Every financial value and social statistic is synthetic, even when the asset name is real.

Provide coherent historical paths of up to one year and a forward demo interval. Derive quote changes, since-save returns, portfolio valuation, and share charts from those same paths. Do not hand-author a percentage that contradicts prices.

Use a seeded scenario generator or committed deterministic fixtures. Re-rendering, navigating away, or reopening the app must not randomly alter prices. Persist the demo clock, scenario, and generated state. A fresh demo starts at its defined current point; future values are available only after the clock advances.

Include gains, losses, flat assets, sharp moves, weekend crypto movement, market closure, missing metrics, zero social baseline, extreme but valid decimal values, and stale/unavailable quotes. Do not include stock splits or distributions in the first fixture set unless the calculation treatment is also implemented and tested.

Provide a single reset action with a stable seed and a reviewer walkthrough that demonstrates first discovery, first allocation, later performance, a winning share, and a losing share. A small persistent “Demo” indicator and clear exported labels must survive every screen/theme.

## 13 Future live data path

This section guides interface design only. Phase one must run with zero provider keys.

| Need | Candidate | Constraint to preserve |
| --- | --- | --- |
| Stock financial statements | SEC EDGAR | Free source data; normalization of tags, periods, amendments and restatements still needs engineering |
| Stock/ETF prices | Marketstack or Tiingo | Public display, storage, derived metrics and social-image redistribution rights must match the chosen agreement |
| ETF metadata and holdings | Licensed ETF provider | SEC company facts alone does not supply a complete ETF scorecard |
| Crypto prices and metadata | Separate licensed crypto provider | Choose after mock UX review; stock-data pricing does not establish crypto coverage |
| X attention | Official recent post-count endpoint | Low-cost counts; supports a recent lookback, so longer baselines require accumulated history |
| X explanations | Limited post search for selected spikes | Text retrieval has separate per-post cost and content/display requirements |
| Theme mapping | Curated taxonomy and aliases | Broader theme attention and asset-specific attention remain distinct |

Research snapshot on September 26, 2026: Marketstack advertises $9.99/month Basic with 10,000 requests and commercial use, but public/share-image rights were not conclusively verified. Tiingo explicitly lists startup EOD plus IEX display redistribution at $250/month. X lists recent counts at $0.005/request and post reads at $0.005/post. Example: 100 asset queries, four checks daily, 30 days is $60 in count requests before text retrieval or other charges. These are planning inputs, not a complete live app operating budget or a license guarantee.

Later architecture should ingest shared data centrally on a schedule, cache it within provider permissions, compute metrics once, and serve all app users. Never make a paid provider call for every swipe. Use spending caps and source/freshness metadata. Validate attribution, retention, derived-data rights, social sharing, and any AI-processing rights before integration.

## 14 Product instrumentation

Phase one logs structured events locally without sending personal data externally. Suggested events: onboarding skipped/completed, deck viewed, card details opened, idea saved/passed, undo, portfolio allocation confirmed, position closed, performance viewed, share preview opened, export generated, native share sheet opened, and inbound link opened.

Primary product questions:

- Can a new person reach a first useful save within roughly 60 seconds?
- Can they understand the difference between a saved idea and a funded paper holding?
- Do they return to see how their picks performed?
- Do performance views lead to voluntary share previews and exports?
- Once hosted links exist, do recipients reach their own first save?

Treat these as validation goals, not established benchmarks. Do not equate share-sheet opening with a completed social post, or simulated growth with measured referral conversion.

## 15 Implementation sequence

### Milestone 1 Foundation and design

Initialize the Expo app, design tokens, routing, database, deterministic fixtures, and provider interfaces. Implement one polished card for each asset class and establish the interaction language. Document the plan and decisions in the repo; continue without waiting for routine design approval.

### Milestone 2 Discovery and tracking

Complete onboarding, mixed deck, search/filtering, detail views, swipe/buttons, undo, and persistent saves with immutable baselines. Include empty and unavailable-data states.

### Milestone 3 Portfolio and market simulation

Implement cash ledger, allocation review, buys, full closes, history, valuation, charts, demo time advance, and all positive/negative scenarios. Validate math before animating it.

### Milestone 4 Shareable payoff

Build both card formats, image exports, native share integration, caption copy, local inbound-link routes, and the sample recipient journey. Ensure exported numbers match the in-app state exactly.

### Milestone 5 Polish and handoff

Verify both platforms, accessibility, persistence, performance, exports, and build configuration. Capture screenshots and a short screen recording of the complete journey. Fix issues before marking the milestone complete.

Keep phase one free of production market-data integrations. If credentials for signed builds are missing, finish the code, tests, and release configuration, and identify the exact remaining owner setup. Do not substitute a browser-only prototype for the native deliverable.

## 16 Acceptance criteria

The first build is complete when:

1. A fresh install reaches a usable mixed-asset deck without login or API keys.
2. Stocks, ETFs, and crypto each have distinct, appropriate scorecards and details.
3. Search, filters, swipes, equivalent buttons, undo, and empty states work.
4. A save captures the displayed quote and timestamp once; duplicate saves do not reset the baseline.
5. Saved ideas, portfolio activity, and settings persist after force close and restart.
6. The $10,000 account supports allocation, additional buys, full closes, and accurate remaining cash.
7. Allocation and valuation follow the specified decimal rules; repeated confirmation cannot double-buy.
8. Saved return and paper P&L remain different when saving and purchasing happen at different prices.
9. Closed-position gains and losses remain in total account results.
10. Mock time produces coherent updates across cards, history, charts, holdings, and shares.
11. Both winning and losing results produce readable portrait and square PNGs with matching numbers and clear demo/simulation labels.
12. Native sharing works on iOS and Android, with graceful cancellation and unavailable-target handling.
13. Missing metrics, stale quotes, and insufficient social baselines do not cause fabricated values or crashes.
14. The main flow works offline with bundled assets and data.
15. Reduced motion, screen readers, enlarged text, and button-based navigation are usable.
16. Native build profiles and store submission configuration are present and documented.
17. Typecheck, lint, and meaningful domain/integration tests pass. Test unrounded arithmetic, duplicate transactions, persistence, archived ideas, quote freshness, and share snapshot consistency.
18. Native E2E coverage demonstrates onboarding -> save -> allocate -> advance mock time -> view P&L -> export. Include at least one loss scenario and a restart check.
19. The walkthrough includes screenshots or recordings from both mobile platforms. If a platform cannot be exercised, mark it explicitly as unverified with the exact blocker; do not claim it passed.
20. There are no nonfunctional primary buttons, placeholder result screens, hidden live API dependencies, or unresolved critical defects in the core journey.

## 17 Required repository handoff

- Source, lockfile, asset licenses, and environment template containing no secrets.
- `README.md`: installation, running, demo scenarios, tests, architecture, and device setup.
- `PRODUCT_DECISIONS.md`: material assumptions and scope choices.
- `CALCULATIONS.md`: formulas, exclusions, rounding and example cases.
- `DATA_PROVIDERS.md`: contracts and future integration candidates, with licensing uncertainties.
- `RELEASE.md`: EAS build profiles, signing/account prerequisites, store listing assets, and remaining launch steps.
- `TEST_REPORT.md`: commands run, results, devices, screenshots, and any genuine unverified items.
- Automated tests and reviewer demo instructions.
- EAS development, preview, and production profiles; preview Android APK and production AAB configurations, plus iOS cloud-build configuration.
- App icon, splash screen, and original store-screenshot-ready screens using the working brand.

Actual store publication is a later owner action. Provide a concrete release-ready configuration and checklist, but do not buy memberships, publish the app, enable live data, or represent the mock build as a live financial product. Recheck store requirements, privacy disclosures, developer accounts, data licenses, market calendars, corporate actions, and crypto data coverage before a public live-data release.

## 18 Source notes

Official sources checked for this handoff on September 26, 2026. Recheck API prices, SDK compatibility, and store workflows at implementation time.

- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo iOS submission: https://docs.expo.dev/submit/ios/
- Expo Android submission: https://docs.expo.dev/submit/android/
- Expo native image sharing: https://docs.expo.dev/versions/latest/sdk/sharing/
- Expo screenshot export: https://docs.expo.dev/tutorial/screenshot/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- SEC EDGAR APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Marketstack pricing: https://marketstack.com/pricing
- Tiingo EOD data and redistribution pricing: https://www.tiingo.com/products/end-of-day-stock-price-data
- X API pricing: https://docs.x.com/x-api/getting-started/pricing
- X recent counts: https://docs.x.com/x-api/posts/get-count-of-recent-posts

## 19 Final instruction to Devin

Optimize for one excellent native journey: discover a compelling asset, save its price, build a paper position, watch its outcome, and share a result worth showing someone. Make the experience feel complete with mock data before adding production integrations. Deliver the code, evidence, and setup instructions necessary for the owner to use and review the app on a phone.
