import { describe, expect, it } from "vitest";

import {
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