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