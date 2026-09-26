import { create } from "zustand";
import { AppSettings } from "@/domain/types";
import type { AppContainer } from "@/services/ContainerContext";

type AppState = {
  dataVersion: number;
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  bumpDataVersion: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  dataVersion: 0,
  settings: null,
  setSettings: (settings) => set({ settings }),
  bumpDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));

export function publishSettings(settings: AppSettings): void {
  useAppStore.getState().setSettings(settings);
  useAppStore.getState().bumpDataVersion();
}

export async function updateSettings(
  container: AppContainer,
  settings: AppSettings,
): Promise<void> {
  await container.updateSettings(settings);
  publishSettings(container.getSettings());
}

export async function runMutation<T>(
  container: AppContainer,
  action: () => Promise<T>,
): Promise<T> {
  const result = await action();
  publishSettings(container.getSettings());
  return result;
}
