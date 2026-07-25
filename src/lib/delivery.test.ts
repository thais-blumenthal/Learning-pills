import { describe, expect, it } from "vitest";
import { pickNextDelivery, type DeliveryConcept } from "./delivery";

// Helper: build a concept with sensible defaults.
const c = (over: Partial<DeliveryConcept> & { id: number; position: number }): DeliveryConcept => ({
  included: true,
  deliveredAt: null,
  completedAt: null,
  ...over,
});

const tz = "America/New_York";
// 2026-06-24 09:00 EDT
const now = new Date("2026-06-24T13:00:00Z");
// Same calendar day (08:00 EDT) and the prior day, both in `tz`.
const earlierToday = new Date("2026-06-24T12:00:00Z");
const yesterday = new Date("2026-06-23T12:00:00Z");

describe("pickNextDelivery", () => {
  it("returns done for no concepts", () => {
    expect(pickNextDelivery([], now, tz)).toEqual({ kind: "done" });
  });

  it("sends the first included, undelivered concept by position", () => {
    const concepts = [c({ id: 2, position: 2 }), c({ id: 1, position: 1 })];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "send", conceptId: 1 });
  });

  it("skips concepts that are not included", () => {
    const concepts = [c({ id: 1, position: 1, included: false }), c({ id: 2, position: 2 })];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("is gated when an open pill was already delivered today", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: earlierToday, completedAt: null }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "gated" });
  });

  it("re-sends (nudges) an open pill delivered on an earlier day", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: yesterday, completedAt: null }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "resend", conceptId: 1 });
  });

  it("sends the next concept once the previous is completed", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: yesterday, completedAt: earlierToday }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("returns done when every included concept has been delivered", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: yesterday, completedAt: earlierToday }),
      c({ id: 2, position: 2, deliveredAt: yesterday, completedAt: earlierToday }),
    ];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "done" });
  });

  it("ignores a not-included undelivered concept and returns done", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: yesterday, completedAt: earlierToday }),
      c({ id: 2, position: 2, included: false }),
    ];
    expect(pickNextDelivery(concepts, now, tz)).toEqual({ kind: "done" });
  });
});
