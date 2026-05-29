export const MAX_CONCEPTS = 7;

export interface PlanConcept {
  title: string;
  hook: string;
  minutes: number;
}

export interface Plan {
  emoji: string;
  blurb: string;
  concepts: PlanConcept[];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parsePlan(raw: unknown): Plan {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Plan must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const rawConcepts = obj.concepts;
  if (!Array.isArray(rawConcepts) || rawConcepts.length === 0) {
    throw new Error("Plan must include a non-empty concepts array");
  }

  const concepts: PlanConcept[] = rawConcepts.slice(0, MAX_CONCEPTS).map((c, i) => {
    const item = (typeof c === "object" && c !== null ? c : {}) as Record<string, unknown>;
    const title = asString(item.title);
    const hook = asString(item.hook);
    if (!title) throw new Error(`Concept ${i} is missing a title`);
    if (!hook) throw new Error(`Concept ${i} is missing a hook`);
    const minutes = Math.max(1, Math.round(Number(item.minutes) || 2));
    return { title, hook, minutes };
  });

  return {
    emoji: asString(obj.emoji) || "✨",
    blurb: asString(obj.blurb) || "Freshly generated for you.",
    concepts,
  };
}
