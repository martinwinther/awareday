import { deriveDailyActivityTotals, type DailyActivityTotal } from "./derive-activity-totals";
import { deriveDailyEventCounts, type DailyEventCount } from "./derive-daily-event-counts";

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