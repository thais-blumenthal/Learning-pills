import { describe, expect, it } from "vitest";
import { pickNextDelivery, type DeliveryConcept } from "./delivery";

// Helper: build a concept with sensible defaults.
const c = (over: Partial<DeliveryConcept> & { id: number; position: number }): DeliveryConcept => ({
  included: true,
  deliveredAt: null,
  completedAt: null,
  ...over,
});

describe("pickNextDelivery", () => {
  it("returns done for no concepts", () => {
    expect(pickNextDelivery([])).toEqual({ kind: "done" });
  });

  it("sends the first included, undelivered concept by position", () => {
    const concepts = [c({ id: 2, position: 2 }), c({ id: 1, position: 1 })];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 1 });
  });

  it("skips concepts that are not included", () => {
    const concepts = [c({ id: 1, position: 1, included: false }), c({ id: 2, position: 2 })];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("is gated when a delivered concept is not yet completed", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: null }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "gated" });
  });

  it("sends the next concept once the previous is completed", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2 }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "send", conceptId: 2 });
  });

  it("returns done when every included concept has been delivered", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2, deliveredAt: new Date(), completedAt: new Date() }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "done" });
  });

  it("ignores a not-included undelivered concept and returns done", () => {
    const concepts = [
      c({ id: 1, position: 1, deliveredAt: new Date(), completedAt: new Date() }),
      c({ id: 2, position: 2, included: false }),
    ];
    expect(pickNextDelivery(concepts)).toEqual({ kind: "done" });
  });
});
