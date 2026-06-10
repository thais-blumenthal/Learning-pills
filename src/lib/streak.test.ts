import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

// Local-time constructor: new Date(year, monthIndex, day) — June is month index 5.
const d = (day: number) => new Date(2026, 5, day, 9, 0, 0);
const today = d(10); // 2026-06-10

describe("computeStreak", () => {
  it("returns 0 when nothing is completed", () => {
    expect(computeStreak([], today)).toBe(0);
  });

  it("counts a single completion today as 1", () => {
    expect(computeStreak([d(10)], today)).toBe(1);
  });

  it("counts a single completion yesterday as 1 (today-or-yesterday tolerance)", () => {
    expect(computeStreak([d(9)], today)).toBe(1);
  });

  it("returns 0 when the most recent completion is two days ago", () => {
    expect(computeStreak([d(8)], today)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([d(8), d(9), d(10)], today)).toBe(3);
  });

  it("counts consecutive days ending yesterday", () => {
    expect(computeStreak([d(8), d(9)], today)).toBe(2);
  });

  it("stops at a gap", () => {
    // 10 and 8 present, 9 missing → only today counts.
    expect(computeStreak([d(8), d(10)], today)).toBe(1);
  });

  it("dedupes multiple completions on the same day", () => {
    const morning = new Date(2026, 5, 10, 8);
    const evening = new Date(2026, 5, 10, 20);
    expect(computeStreak([morning, evening], today)).toBe(1);
  });
});
