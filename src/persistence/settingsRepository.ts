import { AppSettings, AppSettingsSchema } from "@/domain/types";
import { SqlDb } from "./db";

const SETTINGS_KEY = "app_settings";
const GENERATOR_VERSION_KEY = "generator_version";

export class SettingsRepository {
  constructor(private readonly db: SqlDb) {}

  async get(): Promise<AppSettings | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [SETTINGS_KEY],
    );
    if (!row) return null;
    return AppSettingsSchema.parse(JSON.parse(row.value));
  }

  async save(settings: AppSettings): Promise<void> {
    const value = JSON.stringify(AppSettingsSchema.parse(settings));
    await this.db.runAsync(
      `INSERT INTO settings(key, value) VALUES(?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [SETTINGS_KEY, value],
    );
  }

  async getGeneratorVersion(): Promise<number | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [GENERATOR_VERSION_KEY],
    );
    return row ? Number(row.value) : null;
  }

  async saveGeneratorVersion(version: number): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings(key, value) VALUES(?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [GENERATOR_VERSION_KEY, String(version)],
    );
  }
}
