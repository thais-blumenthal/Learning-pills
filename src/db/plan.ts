import { asc, eq } from "drizzle-orm";
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

export async function getPlan(projectId: number) {
  return db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, projectId))
    .orderBy(asc(concepts.position));
}
