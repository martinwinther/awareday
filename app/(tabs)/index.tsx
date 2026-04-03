import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { PlaceholderRow } from "@/src/components/placeholder-row";
import { colors, spacing, fontSize, radius } from "@/src/theme";

const sampleActivities = ["Focus", "Walk", "Read"];
const sampleEvents = ["Coffee", "Water", "Stretch"];

export default function TodayScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Today"
        subtitle="Capture the day as it unfolds."
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.section}>
            <SectionLabel>Quick activities</SectionLabel>
            <View style={styles.chipRow}>
              {sampleActivities.map((label) => (
                <View key={label} style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: colors.emerald600 }]} />
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
              <View style={[styles.chip, styles.chipMuted]}>
                <Text style={styles.chipMutedText}>+ Add</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Quick events</SectionLabel>
            <View style={styles.chipRow}>
              {sampleEvents.map((label) => (
                <View key={label} style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: colors.indigo600 }]} />
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
              <View style={[styles.chip, styles.chipMuted]}>
                <Text style={styles.chipMutedText}>+ Add</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Open activities</SectionLabel>
            <View style={styles.emptyNotice}>
              <Text style={styles.emptyText}>No open activities right now.</Text>
              <Text style={styles.emptyDescription}>
                Tap a quick activity chip above to start tracking.
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Activity totals</SectionLabel>
            <PlaceholderRow label="Focus" value="1h 30m" />
            <PlaceholderRow label="Walk" value="45m" />
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Event counts</SectionLabel>
            <PlaceholderRow label="Coffee" value="3" />
            <PlaceholderRow label="Water" value="5" />
          </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing["3xl"],
  },
  section: {
    gap: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: "#fffbf7",
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone800,
  },
  chipMuted: {
    borderStyle: "dashed",
    borderColor: "rgba(232, 207, 169, 0.6)",
    backgroundColor: "#fffcf9",
  },
  chipMutedText: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone500,
  },
  emptyNotice: {
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: "rgba(232, 207, 169, 0.9)",
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.stone700,
  },
  emptyDescription: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    lineHeight: 18,
  },
});
