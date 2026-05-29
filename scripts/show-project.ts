import { eq, asc } from "drizzle-orm";
import { db } from "../src/db/index";
import { projects, sources, concepts } from "../src/db/schema";

const id = Number(process.argv[2]);
if (!Number.isInteger(id)) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/show-project.ts <projectId>");
  process.exit(1);
}

const [project] = await db.select().from(projects).where(eq(projects.id, id));
if (!project) {
  console.log(`No project with id ${id}`);
  process.exit(0);
}
const srcs = await db.select().from(sources).where(eq(sources.projectId, id));
const plan = await db
  .select()
  .from(concepts)
  .where(eq(concepts.projectId, id))
  .orderBy(asc(concepts.position));

console.log("PROJECT:", {
  id: project.id,
  name: project.name,
  status: project.status,
  cadence: project.cadence,
  emoji: project.emoji,
  blurb: project.blurb,
  goal: project.goal,
});
console.log("SOURCES:", srcs.map((s) => s.url));
console.log("CONCEPTS:");
for (const c of plan) console.log(`  [${c.position}] ${c.title} (${c.minutes}m) — ${c.hook}`);
