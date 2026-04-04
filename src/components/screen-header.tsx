import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, fontSize } from "@/src/theme";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.logo}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>AWAREDAY</Text>
          </View>
          {right}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{todayLabel}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  inner: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.amber500,
  },
  logoText: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.stone600,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: {
    fontSize: 27,
    fontWeight: "700",
    color: colors.stone900,
    fontFamily: "Georgia",
  },
  dateBadge: {
    borderWidth: 1,
    borderColor: colors.amber200,
    backgroundColor: colors.backgroundMuted,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  dateBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: "500",
    color: colors.stone600,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    lineHeight: 18,
  },
});
