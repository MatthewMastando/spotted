import { ShareSnapshot } from "@/domain/types";
import { SqlDb } from "./db";

export class ShareSnapshotRepository {
  constructor(private readonly db: SqlDb) {}

  async save(snapshot: ShareSnapshot): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO share_snapshots(id, template_version, kind, created_at, payload)
       VALUES(?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.templateVersion,
        snapshot.kind,
        snapshot.createdAt,
        JSON.stringify(snapshot),
      ],
    );
  }

  async get(id: string): Promise<ShareSnapshot | null> {
    const row = await this.db.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM share_snapshots WHERE id = ?",
      [id],
    );
    return row ? (JSON.parse(row.payload) as ShareSnapshot) : null;
  }

  async list(): Promise<ShareSnapshot[]> {
    const rows = await this.db.getAllAsync<{ payload: string }>(
      "SELECT payload FROM share_snapshots ORDER BY rowid ASC",
    );
    return rows.map((row) => JSON.parse(row.payload) as ShareSnapshot);
  }
}
