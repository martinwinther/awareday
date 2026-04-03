import { describe, expect, it } from "vitest";

import { cleanLabelName, normalizeLabelName } from "./normalize-label";

describe("normalize-label", () => {
  it("trims and collapses whitespace for display labels", () => {
    expect(cleanLabelName("  Deep\t\n Work   Session ")).toBe("Deep Work Session");
  });

  it("normalizes labels to lowercase grouping keys", () => {
    expect(normalizeLabelName("  COFFEE   Break ")).toBe("coffee break");
  });

  it("returns an empty string when input is only whitespace", () => {
    expect(cleanLabelName("  \n  \t ")).toBe("");
    expect(normalizeLabelName("   ")).toBe("");
  });
});
