import { afterEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { createProject } from "./projects";
import { savePlan } from "./plan";
import { getOrCreatePill, completePill, getConceptForReader } from "./pills";
import type { Pill } from "@/lib/pill-blocks";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(concepts).where(eq(concepts.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

const stubPill: Pill = {
  blocks: [
    { kind: "read", text: "x" },
    { kind: "do", question: "q", options: ["a", "b", "c"], answer: 1 },
  ],
  takeaway: "done",
};

async function seedConcept() {
  const project = await createProject({ name: "Pill Test", urls: [], cadence: "morning" });
  createdIds.push(project.id);
  await savePlan(project.id, {
    emoji: "x",
    blurb: "b",
    concepts: [{ title: "C1", hook: "h", minutes: 2 }],
  });
  const [c] = await db.select().from(concepts).where(eq(concepts.projectId, project.id));
  return { projectId: project.id, conceptId: c.id };
}

test("getOrCreatePill generates once then serves the cached pill", async () => {
  const { conceptId } = await seedConcept();
  const generate = vi.fn(async () => stubPill);

  const first = await getOrCreatePill(conceptId, generate);
  const second = await getOrCreatePill(conceptId, generate);

  expect(generate).toHaveBeenCalledTimes(1); // cached on the second call
  expect(first.takeaway).toBe("done");
  expect(second.blocks).toHaveLength(2);
});

test("completePill records completion + completedAt", async () => {
  const { conceptId } = await seedConcept();
  await completePill(conceptId, "shaky");

  const [c] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
  expect(c.completion).toBe("shaky");
  expect(c.completedAt).not.toBeNull();
});

test("getConceptForReader returns the n-of-m position among kept concepts", async () => {
  const project = await createProject({ name: "Pos Test", urls: [], cadence: "morning" });
  createdIds.push(project.id);
  await savePlan(project.id, {
    emoji: "x",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 1 },
      { title: "B", hook: "h", minutes: 1 },
    ],
  });
  const rows = await db.select().from(concepts).where(eq(concepts.projectId, project.id));
  const second = rows[1];

  const view = await getConceptForReader(second.id);
  expect(view!.projectId).toBe(project.id);
  expect(view!.index).toBe(2);
  expect(view!.total).toBe(2);
  expect(view!.title).toBe("B");
});
