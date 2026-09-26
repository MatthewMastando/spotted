import { SqlDb } from "./db";

const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS portfolio (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    initial_capital TEXT NOT NULL CHECK (initial_capital = '10000'),
    reset_generation INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS saved_ideas (
    id TEXT PRIMARY KEY NOT NULL,
    asset_id TEXT NOT NULL UNIQUE,
    saved_at TEXT NOT NULL,
    saved_quote_time TEXT,
    saved_price TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'archived')),
    created_by_action_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS deck_actions (
    id TEXT PRIMARY KEY NOT NULL,
    action_id TEXT NOT NULL UNIQUE,
    asset_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('save', 'pass')),
    save_disposition TEXT CHECK (save_disposition IN ('created', 'restored', 'already_active')),
    filter_key TEXT,
    undone INTEGER NOT NULL DEFAULT 0 CHECK (undone IN (0, 1)),
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS deck_actions_asset_action
    ON deck_actions(asset_id, action_type, undone)`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    asset_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity TEXT NOT NULL,
    fill_price TEXT NOT NULL,
    amount TEXT NOT NULL,
    fee TEXT NOT NULL CHECK (fee = '0'),
    executed_at TEXT NOT NULL,
    saved_idea_id TEXT,
    fill_basis TEXT NOT NULL CHECK (fill_basis IN ('session', 'last_close')),
    FOREIGN KEY (saved_idea_id) REFERENCES saved_ideas(id)
  )`,
  `CREATE INDEX IF NOT EXISTS transactions_asset_id ON transactions(asset_id)`,
  `CREATE TABLE IF NOT EXISTS share_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    template_version INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('idea', 'position', 'portfolio')),
    created_at TEXT NOT NULL,
    payload TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    properties TEXT NOT NULL
  )`,
];

export async function migrateDatabase(db: SqlDb): Promise<void> {
  await db.runAsync("PRAGMA foreign_keys = ON");
  const version = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const current = version?.user_version ?? 0;
  if (current > 1)
    throw new Error(
      `Database version ${current} is newer than this app supports.`,
    );
  if (current === 1) return;
  await db.withTransactionAsync(async () => {
    for (const statement of migrationStatements) await db.runAsync(statement);
    await db.runAsync("PRAGMA user_version = 1");
  });
}
