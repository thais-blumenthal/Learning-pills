import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import type { Plan } from "@/lib/plan";

export async function setProjectStatus(projectId: number, status: string): Promise<void> {
  await db.update(projects).set({ status }).where(eq(projects.id, projectId));
}

export async function savePlan(projectId: number, plan: Plan): Promise<void> {
  await db.delete(concepts).where(eq(concepts.projectId, projectId));
  if (plan.concepts.length > 0) {
    await db.insert(concepts).values(
      plan.concepts.map((c, i) => ({
        projectId,
        position: i,
        title: c.title,
        hook: c.hook,
        minutes: c.minutes,
      })),
    );
  }
  await db
    .update(projects)
    .set({ status: "review", emoji: plan.emoji, blurb: plan.blurb })
    .where(eq(projects.id, projectId));
}

export async function approvePlan(projectId: number, keptIds: number[]): Promise<void> {
  // included flags first, status flip last (safe ordering — no transaction).
  await db
    .update(concepts)
    .set({ included: false })
    .where(eq(concepts.projectId, projectId));
  if (keptIds.length > 0) {
    await db
      .update(concepts)
      .set({ included: true })
      .where(and(eq(concepts.projectId, projectId), inArray(concepts.id, keptIds)));
  }
  await db
    .update(projects)
    .set({ status: "learning" })
    .where(eq(projects.id, projectId));
}

export async function getPlan(projectId: number) {
  return db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, projectId))
    .orderBy(asc(concepts.position));
}
