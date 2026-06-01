# Slice 4b — Editable Materials + Goal-Aware Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user add/remove reference URLs on an existing project (adding auto-triggers re-research), and make the generation prompt tailor concepts to the user's goal.

**Architecture:** Extract the existing research pipeline from `generatePlanAction` into a reusable `researchProject(projectId)`. Add `addSource`/`removeSource` to the data layer. Two new server actions (`addSourceAction` auto-re-researches; `removeSourceAction` just removes). A client `ReferenceMaterials` component replaces the read-only URL list, reusing the existing "Researching…" overlay. Separately, strengthen the goal wording in the generation prompt.

**Tech Stack:** Next.js (App Router) + TypeScript, Drizzle + Neon (`neon-http`), Anthropic SDK, Vitest. Established patterns: `"use server"` actions + `NEXT_REDIRECT` re-throw in client components; portaled overlay (`GeneratePlanButton.tsx`).

**Spec:** `docs/superpowers/specs/2026-06-01-slice-4b-editable-materials-goal-aware-design.md`

---

## File Structure

**Modify:**
- `src/lib/generate-plan.ts` — strengthen the goal directive in the prompt.
- `src/db/projects.ts` — add `addSource`, `removeSource`.
- `src/db/projects.test.ts` — add tests for both.
- `src/app/projects/[id]/research-actions.ts` — `generatePlanAction` delegates to `researchProject`.
- `src/app/projects/[id]/page.tsx` — swap the read-only materials `<ul>` for `<ReferenceMaterials>`.

**Create:**
- `src/lib/research-project.ts` — `researchProject(projectId)` (extracted pipeline).
- `src/app/projects/[id]/source-actions.ts` — `addSourceAction`, `removeSourceAction`.
- `src/app/projects/[id]/ReferenceMaterials.tsx` — editable materials client component.

**Preserve:** `savePlan`/`getPlan`/`setProjectStatus`/`approvePlan`, `PlanReview.tsx`, `GeneratePlanButton.tsx`, `DeleteProjectButton.tsx`, `review-actions.ts`.

---

## Task 1: Goal-aware generation prompt

**Files:** Modify `src/lib/generate-plan.ts`.

- [ ] **Step 1: Strengthen the goal directive**

In `src/lib/generate-plan.ts`, the prompt currently reads (lines 18–28):
```ts
  const prompt = `You design ADHD-friendly micro-learning plans.

Topic: "${input.name}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}

Use the provided source material first. If it is thin or missing, use the web_search tool to research the topic, then build the plan. Break the topic into 5-${MAX_CONCEPTS} bite-sized concepts, ordered easiest-first.

${materials ? `SOURCE MATERIAL:\n${materials}` : "No source material was readable — research the topic with web_search before planning."}

When you are done, respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"emoji":"<one emoji>","blurb":"<one short tagline>","concepts":[{"title":"<3-6 words>","hook":"<one plain sentence>","minutes":<integer 1-5>}]}`;
```

Replace it with (only the goal line and the instruction sentence change — the topic line, materials block, and JSON shape are identical):
```ts
  const prompt = `You design ADHD-friendly micro-learning plans.

Topic: "${input.name}"
${input.goal ? `Learner's goal: ${input.goal}` : ""}

Use the provided source material first. If it is thin or missing, use the web_search tool to research the topic, then build the plan. Break the topic into 5-${MAX_CONCEPTS} bite-sized concepts, ordered easiest-first.${input.goal ? ` Prioritize and frame the concepts to serve the learner's goal above — choose what to include, and word each title and hook, so the plan moves them toward that goal rather than covering the topic generically.` : ""}

${materials ? `SOURCE MATERIAL:\n${materials}` : "No source material was readable — research the topic with web_search before planning."}

When you are done, respond with ONLY minified JSON (no prose, no markdown fences), shaped EXACTLY:
{"emoji":"<one emoji>","blurb":"<one short tagline>","concepts":[{"title":"<3-6 words>","hook":"<one plain sentence>","minutes":<integer 1-5>}]}`;
```

- [ ] **Step 2: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0. (No behavior testable offline — generation is non-deterministic; this is verified manually with the rest of the slice.) Do NOT run `npm run dev`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/generate-plan.ts
git commit -m "Slice 4b: make generation prompt tailor concepts to the goal"
```

---

## Task 2: `addSource` / `removeSource` data layer (TDD, integration)

**Files:** Modify `src/db/projects.test.ts` (add tests), then `src/db/projects.ts` (add functions).

- [ ] **Step 1: Write the failing tests**

In `src/db/projects.test.ts`, the data-layer import currently includes `createProject, deleteProject, getProject`. Add `addSource, removeSource`:
```ts
import { createProject, deleteProject, getProject, addSource, removeSource } from "./projects";
```
The file already imports `db`, `projects`, `sources` (and `concepts`), `eq`, and has `createdIds` + `afterEach` cleanup. Append these tests:
```ts
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
```

- [ ] **Step 2: Run the tests; verify they FAIL**

Run:
```bash
npm test -- src/db/projects.test.ts
```
Expected: FAIL — `addSource` / `removeSource` are not exported.

- [ ] **Step 3: Implement the functions**

In `src/db/projects.ts`, add `and` to the drizzle import and `isValidHttpUrl` to the urls import. Current imports:
```ts
import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources, concepts } from "./schema";
import { normalizeUrls } from "@/lib/urls";
```
Change to:
```ts
import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, sources, concepts } from "./schema";
import { normalizeUrls, isValidHttpUrl } from "@/lib/urls";
```
Then add these two functions (after `getProject`):
```ts
export async function addSource(projectId: number, url: string) {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) {
    throw new Error("Invalid URL");
  }
  const existing = await db
    .select()
    .from(sources)
    .where(and(eq(sources.projectId, projectId), eq(sources.url, trimmed)));
  if (existing.length > 0) return existing[0];

  const [row] = await db
    .insert(sources)
    .values({ projectId, url: trimmed })
    .returning();
  return row;
}

export async function removeSource(sourceId: number, projectId: number): Promise<void> {
  await db
    .delete(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.projectId, projectId)));
}
```

- [ ] **Step 4: Run the tests; verify they PASS**

Run:
```bash
npm test -- src/db/projects.test.ts
```
Expected: PASS (all tests in the file, including the four new ones).

- [ ] **Step 5: Commit**

```bash
git add src/db/projects.ts src/db/projects.test.ts
git commit -m "Slice 4b: addSource/removeSource data layer + tests"
```

---

## Task 3: Extract `researchProject` pipeline

**Files:** Create `src/lib/research-project.ts`; modify `src/app/projects/[id]/research-actions.ts`.

- [ ] **Step 1: Create `src/lib/research-project.ts`**

This is the exact body of the current `generatePlanAction` (minus the `redirect`), moved into a reusable function:
```ts
import { getProject } from "@/db/projects";
import { setProjectStatus, savePlan } from "@/db/plan";
import { fetchSourceText } from "@/lib/fetch-source";
import { generatePlan } from "@/lib/generate-plan";

export async function researchProject(projectId: number): Promise<void> {
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
}
```

- [ ] **Step 2: Slim `research-actions.ts` to delegate**

Replace the entire contents of `src/app/projects/[id]/research-actions.ts` with:
```ts
"use server";

import { redirect } from "next/navigation";
import { researchProject } from "@/lib/research-project";

export async function generatePlanAction(projectId: number) {
  await researchProject(projectId);
  redirect(`/projects/${projectId}`);
}
```
(Same behavior as before: set researching → fetch → generate → save → redirect; reset to draft on error. The pipeline just lives in `research-project.ts` now so the add-source action can reuse it.)

- [ ] **Step 3: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Run the full test suite (no regressions)**

Run:
```bash
npm test
```
Expected: all green (the existing plan/project tests still pass; nothing imports the old inline body).

- [ ] **Step 5: Commit**

```bash
git add src/lib/research-project.ts src/app/projects/\[id\]/research-actions.ts
git commit -m "Slice 4b: extract reusable researchProject pipeline"
```

---

## Task 4: Source server actions

**Files:** Create `src/app/projects/[id]/source-actions.ts`.

- [ ] **Step 1: Create the actions file**

`src/app/projects/[id]/source-actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { addSource, removeSource } from "@/db/projects";
import { researchProject } from "@/lib/research-project";

export async function addSourceAction(projectId: number, url: string) {
  await addSource(projectId, url);
  await researchProject(projectId); // auto re-research with the new material
  redirect(`/projects/${projectId}`);
}

export async function removeSourceAction(sourceId: number, projectId: number) {
  await removeSource(sourceId, projectId);
  redirect(`/projects/${projectId}`); // no auto-regenerate on remove
}
```

- [ ] **Step 2: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/projects/\[id\]/source-actions.ts
git commit -m "Slice 4b: add/remove source server actions"
```

---

## Task 5: `ReferenceMaterials` client component + styles

**Files:** Create `src/app/projects/[id]/ReferenceMaterials.tsx`; append to `src/app/globals.css`.

- [ ] **Step 1: Create the component**

`src/app/projects/[id]/ReferenceMaterials.tsx`:
```tsx
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { isValidHttpUrl } from "@/lib/urls";
import { addSourceAction, removeSourceAction } from "./source-actions";

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

export interface MaterialSource {
  id: number;
  url: string;
}

export function ReferenceMaterials({
  projectId,
  sources,
}: {
  projectId: number;
  sources: MaterialSource[];
}) {
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState("");
  const [researching, setResearching] = useState(false);

  async function add() {
    const value = urlInput.trim();
    if (!value) return;
    if (!isValidHttpUrl(value)) {
      setError("That doesn't look like a valid URL (must start with http:// or https://).");
      return;
    }
    setError("");
    setResearching(true);
    try {
      await addSourceAction(projectId, value);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setResearching(false);
      setError("Couldn't add that material — please try again.");
    }
  }

  async function remove(sourceId: number) {
    try {
      await removeSourceAction(sourceId, projectId);
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError("Couldn't remove that material — please try again.");
    }
  }

  return (
    <>
      <h3>Reference materials</h3>
      {sources.length > 0 ? (
        <ul className="materials-list">
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.url}
              </a>
              <button
                type="button"
                className="material-remove"
                aria-label={`Remove ${source.url}`}
                onClick={() => remove(source.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">No URLs added.</p>
      )}

      <div className="row">
        <input
          className="input"
          placeholder="https://…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-gradient" onClick={add} disabled={researching}>
          Add &amp; re-research
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {researching &&
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

- [ ] **Step 2: Append the remove-button style to `src/app/globals.css`**

```css
/* removable reference material (Slice 4b) */
.materials-list li { display: flex; align-items: center; gap: 8px; }
.material-remove {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1;
  padding: 2px 4px;
}
.material-remove:hover { color: #d8553f; }
```
(The `.research-scrim/.research-card/.research-orb/.research-title/.research-steps` classes already exist from Slice 3; `.row`, `.input`, `.btn-gradient`, `.materials-list`, `.subtitle`, `.error` all exist.)

- [ ] **Step 3: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/projects/\[id\]/ReferenceMaterials.tsx src/app/globals.css
git commit -m "Slice 4b: editable ReferenceMaterials component + styles"
```

---

## Task 6: Wire `ReferenceMaterials` into the detail page

**Files:** Modify `src/app/projects/[id]/page.tsx`.

- [ ] **Step 1: Import the component**

In `src/app/projects/[id]/page.tsx`, add to the imports (after the `PlanReview` import):
```tsx
import { ReferenceMaterials } from "./ReferenceMaterials";
```

- [ ] **Step 2: Replace the read-only materials block**

The page currently renders this block:
```tsx
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
```
Replace that entire block with:
```tsx
      <ReferenceMaterials
        projectId={numericId}
        sources={project.sources.map((s) => ({ id: s.id, url: s.url }))}
      />
```
(The component renders its own `<h3>Reference materials</h3>` heading, list, empty state, and add row. Everything else on the page — heading, blurb, goal-note, cadence, the status branches, delete button — stays unchanged.)

- [ ] **Step 3: Type-check via build**

Run:
```bash
npm run build
```
Expected: exits 0; `/projects/[id]` compiles.

- [ ] **Step 4: Manual end-to-end verification**

Run `npm run dev`.
1. Open a `learning` project → in Reference materials, type a URL → "Add & re-research" → "Researching…" overlay → lands back on `review` with a regenerated plan reflecting the new material.
2. Remove a URL via its ✕ → it disappears; the current plan is unchanged (no regen).
3. Add an invalid URL (e.g. `foo`) → inline validation error, no call.
4. (Part A) A project whose goal stresses a particular angle → regenerate → concepts visibly tailored to it.
5. Existing flows intact: Generate (draft→review), Approve (review→learning), Edit, Start over, Regenerate, Delete.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/app/projects/\[id\]/page.tsx
git commit -m "Slice 4b: use editable ReferenceMaterials on the detail page"
```

---

## Done criteria

- Reference materials on the detail page are editable in any status: add a URL (→ auto re-research → `review`) or remove one (→ no regen).
- Invalid URLs are rejected inline; duplicates are not re-added.
- The research pipeline lives in one reusable `researchProject` (used by both generate and add-source).
- The generation prompt tailors concept selection/framing to the user's goal when present.
- `npm test` green; `npm run build` clean.
- No file uploads, no append-style adaptation, no pills/Hub/Slack.
