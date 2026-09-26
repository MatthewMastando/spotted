import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { dateForDay, MAX_DEMO_DAY } from "@/domain/time";
import { formatDate, formatDemoDay } from "@/domain/format";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  InlineNotice,
  ListGroup,
  ListRow,
  Page,
  Section,
  Segmented,
  ScreenHeader,
  SwitchRow,
} from "@/components/ui";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { runScenario, ScenarioId } from "@/services/scenarios";
import { trackEvent } from "@/services/track";
import { runMutation, updateSettings } from "@/state/appStore";
import { useSettings } from "@/state/hooks";

const SCENARIOS: {
  id: ScenarioId;
  title: string;
  detail: string;
  route: "/(tabs)" | "/(tabs)/saved" | "/(tabs)/portfolio";
}[] = [
  { id: "fresh", title: "Fresh account", detail: "A clean deck with no saved ideas.", route: "/(tabs)" },
  { id: "firstThreeSaves", title: "First three saves", detail: "Starter stock, ETF, and crypto ideas.", route: "/(tabs)/saved" },
  { id: "mixedPortfolio", title: "Mixed portfolio", detail: "Three tracked ideas and a closed crypto result.", route: "/(tabs)/portfolio" },
  { id: "winningPick", title: "Winning pick", detail: "A simulated position after a strong move.", route: "/(tabs)/portfolio" },
  { id: "losingPick", title: "Losing pick", detail: "A simulated position after a sharp decline.", route: "/(tabs)/portfolio" },
  { id: "unavailableQuote", title: "Unavailable quote", detail: "A saved position with a quote gap.", route: "/(tabs)/portfolio" },
  { id: "emptyFilteredDeck", title: "Empty filtered deck", detail: "A filter with no matching ideas.", route: "/(tabs)" },
  { id: "socialMissing", title: "Social data missing", detail: "Attention data unavailable for the deck.", route: "/(tabs)" },
];

export function SettingsScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const current = useSettings() ?? container.getSettings();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function changeSettings(patch: Partial<typeof current>) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await updateSettings(container, { ...current, ...patch });
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to update settings.");
    } finally {
      setPending(false);
    }
  }

  async function reset(seed: "standard" | "new") {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await runMutation(container, async () => {
        await container.portfolio.resetPortfolio();
        await container.clock.reset();
        await container.updateSettings({
          ...current,
          seed: seed === "standard" ? "swipefolio-v1" : createId("market"),
          clock: { dayOffset: 0 },
          scenarioId: null,
          sampleJourney: false,
          socialMissing: false,
          onboardingDone: true,
        });
      });
      setResetOpen(false);
      router.replace("/(tabs)");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to reset app data.");
    } finally {
      setPending(false);
    }
  }

  async function selectScenario(scenario: (typeof SCENARIOS)[number]) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await runMutation(container, () =>
        runScenario(container, scenario.id, {
          sampleJourney: scenario.id === "mixedPortfolio",
        }),
      );
      await trackEvent(container, "scenario_started", { scenario_id: scenario.id });
      router.replace(scenario.route);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to run this scenario.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Page>
      <ScreenHeader
        title="Settings"
        subtitle="Tune the demo, then jump back into discovery."
        onBack={() => router.back()}
      />
      <Section title="Appearance">
        <AppText variant="small" color={palette.textSecondary}>
          Dark is the default. System follows your device preference.
        </AppText>
        <Segmented
          accessibilityLabel="Appearance theme"
          value={current.themePref}
          onChange={(value) => void changeSettings({ themePref: value })}
          options={(["dark", "light", "system"] as const).map((value) => ({
            value,
            label: value[0].toUpperCase() + value.slice(1),
            accessibilityLabel: value[0].toUpperCase() + value.slice(1),
          }))}
        />
        <ListGroup>
          <SwitchRow
            first
            label={current.haptics ? "Haptics on" : "Haptics off"}
            accessibilityLabel={current.haptics ? "Haptics on" : "Haptics off"}
            value={current.haptics}
            onValueChange={(haptics) => void changeSettings({ haptics })}
          />
          <SwitchRow
            label="Always reduce motion"
            value={current.reduceMotion === "always"}
            onValueChange={(enabled) =>
              void changeSettings({
                reduceMotion: enabled ? "always" : "system",
              })
            }
          />
        </ListGroup>
      </Section>
      <Section title="Learn how it works">
        <ListGroup>
          <ListRow
            first
            title="Methodology"
            accessibilityLabel="Open methodology"
            onPress={() => router.push("/settings/methodology")}
            chevron
          />
          <ListRow
            title="Simulation info"
            accessibilityLabel="Open simulation information"
            onPress={() =>
              setMessage(
                "Everything here is local, synthetic demo data. No orders, accounts, or live quotes are connected.",
              )
            }
            chevron
          />
        </ListGroup>
      </Section>
      <Section title="Demo controls">
        <ListGroup>
          <ListRow
            first
            title="Demo clock"
            subtitle={formatDemoDay(current.clock.dayOffset)}
            accessibilityLabel="Open demo clock controls"
            onPress={() => router.push("/settings/demo")}
            chevron
          />
        </ListGroup>
      </Section>
      <Section title="Scenarios">
        <AppText variant="small" color={palette.textSecondary}>
          Scenarios use the real local services, so every result can be explored and shared.
        </AppText>
        <ListGroup>
          {SCENARIOS.map((scenario, index) => (
            <ListRow
              key={scenario.id}
              first={index === 0}
              title={scenario.title}
              subtitle={scenario.detail}
              trailing={
                <ActionButton
                  variant="quiet"
                  loading={pending}
                  accessibilityLabel={`Run ${scenario.title} scenario`}
                  onPress={() => void selectScenario(scenario)}
                  style={styles.runButton}
                >
                  Run
                </ActionButton>
              }
            />
          ))}
        </ListGroup>
      </Section>
      <Section title="Reset app data">
        <AppText variant="small" color={palette.textSecondary}>
          Remove saved ideas, paper transactions, and analytics. Choose whether the
          next synthetic market uses the standard or a new deterministic seed.
        </AppText>
        {!resetOpen ? (
          <ListGroup>
            <ListRow
              first
              title="Reset app data"
              destructive
              accessibilityLabel="Choose reset app data options"
              onPress={() => setResetOpen(true)}
              chevron
            />
          </ListGroup>
        ) : (
          <View style={styles.resetChoices}>
            <AppText variant="label">Choose a reset seed</AppText>
            <ActionButton
              variant="secondary"
              loading={pending}
              onPress={() => void reset("standard")}
            >
              Standard seed
            </ActionButton>
            <ActionButton
              variant="secondary"
              loading={pending}
              onPress={() => void reset("new")}
            >
              New market history
            </ActionButton>
            <ActionButton
              variant="quiet"
              onPress={() => setResetOpen(false)}
            >
              Keep my data
            </ActionButton>
          </View>
        )}
      </Section>
      {message ? <InlineNotice>{message}</InlineNotice> : null}
    </Page>
  );
}

export function MethodologyScreen() {
  const palette = usePalette();
  const router = useRouter();
  return (
    <Page>
      <ScreenHeader
        title="Methodology"
        subtitle="A plain-language guide to the demo scorecard."
        onBack={() => router.back()}
      />
      <Section title="Two deliberate baselines">
        <AppText variant="body" color={palette.textSecondary}>
          Since-save return compares the current mock price with the exact quote
          captured when you saved an idea. Paper P&L compares simulated holdings
          with their later fill prices and includes cash in account equity.
        </AppText>
        <AppText variant="body" color={palette.textSecondary}>
          Fills use the current eligible mock quote. A session quote is a session
          fill; a closed-market quote is labeled last close. Stale and unavailable
          quotes block new fills.
        </AppText>
      </Section>
      <Section title="What is excluded">
        <AppText variant="body" color={palette.textSecondary}>
          Demo results exclude fees, taxes, dividends, interest, and slippage.
          Quantities retain full precision internally; rounding is display-only.
          Social attention is not sentiment, and a high-attention idea is not a buy score.
        </AppText>
      </Section>
      <Section title="Synthetic by design">
        <AppText variant="body" color={palette.textSecondary}>
          Prices, history, social activity, and discussion themes are fictional,
          deterministic fixtures. This is an educational paper-investing playground,
          not investment advice or a brokerage.
        </AppText>
      </Section>
    </Page>
  );
}

export function SimulationInfoScreen() {
  const router = useRouter();
  return (
    <Page>
      <ScreenHeader
        title="Simulation info"
        subtitle="Local-only paper investing."
        onBack={() => router.back()}
      />
      <AppText variant="body">
        Swipefolio runs against a bundled set of synthetic assets. The demo clock,
        seed, saved prices, paper fills, and exported cards live on this device.
        No real money, brokerage credentials, or live market data are used.
      </AppText>
    </Page>
  );
}

export function DemoControlsScreen() {
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const settings = useSettings() ?? container.getSettings();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function advance(days: 1 | 7) {
    if (pending || settings.clock.dayOffset >= MAX_DEMO_DAY) return;
    setPending(true);
    try {
      await runMutation(container, () => container.clock.advance(days));
      await trackEvent(container, "demo_clock_advanced", { days });
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to advance demo time.");
    } finally {
      setPending(false);
    }
  }

  async function restart() {
    const scenario = (settings.scenarioId as ScenarioId | null) ?? "fresh";
    const definition = SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0];
    setPending(true);
    try {
      await runMutation(container, () =>
        runScenario(container, definition.id, {
          sampleJourney: definition.id === "mixedPortfolio",
        }),
      );
      router.replace(definition.route);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Unable to restart scenario.");
    } finally {
      setPending(false);
    }
  }

  async function selectScenario(scenario: (typeof SCENARIOS)[number]) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await runMutation(container, () =>
        runScenario(container, scenario.id, {
          sampleJourney: scenario.id === "mixedPortfolio",
        }),
      );
      await trackEvent(container, "scenario_started", {
        scenario_id: scenario.id,
      });
      router.replace(scenario.route);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to run this scenario.",
      );
    } finally {
      setPending(false);
    }
  }

  const day = settings.clock.dayOffset;

  return (
    <Page>
      <ScreenHeader
        title="Demo clock"
        subtitle="Advance synthetic market time without using device time."
        onBack={() => router.back()}
      />
      <Section title="Current date">
        <AppText variant="display">Day {day}</AppText>
        <AppText variant="caption" color={palette.textSecondary}>
          {formatDate(dateForDay(day))}
        </AppText>
        <View style={styles.clockActions}>
          <ActionButton
            variant="secondary"
            disabled={pending || day >= MAX_DEMO_DAY}
            onPress={() => void advance(1)}
          >
            Advance 1 day
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={pending || day > MAX_DEMO_DAY - 7}
            onPress={() => void advance(7)}
          >
            Advance 1 week
          </ActionButton>
        </View>
        {day >= MAX_DEMO_DAY ? (
          <AppText variant="small" color={palette.textSecondary}>
            The demo clock is at its 120-day cap. Reset or restart a scenario to rewind.
          </AppText>
        ) : null}
      </Section>
      <Section title="Current scenario">
        <ListGroup>
          <ListRow
            first
            title="Restart current scenario"
            accessibilityLabel="Restart current scenario"
            onPress={() => void restart()}
            disabled={pending}
          />
        </ListGroup>
      </Section>
      <Section title="Scenarios">
        <ListGroup>
          {SCENARIOS.map((scenario, index) => (
            <ListRow
              key={scenario.id}
              first={index === 0}
              title={scenario.title}
              subtitle={scenario.detail}
              accessibilityLabel={`Run ${scenario.title} scenario`}
              onPress={() => void selectScenario(scenario)}
              disabled={pending}
            />
          ))}
        </ListGroup>
      </Section>
      {message ? <InlineNotice>{message}</InlineNotice> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  runButton: { minHeight: 44, paddingHorizontal: 14 },
  resetChoices: { gap: 10 },
  clockActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
