export type PortfolioHistoryPoint = {
  day: number;
  time: string;
  cash: string;
  equity: string;
  totalPaperPnL: string;
};

export type SavedIdea = import("@/domain/types").SavedIdea;
export type Transaction = import("@/domain/types").Transaction;
