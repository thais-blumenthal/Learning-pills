import { afterEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { createProject } from "./projects";
import { savePlan, getPlan, setProjectStatus, approvePlan } from "./plan";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(concepts).where(eq(concepts.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

async function newProject() {
  const p = await createProject({ name: "Plan Test", urls: [], cadence: "morning" });
  createdIds.push(p.id);
  return p.id;
}

test("savePlan inserts concepts in order and flips status/emoji/blurb", async () => {
  const id = await newProject();
  await savePlan(id, {
    emoji: "🤖",
    blurb: "tagline",
    concepts: [
      { title: "First", hook: "h1", minutes: 2 },
      { title: "Second", hook: "h2", minutes: 3 },
    ],
  });

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  expect(project.status).toBe("review");
  expect(project.emoji).toBe("🤖");
  expect(project.blurb).toBe("tagline");

  const plan = await getPlan(id);
  expect(plan.map((c) => c.title)).toEqual(["First", "Second"]);
  expect(plan[0].position).toBe(0);
});

test("savePlan replaces existing concepts", async () => {
  const id = await newProject();
  await savePlan(id, { emoji: "a", blurb: "b", concepts: [{ title: "Old", hook: "h", minutes: 1 }] });
  await savePlan(id, { emoji: "a", blurb: "b", concepts: [{ title: "New", hook: "h", minutes: 1 }] });
  const plan = await getPlan(id);
  expect(plan.map((c) => c.title)).toEqual(["New"]);
});

test("setProjectStatus updates status", async () => {
  const id = await newProject();
  await setProjectStatus(id, "researching");
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  expect(project.status).toBe("researching");
});

test("approvePlan keeps only the given ids and flips status to learning", async () => {
  const id = await newProject();
  await savePlan(id, {
    emoji: "🤖",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 2 },
      { title: "B", hook: "h", minutes: 2 },
      { title: "C", hook: "h", minutes: 2 },
    ],
  });
  const before = await getPlan(id);
  const keptIds = [before[0].id, before[2].id]; // keep A and C, drop B

  await approvePlan(id, keptIds);

  const after = await getPlan(id);
  const includedById = new Map(after.map((c) => [c.id, c.included]));
  expect(includedById.get(before[0].id)).toBe(true);
  expect(includedById.get(before[1].id)).toBe(false);
  expect(includedById.get(before[2].id)).toBe(true);

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  expect(project.status).toBe("learning");
});

test("approvePlan reflects the latest kept set when re-approved", async () => {
  const id = await newProject();
  await savePlan(id, {
    emoji: "a",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 1 },
      { title: "B", hook: "h", minutes: 1 },
    ],
  });
  const rows = await getPlan(id);
  await approvePlan(id, [rows[0].id]); // keep only A
  await approvePlan(id, [rows[1].id]); // change mind: keep only B

  const after = await getPlan(id);
  const includedById = new Map(after.map((c) => [c.id, c.included]));
  expect(includedById.get(rows[0].id)).toBe(false);
  expect(includedById.get(rows[1].id)).toBe(true);
});
