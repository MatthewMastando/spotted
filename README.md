# Swipefolio

Swipefolio is a paper-investing playground for discovering synthetic stock, ETF, and crypto ideas,
tracking their demo prices, and testing allocations in a local simulated portfolio. It does not
connect to a brokerage, use live market data, or place orders.

## Run locally

```sh
npm ci
npx expo start
```

Open the project with an installed Expo development client or a simulator. The app stores saved
ideas, paper transactions, preferences, and share snapshots in a local SQLite database.

Useful checks:

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo install --check
npx expo export --platform ios
npx expo export --platform android
```

`npm run ios` and `npm run android` invoke Expo prebuild and native builds. Generated `ios/` and
`android/` directories are intentionally ignored; configure native changes through app config and
Expo config plugins.

## Web (mobile browser)

Use the same Expo app in a mobile browser:

```sh
npm run web
npm run web:build && npm run web:serve
```

The static preview runs at `http://localhost:8090`. Production hosting must serve the COOP and
COEP headers in `public/_headers` and use HTTPS to enable cross-origin isolation and browser SQLite.
Web data is stored locally in that browser using OPFS and is separate from native app data. The
experience works best in recent Safari and Chrome versions.

## Reviewer walkthrough

1. **Discover and save:** Choose a few interests during onboarding, then swipe or use Pass and Save
   on the Discover deck. Search also finds ideas already passed.
2. **Allocate:** After saving three ideas, choose **Build my paper portfolio**, use **Split equally**,
   review the eligible mock fill prices, and confirm the paper allocation.
3. **Advance time:** Open Settings → Demo clock → **Advance 1 week**. Return to Portfolio to inspect
   the separate paper equity, cash, and P&L values.
4. **Explore a winning result:** Settings → **Winning pick scenario** opens a deterministic paper
   position; use its Share action to preview or export a clearly labeled demo card.
5. **Compare a losing result:** Settings → **Losing pick scenario** shows the corresponding loss
   journey. Both scenarios use local services and synthetic fixtures.

The **Mixed portfolio** scenario is also labeled as a sample journey and is not a user's track
record. See [PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md), [CALCULATIONS.md](CALCULATIONS.md),
[DATA_PROVIDERS.md](DATA_PROVIDERS.md), [RELEASE.md](RELEASE.md), and
[TEST_REPORT.md](TEST_REPORT.md) for implementation and verification details.
