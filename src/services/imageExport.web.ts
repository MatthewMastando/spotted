import type { RefObject } from "react";
import { Image, View } from "react-native";
import { captureRef } from "react-native-view-shot";

export type ShareOutcome = "shared" | "cancelled" | "unavailable";
export type SaveOutcome = "saved" | "denied";
export const SAVE_SUCCESS_MESSAGE = "Image downloaded.";

export async function captureCard(
  target: RefObject<View | null>,
  size: { width: number; height: number },
): Promise<string> {
  if (!target.current) throw new Error("Card preview is not ready.");
  const uri = await captureRef(target, {
    format: "png",
    quality: 1,
    result: "data-uri",
    width: size.width,
    height: size.height,
  });
  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => reject(new Error("Unable to read captured image dimensions.")),
      );
    },
  );
  if (dimensions.width !== size.width || dimensions.height !== size.height) {
    throw new Error(
      `Export dimensions were ${dimensions.width}×${dimensions.height}; expected ${size.width}×${size.height}.`,
    );
  }
  return uri;
}

async function createShareFile(uri: string): Promise<File> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new File([blob], "swipefolio-result.png", { type: "image/png" });
}

export async function isShareAvailable(uri: string): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof File === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }
  const file = await createShareFile(uri);
  return navigator.canShare({ files: [file] });
}

export async function shareImage(
  uri: string,
  options: { dialogTitle: string },
): Promise<ShareOutcome> {
  if (!(await isShareAvailable(uri))) return "unavailable";
  const file = await createShareFile(uri);
  try {
    await navigator.share({ files: [file], title: options.dialogTitle });
    return "shared";
  } catch (reason) {
    if (
      reason &&
      typeof reason === "object" &&
      "name" in reason &&
      reason.name === "AbortError"
    ) {
      return "cancelled";
    }
    if (
      reason &&
      typeof reason === "object" &&
      "name" in reason &&
      reason.name === "NotAllowedError"
    ) {
      return "unavailable";
    }
    throw reason;
  }
}

export async function saveImage(uri: string): Promise<SaveOutcome> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "swipefolio-result.png";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  return "saved";
}
