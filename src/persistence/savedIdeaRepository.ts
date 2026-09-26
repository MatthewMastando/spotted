import { SavedIdea } from "@/domain/types";
import { SqlDb } from "./db";

type SavedIdeaRow = {
  id: string;
  asset_id: string;
  saved_at: string;
  saved_quote_time: string | null;
  saved_price: string;
  state: SavedIdea["state"];
  created_by_action_id: string;
};

export type SaveDisposition = "created" | "restored" | "already_active";

export type SaveResult = {
  savedIdea: SavedIdea;
  disposition: SaveDisposition;
};

export class SavedIdeaRepository {
  constructor(private readonly db: SqlDb) {}

  async list(state?: SavedIdea["state"]): Promise<SavedIdea[]> {
    const rows = state
      ? await this.db.getAllAsync<SavedIdeaRow>(
          "SELECT * FROM saved_ideas WHERE state = ? ORDER BY rowid DESC",
          [state],
        )
      : await this.db.getAllAsync<SavedIdeaRow>(
          "SELECT * FROM saved_ideas ORDER BY rowid DESC",
        );
    return rows.map(toSavedIdea);
  }

  async getByAssetId(assetId: string): Promise<SavedIdea | null> {
    const row = await this.db.getFirstAsync<SavedIdeaRow>(
      "SELECT * FROM saved_ideas WHERE asset_id = ?",
      [assetId],
    );
    return row ? toSavedIdea(row) : null;
  }

  async saveAtomic(input: {
    id: string;
    assetId: string;
    savedAt: string;
    savedQuoteTime: string | null;
    savedPrice: string;
    actionId: string;
  }): Promise<SaveResult> {
    const existing = await this.getByAssetId(input.assetId);
    if (existing) {
      if (existing.state === "archived") {
        await this.db.runAsync(
          "UPDATE saved_ideas SET state = 'active' WHERE id = ?",
          [existing.id],
        );
        return {
          savedIdea: { ...existing, state: "active" },
          disposition: "restored",
        };
      }
      return { savedIdea: existing, disposition: "already_active" };
    }

    await this.db.runAsync(
      `INSERT INTO saved_ideas
          (id, asset_id, saved_at, saved_quote_time, saved_price, state, created_by_action_id)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [
        input.id,
        input.assetId,
        input.savedAt,
        input.savedQuoteTime,
        input.savedPrice,
        input.actionId,
      ],
    );
    return {
      savedIdea: {
        id: input.id,
        assetId: input.assetId,
        savedAt: input.savedAt,
        savedQuoteTime: input.savedQuoteTime,
        savedPrice: input.savedPrice,
        state: "active",
        createdByActionId: input.actionId,
      },
      disposition: "created",
    };
  }

  async archive(assetId: string): Promise<boolean> {
    const result = await this.db.runAsync(
      "UPDATE saved_ideas SET state = 'archived' WHERE asset_id = ? AND state = 'active'",
      [assetId],
    );
    return result.changes > 0;
  }

  async deleteIfCreatedAndUnused(
    assetId: string,
    actionId: string,
  ): Promise<boolean> {
    const result = await this.db.runAsync(
      `DELETE FROM saved_ideas
       WHERE asset_id = ?
         AND created_by_action_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM transactions WHERE transactions.saved_idea_id = saved_ideas.id
         )`,
      [assetId, actionId],
    );
    return result.changes > 0;
  }
}

function toSavedIdea(row: SavedIdeaRow): SavedIdea {
  return {
    id: row.id,
    assetId: row.asset_id,
    savedAt: row.saved_at,
    savedQuoteTime: row.saved_quote_time,
    savedPrice: row.saved_price,
    state: row.state,
    createdByActionId: row.created_by_action_id,
  };
}
