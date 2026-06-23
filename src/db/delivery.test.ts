import { afterEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { createProject } from "./projects";
import { savePlan } from "./plan";
import { runDelivery } from "./delivery";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(concepts).where(eq(concepts.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

// A fixed weekday so cadence weekend logic never interferes.
const now = new Date(2026, 5, 24, 9, 0, 0); // Wed 2026-06-24

async function seedLearningProject() {
  const project = await createProject({ name: "Deliver Test", urls: [], cadence: "morning" });
  createdIds.push(project.id);
  await savePlan(project.id, {
    emoji: "x",
    blurb: "b",
    concepts: [
      { title: "A", hook: "h", minutes: 1 },
      { title: "B", hook: "h", minutes: 1 },
    ],
  });
  await db.update(projects).set({ status: "learning" }).where(eq(projects.id, project.id));
  const rows = await db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, project.id));
  rows.sort((a, b) => a.position - b.position);
  return { projectId: project.id, first: rows[0], second: rows[1] };
}

test("sends the first pill and stamps deliveredAt", async () => {
  const { first } = await seedLearningProject();
  const send = vi.fn(async () => {});

  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send });

  expect(send).toHaveBeenCalledTimes(1);
  expect(summary.sent).toBe(1);
  const [row] = await db.select().from(concepts).where(eq(concepts.id, first.id));
  expect(row.deliveredAt).not.toBeNull();
});

test("is gated on the next run until the first pill is completed", async () => {
  await seedLearningProject();
  const send = vi.fn(async () => {});

  await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // sends first
  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // gated

  expect(send).toHaveBeenCalledTimes(1); // not called again
  expect(summary.gated).toBeGreaterThanOrEqual(1); // at least the seeded project is gated
});

test("sends the second pill once the first is completed", async () => {
  const { first, second } = await seedLearningProject();
  const send = vi.fn(async () => {});

  await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send }); // sends first
  await db.update(concepts).set({ completedAt: now }).where(eq(concepts.id, first.id));
  const summary = await runDelivery({ slot: "morning", now, timeZone: "America/New_York", send });

  expect(summary.sent).toBe(1);
  const [row] = await db.select().from(concepts).where(eq(concepts.id, second.id));
  expect(row.deliveredAt).not.toBeNull();
});

test("skips a project whose cadence excludes this slot", async () => {
  await seedLearningProject(); // cadence "morning"
  const send = vi.fn(async () => {});

  const summary = await runDelivery({ slot: "afternoon", now, timeZone: "America/New_York", send });

  expect(send).not.toHaveBeenCalled();
  expect(summary.considered).toBe(0);
});
