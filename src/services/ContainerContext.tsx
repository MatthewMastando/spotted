import { createContext, ReactNode, useContext } from "react";
import type { createContainer } from "./container";

export type AppContainer = Awaited<ReturnType<typeof createContainer>>;

export const ContainerContext = createContext<AppContainer | null>(null);

export function ContainerProvider({
  value,
  children,
}: {
  value: AppContainer;
  children: ReactNode;
}) {
  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): AppContainer {
  const container = useContext(ContainerContext);
  if (!container) throw new Error("The app container is not available yet.");
  return container;
}
