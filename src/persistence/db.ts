export type SqlValue = string | number | bigint | boolean | null | Uint8Array;

export type SqlRunResult = {
  changes: number;
  lastInsertRowId: number;
};

export interface SqlDb {
  runAsync(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<T | null>;
  withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;
}
