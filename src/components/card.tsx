import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { colors, radius, spacing } from "@/src/theme";

type CardProps = ViewProps;

export function Card({ style, children, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    padding: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowCard,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
