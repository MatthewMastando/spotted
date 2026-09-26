import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useSettings } from "./hooks";

export function useReducedMotion(): boolean {
  const settings = useSettings();
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active) setSystemReduced(reduced);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduced,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return settings?.reduceMotion === "always" || systemReduced;
}
