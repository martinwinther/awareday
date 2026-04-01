import { describe, expect, it } from "vitest";

import { deriveTodayTimeline } from "@/lib/firestore/derive-today-timeline";
import { at, buildActivityEntry, buildEventEntry } from "@/lib/firestore/__tests__/fixtures";

describe("deriveTodayTimeline", () => {
  it("returns only same-day entries merged and sorted newest-first", () => {
    const activityEntries = [
      buildActivityEntry({ id: "a-1", label: "Read", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "a-2", label: "Read", action: "end", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "a-other-day", label: "Read", action: "start", timestamp: at("2026-03-31T10:00:00") }),
    ];
    const eventEntries = [
      buildEventEntry({ id: "e-1", label: "Coffee", timestamp: at("2026-04-01T11:00:00") }),
      buildEventEntry({ id: "e-other-day", label: "Coffee", timestamp: at("2026-04-02T10:00:00") }),
    ];

    const timeline = deriveTodayTimeline(activityEntries, eventEntries, new Date("2026-04-01T12:00:00"));

    expect(timeline.map((item) => item.entry.id)).toEqual(["e-1", "a-2", "a-1"]);
  });

  it("uses current tie-breakers for same timestamp ordering", () => {
    const sameTimestamp = at("2026-04-01T12:00:00");
    const activityEntries = [
      buildActivityEntry({ id: "a-start", label: "Read", action: "start", timestamp: sameTimestamp }),
      buildActivityEntry({ id: "a-end", label: "Read", action: "end", timestamp: sameTimestamp }),
    ];
    const eventEntries = [
      buildEventEntry({ id: "e-1", label: "Coffee", timestamp: sameTimestamp }),
      buildEventEntry({ id: "e-2", label: "Water", timestamp: sameTimestamp }),
    ];

    const timeline = deriveTodayTimeline(activityEntries, eventEntries, new Date("2026-04-01T12:00:00"));

    expect(timeline.map((item) => `${item.kind}:${item.entry.id}`)).toEqual([
      "activity-end:a-end",
      "activity-start:a-start",
      "event:e-2",
      "event:e-1",
    ]);
  });

  it("returns empty timeline for empty input", () => {
    expect(deriveTodayTimeline([], [], new Date("2026-04-01T12:00:00"))).toEqual([]);
  });
});
