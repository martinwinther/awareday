import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { PlaceholderRow } from "@/src/components/placeholder-row";
import { colors, spacing, fontSize, radius } from "@/src/theme";

export default function HistoryScreen() {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="History"
        subtitle="Review any day in a calm timeline."
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.section}>
            <SectionLabel>History</SectionLabel>
            <View style={styles.dayPicker}>
              <View style={styles.dayButton}>
                <Text style={styles.dayButtonText}>Previous</Text>
              </View>
              <Text style={styles.dayLabel}>{formattedDate}</Text>
              <View style={[styles.dayButton, styles.dayButtonDisabled]}>
                <Text style={[styles.dayButtonText, styles.dayButtonTextDisabled]}>Next</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Day schedule</SectionLabel>
            <View style={styles.timelinePreview}>
              {["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"].map((time) => (
                <View key={time} style={styles.timelineHour}>
                  <Text style={styles.timelineHourText}>{time}</Text>
                  <View style={styles.timelineLine} />
                </View>
              ))}
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyText}>No entries for this day yet.</Text>
                <Text style={styles.emptyDescription}>
                  Activity blocks and event markers will appear here.
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Activity totals</SectionLabel>
            <PlaceholderRow label="Focus" value="2h 15m" />
            <PlaceholderRow label="Walk" value="30m" />
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Event counts</SectionLabel>
            <PlaceholderRow label="Coffee" value="2" />
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Daily timeline</SectionLabel>
            {[
              { time: "11:00 AM", label: "Coffee", kind: "event" as const },
              { time: "10:30 AM", label: "Focus", kind: "end" as const },
              { time: "9:00 AM", label: "Focus", kind: "start" as const },
            ].map((item, index) => (
              <View key={index} style={styles.timelineRow}>
                <View style={styles.timelineRowLeft}>
                  <Text style={styles.timelineRowLabel}>{item.label}</Text>
                  <Text style={styles.timelineRowTime}>{item.time}</Text>
                </View>
                <View
                  style={[
                    styles.timelineBadge,
                    item.kind === "start" && styles.badgeStart,
                    item.kind === "end" && styles.badgeEnd,
                    item.kind === "event" && styles.badgeEvent,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.kind === "start" && styles.badgeTextStart,
                      item.kind === "end" && styles.badgeTextEnd,
                      item.kind === "event" && styles.badgeTextEvent,
                    ]}
                  >
                    {item.kind === "start" ? "Started" : item.kind === "end" ? "Ended" : "Event"}
                  </Text>
                </View>
              </View>
            ))}
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
  dayPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.amber100,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: "#fffbf7",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dayButtonDisabled: {
    opacity: 0.45,
  },
  dayButtonText: {
    fontSize: fontSize.xs,
    fontWeight: "500",
    color: colors.stone700,
  },
  dayButtonTextDisabled: {
    color: colors.stone400,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.stone800,
  },
  timelinePreview: {
    gap: 0,
  },
  timelineHour: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    gap: spacing.sm,
  },
  timelineHourText: {
    width: 60,
    fontSize: fontSize.caption,
    fontWeight: "500",
    color: colors.stone500,
    textAlign: "right",
  },
  timelineLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  emptyNotice: {
    marginTop: spacing.md,
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
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineRowLeft: {
    flex: 1,
    gap: 2,
  },
  timelineRowLabel: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.stone800,
  },
  timelineRowTime: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  timelineBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  badgeStart: {
    backgroundColor: colors.emerald50,
  },
  badgeEnd: {
    backgroundColor: "#fff8ef",
  },
  badgeEvent: {
    backgroundColor: colors.indigo50,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontWeight: "600",
  },
  badgeTextStart: {
    color: colors.emerald600,
  },
  badgeTextEnd: {
    color: colors.amber800,
  },
  badgeTextEvent: {
    color: colors.indigo600,
  },
});
