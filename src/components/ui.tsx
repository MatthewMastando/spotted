import { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  PixelRatio,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { formatDemoDay } from "@/domain/format";
import { usePalette } from "@/design/theme";
import { useAppStore } from "@/state/appStore";

type TextVariant =
  | "hero"
  | "display"
  | "title"
  | "headline"
  | "body"
  | "small"
  | "caption"
  | "label"
  | "number";

const textStyle: Record<TextVariant, TextStyle> = {
  hero: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  display: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, lineHeight: 18 },
  number: {
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
  },
};

const fontForVariant: Record<TextVariant, string> = {
  hero: "Inter_600SemiBold",
  display: "Inter_700Bold",
  title: "Inter_600SemiBold",
  headline: "Inter_600SemiBold",
  body: "Inter_400Regular",
  small: "Inter_400Regular",
  caption: "Inter_400Regular",
  label: "Inter_600SemiBold",
  number: "Inter_600SemiBold",
};

function isTextContent(children: ReactNode): boolean {
  if (typeof children === "string" || typeof children === "number") return true;
  return (
    Array.isArray(children) &&
    children.length > 0 &&
    children.every(
      (child) => typeof child === "string" || typeof child === "number",
    )
  );
}

function textContent(children: ReactNode): string | undefined {
  if (!isTextContent(children)) return undefined;
  return Array.isArray(children) ? children.join("") : String(children);
}

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
  footer,
  ...props
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  footer?: ReactNode;
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
      {footer ? <PageFooter>{footer}</PageFooter> : null}
    </SafeAreaView>
  );
}

function PageFooter({ children }: { children: ReactNode }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: palette.background,
          borderTopColor: palette.separator,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {children}
    </View>
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
        { backgroundColor: palette.surface },
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
      accessibilityLabel={accessibilityLabel ?? textContent(children)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      style={(state) => [
        styles.button,
        {
          backgroundColor: background,
          opacity: disabled ? 0.45 : state.pressed ? 0.78 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : isTextContent(children) ? (
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
  const fontScale = PixelRatio.getFontScale();
  const largeText = fontScale > 1.35;
  const largeMinWidth = 26 + label.length * 6.5 * fontScale;
  const content = (
    <AppText
      variant="small"
      numberOfLines={largeText ? 2 : undefined}
      color={selected ? palette.background : palette.textSecondary}
      style={[styles.chipText, largeText && styles.chipTextLarge]}
    >
      {label}
    </AppText>
  );
  const background = selected ? palette.text : palette.surfaceRaised;
  if (!onPress) {
    return (
      <View
        style={[
          styles.chip,
          largeText && { minWidth: largeMinWidth },
          { backgroundColor: background },
          style,
        ]}
      >
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
      hitSlop={5}
      style={({ pressed }) => [
        styles.chip,
        largeText && { minWidth: largeMinWidth },
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
        { backgroundColor: palette.surfaceRaised },
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
      <AppText variant="headline">{title}</AppText>
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

export function DemoPill() {
  const palette = usePalette();
  const day = useAppStore((state) => state.settings?.clock.dayOffset ?? 0);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={formatDemoDay(day)}
      style={[styles.demoPill, { backgroundColor: palette.surfaceRaised }]}
    >
      <AppText variant="caption" color={palette.textSecondary} numberOfLines={1}>
        {day === 0 ? "Demo" : `Demo · Day ${day}`}
      </AppText>
    </View>
  );
}

export function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  disabled,
  testID,
  variant = "filled",
  size = "md",
  stopPropagation = false,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: "filled" | "plain";
  size?: "md" | "sm";
  stopPropagation?: boolean;
}) {
  const palette = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={(event) => {
        if (stopPropagation) event.stopPropagation();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        size === "sm" ? styles.iconButtonSmall : null,
        {
          backgroundColor:
            variant === "filled" ? palette.surfaceRaised : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={size === "sm" ? 20 : variant === "plain" ? 26 : 20}
        color={palette.text}
        accessible={false}
      />
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  backLabel = "Go back",
  showDemo = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  backLabel?: string;
  showDemo?: boolean;
}) {
  const palette = usePalette();
  const largeText = PixelRatio.getFontScale() > 1.35;
  if (onBack) {
    return (
      <View style={styles.navBar}>
        <View style={styles.navSide}>
          <IconButton
            icon="chevron-left"
            variant="plain"
            accessibilityLabel={backLabel}
            accessibilityHint="Return to the previous screen"
            onPress={onBack}
          />
        </View>
        <AppText
          variant="headline"
          numberOfLines={1}
          accessibilityRole="header"
          style={styles.navTitle}
        >
          {title}
        </AppText>
        <View style={[styles.navSide, styles.navRight]}>
          {right ?? (showDemo ? <DemoPill /> : null)}
        </View>
      </View>
    );
  }
  if (largeText) {
    return (
      <View style={styles.tabHeader}>
        <AppText
          variant="display"
          accessibilityRole="header"
          style={styles.largeTabTitle}
        >
          {title}
        </AppText>
        <View style={styles.largeTabHeaderRow}>
          <View style={styles.largeTabHeaderActions}>
            {showDemo ? <DemoPill /> : null}
            {right}
          </View>
        </View>
        {subtitle ? (
          <AppText variant="small" color={palette.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.tabHeader}>
      <View style={styles.tabHeaderRow}>
        <AppText
          variant="display"
          numberOfLines={1}
          accessibilityRole="header"
          style={styles.tabTitle}
        >
          {title}
        </AppText>
        {showDemo ? <DemoPill /> : null}
        {right}
      </View>
      {subtitle ? (
        <AppText variant="small" color={palette.textSecondary}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

export function Stat({
  label,
  value,
  color,
  align = "left",
}: {
  label: string;
  value: string;
  color?: string;
  align?: "left" | "right";
}) {
  const palette = usePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.stat, align === "right" && styles.statRight]}
    >
      <AppText variant="caption" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="number" color={color}>
        {value}
      </AppText>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: {
    value: T;
    label: string;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    disabled?: boolean;
  }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const palette = usePalette();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, { backgroundColor: palette.surface }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityHint={option.accessibilityHint}
            accessibilityState={{ selected, disabled: Boolean(option.disabled) }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: palette.surfaceMuted },
              option.disabled && { opacity: 0.35 },
            ]}
          >
            <AppText
              variant="label"
              numberOfLines={2}
              style={styles.segmentText}
              color={selected ? palette.text : palette.textSecondary}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  titleTrailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  first = false,
  destructive = false,
  chevron = false,
  disabled = false,
  testID,
  titleVariant = "body",
  titleNumberOfLines,
}: {
  title: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  titleTrailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  first?: boolean;
  destructive?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  testID?: string;
  titleVariant?: TextVariant;
  titleNumberOfLines?: number;
}) {
  const palette = usePalette();
  const content = (
    <>
      {leading}
      <View style={styles.rowCopy}>
        {titleTrailing ? (
          <View style={styles.rowTitle}>
            <AppText
              variant={titleVariant}
              numberOfLines={titleNumberOfLines}
              style={styles.rowTitleText}
              color={destructive ? palette.negative : palette.text}
            >
              {title}
            </AppText>
            {titleTrailing}
          </View>
        ) : (
          <AppText
            variant={titleVariant}
            numberOfLines={titleNumberOfLines}
            color={destructive ? palette.negative : palette.text}
          >
            {title}
          </AppText>
        )}
        {typeof subtitle === "string" ? (
          <AppText variant="small" color={palette.textSecondary}>
            {subtitle}
          </AppText>
        ) : (
          subtitle
        )}
      </View>
      {trailing}
      {chevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={palette.textMuted}
          accessible={false}
        />
      ) : null}
    </>
  );
  const rowStyle = [
    styles.row,
    !first && {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
    },
  ];
  if (!onPress) {
    return (
      <View
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={rowStyle}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}

export function ListGroup({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  return (
    <View
      style={[styles.listGroup, { backgroundColor: palette.surface }, style]}
    >
      {children}
    </View>
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  first = false,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  first?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const palette = usePalette();
  return (
    <ListRow
      first={first}
      title={label}
      subtitle={description}
      trailing={
        <Switch
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: palette.accent, false: palette.surfaceMuted }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={palette.surfaceMuted}
        />
      }
    />
  );
}

export function Section({
  title,
  trailing,
  children,
  style,
}: {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title ? <SectionTitle title={title} trailing={trailing} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: {
    flexGrow: 1,
    gap: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 56,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  panel: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexShrink: 0,
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { flexShrink: 0 },
  chipTextLarge: { flexShrink: 1, textAlign: "center" },
  notice: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  field: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  pageTitleCopy: { flex: 1, gap: 8 },
  demoPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSmall: { width: 36, height: 36, borderRadius: 18 },
  navBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -8,
  },
  navSide: { minWidth: 96, flexDirection: "row", alignItems: "center" },
  navRight: { justifyContent: "flex-end", paddingRight: 8 },
  navTitle: { flex: 1, textAlign: "center" },
  tabHeader: { gap: 6, paddingTop: 8 },
  tabHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tabTitle: { flex: 1 },
  largeTabTitle: { width: "100%" },
  largeTabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  largeTabHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stat: { flex: 1, gap: 4 },
  statRight: { alignItems: "flex-end" },
  segmented: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentText: { width: "100%", flexShrink: 1, textAlign: "center" },
  listGroup: { borderRadius: 20, paddingHorizontal: 16 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitleText: { flexShrink: 1 },
  section: { gap: 16 },
});
