import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import { parsePill, type Pill } from "@/lib/pill-blocks";
import { generatePill as defaultGenerate } from "@/lib/generate-pill";

type GenerateFn = (input: {
  projectName: string;
  goal: string | null;
  conceptTitle: string;
  conceptHook: string;
}) => Promise<Pill>;

export async function getOrCreatePill(
  conceptId: number,
  generate: GenerateFn = defaultGenerate,
): Promise<Pill> {
  const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
  if (!concept) throw new Error("Concept not found");

  if (concept.blocks) {
    return parsePill({ blocks: JSON.parse(concept.blocks), takeaway: concept.takeaway ?? "" });
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, concept.projectId));
  const pill = await generate({
    projectName: project.name,
    goal: project.goal,
    conceptTitle: concept.title,
    conceptHook: concept.hook,
  });

  await db
    .update(concepts)
    .set({ blocks: JSON.stringify(pill.blocks), takeaway: pill.takeaway })
    .where(eq(concepts.id, conceptId));

  return pill;
}

export async function completePill(
  conceptId: number,
  completion: "mastered" | "shaky",
): Promise<void> {
  await db
    .update(concepts)
    .set({ completion, completedAt: new Date() })
    .where(eq(concepts.id, conceptId));
}

export async function getConceptForReader(conceptId: number) {
  const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
  if (!concept) return null;

  const kept = await db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, concept.projectId))
    .orderBy(asc(concepts.position));
  const keptIncluded = kept.filter((c) => c.included);
  const index = keptIncluded.findIndex((c) => c.id === conceptId);

  return {
    projectId: concept.projectId,
    conceptId: concept.id,
    title: concept.title,
    minutes: concept.minutes,
    included: concept.included,
    completion: concept.completion as "mastered" | "shaky" | null,
    index: index + 1, // 1-based
    total: keptIncluded.length,
    pill:
      concept.blocks
        ? parsePill({ blocks: JSON.parse(concept.blocks), takeaway: concept.takeaway ?? "" })
        : null,
  };
}
