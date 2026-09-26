import type { AppContainer } from "./ContainerContext";

export async function trackEvent(
  container: AppContainer,
  name: string,
  properties: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  try {
    await container.analytics.track(name, properties);
  } catch {
    return;
  }
}
