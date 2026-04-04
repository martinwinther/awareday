import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { FirebaseError } from "firebase/app";
import { ScreenHeader } from "@/src/components/screen-header";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser } from "@/src/lib/firebase/auth";
import {
  deriveDailyActivityTotals,
  deriveDailyEventCounts,
  deriveTodayTimeline,
  deriveSingleDayCalendarItems,
  formatClockTime,
  formatDuration,
  type ActivityEntry,
  type EventEntry,
  type TodayTimelineItem,
  type DayViewActivityBlock,
  type DayViewEventMarker,
} from "@/src/lib/domain";
import {
  listActivityEntriesForDay,
  listEventEntriesForDay,
} from "@/src/lib/firestore/repositories";
import { colors } from "@/src/theme/colors";
import { spacing, radius, fontSize } from "@/src/theme/spacing";

function getStartOfDay(day: Date): Date {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function shiftLocalDay(day: Date, days: number): Date {
  const shifted = new Date(day);
  shifted.setDate(shifted.getDate() + days);
  return getStartOfDay(shifted);
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatSelectedDay(day: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(day);
}

const ACTIVITY_COLORS = [
  colors.emerald600,
  colors.indigo600,
  colors.amber600,
  colors.orange700,
  colors.rose700,
];

function getActivityColor(index: number): string {
  return ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];
}

function DaySchedule({
  activityBlocks,
  eventMarkers,
}: {
  activityBlocks: DayViewActivityBlock[];
  eventMarkers: DayViewEventMarker[];
}) {
  const hasEntries = activityBlocks.length > 0 || eventMarkers.length > 0;
  const leftAxisWidth = 64;
  const rightEventRailWidth = 106;
  const minBlockHeight = 22;
  const activityCanvasWidth = 188;

  const hours = useMemo(() => {
    if (!hasEntries) return [9, 10, 11, 12];
    const allHours = new Set<number>();
    for (const block of activityBlocks) {
      const startHour = block.startTimestamp.getHours();
      const endHour = block.endTimestamp.getHours();
      for (let h = startHour; h <= endHour; h++) allHours.add(h);
    }
    for (const marker of eventMarkers) {
      allHours.add(marker.timestamp.getHours());
    }
    const sorted = Array.from(allHours).sort((a, b) => a - b);
    const first = Math.max(0, sorted[0] - 1);
    const last = Math.min(23, sorted[sorted.length - 1] + 1);
    const result: number[] = [];
    for (let h = first; h <= last; h++) result.push(h);
    return result;
  }, [activityBlocks, eventMarkers, hasEntries]);

  if (!hasEntries) {
    return (
      <View style={styles.timelinePreviewEmpty}>
        {hours.map((hour) => {
          const label = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          return (
            <View key={hour} style={styles.timelineHourEmpty}>
              <Text style={styles.timelineHourText}>{label}</Text>
              <View style={styles.timelineLine} />
            </View>
          );
        })}
        <View style={styles.emptyNoticeBox}>
          <Text style={styles.emptyText}>No entries for this day yet.</Text>
          <Text style={styles.emptyDescription}>Activity blocks and event markers appear here once you log that day.</Text>
        </View>
      </View>
    );
  }

  const firstHour = hours[0];
  const lastHour = hours[hours.length - 1];
  const totalMinutes = (lastHour - firstHour + 1) * 60;
  const hourHeight = 48;
  const totalHeight = hours.length * hourHeight;

  return (
    <View style={[styles.timelinePreview, { height: totalHeight + spacing.md }]}>
      {hours.map((hour) => {
        const label = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const top = ((hour - firstHour) * 60 / totalMinutes) * totalHeight;
        return (
          <View key={hour} style={[styles.timelineHour, { position: "absolute", top, left: 0, right: 0 }]}>
            <Text style={styles.timelineHourText}>{label}</Text>
            <View style={styles.timelineLine} />
          </View>
        );
      })}

      <View
        style={[
          styles.activityCanvas,
          {
            left: leftAxisWidth + spacing.sm,
            right: rightEventRailWidth,
            width: activityCanvasWidth,
            height: totalHeight,
          },
        ]}
      >
      {activityBlocks.map((block, idx) => {
        const top = (block.topPercent / 100) * totalHeight;
        const height = Math.max((block.heightPercent / 100) * totalHeight, minBlockHeight);
        const laneWidthPx = activityCanvasWidth / block.laneCount;
        const left = block.laneIndex * laneWidthPx;
        const width = Math.max((block.laneSpan * laneWidthPx) - 2, 14);
        return (
          <View
            key={block.id}
            style={{
              position: "absolute",
              top,
              left,
              width,
              height,
              backgroundColor: getActivityColor(idx),
              opacity: 0.3,
              borderRadius: radius.sm,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: fontSize.caption, color: colors.stone900, fontWeight: "600" }} numberOfLines={1}>
              {block.label}
            </Text>
          </View>
        );
      })}
      </View>

      <View
        style={[
          styles.eventRail,
          {
            right: spacing.xs,
            width: rightEventRailWidth - spacing.xs,
            height: totalHeight,
          },
        ]}
      >
      {eventMarkers.map((marker) => {
        const top = (marker.topPercent / 100) * totalHeight;
        const offset = marker.stackIndex * 18;
        return (
          <View
            key={marker.id}
            style={{
              position: "absolute",
              top: top - 5 + offset,
              left: 0,
              right: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
            }}
          >
            <View style={styles.eventConnector} />
            <View style={styles.eventDot} />
            <View style={styles.eventPill}>
              <Text style={styles.eventPillTime}>{formatClockTime(marker.timestamp)}</Text>
              <Text style={styles.eventPillText} numberOfLines={1}>{marker.label}</Text>
            </View>
          </View>
        );
      })}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { user } = useAuthUser();
  const [selectedDay, setSelectedDay] = useState(() => getStartOfDay(new Date()));
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSelectedDayToday = useMemo(() => isSameLocalDay(selectedDay, new Date()), [selectedDay]);
  const formattedSelectedDay = useMemo(() => formatSelectedDay(selectedDay), [selectedDay]);

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEventEntries([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadSelectedDayEntries = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedActivities, loadedEvents] = await Promise.all([
          listActivityEntriesForDay(user.uid, selectedDay),
          listEventEntriesForDay(user.uid, selectedDay),
        ]);

        if (!isActive) return;

        setActivityEntries(loadedActivities);
        setEventEntries(loadedEvents);
      } catch (error) {
        if (!isActive) return;

        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Could not load history for this day. Please try again.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadSelectedDayEntries();

    return () => {
      isActive = false;
    };
  }, [selectedDay, user]);

  const activityTotals = useMemo(
    () => deriveDailyActivityTotals(activityEntries, selectedDay),
    [activityEntries, selectedDay],
  );

  const eventCounts = useMemo(
    () => deriveDailyEventCounts(eventEntries, selectedDay),
    [eventEntries, selectedDay],
  );

  const timelineItems = useMemo(
    () => deriveTodayTimeline(activityEntries, eventEntries, selectedDay),
    [activityEntries, eventEntries, selectedDay],
  );

  const dayCalendarItems = useMemo(
    () => deriveSingleDayCalendarItems(activityEntries, eventEntries, selectedDay),
    [activityEntries, eventEntries, selectedDay],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="History" subtitle="Review any day in a calm timeline." />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.section}>
            <SectionLabel>History</SectionLabel>
            <View style={styles.dayPicker}>
              <Pressable
                style={styles.dayButton}
                onPress={() => setSelectedDay((prev) => shiftLocalDay(prev, -1))}
              >
                <Text style={styles.dayButtonText}>Previous</Text>
              </Pressable>
              <Text style={styles.dayLabel}>{formattedSelectedDay}</Text>
              <Pressable
                style={[styles.dayButton, isSelectedDayToday && styles.dayButtonDisabled]}
                onPress={() => setSelectedDay((prev) => shiftLocalDay(prev, 1))}
                disabled={isSelectedDayToday}
              >
                <Text style={[styles.dayButtonText, isSelectedDayToday && styles.dayButtonTextDisabled]}>Next</Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Could not load this day.</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.section}>
            <SectionLabel>Day schedule</SectionLabel>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.amber600} />
                <Text style={styles.loadingText}>Loading day schedule...</Text>
              </View>
            ) : (
              <DaySchedule
                activityBlocks={dayCalendarItems.activityBlocks}
                eventMarkers={dayCalendarItems.eventMarkers}
              />
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Activity totals</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : activityTotals.length === 0 ? (
              <Text style={styles.emptyText}>No completed activities on {formattedSelectedDay}.</Text>
            ) : (
              activityTotals.map((total) => (
                <View key={total.normalizedLabel} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{total.label}</Text>
                  <Text style={styles.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
                </View>
              ))
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Event counts</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : eventCounts.length === 0 ? (
              <Text style={styles.emptyText}>No events logged on {formattedSelectedDay}.</Text>
            ) : (
              eventCounts.map((count) => (
                <View key={count.normalizedLabel} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{count.label}</Text>
                  <Text style={styles.totalValue}>{count.count}</Text>
                </View>
              ))
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Daily timeline</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : timelineItems.length === 0 ? (
              <Text style={styles.emptyText}>No entries found for {formattedSelectedDay}.</Text>
            ) : (
              timelineItems.map((item) => {
                const entry = item.entry;
                const badgeLabel = item.kind === "activity-start" ? "Started" : item.kind === "activity-end" ? "Ended" : "Event";
                const badgeStyle = item.kind === "activity-start" ? styles.badgeStart : item.kind === "activity-end" ? styles.badgeEnd : styles.badgeEvent;
                const badgeTextStyle = item.kind === "activity-start" ? styles.badgeTextStart : item.kind === "activity-end" ? styles.badgeTextEnd : styles.badgeTextEvent;
                return (
                  <View key={`${item.kind}-${entry.id}`} style={styles.timelineRow}>
                    <View style={styles.timelineRowLeft}>
                      <Text style={styles.timelineRowLabel}>{entry.label}</Text>
                      <Text style={styles.timelineRowTime}>{formatClockTime(entry.timestamp.toDate())}</Text>
                    </View>
                    <View style={[styles.timelineBadge, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing["3xl"] },
  section: { gap: spacing.md },
  dayPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  dayButtonDisabled: { opacity: 0.45 },
  dayButtonText: { fontSize: fontSize.xs, fontWeight: "500", color: colors.stone700 },
  dayButtonTextDisabled: { color: colors.stone400 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: fontSize.sm, fontWeight: "700", color: colors.stone800 },
  errorBox: { backgroundColor: colors.rose50, borderWidth: 1, borderColor: colors.rose200, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  errorTitle: { fontSize: fontSize.sm, fontWeight: "600", color: colors.rose700 },
  errorText: { fontSize: fontSize.xs, color: colors.rose700 },
  loadingContainer: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  loadingText: { fontSize: fontSize.sm, color: colors.stone500 },
  timelinePreviewEmpty: { gap: 0 },
  timelineHourEmpty: { flexDirection: "row", alignItems: "center", height: 44, gap: spacing.sm },
  timelinePreview: {
    position: "relative",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    paddingTop: spacing.sm,
  },
  timelineHour: { flexDirection: "row", alignItems: "center", height: 48, gap: spacing.sm },
  timelineHourText: { width: 60, fontSize: fontSize.caption, fontWeight: "500", color: colors.stone500, textAlign: "right" },
  timelineLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  emptyNoticeBox: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.stone500, fontStyle: "italic" },
  emptyDescription: { fontSize: fontSize.xs, color: colors.stone500, lineHeight: 18 },
  activityCanvas: {
    position: "absolute",
    top: spacing.sm,
    bottom: 0,
  },
  eventRail: {
    position: "absolute",
    top: spacing.sm,
    bottom: 0,
  },
  eventConnector: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  eventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.indigo600,
  },
  eventPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.indigo50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.indigo600,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: 90,
  },
  eventPillTime: {
    fontSize: fontSize.caption,
    color: colors.indigo600,
    fontWeight: "700",
  },
  eventPillText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.indigo600,
    fontWeight: "600",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  totalLabel: { fontSize: fontSize.sm, color: colors.stone700 },
  totalValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.amber800 },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineRowLeft: { flex: 1, gap: 2 },
  timelineRowLabel: { fontSize: fontSize.sm, fontWeight: "500", color: colors.stone800 },
  timelineRowTime: { fontSize: fontSize.xs, color: colors.stone500 },
  timelineBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  badgeStart: { backgroundColor: colors.emerald50 },
  badgeEnd: { backgroundColor: "#fff8ef" },
  badgeEvent: { backgroundColor: colors.indigo50 },
  badgeText: { fontSize: fontSize.caption, fontWeight: "600" },
  badgeTextStart: { color: colors.emerald600 },
  badgeTextEnd: { color: colors.amber800 },
  badgeTextEvent: { color: colors.indigo600 },
});
