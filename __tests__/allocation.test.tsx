import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/design/theme";
import { AllocationScreen } from "@/features/allocation/AllocationScreen";
import { ContainerProvider } from "@/services/ContainerContext";
import { createContainer, DEFAULT_SETTINGS } from "@/services/container";
import type { AppContainer } from "@/services/ContainerContext";
import { NodeSqlDb } from "../test/sqliteNode";

const mockRouterReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ assetIds: "stk_msft" }),
  useRouter: () => ({
    replace: mockRouterReplace,
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

describe("allocation screen", () => {
  let db: NodeSqlDb;
  let container: AppContainer;

  beforeEach(async () => {
    db = new NodeSqlDb();
    container = await createContainer(db, {
      ...DEFAULT_SETTINGS,
      onboardingDone: true,
    }, { isDevelopment: false });
    await container.savedIdeas.save("stk_msft", "allocation-test-save");
  });

  afterEach(() => {
    db.close();
    mockRouterReplace.mockReset();
  });

  test("double tapping confirm creates one transaction set", async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider preference="dark" systemScheme="dark">
          <ContainerProvider value={container}>
            <AllocationScreen />
          </ContainerProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Review allocation")).toBeTruthy(),
    );
    fireEvent.press(screen.getByText("Review allocation"));
    await waitFor(() =>
      expect(screen.getByText("Confirm paper allocation")).toBeTruthy(),
    );

    const confirm = screen.getByText("Confirm paper allocation");
    fireEvent.press(confirm);
    fireEvent.press(confirm);

    await waitFor(async () => {
      expect(
        (await container.repositories.transactions.list()).filter(
          (transaction) => transaction.side === "buy",
        ),
      ).toHaveLength(1);
    });
    expect(mockRouterReplace).toHaveBeenCalledWith("/(tabs)/portfolio");
  });
});
