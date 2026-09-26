import { SqlDb } from "./db";

export type AnalyticsEvent = {
  id: string;
  name: string;
  occurredAt: string;
  properties: Record<string, string | number | boolean | null>;
};

export class AnalyticsRepository {
  constructor(private readonly db: SqlDb) {}

  async record(event: AnalyticsEvent): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO analytics_events(id, name, occurred_at, properties)
       VALUES(?, ?, ?, ?)`,
      [
        event.id,
        event.name,
        event.occurredAt,
        JSON.stringify(event.properties),
      ],
    );
  }

  async list(): Promise<AnalyticsEvent[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      name: string;
      occurred_at: string;
      properties: string;
    }>("SELECT * FROM analytics_events ORDER BY rowid ASC");
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      occurredAt: row.occurred_at,
      properties: JSON.parse(row.properties) as AnalyticsEvent["properties"],
    }));
  }
}
