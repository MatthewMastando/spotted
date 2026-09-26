import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@/design/theme";
import { DiscoverScreen } from "@/features/discover/DiscoverScreen";
import { ContainerProvider } from "@/services/ContainerContext";
import { createContainer, DEFAULT_SETTINGS } from "@/services/container";
import type { AppContainer } from "@/services/ContainerContext";
import { NodeSqlDb } from "../test/sqliteNode";

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const Animated = {
    View: React.forwardRef(
      (props: Record<string, unknown>, ref: unknown) =>
        React.createElement("View", { ...props, ref }, props.children),
    ),
  };
  return {
    __esModule: true,
    default: Animated,
    Extrapolation: { CLAMP: "clamp" },
    interpolate: () => 0,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

jest.mock("react-native-gesture-handler", () => {
  const gesture = {
    enabled() {
      return gesture;
    },
    onUpdate() {
      return gesture;
    },
    onEnd() {
      return gesture;
    },
    onFinalize() {
      return gesture;
    },
  };
  return {
    Gesture: { Pan: () => gesture },
    GestureDetector: ({ children }: { children: unknown }) => children,
  };
});

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) =>
    callback(...args),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

describe("discover deck controls", () => {
  let db: NodeSqlDb;
  let container: AppContainer;

  beforeEach(async () => {
    db = new NodeSqlDb();
    container = await createContainer(db, {
      ...DEFAULT_SETTINGS,
      onboardingDone: true,
    }, { isDevelopment: false });
  });

  afterEach(() => {
    db.close();
  });

  test("Pass, Undo, and Save update the deck through services", async () => {
    const first = (await container.deck.getItems("for_you"))[0].asset;
    const screen = await render(
      <ThemeProvider preference="dark" systemScheme="dark">
        <ContainerProvider value={container}>
          <DiscoverScreen />
        </ContainerProvider>
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /^Pass on / })).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Undo last deck action" }).props
        .accessibilityState?.disabled,
    ).toBe(true);
    fireEvent.press(screen.getByRole("button", { name: /^Pass on / }));
    await waitFor(async () => {
      expect(
        (await container.deck.getItems("for_you")).some(
          ({ asset }) => asset.id === first.id,
        ),
      ).toBe(false);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Undo last deck action" }).props
          .accessibilityState?.disabled,
      ).not.toBe(true),
    );
    fireEvent.press(
      screen.getByRole("button", { name: "Undo last deck action" }),
    );
    await waitFor(async () => {
      expect(
        (await container.deck.getItems("for_you")).some(
          ({ asset }) => asset.id === first.id,
        ),
      ).toBe(true);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Save / }).props.accessibilityState
          ?.disabled,
      ).not.toBe(true),
    );
    fireEvent.press(screen.getByRole("button", { name: /^Save / }));
    await waitFor(async () => {
      expect(await container.savedIdeas.list("active")).toHaveLength(1);
    });
    expect(screen.getByText(/Price tracked from here/)).toBeTruthy();
  });
});
