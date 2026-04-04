import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import { signInForMvp, useAuthUser } from "@/src/lib/firebase/auth";
import { colors } from "@/src/theme/colors";
import { spacing, radius, fontSize } from "@/src/theme/spacing";
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
    case "auth/popup-closed-by-user": return "Google sign-in was closed before completion.";
    case "auth/popup-blocked": return "Google sign-in popup was blocked by the browser.";
    case "auth/operation-not-allowed": return "This sign-in method is not enabled.";
    case "auth/unauthorized-domain": return "This domain is not authorized for Google sign-in.";
    default: return error.message;
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
        <View style={styles.headerSection}>
          <Text style={styles.brand}>AWAREDAY</Text>
          <Text style={styles.title}>Sign in to log your day</Text>
          <Text style={styles.subtitle}>Capture what started, what ended, and what happened in a clean daily timeline.</Text>
        </View>

        <View style={styles.features}>
          {["Fast mobile-first logging", "Activity totals from timestamps", "Daily event counts and history"].map((text) => (
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
          <Pressable style={[styles.primaryButton, isDisabled && styles.disabled]} onPress={() => void handleEmailSignIn("signin")} disabled={isDisabled}>
            <Text style={styles.primaryButtonText}>{isSubmitting ? "Signing in..." : "Sign in with email"}</Text>
          </Pressable>
          <Pressable style={[styles.ghostButton, isDisabled && styles.disabled]} onPress={() => void handleEmailSignIn("signup")} disabled={isDisabled}>
            <Text style={styles.ghostButtonText}>Create account with email</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={[styles.ghostButton, isDisabled && styles.disabled]} onPress={() => void handleGoogleSignIn()} disabled={isDisabled}>
          <Text style={styles.ghostButtonText}>{isSubmitting ? "Signing in..." : "Continue with Google"}</Text>
        </Pressable>

        <Text style={styles.footnote}>Use email/password or Google to sign in for MVP.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl },
  card: {
    backgroundColor: colors.backgroundCard, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xl,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  headerSection: { gap: spacing.sm },
  brand: { fontSize: fontSize.caption, fontWeight: "600", letterSpacing: 2, color: colors.stone500 },
  title: { fontSize: fontSize["2xl"], fontWeight: "600", color: colors.stone900 },
  subtitle: { fontSize: fontSize.sm, color: colors.stone600, lineHeight: 20 },
  features: { gap: spacing.sm },
  featureChip: { backgroundColor: colors.backgroundSoft, borderWidth: 1, borderColor: colors.amber100, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  featureText: { fontSize: fontSize.sm, color: colors.stone600 },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errorText: { fontSize: fontSize.sm, color: colors.rose700 },
  formSection: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone600 },
  input: { borderWidth: 1, borderColor: colors.amber200, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 48, fontSize: fontSize.base, color: colors.stone900, backgroundColor: colors.backgroundLight },
  primaryButton: { backgroundColor: colors.amber900, borderRadius: radius.md, height: 48, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.white, fontWeight: "600", fontSize: fontSize.base },
  ghostButton: { borderWidth: 1, borderColor: colors.amber200, borderRadius: radius.md, height: 48, alignItems: "center", justifyContent: "center" },
  ghostButtonText: { color: colors.stone700, fontWeight: "500", fontSize: fontSize.sm },
  disabled: { opacity: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.amber200 },
  dividerText: { fontSize: fontSize.xs, color: colors.stone400, textTransform: "uppercase", letterSpacing: 1 },
  footnote: { fontSize: fontSize.xs, color: colors.stone500 },
});
