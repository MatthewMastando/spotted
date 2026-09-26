import { useCallback, useEffect, useState } from "react";
import { useContainer } from "@/services/ContainerContext";
import { useAppStore } from "./appStore";
import type { DeckFilters, DeckMode } from "@/domain/deck";
import type { LedgerResult } from "@/domain/ledger";
import type { SavedIdea, Transaction } from "@/domain/types";
import type { PortfolioHistoryPoint } from "./types";

export type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export function useAppQuery<T>(
  loader: () => Promise<T>,
): QueryState<T> {
  const dataVersion = useAppStore((state) => state.dataVersion);
  const [query, setQuery] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let current = true;
    void loader().then(
      (data) => {
        if (current) setQuery({ data, loading: false, error: null });
      },
      (reason: unknown) => {
        if (current)
          setQuery({
            data: null,
            loading: false,
            error:
              reason instanceof Error ? reason : new Error("Unable to load data."),
          });
      },
    );
    return () => {
      current = false;
    };
  }, [dataVersion, loader]);

  return query;
}

export function useSavedIdeas(state: "active" | "archived") {
  const container = useContainer();
  const load = useCallback(() => container.savedIdeas.list(state), [container, state]);
  return useAppQuery<SavedIdea[]>(load);
}

export type PortfolioData = {
  ledger: LedgerResult;
  history: PortfolioHistoryPoint[];
  transactions: Transaction[];
};

export function usePortfolioData() {
  const container = useContainer();
  const load = useCallback(
    async (): Promise<PortfolioData> => {
      const [ledger, history, transactions] = await Promise.all([
        container.portfolio.valuation(),
        container.portfolio.history(),
        container.repositories.transactions.list(),
      ]);
      return { ledger, history, transactions };
    },
    [container],
  );
  return useAppQuery(load);
}

export function useDeck(mode: DeckMode, filters: DeckFilters) {
  const container = useContainer();
  const load = useCallback(
    () => container.deck.getItems(mode, filters),
    [container, filters, mode],
  );
  return useAppQuery(load);
}

export function useSettings() {
  return useAppStore((state) => state.settings);
}
