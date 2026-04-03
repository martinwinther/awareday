import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, fontSize } from "@/src/theme";

type PlaceholderRowProps = {
  label: string;
  value?: string;
};

export function PlaceholderRow({ label, value }: PlaceholderRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone800,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.amber800,
    marginLeft: spacing.sm,
  },
});
