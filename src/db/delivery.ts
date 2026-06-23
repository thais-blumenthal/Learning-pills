import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { pickNextDelivery } from "@/lib/delivery";
import { isProjectEligible, type Slot } from "@/lib/cadence";

type Project = typeof projects.$inferSelect;
type Concept = typeof concepts.$inferSelect;

export interface DeliverDeps {
  slot: Slot;
  now: Date;
  timeZone: string;
  projectIds?: number[];
  send: (project: Project, concept: Concept) => Promise<void>;
}

export interface DeliverSummary {
  considered: number;
  sent: number;
  gated: number;
  done: number;
  errors: number;
}

export async function runDelivery(deps: DeliverDeps): Promise<DeliverSummary> {
  const summary: DeliverSummary = { considered: 0, sent: 0, gated: 0, done: 0, errors: 0 };

  const learning = await db
    .select()
    .from(projects)
    .where(
      deps.projectIds
        ? and(eq(projects.status, "learning"), inArray(projects.id, deps.projectIds))
        : eq(projects.status, "learning"),
    );

  for (const project of learning) {
    if (!isProjectEligible(project.cadence, deps.slot, deps.now, deps.timeZone)) continue;
    summary.considered++;

    const rows = await db
      .select()
      .from(concepts)
      .where(eq(concepts.projectId, project.id))
      .orderBy(asc(concepts.position));

    const decision = pickNextDelivery(rows);
    if (decision.kind === "gated") {
      summary.gated++;
      continue;
    }
    if (decision.kind === "done") {
      summary.done++;
      continue;
    }

    const concept = rows.find((c) => c.id === decision.conceptId)!;
    try {
      await deps.send(project, concept);
      await db.update(concepts).set({ deliveredAt: deps.now }).where(eq(concepts.id, concept.id));
      summary.sent++;
    } catch {
      summary.errors++;
    }
  }

  return summary;
}
