import { SqlDb } from "./db";
import { SaveDisposition } from "./savedIdeaRepository";

export type DeckActionType = "save" | "pass";

export type DeckAction = {
  id: string;
  actionId: string;
  assetId: string;
  actionType: DeckActionType;
  saveDisposition: SaveDisposition | null;
  filterKey: string | null;
  undone: boolean;
  createdAt: string;
};

type DeckActionRow = {
  id: string;
  action_id: string;
  asset_id: string;
  action_type: DeckActionType;
  save_disposition: SaveDisposition | null;
  filter_key: string | null;
  undone: number;
  created_at: string;
};

export class DeckActionRepository {
  constructor(private readonly db: SqlDb) {}

  async record(action: DeckAction): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO deck_actions
        (id, action_id, asset_id, action_type, save_disposition, filter_key, undone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action.id,
        action.actionId,
        action.assetId,
        action.actionType,
        action.saveDisposition,
        action.filterKey,
        action.undone ? 1 : 0,
        action.createdAt,
      ],
    );
  }

  async latestUndoable(): Promise<DeckAction | null> {
    const row = await this.db.getFirstAsync<DeckActionRow>(
      "SELECT * FROM deck_actions WHERE undone = 0 ORDER BY rowid DESC LIMIT 1",
    );
    return row ? toDeckAction(row) : null;
  }

  async markUndone(id: string): Promise<void> {
    await this.db.runAsync("UPDATE deck_actions SET undone = 1 WHERE id = ?", [
      id,
    ]);
  }

  async passedIds(filterKey: string): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ asset_id: string }>(
      `SELECT asset_id FROM deck_actions
       WHERE action_type = 'pass' AND filter_key = ? AND undone = 0`,
      [filterKey],
    );
    return rows.map((row) => row.asset_id);
  }

  async hasActions(): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM deck_actions",
    );
    return (row?.count ?? 0) > 0;
  }

  async clearPassed(filterKey: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE deck_actions SET undone = 1 WHERE action_type = 'pass' AND filter_key = ?",
      [filterKey],
    );
  }
}

function toDeckAction(row: DeckActionRow): DeckAction {
  return {
    id: row.id,
    actionId: row.action_id,
    assetId: row.asset_id,
    actionType: row.action_type,
    saveDisposition: row.save_disposition,
    filterKey: row.filter_key,
    undone: row.undone === 1,
    createdAt: row.created_at,
  };
}
