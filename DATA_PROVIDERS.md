# Data providers

Swipefolio ships with deterministic local providers. No provider calls a network service.

## Interfaces

The contracts are in `src/data/providers/types.ts`:

- `AssetRepository` lists fixtures, searches names/tickers, filters by type or theme, looks up a
  detail fixture, and returns related assets.
- `MarketDataProvider` returns a single `MarketSnapshot` (`asOf` plus quotes), an individual quote,
  price history, and the most recent valid price for an asset.
- `SocialDataProvider` returns a day-bounded `SocialSnapshot` or `null`, and exposes a toggle for
  intentionally missing social data.

`MockAssetRepository`, `MockMarketDataProvider`, and `MockSocialDataProvider` implement these
interfaces in `src/data/providers/`. Price paths and social activity are generated from the fixture,
seed, and mock-clock day in `src/data/generator/`. The providers do not serve observations beyond
the current demo day.

## Replacing a mock

Implement the same interfaces for the intended source, keep quote snapshots coherent and bounded by
the supplied demo/session time, and preserve `null` for unavailable metrics instead of inventing
values. Wire the adapter through `createContainer` in `src/services/container.ts` and add tests for
freshness, missing data, and provider/service contracts. Keep network and vendor models out of
`src/domain`; the domain should continue to receive already-loaded values.

`SqlDb` and the repositories in `src/persistence/` are separate from market providers. Analytics
events and share snapshots are stored locally as well.
