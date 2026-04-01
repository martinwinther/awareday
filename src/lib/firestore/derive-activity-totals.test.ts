import { describe, expect, it } from "vitest";

import {
  deriveCompletedActivitySessions,
  deriveDailyActivityTotals,
} from "@/lib/firestore/derive-activity-totals";
import { at, buildActivityEntry } from "@/lib/firestore/__tests__/fixtures";

describe("deriveCompletedActivitySessions", () => {
  it("matches starts and ends per label using LIFO pairing", () => {
    const entries = [
      buildActivityEntry({ id: "start-1", label: "Focus", action: "start", timestamp: at("2026-04-01T09:00:00.000Z") }),
      buildActivityEntry({ id: "start-2", label: "Focus", action: "start", timestamp: at("2026-04-01T10:00:00.000Z") }),
      buildActivityEntry({ id: "end-1", label: "Focus", action: "end", timestamp: at("2026-04-01T11:00:00.000Z") }),
      buildActivityEntry({ id: "end-2", label: "Focus", action: "end", timestamp: at("2026-04-01T12:00:00.000Z") }),
    ];

    const sessions = deriveCompletedActivitySessions(entries);

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ startEntryId: "start-2", endEntryId: "end-1", durationMs: 60 * 60 * 1000 });
    expect(sessions[1]).toMatchObject({ startEntryId: "start-1", endEntryId: "end-2", durationMs: 3 * 60 * 60 * 1000 });
  });

  it("ignores unmatched end entries and returns empty sessions when no pairs exist", () => {
    const entries = [
      buildActivityEntry({ id: "end-only", label: "Read", action: "end", timestamp: at("2026-04-01T08:00:00.000Z") }),
    ];

    expect(deriveCompletedActivitySessions(entries)).toEqual([]);
  });
});

describe("deriveDailyActivityTotals", () => {
  it("aggregates durations by normalized label for sessions fully inside the selected local day", () => {
    const entries = [
      buildActivityEntry({ id: "focus-start-1", label: "Focus", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "focus-end-1", label: "Focus", action: "end", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "focus-start-2", label: "FOCUS", action: "start", timestamp: at("2026-04-01T13:00:00") }),
      buildActivityEntry({ id: "focus-end-2", label: "FOCUS", action: "end", timestamp: at("2026-04-01T13:30:00") }),
      buildActivityEntry({ id: "walk-start", label: "Walk", action: "start", timestamp: at("2026-04-01T15:00:00") }),
      buildActivityEntry({ id: "walk-end", label: "Walk", action: "end", timestamp: at("2026-04-01T16:00:00") }),
      buildActivityEntry({ id: "cross-start", label: "Read", action: "start", timestamp: at("2026-03-31T23:50:00") }),
      buildActivityEntry({ id: "cross-end", label: "Read", action: "end", timestamp: at("2026-04-01T00:10:00") }),
    ];

    const totals = deriveDailyActivityTotals(entries, new Date("2026-04-01T12:00:00"));

    expect(totals).toEqual([
      { normalizedLabel: "focus", label: "Focus", totalDurationMs: 90 * 60 * 1000 },
      { normalizedLabel: "walk", label: "Walk", totalDurationMs: 60 * 60 * 1000 },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(deriveDailyActivityTotals([], new Date("2026-04-01T12:00:00"))).toEqual([]);
  });
});
