import { afterEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources, concepts } from "./schema";
import { createProject, deleteProject, getProject, listProjects, addSource, removeSource } from "./projects";

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

test("addSource inserts a valid URL onto a project", async () => {
  const project = await createProject({ name: "Add Src", urls: [], cadence: "morning" });
  createdIds.push(project.id);

  await addSource(project.id, "https://added.com");

  const fetched = await getProject(project.id);
  expect(fetched!.sources.map((s) => s.url)).toContain("https://added.com");
});

test("addSource rejects an invalid URL", async () => {
  const project = await createProject({ name: "Bad Src", urls: [], cadence: "morning" });
  createdIds.push(project.id);

  await expect(addSource(project.id, "not-a-url")).rejects.toThrow();
});

test("addSource does not duplicate a URL already on the project", async () => {
  const project = await createProject({
    name: "Dup Src",
    urls: ["https://dup.com"],
    cadence: "morning",
  });
  createdIds.push(project.id);

  await addSource(project.id, "https://dup.com");

  const fetched = await getProject(project.id);
  const matches = fetched!.sources.filter((s) => s.url === "https://dup.com");
  expect(matches).toHaveLength(1);
});

test("removeSource deletes only the given source, scoped to its project", async () => {
  const a = await createProject({
    name: "Owner",
    urls: ["https://keep.com", "https://drop.com"],
    cadence: "morning",
  });
  createdIds.push(a.id);
  const other = await createProject({
    name: "Other",
    urls: ["https://other.com"],
    cadence: "morning",
  });
  createdIds.push(other.id);

  const aFull = await getProject(a.id);
  const dropId = aFull!.sources.find((s) => s.url === "https://drop.com")!.id;
  const otherSrcId = (await getProject(other.id))!.sources[0].id;

  // wrong project scope: removing other's source via project a's id must NOT delete it
  await removeSource(otherSrcId, a.id);
  expect((await getProject(other.id))!.sources).toHaveLength(1);

  // correct scope: removes drop.com, keeps keep.com
  await removeSource(dropId, a.id);
  const after = await getProject(a.id);
  expect(after!.sources.map((s) => s.url)).toEqual(["https://keep.com"]);
});
