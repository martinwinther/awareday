import { describe, expect, it } from "vitest";

import { at, buildActivityEntry, buildEventEntry } from "@/lib/firestore/__tests__/fixtures";
import { deriveSingleDayCalendarItems } from "@/lib/firestore/derive-single-day-calendar-items";

describe("deriveSingleDayCalendarItems", () => {
  it("derives activity blocks and event markers for the selected day", () => {
    const activityEntries = [
      buildActivityEntry({ id: "start-focus", label: "Focus", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "end-focus", label: "Focus", action: "end", timestamp: at("2026-04-01T10:30:00") }),
      buildActivityEntry({ id: "other-day-start", label: "Walk", action: "start", timestamp: at("2026-03-31T09:00:00") }),
      buildActivityEntry({ id: "other-day-end", label: "Walk", action: "end", timestamp: at("2026-03-31T10:00:00") }),
    ];

    const eventEntries = [
      buildEventEntry({ id: "event-1", label: "Coffee", timestamp: at("2026-04-01T11:15:00") }),
      buildEventEntry({ id: "event-other-day", label: "Tea", timestamp: at("2026-04-02T11:15:00") }),
    ];

    const result = deriveSingleDayCalendarItems(activityEntries, eventEntries, new Date("2026-04-01T12:00:00"));

    expect(result.activityBlocks).toHaveLength(1);
    expect(result.activityBlocks[0]).toMatchObject({
      id: "start-focus:end-focus",
      label: "Focus",
      durationMs: 90 * 60 * 1000,
      laneIndex: 0,
      laneCount: 1,
      laneSpan: 1,
    });
    expect(result.activityBlocks[0].topPercent).toBeCloseTo(37.5);
    expect(result.activityBlocks[0].heightPercent).toBeCloseTo(6.25);

    expect(result.eventMarkers).toHaveLength(1);
    expect(result.eventMarkers[0]).toMatchObject({ id: "event-1", label: "Coffee", stackIndex: 0, stackSize: 1 });
    expect(result.eventMarkers[0].topPercent).toBeCloseTo(46.875);
  });

  it("clips cross-midnight activity sessions to selected day boundaries", () => {
    const activityEntries = [
      buildActivityEntry({ id: "start-midnight", label: "Read", action: "start", timestamp: at("2026-03-31T23:45:00") }),
      buildActivityEntry({ id: "end-midnight", label: "Read", action: "end", timestamp: at("2026-04-01T00:15:00") }),
      buildActivityEntry({ id: "start-late", label: "Code", action: "start", timestamp: at("2026-04-01T23:30:00") }),
      buildActivityEntry({ id: "end-late", label: "Code", action: "end", timestamp: at("2026-04-02T00:30:00") }),
    ];

    const result = deriveSingleDayCalendarItems(activityEntries, [], new Date("2026-04-01T12:00:00"));

    expect(result.activityBlocks).toHaveLength(2);
    expect(result.activityBlocks[0].topPercent).toBeCloseTo(0);
    expect(result.activityBlocks[0].heightPercent).toBeCloseTo((15 / 1440) * 100);
    expect(result.activityBlocks[1].topPercent).toBeCloseTo((23.5 * 60 / 1440) * 100);
    expect(result.activityBlocks[1].heightPercent).toBeCloseTo((30 / 1440) * 100);
  });

  it("assigns side-by-side lanes for overlapping activity blocks", () => {
    const activityEntries = [
      buildActivityEntry({ id: "a-start", label: "Focus", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "a-end", label: "Focus", action: "end", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "b-start", label: "Walk", action: "start", timestamp: at("2026-04-01T09:20:00") }),
      buildActivityEntry({ id: "b-end", label: "Walk", action: "end", timestamp: at("2026-04-01T09:50:00") }),
      buildActivityEntry({ id: "c-start", label: "Read", action: "start", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "c-end", label: "Read", action: "end", timestamp: at("2026-04-01T10:30:00") }),
    ];

    const result = deriveSingleDayCalendarItems(activityEntries, [], new Date("2026-04-01T12:00:00"));

    expect(result.activityBlocks.map((block) => block.id)).toEqual(["a-start:a-end", "b-start:b-end", "c-start:c-end"]);
    expect(result.activityBlocks.map((block) => block.laneIndex)).toEqual([0, 1, 0]);
    expect(result.activityBlocks.map((block) => block.laneCount)).toEqual([2, 2, 1]);
    expect(result.activityBlocks.map((block) => block.laneSpan)).toEqual([1, 1, 1]);
  });

  it("lets blocks expand into free columns when overlap clears", () => {
    const activityEntries = [
      buildActivityEntry({ id: "a-start", label: "Deep work", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "a-end", label: "Deep work", action: "end", timestamp: at("2026-04-01T12:00:00") }),
      buildActivityEntry({ id: "b-start", label: "Call", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "b-end", label: "Call", action: "end", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "c-start", label: "Email", action: "start", timestamp: at("2026-04-01T09:00:00") }),
      buildActivityEntry({ id: "c-end", label: "Email", action: "end", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "d-start", label: "Review", action: "start", timestamp: at("2026-04-01T10:00:00") }),
      buildActivityEntry({ id: "d-end", label: "Review", action: "end", timestamp: at("2026-04-01T12:00:00") }),
    ];

    const result = deriveSingleDayCalendarItems(activityEntries, [], new Date("2026-04-01T12:00:00"));

    const byId = new Map(result.activityBlocks.map((block) => [block.id, block]));

    expect(byId.get("a-start:a-end")).toMatchObject({ laneCount: 3, laneSpan: 1 });
    expect(byId.get("b-start:b-end")).toMatchObject({ laneCount: 3, laneSpan: 1 });
    expect(byId.get("c-start:c-end")).toMatchObject({ laneCount: 3, laneSpan: 1 });
    expect(byId.get("d-start:d-end")).toMatchObject({ laneCount: 3, laneSpan: 2 });
    expect((byId.get("d-start:d-end")?.laneIndex ?? 99) + 2).toBeLessThanOrEqual(3);
  });

  it("stacks nearby events while keeping timestamp order", () => {
    const eventEntries = [
      buildEventEntry({ id: "event-a", label: "Coffee", timestamp: at("2026-04-01T10:00:00") }),
      buildEventEntry({ id: "event-b", label: "Water", timestamp: at("2026-04-01T10:03:00") }),
      buildEventEntry({ id: "event-c", label: "Stretch", timestamp: at("2026-04-01T10:08:00") }),
      buildEventEntry({ id: "event-d", label: "Snack", timestamp: at("2026-04-01T10:20:00") }),
    ];

    const result = deriveSingleDayCalendarItems([], eventEntries, new Date("2026-04-01T12:00:00"));

    expect(result.eventMarkers.map((marker) => marker.id)).toEqual(["event-a", "event-b", "event-c", "event-d"]);
    expect(result.eventMarkers.map((marker) => marker.stackIndex)).toEqual([0, 1, 2, 0]);
    expect(result.eventMarkers.map((marker) => marker.stackSize)).toEqual([3, 3, 3, 1]);
  });
});

