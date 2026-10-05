# Product decisions

- Swipefolio is a local-first paper-investing demo. Quotes, history, social attention, and discussion
  summaries are synthetic; no brokerage, live quote, or external social connection is present.
- Every demo market result uses the persisted mock clock and seed, not the device wall clock. The
  standard seed makes scenarios reproducible; reset can create a new persisted seed.
- Saving an idea captures its displayed quote as a separate baseline. A later paper allocation uses
  a currently fillable quote and creates fractional units without changing the saved baseline.
- Idea performance is measured since save. Paper performance is measured from paper fills and
  includes account cash. The two values are intentionally separate.
- Only fresh and last-close quotes can be used for new paper fills. Stale and unavailable quotes
  remain visible but block allocation and position closing where a fill cannot be made.
- Fees, taxes, interest, dividends, and slippage are excluded. Display rounding never changes stored
  decimal quantities or ledger arithmetic.
- Theme matches explain why a card appears; neither themes nor social-attention labels are ratings,
  sentiment, or recommendations. Attention is presented separately from sampled sentiment.
- Share cards describe simulated results and contain persistent demo/simulation labels and
  exclusions. They do not add tracking URLs or QR codes.
- The mixed-portfolio onboarding journey is a prebuilt sample, explicitly distinguished from a
  user's own track record in the app and its share output.
- The mobile web build uses the same Expo codebase, with a phone-width column on desktop and
  Web Share API image sharing where supported plus a download fallback.
