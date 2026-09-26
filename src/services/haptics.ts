import * as Haptics from "expo-haptics";
import type { AppContainer } from "./ContainerContext";

export async function lightHaptic(container: AppContainer): Promise<void> {
  if (!container.getSettings().haptics) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    return;
  }
}

export async function successHaptic(container: AppContainer): Promise<void> {
  if (!container.getSettings().haptics) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    return;
  }
}
