import { dayKeyInTz } from "./cadence";

export interface DeliveryConcept {
  id: number;
  position: number;
  included: boolean;
  deliveredAt: Date | null;
  completedAt: Date | null;
}

export type DeliveryDecision =
  | { kind: "send"; conceptId: number }
  | { kind: "resend"; conceptId: number }
  | { kind: "gated" }
  | { kind: "done" };

export function pickNextDelivery(
  concepts: DeliveryConcept[],
  now: Date,
  timeZone: string,
): DeliveryDecision {
  const included = concepts
    .filter((c) => c.included)
    .sort((a, b) => a.position - b.position);

  // An already-delivered pill that hasn't been completed is still "open".
  const open = included.find((c) => c.deliveredAt !== null && c.completedAt === null);
  if (open) {
    // Nudge: re-send the open pill, but at most once per day. Only re-send if
    // its last delivery was on an earlier calendar day (in the app timezone).
    // A pill already delivered/nudged today stays gated so it can't spam.
    const lastDay = dayKeyInTz(open.deliveredAt!, timeZone);
    const today = dayKeyInTz(now, timeZone);
    if (lastDay < today) return { kind: "resend", conceptId: open.id };
    return { kind: "gated" };
  }

  const next = included.find((c) => c.deliveredAt === null);
  if (next) return { kind: "send", conceptId: next.id };

  return { kind: "done" };
}
