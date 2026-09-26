import Database from "better-sqlite3";
import { SqlDb, SqlRunResult, SqlValue } from "@/persistence/db";

export class NodeSqlDb implements SqlDb {
  private readonly database: Database.Database;

  constructor(filename = ":memory:") {
    this.database = new Database(filename);
    this.database.pragma("foreign_keys = ON");
  }

  async runAsync(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<SqlRunResult> {
    const result = this.database.prepare(sql).run(...normalizeParams(params));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async getAllAsync<T>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<T[]> {
    return this.database.prepare(sql).all(...normalizeParams(params)) as T[];
  }

  async getFirstAsync<T>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<T | null> {
    return (
      (this.database.prepare(sql).get(...normalizeParams(params)) as
        T | undefined) ?? null
    );
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = await task();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

function normalizeParams(
  params: readonly SqlValue[],
): Array<string | number | null | Uint8Array> {
  return params.map((value) => {
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "bigint") return value.toString();
    return value;
  });
}
