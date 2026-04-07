import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import { signInForMvp, useAuthUser } from "@/src/lib/firebase/auth";
import { colors } from "@/src/theme/colors";
import { spacing, radius, fontSize, controlSize } from "@/src/theme/spacing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getSignInErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    if (error instanceof Error) return error.message;
    return "Unable to sign in right now. Please try again.";
  }
  switch (error.code) {
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/invalid-credential": return "Email or password is incorrect.";
    case "auth/email-already-in-use": return "That email is already in use. Try signing in instead.";
    case "auth/weak-password": return "Password is too weak. Use at least 6 characters.";
    case "auth/popup-closed-by-user": return "Google sign-in was closed before it finished. Please try again.";
    case "auth/popup-blocked": return "Your browser blocked Google sign-in. Allow popups and try again.";
    case "auth/operation-not-allowed": return "This sign-in method is not enabled.";
    case "auth/unauthorized-domain": return "This domain is not authorized for Google sign-in.";
    default: return "We could not sign you in. Please try again.";
  }
}

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuthUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/(tabs)");
    }
  }, [loading, router, user]);

  const handleEmailSignIn = async (intent: "signin" | "signup") => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInForMvp({ method: "email", email: emailInput, password: passwordInput, intent });
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInForMvp({ method: "google" });
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator color={colors.amber600} />
      </View>
    );
  }

  const isDisabled = isSubmitting || loading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing["2xl"] }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.heroTone} />

        <View style={styles.headerSection}>
          <Text style={styles.brand}>awareday</Text>
          <Text style={styles.title}>See your day clearly.</Text>
          <Text style={styles.subtitle}>Capture what started, what ended, and what happened without breaking your flow.</Text>
        </View>

        <View style={styles.features}>
          {["Fast thumb-first logging", "Activity time from real timestamps", "Daily check-in counts and timeline"].map((text) => (
            <View key={text} style={styles.featureChip}><Text style={styles.featureText}>{text}</Text></View>
          ))}
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{errorMessage}</Text></View>
        ) : null}

        <View style={styles.formSection}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!isDisabled}
              placeholder="you@example.com"
              placeholderTextColor={colors.stone400}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              autoComplete="current-password"
              editable={!isDisabled}
              placeholder="Enter password"
              placeholderTextColor={colors.stone400}
            />
          </View>
          <Pressable
            style={[styles.primaryButton, isDisabled && styles.disabled]}
            onPress={() => void handleEmailSignIn("signin")}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="Sign in with email"
            accessibilityHint="Sign in to your Awareday account using email and password"
          >
            <Text style={styles.primaryButtonText}>{isSubmitting ? "Signing in..." : "Sign in with email"}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isDisabled && styles.disabled]}
            onPress={() => void handleEmailSignIn("signup")}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel="Create account"
            accessibilityHint="Create a new Awareday account with your email and password"
          >
            <Text style={styles.ghostButtonText}>Create account</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[styles.ghostButton, isDisabled && styles.disabled]}
          onPress={() => void handleGoogleSignIn()}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityHint="Sign in to your Awareday account with Google"
        >
          <Text style={styles.ghostButtonText}>{isSubmitting ? "Signing in..." : "Continue with Google"}</Text>
        </Pressable>

        <Text style={styles.footnote}>Use email or Google to access your private day log.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  card: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    padding: spacing.xl,
    gap: spacing.lg,
    ...Platform.select({
      ios: { shadowColor: colors.shadowElevated, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 24 },
      android: { elevation: 5 },
    }),
  },
  heroTone: {
    position: "absolute",
    top: -48,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.amber100,
    opacity: 0.65,
  },
  headerSection: { gap: spacing.sm },
  brand: { fontSize: fontSize.caption, fontWeight: "700", letterSpacing: 1.7, color: colors.stone600, textTransform: "uppercase" },
  title: { fontSize: 33, lineHeight: 36, fontWeight: "700", color: colors.stone900, fontFamily: "Georgia" },
  subtitle: { fontSize: fontSize.sm, color: colors.stone600, lineHeight: 20 },
  features: { gap: spacing.sm },
  featureChip: {
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureText: { fontSize: fontSize.sm, color: colors.stone700, fontWeight: "500" },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: colors.rose700 },
  formSection: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.xs, fontWeight: "600", color: colors.stone600 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: controlSize.lg,
    fontSize: fontSize.base,
    color: colors.stone900,
    backgroundColor: colors.backgroundLight,
  },
  primaryButton: {
    backgroundColor: colors.amber900,
    borderRadius: radius.md,
    height: controlSize.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: colors.white, fontWeight: "600", fontSize: fontSize.base },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.md,
    height: controlSize.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundLight,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.md,
    height: controlSize.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSoft,
  },
  ghostButtonText: { color: colors.stone700, fontWeight: "600", fontSize: fontSize.sm },
  disabled: { opacity: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderAmber },
  dividerText: { fontSize: fontSize.xs, color: colors.stone500, textTransform: "uppercase", letterSpacing: 1.2 },
  footnote: { fontSize: fontSize.xs, color: colors.stone500, lineHeight: 18 },
});
