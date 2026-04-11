import { deriveDailyActivityTotals, type DailyActivityTotal } from "./derive-activity-totals";
import { deriveDailyEventCounts, type DailyEventCount } from "./derive-daily-event-counts";
import { formatDuration } from "./summary-helpers";

export type WeeklyDaySummary = {
  day: Date;
  activityTotals: DailyActivityTotal[];
  eventCounts: DailyEventCount[];
  totalActivityDurationMs: number;
  totalEventCount: number;
};

export type WeeklyReviewSummary = {
  weekStart: Date;
  weekEnd: Date;
  days: WeeklyDaySummary[];
  activityTotals: DailyActivityTotal[];
  eventCounts: DailyEventCount[];
};

export type WeeklyInsightsSummary = {
  topActivity: DailyActivityTotal | null;
  topCheckIn: DailyEventCount | null;
  busiestTrackedDay: WeeklyDaySummary | null;
  mostCheckInsDay: WeeklyDaySummary | null;
};

export type WeeklyInsightRow = {
  id: "top-activity" | "top-check-in" | "busiest-day" | "most-check-ins-day";
  label: string;
  value: string;
};

type RecurringCheckInId = "coffee" | "water" | "medication" | "mood-check" | "symptom-check";

type RecurringCheckInTarget = {
  id: RecurringCheckInId;
  normalizedLabel: string;
  aliases: string[];
};

export type WeeklyCheckInConsistencyRow = {
  id: RecurringCheckInId;
  normalizedLabel: string;
  label: string;
  daysWithCheckIn: number;
  currentStreakDays: number;
};

export type WeeklyComparisonDirection = "up" | "down" | "same";

export type WeeklyTotalComparisonRow = {
  id: "total-activity-time" | "total-check-ins";
  label: string;
  currentValue: string;
  deltaValue: string;
  summary: string;
  direction: WeeklyComparisonDirection;
};

export type WeeklyTopComparisonRow = {
  normalizedLabel: string;
  label: string;
  currentValue: string;
  deltaValue: string;
  summary: string;
  direction: WeeklyComparisonDirection;
};

export type WeeklyComparisonSummary = {
  totalActivityTime: WeeklyTotalComparisonRow;
  totalCheckIns: WeeklyTotalComparisonRow;
  topActivities: WeeklyTopComparisonRow[];
  topCheckIns: WeeklyTopComparisonRow[];
};

const recurringCheckInTargets: RecurringCheckInTarget[] = [
  { id: "water", normalizedLabel: "water", aliases: ["water"] },
  { id: "medication", normalizedLabel: "medication", aliases: ["medication"] },
  { id: "mood-check", normalizedLabel: "mood check", aliases: ["mood check", "mood check-in", "mood check in"] },
  { id: "symptom-check", normalizedLabel: "symptom check", aliases: ["symptom check", "symptom check-in", "symptom check in"] },
  { id: "coffee", normalizedLabel: "coffee", aliases: ["coffee"] },
];

function normalizeFirstDayOfWeek(firstDay: number): number {
  if (firstDay === 7) {
    return 0;
  }

  if (Number.isInteger(firstDay) && firstDay >= 0 && firstDay <= 6) {
    return firstDay;
  }

  if (Number.isInteger(firstDay) && firstDay >= 1 && firstDay <= 7) {
    return firstDay % 7;
  }

  return 1;
}

export function resolveFirstDayOfWeek(locale?: string): number {
  try {
    const resolvedLocale = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const localeInfo = new Intl.Locale(resolvedLocale) as Intl.Locale & {
      weekInfo?: {
        firstDay?: number;
      };
    };
    const firstDay = localeInfo.weekInfo?.firstDay;

    if (typeof firstDay === "number") {
      return normalizeFirstDayOfWeek(firstDay);
    }
  } catch {
    // Fall back to Monday when locale week metadata is unavailable.
  }

  return 1;
}

export function getStartOfLocalWeek(day: Date, firstDayOfWeek: number = 1): Date {
  const normalizedFirstDay = normalizeFirstDayOfWeek(firstDayOfWeek);
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);

  const dayOfWeek = start.getDay();
  const dayOffset = (dayOfWeek - normalizedFirstDay + 7) % 7;
  start.setDate(start.getDate() - dayOffset);

  return start;
}

export function getLocalWeekDays(day: Date, firstDayOfWeek: number = 1): Date[] {
  const start = getStartOfLocalWeek(day, firstDayOfWeek);

  return Array.from({ length: 7 }, (_, index) => {
    const nextDay = new Date(start);
    nextDay.setDate(start.getDate() + index);
    return nextDay;
  });
}

export function deriveWeeklyReviewSummary(
  activityEntries: Parameters<typeof deriveDailyActivityTotals>[0],
  eventEntries: Parameters<typeof deriveDailyEventCounts>[0],
  anchorDay: Date,
  firstDayOfWeek: number = 1,
): WeeklyReviewSummary {
  const days = getLocalWeekDays(anchorDay, firstDayOfWeek);
  const activityTotalsByLabel = new Map<string, DailyActivityTotal>();
  const eventCountsByLabel = new Map<string, DailyEventCount>();

  const daySummaries = days.map((day) => {
    const activityTotals = deriveDailyActivityTotals(activityEntries, day);
    const eventCounts = deriveDailyEventCounts(eventEntries, day);

    let totalActivityDurationMs = 0;
    let totalEventCount = 0;

    for (const total of activityTotals) {
      totalActivityDurationMs += total.totalDurationMs;

      const existing = activityTotalsByLabel.get(total.normalizedLabel);
      if (existing) {
        existing.totalDurationMs += total.totalDurationMs;
      } else {
        activityTotalsByLabel.set(total.normalizedLabel, { ...total });
      }
    }

    for (const count of eventCounts) {
      totalEventCount += count.count;

      const existing = eventCountsByLabel.get(count.normalizedLabel);
      if (existing) {
        existing.count += count.count;
      } else {
        eventCountsByLabel.set(count.normalizedLabel, { ...count });
      }
    }

    return {
      day,
      activityTotals,
      eventCounts,
      totalActivityDurationMs,
      totalEventCount,
    };
  });

  const activityTotals = Array.from(activityTotalsByLabel.values()).sort((left, right) => {
    if (right.totalDurationMs !== left.totalDurationMs) {
      return right.totalDurationMs - left.totalDurationMs;
    }

    return left.label.localeCompare(right.label);
  });

  const eventCounts = Array.from(eventCountsByLabel.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label);
  });

  return {
    weekStart: daySummaries[0]?.day ?? getStartOfLocalWeek(anchorDay, firstDayOfWeek),
    weekEnd: daySummaries[6]?.day ?? getStartOfLocalWeek(anchorDay, firstDayOfWeek),
    days: daySummaries,
    activityTotals,
    eventCounts,
  };
}

export function deriveWeeklyInsightsSummary(summary: WeeklyReviewSummary): WeeklyInsightsSummary {
  const topActivity = summary.activityTotals[0] ?? null;
  const topCheckIn = summary.eventCounts[0] ?? null;

  let busiestTrackedDay: WeeklyDaySummary | null = null;
  let mostCheckInsDay: WeeklyDaySummary | null = null;

  for (const day of summary.days) {
    if (
      day.totalActivityDurationMs > 0 &&
      (!busiestTrackedDay || day.totalActivityDurationMs > busiestTrackedDay.totalActivityDurationMs)
    ) {
      busiestTrackedDay = day;
    }

    if (
      day.totalEventCount > 0 &&
      (!mostCheckInsDay || day.totalEventCount > mostCheckInsDay.totalEventCount)
    ) {
      mostCheckInsDay = day;
    }
  }

  return {
    topActivity,
    topCheckIn,
    busiestTrackedDay,
    mostCheckInsDay,
  };
}

function formatWeeklyInsightDayLabel(day: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(day);
}

function getStartOfDay(day: Date): Date {
  const next = new Date(day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function clampToWeekDay(summary: WeeklyReviewSummary, referenceDay: Date): Date {
  const day = getStartOfDay(referenceDay);

  if (day < summary.weekStart) {
    return summary.weekStart;
  }

  if (day > summary.weekEnd) {
    return summary.weekEnd;
  }

  return day;
}

function getAnchorDayIndex(summary: WeeklyReviewSummary, anchorDay: Date): number {
  for (let index = summary.days.length - 1; index >= 0; index -= 1) {
    if (summary.days[index].day.getTime() <= anchorDay.getTime()) {
      return index;
    }
  }

  return -1;
}

function getComparisonDirection(delta: number): WeeklyComparisonDirection {
  if (delta > 0) {
    return "up";
  }

  if (delta < 0) {
    return "down";
  }

  return "same";
}

function formatSignedDuration(deltaMs: number): string {
  if (deltaMs === 0) {
    return "0m";
  }

  const sign = deltaMs > 0 ? "+" : "-";
  return `${sign}${formatDuration(Math.abs(deltaMs))}`;
}

function formatDurationDeltaSummary(deltaMs: number): string {
  if (deltaMs > 0) {
    return `${formatDuration(deltaMs)} more than last week`;
  }

  if (deltaMs < 0) {
    return `${formatDuration(Math.abs(deltaMs))} less than last week`;
  }

  return "Same as last week";
}

function formatSignedCheckInDelta(deltaCount: number): string {
  if (deltaCount === 0) {
    return "0";
  }

  return `${deltaCount > 0 ? "+" : ""}${deltaCount}`;
}

function formatCheckInDeltaSummary(deltaCount: number): string {
  if (deltaCount === 0) {
    return "Same as last week";
  }

  const absoluteDelta = Math.abs(deltaCount);
  const noun = absoluteDelta === 1 ? "check-in" : "check-ins";
  const direction = deltaCount > 0 ? "more" : "less";
  return `${absoluteDelta} ${direction} ${noun} than last week`;
}

function sumWeeklyActivityDuration(summary: WeeklyReviewSummary): number {
  return summary.days.reduce((total, day) => total + day.totalActivityDurationMs, 0);
}

function sumWeeklyCheckIns(summary: WeeklyReviewSummary): number {
  return summary.days.reduce((total, day) => total + day.totalEventCount, 0);
}

export function deriveWeeklyComparisonSummary(
  currentSummary: WeeklyReviewSummary,
  previousSummary: WeeklyReviewSummary,
  topItemLimit: number = 3,
): WeeklyComparisonSummary {
  const currentTotalActivityMs = sumWeeklyActivityDuration(currentSummary);
  const previousTotalActivityMs = sumWeeklyActivityDuration(previousSummary);
  const totalActivityDeltaMs = currentTotalActivityMs - previousTotalActivityMs;

  const currentTotalCheckIns = sumWeeklyCheckIns(currentSummary);
  const previousTotalCheckIns = sumWeeklyCheckIns(previousSummary);
  const totalCheckInDelta = currentTotalCheckIns - previousTotalCheckIns;

  const previousActivityByLabel = new Map(
    previousSummary.activityTotals.map((total) => [total.normalizedLabel, total.totalDurationMs]),
  );

  const previousCheckInsByLabel = new Map(
    previousSummary.eventCounts.map((count) => [count.normalizedLabel, count.count]),
  );

  const topActivities = currentSummary.activityTotals.slice(0, topItemLimit).map((total) => {
    const previousValue = previousActivityByLabel.get(total.normalizedLabel) ?? 0;
    const deltaMs = total.totalDurationMs - previousValue;

    return {
      normalizedLabel: total.normalizedLabel,
      label: total.label,
      currentValue: formatDuration(total.totalDurationMs),
      deltaValue: formatSignedDuration(deltaMs),
      summary: formatDurationDeltaSummary(deltaMs),
      direction: getComparisonDirection(deltaMs),
    };
  });

  const topCheckIns = currentSummary.eventCounts.slice(0, topItemLimit).map((count) => {
    const previousValue = previousCheckInsByLabel.get(count.normalizedLabel) ?? 0;
    const deltaCount = count.count - previousValue;

    return {
      normalizedLabel: count.normalizedLabel,
      label: count.label,
      currentValue: `${count.count}`,
      deltaValue: formatSignedCheckInDelta(deltaCount),
      summary: formatCheckInDeltaSummary(deltaCount),
      direction: getComparisonDirection(deltaCount),
    };
  });

  return {
    totalActivityTime: {
      id: "total-activity-time",
      label: "Total tracked activity time",
      currentValue: formatDuration(currentTotalActivityMs),
      deltaValue: formatSignedDuration(totalActivityDeltaMs),
      summary: formatDurationDeltaSummary(totalActivityDeltaMs),
      direction: getComparisonDirection(totalActivityDeltaMs),
    },
    totalCheckIns: {
      id: "total-check-ins",
      label: "Total counters/check-ins",
      currentValue: `${currentTotalCheckIns}`,
      deltaValue: formatSignedCheckInDelta(totalCheckInDelta),
      summary: formatCheckInDeltaSummary(totalCheckInDelta),
      direction: getComparisonDirection(totalCheckInDelta),
    },
    topActivities,
    topCheckIns,
  };
}

export function deriveWeeklyCheckInConsistencyRows(
  summary: WeeklyReviewSummary,
  referenceDay: Date = new Date(),
): WeeklyCheckInConsistencyRow[] {
  if (summary.days.length === 0) {
    return [];
  }

  const anchorDay = clampToWeekDay(summary, referenceDay);
  const anchorDayIndex = getAnchorDayIndex(summary, anchorDay);

  if (anchorDayIndex < 0) {
    return [];
  }

  return recurringCheckInTargets.flatMap((target) => {
    const aliases = new Set(target.aliases);
    const matchingWeeklyCounts = summary.eventCounts.filter((count) => aliases.has(count.normalizedLabel));

    if (matchingWeeklyCounts.length === 0) {
      return [];
    }

    const representative = [...matchingWeeklyCounts].sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label);
    })[0];

    const hasCheckInByDay = summary.days.map((day) => (
      day.eventCounts.some((count) => aliases.has(count.normalizedLabel) && count.count > 0)
    ));

    const daysWithCheckIn = hasCheckInByDay.reduce((count, hasCheckIn) => (hasCheckIn ? count + 1 : count), 0);

    let currentStreakDays = 0;

    for (let index = anchorDayIndex; index >= 0; index -= 1) {
      if (!hasCheckInByDay[index]) {
        break;
      }

      currentStreakDays += 1;
    }

    return [{
      id: target.id,
      normalizedLabel: target.normalizedLabel,
      label: representative.label,
      daysWithCheckIn,
      currentStreakDays,
    }];
  });
}

export function deriveWeeklyInsightRows(summary: WeeklyReviewSummary, locale: string): WeeklyInsightRow[] {
  const weeklyInsights = deriveWeeklyInsightsSummary(summary);

  const topActivityValue = weeklyInsights.topActivity
    ? `${weeklyInsights.topActivity.label} ${formatDuration(weeklyInsights.topActivity.totalDurationMs)}`
    : "No completed activities this week";

  const topCheckInValue = weeklyInsights.topCheckIn
    ? `${weeklyInsights.topCheckIn.label} ${weeklyInsights.topCheckIn.count} ${weeklyInsights.topCheckIn.count === 1 ? "check-in" : "check-ins"}`
    : "No check-ins logged this week";

  const busiestDayValue = weeklyInsights.busiestTrackedDay
    ? `${formatWeeklyInsightDayLabel(weeklyInsights.busiestTrackedDay.day, locale)} ${formatDuration(weeklyInsights.busiestTrackedDay.totalActivityDurationMs)}`
    : "No tracked activity durations this week";

  const mostCheckInsDayValue = weeklyInsights.mostCheckInsDay
    ? `${formatWeeklyInsightDayLabel(weeklyInsights.mostCheckInsDay.day, locale)} ${weeklyInsights.mostCheckInsDay.totalEventCount} ${weeklyInsights.mostCheckInsDay.totalEventCount === 1 ? "check-in" : "check-ins"}`
    : "No check-ins logged this week";

  return [
    {
      id: "top-activity",
      label: "Most time spent activity",
      value: topActivityValue,
    },
    {
      id: "top-check-in",
      label: "Most frequent counter/check-in",
      value: topCheckInValue,
    },
    {
      id: "busiest-day",
      label: "Busiest day by tracked time",
      value: busiestDayValue,
    },
    {
      id: "most-check-ins-day",
      label: "Day with most counters/check-ins",
      value: mostCheckInsDayValue,
    },
  ];
}