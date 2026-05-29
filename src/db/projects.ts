import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources } from "./schema";
import { normalizeUrls } from "@/lib/urls";

export type Cadence = "morning" | "twice" | "weekdays";

export interface CreateProjectInput {
  name: string;
  goal?: string;
  urls: string[];
  cadence: Cadence;
}

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Project name is required");

  const goal = input.goal?.trim() || null;
  const urls = normalizeUrls(input.urls);

  const [project] = await db
    .insert(projects)
    .values({ name, goal, cadence: input.cadence })
    .returning();

  if (urls.length > 0) {
    await db.insert(sources).values(urls.map((url) => ({ projectId: project.id, url })));
  }

  return project;
}

export async function listProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(id: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return null;
  const projectSources = await db
    .select()
    .from(sources)
    .where(eq(sources.projectId, id))
    .orderBy(sources.id);
  return { ...project, sources: projectSources };
}
