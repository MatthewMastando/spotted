import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { AssetFixture, Quote } from "@/domain/types";
import {
  equalSplit,
  suggestedAllocationTotal,
  validateAllocations,
} from "@/domain/allocation";
import { fillBasisForQuote } from "@/domain/quotes";
import { formatDate, formatMoney, formatPrice } from "@/domain/format";
import { usePalette } from "@/design/theme";
import {
  ActionButton,
  AppText,
  Field,
  IconButton,
  InlineNotice,
  ListGroup,
  ListRow,
  Page,
  Section,
  ScreenHeader,
} from "@/components/ui";
import { TYPE_LABELS, quoteAsOfLabel } from "@/features/common/labels";
import { useContainer } from "@/services/ContainerContext";
import { createId } from "@/services/ids";
import { trackEvent } from "@/services/track";
import { successHaptic } from "@/services/haptics";
import { runMutation } from "@/state/appStore";
import { usePortfolioData, useSavedIdeas } from "@/state/hooks";
import { D } from "@/domain/decimal";

type AllocationRow = {
  asset: AssetFixture;
  quote: Quote;
  amount: string;
  price: string | null;
  basis: ReturnType<typeof fillBasisForQuote>;
};

const ISSUE_MESSAGES: Record<string, string> = {
  no_lines: "Choose at least one saved idea.",
  invalid_amount: "Enter a positive dollar amount with at most two decimal places.",
  below_minimum: "Each allocation must be at least $1.00.",
  duplicate_asset: "An asset can only appear once in an allocation.",
  over_cash: "The total allocation is greater than your available cash.",
  unfillable: "This asset cannot be filled while its quote is stale or unavailable.",
};

export function AllocationScreen() {
  const { assetIds } = useLocalSearchParams<{ assetIds?: string }>();
  const container = useContainer();
  const router = useRouter();
  const palette = usePalette();
  const activeIdeas = useSavedIdeas("active");
  const portfolio = usePortfolioData();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    parseAssetIds(assetIds),
  );
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [totalInput, setTotalInput] = useState("");
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const reviewId = useState(() => createId("review"))[0];
  const cash = portfolio.data?.ledger.cash ?? "0";

  useEffect(() => {
    if (selectedIds.length || !activeIdeas.data?.length) return;
    queueMicrotask(() => setSelectedIds(activeIdeas.data!.map((idea) => idea.assetId)));
  }, [activeIdeas.data, selectedIds.length]);

  const rows = useMemo<AllocationRow[]>(
    () =>
      selectedIds
        .map((assetId) => {
          const asset = container.assets.getDetails(assetId);
          if (!asset) return null;
          const quote = container.market.getQuote(assetId, container.clock.today());
          return {
            asset,
            quote,
            amount: amounts[assetId] ?? "0.00",
            price: quote.price,
            basis: fillBasisForQuote(quote),
          };
        })
        .filter((row): row is AllocationRow => row !== null),
    [amounts, container, selectedIds],
  );

  useEffect(() => {
    if (!portfolio.data || !rows.length || totalInput) return;
    const suggested = suggestedAllocationTotal(cash, rows.length);
    queueMicrotask(() => setTotalInput(suggested));
    const split = equalSplit(suggested, rows.length);
    queueMicrotask(() =>
      setAmounts(
        Object.fromEntries(rows.map((row, index) => [row.asset.id, split[index]])),
      ),
    );
  }, [cash, portfolio.data, rows, totalInput]);

  const validation = useMemo(
    () =>
      validateAllocations(
        rows.map((row) => ({
          assetId: row.asset.id,
          amount: row.amount,
          quote: row.quote,
        })),
        cash,
      ),
    [cash, rows],
  );
  const remainingCash = D(cash).minus(validation.total).toString();
  const issues = validation.issues.map((issue) => ISSUE_MESSAGES[issue] ?? issue);

  function updateAmount(assetId: string, amount: string) {
    setAmounts((current) => ({ ...current, [assetId]: amount }));
    setStep("edit");
  }

  function splitEqually() {
    try {
      const split = equalSplit(totalInput || "0", rows.length);
      setAmounts(
        Object.fromEntries(rows.map((row, index) => [row.asset.id, split[index]])),
      );
      setMessage(null);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Enter a valid total first.",
      );
    }
  }

  function remove(assetId: string) {
    setSelectedIds((current) => current.filter((id) => id !== assetId));
    setAmounts((current) => {
      const next = { ...current };
      delete next[assetId];
      return next;
    });
  }

  function review() {
    if (!validation.valid) {
      setMessage("Fix the allocation issues before reviewing.");
      return;
    }
    setMessage(null);
    setStep("review");
  }

  async function confirm() {
    if (pending || pendingRef.current || !validation.valid) return;
    pendingRef.current = true;
    setPending(true);
    setMessage(null);
    try {
      await runMutation(container, () =>
        container.portfolio.confirmAllocation(
          reviewId,
          rows.map((row) => ({ assetId: row.asset.id, amount: row.amount })),
        ),
      );
      await trackEvent(container, "portfolio_allocation_confirmed", {
        count: rows.length,
        total: validation.total,
      });
      await successHaptic(container);
      router.replace("/(tabs)/portfolio");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to confirm this allocation.",
      );
      setStep("edit");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: palette.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Page
        contentStyle={styles.content}
        footer={
          portfolio.loading && !portfolio.data
            ? undefined
            : step === "edit" ? (
                <ActionButton
                  accessibilityLabel="Review allocation"
                  accessibilityHint="Review amounts, total, and remaining cash before confirming"
                  disabled={!validation.valid || pending}
                  onPress={review}
                >
                  Review allocation
                </ActionButton>
              ) : (
                <View style={styles.footerActions}>
                  <ActionButton
                    variant="secondary"
                    accessibilityLabel="Back to edit"
                    onPress={() => setStep("edit")}
                    style={styles.footerAction}
                  >
                    Back to edit
                  </ActionButton>
                  <ActionButton
                    loading={pending}
                    accessibilityLabel="Confirm paper allocation"
                    accessibilityHint="Create the simulated paper fills and open Portfolio"
                    disabled={pending}
                    onPress={() => void confirm()}
                    style={styles.footerAction}
                  >
                    Confirm paper allocation
                  </ActionButton>
                </View>
              )
        }
      >
        <ScreenHeader
          title="Allocate"
          backLabel="Close allocation"
          onBack={() => router.back()}
        />
        <AppText variant="body" color={palette.textSecondary}>
          Choose dollar amounts. Your fill uses the current eligible mock quote,
          never the price you originally saved.
        </AppText>
        {portfolio.loading && !portfolio.data ? (
          <AppText variant="body" color={palette.textSecondary}>
            Checking available paper cash…
          </AppText>
        ) : step === "edit" ? (
          <>
            <View style={styles.totalSection}>
              <AppText variant="caption" color={palette.textMuted}>
                Amount to allocate
              </AppText>
              <Field
                label="Total allocation amount"
                accessibilityHint="Enter the total amount to split among selected ideas"
                keyboardType="decimal-pad"
                value={totalInput}
                onChangeText={(value) => {
                  setTotalInput(value);
                  setMessage(null);
                }}
                style={styles.totalField}
              />
              <AppText variant="caption" color={palette.textSecondary}>
                Available cash: {formatMoney(cash)}
              </AppText>
              <ActionButton
                variant="quiet"
                accessibilityLabel="Split total equally"
                accessibilityHint="Distribute the total using exact cent remainder handling"
                disabled={!rows.length}
                onPress={splitEqually}
                style={styles.splitButton}
              >
                Split total equally
              </ActionButton>
            </View>
            <Section title="Selected ideas">
              {rows.length ? (
                <ListGroup>
                  {rows.map((row, index) => (
                    <AllocationRowCard
                      key={row.asset.id}
                      row={row}
                      first={index === 0}
                      onChange={(amount) => updateAmount(row.asset.id, amount)}
                      onRemove={() => remove(row.asset.id)}
                    />
                  ))}
                </ListGroup>
              ) : (
                <AppText variant="body" color={palette.textSecondary}>
                  No active saved ideas were selected. Close this sheet and save
                  an idea first.
                </AppText>
              )}
            </Section>
            {issues.length ? (
              <InlineNotice>
                <View style={styles.issueList}>
                  {issues.map((issue) => (
                    <AppText key={issue} variant="small" color={palette.negative}>
                      • {issue}
                    </AppText>
                  ))}
                </View>
              </InlineNotice>
            ) : (
              <InlineNotice>
                <AppText variant="small" color={palette.textSecondary}>
                  All lines are eligible. Remaining cash after this allocation:{" "}
                  {formatMoney(remainingCash)}.
                </AppText>
              </InlineNotice>
            )}
          </>
        ) : (
          <Section title="Ready to confirm">
            <ListGroup>
              {rows.map((row, index) => (
                <ListRow
                  key={row.asset.id}
                  first={index === 0}
                  title={row.asset.ticker}
                  subtitle={`${formatPrice(row.price)} · ${
                    row.basis === "last_close"
                      ? "Paper fill at last close"
                      : `Mock fill · ${formatDate(row.quote.quoteTime)}`
                  }`}
                  trailing={
                    <AppText variant="number">
                      {formatMoney(row.amount)}
                    </AppText>
                  }
                />
              ))}
              <ListRow
                title="Total"
                trailing={
                  <AppText variant="number">
                    {formatMoney(validation.total)}
                  </AppText>
                }
              />
              <ListRow
                title="Remaining cash"
                trailing={
                  <AppText variant="number">
                    {formatMoney(remainingCash)}
                  </AppText>
                }
              />
            </ListGroup>
          </Section>
        )}
        {message ? <InlineNotice>{message}</InlineNotice> : null}
      </Page>
    </KeyboardAvoidingView>
  );
}

function AllocationRowCard({
  row,
  first,
  onChange,
  onRemove,
}: {
  row: AllocationRow;
  first: boolean;
  onChange: (amount: string) => void;
  onRemove: () => void;
}) {
  const palette = usePalette();
  const fillable = Boolean(row.basis && row.price);
  return (
    <ListRow
      first={first}
      title={row.asset.ticker}
      subtitle={
        <View style={styles.allocationSubtitle}>
          <AppText variant="small" color={palette.textSecondary}>
            {row.asset.name} · {TYPE_LABELS[row.asset.type]}
          </AppText>
          <AppText
            variant="caption"
            color={fillable ? palette.textSecondary : palette.negative}
          >
            {fillable
              ? `${formatPrice(row.price)} · ${
                  row.basis === "last_close"
                    ? "Paper fill at last close"
                    : `Mock fill · ${quoteAsOfLabel(row.quote)}`
                }`
              : row.quote.freshness === "stale"
                ? "Blocked: quote is stale."
                : "Blocked: price unavailable."}
          </AppText>
        </View>
      }
      trailing={
        <View style={styles.amountRow}>
          <Field
            label={`Allocation amount for ${row.asset.ticker}`}
            accessibilityHint="Enter a dollar amount with up to two decimal places"
            keyboardType="decimal-pad"
            value={row.amount}
            onChangeText={onChange}
            style={styles.amountField}
          />
          <AppText variant="caption">USD</AppText>
          <IconButton
            icon="close"
            accessibilityLabel={`Remove ${row.asset.ticker} from allocation`}
            onPress={onRemove}
            stopPropagation
          />
        </View>
      }
    />
  );
}

function parseAssetIds(value: string | undefined): string[] {
  return value ? value.split(",").map((id) => id.trim()).filter(Boolean) : [];
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 12,
    gap: 24,
  },
  footerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  footerAction: { flexGrow: 1, flexBasis: "42%" },
  totalSection: { gap: 8 },
  totalField: { minWidth: 180, fontSize: 30 },
  splitButton: { alignSelf: "flex-start", paddingHorizontal: 0 },
  issueList: { gap: 5 },
  allocationSubtitle: { flex: 1, gap: 3 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  amountField: { width: 92, fontSize: 18 },
});
