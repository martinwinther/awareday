import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/src/components/card";
import { colors, spacing, fontSize, radius } from "@/src/theme";

const features = [
  "Fast mobile-first logging",
  "Activity totals from timestamps",
  "Daily event counts and history",
];

export default function SignInScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing["3xl"] }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.logoText}>AWAREDAY</Text>
            <Text style={styles.title}>Sign in to log your day</Text>
            <Text style={styles.description}>
              Capture what started, what ended, and what happened in a clean daily timeline.
            </Text>
          </View>

          <View style={styles.features}>
            {features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.input}>
                <Text style={styles.inputPlaceholder}>you@example.com</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.input}>
                <Text style={styles.inputPlaceholder}>Enter password</Text>
              </View>
            </View>

            <View style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Sign in with email</Text>
            </View>

            <View style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Create account with email</Text>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Continue with Google</Text>
          </View>

          <Text style={styles.footnote}>
            Use email/password or Google to sign in for MVP.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  logoText: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.stone500,
  },
  title: {
    fontSize: fontSize["2xl"],
    fontWeight: "700",
    color: colors.stone900,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.stone600,
    lineHeight: 20,
  },
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.amber100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  featureText: {
    fontSize: fontSize.sm,
    color: colors.stone600,
  },
  form: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.stone600,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(232, 207, 169, 0.7)",
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md + 2,
    justifyContent: "center",
  },
  inputPlaceholder: {
    fontSize: fontSize.sm,
    color: colors.stone400,
  },
  primaryButton: {
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.amber900,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "rgba(120, 69, 20, 0.5)",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.white,
  },
  ghostButton: {
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: "#fffbf7",
    justifyContent: "center",
    alignItems: "center",
  },
  ghostButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone700,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.amber200,
  },
  dividerText: {
    fontSize: fontSize.xs,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone400,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
});
