import type { ConfirmActionOptions } from "./confirm";

export function confirmAction(options: ConfirmActionOptions): Promise<boolean> {
  return Promise.resolve(
    window.confirm(`${options.title}\n\n${options.message}`),
  );
}
