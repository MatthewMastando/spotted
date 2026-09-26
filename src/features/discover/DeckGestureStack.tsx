/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { RankedDeckItem } from "@/domain/deck";
import { usePalette } from "@/design/theme";
import { AppText } from "@/components/ui";
import { AssetCard } from "./AssetCard";
import type { AssetCardData } from "./AssetCard";

type Direction = "save" | "pass";

export function DeckGestureStack({
  current,
  next,
  data,
  reason,
  locked,
  reducedMotion,
  canSave,
  showSparkline,
  showThesis,
  clipContent,
  onSwipeStart,
  onSwipeAction,
  onDetails,
}: {
  current: RankedDeckItem;
  next: RankedDeckItem | null;
  data: AssetCardData;
  reason: string;
  locked: boolean;
  reducedMotion: boolean;
  canSave: boolean;
  showSparkline: boolean;
  showThesis: boolean;
  clipContent: boolean;
  onSwipeStart: () => void;
  onSwipeAction: (assetId: string, direction: Direction) => void;
  onDetails: () => void;
}) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  useEffect(() => {
    translationX.value = 0;
    translationY.value = 0;
    opacity.value = 1;
  }, [current.asset.id, opacity, translationX, translationY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked && width > 0)
        .onUpdate((event) => {
          translationX.value = event.translationX;
          translationY.value = event.translationY * 0.08;
        })
        .onEnd((event, success) => {
          if (!success) {
            translationX.value = withSpring(0);
            translationY.value = withSpring(0);
            return;
          }
          const threshold = width * 0.3;
          const direction: Direction | null =
            (event.translationX > threshold || event.velocityX > 850) &&
            canSave
              ? "save"
              : event.translationX < -threshold || event.velocityX < -850
                ? "pass"
                : null;
          if (!direction) {
            translationX.value = withSpring(0);
            translationY.value = withSpring(0);
            return;
          }
          const assetId = current.asset.id;
          scheduleOnRN(onSwipeStart);
          if (reducedMotion) {
            translationX.value = 0;
            translationY.value = 0;
            opacity.value = withTiming(0, { duration: 130 }, (finished) => {
              if (finished) scheduleOnRN(onSwipeAction, assetId, direction);
            });
            return;
          }
          translationX.value = withTiming(
            Math.sign(event.translationX || event.velocityX) * width * 1.35,
            { duration: 190 },
            (finished) => {
              if (finished) scheduleOnRN(onSwipeAction, assetId, direction);
            },
          );
        })
        .onFinalize((_event, success) => {
          if (!success) {
            translationX.value = withSpring(0);
            translationY.value = withSpring(0);
          }
        }),
    [
      current.asset.id,
      canSave,
      locked,
      onSwipeAction,
      onSwipeStart,
      reducedMotion,
      translationX,
      translationY,
      opacity,
      width,
    ],
  );

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      {
        rotate: reducedMotion
          ? "0deg"
          : `${interpolate(
              translationX.value,
              [-width, width],
              [-8, 8],
              Extrapolation.CLAMP,
            )}deg`,
      },
    ],
  }));
  const saveStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translationX.value,
      [16, Math.max(32, width * 0.42)],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      -translationX.value,
      [16, Math.max(32, width * 0.42)],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  function start(direction: Direction) {
    if (locked) return;
    onSwipeStart();
    if (reducedMotion) {
      opacity.value = withTiming(0, { duration: 130 }, (finished) => {
        if (finished)
          scheduleOnRN(onSwipeAction, current.asset.id, direction);
      });
      return;
    }
    translationX.value = withTiming(
      (direction === "save" ? 1 : -1) * Math.max(width, 280) * 1.35,
      { duration: 190 },
      (finished) => {
        if (finished) scheduleOnRN(onSwipeAction, current.asset.id, direction);
      },
    );
  }

  return (
    <View onLayout={onLayout} style={styles.stack}>
      {next ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.peek,
            { backgroundColor: palette.surface },
          ]}
        >
          <View style={[styles.peekIcon, { backgroundColor: next.asset.iconColor }]}>
            <AppText
              variant="label"
              color="#10130D"
              maxFontSizeMultiplier={1}
            >
              {next.asset.iconInitials}
            </AppText>
          </View>
          <View style={styles.peekCopy}>
            <AppText variant="label">{next.asset.name}</AppText>
            <AppText variant="small" color={palette.textSecondary}>
              {next.asset.ticker} · next idea
            </AppText>
          </View>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.front, cardStyle]}>
          <AssetCard
            asset={current.asset}
            data={data}
            reason={reason}
            showSparkline={showSparkline}
            showThesis={showThesis}
            clipContent={clipContent}
            onDetails={onDetails}
            interactive={!locked}
            accessibilityActions={[
              { name: "save", label: "Save idea" },
              { name: "pass", label: "Pass idea" },
              { name: "details", label: "View asset details" },
            ]}
            onAccessibilityAction={(name) => {
              if (name === "save" && canSave) start("save");
              else if (name === "pass") start("pass");
              else if (name === "details" && !locked) onDetails();
            }}
          />
          <Animated.View
            accessible={false}
            pointerEvents="none"
            style={[styles.stamp, styles.saveStamp, saveStampStyle]}
          >
            <AppText variant="title" color={palette.positive}>
              SAVE
            </AppText>
          </Animated.View>
          <Animated.View
            accessible={false}
            pointerEvents="none"
            style={[styles.stamp, styles.passStamp, passStampStyle]}
          >
            <AppText variant="title" color={palette.negative}>
              PASS
            </AppText>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: "relative", flex: 1, paddingTop: 10 },
  peek: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    minHeight: 88,
    borderRadius: 24,
    opacity: 0.55,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  peekIcon: {
    width: 40,
    minHeight: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  peekCopy: { flex: 1, gap: 3 },
  front: { position: "relative", zIndex: 1, flex: 1 },
  stamp: {
    position: "absolute",
    top: 26,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: "rgba(14,17,20,0.82)",
  },
  saveStamp: { right: 20, borderColor: "#9CCD50", transform: [{ rotate: "8deg" }] },
  passStamp: { left: 20, borderColor: "#E66A70", transform: [{ rotate: "-8deg" }] },
});
