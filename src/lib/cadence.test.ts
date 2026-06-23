import { describe, expect, it } from "vitest";
import { eligibleSlots, isWeekendInTz, isProjectEligible } from "./cadence";

// Local-time constructor: new Date(year, monthIndex, day) — June is month index 5.
const weekday = new Date(2026, 5, 24, 9, 0, 0); // Wed 2026-06-24
const saturday = new Date(2026, 5, 27, 9, 0, 0); // Sat 2026-06-27
const TZ = "America/New_York";

describe("eligibleSlots", () => {
  it("morning cadence maps to the morning slot only", () => {
    expect(eligibleSlots("morning")).toEqual(["morning"]);
  });
  it("twice cadence maps to both slots", () => {
    expect(eligibleSlots("twice")).toEqual(["morning", "afternoon"]);
  });
  it("weekdays cadence maps to the morning slot only", () => {
    expect(eligibleSlots("weekdays")).toEqual(["morning"]);
  });
});

describe("isWeekendInTz", () => {
  it("is false on a weekday", () => {
    expect(isWeekendInTz(weekday, TZ)).toBe(false);
  });
  it("is true on a Saturday", () => {
    expect(isWeekendInTz(saturday, TZ)).toBe(true);
  });
});

describe("isProjectEligible", () => {
  it("morning cadence is eligible in the morning slot on a weekday", () => {
    expect(isProjectEligible("morning", "morning", weekday, TZ)).toBe(true);
  });
  it("morning cadence is not eligible in the afternoon slot", () => {
    expect(isProjectEligible("morning", "afternoon", weekday, TZ)).toBe(false);
  });
  it("twice cadence is eligible in the afternoon slot", () => {
    expect(isProjectEligible("twice", "afternoon", weekday, TZ)).toBe(true);
  });
  it("weekdays cadence is not eligible on a Saturday", () => {
    expect(isProjectEligible("weekdays", "morning", saturday, TZ)).toBe(false);
  });
  it("morning cadence still fires on a Saturday (no weekday restriction)", () => {
    expect(isProjectEligible("morning", "morning", saturday, TZ)).toBe(true);
  });
});
