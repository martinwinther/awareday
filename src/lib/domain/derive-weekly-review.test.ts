import { describe, expect, it } from "vitest";

import {
  deriveWeeklyComparisonSummary,
  deriveWeeklyCheckInConsistencyRows,
  deriveWeeklyInsightRows,
  deriveWeeklyInsightsSummary,
  deriveWeeklyReviewSummary,
  getStartOfLocalWeek,
} from "./derive-weekly-review";
import { at, buildActivityEntry, buildEventEntry } from "./__tests__/fixtures";

describe("getStartOfLocalWeek", () => {
  it("uses Monday week starts by default", () => {
    const start = getStartOfLocalWeek(new Date("2026-04-09T15:30:00"));

    expect(start).toEqual(new Date("2026-04-06T00:00:00"));
  });

  it("supports Sunday week starts when requested", () => {
    const start = getStartOfLocalWeek(new Date("2026-04-09T15:30:00"), 0);

    expect(start).toEqual(new Date("2026-04-05T00:00:00"));
  });
});

describe("deriveWeeklyReviewSummary", () => {
  it("aggregates weekly activity duration, weekly check-in totals, and per-day summaries", () => {
    const activityEntries = [
      buildActivityEntry({ id: "focus-start-mon", label: "Focus", action: "start", timestamp: at("2026-04-06T09:00:00") }),
      buildActivityEntry({ id: "focus-end-mon", label: "Focus", action: "end", timestamp: at("2026-04-06T10:00:00") }),
      buildActivityEntry({ id: "focus-start-wed", label: "FOCUS", action: "start", timestamp: at("2026-04-08T09:00:00") }),
      buildActivityEntry({ id: "focus-end-wed", label: "FOCUS", action: "end", timestamp: at("2026-04-08T10:30:00") }),
      buildActivityEntry({ id: "walk-start-thu", label: "Walk", action: "start", timestamp: at("2026-04-09T18:00:00") }),
      buildActivityEntry({ id: "walk-end-thu", label: "Walk", action: "end", timestamp: at("2026-04-09T19:00:00") }),
      buildActivityEntry({ id: "outside-start", label: "Read", action: "start", timestamp: at("2026-04-05T20:00:00") }),
      buildActivityEntry({ id: "outside-end", label: "Read", action: "end", timestamp: at("2026-04-05T20:30:00") }),
    ];

    const eventEntries = [
      buildEventEntry({ id: "coffee-mon-1", label: "Coffee", timestamp: at("2026-04-06T08:30:00") }),
      buildEventEntry({ id: "coffee-mon-2", label: "Coffee", timestamp: at("2026-04-06T13:00:00") }),
      buildEventEntry({ id: "water-wed", label: "Water", timestamp: at("2026-04-08T15:00:00") }),
      buildEventEntry({ id: "coffee-fri", label: "COFFEE", timestamp: at("2026-04-10T09:10:00") }),
      buildEventEntry({ id: "outside", label: "Water", timestamp: at("2026-04-13T09:00:00") }),
    ];

    const summary = deriveWeeklyReviewSummary(
      activityEntries,
      eventEntries,
      new Date("2026-04-09T12:00:00"),
      1,
    );

    expect(summary.weekStart).toEqual(new Date("2026-04-06T00:00:00"));
    expect(summary.weekEnd).toEqual(new Date("2026-04-12T00:00:00"));
    expect(summary.days).toHaveLength(7);

    expect(summary.activityTotals).toEqual([
      { normalizedLabel: "focus", label: "Focus", totalDurationMs: 150 * 60 * 1000 },
      { normalizedLabel: "walk", label: "Walk", totalDurationMs: 60 * 60 * 1000 },
    ]);

    expect(summary.eventCounts).toEqual([
      { normalizedLabel: "coffee", label: "Coffee", count: 3 },
      { normalizedLabel: "water", label: "Water", count: 1 },
    ]);

    expect(summary.days[0]).toMatchObject({
      day: new Date("2026-04-06T00:00:00"),
      totalActivityDurationMs: 60 * 60 * 1000,
      totalEventCount: 2,
    });

    expect(summary.days[2]).toMatchObject({
      day: new Date("2026-04-08T00:00:00"),
      totalActivityDurationMs: 90 * 60 * 1000,
      totalEventCount: 1,
    });

    expect(summary.days[6]).toMatchObject({
      day: new Date("2026-04-12T00:00:00"),
      totalActivityDurationMs: 0,
      totalEventCount: 0,
    });
  });
});

describe("deriveWeeklyInsightsSummary", () => {
  it("returns weekly standout insights from the summary", () => {
    const activityEntries = [
      buildActivityEntry({ id: "focus-start-mon", label: "Focus", action: "start", timestamp: at("2026-04-06T09:00:00") }),
      buildActivityEntry({ id: "focus-end-mon", label: "Focus", action: "end", timestamp: at("2026-04-06T10:00:00") }),
      buildActivityEntry({ id: "focus-start-wed", label: "Focus", action: "start", timestamp: at("2026-04-08T09:00:00") }),
      buildActivityEntry({ id: "focus-end-wed", label: "Focus", action: "end", timestamp: at("2026-04-08T11:00:00") }),
      buildActivityEntry({ id: "walk-start-fri", label: "Walk", action: "start", timestamp: at("2026-04-10T18:00:00") }),
      buildActivityEntry({ id: "walk-end-fri", label: "Walk", action: "end", timestamp: at("2026-04-10T19:00:00") }),
    ];

    const eventEntries = [
      buildEventEntry({ id: "coffee-mon", label: "Coffee", timestamp: at("2026-04-06T08:30:00") }),
      buildEventEntry({ id: "coffee-wed-1", label: "Coffee", timestamp: at("2026-04-08T11:00:00") }),
      buildEventEntry({ id: "coffee-wed-2", label: "Coffee", timestamp: at("2026-04-08T13:00:00") }),
      buildEventEntry({ id: "water-thu", label: "Water", timestamp: at("2026-04-09T15:00:00") }),
    ];

    const weeklySummary = deriveWeeklyReviewSummary(
      activityEntries,
      eventEntries,
      new Date("2026-04-09T12:00:00"),
      1,
    );

    const insights = deriveWeeklyInsightsSummary(weeklySummary);

    expect(insights.topActivity).toEqual({
      normalizedLabel: "focus",
      label: "Focus",
      totalDurationMs: 3 * 60 * 60 * 1000,
    });

    expect(insights.topCheckIn).toEqual({
      normalizedLabel: "coffee",
      label: "Coffee",
      count: 3,
    });

    expect(insights.busiestTrackedDay?.day).toEqual(new Date("2026-04-08T00:00:00"));
    expect(insights.busiestTrackedDay?.totalActivityDurationMs).toBe(2 * 60 * 60 * 1000);
    expect(insights.mostCheckInsDay?.day).toEqual(new Date("2026-04-08T00:00:00"));
    expect(insights.mostCheckInsDay?.totalEventCount).toBe(2);
  });

  it("returns null insights when there is no tracked data", () => {
    const weeklySummary = deriveWeeklyReviewSummary(
      [],
      [],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    const insights = deriveWeeklyInsightsSummary(weeklySummary);

    expect(insights.topActivity).toBeNull();
    expect(insights.topCheckIn).toBeNull();
    expect(insights.busiestTrackedDay).toBeNull();
    expect(insights.mostCheckInsDay).toBeNull();
  });
});

describe("deriveWeeklyInsightRows", () => {
  it("builds stable insight rows for a populated week", () => {
    const activityEntries = [
      buildActivityEntry({ id: "focus-start-mon", label: "Focus", action: "start", timestamp: at("2026-04-06T09:00:00") }),
      buildActivityEntry({ id: "focus-end-mon", label: "Focus", action: "end", timestamp: at("2026-04-06T10:00:00") }),
      buildActivityEntry({ id: "focus-start-wed", label: "Focus", action: "start", timestamp: at("2026-04-08T09:00:00") }),
      buildActivityEntry({ id: "focus-end-wed", label: "Focus", action: "end", timestamp: at("2026-04-08T11:00:00") }),
    ];

    const eventEntries = [
      buildEventEntry({ id: "coffee-wed-1", label: "Coffee", timestamp: at("2026-04-08T11:00:00") }),
      buildEventEntry({ id: "coffee-wed-2", label: "Coffee", timestamp: at("2026-04-08T13:00:00") }),
    ];

    const summary = deriveWeeklyReviewSummary(
      activityEntries,
      eventEntries,
      new Date("2026-04-09T12:00:00"),
      1,
    );

    expect(deriveWeeklyInsightRows(summary, "en-US")).toEqual([
      {
        id: "top-activity",
        label: "Most time spent activity",
        value: "Focus 3h 0m",
      },
      {
        id: "top-check-in",
        label: "Most frequent counter/check-in",
        value: "Coffee 2 check-ins",
      },
      {
        id: "busiest-day",
        label: "Busiest day by tracked time",
        value: "Wed, Apr 8 2h 0m",
      },
      {
        id: "most-check-ins-day",
        label: "Day with most counters/check-ins",
        value: "Wed, Apr 8 2 check-ins",
      },
    ]);
  });

  it("returns fallback row copy for an empty week", () => {
    const summary = deriveWeeklyReviewSummary(
      [],
      [],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    expect(deriveWeeklyInsightRows(summary, "en-US")).toEqual([
      {
        id: "top-activity",
        label: "Most time spent activity",
        value: "No completed activities this week",
      },
      {
        id: "top-check-in",
        label: "Most frequent counter/check-in",
        value: "No check-ins logged this week",
      },
      {
        id: "busiest-day",
        label: "Busiest day by tracked time",
        value: "No tracked activity durations this week",
      },
      {
        id: "most-check-ins-day",
        label: "Day with most counters/check-ins",
        value: "No check-ins logged this week",
      },
    ]);
  });
});

describe("deriveWeeklyCheckInConsistencyRows", () => {
  it("summarizes weekly consistency for recurring counters/check-ins", () => {
    const summary = deriveWeeklyReviewSummary(
      [],
      [
        buildEventEntry({ id: "coffee-mon", label: "Coffee", timestamp: at("2026-04-06T08:30:00") }),
        buildEventEntry({ id: "coffee-fri", label: "Coffee", timestamp: at("2026-04-10T10:30:00") }),
        buildEventEntry({ id: "water-tue", label: "Water", timestamp: at("2026-04-07T09:00:00") }),
        buildEventEntry({ id: "water-wed", label: "Water", timestamp: at("2026-04-08T10:00:00") }),
        buildEventEntry({ id: "med-thu", label: "Medication", timestamp: at("2026-04-09T07:00:00") }),
        buildEventEntry({ id: "med-fri", label: "Medication", timestamp: at("2026-04-10T07:00:00") }),
        buildEventEntry({ id: "mood-wed", label: "Mood check", timestamp: at("2026-04-08T21:00:00") }),
        buildEventEntry({ id: "mood-thu", label: "Mood check", timestamp: at("2026-04-09T21:00:00") }),
        buildEventEntry({ id: "custom", label: "Stretch", timestamp: at("2026-04-09T12:00:00") }),
      ],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    expect(deriveWeeklyCheckInConsistencyRows(summary, new Date("2026-04-10T18:00:00"))).toEqual([
      {
        id: "water",
        normalizedLabel: "water",
        label: "Water",
        daysWithCheckIn: 2,
        currentStreakDays: 0,
      },
      {
        id: "medication",
        normalizedLabel: "medication",
        label: "Medication",
        daysWithCheckIn: 2,
        currentStreakDays: 2,
      },
      {
        id: "mood-check",
        normalizedLabel: "mood check",
        label: "Mood check",
        daysWithCheckIn: 2,
        currentStreakDays: 0,
      },
      {
        id: "coffee",
        normalizedLabel: "coffee",
        label: "Coffee",
        daysWithCheckIn: 2,
        currentStreakDays: 1,
      },
    ]);
  });

  it("uses the selected week end as streak anchor for past weeks", () => {
    const summary = deriveWeeklyReviewSummary(
      [],
      [
        buildEventEntry({ id: "symptom-sat", label: "Symptom check", timestamp: at("2026-04-11T20:00:00") }),
        buildEventEntry({ id: "symptom-sun", label: "Symptom check", timestamp: at("2026-04-12T20:00:00") }),
      ],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    expect(deriveWeeklyCheckInConsistencyRows(summary, new Date("2026-04-20T10:00:00"))).toEqual([
      {
        id: "symptom-check",
        normalizedLabel: "symptom check",
        label: "Symptom check",
        daysWithCheckIn: 2,
        currentStreakDays: 2,
      },
    ]);
  });
});

describe("deriveWeeklyComparisonSummary", () => {
  it("compares weekly totals and top rows against the immediately previous week", () => {
    const currentWeekSummary = deriveWeeklyReviewSummary(
      [
        buildActivityEntry({ id: "focus-start-current", label: "Focus", action: "start", timestamp: at("2026-04-07T09:00:00") }),
        buildActivityEntry({ id: "focus-end-current", label: "Focus", action: "end", timestamp: at("2026-04-07T11:00:00") }),
        buildActivityEntry({ id: "walk-start-current", label: "Walk", action: "start", timestamp: at("2026-04-08T18:00:00") }),
        buildActivityEntry({ id: "walk-end-current", label: "Walk", action: "end", timestamp: at("2026-04-08T18:30:00") }),
      ],
      [
        buildEventEntry({ id: "coffee-current-1", label: "Coffee", timestamp: at("2026-04-07T08:30:00") }),
        buildEventEntry({ id: "coffee-current-2", label: "Coffee", timestamp: at("2026-04-08T09:30:00") }),
        buildEventEntry({ id: "water-current", label: "Water", timestamp: at("2026-04-09T15:00:00") }),
      ],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    const previousWeekSummary = deriveWeeklyReviewSummary(
      [
        buildActivityEntry({ id: "focus-start-previous", label: "Focus", action: "start", timestamp: at("2026-03-31T09:00:00") }),
        buildActivityEntry({ id: "focus-end-previous", label: "Focus", action: "end", timestamp: at("2026-03-31T10:00:00") }),
        buildActivityEntry({ id: "walk-start-previous", label: "Walk", action: "start", timestamp: at("2026-04-01T18:00:00") }),
        buildActivityEntry({ id: "walk-end-previous", label: "Walk", action: "end", timestamp: at("2026-04-01T18:45:00") }),
      ],
      [
        buildEventEntry({ id: "coffee-previous", label: "Coffee", timestamp: at("2026-03-31T08:30:00") }),
        buildEventEntry({ id: "water-previous-1", label: "Water", timestamp: at("2026-04-01T09:30:00") }),
        buildEventEntry({ id: "water-previous-2", label: "Water", timestamp: at("2026-04-02T15:00:00") }),
        buildEventEntry({ id: "water-previous-3", label: "Water", timestamp: at("2026-04-03T15:00:00") }),
      ],
      new Date("2026-04-02T12:00:00"),
      1,
    );

    expect(deriveWeeklyComparisonSummary(currentWeekSummary, previousWeekSummary)).toEqual({
      totalActivityTime: {
        id: "total-activity-time",
        label: "Total tracked activity time",
        currentValue: "2h 30m",
        deltaValue: "+45m",
        summary: "45m more than last week",
        direction: "up",
      },
      totalCheckIns: {
        id: "total-check-ins",
        label: "Total counters/check-ins",
        currentValue: "3",
        deltaValue: "-1",
        summary: "1 less check-in than last week",
        direction: "down",
      },
      topActivities: [
        {
          normalizedLabel: "focus",
          label: "Focus",
          currentValue: "2h 0m",
          deltaValue: "+1h 0m",
          summary: "1h 0m more than last week",
          direction: "up",
        },
        {
          normalizedLabel: "walk",
          label: "Walk",
          currentValue: "30m",
          deltaValue: "-15m",
          summary: "15m less than last week",
          direction: "down",
        },
      ],
      topCheckIns: [
        {
          normalizedLabel: "coffee",
          label: "Coffee",
          currentValue: "2",
          deltaValue: "+1",
          summary: "1 more check-in than last week",
          direction: "up",
        },
        {
          normalizedLabel: "water",
          label: "Water",
          currentValue: "1",
          deltaValue: "-2",
          summary: "2 less check-ins than last week",
          direction: "down",
        },
      ],
    });
  });

  it("returns same-direction comparisons when there is no week-over-week change", () => {
    const currentWeekSummary = deriveWeeklyReviewSummary(
      [
        buildActivityEntry({ id: "focus-start-current", label: "Focus", action: "start", timestamp: at("2026-04-06T09:00:00") }),
        buildActivityEntry({ id: "focus-end-current", label: "Focus", action: "end", timestamp: at("2026-04-06T10:00:00") }),
      ],
      [
        buildEventEntry({ id: "coffee-current", label: "Coffee", timestamp: at("2026-04-06T08:30:00") }),
      ],
      new Date("2026-04-09T12:00:00"),
      1,
    );

    const previousWeekSummary = deriveWeeklyReviewSummary(
      [
        buildActivityEntry({ id: "focus-start-previous", label: "Focus", action: "start", timestamp: at("2026-03-30T09:00:00") }),
        buildActivityEntry({ id: "focus-end-previous", label: "Focus", action: "end", timestamp: at("2026-03-30T10:00:00") }),
      ],
      [
        buildEventEntry({ id: "coffee-previous", label: "Coffee", timestamp: at("2026-03-30T08:30:00") }),
      ],
      new Date("2026-04-02T12:00:00"),
      1,
    );

    expect(deriveWeeklyComparisonSummary(currentWeekSummary, previousWeekSummary)).toMatchObject({
      totalActivityTime: {
        deltaValue: "0m",
        summary: "Same as last week",
        direction: "same",
      },
      totalCheckIns: {
        deltaValue: "0",
        summary: "Same as last week",
        direction: "same",
      },
      topActivities: [
        {
          deltaValue: "0m",
          summary: "Same as last week",
          direction: "same",
        },
      ],
      topCheckIns: [
        {
          deltaValue: "0",
          summary: "Same as last week",
          direction: "same",
        },
      ],
    });
  });
});