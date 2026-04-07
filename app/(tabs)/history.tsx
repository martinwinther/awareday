import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FirebaseError } from "firebase/app";
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
  type DayViewActivityBlock,
  type DayViewEventMarker,
} from "@/src/lib/domain";
import { listActivityEntriesForDay, listEventEntriesForDay } from "@/src/lib/firestore/repositories";
import {
  colors,
  spacing,
  radius,
  fontSize,
  controlSize,
  layout,
  getScreenHorizontalPadding,
} from "@/src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => `${char}${char}`).join("")
    : value;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

type DisplaySeed = {
  id: string;
  startMinute: number;
  endMinute: number;
};

type DisplayLanePlacement = {
  laneIndex: number;
  laneCount: number;
  laneSpan: number;
};

function seedsOverlap(left: DisplaySeed, right: DisplaySeed): boolean {
  return left.startMinute < right.endMinute && right.startMinute < left.endMinute;
}

function buildDisplayLaneMap(
  blocks: DayViewActivityBlock[],
  firstHour: number,
): Map<string, DisplayLanePlacement> {
  const seeds: DisplaySeed[] = blocks
    .map((block) => ({
      id: block.id,
      startMinute: (block.startTimestamp.getHours() - firstHour) * 60 + block.startTimestamp.getMinutes(),
      endMinute: (block.endTimestamp.getHours() - firstHour) * 60 + block.endTimestamp.getMinutes(),
    }))
    .sort((left, right) => {
      if (left.startMinute !== right.startMinute) {
        return left.startMinute - right.startMinute;
      }

      return left.endMinute - right.endMinute;
    });

  const clusters: DisplaySeed[][] = [];
  let currentCluster: DisplaySeed[] = [];
  let clusterEndMinute = -1;

  for (const seed of seeds) {
    if (currentCluster.length === 0 || seed.startMinute < clusterEndMinute) {
      currentCluster.push(seed);
      clusterEndMinute = Math.max(clusterEndMinute, seed.endMinute);
      continue;
    }

    clusters.push(currentCluster);
    currentCluster = [seed];
    clusterEndMinute = seed.endMinute;
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const laneMap = new Map<string, DisplayLanePlacement>();

  for (const cluster of clusters) {
    const laneEndMinutes: number[] = [];
    const laneById = new Map<string, number>();
    const itemsByLane = new Map<number, DisplaySeed[]>();

    for (const seed of cluster) {
      let laneIndex = -1;

      for (let lane = 0; lane < laneEndMinutes.length; lane += 1) {
        if (laneEndMinutes[lane] <= seed.startMinute) {
          laneIndex = lane;
          break;
        }
      }

      if (laneIndex === -1) {
        laneIndex = laneEndMinutes.length;
        laneEndMinutes.push(seed.endMinute);
      } else {
        laneEndMinutes[laneIndex] = seed.endMinute;
      }

      laneById.set(seed.id, laneIndex);
      const laneItems = itemsByLane.get(laneIndex) ?? [];
      laneItems.push(seed);
      itemsByLane.set(laneIndex, laneItems);
    }

    const laneCount = Math.max(laneEndMinutes.length, 1);

    for (const seed of cluster) {
      const laneIndex = laneById.get(seed.id) ?? 0;
      let laneSpan = 1;

      for (let lane = laneIndex + 1; lane < laneCount; lane += 1) {
        const laneItems = itemsByLane.get(lane) ?? [];
        const hasConflict = laneItems.some((laneItem) => seedsOverlap(seed, laneItem));

        if (hasConflict) {
          break;
        }

        laneSpan += 1;
      }

      laneMap.set(seed.id, {
        laneIndex,
        laneCount,
        laneSpan,
      });
    }
  }

  return laneMap;
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
  const minBlockHeight = 16;
  const laneGap = 3;
  const [scheduleWidth, setScheduleWidth] = useState(0);

  const hours = useMemo(() => {
    if (!hasEntries) return [9, 10, 11, 12];

    const allHours = new Set<number>();

    for (const block of activityBlocks) {
      const startHour = block.startTimestamp.getHours();
      const endHour = block.endTimestamp.getHours();
      for (let hour = startHour; hour <= endHour; hour += 1) {
        allHours.add(hour);
      }
    }

    for (const marker of eventMarkers) {
      allHours.add(marker.timestamp.getHours());
    }

    const sorted = Array.from(allHours).sort((left, right) => left - right);
    const first = Math.max(0, (sorted[0] ?? 9) - 1);
    const last = Math.min(23, (sorted[sorted.length - 1] ?? 12) + 1);
    const result: number[] = [];

    for (let hour = first; hour <= last; hour += 1) {
      result.push(hour);
    }

    return result;
  }, [activityBlocks, eventMarkers, hasEntries]);

  const firstHour = hours[0] ?? 0;
  const displayLaneMap = useMemo(
    () => buildDisplayLaneMap(activityBlocks, firstHour),
    [activityBlocks, firstHour],
  );

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
          <Text style={styles.emptyDescription}>Activity blocks and check-in markers appear here once you log that day.</Text>
        </View>
      </View>
    );
  }

  const lastHour = hours[hours.length - 1] ?? firstHour;
  const totalMinutes = (lastHour - firstHour + 1) * 60;
  const hourHeight = 48;
  const totalHeight = hours.length * hourHeight;
  const activityCanvasWidth = Math.max(
    scheduleWidth - leftAxisWidth - rightEventRailWidth - spacing.lg,
    180,
  );

  return (
    <View
      style={[styles.timelinePreview, { height: totalHeight + spacing.md }]}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setScheduleWidth((currentWidth) => (
          currentWidth === nextWidth ? currentWidth : nextWidth
        ));
      }}
    >
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
            width: activityCanvasWidth,
            height: totalHeight,
          },
        ]}
      >
        {activityBlocks.map((block, idx) => {
          const startMinute = (block.startTimestamp.getHours() - firstHour) * 60 + block.startTimestamp.getMinutes();
          const endMinute = (block.endTimestamp.getHours() - firstHour) * 60 + block.endTimestamp.getMinutes();
          const placement = displayLaneMap.get(block.id) ?? { laneIndex: 0, laneCount: 1, laneSpan: 1 };

          const top = (startMinute / totalMinutes) * totalHeight + 1;
          const height = Math.max(((endMinute - startMinute) / totalMinutes) * totalHeight - 2, minBlockHeight);
          const laneWidthPx = activityCanvasWidth / placement.laneCount;
          const left = placement.laneIndex * laneWidthPx + laneGap / 2;
          const width = Math.max((laneWidthPx * placement.laneSpan) - laneGap, 14);

          const baseColor = getActivityColor(idx);
          const hasRoomForText = width >= 62;
          const hasRoomForCompact = width >= 34;
          const showStandardLabel = height >= 18 && hasRoomForText;
          const showCompactLabel = !showStandardLabel && height >= 13 && hasRoomForCompact;
          const compactLabel = width < 56
            ? block.label.slice(0, 2).toUpperCase()
            : `${block.label.slice(0, 14)}${block.label.length > 14 ? "..." : ""}`;

          return (
            <View
              key={block.id}
              style={{
                position: "absolute",
                top,
                left,
                width,
                height,
                backgroundColor: hexToRgba(baseColor, 0.24),
                borderColor: hexToRgba(baseColor, 0.9),
                borderWidth: 1,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.xs,
                paddingVertical: height < 18 ? 1 : 2,
                justifyContent: "center",
              }}
            >
              {showStandardLabel ? (
                <Text style={{ fontSize: fontSize.caption, color: colors.stone900, fontWeight: "600" }} numberOfLines={1}>
                  {block.label}
                </Text>
              ) : showCompactLabel ? (
                <Text style={{ fontSize: 10, color: colors.stone900, fontWeight: "700" }} numberOfLines={1}>
                  {compactLabel}
                </Text>
              ) : (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hexToRgba(baseColor, 0.95) }} />
              )}
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
          const minute = (marker.timestamp.getHours() - firstHour) * 60 + marker.timestamp.getMinutes();
          const top = (minute / totalMinutes) * totalHeight;
          const offset = marker.stackIndex * 14;

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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

        if (!isActive) {
          return;
        }

        setActivityEntries(loadedActivities);
        setEventEntries(loadedEvents);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("We could not load this day. Please try again.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
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

  const contentHorizontalPadding = getScreenHorizontalPadding(width, Platform.OS === "web");

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: contentHorizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.slimTopCard}>
          <View style={styles.section}>
            <SectionLabel>History</SectionLabel>
            <View style={styles.dayPicker}>
              <Pressable
                style={styles.dayButton}
                onPress={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, -1))}
                accessibilityLabel="Previous day"
                accessibilityRole="button"
                accessibilityHint="Show the previous day in history"
              >
                <FontAwesome name="chevron-left" size={12} color={colors.stone700} />
              </Pressable>
              <Text style={styles.dayLabel}>{formattedSelectedDay}</Text>
              <Pressable
                style={[styles.dayButton, isSelectedDayToday && styles.dayButtonDisabled]}
                onPress={() => setSelectedDay((previousDay) => shiftLocalDay(previousDay, 1))}
                disabled={isSelectedDayToday}
                accessibilityLabel="Next day"
                accessibilityRole="button"
                accessibilityHint={isSelectedDayToday ? "Already on today" : "Show the next day in history"}
              >
                <FontAwesome
                  name="chevron-right"
                  size={12}
                  color={isSelectedDayToday ? colors.stone400 : colors.stone700}
                />
              </Pressable>
            </View>
          </View>
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>We could not load this day.</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.section}>
            <SectionLabel>Day schedule</SectionLabel>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.amber600} />
                <Text style={styles.loadingText}>Loading this day...</Text>
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
          <View style={styles.summaryGroup}>
            <View style={styles.summarySection}>
              <SectionLabel>Activity totals</SectionLabel>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : activityTotals.length === 0 ? (
                <Text style={styles.emptyText}>No completed activities for this day.</Text>
              ) : (
                activityTotals.map((total) => (
                  <View key={total.normalizedLabel} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{total.label}</Text>
                    <Text style={styles.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summarySection}>
              <SectionLabel>Check-in counts</SectionLabel>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : eventCounts.length === 0 ? (
                <Text style={styles.emptyText}>No check-ins logged for this day.</Text>
              ) : (
                eventCounts.map((count) => (
                  <View key={count.normalizedLabel} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{count.label}</Text>
                    <Text style={styles.totalValue}>{count.count}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Daily timeline</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : timelineItems.length === 0 ? (
              <Text style={styles.emptyText}>No timeline entries for this day.</Text>
            ) : (
              timelineItems.map((item) => {
                const entry = item.entry;
                const badgeLabel = item.kind === "activity-start" ? "Started" : item.kind === "activity-end" ? "Ended" : "Check-in";
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
  content: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    gap: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  section: { gap: spacing.md },
  slimTopCard: {
    minHeight: 96,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  dayPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundMuted,
    borderWidth: 1,
    borderColor: colors.borderAmber,
    borderRadius: radius.lg,
    minHeight: controlSize.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.full,
    width: controlSize.md,
    height: controlSize.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonDisabled: { opacity: 0.45 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: fontSize.xs, fontWeight: "700", color: colors.stone800 },
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
  summaryGroup: { gap: spacing.lg },
  summarySection: { gap: spacing.sm },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
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
    backgroundColor: colors.eventPillBackground,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.eventPillBorder,
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
  badgeEnd: { backgroundColor: colors.backgroundAmberSoft },
  badgeEvent: { backgroundColor: colors.indigo50 },
  badgeText: { fontSize: fontSize.caption, fontWeight: "600" },
  badgeTextStart: { color: colors.emerald600 },
  badgeTextEnd: { color: colors.amber800 },
  badgeTextEvent: { color: colors.indigo600 },
});
