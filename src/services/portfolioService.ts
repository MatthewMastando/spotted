import { AssetRepository, MarketDataProvider } from "@/data/providers/types";
import { validateAllocations } from "@/domain/allocation";
import { D, toStr } from "@/domain/decimal";
import {
  buildPortfolioHistory,
  LedgerResult,
  replayLedger,
} from "@/domain/ledger";
import { fillBasisForQuote } from "@/domain/quotes";
import { dayForInstant } from "@/domain/time";
import { Transaction, TransactionSchema } from "@/domain/types";
import { SqlDb } from "@/persistence/db";
import { PortfolioRepository } from "@/persistence/portfolioRepository";
import { SavedIdeaRepository } from "@/persistence/savedIdeaRepository";
import { TransactionRepository } from "@/persistence/transactionRepository";
import { MockClock } from "./clock";
import { IdFactory } from "./ids";

export class AllocationValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid allocation: ${issues.join(", ")}`);
    this.name = "AllocationValidationError";
  }
}

export class PortfolioService {
  constructor(
    private readonly db: SqlDb,
    private readonly portfolioRepository: PortfolioRepository,
    private readonly transactions: TransactionRepository,
    private readonly savedIdeas: SavedIdeaRepository,
    private readonly market: MarketDataProvider,
    private readonly assets: AssetRepository,
    private readonly clock: MockClock,
    private readonly idFactory: IdFactory,
  ) {}

  async confirmAllocation(
    reviewId: string,
    lines: { assetId: string; amount: string }[],
  ): Promise<Transaction[]> {
    if (!reviewId.trim()) throw new Error("A review id is required.");
    return this.db.withTransactionAsync(async () => {
      const keys = lines.map((line) => `${reviewId}:${line.assetId}`);
      const previous = await this.transactions.byIdempotencyKeys(keys);
      if (previous.length > 0) return previous;

      const current = await this.valuation();
      for (const line of lines) {
        if (!this.assets.getDetails(line.assetId)) {
          throw new Error(`Unknown asset: ${line.assetId}`);
        }
      }
      const snapshot = this.market.getQuotes(
        [...new Set(lines.map((line) => line.assetId))],
        this.clock.today(),
      );
      const quoteById = new Map(
        snapshot.quotes.map((quote) => [quote.assetId, quote]),
      );
      const allocationLines = lines.map((line) => ({
        ...line,
        quote: quoteById.get(line.assetId)!,
      }));
      const validation = validateAllocations(allocationLines, current.cash);
      if (!validation.valid)
        throw new AllocationValidationError(validation.issues);

      const createdAt = this.clock.now();
      const toInsert: Transaction[] = [];
      for (const line of allocationLines) {
        const quote = line.quote;
        const fillBasis = fillBasisForQuote(quote);
        const price = quote.price;
        if (!fillBasis || !price)
          throw new AllocationValidationError(["unfillable"]);
        const savedIdea = await this.savedIdeas.getByAssetId(line.assetId);
        toInsert.push(
          TransactionSchema.parse({
            id: this.idFactory("txn"),
            idempotencyKey: `${reviewId}:${line.assetId}`,
            assetId: line.assetId,
            side: "buy",
            quantity: toStr(D(line.amount).div(price)),
            fillPrice: price,
            amount: toStr(D(line.amount)),
            fee: "0",
            executedAt: createdAt,
            savedIdeaId: savedIdea?.id ?? null,
            fillBasis,
          }),
        );
      }
      for (const transaction of toInsert)
        await this.transactions.insert(transaction);
      return toInsert;
    });
  }

  async closePosition(assetId: string): Promise<Transaction> {
    const current = await this.valuation();
    const allTransactions = await this.transactions.forAsset(assetId);
    const holding = current.holdings.find(
      (candidate) => candidate.assetId === assetId,
    );
    if (!holding) {
      const lastTransaction = allTransactions.at(-1);
      if (
        lastTransaction?.side === "sell" &&
        lastTransaction.idempotencyKey.startsWith(`close:${assetId}:`)
      ) {
        return lastTransaction;
      }
      throw new Error(`No open position for ${assetId}.`);
    }
    const quote = this.market.getQuote(assetId, this.clock.today());
    const fillBasis = fillBasisForQuote(quote);
    if (!fillBasis || !quote.price)
      throw new AllocationValidationError(["unfillable"]);
    const idempotencyKey = `close:${assetId}:${holding.firstTransactionId}`;
    const existing = await this.transactions.byIdempotencyKeys([
      idempotencyKey,
    ]);
    if (existing.length > 0) return existing[0];
    const savedIdea = await this.savedIdeas.getByAssetId(assetId);
    const transaction = TransactionSchema.parse({
      id: this.idFactory("txn"),
      idempotencyKey,
      assetId,
      side: "sell",
      quantity: holding.units,
      fillPrice: quote.price,
      amount: toStr(D(holding.units).mul(quote.price)),
      fee: "0",
      executedAt: this.clock.now(),
      savedIdeaId: savedIdea?.id ?? allTransactions[0]?.savedIdeaId ?? null,
      fillBasis,
    });
    return this.db.withTransactionAsync(async () => {
      const concurrent = await this.transactions.byIdempotencyKeys([
        idempotencyKey,
      ]);
      if (concurrent.length > 0) return concurrent[0];
      await this.transactions.insert(transaction);
      return transaction;
    });
  }

  async valuation(): Promise<LedgerResult> {
    const portfolio = await this.ensurePortfolio();
    const transactions = await this.transactions.list();
    const assetIds = [
      ...new Set(transactions.map((transaction) => transaction.assetId)),
    ];
    const snapshot = this.market.getQuotes(assetIds, this.clock.today());
    const quotes = new Map(
      snapshot.quotes.map((quote) => [quote.assetId, quote]),
    );
    const lastValidPrices = new Map<string, string>();
    for (const assetId of assetIds) {
      const price = this.market.getLastValidPrice(assetId, this.clock.today());
      if (price) lastValidPrices.set(assetId, price);
    }
    return replayLedger({
      portfolio,
      transactions,
      quotes,
      lastValidPrices,
      valuationTime: snapshot.asOf,
    });
  }

  async history(): Promise<
    {
      day: number;
      time: string;
      cash: string;
      equity: string;
      totalPaperPnL: string;
    }[]
  > {
    const portfolio = await this.ensurePortfolio();
    const transactions = await this.transactions.list();
    return buildPortfolioHistory({
      portfolio,
      transactions,
      createdDay: Math.max(0, dayForInstant(portfolio.createdAt)),
      today: this.clock.today(),
      getQuote: (assetId, day) => this.market.getQuote(assetId, day),
      getLastValidPrice: (assetId, day) =>
        this.market.getLastValidPrice(assetId, day),
    });
  }

  async resetPortfolio(): Promise<void> {
    const current = await this.ensurePortfolio();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync("DELETE FROM transactions");
      await this.db.runAsync("DELETE FROM saved_ideas");
      await this.db.runAsync("DELETE FROM deck_actions");
      await this.db.runAsync("DELETE FROM share_snapshots");
      await this.db.runAsync("DELETE FROM analytics_events");
      await this.db.runAsync("DELETE FROM portfolio");
      await this.portfolioRepository.create(
        this.idFactory("portfolio"),
        this.clock.now(),
        current.resetGeneration + 1,
      );
    });
  }

  private async ensurePortfolio() {
    const portfolio = await this.portfolioRepository.ensure(
      this.idFactory("portfolio"),
      this.clock.now(),
    );
    if (portfolio.initialCapital !== "10000")
      throw new Error("Unexpected portfolio capital.");
    return portfolio;
  }
}
