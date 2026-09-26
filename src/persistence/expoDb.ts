import type { SQLiteDatabase } from "expo-sqlite";
import { SqlDb, SqlRunResult, SqlValue } from "./db";

export class ExpoSqlDb implements SqlDb {
  constructor(private readonly database: SQLiteDatabase) {}

  async runAsync(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<SqlRunResult> {
    const result = await this.database.runAsync(
      sql,
      ...normalizeParams(params),
    );
    return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
  }

  getAllAsync<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.database.getAllAsync<T>(sql, ...normalizeParams(params));
  }

  getFirstAsync<T>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<T | null> {
    return this.database.getFirstAsync<T>(sql, ...normalizeParams(params));
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    let result: T | undefined;
    await this.database.withTransactionAsync(async () => {
      result = await task();
    });
    return result as T;
  }
}

function normalizeParams(
  params: readonly SqlValue[],
): (string | number | null | Uint8Array)[] {
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "bigint") return value.toString();
    return value;
  });
}
