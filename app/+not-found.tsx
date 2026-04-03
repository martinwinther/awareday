import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, fontSize } from "@/src/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.stone900,
    marginBottom: spacing.lg,
  },
  link: {
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: colors.amber800,
  },
});
