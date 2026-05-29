import { afterEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources, concepts } from "./schema";
import { createProject, deleteProject, getProject, listProjects } from "./projects";

const createdIds: number[] = [];

afterEach(async () => {
  for (const id of createdIds) {
    await db.delete(sources).where(eq(sources.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }
  createdIds.length = 0;
});

test("createProject trims the name, normalizes URLs, and stores everything", async () => {
  const project = await createProject({
    name: "  Test Hermes  ",
    goal: "  learn it  ",
    urls: ["https://a.com", "https://a.com", " ", "not-a-url", "http://b.com"],
    cadence: "morning",
  });
  createdIds.push(project.id);

  expect(project.name).toBe("Test Hermes");

  const fetched = await getProject(project.id);
  expect(fetched).not.toBeNull();
  expect(fetched!.goal).toBe("learn it");
  expect(fetched!.cadence).toBe("morning");
  expect(fetched!.sources.map((s) => s.url)).toEqual(["https://a.com", "http://b.com"]);
});

test("listProjects returns a created project", async () => {
  const project = await createProject({
    name: "Listed Project",
    urls: [],
    cadence: "weekdays",
  });
  createdIds.push(project.id);

  const all = await listProjects();
  expect(all.some((p) => p.id === project.id)).toBe(true);
});

test("createProject rejects an empty name", async () => {
  await expect(
    createProject({ name: "   ", urls: [], cadence: "morning" }),
  ).rejects.toThrow(/name/i);
});

test("deleteProject removes the project and its sources", async () => {
  const project = await createProject({
    name: "To Delete",
    urls: ["https://x.com", "https://y.com"],
    cadence: "morning",
  });
  createdIds.push(project.id); // safety net; re-deleting in afterEach is a no-op

  await deleteProject(project.id);

  expect(await getProject(project.id)).toBeNull();
  const remainingSources = await db
    .select()
    .from(sources)
    .where(eq(sources.projectId, project.id));
  expect(remainingSources).toEqual([]);
});

test("deleteProject removes a project that has concepts (no FK violation)", async () => {
  const project = await createProject({
    name: "Has Concepts",
    urls: ["https://a.com"],
    cadence: "morning",
  });
  await db.insert(concepts).values({
    projectId: project.id,
    position: 0,
    title: "C1",
    hook: "h",
    minutes: 2,
  });

  await deleteProject(project.id); // must not throw
  expect(await getProject(project.id)).toBeNull();
});
