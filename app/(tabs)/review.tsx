import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { FirebaseError } from "firebase/app";
import { Card } from "@/src/components/card";
import { SectionLabel } from "@/src/components/section-label";
import { useAuthUser } from "@/src/lib/firebase/auth";
import {
  deriveWeeklyComparisonSummary,
  deriveWeeklyCheckInConsistencyRows,
  deriveWeeklyInsightRows,
  deriveWeeklyReviewSummary,
  formatDuration,
  getStartOfLocalWeek,
  resolveFirstDayOfWeek,
  type ActivityEntry,
  type EventEntry,
  type WeeklyCheckInConsistencyRow,
  type WeeklyComparisonDirection,
  type WeeklyDaySummary,
} from "@/src/lib/domain";
import {
  listActivityEntriesForDateRange,
  listEventEntriesForDateRange,
} from "@/src/lib/firestore/repositories";
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

function shiftWeek(anchorDay: Date, weekOffset: number): Date {
  const next = new Date(anchorDay);
  next.setDate(next.getDate() + (weekOffset * 7));
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(day: Date, amount: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + amount);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatWeekRange(weekStart: Date, weekEnd: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
  const yearFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
  });

  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}, ${yearFormatter.format(weekEnd)}`;
}

function formatDayLabel(day: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(day);
}

function formatDayParam(day: Date): string {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function describeTopActivity(day: WeeklyDaySummary): string {
  const top = day.activityTotals[0];

  if (!top) {
    return "No completed activities";
  }

  return `${top.label} ${formatDuration(top.totalDurationMs)}`;
}

function describeTopCheckIn(day: WeeklyDaySummary): string {
  const top = day.eventCounts[0];

  if (!top) {
    return "No check-ins logged";
  }

  const noun = top.count === 1 ? "check-in" : "check-ins";
  return `${top.label} ${top.count} ${noun}`;
}

function describeConsistencyDays(row: WeeklyCheckInConsistencyRow): string {
  const dayNoun = row.daysWithCheckIn === 1 ? "day" : "days";
  return `${row.daysWithCheckIn} ${dayNoun} this week with at least one log`;
}

function describeCurrentStreak(row: WeeklyCheckInConsistencyRow): string {
  const dayNoun = row.currentStreakDays === 1 ? "day" : "days";
  return `Current streak: ${row.currentStreakDays} ${dayNoun}`;
}

function describeComparisonDirection(direction: WeeklyComparisonDirection): string {
  if (direction === "up") {
    return "Up";
  }

  if (direction === "down") {
    return "Down";
  }

  return "No change";
}

function describeTotalCheckIns(value: string): string {
  const count = Number(value);
  const noun = count === 1 ? "check-in" : "check-ins";
  return `${value} ${noun}`;
}

function formatTopCheckInValue(value: string): string {
  const count = Number(value);
  const noun = count === 1 ? "check-in" : "check-ins";
  return `${value} ${noun}`;
}

export default function WeeklyReviewScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuthUser();
  const [anchorDay, setAnchorDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [eventEntries, setEventEntries] = useState<EventEntry[]>([]);
  const [previousActivityEntries, setPreviousActivityEntries] = useState<ActivityEntry[]>([]);
  const [previousEventEntries, setPreviousEventEntries] = useState<EventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const locale = useMemo(() => new Intl.DateTimeFormat().resolvedOptions().locale, []);
  const firstDayOfWeek = useMemo(() => resolveFirstDayOfWeek(locale), [locale]);
  const weekStart = useMemo(
    () => getStartOfLocalWeek(anchorDay, firstDayOfWeek),
    [anchorDay, firstDayOfWeek],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekEndExclusive = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const previousWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart]);
  const currentWeekStart = useMemo(
    () => getStartOfLocalWeek(new Date(), firstDayOfWeek),
    [firstDayOfWeek],
  );

  const isViewingCurrentWeek = useMemo(
    () => isSameLocalDay(weekStart, currentWeekStart),
    [currentWeekStart, weekStart],
  );

  useEffect(() => {
    if (!user) {
      setActivityEntries([]);
      setEventEntries([]);
      setPreviousActivityEntries([]);
      setPreviousEventEntries([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadWeekEntries = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [loadedActivities, loadedEvents, loadedPreviousActivities, loadedPreviousEvents] = await Promise.all([
          listActivityEntriesForDateRange(user.uid, weekStart, weekEndExclusive),
          listEventEntriesForDateRange(user.uid, weekStart, weekEndExclusive),
          listActivityEntriesForDateRange(user.uid, previousWeekStart, weekStart),
          listEventEntriesForDateRange(user.uid, previousWeekStart, weekStart),
        ]);

        if (!isActive) {
          return;
        }

        setActivityEntries(loadedActivities);
        setEventEntries(loadedEvents);
        setPreviousActivityEntries(loadedPreviousActivities);
        setPreviousEventEntries(loadedPreviousEvents);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof FirebaseError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("We could not load this week. Please try again.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadWeekEntries();

    return () => {
      isActive = false;
    };
  }, [previousWeekStart, user, weekEndExclusive, weekStart]);

  const weeklySummary = useMemo(
    () => deriveWeeklyReviewSummary(activityEntries, eventEntries, weekStart, firstDayOfWeek),
    [activityEntries, eventEntries, weekStart, firstDayOfWeek],
  );

  const previousWeeklySummary = useMemo(
    () => deriveWeeklyReviewSummary(previousActivityEntries, previousEventEntries, previousWeekStart, firstDayOfWeek),
    [firstDayOfWeek, previousActivityEntries, previousEventEntries, previousWeekStart],
  );

  const weekLabel = useMemo(
    () => formatWeekRange(weeklySummary.weekStart, weeklySummary.weekEnd, locale),
    [locale, weeklySummary.weekEnd, weeklySummary.weekStart],
  );

  const totalWeeklyActivityDurationMs = useMemo(
    () => weeklySummary.days.reduce((total, day) => total + day.totalActivityDurationMs, 0),
    [weeklySummary.days],
  );

  const totalWeeklyCheckIns = useMemo(
    () => weeklySummary.days.reduce((total, day) => total + day.totalEventCount, 0),
    [weeklySummary.days],
  );

  const insightRows = useMemo(
    () => deriveWeeklyInsightRows(weeklySummary, locale),
    [locale, weeklySummary],
  );

  const consistencyRows = useMemo(
    () => deriveWeeklyCheckInConsistencyRows(weeklySummary, new Date()),
    [weeklySummary],
  );

  const comparisonSummary = useMemo(
    () => deriveWeeklyComparisonSummary(weeklySummary, previousWeeklySummary),
    [previousWeeklySummary, weeklySummary],
  );

  const contentHorizontalPadding = getScreenHorizontalPadding(width, Platform.OS === "web");

  const openHistoryForDay = (day: Date) => {
    router.push({
      pathname: "/(tabs)/history",
      params: { day: formatDayParam(day) },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: contentHorizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.slimTopCard}>
          <View style={styles.section}>
            <SectionLabel>Weekly review</SectionLabel>
            <View style={styles.weekPicker}>
              <Pressable
                style={styles.weekButton}
                onPress={() => setAnchorDay((previous) => shiftWeek(previous, -1))}
                accessibilityLabel="Previous week"
                accessibilityRole="button"
                accessibilityHint="Show the previous week in review"
              >
                <FontAwesome name="chevron-left" size={12} color={colors.stone700} />
              </Pressable>
              <Text style={styles.weekLabel}>{weekLabel}</Text>
              <Pressable
                style={[styles.weekButton, isViewingCurrentWeek && styles.weekButtonDisabled]}
                onPress={() => setAnchorDay((previous) => shiftWeek(previous, 1))}
                disabled={isViewingCurrentWeek}
                accessibilityLabel="Next week"
                accessibilityRole="button"
                accessibilityHint={isViewingCurrentWeek ? "Already on the current week" : "Show the next week in review"}
              >
                <FontAwesome name="chevron-right" size={12} color={isViewingCurrentWeek ? colors.stone400 : colors.stone700} />
              </Pressable>
            </View>
            <Text style={styles.helperText}>A seven-day view based on your locale week start.</Text>
          </View>
        </Card>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>We could not load this week.</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.summaryGroup}>
            <View style={styles.summarySection}>
              <SectionLabel>Weekly activity totals</SectionLabel>
              <Text style={styles.summaryHeadline}>{formatDuration(totalWeeklyActivityDurationMs)}</Text>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : weeklySummary.activityTotals.length === 0 ? (
                <Text style={styles.emptyText}>No completed activities this week.</Text>
              ) : (
                weeklySummary.activityTotals.map((total) => (
                  <View key={total.normalizedLabel} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{total.label}</Text>
                    <Text style={styles.totalValue}>{formatDuration(total.totalDurationMs)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summarySection}>
              <SectionLabel>Weekly check-in totals</SectionLabel>
              <Text style={styles.summaryHeadline}>{totalWeeklyCheckIns}</Text>
              {isLoading ? (
                <ActivityIndicator color={colors.amber600} />
              ) : weeklySummary.eventCounts.length === 0 ? (
                <Text style={styles.emptyText}>No check-ins logged this week.</Text>
              ) : (
                weeklySummary.eventCounts.map((count) => (
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
            <SectionLabel>Compared with last week</SectionLabel>

            <View style={styles.insightList}>
              {[comparisonSummary.totalActivityTime, comparisonSummary.totalCheckIns].map((row) => (
                <View key={row.id} style={styles.insightRow}>
                  <View style={styles.comparisonHeaderRow}>
                    <Text style={styles.insightLabel}>{row.label}</Text>
                    <Text style={[
                      styles.comparisonDirection,
                      row.direction === "up"
                        ? styles.comparisonDirectionUp
                        : row.direction === "down"
                          ? styles.comparisonDirectionDown
                          : styles.comparisonDirectionSame,
                    ]}>
                      {describeComparisonDirection(row.direction)}
                    </Text>
                  </View>

                  <View style={styles.comparisonValueRow}>
                    <Text style={styles.insightValue}>
                      {row.id === "total-check-ins" ? describeTotalCheckIns(row.currentValue) : row.currentValue}
                    </Text>
                    <Text style={styles.comparisonDelta}>{row.deltaValue}</Text>
                  </View>

                  <Text style={styles.comparisonSummary}>{row.summary}</Text>
                </View>
              ))}
            </View>

            <View style={styles.comparisonGroup}>
              <Text style={styles.comparisonSubheading}>Top activities this week</Text>
              {comparisonSummary.topActivities.length === 0 ? (
                <Text style={styles.emptyText}>No completed activities this week.</Text>
              ) : (
                <View style={styles.insightList}>
                  {comparisonSummary.topActivities.map((row) => (
                    <View key={`activity-compare-${row.normalizedLabel}`} style={styles.insightRow}>
                      <View style={styles.comparisonHeaderRow}>
                        <Text style={styles.consistencyLabel}>{row.label}</Text>
                        <Text style={[
                          styles.comparisonDirection,
                          row.direction === "up"
                            ? styles.comparisonDirectionUp
                            : row.direction === "down"
                              ? styles.comparisonDirectionDown
                              : styles.comparisonDirectionSame,
                        ]}>
                          {describeComparisonDirection(row.direction)}
                        </Text>
                      </View>
                      <View style={styles.comparisonValueRow}>
                        <Text style={styles.insightValue}>{row.currentValue}</Text>
                        <Text style={styles.comparisonDelta}>{row.deltaValue}</Text>
                      </View>
                      <Text style={styles.comparisonSummary}>{row.summary}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.comparisonGroup}>
              <Text style={styles.comparisonSubheading}>Top counters/check-ins this week</Text>
              {comparisonSummary.topCheckIns.length === 0 ? (
                <Text style={styles.emptyText}>No check-ins logged this week.</Text>
              ) : (
                <View style={styles.insightList}>
                  {comparisonSummary.topCheckIns.map((row) => (
                    <View key={`check-in-compare-${row.normalizedLabel}`} style={styles.insightRow}>
                      <View style={styles.comparisonHeaderRow}>
                        <Text style={styles.consistencyLabel}>{row.label}</Text>
                        <Text style={[
                          styles.comparisonDirection,
                          row.direction === "up"
                            ? styles.comparisonDirectionUp
                            : row.direction === "down"
                              ? styles.comparisonDirectionDown
                              : styles.comparisonDirectionSame,
                        ]}>
                          {describeComparisonDirection(row.direction)}
                        </Text>
                      </View>
                      <View style={styles.comparisonValueRow}>
                        <Text style={styles.insightValue}>{formatTopCheckInValue(row.currentValue)}</Text>
                        <Text style={styles.comparisonDelta}>{row.deltaValue}</Text>
                      </View>
                      <Text style={styles.comparisonSummary}>{row.summary}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Insights</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : (
              <View style={styles.insightList}>
                {insightRows.map((insight) => (
                  <View key={insight.id} style={styles.insightRow}>
                    <Text style={styles.insightLabel}>{insight.label}</Text>
                    <Text style={styles.insightValue}>{insight.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Recurring counter consistency</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : consistencyRows.length === 0 ? (
              <Text style={styles.emptyText}>No coffee, water, medication, mood check, or symptom check logs this week.</Text>
            ) : (
              <View style={styles.insightList}>
                {consistencyRows.map((row) => (
                  <View key={row.id} style={styles.insightRow}>
                    <Text style={styles.consistencyLabel}>{row.label}</Text>
                    <Text style={styles.consistencyMeta}>{describeConsistencyDays(row)}</Text>
                    <Text style={styles.consistencyMeta}>{describeCurrentStreak(row)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Activities by day</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : (
              weeklySummary.days.map((day) => (
                <Pressable
                  key={`activity-${day.day.toISOString()}`}
                  style={({ pressed }) => [styles.dayRow, pressed && styles.dayRowPressed]}
                  onPress={() => openHistoryForDay(day.day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open History for ${formatDayLabel(day.day, locale)}`}
                  accessibilityHint="Navigates to History with this day selected"
                >
                  <View style={styles.dayRowLeft}>
                    <Text style={styles.dayRowLabel}>{formatDayLabel(day.day, locale)}</Text>
                    <Text style={styles.dayRowHint}>{describeTopActivity(day)}</Text>
                  </View>
                  <View style={styles.dayRowRight}>
                    <Text style={styles.dayRowValue}>{formatDuration(day.totalActivityDurationMs)}</Text>
                    <FontAwesome name="chevron-right" size={12} color={colors.stone400} />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.section}>
            <SectionLabel>Check-ins by day</SectionLabel>
            {isLoading ? (
              <ActivityIndicator color={colors.amber600} />
            ) : (
              weeklySummary.days.map((day) => {
                const noun = day.totalEventCount === 1 ? "check-in" : "check-ins";

                return (
                  <Pressable
                    key={`event-${day.day.toISOString()}`}
                    style={({ pressed }) => [styles.dayRow, pressed && styles.dayRowPressed]}
                    onPress={() => openHistoryForDay(day.day)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open History for ${formatDayLabel(day.day, locale)}`}
                    accessibilityHint="Navigates to History with this day selected"
                  >
                    <View style={styles.dayRowLeft}>
                      <Text style={styles.dayRowLabel}>{formatDayLabel(day.day, locale)}</Text>
                      <Text style={styles.dayRowHint}>{describeTopCheckIn(day)}</Text>
                    </View>
                    <View style={styles.dayRowRight}>
                      <Text style={styles.dayRowValue}>{`${day.totalEventCount} ${noun}`}</Text>
                      <FontAwesome name="chevron-right" size={12} color={colors.stone400} />
                    </View>
                  </Pressable>
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
  weekPicker: {
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
  weekButton: {
    borderWidth: 1,
    borderColor: colors.borderAmber,
    backgroundColor: colors.backgroundLight,
    borderRadius: radius.full,
    width: controlSize.md,
    height: controlSize.md,
    alignItems: "center",
    justifyContent: "center",
  },
  weekButtonDisabled: {
    opacity: 0.45,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.stone800,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  errorBox: {
    backgroundColor: colors.rose50,
    borderWidth: 1,
    borderColor: colors.rose200,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorTitle: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.rose700,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.rose700,
  },
  summaryGroup: {
    gap: spacing.lg,
  },
  summarySection: {
    gap: spacing.sm,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  summaryHeadline: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.amber900,
  },
  insightList: {
    gap: spacing.sm,
  },
  insightRow: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  insightLabel: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  insightValue: {
    fontSize: fontSize.sm,
    color: colors.stone800,
    fontWeight: "600",
  },
  comparisonHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  comparisonValueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  comparisonDirection: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  comparisonDirectionUp: {
    color: colors.emerald600,
  },
  comparisonDirectionDown: {
    color: colors.amber700,
  },
  comparisonDirectionSame: {
    color: colors.stone500,
  },
  comparisonDelta: {
    fontSize: fontSize.xs,
    color: colors.stone600,
    fontWeight: "600",
  },
  comparisonSummary: {
    fontSize: fontSize.xs,
    color: colors.stone600,
  },
  comparisonGroup: {
    gap: spacing.sm,
  },
  comparisonSubheading: {
    fontSize: fontSize.xs,
    color: colors.stone600,
    fontWeight: "600",
  },
  consistencyLabel: {
    fontSize: fontSize.sm,
    color: colors.stone800,
    fontWeight: "600",
  },
  consistencyMeta: {
    fontSize: fontSize.xs,
    color: colors.stone600,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  totalLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.stone700,
  },
  totalValue: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.amber800,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.stone500,
    fontStyle: "italic",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: controlSize.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  dayRowPressed: {
    backgroundColor: colors.backgroundMuted,
  },
  dayRowLeft: {
    flex: 1,
    gap: 2,
  },
  dayRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayRowLabel: {
    fontSize: fontSize.sm,
    color: colors.stone800,
    fontWeight: "600",
  },
  dayRowHint: {
    fontSize: fontSize.xs,
    color: colors.stone500,
  },
  dayRowValue: {
    fontSize: fontSize.sm,
    color: colors.amber800,
    fontWeight: "700",
  },
});