import type { RefObject } from "react";
import { Image, PixelRatio } from "react-native";
import type { View } from "react-native";
import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

export type ShareOutcome = "shared" | "cancelled" | "unavailable";
export type SaveOutcome = "saved" | "denied";
export const SAVE_SUCCESS_MESSAGE = "Saved image to your photo library.";

export async function captureCard(
  target: RefObject<View | null>,
  size: { width: number; height: number },
): Promise<string> {
  if (!target.current) throw new Error("Card preview is not ready.");
  const uri = await captureRef(target, {
    format: "png",
    quality: 1,
    result: "tmpfile",
    width: size.width / PixelRatio.get(),
    height: size.height / PixelRatio.get(),
  });
  const dimensions = await Image.getSize(uri);
  if (dimensions.width !== size.width || dimensions.height !== size.height) {
    throw new Error(
      `Export dimensions were ${dimensions.width}×${dimensions.height}; expected ${size.width}×${size.height}.`,
    );
  }
  return uri;
}

export async function isShareAvailable(uri: string): Promise<boolean> {
  void uri;
  return Sharing.isAvailableAsync();
}

export async function shareImage(
  uri: string,
  options: { dialogTitle: string },
): Promise<ShareOutcome> {
  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: options.dialogTitle,
  });
  return "shared";
}

export async function saveImage(uri: string): Promise<SaveOutcome> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) return "denied";
  await MediaLibrary.createAssetAsync(uri);
  return "saved";
}
