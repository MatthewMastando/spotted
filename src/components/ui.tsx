import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDemoDay } from "@/domain/format";
import { usePalette } from "@/design/theme";
import { useAppStore } from "@/state/appStore";

type TextVariant = "display" | "title" | "body" | "small" | "label" | "number";

const textStyle: Record<TextVariant, TextStyle> = {
  display: { fontSize: 34, fontWeight: "700", lineHeight: 42 },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 29 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: "600", lineHeight: 18, letterSpacing: 0.4 },
  number: {
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
};

const fontForVariant: Record<TextVariant, string> = {
  display: "Inter_700Bold",
  title: "Inter_700Bold",
  body: "Inter_400Regular",
  small: "Inter_400Regular",
  label: "Inter_600SemiBold",
  number: "Inter_600SemiBold",
};

export function AppText({
  variant = "body",
  color,
  style,
  ...props
}: TextProps & { variant?: TextVariant; color?: string }) {
  const palette = usePalette();
  return (
    <Text
      allowFontScaling
      {...props}
      style={[
        { color: color ?? palette.text, fontFamily: fontForVariant[variant] },
        textStyle[variant],
        style,
      ]}
    />
  );
}

export function Page({
  children,
  contentStyle,
  scrollable = true,
  ...props
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
} & ViewProps) {
  const palette = usePalette();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.page, { backgroundColor: palette.background }]}
      {...props}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.pageContent, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.pageContent, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Panel({
  children,
  style,
  ...props
}: ViewProps & { children: ReactNode }) {
  const palette = usePalette();
  return (
    <View
      {...props}
      style={[
        styles.panel,
        { backgroundColor: palette.surface, borderColor: palette.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export function ActionButton({
  children,
  variant = "primary",
  disabled,
  loading,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: Omit<PressableProps, "children"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  const palette = usePalette();
  const background =
    variant === "primary"
      ? palette.accent
      : variant === "danger"
        ? palette.negative
        : variant === "secondary"
          ? palette.surfaceRaised
          : "transparent";
  const foreground =
    variant === "primary" || variant === "danger"
      ? "#10130D"
      : palette.text;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === "string" ? children : undefined)
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === "quiet" ? "transparent" : palette.border,
          opacity: disabled ? 0.45 : state.pressed ? 0.78 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : typeof children === "string" ? (
        <AppText variant="label" color={foreground}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  accessibilityLabel,
  selected = false,
  onPress,
  accessibilityHint,
  style,
}: {
  label: string;
  accessibilityLabel?: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const content = (
    <AppText variant="small" color={selected ? palette.background : palette.text}>
      {label}
    </AppText>
  );
  const background = selected ? palette.accent : palette.surfaceRaised;
  if (!onPress) {
    return (
      <View style={[styles.chip, { backgroundColor: background }, style]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: background, opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function InlineNotice({
  children,
  pointerEvents,
  style,
}: {
  children: ReactNode;
  pointerEvents?: ViewProps["pointerEvents"];
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.notice,
        { backgroundColor: palette.surfaceRaised, borderColor: palette.border },
        style,
      ]}
    >
      {typeof children === "string" ? (
        <AppText variant="small" color={palette.textSecondary}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

export function Field({
  label,
  accessibilityHint,
  style,
  ...props
}: TextInputProps & { label: string; accessibilityHint?: string }) {
  const palette = usePalette();
  return (
    <TextInput
      {...props}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      placeholderTextColor={palette.textMuted}
      allowFontScaling
      style={[
        styles.field,
        { color: palette.text, backgroundColor: palette.surfaceRaised },
        style,
      ]}
    />
  );
}

export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="title">{title}</AppText>
      {trailing}
    </View>
  );
}

export function PageTitle({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const palette = usePalette();
  return (
    <View style={styles.pageTitle}>
      <View style={styles.pageTitleCopy}>
        {eyebrow ? (
          <AppText variant="label" color={palette.accent}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="display">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color={palette.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  right,
  backLabel = "Go back",
  showDemo = true,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  backLabel?: string;
  showDemo?: boolean;
}) {
  const palette = usePalette();
  const day = useAppStore((state) => state.settings?.clock.dayOffset ?? 0);
  return (
    <View style={styles.screenHeader}>
      {onBack ? (
        <ActionButton
          variant="quiet"
          accessibilityLabel={backLabel}
          accessibilityHint="Return to the previous screen"
          onPress={onBack}
          style={styles.screenBack}
        >
          ←
        </ActionButton>
      ) : null}
      <View style={styles.screenHeaderCopy}>
        {eyebrow ? (
          <AppText variant="label" color={palette.accent}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="display">{title}</AppText>
        {showDemo ? (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={formatDemoDay(day)}
            style={[
              styles.demoBadge,
              { backgroundColor: palette.surfaceRaised, borderColor: palette.border },
            ]}
          >
            <AppText variant="label" color={palette.textSecondary}>
              {formatDemoDay(day)}
            </AppText>
          </View>
        ) : null}
        {subtitle ? (
          <AppText variant="body" color={palette.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.screenRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  notice: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  field: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageTitle: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  pageTitleCopy: { flex: 1, gap: 6 },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  screenBack: { minWidth: 44, minHeight: 44, paddingHorizontal: 6 },
  screenHeaderCopy: { flex: 1, gap: 4 },
  screenRight: { alignItems: "flex-end" },
  demoBadge: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
