import { Transaction } from "@/domain/types";
import { SqlDb } from "./db";

export class TransactionRepository {
  constructor(private readonly db: SqlDb) {}

  async list(): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<TransactionRow>(
      "SELECT * FROM transactions ORDER BY rowid ASC",
    );
    return rows.map(toTransaction);
  }

  async forAsset(assetId: string): Promise<Transaction[]> {
    const rows = await this.db.getAllAsync<TransactionRow>(
      "SELECT * FROM transactions WHERE asset_id = ? ORDER BY rowid ASC",
      [assetId],
    );
    return rows.map(toTransaction);
  }

  async byIdempotencyKeys(keys: string[]): Promise<Transaction[]> {
    if (keys.length === 0) return [];
    const placeholders = keys.map(() => "?").join(", ");
    const rows = await this.db.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions WHERE idempotency_key IN (${placeholders}) ORDER BY rowid ASC`,
      keys,
    );
    return rows.map(toTransaction);
  }

  async insert(transaction: Transaction): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO transactions (
        id, idempotency_key, asset_id, side, quantity, fill_price, amount, fee,
        executed_at, saved_idea_id, fill_basis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.idempotencyKey,
        transaction.assetId,
        transaction.side,
        transaction.quantity,
        transaction.fillPrice,
        transaction.amount,
        transaction.fee,
        transaction.executedAt,
        transaction.savedIdeaId,
        transaction.fillBasis,
      ],
    );
  }

  async hasSavedIdeaTransactions(savedIdeaId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM transactions WHERE saved_idea_id = ?",
      [savedIdeaId],
    );
    return (row?.count ?? 0) > 0;
  }
}

type TransactionRow = {
  id: string;
  idempotency_key: string;
  asset_id: string;
  side: Transaction["side"];
  quantity: string;
  fill_price: string;
  amount: string;
  fee: "0";
  executed_at: string;
  saved_idea_id: string | null;
  fill_basis: Transaction["fillBasis"];
};

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    assetId: row.asset_id,
    side: row.side,
    quantity: row.quantity,
    fillPrice: row.fill_price,
    amount: row.amount,
    fee: row.fee,
    executedAt: row.executed_at,
    savedIdeaId: row.saved_idea_id,
    fillBasis: row.fill_basis,
  };
}
