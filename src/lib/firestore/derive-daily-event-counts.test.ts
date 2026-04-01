import { describe, expect, it } from "vitest";

import { deriveDailyEventCounts } from "@/lib/firestore/derive-daily-event-counts";
import { at, buildEventEntry } from "@/lib/firestore/__tests__/fixtures";

describe("deriveDailyEventCounts", () => {
  it("aggregates same-day entries by normalized label", () => {
    const entries = [
      buildEventEntry({ id: "coffee-1", label: "Coffee", timestamp: at("2026-04-01T09:00:00") }),
      buildEventEntry({ id: "coffee-2", label: "COFFEE", timestamp: at("2026-04-01T11:00:00") }),
      buildEventEntry({ id: "water-1", label: "Water", timestamp: at("2026-04-01T12:00:00") }),
      buildEventEntry({ id: "other-day", label: "Coffee", timestamp: at("2026-04-02T09:00:00") }),
    ];

    const counts = deriveDailyEventCounts(entries, new Date("2026-04-01T15:00:00"));

    expect(counts).toEqual([
      { normalizedLabel: "coffee", label: "Coffee", count: 2 },
      { normalizedLabel: "water", label: "Water", count: 1 },
    ]);
  });

  it("uses local-day boundaries with inclusive start and exclusive next-day start", () => {
    const entries = [
      buildEventEntry({ id: "start-boundary", label: "Stretch", timestamp: at("2026-04-01T00:00:00") }),
      buildEventEntry({ id: "inside", label: "Stretch", timestamp: at("2026-04-01T23:59:59") }),
      buildEventEntry({ id: "next-day-start", label: "Stretch", timestamp: at("2026-04-02T00:00:00") }),
    ];

    const counts = deriveDailyEventCounts(entries, new Date("2026-04-01T10:00:00"));

    expect(counts).toEqual([{ normalizedLabel: "stretch", label: "Stretch", count: 2 }]);
  });

  it("returns empty list for empty input", () => {
    expect(deriveDailyEventCounts([], new Date("2026-04-01T12:00:00"))).toEqual([]);
  });
});

