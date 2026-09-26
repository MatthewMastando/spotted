import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { ThemeId } from "@/domain/types";
import { usePalette } from "@/design/theme";
import { ActionButton, AppText, Chip, Page, Panel } from "@/components/ui";
import { THEME_LABELS } from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { runScenario } from "@/services/scenarios";
import { trackEvent } from "@/services/track";
import { runMutation, updateSettings } from "@/state/appStore";
import { useSettings } from "@/state/hooks";

const INTERESTS: ThemeId[] = [
  "ai",
  "income",
  "energy",
  "crypto",
  "consumer_brands",
  "broad_market",
  "healthcare",
  "fintech",
  "semiconductors",
  "nuclear_energy",
];

export function OnboardingScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const [selected, setSelected] = useState<ThemeId[]>(settings.interests);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleInterest(interest: ThemeId) {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function continueOnboarding(skipped: boolean) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await updateSettings(container, {
        ...settings,
        interests: skipped ? [] : selected,
        onboardingDone: true,
        scenarioId: null,
        sampleJourney: false,
      });
      await trackEvent(
        container,
        skipped ? "onboarding_skipped" : "onboarding_completed",
        { selected_interest_count: skipped ? 0 : selected.length },
      );
      router.replace("/(tabs)");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save preferences.",
      );
    } finally {
      setPending(false);
    }
  }

  async function trySampleJourney() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await updateSettings(container, {
        ...settings,
        interests: selected,
      });
      await runMutation(container, () =>
        runScenario(container, "mixedPortfolio", { sampleJourney: true }),
      );
      await trackEvent(container, "onboarding_sample_journey_started");
      router.replace("/(tabs)/portfolio");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to start the sample journey.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.brand}>
        <View style={[styles.mark, { backgroundColor: palette.accent }]}>
          <AppText variant="title" color={palette.background}>
            S
          </AppText>
        </View>
        <AppText variant="label" color={palette.textSecondary}>
          SWIPEFOLIO · A PAPER INVESTING PLAYGROUND
        </AppText>
      </View>

      <View style={styles.intro}>
        <AppText variant="display">Good ideas start with a swipe.</AppText>
        <AppText variant="body" color={palette.textSecondary}>
          Find companies and funds to explore. Save the price you found them at.
          Then see how your ideas might have performed in a simulated portfolio.
        </AppText>
      </View>

      <View style={styles.steps}>
        <JourneyStep
          number="01"
          title="Discover ideas"
          detail="Browse a thoughtful deck of stocks, funds, and crypto."
        />
        <JourneyStep
          number="02"
          title="Track your picks"
          detail="Save an idea to keep its discovery price as your baseline."
        />
        <JourneyStep
          number="03"
          title="Build a paper portfolio"
          detail="Practice with simulated cash. No real money moves."
        />
      </View>

      <Panel style={styles.interestsPanel}>
        <View style={styles.interestHeading}>
          <AppText variant="title">What are you curious about?</AppText>
          <AppText variant="small" color={palette.textSecondary}>
            Pick a few topics to shape your first deck. You can change them later.
          </AppText>
        </View>
        <View style={styles.chips}>
          {INTERESTS.map((interest) => (
            <Chip
              key={interest}
              label={THEME_LABELS[interest]}
              selected={selected.includes(interest)}
              accessibilityHint="Add or remove this discovery interest"
              onPress={() => toggleInterest(interest)}
            />
          ))}
        </View>
        <View style={styles.primaryActions}>
          <ActionButton
            variant="secondary"
            accessibilityLabel="Continue to Discover"
            accessibilityHint="Save your selected interests and open the app"
            disabled={pending}
            onPress={() => void continueOnboarding(false)}
            style={styles.equalButton}
          >
            Continue
          </ActionButton>
          <ActionButton
            variant="secondary"
            accessibilityLabel="Skip interests and continue"
            accessibilityHint="Continue without selecting interests"
            disabled={pending}
            onPress={() => void continueOnboarding(true)}
            style={styles.equalButton}
          >
            Skip
          </ActionButton>
        </View>
      </Panel>

      <ActionButton
        variant="secondary"
        accessibilityLabel="Try a sample journey"
        accessibilityHint="Load a clearly labeled example portfolio and open Portfolio"
        loading={pending}
        onPress={() => void trySampleJourney()}
      >
        Try a sample journey
      </ActionButton>
      <AppText variant="small" color={palette.textMuted} style={styles.footnote}>
        Every price and result is synthetic demo data. This app does not offer
        investment advice or place trades.
      </AppText>
      {error ? (
        <Panel style={styles.errorPanel}>
          <AppText variant="small" color={palette.negative}>
            {error}
          </AppText>
        </Panel>
      ) : null}
    </Page>
  );
}

function JourneyStep({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  const palette = usePalette();
  return (
    <View style={styles.step}>
      <AppText variant="label" color={palette.accent} style={styles.stepNumber}>
        {number}
      </AppText>
      <View style={styles.stepCopy}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small" color={palette.textSecondary}>
          {detail}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 66, gap: 24 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  intro: { gap: 10, maxWidth: 560 },
  steps: { gap: 14 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stepNumber: {
    width: 38,
    flexShrink: 0,
    fontVariant: ["tabular-nums"],
  },
  stepCopy: { flex: 1, gap: 2 },
  interestsPanel: { gap: 16 },
  interestHeading: { gap: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryActions: { flexDirection: "row", gap: 10 },
  equalButton: { flex: 1 },
  footnote: { textAlign: "center" },
  errorPanel: { borderColor: "transparent" },
});
