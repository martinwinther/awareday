import { describe, expect, it } from "vitest";

import { getLocalDayBounds, isOnLocalDay } from "./local-day";

describe("getLocalDayBounds", () => {
  it("returns midnight boundaries for a given day", () => {
    const day = new Date("2026-04-01T14:30:00");
    const bounds = getLocalDayBounds(day);

    expect(bounds.startOfDay.getFullYear()).toBe(2026);
    expect(bounds.startOfDay.getMonth()).toBe(3); // April is 3 (zero-indexed)
    expect(bounds.startOfDay.getDate()).toBe(1);
    expect(bounds.startOfDay.getHours()).toBe(0);
    expect(bounds.startOfDay.getMinutes()).toBe(0);
    expect(bounds.startOfDay.getSeconds()).toBe(0);
    expect(bounds.startOfDay.getMilliseconds()).toBe(0);

    expect(bounds.startOfNextDay.getDate()).toBe(2);
    expect(bounds.startOfNextDay.getHours()).toBe(0);
    expect(bounds.startOfNextDay.getMinutes()).toBe(0);
  });

  it("does not mutate the input date", () => {
    const day = new Date("2026-04-01T14:30:00");
    const originalTime = day.getTime();

    getLocalDayBounds(day);

    expect(day.getTime()).toBe(originalTime);
  });

  it("handles month-end rollover", () => {
    const day = new Date("2026-04-30T10:00:00");
    const bounds = getLocalDayBounds(day);

    expect(bounds.startOfDay.getDate()).toBe(30);
    expect(bounds.startOfNextDay.getMonth()).toBe(4); // May
    expect(bounds.startOfNextDay.getDate()).toBe(1);
  });
});

describe("isOnLocalDay", () => {
  it("returns true for a date within the day", () => {
    const date = new Date("2026-04-01T12:00:00");
    const day = new Date("2026-04-01T00:00:00");

    expect(isOnLocalDay(date, day)).toBe(true);
  });

  it("returns true for midnight start of day (inclusive)", () => {
    const date = new Date("2026-04-01T00:00:00.000");
    const day = new Date("2026-04-01T15:00:00");

    expect(isOnLocalDay(date, day)).toBe(true);
  });

  it("returns false for midnight start of next day (exclusive)", () => {
    const date = new Date("2026-04-02T00:00:00.000");
    const day = new Date("2026-04-01T15:00:00");

    expect(isOnLocalDay(date, day)).toBe(false);
  });

  it("returns false for a date on a different day", () => {
    const date = new Date("2026-04-02T09:00:00");
    const day = new Date("2026-04-01T15:00:00");

    expect(isOnLocalDay(date, day)).toBe(false);
  });

  it("returns true for the last millisecond of the day", () => {
    const date = new Date("2026-04-01T23:59:59.999");
    const day = new Date("2026-04-01T12:00:00");

    expect(isOnLocalDay(date, day)).toBe(true);
  });
});
