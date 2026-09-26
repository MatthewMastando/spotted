# Swipefolio calculation rules

All financial values are calculated with Decimal.js configured to 40 significant digits and
`ROUND_HALF_EVEN`. Decimal quantities and amounts are persisted as strings without display
rounding. Formatting belongs in `src/domain/format.ts`.

## Tracked idea return

`returnSinceSave = currentPrice / savedPrice - 1`

`hypothetical1000 = 1000 * returnSinceSave`

The hypothetical amount is an illustration only. It is not a paper trade and never changes cash,
holdings, or portfolio performance.

Example: an idea saved at `$100` and currently priced at `$120` has a return of `0.20`, or `+20%`.
The `$1,000` illustration is `$200`.

## Paper position

For an allocation `A` filled at price `P`:

`units = A / P`

`cash = cash - A`

For an open holding:

`units = sum(buy units) - sum(sell units)`

`costBasis = sum(buy amounts) - cost basis released by sells`

`avgEntry = costBasis / units`

`value = units * currentPrice`

`unrealizedPnL = value - costBasis`

`positionReturn = unrealizedPnL / costBasis`

Example: allocating `$1,000` at `$110` creates `9.090909…` units. At `$120`, the position is
worth `$1,090.909…` and its unrealized P&L is `$90.909…`. If the idea was saved at `$100`, its
separate since-save return is still `+20%`.

## Portfolio ledger

`cash = initialCapital - sum(buy amounts) + sum(sell proceeds)`

On a full close at price `P`, proceeds are `units * P` without rounding and realized P&L is
`proceeds - remaining costBasis`.

`equity = cash + sum(open holding values)`

`totalPaperPnL = equity - 10000`

`totalPaperReturn = totalPaperPnL / 10000`

Example: a `$10,000` account buying `$2,000` at `$100` has `$8,000` cash and 20 units. At `$110`,
equity is `$10,200`, P&L is `+$200`, and return is `+2%`. Closing at `$110` returns `$2,200` to
cash and preserves the realized `$200` gain. Closing at `$90` instead returns `$1,800` and
preserves the realized `-$200` loss.

If a quote is missing, valuation uses the latest valid price at or before the valuation day and
marks the position stale. A missing quote is never treated as zero. All holdings in a valuation
use the same mock-clock instant.

The portfolio chart uses account equity (cash plus holdings) and a fixed `$10,000` starting
balance baseline. Asset-class and primary-theme concentration use each group's current paper value
divided by total invested value; theme membership is attributed to the fixture's first theme.

## Allocation rules

Each allocation must be at least `$1.00`, positive, have at most two decimal places, use a unique
asset, and not exceed available cash. Only `fresh` and `last_close` quotes are fillable. A last
close fill is recorded with that basis; stale and unavailable quotes are blocked.

An equal split floors each share to cents and gives remainder cents to earlier lines. For example,
`$10.01 / 3` becomes `$3.34`, `$3.34`, and `$3.33`, summing exactly to `$10.01`.

Confirmations use the stable idempotency key `${reviewId}:${assetId}`. Full closes use
`close:${assetId}:${openLotFirstTxId}`. Retrying either action must not append a duplicate
transaction.

Money and price formatting groups integer digits in the rendered string only. Share-of-portfolio
labels are unsigned percentages rounded to one decimal place; these display formats do not alter
allocation amounts or ledger values.

## Share cards

Idea cards show return since the saved quote and a hypothetical `$1,000` illustration based on that
return. Position and portfolio cards show paper-ledger results. The chart is built from the
snapshot's captured price/equity history, and its displayed `As of` label uses the snapshot time and
demo-clock day when available. Export persists the same frozen snapshot shown in the preview.
