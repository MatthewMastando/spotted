import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { MAX_DEMO_DAY } from "@/domain/time";
import { formatDemoDay } from "@/domain/format";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  Chip,
  InlineNotice,
  Page,
  Panel,
  ScreenHeader,
  SectionTitle,
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
      <Panel style={styles.panel}>
        <SectionTitle title="Appearance" />
        <AppText variant="small" color={palette.textSecondary}>
          Dark is the default. System follows your device preference.
        </AppText>
        <View style={styles.chips}>
          {(["dark", "light", "system"] as const).map((value) => (
            <Chip
              key={value}
              label={value[0].toUpperCase() + value.slice(1)}
              selected={current.themePref === value}
              onPress={() => void changeSettings({ themePref: value })}
            />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip
            label={current.haptics ? "Haptics on" : "Haptics off"}
            selected={current.haptics}
            onPress={() => void changeSettings({ haptics: !current.haptics })}
          />
          <Chip
            label="Always reduce motion"
            selected={current.reduceMotion === "always"}
            onPress={() =>
              void changeSettings({
                reduceMotion: current.reduceMotion === "always" ? "system" : "always",
              })
            }
          />
        </View>
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="Learn how it works" />
        <ActionButton
          variant="secondary"
          accessibilityLabel="Open methodology"
          onPress={() => router.push("/settings/methodology")}
        >
          Methodology
        </ActionButton>
        <ActionButton
          variant="secondary"
          accessibilityLabel="Open simulation information"
          onPress={() => setMessage("Everything here is local, synthetic demo data. No orders, accounts, or live quotes are connected.")}
        >
          Simulation info
        </ActionButton>
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="Demo controls" />
        <AppText variant="body">{formatDemoDay(current.clock.dayOffset)}</AppText>
        <ActionButton
          variant="secondary"
          accessibilityLabel="Open demo clock controls"
          onPress={() => router.push("/settings/demo")}
        >
          Open demo clock
        </ActionButton>
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="Scenarios" />
        <AppText variant="small" color={palette.textSecondary}>
          Scenarios use the real local services, so every result can be explored and shared.
        </AppText>
        {SCENARIOS.map((scenario) => (
          <View key={scenario.id} style={styles.scenarioRow}>
            <View style={styles.scenarioCopy}>
              <AppText variant="label">{scenario.title}</AppText>
              <AppText variant="small" color={palette.textSecondary}>
                {scenario.detail}
              </AppText>
            </View>
            <ActionButton
              variant="quiet"
              loading={pending}
              accessibilityLabel={`Run ${scenario.title} scenario`}
              onPress={() => void selectScenario(scenario)}
              style={styles.runButton}
            >
              Run
            </ActionButton>
          </View>
        ))}
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="Reset app data" />
        <AppText variant="small" color={palette.textSecondary}>
          Remove saved ideas, paper transactions, and analytics. Choose whether the
          next synthetic market uses the standard or a new deterministic seed.
        </AppText>
        {!resetOpen ? (
          <ActionButton
            variant="danger"
            accessibilityLabel="Choose reset app data options"
            onPress={() => setResetOpen(true)}
          >
            Reset app data
          </ActionButton>
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
            <ActionButton variant="quiet" onPress={() => setResetOpen(false)}>
              Keep my data
            </ActionButton>
          </View>
        )}
      </Panel>
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
      <Panel style={styles.panel}>
        <SectionTitle title="Two deliberate baselines" />
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
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="What is excluded" />
        <AppText variant="body" color={palette.textSecondary}>
          Demo results exclude fees, taxes, dividends, interest, and slippage.
          Quantities retain full precision internally; rounding is display-only.
          Social attention is not sentiment, and a high-attention idea is not a buy score.
        </AppText>
      </Panel>
      <Panel style={styles.panel}>
        <SectionTitle title="Synthetic by design" />
        <AppText variant="body" color={palette.textSecondary}>
          Prices, history, social activity, and discussion themes are fictional,
          deterministic fixtures. This is an educational paper-investing playground,
          not investment advice or a brokerage.
        </AppText>
      </Panel>
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
      <Panel style={styles.panel}>
        <AppText variant="body">
          Swipefolio runs against a bundled set of synthetic assets. The demo clock,
          seed, saved prices, paper fills, and exported cards live on this device.
          No real money, brokerage credentials, or live market data are used.
        </AppText>
      </Panel>
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

  return (
    <Page>
      <ScreenHeader
        title="Demo clock"
        subtitle="Advance synthetic market time without using device time."
        onBack={() => router.back()}
      />
      <Panel style={styles.panel}>
        <AppText variant="display">{formatDemoDay(settings.clock.dayOffset)}</AppText>
        <View style={styles.clockActions}>
          <ActionButton
            variant="secondary"
            disabled={pending || settings.clock.dayOffset >= MAX_DEMO_DAY}
            onPress={() => void advance(1)}
          >
            Advance 1 day
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={pending || settings.clock.dayOffset > MAX_DEMO_DAY - 7}
            onPress={() => void advance(7)}
          >
            Advance 1 week
          </ActionButton>
        </View>
        {settings.clock.dayOffset >= MAX_DEMO_DAY ? (
          <AppText variant="small" color={palette.textSecondary}>
            The demo clock is at its 120-day cap. Reset or restart a scenario to rewind.
          </AppText>
        ) : null}
        <ActionButton
          variant="quiet"
          loading={pending}
          accessibilityLabel="Restart current scenario"
          onPress={() => void restart()}
        >
          Restart current scenario
        </ActionButton>
      </Panel>
      {message ? <InlineNotice>{message}</InlineNotice> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scenarioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.13)",
    paddingTop: 10,
  },
  scenarioCopy: { flex: 1, gap: 3 },
  runButton: { minHeight: 44, paddingHorizontal: 14 },
  resetChoices: { gap: 10 },
  clockActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
