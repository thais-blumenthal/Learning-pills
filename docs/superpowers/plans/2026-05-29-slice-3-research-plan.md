# Slice 3 — Research → Draft Learning Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Generate learning plan →" button read a project's pasted URLs, ask Claude (with live web search) for an easiest-first list of ~5–7 concepts plus an emoji + blurb, store them, and show the plan.

**Architecture:** A synchronous Next.js server action orchestrates four small, isolated units — fetch URL text (`cheerio`), generate the plan via the Anthropic SDK with the `web_search` server tool, validate/normalize the result, and persist it. The pure units (HTML→text, plan validator) and the data layer are TDD-tested; the live fetch + Claude call are verified manually. A client "Researching…" overlay covers the wait.

**Tech Stack:** Next.js (App Router) + TypeScript, Drizzle + Neon, `@anthropic-ai/sdk` with the `web_search_20260209` server tool (model `claude-sonnet-4-6`), `cheerio` for HTML→text, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-29-slice-3-research-plan-design.md`

---

## File Structure

**Create:**
- `src/lib/extract-text.ts` — `extractReadableText(html)` (pure) + `MAX_SOURCE_CHARS`.
- `src/lib/extract-text.test.ts`
- `src/lib/fetch-source.ts` — `fetchSourceText(url)` (network wrapper).
- `src/lib/fetch-source.test.ts`
- `src/lib/plan.ts` — `Plan`/`PlanConcept` types, `MAX_CONCEPTS`, `parsePlan(raw)` (pure).
- `src/lib/plan.test.ts`
- `src/lib/generate-plan.ts` — `generatePlan({name, goal, sources})` (Anthropic + web search).
- `src/db/plan.ts` — `setProjectStatus`, `savePlan`, `getPlan`.
- `src/db/plan.test.ts`
- `src/app/projects/[id]/research-actions.ts` — `generatePlanAction` server action.
- `src/app/projects/[id]/GeneratePlanButton.tsx` — client button + Researching overlay.
- `scripts/show-project.ts` — DB inspection helper.

**Modify:**
- `src/db/schema.ts` — add `status`/`emoji`/`blurb` to `projects`; add `concepts` table.
- `src/app/projects/[id]/page.tsx` — render the plan when present; wire the generate button.
- `package.json` — add `cheerio`.

---

## Task 1: Schema — project status/emoji/blurb + concepts table

**Files:** Modify `src/db/schema.ts`, `package.json`.

- [ ] **Step 1: Install cheerio**

Run:
```bash
npm install cheerio
```
Expected: `cheerio` added to `dependencies`.

- [ ] **Step 2: Add columns to `projects` and the `concepts` table in `src/db/schema.ts`**

In the existing `projects` table object, add three fields after the `cadence` line (before `createdAt`):
```ts
  status: text("status").default("draft").notNull(), // draft | researching | review | learning
  emoji: text("emoji"),
  blurb: text("blurb"),
```

Then append a new table at the end of the file:
```ts
export const concepts = pgTable("concepts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  minutes: integer("minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
(The import line already includes `pgTable`, `serial`, `integer`, `text`, `timestamp`.)

- [ ] **Step 3: Push to Neon**

Run:
```bash
npm run db:push
```
Expected: drizzle-kit adds the three columns to `projects` (existing rows default `status='draft'`) and creates the `concepts` table. Accept any prompt to apply.

- [ ] **Step 4: Verify**

Run:
```bash
npx tsx --env-file=.env.local scripts/check-tables.ts
```
Expected: `Tables:` array now includes `concepts` (alongside `modules`, `chunks`, `projects`, `sources`).

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts package.json package-lock.json
git commit -m "Slice 3: schema — project status/emoji/blurb + concepts table"
```

---

## Task 2: HTML→text extractor (pure, TDD)

**Files:** Create `src/lib/extract-text.test.ts`, then `src/lib/extract-text.ts`.

- [ ] **Step 1: Write the failing test** — `src/lib/extract-text.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { extractReadableText, MAX_SOURCE_CHARS } from "./extract-text";

describe("extractReadableText", () => {
  it("strips script/style/nav and returns readable text", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body><nav>Home About</nav><script>alert(1)</script>
      <p>Hermes is an agent framework.</p></body></html>`;
    const out = extractReadableText(html);
    expect(out).toContain("Hermes is an agent framework.");
    expect(out).not.toContain("alert(1)");
    expect(out).not.toContain("color:red");
  });

  it("collapses whitespace and trims", () => {
    expect(extractReadableText("<body><p>a   b\n\n c</p></body>")).toBe("a b c");
  });

  it("truncates to MAX_SOURCE_CHARS", () => {
    const long = "<body><p>" + "x".repeat(MAX_SOURCE_CHARS + 500) + "</p></body>";
    expect(extractReadableText(long).length).toBe(MAX_SOURCE_CHARS);
  });

  it("returns empty string for empty/garbage input", () => {
    expect(extractReadableText("")).toBe("");
    expect(extractReadableText("   ")).toBe("");
  });
});
```

- [ ] **Step 2: Run it; verify it FAILS**

Run: `npm test -- src/lib/extract-text.test.ts`
Expected: FAIL — cannot resolve `./extract-text`.

- [ ] **Step 3: Implement** — `src/lib/extract-text.ts`:
```ts
import * as cheerio from "cheerio";

export const MAX_SOURCE_CHARS = 6000;

export function extractReadableText(html: string): string {
  if (!html || !html.trim()) return "";
  const $ = cheerio.load(html);
  $("script, style, nav, noscript, header, footer, svg").remove();
  const text = $("body").length ? $("body").text() : $.root().text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_CHARS);
}
```

- [ ] **Step 4: Run it; verify it PASSES**

Run: `npm test -- src/lib/extract-text.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/extract-text.ts src/lib/extract-text.test.ts
git commit -m "Slice 3: HTML->text extractor + tests"
```

---

## Task 3: fetchSourceText (network wrapper, TDD with mocked fetch)

**Files:** Create `src/lib/fetch-source.test.ts`, then `src/lib/fetch-source.ts`.

- [ ] **Step 1: Write the failing test** — `src/lib/fetch-source.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSourceText } from "./fetch-source";

afterEach(() => vi.restoreAllMocks());

describe("fetchSourceText", () => {
  it("returns extracted text on a successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<body><p>Hello world</p></body>", { status: 200 })),
    );
    expect(await fetchSourceText("https://x.com")).toBe("Hello world");
  });

  it("returns empty string on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await fetchSourceText("https://x.com")).toBe("");
  });

  it("returns empty string when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    expect(await fetchSourceText("https://x.com")).toBe("");
  });
});
```

- [ ] **Step 2: Run it; verify it FAILS**

Run: `npm test -- src/lib/fetch-source.test.ts`
Expected: FAIL — cannot resolve `./fetch-source`.

- [ ] **Step 3: Implement** — `src/lib/fetch-source.ts`:
```ts
import { extractReadableText } from "./extract-text";

const FETCH_TIMEOUT_MS = 10_000;

export async function fetchSourceText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "LearningPillsBot/1.0 (+local)" },
    });
    if (!res.ok) return "";
    return extractReadableText(await res.text());
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Run it; verify it PASSES**

Run: `npm test -- src/lib/fetch-source.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fetch-source.ts src/lib/fetch-source.test.ts
git commit -m "Slice 3: fetchSourceText wrapper + tests"
```

---

## Task 4: Plan validator (pure, TDD)

**Files:** Create `src/lib/plan.test.ts`, then `src/lib/plan.ts`.

- [ ] **Step 1: Write the failing test** — `src/lib/plan.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parsePlan, MAX_CONCEPTS } from "./plan";

const good = {
  emoji: "🤖",
  blurb: "Build a Hermes agent.",
  concepts: [
    { title: "What is Hermes", hook: "A framework for agents.", minutes: 2 },
    { title: "Core loop", hook: "How the agent thinks.", minutes: "3" },
  ],
};

describe("parsePlan", () => {
  it("accepts a valid plan and coerces minutes to a positive int", () => {
    const plan = parsePlan(good);
    expect(plan.emoji).toBe("🤖");
    expect(plan.concepts).toHaveLength(2);
    expect(plan.concepts[1].minutes).toBe(3);
  });

  it("trims the concept list to MAX_CONCEPTS", () => {
    const many = {
      ...good,
      concepts: Array.from({ length: MAX_CONCEPTS + 3 }, (_, i) => ({
        title: `C${i}`,
        hook: "h",
        minutes: 2,
      })),
    };
    expect(parsePlan(many).concepts).toHaveLength(MAX_CONCEPTS);
  });

  it("rejects missing/empty concepts", () => {
    expect(() => parsePlan({ emoji: "x", blurb: "y", concepts: [] })).toThrow(/concept/i);
    expect(() => parsePlan({ emoji: "x", blurb: "y" })).toThrow(/concept/i);
  });

  it("rejects a concept missing title or hook", () => {
    expect(() =>
      parsePlan({ emoji: "x", blurb: "y", concepts: [{ hook: "h", minutes: 2 }] }),
    ).toThrow(/title/i);
  });
});
```

- [ ] **Step 2: Run it; verify it FAILS**

Run: `npm test -- src/lib/plan.test.ts`
Expected: FAIL — cannot resolve `./plan`.

- [ ] **Step 3: Implement** — `src/lib/plan.ts`:
```ts
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
```

- [ ] **Step 4: Run it; verify it PASSES**

Run: `npm test -- src/lib/plan.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan.ts src/lib/plan.test.ts
git commit -m "Slice 3: plan validator + tests"
```

---

## Task 5: Plan data layer (TDD, integration)

**Files:** Create `src/db/plan.test.ts`, then `src/db/plan.ts`.

> Hits the dev Neon DB; cleans up created rows.

- [ ] **Step 1: Write the failing test** — `src/db/plan.test.ts`:
```ts
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
```

- [ ] **Step 2: Run it; verify it FAILS**

Run: `npm test -- src/db/plan.test.ts`
Expected: FAIL — cannot resolve `./plan`.

- [ ] **Step 3: Implement** — `src/db/plan.ts`:
```ts
import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, concepts } from "./schema";
import type { Plan } from "@/lib/plan";

export async function setProjectStatus(projectId: number, status: string): Promise<void> {
  await db.update(projects).set({ status }).where(eq(projects.id, projectId));
}

export async function savePlan(projectId: number, plan: Plan): Promise<void> {
  await db.delete(concepts).where(eq(concepts.projectId, projectId));
  if (plan.concepts.length > 0) {
    await db.insert(concepts).values(
      plan.concepts.map((c, i) => ({
        projectId,
        position: i,
        title: c.title,
        hook: c.hook,
        minutes: c.minutes,
      })),
    );
  }
  await db
    .update(projects)
    .set({ status: "review", emoji: plan.emoji, blurb: plan.blurb })
    .where(eq(projects.id, projectId));
}

export async function getPlan(projectId: number) {
  return db
    .select()
    .from(concepts)
    .where(eq(concepts.projectId, projectId))
    .orderBy(asc(concepts.position));
}
```

- [ ] **Step 4: Run it; verify it PASSES**

Run: `npm test -- src/db/plan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/db/plan.ts src/db/plan.test.ts
git commit -m "Slice 3: plan data layer (savePlan/getPlan/setProjectStatus) + tests"
```

---

## Task 6: generatePlan — Anthropic SDK + web search

**Files:** Create `src/lib/generate-plan.ts`. (No unit test — network + non-deterministic; verified manually in Task 8.)

- [ ] **Step 1: Implement** — `src/lib/generate-plan.ts`:
```ts
import Anthropic from "@anthropic-ai/sdk";
import { parsePlan, type Plan, MAX_CONCEPTS } from "./plan";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface GeneratePlanInput {
  name: string;
  goal: string | null;
  sources: { url: string; text: string }[];
}

export async function generatePlan(input: GeneratePlanInput): Promise<Plan> {
  const materials = input.sources
    .filter((s) => s.text)
    .map((s) => `SOURCE: ${s.url}\n${s.text}`)
    .join("\n\n---\n\n");

  const prompt = `You design ADHD-friendly micro-learning plans.

Topic: "${input.name}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}

Use the provided source material first. If it is thin or missing, use the web_search tool to research the topic, then build the plan. Break the topic into 5-${MAX_CONCEPTS} bite-sized concepts, ordered easiest-first.

${materials ? `SOURCE MATERIAL:\n${materials}` : "No source material was readable — research the topic with web_search before planning."}

When you are done, respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"emoji":"<one emoji>","blurb":"<one short tagline>","concepts":[{"title":"<3-6 words>","hook":"<one plain sentence>","minutes":<integer 1-5>}]}`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let finalText = "";

  // web_search is a server-side tool; the API may return stop_reason "pause_turn"
  // when its internal loop hits the iteration cap — re-send to continue.
  for (let i = 0; i < 6; i++) {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });

    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }

    finalText = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    break;
  }

  const cleaned = finalText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response did not contain a JSON object");
  }
  return parsePlan(JSON.parse(cleaned.slice(start, end + 1)));
}
```

> **If the build fails on the `web_search_20260209` tool type**, the installed `@anthropic-ai/sdk` predates that tool literal. Run `npm install @anthropic-ai/sdk@latest`, rebuild, and retry. Do not change the tool/architecture.

- [ ] **Step 2: Type-check via build**

Run: `npm run build`
Expected: exits 0 (the file compiles). Do NOT run `npm run dev`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/generate-plan.ts
git commit -m "Slice 3: generatePlan via Anthropic SDK + web search"
```

---

## Task 7: Server action + Generate button with Researching overlay

**Files:** Create `src/app/projects/[id]/research-actions.ts` and `src/app/projects/[id]/GeneratePlanButton.tsx`. Add overlay CSS to `src/app/globals.css`.

- [ ] **Step 1: Server action** — `src/app/projects/[id]/research-actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { getProject } from "@/db/projects";
import { setProjectStatus, savePlan } from "@/db/plan";
import { fetchSourceText } from "@/lib/fetch-source";
import { generatePlan } from "@/lib/generate-plan";

export async function generatePlanAction(projectId: number) {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  await setProjectStatus(projectId, "researching");
  try {
    const sources = await Promise.all(
      project.sources.map(async (s) => ({ url: s.url, text: await fetchSourceText(s.url) })),
    );
    const plan = await generatePlan({
      name: project.name,
      goal: project.goal,
      sources,
    });
    await savePlan(projectId, plan);
  } catch (err) {
    await setProjectStatus(projectId, "draft");
    throw err;
  }
  redirect(`/projects/${projectId}`);
}
```

- [ ] **Step 2: Client button + overlay** — `src/app/projects/[id]/GeneratePlanButton.tsx`:
```tsx
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { generatePlanAction } from "./research-actions";

const STEPS = [
  "Reading your materials…",
  "Researching the topic…",
  "Pulling out the core concepts…",
  "Sequencing them easiest-first…",
  "Drafting your plan…",
];

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function GeneratePlanButton({
  projectId,
  label = "Generate learning plan →",
}: {
  projectId: number;
  label?: string;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      await generatePlanAction(projectId);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setRunning(false);
      setError("Couldn't build a plan — please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-gradient"
        style={{ marginTop: 24 }}
        onClick={run}
        disabled={running}
      >
        {label}
      </button>
      {error && <p className="error">{error}</p>}
      {running &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="research-scrim" role="status" aria-live="polite">
            <div className="research-card">
              <div className="research-orb" aria-hidden="true" />
              <p className="research-title">Researching…</p>
              <ul className="research-steps">
                {STEPS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
```

- [ ] **Step 3: Add overlay styles** — append to `src/app/globals.css`:
```css
/* research overlay (Slice 3) */
.research-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(42, 27, 70, 0.5);
  backdrop-filter: blur(3px);
}
.research-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: 22px;
  padding: 32px;
  text-align: center;
  box-shadow: var(--glow);
}
.research-orb {
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  border-radius: 999px;
  background: var(--grad);
  animation: research-pulse 1.4s ease-in-out infinite;
}
@keyframes research-pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.7; }
  50% { transform: scale(1); opacity: 1; }
}
.research-title {
  font-family: var(--font-fredoka), sans-serif;
  font-weight: 700;
  font-size: 20px;
  margin: 0 0 14px;
}
.research-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
  display: inline-block;
  color: var(--text-dim);
}
.research-steps li { margin: 6px 0; }
@media (prefers-reduced-motion: reduce) {
  .research-orb { animation: none; }
}
```

- [ ] **Step 4: Type-check via build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/\[id\]/research-actions.ts src/app/projects/\[id\]/GeneratePlanButton.tsx src/app/globals.css
git commit -m "Slice 3: generate-plan server action + Researching overlay button"
```

---

## Task 8: Render the plan on the detail page

**Files:** Modify `src/app/projects/[id]/page.tsx`.

- [ ] **Step 1: Replace `src/app/projects/[id]/page.tsx` with the plan-aware version**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/db/projects";
import { getPlan } from "@/db/plan";
import { GeneratePlanButton } from "./GeneratePlanButton";
import { DeleteProjectButton } from "../DeleteProjectButton";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  morning: "Each morning",
  twice: "Twice a day",
  weekdays: "Weekdays only",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) notFound();
  const project = await getProject(numericId);
  if (!project) notFound();

  const hasPlan = project.status === "review" || project.status === "learning";
  const concepts = hasPlan ? await getPlan(numericId) : [];

  return (
    <div className="narrow">
      <Link href="/" className="back-link">‹ All projects</Link>
      <h1 className="gradient-title">
        {project.emoji ? `${project.emoji} ` : ""}
        {project.name}
      </h1>
      {project.blurb && <p className="subtitle">{project.blurb}</p>}
      {project.goal && <p className="subtitle">{project.goal}</p>}
      <p className="cadence">↗ {CADENCE_LABEL[project.cadence] ?? project.cadence}</p>

      <h3>Reference materials</h3>
      {project.sources.length > 0 ? (
        <ul className="materials-list">
          {project.sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.url}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No URLs added.</p>
      )}

      {hasPlan ? (
        <>
          <h3>Learning plan</h3>
          <ol className="concept-list">
            {concepts.map((c) => (
              <li key={c.id} className="concept-row">
                <span className="concept-num">{c.position + 1}</span>
                <div>
                  <p className="concept-title">{c.title}</p>
                  <p className="concept-hook">{c.hook}</p>
                </div>
                <span className="concept-minutes">{c.minutes}m</span>
              </li>
            ))}
          </ol>
          <GeneratePlanButton projectId={numericId} label="Regenerate plan ↻" />
        </>
      ) : project.status === "researching" ? (
        <p className="subtitle">Researching… refresh in a moment.</p>
      ) : (
        <GeneratePlanButton projectId={numericId} />
      )}

      <div className="detail-danger">
        <DeleteProjectButton projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
```

(Preserves the delete control added in the delete-project work — the `detail-danger` block and `DeleteProjectButton` must remain.)

- [ ] **Step 2: Add concept-list styles** — append to `src/app/globals.css`:
```css
/* learning plan concept list (Slice 3) */
.concept-list { list-style: none; margin: 0; padding: 0; }
.concept-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border-solid);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.concept-num {
  flex: none;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--grad);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}
.concept-title { font-family: var(--font-fredoka), sans-serif; font-weight: 600; margin: 0; }
.concept-hook { color: var(--text-dim); font-size: 13.5px; margin: 2px 0 0; }
.concept-minutes { margin-left: auto; color: var(--text-dim); font-size: 13px; flex: none; }
```

- [ ] **Step 3: Type-check via build**

Run: `npm run build`
Expected: exits 0; `/projects/[id]` compiles.

- [ ] **Step 4: Manual end-to-end verification** (see the spec's manual test plan)

Run `npm run dev`. Create/open a project with a couple of reachable URLs + a goal, click **Generate learning plan →**. Expect the Researching overlay, then a plan view with emoji + blurb + an easiest-first concept list. Test: a bogus URL is skipped; a no-URL niche topic still produces a plan (web search); forcing a failure returns the project to `draft` with the retry message; **Regenerate** replaces the concepts. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/\[id\]/page.tsx src/app/globals.css
git commit -m "Slice 3: render learning plan on project detail page"
```

---

## Task 9: DB inspection helper

**Files:** Create `scripts/show-project.ts`.

- [ ] **Step 1: Implement** — `scripts/show-project.ts`:
```ts
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
```

- [ ] **Step 2: Verify it runs**

Run (use a real project id from the manual test):
```bash
npx tsx --env-file=.env.local scripts/show-project.ts 1
```
Expected: prints the project row, its source URLs, and its concepts (or "No project with id 1").

- [ ] **Step 3: Commit**

```bash
git add scripts/show-project.ts
git commit -m "Slice 3: scripts/show-project.ts inspection helper"
```

---

## Done criteria

- Clicking "Generate learning plan →" fetches the URLs, calls Claude with web search, and stores an easiest-first concept list with emoji + blurb.
- The detail page shows the plan when `status` is `review`; "Regenerate" replaces it.
- Failures reset the project to `draft` with a retry message.
- `npm test` green (extract-text, fetch-source, plan validator, plan data layer); `npm run build` clean.
- No approve/toggle UI, no pills, no Slack — later slices.
```
