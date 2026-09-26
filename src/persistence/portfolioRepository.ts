import { Portfolio } from "@/domain/types";
import { SqlDb } from "./db";

type PortfolioRow = {
  id: string;
  created_at: string;
  initial_capital: "10000";
  reset_generation: number;
};

export class PortfolioRepository {
  constructor(private readonly db: SqlDb) {}

  async getCurrent(): Promise<Portfolio | null> {
    const row = await this.db.getFirstAsync<PortfolioRow>(
      "SELECT * FROM portfolio ORDER BY rowid DESC LIMIT 1",
    );
    return row ? toPortfolio(row) : null;
  }

  async ensure(id: string, createdAt: string): Promise<Portfolio> {
    const existing = await this.getCurrent();
    if (existing) return existing;
    return this.create(id, createdAt, 0);
  }

  async create(
    id: string,
    createdAt: string,
    resetGeneration: number,
  ): Promise<Portfolio> {
    await this.db.runAsync(
      `INSERT INTO portfolio(id, created_at, initial_capital, reset_generation)
       VALUES(?, ?, '10000', ?)`,
      [id, createdAt, resetGeneration],
    );
    return { id, createdAt, initialCapital: "10000", resetGeneration };
  }
}

function toPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    createdAt: row.created_at,
    initialCapital: row.initial_capital,
    resetGeneration: row.reset_generation,
  };
}
