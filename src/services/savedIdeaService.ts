import { D, toStr } from "@/domain/decimal";
import { AssetRepository, MarketDataProvider } from "@/data/providers/types";
import { SqlDb } from "@/persistence/db";
import { DeckActionRepository } from "@/persistence/deckActionRepository";
import {
  SavedIdeaRepository,
  SaveResult,
} from "@/persistence/savedIdeaRepository";
import { TransactionRepository } from "@/persistence/transactionRepository";
import { MockClock } from "./clock";
import { IdFactory } from "./ids";

export class SavedIdeaService {
  private inFlightActionId: string | null = null;

  constructor(
    private readonly db: SqlDb,
    private readonly assets: AssetRepository,
    private readonly market: MarketDataProvider,
    private readonly savedIdeas: SavedIdeaRepository,
    private readonly transactions: TransactionRepository,
    private readonly actions: DeckActionRepository,
    private readonly clock: MockClock,
    private readonly idFactory: IdFactory,
  ) {}

  async save(
    assetId: string,
    actionId: string,
    filterKey: string | null = null,
  ): Promise<SaveResult> {
    return this.runDeckAction(actionId, async () => {
      const asset = this.assets.getDetails(assetId);
      if (!asset) throw new Error(`Unknown asset: ${assetId}`);
      const quote = this.market.getQuote(assetId, this.clock.today());
      const savedPrice =
        quote.price ??
        this.market.getLastValidPrice(assetId, this.clock.today());
      if (!savedPrice || !D(savedPrice).gt(0)) {
        throw new Error(
          `Cannot save ${assetId} without a valid displayed price.`,
        );
      }

      return this.db.withTransactionAsync(async () => {
        const result = await this.savedIdeas.saveAtomic({
          id: this.idFactory("saved"),
          assetId,
          savedAt: this.clock.now(),
          savedQuoteTime: quote.quoteTime,
          savedPrice: toStr(D(savedPrice)),
          actionId,
        });
        await this.actions.record({
          id: this.idFactory("action"),
          actionId,
          assetId,
          actionType: "save",
          saveDisposition: result.disposition,
          filterKey,
          undone: false,
          createdAt: this.clock.now(),
        });
        return result;
      });
    });
  }

  async pass(
    assetId: string,
    actionId: string,
    filterKey: string,
  ): Promise<void> {
    await this.runDeckAction(actionId, async () => {
      const asset = this.assets.getDetails(assetId);
      if (!asset) throw new Error(`Unknown asset: ${assetId}`);
      await this.actions.record({
        id: this.idFactory("action"),
        actionId,
        assetId,
        actionType: "pass",
        saveDisposition: null,
        filterKey,
        undone: false,
        createdAt: this.clock.now(),
      });
    });
  }

  async archive(assetId: string): Promise<boolean> {
    return this.savedIdeas.archive(assetId);
  }

  async undoLatest(): Promise<{ undone: boolean; reason?: string }> {
    if (this.inFlightActionId !== null)
      return { undone: false, reason: "action_in_flight" };
    return this.runDeckAction("undo", () =>
      this.db.withTransactionAsync(async () => {
        const action = await this.actions.latestUndoable();
        if (!action) return { undone: false, reason: "nothing_to_undo" };
        if (
          action.actionType === "save" &&
          action.saveDisposition === "created"
        ) {
          const idea = await this.savedIdeas.getByAssetId(action.assetId);
          if (
            idea &&
            (await this.transactions.hasSavedIdeaTransactions(idea.id))
          ) {
            return { undone: false, reason: "funded_idea" };
          }
          const deleted = await this.savedIdeas.deleteIfCreatedAndUnused(
            action.assetId,
            action.actionId,
          );
          if (!deleted) return { undone: false, reason: "idea_changed" };
        } else if (
          action.actionType === "save" &&
          action.saveDisposition === "restored"
        ) {
          await this.savedIdeas.archive(action.assetId);
        }
        await this.actions.markUndone(action.id);
        return { undone: true };
      }),
    );
  }

  async hasUndoableAction(): Promise<boolean> {
    return (await this.actions.latestUndoable()) !== null;
  }

  async list(state?: "active" | "archived") {
    return this.savedIdeas.list(state);
  }

  async passedIds(filterKey: string): Promise<string[]> {
    return this.actions.passedIds(filterKey);
  }

  async runDeckAction<T>(
    actionId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    if (this.inFlightActionId !== null && this.inFlightActionId !== actionId) {
      throw new Error("A deck action is already in progress.");
    }
    const ownsLock = this.inFlightActionId === null;
    if (ownsLock) this.inFlightActionId = actionId;
    try {
      return await action();
    } finally {
      if (ownsLock) this.inFlightActionId = null;
    }
  }
}
