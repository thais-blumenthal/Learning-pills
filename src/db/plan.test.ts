import { afterEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { createProject } from "./projects";
import { savePlan, getPlan, setProjectStatus } from "./plan";

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
