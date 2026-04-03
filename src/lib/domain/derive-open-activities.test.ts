import { describe, expect, it } from "vitest";

import { deriveOpenActivities } from "./derive-open-activities";
import { at, buildActivityEntry } from "./__tests__/fixtures";

describe("deriveOpenActivities", () => {
  it("returns remaining open starts across overlapping labels ordered newest-first", () => {
    const entries = [
      buildActivityEntry({ id: "a-start-1", label: "Read", action: "start", timestamp: at("2026-04-01T09:00:00.000Z") }),
      buildActivityEntry({ id: "b-start-1", label: "Walk", action: "start", timestamp: at("2026-04-01T09:15:00.000Z") }),
      buildActivityEntry({ id: "a-end-1", label: "Read", action: "end", timestamp: at("2026-04-01T09:30:00.000Z") }),
      buildActivityEntry({ id: "c-start-1", label: "Cook", action: "start", timestamp: at("2026-04-01T10:00:00.000Z") }),
    ];

    const open = deriveOpenActivities(entries);

    expect(open.map((entry) => entry.id)).toEqual(["c-start-1", "b-start-1"]);
  });

  it("keeps older starts open when the same label has multiple starts and one end", () => {
    const entries = [
      buildActivityEntry({ id: "start-1", label: "Write", action: "start", timestamp: at("2026-04-01T08:00:00.000Z") }),
      buildActivityEntry({ id: "start-2", label: "Write", action: "start", timestamp: at("2026-04-01T09:00:00.000Z") }),
      buildActivityEntry({ id: "end-1", label: "Write", action: "end", timestamp: at("2026-04-01T10:00:00.000Z") }),
    ];

    const open = deriveOpenActivities(entries);

    expect(open).toHaveLength(1);
    expect(open[0]?.id).toBe("start-1");
  });

  it("ignores unmatched end entries", () => {
    const entries = [
      buildActivityEntry({ id: "end-only", label: "Stretch", action: "end", timestamp: at("2026-04-01T11:00:00.000Z") }),
    ];

    expect(deriveOpenActivities(entries)).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(deriveOpenActivities([])).toEqual([]);
  });

  it("supports multiple open starts for the same label", () => {
    const entries = [
      buildActivityEntry({ id: "start-1", label: "Write", action: "start", timestamp: at("2026-04-01T08:00:00.000Z") }),
      buildActivityEntry({ id: "start-2", label: "Write", action: "start", timestamp: at("2026-04-01T09:00:00.000Z") }),
    ];

    const open = deriveOpenActivities(entries);

    expect(open.map((entry) => entry.id)).toEqual(["start-2", "start-1"]);
  });
});
