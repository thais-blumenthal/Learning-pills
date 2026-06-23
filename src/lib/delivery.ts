export interface DeliveryConcept {
  id: number;
  position: number;
  included: boolean;
  deliveredAt: Date | null;
  completedAt: Date | null;
}

export type DeliveryDecision =
  | { kind: "send"; conceptId: number }
  | { kind: "gated" }
  | { kind: "done" };

export function pickNextDelivery(concepts: DeliveryConcept[]): DeliveryDecision {
  const included = concepts
    .filter((c) => c.included)
    .sort((a, b) => a.position - b.position);

  // Gated: an already-delivered pill is still open (not completed).
  const hasOpenDelivered = included.some(
    (c) => c.deliveredAt !== null && c.completedAt === null,
  );
  if (hasOpenDelivered) return { kind: "gated" };

  const next = included.find((c) => c.deliveredAt === null);
  if (next) return { kind: "send", conceptId: next.id };

  return { kind: "done" };
}
