# Slice 5 — Pill Content + Focus Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each approved concept into a lazily-generated pill (typed text blocks + takeaway) and a full-screen Focus reader to read and complete it (Got it / Kinda).

**Architecture:** Four nullable columns on `concepts` store the pill (`blocks` JSON, `takeaway`, `completion`, `completedAt`). A pure `parsePill` validator mirrors `parsePlan`. `generatePill` does one Claude call (no web search). `getOrCreatePill(conceptId, generate?)` generates-on-first-open then caches — the `generate` arg is injected so the cache logic is testable without a live API. A Focus reader route renders the blocks with kind-tags and an inline check that gates the two completion buttons; a `loading.tsx` Suspense boundary covers first-open generation. The detail page's `learning` concept list becomes links into the reader with state badges.

**Tech Stack:** Next.js (App Router) + TypeScript, Drizzle + Neon (`neon-http`), Anthropic SDK (`claude-sonnet-4-6`), Vitest. Patterns: `parsePlan`/`generate-plan.ts` (validator + Claude call), server actions + `NEXT_REDIRECT` re-throw, portaled overlay.

**Spec:** `docs/superpowers/specs/2026-06-01-slice-5-pill-content-focus-reader-design.md`
**Design source:** `docs/design-handoff/` README §6 + `design_files/pill-layouts.jsx`.

---

## File Structure

**Modify:**
- `src/db/schema.ts` — add `blocks`/`takeaway`/`completion`/`completedAt` to `concepts`.
- `src/app/projects/[id]/page.tsx` — `learning` concept list → reader links + state badges.
- `src/app/globals.css` — focus-reader + kind-tag + check + concept-badge styles.

**Create:**
- `src/lib/pill-blocks.ts` + `src/lib/pill-blocks.test.ts` — block types + `parsePill`.
- `src/lib/generate-pill.ts` — the Claude call.
- `src/db/pills.ts` + `src/db/pills.test.ts` — `getOrCreatePill`/`completePill`/`getConceptForReader`.
- `src/app/projects/[id]/pills/[conceptId]/page.tsx` — reader page (server).
- `src/app/projects/[id]/pills/[conceptId]/loading.tsx` — "Building your pill…" Suspense UI.
- `src/app/projects/[id]/pills/[conceptId]/FocusReader.tsx` — reader client component.
- `src/app/projects/[id]/pills/[conceptId]/pill-actions.ts` — `completePillAction`.

**Preserve:** all of Slices 2–4.

---

## Task 1: Schema — pill columns on `concepts`

**Files:** Modify `src/db/schema.ts`.

- [ ] **Step 1: Add four nullable columns**

In `src/db/schema.ts`, the `concepts` table currently ends:
```ts
  included: boolean("included").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
Add four columns before `createdAt`:
```ts
  included: boolean("included").default(true).notNull(),
  blocks: text("blocks"),
  takeaway: text("takeaway"),
  completion: text("completion"), // null | 'mastered' | 'shaky'
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
(The import already includes `text`, `timestamp`, `boolean`, `integer`, `serial`, `pgTable` — no import change.)

- [ ] **Step 2: Push to Neon**

Run:
```bash
npm run db:push
```
Expected: drizzle-kit adds `blocks`, `takeaway`, `completion`, `completed_at` (all nullable) to `concepts`. Accept any prompt to apply. If it STOPS on an interactive prompt that would hang, capture the text and report BLOCKED.

- [ ] **Step 3: Verify the columns exist**

Run:
```bash
npx tsx --env-file=.env.local -e "import { neon } from '@neondatabase/serverless'; const sql = neon(process.env.DATABASE_URL); const r = await sql\`SELECT column_name FROM information_schema.columns WHERE table_name='concepts'\`; console.log(r.map(x => x.column_name));"
```
Expected: the array includes `blocks`, `takeaway`, `completion`, `completed_at`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "Slice 5: add pill columns (blocks/takeaway/completion/completedAt) to concepts"
```

---

## Task 2: `parsePill` validator (pure, TDD)

**Files:** Create `src/lib/pill-blocks.test.ts`, then `src/lib/pill-blocks.ts`.

- [ ] **Step 1: Write the failing tests** — `src/lib/pill-blocks.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parsePill } from "./pill-blocks";

const good = {
  blocks: [
    { kind: "read", text: "Agents loop.", points: ["think", "act", "observe"] },
    { kind: "callout", text: "Picture a thermostat." },
    {
      kind: "do",
      question: "What comes after Act?",
      options: ["Stop", "Observe", "Restart"],
      answer: 1,
    },
  ],
  takeaway: "Agents think, act, observe — then repeat.",
};

describe("parsePill", () => {
  it("accepts a valid pill", () => {
    const pill = parsePill(good);
    expect(pill.blocks).toHaveLength(3);
    expect(pill.takeaway).toBe("Agents think, act, observe — then repeat.");
    const doBlock = pill.blocks.find((b) => b.kind === "do");
    expect(doBlock).toBeTruthy();
  });

  it("rejects a read block with neither text nor points", () => {
    expect(() =>
      parsePill({ blocks: [{ kind: "read" }, good.blocks[2]], takeaway: "t" }),
    ).toThrow(/read/i);
  });

  it("throws when there is no do block", () => {
    expect(() =>
      parsePill({ blocks: [{ kind: "read", text: "x" }], takeaway: "t" }),
    ).toThrow(/do/i);
  });

  it("keeps only the first do block when several are present", () => {
    const pill = parsePill({
      blocks: [good.blocks[2], good.blocks[2]],
      takeaway: "t",
    });
    expect(pill.blocks.filter((b) => b.kind === "do")).toHaveLength(1);
  });

  it("coerces an out-of-range answer into 0-2", () => {
    const pill = parsePill({
      blocks: [{ kind: "do", question: "q", options: ["a", "b", "c"], answer: 9 }],
      takeaway: "t",
    });
    const doBlock = pill.blocks.find((b) => b.kind === "do")!;
    expect(doBlock.kind === "do" && doBlock.answer >= 0 && doBlock.answer <= 2).toBe(true);
  });

  it("rejects a do block without exactly 3 options", () => {
    expect(() =>
      parsePill({
        blocks: [{ kind: "do", question: "q", options: ["a", "b"], answer: 0 }],
        takeaway: "t",
      }),
    ).toThrow(/option/i);
  });

  it("defaults a missing takeaway", () => {
    const pill = parsePill({ blocks: [good.blocks[2]] });
    expect(typeof pill.takeaway).toBe("string");
    expect(pill.takeaway.length).toBeGreaterThan(0);
  });

  it("throws on non-object input", () => {
    expect(() => parsePill(null)).toThrow();
  });
});
```

- [ ] **Step 2: Run; verify FAIL**

Run: `npm test -- src/lib/pill-blocks.test.ts`
Expected: FAIL — cannot resolve `./pill-blocks`.

- [ ] **Step 3: Implement** — `src/lib/pill-blocks.ts`:
```ts
export interface ReadBlock {
  kind: "read";
  text?: string;
  points?: string[];
}
export interface CalloutBlock {
  kind: "callout";
  text: string;
}
export interface DoBlock {
  kind: "do";
  question: string;
  options: string[];
  answer: number;
}
export type Block = ReadBlock | CalloutBlock | DoBlock;

export interface Pill {
  blocks: Block[];
  takeaway: string;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseBlock(raw: unknown, i: number): Block | null {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = obj.kind;

  if (kind === "read") {
    const text = asString(obj.text);
    const points = Array.isArray(obj.points)
      ? obj.points.map(asString).filter(Boolean)
      : [];
    if (!text && points.length === 0) {
      throw new Error(`read block ${i} needs text or points`);
    }
    const block: ReadBlock = { kind: "read" };
    if (text) block.text = text;
    if (points.length > 0) block.points = points;
    return block;
  }

  if (kind === "callout") {
    const text = asString(obj.text);
    if (!text) throw new Error(`callout block ${i} needs text`);
    return { kind: "callout", text };
  }

  if (kind === "do") {
    const question = asString(obj.question);
    const options = Array.isArray(obj.options) ? obj.options.map(asString).filter(Boolean) : [];
    if (!question) throw new Error(`do block ${i} needs a question`);
    if (options.length !== 3) throw new Error(`do block ${i} needs exactly 3 options`);
    const answer = Math.max(0, Math.min(2, Math.round(Number(obj.answer) || 0)));
    return { kind: "do", question, options, answer };
  }

  // unknown kind → skip
  return null;
}

export function parsePill(raw: unknown): Pill {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Pill must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : [];

  const parsed: Block[] = [];
  let doBlock: DoBlock | null = null;
  rawBlocks.forEach((b, i) => {
    const block = parseBlock(b, i);
    if (!block) return;
    if (block.kind === "do") {
      if (doBlock) return; // keep only the first do block
      doBlock = block;
    }
    parsed.push(block);
  });

  if (!doBlock) {
    throw new Error("Pill must contain exactly one do block");
  }

  return {
    blocks: parsed,
    takeaway: asString(obj.takeaway) || "That's the core of it — you've got this.",
  };
}
```

- [ ] **Step 4: Run; verify PASS**

Run: `npm test -- src/lib/pill-blocks.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pill-blocks.ts src/lib/pill-blocks.test.ts
git commit -m "Slice 5: parsePill validator + tests"
```

---

## Task 3: `generatePill` — Claude call

**Files:** Create `src/lib/generate-pill.ts`. (No unit test — network/non-deterministic; verified manually.)

- [ ] **Step 1: Implement** — `src/lib/generate-pill.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import { parsePill, type Pill } from "./pill-blocks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface GeneratePillInput {
  projectName: string;
  goal: string | null;
  conceptTitle: string;
  conceptHook: string;
}

export async function generatePill(input: GeneratePillInput): Promise<Pill> {
  const prompt = `You write ADHD-friendly micro-lessons. Write ONE bite-sized lesson ("pill") for this concept.

Project: "${input.projectName}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}
Concept: "${input.conceptTitle}"
Hook: ${input.conceptHook}

The lesson body is an ordered sequence of 3-5 typed blocks. Allowed block kinds:
- "read": a short paragraph and/or a few key-point bullets. Shape: {"kind":"read","text":"<1-3 sentences>","points":["<short>","<short>","<short>"]} (text and/or points; keep it tiny).
- "callout": one vivid everyday analogy. Shape: {"kind":"callout","text":"<1-2 sentences>"}.
- "do": ONE multiple-choice comprehension check. Shape: {"kind":"do","question":"<question>","options":["<a>","<b>","<c>"],"answer":<0-2 index of the correct option>}.

Rules: start with a "read" block; optionally one "callout"; end with EXACTLY ONE "do" block (the only do block). Keep every string concise and concrete.${input.goal ? ` Frame the lesson to serve the learner's goal above.` : ""}

Respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"blocks":[ ... ],"takeaway":"<one punchy closing line>"}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain a JSON object");
  }
  return parsePill(JSON.parse(cleaned.slice(start, end + 1)));
}
```

- [ ] **Step 2: Type-check via build**

Run: `npm run build`
Expected: exits 0. Do NOT run `npm run dev`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/generate-pill.ts
git commit -m "Slice 5: generatePill via Anthropic SDK"
```

---

## Task 4: Pill data layer (TDD, integration with injected generate)

**Files:** Create `src/db/pills.test.ts`, then `src/db/pills.ts`.

- [ ] **Step 1: Write the failing tests** — `src/db/pills.test.ts`:
```ts
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
```

- [ ] **Step 2: Run; verify FAIL**

Run: `npm test -- src/db/pills.test.ts`
Expected: FAIL — cannot resolve `./pills`.

- [ ] **Step 3: Implement** — `src/db/pills.ts`:
```ts
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
```

- [ ] **Step 4: Run; verify PASS**

Run: `npm test -- src/db/pills.test.ts`
Expected: PASS (3 tests; no live API — `generate` is stubbed).

- [ ] **Step 5: Commit**

```bash
git add src/db/pills.ts src/db/pills.test.ts
git commit -m "Slice 5: pill data layer (getOrCreatePill/completePill/getConceptForReader) + tests"
```

---

## Task 5: Focus reader route (page + loading + completion action)

**Files:** Create `src/app/projects/[id]/pills/[conceptId]/page.tsx`, `loading.tsx`, `pill-actions.ts`.

- [ ] **Step 1: Create the completion action** — `src/app/projects/[id]/pills/[conceptId]/pill-actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { completePill } from "@/db/pills";

export async function completePillAction(
  conceptId: number,
  projectId: number,
  completion: "mastered" | "shaky",
) {
  await completePill(conceptId, completion);
  redirect(`/projects/${projectId}`);
}
```

- [ ] **Step 2: Create the loading UI** — `src/app/projects/[id]/pills/[conceptId]/loading.tsx`:
```tsx
export default function PillLoading() {
  return (
    <div className="research-scrim" role="status" aria-live="polite">
      <div className="research-card">
        <div className="research-orb" aria-hidden="true" />
        <p className="research-title">Building your pill…</p>
        <ul className="research-steps">
          <li>Writing the lesson…</li>
          <li>Adding a quick check…</li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the reader page** — `src/app/projects/[id]/pills/[conceptId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getOrCreatePill, getConceptForReader } from "@/db/pills";
import { FocusReader } from "./FocusReader";

export const dynamic = "force-dynamic";

export default async function PillPage({
  params,
}: {
  params: Promise<{ id: string; conceptId: string }>;
}) {
  const { id, conceptId } = await params;
  const projectId = Number(id);
  const cId = Number(conceptId);
  if (!Number.isInteger(projectId) || !Number.isInteger(cId)) notFound();

  // generate-on-first-open (cached after); loading.tsx covers the wait
  await getOrCreatePill(cId);

  const view = await getConceptForReader(cId);
  if (!view || view.projectId !== projectId || !view.included || !view.pill) notFound();

  return (
    <FocusReader
      projectId={projectId}
      conceptId={cId}
      title={view.title}
      minutes={view.minutes}
      index={view.index}
      total={view.total}
      pill={view.pill}
      completion={view.completion}
    />
  );
}
```

- [ ] **Step 4: Type-check via build** (will fail until Task 6 adds `FocusReader`; do this build in Task 6). For now just commit.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/\[id\]/pills
git commit -m "Slice 5: focus reader route (page + loading + completion action)"
```

---

## Task 6: `FocusReader` client component + styles

**Files:** Create `src/app/projects/[id]/pills/[conceptId]/FocusReader.tsx`; append to `src/app/globals.css`.

- [ ] **Step 1: Create the component** — `src/app/projects/[id]/pills/[conceptId]/FocusReader.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pill, Block } from "@/lib/pill-blocks";
import { completePillAction } from "./pill-actions";

const KTAG: Record<string, { label: string; ico: string; cls: string }> = {
  read: { label: "READ", ico: "📖", cls: "kt-read" },
  callout: { label: "PICTURE THIS", ico: "✦", cls: "kt-read" },
  do: { label: "DO", ico: "✓", cls: "kt-do" },
};

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function FocusReader({
  projectId,
  conceptId,
  title,
  minutes,
  index,
  total,
  pill,
  completion,
}: {
  projectId: number;
  conceptId: number;
  title: string;
  minutes: number;
  index: number;
  total: number;
  pill: Pill;
  completion: "mastered" | "shaky" | null;
}) {
  const router = useRouter();
  const doIndex = pill.blocks.findIndex((b) => b.kind === "do");
  const [picked, setPicked] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const doBlock = pill.blocks[doIndex];
  const answeredCorrectly =
    doBlock && doBlock.kind === "do" && picked === doBlock.answer;
  const alreadyDone = completion !== null;

  async function finish(result: "mastered" | "shaky") {
    setSubmitting(true);
    try {
      await completePillAction(conceptId, projectId, result);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setSubmitting(false);
    }
  }

  return (
    <div className="reader">
      <div className="reader-bar">
        <button className="reader-back" onClick={() => router.push(`/projects/${projectId}`)}>
          ‹ Plan
        </button>
        <div className="reader-prog">
          <span className="reader-fill" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="reader-time">◷ {minutes} min</span>
      </div>

      <div className="reader-body">
        <p className="reader-kicker">CONCEPT {index} OF {total}</p>
        <h1 className="gradient-title">{title}</h1>

        {pill.blocks.map((b, i) => (
          <BlockView
            key={i}
            block={b}
            picked={picked}
            setPicked={alreadyDone ? () => {} : setPicked}
          />
        ))}

        <p className="reader-takeaway">{pill.takeaway}</p>

        <div className="reader-footer">
          {alreadyDone ? (
            <button
              className="btn-gradient"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              Back to plan →
            </button>
          ) : (
            <>
              <button
                className="btn-ghost"
                disabled={!answeredCorrectly || submitting}
                onClick={() => finish("shaky")}
              >
                🤔 Kinda — bring it back
              </button>
              <button
                className="btn-gradient"
                disabled={!answeredCorrectly || submitting}
                onClick={() => finish("mastered")}
              >
                Got it ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockView({
  block,
  picked,
  setPicked,
}: {
  block: Block;
  picked: number | null;
  setPicked: (i: number) => void;
}) {
  const tag = KTAG[block.kind];
  return (
    <div className={block.kind === "callout" ? "lblock lblock-callout" : "lblock"}>
      <span className={`ktag ${tag.cls}`}>
        {tag.ico} {tag.label}
      </span>
      {block.kind === "read" && (
        <div>
          {block.text && <p className="lp">{block.text}</p>}
          {block.points && block.points.length > 0 && (
            <ul className="lp-points">
              {block.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {block.kind === "callout" && <p className="lp">{block.text}</p>}
      {block.kind === "do" && (
        <div className="qcheck">
          <p className="qc-q">{block.question}</p>
          <div className="qc-opts">
            {block.options.map((o, i) => {
              let cls = "qc-opt";
              if (picked !== null) {
                if (i === block.answer) cls += " ok";
                else if (i === picked) cls += " no";
              }
              return (
                <button key={i} className={cls} onClick={() => setPicked(i)}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append styles to `src/app/globals.css`**
```css
/* focus reader (Slice 5) */
.reader { max-width: 680px; margin: 0 auto; }
.reader-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.reader-back {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-dim);
  font: inherit;
  font-weight: 600;
  flex: none;
}
.reader-prog {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}
.reader-fill { display: block; height: 100%; background: var(--grad); }
.reader-time { flex: none; color: var(--text-dim); font-size: 13px; }
.reader-kicker {
  font-family: var(--font-fredoka), sans-serif;
  font-weight: 700;
  letter-spacing: 0.14em;
  font-size: 11.5px;
  color: var(--text-dim);
  margin: 0 0 6px;
}

.lblock { padding: 18px 0; border-bottom: 1px dashed var(--border-solid); }
.lblock-callout {
  background: var(--accent-soft);
  border-radius: 16px;
  border-bottom: none;
  padding: 16px 18px;
  margin: 6px 0;
}
.ktag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-fredoka), sans-serif;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 10px;
}
.kt-read { color: #8b3fd6; background: rgba(168, 85, 247, 0.14); }
.kt-do { color: #198a64; background: rgba(31, 158, 116, 0.16); }

.lp { font-size: 16px; line-height: 1.55; margin: 0 0 8px; }
.lp-points { margin: 8px 0 0; padding-left: 20px; }
.lp-points li { font-size: 15px; line-height: 1.5; margin: 4px 0; }

.qc-q { font-weight: 700; margin: 0 0 10px; }
.qc-opts { display: flex; flex-direction: column; gap: 8px; }
.qc-opt {
  text-align: left;
  border: 1px solid var(--border-solid);
  background: var(--surface);
  border-radius: 12px;
  padding: 11px 14px;
  font: inherit;
  cursor: pointer;
  color: var(--text);
}
.qc-opt.ok { border-color: #1f9e74; background: rgba(31, 158, 116, 0.12); }
.qc-opt.no { border-color: #d8553f; background: rgba(216, 85, 63, 0.12); }

.reader-takeaway {
  margin: 22px 0;
  padding-left: 16px;
  border-left: 3px solid var(--accent);
  font-family: var(--font-fredoka), sans-serif;
  font-size: 17px;
}
.reader-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
```

- [ ] **Step 3: Type-check via build**

Run: `npm run build`
Expected: exits 0; the `/projects/[id]/pills/[conceptId]` route compiles.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]/pills/\[conceptId\]/FocusReader.tsx src/app/globals.css
git commit -m "Slice 5: FocusReader component + reader/kind-tag/check styles"
```

---

## Task 7: Wire the `learning` concept list to the reader

**Files:** Modify `src/app/projects/[id]/page.tsx`; append a small style to `src/app/globals.css`.

- [ ] **Step 1: Make the kept-concept rows links with state badges**

In `src/app/projects/[id]/page.tsx`, the `learning` branch currently renders (lines ~61–83). Replace the `<ol className="concept-list">…</ol>` block AND the "Pills coming soon" line with a linked list. The new `learning` branch body:
```tsx
      ) : project.status === "learning" ? (
        <>
          <h3>Learning plan</h3>
          <ol className="concept-list">
            {keptConcepts.map((c, i) => (
              <li key={c.id} className="concept-row">
                <span className="concept-num">{i + 1}</span>
                <Link href={`/projects/${numericId}/pills/${c.id}`} className="concept-link">
                  <p className="concept-title">{c.title}</p>
                  <p className="concept-hook">{c.hook}</p>
                </Link>
                <span className="concept-state">
                  {c.completion === "mastered"
                    ? "✓ done"
                    : c.completion === "shaky"
                      ? "🤔 revisit"
                      : `${c.minutes}m`}
                </span>
              </li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 16 }}>
            <form action={reopenPlanAction.bind(null, numericId)}>
              <button type="submit" className="btn-ghost">Edit plan</button>
            </form>
            <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
          </div>
        </>
      ) : project.status === "researching" ? (
```
(`getPlan` already returns each concept's `completion` column since `getPlan` does `select().from(concepts)`. The `Link` import already exists at the top of the file. The "Pills coming soon" paragraph is removed.)

- [ ] **Step 2: Append the link/state styles to `src/app/globals.css`**
```css
/* learning concept rows as links (Slice 5) */
.concept-link { text-decoration: none; color: inherit; flex: 1; }
.concept-link:hover .concept-title { color: var(--accent); }
.concept-state { flex: none; color: var(--text-dim); font-size: 13px; margin-left: auto; }
```

- [ ] **Step 3: Type-check via build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Manual end-to-end verification**

Run `npm run dev`. On a `learning` project:
1. Click a concept → "Building your pill…" loader → Focus reader with read/callout blocks, a `do` check, takeaway.
2. Pick a wrong check option → completion buttons stay disabled; pick the correct one → buttons enable.
3. "Got it ✓" → back on the project, that concept shows **✓ done**. Open another → "🤔 Kinda" → shows **🤔 revisit**.
4. Re-open a completed/generated concept → loads instantly (no loader), shows "Back to plan →".
5. A goal-stressing project → pill content visibly tailored.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/\[id\]/page.tsx src/app/globals.css
git commit -m "Slice 5: link learning concepts into the focus reader with state badges"
```

---

## Done criteria

- Opening a kept concept generates its pill on first open (loader shown), caches it, and renders the Focus reader (read/callout/do blocks + takeaway).
- The inline `do` check gates the two completion buttons; "Got it" → `mastered`, "Kinda" → `shaky`, both recorded; re-open shows "Back to plan".
- The `learning` concept list links into the reader and shows per-concept state.
- Pill content is tailored to the project goal.
- `npm test` green; `npm run build` clean.
- No Hub UI, Slack, reinforcement/adaptation, spaced repetition, or media — later slices.
