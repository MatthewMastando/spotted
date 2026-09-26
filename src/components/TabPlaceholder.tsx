import { StyleSheet, Text, View } from "react-native";
import { palettes } from "@/design/tokens";

type TabPlaceholderProps = {
  title: string;
  subtitle: string;
};

export function TabPlaceholder({ title, subtitle }: TabPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SWIPEFOLIO</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: palettes.dark.spacing.xl,
    backgroundColor: palettes.dark.background,
  },
  eyebrow: {
    color: palettes.dark.accent,
    fontSize: palettes.dark.type.caption,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: palettes.dark.spacing.sm,
  },
  title: {
    color: palettes.dark.text,
    fontSize: palettes.dark.type.display,
    fontWeight: "700",
  },
  subtitle: {
    color: palettes.dark.textSecondary,
    fontSize: palettes.dark.type.body,
    marginTop: palettes.dark.spacing.sm,
  },
});
